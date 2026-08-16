import { createHmac } from "node:crypto";

import {
  DIRECT_DONATION_UPGRADE_MAX_CENTS,
  DIRECT_DONATION_UPGRADE_MIN_CENTS,
  getDirectDonationUpgradeConfig,
  hashDirectDonationUpgradeText,
  hashDirectDonationUpgradeValue,
  type DirectDonationUpgradeConfig,
  type DirectDonationUpgradeEnvironment,
  type DirectDonationUpgradeObligationRow,
  type DirectDonationUpgradePrivacyMode,
  type DirectDonationUpgradeRuntimeEnvironment,
  type EveryOrgNonprofitIdentity,
} from "@/lib/direct-donation-upgrade";

export const DIRECT_SPENDING_UPGRADE_BASELINE_SCHEMA =
  "direct-spending-upgrade-baseline-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_TERMS_SCHEMA =
  "direct-spending-upgrade-terms-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_EVIDENCE_SCHEMA =
  "direct-spending-upgrade-private-evidence-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_SAFETY_ATTESTATION_VERSION =
  "direct-spending-upgrade-safety-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_CONSENT_VERSION =
  "direct-spending-upgrade-consent-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_REVIEW_AUTHORITY_VERSION =
  "direct-spending-upgrade-assigned-reviewer-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION =
  "direct-spending-upgrade-matcher-v1-2026-08-14" as const;
export const DIRECT_SPENDING_UPGRADE_PROPOSAL_COMMITMENT_VERSION =
  "direct-spending-upgrade-proposal-v1-2026-08-14" as const;

export const DIRECT_SPENDING_UPGRADE_ALLOWED_CATEGORIES = [
  "recurring_subscription",
  "cancellable_reservation_or_service",
  "pending_order_or_upgrade",
] as const;

export const DIRECT_SPENDING_UPGRADE_ALLOWED_ACTIONS = [
  "cancel",
  "reduce",
  "downgrade",
] as const;

export const DIRECT_SPENDING_UPGRADE_BLOCKED_CATEGORIES = [
  "food_nutrition_or_hydration",
  "medical_mental_dental_reproductive_or_disability",
  "housing_utilities_or_essential_household_goods",
  "essential_transport_or_mobility",
  "insurance",
  "required_education_or_work",
  "debt_taxes_fines_legal_or_support_obligations",
  "child_elder_dependent_or_pet_care",
  "personal_or_household_safety",
  "bnpl_credit_cash_advance_payday_or_new_debt",
  "substantial_harm_risk",
] as const;

export type DirectSpendingUpgradeCategory =
  (typeof DIRECT_SPENDING_UPGRADE_ALLOWED_CATEGORIES)[number];
export type DirectSpendingUpgradeAction =
  (typeof DIRECT_SPENDING_UPGRADE_ALLOWED_ACTIONS)[number];
export type DirectSpendingUpgradeBlockedCategory =
  (typeof DIRECT_SPENDING_UPGRADE_BLOCKED_CATEGORIES)[number];
export type DirectSpendingUpgradeReviewStatus =
  | "submitted"
  | "review_required"
  | "accepted"
  | "rejected"
  | "disputed"
  | "unavailable";
export type DirectSpendingUpgradeObligationKind =
  | "creator_converted_spending"
  | "matcher_incremental";

export interface DirectSpendingUpgradeConfig {
  requestedEnabled: boolean;
  readyForCommitments: boolean;
  readyForCheckout: boolean;
  fingerprintSecret: string;
  blockers: string[];
  donationUpgrade: DirectDonationUpgradeConfig;
}

export interface DirectSpendingUpgradeSafetyAttestations {
  nonessential: boolean;
  noMaterialHarm: boolean;
  planExistedBeforeOffer: boolean;
  notAlreadyCancelledOrAbandoned: boolean;
  currentlyAvailableFunds: boolean;
  notOtherwiseCommittedToDonate: boolean;
}

export interface DirectSpendingUpgradeSplit {
  plannedSpendAmountCents: number;
  creatorDiversionAmountCents: number;
  retainedSpendingAmountCents: number;
  diversionBasisPoints: number;
}

export interface DirectSpendingUpgradeBaselineInput {
  creatorProfileId: string;
  category: DirectSpendingUpgradeCategory;
  privateMerchantLabel: string;
  privateDescription: string;
  plannedSpendAmountCents: number;
  creatorDiversionAmountCents: number;
  plannedAction: DirectSpendingUpgradeAction;
  evidencePayload: Record<string, unknown>;
  evidenceCapturedAt: string;
  safetyAttestations: DirectSpendingUpgradeSafetyAttestations;
}

export interface DirectSpendingUpgradeBaselineHashes {
  evidenceHash: string;
  baselineFingerprint: string;
}

export interface DirectSpendingUpgradeOfferRow {
  id: string;
  baseline_id: string;
  creator_profile_id: string;
  environment: DirectDonationUpgradeEnvironment;
  status:
    | "review_required"
    | "open"
    | "matched"
    | "completed"
    | "defaulted"
    | "expired"
    | "cancelled"
    | "needs_review"
    | "superseded";
  privacy_mode: DirectDonationUpgradePrivacyMode;
  category: DirectSpendingUpgradeCategory;
  planned_action: DirectSpendingUpgradeAction;
  planned_spend_amount_cents: number;
  creator_diversion_amount_cents: number;
  retained_spending_amount_cents: number;
  diversion_basis_points: number;
  matcher_amount_cents: number;
  currency: "USD";
  match_deadline_at: string;
  fulfillment_deadline_at: string | null;
  webhook_grace_ends_at: string | null;
  upgraded_recipient: EveryOrgNonprofitIdentity;
  upgraded_recipient_hash: string;
  baseline_review_status: DirectSpendingUpgradeReviewStatus;
  spending_change_review_status: DirectSpendingUpgradeReviewStatus | null;
  terms_hash: string;
  winning_candidate_id: string | null;
  supersedes_offer_id: string | null;
  superseded_by_offer_id: string | null;
  match_locked_at: string | null;
  completed_at: string | null;
  defaulted_at: string | null;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
}

export interface DirectSpendingUpgradePublicOfferRow {
  id: string;
  mechanism_subtype: "spending_upgrade";
  environment: DirectDonationUpgradeEnvironment;
  status: DirectSpendingUpgradeOfferRow["status"];
  privacy_mode: DirectDonationUpgradePrivacyMode;
  category: DirectSpendingUpgradeCategory;
  planned_action: DirectSpendingUpgradeAction;
  planned_spend_amount_cents: number;
  creator_diversion_amount_cents: number;
  retained_spending_amount_cents: number;
  diversion_basis_points: number;
  matcher_amount_cents: number;
  currency: "USD";
  match_deadline_at: string;
  fulfillment_deadline_at: string | null;
  webhook_grace_ends_at: string | null;
  upgraded_recipient: EveryOrgNonprofitIdentity;
  terms_hash: string;
  baseline_review_status: DirectSpendingUpgradeReviewStatus;
  spending_change_review_status: DirectSpendingUpgradeReviewStatus | null;
  created_at: string;
  completed_at: string | null;
  supersedes_offer_id: string | null;
  superseded_by_offer_id: string | null;
  creator_display_name: string | null;
  matcher_display_name: string | null;
  matcher_count: number;
  verified_obligation_count: number;
  verified_gross_amount_cents: number;
  verified_net_amount_cents: number;
  converted_spending_gross_amount_cents: number;
  converted_spending_net_amount_cents: number;
  incremental_gross_amount_cents: number;
  incremental_net_amount_cents: number;
}

export interface DirectSpendingUpgradePrivateOfferRow {
  id: string;
  baseline_id: string;
  creator_profile_id: string;
  environment: DirectDonationUpgradeEnvironment;
  status: DirectSpendingUpgradeOfferRow["status"];
  privacy_mode: DirectDonationUpgradePrivacyMode;
  creator_diversion_amount_cents: number;
  retained_spending_amount_cents: number;
  diversion_basis_points: number;
  matcher_amount_cents: number;
  currency: "USD";
  match_deadline_at: string;
  fulfillment_deadline_at: string | null;
  webhook_grace_ends_at: string | null;
  upgraded_recipient: EveryOrgNonprofitIdentity;
  upgraded_recipient_hash: string;
  spending_change_review_status: DirectSpendingUpgradeReviewStatus | null;
  terms_hash: string;
  winning_candidate_id: string | null;
  supersedes_offer_id: string | null;
  superseded_by_offer_id: string | null;
  match_locked_at: string | null;
  completed_at: string | null;
  defaulted_at: string | null;
  cancellation_reason: string;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
}

export interface DirectSpendingUpgradeBaselineRow {
  id: string;
  creator_profile_id: string;
  schema_version: typeof DIRECT_SPENDING_UPGRADE_BASELINE_SCHEMA;
  category: DirectSpendingUpgradeCategory;
  private_merchant_label: string;
  private_description: string;
  planned_spend_amount_cents: number;
  planned_action: DirectSpendingUpgradeAction;
  evidence_schema_version: typeof DIRECT_SPENDING_UPGRADE_EVIDENCE_SCHEMA;
  evidence_payload: Record<string, unknown>;
  evidence_hash: string;
  evidence_captured_at: string;
  baseline_fingerprint: string;
  review_status: DirectSpendingUpgradeReviewStatus;
  reviewed_at: string | null;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
}

export interface DirectSpendingUpgradeBaselineSummary {
  id: string;
  creator_profile_id: string;
  schema_version: typeof DIRECT_SPENDING_UPGRADE_BASELINE_SCHEMA;
  category: DirectSpendingUpgradeCategory;
  planned_spend_amount_cents: number;
  planned_action: DirectSpendingUpgradeAction;
  review_status: DirectSpendingUpgradeReviewStatus;
  reviewed_at: string | null;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
}

export interface DirectSpendingUpgradeCandidateRow {
  id: string;
  offer_id: string;
  profile_id: string;
  status: "primary" | "fulfilled" | "defaulted" | "withdrawn" | "closed";
  commitment_version: typeof DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION;
  commitment_accepted_at: string;
  fulfilled_at: string | null;
  defaulted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectSpendingUpgradeProposalRow {
  id: string;
  offer_id: string;
  proposer_profile_id: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "superseded" | "expired";
  base_terms_hash: string;
  proposed_creator_diversion_amount_cents: number;
  proposed_diversion_basis_points: number;
  proposed_matcher_amount_cents: number;
  currency: "USD";
  message: string;
  response_message: string;
  commitment_version: typeof DIRECT_SPENDING_UPGRADE_PROPOSAL_COMMITMENT_VERSION;
  commitment_accepted_at: string;
  responded_at: string | null;
  accepted_offer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectSpendingUpgradeEvidenceSummary {
  id: string;
  offer_id: string;
  evidence_kind: "spending_change";
  status: DirectSpendingUpgradeReviewStatus;
  captured_at: string;
  created_at: string;
}

export interface DirectSpendingUpgradeImpactCreditRow {
  id: string;
  offer_id: string;
  obligation_id: string;
  profile_id: string;
  credit_kind: "converted_spending" | "matcher_incremental";
  verified_gross_amount_cents: number;
  verified_net_amount_cents: number;
  converted_spending_gross_amount_cents: number;
  converted_spending_net_amount_cents: number;
  incremental_gross_amount_cents: number;
  incremental_net_amount_cents: number;
  evidence_decision_id: string | null;
  verified_at: string;
  created_at: string;
}

export interface DirectSpendingUpgradeObligationRow
  extends DirectDonationUpgradeObligationRow {
  obligation_kind: DirectSpendingUpgradeObligationKind;
}

export interface DirectSpendingUpgradeObligationSummary {
  id: string;
  offer_id: string;
  branch: "matched";
  candidate_id: string | null;
  participant_profile_id: string;
  participant_role: "creator" | "matcher";
  obligation_kind: DirectSpendingUpgradeObligationKind;
  environment: DirectDonationUpgradeEnvironment;
  expected_recipient: EveryOrgNonprofitIdentity;
  expected_amount_cents: number;
  expected_currency: "USD";
  status: DirectDonationUpgradeObligationRow["status"];
  due_at: string;
  webhook_grace_ends_at: string;
  provider_gross_amount_cents: number | null;
  provider_net_amount_cents: number | null;
  verified_at: string | null;
}

function normalizePrivateText(value: string, maximum: number) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

export function getDirectSpendingUpgradeConfig(
  runtimeEnvironment: DirectDonationUpgradeRuntimeEnvironment = process.env,
): DirectSpendingUpgradeConfig {
  const donationUpgrade = getDirectDonationUpgradeConfig(runtimeEnvironment);
  const requestedEnabled =
    String(runtimeEnvironment.DIRECT_SPENDING_UPGRADES_ENABLED ?? "")
      .trim()
      .toLowerCase() === "true";
  const fingerprintSecret = String(
    runtimeEnvironment.DIRECT_SPENDING_UPGRADE_FINGERPRINT_SECRET ?? "",
  ).trim();
  const blockers = [...donationUpgrade.blockers];
  if (!requestedEnabled) blockers.unshift("Spending Upgrades are disabled.");
  if (fingerprintSecret.length < 32) {
    blockers.push(
      "DIRECT_SPENDING_UPGRADE_FINGERPRINT_SECRET must be at least 32 characters.",
    );
  }
  return {
    requestedEnabled,
    readyForCommitments:
      requestedEnabled &&
      donationUpgrade.readyForCommitments &&
      fingerprintSecret.length >= 32,
    readyForCheckout:
      requestedEnabled &&
      donationUpgrade.readyForCheckout,
    fingerprintSecret,
    blockers: [...new Set(blockers)],
    donationUpgrade,
  };
}

export function isDirectSpendingUpgradeCategory(
  value: string,
): value is DirectSpendingUpgradeCategory {
  return (DIRECT_SPENDING_UPGRADE_ALLOWED_CATEGORIES as readonly string[]).includes(
    value,
  );
}

export function isDirectSpendingUpgradeAction(
  value: string,
): value is DirectSpendingUpgradeAction {
  return (DIRECT_SPENDING_UPGRADE_ALLOWED_ACTIONS as readonly string[]).includes(
    value,
  );
}

export function rejectBlockedDirectSpendingUpgradeCategory(value: string) {
  if (
    (DIRECT_SPENDING_UPGRADE_BLOCKED_CATEGORIES as readonly string[]).includes(
      value,
    )
  ) {
    throw new Error("This expense category is excluded from Spending Upgrade.");
  }
  if (!isDirectSpendingUpgradeCategory(value)) {
    throw new Error("Choose an allowed nonessential expense category.");
  }
  return value;
}

export function calculateDirectSpendingUpgradeSplit(
  plannedSpendAmountCents: number,
  creatorDiversionAmountCents: number,
): DirectSpendingUpgradeSplit {
  if (
    !Number.isSafeInteger(plannedSpendAmountCents) ||
    plannedSpendAmountCents < DIRECT_DONATION_UPGRADE_MIN_CENTS ||
    plannedSpendAmountCents > DIRECT_DONATION_UPGRADE_MAX_CENTS
  ) {
    throw new Error("The planned expense must be between $1.00 and $50,000.00.");
  }
  if (
    !Number.isSafeInteger(creatorDiversionAmountCents) ||
    creatorDiversionAmountCents < DIRECT_DONATION_UPGRADE_MIN_CENTS ||
    creatorDiversionAmountCents > plannedSpendAmountCents
  ) {
    throw new Error(
      "The creator donation must be at least $1.00 and no more than the planned expense.",
    );
  }
  const retainedSpendingAmountCents =
    plannedSpendAmountCents - creatorDiversionAmountCents;
  const diversionBasisPoints = Math.floor(
    (creatorDiversionAmountCents * 10_000 +
      Math.floor(plannedSpendAmountCents / 2)) /
      plannedSpendAmountCents,
  );
  return {
    plannedSpendAmountCents,
    creatorDiversionAmountCents,
    retainedSpendingAmountCents,
    diversionBasisPoints,
  };
}

export function validateDirectSpendingUpgradeBaseline(
  input: DirectSpendingUpgradeBaselineInput,
) {
  rejectBlockedDirectSpendingUpgradeCategory(input.category);
  if (!isDirectSpendingUpgradeAction(input.plannedAction)) {
    throw new Error("Choose a valid cancellation, reduction, or downgrade action.");
  }
  const merchant = normalizePrivateText(input.privateMerchantLabel, 180);
  const description = normalizePrivateText(input.privateDescription, 1_200);
  if (merchant.length < 2) throw new Error("A private merchant or service label is required.");
  if (description.length < 20) {
    throw new Error("Describe the prospective nonessential expense in at least 20 characters.");
  }
  const capturedAt = Date.parse(input.evidenceCapturedAt);
  if (!Number.isFinite(capturedAt) || capturedAt > Date.now() + 5 * 60 * 1000) {
    throw new Error("The prospective baseline evidence capture time is invalid.");
  }
  const missing = Object.entries(input.safetyAttestations)
    .filter(([, accepted]) => accepted !== true)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`All Spending Upgrade safety attestations are required: ${missing.join(", ")}.`);
  }
  const split = calculateDirectSpendingUpgradeSplit(
    input.plannedSpendAmountCents,
    input.creatorDiversionAmountCents,
  );
  return {
    ...input,
    privateMerchantLabel: merchant,
    privateDescription: description,
    evidenceCapturedAt: new Date(capturedAt).toISOString(),
    split,
  };
}

export function buildDirectSpendingUpgradeBaselineHashes(input: {
  baseline: ReturnType<typeof validateDirectSpendingUpgradeBaseline>;
  fingerprintSecret: string;
}): DirectSpendingUpgradeBaselineHashes {
  if (input.fingerprintSecret.length < 32) {
    throw new Error("A private baseline fingerprint secret is required.");
  }
  const evidenceHash = hashDirectDonationUpgradeValue({
    schemaVersion: DIRECT_SPENDING_UPGRADE_EVIDENCE_SCHEMA,
    payload: input.baseline.evidencePayload,
    capturedAt: input.baseline.evidenceCapturedAt,
  });
  const fingerprintInput = hashDirectDonationUpgradeValue({
    schemaVersion: DIRECT_SPENDING_UPGRADE_BASELINE_SCHEMA,
    creatorProfileId: input.baseline.creatorProfileId,
    category: input.baseline.category,
    privateMerchantLabel: input.baseline.privateMerchantLabel.toLowerCase(),
    privateDescription: input.baseline.privateDescription.toLowerCase(),
    plannedSpendAmountCents: input.baseline.plannedSpendAmountCents,
    plannedAction: input.baseline.plannedAction,
  });
  return {
    evidenceHash,
    baselineFingerprint: createHmac("sha256", input.fingerprintSecret)
      .update(fingerprintInput)
      .digest("hex"),
  };
}

export function buildDirectSpendingUpgradeTermsHash(input: {
  creatorProfileId: string;
  category: DirectSpendingUpgradeCategory;
  plannedAction: DirectSpendingUpgradeAction;
  plannedSpendAmountCents: number;
  creatorDiversionAmountCents: number;
  matcherAmountCents: number;
  upgradedRecipient: EveryOrgNonprofitIdentity;
  matchDeadlineAt: string;
  privacyMode: DirectDonationUpgradePrivacyMode;
  environment: DirectDonationUpgradeEnvironment;
  evidenceHash: string;
  evidenceCapturedAt: string;
  baselineFingerprint: string;
}) {
  const split = calculateDirectSpendingUpgradeSplit(
    input.plannedSpendAmountCents,
    input.creatorDiversionAmountCents,
  );
  if (
    !Number.isSafeInteger(input.matcherAmountCents) ||
    input.matcherAmountCents < DIRECT_DONATION_UPGRADE_MIN_CENTS ||
    input.matcherAmountCents > DIRECT_DONATION_UPGRADE_MAX_CENTS
  ) {
    throw new Error("The matcher donation must be between $1.00 and $50,000.00.");
  }
  return hashDirectDonationUpgradeValue({
    schemaVersion: DIRECT_SPENDING_UPGRADE_TERMS_SCHEMA,
    baselineSourceType: "nonessential_spending",
    baselineSchemaVersion: DIRECT_SPENDING_UPGRADE_BASELINE_SCHEMA,
    evidenceSchemaVersion: DIRECT_SPENDING_UPGRADE_EVIDENCE_SCHEMA,
    safetyAttestationVersion:
      DIRECT_SPENDING_UPGRADE_SAFETY_ATTESTATION_VERSION,
    consentVersion: DIRECT_SPENDING_UPGRADE_CONSENT_VERSION,
    creatorProfileId: input.creatorProfileId,
    category: input.category,
    plannedAction: input.plannedAction,
    plannedSpendAmountCents: split.plannedSpendAmountCents,
    creatorDiversionAmountCents: split.creatorDiversionAmountCents,
    retainedSpendingAmountCents: split.retainedSpendingAmountCents,
    diversionBasisPoints: split.diversionBasisPoints,
    matcherAmountCents: input.matcherAmountCents,
    currency: "USD",
    upgradedRecipientHash: input.upgradedRecipient.identityHash,
    matchDeadlineAt: new Date(input.matchDeadlineAt).toISOString(),
    privacyMode: input.privacyMode,
    environment: input.environment,
    baselineEvidenceHash: input.evidenceHash.toLowerCase(),
    baselineEvidenceCapturedAt: new Date(input.evidenceCapturedAt).toISOString(),
    baselineFingerprint: input.baselineFingerprint.toLowerCase(),
    matcherCommitmentVersion:
      DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION,
    proposalCommitmentVersion:
      DIRECT_SPENDING_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
  });
}

export function buildDirectSpendingUpgradeEvidenceHash(input: {
  offerId: string;
  evidencePayload: Record<string, unknown>;
  capturedAt: string;
}) {
  return hashDirectDonationUpgradeValue({
    schemaVersion: DIRECT_SPENDING_UPGRADE_EVIDENCE_SCHEMA,
    evidenceKind: "spending_change",
    offerId: input.offerId,
    capturedAt: new Date(input.capturedAt).toISOString(),
    payload: input.evidencePayload,
  });
}

export function directSpendingUpgradeCanMintCreatorCredit(input: {
  creatorDonationStatus: string;
  spendingChangeReviewStatus: DirectSpendingUpgradeReviewStatus | null;
  existingCreditCount: number;
}) {
  return (
    input.creatorDonationStatus === "verified" &&
    input.spendingChangeReviewStatus === "accepted" &&
    input.existingCreditCount === 0
  );
}

export function directSpendingUpgradeIsComplete(input: {
  creatorDonationStatus: string;
  matcherDonationStatus: string;
  spendingChangeReviewStatus: DirectSpendingUpgradeReviewStatus | null;
}) {
  return (
    input.creatorDonationStatus === "verified" &&
    input.matcherDonationStatus === "verified" &&
    input.spendingChangeReviewStatus === "accepted"
  );
}

export function directSpendingUpgradeProviderDonationId(input: {
  environment: DirectDonationUpgradeEnvironment;
  obligationId: string;
}) {
  return `direct-spending-upgrade:${input.environment}:${input.obligationId}`;
}

export function directSpendingUpgradeHashPrivateText(value: string) {
  return hashDirectDonationUpgradeText(normalizePrivateText(value, 2_000));
}
