"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Spinner } from "@/components/ui/Spinner";

export function TicketQrButton({
  ticketId,
  eventName,
  checkedIn = false,
}: {
  ticketId: string;
  eventName: string;
  checkedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || qrCode) {
      return;
    }

    let cancelled = false;

    async function generateQrCode() {
      setError(null);

      try {
        const dataUrl = await QRCode.toDataURL(ticketId, {
          width: 400,
          margin: 2,
        });

        if (!cancelled) {
          setQrCode(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to generate your ticket QR code.");
        }
      }
    }

    void generateQrCode();

    return () => {
      cancelled = true;
    };
  }, [open, qrCode, ticketId]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        View Ticket
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
          >
            <div className="text-center">
              <p
                id="ticket-dialog-title"
                className="font-heading text-xl font-semibold text-foreground"
              >
                Kosmos Ticket
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {eventName}
              </p>

              <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl bg-white p-4">
                {!qrCode && !error && (
                  <div
                    className="flex items-center gap-2 text-sm text-black"
                    aria-live="polite"
                  >
                    <Spinner />
                    Generating ticket...
                  </div>
                )}

                {qrCode && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCode}
                    alt={`QR ticket for ${eventName}`}
                    className="h-56 w-56"
                  />
                )}
              </div>

              {error && (
                <div className="mt-4 text-left">
                  <ErrorBanner message={error} />
                </div>
              )}

              <p className="mt-4 font-medium text-foreground">
                {checkedIn ? "Checked in" : "Approved"}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Show this QR code to the host at check-in.
              </p>

              <Button
                type="button"
                variant="secondary"
                className="mt-5 w-full"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
