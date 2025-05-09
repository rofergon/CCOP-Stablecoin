#!/bin/bash

# Script para desplegar el PoolStateReader en Base Sepolia

# Cargar PRIVATE_KEY desde el archivo .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY no está definida en el archivo .env"
    exit 1
  fi
else
  echo "❌ Archivo .env no encontrado. Por favor, crea un archivo .env con PRIVATE_KEY=tu_clave_privada"
  exit 1
fi

echo "🔨 Compilando PoolStateReader..."
forge build --via-ir

# Si la compilación fue exitosa, desplegar
if [ $? -eq 0 ]; then
  echo "🚀 Desplegando PoolStateReader en Base Sepolia..."
  
  # Ejecutar script de despliegue
  forge script script/DeployPoolStateReader.s.sol:DeployPoolStateReader \
    --rpc-url base_sepolia \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --legacy
    
  # Si el despliegue es exitoso, mostrar instrucciones  
  if [ $? -eq 0 ]; then
    echo "✅ PoolStateReader desplegado exitosamente!"
    echo "Ahora necesitas actualizar la dirección POOL_STATE_READER_ADDRESS en el archivo check-pool-using-reader.js"
    echo "con la dirección de despliegue que se muestra arriba."
  else
    echo "❌ Error al desplegar el contrato."
  fi
else
  echo "❌ Compilación fallida. Verifica los errores y vuelve a intentar."
fi 