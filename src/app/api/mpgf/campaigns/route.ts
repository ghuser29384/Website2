import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import { persistMpgfPoolProposal } from "@/lib/mpgf/persistence";
import type { MpgfPublicGoodsCaptureMode, MpgfPublicGoodsDestinationType } from "@/lib/mpgf/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberField(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number(record[key]);

  return Number.isFinite(value) ? value : fallback;
}

function centsField(record: Record<string, unknown>, key: string, fallbackCents: number) {
  const cents = Number(record[`${key}Cents`]);

  if (Number.isInteger(cents) && cents > 0) {
    return cents;
  }

  return Math.max(0, Math.round(numberField(record, `${key}Dollars`, fallbackCents / 100) * 100));
}

function destinationType(value: unknown): MpgfPublicGoodsDestinationType {
  return value === "fiscal_host" || value === "internal_demo_pool" || value === "signed_sponsor_route"
    ? value
    : "external_charity";
}

function payoutMethod(value: unknown): MpgfPublicGoodsCaptureMode {
  return value === "stored_payment_method" || value === "signed_intent" ? value : "external_handoff";
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Sign in to submit an MPGF public-goods campaign." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      throw new Error("MPGF public-goods campaign submission expects a JSON object.");
    }

    const record = payload as Record<string, unknown>;
    const result = await persistMpgfPoolProposal({
      userId: viewer.authUser.id,
      displayName: viewer.displayName,
      idempotencyKey: stringField(record, "idempotencyKey", `mpgf-campaign-${viewer.authUser.id}-${Date.now()}`),
      title: stringField(record, "title"),
      summary: stringField(record, "summary", stringField(record, "publicSummary")),
      causeArea: stringField(record, "causeArea", "Moral public goods"),
      problem: stringField(record, "problem", "The campaign must identify the public-good coordination problem."),
      intervention: stringField(record, "intervention", "The campaign proposes a reviewable public-good intervention."),
      moralPublicGoodRationale: stringField(
        record,
        "moralPublicGoodRationale",
        "The campaign claims cross-view moral public-good value and awaits reviewer verification.",
      ),
      requestedMaximumFundingCents: centsField(record, "requestedMaximumFunding", 10_000_00),
      minimumViableFundingCents: centsField(record, "minimumViableFunding", 1_000_00),
      outcomeUnitLabel: stringField(record, "outcomeUnitLabel", "verified public-good milestone"),
      outcomeUnitDefinition: stringField(
        record,
        "outcomeUnitDefinition",
        "A public, reviewer-checkable milestone for the proposed moral public good.",
      ),
      referenceAlternative: stringField(record, "referenceAlternative") || undefined,
      measurementMethod: stringField(
        record,
        "measurementMethod",
        "Reviewer-confirmed public evidence and milestone completion records.",
      ),
      uncertaintyDescription: stringField(record, "uncertaintyDescription") || undefined,
      expectedEffectVsFunding: stringField(
        record,
        "expectedEffectVsFunding",
        "More funding increases milestone capacity subject to published review and payout gates.",
      ),
      timeline: stringField(record, "timeline", "Pilot round timeline with milestone review."),
      milestones: stringField(record, "milestones", "Eligibility review\nInitial milestone\nCompletion review"),
      risks: stringField(record, "risks", "Execution risk\nEvidence quality risk"),
      misusePathways: stringField(
        record,
        "misusePathways",
        "Reviewers check for threat baselines, misleading evidence, and destination risk before eligibility.",
      ),
      proposedRecipientName: stringField(record, "proposedRecipientName") || undefined,
      implementingTeam: stringField(record, "implementingTeam", viewer.displayName),
      publicGoodsDestinationType: destinationType(record.publicGoodsDestinationType ?? record.destinationType),
      publicGoodsDestinationRef: stringField(record, "publicGoodsDestinationRef", stringField(record, "destinationRef")),
      publicGoodsThresholdAmountCents: centsField(record, "publicGoodsThresholdAmount", 1_000_00),
      publicGoodsThresholdSupporters: Math.max(1, Math.round(numberField(record, "publicGoodsThresholdSupporters", 3))),
      publicGoodsDeadlineAt: stringField(record, "publicGoodsDeadlineAt", stringField(record, "deadlineAt")),
      publicGoodsVerificationMethod: stringField(
        record,
        "publicGoodsVerificationMethod",
        stringField(record, "verificationMethod", "Reviewer verifies public destination proof and milestone evidence."),
      ),
      publicGoodsBaselineRule: stringField(
        record,
        "publicGoodsBaselineRule",
        stringField(record, "baselineRule", "No newly harmful fallback, threat baseline, or token-voting claim."),
      ),
      publicGoodsExitRule: stringField(
        record,
        "publicGoodsExitRule",
        stringField(record, "exitRule", "Unreleased sponsor funds roll forward under the published round rule."),
      ),
      publicGoodsBaseMatchRatio: numberField(record, "publicGoodsBaseMatchRatio", 1),
      publicGoodsQfEnabled: record.publicGoodsQfEnabled !== false,
      publicGoodsQfCapMultiple: numberField(record, "publicGoodsQfCapMultiple", 1),
      publicGoodsPayoutMethod: payoutMethod(record.publicGoodsPayoutMethod ?? record.captureMode),
      intent: record.intent === "draft" ? "draft" : "submitted",
    });

    return NextResponse.json(
      {
        ok: true,
        status: result.status,
        campaignDraft: result,
        createsPayoutAuthorization: false,
      },
      { status: result.status === "submitted" ? 202 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not submit MPGF public-goods campaign." },
      { status: 400 },
    );
  }
}
