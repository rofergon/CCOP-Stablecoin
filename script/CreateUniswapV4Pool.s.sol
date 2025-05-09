// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import {Script, console2} from "lib/forge-std/src/Script.sol";
import {PoolKey} from "lib/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "lib/v4-core/src/interfaces/IPoolManager.sol";
import {PositionManager} from "lib/v4-periphery/src/PositionManager.sol";
import {TickMath} from "lib/v4-core/src/libraries/TickMath.sol";
import {CurrencyLibrary, Currency} from "lib/v4-core/src/types/Currency.sol";
import {IHooks} from "lib/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "lib/v4-core/src/libraries/Hooks.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IAllowanceTransfer} from "lib/v4-periphery/lib/permit2/src/interfaces/IAllowanceTransfer.sol";
import {IPoolInitializer_v4} from "lib/v4-periphery/src/interfaces/IPoolInitializer_v4.sol";
import {Actions} from "lib/v4-periphery/src/libraries/Actions.sol";

contract CreateUniswapV4Pool is Script {
    // Deployed VCOP token from CONTRATOS_DESPLEGADOS.md
    address constant VCOP_ADDRESS = 0x08544C4729aD52612b9A9fC20667afD3A81dB0ce;
    
    // USDC Address on Sepolia (common test token)
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Base Sepolia Uniswap v4 addresses (from official docs)
    address constant POOL_MANAGER_ADDRESS = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant POSITION_MANAGER_ADDRESS = 0x4B2C77d209D3405F41a037Ec6c77F7F5b8e2ca80;
    address constant PERMIT2_ADDRESS = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // Pool parameters
    uint24 constant FEE = 3000; // 0.3% fee tier
    int24 constant TICK_SPACING = 60;
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // 1:1 starting price

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        console2.log("Creating Uniswap v4 pool for VCOP/USDC");
        console2.log("VCOP address:", VCOP_ADDRESS);
        console2.log("USDC address:", USDC_ADDRESS);
        
        // Convert addresses to Currency type
        Currency currency0;
        Currency currency1;
        
        // Sort tokens by address (required by Uniswap)
        if (uint160(VCOP_ADDRESS) < uint160(USDC_ADDRESS)) {
            currency0 = Currency.wrap(VCOP_ADDRESS);
            currency1 = Currency.wrap(USDC_ADDRESS);
            console2.log("currency0 is VCOP, currency1 is USDC");
        } else {
            currency0 = Currency.wrap(USDC_ADDRESS);
            currency1 = Currency.wrap(VCOP_ADDRESS);
            console2.log("currency0 is USDC, currency1 is VCOP");
        }
        
        // Create the PoolKey
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0)) // No hooks for this basic pool
        });
        
        // Get contract instances
        IPoolManager poolManager = IPoolManager(POOL_MANAGER_ADDRESS);
        PositionManager positionManager = PositionManager(payable(POSITION_MANAGER_ADDRESS));
        
        // Setup multicall parameters for creating a pool and adding liquidity
        bytes[] memory multicallData = new bytes[](2);
        
        // 1. Initialize pool parameters for multicall
        multicallData[0] = abi.encodeWithSelector(
            IPoolInitializer_v4.initializePool.selector,
            poolKey,
            SQRT_PRICE_1_1
        );
        
        // 2. Set up liquidity addition parameters
        // Define position parameters
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        int24 tickUpper = TickMath.maxUsableTick(TICK_SPACING);
        uint128 liquidity = 1000000e18; // Initial liquidity amount
        uint256 amount0Max = 1000e18;   // Max token0 to contribute
        uint256 amount1Max = 1000e18;   // Max token1 to contribute
        
        // Encode MINT_POSITION and SETTLE_PAIR actions
        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        
        // Encode mint parameters
        bytes[] memory mintParams = new bytes[](2);
        mintParams[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            address(this),
            bytes("") // Hook data
        );
        mintParams[1] = abi.encode(poolKey.currency0, poolKey.currency1);
        
        // Encode modifyLiquidities call
        uint256 deadline = block.timestamp + 3600; // 1 hour deadline
        multicallData[1] = abi.encodeWithSelector(
            positionManager.modifyLiquidities.selector,
            abi.encode(actions, mintParams),
            deadline
        );
        
        // Approve tokens for Permit2
        IERC20(Currency.unwrap(currency0)).approve(PERMIT2_ADDRESS, type(uint256).max);
        IERC20(Currency.unwrap(currency1)).approve(PERMIT2_ADDRESS, type(uint256).max);
        
        // Approve PositionManager via Permit2
        IAllowanceTransfer permit2 = IAllowanceTransfer(PERMIT2_ADDRESS);
        permit2.approve(Currency.unwrap(currency0), address(positionManager), type(uint160).max, type(uint48).max);
        permit2.approve(Currency.unwrap(currency1), address(positionManager), type(uint160).max, type(uint48).max);
        
        // Execute multicall to create pool and add liquidity
        positionManager.multicall(multicallData);
        
        console2.log("Uniswap v4 pool created successfully with initial liquidity");
        
        vm.stopBroadcast();
    }
} 