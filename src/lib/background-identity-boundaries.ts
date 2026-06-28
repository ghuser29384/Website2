import { createHash } from "node:crypto";

import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  type BackgroundPurposeCode,
} from "@/lib/background-purpose-registry";
import type { Database } from "@/lib/supabase/database.types";

type CandidateHandleInsert =
  Database["public"]["Tables"]["background_candidate_reference_handles"]["Insert"];
type CandidateHandleRow =
  Database["public"]["Tables"]["background_candidate_reference_handles"]["Row"];
type CandidateHandleUpdate =
  Database["public"]["Tables"]["background_candidate_reference_handles"]["Update"];
type EntityResolutionClaimRow =
  Database["public"]["Tables"]["background_entity_resolution_claims"]["Row"];
type PowerAsymmetryReviewRow =
  Database["public"]["Tables"]["background_power_asymmetry_reviews"]["Row"];

export const BACKGROUND_ALLOWED_CANDIDATE_HANDLE_RESOLUTION_REASONS = [
  "operator_review",
  "mutual_consent",
  "safety_hold",
  "legal_hold",
] as const;

export const BACKGROUND_CONFIRMED_ENTITY_RESOLUTION_KINDS = [
  "self_claimed",
  "verified_domain",
  "verified_document",
  "operator_confirmed",
] as const;

export const BACKGROUND_HIGH_DEPENDENCY_CONTEXTS = [
  "funder_grantee",
  "employer_applicant",
  "landlord_tenant",
  "clinician_client",
  "legal_or_immigration_adviser_client",
  "mentor_mentee",
  "platform_admin_user",
  "regulator_regulated_party",
] as const;

export type BackgroundCandidateHandleResolutionReason =
  (typeof BACKGROUND_ALLOWED_CANDIDATE_HANDLE_RESOLUTION_REASONS)[number];
export type BackgroundHighDependencyContext =
  (typeof BACKGROUND_HIGH_DEPENDENCY_CONTEXTS)[number];

export interface BuildBackgroundCandidateHandleInput {
  allowedResolutionReasons?: BackgroundCandidateHandleResolutionReason[];
  candidateProfileId: string;
  cohortScopeId?: string | null;
  delegateRunId: string;
  now?: Date;
  purposeCode: BackgroundPurposeCode;
  purposePolicyVersion?: typeof BACKGROUND_PURPOSE_POLICY_VERSION;
  retentionDays?: number;
  salt: string;
}

export interface BackgroundCandidateHandleResolutionInput {
  handle: Pick<
    CandidateHandleRow,
    | "allowed_resolution_reasons"
    | "candidate_profile_id"
    | "handle_state"
    | "policy_decision_id"
    | "retention_expires_at"
  >;
  now?: Date;
  policyDecisionId?: string | null;
  reason: string;
}

export interface BackgroundBoundaryDecision {
  allowed: boolean;
  blockerCodes: string[];
}

export interface BackgroundEntityResolutionDecision extends BackgroundBoundaryDecision {
  safeStateLabel: "confirmed" | "review_required" | "unavailable";
}

export interface BackgroundPowerAsymmetryDecision extends BackgroundBoundaryDecision {
  boostsAllowed: false;
  requesterSafeLabel: "standard_review" | "review_consent_safeguard";
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POLICY_DECISION_PATTERN = /^bgpd_[0-9a-f]{24,64}$/;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function stableHash(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function purposeBindingMatches(
  bindings: Array<Record<string, unknown>>,
  purposeCode: string,
) {
  return bindings.some(
    (binding) =>
      binding.purposeCode === purposeCode &&
      binding.purposePolicyVersion === BACKGROUND_PURPOSE_POLICY_VERSION,
  );
}

export function buildBackgroundCandidateReferenceHandle({
  allowedResolutionReasons = ["operator_review", "mutual_consent"],
  candidateProfileId,
  cohortScopeId = null,
  delegateRunId,
  now = new Date(),
  purposeCode,
  purposePolicyVersion = BACKGROUND_PURPOSE_POLICY_VERSION,
  retentionDays = 30,
  salt,
}: BuildBackgroundCandidateHandleInput): CandidateHandleInsert {
  if (!isUuid(candidateProfileId) || !isUuid(delegateRunId)) {
    throw new Error("Candidate handles require UUID run and candidate references.");
  }

  if (!salt || salt.length < 16) {
    throw new Error("Candidate handles require a per-run salt.");
  }

  const uniqueReasons = [
    ...new Set(
      allowedResolutionReasons.filter((reason) =>
        BACKGROUND_ALLOWED_CANDIDATE_HANDLE_RESOLUTION_REASONS.includes(reason),
      ),
    ),
  ];
  const handleToken = `bgch_${stableHash([
    "background-candidate-reference-handle-v1",
    delegateRunId,
    candidateProfileId,
    purposeCode,
    cohortScopeId ?? "",
    salt,
  ]).slice(0, 32)}`;

  return {
    allowed_resolution_reasons: uniqueReasons,
    candidate_profile_id: candidateProfileId,
    cohort_scope_id: cohortScopeId,
    delegate_run_id: delegateRunId,
    handle_state: "active",
    handle_token: handleToken,
    purpose_code: purposeCode,
    purpose_policy_version: purposePolicyVersion,
    retention_expires_at: addDays(now, Math.max(1, Math.min(90, retentionDays))).toISOString(),
  };
}

export function canResolveBackgroundCandidateHandle({
  handle,
  now = new Date(),
  policyDecisionId,
  reason,
}: BackgroundCandidateHandleResolutionInput): BackgroundBoundaryDecision {
  const blockerCodes: string[] = [];

  if (handle.handle_state !== "active") {
    blockerCodes.push("candidate_handle_not_active");
  }

  if (!handle.candidate_profile_id) {
    blockerCodes.push("candidate_mapping_unavailable");
  }

  if (new Date(handle.retention_expires_at).getTime() <= now.getTime()) {
    blockerCodes.push("candidate_handle_expired");
  }

  if (
    !BACKGROUND_ALLOWED_CANDIDATE_HANDLE_RESOLUTION_REASONS.includes(
      reason as BackgroundCandidateHandleResolutionReason,
    ) ||
    !handle.allowed_resolution_reasons.includes(
      reason as BackgroundCandidateHandleResolutionReason,
    )
  ) {
    blockerCodes.push("candidate_handle_resolution_reason_not_allowed");
  }

  if (!policyDecisionId || !POLICY_DECISION_PATTERN.test(policyDecisionId)) {
    blockerCodes.push("fresh_policy_decision_required");
  }

  if (handle.policy_decision_id && handle.policy_decision_id !== policyDecisionId) {
    blockerCodes.push("policy_decision_mismatch");
  }

  return {
    allowed: blockerCodes.length === 0,
    blockerCodes,
  };
}

export function redactBackgroundCandidateHandleMapping(
  now = new Date(),
  handleState: CandidateHandleUpdate["handle_state"] = "redacted",
): CandidateHandleUpdate {
  return {
    candidate_profile_id: null,
    handle_state: handleState,
    policy_decision_id: null,
    redacted_at: now.toISOString(),
  };
}

export function serializeBackgroundCandidateHandleForDiagnostics(
  handle: Pick<CandidateHandleRow, "handle_state" | "handle_token" | "purpose_code">,
) {
  return {
    handleState: handle.handle_state,
    handleToken: handle.handle_token,
    purposeCode: handle.purpose_code,
    stableIdentityReturned: false,
  };
}

export function evaluateBackgroundEntityResolutionClaim({
  claim,
  now = new Date(),
  purposeCode,
  surface,
}: {
  claim: Pick<
    EntityResolutionClaimRow,
    | "allowed_purpose_bindings"
    | "allowed_surface_keys"
    | "expires_at"
    | "resolution_kind"
    | "resolution_state"
  > | null;
  now?: Date;
  purposeCode: BackgroundPurposeCode;
  surface: string;
}): BackgroundEntityResolutionDecision {
  const blockerCodes: string[] = [];

  if (!claim) {
    return {
      allowed: false,
      blockerCodes: ["entity_resolution_missing"],
      safeStateLabel: "review_required",
    };
  }

  if (!BACKGROUND_CONFIRMED_ENTITY_RESOLUTION_KINDS.includes(claim.resolution_kind as never)) {
    blockerCodes.push("entity_resolution_kind_not_trusted");
  }

  if (claim.resolution_state !== "confirmed") {
    blockerCodes.push("entity_resolution_not_confirmed");
  }

  if (claim.expires_at && new Date(claim.expires_at).getTime() <= now.getTime()) {
    blockerCodes.push("entity_resolution_expired");
  }

  if (!purposeBindingMatches(claim.allowed_purpose_bindings, purposeCode)) {
    blockerCodes.push("entity_resolution_purpose_out_of_scope");
  }

  if (!claim.allowed_surface_keys.includes(surface)) {
    blockerCodes.push("entity_resolution_surface_out_of_scope");
  }

  return {
    allowed: blockerCodes.length === 0,
    blockerCodes,
    safeStateLabel: blockerCodes.length === 0 ? "confirmed" : "unavailable",
  };
}

export function isHighDependencyBackgroundContext(
  value: string | null | undefined,
): value is BackgroundHighDependencyContext {
  return BACKGROUND_HIGH_DEPENDENCY_CONTEXTS.includes(value as BackgroundHighDependencyContext);
}

export function evaluateBackgroundPowerAsymmetryGate({
  now = new Date(),
  purposeCode,
  relationshipContext,
  review,
  surface,
}: {
  now?: Date;
  purposeCode: BackgroundPurposeCode;
  relationshipContext: string | null | undefined;
  review: Pick<
    PowerAsymmetryReviewRow,
    | "allowed_surface_keys"
    | "boost_policy"
    | "expires_at"
    | "purpose_code"
    | "purpose_policy_version"
    | "relationship_context"
    | "review_state"
    | "safeguard_label"
  > | null;
  surface: string;
}): BackgroundPowerAsymmetryDecision {
  const highDependency = isHighDependencyBackgroundContext(relationshipContext);
  const blockerCodes: string[] = [];

  if (!highDependency) {
    return {
      allowed: true,
      blockerCodes,
      boostsAllowed: false,
      requesterSafeLabel: "standard_review",
    };
  }

  if (!review) {
    return {
      allowed: false,
      blockerCodes: ["power_asymmetry_review_missing"],
      boostsAllowed: false,
      requesterSafeLabel: "review_consent_safeguard",
    };
  }

  if (review.relationship_context !== relationshipContext) {
    blockerCodes.push("power_asymmetry_context_mismatch");
  }

  if (review.review_state !== "approved") {
    blockerCodes.push("power_asymmetry_review_not_approved");
  }

  if (
    review.purpose_code !== purposeCode ||
    review.purpose_policy_version !== BACKGROUND_PURPOSE_POLICY_VERSION
  ) {
    blockerCodes.push("power_asymmetry_purpose_out_of_scope");
  }

  if (!review.allowed_surface_keys.includes(surface)) {
    blockerCodes.push("power_asymmetry_surface_out_of_scope");
  }

  if (new Date(review.expires_at).getTime() <= now.getTime()) {
    blockerCodes.push("power_asymmetry_review_expired");
  }

  if (review.boost_policy !== "boosts_prohibited") {
    blockerCodes.push("power_asymmetry_boost_policy_invalid");
  }

  return {
    allowed: blockerCodes.length === 0,
    blockerCodes,
    boostsAllowed: false,
    requesterSafeLabel: "review_consent_safeguard",
  };
}
