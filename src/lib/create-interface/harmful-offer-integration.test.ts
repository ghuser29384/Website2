import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("Create source renders live and final harmful-offer assessment states plus reconsideration", () => {
  const source = read("public/moral-trade-create/index.html");
  const integrated = integrateCommonGroundCreateSource(source);

  assert.match(integrated, /data-harmful-offer-assessment-v2/);
  assert.match(integrated, /Private automatic harm assessment/);
  assert.match(integrated, /function renderHarmAssessment\(assessment\)/);
  assert.match(integrated, /function runLiveHarmAssessment\(\)/);
  assert.match(integrated, /\/api\/create\/assess/);
  assert.match(integrated, /\/api\/create\/harm-assessment\/appeal/);
  assert.match(integrated, /result\?\.harmAssessment/);
  assert.equal(integrateCommonGroundCreateSource(integrated), integrated);
});

test("publication route rate-limits model calls, assesses before persistence, and returns a private block receipt", () => {
  const route = read("src/app/api/create/publish/route.ts");

  assert.match(route, /claimHarmfulOfferAssessmentRateLimit/);
  assert.match(route, /scope: "publication"/);
  assert.match(route, /assessHarmfulOffer\(validated\.source/);
  assert.match(route, /includeModel: modelCallAllowed/);
  assert.match(route, /assessment,\n\s+origin:/);
  assert.match(route, /persisted\.outcome === "blocked"/);
  assert.match(route, /422/);
  assert.match(route, /presentHarmfulOfferAssessment/);
});

test("live assessment endpoint is authenticated, rate-limited, and non-persisting", () => {
  const route = read("src/app/api/create/assess/route.ts");

  assert.match(route, /getViewer\(\)/);
  assert.match(route, /scope: "live_draft"/);
  assert.match(route, /trigger: "live_draft"/);
  assert.match(route, /includeModel: true/);
  assert.doesNotMatch(route, /persistCreateSubmission/);
});

test("migration enforces low-risk permission, deterministic-only blocking, rate limiting, appeals, and material-edit supersession", () => {
  const migration = read(
    "supabase/migrations/20260806160000_moral_trade_harmful_offer_assessments.sql",
  );

  assert.match(migration, /moral_trade_harmful_offer_assessments/);
  assert.match(migration, /moral_trade_create_submit_with_harm_assessment_service/);
  assert.match(migration, /Automatic permission requires every low-risk criterion/);
  assert.match(migration, /An automatic block requires a deterministic categorical finding/);
  assert.match(migration, /overall_confidence_value >= 0\.9000/);
  assert.match(migration, /evidence_quality_value = 'strong'/);
  assert.match(migration, /moral_trade_claim_harm_assessment_rate_limit_service/);
  assert.match(migration, /moral_trade_harmful_offer_assessment_appeals/);
  assert.match(migration, /moral_trade_request_harm_assessment_appeal_service/);
  assert.match(migration, /The appeal must be decided by a different reviewer/);
  assert.match(migration, /moral_trade_mark_harm_assessment_superseded_on_material_edit/);
  assert.match(migration, /owner_profile_id = \(select auth\.uid\(\)\)/);
});
