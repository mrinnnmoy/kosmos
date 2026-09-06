// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EventEscrowFactory} from "./EventEscrowFactory.sol";

contract TicketNFT is ERC721, Ownable {
    address public factory;
    uint256 private _nextTokenId = 1;

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) public eventOf;

    error NotAuthorizedMinter();
    error FactoryNotSet();

    event TicketMinted(uint256 indexed tokenId, address indexed to, address indexed eventEscrow);

    constructor(address initialOwner) ERC721("Kosmos Ticket", "KTIX") Ownable(initialOwner) {}

    /// @notice One-time wiring call after both contracts are deployed.
    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    modifier onlyEscrow() {
        if (factory == address(0)) revert FactoryNotSet();

        if (!EventEscrowFactory(factory).isEscrow(msg.sender)) {
            revert NotAuthorizedMinter();
        }

        _;
    }

    /// @notice Mints a proof-of-attendance ticket.
    /// Only callable by an EventEscrow recognized by the factory.
    function mint(address to, string calldata metadataURI) external onlyEscrow returns (uint256) {
        uint256 tokenId = _nextTokenId++;

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = metadataURI;
        eventOf[tokenId] = msg.sender;

        emit TicketMinted(tokenId, to, msg.sender);

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        return string.concat("ipfs://", _tokenURIs[tokenId]);
    }
}
