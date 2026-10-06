// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title TestUSDG — a stand-in for USDG on Robinhood Chain testnet.
/// @notice USDG has no testnet faucet, so the league deploys this 6-decimal
///         token for tickets. Anyone can take 50 tUSDG from the faucet once an
///         hour; minters (the owner and the test savings vault) can mint.
///         Testnet only: it has no value.
contract TestUSDG {
    string public constant name = "Test Global Dollar";
    string public constant symbol = "tUSDG";
    uint8 public constant decimals = 6;
    uint256 public constant FAUCET_AMOUNT = 50e6;
    uint256 public constant FAUCET_EVERY = 1 hours;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public minter;
    mapping(address => uint256) public lastFaucet;
    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error NotMinter();
    error TooSoon(uint256 nextAt);

    constructor() {
        owner = msg.sender;
        minter[msg.sender] = true;
    }

    function setMinter(address who, bool on) external {
        if (msg.sender != owner) revert NotMinter();
        minter[who] = on;
    }

    function mint(address to, uint256 amount) external {
        if (!minter[msg.sender]) revert NotMinter();
        _mint(to, amount);
    }

    /// @notice 50 tUSDG to the caller, once an hour.
    function faucet() external {
        uint256 next = lastFaucet[msg.sender] + FAUCET_EVERY;
        if (lastFaucet[msg.sender] != 0 && block.timestamp < next) revert TooSoon(next);
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
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

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

/// @title TestSavingsVault — a stand-in for Robinhood Earn (Morpho USDG vault).
/// @notice Minimal ERC-4626 over TestUSDG that accrues a fixed APY by minting
///         interest to itself (it must be a TestUSDG minter). Testnet only.
contract TestSavingsVault {
    TestUSDG public immutable usdg;
    uint256 public immutable aprBps; // e.g. 500 = 5% a year
    uint256 public lastAccrual;

    string public constant name = "Test Savings tUSDG";
    string public constant symbol = "stUSDG";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor(TestUSDG usdg_, uint256 aprBps_) {
        usdg = usdg_;
        aprBps = aprBps_;
        lastAccrual = block.timestamp;
    }

    function asset() external view returns (address) {
        return address(usdg);
    }

    function totalAssets() public view returns (uint256) {
        uint256 bal = usdg.balanceOf(address(this));
        return bal + (bal * aprBps * (block.timestamp - lastAccrual)) / (10_000 * 365 days);
    }

    function accrue() public {
        uint256 bal = usdg.balanceOf(address(this));
        uint256 interest = (bal * aprBps * (block.timestamp - lastAccrual)) / (10_000 * 365 days);
        lastAccrual = block.timestamp;
        if (interest > 0) usdg.mint(address(this), interest);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return totalSupply == 0 ? shares : (shares * totalAssets()) / totalSupply;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        accrue();
        uint256 ta = usdg.balanceOf(address(this));
        shares = totalSupply == 0 || ta == 0 ? assets : (assets * totalSupply) / ta;
        require(usdg.transferFrom(msg.sender, address(this), assets), "transfer");
        totalSupply += shares;
        balanceOf[receiver] += shares;
    }

    function redeem(uint256 shares, address receiver, address owner_) external returns (uint256 assets) {
        require(msg.sender == owner_, "owner");
        accrue();
        assets = (shares * usdg.balanceOf(address(this))) / totalSupply;
        balanceOf[owner_] -= shares;
        totalSupply -= shares;
        require(usdg.transfer(receiver, assets), "transfer");
    }
}
