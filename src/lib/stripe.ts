import Stripe from "stripe";

let stripe: Stripe | null = null;

const DEFAULT_STRIPE_PLATFORM_ACCOUNT_ID = "acct_1TLqUmAf75xWktVp";

export function hasStripeEnv() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  stripe ??= new Stripe(secretKey);

  return stripe;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? "";
}

export function getStripePlatformAccountId() {
  return process.env.STRIPE_PLATFORM_ACCOUNT_ID?.trim() || DEFAULT_STRIPE_PLATFORM_ACCOUNT_ID;
}

export function getPlatformFeeBps() {
  const rawValue = Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? "0");

  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.max(0, Math.min(3000, Math.round(rawValue)));
}

export function calculatePlatformFeeCents(amountCents: number) {
  return Math.floor((amountCents * getPlatformFeeBps()) / 10_000);
}
