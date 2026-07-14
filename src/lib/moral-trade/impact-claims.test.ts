import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeImpactClaim,
  getMoralTradeImpactClaimContract,
  validateMoralTradeImpactClaimContract,
  type MoralTradeImpactClaimPolicyRecord,
  type MoralTradeImpactClaimRecord,
} from "@/lib/moral-trade/impact-claims";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradeImpactClaimPolicyRecord> = {},
): MoralTradeImpactClaimPolicyRecord {
  return {
    policyId: "impact-policy-causal",
    policyVersion: "moral-trade-impact-claims-v0.1-2026-06",
    claimType: "causal_impact_claim",
    policySnapshotStatus: "resolved_immutable",
    evidenceRequired: true,
    uncertaintyDisclosureRequired: true,
    transferSeparationRequired: true,
    contentModerationRequired: true,
    reviewerQualityRequired: true,
    privilegedActionRequired: true,
    auditIntegrityRequired: true,
    publicMetricSuppressionRequired: true,
    minEvidenceRefs: 2,
    methodologyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function claim(
  overrides: Partial<MoralTradeImpactClaimRecord> = {},
): MoralTradeImpactClaimRecord {
  return {
    claimId: "impact-claim-causal",
    surface: "transparency_report",
    claimType: "causal_impact_claim",
    publicationStatus: "reviewed",
    methodologyPolicyRef: "impact-policy-causal",
    evidenceRefs: ["evidence:outcome", "evidence:uncertainty"],
    evidenceClaimTypes: ["impact_outcome", "impact_methodology", "uncertainty_analysis"],
    uncertaintyDisclosure:
      "Estimated outcome uncertainty remains high and causality is limited to reviewed evidence.",
    transferVsImpactLabel:
      "Gross transfer, net payout, sponsor leverage, and causal impact are separate claims.",
    grossTransferAmountDisplayed: true,
    netRecipientPayoutDisplayed: true,
    sponsorLeverageDisplayed: true,
    paymentEvidenceUsedAsImpact: false,
    impactClaimTextPublic: true,
    contentModerationStatus: "passed",
    reviewerQualityStatus: "passed",
    privilegedActionStatus: "passed",
    auditIntegrityStatus: "passed",
    publicMetricSuppressionStatus: "passed",
    privateEvidencePublic: false,
    claimHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("impact-claim contract validates methodology, evidence, and transfer separation", () => {
  const contract = getMoralTradeImpactClaimContract();
  const validation = validateMoralTradeImpactClaimContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_impact_claim_records"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_impact_claim_methodology_policies",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("impact_claim_methodology"));
  assert.ok(contract.claimTypes.includes("transfer_metric"));
  assert.ok(contract.claimTypes.includes("causal_impact_claim"));
  assert.ok(contract.claimTypes.includes("cost_effectiveness_claim"));
  assert.ok(contract.evidenceClaimTypes.includes("payment_receipt"));
  assert.ok(contract.evidenceClaimTypes.includes("impact_outcome"));
  assert.ok(contract.failClosedStatuses.includes("transfer_metric_used_as_impact"));
  assert.ok(contract.failClosedStatuses.includes("payment_evidence_used_as_impact"));
  assert.match(contract.failClosedRule, /Transfers are not impact/i);
});

test("missing methodology policy and claim record fail closed", () => {
  const evaluation = evaluateMoralTradeImpactClaim({
    surface: "transparency_report",
    claimType: "causal_impact_claim",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [],
    claims: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "methodology_policy_missing:causal_impact_claim",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "impact_claim_record_missing:transparency_report:causal_impact_claim",
    ),
  );
});

test("payment evidence, missing uncertainty, and missing approvals block impact claims", () => {
  const blocked = evaluateMoralTradeImpactClaim({
    surface: "transparency_report",
    claimType: "causal_impact_claim",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policy()],
    claims: [
      claim({
        publicationStatus: "under_review",
        methodologyPolicyRef: null,
        evidenceRefs: ["payment:receipt"],
        evidenceClaimTypes: ["payment_receipt"],
        uncertaintyDisclosure: null,
        transferVsImpactLabel: null,
        paymentEvidenceUsedAsImpact: true,
        contentModerationStatus: "under_review",
        reviewerQualityStatus: "missing",
        privilegedActionStatus: "missing",
        auditIntegrityStatus: "missing",
        publicMetricSuppressionStatus: "missing",
        privateEvidencePublic: true,
        claimHash: "not-a-hash",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("impact_claim_under_review:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("methodology_policy_ref_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("evidence_refs_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("evidence_claim_type_mismatch:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("uncertainty_disclosure_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("transfer_vs_impact_label_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("payment_evidence_used_as_impact:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("content_moderation_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("reviewer_quality_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("privileged_action_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("audit_integrity_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("public_metric_suppression_missing:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("private_evidence_public:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("invalid_claim_hash:impact-claim-causal"));
});

test("reviewed methodology, impact evidence, uncertainty, and approvals can pass", () => {
  const passed = evaluateMoralTradeImpactClaim({
    surface: "transparency_report",
    claimType: "causal_impact_claim",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policy()],
    claims: [claim()],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
});

test("transfer metrics can pass only when separated from public impact claims", () => {
  const transferPolicy = policy({
    claimType: "transfer_metric",
    privilegedActionRequired: false,
    uncertaintyDisclosureRequired: false,
    minEvidenceRefs: 1,
  });
  const transferRecord = claim({
    surface: "public_dashboard",
    claimType: "transfer_metric",
    impactClaimTextPublic: false,
    evidenceRefs: ["metric:gross-transfer"],
    evidenceClaimTypes: ["transfer_metric"],
    uncertaintyDisclosure: null,
    privilegedActionStatus: "not_required_for_stage",
  });

  const passed = evaluateMoralTradeImpactClaim({
    surface: "public_dashboard",
    claimType: "transfer_metric",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [transferPolicy],
    claims: [transferRecord],
  });
  const blocked = evaluateMoralTradeImpactClaim({
    surface: "public_dashboard",
    claimType: "transfer_metric",
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [transferPolicy],
    claims: [
      claim({
        ...transferRecord,
        impactClaimTextPublic: true,
        transferVsImpactLabel: null,
      }),
    ],
  });

  assert.equal(passed.status, "pass");
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("transfer_metric_used_as_impact:impact-claim-causal"));
  assert.ok(blocked.blockers.includes("transfer_vs_impact_label_missing:impact-claim-causal"));
});

test("impact-claim route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/impact-claims.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/impact-claims/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzz_moral_trade_impact_claim_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeImpactClaimContract/);
  assert.match(source, /evaluateMoralTradeImpactClaim/);
  assert.match(source, /Transfers are not impact/);
  assert.match(route, /public_contract_read/);
  assert.match(route, /impactClaimSampleEvaluationStatuses/);
  assert.match(healthRoute, /impactClaimValidation/);
  assert.match(healthRoute, /impactClaimClaimTypes/);
  assert.match(technicalSpec, /Impact-claim contract/);
  assert.match(technicalSpec, /Open impact-claim JSON/);
  assert.match(apiContractSource, /moral_trade_impact_claim_contract/);
  assert.match(apiContractProfile, /impact_claim_contract_response/);
  assert.match(apiContractProfile, /moral_trade_impact_claim_contract/);
  assert.match(migration, /moral_trade_impact_claim_methodology_policies/);
  assert.match(migration, /moral_trade_impact_claim_records/);
  assert.match(migration, /impact_claim_methodology/);
  assert.match(schema, /moral_trade_impact_claim_records/);
  assert.match(schema, /payment_evidence_used_as_impact_bool/);
  assert.match(databaseTypes, /moral_trade_impact_claim_methodology_policies/);
  assert.match(databaseTypes, /moral_trade_impact_claim_records/);
});
