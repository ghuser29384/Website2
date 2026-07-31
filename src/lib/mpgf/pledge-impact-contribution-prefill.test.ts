import assert from "node:assert/strict";
import test from "node:test";

import { resolvePledgeImpactContributionPrefill } from "./pledge-impact-contribution-prefill";

test("accepts an exact mapped campaign and whole-dollar pledge prefill", () => {
  const prefill = resolvePledgeImpactContributionPrefill({
    campaign: "campaign-animal-welfare-transition",
    amount: "35",
    pool: "pool-wild-research",
    source: "discover-threshold",
  });

  assert.deepEqual(prefill, {
    campaignId: "campaign-animal-welfare-transition",
    amountDollars: 35,
    poolPublicKey: "pool-wild-research",
    source: "discover-threshold",
    notice:
      "Opened from Discover Threshold. The campaign and amount are prefilled only. No pledge has been saved and no payment has been authorized.",
  });
});

test("rejects campaign mismatch, unknown source, fractional amount, and out-of-range amount", () => {
  const base = {
    campaign: "campaign-animal-welfare-transition",
    amount: "35",
    pool: "pool-wild-research",
    source: "threshold-radar",
  };
  assert.equal(resolvePledgeImpactContributionPrefill({ ...base, campaign: "campaign-public-interest-knowledge" }), null);
  assert.equal(resolvePledgeImpactContributionPrefill({ ...base, source: "email" }), null);
  assert.equal(resolvePledgeImpactContributionPrefill({ ...base, amount: "35.5" }), null);
  assert.equal(resolvePledgeImpactContributionPrefill({ ...base, amount: "1000001" }), null);
});
