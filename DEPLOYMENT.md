# Stablecoin Deployment Guide

This guide will help you deploy the Algorithmic Stablecoin system to the Base Sepolia testnet.

## Prerequisites

1. Install Foundry if you haven't already:
   ```
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. Clone the repository and install dependencies:
   ```
   git clone <repository-url>
   cd CCOP-Stablecoin
   forge install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit `.env` to add your:
   - Private key (para despliegue, incluye el prefijo 0x)
   - BaseScan API key (para verificación)

## Deploy to Base Sepolia

1. Make sure your account has Base Sepolia ETH. You can get some from the [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia).

2. Deploy the contracts:
   ```
   ./deploy.sh
   ```
   o manualmente:
   ```
   forge script script/DeployStablecoin.s.sol:DeployStablecoin --rpc-url ${BASE_SEPOLIA_RPC_URL} --private-key ${PRIVATE_KEY} --broadcast --verify --verifier-url https://api-sepolia.basescan.org/api --etherscan-api-key ${BASESCAN_API_KEY}
   ```

3. The deployment script will output the addresses of the deployed contracts:
   - MockOracle
   - AlgorithmicStablecoin (aUSD)
   - MonetaryPolicy

## Contract Verification

If you include the `--verify` flag in the deployment command, Foundry will automatically verify the contracts on BaseScan.

You can manually verify a contract using:
```
forge verify-contract --chain-id 84532 <contract-address> src/ContractName.sol:ContractName --etherscan-api-key ${BASESCAN_API_KEY} --verifier-url https://api-sepolia.basescan.org/api
```

## Testing the Deployed Contracts

After deployment, you can interact with the contracts:

1. The deployer address should have all the initial aUSD tokens
2. The MonetaryPolicy contract can call `executeEpoch()` every 2 hours to adjust the total supply
3. You can set the Oracle price for testing using the MockOracle's `setUsdToCopRate()` function

## Contract Architecture

- **AlgorithmicStablecoin**: ERC-20 token with an elastic supply
- **MonetaryPolicy**: Controls the token supply based on the current price
- **MockOracle**: Provides price data for the MonetaryPolicy 