# Creación de Pool en Uniswap v4 (VCOP/USDC)

Este documento contiene las instrucciones para crear un pool de liquidez en Uniswap v4 para el par VCOP/USDC en la red Base Sepolia.

## Requisitos previos

- Tener instalado Foundry
- Poseer tokens VCOP
- Poseer tokens USDC de prueba en Sepolia
- Contar con ETH en la red Base Sepolia para pagar gas

## Direcciones relevantes

### Tokens
- **VCOP**: `0x08544C4729aD52612b9A9fC20667afD3A81dB0ce` (Base Sepolia)
- **USDC Sepolia**: `0x94a9D9AC8a22534E3FaCA9F4e7F2E2cf85d5E4C8` (Sepolia)

### Contratos de Uniswap v4 (Base Sepolia)
- **PoolManager**: `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` (Oficial)
- **PositionManager**: `0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80` (Oficial)
- **Permit2**: `0x000000000022D473030F116dDEE9F6B43aC78BA3` (Estándar)

## Pasos para crear el pool

### 1. Instalar dependencias de Uniswap v4

Ejecuta el script de instalación:

```bash
./install-uniswap-deps.sh
```

Este script instalará:
- uniswap/v4-core
- uniswap/v4-periphery
- permit2
- forge-std (si no está instalado)

### 2. Actualizar direcciones en el script de despliegue

Antes de ejecutar el script de creación del pool, verifica y actualiza las direcciones de los contratos de Uniswap v4 en `script/CreateUniswapV4Pool.s.sol`:

```solidity
// Base Sepolia Uniswap v4 addresses
address constant POOL_MANAGER_ADDRESS = 0x...;    // Actualizar con dirección real
address constant POSITION_MANAGER_ADDRESS = 0x...; // Actualizar con dirección real
```

### 3. Verificar parámetros del pool

El script está configurado con estos parámetros por defecto:
- **Fee**: 0.3% (3000)
- **Tick Spacing**: 60
- **Liquidez inicial**: 1,000,000 unidades

Puedes ajustarlos según tus necesidades.

### 4. Ejecutar el script de creación del pool

```bash
forge script script/CreateUniswapV4Pool.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

### 5. Verificar la creación del pool

Una vez ejecutado el script, verifica la creación del pool en un explorador de bloques como BaseScan (Sepolia).

## Agregar liquidez adicional

Puedes agregar más liquidez al pool a través de la interfaz de Uniswap o interactuando directamente con el contrato PositionManager.

## Recomendaciones de seguridad

- Verifica siempre las direcciones de los contratos antes de interactuar con ellos.
- Comienza con cantidades pequeñas para pruebas.
- Revisa los permisos que otorgas a los contratos.

## Recursos adicionales

- [Documentación de Uniswap v4](https://docs.uniswap.org/contracts/v4/overview)
- [Guía de creación de pools en Uniswap v4](https://docs.uniswap.org/contracts/v4/quickstart/create-pool) 