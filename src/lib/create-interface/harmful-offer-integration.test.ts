import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("Create source renders the harmful-offer assessment status and response wiring", () => {
  const source = read("public/moral-trade-create/index.html");
  const integrated = integrateCommonGroundCreateSource(source);

  assert.match(integrated, /data-harmful-offer-assessment-v1/);
  assert.match(integrated, /Automatic harm assessment/);
  assert.match(integrated, /function renderHarmAssessment\(assessment\)/);
  assert.match(integrated, /result\?\.harmAssessment/);
  assert.equal(integrateCommonGroundCreateSource(integrated), integrated);
});

test("publication route assesses before persistence and returns a private block receipt", () => {
  const route = read("src/app/api/create/publish/route.ts");

  assert.match(route, /assessHarmfulOffer\(validated\.source/);
  assert.match(route, /includeModel: true/);
  assert.match(route, /assessment,\n\s+origin:/);
  assert.match(route, /persisted\.outcome === "blocked"/);
  assert.match(route, /422/);
  assert.match(route, /presentHarmfulOfferAssessment/);
});

test("migration stores assessments and prevents model-only automatic blocks", () => {
  const migration = read(
    "supabase/migrations/20260806160000_moral_trade_harmful_offer_assessments.sql",
  );

  assert.match(migration, /create table if not exists public\.moral_trade_harmful_offer_assessments/);
  assert.match(migration, /moral_trade_create_submit_with_harm_assessment_service/);
  assert.match(migration, /Automatic permission requires a completed model assessment/);
  assert.match(migration, /An automatic block requires at least one deterministic hard-policy finding/);
  assert.match(migration, /assessment_route_value <> 'block'/);
  assert.match(migration, /owner_profile_id = \(select auth\.uid\(\)\)/);
});
