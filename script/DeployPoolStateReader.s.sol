// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PoolStateReader} from "../src/PoolStateReader.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract DeployPoolStateReader is Script {
    // Base Sepolia Uniswap v4 PoolManager address
    address constant POOL_MANAGER_ADDRESS = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the PoolStateReader contract
        PoolStateReader reader = new PoolStateReader(IPoolManager(POOL_MANAGER_ADDRESS));
        
        console2.log("PoolStateReader deployed at:", address(reader));

        vm.stopBroadcast();
    }
} 