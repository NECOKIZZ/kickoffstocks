// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title TestToken — testnet stand-ins for the crypto slice (WBTC, WETH).
/// @notice Robinhood Chain testnet has no WBTC with a faucet, so the league
///         deploys its own: anyone can take `faucetAmount` once an hour.
///         Testnet only: it has no value. Rounds price it with the mainnet
///         Chainlink feed of the real token.
contract TestToken {
    uint256 public constant FAUCET_EVERY = 1 hours;

    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public immutable faucetAmount;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public lastFaucet;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error TooSoon(uint256 nextAt);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 faucetAmount_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        faucetAmount = faucetAmount_;
    }

    /// @notice `faucetAmount` to the caller, once an hour.
    function faucet() external {
        uint256 next = lastFaucet[msg.sender] + FAUCET_EVERY;
        if (lastFaucet[msg.sender] != 0 && block.timestamp < next) revert TooSoon(next);
        lastFaucet[msg.sender] = block.timestamp;
        totalSupply += faucetAmount;
        balanceOf[msg.sender] += faucetAmount;
        emit Transfer(address(0), msg.sender, faucetAmount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            require(a >= amount, "allowance");
            allowance[from][msg.sender] = a - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
