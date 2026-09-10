// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {Test} from "forge-std/Test.sol";
import {TicketNFT} from "../src/TicketNFT.sol";
import {EventEscrow} from "../src/EventEscrow.sol";
import {EventEscrowFactory} from "../src/EventEscrowFactory.sol";

contract TicketNFTTest is Test {
    TicketNFT ticketNFT;
    EventEscrowFactory factory;
    EventEscrow escrow;

    address host = makeAddr("host");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 startTime;
    uint256 endTime;

    function setUp() public {
        ticketNFT = new TicketNFT(address(this));
        factory = new EventEscrowFactory(address(ticketNFT));
        ticketNFT.setFactory(address(factory));

        startTime = block.timestamp + 1 days;
        endTime = block.timestamp + 2 days;

        vm.prank(host);
        escrow = EventEscrow(payable(factory.createEscrow(startTime, endTime)));

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);

        vm.prank(alice);
        escrow.deposit{value: 1 ether}(alice);

        vm.prank(host);
        escrow.release(alice);

        vm.prank(bob);
        escrow.deposit{value: 1 ether}(bob);

        vm.prank(host);
        escrow.release(bob);

        vm.warp(endTime + 1);

        vm.prank(host);
        escrow.endEvent();
    }

    function test_MintOnlyForCheckedInWallets() public {
        // Only Alice checked in. Bob was a no-show.
        address[] memory checkedIn = new address[](1);
        checkedIn[0] = alice;

        vm.prank(host);
        escrow.mintTickets(checkedIn, "QmFakeMetadataCID");

        assertEq(ticketNFT.balanceOf(alice), 1);
        assertEq(ticketNFT.balanceOf(bob), 0);
        assertEq(ticketNFT.ownerOf(1), alice);
        assertEq(ticketNFT.tokenURI(1), "ipfs://QmFakeMetadataCID");
    }

    function test_RevertWhen_DirectMintByNonEscrow() public {
        vm.expectRevert(TicketNFT.NotAuthorizedMinter.selector);

        ticketNFT.mint(alice, "QmFakeMetadataCID");
    }

    function test_RevertWhen_MintBeforeEventEnded() public {
        vm.prank(host);

        address freshEscrowAddr = factory.createEscrow(block.timestamp + 1 days, block.timestamp + 2 days);

        EventEscrow freshEscrow = EventEscrow(payable(freshEscrowAddr));

        address[] memory checkedIn = new address[](1);
        checkedIn[0] = alice;

        vm.prank(host);

        vm.expectRevert(EventEscrow.EventNotEnded.selector);

        freshEscrow.mintTickets(checkedIn, "QmFakeMetadataCID");
    }

    function test_RevertWhen_NonHostCallsMintTickets() public {
        address[] memory checkedIn = new address[](1);
        checkedIn[0] = alice;

        vm.prank(bob);

        vm.expectRevert();

        escrow.mintTickets(checkedIn, "QmFakeMetadataCID");
    }
}
