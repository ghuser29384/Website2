export const MORAL_TRADE_NET_OFFSET_ACCOUNTING_CONTRACT_VERSION =
  "moral-trade-net-offset-accounting-v0.1-2026-06";
export const MORAL_TRADE_NET_OFFSET_ACCOUNTING_VALIDATOR_VERSION =
  "moral-trade-net-offset-accounting-validator-v0.1";

export type MoralTradeNetOffsetAccountingTransition =
  | "draft_preview"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "clearing_run"
  | "payment_capture"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeNetOffsetAccountingSubjectType =
  | "offset_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "negative_commitment_scope"
  | "evidence_record";

export type MoralTradeBaselineOpposedActionType =
  | "donation"
  | "abstention"
  | "advocacy"
  | "purchase"
  | "service_use"
  | "other"
  | "unknown";

export type MoralTradeResidualActionPolicy =
  | "allowed_if_disclosed"
  | "blocks_clearance"
  | "manual_review"
  | "not_applicable";

export type MoralTradeSubstitutionChannelReviewState =
  | "not_required"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeNetOffsetState =
  | "draft"
  | "previewed"
  | "locked"
  | "verified"
  | "challenged"
  | "blocked"
  | "superseded";

export type MoralTradeNetOffsetPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeNetOffsetAccountingRecord {
  recordId: string;
  subjectType: MoralTradeNetOffsetAccountingSubjectType;
  subjectId: string;
  participantIdHash: string;
  netOffsetAccountingPolicyRef: string;
  policyStatus: MoralTradeNetOffsetPolicyStatus;
  baselineOpposedActionType: MoralTradeBaselineOpposedActionType;
  baselineOpposedAmountCents: number;
  baselineOpposedActionUnits: number;
  matchedCanceledAmountCents: number;
  matchedCanceledActionUnits: number;
  compromiseTransferAmountCents: number;
  sponsorOrMatchAmountCents: number;
  residualOpposedAmountCents: number;
  residualOpposedActionUnits: number;
  residualActionPolicy: MoralTradeResidualActionPolicy;
  substitutionChannelReviewState: MoralTradeSubstitutionChannelReviewState;
  evidenceClaimRefs: string[];
  evidenceStandardRef: string | null;
  netOffsetState: MoralTradeNetOffsetState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  publicParticipantIdentity: boolean;
  publicPrivateBaselineDetails: boolean;
  publicSubstitutionChannelDetails: boolean;
  publicReviewerNotes: boolean;
}

export interface MoralTradeNetOffsetAccountingEvaluationInput {
  transition: MoralTradeNetOffsetAccountingTransition;
  accountingRequired: boolean;
  checkedAt?: string;
  records: MoralTradeNetOffsetAccountingRecord[];
}

export interface MoralTradeNetOffsetAccountingEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeNetOffsetAccountingTransition;
  checkedAt: string;
  accountingRequired: boolean;
  reviewedRecordCount: number;
  netMetricEligibleRecordCount: number;
  privacySafeRecordCount: number;
  netCanceledAmountCents: number;
  grossTransferAmountCents: number;
  sponsorOrMatchAmountCents: number;
  residualOpposedAmountCents: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeNetOffsetAccountingTransitionDefinition {
  key: MoralTradeNetOffsetAccountingTransition;
  label: string;
  requiresAccounting: boolean;
  requiresNetMetricEligibleState: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeNetOffsetAccountingCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeNetOffsetAccountingValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-net-offset-accounting-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeNetOffsetAccountingCheck[];
  blockers: string[];
}

export interface MoralTradeNetOffsetAccountingContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  grossVolumeExclusionRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeNetOffsetAccountingSubjectType[];
  baselineOpposedActionTypes: MoralTradeBaselineOpposedActionType[];
  residualActionPolicies: MoralTradeResidualActionPolicy[];
  substitutionChannelReviewStates: MoralTradeSubstitutionChannelReviewState[];
  netOffsetStates: MoralTradeNetOffsetState[];
  policyStatuses: MoralTradeNetOffsetPolicyStatus[];
  transitionDefinitions: MoralTradeNetOffsetAccountingTransitionDefinition[];
  sampleEvaluations: MoralTradeNetOffsetAccountingEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_net_offset_accounting_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["net_offset_accounting"] as const;

const SUBJECT_TYPES: MoralTradeNetOffsetAccountingSubjectType[] = [
  "offset_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "negative_commitment_scope",
  "evidence_record",
];

const BASELINE_OPPOSED_ACTION_TYPES: MoralTradeBaselineOpposedActionType[] = [
  "donation",
  "abstention",
  "advocacy",
  "purchase",
  "service_use",
  "other",
  "unknown",
];

const RESIDUAL_ACTION_POLICIES: MoralTradeResidualActionPolicy[] = [
  "allowed_if_disclosed",
  "blocks_clearance",
  "manual_review",
  "not_applicable",
];

const SUBSTITUTION_CHANNEL_REVIEW_STATES: MoralTradeSubstitutionChannelReviewState[] = [
  "not_required",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
];

const NET_OFFSET_STATES: MoralTradeNetOffsetState[] = [
  "draft",
  "previewed",
  "locked",
  "verified",
  "challenged",
  "blocked",
  "superseded",
];

const POLICY_STATUSES: MoralTradeNetOffsetPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const PASSING_SUBSTITUTION_STATES = new Set<MoralTradeSubstitutionChannelReviewState>([
  "not_required",
  "non_blocking",
]);

const PASSING_NET_OFFSET_STATES = new Set<MoralTradeNetOffsetState>([
  "locked",
  "verified",
]);

const TRANSITION_DEFINITIONS: MoralTradeNetOffsetAccountingTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresAccounting: false,
    requiresNetMetricEligibleState: false,
    userFacingBlockerCategory:
      "Net-offset accounting is preview-only until baseline and canceled-action records are reviewed",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresAccounting: true,
    requiresNetMetricEligibleState: false,
    userFacingBlockerCategory:
      "Match candidates need net-offset accounting before gross transfer amounts can affect matching",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresAccounting: true,
    requiresNetMetricEligibleState: true,
    userFacingBlockerCategory:
      "Lock requires baseline opposed action, matched canceled amount, residual action, and evidence standard",
  },
  {
    key: "clearing_run",
    label: "Clearing run",
    requiresAccounting: true,
    requiresNetMetricEligibleState: true,
    userFacingBlockerCategory:
      "Clearing cannot treat compromise transfers or sponsor matches as net canceled opposed action",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresAccounting: true,
    requiresNetMetricEligibleState: true,
    userFacingBlockerCategory:
      "Payment capture waits for non-blocking net-offset accounting",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresAccounting: true,
    requiresNetMetricEligibleState: true,
    userFacingBlockerCategory:
      "Public metrics must count net canceled opposed action, not gross compromise transfers",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresAccounting: true,
    requiresNetMetricEligibleState: true,
    userFacingBlockerCategory:
      "Release promotion requires first-class net-offset accounting evidence",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeNetOffsetAccountingCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 8);
}

function nonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function positive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function isRecentIso(value: string, checkedAt: string) {
  const parsed = Date.parse(value);
  const checked = Date.parse(checkedAt);

  if (!Number.isFinite(parsed) || !Number.isFinite(checked)) {
    return false;
  }

  return checked - parsed <= MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function recordHasPrivacyLeak(record: MoralTradeNetOffsetAccountingRecord) {
  return (
    record.publicParticipantIdentity ||
    record.publicPrivateBaselineDetails ||
    record.publicSubstitutionChannelDetails ||
    record.publicReviewerNotes
  );
}

function recordNetCanceledAmount(record: MoralTradeNetOffsetAccountingRecord) {
  return Math.max(0, record.matchedCanceledAmountCents);
}

function recordGrossTransferAmount(record: MoralTradeNetOffsetAccountingRecord) {
  return Math.max(0, record.compromiseTransferAmountCents);
}

function recordResidualAmount(record: MoralTradeNetOffsetAccountingRecord) {
  return Math.max(0, record.residualOpposedAmountCents);
}

function recordNeedsResidualDisclosure(record: MoralTradeNetOffsetAccountingRecord) {
  return positive(record.residualOpposedAmountCents) || positive(record.residualOpposedActionUnits);
}

function evaluateRecord({
  checkedAt,
  record,
  requiresNetMetricEligibleState,
}: {
  checkedAt: string;
  record: MoralTradeNetOffsetAccountingRecord;
  requiresNetMetricEligibleState: boolean;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("net_offset_record_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`net_offset_subject_missing:${record.recordId}`);
  }

  if (!HASH_PATTERN.test(record.participantIdHash)) {
    blockers.push(`net_offset_participant_hash_invalid:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.netOffsetAccountingPolicyRef)) {
    blockers.push(`net_offset_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(`net_offset_policy_not_immutable:${record.recordId}:${record.policyStatus}`);
  }

  if (record.baselineOpposedActionType === "unknown") {
    blockers.push(`baseline_opposed_action_unknown:${record.recordId}`);
  }

  if (
    !nonNegative(record.baselineOpposedAmountCents) ||
    !nonNegative(record.baselineOpposedActionUnits) ||
    !nonNegative(record.matchedCanceledAmountCents) ||
    !nonNegative(record.matchedCanceledActionUnits) ||
    !nonNegative(record.compromiseTransferAmountCents) ||
    !nonNegative(record.sponsorOrMatchAmountCents) ||
    !nonNegative(record.residualOpposedAmountCents) ||
    !nonNegative(record.residualOpposedActionUnits)
  ) {
    blockers.push(`net_offset_amounts_invalid:${record.recordId}`);
  }

  const hasBaseline =
    positive(record.baselineOpposedAmountCents) ||
    positive(record.baselineOpposedActionUnits);
  const hasCanceled =
    positive(record.matchedCanceledAmountCents) ||
    positive(record.matchedCanceledActionUnits);

  if (!hasBaseline) {
    blockers.push(`baseline_opposed_action_missing:${record.recordId}`);
  }

  if (!hasCanceled) {
    blockers.push(`matched_canceled_offset_missing:${record.recordId}`);
  }

  if (!hasCanceled && positive(record.compromiseTransferAmountCents)) {
    blockers.push(`gross_transfer_without_canceled_offset:${record.recordId}`);
  }

  if (record.matchedCanceledAmountCents > record.baselineOpposedAmountCents) {
    blockers.push(`matched_canceled_amount_exceeds_baseline:${record.recordId}`);
  }

  if (record.matchedCanceledActionUnits > record.baselineOpposedActionUnits) {
    blockers.push(`matched_canceled_units_exceed_baseline:${record.recordId}`);
  }

  if (
    recordNeedsResidualDisclosure(record) &&
    record.residualActionPolicy !== "allowed_if_disclosed"
  ) {
    blockers.push(
      `residual_opposed_action_not_disclosed:${record.recordId}:${record.residualActionPolicy}`,
    );
  }

  if (!PASSING_SUBSTITUTION_STATES.has(record.substitutionChannelReviewState)) {
    blockers.push(
      `substitution_channel_not_non_blocking:${record.recordId}:${record.substitutionChannelReviewState}`,
    );
  }

  if (record.evidenceClaimRefs.length === 0) {
    blockers.push(`net_offset_evidence_claim_refs_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.evidenceStandardRef)) {
    blockers.push(`net_offset_evidence_standard_missing:${record.recordId}`);
  }

  if (
    requiresNetMetricEligibleState &&
    !PASSING_NET_OFFSET_STATES.has(record.netOffsetState)
  ) {
    blockers.push(`net_offset_state_not_metric_eligible:${record.recordId}:${record.netOffsetState}`);
  }

  if (
    PASSING_NET_OFFSET_STATES.has(record.netOffsetState) &&
    !hasMeaningfulText(record.reviewerDecisionRef)
  ) {
    blockers.push(`net_offset_reviewer_decision_missing:${record.recordId}`);
  }

  if (!isRecentIso(record.updatedAt, checkedAt)) {
    blockers.push(`stale_net_offset_record:${record.recordId}`);
  }

  if (recordHasPrivacyLeak(record)) {
    blockers.push(`net_offset_privacy_leak:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeNetOffsetAccounting(
  input: MoralTradeNetOffsetAccountingEvaluationInput,
): MoralTradeNetOffsetAccountingEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const accountingRequired =
    input.accountingRequired || transitionDefinition?.requiresAccounting === true;
  const requiresNetMetricEligibleState =
    transitionDefinition?.requiresNetMetricEligibleState === true;
  const blockers: string[] = [];
  let reviewedRecordCount = 0;
  let netMetricEligibleRecordCount = 0;
  let privacySafeRecordCount = 0;

  if (accountingRequired && input.records.length === 0) {
    blockers.push("net_offset_accounting_record_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({
      checkedAt,
      record,
      requiresNetMetricEligibleState,
    });

    blockers.push(...recordBlockers);

    if (
      record.policyStatus === "resolved_immutable" &&
      hasMeaningfulText(record.reviewerDecisionRef) &&
      isRecentIso(record.updatedAt, checkedAt)
    ) {
      reviewedRecordCount += 1;
    }

    if (recordBlockers.length === 0) {
      netMetricEligibleRecordCount += 1;
    }

    if (!recordHasPrivacyLeak(record)) {
      privacySafeRecordCount += 1;
    }
  }

  if (
    accountingRequired &&
    input.records.length > 0 &&
    netMetricEligibleRecordCount === 0
  ) {
    blockers.push("net_offset_metric_eligible_record_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    accountingRequired,
    reviewedRecordCount,
    netMetricEligibleRecordCount,
    privacySafeRecordCount,
    netCanceledAmountCents: input.records.reduce(
      (sum, record) => sum + recordNetCanceledAmount(record),
      0,
    ),
    grossTransferAmountCents: input.records.reduce(
      (sum, record) => sum + recordGrossTransferAmount(record),
      0,
    ),
    sponsorOrMatchAmountCents: input.records.reduce(
      (sum, record) => sum + Math.max(0, record.sponsorOrMatchAmountCents),
      0,
    ),
    residualOpposedAmountCents: input.records.reduce(
      (sum, record) => sum + recordResidualAmount(record),
      0,
    ),
    blockers,
    userFacingBlockerCategories: Array.from(
      new Set(
        blockers.map((blocker) =>
          blocker.includes("gross_transfer")
            ? "Gross transfer is not net offset"
            : blocker.includes("residual")
              ? "Residual opposed action needs disclosure or review"
              : blocker.includes("substitution")
                ? "Substitution-channel review is still blocking"
                : blocker.includes("privacy")
                  ? "Private net-offset details cannot be public"
                  : "Net-offset accounting is incomplete",
        ),
      ),
    ),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeNetOffsetAccountingRecord> = {},
): MoralTradeNetOffsetAccountingRecord {
  return {
    recordId: "net-offset:demo",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:demo-offset",
    participantIdHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    netOffsetAccountingPolicyRef: "policy-snapshot:net-offset-accounting-v1",
    policyStatus: "resolved_immutable",
    baselineOpposedActionType: "donation",
    baselineOpposedAmountCents: 100_000,
    baselineOpposedActionUnits: 0,
    matchedCanceledAmountCents: 60_000,
    matchedCanceledActionUnits: 0,
    compromiseTransferAmountCents: 60_000,
    sponsorOrMatchAmountCents: 0,
    residualOpposedAmountCents: 40_000,
    residualOpposedActionUnits: 0,
    residualActionPolicy: "allowed_if_disclosed",
    substitutionChannelReviewState: "non_blocking",
    evidenceClaimRefs: ["evidence-claim:baseline", "evidence-claim:canceled-offset"],
    evidenceStandardRef: "evidence-standard:net-offset-v1",
    netOffsetState: "locked",
    reviewerDecisionRef: "review-decision:net-offset",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicParticipantIdentity: false,
    publicPrivateBaselineDetails: false,
    publicSubstitutionChannelDetails: false,
    publicReviewerNotes: false,
    ...overrides,
  };
}

export function getMoralTradeNetOffsetAccountingContract(): MoralTradeNetOffsetAccountingContract {
  return {
    version: MORAL_TRADE_NET_OFFSET_ACCOUNTING_CONTRACT_VERSION,
    purpose:
      "Fail-closed net-offset accounting contract for donation-offset and negative-commitment Moral Trade previews, locks, clearing, payment, public metrics, and release gates.",
    failClosedRule:
      "Donation-offset volume is net-of-offset. Missing, stale, mutable, privacy-leaking, challenged, gross-only, substitution-unreviewed, residual-undisclosed, or evidence-missing net-offset accounting records keep a trade preview/manual-review only and block lock, clearing, capture, public metric publication, and release-gate promotion.",
    privacyBoundary:
      "Public surfaces may expose coarse net-offset status and aggregate safe totals, but never participant identity hashes, private baseline details, substitution-channel details, private evidence, reviewer notes, or participant-specific accounting rows.",
    grossVolumeExclusionRule:
      "Gross compromise donations, sponsor matches, payment evidence, or public matched volume cannot count as moral-trade volume unless the baseline opposed action, matched canceled amount, residual opposed action, substitution-channel state, and evidence standard are recorded under immutable policy.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    baselineOpposedActionTypes: [...BASELINE_OPPOSED_ACTION_TYPES],
    residualActionPolicies: [...RESIDUAL_ACTION_POLICIES],
    substitutionChannelReviewStates: [...SUBSTITUTION_CHANNEL_REVIEW_STATES],
    netOffsetStates: [...NET_OFFSET_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
    sampleEvaluations: [
      evaluateMoralTradeNetOffsetAccounting({
        transition: "matched_trade_lock",
        accountingRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [sampleRecord()],
      }),
      evaluateMoralTradeNetOffsetAccounting({
        transition: "public_metric_publication",
        accountingRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          sampleRecord({
            recordId: "net-offset:blocked-gross-only",
            matchedCanceledAmountCents: 0,
            residualActionPolicy: "manual_review",
            substitutionChannelReviewState: "under_review",
            evidenceClaimRefs: [],
            evidenceStandardRef: null,
            netOffsetState: "previewed",
            reviewerDecisionRef: null,
          }),
        ],
      }),
    ],
    contractTests: [
      "net_offset_accounting_test",
      "net_offset_accounting_contract_validator",
      "net_offset_gross_transfer_not_volume",
      "net_offset_privacy_boundary",
      "net_offset_accounting_route_contract",
      "net_offset_accounting_schema_contract",
    ],
  };
}

export function validateMoralTradeNetOffsetAccountingContract(
  contract: MoralTradeNetOffsetAccountingContract = getMoralTradeNetOffsetAccountingContract(),
): MoralTradeNetOffsetAccountingValidation {
  const checks = [
    check(
      "first-class-record-table",
      "Contract names net-offset accounting records",
      contract.firstClassRecordTables.includes("moral_trade_net_offset_accounting_records"),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names net_offset_accounting policy snapshots",
      contract.policySnapshotSubjects.includes("net_offset_accounting"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "subject-coverage",
      "Contract covers offset offers, lock proposals, cleared agreements, negative commitments, and evidence records",
      [
        "offset_offer",
        "matched_trade_lock_proposal",
        "cleared_trade_agreement",
        "negative_commitment_scope",
        "evidence_record",
      ].every((subjectType) =>
        contract.subjectTypes.includes(subjectType as MoralTradeNetOffsetAccountingSubjectType),
      ),
      contract.subjectTypes.join(", "),
    ),
    check(
      "baseline-action-coverage",
      "Contract covers donation, abstention, advocacy, purchase, service-use, other, and unknown baselines",
      [
        "donation",
        "abstention",
        "advocacy",
        "purchase",
        "service_use",
        "other",
        "unknown",
      ].every((actionType) =>
        contract.baselineOpposedActionTypes.includes(actionType as MoralTradeBaselineOpposedActionType),
      ),
      contract.baselineOpposedActionTypes.join(", "),
    ),
    check(
      "residual-action-policy",
      "Contract distinguishes disclosed, blocking, manual-review, and not-applicable residual action policies",
      [
        "allowed_if_disclosed",
        "blocks_clearance",
        "manual_review",
        "not_applicable",
      ].every((policy) =>
        contract.residualActionPolicies.includes(policy as MoralTradeResidualActionPolicy),
      ),
      contract.residualActionPolicies.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract requires accounting for lock, clearing, capture, public metrics, and release promotion",
      [
        "matched_trade_lock",
        "clearing_run",
        "payment_capture",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresAccounting &&
            definition.requiresNetMetricEligibleState,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "gross-volume-rule",
      "Gross compromise transfers and sponsor matches cannot count as moral-trade volume",
      /Gross compromise donations/i.test(contract.grossVolumeExclusionRule) &&
        /baseline opposed action/i.test(contract.grossVolumeExclusionRule),
      contract.grossVolumeExclusionRule,
    ),
    check(
      "privacy-boundary",
      "Privacy boundary excludes participant identity, private baseline, substitution, evidence, reviewer notes, and participant rows",
      [
        /participant identity hashes/i,
        /private baseline details/i,
        /substitution-channel details/i,
        /reviewer notes/i,
        /participant-specific accounting rows/i,
      ].every((pattern) => pattern.test(contract.privacyBoundary)),
      contract.privacyBoundary,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and blocked net-offset accounting paths",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations.map((evaluation) => evaluation.status).join(", "),
    ),
    check(
      "contract-tests",
      "Contract advertises net_offset_accounting_test",
      contract.contractTests.includes("net_offset_accounting_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-net-offset-accounting-contract",
    validatorVersion: MORAL_TRADE_NET_OFFSET_ACCOUNTING_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeNetOffsetAccounting = {
  evaluateMoralTradeNetOffsetAccounting,
  getMoralTradeNetOffsetAccountingContract,
  validateMoralTradeNetOffsetAccountingContract,
};

export default moralTradeNetOffsetAccounting;
