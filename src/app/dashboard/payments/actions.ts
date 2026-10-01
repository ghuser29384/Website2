"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/app-data";
import { ACCOUNT_PAYMENTS_PATH, AccountPaymentError } from "@/lib/payments/account-payment-policy";
import { accountPayments, takeAccountPaymentSetupSlot } from "@/lib/payments/account-payments";

async function runPaymentAction(work: (actor: { id: string; email?: string; name?: string }) => Promise<string | void>) {
  // Authentication redirects stay outside error handling; no client-supplied owner IDs.
  const viewer = await requireViewer(ACCOUNT_PAYMENTS_PATH);
  let destination: string | void;
  try {
    await takeAccountPaymentSetupSlot(viewer.authUser.id);
    destination = await work({ id: viewer.authUser.id, email: viewer.authUser.email, name: viewer.displayName });
  } catch (error) {
    const text = error instanceof AccountPaymentError ? error.message : "Stripe could not complete this request. Please try again or contact support.";
    redirect(`${ACCOUNT_PAYMENTS_PATH}?error=${encodeURIComponent(text)}`);
  }
  revalidatePath(ACCOUNT_PAYMENTS_PATH);
  redirect(destination || ACCOUNT_PAYMENTS_PATH);
}

export async function addPaymentMethodAction(form: FormData) {
  await runPaymentAction(async (actor) => {
    const consent = form.get("save_consent") === "on";
    if (!consent) throw new AccountPaymentError("Please agree to save your payment method before continuing.");
    const { service } = await accountPayments();
    return service.addMethod(actor, consent, String(form.get("request_id") ?? ""));
  });
}
export async function removePaymentMethodAction(form: FormData) {
  await runPaymentAction(async (actor) => {
    const { service } = await accountPayments();
    await service.removeMethod(actor, String(form.get("payment_method_id") ?? ""), form.get("confirm_remove") === "on");
  });
}
export async function setupReceivingAction(form: FormData) {
  await runPaymentAction(async (actor) => {
    const { service } = await accountPayments();
    return service.beginReceiving(actor, String(form.get("country") ?? ""));
  });
}
export async function refreshReceivingAction() {
  await runPaymentAction(async (actor) => {
    await (await accountPayments()).service.refreshReceiving(actor);
  });
}
export async function manageReceivingAction() {
  await runPaymentAction(async (actor) => (await accountPayments()).service.manageReceiving(actor));
}
