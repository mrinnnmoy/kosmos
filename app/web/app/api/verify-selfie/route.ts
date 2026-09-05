import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Selfie verification — coming in Commit 15" },
    { status: 501 }
  );
}
