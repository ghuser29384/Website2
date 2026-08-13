"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { makeConditionalIdempotencyKey } from "@/lib/payments/conditional-state";
import { getStripe, hasStripeEnv } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import {
  buildEveryOrgTradeDonationPoolBundleUrl,
  buildTradeDonationPoolConditionHash,
  EVERY_ORG_DIRECT_MINIMUM_CENTS,
  isPooledTradeDonationTerm,
  loadTradeDonationPoolAdminSnapshot,
  loadTradeDonationPoolOperationalReadiness,
  TRADE_DONATION_POOL_DISCLOSURE_VERSION,
  type TradeDonationPoolBundleRow,
  type TradeDonationPoolObligationRow,
} from "@/lib/trade-donation-pool";
import {
  getTradeDonationProviderConfig,
  loadTradeDonationAgreementContext,
  rpcRow,
} from "@/lib/trade-donation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeAgreementPath(agreementId: string) {
  return UUID_PATTERN.test(agreementId)
    ? `/trade-agreements/${agreementId}`
    : "/trade-agreements";
}

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const query = new URLSearchParams({ [key]: message });
  redirect(`${path}?${query.toString()}`);
}

async function requirePoolAdmin(returnTo = "/admin/trade-donation-pools") {
  const [viewer, security] = await Promise.all([
    requireViewer(returnTo),
    loadBackgroundAccountSecuritySummary(),
  ]);
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });
  if (!access.allowed) redirectWithMessage(returnTo, "error", access.message);
  return viewer;
}

function stripeMetadata(input: {
  obligation: TradeDonationPoolObligationRow;
}) {
  return {
    purpose: "trade_donation_pool_contribution",
    pooled_obligation_id: input.obligation.id,
    agreement_id: input.obligation.agreement_id,
    agreement_version_id: input.obligation.agreement_version_id,
    donation_term_id: input.obligation.donation_term_id,
    condition_hash: input.obligation.condition_hash,
    disclosure_version: input.obligation.disclosure_version,
    environment: input.obligation.environment,
  };
}

export async function startTradeDonationPoolFundingAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  if (!UUID_PATTERN.test(agreementId)) {
    redirectWithMessage(returnTo, "error", "A valid agreement is required.");
  }
  if (read(formData, "pooled_disclosures") !== "on") {
    redirectWithMessage(
      returnTo,
      "error",
      "Accept the pooled-settlement custody, donor-of-record, tax-receipt, fee, and refund disclosures first.",
    );
  }

  const readiness = await loadTradeDonationPoolOperationalReadiness();
  const config = readiness.config;
  if (!config.readyForParticipantFunding || !config.environment) {
    redirectWithMessage(
      returnTo,
      "error",
      config.blockers[0] ?? "Pooled settlement is not ready for participant funding.",
    );
  }
  if (!hasStripeEnv()) {
    redirectWithMessage(returnTo, "error", "Stripe is not configured.");
  }

  const context = await loadTradeDonationAgreementContext(agreementId);
  if (!context?.term || !isPooledTradeDonationTerm(context.term)) {
    redirectWithMessage(
      returnTo,
      "error",
      `Pooled settlement is used only for donation legs below $${(
        EVERY_ORG_DIRECT_MINIMUM_CENTS / 100
      ).toFixed(2)}.`,
    );
  }
  const agreement = context.agreement as Record<string, unknown>;
  const payerUserId = context.payerUserId;
  if (!payerUserId || payerUserId !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the designated payer can fund this obligation.");
  }
  if (
    String(agreement.lifecycle_status) !== "awaiting_donation" ||
    String(agreement.current_version_id) !== context.term.agreement_version_id
  ) {
    redirectWithMessage(returnTo, "error", "This exact agreement version is not awaiting funding.");
  }

  const conditionHash = buildTradeDonationPoolConditionHash({
    agreementId,
    agreementVersionId: context.term.agreement_version_id,
    donationTermId: context.term.id,
    payerUserId,
    environment: config.environment,
    term: context.term,
  });
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase.rpc("create_trade_donation_pool_obligation", {
    p_actor_id: viewer.authUser.id,
    p_agreement_id: agreementId,
    p_agreement_version_id: context.term.agreement_version_id,
    p_environment: config.environment,
    p_condition_hash: conditionHash,
    p_disclosure_version: TRADE_DONATION_POOL_DISCLOSURE_VERSION,
    p_disclosures_accepted: true,
  });
  const obligation = rpcRow<TradeDonationPoolObligationRow>(data);
  if (error || !obligation) {
    redirectWithMessage(
      returnTo,
      "error",
      error?.message ?? "The pooled obligation could not be created.",
    );
  }

  if (["funded", "bundled", "settled"].includes(obligation.status)) {
    redirectWithMessage(
      returnTo,
      "message",
      obligation.status === "funded"
        ? "Your contribution is verified and waiting for compatible obligations to reach the $10 provider minimum."
        : obligation.status === "bundled"
          ? "Your contribution is locked into an immutable provider bundle."
          : "The consolidated donation was verified and allocated to this agreement.",
    );
  }
  if (["refund_pending", "refunded", "needs_review", "disputed", "cancelled"].includes(obligation.status)) {
    redirectWithMessage(
      returnTo,
      "error",
      obligation.failure_message || `This pooled obligation is ${obligation.status.replaceAll("_", " ")}.`,
    );
  }

  const stripe = getStripe();
  if (obligation.stripe_checkout_session_id && obligation.status === "checkout_started") {
    let existing;
    try {
      existing = await stripe.checkout.sessions.retrieve(
        obligation.stripe_checkout_session_id,
      );
    } catch (checkoutError) {
      redirectWithMessage(
        returnTo,
        "error",
        checkoutError instanceof Error
          ? `Moral Trade could not verify the existing Stripe checkout: ${checkoutError.message}`
          : "Moral Trade could not verify the existing Stripe checkout.",
      );
    }
    if (existing.status === "open" && existing.url) redirect(existing.url);
    if (existing.status === "complete") {
      redirectWithMessage(
        returnTo,
        "message",
        "Stripe reports that checkout completed. Wait for the signed Stripe webhook; do not pay again.",
      );
    }
    if (existing.status !== "expired") {
      redirectWithMessage(
        returnTo,
        "error",
        "The existing Stripe checkout is not open and cannot safely be replaced yet.",
      );
    }
    const reset = await supabase
      .from("trade_donation_pool_obligations")
      .update({
        status: "checkout_abandoned",
        failure_code: "stripe_checkout_expired",
        failure_message: "Stripe reports that the prior Checkout Session expired without payment.",
      })
      .eq("id", obligation.id)
      .eq("payer_user_id", viewer.authUser.id)
      .eq("status", "checkout_started")
      .eq("stripe_checkout_session_id", obligation.stripe_checkout_session_id);
    if (reset.error) {
      redirectWithMessage(returnTo, "error", reset.error.message);
    }
    obligation.status = "checkout_abandoned";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email,display_name")
    .eq("id", viewer.authUser.id)
    .maybeSingle();
  const metadata = stripeMetadata({ obligation });
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const idempotencyKey = makeConditionalIdempotencyKey([
    "pooled-trade-funding-session",
    obligation.id,
    obligation.condition_hash,
    obligation.updated_at,
  ]);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: obligation.id,
      customer_email: profile?.email || viewer.authUser.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: obligation.amount_cents,
            product_data: {
              name: `Moral Trade pooled settlement for ${obligation.target_name}`,
              description:
                "Funds an exact Moral Trade settlement obligation. Moral Trade consolidates compatible obligations and makes the provider-facing charitable gift.",
            },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${siteUrl}${returnTo}?message=${encodeURIComponent(
        "Stripe reported checkout completion. Moral Trade is waiting for its signed webhook before treating the obligation as funded.",
      )}`,
      cancel_url: `${siteUrl}${returnTo}?message=${encodeURIComponent(
        "Pooled-funding checkout was closed. No contribution was verified and no reciprocal action started.",
      )}`,
      expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
      custom_text: {
        submit: {
          message:
            "This payment funds a Moral Trade pooled settlement. Moral Trade—not you—will make the consolidated Every.org gift and is the presumptive provider-facing donor of record. This payment is not represented as your direct tax-deductible donation. Moral Trade absorbs processing fees without reducing the frozen allocation.",
        },
      },
    },
    { idempotencyKey },
  );

  if (!session.url) {
    redirectWithMessage(returnTo, "error", "Stripe did not return a secure Checkout URL.");
  }
  const attached = await supabase.rpc("attach_trade_donation_pool_checkout", {
    p_actor_id: viewer.authUser.id,
    p_obligation_id: obligation.id,
    p_checkout_session_id: session.id,
  });
  if (attached.error) {
    try {
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    } catch {
      // The database remains authoritative and no obligation is funded without the webhook.
    }
    redirectWithMessage(returnTo, "error", attached.error.message);
  }

  redirect(session.url);
}

export async function requestTradeDonationPoolRefundAction(formData: FormData) {
  const agreementId = read(formData, "agreement_id");
  const obligationId = read(formData, "obligation_id");
  const returnTo = safeAgreementPath(agreementId);
  const viewer = await requireViewer(returnTo);
  if (!UUID_PATTERN.test(obligationId) || !hasStripeEnv()) {
    redirectWithMessage(returnTo, "error", "The refundable pooled contribution is unavailable.");
  }

  const supabase = createServiceClient() as any;
  const prepared = await supabase.rpc("prepare_trade_donation_pool_refund", {
    p_actor_id: viewer.authUser.id,
    p_obligation_id: obligationId,
  });
  const obligation = rpcRow<TradeDonationPoolObligationRow>(prepared.data);
  if (prepared.error || !obligation?.stripe_payment_intent_id) {
    redirectWithMessage(
      returnTo,
      "error",
      prepared.error?.message ?? "The pooled contribution cannot be refunded from this state.",
    );
  }

  try {
    await getStripe().refunds.create(
      {
        payment_intent: obligation.stripe_payment_intent_id,
        amount: obligation.amount_cents,
        metadata: {
          purpose: "trade_donation_pool_refund",
          pooled_obligation_id: obligation.id,
          condition_hash: obligation.condition_hash,
        },
      },
      {
        idempotencyKey: makeConditionalIdempotencyKey([
          "pooled-trade-refund",
          obligation.id,
          obligation.stripe_payment_intent_id,
        ]),
      },
    );
  } catch (refundError) {
    await supabase
      .from("trade_donation_pool_obligations")
      .update({
        status: "funded",
        failure_code: "stripe_refund_request_failed",
        failure_message:
          refundError instanceof Error ? refundError.message.slice(0, 500) : "Stripe refund failed.",
      })
      .eq("id", obligation.id)
      .eq("payer_user_id", viewer.authUser.id)
      .eq("status", "refund_pending");
    redirectWithMessage(
      returnTo,
      "error",
      refundError instanceof Error ? refundError.message : "Stripe could not create the refund.",
    );
  }

  revalidatePath(returnTo);
  redirectWithMessage(
    returnTo,
    "message",
    "Refund requested. The contribution remains non-settled until Stripe confirms the refund through its signed webhook.",
  );
}

export async function startTradeDonationPoolBundleCheckoutAction(formData: FormData) {
  const returnTo = "/admin/trade-donation-pools";
  const bundleId = read(formData, "bundle_id");
  const viewer = await requirePoolAdmin(returnTo);
  if (!UUID_PATTERN.test(bundleId)) {
    redirectWithMessage(returnTo, "error", "A valid frozen bundle is required.");
  }

  const [snapshot, everyOrg] = await Promise.all([
    loadTradeDonationPoolAdminSnapshot(),
    Promise.resolve(getTradeDonationProviderConfig()),
  ]);
  if (!snapshot.config.readyForProviderCheckout) {
    redirectWithMessage(
      returnTo,
      "error",
      snapshot.config.blockers[0] ?? "The pooled provider checkout is not ready.",
    );
  }
  if (!everyOrg.ready) {
    redirectWithMessage(
      returnTo,
      "error",
      everyOrg.blockers[0] ?? "The Every.org connector is not ready.",
    );
  }

  const bundle = snapshot.bundles.find((candidate) => candidate.id === bundleId);
  if (!bundle) redirectWithMessage(returnTo, "error", "Bundle not found in the current environment.");
  if (bundle.amount_cents < EVERY_ORG_DIRECT_MINIMUM_CENTS) {
    redirectWithMessage(returnTo, "error", "The frozen bundle does not meet Every.org's $10 minimum.");
  }

  const partnerDonationId = randomUUID();
  const supabase = createServiceClient() as any;
  const started = await supabase.rpc("start_trade_donation_pool_bundle_checkout", {
    p_actor_id: viewer.authUser.id,
    p_bundle_id: bundle.id,
    p_partner_donation_id: partnerDonationId,
  });
  const startedBundle = rpcRow<TradeDonationPoolBundleRow>(started.data);
  if (started.error || !startedBundle?.partner_donation_id) {
    redirectWithMessage(
      returnTo,
      "error",
      started.error?.message ?? "The provider checkout could not be started.",
    );
  }

  const href = buildEveryOrgTradeDonationPoolBundleUrl({
    bundle: startedBundle,
    partnerDonationId: startedBundle.partner_donation_id,
    metadataSecret: everyOrg.metadataSecret,
    webhookToken: everyOrg.webhookToken,
    everyOrgEnvironment: everyOrg.environment,
  });
  redirect(href);
}
