"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createServiceClient } from "@/lib/supabase/server";

const WORKSPACE_PATH = "/donation-offsets/payments";
const MUTATION_BLOCKING_BATCH_STATUSES = new Set([
  "charging",
  "charged",
  "transferring",
  "transferred",
  "refunding",
  "disputed",
]);

function readRequired(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function redirectWithMessage(key: "error" | "message", message: string): never {
  const query = new URLSearchParams({ [key]: message });
  redirect(`${WORKSPACE_PATH}?${query.toString()}`);
}

function redirectToMatchStage(
  matchId: string,
  stage: "choose" | "review" | "complete",
  key: "error" | "message",
  message: string,
): never {
  const query = new URLSearchParams({ match: matchId, stage, [key]: message });
  redirect(`${WORKSPACE_PATH}?${query.toString()}`);
}

function participantRoleForMatch(match: Record<string, any>, profileId: string) {
  if (String(match.owner_profile_id) === profileId) return "owner" as const;
  if (String(match.counterparty_profile_id) === profileId) return "counterparty" as const;
  return null;
}

export async function updateDonationRedirectPlanAction(formData: FormData) {
  const matchId = readRequired(formData, "match_id");
  const registeredCharityId =
    readRequired(formData, "registered_charity_id") ||
    readRequired(formData, "redirect_destination_id");
  if (!isUuid(matchId) || !registeredCharityId) {
    redirectWithMessage("error", "Choose a valid donation redirect and try again.");
  }

  const viewer = await requireViewer(WORKSPACE_PATH);
  const profileId = viewer.authUser.id;
  const supabase = createServiceClient() as any;

  const [{ data: match, error: matchError }, { data: charity, error: charityError }] =
    await Promise.all([
      supabase.from("donation_offset_matches").select("*").eq("id", matchId).maybeSingle(),
      supabase
        .from("registered_charities")
        .select("id, name, is_active, selectable, is_political_campaign")
        .eq("id", registeredCharityId)
        .maybeSingle(),
    ]);

  if (matchError || !match) {
    redirectWithMessage("error", matchError?.message ?? "Donation-offset match not found.");
  }
  const participantRole = participantRoleForMatch(match, profileId);
  if (!participantRole) {
    redirectWithMessage("error", "Only a participant can change this redirect plan.");
  }
  if (String(match.status) !== "matched") {
    redirectWithMessage(
      "error",
      "A redirect destination can only change before the matched offset is settled.",
    );
  }
  if (
    charityError ||
    !charity ||
    !charity.is_active ||
    !charity.selectable ||
    charity.is_political_campaign
  ) {
    redirectWithMessage(
      "error",
      charityError?.message ?? "That organization is not an eligible redirect destination.",
    );
  }

  const { data: batches, error: batchesError } = await supabase
    .from("conditional_settlement_batches")
    .select("id, status, livemode")
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", matchId)
    .order("created_at", { ascending: false });
  if (batchesError) {
    redirectWithMessage("error", `Unable to verify settlement state: ${batchesError.message}`);
  }
  if (
    ((batches ?? []) as Array<Record<string, any>>).some((batch) => {
      if (!batch.livemode && String(batch.status) === "transferred") return false;
      return MUTATION_BLOCKING_BATCH_STATUSES.has(String(batch.status));
    })
  ) {
    redirectWithMessage(
      "error",
      "This redirect is already charging, transferred, or under review and can no longer change.",
    );
  }

  const { data: existingPlan, error: planReadError } = await supabase
    .from("donation_offset_redirect_plans")
    .select("*")
    .eq("match_id", matchId)
    .eq("participant_role", participantRole)
    .maybeSingle();
  if (planReadError) {
    redirectWithMessage("error", `Unable to read your redirect plan: ${planReadError.message}`);
  }

  if (existingPlan?.registered_charity_id === registeredCharityId) {
    redirectToMatchStage(
      matchId,
      "review",
      "message",
      `Your redirect is already set to ${charity.name}.`,
    );
  }

  const nextVersion = Number(existingPlan?.plan_version ?? 0) + 1;
  const { error: planWriteError } = existingPlan
    ? await supabase
        .from("donation_offset_redirect_plans")
        .update({
          registered_charity_id: registeredCharityId,
          plan_version: nextVersion,
        })
        .eq("match_id", matchId)
        .eq("participant_role", participantRole)
        .eq("participant_profile_id", profileId)
    : await supabase.from("donation_offset_redirect_plans").insert({
        match_id: matchId,
        participant_role: participantRole,
        participant_profile_id: profileId,
        registered_charity_id: registeredCharityId,
        plan_version: nextVersion,
      });

  if (planWriteError) {
    redirectWithMessage("error", `Unable to save your redirect plan: ${planWriteError.message}`);
  }

  const now = new Date().toISOString();
  const { error: mandateCancelError } = await supabase
    .from("conditional_payment_mandates")
    .update({
      status: "cancelled",
      cancelled_at: now,
      failure_code: "redirect_plan_changed",
      failure_message: "The participant changed a redirect destination; fresh consent is required.",
    })
    .eq("purpose", "donation_offset")
    .eq("subject_type", "donation_offset_match")
    .eq("subject_id", matchId)
    .in("status", ["setup_pending", "ready", "requires_action", "failed"]);
  if (mandateCancelError) {
    console.error("[donation-redirect] stale mandate cancellation failed", {
      matchId,
      message: mandateCancelError.message,
    });
  }

  const pendingBatchIds = ((batches ?? []) as Array<Record<string, any>>)
    .filter((batch) =>
      ["pending_authorizations", "ready", "requires_action", "failed"].includes(
        String(batch.status),
      ),
    )
    .map((batch) => String(batch.id));
  if (pendingBatchIds.length) {
    const { error: cancelBatchError } = await supabase
      .from("conditional_settlement_batches")
      .update({
        status: "cancelled",
        failure_code: "redirect_plan_changed",
        failure_message: "A participant changed a redirect destination.",
      })
      .in("id", pendingBatchIds);
    if (cancelBatchError) {
      console.error("[donation-redirect] stale batch cancellation failed", {
        matchId,
        message: cancelBatchError.message,
      });
    }
  }

  await supabase.from("conditional_payment_audit_events").insert({
    actor_profile_id: profileId,
    actor_kind: "participant",
    event_type: "donation_redirect_plan_changed",
    object_type: "donation_offset_match",
    object_id: matchId,
    details: {
      participantRole,
      registeredCharityId,
      planVersion: nextVersion,
    },
  });

  revalidatePath(WORKSPACE_PATH);
  redirectToMatchStage(
    matchId,
    "review",
    "message",
    `Redirect saved to ${charity.name}. Both impact estimates were refreshed; any prior payment authorization was retired.`,
  );
}

export async function publishDonationRedirectReceiptAction(formData: FormData) {
  const batchId = readRequired(formData, "batch_id");
  if (!isUuid(batchId)) {
    redirectWithMessage("error", "A valid completed receipt is required.");
  }

  const viewer = await requireViewer(WORKSPACE_PATH);
  const profileId = viewer.authUser.id;
  const supabase = createServiceClient() as any;
  const { data: batch, error: batchError } = await supabase
    .from("conditional_settlement_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();
  if (batchError || !batch) {
    redirectWithMessage("error", batchError?.message ?? "Completed receipt not found.");
  }
  const { data: match, error: matchError } = await supabase
    .from("donation_offset_matches")
    .select("owner_profile_id, counterparty_profile_id")
    .eq("id", String(batch.subject_id))
    .maybeSingle();
  if (matchError || !match || !participantRoleForMatch(match, profileId)) {
    redirectWithMessage(
      "error",
      matchError?.message ?? "Only a participant can publish this receipt.",
    );
  }

  if (
    batch.purpose !== "donation_offset" ||
    batch.subject_type !== "donation_offset_match" ||
    !batch.livemode ||
    batch.status !== "transferred" ||
    batch.condition_snapshot?.schemaVersion !== "donation-offset-payment-condition-v2"
  ) {
    redirectWithMessage(
      "error",
      "Only a verified, live, transferred Donation Redirect can be shared publicly.",
    );
  }

  const { error: publishError } = await supabase
    .from("conditional_settlement_batches")
    .update({
      public_receipt_enabled: true,
      public_receipt_enabled_by: profileId,
    })
    .eq("id", batchId)
    .eq("status", "transferred")
    .eq("livemode", true);
  if (publishError) {
    redirectWithMessage("error", `Unable to publish the receipt: ${publishError.message}`);
  }

  revalidatePath(WORKSPACE_PATH);
  revalidatePath(`/redirects/${batch.public_receipt_token}`);
  redirectWithMessage(
    "message",
    "Private political destinations remain hidden. The completed impact receipt is now shareable.",
  );
}

export async function unpublishDonationRedirectReceiptAction(formData: FormData) {
  const batchId = readRequired(formData, "batch_id");
  if (!isUuid(batchId)) {
    redirectWithMessage("error", "A valid receipt is required.");
  }

  const viewer = await requireViewer(WORKSPACE_PATH);
  const profileId = viewer.authUser.id;
  const supabase = createServiceClient() as any;
  const { data: batch, error: batchError } = await supabase
    .from("conditional_settlement_batches")
    .select("id, subject_id, public_receipt_token")
    .eq("id", batchId)
    .eq("purpose", "donation_offset")
    .maybeSingle();
  if (batchError || !batch) {
    redirectWithMessage("error", batchError?.message ?? "Receipt not found.");
  }
  const { data: match } = await supabase
    .from("donation_offset_matches")
    .select("owner_profile_id, counterparty_profile_id")
    .eq("id", String(batch.subject_id))
    .maybeSingle();
  if (!match || !participantRoleForMatch(match, profileId)) {
    redirectWithMessage("error", "Only a participant can make this receipt private.");
  }

  const { error: unpublishError } = await supabase
    .from("conditional_settlement_batches")
    .update({ public_receipt_enabled: false })
    .eq("id", batchId);
  if (unpublishError) {
    redirectWithMessage("error", `Unable to make the receipt private: ${unpublishError.message}`);
  }

  revalidatePath(WORKSPACE_PATH);
  revalidatePath(`/redirects/${batch.public_receipt_token}`);
  redirectWithMessage("message", "The public receipt link has been disabled.");
}
