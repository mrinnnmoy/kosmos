import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  return NextResponse.json(
    { message: `Add co-host to event ${id} — coming in Commit 19` },
    { status: 501 }
  );
}
