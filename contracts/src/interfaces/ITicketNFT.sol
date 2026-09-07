// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

interface ITicketNFT {
    function mint(address to, string calldata metadataURI) external returns (uint256);
}
