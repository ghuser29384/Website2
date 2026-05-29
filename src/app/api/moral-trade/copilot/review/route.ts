import { NextResponse } from "next/server";

import {
  buildMoralTradeCopilotOutput,
  getMoralTradeCopilotContract,
  normalizeMoralTradeCopilotEvidenceMetadata,
  summarizeMoralTradeCopilotEvidenceMetadata,
  validateMoralTradeCopilotContract,
  validateMoralTradeCopilotOutput,
} from "@/lib/moral-trade/copilot";
import type { MoralTradeProtocolDraftInput } from "@/lib/proposal-review";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 4000;
const MAX_CITATIONS = 12;

const STRING_DRAFT_FIELDS = [
  "format",
  "offeredCause",
  "requestedCause",
  "offeredAction",
  "requestedAction",
  "baselineStatement",
  "duration",
  "exitConditions",
  "verificationMethod",
  "publicDescription",
  "evidenceUrl",
] as const satisfies ReadonlyArray<keyof MoralTradeProtocolDraftInput>;

const NUMBER_DRAFT_FIELDS = [
  "participantImportance",
  "counterpartyThreshold",
] as const satisfies ReadonlyArray<keyof MoralTradeProtocolDraftInput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringField(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_TEXT_FIELD_LENGTH);
}

function normalizeNumberField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDraftInput(draft: Record<string, unknown>): MoralTradeProtocolDraftInput {
  const normalized: MoralTradeProtocolDraftInput = {
    format: "",
  };

  for (const field of STRING_DRAFT_FIELDS) {
    normalized[field] = normalizeStringField(draft[field]);
  }

  for (const field of NUMBER_DRAFT_FIELDS) {
    normalized[field] = normalizeNumberField(draft[field]);
  }

  return normalized;
}

function normalizeCitations(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, MAX_CITATIONS);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

const EMPTY_EVIDENCE_METADATA_SUMMARY = summarizeMoralTradeCopilotEvidenceMetadata({
  evidenceMetadata: [],
  acceptedCount: 0,
  rejectedCount: 0,
  ignoredFieldCount: 0,
  blockers: [],
});

export async function POST(request: Request) {
  const contract = getMoralTradeCopilotContract();
  const contractValidation = validateMoralTradeCopilotContract(contract);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: "deterministic_draft_review_only",
        stateMutation: false,
        inputBundleUsed: contract.strictInputBundle,
        evidenceMetadataSummary: EMPTY_EVIDENCE_METADATA_SUMMARY,
        contractValidation,
        fallback:
          "Invalid JSON falls back to manual or deterministic draft review without changing proposal state.",
        blockers: ["invalid_json_body"],
      },
      400,
    );
  }

  if (!isRecord(body) || !isRecord(body.draft)) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: "deterministic_draft_review_only",
        stateMutation: false,
        inputBundleUsed: contract.strictInputBundle,
        evidenceMetadataSummary: EMPTY_EVIDENCE_METADATA_SUMMARY,
        contractValidation,
        fallback:
          "Missing structured_draft falls back to clarification or manual review without changing proposal state.",
        blockers: ["draft: structured_draft object is required"],
      },
      400,
    );
  }

  const evidenceMetadataNormalization = normalizeMoralTradeCopilotEvidenceMetadata(
    body.evidenceMetadata,
  );
  const output = buildMoralTradeCopilotOutput(
    normalizeDraftInput(body.draft),
    normalizeCitations(body.citations),
    evidenceMetadataNormalization.evidenceMetadata,
  );
  const outputValidation = validateMoralTradeCopilotOutput(output);
  const blockers = [
    ...contractValidation.blockers,
    ...outputValidation.blockers,
    ...evidenceMetadataNormalization.blockers,
  ];

  return jsonResponse(
    {
      ok: blockers.length === 0,
      checkedAt: new Date().toISOString(),
      contractVersion: contract.version,
      decisioningMode: "deterministic_draft_review_only",
      stateMutation: false,
      inputBundleUsed: contract.strictInputBundle,
      evidenceMetadataSummary: summarizeMoralTradeCopilotEvidenceMetadata(
        evidenceMetadataNormalization,
      ),
      output,
      outputValidation,
      contractValidation,
      blockers,
    },
    blockers.length ? 422 : 200,
  );
}
