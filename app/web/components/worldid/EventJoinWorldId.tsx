"use client";

import { usePrivy, type User } from "@privy-io/react-auth";

import { SelfieCheckButton } from "@/components/worldid/SelfieCheckButton";

type LinkedAccount = User["linkedAccounts"][number];
type WalletAccount = Extract<LinkedAccount, { type: "wallet" }>;

function isExternalEthereumWallet(
  account: LinkedAccount
): account is WalletAccount {
  return (
    account.type === "wallet" &&
    account.chainType === "ethereum" &&
    account.walletClientType !== "privy" &&
    account.walletClientType !== "privy-v2" &&
    account.connectorType !== "embedded"
  );
}

export function EventJoinWorldId({
  eventId,
}: {
  eventId: string;
}) {
  const { ready, authenticated, user } = usePrivy();

  const externalEthereumWallet = user?.linkedAccounts.find(
    isExternalEthereumWallet
  );

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-white px-4 py-3 font-medium text-black opacity-50"
      >
        Loading wallet...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-white px-4 py-3 font-medium text-black opacity-50"
      >
        Sign in to verify
      </button>
    );
  }

  if (!externalEthereumWallet) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-white px-4 py-3 font-medium text-black opacity-50"
      >
        Connect an external Ethereum wallet
      </button>
    );
  }

  return (
    <SelfieCheckButton
      eventId={eventId}
      walletAddress={externalEthereumWallet.address}
    />
  );
}
