import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fixtureSource = readFileSync(
  "src/lib/provider-refund-rendered-qa.ts",
  "utf8",
);
const adminSource = readFileSync(
  "src/app/admin/donation-upgrades/page.tsx",
  "utf8",
);
const layoutSource = readFileSync(
  "src/app/donation-upgrades/[offerId]/layout.tsx",
  "utf8",
);
const providerStatusSource = readFileSync(
  "src/app/donation-upgrades/[offerId]/provider-status/page.tsx",
  "utf8",
);

function includesAll(source: string, fragments: string[]) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `missing contract: ${fragment}`);
  }
}

test("refund rendering fixture is preview-only, staging-only, and deterministic", () => {
  includesAll(fixtureSource, [
    "DIRECT_DONATION_UPGRADE_PROVIDER_REFUND_RENDERED_QA",
    'DIRECT_DONATION_UPGRADE_QA_FIXTURES === "true"',
    'process.env.VERCEL === "1"',
    'process.env.VERCEL_ENV === "preview"',
    'process.env.VERCEL_TARGET_ENV !== "production"',
    'environment === "staging"',
    'status: "post_completion_exception"',
    'status: "provider_reversed"',
    "current_unreversed_gross_amount_cents: 1_000",
    "current_unreversed_net_amount_cents: 970",
    "provider_reversed_obligation_count: 1",
  ]);
  assert.ok(!fixtureSource.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!fixtureSource.includes("STRIPE"));
});

test("admin and participant rendering consume the same isolated refund fixture", () => {
  includesAll(adminSource, [
    "providerRefundRenderedQaAdminSnapshot",
    "renderedQaSnapshot",
  ]);
  includesAll(layoutSource, [
    "PROVIDER_REFUND_RENDERED_QA_OFFER_ID",
    "providerRefundRenderedQaPublicOffer",
  ]);
  includesAll(providerStatusSource, [
    "PROVIDER_REFUND_RENDERED_QA_OFFER_ID",
    "providerRefundRenderedQaPublicOffer",
    "Historical confirmed gross",
    "Current unreversed net credit",
    "Provider refund recorded",
  ]);
});

test("provider-status route preserves provider, factual, credibility, and additionality distinctions", () => {
  includesAll(providerStatusSource, [
    "Provider reconciliation, factual fulfillment, credibility, and",
    "counterfactual additionality are separate.",
    "it does not establish",
    "what a participant otherwise would have done.",
    "A provider refund is not participant default, failed",
    "donation, cancellation, or Moral Trade action.",
  ]);
});
