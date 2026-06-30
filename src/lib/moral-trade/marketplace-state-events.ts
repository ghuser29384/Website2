export const MORAL_TRADE_MARKETPLACE_STATE_EVENT_CONTRACT_VERSION =
  "moral-trade-marketplace-state-events-v0.1-2026-06";
export const MORAL_TRADE_MARKETPLACE_STATE_EVENT_VALIDATOR_VERSION =
  "moral-trade-marketplace-state-event-validator-v0.1";

export type MoralTradeMarketplaceStateEventSubjectType =
  | "cleared_trade_agreement"
  | "payment_event"
  | "evidence_record"
  | "dispute_case"
  | "blocker_state";

export type MoralTradeMarketplaceStateEventTransition =
  | "agreement_state_change"
  | "payment_state_change"
  | "evidence_state_change"
  | "dispute_state_change"
  | "blocker_state_change"
  | "terminal_correction_recorded";

export interface MoralTradeMarketplaceStateEventRecord {
  appendOnlyRecord: boolean;
  correctionRecordRef: string | null;
  createdAt: string;
  eventHash: string;
  neutralReviewDecisionRef: string | null;
  nextState: string;
  parentDirectMutation: boolean;
  previousEventHash: string | null;
  previousState: string;
  stateEventRef: string;
  subjectRef: string;
  subjectType: MoralTradeMarketplaceStateEventSubjectType;
  supersedesStateEventRef: string | null;
  transactionGroupRef: string;
  transition: MoralTradeMarketplaceStateEventTransition;
}

export interface MoralTradeMarketplaceStateEventEvaluationInput {
  checkedAt?: string;
  events: MoralTradeMarketplaceStateEventRecord[];
  requiredSubjectTypes?: MoralTradeMarketplaceStateEventSubjectType[];
}

export interface MoralTradeMarketplaceStateEventEvaluation {
  status: "pass" | "blocked";
  checkedAt: string;
  eventCount: number;
  coveredSubjectTypes: MoralTradeMarketplaceStateEventSubjectType[];
  blockedEventCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeMarketplaceStateEventContract {
  version: typeof MORAL_TRADE_MARKETPLACE_STATE_EVENT_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  appendOnlyRule: string;
  terminalStateRule: string;
  eventDomainRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  requiredSubjectTypes: MoralTradeMarketplaceStateEventSubjectType[];
  transitionMap: Record<
    MoralTradeMarketplaceStateEventSubjectType,
    MoralTradeMarketplaceStateEventTransition
  >;
  terminalStates: string[];
  migrationNames: string[];
  releaseGateTestHooks: string[];
  contractTests: string[];
  sampleEvaluations: MoralTradeMarketplaceStateEventEvaluation[];
}

export interface MoralTradeMarketplaceStateEventValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-marketplace-state-event-contract";
  validatorVersion: typeof MORAL_TRADE_MARKETPLACE_STATE_EVENT_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_MARKETPLACE_STATE_EVENT_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

export const MARKETPLACE_STATE_EVENT_SUBJECT_TYPES = [
  "cleared_trade_agreement",
  "payment_event",
  "evidence_record",
  "dispute_case",
  "blocker_state",
] as const satisfies readonly MoralTradeMarketplaceStateEventSubjectType[];

export const MARKETPLACE_STATE_EVENT_TRANSITION_MAP = {
  blocker_state: "blocker_state_change",
  cleared_trade_agreement: "agreement_state_change",
  dispute_case: "dispute_state_change",
  evidence_record: "evidence_state_change",
  payment_event: "payment_state_change",
} as const satisfies Record<
  MoralTradeMarketplaceStateEventSubjectType,
  MoralTradeMarketplaceStateEventTransition
>;

const TERMINAL_STATES = [
  "cancelled",
  "completed",
  "corrected",
  "refunded",
  "released",
  "revoked",
  "settled",
  "superseded",
  "terminal",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "marketplace_state_event_append_only",
  "marketplace_state_event_terminal_no_reopen",
  "marketplace_state_event_all_domains",
] as const;

const CONTRACT_TESTS = [
  "agreement_payment_evidence_dispute_blocker_events_required",
  "terminal_state_reopen_blocks",
  "append_only_parent_mutation_blocks",
  "marketplace_state_event_route_safe_public_metadata",
  "marketplace_state_event_migration_generalizes_table",
] as const;

const FIRST_CLASS_RECORD_TABLES = ["moral_trade_marketplace_state_events"] as const;

function isTerminalState(state: string) {
  return TERMINAL_STATES.includes(state as (typeof TERMINAL_STATES)[number]);
}

function userFacingCategoryFor(blocker: string) {
  if (blocker.includes("terminal_reopen")) {
    return "Terminal records cannot be silently reopened";
  }

  if (blocker.includes("parent_direct_mutation") || blocker.includes("append_only")) {
    return "State changes require append-only marketplace events";
  }

  if (blocker.includes("subject_missing")) {
    return "Required state-change domain is missing";
  }

  if (blocker.includes("transition_mismatch")) {
    return "State-change transition does not match its domain";
  }

  if (blocker.includes("transaction_group")) {
    return "State changes require transactional grouping";
  }

  return "Marketplace state-event record is incomplete";
}

function normalizeCategories(blockers: readonly string[]) {
  return Array.from(new Set(blockers.map(userFacingCategoryFor))).sort();
}

export function evaluateMoralTradeMarketplaceStateEvents(
  input: MoralTradeMarketplaceStateEventEvaluationInput,
): MoralTradeMarketplaceStateEventEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const requiredSubjectTypes =
    input.requiredSubjectTypes ?? [...MARKETPLACE_STATE_EVENT_SUBJECT_TYPES];
  const blockers: string[] = [];
  const coveredSubjectTypes = Array.from(
    new Set(input.events.map((event) => event.subjectType)),
  ).sort() as MoralTradeMarketplaceStateEventSubjectType[];
  let blockedEventCount = 0;

  for (const subjectType of requiredSubjectTypes) {
    if (!coveredSubjectTypes.includes(subjectType)) {
      blockers.push(`marketplace_state_event_subject_missing:${subjectType}`);
    }
  }

  for (const event of input.events) {
    const eventBlockerCount = blockers.length;
    const expectedTransition =
      event.transition === "terminal_correction_recorded"
        ? "terminal_correction_recorded"
        : MARKETPLACE_STATE_EVENT_TRANSITION_MAP[event.subjectType];

    if (!event.stateEventRef) {
      blockers.push(`marketplace_state_event_ref_missing:${event.subjectRef}`);
    }

    if (!event.subjectRef) {
      blockers.push(`marketplace_state_event_subject_ref_missing:${event.stateEventRef}`);
    }

    if (event.transition !== expectedTransition) {
      blockers.push(
        `marketplace_state_event_transition_mismatch:${event.stateEventRef}:${event.transition}`,
      );
    }

    if (!HASH_PATTERN.test(event.eventHash)) {
      blockers.push(`marketplace_state_event_hash_invalid:${event.stateEventRef}`);
    }

    if (event.previousEventHash && !HASH_PATTERN.test(event.previousEventHash)) {
      blockers.push(`marketplace_state_event_previous_hash_invalid:${event.stateEventRef}`);
    }

    if (!event.transactionGroupRef) {
      blockers.push(`marketplace_state_event_transaction_group_missing:${event.stateEventRef}`);
    }

    if (!event.appendOnlyRecord) {
      blockers.push(`marketplace_state_event_append_only_missing:${event.stateEventRef}`);
    }

    if (event.parentDirectMutation) {
      blockers.push(`marketplace_state_event_parent_direct_mutation:${event.stateEventRef}`);
    }

    if (isTerminalState(event.previousState) && !isTerminalState(event.nextState)) {
      blockers.push(
        `marketplace_state_event_terminal_reopen_blocked:${event.stateEventRef}:${event.previousState}:${event.nextState}`,
      );
    }

    if (
      event.transition === "terminal_correction_recorded" &&
      (!event.correctionRecordRef ||
        !event.neutralReviewDecisionRef ||
        !event.supersedesStateEventRef)
    ) {
      blockers.push(`marketplace_state_event_terminal_correction_incomplete:${event.stateEventRef}`);
    }

    if (blockers.length > eventBlockerCount) {
      blockedEventCount += 1;
    }
  }

  return {
    blockedEventCount,
    blockers,
    checkedAt,
    coveredSubjectTypes,
    eventCount: input.events.length,
    status: blockers.length ? "blocked" : "pass",
    userFacingBlockerCategories: normalizeCategories(blockers),
  };
}

function sampleHash(seed: string) {
  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0")
    .slice(0, 64);

  return `sha256:${hex}`;
}

function sampleEvent(
  subjectType: MoralTradeMarketplaceStateEventSubjectType,
  overrides: Partial<MoralTradeMarketplaceStateEventRecord> = {},
): MoralTradeMarketplaceStateEventRecord {
  return {
    appendOnlyRecord: true,
    correctionRecordRef: null,
    createdAt: "2026-06-30T07:00:00.000Z",
    eventHash: sampleHash(subjectType),
    neutralReviewDecisionRef: null,
    nextState: "under_review",
    parentDirectMutation: false,
    previousEventHash: sampleHash(`${subjectType}:previous`),
    previousState: "draft",
    stateEventRef: `marketplace-state-event:${subjectType}`,
    subjectRef: `${subjectType}:demo`,
    subjectType,
    supersedesStateEventRef: null,
    transactionGroupRef: `transaction-group:${subjectType}`,
    transition: MARKETPLACE_STATE_EVENT_TRANSITION_MAP[subjectType],
    ...overrides,
  };
}

export function getMoralTradeMarketplaceStateEventContract(): MoralTradeMarketplaceStateEventContract {
  const passingSample = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: MARKETPLACE_STATE_EVENT_SUBJECT_TYPES.map((subjectType) => sampleEvent(subjectType)),
  });
  const blockedSample = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: [
      sampleEvent("cleared_trade_agreement", {
        appendOnlyRecord: false,
        nextState: "active",
        parentDirectMutation: true,
        previousState: "terminal",
        transactionGroupRef: "",
      }),
    ],
  });
  const correctionSample = evaluateMoralTradeMarketplaceStateEvents({
    checkedAt: "2026-06-30T07:00:00.000Z",
    events: [
      sampleEvent("dispute_case", {
        correctionRecordRef: "correction:terminal-dispute",
        neutralReviewDecisionRef: "review:neutral-terminal-correction",
        nextState: "corrected",
        previousState: "terminal",
        supersedesStateEventRef: "marketplace-state-event:dispute_case:old",
        transition: "terminal_correction_recorded",
      }),
    ],
    requiredSubjectTypes: ["dispute_case"],
  });

  return {
    appendOnlyRule:
      "Agreement, payment, evidence, dispute, and blocker state changes must be recorded as append-only marketplace_state_event rows; parent records cannot be directly edited to create state.",
    contractTests: [...CONTRACT_TESTS],
    eventDomainRule:
      "Marketplace state events cover cleared_trade_agreement, payment_event, evidence_record, dispute_case, and blocker_state domains with a domain-specific transition name.",
    failClosedRule:
      "MoralTrade cannot rely on agreement, payment, evidence, dispute, or blocker state changes unless the change is represented by a hash-backed append-only marketplace_state_event with a transaction group.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    migrationNames: ["20260630_moral_trade_marketplace_state_events_generalization.sql"],
    privacyBoundary:
      "Public state-event contracts expose table names, state categories, transition domains, and sample statuses only; they never expose private term sheets, raw evidence, counterparty data, exact caps, private surplus, payment credentials, reviewer notes, or participant-specific state rows.",
    purpose:
      "Fail-closed marketplace state-event contract for moraltrade82 append-only agreement, payment, evidence, dispute, and blocker transitions.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    requiredSubjectTypes: [...MARKETPLACE_STATE_EVENT_SUBJECT_TYPES],
    sampleEvaluations: [passingSample, blockedSample, correctionSample],
    terminalStateRule:
      "Terminal, completed, settled, cancelled, refunded, released, revoked, superseded, or corrected states cannot be silently reopened; corrections require a new terminal_correction_recorded event, supersession reference, correction record, and neutral review decision.",
    terminalStates: [...TERMINAL_STATES],
    transitionMap: { ...MARKETPLACE_STATE_EVENT_TRANSITION_MAP },
    version: MORAL_TRADE_MARKETPLACE_STATE_EVENT_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradeMarketplaceStateEventValidation["checks"][number] {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

export function validateMoralTradeMarketplaceStateEventContract(
  contract = getMoralTradeMarketplaceStateEventContract(),
): MoralTradeMarketplaceStateEventValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names the append-only marketplace state-event table",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "all-required-domains",
      "Contract covers agreement, payment, evidence, dispute, and blocker state changes",
      MARKETPLACE_STATE_EVENT_SUBJECT_TYPES.every((subjectType) =>
        contract.requiredSubjectTypes.includes(subjectType),
      ),
      contract.requiredSubjectTypes.join(", "),
    ),
    check(
      "append-only-rule",
      "Contract requires append-only rows and blocks parent direct mutation",
      /append-only marketplace_state_event/i.test(contract.appendOnlyRule) &&
        /parent records cannot be directly edited/i.test(contract.appendOnlyRule),
      contract.appendOnlyRule,
    ),
    check(
      "terminal-state-rule",
      "Contract blocks silent terminal-state reopen and requires correction records",
      /cannot be silently reopened/i.test(contract.terminalStateRule) &&
        /terminal_correction_recorded/i.test(contract.terminalStateRule) &&
        /neutral review decision/i.test(contract.terminalStateRule),
      contract.terminalStateRule,
    ),
    check(
      "privacy-boundary",
      "Contract excludes private participant and evidence fields",
      /raw evidence/i.test(contract.privacyBoundary) &&
        /private term sheets/i.test(contract.privacyBoundary) &&
        /participant-specific state rows/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "release-gate-hooks",
      "Contract exposes moraltrade82 state-event release-gate hooks",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "sample-evaluations",
      "Samples include passing, blocked, and terminal-correction paths",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked") &&
        contract.sampleEvaluations.some(
          (sample) =>
            sample.status === "pass" &&
            sample.coveredSubjectTypes.includes("dispute_case"),
        ),
      contract.sampleEvaluations.map((sample) => sample.status).join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-marketplace-state-event-contract",
    validatorVersion: MORAL_TRADE_MARKETPLACE_STATE_EVENT_VALIDATOR_VERSION,
  };
}
