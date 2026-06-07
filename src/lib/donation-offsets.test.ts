import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assessDonationOffsetModeration,
  buildDemoDonationOffsetDonorOfRecordPreview,
  buildDemoDonationOffsetPaymentDestinationPreview,
  buildDemoDonationOffsetBatchClearingDryRun,
  buildDonationOffsetBatchClearingDryRun,
  buildDonationOffsetDonorOfRecordPreview,
  buildDonationOffsetPaymentDestinationPreview,
  calculateDonationOffsetPreview,
  calculateDonationOffsetPoolProgress,
  createDefaultDonationOffsetFields,
  summarizeDonationOffsetDonorOfRecordForNotes,
  summarizeDonationOffsetPaymentDestinationForNotes,
  validateDonationOffsetDonorOfRecordInput,
  validateDonationOffsetPaymentDestinationInput,
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
