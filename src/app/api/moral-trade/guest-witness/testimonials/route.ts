import { NextResponse } from "next/server";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  stableWitnessHash,
  submitBaselineWitnessTestimonialDraft,
  type BaselineKnowledgeLevel,
  type RecentMealObservationFrequency,
  type RelationshipType,
  type WitnessConcernFlag,
  type WitnessProvider,
} from "@/lib/moral-trade/guest-witness-testimony";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InviteRow = Database["public"]["Tables"]["baseline_witness_invites"]["Row"];
type IdentityRow = Database["public"]["Tables"]["guest_witness_identities"]["Row"];
type ExternalAccountRow = Database["public"]["Tables"]["external_witness_accounts"]["Row"];
type TestimonialRow = Database["public"]["Tables"]["baseline_witness_testimonials"]["Row"];
type AssessmentRow = Database["public"]["Tables"]["baseline_witness_quality_assessments"]["Row"];

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
const KNOWLEDGE_LEVELS: BaselineKnowledgeLevel[] = ["none", "low", "moderate", "high"];
const OBSERVATION_FREQUENCIES: RecentMealObservationFrequency[] = [
  "never",
  "once",
  "few_times",
  "weekly",
  "daily",
  "lived_together",
];
const CONCERN_FLAGS: WitnessConcernFlag[] = [
  "none",
  "possible_baseline_overstatement",
  "possible_pressure",
  "possible_side_payment",
  "insufficient_knowledge",
  "other",
];
const WITNESS_PROVIDERS: WitnessProvider[] = [
  "email_magic_link",
  "google",
  "apple",
  "x",
  "facebook",
  "instagram",
  "manual_review",
];
const PROVIDER_ACCOUNT_TYPES = ["business", "creator", "personal", "unknown"] as const;

function isJsonRequest(request: Request) {
  return request.headers.get("content-type")?.includes("application/json") ?? false;
}

async function parsePayload(request: Request) {
  if (isJsonRequest(request)) {
    return (await request.json()) as Record<string, unknown>;
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries()) as Record<string, unknown>;
}

function stringField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function boolField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return value === true || value === "true" || value === "on" || value === "1";
}

function enumField<T extends string>(value: string, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function redirectWithMessage(request: Request, returnTo: string, key: "message" | "error", text: string) {
  const fallback = new URL("/", request.url);
  const target = returnTo ? new URL(returnTo, request.url) : fallback;
  const requestUrl = new URL(request.url);

  if (target.origin !== requestUrl.origin) {
    return NextResponse.redirect(fallback);
  }

  target.searchParams.set(key, text);
  return NextResponse.redirect(target);
}

function jsonOrRedirect(
  request: Request,
  payload: Record<string, unknown>,
  status: number,
  returnTo: string,
  key: "message" | "error",
  text: string,
) {
  if (isJsonRequest(request)) {
    return buildMoralTradeApiJsonResponse(payload, "private_no_store", { status });
  }

  return redirectWithMessage(request, returnTo, key, text);
}

function inviteRowToDomain(invite: InviteRow) {
  return {
    actionTemplateId: invite.action_template_id,
    actionWindowEndAt: invite.action_window_end_at,
    actionWindowStartAt: invite.action_window_start_at,
    createdAt: invite.created_at,
    expiresAt: invite.expires_at,
    id: invite.id,
    invitedEmailHash: invite.invited_email_hash,
    invitedPhoneHash: invite.invited_phone_hash,
    inviteStatus: invite.invite_status,
    inviteTokenHash: invite.invite_token_hash,
    participantActionCommitmentId: invite.participant_action_commitment_id,
    participantClaimedRelationship: invite.participant_claimed_relationship,
    participantUserId: invite.participant_user_id,
    pledgeSwapId: invite.pledge_swap_id,
    purchaseEnvelopeId: invite.purchase_envelope_id,
    purchaseEnvelopeType: invite.purchase_envelope_type,
    updatedAt: invite.updated_at,
  };
}

async function findOrCreateIdentity({
  phoneHash,
  primaryEmailHash,
  service,
}: {
  phoneHash: string | null;
  primaryEmailHash: string | null;
  service: ReturnType<typeof createServiceClient>;
}) {
  if (primaryEmailHash) {
    const existing = await service
      .from("guest_witness_identities")
      .select("*")
      .eq("primary_email_hash", primaryEmailHash)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return existing.data as IdentityRow;
  }

  if (phoneHash) {
    const existing = await service
      .from("guest_witness_identities")
      .select("*")
      .eq("phone_hash", phoneHash)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return existing.data as IdentityRow;
  }

  const inserted = await service
    .from("guest_witness_identities")
    .insert({
      phone_hash: phoneHash,
      primary_email_hash: primaryEmailHash,
      witness_status: "active",
    })
    .select("*")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);

  return inserted.data as IdentityRow;
}

async function findOrCreateExternalAccount({
  draftAccount,
  identity,
  service,
}: {
  draftAccount: NonNullable<ReturnType<typeof submitBaselineWitnessTestimonialDraft>["externalAccount"]>;
  identity: IdentityRow;
  service: ReturnType<typeof createServiceClient>;
}) {
  const existing = await service
    .from("external_witness_accounts")
    .select("*")
    .eq("provider", draftAccount.provider)
    .eq("provider_account_id_hash", draftAccount.providerAccountIdHash)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data as ExternalAccountRow;

  const inserted = await service
    .from("external_witness_accounts")
    .insert({
      account_status: draftAccount.accountStatus,
      guest_witness_identity_id: identity.id,
      oauth_scope_snapshot_json: draftAccount.oauthScopeSnapshotJson as Json,
      privacy_notice_version: draftAccount.privacyNoticeVersion,
      provider: draftAccount.provider,
      provider_account_display_snapshot: draftAccount.providerAccountDisplaySnapshot,
      provider_account_id_hash: draftAccount.providerAccountIdHash,
      provider_profile_url_snapshot: draftAccount.providerProfileUrlSnapshot,
      provider_verified_at: draftAccount.providerVerifiedAt,
      terms_acceptance_id: draftAccount.termsAcceptanceId,
      token_expires_at: draftAccount.tokenExpiresAt,
      token_ref: draftAccount.tokenRef,
      token_storage_policy: draftAccount.tokenStoragePolicy,
    })
    .select("*")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);

  return inserted.data as ExternalAccountRow;
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "guest_witness_testimony_write");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited witness testimony requests fail closed without storing testimony.",
    );
  }

  const payload = await parsePayload(request);
  const inviteToken = stringField(payload, "invite_token");
  const returnTo = stringField(payload, "return_to") || `/guest-witness/${encodeURIComponent(inviteToken)}`;

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonOrRedirect(
      request,
      { error: "supabase_unconfigured", ok: false },
      503,
      returnTo,
      "error",
      "Witness testimony is unavailable until Supabase service persistence is configured.",
    );
  }

  const service = createServiceClient();
  const inviteResult = await service
    .from("baseline_witness_invites")
    .select("*")
    .eq("invite_token_hash", stableWitnessHash(inviteToken, "baseline-witness-invite-token"))
    .maybeSingle();

  if (inviteResult.error) {
    return jsonOrRedirect(
      request,
      { error: inviteResult.error.message, ok: false },
      500,
      returnTo,
      "error",
      "Unable to load the witness invite.",
    );
  }

  const invite = inviteResult.data as InviteRow | null;
  if (!invite || !["pending", "opened"].includes(invite.invite_status)) {
    return jsonOrRedirect(
      request,
      { error: "invite_unavailable", ok: false },
      404,
      returnTo,
      "error",
      "This witness invite is unavailable.",
    );
  }

  const action = stringField(payload, "intent");
  if (action === "decline" || action === "report_pressure") {
    const pressureNotes = stringField(payload, "pressure_notes") || stringField(payload, "decline_notes");
    const nextStatus = action === "report_pressure" ? "reported" : "declined";
    await service
      .from("baseline_witness_invites")
      .update({ invite_status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", invite.id);
    await service.from("baseline_witness_audit_events").insert({
      actor_kind: "witness",
      event_payload_redacted: {
        privateFieldsSuppressed: true,
        reportedPressure: action === "report_pressure",
      },
      event_type: action === "report_pressure" ? "pressure_reported" : "witness_declined",
      invite_id: invite.id,
      private_ref_hash: pressureNotes
        ? stableWitnessHash(pressureNotes, "baseline-witness-private-report")
        : null,
      redacted_summary:
        action === "report_pressure"
          ? "Guest witness reported possible pressure or coercion."
          : "Guest witness declined the baseline testimony invite.",
    });

    if (action === "report_pressure") {
      await service.from("baseline_witness_risk_reports").insert({
        invite_id: invite.id,
        participant_user_id: invite.participant_user_id,
        private_report_ref_hash: pressureNotes
          ? stableWitnessHash(pressureNotes, "baseline-witness-private-report")
          : null,
        redacted_summary: "Guest witness reported possible pressure or coercion.",
        report_kind: "pressure_or_coercion",
      });
    }

    return jsonOrRedirect(
      request,
      { inviteStatus: nextStatus, ok: true, privateFieldsSuppressed: true },
      200,
      returnTo,
      "message",
      action === "report_pressure"
        ? "Thank you. Your pressure report was sent privately to reviewer operations."
        : "Thanks. The invite was declined without sharing private notes with the participant.",
    );
  }

  const provider = enumField(
    stringField(payload, "provider") || "email_magic_link",
    WITNESS_PROVIDERS,
    "email_magic_link",
  );
  const concernFlag = enumField(
    stringField(payload, "concern_flag") || "none",
    CONCERN_FLAGS,
    "none",
  );
  const credence = Number(stringField(payload, "baseline_counterfactual_credence_decimal"));
  const draft = submitBaselineWitnessTestimonialDraft({
    accuracyAffirmed: boolField(payload, "accuracy_affirmed"),
    baselineCounterfactualCredenceDecimal: Number.isFinite(credence) ? credence : -1,
    baselineKnowledgeLevel: enumField(
      stringField(payload, "baseline_knowledge_level"),
      KNOWLEDGE_LEVELS,
      "none",
    ),
    basisText: stringField(payload, "basis_text"),
    concernFlag,
    concernNotesPrivate: stringField(payload, "concern_notes_private"),
    invite: inviteRowToDomain(invite),
    providerAccount: {
      accountType: enumField(
        stringField(payload, "provider_account_type"),
        PROVIDER_ACCOUNT_TYPES,
        "unknown",
      ),
      provider,
      providerAccountDisplaySnapshot: stringField(payload, "provider_account_display"),
      providerAccountId: stringField(payload, "provider_account_id"),
      providerProfileUrlSnapshot: stringField(payload, "provider_profile_url"),
      rawOAuthToken: stringField(payload, "raw_oauth_token"),
    },
    recentMealObservationFrequency: enumField(
      stringField(payload, "recent_meal_observation_frequency"),
      OBSERVATION_FREQUENCIES,
      "never",
    ),
    relationshipType: enumField(
      stringField(payload, "relationship_type"),
      RELATIONSHIP_TYPES,
      "other",
    ),
    uncertaintyNotesPrivate: stringField(payload, "uncertainty_notes_private"),
    witnessEmail: stringField(payload, "witness_email"),
    witnessPhone: stringField(payload, "witness_phone"),
  });

  if (!draft.identity || !draft.externalAccount || !draft.testimonial || !draft.assessment) {
    return jsonOrRedirect(
      request,
      { blockers: draft.blockers, ok: false },
      400,
      returnTo,
      "error",
      `Witness testimony blocked: ${draft.blockers.join(", ")}`,
    );
  }

  try {
    const identity = await findOrCreateIdentity({
      phoneHash: draft.identity.phoneHash,
      primaryEmailHash: draft.identity.primaryEmailHash,
      service,
    });
    const externalAccount = await findOrCreateExternalAccount({
      draftAccount: draft.externalAccount,
      identity,
      service,
    });
    const testimonialInsert = await service
      .from("baseline_witness_testimonials")
      .insert({
        baseline_counterfactual_credence_decimal:
          draft.testimonial.baselineCounterfactualCredenceDecimal,
        baseline_knowledge_level: draft.testimonial.baselineKnowledgeLevel,
        basis_json: draft.testimonial.basisJson as Json,
        concern_flag: draft.testimonial.concernFlag,
        concern_notes_private: draft.testimonial.concernNotesPrivate,
        external_witness_account_id: externalAccount.id,
        guest_witness_identity_id: externalAccount.guest_witness_identity_id,
        invite_id: invite.id,
        participant_action_commitment_id: invite.participant_action_commitment_id,
        participant_user_id: invite.participant_user_id,
        pledge_swap_id: invite.pledge_swap_id,
        purchase_envelope_id: invite.purchase_envelope_id,
        purchase_envelope_type: invite.purchase_envelope_type,
        recent_meal_observation_frequency: draft.testimonial.recentMealObservationFrequency,
        relationship_type: draft.testimonial.relationshipType,
        testimonial_status: draft.testimonial.testimonialStatus,
        uncertainty_notes_private: draft.testimonial.uncertaintyNotesPrivate,
      })
      .select("*")
      .single();
    if (testimonialInsert.error) throw new Error(testimonialInsert.error.message);

    const testimonial = testimonialInsert.data as TestimonialRow;
    const assessmentInsert = await service
      .from("baseline_witness_quality_assessments")
      .insert({
        accepted_for_additionality: draft.assessment.acceptedForAdditionality,
        accepted_for_credibility_update: draft.assessment.acceptedForCredibilityUpdate,
        baseline_probative_value_score_decimal:
          draft.assessment.baselineProbativeValueScoreDecimal,
        baseline_witness_testimonial_id: testimonial.id,
        collusion_risk_score_decimal: draft.assessment.collusionRiskScoreDecimal,
        consistency_score_decimal: draft.assessment.consistencyScoreDecimal,
        guest_witness_identity_id: externalAccount.guest_witness_identity_id,
        identity_assurance_level: draft.assessment.identityAssuranceLevel,
        independence_score_decimal: draft.assessment.independenceScoreDecimal,
        knowledge_basis_score_decimal: draft.assessment.knowledgeBasisScoreDecimal,
        participant_user_id: invite.participant_user_id,
        private_notes_ref: draft.assessment.privateNotesRef,
        proposed_additionality_adjustment_decimal:
          draft.assessment.proposedAdditionalityAdjustmentDecimal,
        relationship_weight_decimal: draft.assessment.relationshipWeightDecimal,
        review_status: draft.assessment.reviewStatus,
        specificity_score_decimal: draft.assessment.specificityScoreDecimal,
      })
      .select("*")
      .single();
    if (assessmentInsert.error) throw new Error(assessmentInsert.error.message);

    const assessment = assessmentInsert.data as AssessmentRow;
    await service
      .from("baseline_witness_invites")
      .update({ invite_status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", invite.id);
    await service.from("baseline_witness_audit_events").insert([
      {
        actor_kind: "witness",
        event_payload_redacted: {
          identityAssuranceLevel: assessment.identity_assurance_level,
          privateFieldsSuppressed: true,
          socialIdentitySeparatedFromClaimCredibility: true,
        },
        event_type: "testimonial_submitted",
        invite_id: invite.id,
        baseline_witness_testimonial_id: testimonial.id,
        redacted_summary: "Guest witness submitted private baseline testimony.",
      },
      {
        actor_kind: "system",
        baseline_witness_quality_assessment_id: assessment.id,
        baseline_witness_testimonial_id: testimonial.id,
        event_payload_redacted: {
          baselineProbativeValueScoreDecimal: assessment.baseline_probative_value_score_decimal,
          privateFieldsSuppressed: true,
        },
        event_type: "quality_assessed",
        invite_id: invite.id,
        redacted_summary: "Baseline witness quality assessment was created.",
      },
    ]);

    if (draft.riskReviewRequired) {
      await service.from("baseline_witness_risk_reports").insert({
        baseline_witness_testimonial_id: testimonial.id,
        guest_witness_identity_id: externalAccount.guest_witness_identity_id,
        invite_id: invite.id,
        participant_user_id: invite.participant_user_id,
        private_report_ref_hash: draft.testimonial.concernNotesPrivate
          ? stableWitnessHash(draft.testimonial.concernNotesPrivate, "baseline-witness-private-report")
          : null,
        redacted_summary: "Guest witness testimony requires private risk review.",
        report_kind:
          concernFlag === "possible_side_payment" ? "possible_side_payment" : "pressure_or_coercion",
      });
    }

    return jsonOrRedirect(
      request,
      {
        blockers: [],
        ok: true,
        privateFieldsSuppressed: true,
        testimonialId: testimonial.id,
        witnessReviewStatus: assessment.review_status,
      },
      200,
      returnTo,
      "message",
      "Thank you. Your private baseline testimony was sent to reviewer operations.",
    );
  } catch (error) {
    return jsonOrRedirect(
      request,
      { error: error instanceof Error ? error.message : "testimonial_store_failed", ok: false },
      500,
      returnTo,
      "error",
      "Unable to store the witness testimony.",
    );
  }
}
