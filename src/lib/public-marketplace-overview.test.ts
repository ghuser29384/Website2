import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_MARKETPLACE_OVERVIEW_TIMEOUT_MS,
  createUnavailableMarketplaceOverview,
  resolvePublicMarketplaceOverview,
} from "./public-marketplace-overview";
import type { MarketplaceOverview } from "./app-data";

const liveOverview: MarketplaceOverview = {
  hasLiveData: true,
  openOfferCount: 12,
  publicProfileCount: 8,
  completedAgreementCount: 3,
  redirectedOffsetCents: 4_500,
  pooledCommitmentCents: 7_500,
};

test("the optional marketplace snapshot has a bounded public-route deadline", () => {
  assert.equal(PUBLIC_MARKETPLACE_OVERVIEW_TIMEOUT_MS, 4_000);
});

test("public marketplace overview preserves live data delivered before the deadline", async () => {
  const result = await resolvePublicMarketplaceOverview(
    Promise.resolve(liveOverview),
    250,
  );

  assert.deepEqual(result, liveOverview);
});

test("public marketplace overview degrades to truthful unavailable metrics after the deadline", async () => {
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => warnings.push(args);

  try {
    const result = await resolvePublicMarketplaceOverview(
      new Promise<MarketplaceOverview>(() => {}),
      5,
    );

    assert.deepEqual(result, createUnavailableMarketplaceOverview());
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0]?.[0]), /Marketplace overview timed out/);
    assert.deepEqual(warnings[0]?.[1], { timeoutMs: 5 });
  } finally {
    console.warn = originalWarn;
  }
});

test("public marketplace overview still surfaces failures that arrive before the deadline", async () => {
  await assert.rejects(
    resolvePublicMarketplaceOverview(
      Promise.reject(new Error("overview unavailable")),
      250,
    ),
    /overview unavailable/,
  );
});
