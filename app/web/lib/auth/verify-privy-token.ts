import "server-only";

import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

/// Verifies the bearer access token on a request and returns the canonical
/// Privy user object. Never trust email/wallet data sent directly by clients.
export async function getVerifiedPrivyUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) return null;

  try {
    const claims = await privy.utils().auth().verifyAccessToken(token);
    return await privy.users()._get(claims.user_id);
  } catch {
    return null;
  }
}
