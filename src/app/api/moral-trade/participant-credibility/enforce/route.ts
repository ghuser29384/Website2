import { createHash } from "node:crypto";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  applyFriendTestimonialToParticipantCredibility,
  assessFriendTestimonialQuality,
  createFriendTestimonialInvite,
  declineFriendTestimonialInvite,
  getMoralTradeParticipantCredibilityContract,
  submitFriendTestimonial,
  validateMoralTradeParticipantCredibilityContract,
  type FriendTestimonialFormInput,
  type FriendTestimonialInvite,
  type FriendTestimonialInviteInput,
  type FriendTestimonial,
  type KnowledgeLevel,
  type ParticipantCredibilityImpact,
  type ParticipantCredibilityProfile,
  type RelationshipType,
  type TestimonialConcernFlag,
  type TestimonialEvaluationContext,
  type TestimonialQualityAssessment,
} from "@/lib/moral-trade/participant-credibility";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REQUEST_KEYS = new Set([
  "operation",
  "invite",
  "testimonial",
  "form",
  "participantProfile",
  "friendProfile",
  "context",
  "idempotencyKey",
]);
const OPERATIONS = new Set([
  "invite_friend_testimonial",
  "decline_friend_testimonial",
  "submit_friend_testimonial",
  "evaluate_friend_testimonial",
]);
const RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "classmate",
  "coworker",
  "family",
  "friend",
  "other",
  "romantic_partner",
  "roommate",
]);
const KNOWLEDGE_LEVELS = new Set<KnowledgeLevel>(["none", "low", "moderate", "high"]);
const CONCERN_FLAGS = new Set<TestimonialConcernFlag>([
  "none",
  "other",
  "possible_baseline_manipulation",
  "possible_noncompletion",
  "possible_pressure",
  "possible_side_payment",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PersistenceStatus =
  | "auth_required"
  | "database_error"
  | "forbidden"
  | "not_configured"
  | "recorded";

interface PersistenceResult {
  blockers: string[];
  recordIds: string[];
  status: PersistenceStatus;
  stateMutation: boolean;
  table: string | null;
}

function persistenceSkipped(): PersistenceResult {
  return {
    blockers: [],
    recordIds: [],
    status: "not_configured",
    stateMutation: false,
    table: null,
  };
}

function persistenceBlocked(
  status: Exclude<PersistenceStatus, "not_configured" | "recorded">,
  blocker: string,
  table: string | null,
): PersistenceResult {
  return {
    blockers: [blocker],
    recordIds: [],
    status,
    stateMutation: false,
    table,
  };
}

function persistenceRecorded(table: string, recordIds: string[]): PersistenceResult {
  return {
    blockers: [],
    recordIds,
    status: "recorded",
    stateMutation: true,
    table,
  };
}

function persistenceHttpStatus(persistence: PersistenceResult) {
  if (persistence.status === "auth_required") return 401;
  if (persistence.status === "forbidden") return 403;
  if (persistence.status === "database_error") return 500;
  return 200;
}

function shouldAttemptPersistence() {
  return hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function stableHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function stableUuid(value: unknown) {
  const hash = createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function databaseUuid(value: string, namespace: string) {
  return UUID_PATTERN.test(value) ? value : stableUuid([namespace, value]);
}

function nullableDatabaseUuid(value: string | null, namespace: string) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function policyHash(value: string) {
  return /^sha256:[a-f0-9]{64}$/i.test(value) ? value : stableHash(value);
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringField(value: unknown) {
  const text = stringField(value);
  return text.length ? text : null;
}

function numberField(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanField(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function stringArrayField(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function relationshipField(value: unknown, fallback: RelationshipType = "friend") {
  const text = stringField(value) as RelationshipType;
  return RELATIONSHIP_TYPES.has(text) ? text : fallback;
}

function knowledgeLevelField(value: unknown, fallback: KnowledgeLevel = "none") {
  const text = stringField(value) as KnowledgeLevel;
  return KNOWLEDGE_LEVELS.has(text) ? text : fallback;
}

function concernFlagField(value: unknown) {
  const text = stringField(value) as TestimonialConcernFlag;
  return CONCERN_FLAGS.has(text) ? text : "none";
}

function decimalField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formOptionalStringField(formData: FormData, key: string) {
  const text = formStringField(formData, key);
  return text.length ? text : null;
}

function formStringArrayField(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function formDecimalField(formData: FormData, key: string) {
  const value = formStringField(formData, key);
  if (!value.length) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fallbackIsoDate(value: string, fallback: string) {
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

function unsupportedKeys(value: Record<string, unknown>) {
  return Object.keys(value)
    .filter((key) => !REQUEST_KEYS.has(key))
    .map((key) => `request.${key}: unsupported participant-credibility enforcement key`);
}

function blocked(status: number, blocker: string, detail: string, extraBlockers: string[] = []) {
  return buildMoralTradeApiJsonResponse(
    {
      blocker,
      blockers: [blocker, ...extraBlockers],
      detail,
      ok: false,
      participantCredibilityGateStatus: "blocked",
      stateMutation: false,
    },
    "no_store_dynamic",
    { status },
  );
}

function parseInviteInput(value: unknown): FriendTestimonialInviteInput {
  const record = isRecord(value) ? value : {};

  return {
    actionType: stringField(record.actionType),
    actionWindowEndAt: stringField(record.actionWindowEndAt),
    actionWindowStartAt: stringField(record.actionWindowStartAt),
    existingPendingInviteCount: numberField(record.existingPendingInviteCount, 0),
    invitedFriendEmailHash: optionalStringField(record.invitedFriendEmailHash),
    invitedFriendUserId: optionalStringField(record.invitedFriendUserId),
    participantActionCommitmentId: optionalStringField(record.participantActionCommitmentId),
    participantProvidedContext: optionalStringField(record.participantProvidedContext),
    participantUserId: stringField(record.participantUserId),
    pledgeSwapId: optionalStringField(record.pledgeSwapId),
    purchaseEnvelopeId: optionalStringField(record.purchaseEnvelopeId),
    purchaseEnvelopeType: optionalStringField(record.purchaseEnvelopeType),
    relationshipClaimedByParticipant: relationshipField(record.relationshipClaimedByParticipant),
    tokenSeed: stringField(record.tokenSeed || record.idempotencyKey || "participant-credibility-preview"),
  };
}

function parseFormInput(value: unknown): FriendTestimonialFormInput {
  const record = isRecord(value) ? value : {};

  return {
    actionTemplateId: stringField(record.actionTemplateId),
    baselineBasisJson: stringArrayField(record.baselineBasisJson),
    baselineCounterfactualCredenceDecimal: decimalField(record.baselineCounterfactualCredenceDecimal),
    baselineKnowledgeLevel: knowledgeLevelField(record.baselineKnowledgeLevel),
    completionBasisJson: stringArrayField(record.completionBasisJson),
    completionCredenceDecimal: decimalField(record.completionCredenceDecimal),
    completionKnowledgeLevel: knowledgeLevelField(record.completionKnowledgeLevel),
    concernFlag: concernFlagField(record.concernFlag),
    concernNotesPrivate: optionalStringField(record.concernNotesPrivate),
    friendTermsAcceptanceId: optionalStringField(record.friendTermsAcceptanceId),
    friendUserId: stringField(record.friendUserId),
    relationshipContextPrivate: optionalStringField(record.relationshipContextPrivate),
    relationshipType: relationshipField(record.relationshipType),
    submittedAt: optionalStringField(record.submittedAt) ?? undefined,
    testimonyTextPrivate: optionalStringField(record.testimonyTextPrivate),
  };
}

function parseParticipantProfile(value: unknown): ParticipantCredibilityProfile {
  const record = isRecord(value) ? value : {};

  return {
    appealStatus: "none",
    credibilityScoreDecimal: numberField(record.credibilityScoreDecimal, 0.5),
    credibilityTier: "standard",
    evidenceReliabilityDecimal: numberField(record.evidenceReliabilityDecimal, 0.5),
    expectedCompletionProbabilityDecimal: numberField(record.expectedCompletionProbabilityDecimal, 0.5),
    fraudRiskDecimal: numberField(record.fraudRiskDecimal, 0.1),
    futureVerificationBurden: "standard",
    lastCredibilityEventId: optionalStringField(record.lastCredibilityEventId),
    participantUserId: stringField(record.participantUserId) || "participant-preview",
    updatedAt: stringField(record.updatedAt) || new Date().toISOString(),
  };
}

function parseContext(value: unknown): TestimonialEvaluationContext {
  const record = isRecord(value) ? value : {};
  const consistency = stringField(record.otherEvidenceConsistency);

  return {
    concernLaterSupported: booleanField(record.concernLaterSupported),
    directEvidenceContradiction: booleanField(record.directEvidenceContradiction),
    friendSubmittedRecentTestimonialCount: numberField(record.friendSubmittedRecentTestimonialCount, 0),
    highStakesPledgeSwap: booleanField(record.highStakesPledgeSwap),
    otherEvidenceConsistency:
      consistency === "consistent" || consistency === "contradicted" ? consistency : "unresolved",
    reciprocalTestimonialCount: numberField(record.reciprocalTestimonialCount, 0),
    repeatedSmallGroupCount: numberField(record.repeatedSmallGroupCount, 0),
    sameHousehold: booleanField(record.sameHousehold),
    samePaymentInstrument: booleanField(record.samePaymentInstrument),
    templatedTextDetected: booleanField(record.templatedTextDetected),
  };
}

function bodyFromFormData(formData: FormData) {
  const actionWindowStartAt = fallbackIsoDate(
    formStringField(formData, "action_window_start_at"),
    "2026-07-01T00:00:00.000Z",
  );
  const actionWindowEndAt = fallbackIsoDate(
    formStringField(formData, "action_window_end_at"),
    "2026-07-03T00:00:00.000Z",
  );
  const inviteToken = formStringField(formData, "invite_token") || "friend-testimonial-preview";
  const participantUserId = formStringField(formData, "participant_user_id") || "participant-preview";
  const friendUserId = formStringField(formData, "friend_user_id") || "friend-preview";
  const now = "2026-07-03T12:00:00.000Z";

  return {
    form: {
      actionTemplateId: formStringField(formData, "action_template_id") || "action-template:pledge-swap",
      baselineBasisJson: formStringArrayField(formData, "baseline_basis_json"),
      baselineCounterfactualCredenceDecimal: formDecimalField(
        formData,
        "baseline_counterfactual_credence_decimal",
      ),
      baselineKnowledgeLevel: formStringField(formData, "baseline_knowledge_level"),
      completionBasisJson: formStringArrayField(formData, "completion_basis_json"),
      completionCredenceDecimal: formDecimalField(formData, "completion_credence_decimal"),
      completionKnowledgeLevel: formStringField(formData, "completion_knowledge_level"),
      concernFlag: formStringField(formData, "concern_flag"),
      concernNotesPrivate: formOptionalStringField(formData, "concern_notes_private"),
      friendTermsAcceptanceId: formOptionalStringField(formData, "friend_terms_acceptance_id"),
      friendUserId,
      relationshipContextPrivate: formOptionalStringField(formData, "relationship_context_private"),
      relationshipType: formStringField(formData, "relationship_type"),
      submittedAt: now,
      testimonyTextPrivate: formOptionalStringField(formData, "testimony_text_private"),
    },
    invite: {
      abuseReportCount: 0,
      createdAt: now,
      expiresAt: "2026-07-17T12:00:00.000Z",
      hiddenFromInvite: [
        "funder identities",
        "payout details",
        "private baseline answers",
        "other evidence",
        "risk flags",
        "reviewer notes",
        "exact scoring rules",
      ],
      id: formStringField(formData, "invite_id") || `friend-testimonial-invite:${inviteToken}`,
      inviteStatus: formStringField(formData, "invite_status") || "pending",
      inviteTokenHash: inviteToken,
      invitedFriendEmailHash: formOptionalStringField(formData, "invited_friend_email_hash"),
      invitedFriendUserId: friendUserId,
      minimumNecessaryDisclosure: {
        actionType: formStringField(formData, "action_type") || "pledge_swap_action",
        actionWindowEndAt,
        actionWindowStartAt,
        participantProvidedContext: formOptionalStringField(formData, "participant_context"),
        testimonialRequestDisclosed: true,
      },
      participantActionCommitmentId: formOptionalStringField(
        formData,
        "participant_action_commitment_id",
      ),
      participantUserId,
      pledgeSwapId: formOptionalStringField(formData, "pledge_swap_id"),
      purchaseEnvelopeId: formOptionalStringField(formData, "purchase_envelope_id"),
      purchaseEnvelopeType: formOptionalStringField(formData, "purchase_envelope_type"),
      relationshipClaimedByParticipant: formOptionalStringField(
        formData,
        "relationship_claimed_by_participant",
      ),
      revokedAt: null,
      updatedAt: now,
    },
    operation: formStringField(formData, "operation") || "submit_friend_testimonial",
  };
}

function requireParticipantUuid(invite: FriendTestimonialInvite, fallback: string | null = null) {
  if (UUID_PATTERN.test(invite.participantUserId)) return invite.participantUserId;
  if (fallback && UUID_PATTERN.test(fallback)) return fallback;
  throw new Error("participant_user_id must be a UUID before participant-credibility persistence.");
}

function requireFriendUuid(testimonial: FriendTestimonial, fallback: string | null = null) {
  if (UUID_PATTERN.test(testimonial.friendUserId)) return testimonial.friendUserId;
  if (fallback && UUID_PATTERN.test(fallback)) return fallback;
  throw new Error("friend_user_id must be a UUID before friend-testimonial persistence.");
}

function inviteRecord(
  invite: FriendTestimonialInvite,
  options: {
    authenticatedFriendUserId?: string | null;
    authenticatedParticipantUserId?: string | null;
  } = {},
) {
  const invitedFriendUserId =
    options.authenticatedFriendUserId ??
    nullableDatabaseUuid(invite.invitedFriendUserId, "profile");

  return {
    abuse_report_count: invite.abuseReportCount,
    created_at: invite.createdAt,
    expires_at: invite.expiresAt,
    hidden_from_invite: invite.hiddenFromInvite,
    id: databaseUuid(invite.id, "friend-testimonial-invite"),
    invite_status: invite.inviteStatus,
    invite_token_hash: policyHash(invite.inviteTokenHash),
    invited_friend_email_hash: invite.invitedFriendEmailHash,
    invited_friend_user_id: invitedFriendUserId,
    minimum_necessary_disclosure_json: toJson(invite.minimumNecessaryDisclosure),
    participant_action_commitment_id: invite.participantActionCommitmentId,
    participant_user_id: requireParticipantUuid(
      invite,
      options.authenticatedParticipantUserId ?? null,
    ),
    pledge_swap_id: invite.pledgeSwapId,
    purchase_envelope_id: invite.purchaseEnvelopeId,
    purchase_envelope_type: invite.purchaseEnvelopeType,
    relationship_claimed_by_participant: invite.relationshipClaimedByParticipant,
    revoked_at: invite.revokedAt,
    updated_at: invite.updatedAt,
  };
}

function testimonialRecord(
  invite: FriendTestimonialInvite,
  testimonial: FriendTestimonial,
  authenticatedFriendUserId: string,
) {
  const friendUserId = requireFriendUuid(testimonial, authenticatedFriendUserId);

  return {
    action_template_id: testimonial.actionTemplateId,
    action_window_end_at: testimonial.actionWindowEndAt,
    action_window_start_at: testimonial.actionWindowStartAt,
    baseline_basis_json: toJson(testimonial.baselineBasisJson),
    baseline_counterfactual_credence_decimal: testimonial.baselineCounterfactualCredenceDecimal,
    baseline_knowledge_level: testimonial.baselineKnowledgeLevel,
    completion_basis_json: toJson(testimonial.completionBasisJson),
    completion_credence_decimal: testimonial.completionCredenceDecimal,
    completion_knowledge_level: testimonial.completionKnowledgeLevel,
    concern_flag: testimonial.concernFlag,
    concern_notes_private: testimonial.concernNotesPrivate,
    created_at: testimonial.createdAt,
    friend_terms_acceptance_id: testimonial.friendTermsAcceptanceId,
    friend_user_id: friendUserId,
    id: databaseUuid(testimonial.id, "friend-testimonial"),
    invite_id: databaseUuid(invite.id, "friend-testimonial-invite"),
    participant_action_commitment_id: testimonial.participantActionCommitmentId,
    participant_user_id: requireParticipantUuid(invite),
    participant_visible_summary: testimonial.participantVisibleSummary,
    pledge_swap_id: testimonial.pledgeSwapId,
    private_reviewer_notes_ref: testimonial.privateReviewerNotesRef,
    purchase_envelope_id: testimonial.purchaseEnvelopeId,
    purchase_envelope_type: testimonial.purchaseEnvelopeType,
    relationship_context_private: testimonial.relationshipContextPrivate,
    relationship_type: testimonial.relationshipType,
    reviewer_user_id: nullableDatabaseUuid(testimonial.reviewerUserId, "reviewer"),
    submitted_at: testimonial.submittedAt,
    testimonial_status: testimonial.testimonialStatus,
    testimony_text_private: testimonial.testimonyTextPrivate,
    updated_at: testimonial.updatedAt,
  };
}

function assessmentRecord(assessment: TestimonialQualityAssessment) {
  const testimonialId = databaseUuid(assessment.friendTestimonialId, "friend-testimonial");

  return {
    accepted_for_additionality_bool: assessment.acceptedForAdditionality,
    accepted_for_completion_verification_bool: assessment.acceptedForCompletionVerification,
    accepted_for_credibility_update_bool: assessment.acceptedForCredibilityUpdate,
    baseline_probative_value_score_decimal: assessment.baselineProbativeValueScoreDecimal,
    collusion_risk_score_decimal: assessment.collusionRiskScoreDecimal,
    completion_probative_value_score_decimal: assessment.completionProbativeValueScoreDecimal,
    consistency_score_decimal: assessment.consistencyScoreDecimal,
    created_at: assessment.createdAt,
    friend_credibility_weight_decimal: assessment.friendCredibilityWeightDecimal,
    friend_testimonial_id: testimonialId,
    friend_user_id: requireFriendUuid(
      {
        friendUserId: assessment.friendUserId,
      } as FriendTestimonial,
    ),
    id: databaseUuid(assessment.id, "testimonial-quality-assessment"),
    independence_score_decimal: assessment.independenceScoreDecimal,
    knowledge_basis_score_decimal: assessment.knowledgeBasisScoreDecimal,
    participant_user_id: requireParticipantUuid(
      {
        participantUserId: assessment.participantUserId,
      } as FriendTestimonialInvite,
    ),
    participant_visible_summary: assessment.participantVisibleSummary,
    privacy_sensitivity_score_decimal: assessment.privacySensitivityScoreDecimal,
    private_notes_ref: assessment.privateNotesRef,
    relationship_weight_decimal: assessment.relationshipWeightDecimal,
    review_status: assessment.reviewStatus,
    reviewer_id: nullableDatabaseUuid(assessment.reviewerId, "reviewer"),
    risk_review_flags: assessment.riskReviewFlags,
    source_id: testimonialId,
    source_type: assessment.sourceType,
    specificity_score_decimal: assessment.specificityScoreDecimal,
    updated_at: assessment.updatedAt,
  };
}

function credibilityEventRecords(impact: ParticipantCredibilityImpact) {
  const records = [];
  if (impact.participantCredibilityEvent) {
    const event = impact.participantCredibilityEvent;
    records.push({
      appeal_status: event.appealStatus,
      correction_of_event_id: event.correctionOfEventId
        ? databaseUuid(event.correctionOfEventId, "credibility-event")
        : null,
      created_at: event.createdAt,
      credibility_delta_decimal: event.credibilityDeltaDecimal,
      event_type: event.eventType,
      evidence_quality_score_decimal: event.evidenceQualityScoreDecimal,
      final_additionality_probability_decimal: event.finalAdditionalityProbabilityDecimal,
      id: databaseUuid(event.id, "credibility-event"),
      new_credibility_score_decimal: event.newCredibilityScoreDecimal,
      participant_user_id: requireParticipantUuid(
        {
          participantUserId: event.participantUserId,
        } as FriendTestimonialInvite,
      ),
      participant_visible_reason: event.participantVisibleReason,
      policy_snapshot_hash: policyHash(event.policySnapshotHash),
      prior_credibility_score_decimal: event.priorCredibilityScoreDecimal,
      private_reviewer_notes_ref: event.privateReviewerNotesRef,
      source_id: event.sourceId,
      source_type: event.sourceType,
      verification_confidence_decimal: event.verificationConfidenceDecimal,
    });
  }

  return records;
}

function testimonialCredibilityEventRecords(impact: ParticipantCredibilityImpact) {
  const records = [];
  if (impact.friendTestimonialCredibilityEvent) {
    const event = impact.friendTestimonialCredibilityEvent;
    records.push({
      appeal_status: event.appealStatus,
      created_at: event.createdAt,
      delta_decimal: event.deltaDecimal,
      event_type: event.eventType,
      friend_user_id: requireFriendUuid(
        {
          friendUserId: event.friendUserId,
        } as FriendTestimonial,
      ),
      friend_visible_reason: event.friendVisibleReason,
      id: databaseUuid(event.id, "testimonial-credibility-event"),
      new_testimonial_credibility_decimal: event.newTestimonialCredibilityDecimal,
      participant_visible_reason: event.participantVisibleReason,
      policy_snapshot_hash: policyHash(event.policySnapshotHash),
      prior_testimonial_credibility_decimal: event.priorTestimonialCredibilityDecimal,
      private_reviewer_notes_ref: event.privateReviewerNotesRef,
      related_participant_user_id: requireParticipantUuid(
        {
          participantUserId: event.relatedParticipantUserId,
        } as FriendTestimonialInvite,
      ),
      source_friend_testimonial_id: databaseUuid(
        event.sourceFriendTestimonialId,
        "friend-testimonial",
      ),
    });
  }

  return records;
}

async function authenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function persistParticipantInviteIfConfigured(invite: FriendTestimonialInvite) {
  if (!shouldAttemptPersistence()) return persistenceSkipped();

  const userId = await authenticatedUserId();
  if (!userId) {
    return persistenceBlocked(
      "auth_required",
      "authentication_required:participant_credibility_invite",
      "moral_trade_friend_testimonial_invites",
    );
  }

  if (UUID_PATTERN.test(invite.participantUserId) && invite.participantUserId !== userId) {
    return persistenceBlocked(
      "forbidden",
      "participant_credibility_invite_participant_mismatch",
      "moral_trade_friend_testimonial_invites",
    );
  }

  const service = createServiceClient();
  const record = inviteRecord(invite, { authenticatedParticipantUserId: userId });
  const result = await service
    .from("moral_trade_friend_testimonial_invites")
    .upsert(record, { onConflict: "id" })
    .select("id")
    .single();

  if (result.error) {
    return persistenceBlocked(
      "database_error",
      `database_insert_failed:friend_testimonial_invite:${result.error.message}`,
      "moral_trade_friend_testimonial_invites",
    );
  }

  return persistenceRecorded("moral_trade_friend_testimonial_invites", [String(result.data.id)]);
}

async function persistFriendDeclineIfConfigured(invite: FriendTestimonialInvite) {
  if (!shouldAttemptPersistence()) return persistenceSkipped();

  const userId = await authenticatedUserId();
  if (!userId) {
    return persistenceBlocked(
      "auth_required",
      "authentication_required:friend_testimonial_decline",
      "moral_trade_friend_testimonial_invites",
    );
  }

  if (UUID_PATTERN.test(invite.invitedFriendUserId ?? "") && invite.invitedFriendUserId !== userId) {
    return persistenceBlocked(
      "forbidden",
      "friend_testimonial_decline_friend_mismatch",
      "moral_trade_friend_testimonial_invites",
    );
  }

  const service = createServiceClient();
  const record = inviteRecord(invite, { authenticatedFriendUserId: userId });
  const result = await service
    .from("moral_trade_friend_testimonial_invites")
    .upsert(record, { onConflict: "id" })
    .select("id")
    .single();

  if (result.error) {
    return persistenceBlocked(
      "database_error",
      `database_update_failed:friend_testimonial_decline:${result.error.message}`,
      "moral_trade_friend_testimonial_invites",
    );
  }

  return persistenceRecorded("moral_trade_friend_testimonial_invites", [String(result.data.id)]);
}

async function persistFriendTestimonialIfConfigured(input: {
  assessment?: TestimonialQualityAssessment;
  impact?: ParticipantCredibilityImpact;
  invite: FriendTestimonialInvite;
  testimonial: FriendTestimonial;
}) {
  if (!shouldAttemptPersistence()) return persistenceSkipped();

  const userId = await authenticatedUserId();
  if (!userId) {
    return persistenceBlocked(
      "auth_required",
      "authentication_required:friend_testimonial_submit",
      "moral_trade_friend_testimonials",
    );
  }

  if (UUID_PATTERN.test(input.testimonial.friendUserId) && input.testimonial.friendUserId !== userId) {
    return persistenceBlocked(
      "forbidden",
      "friend_testimonial_submit_friend_mismatch",
      "moral_trade_friend_testimonials",
    );
  }

  const service = createServiceClient();
  const invite = {
    ...input.invite,
    inviteStatus: "accepted" as const,
    invitedFriendUserId: userId,
    updatedAt: input.testimonial.submittedAt,
  };
  const testimonial = {
    ...input.testimonial,
    friendUserId: userId,
  };
  const inviteUpsert = await service
    .from("moral_trade_friend_testimonial_invites")
    .upsert(inviteRecord(invite, { authenticatedFriendUserId: userId }), { onConflict: "id" })
    .select("id")
    .single();

  if (inviteUpsert.error) {
    return persistenceBlocked(
      "database_error",
      `database_upsert_failed:friend_testimonial_invite:${inviteUpsert.error.message}`,
      "moral_trade_friend_testimonial_invites",
    );
  }

  const testimonialInsert = await service
    .from("moral_trade_friend_testimonials")
    .insert(testimonialRecord(invite, testimonial, userId))
    .select("id")
    .single();

  if (testimonialInsert.error) {
    return persistenceBlocked(
      "database_error",
      `database_insert_failed:friend_testimonial:${testimonialInsert.error.message}`,
      "moral_trade_friend_testimonials",
    );
  }

  const recordIds = [String(inviteUpsert.data.id), String(testimonialInsert.data.id)];

  if (input.assessment) {
    const assessmentInsert = await service
      .from("moral_trade_testimonial_quality_assessments")
      .insert(assessmentRecord(input.assessment))
      .select("id")
      .single();

    if (assessmentInsert.error) {
      return persistenceBlocked(
        "database_error",
        `database_insert_failed:testimonial_quality_assessment:${assessmentInsert.error.message}`,
        "moral_trade_testimonial_quality_assessments",
      );
    }
    recordIds.push(String(assessmentInsert.data.id));
  }

  const credibilityEvents = input.impact ? credibilityEventRecords(input.impact) : [];
  if (credibilityEvents.length) {
    const eventInsert = await service
      .from("moral_trade_credibility_events")
      .insert(credibilityEvents)
      .select("id");

    if (eventInsert.error) {
      return persistenceBlocked(
        "database_error",
        `database_insert_failed:credibility_event:${eventInsert.error.message}`,
        "moral_trade_credibility_events",
      );
    }
    recordIds.push(...(eventInsert.data ?? []).map((row) => String(row.id)));
  }

  const testimonialEvents = input.impact ? testimonialCredibilityEventRecords(input.impact) : [];
  if (testimonialEvents.length) {
    const eventInsert = await service
      .from("moral_trade_testimonial_credibility_events")
      .insert(testimonialEvents)
      .select("id");

    if (eventInsert.error) {
      return persistenceBlocked(
        "database_error",
        `database_insert_failed:testimonial_credibility_event:${eventInsert.error.message}`,
        "moral_trade_testimonial_credibility_events",
      );
    }
    recordIds.push(...(eventInsert.data ?? []).map((row) => String(row.id)));
  }

  return persistenceRecorded("moral_trade_friend_testimonials", recordIds);
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "participant_credibility_enforce");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited participant-credibility enforcement creates no invite, testimonial, scoring, payment, disclosure, or public-report state change.",
    );
  }

  let body: unknown;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    body =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
        ? bodyFromFormData(await request.formData())
        : await request.json();
  } catch {
    return blocked(
      400,
      "invalid_json_body",
      "Invalid JSON body creates no participant-credibility state change.",
    );
  }

  if (!isRecord(body)) {
    return blocked(
      400,
      "request_body_object_required",
      "The participant-credibility enforcement request must be a JSON object.",
    );
  }

  const requestBlockers = unsupportedKeys(body);
  const operation = stringField(body.operation);
  if (!OPERATIONS.has(operation)) {
    return blocked(
      400,
      "unsupported_participant_credibility_operation",
      "Supported operations are invite_friend_testimonial, decline_friend_testimonial, submit_friend_testimonial, and evaluate_friend_testimonial.",
      requestBlockers,
    );
  }

  const contract = getMoralTradeParticipantCredibilityContract();
  const validation = validateMoralTradeParticipantCredibilityContract(contract);
  if (validation.status !== "pass") {
    return blocked(
      503,
      "participant_credibility_contract_validation_failed",
      "Participant-credibility contract validation failed closed before enforcement.",
      [...requestBlockers, ...validation.blockers],
    );
  }

  if (operation === "invite_friend_testimonial") {
    const result = createFriendTestimonialInvite(parseInviteInput(body.invite), {
      maxInvites: contract.friendInviteRules.defaultMaxInvites,
    });
    const persistence = result.ok
      ? await persistParticipantInviteIfConfigured(result.invite)
      : persistenceSkipped();
    const blockers = [...requestBlockers, ...result.blockers, ...persistence.blockers];

    return buildMoralTradeApiJsonResponse({
      blockers,
      checkedAt: new Date().toISOString(),
      invite: result.invite,
      ok: blockers.length === 0 && result.ok,
      participantCredibilityGateStatus: blockers.length ? "blocked" : "pass",
      persistence,
      stateMutation: persistence.stateMutation,
    }, "no_store_dynamic", { status: persistenceHttpStatus(persistence) });
  }

  if (!isRecord(body.invite)) {
    return blocked(
      400,
      "friend_testimonial_invite_required",
      "A friend testimonial invite object is required for this operation.",
      requestBlockers,
    );
  }

  const invite = body.invite as unknown as FriendTestimonialInvite;

  if (operation === "decline_friend_testimonial") {
    const result = declineFriendTestimonialInvite(invite);
    const persistence = await persistFriendDeclineIfConfigured(result.invite);
    const blockers = [...requestBlockers, ...persistence.blockers];

    return buildMoralTradeApiJsonResponse({
      blockers,
      checkedAt: new Date().toISOString(),
      decline: result,
      ok: blockers.length === 0,
      participantCredibilityGateStatus: blockers.length ? "blocked" : "pass",
      persistence,
      stateMutation: persistence.stateMutation,
    }, "no_store_dynamic", { status: persistenceHttpStatus(persistence) });
  }

  const submission = submitFriendTestimonial(invite, parseFormInput(body.form));
  if (operation === "submit_friend_testimonial") {
    const persistence = submission.ok
      ? await persistFriendTestimonialIfConfigured({
          invite: submission.invite,
          testimonial: submission.testimonial,
        })
      : persistenceSkipped();
    const blockers = [...requestBlockers, ...submission.blockers, ...persistence.blockers];

    return buildMoralTradeApiJsonResponse({
      accessLog: submission.accessLog,
      auditEvent: submission.auditEvent,
      blockers,
      checkedAt: new Date().toISOString(),
      invite: submission.invite,
      ok: blockers.length === 0 && submission.ok,
      participantCredibilityGateStatus: blockers.length ? "blocked" : "pass",
      persistence,
      receipt: submission.receipt,
      stateMutation: persistence.stateMutation,
      testimonial: submission.testimonial,
    }, "no_store_dynamic", { status: persistenceHttpStatus(persistence) });
  }

  const context = parseContext(body.context);
  const friendRecord = isRecord(body.friendProfile) ? body.friendProfile : {};
  const assessment = assessFriendTestimonialQuality({
    context,
    friendProfile: {
      testimonialCredibilityDecimal: numberField(friendRecord.testimonialCredibilityDecimal, 0.5),
      verifiedAccount: booleanField(friendRecord.verifiedAccount),
    },
    testimonial: submission.testimonial,
  });
  const impact = applyFriendTestimonialToParticipantCredibility({
    assessment,
    context,
    friendTestimonialCredibilityDecimal: numberField(
      friendRecord.testimonialCredibilityDecimal,
      0.5,
    ),
    participantProfile: parseParticipantProfile(body.participantProfile),
    testimonial: submission.testimonial,
  });
  const persistence =
    submission.ok && impact.status === "pass"
      ? await persistFriendTestimonialIfConfigured({
          assessment,
          impact,
          invite: submission.invite,
          testimonial: submission.testimonial,
        })
      : persistenceSkipped();
  const blockers = [...requestBlockers, ...submission.blockers, ...impact.blockers, ...persistence.blockers];

  return buildMoralTradeApiJsonResponse({
    assessment,
    blockers,
    checkedAt: new Date().toISOString(),
    impact,
    ok: blockers.length === 0 && submission.ok && impact.status === "pass",
    participantCredibilityGateStatus: blockers.length ? "blocked" : impact.status,
    persistence,
    receipt: submission.receipt,
    stateMutation: persistence.stateMutation,
    testimonial: submission.testimonial,
  }, "no_store_dynamic", { status: persistenceHttpStatus(persistence) });
}
