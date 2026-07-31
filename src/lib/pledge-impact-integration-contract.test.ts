import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

const [
  route,
  contributionPage,
  contributionConsole,
  radar,
  discoverSource,
  discoverLoader,
  discoverRuntime,
  migration,
  schema,
  types,
] = await Promise.all([
  read("src/app/api/mpgf/pledge-impact/route.ts"),
  read("src/app/mpgf/contribute/page.tsx"),
  read("src/components/mpgf/mpgf-console.tsx"),
  read("src/components/pools/threshold-radar.tsx"),
  read("src/discover/moral-trade-discover.source.html"),
  read("public/moral-trade-discover.html"),
  read("public/moral-trade-pledge-impact.js"),
  read("supabase/migrations/20260731120000_mpgf_pledge_impact_forecasts.sql"),
  read("supabase/schema.sql"),
  read("src/lib/supabase/database.types.ts"),
]);

test("the API is read-only, no-store, and evaluates a server-loaded released forecast", () => {
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /loadLatestPledgeImpactForecastRelease/);
  assert.match(route, /evaluatePledgeImpactForecast/);
  assert.match(route, /Cache-Control.*private, no-store/);
});

test("both rendered radar surfaces use pledge-impact estimates and exact MPGF contribution routes", () => {
  assert.match(radar, /Preview your pledge impact/);
  assert.match(radar, /<PledgeImpactEstimate/);
  assert.match(radar, /buildPledgeImpactContributionHref/);
  assert.match(radar, /Make a conditional/);
  assert.doesNotMatch(radar, /Low pivotality|How likely am I to be pivotal/);

  assert.match(discoverSource, /data-pledge-impact-root/);
  assert.match(discoverSource, /PREVIEW YOUR PLEDGE IMPACT/);
  assert.match(discoverSource, /pledgeImpactContributionHref/);
  assert.match(discoverSource, /Make a conditional \$\{formatMoney\(pledge\)\} pledge/);
  assert.doesNotMatch(discoverSource, /How likely am I to be pivotal\?/);
  assert.doesNotMatch(discoverSource, /data-action="pledge"/);
});

test("the static Discover loader installs the pledge-impact stylesheet and runtime", () => {
  assert.match(discoverLoader, /moral-trade-pledge-impact\.css/);
  assert.match(discoverLoader, /moral-trade-pledge-impact\.js/);
  assert.match(discoverRuntime, /\/api\/mpgf\/pledge-impact/);
  assert.match(discoverRuntime, /data-impact-recommend/);
  assert.match(discoverRuntime, /How this is calculated/);
  assert.match(discoverRuntime, /Moving the slider does not save a pledge or authorize payment|no pledge/i);
});

test("contribution prefill remains explicit and non-authorizing", () => {
  assert.match(contributionPage, /resolvePledgeImpactContributionPrefill/);
  assert.match(contributionPage, /initialPublicGoodsCampaignId/);
  assert.match(contributionPage, /initialPublicGoodsPledgeAmount/);
  assert.match(contributionConsole, /data-testid="mpgf-contribution-prefill"/);
  assert.match(contributionConsole, /contributionPrefillNotice/);
});

test("forecast persistence is immutable, non-personalized, auditable, and function-only", () => {
  for (const source of [migration, schema]) {
    assert.match(source, /mpgf_pledge_impact_forecast_snapshots/);
    assert.match(source, /mpgf_pledge_impact_forecast_audit_events/);
    assert.match(source, /release_mpgf_pledge_impact_forecast/);
    assert.match(source, /Pledge-impact forecasts may not contain viewer-level personalization/);
    assert.match(source, /Released pledge-impact forecasts and audit events are immutable/);
    assert.match(source, /revoke all on table public\.mpgf_pledge_impact_forecast_snapshots/);
    assert.match(source, /grant execute on function public\.release_mpgf_pledge_impact_forecast/);
  }
  assert.match(types, /mpgf_pledge_impact_forecast_snapshots/);
  assert.match(types, /release_mpgf_pledge_impact_forecast/);
});
