import { NextResponse } from "next/server";

import { demoMpgfAssuranceRound } from "@/lib/mpgf/data";
import { MPGF_PUBLIC_GOODS_API_HEADERS } from "@/lib/mpgf/public-goods-api";
import {
  buildMpgfEveryOrgDonateLink,
  buildMpgfEveryOrgPartnerDonationId,
} from "@/lib/mpgf/public-goods-every-org";

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

function publicWebhookToken() {
  return process.env.MPGF_EVERY_ORG_PUBLIC_WEBHOOK_TOKEN?.trim() || undefined;
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

function responseFor(record: Record<string, unknown>, requestUrl: string) {
  const campaignId = stringField(record, "campaignId");

  if (!campaignId) {
    return NextResponse.json(
      { ok: false, error: "MPGF Every.org Donate Link requires campaignId." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }

  const partnerDonationId = buildMpgfEveryOrgPartnerDonationId({
    campaignId,
    conditionalPledgeId: stringField(record, "conditionalPledgeId"),
    pledgeIntentId: stringField(record, "pledgeIntentId"),
    roundId: stringField(record, "roundId") ?? demoMpgfAssuranceRound.id,
    userRef: stringField(record, "userRef"),
  });
  const donateLink = buildMpgfEveryOrgDonateLink({
    amountCents: numberField(record, "amountCents"),
    campaignId,
    conditionalPledgeId: stringField(record, "conditionalPledgeId"),
    exitUrl: stringField(record, "exitUrl") ?? exitUrlFor(requestUrl),
    pledgeIntentId: stringField(record, "pledgeIntentId"),
    roundId: stringField(record, "roundId") ?? undefined,
    successUrl: stringField(record, "successUrl") ?? successUrlFor(requestUrl, partnerDonationId),
    userRef: stringField(record, "userRef"),
    webhookToken: publicWebhookToken(),
  });

  return NextResponse.json(
    {
      ok: true,
      donateLink,
      pendingState: "pending_webhook_not_counted",
      webhookPath: "/api/mpgf/every-org/webhook",
      reviewRequiredBeforeCounting: true,
      finalPayoutAuthorized: false,
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
    return responseFor(record, request.url);
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

    return responseFor(payload as Record<string, unknown>, request.url);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create MPGF Every.org Donate Link." },
      { status: 400, headers: MPGF_PUBLIC_GOODS_API_HEADERS },
    );
  }
}
