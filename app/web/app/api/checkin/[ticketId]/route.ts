import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events, joinRequests, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{
    ticketId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const { ticketId } = await params;

  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const [row] = await db
    .select({
      request: joinRequests,
      event: events,
      attendee: users,
    })
    .from(joinRequests)
    .innerJoin(events, eq(joinRequests.eventId, events.id))
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(eq(joinRequests.id, ticketId))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { message: "Ticket not found" },
      { status: 404 }
    );
  }

  const [host] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (!host || row.event.hostId !== host.id) {
    return NextResponse.json(
      { message: "Only the host can check in attendees" },
      { status: 403 }
    );
  }

  if (row.event.status !== "live") {
    return NextResponse.json(
      { message: "Event is not live" },
      { status: 400 }
    );
  }

  if (row.request.status === "checked_in") {
    return NextResponse.json(
      {
        message: "Already checked in",
        attendee: row.attendee,
      },
      { status: 409 }
    );
  }

  if (row.request.status !== "approved") {
    return NextResponse.json(
      {
        message: `Invalid ticket status: ${row.request.status}`,
      },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(joinRequests)
    .set({ status: "checked_in" })
    .where(eq(joinRequests.id, ticketId))
    .returning();

  return NextResponse.json({
    message: "Checked in",
    request: updated,
    attendee: row.attendee,
  });
}
