# Contratos Desplegados en Base Sepolia

Este documento contiene la información de los contratos que han sido desplegados y verificados en la red Base Sepolia.

## Información de la Red

- **Red**: Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorador de Bloques**: https://sepolia.basescan.org

## Contratos Desplegados

### Virtual COP (VCOP)

- **Dirección**: [`0x08544C4729aD52612b9A9fC20667afD3A81dB0ce`](https://sepolia.basescan.org/address/0x08544C4729aD52612b9A9fC20667afD3A81dB0ce)
- **Descripción**: Token ERC-20 con suministro elástico que implementa el mecanismo de rebase para mantener el valor en paridad 1:1 con el peso colombiano (COP).
- **Funciones Principales**:
  - `totalSupply()`: Muestra el suministro total actual de tokens.
  - `balanceOf(address)`: Muestra el balance de un usuario.
  - `transfer(address, uint256)`: Transfiere tokens a otra dirección.
  - `rebase(uint256, int256)`: Función restringida que ejecuta el rebase (solo puede ser llamada por MonetaryPolicy).

### MonetaryPolicy

- **Dirección**: [`0x33355Ea950F6018E19f08D5061AaBDca2eaC1385`](https://sepolia.basescan.org/address/0x33355Ea950F6018E19f08D5061AaBDca2eaC1385)
- **Descripción**: Contrato que determina cuándo y en qué cantidad realizar un rebase basado en el precio del token.
- **Funciones Principales**:
  - `executeEpoch()`: Consulta el precio al oráculo y ejecuta un rebase si es necesario.
  - `setOracle(address)`: Actualiza la dirección del oráculo (solo owner).

### MockOracle

- **Dirección**: [`0x7F00d50b93886A1B4c32645cDD906169B2B85d9B`](https://sepolia.basescan.org/address/0x7F00d50b93886A1B4c32645cDD906169B2B85d9B)
- **Descripción**: Oráculo simulado que proporciona el precio del token en pesos colombianos (COP).
- **Funciones Principales**:
  - `getPrice()`: Devuelve el precio actual del token en COP.
  - `setUsdToCopRate(uint256)`: Establece una nueva tasa de cambio COP/USD para pruebas (por defecto: 4200 COP = 1 USD).

## Interacción con los Contratos

Para interactuar con estos contratos, puedes:

1. **Explorador de Bloques**: Usar la interfaz "Read Contract" y "Write Contract" en BaseScan.
2. **Web3.js/ethers.js**: Interactuar programáticamente usando la ABI y dirección de los contratos.
3. **Remix**: Conectar Remix a Base Sepolia e interactuar con los contratos.

## Estrategia de Estabilidad

- El VCOP está diseñado para mantener una paridad 1:1 con el peso colombiano.
- El oráculo utiliza la tasa de cambio COP/USD (4200 COP = 1 USD) como referencia.
- Cuando el precio del VCOP se desvía más de un 5% de su valor ideal:
  - Si VCOP > 1.05 COP: se aumenta el suministro un 1%
  - Si VCOP < 0.97 COP: se disminuye el suministro un 1%

## Hash de las Transacciones de Despliegue

- MockOracle: [`0x23286a2fb3bafef32f08732ee97ccc3c51d06c3c9198066ebcb9c0f6dd32f6ec`](https://sepolia.basescan.org/tx/0x23286a2fb3bafef32f08732ee97ccc3c51d06c3c9198066ebcb9c0f6dd32f6ec)
- AlgorithmicStablecoin (VCOP): [`0x6780e144b5eeb58bb0d00305d3f695cb5a0bdeabe4c080ba1c8bdb521c7abac8`](https://sepolia.basescan.org/tx/0x6780e144b5eeb58bb0d00305d3f695cb5a0bdeabe4c080ba1c8bdb521c7abac8)
- MonetaryPolicy: [`0x1b818b4a194304e8ef5d66cab77ad9a2cabbcc0b533d1b0356502e62bb2ccac2`](https://sepolia.basescan.org/tx/0x1b818b4a194304e8ef5d66cab77ad9a2cabbcc0b533d1b0356502e62bb2ccac2)
- Configuración de MonetaryPolicy en el token: [`0xa5b5f6a1d053e37e307eaec6f0b76c4dbcf8c5108ed8f56003c8843a89d32268`](https://sepolia.basescan.org/tx/0xa5b5f6a1d053e37e307eaec6f0b76c4dbcf8c5108ed8f56003c8843a89d32268) 