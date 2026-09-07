import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export const account = privateKeyToAccount(process.env.PRIVATE_KEY);

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

export const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

export const ENS = {
  verifiableFactory: "0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef",
  permissionedResolverImpl: "0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e",
  userRegistryImpl: "0x624a25d67b59d587752ebec8dded8827dae52050",
  ethRegistry: "0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2",
  universalResolverV2: "0x4a1817d13e9cf196f471725176355c1234b63c70",
};

export const KOSMOS_NAME = "kosmos.eth";
export const KOSMOS_LABEL = "kosmos";
