import { NextResponse, type NextRequest } from "next/server";

import {
  getOnePersonAccountConfig,
  parseOnePersonProviderPayload,
  verifyOnePersonWebhookSignature,
} from "@/lib/identity/one-person-account";
import { recordOnePersonProviderResult } from "@/lib/identity/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const config = getOnePersonAccountConfig();
  if (config.providerMode !== "signed_webhook" || config.providerWebhookSecret.length < 32) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const timestampHeader = request.headers.get("x-moraltrade-timestamp");
  const signatureHeader = request.headers.get("x-moraltrade-signature");
  const valid = verifyOnePersonWebhookSignature({
    body,
    now: Date.now(),
    secret: config.providerWebhookSecret,
    signatureHeader,
    timestampHeader,
    toleranceSeconds: config.webhookToleranceSeconds,
  });
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  try {
    const payload = parseOnePersonProviderPayload(JSON.parse(body));
    const result = await recordOnePersonProviderResult({ exactBody: body, payload });
    return NextResponse.json({ accepted: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_provider_result";
    const conflict = message.includes("replay_mismatch") || message.includes("not_open");
    return NextResponse.json(
      { error: conflict ? "provider_event_conflict" : "invalid_provider_result" },
      { status: conflict ? 409 : 400 },
    );
  }
}
