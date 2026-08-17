"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  confirmAgreementVersionAction as confirmBaseAgreementVersionAction,
  confirmTradeCompletionAction as confirmBaseTradeCompletionAction,
} from "@/app/core-trade-actions-base";
import { requireViewer } from "@/lib/app-data";
import {
  EVERY_ORG_DIRECT_MINIMUM_CENTS,
  getTradeDonationPoolConfig,
  isPooledTradeDonationTerm,
} from "@/lib/trade-donation-pool";
import {
  buildEveryOrgTradeDonationUrl,
  getTradeDonationProviderConfig,
  getTradeDonationTarget,
  loadTradeDonationAgreementContext,
  MAX_TRADE_DONATION_CENTS,
  MIN_TRADE_DONATION_CENTS,
  parseUsdToCents,
  rpcRow,
  type TradeDonationIntentRow,
  type TradeDonationPayerRole,
} from "@/lib/trade-donation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeAgreementPath(agreementId: string) {
  return isUuid(agreementId) ? `/trade-agreements/${agreementId}` : "/trade-agreements";
}

function redirectWithMessage(
  agreementId: string,
  key: "error" | "message",
  message: string,
): never {
  const path = safeAgreementPath(agreementId);
  const query = new URLSearchParams({ [key]: message });
  redirect(`${path}?${query.toString()}`);
}

function termsHash(version: Record<string, unknown>, donation: Record<string, unknown>) {
  const frozenTerms = {
    proposedAction: version.proposed_action ?? "",
    requestedAction: version.requested_action ?? "",
    duration: version.duration ?? "",
    startDate: version.start_date ?? null,
    evidenceRule: version.evidence_rule ?? "",
    evidenceDueDate: version.evidence_due_date ?? null,
    exitConditions: version.exit_conditions ?? "",
    maximumBurden: version.maximum_burden ?? "",
    privacyScope: version.privacy_scope ?? "",
    noTradeBaseline: version.no_trade_baseline ?? "",
    donation,
  };
  return createHash("sha256").update(JSON.stringify(frozenTerms)).digest("hex");
}

async function insertAgreementSystemMessage(agreementId: string, body: string) {
  const supabase = createServiceClient() as any;
  const { data: thread } = await supabase
    .from("trade_threads")
    .select("id")
    .eq("agreement_id", agreementId)
    .maybeSingle();
  if (!thread?.id) return;
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("trade_messages").insert({
      thread_id: thread.id,
      sender_id: null,
      message_type: "system",
      body,
      metadata: { source: "every_org_pledge_donation" },
    }),
    supabase.from("trade_threads").update({ last_message_at: now, updated_at: now }).eq("id", thread.id),
  ]);
}

export async function configureTradeDonationAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  const targetId = read(formData, "target_id");
  const payerRole = read(formData, "payer_role") as TradeDonationPayerRole;
  const amountCents = parseUsdToCents(read(formData, "amount_usd"));
  const target = getTradeDonationTarget(targetId);

  if (!isUuid(agreementId)) {
    redirectWithMessage(agreementId, "error", "A valid agreement is required.");
  }
  if (!target) {
    redirectWithMessage(agreementId, "error", "Choose a supported donation destination.");
  }
  if (payerRole !== "proposer" && payerRole !== "responder") {
    redirectWithMessage(agreementId, "error", "Choose which participant will make the donation.");
  }
  if (
    amountCents === null ||
    amountCents < MIN_TRADE_DONATION_CENTS ||
    amountCents > MAX_TRADE_DONATION_CENTS
  ) {
    redirectWithMessage(
      agreementId,
      "error",
      `Donation amount must be between $${(MIN_TRADE_DONATION_CENTS / 100).toFixed(0)} and $${(
        MAX_TRADE_DONATION_CENTS / 100
      ).toFixed(0)}.`,
    );
  }

  const supabase = createServiceClient() as any;
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .or(`proposer_id.eq.${viewer.authUser.id},responder_id.eq.${viewer.authUser.id}`)
    .maybeSingle();
  if (agreementError || !agreement?.current_version_id) {
    redirectWithMessage(
      agreementId,
      "error",
      agreementError?.message ?? "The agreement or its frozen version is unavailable.",
    );
  }
  if (String(agreement.lifecycle_status) !== "proposed") {
    redirectWithMessage(
      agreementId,
      "error",
      "Donation connector terms can only change before bilateral confirmation.",
    );
  }
  const { data: version, error: versionError } = await supabase
    .from("trade_agreement_versions")
    .select("*")
    .eq("id", agreement.current_version_id)
    .maybeSingle();
  if (versionError || !version) {
    redirectWithMessage(
      agreementId,
      "error",
      versionError?.message ?? "The frozen agreement version is unavailable.",
    );
  }

  const connectorTermsHash = termsHash(version, {
    provider: "every_org",
    payerRole,
    targetId: target.id,
    targetName: target.name,
    nonprofitSlug: target.everyOrgSlug,
    nonprofitEin: target.nonprofitEin ?? "",
    amountCents,
    currency: "USD",
    frequency: "ONCE",
    sourceLabel: target.evidenceSourceLabel,
    sourceUrl: target.evidenceSourceUrl,
    sourceCheckedAt: target.evidenceCheckedAt,
  });
  const { data, error } = await supabase.rpc("configure_trade_donation_terms", {
    p_agreement_id: agreementId,
    p_actor_id: viewer.authUser.id,
    p_payer_role: payerRole,
    p_target_id: target.id,
    p_target_name: target.name,
    p_nonprofit_slug: target.everyOrgSlug,
    p_nonprofit_ein: target.nonprofitEin ?? "",
    p_amount_cents: amountCents,
    p_connector_terms_hash: connectorTermsHash,
    p_source_label: target.evidenceSourceLabel,
    p_source_url: target.evidenceSourceUrl,
    p_source_checked_at: target.evidenceCheckedAt,
  });
  if (error || !rpcRow(data)) {
    redirectWithMessage(
      agreementId,
      "error",
      error?.message ?? "The donation connector terms could not be frozen.",
    );
  }

  await insertAgreementSystemMessage(
    agreementId,
    `${target.name} was attached as a ${`$${(amountCents / 100).toFixed(2)}`} Every.org donation leg. Both participants must confirm the new frozen version.`,
  );
  revalidatePath(returnTo);
  redirectWithMessage(
    agreementId,
    "message",
    `Donation connector attached: $${(amountCents / 100).toFixed(2)} to ${target.name}. Both participants must confirm the new frozen version.`,
  );
}

export async function confirmDonationAwareAgreementVersionAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const agreementVersionId = read(formData, "agreement_version_id");
  if (!isUuid(agreementId)) {
    redirectWithMessage(agreementId, "error", "A valid agreement is required.");
  }
  if (!isUuid(agreementVersionId)) {
    redirectWithMessage(
      agreementId,
      "error",
      "The exact frozen version you reviewed is required.",
    );
  }

  const context = await loadTradeDonationAgreementContext(agreementId);
  if (!context?.term) {
    return confirmBaseAgreementVersionAction(formData);
  }
  const pooled = isPooledTradeDonationTerm(context.term);
  const providerConfig = getTradeDonationProviderConfig();
  const poolConfig = getTradeDonationPoolConfig();
  if (pooled ? !poolConfig.readyForParticipantFunding : !providerConfig.ready) {
    redirectWithMessage(
      agreementId,
      "error",
      pooled
        ? poolConfig.blockers[0] ?? "Cross-user pooled settlement is not launch-ready."
        : providerConfig.blockers[0] ?? "The Every.org connector is not launch-ready.",
    );
  }
  if (read(formData, "terms_reviewed") !== "on") {
    redirectWithMessage(agreementId, "error", "Review and accept the complete frozen terms first.");
  }
  if (context.term.agreement_version_id !== agreementVersionId) {
    redirectWithMessage(
      agreementId,
      "error",
      "The agreement changed after you reviewed it. Review the current frozen version.",
    );
  }

  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase.rpc(
    "confirm_trade_donation_version_v2",
    {
      p_actor_id: viewer.authUser.id,
      p_agreement_id: agreementId,
      p_agreement_version_id: agreementVersionId,
    },
  );
  if (error) {
    redirectWithMessage(agreementId, "error", error.message);
  }
  const result = rpcRow<Record<string, unknown>>(data);

  revalidatePath("/offers");
  revalidatePath(returnTo);
  redirectWithMessage(
    agreementId,
    "message",
    result?.awaitingDonation === true
      ? "Both participants confirmed. The donation must now be completed and verified before the reciprocal action starts."
      : "Your confirmation was recorded. No donation or reciprocal action starts until the other participant confirms.",
  );
}

export async function confirmDonationAwareTradeCompletionAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  if (!isUuid(agreementId)) {
    redirectWithMessage(agreementId, "error", "A valid agreement is required.");
  }

  const context = await loadTradeDonationAgreementContext(agreementId);
  if (!context?.term) {
    return confirmBaseTradeCompletionAction(formData);
  }

  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  const agreement = context.agreement as Record<string, any>;
  if (
    String(agreement.proposer_id) !== viewer.authUser.id &&
    String(agreement.responder_id) !== viewer.authUser.id
  ) {
    redirectWithMessage(agreementId, "error", "Only an agreement participant can confirm completion.");
  }

  const supabase = createServiceClient() as any;
  const { count, error } = await supabase
    .from("trade_evidence_items")
    .select("id", { count: "exact", head: true })
    .eq("agreement_id", agreementId)
    .eq("status", "accepted")
    .neq("evidence_type", "provider_donation");
  if (error) {
    redirectWithMessage(agreementId, "error", error.message);
  }
  if ((count ?? 0) < 1) {
    redirectWithMessage(
      agreementId,
      "error",
      "The provider donation activates this trade but does not prove the reciprocal action. Submit and accept separate performance evidence befor final completion.",
     );
  }

  return confirmBaseTradeCompletionAction(formData);
}

export async function startTradeDonationCheckoutAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  if (!isUuid(agreementId)) {
    redirectWithMessage(agreementId, "error", "A valid agreement is required.");
  }

  const initialContext = await loadTradeDonationAgreementContext(agreementId);
  if (initialContext?.term && isPooledTradeDonationTerm(initialContext.term)) {
    redirectWithMessage(
      agreementId,
      "error",
      `Every.org requires at least $${(EVERY_ORG_DIRECT_MINIMUM_CENTS / 100).toFixed(2)}. Fund this obligation through pooled settlement instead.`,
    );
  }

  const config = getTradeDonationProviderConfig();
  if (!config.ready) {
    redirectWithMessage(
      agreementId,
      "error",
      config.blockers[0] ?? "The Every.org connector is not configured.",
    );
  }

  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc("start_trade_donation_checkout", {
    p_agreement_id: agreementId,
    p_actor_id: viewer.authUser.id,
    p_partner_donation_id: randomUUID(),
  });
  const intent = rpcRow<TradeDonationIntentRow>(data);
  if (error || !intent) {
    redirectWithMessage(
      agreementId,
      "error",
      error?.message ?? "The secure donation checkout could not be started.",
    );
  }

  const context = await loadTradeDonationAgreementContext(agreementId);
  if (!context?.term || context.term.id !== intent.donation_term_id) {
    redirectWithMessage(agreementId, "error", "The donation terms changed before checkout could start.");
  }
  const href = buildEveryOrgTradeDonationUrl({
    term: context.term,
    intent,
    config,
  });
  redirect(href);
}

export async function cancelAwaitingTradeDonationAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  if (!isUuid(agreementId)) {
    redirectWithMessage(agreementId, "error", "A valid agreement is required.");
  }

  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc("cancel_trade_donation_waiting", {
    p_agreement_id: agreementId,
    p_actor_id: viewer.authUser.id,
  });
  const outcome = String(rpcRow(data) ?? "");
  if (error) {
    redirectWithMessage(agreementId, "error", error.message);
  }
  if (outcome === "checkout_in_progress") {
    redirectWithMessage(
      agreementId,
      "error",
      "Secure checkout has already started. Self-service cancellation is disabled because a completed gift may be awaiting its webhook; the reciprocal action remains inactive until verification or operator review.",
    );
  }
  if (outcome !== "cancelled") {
    redirectWithMessage(agreementId, "error", "This agreement can no longer be cancelled from the donation step.");
  }

  revalidatePath(returnTo);
  redirectWithMessage(
    agreementId,
    "message",
    "Agreement cancelled before a verified donation. No reciprocal action started.",
  );
}
