"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePrivy } from "@privy-io/react-auth";
import { createPublicClient, http, parseEventLogs } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESSES, EventEscrowFactoryAbi } from "@kosmos/shared";
import {
  createEventFormSchema,
  type CreateEventFormValues,
} from "@/lib/validation/event";
import { useKosmosWalletClient } from "@/hooks/useWalletClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export default function CreateEventPage() {
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/signin");
    }
  }, [ready, authenticated, router]);
  const getWalletClient = useKosmosWalletClient();

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [step, setStep] = useState<
    "idle" | "saving" | "deploying" | "finalizing"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      requiresApproval: false,
    },
  });

  async function onSubmit(values: CreateEventFormValues) {
    setError(null);

    try {
      // 1. Save details + upload the cover image
      setStep("saving");

      const token = await getAccessToken();

      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description ?? "");
      formData.append("location", values.location ?? "");
      formData.append("startsAt", values.startsAt);
      formData.append("endsAt", values.endsAt);
      formData.append("price", String(values.price));
      formData.append(
        "capacity",
        values.capacity ? String(values.capacity) : ""
      );
      formData.append("requiresApproval", String(values.requiresApproval));

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      const createRes = await fetch("/api/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!createRes.ok) {
        throw new Error("Failed to save event details");
      }

      const event = await createRes.json();

      // 2. Deploy escrow from the host's wallet
      setStep("deploying");

      const walletClient = await getWalletClient();

      const startTime = BigInt(
        Math.floor(new Date(values.startsAt).getTime() / 1000)
      );
      const endTime = BigInt(
        Math.floor(new Date(values.endsAt).getTime() / 1000)
      );

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.sepolia.eventEscrowFactory as `0x${string}`,
        abi: EventEscrowFactoryAbi,
        functionName: "createEscrow",
        args: [startTime, endTime],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      const [log] = parseEventLogs({
        abi: EventEscrowFactoryAbi,
        eventName: "EscrowCreated",
        logs: receipt.logs,
      });

      const escrowAddress = log.args.escrow as string;

      // 3. Link escrow back to the event
      setStep("finalizing");

      const finalizeRes = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          escrowContractAddress: escrowAddress,
        }),
      });

      if (!finalizeRes.ok) {
        throw new Error("Event created but failed to link escrow");
      }
      toast.success("Event created successfully");
      toast.success("Event created successfully");
      router.push(`/discover/${event.id}`);
    } catch (err) {
      const rejected =
        err instanceof Error && /user rejected|user denied/i.test(err.message);

      if (rejected) {
        toast.info("Transaction cancelled. Your event was saved as a draft.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while creating the event."
        );
      }

      setStep("idle");
    }
  }

  if (!ready || !authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-heading text-2xl font-bold">Create an event</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium">Event name</label>
          <Input
            {...register("name")}
            className="mt-1"
            placeholder="Kosmos Demo Night"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Cover image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full rounded-lg border border-border bg-surface text-sm text-muted-foreground file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Start</label>
            <Input
              type="datetime-local"
              {...register("startsAt")}
              className="mt-1"
            />
            {errors.startsAt && (
              <p className="mt-1 text-xs text-danger">
                {errors.startsAt.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">End</label>
            <Input
              type="datetime-local"
              {...register("endsAt")}
              className="mt-1"
            />
            {errors.endsAt && (
              <p className="mt-1 text-xs text-danger">
                {errors.endsAt.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Location</label>
          <Input
            {...register("location")}
            className="mt-1"
            placeholder="Offline location or virtual link"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            {...register("description")}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="What's this event about?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Price (ETH)</label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              {...register("price")}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Capacity (blank = unlimited)
            </label>
            <Input
              type="number"
              min="1"
              {...register("capacity")}
              className="mt-1"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("requiresApproval")}
            className="h-4 w-4 rounded border-border"
          />
          Require host approval to join
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={step !== "idle"} className="w-full">
          {step === "idle" && "Create Event"}
          {step === "saving" && "Saving details..."}
          {step === "deploying" && "Confirm in your wallet..."}
          {step === "finalizing" && "Finishing up..."}
        </Button>
      </form>
    </main>
  );
}
