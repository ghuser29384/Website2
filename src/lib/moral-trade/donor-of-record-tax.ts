export const MORAL_TRADE_DONOR_OF_RECORD_TAX_CONTRACT_VERSION =
  "moral-trade-donor-of-record-tax-v0.1-2026-06";
export const MORAL_TRADE_DONOR_OF_RECORD_TAX_VALIDATOR_VERSION =
  "moral-trade-donor-of-record-tax-validator-v0.1";

export type MoralTradeDonorOfRecordTaxTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "receipt_issuance"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeDonorOfRecordSubjectType =
  | "donation_offset"
  | "public_goods_round"
  | "common_ground_budget";

export type MoralTradeDonorOfRecordType =
  | "participant"
  | "counterparty"
  | "sponsor"
  | "platform"
  | "external_donor"
  | "unknown";

export type MoralTradeTaxReceiptBehavior =
  | "no_receipt"
  | "receipt_to_payer"
  | "receipt_to_recipient"
  | "receipt_to_sponsor"
  | "manual_review";

export type MoralTradeDonorTaxReviewState =
  | "not_required_for_stage"
  | "passed"
  | "under_review"
  | "blocked"
  | "stale";

export type MoralTradeTaxBenefitClaimState =
  | "not_claimed"
  | "supported_by_policy"
  | "under_review"
  | "blocked";

export type MoralTradeCreditClaimState =
  | "not_expected"
  | "disclosed_supported"
  | "under_review"
  | "blocked"
  | "double_claimed";

export type MoralTradeDonorTaxRecordState =
  | "draft"
  | "previewed"
  | "reviewed"
  | "receipt_ready"
  | "blocked"
  | "superseded";

export interface MoralTradeDonorOfRecordTaxRecord {
  recordId: string;
  subjectType: MoralTradeDonorOfRecordSubjectType;
  subjectRef: string;
  donorOfRecordPolicyRef: string;
  taxReceiptPolicyRef: string;
  donorOfRecordType: MoralTradeDonorOfRecordType;
  donorOfRecordHash: string;
  receiptBeneficiaryHash: string;
  taxReceiptBehavior: MoralTradeTaxReceiptBehavior;
  taxBenefitClaimState: MoralTradeTaxBenefitClaimState;
  jurisdictionReviewState: MoralTradeDonorTaxReviewState;
  charitableSolicitationReviewState: MoralTradeDonorTaxReviewState;
  commercialCoVentureReviewState: MoralTradeDonorTaxReviewState;
  doubleClaimReviewState: MoralTradeDonorTaxReviewState;
  employerMatchCreditState: MoralTradeCreditClaimState;
  donorAdvisedFundCreditState: MoralTradeCreditClaimState;
  receiptSilentlyReassigned: boolean;
  taxDeductibilityImpliedWithoutPolicy: boolean;
  taxBenefitCountedAsMoralImpact: boolean;
  recordState: MoralTradeDonorTaxRecordState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeDonorOfRecordTaxEvaluationInput {
  transition: MoralTradeDonorOfRecordTaxTransition;
  checkedAt?: string;
  donorOfRecordTaxRequired: boolean;
  records: MoralTradeDonorOfRecordTaxRecord[];
}

export interface MoralTradeDonorOfRecordTaxEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeDonorOfRecordTaxTransition;
  checkedAt: string;
  donorOfRecordTaxRequired: boolean;
  recordCount: number;
  nonBlockingRecordCount: number;
  explicitDonorRecordCount: number;
  receiptSafeRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeDonorOfRecordTaxCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeDonorOfRecordTaxValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-donor-of-record-tax-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeDonorOfRecordTaxCheck[];
  blockers: string[];
}

export interface MoralTradeDonorOfRecordTaxContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  receiptRule: string;
  noTaxClaimRule: string;
  impactSeparationRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: {
    key: MoralTradeDonorOfRecordTaxTransition;
    requiresDonorTaxRecords: boolean;
    requiresNonBlockingReview: boolean;
    requiresReceiptSafeRecord: boolean;
    userFacingBlockerCategory: string;
  }[];
  sampleEvaluations: MoralTradeDonorOfRecordTaxEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_donor_of_record_tax_reviews",
  "moral_trade_donor_of_record_tax_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "donor_of_record",
  "tax_receipt",
  "donor_of_record_tax_receipt",
  "legal_jurisdiction",
  "public_metric_release",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "donor_of_record_tax_receipt_test",
] as const;

const CONTRACT_TESTS = [
  "donor_of_record_tax_contract_validator",
  "donor_of_record_tax_receipt_test",
  "donor_tax_double_claim_blocking_test",
  "donor_tax_route_contract",
  "donor_tax_schema_contract",
] as const;

const SUBJECT_TYPES = new Set<MoralTradeDonorOfRecordSubjectType>([
  "donation_offset",
  "public_goods_round",
  "common_ground_budget",
]);

const DONOR_TYPES = new Set<MoralTradeDonorOfRecordType>([
  "participant",
  "counterparty",
  "sponsor",
  "platform",
  "external_donor",
  "unknown",
]);

const RECEIPT_BEHAVIORS = new Set<MoralTradeTaxReceiptBehavior>([
  "no_receipt",
  "receipt_to_payer",
  "receipt_to_recipient",
  "receipt_to_sponsor",
  "manual_review",
]);

const PASSING_REVIEW_STATES = new Set<MoralTradeDonorTaxReviewState>([
  "not_required_for_stage",
  "passed",
]);

const PASSING_CREDIT_STATES = new Set<MoralTradeCreditClaimState>([
  "not_expected",
  "disclosed_supported",
]);

const NON_BLOCKING_RECORD_STATES = new Set<MoralTradeDonorTaxRecordState>([
  "previewed",
  "reviewed",
  "receipt_ready",
]);

const RECEIPT_READY_STATES = new Set<MoralTradeDonorTaxRecordState>([
  "reviewed",
  "receipt_ready",
]);

const TRANSITIONS = [
  {
    key: "draft_preview",
    requiresDonorTaxRecords: false,
    requiresNonBlockingReview: false,
    requiresReceiptSafeRecord: false,
    userFacingBlockerCategory:
      "Draft preview may disclose donor and receipt uncertainty without reliance",
  },
  {
    key: "matched_trade_lock",
    requiresDonorTaxRecords: true,
    requiresNonBlockingReview: true,
    requiresReceiptSafeRecord: false,
    userFacingBlockerCategory:
      "Lock requires explicit donor-of-record and non-blocking tax/solicitation review",
  },
  {
    key: "payment_authorization",
    requiresDonorTaxRecords: true,
    requiresNonBlockingReview: true,
    requiresReceiptSafeRecord: false,
    userFacingBlockerCategory:
      "Payment authorization requires donor, receipt, and tax-benefit handling to be frozen",
  },
  {
    key: "payment_capture",
    requiresDonorTaxRecords: true,
    requiresNonBlockingReview: true,
    requiresReceiptSafeRecord: false,
    userFacingBlockerCategory:
      "Payment capture cannot infer donor or tax treatment from payment source alone",
  },
  {
    key: "receipt_issuance",
    requiresDonorTaxRecords: true,
    requiresNonBlockingReview: true,
    requiresReceiptSafeRecord: true,
    userFacingBlockerCategory:
      "Receipt issuance requires explicit beneficiary, jurisdiction support, and no double claim",
  },
  {
    key: "public_metric_publication",
    requiresDonorTaxRecords: true,
    requiresNonBlockingReview: true,
    requiresReceiptSafeRecord: true,
    userFacingBlockerCategory:
      "Public metrics cannot count tax benefits, receipt credits, or donor status as moral impact",
  },
  {
    key: "release_gate_promotion",
    requiresDonorTaxRecords: true,
    requiresNonBlockingReview: true,
    requiresReceiptSafeRecord: true,
    userFacingBlockerCategory:
      "Release promotion requires donor-of-record and tax-receipt controls to pass",
  },
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function isIsoDate(value: unknown): value is string {
  if (!hasText(value)) return false;
  return Number.isFinite(Date.parse(value));
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
  if (value === null) return false;
  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function transitionContract(transition: MoralTradeDonorOfRecordTaxTransition) {
  return TRANSITIONS.find((entry) => entry.key === transition) || TRANSITIONS[0];
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "d") || "d";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function isReviewNonBlocking(record: MoralTradeDonorOfRecordTaxRecord) {
  return (
    DONOR_TYPES.has(record.donorOfRecordType) &&
    record.donorOfRecordType !== "unknown" &&
    RECEIPT_BEHAVIORS.has(record.taxReceiptBehavior) &&
    record.taxReceiptBehavior !== "manual_review" &&
    PASSING_REVIEW_STATES.has(record.jurisdictionReviewState) &&
    PASSING_REVIEW_STATES.has(record.charitableSolicitationReviewState) &&
    PASSING_REVIEW_STATES.has(record.commercialCoVentureReviewState) &&
    PASSING_REVIEW_STATES.has(record.doubleClaimReviewState) &&
    PASSING_CREDIT_STATES.has(record.employerMatchCreditState) &&
    PASSING_CREDIT_STATES.has(record.donorAdvisedFundCreditState) &&
    !record.receiptSilentlyReassigned &&
    !record.taxDeductibilityImpliedWithoutPolicy &&
    !record.taxBenefitCountedAsMoralImpact &&
    NON_BLOCKING_RECORD_STATES.has(record.recordState) &&
    !record.supersededBy
  );
}

function isReceiptSafe(record: MoralTradeDonorOfRecordTaxRecord) {
  return (
    isReviewNonBlocking(record) &&
    RECEIPT_READY_STATES.has(record.recordState) &&
    record.taxBenefitClaimState !== "under_review" &&
    record.taxBenefitClaimState !== "blocked"
  );
}

function pushRecordBlockers(
  blockers: string[],
  record: MoralTradeDonorOfRecordTaxRecord,
  checkedAt: string,
  requiresReceiptSafeRecord: boolean,
) {
  const id = hasText(record.recordId) ? record.recordId : "donor-of-record-tax:missing-id";

  if (!hasText(record.recordId)) {
    blockers.push("donor_tax_record_id_missing");
  }

  if (!SUBJECT_TYPES.has(record.subjectType)) {
    blockers.push(`donor_tax_subject_type_invalid:${id}`);
  }

  if (!hasText(record.subjectRef)) {
    blockers.push(`donor_tax_subject_ref_missing:${id}`);
  }

  if (!hasText(record.donorOfRecordPolicyRef)) {
    blockers.push(`donor_of_record_policy_missing:${id}`);
  }

  if (!hasText(record.taxReceiptPolicyRef)) {
    blockers.push(`tax_receipt_policy_missing:${id}`);
  }

  if (!DONOR_TYPES.has(record.donorOfRecordType) || record.donorOfRecordType === "unknown") {
    blockers.push(`donor_of_record_type_not_explicit:${id}:${record.donorOfRecordType}`);
  }

  if (!isHash(record.donorOfRecordHash)) {
    blockers.push(`donor_of_record_hash_invalid:${id}`);
  }

  if (!isHash(record.receiptBeneficiaryHash)) {
    blockers.push(`receipt_beneficiary_hash_invalid:${id}`);
  }

  if (!RECEIPT_BEHAVIORS.has(record.taxReceiptBehavior) || record.taxReceiptBehavior === "manual_review") {
    blockers.push(`tax_receipt_behavior_not_final:${id}:${record.taxReceiptBehavior}`);
  }

  if (record.taxBenefitClaimState === "under_review" || record.taxBenefitClaimState === "blocked") {
    blockers.push(`tax_benefit_claim_not_supported:${id}:${record.taxBenefitClaimState}`);
  }

  if (
    record.taxBenefitClaimState === "supported_by_policy" &&
    record.jurisdictionReviewState !== "passed"
  ) {
    blockers.push(`tax_benefit_jurisdiction_review_not_passed:${id}:${record.jurisdictionReviewState}`);
  }

  const reviewStates: Array<[string, MoralTradeDonorTaxReviewState]> = [
    ["jurisdiction", record.jurisdictionReviewState],
    ["charitable_solicitation", record.charitableSolicitationReviewState],
    ["commercial_co_venture", record.commercialCoVentureReviewState],
    ["double_claim", record.doubleClaimReviewState],
  ];

  for (const [key, state] of reviewStates) {
    if (!PASSING_REVIEW_STATES.has(state)) {
      blockers.push(`donor_tax_${key}_review_not_non_blocking:${id}:${state}`);
    }
  }

  const creditStates: Array<[string, MoralTradeCreditClaimState]> = [
    ["employer_match", record.employerMatchCreditState],
    ["donor_advised_fund", record.donorAdvisedFundCreditState],
  ];

  for (const [key, state] of creditStates) {
    if (!PASSING_CREDIT_STATES.has(state)) {
      blockers.push(`donor_tax_${key}_credit_not_supported:${id}:${state}`);
    }
  }

  if (record.receiptSilentlyReassigned) {
    blockers.push(`receipt_silently_reassigned:${id}`);
  }

  if (record.taxDeductibilityImpliedWithoutPolicy) {
    blockers.push(`tax_deductibility_implied_without_policy:${id}`);
  }

  if (record.taxBenefitCountedAsMoralImpact) {
    blockers.push(`tax_benefit_counted_as_moral_impact:${id}`);
  }

  if (!NON_BLOCKING_RECORD_STATES.has(record.recordState)) {
    blockers.push(`donor_tax_record_state_not_non_blocking:${id}:${record.recordState}`);
  }

  if (requiresReceiptSafeRecord && !RECEIPT_READY_STATES.has(record.recordState)) {
    blockers.push(`donor_tax_receipt_not_ready:${id}:${record.recordState}`);
  }

  if (!hasText(record.reviewerDecisionRef)) {
    blockers.push(`donor_tax_reviewer_decision_missing:${id}`);
  }

  if (!isIsoDate(record.createdAt) || !isIsoDate(record.updatedAt)) {
    blockers.push(`donor_tax_timestamps_invalid:${id}`);
  }

  if (isExpired(record.expiresAt, checkedAt)) {
    blockers.push(`donor_tax_record_expired:${id}`);
  }

  if (daysBetween(record.updatedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
    blockers.push(`donor_tax_record_stale:${id}`);
  }

  if (record.supersededBy) {
    blockers.push(`donor_tax_record_superseded:${id}`);
  }
}

export function evaluateMoralTradeDonorOfRecordTax(
  input: MoralTradeDonorOfRecordTaxEvaluationInput,
): MoralTradeDonorOfRecordTaxEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transition = transitionContract(input.transition);
  const blockers: string[] = [];

  if (input.donorOfRecordTaxRequired && input.records.length === 0) {
    blockers.push("donor_of_record_tax_record_required");
  }

  if (transition.requiresDonorTaxRecords && input.records.length === 0) {
    blockers.push(`donor_tax_record_missing_for_transition:${transition.key}`);
  }

  for (const record of input.records) {
    pushRecordBlockers(blockers, record, checkedAt, transition.requiresReceiptSafeRecord);
  }

  const nonBlockingRecordCount = input.records.filter(isReviewNonBlocking).length;
  const explicitDonorRecordCount = input.records.filter(
    (record) => DONOR_TYPES.has(record.donorOfRecordType) && record.donorOfRecordType !== "unknown",
  ).length;
  const receiptSafeRecordCount = input.records.filter(isReceiptSafe).length;

  if (
    transition.requiresNonBlockingReview &&
    input.records.length > 0 &&
    nonBlockingRecordCount === 0
  ) {
    blockers.push(`donor_tax_no_non_blocking_record:${transition.key}`);
  }

  if (
    transition.requiresReceiptSafeRecord &&
    input.records.length > 0 &&
    receiptSafeRecordCount === 0
  ) {
    blockers.push(`donor_tax_no_receipt_safe_record:${transition.key}`);
  }

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    donorOfRecordTaxRequired: input.donorOfRecordTaxRequired,
    recordCount: input.records.length,
    nonBlockingRecordCount,
    explicitDonorRecordCount,
    receiptSafeRecordCount,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [transition.userFacingBlockerCategory],
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeDonorOfRecordTaxRecord> = {},
): MoralTradeDonorOfRecordTaxRecord {
  return {
    charitableSolicitationReviewState: "passed",
    commercialCoVentureReviewState: "not_required_for_stage",
    createdAt: "2026-06-13T12:00:00.000Z",
    donorAdvisedFundCreditState: "not_expected",
    donorOfRecordHash: makeHash("donor-of-record"),
    donorOfRecordPolicyRef: "policy:donor-of-record:v1",
    donorOfRecordType: "participant",
    doubleClaimReviewState: "passed",
    employerMatchCreditState: "not_expected",
    expiresAt: "2026-12-13T12:00:00.000Z",
    jurisdictionReviewState: "passed",
    receiptBeneficiaryHash: makeHash("receipt-beneficiary"),
    receiptSilentlyReassigned: false,
    recordId: "donor-of-record-tax:demo",
    recordState: "receipt_ready",
    reviewerDecisionRef: "review:donor-tax",
    subjectRef: "donation-offset:demo",
    subjectType: "donation_offset",
    supersededBy: null,
    taxBenefitClaimState: "not_claimed",
    taxBenefitCountedAsMoralImpact: false,
    taxDeductibilityImpliedWithoutPolicy: false,
    taxReceiptBehavior: "receipt_to_payer",
    taxReceiptPolicyRef: "policy:tax-receipt:v1",
    updatedAt: "2026-06-13T12:00:00.000Z",
    ...overrides,
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeDonorOfRecordTaxCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeDonorOfRecordTaxContract():
  MoralTradeDonorOfRecordTaxContract {
  const previewSample = evaluateMoralTradeDonorOfRecordTax({
    transition: "draft_preview",
    checkedAt: "2026-06-13T12:00:00.000Z",
    donorOfRecordTaxRequired: false,
    records: [],
  });
  const lockSample = evaluateMoralTradeDonorOfRecordTax({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-13T12:00:00.000Z",
    donorOfRecordTaxRequired: true,
    records: [sampleRecord({ recordState: "reviewed" })],
  });
  const receiptSample = evaluateMoralTradeDonorOfRecordTax({
    transition: "receipt_issuance",
    checkedAt: "2026-06-13T12:00:00.000Z",
    donorOfRecordTaxRequired: true,
    records: [sampleRecord()],
  });
  const blockedSample = evaluateMoralTradeDonorOfRecordTax({
    transition: "public_metric_publication",
    checkedAt: "2026-06-13T12:00:00.000Z",
    donorOfRecordTaxRequired: true,
    records: [
      sampleRecord({
        commercialCoVentureReviewState: "under_review",
        donorAdvisedFundCreditState: "double_claimed",
        donorOfRecordType: "unknown",
        doubleClaimReviewState: "blocked",
        employerMatchCreditState: "under_review",
        receiptSilentlyReassigned: true,
        recordState: "previewed",
        taxBenefitClaimState: "supported_by_policy",
        taxBenefitCountedAsMoralImpact: true,
        taxDeductibilityImpliedWithoutPolicy: true,
        taxReceiptBehavior: "manual_review",
      }),
    ],
  });

  return {
    version: MORAL_TRADE_DONOR_OF_RECORD_TAX_CONTRACT_VERSION,
    purpose:
      "Fail-closed donor-of-record, tax-receipt, charitable-solicitation, commercial-co-venture, and receipt-credit governance for donation-offset flows.",
    failClosedRule:
      "Donation-offset flows cannot reach lock, payment authorization, payment capture, receipt issuance, public metrics, or release-gate promotion unless donor-of-record and tax-receipt treatment is explicit, policy-backed, jurisdiction-reviewed where needed, and non-blocking.",
    receiptRule:
      "Receipt beneficiary, tax-receipt behavior, employer-match credit, donor-advised-fund credit, and any reassignment must be frozen before lock and cannot be inferred from payment source alone.",
    noTaxClaimRule:
      "The platform must not imply tax deductibility or receipt eligibility unless a frozen policy and jurisdiction review support the claim.",
    impactSeparationRule:
      "Tax receipts, employer matches, donor-advised-fund credits, commercial co-venture disclosures, and similar benefits are operational/legal facts, not moral-trade volume or impact.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    transitions: [...TRANSITIONS],
    sampleEvaluations: [previewSample, lockSample, receiptSample, blockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeDonorOfRecordTaxContract(
  contract = getMoralTradeDonorOfRecordTaxContract(),
): MoralTradeDonorOfRecordTaxValidation {
  const checks = [
    check(
      "first-class-record-tables",
      "Donor/tax review and enforcement records are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subjects",
      "Donor, receipt, legal, and public-metric policy subjects are immutable inputs.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "release-gate-hook",
      "Release promotion exposes the donor-of-record tax receipt test hook.",
      contract.releaseGateTestHooks.includes("donor_of_record_tax_receipt_test"),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, payment, receipt issuance, public metrics, and release promotion require donor/tax records.",
      [
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "receipt_issuance",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitions.some(
          (entry) =>
            entry.key === transition &&
            entry.requiresDonorTaxRecords &&
            entry.requiresNonBlockingReview,
        ),
      ),
      contract.transitions.map((entry) => entry.key).join(", "),
    ),
    check(
      "receipt-rule",
      "The contract blocks payment-source inference and requires frozen receipt beneficiary handling.",
      /cannot be inferred from payment source/i.test(contract.receiptRule) &&
        /frozen/i.test(contract.receiptRule),
      contract.receiptRule,
    ),
    check(
      "no-tax-claim",
      "The contract blocks unsupported tax-deductibility claims.",
      /must not imply tax deductibility/i.test(contract.noTaxClaimRule),
      contract.noTaxClaimRule,
    ),
    check(
      "impact-separation",
      "The contract separates tax and receipt benefits from moral-trade impact.",
      /not moral-trade volume or impact/i.test(contract.impactSeparationRule),
      contract.impactSeparationRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include pass and blocked states.",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations
        .map((sample) => `${sample.transition}:${sample.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract advertises donor/tax tests.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-donor-of-record-tax-contract",
    validatorVersion: MORAL_TRADE_DONOR_OF_RECORD_TAX_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
