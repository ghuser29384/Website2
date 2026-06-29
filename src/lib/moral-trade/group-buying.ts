import { createHash, createHmac } from "node:crypto";

export const MORAL_GOODS_GROUP_BUYING_CONTRACT_VERSION =
  "moral-goods-group-buying-v0.1-2026-06";
export const MORAL_GOODS_GROUP_BUYING_VALIDATOR_VERSION =
  "moral-goods-group-buying-validator-v0.1";

const BPS_DENOMINATOR = BigInt(10_000);
const MILLI_UNIT_SCALE = BigInt(1_000);
const DEFAULT_HASH_ALGORITHM = "sha256";
const DEFAULT_CANONICALIZATION_VERSION = "canonical-json-v1-sorted-keys";

export type MoralGoodsEnvelopeType =
  | "group_buy_round"
  | "crowdfunded_pledge_swap_lot"
  | "crowdfunded_pledge_swap_basket"
  | "crowdfunded_pledge_swap_basket_item"
  | "standing_microfund_pool"
  | "pledge_swap_agreement_adapter";

export type MoralGoodsStateGroup =
  | "draft_review"
  | "funding"
  | "funded_awaiting_acceptance"
  | "accepted_not_active"
  | "active"
  | "evidence_due"
  | "under_review"
  | "settling"
  | "completed"
  | "released_expired_cancelled"
  | "blocked_paused";

export type MoralGoodsFeatureModule =
  | "adjusted_impact_rounds"
  | "crowdfunded_pledge_swap_lots"
  | "crowdfunded_pledge_swap_baskets"
  | "standing_microfund_pools"
  | "participant_donation_recipient_choice"
  | "sponsor_gap_fill"
  | "participant_proposal_intake"
  | "internal_wallet_balance"
  | "charitable_donation_execution"
  | "production_real_money_movement";

export type MoralGoodsCapabilityStatus =
  | "disabled"
  | "dev_only"
  | "private_beta"
  | "limited_public"
  | "enabled"
  | "paused";

export type MoralGoodsFundingSourceType =
  | "ordinary_funder_pledge"
  | "crowdfunded_micro_pledge"
  | "standing_microfund_allocation"
  | "sponsor_matching_pool"
  | "sponsor_gap_fill"
  | "platform_reserve"
  | "dev_simulated_reserve";

export type MoralGoodsConsiderationType =
  | "participant_payout"
  | "charitable_donation"
  | "mixed"
  | "tax_withholding"
  | "provider_fee"
  | "platform_fee"
  | "sponsor_bonus"
  | "release_or_refund";

export type MoralGoodsActivationStatus =
  | "instant_valid"
  | "pending_team"
  | "activated"
  | "expired"
  | "cancelled"
  | "blocked";

export type MoralGoodsParticipantCommitmentStatus =
  | "pending_selection"
  | "invited"
  | "accepted"
  | "active"
  | "withdrawn"
  | "verifying"
  | "verified"
  | "failed"
  | "disputed"
  | "settled"
  | "cancelled"
  | "expired";

export type MoralGoodsReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "requires_changes"
  | "not_required"
  | "dev_waived";

export type MoralGoodsVerificationStandard = "light" | "standard" | "strong";
export type MoralGoodsMoneyVerb = "authorized" | "charged" | "released" | "paid" | "donated";
export type MoralGoodsUserRole = "public" | "funder" | "participant" | "sponsor" | "support";

export interface MoralGoodsMoney {
  amountMinor: number;
  currency: string;
}

export interface MoralGoodsPolicyBundleRef {
  bundleId: string;
  bundleHash: string;
  hashAlgorithm: string;
  canonicalizationVersion: string;
  compatibilityStatus: "passed" | "failed" | "pending" | "waived_dev_only";
  publicExportRef: string;
  privatePolicyRef: string;
  componentHashes: string[];
}

export interface MoralGoodsPurchaseEnvelopeRegistry {
  registryId: string;
  envelopeType: MoralGoodsEnvelopeType;
  envelopeId: string;
  parentEnvelopeId: string | null;
  publicEnvelopeId: string;
  canonicalSnapshotHash: string;
  lifecycleStateGroup: MoralGoodsStateGroup;
  enabledFeatureModules: MoralGoodsFeatureModule[];
  visibilityPolicy: "public_aggregate" | "private_until_reviewed" | "participant_private" | "admin_only";
  projectionReconciliationStatus: "consistent" | "stale" | "mismatch" | "repair_required";
}

export interface MoralGoodsEnvelopeSnapshot {
  actionSummary: string;
  considerationSummary: string;
  failureBehavior: string;
  verificationSummary: string;
  expectedImpactRange: string;
  deadlineSummary: string;
  methodologySummary: string;
  publicLimitations: string[];
  frozenTermsSummary: string;
  publicCopy: {
    primaryLabel: string;
    secondaryLabel: string;
    roleEntryPoints: string[];
  };
  privatePolicyRefs: string[];
  hashPolicy: {
    hashAlgorithm: string;
    canonicalizationVersion: string;
    publicIdentifierPolicy: string;
    rawUnitKeyPolicy: string;
  };
}

export interface MoralGoodsPurchaseEnvelope {
  id: string;
  slug: string;
  title: string;
  envelopeType: MoralGoodsEnvelopeType;
  currency: string;
  stateGroup: MoralGoodsStateGroup;
  statusDetail: string;
  actionSummary: string;
  considerationSummary: string;
  verificationStandard: MoralGoodsVerificationStandard;
  expectedImpactRange: string;
  actionWindow: { startAt: string; endAt: string };
  deadlines: {
    fundingAt: string | null;
    acceptanceAt: string | null;
    evidenceAt: string | null;
    disputeAt: string | null;
    settlementAt: string | null;
  };
  enabledFeatureModules: MoralGoodsFeatureModule[];
  policyBundle: MoralGoodsPolicyBundleRef;
  registry: MoralGoodsPurchaseEnvelopeRegistry;
  snapshot: MoralGoodsEnvelopeSnapshot;
  snapshotCanonicalJson: string;
  snapshotHash: string;
  funding: {
    targetMinor: number;
    authorizedMinor: number;
    committedMinor: number;
    chargedMinor: number;
    releasedMinor: number;
    providerMinimumMinor: number;
    microPledgeDefaultMinor: number | null;
  };
  reserve: {
    participantPayoutReserveMinor: number;
    donationReserveMinor: number;
    reserveStatus: "not_required" | "pending" | "reserved" | "released" | "failed";
  };
  reviews: {
    safety: MoralGoodsReviewStatus;
    methodology: MoralGoodsReviewStatus;
    participantWelfare: MoralGoodsReviewStatus;
    operationalEfficiency: MoralGoodsReviewStatus;
    jurisdiction: "supported" | "unsupported" | "review_required" | "dev_waived";
  };
  publicReport: {
    rawUnits: number;
    adjustedUnitsMilli: number;
    fixedConsiderationEarnedMinor: number;
    participantPayoutTotalMinor: number;
    donationTotalMinor: number;
    ordinaryFunderChargeTotalMinor: number;
    sponsorGapFillUsedMinor: number;
    releasedMinor: number;
    methodologyVersion: string;
    publicSnapshotIdentifier: string;
    smallCellSuppression: string;
    noTradeBaselineSummary: string;
  };
  nextActions: Partial<Record<MoralGoodsUserRole, string>>;
}

export interface MoralGoodsFeatureCapability {
  id: string;
  featureModule: MoralGoodsFeatureModule;
  environment: "development" | "staging" | "production";
  status: MoralGoodsCapabilityStatus;
  riskTier: "dev_simulated" | "private_beta" | "limited_public" | "general_public" | null;
  dependsOn: MoralGoodsFeatureModule[];
  incompatibleWith: MoralGoodsFeatureModule[];
  providerMinimumMinor: number | null;
  maxAuthorizedTotalMinor: number | null;
  complianceReviewRef: string | null;
  rolloutReviewRef: string | null;
  dependencyStatus: "satisfied" | "blocked" | "not_checked" | "waived_dev_only";
  publicReason: string;
}

export interface MoralGoodsFundingSourceCommitment {
  id: string;
  purchaseEnvelopeType: MoralGoodsEnvelopeType;
  purchaseEnvelopeId: string;
  fundingSourceType: MoralGoodsFundingSourceType;
  fundingSourceId: string;
  activationStatus: MoralGoodsActivationStatus;
  status: "pending" | "authorized" | "reserved" | "activated" | "captured" | "released" | "expired" | "failed" | "cancelled" | "blocked";
  amountAuthorizedMinor: number;
  amountReservedMinor: number;
  amountCommittedMinor: number;
  amountChargedMinor: number;
  amountReleasedMinor: number;
  currency: string;
  constraintsHash: string;
  reserveEligibility:
    | "not_reserve_eligible"
    | "participant_payout_reserve_eligible"
    | "charitable_donation_reserve_eligible"
    | "sponsor_gap_fill_reserve_eligible"
    | "dev_only";
  authorizationExpiresAt: string | null;
  idempotencyKey: string;
}

export interface MoralGoodsParticipantActionCommitment {
  id: string;
  purchaseEnvelopeType: MoralGoodsEnvelopeType;
  purchaseEnvelopeId: string;
  participantUserHash: string;
  actionTemplateId: string;
  actionWindowStartAt: string;
  actionWindowEndAt: string;
  activationStatus: MoralGoodsActivationStatus;
  commitmentStatus: MoralGoodsParticipantCommitmentStatus;
  acceptedTermsHash: string | null;
  publicIdentityVisibility: "anonymous" | "pseudonymous_public_id" | "disclosed_opt_in" | "admin_only";
  expectedRawUnits: number;
  expectedAdjustedUnitsMilli: number;
  participantVisibleActionSummary: string;
}

export interface MoralGoodsCreditedActionUnit {
  id: string;
  participantActionCommitmentId: string;
  purchaseEnvelopeType: MoralGoodsEnvelopeType;
  purchaseEnvelopeId: string;
  sourceFeature: "group_buying" | "pledge_swap" | "other_moral_trade";
  participantUserHash: string;
  actionTemplateId: string;
  rawUnitKey: string;
  rawUnitsCredited: number;
  additionalityBps: number;
  verificationConfidenceBps: number;
  moralImpactWeightBps: number;
  persistenceMultiplierBps: number;
  deDuplicationStatus: "pending" | "clear" | "duplicate_blocked" | "de_duplicated" | "credited" | "reversed";
  creditedToSettlementId: string | null;
}

export interface MoralGoodsConsiderationObligation {
  id: string;
  purchaseEnvelopeType: MoralGoodsEnvelopeType;
  purchaseEnvelopeId: string;
  participantActionCommitmentId: string | null;
  considerationType: MoralGoodsConsiderationType;
  beneficiaryType: "participant" | "donation_recipient" | "mixed" | "platform_fee_recipient" | "provider" | "tax_authority" | "other";
  triggerPolicyHash: string;
  reservePolicyHash: string;
  amountPromisedMinor: number;
  amountReservedMinor: number;
  amountEarnedMinor: number;
  amountExecutedMinor: number;
  amountReleasedMinor: number;
  currency: string;
  status: "pending" | "reserved" | "earned" | "partially_earned" | "executed" | "held" | "failed" | "released" | "cancelled" | "reversed";
}

export interface MoralGoodsSettlementLineItem {
  id: string;
  fundingSourceCommitmentId: string;
  fundingSourceType: MoralGoodsFundingSourceType;
  isEligibleForChargeOrUse: boolean;
  ineligibleReason: string | null;
  amountAuthorizedMinor: number;
  amountReservedMinor: number;
  amountChargedOrUsedMinor: number;
  amountReleasedMinor: number;
  fundedConsiderationObligationId: string | null;
  fundedAdjustedUnitsMilli: number;
  currency: string;
  calculationInputHash: string;
  calculationOutputHash: string;
}

export interface MoralGoodsLedgerEntryPreview {
  accountType:
    | "conditional_funder_authorization"
    | "sponsor_gap_fill_reserve"
    | "charitable_donation_payable"
    | "participant_payable"
    | "provider_clearing"
    | "platform_shortfall"
    | "release_liability";
  direction: "debit" | "credit";
  amountMinor: number;
  currency: string;
  memo: string;
}

export interface MoralGoodsSettlementPlan {
  id: string;
  purchaseEnvelopeType: MoralGoodsEnvelopeType;
  purchaseEnvelopeId: string;
  planStatus: "draft" | "computed" | "approved" | "superseded" | "executing" | "executed" | "failed" | "cancelled";
  frozenPolicyBundleHash: string;
  calculationInputHash: string;
  calculationOutputHash: string;
  fundingSourceSetHash: string;
  creditedActionUnitSetHash: string;
  considerationObligationSetHash: string;
  reserveCheckStatus: "passed" | "failed" | "stale" | "not_required";
  recipientFundingCompatibilityStatus: "passed" | "failed" | "stale" | "not_required";
  feeRatioCheckStatus: "passed" | "failed" | "waived_with_review" | "not_required";
  verificationBurdenCheckStatus: "passed" | "failed" | "waived_with_review" | "not_required";
  rawUnitsTotal: number;
  adjustedUnitsTotalMilli: number;
  fixedConsiderationEarnedMinor: number;
  participantPayoutTotalMinor: number;
  ordinaryFunderChargeTotalMinor: number;
  sponsorGapFillUsedMinor: number;
  releaseTotalMinor: number;
  currency: string;
  lineItems: MoralGoodsSettlementLineItem[];
  ledgerEntries: MoralGoodsLedgerEntryPreview[];
  blockers: string[];
}

export interface MoralGoodsDealCardModel {
  envelopeId: string;
  title: string;
  primaryLabel: string;
  secondaryLabel: string;
  rows: {
    action: string;
    consideration: string;
    role: string;
    status: string;
    statusSentence: string;
    nextStep: string;
    failureBehavior: string;
  };
  details: {
    methodology: string;
    verification: string;
    fees: string;
    privacy: string;
    disputes: string;
    donationTaxLimits: string;
    snapshotIdentifier: string;
  };
  copyLint: MoralGoodsCopyLintResult;
}

export type MoralGoodsDiscoveryCategoryKey =
  | "all"
  | "rounds"
  | "lots"
  | "baskets"
  | "budgets"
  | "results";

export interface MoralGoodsDiscoveryCategory {
  count: number;
  description: string;
  href: string;
  key: MoralGoodsDiscoveryCategoryKey;
  label: string;
}

export interface MoralGoodsDiscoveryCardModel {
  categoryKey: MoralGoodsDiscoveryCategoryKey;
  copyLint: MoralGoodsCopyLintResult;
  ctaLabel: string;
  deadlineLabel: string;
  envelopeId: string;
  href: string;
  limitLabel: string;
  priceLabel: string;
  primaryLabel: string;
  progressBps: number;
  progressLabel: string;
  proofTags: string[];
  routeLabel: string;
  safeActionNote: string;
  searchText: string;
  statusLabel: string;
  statusSentence: string;
  targetLabel: string;
  title: string;
}

export interface MoralGoodsDiscoveryCommitmentPreview {
  amountLabel: string;
  ctaHref: string;
  ctaLabel: string;
  envelopeId: string;
  lines: Array<{ label: string; value: string }>;
  noChargeLabel: string;
  title: string;
}

export interface MoralGoodsDiscoverySurface {
  activeCategory: MoralGoodsDiscoveryCategoryKey;
  cards: MoralGoodsDiscoveryCardModel[];
  categories: MoralGoodsDiscoveryCategory[];
  commitmentPreview: MoralGoodsDiscoveryCommitmentPreview;
  filterChips: string[];
  query: string;
  resultCount: number;
}

export const MORAL_GOODS_PUBLIC_REVIEW_CTA_LABEL = "Review route";

export interface MoralGoodsCommitmentCard {
  agreement: string;
  whenMoneyOrActionStarts: string;
  failureOrChange: string;
  deadlinesAndRights: string;
  receipt: string;
}

export interface MoralGoodsCopyLintResult {
  status: "pass" | "fail";
  blockers: string[];
}

export interface MoralGoodsFailureMessageTemplate {
  key: string;
  title: string;
  message: string;
  moneyConsequence: string;
  actionConsequence: string;
  receiptConsequence: string;
}

export interface MoralGoodsThreatFlagResult {
  status: "clear" | "review_required" | "blocked";
  flags: string[];
  participantVisibleReason: string;
}

export interface MoralGoodsReadinessResult {
  status: "pass" | "blocked";
  blockers: string[];
  warnings: string[];
}

export interface MoralGoodsContract {
  version: string;
  purpose: string;
  featureName: "Moral Goods Group Buying";
  discoverySurface: MoralGoodsDiscoverySurface;
  firstClassRecordTables: string[];
  sharedPrimitiveTables: string[];
  envelopeTypes: MoralGoodsEnvelopeType[];
  featureModules: MoralGoodsFeatureModule[];
  userFacingStateLabels: Record<MoralGoodsStateGroup, string>;
  statusSentenceTemplates: Record<MoralGoodsStateGroup, string>;
  failureMessageTemplates: MoralGoodsFailureMessageTemplate[];
  ordinaryUiBannedTerms: string[];
  seedEnvelopeSlugs: string[];
  seedCapabilityModules: MoralGoodsFeatureModule[];
  contractTests: string[];
  sampleSettlementPlan: MoralGoodsSettlementPlan;
  sampleDealCards: MoralGoodsDealCardModel[];
  readinessSamples: MoralGoodsReadinessResult[];
}

export interface MoralGoodsValidation {
  status: "pass" | "fail";
  validatorName: "moral-goods-group-buying-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

export const MORAL_GOODS_STATE_LABELS: Record<MoralGoodsStateGroup, string> = {
  accepted_not_active: "Ready to start soon",
  active: "Action in progress",
  blocked_paused: "Paused",
  completed: "Complete",
  draft_review: "Not open yet",
  evidence_due: "Proof due",
  funded_awaiting_acceptance: "Funded; waiting for participant acceptance",
  funding: "Open for funding",
  released_expired_cancelled: "Released, expired, or cancelled",
  settling: "Settling payment or donation",
  under_review: "Proof under review",
};

export const MORAL_GOODS_STATUS_SENTENCES: Record<MoralGoodsStateGroup, string> = {
  accepted_not_active:
    "The project passed funding and reserve checks. The participant should wait for the start notice.",
  active: "The participant should follow the action instructions now.",
  blocked_paused:
    "This is paused. Safe actions still available: withdrawal, support, dispute, or required release/refund as applicable.",
  completed: "Verified result, money movement, releases, and receipts are available.",
  draft_review: "The round, lot, or basket is still being reviewed.",
  evidence_due: "Proof is due by the listed deadline. Late proof follows the grace and dispute rules.",
  funded_awaiting_acceptance: "Funding is ready. The participant has not been asked to start yet.",
  funding: "You can authorize money now. You are charged only if this clears and settles under the frozen rules.",
  released_expired_cancelled:
    "No new action is required. See what happened to money, obligations, and receipts.",
  settling: "Charges, releases, payouts, and donations are being finalized from the approved settlement.",
  under_review: "Review is not final yet. No payout, donation, or impact claim is final.",
};

export const MORAL_GOODS_FAILURE_MESSAGE_TEMPLATES: MoralGoodsFailureMessageTemplate[] = [
  {
    actionConsequence: "No participant is asked to begin.",
    key: "failed_funding",
    message: "This did not clear before the funding deadline.",
    moneyConsequence: "Authorizations are released or rolled only under the accepted preference.",
    receiptConsequence: "A release receipt shows the funding deadline and release status.",
    title: "Funding did not complete",
  },
  {
    actionConsequence: "Pending team members are not selected or asked to act.",
    key: "expired_team_activation",
    message: "The team window expired before the qualified threshold was met.",
    moneyConsequence: "Pending authorizations are released idempotently.",
    receiptConsequence: "Team receipts show pending, expired, and release timestamps.",
    title: "Team window expired",
  },
  {
    actionConsequence: "The frozen replacement or cancellation policy applies.",
    key: "participant_decline",
    message: "Funding was ready, but the invited participant did not accept in time.",
    moneyConsequence: "Funds are held, rerouted, or released only under the frozen terms.",
    receiptConsequence: "Receipts avoid private reasons for decline.",
    title: "Participant did not accept",
  },
  {
    actionConsequence: "Waitlisted people are not instructed to perform the action unpaid.",
    key: "waitlist_control_assignment",
    message: "This applicant was not selected for the paid action.",
    moneyConsequence: "No payout or donation is owed from this assignment.",
    receiptConsequence: "The participant-visible decision time starts any appeal window.",
    title: "Not selected this time",
  },
  {
    actionConsequence: "Verified partial units may still count if the frozen template allows it.",
    key: "participant_withdrawal",
    message: "The participant withdrew or stopped before final verification.",
    moneyConsequence: "Payment or donation follows verified units and the withdrawal policy.",
    receiptConsequence: "The withdrawal receipt states what remains open.",
    title: "Participant withdrew",
  },
  {
    actionConsequence: "The action is not counted as verified unless an appeal changes the decision.",
    key: "verification_failure",
    message: "The submitted proof did not meet the frozen verification standard.",
    moneyConsequence: "Unverified consideration is released or held under the dispute policy.",
    receiptConsequence: "The decision receipt includes a non-sensitive reason and dispute deadline.",
    title: "Proof was not verified",
  },
  {
    actionConsequence: "Late proof follows the grace, dispute, or support path.",
    key: "late_proof",
    message: "Proof was submitted after the listed deadline.",
    moneyConsequence: "Money movement waits for the frozen late-proof decision.",
    receiptConsequence: "The late-proof receipt shows the visible decision timestamp.",
    title: "Proof was late",
  },
  {
    actionConsequence: "No new participant action starts from an expired authorization.",
    key: "payment_reauthorization",
    message: "A payment authorization expired before it could be counted.",
    moneyConsequence: "The funder may reauthorize or the amount is excluded and released.",
    receiptConsequence: "The receipt distinguishes expired, reauthorized, charged, and released money.",
    title: "Authorization needs refresh",
  },
  {
    actionConsequence: "The participant uses the fallback only if accepted before action begins.",
    key: "donation_recipient_fallback",
    message: "The selected charity is no longer available before the action starts.",
    moneyConsequence: "Funding outside accepted recipient constraints is excluded or released.",
    receiptConsequence: "The choice receipt records the frozen fallback.",
    title: "Charity choice changed before start",
  },
  {
    actionConsequence: "A verified action is not erased by a provider donation failure.",
    key: "donation_failure_after_verification",
    message: "The action was verified, but the donation operation needs retry or support review.",
    moneyConsequence: "The donation remains a ledger-visible obligation under the shortfall policy.",
    receiptConsequence: "Receipts show owed, attempted, retry, held, or executed states.",
    title: "Donation needs support",
  },
  {
    actionConsequence: "No extra private details are required just to see the hold reason.",
    key: "payout_hold",
    message: "The payout is held for the listed compliance, risk, dispute, or destination reason.",
    moneyConsequence: "Validly owed payout is not converted into platform revenue.",
    receiptConsequence: "The payout receipt shows retry, expiry, and support deadlines.",
    title: "Payout is on hold",
  },
  {
    actionConsequence: "Safe withdrawal, support, dispute, and required release/refund flows remain open.",
    key: "operational_pause",
    message: "This is paused while operations resolves a safety, privacy, payment, or review issue.",
    moneyConsequence: "New money movement is blocked unless required by the pause policy.",
    receiptConsequence: "Pause and unpause actions are audit-visible.",
    title: "Temporarily paused",
  },
  {
    actionConsequence: "No extra action is required unless the dashboard says so.",
    key: "settlement_delay",
    message: "Settlement is delayed while line items, ledger, provider, or dispute checks finish.",
    moneyConsequence: "Charges, releases, payouts, and donations wait for the approved plan.",
    receiptConsequence: "Receipts update when the approved plan executes or is superseded.",
    title: "Settlement is delayed",
  },
  {
    actionConsequence: "The user can still see their own receipt when allowed.",
    key: "public_report_suppression",
    message: "Some public results are aggregated, delayed, or omitted to protect privacy.",
    moneyConsequence: "Suppression does not change valid charges, releases, payouts, or donations.",
    receiptConsequence: "Public reports show the suppression method instead of private details.",
    title: "Some public details are hidden",
  },
];

export const ORDINARY_UI_BANNED_TERMS = [
  "purchase envelope",
  "consideration obligation",
  "funding-source commitment",
  "policy bundle",
  "raw-unit key",
  "HMAC",
  "settlement plan",
  "activation effect",
  "lifecycle state",
  "projection repair",
  "canonical hash",
  "ledger account type",
];

export const GROUP_BUYING_FIRST_CLASS_TABLES = [
  "moral_goods_group_buy_rounds",
  "moral_goods_action_templates",
  "moral_goods_frozen_policy_components",
  "moral_goods_frozen_policy_bundles",
  "moral_goods_purchase_envelope_registry",
  "moral_goods_funding_source_commitments",
  "moral_goods_participant_action_commitments",
  "moral_goods_settlement_plans",
  "moral_goods_crowdfunded_pledge_swap_lots",
  "moral_goods_crowdfunded_pledge_swap_micro_pledges",
  "moral_goods_donation_recipients",
  "moral_goods_pledge_swap_donation_operations",
  "moral_goods_consideration_obligations",
  "moral_goods_crowdfunded_pledge_swap_baskets",
  "moral_goods_crowdfunded_pledge_swap_basket_items",
  "moral_goods_standing_microfund_pools",
  "moral_goods_standing_microfund_allocations",
  "moral_goods_participant_donation_recipient_choices",
  "moral_goods_sponsor_gap_fill_commitments",
  "moral_goods_participant_pledge_swap_proposals",
  "moral_goods_team_activation_groups",
  "moral_goods_team_activation_members",
  "moral_goods_team_activation_invites",
  "moral_goods_credited_action_units",
  "moral_goods_funding_settlement_line_items",
  "moral_goods_domain_event_outbox",
  "moral_goods_user_receipts",
] as const;

export const GROUP_BUYING_SHARED_PRIMITIVE_TABLES = [
  "moral_goods_purchase_envelope_registry",
  "moral_goods_funding_source_commitments",
  "moral_goods_participant_action_commitments",
  "moral_goods_consideration_obligations",
  "moral_goods_credited_action_units",
  "moral_goods_settlement_plans",
  "moral_goods_funding_settlement_line_items",
  "moral_goods_domain_event_outbox",
] as const;

export const GROUP_BUYING_CONTRACT_TESTS = [
  "group_buying_contract_validator",
  "group_buying_deal_card_presenter",
  "group_buying_progressive_disclosure_copy_lint",
  "group_buying_adjusted_units_integer_formula",
  "group_buying_settlement_plan_hash_integrity",
  "group_buying_feature_capability_gate",
  "group_buying_anti_threat_flagging",
  "group_buying_public_route_contract",
  "group_buying_schema_migration_contract",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashJson(value: unknown, algorithm = DEFAULT_HASH_ALGORITHM) {
  return `${algorithm}:${createHash(algorithm).update(stableStringify(value)).digest("hex")}`;
}

export function deriveRawUnitKey(input: {
  actionTemplateId: string;
  actionWindowEndAt: string;
  actionWindowStartAt: string;
  participantUserHash: string;
  privateDerivationKey: string;
}) {
  const message = stableStringify({
    actionTemplateId: input.actionTemplateId,
    actionWindowEndAt: input.actionWindowEndAt,
    actionWindowStartAt: input.actionWindowStartAt,
    participantUserHash: input.participantUserHash,
  });

  return `hmac-sha256:${createHmac("sha256", input.privateDerivationKey).update(message).digest("hex")}`;
}

export function publicIdentifierFromHash(hash: string) {
  return `mg-${createHash("sha256").update(hash).digest("hex").slice(0, 16)}`;
}

export function formatMinorMoney(money: MoralGoodsMoney) {
  const sign = money.amountMinor < 0 ? "-" : "";
  const absolute = Math.abs(money.amountMinor);
  const whole = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, "0");

  return `${sign}$${whole.toLocaleString("en-US")}.${cents} ${money.currency}`;
}

function assertInteger(value: number, label: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
}

export function calculateAdjustedImpactMilliUnits(input: {
  additionalityBps: number;
  moralImpactWeightBps: number;
  persistenceMultiplierBps: number;
  rawUnits: number;
  verificationConfidenceBps: number;
}) {
  assertInteger(input.rawUnits, "rawUnits");
  assertInteger(input.additionalityBps, "additionalityBps");
  assertInteger(input.verificationConfidenceBps, "verificationConfidenceBps");
  assertInteger(input.moralImpactWeightBps, "moralImpactWeightBps");
  assertInteger(input.persistenceMultiplierBps, "persistenceMultiplierBps");

  const numerator =
    BigInt(input.rawUnits) *
    MILLI_UNIT_SCALE *
    BigInt(input.additionalityBps) *
    BigInt(input.verificationConfidenceBps) *
    BigInt(input.moralImpactWeightBps) *
    BigInt(input.persistenceMultiplierBps);
  const denominator = BPS_DENOMINATOR ** BigInt(4);

  return Number((numerator + denominator / BigInt(2)) / denominator);
}

export function calculateParticipantPayoutMinor(input: {
  adjustedUnitsMilli: number;
  participantPayoutCapMinor: number;
  unitPriceMinor: number;
}) {
  assertInteger(input.adjustedUnitsMilli, "adjustedUnitsMilli");
  assertInteger(input.participantPayoutCapMinor, "participantPayoutCapMinor");
  assertInteger(input.unitPriceMinor, "unitPriceMinor");

  const payout =
    (BigInt(input.adjustedUnitsMilli) * BigInt(input.unitPriceMinor) + MILLI_UNIT_SCALE / BigInt(2)) /
    MILLI_UNIT_SCALE;

  return Math.min(input.participantPayoutCapMinor, Number(payout));
}

function freezeSnapshot(snapshot: MoralGoodsEnvelopeSnapshot) {
  const canonicalJson = stableStringify(snapshot);
  const snapshotHash = hashJson(snapshot);

  return {
    canonicalJson,
    snapshotHash,
  };
}

function buildPolicyBundleRef(seed: string): MoralGoodsPolicyBundleRef {
  const componentHashes = [
    hashJson({ component: "lifecycle", seed }),
    hashJson({ component: "settlement", seed }),
    hashJson({ component: "privacy-redaction", seed }),
    hashJson({ component: "allocation-rationing", seed }),
    hashJson({ component: "public-progress-suppression", seed }),
  ];
  const bundleHash = hashJson({ componentHashes, seed });

  return {
    bundleHash,
    bundleId: `policy-bundle:${seed}`,
    canonicalizationVersion: DEFAULT_CANONICALIZATION_VERSION,
    compatibilityStatus: "passed",
    componentHashes,
    hashAlgorithm: DEFAULT_HASH_ALGORITHM,
    privatePolicyRef: `private-policy:${seed}`,
    publicExportRef: `public-policy:${seed}`,
  };
}

function buildEnvelope(input: Omit<MoralGoodsPurchaseEnvelope, "registry" | "snapshotCanonicalJson" | "snapshotHash">) {
  const frozen = freezeSnapshot(input.snapshot);
  const registry: MoralGoodsPurchaseEnvelopeRegistry = {
    canonicalSnapshotHash: frozen.snapshotHash,
    enabledFeatureModules: input.enabledFeatureModules,
    envelopeId: input.id,
    envelopeType: input.envelopeType,
    lifecycleStateGroup: input.stateGroup,
    parentEnvelopeId: null,
    projectionReconciliationStatus: "consistent",
    publicEnvelopeId: publicIdentifierFromHash(frozen.snapshotHash),
    registryId: `registry:${input.id}`,
    visibilityPolicy:
      input.envelopeType === "crowdfunded_pledge_swap_lot"
        ? "public_aggregate"
        : input.envelopeType === "standing_microfund_pool"
          ? "participant_private"
          : "public_aggregate",
  };

  return {
    ...input,
    registry,
    snapshotCanonicalJson: frozen.canonicalJson,
    snapshotHash: frozen.snapshotHash,
  } satisfies MoralGoodsPurchaseEnvelope;
}

export const MORAL_GOODS_FEATURE_CAPABILITIES: MoralGoodsFeatureCapability[] = [
  {
    complianceReviewRef: "review:dev-simulated-adjusted-impact",
    dependencyStatus: "satisfied",
    dependsOn: [],
    environment: "development",
    featureModule: "adjusted_impact_rounds",
    id: "capability:adjusted-impact-rounds",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: 10_000_00,
    providerMinimumMinor: 100,
    publicReason: "Simulated adjusted-impact rounds are enabled for development and route testing.",
    riskTier: "dev_simulated",
    rolloutReviewRef: "rollout:stage-1",
    status: "enabled",
  },
  {
    complianceReviewRef: "review:dev-simulated-lots",
    dependencyStatus: "satisfied",
    dependsOn: ["charitable_donation_execution"],
    environment: "development",
    featureModule: "crowdfunded_pledge_swap_lots",
    id: "capability:crowdfunded-lots",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: 5_000_00,
    providerMinimumMinor: 50,
    publicReason: "Crowdfunded lots are enabled only with simulated provider-minimum support.",
    riskTier: "dev_simulated",
    rolloutReviewRef: "rollout:stage-3",
    status: "enabled",
  },
  {
    complianceReviewRef: "review:dev-simulated-baskets",
    dependencyStatus: "satisfied",
    dependsOn: ["crowdfunded_pledge_swap_lots", "charitable_donation_execution"],
    environment: "development",
    featureModule: "crowdfunded_pledge_swap_baskets",
    id: "capability:crowdfunded-baskets",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: 10_000_00,
    providerMinimumMinor: 50,
    publicReason: "Baskets are enabled in development and preferred for low-value pledge-swap funding.",
    riskTier: "dev_simulated",
    rolloutReviewRef: "rollout:stage-4",
    status: "enabled",
  },
  {
    complianceReviewRef: "review:standing-pools-private-beta",
    dependencyStatus: "satisfied",
    dependsOn: ["crowdfunded_pledge_swap_lots", "crowdfunded_pledge_swap_baskets"],
    environment: "development",
    featureModule: "standing_microfund_pools",
    id: "capability:standing-microfund-pools",
    incompatibleWith: ["internal_wallet_balance"],
    maxAuthorizedTotalMinor: 500_00,
    providerMinimumMinor: 50,
    publicReason: "Standing budgets are constrained allocation preferences, not stored balances.",
    riskTier: "private_beta",
    rolloutReviewRef: "rollout:stage-5",
    status: "private_beta",
  },
  {
    complianceReviewRef: "review:recipient-choice-dev",
    dependencyStatus: "satisfied",
    dependsOn: ["charitable_donation_execution"],
    environment: "development",
    featureModule: "participant_donation_recipient_choice",
    id: "capability:participant-recipient-choice",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: null,
    providerMinimumMinor: null,
    publicReason: "Participants may choose only from frozen approved donation-recipient lists.",
    riskTier: "dev_simulated",
    rolloutReviewRef: "rollout:recipient-choice",
    status: "enabled",
  },
  {
    complianceReviewRef: "review:sponsor-gap-fill-dev",
    dependencyStatus: "satisfied",
    dependsOn: ["crowdfunded_pledge_swap_lots"],
    environment: "development",
    featureModule: "sponsor_gap_fill",
    id: "capability:sponsor-gap-fill",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: 2_000_00,
    providerMinimumMinor: 100,
    publicReason: "Sponsor gap-fill is reserve-backed and reported as funding, not separate impact.",
    riskTier: "dev_simulated",
    rolloutReviewRef: "rollout:sponsor-gap-fill",
    status: "enabled",
  },
  {
    complianceReviewRef: "review:proposal-intake-dev",
    dependencyStatus: "satisfied",
    dependsOn: [],
    environment: "development",
    featureModule: "participant_proposal_intake",
    id: "capability:participant-proposal-intake",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: null,
    providerMinimumMinor: null,
    publicReason: "Participant proposals stay private until reviewed and standardized.",
    riskTier: "private_beta",
    rolloutReviewRef: "rollout:proposal-intake",
    status: "private_beta",
  },
  {
    complianceReviewRef: "review:wallet-disabled-production",
    dependencyStatus: "blocked",
    dependsOn: [],
    environment: "production",
    featureModule: "internal_wallet_balance",
    id: "capability:internal-wallet-balance",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: null,
    providerMinimumMinor: null,
    publicReason: "Stored-balance support is disabled until legal, custody, and unclaimed-property review passes.",
    riskTier: null,
    rolloutReviewRef: "rollout:stage-6-blocked",
    status: "disabled",
  },
  {
    complianceReviewRef: "review:simulated-donation-execution",
    dependencyStatus: "satisfied",
    dependsOn: [],
    environment: "development",
    featureModule: "charitable_donation_execution",
    id: "capability:charitable-donation-execution",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: 5_000_00,
    providerMinimumMinor: 50,
    publicReason: "Donation operations are simulated in development and do not promise tax receipts to micro-funders.",
    riskTier: "dev_simulated",
    rolloutReviewRef: "rollout:donation-dev",
    status: "dev_only",
  },
  {
    complianceReviewRef: null,
    dependencyStatus: "blocked",
    dependsOn: ["charitable_donation_execution"],
    environment: "production",
    featureModule: "production_real_money_movement",
    id: "capability:production-real-money",
    incompatibleWith: [],
    maxAuthorizedTotalMinor: 0,
    providerMinimumMinor: null,
    publicReason: "Production real-money movement is disabled until payment, webhook, compliance, support, and dispute gates pass.",
    riskTier: null,
    rolloutReviewRef: "rollout:production-blocked",
    status: "disabled",
  },
];

const vegetarianSnapshot: MoralGoodsEnvelopeSnapshot = {
  actionSummary: "Selected adult participants avoid meat/fish during the frozen action window.",
  considerationSummary: "Up to $60 participant payout based on verified adjusted units.",
  deadlineSummary: "Funding, evidence, dispute, settlement, and payout deadlines are UTC instants with local display copy.",
  expectedImpactRange: "1,500 to 2,100 adjusted impact units under this protocol",
  failureBehavior: "If it does not clear, unused authorizations are released or rolled only under accepted preferences.",
  frozenTermsSummary:
    "Payouts depend on each participant's verified adjusted units, not later group completion.",
  hashPolicy: {
    canonicalizationVersion: DEFAULT_CANONICALIZATION_VERSION,
    hashAlgorithm: DEFAULT_HASH_ALGORITHM,
    publicIdentifierPolicy: "Expose only public-safe snapshot identifiers.",
    rawUnitKeyPolicy: "Use keyed hashes so raw participant/action/window data is not public.",
  },
  methodologySummary:
    "We estimate verified impact from completed avoided meat/fish meals, additionality, verification confidence, moral impact weight, persistence, and material substitution limits.",
  privatePolicyRefs: ["private-policy:vegetarian-round:anti-gaming", "private-policy:vegetarian-round:risk"],
  publicCopy: {
    primaryLabel: "Fund many verified actions",
    roleEntryPoints: ["Fund verified actions", "Apply to participate", "View results"],
    secondaryLabel: "Sponsored diet-shift round",
  },
  publicLimitations: [
    "Adjusted impact units are protocol-relative, not a claim of universal moral truth.",
    "Funding this does not offset or permit the funder's own behavior.",
    "Private anti-gaming thresholds and evidence are not public.",
  ],
  verificationSummary:
    "Check-ins, final declaration, optional receipts/photos, reviewer decision, and privacy-preserving evidence retention.",
};

const lotSnapshot: MoralGoodsEnvelopeSnapshot = {
  actionSummary: "One adult participant avoids meat/fish for 2 days.",
  considerationSummary: "$50 donation to a charity the participant chose from the approved list.",
  deadlineSummary: "The participant starts only after funding, acceptance, reserve, and recipient checks pass.",
  expectedImpactRange: "4 to 8 adjusted impact units under this protocol",
  failureBehavior: "If it does not fully fund or the participant declines, authorizations are released unless rollover was accepted.",
  frozenTermsSummary:
    "The verified 2-day obligation earns the fixed donation; adjusted units are reported separately.",
  hashPolicy: {
    canonicalizationVersion: DEFAULT_CANONICALIZATION_VERSION,
    hashAlgorithm: DEFAULT_HASH_ALGORITHM,
    publicIdentifierPolicy: "Expose a public-safe lot snapshot id, not raw evidence hashes.",
    rawUnitKeyPolicy: "Use HMAC-derived raw-unit keys for de-duplication across pledge swaps and group buying.",
  },
  methodologySummary:
    "The lot uses a fixed donation consideration if the frozen action obligation verifies; impact units are separately reported with uncertainty.",
  privatePolicyRefs: ["private-policy:two-day-lot:recipient-risk", "private-policy:two-day-lot:participant"],
  publicCopy: {
    primaryLabel: "Fund one verified action",
    roleEntryPoints: ["Fund this", "Apply if invited", "View results"],
    secondaryLabel: "pledge-swap lot",
  },
  publicLimitations: [
    "Micro-funders do not receive personal tax receipts in the simulated demo.",
    "Participant identity, baseline, evidence, and charity-choice rationale stay private by default.",
  ],
  verificationSummary:
    "Light verification with final declaration and optional supporting proof; stronger review can be required by risk policy.",
};

const basketSnapshot: MoralGoodsEnvelopeSnapshot = {
  actionSummary: "Five selected adults each avoid meat/fish for 2 days.",
  considerationSummary: "$50 donation per verified participant, $250 total simulated donation target.",
  deadlineSummary: "Funding, participant recipient choice, replacement, evidence, dispute, and donation timing are frozen.",
  expectedImpactRange: "20 to 40 adjusted impact units under this protocol",
  failureBehavior:
    "If fewer items verify, each item follows its frozen replacement, release, donation, or cancellation rule.",
  frozenTermsSummary:
    "Each item earns fixed consideration independently; the basket reports aggregate outcomes.",
  hashPolicy: {
    canonicalizationVersion: DEFAULT_CANONICALIZATION_VERSION,
    hashAlgorithm: DEFAULT_HASH_ALGORITHM,
    publicIdentifierPolicy: "Expose aggregate public snapshot identifiers.",
    rawUnitKeyPolicy: "Use keyed item-level de-duplication across pledge swaps, lots, and basket items.",
  },
  methodologySummary:
    "Baskets reduce payment, verification, support, and privacy overhead while preserving per-item settlement.",
  privatePolicyRefs: ["private-policy:five-lot-basket:replacement", "private-policy:five-lot-basket:recipient"],
  publicCopy: {
    primaryLabel: "Fund several similar actions",
    roleEntryPoints: ["Fund this basket", "Choose charity if selected", "View results"],
    secondaryLabel: "basket",
  },
  publicLimitations: [
    "Participant-level outcomes and charity rationales are suppressed unless a reviewed policy allows disclosure.",
    "Sponsor gap-fill is reported as funding source, not duplicate impact.",
  ],
  verificationSummary:
    "Itemized verification per participant, aggregate reporting, and replacement only before action starts.",
};

const standingPoolSnapshot: MoralGoodsEnvelopeSnapshot = {
  actionSummary: "Allocate a small monthly budget to verified animal-welfare pledge swaps.",
  considerationSummary: "Up to $0.50 per eligible lot or basket item under the funder's frozen rules.",
  deadlineSummary: "Allocations lock only after the selected review mode and notice window.",
  expectedImpactRange: "Only settled lots and baskets generate adjusted-unit claims",
  failureBehavior: "Unused or incompatible budget is released or left unallocated under the accepted preference.",
  frozenTermsSummary: "This is a constrained authorization preference, not a stored wallet balance.",
  hashPolicy: {
    canonicalizationVersion: DEFAULT_CANONICALIZATION_VERSION,
    hashAlgorithm: DEFAULT_HASH_ALGORITHM,
    publicIdentifierPolicy: "Standing-pool public reporting is aggregate only.",
    rawUnitKeyPolicy: "Standing pools do not create raw action units by themselves.",
  },
  methodologySummary:
    "Allocations can route to near-clearing lots or baskets only within cause, cap, recipient, verification, and review-mode constraints.",
  privatePolicyRefs: ["private-policy:standing-pool:allocation"],
  publicCopy: {
    primaryLabel: "Set a small recurring budget",
    roleEntryPoints: ["Set a small recurring budget", "Review allocation", "Pause budget"],
    secondaryLabel: "standing budget",
  },
  publicLimitations: [
    "No allocation outside the frozen user constraints.",
    "No production stored balance is enabled.",
  ],
  verificationSummary:
    "The budget itself is not verified action; each funded lot or basket item carries its own verification.",
};

export const MORAL_GOODS_SEED_ENVELOPES: MoralGoodsPurchaseEnvelope[] = [
  buildEnvelope({
    actionSummary: vegetarianSnapshot.actionSummary,
    actionWindow: {
      endAt: "2026-08-30T04:00:00.000Z",
      startAt: "2026-08-01T04:00:00.000Z",
    },
    considerationSummary: vegetarianSnapshot.considerationSummary,
    currency: "USD",
    deadlines: {
      acceptanceAt: "2026-07-22T16:00:00.000Z",
      disputeAt: "2026-09-08T16:00:00.000Z",
      evidenceAt: "2026-09-02T16:00:00.000Z",
      fundingAt: "2026-07-20T16:00:00.000Z",
      settlementAt: "2026-09-12T16:00:00.000Z",
    },
    enabledFeatureModules: ["adjusted_impact_rounds", "sponsor_gap_fill"],
    envelopeType: "group_buy_round",
    expectedImpactRange: vegetarianSnapshot.expectedImpactRange,
    funding: {
      authorizedMinor: 2_250_00,
      chargedMinor: 0,
      committedMinor: 2_000_00,
      microPledgeDefaultMinor: null,
      providerMinimumMinor: 100,
      releasedMinor: 0,
      targetMinor: 2_000_00,
    },
    id: "round:vegetarian-30-day",
    nextActions: {
      funder: "Review authorization",
      participant: "Submit proof",
      public: "View results",
      sponsor: "Review match",
      support: "Inspect receipts",
    },
    policyBundle: buildPolicyBundleRef("vegetarian-30-day"),
    publicReport: {
      adjustedUnitsMilli: 1_746_000,
      donationTotalMinor: 0,
      fixedConsiderationEarnedMinor: 0,
      methodologyVersion: "vegetarian-diet-shift-v1",
      noTradeBaselineSummary:
        "Additionality is estimated against pre-campaign baseline meals and waitlist/control follow-up.",
      ordinaryFunderChargeTotalMinor: 1_830_00,
      participantPayoutTotalMinor: 1_100_00,
      publicSnapshotIdentifier: "mg-round-veggie-2026",
      rawUnits: 2_240,
      releasedMinor: 420_00,
      smallCellSuppression: "Counts below five are suppressed or bucketed.",
      sponsorGapFillUsedMinor: 730_00,
    },
    reserve: {
      donationReserveMinor: 0,
      participantPayoutReserveMinor: 1_800_00,
      reserveStatus: "reserved",
    },
    reviews: {
      jurisdiction: "dev_waived",
      methodology: "approved",
      operationalEfficiency: "approved",
      participantWelfare: "approved",
      safety: "approved",
    },
    slug: "sponsored-30-day-vegetarian-diet-shift-round",
    snapshot: vegetarianSnapshot,
    stateGroup: "evidence_due",
    statusDetail: "verifying",
    title: "Sponsored 30-Day Vegetarian Diet-Shift Round",
    verificationStandard: "standard",
  }),
  buildEnvelope({
    actionSummary: lotSnapshot.actionSummary,
    actionWindow: {
      endAt: "2026-07-25T04:00:00.000Z",
      startAt: "2026-07-23T04:00:00.000Z",
    },
    considerationSummary: lotSnapshot.considerationSummary,
    currency: "USD",
    deadlines: {
      acceptanceAt: "2026-07-21T16:00:00.000Z",
      disputeAt: "2026-07-29T16:00:00.000Z",
      evidenceAt: "2026-07-26T16:00:00.000Z",
      fundingAt: "2026-07-20T16:00:00.000Z",
      settlementAt: "2026-07-31T16:00:00.000Z",
    },
    enabledFeatureModules: [
      "crowdfunded_pledge_swap_lots",
      "participant_donation_recipient_choice",
      "charitable_donation_execution",
    ],
    envelopeType: "crowdfunded_pledge_swap_lot",
    expectedImpactRange: lotSnapshot.expectedImpactRange,
    funding: {
      authorizedMinor: 50_00,
      chargedMinor: 0,
      committedMinor: 50_00,
      microPledgeDefaultMinor: 50,
      providerMinimumMinor: 50,
      releasedMinor: 0,
      targetMinor: 50_00,
    },
    id: "lot:no-meat-2-day-50",
    nextActions: {
      funder: "Fund this",
      participant: "Choose charity",
      public: "Fund this",
      sponsor: "Sponsor remaining funding",
      support: "Review donation reserve",
    },
    policyBundle: buildPolicyBundleRef("no-meat-2-day-lot"),
    publicReport: {
      adjustedUnitsMilli: 6_450,
      donationTotalMinor: 50_00,
      fixedConsiderationEarnedMinor: 50_00,
      methodologyVersion: "two-day-no-meat-fixed-consideration-v1",
      noTradeBaselineSummary:
        "The fixed donation is consideration; adjusted units are reported separately and do not set the $50 amount.",
      ordinaryFunderChargeTotalMinor: 50_00,
      participantPayoutTotalMinor: 0,
      publicSnapshotIdentifier: "mg-lot-no-meat-50",
      rawUnits: 8,
      releasedMinor: 0,
      smallCellSuppression: "Single-participant public progress is delayed and aggregate-only.",
      sponsorGapFillUsedMinor: 0,
    },
    reserve: {
      donationReserveMinor: 50_00,
      participantPayoutReserveMinor: 0,
      reserveStatus: "reserved",
    },
    reviews: {
      jurisdiction: "dev_waived",
      methodology: "approved",
      operationalEfficiency: "approved",
      participantWelfare: "approved",
      safety: "approved",
    },
    slug: "crowdfunded-50-2-day-no-meat-pledge-swap-lot",
    snapshot: lotSnapshot,
    stateGroup: "funding",
    statusDetail: "funding",
    title: "Crowdfunded $50 / 2-Day No-Meat Pledge-Swap Lot",
    verificationStandard: "light",
  }),
  buildEnvelope({
    actionSummary: basketSnapshot.actionSummary,
    actionWindow: {
      endAt: "2026-08-08T04:00:00.000Z",
      startAt: "2026-08-06T04:00:00.000Z",
    },
    considerationSummary: basketSnapshot.considerationSummary,
    currency: "USD",
    deadlines: {
      acceptanceAt: "2026-08-03T16:00:00.000Z",
      disputeAt: "2026-08-14T16:00:00.000Z",
      evidenceAt: "2026-08-10T16:00:00.000Z",
      fundingAt: "2026-08-01T16:00:00.000Z",
      settlementAt: "2026-08-18T16:00:00.000Z",
    },
    enabledFeatureModules: [
      "crowdfunded_pledge_swap_baskets",
      "standing_microfund_pools",
      "participant_donation_recipient_choice",
      "sponsor_gap_fill",
      "charitable_donation_execution",
    ],
    envelopeType: "crowdfunded_pledge_swap_basket",
    expectedImpactRange: basketSnapshot.expectedImpactRange,
    funding: {
      authorizedMinor: 250_00,
      chargedMinor: 0,
      committedMinor: 250_00,
      microPledgeDefaultMinor: 50,
      providerMinimumMinor: 50,
      releasedMinor: 0,
      targetMinor: 250_00,
    },
    id: "basket:no-meat-5x50",
    nextActions: {
      funder: "Review allocation",
      participant: "Wait for selection",
      public: "Fund this basket",
      sponsor: "Sponsor remaining funding",
      support: "Inspect item settlement",
    },
    policyBundle: buildPolicyBundleRef("five-lot-no-meat-basket"),
    publicReport: {
      adjustedUnitsMilli: 31_100,
      donationTotalMinor: 250_00,
      fixedConsiderationEarnedMinor: 250_00,
      methodologyVersion: "two-day-no-meat-basket-v1",
      noTradeBaselineSummary:
        "Each verified item reports adjusted units separately from fixed donation consideration.",
      ordinaryFunderChargeTotalMinor: 200_00,
      participantPayoutTotalMinor: 0,
      publicSnapshotIdentifier: "mg-basket-no-meat-5",
      rawUnits: 39,
      releasedMinor: 0,
      smallCellSuppression: "Item-level public status is aggregated until settlement.",
      sponsorGapFillUsedMinor: 50_00,
    },
    reserve: {
      donationReserveMinor: 250_00,
      participantPayoutReserveMinor: 0,
      reserveStatus: "reserved",
    },
    reviews: {
      jurisdiction: "dev_waived",
      methodology: "approved",
      operationalEfficiency: "approved",
      participantWelfare: "approved",
      safety: "approved",
    },
    slug: "crowdfunded-basket-five-50-2-day-no-meat-pledge-swaps",
    snapshot: basketSnapshot,
    stateGroup: "funded_awaiting_acceptance",
    statusDetail: "participant_acceptance",
    title: "Crowdfunded Basket of Five $50 / 2-Day No-Meat Pledge Swaps",
    verificationStandard: "light",
  }),
  buildEnvelope({
    actionSummary: standingPoolSnapshot.actionSummary,
    actionWindow: {
      endAt: "2026-08-31T04:00:00.000Z",
      startAt: "2026-08-01T04:00:00.000Z",
    },
    considerationSummary: standingPoolSnapshot.considerationSummary,
    currency: "USD",
    deadlines: {
      acceptanceAt: null,
      disputeAt: null,
      evidenceAt: null,
      fundingAt: "2026-08-31T16:00:00.000Z",
      settlementAt: null,
    },
    enabledFeatureModules: ["standing_microfund_pools"],
    envelopeType: "standing_microfund_pool",
    expectedImpactRange: standingPoolSnapshot.expectedImpactRange,
    funding: {
      authorizedMinor: 5_00,
      chargedMinor: 0,
      committedMinor: 1_00,
      microPledgeDefaultMinor: 50,
      providerMinimumMinor: 50,
      releasedMinor: 0,
      targetMinor: 5_00,
    },
    id: "standing-pool:animal-welfare-5-month",
    nextActions: {
      funder: "Review allocation",
      participant: "No action needed",
      public: "Set a small recurring budget",
      sponsor: "No action needed",
      support: "Inspect allocation receipt",
    },
    policyBundle: buildPolicyBundleRef("animal-welfare-standing-pool"),
    publicReport: {
      adjustedUnitsMilli: 0,
      donationTotalMinor: 0,
      fixedConsiderationEarnedMinor: 0,
      methodologyVersion: "standing-pool-allocation-v1",
      noTradeBaselineSummary: "The pool itself has no impact claim; only settled allocations do.",
      ordinaryFunderChargeTotalMinor: 0,
      participantPayoutTotalMinor: 0,
      publicSnapshotIdentifier: "mg-pool-animal-welfare",
      rawUnits: 0,
      releasedMinor: 0,
      smallCellSuppression: "Funder budget details are private unless the funder opts in.",
      sponsorGapFillUsedMinor: 0,
    },
    reserve: {
      donationReserveMinor: 0,
      participantPayoutReserveMinor: 0,
      reserveStatus: "not_required",
    },
    reviews: {
      jurisdiction: "dev_waived",
      methodology: "not_required",
      operationalEfficiency: "approved",
      participantWelfare: "not_required",
      safety: "approved",
    },
    slug: "standing-microfund-animal-welfare-5-month",
    snapshot: standingPoolSnapshot,
    stateGroup: "funding",
    statusDetail: "active_budget",
    title: "Set a small recurring budget for verified animal-welfare pledge swaps",
    verificationStandard: "light",
  }),
];

export const MORAL_GOODS_SEED_FUNDING_SOURCES: MoralGoodsFundingSourceCommitment[] = [
  {
    activationStatus: "instant_valid",
    amountAuthorizedMinor: 1_000,
    amountChargedMinor: 0,
    amountCommittedMinor: 1_000,
    amountReleasedMinor: 0,
    amountReservedMinor: 1_000,
    authorizationExpiresAt: "2026-09-01T00:00:00.000Z",
    constraintsHash: hashJson({ cause: "animal_welfare", maxCostPerAdjustedUnitMinor: 200 }),
    currency: "USD",
    fundingSourceId: "pledge:funder-a-10",
    fundingSourceType: "ordinary_funder_pledge",
    id: "funding-source:round:funder-a",
    idempotencyKey: "funding-source:round:funder-a",
    purchaseEnvelopeId: "round:vegetarian-30-day",
    purchaseEnvelopeType: "group_buy_round",
    reserveEligibility: "participant_payout_reserve_eligible",
    status: "authorized",
  },
  {
    activationStatus: "activated",
    amountAuthorizedMinor: 5_000,
    amountChargedMinor: 0,
    amountCommittedMinor: 5_000,
    amountReleasedMinor: 0,
    amountReservedMinor: 5_000,
    authorizationExpiresAt: "2026-08-01T00:00:00.000Z",
    constraintsHash: hashJson({ cause: "animal_welfare", recipientScope: "approved_list" }),
    currency: "USD",
    fundingSourceId: "micro-pledge-batch:lot:100x50",
    fundingSourceType: "crowdfunded_micro_pledge",
    id: "funding-source:lot:micro-batch-100x50",
    idempotencyKey: "micro-pledge-batch:lot:100x50",
    purchaseEnvelopeId: "lot:no-meat-2-day-50",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_lot",
    reserveEligibility: "charitable_donation_reserve_eligible",
    status: "authorized",
  },
  {
    activationStatus: "activated",
    amountAuthorizedMinor: 5_000,
    amountChargedMinor: 0,
    amountCommittedMinor: 5_000,
    amountReleasedMinor: 0,
    amountReservedMinor: 5_000,
    authorizationExpiresAt: "2026-08-02T00:00:00.000Z",
    constraintsHash: hashJson({ sponsor: true, threshold: "80_percent" }),
    currency: "USD",
    fundingSourceId: "gap-fill:basket:last-20-percent",
    fundingSourceType: "sponsor_gap_fill",
    id: "funding-source:basket:sponsor-gap",
    idempotencyKey: "gap-fill:basket:last-20-percent",
    purchaseEnvelopeId: "basket:no-meat-5x50",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_basket",
    reserveEligibility: "sponsor_gap_fill_reserve_eligible",
    status: "reserved",
  },
];

export const MORAL_GOODS_SEED_ACTION_COMMITMENTS: MoralGoodsParticipantActionCommitment[] = [
  {
    acceptedTermsHash: hashJson({ terms: "participant-round-terms" }),
    actionTemplateId: "action-template:vegetarian-diet-shift:v1",
    actionWindowEndAt: "2026-08-30T04:00:00.000Z",
    actionWindowStartAt: "2026-08-01T04:00:00.000Z",
    activationStatus: "activated",
    commitmentStatus: "verified",
    expectedAdjustedUnitsMilli: 28_000,
    expectedRawUnits: 40,
    id: "commitment:round:participant-a",
    participantUserHash: hashJson("participant-a"),
    participantVisibleActionSummary: "Avoid meat/fish during the 30-day challenge.",
    publicIdentityVisibility: "anonymous",
    purchaseEnvelopeId: "round:vegetarian-30-day",
    purchaseEnvelopeType: "group_buy_round",
  },
  {
    acceptedTermsHash: hashJson({ terms: "lot-participant-terms" }),
    actionTemplateId: "action-template:two-day-no-meat:v1",
    actionWindowEndAt: "2026-07-25T04:00:00.000Z",
    actionWindowStartAt: "2026-07-23T04:00:00.000Z",
    activationStatus: "activated",
    commitmentStatus: "verified",
    expectedAdjustedUnitsMilli: 6_450,
    expectedRawUnits: 8,
    id: "commitment:lot:participant-a",
    participantUserHash: hashJson("lot-participant-a"),
    participantVisibleActionSummary: "Avoid meat/fish for 2 days after the start notice.",
    publicIdentityVisibility: "anonymous",
    purchaseEnvelopeId: "lot:no-meat-2-day-50",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_lot",
  },
];

export const MORAL_GOODS_SEED_CREDITED_UNITS: MoralGoodsCreditedActionUnit[] = [
  {
    actionTemplateId: "action-template:vegetarian-diet-shift:v1",
    additionalityBps: 7_500,
    creditedToSettlementId: null,
    deDuplicationStatus: "clear",
    id: "credited-unit:round:participant-a",
    moralImpactWeightBps: 10_000,
    participantActionCommitmentId: "commitment:round:participant-a",
    participantUserHash: hashJson("participant-a"),
    persistenceMultiplierBps: 8_000,
    purchaseEnvelopeId: "round:vegetarian-30-day",
    purchaseEnvelopeType: "group_buy_round",
    rawUnitKey: deriveRawUnitKey({
      actionTemplateId: "action-template:vegetarian-diet-shift:v1",
      actionWindowEndAt: "2026-08-30T04:00:00.000Z",
      actionWindowStartAt: "2026-08-01T04:00:00.000Z",
      participantUserHash: hashJson("participant-a"),
      privateDerivationKey: "development-only-raw-unit-key",
    }),
    rawUnitsCredited: 40,
    sourceFeature: "group_buying",
    verificationConfidenceBps: 9_000,
  },
  {
    actionTemplateId: "action-template:two-day-no-meat:v1",
    additionalityBps: 8_000,
    creditedToSettlementId: null,
    deDuplicationStatus: "clear",
    id: "credited-unit:lot:participant-a",
    moralImpactWeightBps: 10_000,
    participantActionCommitmentId: "commitment:lot:participant-a",
    participantUserHash: hashJson("lot-participant-a"),
    persistenceMultiplierBps: 9_000,
    purchaseEnvelopeId: "lot:no-meat-2-day-50",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_lot",
    rawUnitKey: deriveRawUnitKey({
      actionTemplateId: "action-template:two-day-no-meat:v1",
      actionWindowEndAt: "2026-07-25T04:00:00.000Z",
      actionWindowStartAt: "2026-07-23T04:00:00.000Z",
      participantUserHash: hashJson("lot-participant-a"),
      privateDerivationKey: "development-only-raw-unit-key",
    }),
    rawUnitsCredited: 8,
    sourceFeature: "group_buying",
    verificationConfidenceBps: 8_960,
  },
];

export const MORAL_GOODS_SEED_OBLIGATIONS: MoralGoodsConsiderationObligation[] = [
  {
    amountEarnedMinor: 0,
    amountExecutedMinor: 0,
    amountPromisedMinor: 6_000,
    amountReleasedMinor: 0,
    amountReservedMinor: 6_000,
    beneficiaryType: "participant",
    considerationType: "participant_payout",
    currency: "USD",
    id: "obligation:round:participant-a-payout",
    participantActionCommitmentId: "commitment:round:participant-a",
    purchaseEnvelopeId: "round:vegetarian-30-day",
    purchaseEnvelopeType: "group_buy_round",
    reservePolicyHash: hashJson({ reserve: "participant-payout" }),
    status: "reserved",
    triggerPolicyHash: hashJson({ trigger: "verified-adjusted-units" }),
  },
  {
    amountEarnedMinor: 5_000,
    amountExecutedMinor: 0,
    amountPromisedMinor: 5_000,
    amountReleasedMinor: 0,
    amountReservedMinor: 5_000,
    beneficiaryType: "donation_recipient",
    considerationType: "charitable_donation",
    currency: "USD",
    id: "obligation:lot:donation",
    participantActionCommitmentId: "commitment:lot:participant-a",
    purchaseEnvelopeId: "lot:no-meat-2-day-50",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_lot",
    reservePolicyHash: hashJson({ reserve: "charitable-donation" }),
    status: "earned",
    triggerPolicyHash: hashJson({ trigger: "fixed-two-day-obligation-verified" }),
  },
];

export function buildDealCardModel(
  envelope: MoralGoodsPurchaseEnvelope,
  role: MoralGoodsUserRole = "public",
): MoralGoodsDealCardModel {
  const nextStep = envelope.nextActions[role] ?? envelope.nextActions.public ?? "View results";
  const model = {
    details: {
      disputes: `Dispute deadline: ${envelope.deadlines.disputeAt ?? "not applicable for this item"}.`,
      donationTaxLimits:
        envelope.envelopeType === "crowdfunded_pledge_swap_lot" ||
        envelope.envelopeType === "crowdfunded_pledge_swap_basket"
          ? "Donation receipts and tax treatment follow the frozen donor-of-record policy; micro-funders are not promised personal tax receipts."
          : "Tax, withholding, payout, and fee details are shown on receipts when applicable.",
      fees:
        envelope.funding.providerMinimumMinor > 0
          ? `Provider minimum policy: ${formatMinorMoney({
              amountMinor: envelope.funding.providerMinimumMinor,
              currency: envelope.currency,
            })}.`
          : "No provider minimum applies in this demo.",
      methodology: envelope.snapshot.methodologySummary,
      privacy: envelope.snapshot.publicLimitations.join(" "),
      snapshotIdentifier: envelope.publicReport.publicSnapshotIdentifier,
      verification: envelope.snapshot.verificationSummary,
    },
    envelopeId: envelope.id,
    primaryLabel: envelope.snapshot.publicCopy.primaryLabel,
    rows: {
      action: envelope.actionSummary,
      consideration: envelope.considerationSummary,
      failureBehavior: envelope.snapshot.failureBehavior,
      nextStep,
      role:
        role === "participant"
          ? "You may apply to participate"
          : role === "sponsor"
            ? "You may sponsor remaining funding"
            : role === "funder"
              ? envelope.envelopeType === "standing_microfund_pool"
                ? "You may set a small recurring budget"
                : "You may fund this"
              : "You may view public results",
      status: MORAL_GOODS_STATE_LABELS[envelope.stateGroup],
      statusSentence: MORAL_GOODS_STATUS_SENTENCES[envelope.stateGroup],
    },
    secondaryLabel: envelope.snapshot.publicCopy.secondaryLabel,
    title: envelope.title,
  } satisfies Omit<MoralGoodsDealCardModel, "copyLint">;

  return {
    ...model,
    copyLint: lintOrdinaryGroupBuyingCopy(stableStringify(model.rows)),
  };
}

function getDiscoveryCategoryKey(envelope: MoralGoodsPurchaseEnvelope): MoralGoodsDiscoveryCategoryKey {
  if (envelope.stateGroup === "completed" || envelope.stateGroup === "evidence_due" || envelope.stateGroup === "under_review") {
    return "results";
  }

  if (envelope.envelopeType === "group_buy_round") {
    return "rounds";
  }

  if (envelope.envelopeType === "crowdfunded_pledge_swap_lot") {
    return "lots";
  }

  if (
    envelope.envelopeType === "crowdfunded_pledge_swap_basket" ||
    envelope.envelopeType === "crowdfunded_pledge_swap_basket_item"
  ) {
    return "baskets";
  }

  if (envelope.envelopeType === "standing_microfund_pool") {
    return "budgets";
  }

  return "all";
}

function normalizeDiscoveryQuery(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function categoryHref(key: MoralGoodsDiscoveryCategoryKey, query: string) {
  const params = new URLSearchParams();
  if (key !== "all") {
    params.set("category", key);
  }
  if (query) {
    params.set("q", query);
  }
  const suffix = params.toString();
  return `/moral-goods-group-buying${suffix ? `?${suffix}` : ""}#deals`;
}

function compactDateLabel(value: string | null) {
  return value ? `By ${value.slice(0, 10)}` : "No fixed deadline";
}

function discoveryProgressBand(envelope: MoralGoodsPurchaseEnvelope) {
  if (envelope.funding.targetMinor <= 0) {
    return {
      progressBps: 1_500,
      progressLabel: "Review-gated status only",
    };
  }

  const ratioBps = Math.min(10_000, Math.round((envelope.funding.authorizedMinor / envelope.funding.targetMinor) * 10_000));

  if (ratioBps >= 8_000) {
    return {
      progressBps: 8_500,
      progressLabel: "High review-gated interest",
    };
  }

  if (ratioBps >= 4_000) {
    return {
      progressBps: 6_000,
      progressLabel: "Moderate review-gated interest",
    };
  }

  if (ratioBps > 0) {
    return {
      progressBps: 3_500,
      progressLabel: "Early review-gated interest",
    };
  }

  return {
    progressBps: 1_500,
    progressLabel: "Review-gated status only",
  };
}

function discoveryPriceLabel(envelope: MoralGoodsPurchaseEnvelope) {
  if (envelope.funding.microPledgeDefaultMinor) {
    return `From ${formatMinorMoney({
      amountMinor: envelope.funding.microPledgeDefaultMinor,
      currency: envelope.currency,
    })}`;
  }

  return `Target ${formatMinorMoney({
    amountMinor: envelope.funding.targetMinor,
    currency: envelope.currency,
  })}`;
}

function discoveryProofTags(envelope: MoralGoodsPurchaseEnvelope) {
  const tags = [
    `${envelope.verificationStandard} verification`,
    envelope.reviews.safety === "approved" ? "Safety approved" : "Safety review pending",
    envelope.reserve.reserveStatus === "reserved" ? "Reserve ready" : "Reserve not required",
  ];

  if (envelope.enabledFeatureModules.includes("sponsor_gap_fill")) {
    tags.push("Sponsor gap-fill");
  }

  if (envelope.enabledFeatureModules.includes("participant_donation_recipient_choice")) {
    tags.push("Approved recipient choice");
  }

  return tags;
}

export function buildMoralGoodsDiscoveryCardModel(
  envelope: MoralGoodsPurchaseEnvelope,
): MoralGoodsDiscoveryCardModel {
  const dealCard = buildDealCardModel(envelope, "public");
  const categoryKey = getDiscoveryCategoryKey(envelope);
  const progressBand = discoveryProgressBand(envelope);
  const defaultAmount = envelope.funding.microPledgeDefaultMinor ?? envelope.funding.providerMinimumMinor ?? 0;
  const proofTags = discoveryProofTags(envelope);
  const model = {
    categoryKey,
    ctaLabel: MORAL_GOODS_PUBLIC_REVIEW_CTA_LABEL,
    deadlineLabel: compactDateLabel(envelope.deadlines.fundingAt ?? envelope.deadlines.acceptanceAt ?? envelope.deadlines.evidenceAt),
    envelopeId: envelope.id,
    href: `/moral-goods-group-buying#${envelope.slug}`,
    limitLabel:
      defaultAmount > 0
        ? `Default review amount ${formatMinorMoney({ amountMinor: defaultAmount, currency: envelope.currency })}`
        : "Review required before commitment",
    priceLabel: discoveryPriceLabel(envelope),
    primaryLabel: dealCard.primaryLabel,
    progressBps: progressBand.progressBps,
    progressLabel: progressBand.progressLabel,
    proofTags,
    routeLabel: dealCard.secondaryLabel,
    safeActionNote: "No charge or participant action starts before frozen terms and review gates clear.",
    searchText: [
      envelope.title,
      envelope.actionSummary,
      envelope.considerationSummary,
      dealCard.primaryLabel,
      dealCard.secondaryLabel,
      dealCard.rows.status,
      envelope.expectedImpactRange,
      proofTags.join(" "),
    ].join(" "),
    statusLabel: dealCard.rows.status,
    statusSentence: dealCard.rows.statusSentence,
    targetLabel: `Target ${formatMinorMoney({
      amountMinor: envelope.funding.targetMinor,
      currency: envelope.currency,
    })}`,
    title: envelope.title,
  } satisfies Omit<MoralGoodsDiscoveryCardModel, "copyLint">;

  return {
    ...model,
    copyLint: lintOrdinaryGroupBuyingCopy(stableStringify(model)),
  };
}

function buildCommitmentPreview(card: MoralGoodsDiscoveryCardModel): MoralGoodsDiscoveryCommitmentPreview {
  return {
    amountLabel: card.priceLabel,
    ctaHref: card.href,
    ctaLabel: card.ctaLabel,
    envelopeId: card.envelopeId,
    lines: [
      { label: "Route", value: card.routeLabel },
      { label: "Status", value: card.statusLabel },
      { label: "Progress", value: card.progressLabel },
      { label: "Deadline", value: card.deadlineLabel },
    ],
    noChargeLabel: "Due now $0.00. Authorization, capture, payout, donation, and reporting remain review-gated.",
    title: card.title,
  };
}

export function getMoralGoodsDiscoverySurface(input: {
  category?: string | null;
  query?: string | null;
} = {}): MoralGoodsDiscoverySurface {
  const query = normalizeDiscoveryQuery(input.query);
  const allCards = MORAL_GOODS_SEED_ENVELOPES.map((envelope) => buildMoralGoodsDiscoveryCardModel(envelope));
  const allowedCategories = new Set<MoralGoodsDiscoveryCategoryKey>([
    "all",
    "rounds",
    "lots",
    "baskets",
    "budgets",
    "results",
  ]);
  const activeCategory = allowedCategories.has(input.category as MoralGoodsDiscoveryCategoryKey)
    ? (input.category as MoralGoodsDiscoveryCategoryKey)
    : "all";
  const normalizedNeedle = query.toLowerCase();
  const cards = allCards.filter((card) => {
    const matchesCategory = activeCategory === "all" || card.categoryKey === activeCategory;
    const matchesQuery = !normalizedNeedle || card.searchText.toLowerCase().includes(normalizedNeedle);
    return matchesCategory && matchesQuery;
  });
  const categoryCounts = allCards.reduce<Record<MoralGoodsDiscoveryCategoryKey, number>>(
    (counts, card) => {
      counts.all += 1;
      counts[card.categoryKey] += 1;
      return counts;
    },
    { all: 0, baskets: 0, budgets: 0, lots: 0, results: 0, rounds: 0 },
  );
  const categoryMetadata: Array<Omit<MoralGoodsDiscoveryCategory, "count" | "href">> = [
    {
      description: "Everything currently reviewable.",
      key: "all",
      label: "Recommended",
    },
    {
      description: "Many people funding the same verified action pattern.",
      key: "rounds",
      label: "Rounds",
    },
    {
      description: "One verified pledge-swap obligation.",
      key: "lots",
      label: "Pledge-swap lots",
    },
    {
      description: "Multiple similar obligations funded together.",
      key: "baskets",
      label: "Baskets",
    },
    {
      description: "Small recurring caps with allocation rules.",
      key: "budgets",
      label: "Standing budgets",
    },
    {
      description: "Proof, review, and public-report states.",
      key: "results",
      label: "Results",
    },
  ];
  const categories = categoryMetadata.map((category): MoralGoodsDiscoveryCategory => ({
    ...category,
    count: categoryCounts[category.key],
    href: categoryHref(category.key, query),
  }));

  return {
    activeCategory,
    cards,
    categories,
    commitmentPreview: buildCommitmentPreview(cards[0] ?? allCards[0]),
    filterChips: ["Nearby review", "Small minimum", "Reserve ready", "Proof reviewed", "Private until reviewed"],
    query,
    resultCount: cards.length,
  };
}

export function buildCommitmentCard(input: {
  deadlineSummary: string;
  failureBehavior: string;
  moneyVerb: MoralGoodsMoneyVerb;
  receiptSummary: string;
  startsSummary: string;
  userAgreement: string;
}): MoralGoodsCommitmentCard {
  return {
    agreement: input.userAgreement,
    deadlinesAndRights: input.deadlineSummary,
    failureOrChange: input.failureBehavior,
    receipt: input.receiptSummary,
    whenMoneyOrActionStarts: input.startsSummary.replace(/\bcharged\b/i, input.moneyVerb),
  };
}

export function lintOrdinaryGroupBuyingCopy(copy: string): MoralGoodsCopyLintResult {
  const normalized = copy.toLowerCase();
  const blockers: string[] = [];

  for (const term of ORDINARY_UI_BANNED_TERMS) {
    if (normalized.includes(term.toLowerCase())) {
      blockers.push(`ordinary_ui_internal_term:${term}`);
    }
  }

  if (/\bguaranteed\b/i.test(copy)) {
    blockers.push("ordinary_ui_unsupported_guaranteed_claim");
  }

  if (/\bconfirmed\b/i.test(copy) && !/\bcomplete\b/i.test(copy)) {
    blockers.push("ordinary_ui_ambiguous_confirmed_claim");
  }

  if (/\boffset (your|my|their)\b/i.test(copy) || /\bcancel out\b/i.test(copy)) {
    blockers.push("ordinary_ui_moral_licensing_or_offset_claim");
  }

  if (/\bnot\s+\w+\s+unless\b/i.test(copy)) {
    blockers.push("ordinary_ui_stacked_conditional_or_double_negative");
  }

  return {
    blockers,
    status: blockers.length ? "fail" : "pass",
  };
}

export function evaluateFeatureCapabilities(
  capabilities: MoralGoodsFeatureCapability[] = MORAL_GOODS_FEATURE_CAPABILITIES,
) {
  const statusByModule = new Map(capabilities.map((capability) => [capability.featureModule, capability.status]));
  const blockers: string[] = [];

  for (const capability of capabilities) {
    if (capability.status === "enabled" || capability.status === "private_beta" || capability.status === "limited_public") {
      for (const dependency of capability.dependsOn) {
        const dependencyStatus = statusByModule.get(dependency);
        if (!dependencyStatus || dependencyStatus === "disabled" || dependencyStatus === "paused") {
          blockers.push(`feature_dependency_blocked:${capability.featureModule}:${dependency}`);
        }
      }
    }

    if (
      capability.environment === "production" &&
      capability.featureModule === "production_real_money_movement" &&
      capability.status !== "disabled" &&
      capability.dependencyStatus !== "satisfied"
    ) {
      blockers.push("production_real_money_enabled_without_satisfied_dependencies");
    }

    if (
      capability.featureModule === "internal_wallet_balance" &&
      capability.environment === "production" &&
      capability.status !== "disabled"
    ) {
      blockers.push("production_wallet_enabled_without_legal_custody_review");
    }
  }

  return {
    blockers,
    status: blockers.length ? ("blocked" as const) : ("pass" as const),
  };
}

export function evaluateEnvelopeReadiness(input: {
  capabilities?: MoralGoodsFeatureCapability[];
  envelope: MoralGoodsPurchaseEnvelope;
  now?: string;
  phase: "publish" | "launch" | "activate" | "settle" | "public_report";
}): MoralGoodsReadinessResult {
  const capabilities = input.capabilities ?? MORAL_GOODS_FEATURE_CAPABILITIES;
  const enabledModules = new Map(capabilities.map((capability) => [capability.featureModule, capability]));
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.envelope.snapshotHash !== input.envelope.registry.canonicalSnapshotHash) {
    blockers.push("snapshot_hash_registry_mismatch");
  }

  if (input.envelope.policyBundle.compatibilityStatus !== "passed") {
    blockers.push(`policy_bundle_not_compatible:${input.envelope.policyBundle.compatibilityStatus}`);
  }

  for (const featureModule of input.envelope.enabledFeatureModules) {
    const capability = enabledModules.get(featureModule);
    if (!capability || capability.status === "disabled" || capability.status === "paused") {
      blockers.push(`feature_module_not_enabled:${featureModule}`);
    }
  }

  if (
    input.envelope.reviews.safety !== "approved" ||
    input.envelope.reviews.methodology === "rejected" ||
    input.envelope.reviews.participantWelfare === "rejected"
  ) {
    blockers.push("review_gate_not_approved");
  }

  if (input.envelope.currency !== "USD") {
    blockers.push("single_currency_or_fx_snapshot_required");
  }

  if (input.envelope.stateGroup === "blocked_paused" && input.phase !== "public_report") {
    blockers.push("operational_pause_blocks_mutation");
  }

  const now = input.now ? Date.parse(input.now) : Date.now();
  const fundingDeadline = input.envelope.deadlines.fundingAt
    ? Date.parse(input.envelope.deadlines.fundingAt)
    : null;
  if ((input.phase === "launch" || input.phase === "activate") && fundingDeadline && now > fundingDeadline) {
    blockers.push("funding_deadline_passed");
  }

  if (
    input.envelope.envelopeType === "crowdfunded_pledge_swap_lot" ||
    input.envelope.envelopeType === "crowdfunded_pledge_swap_basket"
  ) {
    if (input.envelope.reserve.donationReserveMinor < input.envelope.publicReport.fixedConsiderationEarnedMinor) {
      blockers.push("donation_reserve_insufficient_for_fixed_consideration");
    }

    if (!input.envelope.enabledFeatureModules.includes("charitable_donation_execution")) {
      blockers.push("charitable_donation_execution_module_required");
    }
  }

  if (
    input.envelope.envelopeType === "standing_microfund_pool" &&
    input.envelope.enabledFeatureModules.includes("internal_wallet_balance")
  ) {
    blockers.push("standing_pool_wallet_balance_disabled");
  }

  if (input.envelope.funding.microPledgeDefaultMinor) {
    const providerMinimum = input.envelope.funding.providerMinimumMinor;
    if (input.envelope.funding.microPledgeDefaultMinor < providerMinimum) {
      blockers.push("micro_pledge_below_provider_minimum");
    }
  }

  if (input.envelope.publicReport.smallCellSuppression.length === 0) {
    warnings.push("public_progress_suppression_summary_missing");
  }

  return {
    blockers,
    status: blockers.length ? "blocked" : "pass",
    warnings,
  };
}

function eligibleFundingSource(source: MoralGoodsFundingSourceCommitment) {
  return (
    ["authorized", "reserved", "activated", "captured"].includes(source.status) &&
    (source.activationStatus === "instant_valid" || source.activationStatus === "activated")
  );
}

function allocateProRataMinor(totalMinor: number, sources: MoralGoodsFundingSourceCommitment[]) {
  assertInteger(totalMinor, "totalMinor");
  const totalAvailable = sources.reduce((sum, source) => sum + source.amountCommittedMinor, 0);

  if (totalMinor <= 0 || totalAvailable <= 0) {
    return sources.map(() => 0);
  }

  let remaining = totalMinor;
  const raw = sources.map((source) => ({
    allocated: Math.floor((totalMinor * source.amountCommittedMinor) / totalAvailable),
    remainder: (totalMinor * source.amountCommittedMinor) % totalAvailable,
  }));
  for (const entry of raw) {
    remaining -= entry.allocated;
  }

  const order = raw
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let index = 0; index < remaining; index += 1) {
    raw[order[index]?.index ?? 0].allocated += 1;
  }

  return raw.map((entry) => entry.allocated);
}

function ledgerIsBalanced(entries: MoralGoodsLedgerEntryPreview[]) {
  const byCurrency = new Map<string, { credits: number; debits: number }>();
  for (const entry of entries) {
    const totals = byCurrency.get(entry.currency) ?? { credits: 0, debits: 0 };
    totals[entry.direction === "credit" ? "credits" : "debits"] += entry.amountMinor;
    byCurrency.set(entry.currency, totals);
  }

  return Array.from(byCurrency.values()).every((total) => total.credits === total.debits);
}

export function buildSettlementPlan(input: {
  creditedUnits: MoralGoodsCreditedActionUnit[];
  envelope: MoralGoodsPurchaseEnvelope;
  fundingSources: MoralGoodsFundingSourceCommitment[];
  obligations: MoralGoodsConsiderationObligation[];
  participantPayoutCapMinor?: number;
  unitPriceMinor?: number;
}) {
  const participantPayoutCapMinor = input.participantPayoutCapMinor ?? 6_000;
  const unitPriceMinor = input.unitPriceMinor ?? 125;
  const blockers: string[] = [];
  const currencies = new Set([
    input.envelope.currency,
    ...input.fundingSources.map((source) => source.currency),
    ...input.obligations.map((obligation) => obligation.currency),
  ]);

  if (currencies.size !== 1) {
    blockers.push("settlement_single_currency_violation");
  }

  const eligibleSources = input.fundingSources.filter(
    (source) =>
      source.purchaseEnvelopeId === input.envelope.id &&
      source.purchaseEnvelopeType === input.envelope.envelopeType &&
      eligibleFundingSource(source),
  );
  const eligibleCreditedUnits = input.creditedUnits.filter(
    (unit) =>
      unit.purchaseEnvelopeId === input.envelope.id &&
      (unit.deDuplicationStatus === "clear" || unit.deDuplicationStatus === "credited") &&
      !unit.creditedToSettlementId,
  );
  const rawUnitsTotal = eligibleCreditedUnits.reduce((sum, unit) => sum + unit.rawUnitsCredited, 0);
  const adjustedUnitsTotalMilli = eligibleCreditedUnits.reduce(
    (sum, unit) =>
      sum +
      calculateAdjustedImpactMilliUnits({
        additionalityBps: unit.additionalityBps,
        moralImpactWeightBps: unit.moralImpactWeightBps,
        persistenceMultiplierBps: unit.persistenceMultiplierBps,
        rawUnits: unit.rawUnitsCredited,
        verificationConfidenceBps: unit.verificationConfidenceBps,
      }),
    0,
  );
  const earnedFixedObligations = input.obligations.filter(
    (obligation) =>
      obligation.purchaseEnvelopeId === input.envelope.id &&
      obligation.status === "earned" &&
      obligation.considerationType === "charitable_donation",
  );
  const fixedConsiderationEarnedMinor = earnedFixedObligations.reduce(
    (sum, obligation) => sum + obligation.amountEarnedMinor,
    0,
  );
  const participantPayoutObligations = input.obligations.filter(
    (obligation) =>
      obligation.purchaseEnvelopeId === input.envelope.id &&
      obligation.considerationType === "participant_payout",
  );
  const participantPayoutTotalMinor =
    fixedConsiderationEarnedMinor > 0
      ? 0
      : participantPayoutObligations.reduce(
          (sum) =>
            sum +
            calculateParticipantPayoutMinor({
              adjustedUnitsMilli: adjustedUnitsTotalMilli,
              participantPayoutCapMinor,
              unitPriceMinor,
            }),
          0,
        );
  const totalDueMinor = fixedConsiderationEarnedMinor + participantPayoutTotalMinor;
  const totalEligibleFundingMinor = eligibleSources.reduce(
    (sum, source) => sum + source.amountCommittedMinor,
    0,
  );
  if (totalEligibleFundingMinor < totalDueMinor) {
    blockers.push("eligible_funding_insufficient_for_earned_consideration");
  }
  const sourceAllocations = allocateProRataMinor(totalDueMinor, eligibleSources);
  const fundingSourceSetHash = hashJson(input.fundingSources);
  const creditedActionUnitSetHash = hashJson(eligibleCreditedUnits);
  const considerationObligationSetHash = hashJson(input.obligations);
  const calculationInputHash = hashJson({
    creditedActionUnitSetHash,
    envelopeSnapshotHash: input.envelope.snapshotHash,
    fundingSourceSetHash,
    obligationSetHash: considerationObligationSetHash,
    participantPayoutCapMinor,
    unitPriceMinor,
  });
  const lineItems = eligibleSources.map((source, index) => {
    const amountChargedOrUsedMinor = sourceAllocations[index] ?? 0;
    const releaseAmount = Math.max(0, source.amountAuthorizedMinor - amountChargedOrUsedMinor);
    const outputHash = hashJson({
      amountChargedOrUsedMinor,
      releaseAmount,
      sourceId: source.id,
    });

    return {
      amountAuthorizedMinor: source.amountAuthorizedMinor,
      amountChargedOrUsedMinor,
      amountReleasedMinor: releaseAmount,
      amountReservedMinor: source.amountReservedMinor,
      calculationInputHash,
      calculationOutputHash: outputHash,
      currency: source.currency,
      fundedAdjustedUnitsMilli:
        totalDueMinor > 0
          ? Math.floor((adjustedUnitsTotalMilli * amountChargedOrUsedMinor) / totalDueMinor)
          : 0,
      fundedConsiderationObligationId: earnedFixedObligations[0]?.id ?? participantPayoutObligations[0]?.id ?? null,
      fundingSourceCommitmentId: source.id,
      fundingSourceType: source.fundingSourceType,
      id: `settlement-line:${input.envelope.id}:${source.id}`,
      ineligibleReason: null,
      isEligibleForChargeOrUse: true,
    } satisfies MoralGoodsSettlementLineItem;
  });
  const releaseTotalMinor = lineItems.reduce((sum, line) => sum + line.amountReleasedMinor, 0);
  const ordinaryFunderChargeTotalMinor = lineItems
    .filter((line) => line.fundingSourceType !== "sponsor_gap_fill")
    .reduce((sum, line) => sum + line.amountChargedOrUsedMinor, 0);
  const sponsorGapFillUsedMinor = lineItems
    .filter((line) => line.fundingSourceType === "sponsor_gap_fill")
    .reduce((sum, line) => sum + line.amountChargedOrUsedMinor, 0);
  const ledgerEntryCandidates = [
    {
      accountType: "conditional_funder_authorization",
      amountMinor: ordinaryFunderChargeTotalMinor,
      currency: input.envelope.currency,
      direction: "debit",
      memo: "Capture eligible funder authorizations.",
    },
    {
      accountType:
        fixedConsiderationEarnedMinor > 0 ? "charitable_donation_payable" : "participant_payable",
      amountMinor: totalDueMinor,
      currency: input.envelope.currency,
      direction: "credit",
      memo: "Record earned consideration before provider execution.",
    },
    {
      accountType: "sponsor_gap_fill_reserve",
      amountMinor: sponsorGapFillUsedMinor,
      currency: input.envelope.currency,
      direction: "debit",
      memo: "Use reserve-backed sponsor gap-fill.",
    },
    {
      accountType: "release_liability",
      amountMinor: releaseTotalMinor,
      currency: input.envelope.currency,
      direction: "debit",
      memo: "Release unused authorizations.",
    },
    {
      accountType: "conditional_funder_authorization",
      amountMinor: releaseTotalMinor,
      currency: input.envelope.currency,
      direction: "credit",
      memo: "Offset release liability against unused authorizations.",
    },
  ] satisfies MoralGoodsLedgerEntryPreview[];
  const ledgerEntries = ledgerEntryCandidates.filter((entry) => entry.amountMinor > 0);

  if (!ledgerIsBalanced(ledgerEntries)) {
    blockers.push("ledger_entries_do_not_balance");
  }

  if (input.envelope.reserve.participantPayoutReserveMinor < participantPayoutTotalMinor) {
    blockers.push("participant_payout_reserve_insufficient");
  }

  if (input.envelope.reserve.donationReserveMinor < fixedConsiderationEarnedMinor) {
    blockers.push("donation_reserve_insufficient");
  }

  const calculationOutputHash = hashJson({
    adjustedUnitsTotalMilli,
    fixedConsiderationEarnedMinor,
    ledgerEntries,
    lineItems,
    participantPayoutTotalMinor,
    rawUnitsTotal,
  });

  return {
    adjustedUnitsTotalMilli,
    blockers,
    calculationInputHash,
    calculationOutputHash,
    considerationObligationSetHash,
    creditedActionUnitSetHash,
    currency: input.envelope.currency,
    feeRatioCheckStatus: "passed",
    fixedConsiderationEarnedMinor,
    frozenPolicyBundleHash: input.envelope.policyBundle.bundleHash,
    fundingSourceSetHash,
    id: `settlement-plan:${input.envelope.id}:${calculationInputHash.slice(-12)}`,
    ledgerEntries,
    lineItems,
    ordinaryFunderChargeTotalMinor,
    participantPayoutTotalMinor,
    planStatus: blockers.length ? "draft" : "computed",
    purchaseEnvelopeId: input.envelope.id,
    purchaseEnvelopeType: input.envelope.envelopeType,
    rawUnitsTotal,
    recipientFundingCompatibilityStatus: "passed",
    releaseTotalMinor,
    reserveCheckStatus: blockers.some((blocker) => blocker.includes("reserve")) ? "failed" : "passed",
    sponsorGapFillUsedMinor,
    verificationBurdenCheckStatus: "passed",
  } satisfies MoralGoodsSettlementPlan;
}

export function validateApprovedSettlementPlan(
  approvedPlan: MoralGoodsSettlementPlan,
  recomputedPlan: MoralGoodsSettlementPlan,
) {
  const blockers: string[] = [];
  const checkedFields: Array<keyof MoralGoodsSettlementPlan> = [
    "calculationInputHash",
    "fundingSourceSetHash",
    "creditedActionUnitSetHash",
    "considerationObligationSetHash",
    "calculationOutputHash",
  ];

  for (const field of checkedFields) {
    if (approvedPlan[field] !== recomputedPlan[field]) {
      blockers.push(`approved_settlement_plan_${field}_changed`);
    }
  }

  return {
    blockers,
    status: blockers.length ? ("blocked" as const) : ("pass" as const),
  };
}

export function flagParticipantProposalForThreats(input: {
  proposedActionText: string;
  proposedConsiderationText: string;
  safetyOrAccessConcerns?: string;
}): MoralGoodsThreatFlagResult {
  const text = `${input.proposedActionText} ${input.proposedConsiderationText} ${
    input.safetyOrAccessConcerns ?? ""
  }`.toLowerCase();
  const flags: string[] = [];

  const blockedPatterns = [
    ["pay_me_or_harm", /\b(pay|fund|donate).{0,40}\b(or|otherwise).{0,40}\b(harm|eat more|harass|threaten|damage)\b/],
    ["self_harm_or_medical_risk", /\b(self-harm|suicide|starve|medical advice|stop medication)\b/],
    ["illegal_or_discriminatory", /\b(illegal|vote buying|discriminate|harass|dox)\b/],
    ["off_platform_circumvention", /\b(contact me directly|pay me off platform|private side payment)\b/],
  ] as const;

  for (const [key, pattern] of blockedPatterns) {
    if (pattern.test(text)) {
      flags.push(key);
    }
  }

  if (/\bbaseline\b.{0,30}\b(increase|worse|worsen)\b/.test(text)) {
    flags.push("baseline_worsening_risk");
  }

  if (flags.some((flag) => ["pay_me_or_harm", "self_harm_or_medical_risk", "illegal_or_discriminatory"].includes(flag))) {
    return {
      flags,
      participantVisibleReason:
        "This proposal cannot be listed because it appears to involve threat, safety, legal, medical, or discriminatory risk.",
      status: "blocked",
    };
  }

  return {
    flags,
    participantVisibleReason:
      flags.length > 0
        ? "This proposal needs private safety review before any public lot or basket can be created."
        : "This proposal can enter private review. It is not listed for funding and creates no obligation.",
    status: flags.length > 0 ? "review_required" : "clear",
  };
}

export function getGuidedStandingBudgetSteps() {
  return [
    "Choose a cause/action area.",
    "Choose a monthly cap.",
    "Choose a maximum per action or basket item.",
    "Choose participant payout, charity donation, or mixed consideration.",
    "Choose an approved recipient scope when charity donations are enabled.",
    "Choose automatic within my rules, ask me before locking, or manual only.",
  ];
}

export function getPrivateProposalIntakeFields() {
  return [
    "What you would do",
    "How long it would last",
    "What consideration would make it worthwhile",
    "Which approved charity or payout option you would accept",
    "Any safety or access concerns",
  ];
}

export function getMoralGoodsGroupBuyingContract(): MoralGoodsContract {
  const sampleLot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  )!;
  const sampleSettlementPlan = buildSettlementPlan({
    creditedUnits: MORAL_GOODS_SEED_CREDITED_UNITS,
    envelope: sampleLot,
    fundingSources: MORAL_GOODS_SEED_FUNDING_SOURCES,
    obligations: MORAL_GOODS_SEED_OBLIGATIONS,
  });

  return {
    contractTests: [...GROUP_BUYING_CONTRACT_TESTS],
    envelopeTypes: [
      "group_buy_round",
      "crowdfunded_pledge_swap_lot",
      "crowdfunded_pledge_swap_basket",
      "crowdfunded_pledge_swap_basket_item",
      "standing_microfund_pool",
      "pledge_swap_agreement_adapter",
    ],
    failureMessageTemplates: MORAL_GOODS_FAILURE_MESSAGE_TEMPLATES,
    featureModules: [
      "adjusted_impact_rounds",
      "crowdfunded_pledge_swap_lots",
      "crowdfunded_pledge_swap_baskets",
      "standing_microfund_pools",
      "participant_donation_recipient_choice",
      "sponsor_gap_fill",
      "participant_proposal_intake",
      "internal_wallet_balance",
      "charitable_donation_execution",
      "production_real_money_movement",
    ],
    featureName: "Moral Goods Group Buying",
    discoverySurface: getMoralGoodsDiscoverySurface(),
    firstClassRecordTables: [...GROUP_BUYING_FIRST_CLASS_TABLES],
    ordinaryUiBannedTerms: ORDINARY_UI_BANNED_TERMS,
    purpose:
      "Shared purchase-envelope implementation for adjusted-impact rounds, crowdfunded pledge-swap lots, baskets, standing microfund pools, participant recipient choice, sponsor gap-fill, private proposal intake, deterministic settlement, public/private reporting, and action-first UX.",
    readinessSamples: [
      evaluateEnvelopeReadiness({ envelope: sampleLot, phase: "launch", now: "2026-07-19T00:00:00.000Z" }),
      evaluateEnvelopeReadiness({
        capabilities: MORAL_GOODS_FEATURE_CAPABILITIES.map((capability) =>
          capability.featureModule === "charitable_donation_execution"
            ? { ...capability, status: "disabled" }
            : capability,
        ),
        envelope: sampleLot,
        phase: "launch",
        now: "2026-07-19T00:00:00.000Z",
      }),
    ],
    sampleDealCards: MORAL_GOODS_SEED_ENVELOPES.map((envelope) => buildDealCardModel(envelope, "public")),
    sampleSettlementPlan,
    seedCapabilityModules: MORAL_GOODS_FEATURE_CAPABILITIES.map((capability) => capability.featureModule),
    seedEnvelopeSlugs: MORAL_GOODS_SEED_ENVELOPES.map((envelope) => envelope.slug),
    sharedPrimitiveTables: [...GROUP_BUYING_SHARED_PRIMITIVE_TABLES],
    statusSentenceTemplates: MORAL_GOODS_STATUS_SENTENCES,
    userFacingStateLabels: MORAL_GOODS_STATE_LABELS,
    version: MORAL_GOODS_GROUP_BUYING_CONTRACT_VERSION,
  };
}

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
) {
  return {
    evidence,
    id,
    label,
    status: passed ? ("pass" as const) : ("fail" as const),
  };
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateMoralGoodsGroupBuyingContract(
  contract: MoralGoodsContract = getMoralGoodsGroupBuyingContract(),
): MoralGoodsValidation {
  const envelopeTypes = contract.envelopeTypes;
  const featureModules = contract.featureModules;
  const tableNames = contract.firstClassRecordTables;
  const statusGroups = Object.keys(contract.userFacingStateLabels) as MoralGoodsStateGroup[];
  const dealCardLintPasses = contract.sampleDealCards.every((card) => card.copyLint.status === "pass");
  const discoveryCardsLintPass = contract.discoverySurface.cards.every((card) => card.copyLint.status === "pass");
  const discoveryHasRequiredCategories = hasAll(
    contract.discoverySurface.categories.map((category) => category.key),
    ["all", "rounds", "lots", "baskets", "budgets", "results"],
  );
  const readinessHasFailClosedSample = contract.readinessSamples.some(
    (sample) => sample.status === "blocked" && sample.blockers.length > 0,
  );
  const settlementPlan = contract.sampleSettlementPlan;
  const checks = [
    validationCheck(
      "purchase_envelope_types",
      "Contract includes first-class group-buying envelopes.",
      hasAll(envelopeTypes, [
        "group_buy_round",
        "crowdfunded_pledge_swap_lot",
        "crowdfunded_pledge_swap_basket",
        "standing_microfund_pool",
        "pledge_swap_agreement_adapter",
      ]),
      envelopeTypes.join(","),
    ),
    validationCheck(
      "feature_modules",
      "Contract exposes capability-gated modules.",
      hasAll(featureModules, [
        "adjusted_impact_rounds",
        "crowdfunded_pledge_swap_lots",
        "crowdfunded_pledge_swap_baskets",
        "standing_microfund_pools",
        "participant_donation_recipient_choice",
        "sponsor_gap_fill",
        "participant_proposal_intake",
        "internal_wallet_balance",
        "charitable_donation_execution",
        "production_real_money_movement",
      ]),
      featureModules.join(","),
    ),
    validationCheck(
      "persistent_tables",
      "Migration table list covers shared primitives and envelope-specific records.",
      hasAll(tableNames, [
        "moral_goods_group_buy_rounds",
        "moral_goods_purchase_envelope_registry",
        "moral_goods_funding_source_commitments",
        "moral_goods_participant_action_commitments",
        "moral_goods_credited_action_units",
        "moral_goods_settlement_plans",
        "moral_goods_crowdfunded_pledge_swap_lots",
        "moral_goods_crowdfunded_pledge_swap_baskets",
        "moral_goods_standing_microfund_pools",
        "moral_goods_participant_pledge_swap_proposals",
      ]),
      `${tableNames.length} tables`,
    ),
    validationCheck(
      "canonical_state_labels",
      "All canonical user-facing state groups have labels and status sentences.",
      statusGroups.length === 11 &&
        statusGroups.every((group) => Boolean(contract.statusSentenceTemplates[group])),
      statusGroups.join(","),
    ),
    validationCheck(
      "deal_card_copy_lint",
      "Ordinary deal-card copy excludes internal architecture terms and unsupported claims.",
      dealCardLintPasses,
      contract.sampleDealCards
        .flatMap((card) => card.copyLint.blockers.map((blocker) => `${card.envelopeId}:${blocker}`))
        .join(",") || "all sample cards pass",
    ),
    validationCheck(
      "discovery_surface",
      "Meituan-inspired discovery surface exposes categories, deal rows, and a safe commitment preview.",
      discoveryHasRequiredCategories &&
        discoveryCardsLintPass &&
        contract.discoverySurface.commitmentPreview.noChargeLabel.includes("Due now $0.00"),
      `${contract.discoverySurface.categories.length} categories, ${contract.discoverySurface.cards.length} rows`,
    ),
    validationCheck(
      "failure_templates",
      "Reusable failure templates cover the required edge cases.",
      contract.failureMessageTemplates.length >= 14,
      `${contract.failureMessageTemplates.length} templates`,
    ),
    validationCheck(
      "settlement_hashes",
      "Sample settlement binds funding sources, credited units, obligations, and output hashes.",
      settlementPlan.fundingSourceSetHash.startsWith("sha256:") &&
        settlementPlan.creditedActionUnitSetHash.startsWith("sha256:") &&
        settlementPlan.considerationObligationSetHash.startsWith("sha256:") &&
        settlementPlan.calculationInputHash.startsWith("sha256:") &&
        settlementPlan.calculationOutputHash.startsWith("sha256:"),
      settlementPlan.id,
    ),
    validationCheck(
      "readiness_fail_closed",
      "Readiness samples include fail-closed disabled-module behavior.",
      readinessHasFailClosedSample,
      contract.readinessSamples.map((sample) => sample.status).join(","),
    ),
    validationCheck(
      "contract_tests",
      "Contract declares route, migration, presenter, settlement, and copy-lint tests.",
      hasAll(contract.contractTests, [
        "group_buying_public_route_contract",
        "group_buying_schema_migration_contract",
        "group_buying_settlement_plan_hash_integrity",
        "group_buying_progressive_disclosure_copy_lint",
      ]),
      contract.contractTests.join(","),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `group_buying_contract_check_failed:${check.id}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-goods-group-buying-contract",
    validatorVersion: MORAL_GOODS_GROUP_BUYING_VALIDATOR_VERSION,
  };
}
