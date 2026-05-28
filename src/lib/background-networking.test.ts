import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDeterministicMatch, type DeterministicSignals } from "@/lib/background-networking";

type DeterministicMatchInput = Parameters<typeof evaluateDeterministicMatch>[0];

const baseSignals = {
  askTerms: [],
  capabilityTags: [],
  confidenceScore: 80,
  constraintFlags: [],
  missingFields: [],
  offerTerms: [],
  sourceCount: 1,
  uncertaintyFlags: [],
} satisfies DeterministicSignals;

test("deterministic background matches do not return raw overlapping private terms", () => {
  const evaluation = evaluateDeterministicMatch({
    counterparty: {
      background_search_enabled: true,
      causes: ["Animal welfare"],
      collective_name: null,
      location_city: "New York",
      location_region: "New York",
      openness_to_payment: true,
      openness_to_pledges: true,
      participant_kind: "individual",
      privacy_stage: "broad",
      profile_id: "counterparty-profile",
      public_preview: "Can help with secretcalibration under reviewer-visible evidence.",
    } as DeterministicMatchInput["counterparty"],
    counterpartySignals: {
      ...baseSignals,
      offerTerms: ["secretcalibration"],
    },
    runLabel: "test",
    viewer: {
      askText: "I need secretcalibration help before I share any contact details.",
      askTerms: ["secretcalibration"],
      causes: ["Animal welfare"],
      locationCity: "New York",
      locationRegion: "New York",
      openToPayment: true,
      openToPledges: true,
      privacyStage: "broad",
      publicPreview: "Looking for broad moral trade compatibility.",
      signals: {
        ...baseSignals,
        askTerms: ["secretcalibration"],
      },
      sourceCount: 1,
      wishText: "secretcalibration should remain private",
    },
  });
  const serialized = JSON.stringify(evaluation);

  assert.ok(evaluation.sharedTokens.every((token) => token.startsWith("broad_language_overlap_")));
  assert.doesNotMatch(serialized, /secretcalibration/i);
  assert.match(evaluation.viewerReason, /broad ask\/offer compatibility signal/);
});
