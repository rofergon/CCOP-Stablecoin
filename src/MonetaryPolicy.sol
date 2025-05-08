// SPDX‑License‑Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AlgorithmicStablecoin.sol";
import "./interfaces/IOracle.sol";

/**
 * @title MonetaryPolicy — decide cuánto re‑basar en cada época.
 * Estrategia: TWAP ≥ 1.05 COP ⇒ expandir 1%; TWAP ≤ 0.97 COP ⇒ contraer 1%.
 */
contract MonetaryPolicy is Ownable {
    uint256 public constant EPOCH_DURATION = 2 hours;
    uint256 public constant PERCENT = 1e4; // 100.00 %

    AlgorithmicStablecoin public immutable token;
    IOracle               public oracle;
    uint256 public lastEpochStart;

    constructor(AlgorithmicStablecoin _token, IOracle _oracle) Ownable(msg.sender) {
        token = _token;
        oracle = _oracle;
        lastEpochStart = block.timestamp;
    }

    function setOracle(IOracle _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function executeEpoch() external {
        require(block.timestamp >= lastEpochStart + EPOCH_DURATION, "epoch not ended");
        lastEpochStart = block.timestamp;

        uint256 price = oracle.getPrice(); // 1e18 = 1 COP
        int256 delta;

        if (price > 1.05e18) {
            delta = int256(token.totalSupply() / 100); // +1 %
        } else if (price < 0.97e18) {
            delta = -int256(token.totalSupply() / 100); // −1 %
        } else {
            delta = 0;
        }

        token.rebase(block.timestamp, delta);
    }
}