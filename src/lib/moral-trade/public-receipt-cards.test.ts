import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
  buildPublicReceiptCardPreview,
  getPublicReceiptCardContract,
  validatePublicReceiptCardContract,
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
  publicationGateStates: {
    challenge_window: "passed",
    content_moderation: "passed",
    privacy_publication: "passed",
    public_metric_release: "passed",
    reconciliation: "passed",
    recipient_acceptance_adverse_association: "passed",
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

test("public receipt card validator requires non-blocking publication gates before opt-in publication", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    publicationGateStates: {
      ...validDraft.publicationGateStates,
      challenge_window: "under_review",
      content_moderation: "blocked",
      public_metric_release: "stale",
      recipient_acceptance_adverse_association: "missing",
    },
  });

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.includes(
      "publication_gate_not_non_blocking:challenge_window:under_review",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "publication_gate_not_non_blocking:content_moderation:blocked",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "publication_gate_not_non_blocking:public_metric_release:stale",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "publication_gate_not_non_blocking:recipient_acceptance_adverse_association:missing",
    ),
  );
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

test("public receipt card contract validates first-class claim hygiene coverage", () => {
  const contract = getPublicReceiptCardContract();
  const validation = validatePublicReceiptCardContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_public_receipt_cards"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_public_receipt_claim_reviews",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_public_receipt_publication_controls",
    ),
  );
  assert.ok(contract.claimHygieneRules.includes("trade_conditioned_wording_default"));
  assert.ok(
    contract.claimHygieneRules.includes(
      "trade_unlocked_requires_reviewed_causal_support",
    ),
  );
  assert.ok(contract.claimHygieneRules.includes("net_personal_contribution_separated"));
  assert.ok(
    contract.claimHygieneRules.includes(
      "direct_donation_parity_non_preferential",
    ),
  );
  assert.ok(contract.claimHygieneRules.includes("publication_sidecar_only"));
  assert.ok(
    contract.claimHygieneRules.includes(
      "publication_gates_non_blocking_required",
    ),
  );
  assert.deepEqual(
    contract.publicationGateKeys,
    PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
  );
  assert.ok(contract.publicationGateStates.includes("under_review"));
  assert.ok(contract.publicationGateStates.includes("blocked"));
  assert.equal(contract.defaultPublicationControls.sidecarOnly, true);
  assert.equal(contract.defaultPublicationControls.affectsMatchingOrReview, false);
  assert.equal(contract.defaultPublicationControls.publicEngagementCounters, false);
  assert.ok(contract.prohibitedPublicSignals.includes("leaderboards"));
  assert.ok(contract.prohibitedPublicSignals.includes("moral_scores"));
  assert.ok(contract.prohibitedPublicSignals.includes("matching_priority"));
  assert.ok(contract.samplePreviews.every((preview) => preview.validation.status === "pass"));
});

test("public receipt card source-of-truth tables are migration-backed", () => {
  const migration = readFileSync(
    "supabase/migrations/20260626_moral_trade_public_receipt_card_records.sql",
    "utf8",
  );

  for (const tableName of getPublicReceiptCardContract().firstClassRecordTables) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${tableName}\\b`),
    );
  }

  assert.match(migration, /publication_gate_states_jsonb/);
  assert.match(migration, /recipient_acceptance_adverse_association/);
  assert.match(migration, /visibility_state <> 'opt_in_public'/);
  assert.match(migration, /publication_required_as_trade_term_bool = false/);
  assert.match(migration, /publication_affects_marketplace_priority_bool = false/);
  assert.match(migration, /public_engagement_counters_bool = false/);
  assert.match(migration, /raw_evidence_public_bool = false/);
  assert.match(migration, /private_counterparty_public_bool = false/);
  assert.match(migration, /Receipt cards are sidecar verification records/);
});

test("public receipt card contract fails closed if publication can affect marketplace priority", () => {
  const contract = getPublicReceiptCardContract();
  const validation = validatePublicReceiptCardContract({
    ...contract,
    claimHygieneRules: contract.claimHygieneRules.filter(
      (rule) => rule !== "publication_sidecar_only",
    ),
    defaultPublicationControls: {
      ...contract.defaultPublicationControls,
      affectsMatchingOrReview: true,
      publicEngagementCounters: true,
    },
    publicationGateKeys: contract.publicationGateKeys.filter(
      (gate) => gate !== "content_moderation",
    ),
  });

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.includes(
      "claim-hygiene-rules: Contract covers causal wording, net attribution, parity, sidecar, verification, and anti-gamification rules",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "publication-controls: Default publication controls cannot affect matching, review, engagement, ranking, or trade terms",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "publication-gate-coverage: Contract requires reconciliation, challenge-window, privacy, recipient association, content moderation, and public-metric-release gates before publication",
    ),
  );
});
