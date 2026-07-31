import assert from "node:assert/strict";
import test from "node:test";

import {
  SMART_QUERY_CONFIDENCE_THRESHOLD,
  buildSmartQueryTarget,
  extractMoneyAmountsCents,
  matchesSmartAmountConstraint,
  matchesSmartDeadlineConstraint,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
} from "./smart-query";
import { parseSmartQueryWithClarification } from "./smart-query-clarification";
import {
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "./smart-query-scoring";
import {
  applySmartQuerySurfacePolicy,
  smartQuerySurfaceFromClarification,
} from "./smart-query-surface-policy";

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

test("applies a clarification answer while preserving parsed constraints", () => {
  const { refinedQuery, interpretation } = parseSmartQueryWithClarification(
    "Verified animal welfare work for $50",
    { field: "amount", answer: "Maximum" },
    { surface: "offers" },
  );

  assert.match(refinedQuery, /at most \$50/i);
  assert.deepEqual(interpretation.facets.causes, ["factory-farming"]);
  assert.equal(interpretation.facets.verified, true);
  assert.equal(interpretation.facets.maxAmountCents, 5_000);
  assert.equal(interpretation.needsClarification, false);
});

test("routes global queries to the relevant directory", () => {
  assert.equal(parseSmartQuery("people working on voting", { surface: "global" }).intent, "people");
  assert.equal(parseSmartQuery("accepted evidence receipts", { surface: "global" }).intent, "evidence");
  assert.equal(parseSmartQuery("conditional pools for public health", { surface: "global" }).intent, "pools");
  assert.equal(parseSmartQuery("dominant assurance contracts", { surface: "global" }).intent, "pools");
  assert.equal(parseSmartQuery("group-buying a moral trade", { surface: "global" }).intent, "offers");
  assert.equal(parseSmartQuery("biosecurity Co-Funds", { surface: "global" }).intent, "offers");
  assert.equal(parseSmartQuery("people joining biosecurity Co-Funds", { surface: "global" }).intent, "offers");
});

test("resolves common aliases and close typos semantically", () => {
  const interpretation = parseSmartQuery("goverment transparency projects", {
    surface: "offers",
  });
  assert.deepEqual(interpretation.facets.causes, ["civic-infrastructure"]);

  const score = smartInterpretationScore(interpretation, [
    { value: "Open civic infrastructure documentation for transparent local governance", weight: 1 },
  ]);
  assert.ok(score > 0.45);
});

test("serializes Discover Co-Funds under Offers rather than Pools", () => {
  const interpretation = parseSmartQuery("verified biosecurity Co-Funds under $100", {
    surface: "discover",
    now: "2026-07-23T00:00:00Z",
  });
  const target = buildSmartQueryTarget(interpretation);
  const url = new URL(target, "https://moraltrade.org");

  assert.equal(interpretation.intent, "discover");
  assert.ok(!interpretation.facets.actionTypes.includes("pool"));
  assert.equal(url.pathname, "/discover");
  assert.equal(url.searchParams.get("domain"), "offers");
  assert.equal(url.searchParams.get("offerKind"), "co-fund");
  assert.equal(url.searchParams.get("max_amount_cents"), "10000");
});

test("keeps standalone threshold funding under Pools", () => {
  const interpretation = parseSmartQuery("verified threshold pools under $100", {
    surface: "discover",
  });
  const target = buildSmartQueryTarget(interpretation);
  const url = new URL(target, "https://moraltrade.org");

  assert.ok(interpretation.facets.actionTypes.includes("pool"));
  assert.equal(url.searchParams.get("domain"), "pools");
  assert.equal(url.searchParams.get("offerKind"), null);
});

test("routes assurance-contract terminology to standalone Pools", () => {
  for (const query of [
    "dominant assurance contracts",
    "dominant-assurance contract",
    "assurance contracts",
  ]) {
    const interpretation = parseSmartQuery(query, { surface: "discover" });
    const target = buildSmartQueryTarget(interpretation);
    const url = new URL(target, "https://moraltrade.org");

    assert.ok(interpretation.facets.actionTypes.includes("pool"), query);
    assert.equal(url.searchParams.get("domain"), "pools", query);
    assert.equal(url.searchParams.get("offerKind"), null, query);
    assert.ok(
      !interpretation.residualTerms.some((term) =>
        ["dominant", "assurance", "contract", "contracts"].includes(term),
      ),
      query,
    );
  }
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
  assert.ok(smartPersonalPriorityScore(["civic-infrastructure"], ["Open governance"]) > 0.8);
  assert.equal(smartPersonalPriorityScore(["civic-infrastructure"], []), 0.5);
});

test("detects contradictory amount limits", () => {
  const interpretation = parseSmartQuery("at least $100 and under $50", {
    surface: "offers",
  });
  assert.equal(interpretation.needsClarification, true);
  assert.match(interpretation.reasonCodes.join(" "), /conflicting_amount_bounds/);
});

test("asks before moving unsupported wish constraints to the people directory", () => {
  const parsed = parseSmartQuery("verified civic collectives", { surface: "wishes" });
  const interpretation = applySmartQuerySurfacePolicy(parsed);

  assert.equal(interpretation.needsClarification, true);
  assert.equal(interpretation.clarification?.field, "route");
  assert.match(interpretation.clarification?.question ?? "", /search public people instead/i);
  assert.deepEqual(interpretation.facets.causes, ["civic-infrastructure"]);
  assert.equal(interpretation.facets.verified, true);
  assert.equal(
    smartQuerySurfaceFromClarification("wishes", "route", "Search public people"),
    "people",
  );
});

test("asks before applying offer-only amount constraints to people", () => {
  const interpretation = applySmartQuerySurfacePolicy(
    parseSmartQuery("civic people under $50", { surface: "people" }),
  );
  assert.equal(interpretation.needsClarification, true);
  assert.equal(interpretation.clarification?.field, "route");
  assert.deepEqual(interpretation.clarification?.options, ["Search live offers"]);
});

test("does not add a cross-directory clarification to broad Discover searches", () => {
  const interpretation = applySmartQuerySurfacePolicy(
    parseSmartQuery("verified civic opportunities under $50 before August 1", {
      now: "2026-07-23T00:00:00Z",
      surface: "discover",
    }),
  );
  assert.equal(interpretation.needsClarification, false);
  assert.equal(interpretation.parsedConstraintCount, 4);
});
