import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { hashSignal, type IDKitResult } from "@worldcoin/idkit-core";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { joinRequests } from "@/lib/db/schema";
import { verifyWorldIdProof } from "@/lib/worldid/verify";

const WORLD_ACTION = "join-kosmos-event";

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
    !("address" in externalEthereumWallet)
  ) {
    return NextResponse.json(
      { message: "An external Ethereum wallet is required" },
      { status: 400 }
    );
  }

  const walletAddress = externalEthereumWallet.address;

  const { eventId, idkitResponse } = (await request.json()) as {
    eventId?: string;
    idkitResponse?: IDKitResult;
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
    console.error("World ID verification failed", error);

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

  const expectedSignalHash = hashSignal(walletAddress.toLowerCase());

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

  let nullifier: string;

  try {
    nullifier = BigInt(rawNullifier).toString(10);
  } catch {
    return NextResponse.json(
      { message: "Invalid nullifier in proof response" },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.eventId, eventId),
        eq(joinRequests.selfieCheckNullifier, nullifier)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { message: "This person has already requested to join this event" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    verified: true,
    nullifier,
  });
}
