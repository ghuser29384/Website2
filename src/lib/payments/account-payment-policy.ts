import type Stripe from "stripe";

export const ACCOUNT_PAYMENTS_PATH = "/dashboard/payments";
export const PAYMENT_METHOD_CONSENT_VERSION = "account-payment-methods-2026-09-28";
export const PAYMENT_METHOD_CONSENT =
  "Save this payment method with Stripe for future Moral Trade checkouts I approve. Saving it does not authorize a charge or change an existing trade.";
export const ACCOUNT_PAYMENT_PURPOSE = "account_payment_method";
export const MAX_SAVED_PAYMENT_METHODS = 20;

export class AccountPaymentError extends Error {}

export function accountPaymentMode(env: Record<string, string | undefined>): boolean {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const live = /^(sk|rk)_live_/.test(key);
  const test = /^(sk|rk)_test_/.test(key);
  if (!live && !test) throw new AccountPaymentError("Payment setup is not configured. Please contact support.");
  if (env.VERCEL_ENV === "production" && !live) {
    throw new AccountPaymentError("Live payment setup is not available. Please contact support.");
  }
  if (env.VERCEL_ENV !== "production" && live) {
    throw new AccountPaymentError("This environment cannot use live payment credentials.");
  }
  return live;
}

export function assertUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AccountPaymentError("This request has expired. Reload the page and try again.");
  }
}

export function stripeObjectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function safeStripeDestination(value: string | null | undefined) {
  let url: URL;
  try { url = new URL(value ?? ""); } catch { throw new AccountPaymentError("Stripe did not return a valid setup link. Please try again."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !["checkout.stripe.com", "connect.stripe.com", "dashboard.stripe.com", "billing.stripe.com"].includes(url.hostname)) {
    throw new AccountPaymentError("Stripe did not return a valid setup link. Please try again.");
  }
  return url.href;
}

export function paymentReturnOrigin(value: string, live: boolean) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && !live && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new AccountPaymentError("Payment return address is not configured correctly.");
  }
  return url.origin;
}

export function maskPaymentMethod(method: Stripe.PaymentMethod) {
  const card = method.card;
  const bank = method.us_bank_account ?? method.sepa_debit ?? method.bacs_debit ?? method.au_becs_debit;
  return {
    id: method.id,
    label: card ? `${card.brand.toUpperCase()} ending in ${card.last4}`
      : bank ? `Bank account ending in ${bank.last4}` : method.type.replaceAll("_", " "),
    expiry: card ? `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}` : null,
  };
}

export function payoutStatus(account: Stripe.Account) {
  if (account.requirements?.disabled_reason) return "Action required";
  if (account.charges_enabled && account.payouts_enabled && account.capabilities?.transfers === "active") return "Stripe setup complete";
  if (!account.details_submitted || account.requirements?.currently_due?.length) return "Setup incomplete";
  return "Stripe review pending";
}
