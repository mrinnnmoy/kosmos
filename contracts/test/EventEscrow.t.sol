// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EventEscrow} from "../src/EventEscrow.sol";
import {EventEscrowFactory} from "../src/EventEscrowFactory.sol";

contract EventEscrowTest is Test {
  EventEscrowFactory factory;
  EventEscrow escrow;

  address host = makeAddr("host");
  address alice = makeAddr("alice");
  address bob = makeAddr("bob");

  uint256 startTime;
  uint256 endTime;

  function setUp() public {
    factory = new EventEscrowFactory();

    startTime = block.timestamp + 1 days;
    endTime = block.timestamp + 2 days;

    vm.prank(host);
    address escrowAddr = factory.createEscrow(startTime, endTime);
    escrow = EventEscrow(escrowAddr);

    vm.deal(alice, 10 ether);
    vm.deal(bob, 10 ether);
  }

  // ── deposit ──────────────────────────────────────────

  function test_Deposit() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);

    assertEq(escrow.deposits(alice), 1 ether);
    assertEq(
      uint256(escrow.statusOf(alice)),
      uint256(EventEscrow.DepositStatus.Pending)
    );
  }

  function test_RevertWhen_DoubleDeposit() public {
    vm.startPrank(alice);
    escrow.deposit{value: 1 ether}(alice);
    vm.expectRevert(EventEscrow.InvalidState.selector);
    escrow.deposit{value: 1 ether}(alice);
    vm.stopPrank();
  }

  // ── denial refund ────────────────────────────────────

  function test_DenialRefund() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);

    uint256 balanceBefore = alice.balance;

    vm.prank(host);
    escrow.refund(alice);

    assertEq(alice.balance, balanceBefore + 1 ether);
    assertEq(escrow.deposits(alice), 0);
    assertEq(
      uint256(escrow.statusOf(alice)),
      uint256(EventEscrow.DepositStatus.Denied)
    );
  }

  function test_RevertWhen_NonHostRefunds() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);

    vm.prank(bob);
    vm.expectRevert();
    escrow.refund(alice);
  }

  // ── approval lock ────────────────────────────────────

  function test_ApprovalLock() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);

    vm.prank(host);
    escrow.release(alice);

    assertEq(
      uint256(escrow.statusOf(alice)),
      uint256(EventEscrow.DepositStatus.Approved)
    );
  }

  // ── cancellation refund ──────────────────────────────

  function test_CancellationRefund() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);
    vm.prank(host);
    escrow.release(alice);

    uint256 balanceBefore = alice.balance;

    vm.prank(alice);
    escrow.cancelByAttendee();

    assertEq(alice.balance, balanceBefore + 1 ether);
    assertEq(
      uint256(escrow.statusOf(alice)),
      uint256(EventEscrow.DepositStatus.Cancelled)
    );
  }

  function test_RevertWhen_CancelAfterEventStart() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);
    vm.prank(host);
    escrow.release(alice);

    vm.warp(startTime + 1);

    vm.prank(alice);
    vm.expectRevert(EventEscrow.TooLateToCancel.selector);
    escrow.cancelByAttendee();
  }

  // ── end-event payout ─────────────────────────────────

  function test_EndEventPayout() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);
    vm.prank(host);
    escrow.release(alice);

    vm.prank(bob);
    escrow.deposit{value: 2 ether}(bob);
    vm.prank(host);
    escrow.release(bob);

    vm.warp(endTime + 1);
    vm.prank(host);
    escrow.endEvent();

    uint256 hostBalanceBefore = host.balance;

    address[] memory attendees = new address[](2);
    attendees[0] = alice;
    attendees[1] = bob;

    vm.prank(host);
    escrow.batchPayout(attendees);

    assertEq(host.balance, hostBalanceBefore + 3 ether);
    assertEq(
      uint256(escrow.statusOf(alice)),
      uint256(EventEscrow.DepositStatus.Paid)
    );
    assertEq(
      uint256(escrow.statusOf(bob)),
      uint256(EventEscrow.DepositStatus.Paid)
    );
  }

  function test_RevertWhen_PayoutBeforeEventEnded() public {
    vm.prank(alice);
    escrow.deposit{value: 1 ether}(alice);
    vm.prank(host);
    escrow.release(alice);

    address[] memory attendees = new address[](1);
    attendees[0] = alice;

    vm.prank(host);
    vm.expectRevert(EventEscrow.EventNotEnded.selector);
    escrow.batchPayout(attendees);
  }
}
