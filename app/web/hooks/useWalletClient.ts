"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";

export function useKosmosWalletClient() {
  const { wallets } = useWallets();

  return useCallback(
    async (walletAddress: string) => {
      const wallet = wallets.find(
        (candidate) =>
          candidate.address.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!wallet) {
        throw new Error("Authenticated external wallet is not connected");
      }

      const provider = await wallet.getEthereumProvider();

      return createWalletClient({
        account: wallet.address as `0x${string}`,
        chain: sepolia,
        transport: custom(provider),
      });
    },
    [wallets]
  );
}
