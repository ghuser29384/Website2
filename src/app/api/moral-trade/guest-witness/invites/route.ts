import { NextResponse } from "next/server";

import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  createBaselineWitnessInviteDraft,
  stableWitnessHash,
  type RelationshipType,
} from "@/lib/moral-trade/guest-witness-testimony";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OfferRow = Pick<
  Database["public"]["Tables"]["offers"]["Row"],
  "duration" | "id" | "mode" | "offer_action" | "owner_id" | "request_action"
>;
type InviteRow = Database["public"]["Tables"]["baseline_witness_invites"]["Row"];

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

function relationshipField(value: string): RelationshipType | null {
  return RELATIONSHIP_TYPES.includes(value as RelationshipType) ? (value as RelationshipType) : null;
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

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "guest_witness_invite_write");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited witness invite creation fails closed without creating an invite.",
    );
  }

  const payload = await parsePayload(request);
  const returnTo = stringField(payload, "return_to") || "/";

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonOrRedirect(
      request,
      { error: "supabase_unconfigured", ok: false },
      503,
      returnTo,
      "error",
      "Witness invites are unavailable until Supabase service persistence is configured.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonOrRedirect(
      request,
      { error: "authentication_required", ok: false },
      401,
      returnTo,
      "error",
      "Sign in before inviting a guest witness.",
    );
  }

  const offerId = stringField(payload, "offer_id");
  const witnessEmail = stringField(payload, "witness_email");
  const witnessPhone = stringField(payload, "witness_phone");
  const shareableLinkOnly = boolField(payload, "shareable_link_only");
  const relationship = relationshipField(stringField(payload, "participant_claimed_relationship"));
  const actionWindowStartAt = stringField(payload, "action_window_start_at");
  const actionWindowEndAt = stringField(payload, "action_window_end_at");

  const service = createServiceClient();
  const offerResult = await service
    .from("offers")
    .select("id, owner_id, mode, offer_action, request_action, duration")
    .eq("id", offerId)
    .maybeSingle();

  if (offerResult.error) {
    return jsonOrRedirect(
      request,
      { error: offerResult.error.message, ok: false },
      500,
      returnTo,
      "error",
      "Unable to load the offer before creating a witness invite.",
    );
  }

  const offer = offerResult.data as OfferRow | null;
  if (!offer || offer.owner_id !== user.id || offer.mode !== "pledge") {
    return jsonOrRedirect(
      request,
      { error: "offer_not_owned_or_not_pledge", ok: false },
      403,
      returnTo,
      "error",
      "Witness invites are available only to the signed-in owner of a pledge offer.",
    );
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const [activeInvitesResult, recentInvitesResult] = await Promise.all([
    service
      .from("baseline_witness_invites")
      .select("id", { count: "exact", head: true })
      .eq("participant_user_id", user.id)
      .eq("purchase_envelope_type", "offer")
      .eq("purchase_envelope_id", offer.id)
      .in("invite_status", ["pending", "opened"]),
    service
      .from("baseline_witness_invites")
      .select("created_at")
      .eq("participant_user_id", user.id)
      .eq("purchase_envelope_type", "offer")
      .eq("purchase_envelope_id", offer.id)
      .gte("created_at", tenMinutesAgo),
  ]);

  if (activeInvitesResult.error || recentInvitesResult.error) {
    return jsonOrRedirect(
      request,
      {
        error: activeInvitesResult.error?.message ?? recentInvitesResult.error?.message,
        ok: false,
      },
      500,
      returnTo,
      "error",
      "Unable to check witness invite limits.",
    );
  }

  const draft = createBaselineWitnessInviteDraft({
    actionTemplateId: offer.offer_action || offer.request_action || offer.id,
    actionWindowEndAt,
    actionWindowStartAt,
    activeInviteCount: activeInvitesResult.count ?? 0,
    participantClaimedRelationship: relationship,
    participantUserId: user.id,
    pledgeSwapId: offer.id,
    purchaseEnvelopeId: offer.id,
    purchaseEnvelopeType: "offer",
    recentInviteTimestamps: ((recentInvitesResult.data ?? []) as Pick<InviteRow, "created_at">[]).map(
      (row) => row.created_at,
    ),
    shareableLinkOnly,
    witnessEmail,
    witnessPhone,
  });

  if (!draft.invite || !draft.rawInviteToken) {
    return jsonOrRedirect(
      request,
      { blockers: draft.blockers, ok: false },
      400,
      returnTo,
      "error",
      `Witness invite blocked: ${draft.blockers.join(", ")}`,
    );
  }

  const insertResult = await service
    .from("baseline_witness_invites")
    .insert({
      action_template_id: draft.invite.actionTemplateId,
      action_window_end_at: draft.invite.actionWindowEndAt,
      action_window_start_at: draft.invite.actionWindowStartAt,
      expires_at: draft.invite.expiresAt,
      invited_email_hash: draft.invite.invitedEmailHash,
      invited_phone_hash: draft.invite.invitedPhoneHash,
      invite_status: draft.invite.inviteStatus,
      invite_token_hash: draft.invite.inviteTokenHash,
      participant_claimed_relationship: draft.invite.participantClaimedRelationship,
      participant_user_id: user.id,
      pledge_swap_id: offer.id,
      purchase_envelope_id: offer.id,
      purchase_envelope_type: "offer",
    })
    .select("*")
    .single();

  if (insertResult.error) {
    return jsonOrRedirect(
      request,
      { error: insertResult.error.message, ok: false },
      500,
      returnTo,
      "error",
      "Unable to create the witness invite.",
    );
  }

  const invite = insertResult.data as InviteRow;
  const witnessPath = `/guest-witness/${encodeURIComponent(draft.rawInviteToken)}`;
  const witnessUrl = new URL(witnessPath, request.url).toString();

  await service.from("baseline_witness_audit_events").insert({
    actor_id_hash: stableWitnessHash(user.id, "baseline-witness-actor"),
    actor_kind: "participant",
    event_payload_redacted: {
      inviteStatus: invite.invite_status,
      offerId: offer.id,
      privateFieldsSuppressed: true,
    },
    event_type: "invite_created",
    invite_id: invite.id,
    redacted_summary: "Participant created a baseline guest witness invite.",
  });

  return jsonOrRedirect(
    request,
    {
      blockers: [],
      invite: {
        expiresAt: invite.expires_at,
        inviteId: invite.id,
        inviteStatus: invite.invite_status,
        participantClaimedRelationship: invite.participant_claimed_relationship,
        privateFieldsSuppressed: true,
      },
      ok: true,
      witnessUrl,
    },
    200,
    returnTo,
    "message",
    `Private witness link created: ${witnessUrl}`,
  );
}
