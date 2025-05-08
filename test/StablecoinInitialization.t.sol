// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import "../src/AlgorithmicStablecoin.sol";
import "../src/MonetaryPolicy.sol";
import "../src/mocks/MockOracle.sol";

contract StablecoinInitializationTest is Test {
    AlgorithmicStablecoin public token;
    MonetaryPolicy public policy;
    MockOracle public oracle;
    address public deployer;

    // Tasas de cambio COP/USD para pruebas
    uint256 constant BASE_RATE = 4200e18;    // 4200 COP = 1 USD (tasa base)
    uint256 constant HIGH_RATE = 3990e18;    // 3990 COP = 1 USD (peso fuerte, aUSD sobre 1.05 USD)
    uint256 constant LOW_RATE = 4350e18;     // 4350 COP = 1 USD (peso débil, aUSD bajo 0.97 USD)

    function setUp() public {
        // Configuración del entorno de prueba
        deployer = address(this);
    }

    function testTwoStepInitialization() public {
        // Paso 1: Desplegar el token con política monetaria temporal (address 0)
        token = new AlgorithmicStablecoin(address(0));
        
        // Verificar que el token se ha desplegado correctamente
        assertEq(token.name(), "Algo USD");
        assertEq(token.symbol(), "aUSD");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1e24); // 1M tokens iniciales
        assertEq(token.balanceOf(deployer), 1e24);
        assertEq(token.monetaryPolicy(), address(0)); // La política monetaria aún no está configurada
        
        // Paso 2: Desplegar el oráculo
        oracle = new MockOracle();
        
        // Paso 3: Desplegar la política monetaria con la dirección del token
        policy = new MonetaryPolicy(token, oracle);
        
        // Paso 4: Configurar la política monetaria en el token
        token.setMonetaryPolicy(address(policy));
        
        // Verificar que la política monetaria se configuró correctamente
        assertEq(token.monetaryPolicy(), address(policy));
        
        // Prueba que el rebase falla si intentamos hacerlo desde otra dirección que no sea la política
        vm.expectRevert("not policy");
        token.rebase(1, 100);
        
        // Configurar el peso fuerte para probar un rebase de expansión (4000 COP/USD = 1.05 USD por aUSD)
        oracle.setUsdToCopRate(HIGH_RATE);
        
        // Avanzar el tiempo para permitir un rebase
        vm.warp(block.timestamp + 2 hours);
        
        // Ejecutar un rebase desde la política monetaria (debería funcionar)
        policy.executeEpoch();
        
        // El suministro debería haber aumentado aproximadamente un 1%
        uint256 expectedSupply = 1e24 + 1e24 / 100; // 1M + 1%
        assertEq(token.totalSupply(), expectedSupply);
        
        // Verificar que el balance del deployer también aumentó proporcionalmente
        assertEq(token.balanceOf(deployer), expectedSupply);
    }
    
    function testRebaseBehavior() public {
        // Inicializar el sistema completo
        token = new AlgorithmicStablecoin(address(0));
        oracle = new MockOracle();
        policy = new MonetaryPolicy(token, oracle);
        token.setMonetaryPolicy(address(policy));
        
        // Probar rebase neutral (tasa base = 4200 COP/USD)
        oracle.setUsdToCopRate(BASE_RATE);
        vm.warp(block.timestamp + 2 hours);
        policy.executeEpoch();
        assertEq(token.totalSupply(), 1e24); // Sin cambios
        
        // Probar rebase de contracción (peso débil: 4400 COP/USD, valor < 0.97 USD)
        oracle.setUsdToCopRate(LOW_RATE);
        vm.warp(block.timestamp + 2 hours);
        policy.executeEpoch();
        assertEq(token.totalSupply(), 1e24 - 1e24/100); // -1%
        
        // Probar rebase de expansión (peso fuerte: 4000 COP/USD, valor > 1.05 USD)
        oracle.setUsdToCopRate(HIGH_RATE);
        vm.warp(block.timestamp + 2 hours);
        policy.executeEpoch();
        uint256 expectedSupply = (1e24 - 1e24/100) + (1e24 - 1e24/100)/100; // Suministro anterior + 1%
        assertEq(token.totalSupply(), expectedSupply);
    }
} 