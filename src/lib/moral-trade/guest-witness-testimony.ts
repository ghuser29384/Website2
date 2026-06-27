import { createHash, randomBytes } from "node:crypto";

export const MORAL_TRADE_GUEST_WITNESS_CONTRACT_VERSION =
  "moral-trade-guest-witness-testimony-v0.1-2026-06";
export const MORAL_TRADE_GUEST_WITNESS_VALIDATOR_VERSION =
  "moral-trade-guest-witness-testimony-validator-v0.1";
export const GUEST_WITNESS_PRIVACY_NOTICE_VERSION =
  "guest-witness-privacy-v0.1-2026-06";
export const GUEST_WITNESS_TERMS_VERSION =
  "guest-witness-terms-v0.1-2026-06";

export type WitnessProvider =
  | "x"
  | "facebook"
  | "instagram"
  | "google"
  | "apple"
  | "email_magic_link"
  | "manual_review";

export type WitnessStatus = "active" | "restricted" | "blocked" | "deleted";
export type WitnessInviteStatus =
  | "pending"
  | "opened"
  | "submitted"
  | "declined"
  | "expired"
  | "revoked"
  | "reported"
  | "blocked";
export type RelationshipType =
  | "friend"
  | "family"
  | "roommate"
  | "romantic_partner"
  | "classmate"
  | "coworker"
  | "dining_companion"
  | "other";
export type BaselineKnowledgeLevel = "none" | "low" | "moderate" | "high";
export type RecentMealObservationFrequency =
  | "never"
  | "once"
  | "few_times"
  | "weekly"
  | "daily"
  | "lived_together";
export type WitnessConcernFlag =
  | "none"
  | "possible_baseline_overstatement"
  | "possible_pressure"
  | "possible_side_payment"
  | "insufficient_knowledge"
  | "other";
export type WitnessTestimonialStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "partially_accepted"
  | "rejected"
  | "disputed"
  | "blocked";
export type IdentityAssuranceLevel =
  | "email_only"
  | "social_verified"
  | "prior_user"
  | "manual_verified"
  | "weak";
export type WitnessQualityReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_more_info"
  | "disputed";
export type WitnessTokenStoragePolicy =
  | "no_token"
  | "short_lived_token"
  | "long_lived_token_ref"
  | "manual";
export type ExternalWitnessAccountStatus =
  | "connected"
  | "expired"
  | "revoked"
  | "failed"
  | "blocked";

export interface WitnessIdentityProvider {
  provider: WitnessProvider;
  supportedEnvironment: string;
  requiredScopes: string[];
  dataReturned: string[];
  tokenRetentionPolicy: WitnessTokenStoragePolicy;
  providerReviewStatus: "available" | "feature_gated" | "unavailable" | "manual_only";
  failureBehavior: "fail_closed" | "manual_review";
  privacyDisclosureText: string;
  configured: boolean;
  unavailableReason: string | null;
}

export interface GuestWitnessIdentity {
  id: string;
  primaryEmailHash: string | null;
  phoneHash: string | null;
  convertedUserId: string | null;
  witnessStatus: WitnessStatus;
  witnessCredibilityDecimal: number | null;
  witnessCredibilityConfidenceDecimal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalWitnessAccount {
  id: string;
  guestWitnessIdentityId: string;
  provider: WitnessProvider;
  providerAccountIdHash: string;
  providerAccountDisplaySnapshot: string | null;
  providerProfileUrlSnapshot: string | null;
  providerVerifiedAt: string;
  oauthScopeSnapshotJson: string[] | null;
  tokenStoragePolicy: WitnessTokenStoragePolicy;
  tokenRef: string | null;
  tokenExpiresAt: string | null;
  accountStatus: ExternalWitnessAccountStatus;
  privacyNoticeVersion: string;
  termsAcceptanceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaselineWitnessInvite {
  id: string;
  participantUserId: string;
  pledgeSwapId: string | null;
  purchaseEnvelopeType: string | null;
  purchaseEnvelopeId: string | null;
  participantActionCommitmentId: string | null;
  invitedEmailHash: string | null;
  invitedPhoneHash: string | null;
  inviteTokenHash: string;
  inviteStatus: WitnessInviteStatus;
  participantClaimedRelationship: RelationshipType | null;
  actionTemplateId: string;
  actionWindowStartAt: string;
  actionWindowEndAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaselineWitnessTestimonial {
  id: string;
  inviteId: string;
  guestWitnessIdentityId: string;
  externalWitnessAccountId: string | null;
  participantUserId: string;
  pledgeSwapId: string | null;
  purchaseEnvelopeType: string | null;
  purchaseEnvelopeId: string | null;
  participantActionCommitmentId: string | null;
  relationshipType: RelationshipType;
  baselineKnowledgeLevel: BaselineKnowledgeLevel;
  recentMealObservationFrequency: RecentMealObservationFrequency;
  baselineCounterfactualCredenceDecimal: number;
  basisJson: {
    basisText: string;
    basisTags: string[];
  };
  uncertaintyNotesPrivate: string | null;
  concernFlag: WitnessConcernFlag;
  concernNotesPrivate: string | null;
  testimonialStatus: WitnessTestimonialStatus;
  reviewerUserId: string | null;
  participantVisibleSummary: string | null;
  privateReviewerNotesRef: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaselineWitnessQualityAssessment {
  id: string;
  baselineWitnessTestimonialId: string;
  guestWitnessIdentityId: string;
  participantUserId: string;
  identityAssuranceLevel: IdentityAssuranceLevel;
  relationshipWeightDecimal: number;
  knowledgeBasisScoreDecimal: number;
  specificityScoreDecimal: number;
  independenceScoreDecimal: number;
  consistencyScoreDecimal: number;
  collusionRiskScoreDecimal: number;
  baselineProbativeValueScoreDecimal: number;
  acceptedForAdditionality: boolean;
  acceptedForCredibilityUpdate: boolean;
  proposedAdditionalityAdjustmentDecimal: number | null;
  reviewStatus: WitnessQualityReviewStatus;
  reviewerId: string | null;
  privateNotesRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WitnessProviderConfig {
  env?: Record<string, string | undefined>;
  instagramAccountType?: "business" | "creator" | "personal" | "unknown";
}

export interface CreateBaselineWitnessInviteInput {
  participantUserId: string;
  pledgeSwapId?: string | null;
  purchaseEnvelopeType?: string | null;
  purchaseEnvelopeId?: string | null;
  participantActionCommitmentId?: string | null;
  witnessEmail?: string | null;
  witnessPhone?: string | null;
  shareableLinkOnly?: boolean;
  participantClaimedRelationship?: RelationshipType | null;
  actionTemplateId: string;
  actionWindowStartAt: string;
  actionWindowEndAt: string;
  now?: string;
  expiresAt?: string;
  rawInviteToken?: string;
  recentInviteTimestamps?: string[];
  activeInviteCount?: number;
  maxActiveInvites?: number;
  cooldownMinutes?: number;
}

export interface CreateBaselineWitnessInviteResult {
  invite: BaselineWitnessInvite | null;
  rawInviteToken: string | null;
  participantVisibleStatus: ParticipantWitnessInviteStatus | null;
  blockers: string[];
}

export interface ProviderAccountInput {
  provider: WitnessProvider;
  providerAccountId?: string | null;
  providerAccountDisplaySnapshot?: string | null;
  providerProfileUrlSnapshot?: string | null;
  oauthScopes?: string[] | null;
  rawOAuthToken?: string | null;
  accountType?: "business" | "creator" | "personal" | "unknown";
}

export interface SubmitBaselineWitnessTestimonialInput {
  invite: BaselineWitnessInvite;
  witnessEmail?: string | null;
  witnessPhone?: string | null;
  providerAccount: ProviderAccountInput;
  relationshipType: RelationshipType;
  baselineKnowledgeLevel: BaselineKnowledgeLevel;
  recentMealObservationFrequency: RecentMealObservationFrequency;
  baselineCounterfactualCredenceDecimal: number;
  basisText: string;
  uncertaintyNotesPrivate?: string | null;
  concernFlag?: WitnessConcernFlag;
  concernNotesPrivate?: string | null;
  accuracyAffirmed: boolean;
  existingTestimonialsForSamePledge?: Array<{
    externalWitnessAccountId: string | null;
    guestWitnessIdentityId: string;
    providerAccountIdHash?: string | null;
  }>;
  reciprocalWitnessPairs?: Array<{
    witnessIdentityId: string;
    participantUserId: string;
  }>;
  providerConfig?: WitnessProviderConfig;
  now?: string;
}

export interface SubmitBaselineWitnessTestimonialResult {
  identity: GuestWitnessIdentity | null;
  externalAccount: ExternalWitnessAccount | null;
  testimonial: BaselineWitnessTestimonial | null;
  assessment: BaselineWitnessQualityAssessment | null;
  riskReviewRequired: boolean;
  blockers: string[];
}

export interface FrozenBaselineWitnessPolicy {
  policySnapshotRef: string;
  policyStatus: "frozen" | "draft" | "stale" | "superseded";
  finalAdditionalityProbabilityDecimal: number;
  maxAdditionalityAdjustmentDecimal: number;
  participantCredibilityUpdateEnabled: boolean;
  additionalityAdjustedSettlementEnabled: boolean;
  termsAcceptedAt: string | null;
  actionWindowStartAt: string;
  fixedConsiderationLocked: boolean;
}

export interface BaselineWitnessPolicyApplication {
  finalAdditionalityProbabilityDecimal: number;
  participantCredibilityUpdateAllowed: boolean;
  settlementAdjustmentAllowed: boolean;
  appliedAdditionalityAdjustmentDecimal: number;
  auditTraceRequired: true;
  auditTrace: {
    policySnapshotRef: string;
    testimonialRef: string;
    assessmentRef: string;
    materialEffect:
      | "additionality_only"
      | "additionality_and_credibility"
      | "none";
    blockers: string[];
  };
  blockers: string[];
}

export interface ParticipantWitnessInviteStatus {
  inviteId: string;
  inviteStatus: WitnessInviteStatus;
  participantClaimedRelationship: RelationshipType | null;
  expiresAt: string;
  privateFieldsSuppressed: true;
}

export interface ReviewerWitnessSummary {
  testimonialId: string;
  inviteId: string;
  identityAssuranceLevel: IdentityAssuranceLevel;
  relationshipType: RelationshipType;
  baselineKnowledgeLevel: BaselineKnowledgeLevel;
  recentMealObservationFrequency: RecentMealObservationFrequency;
  baselineCounterfactualCredenceDecimal: number;
  basisText: string;
  concernFlag: WitnessConcernFlag;
  uncertaintyNotesPrivate: string | null;
  concernNotesPrivate: string | null;
  scores: {
    relationshipWeightDecimal: number;
    knowledgeBasisScoreDecimal: number;
    specificityScoreDecimal: number;
    independenceScoreDecimal: number;
    consistencyScoreDecimal: number;
    collusionRiskScoreDecimal: number;
    baselineProbativeValueScoreDecimal: number;
  };
  socialIdentitySeparatedFromClaimCredibility: true;
}

export interface FunderWitnessSummary {
  publicSummary: string | null;
  reviewedBaselineEvidenceUsed: boolean;
  privateFieldsSuppressed: true;
}

export interface GuestWitnessContract {
  version: typeof MORAL_TRADE_GUEST_WITNESS_CONTRACT_VERSION;
  purpose: string;
  firstClassRecordTables: string[];
  providerAbstraction: WitnessIdentityProvider[];
  policySnapshotSubjects: string[];
  privacyRules: string[];
  participantVisibilityRule: string;
  reviewerAuditRule: string;
  publicFunderRule: string;
  frozenPolicyRule: string;
  duplicateResistanceRules: string[];
  acceptedRelationshipTypes: RelationshipType[];
  acceptedConcernFlags: WitnessConcernFlag[];
  contractTests: string[];
}

export interface GuestWitnessContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-guest-witness-testimony-contract";
  validatorVersion: typeof MORAL_TRADE_GUEST_WITNESS_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_GUEST_WITNESS_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const DEFAULT_INVITE_EXPIRY_DAYS = 14;
const DEFAULT_MAX_ACTIVE_INVITES = 6;
const DEFAULT_COOLDOWN_MINUTES = 10;

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "friend",
  "family",
  "roommate",
  "romantic_partner",
  "classmate",
  "coworker",
  "dining_companion",
  "other",
];

const CONCERN_FLAGS: WitnessConcernFlag[] = [
  "none",
  "possible_baseline_overstatement",
  "possible_pressure",
  "possible_side_payment",
  "insufficient_knowledge",
  "other",
];

const FIRST_CLASS_RECORD_TABLES = [
  "guest_witness_identities",
  "external_witness_accounts",
  "baseline_witness_invites",
  "baseline_witness_testimonials",
  "baseline_witness_quality_assessments",
  "baseline_witness_audit_events",
  "baseline_witness_risk_reports",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "baseline_witness_testimony",
  "witness_identity_assurance",
  "witness_additionality_adjustment",
] as const;

const CONTRACT_TESTS = [
  "guest_witness_non_user_email_magic_link_flow",
  "guest_witness_social_providers_fail_closed",
  "guest_witness_instagram_feature_gate",
  "guest_witness_hashes_provider_ids_and_invite_tokens",
  "guest_witness_private_fields_redaction",
  "guest_witness_frozen_policy_only",
  "guest_witness_no_retroactive_fixed_consideration_change",
  "guest_witness_duplicate_social_account_block",
  "guest_witness_ring_risk_review",
  "guest_witness_reviewer_audit_trace",
  "guest_witness_optional_private_copy",
] as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isoNow(input?: string) {
  return input && Number.isFinite(Date.parse(input))
    ? new Date(input).toISOString()
    : new Date().toISOString();
}

function addDays(iso: string, days: number) {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function stableWitnessHash(
  value: string,
  namespace = "guest-witness",
  pepper = process.env.MORAL_TRADE_WITNESS_HASH_PEPPER ?? "",
) {
  return `sha256:${createHash("sha256")
    .update(`${namespace}:${pepper}:${normalizeText(value)}`)
    .digest("hex")}`;
}

export function hasValidWitnessHash(value: string | null | undefined) {
  return Boolean(value && HASH_PATTERN.test(value));
}

export function generateWitnessInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function normalizeWitnessEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

export function normalizeWitnessPhone(value?: string | null) {
  const normalized = value?.replace(/[^\d+]/g, "") ?? "";
  return normalized.length >= 7 ? normalized : "";
}

function envEnabled(env: Record<string, string | undefined>, key: string) {
  return env[key]?.toLowerCase() === "true";
}

function envPresent(env: Record<string, string | undefined>, ...keys: string[]) {
  return keys.every((key) => hasText(env[key]));
}

export function getWitnessIdentityProvider(
  provider: WitnessProvider,
  config: WitnessProviderConfig = {},
): WitnessIdentityProvider {
  const env = config.env ?? process.env;
  const base = {
    provider,
    failureBehavior: "fail_closed" as const,
    privacyDisclosureText:
      "Moral Trade stores only a stable account identifier hash and approved profile display snapshot. It does not request posting permission or inspect posts, DMs, followers, following, photos, likes, or private social data by default.",
  };

  if (provider === "email_magic_link") {
    return {
      ...base,
      configured: true,
      dataReturned: ["email_hash", "verified_at"],
      providerReviewStatus: "available",
      requiredScopes: [],
      supportedEnvironment: "all",
      tokenRetentionPolicy: "no_token",
      unavailableReason: null,
    };
  }

  if (provider === "manual_review") {
    return {
      ...base,
      configured: true,
      dataReturned: ["reviewer_attestation_ref", "verified_at"],
      failureBehavior: "manual_review",
      providerReviewStatus: "manual_only",
      requiredScopes: [],
      supportedEnvironment: "reviewer-console",
      tokenRetentionPolicy: "manual",
      unavailableReason: null,
    };
  }

  if (provider === "google" || provider === "apple") {
    const envKey = provider === "google" ? "WITNESS_GOOGLE_OAUTH_ENABLED" : "WITNESS_APPLE_OAUTH_ENABLED";
    const configured = envEnabled(env, envKey);

    return {
      ...base,
      configured,
      dataReturned: ["stable_provider_account_id_hash", "display_name_snapshot", "verified_at"],
      providerReviewStatus: configured ? "available" : "feature_gated",
      requiredScopes: provider === "google" ? ["openid", "email", "profile"] : ["name", "email"],
      supportedEnvironment: "supabase-auth-oauth-when-enabled",
      tokenRetentionPolicy: "no_token",
      unavailableReason: configured ? null : `${provider} witness login is not enabled for this deployment.`,
    };
  }

  if (provider === "x") {
    const configured =
      envEnabled(env, "WITNESS_X_OAUTH_ENABLED") &&
      envPresent(env, "WITNESS_X_CLIENT_ID", "WITNESS_X_REDIRECT_URI");

    return {
      ...base,
      configured,
      dataReturned: ["stable_provider_account_id_hash", "handle_snapshot", "profile_url_snapshot", "verified_at"],
      providerReviewStatus: configured ? "available" : "feature_gated",
      requiredScopes: ["users.read"],
      supportedEnvironment: "x-oauth2-with-pkce-when-provider-review-complete",
      tokenRetentionPolicy: "no_token",
      unavailableReason: configured ? null : "X witness verification is feature-gated until OAuth credentials and provider review are configured.",
    };
  }

  if (provider === "facebook") {
    const configured =
      envEnabled(env, "WITNESS_FACEBOOK_LOGIN_ENABLED") &&
      envPresent(env, "WITNESS_FACEBOOK_APP_ID", "WITNESS_FACEBOOK_REDIRECT_URI");

    return {
      ...base,
      configured,
      dataReturned: ["stable_provider_account_id_hash", "display_name_snapshot", "profile_url_snapshot", "verified_at"],
      providerReviewStatus: configured ? "available" : "feature_gated",
      requiredScopes: ["public_profile"],
      supportedEnvironment: "facebook-login-when-app-review-complete",
      tokenRetentionPolicy: "no_token",
      unavailableReason: configured ? null : "Facebook witness verification is feature-gated until app credentials and review status are configured.",
    };
  }

  const instagramAccountType = config.instagramAccountType ?? "unknown";
  const officialAccountType =
    instagramAccountType === "business" || instagramAccountType === "creator";
  const configured =
    officialAccountType &&
    envEnabled(env, "WITNESS_INSTAGRAM_LOGIN_ENABLED") &&
    envPresent(env, "WITNESS_INSTAGRAM_APP_ID", "WITNESS_INSTAGRAM_REDIRECT_URI");

  return {
    ...base,
    configured,
    dataReturned: ["stable_provider_account_id_hash", "display_name_snapshot", "profile_url_snapshot", "verified_at"],
    providerReviewStatus: configured ? "available" : "feature_gated",
    requiredScopes: ["instagram_business_basic"],
    supportedEnvironment: "official-meta-instagram-api-supported-account-types-only",
    tokenRetentionPolicy: "no_token",
    unavailableReason: configured
      ? null
      : officialAccountType
        ? "Instagram witness verification is feature-gated until official Meta credentials and review status are configured."
        : "Instagram witness verification is unavailable for ordinary personal accounts unless an official supported API path is configured.",
  };
}

export function getWitnessIdentityProviders(config: WitnessProviderConfig = {}) {
  return ([
    "email_magic_link",
    "google",
    "apple",
    "x",
    "facebook",
    "instagram",
    "manual_review",
  ] as WitnessProvider[]).map((provider) => getWitnessIdentityProvider(provider, config));
}

function activeInviteCapBlockers(input: CreateBaselineWitnessInviteInput, now: string) {
  const blockers: string[] = [];
  const maxActive = input.maxActiveInvites ?? DEFAULT_MAX_ACTIVE_INVITES;
  const activeInviteCount = input.activeInviteCount ?? 0;

  if (activeInviteCount >= maxActive) {
    blockers.push(`invite_cap_reached:${maxActive}`);
  }

  const cooldownMs = (input.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES) * 60_000;
  const recentTimestamps = input.recentInviteTimestamps ?? [];
  const nowMs = Date.parse(now);

  if (
    recentTimestamps.some((timestamp) => {
      const createdAt = Date.parse(timestamp);
      return Number.isFinite(createdAt) && nowMs - createdAt < cooldownMs;
    })
  ) {
    blockers.push(`invite_cooldown_active:${input.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES}m`);
  }

  return blockers;
}

export function createBaselineWitnessInviteDraft(
  input: CreateBaselineWitnessInviteInput,
): CreateBaselineWitnessInviteResult {
  const now = isoNow(input.now);
  const token = input.rawInviteToken ?? generateWitnessInviteToken();
  const normalizedEmail = normalizeWitnessEmail(input.witnessEmail);
  const normalizedPhone = normalizeWitnessPhone(input.witnessPhone);
  const blockers = activeInviteCapBlockers(input, now);

  if (!hasText(input.participantUserId)) blockers.push("participant_user_id_missing");
  if (!hasText(input.actionTemplateId)) blockers.push("action_template_id_missing");
  if (!Number.isFinite(Date.parse(input.actionWindowStartAt))) blockers.push("action_window_start_invalid");
  if (!Number.isFinite(Date.parse(input.actionWindowEndAt))) blockers.push("action_window_end_invalid");
  if (
    Number.isFinite(Date.parse(input.actionWindowStartAt)) &&
    Number.isFinite(Date.parse(input.actionWindowEndAt)) &&
    Date.parse(input.actionWindowEndAt) <= Date.parse(input.actionWindowStartAt)
  ) {
    blockers.push("action_window_end_before_start");
  }
  if (!normalizedEmail && !normalizedPhone && !input.shareableLinkOnly) {
    blockers.push("witness_contact_or_share_link_required");
  }

  const expiresAt = input.expiresAt ?? addDays(now, DEFAULT_INVITE_EXPIRY_DAYS);
  if (Date.parse(expiresAt) <= Date.parse(now)) {
    blockers.push("invite_expiry_must_be_future");
  }

  if (blockers.length) {
    return {
      blockers,
      invite: null,
      participantVisibleStatus: null,
      rawInviteToken: null,
    };
  }

  const invite: BaselineWitnessInvite = {
    actionTemplateId: input.actionTemplateId.trim(),
    actionWindowEndAt: new Date(input.actionWindowEndAt).toISOString(),
    actionWindowStartAt: new Date(input.actionWindowStartAt).toISOString(),
    createdAt: now,
    expiresAt,
    id: stableWitnessHash(`${input.participantUserId}:${token}:${now}`, "baseline-witness-invite-id"),
    invitedEmailHash: normalizedEmail ? stableWitnessHash(normalizedEmail, "guest-witness-email") : null,
    invitedPhoneHash: normalizedPhone ? stableWitnessHash(normalizedPhone, "guest-witness-phone") : null,
    inviteStatus: "pending",
    inviteTokenHash: stableWitnessHash(token, "baseline-witness-invite-token"),
    participantActionCommitmentId: input.participantActionCommitmentId ?? null,
    participantClaimedRelationship: input.participantClaimedRelationship ?? null,
    participantUserId: input.participantUserId,
    pledgeSwapId: input.pledgeSwapId ?? null,
    purchaseEnvelopeId: input.purchaseEnvelopeId ?? null,
    purchaseEnvelopeType: input.purchaseEnvelopeType ?? null,
    updatedAt: now,
  };

  return {
    blockers: [],
    invite,
    participantVisibleStatus: buildParticipantWitnessInviteStatus(invite),
    rawInviteToken: token,
  };
}

function basisTags(text: string) {
  const lower = text.toLowerCase();
  return [
    lower.includes("lunch") || lower.includes("dinner") || lower.includes("meal") ? "meal_observation" : "",
    lower.includes("roommate") || lower.includes("live") ? "household_observation" : "",
    lower.includes("often") || lower.includes("weekly") || lower.includes("daily") ? "frequency_claim" : "",
    lower.includes("tomorrow") || lower.includes("weekend") || lower.includes("window") ? "action_window_specific" : "",
  ].filter(Boolean);
}

function scoreKnowledge(
  level: BaselineKnowledgeLevel,
  frequency: RecentMealObservationFrequency,
) {
  const levelScore = {
    none: 0,
    low: 0.25,
    moderate: 0.65,
    high: 0.9,
  } satisfies Record<BaselineKnowledgeLevel, number>;
  const frequencyScore = {
    never: 0,
    once: 0.2,
    few_times: 0.45,
    weekly: 0.7,
    daily: 0.85,
    lived_together: 0.9,
  } satisfies Record<RecentMealObservationFrequency, number>;

  return clamp01((levelScore[level] + frequencyScore[frequency]) / 2);
}

function scoreRelationship(value: RelationshipType) {
  return (
    {
      friend: 0.72,
      family: 0.62,
      roommate: 0.82,
      romantic_partner: 0.55,
      classmate: 0.65,
      coworker: 0.68,
      dining_companion: 0.86,
      other: 0.45,
    } satisfies Record<RelationshipType, number>
  )[value];
}

function scoreIndependence(value: RelationshipType) {
  return (
    {
      friend: 0.7,
      family: 0.52,
      roommate: 0.72,
      romantic_partner: 0.42,
      classmate: 0.76,
      coworker: 0.8,
      dining_companion: 0.78,
      other: 0.55,
    } satisfies Record<RelationshipType, number>
  )[value];
}

function scoreSpecificity(basisText: string) {
  const tags = basisTags(basisText).length;
  const lengthScore = Math.min(1, basisText.trim().length / 220);
  return clamp01(lengthScore * 0.65 + Math.min(1, tags / 3) * 0.35);
}

function isSocialProvider(provider: WitnessProvider) {
  return provider === "x" || provider === "facebook" || provider === "instagram";
}

function identityAssuranceForProvider(
  provider: WitnessProvider,
  configured: boolean,
): IdentityAssuranceLevel {
  if (provider === "manual_review") return "manual_verified";
  if (provider === "email_magic_link") return "email_only";
  if (provider === "google" || provider === "apple") return configured ? "prior_user" : "weak";
  if (isSocialProvider(provider)) return configured ? "social_verified" : "weak";
  return "weak";
}

function detectDuplicateProviderAccount(
  providerAccountIdHash: string,
  existing: SubmitBaselineWitnessTestimonialInput["existingTestimonialsForSamePledge"],
) {
  return (existing ?? []).some((entry) => entry.providerAccountIdHash === providerAccountIdHash);
}

function detectReciprocalWitnessRisk(
  witnessIdentityId: string,
  participantUserId: string,
  pairs: SubmitBaselineWitnessTestimonialInput["reciprocalWitnessPairs"],
) {
  return (pairs ?? []).some(
    (pair) =>
      pair.witnessIdentityId === participantUserId &&
      pair.participantUserId === witnessIdentityId,
  );
}

export function submitBaselineWitnessTestimonialDraft(
  input: SubmitBaselineWitnessTestimonialInput,
): SubmitBaselineWitnessTestimonialResult {
  const now = isoNow(input.now);
  const invite = input.invite;
  const provider = getWitnessIdentityProvider(input.providerAccount.provider, {
    ...input.providerConfig,
    instagramAccountType:
      input.providerAccount.accountType ?? input.providerConfig?.instagramAccountType,
  });
  const blockers: string[] = [];

  if (Date.parse(invite.expiresAt) <= Date.parse(now)) blockers.push("invite_expired");
  if (!["pending", "opened"].includes(invite.inviteStatus)) {
    blockers.push(`invite_not_submittable:${invite.inviteStatus}`);
  }
  if (!provider.configured) {
    blockers.push(`provider_unavailable:${provider.provider}`);
  }
  if (input.providerAccount.rawOAuthToken) {
    blockers.push("raw_oauth_token_rejected");
  }
  if (!input.accuracyAffirmed) {
    blockers.push("accuracy_affirmation_required");
  }
  if (input.baselineCounterfactualCredenceDecimal < 0 || input.baselineCounterfactualCredenceDecimal > 1) {
    blockers.push("baseline_counterfactual_credence_out_of_range");
  }
  if (!hasText(input.basisText)) blockers.push("basis_required");
  if (
    input.baselineKnowledgeLevel === "none" ||
    input.recentMealObservationFrequency === "never"
  ) {
    blockers.push("direct_knowledge_required");
  }

  const normalizedEmail = normalizeWitnessEmail(input.witnessEmail);
  const normalizedPhone = normalizeWitnessPhone(input.witnessPhone);
  const accountId =
    input.providerAccount.provider === "email_magic_link"
      ? normalizedEmail
      : input.providerAccount.providerAccountId?.trim() ?? "";

  if (!accountId && input.providerAccount.provider !== "manual_review") {
    blockers.push("provider_account_id_required");
  }

  const providerAccountIdHash = accountId
    ? stableWitnessHash(accountId, `guest-witness-provider:${input.providerAccount.provider}`)
    : stableWitnessHash(`${invite.id}:${now}`, "guest-witness-manual-provider");

  if (detectDuplicateProviderAccount(providerAccountIdHash, input.existingTestimonialsForSamePledge)) {
    blockers.push("duplicate_provider_account_for_pledge_swap");
  }

  const identityId = stableWitnessHash(
    normalizedEmail || normalizedPhone || providerAccountIdHash,
    "guest-witness-identity-id",
  );
  const reciprocalRisk = detectReciprocalWitnessRisk(
    identityId,
    invite.participantUserId,
    input.reciprocalWitnessPairs,
  );

  const riskReviewRequired =
    reciprocalRisk ||
    input.concernFlag === "possible_pressure" ||
    input.concernFlag === "possible_side_payment";

  if (blockers.length) {
    return {
      assessment: null,
      blockers,
      externalAccount: null,
      identity: null,
      riskReviewRequired,
      testimonial: null,
    };
  }

  const identity: GuestWitnessIdentity = {
    convertedUserId: null,
    createdAt: now,
    id: identityId,
    phoneHash: normalizedPhone ? stableWitnessHash(normalizedPhone, "guest-witness-phone") : null,
    primaryEmailHash: normalizedEmail ? stableWitnessHash(normalizedEmail, "guest-witness-email") : null,
    updatedAt: now,
    witnessCredibilityConfidenceDecimal: null,
    witnessCredibilityDecimal: null,
    witnessStatus: "active",
  };
  const externalAccount: ExternalWitnessAccount = {
    accountStatus: "connected",
    createdAt: now,
    guestWitnessIdentityId: identity.id,
    id: stableWitnessHash(`${identity.id}:${provider.provider}:${providerAccountIdHash}`, "external-witness-account-id"),
    oauthScopeSnapshotJson: input.providerAccount.oauthScopes ?? provider.requiredScopes,
    privacyNoticeVersion: GUEST_WITNESS_PRIVACY_NOTICE_VERSION,
    provider: provider.provider,
    providerAccountDisplaySnapshot: input.providerAccount.providerAccountDisplaySnapshot?.trim() || null,
    providerAccountIdHash,
    providerProfileUrlSnapshot: input.providerAccount.providerProfileUrlSnapshot?.trim() || null,
    providerVerifiedAt: now,
    termsAcceptanceId: stableWitnessHash(`${identity.id}:${GUEST_WITNESS_TERMS_VERSION}:${now}`, "witness-terms-acceptance"),
    tokenExpiresAt: null,
    tokenRef: null,
    tokenStoragePolicy: provider.tokenRetentionPolicy,
    updatedAt: now,
  };
  const testimonial: BaselineWitnessTestimonial = {
    baselineCounterfactualCredenceDecimal: clamp01(input.baselineCounterfactualCredenceDecimal),
    baselineKnowledgeLevel: input.baselineKnowledgeLevel,
    basisJson: {
      basisTags: basisTags(input.basisText),
      basisText: input.basisText.trim().slice(0, 2000),
    },
    concernFlag: input.concernFlag ?? "none",
    concernNotesPrivate: input.concernNotesPrivate?.trim() || null,
    createdAt: now,
    externalWitnessAccountId: externalAccount.id,
    guestWitnessIdentityId: identity.id,
    id: stableWitnessHash(`${invite.id}:${identity.id}:${now}`, "baseline-witness-testimonial-id"),
    inviteId: invite.id,
    participantActionCommitmentId: invite.participantActionCommitmentId,
    participantUserId: invite.participantUserId,
    participantVisibleSummary: null,
    pledgeSwapId: invite.pledgeSwapId,
    privateReviewerNotesRef: null,
    purchaseEnvelopeId: invite.purchaseEnvelopeId,
    purchaseEnvelopeType: invite.purchaseEnvelopeType,
    recentMealObservationFrequency: input.recentMealObservationFrequency,
    relationshipType: input.relationshipType,
    reviewerUserId: null,
    submittedAt: now,
    testimonialStatus: riskReviewRequired ? "under_review" : "submitted",
    uncertaintyNotesPrivate: input.uncertaintyNotesPrivate?.trim() || null,
    updatedAt: now,
  };
  const assessment = assessBaselineWitnessTestimonial({
    externalAccount,
    reciprocalRisk,
    testimonial,
  });

  return {
    assessment,
    blockers: [],
    externalAccount,
    identity,
    riskReviewRequired,
    testimonial,
  };
}

export function assessBaselineWitnessTestimonial({
  externalAccount,
  reciprocalRisk = false,
  testimonial,
}: {
  externalAccount: ExternalWitnessAccount | null;
  reciprocalRisk?: boolean;
  testimonial: BaselineWitnessTestimonial;
}): BaselineWitnessQualityAssessment {
  const identityAssuranceLevel = externalAccount
    ? identityAssuranceForProvider(externalAccount.provider, externalAccount.accountStatus === "connected")
    : "weak";
  const relationshipWeightDecimal = scoreRelationship(testimonial.relationshipType);
  const knowledgeBasisScoreDecimal = scoreKnowledge(
    testimonial.baselineKnowledgeLevel,
    testimonial.recentMealObservationFrequency,
  );
  const specificityScoreDecimal = scoreSpecificity(testimonial.basisJson.basisText);
  const independenceScoreDecimal = scoreIndependence(testimonial.relationshipType);
  const consistencyScoreDecimal =
    testimonial.baselineCounterfactualCredenceDecimal >= 0.98 && specificityScoreDecimal < 0.35
      ? 0.3
      : 0.75;
  const collusionRiskScoreDecimal = clamp01(
    (reciprocalRisk ? 0.55 : 0) +
      (testimonial.concernFlag === "possible_pressure" ? 0.35 : 0) +
      (testimonial.concernFlag === "possible_side_payment" ? 0.45 : 0),
  );
  const baselineProbativeValueScoreDecimal = clamp01(
    knowledgeBasisScoreDecimal * 0.34 +
      specificityScoreDecimal * 0.24 +
      independenceScoreDecimal * 0.18 +
      relationshipWeightDecimal * 0.12 +
      consistencyScoreDecimal * 0.12 -
      collusionRiskScoreDecimal * 0.45,
  );
  const acceptedForAdditionality =
    baselineProbativeValueScoreDecimal >= 0.55 &&
    !["possible_pressure", "possible_side_payment", "insufficient_knowledge"].includes(
      testimonial.concernFlag,
    );

  return {
    acceptedForAdditionality,
    acceptedForCredibilityUpdate: acceptedForAdditionality && identityAssuranceLevel !== "weak",
    baselineProbativeValueScoreDecimal,
    baselineWitnessTestimonialId: testimonial.id,
    collusionRiskScoreDecimal,
    consistencyScoreDecimal,
    createdAt: testimonial.createdAt,
    guestWitnessIdentityId: testimonial.guestWitnessIdentityId,
    id: stableWitnessHash(`${testimonial.id}:assessment`, "baseline-witness-quality-assessment-id"),
    identityAssuranceLevel,
    independenceScoreDecimal,
    knowledgeBasisScoreDecimal,
    participantUserId: testimonial.participantUserId,
    privateNotesRef: testimonial.concernNotesPrivate
      ? stableWitnessHash(testimonial.concernNotesPrivate, "baseline-witness-private-notes")
      : null,
    proposedAdditionalityAdjustmentDecimal: acceptedForAdditionality
      ? Math.min(0.1, baselineProbativeValueScoreDecimal * 0.12)
      : null,
    relationshipWeightDecimal,
    reviewerId: null,
    reviewStatus: acceptedForAdditionality ? "pending" : "needs_more_info",
    specificityScoreDecimal,
    updatedAt: testimonial.updatedAt,
  };
}

export function applyBaselineWitnessFrozenPolicy({
  assessment,
  policy,
  testimonial,
}: {
  assessment: BaselineWitnessQualityAssessment;
  policy: FrozenBaselineWitnessPolicy;
  testimonial: BaselineWitnessTestimonial;
}): BaselineWitnessPolicyApplication {
  const blockers: string[] = [];

  if (policy.policyStatus !== "frozen") blockers.push(`policy_not_frozen:${policy.policyStatus}`);
  if (!hasText(policy.policySnapshotRef)) blockers.push("policy_snapshot_ref_missing");
  if (Date.parse(testimonial.submittedAt) > Date.parse(policy.actionWindowStartAt)) {
    blockers.push("baseline_witness_not_pre_action");
  }
  if (
    policy.termsAcceptedAt &&
    Date.parse(policy.termsAcceptedAt) > Date.parse(policy.actionWindowStartAt)
  ) {
    blockers.push("terms_not_accepted_before_action");
  }

  const requestedAdjustment = assessment.acceptedForAdditionality
    ? assessment.proposedAdditionalityAdjustmentDecimal ?? 0
    : 0;
  const appliedAdditionalityAdjustmentDecimal = blockers.length
    ? 0
    : Math.min(requestedAdjustment, policy.maxAdditionalityAdjustmentDecimal);
  const finalAdditionalityProbabilityDecimal = clamp01(
    policy.finalAdditionalityProbabilityDecimal + appliedAdditionalityAdjustmentDecimal,
  );
  const participantCredibilityUpdateAllowed =
    blockers.length === 0 &&
    policy.participantCredibilityUpdateEnabled &&
    assessment.acceptedForCredibilityUpdate;
  const settlementAdjustmentAllowed =
    blockers.length === 0 &&
    policy.additionalityAdjustedSettlementEnabled &&
    Boolean(policy.termsAcceptedAt) &&
    !policy.fixedConsiderationLocked;

  if (policy.fixedConsiderationLocked && requestedAdjustment > 0) {
    blockers.push("fixed_consideration_cannot_change_retroactively");
  }

  return {
    appliedAdditionalityAdjustmentDecimal: blockers.length ? 0 : appliedAdditionalityAdjustmentDecimal,
    auditTrace: {
      assessmentRef: assessment.id,
      blockers,
      materialEffect:
        blockers.length || appliedAdditionalityAdjustmentDecimal === 0
          ? "none"
          : participantCredibilityUpdateAllowed
            ? "additionality_and_credibility"
            : "additionality_only",
      policySnapshotRef: policy.policySnapshotRef,
      testimonialRef: testimonial.id,
    },
    auditTraceRequired: true,
    blockers,
    finalAdditionalityProbabilityDecimal: blockers.length
      ? policy.finalAdditionalityProbabilityDecimal
      : finalAdditionalityProbabilityDecimal,
    participantCredibilityUpdateAllowed,
    settlementAdjustmentAllowed,
  };
}

export function buildParticipantWitnessInviteStatus(
  invite: BaselineWitnessInvite,
): ParticipantWitnessInviteStatus {
  return {
    expiresAt: invite.expiresAt,
    inviteId: invite.id,
    inviteStatus: invite.inviteStatus,
    participantClaimedRelationship: invite.participantClaimedRelationship,
    privateFieldsSuppressed: true,
  };
}

export function buildReviewerWitnessSummary({
  assessment,
  testimonial,
}: {
  assessment: BaselineWitnessQualityAssessment;
  testimonial: BaselineWitnessTestimonial;
}): ReviewerWitnessSummary {
  return {
    baselineCounterfactualCredenceDecimal: testimonial.baselineCounterfactualCredenceDecimal,
    baselineKnowledgeLevel: testimonial.baselineKnowledgeLevel,
    basisText: testimonial.basisJson.basisText,
    concernFlag: testimonial.concernFlag,
    concernNotesPrivate: testimonial.concernNotesPrivate,
    identityAssuranceLevel: assessment.identityAssuranceLevel,
    inviteId: testimonial.inviteId,
    recentMealObservationFrequency: testimonial.recentMealObservationFrequency,
    relationshipType: testimonial.relationshipType,
    scores: {
      baselineProbativeValueScoreDecimal: assessment.baselineProbativeValueScoreDecimal,
      collusionRiskScoreDecimal: assessment.collusionRiskScoreDecimal,
      consistencyScoreDecimal: assessment.consistencyScoreDecimal,
      independenceScoreDecimal: assessment.independenceScoreDecimal,
      knowledgeBasisScoreDecimal: assessment.knowledgeBasisScoreDecimal,
      relationshipWeightDecimal: assessment.relationshipWeightDecimal,
      specificityScoreDecimal: assessment.specificityScoreDecimal,
    },
    socialIdentitySeparatedFromClaimCredibility: true,
    testimonialId: testimonial.id,
    uncertaintyNotesPrivate: testimonial.uncertaintyNotesPrivate,
  };
}

export function buildFunderWitnessSummary(input: {
  reviewedWitnessStatementCount: number;
  policyAllowsCoarseSummary: boolean;
}): FunderWitnessSummary {
  const reviewedBaselineEvidenceUsed =
    input.policyAllowsCoarseSummary && input.reviewedWitnessStatementCount > 0;

  return {
    privateFieldsSuppressed: true,
    publicSummary: reviewedBaselineEvidenceUsed
      ? "Additionality estimate used reviewed baseline evidence."
      : null,
    reviewedBaselineEvidenceUsed,
  };
}

export function getGuestWitnessTestimonyContract(): GuestWitnessContract {
  return {
    acceptedConcernFlags: [...CONCERN_FLAGS],
    acceptedRelationshipTypes: [...RELATIONSHIP_TYPES],
    contractTests: [...CONTRACT_TESTS],
    duplicateResistanceRules: [
      "Hash external provider account ids and prevent the same external account from submitting multiple baseline testimonials for the same pledge-swap.",
      "Route reciprocal witnessing patterns, repeated same-pair testimony, possible pressure, and possible side payments to risk review.",
      "Participant invite creation has per-user active caps and cooldowns.",
    ],
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    frozenPolicyRule:
      "Baseline witness testimony may affect additionality or participant credibility only through a frozen policy snapshot. It cannot directly prove completion and cannot retroactively change fixed post-action consideration.",
    participantVisibilityRule:
      "Participants see only invite status values: pending, opened, submitted, declined, expired, revoked, reported, or blocked. Private refusal reasons, pressure reports, concern notes, risk flags, and exact scoring effects are suppressed.",
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    privacyRules: [
      "Witness testimony is private by default and is not public social-media testimony.",
      "Social-account connection is optional and supports identity assurance, duplicate resistance, anti-spam, ring detection, and future witness credibility only.",
      "Do not scrape, import, or analyze witness posts, DMs, followers, following, photos, likes, or private social data by default.",
      "Store provider, stable provider account id hash, permitted display/profile snapshots, verification timestamp, token status, approved scopes, and no long-lived token unless legal/privacy review approves it.",
      "Funders and public reports must not see witness identity, social handle, raw testimony, relationship, concern notes, provider, or private reviewer notes.",
    ],
    providerAbstraction: getWitnessIdentityProviders({ env: {} }),
    publicFunderRule:
      "Public and funder surfaces may at most say that reviewed baseline evidence was used, subject to policy and aggregation thresholds.",
    purpose:
      "Guest Witness Testimony lets a non-user privately provide baseline-only pre-pledge testimony through an expiring invite, with optional privacy-minimized social-account verification.",
    reviewerAuditRule:
      "Reviewer decisions that materially affect additionality, verification confidence, participant credibility, pricing, selection, or public reporting require an audit or policy-evaluation trace.",
    version: MORAL_TRADE_GUEST_WITNESS_CONTRACT_VERSION,
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): GuestWitnessContractValidation["checks"][number] {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

export function validateGuestWitnessTestimonyContract(
  contract = getGuestWitnessTestimonyContract(),
): GuestWitnessContractValidation {
  const providerNames = contract.providerAbstraction.map((provider) => provider.provider);
  const checks = [
    check(
      "record-table-coverage",
      "Contract names all guest witness records and audit/risk records",
      FIRST_CLASS_RECORD_TABLES.every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "provider-coverage",
      "Provider abstraction covers email, social providers, Google/Apple, and manual review",
      (["email_magic_link", "x", "facebook", "instagram", "google", "apple", "manual_review"] as WitnessProvider[]).every(
        (provider) => providerNames.includes(provider),
      ),
      providerNames.join(", "),
    ),
    check(
      "provider-fail-closed",
      "Unavailable social providers fail closed",
      contract.providerAbstraction
        .filter((provider) => ["x", "facebook", "instagram"].includes(provider.provider))
        .every((provider) => provider.failureBehavior === "fail_closed" && !provider.configured),
      contract.providerAbstraction
        .map((provider) => `${provider.provider}:${provider.configured}:${provider.failureBehavior}`)
        .join(", "),
    ),
    check(
      "privacy-minimization",
      "Privacy rules prohibit social scraping and public raw testimony",
      contract.privacyRules.some((rule) => /Do not scrape/i.test(rule)) &&
        contract.privacyRules.some((rule) => /Funders and public reports must not see witness identity/i.test(rule)),
      contract.privacyRules.join(" "),
    ),
    check(
      "participant-redaction",
      "Participant visibility is status-only",
      /only invite status/i.test(contract.participantVisibilityRule) &&
        /pressure reports/i.test(contract.participantVisibilityRule) &&
        /suppressed/i.test(contract.participantVisibilityRule),
      contract.participantVisibilityRule,
    ),
    check(
      "frozen-policy",
      "Frozen-policy rule blocks completion proof and retroactive fixed consideration changes",
      /frozen policy snapshot/i.test(contract.frozenPolicyRule) &&
        /cannot directly prove completion/i.test(contract.frozenPolicyRule) &&
        /cannot retroactively change fixed/i.test(contract.frozenPolicyRule),
      contract.frozenPolicyRule,
    ),
    check(
      "audit-rule",
      "Material reviewer uses require audit traces",
      /materially affect additionality/i.test(contract.reviewerAuditRule) &&
        /audit or policy-evaluation trace/i.test(contract.reviewerAuditRule),
      contract.reviewerAuditRule,
    ),
    check(
      "test-hooks",
      "Contract declares tests for non-user email flow, provider gates, redaction, frozen policy, duplicates, rings, and copy",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks.filter((entry) => entry.status === "fail").map((entry) => entry.id);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-guest-witness-testimony-contract",
    validatorVersion: MORAL_TRADE_GUEST_WITNESS_VALIDATOR_VERSION,
  };
}

export function createSeededBaselineWitnessDemo() {
  const now = "2026-06-25T12:00:00.000Z";
  const participantUserId = "participant-a";
  const actionWindowStartAt = "2026-06-27T00:00:00.000Z";
  const actionWindowEndAt = "2026-06-29T00:00:00.000Z";
  const inviteA = createBaselineWitnessInviteDraft({
    actionTemplateId: "two-day-no-meat-pledge",
    actionWindowEndAt,
    actionWindowStartAt,
    participantClaimedRelationship: "dining_companion",
    participantUserId,
    pledgeSwapId: "pledge-swap-demo",
    rawInviteToken: "demo-witness-a-token",
    witnessEmail: "witness-a@example.com",
    now,
  }).invite;

  if (!inviteA) throw new Error("Demo invite A failed.");

  const witnessA = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.85,
    baselineKnowledgeLevel: "high",
    basisText:
      "We eat lunch together often, usually several times a week, and she normally orders meat or fish when the group goes out.",
    invite: inviteA,
    providerAccount: { provider: "email_magic_link" },
    recentMealObservationFrequency: "weekly",
    relationshipType: "dining_companion",
    witnessEmail: "witness-a@example.com",
    now: "2026-06-25T12:05:00.000Z",
  });
  const witnessB = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: true,
    baselineCounterfactualCredenceDecimal: 0.99,
    baselineKnowledgeLevel: "low",
    basisText: "I just think it is very likely.",
    invite: { ...inviteA, id: "demo-invite-b", inviteTokenHash: stableWitnessHash("demo-b", "baseline-witness-invite-token") },
    providerAccount: {
      provider: "x",
      providerAccountDisplaySnapshot: "@witness_b",
      providerAccountId: "x-witness-b",
    },
    providerConfig: {
      env: {
        WITNESS_X_CLIENT_ID: "configured",
        WITNESS_X_OAUTH_ENABLED: "true",
        WITNESS_X_REDIRECT_URI: "https://www.moraltrade.org/api/auth/x/callback",
      },
    },
    recentMealObservationFrequency: "once",
    relationshipType: "friend",
    witnessEmail: "witness-b@example.com",
    now: "2026-06-25T12:10:00.000Z",
  });
  const witnessCParticipantStatus = buildParticipantWitnessInviteStatus({
    ...inviteA,
    id: "demo-invite-c",
    inviteStatus: "reported",
    participantClaimedRelationship: "coworker",
  });
  const policyApplication =
    witnessA.testimonial && witnessA.assessment
      ? applyBaselineWitnessFrozenPolicy({
          assessment: {
            ...witnessA.assessment,
            acceptedForAdditionality: true,
            reviewStatus: "accepted",
          },
          policy: {
            actionWindowStartAt,
            additionalityAdjustedSettlementEnabled: true,
            finalAdditionalityProbabilityDecimal: 0.62,
            fixedConsiderationLocked: false,
            maxAdditionalityAdjustmentDecimal: 0.08,
            participantCredibilityUpdateEnabled: true,
            policySnapshotRef: "policy-snapshot:baseline-witness-demo-v1",
            policyStatus: "frozen",
            termsAcceptedAt: "2026-06-25T12:01:00.000Z",
          },
          testimonial: witnessA.testimonial,
        })
      : null;

  return {
    participant: {
      action: "2-day no-meat pledge-swap",
      id: participantUserId,
    },
    publicReport: buildFunderWitnessSummary({
      policyAllowsCoarseSummary: true,
      reviewedWitnessStatementCount: 1,
    }),
    reviewerDemo: {
      witnessA: witnessA.testimonial && witnessA.assessment
        ? buildReviewerWitnessSummary({
            assessment: witnessA.assessment,
            testimonial: witnessA.testimonial,
          })
        : null,
      witnessB: witnessB.testimonial && witnessB.assessment
        ? buildReviewerWitnessSummary({
            assessment: witnessB.assessment,
            testimonial: witnessB.testimonial,
          })
        : null,
      witnessC: {
        participantVisible: witnessCParticipantStatus,
        riskReviewRoute: "baseline_witness_pressure_review",
        rawPressureReportVisibleToParticipant: false,
      },
    },
    witnessA,
    witnessB,
    witnessCParticipantStatus,
    witnessPolicyApplication: policyApplication,
  };
}
