// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {Script, console} from "forge-std/Script.sol";
import {EventEscrowFactory} from "../src/EventEscrowFactory.sol";
import {TicketNFT} from "../src/TicketNFT.sol";

contract DeployEventEscrowFactoryV2 is Script {
    address constant TICKET_NFT = 0xc85365cEd1A610575002E4a3d22188882665AdA7;

    function run() external returns (EventEscrowFactory factory) {
        vm.startBroadcast();

        factory = new EventEscrowFactory(TICKET_NFT);
        TicketNFT(TICKET_NFT).setFactory(address(factory));

        vm.stopBroadcast();

        console.log("EventEscrowFactory deployed to:", address(factory));
    }
}
