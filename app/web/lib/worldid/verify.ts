import "server-only";

export async function verifyWorldIdProof(idkitResponse: unknown) {
  const rpId = process.env.NEXT_PUBLIC_WORLD_RP_ID;

  if (!rpId) {
    throw new Error("NEXT_PUBLIC_WORLD_RP_ID is not configured");
  }

  const response = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(idkitResponse),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `World ID verification failed: ${response.status} ${text}`
    );
  }

  return response.json();
}
