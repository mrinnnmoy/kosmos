import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { joinRequests, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
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

  const [attendee] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (!attendee) {
    return NextResponse.json(
      { message: "User profile not found" },
      { status: 404 }
    );
  }

  const [joinRequest] = await db
    .select({
      status: joinRequests.status,
      ticketId: joinRequests.ticketId,
    })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.eventId, eventId),
        eq(joinRequests.userId, attendee.id)
      )
    )
    .limit(1);

  return NextResponse.json({
    status: joinRequest?.status ?? null,
    ticketId: joinRequest?.ticketId ?? null,
  });
}
