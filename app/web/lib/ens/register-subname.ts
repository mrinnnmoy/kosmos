import "server-only";

import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  namehash,
  parseAbi,
  parseEventLogs,
  stringToHex,
} from "viem";

import { CONTRACT_ADDRESSES, KosmosSubnameRegistryAbi } from "@kosmos/shared";

import { adminWalletClient, publicClient } from "./client";

const ENS = {
  verifiableFactory: "0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef",
  permissionedResolverImpl: "0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e",
} as const;

const ALL_ROLES = BigInt(
  "0x1111111111111111111111111111111111111111111111111111111111111111"
);

const KOSMOS_NAME = "kosmos.eth";

const verifiableFactoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);

export async function registerKosmosSubname(
  label: string,
  ownerWallet: `0x${string}`
) {
  const fullName = `${label}.${KOSMOS_NAME}`;
  const version = BigInt(0);

  const resolverSalt = BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
        [keccak256(stringToHex("OwnedResolver")), ownerWallet, version]
      )
    )
  );

  const setAddrCalldata = encodeFunctionData({
    abi: parseAbi(["function setAddr(bytes32 node, address a)"]),
    functionName: "setAddr",
    args: [namehash(fullName), ownerWallet],
  });

  const resolverInitData = encodeFunctionData({
    abi: parseAbi([
      "function initialize(address admin, uint256 roleBitmap, bytes[] setters)",
    ]),
    functionName: "initialize",
    args: [ownerWallet, ALL_ROLES, [setAddrCalldata]],
  });

  const resolverTx = await adminWalletClient.writeContract({
    address: ENS.verifiableFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [ENS.permissionedResolverImpl, resolverSalt, resolverInitData],
  });

  const resolverReceipt = await publicClient.waitForTransactionReceipt({
    hash: resolverTx,
  });

  const [resolverLog] = parseEventLogs({
    abi: verifiableFactoryAbi,
    eventName: "ProxyDeployed",
    logs: resolverReceipt.logs,
  });

  if (!resolverLog) {
    throw new Error("Resolver deployment event not found");
  }

  const resolverAddress = resolverLog.args.proxyAddress;

  const registerTx = await adminWalletClient.writeContract({
    address: CONTRACT_ADDRESSES.sepolia.kosmosSubnameRegistry,
    abi: KosmosSubnameRegistryAbi,
    functionName: "register",
    args: [label, ownerWallet, resolverAddress],
  });

  await publicClient.waitForTransactionReceipt({
    hash: registerTx,
  });

  return {
    fullName,
    resolverAddress,
    registerTx,
  };
}
