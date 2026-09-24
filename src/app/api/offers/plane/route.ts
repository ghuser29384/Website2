import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { available: false, reason: "The heuristic offer plane is retired.", browseHref: "/discover" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
