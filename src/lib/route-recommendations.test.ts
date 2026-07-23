import assert from "node:assert/strict";
import test from "node:test";

import type { LiveNowRecommendation } from "./live-now-recommendations";
import {
  applyRouteComparisonChoice,
  buildPairwiseFormatAdjustments,
  buildRoutePlanner,
  classifyRoutePrivacyScope,
  normalizeRouteRecommendationProfile,
  parseConservativeRouteBurden,
  ROUTE_FORMATS,
  type RouteRecommendationProfileRow,
} from "./route-recommendations";

const checkedAt = new Date("2026-07-22T18:00:00.000Z");

function recommendation(
  id: string,
  options: Partial<LiveNowRecommendation> = {},
): LiveNowRecommendation {
  const { metadata: metadataOverrides, ...overrides } = options;
  return {
    id,
    ownerId: `owner-${id}`,
    ownerAlias: `Participant ${id}`,
    mode: "payment",
    offeredCause: "Animal welfare",
    requestedCause: "Research support",
    compromiseCause: "Not needed",
    offerAction: "Fund animal-welfare research",
    requestAction: "Review one research brief for 20 minutes",
    verification: "Public receipt and counterparty confirmation",
    duration: "Complete within 30 days",
    trustLevel: 3,
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-22T10:00:00.000Z",
    opportunityType: "offer",
    href: `/offers/${id}`,
    ctaLabel: "Review proposal",
    sourceLabel: "Paid moral trade",
    summary: `Live opportunity ${id}`,
    benefitCauses: ["Animal welfare"],
    actionCauses: ["Research support"],
    actionKey: "time:review",
    actionLabel: "Review or evaluate",
    matchCause: "Animal welfare",
    matchCauseSource: "explicit_priority",
    actionCauseMatch: "",
    reason: "Matches your Animal welfare priority",
    reasonDetails: ["A live listing matches a stated priority."],
    score: 80,
    difficulty: 2,
    difficultyLabel: "Easy",
    willingness: 60,
    actionFitLabel: "Strong fit",
    learnedActionSignalCount: 0,
    saved: false,
    scoreBreakdown: {
      benefit: 100,
      actionCause: 0,
      actionFit: 3.5,
      difficultyPenalty: 4,
      recency: 10,
      quality: 8,
      trust: 4.5,
      saved: 0,
    },
    metadata: {
      privacyLevel: "private",
      ...(metadataOverrides ?? {}),
    },
    ...overrides,
  };
}

function profile(overrides: RouteRecommendationProfileRow = {}): RouteRecommendationProfileRow {
  return {
    goal: "Help animals through feasible live opportunities",
    cause_priorities: ["Animal welfare"],
    money_budget_cents: 10_000,
    time_budget_minutes: 180,
    action_budget_count: 3,
    horizon: "month",
    route_formats: ["direct", "threshold", "redirect", "personal", "coalition"],
    evidence_preference: "standard",
    uncertainty_preference: "balanced",
    interaction_preference: "open",
    privacy_preference: "private",
    planned_donation_baseline: true,
    planned_donation_cents: 10_000,
    otherwise_baseline: "I would otherwise use the stated resources as recorded.",
    pairwise_answers: {},
    interview_answers: {},
    ...overrides,
  };
}

test("redirects are excluded unless the viewer confirms a planned-donation baseline", () => {
  const redirect = recommendation("redirect-1", {
    mode: "offset",
    opportunityType: "donation_redirect",
    href: "/offers/redirect-1",
    requestAction: "Redirect $20 of a planned donation",
    sourceLabel: "Donation redirect",
    metadata: { maximumBurden: "$20 and 10 minutes" },
  });
  const result = buildRoutePlanner({
    profile: profile({
      route_formats: ["redirect"],
      planned_donation_baseline: null,
      planned_donation_cents: null,
    }),
    recommendations: [redirect],
    checkedAt,
  });

  assert.equal(result.status, "needs_baseline");
  assert.deepEqual(result.steps, []);
  assert.deepEqual(result.routes, []);
  assert.deepEqual(result.liveSourceIds, []);
  assert.deepEqual(result.requiresBaselineForSourceIds, ["redirect-1"]);
  assert.ok(
    result.blockedSources[0]?.reasons.includes("planned_donation_baseline"),
  );
});

test("an explicit no-planned-donation answer is respected instead of being asked again", () => {
  const redirect = recommendation("redirect-declined", {
    mode: "offset",
    opportunityType: "donation_redirect",
    requestAction: "Redirect $10 of a planned donation",
    metadata: { maximumBurden: "$10" },
  });
  const result = buildRoutePlanner({
    profile: profile({
      route_formats: ["redirect"],
      planned_donation_baseline: false,
      planned_donation_cents: null,
    }),
    recommendations: [redirect],
    checkedAt,
  });

  assert.equal(result.status, "no_live_routes");
  assert.deepEqual(result.requiresBaselineForSourceIds, []);
  assert.deepEqual(result.steps, []);
});

test("aggregate route composition never exceeds a budget cap", () => {
  const candidates = [
    recommendation("fund-a", {
      requestAction: "Donate $30 and spend 10 minutes reviewing the receipt",
      metadata: { maximumBurden: "$30 and 10 minutes" },
    }),
    recommendation("fund-b", {
      requestAction: "Donate $30 and spend 10 minutes reviewing the receipt",
      metadata: { maximumBurden: "$30 and 10 minutes" },
    }),
    recommendation("fund-c", {
      requestAction: "Donate $30 and spend 10 minutes reviewing the receipt",
      metadata: { maximumBurden: "$30 and 10 minutes" },
    }),
  ];
  const result = buildRoutePlanner({
    profile: profile({
      route_formats: ["direct"],
      money_budget_cents: 5_000,
      action_budget_count: 3,
    }),
    recommendations: candidates,
    checkedAt,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.steps.length, 3, "each source is individually feasible");
  assert.ok(result.routes.length > 0);
  for (const route of result.routes) {
    assert.ok(route.totals.moneyCents <= 5_000);
    assert.equal(route.steps.length, 1, "a second $30 step would cross the $50 cap");
    assert.equal(new Set(route.steps.map((step) => step.sourceId)).size, route.steps.length);
  }
});

test("the planner never invents fallback candidates when no live source is supplied", () => {
  const result = buildRoutePlanner({
    profile: profile(),
    recommendations: [],
    checkedAt,
  });

  assert.equal(result.status, "no_live_routes");
  assert.deepEqual(result.steps, []);
  assert.deepEqual(result.routes, []);
  assert.deepEqual(result.liveSourceIds, []);
  assert.equal(result.activeComparison, null);
});

test("all routes require the user's no-trade baseline", () => {
  const result = buildRoutePlanner({
    profile: profile({ otherwise_baseline: "" }),
    recommendations: [recommendation("otherwise-ready")],
    checkedAt,
  });

  assert.equal(result.status, "needing_profile");
  assert.ok(result.missingProfileFields.includes("otherwise_baseline"));
  assert.deepEqual(result.steps, []);
  assert.deepEqual(result.routes, []);
});

test("an unsure comparison answer produces no pairwise preference update", () => {
  const initial = buildRoutePlanner({
    profile: profile({ route_formats: ["direct", "personal"] }),
    recommendations: [
      recommendation("direct"),
      recommendation("personal", { mode: "pledge" }),
    ],
    checkedAt,
  });
  assert.ok(initial.activeComparison);

  const updated = applyRouteComparisonChoice(
    initial.profile,
    initial.activeComparison,
    "unsure",
  );
  assert.deepEqual(buildPairwiseFormatAdjustments(updated.pairwiseAnswers), {
    direct: 0,
    threshold: 0,
    redirect: 0,
    personal: 0,
    coalition: 0,
  });
});

test("a neither answer treats both compared formats symmetrically", () => {
  const initial = buildRoutePlanner({
    profile: profile({ route_formats: ["direct", "personal"] }),
    recommendations: [
      recommendation("direct"),
      recommendation("personal", { mode: "pledge" }),
    ],
    checkedAt,
  });
  assert.ok(initial.activeComparison);

  const updated = applyRouteComparisonChoice(
    initial.profile,
    initial.activeComparison,
    "neither",
  );
  const adjustments = buildPairwiseFormatAdjustments(updated.pairwiseAnswers);
  const left = initial.activeComparison.left.routeFormat;
  const right = initial.activeComparison.right.routeFormat;

  assert.equal(adjustments[left], adjustments[right]);
  assert.equal(adjustments[left], -6);
});

test("routes use named components instead of one public moral score", () => {
  const result = buildRoutePlanner({
    profile: profile({ action_budget_count: 2 }),
    recommendations: [
      recommendation("high-fit", {
        difficulty: 5,
        difficultyLabel: "Hard",
        scoreBreakdown: {
          benefit: 122,
          actionCause: 0,
          actionFit: 0,
          difficultyPenalty: 16,
          recency: 10,
          quality: 8,
          trust: 3,
          saved: 0,
        },
        verification: "Evidence terms stated by the participant",
      }),
      recommendation("low-friction", {
        mode: "pledge",
        difficulty: 1,
        difficultyLabel: "Easy",
        scoreBreakdown: {
          benefit: 70,
          actionCause: 0,
          actionFit: 0,
          difficultyPenalty: 0,
          recency: 10,
          quality: 8,
          trust: 3,
          saved: 0,
        },
      }),
      recommendation("live-pool", {
        mode: "offset",
        opportunityType: "donation_pool",
        href: "/donation-offsets?pool=live-pool",
        sourceLabel: "Donation redirect pool",
        requestAction: "Join with $20 of a planned donation",
        metadata: { maximumBurden: "$20 and 10 minutes", evidenceLevel: "connected" },
        verification: "Connected provider receipt",
      }),
    ],
    checkedAt,
  });

  assert.equal(result.status, "ready");
  assert.ok(result.routes.length >= 1 && result.routes.length <= 3);
  const allowedLabels = new Set(["Best fit", "Lowest friction", "Live coordination"]);
  for (const route of result.routes) {
    assert.ok(allowedLabels.has(route.label));
    assert.deepEqual(Object.keys(route.components).sort(), [
      "coordination",
      "evidence",
      "fit",
      "friction",
    ]);
    assert.equal("score" in route, false);
    assert.ok(route.steps.length <= 3);
  }
});

test("every recommended step retains a supplied live source id", () => {
  const supplied = [
    recommendation("source-alpha"),
    recommendation("source-beta", { mode: "pledge" }),
  ];
  const result = buildRoutePlanner({
    profile: profile({ route_formats: ["direct", "personal"] }),
    recommendations: supplied,
    checkedAt,
  });
  const suppliedIds = new Set(supplied.map((candidate) => candidate.id));

  assert.deepEqual(new Set(result.liveSourceIds), suppliedIds);
  for (const route of result.routes) {
    for (const step of route.steps) assert.ok(suppliedIds.has(step.sourceId));
  }
});

test("decrypted runtime causes can fill the deliberately empty persisted cause array", () => {
  const normalized = normalizeRouteRecommendationProfile(
    profile({ cause_priorities: [] }),
    ["AI safety", "Animal welfare", "ai safety"],
  );

  assert.deepEqual(normalized.causePriorities, ["AI safety", "Animal welfare"]);
});

test("seller-written verification claims never become connected evidence", () => {
  const result = buildRoutePlanner({
    profile: profile({ evidence_preference: "connected" }),
    recommendations: [
      recommendation("seller-connected-claim", {
        verification: "Automatically verified by our connected provider",
        metadata: {
          evidenceLevel: "connected",
          connectedEvidence: true,
          verificationProviderId: "seller-asserted-provider",
        },
      }),
    ],
    checkedAt,
  });

  assert.equal(result.status, "no_live_routes");
  assert.ok(result.blockedSources[0]?.reasons.includes("evidence"));
});

test("conservative uncertainty rejects unknown sources but accepts structured conservative ones", () => {
  const unknown = buildRoutePlanner({
    profile: profile({ uncertainty_preference: "conservative" }),
    recommendations: [recommendation("unknown-uncertainty")],
    checkedAt,
  });
  const bounded = buildRoutePlanner({
    profile: profile({ uncertainty_preference: "conservative" }),
    recommendations: [
      recommendation("bounded-uncertainty", {
        metadata: { uncertaintyLevel: "conservative" },
      }),
    ],
    checkedAt,
  });

  assert.equal(unknown.status, "no_live_routes");
  assert.ok(unknown.blockedSources[0]?.reasons.includes("uncertainty"));
  assert.equal(bounded.status, "ready");
});

test("a source that exceeds the selected horizon is blocked", () => {
  const result = buildRoutePlanner({
    profile: profile({ horizon: "day" }),
    recommendations: [recommendation("month-long", { duration: "Complete within 30 days" })],
    checkedAt,
  });

  assert.equal(result.status, "no_live_routes");
  assert.ok(result.blockedSources[0]?.reasons.includes("horizon"));
});

test("encrypted placeholders stay missing and pairwise calibration is capped to ten pairs", () => {
  const pairwiseAnswers: Record<string, unknown> = {};
  for (let left = 0; left < ROUTE_FORMATS.length; left += 1) {
    for (let right = left + 1; right < ROUTE_FORMATS.length; right += 1) {
      const leftFormat = ROUTE_FORMATS[left];
      const rightFormat = ROUTE_FORMATS[right];
      pairwiseAnswers[`route-format:${leftFormat}:${rightFormat}`] = {
        leftFormat,
        rightFormat,
        choice: "left",
      };
    }
  }
  pairwiseAnswers["duplicate-reversed"] = {
    leftFormat: "personal",
    rightFormat: "direct",
    choice: "right",
  };
  const normalized = normalizeRouteRecommendationProfile({
    ...profile(),
    goal: "[encrypted private field]",
    cause_priorities: [],
    otherwise_baseline: "[encrypted private field unavailable]",
    pairwise_answers: pairwiseAnswers,
  });

  assert.equal(normalized.goal, "");
  assert.equal(normalized.otherwiseBaseline, "");
  assert.equal(Object.keys(normalized.pairwiseAnswers).length, 10);
});

test("source privacy and invite-only choices fail closed", () => {
  const publicSource = recommendation("public-source", {
    metadata: { privacyLevel: "public" },
  });
  const privateResult = buildRoutePlanner({
    profile: profile({ privacy_preference: "private" }),
    recommendations: [publicSource],
    checkedAt,
  });
  const publicResult = buildRoutePlanner({
    profile: profile({ privacy_preference: "public" }),
    recommendations: [publicSource],
    checkedAt,
  });
  const inviteOnlyBlocked = buildRoutePlanner({
    profile: profile({ interaction_preference: "invite" }),
    recommendations: [recommendation("open-source")],
    checkedAt,
  });
  const inviteOnlyReady = buildRoutePlanner({
    profile: profile({ interaction_preference: "invite" }),
    recommendations: [
      recommendation("invitation-source", { metadata: { invitationBacked: true } }),
    ],
    checkedAt,
  });

  assert.ok(privateResult.blockedSources[0]?.reasons.includes("privacy"));
  assert.equal(publicResult.status, "ready");
  assert.ok(inviteOnlyBlocked.blockedSources[0]?.reasons.includes("interaction"));
  assert.equal(inviteOnlyReady.status, "ready");
});

test("mixed public and participant-only offer scopes are never classified private", () => {
  assert.equal(
    classifyRoutePrivacyScope(
      "The listing is public and public-safe evidence may be published; sensitive details remain limited to participants and the operator.",
    ),
    "public-safe",
  );
  assert.equal(
    classifyRoutePrivacyScope("Participants and operator only; not public."),
    "private",
  );
});

test("an action already present in the no-trade baseline is excluded without misreading negation", () => {
  const source = recommendation("counterfactual", {
    requestAction: "Review one animal-welfare brief for 20 minutes",
  });
  const alreadyPlanned = buildRoutePlanner({
    profile: profile({
      otherwise_baseline: "I would review one animal-welfare brief for 20 minutes.",
    }),
    recommendations: [source],
    checkedAt,
  });
  const explicitlyNotPlanned = buildRoutePlanner({
    profile: profile({
      otherwise_baseline: "I would not review an animal-welfare brief this month.",
    }),
    recommendations: [source],
    checkedAt,
  });
  const mixedClause = buildRoutePlanner({
    profile: profile({
      otherwise_baseline: "I would not donate, but I would review one animal-welfare brief for 20 minutes.",
    }),
    recommendations: [source],
    checkedAt,
  });
  const trailingUnrelatedNegation = buildRoutePlanner({
    profile: profile({
      otherwise_baseline: "I would review one animal-welfare brief for 20 minutes and not donate.",
    }),
    recommendations: [source],
    checkedAt,
  });
  const precedingSentenceNegation = buildRoutePlanner({
    profile: profile({
      otherwise_baseline: "I would not donate. I would review one animal-welfare brief for 20 minutes.",
    }),
    recommendations: [source],
    checkedAt,
  });

  assert.ok(alreadyPlanned.blockedSources[0]?.reasons.includes("already_planned"));
  assert.equal(explicitlyNotPlanned.status, "ready");
  assert.ok(mixedClause.blockedSources[0]?.reasons.includes("already_planned"));
  assert.ok(trailingUnrelatedNegation.blockedSources[0]?.reasons.includes("already_planned"));
  assert.ok(precedingSentenceNegation.blockedSources[0]?.reasons.includes("already_planned"));
});

test("burden parsing combines partial fields, recurrence, additive costs, and difficulty", () => {
  const partial = parseConservativeRouteBurden(
    recommendation("partial-burden", {
      requestAction: "Review for 3 hours and pay $20",
      metadata: { maximumBurden: "$20" },
    }),
  );
  const recurring = parseConservativeRouteBurden(
    recommendation("recurring", {
      requestAction: "Spend 30 min/week for 4 weeks",
      metadata: {},
    }),
  );
  const additive = parseConservativeRouteBurden(
    recommendation("additive", {
      requestAction: "Pay $30 and $20 fee, plus 30 minutes prep plus 60 minutes on a call",
      metadata: {},
    }),
  );
  const difficultMoney = parseConservativeRouteBurden(
    recommendation("difficult-money", {
      requestAction: "Donate to the review",
      difficulty: 5,
      metadata: { maximumMoneyCents: 2_000 },
    }),
  );
  const unsupported = parseConservativeRouteBurden(
    recommendation("unsupported-currency", {
      requestAction: "Pay €20 for the review",
      metadata: {},
    }),
  );
  const recurringMoney = parseConservativeRouteBurden(
    recommendation("recurring-money", {
      requestAction: "Donate $20/month for 6 months",
      metadata: {},
    }),
  );
  const recurringMoneyWords = parseConservativeRouteBurden(
    recommendation("recurring-money-words", {
      requestAction: "Donate $10 per month for three months",
      metadata: {},
    }),
  );
  const recurringMoneyAdverb = parseConservativeRouteBurden(
    recommendation("recurring-money-adverb", {
      requestAction: "Donate $20 monthly for 6 months",
      metadata: {},
    }),
  );
  const recurringMoneyEachWords = parseConservativeRouteBurden(
    recommendation("recurring-money-each-words", {
      requestAction: "Donate $20 each month for six months",
      metadata: {},
    }),
  );
  const recurringDailyTime = parseConservativeRouteBurden(
    recommendation("recurring-daily-time", {
      requestAction: "Volunteer 30 min/day for 2 weeks",
      metadata: {},
    }),
  );
  const recurringDailyTimeWords = parseConservativeRouteBurden(
    recommendation("recurring-daily-time-words", {
      requestAction: "Volunteer 30 minutes daily for two weeks",
      metadata: {},
    }),
  );
  const recurringSplitDuration = parseConservativeRouteBurden(
    recommendation("recurring-split-duration", {
      requestAction: "Donate $20 monthly",
      duration: "6 months",
      metadata: {},
    }),
  );
  const unboundedRecurrence = parseConservativeRouteBurden(
    recommendation("unbounded-recurrence", {
      requestAction: "Volunteer 30 minutes daily",
      duration: "Ongoing",
      metadata: {},
    }),
  );
  const multipleActions = parseConservativeRouteBurden(
    recommendation("multiple-actions", {
      requestAction: "Make one call and one review",
      metadata: {},
    }),
  );

  assert.equal(partial.timeMinutes, 180);
  assert.equal(recurring.timeMinutes, 120);
  assert.equal(additive.moneyCents, 5_000);
  assert.equal(additive.timeMinutes, 90);
  assert.equal(difficultMoney.timeMinutes, 150);
  assert.equal(unsupported.moneyCertainty, "unknown");
  assert.equal(recurringMoney.moneyCents, 12_000);
  assert.equal(recurringMoneyWords.moneyCents, 3_000);
  assert.equal(recurringMoneyAdverb.moneyCents, 12_000);
  assert.equal(recurringMoneyEachWords.moneyCents, 12_000);
  assert.equal(recurringDailyTime.timeMinutes, 420);
  assert.equal(recurringDailyTime.actionCount, 14);
  assert.equal(recurringDailyTimeWords.timeMinutes, 420);
  assert.equal(recurringDailyTimeWords.actionCount, 14);
  assert.equal(recurringSplitDuration.moneyCents, 12_000);
  assert.equal(recurringSplitDuration.actionCount, 6);
  assert.equal(unboundedRecurrence.timeCertainty, "unknown");
  assert.equal(unboundedRecurrence.actionCertainty, "unknown");
  assert.equal(multipleActions.actionCount, 2);
});

test("unbounded recurring obligations fail closed against user caps", () => {
  const result = buildRoutePlanner({
    profile: profile(),
    recommendations: [
      recommendation("unbounded", {
        requestAction: "Volunteer 30 minutes daily",
        duration: "Ongoing",
        metadata: {},
      }),
    ],
    checkedAt,
  });

  assert.equal(result.status, "no_live_routes");
  assert.ok(result.blockedSources[0]?.reasons.includes("time_budget"));
  assert.ok(result.blockedSources[0]?.reasons.includes("action_budget"));
});

test("returned routes are non-dominated by feasible single-step alternatives", () => {
  const dominant = recommendation("dominant", {
    difficulty: 1,
    verification: "Public receipt and counterparty confirmation",
    scoreBreakdown: {
      benefit: 120,
      actionCause: 0,
      actionFit: 4,
      difficultyPenalty: 0,
      recency: 10,
      quality: 10,
      trust: 5,
      saved: 0,
    },
  });
  const weaker = recommendation("weaker", {
    difficulty: 5,
    verification: "Self report",
    scoreBreakdown: {
      benefit: 30,
      actionCause: 0,
      actionFit: 0,
      difficultyPenalty: 16,
      recency: 2,
      quality: 2,
      trust: 1,
      saved: 0,
    },
  });
  const result = buildRoutePlanner({
    profile: profile(),
    recommendations: [dominant, weaker],
    checkedAt,
  });

  assert.equal(result.status, "ready");
  assert.ok(result.routes.every((route) => route.steps.length === 1));
  assert.ok(result.routes.every((route) => route.steps[0]?.sourceId === "dominant"));
});

test("baseline prompts appear only when resolving the baseline can make the source feasible", () => {
  const result = buildRoutePlanner({
    profile: profile({
      route_formats: ["direct"],
      planned_donation_baseline: null,
      planned_donation_cents: null,
    }),
    recommendations: [
      recommendation("wrong-format-redirect", {
        mode: "offset",
        opportunityType: "donation_redirect",
        requestAction: "Redirect $20 of a planned donation",
        metadata: { maximumBurden: "$20" },
      }),
    ],
    checkedAt,
  });

  assert.equal(result.status, "no_live_routes");
  assert.deepEqual(result.requiresBaselineForSourceIds, []);
});

test("unknown planned-donation state and encrypted cause sentinels remain unknown", () => {
  const normalized = normalizeRouteRecommendationProfile({
    ...profile(),
    planned_donation_baseline: null,
    cause_priorities: ["[encrypted private field]", "bgenc:v2:secret"],
  });

  assert.equal(normalized.plannedDonationBaseline, null);
  assert.deepEqual(normalized.causePriorities, []);
});

test("unknown durations fail the horizon cap while quarter and year boundaries remain usable", () => {
  const unknown = buildRoutePlanner({
    profile: profile({ horizon: "month" }),
    recommendations: [recommendation("ongoing", { duration: "Ongoing" })],
    checkedAt,
  });
  const quarter = buildRoutePlanner({
    profile: profile({ horizon: "quarter" }),
    recommendations: [recommendation("three-months", { duration: "3 months" })],
    checkedAt,
  });
  const year = buildRoutePlanner({
    profile: profile({ horizon: "year" }),
    recommendations: [recommendation("twelve-months", { duration: "12 months" })],
    checkedAt,
  });

  assert.ok(unknown.blockedSources[0]?.reasons.includes("horizon"));
  assert.equal(quarter.status, "ready");
  assert.equal(year.status, "ready");
});

test("conservative preference rejects a source explicitly marked balanced", () => {
  const result = buildRoutePlanner({
    profile: profile({ uncertainty_preference: "conservative" }),
    recommendations: [
      recommendation("balanced-source", { metadata: { uncertaintyLevel: "balanced" } }),
    ],
    checkedAt,
  });

  assert.ok(result.blockedSources[0]?.reasons.includes("uncertainty"));
});

test("calibration stops after five answered live format comparisons", () => {
  const pairwise_answers = Object.fromEntries(
    [
      ["direct", "personal"],
      ["direct", "threshold"],
      ["direct", "coalition"],
      ["personal", "threshold"],
      ["personal", "coalition"],
    ].map(([leftFormat, rightFormat]) => [
      `route-format:${leftFormat}:${rightFormat}`,
      { leftFormat, rightFormat, choice: "equal" },
    ]),
  );
  const result = buildRoutePlanner({
    profile: profile({ pairwise_answers }),
    recommendations: [
      recommendation("direct-five"),
      recommendation("personal-five", { mode: "pledge" }),
    ],
    checkedAt,
  });

  assert.equal(result.activeComparison, null);
});

test("unsupported free-text hard constraints are not collected or treated as enforced", () => {
  const result = buildRoutePlanner({
    profile: profile({ hard_constraints: "Never publish my identity." }),
    recommendations: [recommendation("hard-constraint")],
    checkedAt,
  });

  assert.equal(result.status, "ready");
  assert.equal("hardConstraints" in result.profile, false);
});

test("feasibility is checked before the composition pool is bounded", () => {
  const publicSources = Array.from({ length: 12 }, (_, index) =>
    recommendation(`public-${index}`, { metadata: { privacyLevel: "public" } }),
  );
  const result = buildRoutePlanner({
    profile: profile({ privacy_preference: "private" }),
    recommendations: [...publicSources, recommendation("thirteenth-feasible")],
    checkedAt,
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.liveSourceIds, ["thirteenth-feasible"]);
});

test("a globally dominant thirteenth feasible source is retained", () => {
  const weaker = Array.from({ length: 12 }, (_, index) =>
    recommendation(`weaker-${index}`, {
      difficulty: 5,
      verification: "Self report",
      scoreBreakdown: {
        benefit: 30,
        actionCause: 0,
        actionFit: 0,
        difficultyPenalty: 16,
        recency: 1,
        quality: 1,
        trust: 1,
        saved: 0,
      },
    }),
  );
  const dominant = recommendation("dominant-thirteen", {
    difficulty: 1,
    scoreBreakdown: {
      benefit: 120,
      actionCause: 0,
      actionFit: 5,
      difficultyPenalty: 0,
      recency: 10,
      quality: 10,
      trust: 5,
      saved: 0,
    },
  });
  const result = buildRoutePlanner({
    profile: profile(),
    recommendations: [...weaker, dominant],
    checkedAt,
  });

  assert.ok(result.routes.length > 0);
  assert.ok(result.routes.every((route) => route.steps[0]?.sourceId === "dominant-thirteen"));
});

test("equal-component routes with a higher burden are dominated", () => {
  const lowBurden = recommendation("low-burden-equal", {
    requestAction: "Review one brief for 10 minutes",
    metadata: { maximumBurden: "10 minutes" },
  });
  const highBurden = recommendation("high-burden-equal", {
    requestAction: "Review one brief for 60 minutes",
    metadata: { maximumBurden: "60 minutes" },
  });
  const result = buildRoutePlanner({
    profile: profile(),
    recommendations: [highBurden, lowBurden],
    checkedAt,
  });

  assert.ok(result.routes.every((route) => route.steps[0]?.sourceId === "low-burden-equal"));
});
