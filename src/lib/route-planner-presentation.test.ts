import assert from "node:assert/strict";
import test from "node:test";

import type { LiveNowRecommendation } from "./live-now-recommendations";
import { presentRoutePlanner } from "./route-planner-presentation";
import { buildRoutePlanner, type RouteRecommendationProfileRow } from "./route-recommendations";

const checkedAt = "2026-07-22T20:00:00.000Z";

const profile: RouteRecommendationProfileRow = {
  goal: "Reduce animal suffering",
  cause_priorities: ["Animal welfare"],
  money_budget_cents: 5_000,
  time_budget_minutes: 90,
  action_budget_count: 2,
  horizon: "month",
  route_formats: ["direct", "personal"],
  evidence_preference: "standard",
  uncertainty_preference: "balanced",
  interaction_preference: "open",
  privacy_preference: "private",
  planned_donation_baseline: false,
  planned_donation_cents: 0,
  otherwise_baseline: "I would otherwise take no additional action this month.",
  hard_constraints: "",
  pairwise_answers: {},
  interview_answers: { confirmed: true },
};

function recommendation(id: string, mode: "payment" | "pledge"): LiveNowRecommendation {
  return {
    id,
    ownerId: `owner-${id}`,
    ownerAlias: "Participant",
    mode,
    offeredCause: "Animal welfare",
    requestedCause: "Research review",
    compromiseCause: "Not needed",
    offerAction: "Support animal welfare",
    requestAction: "Review one brief for 20 minutes",
    verification: "Receipt and counterparty confirmation",
    duration: "Complete within 30 days",
    trustLevel: 3,
    createdAt: checkedAt,
    updatedAt: checkedAt,
    opportunityType: "offer",
    href: `/offers/${id}`,
    ctaLabel: "Review proposal",
    sourceLabel: "Published listing",
    summary: "A real published listing",
    benefitCauses: ["Animal welfare"],
    actionCauses: ["Research review"],
    actionKey: "review",
    actionLabel: "Review",
    matchCause: "Animal welfare",
    matchCauseSource: "profile_priority",
    actionCauseMatch: "",
    reason: "Matches your Animal welfare priority",
    reasonDetails: [],
    score: 70,
    difficulty: 2,
    difficultyLabel: "Easy",
    willingness: 60,
    actionFitLabel: "Strong fit",
    learnedActionSignalCount: 0,
    saved: false,
    scoreBreakdown: {
      benefit: 100,
      actionCause: 0,
      actionFit: 2,
      difficultyPenalty: 4,
      recency: 10,
      quality: 8,
      trust: 4,
      saved: 0,
    },
    metadata: { privacyLevel: "private" },
  };
}

test("presentation keeps live provenance and adapts the comparison contract", () => {
  const result = presentRoutePlanner(
    buildRoutePlanner({
      profile,
      recommendations: [recommendation("direct", "payment"), recommendation("pledge", "pledge")],
      checkedAt,
    }),
  );

  assert.equal(result.status, "ready");
  assert.equal(result.candidateCount, 2);
  assert.equal(result.profile.interviewCompleted, true);
  assert.equal("pairwiseAnswers" in result.profile, false);
  assert.equal("interviewAnswers" in result.profile, false);
  assert.equal("hardConstraints" in result.profile, false);
  assert.equal("hardConstraintsPresent" in result.profile, false);
  assert.ok(result.comparison);
  assert.equal(result.comparison.hypothetical, false);
  assert.ok(result.routes.every((route) => route.steps.every((step) => step.live && step.href)));
  assert.ok(
    Object.values(result.routes[0]?.metrics ?? {}).every(
      (metric) => metric.label && metric.basis,
    ),
  );
});

test("presentation exposes missing inputs without adding a filler route", () => {
  const result = presentRoutePlanner(
    buildRoutePlanner({ profile: null, recommendations: [], checkedAt }),
  );

  assert.equal(result.status, "incomplete");
  assert.ok(result.needsMoreInput.includes("otherwise_baseline"));
  assert.deepEqual(result.routes, []);
  assert.equal(result.candidateCount, 0);
});

test("seller-private baseline text never becomes a route title or detail", () => {
  const source = recommendation("private-baseline", "payment");
  source.summary = "PRIVATE_BASELINE_SENTINEL";
  const result = presentRoutePlanner(
    buildRoutePlanner({ profile, recommendations: [source], checkedAt }),
  );

  assert.equal(result.status, "ready");
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_BASELINE_SENTINEL/);
});
