import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

const WORLD_ACTION = "join-kosmos-event";

export async function POST(request: Request) {
  const { action } = await request.json();

  if (action !== WORLD_ACTION) {
    return NextResponse.json(
      { message: "Invalid World ID action" },
      { status: 400 }
    );
  }

  const signingKeyHex = process.env.RP_SIGNING_KEY;

  if (!signingKeyHex) {
    console.error("RP_SIGNING_KEY is not configured");

    return NextResponse.json(
      { message: "World ID signing is not configured" },
      { status: 500 }
    );
  }

  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex,
    action: WORLD_ACTION,
  });

  return NextResponse.json({
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
  });
}
