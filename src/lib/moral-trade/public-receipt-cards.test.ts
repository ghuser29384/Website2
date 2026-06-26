import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PUBLIC_RECEIPT_CLAIM_REVIEW_KEYS,
  PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
  buildPublicReceiptCardPreview,
  getPublicReceiptCardContract,
  validatePublicReceiptCardContract,
  validatePublicReceiptCardDraft,
  type PublicReceiptCardDraft,
} from "./public-receipt-cards";

const validDraft: PublicReceiptCardDraft = {
  claimReviewStates: {
    direct_donation_parity: "passed",
    personal_contribution: "passed",
    recipient_transfer: "passed",
    trade_conditioned: "passed",
    verified: "passed",
  },
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
  directDonationParityControls: {
    affectsEligibility: false,
    affectsFutureMarketplaceAccess: false,
    affectsMatchingPriority: false,
    affectsProfileProminence: false,
    affectsPublicSearchOrdering: false,
    affectsReviewPriority: false,
    framedAsMoralUpgrade: false,
    modeOffered: true,
    participantOptIn: true,
    preselected: false,
    requiredForReceiptPublication: false,
  },
  directDonationParityNote:
    "Direct donation remains at parity; Moral Trade does not prefer this route over giving directly.",
  evidenceLevel: "receipt_reviewed",
  netAttributionControls: {
    attributionState: "verified_net_personal",
    counterpartyReimbursementsExcluded: true,
    donorAdvisedFundCreditsExcluded: true,
    employerMatchesExcluded: true,
    grossPersonalTransfer: "$100 gross personal transfer",
    knownReimbursementOrSubsidy:
      "$0 reimbursement, subsidy, refund, match, credit, or counterparty reimbursement",
    netPersonalContribution: "$100 verified net personal contribution",
    refundsExcluded: true,
    sideBenefitDisclosure: "No side benefit is counted as personal contribution.",
    sponsorSubsidiesExcluded: true,
    tradeConditionedFundsExcluded: true,
    tradeUnlockedFundsExcluded: true,
  },
  netAttributionNote:
    "Net attribution is limited to the reviewed redirected amount after excluding reimbursements, subsidies, refunds, matches, side benefits, counterparty funds, and unmatched surplus.",
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
  sensitiveActionDisclosure: {
    autonomyReviewState: "not_required_for_stage",
    contentModerationReviewState: "not_required_for_stage",
    displayMode: "transfer_only",
    privacyReviewState: "not_required_for_stage",
    separatePublicActionDisclosureConsent: false,
  },
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

test("public receipt card validator requires separate consent and reviews for exact pledge-swap action details", () => {
  const unsupported = validatePublicReceiptCardDraft({
    ...validDraft,
    claimKind: "pledge_swap",
    publicActionSummary: "Verified no-meat lunch completed",
    sensitiveActionDisclosure: {
      autonomyReviewState: "under_review",
      contentModerationReviewState: "missing",
      displayMode: "exact_action_details",
      privacyReviewState: "blocked",
      separatePublicActionDisclosureConsent: false,
    },
  });

  assert.equal(unsupported.status, "fail");
  assert.ok(unsupported.blockers.includes("sensitive_action_exact_public_consent_required"));
  assert.ok(
    unsupported.blockers.includes(
      "sensitive_action_privacy_review_not_non_blocking:blocked",
    ),
  );
  assert.ok(
    unsupported.blockers.includes(
      "sensitive_action_autonomy_review_not_non_blocking:under_review",
    ),
  );
  assert.ok(
    unsupported.blockers.includes(
      "sensitive_action_content_review_not_non_blocking:missing",
    ),
  );

  const supported = validatePublicReceiptCardDraft({
    ...validDraft,
    claimKind: "pledge_swap",
    claimReviewStates: {
      ...validDraft.claimReviewStates,
      completed: "passed",
    },
    publicActionSummary: "Verified no-meat lunch completed",
    sensitiveActionDisclosure: {
      autonomyReviewState: "passed",
      contentModerationReviewState: "passed",
      displayMode: "exact_action_details",
      privacyReviewState: "passed",
      separatePublicActionDisclosureConsent: true,
    },
  });

  assert.equal(supported.status, "pass");
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
    claimReviewStates: {
      ...validDraft.claimReviewStates,
      trade_unlocked: "passed",
    },
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

test("public receipt card validator maps claim words to passed claim reviews", () => {
  const unsupported = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy:
      "Verified completed matched impact receipt with a trade-unlocked additional claim.",
    claimReviewStates: {
      direct_donation_parity: "passed",
      personal_contribution: "passed",
      recipient_transfer: "passed",
      trade_conditioned: "passed",
    },
    contributionSummary: {
      ...validDraft.contributionSummary,
      baselineAdditionalityReview: "passed",
      causalWording: "trade_unlocked",
      counterfactualTrustReview: "passed",
      impactClaimReview: "passed",
      tradeUnlockedContribution: "$100 reviewed trade-unlocked counterparty donation",
    },
  });

  assert.equal(unsupported.status, "fail");
  assert.ok(unsupported.blockers.includes("public_receipt_claim_review_missing:verified:missing"));
  assert.ok(unsupported.blockers.includes("public_receipt_claim_review_missing:completed:missing"));
  assert.ok(unsupported.blockers.includes("public_receipt_claim_review_missing:matched:missing"));
  assert.ok(unsupported.blockers.includes("public_receipt_claim_review_missing:impact:missing"));
  assert.ok(unsupported.blockers.includes("public_receipt_claim_review_missing:trade_unlocked:missing"));
  assert.ok(unsupported.blockers.includes("public_receipt_claim_review_missing:additional:missing"));

  const supported = validatePublicReceiptCardDraft({
    ...validDraft,
    claimCopy:
      "Verified completed matched impact receipt with a trade-unlocked additional claim.",
    claimReviewStates: {
      additional: "passed",
      completed: "passed",
      direct_donation_parity: "passed",
      impact: "passed",
      matched: "passed",
      personal_contribution: "passed",
      recipient_transfer: "passed",
      trade_conditioned: "passed",
      trade_unlocked: "passed",
      verified: "passed",
    },
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

test("public receipt card validator keeps direct-donation parity opt-in and non-preferential", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    directDonationParityControls: {
      affectsEligibility: true,
      affectsFutureMarketplaceAccess: true,
      affectsMatchingPriority: true,
      affectsProfileProminence: true,
      affectsPublicSearchOrdering: true,
      affectsReviewPriority: true,
      framedAsMoralUpgrade: true,
      modeOffered: true,
      participantOptIn: false,
      preselected: true,
      requiredForReceiptPublication: true,
    },
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("direct_donation_parity_participant_opt_in_required"));
  assert.ok(validation.blockers.includes("direct_donation_parity_preselected_blocked"));
  assert.ok(
    validation.blockers.includes(
      "direct_donation_parity_required_for_publication_blocked",
    ),
  );
  assert.ok(validation.blockers.includes("direct_donation_parity_moral_upgrade_blocked"));
  assert.ok(
    validation.blockers.includes("direct_donation_parity_matching_priority_blocked"),
  );
  assert.ok(
    validation.blockers.includes("direct_donation_parity_review_priority_blocked"),
  );
  assert.ok(validation.blockers.includes("direct_donation_parity_eligibility_blocked"));
  assert.ok(
    validation.blockers.includes(
      "direct_donation_parity_public_search_ordering_blocked",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "direct_donation_parity_profile_prominence_blocked",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "direct_donation_parity_future_marketplace_access_blocked",
    ),
  );
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

test("public receipt card validator separates gross, reimbursements, side benefits, and net contribution", () => {
  const validation = validatePublicReceiptCardDraft({
    ...validDraft,
    netAttributionControls: {
      ...validDraft.netAttributionControls,
      attributionState: "disputed_blocked",
      counterpartyReimbursementsExcluded: false,
      donorAdvisedFundCreditsExcluded: false,
      employerMatchesExcluded: false,
      grossPersonalTransfer: "",
      knownReimbursementOrSubsidy: "",
      netPersonalContribution: "",
      refundsExcluded: false,
      sideBenefitDisclosure: "",
      sponsorSubsidiesExcluded: false,
      tradeConditionedFundsExcluded: false,
      tradeUnlockedFundsExcluded: false,
    },
  });

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.includes("gross_personal_transfer_line_required"));
  assert.ok(validation.blockers.includes("reimbursement_or_subsidy_disclosure_required"));
  assert.ok(validation.blockers.includes("side_benefit_disclosure_required"));
  assert.ok(validation.blockers.includes("net_personal_contribution_line_required"));
  assert.ok(validation.blockers.includes("disputed_net_personal_contribution_cannot_publish"));
  assert.ok(
    validation.blockers.includes(
      "net_attribution_exclusion_missing:tradeConditionedFundsExcluded",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "net_attribution_exclusion_missing:tradeUnlockedFundsExcluded",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "net_attribution_exclusion_missing:sponsorSubsidiesExcluded",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "net_attribution_exclusion_missing:employerMatchesExcluded",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "net_attribution_exclusion_missing:donorAdvisedFundCreditsExcluded",
    ),
  );
  assert.ok(
    validation.blockers.includes("net_attribution_exclusion_missing:refundsExcluded"),
  );
  assert.ok(
    validation.blockers.includes(
      "net_attribution_exclusion_missing:counterpartyReimbursementsExcluded",
    ),
  );

  const missingDisclosure = validatePublicReceiptCardDraft({
    ...validDraft,
    netAttributionNote: "Net attribution was reviewed.",
  });

  assert.equal(missingDisclosure.status, "fail");
  assert.ok(
    missingDisclosure.blockers.includes(
      "reimbursement_subsidy_or_side_benefit_must_be_disclosed",
    ),
  );
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
  assert.ok(
    contract.claimHygieneRules.includes(
      "direct_donation_parity_opt_in_non_preferential",
    ),
  );
  assert.ok(
    contract.claimHygieneRules.includes(
      "direct_donation_parity_no_default_recommendation_access_or_priority",
    ),
  );
  assert.ok(
    contract.claimHygieneRules.includes(
      "net_attribution_gross_reimbursement_side_benefit_and_net_lines_separated",
    ),
  );
  assert.ok(
    contract.claimHygieneRules.includes(
      "net_personal_contribution_excludes_trade_conditioned_and_third_party_funds",
    ),
  );
  assert.ok(contract.claimHygieneRules.includes("publication_sidecar_only"));
  assert.ok(
    contract.claimHygieneRules.includes(
      "publication_gates_non_blocking_required",
    ),
  );
  assert.ok(
    contract.claimHygieneRules.includes(
      "verification_status_metadata_required",
    ),
  );
  assert.ok(
    contract.claimHygieneRules.includes(
      "claim_words_require_passed_claim_reviews",
    ),
  );
  assert.ok(
    contract.claimHygieneRules.includes(
      "sensitive_action_exact_details_require_separate_consent_and_reviews",
    ),
  );
  assert.deepEqual(contract.claimReviewKeys, PUBLIC_RECEIPT_CLAIM_REVIEW_KEYS);
  assert.ok(contract.netPersonalAttributionStates.includes("verified_net_personal"));
  assert.ok(contract.netPersonalAttributionStates.includes("uncertain_qualified"));
  assert.ok(contract.netPersonalAttributionStates.includes("disputed_blocked"));
  assert.equal(contract.defaultDirectDonationParityControls.preselected, false);
  assert.equal(
    contract.defaultDirectDonationParityControls.requiredForReceiptPublication,
    false,
  );
  assert.equal(contract.defaultDirectDonationParityControls.affectsMatchingPriority, false);
  assert.equal(contract.defaultDirectDonationParityControls.affectsReviewPriority, false);
  assert.equal(contract.defaultDirectDonationParityControls.affectsEligibility, false);
  assert.ok(
    contract.netAttributionExclusionControls.includes(
      "tradeConditionedFundsExcluded",
    ),
  );
  assert.ok(
    contract.netAttributionExclusionControls.includes(
      "counterpartyReimbursementsExcluded",
    ),
  );
  assert.ok(contract.sensitiveActionDisplayModes.includes("generic_action_label"));
  assert.ok(contract.sensitiveActionDisplayModes.includes("transfer_only"));
  assert.ok(contract.sensitiveActionDisplayModes.includes("exact_action_details"));
  assert.deepEqual(
    contract.publicationGateKeys,
    PUBLIC_RECEIPT_REQUIRED_PUBLICATION_GATES,
  );
  assert.ok(contract.requiredPublicFields.includes("verificationUrl"));
  assert.ok(contract.requiredPublicFields.includes("correctionStatus"));
  assert.ok(contract.requiredPublicFields.includes("publicationControls.issuedAt"));
  assert.ok(contract.requiredPublicFields.includes("publicationControls.currentStatus"));
  assert.ok(
    contract.requiredPublicFields.includes(
      "directDonationParityControls.participantOptIn",
    ),
  );
  assert.ok(
    contract.requiredPublicFields.includes(
      "directDonationParityControls.affectsFutureMarketplaceAccess",
    ),
  );
  assert.ok(
    contract.requiredPublicFields.includes(
      "netAttributionControls.grossPersonalTransfer",
    ),
  );
  assert.ok(
    contract.requiredPublicFields.includes(
      "netAttributionControls.knownReimbursementOrSubsidy",
    ),
  );
  assert.ok(
    contract.requiredPublicFields.includes(
      "netAttributionControls.netPersonalContribution",
    ),
  );
  assert.ok(contract.requiredPublicFields.includes("sensitiveActionDisclosure.displayMode"));
  assert.ok(contract.publicationGateStates.includes("under_review"));
  assert.ok(contract.publicationGateStates.includes("blocked"));
  assert.equal(contract.defaultPublicationControls.sidecarOnly, true);
  assert.equal(contract.defaultPublicationControls.affectsMatchingOrReview, false);
  assert.equal(contract.defaultPublicationControls.publicEngagementCounters, false);
  assert.ok(contract.prohibitedPublicSignals.includes("leaderboards"));
  assert.ok(contract.prohibitedPublicSignals.includes("moral_scores"));
  assert.ok(contract.prohibitedPublicSignals.includes("matching_priority"));
  assert.ok(contract.prohibitedPublicSignals.includes("eligibility_advantage"));
  assert.ok(
    contract.prohibitedPublicSignals.includes(
      "future_marketplace_access_advantage",
    ),
  );
  assert.ok(contract.samplePreviews.every((preview) => preview.validation.status === "pass"));
});

test("public receipt card source-of-truth tables are migration-backed", () => {
  const migration = readFileSync(
    "supabase/migrations/20260626_moral_trade_public_receipt_card_records.sql",
    "utf8",
  );
  const sensitiveActionMigration = readFileSync(
    "supabase/migrations/20260626_moral_trade_public_receipt_sensitive_action_controls.sql",
    "utf8",
  );
  const parityAndNetAttributionMigration = readFileSync(
    "supabase/migrations/20260626_moral_trade_public_receipt_parity_net_attribution_controls.sql",
    "utf8",
  );

  for (const tableName of getPublicReceiptCardContract().firstClassRecordTables) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${tableName}\\b`),
    );
  }

  for (const claimReviewKey of PUBLIC_RECEIPT_CLAIM_REVIEW_KEYS) {
    assert.match(migration, new RegExp(`'${claimReviewKey}'`));
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
  assert.match(sensitiveActionMigration, /sensitive_action_display_mode/);
  assert.match(sensitiveActionMigration, /generic_action_label/);
  assert.match(sensitiveActionMigration, /transfer_only/);
  assert.match(sensitiveActionMigration, /exact_action_details/);
  assert.match(
    sensitiveActionMigration,
    /separate_public_action_disclosure_consent_bool/,
  );
  assert.match(sensitiveActionMigration, /sensitive_action_privacy_review_state/);
  assert.match(sensitiveActionMigration, /sensitive_action_autonomy_review_state/);
  assert.match(
    sensitiveActionMigration,
    /sensitive_action_content_moderation_review_state/,
  );
  assert.match(sensitiveActionMigration, /claim_kind <> 'pledge_swap'/);
  assert.match(sensitiveActionMigration, /visibility_state <> 'opt_in_public'/);
  assert.match(
    sensitiveActionMigration,
    /exact personal-behavior action details/i,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /direct_donation_parity_mode_offered_bool/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /direct_donation_parity_participant_opt_in_bool/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /direct_donation_parity_preselected_bool = false/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /direct_donation_parity_required_for_publication_bool = false/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /direct_donation_parity_affects_future_marketplace_access_bool = false/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /gross_personal_transfer_text/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /known_reimbursement_or_subsidy_text/,
  );
  assert.match(parityAndNetAttributionMigration, /side_benefit_disclosure_text/);
  assert.match(parityAndNetAttributionMigration, /net_personal_contribution_text/);
  assert.match(parityAndNetAttributionMigration, /net_attribution_state/);
  assert.match(
    parityAndNetAttributionMigration,
    /trade_conditioned_funds_excluded_bool/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /counterparty_reimbursements_excluded_bool/,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /Direct-donation parity remains opt-in and non-preferential/i,
  );
  assert.match(
    parityAndNetAttributionMigration,
    /Gross transfer, reimbursement or subsidy, side benefit, and net personal contribution/i,
  );
});

test("public receipt card contract fails closed if publication can affect marketplace priority", () => {
  const contract = getPublicReceiptCardContract();
  const validation = validatePublicReceiptCardContract({
    ...contract,
    claimHygieneRules: contract.claimHygieneRules.filter(
      (rule) => rule !== "publication_sidecar_only",
    ),
    claimReviewKeys: contract.claimReviewKeys.filter((key) => key !== "verified"),
    sensitiveActionDisplayModes: contract.sensitiveActionDisplayModes.filter(
      (mode) => mode !== "exact_action_details",
    ),
    defaultPublicationControls: {
      ...contract.defaultPublicationControls,
      affectsMatchingOrReview: true,
      publicEngagementCounters: true,
    },
    defaultDirectDonationParityControls: {
      ...contract.defaultDirectDonationParityControls,
      affectsFutureMarketplaceAccess: true,
      preselected: true,
    },
    netAttributionExclusionControls: contract.netAttributionExclusionControls.filter(
      (control) => control !== "counterpartyReimbursementsExcluded",
    ),
    netPersonalAttributionStates: contract.netPersonalAttributionStates.filter(
      (state) => state !== "disputed_blocked",
    ),
    requiredPublicFields: contract.requiredPublicFields.filter(
      (field) => field !== "publicationControls.currentStatus",
    ),
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
  assert.ok(
    validation.blockers.includes(
      "verification-status-metadata: Public receipt verification exposes issued-at, current-status, and correction/revocation state",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "claim-review-key-coverage: Public claim words require passed claim-review records before publication",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "sensitive-action-disclosure-controls: Pledge-swap receipt action details default to generic or transfer-only unless exact details have consent and non-blocking reviews",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "direct-donation-parity-controls: Direct-donation parity is opt-in and cannot affect recommendations, access, search, matching, review, or profile prominence",
    ),
  );
  assert.ok(
    validation.blockers.includes(
      "net-attribution-controls: Gross transfer, reimbursements or subsidies, side benefits, and verified net personal contribution are separate required controls",
    ),
  );
});
