import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import { createMpgfStripeSavedCommitmentSetup } from "@/lib/mpgf/public-goods-stripe-commitments";
import { getStripe, hasStripeEnv } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function centsField(record: Record<string, unknown>) {
  const cents = Number(record.amountCents);

  if (Number.isInteger(cents) && cents > 0) {
    return cents;
  }

  const dollars = Number(record.amountDollars);

  return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to save an MPGF Stripe commitment." }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const baseSetup = createMpgfStripeSavedCommitmentSetup({
      amountCents: centsField(record),
      campaignId: stringField(record, "campaignId"),
      conditionalPledgeId: stringField(record, "conditionalPledgeId") || undefined,
      pledgeIntentId: stringField(record, "pledgeIntentId") || undefined,
      roundId: stringField(record, "roundId") || undefined,
      userRef: viewer.authUser.id,
    });

    if (!hasStripeEnv()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured for MPGF saved commitments.",
          setupIntent: baseSetup,
          clientSecret: null,
          createsChargeImmediately: false,
          finalPayoutAuthorized: false,
        },
        { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: viewer.authUser.email ?? undefined,
      name: viewer.displayName ?? undefined,
      metadata: {
        purpose: "mpgf_public_goods_saved_commitment",
        roundId: baseSetup.roundId,
        campaignId: baseSetup.campaignId,
        pledgeIntentId: baseSetup.pledgeIntentId,
      },
    });
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { ...baseSetup.setupIntentCreateParams.metadata },
    });
    const setupRecord = createMpgfStripeSavedCommitmentSetup({
      amountCents: baseSetup.amountCents,
      campaignId: baseSetup.campaignId,
      conditionalPledgeId: baseSetup.conditionalPledgeId,
      pledgeIntentId: baseSetup.pledgeIntentId,
      providerCustomerRef: customer.id,
      providerSetupIntentRef: setupIntent.id,
      roundId: baseSetup.roundId,
      userRef: viewer.authUser.id,
    });

    return NextResponse.json(
      {
        ok: true,
        setupIntent: setupRecord,
        clientSecret: setupIntent.client_secret,
        createsChargeImmediately: false,
        nextAction: "confirm_setup_intent_client_side",
        stripeWebhookPath: "/api/mpgf/providers/stripe/webhook",
        conditionalPaymentIntentPath: "/api/mpgf/stripe/conditional-payment-intents",
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: 201, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create MPGF Stripe SetupIntent." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
