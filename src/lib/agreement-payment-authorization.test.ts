import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgreementPaymentAuthorizationPreview,
  inferAgreementPaymentTradeMode,
  isAgreementPaymentCapturePermitted,
  normalizeAgreementPaymentAuthorizationMode,
  normalizeAgreementPaymentAuthorizationStatus,
  normalizeAgreementPaymentCapturePolicy,
} from "@/lib/agreement-payment-authorization";

test("agreement payment authorization allows ordinary direct checkout when provider is configured", () => {
  const preview = buildAgreementPaymentAuthorizationPreview({
    agreementSource: "manual",
    providerConfigured: true,
    termsText: "One-time reimbursement for ordinary operational help.",
  });

  assert.equal(preview.schemaVersion, "agreement-payment-authorization-preview-v1");
  assert.equal(preview.tradeMode, "ordinary_agreement");
  assert.equal(preview.requiresConditionalAuthorization, false);
  assert.equal(preview.checkoutCreationAllowed, true);
  assert.equal(preview.capturePolicy, "direct_checkout_after_participant_request");
  assert.equal(preview.manualReviewStubRequired, false);
  assert.equal(preview.gates.every((gate) => gate.status === "pass"), true);
});

test("agreement payment authorization stubs donation offsets instead of creating checkout", () => {
  const preview = buildAgreementPaymentAuthorizationPreview({
    agreementCompletionState: "pending_evidence",
    agreementSource: "offer",
    hasAtomicSettlementGroup: false,
    hasFreshFinalConfirmations: false,
    hasMatchedTradeLockProposal: false,
    hasNonConflictingCommitmentReservation: false,
    offerMode: "offset",
    participantEligibilityCleared: false,
    paymentRailReviewCleared: false,
    providerConfigured: true,
    providerSupportsConditionalAuthorization: false,
    termsText: "Donation offset for a compromise charity.",
  });

  assert.equal(preview.tradeMode, "donation_offset");
  assert.equal(preview.requiresConditionalAuthorization, true);
  assert.equal(preview.checkoutCreationAllowed, false);
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.authorizationMode, "manual_review_stub");
  assert.equal(preview.authorizationStatus, "manual_review_required");
  assert.equal(preview.capturePolicy, "no_capture_until_matched_lock_confirmed");
  assert.deepEqual(
    preview.gates
      .filter((gate) => gate.status === "blocked")
      .map((gate) => gate.key),
    [
      "matched-trade-lock-proposal",
      "fresh-final-confirmations",
      "commitment-reservation",
      "atomic-settlement-group",
      "eligibility-payment-rail-review",
      "conditional-provider-integration",
    ],
  );
});

test("agreement payment authorization still does not use immediate checkout after lock gates pass", () => {
  const preview = buildAgreementPaymentAuthorizationPreview({
    authorizationExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authorizationMode: "provider_managed_conditional_authorization",
    authorizationStatus: "authorized",
    hasAtomicSettlementGroup: true,
    hasFreshFinalConfirmations: true,
    hasMatchedTradeLockProposal: true,
    hasNonConflictingCommitmentReservation: true,
    offerMode: "pledge",
    participantEligibilityCleared: true,
    paymentRailReviewCleared: true,
    providerConfigured: true,
    providerSupportsConditionalAuthorization: true,
    termsText: "Pledge swap with reciprocal performance.",
  });

  assert.equal(preview.tradeMode, "pledge_swap");
  assert.equal(preview.providerAuthorizationAllowed, true);
  assert.equal(preview.authorizationStatus, "authorized");
  assert.equal(preview.checkoutCreationAllowed, false);
  assert.equal(preview.captureAllowed, false);
});

test("agreement payment capture permission blocks manual-review stubs", () => {
  assert.equal(
    isAgreementPaymentCapturePermitted({
      authorizationMode: "manual_review_stub",
      authorizationStatus: "manual_review_required",
      capturePolicy: "no_capture_until_matched_lock_confirmed",
    }),
    false,
  );

  assert.equal(
    isAgreementPaymentCapturePermitted({
      authorizationMode: "direct_checkout",
      authorizationStatus: "not_required_for_stage",
      capturePolicy: "direct_checkout_after_participant_request",
    }),
    true,
  );

  assert.equal(
    isAgreementPaymentCapturePermitted({
      authorizationMode: "provider_managed_conditional_authorization",
      authorizationStatus: "authorized",
      capturePolicy: "no_capture_until_matched_lock_confirmed",
    }),
    true,
  );
});

test("agreement payment authorization inference and normalizers fail closed", () => {
  assert.equal(inferAgreementPaymentTradeMode({ offerMode: "payment" }), "compensated_action");
  assert.equal(
    inferAgreementPaymentTradeMode({
      termsText: "The parties propose a pledge swap with a reciprocal release.",
    }),
    "pledge_swap",
  );
  assert.equal(normalizeAgreementPaymentAuthorizationMode("stored_card"), "direct_checkout");
  assert.equal(normalizeAgreementPaymentAuthorizationMode("manual_review_stub"), "manual_review_stub");
  assert.equal(normalizeAgreementPaymentAuthorizationStatus("paid"), "not_required_for_stage");
  assert.equal(normalizeAgreementPaymentAuthorizationStatus("capture_blocked"), "capture_blocked");
  assert.equal(
    normalizeAgreementPaymentCapturePolicy("hold_open"),
    "direct_checkout_after_participant_request",
  );
  assert.equal(
    normalizeAgreementPaymentCapturePolicy("no_capture_until_matched_lock_confirmed"),
    "no_capture_until_matched_lock_confirmed",
  );
});
