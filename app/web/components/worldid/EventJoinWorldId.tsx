"use client";

import { useState } from "react";
import { usePrivy, type User } from "@privy-io/react-auth";

import { SelfieCheckButton } from "@/components/worldid/SelfieCheckButton";
import { UniswapPayButton } from "@/components/join/UniswapPayButton";
import { Button } from "@/components/ui/Button";

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
  price,
}: {
  eventId: string;
  price: string;
}) {
  const { ready, authenticated, user } = usePrivy();

  const [verified, setVerified] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const isPaid = Number(price) > 0;

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

  if (!verified) {
    return (
      <SelfieCheckButton
        eventId={eventId}
        walletAddress={externalEthereumWallet.address}
        onVerified={() => setVerified(true)}
      />
    );
  }

  if (!isPaid) {
    return (
      <Button
        type="button"
        className="w-full"
      >
        Continue to join
      </Button>
    );
  }

  if (!showPayment) {
    return (
      <Button
        type="button"
        className="w-full"
        onClick={() => setShowPayment(true)}
      >
        Continue to pay
      </Button>
    );
  }

  return (
    <UniswapPayButton
      eventId={eventId}
      walletAddress={externalEthereumWallet.address}
    />
  );
}
