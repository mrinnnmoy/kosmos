import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAddress, parseEther } from "viem";

import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import {
  checkApproval,
  getQuote,
  NATIVE_ETH_ADDRESS,
} from "@/lib/uniswap/client";

type QuoteResponse = {
  quote?: {
    swapper?: string;
    input?: {
      amount?: string;
      maximumAmount?: string;
    };
    output?: {
      amount?: string;
    };
  };
  permitData?: unknown;
  routing?: string;
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

  const { eventId, tokenIn } = (await request.json()) as {
    eventId?: string;
    tokenIn?: string;
  };

  if (!eventId || !tokenIn) {
    return NextResponse.json(
      { message: "eventId and tokenIn are required" },
      { status: 400 }
    );
  }

  if (!isAddress(tokenIn)) {
    return NextResponse.json(
      { message: "Invalid input token address" },
      { status: 400 }
    );
  }

  if (tokenIn.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase()) {
    return NextResponse.json(
      { message: "Commit 16 payment requires an ERC-20 token" },
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

  let amountOutWei: string;

  try {
    amountOutWei = parseEther(event.price).toString();
  } catch {
    return NextResponse.json(
      { message: "Invalid event price" },
      { status: 500 }
    );
  }

  if (BigInt(amountOutWei) <= BigInt(0)) {
    return NextResponse.json(
      { message: "This event does not require a token swap" },
      { status: 400 }
    );
  }

  try {
    const quoteResponse = (await getQuote({
      tokenIn,
      swapper: walletAddress,
      recipient: walletAddress,
      amount: amountOutWei,
      type: "EXACT_OUTPUT",
    })) as QuoteResponse;


    if (quoteResponse.routing !== "CLASSIC") {
      return NextResponse.json(
        { message: "No supported on-chain Uniswap swap route found" },
        { status: 502 }
      );
    }

    const amountInRequired =
      quoteResponse.quote?.input?.maximumAmount ??
      quoteResponse.quote?.input?.amount;

    if (!amountInRequired) {
      return NextResponse.json(
        { message: "Uniswap quote did not include an input amount" },
        { status: 502 }
      );
    }

    const approvalCheck = await checkApproval({
      walletAddress,
      token: tokenIn,
      amount: amountInRequired,
    });


    const approval =
      approvalCheck &&
      typeof approvalCheck === "object" &&
      "approval" in approvalCheck
        ? approvalCheck.approval
        : null;

    const cancel =
      approvalCheck &&
      typeof approvalCheck === "object" &&
      "cancel" in approvalCheck
        ? approvalCheck.cancel
        : null;

    return NextResponse.json({
      quoteResponse,
      escrowAddress: event.escrowContractAddress,
      approval: approval ?? null,
      cancel: cancel ?? null,
      maximumAmount: amountInRequired,
    });
  } catch (error) {
    console.error("Uniswap quote failed", error);

    return NextResponse.json(
      { message: "Failed to fetch Uniswap quote" },
      { status: 502 }
    );
  }
}
