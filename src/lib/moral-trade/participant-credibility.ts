import { createHash } from "node:crypto";

export const MORAL_TRADE_PARTICIPANT_CREDIBILITY_CONTRACT_VERSION =
  "moral-trade-participant-credibility-v0.1-2026-06";
export const MORAL_TRADE_PARTICIPANT_CREDIBILITY_VALIDATOR_VERSION =
  "moral-trade-participant-credibility-validator-v0.1";

const DEFAULT_HASH_ALGORITHM = "sha256";
const DEFAULT_CANONICALIZATION_VERSION = "canonical-json-v1-sorted-keys";

export type ParticipantCredibilityTier = "new" | "limited" | "standard" | "high" | "under_review";

export type CredibilityEventType =
  | "pledge_swap_completed"
  | "pledge_swap_failed"
  | "pledge_swap_withdrawn"
  | "pledge_swap_disputed"
  | "pledge_swap_appeal_correction"
  | "friend_testimonial_consistent"
  | "friend_testimonial_contradicted"
  | "friend_concern_report_supported";

export type CredibilityAppealStatus =
  | "none"
  | "appeal_available"
  | "appealed"
  | "appeal_resolved"
  | "appeal_expired";

export type FriendInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "revoked"
  | "blocked"
  | "reported";

export type RelationshipType =
  | "friend"
  | "family"
  | "roommate"
  | "romantic_partner"
  | "classmate"
  | "coworker"
  | "other";

export type KnowledgeLevel = "none" | "low" | "moderate" | "high";

export type TestimonialConcernFlag =
  | "none"
  | "possible_noncompletion"
  | "possible_baseline_manipulation"
  | "possible_pressure"
  | "possible_side_payment"
  | "other";

export type FriendTestimonialStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "partially_accepted"
  | "rejected"
  | "disputed"
  | "blocked";

export type TestimonialReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_more_info"
  | "disputed";

export type TestimonialCredibilityEventType =
  | "accurate_supportive_testimony"
  | "inaccurate_testimony"
  | "contradicted_testimony"
  | "concern_report_supported"
  | "concern_report_not_supported"
  | "reckless_or_fraudulent_testimony"
  | "appeal_correction";

export type TestimonialStakeDestinationPolicy =
  | "same_charity"
  | "neutral_approved_charity"
  | "random_same_cause_charity"
  | "no_stake";

export type TestimonialStakeStatus =
  | "proposed"
  | "authorized"
  | "donated"
  | "released"
  | "failed"
  | "cancelled"
  | "blocked";

export interface ParticipantCredibilityProfile {
  participantUserId: string;
  credibilityScoreDecimal: number;
  credibilityTier: ParticipantCredibilityTier;
  expectedCompletionProbabilityDecimal: number;
  evidenceReliabilityDecimal: number;
  fraudRiskDecimal: number;
  futureVerificationBurden: "light" | "standard" | "heightened" | "manual_review";
  lastCredibilityEventId: string | null;
  appealStatus: CredibilityAppealStatus;
  updatedAt: string;
}

export interface CredibilityEvent {
  id: string;
  participantUserId: string;
  sourceType: "pledge_swap" | "friend_testimonial" | "review" | "appeal";
  sourceId: string;
  eventType: CredibilityEventType;
  priorCredibilityScoreDecimal: number;
  credibilityDeltaDecimal: number;
  newCredibilityScoreDecimal: number;
  evidenceQualityScoreDecimal: number;
  finalAdditionalityProbabilityDecimal: number;
  verificationConfidenceDecimal: number;
  policySnapshotHash: string;
  participantVisibleReason: string | null;
  privateReviewerNotesRef: string | null;
  appealStatus: CredibilityAppealStatus;
  correctionOfEventId: string | null;
  createdAt: string;
}

export interface CredibilityAppeal {
  id: string;
  participantUserId: string;
  sourceCredibilityEventId: string;
  appealStatus: "available" | "submitted" | "under_review" | "resolved" | "expired";
  participantVisibleReason: string;
  privateReviewerNotesRef: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TestimonialStakePolicy {
  id: string;
  policyVersion: string;
  canonicalJson: string;
  policyHash: string;
  status: "draft" | "active" | "superseded";
  defaultStakeRequired: false;
  optionalStakeEnabled: boolean;
  minimumStakeMinor: number | null;
  maximumStakeMinor: number | null;
  percentageOfConsiderationDecimal: number | null;
  destinationPolicy: TestimonialStakeDestinationPolicy;
  refundOrForfeitPolicy: string | null;
  legalComplianceReviewRef: string | null;
  createdAt: string;
  activatedAt: string | null;
}

export interface CredibilityScoringPolicy {
  id: string;
  policyVersion: string;
  policyHash: string;
  status: "draft" | "active" | "superseded";
  maxSingleTestimonialEvidenceQualityDeltaDecimal: number;
  maxSingleTestimonialAdditionalityDeltaDecimal: number;
  maxSingleTestimonialVerificationConfidenceDeltaDecimal: number;
  maxSingleTestimonialCredibilityDeltaDecimal: number;
  highStakesStandaloneTestimonialVerificationAllowed: false;
  lowRiskStandaloneTestimonialVerificationAllowed: boolean;
  privacyInvasiveEvidenceOverrewardCapDecimal: number;
  testimonialStakePolicy: TestimonialStakePolicy;
  seedDefaults: {
    textSelfAttestation: "weak";
    platformCheckinsPlusFinalDeclaration: "standard";
    redactedReceiptsPlusDeclaration: "strong";
    oneHighKnowledgeFriend: "standard_to_strong_support";
    contradictedFriendTestimony: "low_or_negative";
  };
  createdAt: string;
  activatedAt: string | null;
}

export interface FriendTestimonialInvite {
  id: string;
  pledgeSwapId: string | null;
  purchaseEnvelopeType: string | null;
  purchaseEnvelopeId: string | null;
  participantActionCommitmentId: string | null;
  participantUserId: string;
  invitedFriendUserId: string | null;
  invitedFriendEmailHash: string | null;
  inviteTokenHash: string;
  inviteStatus: FriendInviteStatus;
  relationshipClaimedByParticipant: RelationshipType | null;
  minimumNecessaryDisclosure: {
    actionType: string;
    actionWindowStartAt: string;
    actionWindowEndAt: string;
    participantProvidedContext: string | null;
    testimonialRequestDisclosed: true;
  };
  hiddenFromInvite: string[];
  expiresAt: string;
  revokedAt: string | null;
  abuseReportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FriendTestimonial {
  id: string;
  inviteId: string;
  participantUserId: string;
  friendUserId: string;
  pledgeSwapId: string | null;
  purchaseEnvelopeType: string | null;
  purchaseEnvelopeId: string | null;
  participantActionCommitmentId: string | null;
  actionTemplateId: string;
  actionWindowStartAt: string;
  actionWindowEndAt: string;
  relationshipType: RelationshipType;
  relationshipContextPrivate: string | null;
  baselineKnowledgeLevel: KnowledgeLevel;
  completionKnowledgeLevel: KnowledgeLevel;
  baselineCounterfactualCredenceDecimal: number | null;
  completionCredenceDecimal: number | null;
  baselineBasisJson: string[];
  completionBasisJson: string[];
  concernFlag: TestimonialConcernFlag;
  concernNotesPrivate: string | null;
  testimonyTextPrivate: string | null;
  friendTermsAcceptanceId: string;
  submittedAt: string;
  testimonialStatus: FriendTestimonialStatus;
  reviewerUserId: string | null;
  participantVisibleSummary: string | null;
  privateReviewerNotesRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialQualityAssessment {
  id: string;
  friendTestimonialId: string;
  participantUserId: string;
  friendUserId: string;
  sourceType: "friend_testimonial";
  sourceId: string;
  relationshipWeightDecimal: number;
  friendCredibilityWeightDecimal: number;
  specificityScoreDecimal: number;
  knowledgeBasisScoreDecimal: number;
  consistencyScoreDecimal: number;
  independenceScoreDecimal: number;
  collusionRiskScoreDecimal: number;
  privacySensitivityScoreDecimal: number;
  baselineProbativeValueScoreDecimal: number;
  completionProbativeValueScoreDecimal: number;
  acceptedForAdditionality: boolean;
  acceptedForCompletionVerification: boolean;
  acceptedForCredibilityUpdate: boolean;
  reviewerId: string | null;
  reviewStatus: TestimonialReviewStatus;
  participantVisibleSummary: string | null;
  privateNotesRef: string | null;
  riskReviewFlags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialCredibilityEvent {
  id: string;
  friendUserId: string;
  sourceFriendTestimonialId: string;
  relatedParticipantUserId: string;
  eventType: TestimonialCredibilityEventType;
  priorTestimonialCredibilityDecimal: number;
  deltaDecimal: number;
  newTestimonialCredibilityDecimal: number;
  participantVisibleReason: string | null;
  friendVisibleReason: string;
  privateReviewerNotesRef: string | null;
  policySnapshotHash: string;
  appealStatus: CredibilityAppealStatus;
  createdAt: string;
}

export interface TestimonialStake {
  id: string;
  friendTestimonialId: string;
  friendUserId: string;
  amountMinor: number;
  currency: string;
  destinationPolicy: TestimonialStakeDestinationPolicy;
  donationRecipientId: string | null;
  stakeStatus: TestimonialStakeStatus;
  paymentOperationId: string | null;
  donorOfRecordPolicySnapshotHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEvaluationTrace {
  id: string;
  subjectType: "friend_testimonial";
  subjectId: string;
  policyHash: string;
  materialEffects: Array<
    "evidence_quality" | "additionality" | "verification_confidence" | "participant_credibility"
  >;
  effectSummary: string;
  createdAt: string;
}

export interface ParticipantCredibilityContract {
  version: typeof MORAL_TRADE_PARTICIPANT_CREDIBILITY_CONTRACT_VERSION;
  purpose: string;
  ordinaryUiPreferredTerm: "Participant credibility";
  ordinaryUiBannedTerms: string[];
  modelNames: string[];
  renamedFields: Array<{ from: string; to: string }>;
  firstClassRecordTables: string[];
  privacyBoundary: string;
  friendInviteRules: {
    defaultMinInvites: number;
    defaultMaxInvites: number;
    privateRevocableExpiringRateLimited: true;
    minimumNecessaryDisclosureFields: string[];
    inviteMustHideFields: string[];
  };
  testimonialQuestions: string[];
  friendCredibilityWeightInputs: string[];
  scoringPolicy: CredibilityScoringPolicy;
  testimonialStakePolicy: TestimonialStakePolicy;
  reviewerGovernanceRules: string[];
  funderDisclosureRules: string[];
  publicReportingRules: string[];
  antiGamingControls: string[];
  seedDemo: ParticipantCredibilitySeedDemo;
  contractTests: string[];
}

export interface ParticipantCredibilitySeedDemo {
  slug: "two-day-no-meat-credibility-demo";
  participants: Array<{
    participantId: string;
    friendId: string;
    summary: string;
    result: string;
  }>;
  publicReportSummary: string;
}

export interface ParticipantCredibilityValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-participant-credibility-contract";
  validatorVersion: typeof MORAL_TRADE_PARTICIPANT_CREDIBILITY_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_PARTICIPANT_CREDIBILITY_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

export interface FriendTestimonialInviteInput {
  participantUserId: string;
  invitedFriendUserId?: string | null;
  invitedFriendEmailHash?: string | null;
  pledgeSwapId?: string | null;
  purchaseEnvelopeType?: string | null;
  purchaseEnvelopeId?: string | null;
  participantActionCommitmentId?: string | null;
  relationshipClaimedByParticipant?: RelationshipType | null;
  actionType: string;
  actionWindowStartAt: string;
  actionWindowEndAt: string;
  participantProvidedContext?: string | null;
  existingPendingInviteCount?: number;
  tokenSeed: string;
  now?: string;
  expiresAt?: string;
}

export interface FriendTestimonialFormInput {
  friendUserId: string;
  actionTemplateId: string;
  relationshipType: RelationshipType;
  relationshipContextPrivate?: string | null;
  baselineKnowledgeLevel: KnowledgeLevel;
  completionKnowledgeLevel: KnowledgeLevel;
  baselineCounterfactualCredenceDecimal?: number | null;
  completionCredenceDecimal?: number | null;
  baselineBasisJson: string[];
  completionBasisJson: string[];
  concernFlag?: TestimonialConcernFlag;
  concernNotesPrivate?: string | null;
  testimonyTextPrivate?: string | null;
  friendTermsAcceptanceId?: string | null;
  submittedAt?: string;
}

export interface TestimonialEvaluationContext {
  otherEvidenceConsistency: "consistent" | "unresolved" | "contradicted";
  directEvidenceContradiction?: boolean;
  concernLaterSupported?: boolean;
  highStakesPledgeSwap?: boolean;
  sameHousehold?: boolean;
  samePaymentInstrument?: boolean;
  reciprocalTestimonialCount?: number;
  repeatedSmallGroupCount?: number;
  friendSubmittedRecentTestimonialCount?: number;
  templatedTextDetected?: boolean;
}

export interface ParticipantCredibilityImpact {
  status: "pass" | "blocked";
  evidenceQualityDeltaDecimal: number;
  finalAdditionalityProbabilityDeltaDecimal: number;
  verificationConfidenceDeltaDecimal: number;
  participantCredibilityDeltaDecimal: number;
  canTestimonialAloneVerify: boolean;
  fixedPostActionConsiderationAdjustmentMinor: 0;
  blockers: string[];
  participantCredibilityEvent: CredibilityEvent | null;
  friendTestimonialCredibilityEvent: TestimonialCredibilityEvent | null;
  policyEvaluationTrace: PolicyEvaluationTrace | null;
}

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_participant_credibility_profiles",
  "moral_trade_credibility_events",
  "moral_trade_credibility_scoring_policies",
  "moral_trade_credibility_appeals",
  "moral_trade_friend_testimonial_invites",
  "moral_trade_friend_testimonials",
  "moral_trade_testimonial_quality_assessments",
  "moral_trade_testimonial_credibility_events",
  "moral_trade_testimonial_stake_policies",
  "moral_trade_testimonial_stakes",
] as const;

const MODEL_NAMES = [
  "ParticipantCredibilityProfile",
  "CredibilityEvent",
  "CredibilityScoringPolicy",
  "CredibilityAppeal",
  "FriendTestimonialInvite",
  "FriendTestimonial",
  "TestimonialQualityAssessment",
  "TestimonialCredibilityEvent",
  "TestimonialStakePolicy",
  "TestimonialStake",
] as const;

const ORDINARY_UI_BANNED_TERMS = [
  "social credit",
  "credit score",
  "credit tier",
  "credit page",
  "reputation score",
  "participant reliability",
  "reliability profile",
] as const;

const RENAMED_FIELDS = [
  { from: "last_credit_event_id", to: "last_credibility_event_id" },
  { from: "CreditEvent", to: "CredibilityEvent" },
  { from: "CreditScoringPolicy", to: "CredibilityScoringPolicy" },
  { from: "CreditAppeal", to: "CredibilityAppeal" },
  { from: "credit delta", to: "credibility delta" },
  { from: "credit score", to: "credibility score" },
  { from: "credit tier", to: "credibility tier" },
  { from: "credit page", to: "credibility page" },
] as const;

const TESTIMONIAL_QUESTIONS = [
  "How do you know the participant?",
  "How much direct knowledge do you have of the participant's ordinary diet before this pledge?",
  "What is your credence that the participant would have eaten meat/fish during this action window if not for the pledge-swap?",
  "What is the basis for your baseline/additionality credence?",
  "What is your credence that the participant did not eat meat/fish during the action window?",
  "What is the basis for your completion credence?",
  "Do you have any reason to think the participant ate meat/fish, exaggerated, felt pressured, or submitted misleading evidence?",
  "I understand this testimonial may affect the participant's credibility on Moral Trade. I should not guess beyond what I know. False or reckless testimonials can reduce my own testimonial credibility.",
] as const;

const FRIEND_CREDIBILITY_WEIGHT_INPUTS = [
  "friend_own_moral_trade_credibility",
  "verified_account",
  "relationship_type",
  "knowledge_basis",
  "specificity",
  "consistency_with_other_evidence",
  "testimonial_accuracy_history",
  "related_party_and_collusion_risk",
  "suspicious_testimonial_volume",
  "later_contradictory_evidence",
] as const;

const CONTRACT_TESTS = [
  "participant_credibility_contract_validator",
  "participant_credibility_terminology_guard",
  "friend_testimonial_invite_submit_decline_flow",
  "friend_testimonial_private_concern_redaction",
  "friend_testimonial_frozen_policy_scoring_cap",
  "friend_testimonial_optional_stake_policy",
  "friend_testimonial_anti_gaming_review",
  "friend_testimonial_append_only_credibility_events",
  "friend_testimonial_public_funder_redaction",
  "participant_credibility_route_contract",
  "participant_credibility_schema_contract",
] as const;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function hashJson(value: unknown) {
  return `${DEFAULT_HASH_ALGORITHM}:${createHash(DEFAULT_HASH_ALGORITHM)
    .update(stableStringify(value))
    .digest("hex")}`;
}

function idFromParts(prefix: string, ...parts: unknown[]) {
  return `${prefix}:${createHash(DEFAULT_HASH_ALGORITHM)
    .update(stableStringify(parts))
    .digest("hex")
    .slice(0, 24)}`;
}

function clampDecimal(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function check(
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

function knowledgeLevelWeight(level: KnowledgeLevel) {
  if (level === "high") return 1;
  if (level === "moderate") return 0.72;
  if (level === "low") return 0.38;
  return 0.05;
}

function relationshipWeight(relationship: RelationshipType) {
  const weights: Record<RelationshipType, number> = {
    classmate: 0.45,
    coworker: 0.45,
    family: 0.6,
    friend: 0.58,
    other: 0.3,
    romantic_partner: 0.62,
    roommate: 0.82,
  };

  return weights[relationship];
}

function basisScore(values: string[]) {
  if (!values.length) {
    return 0.05;
  }

  const joined = values.join(" ").toLowerCase();
  let score = Math.min(0.4 + values.length * 0.12, 0.85);

  if (/ate with|shared meal|saw some|receipts|photos|messages|meal plans|shopping/.test(joined)) {
    score += 0.12;
  }

  if (/weak|secondhand|none/.test(joined)) {
    score -= 0.22;
  }

  return clampDecimal(score);
}

function consistencyScore(context: TestimonialEvaluationContext) {
  if (context.directEvidenceContradiction || context.otherEvidenceConsistency === "contradicted") {
    return 0.05;
  }

  if (context.concernLaterSupported) {
    return 0.9;
  }

  if (context.otherEvidenceConsistency === "consistent") {
    return 0.82;
  }

  return 0.5;
}

function collusionRiskScore(context: TestimonialEvaluationContext) {
  let score = 0;

  if (context.sameHousehold) score += 0.2;
  if (context.samePaymentInstrument) score += 0.35;
  if ((context.reciprocalTestimonialCount ?? 0) > 0) score += 0.25;
  if ((context.repeatedSmallGroupCount ?? 0) >= 3) score += 0.25;
  if ((context.friendSubmittedRecentTestimonialCount ?? 0) >= 8) score += 0.18;
  if (context.templatedTextDetected) score += 0.2;

  return clampDecimal(score);
}

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

const DEFAULT_TESTIMONIAL_STAKE_POLICY: TestimonialStakePolicy = {
  activatedAt: "2026-06-26T00:00:00.000Z",
  canonicalJson: "",
  createdAt: "2026-06-26T00:00:00.000Z",
  defaultStakeRequired: false,
  destinationPolicy: "no_stake",
  id: "testimonial-stake-policy:no-monetary-stake:v1",
  legalComplianceReviewRef: null,
  maximumStakeMinor: null,
  minimumStakeMinor: null,
  optionalStakeEnabled: false,
  percentageOfConsiderationDecimal: null,
  policyHash: "",
  policyVersion: "testimonial-stake-policy.no-monetary-stake.v1",
  refundOrForfeitPolicy: null,
  status: "active",
};

const DEFAULT_SCORING_POLICY: CredibilityScoringPolicy = {
  activatedAt: "2026-06-26T00:00:00.000Z",
  createdAt: "2026-06-26T00:00:00.000Z",
  highStakesStandaloneTestimonialVerificationAllowed: false,
  id: "credibility-scoring-policy:friend-testimonial:v1",
  lowRiskStandaloneTestimonialVerificationAllowed: true,
  maxSingleTestimonialAdditionalityDeltaDecimal: 0.08,
  maxSingleTestimonialCredibilityDeltaDecimal: 0.06,
  maxSingleTestimonialEvidenceQualityDeltaDecimal: 0.12,
  maxSingleTestimonialVerificationConfidenceDeltaDecimal: 0.1,
  policyHash: "",
  policyVersion: "credibility-scoring-policy.friend-testimonial.v1",
  privacyInvasiveEvidenceOverrewardCapDecimal: 0.04,
  seedDefaults: {
    contradictedFriendTestimony: "low_or_negative",
    oneHighKnowledgeFriend: "standard_to_strong_support",
    platformCheckinsPlusFinalDeclaration: "standard",
    redactedReceiptsPlusDeclaration: "strong",
    textSelfAttestation: "weak",
  },
  status: "active",
  testimonialStakePolicy: DEFAULT_TESTIMONIAL_STAKE_POLICY,
};

const DEFAULT_STAKE_POLICY_WITH_HASH = {
  ...DEFAULT_TESTIMONIAL_STAKE_POLICY,
  canonicalJson: stableStringify({
    defaultStakeRequired: false,
    destinationPolicy: "no_stake",
    optionalStakeEnabled: false,
  }),
};
DEFAULT_STAKE_POLICY_WITH_HASH.policyHash = hashJson(DEFAULT_STAKE_POLICY_WITH_HASH.canonicalJson);

export const MORAL_TRADE_DEFAULT_TESTIMONIAL_STAKE_POLICY: TestimonialStakePolicy =
  DEFAULT_STAKE_POLICY_WITH_HASH;

export const MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY: CredibilityScoringPolicy = {
  ...DEFAULT_SCORING_POLICY,
  policyHash: hashJson({
    maxSingleTestimonialAdditionalityDeltaDecimal:
      DEFAULT_SCORING_POLICY.maxSingleTestimonialAdditionalityDeltaDecimal,
    maxSingleTestimonialCredibilityDeltaDecimal:
      DEFAULT_SCORING_POLICY.maxSingleTestimonialCredibilityDeltaDecimal,
    maxSingleTestimonialEvidenceQualityDeltaDecimal:
      DEFAULT_SCORING_POLICY.maxSingleTestimonialEvidenceQualityDeltaDecimal,
    maxSingleTestimonialVerificationConfidenceDeltaDecimal:
      DEFAULT_SCORING_POLICY.maxSingleTestimonialVerificationConfidenceDeltaDecimal,
    testimonialStakePolicyHash: MORAL_TRADE_DEFAULT_TESTIMONIAL_STAKE_POLICY.policyHash,
  }),
  testimonialStakePolicy: MORAL_TRADE_DEFAULT_TESTIMONIAL_STAKE_POLICY,
};

export function createOptionalStakePolicy(overrides: Partial<TestimonialStakePolicy> = {}) {
  const canonical = {
    defaultStakeRequired: false,
    destinationPolicy: overrides.destinationPolicy ?? "neutral_approved_charity",
    maximumStakeMinor: overrides.maximumStakeMinor ?? 1_000,
    minimumStakeMinor: overrides.minimumStakeMinor ?? 100,
    optionalStakeEnabled: overrides.optionalStakeEnabled ?? true,
    percentageOfConsiderationDecimal: overrides.percentageOfConsiderationDecimal ?? 0.02,
  };

  const policy: TestimonialStakePolicy = {
    activatedAt: "2026-06-26T00:00:00.000Z",
    canonicalJson: stableStringify(canonical),
    createdAt: "2026-06-26T00:00:00.000Z",
    defaultStakeRequired: false,
    destinationPolicy: canonical.destinationPolicy,
    id: overrides.id ?? "testimonial-stake-policy:optional-capped:v1",
    legalComplianceReviewRef:
      overrides.legalComplianceReviewRef ?? "compliance-review:testimonial-stake-v1",
    maximumStakeMinor: canonical.maximumStakeMinor,
    minimumStakeMinor: canonical.minimumStakeMinor,
    optionalStakeEnabled: canonical.optionalStakeEnabled,
    percentageOfConsiderationDecimal: canonical.percentageOfConsiderationDecimal,
    policyHash: "",
    policyVersion: overrides.policyVersion ?? "testimonial-stake-policy.optional-capped.v1",
    refundOrForfeitPolicy:
      overrides.refundOrForfeitPolicy ?? "Donated stakes are not proof and follow charity-receipt correction policy.",
    status: overrides.status ?? "active",
  };

  return {
    ...policy,
    policyHash: hashJson(policy.canonicalJson),
  };
}

export function calculateOptionalTestimonialStakeMinor(input: {
  considerationAmountMinor: number;
  testimonyKind: "supportive" | "uncertain" | "contradictory" | "concern";
  policy?: TestimonialStakePolicy;
}) {
  const policy = input.policy ?? MORAL_TRADE_DEFAULT_TESTIMONIAL_STAKE_POLICY;

  if (!policy.optionalStakeEnabled || input.testimonyKind !== "supportive") {
    return null;
  }

  const minimum = policy.minimumStakeMinor ?? 0;
  const maximum = policy.maximumStakeMinor ?? minimum;
  const percentage = policy.percentageOfConsiderationDecimal ?? 0;
  const formulaAmount = Math.round(input.considerationAmountMinor * percentage);

  return Math.min(Math.max(formulaAmount, minimum), maximum);
}

export function lintOrdinaryCredibilityCopy(text: string) {
  const normalized = text.toLowerCase();
  const blockers = ORDINARY_UI_BANNED_TERMS.filter((term) => normalized.includes(term)).map(
    (term) => `ordinary_ui_banned_credibility_term:${term}`,
  );

  return {
    blockers,
    status: blockers.length ? ("fail" as const) : ("pass" as const),
  };
}

export function createFriendTestimonialInvite(
  input: FriendTestimonialInviteInput,
  options: {
    maxInvites?: number;
  } = {},
) {
  const blockers: string[] = [];
  const now = input.now ?? new Date().toISOString();
  const maxInvites = options.maxInvites ?? 3;

  if (!input.invitedFriendUserId && !input.invitedFriendEmailHash) {
    blockers.push("friend_invite_requires_user_or_email_hash");
  }

  if ((input.existingPendingInviteCount ?? 0) >= maxInvites) {
    blockers.push("friend_invite_policy_limit_reached");
  }

  if (!isIsoDate(input.actionWindowStartAt) || !isIsoDate(input.actionWindowEndAt)) {
    blockers.push("friend_invite_action_window_invalid");
  }

  const invite: FriendTestimonialInvite = {
    abuseReportCount: 0,
    createdAt: now,
    expiresAt: input.expiresAt ?? addDays(now, 14),
    hiddenFromInvite: [
      "funder identities",
      "payout details",
      "private baseline answers",
      "other evidence",
      "risk flags",
      "reviewer notes",
      "exact scoring rules",
    ],
    id: idFromParts("friend-testimonial-invite", input.participantUserId, input.tokenSeed),
    inviteStatus: blockers.length ? "blocked" : "pending",
    inviteTokenHash: hashJson({
      participantUserId: input.participantUserId,
      tokenSeed: input.tokenSeed,
    }),
    invitedFriendEmailHash: input.invitedFriendEmailHash ?? null,
    invitedFriendUserId: input.invitedFriendUserId ?? null,
    minimumNecessaryDisclosure: {
      actionType: input.actionType,
      actionWindowEndAt: input.actionWindowEndAt,
      actionWindowStartAt: input.actionWindowStartAt,
      participantProvidedContext: input.participantProvidedContext ?? null,
      testimonialRequestDisclosed: true,
    },
    participantActionCommitmentId: input.participantActionCommitmentId ?? null,
    participantUserId: input.participantUserId,
    pledgeSwapId: input.pledgeSwapId ?? null,
    purchaseEnvelopeId: input.purchaseEnvelopeId ?? null,
    purchaseEnvelopeType: input.purchaseEnvelopeType ?? null,
    relationshipClaimedByParticipant: input.relationshipClaimedByParticipant ?? null,
    revokedAt: null,
    updatedAt: now,
  };

  return {
    blockers,
    invite,
    ok: blockers.length === 0,
  };
}

export function declineFriendTestimonialInvite(
  invite: FriendTestimonialInvite,
  now = new Date().toISOString(),
) {
  return {
    friendVisibleStatus: "declined_without_penalty",
    invite: {
      ...invite,
      inviteStatus: "declined" as const,
      updatedAt: now,
    },
    participantVisibleSummary: "The invited friend declined or did not participate.",
    privateRefusalReasonVisibleToParticipant: false,
  };
}

export function submitFriendTestimonial(invite: FriendTestimonialInvite, form: FriendTestimonialFormInput) {
  const blockers: string[] = [];
  const submittedAt = form.submittedAt ?? new Date().toISOString();

  if (invite.inviteStatus !== "pending" && invite.inviteStatus !== "accepted") {
    blockers.push(`friend_invite_not_submittable:${invite.inviteStatus}`);
  }

  if (!form.friendTermsAcceptanceId) {
    blockers.push("friend_terms_acceptance_required");
  }

  for (const [key, value] of [
    ["baselineCounterfactualCredenceDecimal", form.baselineCounterfactualCredenceDecimal],
    ["completionCredenceDecimal", form.completionCredenceDecimal],
  ] as const) {
    if (value != null && (value < 0 || value > 1 || !Number.isFinite(value))) {
      blockers.push(`${key}_out_of_bounds`);
    }
  }

  const concernFlag = form.concernFlag ?? "none";
  const testimonial: FriendTestimonial = {
    actionTemplateId: form.actionTemplateId,
    actionWindowEndAt: invite.minimumNecessaryDisclosure.actionWindowEndAt,
    actionWindowStartAt: invite.minimumNecessaryDisclosure.actionWindowStartAt,
    baselineBasisJson: form.baselineBasisJson,
    baselineCounterfactualCredenceDecimal: form.baselineCounterfactualCredenceDecimal ?? null,
    baselineKnowledgeLevel: form.baselineKnowledgeLevel,
    completionBasisJson: form.completionBasisJson,
    completionCredenceDecimal: form.completionCredenceDecimal ?? null,
    completionKnowledgeLevel: form.completionKnowledgeLevel,
    concernFlag,
    concernNotesPrivate: form.concernNotesPrivate ?? null,
    createdAt: submittedAt,
    friendTermsAcceptanceId: form.friendTermsAcceptanceId ?? "",
    friendUserId: form.friendUserId,
    id: idFromParts("friend-testimonial", invite.id, form.friendUserId, submittedAt),
    inviteId: invite.id,
    participantActionCommitmentId: invite.participantActionCommitmentId,
    participantUserId: invite.participantUserId,
    participantVisibleSummary:
      concernFlag === "none"
        ? "A friend testimonial was submitted for reviewer use."
        : "A friend submitted a private concern for reviewer use.",
    pledgeSwapId: invite.pledgeSwapId,
    privateReviewerNotesRef:
      concernFlag === "none" ? null : idFromParts("private-friend-concern", invite.id, form.friendUserId),
    purchaseEnvelopeId: invite.purchaseEnvelopeId,
    purchaseEnvelopeType: invite.purchaseEnvelopeType,
    relationshipContextPrivate: form.relationshipContextPrivate ?? null,
    relationshipType: form.relationshipType,
    reviewerUserId: null,
    submittedAt,
    testimonialStatus: concernFlag === "none" ? "submitted" : "under_review",
    testimonyTextPrivate: form.testimonyTextPrivate ?? null,
    updatedAt: submittedAt,
  };

  return {
    accessLog: {
      accessClass: "review_scoped_private",
      rawTestimonyVisibleToFunders: false,
      rawTestimonyVisibleToPublic: false,
      subjectId: testimonial.id,
    },
    auditEvent: {
      action: "friend_testimonial_submitted",
      id: idFromParts("audit-event", testimonial.id),
      participantUserId: testimonial.participantUserId,
      privateConcernRoutedToRiskReview: concernFlag !== "none",
    },
    blockers,
    invite: {
      ...invite,
      inviteStatus: blockers.length ? invite.inviteStatus : ("accepted" as const),
      updatedAt: submittedAt,
    },
    ok: blockers.length === 0,
    receipt: {
      id: idFromParts("friend-testimonial-receipt", testimonial.id),
      privateReceipt: true,
      testimonialId: testimonial.id,
    },
    testimonial,
  };
}

export function assessFriendTestimonialQuality(input: {
  testimonial: FriendTestimonial;
  friendProfile: { testimonialCredibilityDecimal: number; verifiedAccount: boolean };
  context: TestimonialEvaluationContext;
  reviewerId?: string | null;
  now?: string;
}): TestimonialQualityAssessment {
  const now = input.now ?? new Date().toISOString();
  const testimonial = input.testimonial;
  const baselineKnowledge = knowledgeLevelWeight(testimonial.baselineKnowledgeLevel);
  const completionKnowledge = knowledgeLevelWeight(testimonial.completionKnowledgeLevel);
  const baselineBasis = basisScore(testimonial.baselineBasisJson);
  const completionBasis = basisScore(testimonial.completionBasisJson);
  const relationship = relationshipWeight(testimonial.relationshipType);
  const friendCredibility = clampDecimal(
    input.friendProfile.testimonialCredibilityDecimal + (input.friendProfile.verifiedAccount ? 0.05 : -0.08),
  );
  const consistency = consistencyScore(input.context);
  const collusionRisk = collusionRiskScore(input.context);
  const independence = clampDecimal(1 - collusionRisk);
  const specificity = clampDecimal(
    Math.max(baselineBasis, completionBasis) +
      (hasText(testimonial.testimonyTextPrivate) ? 0.08 : 0) -
      (input.context.templatedTextDetected ? 0.2 : 0),
  );
  const knowledgeBasisScore = clampDecimal((baselineKnowledge + completionKnowledge + baselineBasis + completionBasis) / 4);
  const baselineProbativeValue = clampDecimal(baselineKnowledge * baselineBasis * relationship * independence);
  const completionProbativeValue = clampDecimal(completionKnowledge * completionBasis * relationship * independence);
  const riskReviewFlags: string[] = [];

  if (collusionRisk >= 0.45) riskReviewFlags.push("collusion_or_related_party_review");
  if ((input.context.reciprocalTestimonialCount ?? 0) > 0) riskReviewFlags.push("reciprocal_testimonial_ring_review");
  if ((input.context.repeatedSmallGroupCount ?? 0) >= 3) riskReviewFlags.push("repeated_small_group_review");
  if ((input.context.friendSubmittedRecentTestimonialCount ?? 0) >= 8) riskReviewFlags.push("suspicious_testimonial_volume_review");
  if (input.context.templatedTextDetected) riskReviewFlags.push("templated_testimony_review");
  if (testimonial.concernFlag === "possible_pressure") riskReviewFlags.push("coercion_or_pressure_risk_review");
  if (testimonial.concernFlag === "possible_side_payment") riskReviewFlags.push("off_platform_side_payment_risk_review");
  if (
    (testimonial.baselineCounterfactualCredenceDecimal ?? 0) >= 0.98 &&
    testimonial.baselineKnowledgeLevel === "none"
  ) {
    riskReviewFlags.push("unsupported_extreme_baseline_credence_review");
  }
  if ((testimonial.completionCredenceDecimal ?? 0) >= 0.98 && testimonial.completionKnowledgeLevel === "none") {
    riskReviewFlags.push("unsupported_extreme_completion_credence_review");
  }

  const concern = testimonial.concernFlag !== "none";
  const contradicted = input.context.directEvidenceContradiction || input.context.otherEvidenceConsistency === "contradicted";
  const reviewStatus: TestimonialReviewStatus =
    concern || riskReviewFlags.length
      ? "needs_more_info"
      : contradicted
        ? "rejected"
        : "accepted";

  return {
    acceptedForAdditionality: !contradicted && !concern && baselineProbativeValue >= 0.08,
    acceptedForCompletionVerification: !contradicted && !concern && completionProbativeValue >= 0.08,
    acceptedForCredibilityUpdate:
      Boolean(input.context.concernLaterSupported) || (!contradicted && consistency >= 0.5),
    baselineProbativeValueScoreDecimal: round(baselineProbativeValue),
    collusionRiskScoreDecimal: round(collusionRisk),
    completionProbativeValueScoreDecimal: round(completionProbativeValue),
    consistencyScoreDecimal: round(consistency),
    createdAt: now,
    friendCredibilityWeightDecimal: round(friendCredibility),
    friendTestimonialId: testimonial.id,
    friendUserId: testimonial.friendUserId,
    id: idFromParts("testimonial-quality-assessment", testimonial.id, now),
    independenceScoreDecimal: round(independence),
    knowledgeBasisScoreDecimal: round(knowledgeBasisScore),
    participantUserId: testimonial.participantUserId,
    participantVisibleSummary:
      concern
        ? "A private testimonial concern is under review."
        : "Reviewed as a private third-party evidence input.",
    privacySensitivityScoreDecimal: hasText(testimonial.concernNotesPrivate) ? 0.85 : 0.45,
    privateNotesRef:
      concern || riskReviewFlags.length
        ? idFromParts("testimonial-quality-private-notes", testimonial.id)
        : null,
    relationshipWeightDecimal: round(relationship),
    reviewStatus,
    reviewerId: input.reviewerId ?? null,
    riskReviewFlags,
    sourceId: testimonial.id,
    sourceType: "friend_testimonial",
    specificityScoreDecimal: round(specificity),
    updatedAt: now,
  };
}

export function applyFriendTestimonialToParticipantCredibility(input: {
  participantProfile: ParticipantCredibilityProfile;
  friendTestimonialCredibilityDecimal: number;
  testimonial: FriendTestimonial;
  assessment: TestimonialQualityAssessment;
  policy?: CredibilityScoringPolicy;
  context: TestimonialEvaluationContext;
  now?: string;
}): ParticipantCredibilityImpact {
  const policy = input.policy ?? MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY;
  const now = input.now ?? new Date().toISOString();
  const blockers: string[] = [];

  if (policy.status !== "active" || !policy.policyHash.startsWith("sha256:")) {
    blockers.push("frozen_active_credibility_policy_required");
  }

  if (blockers.length) {
    return {
      blockers,
      canTestimonialAloneVerify: false,
      evidenceQualityDeltaDecimal: 0,
      finalAdditionalityProbabilityDeltaDecimal: 0,
      fixedPostActionConsiderationAdjustmentMinor: 0,
      friendTestimonialCredibilityEvent: null,
      participantCredibilityDeltaDecimal: 0,
      participantCredibilityEvent: null,
      policyEvaluationTrace: null,
      status: "blocked",
      verificationConfidenceDeltaDecimal: 0,
    };
  }

  const assessmentStrength = clampDecimal(
    (input.assessment.relationshipWeightDecimal +
      input.assessment.friendCredibilityWeightDecimal +
      input.assessment.specificityScoreDecimal +
      input.assessment.knowledgeBasisScoreDecimal +
      input.assessment.consistencyScoreDecimal +
      input.assessment.independenceScoreDecimal) /
      6 -
      input.assessment.collusionRiskScoreDecimal * 0.45,
  );
  const contradicted =
    input.context.directEvidenceContradiction || input.context.otherEvidenceConsistency === "contradicted";
  const concernSupported = Boolean(input.context.concernLaterSupported);

  const evidenceQualityDelta = contradicted
    ? -policy.maxSingleTestimonialEvidenceQualityDeltaDecimal
    : input.assessment.acceptedForCompletionVerification || input.assessment.acceptedForAdditionality
      ? policy.maxSingleTestimonialEvidenceQualityDeltaDecimal * assessmentStrength
      : policy.maxSingleTestimonialEvidenceQualityDeltaDecimal * 0.08;
  const additionalityDelta =
    input.assessment.acceptedForAdditionality && input.testimonial.baselineCounterfactualCredenceDecimal != null
      ? policy.maxSingleTestimonialAdditionalityDeltaDecimal *
        input.assessment.baselineProbativeValueScoreDecimal *
        input.testimonial.baselineCounterfactualCredenceDecimal
      : 0;
  const verificationDelta =
    input.assessment.acceptedForCompletionVerification && input.testimonial.completionCredenceDecimal != null
      ? policy.maxSingleTestimonialVerificationConfidenceDeltaDecimal *
        input.assessment.completionProbativeValueScoreDecimal *
        input.testimonial.completionCredenceDecimal
      : contradicted
        ? -policy.maxSingleTestimonialVerificationConfidenceDeltaDecimal
        : 0;
  const participantCredibilityDelta = concernSupported
    ? -policy.maxSingleTestimonialCredibilityDeltaDecimal
    : contradicted
      ? -policy.maxSingleTestimonialCredibilityDeltaDecimal
      : input.assessment.acceptedForCredibilityUpdate
        ? policy.maxSingleTestimonialCredibilityDeltaDecimal * assessmentStrength
        : 0;
  const friendCredibilityDelta = concernSupported
    ? 0.025
    : contradicted
      ? -0.04
      : input.assessment.reviewStatus === "accepted"
        ? 0.01
        : 0;
  const newParticipantCredibility = clampDecimal(
    input.participantProfile.credibilityScoreDecimal + participantCredibilityDelta,
  );
  const canTestimonialAloneVerify =
    !input.context.highStakesPledgeSwap &&
    policy.lowRiskStandaloneTestimonialVerificationAllowed &&
    input.assessment.acceptedForCompletionVerification &&
    input.assessment.completionProbativeValueScoreDecimal >= 0.45 &&
    input.assessment.friendCredibilityWeightDecimal >= 0.7;

  const participantEvent: CredibilityEvent = {
    appealStatus: "appeal_available",
    correctionOfEventId: null,
    createdAt: now,
    credibilityDeltaDecimal: round(participantCredibilityDelta),
    eventType: concernSupported
      ? "friend_concern_report_supported"
      : contradicted
        ? "friend_testimonial_contradicted"
        : "friend_testimonial_consistent",
    evidenceQualityScoreDecimal: round(
      clampDecimal(input.participantProfile.evidenceReliabilityDecimal + evidenceQualityDelta),
    ),
    finalAdditionalityProbabilityDecimal: round(
      clampDecimal(input.participantProfile.expectedCompletionProbabilityDecimal + additionalityDelta),
    ),
    id: idFromParts("credibility-event", input.participantProfile.participantUserId, input.testimonial.id, now),
    newCredibilityScoreDecimal: round(newParticipantCredibility),
    participantUserId: input.participantProfile.participantUserId,
    participantVisibleReason:
      participantCredibilityDelta >= 0
        ? "A private, reviewed evidence input was consistent with other completion evidence."
        : "A reviewed evidence input or later contradiction affected the credibility update.",
    policySnapshotHash: policy.policyHash,
    priorCredibilityScoreDecimal: input.participantProfile.credibilityScoreDecimal,
    privateReviewerNotesRef:
      participantCredibilityDelta < 0
        ? idFromParts("participant-credibility-private-notes", input.testimonial.id)
        : null,
    sourceId: input.testimonial.id,
    sourceType: "friend_testimonial",
    verificationConfidenceDecimal: round(
      clampDecimal(input.participantProfile.evidenceReliabilityDecimal + verificationDelta),
    ),
  };
  const friendEvent: TestimonialCredibilityEvent = {
    appealStatus: friendCredibilityDelta < 0 ? "appeal_available" : "none",
    createdAt: now,
    deltaDecimal: round(friendCredibilityDelta),
    eventType: concernSupported
      ? "concern_report_supported"
      : contradicted
        ? "contradicted_testimony"
        : "accurate_supportive_testimony",
    friendUserId: input.testimonial.friendUserId,
    friendVisibleReason:
      friendCredibilityDelta >= 0
        ? "Your testimonial was consistent with reviewed evidence."
        : "Later reviewed evidence contradicted your testimonial.",
    id: idFromParts("testimonial-credibility-event", input.testimonial.friendUserId, input.testimonial.id, now),
    newTestimonialCredibilityDecimal: round(
      clampDecimal(input.friendTestimonialCredibilityDecimal + friendCredibilityDelta),
    ),
    participantVisibleReason: null,
    policySnapshotHash: policy.policyHash,
    priorTestimonialCredibilityDecimal: input.friendTestimonialCredibilityDecimal,
    privateReviewerNotesRef:
      friendCredibilityDelta < 0
        ? idFromParts("friend-credibility-private-notes", input.testimonial.id)
        : null,
    relatedParticipantUserId: input.testimonial.participantUserId,
    sourceFriendTestimonialId: input.testimonial.id,
  };
  const materialEffects: PolicyEvaluationTrace["materialEffects"] = [];

  if (evidenceQualityDelta !== 0) materialEffects.push("evidence_quality");
  if (additionalityDelta !== 0) materialEffects.push("additionality");
  if (verificationDelta !== 0) materialEffects.push("verification_confidence");
  if (participantCredibilityDelta !== 0) materialEffects.push("participant_credibility");

  return {
    blockers,
    canTestimonialAloneVerify,
    evidenceQualityDeltaDecimal: round(
      Math.max(
        -policy.maxSingleTestimonialEvidenceQualityDeltaDecimal,
        Math.min(policy.maxSingleTestimonialEvidenceQualityDeltaDecimal, evidenceQualityDelta),
      ),
    ),
    finalAdditionalityProbabilityDeltaDecimal: round(
      Math.max(
        -policy.maxSingleTestimonialAdditionalityDeltaDecimal,
        Math.min(policy.maxSingleTestimonialAdditionalityDeltaDecimal, additionalityDelta),
      ),
    ),
    fixedPostActionConsiderationAdjustmentMinor: 0,
    friendTestimonialCredibilityEvent: friendEvent,
    participantCredibilityDeltaDecimal: round(
      Math.max(
        -policy.maxSingleTestimonialCredibilityDeltaDecimal,
        Math.min(policy.maxSingleTestimonialCredibilityDeltaDecimal, participantCredibilityDelta),
      ),
    ),
    participantCredibilityEvent: participantEvent,
    policyEvaluationTrace: {
      createdAt: now,
      effectSummary:
        "Friend testimonial effects were applied only through the frozen capped credibility policy.",
      id: idFromParts("policy-evaluation-trace", input.testimonial.id, policy.policyHash, now),
      materialEffects,
      policyHash: policy.policyHash,
      subjectId: input.testimonial.id,
      subjectType: "friend_testimonial",
    },
    status: "pass",
    verificationConfidenceDeltaDecimal: round(
      Math.max(
        -policy.maxSingleTestimonialVerificationConfidenceDeltaDecimal,
        Math.min(policy.maxSingleTestimonialVerificationConfidenceDeltaDecimal, verificationDelta),
      ),
    ),
  };
}

export function createCredibilityAppealCorrectionEvent(input: {
  participantProfile: ParticipantCredibilityProfile;
  sourceEventId: string;
  correctionDeltaDecimal: number;
  policyHash?: string;
  now?: string;
}): CredibilityEvent {
  const now = input.now ?? new Date().toISOString();

  return {
    appealStatus: "appeal_resolved",
    correctionOfEventId: input.sourceEventId,
    createdAt: now,
    credibilityDeltaDecimal: round(input.correctionDeltaDecimal),
    eventType: "pledge_swap_appeal_correction",
    evidenceQualityScoreDecimal: input.participantProfile.evidenceReliabilityDecimal,
    finalAdditionalityProbabilityDecimal: input.participantProfile.expectedCompletionProbabilityDecimal,
    id: idFromParts("credibility-appeal-correction", input.participantProfile.participantUserId, input.sourceEventId, now),
    newCredibilityScoreDecimal: round(
      clampDecimal(input.participantProfile.credibilityScoreDecimal + input.correctionDeltaDecimal),
    ),
    participantUserId: input.participantProfile.participantUserId,
    participantVisibleReason: "A correction or appeal event adjusted a previous credibility event.",
    policySnapshotHash: input.policyHash ?? MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY.policyHash,
    priorCredibilityScoreDecimal: input.participantProfile.credibilityScoreDecimal,
    privateReviewerNotesRef: null,
    sourceId: input.sourceEventId,
    sourceType: "appeal",
    verificationConfidenceDecimal: input.participantProfile.evidenceReliabilityDecimal,
  };
}

export function buildParticipantVisibleTestimonialSummary(testimonial: FriendTestimonial) {
  return {
    concernNotesPrivateVisible: false,
    friendIdentityVisible: false,
    participantVisibleSummary: testimonial.participantVisibleSummary,
    privateReviewerNotesVisible: false,
    rawTestimonyVisible: false,
    status: testimonial.testimonialStatus,
  };
}

export function buildFunderEvidenceSummary(testimonials: FriendTestimonial[]) {
  const reviewedCount = testimonials.filter((testimonial) =>
    ["accepted", "partially_accepted", "under_review", "submitted"].includes(
      testimonial.testimonialStatus,
    ),
  ).length;

  if (reviewedCount <= 0) {
    return "Evidence did not include reviewed third-party testimony.";
  }

  return reviewedCount === 1
    ? "Evidence included one reviewed third-party testimonial."
    : "Evidence included multiple reviewed evidence types.";
}

export function buildPublicTestimonialReportSummary(testimonialCount: number) {
  return testimonialCount > 0
    ? "Some completions used reviewed third-party testimony. No participant or friend identities are public."
    : "No public report includes participant or friend identities from private testimonials.";
}

export function getMoralTradeParticipantCredibilitySeedDemo(): ParticipantCredibilitySeedDemo {
  return {
    participants: [
      {
        friendId: "friend-a",
        participantId: "participant-a",
        result:
          "Friend A has high ordinary-diet knowledge, reports 80% baseline/additionality credence and 85% completion credence based on shared meals and messages; reviewer accepts moderate additionality and completion support.",
        summary:
          "Participant A completes a 2-day no-meat pledge, submits platform check-ins and final declaration, and receives a larger credibility gain than text declaration alone.",
      },
      {
        friendId: "friend-b",
        participantId: "participant-b",
        result:
          "Unsupported 99% credence with no knowledge basis receives little weight and can trigger unsupported extreme-credence review.",
        summary: "Participant B invites a friend whose testimony has almost no probative value.",
      },
      {
        friendId: "friend-c",
        participantId: "participant-c",
        result:
          "A pressure-to-lie report routes to risk review and the raw concern is not shown to the participant.",
        summary: "Participant C's friend reports pressure to lie.",
      },
      {
        friendId: "friend-d",
        participantId: "participant-d",
        result:
          "A supportive friend testimonial is later contradicted by direct evidence; Participant D's credibility decreases and Friend D's testimonial credibility decreases through append-only events.",
        summary: "Participant D's supportive friend testimonial is later contradicted by direct evidence.",
      },
    ],
    publicReportSummary: buildPublicTestimonialReportSummary(4),
    slug: "two-day-no-meat-credibility-demo",
  };
}

export function getMoralTradeParticipantCredibilityContract(): ParticipantCredibilityContract {
  return {
    antiGamingControls: [
      "reciprocal_testimonial_rings",
      "repeated_small_group_testimonials",
      "related_party_clusters",
      "same_household_or_payment_instrument",
      "duplicate_accounts",
      "off_platform_stake_reimbursement",
      "templated_testimonial_text",
      "unsupported_extreme_credence_claims",
      "testimonial_farms",
    ],
    contractTests: [...CONTRACT_TESTS],
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    friendCredibilityWeightInputs: [...FRIEND_CREDIBILITY_WEIGHT_INPUTS],
    friendInviteRules: {
      defaultMaxInvites: 3,
      defaultMinInvites: 1,
      inviteMustHideFields: [
        "funder identities",
        "payout details",
        "private baseline answers",
        "other evidence",
        "risk flags",
        "reviewer notes",
        "exact scoring rules",
      ],
      minimumNecessaryDisclosureFields: [
        "action type",
        "action window",
        "participant-provided context",
        "testimonial request",
      ],
      privateRevocableExpiringRateLimited: true,
    },
    funderDisclosureRules: [
      "Do not show raw friend testimony to funders.",
      "Do not show friend identity, relationship details, private testimony, or exact weighting to funders.",
      "At most show coarse aggregate language when policy permits.",
    ],
    modelNames: [...MODEL_NAMES],
    ordinaryUiBannedTerms: [...ORDINARY_UI_BANNED_TERMS],
    ordinaryUiPreferredTerm: "Participant credibility",
    privacyBoundary:
      "Friend testimonials are private evidence by default. Raw testimony, private concern notes, friend identity, anti-fraud notes, and friend safety reports are not public and are not shown to funders.",
    publicReportingRules: [
      "Public reports may say some completions used reviewed third-party testimony.",
      "Public reports must not expose testimonial text, friend identity, relationship, or individual credibility effects.",
    ],
    purpose:
      "Estimate how credible a participant's future pledge-swap commitments and verification claims are, without creating public social proof, shame, or a public reputation market.",
    renamedFields: [...RENAMED_FIELDS],
    reviewerGovernanceRules: [
      "Low-stakes consistent testimonials can be accepted under a frozen low-risk policy.",
      "High-stakes, conflicted, contradictory, anomalous, or concern-bearing testimonials require reviewer review.",
      "Sample accepted testimonials for ReviewQualityAudit.",
      "Conflicted reviewers cannot decide cases involving friends, family, roommates, romantic partners, or their own account.",
      "Material adverse decisions require non-sensitive participant-visible reasons and appeal or correction paths.",
      "Create a PolicyEvaluationTrace when testimonial evidence materially affects verification, additionality, or credibility.",
    ],
    scoringPolicy: MORAL_TRADE_DEFAULT_CREDIBILITY_SCORING_POLICY,
    seedDemo: getMoralTradeParticipantCredibilitySeedDemo(),
    testimonialQuestions: [...TESTIMONIAL_QUESTIONS],
    testimonialStakePolicy: MORAL_TRADE_DEFAULT_TESTIMONIAL_STAKE_POLICY,
    version: MORAL_TRADE_PARTICIPANT_CREDIBILITY_CONTRACT_VERSION,
  };
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateMoralTradeParticipantCredibilityContract(
  contract: ParticipantCredibilityContract = getMoralTradeParticipantCredibilityContract(),
): ParticipantCredibilityValidation {
  const modelNames = contract.modelNames;
  const tableNames = contract.firstClassRecordTables;
  const bannedText = contract.ordinaryUiBannedTerms.join(" | ");
  const checks = [
    check(
      "credibility_terminology",
      "Public contract uses participant credibility model names.",
      hasAll(modelNames, [
        "ParticipantCredibilityProfile",
        "CredibilityEvent",
        "CredibilityScoringPolicy",
        "CredibilityAppeal",
      ]) &&
        !modelNames.some((name) => /CreditEvent|CreditScoringPolicy|CreditAppeal|ReliabilityProfile/.test(name)) &&
        contract.ordinaryUiPreferredTerm === "Participant credibility",
      modelNames.join(","),
    ),
    check(
      "persistent_tables",
      "Persistent table list covers profiles, events, testimonials, assessments, stakes, and appeals.",
      hasAll(tableNames, [
        "moral_trade_participant_credibility_profiles",
        "moral_trade_credibility_events",
        "moral_trade_credibility_scoring_policies",
        "moral_trade_credibility_appeals",
        "moral_trade_friend_testimonial_invites",
        "moral_trade_friend_testimonials",
        "moral_trade_testimonial_quality_assessments",
        "moral_trade_testimonial_credibility_events",
        "moral_trade_testimonial_stake_policies",
        "moral_trade_testimonial_stakes",
      ]),
      `${tableNames.length} tables`,
    ),
    check(
      "ordinary_ui_banned_terms",
      "Contract lints ordinary UI away from social-credit and reputation-score language.",
      /social credit/.test(bannedText) &&
        /credit score/.test(bannedText) &&
        /reputation score/.test(bannedText) &&
        lintOrdinaryCredibilityCopy("Participant credibility helps reviewers estimate future completion.").status === "pass",
      bannedText,
    ),
    check(
      "friend_testimonial_private_optional",
      "Friend testimonials are optional, private, revocable, expiring, and minimum-necessary.",
      contract.friendInviteRules.defaultMinInvites === 1 &&
        contract.friendInviteRules.defaultMaxInvites === 3 &&
        contract.friendInviteRules.privateRevocableExpiringRateLimited &&
        /private evidence by default/i.test(contract.privacyBoundary) &&
        contract.funderDisclosureRules.every((rule) => /not|coarse|do not/i.test(rule)),
      contract.privacyBoundary,
    ),
    check(
      "separate_credences",
      "Testimonial form separately captures baseline/additionality and completion credences.",
      contract.testimonialQuestions.some((question) => /would have eaten meat\/fish/i.test(question)) &&
        contract.testimonialQuestions.some((question) => /did not eat meat\/fish/i.test(question)),
      contract.testimonialQuestions.join(" | "),
    ),
    check(
      "frozen_capped_policy",
      "Scoring policy caps testimonial influence and blocks high-stakes standalone verification.",
      contract.scoringPolicy.status === "active" &&
        contract.scoringPolicy.policyHash.startsWith("sha256:") &&
        contract.scoringPolicy.maxSingleTestimonialCredibilityDeltaDecimal <= 0.06 &&
        contract.scoringPolicy.highStakesStandaloneTestimonialVerificationAllowed === false,
      contract.scoringPolicy.policyHash,
    ),
    check(
      "stake_policy",
      "Default stake policy has no mandatory donation and no 10 percent or 10 dollar default.",
      contract.testimonialStakePolicy.defaultStakeRequired === false &&
        contract.testimonialStakePolicy.optionalStakeEnabled === false &&
        contract.testimonialStakePolicy.destinationPolicy === "no_stake",
      contract.testimonialStakePolicy.policyVersion,
    ),
    check(
      "anti_gaming_and_review",
      "Contract covers testimonial rings, related parties, review governance, and trace creation.",
      contract.antiGamingControls.includes("reciprocal_testimonial_rings") &&
        contract.antiGamingControls.includes("related_party_clusters") &&
        contract.reviewerGovernanceRules.some((rule) => /PolicyEvaluationTrace/i.test(rule)),
      contract.antiGamingControls.join(","),
    ),
    check(
      "seed_demo",
      "Seed demo covers A through D two-day no-meat scenarios.",
      contract.seedDemo.slug === "two-day-no-meat-credibility-demo" &&
        contract.seedDemo.participants.length === 4 &&
        contract.seedDemo.participants.some((participant) => /80%/.test(participant.result)) &&
        contract.seedDemo.participants.some((participant) => /99%/.test(participant.result)) &&
        contract.seedDemo.participants.some((participant) => /pressure/i.test(participant.result)) &&
        contract.seedDemo.participants.some((participant) => /contradicted/i.test(participant.result)),
      contract.seedDemo.participants.map((participant) => participant.participantId).join(","),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-participant-credibility-contract",
    validatorVersion: MORAL_TRADE_PARTICIPANT_CREDIBILITY_VALIDATOR_VERSION,
  };
}
