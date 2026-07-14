import { createHash } from "node:crypto";

import {
  getActiveBackgroundReleaseManifest,
  getBackgroundClaimAssuranceTaxonomyBundle,
  type BackgroundClaimAssuranceTaxonomyBundleEntry,
} from "@/lib/background-phase-gates";
import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  type BackgroundPurposeCode,
} from "@/lib/background-purpose-registry";
import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION =
  "background-claim-assurance-response-v1";
export const BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION =
  "background-pairwise-safety-response-v1";

type ClaimAssuranceInsert =
  Database["public"]["Tables"]["background_claim_assurance_records"]["Insert"];
type ClaimAssuranceRow =
  Database["public"]["Tables"]["background_claim_assurance_records"]["Row"];
type PairwiseSafetyInsert =
  Database["public"]["Tables"]["background_pairwise_safety_preferences"]["Insert"];
type PairwiseSafetyRow =
  Database["public"]["Tables"]["background_pairwise_safety_preferences"]["Row"];

export type BackgroundClaimKind = ClaimAssuranceRow["claim_kind"];
export type BackgroundClaimAssuranceLevel = ClaimAssuranceRow["assurance_level"];
export type BackgroundClaimEvidenceState = ClaimAssuranceRow["evidence_state"];
export type BackgroundClaimReviewState = ClaimAssuranceRow["review_state"];
export type BackgroundPairwiseSafetyPreferenceKind = PairwiseSafetyRow["preference_kind"];
export type BackgroundPairwiseSafetyScopeKind = PairwiseSafetyRow["scope_kind"];

export interface BackgroundClaimAssuranceBuildInput {
  allowedPurposeCodes?: string[];
  allowedSurfaceKeys?: string[];
  assuranceLevel?: string | null;
  broadClaimKey?: string | null;
  claimKind?: string | null;
  evidenceState?: string | null;
  expiresAt?: string | null;
  participantId: string;
  redactedEvidenceSummary?: string | null;
  reviewState?: string | null;
}

export interface BackgroundClaimAssuranceDecision {
  allowed: boolean;
  blockerCodes: string[];
  safeLabel: string;
}

export interface BackgroundPairwiseSafetyBuildInput {
  createdFromEventKind?: string | null;
  expiresAt?: string | null;
  participantId: string;
  preferenceKind?: string | null;
  purposeCode?: string | null;
  reasonCode?: string | null;
  scopeKind?: string | null;
  scopeValueInternal?: string | null;
  state?: string | null;
}

export interface BackgroundPairwiseSafetyDecision {
  blocked: boolean;
  blockerCodes: string[];
  requesterSafeState: "available" | "unavailable" | "privacy_or_consent_gate" | "closed";
}

const CLAIM_KINDS = new Set<BackgroundClaimKind>([
  "credential",
  "authority",
  "funding_capacity",
  "institutional_affiliation",
  "legal_expertise",
  "medical_expertise",
  "immigration_expertise",
  "fiscal_sponsorship",
  "scarce_resource",
  "safety_relevant_capability",
  "other_high_impact",
]);
const ASSURANCE_LEVELS = new Set<BackgroundClaimAssuranceLevel>([
  "self_attested",
  "evidence_submitted",
  "operator_reviewed",
  "externally_verified",
  "expired",
  "revoked",
  "rejected",
]);
const EVIDENCE_STATES = new Set<BackgroundClaimEvidenceState>([
  "none",
  "redacted_summary",
  "vault_bound_evidence",
  "external_verification_ref",
]);
const REVIEW_STATES = new Set<BackgroundClaimReviewState>([
  "pending",
  "approved",
  "rejected",
  "stale",
  "revoked",
]);
const PAIRWISE_PREFERENCE_KINDS = new Set<BackgroundPairwiseSafetyPreferenceKind>([
  "block",
  "do_not_match",
  "mute",
  "no_recontact",
  "no_reminders",
]);
const PAIRWISE_SCOPE_KINDS = new Set<BackgroundPairwiseSafetyScopeKind>([
  "cohort",
  "global_background_networking",
  "intro_request",
  "organization",
  "partner",
  "profile",
  "purpose_code",
]);
const PAIRWISE_REASON_CODES = new Set<NonNullable<PairwiseSafetyRow["reason_code"]>>([
  "already_connected",
  "bad_timing",
  "not_relevant",
  "operator_safety",
  "participant_request",
  "privacy",
  "safety",
]);
const PAIRWISE_EVENT_KINDS = new Set<
  NonNullable<PairwiseSafetyRow["created_from_event_kind"]>
>([
  "declined_intro",
  "dismissal",
  "manual",
  "operator_safety_action",
  "post_consent_interaction",
  "report",
]);
const PURPOSE_CODES = new Set<string>([
  "community_intro",
  "donation_offset",
  "moral_public_good",
  "moral_trade_offer",
  "pledge_swap",
  "research_collaboration",
]);
const BROAD_TOKEN_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,95}$/;
const EXACT_DETAIL_PATTERN =
  /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|https?:\/\/|www\.|@[A-Za-z0-9_]{2,}|(?:\+?\d[\d\s().-]{7,}\d)|credential\s*(?:id|number|no\.?|#)|license\s*(?:id|number|no\.?|#)|passport|ssn|private key)/i;

function compactString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizePurposeBindings(purposeCodes: string[]) {
  return [...new Set(purposeCodes)]
    .map((purposeCode) => compactString(purposeCode).toLowerCase())
    .filter((purposeCode): purposeCode is BackgroundPurposeCode =>
      PURPOSE_CODES.has(purposeCode),
    )
    .map((purposeCode) => ({
      purposeCode,
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    }));
}

function normalizeBroadTokens(values: string[], max = 16) {
  return [...new Set(values.map((value) => compactString(value).toLowerCase()).filter(Boolean))]
    .filter((value) => BROAD_TOKEN_PATTERN.test(value) && !EXACT_DETAIL_PATTERN.test(value))
    .slice(0, max);
}

function assuranceRank(level: string) {
  switch (level) {
    case "self_attested":
      return 0;
    case "evidence_submitted":
      return 1;
    case "operator_reviewed":
      return 2;
    case "externally_verified":
      return 3;
    default:
      return -1;
  }
}

export function findBackgroundClaimAssuranceTaxonomyEntry({
  broadClaimKey,
  claimKind,
}: {
  broadClaimKey: string;
  claimKind: string;
}) {
  return getBackgroundClaimAssuranceTaxonomyBundle().find(
    (row) => row.claimKind === claimKind && row.broadClaimKey === broadClaimKey,
  );
}

export function buildBackgroundClaimAssuranceRecord({
  allowedPurposeCodes = ["moral_trade_offer"],
  allowedSurfaceKeys = [],
  assuranceLevel,
  broadClaimKey,
  claimKind,
  evidenceState,
  expiresAt,
  participantId,
  redactedEvidenceSummary,
  reviewState,
}: BackgroundClaimAssuranceBuildInput): { errors: string[]; row: ClaimAssuranceInsert | null } {
  const errors: string[] = [];
  const normalizedClaimKind = compactString(claimKind) as BackgroundClaimKind;
  const normalizedClaimKey = compactString(broadClaimKey).toLowerCase();
  const normalizedAssurance = compactString(assuranceLevel) as BackgroundClaimAssuranceLevel;
  const normalizedEvidence = compactString(evidenceState) as BackgroundClaimEvidenceState;
  const normalizedReview = compactString(reviewState) as BackgroundClaimReviewState;
  const normalizedSummary = compactString(redactedEvidenceSummary).slice(0, 420);
  const normalizedExpiresAt = compactString(expiresAt);
  const expires = new Date(normalizedExpiresAt);
  const purposeBindings = normalizePurposeBindings(allowedPurposeCodes);
  const surfaces = normalizeBroadTokens(allowedSurfaceKeys);
  const manifest = getActiveBackgroundReleaseManifest();

  if (!CLAIM_KINDS.has(normalizedClaimKind)) {
    errors.push("Choose a supported high-impact claim kind.");
  }

  if (!BROAD_TOKEN_PATTERN.test(normalizedClaimKey) || EXACT_DETAIL_PATTERN.test(normalizedClaimKey)) {
    errors.push("Broad claim key must be schema-bound and must not contain exact evidence.");
  }

  if (!ASSURANCE_LEVELS.has(normalizedAssurance)) {
    errors.push("Choose a supported assurance level.");
  }

  if (!EVIDENCE_STATES.has(normalizedEvidence)) {
    errors.push("Choose a supported evidence state.");
  }

  if (!REVIEW_STATES.has(normalizedReview)) {
    errors.push("Choose a supported review state.");
  }

  if (!normalizedExpiresAt || Number.isNaN(expires.getTime())) {
    errors.push("Assurance expiry is required.");
  }

  if (purposeBindings.length === 0) {
    errors.push("At least one supported purpose binding is required.");
  }

  if (surfaces.length === 0) {
    errors.push("At least one broad surface key is required.");
  }

  if (normalizedSummary && EXACT_DETAIL_PATTERN.test(normalizedSummary)) {
    errors.push("Redacted evidence summary must not contain contact details, credential numbers, or raw evidence.");
  }

  if (errors.length) {
    return { errors: [...new Set(errors)], row: null };
  }

  const assuranceVersion = `claim-assurance-v1:${stableHash({
    allowedPurposeBindings: purposeBindings,
    allowedSurfaceKeys: surfaces,
    assuranceLevel: normalizedAssurance,
    broadClaimKey: normalizedClaimKey,
    claimKind: normalizedClaimKind,
    evidenceState: normalizedEvidence,
    expiresAt: normalizedExpiresAt,
    reviewState: normalizedReview,
  }).slice(0, 24)}`;

  return {
    errors: [],
    row: {
      allowed_purpose_bindings: purposeBindings,
      allowed_surface_keys: surfaces,
      assurance_level: normalizedAssurance,
      assurance_version: assuranceVersion,
      broad_claim_key: normalizedClaimKey,
      claim_assurance_taxonomy_hash_snapshot: manifest.claimAssuranceTaxonomyHash,
      claim_assurance_taxonomy_version_snapshot: manifest.claimAssuranceTaxonomyVersion,
      claim_kind: normalizedClaimKind,
      confirmed_at: normalizedReview === "approved" ? new Date().toISOString() : null,
      evidence_state: normalizedEvidence,
      expires_at: normalizedExpiresAt,
      participant_id: participantId,
      redacted_evidence_summary: normalizedSummary || null,
      review_state: normalizedReview,
    },
  };
}

export function evaluateBackgroundClaimAssurance({
  now = new Date(),
  purposeCode,
  record,
  surface,
  taxonomyEntry,
}: {
  now?: Date;
  purposeCode: BackgroundPurposeCode;
  record: Pick<
    ClaimAssuranceRow,
    | "allowed_purpose_bindings"
    | "allowed_surface_keys"
    | "assurance_level"
    | "broad_claim_key"
    | "claim_assurance_taxonomy_hash_snapshot"
    | "claim_assurance_taxonomy_version_snapshot"
    | "claim_kind"
    | "evidence_state"
    | "expires_at"
    | "review_state"
  > | null;
  surface: string;
  taxonomyEntry?: BackgroundClaimAssuranceTaxonomyBundleEntry | null;
}): BackgroundClaimAssuranceDecision {
  const blockerCodes: string[] = [];
  const manifest = getActiveBackgroundReleaseManifest();

  if (!record) {
    return {
      allowed: false,
      blockerCodes: ["claim_assurance_missing"],
      safeLabel: "assurance unavailable",
    };
  }

  const taxonomy =
    taxonomyEntry ??
    findBackgroundClaimAssuranceTaxonomyEntry({
      broadClaimKey: record.broad_claim_key,
      claimKind: record.claim_kind,
    });

  if (!taxonomy || taxonomy.status !== "active") {
    blockerCodes.push("claim_assurance_taxonomy_disabled");
  }

  if (
    record.claim_assurance_taxonomy_hash_snapshot !== manifest.claimAssuranceTaxonomyHash ||
    record.claim_assurance_taxonomy_version_snapshot !== manifest.claimAssuranceTaxonomyVersion
  ) {
    blockerCodes.push("claim_assurance_taxonomy_snapshot_stale");
  }

  if (record.review_state !== "approved") {
    blockerCodes.push("claim_assurance_review_not_approved");
  }

  if (["expired", "rejected", "revoked"].includes(record.assurance_level)) {
    blockerCodes.push("claim_assurance_terminal_state");
  }

  if (new Date(record.expires_at).getTime() <= now.getTime()) {
    blockerCodes.push("claim_assurance_expired");
  }

  if (
    !record.allowed_purpose_bindings.some(
      (binding) =>
        binding.purposeCode === purposeCode &&
        binding.purposePolicyVersion === BACKGROUND_PURPOSE_POLICY_VERSION,
    )
  ) {
    blockerCodes.push("claim_assurance_purpose_out_of_scope");
  }

  if (!record.allowed_surface_keys.includes(surface)) {
    blockerCodes.push("claim_assurance_surface_out_of_scope");
  }

  if (taxonomy) {
    if (assuranceRank(record.assurance_level) < assuranceRank(taxonomy.minimumAssuranceLevel)) {
      blockerCodes.push("claim_assurance_under_assured");
    }

    if (!taxonomy.allowedSurfaceKeys.includes(surface)) {
      blockerCodes.push("claim_assurance_taxonomy_surface_disabled");
    }
  }

  if (record.evidence_state === "none") {
    blockerCodes.push("claim_assurance_evidence_missing");
  }

  return {
    allowed: blockerCodes.length === 0,
    blockerCodes: [...new Set(blockerCodes)],
    safeLabel: blockerCodes.length === 0 ? "assurance current" : "assurance unavailable",
  };
}

export function buildBackgroundPairwiseSafetyPreferenceRow({
  createdFromEventKind,
  expiresAt,
  participantId,
  preferenceKind,
  purposeCode,
  reasonCode,
  scopeKind,
  scopeValueInternal,
  state,
}: BackgroundPairwiseSafetyBuildInput): { errors: string[]; row: PairwiseSafetyInsert | null } {
  const errors: string[] = [];
  const normalizedKind = compactString(preferenceKind) as BackgroundPairwiseSafetyPreferenceKind;
  const normalizedScopeKind = compactString(scopeKind) as BackgroundPairwiseSafetyScopeKind;
  const normalizedScopeValue = compactString(scopeValueInternal);
  const normalizedPurpose = compactString(purposeCode).toLowerCase();
  const normalizedState = (compactString(state) || "active") as PairwiseSafetyRow["state"];
  const normalizedExpiresAt = compactString(expiresAt) || null;
  const normalizedReason =
    (compactString(reasonCode) || "participant_request") as NonNullable<
      PairwiseSafetyRow["reason_code"]
    >;
  const normalizedEventKind =
    (compactString(createdFromEventKind) || "manual") as NonNullable<
      PairwiseSafetyRow["created_from_event_kind"]
    >;

  if (!PAIRWISE_PREFERENCE_KINDS.has(normalizedKind)) {
    errors.push("Choose a supported safety preference kind.");
  }

  if (!PAIRWISE_SCOPE_KINDS.has(normalizedScopeKind)) {
    errors.push("Choose a supported safety preference scope.");
  }

  if (
    normalizedScopeValue.length < 3 ||
    normalizedScopeValue.length > 160 ||
    EXACT_DETAIL_PATTERN.test(normalizedScopeValue)
  ) {
    errors.push("Safety preference scope must use an internal opaque reference.");
  }

  if (normalizedPurpose && !PURPOSE_CODES.has(normalizedPurpose)) {
    errors.push("Choose a supported purpose code or leave purpose blank.");
  }

  if (!["active", "paused", "revoked", "expired"].includes(normalizedState)) {
    errors.push("Choose a supported safety preference state.");
  }

  if (!PAIRWISE_REASON_CODES.has(normalizedReason)) {
    errors.push("Choose a supported safety preference reason.");
  }

  if (!PAIRWISE_EVENT_KINDS.has(normalizedEventKind)) {
    errors.push("Choose a supported safety preference source event.");
  }

  if (normalizedExpiresAt && Number.isNaN(new Date(normalizedExpiresAt).getTime())) {
    errors.push("Safety preference expiry must be a valid timestamp.");
  }

  if (errors.length) {
    return { errors: [...new Set(errors)], row: null };
  }

  const safetyPreferenceVersion = `pairwise-safety-v1:${stableHash({
    normalizedKind,
    normalizedPurpose,
    normalizedScopeKind,
    normalizedScopeValue,
    normalizedState,
    normalizedExpiresAt,
  }).slice(0, 24)}`;

  return {
    errors: [],
    row: {
      created_from_event_kind:
        normalizedEventKind,
      expires_at: normalizedExpiresAt,
      participant_id: participantId,
      preference_kind: normalizedKind,
      purpose_code: (normalizedPurpose as PairwiseSafetyRow["purpose_code"]) || null,
      purpose_policy_version: normalizedPurpose ? BACKGROUND_PURPOSE_POLICY_VERSION : null,
      reason_code:
        normalizedReason,
      safety_preference_version: safetyPreferenceVersion,
      scope_kind: normalizedScopeKind,
      scope_value_internal: normalizedScopeValue,
      state: normalizedState,
    },
  };
}

export function evaluateBackgroundPairwiseSafetyPreference({
  now = new Date(),
  preference,
  purposeCode,
  scopeKind,
  scopeValueInternal,
}: {
  now?: Date;
  preference: Pick<
    PairwiseSafetyRow,
    "expires_at" | "preference_kind" | "purpose_code" | "scope_kind" | "scope_value_internal" | "state"
  > | null;
  purposeCode?: string | null;
  scopeKind: BackgroundPairwiseSafetyScopeKind;
  scopeValueInternal: string;
}): BackgroundPairwiseSafetyDecision {
  if (!preference || preference.state !== "active") {
    return { blocked: false, blockerCodes: [], requesterSafeState: "available" };
  }

  if (preference.expires_at && new Date(preference.expires_at).getTime() <= now.getTime()) {
    return { blocked: false, blockerCodes: [], requesterSafeState: "available" };
  }

  const scopeMatches =
    preference.scope_kind === "global_background_networking" ||
    (preference.scope_kind === scopeKind &&
      preference.scope_value_internal === scopeValueInternal);
  const purposeMatches = !preference.purpose_code || preference.purpose_code === purposeCode;

  if (!scopeMatches || !purposeMatches) {
    return { blocked: false, blockerCodes: [], requesterSafeState: "available" };
  }

  const reminderOnly = preference.preference_kind === "mute" || preference.preference_kind === "no_reminders";

  return {
    blocked: true,
    blockerCodes: [`pairwise_safety_${preference.preference_kind}`],
    requesterSafeState: reminderOnly ? "privacy_or_consent_gate" : "closed",
  };
}
