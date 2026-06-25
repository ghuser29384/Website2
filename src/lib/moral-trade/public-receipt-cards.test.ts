import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicReceiptCardPreview,
  validatePublicReceiptCardDraft,
  type PublicReceiptCardDraft,
} from "./public-receipt-cards";

const validDraft: PublicReceiptCardDraft = {
  claimCopy:
    "Participant reports a reviewed donation-offset completion with a trade-conditioned contribution shown below.",
  claimKind: "donation_offset",
  contributionSummary: {
    baselineAdditionalityReview: "missing",
    causalWording: "trade_conditioned",
    counterfactualTrustReview: "missing",
    impactClaimReview: "missing",
    personalContribution: "$100 verified personal direct donation",
    personalContributionState: "verified_new",
    totalVerifiedRecipientTransfer: "$200 total verified recipient transfer",
    tradeConditionedContribution: "$100 verified trade-conditioned counterparty donation",
  },
  correctionStatus: "none",
  directDonationParityNote:
    "Direct donation remains at parity; Moral Trade does not prefer this route over giving directly.",
  evidenceLevel: "receipt_reviewed",
  netAttributionNote:
    "Net attribution is limited to the reviewed redirected amount after excluding unmatched surplus.",
  participantOptIn: true,
  publicationControls: {
    affectsMatchingOrReview: false,
    currentStatus: "current",
    issuedAt: "2026-06-25T04:00:00.000Z",
    profileOrSearchBoost: false,
    publicEngagementCounters: false,
    publicationRequiredAsTradeTerm: false,
    recommendationOrPriorityBoost: false,
    sidecarOnly: true,
  },
  publicActionSummary: "Reviewed donation-offset receipt",
  receiptId: "receipt-card-1",
  reviewed: true,
  sensitiveActionRedacted: true,
  title: "Reviewed offset receipt",
  verificationUrl: "/api/moral-trade/public-receipts/receipt-card-1/verify",
  visibility: "opt_in_public",
};

test("public receipt card preview requires opt-in, review, verification, and redaction", () => {
  const preview = buildPublicReceiptCardPreview(validDraft);

  assert.equal(preview.validation.status, "pass");
  assert.equal(preview.visibility, "opt_in_public");
  assert.equal(preview.contributionSummary.causalWording, "trade_conditioned");
  assert.match(preview.contributionSummary.totalVerifiedRecipientTransfer, /verified recipient transfer/);
  assert.equal(preview.directDonationParityNote.includes("Direct donation"), true);
  assert.equal(preview.netAttributionNote.includes("Net attribution"), true);
});

test("public receipt card validator blocks publication without consent and review", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    participantOptIn: false,
    reviewed: false,
    verificationUrl: "",
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("participant_opt_in_required"));
  assert.ok(validation.blockers.includes("review_required_before_publication"));
  assert.ok(validation.blockers.includes("verification_url_required"));
});

test("public receipt card validator blocks ranking, endorsement, private fields, and missing parity", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy:
      "Leaderboard rank #1. Platform endorses this as morally superior. See private note.",
    directDonationParityNote: "Use this route.",
    title: "Achievement unlocked",
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("direct_donation_parity_note_required"));
  assert.ok(validation.blockers.includes("objective_moral_endorsement_claim"));
  assert.ok(validation.blockers.includes("gamification_or_ranking_claim"));
  assert.ok(validation.blockers.includes("private_field_leakage"));
});

test("public receipt card validator requires sensitive action redaction before public visibility", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    claimKind: "pledge_swap",
    evidenceLevel: "self_attestation",
    sensitiveActionRedacted: false,
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("sensitive_action_redaction_required"));
});

test("public receipt card validator defaults to trade-conditioned wording unless stronger causal support passes", () => {
  const unsupported = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy: "Participant reports a trade-unlocked additional contribution.",
    contributionSummary: {
      ...validDraft.contributionSummary,
      causalWording: "trade_conditioned",
    },
  });

  assert.equal(unsupported.status, "fail");
  assert.ok(unsupported.blockers.includes("unsupported_causal_wording"));

  const supported = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy: "Participant reports a reviewed trade-unlocked contribution.",
    contributionSummary: {
      ...validDraft.contributionSummary,
      baselineAdditionalityReview: "passed",
      causalWording: "trade_unlocked",
      counterfactualTrustReview: "passed",
      impactClaimReview: "passed",
      tradeUnlockedContribution: "$100 reviewed trade-unlocked counterparty donation",
    },
  });

  assert.equal(supported.status, "pass");
});

test("public receipt card validator blocks engagement infrastructure and publication pressure", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy: "Show like count and matching priority after this receipt publishes.",
    publicationControls: {
      ...validDraft.publicationControls,
      affectsMatchingOrReview: true,
      profileOrSearchBoost: true,
      publicEngagementCounters: true,
      publicationRequiredAsTradeTerm: true,
      recommendationOrPriorityBoost: true,
      sidecarOnly: false,
    },
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("publication_must_be_sidecar_only"));
  assert.ok(validation.blockers.includes("publication_as_trade_term_blocked"));
  assert.ok(validation.blockers.includes("receipt_publication_marketplace_priority_blocked"));
  assert.ok(validation.blockers.includes("public_engagement_counters_blocked"));
  assert.ok(validation.blockers.includes("profile_or_search_boost_blocked"));
  assert.ok(validation.blockers.includes("recommendation_or_priority_boost_blocked"));
  assert.ok(validation.blockers.includes("gamification_or_ranking_claim"));
});

test("public receipt card validator requires reuse and uncertain-net attribution disclosures", () => {
  const reused = validatePublicReceiptCardDraft({
    ...validDraft,
    contributionSummary: {
      ...validDraft.contributionSummary,
      personalContributionState: "verified_already_counted",
    },
    directDonationParityNote: "Direct donation remains at parity with no preference language.",
  });

  assert.equal(reused.status, "fail");
  assert.ok(reused.blockers.includes("personal_contribution_reuse_disclosure_required"));

  const uncertain = validatePublicReceiptCardDraft({
    ...validDraft,
    contributionSummary: {
      ...validDraft.contributionSummary,
      personalContributionState: "suppressed_uncertain",
    },
    netAttributionNote: "Net attribution is shown as final.",
  });

  assert.equal(uncertain.status, "fail");
  assert.ok(uncertain.blockers.includes("uncertain_personal_contribution_must_be_qualified"));
});
