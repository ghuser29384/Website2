import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assessDonationOffsetModeration,
  buildDemoDonationOffsetDonorOfRecordPreview,
  buildDemoDonationOffsetAuthorityFairnessPreview,
  buildDemoDonationOffsetExternalityEvidencePreview,
  buildDemoDonationOffsetParticipantConfirmationPreview,
  buildDemoDonationOffsetPaymentDestinationPreview,
  buildDemoDonationOffsetSafetyAuthenticityPreview,
  buildDemoDonationOffsetBatchClearingDryRun,
  buildDonationOffsetBatchClearingDryRun,
  buildDonationOffsetAuthorityFairnessPreview,
  buildDonationOffsetDonorOfRecordPreview,
  buildDonationOffsetExternalityEvidencePreview,
  buildDonationOffsetParticipantConfirmationPreview,
  buildDonationOffsetPaymentDestinationPreview,
  buildDonationOffsetSafetyAuthenticityPreview,
  calculateDonationOffsetPreview,
  calculateDonationOffsetPoolProgress,
  createDefaultDonationOffsetFields,
  summarizeDonationOffsetDonorOfRecordForNotes,
  summarizeDonationOffsetAuthorityFairnessForNotes,
  summarizeDonationOffsetExternalityEvidenceForNotes,
  summarizeDonationOffsetParticipantConfirmationForNotes,
  summarizeDonationOffsetPaymentDestinationForNotes,
  summarizeDonationOffsetSafetyAuthenticityForNotes,
  validateDonationOffsetDonorOfRecordInput,
  validateDonationOffsetAuthorityFairnessInput,
  validateDonationOffsetExternalityEvidenceInput,
  validateDonationOffsetParticipantConfirmationInput,
  validateDonationOffsetPaymentDestinationInput,
  validateDonationOffsetSafetyAuthenticityInput,
  validateDonationOffsetSubmissionGuards,
  validateDonationOffsetFields,
} from "@/lib/donation-offsets";
import {
  evidenceLocatorsConflict,
  getDonationOffsetEvidenceState,
  normalizeEvidenceLocator,
} from "@/lib/validation";

test("donation offset validation rejects missing required fields", () => {
  const draft = createDefaultDonationOffsetFields();
  const errors = validateDonationOffsetFields({
    ...draft,
    baselineAmountUsd: null,
    requestedMatchingAmountUsd: null,
    compromiseDestinationId: "",
    description: "",
  });

  assert.ok(errors.includes("Baseline donation amount must be a positive number."));
  assert.ok(errors.includes("Requested matching donation must be a positive number."));
  assert.ok(errors.includes("Choose a valid compromise destination."));
  assert.ok(errors.includes("Add a short description of the offset."));
});

test("moderation blocks illegal political destinations", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    compromiseDestinationId: "campaign-example-prohibited",
    description: "I want to redirect this instead of cancelling out.",
    evidenceUrl: "https://example.com/receipt",
  });

  assert.equal(moderation.status, "blocked");
  assert.match(moderation.reasons[0] ?? "", /prohibited/i);
});

test("moderation blocks threat-like descriptions", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    description: "Unless someone pays me, I will donate to the opposed harm cause.",
    evidenceUrl: "https://example.com/receipt",
  });

  assert.equal(moderation.status, "blocked");
  assert.match(moderation.reasons[0] ?? "", /threat|extortion/i);
});

test("moderation flags unverifiable baselines", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    description: "I would otherwise make this opposed donation, but I am willing to redirect it.",
    evidenceUrl: "",
  });

  assert.equal(moderation.status, "flagged");
  assert.match(moderation.reasons[0] ?? "", /unverifiable|receipt|audit|payment/i);
});

test("ratio calculation correctly computes matched and unmatched portions", () => {
  const preview = calculateDonationOffsetPreview({
    baselineAmountUsd: 100,
    requestedMatchingAmountUsd: 120,
    offsetRatio: 1.5,
    unmatchedSurplusRule: "return_to_donors",
  });

  assert.equal(preview.matchedBaselineUsd, 80);
  assert.equal(preview.matchedCounterpartyUsd, 120);
  assert.equal(preview.compromiseTotalUsd, 200);
  assert.equal(preview.unmatchedBaselineUsd, 20);
  assert.equal(preview.unmatchedCounterpartyUsd, 0);
});

test("pool validation requires side, pool identity, and deadline", () => {
  const draft = createDefaultDonationOffsetFields();
  const errors = validateDonationOffsetFields({
    ...draft,
    participationMode: "pool",
    poolId: "",
    poolName: "",
    poolSide: "",
    assuranceMinimumUsd: null,
    assuranceDeadline: "",
    poolMaximumCapUsd: null,
  });

  assert.ok(errors.includes("Choose which side of the offset pool you are joining."));
  assert.ok(errors.includes("Choose an existing pool or name a new offset pool."));
  assert.ok(errors.includes("Assurance minimum threshold is required for pooled offsets."));
  assert.ok(errors.includes("Pool offsets should include an assurance deadline."));
  assert.ok(errors.includes("Pool maximum cap must be a positive number."));
});

test("pooled offset submission guards require anti-threat and verification metadata", () => {
  const errors = validateDonationOffsetSubmissionGuards({
    participationMode: "pool",
    antiThreatCertification: false,
    verificationMetadataAcknowledged: false,
    evidenceUrl: "",
  });

  assert.ok(errors.some((error) => /anti-threat/i.test(error)));
  assert.ok(errors.some((error) => /verification metadata/i.test(error)));

  assert.deepEqual(
    validateDonationOffsetSubmissionGuards({
      participationMode: "pool",
      antiThreatCertification: true,
      verificationMetadataAcknowledged: true,
      evidenceUrl: "https://example.com/reviewable-evidence",
    }),
    [],
  );
});

test("pool progress reaches assurance once matched compromise exceeds threshold", () => {
  const progress = calculateDonationOffsetPoolProgress({
    sideATotalUsd: 600,
    sideBTotalUsd: 650,
    offsetRatio: 1,
    assuranceMinimumUsd: 1000,
    deadlineAt: "2099-01-01T00:00:00.000Z",
  });

  assert.equal(progress.assuranceReached, true);
  assert.equal(progress.status, "assurance_met");
  assert.equal(progress.matchedCompromiseUsd, 1200);
  assert.equal(progress.assuranceProgressPct, 100);
});

test("donation offset batch dry run creates commitment reservations and no-capture lock proposal", () => {
  const dryRun = buildDemoDonationOffsetBatchClearingDryRun();

  assert.equal(dryRun.schemaVersion, "donation-offset-batch-clearing-dry-run-v1");
  assert.equal(dryRun.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(dryRun.ratioBoundStatus, "within_bounds");
  assert.equal(dryRun.assuranceReached, true);
  assert.equal(dryRun.atomicSettlementGroup.status, "ready_for_final_lock_confirmation");
  assert.equal(dryRun.atomicSettlementGroup.allOrNone, true);
  assert.equal(dryRun.atomicSettlementGroup.captureAllowed, false);
  assert.equal(dryRun.atomicSettlementGroup.relianceBearing, false);
  assert.equal(dryRun.finalLockProposal.status, "preview_only_no_capture");
  assert.equal(dryRun.finalLockProposal.noCapture, true);
  assert.equal(dryRun.finalLockProposal.createsPaymentCapture, false);
  assert.equal(dryRun.finalLockProposal.relianceBearing, false);
  assert.equal(dryRun.finalLockProposal.requiredFreshConfirmations, 4);
  assert.equal(dryRun.compromiseTotalUsd, 2000);
  assert.ok(dryRun.commitmentInventory.every((reservation) => reservation.reservedUsd > 0));
});

test("donation offset batch dry run fails closed when ratio bounds reject clearing", () => {
  const dryRun = buildDonationOffsetBatchClearingDryRun({
    poolId: "test-pool",
    poolName: "Test pool",
    offsetRatio: 2,
    assuranceMinimumUsd: 100,
    assuranceDeadline: "2099-01-01T00:00:00.000Z",
    destinationLabel: "Test compromise charity",
    verificationMethod: "proof_of_past_donations",
    commitments: [
      {
        id: "side-a",
        participantLabel: "Side A",
        side: "side_a",
        amountUsd: 100,
        ratioMinimum: 0.5,
        ratioMaximum: 1,
        status: "active",
      },
      {
        id: "side-b",
        participantLabel: "Side B",
        side: "side_b",
        amountUsd: 200,
        ratioMinimum: 0.5,
        ratioMaximum: 3,
        status: "active",
      },
    ],
    now: new Date("2026-06-07T12:00:00.000Z"),
  });

  assert.equal(dryRun.ratioBoundStatus, "out_of_bounds");
  assert.equal(dryRun.atomicSettlementGroup.status, "blocked_preview_only");
  assert.equal(dryRun.finalLockProposal.status, "blocked");
  assert.ok(dryRun.atomicSettlementGroup.blockerCodes.includes("clearing_ratio_outside_participant_bounds"));
  assert.ok(dryRun.atomicSettlementGroup.blockerCodes.includes("missing_counterparty_side"));
  assert.ok(
    dryRun.commitmentInventory.some((reservation) =>
      reservation.blockerCodes.includes("clearing_ratio_outside_participant_bounds"),
    ),
  );
});

test("donation offset donor-of-record preview separates receipts, tax treatment, and impact claims", () => {
  const preview = buildDemoDonationOffsetDonorOfRecordPreview();

  assert.equal(preview.schemaVersion, "donation-offset-donor-of-record-preview-v1");
  assert.equal(preview.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.taxAdviceProvided, false);
  assert.equal(preview.taxDeductibilityClaimAllowed, false);
  assert.equal(preview.receiptCreatesImpactClaim, false);
  assert.equal(preview.requiresFrozenLockTreatment, true);
  assert.equal(preview.readyForLockReview, true);
  assert.equal(preview.gates.some((gate) => gate.key === "donor-of-record"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "tax-receipt-treatment"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "charitable-solicitation"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "receipt-double-claim"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "tax-advice-and-impact-separation"), true);
});

test("donation offset donor-of-record validation rejects missing explicit acknowledgements", () => {
  const errors = validateDonationOffsetDonorOfRecordInput({
    destinationLabel: "GiveWell Top Charities Fund",
    donationPlatform: "External charity payment page",
    donorOfRecordRole: "unknown",
    donorOfRecordExplanation: "",
    taxReceiptTreatment: "unknown_or_unreviewed",
    taxReceiptExplanation: "",
    taxBenefitClaimed: false,
    donorAdvisedFundInvolved: false,
    employerMatchInvolved: false,
    commercialCoVentureInvolved: false,
    charitableSolicitationTreatment: "external_donation_only_no_platform_solicitation",
    jurisdictionReviewRequired: true,
    participantAcknowledgedNoTaxAdvice: false,
    participantAcknowledgedOperationalNotImpact: false,
    receiptDoubleClaimPrevented: false,
    receiptReassignmentProhibited: false,
    lockTermsFrozenBeforeConfirmation: false,
    destinationVerificationStatus: "registered_destination_selected",
  });

  assert.ok(errors.some((error) => /donor-of-record/i.test(error)));
  assert.ok(errors.some((error) => /tax-receipt/i.test(error)));
  assert.ok(errors.some((error) => /tax advice/i.test(error)));
  assert.ok(errors.some((error) => /impact claims/i.test(error)));
  assert.ok(errors.some((error) => /double-claimed/i.test(error)));
  assert.ok(errors.some((error) => /final lock/i.test(error)));
});

test("donation offset donor-of-record preview requires review for tax benefits and co-ventures", () => {
  const preview = buildDonationOffsetDonorOfRecordPreview({
    destinationLabel: "GiveWell Top Charities Fund",
    donationPlatform: "External charity payment page",
    donorOfRecordRole: "participant_direct_donor",
    donorOfRecordExplanation:
      "The participant who pays externally remains donor of record; Moral Trade is not donor of record.",
    taxReceiptTreatment: "participant_may_receive_receipt",
    taxReceiptExplanation:
      "The external charity may issue a receipt to the external donor, subject to legal review.",
    taxBenefitClaimed: true,
    donorAdvisedFundInvolved: true,
    employerMatchInvolved: true,
    commercialCoVentureInvolved: true,
    charitableSolicitationTreatment: "commercial_co_venture_or_match_promo",
    jurisdictionReviewRequired: true,
    participantAcknowledgedNoTaxAdvice: true,
    participantAcknowledgedOperationalNotImpact: true,
    receiptDoubleClaimPrevented: true,
    receiptReassignmentProhibited: true,
    lockTermsFrozenBeforeConfirmation: true,
    destinationVerificationStatus: "registered_destination_selected",
  });

  assert.equal(preview.taxDeductibilityClaimAllowed, false);
  assert.equal(preview.receiptCreatesImpactClaim, false);
  assert.equal(preview.gates.find((gate) => gate.key === "tax-receipt-treatment")?.status, "human_review");
  assert.equal(preview.gates.find((gate) => gate.key === "charitable-solicitation")?.status, "human_review");
  assert.deepEqual(validateDonationOffsetDonorOfRecordInput({
    destinationLabel: "GiveWell Top Charities Fund",
    donationPlatform: "External charity payment page",
    donorOfRecordRole: "participant_direct_donor",
    donorOfRecordExplanation:
      "The participant who pays externally remains donor of record; Moral Trade is not donor of record.",
    taxReceiptTreatment: "participant_may_receive_receipt",
    taxReceiptExplanation:
      "The external charity may issue a receipt to the external donor, subject to legal review.",
    taxBenefitClaimed: true,
    donorAdvisedFundInvolved: true,
    employerMatchInvolved: true,
    commercialCoVentureInvolved: true,
    charitableSolicitationTreatment: "commercial_co_venture_or_match_promo",
    jurisdictionReviewRequired: true,
    participantAcknowledgedNoTaxAdvice: true,
    participantAcknowledgedOperationalNotImpact: true,
    receiptDoubleClaimPrevented: true,
    receiptReassignmentProhibited: true,
    lockTermsFrozenBeforeConfirmation: true,
    destinationVerificationStatus: "registered_destination_selected",
  }), []);
});

test("donation offset donor-of-record summary freezes lock treatment in notes", () => {
  const summary = summarizeDonationOffsetDonorOfRecordForNotes(
    buildDemoDonationOffsetDonorOfRecordPreview(),
  );

  assert.match(summary, /Tax deductibility claim allowed from this preview: no/);
  assert.match(summary, /Receipt creates impact claim: no/);
  assert.match(summary, /Requires frozen donor-of-record, receipt, solicitation, and destination treatment before final confirmations: yes/);
});

test("donation offset payment destination preview treats locators as evidence before verification", () => {
  const preview = buildDemoDonationOffsetPaymentDestinationPreview();

  assert.equal(preview.schemaVersion, "donation-offset-payment-destination-preview-v1");
  assert.equal(preview.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.releaseAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.evidenceLocatorIsPaymentDestination, false);
  assert.equal(preview.freeTextDestinationReusable, false);
  assert.equal(preview.requiresRecipientRegistryEntry, true);
  assert.equal(preview.requiresVerifiedPaymentDestinationBeforeCapture, true);
  assert.equal(preview.gates.some((gate) => gate.key === "recipient-identity"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "payment-destination-routing"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "anti-impersonation"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "free-text-destination-reuse"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "evidence-vs-destination"), true);
});

test("donation offset payment destination validation rejects missing acknowledgements", () => {
  const errors = validateDonationOffsetPaymentDestinationInput({
    recipientLabel: "GiveWell Top Charities Fund",
    recipientIdentityStatus: "registered_recipient",
    paymentDestinationKind: "registered_charity_page",
    paymentDestinationLocator: "https://www.every.org/givewell-top-charities-fund",
    paymentDestinationReviewStatus: "needs_review",
    antiImpersonationReviewed: false,
    jurisdictionReviewed: false,
    prohibitedUseReviewed: false,
    destinationControlledByRecipient: false,
    freeTextDestination: false,
    reuseAcrossAgreementsRequested: false,
    captureOrReleaseRequested: false,
    participantAcknowledgedEvidenceNotDestination: false,
    participantAcknowledgedNoCaptureBeforeVerification: false,
  });

  assert.ok(errors.some((error) => /evidence inputs, not payment destinations/i.test(error)));
  assert.ok(errors.some((error) => /no capture or release/i.test(error)));
});

test("donation offset payment destination preview blocks unverified free-text reuse", () => {
  const preview = buildDonationOffsetPaymentDestinationPreview({
    recipientLabel: "Community fiscal host",
    recipientIdentityStatus: "free_text_or_unverified",
    paymentDestinationKind: "payment_processor_link",
    paymentDestinationLocator: "https://example.com/donate",
    paymentDestinationReviewStatus: "needs_review",
    antiImpersonationReviewed: false,
    jurisdictionReviewed: false,
    prohibitedUseReviewed: false,
    destinationControlledByRecipient: false,
    freeTextDestination: true,
    reuseAcrossAgreementsRequested: true,
    captureOrReleaseRequested: false,
    participantAcknowledgedEvidenceNotDestination: true,
    participantAcknowledgedNoCaptureBeforeVerification: true,
  });

  assert.equal(preview.freeTextDestinationReusable, false);
  assert.equal(preview.gates.find((gate) => gate.key === "recipient-identity")?.status, "human_review");
  assert.equal(preview.gates.find((gate) => gate.key === "free-text-destination-reuse")?.status, "blocked");
});

test("donation offset payment destination preview fails closed on premature capture or release", () => {
  const preview = buildDonationOffsetPaymentDestinationPreview({
    recipientLabel: "GiveWell Top Charities Fund",
    recipientIdentityStatus: "registered_recipient",
    paymentDestinationKind: "registered_charity_page",
    paymentDestinationLocator: "https://www.every.org/givewell-top-charities-fund",
    paymentDestinationReviewStatus: "needs_review",
    antiImpersonationReviewed: false,
    jurisdictionReviewed: false,
    prohibitedUseReviewed: false,
    destinationControlledByRecipient: false,
    freeTextDestination: false,
    reuseAcrossAgreementsRequested: false,
    captureOrReleaseRequested: true,
    participantAcknowledgedEvidenceNotDestination: true,
    participantAcknowledgedNoCaptureBeforeVerification: true,
  });
  const errors = validateDonationOffsetPaymentDestinationInput({
    recipientLabel: "GiveWell Top Charities Fund",
    recipientIdentityStatus: "registered_recipient",
    paymentDestinationKind: "registered_charity_page",
    paymentDestinationLocator: "https://www.every.org/givewell-top-charities-fund",
    paymentDestinationReviewStatus: "needs_review",
    antiImpersonationReviewed: false,
    jurisdictionReviewed: false,
    prohibitedUseReviewed: false,
    destinationControlledByRecipient: false,
    freeTextDestination: false,
    reuseAcrossAgreementsRequested: false,
    captureOrReleaseRequested: true,
    participantAcknowledgedEvidenceNotDestination: true,
    participantAcknowledgedNoCaptureBeforeVerification: true,
  });

  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.releaseAllowed, false);
  assert.ok(preview.blockedGateCount >= 1);
  assert.ok(errors.some((error) => /cannot request capture or release/i.test(error)));
});

test("donation offset payment destination summary records verification boundaries", () => {
  const summary = summarizeDonationOffsetPaymentDestinationForNotes(
    buildDemoDonationOffsetPaymentDestinationPreview(),
  );

  assert.match(summary, /Raw recipient\/payment locator is payment destination: no/);
  assert.match(summary, /Free-text destination reusable across agreements: no/);
  assert.match(summary, /Requires verified payment destination before capture\/release: yes/);
});

test("donation offset externality and evidence preview is no-capture and non-reliance-bearing", () => {
  const preview = buildDemoDonationOffsetExternalityEvidencePreview();

  assert.equal(preview.schemaVersion, "donation-offset-externality-evidence-preview-v1");
  assert.equal(preview.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.participantConsentWaivesNonparticipantHarms, false);
  assert.equal(preview.receiptCreatesImpactClaim, false);
  assert.equal(preview.requiresNonparticipantExternalityReviewBeforeClearing, true);
  assert.equal(preview.requiresLeastIntrusiveEvidenceBeforeLock, true);
  assert.equal(preview.requiresFallbackPolicyBeforeLock, true);
  assert.equal(preview.gates.some((gate) => gate.key === "nonparticipant-externality"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "least-intrusive-alternative"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "fallback-cancellation-policy"), true);
});

test("donation offset externality preview blocks serious unresolved nonparticipant harm", () => {
  const preview = buildDonationOffsetExternalityEvidencePreview({
    recipientLabel: "GiveWell Top Charities Fund",
    nonparticipantExternalityStatus: "serious_unresolved_harm",
    nonparticipantHarmSummary:
      "The proposed offset appears to create material third-party harm that has not been resolved.",
    antiThreatReviewed: true,
    evidenceBurden: "ordinary_receipt_or_public_log",
    evidencePlanSummary: "Use a public receipt for the external donation.",
    leastIntrusiveAlternative:
      "A public receipt is enough before asking for private financial records.",
    privacySensitiveEvidenceRequested: false,
    highBurdenEvidenceReviewerApproved: false,
    impactClaimReviewRequired: false,
    impactClaimMethodologyReviewed: false,
    fallbackPolicy: "manual_review",
    fallbackExplanation:
      "Keep the offset in manual review instead of clearing or rerouting funds.",
    lockOrRelianceRequested: false,
    participantAcknowledgedNonparticipantHarmsNotWaived: true,
    participantAcknowledgedLeastIntrusiveEvidence: true,
    participantAcknowledgedNoImpactClaimFromReceipt: true,
    participantAcknowledgedFallbackNoSilentReroute: true,
  });

  assert.equal(preview.blockedGateCount, 1);
  assert.equal(preview.gates.find((gate) => gate.key === "nonparticipant-externality")?.status, "blocked");
});

test("donation offset externality validation rejects missing acknowledgements and fallback", () => {
  const errors = validateDonationOffsetExternalityEvidenceInput({
    recipientLabel: "GiveWell Top Charities Fund",
    nonparticipantExternalityStatus: "unknown",
    nonparticipantHarmSummary: "",
    antiThreatReviewed: false,
    evidenceBurden: "unknown",
    evidencePlanSummary: "",
    leastIntrusiveAlternative: "",
    privacySensitiveEvidenceRequested: false,
    highBurdenEvidenceReviewerApproved: false,
    impactClaimReviewRequired: true,
    impactClaimMethodologyReviewed: false,
    fallbackPolicy: "unknown",
    fallbackExplanation: "",
    lockOrRelianceRequested: false,
    participantAcknowledgedNonparticipantHarmsNotWaived: false,
    participantAcknowledgedLeastIntrusiveEvidence: false,
    participantAcknowledgedNoImpactClaimFromReceipt: false,
    participantAcknowledgedFallbackNoSilentReroute: false,
  });

  assert.ok(errors.some((error) => /nonparticipant-externality/i.test(error)));
  assert.ok(errors.some((error) => /least-intrusive/i.test(error)));
  assert.ok(errors.some((error) => /impact claims/i.test(error)));
  assert.ok(errors.some((error) => /fallback/i.test(error)));
});

test("donation offset externality preview requires review for high-burden evidence", () => {
  const preview = buildDonationOffsetExternalityEvidencePreview({
    recipientLabel: "GiveWell Top Charities Fund",
    nonparticipantExternalityStatus: "non_blocking_review",
    nonparticipantHarmSummary:
      "No material nonparticipant harm is identified in this bounded offset preview.",
    antiThreatReviewed: true,
    evidenceBurden: "privacy_sensitive_or_high_burden",
    evidencePlanSummary:
      "The proposed evidence would include sensitive donor financial records.",
    leastIntrusiveAlternative:
      "A redacted receipt or public charity payment confirmation should be sufficient first.",
    privacySensitiveEvidenceRequested: true,
    highBurdenEvidenceReviewerApproved: false,
    impactClaimReviewRequired: false,
    impactClaimMethodologyReviewed: false,
    fallbackPolicy: "cancel_or_refund",
    fallbackExplanation:
      "Cancel the pending agreement if the evidence plan cannot be approved without invasive records.",
    lockOrRelianceRequested: false,
    participantAcknowledgedNonparticipantHarmsNotWaived: true,
    participantAcknowledgedLeastIntrusiveEvidence: true,
    participantAcknowledgedNoImpactClaimFromReceipt: true,
    participantAcknowledgedFallbackNoSilentReroute: true,
  });

  assert.equal(preview.gates.find((gate) => gate.key === "evidence-burden")?.status, "human_review");
  assert.equal(preview.gates.find((gate) => gate.key === "least-intrusive-alternative")?.status, "pass");
});

test("donation offset externality summary records evidence and impact boundaries", () => {
  const summary = summarizeDonationOffsetExternalityEvidenceForNotes(
    buildDemoDonationOffsetExternalityEvidencePreview(),
  );

  assert.match(summary, /Participant consent waives nonparticipant harms: no/);
  assert.match(summary, /Receipt creates impact claim: no/);
  assert.match(summary, /Requires least-intrusive evidence before lock: yes/);
  assert.match(summary, /Requires fallback policy before lock: yes/);
});

test("donation offset participant confirmation preview is first-class and no-capture", () => {
  const preview = buildDemoDonationOffsetParticipantConfirmationPreview();

  assert.equal(preview.schemaVersion, "donation-offset-participant-confirmation-preview-v1");
  assert.equal(preview.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.platformInfersMoralSurplus, false);
  assert.equal(preview.checkboxAuthorizesCapture, false);
  assert.equal(preview.requiresParticipantConfirmationRecord, true);
  assert.equal(preview.requiresMatchedLockProposal, true);
  assert.equal(preview.requiresConsentQualityRecord, true);
  assert.equal(preview.readyForFinalLockReview, true);
  assert.equal(preview.gates.some((gate) => gate.key === "participant-surplus-confirmation"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "matched-lock-proposal"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "participant-confirmation-record"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "fresh-confirmation-count"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "consent-quality"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "baseline-comparison-acknowledgement"), true);
});

test("donation offset participant confirmation validation rejects missing records and acknowledgements", () => {
  const errors = validateDonationOffsetParticipantConfirmationInput({
    baselineSnapshotId: "",
    termsSnapshotId: "",
    policySnapshotId: "",
    maximumExposureUsd: null,
    matchedTradeLockProposalStatus: "not_created",
    confirmationRecordStatus: "missing",
    consentQualityStatus: "unknown",
    noticeRecordStatus: "missing",
    confirmationScope: "unknown",
    amendmentStatus: "unknown",
    affectedParticipantCount: 0,
    freshConfirmationCount: -1,
    participantSurplusConfirmed: false,
    participantSurplusStatement: "",
    materialChangePending: false,
    lockOrCaptureRequested: false,
    participantAcknowledgedBaselineComparison: false,
    participantAcknowledgedFreshConfirmationRequired: false,
    participantAcknowledgedNoPreselectedPaidCommitment: false,
    participantAcknowledgedNoDarkPattern: false,
  });

  assert.ok(errors.some((error) => /baseline snapshot/i.test(error)));
  assert.ok(errors.some((error) => /surplus confirmation/i.test(error)));
  assert.ok(errors.some((error) => /affected participants/i.test(error)));
  assert.ok(errors.some((error) => /fresh confirmation count/i.test(error)));
  assert.ok(errors.some((error) => /paid commitments cannot be preselected/i.test(error)));
  assert.ok(errors.some((error) => /dark-pattern/i.test(error)));
});

test("donation offset participant confirmation fails closed on premature lock or capture", () => {
  const input: Parameters<typeof buildDonationOffsetParticipantConfirmationPreview>[0] = {
    baselineSnapshotId: "baseline-snapshot:test",
    termsSnapshotId: "terms-snapshot:test",
    policySnapshotId: "policy-snapshot:test",
    maximumExposureUsd: 200,
    matchedTradeLockProposalStatus: "drafted",
    confirmationRecordStatus: "recorded_non_stale",
    consentQualityStatus: "passed",
    noticeRecordStatus: "recorded",
    confirmationScope: "final_lock",
    amendmentStatus: "none",
    affectedParticipantCount: 2,
    freshConfirmationCount: 2,
    participantSurplusConfirmed: true,
    participantSurplusStatement:
      "The agreement is acceptable relative to this participant's no-trade baseline.",
    materialChangePending: false,
    lockOrCaptureRequested: true,
    participantAcknowledgedBaselineComparison: true,
    participantAcknowledgedFreshConfirmationRequired: true,
    participantAcknowledgedNoPreselectedPaidCommitment: true,
    participantAcknowledgedNoDarkPattern: true,
  };
  const preview = buildDonationOffsetParticipantConfirmationPreview(input);
  const errors = validateDonationOffsetParticipantConfirmationInput(input);

  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.gates.find((gate) => gate.key === "lock-capture-boundary")?.status, "blocked");
  assert.ok(errors.some((error) => /cannot request lock or capture/i.test(error)));
});

test("donation offset participant confirmation blocks stale proposals and confirmations", () => {
  const preview = buildDonationOffsetParticipantConfirmationPreview({
    baselineSnapshotId: "baseline-snapshot:test",
    termsSnapshotId: "terms-snapshot:test",
    policySnapshotId: "policy-snapshot:test",
    maximumExposureUsd: 200,
    matchedTradeLockProposalStatus: "stale",
    confirmationRecordStatus: "superseded",
    consentQualityStatus: "passed",
    noticeRecordStatus: "recorded",
    confirmationScope: "final_lock",
    amendmentStatus: "none",
    affectedParticipantCount: 2,
    freshConfirmationCount: 2,
    participantSurplusConfirmed: true,
    participantSurplusStatement:
      "The agreement is acceptable relative to this participant's no-trade baseline.",
    materialChangePending: false,
    lockOrCaptureRequested: false,
    participantAcknowledgedBaselineComparison: true,
    participantAcknowledgedFreshConfirmationRequired: true,
    participantAcknowledgedNoPreselectedPaidCommitment: true,
    participantAcknowledgedNoDarkPattern: true,
  });

  assert.equal(preview.gates.find((gate) => gate.key === "matched-lock-proposal")?.status, "blocked");
  assert.equal(preview.gates.find((gate) => gate.key === "participant-confirmation-record")?.status, "blocked");
  assert.equal(preview.readyForFinalLockReview, false);
});

test("donation offset participant confirmation summary records consent boundaries", () => {
  const summary = summarizeDonationOffsetParticipantConfirmationForNotes(
    buildDemoDonationOffsetParticipantConfirmationPreview(),
  );

  assert.match(summary, /Platform infers moral surplus: no/);
  assert.match(summary, /Checkbox authorizes capture: no/);
  assert.match(summary, /Requires participant confirmation record: yes/);
  assert.match(summary, /Requires matched-lock proposal: yes/);
  assert.match(summary, /Requires consent-quality record: yes/);
});

test("donation offset safety authenticity preview is no-capture and claim-typed", () => {
  const preview = buildDemoDonationOffsetSafetyAuthenticityPreview();

  assert.equal(preview.schemaVersion, "donation-offset-safety-authenticity-preview-v1");
  assert.equal(preview.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.evidenceUploadCreatesReliance, false);
  assert.equal(preview.hashStorageProvesAuthenticity, false);
  assert.equal(preview.privacyGrantRequiredBeforeDisclosure, true);
  assert.equal(preview.evidenceAuthenticityReviewRequired, true);
  assert.equal(preview.financialCrimeReviewRequired, true);
  assert.equal(preview.nonTransferableByDefault, true);
  assert.equal(preview.readyForSafetyReview, true);
  assert.equal(preview.gates.some((gate) => gate.key === "confidentiality-privacy-rights"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "evidence-authenticity-synthetic-media"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "financial-crime-fraud-source-of-funds"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "agreement-transferability-non-assignment"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "cyber-abuse-digital-integrity"), true);
});

test("donation offset safety authenticity validation rejects missing review acknowledgements", () => {
  const errors = validateDonationOffsetSafetyAuthenticityInput({
    publicDescription: "",
    evidencePlanSummary: "",
    paymentPatternSummary: "",
    sideAgreementSummary: "",
    privacyGrantStatus: "missing",
    confidentialityPrivacy: "possible_or_unknown",
    evidenceAuthenticity: "possible_or_unknown",
    financialCrime: "possible_or_unknown",
    nonTransferability: "possible_or_unknown",
    regulatedGoodsHazardousActivity: "possible_or_unknown",
    cyberAbuseDigitalIntegrity: "possible_or_unknown",
    antiCorruptionProcessIntegrity: "possible_or_unknown",
    privacySensitiveEvidenceRequested: true,
    sourceAuthenticationReviewed: false,
    lockOrRelianceRequested: false,
    participantAcknowledgedNoUnauthorizedPrivateDisclosure: false,
    participantAcknowledgedClaimTypedEvidence: false,
    participantAcknowledgedNonTransferability: false,
  });

  assert.ok(errors.some((error) => /safety context/i.test(error)));
  assert.ok(errors.some((error) => /claim-typed evidence/i.test(error)));
  assert.ok(errors.some((error) => /payment, receipt, refund/i.test(error)));
  assert.ok(errors.some((error) => /privacy grant/i.test(error)));
  assert.ok(errors.some((error) => /source-authentication/i.test(error)));
  assert.ok(errors.some((error) => /private or third-party data/i.test(error)));
  assert.ok(errors.some((error) => /non-transferable/i.test(error)));
});

test("donation offset safety authenticity blocks forged evidence and unauthorized digital terms", () => {
  const preview = buildDonationOffsetSafetyAuthenticityPreview({
    publicDescription:
      "This offset uses a fake receipt and asks a counterparty to hack a private donor portal.",
    evidencePlanSummary:
      "The evidence plan relies on a selectively edited receipt detached from source records.",
    paymentPatternSummary:
      "External charity payment with no ordinary public confirmation available.",
    sideAgreementSummary:
      "No separate side agreement is proposed.",
    privacyGrantStatus: "not_needed",
    confidentialityPrivacy: "clear",
    evidenceAuthenticity: "clear",
    financialCrime: "clear",
    nonTransferability: "clear",
    regulatedGoodsHazardousActivity: "clear",
    cyberAbuseDigitalIntegrity: "clear",
    antiCorruptionProcessIntegrity: "clear",
    privacySensitiveEvidenceRequested: false,
    sourceAuthenticationReviewed: true,
    lockOrRelianceRequested: false,
    participantAcknowledgedNoUnauthorizedPrivateDisclosure: true,
    participantAcknowledgedClaimTypedEvidence: true,
    participantAcknowledgedNonTransferability: true,
  });

  assert.equal(
    preview.gates.find((gate) => gate.key === "evidence-authenticity-synthetic-media")?.status,
    "blocked",
  );
  assert.equal(
    preview.gates.find((gate) => gate.key === "cyber-abuse-digital-integrity")?.status,
    "blocked",
  );
});

test("donation offset safety authenticity fails closed on premature reliance", () => {
  const input: Parameters<typeof buildDonationOffsetSafetyAuthenticityPreview>[0] = {
    publicDescription: "Participants redirect opposed donations to a registered charity.",
    evidencePlanSummary: "Use a source-traceable public receipt for the payment claim only.",
    paymentPatternSummary: "External donors pay the charity directly with no refund side channel.",
    sideAgreementSummary: "No side agreement, assignment, resale, or private compensation.",
    privacyGrantStatus: "not_needed",
    confidentialityPrivacy: "clear",
    evidenceAuthenticity: "clear",
    financialCrime: "clear",
    nonTransferability: "clear",
    regulatedGoodsHazardousActivity: "clear",
    cyberAbuseDigitalIntegrity: "clear",
    antiCorruptionProcessIntegrity: "clear",
    privacySensitiveEvidenceRequested: false,
    sourceAuthenticationReviewed: true,
    lockOrRelianceRequested: true,
    participantAcknowledgedNoUnauthorizedPrivateDisclosure: true,
    participantAcknowledgedClaimTypedEvidence: true,
    participantAcknowledgedNonTransferability: true,
  };
  const preview = buildDonationOffsetSafetyAuthenticityPreview(input);
  const errors = validateDonationOffsetSafetyAuthenticityInput(input);

  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.gates.find((gate) => gate.key === "lock-reliance-boundary")?.status, "blocked");
  assert.ok(errors.some((error) => /cannot request lock, capture, release, or reliance/i.test(error)));
});

test("donation offset safety authenticity summary records non-reliance boundaries", () => {
  const summary = summarizeDonationOffsetSafetyAuthenticityForNotes(
    buildDemoDonationOffsetSafetyAuthenticityPreview(),
  );

  assert.match(summary, /Evidence upload creates reliance: no/);
  assert.match(summary, /Hash storage proves authenticity: no/);
  assert.match(summary, /Privacy grant required before disclosure: yes/);
  assert.match(summary, /Evidence authenticity review required: yes/);
  assert.match(summary, /Financial-crime review required: yes/);
  assert.match(summary, /Non-transferable by default: yes/);
});

test("donation offset authority fairness preview is no-capture and self-binding", () => {
  const preview = buildDemoDonationOffsetAuthorityFairnessPreview();

  assert.equal(preview.schemaVersion, "donation-offset-authority-fairness-preview-v1");
  assert.equal(preview.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.participantMayBindOnlySelfByDefault, true);
  assert.equal(preview.baselineManufacturingBlocked, true);
  assert.equal(preview.reportingSuppressionBlocked, true);
  assert.equal(preview.coerciveConsentNotSufficient, true);
  assert.equal(preview.civilRightsReviewRequired, true);
  assert.equal(preview.readyForAuthorityReview, true);
  assert.equal(preview.gates.some((gate) => gate.key === "baseline-integrity"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "third-party-obligation"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "representative-authority"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "reporting-integrity"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "civil-rights-discrimination"), true);
  assert.equal(preview.gates.some((gate) => gate.key === "participant-autonomy-coercion"), true);
});

test("donation offset authority fairness validation rejects missing acknowledgements", () => {
  const errors = validateDonationOffsetAuthorityFairnessInput({
    publicDescription: "",
    baselineStatement: "",
    authoritySummary: "",
    sideAgreementSummary: "",
    baselineIntegrityStatus: "unknown",
    thirdPartyObligationStatus: "possible_or_unknown",
    representativeAuthorityStatus: "unknown",
    reportingIntegrity: "possible_or_unknown",
    civilRights: "possible_or_unknown",
    participantAutonomy: "possible_or_unknown",
    jurisdictionReviewStatus: "unknown",
    lockOrRelianceRequested: false,
    participantAcknowledgedOwnResourcesOnly: false,
    participantAcknowledgedNoReportingSuppression: false,
    participantAcknowledgedNoDiscrimination: false,
    participantAcknowledgedNoCoercion: false,
  });

  assert.ok(errors.some((error) => /authority and fairness context/i.test(error)));
  assert.ok(errors.some((error) => /no-trade baseline/i.test(error)));
  assert.ok(errors.some((error) => /controls the donation/i.test(error)));
  assert.ok(errors.some((error) => /own resources/i.test(error)));
  assert.ok(errors.some((error) => /truthful reporting/i.test(error)));
  assert.ok(errors.some((error) => /unlawful discrimination/i.test(error)));
  assert.ok(errors.some((error) => /coerced or dependency-based consent/i.test(error)));
});

test("donation offset authority fairness blocks manufactured baselines and reporting suppression", () => {
  const preview = buildDonationOffsetAuthorityFairnessPreview({
    publicDescription:
      "I will donate to an opposed cause unless someone matches me and agrees to stay silent.",
    baselineStatement:
      "The baseline was increased after entering the marketplace unless a counterparty pays.",
    authoritySummary:
      "The participant controls only their own direct donation.",
    sideAgreementSummary:
      "The counterparty must withdraw complaint records and not report misconduct.",
    baselineIntegrityStatus: "needs_review",
    thirdPartyObligationStatus: "none_known",
    representativeAuthorityStatus: "self_only",
    reportingIntegrity: "clear",
    civilRights: "clear",
    participantAutonomy: "clear",
    jurisdictionReviewStatus: "non_blocking_review",
    lockOrRelianceRequested: false,
    participantAcknowledgedOwnResourcesOnly: true,
    participantAcknowledgedNoReportingSuppression: true,
    participantAcknowledgedNoDiscrimination: true,
    participantAcknowledgedNoCoercion: true,
  });

  assert.equal(preview.gates.find((gate) => gate.key === "baseline-integrity")?.status, "blocked");
  assert.equal(preview.gates.find((gate) => gate.key === "reporting-integrity")?.status, "blocked");
});

test("donation offset authority fairness flags representative claims and coercion", () => {
  const preview = buildDonationOffsetAuthorityFairnessPreview({
    publicDescription:
      "A donor wants to redirect funds on behalf of a donor-advised fund while a participant is under pressure.",
    baselineStatement:
      "The baseline is a pre-existing direct donation plan.",
    authoritySummary:
      "The participant claims representative authority for a donor-advised fund account holder.",
    sideAgreementSummary:
      "No reporting or discrimination side agreement is proposed.",
    baselineIntegrityStatus: "non_blocking_review",
    thirdPartyObligationStatus: "none_known",
    representativeAuthorityStatus: "claims_representative_authority",
    reportingIntegrity: "clear",
    civilRights: "clear",
    participantAutonomy: "clear",
    jurisdictionReviewStatus: "needs_review",
    lockOrRelianceRequested: false,
    participantAcknowledgedOwnResourcesOnly: true,
    participantAcknowledgedNoReportingSuppression: true,
    participantAcknowledgedNoDiscrimination: true,
    participantAcknowledgedNoCoercion: true,
  });

  assert.equal(
    preview.gates.find((gate) => gate.key === "representative-authority")?.status,
    "human_review",
  );
  assert.equal(preview.gates.find((gate) => gate.key === "participant-autonomy-coercion")?.status, "blocked");
  assert.equal(preview.gates.find((gate) => gate.key === "jurisdiction-review")?.status, "human_review");
});

test("donation offset authority fairness fails closed on premature reliance", () => {
  const input: Parameters<typeof buildDonationOffsetAuthorityFairnessPreview>[0] = {
    publicDescription: "Participants redirect their own opposed donations to a registered charity.",
    baselineStatement: "The baseline is a pre-existing donation plan.",
    authoritySummary: "Each participant controls only their own donation and evidence.",
    sideAgreementSummary: "No side agreement is proposed.",
    baselineIntegrityStatus: "non_blocking_review",
    thirdPartyObligationStatus: "none_known",
    representativeAuthorityStatus: "self_only",
    reportingIntegrity: "clear",
    civilRights: "clear",
    participantAutonomy: "clear",
    jurisdictionReviewStatus: "non_blocking_review",
    lockOrRelianceRequested: true,
    participantAcknowledgedOwnResourcesOnly: true,
    participantAcknowledgedNoReportingSuppression: true,
    participantAcknowledgedNoDiscrimination: true,
    participantAcknowledgedNoCoercion: true,
  };
  const preview = buildDonationOffsetAuthorityFairnessPreview(input);
  const errors = validateDonationOffsetAuthorityFairnessInput(input);

  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.clearingAllowed, false);
  assert.equal(preview.gates.find((gate) => gate.key === "lock-reliance-boundary")?.status, "blocked");
  assert.ok(errors.some((error) => /cannot request lock, capture, release, or reliance/i.test(error)));
});

test("donation offset authority fairness summary records self-binding boundaries", () => {
  const summary = summarizeDonationOffsetAuthorityFairnessForNotes(
    buildDemoDonationOffsetAuthorityFairnessPreview(),
  );

  assert.match(summary, /Participant may bind only self by default: yes/);
  assert.match(summary, /Baseline manufacturing blocked: yes/);
  assert.match(summary, /Reporting suppression blocked: yes/);
  assert.match(summary, /Coercive consent sufficient: no/);
  assert.match(summary, /Civil-rights review required: yes/);
});

test("donation offset page renders the moraltrade60 batch-clearing preview surface", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const helper = readFileSync("src/lib/donation-offsets.ts", "utf8");

  assert.match(page, /Batch clearing dry run/);
  assert.match(page, /commitment inventory/i);
  assert.match(page, /Final lock proposal/);
  assert.match(page, /No capture in preview/);
  assert.match(page, /buildDonationOffsetBatchClearingDryRun/);
  assert.match(helper, /AtomicSettlementPreview/);
  assert.match(helper, /ready_for_final_lock_confirmation/);
  assert.match(helper, /createsPaymentCapture: false/);
});

test("donation offset donor-of-record UI and server action are wired", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const form = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const action = readFileSync("src/app/actions.ts", "utf8");

  assert.match(page, /Donor-of-record and receipt preview/);
  assert.match(page, /buildDemoDonationOffsetDonorOfRecordPreview/);
  assert.match(form, /offset_donor_of_record_role/);
  assert.match(form, /No tax advice/);
  assert.match(action, /validateDonationOffsetDonorOfRecordInput/);
  assert.match(action, /summarizeDonationOffsetDonorOfRecordForNotes/);
});

test("donation offset payment-destination UI and server action are wired", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const form = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const action = readFileSync("src/app/actions.ts", "utf8");

  assert.match(page, /Recipient and destination verification/);
  assert.match(page, /buildDemoDonationOffsetPaymentDestinationPreview/);
  assert.match(form, /offset_payment_destination_kind/);
  assert.match(form, /offset_evidence_not_destination_acknowledgement/);
  assert.match(action, /validateDonationOffsetPaymentDestinationInput/);
  assert.match(action, /summarizeDonationOffsetPaymentDestinationForNotes/);
});

test("donation offset externality and evidence UI and server action are wired", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const form = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const action = readFileSync("src/app/actions.ts", "utf8");

  assert.match(page, /Externality and evidence burden/);
  assert.match(page, /buildDemoDonationOffsetExternalityEvidencePreview/);
  assert.match(form, /offset_nonparticipant_externality_status/);
  assert.match(form, /offset_least_intrusive_evidence_acknowledgement/);
  assert.match(action, /validateDonationOffsetExternalityEvidenceInput/);
  assert.match(action, /summarizeDonationOffsetExternalityEvidenceForNotes/);
});

test("donation offset participant-confirmation UI and server action are wired", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const form = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const action = readFileSync("src/app/actions.ts", "utf8");

  assert.match(page, /Participant confirmation and lock boundary/);
  assert.match(page, /The platform does not infer moral surplus/);
  assert.match(page, /buildDemoDonationOffsetParticipantConfirmationPreview/);
  assert.match(form, /offset_participant_confirmation_record_status/);
  assert.match(form, /offset_baseline_comparison_acknowledgement/);
  assert.match(form, /offset_lock_or_capture_requested/);
  assert.match(action, /validateDonationOffsetParticipantConfirmationInput/);
  assert.match(action, /summarizeDonationOffsetParticipantConfirmationForNotes/);
});

test("donation offset safety-authenticity UI and server action are wired", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const form = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const action = readFileSync("src/app/actions.ts", "utf8");

  assert.match(page, /Safety and evidence authenticity/);
  assert.match(page, /Hash storage is not authenticity review/);
  assert.match(page, /buildDemoDonationOffsetSafetyAuthenticityPreview/);
  assert.match(form, /offset_evidence_authenticity_status/);
  assert.match(form, /offset_no_unauthorized_private_disclosure_acknowledgement/);
  assert.match(form, /offset_claim_typed_evidence_acknowledgement/);
  assert.match(action, /validateDonationOffsetSafetyAuthenticityInput/);
  assert.match(action, /summarizeDonationOffsetSafetyAuthenticityForNotes/);
});

test("donation offset authority-fairness UI and server action are wired", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const form = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const action = readFileSync("src/app/actions.ts", "utf8");

  assert.match(page, /Authority and fairness/);
  assert.match(page, /Coerced consent is not participant surplus/);
  assert.match(page, /buildDemoDonationOffsetAuthorityFairnessPreview/);
  assert.match(form, /offset_baseline_integrity_status/);
  assert.match(form, /offset_representative_authority_status/);
  assert.match(form, /offset_no_reporting_suppression_acknowledgement/);
  assert.match(action, /validateDonationOffsetAuthorityFairnessInput/);
  assert.match(action, /summarizeDonationOffsetAuthorityFairnessForNotes/);
});

test("pool moderation flags missing deadline when pool mode is selected", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    participationMode: "pool",
    poolName: "Example pooled offset",
    poolSide: "side_a",
    description: "Pool commitments redirect opposed donations toward a shared compromise charity.",
    evidenceUrl: "https://example.com/proof",
    assuranceDeadline: "",
  });

  assert.equal(moderation.status, "flagged");
  assert.match(moderation.reasons.join(" "), /deadline/i);
});

test("evidence locators normalize URLs for one-proof-one-claim checks", () => {
  assert.equal(
    normalizeEvidenceLocator(" HTTPS://Example.com/receipt/?b=2&a=1#section "),
    "https://example.com/receipt?a=1&b=2",
  );
  assert.equal(
    evidenceLocatorsConflict(
      "https://example.com/receipt/?b=2&a=1#section",
      "https://example.com/receipt?a=1&b=2",
    ),
    true,
  );
  assert.equal(
    evidenceLocatorsConflict("https://example.com/receipt/one", "https://example.com/receipt/two"),
    false,
  );
});

test("donation offset evidence states expose challenge and badge eligibility", () => {
  const reviewedEightDaysAgo = "2026-05-15T12:00:00.000Z";
  const now = new Date("2026-05-23T12:00:00.000Z");

  const cleared = getDonationOffsetEvidenceState({
    moderationStatus: "clear",
    evidenceUrl: "https://example.com/receipt",
    moderationReviewedAt: reviewedEightDaysAgo,
    createdAt: reviewedEightDaysAgo,
    now,
  });

  assert.equal(cleared.label, "Review-cleared evidence");
  assert.equal(cleared.badgeEligible, true);
  assert.equal(cleared.challengeWindowActive, false);

  const flagged = getDonationOffsetEvidenceState({
    moderationStatus: "flagged",
    evidenceUrl: "",
    moderationReviewedAt: null,
    createdAt: "2026-05-23T12:00:00.000Z",
    now,
  });

  assert.equal(flagged.label, "Needs evidence");
  assert.equal(flagged.badgeEligible, false);

  const unreviewed = getDonationOffsetEvidenceState({
    moderationStatus: "clear",
    evidenceUrl: "https://example.com/receipt",
    moderationReviewedAt: null,
    createdAt: "2026-05-01T12:00:00.000Z",
    now,
  });

  assert.equal(unreviewed.label, "Challenge window");
  assert.equal(unreviewed.badgeEligible, false);
});
