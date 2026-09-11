"use client";

import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { Spinner } from "@/components/ui/Spinner";

import { usePrivy } from "@privy-io/react-auth";
import { useRef, useState } from "react";
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
  onVerified: (
    nullifier: string,
    idkitResponse: IDKitResult
  ) => void;
};

export function SelfieCheckButton({
  eventId,
  walletAddress,
  onVerified,
}: SelfieCheckButtonProps) {
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifiedNullifierRef = useRef<string | null>(null);
  const verifiedResultRef = useRef<IDKitResult | null>(null);

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

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        body?.message ?? "World ID verification failed"
      );
    }

    if (!body?.nullifier) {
      throw new Error("World ID verification did not return a nullifier");
    }

    verifiedNullifierRef.current = body.nullifier;
    verifiedResultRef.current = result;
  }

  function handleSuccess() {
    const nullifier = verifiedNullifierRef.current;
    const idkitResponse = verifiedResultRef.current;

    if (!nullifier || !idkitResponse) {
      setError("World ID verification result is missing");
      return;
    }

    setVerified(true);
    setError(null);
    onVerified(nullifier, idkitResponse);
  }

  if (verified) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={startVerification}
        disabled={loading || !walletAddress}
        className="w-full cursor-pointer rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className="flex items-center justify-center gap-2"
          aria-live="polite"
        >
          {loading && <Spinner />}
          {loading ? "Preparing verification..." : "Join"}
        </span>
      </button>

      {error ? (
        <div className="mt-2">
          <ErrorBanner message={error} />
        </div>
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
