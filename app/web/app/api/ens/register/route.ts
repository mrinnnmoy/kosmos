import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "ENS registration — coming in Commit 10" },
    { status: 501 }
  );
}
