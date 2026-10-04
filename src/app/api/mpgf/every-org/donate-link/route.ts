import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { demoMpgfAssuranceRound } from "@/lib/mpgf/data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  bucketMpgfPublicGoodsAmountCents,
  recordMpgfPublicGoodsAnalyticsEvent,
} from "@/lib/mpgf/public-goods-analytics";
import {
  buildMpgfEveryOrgDonateLink,
  buildMpgfEveryOrgPartnerDonationId,
} from "@/lib/mpgf/public-goods-every-org";
import { getEveryOrgCredentialConfiguration } from "@/lib/every-org-partner-webhook-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function successUrlFor(requestUrl: string, partnerDonationId?: string) {
  const url = new URL(requestUrl);
  const pending = new URL("/mpgf/contribute/every-org/pending", url.origin);

  if (partnerDonationId) {
    pending.searchParams.set("partnerDonationId", partnerDonationId);
  }

  return pending.toString();
}

function exitUrlFor(requestUrl: string) {
  const url = new URL(requestUrl);

  return new URL("/mpgf/contribute/cancel", url.origin).toString();
}

async function recordDonateLinkAnalytics({
  amountCents,
  campaignId,
  userId,
}: {
  amountCents?: number;
  campaignId: string;
  userId?: string;
}) {
  try {
    const result = await recordMpgfPublicGoodsAnalyticsEvent({
      eventType: "contribution_route_selected",
      userId,
      campaignId,
      eventJson: {
        ...(typeof amountCents === "number" ? { amountBucket: bucketMpgfPublicGoodsAmountCents(amountCents) } : {}),
        captureMode: "external_handoff",
        surface: "public_campaign_page",
        contributionRoute: "every_org_fast_route",
        contributionFunnelStep: "provider_link_created",
        supportSignalState: "pending_verification",
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
      warning: error instanceof Error ? error.message : "Could not record MPGF fast-route analytics.",
    };
  }
}

async function responseFor(record: Record<string, unknown>, requestUrl: string) {
  const campaignId = stringField(record, "campaignId");
  const credentials = getEveryOrgCredentialConfiguration();

  if (!campaignId) {
    return NextResponse.json(
      { ok: false, error: "MPGF Every.org Donate Link requires campaignId." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  if (
    !credentials.credentialConfigurationValid ||
    !credentials.partnerWebhookAuthorizationReady
  ) {
    return NextResponse.json(
      { ok: false, error: "The Every.org connector is not configured." },
      { status: 503, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  const viewer = await getViewer();
  const userRef = stringField(record, "userRef") ?? viewer?.authUser.id;
  const amountCents = numberField(record, "amountCents");
  const partnerDonationId = buildMpgfEveryOrgPartnerDonationId({
    campaignId,
    conditionalPledgeId: stringField(record, "conditionalPledgeId"),
    pledgeIntentId: stringField(record, "pledgeIntentId"),
    roundId: stringField(record, "roundId") ?? demoMpgfAssuranceRound.id,
    userRef,
  });
  const donateLink = buildMpgfEveryOrgDonateLink({
    amountCents,
    campaignId,
    conditionalPledgeId: stringField(record, "conditionalPledgeId"),
    exitUrl: stringField(record, "exitUrl") ?? exitUrlFor(requestUrl),
    pledgeIntentId: stringField(record, "pledgeIntentId"),
    roundId: stringField(record, "roundId") ?? undefined,
    successUrl: stringField(record, "successUrl") ?? successUrlFor(requestUrl, partnerDonationId),
    userRef,
    donateLinkWebhookToken: credentials.donateLinkWebhookToken,
  });
  const analytics = await recordDonateLinkAnalytics({
    amountCents,
    campaignId,
    userId: viewer?.authUser.id,
  });

  return NextResponse.json(
    {
      ok: true,
      donateLink,
      pendingState: "pending_webhook_not_counted",
      webhookPath: "/api/mpgf/every-org/webhook",
      reviewRequiredBeforeCounting: true,
      finalPayoutAuthorized: false,
      analytics,
    },
    { headers: MPGF_PUBLIC_GOODS_API_HEADERS },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const amount = Number(url.searchParams.get("amountCents"));
  const record: Record<string, unknown> = {
    amountCents: Number.isFinite(amount) ? amount : undefined,
    campaignId: url.searchParams.get("campaignId") ?? undefined,
    conditionalPledgeId: url.searchParams.get("conditionalPledgeId") ?? undefined,
    pledgeIntentId: url.searchParams.get("pledgeIntentId") ?? undefined,
  };

  try {
    return await responseFor(record, request.url);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create MPGF Every.org Donate Link." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("MPGF Every.org Donate Link expects a JSON object.");
    }

    return await responseFor(payload as Record<string, unknown>, request.url);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create MPGF Every.org Donate Link." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
