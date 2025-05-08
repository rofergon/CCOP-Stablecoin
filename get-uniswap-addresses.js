#!/usr/bin/env node

// Script para consultar direcciones de contratos de Uniswap v4 en Base Sepolia
// Requiere: npm install axios

const axios = require('axios');

async function fetchUniswapAddresses() {
  try {
    console.log('Consultando direcciones de Uniswap v4 en Base Sepolia...');
    
    // Intentar obtener las direcciones de la API o documentación de Uniswap
    // Esta URL es un ejemplo y deberá ser reemplazada por la real
    const response = await axios.get('https://docs.uniswap.org/contracts/v4/deployments.json');
    
    if (response.data && response.data.baseSepolia) {
      const addresses = response.data.baseSepolia;
      
      console.log('\nDirecciones de Uniswap v4 en Base Sepolia:');
      console.log('------------------------------------------');
      console.log(`PoolManager: ${addresses.poolManager}`);
      console.log(`PositionManager: ${addresses.positionManager}`);
      console.log(`Permit2: ${addresses.permit2}`);
      
      console.log('\nActualiza estas direcciones en script/CreateUniswapV4Pool.s.sol');
    } else {
      console.log('\n⚠️ No se pudieron obtener las direcciones automáticamente.');
      console.log('Consulta la documentación oficial para obtener las direcciones actuales:');
      console.log('https://docs.uniswap.org/contracts/v4/deployments\n');
      
      // Direcciones fallback (ejemplo)
      console.log('Direcciones de ejemplo (verificar antes de usar):');
      console.log('------------------------------------------');
      console.log('PoolManager: 0x64255ed29c18DCd30c7Db12912C2EDF19D3f4353');
      console.log('PositionManager: 0x1792E5D639c359C682c51c76e23E01B86F8647F0');
      console.log('Permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3');
    }
  } catch (error) {
    console.error('\n❌ Error al consultar las direcciones:', error.message);
    console.log('\nConsulta la documentación oficial para obtener las direcciones actuales:');
    console.log('https://docs.uniswap.org/contracts/v4/deployments\n');
  }
}

fetchUniswapAddresses(); 