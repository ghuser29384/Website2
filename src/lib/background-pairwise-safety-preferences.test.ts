import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION,
  buildBackgroundPairwiseSafetyPreferenceRow,
  evaluateBackgroundPairwiseSafetyPreference,
} from "@/lib/background-claim-safety";
import {
  evaluateBackgroundPolicyDecision,
  getBackgroundActionKindRegistry,
  getBackgroundArtifactTransitionPolicyBundle,
  getBackgroundOutputSchemaBundle,
  getBackgroundPolicyCompositionBundle,
  getBackgroundRetentionPolicyBundle,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

const PARTICIPANT_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_HANDLE = "bgch_abcd1234efgh5678ijkl9012mnop3456";

type PairwiseSafetyBuildRow = NonNullable<
  ReturnType<typeof buildBackgroundPairwiseSafetyPreferenceRow>["row"]
>;

function pairwisePreference(row: PairwiseSafetyBuildRow) {
  return {
    expires_at: row.expires_at ?? null,
    preference_kind: row.preference_kind,
    purpose_code: row.purpose_code ?? null,
    scope_kind: row.scope_kind,
    scope_value_internal: row.scope_value_internal,
    state: row.state ?? "active",
  };
}

test("pairwise safety preferences build deterministic suppressive controls without target disclosure", () => {
  const first = buildBackgroundPairwiseSafetyPreferenceRow({
    participantId: PARTICIPANT_ID,
    preferenceKind: "do_not_match",
    purposeCode: "moral_trade_offer",
    reasonCode: "privacy",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });
  const second = buildBackgroundPairwiseSafetyPreferenceRow({
    participantId: PARTICIPANT_ID,
    preferenceKind: "do_not_match",
    purposeCode: "moral_trade_offer",
    reasonCode: "privacy",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });

  assert.deepEqual(first.errors, []);
  assert.deepEqual(second.errors, []);
  assert.equal(first.row?.safety_preference_version, second.row?.safety_preference_version);
  assert.match(first.row?.safety_preference_version ?? "", /^pairwise-safety-v1:/);
  assert.equal(first.row?.purpose_policy_version, BACKGROUND_PURPOSE_POLICY_VERSION);
});

test("active pairwise blocks close matching while mutes expose only a generic privacy gate", () => {
  const blocked = buildBackgroundPairwiseSafetyPreferenceRow({
    participantId: PARTICIPANT_ID,
    preferenceKind: "block",
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });
  const muted = buildBackgroundPairwiseSafetyPreferenceRow({
    participantId: PARTICIPANT_ID,
    preferenceKind: "mute",
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });

  const blockDecision = evaluateBackgroundPairwiseSafetyPreference({
    preference: blocked.row ? pairwisePreference(blocked.row) : null,
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });
  const muteDecision = evaluateBackgroundPairwiseSafetyPreference({
    preference: muted.row ? pairwisePreference(muted.row) : null,
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });

  assert.equal(blockDecision.blocked, true);
  assert.equal(blockDecision.requesterSafeState, "closed");
  assert.deepEqual(blockDecision.blockerCodes, ["pairwise_safety_block"]);
  assert.equal(muteDecision.blocked, true);
  assert.equal(muteDecision.requesterSafeState, "privacy_or_consent_gate");
});

test("pairwise safety preferences ignore inactive, expired, wrong-purpose, and wrong-scope records", () => {
  const base = buildBackgroundPairwiseSafetyPreferenceRow({
    expiresAt: "2099-01-01T00:00:00.000Z",
    participantId: PARTICIPANT_ID,
    preferenceKind: "no_recontact",
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });

  const wrongPurpose = evaluateBackgroundPairwiseSafetyPreference({
    preference: base.row ? pairwisePreference(base.row) : null,
    purposeCode: "research_collaboration",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });
  const wrongScope = evaluateBackgroundPairwiseSafetyPreference({
    preference: base.row ? pairwisePreference(base.row) : null,
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: "bgch_differentopaquehandlescope000000",
  });
  const expired = evaluateBackgroundPairwiseSafetyPreference({
    now: new Date("2100-01-01T00:00:00.000Z"),
    preference: base.row ? pairwisePreference(base.row) : null,
    purposeCode: "moral_trade_offer",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });

  assert.equal(wrongPurpose.requesterSafeState, "available");
  assert.equal(wrongScope.requesterSafeState, "available");
  assert.equal(expired.requesterSafeState, "available");
});

test("pairwise safety validation rejects exact-looking scopes and unsupported reason or source codes", () => {
  const exactScope = buildBackgroundPairwiseSafetyPreferenceRow({
    participantId: PARTICIPANT_ID,
    preferenceKind: "block",
    scopeKind: "profile",
    scopeValueInternal: "alice@example.org",
  });
  const unsupportedReason = buildBackgroundPairwiseSafetyPreferenceRow({
    participantId: PARTICIPANT_ID,
    preferenceKind: "block",
    reasonCode: "debug_exact_reason",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });
  const unsupportedSource = buildBackgroundPairwiseSafetyPreferenceRow({
    createdFromEventKind: "worker_task",
    participantId: PARTICIPANT_ID,
    preferenceKind: "block",
    scopeKind: "profile",
    scopeValueInternal: TARGET_HANDLE,
  });

  assert.ok(exactScope.errors.some((error) => error.includes("opaque reference")));
  assert.ok(unsupportedReason.errors.some((error) => error.includes("supported safety preference reason")));
  assert.ok(unsupportedSource.errors.some((error) => error.includes("supported safety preference source event")));
});

test("pairwise safety action is governed by policy, retention, composition, transition, and output schema bundles", () => {
  const registry = getBackgroundActionKindRegistry();
  const schemas = getBackgroundOutputSchemaBundle();
  const retention = getBackgroundRetentionPolicyBundle();
  const composition = getBackgroundPolicyCompositionBundle();
  const transitions = getBackgroundArtifactTransitionPolicyBundle();
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.pairwise_safety_preference.write",
    actorRole: "participant",
    idempotencyKey: `${PARTICIPANT_ID}:pairwise-safety:v1`,
    laneKey: "pairwise_safety_preferences",
    outputSchemaVersion: BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION,
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const schema = schemas.find(
    (row) => row.schemaKey === BACKGROUND_PAIRWISE_SAFETY_RESPONSE_SCHEMA_VERSION,
  );

  assert.equal(decision.verdict, "allow");
  assert.ok(
    registry.some(
      (entry) => entry.actionKind === "background.pairwise_safety_preference.write",
    ),
  );
  assert.equal(schema?.schemaSurface, "requester_safety_preference");
  assert.ok(
    schema?.allowedKeys.every(
      (key) => !/(?:candidate|counterparty|profile_id|raw|exact|contact|private|debug|timing)/i.test(key),
    ),
  );
  assert.ok(retention.some((row) => row.artifactKind === "pairwise_safety_preference"));
  assert.ok(
    composition.some((row) => row.controlFamilies.includes("pairwise_safety_preference")),
  );
  assert.ok(
    transitions.some(
      (row) =>
        row.artifactKind === "pairwise_safety_preference" &&
        row.requiredActionKind === "background.pairwise_safety_preference.write",
    ),
  );
});

test("pairwise safety route and migration preserve RLS, idempotency, stale dependent artifacts, and generic responses", () => {
  const routeSource = readFileSync(
    "src/app/api/background/pairwise-safety-preferences/route.ts",
    "utf8",
  );
  const migrationSource = readFileSync(
    "supabase/migrations/20260615_background_claim_safety_controls.sql",
    "utf8",
  );
  const typesSource = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(routeSource, /background_pairwise_safety_write/);
  assert.match(routeSource, /background\.pairwise_safety_preference\.write/);
  assert.match(routeSource, /evaluateBackgroundPolicyDecision/);
  assert.match(routeSource, /background_opportunity_briefs/);
  assert.match(routeSource, /background_intro_packets/);
  assert.match(routeSource, /email_outbox/);
  assert.match(routeSource, /requesterSafeState/);
  const responsePayload =
    routeSource.match(/return \{\n    dependentArtifactInvalidation,[\s\S]*?  \};/)?.[0] ??
    "";
  assert.doesNotMatch(responsePayload, /scopeValueInternal|scope_value_internal/);
  assert.doesNotMatch(responsePayload, /reasonCode|reason_code/);
  assert.match(migrationSource, /background_pairwise_safety_preferences/);
  assert.match(migrationSource, /purpose_code_scope text generated always as/);
  assert.match(migrationSource, /background_pairwise_safety_unique_scope/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /participant_id = \(select auth\.uid\(\)\)/);
  assert.match(typesSource, /background_pairwise_safety_preferences/);
  assert.match(typesSource, /purpose_code_scope/);
});
