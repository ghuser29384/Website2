"use server";

import { redirect } from "next/navigation";

import {
  cancelAwaitingTradeDonationAction as cancelAwaitingTradeDonationActionBase,
  configureTradeDonationAction as configureTradeDonationActionBase,
  confirmDonationAwareAgreementVersionAction as confirmDonationAwareAgreementVersionActionBase,
  confirmDonationAwareTradeCompletionAction as confirmDonationAwareTradeCompletionActionBase,
  startTradeDonationCheckoutAction as startTradeDonationCheckoutActionBase,
} from "@/app/trade-donation-actions-base";
import { getTradeDonationProviderConfig } from "@/lib/trade-donation";

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
  return confirmDonationAwareTradeCompletionActionBase(formData);
}

export async function startTradeDonationCheckoutAction(formData: FormData) {
  return startTradeDonationCheckoutActionBase(formData);
}

export async function cancelAwaitingTradeDonationAction(formData: FormData) {
  return cancelAwaitingTradeDonationActionBase(formData);
}
