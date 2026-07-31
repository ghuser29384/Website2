import assert from "node:assert/strict";
import test from "node:test";

import type { CredibilitySummary } from "@/lib/credibility";
import {
  matchesCreditFilter,
  offerMatchesFilters,
  rankOffers,
  rankProfiles,
  type OfferDiscoveryLike,
  type ProfileDiscoveryLike,
} from "@/lib/discovery-ranking";

function credibility(
  score: number | null,
  effectiveObservations = score === null ? 0 : 20,
): CredibilitySummary {
  return {
    modelVersion: "test",
    eligibility: "eligible",
    level: score === null ? "Unproven" : score >= 85 ? "Strong" : "Established",
    confidence:
      effectiveObservations >= 30
        ? "high"
        : effectiveObservations >= 10
          ? "medium"
          : effectiveObservations >= 3
            ? "low"
            : "limited",
    score,
    estimatedProbability: score === null ? null : Math.min(0.99, score / 100 + 0.04),
    conservativeProbability: score === null ? null : score / 100,
    credibleInterval: score === null ? null : [Math.max(0, score / 100 - 0.05), Math.min(1, score / 100 + 0.08)],
    effectiveObservations,
    eventCount: Math.round(effectiveObservations),
    independentCounterpartiesAtLeast: Math.min(10, Math.round(effectiveObservations / 2)),
    lastEventAt: null,
    context: {},
    dimensions: [],
    explanation: "Test summary",
  };
}

function offer(overrides: Partial<OfferDiscoveryLike> & Pick<OfferDiscoveryLike, "id">): OfferDiscoveryLike {
  const { id, ...optionalOverrides } = overrides;
  return {
    id,
    mode: "pledge",
    offered_cause: "Animal welfare",
    requested_cause: "Global poverty",
    compromise_cause: "Not needed",
    offer_action: "Complete a documented action",
    request_action: "Complete a reciprocal documented action",
    notes: "",
    verification: "Evidence-gated",
    duration: "30 days",
    owner_alias: "Participant",
    payment_interval_value: null,
    created_at: "2026-07-01T00:00:00.000Z",
    donationOffset: null,
    ...optionalOverrides,
  };
}

function profile(
  overrides: Partial<ProfileDiscoveryLike> & Pick<ProfileDiscoveryLike, "id" | "resolvedName">,
): ProfileDiscoveryLike {
  const { id, resolvedName, ...optionalOverrides } = overrides;
  return {
    id,
    resolvedName,
    display_name: resolvedName,
    bio: "Public member",
    publicLocation: "London, United Kingdom",
    wishPreview: "Open to evidence-backed cooperation",
    wishCollectiveName: null,
    wishCauses: ["Animal welfare"],
    wishOpenToPayment: false,
    wishOpenToPledges: true,
    wishParticipantKind: "individual",
    offerCount: 0,
    ratingCount: 0,
    verificationBadges: [],
    created_at: "2026-07-01T00:00:00.000Z",
    ...optionalOverrides,
  };
}

test("credit filters preserve Unproven records unless a proven threshold is requested", () => {
  assert.equal(matchesCreditFilter(undefined, "any"), true);
  assert.equal(matchesCreditFilter(undefined, "unproven"), true);
  assert.equal(matchesCreditFilter(undefined, "proven"), false);
  assert.equal(matchesCreditFilter(credibility(78), "70"), true);
  assert.equal(matchesCreditFilter(credibility(78), "80"), false);
});

test("text relevance remains more important than credit in best-match offer ranking", () => {
  const exact = offer({ id: "exact", offered_cause: "Animal welfare" });
  const weak = offer({
    id: "weak",
    offered_cause: "Climate",
    requested_cause: "Public health",
    offer_action: "Unrelated action",
    request_action: "Unrelated request",
    notes: "Mentions animal only in a note",
  });
  const scores = new Map([
    [exact.id, credibility(62, 12)],
    [weak.id, credibility(95, 35)],
  ]);

  const ranked = rankOffers([weak, exact], scores, "animal", "match", new Date("2026-07-15"));
  assert.equal(ranked[0]?.id, "exact");
});

test("credit breaks otherwise comparable offer matches", () => {
  const lower = offer({ id: "lower" });
  const higher = offer({ id: "higher" });
  const scores = new Map([
    [lower.id, credibility(66, 15)],
    [higher.id, credibility(91, 35)],
  ]);

  const ranked = rankOffers([lower, higher], scores, "animal", "match", new Date("2026-07-15"));
  assert.equal(ranked[0]?.id, "higher");
});

test("offer filters combine cause, payment, action, and minimum credit", () => {
  const paid = offer({
    id: "paid",
    mode: "payment",
    offered_cause: "Climate",
    requested_cause: "Public health",
    payment_interval_value: 100,
  });

  assert.equal(
    offerMatchesFilters(paid, credibility(82), {
      action: "payment",
      cause: "Climate",
      credit: "80",
      payment: "money",
      search: "public health",
    }),
    true,
  );
  assert.equal(
    offerMatchesFilters(paid, credibility(82), {
      action: "pledge",
      cause: "Climate",
      credit: "80",
      payment: "money",
      search: "public health",
    }),
    false,
  );
});

test("credit modestly changes otherwise comparable people results", () => {
  const lower = profile({ id: "lower", resolvedName: "Alex Green" });
  const higher = profile({ id: "higher", resolvedName: "Alex Grey" });
  const scores = new Map([
    [lower.id, credibility(64, 12)],
    [higher.id, credibility(90, 35)],
  ]);

  const ranked = rankProfiles([lower, higher], scores, "Alex", "match", new Date("2026-07-15"));
  assert.equal(ranked[0]?.id, "higher");
});

test("newest sort remains primarily chronological rather than credit-dominated", () => {
  const newer = profile({
    id: "newer",
    resolvedName: "New member",
    created_at: "2026-07-14T00:00:00.000Z",
  });
  const older = profile({
    id: "older",
    resolvedName: "Established member",
    created_at: "2025-01-01T00:00:00.000Z",
  });
  const scores = new Map([
    [newer.id, credibility(null)],
    [older.id, credibility(96, 40)],
  ]);

  const ranked = rankProfiles([older, newer], scores, "", "newest", new Date("2026-07-15"));
  assert.equal(ranked[0]?.id, "newer");
});
