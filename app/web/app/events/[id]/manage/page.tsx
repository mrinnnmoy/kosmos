"use client";

import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { EmptyState } from "@/components/ui/EmptyState";

import { Spinner } from "@/components/ui/Spinner";

import { useCallback, useEffect, useState, useRef} from "react";
import { useParams } from "next/navigation";
import {
  useConnectWallet,
  usePrivy,
  type User,
} from "@privy-io/react-auth";
import {
  createPublicClient,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { EventEscrowAbi } from "@kosmos/shared";

import { Button } from "@/components/ui/Button";
import { useKosmosWalletClient } from "@/hooks/useWalletClient";

type LinkedAccount = User["linkedAccounts"][number];
type WalletAccount = Extract<LinkedAccount, { type: "wallet" }>;

type PendingRequest = {
  id: string;
  status: "pending";
  paymentTxHash: string | null;
  createdAt: string;
  attendee: {
    id: string;
    email: string;
    linkedWallet: string | null;
    ensSubname: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

type QueueResponse = {
  event: {
    id: string;
    name: string;
    price: string;
    escrowContractAddress: string | null;
    status: "draft" | "upcoming" | "live" | "ended" | "cancelled";
  };
  requests: PendingRequest[];
};

type Action = "approve" | "deny";

type ActionState = {
  requestId: string;
  action: Action;
} | null;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

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

function attendeeName(request: PendingRequest) {
  const name = [
    request.attendee.firstName,
    request.attendee.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    name ||
    request.attendee.ensSubname ||
    request.attendee.email
  );
}

export default function ManageEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const {
    ready,
    authenticated,
    user,
    getAccessToken,
  } = usePrivy();

  const { connectWallet } = useConnectWallet();
  const getWalletClient = useKosmosWalletClient();

  const [queue, setQueue] =
    useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [actionState, setActionState] =
    useState<ActionState>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const [startingEvent, setStartingEvent] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);
  const endingEventLockRef = useRef(false);
  const [endTxHashes, setEndTxHashes] = useState<{
    payout?: Hex;
    mint?: Hex;
  }>({});

  const [completedTxHashes, setCompletedTxHashes] =
    useState<Record<string, Hex>>({});

  const externalEthereumWallet =
    user?.linkedAccounts.find(isExternalEthereumWallet);

  const fetchQueue = useCallback(async () => {
    if (!authenticated) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Unable to get authentication token");
      }

      const response = await fetch(
        `/api/events/${eventId}/join-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.message ?? "Failed to load join requests"
        );
      }

      setQueue(body as QueueResponse);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load join requests"
      );
    } finally {
      setLoading(false);
    }
  }, [authenticated, eventId, getAccessToken]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!authenticated) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    const loadInitialQueue = async () => {
      try {
        const token = await getAccessToken();

        if (!token) {
          throw new Error("Unable to get authentication token");
        }

        const response = await fetch(
          `/api/events/${eventId}/join-requests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            body?.message ?? "Failed to load join requests"
          );
        }

        setQueue(body as QueueResponse);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load join requests"
        );
      } finally {
        setLoading(false);
      }
    };

    void loadInitialQueue();
  }, [ready, authenticated, eventId, getAccessToken]);

  async function startEvent() {
    setStartingEvent(true);
    setActionError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Unable to get authentication token");
      }

      const response = await fetch(
        `/api/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ status: "live" }),
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.message ?? "Failed to start event"
        );
      }

      await fetchQueue();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to start event"
      );
    } finally {
      setStartingEvent(false);
    }
  }

  async function endEvent() {
    if (!queue?.event.escrowContractAddress) {
      setActionError("Event escrow contract is not configured");
      return;
    }

    if (!externalEthereumWallet) {
      setActionError(
        "Connect the external wallet linked to your Kosmos account"
      );
      return;
    }

    if (!isAddress(queue.event.escrowContractAddress)) {
      setActionError("Invalid event escrow contract address");
      return;
    }

    if (endingEventLockRef.current) {
      return;
    }

    endingEventLockRef.current = true;
    setEndingEvent(true);
    setActionError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Unable to get authentication token");
      }

      const prepResponse = await fetch(
        `/api/events/${eventId}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const prep = await prepResponse.json().catch(() => null);

      if (!prepResponse.ok) {
        throw new Error(
          prep?.message ?? "Failed to prepare event ending"
        );
      }

      const payoutWallets = prep?.payoutWallets;
      const mintWallets = prep?.mintWallets;
      const metadataCid = prep?.metadataCid;

      if (
        !Array.isArray(payoutWallets) ||
        !Array.isArray(mintWallets) ||
        typeof metadataCid !== "string" ||
        !metadataCid
      ) {
        throw new Error("Invalid end-event preparation response");
      }

      if (
        !payoutWallets.every(
          (wallet): wallet is Address =>
            typeof wallet === "string" && isAddress(wallet)
        ) ||
        !mintWallets.every(
          (wallet): wallet is Address =>
            typeof wallet === "string" && isAddress(wallet)
        )
      ) {
        throw new Error("Invalid attendee wallet list");
      }

      let walletClient;

      try {
        walletClient = await getWalletClient(
          externalEthereumWallet.address
        );
      } catch {
        await connectWallet({
          walletChainType: "ethereum-only",
          description:
            "Connect the wallet linked to your Kosmos account",
        });

        walletClient = await getWalletClient(
          externalEthereumWallet.address
        );
      }

      const contractAddress =
        queue.event.escrowContractAddress as Address;

      const alreadyEnded = await publicClient.readContract({
        address: contractAddress,
        abi: EventEscrowAbi,
        functionName: "eventEnded",
      });

      if (
        alreadyEnded &&
        (!endTxHashes.payout || !endTxHashes.mint)
      ) {
        throw new Error(
          "This event is already ended on-chain but finalization is incomplete. Do not retry blockchain transactions."
        );
      }

      if (!alreadyEnded) {
        const endGasEstimate =
          await publicClient.estimateContractGas({
            address: contractAddress,
            abi: EventEscrowAbi,
            functionName: "endEvent",
            account:
              externalEthereumWallet.address as Address,
          });

        const endHash = await walletClient.writeContract({
          address: contractAddress,
          abi: EventEscrowAbi,
          functionName: "endEvent",
          gas:
            (endGasEstimate * BigInt(120)) /
            BigInt(100),
        });

        const endReceipt =
          await publicClient.waitForTransactionReceipt({
            hash: endHash,
          });

        if (endReceipt.status !== "success") {
          throw new Error("Failed to end event on-chain");
        }
      }

      let payoutHash = endTxHashes.payout;

      if (!payoutHash) {
        const payoutGasEstimate =
          await publicClient.estimateContractGas({
            address: contractAddress,
            abi: EventEscrowAbi,
            functionName: "batchPayout",
            args: [payoutWallets],
            account:
              externalEthereumWallet.address as Address,
          });

        payoutHash = await walletClient.writeContract({
          address: contractAddress,
          abi: EventEscrowAbi,
          functionName: "batchPayout",
          args: [payoutWallets],
          gas:
            (payoutGasEstimate * BigInt(120)) /
            BigInt(100),
        });

        const payoutReceipt =
          await publicClient.waitForTransactionReceipt({
            hash: payoutHash,
          });

        if (payoutReceipt.status !== "success") {
          throw new Error("Host payout transaction failed");
        }

        setEndTxHashes((current) => ({
          ...current,
          payout: payoutHash,
        }));
      }

      let mintHash = endTxHashes.mint;

      if (!mintHash) {
        const mintGasEstimate =
          await publicClient.estimateContractGas({
            address: contractAddress,
            abi: EventEscrowAbi,
            functionName: "mintTickets",
            args: [mintWallets, metadataCid],
            account:
              externalEthereumWallet.address as Address,
          });

        mintHash = await walletClient.writeContract({
          address: contractAddress,
          abi: EventEscrowAbi,
          functionName: "mintTickets",
          args: [mintWallets, metadataCid],
          gas:
            (mintGasEstimate * BigInt(120)) /
            BigInt(100),
        });

        const mintReceipt =
          await publicClient.waitForTransactionReceipt({
            hash: mintHash,
          });

        if (mintReceipt.status !== "success") {
          throw new Error("Ticket NFT mint transaction failed");
        }

        setEndTxHashes((current) => ({
          ...current,
          mint: mintHash,
        }));
      }

      const finalizeResponse = await fetch(
        `/api/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            status: "ended",
            payoutTxHash: payoutHash,
            mintTxHash: mintHash,
          }),
        }
      );

      const finalize =
        await finalizeResponse.json().catch(() => null);

      if (!finalizeResponse.ok) {
        throw new Error(
          finalize?.message ?? "Failed to finalize event"
        );
      }

      setEndTxHashes({});
      await fetchQueue();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to end event"
      );
    } finally {
      endingEventLockRef.current = false;
      setEndingEvent(false);
    }
  }

  async function syncAction(
    requestId: string,
    action: Action,
    txHash?: Hex
  ) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error("Unable to get authentication token");
    }

    const response = await fetch(
      `/api/join/${requestId}/${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          txHash ? { txHash } : {}
        ),
      }
    );

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        body?.message ??
          `Failed to record ${action} result`
      );
    }
  }

  async function handleAction(
    request: PendingRequest,
    action: Action
  ) {
    const isPaidEvent = Number(queue?.event.price ?? "0") > 0;

    setActionState({
      requestId: request.id,
      action,
    });
    setActionError(null);

    try {
      if (!isPaidEvent) {
        await syncAction(request.id, action);
        await fetchQueue();
        return;
      }

      if (!queue?.event.escrowContractAddress) {
        throw new Error("Event escrow is not configured");
      }

      if (
        !isAddress(queue.event.escrowContractAddress) ||
        !request.attendee.linkedWallet ||
        !isAddress(request.attendee.linkedWallet)
      ) {
        throw new Error("Escrow or attendee wallet is invalid");
      }

      if (!externalEthereumWallet) {
        throw new Error(
          "Connect the external Ethereum wallet used by the event host"
        );
      }

      const contractAddress =
        queue.event.escrowContractAddress as Address;
      const attendeeAddress =
        request.attendee.linkedWallet as Address;

      const escrowStatus = await publicClient.readContract({
        address: contractAddress,
        abi: EventEscrowAbi,
        functionName: "statusOf",
        args: [attendeeAddress],
      });

      if (escrowStatus === 2) {
        if (action !== "approve") {
          throw new Error(
            "This attendee is already approved on-chain"
          );
        }

        await syncAction(request.id, "approve");
        await fetchQueue();
        return;
      }

      if (escrowStatus === 3) {
        if (action !== "deny") {
          throw new Error(
            "This attendee is already denied on-chain"
          );
        }

        await syncAction(request.id, "deny");
        await fetchQueue();
        return;
      }

      if (escrowStatus !== 1) {
        throw new Error(
          "This attendee does not have a pending escrow deposit"
        );
      }

      let txHash = completedTxHashes[request.id];

      if (!txHash) {
        let walletClient;

        try {
          walletClient = await getWalletClient(
            externalEthereumWallet.address
          );
        } catch {
          await connectWallet({
            walletChainType: "ethereum-only",
            description:
              "Connect the wallet linked to your Kosmos account",
          });

          walletClient = await getWalletClient(
            externalEthereumWallet.address
          );
        }

        const functionName =
          action === "approve" ? "release" : "refund";

        const estimatedGas =
          await publicClient.estimateContractGas({
            address: contractAddress,
            abi: EventEscrowAbi,
            functionName,
            args: [attendeeAddress],
            account:
              externalEthereumWallet.address as Address,
          });

        const gas =
          (estimatedGas * BigInt(120)) / BigInt(100);

        txHash = await walletClient.writeContract({
          address: contractAddress,
          abi: EventEscrowAbi,
          functionName,
          args: [attendeeAddress],
          gas,
        });

        const receipt =
          await publicClient.waitForTransactionReceipt({
            hash: txHash,
          });

        if (receipt.status !== "success") {
          throw new Error(
            action === "approve"
              ? "Approval transaction reverted"
              : "Refund transaction reverted"
          );
        }

        setCompletedTxHashes((current) => ({
          ...current,
          [request.id]: txHash,
        }));
      }

      await syncAction(request.id, action, txHash);

      setCompletedTxHashes((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });

      await fetchQueue();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Host action failed"
      );
    } finally {
      setActionState(null);
    }
  }

  if (!ready || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          <span>Loading join requests...</span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-muted-foreground">
          Sign in to manage this event.
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-12">
        <ErrorBanner message={loadError} />

        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => void fetchQueue()}
        >
          Retry
        </Button>
      </main>
    );
  }

  if (!queue) {
    return null;
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Manage {queue.event.name}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Approve or deny pending join requests.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {queue.event.status === "upcoming" && (
            <Button
              type="button"
              onClick={() => void startEvent()}
              disabled={startingEvent}
            >
              <span
                className="flex items-center justify-center gap-2"
                aria-live="polite"
              >
                {startingEvent && <Spinner />}
                {startingEvent ? "Starting..." : "Start Event"}
              </span>
            </Button>
          )}

          {queue.event.status === "live" && (
            <>
              <a href={`/events/${eventId}/checkin`}>
                <Button type="button">
                  Open Check-in Scanner
                </Button>
              </a>

              <Button
                type="button"
                onClick={() => void endEvent()}
                disabled={endingEvent}
              >
                <span
                  className="flex items-center justify-center gap-2"
                  aria-live="polite"
                >
                  {endingEvent && <Spinner />}
                  {endingEvent ? "Ending event..." : "End Event"}
                </span>
              </Button>
            </>
          )}

          {queue.event.status === "ended" && (
            <p className="text-sm font-medium text-success">
              Event ended
            </p>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {queue.requests.length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-4">
          {queue.requests.map((request) => {
            const currentAction =
              actionState?.requestId === request.id
                ? actionState.action
                : null;

            const isBusy = currentAction !== null;
            const hasCompletedTransaction =
              Boolean(completedTxHashes[request.id]);

            return (
              <div
                key={request.id}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {attendeeName(request)}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.attendee.email}
                  </p>

                  {request.attendee.linkedWallet && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {request.attendee.linkedWallet}
                    </p>
                  )}

                  {hasCompletedTransaction && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Blockchain transaction confirmed.
                      Retry will only sync the result.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex gap-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={() =>
                      void handleAction(
                        request,
                        "approve"
                      )
                    }
                  >
                    <span
                      className="flex items-center justify-center gap-2"
                      aria-live="polite"
                    >
                      {currentAction === "approve" && <Spinner />}
                      {currentAction === "approve"
                        ? "Approving..."
                        : hasCompletedTransaction
                          ? "Retry sync"
                          : "Accept"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={
                      isBusy ||
                      hasCompletedTransaction
                    }
                    onClick={() =>
                      void handleAction(
                        request,
                        "deny"
                      )
                    }
                  >
                    <span
                      className="flex items-center justify-center gap-2"
                      aria-live="polite"
                    >
                      {currentAction === "deny" && <Spinner />}
                      {currentAction === "deny"
                        ? "Refunding..."
                        : "Deny"}
                    </span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
