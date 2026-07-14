import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  loadMpgfManualEvidenceReadiness,
  submitMpgfManualExternalPaymentEvidence,
} from "@/lib/mpgf/real-money";
import type { MpgfManualEvidenceProvider } from "@/lib/mpgf/real-money-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const manualEvidenceProviders: readonly MpgfManualEvidenceProvider[] = [
  "open_collective",
  "fiscal_host",
  "bank_transfer",
  "paypal",
  "other",
];

function provider(value: unknown): MpgfManualEvidenceProvider {
  return manualEvidenceProviders.includes(value as MpgfManualEvidenceProvider)
    ? value as MpgfManualEvidenceProvider
    : "other";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function amountDollars(record: Record<string, unknown>) {
  const cents = Number(record.amountCents);

  if (Number.isInteger(cents) && cents > 0) {
    return cents / 100;
  }

  const dollars = Number(record.amountDollars);

  return Number.isFinite(dollars) ? dollars : 0;
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to submit MPGF manual evidence." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF manual evidence expects a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const result = await submitMpgfManualExternalPaymentEvidence({
      userId: viewer.authUser.id,
      amountDollars: amountDollars(record),
      provider: provider(record.provider),
      externalPaymentReference: stringValue(record.externalPaymentReference),
      evidenceUrl: stringValue(record.evidenceUrl) || null,
      evidenceDescription: stringValue(record.evidenceDescription),
      paidAt: stringValue(record.paidAt) || null,
    });

    return NextResponse.json(
      {
        ...result,
        manualEvidenceFallback: true,
        reviewRequiredBeforeCounting: true,
        finalPayoutAuthorized: false,
      },
      { status: result.ok ? 202 : 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not submit MPGF manual evidence.",
        readiness: await loadMpgfManualEvidenceReadiness(),
      },
      { status: 400 },
    );
  }
}
