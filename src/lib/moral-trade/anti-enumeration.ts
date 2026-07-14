export const MORAL_TRADE_ANTI_ENUMERATION_CONTRACT_VERSION =
  "moral-trade-anti-enumeration-v0.1-2026-06";
export const MORAL_TRADE_ANTI_ENUMERATION_VALIDATOR_VERSION =
  "moral-trade-anti-enumeration-validator-v0.1";

export type MoralTradeAntiEnumerationSurface =
  | "public_search"
  | "signed_in_search"
  | "public_browse"
  | "preview_generation"
  | "invite_link_creation"
  | "match_candidate_browsing"
  | "transparency_report";

export type MoralTradeAntiEnumerationStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeAntiEnumerationPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeDiscoveryResultCountBucket =
  | "zero"
  | "one_or_two_suppressed"
  | "three_to_nine"
  | "ten_to_forty_nine"
  | "fifty_plus"
  | "not_returned";

export type MoralTradeAntiEnumerationFailClosedStatus =
  | "policy_missing"
  | "policy_mutable"
  | "policy_stale"
  | "policy_superseded"
  | "access_event_missing"
  | "access_event_stale"
  | "access_event_superseded"
  | "query_fingerprint_missing"
  | "raw_query_logged"
  | "exact_result_count_exposed"
  | "bucketed_result_count_missing"
  | "sparse_suppression_missing"
  | "timing_equalization_missing"
  | "rate_limit_missing"
  | "repeated_probe_budget_exceeded"
  | "audit_missing"
  | "audit_failed"
  | "audit_stale"
  | "incident_escalation_missing"
  | "invalid_policy_hash"
  | "invalid_event_hash"
  | "invalid_audit_hash";

export interface MoralTradeAntiEnumerationPolicyRecord {
  policyId: string;
  policyVersion: string;
  surface: MoralTradeAntiEnumerationSurface;
  policySnapshotStatus: MoralTradeAntiEnumerationPolicySnapshotStatus;
  rateLimitRequired: boolean;
  queryFingerprintRequired: boolean;
  accessEventLoggingRequired: boolean;
  bucketedCountsRequired: boolean;
  sparseSuppressionRequired: boolean;
  timingEqualizationRequired: boolean;
  incidentEscalationRequired: boolean;
  maxRepeatedFingerprintCount: number;
  minPublicBucketSize: number;
  maxEventAgeDays: number;
  policyHash: string;
  reviewedAt: string;
  supersededBy: string | null;
}

export interface MoralTradeDiscoveryAccessEventRecord {
  eventId: string;
  surface: MoralTradeAntiEnumerationSurface;
  actorIdHash: string | null;
  queryFingerprint: string | null;
  resultCountBucket: MoralTradeDiscoveryResultCountBucket;
  rawQueryStored: boolean;
  exactResultCountExposed: boolean;
  sparseSuppressionApplied: boolean;
  timingEqualized: boolean;
  rateLimitApplied: boolean;
  delayedResponseApplied: boolean;
  redactedResponseApplied: boolean;
  policyRef: string;
  eventHash: string;
  occurredAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeDiscoveryProbeAuditRecord {
  auditId: string;
  surface: MoralTradeAntiEnumerationSurface;
  queryFingerprint: string;
  policyRef: string;
  auditStatus: MoralTradeAntiEnumerationStatus;
  eventCount: number;
  uniqueActorHashCount: number;
  repeatedFingerprintCount: number;
  sparseResultHitCount: number;
  timingVarianceMs: number;
  escalationIncidentRef: string | null;
  auditHash: string;
  auditedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeAntiEnumerationSurfaceDefinition {
  key: MoralTradeAntiEnumerationSurface;
  label: string;
  protectedInference: string;
  requiredControls: string[];
  blocksTransitions: string[];
}

export interface MoralTradeAntiEnumerationEvaluationInput {
  surface: MoralTradeAntiEnumerationSurface;
  checkedAt?: string;
  policies: MoralTradeAntiEnumerationPolicyRecord[];
  accessEvents: MoralTradeDiscoveryAccessEventRecord[];
  probeAudits: MoralTradeDiscoveryProbeAuditRecord[];
}

export interface MoralTradeAntiEnumerationEvaluation {
  status: "pass" | "blocked";
  surface: MoralTradeAntiEnumerationSurface;
  checkedAt: string;
  policyCount: number;
  accessEventCount: number;
  probeAuditCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeAntiEnumerationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeAntiEnumerationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-anti-enumeration-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeAntiEnumerationCheck[];
  blockers: string[];
}

export interface MoralTradeAntiEnumerationContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  surfaces: MoralTradeAntiEnumerationSurface[];
  countBuckets: MoralTradeDiscoveryResultCountBucket[];
  failClosedStatuses: MoralTradeAntiEnumerationFailClosedStatus[];
  surfaceDefinitions: MoralTradeAntiEnumerationSurfaceDefinition[];
  sampleEvaluations: MoralTradeAntiEnumerationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_EVENT_AGE_DAYS = 30;
const MAX_TIMING_VARIANCE_MS = 150;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_anti_enumeration_policies",
  "moral_trade_discovery_access_events",
  "moral_trade_discovery_probe_audits",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["anti_enumeration"] as const;

const SURFACES: MoralTradeAntiEnumerationSurface[] = [
  "public_search",
  "signed_in_search",
  "public_browse",
  "preview_generation",
  "invite_link_creation",
  "match_candidate_browsing",
  "transparency_report",
];

const COUNT_BUCKETS: MoralTradeDiscoveryResultCountBucket[] = [
  "zero",
  "one_or_two_suppressed",
  "three_to_nine",
  "ten_to_forty_nine",
  "fifty_plus",
  "not_returned",
];

const FAIL_CLOSED_STATUSES: MoralTradeAntiEnumerationFailClosedStatus[] = [
  "policy_missing",
  "policy_mutable",
  "policy_stale",
  "policy_superseded",
  "access_event_missing",
  "access_event_stale",
  "access_event_superseded",
  "query_fingerprint_missing",
  "raw_query_logged",
  "exact_result_count_exposed",
  "bucketed_result_count_missing",
  "sparse_suppression_missing",
  "timing_equalization_missing",
  "rate_limit_missing",
  "repeated_probe_budget_exceeded",
  "audit_missing",
  "audit_failed",
  "audit_stale",
  "incident_escalation_missing",
  "invalid_policy_hash",
  "invalid_event_hash",
  "invalid_audit_hash",
];

const REQUIRED_CONTROLS = [
  "frozen_anti_enumeration_policy",
  "stable_query_fingerprint",
  "rate_limit_budget",
  "discovery_access_event_log",
  "bucketed_result_count",
  "sparse_result_suppression",
  "timing_equalized_response",
  "probe_audit",
] as const;

const SURFACE_DEFINITIONS: MoralTradeAntiEnumerationSurfaceDefinition[] = [
  {
    key: "public_search",
    label: "Public search",
    protectedInference: "hidden offers, rare cause clusters, and zero-count sensitive facets",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["public_offer_search_result", "public_offer_facet_publication"],
  },
  {
    key: "signed_in_search",
    label: "Signed-in search",
    protectedInference: "private constraints, exact wishes, and same-owner probing pressure",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["wish_registry_result", "saved_search_recommendation"],
  },
  {
    key: "public_browse",
    label: "Public browse",
    protectedInference: "rare view clusters and sparse public marketplace slices",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["public_browse_result", "facet_count_publication"],
  },
  {
    key: "preview_generation",
    label: "Preview generation",
    protectedInference: "exact willingness-to-pay, hidden constraints, and preview-only matches",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["round_preview", "donation_offset_preview", "pledge_swap_preview"],
  },
  {
    key: "invite_link_creation",
    label: "Invite-link creation",
    protectedInference: "private target availability and repeated solicitation pressure",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["invite_link_publication", "contact_introduction_candidate"],
  },
  {
    key: "match_candidate_browsing",
    label: "Match-candidate browsing",
    protectedInference: "counterparty attributes, private willingness, and rare hidden matches",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["match_candidate_preview", "matched_trade_lock_candidate"],
  },
  {
    key: "transparency_report",
    label: "Transparency report",
    protectedInference: "small cells, rare stances, and jurisdiction/cause-area slices",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["public_metric_publication", "transparency_slice_publication"],
  },
];

const CONTRACT_TESTS = [
  "anti_enumeration_contract_validator",
  "anti_enumeration_evaluator_fail_closed",
  "anti_enumeration_route_contract",
  "anti_enumeration_schema_contract",
  "anti_enumeration_health_contract",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeAntiEnumerationCheck {
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

  return Math.max(0, (end - start) / 86_400_000);
}

function isExpired(expiresAt: string | null, checkedAt: string) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.parse(checkedAt));
}

function findSurfaceDefinition(surface: MoralTradeAntiEnumerationSurface) {
  return SURFACE_DEFINITIONS.find((definition) => definition.key === surface);
}

function policyBlockers(
  policy: MoralTradeAntiEnumerationPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (policy.policySnapshotStatus === "missing") {
    blockers.push(`policy_missing:${policy.surface}`);
  }

  if (policy.policySnapshotStatus === "mutable") {
    blockers.push(`policy_mutable:${policy.policyId}`);
  }

  if (
    policy.policySnapshotStatus === "stale" ||
    daysBetween(policy.reviewedAt, checkedAt) > MAX_EVENT_AGE_DAYS
  ) {
    blockers.push(`policy_stale:${policy.policyId}`);
  }

  if (policy.policySnapshotStatus === "superseded" || policy.supersededBy) {
    blockers.push(`policy_superseded:${policy.policyId}`);
  }

  if (!HASH_PATTERN.test(policy.policyHash)) {
    blockers.push(`invalid_policy_hash:${policy.policyId}`);
  }

  return blockers;
}

function accessEventBlockers(
  policy: MoralTradeAntiEnumerationPolicyRecord,
  event: MoralTradeDiscoveryAccessEventRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (isExpired(event.expiresAt, checkedAt)) {
    blockers.push(`access_event_stale:${event.eventId}`);
  }

  if (event.supersededBy) {
    blockers.push(`access_event_superseded:${event.eventId}`);
  }

  if (policy.queryFingerprintRequired && !event.queryFingerprint) {
    blockers.push(`query_fingerprint_missing:${event.eventId}`);
  }

  if (event.queryFingerprint && !HASH_PATTERN.test(event.queryFingerprint)) {
    blockers.push(`query_fingerprint_missing:${event.eventId}`);
  }

  if (event.rawQueryStored) {
    blockers.push(`raw_query_logged:${event.eventId}`);
  }

  if (event.exactResultCountExposed) {
    blockers.push(`exact_result_count_exposed:${event.eventId}`);
  }

  if (
    policy.bucketedCountsRequired &&
    !COUNT_BUCKETS.includes(event.resultCountBucket)
  ) {
    blockers.push(`bucketed_result_count_missing:${event.eventId}`);
  }

  if (
    policy.sparseSuppressionRequired &&
    event.resultCountBucket === "one_or_two_suppressed" &&
    !event.sparseSuppressionApplied
  ) {
    blockers.push(`sparse_suppression_missing:${event.eventId}`);
  }

  if (
    policy.timingEqualizationRequired &&
    !event.timingEqualized &&
    !event.delayedResponseApplied &&
    !event.redactedResponseApplied
  ) {
    blockers.push(`timing_equalization_missing:${event.eventId}`);
  }

  if (policy.rateLimitRequired && !event.rateLimitApplied) {
    blockers.push(`rate_limit_missing:${event.eventId}`);
  }

  if (!HASH_PATTERN.test(event.eventHash)) {
    blockers.push(`invalid_event_hash:${event.eventId}`);
  }

  return blockers;
}

function probeAuditBlockers(
  policy: MoralTradeAntiEnumerationPolicyRecord,
  audit: MoralTradeDiscoveryProbeAuditRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (audit.auditStatus === "failed") {
    blockers.push(`audit_failed:${audit.auditId}`);
  }

  if (
    audit.auditStatus === "missing" ||
    audit.auditStatus === "under_review" ||
    audit.auditStatus === "stale" ||
    isExpired(audit.expiresAt, checkedAt)
  ) {
    blockers.push(`audit_stale:${audit.auditId}`);
  }

  if (audit.auditStatus === "superseded" || audit.supersededBy) {
    blockers.push(`audit_stale:${audit.auditId}`);
  }

  if (audit.repeatedFingerprintCount > policy.maxRepeatedFingerprintCount) {
    blockers.push(`repeated_probe_budget_exceeded:${audit.auditId}`);
  }

  if (
    policy.incidentEscalationRequired &&
    audit.repeatedFingerprintCount > policy.maxRepeatedFingerprintCount &&
    !audit.escalationIncidentRef
  ) {
    blockers.push(`incident_escalation_missing:${audit.auditId}`);
  }

  if (
    policy.timingEqualizationRequired &&
    audit.timingVarianceMs > MAX_TIMING_VARIANCE_MS
  ) {
    blockers.push(`timing_equalization_missing:${audit.auditId}`);
  }

  if (!HASH_PATTERN.test(audit.queryFingerprint)) {
    blockers.push(`query_fingerprint_missing:${audit.auditId}`);
  }

  if (!HASH_PATTERN.test(audit.auditHash)) {
    blockers.push(`invalid_audit_hash:${audit.auditId}`);
  }

  return blockers;
}

export function evaluateMoralTradeAntiEnumeration(
  input: MoralTradeAntiEnumerationEvaluationInput,
): MoralTradeAntiEnumerationEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const surfacePolicies = input.policies.filter(
    (policy) => policy.surface === input.surface,
  );
  const activePolicy =
    surfacePolicies.find(
      (policy) => policy.policySnapshotStatus === "resolved_immutable",
    ) ?? surfacePolicies[0];
  const surfaceEvents = input.accessEvents.filter(
    (event) => event.surface === input.surface,
  );
  const surfaceAudits = input.probeAudits.filter(
    (audit) => audit.surface === input.surface,
  );
  const definition = findSurfaceDefinition(input.surface);
  const blockers: string[] = [];

  if (!activePolicy) {
    blockers.push(`policy_missing:${input.surface}`);
  } else {
    blockers.push(...policyBlockers(activePolicy, checkedAt));
  }

  if (!surfaceEvents.length) {
    blockers.push(`access_event_missing:${input.surface}`);
  }

  if (activePolicy) {
    for (const event of surfaceEvents) {
      blockers.push(...accessEventBlockers(activePolicy, event, checkedAt));
    }

    if (!surfaceAudits.length) {
      blockers.push(`audit_missing:${input.surface}`);
    }

    for (const audit of surfaceAudits) {
      blockers.push(...probeAuditBlockers(activePolicy, audit, checkedAt));
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    surface: input.surface,
    checkedAt,
    policyCount: surfacePolicies.length,
    accessEventCount: surfaceEvents.length,
    probeAuditCount: surfaceAudits.length,
    blockers,
    userFacingBlockerCategories: blockers.length
      ? [
          "Discovery privacy controls need review before this surface can reveal results.",
          definition?.protectedInference ?? "Sparse private discovery inference is protected.",
        ]
      : [],
  };
}

function samplePolicy(
  surface: MoralTradeAntiEnumerationSurface,
  overrides: Partial<MoralTradeAntiEnumerationPolicyRecord> = {},
): MoralTradeAntiEnumerationPolicyRecord {
  return {
    policyId: `policy-${surface}`,
    policyVersion: MORAL_TRADE_ANTI_ENUMERATION_CONTRACT_VERSION,
    surface,
    policySnapshotStatus: "resolved_immutable",
    rateLimitRequired: true,
    queryFingerprintRequired: true,
    accessEventLoggingRequired: true,
    bucketedCountsRequired: true,
    sparseSuppressionRequired: true,
    timingEqualizationRequired: true,
    incidentEscalationRequired: true,
    maxRepeatedFingerprintCount: 3,
    minPublicBucketSize: 3,
    maxEventAgeDays: MAX_EVENT_AGE_DAYS,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleAccessEvent(
  policy: MoralTradeAntiEnumerationPolicyRecord,
  overrides: Partial<MoralTradeDiscoveryAccessEventRecord> = {},
): MoralTradeDiscoveryAccessEventRecord {
  return {
    eventId: `event-${policy.surface}`,
    surface: policy.surface,
    actorIdHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    queryFingerprint:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    resultCountBucket: "three_to_nine",
    rawQueryStored: false,
    exactResultCountExposed: false,
    sparseSuppressionApplied: false,
    timingEqualized: true,
    rateLimitApplied: true,
    delayedResponseApplied: false,
    redactedResponseApplied: true,
    policyRef: policy.policyId,
    eventHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    occurredAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleProbeAudit(
  policy: MoralTradeAntiEnumerationPolicyRecord,
  overrides: Partial<MoralTradeDiscoveryProbeAuditRecord> = {},
): MoralTradeDiscoveryProbeAuditRecord {
  return {
    auditId: `audit-${policy.surface}`,
    surface: policy.surface,
    queryFingerprint:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    policyRef: policy.policyId,
    auditStatus: "passed",
    eventCount: 2,
    uniqueActorHashCount: 1,
    repeatedFingerprintCount: 1,
    sparseResultHitCount: 0,
    timingVarianceMs: 25,
    escalationIncidentRef: null,
    auditHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    auditedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

export function getMoralTradeAntiEnumerationContract(): MoralTradeAntiEnumerationContract {
  const publicSearchPolicy = samplePolicy("public_search");
  const publicSearchEvaluation = evaluateMoralTradeAntiEnumeration({
    surface: "public_search",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [publicSearchPolicy],
    accessEvents: [sampleAccessEvent(publicSearchPolicy)],
    probeAudits: [sampleProbeAudit(publicSearchPolicy)],
  });
  const invitePolicy = samplePolicy("invite_link_creation", {
    maxRepeatedFingerprintCount: 1,
  });
  const inviteEvaluation = evaluateMoralTradeAntiEnumeration({
    surface: "invite_link_creation",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [invitePolicy],
    accessEvents: [
      sampleAccessEvent(invitePolicy, {
        eventId: "event-invite-link-unsafe",
        resultCountBucket: "one_or_two_suppressed",
        rawQueryStored: true,
        exactResultCountExposed: true,
        sparseSuppressionApplied: false,
        timingEqualized: false,
        delayedResponseApplied: false,
        redactedResponseApplied: false,
        rateLimitApplied: false,
      }),
    ],
    probeAudits: [
      sampleProbeAudit(invitePolicy, {
        auditId: "audit-invite-link-unsafe",
        repeatedFingerprintCount: 4,
        sparseResultHitCount: 2,
        timingVarianceMs: 275,
        escalationIncidentRef: null,
      }),
    ],
  });

  return {
    version: MORAL_TRADE_ANTI_ENUMERATION_CONTRACT_VERSION,
    purpose:
      "Public fail-closed contract for discovery anti-enumeration policy, query/access event logging, bucketed results, sparse-result suppression, timing-equalized responses, and repeated-probe audits across Moral Trade search, browse, preview, invite, match-candidate, and transparency surfaces.",
    failClosedRule:
      "Repeated discovery is not an oracle: missing frozen policy, missing discovery_access_event records, raw query logging, exact result-count exposure, missing sparse suppression, missing timing equalization, missing rate limits, repeated-probe budget failures, or missing probe audits block discovery surfaces before they can reveal rare offers, hidden constraints, exact willingness-to-pay, or private counterparty attributes.",
    privacyRule:
      "Anti-enumeration records store stable query fingerprints, actor hashes, buckets, suppression flags, and audit hashes only. They must not expose raw query text, exact hidden result counts, private wishes, rare clusters, exact constraints, contact details, or reviewer notes on public contract surfaces.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    surfaces: [...SURFACES],
    countBuckets: [...COUNT_BUCKETS],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    surfaceDefinitions: [...SURFACE_DEFINITIONS],
    sampleEvaluations: [publicSearchEvaluation, inviteEvaluation],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeAntiEnumerationContract(
  contract: MoralTradeAntiEnumerationContract = getMoralTradeAntiEnumerationContract(),
): MoralTradeAntiEnumerationValidation {
  const surfaceKeys = contract.surfaceDefinitions.map((definition) => definition.key);
  const sampleStatuses = contract.sampleEvaluations.map((evaluation) => evaluation.status);
  const checks = [
    check(
      "first-class-records",
      "Anti-enumeration policy, access events, and probe audits are first-class records",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subjects",
      "Policy snapshots cover anti-enumeration",
      hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "surface-coverage",
      "All discovery surfaces are covered",
      hasAll(contract.surfaces, SURFACES) &&
        hasAll(surfaceKeys, SURFACES) &&
        contract.surfaceDefinitions.every(
          (definition) =>
            definition.requiredControls.includes("stable_query_fingerprint") &&
            definition.requiredControls.includes("discovery_access_event_log") &&
            definition.requiredControls.includes("bucketed_result_count") &&
            definition.requiredControls.includes("probe_audit"),
        ),
      surfaceKeys.join(", "),
    ),
    check(
      "count-buckets",
      "Count buckets prevent exact sparse result exposure",
      hasAll(contract.countBuckets, COUNT_BUCKETS) &&
        contract.countBuckets.includes("one_or_two_suppressed"),
      contract.countBuckets.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Fail-closed statuses cover probing, logging, sparse, timing, and audit blockers",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "sample-evaluations",
      "Sample evaluations prove pass and blocked states",
      sampleStatuses.includes("pass") &&
        sampleStatuses.includes("blocked") &&
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) =>
            blocker.startsWith("repeated_probe_budget_exceeded"),
          ),
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.surface}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "privacy-rule",
      "Privacy rule excludes raw query text and exact hidden counts",
      /raw query text/i.test(contract.privacyRule) &&
        /exact hidden result counts/i.test(contract.privacyRule) &&
        /private wishes/i.test(contract.privacyRule),
      contract.privacyRule,
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-anti-enumeration-contract",
    validatorVersion: MORAL_TRADE_ANTI_ENUMERATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeAntiEnumeration = {
  evaluateMoralTradeAntiEnumeration,
  getMoralTradeAntiEnumerationContract,
  validateMoralTradeAntiEnumerationContract,
};

export default moralTradeAntiEnumeration;
