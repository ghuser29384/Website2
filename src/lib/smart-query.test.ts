import assert from "node:assert/strict";
import test from "node:test";

import {
  SMART_QUERY_CONFIDENCE_THRESHOLD,
  buildSmartQueryTarget,
  extractMoneyAmountsCents,
  getSmartPersonalFit,
  matchesSmartAmountConstraint,
  matchesSmartDeadlineConstraint,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
  semanticTextScore,
} from "./smart-query";

test("parses the verified civic budget and deadline example without clarification", () => {
  const interpretation = parseSmartQuery(
    "Find verified civic opportunities under $50 before August 1",
    { now: "2026-07-23T04:38:24Z", surface: "discover" },
  );

  assert.deepEqual(interpretation.facets.causes, ["civic-infrastructure"]);
  assert.equal(interpretation.facets.verified, true);
  assert.equal(interpretation.facets.maxAmountCents, 5_000);
  assert.equal(interpretation.facets.maxAmountInclusive, false);
  assert.equal(interpretation.facets.deadlineBefore, "2026-08-01");
  assert.equal(interpretation.facets.deadlineBeforeInclusive, false);
  assert.equal(interpretation.parsedConstraintCount, 4);
  assert.equal(interpretation.needsClarification, false);
  assert.equal(interpretation.clarification, null);
  assert.ok(interpretation.confidence >= SMART_QUERY_CONFIDENCE_THRESHOLD);
});

test("does not treat a broad but usable cause search as ambiguous", () => {
  const interpretation = parseSmartQuery("Find civic opportunities", {
    surface: "offers",
    now: "2026-07-23T00:00:00Z",
  });

  assert.deepEqual(interpretation.facets.causes, ["civic-infrastructure"]);
  assert.equal(interpretation.needsClarification, false);
  assert.equal(interpretation.intent, "offers");
});

test("asks one material clarification for a standalone amount while preserving other facets", () => {
  const interpretation = parseSmartQuery("Verified animal welfare work for $50", {
    surface: "offers",
  });

  assert.deepEqual(interpretation.facets.causes, ["factory-farming"]);
  assert.equal(interpretation.facets.verified, true);
  assert.equal(interpretation.needsClarification, true);
  assert.equal(interpretation.clarification?.field, "amount");
  assert.match(interpretation.clarification?.question ?? "", /maximum.*minimum.*exact/i);
  assert.ok(interpretation.confidence < SMART_QUERY_CONFIDENCE_THRESHOLD);
});

test("routes global queries to the relevant directory", () => {
  assert.equal(parseSmartQuery("people working on voting", { surface: "global" }).intent, "people");
  assert.equal(parseSmartQuery("accepted evidence receipts", { surface: "global" }).intent, "evidence");
  assert.equal(parseSmartQuery("conditional pools for public health", { surface: "global" }).intent, "pools");
});

test("resolves common aliases and close typos semantically", () => {
  const interpretation = parseSmartQuery("goverment transparency projects", {
    surface: "offers",
  });
  assert.deepEqual(interpretation.facets.causes, ["civic-infrastructure"]);

  const score = semanticTextScore(interpretation, [
    { value: "Open civic infrastructure documentation for transparent local governance", weight: 1 },
  ]);
  assert.ok(score > 0.45);
});

test("serializes a smart target and parses the facets back", () => {
  const interpretation = parseSmartQuery(
    "verified civic opportunities under $50 before August 1",
    { now: "2026-07-23T00:00:00Z", surface: "offers" },
  );
  const target = buildSmartQueryTarget(interpretation);
  const url = new URL(target, "https://moraltrade.org");

  assert.equal(url.pathname, "/offers");
  assert.equal(url.searchParams.get("smart"), "1");
  assert.equal(url.searchParams.get("verified"), "1");
  assert.equal(url.searchParams.get("max_amount_cents"), "5000");
  assert.equal(url.searchParams.get("deadline_before"), "2026-08-01");

  const entries = Object.fromEntries(url.searchParams.entries());
  const facets = parseSerializedSmartQueryFacets(entries);
  assert.deepEqual(facets.causes, ["civic-infrastructure"]);
  assert.equal(facets.verified, true);
  assert.equal(facets.maxAmountCents, 5_000);
  assert.equal(facets.maxAmountInclusive, false);
});

test("enforces inclusive and exclusive money constraints", () => {
  const under = parseSmartQuery("under $50", { surface: "offers" }).facets;
  assert.equal(matchesSmartAmountConstraint(under, [4_999]), true);
  assert.equal(matchesSmartAmountConstraint(under, [5_000]), false);
  assert.equal(matchesSmartAmountConstraint(under, []), false);

  const atMost = parseSmartQuery("at most $50", { surface: "offers" }).facets;
  assert.equal(matchesSmartAmountConstraint(atMost, [5_000]), true);

  assert.deepEqual(extractMoneyAmountsCents("Pay $12.50", "maximum $2k"), [1_250, 200_000]);
});

test("enforces deadline boundaries", () => {
  const before = parseSmartQuery("before August 1", {
    surface: "pools",
    now: "2026-07-23T00:00:00Z",
  }).facets;
  assert.equal(matchesSmartDeadlineConstraint(before, "2026-07-31T23:59:00Z"), true);
  assert.equal(matchesSmartDeadlineConstraint(before, "2026-08-01T00:00:00Z"), false);
  assert.equal(matchesSmartDeadlineConstraint(before, null), false);

  const through = parseSmartQuery("through August 1", {
    surface: "pools",
    now: "2026-07-23T00:00:00Z",
  }).facets;
  assert.equal(matchesSmartDeadlineConstraint(through, "2026-08-01T23:59:00Z"), true);
});

test("uses personal priorities as a bounded fit signal", () => {
  assert.ok(getSmartPersonalFit(["civic-infrastructure"], ["Open governance"]) > 0.8);
  assert.equal(getSmartPersonalFit(["civic-infrastructure"], []), 0.5);
});

test("detects contradictory amount limits", () => {
  const interpretation = parseSmartQuery("at least $100 and under $50", {
    surface: "offers",
  });
  assert.equal(interpretation.needsClarification, true);
  assert.match(interpretation.reasonCodes.join(" "), /conflicting_amount_bounds/);
});
