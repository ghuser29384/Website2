"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import {
  FEED_CREATE_IMPORTED_FIELDS,
  feedCreateReturnTo,
  isValidFeedCreateRequest,
  type FeedCreateRequest,
} from "@/lib/feed-create/phase1";
import { createClient } from "@/lib/supabase/server";
import { validateTradeCalendarDates } from "@/lib/trade-draft-standards";

const MAX_TERM_LENGTH = 5_000;

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checkbox(formData: FormData, key: string) {
  return ["true", "on", "1", "yes"].includes(read(formData, key).toLowerCase());
}

function optionalDate(formData: FormData, key: string) {
  const value = read(formData, key);
  return value || null;
}

function unresolved(value: string) {
  return value.includes("[Replace:");
}

function redirectTarget(path: string, key: "error" | "message", message: string) {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  return `${target.pathname}${target.search}${target.hash}`;
}

export async function saveFeedCreateOfferAction(formData: FormData) {
  const request: FeedCreateRequest = {
    opportunityType: read(formData, "source_opportunity_type") as "offer",
    opportunityId: read(formData, "source_opportunity_id"),
    exposureRequestId: read(formData, "exposure_request_id"),
    sourceRevision: Number(read(formData, "source_terms_version")),
  };
  const returnTo = isValidFeedCreateRequest(request)
    ? feedCreateReturnTo(request)
    : "/feed";
  const viewer = await requireViewer(returnTo);

  let destination = returnTo;
  let responseKey: "error" | "message" = "error";
  let responseMessage = "The Feed-derived proposal could not be saved.";

  try {
    if (!isValidFeedCreateRequest(request)) {
      throw new Error("The Feed source identifiers are invalid. No draft was created.");
    }

    const intent = read(formData, "intent") === "submit" ? "submit" : "draft";
    const submissionKey = read(formData, "submission_key");
    if (!/^[A-Za-z0-9:_-]{8,120}$/.test(submissionKey)) {
      throw new Error("The private draft key is invalid. Reload the source and try again.");
    }

    const terms = {
      offeredCause: read(formData, "offered_cause"),
      requestedCause: read(formData, "requested_cause"),
      proposedAction: read(formData, "proposed_action"),
      requestedAction: read(formData, "requested_action"),
      noTradeBaseline: read(formData, "no_trade_baseline"),
      duration: read(formData, "duration"),
      startDate: optionalDate(formData, "start_date"),
      evidenceDueDate: optionalDate(formData, "evidence_due_date"),
      evidenceRule: read(formData, "evidence_rule"),
      maximumBurden: read(formData, "maximum_burden"),
      privacyScope: read(formData, "privacy_scope"),
      exitConditions: read(formData, "exit_conditions"),
      notes: read(formData, "notes"),
    };
    const required: Array<[string, string]> = [
      ["Priority you advance", terms.offeredCause],
      ["Priority you want advanced", terms.requestedCause],
      ["Your commitment", terms.proposedAction],
      ["Counterparty commitment", terms.requestedAction],
      ["No-trade baseline", terms.noTradeBaseline],
      ["Duration", terms.duration],
      ["Evidence", terms.evidenceRule],
      ["Commitment limit", terms.maximumBurden],
      ["Privacy scope", terms.privacyScope],
      ["Exit conditions", terms.exitConditions],
    ];
    const missing = required.filter(([, value]) => !value).map(([label]) => label);
    if (missing.length) throw new Error(`Complete these fields: ${missing.join(", ")}.`);
    const templatePrompts = required
      .filter(([, value]) => unresolved(value))
      .map(([label]) => label);
    if (templatePrompts.length) {
      throw new Error(`Replace the template prompts in: ${templatePrompts.join(", ")}.`);
    }
    for (const [label, value] of [...required, ["Context", terms.notes] as [string, string]]) {
      if (value.length > MAX_TERM_LENGTH) throw new Error(`${label} is too long.`);
    }
    if (terms.offeredCause.length > 180 || terms.requestedCause.length > 180) {
      throw new Error("Priority labels must be 180 characters or fewer.");
    }

    const dateError = validateTradeCalendarDates({
      startDate: terms.startDate,
      evidenceDueDate: terms.evidenceDueDate,
      timeZone: read(formData, "client_time_zone"),
    });
    if (dateError) throw new Error(dateError);
    if (intent === "submit" && !checkbox(formData, "voluntary_certification")) {
      throw new Error("Confirm that the proposal is voluntary and contains no threat or retaliation.");
    }

    const importedReviews = Object.fromEntries(
      FEED_CREATE_IMPORTED_FIELDS.map((key) => [key, checkbox(formData, `review_${key}`)]),
    );
    if (Object.values(importedReviews).some((value) => value !== true)) {
      throw new Error("Review every imported material field before saving.");
    }

    const supabase = (await createClient()) as any;
    const { data, error } = await supabase.rpc("moral_trade_feed_create_save_authenticated", {
      p_expected_actor_id: viewer.authUser.id,
      p_intent: intent,
      p_submission_key: submissionKey,
      p_source_opportunity_type: request.opportunityType,
      p_source_opportunity_id: request.opportunityId,
      p_exposure_request_id: request.exposureRequestId,
      p_source_terms_version: request.sourceRevision,
      p_imported_field_reviews: importedReviews,
      p_duplicate_acknowledged: checkbox(formData, "duplicate_acknowledged"),
      p_offered_cause: terms.offeredCause,
      p_requested_cause: terms.requestedCause,
      p_proposed_action: terms.proposedAction,
      p_requested_action: terms.requestedAction,
      p_no_trade_baseline: terms.noTradeBaseline,
      p_duration: terms.duration,
      p_start_date: terms.startDate,
      p_evidence_due_date: terms.evidenceDueDate,
      p_evidence_rule: terms.evidenceRule,
      p_maximum_burden: terms.maximumBurden,
      p_privacy_scope: terms.privacyScope,
      p_exit_conditions: terms.exitConditions,
      p_notes: terms.notes,
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { derived_offer_id?: string; workflow_status?: string }
      | null;
    if (!row?.derived_offer_id) {
      throw new Error("The source-bound draft did not return a durable offer identifier.");
    }

    destination = `/trades/${encodeURIComponent(row.derived_offer_id)}/manage`;
    responseKey = "message";
    responseMessage =
      intent === "submit"
        ? "Source-bound counteroffer submitted for operator review. It has not been delivered and is not publishable in Phase 1."
        : "Private source-bound counteroffer saved. It has not been delivered and creates no obligation.";
    revalidatePath(destination);
    revalidatePath("/feed");
  } catch (error) {
    responseMessage =
      error instanceof Error ? error.message : "The Feed-derived proposal could not be saved.";
  }

  redirect(redirectTarget(destination, responseKey, responseMessage));
}
