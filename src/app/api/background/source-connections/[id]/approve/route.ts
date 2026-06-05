import { NextResponse } from "next/server";

import { POST as approveSourceConnectionSummaryPost } from "../summaries/[summaryId]/approve/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let body: unknown = {};

  try {
    body = await request.clone().json();
  } catch {
    body = {};
  }

  if (!isRecord(body)) {
    return privateJson({ error: "JSON object is required." }, 400);
  }

  const summaryId = stringField(
    body.summaryId ?? body.summary_id ?? body.shadowRunId ?? body.shadow_run_id,
  );

  if (!summaryId) {
    return privateJson(
      { error: "Provide summaryId or shadowRunId for the draft summary to approve." },
      400,
    );
  }

  const { id } = await params;

  return approveSourceConnectionSummaryPost(request, {
    params: Promise.resolve({ id, summaryId }),
  });
}
