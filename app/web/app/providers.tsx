"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia } from "viem/chains";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
        appearance: {
          theme: "dark",
          accentColor: "#1463FF",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
