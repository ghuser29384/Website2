import { createHash } from "node:crypto";

export const PROJECT_RECOMMENDATION_FEATURE_KEY =
  "moral_public_goods_project_recommendations_non_mvp_v0_1" as const;
export const PROJECT_RECOMMENDATION_PUBLIC_LABEL = "Recommendations and concerns" as const;
export const PROJECT_RECOMMENDATION_PRIMARY_ACTION_LABEL = "Recommend funding" as const;
export const PROJECT_RECOMMENDATION_SECONDARY_ACTION_LABEL = "Record a concern" as const;
export const PROJECT_RECOMMENDATION_INTERNAL_LABEL =
  "Source-Backed Project Recommendations Non-MVP" as const;
export const PROJECT_RECOMMENDATION_DEPLOYMENT_STAGE = "labs_research_non_mvp" as const;
export const PROJECT_RECOMMENDATION_FEATURE_CLASSIFICATION = "non_mvp" as const;
export const PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER =
  "Recommendations are source-backed trust signals. They are not votes, rankings, review approval, clearing inputs, or impact estimates." as const;

export const PROJECT_RECOMMENDATION_FEATURE_METADATA = {
  featureKey: PROJECT_RECOMMENDATION_FEATURE_KEY,
  publicLabel: PROJECT_RECOMMENDATION_PUBLIC_LABEL,
  primaryActionLabel: PROJECT_RECOMMENDATION_PRIMARY_ACTION_LABEL,
  secondaryActionLabel: PROJECT_RECOMMENDATION_SECONDARY_ACTION_LABEL,
  internalLabel: PROJECT_RECOMMENDATION_INTERNAL_LABEL,
  featureClassification: PROJECT_RECOMMENDATION_FEATURE_CLASSIFICATION,
  deploymentStage: PROJECT_RECOMMENDATION_DEPLOYMENT_STAGE,
  defaultEnabled: false,
  productionPublicEnabled: false,
  mvpSurfaceEnabled: false,
  cgppMvpPledgePathEnabled: false,
  requiresAdminOrLabsAccess: true,
  requiresExplicitPromotionRecord: true,
  moneyMovement: "none",
  clearingInput: false,
  thresholdInput: false,
  differentViewInput: false,
  bonusEligibilityInput: false,
  platformMatchResolutionInput: false,
  rankingInput: false,
  publicReputationInput: false,
} as const;

export const PROJECT_RECOMMENDATION_COPY_POLICY = {
  use: [
    "Recommend funding",
    "Recommendations and concerns",
    "Source",
    "Conflict disclosed",
    "none disclosed",
    "Under review",
    "Aggregate only",
    "Reviewed public-good project",
  ],
  avoid: [
    "Endorse",
    "Like",
    "Upvote",
    "Ranking",
    "Score",
    "Moral score",
    "Reputation",
    "Influencer",
    "Top project",
    "Objectively best",
    "Guaranteed impact",
    "Tax-deductible because recommended",
    "Clearing support",
    "Counts toward threshold",
  ],
} as const;

export const PROJECT_RECOMMENDATION_PRIVACY_THRESHOLD = 2;

export type ProjectRecommendationTargetType = "project" | "pool" | "recipient";
export type ProjectRecommendationActorRole =
  | "public"
  | "labs_participant"
  | "reviewer"
  | "admin"
  | "service";
export type ProjectRecommendationEnvironment = "production" | "preview" | "development" | "test";
export type ProjectRecommendationAction =
  | "view_summary"
  | "view_detail_drawer"
  | "create_recommendation"
  | "create_concern"
  | "edit_own_unapproved_entry"
  | "withdraw_own_entry"
  | "moderate_entry"
  | "approve_public_display"
  | "redact_entry"
  | "reject_entry"
  | "view_private_evidence"
  | "export_admin_report"
  | "seed_demo_data";
export type ProjectRecommendationCapabilityReason =
  | "feature_non_mvp"
  | "feature_disabled"
  | "public_surface_disabled"
  | "insufficient_role"
  | "moderation_required"
  | "source_type_required"
  | "conflict_disclosure_required"
  | "target_not_reviewed"
  | "target_blocked"
  | "evidence_required"
  | "reputation_or_ranking_disallowed";

export type ProjectRecommendationRecommenderRole =
  | "donor"
  | "reviewer"
  | "domain_expert"
  | "grantee"
  | "participant"
  | "community_member"
  | "platform_admin"
  | "external_expert";
export type ProjectRecommendationStance =
  | "recommend_funding"
  | "support_with_caveats"
  | "donated"
  | "reviewed_positive"
  | "concern"
  | "recuse_or_conflict";
export type ProjectRecommendationSourceType =
  | "public_comment"
  | "verified_donation"
  | "grant_review"
  | "direct_experience"
  | "expert_assessment"
  | "internal_review_summary"
  | "linked_public_source"
  | "private_evidence_reviewed";
export type ProjectRecommendationConflictState =
  | "none_disclosed"
  | "disclosed_nonblocking"
  | "disclosed_blocking"
  | "undisclosed_review"
  | "blocked";
export type ProjectRecommendationVisibility = "public" | "aggregate_only" | "reviewer_only";
export type ProjectRecommendationVerificationState =
  | "unverified"
  | "source_verified"
  | "identity_verified"
  | "reviewed";
export type ProjectRecommendationModerationState =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "redacted"
  | "withdrawn";
export type ProjectRecommendationTrustTier =
  | "untrusted"
  | "ordinary"
  | "trusted"
  | "reviewer"
  | "admin";
export type ProjectRecommendationModerationAction =
  | "submit"
  | "edit"
  | "approve"
  | "approve_aggregate_only"
  | "reject"
  | "redact"
  | "withdraw"
  | "request_evidence"
  | "mark_conflict_blocking"
  | "mark_conflict_nonblocking"
  | "mark_source_verified"
  | "escalate_to_project_review_challenge";
export type ProjectRecommendationUrgency =
  | "routine"
  | "material_before_funding"
  | "safety_legal_review_concern";
export type ProjectRecommendationAbuseFlag =
  | "sybil_reputation_farming"
  | "reciprocal_recommendation_ring"
  | "spam_public_source_links"
  | "harassment_disguised_as_concern"
  | "undisclosed_affiliation"
  | "grantee_self_recommendation_without_disclosure"
  | "repeated_low_quality_recommendations"
  | "brigading_around_contentious_projects";

export interface ProjectRecommendationCapabilityInput {
  action: ProjectRecommendationAction;
  actorRole: ProjectRecommendationActorRole;
  environment: ProjectRecommendationEnvironment;
  featureEnabled?: boolean;
  publicSurfaceEnabled?: boolean;
  explicitPromotionRecordApproved?: boolean;
  sourceType?: ProjectRecommendationSourceType | null;
  conflictDisclosure?: string | null;
  targetReviewed?: boolean;
  targetBlocked?: boolean;
  evidencePresent?: boolean;
  sourceUrlPresent?: boolean;
  requestedRankingOrReputationInput?: boolean;
}

export interface ProjectRecommendationCapabilityResult {
  allowed: boolean;
  reasons: ProjectRecommendationCapabilityReason[];
  featureKey: typeof PROJECT_RECOMMENDATION_FEATURE_KEY;
  featureClassification: typeof PROJECT_RECOMMENDATION_FEATURE_CLASSIFICATION;
  deploymentStage: typeof PROJECT_RECOMMENDATION_DEPLOYMENT_STAGE;
  createsMoneyMovement: false;
  affectsClearing: false;
  affectsPublicReputation: false;
}

export interface ProjectRecommendation {
  id: string;
  targetType: ProjectRecommendationTargetType;
  targetId: string;
  roundId: string | null;
  poolId: string | null;
  projectId: string | null;
  recommenderUserId: string;
  recommenderDisplayNameSnapshot: string;
  recommenderRole: ProjectRecommendationRecommenderRole;
  stance: ProjectRecommendationStance;
  sourceType: ProjectRecommendationSourceType;
  publicSummary: string;
  privateEvidenceRef: string | null;
  sourceUrl: string | null;
  sourceTitleSnapshot: string | null;
  sourceArchiveHash: string | null;
  sourceVerifiedAt: string | null;
  conflictDisclosure: string;
  conflictState: ProjectRecommendationConflictState;
  visibility: ProjectRecommendationVisibility;
  verificationState: ProjectRecommendationVerificationState;
  moderationState: ProjectRecommendationModerationState;
  trustTierAtSubmission: ProjectRecommendationTrustTier;
  urgency?: ProjectRecommendationUrgency;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
  moderatedBy: string | null;
  moderationReasonCodes: string[];
  publicDisplayHash: string;
  privateSnapshotHash: string;
}

export interface ProjectRecommendationInput {
  id?: string;
  targetType: ProjectRecommendationTargetType;
  targetId: string;
  roundId?: string | null;
  poolId?: string | null;
  projectId?: string | null;
  recommenderUserId: string;
  recommenderDisplayNameSnapshot: string;
  recommenderRole: ProjectRecommendationRecommenderRole;
  stance: ProjectRecommendationStance;
  sourceType: ProjectRecommendationSourceType;
  publicSummary: string;
  privateEvidenceRef?: string | null;
  sourceUrl?: string | null;
  sourceTitleSnapshot?: string | null;
  sourceArchiveHash?: string | null;
  sourceVerifiedAt?: string | null;
  conflictDisclosure: string;
  conflictState: ProjectRecommendationConflictState;
  visibility: ProjectRecommendationVisibility;
  verificationState: ProjectRecommendationVerificationState;
  moderationState: ProjectRecommendationModerationState;
  trustTierAtSubmission: ProjectRecommendationTrustTier;
  urgency?: ProjectRecommendationUrgency;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface RecommendationAggregate {
  id: string;
  targetType: ProjectRecommendationTargetType;
  targetId: string;
  approvedRecommendationCount: number;
  approvedSupportWithCaveatsCount: number;
  verifiedDonationSignalCount: number;
  reviewedPositiveCount: number;
  approvedConcernCount: number;
  unresolvedConcernCount: number;
  concernUnderReviewCount: number;
  trustedRecommenderCount: number;
  domainExpertCount: number;
  reviewerSummaryCount: number;
  publicSummaryText: string;
  privacySuppressed: boolean;
  aggregateHash: string;
  asOf: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationModerationEvent {
  id: string;
  recommendationId: string;
  actorId: string;
  action: ProjectRecommendationModerationAction;
  publicReason: string | null;
  privateReasonRef: string | null;
  previousState: ProjectRecommendationModerationState;
  nextState: ProjectRecommendationModerationState;
  eventHash: string;
  createdAt: string;
}

export interface ProjectRecommendationTargetReviewState {
  targetType: ProjectRecommendationTargetType;
  targetId: string;
  reviewed: boolean;
  blocked: boolean;
}

export interface PublicProjectRecommendation {
  id: string;
  kind: "recommendation" | "concern" | "aggregate";
  displayLabel: string;
  stanceLabel: string;
  publicSummary: string;
  sourceLabel: string;
  conflictLabel: string;
  visibility: Extract<ProjectRecommendationVisibility, "public" | "aggregate_only">;
  moderationState: Extract<ProjectRecommendationModerationState, "approved">;
  privateEvidenceRef?: never;
  recommenderUserId?: never;
}

export interface ProjectRecommendationPublicView {
  targetType: ProjectRecommendationTargetType;
  targetId: string;
  aggregate: RecommendationAggregate;
  entries: PublicProjectRecommendation[];
  concernNotice: string | null;
}

export interface ProjectRecommendationReport {
  featureKey: typeof PROJECT_RECOMMENDATION_FEATURE_KEY;
  featureClassification: typeof PROJECT_RECOMMENDATION_FEATURE_CLASSIFICATION;
  disclaimer: typeof PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER;
  aggregateRecommendationCount: number;
  aggregateConcernCount: number;
  unresolvedConcernCount: number;
  sourceTypeBreakdown: Partial<Record<ProjectRecommendationSourceType, number>>;
  conflictDisclosureBreakdown: Partial<Record<ProjectRecommendationConflictState, number>>;
  moderationLimitations: string[];
  privacySuppressed: boolean;
  reportHash: string;
}

export interface ProjectRecommendationModerationQueueRow {
  recommendationId: string;
  target: string;
  stance: ProjectRecommendationStance;
  sourceType: ProjectRecommendationSourceType;
  recommenderRole: ProjectRecommendationRecommenderRole;
  trustTier: ProjectRecommendationTrustTier;
  conflictState: ProjectRecommendationConflictState;
  moderationState: ProjectRecommendationModerationState;
  submittedDate: string;
  recommendedAction:
    | "approve_public"
    | "approve_aggregate_only"
    | "request_evidence"
    | "mark_conflict_blocking"
    | "reject"
    | "redact"
    | "escalate_to_project_review_challenge";
}

export interface ProjectRecommendationNonEffectMechanismInputs {
  netRecipientThresholdCents: number;
  verifiedSupporterCount: number;
  differentViewClusterCount: number;
  refundBonusEligible: boolean;
  atLeastTierEffectiveSupportCents: number;
  projectAllocationWeightsBps: Record<string, number>;
  paymentAuthorizationCents: number;
  captureCents: number;
  settlementCents: number;
  auditMoneyTotalCents: number;
  sponsorMatchCents: number;
  projectReviewState: "submitted" | "reviewed" | "blocked";
  platformMatchResolutionInputCents: number;
}

export const PROJECT_RECOMMENDATION_SEED_PROJECT_IDS = {
  pathogenSurveillanceDataCommons: "pathogen-surveillance-data-commons",
  openBiosecurityMethodsLab: "open-biosecurity-methods-lab",
  globalOutbreakCoordinationNetwork: "global-outbreak-coordination-network",
} as const;

const stanceLabels: Record<ProjectRecommendationStance, string> = {
  concern: "Concern",
  donated: "Donated",
  recommend_funding: "Recommended funding",
  reviewed_positive: "Recommended after review",
  support_with_caveats: "Support with caveats",
  recuse_or_conflict: "Recusal or conflict",
};

const sourceLabels: Record<ProjectRecommendationSourceType, string> = {
  direct_experience: "direct experience",
  expert_assessment: "expert assessment",
  grant_review: "grant review",
  internal_review_summary: "internal review summary",
  linked_public_source: "linked public source",
  private_evidence_reviewed: "private evidence reviewed",
  public_comment: "public comment",
  verified_donation: "verified donation",
};

const conflictLabels: Record<ProjectRecommendationConflictState, string> = {
  blocked: "conflict blocked",
  disclosed_blocking: "blocking conflict disclosed",
  disclosed_nonblocking: "conflict disclosed",
  none_disclosed: "none disclosed",
  undisclosed_review: "conflict under review",
};

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function uniqueReasons(reasons: ProjectRecommendationCapabilityReason[]) {
  return [...new Set(reasons)];
}

function isModerationAction(action: ProjectRecommendationAction) {
  return (
    action === "moderate_entry" ||
    action === "approve_public_display" ||
    action === "redact_entry" ||
    action === "reject_entry"
  );
}

function isCreateAction(action: ProjectRecommendationAction) {
  return action === "create_recommendation" || action === "create_concern";
}

function isPublicSurfaceAction(action: ProjectRecommendationAction) {
  return action === "view_summary" || action === "view_detail_drawer";
}

function isLabsOrAdminRole(role: ProjectRecommendationActorRole) {
  return role === "labs_participant" || role === "reviewer" || role === "admin" || role === "service";
}

function isReviewerRole(role: ProjectRecommendationActorRole) {
  return role === "reviewer" || role === "admin" || role === "service";
}

function isAdminRole(role: ProjectRecommendationActorRole) {
  return role === "admin" || role === "service";
}

export function evaluateProjectRecommendationCapability(
  input: ProjectRecommendationCapabilityInput,
): ProjectRecommendationCapabilityResult {
  const reasons: ProjectRecommendationCapabilityReason[] = ["feature_non_mvp"];

  if (!input.featureEnabled) {
    reasons.push("feature_disabled");
  }

  if (input.requestedRankingOrReputationInput) {
    reasons.push("reputation_or_ranking_disallowed");
  }

  if (input.targetReviewed === false) {
    reasons.push("target_not_reviewed");
  }

  if (input.targetBlocked) {
    reasons.push("target_blocked");
  }

  if (input.environment === "production") {
    const publicSurfaceAllowed =
      input.publicSurfaceEnabled === true && input.explicitPromotionRecordApproved === true;
    if ((isPublicSurfaceAction(input.action) || input.actorRole === "public") && !publicSurfaceAllowed) {
      reasons.push("public_surface_disabled");
    }
  }

  if (isPublicSurfaceAction(input.action) && !input.publicSurfaceEnabled && input.environment === "production") {
    reasons.push("public_surface_disabled");
  }

  if (isCreateAction(input.action)) {
    if (!isLabsOrAdminRole(input.actorRole)) {
      reasons.push("insufficient_role");
    }
    if (!input.sourceType) {
      reasons.push("source_type_required");
    }
    if (!input.conflictDisclosure?.trim()) {
      reasons.push("conflict_disclosure_required");
    }
    if (
      input.sourceType === "private_evidence_reviewed" ||
      (input.sourceType === "linked_public_source" && !input.sourceUrlPresent)
    ) {
      if (!input.evidencePresent && !input.sourceUrlPresent) {
        reasons.push("evidence_required");
      }
    }
    reasons.push("moderation_required");
  }

  if (input.action === "edit_own_unapproved_entry" || input.action === "withdraw_own_entry") {
    if (!isLabsOrAdminRole(input.actorRole)) {
      reasons.push("insufficient_role");
    }
  }

  if (isModerationAction(input.action)) {
    if (!isReviewerRole(input.actorRole)) {
      reasons.push("insufficient_role");
    }
  }

  if (input.action === "view_private_evidence") {
    if (!isReviewerRole(input.actorRole)) {
      reasons.push("insufficient_role");
    }
  }

  if (input.action === "export_admin_report" || input.action === "seed_demo_data") {
    if (!isAdminRole(input.actorRole)) {
      reasons.push("insufficient_role");
    }
  }

  const unique = uniqueReasons(reasons);
  const hardReasons = unique.filter((reason) => reason !== "feature_non_mvp" && reason !== "moderation_required");

  return {
    allowed: hardReasons.length === 0,
    reasons: unique,
    featureKey: PROJECT_RECOMMENDATION_FEATURE_KEY,
    featureClassification: PROJECT_RECOMMENDATION_FEATURE_CLASSIFICATION,
    deploymentStage: PROJECT_RECOMMENDATION_DEPLOYMENT_STAGE,
    createsMoneyMovement: false,
    affectsClearing: false,
    affectsPublicReputation: false,
  };
}

export function assertProjectRecommendationCapability(input: ProjectRecommendationCapabilityInput) {
  const result = evaluateProjectRecommendationCapability(input);
  if (!result.allowed) {
    throw new Error(`Project recommendation capability blocked: ${result.reasons.join(", ")}`);
  }
  return result;
}

export function findProjectRecommendationProhibitedCopy(
  copy: string,
  { allowRequiredDisclaimers = true }: { allowRequiredDisclaimers?: boolean } = {},
) {
  const lower = copy.toLowerCase();
  const prohibited: string[] = [];
  const checks: Array<[string, RegExp]> = [
    ["Like", /\blike\b/i],
    ["Upvote", /\bupvote\b/i],
    ["Moral score", /\bmoral score\b/i],
    ["Reputation power", /\breputation power\b|\bpublic reputation power\b/i],
    ["Influencer", /\binfluencer\b/i],
    ["Top project", /\btop project\b|\btop recommended\b/i],
    ["Objectively best", /\bobjectively best\b/i],
    ["Guaranteed impact", /\bguaranteed impact\b/i],
    ["Counts toward threshold", /\bcounts toward threshold\b|\bcount toward threshold\b/i],
    ["Clearing support", /\bclearing support\b/i],
  ];

  for (const [label, pattern] of checks) {
    if (pattern.test(copy)) prohibited.push(label);
  }

  const rankingAllowedByDisclaimer =
    allowRequiredDisclaimers &&
    (/not votes?, rankings?, review approval, clearing inputs?, or impact estimates/i.test(copy) ||
      /not a vote, ranking, review approval, or clearing input/i.test(copy));

  if (/\branking\b|\brankings\b/i.test(lower) && !rankingAllowedByDisclaimer) {
    prohibited.push("Ranking");
  }

  return prohibited;
}

export function validateProjectRecommendationSummary(summary: string) {
  const trimmed = summary.trim();
  const blockers: string[] = [];
  if (!trimmed) blockers.push("public_summary_required");
  if (trimmed.length > 600) blockers.push("public_summary_too_long");
  if (findProjectRecommendationProhibitedCopy(trimmed).length) blockers.push("copy_preflight_failed");
  if (/\b(payment method|pledge id|viewpoint tag|private evidence ref|passport|medical|school|political)\b/i.test(trimmed)) {
    blockers.push("private_or_sensitive_detail_detected");
  }
  return { passed: blockers.length === 0, blockers };
}

export function validateProjectRecommendationForPublicDisplay(
  recommendation: ProjectRecommendation,
  target: ProjectRecommendationTargetReviewState,
) {
  const blockers: string[] = [];
  if (!recommendation.sourceType) blockers.push("source_type_required");
  if (!recommendation.conflictDisclosure.trim()) blockers.push("conflict_disclosure_required");
  if (!recommendation.publicSummary.trim()) blockers.push("public_summary_required");
  if (recommendation.moderationState !== "approved") blockers.push("moderation_approval_required");
  if (!target.reviewed) blockers.push("target_not_reviewed");
  if (target.blocked) blockers.push("target_blocked");
  if (recommendation.visibility === "reviewer_only") blockers.push("reviewer_only_visibility");
  if (
    recommendation.conflictState === "blocked" ||
    recommendation.conflictState === "disclosed_blocking" ||
    recommendation.conflictState === "undisclosed_review"
  ) {
    blockers.push("conflict_not_public_displayable");
  }
  blockers.push(...validateProjectRecommendationSummary(recommendation.publicSummary).blockers);
  return { passed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function createProjectRecommendation({
  conflictDisclosure,
  conflictState,
  createdAt = "2026-07-09T12:00:00.000Z",
  expiresAt = null,
  id,
  moderationState,
  poolId = null,
  privateEvidenceRef = null,
  projectId = null,
  publicSummary,
  recommenderDisplayNameSnapshot,
  recommenderRole,
  recommenderUserId,
  roundId = null,
  sourceArchiveHash = null,
  sourceTitleSnapshot = null,
  sourceType,
  sourceUrl = null,
  sourceVerifiedAt = null,
  stance,
  targetId,
  targetType,
  trustTierAtSubmission,
  urgency,
  verificationState,
  visibility,
}: ProjectRecommendationInput) {
  const lowTrust = trustTierAtSubmission === "untrusted" || trustTierAtSubmission === "ordinary";
  const normalizedVisibility: ProjectRecommendationVisibility = lowTrust ? "aggregate_only" : visibility;
  const normalizedModerationState: ProjectRecommendationModerationState =
    moderationState === "draft" ? "draft" : moderationState === "approved" && !lowTrust ? "approved" : moderationState;
  const base = {
    conflictDisclosure: conflictDisclosure.trim(),
    conflictState,
    createdAt,
    expiresAt,
    id:
      id ??
      `mpgf-recommendation-${hashValue([
        targetType,
        targetId,
        recommenderUserId,
        stance,
        sourceType,
        publicSummary,
        createdAt,
      ]).slice(7, 19)}`,
    moderationState: lowTrust && moderationState !== "rejected" && moderationState !== "redacted"
      ? "pending"
      : normalizedModerationState,
    poolId,
    privateEvidenceRef,
    projectId,
    publicSummary: publicSummary.trim(),
    recommenderDisplayNameSnapshot: recommenderDisplayNameSnapshot.trim(),
    recommenderRole,
    recommenderUserId,
    roundId,
    sourceArchiveHash,
    sourceTitleSnapshot,
    sourceType,
    sourceUrl,
    sourceVerifiedAt,
    stance,
    targetId,
    targetType,
    trustTierAtSubmission,
    updatedAt: createdAt,
    urgency,
    verificationState,
    visibility: normalizedVisibility,
  } satisfies Omit<
    ProjectRecommendation,
    "moderatedAt" | "moderatedBy" | "moderationReasonCodes" | "publicDisplayHash" | "privateSnapshotHash"
  >;

  return {
    ...base,
    moderatedAt: null,
    moderatedBy: null,
    moderationReasonCodes: [],
    publicDisplayHash: hashValue([
      base.targetType,
      base.targetId,
      base.stance,
      base.sourceType,
      base.publicSummary,
      base.conflictState,
      base.visibility,
      base.moderationState,
    ]),
    privateSnapshotHash: hashValue(base),
  } satisfies ProjectRecommendation;
}

export function serializeProjectRecommendationForPublic(
  recommendation: ProjectRecommendation,
  target: ProjectRecommendationTargetReviewState,
  { privacyThresholdMet = true }: { privacyThresholdMet?: boolean } = {},
): PublicProjectRecommendation | null {
  const validation = validateProjectRecommendationForPublicDisplay(recommendation, target);
  if (!validation.passed || !privacyThresholdMet) return null;

  const kind = recommendation.stance === "concern" ? "concern" : "recommendation";
  const displayLabel =
    recommendation.visibility === "aggregate_only"
      ? recommendation.stance === "concern"
        ? "Concern recorded by a verified source"
        : "Recommended by verified users"
      : recommendation.recommenderRole === "reviewer"
        ? "Recommended after review"
        : `Recommended by ${recommendation.recommenderDisplayNameSnapshot}`;

  return {
    id: recommendation.id,
    kind,
    displayLabel,
    stanceLabel: stanceLabels[recommendation.stance],
    publicSummary: recommendation.publicSummary,
    sourceLabel: sourceLabels[recommendation.sourceType],
    conflictLabel: conflictLabels[recommendation.conflictState],
    visibility: recommendation.visibility === "public" ? "public" : "aggregate_only",
    moderationState: "approved",
  };
}

export function buildRecommendationAggregate({
  asOf = "2026-07-09T12:00:00.000Z",
  recommendations,
  target,
  privacyThreshold = PROJECT_RECOMMENDATION_PRIVACY_THRESHOLD,
}: {
  asOf?: string;
  recommendations: readonly ProjectRecommendation[];
  target: ProjectRecommendationTargetReviewState;
  privacyThreshold?: number;
}): RecommendationAggregate {
  const targetRows = recommendations.filter(
    (recommendation) =>
      recommendation.targetType === target.targetType && recommendation.targetId === target.targetId,
  );
  const approvedRows = targetRows.filter((recommendation) => recommendation.moderationState === "approved");
  const approvedDisplayableRows = approvedRows.filter(
    (recommendation) =>
      validateProjectRecommendationForPublicDisplay(recommendation, target).passed &&
      recommendation.visibility !== "reviewer_only",
  );
  const privacySuppressed = approvedDisplayableRows.length > 0 && approvedDisplayableRows.length < privacyThreshold;
  const approvedRecommendationCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.stance === "recommend_funding",
  ).length;
  const approvedSupportWithCaveatsCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.stance === "support_with_caveats",
  ).length;
  const verifiedDonationSignalCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.sourceType === "verified_donation",
  ).length;
  const reviewedPositiveCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.stance === "reviewed_positive",
  ).length;
  const approvedConcernCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.stance === "concern",
  ).length;
  const concernUnderReviewCount = targetRows.filter(
    (recommendation) => recommendation.stance === "concern" && recommendation.moderationState === "pending",
  ).length;
  const unresolvedConcernCount = approvedDisplayableRows.filter(
    (recommendation) =>
      recommendation.stance === "concern" &&
      (recommendation.urgency === "material_before_funding" ||
        recommendation.urgency === "safety_legal_review_concern"),
  ).length;
  const trustedRecommenderCount = approvedDisplayableRows.filter((recommendation) =>
    ["trusted", "reviewer", "admin"].includes(recommendation.trustTierAtSubmission),
  ).length;
  const domainExpertCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.recommenderRole === "domain_expert",
  ).length;
  const reviewerSummaryCount = approvedDisplayableRows.filter(
    (recommendation) => recommendation.sourceType === "internal_review_summary",
  ).length;
  const recommendationTotal =
    approvedRecommendationCount + approvedSupportWithCaveatsCount + verifiedDonationSignalCount + reviewedPositiveCount;
  const publicSummaryText = privacySuppressed
    ? "Recommendations hidden until the privacy threshold is met"
    : concernUnderReviewCount > 0
      ? `${recommendationTotal} recommendations · ${concernUnderReviewCount} concern under review`
      : `${recommendationTotal} recommendations · ${unresolvedConcernCount} unresolved concerns`;
  const aggregateWithoutHash = {
    approvedConcernCount,
    approvedRecommendationCount,
    approvedSupportWithCaveatsCount,
    asOf,
    concernUnderReviewCount,
    createdAt: asOf,
    domainExpertCount,
    id: `mpgf-recommendation-aggregate-${target.targetId}`,
    privacySuppressed,
    publicSummaryText,
    reviewedPositiveCount,
    reviewerSummaryCount,
    targetId: target.targetId,
    targetType: target.targetType,
    trustedRecommenderCount,
    unresolvedConcernCount,
    updatedAt: asOf,
    verifiedDonationSignalCount,
  };

  return {
    ...aggregateWithoutHash,
    aggregateHash: hashValue(aggregateWithoutHash),
  };
}

export function buildProjectRecommendationPublicView({
  asOf,
  recommendations,
  target,
}: {
  asOf?: string;
  recommendations: readonly ProjectRecommendation[];
  target: ProjectRecommendationTargetReviewState;
}): ProjectRecommendationPublicView {
  const aggregate = buildRecommendationAggregate({ asOf, recommendations, target });
  const targetRows = recommendations.filter(
    (recommendation) =>
      recommendation.targetType === target.targetType && recommendation.targetId === target.targetId,
  );
  const privacyThresholdMet = !aggregate.privacySuppressed;
  const entries = targetRows
    .map((recommendation) =>
      serializeProjectRecommendationForPublic(recommendation, target, { privacyThresholdMet }),
    )
    .filter((recommendation): recommendation is PublicProjectRecommendation => Boolean(recommendation));

  return {
    targetType: target.targetType,
    targetId: target.targetId,
    aggregate,
    entries,
    concernNotice:
      aggregate.concernUnderReviewCount > 0
        ? `${aggregate.concernUnderReviewCount} concern under review. Details will be shown only if approved for public display.`
        : null,
  };
}

export function buildProjectRecommendationPublicReport(
  recommendations: readonly ProjectRecommendation[],
): ProjectRecommendationReport {
  const approvedRows = recommendations.filter((recommendation) => recommendation.moderationState === "approved");
  const sourceTypeBreakdown: Partial<Record<ProjectRecommendationSourceType, number>> = {};
  const conflictDisclosureBreakdown: Partial<Record<ProjectRecommendationConflictState, number>> = {};
  let privacySuppressed = false;

  for (const recommendation of approvedRows) {
    sourceTypeBreakdown[recommendation.sourceType] = (sourceTypeBreakdown[recommendation.sourceType] ?? 0) + 1;
    conflictDisclosureBreakdown[recommendation.conflictState] =
      (conflictDisclosureBreakdown[recommendation.conflictState] ?? 0) + 1;
  }

  for (const count of Object.values(sourceTypeBreakdown)) {
    if (count > 0 && count < PROJECT_RECOMMENDATION_PRIVACY_THRESHOLD) privacySuppressed = true;
  }

  const reportWithoutHash = {
    aggregateConcernCount: approvedRows.filter((recommendation) => recommendation.stance === "concern").length,
    aggregateRecommendationCount: approvedRows.filter((recommendation) => recommendation.stance !== "concern").length,
    conflictDisclosureBreakdown,
    disclaimer: PROJECT_RECOMMENDATION_PUBLIC_REPORT_DISCLAIMER,
    featureClassification: PROJECT_RECOMMENDATION_FEATURE_CLASSIFICATION,
    featureKey: PROJECT_RECOMMENDATION_FEATURE_KEY,
    moderationLimitations: [
      "Private evidence, donor-level viewpoint tags, payment state, pledge state, and anti-abuse thresholds are not public.",
      "Small source-type cells are suppressed or coarsened.",
    ],
    privacySuppressed,
    sourceTypeBreakdown,
    unresolvedConcernCount: approvedRows.filter(
      (recommendation) =>
        recommendation.stance === "concern" &&
        (recommendation.urgency === "material_before_funding" ||
          recommendation.urgency === "safety_legal_review_concern"),
    ).length,
  };

  return {
    ...reportWithoutHash,
    reportHash: hashValue(reportWithoutHash),
  };
}

export function buildProjectRecommendationModerationQueue(
  recommendations: readonly ProjectRecommendation[],
): ProjectRecommendationModerationQueueRow[] {
  return recommendations
    .filter((recommendation) =>
      ["pending", "approved", "rejected", "redacted"].includes(recommendation.moderationState),
    )
    .map((recommendation) => {
      let recommendedAction: ProjectRecommendationModerationQueueRow["recommendedAction"] = "approve_public";
      if (recommendation.sourceType === "linked_public_source" && !recommendation.sourceVerifiedAt) {
        recommendedAction = "request_evidence";
      } else if (
        recommendation.conflictState === "disclosed_blocking" ||
        recommendation.conflictState === "undisclosed_review"
      ) {
        recommendedAction = "mark_conflict_blocking";
      } else if (
        recommendation.urgency === "material_before_funding" ||
        recommendation.urgency === "safety_legal_review_concern"
      ) {
        recommendedAction = "escalate_to_project_review_challenge";
      } else if (
        recommendation.trustTierAtSubmission === "untrusted" ||
        recommendation.visibility === "aggregate_only"
      ) {
        recommendedAction = "approve_aggregate_only";
      } else if (recommendation.moderationState === "rejected") {
        recommendedAction = "reject";
      } else if (recommendation.moderationState === "redacted") {
        recommendedAction = "redact";
      }

      return {
        recommendationId: recommendation.id,
        target: `${recommendation.targetType}:${recommendation.targetId}`,
        stance: recommendation.stance,
        sourceType: recommendation.sourceType,
        recommenderRole: recommendation.recommenderRole,
        trustTier: recommendation.trustTierAtSubmission,
        conflictState: recommendation.conflictState,
        moderationState: recommendation.moderationState,
        submittedDate: recommendation.createdAt,
        recommendedAction,
      };
    });
}

export function moderateProjectRecommendation({
  action,
  actorId,
  entry,
  now = "2026-07-09T12:00:00.000Z",
  publicReason = null,
  privateReasonRef = null,
}: {
  action: ProjectRecommendationModerationAction;
  actorId: string;
  entry: ProjectRecommendation;
  now?: string;
  publicReason?: string | null;
  privateReasonRef?: string | null;
}) {
  let nextState = entry.moderationState;
  let conflictState = entry.conflictState;
  let verificationState = entry.verificationState;
  let visibility = entry.visibility;

  if (action === "approve") nextState = "approved";
  if (action === "approve_aggregate_only") {
    nextState = "approved";
    visibility = "aggregate_only";
  }
  if (action === "reject") nextState = "rejected";
  if (action === "redact") nextState = "redacted";
  if (action === "withdraw") nextState = "withdrawn";
  if (action === "request_evidence") nextState = "pending";
  if (action === "mark_conflict_blocking") {
    conflictState = "disclosed_blocking";
    nextState = "pending";
  }
  if (action === "mark_conflict_nonblocking") {
    conflictState = "disclosed_nonblocking";
    nextState = "pending";
  }
  if (action === "mark_source_verified") {
    verificationState = "source_verified";
    nextState = "pending";
  }
  if (action === "escalate_to_project_review_challenge") nextState = "pending";

  const updated = {
    ...entry,
    conflictState,
    moderationState: nextState,
    moderatedAt: action === "submit" || action === "edit" ? entry.moderatedAt : now,
    moderatedBy: action === "submit" || action === "edit" ? entry.moderatedBy : actorId,
    moderationReasonCodes: [...entry.moderationReasonCodes, action],
    updatedAt: now,
    verificationState,
    visibility,
  } satisfies ProjectRecommendation;
  const eventWithoutHash = {
    action,
    actorId,
    createdAt: now,
    id: `mpgf-recommendation-event-${hashValue([entry.id, actorId, action, now]).slice(7, 19)}`,
    nextState,
    previousState: entry.moderationState,
    privateReasonRef,
    publicReason,
    recommendationId: entry.id,
  };

  return {
    entry: {
      ...updated,
      publicDisplayHash: hashValue([
        updated.targetType,
        updated.targetId,
        updated.stance,
        updated.sourceType,
        updated.publicSummary,
        updated.conflictState,
        updated.visibility,
        updated.moderationState,
      ]),
      privateSnapshotHash: hashValue(updated),
    },
    event: {
      ...eventWithoutHash,
      eventHash: hashValue(eventWithoutHash),
    } satisfies RecommendationModerationEvent,
  };
}

export function logProjectRecommendationPrivateEvidenceAccess({
  actorId,
  actorRole,
  entry,
  now = "2026-07-09T12:00:00.000Z",
}: {
  actorId: string;
  actorRole: ProjectRecommendationActorRole;
  entry: ProjectRecommendation;
  now?: string;
}) {
  assertProjectRecommendationCapability({
    action: "view_private_evidence",
    actorRole,
    environment: "development",
    featureEnabled: true,
    targetReviewed: true,
  });
  const eventWithoutHash = {
    actorId,
    createdAt: now,
    id: `mpgf-recommendation-private-evidence-${hashValue([entry.id, actorId, now]).slice(7, 19)}`,
    privateReasonRef: entry.privateEvidenceRef,
    publicReason: "Private evidence access logged for reviewer audit.",
    recommendationId: entry.id,
  };
  return {
    ...eventWithoutHash,
    eventHash: hashValue(eventWithoutHash),
  };
}

export function detectProjectRecommendationAbuseFlags(
  recommendations: readonly ProjectRecommendation[],
): ProjectRecommendationAbuseFlag[] {
  const flags = new Set<ProjectRecommendationAbuseFlag>();
  const byUser = new Map<string, ProjectRecommendation[]>();
  for (const recommendation of recommendations) {
    const current = byUser.get(recommendation.recommenderUserId) ?? [];
    current.push(recommendation);
    byUser.set(recommendation.recommenderUserId, current);

    const sourceUrlCount = (recommendation.publicSummary.match(/https?:\/\//g) ?? []).length;
    if (sourceUrlCount > 1 || /cheap traffic|seo backlink|promo code/i.test(recommendation.publicSummary)) {
      flags.add("spam_public_source_links");
    }
    if (recommendation.stance === "concern" && /\bharass|dox|threaten|pressure donor\b/i.test(recommendation.publicSummary)) {
      flags.add("harassment_disguised_as_concern");
    }
    if (
      recommendation.recommenderRole === "grantee" &&
      (recommendation.conflictState === "none_disclosed" || !recommendation.conflictDisclosure.trim())
    ) {
      flags.add("grantee_self_recommendation_without_disclosure");
      flags.add("undisclosed_affiliation");
    }
    if (/everyone from my group should recommend|brigade|flood the queue/i.test(recommendation.publicSummary)) {
      flags.add("brigading_around_contentious_projects");
    }
  }

  for (const entries of byUser.values()) {
    if (entries.length >= 4) flags.add("repeated_low_quality_recommendations");
    const targetIds = new Set(entries.map((entry) => entry.targetId));
    if (entries.length >= 3 && targetIds.size <= 1) flags.add("sybil_reputation_farming");
  }

  const pairKeys = new Set<string>();
  for (const recommendation of recommendations) {
    if (recommendation.publicSummary.toLowerCase().includes("recommended me back")) {
      pairKeys.add(recommendation.recommenderUserId);
    }
  }
  if (pairKeys.size >= 2) flags.add("reciprocal_recommendation_ring");

  return [...flags];
}

export function applyProjectRecommendationsAsMetadataOnly(
  inputs: ProjectRecommendationNonEffectMechanismInputs,
  _recommendations: readonly ProjectRecommendation[],
): ProjectRecommendationNonEffectMechanismInputs {
  return {
    ...inputs,
    projectAllocationWeightsBps: { ...inputs.projectAllocationWeightsBps },
  };
}

export function buildMoralPublicGoodsRecommendationDevSeedData({
  environment = "development",
}: {
  environment?: ProjectRecommendationEnvironment;
} = {}) {
  if (environment === "production") {
    return [] as ProjectRecommendation[];
  }

  const openLab = PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.openBiosecurityMethodsLab;
  const pathogen = PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.pathogenSurveillanceDataCommons;
  const coordination = PROJECT_RECOMMENDATION_SEED_PROJECT_IDS.globalOutbreakCoordinationNetwork;

  return [
    createProjectRecommendation({
      conflictDisclosure: "None disclosed.",
      conflictState: "none_disclosed",
      id: "rec-open-lab-domain-expert",
      moderationState: "approved",
      poolId: "global-biosecurity-coordination",
      projectId: openLab,
      publicSummary:
        "The methods work is unusually useful for biosecurity coordination because it turns ambiguous safety questions into shared protocols that independent groups can inspect and reuse.",
      recommenderDisplayNameSnapshot: "Dr. A. Raman",
      recommenderRole: "domain_expert",
      recommenderUserId: "user-domain-expert-1",
      sourceTitleSnapshot: "Expert assessment memo",
      sourceType: "expert_assessment",
      stance: "recommend_funding",
      targetId: openLab,
      targetType: "project",
      trustTierAtSubmission: "trusted",
      verificationState: "reviewed",
      visibility: "public",
    }),
    createProjectRecommendation({
      conflictDisclosure: "None disclosed.",
      conflictState: "none_disclosed",
      id: "rec-open-lab-reviewer-summary",
      moderationState: "approved",
      poolId: "global-biosecurity-coordination",
      projectId: openLab,
      publicSummary:
        "Recommended after review because the project has a concrete public-good route, bounded deliverables, and a safety review path that does not rely on private donor claims.",
      recommenderDisplayNameSnapshot: "Moral Trade reviewer",
      recommenderRole: "reviewer",
      recommenderUserId: "reviewer-1",
      sourceTitleSnapshot: "Internal review summary",
      sourceType: "internal_review_summary",
      stance: "reviewed_positive",
      targetId: openLab,
      targetType: "project",
      trustTierAtSubmission: "reviewer",
      verificationState: "reviewed",
      visibility: "public",
    }),
    createProjectRecommendation({
      conflictDisclosure: "None disclosed.",
      conflictState: "none_disclosed",
      id: "rec-open-lab-verified-donation",
      moderationState: "approved",
      poolId: "global-biosecurity-coordination",
      projectId: openLab,
      publicSummary:
        "A verified donor reported that prior support produced clear public documentation and reusable methods, so the signal is shown only as aggregate support.",
      recommenderDisplayNameSnapshot: "Verified user",
      recommenderRole: "donor",
      recommenderUserId: "verified-donor-1",
      sourceType: "verified_donation",
      stance: "donated",
      targetId: openLab,
      targetType: "project",
      trustTierAtSubmission: "trusted",
      verificationState: "source_verified",
      visibility: "aggregate_only",
    }),
    createProjectRecommendation({
      conflictDisclosure: "None disclosed.",
      conflictState: "none_disclosed",
      id: "concern-pathogen-under-review",
      moderationState: "pending",
      poolId: "global-biosecurity-coordination",
      projectId: pathogen,
      publicSummary:
        "A participant raised a material pre-funding concern about data access controls. The concern is pending source review and is not public text.",
      recommenderDisplayNameSnapshot: "Participant",
      recommenderRole: "participant",
      recommenderUserId: "participant-concern-1",
      sourceType: "direct_experience",
      stance: "concern",
      targetId: pathogen,
      targetType: "project",
      trustTierAtSubmission: "ordinary",
      urgency: "material_before_funding",
      verificationState: "unverified",
      visibility: "aggregate_only",
    }),
    createProjectRecommendation({
      conflictDisclosure: "None disclosed.",
      conflictState: "none_disclosed",
      id: "rejected-spam-recommendation",
      moderationState: "rejected",
      poolId: "global-biosecurity-coordination",
      projectId: coordination,
      publicSummary:
        "Rejected spam source link. This row is retained only for moderation tests and must not appear publicly.",
      recommenderDisplayNameSnapshot: "Spam account",
      recommenderRole: "community_member",
      recommenderUserId: "spam-account-1",
      sourceType: "linked_public_source",
      sourceUrl: "https://example.invalid/spam",
      stance: "recommend_funding",
      targetId: coordination,
      targetType: "project",
      trustTierAtSubmission: "untrusted",
      verificationState: "unverified",
      visibility: "aggregate_only",
    }),
    createProjectRecommendation({
      conflictDisclosure: "I am affiliated with a project grantee; display should remain aggregate or reviewer-only.",
      conflictState: "disclosed_nonblocking",
      id: "grantee-conflict-aggregate",
      moderationState: "approved",
      poolId: "global-biosecurity-coordination",
      projectId: coordination,
      publicSummary:
        "A grantee-affiliated source reports that the coordination network is operationally useful, but the conflict disclosure keeps this signal aggregate.",
      recommenderDisplayNameSnapshot: "Grantee source",
      recommenderRole: "grantee",
      recommenderUserId: "grantee-1",
      sourceType: "direct_experience",
      stance: "support_with_caveats",
      targetId: coordination,
      targetType: "project",
      trustTierAtSubmission: "trusted",
      verificationState: "identity_verified",
      visibility: "aggregate_only",
    }),
    createProjectRecommendation({
      conflictDisclosure: "None disclosed.",
      conflictState: "none_disclosed",
      id: "source-url-needs-verification",
      moderationState: "pending",
      poolId: "global-biosecurity-coordination",
      projectId: pathogen,
      publicSummary:
        "A public source claims the data commons reduced duplicated review work. The URL requires verification before this can be displayed.",
      recommenderDisplayNameSnapshot: "External source submitter",
      recommenderRole: "external_expert",
      recommenderUserId: "external-source-1",
      sourceTitleSnapshot: "Public methods note",
      sourceType: "linked_public_source",
      sourceUrl: "https://example.org/biosecurity-methods-note",
      stance: "recommend_funding",
      targetId: pathogen,
      targetType: "project",
      trustTierAtSubmission: "trusted",
      verificationState: "unverified",
      visibility: "public",
    }),
  ];
}
