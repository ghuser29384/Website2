export const MORAL_TRADE_OFFER_VALIDITY_CONTRACT_VERSION =
  "moral-trade-offer-validity-v0.1-2026-06";
export const MORAL_TRADE_OFFER_VALIDITY_VALIDATOR_VERSION =
  "moral-trade-offer-validity-validator-v0.1";

export type MoralTradeOfferValidityTransition =
  | "draft_preview"
  | "live_offer_publication"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "payment_capture"
  | "reliance"
  | "public_completion_count"
  | "release_gate_promotion";

export type MoralTradeOfferValiditySubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "seed_template"
  | "worked_example";

export type MoralTradeOfferValidityState =
  | "draft"
  | "valid"
  | "stale"
  | "expired"
  | "renewed"
  | "withdrawn"
  | "superseded"
  | "blocked";

export type MoralTradeOfferValidityPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeOfferValidityStaleReasonCode =
  | "baseline_snapshot_stale"
  | "terms_snapshot_stale"
  | "empirical_assumption_stale"
  | "evidence_standard_stale"
  | "payment_method_stale"
  | "jurisdiction_stale"
  | "recipient_destination_stale"
  | "counterparty_bucket_stale"
  | "validity_window_expired"
  | "renewal_confirmation_missing";

export interface MoralTradeOfferValidityRecord {
  recordId: string;
  subjectType: MoralTradeOfferValiditySubjectType;
  subjectId: string;
  offerValidityPolicyRef: string;
  policyStatus: MoralTradeOfferValidityPolicyStatus;
  baselineSnapshotHash: string;
  termsSnapshotHash: string;
  empiricalAssumptionSnapshotRefs: string[];
  evidenceStandardRefs: string[];
  jurisdictionPolicyVersion: string;
  recipientOrDestinationRefs: string[];
  validFrom: string;
  offerExpiresAt: string;
  staleAt: string;
  renewalConfirmationRecordRefs: string[];
  staleReasonCodes: MoralTradeOfferValidityStaleReasonCode[];
  validityState: MoralTradeOfferValidityState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeOfferValidityEvaluationInput {
  transition: MoralTradeOfferValidityTransition;
  validityRequired: boolean;
  checkedAt?: string;
  records: MoralTradeOfferValidityRecord[];
}

export interface MoralTradeOfferValidityEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeOfferValidityTransition;
  checkedAt: string;
  validityRequired: boolean;
  reviewedRecordCount: number;
  activeValidityRecordCount: number;
  staleOrExpiredRecordCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeOfferValidityTransitionDefinition {
  key: MoralTradeOfferValidityTransition;
  label: string;
  requiresValidityRecord: boolean;
  requiresActiveValidity: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeOfferValidityCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeOfferValidityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-offer-validity-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeOfferValidityCheck[];
  blockers: string[];
}

export interface MoralTradeOfferValidityContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  validityWindowRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeOfferValiditySubjectType[];
  validityStates: MoralTradeOfferValidityState[];
  policyStatuses: MoralTradeOfferValidityPolicyStatus[];
  staleReasonCodes: MoralTradeOfferValidityStaleReasonCode[];
  transitionDefinitions: MoralTradeOfferValidityTransitionDefinition[];
  sampleEvaluations: MoralTradeOfferValidityEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const FIRST_CLASS_RECORD_TABLES = ["moral_trade_offer_validity_records"] as const;
const POLICY_SNAPSHOT_SUBJECTS = ["offer_validity"] as const;

const SUBJECT_TYPES: MoralTradeOfferValiditySubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "seed_template",
  "worked_example",
];

const VALIDITY_STATES: MoralTradeOfferValidityState[] = [
  "draft",
  "valid",
  "stale",
  "expired",
  "renewed",
  "withdrawn",
  "superseded",
  "blocked",
];

const POLICY_STATUSES: MoralTradeOfferValidityPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const STALE_REASON_CODES: MoralTradeOfferValidityStaleReasonCode[] = [
  "baseline_snapshot_stale",
  "terms_snapshot_stale",
  "empirical_assumption_stale",
  "evidence_standard_stale",
  "payment_method_stale",
  "jurisdiction_stale",
  "recipient_destination_stale",
  "counterparty_bucket_stale",
  "validity_window_expired",
  "renewal_confirmation_missing",
];

const ACTIVE_STATES = new Set<MoralTradeOfferValidityState>(["valid", "renewed"]);

const TRANSITION_DEFINITIONS: MoralTradeOfferValidityTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresValidityRecord: false,
    requiresActiveValidity: false,
    userFacingBlockerCategory:
      "Offer validity is preview-only until baseline, terms, evidence, jurisdiction, destination, and counterparty freshness are recorded",
  },
  {
    key: "live_offer_publication",
    label: "Live offer publication",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Live offers need a non-expired validity record before they can be shown as matchable",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Matching waits for current baseline, terms, evidence standard, jurisdiction, destination, and counterparty-bucket freshness",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Lock requires a current offer or renewed confirmation against a fresh preview",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Payment capture cannot rely on stale payment, jurisdiction, destination, evidence, or baseline terms",
  },
  {
    key: "reliance",
    label: "Reliance",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Reliance-bearing states require a non-stale validity record",
  },
  {
    key: "public_completion_count",
    label: "Public completion count",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Public completion cannot count stale or expired non-public-goods offers",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresValidityRecord: true,
    requiresActiveValidity: true,
    userFacingBlockerCategory:
      "Release promotion requires current offer-validity evidence",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeOfferValidityCheck {
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

function isHash(value: string) {
  return HASH_PATTERN.test(value);
}

function isValidIso(value: string) {
  return Number.isFinite(Date.parse(value));
}

function isAfterOrEqual(a: string, b: string) {
  return Date.parse(a) >= Date.parse(b);
}

function hasRefs(values: string[]) {
  return values.some((value) => hasMeaningfulText(value));
}

function evaluateRecord({
  checkedAt,
  record,
  requiresActiveValidity,
}: {
  checkedAt: string;
  record: MoralTradeOfferValidityRecord;
  requiresActiveValidity: boolean;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("offer_validity_record_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`offer_validity_subject_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.offerValidityPolicyRef)) {
    blockers.push(`offer_validity_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(`offer_validity_policy_not_immutable:${record.recordId}:${record.policyStatus}`);
  }

  if (!isHash(record.baselineSnapshotHash)) {
    blockers.push(`offer_validity_baseline_snapshot_hash_missing:${record.recordId}`);
  }

  if (!isHash(record.termsSnapshotHash)) {
    blockers.push(`offer_validity_terms_snapshot_hash_missing:${record.recordId}`);
  }

  if (!hasRefs(record.empiricalAssumptionSnapshotRefs)) {
    blockers.push(`offer_validity_empirical_assumption_refs_missing:${record.recordId}`);
  }

  if (!hasRefs(record.evidenceStandardRefs)) {
    blockers.push(`offer_validity_evidence_standard_refs_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.jurisdictionPolicyVersion)) {
    blockers.push(`offer_validity_jurisdiction_policy_missing:${record.recordId}`);
  }

  if (!hasRefs(record.recipientOrDestinationRefs)) {
    blockers.push(`offer_validity_recipient_or_destination_refs_missing:${record.recordId}`);
  }

  if (!isValidIso(record.validFrom)) {
    blockers.push(`offer_validity_valid_from_invalid:${record.recordId}`);
  }

  if (!isValidIso(record.offerExpiresAt)) {
    blockers.push(`offer_validity_expires_at_invalid:${record.recordId}`);
  }

  if (!isValidIso(record.staleAt)) {
    blockers.push(`offer_validity_stale_at_invalid:${record.recordId}`);
  }

  if (
    isValidIso(record.validFrom) &&
    isValidIso(record.offerExpiresAt) &&
    isAfterOrEqual(record.validFrom, record.offerExpiresAt)
  ) {
    blockers.push(`offer_validity_window_invalid:${record.recordId}`);
  }

  if (isValidIso(record.offerExpiresAt) && isAfterOrEqual(checkedAt, record.offerExpiresAt)) {
    blockers.push(`offer_validity_expired:${record.recordId}`);
  }

  if (isValidIso(record.staleAt) && isAfterOrEqual(checkedAt, record.staleAt)) {
    blockers.push(`offer_validity_stale:${record.recordId}`);
  }

  if (record.validityState === "expired") {
    blockers.push(`offer_validity_state_expired:${record.recordId}`);
  }

  if (record.validityState === "stale") {
    blockers.push(`offer_validity_state_stale:${record.recordId}`);
  }

  if (["withdrawn", "superseded", "blocked"].includes(record.validityState)) {
    blockers.push(`offer_validity_state_blocking:${record.recordId}:${record.validityState}`);
  }

  if (requiresActiveValidity && !ACTIVE_STATES.has(record.validityState)) {
    blockers.push(`offer_validity_state_not_active:${record.recordId}:${record.validityState}`);
  }

  if (record.staleReasonCodes.length > 0 && ACTIVE_STATES.has(record.validityState)) {
    blockers.push(`offer_validity_stale_reasons_present:${record.recordId}`);
  }

  if (
    (record.validityState === "renewed" || record.staleReasonCodes.length > 0) &&
    !hasRefs(record.renewalConfirmationRecordRefs)
  ) {
    blockers.push(`offer_validity_renewal_confirmation_missing:${record.recordId}`);
  }

  if (ACTIVE_STATES.has(record.validityState) && !hasMeaningfulText(record.reviewerDecisionRef)) {
    blockers.push(`offer_validity_reviewer_decision_missing:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeOfferValidity(
  input: MoralTradeOfferValidityEvaluationInput,
): MoralTradeOfferValidityEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const validityRequired =
    input.validityRequired || transitionDefinition?.requiresValidityRecord === true;
  const requiresActiveValidity =
    transitionDefinition?.requiresActiveValidity === true;
  const blockers: string[] = [];
  let reviewedRecordCount = 0;
  let activeValidityRecordCount = 0;
  let staleOrExpiredRecordCount = 0;

  if (validityRequired && input.records.length === 0) {
    blockers.push("offer_validity_record_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({
      checkedAt,
      record,
      requiresActiveValidity,
    });

    blockers.push(...recordBlockers);

    if (
      record.policyStatus === "resolved_immutable" &&
      hasMeaningfulText(record.reviewerDecisionRef)
    ) {
      reviewedRecordCount += 1;
    }

    if (ACTIVE_STATES.has(record.validityState) && recordBlockers.length === 0) {
      activeValidityRecordCount += 1;
    }

    if (
      record.validityState === "stale" ||
      record.validityState === "expired" ||
      recordBlockers.some((blocker) => /stale|expired/.test(blocker))
    ) {
      staleOrExpiredRecordCount += 1;
    }
  }

  if (
    validityRequired &&
    input.records.length > 0 &&
    activeValidityRecordCount === 0
  ) {
    blockers.push("active_offer_validity_record_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    validityRequired,
    reviewedRecordCount,
    activeValidityRecordCount,
    staleOrExpiredRecordCount,
    blockers,
    userFacingBlockerCategories: Array.from(
      new Set(
        blockers.map((blocker) =>
          blocker.includes("expired")
            ? "Offer validity window expired"
            : blocker.includes("stale")
              ? "Offer needs renewed preview"
              : blocker.includes("renewal")
                ? "Renewal confirmation is missing"
                : blocker.includes("policy")
                  ? "Offer-validity policy is not frozen"
                  : "Offer-validity record is incomplete",
        ),
      ),
    ),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeOfferValidityRecord> = {},
): MoralTradeOfferValidityRecord {
  return {
    recordId: "offer-validity:demo",
    subjectType: "offset_offer",
    subjectId: "offset-offer:demo",
    offerValidityPolicyRef: "policy-snapshot:offer-validity-v1",
    policyStatus: "resolved_immutable",
    baselineSnapshotHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    termsSnapshotHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    empiricalAssumptionSnapshotRefs: ["empirical-assumption-snapshot:demo"],
    evidenceStandardRefs: ["evidence-standard:payment", "evidence-standard:baseline"],
    jurisdictionPolicyVersion: "jurisdiction-policy:us-v1",
    recipientOrDestinationRefs: ["recipient:demo", "payment-destination:demo"],
    validFrom: "2026-06-01T00:00:00.000Z",
    offerExpiresAt: "2026-06-30T00:00:00.000Z",
    staleAt: "2026-06-25T00:00:00.000Z",
    renewalConfirmationRecordRefs: [],
    staleReasonCodes: [],
    validityState: "valid",
    reviewerDecisionRef: "review-decision:offer-validity",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

export function getMoralTradeOfferValidityContract(): MoralTradeOfferValidityContract {
  return {
    version: MORAL_TRADE_OFFER_VALIDITY_CONTRACT_VERSION,
    purpose:
      "Fail-closed offer-validity contract for donation-offset and pledge-swap offers, lock proposals, cleared agreements, seed templates, and worked examples.",
    failClosedRule:
      "Donation-offset and pledge-swap offers cannot become live, matchable, locked, captured, reliance-bearing, publicly counted, or release-promoted when the offer-validity record is missing, policy-mutable, stale, expired, withdrawn, superseded, blocked, hash-invalid, missing renewal confirmation, or missing baseline, terms, empirical-assumption, evidence-standard, jurisdiction, recipient, destination, or counterparty-bucket freshness inputs.",
    validityWindowRule:
      "Counterfactual trust decays over time. Stale or expired baselines, empirical assumptions, evidence standards, payment methods, jurisdictions, destinations, or counterparty buckets require renewed preview and renewed participant confirmation before matching, lock, capture, reliance, public completion, or release promotion.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    validityStates: [...VALIDITY_STATES],
    policyStatuses: [...POLICY_STATUSES],
    staleReasonCodes: [...STALE_REASON_CODES],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
    sampleEvaluations: [
      evaluateMoralTradeOfferValidity({
        transition: "matched_trade_lock",
        validityRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [sampleRecord()],
      }),
      evaluateMoralTradeOfferValidity({
        transition: "payment_capture",
        validityRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          sampleRecord({
            recordId: "offer-validity:expired-demo",
            offerExpiresAt: "2026-06-05T00:00:00.000Z",
            staleAt: "2026-06-04T00:00:00.000Z",
            staleReasonCodes: [
              "baseline_snapshot_stale",
              "payment_method_stale",
              "renewal_confirmation_missing",
            ],
            validityState: "expired",
            renewalConfirmationRecordRefs: [],
          }),
        ],
      }),
    ],
    contractTests: [
      "offer_validity_record_test",
      "offer_validity_contract_validator",
      "offer_validity_stale_or_expired_blocks",
      "offer_validity_renewal_confirmation_test",
      "offer_validity_route_contract",
      "offer_validity_schema_contract",
    ],
  };
}

export function validateMoralTradeOfferValidityContract(
  contract: MoralTradeOfferValidityContract = getMoralTradeOfferValidityContract(),
): MoralTradeOfferValidityValidation {
  const checks = [
    check(
      "first-class-record-table",
      "Contract names offer-validity records",
      contract.firstClassRecordTables.includes("moral_trade_offer_validity_records"),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names offer_validity policy snapshots",
      contract.policySnapshotSubjects.includes("offer_validity"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "subject-coverage",
      "Contract covers offers, lock proposals, cleared agreements, seed templates, and worked examples",
      [
        "offset_offer",
        "pledge_swap_offer",
        "matched_trade_lock_proposal",
        "cleared_trade_agreement",
        "seed_template",
        "worked_example",
      ].every((subjectType) =>
        contract.subjectTypes.includes(subjectType as MoralTradeOfferValiditySubjectType),
      ),
      contract.subjectTypes.join(", "),
    ),
    check(
      "stale-reason-coverage",
      "Contract covers stale baseline, terms, assumptions, evidence, payment, jurisdiction, destination, counterparty, expiry, and renewal blockers",
      [
        "baseline_snapshot_stale",
        "terms_snapshot_stale",
        "empirical_assumption_stale",
        "evidence_standard_stale",
        "payment_method_stale",
        "jurisdiction_stale",
        "recipient_destination_stale",
        "counterparty_bucket_stale",
        "validity_window_expired",
        "renewal_confirmation_missing",
      ].every((code) =>
        contract.staleReasonCodes.includes(code as MoralTradeOfferValidityStaleReasonCode),
      ),
      contract.staleReasonCodes.join(", "),
    ),
    check(
      "transition-coverage",
      "Contract requires active validity for live, match, lock, capture, reliance, public completion, and release promotion",
      [
        "live_offer_publication",
        "match_candidate_generation",
        "matched_trade_lock",
        "payment_capture",
        "reliance",
        "public_completion_count",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresValidityRecord &&
            definition.requiresActiveValidity,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "validity-window-rule",
      "Validity-window rule requires renewed preview and confirmation for stale or expired inputs",
      /renewed preview/i.test(contract.validityWindowRule) &&
        /renewed participant confirmation/i.test(contract.validityWindowRule) &&
        /counterparty buckets/i.test(contract.validityWindowRule),
      contract.validityWindowRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include passing and blocked offer-validity paths",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations.map((evaluation) => evaluation.status).join(", "),
    ),
    check(
      "contract-tests",
      "Contract advertises offer_validity_record_test",
      contract.contractTests.includes("offer_validity_record_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-offer-validity-contract",
    validatorVersion: MORAL_TRADE_OFFER_VALIDITY_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeOfferValidity = {
  evaluateMoralTradeOfferValidity,
  getMoralTradeOfferValidityContract,
  validateMoralTradeOfferValidityContract,
};

export default moralTradeOfferValidity;
