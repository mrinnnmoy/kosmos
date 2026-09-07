"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy, type User } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

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

  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const externalEthereumWallet = user?.linkedAccounts.find(
    isExternalEthereumWallet
  );

  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !externalEthereumWallet ||
      syncingRef.current
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

        router.replace("/home");
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while signing in."
        );

        syncingRef.current = false;
        setSyncing(false);
      }
    }

    void syncUser();
  }, [ready, authenticated, externalEthereumWallet, getAccessToken, router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Loading Kosmos...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-primary">Kosmos</p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to Kosmos
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign in with your email and link an external Ethereum wallet to
            continue.
          </p>
        </div>

        {!authenticated ? (
          <button
            type="button"
            onClick={() => login()}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continue with email
          </button>
        ) : !externalEthereumWallet ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your email is verified. Link your external Ethereum wallet to
              finish signing in.
            </p>

            <button
              type="button"
              onClick={() =>
                linkWallet({
                  walletChainType: "ethereum-only",
                })
              }
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Link wallet
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Wallet linked successfully.
            </p>

            <p className="break-all font-mono text-xs text-foreground">
              {externalEthereumWallet.address}
            </p>

            {syncing && (
              <p className="text-sm text-muted-foreground">
                Setting up your Kosmos account...
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-5 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}
