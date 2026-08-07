import {
  evaluateDirectDonationUpgradeWebhook,
  type DirectDonationUpgradeConfig,
  type DirectDonationUpgradeObligationRow,
  type EveryOrgPartnerWebhookPayload,
} from "@/lib/direct-donation-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

export interface DirectDonationUpgradeWebhookResult {
  handled: boolean;
  status: number;
  body: Record<string, unknown>;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function handleDirectDonationUpgradeEveryOrgWebhook(input: {
  payload: EveryOrgPartnerWebhookPayload;
  rawBody: string;
  config: DirectDonationUpgradeConfig;
}): Promise<DirectDonationUpgradeWebhookResult> {
  const partnerDonationId = String(input.payload.partnerDonationId ?? "").trim();
  if (!partnerDonationId || !input.config.environment) {
    return { handled: false, status: 200, body: { ok: true, outcome: "not_direct" } };
  }

  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from("direct_donation_upgrade_obligations")
    .select("*")
    .eq("provider", "every_org")
    .eq("partner_donation_id", partnerDonationId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return { handled: false, status: 200, body: { ok: true, outcome: "schema_unavailable" } };
    }
    console.error("[direct-donation-upgrade-webhook] obligation lookup failed", {
      message: error.message,
      partnerDonationId,
    });
    return { handled: true, status: 503, body: { ok: false, error: "temporary_failure" } };
  }
  if (!data) {
    return { handled: false, status: 200, body: { ok: true, outcome: "unknown_direct_obligation" } };
  }

  const obligation = data as DirectDonationUpgradeObligationRow;
  const evaluated = evaluateDirectDonationUpgradeWebhook({
    payload: input.payload,
    rawBody: input.rawBody,
    obligation,
    metadataSecret: input.config.metadataSecret,
    expectedEnvironment: input.config.environment,
  });
  const { data: completionData, error: completionError } = await supabase.rpc(
    "complete_direct_donation_upgrade_obligation",
    {
      p_obligation_id: obligation.id,
      p_valid: evaluated.valid,
      p_failure_code: evaluated.failureCode,
      p_failure_message: evaluated.failureMessage,
      p_provider_charge_id_hash: evaluated.chargeIdHash,
      p_provider_payload_hash: evaluated.payloadHash,
      p_provider_gross_amount_cents: evaluated.grossAmountCents,
      p_provider_net_amount_cents: evaluated.netAmountCents,
      p_provider_currency: evaluated.currency,
      p_provider_nonprofit_slug: evaluated.nonprofitSlug,
      p_provider_nonprofit_ein: evaluated.nonprofitEin,
      p_provider_donation_date: evaluated.donationDate,
      p_provider_payment_method: evaluated.paymentMethod,
    },
  );
  if (completionError) {
    console.error("[direct-donation-upgrade-webhook] completion transaction failed", {
      message: completionError.message,
      obligationId: obligation.id,
    });
    return { handled: true, status: 503, body: { ok: false, error: "temporary_failure" } };
  }

  const completion = firstRow<Record<string, unknown>>(completionData);
  return {
    handled: true,
    status: 200,
    body: {
      ok: true,
      mechanism: "direct_donation_upgrade",
      outcome: String(completion?.outcome ?? (evaluated.valid ? "processed" : "needs_review")),
    },
  };
}
