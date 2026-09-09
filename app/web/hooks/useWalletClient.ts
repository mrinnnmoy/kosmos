"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";

export function useKosmosWalletClient() {
  const { wallets } = useWallets();

  return useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet linked");

    const provider = await wallet.getEthereumProvider();

    return createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: sepolia,
      transport: custom(provider),
    });
  }, [wallets]);
}
