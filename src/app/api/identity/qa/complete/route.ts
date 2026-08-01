import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  getOnePersonAccountConfig,
  type OnePersonAgeClass,
  type OnePersonProviderResultPayload,
} from "@/lib/identity/one-person-account";
import {
  buildQaProviderPayload,
  recordOnePersonProviderResult,
} from "@/lib/identity/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeSecretEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const config = getOnePersonAccountConfig();
  if (process.env.VERCEL_ENV === "production" || config.providerMode !== "qa_mock") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const received = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (config.qaSecret.length < 32 || !safeSecretEqual(received, config.qaSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sessionId = typeof input.sessionId === "string" ? input.sessionId.trim() : "";
  const subjectReference =
    typeof input.subjectReference === "string" ? input.subjectReference.trim() : "";
  const ageClass = (typeof input.ageClass === "string" ? input.ageClass : "adult") as OnePersonAgeClass;
  const result = (typeof input.result === "string" ? input.result : "verified") as OnePersonProviderResultPayload["result"];
  const duplicateCheckResult = (
    typeof input.duplicateCheckResult === "string" ? input.duplicateCheckResult : "clear"
  ) as OnePersonProviderResultPayload["duplicateCheckResult"];

  if (!sessionId || subjectReference.length < 6 || subjectReference.length > 500) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const payload = buildQaProviderPayload({
      ageClass,
      duplicateCheckResult,
      result,
      sessionId,
      subjectReference,
    });
    const output = await recordOnePersonProviderResult({
      exactBody: JSON.stringify(payload),
      payload,
    });
    return NextResponse.json({ accepted: true, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "qa_completion_failed";
    return NextResponse.json(
      { error: message.includes("replay_mismatch") ? "provider_event_conflict" : "qa_completion_failed" },
      { status: message.includes("replay_mismatch") ? 409 : 400 },
    );
  }
}
