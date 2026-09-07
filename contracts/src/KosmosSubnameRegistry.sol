// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {
  IPermissionedRegistry
} from "@ensdomains/contracts-v2/registry/interfaces/IPermissionedRegistry.sol";
import {
  IRegistry
} from "@ensdomains/contracts-v2/registry/interfaces/IRegistry.sol";
import {
  RegistryRolesLib
} from "@ensdomains/contracts-v2/registry/libraries/RegistryRolesLib.sol";

uint256 constant REGISTRATION_ROLE_BITMAP = RegistryRolesLib
  .ROLE_SET_SUBREGISTRY |
  RegistryRolesLib.ROLE_SET_SUBREGISTRY_ADMIN |
  RegistryRolesLib.ROLE_SET_RESOLVER |
  RegistryRolesLib.ROLE_SET_RESOLVER_ADMIN |
  RegistryRolesLib.ROLE_CAN_TRANSFER_ADMIN;

contract KosmosSubnameRegistry {
  error NameNotAvailable(string label);
  error InvalidOwner();

  event SubnameRegistered(
    uint256 indexed tokenId,
    string label,
    address indexed owner,
    address resolver
  );

  IPermissionedRegistry public immutable REGISTRY;

  constructor(IPermissionedRegistry registry) {
    REGISTRY = registry;
  }

  function isAvailable(string calldata label) public view returns (bool) {
    IPermissionedRegistry.State memory state = REGISTRY.getState(
      uint256(keccak256(bytes(label)))
    );

    return state.status == IPermissionedRegistry.Status.AVAILABLE;
  }

  function register(
    string calldata label,
    address owner,
    address resolver
  ) external returns (uint256 tokenId) {
    if (!isAvailable(label)) revert NameNotAvailable(label);
    if (owner == address(0)) revert InvalidOwner();

    tokenId = REGISTRY.register(
      label,
      owner,
      IRegistry(address(0)),
      resolver,
      REGISTRATION_ROLE_BITMAP,
      type(uint64).max
    );

    emit SubnameRegistered(tokenId, label, owner, resolver);
  }
}
