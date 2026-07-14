import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as providerSourceAuthenticationContractRoute } from "@/app/api/moral-trade/provider-source-authentication/contract/route";

import {
  evaluateMoralTradeProviderSourceAuthentication,
  getMoralTradeProviderSourceAuthenticationContract,
  validateMoralTradeProviderSourceAuthenticationContract,
  type MoralTradeProviderSourceAuthenticationRecord,
  type MoralTradeProviderSourceSubjectType,
} from "./provider-source-authentication";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function sampleHash(seed: string) {
  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0")
    .slice(0, 64);

  return `sha256:${hex}`;
}

function record(
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

test("moraltrade82 provider source-authentication contract validates required domains", () => {
  const contract = getMoralTradeProviderSourceAuthenticationContract();
  const validation = validateMoralTradeProviderSourceAuthenticationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_provider_source_authentication_records",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_provider_source_authentication_manual_review_queue",
    ),
  );
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_marketplace_state_events"));
  assert.deepEqual(contract.requiredSubjectTypes, [
    "payment_webhook",
    "third_party_evidence_feed",
    "identity_check",
    "payment_rail_check",
    "destination_verification_feed",
  ]);
  assert.ok(contract.releaseGateTestHooks.includes("provider_source_authentication_test"));
  assert.match(contract.failClosedRule, /evidence acceptance/i);
  assert.match(contract.failClosedRule, /destination verification/i);
  assert.match(contract.failClosedRule, /release-gate promotion/i);
});

test("provider webhooks, evidence feeds, identity checks, payment-rail checks, and destination feeds can pass together", () => {
  const evaluation = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: [
      record("payment_webhook", { stateChangeSurface: "payment_capture" }),
      record("third_party_evidence_feed", { stateChangeSurface: "evidence_acceptance" }),
      record("identity_check", { stateChangeSurface: "eligibility_approval" }),
      record("payment_rail_check", { stateChangeSurface: "payout_release" }),
      record("destination_verification_feed", {
        stateChangeSurface: "destination_verification",
      }),
    ],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.stateMutationAllowed, true);
  assert.deepEqual(evaluation.blockers, []);
  assert.equal(evaluation.applicableRecordCount, 5);
});

test("unauthenticated, stale, raw, replayed, and state-event-missing provider sources fail closed", () => {
  const evaluation = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: [
      record("payment_webhook", {
        authenticatedAt: null,
        authenticationMethod: "none",
        downstreamStateEventRef: null,
        endpointVerified: false,
        eventTypeAllowed: false,
        manualReviewQueueRef: null,
        policySnapshotStatus: "mutable",
        providerAccountVerified: false,
        providerEventIdHash: "sha256:broken",
        rawPayloadStored: true,
        replayWindowExpiresAt: "2026-06-30T07:00:00.000Z",
        replayWindowValid: false,
        signatureVerified: false,
        sourceEventHash: "not-a-hash",
        storedBeforeApply: false,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.stateMutationAllowed, false);
  assert.ok(evaluation.blockers.includes("provider_source_subject_missing:third_party_evidence_feed"));
  assert.ok(evaluation.blockers.includes("provider_source_subject_missing:identity_check"));
  assert.ok(evaluation.blockers.includes("provider_source_subject_missing:payment_rail_check"));
  assert.ok(
    evaluation.blockers.includes("provider_source_subject_missing:destination_verification_feed"),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_policy_not_immutable:provider-source-authentication:payment_webhook:mutable",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_event_hash_invalid:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_event_hash_invalid:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_replay_window_expired:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_not_stored_before_apply:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_raw_payload_stored:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_signature_unverified:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_state_event_missing:provider-source-authentication:payment_webhook",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "provider_source_manual_review_missing:provider-source-authentication:payment_webhook",
    ),
  );
});

test("duplicate provider events are stored but cannot carry downstream state events", () => {
  const ignored = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: [
      record("payment_webhook", {
        downstreamStateEventRef: null,
        duplicateProviderEvent: true,
      }),
    ],
    requiredSubjectTypes: ["payment_webhook"],
  });

  assert.equal(ignored.status, "pass");
  assert.equal(ignored.ignoredDuplicateCount, 1);
  assert.equal(ignored.stateMutationAllowed, false);

  const blocked = evaluateMoralTradeProviderSourceAuthentication({
    checkedAt: "2026-06-30T08:00:00.000Z",
    records: [record("payment_webhook", { duplicateProviderEvent: true })],
    requiredSubjectTypes: ["payment_webhook"],
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.stateMutationAllowed, false);
  assert.ok(
    blocked.blockers.includes(
      "provider_source_duplicate_state_event_attempt:provider-source-authentication:payment_webhook",
    ),
  );
});

test("provider source-authentication contract route exposes safe public metadata", async () => {
  const response = await providerSourceAuthenticationContractRoute(
    new Request("http://localhost/api/moral-trade/provider-source-authentication/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_provider_source_authentication_records",
    ),
  );
  assert.ok(
    body.publicContract.releaseGateTestHooks.includes(
      "provider_source_authentication_test",
    ),
  );
  assert.equal(body.publicContract.sampleEvaluationStatuses.sample_1.status, "pass");
  assert.equal(body.publicContract.sampleEvaluationStatuses.sample_2.status, "blocked");
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("raw provider payload"), true);
  assert.equal(serialized.includes("provider_secret_value"), false);
  assert.equal(serialized.includes("participant-specific provider rows"), true);
});

test("provider source-authentication migration generalizes payment-scoped records", () => {
  const migration = readRepoFile(
    "supabase/migrations/20260630_moral_trade_provider_source_authentication_generalization.sql",
  );

  assert.match(migration, /alter column payment_event_delivery_id drop not null/);
  assert.match(migration, /provider_subject_type/);
  assert.match(migration, /third_party_evidence_feed/);
  assert.match(migration, /identity_check/);
  assert.match(migration, /destination_verification_feed/);
  assert.match(migration, /raw_payload_stored_bool = false/);
  assert.match(migration, /moral_trade_provider_source_authentication_manual_review_queue/);
  assert.match(migration, /state_change_allowed_bool boolean not null default false/);
});
