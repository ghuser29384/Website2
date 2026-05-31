import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMoralTradeRedactedProfileMatch,
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignal,
  type MoralTradeMatchSignal,
  type MoralTradeMatchSignalContract,
  type MoralTradeRedactedProfile,
} from "./match-signal";
import { GET as contractRoute } from "../../app/api/moral-trade/match-signal/contract/route";
import { POST as evaluateRoute } from "../../app/api/moral-trade/match-signal/evaluate/route";

const leftProfile = {
  profileId: "profile-left",
  causeAreas: ["Animal welfare", "Global health"],
  tradeModes: ["pledge_swap", "donation_offset"],
  verificationPreferences: ["receipt", "public_log"],
  locationSensitivity: "region",
  locationRegion: "New York",
  locationCity: "New York",
  privacyStage: "broad_preview",
  privacyConstraints: ["broad previews only"],
  statedExclusions: ["no political campaign offsets"],
} satisfies MoralTradeRedactedProfile;

const rightProfile = {
  profileId: "profile-right",
  causeAreas: ["Animal welfare", "Climate"],
  tradeModes: ["pledge_swap"],
  verificationPreferences: ["receipt", "attestation"],
  locationSensitivity: "region",
  locationRegion: "New York",
  locationCity: "Albany",
  privacyStage: "broad_preview",
  privacyConstraints: ["keep contact private"],
  statedExclusions: ["no anonymous paid action"],
} satisfies MoralTradeRedactedProfile;

test("redacted profile match signals use factor codes, redactions, and human review", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: leftProfile,
    right: rightProfile,
  });

  assert.equal(signal.status, "matchable");
  assert.equal(signal.confidenceBand, "high");
  assert.equal(signal.humanReviewRequired, true);
  assert.deepEqual(signal.blockers, []);
  assert.equal(signal.counts.sharedCauseAreas, 1);
  assert.ok(signal.factorCodes.includes("cause_area_overlap"));
  assert.ok(signal.factorCodes.includes("trade_mode_compatible"));
  assert.ok(signal.factorCodes.includes("verification_preference_compatible"));
  assert.ok(signal.factorCodes.includes("privacy_safe_preview"));
  assert.ok(signal.factorCodes.includes("human_review_required"));
  assert.ok(signal.redactedFields.includes("exact_private_wishes"));
  assert.ok(signal.redactedFields.includes("ideology_or_psychology_inferences"));
  assert.equal(signal.participantExplanation.headline, "Why you are seeing this match");
  assert.match(signal.participantExplanation.summary, /public cause areas/i);
  assert.match(signal.participantExplanation.summary, /trade mode/i);
  assert.match(signal.participantExplanation.summary, /verification preferences/i);
  assert.match(signal.participantExplanation.summary, /Exact wishes and contact details are still hidden/i);
  assert.ok(signal.participantExplanation.visibleFactorCodes.includes("cause_area_overlap"));
  assert.ok(signal.participantExplanation.visibleFactorCodes.includes("privacy_safe_preview"));
  assert.match(signal.participantExplanation.redactionNotice, /protected traits/i);
  assert.match(signal.participantExplanation.humanReviewNotice, /before disclosure, contact, reliance, or state changes/i);
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching accepts cause-area complementarity without direct overlap", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      causeAreas: ["Animal welfare"],
      offeredCauseAreas: ["Animal welfare"],
      requestedCauseAreas: ["Global health"],
    },
    right: {
      ...rightProfile,
      causeAreas: ["Climate"],
      offeredCauseAreas: ["Global health"],
      requestedCauseAreas: ["Animal welfare"],
    },
  });

  assert.equal(signal.status, "matchable");
  assert.equal(signal.counts.sharedCauseAreas, 0);
  assert.equal(signal.counts.causeAreaComplementarity, 2);
  assert.ok(signal.factorCodes.includes("cause_area_complementarity"));
  assert.ok(!signal.factorCodes.includes("cause_area_overlap"));
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching blocks unresolved location, privacy, and exclusion conflicts", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      locationSensitivity: "city",
      locationCity: "New York",
      privacyConstraints: ["manual only"],
    },
    right: {
      ...rightProfile,
      causeAreas: ["Animal welfare"],
      locationSensitivity: "city",
      locationCity: "Albany",
      statedExclusions: ["animal welfare"],
    },
  });

  assert.equal(signal.status, "not_matchable");
  assert.equal(signal.confidenceBand, "low");
  assert.equal(signal.humanReviewRequired, true);
  assert.ok(signal.blockers.includes("location_constraint_unresolved"));
  assert.ok(signal.blockers.includes("privacy_stage_or_constraint_unresolved"));
  assert.ok(signal.blockers.includes("stated_exclusion_conflict"));
  assert.ok(!signal.factorCodes.includes("privacy_safe_preview"));
  assert.ok(!signal.factorCodes.includes("privacy_stage_compatible"));
  assert.equal(signal.participantExplanation.headline, "Why this match is paused");
  assert.match(signal.participantExplanation.summary, /Unresolved checks/i);
  assert.match(signal.participantExplanation.redactionNotice, /Exact wishes/i);
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching honors phrase-level stated exclusions", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      statedExclusions: ["no political campaign offsets"],
    },
    right: {
      ...rightProfile,
      causeAreas: ["Political campaign", "Public health"],
      tradeModes: ["donation_offset"],
      verificationPreferences: ["receipt"],
    },
  });

  assert.equal(signal.status, "not_matchable");
  assert.ok(signal.blockers.includes("stated_exclusion_conflict"));
  assert.equal(signal.confidenceBand, "low");
  assert.equal(signal.humanReviewRequired, true);
  assert.ok(!signal.factorCodes.includes("stated_exclusions_clear"));
  assert.match(signal.participantExplanation.summary, /stated_exclusion_conflict/);
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("redacted profile matching ignores unsupported private inference fields", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: {
      ...leftProfile,
      ideology: "private ideology should never appear",
      psychology: "hidden preference should never appear",
    } as MoralTradeRedactedProfile,
    right: rightProfile,
  });
  const serialized = JSON.stringify(signal);

  assert.doesNotMatch(serialized, /private ideology/i);
  assert.doesNotMatch(serialized, /hidden preference/i);
  assert.equal(validateMoralTradeMatchSignal(signal).status, "pass");
});

test("match signal validation rejects autonomous disclosure and unapproved factors", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: leftProfile,
    right: rightProfile,
  }) as MoralTradeMatchSignal;

  signal.humanReviewRequired = false;
  signal.redactedFields = [];
  signal.factorCodes = [...signal.factorCodes, "raw_private_text_overlap" as MoralTradeMatchSignal["factorCodes"][number]];
  signal.participantExplanation.redactionNotice = "Nothing is hidden.";

  const validation = validateMoralTradeMatchSignal(signal);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("human_review_required")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("redacted_fields")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("factor_codes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("participant_explanation")));
});

test("match signal validation rejects privacy-safe preview without compatible privacy stage", () => {
  const signal = evaluateMoralTradeRedactedProfileMatch({
    left: leftProfile,
    right: rightProfile,
  }) as MoralTradeMatchSignal;

  signal.factorCodes = signal.factorCodes.filter((code) => code !== "privacy_stage_compatible");

  const validation = validateMoralTradeMatchSignal(signal);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("privacy_safe_preview: requires compatible privacy stage"),
    ),
  );
});

test("match signal contract validates the redacted matching boundary", () => {
  const contract = getMoralTradeMatchSignalContract();
  const validation = validateMoralTradeMatchSignalContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(contract.decisioningMode, "redacted_profile_match_preview_only");
  assert.equal(contract.stateMutation, false);
  assert.ok(contract.requiredInputFields.includes("privacyStage"));
  assert.ok(contract.approvedFactorCodes.includes("cause_area_complementarity"));
  assert.ok(contract.redactedFields.includes("exact_private_wishes"));
  assert.ok(contract.redactedFields.includes("ideology_or_psychology_inferences"));
  assert.equal(
    contract.participantExplanationTemplate.matchableHeadline,
    "Why you are seeing this match",
  );
  assert.match(contract.participantExplanationTemplate.matchableSummary, /public cause areas/i);
  assert.match(contract.participantExplanationTemplate.redactionNotice, /contact details/i);
  assert.ok(contract.contractTests.includes("match_signal_evaluate_route_contract"));
  assert.ok(contract.contractTests.includes("participant_explanation_copy_smoke"));
});

test("match signal contract validation fails if human review and redactions are weakened", () => {
  const contract: MoralTradeMatchSignalContract = {
    ...getMoralTradeMatchSignalContract(),
    redactedFields: ["exact_private_wishes"],
    invariants: ["Match previews can disclose automatically."],
    sampleSignal: {
      ...getMoralTradeMatchSignalContract().sampleSignal,
      humanReviewRequired: false,
      redactedFields: [],
    },
    participantExplanationTemplate: {
      ...getMoralTradeMatchSignalContract().participantExplanationTemplate,
      matchableSummary: "Compatible.",
      redactionNotice: "Nothing hidden.",
      humanReviewNotice: "Can proceed automatically.",
    },
    contractTests: [],
  };
  const validation = validateMoralTradeMatchSignalContract(contract);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("redaction-boundary")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("sample-signal-validation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("nonmutating-human-review")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("no-private-inference")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("participant-explanation-template")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});

test("match signal routes publish participant explanation copy", async () => {
  const contractResponse = await contractRoute(
    new Request("http://localhost/api/moral-trade/match-signal/contract"),
  );
  const contractBody = await contractResponse.json();

  assert.equal(contractResponse.status, 200);
  assert.equal(
    contractBody.publicContract.participantExplanationTemplate.matchableHeadline,
    "Why you are seeing this match",
  );
  assert.match(
    contractBody.publicContract.sampleSignal.participantExplanation.summary,
    /public cause areas/i,
  );

  const evaluateResponse = await evaluateRoute(
    new Request("http://localhost/api/moral-trade/match-signal/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profilePair: {
          left: leftProfile,
          right: rightProfile,
        },
      }),
    }),
  );
  const evaluateBody = await evaluateResponse.json();

  assert.equal(evaluateResponse.status, 200);
  assert.equal(evaluateBody.signal.participantExplanation.headline, "Why you are seeing this match");
  assert.match(evaluateBody.signal.participantExplanation.summary, /Exact wishes and contact details are still hidden/i);
  assert.match(evaluateBody.signal.participantExplanation.humanReviewNotice, /Human review is mandatory/i);
});
