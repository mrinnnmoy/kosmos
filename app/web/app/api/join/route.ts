import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  decodeEventLog,
  isAddress,
  parseEther,
  http,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { EventEscrowAbi } from "@kosmos/shared";
import {
  hashSignal,
  type IDKitResult,
} from "@worldcoin/idkit-core";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";
import {
  sendPaymentConfirmationEmail,
  sendQRTicketEmail,
} from "@/lib/email/notifications";
import { verifyWorldIdProof } from "@/lib/worldid/verify";

const WORLD_ACTION = "join-kosmos-event";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function POST(request: Request) {
  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const externalEthereumWallet = privyUser.linked_accounts.find(
    (account) =>
      account.type === "wallet" &&
      "chain_type" in account &&
      account.chain_type === "ethereum" &&
      (!("connector_type" in account) ||
        account.connector_type !== "embedded") &&
      (!("wallet_client_type" in account) ||
        (account.wallet_client_type !== "privy" &&
          account.wallet_client_type !== "privy-v2"))
  );

  if (
    !externalEthereumWallet ||
    externalEthereumWallet.type !== "wallet" ||
    !("address" in externalEthereumWallet) ||
    !isAddress(externalEthereumWallet.address)
  ) {
    return NextResponse.json(
      { message: "An external Ethereum wallet is required" },
      { status: 400 }
    );
  }

  const walletAddress =
    externalEthereumWallet.address.toLowerCase();

  const { eventId, idkitResponse, paymentTxHash } =
    (await request.json()) as {
      eventId?: string;
      idkitResponse?: IDKitResult;
      paymentTxHash?: string;
    };

  if (!eventId || !idkitResponse) {
    return NextResponse.json(
      { message: "eventId and idkitResponse are required" },
      { status: 400 }
    );
  }

  if (
    !("action" in idkitResponse) ||
    idkitResponse.action !== WORLD_ACTION
  ) {
    return NextResponse.json(
      { message: "Invalid World ID action" },
      { status: 400 }
    );
  }

  try {
    await verifyWorldIdProof(idkitResponse);
  } catch (error) {
    console.error("World ID join verification failed", error);

    return NextResponse.json(
      { message: "Proof verification failed" },
      { status: 400 }
    );
  }

  const firstResponse = idkitResponse.responses?.[0];

  if (!firstResponse || !("nullifier" in firstResponse)) {
    return NextResponse.json(
      { message: "No nullifier in proof response" },
      { status: 400 }
    );
  }

  const expectedSignalHash = hashSignal(walletAddress);

  if (
    !firstResponse.signal_hash ||
    firstResponse.signal_hash.toLowerCase() !==
      expectedSignalHash.toLowerCase()
  ) {
    return NextResponse.json(
      { message: "World ID signal does not match wallet" },
      { status: 400 }
    );
  }

  const rawNullifier = firstResponse.nullifier;

  if (!rawNullifier) {
    return NextResponse.json(
      { message: "No nullifier in proof response" },
      { status: 400 }
    );
  }

  let canonicalNullifier: string;

  try {
    canonicalNullifier = BigInt(rawNullifier).toString(10);
  } catch {
    return NextResponse.json(
      { message: "Invalid nullifier in proof response" },
      { status: 400 }
    );
  }

  const [attendee] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (!attendee) {
    return NextResponse.json(
      { message: "User profile not found" },
      { status: 404 }
    );
  }

  if (
    !attendee.linkedWallet ||
    attendee.linkedWallet.toLowerCase() !== walletAddress
  ) {
    return NextResponse.json(
      { message: "Authenticated wallet does not match your profile" },
      { status: 400 }
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return NextResponse.json(
      { message: "Event not found" },
      { status: 404 }
    );
  }

  if (event.hostId === attendee.id) {
    return NextResponse.json(
      { message: "Event hosts cannot join their own event" },
      { status: 400 }
    );
  }

  let expectedAmount: bigint;

  try {
    expectedAmount = parseEther(event.price);
  } catch {
    return NextResponse.json(
      { message: "Invalid event price" },
      { status: 500 }
    );
  }

  const isPaid = expectedAmount > BigInt(0);

  const [existingForUser] = await db
    .select()
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.eventId, eventId),
        eq(joinRequests.userId, attendee.id)
      )
    )
    .limit(1);

  if (existingForUser) {
    if (existingForUser.status !== "cancelled") {
      return NextResponse.json(
        { message: "You have already requested to join this event" },
        { status: 409 }
      );
    }

    if (isPaid) {
      return NextResponse.json(
        {
          message:
            "Paid events cannot be rejoined after cancellation with this escrow",
        },
        { status: 409 }
      );
    }
  }

  const [existingNullifier] = await db
    .select()
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.eventId, eventId),
        eq(
          joinRequests.selfieCheckNullifier,
          canonicalNullifier
        )
      )
    )
    .limit(1);

  if (
    existingNullifier &&
    existingNullifier.id !== existingForUser?.id
  ) {
    return NextResponse.json(
      { message: "This person has already requested to join this event" },
      { status: 409 }
    );
  }
  let verifiedPaymentTxHash: string | null = null;

  if (isPaid) {
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
      !paymentTxHash ||
      !/^0x[0-9a-fA-F]{64}$/.test(paymentTxHash)
    ) {
      return NextResponse.json(
        { message: "A valid payment transaction hash is required" },
        { status: 400 }
      );
    }

    let receipt;

    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: paymentTxHash as Hex,
      });
    } catch {
      return NextResponse.json(
        { message: "Payment transaction was not found" },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        { message: "Payment transaction failed" },
        { status: 400 }
      );
    }

    if (receipt.from.toLowerCase() !== walletAddress) {
      return NextResponse.json(
        { message: "Payment sender does not match authenticated wallet" },
        { status: 400 }
      );
    }

    let depositedAmount: bigint | null = null;

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
          decoded.eventName === "Deposited" &&
          "attendee" in decoded.args &&
          "amount" in decoded.args
        ) {
          const depositedAttendee =
            decoded.args.attendee as Address;
          const amount = decoded.args.amount as bigint;

          if (
            depositedAttendee.toLowerCase() === walletAddress
          ) {
            depositedAmount = amount;
            break;
          }
        }
      } catch {
        // Ignore unrelated escrow logs.
      }
    }

    if (depositedAmount === null) {
      return NextResponse.json(
        { message: "No matching escrow deposit was found" },
        { status: 400 }
      );
    }

    if (depositedAmount < expectedAmount) {
      return NextResponse.json(
        { message: "Escrow deposit is below the event price" },
        { status: 400 }
      );
    }

    verifiedPaymentTxHash = paymentTxHash.toLowerCase();
  }

  const [created] = existingForUser
    ? await db
        .update(joinRequests)
        .set({
          status: "pending",
          paymentTxHash: verifiedPaymentTxHash,
          selfieCheckNullifier: canonicalNullifier,
          ticketId: null,
        })
        .where(eq(joinRequests.id, existingForUser.id))
        .returning()
    : await db
        .insert(joinRequests)
        .values({
          eventId,
          userId: attendee.id,
          status: "pending",
          paymentTxHash: verifiedPaymentTxHash,
          selfieCheckNullifier: canonicalNullifier,
        })
        .returning();

  let finalJoinRequest = created;

  if (!isPaid && !event.requiresApproval) {
    const [approved] = await db
      .update(joinRequests)
      .set({
        status: "approved",
        ticketId: created.id,
      })
      .where(eq(joinRequests.id, created.id))
      .returning();

    if (!approved) {
      return NextResponse.json(
        { message: "Failed to confirm join request" },
        { status: 500 }
      );
    }

    finalJoinRequest = approved;

    try {
      await sendQRTicketEmail({
        to: attendee.email,
        attendeeName:
          [attendee.firstName, attendee.lastName]
            .filter(Boolean)
            .join(" ") || attendee.email,
        eventName: event.name,
        eventDate: event.startsAt.toISOString(),
        eventLocation: event.location ?? "TBA",
        ticketId: created.id,
      });
    } catch (error) {
      console.error("Failed to send QR ticket email", error);
    }
  }

  if (isPaid) {
    try {
      const dashboardUrl = `${
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }/dashboard`;

      await sendPaymentConfirmationEmail({
        to: attendee.email,
        attendeeName:
          [attendee.firstName, attendee.lastName]
            .filter(Boolean)
            .join(" ") || attendee.email,
        eventName: event.name,
        eventDate: event.startsAt.toISOString(),
        amount: `${event.price} ETH`,
        dashboardUrl,
      });
    } catch (error) {
      console.error(
        "Failed to send payment confirmation email",
        error
      );
    }
  }

  return NextResponse.json(finalJoinRequest, { status: 201 });
}
