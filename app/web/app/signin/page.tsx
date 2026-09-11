"use client";

import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { Spinner } from "@/components/ui/Spinner";

import { useEffect, useRef, useState } from "react";
import { usePrivy, type User } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

import type { KosmosUser } from "@kosmos/shared";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

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

export default function SignInPage() {
  const router = useRouter();

  const { ready, authenticated, user, login, linkWallet, getAccessToken } =
    usePrivy();

  const [dbUser, setDbUser] = useState<KosmosUser | null>(null);
  const [label, setLabel] = useState("");
  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncingRef = useRef(false);

  const externalEthereumWallet = user?.linkedAccounts.find(
    isExternalEthereumWallet
  );

  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !externalEthereumWallet ||
      syncingRef.current ||
      dbUser
    ) {
      return;
    }

    async function syncUser() {
      syncingRef.current = true;
      setSyncing(true);
      setError(null);

      try {
        const token = await getAccessToken();

        if (!token) {
          throw new Error("Could not get an access token.");
        }

        const response = await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.message ?? "Could not sync your account.");
        }

        const syncedUser = body as KosmosUser;
        setDbUser(syncedUser);

        if (syncedUser.ensSubname) {
          router.replace(`/${syncedUser.ensSubname}`);
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while signing in."
        );

        syncingRef.current = false;
      } finally {
        setSyncing(false);
      }
    }

    void syncUser();
  }, [
    ready,
    authenticated,
    externalEthereumWallet,
    dbUser,
    getAccessToken,
    router,
  ]);

  useEffect(() => {
    if (label.length < 3) {
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/ens/check-availability?label=${encodeURIComponent(label)}`
        );

        const body = await response.json();

        setAvailability({
          available: Boolean(body.available),
          reason: body.reason,
        });
      } catch {
        setAvailability({
          available: false,
          reason: "Could not check availability",
        });
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [label]);

  async function claimId() {
    setClaiming(true);
    setError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Could not get an access token.");
      }

      const response = await fetch("/api/ens/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message ?? "Failed to claim ID");
      }

      router.replace(`/${label}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to claim your Kosmos ID"
      );
    } finally {
      setClaiming(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Loading Kosmos...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Kosmos
        </h1>

        {!authenticated && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in with your email to get started.
            </p>

            <Button className="mt-6 w-full" onClick={() => login()}>
              Continue with email
            </Button>
          </>
        )}

        {authenticated && !externalEthereumWallet && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Your email is verified. Link an external Ethereum wallet to
              continue.
            </p>

            <Button
              className="mt-6 w-full"
              onClick={() =>
                linkWallet({
                  walletChainType: "ethereum-only",
                })
              }
            >
              Link wallet
            </Button>
          </>
        )}

        {authenticated && externalEthereumWallet && !dbUser && !error && (
          <div
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Spinner />
            <span>
              {syncing
                ? "Setting up your Kosmos account..."
                : "Preparing your account..."}
            </span>
          </div>
        )}

        {authenticated &&
          externalEthereumWallet &&
          dbUser &&
          !dbUser.ensSubname && (
            <>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Claim your Kosmos ID. This becomes{" "}
                <span className="text-foreground">yourname.kosmos.eth</span>.
              </p>

              <label htmlFor="kosmos-id" className="sr-only">
                Kosmos ID
              </label>

              <Input
                id="kosmos-id"
                className="mt-6"
                placeholder="yourname"
                value={label}
                onChange={(event) => setLabel(event.target.value.toLowerCase())}
              />

              {availability && (
                <p
                  className={`mt-2 text-xs ${
                    availability.available ? "text-success" : "text-danger"
                  }`}
                >
                  {availability.available ? "Available!" : availability.reason}
                </p>
              )}

              <Button
                className="mt-4 w-full"
                disabled={!availability?.available || claiming}
                onClick={claimId}
              >
                <span
                  className="flex items-center justify-center gap-2"
                  aria-live="polite"
                >
                  {claiming && <Spinner />}
                  {claiming ? "Claiming..." : "Claim your Kosmos ID"}
                </span>
              </Button>
            </>
          )}

        {error && (
          <div className="mt-5 text-left">
            <ErrorBanner message={error} />
          </div>
        )}
      </Card>
    </main>
  );
}
