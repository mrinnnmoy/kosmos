import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  decodeEventLog,
  http,
  isAddress,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { EventEscrowAbi } from "@kosmos/shared";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { txHash } = (await request.json()) as {
    txHash?: string;
  };

  const [caller] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (!caller) {
    return NextResponse.json(
      { message: "User profile not found" },
      { status: 404 }
    );
  }

  const [joinRequest] = await db
    .select()
    .from(joinRequests)
    .where(eq(joinRequests.id, id))
    .limit(1);

  if (!joinRequest) {
    return NextResponse.json(
      { message: "Join request not found" },
      { status: 404 }
    );
  }

  if (joinRequest.userId !== caller.id) {
    return NextResponse.json(
      { message: "You can only cancel your own request" },
      { status: 403 }
    );
  }

  if (joinRequest.status !== "approved") {
    return NextResponse.json(
      { message: "Only approved requests can be cancelled" },
      { status: 400 }
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, joinRequest.eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json(
      { message: "Event not found" },
      { status: 404 }
    );
  }

  const isPaid = parseEther(event.price) > BigInt(0);

  if (!isPaid) {
    if (new Date(event.startsAt) <= new Date()) {
      return NextResponse.json(
        {
          message:
            "Too late to cancel — the event has already started",
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(joinRequests)
      .set({ status: "cancelled" })
      .where(eq(joinRequests.id, id))
      .returning();

    return NextResponse.json(updated);
  }

  if (!caller.linkedWallet || !isAddress(caller.linkedWallet)) {
    return NextResponse.json(
      { message: "Attendee wallet is not configured" },
      { status: 400 }
    );
  }

  if (
    !event.escrowContractAddress ||
    !isAddress(event.escrowContractAddress)
  ) {
    return NextResponse.json(
      { message: "Event escrow is not configured" },
      { status: 500 }
    );
  }

  if (txHash) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json(
        { message: "A valid transaction hash is required" },
        { status: 400 }
      );
    }

    let receipt;

    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: txHash as Hex,
      });
    } catch {
      return NextResponse.json(
        { message: "Cancellation transaction was not found" },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        { message: "Cancellation transaction failed" },
        { status: 400 }
      );
    }

    if (
      receipt.from.toLowerCase() !==
      caller.linkedWallet.toLowerCase()
    ) {
      return NextResponse.json(
        {
          message:
            "Cancellation transaction sender is not the attendee",
        },
        { status: 400 }
      );
    }

    let refundedAttendee: Address | null = null;
    let refundReason: number | null = null;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() !==
        event.escrowContractAddress.toLowerCase()
      ) {
        continue;
      }

      try {
        const decoded = decodeEventLog({
          abi: EventEscrowAbi,
          data: log.data,
          topics: log.topics,
        });

        if (
          decoded.eventName === "Refunded" &&
          "attendee" in decoded.args &&
          "reason" in decoded.args
        ) {
          refundedAttendee =
            decoded.args.attendee as Address;
          refundReason = Number(decoded.args.reason);
          break;
        }
      } catch {
        // Ignore unrelated escrow logs.
      }
    }

    if (
      !refundedAttendee ||
      refundedAttendee.toLowerCase() !==
        caller.linkedWallet.toLowerCase() ||
      refundReason !== 4
    ) {
      return NextResponse.json(
        {
          message:
            "Cancellation transaction does not match this attendee",
        },
        { status: 400 }
      );
    }
  }

  const escrowStatus = await publicClient.readContract({
    address: event.escrowContractAddress as Address,
    abi: EventEscrowAbi,
    functionName: "statusOf",
    args: [caller.linkedWallet as Address],
  });

  if (escrowStatus !== 4) {
    return NextResponse.json(
      {
        message:
          "Escrow does not show this attendee as cancelled",
      },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(joinRequests)
    .set({ status: "cancelled" })
    .where(eq(joinRequests.id, id))
    .returning();

  return NextResponse.json(updated);
}
