import { and, eq } from "drizzle-orm";
import { isAddress } from "viem";
import { NextResponse } from "next/server";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";
import { uploadJSONToIPFS } from "@/lib/ipfs/upload";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const { id: eventId } = await params;

  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const [host] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event || !host || event.hostId !== host.id) {
    return NextResponse.json(
      { message: "Only the host can end this event" },
      { status: 403 }
    );
  }

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

  const approved = await db
    .select({
      linkedWallet: users.linkedWallet,
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(
      and(
        eq(joinRequests.eventId, eventId),
        eq(joinRequests.status, "approved")
      )
    );

  const checkedIn = await db
    .select({
      linkedWallet: users.linkedWallet,
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(
      and(
        eq(joinRequests.eventId, eventId),
        eq(joinRequests.status, "checked_in")
      )
    );

  const payoutRows = [...approved, ...checkedIn];

  const invalidPayoutWallet = payoutRows.some(
    ({ linkedWallet }) =>
      !linkedWallet || !isAddress(linkedWallet)
  );

  const invalidMintWallet = checkedIn.some(
    ({ linkedWallet }) =>
      !linkedWallet || !isAddress(linkedWallet)
  );

  if (invalidPayoutWallet || invalidMintWallet) {
    return NextResponse.json(
      {
        message:
          "Every attendee must have a valid linked Ethereum wallet",
      },
      { status: 400 }
    );
  }

  const payoutWallets = payoutRows.map(
    ({ linkedWallet }) => linkedWallet!
  );

  const mintWallets = checkedIn.map(
    ({ linkedWallet }) => linkedWallet!
  );

  const metadata = {
    name: event.name,
    description: `Proof of attendance for ${event.name}, hosted on Kosmos.`,
    ...(event.coverImageCid
      ? { image: `ipfs://${event.coverImageCid}` }
      : {}),
    attributes: [
      {
        trait_type: "Event",
        value: event.name,
      },
      {
        trait_type: "Date",
        value: new Date(event.startsAt).toISOString(),
      },
    ],
  };

  const metadataCid = await uploadJSONToIPFS(metadata);

  return NextResponse.json({
    payoutWallets,
    mintWallets,
    metadataCid,
  });
}
