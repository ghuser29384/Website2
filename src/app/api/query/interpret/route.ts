import { NextResponse } from "next/server";

import {
  SMART_QUERY_SURFACES,
  buildSmartQueryTarget,
  type SmartQuerySurface,
} from "@/lib/smart-query";
import {
  parseSmartQueryWithClarification,
  type SmartQueryClarificationAnswer,
} from "@/lib/smart-query-clarification";
import { activateProductionSmartQueryLlmFallback } from "@/lib/smart-query-llm-gate";
import { resolveSmartQueryWithLlm } from "@/lib/smart-query-llm";
import {
  applySmartQuerySurfacePolicy,
  smartQuerySurfaceFromClarification,
} from "@/lib/smart-query-surface-policy";

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

function readClarification(value: unknown): SmartQueryClarificationAnswer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.field !== "string" || typeof record.answer !== "string") return null;
  const field = record.field.trim().slice(0, 40);
  const answer = record.answer.trim().slice(0, 120);
  return field && answer ? { field, answer } : null;
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
  const requestedSurface = SMART_QUERY_SURFACES.includes(record.surface as SmartQuerySurface)
    ? (record.surface as SmartQuerySurface)
    : "global";
  const now = typeof record.now === "string" && Number.isFinite(Date.parse(record.now))
    ? record.now
    : undefined;
  const clarification = readClarification(record.clarification);
  const surface = smartQuerySurfaceFromClarification(
    requestedSurface,
    clarification?.field,
    clarification?.answer,
  );
  const parserClarification = clarification?.field === "route" ? null : clarification;

  if (!query) return badRequest("Enter a query before running the search.");

  const { interpretation: deterministic, refinedQuery } = parseSmartQueryWithClarification(
    query,
    parserClarification,
    { now, surface },
  );
  activateProductionSmartQueryLlmFallback();
  const resolved = await resolveSmartQueryWithLlm(deterministic);
  const interpretation = applySmartQuerySurfacePolicy(resolved.interpretation);

  return NextResponse.json(
    {
      interpretation,
      refinedQuery,
      target: buildSmartQueryTarget(interpretation),
      usedLlm: resolved.usedLlm,
    },
    { status: 200, headers: RESPONSE_HEADERS },
  );
}
