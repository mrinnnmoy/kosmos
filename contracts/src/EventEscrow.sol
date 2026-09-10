// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITicketNFT} from "./interfaces/ITicketNFT.sol";

contract EventEscrow is Ownable, ReentrancyGuard {
    enum DepositStatus {
        None,
        Pending,
        Approved,
        Denied,
        Cancelled,
        Paid
    }

    address public immutable factory;
    address public immutable ticketNFT;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    bool public eventEnded;
    uint256 public unallocatedBalance;

    mapping(address => uint256) public deposits;
    mapping(address => DepositStatus) public statusOf;

    event Deposited(address indexed attendee, uint256 amount);
    event Refunded(address indexed attendee, uint256 amount, DepositStatus reason);
    event Released(address indexed attendee);
    event EventEnded();
    event PaidOut(address indexed attendee, uint256 amount);

    error InvalidState();
    error EventNotEnded();
    error EventAlreadyEnded();
    error TooLateToCancel();
    error NoDeposit();
    error InsufficientUnallocatedBalance();
    error TransferFailed();

    constructor(address host, uint256 _startTime, uint256 _endTime, address _factory, address _ticketNFT)
        Ownable(host)
    {
        require(_startTime < _endTime, "start must be before end");

        startTime = _startTime;
        endTime = _endTime;
        factory = _factory;
        ticketNFT = _ticketNFT;
    }

    /// @notice Accepts native ETH sent directly by payment routes such as Uniswap.
    /// The attendee association is recorded separately after payment verification.
    receive() external payable {
        if (msg.value == 0) revert NoDeposit();

        unallocatedBalance += msg.value;
    }

    /// @notice Associates previously received native ETH with an attendee.
    /// Used after the payment has been independently verified.
    function recordDeposit(address attendee, uint256 amount) external onlyOwner {
        if (amount == 0) revert NoDeposit();
        if (statusOf[attendee] != DepositStatus.None) {
            revert InvalidState();
        }
        if (amount > unallocatedBalance) {
            revert InsufficientUnallocatedBalance();
        }

        unallocatedBalance -= amount;
        deposits[attendee] = amount;
        statusOf[attendee] = DepositStatus.Pending;

        emit Deposited(attendee, amount);
    }

    /// @notice Records a deposit for an attendee.
    /// Anyone can fund an attendee's deposit.
    function deposit(address attendee) external payable {
        if (msg.value == 0) revert NoDeposit();
        if (statusOf[attendee] != DepositStatus.None) {
            revert InvalidState();
        }

        deposits[attendee] = msg.value;
        statusOf[attendee] = DepositStatus.Pending;

        emit Deposited(attendee, msg.value);
    }

    /// @notice Host denies a pending request and refunds the attendee.
    function refund(address attendee) external onlyOwner nonReentrant {
        if (statusOf[attendee] != DepositStatus.Pending) {
            revert InvalidState();
        }

        uint256 amount = deposits[attendee];

        deposits[attendee] = 0;
        statusOf[attendee] = DepositStatus.Denied;

        _send(attendee, amount);

        emit Refunded(attendee, amount, DepositStatus.Denied);
    }

    /// @notice Host approves a pending request.
    function release(address attendee) external onlyOwner {
        if (statusOf[attendee] != DepositStatus.Pending) {
            revert InvalidState();
        }

        statusOf[attendee] = DepositStatus.Approved;

        emit Released(attendee);
    }

    /// @notice Attendee cancels their approved spot before the event starts.
    function cancelByAttendee() external nonReentrant {
        address attendee = msg.sender;

        if (statusOf[attendee] != DepositStatus.Approved) {
            revert InvalidState();
        }

        if (block.timestamp >= startTime) {
            revert TooLateToCancel();
        }

        uint256 amount = deposits[attendee];

        deposits[attendee] = 0;
        statusOf[attendee] = DepositStatus.Cancelled;

        _send(attendee, amount);

        emit Refunded(attendee, amount, DepositStatus.Cancelled);
    }

    /// @notice Host marks the event as ended.
    function endEvent() external onlyOwner {
        if (eventEnded) {
            revert EventAlreadyEnded();
        }

        eventEnded = true;

        emit EventEnded();
    }

    /// @notice Pays all still-approved deposits to the host.
    function batchPayout(address[] calldata attendees) external onlyOwner nonReentrant {
        if (!eventEnded) {
            revert EventNotEnded();
        }

        uint256 total;

        for (uint256 i = 0; i < attendees.length; i++) {
            address attendee = attendees[i];

            if (statusOf[attendee] == DepositStatus.Approved) {
                uint256 amount = deposits[attendee];

                deposits[attendee] = 0;
                statusOf[attendee] = DepositStatus.Paid;

                total += amount;

                emit PaidOut(attendee, amount);
            }
        }

        if (total > 0) {
            _send(owner(), total);
        }
    }

    /// @notice Mints an NFT to every checked-in attendee.
    /// Only callable by the host and only after the event has ended.
    function mintTickets(address[] calldata checkedInAttendees, string calldata metadataCID) external onlyOwner {
        if (!eventEnded) {
            revert EventNotEnded();
        }

        for (uint256 i = 0; i < checkedInAttendees.length; i++) {
            ITicketNFT(ticketNFT).mint(checkedInAttendees[i], metadataCID);
        }
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = payable(to).call{value: amount}("");

        if (!ok) {
            revert TransferFailed();
        }
    }
}
