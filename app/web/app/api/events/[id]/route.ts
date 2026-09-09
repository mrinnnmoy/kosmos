import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, events } from "@/lib/db/schema";
import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

  const { escrowContractAddress } = await request.json();

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
