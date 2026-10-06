// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LeagueEscrow} from "../src/LeagueEscrow.sol";
import {TestUSDG, TestSavingsVault} from "../src/TestUSDG.sol";
import {MockToken} from "./LeagueEscrow.t.sol";

/// Tickets parked in a savings vault while the round runs.
contract TicketYieldTest is Test {
    LeagueEscrow internal escrow;
    TestUSDG internal usdg;
    TestSavingsVault internal vault;
    MockToken internal nvda;
    MockToken internal tsla;
    MockToken internal aapl;

    address internal owner = makeAddr("owner");
    address internal keeper = makeAddr("keeper");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal stranger = makeAddr("stranger");

    uint128 internal constant STAKE = 5e6; // $5 in 6-decimal USDG
    uint64 internal constant CLOSE = 1_000;
    uint64 internal constant END = CLOSE + 7 days;
    uint256 internal roundId;

    function setUp() public {
        vm.warp(1);
        vm.startPrank(owner);
        usdg = new TestUSDG();
        vault = new TestSavingsVault(usdg, 1000); // 10% a year
        usdg.setMinter(address(vault), true);
        escrow = new LeagueEscrow(address(usdg), keeper);
        nvda = new MockToken("NVDA");
        tsla = new MockToken("TSLA");
        aapl = new MockToken("AAPL");
        escrow.setTokenAllowed(address(nvda), true);
        escrow.setTokenAllowed(address(tsla), true);
        escrow.setTokenAllowed(address(aapl), true);
        escrow.setYieldVault(address(vault));
        vm.stopPrank();
        vm.prank(keeper);
        roundId = escrow.openRound(CLOSE, END, STAKE, 100, 20);
        _enter(alice, keccak256("A"));
        _enter(bob, keccak256("B"));
    }

    function _enter(address who, bytes32 key) internal {
        vm.prank(owner);
        usdg.mint(who, STAKE);
        nvda.mint(who, 1e18);
        tsla.mint(who, 1e18);
        aapl.mint(who, 1e18);
        address[] memory t = new address[](3);
        uint256[] memory a = new uint256[](3);
        (t[0], t[1], t[2]) = (address(nvda), address(tsla), address(aapl));
        (a[0], a[1], a[2]) = (1e18, 1e18, 1e18);
        vm.startPrank(who);
        usdg.approve(address(escrow), type(uint256).max);
        nvda.approve(address(escrow), type(uint256).max);
        tsla.approve(address(escrow), type(uint256).max);
        aapl.approve(address(escrow), type(uint256).max);
        escrow.enterCreator(roundId, key, t, a);
        vm.stopPrank();
    }

    function _round() internal view returns (uint128 parkedShares, uint128 yield_) {
        (,,,,,,,, parkedShares, yield_) = escrow.rounds(roundId);
    }

    function _parkAndRun() internal returns (uint128 yield_) {
        vm.warp(CLOSE);
        vm.prank(keeper);
        escrow.parkTickets(roundId);
        assertEq(usdg.balanceOf(address(escrow)), 0);
        vm.warp(END);
        vm.prank(keeper);
        escrow.unparkTickets(roundId);
        (, yield_) = _round();
    }

    function test_parkOnlyAfterEntriesClose() public {
        vm.prank(keeper);
        vm.expectRevert(LeagueEscrow.TooEarly.selector);
        escrow.parkTickets(roundId);
        vm.warp(CLOSE);
        vm.prank(stranger);
        vm.expectRevert(LeagueEscrow.NotKeeper.selector);
        escrow.parkTickets(roundId);
    }

    function test_interestGoesIntoThePot() public {
        uint128 y = _parkAndRun();
        // 10 USDG for a week at 10% a year ≈ 0.019 USDG
        assertApproxEqAbs(uint256(y), uint256(10e6 * 1000 * 7 days) / (10_000 * 365 days), 2);
        assertEq(usdg.balanceOf(address(escrow)), 10e6 + y);
        // Winner takes the loser's ticket (less a 10% take) plus the interest.
        uint128[] memory p = new uint128[](2);
        p[0] = STAKE + 4_500_000 + y;
        p[1] = 0;
        vm.prank(keeper);
        escrow.settle(roundId, p, 250_000, 250_000, 0, bytes32(0));
        vm.prank(alice);
        escrow.claim(roundId);
        assertEq(usdg.balanceOf(alice), STAKE + 4_500_000 + y);
    }

    function test_settleNeedsTheTicketsBackAndCountsTheYield() public {
        vm.warp(CLOSE);
        vm.prank(keeper);
        escrow.parkTickets(roundId);
        vm.warp(END);
        uint128[] memory p = new uint128[](2);
        (p[0], p[1]) = (STAKE, STAKE);
        vm.prank(keeper);
        vm.expectRevert(LeagueEscrow.Parked.selector);
        escrow.settle(roundId, p, 0, 0, 0, bytes32(0));
        vm.prank(keeper);
        escrow.unparkTickets(roundId);
        // Ignoring the yield breaks conservation.
        vm.prank(keeper);
        vm.expectRevert(LeagueEscrow.NotConserved.selector);
        escrow.settle(roundId, p, 0, 0, 0, bytes32(0));
    }

    function test_anyoneCanBringTicketsBackAfterTheEnd() public {
        vm.warp(CLOSE);
        vm.prank(keeper);
        escrow.parkTickets(roundId);
        vm.prank(stranger);
        vm.expectRevert(LeagueEscrow.TooEarly.selector);
        escrow.unparkTickets(roundId);
        vm.warp(END);
        vm.prank(stranger);
        escrow.unparkTickets(roundId);
        (uint128 shares,) = _round();
        assertEq(shares, 0);
    }

    function test_voidRefundsStakesAndSendsInterestToTheSeasonPot() public {
        uint128 y = _parkAndRun();
        vm.warp(END + escrow.VOID_GRACE());
        vm.prank(stranger);
        escrow.voidRound(roundId);
        assertEq(escrow.seasonPot(), y);
        vm.prank(alice);
        escrow.claim(roundId);
        assertEq(usdg.balanceOf(alice), STAKE);
        assertEq(nvda.balanceOf(alice), 1e18);
    }

    function test_cannotVoidWhileParked() public {
        vm.warp(CLOSE);
        vm.prank(keeper);
        escrow.parkTickets(roundId);
        vm.prank(keeper);
        vm.expectRevert(LeagueEscrow.Parked.selector);
        escrow.voidRound(roundId);
    }

    function test_vaultCannotChangeWhileTicketsAreParked() public {
        vm.warp(CLOSE);
        vm.prank(keeper);
        escrow.parkTickets(roundId);
        vm.prank(owner);
        vm.expectRevert(LeagueEscrow.VaultBusy.selector);
        escrow.setYieldVault(address(0));
    }

    function test_rejectsAVaultForAnotherToken() public {
        TestUSDG other = new TestUSDG();
        TestSavingsVault wrong = new TestSavingsVault(other, 100);
        vm.warp(CLOSE);
        vm.prank(owner);
        vm.expectRevert(LeagueEscrow.BadVault.selector);
        escrow.setYieldVault(address(wrong));
    }

    function test_lockedStocksNeverMove() public {
        _parkAndRun();
        assertEq(nvda.balanceOf(address(escrow)), 2e18);
        assertEq(tsla.balanceOf(address(escrow)), 2e18);
    }
}

/// A vault that loses money: the loss is covered by the season pot first.
contract LossyVault {
    TestUSDG public immutable usdg;
    uint256 public held;

    constructor(TestUSDG u) {
        usdg = u;
    }

    function asset() external view returns (address) {
        return address(usdg);
    }

    function deposit(uint256 assets, address) external returns (uint256) {
        usdg.transferFrom(msg.sender, address(this), assets);
        held = assets;
        return assets;
    }

    function redeem(uint256, address receiver, address) external returns (uint256 out) {
        out = held - 1e6; // lose $1
        usdg.transfer(receiver, out);
    }
}

contract TicketYieldLossTest is TicketYieldTest {
    function test_lossIsCoveredBySeasonPot() public {
        LossyVault lossy = new LossyVault(usdg);
        vm.startPrank(owner);
        escrow.setYieldVault(address(lossy));
        usdg.mint(owner, 3e6);
        usdg.approve(address(escrow), 3e6);
        escrow.fundSeason(3e6);
        vm.stopPrank();
        vm.warp(CLOSE);
        vm.prank(keeper);
        escrow.parkTickets(roundId);
        vm.warp(END);
        vm.prank(keeper);
        escrow.unparkTickets(roundId);
        assertEq(escrow.seasonPot(), 2e6);
        assertEq(usdg.balanceOf(address(escrow)), 10e6 + 2e6);
    }
}
