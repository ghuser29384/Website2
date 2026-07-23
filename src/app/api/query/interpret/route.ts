import { NextResponse } from "next/server";

import {
  SMART_QUERY_SURFACES,
  buildSmartQueryTarget,
  parseSmartQuery,
  type SmartQuerySurface,
} from "@/lib/smart-query";
import { resolveSmartQueryWithLlm } from "@/lib/smart-query-llm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
} as const;

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400, headers: RESPONSE_HEADERS },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("The query request must contain valid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("The query request must be an object.");
  }

  const record = body as Record<string, unknown>;
  const query = typeof record.query === "string" ? record.query.trim().slice(0, 500) : "";
  const surface = SMART_QUERY_SURFACES.includes(record.surface as SmartQuerySurface)
    ? (record.surface as SmartQuerySurface)
    : "global";
  const now = typeof record.now === "string" && Number.isFinite(Date.parse(record.now))
    ? record.now
    : undefined;

  if (!query) return badRequest("Enter a query before running the search.");

  const deterministic = parseSmartQuery(query, { now, surface });
  const resolved = await resolveSmartQueryWithLlm(deterministic);
  const interpretation = resolved.interpretation;

  return NextResponse.json(
    {
      interpretation,
      target: resolved.target || buildSmartQueryTarget(interpretation),
      usedLlm: resolved.usedLlm,
    },
    { status: 200, headers: RESPONSE_HEADERS },
  );
}
