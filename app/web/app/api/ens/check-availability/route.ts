import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  CONTRACT_ADDRESSES,
  KosmosSubnameRegistryAbi,
} from "@kosmos/shared";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { publicClient } from "@/lib/ens/client";

const LABEL_PATTERN = /^[a-z0-9-]{3,20}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const label = searchParams.get("label")?.toLowerCase() ?? "";

  if (!LABEL_PATTERN.test(label)) {
    return NextResponse.json({
      available: false,
      reason: "3-20 characters, lowercase letters, numbers, and hyphens only",
    });
  }

  const [existingInDb] = await db
    .select()
    .from(users)
    .where(eq(users.ensSubname, label))
    .limit(1);

  if (existingInDb) {
    return NextResponse.json({
      available: false,
      reason: "Already taken",
    });
  }

  try {
    const availableOnChain = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.sepolia.kosmosSubnameRegistry,
      abi: KosmosSubnameRegistryAbi,
      functionName: "isAvailable",
      args: [label],
    });

    return NextResponse.json({
      available: availableOnChain,
      reason: availableOnChain ? undefined : "Already taken on-chain",
    });
  } catch (error) {
    console.error("ENS availability check failed", error);

    return NextResponse.json(
      {
        available: false,
        reason: "Could not check availability",
      },
      { status: 502 },
    );
  }
}
