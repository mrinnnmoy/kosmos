import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  return NextResponse.json(
    { message: `Get event ${id} — coming in Commit 14` },
    { status: 501 }
  );
}
