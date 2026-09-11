"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { CalendarPlus, Compass } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function HomePage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/signin");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="font-heading text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-muted-foreground">
        What would you like to do?
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/create" className="group">
          <Card className="flex h-full flex-col items-start gap-3 transition group-hover:border-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <CalendarPlus className="h-5 w-5 text-primary" />
            </span>

            <h2 className="font-heading text-lg font-semibold">
              Create Event
            </h2>

            <p className="text-sm text-muted-foreground">
              Set up escrowed ticketing for your own event in a few minutes.
            </p>

            <span className="mt-auto text-sm font-medium text-primary">
              Create Event &rarr;
            </span>
          </Card>
        </Link>

        <Link href="/discover" className="group">
          <Card className="flex h-full flex-col items-start gap-3 transition group-hover:border-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <Compass className="h-5 w-5 text-primary" />
            </span>

            <h2 className="font-heading text-lg font-semibold">
              Join Event
            </h2>

            <p className="text-sm text-muted-foreground">
              Browse events happening around you and request to join.
            </p>

            <span className="mt-auto text-sm font-medium text-primary">
              Discover Events &rarr;
            </span>
          </Card>
        </Link>
      </div>
    </main>
  );
}
