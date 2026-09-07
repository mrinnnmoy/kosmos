import {
  Coins,
  Lock,
  QrCode,
  ScanFace,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/Card";

const steps = [
  {
    icon: Lock,
    title: "Deposit into escrow",
    description:
      "Your ticket payment is locked on-chain instead of going directly to the organizer.",
  },
  {
    icon: ScanFace,
    title: "Verify with Selfie Check",
    description:
      "Prove you are a real attendee with a privacy-preserving identity check.",
  },
  {
    icon: Coins,
    title: "Pay in any token",
    description:
      "Use supported tokens while Kosmos handles the payment flow behind the scenes.",
  },
  {
    icon: QrCode,
    title: "Check in at the door",
    description:
      "Present your ticket at the venue and get verified when you arrive.",
  },
  {
    icon: Sparkles,
    title: "Walk away with an NFT",
    description:
      "After the event, receive an NFT ticket as permanent proof you were there.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-20 sm:py-24">
        <div className="w-full">
          <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">How it works</p>

          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            From payment to proof of attendance.
          </h2>

          <p className="mt-4 text-muted-foreground">
            Kosmos keeps the ticketing flow simple while escrow, identity
            verification, check-in, and NFT ownership work underneath.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Card key={step.title} className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>

                  <span className="text-xs font-medium text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="mt-5 font-heading text-lg font-semibold">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </Card>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
