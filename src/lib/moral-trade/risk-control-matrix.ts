export const MORAL_TRADE_RISK_CONTROL_MATRIX_CONTRACT_VERSION =
  "moral-trade-risk-control-matrix-v0.1-2026-06";
export const MORAL_TRADE_RISK_CONTROL_MATRIX_VALIDATOR_VERSION =
  "moral-trade-risk-control-matrix-validator-v0.1";

export type MoralTradeRiskControlTransition =
  | "draft_preview"
  | "match_candidate_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion"
  | "dispute_or_appeal_resolution";

export type MoralTradeRiskControlTradeType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "performance_bond"
  | "side_agreement"
  | "evidence_claim"
  | "payment_event"
  | "manual_review"
  | "mixed";

export type MoralTradeRiskControlSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "compensated_action_terms"
  | "pledge_performance_bond_record"
  | "payment_event"
  | "evidence_record"
  | "dispute_case"
  | "appeal_case";

export type MoralTradeRiskControlReleaseStage =
  | "draft_preview"
  | "match_candidate_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_release"
  | "manual_review"
  | "release_gate_promotion";

export type MoralTradeRiskControlTier =
  | "tier_1_money_only_donation_offset"
  | "tier_2_donation_offset_with_abstention_or_additionality_proof"
  | "tier_3_closed_counterparty_pledge_swap"
  | "tier_4_open_market_pledge_swap_or_compensated_action"
  | "not_applicable";

export type MoralTradeRiskControlEvidenceBurden =
  | "none_required"
  | "low"
  | "medium"
  | "high"
  | "confidential_attestation_required";

export type MoralTradeRiskControlCode =
  | "participant_term_sheet"
  | "counterparty_blinding"
  | "staged_counterparty_disclosure"
  | "recipient_acceptance"
  | "ai_preference_elicitation"
  | "post_clear_audit"
  | "review_capacity"
  | "non_public_goods_subsidy"
  | "direct_pair_clearing"
  | "cause_bucket_taxonomy"
  | "resource_compatibility"
  | "net_offset_accounting"
  | "approved_trade_template"
  | "non_public_goods_tier"
  | "counterfactual_trust"
  | "private_exchange_rate_quote"
  | "noncompensable_blocker"
  | "offer_validity"
  | "batch_clearing_objective"
  | "sensitive_evidence_attestation"
  | "pilot_evidence"
  | "protective_assessment"
  | "user_safety_content_moderation"
  | "financial_settlement_controls"
  | "release_gate_requirement"
  | "control_applicability_matrix";

export type MoralTradeControlRequirementStatus =
  | "passed"
  | "not_required_for_stage"
  | "privileged_neutral_review_waiver"
  | "missing"
  | "unknown"
  | "unmapped"
  | "duplicated"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export interface MoralTradeRiskControlPackRecord {
  packId: string;
  policyVersion: string;
  packName: string;
  appliesToTradeType: MoralTradeRiskControlTradeType;
  appliesToReleaseStages: MoralTradeRiskControlReleaseStage[];
  appliesToTiers: MoralTradeRiskControlTier[];
  requiredControlCodes: MoralTradeRiskControlCode[];
  optionalControlCodes: MoralTradeRiskControlCode[];
  notRequiredControlCodes: MoralTradeRiskControlCode[];
  failClosedUnknownControls: boolean;
  controlPackHash: string;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  supersededBy: string | null;
}

export interface MoralTradeControlApplicabilityMatrixRecord {
  matrixId: string;
  subjectType: MoralTradeRiskControlSubjectType;
  subjectId: string;
  releaseStage: MoralTradeRiskControlReleaseStage;
  tradeType: MoralTradeRiskControlTradeType;
  nonPublicGoodsMarketTier: MoralTradeRiskControlTier;
  jurisdictionBucket: string;
  moneyMovement: boolean;
  participantTermSheetRequired: boolean;
  counterpartyBlindingRequired: boolean;
  recipientAcceptanceRequired: boolean;
  aiPreferenceElicitationUsed: boolean;
  postClearAuditRequired: boolean;
  compensation: boolean;
  negativeCommitment: boolean;
  highStakesOrIrreversible: boolean;
  openMarketMatching: boolean;
  evidenceBurdenLevel: MoralTradeRiskControlEvidenceBurden;
  noncompensableBlockerPresent: boolean;
  staleOffer: boolean;
  batchClearingRequired: boolean;
  directPairClearing: boolean;
  causeBucketTaxonomyRef: string | null;
  resourceCompatibilityRequired: boolean;
  netOffsetAccountingRequired: boolean;
  confidentialVerificationRequired: boolean;
  applicableRiskControlPackRefs: string[];
  applicableControlCodes: MoralTradeRiskControlCode[];
  matrixHash: string;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  supersededBy: string | null;
}

export interface MoralTradeControlRequirementResultRecord {
  resultId: string;
  matrixRef: string;
  riskControlPackRef: string;
  subjectType: MoralTradeRiskControlSubjectType;
  subjectId: string;
  controlCode: MoralTradeRiskControlCode;
  resultStatus: MoralTradeControlRequirementStatus;
  policySnapshotRef: string | null;
  evidenceRef: string | null;
  reviewerDecisionRef: string | null;
  neutralReviewRef: string | null;
  privilegedActionRef: string | null;
  resultHash: string;
  checkedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeRiskControlMatrixEvaluationInput {
  transition: MoralTradeRiskControlTransition;
  checkedAt?: string;
  matrices: MoralTradeControlApplicabilityMatrixRecord[];
  packs: MoralTradeRiskControlPackRecord[];
  results: MoralTradeControlRequirementResultRecord[];
}

export interface MoralTradeRiskControlMatrixEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeRiskControlTransition;
  checkedAt: string;
  matrixCount: number;
  packCount: number;
  resultCount: number;
  requiredControlCount: number;
  nonBlockingControlCount: number;
  privilegedWaiverCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeRiskControlMatrixCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeRiskControlMatrixValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-risk-control-matrix-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeRiskControlMatrixCheck[];
  blockers: string[];
}

export interface MoralTradeRiskControlMatrixContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  transitions: MoralTradeRiskControlTransition[];
  subjectTypes: MoralTradeRiskControlSubjectType[];
  tradeTypes: MoralTradeRiskControlTradeType[];
  releaseStages: MoralTradeRiskControlReleaseStage[];
  knownControlCodes: MoralTradeRiskControlCode[];
  nonBlockingStatuses: MoralTradeControlRequirementStatus[];
  failClosedStatuses: MoralTradeControlRequirementStatus[];
  sampleEvaluations: MoralTradeRiskControlMatrixEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_CONTROL_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_risk_control_packs",
  "moral_trade_control_applicability_matrices",
  "moral_trade_control_requirement_results",
  "moral_trade_risk_control_matrix_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "risk_control_pack",
  "control_applicability_matrix",
] as const;

const TRANSITIONS: MoralTradeRiskControlTransition[] = [
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_publication",
  "release_gate_promotion",
  "dispute_or_appeal_resolution",
];

const TRADE_TYPES: MoralTradeRiskControlTradeType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "side_agreement",
  "evidence_claim",
  "payment_event",
  "manual_review",
  "mixed",
];

const SUBJECT_TYPES: MoralTradeRiskControlSubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "compensated_action_terms",
  "pledge_performance_bond_record",
  "payment_event",
  "evidence_record",
  "dispute_case",
  "appeal_case",
];

const RELEASE_STAGES: MoralTradeRiskControlReleaseStage[] = [
  "draft_preview",
  "match_candidate_preview",
  "matched_trade_lock",
  "payment_authorization",
  "payment_capture",
  "reliance_bearing_transition",
  "public_metric_release",
  "manual_review",
  "release_gate_promotion",
];

const TIERS: MoralTradeRiskControlTier[] = [
  "tier_1_money_only_donation_offset",
  "tier_2_donation_offset_with_abstention_or_additionality_proof",
  "tier_3_closed_counterparty_pledge_swap",
  "tier_4_open_market_pledge_swap_or_compensated_action",
  "not_applicable",
];

const EVIDENCE_BURDENS: MoralTradeRiskControlEvidenceBurden[] = [
  "none_required",
  "low",
  "medium",
  "high",
  "confidential_attestation_required",
];

const KNOWN_CONTROL_CODES: MoralTradeRiskControlCode[] = [
  "participant_term_sheet",
  "counterparty_blinding",
  "staged_counterparty_disclosure",
  "recipient_acceptance",
  "ai_preference_elicitation",
  "post_clear_audit",
  "review_capacity",
  "non_public_goods_subsidy",
  "direct_pair_clearing",
  "cause_bucket_taxonomy",
  "resource_compatibility",
  "net_offset_accounting",
  "approved_trade_template",
  "non_public_goods_tier",
  "counterfactual_trust",
  "private_exchange_rate_quote",
  "noncompensable_blocker",
  "offer_validity",
  "batch_clearing_objective",
  "sensitive_evidence_attestation",
  "pilot_evidence",
  "protective_assessment",
  "user_safety_content_moderation",
  "financial_settlement_controls",
  "release_gate_requirement",
  "control_applicability_matrix",
];

const NON_BLOCKING_STATUSES: MoralTradeControlRequirementStatus[] = [
  "passed",
  "not_required_for_stage",
  "privileged_neutral_review_waiver",
];

const FAIL_CLOSED_STATUSES: MoralTradeControlRequirementStatus[] = [
  "missing",
  "unknown",
  "unmapped",
  "duplicated",
  "under_review",
  "failed",
  "stale",
  "superseded",
];

const CONTRACT_TESTS = [
  "risk_control_matrix_contract_validator",
  "control_applicability_matrix_test",
  "missing_required_control_result_fails_closed",
  "stale_or_duplicate_control_result_fails_closed",
  "privileged_neutral_review_waiver_requires_refs",
  "risk_control_matrix_route_migration_and_profile_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeRiskControlMatrixCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function duplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicateValues = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicateValues.add(value);
    }
    seen.add(value);
  }

  return [...duplicateValues];
}

function isFresh(checkedAt: Date, reviewedAt: string, expiresAt: string | null) {
  const reviewed = new Date(reviewedAt);

  if (Number.isNaN(reviewed.valueOf())) {
    return false;
  }

  const ageMs = checkedAt.valueOf() - reviewed.valueOf();

  if (ageMs < 0 || ageMs > MAX_CONTROL_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return false;
  }

  if (!expiresAt) {
    return true;
  }

  const expires = new Date(expiresAt);
  return !Number.isNaN(expires.valueOf()) && expires.valueOf() >= checkedAt.valueOf();
}

function sampleHash(seed: string) {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

const sampleCheckedAt = "2026-06-13T12:00:00.000Z";

function samplePack(
  overrides: Partial<MoralTradeRiskControlPackRecord> = {},
): MoralTradeRiskControlPackRecord {
  return {
    appliesToReleaseStages: ["matched_trade_lock", "payment_authorization"],
    appliesToTiers: ["tier_1_money_only_donation_offset"],
    appliesToTradeType: "donation_offset",
    controlPackHash: sampleHash("c"),
    createdAt: sampleCheckedAt,
    failClosedUnknownControls: true,
    notRequiredControlCodes: ["post_clear_audit"],
    optionalControlCodes: ["direct_pair_clearing"],
    packId: "risk-control-pack:tier-1-donation-offset-lock",
    packName: "Tier 1 donation offset lock controls",
    policyVersion: "risk-control-pack-v0.1",
    requiredControlCodes: [
      "participant_term_sheet",
      "non_public_goods_tier",
      "counterfactual_trust",
      "offer_validity",
      "net_offset_accounting",
    ],
    reviewerDecisionRef: "review-decision:risk-control-pack-demo",
    supersededBy: null,
    updatedAt: sampleCheckedAt,
    ...overrides,
  };
}

function sampleMatrix(
  overrides: Partial<MoralTradeControlApplicabilityMatrixRecord> = {},
): MoralTradeControlApplicabilityMatrixRecord {
  return {
    aiPreferenceElicitationUsed: false,
    applicableControlCodes: [
      "participant_term_sheet",
      "non_public_goods_tier",
      "counterfactual_trust",
      "offer_validity",
      "net_offset_accounting",
      "post_clear_audit",
    ],
    applicableRiskControlPackRefs: ["risk-control-pack:tier-1-donation-offset-lock"],
    batchClearingRequired: true,
    causeBucketTaxonomyRef: "cause-taxonomy:v1",
    compensation: false,
    confidentialVerificationRequired: false,
    counterpartyBlindingRequired: true,
    createdAt: sampleCheckedAt,
    directPairClearing: false,
    evidenceBurdenLevel: "medium",
    highStakesOrIrreversible: false,
    jurisdictionBucket: "US-general",
    matrixHash: sampleHash("d"),
    matrixId: "control-matrix:matched-lock-demo",
    moneyMovement: true,
    negativeCommitment: false,
    netOffsetAccountingRequired: true,
    nonPublicGoodsMarketTier: "tier_1_money_only_donation_offset",
    noncompensableBlockerPresent: false,
    openMarketMatching: false,
    participantTermSheetRequired: true,
    postClearAuditRequired: false,
    recipientAcceptanceRequired: true,
    releaseStage: "matched_trade_lock",
    resourceCompatibilityRequired: true,
    reviewerDecisionRef: "review-decision:matrix-demo",
    staleOffer: false,
    subjectId: "matched-lock-proposal:demo",
    subjectType: "matched_trade_lock_proposal",
    supersededBy: null,
    tradeType: "donation_offset",
    updatedAt: sampleCheckedAt,
    ...overrides,
  };
}

function sampleResult(
  controlCode: MoralTradeRiskControlCode,
  overrides: Partial<MoralTradeControlRequirementResultRecord> = {},
): MoralTradeControlRequirementResultRecord {
  return {
    checkedAt: sampleCheckedAt,
    controlCode,
    evidenceRef: `evidence:${controlCode}`,
    expiresAt: "2026-07-13T12:00:00.000Z",
    matrixRef: "control-matrix:matched-lock-demo",
    neutralReviewRef: null,
    policySnapshotRef: `policy-snapshot:${controlCode}`,
    privilegedActionRef: null,
    resultHash: sampleHash("e"),
    resultId: `control-result:${controlCode}`,
    resultStatus: controlCode === "post_clear_audit" ? "not_required_for_stage" : "passed",
    reviewerDecisionRef: `review-decision:${controlCode}`,
    riskControlPackRef: "risk-control-pack:tier-1-donation-offset-lock",
    subjectId: "matched-lock-proposal:demo",
    subjectType: "matched_trade_lock_proposal",
    supersededBy: null,
    ...overrides,
  };
}

function packBlockers(pack: MoralTradeRiskControlPackRecord, checkedAt: Date) {
  const blockers: string[] = [];
  const allPackCodes = [
    ...pack.requiredControlCodes,
    ...pack.optionalControlCodes,
    ...pack.notRequiredControlCodes,
  ];

  if (!pack.packId) {
    blockers.push("risk_control_pack_id_missing");
  }

  if (!HASH_PATTERN.test(pack.controlPackHash)) {
    blockers.push(`risk_control_pack_hash_invalid:${pack.packId}`);
  }

  if (!pack.reviewerDecisionRef) {
    blockers.push(`risk_control_pack_reviewer_decision_missing:${pack.packId}`);
  }

  if (!isFresh(checkedAt, pack.updatedAt, null)) {
    blockers.push(`risk_control_pack_stale:${pack.packId}`);
  }

  if (pack.supersededBy) {
    blockers.push(`risk_control_pack_superseded:${pack.packId}`);
  }

  for (const code of duplicates(pack.requiredControlCodes)) {
    blockers.push(`risk_control_pack_required_control_duplicated:${pack.packId}:${code}`);
  }

  for (const code of duplicates(allPackCodes)) {
    blockers.push(`risk_control_pack_control_code_conflict:${pack.packId}:${code}`);
  }

  if (pack.failClosedUnknownControls) {
    for (const code of allPackCodes) {
      if (!KNOWN_CONTROL_CODES.includes(code)) {
        blockers.push(`risk_control_pack_unknown_control:${pack.packId}:${code}`);
      }
    }
  }

  return blockers;
}

function matrixBlockers(
  matrix: MoralTradeControlApplicabilityMatrixRecord,
  packsById: Map<string, MoralTradeRiskControlPackRecord>,
  checkedAt: Date,
) {
  const blockers: string[] = [];
  const matrixPackRefs = matrix.applicableRiskControlPackRefs;

  if (!matrix.matrixId) {
    blockers.push("control_applicability_matrix_id_missing");
  }

  if (!HASH_PATTERN.test(matrix.matrixHash)) {
    blockers.push(`control_applicability_matrix_hash_invalid:${matrix.matrixId}`);
  }

  if (!matrix.reviewerDecisionRef) {
    blockers.push(`control_applicability_matrix_reviewer_decision_missing:${matrix.matrixId}`);
  }

  if (!isFresh(checkedAt, matrix.updatedAt, null)) {
    blockers.push(`control_applicability_matrix_stale:${matrix.matrixId}`);
  }

  if (matrix.supersededBy) {
    blockers.push(`control_applicability_matrix_superseded:${matrix.matrixId}`);
  }

  if (matrixPackRefs.length === 0) {
    blockers.push(`control_applicability_matrix_pack_missing:${matrix.matrixId}`);
  }

  for (const packRef of duplicates(matrixPackRefs)) {
    blockers.push(`control_applicability_matrix_pack_duplicated:${matrix.matrixId}:${packRef}`);
  }

  for (const packRef of matrixPackRefs) {
    if (!packsById.has(packRef)) {
      blockers.push(`control_applicability_matrix_pack_unmapped:${matrix.matrixId}:${packRef}`);
    }
  }

  for (const code of duplicates(matrix.applicableControlCodes)) {
    blockers.push(`control_applicability_matrix_control_duplicated:${matrix.matrixId}:${code}`);
  }

  for (const code of matrix.applicableControlCodes) {
    if (!KNOWN_CONTROL_CODES.includes(code)) {
      blockers.push(`control_applicability_matrix_unknown_control:${matrix.matrixId}:${code}`);
    }
  }

  return blockers;
}

function resultBlockers(
  result: MoralTradeControlRequirementResultRecord,
  matrix: MoralTradeControlApplicabilityMatrixRecord,
  pack: MoralTradeRiskControlPackRecord,
  checkedAt: Date,
) {
  const blockers: string[] = [];

  if (result.matrixRef !== matrix.matrixId) {
    blockers.push(`control_requirement_result_matrix_mismatch:${result.resultId}:${result.matrixRef}`);
  }

  if (result.riskControlPackRef !== pack.packId) {
    blockers.push(`control_requirement_result_pack_mismatch:${result.resultId}:${result.riskControlPackRef}`);
  }

  if (result.subjectType !== matrix.subjectType || result.subjectId !== matrix.subjectId) {
    blockers.push(`control_requirement_result_subject_mismatch:${result.resultId}`);
  }

  if (!matrix.applicableControlCodes.includes(result.controlCode)) {
    blockers.push(`control_requirement_result_unmapped:${result.resultId}:${result.controlCode}`);
  }

  if (!HASH_PATTERN.test(result.resultHash)) {
    blockers.push(`control_requirement_result_hash_invalid:${result.resultId}`);
  }

  if (!isFresh(checkedAt, result.checkedAt, result.expiresAt)) {
    blockers.push(`control_requirement_result_stale:${result.resultId}:${result.controlCode}`);
  }

  if (result.supersededBy) {
    blockers.push(`control_requirement_result_superseded:${result.resultId}:${result.controlCode}`);
  }

  if (!NON_BLOCKING_STATUSES.includes(result.resultStatus)) {
    blockers.push(`control_requirement_result_not_non_blocking:${result.resultId}:${result.controlCode}:${result.resultStatus}`);
  }

  if (
    result.resultStatus === "not_required_for_stage" &&
    !result.policySnapshotRef
  ) {
    blockers.push(`control_requirement_not_required_policy_snapshot_missing:${result.resultId}:${result.controlCode}`);
  }

  if (result.resultStatus === "passed" && !result.reviewerDecisionRef) {
    blockers.push(`control_requirement_reviewer_decision_missing:${result.resultId}:${result.controlCode}`);
  }

  if (
    result.resultStatus === "privileged_neutral_review_waiver" &&
    (!result.neutralReviewRef || !result.privilegedActionRef)
  ) {
    blockers.push(`control_requirement_waiver_refs_missing:${result.resultId}:${result.controlCode}`);
  }

  return blockers;
}

function matchingMatrices(
  input: MoralTradeRiskControlMatrixEvaluationInput,
) {
  const transitionStage =
    input.transition === "public_metric_publication"
      ? "public_metric_release"
      : input.transition === "release_gate_promotion"
        ? "release_gate_promotion"
        : input.transition === "dispute_or_appeal_resolution"
          ? "manual_review"
          : input.transition;

  const candidates = input.matrices.filter((matrix) => matrix.releaseStage === transitionStage);

  return candidates.length ? candidates : input.matrices;
}

export function evaluateMoralTradeRiskControlMatrix(
  input: MoralTradeRiskControlMatrixEvaluationInput,
): MoralTradeRiskControlMatrixEvaluation {
  const checkedAt = new Date(input.checkedAt ?? new Date().toISOString());
  const checkedAtIso = Number.isNaN(checkedAt.valueOf())
    ? new Date().toISOString()
    : checkedAt.toISOString();
  const checkedAtDate = new Date(checkedAtIso);
  const blockers: string[] = [];
  const packsById = new Map(input.packs.map((pack) => [pack.packId, pack]));
  const matrices = matchingMatrices(input);
  const resultGroups = new Map<string, MoralTradeControlRequirementResultRecord[]>();
  let requiredControlCount = 0;
  let nonBlockingControlCount = 0;
  let privilegedWaiverCount = 0;

  if (input.matrices.length === 0) {
    blockers.push("control_applicability_matrix_missing");
  }

  if (matrices.length === 0) {
    blockers.push(`control_applicability_matrix_for_transition_missing:${input.transition}`);
  }

  for (const pack of input.packs) {
    blockers.push(...packBlockers(pack, checkedAtDate));
  }

  for (const result of input.results) {
    const key = `${result.matrixRef}:${result.riskControlPackRef}:${result.controlCode}`;
    const group = resultGroups.get(key) ?? [];
    group.push(result);
    resultGroups.set(key, group);
  }

  for (const matrix of matrices) {
    blockers.push(...matrixBlockers(matrix, packsById, checkedAtDate));

    for (const packRef of matrix.applicableRiskControlPackRefs) {
      const pack = packsById.get(packRef);

      if (!pack) {
        continue;
      }

      const allPackControls = [
        ...pack.requiredControlCodes,
        ...pack.optionalControlCodes,
        ...pack.notRequiredControlCodes,
      ];

      for (const code of matrix.applicableControlCodes) {
        if (!allPackControls.includes(code)) {
          blockers.push(`control_applicability_matrix_control_unmapped:${matrix.matrixId}:${pack.packId}:${code}`);
        }
      }

      for (const code of pack.requiredControlCodes) {
        requiredControlCount += 1;

        if (!matrix.applicableControlCodes.includes(code)) {
          blockers.push(`risk_control_pack_required_control_unmapped:${matrix.matrixId}:${pack.packId}:${code}`);
          continue;
        }

        const key = `${matrix.matrixId}:${pack.packId}:${code}`;
        const matchingResults = resultGroups.get(key) ?? [];

        if (matchingResults.length === 0) {
          blockers.push(`required_control_result_missing:${matrix.matrixId}:${pack.packId}:${code}`);
          continue;
        }

        if (matchingResults.length > 1) {
          blockers.push(`required_control_result_duplicated:${matrix.matrixId}:${pack.packId}:${code}`);
        }

        for (const result of matchingResults) {
          const resultIssues = resultBlockers(result, matrix, pack, checkedAtDate);
          blockers.push(...resultIssues);

          if (resultIssues.length === 0) {
            nonBlockingControlCount += 1;

            if (result.resultStatus === "privileged_neutral_review_waiver") {
              privilegedWaiverCount += 1;
            }
          }
        }
      }
    }
  }

  const uniqueBlockers = unique(blockers);

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt: checkedAtIso,
    matrixCount: input.matrices.length,
    packCount: input.packs.length,
    resultCount: input.results.length,
    requiredControlCount,
    nonBlockingControlCount,
    privilegedWaiverCount,
    blockers: uniqueBlockers,
    userFacingBlockerCategories: uniqueBlockers.length
      ? ["This transition needs a complete reviewed control pack before it can move forward"]
      : [],
  };
}

export function getMoralTradeRiskControlMatrixContract(): MoralTradeRiskControlMatrixContract {
  const pack = samplePack();
  const matrix = sampleMatrix();
  const passing = evaluateMoralTradeRiskControlMatrix({
    transition: "matched_trade_lock",
    checkedAt: sampleCheckedAt,
    matrices: [matrix],
    packs: [pack],
    results: pack.requiredControlCodes.map((code) => sampleResult(code)),
  });
  const blocked = evaluateMoralTradeRiskControlMatrix({
    transition: "payment_capture",
    checkedAt: sampleCheckedAt,
    matrices: [
      sampleMatrix({
        applicableControlCodes: ["participant_term_sheet", "offer_validity"],
        applicableRiskControlPackRefs: ["risk-control-pack:payment-capture"],
        matrixId: "control-matrix:missing-controls",
        releaseStage: "payment_capture",
      }),
    ],
    packs: [
      samplePack({
        appliesToReleaseStages: ["payment_capture"],
        packId: "risk-control-pack:payment-capture",
        requiredControlCodes: [
          "participant_term_sheet",
          "offer_validity",
          "financial_settlement_controls",
        ],
      }),
    ],
    results: [sampleResult("participant_term_sheet", {
      matrixRef: "control-matrix:missing-controls",
      riskControlPackRef: "risk-control-pack:payment-capture",
    })],
  });

  return {
    version: MORAL_TRADE_RISK_CONTROL_MATRIX_CONTRACT_VERSION,
    purpose:
      "Fail-closed risk-control-pack and control-applicability-matrix contract for non-public-goods runtime transitions before preview, lock, payment, reliance, public metrics, release-gate promotion, dispute handling, or appeal handling.",
    failClosedRule:
      "A runtime transition is non-blocking only when every applicable risk-control pack resolves every required control to passed, not_required_for_stage, or privileged_neutral_review_waiver with neutral-review and privileged-action references. Unknown, missing, stale, duplicated, superseded, unmapped, or failed controls block.",
    privacyBoundary:
      "The public contract exposes only control-code names, transition rules, table names, status categories, and synthetic sample outcomes. It does not expose private term sheets, raw evidence, reviewer notes, private baselines, exact caps, payment credentials, identities, or participant-specific control records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    transitions: [...TRANSITIONS],
    subjectTypes: [...SUBJECT_TYPES],
    tradeTypes: [...TRADE_TYPES],
    releaseStages: [...RELEASE_STAGES],
    knownControlCodes: [...KNOWN_CONTROL_CODES],
    nonBlockingStatuses: [...NON_BLOCKING_STATUSES],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    sampleEvaluations: [passing, blocked],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeRiskControlMatrixContract(
  contract: MoralTradeRiskControlMatrixContract = getMoralTradeRiskControlMatrixContract(),
): MoralTradeRiskControlMatrixValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Risk-control packs, applicability matrices, requirement results, and enforcement records are first-class",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Control packs and applicability matrices resolve through policy snapshots",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) => contract.policySnapshotSubjects.includes(subject)),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "control-code-coverage",
      "Known controls cover non-public-goods safety, review, payment, evidence, and release controls",
      [
        "participant_term_sheet",
        "non_public_goods_tier",
        "counterfactual_trust",
        "financial_settlement_controls",
        "control_applicability_matrix",
      ].every((code) => contract.knownControlCodes.includes(code as MoralTradeRiskControlCode)),
      contract.knownControlCodes.join(", "),
    ),
    check(
      "non-blocking-statuses",
      "Only passed, not-required, or privileged neutral-review waiver statuses can unblock transitions",
      NON_BLOCKING_STATUSES.every((status) => contract.nonBlockingStatuses.includes(status)),
      contract.nonBlockingStatuses.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Unknown, missing, stale, duplicated, unmapped, failed, under-review, and superseded controls fail closed",
      FAIL_CLOSED_STATUSES.every((status) => contract.failClosedStatuses.includes(status)),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations show complete control-pack pass and missing-control block",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) =>
          sample.blockers.includes(
            "required_control_result_missing:control-matrix:missing-controls:risk-control-pack:payment-capture:offer_validity",
          ),
        ),
      JSON.stringify(contract.sampleEvaluations.map((sample) => ({
        transition: sample.transition,
        status: sample.status,
        blockers: sample.blockers,
      }))),
    ),
    check(
      "contract-tests",
      "Contract test hooks cover control applicability, missing, stale, duplicate, waiver, route, migration, and profile wiring",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-risk-control-matrix-contract",
    validatorVersion: MORAL_TRADE_RISK_CONTROL_MATRIX_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeRiskControlMatrix = {
  evaluateMoralTradeRiskControlMatrix,
  getMoralTradeRiskControlMatrixContract,
  validateMoralTradeRiskControlMatrixContract,
};

export default moralTradeRiskControlMatrix;
