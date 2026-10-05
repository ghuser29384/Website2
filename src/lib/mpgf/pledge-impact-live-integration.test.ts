import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const route = read("src/app/api/mpgf/pledge-impact/route.ts");
const server = read("src/lib/mpgf/pledge-impact-live-server.ts");
const model = read("src/lib/mpgf/pledge-impact-live.ts");
const migration = read(
  "supabase/migrations/20260801030000_mpgf_pledge_impact_live_foundation.sql",
);
const regression = read("supabase/tests/mpgf_pledge_impact_live_foundation.sql");

test("the read API is no-store, fail-closed, and uses the live bundle RPC", () => {
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /loadPledgeImpactLiveBundle/);
  assert.match(route, /evaluatePledgeImpactLiveBundle/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /PLEDGE_IMPACT_POOL_STATES|demoMpgf|demoPublicGoods/);
  assert.match(server, /get_mpgf_pledge_impact_bundle/);
});

test("live pool state comes from approved MPGF proposals and linked pledges", () => {
  for (const required of [
    "public.mpgf_pool_proposals",
    "public.mpgf_pledges",
    "pool_proposal_id",
    "approved_as_candidate",
    "public_exact",
    "exact_amount",
    "converted_to_payment_intent",
    "mpgf_pledge_impact_live_pool_state",
  ]) {
    assert.match(migration, new RegExp(required.replaceAll(".", "\\.")));
  }
  assert.match(
    migration,
    /public_goods_deadline_at is null[\s\S]*public_goods_deadline_at <= p_at then[\s\S]*return null/,
  );
  assert.doesNotMatch(migration, /mpgf_public_goods_campaigns/);
  assert.doesNotMatch(
    migration,
    /insert into public\.mpgf_pledge_impact_pool_map[\s\S]*values\s*\(\s*'pool-/i,
  );
});

test("forecast publication derives and hashes state server-side", () => {
  assert.match(migration, /release_mpgf_pledge_impact_forecast/);
  assert.match(migration, /live_pool_state := public\.mpgf_pledge_impact_live_pool_state/);
  assert.match(migration, /pool_state_sha256/);
  assert.match(migration, /mpgf_pledge_impact_contains_personalization/);
  assert.match(migration, /Forecast release timestamps are stale/);
  assert.match(migration, /Released pledge-impact forecasts and audit events are immutable/);
  assert.match(migration, /revoke all on table public\.mpgf_pledge_impact_forecast_snapshots/);
  assert.match(migration, /grant execute on function public\.get_mpgf_pledge_impact_bundle/);
});

test("the model keeps causal effect, allocated credit, uncertainty, and bonus distinct", () => {
  for (const required of [
    "additionalFundingFromOthers",
    "allocatedFundingCredit",
    "failureBonusConditionalOnFailure",
    "forecastErrorFloorBps",
    "followOnContributionEffectCents",
    "viewerPersonalizationUsed: false",
    "causalEstimatesMayOverlap: true",
    "allocatedCreditIsNotCausal: true",
  ]) {
    assert.match(model, new RegExp(required.replaceAll(".", "\\.")));
  }
});

test("transactional QA covers live derivation, stale and changed state, RLS, and cleanup", () => {
  for (const required of [
    "proposed_recipient_name",
    "forecast_not_released",
    "pool_state_mismatch",
    "forecast_stale",
    "pool_not_live",
    "set local role authenticated",
    "set local role service_role",
    "Authenticated direct snapshot reads should be denied",
    "viewer-personalized forecast",
    "rollback;",
  ]) {
    assert.match(regression, new RegExp(required.replaceAll(".", "\\."), "i"));
  }
});

// This comment deliberately retriggers the branch-local one-time type-repair workflow.
