#!/bin/bash

# Exit script if any command fails
set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create it based on .env.example"
    exit 1
fi

# Load environment variables
source .env

# Check if Forge is installed
if ! command -v forge &> /dev/null; then
    echo "Error: Forge is not installed. Please install Foundry."
    echo "Run: curl -L https://foundry.paradigm.xyz | bash"
    echo "Then: foundryup"
    exit 1
fi

# Install dependencies if lib directory is empty
if [ ! "$(ls -A lib 2>/dev/null)" ]; then
    echo "Installing dependencies..."
    forge install
fi

# Build the project
echo "Building project..."
forge build

# Deploy to Base Sepolia
echo "Deploying to Base Sepolia..."
forge script script/DeployStablecoin.s.sol:DeployStablecoin --rpc-url ${BASE_SEPOLIA_RPC_URL} --private-key ${PRIVATE_KEY} --broadcast --verify --verifier-url https://api-sepolia.basescan.org/api --etherscan-api-key ${BASESCAN_API_KEY} -vvv

echo "Deployment completed!" 