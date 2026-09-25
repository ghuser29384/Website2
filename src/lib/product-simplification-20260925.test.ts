import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(path, "utf8");

test("marketplace does not infer verification from free-form evidence words", () => {
  const offers=read("src/app/offers/page.tsx"), pools=read("src/app/pools/page.tsx");
  assert.doesNotMatch(read("src/lib/smart-query-records.ts"), /isVerifiedEvidenceText|evidenceTextQuality/);
  assert.doesNotMatch(offers, /Strongest evidence|isVerifiedEvidenceText|evidenceTextQuality/);
  assert.doesNotMatch(pools, /Strongest evidence|isVerifiedEvidenceText|evidenceTextQuality/);
  assert.match(offers, /Structured evidence state unavailable/);
  assert.match(pools, /Structured evidence state unavailable/);
  assert.match(read("src/components/marketplace/participant-offer-group.tsx"), /review state not inferred/);
});

test("onboarding moral preferences and nurture are opt-in", () => {
  const page=read("src/app/onboarding/page.tsx"), actions=read("src/app/actions.ts");
  assert.match(page,/walkthroughDraft \? \[walkthroughDraft\.causeArea\] : \[\]/);
  assert.match(page,/email_nurture_opt_in/);
  const signup=actions.slice(actions.indexOf("export async function signUpAction"),actions.indexOf("export async function saveOnboardingAction"));
  assert.doesNotMatch(signup,/subscribeEmailNurture/);
  assert.match(actions,/source: "onboarding_opt_in"/);
});

test("automatic rewriting and frozen current-round claims are removed", () => {
  const assist=read("public/moral-trade-input-assist.js");
  assert.match(assist,/const AUTO_REWRITE_ENABLED = false/);
  assert.match(assist,/if \(!AUTO_REWRITE_ENABLED\) return false/);
  const api=read("src/lib/mpgf/public-goods-api.ts");
  assert.match(api,/rounds: \[\]/);
  assert.match(api,/status: "archived_demo"/);
  assert.match(read("src/app/mpgf/page.tsx"),/Review archived example/);
  assert.doesNotMatch(read("src/app/mpgf/rounds/[roundId]/page.tsx"),/Likely near threshold/);
});

test("calculator, reviewer selection and diagnostics fail closed", () => {
  const calculator=read("src/components/mpgf/mpgf-assurance-funding-receipt.tsx");
  assert.match(calculator,/useState\(""\)/);
  assert.match(calculator,/No probability is assumed for you/);
  const priority=read("src/lib/priority-correction.ts");
  assert.doesNotMatch(priority,/top_10_percent_karma|top_5_percent_karma/);
  assert.match(priority,/Automatic arbiter assignment is intentionally paused/);
  assert.match(read("public/moral-trade-live-learning-diagnostics.js"),/<summary>Recommendation system details<\/summary>/);
});
