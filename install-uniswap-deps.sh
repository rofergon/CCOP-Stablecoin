#!/bin/bash

# Script to install Uniswap v4 dependencies

echo "Installing Uniswap v4 dependencies..."

# Install core dependencies
forge install uniswap/v4-core
forge install uniswap/v4-periphery
forge install Uniswap/permit2

# Install forge standard library if not installed already
forge install foundry-rs/forge-std

echo "Dependencies installed successfully. Updating remappings..."

# Generate remappings
forge remappings > remappings.txt

echo "Installation complete!" 