import "dotenv/config";
import fs from "node:fs";

import { parseAbi, getContract } from "viem";

import {
    account,
    publicClient,
    walletClient,
} from "./config.mjs";

const USER_REGISTRY =
    "0xa887bc66b6e4fc6ffa7173a23ac280f459b987cb";

const artifact = JSON.parse(
    fs.readFileSync(
        new URL("../../out/KosmosSubnameRegistry.sol/KosmosSubnameRegistry.json", import.meta.url),
        "utf8",
    ),
);

async function main() {
    console.log("Deploying KosmosSubnameRegistry...");
    console.log(`Deployer: ${account.address}`);
    console.log(`UserRegistry: ${USER_REGISTRY}`);

    const txHash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode.object,
        args: [USER_REGISTRY],
    });

    console.log(`Deploy transaction: ${txHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
    });

    if (receipt.status !== "success") {
        throw new Error("KosmosSubnameRegistry deployment failed");
    }

    console.log(`Deployment successful.`);
    console.log(`KosmosSubnameRegistry=${receipt.contractAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});