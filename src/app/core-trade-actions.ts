"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 4_000;
const MAX_TERM_LENGTH = 5_000;
const EVIDENCE_BUCKET = "trade-evidence";

function revalidatePublicEvidence(agreementId: string) {
  revalidatePath("/evidence");
  revalidatePath(`/evidence/${agreementId}`);
}

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptional(formData: FormData, key: string) {
  const value = read(formData, key);
  return value || null;
}

function readCheckbox(formData: FormData, key: string) {
  const value = read(formData, key).toLowerCase();
  return value === "on" || value === "true" || value === "1" || value === "yes";
}

function safeInternalPath(value: string | null | undefined, fallback: string) {
  const path = value?.trim() ?? "";
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

const CORE_REDIRECT_MARKER = "__CORE_TRADE_REDIRECT__:";

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  if (message.startsWith(CORE_REDIRECT_MARKER)) {
    const encoded = message.slice(CORE_REDIRECT_MARKER.length);
    const payload = JSON.parse(decodeURIComponent(encoded)) as {
      path: string;
      key: "error" | "message";
      message: string;
    };
    const target = new URL(payload.path, "https://www.moraltrade.org");
    target.searchParams.set(payload.key, payload.message);
    redirect(`${target.pathname}${target.search}${target.hash}`);
  }

  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);

  try {
    redirect(`${target.pathname}${target.search}${target.hash}`);
  } catch (error) {
    if (
      error instanceof Error &&
      typeof (error as Error & { digest?: unknown }).digest === "string" &&
      String((error as Error & { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      error.message = `${CORE_REDIRECT_MARKER}${encodeURIComponent(
        JSON.stringify({ path, key, message }),
      )}`;
    }
    throw error;
  }
}

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildFingerprint(values: string[]) {
  return createHash("sha256").update(values.map(normalized).join("\u241f")).digest("hex");
}

function buildTermsHash(terms: CoreTerms) {
  return buildFingerprint([
    terms.proposedAction,
    terms.requestedAction,
    terms.duration,
    terms.startDate ?? "",
    terms.evidenceRule,
    terms.evidenceDueDate ?? "",
    terms.exitConditions,
    terms.maximumBurden,
    terms.privacyScope,
    terms.noTradeBaseline,
  ]);
}

interface CoreTerms {
  proposedAction: string;
  requestedAction: string;
  duration: string;
  startDate: string | null;
  evidenceRule: string;
  evidenceDueDate: string | null;
  exitConditions: string;
  maximumBurden: string;
  privacyScope: string;
  noTradeBaseline: string;
}

function readTerms(formData: FormData): CoreTerms {
  const terms = {
    proposedAction: read(formData, "proposed_action"),
    requestedAction: read(formData, "requested_action"),
    duration: read(formData, "duration"),
    startDate: readOptional(formData, "start_date"),
    evidenceRule: read(formData, "evidence_rule"),
    evidenceDueDate: readOptional(formData, "evidence_due_date"),
    exitConditions: read(formData, "exit_conditions"),
    maximumBurden: read(formData, "maximum_burden"),
    privacyScope: read(formData, "privacy_scope") || "Participants and operator only",
    noTradeBaseline: read(formData, "no_trade_baseline"),
  } satisfies CoreTerms;

  const required = [
    ["Your commitment", terms.proposedAction],
    ["Requested commitment", terms.requestedAction],
    ["Duration", terms.duration],
    ["Evidence rule", terms.evidenceRule],
    ["Exit conditions", terms.exitConditions],
    ["Maximum burden", terms.maximumBurden],
    ["Privacy scope", terms.privacyScope],
    ["No-trade baseline", terms.noTradeBaseline],
  ] as const;

  const missing = required.filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) {
    throw new Error(`Complete these fields: ${missing.join(", ")}.`);
  }

  for (const [label, value] of required) {
    if (value.length > MAX_TERM_LENGTH) {
      throw new Error(`${label} is too long.`);
    }
  }

  if (terms.startDate && Number.isNaN(Date.parse(terms.startDate))) {
    throw new Error("Start date is invalid.");
  }
  if (terms.evidenceDueDate && Number.isNaN(Date.parse(terms.evidenceDueDate))) {
    throw new Error("Evidence due date is invalid.");
  }

  return terms;
}

async function recordCoreEvent({
  entityId,
  entityType,
  eventType,
  metadata = {},
  profileId,
}: {
  entityId?: string | null;
  entityType?: string;
  eventType:
    | "offer_draft_saved"
    | "offer_submitted"
    | "offer_published"
    | "invitation_sent"
    | "response_sent"
    | "counterproposal_sent"
    | "agreement_confirmed_by_both"
    | "evidence_submitted"
    | "agreement_completed";
  metadata?: Record<string, unknown>;
  profileId: string;
}) {
  const supabase = createServiceClient() as any;
  const idempotencyKey = `${eventType}:${profileId}:${entityType ?? ""}:${entityId ?? ""}`;
  await supabase.from("core_loop_events").upsert(
    {
      profile_id: profileId,
      event_type: eventType,
      entity_type: entityType ?? "",
      entity_id: entityId ?? null,
      idempotency_key: idempotencyKey,
      metadata,
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );
}

async function queuePrivateNotification({
  body,
  dedupeKey,
  href,
  title,
  type,
  userId,
}: {
  body: string;
  dedupeKey: string;
  href: string;
  title: string;
  type: string;
  userId: string;
}) {
  const supabase = createServiceClient() as any;
  const { data: inserted, error } = await supabase
    .from("trade_notifications")
    .insert({
      user_id: userId,
      notification_type: type,
      title,
      body,
      href,
      dedupe_key: dedupeKey,
    })
    .select("id")
    .maybeSingle();

  if (error || !inserted?.id) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const email = String(profile?.email ?? "").trim();
  if (!email) return;

  const absoluteUrl = new URL(href, getSiteUrl()).toString();
  await supabase.from("email_outbox").insert({
    profile_id: userId,
    recipient_email: email,
    subject: `Moral Trade: ${title}`.slice(0, 160),
    body: `A private Moral Trade update is ready. Sign in at ${absoluteUrl} to review it. This email does not include private terms, contact details, payment information, or evidence.`,
    status: "queued",
    provider: "core_trade",
  });
}

async function getThreadParticipant(threadId: string, userId: string) {
  const supabase = createServiceClient() as any;
  const { data: thread } = await supabase
    .from("trade_threads")
    .select("*")
    .eq("id", threadId)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .maybeSingle();
  if (!thread) throw new Error("Thread not found or access denied.");
  return {
    thread,
    counterpartId:
      String(thread.participant_a) === userId
        ? String(thread.participant_b)
        : String(thread.participant_a),
  };
}

async function insertSystemMessage(threadId: string, body: string, metadata: Record<string, unknown> = {}) {
  const supabase = createServiceClient() as any;
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("trade_messages").insert({
      thread_id: threadId,
      sender_id: null,
      message_type: "system",
      body,
      metadata,
    }),
    supabase
      .from("trade_threads")
      .update({ last_message_at: now, updated_at: now })
      .eq("id", threadId),
  ]);
}

async function requireCoreAdmin(returnTo: string) {
  const viewer = await requireViewer(returnTo);
  const mfaSummary = await loadBackgroundAccountSecuritySummary();
  const decision = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary,
  });
  if (!decision.allowed) {
    redirectWithMessage("/dashboard", "error", decision.message);
  }
  return viewer;
}

function proposalRow(terms: CoreTerms, extra: Record<string, unknown>) {
  return {
    ...extra,
    proposed_action: terms.proposedAction,
    requested_action: terms.requestedAction,
    duration: terms.duration,
    start_date: terms.startDate,
    evidence_rule: terms.evidenceRule,
    evidence_due_date: terms.evidenceDueDate,
    exit_conditions: terms.exitConditions,
    maximum_burden: terms.maximumBurden,
    privacy_scope: terms.privacyScope,
    no_trade_baseline: terms.noTradeBaseline,
    terms_hash: buildTermsHash(terms),
  };
}

function offerTerms(offer: Record<string, any>): CoreTerms {
  return {
    proposedAction: String(offer.offer_action ?? ""),
    requestedAction: String(offer.request_action ?? ""),
    duration: String(offer.duration ?? ""),
    startDate: offer.start_date ? String(offer.start_date) : null,
    evidenceRule: String(offer.verification ?? ""),
    evidenceDueDate: offer.evidence_due_date ? String(offer.evidence_due_date) : null,
    exitConditions: String(offer.exit_conditions ?? ""),
    maximumBurden: String(offer.maximum_burden ?? ""),
    privacyScope: String(offer.privacy_scope ?? "Participants and operator only"),
    noTradeBaseline: String(offer.no_trade_baseline ?? ""),
  };
}

export async function saveCoreOfferAction(formData: FormData) {
  const viewer = await requireViewer("/trades/new");
  const supabase = createServiceClient() as any;
  const intent = read(formData, "intent") === "submit" ? "submit" : "draft";
  const submissionKey = read(formData, "submission_key") || randomUUID();
  const offeredCause = read(formData, "offered_cause");
  const requestedCause = read(formData, "requested_cause");
  const notes = read(formData, "notes").slice(0, MAX_TERM_LENGTH);

  try {
    if (!offeredCause || !requestedCause) {
      throw new Error("Name both the priority you are offering and the priority you are requesting.");
    }
    if (offeredCause.length > 180 || requestedCause.length > 180) {
      throw new Error("Priority labels must be 180 characters or fewer.");
    }
    const terms = readTerms(formData);
    if (intent === "submit" && !readCheckbox(formData, "voluntary_certification")) {
      throw new Error("Confirm that the proposal is voluntary and contains no threat or retaliation.");
    }
    if (intent === "submit" && !readCheckbox(formData, "public_evidence_certification")) {
      throw new Error(
        "Confirm that agreement evidence will be public by default and that only public-safe copies will be submitted.",
      );
    }

    const fingerprint = buildFingerprint([
      offeredCause,
      requestedCause,
      ...Object.values(terms).map((value) => value ?? ""),
    ]);

    const { data: idempotent } = await supabase
      .from("offers")
      .select("id")
      .eq("owner_id", viewer.authUser.id)
      .eq("submission_key", submissionKey)
      .maybeSingle();
    if (idempotent?.id) {
      redirectWithMessage(
        `/trades/${idempotent.id}/manage`,
        "message",
        "This submission was already saved. The existing draft is shown below.",
      );
    }

    const { data: duplicate } = await supabase
      .from("offers")
      .select("id")
      .eq("owner_id", viewer.authUser.id)
      .eq("fingerprint", fingerprint)
      .not("workflow_status", "in", "(closed,deleted)")
      .maybeSingle();
    if (duplicate?.id) {
      await supabase.from("trade_review_events").insert({
        offer_id: duplicate.id,
        reviewer_id: null,
        action: "duplicate_flagged",
        reason: "A repeat form submission matched the active offer fingerprint.",
      });
      redirectWithMessage(
        `/trades/${duplicate.id}/manage`,
        "error",
        "An identical active draft already exists. No duplicate was created.",
      );
    }

    const now = new Date().toISOString();
    const workflowStatus = intent === "submit" ? "pending_review" : "draft";
    const { data: inserted, error } = await supabase
      .from("offers")
      .insert({
        owner_id: viewer.authUser.id,
        owner_alias: viewer.displayName,
        mode: "pledge",
        offered_cause: offeredCause,
        requested_cause: requestedCause,
        offer_action: terms.proposedAction,
        request_action: terms.requestedAction,
        compromise_cause: "Not needed",
        offer_impact: 5,
        min_counterparty_impact: 5,
        verification: terms.evidenceRule,
        duration: terms.duration,
        trust_level: 1,
        notes,
        discount_note: "",
        status: "paused",
        payment_interval_value: null,
        payment_interval_unit: null,
        workflow_status: workflowStatus,
        moderation_reason: "",
        submission_key: submissionKey,
        fingerprint,
        no_trade_baseline: terms.noTradeBaseline,
        start_date: terms.startDate,
        exit_conditions: terms.exitConditions,
        maximum_burden: terms.maximumBurden,
        privacy_scope: terms.privacyScope,
        evidence_due_date: terms.evidenceDueDate,
        submitted_at: intent === "submit" ? now : null,
        terms_version: 1,
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      throw new Error(error?.message ?? "The draft could not be saved.");
    }

    await recordCoreEvent({
      profileId: viewer.authUser.id,
      eventType: "offer_draft_saved",
      entityType: "offer",
      entityId: inserted.id,
    });

    if (intent === "submit") {
      await Promise.all([
        recordCoreEvent({
          profileId: viewer.authUser.id,
          eventType: "offer_submitted",
          entityType: "offer",
          entityId: inserted.id,
        }),
        supabase.from("trade_review_events").insert({
          offer_id: inserted.id,
          reviewer_id: null,
          action: "submitted",
          reason: "Submitted by participant for operator review.",
        }),
      ]);
    }

    revalidatePath("/offers");
    redirectWithMessage(
      `/trades/${inserted.id}/manage`,
      "message",
      intent === "submit"
        ? "Proposal submitted once and placed in the operator review queue."
        : "Draft saved. It creates no obligation and is not public.",
    );
  } catch (error) {
    redirectWithMessage(
      "/trades/new",
      "error",
      error instanceof Error ? error.message : "The proposal could not be saved.",
    );
  }
}

export async function updateCoreOfferAction(formData: FormData) {
  const offerId = read(formData, "offer_id");
  const returnTo = safeInternalPath(read(formData, "return_to"), `/trades/${offerId}/manage`);
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: offer } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .eq("owner_id", viewer.authUser.id)
      .maybeSingle();
    if (!offer || offer.workflow_status === "deleted") throw new Error("Offer not found.");
    if (offer.workflow_status === "published") {
      throw new Error("Pause the published offer before changing its terms.");
    }

    const offeredCause = read(formData, "offered_cause");
    const requestedCause = read(formData, "requested_cause");
    const terms = readTerms(formData);
    const intent = read(formData, "intent") === "submit" ? "submit" : "draft";
    if (!offeredCause || !requestedCause) throw new Error("Both priority labels are required.");
    if (intent === "submit" && !readCheckbox(formData, "voluntary_certification")) {
      throw new Error("Confirm voluntary participation before resubmitting.");
    }

    const fingerprint = buildFingerprint([
      offeredCause,
      requestedCause,
      ...Object.values(terms).map((value) => value ?? ""),
    ]);
    const now = new Date().toISOString();
    const workflowStatus = intent === "submit" ? "pending_review" : "draft";
    const { error } = await supabase
      .from("offers")
      .update({
        offered_cause: offeredCause,
        requested_cause: requestedCause,
        offer_action: terms.proposedAction,
        request_action: terms.requestedAction,
        verification: terms.evidenceRule,
        duration: terms.duration,
        notes: read(formData, "notes").slice(0, MAX_TERM_LENGTH),
        workflow_status: workflowStatus,
        status: "paused",
        moderation_reason: intent === "submit" ? "" : offer.moderation_reason,
        fingerprint,
        no_trade_baseline: terms.noTradeBaseline,
        start_date: terms.startDate,
        exit_conditions: terms.exitConditions,
        maximum_burden: terms.maximumBurden,
        privacy_scope: terms.privacyScope,
        evidence_due_date: terms.evidenceDueDate,
        submitted_at: intent === "submit" ? now : offer.submitted_at,
        updated_at: now,
        terms_version: Number(offer.terms_version ?? 1) + 1,
      })
      .eq("id", offerId)
      .eq("owner_id", viewer.authUser.id);
    if (error) throw new Error(error.code === "23505" ? "An identical active draft already exists." : error.message);

    if (intent === "submit") {
      await Promise.all([
        recordCoreEvent({
          profileId: viewer.authUser.id,
          eventType: "offer_submitted",
          entityType: "offer",
          entityId: offerId,
        }),
        supabase.from("trade_review_events").insert({
          offer_id: offerId,
          reviewer_id: null,
          action: "submitted",
          reason: "Revised proposal submitted for operator review.",
        }),
      ]);
    }

    revalidatePath(returnTo);
    revalidatePath("/offers");
    redirectWithMessage(
      returnTo,
      "message",
      intent === "submit" ? "Revised proposal submitted for review." : "Draft changes saved.",
    );
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Update failed.");
  }
}

export async function changeCoreOfferStateAction(formData: FormData) {
  const offerId = read(formData, "offer_id");
  const requestedAction = read(formData, "lifecycle_action");
  const returnTo = safeInternalPath(read(formData, "return_to"), `/trades/${offerId}/manage`);
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: offer } = await supabase
      .from("offers")
      .select("id,owner_id,workflow_status")
      .eq("id", offerId)
      .eq("owner_id", viewer.authUser.id)
      .maybeSingle();
    if (!offer) throw new Error("Offer not found.");

    const now = new Date().toISOString();
    if (requestedAction === "pause") {
      await supabase
        .from("offers")
        .update({ workflow_status: "paused", status: "paused", updated_at: now })
        .eq("id", offerId);
      revalidatePath("/offers");
      redirectWithMessage(returnTo, "message", "Offer paused and removed from live discovery.");
    }

    if (requestedAction === "close") {
      await supabase
        .from("offers")
        .update({ workflow_status: "closed", status: "closed", closed_at: now, updated_at: now })
        .eq("id", offerId);
      revalidatePath("/offers");
      redirectWithMessage(returnTo, "message", "Offer permanently closed.");
    }

    if (requestedAction === "delete") {
      const { count: agreementCount } = await supabase
        .from("agreements")
        .select("id", { count: "exact", head: true })
        .eq("offer_id", offerId);
      if ((agreementCount ?? 0) > 0) {
        await supabase
          .from("offers")
          .update({ workflow_status: "deleted", status: "closed", deleted_at: now, updated_at: now })
          .eq("id", offerId);
      } else {
        const { error } = await supabase.from("offers").delete().eq("id", offerId);
        if (error) throw new Error(error.message);
      }
      revalidatePath("/offers");
      redirectWithMessage("/trades/new", "message", "Draft deleted.");
    }

    throw new Error("Unknown lifecycle action.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "State change failed.");
  }
}

export async function createTradeInvitationAction(formData: FormData) {
  const offerId = read(formData, "offer_id");
  const returnTo = `/trades/${offerId}/manage`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: offer } = await supabase
      .from("offers")
      .select("id,owner_id,workflow_status")
      .eq("id", offerId)
      .eq("owner_id", viewer.authUser.id)
      .maybeSingle();
    if (!offer) throw new Error("Offer not found.");
    if (offer.workflow_status !== "published") {
      throw new Error("Publish the proposal before inviting a counterparty.");
    }

    const recipientEmail = read(formData, "recipient_email").toLowerCase();
    const message = read(formData, "message").slice(0, MAX_MESSAGE_LENGTH);
    const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const status = recipientEmail ? "sent" : "drafted";
    const { data: recipient } = recipientEmail
      ? await supabase.from("profiles").select("id").ilike("email", recipientEmail).maybeSingle()
      : { data: null };

    const { data: invitation, error } = await supabase
      .from("trade_invitations")
      .insert({
        offer_id: offerId,
        sender_id: viewer.authUser.id,
        recipient_user_id: recipient?.id ?? null,
        recipient_email: recipientEmail,
        token,
        message,
        status,
      })
      .select("id")
      .single();
    if (error || !invitation?.id) throw new Error(error?.message ?? "Invitation could not be created.");

    const href = `/invitations/${token}`;
    if (recipient?.id) {
      await queuePrivateNotification({
        userId: recipient.id,
        type: "invitation_received",
        title: "Invitation received",
        body: "A participant invited you to review a bounded Moral Trade proposal.",
        href,
        dedupeKey: `invitation_received:${invitation.id}:${recipient.id}`,
      });
    } else if (recipientEmail) {
      const absoluteUrl = new URL(href, getSiteUrl()).toString();
      await supabase.from("email_outbox").insert({
        profile_id: null,
        recipient_email: recipientEmail,
        subject: "Moral Trade: invitation received",
        body: `A participant invited you to review a private Moral Trade proposal. Open ${absoluteUrl}. The email does not include proposal terms or evidence.`,
        status: "queued",
        provider: "core_trade",
      });
    }

    await recordCoreEvent({
      profileId: viewer.authUser.id,
      eventType: "invitation_sent",
      entityType: "invitation",
      entityId: invitation.id,
      metadata: { delivery: recipientEmail ? "email" : "share_link" },
    });

    revalidatePath(returnTo);
    redirectWithMessage(
      returnTo,
      "message",
      recipientEmail
        ? "Invitation queued for email delivery. The private link is also available below."
        : "Private invitation link created. Share it directly with the intended person.",
    );
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Invitation failed.");
  }
}

export async function revokeTradeInvitationAction(formData: FormData) {
  const invitationId = read(formData, "invitation_id");
  const offerId = read(formData, "offer_id");
  const returnTo = `/trades/${offerId}/manage`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  const { error } = await supabase
    .from("trade_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("sender_id", viewer.authUser.id)
    .eq("offer_id", offerId);
  if (error) redirectWithMessage(returnTo, "error", error.message);
  revalidatePath(returnTo);
  redirectWithMessage(returnTo, "message", "Invitation revoked.");
}

export async function respondToTradeInvitationAction(formData: FormData) {
  const token = read(formData, "token");
  const returnTo = `/invitations/${token}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  const decision = read(formData, "decision");

  try {
    const { data: invitation } = await supabase
      .from("trade_invitations")
      .select("*")
      .eq("token", token)
      .not("status", "in", "(revoked,declined)")
      .maybeSingle();
    if (!invitation) throw new Error("Invitation is unavailable or has been revoked.");
    if (String(invitation.sender_id) === viewer.authUser.id) {
      throw new Error("The sender cannot respond to their own invitation.");
    }

    if (decision === "decline") {
      await supabase
        .from("trade_invitations")
        .update({
          status: "declined",
          recipient_user_id: viewer.authUser.id,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);
      await queuePrivateNotification({
        userId: String(invitation.sender_id),
        type: "invitation_declined",
        title: "Invitation declined",
        body: "The invited participant declined the proposal. No obligation was created.",
        href: `/trades/${invitation.offer_id}/manage`,
        dedupeKey: `invitation_declined:${invitation.id}`,
      });
      redirectWithMessage("/offers", "message", "Invitation declined. No obligation was created.");
    }

    const { data: offer } = await supabase
      .from("offers")
      .select("*")
      .eq("id", invitation.offer_id)
      .maybeSingle();
    if (!offer || offer.workflow_status !== "published") {
      throw new Error("This proposal is no longer published.");
    }

    const message = read(formData, "message").slice(0, MAX_MESSAGE_LENGTH);
    const { data: interest, error: interestError } = await supabase
      .from("interests")
      .upsert(
        {
          offer_id: offer.id,
          user_id: viewer.authUser.id,
          interested_alias: viewer.displayName,
          message,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "offer_id,user_id" },
      )
      .select("id")
      .single();
    if (interestError || !interest?.id) throw new Error(interestError?.message ?? "Response could not be saved.");

    let { data: thread } = await supabase
      .from("trade_threads")
      .select("*")
      .eq("offer_id", offer.id)
      .or(
        `and(participant_a.eq.${offer.owner_id},participant_b.eq.${viewer.authUser.id}),and(participant_a.eq.${viewer.authUser.id},participant_b.eq.${offer.owner_id})`,
      )
      .neq("status", "closed")
      .maybeSingle();

    if (!thread) {
      const created = await supabase
        .from("trade_threads")
        .insert({
          offer_id: offer.id,
          invitation_id: invitation.id,
          participant_a: offer.owner_id,
          participant_b: viewer.authUser.id,
          status: "active",
        })
        .select("*")
        .single();
      if (created.error || !created.data) throw new Error(created.error?.message ?? "Thread could not be created.");
      thread = created.data;
    }

    const { data: existingProposal } = await supabase
      .from("trade_counterproposals")
      .select("id")
      .eq("thread_id", thread.id)
      .limit(1)
      .maybeSingle();
    if (!existingProposal) {
      await supabase.from("trade_counterproposals").insert(
        proposalRow(offerTerms(offer), {
          thread_id: thread.id,
          offer_id: offer.id,
          proposer_id: viewer.authUser.id,
          version: 1,
          status: "proposed",
        }),
      );
    }

    await Promise.all([
      supabase
        .from("trade_invitations")
        .update({
          status: "responded",
          recipient_user_id: viewer.authUser.id,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation.id),
      insertSystemMessage(
        thread.id,
        "The invited participant responded. Review the current terms before accepting or counterproposing.",
        { invitationId: invitation.id },
      ),
      recordCoreEvent({
        profileId: viewer.authUser.id,
        eventType: "response_sent",
        entityType: "interest",
        entityId: interest.id,
      }),
      queuePrivateNotification({
        userId: String(invitation.sender_id),
        type: "response_sent",
        title: "New response",
        body: "An invited participant responded to your proposal.",
        href: `/messages/${thread.id}`,
        dedupeKey: `response_sent:${interest.id}:${invitation.sender_id}`,
      }),
    ]);

    redirectWithMessage(`/messages/${thread.id}`, "message", "Response sent. Continue in the private thread.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Response failed.");
  }
}

export async function startSuggestedMatchAction(formData: FormData) {
  const offerId = read(formData, "offer_id");
  const candidateOfferId = read(formData, "candidate_offer_id");
  const returnTo = `/trades/${offerId}/manage`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const [{ data: offer }, { data: candidate }] = await Promise.all([
      supabase.from("offers").select("*").eq("id", offerId).eq("owner_id", viewer.authUser.id).maybeSingle(),
      supabase.from("offers").select("*").eq("id", candidateOfferId).eq("workflow_status", "published").maybeSingle(),
    ]);
    if (!offer || !candidate) throw new Error("Matching offer is unavailable.");
    if (String(candidate.owner_id) === viewer.authUser.id) throw new Error("You cannot match with yourself.");

    let { data: thread } = await supabase
      .from("trade_threads")
      .select("*")
      .eq("offer_id", offerId)
      .or(
        `and(participant_a.eq.${viewer.authUser.id},participant_b.eq.${candidate.owner_id}),and(participant_a.eq.${candidate.owner_id},participant_b.eq.${viewer.authUser.id})`,
      )
      .neq("status", "closed")
      .maybeSingle();
    if (!thread) {
      const created = await supabase
        .from("trade_threads")
        .insert({
          offer_id: offerId,
          participant_a: viewer.authUser.id,
          participant_b: candidate.owner_id,
          status: "active",
        })
        .select("*")
        .single();
      if (created.error || !created.data) throw new Error(created.error?.message ?? "Thread could not be created.");
      thread = created.data;
    }

    const { data: proposal } = await supabase
      .from("trade_counterproposals")
      .insert(
        proposalRow(offerTerms(offer), {
          thread_id: thread.id,
          offer_id: offerId,
          proposer_id: viewer.authUser.id,
          version: 1,
          status: "proposed",
        }),
      )
      .select("id")
      .maybeSingle();

    await Promise.all([
      insertSystemMessage(thread.id, "A reciprocal deterministic match opened this private thread."),
      queuePrivateNotification({
        userId: String(candidate.owner_id),
        type: "match_invitation",
        title: "Reciprocal match invitation",
        body: "A published proposal appears reciprocal to yours. Review it in a private thread.",
        href: `/messages/${thread.id}`,
        dedupeKey: `match_invitation:${thread.id}:${candidate.owner_id}`,
      }),
      recordCoreEvent({
        profileId: viewer.authUser.id,
        eventType: "invitation_sent",
        entityType: "thread",
        entityId: thread.id,
        metadata: { source: "deterministic_match", proposalId: proposal?.id ?? null },
      }),
    ]);

    redirectWithMessage(`/messages/${thread.id}`, "message", "Reciprocal match thread created.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Match failed.");
  }
}

export async function sendTradeMessageAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const body = read(formData, "body");
    if (!body) throw new Error("Write a message before sending.");
    if (body.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long.");
    const { thread, counterpartId } = await getThreadParticipant(threadId, viewer.authUser.id);
    const { data: block } = await supabase
      .from("trade_blocks")
      .select("id")
      .eq("thread_id", threadId)
      .limit(1)
      .maybeSingle();
    if (block || thread.status === "blocked") throw new Error("This thread is blocked.");

    const { data: message, error } = await supabase
      .from("trade_messages")
      .insert({ thread_id: threadId, sender_id: viewer.authUser.id, message_type: "user", body })
      .select("id,created_at")
      .single();
    if (error || !message) throw new Error(error?.message ?? "Message could not be sent.");

    await Promise.all([
      supabase
        .from("trade_threads")
        .update({ last_message_at: message.created_at, updated_at: message.created_at })
        .eq("id", threadId),
      queuePrivateNotification({
        userId: counterpartId,
        type: "new_message",
        title: "New private message",
        body: "A counterparty sent a message in your Moral Trade thread.",
        href: returnTo,
        dedupeKey: `new_message:${message.id}:${counterpartId}`,
      }),
    ]);

    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", "Message sent.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Message failed.");
  }
}

export async function blockTradeThreadAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  try {
    const { counterpartId } = await getThreadParticipant(threadId, viewer.authUser.id);
    await Promise.all([
      supabase.from("trade_blocks").upsert(
        {
          thread_id: threadId,
          blocker_id: viewer.authUser.id,
          blocked_id: counterpartId,
          reason: read(formData, "reason").slice(0, 1_000),
        },
        { onConflict: "thread_id,blocker_id,blocked_id" },
      ),
      supabase
        .from("trade_threads")
        .update({ status: "blocked", updated_at: new Date().toISOString() })
        .eq("id", threadId),
    ]);
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", "Thread blocked. No further private messages can be sent.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Block failed.");
  }
}

export async function reportTradeThreadAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  try {
    await getThreadParticipant(threadId, viewer.authUser.id);
    const reason = read(formData, "reason");
    if (!reason) throw new Error("Explain what the operator should review.");
    await supabase.from("trade_reports").insert({
      thread_id: threadId,
      message_id: readOptional(formData, "message_id"),
      reporter_id: viewer.authUser.id,
      reason: reason.slice(0, MAX_MESSAGE_LENGTH),
    });
    redirectWithMessage(returnTo, "message", "Report submitted to the operator queue.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Report failed.");
  }
}

export async function createCounterproposalAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { thread, counterpartId } = await getThreadParticipant(threadId, viewer.authUser.id);
    if (thread.agreement_id) throw new Error("Use the agreement amendment form after an agreement exists.");
    if (thread.status !== "active") throw new Error("This thread is not active.");
    const terms = readTerms(formData);
    const { data: latest } = await supabase
      .from("trade_counterproposals")
      .select("version,status")
      .eq("thread_id", threadId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = Number(latest?.version ?? 0) + 1;

    await supabase
      .from("trade_counterproposals")
      .update({ status: "superseded", responded_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("status", "proposed");

    const { data: proposal, error } = await supabase
      .from("trade_counterproposals")
      .insert(
        proposalRow(terms, {
          thread_id: threadId,
          offer_id: thread.offer_id,
          proposer_id: viewer.authUser.id,
          version,
          status: "proposed",
        }),
      )
      .select("id")
      .single();
    if (error || !proposal?.id) throw new Error(error?.code === "23505" ? "These exact terms were already proposed." : error?.message);

    await Promise.all([
      insertSystemMessage(threadId, `Counterproposal v${version} was submitted.`, {
        counterproposalId: proposal.id,
      }),
      recordCoreEvent({
        profileId: viewer.authUser.id,
        eventType: "counterproposal_sent",
        entityType: "counterproposal",
        entityId: proposal.id,
      }),
      queuePrivateNotification({
        userId: counterpartId,
        type: "counterproposal_sent",
        title: "Counterproposal received",
        body: "A counterparty proposed a new immutable version of the terms.",
        href: returnTo,
        dedupeKey: `counterproposal_sent:${proposal.id}:${counterpartId}`,
      }),
    ]);

    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", `Counterproposal v${version} sent.`);
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Counterproposal failed.");
  }
}

export async function decideCounterproposalAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const proposalId = read(formData, "proposal_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  const decision = read(formData, "decision");

  try {
    const { thread, counterpartId } = await getThreadParticipant(threadId, viewer.authUser.id);
    const { data: proposal } = await supabase
      .from("trade_counterproposals")
      .select("*")
      .eq("id", proposalId)
      .eq("thread_id", threadId)
      .eq("status", "proposed")
      .maybeSingle();
    if (!proposal) throw new Error("The current proposal is no longer awaiting a decision.");
    if (String(proposal.proposer_id) === viewer.authUser.id) {
      throw new Error("The proposer cannot accept their own proposal.");
    }

    if (decision === "reject") {
      await supabase
        .from("trade_counterproposals")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", proposalId);
      await Promise.all([
        insertSystemMessage(threadId, `Counterproposal v${proposal.version} was rejected.`),
        queuePrivateNotification({
          userId: String(proposal.proposer_id),
          type: "proposal_rejected",
          title: "Proposal rejected",
          body: "The current counterproposal was rejected. The private thread remains available.",
          href: returnTo,
          dedupeKey: `proposal_rejected:${proposalId}`,
        }),
      ]);
      revalidatePath(returnTo);
      redirectWithMessage(returnTo, "message", "Counterproposal rejected. No agreement was formed.");
    }

    if (decision !== "accept") throw new Error("Unknown decision.");
    await supabase
      .from("trade_counterproposals")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", proposalId);

    let agreementId = thread.agreement_id ? String(thread.agreement_id) : "";
    if (!agreementId) {
      const { data: interest } = await supabase
        .from("interests")
        .select("id")
        .eq("offer_id", thread.offer_id)
        .in("user_id", [String(thread.participant_a), String(thread.participant_b)])
        .neq("user_id", String((await supabase.from("offers").select("owner_id").eq("id", thread.offer_id).single()).data?.owner_id ?? ""))
        .limit(1)
        .maybeSingle();
      const { data: offer } = await supabase.from("offers").select("owner_id").eq("id", thread.offer_id).single();
      const proposerId = String(offer?.owner_id ?? thread.participant_a);
      const responderId = proposerId === String(thread.participant_a) ? String(thread.participant_b) : String(thread.participant_a);
      const created = await supabase
        .from("agreements")
        .insert({
          offer_id: thread.offer_id,
          interest_id: interest?.id ?? null,
          proposer_id: proposerId,
          responder_id: responderId,
          status: "proposed",
          lifecycle_status: "proposed",
          notes: "Created from an accepted structured counterproposal. Both parties must confirm the same immutable version.",
          evidence_due_at: proposal.evidence_due_date,
        })
        .select("id")
        .single();
      if (created.error || !created.data?.id) throw new Error(created.error?.message ?? "Agreement could not be created.");
      agreementId = String(created.data.id);

      const versionInsert = await supabase
        .from("trade_agreement_versions")
        .insert({
          agreement_id: agreementId,
          version: 1,
          proposed_by: proposal.proposer_id,
          proposed_action: proposal.proposed_action,
          requested_action: proposal.requested_action,
          duration: proposal.duration,
          start_date: proposal.start_date,
          evidence_rule: proposal.evidence_rule,
          evidence_due_date: proposal.evidence_due_date,
          exit_conditions: proposal.exit_conditions,
          maximum_burden: proposal.maximum_burden,
          privacy_scope: proposal.privacy_scope,
          no_trade_baseline: proposal.no_trade_baseline,
          terms_hash: proposal.terms_hash,
        })
        .select("id")
        .single();
      if (versionInsert.error || !versionInsert.data?.id) throw new Error(versionInsert.error?.message ?? "Agreement terms could not be frozen.");

      await Promise.all([
        supabase
          .from("agreements")
          .update({ current_version_id: versionInsert.data.id, updated_at: new Date().toISOString() })
          .eq("id", agreementId),
        supabase
          .from("trade_threads")
          .update({ agreement_id: agreementId, updated_at: new Date().toISOString() })
          .eq("id", threadId),
        supabase.from("interests").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("offer_id", thread.offer_id),
      ]);
    }

    await Promise.all([
      insertSystemMessage(threadId, "Terms accepted. An agreement record now requires separate confirmation from both parties."),
      queuePrivateNotification({
        userId: String(thread.participant_a),
        type: "final_confirmation_required",
        title: "Final confirmation required",
        body: "Review and confirm the frozen agreement version. It is not active until both parties confirm.",
        href: `/trade-agreements/${agreementId}`,
        dedupeKey: `final_confirmation:${agreementId}:${thread.participant_a}`,
      }),
      queuePrivateNotification({
        userId: String(thread.participant_b),
        type: "final_confirmation_required",
        title: "Final confirmation required",
        body: "Review and confirm the frozen agreement version. It is not active until both parties confirm.",
        href: `/trade-agreements/${agreementId}`,
        dedupeKey: `final_confirmation:${agreementId}:${thread.participant_b}`,
      }),
    ]);

    revalidatePath(returnTo);
    redirectWithMessage(`/trade-agreements/${agreementId}`, "message", "Terms accepted. Both parties must now confirm the same frozen version.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Decision failed.");
  }
}

export async function withdrawTradeResponseAction(formData: FormData) {
  const threadId = read(formData, "thread_id");
  const interestId = read(formData, "interest_id");
  const returnTo = `/messages/${threadId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  try {
    const { counterpartId } = await getThreadParticipant(threadId, viewer.authUser.id);
    if (!interestId) throw new Error("No response is available to withdraw.");
    const { error } = await supabase
      .from("interests")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", interestId)
      .eq("user_id", viewer.authUser.id);
    if (error) throw new Error(error.message);
    await Promise.all([
      supabase
        .from("trade_counterproposals")
        .update({ status: "withdrawn", responded_at: new Date().toISOString() })
        .eq("thread_id", threadId)
        .eq("proposer_id", viewer.authUser.id)
        .eq("status", "proposed"),
      supabase.from("trade_threads").update({ status: "closed" }).eq("id", threadId),
      queuePrivateNotification({
        userId: counterpartId,
        type: "response_withdrawn",
        title: "Response withdrawn",
        body: "The counterparty withdrew before agreement formation. No obligation was created.",
        href: returnTo,
        dedupeKey: `response_withdrawn:${interestId}`,
      }),
    ]);
    redirectWithMessage("/messages", "message", "Response withdrawn and thread closed.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Withdrawal failed.");
  }
}

export async function confirmAgreementVersionAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    if (!agreement || !agreement.current_version_id) throw new Error("Agreement version is unavailable.");
    if (["cancelled", "completed", "expired"].includes(String(agreement.lifecycle_status))) {
      throw new Error("This agreement can no longer be confirmed.");
    }

    await supabase.from("trade_agreement_confirmations").upsert(
      {
        agreement_version_id: agreement.current_version_id,
        user_id: viewer.authUser.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "agreement_version_id,user_id" },
    );
    const { count } = await supabase
      .from("trade_agreement_confirmations")
      .select("user_id", { count: "exact", head: true })
      .eq("agreement_version_id", agreement.current_version_id);

    const counterpartId =
      String(agreement.proposer_id) === viewer.authUser.id
        ? String(agreement.responder_id)
        : String(agreement.proposer_id);

    if ((count ?? 0) >= 2) {
      const now = new Date().toISOString();
      const { data: version } = await supabase
        .from("trade_agreement_versions")
        .select("evidence_due_date")
        .eq("id", agreement.current_version_id)
        .single();
      await Promise.all([
        supabase
          .from("agreements")
          .update({
            status: "active",
            lifecycle_status: "active",
            activated_at: now,
            evidence_due_at: version?.evidence_due_date ?? agreement.evidence_due_at,
            updated_at: now,
          })
          .eq("id", agreementId),
        supabase
          .from("offers")
          .update({ status: "matched", workflow_status: "closed", closed_at: now, updated_at: now })
          .eq("id", agreement.offer_id),
        recordCoreEvent({
          profileId: String(agreement.proposer_id),
          eventType: "agreement_confirmed_by_both",
          entityType: "agreement",
          entityId: agreementId,
        }),
        recordCoreEvent({
          profileId: String(agreement.responder_id),
          eventType: "agreement_confirmed_by_both",
          entityType: "agreement",
          entityId: agreementId,
        }),
        queuePrivateNotification({
          userId: String(agreement.proposer_id),
          type: "agreement_active",
          title: "Agreement active",
          body: "Both parties confirmed the frozen terms. Evidence and exit rules are now active.",
          href: returnTo,
          dedupeKey: `agreement_active:${agreementId}:${agreement.proposer_id}`,
        }),
        queuePrivateNotification({
          userId: String(agreement.responder_id),
          type: "agreement_active",
          title: "Agreement active",
          body: "Both parties confirmed the frozen terms. Evidence and exit rules are now active.",
          href: returnTo,
          dedupeKey: `agreement_active:${agreementId}:${agreement.responder_id}`,
        }),
      ]);
      const { data: thread } = await supabase.from("trade_threads").select("id").eq("agreement_id", agreementId).maybeSingle();
      if (thread?.id) await insertSystemMessage(thread.id, "Both parties confirmed the frozen agreement version. The agreement is active.");
      revalidatePath("/offers");
      revalidatePath(returnTo);
      redirectWithMessage(returnTo, "message", "Both parties confirmed. The agreement is active.");
    }

    await queuePrivateNotification({
      userId: counterpartId,
      type: "final_confirmation_required",
      title: "Your confirmation is required",
      body: "The other participant confirmed the current frozen agreement version.",
      href: returnTo,
      dedupeKey: `confirmation_waiting:${agreement.current_version_id}:${counterpartId}`,
    });
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", "Your confirmation was recorded. The agreement remains proposed until the other party confirms.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Confirmation failed.");
  }
}

export async function proposeAgreementAmendmentAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    if (!agreement) throw new Error("Agreement not found.");
    if (["completed", "cancelled", "expired"].includes(String(agreement.lifecycle_status))) {
      throw new Error("This agreement cannot be amended.");
    }
    const terms = readTerms(formData);
    const { data: latest } = await supabase
      .from("trade_agreement_versions")
      .select("version")
      .eq("agreement_id", agreementId)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    const version = Number(latest?.version ?? 0) + 1;
    const { data: inserted, error } = await supabase
      .from("trade_agreement_versions")
      .insert({
        agreement_id: agreementId,
        version,
        proposed_by: viewer.authUser.id,
        proposed_action: terms.proposedAction,
        requested_action: terms.requestedAction,
        duration: terms.duration,
        start_date: terms.startDate,
        evidence_rule: terms.evidenceRule,
        evidence_due_date: terms.evidenceDueDate,
        exit_conditions: terms.exitConditions,
        maximum_burden: terms.maximumBurden,
        privacy_scope: terms.privacyScope,
        no_trade_baseline: terms.noTradeBaseline,
        terms_hash: buildTermsHash(terms),
      })
      .select("id")
      .single();
    if (error || !inserted?.id) throw new Error(error?.code === "23505" ? "These exact terms already exist in the version history." : error?.message);

    await supabase
      .from("agreements")
      .update({
        current_version_id: inserted.id,
        lifecycle_status: "proposed",
        status: "proposed",
        evidence_due_at: terms.evidenceDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreementId);

    const counterpartId =
      String(agreement.proposer_id) === viewer.authUser.id
        ? String(agreement.responder_id)
        : String(agreement.proposer_id);
    await Promise.all([
      recordCoreEvent({
        profileId: viewer.authUser.id,
        eventType: "counterproposal_sent",
        entityType: "agreement_version",
        entityId: inserted.id,
      }),
      queuePrivateNotification({
        userId: counterpartId,
        type: "agreement_amendment",
        title: "Agreement amendment proposed",
        body: "A new immutable term version is awaiting separate confirmation from both parties.",
        href: returnTo,
        dedupeKey: `agreement_amendment:${inserted.id}:${counterpartId}`,
      }),
    ]);
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", `Amendment v${version} proposed. Prior confirmations do not carry forward.`);
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Amendment failed.");
  }
}

export async function declineProposedAgreementAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    if (!agreement) throw new Error("Agreement not found.");
    if (agreement.lifecycle_status === "active") throw new Error("Use the exit workflow for an active agreement.");
    const now = new Date().toISOString();
    await supabase
      .from("agreements")
      .update({ status: "cancelled", lifecycle_status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("id", agreementId);
    const counterpartId =
      String(agreement.proposer_id) === viewer.authUser.id
        ? String(agreement.responder_id)
        : String(agreement.proposer_id);
    await queuePrivateNotification({
      userId: counterpartId,
      type: "agreement_declined",
      title: "Agreement declined",
      body: "The proposed agreement was declined before activation. No obligation was created.",
      href: returnTo,
      dedupeKey: `agreement_declined:${agreementId}`,
    });
    redirectWithMessage(returnTo, "message", "Agreement declined before activation.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Decline failed.");
  }
}

export async function submitTradeEvidenceAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    if (!agreement) throw new Error("Agreement not found.");
    if (!["active", "evidence_due", "disputed"].includes(String(agreement.lifecycle_status))) {
      throw new Error("Evidence can be submitted only after bilateral activation.");
    }

    const evidenceUrl = read(formData, "evidence_url");
    const attestation = read(formData, "attestation").slice(0, MAX_TERM_LENGTH);
    const fileEntry = formData.get("evidence_file");
    if (!readCheckbox(formData, "public_safe_copy")) {
      throw new Error(
        "Confirm that this evidence item and its source are public-safe before submission.",
      );
    }
    let storagePath = "";
    let evidenceType = "";
    let publicOriginalFilename = "";
    let publicMimeType = "";
    const publicRedactionNote =
      "The submitting participant certified this source as public-safe. This certification is not independent verification.";

    if (fileEntry instanceof File && fileEntry.size > 0) {
      if (fileEntry.size > 10 * 1024 * 1024) throw new Error("Evidence files must be 10 MB or smaller.");
      const allowedTypes = new Set([
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
        "text/plain",
      ]);
      if (!allowedTypes.has(fileEntry.type)) throw new Error("Unsupported evidence file type.");
      const extension = fileEntry.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0].toLowerCase() ?? "";
      publicOriginalFilename = `public-evidence${extension}`;
      publicMimeType = fileEntry.type;
      storagePath = `${agreementId}/${viewer.authUser.id}/${randomUUID()}-${publicOriginalFilename}`;
      const upload = await supabase.storage.from(EVIDENCE_BUCKET).upload(storagePath, fileEntry, {
        contentType: fileEntry.type,
        upsert: false,
      });
      if (upload.error) throw new Error(upload.error.message);
      evidenceType = "file";
    } else if (evidenceUrl) {
      try {
        const parsed = new URL(evidenceUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        throw new Error("Evidence link must be a valid http or https URL.");
      }
      evidenceType = "link";
      publicOriginalFilename = "external-evidence-link";
      publicMimeType = "text/html";
    } else if (attestation) {
      evidenceType = "attestation";
      publicOriginalFilename = "participant-attestation.txt";
      publicMimeType = "text/plain";
    } else {
      throw new Error("Upload a file, provide an evidence link, or write an attestation.");
    }

    const { data: evidence, error } = await supabase
      .from("trade_evidence_items")
      .insert({
        agreement_id: agreementId,
        submitted_by: viewer.authUser.id,
        evidence_type: evidenceType,
        storage_path: storagePath,
        evidence_url: evidenceUrl,
        attestation,
        status: "submitted",
        public_visibility: "public",
        redaction_status: "not_required",
        public_url: evidenceType === "link" ? evidenceUrl : "",
        public_storage_path: evidenceType === "file" ? storagePath : "",
        public_original_filename: publicOriginalFilename,
        public_mime_type: publicMimeType,
        public_redaction_note: publicRedactionNote,
      })
      .select("id")
      .single();
    if (error || !evidence?.id) throw new Error(error?.message ?? "Evidence could not be recorded.");

    await supabase
      .from("agreements")
      .update({
        lifecycle_status: "evidence_due",
        updated_at: new Date().toISOString(),
        public_evidence_updated_at: new Date().toISOString(),
      })
      .eq("id", agreementId)
      .neq("lifecycle_status", "disputed");
    const counterpartId =
      String(agreement.proposer_id) === viewer.authUser.id
        ? String(agreement.responder_id)
        : String(agreement.proposer_id);
    await Promise.all([
      recordCoreEvent({
        profileId: viewer.authUser.id,
        eventType: "evidence_submitted",
        entityType: "evidence",
        entityId: evidence.id,
      }),
      queuePrivateNotification({
        userId: counterpartId,
        type: "evidence_submitted",
        title: "Evidence submitted",
        body: "A participant submitted evidence. Accept it or challenge it within the stated window.",
        href: returnTo,
        dedupeKey: `evidence_submitted:${evidence.id}:${counterpartId}`,
      }),
    ]);
    revalidatePath(returnTo);
    revalidatePublicEvidence(agreementId);
    redirectWithMessage(returnTo, "message", "Evidence submitted. A seven-day challenge window is open.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Evidence submission failed.");
  }
}

export async function reviewTradeEvidenceAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const evidenceId = read(formData, "evidence_id");
  const decision = read(formData, "decision");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    const { data: evidence } = await supabase
      .from("trade_evidence_items")
      .select("*")
      .eq("id", evidenceId)
      .eq("agreement_id", agreementId)
      .eq("status", "submitted")
      .maybeSingle();
    if (!agreement || !evidence) throw new Error("Evidence item is unavailable.");
    if (String(evidence.submitted_by) === viewer.authUser.id) {
      throw new Error("The submitter cannot review their own evidence.");
    }

    if (decision === "accept") {
      await supabase
        .from("trade_evidence_items")
        .update({ status: "accepted", reviewed_at: new Date().toISOString() })
        .eq("id", evidenceId);
      await queuePrivateNotification({
        userId: String(evidence.submitted_by),
        type: "evidence_accepted",
        title: "Evidence accepted",
        body: "The counterparty accepted the submitted evidence.",
        href: returnTo,
        dedupeKey: `evidence_accepted:${evidenceId}`,
      });
      revalidatePath(returnTo);
      revalidatePublicEvidence(agreementId);
      redirectWithMessage(returnTo, "message", "Evidence accepted.");
    }

    if (decision === "challenge") {
      const reason = read(formData, "challenge_reason");
      if (!reason) throw new Error("State the factual or scope issue being challenged.");
      await Promise.all([
        supabase
          .from("trade_evidence_items")
          .update({
            status: "challenged",
            challenge_reason: reason.slice(0, MAX_MESSAGE_LENGTH),
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", evidenceId),
        supabase
          .from("agreements")
          .update({ lifecycle_status: "disputed", updated_at: new Date().toISOString() })
          .eq("id", agreementId),
        queuePrivateNotification({
          userId: String(evidence.submitted_by),
          type: "evidence_challenged",
          title: "Evidence challenged",
          body: "The counterparty challenged an evidence item. Review the stated reason in the agreement record.",
          href: returnTo,
          dedupeKey: `evidence_challenged:${evidenceId}`,
        }),
      ]);
      revalidatePath(returnTo);
      revalidatePublicEvidence(agreementId);
      redirectWithMessage(returnTo, "message", "Evidence challenged and agreement marked disputed.");
    }

    throw new Error("Unknown evidence decision.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Evidence review failed.");
  }
}

export async function confirmTradeCompletionAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    if (!agreement) throw new Error("Agreement not found.");
    if (!["active", "evidence_due"].includes(String(agreement.lifecycle_status))) {
      throw new Error("Completion cannot be confirmed in the current state.");
    }
    const { count: acceptedEvidenceCount } = await supabase
      .from("trade_evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", agreementId)
      .eq("status", "accepted");
    if ((acceptedEvidenceCount ?? 0) < 1) {
      throw new Error("At least one evidence item must be accepted before completion.");
    }

    await supabase.from("trade_completion_confirmations").upsert(
      { agreement_id: agreementId, user_id: viewer.authUser.id, confirmed_at: new Date().toISOString() },
      { onConflict: "agreement_id,user_id" },
    );
    const { count } = await supabase
      .from("trade_completion_confirmations")
      .select("user_id", { count: "exact", head: true })
      .eq("agreement_id", agreementId);
    const counterpartId =
      String(agreement.proposer_id) === viewer.authUser.id
        ? String(agreement.responder_id)
        : String(agreement.proposer_id);

    if ((count ?? 0) >= 2) {
      const now = new Date().toISOString();
      await Promise.all([
        supabase
          .from("agreements")
          .update({
            status: "completed",
            lifecycle_status: "completed",
            completed_at: now,
            updated_at: now,
            public_evidence_updated_at: now,
          })
          .eq("id", agreementId),
        recordCoreEvent({
          profileId: String(agreement.proposer_id),
          eventType: "agreement_completed",
          entityType: "agreement",
          entityId: agreementId,
        }),
        recordCoreEvent({
          profileId: String(agreement.responder_id),
          eventType: "agreement_completed",
          entityType: "agreement",
          entityId: agreementId,
        }),
        queuePrivateNotification({
          userId: String(agreement.proposer_id),
          type: "agreement_completed",
          title: "Agreement completed",
          body: "Both parties confirmed completion. The final Deal Receipt is available.",
          href: returnTo,
          dedupeKey: `agreement_completed:${agreementId}:${agreement.proposer_id}`,
        }),
        queuePrivateNotification({
          userId: String(agreement.responder_id),
          type: "agreement_completed",
          title: "Agreement completed",
          body: "Both parties confirmed completion. The final Deal Receipt is available.",
          href: returnTo,
          dedupeKey: `agreement_completed:${agreementId}:${agreement.responder_id}`,
        }),
      ]);
      revalidatePath(returnTo);
      revalidatePublicEvidence(agreementId);
      redirectWithMessage(returnTo, "message", "Both parties confirmed completion. Final Deal Receipt generated.");
    }

    await queuePrivateNotification({
      userId: counterpartId,
      type: "completion_confirmation_required",
      title: "Completion confirmation required",
      body: "The other participant confirmed completion. Review the evidence and confirm or challenge.",
      href: returnTo,
      dedupeKey: `completion_confirmation:${agreementId}:${counterpartId}`,
    });
    revalidatePath(returnTo);
    revalidatePublicEvidence(agreementId);
    redirectWithMessage(returnTo, "message", "Your completion confirmation was recorded.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Completion confirmation failed.");
  }
}

export async function requestAgreementExitAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    if (!agreement) throw new Error("Agreement not found.");
    if (["completed", "cancelled", "expired"].includes(String(agreement.lifecycle_status))) {
      throw new Error("This agreement is already final.");
    }
    const requestType = read(formData, "request_type");
    const reason = read(formData, "reason");
    if (!reason) throw new Error("State the reason and the exit rule being used.");
    if (!['mutual_cancel', 'unilateral_exit'].includes(requestType)) throw new Error("Unknown exit type.");

    const status = requestType === "unilateral_exit" ? "executed" : "pending";
    const { data: exitRequest, error } = await supabase
      .from("trade_exit_requests")
      .insert({
        agreement_id: agreementId,
        requested_by: viewer.authUser.id,
        request_type: requestType,
        reason: reason.slice(0, MAX_MESSAGE_LENGTH),
        status,
        resolved_at: status === "executed" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !exitRequest?.id) throw new Error(error?.message ?? "Exit request failed.");

    const counterpartId =
      String(agreement.proposer_id) === viewer.authUser.id
        ? String(agreement.responder_id)
        : String(agreement.proposer_id);
    if (requestType === "unilateral_exit") {
      const now = new Date().toISOString();
      await supabase
        .from("agreements")
        .update({
          status: "cancelled",
          lifecycle_status: "cancelled",
          cancelled_at: now,
          exit_requested_by: viewer.authUser.id,
          exit_reason: reason.slice(0, MAX_MESSAGE_LENGTH),
          updated_at: now,
        })
        .eq("id", agreementId);
      await queuePrivateNotification({
        userId: counterpartId,
        type: "unilateral_exit",
        title: "Agreement exited",
        body: "The other participant used the published unilateral exit rule. Future obligations have ended; completed periods remain recorded.",
        href: returnTo,
        dedupeKey: `unilateral_exit:${exitRequest.id}:${counterpartId}`,
      });
      revalidatePath(returnTo);
      redirectWithMessage(returnTo, "message", "Unilateral exit recorded. Future obligations ended under the published rule.");
    }

    await queuePrivateNotification({
      userId: counterpartId,
      type: "mutual_cancel_requested",
      title: "Mutual cancellation requested",
      body: "The other participant requested mutual cancellation. Accept or decline in the agreement record.",
      href: returnTo,
      dedupeKey: `mutual_cancel:${exitRequest.id}:${counterpartId}`,
    });
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", "Mutual cancellation request sent.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Exit request failed.");
  }
}

export async function respondAgreementExitAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const requestId = read(formData, "request_id");
  const decision = read(formData, "decision");
  const returnTo = `/trade-agreements/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;

  try {
    const { data: agreement } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
      .maybeSingle();
    const { data: request } = await supabase
      .from("trade_exit_requests")
      .select("*")
      .eq("id", requestId)
      .eq("agreement_id", agreementId)
      .eq("status", "pending")
      .eq("request_type", "mutual_cancel")
      .maybeSingle();
    if (!agreement || !request) throw new Error("Cancellation request is unavailable.");
    if (String(request.requested_by) === viewer.authUser.id) throw new Error("The requester cannot decide their own request.");

    const accepted = decision === "accept";
    await supabase
      .from("trade_exit_requests")
      .update({ status: accepted ? "accepted" : "declined", resolved_at: new Date().toISOString() })
      .eq("id", requestId);
    if (accepted) {
      const now = new Date().toISOString();
      await supabase
        .from("agreements")
        .update({ status: "cancelled", lifecycle_status: "cancelled", cancelled_at: now, updated_at: now })
        .eq("id", agreementId);
    }
    await queuePrivateNotification({
      userId: String(request.requested_by),
      type: accepted ? "mutual_cancel_accepted" : "mutual_cancel_declined",
      title: accepted ? "Mutual cancellation accepted" : "Mutual cancellation declined",
      body: accepted
        ? "Both parties agreed to cancel future obligations. Completed periods remain recorded."
        : "The mutual cancellation request was declined. The published unilateral exit rule remains available.",
      href: returnTo,
      dedupeKey: `mutual_cancel_decision:${requestId}:${decision}`,
    });
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "message", accepted ? "Agreement cancelled by mutual consent." : "Mutual cancellation declined.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Cancellation decision failed.");
  }
}

export async function markTradeNotificationReadAction(formData: FormData) {
  const notificationId = read(formData, "notification_id");
  const returnTo = safeInternalPath(read(formData, "return_to"), "/messages");
  const viewer = await requireViewer(returnTo);
  const supabase = createServiceClient() as any;
  await supabase
    .from("trade_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", viewer.authUser.id);
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function reviewCoreOfferAction(formData: FormData) {
  const offerId = read(formData, "offer_id");
  const returnTo = safeInternalPath(read(formData, "return_to"), "/admin/trade-review");
  const viewer = await requireCoreAdmin(returnTo);
  const supabase = createServiceClient() as any;
  const decision = read(formData, "decision");
  const reason = read(formData, "reason").slice(0, MAX_MESSAGE_LENGTH);

  try {
    const { data: offer } = await supabase.from("offers").select("*").eq("id", offerId).maybeSingle();
    if (!offer) throw new Error("Offer not found.");
    const now = new Date().toISOString();
    let workflowStatus = "";
    let status = "paused";
    let reviewAction = "";
    let participantCopy = "";

    if (decision === "approve") {
      workflowStatus = "published";
      status = "open";
      reviewAction = "approved";
      participantCopy = "Your proposal passed operator review and is now published.";
    } else if (decision === "changes_requested") {
      if (!reason) throw new Error("Give the participant a specific change request.");
      workflowStatus = "changes_requested";
      reviewAction = "changes_requested";
      participantCopy = "Operator review requested changes. Revise the proposal using the displayed reason.";
    } else if (decision === "reject") {
      if (!reason) throw new Error("Give the participant a specific rejection reason.");
      workflowStatus = "rejected";
      reviewAction = "rejected";
      participantCopy = "The proposal was rejected with a specific reason. It may be revised and resubmitted.";
    } else if (decision === "pause") {
      workflowStatus = "paused";
      reviewAction = "paused";
      participantCopy = "The operator paused the proposal pending review.";
    } else if (decision === "close") {
      workflowStatus = "closed";
      status = "closed";
      reviewAction = "closed";
      participantCopy = "The operator closed the proposal.";
    } else {
      throw new Error("Unknown review decision.");
    }

    const update: Record<string, unknown> = {
      workflow_status: workflowStatus,
      status,
      moderation_reason: decision === "approve" ? "" : reason,
      updated_at: now,
    };
    if (decision === "approve") update.published_at = now;
    if (decision === "close") update.closed_at = now;

    await Promise.all([
      supabase.from("offers").update(update).eq("id", offerId),
      supabase.from("trade_review_events").insert({
        offer_id: offerId,
        reviewer_id: viewer.authUser.id,
        action: reviewAction,
        reason,
      }),
      queuePrivateNotification({
        userId: String(offer.owner_id),
        type: `offer_${workflowStatus}`,
        title: decision === "approve" ? "Proposal published" : "Proposal review update",
        body: participantCopy,
        href: `/trades/${offerId}/manage`,
        dedupeKey: `offer_review:${offerId}:${reviewAction}:${now}`,
      }),
    ]);

    if (decision === "approve") {
      await recordCoreEvent({
        profileId: String(offer.owner_id),
        eventType: "offer_published",
        entityType: "offer",
        entityId: offerId,
      });
    }

    revalidatePath("/offers");
    revalidatePath(returnTo);
    revalidatePath(`/trades/${offerId}/manage`);
    redirectWithMessage(returnTo, "message", `Review decision recorded: ${reviewAction.replaceAll("_", " ")}.`);
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Review failed.");
  }
}

export async function resolveTradeReportAction(formData: FormData) {
  const returnTo = "/admin/trade-review";
  await requireCoreAdmin(returnTo);
  const supabase = createServiceClient() as any;
  const reportId = read(formData, "report_id");
  const decision = read(formData, "decision");
  if (!['reviewing', 'resolved', 'dismissed'].includes(decision)) {
    redirectWithMessage(returnTo, "error", "Unknown report decision.");
  }
  await supabase
    .from("trade_reports")
    .update({ status: decision, resolved_at: decision === "reviewing" ? null : new Date().toISOString() })
    .eq("id", reportId);
  revalidatePath(returnTo);
  redirectWithMessage(returnTo, "message", `Report marked ${decision}.`);
}
