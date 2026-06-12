export const MORAL_TRADE_DIRECT_PAIR_CLEARING_CONTRACT_VERSION =
  "moral-trade-direct-pair-clearing-v0.1-2026-06";
export const MORAL_TRADE_DIRECT_PAIR_CLEARING_VALIDATOR_VERSION =
  "moral-trade-direct-pair-clearing-validator-v0.1";

export type MoralTradeDirectPairTransition =
  | "direct_pair_preview"
  | "matched_trade_lock"
  | "payment_authorization"
  | "payment_capture"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeDirectPairTradeType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "manual_review";

export type MoralTradeDirectPairState =
  | "draft"
  | "invited"
  | "previewed"
  | "both_confirmed"
  | "locked"
  | "expired"
  | "withdrawn"
  | "superseded"
  | "blocked";

export type MoralTradeDirectPairReviewState =
  | "not_started"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MoralTradeDirectPairPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeDirectPairClearingRecord {
  recordId: string;
  tradeType: MoralTradeDirectPairTradeType;
  sourceOfferIds: string[];
  matchedTradeLockProposalRef: string | null;
  initiatorParticipantIdHash: string;
  invitedOrKnownCounterpartyIdHash: string;
  inviteOrKnownCounterpartyRef: string;
  directPairClearingPolicyRef: string;
  policyStatus: MoralTradeDirectPairPolicyStatus;
  noBackgroundNetworking: boolean;
  twoPartyTermsSnapshotHash: string;
  finalConfirmationRecordRefs: string[];
  privacyGrantRefs: string[];
  userSafetyReviewState: MoralTradeDirectPairReviewState;
  matchingClearingRunRef: string | null;
  directPairState: MoralTradeDirectPairState;
  ordinaryLockReviewPaymentPrivacyGatesStatus: "passed" | "not_required_for_stage" | "missing" | "under_review" | "blocked" | "stale" | "superseded";
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
  publicCounterpartyIdentity: boolean;
  publicDirectContactDetails: boolean;
  publicExactCaps: boolean;
  publicPrivateNotes: boolean;
  publicPrivateSurplus: boolean;
  autonomousOutreachAttempted: boolean;
}

export interface MoralTradeDirectPairEvaluationInput {
  transition: MoralTradeDirectPairTransition;
  directPairRequired: boolean;
  checkedAt?: string;
  records: MoralTradeDirectPairClearingRecord[];
}

export interface MoralTradeDirectPairEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeDirectPairTransition;
  checkedAt: string;
  directPairRequired: boolean;
  eligibleRecordCount: number;
  confirmedRecordCount: number;
  privacySafeRecordCount: number;
  noBackgroundNetworkingCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeDirectPairTransitionDefinition {
  key: MoralTradeDirectPairTransition;
  label: string;
  requiresFrozenRecordWhenApplicable: boolean;
  requiresBothPartyConfirmation: boolean;
  requiresOrdinaryGates: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeDirectPairCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeDirectPairValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-direct-pair-clearing-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeDirectPairCheck[];
  blockers: string[];
}

export interface MoralTradeDirectPairContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  noAutonomousOutreachRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  tradeTypes: MoralTradeDirectPairTradeType[];
  allowedLaunchTradeTypes: MoralTradeDirectPairTradeType[];
  directPairStates: MoralTradeDirectPairState[];
  reviewStates: MoralTradeDirectPairReviewState[];
  policyStatuses: MoralTradeDirectPairPolicyStatus[];
  transitionDefinitions: MoralTradeDirectPairTransitionDefinition[];
  sampleEvaluations: MoralTradeDirectPairEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 30;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_direct_pair_clearing_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["direct_pair_clearing"] as const;

const TRADE_TYPES: MoralTradeDirectPairTradeType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "manual_review",
];

const ALLOWED_LAUNCH_TRADE_TYPES: MoralTradeDirectPairTradeType[] = [
  "donation_offset",
  "pledge_swap",
];

const DIRECT_PAIR_STATES: MoralTradeDirectPairState[] = [
  "draft",
  "invited",
  "previewed",
  "both_confirmed",
  "locked",
  "expired",
  "withdrawn",
  "superseded",
  "blocked",
];

const REVIEW_STATES: MoralTradeDirectPairReviewState[] = [
  "not_started",
  "under_review",
  "non_blocking",
  "blocked",
  "manual_review",
  "superseded",
];

const POLICY_STATUSES: MoralTradeDirectPairPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const PASSING_STATES = new Set<MoralTradeDirectPairState>([
  "both_confirmed",
  "locked",
]);

const TRANSITIONS: MoralTradeDirectPairTransitionDefinition[] = [
  {
    key: "direct_pair_preview",
    label: "Direct-pair preview",
    requiresFrozenRecordWhenApplicable: true,
    requiresBothPartyConfirmation: true,
    requiresOrdinaryGates: true,
    userFacingBlockerCategory:
      "Direct-pair preview needs a frozen two-party record, both confirmations, and ordinary lock/review/privacy gates",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresFrozenRecordWhenApplicable: true,
    requiresBothPartyConfirmation: true,
    requiresOrdinaryGates: true,
    userFacingBlockerCategory:
      "Direct-pair lock needs both confirmed parties and cannot bypass ordinary gates",
  },
  {
    key: "payment_authorization",
    label: "Payment authorization",
    requiresFrozenRecordWhenApplicable: true,
    requiresBothPartyConfirmation: true,
    requiresOrdinaryGates: true,
    userFacingBlockerCategory:
      "Direct-pair payment authorization waits for both-party consent and ordinary payment gates",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresFrozenRecordWhenApplicable: true,
    requiresBothPartyConfirmation: true,
    requiresOrdinaryGates: true,
    userFacingBlockerCategory:
      "Direct-pair capture cannot proceed unless the pair is atomically locked and payment/privacy gates pass",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresFrozenRecordWhenApplicable: true,
    requiresBothPartyConfirmation: true,
    requiresOrdinaryGates: true,
    userFacingBlockerCategory:
      "Direct-pair metrics need a privacy-safe, confirmed, ordinary-gated clearing record",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresFrozenRecordWhenApplicable: true,
    requiresBothPartyConfirmation: true,
    requiresOrdinaryGates: true,
    userFacingBlockerCategory:
      "Direct-pair release promotion needs evidence that the path is not autonomous outreach or a shortcut around gates",
  },
];

const CONTRACT_TESTS = [
  "direct_pair_clearing_contract_validator",
  "direct_pair_clearing_fail_closed_without_record",
  "direct_pair_clearing_blocks_autonomous_outreach",
  "direct_pair_clearing_blocks_missing_confirmation_or_gate",
  "direct_pair_clearing_route_health_api_schema_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeDirectPairCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasValidHash(value: string) {
  return HASH_PATTERN.test(value);
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? new Date(time) : null;
}

function ageDays(updatedAt: string, checkedAt: Date) {
  const updated = parseDate(updatedAt);

  if (!updated) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    0,
    (checkedAt.getTime() - updated.getTime()) / (24 * 60 * 60 * 1000),
  );
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function transitionDefinition(key: MoralTradeDirectPairTransition) {
  return TRANSITIONS.find((transition) => transition.key === key) ?? TRANSITIONS[0];
}

function hasTwoDistinctConfirmations(record: MoralTradeDirectPairClearingRecord) {
  return new Set(record.finalConfirmationRecordRefs).size >= 2;
}

function isPrivacySafe(record: MoralTradeDirectPairClearingRecord) {
  return (
    !record.publicCounterpartyIdentity &&
    !record.publicDirectContactDetails &&
    !record.publicExactCaps &&
    !record.publicPrivateNotes &&
    !record.publicPrivateSurplus
  );
}

function recordIsEligible(
  record: MoralTradeDirectPairClearingRecord,
  checkedAt: Date,
) {
  return (
    ALLOWED_LAUNCH_TRADE_TYPES.includes(record.tradeType) &&
    record.sourceOfferIds.length > 0 &&
    record.sourceOfferIds.length <= 2 &&
    Boolean(record.matchedTradeLockProposalRef?.trim()) &&
    hasValidHash(record.initiatorParticipantIdHash) &&
    hasValidHash(record.invitedOrKnownCounterpartyIdHash) &&
    record.inviteOrKnownCounterpartyRef.trim().length > 0 &&
    record.directPairClearingPolicyRef.trim().length > 0 &&
    record.policyStatus === "resolved_immutable" &&
    record.noBackgroundNetworking &&
    hasValidHash(record.twoPartyTermsSnapshotHash) &&
    hasTwoDistinctConfirmations(record) &&
    record.privacyGrantRefs.length > 0 &&
    record.userSafetyReviewState === "non_blocking" &&
    Boolean(record.matchingClearingRunRef?.trim()) &&
    PASSING_STATES.has(record.directPairState) &&
    record.ordinaryLockReviewPaymentPrivacyGatesStatus === "passed" &&
    Boolean(record.reviewerDecisionRef?.trim()) &&
    ageDays(record.updatedAt, checkedAt) <= MAX_RECORD_AGE_DAYS &&
    isPrivacySafe(record) &&
    !record.autonomousOutreachAttempted
  );
}

function collectRecordBlockers(
  record: MoralTradeDirectPairClearingRecord,
  checkedAt: Date,
) {
  const blockers: string[] = [];
  const id = record.recordId || "unknown-direct-pair";

  if (!ALLOWED_LAUNCH_TRADE_TYPES.includes(record.tradeType)) {
    blockers.push(`direct_pair_trade_type_not_allowed:${id}:${record.tradeType}`);
  }

  if (record.sourceOfferIds.length === 0 || record.sourceOfferIds.length > 2) {
    blockers.push(`direct_pair_source_offer_scope_invalid:${id}`);
  }

  if (!record.matchedTradeLockProposalRef?.trim()) {
    blockers.push(`direct_pair_lock_proposal_missing:${id}`);
  }

  if (!hasValidHash(record.initiatorParticipantIdHash)) {
    blockers.push(`direct_pair_initiator_hash_invalid:${id}`);
  }

  if (!hasValidHash(record.invitedOrKnownCounterpartyIdHash)) {
    blockers.push(`direct_pair_counterparty_hash_invalid:${id}`);
  }

  if (!record.inviteOrKnownCounterpartyRef.trim()) {
    blockers.push(`direct_pair_invite_or_known_counterparty_ref_missing:${id}`);
  }

  if (!record.directPairClearingPolicyRef.trim()) {
    blockers.push(`direct_pair_policy_ref_missing:${id}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(`direct_pair_policy_not_immutable:${id}:${record.policyStatus}`);
  }

  if (!record.noBackgroundNetworking) {
    blockers.push(`direct_pair_background_networking_not_blocked:${id}`);
  }

  if (!hasValidHash(record.twoPartyTermsSnapshotHash)) {
    blockers.push(`direct_pair_terms_snapshot_hash_invalid:${id}`);
  }

  if (!hasTwoDistinctConfirmations(record)) {
    blockers.push(`direct_pair_both_party_confirmation_missing:${id}`);
  }

  if (record.privacyGrantRefs.length === 0) {
    blockers.push(`direct_pair_privacy_grant_missing:${id}`);
  }

  if (record.userSafetyReviewState !== "non_blocking") {
    blockers.push(
      `direct_pair_user_safety_not_non_blocking:${id}:${record.userSafetyReviewState}`,
    );
  }

  if (!record.matchingClearingRunRef?.trim()) {
    blockers.push(`direct_pair_matching_clearing_run_missing:${id}`);
  }

  if (!PASSING_STATES.has(record.directPairState)) {
    blockers.push(`direct_pair_state_not_confirmed_or_locked:${id}:${record.directPairState}`);
  }

  if (record.ordinaryLockReviewPaymentPrivacyGatesStatus !== "passed") {
    blockers.push(
      `direct_pair_ordinary_gate_status_not_passed:${id}:${record.ordinaryLockReviewPaymentPrivacyGatesStatus}`,
    );
  }

  if (!record.reviewerDecisionRef?.trim()) {
    blockers.push(`direct_pair_reviewer_decision_missing:${id}`);
  }

  if (ageDays(record.updatedAt, checkedAt) > MAX_RECORD_AGE_DAYS) {
    blockers.push(`direct_pair_record_stale:${id}`);
  }

  if (record.publicCounterpartyIdentity) {
    blockers.push(`direct_pair_counterparty_identity_public:${id}`);
  }

  if (record.publicDirectContactDetails) {
    blockers.push(`direct_pair_contact_details_public:${id}`);
  }

  if (record.publicExactCaps) {
    blockers.push(`direct_pair_exact_caps_public:${id}`);
  }

  if (record.publicPrivateNotes) {
    blockers.push(`direct_pair_private_notes_public:${id}`);
  }

  if (record.publicPrivateSurplus) {
    blockers.push(`direct_pair_private_surplus_public:${id}`);
  }

  if (record.autonomousOutreachAttempted) {
    blockers.push(`direct_pair_autonomous_outreach_attempted:${id}`);
  }

  return blockers;
}

export function evaluateMoralTradeDirectPairClearing(
  input: MoralTradeDirectPairEvaluationInput,
): MoralTradeDirectPairEvaluation {
  const checkedAt = parseDate(input.checkedAt) ?? new Date();
  const transition = transitionDefinition(input.transition);
  const blockers: string[] = [];

  if (!input.directPairRequired) {
    const privacyBlockers = input.records.flatMap((record) =>
      collectRecordBlockers(record, checkedAt).filter((blocker) =>
        /public|private|autonomous_outreach|contact_details/.test(blocker),
      ),
    );

    return {
      status: privacyBlockers.length ? "blocked" : "pass",
      transition: input.transition,
      checkedAt: checkedAt.toISOString(),
      directPairRequired: false,
      eligibleRecordCount: 0,
      confirmedRecordCount: 0,
      privacySafeRecordCount: 0,
      noBackgroundNetworkingCount: 0,
      blockers: unique(privacyBlockers),
      userFacingBlockerCategories: privacyBlockers.length
        ? ["Direct-pair private details cannot be published or used for outreach"]
        : [],
    };
  }

  if (transition.requiresFrozenRecordWhenApplicable && input.records.length === 0) {
    blockers.push("direct_pair_clearing_record_missing");
  }

  for (const record of input.records) {
    blockers.push(...collectRecordBlockers(record, checkedAt));
  }

  const eligibleRecords = input.records.filter((record) =>
    recordIsEligible(record, checkedAt),
  );

  if (transition.requiresFrozenRecordWhenApplicable && eligibleRecords.length === 0) {
    blockers.push("eligible_direct_pair_clearing_record_missing");
  }

  const confirmedRecordCount = input.records.filter(hasTwoDistinctConfirmations).length;
  const privacySafeRecordCount = input.records.filter(isPrivacySafe).length;
  const noBackgroundNetworkingCount = input.records.filter(
    (record) => record.noBackgroundNetworking,
  ).length;

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt: checkedAt.toISOString(),
    directPairRequired: true,
    eligibleRecordCount: eligibleRecords.length,
    confirmedRecordCount,
    privacySafeRecordCount,
    noBackgroundNetworkingCount,
    blockers: unique(blockers),
    userFacingBlockerCategories: blockers.length
      ? [transition.userFacingBlockerCategory]
      : [],
  };
}

function hashFor(seed: string) {
  const hexSeed = Array.from(seed)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hexSeed.padEnd(64, "a").slice(0, 64)}`;
}

const DEMO_RECORD: MoralTradeDirectPairClearingRecord = {
  recordId: "direct-pair:donation-offset-demo",
  tradeType: "donation_offset",
  sourceOfferIds: ["offset-offer:a", "offset-offer:b"],
  matchedTradeLockProposalRef: "matched-trade-lock-proposal:direct-pair-demo",
  initiatorParticipantIdHash: hashFor("initiator"),
  invitedOrKnownCounterpartyIdHash: hashFor("counterparty"),
  inviteOrKnownCounterpartyRef: "invite-link:direct-pair-demo",
  directPairClearingPolicyRef: "policy-snapshot:direct-pair-clearing-v1",
  policyStatus: "resolved_immutable",
  noBackgroundNetworking: true,
  twoPartyTermsSnapshotHash: hashFor("two-party-terms"),
  finalConfirmationRecordRefs: ["participant-confirmation:a", "participant-confirmation:b"],
  privacyGrantRefs: ["privacy-grant:direct-pair-disclosure"],
  userSafetyReviewState: "non_blocking",
  matchingClearingRunRef: "matching-clearing-run:direct-pair-demo",
  directPairState: "both_confirmed",
  ordinaryLockReviewPaymentPrivacyGatesStatus: "passed",
  reviewerDecisionRef: "review-decision:direct-pair",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
  publicCounterpartyIdentity: false,
  publicDirectContactDetails: false,
  publicExactCaps: false,
  publicPrivateNotes: false,
  publicPrivateSurplus: false,
  autonomousOutreachAttempted: false,
};

function sampleEvaluations(): MoralTradeDirectPairEvaluation[] {
  return [
    evaluateMoralTradeDirectPairClearing({
      transition: "matched_trade_lock",
      directPairRequired: true,
      checkedAt: "2026-06-12T00:00:00.000Z",
      records: [DEMO_RECORD],
    }),
    evaluateMoralTradeDirectPairClearing({
      transition: "matched_trade_lock",
      directPairRequired: true,
      checkedAt: "2026-06-12T00:00:00.000Z",
      records: [
        {
          ...DEMO_RECORD,
          recordId: "direct-pair:blocking",
          tradeType: "compensated_moral_action",
          finalConfirmationRecordRefs: ["participant-confirmation:one-side"],
          noBackgroundNetworking: false,
          userSafetyReviewState: "under_review",
          directPairState: "invited",
          ordinaryLockReviewPaymentPrivacyGatesStatus: "under_review",
          publicCounterpartyIdentity: true,
          autonomousOutreachAttempted: true,
        },
      ],
    }),
    evaluateMoralTradeDirectPairClearing({
      transition: "direct_pair_preview",
      directPairRequired: false,
      checkedAt: "2026-06-12T00:00:00.000Z",
      records: [],
    }),
  ];
}

export function getMoralTradeDirectPairClearingContract(): MoralTradeDirectPairContract {
  return {
    version: MORAL_TRADE_DIRECT_PAIR_CLEARING_CONTRACT_VERSION,
    purpose:
      "Fail-closed direct-pair clearing governance for two-party or invite-linked donation-offset and pledge-swap previews without autonomous outreach or shortcuts around ordinary lock, review, privacy, payment, and atomic-settlement gates.",
    failClosedRule:
      "Direct-pair clearing is a special case of the exchange kernel, not background networking. Missing, mutable, stale, one-sided, non-consented, privacy-leaking, autonomous-outreach, ungated, or compensated-action direct-pair records block lock, payment, capture, public metrics, and release promotion.",
    noAutonomousOutreachRule:
      "Direct-pair mode may use a user-supplied known counterparty or invite-linked pair, but the platform must not perform autonomous outreach, scrape contacts, disclose contact details, or convert a broad preview into a contacted counterparty.",
    privacyBoundary:
      "Public direct-pair surfaces may show only coarse direct-pair or batch mode, invitation/known-counterparty status, confirmation status, and ordinary-gate status. Counterparty identity, direct contact details, exact caps, private notes, private surplus estimates, source hashes, and reviewer notes stay private unless a frozen disclosure policy, privacy grant, user-safety review, and participant confirmation allow bounded disclosure.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    tradeTypes: [...TRADE_TYPES],
    allowedLaunchTradeTypes: [...ALLOWED_LAUNCH_TRADE_TYPES],
    directPairStates: [...DIRECT_PAIR_STATES],
    reviewStates: [...REVIEW_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: [...TRANSITIONS],
    sampleEvaluations: sampleEvaluations(),
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeDirectPairClearingContract(
  contract = getMoralTradeDirectPairClearingContract(),
): MoralTradeDirectPairValidation {
  const checks = [
    check(
      "first_class_records",
      "Direct-pair clearing records are first-class records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy_snapshot_subjects",
      "Policy snapshots include direct-pair clearing",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "trade_type_scope",
      "Launch direct-pair scope is limited to donation offsets and pledge swaps",
      contract.allowedLaunchTradeTypes.includes("donation_offset") &&
        contract.allowedLaunchTradeTypes.includes("pledge_swap") &&
        !contract.allowedLaunchTradeTypes.includes("compensated_moral_action") &&
        contract.tradeTypes.includes("compensated_moral_action"),
      contract.allowedLaunchTradeTypes.join(", "),
    ),
    check(
      "state_coverage",
      "Contract lists direct-pair, review, and policy states",
      DIRECT_PAIR_STATES.every((state) => contract.directPairStates.includes(state)) &&
        REVIEW_STATES.every((state) => contract.reviewStates.includes(state)) &&
        POLICY_STATUSES.every((status) => contract.policyStatuses.includes(status)),
      `${contract.directPairStates.length}/${contract.reviewStates.length}/${contract.policyStatuses.length}`,
    ),
    check(
      "transition_requirements",
      "Preview, lock, payment, metric, and release transitions require direct-pair checks",
      [
        "direct_pair_preview",
        "matched_trade_lock",
        "payment_authorization",
        "payment_capture",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((key) =>
        contract.transitionDefinitions.some(
          (transition) =>
            transition.key === key &&
            transition.requiresFrozenRecordWhenApplicable &&
            transition.requiresBothPartyConfirmation &&
            transition.requiresOrdinaryGates,
        ),
      ),
      contract.transitionDefinitions.map((transition) => transition.key).join(", "),
    ),
    check(
      "no_autonomous_outreach",
      "Contract blocks autonomous outreach and background-networking substitution",
      /autonomous outreach/i.test(contract.noAutonomousOutreachRule) &&
        /known counterparty/i.test(contract.noAutonomousOutreachRule) &&
        /invite-linked/i.test(contract.noAutonomousOutreachRule) &&
        /background networking/i.test(contract.failClosedRule),
      contract.noAutonomousOutreachRule,
    ),
    check(
      "privacy_boundary",
      "Contract blocks counterparty identity, direct contact, exact cap, private note, and private surplus leakage",
      /counterparty identity/i.test(contract.privacyBoundary) &&
        /direct contact details/i.test(contract.privacyBoundary) &&
        /exact caps/i.test(contract.privacyBoundary) &&
        /private notes/i.test(contract.privacyBoundary) &&
        /private surplus/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "sample_evaluations",
      "Sample evaluations include required pass, required fail-closed, and inactive paths",
      contract.sampleEvaluations.some(
        (evaluation) => evaluation.directPairRequired && evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) => evaluation.directPairRequired && evaluation.status === "blocked",
        ) &&
        contract.sampleEvaluations.some((evaluation) => !evaluation.directPairRequired),
      contract.sampleEvaluations.map((evaluation) => evaluation.status).join(", "),
    ),
    check(
      "contract_tests",
      "Contract declares focused direct-pair clearing tests",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `direct-pair-clearing:${entry.id}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-direct-pair-clearing-contract",
    validatorVersion: MORAL_TRADE_DIRECT_PAIR_CLEARING_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
