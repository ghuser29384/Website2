import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradePrivacyGovernance,
  getMoralTradePrivacyGovernanceContract,
  validateMoralTradePrivacyGovernanceContract,
  type MoralTradePrivacyAccessLogRecord,
  type MoralTradePrivacyDisclosureReviewRecord,
  type MoralTradePrivacyGrantPolicyRecord,
  type MoralTradePrivacyGrantRecord,
} from "@/lib/moral-trade/privacy-governance";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradePrivacyGrantPolicyRecord> = {},
): MoralTradePrivacyGrantPolicyRecord {
  return {
    policyId: "privacy-policy-contact",
    policyVersion: "moral-trade-privacy-governance-v0.1-2026-06",
    surface: "contact_introduction",
    policySnapshotStatus: "resolved_immutable",
    grantRequired: true,
    accessLogRequired: true,
    roleLimitRequired: true,
    purposeLimitRequired: true,
    revocableGrantRequired: true,
    expiryRequired: true,
    dataSecurityReviewRequired: true,
    confidentialityReviewRequired: true,
    reviewerQualityRequired: true,
    accountSecurityRequired: true,
    participantConfirmationRequired: true,
    externalAuthorityRequired: false,
    redactionRequired: false,
    publicRedactionPolicyRequired: false,
    maxAccessLogAgeDays: 30,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function grant(
  overrides: Partial<MoralTradePrivacyGrantRecord> = {},
): MoralTradePrivacyGrantRecord {
  return {
    grantId: "privacy-grant-contact",
    fieldKey: "contact_email",
    accessLevel: "contact",
    audienceStage: "introduced",
    status: "granted",
    purposeCode: "contact_introduction",
    ownerProfileHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    counterpartyProfileHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    revocable: true,
    grantHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function accessLog(
  grantRecord: MoralTradePrivacyGrantRecord,
  overrides: Partial<MoralTradePrivacyAccessLogRecord> = {},
): MoralTradePrivacyAccessLogRecord {
  return {
    logId: "privacy-access-contact",
    grantId: grantRecord.grantId,
    surface: "contact_introduction",
    privacyPolicyRef: "privacy-policy-contact",
    actorRole: "reviewer",
    purposeCode: grantRecord.purposeCode,
    fieldKey: grantRecord.fieldKey,
    accessDecision: "allowed",
    privateDataReturned: true,
    rawPrivateArtifactReturned: false,
    redactionApplied: false,
    roleLimited: true,
    purposeLimited: true,
    counterpartyDisclosure: true,
    publicDisclosure: false,
    accessHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    occurredAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function review(
  grantRecord: MoralTradePrivacyGrantRecord,
  overrides: Partial<MoralTradePrivacyDisclosureReviewRecord> = {},
): MoralTradePrivacyDisclosureReviewRecord {
  return {
    reviewId: "privacy-review-contact",
    grantId: grantRecord.grantId,
    surface: "contact_introduction",
    privacyPolicyRef: "privacy-policy-contact",
    reviewStatus: "passed",
    confidentialityReviewStatus: "passed",
    dataSecurityStatus: "passed",
    reviewerQualityStatus: "passed",
    accountSecurityStatus: "passed",
    participantConfirmationStatus: "passed",
    externalAuthorityStatus: "not_required_for_stage",
    reviewHash:
      "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("privacy-governance contract validates grant and access-log coverage", () => {
  const contract = getMoralTradePrivacyGovernanceContract();
  const validation = validateMoralTradePrivacyGovernanceContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.existingRecordTables.includes("privacy_grants"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_privacy_grant_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_privacy_access_logs"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_privacy_disclosure_reviews"));
  assert.ok(contract.policySnapshotSubjects.includes("privacy_disclosure"));
  assert.ok(contract.surfaces.includes("reviewer_access"));
  assert.ok(contract.surfaces.includes("contact_introduction"));
  assert.ok(contract.surfaces.includes("public_redacted_publication"));
  assert.ok(contract.failClosedStatuses.includes("access_log_missing"));
  assert.ok(contract.failClosedStatuses.includes("raw_private_artifact_returned"));
  assert.match(contract.failClosedRule, /No private disclosure without a reconstructible ledger/i);
});

test("missing policy, grant, access log, and review fail closed", () => {
  const evaluation = evaluateMoralTradePrivacyGovernance({
    surface: "contact_introduction",
    requestedFieldKey: "contact_email",
    requestedAudienceStage: "introduced",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [],
    grants: [],
    accessLogs: [],
    reviews: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("policy_missing:contact_introduction"));
  assert.ok(evaluation.blockers.includes("grant_missing:contact_introduction:contact_email"));
});

test("revoked grants, raw private artifacts, missing purpose limits, and failed reviews block", () => {
  const policyRecord = policy();
  const grantRecord = grant({ status: "revoked", purposeCode: "" });
  const blocked = evaluateMoralTradePrivacyGovernance({
    surface: "contact_introduction",
    requestedFieldKey: "contact_email",
    requestedAudienceStage: "introduced",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    grants: [grantRecord],
    accessLogs: [
      accessLog(grantRecord, {
        accessDecision: "blocked",
        purposeCode: "",
        purposeLimited: false,
        roleLimited: false,
        rawPrivateArtifactReturned: true,
      }),
    ],
    reviews: [
      review(grantRecord, {
        dataSecurityStatus: "failed",
        confidentialityReviewStatus: "under_review",
        reviewerQualityStatus: "missing",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("grant_revoked:privacy-grant-contact"));
  assert.ok(blocked.blockers.includes("grant_purpose_missing:privacy-grant-contact"));
  assert.ok(blocked.blockers.includes("purpose_limit_missing:privacy-access-contact"));
  assert.ok(blocked.blockers.includes("role_limit_missing:privacy-access-contact"));
  assert.ok(blocked.blockers.includes("raw_private_artifact_returned:privacy-access-contact"));
  assert.ok(blocked.blockers.includes("data_security_unresolved:privacy-review-contact"));
  assert.ok(blocked.blockers.includes("confidentiality_review_missing:privacy-review-contact"));
  assert.ok(blocked.blockers.includes("reviewer_quality_missing:privacy-review-contact"));
});

test("current grant, purpose-limited access log, and disclosure review can pass", () => {
  const policyRecord = policy();
  const grantRecord = grant();
  const passed = evaluateMoralTradePrivacyGovernance({
    surface: "contact_introduction",
    requestedFieldKey: "contact_email",
    requestedAudienceStage: "introduced",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policyRecord],
    grants: [grantRecord],
    accessLogs: [accessLog(grantRecord)],
    reviews: [review(grantRecord)],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
});

test("privacy-governance route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/privacy-governance.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/privacy-governance/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzz_moral_trade_privacy_governance_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradePrivacyGovernanceContract/);
  assert.match(source, /evaluateMoralTradePrivacyGovernance/);
  assert.match(source, /No private disclosure without a reconstructible ledger/);
  assert.match(route, /public_contract_read/);
  assert.match(route, /privacyGovernanceSampleEvaluationStatuses/);
  assert.match(healthRoute, /privacyGovernanceValidation/);
  assert.match(healthRoute, /privacyGovernanceSurfaces/);
  assert.match(technicalSpec, /Privacy-governance contract/);
  assert.match(technicalSpec, /Open privacy-governance JSON/);
  assert.match(apiContractSource, /moral_trade_privacy_governance_contract/);
  assert.match(apiContractProfile, /privacy_governance_contract_response/);
  assert.match(apiContractProfile, /moral_trade_privacy_governance_contract/);
  assert.match(migration, /moral_trade_privacy_grant_policies/);
  assert.match(migration, /moral_trade_privacy_access_logs/);
  assert.match(migration, /moral_trade_privacy_disclosure_reviews/);
  assert.match(migration, /privacy_policy_ref/);
  assert.match(schema, /moral_trade_privacy_access_logs/);
  assert.match(schema, /privacy_policy_ref/);
  assert.match(databaseTypes, /moral_trade_privacy_grant_policies/);
  assert.match(databaseTypes, /moral_trade_privacy_access_logs/);
  assert.match(databaseTypes, /moral_trade_privacy_disclosure_reviews/);
});
