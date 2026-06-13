import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getCauseBucketTaxonomyContract } from "@/app/api/moral-trade/cause-bucket-taxonomy/contract/route";
import { POST as enforceCauseBucketTaxonomy } from "@/app/api/moral-trade/cause-bucket-taxonomy/enforce/route";
import {
  evaluateMoralTradeCauseBucketTaxonomy,
  getMoralTradeCauseBucketTaxonomyContract,
  validateMoralTradeCauseBucketTaxonomyContract,
  type MoralTradeCauseBucketAssignmentRecord,
  type MoralTradeCauseBucketTaxonomyRecord,
} from "@/lib/moral-trade/cause-bucket-taxonomy";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const HASH_D = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const HASH_E = "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

function taxonomyRecord(
  overrides: Partial<MoralTradeCauseBucketTaxonomyRecord> = {},
): MoralTradeCauseBucketTaxonomyRecord {
  return {
    taxonomyId: "cause-bucket-taxonomy:test",
    policyVersion: "cause-bucket-taxonomy-policy-v1",
    taxonomyType: "offered_cause",
    allowedBucketCodes: ["animal_welfare", "global_health"],
    bucketDefinitionHashes: [HASH_A, HASH_B],
    protectedTraitProxyReviewState: "non_blocking",
    ideologyOrPsychologyInferenceProhibited: true,
    pluralReviewerPanelRef: "reviewer-panel:cause-taxonomy",
    publicSummaryHash: HASH_C,
    taxonomyVersionHash: HASH_D,
    taxonomyState: "active",
    reviewerDecisionRef: "review-decision:cause-taxonomy",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    publicMoralRanking: false,
    publicIdeologyLabel: false,
    protectedTraitProxyAllowed: false,
    inferredPsychologyAllowed: false,
    ...overrides,
  };
}

function assignmentRecord(
  overrides: Partial<MoralTradeCauseBucketAssignmentRecord> = {},
): MoralTradeCauseBucketAssignmentRecord {
  return {
    assignmentId: "cause-bucket-assignment:test",
    subjectType: "offset_offer",
    subjectId: "offset-offer:test",
    participantIdHash: HASH_E,
    causeBucketTaxonomyRef: "cause-bucket-taxonomy:test",
    participantSelectedBucketCodes: ["animal_welfare"],
    reviewerNormalizedBucketCodes: ["animal_welfare"],
    assignmentConfidenceState: "reviewer_normalized",
    assignmentVisibility: "counterparty_band_only",
    affectsCounterpartyDistinctness: true,
    affectsTradeClassification: true,
    affectsClearingEligibility: true,
    assignmentState: "locked",
    reviewerDecisionRef: "review-decision:cause-assignment",
    taxonomyVersionHash: HASH_D,
    participantVisibleDependencyNotice: true,
    taxonomyChangeMaterial: false,
    previewRenewalConfirmationRef: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicParticipantIdentity: false,
    publicDetailedBucketNarrative: false,
    publicProtectedTraitFacts: false,
    publicInferredIdeologyOrPsychology: false,
    ...overrides,
  };
}

test("cause-bucket taxonomy contract validates plural-reviewed non-ranking records", () => {
  const contract = getMoralTradeCauseBucketTaxonomyContract();
  const validation = validateMoralTradeCauseBucketTaxonomyContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_cause_bucket_taxonomies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_cause_bucket_assignments"));
  assert.ok(contract.policySnapshotSubjects.includes("cause_bucket_taxonomy"));
  assert.ok(contract.taxonomyTypes.includes("offered_cause"));
  assert.ok(contract.taxonomyTypes.includes("compromise_destination"));
  assert.ok(contract.taxonomyTypes.includes("counterparty_bucket"));
  assert.ok(contract.transitionDefinitions.some((transition) => transition.key === "clearing_run"));
  assert.ok(contract.contractTests.includes("cause_bucket_taxonomy_review_test"));
  assert.match(contract.nonRankingRule, /not moral rankings/i);
  assert.match(contract.privacyBoundary, /protected-trait facts/i);
});

test("reviewed cause-bucket taxonomy and assignment can pass clearing gate", () => {
  const evaluation = evaluateMoralTradeCauseBucketTaxonomy({
    transition: "clearing_run",
    taxonomyRequired: true,
    assignmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    taxonomies: [taxonomyRecord()],
    assignments: [assignmentRecord()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.activeTaxonomyCount, 1);
  assert.equal(evaluation.nonRankingTaxonomyCount, 1);
  assert.equal(evaluation.privacySafeAssignmentCount, 1);
  assert.equal(evaluation.effectSafeAssignmentCount, 1);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing taxonomy and assignment records fail closed when required", () => {
  const evaluation = evaluateMoralTradeCauseBucketTaxonomy({
    transition: "matched_trade_lock",
    taxonomyRequired: true,
    assignmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    taxonomies: [],
    assignments: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("cause_bucket_taxonomy_record_missing"));
  assert.ok(evaluation.blockers.includes("cause_bucket_assignment_record_missing"));
  assert.ok(evaluation.blockers.includes("active_non_ranking_cause_bucket_taxonomy_missing"));
  assert.ok(evaluation.blockers.includes("privacy_safe_reviewed_cause_bucket_assignment_missing"));
});

test("protected-trait proxies, public rankings, stale disputed assignments, and inferred ideology block effects", () => {
  const evaluation = evaluateMoralTradeCauseBucketTaxonomy({
    transition: "clearing_run",
    taxonomyRequired: true,
    assignmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    taxonomies: [
      taxonomyRecord({
        protectedTraitProxyReviewState: "blocked",
        ideologyOrPsychologyInferenceProhibited: false,
        publicMoralRanking: true,
        publicIdeologyLabel: true,
        protectedTraitProxyAllowed: true,
        inferredPsychologyAllowed: true,
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    ],
    assignments: [
      assignmentRecord({
        assignmentConfidenceState: "disputed",
        assignmentState: "disputed",
        participantVisibleDependencyNotice: false,
        taxonomyChangeMaterial: true,
        reviewerDecisionRef: null,
        updatedAt: "2024-01-01T00:00:00.000Z",
        publicParticipantIdentity: true,
        publicDetailedBucketNarrative: true,
        publicProtectedTraitFacts: true,
        publicInferredIdeologyOrPsychology: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_protected_trait_proxy_review_not_non_blocking:cause-bucket-taxonomy:test:blocked",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_inferred_ideology_or_psychology_not_prohibited:cause-bucket-taxonomy:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_taxonomy_ranking_or_inference_public:cause-bucket-taxonomy:test",
    ),
  );
  assert.ok(evaluation.blockers.includes("stale_cause_bucket_taxonomy:cause-bucket-taxonomy:test"));
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_effect_bearing_assignment_not_reviewer_normalized:cause-bucket-assignment:test:disputed",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_assignment_confidence_state_blocking:cause-bucket-assignment:test:disputed",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_assignment_state_blocking:cause-bucket-assignment:test:disputed",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_dependency_notice_missing:cause-bucket-assignment:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_material_taxonomy_change_without_renewal:cause-bucket-assignment:test",
    ),
  );
  assert.ok(evaluation.blockers.includes("cause_bucket_assignment_privacy_leak:cause-bucket-assignment:test"));
});

test("material taxonomy changes need renewed preview confirmation", () => {
  const evaluation = evaluateMoralTradeCauseBucketTaxonomy({
    transition: "matched_trade_lock",
    taxonomyRequired: true,
    assignmentRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    taxonomies: [taxonomyRecord()],
    assignments: [
      assignmentRecord({
        taxonomyChangeMaterial: true,
        previewRenewalConfirmationRef: null,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "cause_bucket_material_taxonomy_change_without_renewal:cause-bucket-assignment:test",
    ),
  );
});

test("cause-bucket taxonomy route exposes only public contract metadata", async () => {
  const response = await getCauseBucketTaxonomyContract(
    new Request("http://localhost/api/moral-trade/cause-bucket-taxonomy/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_cause_bucket_taxonomies"));
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_cause_bucket_assignments"));
  assert.ok(body.publicContract.taxonomyTypes.includes("offered_cause"));
  assert.match(body.publicContract.nonRankingRule, /not moral rankings/i);
  assert.match(body.publicContract.privacyBoundary, /participant identity hashes/i);
});

test("cause-bucket taxonomy enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceCauseBucketTaxonomy(
    new Request("http://localhost/api/moral-trade/cause-bucket-taxonomy/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.causeBucketTaxonomyGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchCandidateGenerationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.clearingRunAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_cause_bucket_taxonomy_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("cause-bucket taxonomy contract is wired through route, health, spec, API profile, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/cause-bucket-taxonomy/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/cause-bucket-taxonomy/enforce/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const spec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiProfile = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const apiContract = readFileSync("src/lib/moral-trade/api-contract.ts", "utf8");
  const apiRateLimit = readFileSync("src/lib/moral-trade/api-rate-limit.ts", "utf8");
  const operations = readFileSync("src/lib/moral-trade/operations.ts", "utf8");
  const operationsProfile = readFileSync("config/moral-trade/operations-profile.json", "utf8");
  const clearingPreview = readFileSync("src/lib/moral-trade/clearing-previews.ts", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_cause_bucket_taxonomy_records.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_cause_bucket_taxonomy_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradeCauseBucketTaxonomyContract/);
  assert.match(enforceRoute, /cause_bucket_taxonomy_enforce/);
  assert.match(enforceRoute, /moral_trade_cause_bucket_taxonomy_enforcement_records/);
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:cause_bucket_taxonomy_enforce/);
  assert.match(enforceRoute, /authentication_required:cause_bucket_taxonomy_enforce/);
  assert.match(health, /causeBucketTaxonomyValidation/);
  assert.match(spec, /\/api\/moral-trade\/cause-bucket-taxonomy\/contract/);
  assert.match(apiProfile, /cause_bucket_taxonomy_contract_response/);
  assert.match(apiProfile, /cause_bucket_taxonomy_enforce_request/);
  assert.match(apiProfile, /cause_bucket_taxonomy_enforce_response/);
  assert.match(apiProfile, /moral_trade_cause_bucket_taxonomy_contract/);
  assert.match(apiProfile, /moral_trade_cause_bucket_taxonomy_enforce/);
  assert.match(apiContract, /moral_trade_cause_bucket_taxonomy_enforce/);
  assert.match(apiRateLimit, /cause_bucket_taxonomy_enforce/);
  assert.match(operations, /cause_bucket_taxonomy_enforce/);
  assert.match(operationsProfile, /cause_bucket_taxonomy_enforce/);
  assert.match(clearingPreview, /causeBucketTaxonomyStatus/);
  assert.match(migration, /moral_trade_cause_bucket_taxonomies/);
  assert.match(migration, /moral_trade_cause_bucket_assignments/);
  assert.match(migration, /cause_bucket_taxonomy/);
  assert.match(enforcementMigration, /moral_trade_cause_bucket_taxonomy_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /draft_preview_allowed_bool = false/);
  assert.match(enforcementMigration, /match_candidate_generation_allowed_bool = false/);
  assert.match(enforcementMigration, /clearing_run_allowed_bool = false/);
  assert.match(schema, /moral_trade_cause_bucket_taxonomies/);
  assert.match(schema, /moral_trade_cause_bucket_assignments/);
  assert.match(schema, /moral_trade_cause_bucket_taxonomy_enforcement_records/);
  assert.match(schema, /cause_bucket_taxonomy/);
  assert.match(databaseTypes, /moral_trade_cause_bucket_taxonomies/);
  assert.match(databaseTypes, /moral_trade_cause_bucket_assignments/);
  assert.match(databaseTypes, /moral_trade_cause_bucket_taxonomy_enforcement_records/);
  assert.match(databaseTypes, /cause_bucket_taxonomy/);
});
