// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/TestToken.sol";

contract TestTokenTest is Test {
    TestToken btc;

    function setUp() public {
        btc = new TestToken("Test Wrapped BTC", "tWBTC", 8, 0.001e8);
        vm.warp(1_000_000);
    }

    function test_faucetOncePerHour() public {
        address a = address(0xA11CE);
        vm.prank(a);
        btc.faucet();
        assertEq(btc.balanceOf(a), 0.001e8);
        assertEq(btc.decimals(), 8);
        vm.prank(a);
        vm.expectRevert(abi.encodeWithSelector(TestToken.TooSoon.selector, block.timestamp + 1 hours));
        btc.faucet();
        vm.warp(block.timestamp + 1 hours);
        vm.prank(a);
        btc.faucet();
        assertEq(btc.balanceOf(a), 0.002e8);
    }

    function test_transferFrom() public {
        address a = address(0xA11CE);
        vm.prank(a);
        btc.faucet();
        vm.prank(a);
        btc.approve(address(this), 0.0004e8);
        btc.transferFrom(a, address(0xB0B), 0.0004e8);
        assertEq(btc.balanceOf(address(0xB0B)), 0.0004e8);
        vm.expectRevert(bytes("allowance"));
        btc.transferFrom(a, address(0xB0B), 1);
    }
}
