import "server-only";

const BASE_URL = "https://trade-api.gateway.uniswap.org/v1";

export const SEPOLIA_CHAIN_ID = 11155111;
export const NATIVE_ETH_ADDRESS =
  "0x0000000000000000000000000000000000000000";

export const UNISWAP_PROXY_ADDRESS =
  "0x0000000085E102724e78eCd2F45DC9cA239Affad";

async function uniswapFetch(path: string, body: unknown) {
  const apiKey = process.env.UNISWAP_API_KEY;

  if (!apiKey) {
    throw new Error("UNISWAP_API_KEY is not configured");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "x-universal-router-version": "2.0",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorCode =
      data && typeof data === "object" && "errorCode" in data
        ? String(data.errorCode)
        : "unknown";

    const detail =
      data && typeof data === "object" && "detail" in data
        ? String(data.detail)
        : "No detail";

    throw new Error(
      `Uniswap API request failed with status ${response.status}: ${errorCode}: ${detail}`
    );
  }

  return data;
}

export function checkApproval(params: {
  walletAddress: string;
  token: string;
  amount: string;
}) {
  return uniswapFetch("/check_approval", {
    walletAddress: params.walletAddress,
    token: params.token,
    amount: params.amount,
    chainId: SEPOLIA_CHAIN_ID,
  });
}

export function getQuote(params: {
  tokenIn: string;
  swapper: string;
  recipient: string;
  amount: string;
  type: "EXACT_INPUT" | "EXACT_OUTPUT";
}) {
  return uniswapFetch("/quote", {
    tokenIn: params.tokenIn,
    tokenOut: NATIVE_ETH_ADDRESS,
    tokenInChainId: SEPOLIA_CHAIN_ID,
    tokenOutChainId: SEPOLIA_CHAIN_ID,
    type: params.type,
    amount: params.amount,
    swapper: params.swapper,
    recipient: params.recipient,
    permitAmount: "EXACT",
    autoSlippage: "DEFAULT",
    protocols: ["V2", "V3", "V4"],
  });
}

export function buildSwap(
  quote: Record<string, unknown>,
  permitData?: Record<string, unknown> | null,
  signature?: string
) {
  return uniswapFetch("/swap", {
    quote,
    ...(permitData && signature
      ? { permitData, signature }
      : {}),
    simulateTransaction: true,
  });
}
