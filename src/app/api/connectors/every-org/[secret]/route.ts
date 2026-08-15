import {
  getDirectDonationUpgradeConfig,
  type EveryOrgPartnerWebhookPayload as DirectEveryOrgPartnerWebhookPayload,
} from "@/lib/direct-donation-upgrade";
import { handleDirectDonationUpgradeEveryOrgWebhook } from "@/lib/direct-donation-upgrade-webhook";
import {
  authenticateEveryOrgPartnerWebhookRequest,
  resolveEveryOrgSharedConnector,
} from "@/lib/every-org-partner-webhook-auth";
import {
  evaluateEveryOrgTradeDonationWebhook,
  getTradeDonationProviderConfig,
  type EveryOrgPartnerWebhookPayload,
  type TradeDonationIntentRow,
  type TradeDonationTermRow,
} from "@/lib/trade-donation";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_WEBHOOK_BYTES = 128 * 1024;

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function notifyActivated(input: {
  agreementId: string;
  proposerId: string;
  responderId: string;
  targetName: string;
  amountCents: number;
  intentId: string;
}, supabase: any) {
  const href = `/trade-agreements/${input.agreementId}`;
  const amount = `$${(input.amountCents / 100).toFixed(2)}`;
  const participantIds = [input.proposerId, input.responderId].filter(Boolean);
  if (participantIds.length !== 2) {
    console.error("[every-org-webhook] activation notification skipped: participant IDs missing", {
      agreementId: input.agreementId,
      intentId: input.intentId,
    });
    return;
  }
  const rows = participantIds.map((userId) => ({
    user_id: userId,
    notification_type: "pledge_donation_verified",
    title: "Donation verified; agreement active",
    body: `Every.org confirmed the frozen ${amount} donation to ${input.targetName}. The reciprocal action is now active.`,
    href,
    dedupe_key: `pledge_donation_verified:${input.intentId}:${userId}`,
  }));
  const { error: notificationError } = await supabase
    .from("trade_notifications")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (notificationError) {
    console.error("[every-org-webhook] notification write failed", {
      message: notificationError.message,
      agreementId: input.agreementId,
    });
  }

  const { data: thread } = await supabase
    .from("trade_threads")
    .select("id")
    .eq("agreement_id", input.agreementId)
    .maybeSingle();
  if (thread?.id) {
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("trade_messages").insert({
        thread_id: thread.id,
        sender_id: null,
        message_type: "system",
        body: `Every.org verified the frozen ${amount} donation to ${input.targetName}. The reciprocal action is now active.`,
        metadata: {
          source: "every_org_pledge_donation",
          donationIntentId: input.intentId,
        },
      }),
      supabase
        .from("trade_threads")
        .update({ last_message_at: now, updated_at: now })
        .eq("id", thread.id),
    ]);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ secret: string }> },
) {
  const authorization = authenticateEveryOrgPartnerWebhookRequest();

  if (!authorization.authorized) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const directConfig = getDirectDonationUpgradeConfig();
  const pledgeConfig = getTradeDonationProviderConfig();
  const { secret } = await context.params;
  const connector = resolveEveryOrgSharedConnector(secret, [
    {
      mechanism: "direct_donation_upgrade",
      enabled:
        directConfig.requestedEnabled && directConfig.mode !== "disabled",
      ready: directConfig.readyForCheckout,
      environment: directConfig.environment,
      webhookPathSecret: directConfig.webhookPathSecret,
    },
    {
      mechanism: "pledge_donation",
      enabled: pledgeConfig.requestedEnabled,
      ready: pledgeConfig.ready,
      environment: pledgeConfig.environment,
      webhookPathSecret: pledgeConfig.webhookPathSecret,
    },
  ]);

  if (!connector.accepted) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const directPathAccepted = connector.mechanisms.includes(
    "direct_donation_upgrade",
  );
  const pledgePathAccepted = connector.mechanisms.includes("pledge_donation");

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  let payload: EveryOrgPartnerWebhookPayload & DirectEveryOrgPartnerWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as EveryOrgPartnerWebhookPayload & DirectEveryOrgPartnerWebhookPayload;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const partnerDonationId = String(payload.partnerDonationId ?? "").trim();
  if (!partnerDonationId) {
    return Response.json({ ok: false, error: "missing_partner_donation_id" }, { status: 400 });
  }

  if (directPathAccepted) {
    const directResult = await handleDirectDonationUpgradeEveryOrgWebhook({
      payload,
      rawBody,
      config: directConfig,
    });
    if (directResult.handled) {
      return Response.json(directResult.body, { status: directResult.status });
    }
  }

  if (!pledgePathAccepted) {
    return Response.json({ ok: true, outcome: "unknown_intent" });
  }

  const supabase = createServiceClient() as any;
  const { data: intentData, error: intentError } = await supabase
    .from("trade_donation_intents")
    .select("*")
    .eq("provider", "every_org")
    .eq("partner_donation_id", partnerDonationId)
    .maybeSingle();
  if (intentError) {
    console.error("[every-org-webhook] intent lookup failed", { message: intentError.message });
    return Response.json({ ok: false, error: "temporary_failure" }, { status: 503 });
  }
  if (!intentData) {
    return Response.json({ ok: true, outcome: "unknown_intent" });
  }
  const intent = intentData as TradeDonationIntentRow;

  const { data: termData, error: termError } = await supabase
    .from("trade_donation_terms")
    .select("*")
    .eq("id", intent.donation_term_id)
    .maybeSingle();
  if (termError) {
    console.error("[every-org-webhook] term lookup failed", { message: termError.message });
    return Response.json({ ok: false, error: "temporary_failure" }, { status: 503 });
  }
  if (!termData) {
    return Response.json({ ok: true, outcome: "orphaned_intent" });
  }
  const term = termData as TradeDonationTermRow;
  const evaluated = evaluateEveryOrgTradeDonationWebhook({
    payload,
    rawBody,
    intent,
    term,
    metadataSecret: pledgeConfig.metadataSecret,
  });

  const { data: completionData, error: completionError } = await supabase.rpc(
    "complete_every_org_trade_donation",
    {
      p_intent_id: intent.id,
      p_provider_charge_id_hash: evaluated.chargeIdHash,
      p_provider_payload_hash: evaluated.payloadHash,
      p_provider_amount_cents: evaluated.amountCents,
      p_provider_currency: evaluated.currency,
      p_provider_nonprofit_slug: evaluated.nonprofitSlug,
      p_provider_nonprofit_ein: evaluated.nonprofitEin,
      p_provider_donation_date: evaluated.donationDate,
      p_provider_payment_method: evaluated.paymentMethod,
      p_is_valid: evaluated.valid,
      p_failure_code: evaluated.failureCode,
      p_failure_message: evaluated.failureMessage,
    },
  );
  if (completionError) {
    console.error("[every-org-webhook] completion transaction failed", {
      message: completionError.message,
      intentId: intent.id,
    });
    return Response.json({ ok: false, error: "temporary_failure" }, { status: 503 });
  }

  const completion = firstRow<Record<string, unknown>>(completionData);
  const outcome = String(completion?.outcome ?? "processed");
  if (outcome === "activated") {
    await notifyActivated({
      agreementId: String(completion?.agreement_id ?? intent.agreement_id),
      proposerId: String(completion?.proposer_id ?? ""),
      responderId: String(completion?.responder_id ?? ""),
      targetName: term.target_name,
      amountCents: term.amount_cents,
      intentId: intent.id,
    }, supabase);
  }

  return Response.json({ ok: true, outcome });
}
