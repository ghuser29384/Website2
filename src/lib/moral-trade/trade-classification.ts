export const MORAL_TRADE_TRADE_CLASSIFICATION_CONTRACT_VERSION =
  "moral-trade-trade-classification-v0.1-2026-06";
export const MORAL_TRADE_TRADE_CLASSIFICATION_VALIDATOR_VERSION =
  "moral-trade-trade-classification-validator-v0.1";

export type MoralTradeTradeClassificationTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "payout_release"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeTradeClassificationSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "common_ground_budget"
  | "public_goods_round"
  | "cleared_trade_agreement";

export type MoralTradeTradeClassification =
  | "pure_moral_trade"
  | "mixed_moral_trade"
  | "moral_public_good_coalition"
  | "ordinary_donation_or_matching"
  | "ordinary_service_or_procurement"
  | "rejected_threat_or_externality";

export type MoralTradeTradeClassificationState =
  | "draft"
  | "previewed"
  | "reviewed"
  | "metrics_excluded"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradeMetricsEligibility =
  | "eligible_for_moral_trade_metrics"
  | "excluded_ordinary"
  | "excluded_rejected"
  | "manual_review";

export type MoralTradeCounterfactualAcceptanceState =
  | "not_recorded"
  | "says_would_not_without_compensation"
  | "says_would_anyway"
  | "unclear"
  | "manual_review";

export type MoralTradeOrdinaryServiceProcurementReviewState =
  | "not_required"
  | "under_review"
  | "ordinary_service_blocking"
  | "non_blocking"
  | "manual_review";

export type MoralTradeTradeClassificationTermsState =
  | "draft"
  | "previewed"
  | "locked"
  | "blocked"
  | "superseded";

export type MoralTradeTradeClassificationReviewDimension =
  | "legal_jurisdiction"
  | "labor_employment"
  | "tax_reporting"
  | "coercion_undue_influence"
  | "vulnerability_undue_inducement"
  | "ordinary_service_procurement"
  | "externality"
  | "anti_corruption_process_integrity";

export type MoralTradeTradeClassificationReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradeTradeClassificationPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeTradeClassificationRecord {
  classificationId: string;
  subjectType: MoralTradeTradeClassificationSubjectType;
  subjectRef: string;
  tradeClassification: MoralTradeTradeClassification;
  classificationState: MoralTradeTradeClassificationState;
  metricsEligibility: MoralTradeMetricsEligibility;
  policySnapshotStatus: MoralTradeTradeClassificationPolicySnapshotStatus;
  payerMoralReasonHash: string | null;
  performerCounterfactualAcceptanceState: MoralTradeCounterfactualAcceptanceState;
  ordinaryServiceProcurementReviewState: MoralTradeOrdinaryServiceProcurementReviewState;
  moralTradeClassificationRationaleHash: string;
  termsState: MoralTradeTradeClassificationTermsState;
  exactActionFrozen: boolean;
  compensationTermsFrozen: boolean;
  evidenceBurdenFrozen: boolean;
  reviewPeriodFrozen: boolean;
  exitRemedyRuleFrozen: boolean;
  publicBadgeExposed: boolean;
  reviewStatuses: Record<
    MoralTradeTradeClassificationReviewDimension,
    MoralTradeTradeClassificationReviewStatus
  >;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeTradeClassificationTransitionDefinition {
  key: MoralTradeTradeClassificationTransition;
  label: string;
  requiresClassificationRecord: boolean;
  requiresNonBlockingReview: boolean;
  allowsOrdinaryOnlyWhenMetricsExcluded: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeTradeClassificationEvaluationInput {
  transition: MoralTradeTradeClassificationTransition;
  checkedAt?: string;
  records: MoralTradeTradeClassificationRecord[];
}

export interface MoralTradeTradeClassificationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeTradeClassificationTransition;
  checkedAt: string;
  requiredRecordCount: number;
  passingRecordCount: number;
  metricEligibleRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeTradeClassificationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeTradeClassificationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-trade-classification-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeTradeClassificationCheck[];
  blockers: string[];
}

export interface MoralTradeTradeClassificationContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  publicNonClaim: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  classifications: MoralTradeTradeClassification[];
  subjectTypes: MoralTradeTradeClassificationSubjectType[];
  reviewDimensions: MoralTradeTradeClassificationReviewDimension[];
  failClosedStatuses: Array<
    | MoralTradeTradeClassificationState
    | MoralTradeTradeClassificationReviewStatus
    | MoralTradeMetricsEligibility
  >;
  transitionDefinitions: MoralTradeTradeClassificationTransitionDefinition[];
  sampleEvaluations: MoralTradeTradeClassificationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_trade_classification_records",
  "moral_trade_compensated_action_terms",
  "moral_trade_ordinary_service_procurement_reviews",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "trade_classification",
  "compensated_moral_action",
  "ordinary_service_procurement",
] as const;

const CLASSIFICATIONS: MoralTradeTradeClassification[] = [
  "pure_moral_trade",
  "mixed_moral_trade",
  "moral_public_good_coalition",
  "ordinary_donation_or_matching",
  "ordinary_service_or_procurement",
  "rejected_threat_or_externality",
];

const SUBJECT_TYPES: MoralTradeTradeClassificationSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "common_ground_budget",
  "public_goods_round",
  "cleared_trade_agreement",
];

const REVIEW_DIMENSIONS: MoralTradeTradeClassificationReviewDimension[] = [
  "legal_jurisdiction",
  "labor_employment",
  "tax_reporting",
  "coercion_undue_influence",
  "vulnerability_undue_inducement",
  "ordinary_service_procurement",
  "externality",
  "anti_corruption_process_integrity",
];

const FAIL_CLOSED_STATUSES = [
  "draft",
  "blocked",
  "stale",
  "superseded",
  "missing",
  "under_review",
  "failed",
  "manual_review",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeTradeClassificationTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresClassificationRecord: false,
    requiresNonBlockingReview: false,
    allowsOrdinaryOnlyWhenMetricsExcluded: true,
    userFacingBlockerCategory: "Trade classification is preview-only",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresClassificationRecord: true,
    requiresNonBlockingReview: true,
    allowsOrdinaryOnlyWhenMetricsExcluded: false,
    userFacingBlockerCategory: "Trade classification needs review before lock",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresClassificationRecord: true,
    requiresNonBlockingReview: true,
    allowsOrdinaryOnlyWhenMetricsExcluded: false,
    userFacingBlockerCategory: "Trade classification needs review before payment",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresClassificationRecord: true,
    requiresNonBlockingReview: true,
    allowsOrdinaryOnlyWhenMetricsExcluded: false,
    userFacingBlockerCategory: "Trade classification needs review before payout",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresClassificationRecord: true,
    requiresNonBlockingReview: true,
    allowsOrdinaryOnlyWhenMetricsExcluded: true,
    userFacingBlockerCategory:
      "Trade classification must exclude ordinary transactions from moral-trade metrics",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresClassificationRecord: true,
    requiresNonBlockingReview: true,
    allowsOrdinaryOnlyWhenMetricsExcluded: false,
    userFacingBlockerCategory:
      "Trade classification governance is incomplete",
  },
];

const CONTRACT_TESTS = [
  "trade_classification_contract_validator",
  "compensated_action_mixed_trade_requires_frozen_terms",
  "ordinary_service_excluded_from_moral_trade_metrics",
  "public_badge_exposure_blocks_classification",
  "trade_classification_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeTradeClassificationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string | null) {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function daysBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60 * 24);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "c") || "c";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function allReviewStatuses(
  status: MoralTradeTradeClassificationReviewStatus,
): Record<
  MoralTradeTradeClassificationReviewDimension,
  MoralTradeTradeClassificationReviewStatus
> {
  return Object.fromEntries(
    REVIEW_DIMENSIONS.map((dimension) => [dimension, status]),
  ) as Record<
    MoralTradeTradeClassificationReviewDimension,
    MoralTradeTradeClassificationReviewStatus
  >;
}

function makeSampleRecord(
  overrides: Partial<MoralTradeTradeClassificationRecord> = {},
): MoralTradeTradeClassificationRecord {
  return {
    classificationId: "trade-classification:demo",
    subjectType: "compensated_moral_action",
    subjectRef: "pledge-swap:demo",
    tradeClassification: "mixed_moral_trade",
    classificationState: "reviewed",
    metricsEligibility: "eligible_for_moral_trade_metrics",
    policySnapshotStatus: "resolved_immutable",
    payerMoralReasonHash: makeHash("payer-moral-reason"),
    performerCounterfactualAcceptanceState: "says_would_not_without_compensation",
    ordinaryServiceProcurementReviewState: "non_blocking",
    moralTradeClassificationRationaleHash: makeHash("classification-rationale"),
    termsState: "locked",
    exactActionFrozen: true,
    compensationTermsFrozen: true,
    evidenceBurdenFrozen: true,
    reviewPeriodFrozen: true,
    exitRemedyRuleFrozen: true,
    publicBadgeExposed: false,
    reviewStatuses: allReviewStatuses("passed"),
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-12-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function getTransitionDefinition(
  transition: MoralTradeTradeClassificationTransition,
) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function reviewStatusBlocks(status: MoralTradeTradeClassificationReviewStatus) {
  return status !== "passed" && status !== "not_required_for_stage";
}

function isOrdinaryClassification(classification: MoralTradeTradeClassification) {
  return (
    classification === "ordinary_donation_or_matching" ||
    classification === "ordinary_service_or_procurement"
  );
}

function termsAreFrozen(record: MoralTradeTradeClassificationRecord) {
  return (
    record.termsState === "locked" &&
    record.exactActionFrozen &&
    record.compensationTermsFrozen &&
    record.evidenceBurdenFrozen &&
    record.reviewPeriodFrozen &&
    record.exitRemedyRuleFrozen
  );
}

export function evaluateMoralTradeTradeClassification(
  input: MoralTradeTradeClassificationEvaluationInput,
): MoralTradeTradeClassificationEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = getTransitionDefinition(input.transition);
  const blockers: string[] = [];
  const passingRecords = new Set<string>();
  const metricEligibleRecords = new Set<string>();

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredRecordCount: 0,
      passingRecordCount: 0,
      metricEligibleRecordCount: 0,
      blockers: [`unknown_trade_classification_transition:${input.transition}`],
      userFacingBlockerCategories: [
        "Trade classification state cannot be interpreted",
      ],
    };
  }

  if (definition.requiresClassificationRecord && input.records.length === 0) {
    blockers.push("trade_classification_record_required");
  }

  input.records.forEach((record) => {
    const recordBlockers: string[] = [];

    if (record.supersededBy) {
      recordBlockers.push(
        `trade_classification_superseded:${record.classificationId}`,
      );
    }

    if (!isHash(record.moralTradeClassificationRationaleHash)) {
      recordBlockers.push(
        `invalid_trade_classification_rationale_hash:${record.classificationId}`,
      );
    }

    if (record.policySnapshotStatus !== "resolved_immutable") {
      recordBlockers.push(
        `trade_classification_policy_snapshot_not_immutable:${record.policySnapshotStatus}`,
      );
    }

    if (daysBetween(record.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
      recordBlockers.push(`stale_trade_classification:${record.classificationId}`);
    }

    if (isExpired(record.expiresAt, checkedAt)) {
      recordBlockers.push(`expired_trade_classification:${record.classificationId}`);
    }

    if (record.publicBadgeExposed) {
      recordBlockers.push(
        `trade_classification_public_badge_exposed:${record.classificationId}`,
      );
    }

    if (record.classificationState !== "reviewed") {
      recordBlockers.push(
        `trade_classification_not_reviewed:${record.classificationId}:${record.classificationState}`,
      );
    }

    if (record.tradeClassification === "rejected_threat_or_externality") {
      if (record.metricsEligibility !== "excluded_rejected") {
        recordBlockers.push(
          `rejected_trade_not_excluded_from_metrics:${record.classificationId}`,
        );
      }

      if (definition.key !== "draft_preview" && definition.key !== "public_metric_publication") {
        recordBlockers.push(
          `rejected_trade_cannot_reach_transition:${record.classificationId}:${definition.key}`,
        );
      }
    }

    if (isOrdinaryClassification(record.tradeClassification)) {
      if (record.metricsEligibility !== "excluded_ordinary") {
        recordBlockers.push(
          `ordinary_trade_included_in_moral_metrics:${record.classificationId}`,
        );
      }

      if (!definition.allowsOrdinaryOnlyWhenMetricsExcluded) {
        recordBlockers.push(
          `ordinary_trade_cannot_lock_as_moral_trade:${record.classificationId}:${definition.key}`,
        );
      }
    }

    if (
      record.subjectType === "compensated_moral_action" &&
      record.tradeClassification !== "mixed_moral_trade"
    ) {
      recordBlockers.push(
        `compensated_action_not_mixed_moral_trade:${record.classificationId}:${record.tradeClassification}`,
      );
    }

    if (record.tradeClassification === "mixed_moral_trade") {
      if (!isHash(record.payerMoralReasonHash)) {
        recordBlockers.push(
          `payer_moral_reason_hash_missing:${record.classificationId}`,
        );
      }

      if (
        record.performerCounterfactualAcceptanceState !==
        "says_would_not_without_compensation"
      ) {
        recordBlockers.push(
          `performer_counterfactual_not_supporting_mixed_trade:${record.classificationId}:${record.performerCounterfactualAcceptanceState}`,
        );
      }

      if (record.ordinaryServiceProcurementReviewState !== "non_blocking") {
        recordBlockers.push(
          `ordinary_service_procurement_not_non_blocking:${record.classificationId}:${record.ordinaryServiceProcurementReviewState}`,
        );
      }

      if (!termsAreFrozen(record)) {
        recordBlockers.push(`compensated_action_terms_not_frozen:${record.classificationId}`);
      }
    }

    if (
      record.metricsEligibility === "eligible_for_moral_trade_metrics" &&
      ![
        "pure_moral_trade",
        "mixed_moral_trade",
        "moral_public_good_coalition",
      ].includes(record.tradeClassification)
    ) {
      recordBlockers.push(
        `invalid_moral_metric_eligibility:${record.classificationId}:${record.tradeClassification}`,
      );
    }

    if (definition.requiresNonBlockingReview) {
      REVIEW_DIMENSIONS.forEach((dimension) => {
        const status = record.reviewStatuses[dimension] ?? "missing";

        if (reviewStatusBlocks(status)) {
          recordBlockers.push(
            `trade_classification_review_not_non_blocking:${dimension}:${status}`,
          );
        }
      });
    }

    if (recordBlockers.length === 0) {
      passingRecords.add(record.classificationId);
      if (record.metricsEligibility === "eligible_for_moral_trade_metrics") {
        metricEligibleRecords.add(record.classificationId);
      }
    }

    blockers.push(...recordBlockers);
  });

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    requiredRecordCount: definition.requiresClassificationRecord ? 1 : 0,
    passingRecordCount: passingRecords.size,
    metricEligibleRecordCount: metricEligibleRecords.size,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [definition.userFacingBlockerCategory],
  };
}

export function getMoralTradeTradeClassificationContract():
  MoralTradeTradeClassificationContract {
  const previewSample = evaluateMoralTradeTradeClassification({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });
  const compensatedActionSample = evaluateMoralTradeTradeClassification({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [makeSampleRecord()],
  });
  const ordinaryMetricSample = evaluateMoralTradeTradeClassification({
    transition: "public_metric_publication",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      makeSampleRecord({
        subjectType: "public_goods_round",
        tradeClassification: "ordinary_donation_or_matching",
        classificationState: "reviewed",
        metricsEligibility: "excluded_ordinary",
        payerMoralReasonHash: null,
        performerCounterfactualAcceptanceState: "not_recorded",
        ordinaryServiceProcurementReviewState: "not_required",
        reviewStatuses: allReviewStatuses("not_required_for_stage"),
      }),
    ],
  });
  const blockedCompensatedActionSample = evaluateMoralTradeTradeClassification({
    transition: "payment_capture",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      makeSampleRecord({
        performerCounterfactualAcceptanceState: "says_would_anyway",
        ordinaryServiceProcurementReviewState: "ordinary_service_blocking",
        compensationTermsFrozen: false,
        publicBadgeExposed: true,
        reviewStatuses: {
          ...allReviewStatuses("passed"),
          ordinary_service_procurement: "blocked",
          coercion_undue_influence: "under_review",
        },
      }),
    ],
  });

  return {
    version: MORAL_TRADE_TRADE_CLASSIFICATION_CONTRACT_VERSION,
    purpose:
      "Fail-closed trade-classification governance for compensated moral actions, ordinary service/procurement exclusion, and moral-trade metric eligibility.",
    failClosedRule:
      "Compensated moral actions can reach lock, payment, payout, or moral-trade metrics only when classified as mixed moral trade with frozen terms and non-blocking review. Ordinary donations, same-view matching, and ordinary service/procurement stay excluded from moral-trade-specific metrics.",
    publicNonClaim:
      "The trade_classification value is an implementation guard, not a public moral status badge or objective ranking of moral worth.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    classifications: CLASSIFICATIONS,
    subjectTypes: SUBJECT_TYPES,
    reviewDimensions: REVIEW_DIMENSIONS,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      previewSample,
      compensatedActionSample,
      ordinaryMetricSample,
      blockedCompensatedActionSample,
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeTradeClassificationContract(
  contract = getMoralTradeTradeClassificationContract(),
): MoralTradeTradeClassificationValidation {
  const checks = [
    check(
      "first-class-trade-classification-tables",
      "Trade classification, compensated-action terms, and ordinary-service reviews are first-class records.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Trade-classification decisions are governed by immutable policy snapshot subjects.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "classification-values",
      "The implementation guard includes pure, mixed, public-good, ordinary, and rejected classifications.",
      CLASSIFICATIONS.every((classification) =>
        contract.classifications.includes(classification),
      ),
      contract.classifications.join(", "),
    ),
    check(
      "review-dimensions",
      "Compensated-action classification review covers legal, labor, tax, coercion, vulnerability, ordinary-service, externality, and anti-corruption dimensions.",
      REVIEW_DIMENSIONS.every((dimension) =>
        contract.reviewDimensions.includes(dimension),
      ),
      contract.reviewDimensions.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, payment, payout, metric publication, and release promotion require classification records and non-blocking review.",
      [
        "matched_trade_lock",
        "payment_capture",
        "payout_release",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresClassificationRecord &&
            definition.requiresNonBlockingReview,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "ordinary-exclusion",
      "Ordinary donation, same-view matching, and ordinary service/procurement are excluded from moral-trade-specific metrics.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "public_metric_publication" &&
          evaluation.status === "pass" &&
          evaluation.metricEligibleRecordCount === 0,
      ),
      contract.sampleEvaluations
        .map(
          (evaluation) =>
            `${evaluation.transition}:${evaluation.status}:${evaluation.metricEligibleRecordCount}`,
        )
        .join(", "),
    ),
    check(
      "sample-evaluations",
      "The public contract exposes passing preview, compensated-action lock, ordinary-exclusion metric, and blocked compensation samples.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "draft_preview" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "matched_trade_lock" &&
            evaluation.status === "pass",
        ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "payment_capture" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "public-non-claim",
      "Trade classification is published as an implementation guard, not a moral status badge.",
      /not a public moral status badge/i.test(contract.publicNonClaim),
      contract.publicNonClaim,
    ),
    check(
      "contract-tests",
      "Trade-classification contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-trade-classification-contract",
    validatorVersion: MORAL_TRADE_TRADE_CLASSIFICATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeTradeClassification = {
  evaluateMoralTradeTradeClassification,
  getMoralTradeTradeClassificationContract,
  validateMoralTradeTradeClassificationContract,
};

export default moralTradeTradeClassification;
