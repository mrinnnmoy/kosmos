"use client";

import { useState } from "react";
import { useConnectWallet, usePrivy } from "@privy-io/react-auth";
import {
  createPublicClient,
  decodeFunctionData,
  formatEther,
  formatUnits,
  http,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { EventEscrowAbi } from "@kosmos/shared";

import { Button } from "@/components/ui/Button";
import { useKosmosWalletClient } from "@/hooks/useWalletClient";

const SEPOLIA_USDC =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const PERMIT2_ADDRESS =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const ERC20_ABI = [
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

type PermitData = {
  domain?: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
  };
  types?: Record<
    string,
    readonly {
      name: string;
      type: string;
    }[]
  >;
  values?: {
    details?: {
      token?: string;
      amount?: string;
      expiration?: string;
      nonce?: string;
    };
    spender?: string;
    sigDeadline?: string;
  };
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
  permitData?: PermitData | null;
};

type QuoteData = {
  message?: string;
  escrowAddress?: string;
  quoteResponse?: QuoteResponse;
  approval?: ApiTransaction | null;
  cancel?: ApiTransaction | null;
  maximumAmount?: string;
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
  | "depositing"
  | "success"
  | "error";

type UniswapPayButtonProps = {
  eventId: string;
  walletAddress: string;
  escrowAddress: string;
  onPaid: (paymentTxHash: Hex) => void;
};

export function UniswapPayButton({
  eventId,
  walletAddress,
  escrowAddress,
  onPaid,
}: UniswapPayButtonProps) {
  const { getAccessToken } = usePrivy();
  const getWalletClient = useKosmosWalletClient();
  const { connectWallet } = useConnectWallet();

  async function getRequiredWalletClient() {
    try {
      return await getWalletClient(walletAddress);
    } catch {
      await connectWallet({
        walletChainType: "ethereum-only",
        description: "Connect the wallet linked to your Kosmos account",
      });

      return getWalletClient(walletAddress);
    }
  }

  const [state, setState] = useState<PaymentState>("idle");
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<Hex | null>(null);
  const [pendingDepositAmount, setPendingDepositAmount] =
    useState<string | null>(null);
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

    if (!data.maximumAmount) {
      throw new Error("Uniswap approval details are invalid");
    }

    try {
      if (BigInt(data.maximumAmount) <= BigInt(0)) {
        throw new Error();
      }
    } catch {
      throw new Error("Uniswap returned an invalid maximum input amount");
    }

    if (updateUi) {
      setQuoteData(data);
      setState("ready");
    }

    return data;
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

    const walletClient = await getRequiredWalletClient();
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

  function validatePermit2ApprovalTransaction(
    transaction: ApiTransaction,
    expectedAmount: "zero" | "positive"
  ) {
    if (
      !transaction.to ||
      transaction.to.toLowerCase() !== SEPOLIA_USDC.toLowerCase() ||
      !transaction.data ||
      !isHex(transaction.data)
    ) {
      throw new Error("Invalid Permit2 approval transaction");
    }

    let decoded;

    try {
      decoded = decodeFunctionData({
        abi: ERC20_ABI,
        data: transaction.data as Hex,
      });
    } catch {
      throw new Error("Invalid Permit2 approval calldata");
    }

    if (decoded.functionName !== "approve") {
      throw new Error("Unexpected Permit2 approval function");
    }

    const [spender, amount] = decoded.args;

    if (
      spender.toLowerCase() !== PERMIT2_ADDRESS.toLowerCase()
    ) {
      throw new Error("Approval spender is not Permit2");
    }

    if (
      (expectedAmount === "zero" && amount !== BigInt(0)) ||
      (expectedAmount === "positive" && amount <= BigInt(0))
    ) {
      throw new Error("Unexpected Permit2 approval amount");
    }
  }

  async function executePermit2Approvals(data: QuoteData) {
    if (!data.cancel && !data.approval) {
      return;
    }

    setState("approving");

    if (data.cancel) {
      validatePermit2ApprovalTransaction(data.cancel, "zero");
      await sendApiTransaction(data.cancel);
    }

    if (data.approval) {
      validatePermit2ApprovalTransaction(data.approval, "positive");
      await sendApiTransaction(data.approval);
    }
  }

  async function signPermit2(
    permitData: PermitData,
    quotedInputAmount: string,
    maximumAmount: string
  ): Promise<Hex> {
    const { domain, types, values } = permitData;
    const details = values?.details;

    if (
      domain?.name !== "Permit2" ||
      domain.chainId !== sepolia.id ||
      !domain.verifyingContract ||
      !isAddress(domain.verifyingContract) ||
      domain.verifyingContract.toLowerCase() !==
        PERMIT2_ADDRESS.toLowerCase() ||
      !types?.PermitSingle ||
      !types.PermitDetails ||
      !details ||
      !details.token ||
      !isAddress(details.token) ||
      details.token.toLowerCase() !== SEPOLIA_USDC.toLowerCase() ||
      !values?.spender ||
      !isAddress(values.spender) ||
      !details.amount ||
      !details.expiration ||
      !details.nonce ||
      !values.sigDeadline
    ) {
      throw new Error("Uniswap returned invalid Permit2 data");
    }

    let amount: bigint;
    let expiration: bigint;
    let nonce: bigint;
    let sigDeadline: bigint;
    let expectedInput: bigint;
    let expectedMaximum: bigint;

    try {
      amount = BigInt(details.amount);
      expiration = BigInt(details.expiration);
      nonce = BigInt(details.nonce);
      sigDeadline = BigInt(values.sigDeadline);
      expectedInput = BigInt(quotedInputAmount);
      expectedMaximum = BigInt(maximumAmount);
    } catch {
      throw new Error("Uniswap returned invalid Permit2 values");
    }

    if (amount !== expectedInput) {
      throw new Error(
        "Permit2 amount does not match the latest quote input"
      );
    }

    if (amount > expectedMaximum) {
      throw new Error(
        "Permit2 amount exceeds the latest quote maximum"
      );
    }

    const walletClient = await getRequiredWalletClient();
    const chainId = await walletClient.getChainId();

    if (chainId !== sepolia.id) {
      throw new Error("Switch your wallet to Sepolia and try again");
    }

    return walletClient.signTypedData({
      account: walletAddress as Address,
      domain: {
        name: domain.name,
        ...(domain.version
          ? { version: domain.version }
          : {}),
        chainId: domain.chainId,
        verifyingContract:
          domain.verifyingContract as Address,
      },
      types,
      primaryType: "PermitSingle",
      message: {
        details: {
          token: details.token as Address,
          amount,
          expiration,
          nonce,
        },
        spender: values.spender as Address,
        sigDeadline,
      },
    });
  }

  async function depositToEscrow(outputAmount: string) {
    if (!isAddress(escrowAddress)) {
      throw new Error("Event escrow address is invalid");
    }

    setState("depositing");
    setError(null);

    const walletClient = await getRequiredWalletClient();

    const estimatedDepositGas =
      await publicClient.estimateContractGas({
        address: escrowAddress as Address,
        abi: EventEscrowAbi,
        functionName: "deposit",
        args: [walletAddress as Address],
        account: walletAddress as Address,
        value: BigInt(outputAmount),
      });

    const depositGas =
      (estimatedDepositGas * BigInt(120)) / BigInt(100);

    const depositHash = await walletClient.writeContract({
      address: escrowAddress as Address,
      abi: EventEscrowAbi,
      functionName: "deposit",
      args: [walletAddress as Address],
      value: BigInt(outputAmount),
      gas: depositGas,
    });

    const depositReceipt =
      await publicClient.waitForTransactionReceipt({
        hash: depositHash,
      });

    if (depositReceipt.status !== "success") {
      throw new Error("Escrow deposit reverted");
    }

    setPaymentTxHash(depositHash);
    setPendingDepositAmount(null);
    onPaid(depositHash);
    setState("success");
  }

  async function retryDeposit() {
    if (!pendingDepositAmount) {
      return;
    }

    try {
      await depositToEscrow(pendingDepositAmount);
    } catch (depositError) {
      setError(
        depositError instanceof Error
          ? depositError.message
          : "Escrow deposit failed"
      );
      setState("error");
    }
  }

  async function handlePayment() {
    if (!quoteData?.quoteResponse) return;

    setError(null);

    try {
      await executePermit2Approvals(quoteData);

      // Always sign the freshest quote. Permit2 signatures are tied
      // to the exact quote submitted to /swap.
      setState("building");
      const freshQuote = await fetchQuote(false);

      if (freshQuote.cancel || freshQuote.approval) {
        throw new Error(
          "Permit2 approval is still required after confirmation"
        );
      }

      const quotedInputAmount =
        freshQuote.quoteResponse?.quote?.input?.amount;

      if (
        !freshQuote.quoteResponse ||
        !freshQuote.maximumAmount ||
        !quotedInputAmount
      ) {
        throw new Error("Fresh Uniswap quote is missing");
      }

      const permitData =
        freshQuote.quoteResponse.permitData ?? null;

      let signature: Hex | undefined;

      if (permitData) {
        signature = await signPermit2(
          permitData,
          quotedInputAmount,
          freshQuote.maximumAmount
        );
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
          ...(signature ? { signature } : {}),
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
      await sendApiTransaction(swapData.swap);

      const outputAmount =
        freshQuote.quoteResponse.quote?.output?.amount;

      if (!outputAmount || BigInt(outputAmount) <= BigInt(0)) {
        throw new Error("Swap output amount is invalid");
      }

      setQuoteData(freshQuote);
      setPendingDepositAmount(outputAmount);

      await depositToEscrow(outputAmount);
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
            ETH is swapped to your wallet, then deposited into the event escrow.
          </p>

          <Button
            type="button"
            className="mt-3 w-full"
            disabled={
              state === "approving" ||
              state === "building" ||
              state === "swapping" ||
              state === "depositing"
            }
            onClick={
              pendingDepositAmount
                ? retryDeposit
                : handlePayment
            }
          >
            {state === "approving"
              ? "Approve USDC in wallet..."
              : state === "building"
                ? "Preparing payment..."
                : state === "swapping"
                  ? "Confirm swap in wallet..."
                  : state === "depositing"
                    ? "Deposit ETH in escrow..."
                    : pendingDepositAmount
                      ? "Retry deposit"
                      : Boolean(
                          quoteData.cancel ||
                          quoteData.approval
                        )
                        ? "Approve USDC & pay"
                        : "Pay with USDC"}
          </Button>
        </div>
      )}

      {state === "success" && paymentTxHash && (
        <div>
          <p className="text-sm font-medium text-foreground">
            Payment deposited into event escrow
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
