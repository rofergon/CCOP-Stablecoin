
=======
# Virtual COP - Stablecoin Algorítmica para el Peso Colombiano
>>>>>>> 14868cd (Add initial project structure for Virtual COP stablecoin, including deployment scripts, Uniswap pool creation, and environment configuration files)

![Status](https://img.shields.io/badge/status-prototipo-yellow)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Descripción

Virtual COP (`VCOP`) es una stablecoin algorítmica que mantiene su paridad 1:1 con el peso colombiano (COP). El token implementa el mecanismo "rebasing" inspirado en Ampleforth, donde todos los saldos se ajustan proporcionalmente cuando cambia la oferta total, para mantener la estabilidad del precio.

## Características

- **Suministro elástico**: Aumenta o disminuye automáticamente según el precio de mercado
- **Paridad 1:1 con el peso colombiano**: Cada VCOP vale exactamente 1 peso colombiano
- **Algoritmo anticíclico**: Contrae la oferta cuando el token está infravalorado, expande cuando está sobrevalorado
- **Altamente divisible**: 18 decimales (estándar ERC-20)
- **Implementación gons/fragments**: Saldos escalados internamente para mantener la precisión durante los rebase

## Arquitectura

La stablecoin está compuesta por tres contratos principales:

1. `AlgorithmicStablecoin.sol`: Token ERC-20 con capacidad de rebase
2. `MonetaryPolicy.sol`: Implementa la lógica para determinar cuándo y cuánto rebasar
3. `IOracle.sol`: Interface para oráculos de precio (incluye implementación MockOracle)

### Diagrama de Interacción

```
+----------------+         +----------------+         +--------------+
| VirtualCOP     | <-----> | MonetaryPolicy | <-----> | PriceOracle  |
+----------------+         +----------------+         +--------------+
   Token ERC-20               Controla                   Proporciona
   con rebase                 los rebases                datos externos
```

## Mecanismo de Estabilización

El token mantiene su paridad con el peso colombiano a través de ajustes periódicos en la oferta monetaria:

1. **Verificación del precio**: Cada 2 horas, el contrato `MonetaryPolicy` consulta el precio actual de VCOP en COP a través del oráculo

2. **Condiciones de rebase**:
   - Si precio > 1.05 COP → Expandir oferta un 1%
   - Si precio < 0.97 COP → Contraer oferta un 1%
   - Si 0.97 ≤ precio ≤ 1.05 → No ajustar oferta

3. **Cálculo del precio**:
   El precio se calcula tomando como base la tasa COP/USD (4200 COP = 1 USD):
   ```
   precio = tasa_base_COP_USD (4200) / tasa_actual_COP_USD
   ```
   - Si _usdToCopRate < 4200, VCOP vale más de 1 COP (inflación del VCOP)
   - Si _usdToCopRate > 4200, VCOP vale menos de 1 COP (deflación del VCOP)

## Contratos Desplegados

Los contratos han sido desplegados en la red **Base Sepolia testnet**:

- **Virtual COP (VCOP)**: [`0x08544C4729aD52612b9A9fC20667afD3A81dB0ce`](https://sepolia.basescan.org/address/0x08544C4729aD52612b9A9fC20667afD3A81dB0ce)
- **MonetaryPolicy**: [`0x33355Ea950F6018E19f08D5061AaBDca2eaC1385`](https://sepolia.basescan.org/address/0x33355Ea950F6018E19f08D5061AaBDca2eaC1385)
- **MockOracle**: [`0x7F00d50b93886A1B4c32645cDD906169B2B85d9B`](https://sepolia.basescan.org/address/0x7F00d50b93886A1B4c32645cDD906169B2B85d9B)

Para más detalles, consulta [CONTRATOS_DESPLEGADOS.md](CONTRATOS_DESPLEGADOS.md).

## Instalación y Pruebas

Este proyecto utiliza [Foundry](https://book.getfoundry.sh/) como framework de desarrollo.

### Requisitos previos

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Configuración

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/CCOP-Stablecoin.git
cd CCOP-Stablecoin

# Instalar dependencias
forge install
```

### Ejecutar pruebas

```bash
forge test
```

### Compilar

```bash
forge build
```

## Despliegue

Para desplegar en una red de prueba o principal, puedes usar nuestro script de despliegue:

1. **Configura las variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env con tu PRIVATE_KEY y BASESCAN_API_KEY
   ```

2. **Ejecuta el script de despliegue**:
   ```bash
   ./deploy.sh
   ```

O manualmente:

```bash
forge script script/DeployStablecoin.s.sol:DeployStablecoin --rpc-url ${BASE_SEPOLIA_RPC_URL} --private-key ${PRIVATE_KEY} --broadcast --verify --verifier-url https://api-sepolia.basescan.org/api --etherscan-api-key ${BASESCAN_API_KEY}
```

## Interacción con los Contratos

Puedes interactuar con los contratos desplegados de varias maneras:

1. **Explorador de Bloques**: Usa la interfaz "Read Contract" y "Write Contract" en [BaseScan](https://sepolia.basescan.org/).

2. **Transferir VCOP**: Utiliza la función `transfer(address, uint256)` para enviar tokens.

3. **Ejecutar rebase manualmente**: Llama a `executeEpoch()` en el contrato MonetaryPolicy (disponible cada 2 horas).

4. **Simular cambios de precio**: Modifica la tasa USD/COP con `setUsdToCopRate(uint256)` en el contrato MockOracle para probar diferentes escenarios.

## Limitaciones y Consideraciones

- **Necesidad de Oráculo Confiable**: El sistema depende de un oráculo de precios preciso y resistente a manipulaciones (actualmente usa un mock)
- **Volatilidad del Peso Colombiano**: Fluctuaciones extremas pueden requerir ajustes en los parámetros de rebase
- **Parámetros Fijos**: Los umbrales de precio (1.05 y 0.97) y la magnitud de rebase (1%) están codificados y podrían requerir optimización
- **Frecuencia de Rebase**: El periodo de 2 horas puede ajustarse según las condiciones del mercado
- **Implementación de Prueba**: Esta es una implementación de prueba en testnet, no está lista para producción

## Licencia

Este proyecto está licenciado bajo [MIT](LICENSE).

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir los cambios propuestos.
