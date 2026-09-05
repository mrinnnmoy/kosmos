import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  return NextResponse.json(
    { message: `Cancel join request ${id} — coming in Commit 18` },
    { status: 501 }
  );
}
