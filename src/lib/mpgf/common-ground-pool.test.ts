import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  COMMON_GROUND_POOL_ROUTE,
  buildBalancedCommonGroundPoolDraft,
  evaluateCommonGroundPoolDraft,
  formatCommonGroundPoolProposalTerms,
  getBalancedCommonGroundCostShares,
  parseUsdInputToCents,
} from "./common-ground-pool";

const exampleParticipants = [
  {
    id: "animal-welfare",
    name: "Animal-welfare funder",
    defaultProject: "Animal-welfare project",
    budgetCents: 1_000_000,
    sharedValueBps: 6_000,
  },
  {
    id: "long-run-future",
    name: "Long-term-future funder",
    defaultProject: "Long-term-future project",
    budgetCents: 1_000_000,
    sharedValueBps: 6_000,
  },
] as const;

test("the worked example produces a balanced $5,000 + $5,000 pool and $1,000 gain for each participant", () => {
  const draft = buildBalancedCommonGroundPoolDraft({
    participants: [...exampleParticipants],
    sharedProject: "Cause-general research and coordination",
    targetCents: 1_000_000,
  });

  assert.equal(draft.ok, true);
  assert.equal(draft.balancedSuggestionAvailable, true);
  assert.equal(draft.totalContributionCents, 1_000_000);
  assert.equal(draft.combinedSharedValueBps, 12_000);
  assert.equal(draft.coordinationMarginBps, 2_000);

  for (const participant of draft.participants) {
    assert.equal(participant.contributionCents, 500_000);
    assert.equal(participant.retainedDefaultCents, 500_000);
    assert.equal(participant.sharedProjectValueCents, 600_000);
    assert.equal(participant.equivalentValueCents, 1_100_000);
    assert.equal(participant.gainCents, 100_000);
    assert.equal(participant.gainsRelativeToDefault, true);
  }
});

test("balanced cost shares equalize the available surplus for unequal private values", () => {
  const shares = getBalancedCommonGroundCostShares([8_000, 4_000]);
  assert.ok(shares);
  assert.ok(Math.abs(shares[0]! - 0.7) < 0.000001);
  assert.ok(Math.abs(shares[1]! - 0.3) < 0.000001);

  const draft = buildBalancedCommonGroundPoolDraft({
    participants: [
      { ...exampleParticipants[0], sharedValueBps: 8_000 },
      { ...exampleParticipants[1], sharedValueBps: 4_000 },
    ],
    sharedProject: "Shared research infrastructure",
    targetCents: 1_000_000,
  });

  assert.equal(draft.ok, true);
  assert.deepEqual(draft.participants.map((participant) => participant.contributionCents), [700_000, 300_000]);
  assert.deepEqual(draft.participants.map((participant) => participant.gainCents), [100_000, 100_000]);
});

test("a balanced suggestion is unavailable when combined value does not exceed the shared cost", () => {
  const draft = buildBalancedCommonGroundPoolDraft({
    participants: [
      { ...exampleParticipants[0], sharedValueBps: 5_000 },
      { ...exampleParticipants[1], sharedValueBps: 5_000 },
    ],
    sharedProject: "Shared project",
    targetCents: 1_000_000,
  });

  assert.equal(draft.ok, false);
  assert.equal(draft.balancedSuggestionAvailable, false);
  assert.ok(draft.blockers.includes("combined_value_does_not_exceed_cost"));
});

test("manual splits fail closed when contributions do not sum to target or a participant does not gain", () => {
  const draft = evaluateCommonGroundPoolDraft({
    participants: [...exampleParticipants],
    sharedProject: "Shared project",
    targetCents: 1_000_000,
    contributionCentsByParticipantId: {
      "animal-welfare": 600_000,
      "long-run-future": 300_000,
    },
  });

  assert.equal(draft.ok, false);
  assert.ok(draft.blockers.includes("contributions_must_equal_target"));
  assert.ok(draft.blockers.includes("participant_does_not_gain:animal-welfare"));
});

test("participant budget caps are enforced", () => {
  const draft = evaluateCommonGroundPoolDraft({
    participants: [
      { ...exampleParticipants[0], budgetCents: 400_000 },
      exampleParticipants[1],
    ],
    sharedProject: "Shared project",
    targetCents: 1_000_000,
    contributionCentsByParticipantId: {
      "animal-welfare": 500_000,
      "long-run-future": 500_000,
    },
  });

  assert.equal(draft.ok, false);
  assert.ok(draft.blockers.includes("participant_budget_exceeded:animal-welfare"));
});

test("copied proposal terms omit private value estimates and make the no-capture boundary explicit", () => {
  const draft = buildBalancedCommonGroundPoolDraft({
    participants: [...exampleParticipants],
    sharedProject: "Cause-general research and coordination",
    targetCents: 1_000_000,
  });
  const terms = formatCommonGroundPoolProposalTerms(draft);

  assert.match(terms, /Common Ground Pool proposal/);
  assert.match(terms, /contribute \$5,000; retain \$5,000/);
  assert.match(terms, /No payment, authorization, hold, escrow, custody event, donation, or binding agreement/);
  assert.match(terms, /Private value estimates are not included/);
  assert.equal(terms.includes("60%"), false);
  assert.equal(terms.includes("$6,000"), false);
});

test("USD input parsing preserves integer cents", () => {
  assert.equal(parseUsdInputToCents("10,000"), 1_000_000);
  assert.equal(parseUsdInputToCents("25.5"), 2_550);
  assert.equal(parseUsdInputToCents("not money"), 0);
});

test("the public route is discoverable, local-only, responsive, and linked from the Public Goods Fund", () => {
  const routePath = "src/app/mpgf/common-ground-pool/page.tsx";
  const clientPath = "src/app/mpgf/common-ground-pool/common-ground-pool-builder.tsx";
  const cssPath = "src/app/mpgf/common-ground-pool/common-ground-pool.module.css";
  const hubPath = "src/app/mpgf/page.tsx";

  assert.equal(existsSync(routePath), true);
  assert.equal(existsSync(clientPath), true);
  assert.equal(existsSync(cssPath), true);

  const route = readFileSync(routePath, "utf8");
  const client = readFileSync(clientPath, "utf8");
  const css = readFileSync(cssPath, "utf8");
  const hub = readFileSync(hubPath, "utf8");

  assert.match(route, /Common Ground Pool/);
  assert.match(client, /Private value estimates stay in this browser tab/);
  assert.match(client, /No payment, authorization, hold, escrow, custody event, donation, or binding agreement/);
  assert.equal(client.includes("fetch("), false);
  assert.equal(client.includes("use server"), false);
  assert.match(css, /@media \(max-width:\s*900px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(hub, new RegExp(COMMON_GROUND_POOL_ROUTE.replaceAll("/", "\\/")));
});
