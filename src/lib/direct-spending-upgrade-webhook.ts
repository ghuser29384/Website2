import {
  evaluateDirectDonationUpgradeWebhook,
  type EveryOrgPartnerWebhookPayload,
} from "@/lib/direct-donation-upgrade";
import {
  type DirectSpendingUpgradeConfig,
  type DirectSpendingUpgradeObligationRow,
} from "@/lib/direct-spending-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

export interface DirectSpendingUpgradeWebhookResult {
  handled: boolean;
  status: number;
  body: Record<string, unknown>;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function handleDirectSpendingUpgradeEveryOrgWebhook(input: {
  payload: EveryOrgPartnerWebhookPayload;
  rawBody: string;
  config: DirectSpendingUpgradeConfig;
}): Promise<DirectSpendingUpgradeWebhookResult> {
  const partnerDonationId = String(input.payload.partnerDonationId ?? "").trim();
  const environment = input.config.donationUpgrade.environment;
  if (!partnerDonationId || !environment || !input.config.readyForCheckout) {
    return {
      handled: false,
      status: 200,
      body: { ok: true, outcome: "not_spending_upgrade" },
    };
  }

  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from("direct_spending_upgrade_obligations")
    .select("*")
    .eq("provider", "every_org")
    .eq("environment", environment)
    .eq("partner_donation_id", partnerDonationId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return {
        handled: false,
        status: 200,
        body: { ok: true, outcome: "spending_schema_unavailable" },
      };
    }
    console.error("[direct-spending-upgrade-webhook] obligation lookup failed", {
      message: error.message,
      partnerDonationId,
    });
    return {
      handled: true,
      status: 503,
      body: { ok: false, error: "temporary_failure" },
    };
  }
  if (!data) {
    return {
      handled: false,
      status: 200,
      body: { ok: true, outcome: "unknown_spending_obligation" },
    };
  }

  const obligation = data as DirectSpendingUpgradeObligationRow;
  const evaluated = evaluateDirectDonationUpgradeWebhook({
    payload: input.payload,
    rawBody: input.rawBody,
    obligation,
    metadataSecret: input.config.donationUpgrade.metadataSecret,
    expectedEnvironment: environment,
  });
  const { data: completionData, error: completionError } = await supabase.rpc(
    "complete_direct_spending_upgrade_obligation",
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
      p_expected_environment: environment,
    },
  );
  if (completionError) {
    console.error("[direct-spending-upgrade-webhook] completion transaction failed", {
      message: completionError.message,
      obligationId: obligation.id,
    });
    return {
      handled: true,
      status: 503,
      body: { ok: false, error: "temporary_failure" },
    };
  }

  const completion = firstRow<Record<string, unknown>>(completionData);
  return {
    handled: true,
    status: 200,
    body: {
      ok: true,
      mechanism: "direct_donation_upgrade",
      subtype: "spending_upgrade",
      outcome: String(
        completion?.outcome ??
          (evaluated.valid ? "donation_verified" : "needs_review"),
      ),
    },
  };
}
