// SPDX‑License‑Identifier: MIT
pragma solidity ^0.8.24;

interface IOracle {
    /// @return Price con 18 decimales (1e18 = 1 USD).
    function getPrice() external view returns (uint256);
}