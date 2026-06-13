import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as getSensitiveEvidenceAttestationContract } from "@/app/api/moral-trade/sensitive-evidence-attestations/contract/route";
import { POST as enforceSensitiveEvidenceAttestation } from "@/app/api/moral-trade/sensitive-evidence-attestations/enforce/route";
import {
  evaluateMoralTradeSensitiveEvidenceAttestation,
  getMoralTradeSensitiveEvidenceAttestationContract,
  validateMoralTradeSensitiveEvidenceAttestationContract,
  type MoralTradeSensitiveEvidenceAttestationRecord,
} from "@/lib/moral-trade/sensitive-evidence-attestations";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function record(
  overrides: Partial<MoralTradeSensitiveEvidenceAttestationRecord> = {},
): MoralTradeSensitiveEvidenceAttestationRecord {
  return {
    recordId: "sensitive-evidence-attestation:test",
    subjectType: "evidence_record",
    subjectId: "evidence-record:test",
    evidencePathType: "private_receipt",
    claimType: "payment_receipt_verified",
    attestationPolicyRef: "policy-snapshot:sensitive-evidence-attestation-v1",
    policyStatus: "resolved_immutable",
    rawPrivateArtifactRefHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    attestationResultHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    uncertaintyStatement:
      "Receipt authenticity is high confidence but limited to this payment event.",
    scopeStatement:
      "Attestation covers payment receipt verification for this matched trade only.",
    challengeRoute: "/api/moral-trade/challenge-appeal/evaluate",
    disclosureMode: "counterparty_claim_typed_summary",
    privacyGrantStatus: "not_required",
    confidentialityReviewStatus: "passed",
    counterpartyReceivesRawArtifact: false,
    publicRawArtifact: false,
    resultState: "attested",
    reviewerDecisionRef: "review-decision:sensitive-evidence-attestation",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("sensitive-evidence attestation contract validates claim-typed privacy boundary", () => {
  const contract = getMoralTradeSensitiveEvidenceAttestationContract();
  const validation =
    validateMoralTradeSensitiveEvidenceAttestationContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_sensitive_evidence_attestations",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("sensitive_evidence_attestation"));
  assert.ok(contract.evidencePathTypes.includes("private_receipt"));
  assert.ok(contract.evidencePathTypes.includes("raw_private_artifact"));
  assert.ok(contract.claimTypes.includes("payment_receipt_verified"));
  assert.ok(contract.claimTypes.includes("uncertainty_present"));
  assert.ok(contract.disclosureModes.includes("attestation_only"));
  assert.ok(contract.privacyGrantStatuses.includes("granted_current"));
  assert.ok(contract.confidentialityReviewStatuses.includes("passed"));
  assert.match(contract.privacyRule, /claim-typed/i);
  assert.match(contract.privacyRule, /uncertainty/i);
  assert.match(contract.rawArtifactDisclosureRule, /privacy grant is current/i);
  assert.match(contract.challengeRule, /challenge-appeal/i);
});

test("missing sensitive-evidence attestation fails closed", () => {
  const evaluation = evaluateMoralTradeSensitiveEvidenceAttestation({
    transition: "counterparty_preview",
    attestationRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("sensitive_evidence_attestation_missing"));
});

test("raw artifact disclosure blocks unless privacy grant and confidentiality review pass", () => {
  const blocked = evaluateMoralTradeSensitiveEvidenceAttestation({
    transition: "matched_trade_lock",
    attestationRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      record({
        policyStatus: "mutable",
        rawPrivateArtifactRefHash: null,
        attestationResultHash: "not-a-hash",
        uncertaintyStatement: "",
        scopeStatement: "",
        challengeRoute: "/wrong-route",
        disclosureMode: "reviewer_raw_artifact",
        privacyGrantStatus: "missing",
        confidentialityReviewStatus: "under_review",
        counterpartyReceivesRawArtifact: true,
        publicRawArtifact: true,
        resultState: "under_review",
        reviewerDecisionRef: null,
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.rawArtifactDisclosureBlockerCount, 1);
  assert.ok(
    blocked.blockers.includes(
      "sensitive_evidence_attestation_policy_not_immutable:sensitive-evidence-attestation:test:mutable",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "sensitive_evidence_challenge_route_missing:sensitive-evidence-attestation:test",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "sensitive_evidence_counterparty_raw_artifact_disclosure_blocked:sensitive-evidence-attestation:test",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "sensitive_evidence_public_raw_artifact_disclosure_blocked:sensitive-evidence-attestation:test",
    ),
  );
  assert.ok(blocked.blockers.includes("sensitive_evidence_attested_result_missing"));
});

test("claim-typed attestation result with uncertainty, scope, and challenge route can pass", () => {
  const evaluation = evaluateMoralTradeSensitiveEvidenceAttestation({
    transition: "counterparty_preview",
    attestationRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [record()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.attestedRecordCount, 1);
  assert.equal(evaluation.privacyPreservingDisclosureCount, 1);
  assert.deepEqual(evaluation.blockers, []);
});

test("broader raw disclosure can pass only with current grant and passed confidentiality review", () => {
  const evaluation = evaluateMoralTradeSensitiveEvidenceAttestation({
    transition: "matched_trade_lock",
    attestationRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      record({
        disclosureMode: "privacy_grant_broader_disclosure",
        privacyGrantStatus: "granted_current",
        confidentialityReviewStatus: "passed",
        counterpartyReceivesRawArtifact: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.rawArtifactDisclosureBlockerCount, 0);
  assert.deepEqual(evaluation.blockers, []);
});

test("sensitive-evidence attestation route exposes only public contract metadata", async () => {
  const response = await getSensitiveEvidenceAttestationContract(
    new Request("http://localhost/api/moral-trade/sensitive-evidence-attestations/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.publicContract.claimTypes.includes("payment_receipt_verified"));
  assert.ok(body.publicContract.evidencePathTypes.includes("raw_private_artifact"));
  assert.match(body.publicContract.rawArtifactDisclosureRule, /privacy grant is current/i);
  assert.equal(
    body.publicContract.sensitiveEvidenceAttestationSampleEvaluationStatuses.counterparty_preview,
    "pass",
  );
  assert.ok(!JSON.stringify(body).includes("rawPrivateArtifactRefHash"));
});

test("sensitive-evidence attestation enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceSensitiveEvidenceAttestation(
    new Request("http://localhost/api/moral-trade/sensitive-evidence-attestations/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.sensitiveEvidenceAttestationGateStatus, "blocked");
  assert.equal(body.evidenceReviewAllowed, false);
  assert.equal(body.counterpartyPreviewAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.relianceAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.challengeResponseAllowed, false);
  assert.equal(body.rawArtifactDisclosureAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_sensitive_evidence_attestation_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("sensitive-evidence attestation contract is wired through API, health, spec, schema, and smoke tests", () => {
  const source = readRepoFile("src/lib/moral-trade/sensitive-evidence-attestations.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/sensitive-evidence-attestations/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/sensitive-evidence-attestations/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");
  const clearingPreviews = readRepoFile("src/lib/moral-trade/clearing-previews.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260612_zzz_moral_trade_sensitive_evidence_attestations.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_sensitive_evidence_attestation_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const smokeTest = readRepoFile("src/lib/public-route-smoke.test.ts");

  assert.match(source, /getMoralTradeSensitiveEvidenceAttestationContract/);
  assert.match(source, /sensitive_evidence_counterparty_raw_artifact_disclosure_blocked/);
  assert.match(route, /validateMoralTradeSensitiveEvidenceAttestationContract/);
  assert.match(route, /rawArtifactDisclosureRule/);
  assert.match(enforceRoute, /sensitive_evidence_attestation_enforce/);
  assert.match(enforceRoute, /moral_trade_sensitive_evidence_attestation_enforcement_records/);
  assert.match(enforceRoute, /rawArtifactDisclosureAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:sensitive_evidence_attestation_enforce/);
  assert.match(enforceRoute, /authentication_required:sensitive_evidence_attestation_enforce/);
  assert.match(healthRoute, /sensitiveEvidenceAttestationValidation/);
  assert.match(healthRoute, /sensitiveEvidenceAttestationFirstClassRecordTables/);
  assert.match(technicalSpec, /Sensitive-evidence attestations/);
  assert.match(technicalSpec, /sensitive-evidence-attestations\/contract/);
  assert.match(apiContractSource, /moral_trade_sensitive_evidence_attestation_contract/);
  assert.match(apiContractSource, /moral_trade_sensitive_evidence_attestation_enforce/);
  assert.match(apiRateLimit, /sensitive_evidence_attestation_enforce/);
  assert.match(operations, /sensitive_evidence_attestation_enforce/);
  assert.match(operationsProfile, /sensitive_evidence_attestation_enforce/);
  assert.match(apiContractProfile, /sensitive_evidence_attestation_contract_response/);
  assert.match(apiContractProfile, /sensitive_evidence_attestation_enforce_request/);
  assert.match(apiContractProfile, /sensitive_evidence_attestation_enforce_response/);
  assert.match(apiContractProfile, /moral_trade_sensitive_evidence_attestation_enforce/);
  assert.match(releaseGates, /sensitive_evidence_privacy_preserving_attestation_test/);
  assert.match(clearingPreviews, /sensitiveEvidenceAttestationStatus/);
  assert.match(migration, /moral_trade_sensitive_evidence_attestations/);
  assert.match(migration, /sensitive_evidence_attestation/);
  assert.match(migration, /privacy grant and passed confidentiality review/i);
  assert.match(enforcementMigration, /moral_trade_sensitive_evidence_attestation_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /raw_artifact_disclosure_allowed_bool = false/);
  assert.match(enforcementMigration, /challenge_response_allowed_bool = false/);
  assert.match(enforcementMigration, /payout_release_allowed_bool = false/);
  assert.match(schema, /moral_trade_sensitive_evidence_attestations/);
  assert.match(schema, /moral_trade_sensitive_evidence_attestation_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_sensitive_evidence_attestations/);
  assert.match(databaseTypes, /moral_trade_sensitive_evidence_attestation_enforcement_records/);
  assert.match(smokeTest, /sensitiveEvidenceAttestationSource/);
});
