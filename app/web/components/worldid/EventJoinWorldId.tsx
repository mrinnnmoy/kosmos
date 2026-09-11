"use client";

import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { Spinner } from "@/components/ui/Spinner";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, type User } from "@privy-io/react-auth";
import type { IDKitResult } from "@worldcoin/idkit";

import { CancelJoinButton } from "@/components/join/CancelJoinButton";
import { UniswapPayButton } from "@/components/join/UniswapPayButton";
import { TicketQrButton } from "@/components/tickets/TicketQrButton";
import { Button } from "@/components/ui/Button";
import { SelfieCheckButton } from "@/components/worldid/SelfieCheckButton";

type LinkedAccount = User["linkedAccounts"][number];
type WalletAccount = Extract<LinkedAccount, { type: "wallet" }>;

type JoinState =
  | "idle"
  | "submitting"
  | "pending"
  | "error";

type ExistingJoinStatus =
  | "pending"
  | "approved"
  | "checked_in"
  | "denied"
  | "cancelled"
  | null;

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
  escrowAddress,
  hostWalletAddress,
  startsAt,
  eventName,
}: {
  eventId: string;
  price: string;
  escrowAddress: string | null;
  hostWalletAddress: string | null;
  startsAt: string | Date;
  eventName: string;
}) {
  const {
    ready,
    authenticated,
    user,
    getAccessToken,
  } = usePrivy();

  const [verified, setVerified] = useState(false);
  const [worldIdResult, setWorldIdResult] =
    useState<IDKitResult | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTxHash, setPaymentTxHash] =
    useState<string | null>(null);
  const [joinState, setJoinState] =
    useState<JoinState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [existingJoinStatus, setExistingJoinStatus] =
    useState<ExistingJoinStatus | undefined>(undefined);
  const [joinRequestId, setJoinRequestId] =
    useState<string | null>(null);
  const [ticketId, setTicketId] =
    useState<string | null>(null);
  const [statusError, setStatusError] =
    useState<string | null>(null);

  const isPaid = Number(price) > 0;

  const externalEthereumWallet = user?.linkedAccounts.find(
    isExternalEthereumWallet
  );

  const externalWalletAddress =
    externalEthereumWallet?.address;

  const isHost = Boolean(
    hostWalletAddress &&
      externalWalletAddress &&
      externalWalletAddress.toLowerCase() ===
        hostWalletAddress.toLowerCase()
  );

  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !externalWalletAddress ||
      isHost
    ) {
      return;
    }

    let cancelled = false;

    async function loadJoinStatus() {
      setExistingJoinStatus(undefined);
      setStatusError(null);

      try {
        const token = await getAccessToken();

        if (!token) {
          throw new Error(
            "Unable to get authentication token"
          );
        }

        const response = await fetch(
          `/api/events/${eventId}/join-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            body?.message ?? "Failed to load join status"
          );
        }

        const status = body?.status;

        if (
          status !== null &&
          status !== "pending" &&
          status !== "approved" &&
          status !== "checked_in" &&
          status !== "denied" &&
          status !== "cancelled"
        ) {
          throw new Error("Invalid join status");
        }

        if (!cancelled) {
          setExistingJoinStatus(status);
          setJoinRequestId(
            typeof body?.requestId === "string"
              ? body.requestId
              : null
          );
          setTicketId(
            typeof body?.ticketId === "string"
              ? body.ticketId
              : null
          );
        }
      } catch (statusLoadError) {
        if (!cancelled) {
          setStatusError(
            statusLoadError instanceof Error
              ? statusLoadError.message
              : "Failed to load join status"
          );
        }
      }
    }

    void loadJoinStatus();

    return () => {
      cancelled = true;
    };
  }, [
    authenticated,
    eventId,
    externalWalletAddress,
    getAccessToken,
    isHost,
    ready,
  ]);

  async function submitJoin(
    depositTxHash: string | null
  ): Promise<void> {
    if (!worldIdResult) {
      setError("World ID verification result is missing");
      setJoinState("error");
      return;
    }

    setJoinState("submitting");
    setError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Unable to get authentication token");
      }

      const response = await fetch("/api/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          idkitResponse: worldIdResult,
          paymentTxHash: depositTxHash,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.message ?? "Failed to submit join request"
        );
      }

      if (body?.status === "approved") {
        setJoinRequestId(
          typeof body?.id === "string" ? body.id : null
        );
        setTicketId(
          typeof body?.ticketId === "string"
            ? body.ticketId
            : typeof body?.id === "string"
              ? body.id
              : null
        );
        setExistingJoinStatus("approved");
        setJoinState("idle");
      } else {
        setJoinRequestId(
          typeof body?.id === "string" ? body.id : null
        );
        setExistingJoinStatus("pending");
        setJoinState("pending");
      }
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Failed to submit join request"
      );
      setJoinState("error");
    }
  }

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

  if (isHost) {
    return (
      <Button asChild className="w-full">
        <Link href={`/events/${eventId}/manage`}>
          Manage Event
        </Link>
      </Button>
    );
  }

  if (statusError) {
    return (
      <ErrorBanner message={statusError} />
    );
  }

  if (existingJoinStatus === undefined) {
    return (
      <Button
        type="button"
        className="w-full"
        disabled
      >
        <span
          className="flex items-center justify-center gap-2"
          aria-live="polite"
        >
          <Spinner />
          Checking join status...
        </span>
      </Button>
    );
  }

  if (existingJoinStatus === "pending") {
    return (
      <div>
        <p className="font-medium text-foreground">
          Pending Approval
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your join request was submitted. The host must approve it
          before your ticket is confirmed.
        </p>
      </div>
    );
  }

  if (
    existingJoinStatus === "approved" ||
    existingJoinStatus === "checked_in"
  ) {
    const isCheckedIn = existingJoinStatus === "checked_in";

    const canCancel =
      !isCheckedIn &&
      joinRequestId &&
      new Date(startsAt) > new Date();

    return (
      <div>
        <p className="font-medium text-foreground">
          {isCheckedIn ? "Checked in" : "Approved"}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {isCheckedIn
            ? "You're checked in for this event."
            : "Your ticket for this event is confirmed."}
        </p>

        {ticketId && (
          <div className="mt-4">
            <TicketQrButton
              ticketId={ticketId}
              eventName={eventName}
              checkedIn={isCheckedIn}
            />
          </div>
        )}

        {canCancel && (
          <div className="mt-4">
            <CancelJoinButton
              joinRequestId={joinRequestId}
              escrowAddress={escrowAddress}
              attendeeWalletAddress={externalWalletAddress ?? null}
              price={price}
              onCancelled={() => {
                setExistingJoinStatus("cancelled");
                setTicketId(null);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (existingJoinStatus === "cancelled" && isPaid) {
    return (
      <div>
        <p className="font-medium text-foreground">
          Cancelled
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your spot for this event was cancelled and refunded.
        </p>
      </div>
    );
  }

  if (existingJoinStatus === "denied") {
    return (
      <div>
        <p className="font-medium text-foreground">
          Request Denied
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The host denied your request to join this event.
        </p>
      </div>
    );
  }

  if (joinState === "pending") {
    return (
      <div>
        <p className="font-medium text-foreground">
          Pending Approval
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your join request was submitted. The host must approve it
          before your ticket is confirmed.
        </p>
      </div>
    );
  }

  if (joinState === "submitting") {
    return (
      <Button
        type="button"
        className="w-full"
        disabled
      >
        <span
          className="flex items-center justify-center gap-2"
          aria-live="polite"
        >
          <Spinner />
          Submitting join request...
        </span>
      </Button>
    );
  }

  if (joinState === "error") {
    return (
      <div>
        <ErrorBanner message={error ?? "Failed to submit join request."} />

        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => {
            void submitJoin(
              isPaid ? paymentTxHash : null
            );
          }}
        >
          Retry join request
        </Button>
      </div>
    );
  }

  if (!verified) {
    return (
      <SelfieCheckButton
        eventId={eventId}
        walletAddress={externalEthereumWallet.address}
        onVerified={(_nullifier, idkitResponse) => {
          setWorldIdResult(idkitResponse);
          setVerified(true);
        }}
      />
    );
  }

  if (!isPaid) {
    return (
      <Button
        type="button"
        className="w-full"
        onClick={() => {
          void submitJoin(null);
        }}
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

  if (!escrowAddress) {
    return (
      <ErrorBanner message="Event escrow is not available." />
    );
  }

  return (
    <UniswapPayButton
      eventId={eventId}
      walletAddress={externalEthereumWallet.address}
      escrowAddress={escrowAddress}
      onPaid={(hash) => {
        setPaymentTxHash(hash);
        void submitJoin(hash);
      }}
    />
  );
}
