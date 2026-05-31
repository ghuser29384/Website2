import { createHash } from "node:crypto";

import { createMpgfPublicGoodsIdentityAttestation } from "./mechanism";
import type { MpgfPublicGoodsIdentityAttestation } from "./types";

export interface MpgfPublicGoodsIdentityAdapterInput {
  userId: string;
  provider: MpgfPublicGoodsIdentityAttestation["provider"];
  humanScoreBps?: number;
  externalHumanScore?: number;
  externalHumanScoreScale?: "unit_interval" | "basis_points";
  expiresAt?: string;
  status?: MpgfPublicGoodsIdentityAttestation["status"];
  redactedReference?: string;
  duplicateUserRefs?: string[];
  providerPayload?: Record<string, unknown>;
}

export interface MpgfPublicGoodsIdentityAdapterResult {
  adapterName: string;
  attestation: MpgfPublicGoodsIdentityAttestation;
  duplicateUserRefs: string[];
  eligibilityHint: "eligible" | "pending_review" | "duplicate_identity" | "blocked";
  warnings: string[];
}

const providerDefaultScores: Record<MpgfPublicGoodsIdentityAttestation["provider"], number> = {
  demo_self_attestation: 7_000,
  repository_profile: 8_000,
  external_proof_of_personhood: 0,
};

const providerMinimumScores: Record<MpgfPublicGoodsIdentityAttestation["provider"], number> = {
  demo_self_attestation: 5_000,
  repository_profile: 6_000,
  external_proof_of_personhood: 7_000,
};

const forbiddenIdentityPayloadKeyPattern =
  /email|phone|contact|address|name|secret|token|password|private[_-]?key|raw[_-]?payload|raw[_-]?evidence|receipt|document|credential/i;

function clampHumanScoreBps(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10_000, Math.round(value)));
}

function defaultExpiresAt(provider: MpgfPublicGoodsIdentityAttestation["provider"]) {
  const monthsToAdd = provider === "demo_self_attestation" ? 3 : 12;
  const now = new Date("2026-05-29T12:00:00.000Z");

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsToAdd, now.getUTCDate(), 0, 0, 0)).toISOString();
}

function redactedIdentityReference(provider: MpgfPublicGoodsIdentityAttestation["provider"], userId: string) {
  const digest = createHash("sha256")
    .update(`mpgf-public-goods-identity:${provider}:${userId}`)
    .digest("hex")
    .slice(0, 16);

  return `${provider}:redacted:${digest}`;
}

function normalizeExternalScore(input: MpgfPublicGoodsIdentityAdapterInput) {
  if (input.humanScoreBps != null) {
    return clampHumanScoreBps(input.humanScoreBps);
  }

  if (input.externalHumanScore == null) {
    return providerDefaultScores[input.provider];
  }

  return clampHumanScoreBps(
    input.externalHumanScoreScale === "unit_interval"
      ? input.externalHumanScore * 10_000
      : input.externalHumanScore,
  );
}

function assertRedactedReference(value: string) {
  if (/@|^\+?\d[\d\s().-]{6,}$/.test(value) || forbiddenIdentityPayloadKeyPattern.test(value)) {
    throw new Error("MPGF public-goods identity references must be redacted and non-contact.");
  }
}

function assertProviderPayloadIsRedacted(value: unknown, path = "providerPayload") {
  if (value == null) {
    return;
  }

  if (typeof value === "string") {
    if (/@|^\+?\d[\d\s().-]{6,}$/.test(value)) {
      throw new Error(`MPGF public-goods identity adapter payload ${path} looks like contact data.`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertProviderPayloadIsRedacted(entry, `${path}[${index}]`));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (forbiddenIdentityPayloadKeyPattern.test(key)) {
      throw new Error(`MPGF public-goods identity adapter cannot store raw provider field ${path}.${key}.`);
    }

    assertProviderPayloadIsRedacted(entry, `${path}.${key}`);
  }
}

export function evaluateMpgfPublicGoodsIdentityAdapter(
  input: MpgfPublicGoodsIdentityAdapterInput,
): MpgfPublicGoodsIdentityAdapterResult {
  if (!input.userId.trim()) {
    throw new Error("MPGF public-goods identity adapter requires a user id.");
  }

  assertProviderPayloadIsRedacted(input.providerPayload);

  const warnings: string[] = [];
  const humanScoreBps = normalizeExternalScore(input);
  const duplicateUserRefs = input.duplicateUserRefs ?? [];
  const duplicateUser = duplicateUserRefs.includes(input.userId);
  const minimumScore = providerMinimumScores[input.provider];
  const belowProviderMinimum = humanScoreBps < minimumScore;
  const status =
    input.status ??
    (duplicateUser
      ? "revoked"
      : belowProviderMinimum && input.provider === "external_proof_of_personhood"
        ? "pending_review"
        : "active");
  const redactedReference = input.redactedReference?.trim() || redactedIdentityReference(input.provider, input.userId);

  assertRedactedReference(redactedReference);

  if (belowProviderMinimum) {
    warnings.push(`Human score is below ${input.provider} eligibility guidance.`);
  }

  const attestation = createMpgfPublicGoodsIdentityAttestation({
    userId: input.userId,
    provider: input.provider,
    humanScoreBps,
    expiresAt: input.expiresAt ?? defaultExpiresAt(input.provider),
    status,
    redactedReference,
  });
  const eligibilityHint = duplicateUser
    ? "duplicate_identity"
    : status === "revoked" || status === "expired"
      ? "blocked"
      : status === "pending_review" || belowProviderMinimum
        ? "pending_review"
        : "eligible";

  return {
    adapterName: `mpgf_public_goods_identity_${input.provider}_adapter_v1`,
    attestation,
    duplicateUserRefs,
    eligibilityHint,
    warnings,
  };
}
