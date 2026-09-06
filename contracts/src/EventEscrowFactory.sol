// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EventEscrow} from "./EventEscrow.sol";

contract EventEscrowFactory {
  event EscrowCreated(
    address indexed escrow,
    address indexed host,
    uint256 startTime,
    uint256 endTime
  );

  address[] public allEscrows;

  function createEscrow(
    uint256 startTime,
    uint256 endTime
  ) external returns (address escrow) {
    EventEscrow newEscrow = new EventEscrow(
      msg.sender,
      startTime,
      endTime,
      address(this)
    );

    escrow = address(newEscrow);

    allEscrows.push(escrow);

    emit EscrowCreated(escrow, msg.sender, startTime, endTime);
  }

  function escrowCount() external view returns (uint256) {
    return allEscrows.length;
  }
}
