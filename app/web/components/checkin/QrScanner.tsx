"use client";

import { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

const CONTAINER_ID = "qr-reader";

export function QrScanner({
  onScan,
}: {
  onScan: (decodedText: string) => void;
}) {
  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let started = false;
    let disposed = false;

    const startTimer = window.setTimeout(() => {
      if (disposed) {
        return;
      }

      scanner = new Html5Qrcode(CONTAINER_ID);

      scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {
            // "No QR found" is expected while scanning.
          }
        )
        .then(async () => {
          started = true;

          if (disposed && scanner) {
            try {
              await scanner.stop();
              scanner.clear();
            } catch {
              // Component was already disposed while camera started.
            }
          }
        })
        .catch((error) => {
          if (!disposed) {
            console.error(
              "Failed to start QR scanner",
              error
            );
          }
        });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);

      if (!scanner || !started) {
        return;
      }

      const current = scanner;

      void current
        .stop()
        .then(() => {
          current.clear();
        })
        .catch(() => {
          // Scanner may already have stopped during teardown.
        });
    };
  }, [onScan]);

  return (
    <div
      id={CONTAINER_ID}
      className="mx-auto w-full max-w-sm overflow-hidden rounded-xl"
    />
  );
}
