// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

interface IFaucetToken {
    function faucet() external;
}

/// @title TestSwapDesk — "Buy the basket" on Robinhood Chain testnet.
/// @notice 0x doesn't serve the testnet, so the league runs this RFQ desk in
///         its place: the app quotes the whole basket at the live (mainnet
///         Chainlink) prices, the quoter signs the quote, and the taker swaps
///         test USDG for every stock in one transaction. The desk sells from
///         its own inventory (stock tokens from Robinhood's faucet, the
///         league's tWBTC / tWETH). Like 0x's integrator fee, a quote can pay
///         an ETF creator a cut of the USDG. Testnet only: it has no value.
contract TestSwapDesk {
    struct Quote {
        address taker;
        address[] tokens;
        uint256[] amountsOut;
        uint256 usdgIn; // paid to the desk
        address feeRecipient;
        uint256 fee; // paid to feeRecipient, on top of usdgIn
        uint256 deadline;
        bytes32 nonce;
    }

    IERC20Like public immutable usdg;
    address public owner;
    address public quoter;
    mapping(bytes32 => bool) public used;

    event Bought(address indexed taker, bytes32 indexed nonce, address[] tokens, uint256[] amountsOut, uint256 usdgIn, address feeRecipient, uint256 fee);
    event QuoterSet(address quoter);

    error NotOwner();
    error BadQuote(string why);

    constructor(IERC20Like usdg_, address quoter_) {
        usdg = usdg_;
        owner = msg.sender;
        quoter = quoter_;
        emit QuoterSet(quoter_);
    }

    /// @notice The digest the quoter signs (EIP-191 personal message over it).
    function quoteHash(Quote calldata q) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), q.taker, q.tokens, q.amountsOut, q.usdgIn, q.feeRecipient, q.fee, q.deadline, q.nonce));
    }

    /// @notice Pay `usdgIn` (+ `fee` to the creator) and receive every token of the quote.
    function buy(Quote calldata q, bytes calldata sig) external {
        if (msg.sender != q.taker) revert BadQuote("taker");
        if (block.timestamp > q.deadline) revert BadQuote("expired");
        if (q.tokens.length == 0 || q.tokens.length != q.amountsOut.length) revert BadQuote("legs");
        bytes32 h = quoteHash(q);
        if (used[h]) revert BadQuote("used");
        if (_recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h)), sig) != quoter) revert BadQuote("signature");
        used[h] = true;

        require(usdg.transferFrom(msg.sender, address(this), q.usdgIn), "usdg");
        if (q.fee > 0) require(usdg.transferFrom(msg.sender, q.feeRecipient, q.fee), "fee");
        for (uint256 i; i < q.tokens.length; i++) {
            require(IERC20Like(q.tokens[i]).transfer(msg.sender, q.amountsOut[i]), "inventory");
        }
        emit Bought(msg.sender, q.nonce, q.tokens, q.amountsOut, q.usdgIn, q.feeRecipient, q.fee);
    }

    /// @notice Top up from a test token's own faucet (tWBTC / tWETH). Anyone may call.
    function refill(address token) external {
        IFaucetToken(token).faucet();
    }

    function setQuoter(address quoter_) external {
        if (msg.sender != owner) revert NotOwner();
        quoter = quoter_;
        emit QuoterSet(quoter_);
    }

    function withdraw(address token, address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        require(IERC20Like(token).transfer(to, amount), "transfer");
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        if (v < 27) v += 27;
        // Reject malleable signatures (upper half of s).
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
