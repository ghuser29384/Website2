import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasPublicOutcome, readPublicOutcomeAvailability } from "./public-outcome-availability";
import { getLegacyDashboardTarget, getProfileDashboardTarget } from "./dashboard-view";

const outcome = { actionCategory: "volunteering", lifecycleStatus: "graded", confidenceBand: 100,
  completionFraction: 1, payoutPercentage: 0, date: "2026-09-28" };

test("Evidence navigation requires an actual validated public projection, never a count", async () => {
  for (const value of [null, [], {}, { totalRecords: 10 }, { records: [] }, { records: [{}] },
    { records: [{ ...outcome, lifecycleStatus: "draft" }] },
    { records: [{ ...outcome, participantId: "private" }] },
    { records: [{ ...outcome, date: "2026-02-30" }] },
    { records: [{ ...outcome, confidenceBand: 101 }] },
    { records: [{ ...outcome, completionFraction: -1 }] },
    { records: [{ ...outcome, completionFraction: NaN }] },
    { records: [{ ...outcome, payoutPercentage: 101 }] },
    { records: [{ ...outcome, actionCategory: " " }] }]) assert.equal(hasPublicOutcome(value), false);
  assert.equal(hasPublicOutcome({ records: [outcome] }), true);
  assert.equal(await readPublicOutcomeAvailability(async () => ({ data: { records: [outcome] }, error: null })), true);
  assert.equal(await readPublicOutcomeAvailability(async () => ({ data: { records: [outcome] }, error: "unavailable" })), false);
  assert.equal(await readPublicOutcomeAvailability(async () => { throw new Error("timeout"); }), false);
});

test("legacy data bookmarks open controls without losing existing query feedback", () => {
  assert.equal(getLegacyDashboardTarget("?notice=saved", "#data-portability"), "/dashboard?notice=saved&view=controls#data-portability");
  assert.equal(getLegacyDashboardTarget("?view=controls", "#data-portability"), null);
  assert.equal(getProfileDashboardTarget({ notice: "saved", view: "controls" }), "/dashboard?notice=saved&view=controls");
});

test("About is a redirect only; its generic navigation and sitemap entries are retired", () => {
  const page = readFileSync("src/app/about/page.tsx", "utf8");
  assert.match(page, /permanentRedirect\("\/feed"\)/);
  assert.doesNotMatch(page, /getViewer|<h1|hero|SiteTopbar/);
  assert.doesNotMatch(readFileSync("src/app/sitemap.ts", "utf8"), /getAbsoluteUrl\("\/about"\)/);
  assert.match(readFileSync("src/app/sitemap.ts", "utf8"), /getAbsoluteUrl\("\/mpgf\/about"\)/);
  assert.doesNotMatch(readFileSync("src/app/labs/moral-public-goods/[poolSlug]/page.tsx", "utf8"), /href: "\/about"/);
});

test("the new navigation endpoint can only perform a bounded anonymous public read", () => {
  const route = readFileSync("src/app/api/navigation/evidence/route.ts", "utf8");
  assert.match(route, /list_public_moral_trade_outcomes_v2/);
  assert.match(route, /p_limit: 1/);
  assert.match(route, /AbortSignal.timeout\(2500\)/);
  assert.match(route, /NextResponse.json\(\{ available \}/);
  assert.doesNotMatch(route, /createServiceClient|getSupabaseServiceEnv|cookies\(|request\.|\.from\(|export.*POST/);
  const tools = readFileSync("src/components/dashboard/dashboard-tools.tsx", "utf8");
  assert.match(tools, /href="\/dashboard\/payments"[^>]*>\s*Payment setup/);
  assert.doesNotMatch(tools, /<summary>Currency|account-wide currency selector/);
  const header = readFileSync("src/components/layout/site-topbar.tsx", "utf8");
  assert.match(header, /\/dashboard\?view=controls#data-portability/);
  assert.doesNotMatch(header, /Favourites/);
});
