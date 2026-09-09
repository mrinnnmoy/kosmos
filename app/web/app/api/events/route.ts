import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, events } from "@/lib/db/schema";
import { getVerifiedPrivyUser } from "@/lib/auth/verify-privy-token";
import { createEventApiSchema } from "@/lib/validation/event";
import { uploadToIPFS } from "@/lib/ipfs/upload";

export async function GET() {
  return NextResponse.json(
    { message: "Events API GET — coming in Commit 14" },
    { status: 501 }
  );
}

export async function POST(request: Request) {
  const privyUser = await getVerifiedPrivyUser(request);

  if (!privyUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [host] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id));

  if (!host) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const raw = Object.fromEntries(formData.entries());

  const parsed = createEventApiSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid input",
        errors: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  let coverImageCid: string | undefined;
  const coverImage = formData.get("coverImage");

  if (coverImage instanceof File && coverImage.size > 0) {
    coverImageCid = await uploadToIPFS(coverImage);
  }

  const [event] = await db
    .insert(events)
    .values({
      hostId: host.id,
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      coverImageCid,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      price: String(data.price),
      capacity: data.capacity ?? null,
      requiresApproval: data.requiresApproval,
      status: "draft",
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
