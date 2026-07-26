import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_DEFAULT_PROGRESS_VISIBILITY,
  MPGF_PROGRESS_VISIBILITY_RANK,
  MPGF_PROGRESS_VISIBILITY_VALUES,
  MPGF_THRESHOLD_VISIBILITY,
  assertMpgfProgressVisibilityChangeAllowed,
  canChangeMpgfProgressVisibility,
  isMpgfProgressVisibility,
} from "./pool-visibility";

test("pool visibility exposes the required schema values", () => {
  assert.equal(MPGF_THRESHOLD_VISIBILITY, "public_exact");
  assert.equal(MPGF_DEFAULT_PROGRESS_VISIBILITY, "exact_amount");
  assert.deepEqual(MPGF_PROGRESS_VISIBILITY_VALUES, [
    "exact_amount",
    "progress_range",
    "threshold_status_only",
    "sealed_progress",
  ]);
});

test("progress visibility ranks modes from least to most transparent", () => {
  assert.deepEqual(MPGF_PROGRESS_VISIBILITY_RANK, {
    sealed_progress: 1,
    threshold_status_only: 2,
    progress_range: 3,
    exact_amount: 4,
  });
});

test("all visibility changes remain available before a pledge is accepted", () => {
  for (const from of MPGF_PROGRESS_VISIBILITY_VALUES) {
    for (const to of MPGF_PROGRESS_VISIBILITY_VALUES) {
      assert.equal(
        canChangeMpgfProgressVisibility({ from, to, hasAcceptedPledge: false }),
        true,
        `${from} → ${to} should be allowed before acceptance`,
      );
    }
  }
});

test("after acceptance visibility can stay the same or become more transparent", () => {
  for (const from of MPGF_PROGRESS_VISIBILITY_VALUES) {
    for (const to of MPGF_PROGRESS_VISIBILITY_VALUES) {
      const expected = MPGF_PROGRESS_VISIBILITY_RANK[to] >= MPGF_PROGRESS_VISIBILITY_RANK[from];
      assert.equal(
        canChangeMpgfProgressVisibility({ from, to, hasAcceptedPledge: true }),
        expected,
        `${from} → ${to} had the wrong post-acceptance result`,
      );
    }
  }
});

test("a post-acceptance transparency downgrade throws", () => {
  assert.throws(
    () =>
      assertMpgfProgressVisibilityChangeAllowed({
        from: "exact_amount",
        to: "progress_range",
        hasAcceptedPledge: true,
      }),
    /cannot become less transparent/i,
  );

  assert.doesNotThrow(() =>
    assertMpgfProgressVisibilityChangeAllowed({
      from: "sealed_progress",
      to: "exact_amount",
      hasAcceptedPledge: true,
    }),
  );
});

test("runtime validation accepts only the four enum values", () => {
  for (const value of MPGF_PROGRESS_VISIBILITY_VALUES) {
    assert.equal(isMpgfProgressVisibility(value), true);
  }

  assert.equal(isMpgfProgressVisibility("public_exact"), false);
  assert.equal(isMpgfProgressVisibility("hidden"), false);
  assert.equal(isMpgfProgressVisibility(null), false);
});
