import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const a1Route = readFileSync("src/app/api/live-now-a1/route.ts", "utf8");
const additionalMechanisms = readFileSync(
  "src/lib/live-now-additional-mechanisms.ts",
  "utf8",
);
const diagnostics = readFileSync(
  "public/moral-trade-live-feed-diagnostics.js",
  "utf8",
);
const reviewActions = readFileSync(
  "src/app/feed-create-review-actions.ts",
  "utf8",
);
const actionExports = readFileSync("src/app/core-trade-actions.ts", "utf8");
const deliveryMigration = readFileSync(
  "supabase/migrations/20260808110500_feed_create_private_delivery_v1.sql",
  "utf8",
);

test("the A1 endpoint forms one Pareto-ranked public-executable candidate universe", () => {
  assert.match(a1Route, /loadAdditionalPublicMechanisms/);
  assert.match(a1Route, /buildHybridLiveNowFeed/);
  assert.match(a1Route, /applyParetoLearningToLiveNowPayload/);
  assert.match(a1Route, /unifiedMechanismInventoryVersion:\s*"public-executable-v1"/);
  assert.match(additionalMechanisms, /conditional_redirect_offers/);
  assert.match(additionalMechanisms, /mpgf_pool_proposals/);
  assert.match(additionalMechanisms, /approved_as_candidate/);
  assert.match(additionalMechanisms, /public_goods_failure_bonus_enabled/);
  assert.doesNotMatch(additionalMechanisms, /moral_trade_donation_redirect_proposals/);
});

test("empty-state diagnostics distinguish platform, owned, external, and evaluated inventory", () => {
  assert.match(a1Route, /platformInventoryCount/);
  assert.match(a1Route, /viewerOwnedExcludedCount/);
  assert.match(a1Route, /externalInventoryCount/);
  assert.match(a1Route, /evaluatedCandidateCount/);
  assert.match(a1Route, /external-candidate-funnel-v1/);
  assert.match(diagnostics, /External candidate funnel/);
  assert.match(diagnostics, /No external opportunities are available yet/);
  assert.match(diagnostics, /your own listings are not recommended back to you/i);
  assert.match(diagnostics, /0 candidates evaluated/);
});

test("approved Feed drafts enter only the exact source counterparty's private dealroom", () => {
  assert.match(actionExports, /reviewFeedCreateAwareCoreOfferAction as reviewCoreOfferAction/);
  assert.match(reviewActions, /moral_trade_feed_create_deliver_service/);
  assert.match(reviewActions, /evaluateAdminOperatorAccess/);
  assert.match(reviewActions, /\/messages\/\$\{threadId\}/);
  assert.match(deliveryMigration, /source_row\.terms_version <> link_row\.source_terms_version/);
  assert.match(deliveryMigration, /moral_trade_private\.pair_is_blocked/);
  assert.match(deliveryMigration, /insert into public\.trade_counterproposals/);
  assert.match(deliveryMigration, /Approved and delivered privately as a source-bound counterproposal/);
  assert.doesNotMatch(deliveryMigration, /workflow_status\s*=\s*'published'/);
  assert.match(deliveryMigration, /revoke all on function public\.moral_trade_feed_create_deliver_service[\s\S]*authenticated/);
  assert.match(deliveryMigration, /grant execute[\s\S]*to service_role/);
});
