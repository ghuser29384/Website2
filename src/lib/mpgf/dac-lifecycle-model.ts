export type MpgfDacProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved_as_candidate"
  | "rejected"
  | "withdrawn"
  | "succeeded"
  | "lapsed";

export type MpgfDacOutcomeStatus = "succeeded" | "lapsed";
export type MpgfDacEligibilityState =
  | "pending_review"
  | "eligible"
  | "duplicate_identity"
  | "below_minimum"
  | "blocked";
export type MpgfDacPledgeStatus = "pledged" | "captured" | "voided" | "expired";
export type MpgfDacVisibilityMode = "private_amount" | "public_supporter" | "public_reason";

export interface MpgfDacCampaignOutcome {
  id: string;
  campaignId: string;
  poolProposalId: string;
  termsVersion: number;
  termsSha256: string;
  status: MpgfDacOutcomeStatus;
  eligibleAmountCents: number;
  eligibleSupporterCount: number;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  deadlineAt: string;
  evaluatedAt: string;
  outcomeSha256: string;
  createdAt: string;
}

export interface MpgfDacOwnPledge {
  id: string;
  pledgeIntentId: string;
  campaignId: string;
  poolProposalId: string;
  profileId: string;
  amountCents: number;
  currency: "usd";
  visibilityMode: MpgfDacVisibilityMode;
  supporterReason: string | null;
  eligibilityState: MpgfDacEligibilityState;
  humanScoreBps: number;
  status: MpgfDacPledgeStatus;
  termsVersion: number;
  termsSha256: string;
  consentSha256: string | null;
  acceptedAt: string;
  expiresAt: string;
  createdAt: string;
}


export interface MpgfDacPublishedTerms {
  schemaVersion: "mpgf_dac_public_terms_v1";
  mechanism: "dominant_assurance_contract";
  campaignId: string;
  campaignSlug: string;
  poolProposalId: string;
  termsVersion: number;
  termsSha256: string;
  threshold: {
    netRecipientAmountCents: number;
    minimumSupporters: number;
    deadlineAt: string;
  };
  failureBonus: {
    enabled: true;
    rateBps: number;
    eligibilityPolicy: Record<string, unknown>;
    maxParticipants: number;
    maxPerParticipantCents: number;
    thresholdSchedule: Record<string, unknown>;
    scheduleStatus: "approved";
  };
  successPremium: {
    rateBps: number;
    amountCents: number;
    payer: string;
    includedInNetThreshold: boolean;
    provisional: false;
    grossSuccessRequirementCents: number;
    pricing: Record<string, unknown>;
  };
  createPoolTerms: {
    thresholdAmountsCents: number[];
    failureBonusBaseType: string;
    failureBonusBaseTerms: Record<string, unknown>;
    failureBonusTimingMode: string;
    failureBonusTimingTerms: Record<string, unknown>;
    formulaSource: string | null;
    formulaAst: Record<string, unknown> | null;
    formulaLanguageVersion: string | null;
    formulaHash: string | null;
    formulaVariables: unknown[] | null;
    continuationMode: string;
    moralTradeFailureBonusShareBps: number;
    additionalActivationRule: string;
  } | null;
  payoutMethod: "signed_intent";
  payment: {
    pledgeMode: "pledge_only";
    paymentMethodCollected: false;
    authorized: false;
    mandateCreated: false;
    charged: false;
    captured: false;
    settled: false;
    failureBonusPaid: false;
  };
}

export interface MpgfDacPublicCampaign {
  id: string;
  roundId: string;
  slug: string;
  title: string;
  destinationType: string;
  destinationRef: string;
  causeTags: string[];
  publicSummary: string;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  deadlineAt: string;
  verificationMethod: string;
  baselineRule: string;
  exitRule: string;
  reviewStatus: "approved" | "finalized";
  poolProposalId: string;
  thresholdVisibility: string;
  progressVisibility: string;
  publishedTermsVersion: number;
  publishedTermsSha256: string;
  publishedAt: string;
  createdAt: string;
  publishedTerms: MpgfDacPublishedTerms;
  outcome: MpgfDacCampaignOutcome | null;
  ownPledges: MpgfDacOwnPledge[];
}

export interface MpgfDacProposalVersion {
  proposalId: string;
  termsVersion: number;
  termsSha256: string;
  recordedReason: string;
  recordedAt: string;
}

export interface MpgfDacLifecycleEvent {
  id: string;
  proposalId: string;
  termsVersion: number;
  eventType: string;
  actorUserId: string | null;
  fromStatus: string | null;
  toStatus: string;
  termsSha256: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MpgfDacCreatorProposal {
  id: string;
  proposerId: string;
  title: string;
  summary: string;
  causeArea: string;
  problem: string;
  intervention: string;
  moralPublicGoodRationale: string;
  requestedMaximumFundingCents: number;
  minimumViableFundingCents: number | null;
  publicGoodsDestinationType: string | null;
  publicGoodsDestinationRef: string | null;
  thresholdAmountCents: number | null;
  thresholdSupporters: number | null;
  failureBonusEnabled: boolean;
  failureBonusRateBps: number | null;
  failureBonusScheduleStatus: string | null;
  successPremiumCents: number | null;
  deadlineAt: string | null;
  verificationMethod: string | null;
  baselineRule: string | null;
  exitRule: string | null;
  payoutMethod: string | null;
  status: MpgfDacProposalStatus;
  termsVersion: number;
  approvedTermsVersion: number | null;
  operativeTermsSha256: string | null;
  termsLockedAt: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  supersedesProposalId: string | null;
  createdAt: string;
  versions: MpgfDacProposalVersion[];
  lifecycleEvents: MpgfDacLifecycleEvent[];
  campaign: MpgfDacPublicCampaign | null;
}

export interface MpgfDacReviewProposal {
  id: string;
  proposerId: string | null;
  title: string;
  summary: string;
  causeArea: string;
  status: MpgfDacProposalStatus;
  termsVersion: number;
  approvedTermsVersion: number | null;
  operativeTermsSha256: string | null;
  termsLockedAt: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  thresholdAmountCents: number | null;
  thresholdSupporters: number | null;
  deadlineAt: string | null;
  failureBonusEnabled: boolean;
  failureBonusScheduleStatus: string | null;
  successPremiumProvisional: boolean | null;
  createdAt: string;
  campaignId: string | null;
  campaignSlug: string | null;
  campaignReviewStatus: string | null;
  outcomeStatus: MpgfDacOutcomeStatus | null;
}

export interface MpgfDacReviewPledge {
  id: string;
  pledgeIntentId: string;
  campaignId: string;
  poolProposalId: string;
  profileId: string;
  amountCents: number;
  currency: "usd";
  visibilityMode: MpgfDacVisibilityMode;
  supporterReason: string | null;
  eligibilityState: MpgfDacEligibilityState;
  humanScoreBps: number;
  status: MpgfDacPledgeStatus;
  termsVersion: number;
  termsSha256: string;
  acceptedAt: string;
  expiresAt: string;
}

export interface MpgfDacPublicationRound {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: string;
  supporterGate: string;
}

export interface MpgfDacReviewerWorkspace {
  reviewerAuthorization: {
    reviewerId: string;
    active: boolean;
    rationale: string;
    authorizedAt: string;
    expiresAt: string | null;
  } | null;
  proposals: MpgfDacReviewProposal[];
  pendingPledges: MpgfDacReviewPledge[];
  publicationRounds: MpgfDacPublicationRound[];
}

export interface MpgfDacPledgeReceipt {
  pledgeIntentId: string;
  pledgeId: string;
  campaignId: string;
  poolProposalId: string;
  termsVersion: number;
  termsSha256: string;
  amountCents: number;
  currency: "usd";
  eligibilityState: MpgfDacEligibilityState;
  pledgeStatus: MpgfDacPledgeStatus;
  acceptedAt: string;
  expiresAt: string;
}

export interface PublicMpgfDacCampaignApi {
  schemaVersion: "mpgf_dac_campaign_public_v1";
  campaign: Omit<MpgfDacPublicCampaign, "ownPledges">;
  disclosure: {
    pledgeMode: "pledge_only";
    paymentAuthorized: false;
    paymentMethodCollected: false;
    chargeCreated: false;
    privatePledgeEvidenceIncluded: false;
    progressPolicy: "terminal_aggregate_only";
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function nullableNumber(value: unknown) {
  if (value == null) return null;
  const parsed = numberValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function isMpgfDacProposalStatus(value: unknown): value is MpgfDacProposalStatus {
  return [
    "draft",
    "submitted",
    "under_review",
    "changes_requested",
    "approved_as_candidate",
    "rejected",
    "withdrawn",
    "succeeded",
    "lapsed",
  ].includes(String(value));
}

function proposalStatus(value: unknown): MpgfDacProposalStatus {
  return isMpgfDacProposalStatus(value) ? value : "draft";
}

function eligibilityState(value: unknown): MpgfDacEligibilityState {
  return ["eligible", "duplicate_identity", "below_minimum", "blocked"].includes(String(value))
    ? value as MpgfDacEligibilityState
    : "pending_review";
}

function pledgeStatus(value: unknown): MpgfDacPledgeStatus {
  return ["captured", "voided", "expired"].includes(String(value))
    ? value as MpgfDacPledgeStatus
    : "pledged";
}

function visibilityMode(value: unknown): MpgfDacVisibilityMode {
  return ["public_supporter", "public_reason"].includes(String(value))
    ? value as MpgfDacVisibilityMode
    : "private_amount";
}

export function mapMpgfDacOutcomeRow(value: unknown): MpgfDacCampaignOutcome {
  const row = record(value);
  const status = row.outcome_status === "lapsed" ? "lapsed" : "succeeded";

  return {
    id: stringValue(row.id),
    campaignId: stringValue(row.campaign_id),
    poolProposalId: stringValue(row.pool_proposal_id),
    termsVersion: numberValue(row.terms_version),
    termsSha256: stringValue(row.terms_sha256),
    status,
    eligibleAmountCents: numberValue(row.eligible_amount_cents),
    eligibleSupporterCount: numberValue(row.eligible_supporter_count),
    thresholdAmountCents: numberValue(row.threshold_amount_cents),
    thresholdSupporters: numberValue(row.threshold_supporters),
    deadlineAt: stringValue(row.deadline_at),
    evaluatedAt: stringValue(row.evaluated_at),
    outcomeSha256: stringValue(row.outcome_sha256),
    createdAt: stringValue(row.created_at),
  };
}

export function mapMpgfDacOwnPledgeRow(
  value: unknown,
  consentSha256: string | null = null,
): MpgfDacOwnPledge {
  const row = record(value);

  return {
    id: stringValue(row.id),
    pledgeIntentId: stringValue(row.pledge_intent_id),
    campaignId: stringValue(row.campaign_id),
    poolProposalId: stringValue(row.pool_proposal_id),
    profileId: stringValue(row.profile_id),
    amountCents: numberValue(row.amount_cents),
    currency: "usd",
    visibilityMode: visibilityMode(row.visibility_mode),
    supporterReason: nullableString(row.supporter_reason),
    eligibilityState: eligibilityState(row.eligibility_state),
    humanScoreBps: numberValue(row.human_score_bps),
    status: pledgeStatus(row.status),
    termsVersion: numberValue(row.terms_version),
    termsSha256: stringValue(row.terms_sha256),
    consentSha256,
    acceptedAt: stringValue(row.accepted_at),
    expiresAt: stringValue(row.expires_at),
    createdAt: stringValue(row.created_at),
  };
}


export function mapMpgfDacPublishedTerms(value: unknown): MpgfDacPublishedTerms {
  const row = record(value);
  const threshold = record(row.threshold);
  const failureBonus = record(row.failureBonus);
  const successPremium = record(row.successPremium);
  const createPoolTermsRow = row.createPoolTerms == null ? null : record(row.createPoolTerms);
  const payment = record(row.payment);

  return {
    schemaVersion: "mpgf_dac_public_terms_v1",
    mechanism: "dominant_assurance_contract",
    campaignId: stringValue(row.campaignId),
    campaignSlug: stringValue(row.campaignSlug),
    poolProposalId: stringValue(row.poolProposalId),
    termsVersion: numberValue(row.termsVersion),
    termsSha256: stringValue(row.termsSha256),
    threshold: {
      netRecipientAmountCents: numberValue(threshold.netRecipientAmountCents),
      minimumSupporters: numberValue(threshold.minimumSupporters),
      deadlineAt: stringValue(threshold.deadlineAt),
    },
    failureBonus: {
      enabled: true,
      rateBps: numberValue(failureBonus.rateBps),
      eligibilityPolicy: record(failureBonus.eligibilityPolicy),
      maxParticipants: numberValue(failureBonus.maxParticipants),
      maxPerParticipantCents: numberValue(failureBonus.maxPerParticipantCents),
      thresholdSchedule: record(failureBonus.thresholdSchedule),
      scheduleStatus: "approved",
    },
    successPremium: {
      rateBps: numberValue(successPremium.rateBps),
      amountCents: numberValue(successPremium.amountCents),
      payer: stringValue(successPremium.payer),
      includedInNetThreshold: Boolean(successPremium.includedInNetThreshold),
      provisional: false,
      grossSuccessRequirementCents: numberValue(successPremium.grossSuccessRequirementCents),
      pricing: record(successPremium.pricing),
    },
    createPoolTerms: createPoolTermsRow ? {
      thresholdAmountsCents: Array.isArray(createPoolTermsRow.thresholdAmountsCents)
        ? createPoolTermsRow.thresholdAmountsCents.map((item) => numberValue(item)).filter((item) => item > 0)
        : [],
      failureBonusBaseType: stringValue(createPoolTermsRow.failureBonusBaseType),
      failureBonusBaseTerms: record(createPoolTermsRow.failureBonusBaseTerms),
      failureBonusTimingMode: stringValue(createPoolTermsRow.failureBonusTimingMode),
      failureBonusTimingTerms: record(createPoolTermsRow.failureBonusTimingTerms),
      formulaSource: nullableString(createPoolTermsRow.formulaSource),
      formulaAst: createPoolTermsRow.formulaAst == null ? null : record(createPoolTermsRow.formulaAst),
      formulaLanguageVersion: nullableString(createPoolTermsRow.formulaLanguageVersion),
      formulaHash: nullableString(createPoolTermsRow.formulaHash),
      formulaVariables: Array.isArray(createPoolTermsRow.formulaVariables) ? createPoolTermsRow.formulaVariables : null,
      continuationMode: stringValue(createPoolTermsRow.continuationMode),
      moralTradeFailureBonusShareBps: numberValue(createPoolTermsRow.moralTradeFailureBonusShareBps),
      additionalActivationRule: stringValue(createPoolTermsRow.additionalActivationRule),
    } : null,
    payoutMethod: "signed_intent",
    payment: {
      pledgeMode: "pledge_only",
      paymentMethodCollected: false,
      authorized: false,
      mandateCreated: false,
      charged: false,
      captured: false,
      settled: false,
      failureBonusPaid: false,
    },
  };
}

export function mapMpgfDacPublicCampaignRow(input: {
  campaign: unknown;
  publishedTerms: MpgfDacPublishedTerms;
  outcome?: unknown | null;
  ownPledges?: MpgfDacOwnPledge[];
}): MpgfDacPublicCampaign {
  const row = record(input.campaign);

  return {
    id: stringValue(row.id),
    roundId: stringValue(row.round_id),
    slug: stringValue(row.slug),
    title: stringValue(row.title),
    destinationType: stringValue(row.destination_type),
    destinationRef: stringValue(row.destination_ref),
    causeTags: stringArray(row.cause_tags),
    publicSummary: stringValue(row.public_summary),
    thresholdAmountCents: numberValue(row.threshold_amount_cents),
    thresholdSupporters: numberValue(row.threshold_supporters),
    deadlineAt: stringValue(row.deadline_at),
    verificationMethod: stringValue(row.verification_method),
    baselineRule: stringValue(row.baseline_rule),
    exitRule: stringValue(row.exit_rule),
    reviewStatus: row.review_status === "finalized" ? "finalized" : "approved",
    poolProposalId: stringValue(row.pool_proposal_id),
    thresholdVisibility: stringValue(row.threshold_visibility),
    progressVisibility: stringValue(row.progress_visibility),
    publishedTermsVersion: numberValue(row.published_terms_version),
    publishedTermsSha256: stringValue(row.published_terms_sha256),
    publishedAt: stringValue(row.published_at),
    createdAt: stringValue(row.created_at),
    publishedTerms: input.publishedTerms,
    outcome: input.outcome ? mapMpgfDacOutcomeRow(input.outcome) : null,
    ownPledges: input.ownPledges ?? [],
  };
}

export function mapMpgfDacProposalVersionRow(value: unknown): MpgfDacProposalVersion {
  const row = record(value);
  return {
    proposalId: stringValue(row.proposal_id),
    termsVersion: numberValue(row.terms_version),
    termsSha256: stringValue(row.terms_sha256),
    recordedReason: stringValue(row.recorded_reason),
    recordedAt: stringValue(row.recorded_at),
  };
}

export function mapMpgfDacLifecycleEventRow(value: unknown): MpgfDacLifecycleEvent {
  const row = record(value);
  return {
    id: stringValue(row.id),
    proposalId: stringValue(row.proposal_id),
    termsVersion: numberValue(row.terms_version),
    eventType: stringValue(row.event_type),
    actorUserId: nullableString(row.actor_user_id),
    fromStatus: nullableString(row.from_status),
    toStatus: stringValue(row.to_status),
    termsSha256: nullableString(row.terms_sha256),
    reason: stringValue(row.reason),
    metadata: record(row.metadata_json),
    createdAt: stringValue(row.created_at),
  };
}

export function mapMpgfDacCreatorProposalRow(input: {
  proposal: unknown;
  versions?: unknown[];
  lifecycleEvents?: unknown[];
  campaign?: MpgfDacPublicCampaign | null;
}): MpgfDacCreatorProposal {
  const row = record(input.proposal);

  return {
    id: stringValue(row.id),
    proposerId: stringValue(row.proposer_id),
    title: stringValue(row.title),
    summary: stringValue(row.summary),
    causeArea: stringValue(row.cause_area),
    problem: stringValue(row.problem),
    intervention: stringValue(row.intervention),
    moralPublicGoodRationale: stringValue(row.moral_public_good_rationale),
    requestedMaximumFundingCents: numberValue(row.requested_maximum_funding_cents),
    minimumViableFundingCents: nullableNumber(row.minimum_viable_funding_cents),
    publicGoodsDestinationType: nullableString(row.public_goods_destination_type),
    publicGoodsDestinationRef: nullableString(row.public_goods_destination_ref),
    thresholdAmountCents: nullableNumber(row.public_goods_threshold_amount_cents),
    thresholdSupporters: nullableNumber(row.public_goods_threshold_supporters),
    failureBonusEnabled: Boolean(row.public_goods_failure_bonus_enabled),
    failureBonusRateBps: nullableNumber(row.public_goods_failure_bonus_rate_bps),
    failureBonusScheduleStatus: nullableString(row.public_goods_failure_bonus_schedule_status),
    successPremiumCents: nullableNumber(row.public_goods_success_premium_cents),
    deadlineAt: nullableString(row.public_goods_deadline_at),
    verificationMethod: nullableString(row.public_goods_verification_method),
    baselineRule: nullableString(row.public_goods_baseline_rule),
    exitRule: nullableString(row.public_goods_exit_rule),
    payoutMethod: nullableString(row.public_goods_payout_method),
    status: proposalStatus(row.status),
    termsVersion: numberValue(row.terms_version, 1),
    approvedTermsVersion: nullableNumber(row.approved_terms_version),
    operativeTermsSha256: nullableString(row.operative_terms_sha256),
    termsLockedAt: nullableString(row.terms_locked_at),
    reviewedAt: nullableString(row.reviewed_at),
    reviewReason: nullableString(row.review_reason),
    supersedesProposalId: nullableString(row.supersedes_proposal_id),
    createdAt: stringValue(row.created_at),
    versions: (input.versions ?? []).map(mapMpgfDacProposalVersionRow),
    lifecycleEvents: (input.lifecycleEvents ?? []).map(mapMpgfDacLifecycleEventRow),
    campaign: input.campaign ?? null,
  };
}

export function mapMpgfDacReviewPledgeRow(value: unknown): MpgfDacReviewPledge {
  const row = record(value);
  return {
    id: stringValue(row.id),
    pledgeIntentId: stringValue(row.pledge_intent_id),
    campaignId: stringValue(row.campaign_id),
    poolProposalId: stringValue(row.pool_proposal_id),
    profileId: stringValue(row.profile_id),
    amountCents: numberValue(row.amount_cents),
    currency: "usd",
    visibilityMode: visibilityMode(row.visibility_mode),
    supporterReason: nullableString(row.supporter_reason),
    eligibilityState: eligibilityState(row.eligibility_state),
    humanScoreBps: numberValue(row.human_score_bps),
    status: pledgeStatus(row.status),
    termsVersion: numberValue(row.terms_version),
    termsSha256: stringValue(row.terms_sha256),
    acceptedAt: stringValue(row.accepted_at),
    expiresAt: stringValue(row.expires_at),
  };
}

export function mapMpgfDacPledgeReceipt(value: unknown): MpgfDacPledgeReceipt {
  const row = record(value);
  return {
    pledgeIntentId: stringValue(row.pledge_intent_id),
    pledgeId: stringValue(row.pledge_id),
    campaignId: stringValue(row.campaign_id),
    poolProposalId: stringValue(row.pool_proposal_id),
    termsVersion: numberValue(row.terms_version),
    termsSha256: stringValue(row.terms_sha256),
    amountCents: numberValue(row.amount_cents),
    currency: "usd",
    eligibilityState: eligibilityState(row.eligibility_state),
    pledgeStatus: pledgeStatus(row.pledge_status),
    acceptedAt: stringValue(row.accepted_at),
    expiresAt: stringValue(row.expires_at),
  };
}

export function toPublicMpgfDacCampaignApi(campaign: MpgfDacPublicCampaign): PublicMpgfDacCampaignApi {
  const { ownPledges: _privatePledges, ...publicCampaign } = campaign;

  return {
    schemaVersion: "mpgf_dac_campaign_public_v1",
    campaign: publicCampaign,
    disclosure: {
      pledgeMode: "pledge_only",
      paymentAuthorized: false,
      paymentMethodCollected: false,
      chargeCreated: false,
      privatePledgeEvidenceIncluded: false,
      progressPolicy: "terminal_aggregate_only",
    },
  };
}

export function getMpgfDacLifecycleStage(input: {
  proposalStatus?: MpgfDacProposalStatus | null;
  campaignReviewStatus?: string | null;
  outcomeStatus?: MpgfDacOutcomeStatus | null;
}) {
  if (input.outcomeStatus === "succeeded") return "succeeded";
  if (input.outcomeStatus === "lapsed") return "lapsed";
  if (input.campaignReviewStatus === "approved") return "published";
  if (input.proposalStatus === "approved_as_candidate") return "approved_frozen";
  if (input.proposalStatus === "under_review") return "under_review";
  if (input.proposalStatus === "changes_requested") return "changes_requested";
  if (input.proposalStatus === "rejected") return "rejected";
  if (input.proposalStatus === "submitted") return "submitted";
  return "draft";
}

export function isMpgfDacCampaignOpenForPledges(campaign: MpgfDacPublicCampaign, now = new Date()) {
  return campaign.reviewStatus === "approved" && !campaign.outcome && Date.parse(campaign.deadlineAt) > now.getTime();
}
