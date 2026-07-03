import { createHash } from "node:crypto";

import type { MpgfPublicGoodsCoalitionRoutingReport } from "./public-goods-coalition-routing";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY =
  "common_ground_budget_preview_no_capture_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY =
  "participant_surplus_confirmation_required_no_dark_pattern_defaults_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY =
  "frozen_eligible_set_then_carry_forward_release_hold_or_manual_review_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY =
  "common_ground_budget_sandbox_requirement_results_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CONDITIONAL_INTENT_POLICY =
  "simple_mode_canonical_conditional_trade_intents_no_capture_v1";

export const MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES = [
  "dry_run_calculation_bundle",
  "route_health_baseline",
  "privacy_review",
  "anti_threat_review",
  "payment_replay_tests",
  "evidence_challenge_tests",
  "reviewer_conflict_tests",
  "emergency_pause_test",
  "neutral_reviewer_approval",
  "deployment_config_snapshot",
  "schema_migration_dry_run",
  "rollback_plan_test",
  "environment_data_isolation_check",
  "donation_offset_lock_confirmation_test",
  "pledge_swap_performance_terms_test",
  "commitment_inventory_double_count_test",
  "atomic_settlement_group_test",
  "pledge_swap_synchronized_performance_test",
  "compensated_moral_action_terms_test",
  "negative_commitment_substitution_test",
  "irreversible_action_gate_test",
  "donor_of_record_tax_receipt_test",
  "third_party_obligation_assessment_test",
  "baseline_integrity_manufacturing_test",
  "compensated_action_classification_test",
  "agreement_amendment_confirmation_test",
  "anti_corruption_improper_inducement_test",
  "representative_authority_verification_test",
  "protected_reporting_non_suppression_test",
  "civil_rights_discrimination_test",
  "participant_autonomy_undue_influence_test",
  "confidentiality_privacy_rights_test",
  "evidence_authenticity_synthetic_media_test",
  "financial_crime_fraud_screening_test",
  "agreement_non_transferability_test",
  "regulated_goods_hazardous_activity_test",
  "cyber_abuse_digital_systems_integrity_test",
  "pledge_performance_bond_neutral_forfeiture_test",
] as const;

const MPGF_COMMON_GROUND_BUDGET_SANDBOX_REQUIRED_REQUIREMENTS = new Set<
  (typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES)[number]
>([
  "dry_run_calculation_bundle",
  "route_health_baseline",
  "privacy_review",
  "anti_threat_review",
  "environment_data_isolation_check",
]);

export type MpgfCommonGroundBudgetPeriod = "monthly" | "round_limited";
export type MpgfCommonGroundBudgetBaselineConfidence = "low" | "medium" | "high";
export type MpgfCommonGroundBudgetStance = "strong" | "weak" | "dissent" | "abstain";
export type MpgfCommonGroundBudgetFallbackRule = "carry_forward" | "reroute" | "release_hold";
export type MpgfCommonGroundBudgetUnroutablePolicy = "carry_forward" | "release_hold" | "manual_review";
export type MpgfCommonGroundBudgetNextCaptureRule =
  | "none_before_final_review"
  | "monthly_after_final_review"
  | "manual_review_required";
export type MpgfCommonGroundBudgetActivationState =
  | "ready_for_confirmation"
  | "preview_only_confirmation_required"
  | "blocked";

export type MpgfCommonGroundBudgetReleaseGateRequirementCode =
  (typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES)[number];

export interface MpgfCommonGroundBudgetReleaseGateRequirementResult {
  id: string;
  requirementCode: MpgfCommonGroundBudgetReleaseGateRequirementCode;
  requirementGroup:
    | "calculation"
    | "route"
    | "privacy"
    | "anti_threat"
    | "payment"
    | "evidence"
    | "reviewer"
    | "deployment"
    | "migration"
    | "environment"
    | "donation_offset"
    | "pledge_swap"
    | "legal"
    | "safety"
    | "security";
  appliesToReleaseStage: "sandbox_calculation";
  required: boolean;
  requirementState: "passed" | "not_required_for_stage";
  evidenceRefs: string[];
  testArtifactHash: string | null;
  routeOrContractRef: string | null;
  reviewerDecisionRef: null;
  privilegedWaiverActionRef: null;
  reasonCodes: string[];
  userStatus:
    | "ready to preview"
    | "payment not authorized"
    | "waiting for later review";
  userNextAction: string;
  moneyOrObligationsAffected: false;
}

export interface MpgfCommonGroundBudgetReleaseGateBundle {
  policy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY;
  releaseStage: "sandbox_calculation";
  decisionState: "approved_for_no_capture_preview";
  stateMutation: "none_preview_only";
  paymentCaptureAllowed: false;
  relianceBearingAgreementAllowed: false;
  requiredRequirementCodes: MpgfCommonGroundBudgetReleaseGateRequirementCode[];
  passedRequirementCodes: MpgfCommonGroundBudgetReleaseGateRequirementCode[];
  blockedRequirementCodes: [];
  notRequiredRequirementCodes: MpgfCommonGroundBudgetReleaseGateRequirementCode[];
  waivedRequirementCodes: [];
  requirementResults: MpgfCommonGroundBudgetReleaseGateRequirementResult[];
  inactiveTrackBlockers: Array<{
    track: "real_money_capture" | "donation_offsets" | "pledge_swaps";
    userStatus: "payment not authorized" | "waiting for later review";
    nextAction: string;
    appealOrCorrectionPath: string | null;
  }>;
  userFacingSummary: string;
  bundleHash: string;
}

export interface MpgfCommonGroundBudgetProject {
  id: string;
  title: string;
  thresholdAmountCents: number;
  thresholdSupporters: number;
}

export interface MpgfCommonGroundBudgetStanceInput {
  campaignId: string;
  stance: MpgfCommonGroundBudgetStance;
  maxAllocCents?: number | null;
  maxAllocBps?: number | null;
  conditionAccepted?: boolean;
  acceptableCounterBucketIds?: string[] | string | null;
  minCounterpartyVolumeCents?: number | null;
  rankOrder?: number | null;
  redactedNote?: string | null;
}

export interface MpgfCommonGroundBudgetPreviewInput {
  roundId: string;
  roundLockTime: string;
  projects: MpgfCommonGroundBudgetProject[];
  coalitionRouting: MpgfPublicGoodsCoalitionRoutingReport;
  budgetPeriod?: MpgfCommonGroundBudgetPeriod;
  monthlyBudgetCents?: number | null;
  roundBudgetCents?: number | null;
  perProjectCapCents?: number | null;
  nextCaptureAt?: string | null;
  nextCaptureRule?: MpgfCommonGroundBudgetNextCaptureRule | null;
  settlementCurrency?: string | null;
  defaultAllocationBaseline?: string | null;
  baselineConfidenceLevel?: MpgfCommonGroundBudgetBaselineConfidence | null;
  baselineConfidenceRationale?: string | null;
  participantSurplusConfirmed?: boolean;
  projectSetChangePolicy?: "require_reconfirmation" | "allow_if_matches_preapproved_policy";
  fallbackRule?: MpgfCommonGroundBudgetFallbackRule;
  unroutableBudgetPolicy?: MpgfCommonGroundBudgetUnroutablePolicy;
  stances?: MpgfCommonGroundBudgetStanceInput[];
}

export interface MpgfCommonGroundBudgetPreviewRow {
  campaignId: string;
  title: string;
  stance: MpgfCommonGroundBudgetStance;
  plainLabel: string;
  canonicalStance: MpgfCommonGroundBudgetStance;
  rankOrder: number;
  maxAllocCents: number;
  maxAllocBps: number;
  conditionAccepted: boolean;
  acceptableCounterBucketIds: string[];
  minCounterpartyVolumeCents: number;
  conditionalTradeIntent: MpgfCommonGroundBudgetConditionalTradeIntentPreview | null;
  projectedAllocationCents: number;
  allocationState: "currently_routed" | "pending_threshold" | "waiting_for_review" | "blocked" | "not_routed";
  candidateStatus: string;
  hardGateStatus: string;
  activeSupporterCount: number;
  activeClusterCount: number;
  amountGapCents: number;
  supporterGap: number;
  clusterGap: number;
  pivotalAction: string;
}

export interface MpgfCommonGroundBudgetConditionalTradeIntentPreview {
  policy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CONDITIONAL_INTENT_POLICY;
  canonicalRecordType: "ConditionalTradeIntent";
  intentState: "active";
  authorizationState: "not_authorized_no_capture_preview";
  projectId: string;
  amountCents: number;
  maxExposureCents: number;
  acceptableCounterBucketIds: string[];
  minCounterpartyVolumeCents: number;
  fallbackRule: MpgfCommonGroundBudgetFallbackRule;
  conditionAccepted: true;
  paymentCaptureAllowed: false;
  finalReviewDisclosureRequired: true;
}

export interface MpgfCommonGroundBudgetPreview {
  ok: true;
  policy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY;
  choiceArchitecturePolicy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY;
  fallbackPolicy: typeof MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY;
  roundId: string;
  releaseStage: "sandbox_calculation";
  paymentCaptureAllowed: false;
  stateMutation: "none_preview_only";
  participantSurplusConfirmationRequired: true;
  participantSurplusConfirmed: boolean;
  activationState: MpgfCommonGroundBudgetActivationState;
  releaseGateRequirementBundle: MpgfCommonGroundBudgetReleaseGateBundle;
  releaseGateRequirementBundleHash: string;
  policySnapshotBundleHash: string;
  userFacingBlockers: Array<{
    reasonCategory: string;
    nextAction: string;
    moneyOrObligationsAffected: false;
    appealOrCorrectionPath: string | null;
  }>;
  budgetPeriod: MpgfCommonGroundBudgetPeriod;
  settlementCurrency: "usd";
  maximumBudgetCents: number;
  perProjectCapCents: number;
  nextCaptureAt: string | null;
  nextCaptureRule: MpgfCommonGroundBudgetNextCaptureRule;
  defaultAllocationBaseline: string;
  baselineConfidenceLevel: MpgfCommonGroundBudgetBaselineConfidence;
  baselineConfidenceRationale: string;
  eligibleProjectSetHash: string;
  eligiblePoolSetHash: string;
  projectSetChangePolicy: "require_reconfirmation" | "allow_if_matches_preapproved_policy";
  fallbackRule: MpgfCommonGroundBudgetFallbackRule;
  fallbackEligibleProjectSetHash: string;
  unroutableBudgetPolicy: MpgfCommonGroundBudgetUnroutablePolicy;
  roundLockConfirmationRequired: true;
  cancelUntil: string;
  termsSnapshotHash: string;
  participantConfirmationHash: string | null;
  tradeClassification: "moral_public_good_coalition";
  noGlobalMoralRanking: true;
  moralReputationAffectsAllocationPower: false;
  eligibleProjectCount: number;
  routedAllocationCents: number;
  pendingThresholdAllocationCents: number;
  blockedAllocationCents: number;
  unroutableBudgetCents: number;
  rows: MpgfCommonGroundBudgetPreviewRow[];
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function requirementGroupFor(
  code: MpgfCommonGroundBudgetReleaseGateRequirementCode,
): MpgfCommonGroundBudgetReleaseGateRequirementResult["requirementGroup"] {
  if (code.includes("payment") || code.includes("donor_of_record") || code.includes("financial_crime")) {
    return "payment";
  }

  if (code.includes("evidence") || code.includes("baseline_integrity")) {
    return "evidence";
  }

  if (code.includes("reviewer") || code.includes("neutral_reviewer")) {
    return "reviewer";
  }

  if (code.includes("deployment") || code.includes("route_health")) {
    return "deployment";
  }

  if (code.includes("migration") || code.includes("rollback")) {
    return "migration";
  }

  if (code.includes("environment")) {
    return "environment";
  }

  if (code.includes("donation_offset") || code.includes("atomic_settlement")) {
    return "donation_offset";
  }

  if (
    code.includes("pledge_swap") ||
    code.includes("compensated") ||
    code.includes("negative_commitment") ||
    code.includes("irreversible") ||
    code.includes("third_party") ||
    code.includes("representative") ||
    code.includes("performance_bond")
  ) {
    return "pledge_swap";
  }

  if (code.includes("privacy") || code.includes("confidentiality")) {
    return "privacy";
  }

  if (code.includes("anti_threat") || code.includes("civil_rights") || code.includes("corruption")) {
    return "anti_threat";
  }

  if (code.includes("regulated") || code.includes("cyber")) {
    return "security";
  }

  if (code.includes("autonomy") || code.includes("reporting")) {
    return "safety";
  }

  return "calculation";
}

function userNextActionForRequirement(
  code: MpgfCommonGroundBudgetReleaseGateRequirementCode,
  required: boolean,
) {
  if (required) {
    return "You can use the sandbox preview; it does not authorize payment or create an agreement.";
  }

  if (code.startsWith("donation_offset") || code.includes("donor_of_record")) {
    return "Donation-offset clearing remains unavailable until its later reviewed release gate passes.";
  }

  if (
    code.includes("pledge_swap") ||
    code.includes("compensated") ||
    code.includes("negative_commitment") ||
    code.includes("irreversible") ||
    code.includes("third_party") ||
    code.includes("representative") ||
    code.includes("performance_bond")
  ) {
    return "Pledge-swap matching remains preview-only until its later reviewed release gate passes.";
  }

  if (code.includes("payment") || code.includes("financial_crime")) {
    return "Payment capture remains disabled until the capped real-money public-goods gate passes.";
  }

  return "No action is needed for this sandbox preview; this control is reserved for a later release stage.";
}

function buildCommonGroundBudgetReleaseGateBundle({
  roundId,
  termsSnapshotHash,
}: {
  roundId: string;
  termsSnapshotHash: string;
}): MpgfCommonGroundBudgetReleaseGateBundle {
  const requirementResults = MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_REQUIREMENT_CODES.map((
    code,
  ): MpgfCommonGroundBudgetReleaseGateRequirementResult => {
    const required = MPGF_COMMON_GROUND_BUDGET_SANDBOX_REQUIRED_REQUIREMENTS.has(code);
    const requirementState: MpgfCommonGroundBudgetReleaseGateRequirementResult["requirementState"] =
      required ? "passed" : "not_required_for_stage";

    return {
      id: hashValue(["common-ground-budget-release-gate-requirement", roundId, code, termsSnapshotHash]),
      requirementCode: code,
      requirementGroup: requirementGroupFor(code),
      appliesToReleaseStage: "sandbox_calculation" as const,
      required,
      requirementState,
      evidenceRefs: required
        ? [
            termsSnapshotHash,
            MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
            MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY,
          ]
        : [MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY],
      testArtifactHash: required
        ? hashValue(["common-ground-budget-sandbox-requirement", roundId, code, termsSnapshotHash])
        : null,
      routeOrContractRef: code === "route_health_baseline"
        ? `/api/mpgf/rounds/${roundId}/common-ground-budget-preview`
        : null,
      reviewerDecisionRef: null,
      privilegedWaiverActionRef: null,
      reasonCodes: required
        ? ["sandbox_preview_no_capture_control_present"]
        : ["not_required_for_sandbox_calculation"],
      userStatus: required ? "ready to preview" : "waiting for later review",
      userNextAction: userNextActionForRequirement(code, required),
      moneyOrObligationsAffected: false as const,
    };
  });
  const passedRequirementCodes = requirementResults
    .filter((result) => result.requirementState === "passed")
    .map((result) => result.requirementCode);
  const notRequiredRequirementCodes = requirementResults
    .filter((result) => result.requirementState === "not_required_for_stage")
    .map((result) => result.requirementCode);
  const bundleWithoutHash: Omit<MpgfCommonGroundBudgetReleaseGateBundle, "bundleHash"> = {
    policy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_RELEASE_GATE_POLICY,
    releaseStage: "sandbox_calculation" as const,
    decisionState: "approved_for_no_capture_preview" as const,
    stateMutation: "none_preview_only" as const,
    paymentCaptureAllowed: false as const,
    relianceBearingAgreementAllowed: false as const,
    requiredRequirementCodes: [...passedRequirementCodes],
    passedRequirementCodes,
    blockedRequirementCodes: [] as [],
    notRequiredRequirementCodes,
    waivedRequirementCodes: [] as [],
    requirementResults,
    inactiveTrackBlockers: [
      {
        track: "real_money_capture" as const,
        userStatus: "payment not authorized" as const,
        nextAction: "Payment capture stays disabled until the capped real-money public-goods gate passes.",
        appealOrCorrectionPath: null,
      },
      {
        track: "donation_offsets" as const,
        userStatus: "waiting for later review" as const,
        nextAction: "Donation-offset clearing is limited to templates and dry-run previews in a later slice.",
        appealOrCorrectionPath: null,
      },
      {
        track: "pledge_swaps" as const,
        userStatus: "waiting for later review" as const,
        nextAction: "Pledge-swap matching stays preview/manual-review only until its later release gate passes.",
        appealOrCorrectionPath: null,
      },
    ],
    userFacingSummary:
      "This round is approved for sandbox budget calculation only. It can preview routing, but it cannot capture payments or create a reliance-bearing agreement.",
  };

  return {
    ...bundleWithoutHash,
    bundleHash: hashValue(bundleWithoutHash),
  };
}

function normalizeCents(value: number | null | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
}

function normalizeCapCents(value: number | null | undefined, fallback: number) {
  const normalized = normalizeCents(value, fallback);

  return Math.max(0, Math.min(fallback, normalized));
}

function normalizeBps(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(10_000, Math.floor(Number(value))));
}

function normalizePositiveCents(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(Number(value)));
}

function normalizeCounterBucketId(value: string) {
  return value
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeCounterBucketIds(value: string[] | string | null | undefined) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]/)
      : [];
  const bucketIds = rawItems
    .map((item) => normalizeCounterBucketId(String(item)))
    .filter(Boolean);
  const uniqueBucketIds = [...new Set(bucketIds)].slice(0, 12);

  return uniqueBucketIds.length > 0
    ? uniqueBucketIds
    : ["bucket-animal-welfare", "bucket-long-run-future", "bucket-public-interest-knowledge"];
}

function compactText(value: string | null | undefined, fallback: string) {
  const compact = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

  return (compact || fallback).slice(0, 700);
}

function normalizeBudgetPeriod(value: MpgfCommonGroundBudgetPeriod | undefined) {
  return value === "round_limited" ? "round_limited" : "monthly";
}

function normalizeBaselineConfidence(value: MpgfCommonGroundBudgetBaselineConfidence | null | undefined) {
  if (value === "low" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeFallbackRule(value: MpgfCommonGroundBudgetFallbackRule | undefined) {
  return value === "reroute" || value === "release_hold" ? value : "carry_forward";
}

function normalizeUnroutablePolicy(value: MpgfCommonGroundBudgetUnroutablePolicy | undefined) {
  return value === "release_hold" || value === "manual_review" ? value : "carry_forward";
}

function normalizeProjectSetChangePolicy(value: MpgfCommonGroundBudgetPreviewInput["projectSetChangePolicy"]) {
  return value === "allow_if_matches_preapproved_policy"
    ? "allow_if_matches_preapproved_policy"
    : "require_reconfirmation";
}

function isCanonicalFutureUtcTimestamp(value: string | null | undefined, after: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  const afterTimestamp = Date.parse(after);

  return Number.isFinite(timestamp) && Number.isFinite(afterTimestamp) && timestamp > afterTimestamp;
}

function defaultMonthlyNextCaptureAt(roundLockTime: string) {
  const timestamp = Date.parse(roundLockTime);
  const base = Number.isFinite(timestamp) ? timestamp : Date.now();

  return new Date(base + 30 * 86_400_000).toISOString();
}

function normalizeNextCapture({
  budgetPeriod,
  nextCaptureAt,
  nextCaptureRule,
  roundLockTime,
}: {
  budgetPeriod: MpgfCommonGroundBudgetPeriod;
  nextCaptureAt: string | null | undefined;
  nextCaptureRule: MpgfCommonGroundBudgetNextCaptureRule | null | undefined;
  roundLockTime: string;
}) {
  if (budgetPeriod === "round_limited") {
    return {
      nextCaptureAt: null,
      nextCaptureRule: "none_before_final_review" as const,
    };
  }

  if (nextCaptureRule === "manual_review_required") {
    return {
      nextCaptureAt: null,
      nextCaptureRule,
    };
  }

  return {
    nextCaptureAt: isCanonicalFutureUtcTimestamp(nextCaptureAt, roundLockTime)
      ? String(nextCaptureAt)
      : defaultMonthlyNextCaptureAt(roundLockTime),
    nextCaptureRule: "monthly_after_final_review" as const,
  };
}

function stanceWeight(stance: MpgfCommonGroundBudgetStance) {
  if (stance === "strong") {
    return 10_000;
  }

  if (stance === "weak") {
    return 6_000;
  }

  return 0;
}

function plainLabelForStance(stance: MpgfCommonGroundBudgetStance) {
  if (stance === "strong") {
    return "Fund this";
  }

  if (stance === "weak") {
    return "Fund if different-view support joins";
  }

  if (stance === "dissent") {
    return "Needs review";
  }

  return "Skip";
}

function isAllocatableStance(stance: MpgfCommonGroundBudgetStance) {
  return stance === "strong" || stance === "weak";
}

function allocationStateFor(
  row: Omit<MpgfCommonGroundBudgetPreviewRow, "allocationState" | "pivotalAction">,
): MpgfCommonGroundBudgetPreviewRow["allocationState"] {
  if (row.stance === "dissent" || row.stance === "abstain" || row.projectedAllocationCents === 0) {
    return "not_routed";
  }

  if (row.hardGateStatus === "blocked") {
    return "blocked";
  }

  if (row.hardGateStatus !== "passed") {
    return "waiting_for_review";
  }

  return row.candidateStatus === "threshold_feasible" ? "currently_routed" : "pending_threshold";
}

function pivotalActionFor(row: Omit<MpgfCommonGroundBudgetPreviewRow, "allocationState" | "pivotalAction">) {
  if (row.stance === "dissent") {
    return "Open or wait for review before routing budget.";
  }

  if (row.stance === "abstain") {
    return "No budget routes to this project.";
  }

  if (row.hardGateStatus === "blocked") {
    return "Choose another eligible project or use the fallback policy.";
  }

  if (row.hardGateStatus !== "passed") {
    return "Wait for reviewer approval before any routed allocation can count.";
  }

  if (row.candidateStatus === "threshold_feasible") {
    return "Confirm the budget preview to join this reviewed round.";
  }

  if (row.clusterGap > 0 || row.supporterGap > 0) {
    return "Copy a user-initiated invite link or wait for broader verified support.";
  }

  return "Add budget or wait for the next batch calculation.";
}

function defaultStances(projects: MpgfCommonGroundBudgetProject[]) {
  return projects.map((project, index): MpgfCommonGroundBudgetStanceInput => ({
    campaignId: project.id,
    stance: "abstain",
    conditionAccepted: false,
    maxAllocBps: 0,
    rankOrder: index + 1,
  }));
}

export function buildMpgfCommonGroundBudgetPreview(
  input: MpgfCommonGroundBudgetPreviewInput,
): MpgfCommonGroundBudgetPreview {
  const budgetPeriod = normalizeBudgetPeriod(input.budgetPeriod);
  const maximumBudgetCents = normalizeCents(
    budgetPeriod === "monthly" ? input.monthlyBudgetCents : input.roundBudgetCents,
    2_500,
  );
  const perProjectCapCents = normalizeCapCents(input.perProjectCapCents ?? null, maximumBudgetCents);
  const { nextCaptureAt, nextCaptureRule } = normalizeNextCapture({
    budgetPeriod,
    nextCaptureAt: input.nextCaptureAt,
    nextCaptureRule: input.nextCaptureRule,
    roundLockTime: input.roundLockTime,
  });
  const projectSetChangePolicy = normalizeProjectSetChangePolicy(input.projectSetChangePolicy);
  const fallbackRule = normalizeFallbackRule(input.fallbackRule);
  const unroutableBudgetPolicy = normalizeUnroutablePolicy(input.unroutableBudgetPolicy);
  const baselineConfidenceLevel = normalizeBaselineConfidence(input.baselineConfidenceLevel);
  const projectsById = new Map(input.projects.map((project) => [project.id, project]));
  const coalitionRowsById = new Map(input.coalitionRouting.rows.map((row) => [row.campaignId, row]));
  const stanceInputs = input.stances?.length ? input.stances : defaultStances(input.projects);
  const normalizedStances = stanceInputs
    .filter((stance) => projectsById.has(stance.campaignId))
    .map((stance, index) => ({
      campaignId: stance.campaignId,
      stance: stance.stance,
      maxAllocCents: normalizeCapCents(stance.maxAllocCents ?? null, perProjectCapCents),
      maxAllocBps: normalizeBps(stance.maxAllocBps ?? null, stance.stance === "abstain" ? 0 : 10_000),
      conditionAccepted: stance.conditionAccepted === true,
      acceptableCounterBucketIds: normalizeCounterBucketIds(stance.acceptableCounterBucketIds),
      minCounterpartyVolumeCents: normalizePositiveCents(stance.minCounterpartyVolumeCents ?? null, 20_000),
      rankOrder: Number.isFinite(stance.rankOrder) && Number(stance.rankOrder) > 0
        ? Math.floor(Number(stance.rankOrder))
        : index + 1,
      redactedNoteHash: stance.redactedNote ? hashValue(["mpgf-common-ground-redacted-note", stance.redactedNote]) : null,
    }))
    .sort((left, right) => left.rankOrder - right.rankOrder || left.campaignId.localeCompare(right.campaignId));
  const eligibleProjectIds = normalizedStances
    .filter((stance) =>
      isAllocatableStance(stance.stance) &&
      stance.conditionAccepted &&
      stance.maxAllocCents > 0 &&
      stance.maxAllocBps > 0 &&
      stance.minCounterpartyVolumeCents > 0 &&
      stance.acceptableCounterBucketIds.length > 0,
    )
    .map((stance) => stance.campaignId)
    .sort();
  const eligibleProjectSetHash = hashValue([
    input.roundId,
    "eligible-project-set",
    eligibleProjectIds,
    projectSetChangePolicy,
  ]);
  const fallbackEligibleProjectSetHash = hashValue([
    input.roundId,
    "fallback-eligible-project-set",
    eligibleProjectIds,
    fallbackRule,
    unroutableBudgetPolicy,
  ]);
  const eligiblePoolSetHash = hashValue([input.roundId, "eligible-pool-set", "project_pool_only_v1"]);
  const budgetableStances = normalizedStances.filter((stance) =>
    stanceWeight(stance.stance) > 0 &&
    stance.conditionAccepted &&
    stance.maxAllocCents > 0 &&
    stance.maxAllocBps > 0 &&
    stance.minCounterpartyVolumeCents > 0 &&
    stance.acceptableCounterBucketIds.length > 0,
  );
  const totalWeight = budgetableStances.reduce((sum, stance) => sum + stanceWeight(stance.stance), 0);
  const projectedAllocations = new Map<string, number>();
  let initiallyAllocatedCents = 0;

  for (const stance of budgetableStances) {
    const bpsCapCents = Math.floor((maximumBudgetCents * stance.maxAllocBps) / 10_000);
    const capCents = Math.min(stance.maxAllocCents, bpsCapCents);
    const weightedShare = totalWeight > 0
      ? Math.floor((maximumBudgetCents * stanceWeight(stance.stance)) / totalWeight)
      : 0;
    const allocationCents = Math.min(capCents, weightedShare);

    projectedAllocations.set(stance.campaignId, allocationCents);
    initiallyAllocatedCents += allocationCents;
  }

  let remainderCents = Math.max(0, maximumBudgetCents - initiallyAllocatedCents);

  for (const stance of budgetableStances) {
    if (remainderCents <= 0) {
      break;
    }

    const bpsCapCents = Math.floor((maximumBudgetCents * stance.maxAllocBps) / 10_000);
    const capCents = Math.min(stance.maxAllocCents, bpsCapCents);
    const current = projectedAllocations.get(stance.campaignId) ?? 0;
    const extra = Math.min(remainderCents, Math.max(0, capCents - current));

    projectedAllocations.set(stance.campaignId, current + extra);
    remainderCents -= extra;
  }

  const rows = normalizedStances.map((stance): MpgfCommonGroundBudgetPreviewRow => {
    const project = projectsById.get(stance.campaignId);
    const coalition = coalitionRowsById.get(stance.campaignId);
    const conditionalTradeIntent: MpgfCommonGroundBudgetConditionalTradeIntentPreview | null =
      isAllocatableStance(stance.stance) &&
      stance.conditionAccepted &&
      stance.maxAllocCents > 0 &&
      stance.maxAllocBps > 0 &&
      stance.minCounterpartyVolumeCents > 0 &&
      stance.acceptableCounterBucketIds.length > 0
        ? {
            policy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CONDITIONAL_INTENT_POLICY,
            canonicalRecordType: "ConditionalTradeIntent",
            intentState: "active",
            authorizationState: "not_authorized_no_capture_preview",
            projectId: stance.campaignId,
            amountCents: Math.min(stance.maxAllocCents, perProjectCapCents),
            maxExposureCents: Math.min(stance.maxAllocCents, perProjectCapCents),
            acceptableCounterBucketIds: stance.acceptableCounterBucketIds,
            minCounterpartyVolumeCents: stance.minCounterpartyVolumeCents,
            fallbackRule,
            conditionAccepted: true,
            paymentCaptureAllowed: false,
            finalReviewDisclosureRequired: true,
          }
        : null;
    const partial = {
      campaignId: stance.campaignId,
      title: project?.title ?? stance.campaignId,
      stance: stance.stance,
      plainLabel: plainLabelForStance(stance.stance),
      canonicalStance: stance.stance,
      rankOrder: stance.rankOrder,
      maxAllocCents: stance.maxAllocCents,
      maxAllocBps: stance.maxAllocBps,
      conditionAccepted: stance.conditionAccepted,
      acceptableCounterBucketIds: stance.acceptableCounterBucketIds,
      minCounterpartyVolumeCents: stance.minCounterpartyVolumeCents,
      conditionalTradeIntent,
      projectedAllocationCents: projectedAllocations.get(stance.campaignId) ?? 0,
      candidateStatus: coalition?.candidateStatus ?? "hard_gate_pending",
      hardGateStatus: coalition?.hardGateStatus ?? "pending_review",
      activeSupporterCount: coalition?.activeSupporterCount ?? 0,
      activeClusterCount: coalition?.activeClusterCount ?? 0,
      amountGapCents: coalition?.amountGapCents ?? project?.thresholdAmountCents ?? 0,
      supporterGap: coalition?.supporterGap ?? project?.thresholdSupporters ?? 0,
      clusterGap: coalition?.clusterGap ?? input.coalitionRouting.thresholdClusterMin,
    };

    return {
      ...partial,
      allocationState: allocationStateFor(partial),
      pivotalAction: pivotalActionFor(partial),
    };
  });
  const routedAllocationCents = rows
    .filter((row) => row.allocationState === "currently_routed")
    .reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const pendingThresholdAllocationCents = rows
    .filter((row) => row.allocationState === "pending_threshold" || row.allocationState === "waiting_for_review")
    .reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const blockedAllocationCents = rows
    .filter((row) => row.allocationState === "blocked")
    .reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const allocatedCents = rows.reduce((sum, row) => sum + row.projectedAllocationCents, 0);
  const userFacingBlockers = [];

  if (!input.participantSurplusConfirmed) {
    userFacingBlockers.push({
      reasonCategory: "user_action_needed",
      nextAction: "Confirm that this routing is acceptable relative to your stated default allocation.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: null,
    });
  }

  if (blockedAllocationCents > 0) {
    userFacingBlockers.push({
      reasonCategory: "safety_or_anti_threat",
      nextAction: "Remove blocked projects or wait for reviewer correction before relying on the preview.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: "/mpgf/governance",
    });
  }

  if (!eligibleProjectIds.length) {
    userFacingBlockers.push({
      reasonCategory: "user_action_needed",
      nextAction: "Choose Fund this or Fund if different-view support joins for at least one reviewed project.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: null,
    });
  }

  if (
    normalizedStances.some((stance) =>
      isAllocatableStance(stance.stance) &&
      (!stance.conditionAccepted ||
        stance.maxAllocCents <= 0 ||
        stance.maxAllocBps <= 0 ||
        stance.minCounterpartyVolumeCents <= 0 ||
        stance.acceptableCounterBucketIds.length === 0),
    )
  ) {
    userFacingBlockers.push({
      reasonCategory: "user_action_needed",
      nextAction:
        "Accept a positive project cap and explicit cross-view condition before a Fund this or Fund if different-view support joins choice can save.",
      moneyOrObligationsAffected: false as const,
      appealOrCorrectionPath: null,
    });
  }

  const termsSnapshotHash = hashValue([
    input.roundId,
    budgetPeriod,
    maximumBudgetCents,
    perProjectCapCents,
    nextCaptureAt,
    nextCaptureRule,
    "usd",
    input.defaultAllocationBaseline,
    baselineConfidenceLevel,
    eligibleProjectSetHash,
    fallbackRule,
    unroutableBudgetPolicy,
    input.roundLockTime,
    normalizedStances,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
  ]);
  const releaseGateRequirementBundle = buildCommonGroundBudgetReleaseGateBundle({
    roundId: input.roundId,
    termsSnapshotHash,
  });
  const policySnapshotBundleHash = hashValue([
    input.roundId,
    termsSnapshotHash,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY,
    MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY,
    releaseGateRequirementBundle.bundleHash,
  ]);

  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_PREVIEW_POLICY,
    choiceArchitecturePolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_CHOICE_POLICY,
    fallbackPolicy: MPGF_PUBLIC_GOODS_COMMON_GROUND_BUDGET_FALLBACK_POLICY,
    roundId: input.roundId,
    releaseStage: "sandbox_calculation",
    paymentCaptureAllowed: false,
    stateMutation: "none_preview_only",
    participantSurplusConfirmationRequired: true,
    participantSurplusConfirmed: Boolean(input.participantSurplusConfirmed),
    activationState: userFacingBlockers.length
      ? (blockedAllocationCents > 0 ? "blocked" : "preview_only_confirmation_required")
      : "ready_for_confirmation",
    releaseGateRequirementBundle,
    releaseGateRequirementBundleHash: releaseGateRequirementBundle.bundleHash,
    policySnapshotBundleHash,
    userFacingBlockers,
    budgetPeriod,
    settlementCurrency: "usd",
    maximumBudgetCents,
    perProjectCapCents,
    nextCaptureAt,
    nextCaptureRule,
    defaultAllocationBaseline: compactText(
      input.defaultAllocationBaseline,
      "I would otherwise hold this budget or donate through my usual default allocation.",
    ),
    baselineConfidenceLevel,
    baselineConfidenceRationale: compactText(
      input.baselineConfidenceRationale,
      "Self-attested preview only; confidence must be reviewed before reliance-bearing use.",
    ),
    eligibleProjectSetHash,
    eligiblePoolSetHash,
    projectSetChangePolicy,
    fallbackRule,
    fallbackEligibleProjectSetHash,
    unroutableBudgetPolicy,
    roundLockConfirmationRequired: true,
    cancelUntil: input.roundLockTime,
    termsSnapshotHash,
    participantConfirmationHash: input.participantSurplusConfirmed
      ? hashValue([
          "participant-confirmation",
          termsSnapshotHash,
          releaseGateRequirementBundle.bundleHash,
          policySnapshotBundleHash,
          "surplus-confirmed",
        ])
      : null,
    tradeClassification: "moral_public_good_coalition",
    noGlobalMoralRanking: true,
    moralReputationAffectsAllocationPower: false,
    eligibleProjectCount: eligibleProjectIds.length,
    routedAllocationCents,
    pendingThresholdAllocationCents,
    blockedAllocationCents,
    unroutableBudgetCents: Math.max(0, maximumBudgetCents - allocatedCents),
    rows,
    calcHash: hashValue([
      input.roundId,
      termsSnapshotHash,
      releaseGateRequirementBundle.bundleHash,
      perProjectCapCents,
      nextCaptureAt,
      nextCaptureRule,
      rows.map((row) => [
        row.campaignId,
        row.stance,
        row.conditionAccepted,
        row.acceptableCounterBucketIds,
        row.minCounterpartyVolumeCents,
        row.conditionalTradeIntent,
        row.projectedAllocationCents,
        row.allocationState,
      ]),
    ]),
  };
}
