const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---
// Direcciones del contrato - IMPORTANTE: Usar las direcciones correctas para Base Sepolia
const POOL_MANAGER_ADDRESS = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408'; // Dirección oficial Uniswap v4 PoolManager en Base Sepolia
const POOL_STATE_READER_ADDRESS = '0xE62efCcb41469fC561203946F228dc11aFfd112d'; // PoolStateReader desplegado

// Tokens - Tus tokens
const VCOP_ADDRESS = '0x08544C4729aD52612b9A9fC20667afD3A81dB0ce';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Dirección actualizada de USDC en Base Sepolia

// Parámetros del pool
const FEE = 3000; // 0.3%
const TICK_SPACING = 60; // Para fee de 0.3%
const HOOKS_ADDRESS = '0x0000000000000000000000000000000000000000'; // Sin hooks

// ABI simplificado para PoolManager y PoolStateReader
const POOL_MANAGER_ABI = ['function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes callbackData) external returns (tuple(int256 amount0, int256 amount1) delta)'];

const POOL_STATE_READER_ABI = [
  'function getPoolState(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getPoolLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint128 liquidity)'
];

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

// Función para ordenar los tokens correctamente
function sortTokens(tokenA, tokenB) {
  const addressA = tokenA.toLowerCase();
  const addressB = tokenB.toLowerCase();
  const [token0, token1] = addressA < addressB ? [addressA, addressB] : [addressB, addressA];
  return { token0, token1 };
}

// Función para calcular el precio a partir de sqrtPriceX96
function calculatePrice(sqrtPriceX96, decimals0, decimals1) {
  try {
    // Convertir a BigInt para mayor precisión
    const sqrtPriceBigInt = BigInt(sqrtPriceX96);
    // Calcular precio: (sqrtPriceX96 / 2^96)^2
    const priceBigInt = (sqrtPriceBigInt ** 2n) / (2n ** 192n);
    
    // Convertir a número para ajustar decimales
    const price = Number(priceBigInt);
    
    // Ajustar por decimales (como BigInt)
    const decimalAdjustment = 10 ** (Number(decimals0) - Number(decimals1));
    const adjustedPrice = price * decimalAdjustment;
    
    return adjustedPrice;
  } catch (error) {
    console.error("Error al calcular el precio:", error.message);
    return 0; // Valor predeterminado en caso de error
  }
}

async function main() {
  console.log('🔄 Iniciando interacción con el pool Uniswap v4 VCOP/USDC...');
  
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
  const token0Address = token0;
  const token1Address = token1;
  
  console.log(`Orden de tokens correcto: token0=${token0Address}, token1=${token1Address}`);
  
  // Comprobar si VCOP es token0 o token1
  const isVCOPToken0 = token0Address.toLowerCase() === VCOP_ADDRESS.toLowerCase();
  console.log(`VCOP es ${isVCOPToken0 ? 'token0' : 'token1'}`);
  
  // Crear la clave del pool
  const poolKey = {
    currency0: token0Address,
    currency1: token1Address,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: HOOKS_ADDRESS
  };
  
  // NUEVO: Primero consultamos el estado del pool usando PoolStateReader
  console.log('\n📊 Consultando estado del pool antes de interactuar...');
  
  try {
    const poolStateReader = new ethers.Contract(
      POOL_STATE_READER_ADDRESS,
      POOL_STATE_READER_ABI,
      wallet
    );
    
    // Consultar estado del pool
    const [sqrtPriceX96, tick, protocolFee, lpFee] = await poolStateReader.getPoolState(poolKey);
    const liquidity = await poolStateReader.getPoolLiquidity(poolKey);
    
    console.log(`✅ Estado actual del pool:`);
    console.log(`  - Precio (sqrtPriceX96): ${sqrtPriceX96}`);
    console.log(`  - Tick: ${tick}`);
    console.log(`  - Fee protocolo: ${Number(protocolFee) / 10000}%`);
    console.log(`  - Fee LP: ${Number(lpFee) / 10000}%`);
    console.log(`  - Liquidez: ${liquidity.toString()}`);
    
    if (liquidity.toString() === '0') {
      console.log('\n⚠️ ADVERTENCIA: El pool no tiene liquidez. Se debe añadir liquidez antes de operar.');
      console.log('Ejecuta primero create-pool-correct.js para añadir liquidez al pool.\n');
      return;
    }
  } catch (error) {
    console.error('❌ Error al consultar estado del pool:', error);
    console.log('Continuando con la interacción de todos modos...');
  }
  
  // Continuar con la interacción
  console.log('\n🔄 Preparando swap en Uniswap v4...');
  
  // Crear instancia del contrato PoolManager
  const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, POOL_MANAGER_ABI, wallet);
  
  // Parámetros para el swap
  // Para un swap de VCOP a USDC, zeroForOne debe ser true si VCOP es token0, false si es token1
  const zeroForOne = isVCOPToken0;
  
  // Monto a intercambiar (ajustar según los decimales de tu token)
  // Positive = exactInput, negative = exactOutput
  const swapAmount = ethers.parseUnits('0.01', 18); // Intenta con un monto pequeño al principio
  
  // Límite de precio para el swap
  const sqrtPriceLimitX96 = zeroForOne
    ? BigInt('4295128739') // Mínimo precio para vender token0
    : BigInt('1461446703485210103287273052203988822378723970341') // Máximo precio para vender token1
  
  // Prepara los parámetros del swap
  const params = {
    zeroForOne: zeroForOne,
    amountSpecified: swapAmount,
    sqrtPriceLimitX96: sqrtPriceLimitX96
  };
  
  // Datos de callback - en este caso vacío ya que usamos un hook vacío
  const callbackData = '0x';
  
  console.log(`Enviando swap: ${zeroForOne ? 'VCOP→USDC' : 'USDC→VCOP'}, Monto: ${ethers.formatUnits(swapAmount, 18)}`);
  
  try {
    // Realizar swap
    const tx = await poolManager.swap(poolKey, params, callbackData, {
      gasLimit: 1000000 // Aumentar gas limit si es necesario
    });
    
    console.log(`✅ Transacción enviada, hash: ${tx.hash}`);
    console.log('Esperando confirmación...');
    
    const receipt = await tx.wait();
    console.log(`✅ Transacción confirmada en el bloque ${receipt.blockNumber}`);
    
    // Comprobar eventos para ver el resultado del swap
    if (receipt.status === 1) {
      console.log('Swap realizado con éxito!');
    } else {
      console.log('❌ La transacción falló');
    }
    
  } catch (error) {
    console.error('❌ Error al realizar el swap:', error);
    
    if (error.message.includes('missing revert data')) {
      console.log('\n⚠️ Error de "missing revert data". Posibles causas:');
      console.log('1. El pool puede no existir - Verifica que se haya creado correctamente');
      console.log('2. El pool puede no tener liquidez - Añade liquidez primero');
      console.log('3. Los parámetros de swap pueden ser inválidos (límite de precio, etc.)');
      console.log('4. Puede haber problemas con los hooks o permisos\n');
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