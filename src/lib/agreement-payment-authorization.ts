export type AgreementPaymentTradeMode =
  | "ordinary_agreement"
  | "donation_offset"
  | "pledge_swap"
  | "compensated_action";

export type AgreementPaymentAuthorizationMode =
  | "direct_checkout"
  | "manual_review_stub"
  | "provider_managed_conditional_authorization";

export type AgreementPaymentAuthorizationStatus =
  | "not_required_for_stage"
  | "stub_blocked"
  | "manual_review_required"
  | "authorization_pending"
  | "authorized"
  | "authorization_failed"
  | "expired"
  | "capture_blocked";

export type AgreementPaymentCapturePolicy =
  | "direct_checkout_after_participant_request"
  | "no_capture_until_matched_lock_confirmed";

export type AgreementPaymentAuthorizationGateStatus = "pass" | "needs_review" | "blocked";

export interface AgreementPaymentAuthorizationGate {
  key: string;
  label: string;
  status: AgreementPaymentAuthorizationGateStatus;
  summary: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface AgreementPaymentAuthorizationPreviewInput {
  agreementCompletionState?: string | null;
  agreementSource?: string | null;
  authorizationExpiresAt?: string | null;
  authorizationMode?: string | null;
  authorizationStatus?: string | null;
  hasAtomicSettlementGroup?: boolean;
  hasFreshFinalConfirmations?: boolean;
  hasMatchedTradeLockProposal?: boolean;
  hasNonConflictingCommitmentReservation?: boolean;
  offerMode?: string | null;
  participantEligibilityCleared?: boolean;
  paymentRailReviewCleared?: boolean;
  providerConfigured?: boolean;
  providerSupportsConditionalAuthorization?: boolean;
  reviewStage?: string | null;
  termsText?: string | null;
}

export interface AgreementPaymentAuthorizationPreview {
  schemaVersion: "agreement-payment-authorization-preview-v1";
  releaseStage: "agreement_payment_authorization_stub";
  tradeMode: AgreementPaymentTradeMode;
  authorizationMode: AgreementPaymentAuthorizationMode;
  authorizationStatus: AgreementPaymentAuthorizationStatus;
  capturePolicy: AgreementPaymentCapturePolicy;
  requiresConditionalAuthorization: boolean;
  providerAuthorizationAllowed: boolean;
  checkoutCreationAllowed: boolean;
  captureAllowed: boolean;
  manualReviewStubRequired: boolean;
  statusLabel: string;
  gateSnapshot: string;
  gates: AgreementPaymentAuthorizationGate[];
}

const DONATION_OFFSET_TERMS_PATTERN =
  /\b(donation offset|offset donation|compromise donation|donor[- ]of[- ]record|tax receipt|charitable solicitation)\b/i;
const PLEDGE_SWAP_TERMS_PATTERN =
  /\b(pledge swap|abstention commitment|negative commitment|reciprocal release|performance schedule)\b/i;
const COMPENSATED_ACTION_TERMS_PATTERN =
  /\b(compensated action|paid action|payment-mediated|ordinary service|procurement|stipend|bounty)\b/i;

export function normalizeAgreementPaymentAuthorizationMode(
  value: string | null | undefined,
): AgreementPaymentAuthorizationMode {
  if (value === "manual_review_stub" || value === "provider_managed_conditional_authorization") {
    return value;
  }

  return "direct_checkout";
}

export function normalizeAgreementPaymentAuthorizationStatus(
  value: string | null | undefined,
): AgreementPaymentAuthorizationStatus {
  if (
    value === "stub_blocked" ||
    value === "manual_review_required" ||
    value === "authorization_pending" ||
    value === "authorized" ||
    value === "authorization_failed" ||
    value === "expired" ||
    value === "capture_blocked"
  ) {
    return value;
  }

  return "not_required_for_stage";
}

export function normalizeAgreementPaymentCapturePolicy(
  value: string | null | undefined,
): AgreementPaymentCapturePolicy {
  if (value === "no_capture_until_matched_lock_confirmed") {
    return value;
  }

  return "direct_checkout_after_participant_request";
}

export function inferAgreementPaymentTradeMode({
  offerMode,
  termsText,
}: {
  offerMode?: string | null;
  termsText?: string | null;
}): AgreementPaymentTradeMode {
  if (offerMode === "offset") {
    return "donation_offset";
  }

  if (offerMode === "pledge") {
    return "pledge_swap";
  }

  if (offerMode === "payment") {
    return "compensated_action";
  }

  const text = termsText ?? "";

  if (DONATION_OFFSET_TERMS_PATTERN.test(text)) {
    return "donation_offset";
  }

  if (PLEDGE_SWAP_TERMS_PATTERN.test(text)) {
    return "pledge_swap";
  }

  if (COMPENSATED_ACTION_TERMS_PATTERN.test(text)) {
    return "compensated_action";
  }

  return "ordinary_agreement";
}

function gate({
  blockerCodes = [],
  key,
  label,
  nextAction,
  status,
  summary,
}: AgreementPaymentAuthorizationGate): AgreementPaymentAuthorizationGate {
  return {
    blockerCodes,
    key,
    label,
    nextAction,
    status,
    summary,
  };
}

function isFutureIso(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && timestamp > Date.now();
}

export function buildAgreementPaymentAuthorizationPreview(
  input: AgreementPaymentAuthorizationPreviewInput,
): AgreementPaymentAuthorizationPreview {
  const tradeMode = inferAgreementPaymentTradeMode({
    offerMode: input.offerMode,
    termsText: [
      input.agreementSource,
      input.reviewStage,
      input.termsText,
    ].filter(Boolean).join("\n"),
  });
  const requiresConditionalAuthorization = tradeMode !== "ordinary_agreement";
  const requestedAuthorizationMode = normalizeAgreementPaymentAuthorizationMode(input.authorizationMode);
  const authorizationStatus = normalizeAgreementPaymentAuthorizationStatus(input.authorizationStatus);
  const capturePolicy = requiresConditionalAuthorization
    ? "no_capture_until_matched_lock_confirmed"
    : normalizeAgreementPaymentCapturePolicy(undefined);
  const authorizationFresh =
    authorizationStatus === "authorized" && isFutureIso(input.authorizationExpiresAt);
  const lockReady = input.hasMatchedTradeLockProposal === true;
  const confirmationsReady = input.hasFreshFinalConfirmations === true;
  const reservationReady = input.hasNonConflictingCommitmentReservation === true;
  const atomicSettlementReady = input.hasAtomicSettlementGroup === true;
  const participantEligibilityReady = input.participantEligibilityCleared === true;
  const paymentRailReady = input.paymentRailReviewCleared === true;
  const providerConfigured = input.providerConfigured === true;
  const providerSupportsConditionalAuthorization =
    input.providerSupportsConditionalAuthorization === true;

  if (!requiresConditionalAuthorization) {
    const ordinaryGates = [
      gate({
        key: "direct-checkout-scope",
        label: "Direct checkout scope",
        status: "pass",
        summary: "This agreement is not classified as a donation offset, pledge swap, or compensated moral-action agreement.",
        nextAction: "Use ordinary participant-requested checkout controls.",
        blockerCodes: [],
      }),
      gate({
        key: "provider-configured",
        label: "Provider configured",
        status: providerConfigured ? "pass" : "blocked",
        summary: providerConfigured
          ? "Stripe is configured for ordinary agreement checkout."
          : "Stripe is not configured for ordinary agreement checkout.",
        nextAction: providerConfigured
          ? "Create checkout only after participant request."
          : "Configure Stripe before creating checkout.",
        blockerCodes: providerConfigured ? [] : ["payment_provider_not_configured"],
      }),
    ];

    return {
      schemaVersion: "agreement-payment-authorization-preview-v1",
      releaseStage: "agreement_payment_authorization_stub",
      tradeMode,
      authorizationMode: "direct_checkout",
      authorizationStatus: "not_required_for_stage",
      capturePolicy: "direct_checkout_after_participant_request",
      requiresConditionalAuthorization: false,
      providerAuthorizationAllowed: providerConfigured,
      checkoutCreationAllowed: providerConfigured,
      captureAllowed: providerConfigured,
      manualReviewStubRequired: !providerConfigured,
      statusLabel: providerConfigured
        ? "Direct checkout available"
        : "Payment provider setup required",
      gateSnapshot: ordinaryGates
        .map((entry) => `${entry.key}:${entry.status}`)
        .join(";"),
      gates: ordinaryGates,
    };
  }

  const domainGates = [
    gate({
      key: "matched-trade-lock-proposal",
      label: "Matched-trade lock proposal",
      status: lockReady ? "pass" : "blocked",
      summary: lockReady
        ? "A frozen matched-trade lock proposal is referenced."
        : "A broad preview or agreement page is not enough to authorize money movement.",
      nextAction: lockReady
        ? "Keep the frozen proposal attached to the payment authorization."
        : "Create a frozen matched-trade lock proposal before payment authorization.",
      blockerCodes: lockReady ? [] : ["matched_trade_lock_proposal_required"],
    }),
    gate({
      key: "fresh-final-confirmations",
      label: "Fresh final confirmations",
      status: confirmationsReady ? "pass" : "blocked",
      summary: confirmationsReady
        ? "Fresh participant confirmations are present for the frozen terms."
        : "Payment cannot rely on stale, missing, or parent-record-only confirmations.",
      nextAction: confirmationsReady
        ? "Keep confirmation record refs attached."
        : "Collect fresh final confirmations from every affected participant.",
      blockerCodes: confirmationsReady ? [] : ["fresh_final_confirmations_required"],
    }),
    gate({
      key: "commitment-reservation",
      label: "Commitment reservation",
      status: reservationReady ? "pass" : "blocked",
      summary: reservationReady
        ? "Payment authorization is tied to a non-conflicting commitment reservation."
        : "The same donation, abstention, action, or payment capacity may not be double-counted.",
      nextAction: reservationReady
        ? "Preserve the reservation snapshot."
        : "Reserve the relevant commitment inventory before authorizing payment.",
      blockerCodes: reservationReady ? [] : ["commitment_reservation_required"],
    }),
    gate({
      key: "atomic-settlement-group",
      label: "Atomic settlement group",
      status: atomicSettlementReady ? "pass" : "blocked",
      summary: atomicSettlementReady
        ? "The payment authorization belongs to an all-or-none settlement group."
        : "One side must not be charged or induced before the reciprocal side is locked.",
      nextAction: atomicSettlementReady
        ? "Keep the atomic group current through settlement."
        : "Attach an atomic settlement group before provider authorization.",
      blockerCodes: atomicSettlementReady ? [] : ["atomic_settlement_group_required"],
    }),
    gate({
      key: "eligibility-payment-rail-review",
      label: "Eligibility and payment-rail review",
      status: participantEligibilityReady && paymentRailReady ? "pass" : "blocked",
      summary: participantEligibilityReady && paymentRailReady
        ? "Participant eligibility and payment-rail review are non-blocking."
        : "Eligibility, legal capacity, sanctions/payment rail, and jurisdiction checks must be non-blocking.",
      nextAction: participantEligibilityReady && paymentRailReady
        ? "Keep eligibility and payment-rail decisions attached."
        : "Complete participant eligibility and payment-rail review before authorization.",
      blockerCodes:
        participantEligibilityReady && paymentRailReady
          ? []
          : ["participant_eligibility_or_payment_rail_review_required"],
    }),
    gate({
      key: "conditional-provider-integration",
      label: "Conditional provider integration",
      status: providerConfigured && providerSupportsConditionalAuthorization ? "pass" : "blocked",
      summary: providerConfigured && providerSupportsConditionalAuthorization
        ? "The provider path supports conditional authorization without immediate capture."
        : "Current agreement Stripe Checkout captures immediately and cannot serve as a conditional authorization.",
      nextAction: providerConfigured && providerSupportsConditionalAuthorization
        ? "Create provider authorization only after all lock gates pass."
        : "Record a manual-review stub; do not create Checkout for this agreement type.",
      blockerCodes:
        providerConfigured && providerSupportsConditionalAuthorization
          ? []
          : ["conditional_payment_provider_integration_required"],
    }),
    gate({
      key: "authorization-freshness",
      label: "Authorization freshness",
      status: authorizationFresh ? "pass" : "needs_review",
      summary: authorizationFresh
        ? "A non-expired payment authorization is present."
        : "No fresh conditional authorization is present.",
      nextAction: authorizationFresh
        ? "Capture only through the frozen settlement path."
        : "Authorize near clearing after lock and review gates are non-blocking.",
      blockerCodes: authorizationFresh ? [] : ["fresh_payment_authorization_required"],
    }),
  ];
  const providerAuthorizationAllowed = domainGates
    .filter((entry) => entry.key !== "authorization-freshness")
    .every((entry) => entry.status === "pass");

  return {
    schemaVersion: "agreement-payment-authorization-preview-v1",
    releaseStage: "agreement_payment_authorization_stub",
    tradeMode,
    authorizationMode:
      providerConfigured && providerSupportsConditionalAuthorization
        ? requestedAuthorizationMode
        : "manual_review_stub",
    authorizationStatus:
      providerAuthorizationAllowed && authorizationFresh ? "authorized" : "manual_review_required",
    capturePolicy,
    requiresConditionalAuthorization,
    providerAuthorizationAllowed,
    checkoutCreationAllowed: false,
    captureAllowed: false,
    manualReviewStubRequired: true,
    statusLabel:
      tradeMode === "donation_offset"
        ? "Donation-offset payment authorization is stubbed"
        : tradeMode === "pledge_swap"
          ? "Pledge-swap payment authorization is stubbed"
          : "Compensated-action payment authorization is stubbed",
    gateSnapshot: domainGates
      .map((entry) => `${entry.key}:${entry.status}`)
      .join(";"),
    gates: domainGates,
  };
}

export function isAgreementPaymentCapturePermitted({
  authorizationMode,
  authorizationStatus,
  capturePolicy,
}: {
  authorizationMode?: string | null;
  authorizationStatus?: string | null;
  capturePolicy?: string | null;
}) {
  const normalizedCapturePolicy = normalizeAgreementPaymentCapturePolicy(capturePolicy);
  const normalizedAuthorizationMode = normalizeAgreementPaymentAuthorizationMode(authorizationMode);
  const normalizedAuthorizationStatus = normalizeAgreementPaymentAuthorizationStatus(authorizationStatus);

  if (normalizedCapturePolicy === "direct_checkout_after_participant_request") {
    return (
      normalizedAuthorizationMode === "direct_checkout" &&
      normalizedAuthorizationStatus === "not_required_for_stage"
    );
  }

  return (
    normalizedAuthorizationMode === "provider_managed_conditional_authorization" &&
    normalizedAuthorizationStatus === "authorized"
  );
}
