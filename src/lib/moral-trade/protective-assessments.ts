export const MORAL_TRADE_PROTECTIVE_ASSESSMENTS_CONTRACT_VERSION =
  "moral-trade-protective-assessments-v0.1-2026-06";
export const MORAL_TRADE_PROTECTIVE_ASSESSMENTS_VALIDATOR_VERSION =
  "moral-trade-protective-assessments-validator-v0.1";

export type MoralTradeProtectiveAssessmentTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "payout_release"
  | "public_completion_claim"
  | "release_gate_promotion";

export type MoralTradeProtectiveAssessmentSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "performance_bond"
  | "evidence_claim"
  | "side_agreement"
  | "recipient_choice"
  | "common_ground_budget"
  | "public_goods_round"
  | "cleared_trade_agreement";

export type MoralTradeProtectiveAssessmentDimension =
  | "negative_commitment_substitution"
  | "action_reversibility_high_stakes"
  | "donor_of_record_tax_receipt"
  | "third_party_obligation"
  | "representative_authority"
  | "reporting_integrity_non_suppression"
  | "civil_rights_discrimination"
  | "participant_autonomy_undue_influence"
  | "confidentiality_privacy_rights"
  | "evidence_authenticity_synthetic_media"
  | "financial_crime_fraud_source_of_funds"
  | "agreement_non_transferability"
  | "regulated_goods_hazardous_activity"
  | "cyber_abuse_digital_systems_integrity"
  | "anti_corruption_process_integrity"
  | "least_intrusive_evidence"
  | "performance_bond_neutral_review";

export type MoralTradeProtectiveAssessmentState =
  | "not_triggered"
  | "required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "not_required_for_stage"
  | "waived_by_neutral_review"
  | "stale"
  | "superseded"
  | "missing";

export type MoralTradeProtectiveAssessmentRiskTrigger =
  | "none"
  | "possible"
  | "confirmed"
  | "rejected"
  | "unknown";

export type MoralTradeProtectiveAssessmentPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeProtectiveEvidencePlanState =
  | "not_required_for_stage"
  | "least_intrusive_approved"
  | "high_burden_reviewer_approved"
  | "under_review"
  | "invasive_without_review"
  | "missing"
  | "stale"
  | "superseded";

export type MoralTradeProtectiveNeutralReviewState =
  | "not_required_for_stage"
  | "approved_neutral"
  | "under_review"
  | "counterparty_benefits"
  | "conflicted"
  | "missing"
  | "stale"
  | "superseded";

export type MoralTradeProtectiveReviewerQualityState =
  | "authorized"
  | "not_required_for_stage"
  | "missing"
  | "out_of_scope"
  | "conflicted"
  | "stale"
  | "superseded";

export type MoralTradeProtectiveNoticeState =
  | "sent"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale";

export type MoralTradeProtectiveAppealPathState =
  | "available"
  | "not_required_for_stage"
  | "missing"
  | "emergency_only"
  | "stale";

export interface MoralTradeProtectiveAssessmentRecord {
  assessmentId: string;
  subjectType: MoralTradeProtectiveAssessmentSubjectType;
  subjectRef: string;
  assessmentDimension: MoralTradeProtectiveAssessmentDimension;
  assessmentState: MoralTradeProtectiveAssessmentState;
  riskTrigger: MoralTradeProtectiveAssessmentRiskTrigger;
  policySnapshotStatus: MoralTradeProtectiveAssessmentPolicySnapshotStatus;
  assessmentHash: string;
  userFacingReasonCategory: string;
  evidencePlanState: MoralTradeProtectiveEvidencePlanState;
  neutralReviewState: MoralTradeProtectiveNeutralReviewState;
  reviewerQualityState: MoralTradeProtectiveReviewerQualityState;
  participantNoticeState: MoralTradeProtectiveNoticeState;
  appealPathState: MoralTradeProtectiveAppealPathState;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeProtectiveAssessmentTransitionDefinition {
  key: MoralTradeProtectiveAssessmentTransition;
  label: string;
  requiresAssessmentRecords: boolean;
  requiresAllDimensions: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeProtectiveAssessmentEvaluationInput {
  transition: MoralTradeProtectiveAssessmentTransition;
  checkedAt?: string;
  records: MoralTradeProtectiveAssessmentRecord[];
}

export interface MoralTradeProtectiveAssessmentEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeProtectiveAssessmentTransition;
  checkedAt: string;
  requiredDimensionCount: number;
  passingAssessmentCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeProtectiveAssessmentCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeProtectiveAssessmentValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-protective-assessments-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeProtectiveAssessmentCheck[];
  blockers: string[];
}

export interface MoralTradeProtectiveAssessmentContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeProtectiveAssessmentSubjectType[];
  assessmentDimensions: MoralTradeProtectiveAssessmentDimension[];
  failClosedStatuses: Array<
    | MoralTradeProtectiveAssessmentState
    | MoralTradeProtectiveEvidencePlanState
    | MoralTradeProtectiveNeutralReviewState
    | MoralTradeProtectiveReviewerQualityState
    | MoralTradeProtectiveNoticeState
    | MoralTradeProtectiveAppealPathState
  >;
  transitionDefinitions: MoralTradeProtectiveAssessmentTransitionDefinition[];
  sampleEvaluations: MoralTradeProtectiveAssessmentEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_protective_assessment_records",
  "moral_trade_negative_commitment_scopes",
  "moral_trade_action_reversibility_assessments",
  "moral_trade_donor_of_record_tax_reviews",
  "moral_trade_authority_obligation_assessments",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "protective_assessment",
  "negative_commitment_scope",
  "action_reversibility_assessment",
  "donor_of_record_tax_receipt",
  "third_party_obligation_assessment",
  "representative_authority_assessment",
  "reporting_integrity_assessment",
  "civil_rights_discrimination_assessment",
  "participant_autonomy_assessment",
  "confidentiality_privacy_rights_assessment",
  "evidence_authenticity_assessment",
  "financial_crime_fraud_assessment",
  "agreement_transferability_assessment",
  "regulated_goods_hazardous_activity_assessment",
  "cyber_abuse_digital_integrity_assessment",
  "anti_corruption_assessment",
  "least_intrusive_evidence_assessment",
  "performance_bond_neutral_review",
] as const;

const SUBJECT_TYPES: MoralTradeProtectiveAssessmentSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "evidence_claim",
  "side_agreement",
  "recipient_choice",
  "common_ground_budget",
  "public_goods_round",
  "cleared_trade_agreement",
];

const ASSESSMENT_DIMENSIONS: MoralTradeProtectiveAssessmentDimension[] = [
  "negative_commitment_substitution",
  "action_reversibility_high_stakes",
  "donor_of_record_tax_receipt",
  "third_party_obligation",
  "representative_authority",
  "reporting_integrity_non_suppression",
  "civil_rights_discrimination",
  "participant_autonomy_undue_influence",
  "confidentiality_privacy_rights",
  "evidence_authenticity_synthetic_media",
  "financial_crime_fraud_source_of_funds",
  "agreement_non_transferability",
  "regulated_goods_hazardous_activity",
  "cyber_abuse_digital_systems_integrity",
  "anti_corruption_process_integrity",
  "least_intrusive_evidence",
  "performance_bond_neutral_review",
];

const FAIL_CLOSED_STATUSES = [
  "missing",
  "required",
  "under_review",
  "blocked",
  "stale",
  "superseded",
  "invasive_without_review",
  "counterparty_benefits",
  "conflicted",
  "out_of_scope",
  "failed",
  "emergency_only",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeProtectiveAssessmentTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresAssessmentRecords: false,
    requiresAllDimensions: false,
    userFacingBlockerCategory: "Protective assessments are preview-only",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresAssessmentRecords: true,
    requiresAllDimensions: true,
    userFacingBlockerCategory: "Protective assessments need review before lock",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresAssessmentRecords: true,
    requiresAllDimensions: true,
    userFacingBlockerCategory: "Protective assessments need review before payment",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresAssessmentRecords: true,
    requiresAllDimensions: true,
    userFacingBlockerCategory: "Protective assessments need review before payout",
  },
  {
    key: "public_completion_claim",
    label: "Public completion claim",
    requiresAssessmentRecords: true,
    requiresAllDimensions: true,
    userFacingBlockerCategory:
      "Protective assessments need review before public completion",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresAssessmentRecords: true,
    requiresAllDimensions: true,
    userFacingBlockerCategory:
      "Protective assessments need review before release promotion",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeProtectiveAssessmentCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(end - start) / (1000 * 60 * 60 * 24);
}

function isPassingAssessmentState(record: MoralTradeProtectiveAssessmentRecord) {
  if (record.assessmentState === "non_blocking") {
    return true;
  }

  if (
    record.assessmentState === "not_required_for_stage" &&
    ["none", "rejected"].includes(record.riskTrigger)
  ) {
    return true;
  }

  return (
    record.assessmentState === "waived_by_neutral_review" &&
    record.neutralReviewState === "approved_neutral"
  );
}

function evaluateRecord(
  record: MoralTradeProtectiveAssessmentRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(
      `protective_assessment_policy_not_immutable:${record.assessmentDimension}:${record.policySnapshotStatus}`,
    );
  }

  if (!HASH_PATTERN.test(record.assessmentHash)) {
    blockers.push(
      `protective_assessment_hash_invalid:${record.assessmentDimension}:${record.assessmentId}`,
    );
  }

  if (record.supersededBy || record.assessmentState === "superseded") {
    blockers.push(
      `protective_assessment_superseded:${record.assessmentDimension}:${record.assessmentId}`,
    );
  }

  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.parse(checkedAt)) {
    blockers.push(
      `protective_assessment_expired:${record.assessmentDimension}:${record.assessmentId}`,
    );
  }

  if (daysBetween(record.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
    blockers.push(
      `protective_assessment_stale_review:${record.assessmentDimension}:${record.assessmentId}`,
    );
  }

  if (!isPassingAssessmentState(record)) {
    blockers.push(
      `protective_assessment_not_non_blocking:${record.assessmentDimension}:${record.assessmentState}`,
    );
  }

  if (
    record.riskTrigger === "confirmed" &&
    record.assessmentState !== "non_blocking"
  ) {
    blockers.push(
      `confirmed_risk_not_non_blocking:${record.assessmentDimension}:${record.assessmentId}`,
    );
  }

  if (record.evidencePlanState === "invasive_without_review") {
    blockers.push(
      `invasive_evidence_plan_without_review:${record.assessmentDimension}:${record.assessmentId}`,
    );
  }

  if (
    ![
      "not_required_for_stage",
      "least_intrusive_approved",
      "high_burden_reviewer_approved",
    ].includes(record.evidencePlanState)
  ) {
    blockers.push(
      `evidence_plan_not_approved:${record.assessmentDimension}:${record.evidencePlanState}`,
    );
  }

  if (
    !["not_required_for_stage", "approved_neutral"].includes(
      record.neutralReviewState,
    )
  ) {
    blockers.push(
      `neutral_review_not_non_blocking:${record.assessmentDimension}:${record.neutralReviewState}`,
    );
  }

  if (
    !["authorized", "not_required_for_stage"].includes(
      record.reviewerQualityState,
    )
  ) {
    blockers.push(
      `reviewer_quality_not_non_blocking:${record.assessmentDimension}:${record.reviewerQualityState}`,
    );
  }

  if (
    !["sent", "not_required_for_stage"].includes(record.participantNoticeState)
  ) {
    blockers.push(
      `protective_assessment_notice_not_recorded:${record.assessmentDimension}:${record.participantNoticeState}`,
    );
  }

  if (
    !["available", "not_required_for_stage"].includes(record.appealPathState)
  ) {
    blockers.push(
      `protective_assessment_appeal_path_missing:${record.assessmentDimension}:${record.appealPathState}`,
    );
  }

  return blockers;
}

export function evaluateMoralTradeProtectiveAssessments(
  input: MoralTradeProtectiveAssessmentEvaluationInput,
): MoralTradeProtectiveAssessmentEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const blockers: string[] = [];
  const userFacingBlockerCategories = new Set<string>();

  if (!transition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredDimensionCount: 0,
      passingAssessmentCount: 0,
      blockers: [`unknown_transition:${input.transition}`],
      userFacingBlockerCategories: ["Protective assessment state is unknown"],
    };
  }

  if (!transition.requiresAssessmentRecords) {
    return {
      status: "pass",
      transition: input.transition,
      checkedAt,
      requiredDimensionCount: 0,
      passingAssessmentCount: 0,
      blockers: [],
      userFacingBlockerCategories: [],
    };
  }

  const requiredDimensions = transition.requiresAllDimensions
    ? ASSESSMENT_DIMENSIONS
    : [];
  const recordByDimension = new Map<
    MoralTradeProtectiveAssessmentDimension,
    MoralTradeProtectiveAssessmentRecord
  >();

  for (const record of input.records) {
    if (!recordByDimension.has(record.assessmentDimension)) {
      recordByDimension.set(record.assessmentDimension, record);
    }
  }

  for (const dimension of requiredDimensions) {
    const record = recordByDimension.get(dimension);

    if (!record) {
      blockers.push(`protective_assessment_record_required:${dimension}`);
      userFacingBlockerCategories.add(transition.userFacingBlockerCategory);
      continue;
    }

    const recordBlockers = evaluateRecord(record, checkedAt);
    if (recordBlockers.length) {
      blockers.push(...recordBlockers);
      userFacingBlockerCategories.add(transition.userFacingBlockerCategory);
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    requiredDimensionCount: requiredDimensions.length,
    passingAssessmentCount: blockers.length ? 0 : requiredDimensions.length,
    blockers,
    userFacingBlockerCategories: [...userFacingBlockerCategories],
  };
}

function hashFor(seed: string) {
  return `sha256:${"a".repeat(63)}${seed.length % 10}`;
}

function assessmentRecord(
  dimension: MoralTradeProtectiveAssessmentDimension,
  overrides: Partial<MoralTradeProtectiveAssessmentRecord> = {},
): MoralTradeProtectiveAssessmentRecord {
  return {
    assessmentId: `protective-assessment:${dimension}`,
    subjectType: "pledge_swap",
    subjectRef: "pledge-swap:demo",
    assessmentDimension: dimension,
    assessmentState: "non_blocking",
    riskTrigger: "possible",
    policySnapshotStatus: "resolved_immutable",
    assessmentHash: hashFor(dimension),
    userFacingReasonCategory: "Safety, legality, privacy, or authority review",
    evidencePlanState: "least_intrusive_approved",
    neutralReviewState: "approved_neutral",
    reviewerQualityState: "authorized",
    participantNoticeState: "sent",
    appealPathState: "available",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-12-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function allPassingRecords() {
  return ASSESSMENT_DIMENSIONS.map((dimension) => assessmentRecord(dimension));
}

function buildSampleEvaluations(): MoralTradeProtectiveAssessmentEvaluation[] {
  return [
    evaluateMoralTradeProtectiveAssessments({
      transition: "draft_preview",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: [],
    }),
    evaluateMoralTradeProtectiveAssessments({
      transition: "matched_trade_lock",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: allPassingRecords(),
    }),
    evaluateMoralTradeProtectiveAssessments({
      transition: "payment_capture",
      checkedAt: "2026-06-08T12:00:00.000Z",
      records: [
        ...allPassingRecords().filter(
          (record) =>
            ![
              "reporting_integrity_non_suppression",
              "confidentiality_privacy_rights",
              "evidence_authenticity_synthetic_media",
              "financial_crime_fraud_source_of_funds",
            ].includes(record.assessmentDimension),
        ),
        assessmentRecord("reporting_integrity_non_suppression", {
          assessmentState: "blocked",
          riskTrigger: "confirmed",
        }),
        assessmentRecord("confidentiality_privacy_rights", {
          evidencePlanState: "invasive_without_review",
        }),
        assessmentRecord("evidence_authenticity_synthetic_media", {
          policySnapshotStatus: "mutable",
        }),
        assessmentRecord("financial_crime_fraud_source_of_funds", {
          neutralReviewState: "counterparty_benefits",
        }),
      ],
    }),
  ];
}

export function getMoralTradeProtectiveAssessmentContract(): MoralTradeProtectiveAssessmentContract {
  return {
    version: MORAL_TRADE_PROTECTIVE_ASSESSMENTS_CONTRACT_VERSION,
    purpose:
      "Public contract for MoralTrade60 protective assessments: negative commitments, action reversibility, donor/tax treatment, third-party obligations, representative authority, reporting integrity, civil rights, autonomy, confidentiality, evidence authenticity, financial crime, non-transferability, regulated goods, cyber abuse, anti-corruption, least-intrusive evidence, and neutral-review performance-bond controls fail closed before lock, payment, payout, public completion, or release promotion.",
    failClosedRule:
      "Donation offsets, pledge swaps, compensated moral actions, performance bonds, and side agreements remain draft or preview-only unless every required protective assessment is non-blocking, not required for the frozen stage, or explicitly waived by neutral review under an immutable policy snapshot.",
    privacyBoundary:
      "The public contract exposes only assessment dimensions, transition rules, table names, statuses, and synthetic sample outcomes. It never exposes protected-trait facts, authority documents, private reports, credentials, source-of-funds evidence, reviewer notes, raw evidence, or participant-specific assessment records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    assessmentDimensions: ASSESSMENT_DIMENSIONS,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [
      "protective_assessment_all_dimensions_first_class",
      "draft_preview_passes_without_assessments",
      "lock_requires_every_protective_assessment_dimension",
      "confirmed_reporting_confidentiality_evidence_financial_risks_block_payment",
      "policy_snapshot_hash_notice_appeal_and_reviewer_quality_fail_closed",
      "api_health_spec_migration_schema_and_types_publish_contract",
    ],
  };
}

export function validateMoralTradeProtectiveAssessmentContract(
  contract = getMoralTradeProtectiveAssessmentContract(),
): MoralTradeProtectiveAssessmentValidation {
  const sampleStatuses = contract.sampleEvaluations.map((evaluation) => evaluation.status);
  const checks = [
    check(
      "first_class_tables",
      "Protective assessments use first-class record tables",
      [
        "moral_trade_protective_assessment_records",
        "moral_trade_negative_commitment_scopes",
        "moral_trade_action_reversibility_assessments",
        "moral_trade_donor_of_record_tax_reviews",
        "moral_trade_authority_obligation_assessments",
      ].every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy_snapshot_subjects",
      "Assessment policy subjects are immutable snapshot subjects",
      [
        "protective_assessment",
        "reporting_integrity_assessment",
        "civil_rights_discrimination_assessment",
        "confidentiality_privacy_rights_assessment",
        "financial_crime_fraud_assessment",
        "regulated_goods_hazardous_activity_assessment",
        "cyber_abuse_digital_integrity_assessment",
        "anti_corruption_assessment",
      ].every((subject) => contract.policySnapshotSubjects.includes(subject)),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "dimension_coverage",
      "Assessment dimensions cover MoralTrade60 protective requirements",
      [
        "negative_commitment_substitution",
        "action_reversibility_high_stakes",
        "donor_of_record_tax_receipt",
        "third_party_obligation",
        "representative_authority",
        "reporting_integrity_non_suppression",
        "civil_rights_discrimination",
        "participant_autonomy_undue_influence",
        "confidentiality_privacy_rights",
        "evidence_authenticity_synthetic_media",
        "financial_crime_fraud_source_of_funds",
        "agreement_non_transferability",
        "regulated_goods_hazardous_activity",
        "cyber_abuse_digital_systems_integrity",
        "anti_corruption_process_integrity",
      ].every((dimension) =>
        contract.assessmentDimensions.includes(
          dimension as MoralTradeProtectiveAssessmentDimension,
        ),
      ),
      contract.assessmentDimensions.join(", "),
    ),
    check(
      "high_risk_transitions",
      "Reliance-bearing transitions require all protective dimensions",
      contract.transitionDefinitions
        .filter((transition) => transition.key !== "draft_preview")
        .every(
          (transition) =>
            transition.requiresAssessmentRecords && transition.requiresAllDimensions,
        ),
      contract.transitionDefinitions
        .map((transition) => `${transition.key}:${transition.requiresAllDimensions}`)
        .join(", "),
    ),
    check(
      "sample_evaluations",
      "Synthetic samples include preview pass, lock pass, and payment block",
      sampleStatuses[0] === "pass" &&
        sampleStatuses[1] === "pass" &&
        sampleStatuses[2] === "blocked",
      sampleStatuses.join(", "),
    ),
    check(
      "privacy_boundary",
      "Public contract does not expose private assessment evidence",
      /never exposes/i.test(contract.privacyBoundary) &&
        /participant-specific assessment records/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-protective-assessments-contract",
    validatorVersion: MORAL_TRADE_PROTECTIVE_ASSESSMENTS_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
