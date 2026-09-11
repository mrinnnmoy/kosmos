import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  createPublicClient,
  http,
  isAddress,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";

import { EventEscrowAbi } from "@kosmos/shared";
import { db } from "@/lib/db";
import { users, events } from "@/lib/db/schema";
import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

function isTransactionHash(value: unknown): value is Hex {
  return (
    typeof value === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(value)
  );
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  return NextResponse.json(
    { message: `Get event ${id} — coming in Commit 14` },
    { status: 501 }
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [host] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id));

  const [event] = await db.select().from(events).where(eq(events.id, id));

  if (!event || !host || event.hostId !== host.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  if (body.status === "ended") {
    if (event.status !== "live") {
      return NextResponse.json(
        { message: "Event must be live to end" },
        { status: 400 }
      );
    }

    if (
      !event.escrowContractAddress ||
      !isAddress(event.escrowContractAddress)
    ) {
      return NextResponse.json(
        { message: "Event escrow contract is not configured" },
        { status: 400 }
      );
    }

    if (!host.linkedWallet || !isAddress(host.linkedWallet)) {
      return NextResponse.json(
        { message: "Host linked wallet is not configured" },
        { status: 400 }
      );
    }

    const { payoutTxHash, mintTxHash } = body;

    if (
      !isTransactionHash(payoutTxHash) ||
      !isTransactionHash(mintTxHash)
    ) {
      return NextResponse.json(
        {
          message:
            "Valid payoutTxHash and mintTxHash are required",
        },
        { status: 400 }
      );
    }

    let payoutReceipt;
    let mintReceipt;
    let payoutTransaction;
    let mintTransaction;

    try {
      [
        payoutReceipt,
        mintReceipt,
        payoutTransaction,
        mintTransaction,
      ] = await Promise.all([
        publicClient.getTransactionReceipt({
          hash: payoutTxHash,
        }),
        publicClient.getTransactionReceipt({
          hash: mintTxHash,
        }),
        publicClient.getTransaction({
          hash: payoutTxHash,
        }),
        publicClient.getTransaction({
          hash: mintTxHash,
        }),
      ]);
    } catch {
      return NextResponse.json(
        { message: "End-event transactions are not confirmed" },
        { status: 400 }
      );
    }

    if (
      payoutReceipt.status !== "success" ||
      mintReceipt.status !== "success"
    ) {
      return NextResponse.json(
        { message: "End-event transactions failed" },
        { status: 400 }
      );
    }

    const expectedHost = host.linkedWallet.toLowerCase();

    if (
      payoutTransaction.from.toLowerCase() !== expectedHost ||
      mintTransaction.from.toLowerCase() !== expectedHost
    ) {
      return NextResponse.json(
        {
          message:
            "End-event transactions were not sent by the host wallet",
        },
        { status: 400 }
      );
    }

    const eventEnded = await publicClient.readContract({
      address: event.escrowContractAddress,
      abi: EventEscrowAbi,
      functionName: "eventEnded",
    });

    if (!eventEnded) {
      return NextResponse.json(
        {
          message:
            "Escrow does not report the event as ended",
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(events)
      .set({ status: "ended" })
      .where(eq(events.id, id))
      .returning();

    return NextResponse.json(updated);
  }

  if (body.status === "live") {
    if (event.status !== "upcoming") {
      return NextResponse.json(
        { message: "Event must be upcoming to start" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(events)
      .set({ status: "live" })
      .where(eq(events.id, id))
      .returning();

    return NextResponse.json(updated);
  }

  const { escrowContractAddress } = body;

  if (!escrowContractAddress) {
    return NextResponse.json(
      { message: "escrowContractAddress is required" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(events)
    .set({
      escrowContractAddress,
      status: "upcoming",
    })
    .where(eq(events.id, id))
    .returning();

  return NextResponse.json(updated);
}
