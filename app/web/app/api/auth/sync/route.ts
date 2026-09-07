import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(request: Request) {
  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const emailAccount = privyUser.linked_accounts.find(
    (account) => account.type === "email"
  );

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

  if (!emailAccount || emailAccount.type !== "email") {
    return NextResponse.json(
      { message: "A verified email account is required" },
      { status: 400 }
    );
  }

  if (
    !externalEthereumWallet ||
    externalEthereumWallet.type !== "wallet" ||
    !("address" in externalEthereumWallet)
  ) {
    return NextResponse.json(
      { message: "An external Ethereum wallet is required" },
      { status: 400 }
    );
  }

  const email = emailAccount.address;
  const linkedWallet = externalEthereumWallet.address;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email,
        linkedWallet,
      })
      .where(eq(users.privyUserId, privyUser.id))
      .returning();

    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(users)
    .values({
      privyUserId: privyUser.id,
      email,
      linkedWallet,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
