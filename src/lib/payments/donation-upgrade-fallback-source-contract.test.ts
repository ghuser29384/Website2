import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(
  "src/app/donation-offsets/conditional/actions.ts",
  "utf8",
);
const searchRoute = readFileSync(
  "src/app/api/donation-upgrade/nonprofits/search/route.ts",
  "utf8",
);
const page = readFileSync("src/app/trades/new/conditional-donation.tsx", "utf8");
const searchComponent = readFileSync(
  "src/app/trades/new/donation-upgrade-fallback-search.tsx",
  "utf8",
);
const pageData = readFileSync(
  "src/lib/payments/conditional-redirect-page-data.ts",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20260731084000_donation_upgrade_destination_review_and_gate_evidence.sql",
  "utf8",
);

test("the browser searches Every.org without receiving the provider key", () => {
  assert.match(searchRoute, /process\.env\.EVERY_ORG_PUBLIC_API_KEY/);
  assert.match(searchRoute, /buildEveryOrgSearchUrl/);
  assert.match(searchRoute, /mapEveryOrgSearchResults/);
  assert.match(searchRoute, /AbortSignal\.timeout/);
  assert.doesNotMatch(searchComponent, /EVERY_ORG_PUBLIC_API_KEY/);
  assert.match(searchComponent, /\/api\/donation-upgrade\/nonprofits\/search/);
});

test("the server re-fetches and verifies the selected provider identity", () => {
  assert.match(actions, /normalizeEveryOrgIdentifier/);
  assert.match(actions, /buildEveryOrgDetailsUrl/);
  assert.match(actions, /mapEveryOrgNonprofitDetails/);
  assert.match(actions, /if \(!nonprofit\.isDisbursable\)/);
  assert.match(actions, /buildEveryOrgIdentitySnapshot/);
  assert.match(actions, /submit_conditional_payment_destination_request/);
  assert.match(actions, /p_provider_nonprofit_id: nonprofit\.id/);
  assert.match(actions, /p_nonprofit_slug: nonprofit\.primarySlug/);
  assert.doesNotMatch(actions, /formData\.get\("display_name"\)/);
  assert.doesNotMatch(actions, /formData\.get\("nonprofit_ein"\)/);
});

test("review requests are nonfinancial and approved records alone enter selectors", () => {
  assert.match(searchComponent, /requesting review does not create a payment authorization/i);
  assert.match(page, /Requesting review never creates a mandate, charge, or donation/i);
  assert.match(pageData, /conditional_payment_destination_requests/);
  assert.match(pageData, /conditional_payment_destinations/);
  assert.match(pageData, /\.eq\("status", "active"\)/);
  assert.match(migration, /status text not null default 'pending'/i);
  assert.match(migration, /if p_decision = 'approved' then/i);
  assert.match(migration, /insert into public\.conditional_payment_destinations/i);
});

test("the exact local-charity to GiveWell example defaults to $10 plus $10", () => {
  assert.match(page, /name="creator_amount"[\s\S]*?defaultValue="10\.00"/);
  assert.match(page, /name="matcher_amount"[\s\S]*?defaultValue="10\.00"/);
  assert.match(page, /givewell\.\*top charities\|top charities fund/i);
  assert.match(page, /defaultValue=\{defaultMatchedDestinationId\}/);
});

test("live destination review is isolated from disabled or test payment mode", () => {
  assert.match(actions, /getDonationUpgradeDestinationEnvironment/);
  assert.match(page, /getDonationUpgradeDestinationEnvironment/);
  assert.match(pageData, /destinationEnvironment: "test" \| "live"/);
  assert.match(pageData, /\.eq\("environment", input\.destinationEnvironment\)/);
});
