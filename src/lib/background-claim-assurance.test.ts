import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION,
  buildBackgroundClaimAssuranceRecord,
  evaluateBackgroundClaimAssurance,
  findBackgroundClaimAssuranceTaxonomyEntry,
} from "@/lib/background-claim-safety";
import {
  evaluateBackgroundPolicyDecision,
  getBackgroundActionKindRegistry,
  getBackgroundArtifactTransitionPolicyBundle,
  getBackgroundClaimAssuranceTaxonomyBundle,
  getBackgroundOutputSchemaBundle,
  getBackgroundPolicyCompositionBundle,
  getBackgroundRetentionPolicyBundle,
} from "@/lib/background-phase-gates";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

const PARTICIPANT_ID = "11111111-1111-4111-8111-111111111111";
const FUTURE_EXPIRY = "2099-01-01T00:00:00.000Z";

type ClaimAssuranceBuildRow = NonNullable<
  ReturnType<typeof buildBackgroundClaimAssuranceRecord>["row"]
>;

function buildApprovedFundingCapacity() {
  return buildBackgroundClaimAssuranceRecord({
    allowedPurposeCodes: ["moral_trade_offer"],
    allowedSurfaceKeys: ["broad_profile"],
    assuranceLevel: "operator_reviewed",
    broadClaimKey: "funding_capacity",
    claimKind: "funding_capacity",
    evidenceState: "redacted_summary",
    expiresAt: FUTURE_EXPIRY,
    participantId: PARTICIPANT_ID,
    redactedEvidenceSummary: "Operator reviewed a broad funding-capacity summary.",
    reviewState: "approved",
  });
}

function claimRecord(row: ClaimAssuranceBuildRow) {
  return {
    allowed_purpose_bindings: row.allowed_purpose_bindings ?? [],
    allowed_surface_keys: row.allowed_surface_keys ?? [],
    assurance_level: row.assurance_level ?? "self_attested",
    broad_claim_key: row.broad_claim_key,
    claim_assurance_taxonomy_hash_snapshot:
      row.claim_assurance_taxonomy_hash_snapshot,
    claim_assurance_taxonomy_version_snapshot:
      row.claim_assurance_taxonomy_version_snapshot,
    claim_kind: row.claim_kind,
    evidence_state: row.evidence_state ?? "none",
    expires_at: row.expires_at,
    review_state: row.review_state ?? "pending",
  };
}

test("claim assurance records are deterministic, broad, and taxonomy-snapshotted", () => {
  const first = buildApprovedFundingCapacity();
  const second = buildApprovedFundingCapacity();

  assert.deepEqual(first.errors, []);
  assert.deepEqual(second.errors, []);
  assert.equal(first.row?.assurance_version, second.row?.assurance_version);
  assert.match(first.row?.assurance_version ?? "", /^claim-assurance-v1:/);
  assert.equal(first.row?.allowed_purpose_bindings?.[0]?.purposeCode, "moral_trade_offer");
  assert.equal(
    first.row?.allowed_purpose_bindings?.[0]?.purposePolicyVersion,
    BACKGROUND_PURPOSE_POLICY_VERSION,
  );
  assert.ok(first.row?.claim_assurance_taxonomy_hash_snapshot);
  assert.ok(first.row?.claim_assurance_taxonomy_version_snapshot);
});

test("high-impact claim influence fails closed while the Phase 2 taxonomy is disabled", () => {
  const record = buildApprovedFundingCapacity();
  const taxonomyEntry = findBackgroundClaimAssuranceTaxonomyEntry({
    broadClaimKey: "funding_capacity",
    claimKind: "funding_capacity",
  });
  const decision = evaluateBackgroundClaimAssurance({
    purposeCode: "moral_trade_offer",
    record: record.row ? claimRecord(record.row) : null,
    surface: "broad_profile",
    taxonomyEntry,
  });

  assert.equal(taxonomyEntry?.status, "disabled");
  assert.equal(decision.allowed, false);
  assert.ok(decision.blockerCodes.includes("claim_assurance_taxonomy_disabled"));
  assert.ok(decision.blockerCodes.includes("claim_assurance_taxonomy_surface_disabled"));
  assert.equal(decision.safeLabel, "assurance unavailable");
});

test("claim assurance validation rejects exact evidence and stale or under-scoped records", () => {
  const exact = buildBackgroundClaimAssuranceRecord({
    allowedPurposeCodes: ["moral_trade_offer"],
    allowedSurfaceKeys: ["broad_profile"],
    assuranceLevel: "self_attested",
    broadClaimKey: "credential_or_expertise",
    claimKind: "credential",
    evidenceState: "redacted_summary",
    expiresAt: FUTURE_EXPIRY,
    participantId: PARTICIPANT_ID,
    redactedEvidenceSummary: "Credential number ABC-123 belongs to alice@example.org.",
    reviewState: "pending",
  });
  const record = buildApprovedFundingCapacity();
  const wrongPurpose = evaluateBackgroundClaimAssurance({
    purposeCode: "research_collaboration",
    record: record.row ? claimRecord(record.row) : null,
    surface: "broad_profile",
  });
  const expired = evaluateBackgroundClaimAssurance({
    now: new Date("2100-01-01T00:00:00.000Z"),
    purposeCode: "moral_trade_offer",
    record: record.row ? claimRecord(record.row) : null,
    surface: "broad_profile",
  });

  assert.ok(exact.errors.some((error) => error.includes("must not contain contact details")));
  assert.ok(wrongPurpose.blockerCodes.includes("claim_assurance_purpose_out_of_scope"));
  assert.ok(expired.blockerCodes.includes("claim_assurance_expired"));
});

test("claim assurance action is governed by policy, retention, composition, transition, and output schema bundles", () => {
  const registry = getBackgroundActionKindRegistry();
  const schemas = getBackgroundOutputSchemaBundle();
  const retention = getBackgroundRetentionPolicyBundle();
  const composition = getBackgroundPolicyCompositionBundle();
  const transitions = getBackgroundArtifactTransitionPolicyBundle();
  const taxonomy = getBackgroundClaimAssuranceTaxonomyBundle();
  const decision = evaluateBackgroundPolicyDecision({
    actionKind: "background.claim_assurance.record",
    actorRole: "participant",
    idempotencyKey: `${PARTICIPANT_ID}:claim-assurance:v1`,
    laneKey: "claim_assurance_records",
    outputSchemaVersion: BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION,
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  });
  const schema = schemas.find(
    (row) => row.schemaKey === BACKGROUND_CLAIM_ASSURANCE_RESPONSE_SCHEMA_VERSION,
  );

  assert.equal(decision.verdict, "allow");
  assert.ok(registry.some((entry) => entry.actionKind === "background.claim_assurance.record"));
  assert.equal(schema?.schemaSurface, "requester_claim_assurance");
  assert.ok(
    schema?.allowedKeys.every(
      (key) => !/(?:candidate|counterparty|profile_id|raw|exact|contact|private|debug|timing)/i.test(key),
    ),
  );
  assert.ok(retention.some((row) => row.artifactKind === "claim_assurance_record"));
  assert.ok(composition.some((row) => row.controlFamilies.includes("claim_assurance")));
  assert.ok(
    transitions.some(
      (row) =>
        row.artifactKind === "claim_assurance" &&
        row.requiredActionKind === "background.claim_assurance.record",
    ),
  );
  assert.ok(taxonomy.every((row) => row.status === "disabled"));
});

test("claim assurance route and migration enforce auth, review authority, RLS, and privacy-safe response keys", () => {
  const routeSource = readFileSync(
    "src/app/api/background/claim-assurance-records/route.ts",
    "utf8",
  );
  const migrationSource = readFileSync(
    "supabase/migrations/20260615_background_claim_safety_controls.sql",
    "utf8",
  );
  const typesSource = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(routeSource, /background_claim_assurance_write/);
  assert.match(routeSource, /background\.claim_assurance\.record/);
  assert.match(routeSource, /evaluateBackgroundPolicyDecision/);
  assert.match(routeSource, /isAdminEmail/);
  assert.match(routeSource, /Operator review is required/);
  assert.doesNotMatch(routeSource, /redactedEvidenceSummary[^;]*return/);
  assert.match(migrationSource, /background_claim_assurance_records/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /participant_id = \(select auth\.uid\(\)\)/);
  assert.match(typesSource, /background_claim_assurance_records/);
});
