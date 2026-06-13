import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceProtectiveAssessment } from "@/app/api/moral-trade/protective-assessments/enforce/route";

import {
  evaluateMoralTradeProtectiveAssessments,
  getMoralTradeProtectiveAssessmentContract,
  validateMoralTradeProtectiveAssessmentContract,
  type MoralTradeProtectiveAssessmentDimension,
  type MoralTradeProtectiveAssessmentRecord,
} from "./protective-assessments";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function assessmentRecord(
  dimension: MoralTradeProtectiveAssessmentDimension,
  overrides: Partial<MoralTradeProtectiveAssessmentRecord> = {},
): MoralTradeProtectiveAssessmentRecord {
  return {
    assessmentId: `protective-assessment:test:${dimension}`,
    subjectType: "pledge_swap",
    subjectRef: "pledge-swap:test",
    assessmentDimension: dimension,
    assessmentState: "non_blocking",
    riskTrigger: "possible",
    policySnapshotStatus: "resolved_immutable",
    assessmentHash: hashFor(dimension),
    userFacingReasonCategory: "Safety, legality, privacy, or authority review",
    evidencePlanState: "least_intrusive_approved",
    neutralReviewState: "approved_neutral",
    reviewerQualityState: "authorized",
    participantNoticeState: "sent",
    appealPathState: "available",
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-12-08T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function allPassingRecords() {
  const contract = getMoralTradeProtectiveAssessmentContract();
  return contract.assessmentDimensions.map((dimension) =>
    assessmentRecord(dimension),
  );
}

test("protective-assessment contract validates first-class safety assessment governance", () => {
  const contract = getMoralTradeProtectiveAssessmentContract();
  const validation = validateMoralTradeProtectiveAssessmentContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_protective_assessment_records",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_negative_commitment_scopes",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_action_reversibility_assessments",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_donor_of_record_tax_reviews",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_authority_obligation_assessments",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("protective_assessment"));
  assert.ok(
    contract.policySnapshotSubjects.includes(
      "reporting_integrity_assessment",
    ),
  );
  assert.ok(
    contract.policySnapshotSubjects.includes(
      "civil_rights_discrimination_assessment",
    ),
  );
  assert.ok(
    contract.policySnapshotSubjects.includes(
      "cyber_abuse_digital_integrity_assessment",
    ),
  );
  assert.ok(
    contract.assessmentDimensions.includes(
      "evidence_authenticity_synthetic_media",
    ),
  );
  assert.ok(
    contract.assessmentDimensions.includes(
      "financial_crime_fraud_source_of_funds",
    ),
  );
  assert.match(contract.privacyBoundary, /participant-specific assessment records/);
});

test("draft preview passes, but matched-trade lock requires every protective assessment", () => {
  const preview = evaluateMoralTradeProtectiveAssessments({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredDimensionCount, 0);

  const lock = evaluateMoralTradeProtectiveAssessments({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [],
  });

  assert.equal(lock.status, "blocked");
  assert.ok(
    lock.blockers.includes(
      "protective_assessment_record_required:reporting_integrity_non_suppression",
    ),
  );
  assert.ok(
    lock.blockers.includes(
      "protective_assessment_record_required:financial_crime_fraud_source_of_funds",
    ),
  );
  assert.deepEqual(lock.userFacingBlockerCategories, [
    "Protective assessments need review before lock",
  ]);
});

test("complete non-blocking assessment bundle can pass lock", () => {
  const result = evaluateMoralTradeProtectiveAssessments({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: allPassingRecords(),
  });

  const contract = getMoralTradeProtectiveAssessmentContract();

  assert.equal(result.status, "pass");
  assert.equal(result.requiredDimensionCount, contract.assessmentDimensions.length);
  assert.equal(result.passingAssessmentCount, contract.assessmentDimensions.length);
  assert.deepEqual(result.blockers, []);
});

test("confirmed reporting, privacy, evidence, and financial-crime risks block payment", () => {
  const result = evaluateMoralTradeProtectiveAssessments({
    transition: "payment_capture",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      ...allPassingRecords().filter(
        (record) =>
          ![
            "reporting_integrity_non_suppression",
            "confidentiality_privacy_rights",
            "evidence_authenticity_synthetic_media",
            "financial_crime_fraud_source_of_funds",
          ].includes(record.assessmentDimension),
      ),
      assessmentRecord("reporting_integrity_non_suppression", {
        assessmentState: "blocked",
        riskTrigger: "confirmed",
      }),
      assessmentRecord("confidentiality_privacy_rights", {
        evidencePlanState: "invasive_without_review",
      }),
      assessmentRecord("evidence_authenticity_synthetic_media", {
        policySnapshotStatus: "mutable",
      }),
      assessmentRecord("financial_crime_fraud_source_of_funds", {
        neutralReviewState: "counterparty_benefits",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "protective_assessment_not_non_blocking:reporting_integrity_non_suppression:blocked",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "confirmed_risk_not_non_blocking:reporting_integrity_non_suppression:protective-assessment:test:reporting_integrity_non_suppression",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "invasive_evidence_plan_without_review:confidentiality_privacy_rights:protective-assessment:test:confidentiality_privacy_rights",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "protective_assessment_policy_not_immutable:evidence_authenticity_synthetic_media:mutable",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "neutral_review_not_non_blocking:financial_crime_fraud_source_of_funds:counterparty_benefits",
    ),
  );
});

test("assessment records fail closed for stale policy, stale review, notice, appeal, and reviewer quality", () => {
  const result = evaluateMoralTradeProtectiveAssessments({
    transition: "public_completion_claim",
    checkedAt: "2026-06-08T12:00:00.000Z",
    records: [
      ...allPassingRecords().filter(
        (record) => record.assessmentDimension !== "civil_rights_discrimination",
      ),
      assessmentRecord("civil_rights_discrimination", {
        policySnapshotStatus: "stale",
        reviewerQualityState: "out_of_scope",
        participantNoticeState: "failed",
        appealPathState: "missing",
        reviewedAt: "2025-01-01T12:00:00.000Z",
        assessmentHash: "sha256:not-valid",
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "protective_assessment_policy_not_immutable:civil_rights_discrimination:stale",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "protective_assessment_hash_invalid:civil_rights_discrimination:protective-assessment:test:civil_rights_discrimination",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "protective_assessment_stale_review:civil_rights_discrimination:protective-assessment:test:civil_rights_discrimination",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "reviewer_quality_not_non_blocking:civil_rights_discrimination:out_of_scope",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "protective_assessment_notice_not_recorded:civil_rights_discrimination:failed",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "protective_assessment_appeal_path_missing:civil_rights_discrimination:missing",
    ),
  );
});

test("protective-assessment enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceProtectiveAssessment(
    new Request("http://localhost/api/moral-trade/protective-assessments/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.protectiveAssessmentGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.publicCompletionClaimAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_protective_assessment_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("protective-assessment contract is wired through route, health, spec, schema, and API profile", () => {
  const source = readRepoFile("src/lib/moral-trade/protective-assessments.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/protective-assessments/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/protective-assessments/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpecPage = readRepoFile(
    "src/app/moral-trade/technical-spec/page.tsx",
  );
  const migration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_protective_assessments.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_protective_assessment_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const apiContractProfile = readRepoFile(
    "config/moral-trade/api-contract-profile.json",
  );

  assert.match(source, /reporting_integrity_non_suppression/);
  assert.match(source, /regulated_goods_hazardous_activity/);
  assert.match(source, /cyber_abuse_digital_systems_integrity/);
  assert.match(route, /validateMoralTradeProtectiveAssessmentContract/);
  assert.match(enforceRoute, /protective_assessment_enforce/);
  assert.match(enforceRoute, /moral_trade_protective_assessment_enforcement_records/);
  assert.match(enforceRoute, /matchedTradeLockAllowed: false/);
  assert.match(enforceRoute, /publicCompletionClaimAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:protective_assessment_enforce/);
  assert.match(enforceRoute, /authentication_required:protective_assessment_enforce/);
  assert.match(healthRoute, /protectiveAssessmentValidation/);
  assert.match(healthRoute, /protectiveAssessmentDimensions/);
  assert.match(technicalSpecPage, /Protective assessments/);
  assert.match(
    technicalSpecPage,
    /\/api\/moral-trade\/protective-assessments\/contract/,
  );
  assert.match(migration, /moral_trade_protective_assessment_records/);
  assert.match(migration, /moral_trade_negative_commitment_scopes/);
  assert.match(migration, /moral_trade_action_reversibility_assessments/);
  assert.match(migration, /moral_trade_donor_of_record_tax_reviews/);
  assert.match(migration, /moral_trade_authority_obligation_assessments/);
  assert.match(enforcementMigration, /moral_trade_protective_assessment_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /matched_trade_lock_allowed_bool = false/);
  assert.match(enforcementMigration, /public_completion_claim_allowed_bool = false/);
  assert.match(enforcementMigration, /release_gate_promotion_allowed_bool = false/);
  assert.match(schema, /moral_trade_protective_assessment_records/);
  assert.match(schema, /moral_trade_protective_assessment_enforcement_records/);
  assert.match(schema, /protective_assessment/);
  assert.match(databaseTypes, /moral_trade_protective_assessment_records/);
  assert.match(databaseTypes, /moral_trade_protective_assessment_enforcement_records/);
  assert.match(apiContract, /moral_trade_protective_assessment_contract/);
  assert.match(apiContract, /moral_trade_protective_assessment_enforce/);
  assert.match(apiRateLimit, /protective_assessment_enforce/);
  assert.match(operations, /protective_assessment_enforce/);
  assert.match(operationsProfile, /protective_assessment_enforce/);
  assert.match(apiContractProfile, /protective_assessment_contract_response/);
  assert.match(apiContractProfile, /protective_assessment_enforce_request/);
  assert.match(apiContractProfile, /protective_assessment_enforce_response/);
  assert.match(apiContractProfile, /moral_trade_protective_assessment_enforce/);
  assert.match(apiContractProfile, /protected-trait facts/);
});
