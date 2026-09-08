"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

import { Button } from "@/components/ui/Button";

export function Navbar() {
  const { ready, authenticated, logout } = usePrivy();

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-xl font-bold">
          Kosmos
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/discover"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Discover Events
          </Link>

          {ready && authenticated ? (
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full bg-success"
                aria-label="Connected"
              />

              <Button
                size="sm"
                onClick={() => void logout()}
              >
                Log out
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/signin">
                {ready ? "Sign In" : "Loading..."}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
