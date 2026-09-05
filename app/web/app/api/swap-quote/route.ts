import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Swap quote — coming in Commit 16" },
    { status: 501 }
  );
}
