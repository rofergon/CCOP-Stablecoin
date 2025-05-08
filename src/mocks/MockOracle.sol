// SPDX‑License‑Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IOracle.sol";

/**
 * @title MockOracle - Oracle para la tasa COP/USD
 */
contract MockOracle is IOracle {
    // Valor por defecto: 4200 COP = 1 USD, con 18 decimales
    uint256 private _usdToCopRate = 4200e18;
    
    // Factor de conversión para mantener los 18 decimales al convertir
    uint256 private constant PRICE_PRECISION = 1e18;
    
    /// @notice Establece una nueva tasa COP/USD para pruebas
    /// @param newRate Nueva tasa (ej: 4200e18 significa 4200 COP = 1 USD)
    function setUsdToCopRate(uint256 newRate) external {
        require(newRate > 0, "Rate must be positive");
        _usdToCopRate = newRate;
    }
    
    /// @notice Retorna el precio de la stablecoin en USD (normalmente 1 USD)
    /// @return Precio en USD con 18 decimales
    function getPrice() external view override returns (uint256) {
        // Si la tasa es menor a 4200 (ej: 4000 COP/USD), el token vale más de 1 USD
        // Si la tasa es mayor a 4200 (ej: 4400 COP/USD), el token vale menos de 1 USD
        
        // Base: 4200e18 COP = 1e18 USD
        // Ejemplo: si ahora 4000e18 COP = 1e18 USD, entonces 1 aUSD = (4200/4000) USD = 1.05 USD
        
        // Convertir usando regla de tres: precio = (tasa base / tasa actual) * PRECISION
        uint256 baseRate = 4200e18; // Tasa base oficial
        return (baseRate * PRICE_PRECISION) / _usdToCopRate;
    }
    
    /// @notice Obtiene la tasa de cambio actual
    /// @return Tasa COP/USD con 18 decimales
    function getUsdToCopRate() external view returns (uint256) {
        return _usdToCopRate;
    }
} 