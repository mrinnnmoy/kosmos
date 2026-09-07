import "dotenv/config";

import {
    encodeFunctionData,
    keccak256,
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

const ROLE_SET_ADDR_ADMIN = 1n << 128n;

const resolverAbi = parseAbi([
    "function initialize(address admin, uint256 roleBitmap, bytes[] calldata setters)",
]);

const factoryAbi = parseAbi([
    "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
    "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);

async function main() {
    console.log(`Deploying PermissionedResolver for ${KOSMOS_NAME}...`);
    console.log(`Account: ${account.address}`);
    console.log(`Implementation: ${ENS.permissionedResolverImpl}`);

    const resolverSalt = keccak256(
        stringToHex("PermissionedResolver"),
    );

    const initData = encodeFunctionData({
        abi: resolverAbi,
        functionName: "initialize",
        args: [
            account.address,
            ROLE_SET_ADDR_ADMIN,
            [],
        ],
    });

    const txHash = await walletClient.writeContract({
        address: ENS.verifiableFactory,
        abi: factoryAbi,
        functionName: "deployProxy",
        args: [
            ENS.permissionedResolverImpl,
            resolverSalt,
            initData,
        ],
    });

    console.log(`Deploy transaction: ${txHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
    });

    if (receipt.status !== "success") {
        throw new Error("PermissionedResolver deployment failed");
    }

    let resolverAddress;

    for (const log of receipt.logs) {
        try {
            const decoded = publicClient.decodeEventLog({
                abi: factoryAbi,
                data: log.data,
                topics: log.topics,
            });

            if (decoded.eventName === "ProxyDeployed") {
                resolverAddress = decoded.args.proxyAddress;
                break;
            }
        } catch {
            // Ignore unrelated logs.
        }
    }

    if (!resolverAddress) {
        throw new Error("Could not find deployed PermissionedResolver proxy");
    }

    console.log("Deployment successful.");
    console.log(`KOSMOS_PERMISSIONED_RESOLVER=${resolverAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
