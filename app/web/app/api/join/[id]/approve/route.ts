import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  return NextResponse.json(
    { message: `Approve join request ${id} — coming in Commit 17` },
    { status: 501 }
  );
}
