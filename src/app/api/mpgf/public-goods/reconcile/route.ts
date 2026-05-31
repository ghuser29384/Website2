import { NextResponse } from "next/server";

import {
  reconcileMpgfPublicGoodsPaymentProof,
  type ReconcileMpgfPublicGoodsPaymentProofInput,
} from "@/lib/mpgf/public-goods-reconciliation";
import type { MpgfPublicGoodsPaymentProof } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.MPGF_RECONCILIATION_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  return record[key] === true;
}

function readAmount(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer number of cents.`);
  }

  return value;
}

function readReconciliationSource(
  value: string | undefined,
): MpgfPublicGoodsPaymentProof["reconciliationSource"] | undefined {
  if (value === "external_receipt" || value === "fiscal_host_webhook" || value === "sponsor_signed_intent") {
    return value;
  }

  if (value) {
    throw new Error("reconciliationSource is not supported.");
  }

  return undefined;
}

function parsePayload(payload: unknown): ReconcileMpgfPublicGoodsPaymentProofInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("MPGF public-goods reconciliation expects a JSON object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    pledgeId: readString(record, "pledgeId") ?? "",
    amountVerifiedCents: readAmount(record, "amountVerifiedCents"),
    verified: readBoolean(record, "verified"),
    sourceEventRef: readString(record, "sourceEventRef") ?? "",
    reconciliationSource: readReconciliationSource(readString(record, "reconciliationSource")),
    externalReceiptRef: readString(record, "externalReceiptRef"),
    charityReceiptRef: readString(record, "charityReceiptRef"),
    reviewerId: readString(record, "reviewerId"),
  };
}

export async function POST(request: Request) {
  if (!process.env.MPGF_RECONCILIATION_SECRET && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "MPGF public-goods reconciliation is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized MPGF public-goods reconciliation request." }, { status: 401 });
  }

  try {
    const result = await reconcileMpgfPublicGoodsPaymentProof(parsePayload(await request.json()));

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      paymentProof: {
        id: result.paymentProof.id,
        campaignId: result.paymentProof.campaignId,
        pledgeId: result.paymentProof.pledgeId,
        sourceEventRef: result.paymentProof.sourceEventRef,
        status: result.paymentProof.status,
        reasonCode: result.paymentProof.reasonCode,
        reconciliationSource: result.paymentProof.reconciliationSource,
        amountVerifiedCents: result.paymentProof.amountVerifiedCents,
      },
      reviewCase: {
        campaignId: result.reviewCase.campaignId,
        state: result.reviewCase.state,
        reasonCode: result.reviewCase.reasonCode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not reconcile MPGF public-goods handoff.",
      },
      { status: 400 },
    );
  }
}
