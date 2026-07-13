import { createHash } from "node:crypto";

export const DONATION_CANCELLATION_FEATURE_FLAG = "donation_cancellation_clearinghouse_v0_1";
export const DONATION_CANCELLATION_LIVE_MONEY_FEATURE_FLAG = "donation_cancellation_live_money_enabled";
export const DONATION_CANCELLATION_LABS_PERMISSION = "donation_cancellation_labs_admin";
export const DONATION_CANCELLATION_NON_MVP_WARNING =
  "Donation Cancellation Clearinghouse is a non-MVP moral-trade mechanism under review. It is not part of the current Common Ground Pledge Pool MVP. Real-money registration, authorization, capture, donation routing, and settlement are disabled unless a later reviewed promotion enables them.";
export const DONATION_CANCELLATION_NON_MVP_BANNER =
  "Non-MVP mechanism. Not part of the current CGPP MVP. Simulated or admin-review use only. Production real-money registration, authorization, capture, routing, and settlement are disabled.";
export const DONATION_CANCELLATION_FEATURE_CLASSIFICATION = {
  featureKey: DONATION_CANCELLATION_FEATURE_FLAG,
  featureClassification: "non_mvp",
  deploymentStage: "labs_research_non_mvp",
  defaultEnabled: false,
  productionPublicEnabled: false,
  productionRealMoneyEnabled: false,
  primaryNavEnabled: false,
  mvpSurfaceEnabled: false,
  cgppSurfaceEnabled: false,
  requiresAdminOrLabsAccess: true,
  requiresExplicitPromotionRecord: true,
} as const;
export const DONATION_CANCELLATION_CONTRACT_VERSION =
  "donation-cancellation-clearinghouse-v0.1-2026-07";
export const DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION =
  "donation-cancellation-gross-largest-remainder-v0.1";
export const DONATION_CANCELLATION_SUGGESTION_ALGORITHM_VERSION =
  "donation-cancellation-min-common-ground-score-v0.1";
export const DONATION_CANCELLATION_RULEBOOK_HASH = hashCanonical({
  matchingBasis: "gross_minor",
  ratio: "1:1",
  unmatchedFallback: "intended_destination",
  version: DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION,
});
export const DONATION_CANCELLATION_FEE_POLICY_HASH = hashCanonical({
  feeMinor: 0,
  feePolicy: "dev-simulated-zero-fee",
  version: "donation-cancellation-fee-policy-v0.1",
});

export type DonationCancellationPaymentMode =
  | "dev_simulated_capture"
  | "provider_authorization_then_capture"
  | "provider_capture_to_compliant_clearing_account";
export type DonationCancellationDeploymentEnvironment = "development" | "test" | "staging" | "production";
export type DonationCancellationFeatureClassification =
  typeof DONATION_CANCELLATION_FEATURE_CLASSIFICATION.featureClassification;
export type DonationCancellationDeploymentStage =
  typeof DONATION_CANCELLATION_FEATURE_CLASSIFICATION.deploymentStage;
export type DonationCancellationActorRole = "public" | "user" | "admin" | "reviewer" | "labs";
export type DonationCancellationCapabilityAction =
  | "view_public_landing"
  | "view_labs_landing"
  | "create_round"
  | "open_round"
  | "register_intended_donation"
  | "save_payment_method"
  | "authorize_payment"
  | "capture_payment"
  | "route_donation"
  | "run_matching"
  | "create_redirect_suggestion"
  | "approve_settlement"
  | "execute_settlement"
  | "publish_public_report"
  | "seed_demo_data";
export type DonationCancellationBackgroundJob =
  | "matching_job"
  | "redirect_suggestion_job"
  | "settlement_plan_job"
  | "routing_job"
  | "receipt_job"
  | "public_report_job"
  | "payment_retry_job"
  | "deadline_job";
export type DonationCancellationGateReason =
  | "feature_non_mvp"
  | "feature_disabled"
  | "public_surface_disabled"
  | "production_real_money_disabled"
  | "missing_promotion_record"
  | "insufficient_role"
  | "payment_mode_not_allowed_for_non_mvp"
  | "route_not_available_in_current_deployment"
  | "emergency_pause_all_feature_activity"
  | "provider_authorization_not_configured"
  | "compliant_clearing_account_not_configured"
  | "legal_compliance_not_ready"
  | "trust_safety_not_ready"
  | "copy_preflight_not_passed"
  | "caps_not_configured";
export type DonationCancellationPromotionApprovalState = "draft" | "approved" | "rejected" | "revoked";
export type DonationCancellationPaymentState =
  | "none"
  | "payment_failed"
  | "provider_authorized_exact"
  | "captured_pending_routing";
export type DonationCancellationRoundStatus =
  | "draft"
  | "preflight"
  | "open"
  | "closed_to_new_registrations"
  | "matching"
  | "suggestions_pending"
  | "routing"
  | "settled"
  | "released"
  | "blocked"
  | "canceled";
export type DonationCancellationRecipientType =
  | "charity"
  | "nonprofit"
  | "fiscal_host"
  | "advocacy_non_election"
  | "other";
export type DonationCancellationReviewState = "approved" | "review" | "blocked";
export type DonationCancellationRouteState = "verified" | "review" | "blocked";
export type DonationCancellationSide = "side_a" | "side_b" | "none" | "unknown";
export type DonationCancellationRegistrationState =
  | "draft"
  | "payment_pending"
  | "paid_registered"
  | "authorized_registered"
  | "excluded_payment"
  | "excluded_identity"
  | "excluded_review"
  | "matched_pending_suggestion"
  | "matched_redirect_accepted"
  | "matched_redirect_rejected"
  | "routed_to_redirect"
  | "routed_to_intended"
  | "partially_routed"
  | "settled"
  | "blocked"
  | "canceled";
export type DonationCancellationRedirectConsentMode =
  | "preconsented_allowed_list"
  | "require_review_before_routing";
export type DonationCancellationAllocationState =
  | "pending"
  | "suggested"
  | "accepted"
  | "rejected"
  | "route_to_intended"
  | "route_to_redirect"
  | "routed"
  | "failed"
  | "blocked"
  | "superseded";
export type DonationCancellationRoutingState =
  | "pending"
  | "executing"
  | "succeeded"
  | "failed"
  | "retryable"
  | "blocked"
  | "reversed";
export type DonationCancellationPauseLane =
  | "new_registrations"
  | "payment_operations"
  | "matching"
  | "routing"
  | "public_reports"
  | "all_feature_activity";

export interface DonationCancellationMoney {
  amountMinor: number;
  currency: string;
}

export interface DonationCancellationRound {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: DonationCancellationRoundStatus;
  currency: string;
  opensAt: string;
  closesAt: string;
  routingDeadlineAt: string;
  parametersFrozenAt: string;
  featureFlag: typeof DONATION_CANCELLATION_FEATURE_FLAG;
  paymentMode: DonationCancellationPaymentMode;
  roundGrossCapMinor: number;
  perUserGrossMinMinor: number;
  perUserGrossMaxMinor: number;
  rulebookHash: string;
  feePolicyHash: string;
  matchingAlgorithmVersion: typeof DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION;
  suggestionAlgorithmVersion: typeof DONATION_CANCELLATION_SUGGESTION_ALGORITHM_VERSION;
  copyPreflightState: "not_run" | "passed" | "failed";
  publicProgressMode: "qualitative_only_before_close";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationRecipient {
  id: string;
  name: string;
  publicDescription: string;
  websiteUrl: string | null;
  recipientType: DonationCancellationRecipientType;
  paymentRouteRef: string | null;
  paymentRouteState: DonationCancellationRouteState;
  jurisdiction: string;
  sanctionsAmlState: "clear" | "review" | "blocked";
  taxReceiptPolicySnapshotJson: Record<string, unknown> | null;
  reviewState: DonationCancellationReviewState;
  causeAreaTags: string[];
  publicGoodTags: string[];
  oppositionSideIds: string[];
  isActive: boolean;
  devOnly?: boolean;
  productionBlockedReason?: string;
  estimatedFeeMinor?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationOppositionMarket {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "review" | "active" | "blocked" | "retired";
  sideALabel: string;
  sideBLabel: string;
  sideARecipientIds: string[];
  sideBRecipientIds: string[];
  matchingRatioBpsAToB: number;
  legalReviewState: DonationCancellationReviewState;
  safetyReviewState: DonationCancellationReviewState;
  publicCopyReviewState: DonationCancellationReviewState;
  allowedRedirectRecipientIds: string[];
  prohibitedRecipientIds: string[];
  rulebookHash: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoralPrioritySnapshot {
  id: string;
  userId: string;
  roundId: string;
  priorityWeights: Record<string, number>;
  acceptableRedirectRecipientIds: string[];
  unacceptableRedirectRecipientIds: string[];
  minCommonGroundScore: number | null;
  autoAcceptSuggestions: boolean;
  visibility: "aggregate_only";
  snapshotHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntendedDonationRegistration {
  id: string;
  roundId: string;
  userId: string;
  intendedRecipientId: string;
  intendedOppositionMarketId: string | null;
  intendedSide: DonationCancellationSide;
  grossAmountMinor: number;
  estimatedFeeMinor: number;
  estimatedNetMinor: number;
  currency: string;
  userAttestationChecked: boolean;
  userAttestationTextVersion: string;
  moralPrioritySnapshotId: string;
  fallbackMode: "intended_destination";
  redirectConsentMode: DonationCancellationRedirectConsentMode;
  registrationState: DonationCancellationRegistrationState;
  paymentState: DonationCancellationPaymentState;
  paymentOperationId: string | null;
  fundingSourceCommitmentId: string | null;
  identitySnapshotId: string | null;
  rulebookHashAtConsent: string;
  feePolicyHashAtConsent: string;
  finalReviewConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationMatchGroup {
  id: string;
  roundId: string;
  oppositionMarketId: string;
  matchingAlgorithmVersion: typeof DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION;
  sideATotalEligibleMinor: number;
  sideBTotalEligibleMinor: number;
  sideAMatchedMinor: number;
  sideBMatchedMinor: number;
  sideAUnmatchedMinor: number;
  sideBUnmatchedMinor: number;
  matchingInputHash: string;
  matchingOutputHash: string;
  status: "computed" | "suggestions_computed" | "approved" | "routing" | "settled" | "superseded" | "failed" | "blocked";
  allocationByRegistrationId: Record<string, number>;
  blockers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RedirectSuggestion {
  id: string;
  roundId: string;
  matchGroupId: string;
  redirectRecipientId: string;
  suggestionAlgorithmVersion: typeof DONATION_CANCELLATION_SUGGESTION_ALGORITHM_VERSION;
  userCompatibilitySummaryHash: string;
  publicExplanation: string;
  privateScoreJsonRef: string | null;
  commonGroundScoreDecimal: number;
  status: "proposed" | "accepted_by_policy" | "requires_user_review" | "rejected" | "expired" | "blocked";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationAllocationRow {
  id: string;
  roundId: string;
  matchGroupId: string | null;
  registrationId: string;
  userId: string;
  originalIntendedRecipientId: string;
  allocatedMatchedMinor: number;
  allocatedUnmatchedMinor: number;
  redirectRecipientId: string | null;
  redirectSuggestionId: string | null;
  finalIntendedRouteMinor: number;
  finalRedirectRouteMinor: number;
  feeMinor: number;
  netToIntendedMinor: number;
  netToRedirectMinor: number;
  allocationState: DonationCancellationAllocationState;
  allocationHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationRoutingOperation {
  id: string;
  roundId: string;
  allocationRowId: string;
  registrationId: string;
  destinationRecipientId: string;
  destinationType: "original_intended" | "redirect";
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
  currency: string;
  providerOperationRef: string | null;
  operationState: DonationCancellationRoutingState;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationSettlementPlan {
  id: string;
  roundId: string;
  status: "computed" | "approved" | "routing" | "settled" | "superseded" | "blocked";
  matchGroups: DonationCancellationMatchGroup[];
  redirectSuggestions: RedirectSuggestion[];
  allocationRows: DonationCancellationAllocationRow[];
  routingOperations: DonationRoutingOperation[];
  settlementInputHash: string;
  settlementOutputHash: string;
  ledgerBalanceStatus: "balanced" | "mismatch";
  blockers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationAuditReport {
  id: string;
  roundId: string;
  grossRegisteredMinor: number;
  grossMatchedMinor: number;
  grossRedirectedMinor: number;
  grossRoutedToIntendedMinor: number;
  feeMinor: number;
  netToIntendedMinor: number;
  netToRedirectMinor: number;
  registrationCount: number;
  matchedRegistrationCount: number;
  unmatchedRegistrationCount: number;
  redirectRecipientCount: number;
  intendedRecipientCount: number;
  paymentFailureCount: number;
  reviewBlockCount: number;
  finalStatus: DonationCancellationRoundStatus;
  publicReportJson: {
    label: string;
    limitations: string[];
    recipientTotals: Array<{ recipientId: string; label: string; grossMinor: number }>;
  };
  publishedAt: string | null;
}

export interface DonationCancellationCopyPreflightReport {
  status: "passed" | "failed";
  blockers: string[];
}

export interface DonationCancellationCapabilityEvaluation {
  status: "enabled" | "dev_simulated" | "blocked" | "paused";
  paymentMode: DonationCancellationPaymentMode;
  blockers: DonationCancellationGateReason[];
  userFacingSummary: string;
}

export interface DonationCancellationCapabilityActor {
  role: DonationCancellationActorRole;
  permissions?: string[];
}

export interface FeaturePromotionRecord {
  id: string;
  featureKey: typeof DONATION_CANCELLATION_FEATURE_FLAG;
  fromClassification: DonationCancellationFeatureClassification;
  toClassification: "mvp" | "production" | "public_real_money";
  requestedBy: string;
  approvedByProduct: string | null;
  approvedByPayments: string | null;
  approvedByLegal: string | null;
  approvedByTrustSafety: string | null;
  approvedByGovernance: string | null;
  approvalState: DonationCancellationPromotionApprovalState;
  approvedAt: string | null;
  notes: string;
  promotionHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface DonationCancellationCapabilityInput {
  action: DonationCancellationCapabilityAction;
  actor: DonationCancellationCapabilityActor;
  environment: DonationCancellationDeploymentEnvironment;
  featureEnabled?: boolean;
  labsEnabled?: boolean;
  liveMoneyEnabled?: boolean;
  paymentMode?: DonationCancellationPaymentMode;
  promotionRecord?: FeaturePromotionRecord | null;
  providerAuthorizationSupported?: boolean;
  compliantCaptureSupported?: boolean;
  legalComplianceReady?: boolean;
  trustSafetyReady?: boolean;
  copyPreflightPassed?: boolean;
  capsConfigured?: boolean;
  pausedLanes?: DonationCancellationPauseLane[];
}

export interface DonationCancellationCapabilityDecision {
  ok: boolean;
  action: DonationCancellationCapabilityAction;
  classification: DonationCancellationFeatureClassification;
  deploymentStage: DonationCancellationDeploymentStage;
  reasons: DonationCancellationGateReason[];
  userFacingSummary: string;
}

export const DONATION_CANCELLATION_JOB_ACTIONS: Record<
  DonationCancellationBackgroundJob,
  DonationCancellationCapabilityAction
> = {
  deadline_job: "open_round",
  matching_job: "run_matching",
  payment_retry_job: "authorize_payment",
  public_report_job: "publish_public_report",
  receipt_job: "publish_public_report",
  redirect_suggestion_job: "create_redirect_suggestion",
  routing_job: "route_donation",
  settlement_plan_job: "execute_settlement",
};

export interface DonationCancellationPublicRound {
  slug: string;
  title: string;
  status: DonationCancellationRoundStatus;
  currency: string;
  paymentMode: DonationCancellationPaymentMode;
  paymentCopy: string;
  progressCopy: string;
  featureFlag: typeof DONATION_CANCELLATION_FEATURE_FLAG;
}

export interface DonationCancellationRegistrationInput {
  round: DonationCancellationRound;
  recipients: DonationCancellationRecipient[];
  markets: DonationCancellationOppositionMarket[];
  userId: string;
  intendedRecipientId: string;
  grossAmountMinor: number;
  currency: string;
  redirectConsentMode: DonationCancellationRedirectConsentMode;
  priorityWeights: Record<string, number>;
  acceptableRedirectRecipientIds: string[];
  unacceptableRedirectRecipientIds?: string[];
  paymentMode: DonationCancellationPaymentMode;
  environment: DonationCancellationDeploymentEnvironment;
  featureEnabled?: boolean;
  actor?: DonationCancellationCapabilityActor;
}

export interface DonationCancellationRegistrationResult {
  ok: boolean;
  blockers: string[];
  prioritySnapshot: MoralPrioritySnapshot | null;
  registration: IntendedDonationRegistration | null;
}

export const DONATION_CANCELLATION_BACKEND_REQUIREMENTS = [
  "Supabase persistence for rounds, recipients, opposition markets, priority snapshots, registrations, match groups, allocation rows, suggestions, routing operations, audit reports, and copy preflight reports",
  "RLS: users can read only their own priority snapshots, registrations, allocations, routing status, and receipts",
  "RLS: public can read only approved recipients, approved markets, qualitative pre-close round state, and privacy-thresholded audit reports",
  "Admin/reviewer policies for recipient route verification, market review, copy preflight, legal/safety review, settlement approval, and emergency pause",
  "Provider authorization or compliant captured-funds support before production money movement",
  "Append-only domain event/outbox rows and idempotency keys before registration, capture, routing, support fallback, receipt, or report publication",
] as const;

export const DONATION_CANCELLATION_ADMIN_BLOCKERS = [
  "feature_non_mvp",
  "production_real_money_disabled",
  "missing_promotion_record",
  "public_surface_disabled",
  "live_settlement_disabled",
  "unsupported recipient",
  "blocked recipient route",
  "missing payment route",
  "legal review not approved",
  "safety review not approved",
  "unsupported jurisdiction",
  "payment provider not configured",
  "copy preflight failed",
  "stale settlement plan",
  "ledger mismatch",
  "exact cents mismatch",
  "unauthorized real-money mode",
] as const;

export const DONATION_CANCELLATION_PROMOTION_RECORDS: FeaturePromotionRecord[] = [];

export const DONATION_CANCELLATION_DASHBOARD_STATES = [
  "Draft",
  "Payment needed",
  "Registered",
  "Waiting for round close",
  "Matched; suggestion pending",
  "Redirect accepted by your preferences",
  "Needs your review",
  "Routed to redirect recipient",
  "Routed to intended recipient",
  "Partially redirected",
  "Settled",
  "Blocked",
] as const;

const NOW = "2026-07-06T12:00:00.000Z";

export function hashCanonical(value: unknown) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, inner]) => `${JSON.stringify(key)}:${stableStringify(inner)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function byId<T extends { id: string }>(values: readonly T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function formatMinor(amountMinor: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountMinor / 100);
}

const PUBLIC_SURFACE_ACTIONS = new Set<DonationCancellationCapabilityAction>([
  "view_public_landing",
  "register_intended_donation",
  "save_payment_method",
  "authorize_payment",
  "capture_payment",
  "route_donation",
  "execute_settlement",
  "publish_public_report",
]);

const ADMIN_OR_LABS_ACTIONS = new Set<DonationCancellationCapabilityAction>([
  "view_labs_landing",
  "create_round",
  "open_round",
  "run_matching",
  "create_redirect_suggestion",
  "approve_settlement",
  "seed_demo_data",
]);

const REAL_MONEY_ACTIONS = new Set<DonationCancellationCapabilityAction>([
  "register_intended_donation",
  "save_payment_method",
  "authorize_payment",
  "capture_payment",
  "route_donation",
  "execute_settlement",
]);

const ADMIN_OR_LABS_ROLES = new Set<DonationCancellationActorRole>(["admin", "reviewer", "labs"]);

function uniqueReasons(reasons: DonationCancellationGateReason[]) {
  return [...new Set(reasons)];
}

function hasLabsAccess(actor: DonationCancellationCapabilityActor) {
  return ADMIN_OR_LABS_ROLES.has(actor.role) || Boolean(actor.permissions?.includes(DONATION_CANCELLATION_LABS_PERMISSION));
}

function hasApprovedPromotionRecord(record: FeaturePromotionRecord | null | undefined) {
  return (
    record?.featureKey === DONATION_CANCELLATION_FEATURE_FLAG &&
    record.approvalState === "approved" &&
    Boolean(record.approvedAt) &&
    Boolean(record.approvedByProduct) &&
    Boolean(record.approvedByPayments) &&
    Boolean(record.approvedByLegal) &&
    Boolean(record.approvedByTrustSafety) &&
    Boolean(record.approvedByGovernance)
  );
}

export function getDonationCancellationDeploymentEnvironment(input?: {
  nodeEnv?: string;
  vercelEnv?: string;
}): DonationCancellationDeploymentEnvironment {
  const nodeEnv = input?.nodeEnv ?? process.env.NODE_ENV;
  const vercelEnv = input?.vercelEnv ?? process.env.VERCEL_ENV;

  if (nodeEnv === "test") return "test";
  if (vercelEnv === "preview") return "staging";
  if (nodeEnv === "production") return "production";
  return "development";
}

export function assertDonationCancellationCapability(
  action: DonationCancellationCapabilityAction,
  actor: DonationCancellationCapabilityActor,
  environment: DonationCancellationDeploymentEnvironment,
  options: Omit<DonationCancellationCapabilityInput, "action" | "actor" | "environment"> = {},
): DonationCancellationCapabilityDecision {
  const reasons: DonationCancellationGateReason[] = [];
  const featureEnabled = options.featureEnabled ?? DONATION_CANCELLATION_FEATURE_CLASSIFICATION.defaultEnabled;
  const labsEnabled = options.labsEnabled ?? environment !== "production";
  const paymentMode = options.paymentMode ?? "dev_simulated_capture";
  const pausedLanes = options.pausedLanes ?? [];
  const simulatedDevFlow =
    environment !== "production" &&
    featureEnabled &&
    paymentMode === "dev_simulated_capture" &&
    [
      "register_intended_donation",
      "authorize_payment",
      "capture_payment",
      "route_donation",
      "execute_settlement",
    ].includes(action);
  const actionMovesRealMoney = REAL_MONEY_ACTIONS.has(action) && !simulatedDevFlow;

  if (pausedLanes.includes("all_feature_activity")) {
    reasons.push("emergency_pause_all_feature_activity");
  }
  if (!featureEnabled) {
    reasons.push("feature_disabled");
  }
  if (DONATION_CANCELLATION_FEATURE_CLASSIFICATION.featureClassification === "non_mvp") {
    reasons.push("feature_non_mvp");
  }
  if (PUBLIC_SURFACE_ACTIONS.has(action) && environment === "production") {
    reasons.push("public_surface_disabled");
  }
  if (
    PUBLIC_SURFACE_ACTIONS.has(action) &&
    environment === "production" &&
    !DONATION_CANCELLATION_FEATURE_CLASSIFICATION.productionPublicEnabled
  ) {
    reasons.push("public_surface_disabled");
  }
  if (ADMIN_OR_LABS_ACTIONS.has(action) && !hasLabsAccess(actor)) {
    reasons.push("insufficient_role");
  }
  if (ADMIN_OR_LABS_ACTIONS.has(action) && !labsEnabled) {
    reasons.push("route_not_available_in_current_deployment");
  }
  if (action === "seed_demo_data" && environment === "production") {
    reasons.push("route_not_available_in_current_deployment");
  }
  if (action === "open_round" && environment === "production") {
    reasons.push("public_surface_disabled");
  }
  if (environment === "production" && paymentMode === "dev_simulated_capture" && actionMovesRealMoney) {
    reasons.push("payment_mode_not_allowed_for_non_mvp");
  }
  if (actionMovesRealMoney) {
    if (!DONATION_CANCELLATION_FEATURE_CLASSIFICATION.productionRealMoneyEnabled || environment === "production") {
      reasons.push("production_real_money_disabled");
    }
    if (paymentMode !== "dev_simulated_capture") {
      reasons.push("payment_mode_not_allowed_for_non_mvp");
    }
    if (!hasApprovedPromotionRecord(options.promotionRecord)) {
      reasons.push("missing_promotion_record");
    }
    if (!options.liveMoneyEnabled) {
      reasons.push("production_real_money_disabled");
    }
    if (paymentMode === "provider_authorization_then_capture" && !options.providerAuthorizationSupported) {
      reasons.push("provider_authorization_not_configured");
    }
    if (paymentMode === "provider_capture_to_compliant_clearing_account" && !options.compliantCaptureSupported) {
      reasons.push("compliant_clearing_account_not_configured");
    }
    if (!options.legalComplianceReady) {
      reasons.push("legal_compliance_not_ready");
    }
    if (!options.trustSafetyReady) {
      reasons.push("trust_safety_not_ready");
    }
    if (!options.copyPreflightPassed) {
      reasons.push("copy_preflight_not_passed");
    }
    if (!options.capsConfigured) {
      reasons.push("caps_not_configured");
    }
  }

  const uniqueBlockers = uniqueReasons(reasons);
  const ok =
    uniqueBlockers.length === 0 ||
    (simulatedDevFlow &&
      ["user", "admin", "reviewer", "labs"].includes(actor.role) &&
      uniqueBlockers.every((reason) => reason === "feature_non_mvp")) ||
    (labsEnabled &&
      featureEnabled &&
      paymentMode === "dev_simulated_capture" &&
      hasLabsAccess(actor) &&
      ["view_labs_landing", "create_round", "run_matching", "create_redirect_suggestion", "approve_settlement"].includes(action) &&
      uniqueBlockers.every((reason) => reason === "feature_non_mvp"));

  return {
    action,
    classification: DONATION_CANCELLATION_FEATURE_CLASSIFICATION.featureClassification,
    deploymentStage: DONATION_CANCELLATION_FEATURE_CLASSIFICATION.deploymentStage,
    ok,
    reasons: ok ? [] : uniqueBlockers,
    userFacingSummary: ok
      ? DONATION_CANCELLATION_NON_MVP_BANNER
      : DONATION_CANCELLATION_NON_MVP_WARNING,
  };
}

export function getDonationCancellationProductionPublicDecision() {
  return assertDonationCancellationCapability(
    "view_public_landing",
    { role: "public" },
    "production",
    {
      featureEnabled: DONATION_CANCELLATION_FEATURE_CLASSIFICATION.defaultEnabled,
      labsEnabled: false,
    },
  );
}

export function assertDonationCancellationJobCapability(
  job: DonationCancellationBackgroundJob,
  actor: DonationCancellationCapabilityActor,
  environment: DonationCancellationDeploymentEnvironment,
  options: Omit<DonationCancellationCapabilityInput, "action" | "actor" | "environment"> = {},
) {
  return assertDonationCancellationCapability(
    DONATION_CANCELLATION_JOB_ACTIONS[job],
    actor,
    environment,
    options,
  );
}

function quoteFeeMinor(_amountMinor: number) {
  return 0;
}

function isEligiblePaymentState(paymentState: DonationCancellationPaymentState) {
  return paymentState === "captured_pending_routing" || paymentState === "provider_authorized_exact";
}

function isApprovedRecipient(recipient: DonationCancellationRecipient | null | undefined) {
  return Boolean(
    recipient &&
      recipient.isActive &&
      recipient.reviewState === "approved" &&
      recipient.paymentRouteState === "verified" &&
      recipient.sanctionsAmlState === "clear",
  );
}

function isActiveMarket(market: DonationCancellationOppositionMarket | undefined) {
  return Boolean(
    market &&
      market.status === "active" &&
      market.legalReviewState === "approved" &&
      market.safetyReviewState === "approved" &&
      market.publicCopyReviewState === "approved",
  );
}

function sideForRecipient(market: DonationCancellationOppositionMarket, recipientId: string): DonationCancellationSide {
  if (market.sideARecipientIds.includes(recipientId)) return "side_a";
  if (market.sideBRecipientIds.includes(recipientId)) return "side_b";
  return "none";
}

export const DONATION_CANCELLATION_SEED_RECIPIENTS: DonationCancellationRecipient[] = [
  {
    causeAreaTags: ["demo_issue_a", "institutional_resilience"],
    createdAt: NOW,
    id: "fictional-watershed-restoration-a",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Fictional Watershed Restoration A",
    oppositionSideIds: ["demo-side-a"],
    paymentRouteRef: "dev-route-fictional-watershed-a",
    paymentRouteState: "verified",
    publicDescription: "Dev-only non-political charity placeholder for one side of an admin-reviewed opposed issue.",
    publicGoodTags: ["environment", "public_knowledge"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["demo_issue_b", "institutional_resilience"],
    createdAt: NOW,
    id: "fictional-watershed-restoration-b",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Fictional Watershed Restoration B",
    oppositionSideIds: ["demo-side-b"],
    paymentRouteRef: "dev-route-fictional-watershed-b",
    paymentRouteState: "verified",
    publicDescription: "Dev-only non-political charity placeholder for the opposed side of the demo issue.",
    publicGoodTags: ["environment", "public_knowledge"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["global_health", "humanitarian"],
    createdAt: NOW,
    id: "global-poverty-charity",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Global poverty charity",
    oppositionSideIds: [],
    paymentRouteRef: "dev-route-global-poverty",
    paymentRouteState: "verified",
    publicDescription: "Approved redirect recipient for global poverty and global health priorities.",
    publicGoodTags: ["humanitarian", "global_health"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["animal_welfare"],
    createdAt: NOW,
    id: "animal-welfare-charity",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Animal welfare charity",
    oppositionSideIds: [],
    paymentRouteRef: "dev-route-animal-welfare",
    paymentRouteState: "verified",
    publicDescription: "Approved redirect recipient for animal welfare priorities.",
    publicGoodTags: ["animal_welfare"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["public_knowledge"],
    createdAt: NOW,
    id: "public-knowledge-charity",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Public knowledge charity",
    oppositionSideIds: [],
    paymentRouteRef: "dev-route-public-knowledge",
    paymentRouteState: "verified",
    publicDescription: "Approved redirect recipient for open knowledge and research priorities.",
    publicGoodTags: ["public_knowledge"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["long_run_future"],
    createdAt: NOW,
    id: "long-run-future-charity",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Long-run future charity",
    oppositionSideIds: [],
    paymentRouteRef: "dev-route-long-run-future",
    paymentRouteState: "verified",
    publicDescription: "Approved redirect recipient for long-run future priorities.",
    publicGoodTags: ["long_run_future"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["global_health"],
    createdAt: NOW,
    id: "route-blocked-health-charity",
    isActive: true,
    jurisdiction: "US-DEMO",
    name: "Route-blocked global health placeholder",
    oppositionSideIds: [],
    paymentRouteRef: null,
    paymentRouteState: "blocked",
    publicDescription: "Dev seed recipient whose payment route is blocked before settlement.",
    publicGoodTags: ["global_health"],
    recipientType: "charity",
    reviewState: "approved",
    sanctionsAmlState: "clear",
    taxReceiptPolicySnapshotJson: { mode: "dev_only_no_tax_claim" },
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["blocked_political_placeholder"],
    createdAt: NOW,
    devOnly: true,
    id: "gun-rights-advocacy-placeholder",
    isActive: false,
    jurisdiction: "US-DEMO",
    name: "Gun rights advocacy placeholder",
    oppositionSideIds: [],
    paymentRouteRef: null,
    paymentRouteState: "blocked",
    productionBlockedReason: "Political, lobbying, election, and campaign contribution flows are hard-blocked in v0.1.",
    publicDescription: "Blocked dev placeholder. Not seedable for production routing.",
    publicGoodTags: [],
    recipientType: "advocacy_non_election",
    reviewState: "blocked",
    sanctionsAmlState: "blocked",
    taxReceiptPolicySnapshotJson: null,
    updatedAt: NOW,
    websiteUrl: null,
  },
  {
    causeAreaTags: ["blocked_political_placeholder"],
    createdAt: NOW,
    devOnly: true,
    id: "gun-control-advocacy-placeholder",
    isActive: false,
    jurisdiction: "US-DEMO",
    name: "Gun control advocacy placeholder",
    oppositionSideIds: [],
    paymentRouteRef: null,
    paymentRouteState: "blocked",
    productionBlockedReason: "Political, lobbying, election, and campaign contribution flows are hard-blocked in v0.1.",
    publicDescription: "Blocked dev placeholder. Not seedable for production routing.",
    publicGoodTags: [],
    recipientType: "advocacy_non_election",
    reviewState: "blocked",
    sanctionsAmlState: "blocked",
    taxReceiptPolicySnapshotJson: null,
    updatedAt: NOW,
    websiteUrl: null,
  },
];

export const DONATION_CANCELLATION_SEED_MARKETS: DonationCancellationOppositionMarket[] = [
  {
    allowedRedirectRecipientIds: [
      "global-poverty-charity",
      "animal-welfare-charity",
      "public-knowledge-charity",
      "long-run-future-charity",
      "route-blocked-health-charity",
    ],
    createdAt: NOW,
    createdBy: "seed-admin",
    id: "fictional-watershed-opposition-market",
    legalReviewState: "approved",
    matchingRatioBpsAToB: 10_000,
    prohibitedRecipientIds: [],
    publicCopyReviewState: "approved",
    rulebookHash: DONATION_CANCELLATION_RULEBOOK_HASH,
    safetyReviewState: "approved",
    sideALabel: "Watershed restoration A",
    sideARecipientIds: ["fictional-watershed-restoration-a"],
    sideBLabel: "Watershed restoration B",
    sideBRecipientIds: ["fictional-watershed-restoration-b"],
    status: "active",
    summary: "Admin-reviewed fictional opposed charity pair for non-political dev matching.",
    title: "Fictional watershed demo opposition",
    updatedAt: NOW,
  },
  {
    allowedRedirectRecipientIds: [],
    createdAt: NOW,
    createdBy: "seed-admin",
    id: "blocked-political-placeholder-market",
    legalReviewState: "blocked",
    matchingRatioBpsAToB: 10_000,
    prohibitedRecipientIds: ["gun-rights-advocacy-placeholder", "gun-control-advocacy-placeholder"],
    publicCopyReviewState: "blocked",
    rulebookHash: DONATION_CANCELLATION_RULEBOOK_HASH,
    safetyReviewState: "blocked",
    sideALabel: "Blocked political placeholder A",
    sideARecipientIds: ["gun-rights-advocacy-placeholder"],
    sideBLabel: "Blocked political placeholder B",
    sideBRecipientIds: ["gun-control-advocacy-placeholder"],
    status: "blocked",
    summary: "Blocked placeholder. v0.1 does not support political, election, campaign, vote-buying, or lobbying trades.",
    title: "Blocked political placeholder market",
    updatedAt: NOW,
  },
];

export const DONATION_CANCELLATION_SEED_ROUNDS: DonationCancellationRound[] = [
  {
    closesAt: "2026-08-15T00:00:00.000Z",
    copyPreflightState: "passed",
    createdAt: NOW,
    createdBy: "seed-admin",
    currency: "usd",
    description:
      "Development round for registering intended donations, matching opposed amounts, and routing unmatched money to the original intended recipient.",
    featureFlag: DONATION_CANCELLATION_FEATURE_FLAG,
    feePolicyHash: DONATION_CANCELLATION_FEE_POLICY_HASH,
    id: "round-dev-open",
    matchingAlgorithmVersion: DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION,
    opensAt: "2026-07-06T00:00:00.000Z",
    parametersFrozenAt: "2026-07-06T00:00:00.000Z",
    paymentMode: "dev_simulated_capture",
    perUserGrossMaxMinor: 50_000,
    perUserGrossMinMinor: 500,
    publicProgressMode: "qualitative_only_before_close",
    roundGrossCapMinor: 500_000,
    routingDeadlineAt: "2026-08-22T00:00:00.000Z",
    rulebookHash: DONATION_CANCELLATION_RULEBOOK_HASH,
    slug: "dev-donation-clearinghouse",
    status: "open",
    suggestionAlgorithmVersion: DONATION_CANCELLATION_SUGGESTION_ALGORITHM_VERSION,
    title: "Donation clearinghouse development round",
    updatedAt: NOW,
  },
  {
    closesAt: "2026-07-01T00:00:00.000Z",
    copyPreflightState: "passed",
    createdAt: NOW,
    createdBy: "seed-admin",
    currency: "usd",
    description: "Settled dev examples for equal, unequal, no-common-redirect, unmatched, payment-failure, and route-blocked cases.",
    featureFlag: DONATION_CANCELLATION_FEATURE_FLAG,
    feePolicyHash: DONATION_CANCELLATION_FEE_POLICY_HASH,
    id: "round-dev-settled",
    matchingAlgorithmVersion: DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION,
    opensAt: "2026-06-01T00:00:00.000Z",
    parametersFrozenAt: "2026-06-01T00:00:00.000Z",
    paymentMode: "dev_simulated_capture",
    perUserGrossMaxMinor: 50_000,
    perUserGrossMinMinor: 500,
    publicProgressMode: "qualitative_only_before_close",
    roundGrossCapMinor: 500_000,
    routingDeadlineAt: "2026-07-08T00:00:00.000Z",
    rulebookHash: DONATION_CANCELLATION_RULEBOOK_HASH,
    slug: "settled-demo-donation-clearinghouse",
    status: "settled",
    suggestionAlgorithmVersion: DONATION_CANCELLATION_SUGGESTION_ALGORITHM_VERSION,
    title: "Settled donation clearinghouse demo",
    updatedAt: NOW,
  },
];

function buildPrioritySnapshot(
  id: string,
  userId: string,
  roundId: string,
  priorityWeights: Record<string, number>,
  acceptableRedirectRecipientIds: string[],
  unacceptableRedirectRecipientIds: string[] = [],
  autoAcceptSuggestions = true,
): MoralPrioritySnapshot {
  const seed = {
    acceptableRedirectRecipientIds,
    autoAcceptSuggestions,
    priorityWeights,
    roundId,
    unacceptableRedirectRecipientIds,
    userId,
    visibility: "aggregate_only",
  };
  return {
    ...seed,
    createdAt: NOW,
    id,
    minCommonGroundScore: null,
    snapshotHash: hashCanonical(seed),
    updatedAt: NOW,
    visibility: "aggregate_only",
  };
}

export const DONATION_CANCELLATION_SEED_PRIORITY_SNAPSHOTS: MoralPrioritySnapshot[] = [
  buildPrioritySnapshot("priority-a-equal", "user-a-equal", "round-dev-settled", { global_health: 80, animal_welfare: 10 }, ["global-poverty-charity", "animal-welfare-charity"]),
  buildPrioritySnapshot("priority-b-equal", "user-b-equal", "round-dev-settled", { global_health: 75, public_knowledge: 10 }, ["global-poverty-charity", "public-knowledge-charity"]),
  buildPrioritySnapshot("priority-a-surplus", "user-a-surplus", "round-dev-settled", { animal_welfare: 90 }, ["animal-welfare-charity", "global-poverty-charity"]),
  buildPrioritySnapshot("priority-b-surplus", "user-b-surplus", "round-dev-settled", { animal_welfare: 80 }, ["animal-welfare-charity"]),
  buildPrioritySnapshot("priority-a-no-common", "user-a-no-common", "round-dev-settled", { animal_welfare: 90 }, ["animal-welfare-charity"], []),
  buildPrioritySnapshot("priority-b-no-common", "user-b-no-common", "round-dev-settled", { public_knowledge: 90 }, ["public-knowledge-charity"], []),
  buildPrioritySnapshot("priority-a-unmatched", "user-a-unmatched", "round-dev-settled", { global_health: 90 }, ["global-poverty-charity"], []),
  buildPrioritySnapshot("priority-a-payment-failed", "user-a-payment-failed", "round-dev-settled", { global_health: 90 }, ["global-poverty-charity"], []),
  buildPrioritySnapshot("priority-a-route-blocked", "user-a-route-blocked", "round-dev-settled", { global_health: 90 }, ["route-blocked-health-charity", "global-poverty-charity"], []),
  buildPrioritySnapshot("priority-b-route-blocked", "user-b-route-blocked", "round-dev-settled", { global_health: 90 }, ["route-blocked-health-charity", "global-poverty-charity"], []),
];

function registration(
  id: string,
  userId: string,
  intendedRecipientId: string,
  side: DonationCancellationSide,
  amountMinor: number,
  priorityId: string,
  paymentState: DonationCancellationPaymentState = "captured_pending_routing",
  redirectConsentMode: DonationCancellationRedirectConsentMode = "preconsented_allowed_list",
): IntendedDonationRegistration {
  const fee = quoteFeeMinor(amountMinor);
  return {
    createdAt: NOW,
    currency: "usd",
    estimatedFeeMinor: fee,
    estimatedNetMinor: amountMinor - fee,
    fallbackMode: "intended_destination",
    feePolicyHashAtConsent: DONATION_CANCELLATION_FEE_POLICY_HASH,
    finalReviewConfirmedAt: NOW,
    fundingSourceCommitmentId: `funding-${id}`,
    grossAmountMinor: amountMinor,
    id,
    identitySnapshotId: `identity-${userId}`,
    intendedOppositionMarketId: "fictional-watershed-opposition-market",
    intendedRecipientId,
    intendedSide: side,
    moralPrioritySnapshotId: priorityId,
    paymentOperationId: paymentState === "payment_failed" ? null : `payment-${id}`,
    paymentState,
    redirectConsentMode,
    registrationState:
      paymentState === "payment_failed"
        ? "excluded_payment"
        : paymentState === "provider_authorized_exact"
          ? "authorized_registered"
          : "paid_registered",
    roundId: "round-dev-settled",
    rulebookHashAtConsent: DONATION_CANCELLATION_RULEBOOK_HASH,
    updatedAt: NOW,
    userAttestationChecked: true,
    userAttestationTextVersion: "donation-cancellation-attestation-v0.1",
    userId,
  };
}

export const DONATION_CANCELLATION_SEED_REGISTRATIONS: IntendedDonationRegistration[] = [
  registration("reg-equal-a", "user-a-equal", "fictional-watershed-restoration-a", "side_a", 10_000, "priority-a-equal"),
  registration("reg-equal-b", "user-b-equal", "fictional-watershed-restoration-b", "side_b", 10_000, "priority-b-equal"),
  registration("reg-surplus-a", "user-a-surplus", "fictional-watershed-restoration-a", "side_a", 15_000, "priority-a-surplus"),
  registration("reg-surplus-b", "user-b-surplus", "fictional-watershed-restoration-b", "side_b", 10_000, "priority-b-surplus"),
  registration("reg-no-common-a", "user-a-no-common", "fictional-watershed-restoration-a", "side_a", 10_000, "priority-a-no-common"),
  registration("reg-no-common-b", "user-b-no-common", "fictional-watershed-restoration-b", "side_b", 10_000, "priority-b-no-common"),
  registration("reg-unmatched-a", "user-a-unmatched", "fictional-watershed-restoration-a", "side_a", 8_000, "priority-a-unmatched"),
  registration("reg-payment-failed", "user-a-payment-failed", "fictional-watershed-restoration-a", "side_a", 7_000, "priority-a-payment-failed", "payment_failed"),
  registration("reg-route-blocked-a", "user-a-route-blocked", "fictional-watershed-restoration-a", "side_a", 9_000, "priority-a-route-blocked"),
  registration("reg-route-blocked-b", "user-b-route-blocked", "fictional-watershed-restoration-b", "side_b", 9_000, "priority-b-route-blocked"),
];

export function getDonationCancellationRounds(options: {
  environment?: DonationCancellationDeploymentEnvironment;
  includeNonMvpLabs?: boolean;
} = {}) {
  if (options.environment === "production" && !options.includeNonMvpLabs) {
    return [];
  }
  return DONATION_CANCELLATION_SEED_ROUNDS;
}

export function getDonationCancellationRoundBySlug(
  slug: string,
  options: {
    environment?: DonationCancellationDeploymentEnvironment;
    includeNonMvpLabs?: boolean;
  } = {},
) {
  return getDonationCancellationRounds(options).find((round) => round.slug === slug) ?? null;
}

export function getDonationCancellationRecipients() {
  return DONATION_CANCELLATION_SEED_RECIPIENTS;
}

export function getDonationCancellationMarkets() {
  return DONATION_CANCELLATION_SEED_MARKETS;
}

export function getDonationCancellationSeedData(options: {
  environment: DonationCancellationDeploymentEnvironment;
  includeDevFixtures?: boolean;
}) {
  if (options.environment === "production") {
    return {
      markets: DONATION_CANCELLATION_SEED_MARKETS.map((market) => ({
        ...market,
        status: market.status === "active" ? "blocked" as const : market.status,
      })),
      prioritySnapshots: [] as MoralPrioritySnapshot[],
      recipients: DONATION_CANCELLATION_SEED_RECIPIENTS.map((recipient) => ({
        ...recipient,
        isActive: false,
        paymentRouteRef: null,
        paymentRouteState: "blocked" as const,
        productionBlockedReason:
          recipient.productionBlockedReason ?? "Donation Cancellation Clearinghouse is non-MVP and production seeds are disabled.",
      })),
      registrations: [] as IntendedDonationRegistration[],
      rounds: DONATION_CANCELLATION_SEED_ROUNDS.map((round) => ({
        ...round,
        paymentMode: "dev_simulated_capture" as const,
        status: "blocked" as const,
      })),
    };
  }

  if (!options.includeDevFixtures) {
    return {
      markets: [] as DonationCancellationOppositionMarket[],
      prioritySnapshots: [] as MoralPrioritySnapshot[],
      recipients: [] as DonationCancellationRecipient[],
      registrations: [] as IntendedDonationRegistration[],
      rounds: [] as DonationCancellationRound[],
    };
  }

  return {
    markets: DONATION_CANCELLATION_SEED_MARKETS,
    prioritySnapshots: DONATION_CANCELLATION_SEED_PRIORITY_SNAPSHOTS,
    recipients: DONATION_CANCELLATION_SEED_RECIPIENTS,
    registrations: DONATION_CANCELLATION_SEED_REGISTRATIONS,
    rounds: DONATION_CANCELLATION_SEED_ROUNDS,
  };
}

export function getDonationCancellationPublicRound(round: DonationCancellationRound): DonationCancellationPublicRound {
  return {
    currency: round.currency,
    featureFlag: DONATION_CANCELLATION_FEATURE_FLAG,
    paymentCopy: paymentModeCopy(round.paymentMode),
    paymentMode: round.paymentMode,
    progressCopy:
      round.status === "settled"
        ? "Settled public report is available after privacy checks."
        : "Progress is qualitative before close; exact small-group gaps stay sealed.",
    slug: round.slug,
    status: round.status,
    title: round.title,
  };
}

export function paymentModeCopy(mode: DonationCancellationPaymentMode) {
  if (mode === "dev_simulated_capture") {
    return "Development uses simulated payment-backed registrations. Production money movement is blocked until provider and compliance gates pass.";
  }
  if (mode === "provider_authorization_then_capture") {
    return "Payment method is authorized first; capture happens only when settlement is payable.";
  }
  return "Captured funds require compliant clearing-account support and restricted-liability ledger records.";
}

export function evaluateDonationCancellationCapabilities(input: {
  environment: "development" | "production" | "test";
  featureFlagEnabled: boolean;
  paymentMode: DonationCancellationPaymentMode;
  compliantCaptureSupported: boolean;
  providerAuthorizationSupported: boolean;
  pausedLanes?: DonationCancellationPauseLane[];
}): DonationCancellationCapabilityEvaluation {
  const blockers: DonationCancellationGateReason[] = [];
  const pausedLanes = input.pausedLanes ?? [];

  if (!input.featureFlagEnabled) blockers.push("feature_disabled");
  if (pausedLanes.includes("all_feature_activity")) {
    return {
      blockers: ["emergency_pause_all_feature_activity"],
      paymentMode: input.paymentMode,
      status: "paused",
      userFacingSummary: "Feature activity is paused. Existing receipts and support access remain visible.",
    };
  }
  if (input.environment === "production" && input.paymentMode === "dev_simulated_capture") {
    blockers.push("payment_mode_not_allowed_for_non_mvp");
    blockers.push("production_real_money_disabled");
  }
  if (
    input.paymentMode === "provider_authorization_then_capture" &&
    !input.providerAuthorizationSupported
  ) {
    blockers.push("provider_authorization_not_configured");
  }
  if (
    input.paymentMode === "provider_capture_to_compliant_clearing_account" &&
    !input.compliantCaptureSupported
  ) {
    blockers.push("compliant_clearing_account_not_configured");
  }

  if (blockers.length) {
    return {
      blockers,
      paymentMode: input.paymentMode,
      status: "blocked",
      userFacingSummary: "Donation clearinghouse money movement is not available until provider and compliance gates pass.",
    };
  }

  return {
    blockers: [],
    paymentMode: input.paymentMode,
    status: input.paymentMode === "dev_simulated_capture" ? "dev_simulated" : "enabled",
    userFacingSummary:
      input.paymentMode === "dev_simulated_capture"
        ? "Development registration uses simulated payment confirmation only."
        : paymentModeCopy(input.paymentMode),
  };
}

function eligibleRegistrationsForMarket(input: {
  roundId: string;
  market: DonationCancellationOppositionMarket;
  recipients: DonationCancellationRecipient[];
  registrations: IntendedDonationRegistration[];
}) {
  const recipientMap = byId(input.recipients);
  return input.registrations.filter((registration) => {
    if (registration.roundId !== input.roundId) return false;
    if (registration.intendedOppositionMarketId !== input.market.id) return false;
    if (!isEligiblePaymentState(registration.paymentState)) return false;
    if (!["paid_registered", "authorized_registered"].includes(registration.registrationState)) return false;
    if (!isApprovedRecipient(recipientMap.get(registration.intendedRecipientId))) return false;
    return sideForRecipient(input.market, registration.intendedRecipientId) !== "none";
  });
}

function allocateMatchedMinor(registrations: IntendedDonationRegistration[], matchedMinor: number) {
  const total = registrations.reduce((sum, registration) => sum + registration.grossAmountMinor, 0);
  if (total <= 0 || matchedMinor <= 0) return Object.fromEntries(registrations.map((registration) => [registration.id, 0]));
  if (matchedMinor >= total) {
    return Object.fromEntries(registrations.map((registration) => [registration.id, registration.grossAmountMinor]));
  }

  const floors = registrations.map((registration) => {
    const numerator = BigInt(registration.grossAmountMinor) * BigInt(matchedMinor);
    const denominator = BigInt(total);
    return {
      floor: Number(numerator / denominator),
      id: registration.id,
      remainder: Number(numerator % denominator),
    };
  });
  let remainder = matchedMinor - floors.reduce((sum, row) => sum + row.floor, 0);
  const allocation = Object.fromEntries(floors.map((row) => [row.id, row.floor]));
  for (const row of [...floors].sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id))) {
    if (remainder <= 0) break;
    allocation[row.id] += 1;
    remainder -= 1;
  }
  return allocation;
}

export function computeDonationCancellationMatchGroups(input: {
  round: DonationCancellationRound;
  markets: DonationCancellationOppositionMarket[];
  recipients: DonationCancellationRecipient[];
  registrations: IntendedDonationRegistration[];
  now?: string;
}): DonationCancellationMatchGroup[] {
  return input.markets
    .filter((market) => isActiveMarket(market))
    .map((market) => {
      const eligible = eligibleRegistrationsForMarket({
        market,
        recipients: input.recipients,
        registrations: input.registrations,
        roundId: input.round.id,
      });
      const sideA = eligible.filter((registration) => sideForRecipient(market, registration.intendedRecipientId) === "side_a");
      const sideB = eligible.filter((registration) => sideForRecipient(market, registration.intendedRecipientId) === "side_b");
      const sideATotal = sideA.reduce((sum, registration) => sum + registration.grossAmountMinor, 0);
      const sideBTotal = sideB.reduce((sum, registration) => sum + registration.grossAmountMinor, 0);
      const matched = Math.min(sideATotal, sideBTotal);
      const sideAAllocation = allocateMatchedMinor(sideA, matched);
      const sideBAllocation = allocateMatchedMinor(sideB, matched);
      const allocationByRegistrationId = { ...sideAAllocation, ...sideBAllocation };
      const matchingInputHash = hashCanonical({
        marketId: market.id,
        registrations: eligible.map((registration) => ({
          grossAmountMinor: registration.grossAmountMinor,
          id: registration.id,
          paymentState: registration.paymentState,
          side: sideForRecipient(market, registration.intendedRecipientId),
        })),
        roundId: input.round.id,
      });
      const output = {
        allocationByRegistrationId,
        matched,
        sideATotal,
        sideBTotal,
      };

      return {
        allocationByRegistrationId,
        blockers: [],
        createdAt: input.now ?? NOW,
        id: `${input.round.id}:${market.id}:match`,
        matchingAlgorithmVersion: DONATION_CANCELLATION_MATCHING_ALGORITHM_VERSION,
        matchingInputHash,
        matchingOutputHash: hashCanonical(output),
        oppositionMarketId: market.id,
        roundId: input.round.id,
        sideAMatchedMinor: matched,
        sideATotalEligibleMinor: sideATotal,
        sideAUnmatchedMinor: Math.max(0, sideATotal - matched),
        sideBMatchedMinor: matched,
        sideBTotalEligibleMinor: sideBTotal,
        sideBUnmatchedMinor: Math.max(0, sideBTotal - matched),
        status: "computed",
        updatedAt: input.now ?? NOW,
      };
    });
}

function priorityFit(snapshot: MoralPrioritySnapshot, recipient: DonationCancellationRecipient) {
  const weights = Object.entries(snapshot.priorityWeights).filter(([, value]) => value > 0);
  const total = weights.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return 0;
  const tags = new Set([...recipient.causeAreaTags, ...recipient.publicGoodTags]);
  const matched = weights
    .filter(([key]) => tags.has(key))
    .reduce((sum, [, value]) => sum + value, 0);
  return Math.max(0, Math.min(1, matched / total));
}

function candidateIsCompatible(input: {
  recipient: DonationCancellationRecipient;
  market: DonationCancellationOppositionMarket;
  snapshots: MoralPrioritySnapshot[];
}) {
  if (!isApprovedRecipient(input.recipient)) return false;
  if (!input.market.allowedRedirectRecipientIds.includes(input.recipient.id)) return false;
  if (input.market.prohibitedRecipientIds.includes(input.recipient.id)) return false;
  return input.snapshots.every(
    (snapshot) =>
      snapshot.acceptableRedirectRecipientIds.includes(input.recipient.id) &&
      !snapshot.unacceptableRedirectRecipientIds.includes(input.recipient.id),
  );
}

export function selectDonationCancellationRedirectSuggestion(input: {
  round: DonationCancellationRound;
  matchGroup: DonationCancellationMatchGroup;
  market: DonationCancellationOppositionMarket;
  recipients: DonationCancellationRecipient[];
  registrations: IntendedDonationRegistration[];
  prioritySnapshots: MoralPrioritySnapshot[];
  now?: string;
}): RedirectSuggestion | null {
  const snapshotMap = byId(input.prioritySnapshots);
  const matchedRegistrations = input.registrations.filter(
    (registration) => (input.matchGroup.allocationByRegistrationId[registration.id] ?? 0) > 0,
  );
  const snapshots = matchedRegistrations
    .map((registration) => snapshotMap.get(registration.moralPrioritySnapshotId))
    .filter((snapshot): snapshot is MoralPrioritySnapshot => Boolean(snapshot));
  if (!snapshots.length) return null;

  const candidates = input.recipients
    .filter((recipient) => candidateIsCompatible({ market: input.market, recipient, snapshots }))
    .map((recipient) => {
      const scores = snapshots.map((snapshot) => priorityFit(snapshot, recipient));
      return {
        recipient,
        minScore: Math.min(...scores),
        sumScore: scores.reduce((sum, score) => sum + score, 0),
      };
    })
    .sort(
      (left, right) =>
        right.minScore - left.minScore ||
        right.sumScore - left.sumScore ||
        (left.recipient.estimatedFeeMinor ?? 0) - (right.recipient.estimatedFeeMinor ?? 0) ||
        left.recipient.id.localeCompare(right.recipient.id),
    );
  const winner = candidates[0];
  if (!winner) return null;

  const sharedTags = winner.recipient.publicGoodTags.slice(0, 2).join(" and ") || "approved redirect constraints";
  const requiresReview = matchedRegistrations.some(
    (registration) => registration.redirectConsentMode === "require_review_before_routing",
  );
  const summary = {
    matchedRegistrationIds: matchedRegistrations.map((registration) => registration.id),
    recipientId: winner.recipient.id,
    snapshots: snapshots.map((snapshot) => snapshot.snapshotHash),
  };

  return {
    commonGroundScoreDecimal: Number(winner.minScore.toFixed(4)),
    createdAt: input.now ?? NOW,
    expiresAt: input.round.routingDeadlineAt,
    id: `${input.matchGroup.id}:suggestion:${winner.recipient.id}`,
    matchGroupId: input.matchGroup.id,
    privateScoreJsonRef: null,
    publicExplanation: `Suggested because it matches both users' approved redirect constraints and shared priorities such as ${sharedTags}.`,
    redirectRecipientId: winner.recipient.id,
    roundId: input.round.id,
    status: requiresReview ? "requires_user_review" : "accepted_by_policy",
    suggestionAlgorithmVersion: DONATION_CANCELLATION_SUGGESTION_ALGORITHM_VERSION,
    updatedAt: input.now ?? NOW,
    userCompatibilitySummaryHash: hashCanonical(summary),
  };
}

function suggestionConsentSatisfied(
  registration: IntendedDonationRegistration,
  suggestion: RedirectSuggestion | null,
  prioritySnapshot: MoralPrioritySnapshot | undefined,
  now: string,
) {
  if (!suggestion || !prioritySnapshot) return false;
  if (suggestion.status !== "accepted_by_policy") return false;
  if (registration.redirectConsentMode === "preconsented_allowed_list") {
    return (
      prioritySnapshot.autoAcceptSuggestions &&
      prioritySnapshot.acceptableRedirectRecipientIds.includes(suggestion.redirectRecipientId)
    );
  }
  return Date.parse(suggestion.expiresAt) >= Date.parse(now);
}

export function buildDonationCancellationSettlementPlan(input: {
  round: DonationCancellationRound;
  markets: DonationCancellationOppositionMarket[];
  recipients: DonationCancellationRecipient[];
  prioritySnapshots: MoralPrioritySnapshot[];
  registrations: IntendedDonationRegistration[];
  now?: string;
}): DonationCancellationSettlementPlan {
  const now = input.now ?? NOW;
  const recipientMap = byId(input.recipients);
  const marketMap = byId(input.markets);
  const snapshotMap = byId(input.prioritySnapshots);
  const matchGroups = computeDonationCancellationMatchGroups(input);
  const redirectSuggestions = matchGroups
    .map((matchGroup) => {
      const market = marketMap.get(matchGroup.oppositionMarketId);
      return market
        ? selectDonationCancellationRedirectSuggestion({
            matchGroup,
            market,
            now,
            prioritySnapshots: input.prioritySnapshots,
            recipients: input.recipients,
            registrations: input.registrations,
            round: input.round,
          })
        : null;
    })
    .filter((suggestion): suggestion is RedirectSuggestion => Boolean(suggestion));
  const suggestionByMatchGroupId = new Map(redirectSuggestions.map((suggestion) => [suggestion.matchGroupId, suggestion]));
  const allocationRows: DonationCancellationAllocationRow[] = [];

  for (const registration of input.registrations.filter((row) => row.roundId === input.round.id && isEligiblePaymentState(row.paymentState))) {
    const matchGroup = matchGroups.find((group) => (group.allocationByRegistrationId[registration.id] ?? 0) > 0);
    const matchedMinor = matchGroup?.allocationByRegistrationId[registration.id] ?? 0;
    const unmatchedMinor = Math.max(0, registration.grossAmountMinor - matchedMinor);
    const suggestion = matchGroup ? suggestionByMatchGroupId.get(matchGroup.id) ?? null : null;
    const prioritySnapshot = snapshotMap.get(registration.moralPrioritySnapshotId);
    const redirectRecipient = suggestion ? recipientMap.get(suggestion.redirectRecipientId) : null;
    const canRedirect =
      matchedMinor > 0 &&
      suggestionConsentSatisfied(registration, suggestion, prioritySnapshot, now) &&
      isApprovedRecipient(redirectRecipient);
    const finalRedirectRouteMinor = canRedirect ? matchedMinor : 0;
    const finalIntendedRouteMinor = unmatchedMinor + (canRedirect ? 0 : matchedMinor);
    const allocationState: DonationCancellationAllocationState =
      matchedMinor === 0
        ? "route_to_intended"
        : canRedirect
          ? unmatchedMinor > 0
            ? "accepted"
            : "route_to_redirect"
          : "route_to_intended";
    const rowWithoutHash = {
      finalIntendedRouteMinor,
      finalRedirectRouteMinor,
      id: `${input.round.id}:${registration.id}:allocation`,
      matchedMinor,
      registrationId: registration.id,
      suggestionId: canRedirect ? suggestion?.id ?? null : null,
      unmatchedMinor,
    };
    allocationRows.push({
      allocatedMatchedMinor: matchedMinor,
      allocatedUnmatchedMinor: unmatchedMinor,
      allocationHash: hashCanonical(rowWithoutHash),
      allocationState,
      createdAt: now,
      feeMinor: registration.estimatedFeeMinor,
      finalIntendedRouteMinor,
      finalRedirectRouteMinor,
      id: rowWithoutHash.id,
      matchGroupId: matchGroup?.id ?? null,
      netToIntendedMinor: Math.max(0, finalIntendedRouteMinor - registration.estimatedFeeMinor),
      netToRedirectMinor: finalRedirectRouteMinor,
      originalIntendedRecipientId: registration.intendedRecipientId,
      redirectRecipientId: canRedirect ? suggestion?.redirectRecipientId ?? null : null,
      redirectSuggestionId: canRedirect ? suggestion?.id ?? null : null,
      registrationId: registration.id,
      roundId: input.round.id,
      updatedAt: now,
      userId: registration.userId,
    });
  }

  const routingOperations = allocationRows.flatMap((row) => {
    const operations: DonationRoutingOperation[] = [];
    if (row.finalIntendedRouteMinor > 0) {
      operations.push({
        createdAt: now,
        currency: input.round.currency,
        destinationRecipientId: row.originalIntendedRecipientId,
        destinationType: "original_intended",
        feeMinor: row.feeMinor,
        grossMinor: row.finalIntendedRouteMinor,
        id: `${row.id}:intended`,
        idempotencyKey: hashCanonical({ destination: "intended", rowId: row.id }),
        netMinor: Math.max(0, row.finalIntendedRouteMinor - row.feeMinor),
        operationState: "pending",
        providerOperationRef: null,
        registrationId: row.registrationId,
        roundId: row.roundId,
        allocationRowId: row.id,
        updatedAt: now,
      });
    }
    if (row.finalRedirectRouteMinor > 0 && row.redirectRecipientId) {
      operations.push({
        createdAt: now,
        currency: input.round.currency,
        destinationRecipientId: row.redirectRecipientId,
        destinationType: "redirect",
        feeMinor: 0,
        grossMinor: row.finalRedirectRouteMinor,
        id: `${row.id}:redirect`,
        idempotencyKey: hashCanonical({ destination: "redirect", rowId: row.id }),
        netMinor: row.finalRedirectRouteMinor,
        operationState: "pending",
        providerOperationRef: null,
        registrationId: row.registrationId,
        roundId: row.roundId,
        allocationRowId: row.id,
        updatedAt: now,
      });
    }
    return operations;
  });
  const registeredGross = input.registrations
    .filter((registration) => registration.roundId === input.round.id && isEligiblePaymentState(registration.paymentState))
    .reduce((sum, registration) => sum + registration.grossAmountMinor, 0);
  const routedGross = allocationRows.reduce((sum, row) => sum + row.finalIntendedRouteMinor + row.finalRedirectRouteMinor, 0);
  const ledgerBalanceStatus = registeredGross === routedGross ? "balanced" : "mismatch";
  const duplicateIdempotencyKeys = routingOperations.length !== new Set(routingOperations.map((operation) => operation.idempotencyKey)).size;
  const blockers = [
    ledgerBalanceStatus === "mismatch" ? "ledger_mismatch" : null,
    duplicateIdempotencyKeys ? "duplicate_idempotency_key" : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
  const settlementInputHash = hashCanonical({
    marketHashes: input.markets.map((market) => market.rulebookHash),
    paymentStates: input.registrations.map((registration) => [registration.id, registration.paymentState]),
    registrations: input.registrations.map((registration) => [registration.id, registration.grossAmountMinor]),
    round: input.round.id,
  });
  const settlementOutputHash = hashCanonical({
    allocationRows: allocationRows.map((row) => row.allocationHash),
    matchGroups: matchGroups.map((group) => group.matchingOutputHash),
    routingOperations: routingOperations.map((operation) => operation.idempotencyKey),
  });

  return {
    allocationRows,
    blockers,
    createdAt: now,
    id: `${input.round.id}:settlement-plan:${settlementOutputHash.slice(7, 19)}`,
    ledgerBalanceStatus,
    matchGroups,
    redirectSuggestions,
    routingOperations,
    roundId: input.round.id,
    settlementInputHash,
    settlementOutputHash,
    status: blockers.length ? "blocked" : "computed",
    updatedAt: now,
  };
}

export function validateDonationCancellationSettlementFreshness(
  approvedPlan: DonationCancellationSettlementPlan,
  recomputedPlan: DonationCancellationSettlementPlan,
) {
  const blockers: string[] = [];
  if (approvedPlan.settlementInputHash !== recomputedPlan.settlementInputHash) blockers.push("settlement_input_hash_changed");
  if (approvedPlan.settlementOutputHash !== recomputedPlan.settlementOutputHash) blockers.push("settlement_output_hash_changed");
  if (recomputedPlan.ledgerBalanceStatus !== "balanced") blockers.push("ledger_mismatch");
  return {
    blockers,
    status: blockers.length ? "blocked" as const : "pass" as const,
  };
}

export function buildDonationCancellationAuditReport(input: {
  round: DonationCancellationRound;
  plan: DonationCancellationSettlementPlan;
  registrations: IntendedDonationRegistration[];
  recipients: DonationCancellationRecipient[];
  publishedAt?: string | null;
}): DonationCancellationAuditReport {
  const recipientMap = byId(input.recipients);
  const recipientTotals = new Map<string, number>();
  for (const operation of input.plan.routingOperations) {
    recipientTotals.set(operation.destinationRecipientId, (recipientTotals.get(operation.destinationRecipientId) ?? 0) + operation.grossMinor);
  }
  const matchedRegistrationIds = new Set(
    input.plan.allocationRows
      .filter((row) => row.allocatedMatchedMinor > 0)
      .map((row) => row.registrationId),
  );
  const redirectRecipientIds = unique(
    input.plan.allocationRows
      .map((row) => row.redirectRecipientId)
      .filter((value): value is string => Boolean(value)),
  );
  const intendedRecipientIds = unique(input.plan.allocationRows.map((row) => row.originalIntendedRecipientId));
  const grossRegistered = input.registrations
    .filter((registration) => registration.roundId === input.round.id && isEligiblePaymentState(registration.paymentState))
    .reduce((sum, registration) => sum + registration.grossAmountMinor, 0);
  const grossMatched = input.plan.allocationRows.reduce((sum, row) => sum + row.allocatedMatchedMinor, 0);
  const grossRedirected = input.plan.allocationRows.reduce((sum, row) => sum + row.finalRedirectRouteMinor, 0);
  const grossIntended = input.plan.allocationRows.reduce((sum, row) => sum + row.finalIntendedRouteMinor, 0);
  const feeMinor = input.plan.allocationRows.reduce((sum, row) => sum + row.feeMinor, 0);

  return {
    feeMinor,
    finalStatus: input.round.status,
    grossMatchedMinor: grossMatched,
    grossRedirectedMinor: grossRedirected,
    grossRegisteredMinor: grossRegistered,
    grossRoutedToIntendedMinor: grossIntended,
    id: `${input.round.id}:audit`,
    intendedRecipientCount: intendedRecipientIds.length,
    matchedRegistrationCount: matchedRegistrationIds.size,
    netToIntendedMinor: grossIntended - feeMinor,
    netToRedirectMinor: grossRedirected,
    paymentFailureCount: input.registrations.filter((registration) => registration.paymentState === "payment_failed").length,
    publicReportJson: {
      label: "opposed donation volume redirected",
      limitations: [
        "Public report is aggregate-only.",
        "Counterparty identities, priority weights, payment references, and private scores are suppressed.",
        "The report does not make a counterfactual impact claim.",
      ],
      recipientTotals: [...recipientTotals.entries()].map(([recipientId, grossMinor]) => ({
        grossMinor,
        label: recipientMap.get(recipientId)?.name ?? "Suppressed recipient",
        recipientId,
      })),
    },
    publishedAt: input.publishedAt ?? null,
    redirectRecipientCount: redirectRecipientIds.length,
    registrationCount: input.registrations.filter((registration) => registration.roundId === input.round.id).length,
    reviewBlockCount: input.registrations.filter((registration) => registration.registrationState === "excluded_review").length,
    roundId: input.round.id,
    unmatchedRegistrationCount: input.plan.allocationRows.filter((row) => row.allocatedMatchedMinor === 0).length,
  };
}

const COPY_PROHIBITED_PATTERNS: Array<[RegExp, string]> = [
  [/\bescrow\b/i, "copy_prohibited_escrow"],
  [/\bcustody\b/i, "copy_prohibited_custody"],
  [/\bguaranteed impact\b/i, "copy_prohibited_guaranteed_impact"],
  [/\bobjective impact\b/i, "copy_prohibited_objective_impact"],
  [/\bmoral score\b/i, "copy_prohibited_moral_score"],
  [/\bpublic moral ranking\b/i, "copy_prohibited_public_moral_ranking"],
  [/\boffset your harm\b/i, "copy_prohibited_offset_your_harm"],
  [/\bpermission\b/i, "copy_prohibited_permission"],
  [/\bvote buying\b/i, "copy_prohibited_vote_buying"],
  [/\bcampaign contribution\b/i, "copy_prohibited_campaign_contribution"],
  [/\bpolitical donation\b/i, "copy_prohibited_political_donation"],
  [/\bguaranteed redirect\b/i, "copy_prohibited_guaranteed_redirect"],
  [/\bregister now\b/i, "copy_prohibited_register_now"],
  [/\bpay now\b/i, "copy_prohibited_pay_now"],
  [/\breal-money available\b/i, "copy_prohibited_real_money_available"],
  [/\bproduction-ready\b/i, "copy_prohibited_production_ready"],
  [/\bactive product\b/i, "copy_prohibited_active_product"],
  [/\bpublic launch\b/i, "copy_prohibited_public_launch"],
];

export function runDonationCancellationCopyPreflight(copy: string): DonationCancellationCopyPreflightReport {
  const blockers = COPY_PROHIBITED_PATTERNS.filter(([pattern]) => pattern.test(copy)).map(([, blocker]) => blocker);
  if (/\bno charge now\b/i.test(copy) && /\bcaptur(?:e|es|ed|ing) now\b/i.test(copy)) {
    blockers.push("copy_payment_overclaim_mixed_charge_language");
  }
  if (/\bcharged now\b/i.test(copy) && /\bauthori[sz](?:e|es|ed|ation)\b/i.test(copy)) {
    blockers.push("copy_payment_overclaim_authorization_language");
  }
  return {
    blockers,
    status: blockers.length ? "failed" : "passed",
  };
}

export function simulateDonationCancellationRegistration(
  input: DonationCancellationRegistrationInput,
): DonationCancellationRegistrationResult {
  const blockers: string[] = [];
  const gate = assertDonationCancellationCapability(
    "register_intended_donation",
    input.actor ?? { role: "user" },
    input.environment,
    {
      featureEnabled: input.featureEnabled ?? false,
      labsEnabled: input.environment !== "production",
      paymentMode: input.paymentMode,
    },
  );
  const recipient = input.recipients.find((candidate) => candidate.id === input.intendedRecipientId);
  const market = input.markets.find((candidate) =>
    candidate.sideARecipientIds.includes(input.intendedRecipientId) ||
    candidate.sideBRecipientIds.includes(input.intendedRecipientId),
  );
  if (!gate.ok) blockers.push(...gate.reasons);
  if (input.currency !== input.round.currency) blockers.push("round_currency_mismatch");
  if (input.grossAmountMinor < input.round.perUserGrossMinMinor) blockers.push("amount_below_round_minimum");
  if (input.grossAmountMinor > input.round.perUserGrossMaxMinor) blockers.push("amount_above_round_maximum");
  if (!isApprovedRecipient(recipient)) blockers.push("recipient_not_approved_or_route_not_verified");
  if (market && !isActiveMarket(market)) blockers.push("opposition_market_not_approved");
  if (input.environment === "production" && input.paymentMode === "dev_simulated_capture") {
    blockers.push("payment_mode_not_allowed_for_non_mvp");
  }

  if (blockers.length || !recipient) {
    return { blockers, ok: false, prioritySnapshot: null, registration: null };
  }

  const prioritySeed = {
    acceptableRedirectRecipientIds: input.acceptableRedirectRecipientIds,
    priorityWeights: input.priorityWeights,
    roundId: input.round.id,
    unacceptableRedirectRecipientIds: input.unacceptableRedirectRecipientIds ?? [],
    userId: input.userId,
  };
  const prioritySnapshot = buildPrioritySnapshot(
    `priority:${hashCanonical(prioritySeed).slice(7, 19)}`,
    input.userId,
    input.round.id,
    input.priorityWeights,
    input.acceptableRedirectRecipientIds,
    input.unacceptableRedirectRecipientIds ?? [],
    input.redirectConsentMode === "preconsented_allowed_list",
  );
  const paymentState: DonationCancellationPaymentState =
    input.paymentMode === "provider_authorization_then_capture"
      ? "provider_authorized_exact"
      : "captured_pending_routing";
  const fee = quoteFeeMinor(input.grossAmountMinor);
  const registrationSeed = {
    grossAmountMinor: input.grossAmountMinor,
    intendedRecipientId: input.intendedRecipientId,
    priorityHash: prioritySnapshot.snapshotHash,
    roundId: input.round.id,
    userId: input.userId,
  };
  const id = `registration:${hashCanonical(registrationSeed).slice(7, 19)}`;

  return {
    blockers: [],
    ok: true,
    prioritySnapshot,
    registration: {
      createdAt: NOW,
      currency: input.round.currency,
      estimatedFeeMinor: fee,
      estimatedNetMinor: input.grossAmountMinor - fee,
      fallbackMode: "intended_destination",
      feePolicyHashAtConsent: input.round.feePolicyHash,
      finalReviewConfirmedAt: NOW,
      fundingSourceCommitmentId: `funding:${id}`,
      grossAmountMinor: input.grossAmountMinor,
      id,
      identitySnapshotId: `identity:${input.userId}`,
      intendedOppositionMarketId: market?.id ?? null,
      intendedRecipientId: input.intendedRecipientId,
      intendedSide: market ? sideForRecipient(market, input.intendedRecipientId) : "none",
      moralPrioritySnapshotId: prioritySnapshot.id,
      paymentOperationId: `payment:${id}`,
      paymentState,
      redirectConsentMode: input.redirectConsentMode,
      registrationState: paymentState === "provider_authorized_exact" ? "authorized_registered" : "paid_registered",
      roundId: input.round.id,
      rulebookHashAtConsent: input.round.rulebookHash,
      updatedAt: NOW,
      userAttestationChecked: true,
      userAttestationTextVersion: "donation-cancellation-attestation-v0.1",
      userId: input.userId,
    },
  };
}

export function getDonationCancellationReceiptCopy(input: {
  registration: IntendedDonationRegistration;
  allocation: DonationCancellationAllocationRow | undefined;
  recipients: DonationCancellationRecipient[];
}) {
  const recipientMap = byId(input.recipients);
  const intended = recipientMap.get(input.registration.intendedRecipientId)?.name ?? "your original intended recipient";
  const redirect = input.allocation?.redirectRecipientId
    ? recipientMap.get(input.allocation.redirectRecipientId)?.name
    : null;
  if (input.registration.paymentState === "payment_failed") {
    return "Your registration did not count because payment confirmation failed. No donation was routed.";
  }
  if (!input.allocation || input.allocation.allocatedMatchedMinor === 0) {
    return `No compatible opposed donation was found. Your donation was routed to ${intended}.`;
  }
  if (input.allocation.finalRedirectRouteMinor > 0 && redirect) {
    return `${formatMinor(input.allocation.finalRedirectRouteMinor, input.registration.currency)} of your donation was matched against opposed donations and redirected to ${redirect}, which matched your frozen redirect preferences. ${formatMinor(input.allocation.finalIntendedRouteMinor, input.registration.currency)} was routed to your original intended recipient.`;
  }
  return `Opposed donations were found, but no redirect recipient satisfied the frozen preferences of the matched users. Your donation was routed to ${intended}.`;
}

export function serializeDonationCancellationPublicReport(report: DonationCancellationAuditReport) {
  return {
    feeMinor: report.feeMinor,
    finalStatus: report.finalStatus,
    grossMatchedMinor: report.grossMatchedMinor,
    grossRedirectedMinor: report.grossRedirectedMinor,
    grossRegisteredMinor: report.grossRegisteredMinor,
    grossRoutedToIntendedMinor: report.grossRoutedToIntendedMinor,
    label: report.publicReportJson.label,
    limitations: report.publicReportJson.limitations,
    participantCount: report.registrationCount,
    publishedAt: report.publishedAt,
    recipientTotals: report.publicReportJson.recipientTotals,
  };
}

export function createDonationCancellationDemoSettlement() {
  const round = DONATION_CANCELLATION_SEED_ROUNDS[1];
  const plan = buildDonationCancellationSettlementPlan({
    markets: DONATION_CANCELLATION_SEED_MARKETS,
    prioritySnapshots: DONATION_CANCELLATION_SEED_PRIORITY_SNAPSHOTS,
    recipients: DONATION_CANCELLATION_SEED_RECIPIENTS,
    registrations: DONATION_CANCELLATION_SEED_REGISTRATIONS,
    round,
  });
  const auditReport = buildDonationCancellationAuditReport({
    plan,
    recipients: DONATION_CANCELLATION_SEED_RECIPIENTS,
    registrations: DONATION_CANCELLATION_SEED_REGISTRATIONS,
    round,
  });
  return { auditReport, plan, round };
}
