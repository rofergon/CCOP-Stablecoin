CCOP - Stablecoin Algorítmica para el Peso Colombiano

![Status](https://img.shields.io/badge/status-prototipo-yellow)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Descripción

Algo COP (`aUSD`) es una stablecoin algorítmica que mantiene su paridad con el dólar estadounidense (USD) a través de expansiones y contracciones automáticas de su oferta en respuesta a las variaciones del precio del peso colombiano (COP). El token implementa el mecanismo "rebasing" inspirado en Ampleforth, donde todos los saldos se ajustan proporcionalmente cuando cambia la oferta total.

## Características

- **Suministro elástico**: Aumenta o disminuye automáticamente según el precio de mercado
- **Vinculado al peso colombiano**: Utiliza la tasa COP/USD como oráculo de precio
- **Algoritmo anticíclico**: Contrae la oferta cuando el token está infravalorado, expande cuando está sobrevalorado
- **Altamente divisible**: 18 decimales (estándar ERC-20)
- **Implementación gons/fragments**: Saldos escalados internamente para mantener la precisión durante los rebase

## Arquitectura

La stablecoin está compuesta por tres contratos principales:

1. `AlgorithmicStablecoin.sol`: Token ERC-20 con capacidad de rebase
2. `MonetaryPolicy.sol`: Implementa la lógica para determinar cuándo y cuánto rebasar
3. `IOracle.sol`: Interface para oráculos de precio (requiere implementación externa)

### Diagrama de Interacción

```
+----------------+         +----------------+         +--------------+
| AlgoStablecoin | <-----> | MonetaryPolicy | <-----> | PriceOracle  |
+----------------+         +----------------+         +--------------+
   Token ERC-20               Controla                   Proporciona
   con rebase                 los rebases                datos externos
```

## Mecanismo de Estabilización

El token mantiene su paridad con USD a través de ajustes periódicos en la oferta monetaria:

1. **Verificación del precio**: Cada 2 horas, el contrato `MonetaryPolicy` consulta el precio actual de aUSD en USD a través del oráculo

2. **Condiciones de rebase**:
   - Si precio > $1.05 USD → Expandir oferta un 1%
   - Si precio < $0.97 USD → Contraer oferta un 1%
   - Si $0.97 ≤ precio ≤ $1.05 → No ajustar oferta

3. **Cálculo del precio**:
   El precio se calcula en base a la tasa COP/USD:
   ```
   precio = tasa_base_COP_USD (4200) / tasa_actual_COP_USD
   ```
   - Si el peso se fortalece (< 4200 COP/USD), la stablecoin vale más de 1 USD
   - Si el peso se debilita (> 4200 COP/USD), la stablecoin vale menos de 1 USD

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

Para desplegar en una red de prueba o principal, sigue estos pasos:

1. **Primero, despliega el token con política monetaria temporal**:
   ```bash
   forge create src/AlgorithmicStablecoin.sol:AlgorithmicStablecoin --constructor-args 0x0000000000000000000000000000000000000000 --private-key TU_CLAVE_PRIVADA --rpc-url TU_RPC_URL
   ```

2. **Despliega el oráculo de precios**:
   ```bash
   # Implementa tu propio oráculo o utiliza una implementación existente
   forge create src/mocks/MockOracle.sol:MockOracle --private-key TU_CLAVE_PRIVADA --rpc-url TU_RPC_URL
   ```

3. **Despliega la política monetaria**:
   ```bash
   forge create src/MonetaryPolicy.sol:MonetaryPolicy --constructor-args DIRECCION_TOKEN DIRECCION_ORACULO --private-key TU_CLAVE_PRIVADA --rpc-url TU_RPC_URL
   ```

4. **Actualiza la política monetaria en el token**:
   ```bash
   cast send DIRECCION_TOKEN "setMonetaryPolicy(address)" DIRECCION_POLITICA --private-key TU_CLAVE_PRIVADA --rpc-url TU_RPC_URL
   ```

## Limitaciones y Consideraciones

- **Necesidad de Oráculo Confiable**: El sistema depende de un oráculo de precios preciso y resistente a manipulaciones
- **Volatilidad del Peso Colombiano**: Fluctuaciones extremas pueden requerir ajustes en los parámetros de rebase
- **Parámetros Fijos**: Los umbrales de precio (1.05 y 0.97) y la magnitud de rebase (1%) están codificados y podrían requerir optimización
- **Frecuencia de Rebase**: El periodo de 2 horas puede ajustarse según las condiciones del mercado
- **Problemas de liquidez**: Al inicio, el token podría enfrentar desafíos de liquidez hasta alcanzar adopción suficiente

## Licencia

Este proyecto está licenciado bajo [MIT](LICENSE).

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir los cambios propuestos.
