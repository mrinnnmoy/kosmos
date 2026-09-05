import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Events API GET — coming in Commit 14" },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Events API POST — coming in Commit 13" },
    { status: 501 }
  );
}
