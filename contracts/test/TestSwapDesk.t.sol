// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/TestSwapDesk.sol";
import "../src/TestUSDG.sol";
import "../src/TestToken.sol";

contract TestSwapDeskTest is Test {
    TestUSDG usdg;
    TestToken tsla;
    TestToken amd;
    TestSwapDesk desk;
    uint256 quoterKey = 0xA11CE;
    address taker = address(0xB0B);
    address creator = address(0xC0FFEE);

    function setUp() public {
        vm.warp(1_000_000);
        usdg = new TestUSDG();
        tsla = new TestToken("Tesla", "TSLA", 18, 5e18);
        amd = new TestToken("AMD", "AMD", 18, 5e18);
        desk = new TestSwapDesk(IERC20Like(address(usdg)), vm.addr(quoterKey));
        desk.refill(address(tsla));
        desk.refill(address(amd));
        usdg.mint(taker, 100e6);
        vm.prank(taker);
        usdg.approve(address(desk), type(uint256).max);
    }

    function _quote(uint256 fee) internal view returns (TestSwapDesk.Quote memory q) {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tsla);
        tokens[1] = address(amd);
        uint256[] memory outs = new uint256[](2);
        outs[0] = 0.015e18;
        outs[1] = 0.03e18;
        q = TestSwapDesk.Quote(taker, tokens, outs, 12e6 - fee, creator, fee, block.timestamp + 10 minutes, keccak256("n1"));
    }

    function _sign(TestSwapDesk.Quote memory q, uint256 key) internal view returns (bytes memory) {
        bytes32 h = desk.quoteHash(q);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h)));
        return abi.encodePacked(r, s, v);
    }

    function test_buysTheWholeBasketInOneTx() public {
        TestSwapDesk.Quote memory q = _quote(0.12e6);
        bytes memory sig = _sign(q, quoterKey);
        vm.prank(taker);
        desk.buy(q, sig);
        assertEq(tsla.balanceOf(taker), 0.015e18);
        assertEq(amd.balanceOf(taker), 0.03e18);
        assertEq(usdg.balanceOf(taker), 88e6);
        assertEq(usdg.balanceOf(creator), 0.12e6);
        assertEq(usdg.balanceOf(address(desk)), 11.88e6);
    }

    function test_rejectsReplayWrongSignerOtherTakerAndExpired() public {
        TestSwapDesk.Quote memory q = _quote(0);
        bytes memory sig = _sign(q, quoterKey);
        vm.prank(taker);
        desk.buy(q, sig);
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(TestSwapDesk.BadQuote.selector, "used"));
        desk.buy(q, sig);

        q.nonce = keccak256("n2");
        bytes memory bad = _sign(q, 0xBAD);
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(TestSwapDesk.BadQuote.selector, "signature"));
        desk.buy(q, bad);

        sig = _sign(q, quoterKey);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(TestSwapDesk.BadQuote.selector, "taker"));
        desk.buy(q, sig);

        q.amountsOut[0] = 1e18; // tampered after signing
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(TestSwapDesk.BadQuote.selector, "signature"));
        desk.buy(q, sig);

        q.amountsOut[0] = 0.015e18;
        vm.warp(q.deadline + 1);
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(TestSwapDesk.BadQuote.selector, "expired"));
        desk.buy(q, sig);
    }

    function test_revertsWhenInventoryRunsOut() public {
        TestSwapDesk.Quote memory q = _quote(0);
        q.amountsOut[1] = 6e18;
        bytes memory sig = _sign(q, quoterKey);
        vm.prank(taker);
        vm.expectRevert(bytes("balance"));
        desk.buy(q, sig);
    }

    function test_ownerOnly() public {
        vm.prank(taker);
        vm.expectRevert(TestSwapDesk.NotOwner.selector);
        desk.setQuoter(taker);
        vm.prank(taker);
        vm.expectRevert(TestSwapDesk.NotOwner.selector);
        desk.withdraw(address(tsla), taker, 1);
        desk.withdraw(address(tsla), taker, 1e18);
        assertEq(tsla.balanceOf(taker), 1e18);
    }
}
