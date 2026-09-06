// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EventEscrowFactory} from "../src/EventEscrowFactory.sol";

contract DeployEventEscrowFactory is Script {
  function run() external returns (EventEscrowFactory factory) {
    uint256 deployerKey = vm.envUint("PRIVATE_KEY");

    vm.startBroadcast(deployerKey);
    factory = new EventEscrowFactory();
    vm.stopBroadcast();

    console.log("EventEscrowFactory deployed to:", address(factory));
  }
}
