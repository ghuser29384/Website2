import { NextResponse } from "next/server";

import {
  DISCLOSURE_ACCESS_LEVELS,
  DISCLOSURE_AUDIENCE_STAGES,
  type DisclosureAccessLevel,
  type DisclosureAudienceStage,
} from "@/lib/background-disclosure";
import {
  evaluateMoralTradeDisclosureGrant,
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
  validateMoralTradeDisclosureDecision,
  type MoralTradeDisclosureGrantInput,
  type MoralTradeDisclosureGrantStatus,
} from "@/lib/moral-trade/disclosure";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1000;
const MAX_LIST_ITEMS = 16;
const GRANT_STATUSES = new Set<MoralTradeDisclosureGrantStatus>([
  "draft",
  "granted",
  "revoked",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_TEXT_FIELD_LENGTH);
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, MAX_TEXT_FIELD_LENGTH))
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index)
    .slice(0, MAX_LIST_ITEMS);
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeAccessLevel(value: unknown): DisclosureAccessLevel {
  const normalized = normalizeString(value);

  return DISCLOSURE_ACCESS_LEVELS.includes(normalized as DisclosureAccessLevel)
    ? (normalized as DisclosureAccessLevel)
    : "specific";
}

function normalizeStage(value: unknown): DisclosureAudienceStage {
  const normalized = normalizeString(value);

  return DISCLOSURE_AUDIENCE_STAGES.includes(normalized as DisclosureAudienceStage)
    ? (normalized as DisclosureAudienceStage)
    : "consent";
}

function normalizeGrantStatus(value: unknown): MoralTradeDisclosureGrantStatus {
  const normalized = normalizeString(value);

  return GRANT_STATUSES.has(normalized as MoralTradeDisclosureGrantStatus)
    ? (normalized as MoralTradeDisclosureGrantStatus)
    : "draft";
}

function normalizeExpiry(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(3650, Math.round(value)));
}

function getDisclosureInput(body: Record<string, unknown>): MoralTradeDisclosureGrantInput {
  const candidate = isRecord(body.grant) ? body.grant : body;

  return {
    requestId: normalizeString(candidate.requestId),
    fieldKeys: normalizeStringList(candidate.fieldKeys),
    purpose: normalizeString(candidate.purpose),
    stage: normalizeStage(candidate.stage),
    accessLevel: normalizeAccessLevel(candidate.accessLevel),
    status: normalizeGrantStatus(candidate.status),
    expiresInDays: normalizeExpiry(candidate.expiresInDays),
    ownerProfileScoped: normalizeBoolean(candidate.ownerProfileScoped),
    counterpartyScoped: normalizeBoolean(candidate.counterpartyScoped),
    matchScoped: normalizeBoolean(candidate.matchScoped),
    containsRawSourceNotes: normalizeBoolean(candidate.containsRawSourceNotes),
    containsContactDetails: normalizeBoolean(candidate.containsContactDetails),
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const contract = getMoralTradeDisclosureContract();
  const contractValidation = validateMoralTradeDisclosureContract(contract);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: contract.decisioningMode,
        stateMutation: false,
        inputBundleUsed: ["disclosure_grant_packet", "disclosure_grant_contract"],
        contractValidation,
        fallback:
          "Invalid JSON falls back to no disclosure evaluation without revealing private fields or changing grants.",
        blockers: ["invalid_json_body"],
      },
      400,
    );
  }

  if (!isRecord(body)) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: contract.decisioningMode,
        stateMutation: false,
        inputBundleUsed: ["disclosure_grant_packet", "disclosure_grant_contract"],
        contractValidation,
        fallback:
          "Missing request object falls back to no disclosure evaluation without revealing private fields or changing grants.",
        blockers: ["request_body: object is required"],
      },
      400,
    );
  }

  const grant = getDisclosureInput(body);
  const decision = evaluateMoralTradeDisclosureGrant(grant);
  const decisionValidation = validateMoralTradeDisclosureDecision(decision);
  const blockers = [
    ...contractValidation.blockers,
    ...decisionValidation.blockers,
    ...decision.blockers,
  ];

  return jsonResponse(
    {
      ok: blockers.length === 0,
      checkedAt: new Date().toISOString(),
      contractVersion: contract.version,
      decisioningMode: contract.decisioningMode,
      stateMutation: false,
      inputBundleUsed: ["disclosure_grant_packet", "disclosure_grant_contract"],
      grant,
      decision,
      decisionValidation,
      contractValidation,
      blockers,
    },
    blockers.length ? 422 : 200,
  );
}
