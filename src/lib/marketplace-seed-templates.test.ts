import assert from "node:assert/strict";
import test from "node:test";

import {
  DONATION_OFFSET_PLAIN_LABELS,
  getPublicReviewedSeedTemplateSummaries,
  getReviewedMarketplaceSeedTemplate,
  REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT,
  REVIEWED_MARKETPLACE_SEED_TEMPLATE_COUNT,
  REVIEWED_MARKETPLACE_SEED_TEMPLATES,
  REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT,
} from "./marketplace-seed-templates";

test("reviewed marketplace seed templates provide the required bootstrap mix", () => {
  assert.equal(REVIEWED_MARKETPLACE_SEED_TEMPLATE_COUNT, 4);
  assert.equal(REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT, 2);
  assert.equal(REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT, 2);
  assert.ok(
    REVIEWED_MARKETPLACE_SEED_TEMPLATES.every(
      (template) =>
        template.reviewStatus === "admin_reviewed" &&
        template.environment === "seed_template" &&
        template.liveMetricEligible === false &&
        template.promotionBehavior === "reviewed_template_only" &&
        template.templateHref === `/offers/new?template=${template.id}`,
    ),
  );
});

test("reviewed seed templates prefill safe draft-only donation offsets and pledge swaps", () => {
  const directOffset = getReviewedMarketplaceSeedTemplate("pure-opposed-cause");
  const pledgeSwap = getReviewedMarketplaceSeedTemplate("reciprocal-mixed");

  assert.ok(directOffset);
  assert.ok(pledgeSwap);
  assert.equal(directOffset.prefill.mode, "offset");
  assert.equal(directOffset.prefill.offset?.verificationMethod, "receipts_uploaded");
  assert.equal(directOffset.prefill.offset?.compromiseDestinationId, "givewell-top-charities-fund");
  assert.match(directOffset.reviewSummary, /preview template/);
  assert.equal(pledgeSwap?.prefill.mode, "pledge");
  assert.match(pledgeSwap.prefill.exitCondition, /pause|missed evidence/i);
  assert.equal(getReviewedMarketplaceSeedTemplate("missing-template"), null);
});

test("public seed template summaries omit private fields and live-metric eligibility", () => {
  const summaries = getPublicReviewedSeedTemplateSummaries();
  const serialized = JSON.stringify(summaries);

  assert.equal(summaries.length, REVIEWED_MARKETPLACE_SEED_TEMPLATE_COUNT);
  assert.ok(summaries.every((summary) => summary.liveMetricEligible === false));
  assert.ok(summaries.every((summary) => summary.reviewStatus === "admin_reviewed"));
  assert.equal(/baselineAmountUsd|requestedMatchingAmountUsd|notes|reviewDecisionId/.test(serialized), false);
});

test("donation-offset templates expose the approved participant plain-label map", () => {
  assert.deepEqual([...DONATION_OFFSET_PLAIN_LABELS], [
    "what would each side donate without this trade",
    "how much each side redirects",
    "where the shared money goes",
    "why each side prefers this",
    "what proof reviewers check",
    "when the offer expires",
    "what would make this unsafe or invalid",
  ]);
});
