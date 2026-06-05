import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  bucketMpgfPublicGoodsAmountCents,
  recordMpgfPublicGoodsAnalyticsEvent,
} from "@/lib/mpgf/public-goods-analytics";
import {
  createMpgfStripeSavedCommitmentSetup,
  type MpgfStripeSavedCommitmentSetup,
} from "@/lib/mpgf/public-goods-stripe-commitments";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, hasStripeEnv } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};
type MpgfStripeSavedCommitmentInsert =
  Database["public"]["Tables"]["mpgf_stripe_saved_commitments"]["Insert"];

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

function centsNamedField(record: Record<string, unknown>, centsKey: string, dollarsKey: string) {
  const cents = Number(record[centsKey]);

  if (Number.isInteger(cents) && cents > 0) {
    return cents;
  }

  const dollars = Number(record[dollarsKey]);

  return Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined;
}

function stringListField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  return typeof value === "string" ? value : undefined;
}

function booleanField(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function savedCommitmentIdFor(setup: MpgfStripeSavedCommitmentSetup) {
  const stableHash = setup.providerSetupIntentIdHash ?? setup.calcHash;

  return `stripe-saved-commitment-${stableHash.slice(7, 19)}`;
}

function toStripeSavedCommitmentRow(input: {
  futureUseConsentAt: string;
  profileId: string;
  setup: MpgfStripeSavedCommitmentSetup;
}): MpgfStripeSavedCommitmentInsert {
  return {
    id: savedCommitmentIdFor(input.setup),
    round_id: input.setup.roundId,
    campaign_id: input.setup.campaignId,
    conditional_pledge_id: input.setup.conditionalPledgeId,
    pledge_intent_id: input.setup.pledgeIntentId,
    profile_id: input.profileId,
    user_ref_hash: input.setup.userRefHash,
    amount_cents: input.setup.amountCents,
    currency: input.setup.currency,
    provider_customer_id_hash: input.setup.providerCustomerIdHash ?? null,
    provider_setup_intent_id_hash: input.setup.providerSetupIntentIdHash ?? null,
    provider_payment_method_id_hash: input.setup.providerPaymentMethodIdHash ?? null,
    setup_status: input.setup.setupStatus,
    setup_usage: input.setup.setupIntentUsage,
    future_use_consent_at: input.futureUseConsentAt,
    explicit_future_use_consent_required: true,
    creates_charge_immediately: false,
    long_lived_manual_card_hold: false,
    payment_intent_created_before_gates: false,
    raw_card_data_stored: false,
    review_required_before_counting: true,
    final_payout_authorized: false,
    calc_hash: input.setup.calcHash,
    updated_at: input.futureUseConsentAt,
  };
}

async function persistMpgfStripeSavedCommitmentSetup(input: {
  futureUseConsentAt: string;
  profileId: string;
  setup: MpgfStripeSavedCommitmentSetup;
}) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured" as const,
      warning:
        "Supabase service-role persistence is required before an MPGF Stripe saved commitment can be confirmed.",
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const row = toStripeSavedCommitmentRow(input);
  const write = await supabase
    .from("mpgf_stripe_saved_commitments")
    .upsert(row, { onConflict: "provider_setup_intent_id_hash" });

  if (write.error) {
    return {
      ok: false,
      status: "failed" as const,
      warning: write.error.message,
    };
  }

  return {
    ok: true,
    status: "persisted" as const,
    savedCommitmentId: row.id,
  };
}

async function recordSetupIntentAnalytics(input: {
  amountCents: number;
  campaignId: string;
  userId: string;
}) {
  try {
    const result = await recordMpgfPublicGoodsAnalyticsEvent({
      eventType: "contribution_route_selected",
      userId: input.userId,
      campaignId: input.campaignId,
      eventJson: {
        amountBucket: bucketMpgfPublicGoodsAmountCents(input.amountCents),
        captureMode: "stored_payment_method",
        surface: "mpgf_participant_action",
        contributionRoute: "stripe_setup_intent_saved_commitment",
        contributionFunnelStep: "setup_intent_started",
        supportSignalState: "pledge_saved",
        privateByDefault: true,
        publicAggregationOnly: true,
        netNewFundingProxy: "uncertain",
      },
    });

    return {
      ok: result.ok,
      status: result.status,
      eventType: result.row.event_type,
      warning: result.warning,
    };
  } catch (error) {
    return {
      ok: false,
      status: "not_configured" as const,
      warning: error instanceof Error ? error.message : "Could not record MPGF saved-commitment analytics.",
    };
  }
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to save an MPGF Stripe commitment." }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};

    if (!booleanField(record, "explicitFutureUseConsent")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Explicit future-use consent is required before saving an MPGF Stripe commitment.",
          createsChargeImmediately: false,
          finalPayoutAuthorized: false,
        },
        { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    const baseSetup = createMpgfStripeSavedCommitmentSetup({
      acceptableCounterpartBuckets: stringListField(record, "acceptableCounterpartBuckets"),
      amountCents: centsField(record),
      campaignId: stringField(record, "campaignId"),
      conditionalPledgeId: stringField(record, "conditionalPledgeId") || undefined,
      minimumCounterpartyClearedCents: centsNamedField(
        record,
        "minimumCounterpartyClearedCents",
        "minimumCounterpartyClearedDollars",
      ),
      pledgeIntentId: stringField(record, "pledgeIntentId") || undefined,
      roundId: stringField(record, "roundId") || undefined,
      userRef: viewer.authUser.id,
    });
    const analytics = await recordSetupIntentAnalytics({
      amountCents: baseSetup.amountCents,
      campaignId: baseSetup.campaignId,
      userId: viewer.authUser.id,
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
          analytics,
        },
        { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase service-role persistence is required before creating an MPGF Stripe saved commitment.",
          setupIntent: baseSetup,
          clientSecret: null,
          createsChargeImmediately: false,
          finalPayoutAuthorized: false,
          analytics,
          persistence: {
            ok: false,
            status: "not_configured",
          },
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
      acceptableCounterpartBuckets: baseSetup.acceptableCounterpartBuckets,
      amountCents: baseSetup.amountCents,
      campaignId: baseSetup.campaignId,
      conditionalPledgeId: baseSetup.conditionalPledgeId,
      minimumCounterpartyClearedCents: baseSetup.minimumCounterpartyClearedCents,
      pledgeIntentId: baseSetup.pledgeIntentId,
      providerCustomerRef: customer.id,
      providerSetupIntentRef: setupIntent.id,
      roundId: baseSetup.roundId,
      userRef: viewer.authUser.id,
    });
    const futureUseConsentAt = new Date().toISOString();
    const persistence = await persistMpgfStripeSavedCommitmentSetup({
      futureUseConsentAt,
      profileId: viewer.authUser.id,
      setup: setupRecord,
    });

    if (!persistence.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: persistence.warning,
          setupIntent: setupRecord,
          clientSecret: null,
          createsChargeImmediately: false,
          finalPayoutAuthorized: false,
          analytics,
          persistence,
        },
        { status: persistence.status === "not_configured" ? 503 : 500, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        setupIntent: setupRecord,
        clientSecret: setupIntent.client_secret,
        futureUseConsentAt,
        createsChargeImmediately: false,
        nextAction: "confirm_setup_intent_client_side",
        stripeWebhookPath: "/api/mpgf/providers/stripe/webhook",
        conditionalPaymentIntentPath: "/api/mpgf/stripe/conditional-payment-intents",
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
        analytics,
        persistence,
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
