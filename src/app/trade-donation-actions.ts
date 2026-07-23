"use server";

import { redirect } from "next/navigation";

import { confirmTradeCompletionAction as confirmAtomicTradeCompletionAction } from "@/app/core-trade-actions-hardened";
import {
  cancelAwaitingTradeDonationAction as cancelAwaitingTradeDonationActionBase,
  configureTradeDonationAction as configureTradeDonationActionBase,
  confirmDonationAwareAgreementVersionAction as confirmDonationAwareAgreementVersionActionBase,
  startTradeDonationCheckoutAction as startTradeDonationCheckoutActionBase,
} from "@/app/trade-donation-actions-base";
import { requireViewer } from "@/lib/app-data";
import {
  getTradeDonationProviderConfig,
  loadTradeDonationAgreementContext,
} from "@/lib/trade-donation";
import { createServiceClient } from "@/lib/supabase/server";

function readAgreementId(formData: FormData) {
  return String(formData.get("agreement_id") ?? "").trim();
}

function agreementPath(agreementId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    agreementId,
  )
    ? `/trade-agreements/${agreementId}`
    : "/trade-agreements";
}

function redirectWithError(agreementId: string, message: string): never {
  const query = new URLSearchParams({ error: message });
  redirect(`${agreementPath(agreementId)}?${query.toString()}`);
}

export async function configureTradeDonationAction(formData: FormData) {
  const config = getTradeDonationProviderConfig();
  if (!config.ready) {
    const query = new URLSearchParams({
      error: config.blockers[0] ?? "The Every.org connector is not launch-ready.",
    });
    redirect(`${agreementPath(readAgreementId(formData))}?${query.toString()}`);
  }
  return configureTradeDonationActionBase(formData);
}

export async function confirmDonationAwareAgreementVersionAction(formData: FormData) {
  return confirmDonationAwareAgreementVersionActionBase(formData);
}

export async function confirmDonationAwareTradeCompletionAction(formData: FormData) {
  const agreementId = readAgreementId(formData);
  const context = await loadTradeDonationAgreementContext(agreementId);

  if (context?.term) {
    const returnTo = agreementPath(agreementId);
    const viewer = await requireViewer(returnTo);
    const agreement = context.agreement as Record<string, unknown>;
    if (
      String(agreement.proposer_id) !== viewer.authUser.id &&
      String(agreement.responder_id) !== viewer.authUser.id
    ) {
      redirectWithError(agreementId, "Only an agreement participant can confirm completion.");
    }

    const supabase = createServiceClient() as any;
    const { count, error } = await supabase
      .from("trade_evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", agreementId)
      .eq("status", "accepted")
      .neq("evidence_type", "provider_donation");
    if (error) {
      redirectWithError(agreementId, error.message);
    }
    if ((count ?? 0) < 1) {
      redirectWithError(
        agreementId,
        "The provider donation activates this trade but does not prove the reciprocal action. Submit and accept separate performance evidence before final completion.",
      );
    }
  }

  return confirmAtomicTradeCompletionAction(formData);
}

export async function startTradeDonationCheckoutAction(formData: FormData) {
  return startTradeDonationCheckoutActionBase(formData);
}

export async function cancelAwaitingTradeDonationAction(formData: FormData) {
  return cancelAwaitingTradeDonationActionBase(formData);
}
