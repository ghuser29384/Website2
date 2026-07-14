export const MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_CONTRACT_VERSION =
  "moral-trade-provider-source-authentication-v0.1-2026-06";
export const MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_VALIDATOR_VERSION =
  "moral-trade-provider-source-authentication-validator-v0.1";

export type MoralTradeProviderSourceSubjectType =
  | "payment_webhook"
  | "third_party_evidence_feed"
  | "identity_check"
  | "payment_rail_check"
  | "destination_verification_feed"
  | "recipient_registry_feed"
  | "sanctions_screening_feed"
  | "manual_provider_attestation";

export type MoralTradeProviderStateChangeSurface =
  | "payment_capture"
  | "payout_release"
  | "evidence_acceptance"
  | "eligibility_approval"
  | "destination_verification"
  | "release_gate_promotion"
  | "marketplace_state_transition"
  | "public_metric_release";

export type MoralTradeProviderAuthenticationMethod =
  | "provider_signature"
  | "signed_api_response"
  | "manual_reviewer_attestation"
  | "test_mode_signature"
  | "none";

export type MoralTradeProviderSourcePolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeProviderSourceAuthenticationRecord {
  authenticatedAt: string | null;
  authenticationMethod: MoralTradeProviderAuthenticationMethod;
  downstreamStateEventRef: string | null;
  duplicateProviderEvent: boolean;
  endpointVerified: boolean;
  eventTypeAllowed: boolean;
  idempotencyKeyHash: string;
  manualReviewQueueRef: string | null;
  policySnapshotStatus: MoralTradeProviderSourcePolicySnapshotStatus;
  providerAccountRef: string;
  providerAccountVerified: boolean;
  providerEventIdHash: string;
  providerName: string;
  providerSourceAuthenticationPolicyRef: string;
  rawPayloadStored: boolean;
  receivedAt: string;
  replayWindowExpiresAt: string;
  replayWindowValid: boolean;
  signatureVerified: boolean;
  sourceAuthenticationRef: string;
  sourceEventHash: string;
  sourceEventRef: string;
  storedBeforeApply: boolean;
  subjectType: MoralTradeProviderSourceSubjectType;
  stateChangeSurface: MoralTradeProviderStateChangeSurface;
}

export interface MoralTradeProviderSourceAuthenticationEvaluationInput {
  checkedAt?: string;
  records: MoralTradeProviderSourceAuthenticationRecord[];
  requiredSubjectTypes?: MoralTradeProviderSourceSubjectType[];
}

export interface MoralTradeProviderSourceAuthenticationEvaluation {
  status: "pass" | "blocked";
  checkedAt: string;
  recordCount: number;
  applicableRecordCount: number;
  ignoredDuplicateCount: number;
  blockedRecordCount: number;
  stateMutationAllowed: boolean;
  coveredSubjectTypes: MoralTradeProviderSourceSubjectType[];
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeProviderSourceAuthenticationContract {
  version: typeof MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_CONTRACT_VERSION;
  purpose: string;
  failClosedRule: string;
  storageBeforeApplyRule: string;
  providerAuthenticationRule: string;
  replayRule: string;
  manualReviewRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  requiredSubjectTypes: MoralTradeProviderSourceSubjectType[];
  stateChangeSurfaces: MoralTradeProviderStateChangeSurface[];
  releaseGateTestHooks: string[];
  migrationNames: string[];
  contractTests: string[];
  sampleEvaluations: MoralTradeProviderSourceAuthenticationEvaluation[];
}

export interface MoralTradeProviderSourceAuthenticationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-provider-source-authentication-contract";
  validatorVersion: typeof MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

export const PROVIDER_SOURCE_AUTHENTICATION_REQUIRED_SUBJECT_TYPES = [
  "payment_webhook",
  "third_party_evidence_feed",
  "identity_check",
  "payment_rail_check",
  "destination_verification_feed",
] as const satisfies readonly MoralTradeProviderSourceSubjectType[];

const PROVIDER_SOURCE_AUTHENTICATION_SUBJECT_TYPES = [
  ...PROVIDER_SOURCE_AUTHENTICATION_REQUIRED_SUBJECT_TYPES,
  "recipient_registry_feed",
  "sanctions_screening_feed",
  "manual_provider_attestation",
] as const satisfies readonly MoralTradeProviderSourceSubjectType[];

const STATE_CHANGE_SURFACES = [
  "payment_capture",
  "payout_release",
  "evidence_acceptance",
  "eligibility_approval",
  "destination_verification",
  "release_gate_promotion",
  "marketplace_state_transition",
  "public_metric_release",
] as const satisfies readonly MoralTradeProviderStateChangeSurface[];

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_provider_source_authentication_records",
  "moral_trade_provider_source_authentication_manual_review_queue",
  "moral_trade_marketplace_state_events",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "provider_source_authentication",
  "time_authority",
  "state_interpretation",
] as const;

const RELEASE_GATE_TEST_HOOKS = [
  "provider_source_authentication_test",
  "payment_replay_tests",
  "privacy_preserving_verification_attestation_test",
] as const;

const CONTRACT_TESTS = [
  "provider_source_authentication_contract_validator",
  "provider_source_authentication_required_domains_test",
  "provider_source_authentication_fail_closed_inputs_test",
  "provider_source_authentication_duplicate_ignored_test",
  "provider_source_authentication_route_contract",
  "provider_source_authentication_migration_generalizes_table",
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

function isExpired(deadline: string, checkedAt: string) {
  if (!isIsoDate(deadline) || !isIsoDate(checkedAt)) {
    return true;
  }

  return Date.parse(deadline) <= Date.parse(checkedAt);
}

function uniqueSorted<T extends string>(values: T[]) {
  return Array.from(new Set(values)).sort() as T[];
}

function userFacingCategoryFor(blocker: string) {
  if (blocker.includes("subject_missing")) {
    return "Required provider source domain is missing";
  }

  if (
    blocker.includes("signature") ||
    blocker.includes("provider_account") ||
    blocker.includes("endpoint") ||
    blocker.includes("type_not_allowed")
  ) {
    return "Provider source could not be authenticated";
  }

  if (blocker.includes("replay_window") || blocker.includes("expired")) {
    return "Provider source replay window is not valid";
  }

  if (blocker.includes("raw_payload")) {
    return "Provider payload must stay private and minimized";
  }

  if (blocker.includes("state_event")) {
    return "Provider source cannot change state without an append-only state event";
  }

  if (blocker.includes("duplicate")) {
    return "Duplicate provider events are stored but ignored";
  }

  return "Provider source authentication is incomplete";
}

function normalizeCategories(blockers: readonly string[]) {
  return Array.from(new Set(blockers.map(userFacingCategoryFor))).sort();
}

function evaluateRecord(
  record: MoralTradeProviderSourceAuthenticationRecord,
  checkedAt: string,
) {
  const recordId = hasText(record.sourceAuthenticationRef)
    ? record.sourceAuthenticationRef
    : "unknown-provider-source";
  const blockers: string[] = [];

  if (!hasText(record.sourceAuthenticationRef)) {
    blockers.push("provider_source_authentication_ref_missing");
  }
  if (!hasText(record.providerSourceAuthenticationPolicyRef)) {
    blockers.push(`provider_source_policy_missing:${recordId}`);
  }
  if (record.policySnapshotStatus !== "resolved_immutable") {
    blockers.push(
      `provider_source_policy_not_immutable:${recordId}:${record.policySnapshotStatus}`,
    );
  }
  if (!hasText(record.providerName)) blockers.push(`provider_name_missing:${recordId}`);
  if (!hasText(record.providerAccountRef)) {
    blockers.push(`provider_account_ref_missing:${recordId}`);
  }
  if (!isHash(record.providerEventIdHash)) {
    blockers.push(`provider_event_hash_invalid:${recordId}`);
  }
  if (!isHash(record.idempotencyKeyHash)) {
    blockers.push(`provider_idempotency_hash_invalid:${recordId}`);
  }
  if (!isHash(record.sourceEventHash)) {
    blockers.push(`provider_source_event_hash_invalid:${recordId}`);
  }
  if (!isIsoDate(record.receivedAt)) {
    blockers.push(`provider_source_received_at_invalid:${recordId}`);
  }
  if (!isIsoDate(record.authenticatedAt)) {
    blockers.push(`provider_source_authenticated_at_missing:${recordId}`);
  }
  if (!isIsoDate(record.replayWindowExpiresAt)) {
    blockers.push(`provider_source_replay_window_missing:${recordId}`);
  } else if (isExpired(record.replayWindowExpiresAt, checkedAt)) {
    blockers.push(`provider_source_replay_window_expired:${recordId}`);
  }
  if (!record.storedBeforeApply) {
    blockers.push(`provider_source_not_stored_before_apply:${recordId}`);
  }
  if (record.rawPayloadStored) {
    blockers.push(`provider_source_raw_payload_stored:${recordId}`);
  }

  if (record.duplicateProviderEvent) {
    if (record.downstreamStateEventRef) {
      blockers.push(`provider_source_duplicate_state_event_attempt:${recordId}`);
    }

    return blockers;
  }

  if (record.authenticationMethod === "none") {
    blockers.push(`provider_source_authentication_method_missing:${recordId}`);
  }
  if (!record.signatureVerified) {
    blockers.push(`provider_source_signature_unverified:${recordId}`);
  }
  if (!record.providerAccountVerified) {
    blockers.push(`provider_source_provider_account_unverified:${recordId}`);
  }
  if (!record.endpointVerified) {
    blockers.push(`provider_source_endpoint_unverified:${recordId}`);
  }
  if (!record.eventTypeAllowed) {
    blockers.push(`provider_source_type_not_allowed:${recordId}`);
  }
  if (!record.replayWindowValid) {
    blockers.push(`provider_source_replay_window_invalid:${recordId}`);
  }
  if (!hasText(record.downstreamStateEventRef)) {
    blockers.push(`provider_source_state_event_missing:${recordId}`);
  }
  if (blockers.length > 0 && !hasText(record.manualReviewQueueRef)) {
    blockers.push(`provider_source_manual_review_missing:${recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeProviderSourceAuthentication(
  input: MoralTradeProviderSourceAuthenticationEvaluationInput,
): MoralTradeProviderSourceAuthenticationEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const requiredSubjectTypes =
    input.requiredSubjectTypes ?? [...PROVIDER_SOURCE_AUTHENTICATION_REQUIRED_SUBJECT_TYPES];
  const blockers: string[] = [];
  let blockedRecordCount = 0;
  const ignoredDuplicateCount = input.records.filter(
    (record) => record.duplicateProviderEvent,
  ).length;
  const coveredSubjectTypes = uniqueSorted(input.records.map((record) => record.subjectType));

  for (const subjectType of requiredSubjectTypes) {
    if (!coveredSubjectTypes.includes(subjectType)) {
      blockers.push(`provider_source_subject_missing:${subjectType}`);
    }
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord(record, checkedAt);

    if (recordBlockers.length > 0) {
      blockedRecordCount += 1;
      blockers.push(...recordBlockers);
    }
  }

  const uniqueBlockers = [...new Set(blockers)];

  return {
    applicableRecordCount: input.records.length - ignoredDuplicateCount,
    blockedRecordCount,
    blockers: uniqueBlockers,
    checkedAt,
    coveredSubjectTypes,
    ignoredDuplicateCount,
    recordCount: input.records.length,
    stateMutationAllowed: uniqueBlockers.length === 0 && input.records.length > ignoredDuplicateCount,
    status: uniqueBlockers.length ? "blocked" : "pass",
    userFacingBlockerCategories: normalizeCategories(uniqueBlockers),
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

function sampleRecord(
  subjectType: MoralTradeProviderSourceSubjectType,
  overrides: Partial<MoralTradeProviderSourceAuthenticationRecord> = {},
): MoralTradeProviderSourceAuthenticationRecord {
  return {
    authenticatedAt: "2026-06-30T08:00:00.000Z",
    authenticationMethod: "provider_signature",
    downstreamStateEventRef: `marketplace-state-event:${subjectType}`,
    duplicateProviderEvent: false,
    endpointVerified: true,
    eventTypeAllowed: true,
    idempotencyKeyHash: sampleHash(`${subjectType}:idempotency`),
    manualReviewQueueRef: null,
    policySnapshotStatus: "resolved_immutable",
    providerAccountRef: `provider-account:${subjectType}`,
    providerAccountVerified: true,
    providerEventIdHash: sampleHash(`${subjectType}:provider-event`),
    providerName: `provider:${subjectType}`,
    providerSourceAuthenticationPolicyRef: "provider-source-authentication-policy:v0.1",
    rawPayloadStored: false,
    receivedAt: "2026-06-30T07:59:00.000Z",
    replayWindowExpiresAt: "2026-06-30T08:05:00.000Z",
    replayWindowValid: true,
    signatureVerified: true,
    sourceAuthenticationRef: `provider-source-authentication:${subjectType}`,
    sourceEventHash: sampleHash(`${subjectType}:source-event`),
    sourceEventRef: `source-event:${subjectType}`,
    storedBeforeApply: true,
    subjectType,
    stateChangeSurface: "marketplace_state_transition",
    ...overrides,
  };
}

export function getMoralTradeProviderSourceAuthenticationContract(): MoralTradeProviderSourceAuthenticationContract {
  const passingSample = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: PROVIDER_SOURCE_AUTHENTICATION_REQUIRED_SUBJECT_TYPES.map((subjectType) =>
      sampleRecord(subjectType),
    ),
  });
  const blockedSample = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: [
      sampleRecord("third_party_evidence_feed", {
        authenticatedAt: null,
        downstreamStateEventRef: null,
        endpointVerified: false,
        manualReviewQueueRef: null,
        policySnapshotStatus: "stale",
        rawPayloadStored: true,
        replayWindowExpiresAt: "2026-06-30T07:00:00.000Z",
        replayWindowValid: false,
        signatureVerified: false,
      }),
    ],
  });
  const duplicateSample = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: [
      sampleRecord("payment_webhook", {
        downstreamStateEventRef: null,
        duplicateProviderEvent: true,
      }),
    ],
    requiredSubjectTypes: ["payment_webhook"],
  });

  return {
    contractTests: [...CONTRACT_TESTS],
    failClosedRule:
      "Provider webhooks, third-party evidence feeds, identity checks, payment-rail checks, and destination-verification feeds cannot trigger payment capture, payout release, evidence acceptance, eligibility approval, destination verification, release-gate promotion, public metrics, or marketplace state transitions unless a hash-backed provider_source_authentication record passes the frozen policy.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    manualReviewRule:
      "Unsigned, wrong-account, wrong-endpoint, stale, replayed, endpoint-mismatched, duplicate, or unallowed provider events may be stored for manual review, but they cannot mutate marketplace state or satisfy release gates.",
    migrationNames: [
      "20260630_moral_trade_provider_source_authentication_generalization.sql",
    ],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    privacyBoundary:
      "Public provider-source contracts expose source categories, table names, policy subjects, sample statuses, and fail-closed rules only; raw provider payloads, provider secrets, payment credentials, identity artifacts, private evidence, account bindings, reviewer notes, and participant-specific provider rows stay private.",
    providerAuthenticationRule:
      "Every non-duplicate provider source must verify signature or approved source proof, provider account binding, endpoint, event type, replay window, immutable policy snapshot, and server-side authentication time before any downstream state event can be accepted.",
    purpose:
      "Fail-closed provider source-authentication contract for moraltrade82 provider webhooks, evidence feeds, identity checks, payment-rail checks, and destination-verification feeds.",
    releaseGateTestHooks: [...RELEASE_GATE_TEST_HOOKS],
    replayRule:
      "Provider event IDs and idempotency hashes must be hash-backed; duplicate or expired provider events are recorded but ignored for state mutation.",
    requiredSubjectTypes: [...PROVIDER_SOURCE_AUTHENTICATION_REQUIRED_SUBJECT_TYPES],
    sampleEvaluations: [passingSample, blockedSample, duplicateSample],
    stateChangeSurfaces: [...STATE_CHANGE_SURFACES],
    storageBeforeApplyRule:
      "Provider sources must be stored before evaluation and downstream application; state changes require a separate append-only marketplace_state_event reference.",
    version: MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  pass: boolean,
  evidence: string,
): MoralTradeProviderSourceAuthenticationValidation["checks"][number] {
  return { id, label, status: pass ? "pass" : "fail", evidence };
}

function hasAll<T extends string>(values: readonly T[], required: readonly T[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateMoralTradeProviderSourceAuthenticationContract(
  contract = getMoralTradeProviderSourceAuthenticationContract(),
): MoralTradeProviderSourceAuthenticationValidation {
  const checks = [
    check(
      "first-class-records",
      "Contract names provider source-authentication records and manual-review queue",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "required-source-domains",
      "Contract covers payment, evidence, identity, payment-rail, and destination source domains",
      hasAll(
        contract.requiredSubjectTypes,
        PROVIDER_SOURCE_AUTHENTICATION_REQUIRED_SUBJECT_TYPES,
      ),
      contract.requiredSubjectTypes.join(", "),
    ),
    check(
      "state-change-surfaces",
      "Contract blocks all provider-driven state-change surfaces unless source authentication passes",
      hasAll(contract.stateChangeSurfaces, STATE_CHANGE_SURFACES) &&
        /payment capture, payout release, evidence acceptance, eligibility approval, destination verification, release-gate promotion/i.test(
          contract.failClosedRule,
        ),
      contract.failClosedRule,
    ),
    check(
      "provider-authentication-rule",
      "Contract requires signature/proof, account, endpoint, event type, replay, immutable policy, and server time",
      /provider account binding/i.test(contract.providerAuthenticationRule) &&
        /replay window/i.test(contract.providerAuthenticationRule) &&
        /server-side authentication time/i.test(contract.providerAuthenticationRule),
      contract.providerAuthenticationRule,
    ),
    check(
      "manual-review-rule",
      "Contract stores unauthenticated provider sources for review without state mutation",
      /stored for manual review/i.test(contract.manualReviewRule) &&
        /cannot mutate marketplace state/i.test(contract.manualReviewRule),
      contract.manualReviewRule,
    ),
    check(
      "privacy-boundary",
      "Contract excludes provider secrets, raw payloads, identity artifacts, private evidence, and participant rows",
      /raw provider payloads/i.test(contract.privacyBoundary) &&
        /provider secrets/i.test(contract.privacyBoundary) &&
        /identity artifacts/i.test(contract.privacyBoundary) &&
        /participant-specific provider rows/i.test(contract.privacyBoundary),
      contract.privacyBoundary,
    ),
    check(
      "release-gate-hooks",
      "Contract exposes release-gate hooks for provider-source authentication",
      RELEASE_GATE_TEST_HOOKS.every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "sample-evaluations",
      "Samples include passing, blocked, and ignored-duplicate paths",
      contract.sampleEvaluations.some((sample) => sample.status === "pass") &&
        contract.sampleEvaluations.some((sample) => sample.status === "blocked") &&
        contract.sampleEvaluations.some((sample) => sample.ignoredDuplicateCount > 0),
      contract.sampleEvaluations
        .map((sample) => `${sample.status}:${sample.ignoredDuplicateCount}`)
        .join(", "),
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
    validatorName: "moral-trade-provider-source-authentication-contract",
    validatorVersion: MORAL_TRADE_PROVIDER_SOURCE_AUTHENTICATION_VALIDATOR_VERSION,
  };
}
