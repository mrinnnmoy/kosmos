import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  namehash,
  parseAbi,
  stringToHex,
} from "viem";

import {
  account,
  publicClient,
  walletClient,
  ENS,
  KOSMOS_NAME,
} from "./config.mjs";

const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes initData) returns (address)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);

const userRegistryAbi = parseAbi([
  "function initialize(address rootAccount, uint256 roleBitmap)",
]);

const ethRegistryAbi = parseAbi([
  "function setSubregistry(uint256 anyId, address subregistry)",
]);

async function main() {
  console.log(`Deploying UserRegistry for ${KOSMOS_NAME}...`);
  console.log(`Account: ${account.address} `);

  const registrySalt = keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint256" },
      ],
      [
        keccak256(stringToHex("UserRegistry")),
        namehash(KOSMOS_NAME),
        0n,
      ],
    ),
  );

  const initData = encodeFunctionData({
    abi: userRegistryAbi,
    functionName: "initialize",
    args: [account.address, ALL_ROLES],
  });

  const txHash = await walletClient.writeContract({
    address: ENS.verifiableFactory,
    abi: factoryAbi,
    functionName: "deployProxy",
    args: [ENS.userRegistryImpl, registrySalt, initData],
  });

  console.log(`Deploy transaction: ${txHash} `);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  let registryAddress;

  for (const log of receipt.logs) {
    try {
      const decoded = publicClient.decodeEventLog({
        abi: factoryAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "ProxyDeployed") {
        registryAddress = decoded.args.proxyAddress;
        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  if (!registryAddress) {
    throw new Error("Could not find deployed UserRegistry proxy address");
  }

  console.log(`KOSMOS_USER_REGISTRY = ${registryAddress} `);

  const labelHash = BigInt(keccak256(stringToHex("kosmos")));

  const subregistryTx = await walletClient.writeContract({
    address: ENS.ethRegistry,
    abi: ethRegistryAbi,
    functionName: "setSubregistry",
    args: [labelHash, registryAddress],
  });

  console.log(`setSubregistry transaction: ${subregistryTx} `);

  await publicClient.waitForTransactionReceipt({
    hash: subregistryTx,
  });

  console.log(`kosmos.eth now points to ${registryAddress} `);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

