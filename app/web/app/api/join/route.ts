import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Join request — coming in Commit 17" },
    { status: 501 }
  );
}
