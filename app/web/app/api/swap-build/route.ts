import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAddress, parseEther } from "viem";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import {
  buildSwap,
  NATIVE_ETH_ADDRESS,
  SEPOLIA_CHAIN_ID,
} from "@/lib/uniswap/client";

type ClassicQuote = Record<string, unknown> & {
  chainId?: number;
  swapper?: string;
  input?: {
    token?: string;
    amount?: string;
  };
  output?: {
    token?: string;
    amount?: string;
    recipient?: string;
  };
};

type QuoteResponse = {
  routing?: string;
  quote?: ClassicQuote;
};

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

  const { eventId, quoteResponse } = (await request.json()) as {
    eventId?: string;
    quoteResponse?: QuoteResponse;
  };

  if (!eventId || !quoteResponse?.quote) {
    return NextResponse.json(
      { message: "eventId and quoteResponse are required" },
      { status: 400 }
    );
  }

  if (quoteResponse.routing !== "CLASSIC") {
    return NextResponse.json(
      { message: "Unsupported Uniswap routing type" },
      { status: 400 }
    );
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event || !event.escrowContractAddress) {
    return NextResponse.json(
      { message: "Event or escrow not found" },
      { status: 404 }
    );
  }

  if (!isAddress(event.escrowContractAddress)) {
    return NextResponse.json(
      { message: "Invalid event escrow address" },
      { status: 500 }
    );
  }

  let expectedAmountOut: string;

  try {
    expectedAmountOut = parseEther(event.price).toString();
  } catch {
    return NextResponse.json(
      { message: "Invalid event price" },
      { status: 500 }
    );
  }

  const quote = quoteResponse.quote;

  if (
    quote.swapper?.toLowerCase() !== walletAddress.toLowerCase()
  ) {
    return NextResponse.json(
      { message: "Quote swapper does not match authenticated wallet" },
      { status: 400 }
    );
  }

  if (
    quote.output?.token?.toLowerCase() !==
      NATIVE_ETH_ADDRESS.toLowerCase()
  ) {
    return NextResponse.json(
      { message: "Quote output token must be native ETH" },
      { status: 400 }
    );
  }

  if (quote.output.amount !== expectedAmountOut) {
    return NextResponse.json(
      { message: "Quote output amount does not match event price" },
      { status: 400 }
    );
  }

  if (
    quote.output.recipient?.toLowerCase() !==
      event.escrowContractAddress.toLowerCase()
  ) {
    return NextResponse.json(
      { message: "Quote recipient does not match event escrow" },
      { status: 400 }
    );
  }

  if (
    quote.chainId !== undefined &&
    quote.chainId !== SEPOLIA_CHAIN_ID
  ) {
    return NextResponse.json(
      { message: "Quote is not for Sepolia" },
      { status: 400 }
    );
  }

  try {
    const swap = await buildSwap(quote);
    return NextResponse.json(swap);
  } catch (error) {
    console.error("Uniswap swap build failed", error);

    return NextResponse.json(
      { message: "Failed to build Uniswap swap" },
      { status: 502 }
    );
  }
}
