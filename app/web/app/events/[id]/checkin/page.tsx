"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

import { QrScanner } from "@/components/checkin/QrScanner";

type EventInfo = {
  id: string;
  name: string;
  status: "draft" | "upcoming" | "live" | "ended" | "cancelled";
};

export default function CheckInPage() {
  const params = useParams<{ id: string }>();
  const { ready, authenticated, getAccessToken } = usePrivy();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!authenticated) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    const loadEvent = async () => {
      try {
        const token = await getAccessToken();

        if (!token) {
          throw new Error("Unable to get authentication token");
        }

        const response = await fetch(
          `/api/events/${params.id}/join-requests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          if (response.status === 404 || response.status === 403) {
            throw new Error(
              "Only the host can check attendees in."
            );
          }

          throw new Error(
            body?.message ?? "Failed to load event"
          );
        }

        setEvent(body.event as EventInfo);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load event"
        );
      } finally {
        setLoading(false);
      }
    };

    void loadEvent();
  }, [
    ready,
    authenticated,
    getAccessToken,
    params.id,
  ]);

  const handleScan = useCallback(
    async (ticketId: string) => {
      if (processingRef.current) {
        return;
      }

      processingRef.current = true;

      try {
        const token = await getAccessToken();

        if (!token) {
          throw new Error(
            "Unable to get authentication token"
          );
        }

        const response = await fetch(
          `/api/checkin/${encodeURIComponent(ticketId)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const body = await response.json().catch(() => null);

        const name =
          [
            body?.attendee?.firstName,
            body?.attendee?.lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          body?.attendee?.ensSubname ||
          body?.attendee?.email;

        const message =
          body?.message ??
          (response.ok ? "Checked in" : "Check-in failed");

        const description = name
          ? `${name} — ${message}`
          : message;

        if (response.ok) {
          toast.success(
            name
              ? `${name} checked in successfully. ✅`
              : "Checked in successfully. ✅"
          );
        } else if (response.status === 409) {
          toast.info(
            name
              ? `${name} has already checked in. ✅`
              : "Already checked in. ✅"
          );
        } else {
          toast.error(description);
        }
      } catch {
        toast.error("Scan failed — try again");
      } finally {
        window.setTimeout(() => {
          processingRef.current = false;
        }, 2000);
      }
    },
    [getAccessToken]
  );

  if (!ready || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-muted-foreground">
          Loading check-in...
        </p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-muted-foreground">
          Sign in to check attendees in.
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="text-danger">{error}</p>
      </main>
    );
  }

  if (!event) {
    return null;
  }

  if (event.status !== "live") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">
          This event hasn&apos;t started yet. Start it from the{" "}
          <a
            href={`/events/${params.id}/manage`}
            className="text-primary underline"
          >
            manage page
          </a>{" "}
          to enable check-in.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center font-heading text-xl font-semibold text-foreground">
        Check in: {event.name}
      </h1>

      <div className="mt-6">
        <QrScanner onScan={handleScan} />
      </div>
    </main>
  );
}
