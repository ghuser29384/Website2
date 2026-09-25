import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("free-text evidence terms never become a verified state or evidence ranking", () => {
  const records = read("src/lib/smart-query-records.ts");
  const offers = read("src/app/offers/page.tsx");
  const pools = read("src/app/pools/page.tsx");
  const group = read("src/components/marketplace/participant-offer-group.tsx");
  const discover = read("src/lib/discover-search.ts");

  assert.match(records, /Free-text evidence terms describe what a proposal asks for/);
  assert.match(records, /return false;/);
  assert.match(records, /return 0;/);
  assert.doesNotMatch(offers, /Strongest evidence/);
  assert.doesNotMatch(pools, /Strongest evidence/);
  assert.doesNotMatch(group, /Named verification evidence/);
  assert.match(group, /no review state is inferred from this text/);
  assert.doesNotMatch(discover, /"strongest-evidence"/);
  assert.match(discover, /const verified = false;/);
});

test("ordinary onboarding does not invent causes or enroll email without opt-in", () => {
  const page = read("src/app/onboarding/page.tsx");
  const actions = read("src/app/actions.ts");

  assert.doesNotMatch(page, /COHORT_CAUSES\.slice\(0, 2\)/);
  assert.match(page, /Cause areas <span className="muted">\(optional\)<\/span>/);
  assert.match(page, /name="email_updates"/);
  assert.match(page, /Email me optional onboarding reminders and product follow-up/);
  assert.doesNotMatch(actions, /Choose at least one cause area/);
  assert.match(actions, /const emailUpdatesOptIn = readOptional\(formData, "email_updates"\) === "1"/);
  assert.match(actions, /if \(emailUpdatesOptIn\) \{[\s\S]*subscribeEmailNurture/);
  assert.match(actions, /source: "onboarding_opt_in"/);
});

test("substantive agreement fields are suggestion-only", () => {
  const assist = read("public/moral-trade-input-assist.js");
  const autoBlock = assist.match(/const AUTO_RESOLVE_CONTEXTS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";

  assert.match(autoBlock, /"priorities"/);
  assert.match(autoBlock, /"organizations"/);
  for (const forbidden of ["recipients", "commitments", "evidence", "durations", "baselines", "exits"]) {
    assert.equal(autoBlock.includes(`"${forbidden}"`), false, forbidden);
  }
});

test("MPGF demo state is explicitly historical and pivotality starts blank", () => {
  const page = read("src/app/mpgf/page.tsx");
  const receipt = read("src/components/mpgf/mpgf-assurance-funding-receipt.tsx");
  const api = read("src/lib/mpgf/public-goods-api.ts");
  const roundPage = read("src/app/mpgf/rounds/[roundId]/page.tsx");
  const board = read("src/lib/mpgf/public-goods-round-board.ts");

  assert.match(page, /Example round/);
  assert.match(page, /It is not a current live round/);
  assert.doesNotMatch(page, /Open current round/);
  assert.match(page, /Browse candidate pools/);
  assert.match(page, /Open educational assurance calculator/);
  assert.match(receipt, /useState\("\\"\)/);
  assert.doesNotMatch(receipt, /useState\("20"\)/);
  assert.doesNotMatch(receipt, /useState\("100"\)/);
  assert.match(receipt, /No pledge amount or decisive\s+probability is assumed for you/);
  assert.match(api, /return Date\.now\(\)/);
  assert.doesNotMatch(api, /new Date\("2026-05-31T12:00:00\.000Z"\)\.getTime/);
  assert.match(api, /"closed_demo"/);
  assert.match(roundPage, /return seconds > 0 \? "less than one hour" : "closed"/);
  assert.doesNotMatch(roundPage, /Likely near threshold/);
  assert.doesNotMatch(board, /Likely near threshold/);
  assert.match(board, /Progress not disclosed/);
});

test("allocation arbiters are not selected by karma", () => {
  const source = read("src/lib/priority-correction.ts");
  const page = read("src/app/priority-correction-fund/page.tsx");

  assert.doesNotMatch(source, /top_10_percent_karma|top_5_percent_karma|profilesByKarma|\.karma/);
  assert.match(source, /selection_pool: "eligible_priority_participants"/);
  assert.match(source, /selection_pool: "eligible_priority_participants_diverse_causes"/);
  assert.doesNotMatch(page, /top 10% of karma|high-karma/i);
  assert.match(page, /excluding members who recently served/);
});

test("advanced mechanism configuration and model diagnostics use progressive disclosure", () => {
  const create = read("public/moral-trade-create/index.html");
  const diagnostics = read("public/moral-trade-live-learning-diagnostics.js");

  assert.match(create, /<details class="failure-bonus-panel"/);
  assert.match(create, /Optional failure bonus — advanced/);
  assert.match(create, /<details class="failure-timing-panel disabled"/);
  assert.match(create, /Advanced failure-bonus timing/);
  assert.match(diagnostics, /<details>/);
  assert.match(diagnostics, /Technical ranking details/);
  assert.match(diagnostics, /Preference-based ordering/);
  assert.match(diagnostics, /Why shown: ranked using explicit preferences and public opportunity terms/);
});
