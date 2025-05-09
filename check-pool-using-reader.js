const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Direcciones - Actualizar con las direcciones correctas
const POOL_MANAGER_ADDRESS = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408'; // PoolManager oficial en Base Sepolia
const VCOP_ADDRESS = '0x08544C4729aD52612b9A9fC20667afD3A81dB0ce';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
// La siguiente dirección se debe cambiar una vez desplegado el contrato PoolStateReader
const POOL_STATE_READER_ADDRESS = '0xd8C28E67253b8b9fa5098Ae3e7FE688C4a94172f'; 

// Parámetros del pool
const FEE = 3000; // 0.3%
const TICK_SPACING = 60; // Para fee de 0.3%
const HOOKS_ADDRESS = '0x0000000000000000000000000000000000000000'; // Sin hooks

// ABI simplificado para PoolStateReader
const POOL_STATE_READER_ABI = [
  'function getPoolState(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getPoolLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint128 liquidity)'
];

// Función para cargar variables de entorno desde .env
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
  console.log('🔍 Consultando estado del pool VCOP/USDC usando PoolStateReader...');
  
  // Configurar provider
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  // Cargar clave privada para transacciones si se necesita
  const privateKey = loadEnv();
  if (!privateKey) {
    console.log('⚠️ No se encontró PRIVATE_KEY en .env, continuando en modo sólo lectura');
  }
  
  // Conexión con wallet o provider según disponibilidad
  const account = privateKey 
    ? new ethers.Wallet(privateKey, provider)
    : provider;
  
  console.log(`🔗 Conectado a Base Sepolia como ${privateKey ? account.address : 'solo lectura'}`);
  
  // Verificar si el contrato PoolStateReader está desplegado
  if (POOL_STATE_READER_ADDRESS === 'FILL_IN_AFTER_DEPLOYMENT') {
    console.error('❌ Por favor, actualiza POOL_STATE_READER_ADDRESS con la dirección del contrato desplegado');
    process.exit(1);
  }
  
  // Crear instancia del contrato PoolStateReader
  const poolStateReader = new ethers.Contract(
    POOL_STATE_READER_ADDRESS,
    POOL_STATE_READER_ABI,
    account
  );
  
  try {
    console.log('🧮 Ordenando tokens para la clave del pool...');
    // Ordenar los tokens correctamente (crucial para Uniswap v4)
    const { token0, token1 } = sortTokens(VCOP_ADDRESS, USDC_ADDRESS);
    console.log(`Token0: ${token0}`);
    console.log(`Token1: ${token1}`);
    
    // Crear la clave del pool
    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee: FEE,
      tickSpacing: TICK_SPACING,
      hooks: HOOKS_ADDRESS
    };
    
    console.log('📊 Obteniendo datos actuales del pool...');
    
    // Obtener estado del pool
    const [sqrtPriceX96, tick, protocolFee, lpFee] = await poolStateReader.getPoolState(poolKey);
    console.log(`✅ Estado obtenido: sqrtPrice=${sqrtPriceX96}, tick=${tick}, protocolFee=${protocolFee}, lpFee=${lpFee}`);
    
    // Obtener liquidez del pool
    const liquidity = await poolStateReader.getPoolLiquidity(poolKey);
    console.log(`✅ Liquidez obtenida: ${liquidity}`);
    
    // Obtener información de tokens para ajustar el precio correctamente
    console.log('📋 Obteniendo decimales de los tokens...');
    
    // ABIs mínimos para consultar los decimales
    const ERC20_ABI = ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
    
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);
    
    const [decimals0, decimals1, symbol0, symbol1] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);
    
    // Calcular precio actual
    const price = calculatePrice(sqrtPriceX96, decimals0, decimals1);
    
    console.log('\n==== RESUMEN DEL POOL ====');
    console.log(`Pool: ${symbol0}/${symbol1}`);
    console.log(`Precio actual: ${price.toFixed(8)} ${symbol1} por ${symbol0}`);
    console.log(`Tick actual: ${tick}`);
    console.log(`Liquidez total: ${liquidity.toString() === '0' ? '0' : ethers.formatUnits(liquidity, 18)}`);
    console.log(`Fee de protocolo: ${Number(protocolFee) / 10000}%`);
    console.log(`Fee para LPs: ${Number(lpFee) / 10000}%`);
    console.log('========================\n');
    
  } catch (error) {
    console.error('❌ Error al consultar el pool:', error);
    
    if (error.message.includes('missing revert data')) {
      console.log('\n⚠️ Error de "missing revert data" detectado. Posibles causas:');
      console.log('1. El pool puede no existir aún - Verifica que se haya creado correctamente');
      console.log('2. La dirección del PoolStateReader puede ser incorrecta');
      console.log('3. Los parámetros del pool (tokens, fee, tickSpacing) pueden ser incorrectos');
      console.log('4. Puede haber un problema con la implementación del PoolStateReader\n');
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