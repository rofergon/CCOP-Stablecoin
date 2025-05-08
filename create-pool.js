#!/usr/bin/env node

// Script para crear un pool en Uniswap v4 para VCOP/USDC
const { ethers } = require('ethers');
require('dotenv').config();

// Direcciones de los tokens (usando direcciones en minúsculas para evitar problemas de checksum)
const VCOP_ADDRESS = ethers.getAddress('0x08544c4729ad52612b9a9fc20667afd3a81db0ce');
const USDC_ADDRESS = ethers.getAddress('0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8');

// Direcciones de contratos Uniswap v4 en Base Sepolia
const POOL_MANAGER_ADDRESS = ethers.getAddress('0x05e73354cfdd6745c338b50bcfdfa3aa6fa03408');
const POSITION_MANAGER_ADDRESS = ethers.getAddress('0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80');
const PERMIT2_ADDRESS = ethers.getAddress('0x000000000022d473030f116ddee9f6b43ac78ba3');

// Constantes
const MAX_UINT160 = BigInt('0xffffffffffffffffffffffffffffffffffffffff'); // Max uint160 value for Permit2
const MAX_UINT48 = BigInt('0xffffffffffff'); // Max uint48 value for Permit2 expiration

// ABI simplificados para las interacciones básicas
const IPoolInitializer_ABI = [
  "function initializePool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) pool, uint160 sqrtPriceX96) external returns (address)"
];

const IPositionManager_ABI = [
  "function multicall(bytes[] data) external returns (bytes[] results)"
];

const IERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

const IAllowanceTransfer_ABI = [
  "function approve(address token, address spender, uint160 amount, uint48 expiration) external"
];

async function main() {
  // Verificar que tenemos la clave privada
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Por favor configura tu PRIVATE_KEY en el archivo .env');
    process.exit(1);
  }

  // Verificar que tenemos la URL del RPC
  if (!process.env.BASE_SEPOLIA_RPC_URL) {
    console.error('❌ Por favor configura BASE_SEPOLIA_RPC_URL en el archivo .env');
    process.exit(1);
  }

  console.log('🔄 Conectando a Base Sepolia...');
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`🔑 Usando cuenta: ${wallet.address}`);

  // Configuración de gas para evitar errores de "replacement transaction underpriced"
  const feeData = await provider.getFeeData();
  // Usar un multiplicador mucho más alto para el gas price
  const gasPrice = feeData.gasPrice * BigInt(10); // Multiplicamos por 10 para asegurar que sea mayor
  console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

  // Obtener el nonce actual para manejar las transacciones en secuencia
  const currentNonce = await provider.getTransactionCount(wallet.address);
  console.log(`🔢 Nonce inicial: ${currentNonce}`);
  let nonce = currentNonce;

  // Constantes para la creación del pool
  const FEE = 3000; // 0.3% fee tier
  const TICK_SPACING = 60;
  const SQRT_PRICE_1_1 = '79228162514264337593543950336'; // 1:1 starting price

  // Definir las direcciones de los tokens de manera ordenada (requerido por Uniswap)
  let currency0, currency1;
  if (BigInt(VCOP_ADDRESS) < BigInt(USDC_ADDRESS)) {
    currency0 = VCOP_ADDRESS;
    currency1 = USDC_ADDRESS;
    console.log('📊 currency0 es VCOP, currency1 es USDC');
  } else {
    currency0 = USDC_ADDRESS;
    currency1 = VCOP_ADDRESS;
    console.log('📊 currency0 es USDC, currency1 es VCOP');
  }

  try {
    // 1. Conectamos con los contratos
    console.log('🔗 Conectando con los contratos de Uniswap...');
    const poolManager = new ethers.Contract(POOL_MANAGER_ADDRESS, IPoolInitializer_ABI, wallet);
    const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, IPositionManager_ABI, wallet);
    
    // 2. Aprobar tokens para Permit2
    console.log('✅ Aprobando tokens...');
    const token0 = new ethers.Contract(currency0, IERC20_ABI, wallet);
    const token1 = new ethers.Contract(currency1, IERC20_ABI, wallet);
    
    // Usar mayor gas price para evitar errores de reemplazo de transacción
    console.log('Aprobando token0...');
    const approveOptions = { 
      gasPrice, 
      gasLimit: 100000,
      nonce: nonce++
    };
    const tx1 = await token0.approve(PERMIT2_ADDRESS, ethers.MaxUint256, approveOptions);
    console.log(`Aprobación token0 enviada: ${tx1.hash}`);
    
    console.log('Aprobando token1...');
    const approveOptions2 = { 
      gasPrice, 
      gasLimit: 100000,
      nonce: nonce++
    };
    const tx2 = await token1.approve(PERMIT2_ADDRESS, ethers.MaxUint256, approveOptions2);
    console.log(`Aprobación token1 enviada: ${tx2.hash}`);
    
    // 3. Aprobar Position Manager a través de Permit2
    console.log('✅ Configurando Permit2...');
    const permit2 = new ethers.Contract(PERMIT2_ADDRESS, IAllowanceTransfer_ABI, wallet);
    
    console.log('Configurando Permit2 para token0...');
    const permitOptions1 = { 
      gasPrice, 
      gasLimit: 150000,
      nonce: nonce++
    };
    const tx3 = await permit2.approve(
      currency0, 
      POSITION_MANAGER_ADDRESS, 
      MAX_UINT160, 
      MAX_UINT48, 
      permitOptions1
    );
    console.log(`Permit2 para token0 enviado: ${tx3.hash}`);
    
    console.log('Configurando Permit2 para token1...');
    const permitOptions2 = { 
      gasPrice, 
      gasLimit: 150000,
      nonce: nonce++
    };
    const tx4 = await permit2.approve(
      currency1, 
      POSITION_MANAGER_ADDRESS, 
      MAX_UINT160, 
      MAX_UINT48, 
      permitOptions2
    );
    console.log(`Permit2 para token1 enviado: ${tx4.hash}`);
    
    // Esperar a que las transacciones de aprobación se confirmen
    console.log('Esperando confirmación de las aprobaciones...');
    await Promise.all([
      tx1.wait(),
      tx2.wait(),
      tx3.wait(),
      tx4.wait()
    ]);
    
    // 4. Preparar datos para inicializar el pool
    console.log('🏊 Preparando datos para crear pool...');
    const poolKey = {
      currency0,
      currency1,
      fee: FEE,
      tickSpacing: TICK_SPACING,
      hooks: ethers.ZeroAddress
    };
    
    // 5. Inicializar pool a través de una multicall
    console.log('🚀 Creando pool...');
    
    // Codificar la llamada a initializePool usando ABI encoding
    const poolManagerInterface = new ethers.Interface([
      "function initializePool(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) pool, uint160 sqrtPriceX96) external returns (address)"
    ]);
    
    const initializePoolCall = poolManagerInterface.encodeFunctionData(
      "initializePool",
      [
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        SQRT_PRICE_1_1
      ]
    );
    
    // Ejecutar llamada multicall
    console.log('Ejecutando multicall para crear pool...');
    const poolOptions = { 
      gasPrice, 
      gasLimit: 5000000,
      nonce: nonce++
    };
    const result = await positionManager.multicall([initializePoolCall], poolOptions);
    
    console.log('✅ Pool creado exitosamente!');
    console.log('Hash de la transacción:', result.hash);
    
    // Esperar a que la transacción sea minada
    console.log('Esperando confirmación de la transacción...');
    const receipt = await result.wait();
    console.log('Transacción confirmada!');
    console.log('Pool de VCOP/USDC creado exitosamente en Uniswap v4.');
    
  } catch (error) {
    console.error('❌ Error al crear el pool:', error);
    process.exit(1);
  }
}

main(); 