import { createHash } from "node:crypto";

export const MORAL_TRADE_PAYMENT_AUTHORIZATION_CONTRACT_VERSION =
  "moral-trade-payment-authorizations-v0.1-2026-06";
export const MORAL_TRADE_PAYMENT_AUTHORIZATION_VALIDATOR_VERSION =
  "moral-trade-payment-authorization-validator-v0.1";

export type MoralTradePaymentAuthorizationSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "matched_trade_lock_proposal";

export type MoralTradePaymentAuthorizationMode =
  | "manual_review_stub"
  | "provider_managed_conditional_authorization";

export type MoralTradePaymentAuthorizationTransition =
  | "authorization_stub_record"
  | "provider_authorization"
  | "payment_capture";

export type MoralTradePaymentAuthorizationGateStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradePaymentAuthorizationPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradePaymentAuthorizationRecord {
  authorizationId: string;
  subjectType: MoralTradePaymentAuthorizationSubjectType;
  subjectRef: string;
  transition: MoralTradePaymentAuthorizationTransition;
  authorizationMode: MoralTradePaymentAuthorizationMode;
  idempotencyKeyHash: string;
  frozenPreviewHash: string;
  lockedTermsSnapshotHash: string;
  referencedTermsSnapshotHash: string;
  termSheetHash: string;
  referencedTermSheetHash: string;
  participantConfirmationHash: string;
  referencedParticipantConfirmationHash: string;
  releaseGatePolicySnapshotStatus: MoralTradePaymentAuthorizationPolicySnapshotStatus;
  paymentAuthorizationPolicySnapshotStatus: MoralTradePaymentAuthorizationPolicySnapshotStatus;
  realMoneyCaptureFlagStatus: MoralTradePaymentAuthorizationGateStatus;
  finalLockProposalStatus: MoralTradePaymentAuthorizationGateStatus;
  participantConfirmationStatus: MoralTradePaymentAuthorizationGateStatus;
  jurisdictionPolicyStatus: MoralTradePaymentAuthorizationGateStatus;
  legalReviewStatus: MoralTradePaymentAuthorizationGateStatus;
  paymentRailReviewStatus: MoralTradePaymentAuthorizationGateStatus;
  providerCapabilityStatus: MoralTradePaymentAuthorizationGateStatus;
  accountSecurityStatus: MoralTradePaymentAuthorizationGateStatus;
  providerAuthorizationAllowed: boolean;
  checkoutCreationAllowed: boolean;
  captureAllowed: boolean;
  providerAuthorizationRefHash: string | null;
  marketplaceStateEventRef: string | null;
  manualReviewQueueRef: string | null;
  rawProviderPayloadPublic: boolean;
  paymentCredentialsPublic: boolean;
  providerSecretPublic: boolean;
  checkedAt: string;
  expiresAt: string | null;
}

export interface MoralTradePaymentAuthorizationEvaluationInput {
  transition: MoralTradePaymentAuthorizationTransition;
  checkedAt?: string;
  records: MoralTradePaymentAuthorizationRecord[];
}

export interface MoralTradePaymentAuthorizationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePaymentAuthorizationTransition;
  checkedAt: string;
  recordCount: number;
  stubRecordCount: number;
  providerAuthorizationCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePaymentAuthorizationContract {
  version: typeof MORAL_TRADE_PAYMENT_AUTHORIZATION_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  manualStubRule: string;
  conditionalProviderRule: string;
  captureRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  subjectTypes: MoralTradePaymentAuthorizationSubjectType[];
  transitions: MoralTradePaymentAuthorizationTransition[];
  authorizationModes: MoralTradePaymentAuthorizationMode[];
  requiredProviderAuthorizationGates: string[];
  sampleEvaluations: MoralTradePaymentAuthorizationEvaluation[];
  contractTests: string[];
}

export interface MoralTradePaymentAuthorizationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-payment-authorization-contract";
  validatorVersion: typeof MORAL_TRADE_PAYMENT_AUTHORIZATION_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_PAYMENT_AUTHORIZATION_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_payment_authorization_policies",
  "moral_trade_payment_authorization_attempts",
  "moral_trade_payment_authorization_manual_review_queue",
  "moral_trade_marketplace_state_events",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "payment_authorization",
  "real_money_capture_feature_flag",
  "legal_jurisdiction",
  "provider_capability",
  "account_security",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "payment_authorization_stub_test",
  "payment_replay_tests",
  "donation_offset_lock_confirmation_test",
  "participant_ui_render_snapshot_accessibility_test",
  "non_public_goods_term_sheet_test",
  "reviewer_conflict_tests",
] as const;

const SUBJECT_TYPES: MoralTradePaymentAuthorizationSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "matched_trade_lock_proposal",
];

const TRANSITIONS: MoralTradePaymentAuthorizationTransition[] = [
  "authorization_stub_record",
  "provider_authorization",
  "payment_capture",
];

const AUTHORIZATION_MODES: MoralTradePaymentAuthorizationMode[] = [
  "manual_review_stub",
  "provider_managed_conditional_authorization",
];

const REQUIRED_PROVIDER_AUTHORIZATION_GATES = [
  "resolved immutable release-gate policy",
  "resolved immutable payment-authorization policy",
  "real-money capture feature flag enabled under policy",
  "frozen preview hash",
  "locked terms snapshot hash match",
  "participant term-sheet hash match",
  "participant confirmation hash match",
  "matched-trade final-lock proposal",
  "jurisdiction policy non-blocking",
  "legal review non-blocking",
  "payment-rail review non-blocking",
  "provider conditional-authorization capability",
  "account security non-blocking",
  "idempotency key",
  "marketplace_state_event audit",
] as const;

const CONTRACT_TESTS = [
  "payment_authorization_contract_validator",
  "payment_authorization_manual_stub_no_capture_test",
  "payment_authorization_conditional_provider_gate_test",
  "payment_authorization_hash_match_test",
  "payment_authorization_no_checkout_capture_test",
  "payment_authorization_route_contract",
] as const;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHash(value: unknown): value is string {
  return hasText(value) && HASH_PATTERN.test(value);
}

function isIsoDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function hashSeed(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function isPassingStatus(status: MoralTradePaymentAuthorizationGateStatus) {
  return status === "passed" || status === "not_required_for_stage";
}

function isExpired(expiresAt: string | null, checkedAt: string) {
  return isIsoDate(expiresAt) && Date.parse(expiresAt) < Date.parse(checkedAt);
}

function categoryForBlocker(blocker: string) {
  if (blocker.includes("checkout") || blocker.includes("capture")) {
    return "Payment capture and immediate checkout remain blocked";
  }
  if (blocker.includes("hash") || blocker.includes("snapshot") || blocker.includes("term_sheet")) {
    return "Payment authorization does not match the frozen preview and confirmations";
  }
  if (blocker.includes("jurisdiction") || blocker.includes("legal") || blocker.includes("rail")) {
    return "Legal, jurisdiction, or payment-rail review is incomplete";
  }
  if (blocker.includes("provider")) {
    return "Conditional provider authorization is not available";
  }
  if (blocker.includes("manual_review")) {
    return "Blocked payment authorization is not routed to manual review";
  }
  if (blocker.includes("marketplace_state_event")) {
    return "Payment authorization is missing an append-only state event";
  }
  if (blocker.includes("private") || blocker.includes("public")) {
    return "Private payment/provider data must remain private";
  }

  return "Payment authorization gates are incomplete";
}

function validateRecord(
  record: MoralTradePaymentAuthorizationRecord,
  transition: MoralTradePaymentAuthorizationTransition,
  checkedAt: string,
) {
  const blockers: string[] = [];
  const id = hasText(record.authorizationId) ? record.authorizationId : "unknown-authorization";

  if (record.transition !== transition) {
    blockers.push(`payment_authorization_transition_mismatch:${id}:${record.transition}`);
  }
  if (!hasText(record.subjectRef)) blockers.push(`payment_authorization_subject_missing:${id}`);
  if (!isHash(record.idempotencyKeyHash)) blockers.push(`payment_authorization_idempotency_hash_invalid:${id}`);
  if (!isHash(record.frozenPreviewHash)) blockers.push(`payment_authorization_preview_hash_invalid:${id}`);
  if (!isHash(record.lockedTermsSnapshotHash) || !isHash(record.referencedTermsSnapshotHash)) {
    blockers.push(`payment_authorization_terms_snapshot_hash_invalid:${id}`);
  } else if (record.lockedTermsSnapshotHash !== record.referencedTermsSnapshotHash) {
    blockers.push(`payment_authorization_terms_snapshot_mismatch:${id}`);
  }
  if (!isHash(record.termSheetHash) || !isHash(record.referencedTermSheetHash)) {
    blockers.push(`payment_authorization_term_sheet_hash_invalid:${id}`);
  } else if (record.termSheetHash !== record.referencedTermSheetHash) {
    blockers.push(`payment_authorization_term_sheet_hash_mismatch:${id}`);
  }
  if (!isHash(record.participantConfirmationHash) || !isHash(record.referencedParticipantConfirmationHash)) {
    blockers.push(`payment_authorization_participant_confirmation_hash_invalid:${id}`);
  } else if (record.participantConfirmationHash !== record.referencedParticipantConfirmationHash) {
    blockers.push(`payment_authorization_participant_confirmation_hash_mismatch:${id}`);
  }
  if (record.releaseGatePolicySnapshotStatus !== "resolved_immutable") {
    blockers.push(`payment_authorization_release_gate_policy_not_immutable:${id}:${record.releaseGatePolicySnapshotStatus}`);
  }
  if (record.paymentAuthorizationPolicySnapshotStatus !== "resolved_immutable") {
    blockers.push(`payment_authorization_policy_not_immutable:${id}:${record.paymentAuthorizationPolicySnapshotStatus}`);
  }
  if (!isIsoDate(record.checkedAt)) blockers.push(`payment_authorization_checked_at_invalid:${id}`);
  if (isExpired(record.expiresAt, checkedAt)) blockers.push(`payment_authorization_expired:${id}`);
  if (!hasText(record.marketplaceStateEventRef)) {
    blockers.push(`payment_authorization_marketplace_state_event_missing:${id}`);
  }
  if (record.checkoutCreationAllowed) blockers.push(`payment_authorization_checkout_creation_allowed:${id}`);
  if (record.captureAllowed) blockers.push(`payment_authorization_capture_allowed:${id}`);
  if (record.rawProviderPayloadPublic) blockers.push(`payment_authorization_raw_provider_payload_public:${id}`);
  if (record.paymentCredentialsPublic) blockers.push(`payment_authorization_credentials_public:${id}`);
  if (record.providerSecretPublic) blockers.push(`payment_authorization_provider_secret_public:${id}`);

  const gateStatuses: Array<[string, MoralTradePaymentAuthorizationGateStatus]> = [
    ["real_money_capture_flag", record.realMoneyCaptureFlagStatus],
    ["final_lock_proposal", record.finalLockProposalStatus],
    ["participant_confirmation", record.participantConfirmationStatus],
    ["jurisdiction_policy", record.jurisdictionPolicyStatus],
    ["legal_review", record.legalReviewStatus],
    ["payment_rail_review", record.paymentRailReviewStatus],
    ["provider_capability", record.providerCapabilityStatus],
    ["account_security", record.accountSecurityStatus],
  ];

  if (record.authorizationMode === "manual_review_stub") {
    if (record.providerAuthorizationAllowed) {
      blockers.push(`payment_authorization_stub_provider_authorization_allowed:${id}`);
    }
    if (record.providerAuthorizationRefHash !== null) {
      blockers.push(`payment_authorization_stub_provider_ref_present:${id}`);
    }
    if (!hasText(record.manualReviewQueueRef)) {
      blockers.push(`payment_authorization_manual_review_queue_missing:${id}`);
    }
    return blockers;
  }

  for (const [key, status] of gateStatuses) {
    if (!isPassingStatus(status)) {
      blockers.push(`payment_authorization_gate_not_passed:${id}:${key}:${status}`);
    }
  }
  if (!record.providerAuthorizationAllowed) {
    blockers.push(`payment_authorization_provider_authorization_not_allowed:${id}`);
  }
  if (!isHash(record.providerAuthorizationRefHash)) {
    blockers.push(`payment_authorization_provider_ref_hash_invalid:${id}`);
  }

  return blockers;
}

export function evaluateMoralTradePaymentAuthorizations(
  input: MoralTradePaymentAuthorizationEvaluationInput,
): MoralTradePaymentAuthorizationEvaluation {
  const checkedAt = input.checkedAt || new Date().toISOString();
  const blockers: string[] = [];
  let stubRecordCount = 0;
  let providerAuthorizationCount = 0;

  if (input.records.length === 0) {
    blockers.push(`payment_authorization_records_missing:${input.transition}`);
  }

  for (const record of input.records) {
    if (record.authorizationMode === "manual_review_stub") stubRecordCount += 1;
    if (record.authorizationMode === "provider_managed_conditional_authorization") {
      providerAuthorizationCount += 1;
    }
    blockers.push(...validateRecord(record, input.transition, checkedAt));
  }

  const uniqueBlockers = unique(blockers);

  return {
    blockers: uniqueBlockers,
    checkedAt,
    providerAuthorizationCount,
    recordCount: input.records.length,
    status: uniqueBlockers.length ? "blocked" : "pass",
    stubRecordCount,
    transition: input.transition,
    userFacingBlockerCategories: unique(uniqueBlockers.map(categoryForBlocker)),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradePaymentAuthorizationRecord> = {},
): MoralTradePaymentAuthorizationRecord {
  return {
    accountSecurityStatus: "not_required_for_stage",
    authorizationId: "payment-authorization:sample",
    authorizationMode: "manual_review_stub",
    captureAllowed: false,
    checkedAt: "2026-06-25T12:00:00.000Z",
    checkoutCreationAllowed: false,
    expiresAt: "2026-06-25T12:30:00.000Z",
    finalLockProposalStatus: "missing",
    frozenPreviewHash: hashSeed("preview"),
    idempotencyKeyHash: hashSeed("idempotency"),
    jurisdictionPolicyStatus: "under_review",
    legalReviewStatus: "under_review",
    lockedTermsSnapshotHash: hashSeed("terms"),
    manualReviewQueueRef: "manual-review:payment-authorization",
    marketplaceStateEventRef: "marketplace-state-event:payment-authorization",
    participantConfirmationHash: hashSeed("confirmation"),
    participantConfirmationStatus: "missing",
    paymentAuthorizationPolicySnapshotStatus: "resolved_immutable",
    paymentCredentialsPublic: false,
    paymentRailReviewStatus: "under_review",
    providerAuthorizationAllowed: false,
    providerAuthorizationRefHash: null,
    providerCapabilityStatus: "missing",
    providerSecretPublic: false,
    rawProviderPayloadPublic: false,
    realMoneyCaptureFlagStatus: "blocked",
    referencedParticipantConfirmationHash: hashSeed("confirmation"),
    referencedTermSheetHash: hashSeed("term-sheet"),
    referencedTermsSnapshotHash: hashSeed("terms"),
    releaseGatePolicySnapshotStatus: "resolved_immutable",
    subjectRef: "matched-trade-lock:sample",
    subjectType: "donation_offset",
    termSheetHash: hashSeed("term-sheet"),
    transition: "authorization_stub_record",
    ...overrides,
  };
}

function sampleInput(
  overrides: Partial<MoralTradePaymentAuthorizationEvaluationInput> = {},
): MoralTradePaymentAuthorizationEvaluationInput {
  return {
    checkedAt: "2026-06-25T12:05:00.000Z",
    records: [sampleRecord()],
    transition: "authorization_stub_record",
    ...overrides,
  };
}

export function getMoralTradePaymentAuthorizationContract(): MoralTradePaymentAuthorizationContract {
  const stubSample = evaluateMoralTradePaymentAuthorizations(sampleInput());
  const providerSample = evaluateMoralTradePaymentAuthorizations(
    sampleInput({
      records: [
        sampleRecord({
          accountSecurityStatus: "passed",
          authorizationMode: "provider_managed_conditional_authorization",
          finalLockProposalStatus: "passed",
          jurisdictionPolicyStatus: "passed",
          legalReviewStatus: "passed",
          manualReviewQueueRef: null,
          participantConfirmationStatus: "passed",
          paymentRailReviewStatus: "passed",
          providerAuthorizationAllowed: true,
          providerAuthorizationRefHash: hashSeed("provider-authorization"),
          providerCapabilityStatus: "passed",
          realMoneyCaptureFlagStatus: "passed",
          transition: "provider_authorization",
        }),
      ],
      transition: "provider_authorization",
    }),
  );
  const blockedCaptureSample = evaluateMoralTradePaymentAuthorizations(
    sampleInput({
      records: [
        sampleRecord({
          captureAllowed: true,
          checkoutCreationAllowed: true,
          manualReviewQueueRef: null,
          marketplaceStateEventRef: null,
          referencedParticipantConfirmationHash: hashSeed("changed-confirmation"),
          referencedTermSheetHash: hashSeed("changed-term-sheet"),
          referencedTermsSnapshotHash: hashSeed("changed-terms"),
          rawProviderPayloadPublic: true,
          transition: "payment_capture",
        }),
      ],
      transition: "payment_capture",
    }),
  );

  return {
    authorizationModes: [...AUTHORIZATION_MODES],
    captureRule:
      "This contract never authorizes payment capture; capture remains blocked until the separate replay-safe payment-event and settlement paths match locked terms, final confirmations, deadlines, and provider events.",
    conditionalProviderRule:
      "A future provider-managed conditional authorization may be recorded only after frozen preview, locked terms, term-sheet hash, participant confirmation, final-lock proposal, legal/jurisdiction, payment-rail, account-security, real-money feature flag, provider capability, idempotency, and marketplace_state_event gates pass.",
    contractTests: [...CONTRACT_TESTS],
    failClosedRule:
      "Donation-offset, pledge-swap, and compensated moral-action payments fail closed to manual-review stubs unless every current payment-authorization gate is non-blocking; immediate checkout and capture stay false.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    manualStubRule:
      "Manual-review stubs are valid only when provider authorization, checkout creation, and capture are false, no provider authorization reference is attached, and the blocked authorization is routed to manual review with an audit state event.",
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    privacyBoundary:
      "Public contract output never exposes payment credentials, provider secrets, raw provider payloads, provider customer or payment-method identifiers, participant identity hashes, reviewer notes, or participant-specific authorization rows.",
    purpose:
      "Fail-closed payment authorization contract for moraltrade82 non-public-goods previews and future conditional-provider integration.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    requiredProviderAuthorizationGates: [...REQUIRED_PROVIDER_AUTHORIZATION_GATES],
    sampleEvaluations: [stubSample, providerSample, blockedCaptureSample],
    subjectTypes: [...SUBJECT_TYPES],
    transitions: [...TRANSITIONS],
    version: MORAL_TRADE_PAYMENT_AUTHORIZATION_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradePaymentAuthorizationValidation["checks"][number] {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

export function validateMoralTradePaymentAuthorizationContract(
  contract = getMoralTradePaymentAuthorizationContract(),
): MoralTradePaymentAuthorizationValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names policy, attempt, manual-review, and marketplace state-event tables",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "release-gate-hooks",
      "Contract maps payment authorization to release-gate hooks",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "manual-stub-rule",
      "Contract keeps manual-review stubs non-provider, non-checkout, and non-capture",
      /provider authorization.+checkout creation.+capture are false/i.test(contract.manualStubRule) &&
        /manual review/i.test(contract.manualStubRule),
      contract.manualStubRule,
    ),
    check(
      "conditional-provider-gates",
      "Contract requires all current moraltrade82 gates before provider conditional authorization",
      REQUIRED_PROVIDER_AUTHORIZATION_GATES.every((gate) =>
        contract.requiredProviderAuthorizationGates.includes(gate),
      ) && /future provider-managed conditional authorization/i.test(contract.conditionalProviderRule),
      contract.requiredProviderAuthorizationGates.join(", "),
    ),
    check(
      "capture-blocked",
      "Contract does not authorize capture",
      /never authorizes payment capture/i.test(contract.captureRule) &&
        /payment-event/i.test(contract.captureRule),
      contract.captureRule,
    ),
    check(
      "privacy-boundary",
      "Contract keeps credentials, secrets, provider payloads, payment-method IDs, participant hashes, and reviewer notes private",
      /payment credentials/i.test(contract.privacyBoundary) &&
        /provider secrets/i.test(contract.privacyBoundary) &&
        /raw provider payloads/i.test(contract.privacyBoundary) &&
        /payment-method/i.test(contract.privacyBoundary) &&
        /participant identity hashes/i.test(contract.privacyBoundary) &&
        /reviewer notes/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "sample-evaluations",
      "Samples include passing stub, passing provider-authorization, and blocked capture paths",
      contract.sampleEvaluations.some(
        (sample) => sample.status === "pass" && sample.stubRecordCount > 0,
      ) &&
        contract.sampleEvaluations.some(
          (sample) => sample.status === "pass" && sample.providerAuthorizationCount > 0,
        ) &&
        contract.sampleEvaluations.some(
          (sample) => sample.status === "blocked" && sample.transition === "payment_capture",
        ),
      contract.sampleEvaluations
        .map((sample) => `${sample.transition}:${sample.status}:stub=${sample.stubRecordCount}:provider=${sample.providerAuthorizationCount}`)
        .join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-payment-authorization-contract",
    validatorVersion: MORAL_TRADE_PAYMENT_AUTHORIZATION_VALIDATOR_VERSION,
  };
}
