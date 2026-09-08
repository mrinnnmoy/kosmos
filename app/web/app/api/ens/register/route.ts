import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerKosmosSubname } from "@/lib/ens/register-subname";

const LABEL_PATTERN = /^[a-z0-9-]{3,20}$/;

export async function POST(request: Request) {
  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let rawLabel: unknown;

  try {
    const body = await request.json();
    rawLabel = body.label;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }

  const label = String(rawLabel ?? "").toLowerCase();

  if (!LABEL_PATTERN.test(label)) {
    return NextResponse.json(
      {
        message:
          "3-20 characters, lowercase letters, numbers, and hyphens only",
      },
      { status: 400 },
    );
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json(
      { message: "User not found — sign in first" },
      { status: 404 },
    );
  }

  if (dbUser.ensSubname) {
    return NextResponse.json(
      { message: "You already have a Kosmos ID" },
      { status: 409 },
    );
  }

  if (!dbUser.linkedWallet) {
    return NextResponse.json(
      { message: "Link a wallet first" },
      { status: 400 },
    );
  }

  const [taken] = await db
    .select()
    .from(users)
    .where(eq(users.ensSubname, label))
    .limit(1);

  if (taken) {
    return NextResponse.json(
      { message: "That ID is already taken" },
      { status: 409 },
    );
  }

  try {
    await registerKosmosSubname(
      label,
      dbUser.linkedWallet as `0x${string}`,
    );
  } catch (error) {
    console.error("ENS registration failed", error);

    return NextResponse.json(
      { message: "On-chain registration failed" },
      { status: 502 },
    );
  }

  const [updated] = await db
    .update(users)
    .set({ ensSubname: label })
    .where(eq(users.privyUserId, privyUser.id))
    .returning();

  return NextResponse.json(updated);
}
