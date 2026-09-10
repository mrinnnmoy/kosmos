import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

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

  if (!host) {
    return NextResponse.json(
      { message: "User profile not found" },
      { status: 404 }
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event || event.hostId !== host.id) {
    return NextResponse.json(
      { message: "Not found" },
      { status: 404 }
    );
  }

  const requests = await db
    .select({
      id: joinRequests.id,
      status: joinRequests.status,
      paymentTxHash: joinRequests.paymentTxHash,
      createdAt: joinRequests.createdAt,
      attendee: {
        id: users.id,
        email: users.email,
        linkedWallet: users.linkedWallet,
        ensSubname: users.ensSubname,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(
      and(
        eq(joinRequests.eventId, id),
        eq(joinRequests.status, "pending")
      )
    );

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      price: event.price,
      escrowContractAddress: event.escrowContractAddress,
    },
    requests,
  });
}
