import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/donation-upgrade/page.tsx", "utf8");
const analytics = readFileSync("src/app/donation-upgrade/campaign-analytics.tsx", "utf8");
const route = readFileSync("src/app/api/campaign-events/route.ts", "utf8");
const adminPage = readFileSync("src/app/admin/donation-upgrade-campaign/page.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260801123000_donation_upgrade_campaign_events.sql",
  "utf8",
);

test("the Donation Upgrade landing page preserves the actual counterfactual", () => {
  assert.match(page, /The second \$10 changes where the first goes\./);
  assert.match(page, /No match: original \$10 proceeds/);
  assert.match(page, /two linked, verified\s+donations/);
  assert.match(page, /does not, by itself, establish twice the welfare\s+impact/);
  assert.match(page, /structure=conditional-donation/);
  assert.match(page, /utm_campaign=donation_upgrade_2026/);
});

test("the completed visual uses two blue output donations", () => {
  const outputBlueRects = page.match(/fill="url\(#du-blue\)" height="72"/g) ?? [];
  assert.equal(outputBlueRects.length, 2);
  assert.match(page, /One black ten-dollar planned donation and one new blue ten-dollar donation/);
});

test("campaign analytics are allow-listed and privacy-minimized", () => {
  assert.match(analytics, /landing_view/);
  assert.match(analytics, /create_click/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /sec-fetch-site/);
  assert.match(route, /cache-control/);
  assert.doesNotMatch(route, /user-agent|x-forwarded-for|request\.ip/i);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /No public or authenticated policies/);
  assert.match(migration, /idempotency_key text not null unique/);
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /revoke all on table public\.campaign_events from anon, authenticated/);
  assert.match(
    migration,
    /revoke all on table public\.donation_upgrade_campaign_summary from anon, authenticated/,
  );
  assert.match(migration, /count\(distinct anonymous_id_hash\)/);
  assert.match(adminPage, /Measure the handoff without collecting identity data/);
  assert.match(adminPage, /donation_upgrade_campaign_summary/);
});
