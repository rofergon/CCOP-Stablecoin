const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Cargar PRIVATE_KEY desde .env file
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const privateKeyLine = envContent.split('\n').find(line => line.startsWith('PRIVATE_KEY='));
    if (privateKeyLine) {
      const privateKey = privateKeyLine.replace('PRIVATE_KEY=', '').trim();
      return privateKey;
    }
    return null;
  } catch (error) {
    console.error('Error al cargar el archivo .env:', error.message);
    return null;
  }
}

// --- CONFIGURACIÓN ---
// Direcciones del contrato - IMPORTANTE: Usar las direcciones correctas para Base Sepolia
const POOL_MANAGER_ADDRESS = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408'; // Dirección oficial Uniswap v4 PoolManager en Base Sepolia
const POSITION_MANAGER_ADDRESS = '0x4B2C77d209D3405F41a037Ec6c77F7F5b8e2ca80'; // Dirección oficial PositionManager
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'; // Dirección oficial Permit2
const POOL_STATE_READER_ADDRESS = '0xE62efCcb41469fC561203946F228dc11aFfd112d'; // PoolStateReader desplegado

// Tokens - Tus tokens
const VCOP_ADDRESS = '0x08544C4729aD52612b9A9fC20667afD3A81dB0ce';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Dirección actualizada de USDC en Base Sepolia

// Parámetros del pool
const FEE = 3000; // 0.3%
const TICK_SPACING = 60; // Para fee de 0.3%
const HOOKS_ADDRESS = '0x0000000000000000000000000000000000000000'; // Sin hooks
const SQRT_PRICE_X96 = '79228162514264337593543950336'; // Precio inicial 1:1

// ABIs para interactuar con los contratos
const POOL_MANAGER_ABI = [
  'function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)'
];

const POOL_STATE_READER_ABI = [
  'function getPoolState(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getPoolLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint128 liquidity)'
];

const POSITION_MANAGER_ABI = [
  'function modifyLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int128 liquidityDelta, uint256 amount0Max, uint256 amount1Max, bool collectAllFees, address recipient, bytes hookData, uint256 unlockTime) params) external payable returns (tuple(uint128 liquidity, uint256 amount0, uint256 amount1) result)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)'
];

// Función para ordenar los tokens correctamente
function sortTokens(tokenA, tokenB) {
  const addressA = tokenA.toLowerCase();
  const addressB = tokenB.toLowerCase();
  const [token0, token1] = addressA < addressB ? [addressA, addressB] : [addressB, addressA];
  return { token0, token1 };
}

async function main() {
  console.log('🚀 Comenzando creación de pool Uniswap v4 para VCOP/USDC');
  
  // Cargar clave privada
  const privateKey = loadEnv();
  if (!privateKey) {
    console.error('❌ Error: No se pudo cargar la clave privada. Por favor, verifica tu archivo .env');
    return;
  }
  
  // Configurar provider y wallet
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`🔗 Conectado a Base Sepolia como ${wallet.address}`);
  
  // Ordenar los tokens correctamente (crucial para Uniswap v4)
  const { token0, token1 } = sortTokens(VCOP_ADDRESS, USDC_ADDRESS);
  console.log(`Orden de tokens correcto: token0=${token0}, token1=${token1}`);
  
  // Crear la clave del pool
  const poolKey = {
    currency0: token0,
    currency1: token1,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS
  };
  
  // Verificar si el pool ya existe usando PoolStateReader
  console.log('\n🔍 Verificando si el pool ya existe...');
  
  try {
    const poolStateReader = new ethers.Contract(
      POOL_STATE_READER_ADDRESS,
      POOL_STATE_READER_ABI,
      wallet
    );
    
    // Consultar estado del pool
    const [sqrtPriceX96, tick, protocolFee, lpFee] = await poolStateReader.getPoolState(poolKey);
    const liquidity = await poolStateReader.getPoolLiquidity(poolKey);
    
    console.log('✅ El pool ya existe con los siguientes parámetros:');
    console.log(`  - Precio (sqrtPriceX96): ${sqrtPriceX96}`);
    console.log(`  - Tick: ${tick}`);
    console.log(`  - Fee protocolo: ${Number(protocolFee) / 10000}%`);
    console.log(`  - Fee LP: ${Number(lpFee) / 10000}%`);
    console.log(`  - Liquidez: ${liquidity.toString()}`);
    
    if (liquidity.toString() !== '0') {
      console.log('✅ El pool ya tiene liquidez. No es necesario inicializarlo de nuevo.');
      return;
    }
    
    console.log('✅ El pool existe pero no tiene liquidez. Procediendo a añadir liquidez...');
    
  } catch (error) {
    // Si hay un error al obtener el estado del pool, asumimos que no existe
    console.log('❌ El pool no existe. Procediendo a crearlo...');
    
    // Crear instancia del contrato PoolManager
    const poolManager = new ethers.Contract(
      POOL_MANAGER_ADDRESS,
      POOL_MANAGER_ABI,
      wallet
    );
    
    try {
      // Inicializar el pool
      console.log('🏗️ Inicializando pool...');
      const initTx = await poolManager.initialize(poolKey, SQRT_PRICE_X96, {
        gasLimit: 1000000 // Aumentar si es necesario
      });
      
      console.log(`✅ Transacción de inicialización enviada, hash: ${initTx.hash}`);
      
      // Esperar a que se confirme la transacción
      const initReceipt = await initTx.wait();
      console.log(`✅ Pool inicializado en el bloque ${initReceipt.blockNumber}`);
      
    } catch (error) {
      // Si falla con "pool already initialized", continuamos para añadir liquidez
      if (error.message.includes('already initialized')) {
        console.log('⚠️ El pool ya estaba inicializado. Continuando para añadir liquidez...');
      } else {
        console.error('❌ Error al inicializar el pool:', error);
        if (error.data) console.log('Error data:', error.data);
        return;
      }
    }
  }
  
  // Añadir liquidez usando el PositionManager
  console.log('\n💧 Añadiendo liquidez al pool...');
  
  try {
    // Primero aprobar tokens para el PositionManager
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, wallet);
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, wallet);
    
    // Consultar balances
    const balance0 = await token0Contract.balanceOf(wallet.address);
    const balance1 = await token1Contract.balanceOf(wallet.address);
    
    console.log(`Balance de ${token0 === VCOP_ADDRESS ? 'VCOP' : 'USDC'}: ${ethers.formatUnits(balance0, token0 === USDC_ADDRESS ? 6 : 18)}`);
    console.log(`Balance de ${token1 === VCOP_ADDRESS ? 'VCOP' : 'USDC'}: ${ethers.formatUnits(balance1, token1 === USDC_ADDRESS ? 6 : 18)}`);
    
    // Definir montos para liquidez (ajustar según tus balances)
    const amount0Max = token0 === USDC_ADDRESS ? 
      ethers.parseUnits('100', 6) : // Si token0 es USDC, usar 100 unidades
      ethers.parseUnits('100', 18);  // Si token0 es VCOP, usar 100 unidades
    
    const amount1Max = token1 === USDC_ADDRESS ? 
      ethers.parseUnits('100', 6) : // Si token1 es USDC, usar 100 unidades
      ethers.parseUnits('100', 18);  // Si token1 es VCOP, usar 100 unidades
    
    // Comprobar si hay suficiente balance
    if (BigInt(balance0) < BigInt(amount0Max) || BigInt(balance1) < BigInt(amount1Max)) {
      console.error('❌ Balance insuficiente para añadir liquidez');
      console.log(`Necesitas al menos ${ethers.formatUnits(amount0Max, token0 === USDC_ADDRESS ? 6 : 18)} ${token0 === VCOP_ADDRESS ? 'VCOP' : 'USDC'} y ${ethers.formatUnits(amount1Max, token1 === USDC_ADDRESS ? 6 : 18)} ${token1 === VCOP_ADDRESS ? 'VCOP' : 'USDC'}`);
      return;
    }
    
    // Aprobar tokens para el PositionManager
    console.log('🔐 Aprobando tokens para el PositionManager...');
    
    const approveTx0 = await token0Contract.approve(POSITION_MANAGER_ADDRESS, amount0Max);
    await approveTx0.wait();
    console.log(`✅ Aprobado ${token0 === VCOP_ADDRESS ? 'VCOP' : 'USDC'}`);
    
    const approveTx1 = await token1Contract.approve(POSITION_MANAGER_ADDRESS, amount1Max);
    await approveTx1.wait();
    console.log(`✅ Aprobado ${token1 === VCOP_ADDRESS ? 'VCOP' : 'USDC'}`);
    
    // Crear instancia del PositionManager
    const positionManager = new ethers.Contract(
      POSITION_MANAGER_ADDRESS,
      POSITION_MANAGER_ABI,
      wallet
    );
    
    // Definir rango completo para la posición de liquidez
    const MIN_TICK = -887272;
    const MAX_TICK = 887272;
    
    // Ajustar a los ticks correctos basados en tickSpacing
    const tickLower = Math.ceil(MIN_TICK / TICK_SPACING) * TICK_SPACING;
    const tickUpper = Math.floor(MAX_TICK / TICK_SPACING) * TICK_SPACING;
    
    // Parámetros para añadir liquidez
    const liquidityParams = {
      tickLower,
      tickUpper,
      liquidityDelta: '1000000000000000000000', // 1000 unidades de liquidez
      amount0Max,
      amount1Max,
      collectAllFees: false,
      recipient: wallet.address,
      hookData: '0x',
      unlockTime: 0 // Sin bloqueo de tiempo
    };
    
    // Añadir liquidez
    console.log(`📊 Añadiendo liquidez en el rango de ticks [${tickLower}, ${tickUpper}]...`);
    
    const liquidityTx = await positionManager.modifyLiquidity(poolKey, liquidityParams, {
      gasLimit: 3000000 // Aumentar gas limit para esta operación compleja
    });
    
    console.log(`✅ Transacción para añadir liquidez enviada, hash: ${liquidityTx.hash}`);
    
    // Esperar a que se confirme la transacción
    const liquidityReceipt = await liquidityTx.wait();
    console.log(`✅ Liquidez añadida en el bloque ${liquidityReceipt.blockNumber}`);
    
    // Verificar la liquidez del pool después de la operación
    const poolStateReader = new ethers.Contract(
      POOL_STATE_READER_ADDRESS,
      POOL_STATE_READER_ABI,
      wallet
    );
    
    const updatedLiquidity = await poolStateReader.getPoolLiquidity(poolKey);
    
    console.log(`\n🏆 Pool creado y configurado exitosamente!`);
    console.log(`Liquidez actual: ${updatedLiquidity.toString()}`);
    console.log(`\nAhora puedes interactuar con el pool usando interact-with-pool-correct.js`);
    
  } catch (error) {
    console.error('❌ Error al añadir liquidez:', error);
    
    if (error.message.includes('missing revert data')) {
      console.log('\n⚠️ Error de "missing revert data". Posibles causas:');
      console.log('1. Problemas con la aprobación de tokens');
      console.log('2. Balance insuficiente');
      console.log('3. Parámetros incorrectos para la posición de liquidez');
      console.log('4. Problemas con el PositionManager\n');
    }
    
    if (error.data) console.log('Error data:', error.data);
    if (error.transaction) console.log('Transaction:', error.transaction);
  }
}

// Ejecutar script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error general:', error);
    process.exit(1);
  }); 