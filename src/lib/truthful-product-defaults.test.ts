import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("free-text evidence methods never become verification facts or evidence rankings", () => {
  const records = read("src/lib/smart-query-records.ts");
  const offers = read("src/app/offers/page.tsx");
  const pools = read("src/app/pools/page.tsx");
  const participantRows = read("src/components/marketplace/participant-offer-group.tsx");

  assert.doesNotMatch(records, /isVerifiedEvidenceText|evidenceTextQuality/);
  assert.match(offers, /const verified = null/);
  assert.match(offers, /const evidenceQuality = 0/);
  assert.doesNotMatch(offers, /Strongest evidence|most_verified/);
  assert.match(pools, /const verified = null/);
  assert.match(pools, /const evidenceQuality = 0/);
  assert.doesNotMatch(pools, /Strongest evidence|most_verified/);
  assert.match(participantRows, /Verification method stated · not independently reviewed/);
  assert.doesNotMatch(participantRows, /Named verification evidence/);
});

test("the May funding fixture is an explicit worked example, never the current round", () => {
  const api = read("src/lib/mpgf/public-goods-api.ts");
  const hub = read("src/app/mpgf/page.tsx");
  const detail = read("src/app/mpgf/rounds/[roundId]/page.tsx");
  const offers = read("src/lib/public-offers.ts");

  assert.match(api, /rounds: \[\]/);
  assert.match(api, /examples: \[/);
  assert.match(api, /status: "demonstration"/);
  assert.match(api, /countdownSeconds: null/);
  assert.doesNotMatch(hub, /View current round|>Current round</);
  assert.match(hub, /Worked demonstration/);
  assert.match(detail, /Worked demonstration only/);
  assert.match(detail, /Progress not disclosed/);
  assert.doesNotMatch(offers, /View current round/);
});

test("onboarding has no invented moral defaults and marketing email is explicit opt-in", () => {
  const page = read("src/app/onboarding/page.tsx");
  const actions = read("src/app/actions.ts");

  assert.doesNotMatch(page, /COHORT_CAUSES\.slice\(0, 2\)/);
  assert.match(page, /walkthroughDraft \? \[walkthroughDraft\.causeArea\] : \[\]/);
  assert.match(page, /Cause areas[^]*optional/);
  assert.match(page, /name="email_updates"/);
  assert.match(actions, /readOptional\(formData, "email_updates"\) === "1"/);
  assert.match(actions, /source: "onboarding_opt_in"/);
  assert.doesNotMatch(actions, /source: "signup"/);
  assert.doesNotMatch(actions, /Choose at least one cause area/);
});

test("community karma no longer selects allocation arbiters", () => {
  const source = read("src/lib/priority-correction.ts");
  const page = read("src/app/priority-correction-fund/page.tsx");

  assert.doesNotMatch(source, /top_10_percent_karma|top_5_percent_karma|profilesByKarma|select\("id,display_name,email,karma"\)/);
  assert.match(source, /eligible_cause_participants_random/);
  assert.match(source, /eligible_participants_diverse_random/);
  assert.match(page, /General community karma does not determine eligibility/);
  assert.match(page, /not used as a proxy for allocation expertise/);
});

test("ordinary pool creation keeps advanced formula machinery out of the normal flow", () => {
  const create = read("public/moral-trade-create/index.html");
  assert.match(create, /Simple templates only in ordinary creation/);
  assert.match(create, /id="failureTimingPanel"[^>]*hidden/);
  assert.match(create, /value="function" disabled/);
});

test("technical ranking state is progressive disclosure rather than primary feed copy", () => {
  const diagnostics = read("public/moral-trade-live-learning-diagnostics.js");
  assert.match(diagnostics, /<details class="mt-learning-diagnostics"/);
  assert.match(diagnostics, /<summary><strong>Advanced feed diagnostics<\/strong>/);
  assert.match(diagnostics, /Shadow learning/);
});
