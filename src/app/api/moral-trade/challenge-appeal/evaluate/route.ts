import { NextResponse } from "next/server";

import {
  evaluateMoralTradeChallengeAppeal,
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealDecision,
  type MoralTradeAppealTrigger,
  type MoralTradeChallengeAppealInput,
  type MoralTradeChallengeAppealOutcome,
  type MoralTradeChallengeStanding,
  type MoralTradeChallengeSubject,
} from "@/lib/moral-trade/challenge-appeal";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 1200;

const SUBJECTS = new Set<MoralTradeChallengeSubject>([
  "claim",
  "evidence_row",
  "baseline_concern",
  "disclosure_decision",
  "externality_trigger",
  "completion_state",
  "policy_flag",
]);

const STANDINGS = new Set<MoralTradeChallengeStanding>([
  "participant",
  "counterparty",
  "affected_party",
  "reviewer",
  "admin_safety",
  "external_verifier",
]);

const TRIGGERS = new Set<MoralTradeAppealTrigger>([
  "duplicate_proof",
  "coercive_baseline",
  "wrong_scope_evidence",
  "material_factual_error",
  "privacy_disclosure_error",
  "externality_remedy_gap",
  "reviewer_conflict",
  "policy_misapplied",
]);

const OUTCOMES = new Set<MoralTradeChallengeAppealOutcome>([
  "uphold_decision",
  "request_evidence",
  "route_human_review",
  "open_challenge_window",
  "block_reliance",
  "record_remedy",
  "close_unresolved",
  "correct_record",
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

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeSubject(value: unknown): MoralTradeChallengeSubject {
  const normalized = normalizeString(value);

  return SUBJECTS.has(normalized as MoralTradeChallengeSubject)
    ? (normalized as MoralTradeChallengeSubject)
    : "claim";
}

function normalizeStanding(value: unknown): MoralTradeChallengeStanding {
  const normalized = normalizeString(value);

  return STANDINGS.has(normalized as MoralTradeChallengeStanding)
    ? (normalized as MoralTradeChallengeStanding)
    : "participant";
}

function normalizeTrigger(value: unknown): MoralTradeAppealTrigger {
  const normalized = normalizeString(value);

  return TRIGGERS.has(normalized as MoralTradeAppealTrigger)
    ? (normalized as MoralTradeAppealTrigger)
    : "material_factual_error";
}

function normalizeOutcome(value: unknown): MoralTradeChallengeAppealOutcome | undefined {
  const normalized = normalizeString(value);

  return OUTCOMES.has(normalized as MoralTradeChallengeAppealOutcome)
    ? (normalized as MoralTradeChallengeAppealOutcome)
    : undefined;
}

function getAppealInput(body: Record<string, unknown>): MoralTradeChallengeAppealInput {
  const candidate = isRecord(body.appeal) ? body.appeal : body;

  return {
    requestId: normalizeString(candidate.requestId),
    subject: normalizeSubject(candidate.subject),
    standing: normalizeStanding(candidate.standing),
    trigger: normalizeTrigger(candidate.trigger),
    summary: normalizeString(candidate.summary),
    claimId: normalizeString(candidate.claimId) || undefined,
    evidenceRowId: normalizeString(candidate.evidenceRowId) || undefined,
    priorDecisionId: normalizeString(candidate.priorDecisionId) || undefined,
    challengeWindowOpen: normalizeBoolean(candidate.challengeWindowOpen),
    containsPrivateDetails: normalizeBoolean(candidate.containsPrivateDetails),
    requestedOutcome: normalizeOutcome(candidate.requestedOutcome),
    affectedPartyStandingSummary:
      normalizeString(candidate.affectedPartyStandingSummary) || undefined,
    remedyRequested: normalizeString(candidate.remedyRequested) || undefined,
    reviewerConflictDeclared: normalizeBoolean(candidate.reviewerConflictDeclared),
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
  const contract = getMoralTradeChallengeAppealContract();
  const contractValidation = validateMoralTradeChallengeAppealContract(contract);
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
        inputBundleUsed: ["challenge_appeal_packet", "challenge_appeal_contract"],
        contractValidation,
        fallback:
          "Invalid JSON falls back to no appeal routing without changing state or exposing private details.",
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
        inputBundleUsed: ["challenge_appeal_packet", "challenge_appeal_contract"],
        contractValidation,
        fallback:
          "Missing request object falls back to no appeal routing without changing state or exposing private details.",
        blockers: ["request_body: object is required"],
      },
      400,
    );
  }

  const appeal = getAppealInput(body);
  const decision = evaluateMoralTradeChallengeAppeal(appeal);
  const decisionValidation = validateMoralTradeChallengeAppealDecision(decision);
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
      inputBundleUsed: ["challenge_appeal_packet", "challenge_appeal_contract"],
      appeal,
      decision,
      decisionValidation,
      contractValidation,
      blockers,
    },
    blockers.length ? 422 : 200,
  );
}
