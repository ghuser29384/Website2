import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import { stableWitnessHash } from "@/lib/moral-trade/guest-witness-testimony";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REVIEW_DECISIONS = {
  accept: {
    acceptedForAdditionality: true,
    acceptedForCredibilityUpdate: true,
    assessmentStatus: "accepted",
    testimonialStatus: "accepted",
  },
  partial: {
    acceptedForAdditionality: true,
    acceptedForCredibilityUpdate: false,
    assessmentStatus: "accepted",
    testimonialStatus: "partially_accepted",
  },
  reject: {
    acceptedForAdditionality: false,
    acceptedForCredibilityUpdate: false,
    assessmentStatus: "rejected",
    testimonialStatus: "rejected",
  },
  needs_more_info: {
    acceptedForAdditionality: false,
    acceptedForCredibilityUpdate: false,
    assessmentStatus: "needs_more_info",
    testimonialStatus: "under_review",
  },
  dispute: {
    acceptedForAdditionality: false,
    acceptedForCredibilityUpdate: false,
    assessmentStatus: "disputed",
    testimonialStatus: "disputed",
  },
} as const;

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

function redirectWithMessage(request: Request, returnTo: string, key: "message" | "error", text: string) {
  const fallback = new URL("/admin", request.url);
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
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "guest_witness_review_write");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited guest witness review requests fail closed without changing review state.",
    );
  }

  const payload = await parsePayload(request);
  const returnTo = stringField(payload, "return_to") || "/admin";

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonOrRedirect(
      request,
      { error: "supabase_unconfigured", ok: false },
      503,
      returnTo,
      "error",
      "Witness review is unavailable until Supabase service persistence is configured.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !isAdminEmail(user.email)) {
    return jsonOrRedirect(
      request,
      { error: "admin_authentication_required", ok: false },
      403,
      returnTo,
      "error",
      "Admin access is required to review witness testimony.",
    );
  }

  const testimonialId = stringField(payload, "testimonial_id");
  const assessmentId = stringField(payload, "assessment_id");
  const decisionKey = stringField(payload, "decision");
  const privateNotes = stringField(payload, "private_reviewer_notes");
  const publicSummary = stringField(payload, "participant_visible_summary");
  const decision = REVIEW_DECISIONS[decisionKey as keyof typeof REVIEW_DECISIONS];

  if (!testimonialId || !assessmentId || !decision) {
    return jsonOrRedirect(
      request,
      { error: "invalid_review_request", ok: false },
      400,
      returnTo,
      "error",
      "Choose a valid witness review decision.",
    );
  }

  const service = createServiceClient();
  const [testimonialResult, assessmentResult] = await Promise.all([
    service
      .from("baseline_witness_testimonials")
      .update({
        participant_visible_summary: publicSummary || null,
        private_reviewer_notes_ref: privateNotes
          ? stableWitnessHash(privateNotes, "baseline-witness-reviewer-notes")
          : null,
        reviewer_user_id: user.id,
        testimonial_status: decision.testimonialStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", testimonialId)
      .select("*")
      .single(),
    service
      .from("baseline_witness_quality_assessments")
      .update({
        accepted_for_additionality: decision.acceptedForAdditionality,
        accepted_for_credibility_update: decision.acceptedForCredibilityUpdate,
        private_notes_ref: privateNotes
          ? stableWitnessHash(privateNotes, "baseline-witness-reviewer-notes")
          : null,
        review_status: decision.assessmentStatus,
        reviewer_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assessmentId)
      .eq("baseline_witness_testimonial_id", testimonialId)
      .select("*")
      .single(),
  ]);

  if (testimonialResult.error || assessmentResult.error) {
    return jsonOrRedirect(
      request,
      {
        error: testimonialResult.error?.message ?? assessmentResult.error?.message,
        ok: false,
      },
      500,
      returnTo,
      "error",
      "Unable to update the witness review decision.",
    );
  }

  await service.from("baseline_witness_audit_events").insert({
    actor_id_hash: stableWitnessHash(user.id, "baseline-witness-reviewer"),
    actor_kind: "reviewer",
    baseline_witness_quality_assessment_id: assessmentId,
    baseline_witness_testimonial_id: testimonialId,
    event_payload_redacted: {
      acceptedForAdditionality: decision.acceptedForAdditionality,
      acceptedForCredibilityUpdate: decision.acceptedForCredibilityUpdate,
      decision: decisionKey,
      privateFieldsSuppressed: true,
      reviewerNotesStoredAsRef: Boolean(privateNotes),
    },
    event_type: "review_decision",
    invite_id: testimonialResult.data.invite_id,
    private_ref_hash: privateNotes
      ? stableWitnessHash(privateNotes, "baseline-witness-reviewer-notes")
      : null,
    redacted_summary: "Reviewer recorded a baseline witness testimony decision.",
  });

  return jsonOrRedirect(
    request,
    {
      blockers: [],
      ok: true,
      privateFieldsSuppressed: true,
      reviewStatus: assessmentResult.data.review_status,
      testimonialStatus: testimonialResult.data.testimonial_status,
    },
    200,
    returnTo,
    "message",
    "Witness review decision saved.",
  );
}
