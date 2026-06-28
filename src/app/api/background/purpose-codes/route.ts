import { NextResponse } from "next/server";

import {
  evaluateBackgroundPolicyDecision,
  serializeBackgroundPolicyDecisionForResponse,
} from "@/lib/background-phase-gates";
import {
  BACKGROUND_PURPOSE_REGISTRY,
  type BackgroundPurposeRegistryEntry,
} from "@/lib/background-purpose-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializePurposeCode(entry: BackgroundPurposeRegistryEntry) {
  return {
    allowedSurfaces: [...entry.allowedSurfaces].sort(),
    code: entry.code,
    label: entry.label,
    purposePolicyVersion: entry.version,
    reconfirmationRule: entry.reconfirmationRule,
    riskTier: entry.riskTier,
    selectable: true,
    state: "active",
    summary: `${entry.label} background delegate purpose.`,
  };
}

export async function GET() {
  const policyDecision = evaluateBackgroundPolicyDecision({
    actionKind: "background.purpose_codes.list",
    actorRole: "anonymous",
    laneKey: "background_docs",
    outputSchemaVersion: "background-purpose-codes-response-v1",
  });

  if (policyDecision.verdict !== "allow") {
    return NextResponse.json(
      {
        error: "Purpose-code registry is unavailable in this release.",
        policyDecision: serializeBackgroundPolicyDecisionForResponse(policyDecision),
      },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }

  const purposeCodes = Object.values(BACKGROUND_PURPOSE_REGISTRY)
    .map(serializePurposeCode)
    .sort((left, right) => left.code.localeCompare(right.code));

  return NextResponse.json(
    {
      policyDecision: serializeBackgroundPolicyDecisionForResponse(policyDecision),
      purposeCodes,
      schemaVersion: "background-purpose-codes-response-v1",
    },
    {
      headers: { "Cache-Control": "public, max-age=300" },
    },
  );
}
