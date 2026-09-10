"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  http,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";

import { Button } from "@/components/ui/Button";
import { useKosmosWalletClient } from "@/hooks/useWalletClient";

const SEPOLIA_USDC =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const UNISWAP_PROXY =
  "0x0000000085E102724e78eCd2F45DC9cA239Affad";

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

type ApiTransaction = {
  to?: string;
  from?: string;
  data?: string;
  value?: string;
  chainId?: number;
};

type QuoteResponse = {
  routing?: string;
  quote?: {
    swapper?: string;
    input?: {
      token?: string;
      amount?: string;
      maximumAmount?: string;
    };
    output?: {
      token?: string;
      amount?: string;
      recipient?: string;
    };
  };
};

type QuoteData = {
  message?: string;
  escrowAddress?: string;
  quoteResponse?: QuoteResponse;
  approvalSpender?: string;
  maximumAmount?: string;
  needsApproval?: boolean;
};

type SwapData = {
  message?: string;
  swap?: ApiTransaction;
};

type PaymentState =
  | "idle"
  | "loading"
  | "ready"
  | "approving"
  | "building"
  | "swapping"
  | "success"
  | "error";

type UniswapPayButtonProps = {
  eventId: string;
  walletAddress: string;
};

export function UniswapPayButton({
  eventId,
  walletAddress,
}: UniswapPayButtonProps) {
  const { getAccessToken } = usePrivy();
  const getWalletClient = useKosmosWalletClient();

  const [state, setState] = useState<PaymentState>("idle");
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchQuote(updateUi = true): Promise<QuoteData> {
    if (updateUi) {
      setState("loading");
      setError(null);
    }

    const token = await getAccessToken();

    if (!token) {
      throw new Error("Unable to get authentication token");
    }

    const response = await fetch("/api/swap-quote", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        tokenIn: SEPOLIA_USDC,
      }),
    });

    const data = (await response.json()) as QuoteData;

    if (!response.ok) {
      throw new Error(data.message ?? "Failed to get Uniswap quote");
    }

    if (!data.quoteResponse?.quote) {
      throw new Error("Uniswap returned an invalid quote");
    }

    if (
      !data.approvalSpender ||
      !isAddress(data.approvalSpender) ||
      data.approvalSpender.toLowerCase() !==
        UNISWAP_PROXY.toLowerCase() ||
      !data.maximumAmount
    ) {
      throw new Error("Uniswap approval details are invalid");
    }

    let requiredAmount: bigint;

    try {
      requiredAmount = BigInt(data.maximumAmount);
    } catch {
      throw new Error("Uniswap returned an invalid maximum input amount");
    }

    const allowance = await publicClient.readContract({
      address: SEPOLIA_USDC,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [
        walletAddress as Address,
        data.approvalSpender as Address,
      ],
    });

    const checkedData: QuoteData = {
      ...data,
      needsApproval: allowance < requiredAmount,
    };

    if (updateUi) {
      setQuoteData(checkedData);
      setState("ready");
    }

    return checkedData;
  }

  async function sendApiTransaction(
    transaction: ApiTransaction
  ): Promise<Hex> {
    if (
      !transaction.to ||
      !isAddress(transaction.to) ||
      !transaction.data ||
      !isHex(transaction.data) ||
      transaction.data === "0x"
    ) {
      throw new Error("Uniswap returned an invalid transaction");
    }

    if (
      transaction.from &&
      transaction.from.toLowerCase() !== walletAddress.toLowerCase()
    ) {
      throw new Error("Transaction sender does not match your wallet");
    }

    if (
      transaction.chainId !== undefined &&
      transaction.chainId !== sepolia.id
    ) {
      throw new Error("Transaction is not for Sepolia");
    }

    const walletClient = await getWalletClient(walletAddress);
    const chainId = await walletClient.getChainId();

    if (chainId !== sepolia.id) {
      throw new Error("Switch your wallet to Sepolia and try again");
    }

    let value: bigint;

    try {
      value = BigInt(transaction.value ?? "0");
    } catch {
      throw new Error("Uniswap returned an invalid transaction value");
    }

    const hash = await walletClient.sendTransaction({
      to: transaction.to as Address,
      data: transaction.data as Hex,
      value,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    if (receipt.status !== "success") {
      throw new Error("Transaction reverted");
    }

    return hash;
  }

  async function approveCurrentProxy(
    data: QuoteData
  ): Promise<void> {
    if (
      !data.approvalSpender ||
      !isAddress(data.approvalSpender) ||
      data.approvalSpender.toLowerCase() !==
        UNISWAP_PROXY.toLowerCase() ||
      !data.maximumAmount
    ) {
      throw new Error("Uniswap approval details are invalid");
    }

    let amount: bigint;

    try {
      amount = BigInt(data.maximumAmount);
    } catch {
      throw new Error("Uniswap returned an invalid approval amount");
    }

    const approvalData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [
        data.approvalSpender as Address,
        amount,
      ],
    });

    setState("approving");

    await sendApiTransaction({
      to: SEPOLIA_USDC,
      from: walletAddress,
      data: approvalData,
      value: "0",
      chainId: sepolia.id,
    });
  }

  async function handlePayment() {
    if (!quoteData?.quoteResponse) return;

    setError(null);

    try {
      if (quoteData.needsApproval) {
        await approveCurrentProxy(quoteData);
      }

      // Approval changes on-chain state and quotes age quickly.
      // Always obtain a fresh quote before building the swap.
      setState("building");
      let freshQuote = await fetchQuote(false);

      // Exact-output maximum input can move between quotes.
      // If necessary, approve the latest maximum and quote once more.
      if (freshQuote.needsApproval) {
        await approveCurrentProxy(freshQuote);

        setState("building");
        freshQuote = await fetchQuote(false);
      }

      if (freshQuote.needsApproval) {
        throw new Error(
          "USDC allowance is still below the latest quote maximum"
        );
      }

      if (!freshQuote.quoteResponse) {
        throw new Error("Fresh Uniswap quote is missing");
      }

      const token = await getAccessToken();

      if (!token) {
        throw new Error("Unable to get authentication token");
      }

      const buildResponse = await fetch("/api/swap-build", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          quoteResponse: freshQuote.quoteResponse,
        }),
      });

      const swapData = (await buildResponse.json()) as SwapData;

      if (!buildResponse.ok) {
        throw new Error(
          swapData.message ?? "Failed to build Uniswap swap"
        );
      }

      if (!swapData.swap) {
        throw new Error("Uniswap did not return a swap transaction");
      }

      setState("swapping");
      const hash = await sendApiTransaction(swapData.swap);

      setQuoteData(freshQuote);
      setPaymentTxHash(hash);
      setState("success");
    } catch (paymentError) {
      const message =
        paymentError instanceof Error
          ? paymentError.message
          : "Payment failed";

      setError(message);
      setState("error");
    }
  }



  const inputAmount = quoteData?.quoteResponse?.quote?.input?.amount;
  const outputAmount = quoteData?.quoteResponse?.quote?.output?.amount;

  return (
    <div className="mt-3 rounded-xl border border-border bg-background/40 p-4">
      {state === "idle" && (
        <div>
          <p className="text-sm font-medium text-foreground">
            Choose payment token
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your selected token will be swapped to the event fee in ETH.
          </p>

          <Button
            type="button"
            className="mt-3 w-full"
            onClick={() => {
              void fetchQuote().catch((quoteError) => {
                setError(
                  quoteError instanceof Error
                    ? quoteError.message
                    : "Failed to get Uniswap quote"
                );
                setState("error");
              });
            }}
          >
            Pay with USDC
          </Button>
        </div>
      )}

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">
          Finding the best USDC payment route...
        </p>
      )}

      {quoteData && state !== "loading" && state !== "success" && (
        <div>
          <p className="text-sm font-medium text-foreground">
            Pay with USDC
          </p>

          {inputAmount && outputAmount && (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatUnits(BigInt(inputAmount), 6)} USDC →{" "}
              {formatEther(BigInt(outputAmount))} ETH
            </p>
          )}

          <p className="mt-1 text-xs text-muted-foreground">
            ETH is sent directly to the event escrow.
          </p>

          <Button
            type="button"
            className="mt-3 w-full"
            disabled={
              state === "approving" ||
              state === "building" ||
              state === "swapping"
            }
            onClick={handlePayment}
          >
            {state === "approving"
              ? "Approve USDC in wallet..."
              : state === "building"
                ? "Preparing payment..."
                : state === "swapping"
                  ? "Confirm payment in wallet..."
                  : quoteData.needsApproval
                    ? "Approve USDC & pay"
                    : "Pay with USDC"}
          </Button>
        </div>
      )}

      {state === "success" && paymentTxHash && (
        <div>
          <p className="text-sm font-medium text-foreground">
            Payment sent to event escrow
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {paymentTxHash}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <p className="text-sm text-danger">{error}</p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              void fetchQuote().catch((quoteError) => {
                setError(
                  quoteError instanceof Error
                    ? quoteError.message
                    : "Failed to get Uniswap quote"
                );
                setState("error");
              });
            }}
          >
            Refresh quote
          </Button>
        </div>
      )}
    </div>
  );
}
