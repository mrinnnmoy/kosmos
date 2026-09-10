"use client";

import { usePrivy } from "@privy-io/react-auth";

import { useState } from "react";
import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";

const WORLD_ACTION = "join-kosmos-event";

type SelfieCheckButtonProps = {
  eventId: string;
  walletAddress: string;
};

export function SelfieCheckButton({
  eventId,
  walletAddress,
}: SelfieCheckButtonProps) {
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID as
    | `app_${string}`
    | undefined;

  async function startVerification() {
    if (!appId) {
      setError("World ID is not configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/world-id/rp-signature", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: WORLD_ACTION,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not create World ID verification request");
      }

      const data = await response.json();

      setRpContext({
        rp_id: process.env.NEXT_PUBLIC_WORLD_RP_ID!,
        nonce: data.nonce,
        created_at: data.created_at,
        expires_at: data.expires_at,
        signature: data.sig,
      });

      setOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start World ID verification"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(result: IDKitResult) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error("Could not get an access token.");
    }

    const response = await fetch("/api/verify-selfie", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        idkitResponse: result,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);

      throw new Error(
        body?.message ?? "World ID verification failed"
      );
    }
  }

  function handleSuccess() {
    setVerified(true);
    setError(null);
  }

  if (verified) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-emerald-500/15 px-4 py-3 font-medium text-emerald-400"
      >
        Continue to join
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={startVerification}
        disabled={loading || !walletAddress}
        className="w-full cursor-pointer rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Preparing verification..." : "Join"}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      ) : null}

      {rpContext && appId ? (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={appId}
          action={WORLD_ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={selfieCheckLegacy({
            signal: walletAddress.toLowerCase(),
          })}
          environment={
            process.env.NODE_ENV === "production"
              ? "production"
              : "staging"
          }
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={(errorCode) => {
            console.error("World ID error", errorCode);
          }}
        />
      ) : null}
    </>
  );
}
