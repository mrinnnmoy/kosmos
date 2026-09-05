import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Reminder cron — coming in Commit 20" },
    { status: 501 }
  );
}
