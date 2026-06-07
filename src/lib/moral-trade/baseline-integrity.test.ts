import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeBaselineIntegrity,
  getMoralTradeBaselineIntegrityContract,
  validateMoralTradeBaselineIntegrityContract,
  type MoralTradeBaselineIntegrityAssessmentRecord,
  type MoralTradeBaselineIntegrityPolicyRecord,
} from "@/lib/moral-trade/baseline-integrity";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradeBaselineIntegrityPolicyRecord> = {},
): MoralTradeBaselineIntegrityPolicyRecord {
  return {
    policyId: "baseline-integrity-policy-offset",
    subjectType: "offset_offer",
    status: "passed",
    predatesOfferRequired: true,
    independentReasonRequired: true,
    historyEvidenceRequired: true,
    additionalityReviewRequired: true,
    externalityReviewRequired: true,
    reviewerQualityRequired: true,
    participantConfirmationRequired: true,
    goodFaithConfidenceSeparationRequired: true,
    privateEvidencePublicationProhibited: true,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    maxAssessmentAgeDays: 90,
    ...overrides,
  };
}

function assessment(
  overrides: Partial<MoralTradeBaselineIntegrityAssessmentRecord> = {},
): MoralTradeBaselineIntegrityAssessmentRecord {
  return {
    assessmentId: "baseline-integrity-assessment-offset",
    policyRef: "baseline-integrity-policy-offset",
    subjectType: "offset_offer",
    subjectRef: "offset-offer:sample",
    assessmentState: "non_blocking",
    launchClassification: "clearable_moral_trade",
    baselineSourceKind: "historical_pattern",
    baselineSnapshotHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    predatesOffer: true,
    independentReasonPresent: true,
    historyEvidencePresent: true,
    marketplaceCreated: false,
    marketplaceEscalated: false,
    counterpartyTriggeredEscalation: false,
    harmfulBaselineEscalated: false,
    goodFaithConfidenceSeparated: true,
    additionalityReviewStatus: "passed",
    externalityReviewStatus: "passed",
    reviewerQualityStatus: "passed",
    participantConfirmationStatus: "passed",
    privateEvidencePublic: false,
    assessmentHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-07-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("baseline-integrity contract validates first-class records and states", () => {
  const contract = getMoralTradeBaselineIntegrityContract();
  const validation = validateMoralTradeBaselineIntegrityContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_baseline_integrity_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_baseline_integrity_assessments",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("baseline_integrity"));
  assert.ok(contract.policySnapshotSubjects.includes("baseline_manufacturing"));
  assert.ok(contract.transitions.includes("donation_offset_lock"));
  assert.ok(contract.transitions.includes("pledge_swap_lock"));
  assert.ok(contract.subjectTypes.includes("offset_offer"));
  assert.ok(contract.subjectTypes.includes("pledge_swap_offer"));
  assert.ok(contract.assessmentStates.includes("non_blocking"));
  assert.ok(contract.baselineSourceKinds.includes("marketplace_escalated"));
  assert.ok(contract.failClosedStatuses.includes("marketplace_created_baseline"));
  assert.ok(contract.failClosedStatuses.includes("good_faith_confidence_conflated"));
  assert.ok(contract.failClosedStatuses.includes("additionality_review_missing"));
  assert.match(contract.failClosedRule, /Manufactured baselines are not moral trade/i);
});

test("missing policy and assessment fail closed before donation offset lock", () => {
  const evaluation = evaluateMoralTradeBaselineIntegrity({
    transition: "donation_offset_lock",
    subjectType: "offset_offer",
    requiresClearableTransition: true,
    requiresRelianceBearingTransition: false,
    requiresAssessment: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [],
    assessments: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("policy_missing:offset_offer"));
  assert.ok(evaluation.blockers.includes("assessment_missing:donation_offset_lock"));
});

test("marketplace-created or escalated baseline blocks clearable launch", () => {
  const blocked = evaluateMoralTradeBaselineIntegrity({
    transition: "pledge_swap_lock",
    subjectType: "pledge_swap_offer",
    requiresClearableTransition: true,
    requiresRelianceBearingTransition: true,
    requiresAssessment: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [
      policy({
        policyId: "baseline-integrity-policy-pledge",
        subjectType: "pledge_swap_offer",
      }),
    ],
    assessments: [
      assessment({
        assessmentId: "baseline-integrity-assessment-pledge",
        policyRef: "baseline-integrity-policy-pledge",
        subjectType: "pledge_swap_offer",
        assessmentState: "under_review",
        launchClassification: "preview_only",
        baselineSourceKind: "marketplace_created",
        baselineSnapshotHash: null,
        predatesOffer: false,
        independentReasonPresent: false,
        historyEvidencePresent: false,
        marketplaceCreated: true,
        marketplaceEscalated: true,
        counterpartyTriggeredEscalation: true,
        harmfulBaselineEscalated: true,
        goodFaithConfidenceSeparated: false,
        additionalityReviewStatus: "missing",
        externalityReviewStatus: "under_review",
        reviewerQualityStatus: "failed",
        participantConfirmationStatus: "missing",
        privateEvidencePublic: true,
        assessmentHash: "invalid-hash",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "assessment_under_review:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "launch_classification_not_clearable:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "baseline_snapshot_missing:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "marketplace_created_baseline:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "marketplace_escalated_baseline:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "counterparty_triggered_escalation:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "harmful_baseline_escalated:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "good_faith_confidence_conflated:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "additionality_review_missing:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "externality_review_missing:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "reviewer_quality_missing:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "participant_confirmation_missing:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "private_evidence_public:baseline-integrity-assessment-pledge",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "invalid_assessment_hash:baseline-integrity-assessment-pledge",
    ),
  );
});

test("non-blocking reviewed baseline assessment can pass", () => {
  const passed = evaluateMoralTradeBaselineIntegrity({
    transition: "donation_offset_lock",
    subjectType: "offset_offer",
    requiresClearableTransition: true,
    requiresRelianceBearingTransition: false,
    requiresAssessment: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policy()],
    assessments: [assessment()],
  });

  assert.equal(passed.status, "pass");
  assert.equal(passed.launchClassification, "clearable_moral_trade");
  assert.deepEqual(passed.blockers, []);
});

test("baseline-integrity route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/baseline-integrity.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/baseline-integrity/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzzz_moral_trade_baseline_integrity_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeBaselineIntegrityContract/);
  assert.match(source, /evaluateMoralTradeBaselineIntegrity/);
  assert.match(source, /Manufactured baselines are not moral trade/);
  assert.match(route, /public_contract_read/);
  assert.match(route, /baselineIntegritySampleEvaluationStatuses/);
  assert.match(healthRoute, /baselineIntegrityValidation/);
  assert.match(healthRoute, /baselineIntegrityTransitionKeys/);
  assert.match(technicalSpec, /Baseline-integrity contract/);
  assert.match(technicalSpec, /Open baseline-integrity JSON/);
  assert.match(apiContractSource, /moral_trade_baseline_integrity_contract/);
  assert.match(apiContractProfile, /baseline_integrity_contract_response/);
  assert.match(apiContractProfile, /moral_trade_baseline_integrity_contract/);
  assert.match(migration, /moral_trade_baseline_integrity_policies/);
  assert.match(migration, /moral_trade_baseline_integrity_assessments/);
  assert.match(migration, /baseline_manufacturing/);
  assert.match(migration, /marketplace_created/);
  assert.match(schema, /moral_trade_baseline_integrity_policies/);
  assert.match(schema, /moral_trade_baseline_integrity_assessments/);
  assert.match(schema, /baseline_manufacturing/);
  assert.match(databaseTypes, /moral_trade_baseline_integrity_policies/);
  assert.match(databaseTypes, /moral_trade_baseline_integrity_assessments/);
});
