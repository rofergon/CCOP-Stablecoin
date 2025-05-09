# Interacción con Uniswap v4 en Base Sepolia

## Problema Identificado

Al revisar tu implementación actual para interactuar con pools de Uniswap v4, se identificaron los siguientes problemas:

1. **Dirección incorrecta del PoolManager**: La dirección `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` que estabas usando no parece ser el PoolManager oficial de Uniswap v4 en Base Sepolia.

2. **Falta de verificación del orden de tokens**: En Uniswap v4, currency0 debe tener una dirección numéricamente menor que currency1. Si este orden no se respeta, el pool podría ser inaccesible.

3. **Método incorrecto de interacción**: La arquitectura de Uniswap v4 es diferente a v3, requiriendo un enfoque distinto para interactuar con los pools.

## Solución

Se han creado nuevos scripts siguiendo el template oficial de Uniswap v4 y la documentación actualizada:

### Scripts Disponibles

1. **create-pool-correct.js**: Crea un pool de Uniswap v4 correctamente.
2. **interact-with-pool-correct.js**: Consulta información de un pool existente.

### Direcciones Correctas

Según la documentación oficial y el repositorio de Uniswap, las direcciones correctas en Base Sepolia son:

```
PoolManager: 0x64e8802FE490fa7cc61d3463958199161Bb608A7
PositionManager: 0xAC58C9AD07DE5E71055DE179B984adB02f8D6b60
Permit2: 0xC7D5a5D429353Cc4ddF2F000F90C0AD8b8c6481B
```

### Uso de los Scripts

#### 1. Instalar Dependencias

```bash
npm install --save ethers@^6.7.0
```

#### 2. Crear un Pool (Solo se ejecuta una vez)

```bash
PRIVATE_KEY=tu_clave_privada node create-pool-correct.js
```

#### 3. Consultar Información del Pool

```bash
node interact-with-pool-correct.js
```

## Conceptos Clave de Uniswap v4

### Arquitectura Singleton

A diferencia de Uniswap v3 donde cada pool es un contrato separado, en v4 todos los pools son gestionados por un único contrato `PoolManager`. Esto reduce los costos de despliegue y simplifica las actualizaciones, pero cambia la forma de interactuar con los pools.

### Parámetros de Pool

- **currency0/currency1**: Direcciones de los tokens (deben estar en orden, con currency0 < currency1)
- **fee**: Tarifa del pool en "pips" (ej: 3000 = 0.3%)
- **tickSpacing**: Granularidad del pool (relacionado con el fee)
- **hooks**: Contrato de hooks opcional (0x0 si no se usan)

### Cálculo del PoolId

El PoolId se calcula a partir de los parámetros del pool y es la clave para acceder a la información del pool en el PoolManager.

### Referencias Importantes

- [Documentación oficial de Uniswap v4](https://docs.uniswap.org/contracts/v4/overview)
- [Template de Uniswap v4](https://github.com/uniswapfoundation/v4-template)
- [Guía de creación de pools](https://docs.uniswap.org/contracts/v4/quickstart/create-pool) 