import { and, eq } from "drizzle-orm";
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
import { sendQRTicketEmail } from "@/lib/email/notifications";

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

  const [host] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (!host) {
    return NextResponse.json(
      { message: "User profile not found" },
      { status: 404 }
    );
  }

  const [joinRequest] = await db
    .select({
      id: joinRequests.id,
      status: joinRequests.status,
      eventId: joinRequests.eventId,
      attendee: {
        id: users.id,
        email: users.email,
        linkedWallet: users.linkedWallet,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(eq(joinRequests.id, id))
    .limit(1);

  if (!joinRequest) {
    return NextResponse.json(
      { message: "Join request not found" },
      { status: 404 }
    );
  }

  if (joinRequest.status !== "pending") {
    return NextResponse.json(
      { message: "Join request is no longer pending" },
      { status: 409 }
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, joinRequest.eventId))
    .limit(1);

  if (!event || event.hostId !== host.id) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const isPaid = parseEther(event.price) > BigInt(0);

  if (isPaid) {
    if (!host.linkedWallet || !isAddress(host.linkedWallet)) {
      return NextResponse.json(
        { message: "Host wallet is not configured" },
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

    if (
      !joinRequest.attendee.linkedWallet ||
      !isAddress(joinRequest.attendee.linkedWallet)
    ) {
      return NextResponse.json(
        { message: "Attendee wallet is not configured" },
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
        { message: "Approval transaction was not found" },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        { message: "Approval transaction failed" },
        { status: 400 }
      );
    }

    if (
      receipt.from.toLowerCase() !==
      host.linkedWallet.toLowerCase()
    ) {
      return NextResponse.json(
        {
          message:
            "Approval transaction sender is not the event host",
        },
        { status: 400 }
      );
    }

    let releasedAttendee: Address | null = null;

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
          decoded.eventName === "Released" &&
          "attendee" in decoded.args
        ) {
          releasedAttendee =
            decoded.args.attendee as Address;
          break;
        }
      } catch {
        // Ignore unrelated escrow logs.
      }
    }

    if (
      !releasedAttendee ||
      releasedAttendee.toLowerCase() !==
        joinRequest.attendee.linkedWallet.toLowerCase()
    ) {
      return NextResponse.json(
        {
          message:
            "Approval transaction does not match this attendee",
        },
        { status: 400 }
      );
    }
    } else {
      const escrowStatus = await publicClient.readContract({
        address: event.escrowContractAddress as Address,
        abi: EventEscrowAbi,
        functionName: "statusOf",
        args: [
          joinRequest.attendee.linkedWallet as Address,
        ],
      });

      if (escrowStatus !== 2) {
        return NextResponse.json(
          {
            message:
              "Attendee is not approved on-chain",
          },
          { status: 400 }
        );
      }
    }
  }

  const ticketId = joinRequest.id;

  const [updated] = await db
    .update(joinRequests)
    .set({
      status: "approved",
      ticketId,
    })
    .where(
      and(
        eq(joinRequests.id, id),
        eq(joinRequests.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { message: "Join request is no longer pending" },
      { status: 409 }
    );
  }

  try {
    await sendQRTicketEmail({
      to: joinRequest.attendee.email,
      attendeeName:
        [
          joinRequest.attendee.firstName,
          joinRequest.attendee.lastName,
        ]
          .filter(Boolean)
          .join(" ") || joinRequest.attendee.email,
      eventName: event.name,
      eventDate: event.startsAt.toISOString(),
      eventLocation: event.location ?? "TBA",
      ticketId,
    });
  } catch (error) {
    console.error("Failed to send QR ticket email", error);
  }

  return NextResponse.json(updated);
}
