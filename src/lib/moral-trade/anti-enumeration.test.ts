import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeAntiEnumeration,
  getMoralTradeAntiEnumerationContract,
  validateMoralTradeAntiEnumerationContract,
  type MoralTradeAntiEnumerationPolicyRecord,
  type MoralTradeDiscoveryAccessEventRecord,
  type MoralTradeDiscoveryProbeAuditRecord,
} from "@/lib/moral-trade/anti-enumeration";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradeAntiEnumerationPolicyRecord> = {},
): MoralTradeAntiEnumerationPolicyRecord {
  return {
    policyId: "policy-public-search",
    policyVersion: "moral-trade-anti-enumeration-v0.1-2026-06",
    surface: "public_search",
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
    maxEventAgeDays: 30,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function accessEvent(
  policyRecord: MoralTradeAntiEnumerationPolicyRecord,
  overrides: Partial<MoralTradeDiscoveryAccessEventRecord> = {},
): MoralTradeDiscoveryAccessEventRecord {
  return {
    eventId: "event-public-search",
    surface: policyRecord.surface,
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
    policyRef: policyRecord.policyId,
    eventHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    occurredAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function probeAudit(
  policyRecord: MoralTradeAntiEnumerationPolicyRecord,
  overrides: Partial<MoralTradeDiscoveryProbeAuditRecord> = {},
): MoralTradeDiscoveryProbeAuditRecord {
  return {
    auditId: "audit-public-search",
    surface: policyRecord.surface,
    queryFingerprint:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    policyRef: policyRecord.policyId,
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

test("anti-enumeration contract validates first-class discovery coverage", () => {
  const contract = getMoralTradeAntiEnumerationContract();
  const validation = validateMoralTradeAntiEnumerationContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_anti_enumeration_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_discovery_access_events"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_discovery_probe_audits"));
  assert.ok(contract.policySnapshotSubjects.includes("anti_enumeration"));
  assert.ok(contract.surfaces.includes("public_search"));
  assert.ok(contract.surfaces.includes("signed_in_search"));
  assert.ok(contract.surfaces.includes("public_browse"));
  assert.ok(contract.surfaces.includes("preview_generation"));
  assert.ok(contract.surfaces.includes("invite_link_creation"));
  assert.ok(contract.surfaces.includes("match_candidate_browsing"));
  assert.ok(contract.surfaces.includes("transparency_report"));
  assert.ok(contract.countBuckets.includes("one_or_two_suppressed"));
  assert.ok(contract.failClosedStatuses.includes("repeated_probe_budget_exceeded"));
  assert.ok(contract.failClosedStatuses.includes("raw_query_logged"));
  assert.ok(contract.failClosedStatuses.includes("exact_result_count_exposed"));
  assert.match(contract.failClosedRule, /Repeated discovery is not an oracle/i);
});

test("missing policy, access event, and probe audit fail closed", () => {
  const evaluation = evaluateMoralTradeAntiEnumeration({
    surface: "public_search",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [],
    accessEvents: [],
    probeAudits: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("policy_missing:public_search"));
  assert.ok(evaluation.blockers.includes("access_event_missing:public_search"));
});

test("raw query logging, exact counts, missing timing equalization, and missing rate limits block", () => {
  const policyRecord = policy();
  const blocked = evaluateMoralTradeAntiEnumeration({
    surface: "public_search",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    accessEvents: [
      accessEvent(policyRecord, {
        rawQueryStored: true,
        exactResultCountExposed: true,
        resultCountBucket: "one_or_two_suppressed",
        sparseSuppressionApplied: false,
        timingEqualized: false,
        delayedResponseApplied: false,
        redactedResponseApplied: false,
        rateLimitApplied: false,
      }),
    ],
    probeAudits: [probeAudit(policyRecord)],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("raw_query_logged:event-public-search"));
  assert.ok(blocked.blockers.includes("exact_result_count_exposed:event-public-search"));
  assert.ok(blocked.blockers.includes("sparse_suppression_missing:event-public-search"));
  assert.ok(blocked.blockers.includes("timing_equalization_missing:event-public-search"));
  assert.ok(blocked.blockers.includes("rate_limit_missing:event-public-search"));
});

test("repeated probing requires incident escalation under frozen policy", () => {
  const policyRecord = policy({ maxRepeatedFingerprintCount: 1 });
  const blocked = evaluateMoralTradeAntiEnumeration({
    surface: "public_search",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    accessEvents: [accessEvent(policyRecord)],
    probeAudits: [
      probeAudit(policyRecord, {
        repeatedFingerprintCount: 4,
        escalationIncidentRef: null,
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("repeated_probe_budget_exceeded:audit-public-search"));
  assert.ok(blocked.blockers.includes("incident_escalation_missing:audit-public-search"));
});

test("current frozen policy, bucketed event, timing protection, and probe audit can pass", () => {
  const policyRecord = policy();
  const passed = evaluateMoralTradeAntiEnumeration({
    surface: "public_search",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    accessEvents: [accessEvent(policyRecord)],
    probeAudits: [probeAudit(policyRecord)],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
});

test("anti-enumeration route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/anti-enumeration.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/anti-enumeration/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzz_moral_trade_anti_enumeration_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeAntiEnumerationContract/);
  assert.match(source, /evaluateMoralTradeAntiEnumeration/);
  assert.match(source, /Repeated discovery is not an oracle/);
  assert.match(route, /public_contract_read/);
  assert.match(route, /antiEnumerationSampleEvaluationStatuses/);
  assert.match(healthRoute, /antiEnumerationValidation/);
  assert.match(healthRoute, /antiEnumerationSurfaces/);
  assert.match(technicalSpec, /Anti-enumeration contract/);
  assert.match(technicalSpec, /Open anti-enumeration JSON/);
  assert.match(apiContractSource, /moral_trade_anti_enumeration_contract/);
  assert.match(apiContractProfile, /anti_enumeration_contract_response/);
  assert.match(apiContractProfile, /moral_trade_anti_enumeration_contract/);
  assert.match(migration, /moral_trade_anti_enumeration_policies/);
  assert.match(migration, /moral_trade_discovery_access_events/);
  assert.match(migration, /moral_trade_discovery_probe_audits/);
  assert.match(migration, /anti_enumeration_policy_ref/);
  assert.match(schema, /anti_enumeration_policy_ref/);
  assert.match(schema, /result_count_bucket/);
  assert.match(databaseTypes, /moral_trade_anti_enumeration_policies/);
  assert.match(databaseTypes, /moral_trade_discovery_access_events/);
  assert.match(databaseTypes, /moral_trade_discovery_probe_audits/);
});
