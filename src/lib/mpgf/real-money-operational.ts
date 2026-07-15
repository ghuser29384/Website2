import { randomUUID } from "node:crypto";

import type Stripe from "stripe";

import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

import { demoCycle } from "./data";
import * as legacy from "./real-money";
import type { MpgfRealMoneyCheckoutResult, MpgfRealMoneyReadiness } from "./real-money-types";

export {
  buildMpgfPublicGoodsRefundReconciliationPlan,
  buildMpgfSubscriptionCancellationUpdate,
  canRecordMpgfSponsorPoolInvoice,
  handleMpgfStripeWebhookEvent,
  hashStripeWebhookBody,
  loadMpgfManualEvidenceReadiness,
  loadMpgfRealMoneyAccountState,
  requestMpgfRefund,
  submitMpgfManualExternalPaymentEvidence,
} from "./real-money";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

type MpgfPaymentMode = MpgfRealMoneyReadiness["mode"];

const TEST_PAYMENT_TABLES = [
  "mpgf_payment_intents",
  "mpgf_payment_webhook_events",
  "mpgf_contributions",
  "mpgf_recurring_contribution_commitments",
  "mpgf_refunds",
] as const;

function trimmed(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function resolvePublishableKey(env: NodeJS.ProcessEnv) {
  return trimmed(env.STRIPE_PUBLISHABLE_KEY) ?? trimmed(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

function resolvePaymentMode(env: NodeJS.ProcessEnv): MpgfPaymentMode {
  const realEnabled = env.MPGF_REAL_MONEY_ENABLED === "true";
  const testEnabled = env.MPGF_TEST_PAYMENT_ENABLED === "true";

  if (realEnabled === testEnabled) {
    return "blocked";
  }

  return realEnabled ? "real_money" : "test_payment";
}

export function evaluateMpgfPaymentEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): Pick<MpgfRealMoneyReadiness, "mode" | "blockers"> {
  const blockers: string[] = [];
  const realEnabled = env.MPGF_REAL_MONEY_ENABLED === "true";
  const testEnabled = env.MPGF_TEST_PAYMENT_ENABLED === "true";
  const mode = resolvePaymentMode(env);
  const secretKey = trimmed(env.STRIPE_SECRET_KEY);
  const publishableKey = resolvePublishableKey(env);
  const webhookSecret = trimmed(env.STRIPE_WEBHOOK_SECRET);

  if (realEnabled && testEnabled) {
    blockers.push("MPGF real-money and test-payment modes cannot both be enabled.");
  } else if (!realEnabled && !testEnabled) {
    blockers.push("Enable exactly one MPGF payment mode: test payment or real money.");
  }

  if (!secretKey) {
    blockers.push("STRIPE_SECRET_KEY is missing.");
  } else if (mode === "test_payment" && !secretKey.startsWith("sk_test_")) {
    blockers.push("MPGF test-payment mode requires a Stripe test secret key.");
  } else if (mode === "real_money" && !secretKey.startsWith("sk_live_")) {
    blockers.push("MPGF real-money mode requires a Stripe live secret key.");
  }

  if (!publishableKey) {
    blockers.push("Stripe publishable key is missing.");
  } else if (mode === "test_payment" && !publishableKey.startsWith("pk_test_")) {
    blockers.push("MPGF test-payment mode requires a Stripe test publishable key.");
  } else if (mode === "real_money" && !publishableKey.startsWith("pk_live_")) {
    blockers.push("MPGF real-money mode requires a Stripe live publishable key.");
  }

  if (!webhookSecret) {
    blockers.push("STRIPE_WEBHOOK_SECRET is missing.");
  } else if (!webhookSecret.startsWith("whsec_")) {
    blockers.push("STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret.");
  }

  if (!trimmed(env.SUPABASE_SERVICE_ROLE_KEY)) {
    blockers.push("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }

  if (mode === "real_money" && env.MPGF_REAL_MONEY_ACCEPTANCE_ENABLED !== "true") {
    blockers.push("MPGF_REAL_MONEY_ACCEPTANCE_ENABLED is not true.");
  }

  return { mode, blockers: unique(blockers) };
}

async function testPaymentSchemaBlockers() {
  const blockers: string[] = [];
  const supabase = createServiceClient() as SupabaseServiceAny;

  for (const table of TEST_PAYMENT_TABLES) {
    const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    if (error) {
      blockers.push(`Required MPGF test-payment table is unavailable: ${table}.`);
    }
  }

  return blockers;
}

export async function loadMpgfRealMoneyReadiness(): Promise<MpgfRealMoneyReadiness> {
  const environment = evaluateMpgfPaymentEnvironment(process.env);

  if (environment.mode === "real_money") {
    const base = await legacy.loadMpgfRealMoneyReadiness();
    const blockers = unique([...base.blockers, ...environment.blockers]);
    return {
      ...base,
      mode: "real_money",
      ready: blockers.length === 0,
      blockers,
    };
  }

  const blockers = [...environment.blockers];

  if (!hasSupabaseEnv()) {
    blockers.push("Supabase public environment variables are missing.");
  }

  if (
    environment.mode === "test_payment" &&
    blockers.length === 0
  ) {
    try {
      blockers.push(...(await testPaymentSchemaBlockers()));
    } catch {
      blockers.push("MPGF test-payment schema could not be checked.");
    }
  }

  return {
    ready: blockers.length === 0,
    mode: environment.mode,
    blockers: unique(blockers),
    requiredGates: [],
  };
}

export async function assertMpgfRealMoneyReady() {
  const readiness = await loadMpgfRealMoneyReadiness();

  if (!readiness.ready) {
    throw new Error(`MPGF payment mode is blocked: ${readiness.blockers.join(" ")}`);
  }

  return readiness;
}

function toCents(value: number, label: string) {
  const cents = Math.round(value * 100);

  if (!Number.isFinite(value) || !Number.isInteger(cents) || cents < 100) {
    throw new Error(`${label} must be at least $1.00.`);
  }

  if (cents > 100_000_00) {
    throw new Error(`${label} must be $100,000 or less.`);
  }

  return cents;
}

function metadataText(value: string | null | undefined) {
  const normalized = trimmed(value);
  return normalized ? normalized.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 100) : "";
}

function metadataCents(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? String(value) : "";
}

function stripeObjectId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  return null;
}

export async function createMpgfRealMoneyCheckout(input: {
  userId: string;
  displayName: string;
  email?: string | null;
  amountDollars: number;
  cadence: "one_time" | "monthly";
  publicGoodsCampaignId?: string | null;
  publicGoodsRoundId?: string | null;
  publicGoodsSponsorPoolContribution?: boolean;
  publicGoodsCountForMatching?: boolean;
  publicGoodsPerDonorCapCents?: number;
}): Promise<MpgfRealMoneyCheckoutResult> {
  const readiness = await loadMpgfRealMoneyReadiness();

  if (!readiness.ready) {
    return {
      ok: false,
      message: "MPGF payment checkout is not enabled yet.",
      readiness,
    };
  }

  if (readiness.mode === "real_money") {
    return legacy.createMpgfRealMoneyCheckout(input);
  }

  const amountCents = toCents(input.amountDollars, "MPGF test contribution amount");
  const supabase = createServiceClient() as SupabaseServiceAny;
  const cadence = input.cadence;
  const recurringCommitment =
    cadence === "monthly"
      ? await supabase
          .from("mpgf_recurring_contribution_commitments")
          .insert({
            user_id: input.userId,
            amount_cents: amountCents,
            currency: "usd",
            cadence: "monthly",
            mode: "test_payment",
            status: "provider_action_required",
            start_cycle_id: demoCycle.id,
            next_cycle_id: demoCycle.id,
          })
          .select("id")
          .single()
      : null;

  if (recurringCommitment?.error) {
    throw new Error(`Could not create MPGF test recurring-contribution record: ${recurringCommitment.error.message}`);
  }

  const paymentIntentRecord = await supabase
    .from("mpgf_payment_intents")
    .insert({
      intended_cycle_id: demoCycle.id,
      budget_effective_cycle_id: demoCycle.id,
      user_id: input.userId,
      amount_cents: amountCents,
      currency: "usd",
      mode: "test_payment",
      provider: "stripe",
      status: "created",
      cadence,
      checkout_mode: cadence === "monthly" ? "subscription" : "payment",
      idempotency_key: `mpgf-test-${input.userId}-${demoCycle.id}-${cadence}-${randomUUID()}`,
    })
    .select("id")
    .single();

  if (paymentIntentRecord.error) {
    throw new Error(`Could not create MPGF test payment record: ${paymentIntentRecord.error.message}`);
  }

  const metadata = {
    purpose: "mpgf_contribution",
    mpgf_payment_intent_id: String(paymentIntentRecord.data.id),
    mpgf_recurring_commitment_id: recurringCommitment?.data?.id ? String(recurringCommitment.data.id) : "",
    mpgf_cycle_id: demoCycle.id,
    mpgf_user_id: input.userId,
    mpgf_cadence: cadence,
    mpgf_mode: "test_payment",
    mpgf_public_goods_round_id: metadataText(input.publicGoodsRoundId),
    mpgf_public_goods_campaign_id: metadataText(input.publicGoodsCampaignId),
    mpgf_public_goods_count_for_matching: input.publicGoodsCountForMatching === false ? "false" : "true",
    mpgf_public_goods_per_donor_cap_cents: metadataCents(input.publicGoodsPerDonorCapCents),
    mpgf_public_goods_sponsor_pool: input.publicGoodsSponsorPoolContribution ? "true" : "false",
  };
  const siteUrl = getSiteUrl();
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: cadence === "monthly" ? "subscription" : "payment",
    client_reference_id: input.userId,
    customer_email: input.email ?? undefined,
    metadata,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name:
              cadence === "monthly"
                ? "TEST MODE — Monthly Moral Public Goods Fund contribution"
                : "TEST MODE — Moral Public Goods Fund contribution",
            description: "Stripe test-mode contribution. No real money moves and no payout is authorized.",
          },
          recurring: cadence === "monthly" ? { interval: "month" } : undefined,
        },
      },
    ],
    success_url: `${siteUrl}/mpgf/contribute/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/mpgf/contribute/cancel`,
    consent_collection: {
      terms_of_service: "required",
    },
    custom_text: {
      terms_of_service_acceptance: {
        message: "I understand this is a Stripe test-mode transaction. No real money moves and no payout is authorized.",
      },
    },
  };

  if (cadence === "monthly") {
    sessionParams.subscription_data = { metadata };
  } else {
    sessionParams.payment_intent_data = { metadata };
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);
  const update = await supabase
    .from("mpgf_payment_intents")
    .update({
      status: "requires_action",
      stripe_checkout_session_id: session.id,
      stripe_customer_id: stripeObjectId(session.customer),
      metadata_json: metadata,
    })
    .eq("id", paymentIntentRecord.data.id);

  if (update.error) {
    throw new Error(`Could not persist the MPGF test Checkout session: ${update.error.message}`);
  }

  return {
    ok: true,
    message: "Stripe test Checkout session created.",
    checkoutUrl: session.url ?? undefined,
    readiness,
  };
}

export async function createMpgfBillingPortal(input: { userId: string }): Promise<MpgfRealMoneyCheckoutResult> {
  const readiness = await loadMpgfRealMoneyReadiness();

  if (!readiness.ready) {
    return {
      ok: false,
      message: "MPGF Stripe Billing management is not enabled yet.",
      readiness,
    };
  }

  if (readiness.mode === "real_money") {
    return legacy.createMpgfBillingPortal(input);
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { data: commitment, error } = await supabase
    .from("mpgf_recurring_contribution_commitments")
    .select("id, provider_customer_id, provider_subscription_id")
    .eq("user_id", input.userId)
    .eq("mode", "test_payment")
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read MPGF test billing state: ${error.message}`);
  }

  if (!commitment?.provider_customer_id) {
    return {
      ok: false,
      message: "No active MPGF Stripe test Billing customer was found for this account.",
      readiness,
    };
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: commitment.provider_customer_id,
    return_url: `${getSiteUrl()}/mpgf/account/contributions`,
  });

  return {
    ok: true,
    message: "Stripe test Billing portal session created.",
    checkoutUrl: portalSession.url,
    readiness,
  };
}
