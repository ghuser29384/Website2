import { NextResponse } from "next/server";

import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import {
  isBackgroundIntroContactApprovalAllowed,
  summarizeBackgroundIntroContactApprovalStatus,
  validateBackgroundContactApprovalStepUp,
} from "@/lib/background-intro-requests";
import { serializeBackgroundNetworkingRolloutSurface } from "@/lib/background-rollout";
import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "background_intro_packet_write");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited contact approvals create no state change until the window resets.",
      "private, no-store",
    );
  }

  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const stepUp = validateBackgroundContactApprovalStepUp(
    await loadBackgroundAccountSecuritySummary(),
  );

  if (stepUp.errors.length) {
    return privateJson({ error: stepUp.errors.join(" ") }, 403);
  }

  const { id } = await params;
  const { data: introRequest, error: requestError } = await supabase
    .from("background_intro_packets")
    .select(
      "id, requester_profile_id, counterparty_profile_id, match_id, review_state, requester_contact_approved_at, counterparty_contact_approved_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (requestError || !introRequest) {
    return privateJson({ error: requestError?.message ?? "Intro request was not found." }, 404);
  }

  const isRequester = introRequest.requester_profile_id === user.id;
  const isCounterparty = introRequest.counterparty_profile_id === user.id;

  if (!isRequester && !isCounterparty) {
    return privateJson({ error: "You can only approve contact for your own intro requests." }, 403);
  }

  if (!isBackgroundIntroContactApprovalAllowed(introRequest.review_state)) {
    return privateJson(
      {
        error:
          "Contact approval is available only after the intro request is reviewer-approved.",
      },
      409,
    );
  }

  const now = new Date().toISOString();
  const requesterApprovedAt =
    isRequester && !introRequest.requester_contact_approved_at
      ? now
      : introRequest.requester_contact_approved_at;
  const counterpartyApprovedAt =
    isCounterparty && !introRequest.counterparty_contact_approved_at
      ? now
      : introRequest.counterparty_contact_approved_at;
  const contactApprovalStatus = summarizeBackgroundIntroContactApprovalStatus({
    counterpartyApprovedAt,
    requesterApprovedAt,
  });
  const { error: updateError } = await supabase
    .from("background_intro_packets")
    .update({
      contact_approval_status: contactApprovalStatus,
      counterparty_contact_approved_at: counterpartyApprovedAt,
      requester_contact_approved_at: requesterApprovedAt,
      review_state: contactApprovalStatus === "mutual_approved" ? "sent" : introRequest.review_state,
      updated_at: now,
    })
    .eq("id", introRequest.id);

  if (updateError) {
    return privateJson({ error: updateError.message }, 500);
  }

  try {
    const serviceClient = createServiceClient();
    await serviceClient.from("match_audit_events").insert({
      actor_profile_id: user.id,
      event_type: "intro_request_contact_approved",
      match_id: introRequest.match_id,
      metadata: {
        contactApprovalStatus,
        introRequestId: introRequest.id,
        participantRole: isRequester ? "requester" : "counterparty",
      },
      summary:
        "Participant approved introduced-stage contact disclosure after MFA; the API returned no contact details.",
    });
  } catch {
    // Service-role audit is best effort; the approval state is still durable.
  }

  return privateJson({
    contactApprovalStatus,
    contactDetailsReturned: false,
    introRequestId: introRequest.id,
    rollout: serializeBackgroundNetworkingRolloutSurface("background_opportunity_briefs_enabled"),
    stateMutation: "intro_request_contact_approval_recorded",
  });
}
