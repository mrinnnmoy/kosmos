import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    ticketId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { ticketId } = await params;

  return NextResponse.json(
    { message: `Check in ticket ${ticketId} — coming in Commit 21` },
    { status: 501 }
  );
}
