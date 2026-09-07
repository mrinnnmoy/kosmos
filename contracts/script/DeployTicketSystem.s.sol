// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {Script, console} from "forge-std/Script.sol";
import {TicketNFT} from "../src/TicketNFT.sol";
import {EventEscrowFactory} from "../src/EventEscrowFactory.sol";

contract DeployTicketSystem is Script {
    function run() external returns (TicketNFT ticketNFT, EventEscrowFactory factory) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        ticketNFT = new TicketNFT(deployer);
        factory = new EventEscrowFactory(address(ticketNFT));
        ticketNFT.setFactory(address(factory));

        vm.stopBroadcast();

        console.log("TicketNFT deployed to:", address(ticketNFT));
        console.log("EventEscrowFactory deployed to:", address(factory));
    }
}
