// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {EventEscrow} from "./EventEscrow.sol";

contract EventEscrowFactory {
    address public immutable ticketNFT;

    address[] public allEscrows;
    mapping(address => bool) public isEscrow;

    event EscrowCreated(address indexed escrow, address indexed host, uint256 startTime, uint256 endTime);

    constructor(address _ticketNFT) {
        ticketNFT = _ticketNFT;
    }

    function createEscrow(uint256 startTime, uint256 endTime) external returns (address escrow) {
        EventEscrow newEscrow = new EventEscrow(msg.sender, startTime, endTime, address(this), ticketNFT);

        escrow = address(newEscrow);

        allEscrows.push(escrow);
        isEscrow[escrow] = true;

        emit EscrowCreated(escrow, msg.sender, startTime, endTime);
    }

    function escrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
