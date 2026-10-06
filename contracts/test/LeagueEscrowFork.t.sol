// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LeagueEscrow} from "../src/LeagueEscrow.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

/// Runs the escrow against REAL Robinhood Chain mainnet tokens on a fork: can
/// Robinhood Stock Tokens and USDG be locked in a fresh contract and returned?
///
///   RH_FORK_URL=https://rpc.mainnet.chain.robinhood.com forge test --match-contract LeagueEscrowFork -vv
///
/// Skipped when RH_FORK_URL is not set.
contract LeagueEscrowForkTest is Test {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;

    LeagueEscrow escrow;
    address creator = makeAddr("creator");
    bool forked;

    function setUp() public {
        string memory rpc = vm.envOr("RH_FORK_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;
        escrow = new LeagueEscrow(USDG, address(this));
        escrow.setTokenAllowed(NVDA, true);
        escrow.setTokenAllowed(MSFT, true);
        escrow.setTokenAllowed(TSLA, true);
    }

    function test_realStockTokensLockAndReturn() public {
        if (!forked) return;
        uint64 close = uint64(block.timestamp + 1 hours);
        uint256 roundId = escrow.openRound(close, close + 1 hours, 5e6, 100, 20);

        address[3] memory toks = [NVDA, MSFT, TSLA];
        address[] memory t = new address[](3);
        uint256[] memory a = new uint256[](3);
        for (uint256 i; i < 3; ++i) {
            t[i] = toks[i];
            a[i] = 0.01e18;
            deal(toks[i], creator, 0.01e18);
        }
        deal(USDG, creator, 5e6);

        vm.startPrank(creator);
        IERC20(USDG).approve(address(escrow), type(uint256).max);
        for (uint256 i; i < 3; ++i) IERC20(toks[i]).approve(address(escrow), type(uint256).max);
        escrow.enterCreator(roundId, keccak256("basket"), t, a);
        vm.stopPrank();

        for (uint256 i; i < 3; ++i) {
            assertEq(IERC20(toks[i]).balanceOf(address(escrow)), 0.01e18, "locked");
        }

        escrow.voidRound(roundId);
        vm.prank(creator);
        escrow.claim(roundId);
        for (uint256 i; i < 3; ++i) {
            assertEq(IERC20(toks[i]).balanceOf(creator), 0.01e18, "returned");
        }
        assertEq(IERC20(USDG).balanceOf(creator), 5e6, "stake refunded");
    }
}
