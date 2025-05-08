// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import "../src/AlgorithmicStablecoin.sol";
import "../src/MonetaryPolicy.sol";
import "../src/mocks/MockOracle.sol";

contract DeployStablecoin is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy the Mock Oracle
        MockOracle oracle = new MockOracle();
        console2.log("MockOracle deployed at:", address(oracle));
        
        // 2. Deploy the Stablecoin with address(0) for monetary policy
        AlgorithmicStablecoin token = new AlgorithmicStablecoin(address(0));
        console2.log("AlgorithmicStablecoin deployed at:", address(token));
        
        // 3. Deploy the Monetary Policy
        MonetaryPolicy policy = new MonetaryPolicy(token, oracle);
        console2.log("MonetaryPolicy deployed at:", address(policy));
        
        // 4. Set the monetary policy on the token
        token.setMonetaryPolicy(address(policy));
        console2.log("Monetary policy set on token");
        
        vm.stopBroadcast();
    }
} 