export const MORAL_TRADE_PAYMENT_EVENT_CONTRACT_VERSION =
  "moral-trade-payment-events-v0.1-2026-06";
export const MORAL_TRADE_PAYMENT_EVENT_VALIDATOR_VERSION =
  "moral-trade-payment-event-validator-v0.1";

export type MoralTradePaymentEventTransition =
  | "authorization"
  | "capture"
  | "cancellation"
  | "refund"
  | "payout_release";

export type MoralTradePaymentProvider =
  | "stripe"
  | "every_org"
  | "manual_evidence"
  | "test_provider";

export type MoralTradePaymentAgreementState =
  | "locked"
  | "authorized"
  | "captured"
  | "cancelled"
  | "refunded"
  | "released"
  | "disputed"
  | "terminal";

export type MoralTradePaymentPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradePaymentProviderSourceAuthentication {
  providerSourceAuthenticationPolicyRef: string;
  policySnapshotStatus: MoralTradePaymentPolicySnapshotStatus;
  signatureVerified: boolean;
  providerAccountVerified: boolean;
  endpointVerified: boolean;
  eventTypeAllowed: boolean;
  replayWindowValid: boolean;
  authenticatedAt: string | null;
}

export interface MoralTradePaymentEventRecord {
  deliveryId: string;
  provider: MoralTradePaymentProvider;
  providerEventIdHash: string;
  idempotencyKeyHash: string;
  transition: MoralTradePaymentEventTransition;
  eventType: string;
  receivedAt: string;
  storedBeforeApply: boolean;
  duplicateProviderEvent: boolean;
  duplicateIdempotencyKey: boolean;
  sourceAuthentication: MoralTradePaymentProviderSourceAuthentication;
  lockedAgreementRef: string | null;
  lockedTermsSnapshotHash: string;
  referencedTermsSnapshotHash: string;
  lockedParticipantConfirmationHash: string;
  referencedParticipantConfirmationHash: string;
  agreementState: MoralTradePaymentAgreementState;
  serverDeadlineAt: string;
  impossibleTransition: boolean;
  databaseTransactionUsed: boolean;
  marketplaceStateEventRef: string | null;
  manualReviewQueueRef: string | null;
}

export interface MoralTradePaymentEventEvaluationInput {
  transition: MoralTradePaymentEventTransition;
  checkedAt?: string;
  providerEventRequired: boolean;
  events: MoralTradePaymentEventRecord[];
}

export interface MoralTradePaymentEventEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePaymentEventTransition;
  checkedAt: string;
  eventCount: number;
  applicableEventCount: number;
  ignoredDuplicateCount: number;
  blockedEventCount: number;
  stateMutationAllowed: boolean;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePaymentEventContract {
  version: typeof MORAL_TRADE_PAYMENT_EVENT_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  storageBeforeApplyRule: string;
  idempotencyRule: string;
  providerAuthenticationRule: string;
  lockedSnapshotRule: string;
  manualReviewRule: string;
  transactionRule: string;
  nonEscrowClaim: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  releaseGateTestHooks: string[];
  transitions: MoralTradePaymentEventTransition[];
  terminalAgreementStates: MoralTradePaymentAgreementState[];
  contractTests: string[];
  sampleEvaluations: MoralTradePaymentEventEvaluation[];
}

export interface MoralTradePaymentEventValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-payment-event-contract";
  validatorVersion: typeof MORAL_TRADE_PAYMENT_EVENT_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_PAYMENT_EVENT_CONTRACT_VERSION;
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
  "moral_trade_payment_event_deliveries",
  "moral_trade_payment_transition_attempts",
  "moral_trade_provider_source_authentication_records",
  "moral_trade_marketplace_state_events",
  "moral_trade_payment_manual_review_queue",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "provider_source_authentication",
  "payment_capture",
  "payout_release",
  "refund_cancellation",
  "time_authority",
  "privileged_action",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "payment_replay_tests",
] as const;

const CONTRACT_TESTS = [
  "payment_event_contract_validator",
  "payment_event_stored_before_apply_test",
  "payment_event_provider_authentication_test",
  "payment_event_duplicate_ignored_test",
  "payment_event_locked_snapshot_hash_test",
  "payment_event_transaction_state_event_test",
  "payment_event_route_contract",
] as const;

const TERMINAL_AGREEMENT_STATES: MoralTradePaymentAgreementState[] = [
  "cancelled",
  "refunded",
  "released",
  "terminal",
];

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

function isTerminalAgreementState(state: MoralTradePaymentAgreementState) {
  return TERMINAL_AGREEMENT_STATES.includes(state);
}

function isDuplicate(event: MoralTradePaymentEventRecord) {
  return event.duplicateProviderEvent || event.duplicateIdempotencyKey;
}

function validateSourceAuthentication(event: MoralTradePaymentEventRecord) {
  const eventId = hasText(event.deliveryId) ? event.deliveryId : "unknown-event";
  const auth = event.sourceAuthentication;
  const blockers: string[] = [];

  if (!hasText(auth.providerSourceAuthenticationPolicyRef)) {
    blockers.push(`payment_event_provider_policy_missing:${eventId}`);
  }
  if (auth.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(`payment_event_provider_policy_not_immutable:${eventId}:${auth.policySnapshotStatus}`);
  }
  if (!auth.signatureVerified) blockers.push(`payment_event_signature_unverified:${eventId}`);
  if (!auth.providerAccountVerified) {
    blockers.push(`payment_event_provider_account_unverified:${eventId}`);
  }
  if (!auth.endpointVerified) blockers.push(`payment_event_endpoint_unverified:${eventId}`);
  if (!auth.eventTypeAllowed) blockers.push(`payment_event_type_not_allowed:${eventId}`);
  if (!auth.replayWindowValid) blockers.push(`payment_event_replay_window_invalid:${eventId}`);
  if (!isIsoDate(auth.authenticatedAt)) {
    blockers.push(`payment_event_authenticated_at_missing:${eventId}`);
  }

  return blockers;
}

function evaluatePaymentEvent(
  event: MoralTradePaymentEventRecord,
  transition: MoralTradePaymentEventTransition,
  checkedAt: string,
) {
  const eventId = hasText(event.deliveryId) ? event.deliveryId : "unknown-event";
  const blockers: string[] = [];

  if (!hasText(event.deliveryId)) blockers.push("payment_event_delivery_id_missing");
  if (!isHash(event.providerEventIdHash)) {
    blockers.push(`payment_event_provider_event_hash_invalid:${eventId}`);
  }
  if (!isHash(event.idempotencyKeyHash)) {
    blockers.push(`payment_event_idempotency_hash_invalid:${eventId}`);
  }
  if (!hasText(event.eventType)) blockers.push(`payment_event_type_missing:${eventId}`);
  if (!isIsoDate(event.receivedAt)) blockers.push(`payment_event_received_at_invalid:${eventId}`);
  if (!event.storedBeforeApply) {
    blockers.push(`payment_event_not_stored_before_apply:${eventId}`);
  }

  if (event.transition !== transition) {
    blockers.push(`payment_event_transition_mismatch:${eventId}:${event.transition}`);
  }

  if (isDuplicate(event)) {
    return blockers;
  }

  blockers.push(...validateSourceAuthentication(event));

  if (!hasText(event.lockedAgreementRef)) {
    blockers.push(`payment_event_locked_agreement_missing:${eventId}`);
  }
  if (!isHash(event.lockedTermsSnapshotHash) || !isHash(event.referencedTermsSnapshotHash)) {
    blockers.push(`payment_event_terms_snapshot_hash_invalid:${eventId}`);
  } else if (event.lockedTermsSnapshotHash !== event.referencedTermsSnapshotHash) {
    blockers.push(`payment_event_terms_snapshot_mismatch:${eventId}`);
  }
  if (
    !isHash(event.lockedParticipantConfirmationHash) ||
    !isHash(event.referencedParticipantConfirmationHash)
  ) {
    blockers.push(`payment_event_confirmation_hash_invalid:${eventId}`);
  } else if (
    event.lockedParticipantConfirmationHash !== event.referencedParticipantConfirmationHash
  ) {
    blockers.push(`payment_event_confirmation_hash_mismatch:${eventId}`);
  }
  if (isTerminalAgreementState(event.agreementState)) {
    blockers.push(`payment_event_terminal_agreement:${eventId}:${event.agreementState}`);
  }
  if (!isIsoDate(event.serverDeadlineAt)) {
    blockers.push(`payment_event_deadline_invalid:${eventId}`);
  } else if (Date.parse(event.serverDeadlineAt) < Date.parse(checkedAt)) {
    blockers.push(`payment_event_deadline_expired:${eventId}`);
  }
  if (event.impossibleTransition) {
    blockers.push(`payment_event_impossible_transition:${eventId}`);
  }
  if (!event.databaseTransactionUsed) {
    blockers.push(`payment_event_database_transaction_missing:${eventId}`);
  }
  if (!hasText(event.marketplaceStateEventRef)) {
    blockers.push(`payment_event_marketplace_state_event_missing:${eventId}`);
  }
  if (blockers.length > 0 && !hasText(event.manualReviewQueueRef)) {
    blockers.push(`payment_event_manual_review_queue_missing:${eventId}`);
  }

  return blockers;
}

function categoryForBlocker(blocker: string) {
  if (blocker.includes("duplicate")) return "Duplicate provider event is ignored";
  if (blocker.includes("stored_before_apply")) return "Provider event was not stored before application";
  if (
    blocker.includes("signature") ||
    blocker.includes("provider_account") ||
    blocker.includes("endpoint") ||
    blocker.includes("replay_window") ||
    blocker.includes("provider_policy")
  ) {
    return "Provider source authentication is incomplete";
  }
  if (blocker.includes("terms_snapshot") || blocker.includes("confirmation_hash")) {
    return "Payment event does not match locked terms and participant confirmation";
  }
  if (
    blocker.includes("terminal") ||
    blocker.includes("deadline") ||
    blocker.includes("impossible_transition")
  ) {
    return "Payment event cannot apply to the current agreement state";
  }
  if (blocker.includes("database_transaction") || blocker.includes("marketplace_state_event")) {
    return "Payment state change is not transactionally audited";
  }
  if (blocker.includes("manual_review_queue")) {
    return "Blocked payment event is not routed to manual review";
  }

  return "Payment event is incomplete";
}

function sampleHash(seed: string) {
  return `sha256:${seed.padEnd(64, "0").slice(0, 64)}`;
}

function sampleEvent(
  overrides: Partial<MoralTradePaymentEventRecord> = {},
): MoralTradePaymentEventRecord {
  return {
    agreementState: "locked",
    databaseTransactionUsed: true,
    deliveryId: "payment-event-delivery:demo",
    duplicateIdempotencyKey: false,
    duplicateProviderEvent: false,
    eventType: "payment_intent.succeeded",
    idempotencyKeyHash: sampleHash("2"),
    lockedAgreementRef: "agreement:locked-demo",
    lockedParticipantConfirmationHash: sampleHash("3"),
    lockedTermsSnapshotHash: sampleHash("1"),
    manualReviewQueueRef: null,
    marketplaceStateEventRef: "marketplace-state-event:payment-capture-demo",
    provider: "stripe",
    providerEventIdHash: sampleHash("4"),
    receivedAt: "2026-06-25T12:00:00.000Z",
    referencedParticipantConfirmationHash: sampleHash("3"),
    referencedTermsSnapshotHash: sampleHash("1"),
    serverDeadlineAt: "2026-06-25T12:10:00.000Z",
    sourceAuthentication: {
      authenticatedAt: "2026-06-25T12:00:01.000Z",
      endpointVerified: true,
      eventTypeAllowed: true,
      policySnapshotStatus: "resolved_immutable",
      providerAccountVerified: true,
      providerSourceAuthenticationPolicyRef: "policy:provider-source-authentication:v1",
      replayWindowValid: true,
      signatureVerified: true,
    },
    storedBeforeApply: true,
    transition: "capture",
    impossibleTransition: false,
    ...overrides,
  };
}

function sampleInput(
  overrides: Partial<MoralTradePaymentEventEvaluationInput> = {},
): MoralTradePaymentEventEvaluationInput {
  return {
    checkedAt: "2026-06-25T12:05:00.000Z",
    events: [sampleEvent()],
    providerEventRequired: true,
    transition: "capture",
    ...overrides,
  };
}

export function evaluateMoralTradePaymentEvents(
  input: MoralTradePaymentEventEvaluationInput,
): MoralTradePaymentEventEvaluation {
  const checkedAt = input.checkedAt || new Date().toISOString();
  const transition = input.transition || "capture";
  const blockers: string[] = [];

  if (input.providerEventRequired && input.events.length === 0) {
    blockers.push("payment_event_records_missing");
  }

  let applicableEventCount = 0;
  let ignoredDuplicateCount = 0;
  let blockedEventCount = 0;
  for (const event of input.events) {
    const eventBlockers = evaluatePaymentEvent(event, transition, checkedAt);
    blockers.push(...eventBlockers);
    if (isDuplicate(event)) {
      ignoredDuplicateCount += 1;
    } else {
      applicableEventCount += 1;
      if (eventBlockers.length > 0) {
        blockedEventCount += 1;
      }
    }
  }

  const uniqueBlockers = unique(blockers);

  return {
    applicableEventCount,
    blockedEventCount,
    blockers: uniqueBlockers,
    checkedAt,
    eventCount: input.events.length,
    ignoredDuplicateCount,
    stateMutationAllowed:
      uniqueBlockers.length === 0 && applicableEventCount > 0 && ignoredDuplicateCount === 0,
    status: uniqueBlockers.length === 0 ? "pass" : "blocked",
    transition,
    userFacingBlockerCategories: unique(uniqueBlockers.map(categoryForBlocker)),
  };
}

export function getMoralTradePaymentEventContract(): MoralTradePaymentEventContract {
  const passingSample = evaluateMoralTradePaymentEvents(sampleInput());
  const duplicateSample = evaluateMoralTradePaymentEvents(
    sampleInput({
      events: [
        sampleEvent({
          duplicateIdempotencyKey: true,
          duplicateProviderEvent: true,
          marketplaceStateEventRef: null,
        }),
      ],
    }),
  );
  const blockedSample = evaluateMoralTradePaymentEvents(
    sampleInput({
      events: [
        sampleEvent({
          agreementState: "terminal",
          databaseTransactionUsed: false,
          manualReviewQueueRef: null,
          marketplaceStateEventRef: null,
          referencedParticipantConfirmationHash: sampleHash("5"),
          referencedTermsSnapshotHash: sampleHash("6"),
          serverDeadlineAt: "2026-06-25T11:00:00.000Z",
          sourceAuthentication: {
            ...sampleEvent().sourceAuthentication,
            replayWindowValid: false,
            signatureVerified: false,
          },
          storedBeforeApply: false,
        }),
      ],
    }),
  );

  return {
    contractTests: [...CONTRACT_TESTS],
    failClosedRule:
      "MoralTrade cannot authorize, capture, cancel, refund, release payout, publish payment-backed metrics, or promote release gates from a provider event unless the event delivery is stored first, authenticated, deduped, matched to locked terms and participant confirmation hashes, and applied transactionally with an append-only marketplace_state_event.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    idempotencyRule:
      "Every authorization, capture, cancellation, refund, and payout-release attempt uses an idempotency key hash; duplicate provider event IDs or idempotency keys are stored as deliveries but ignored for state mutation.",
    lockedSnapshotRule:
      "A provider event can affect state only when the referenced terms snapshot and participant confirmation hash exactly match the locked agreement.",
    manualReviewRule:
      "Stale previews, changed terms, terminal agreements, failed source authentication, expired server deadlines, impossible transitions, or unaudited state writes route to manual review before any further payment state change.",
    nonEscrowClaim:
      "This replay-safety contract is not a legal escrow, custody, tax, investment, or impact claim.",
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    providerAuthenticationRule:
      "Provider source authentication requires immutable policy, verified signature, provider account, endpoint, event type, and replay window before an event can affect state.",
    purpose:
      "Fail-closed provider payment-event contract for moraltrade82 idempotent, replay-safe payment state transitions.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    sampleEvaluations: [passingSample, duplicateSample, blockedSample],
    storageBeforeApplyRule:
      "Every provider webhook delivery is stored before application, including duplicate deliveries that are later ignored.",
    terminalAgreementStates: [...TERMINAL_AGREEMENT_STATES],
    transactionRule:
      "Capture and payout-release state changes must run in a database transaction that writes a marketplace_state_event in the same operation.",
    transitions: ["authorization", "capture", "cancellation", "refund", "payout_release"],
    version: MORAL_TRADE_PAYMENT_EVENT_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradePaymentEventValidation["checks"][number] {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

export function validateMoralTradePaymentEventContract(
  contract = getMoralTradePaymentEventContract(),
): MoralTradePaymentEventValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names delivery, attempt, authentication, state-event, and manual-review tables",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "release-gate-hook",
      "Contract exposes the moraltrade82 payment replay release-gate hook",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "storage-before-apply",
      "Contract requires provider webhook storage before application",
      /stored before application/i.test(contract.storageBeforeApplyRule),
      contract.storageBeforeApplyRule,
    ),
    check(
      "idempotency-rule",
      "Contract stores duplicate deliveries but ignores duplicate event/idempotency keys",
      /idempotency key/i.test(contract.idempotencyRule) &&
        /stored as deliveries but ignored/i.test(contract.idempotencyRule),
      contract.idempotencyRule,
    ),
    check(
      "provider-authentication-rule",
      "Contract requires signature, account, endpoint, event-type, and replay-window authentication",
      /verified signature/i.test(contract.providerAuthenticationRule) &&
        /provider account/i.test(contract.providerAuthenticationRule) &&
        /endpoint/i.test(contract.providerAuthenticationRule) &&
        /replay window/i.test(contract.providerAuthenticationRule),
      contract.providerAuthenticationRule,
    ),
    check(
      "locked-snapshot-rule",
      "Contract requires terms snapshot and participant confirmation hash match",
      /terms snapshot/i.test(contract.lockedSnapshotRule) &&
        /participant confirmation hash/i.test(contract.lockedSnapshotRule),
      contract.lockedSnapshotRule,
    ),
    check(
      "transaction-rule",
      "Contract requires transactionally written marketplace state events",
      /database transaction/i.test(contract.transactionRule) &&
        /marketplace_state_event/i.test(contract.transactionRule),
      contract.transactionRule,
    ),
    check(
      "manual-review-rule",
      "Contract routes stale, changed, terminal, failed-auth, expired, and impossible events to manual review",
      /stale previews/i.test(contract.manualReviewRule) &&
        /changed terms/i.test(contract.manualReviewRule) &&
        /terminal agreements/i.test(contract.manualReviewRule) &&
        /failed source authentication/i.test(contract.manualReviewRule) &&
        /expired server deadlines/i.test(contract.manualReviewRule) &&
        /impossible transitions/i.test(contract.manualReviewRule),
      contract.manualReviewRule,
    ),
    check(
      "non-escrow-claim",
      "Contract explicitly does not claim legal escrow or custody",
      /not a legal escrow/i.test(contract.nonEscrowClaim) &&
        /custody/i.test(contract.nonEscrowClaim),
      contract.nonEscrowClaim,
    ),
    check(
      "sample-evaluations",
      "Samples include applying, duplicate-ignored, and blocked paths",
      contract.sampleEvaluations.some(
        (sample) => sample.status === "pass" && sample.stateMutationAllowed,
      ) &&
        contract.sampleEvaluations.some(
          (sample) => sample.status === "pass" && sample.ignoredDuplicateCount > 0,
        ) &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked"),
      contract.sampleEvaluations
        .map(
          (sample) =>
            `${sample.transition}:${sample.status}:duplicates=${sample.ignoredDuplicateCount}:mutates=${sample.stateMutationAllowed}`,
        )
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
    validatorName: "moral-trade-payment-event-contract",
    validatorVersion: MORAL_TRADE_PAYMENT_EVENT_VALIDATOR_VERSION,
  };
}
