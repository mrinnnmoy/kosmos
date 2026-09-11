"use client";

import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { Spinner } from "@/components/ui/Spinner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useConnectWallet,
  usePrivy,
} from "@privy-io/react-auth";
import {
  createPublicClient,
  http,
  isAddress,
  parseEther,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { EventEscrowAbi } from "@kosmos/shared";

import { useKosmosWalletClient } from "@/hooks/useWalletClient";
import { Button } from "@/components/ui/Button";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

interface CancelJoinButtonProps {
  joinRequestId: string;
  escrowAddress: string | null;
  attendeeWalletAddress: string | null;
  price: string;
  onCancelled?: () => void;
}

export function CancelJoinButton({
  joinRequestId,
  escrowAddress,
  attendeeWalletAddress,
  price,
  onCancelled,
}: CancelJoinButtonProps) {
  const { getAccessToken } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const getWalletClient = useKosmosWalletClient();
  const router = useRouter();

  const [status, setStatus] = useState<
    "idle" | "cancelling" | "done"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const isPaid = parseEther(price) > BigInt(0);

  async function getRequiredWalletClient() {
    if (
      !attendeeWalletAddress ||
      !isAddress(attendeeWalletAddress)
    ) {
      throw new Error(
        "Your linked Ethereum wallet is not configured"
      );
    }

    try {
      return await getWalletClient(attendeeWalletAddress);
    } catch {
      await connectWallet({
        walletChainType: "ethereum-only",
        description:
          "Connect the wallet linked to your Kosmos account",
      });

      return getWalletClient(attendeeWalletAddress);
    }
  }

  async function syncCancellation(txHash?: `0x${string}`) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error("Unable to get authentication token");
    }

    const response = await fetch(
      `/api/join/${joinRequestId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash,
        }),
      }
    );

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        body?.message ?? "Failed to cancel join request"
      );
    }
  }

  async function cancel() {
    setStatus("cancelling");
    setError(null);

    try {
      if (!isPaid) {
        await syncCancellation();
        setStatus("done");
        toast.success("Event cancelled", {
          description: isPaid
            ? "Your spot was cancelled and your payment was refunded."
            : "Your spot was cancelled successfully.",
        });
        onCancelled?.();
        router.refresh();
        return;
      }

      if (!escrowAddress || !isAddress(escrowAddress)) {
        throw new Error("Event escrow is not configured");
      }

      const walletClient = await getRequiredWalletClient();

      const attendeeAddress =
        attendeeWalletAddress as Address;

      const currentStatus = await publicClient.readContract({
        address: escrowAddress as Address,
        abi: EventEscrowAbi,
        functionName: "statusOf",
        args: [attendeeAddress],
      });

      if (currentStatus === 4) {
        await syncCancellation();
        setStatus("done");
        toast.success("Event cancelled", {
          description: isPaid
            ? "Your spot was cancelled and your payment was refunded."
            : "Your spot was cancelled successfully.",
        });
        onCancelled?.();
        router.refresh();
        return;
      }

      if (currentStatus !== 2) {
        throw new Error(
          "This attendee is not approved on-chain"
        );
      }

      const { request } =
        await publicClient.simulateContract({
          account: attendeeAddress,
          address: escrowAddress as Address,
          abi: EventEscrowAbi,
          functionName: "cancelByAttendee",
          args: [],
        });

      const hash = await walletClient.writeContract(request);

      const receipt =
        await publicClient.waitForTransactionReceipt({
          hash,
        });

      if (receipt.status !== "success") {
        throw new Error(
          "Cancellation transaction failed"
        );
      }

      await syncCancellation(hash);
      setStatus("done");
      toast.success("Event cancelled", {
        description: "Your spot was cancelled and your payment was refunded.",
      });
      onCancelled?.();
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Cancellation failed"
      );
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <p className="text-xs text-muted-foreground">
        Cancellation complete.
      </p>
    );
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="danger"
        onClick={cancel}
        disabled={status === "cancelling"}
      >
        <span
          className="flex items-center justify-center gap-2"
          aria-live="polite"
        >
          {status === "cancelling" && <Spinner />}
          {status === "cancelling"
            ? "Cancelling..."
            : "Cancel"}
        </span>
      </Button>

      {error && (
        <div className="mt-2">
          <ErrorBanner message={error} />
        </div>
      )}
    </div>
  );
}
