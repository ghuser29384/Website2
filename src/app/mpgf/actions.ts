"use server";

import { revalidatePath } from "next/cache";

import { getViewer } from "@/lib/app-data";
import type {
  FailureBonusEligibilityPolicy,
  FailureBonusSuccessPremiumPricingAssumptions,
  FailureBonusSuccessPremiumScheduleQuote,
} from "@/lib/mpgf/failure-bonus-success-premium";
import type { MpgfParticipantActionResult } from "@/lib/mpgf/participant-types";
import {
  loadMpgfParticipantState,
  mpgfPersistenceMappers,
  persistMpgfBallot,
  persistMpgfPledgeOnlyRecords,
  persistMpgfPledgeStatus,
  persistMpgfPoolProposal,
  persistMpgfPublicGoodsPledge,
  persistMpgfRecurringCommitmentStatus,
} from "@/lib/mpgf/persistence";
import {
  createMpgfBillingPortal,
  createMpgfRealMoneyCheckout,
  loadMpgfManualEvidenceReadiness,
  loadMpgfRealMoneyReadiness,
  requestMpgfRefund,
  submitMpgfManualExternalPaymentEvidence,
} from "@/lib/mpgf/real-money";
import type {
  MpgfManualEvidenceActionResult,
  MpgfManualEvidenceProvider,
  MpgfRealMoneyCheckoutResult,
} from "@/lib/mpgf/real-money-types";
import type {
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsDestinationType,
  MpgfPublicGoodsVisibilityMode,
  MpgfPledge,
  MpgfRecurringContributionCommitment,
} from "@/lib/mpgf/types";

async function requireMpgfActionViewer(): Promise<
  | {
      userId: string;
      displayName: string;
      email?: string | null;
    }
  | MpgfParticipantActionResult
> {
  const viewer = await getViewer();

  if (!viewer) {
    return {
      ok: false,
      requiresAuth: true,
      message: "Sign in to persist MPGF participant state across sessions.",
      state: await loadMpgfParticipantState({}),
    };
  }

  return {
    userId: viewer.authUser.id,
    displayName: viewer.displayName,
    email: viewer.authUser.email,
  };
}

function isActionViewer(
  value:
    | {
        userId: string;
        displayName: string;
        email?: string | null;
      }
    | MpgfParticipantActionResult,
): value is { userId: string; displayName: string; email?: string | null } {
  return "userId" in value;
}

function centsFromDollars(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
}

function revalidateMpgfParticipantRoutes() {
  revalidatePath("/mpgf");
  revalidatePath("/mpgf/contribute");
  revalidatePath("/mpgf/account/contributions");
  revalidatePath("/mpgf/pools");
}

export async function recordMpgfPledgesAction(input: {
  idempotencyKey: string;
  oneTimeAmountDollars: number;
  monthlyAmountDollars: number;
}): Promise<MpgfParticipantActionResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return viewer as MpgfParticipantActionResult<MpgfPledge>;
  }

  try {
    const oneTimeAmountCents = Math.max(1, centsFromDollars(input.oneTimeAmountDollars));
    const monthlyAmountCents = Math.max(0, centsFromDollars(input.monthlyAmountDollars));
    const persisted = await persistMpgfPledgeOnlyRecords({
      userId: viewer.userId,
      displayName: viewer.displayName,
      idempotencyKey: input.idempotencyKey,
      oneTimeAmountCents,
      monthlyAmountCents,
    });
    const state = await loadMpgfParticipantState(viewer);
    revalidateMpgfParticipantRoutes();

    return {
      ok: true,
      message:
        persisted.recurringCommitments.length > 0
          ? `Saved ${persisted.pledges.length} pledge rows and ${persisted.recurringCommitments.length} monthly commitment. No money moved.`
          : `Saved ${persisted.pledges.length} pledge row. No money moved.`,
      data: persisted,
      state: {
        ...state,
        warnings: [...state.warnings, ...persisted.warnings],
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save MPGF pledge state.",
      state: await loadMpgfParticipantState(viewer),
    };
  }
}

export async function recordMpgfPublicGoodsPledgeAction(input: {
  idempotencyKey: string;
  campaignId: string;
  amountDollars: number;
  acceptableCounterpartBuckets?: string[] | string;
  minimumCounterpartyClearedDollars?: number;
  visibilityMode: MpgfPublicGoodsVisibilityMode;
  captureMode: MpgfPublicGoodsCaptureMode;
  isRecurring: boolean;
  supporterReason?: string;
}): Promise<MpgfParticipantActionResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return viewer;
  }

  try {
    const persisted = await persistMpgfPublicGoodsPledge({
      userId: viewer.userId,
      displayName: viewer.displayName,
      email: viewer.email,
      idempotencyKey: input.idempotencyKey,
      campaignId: input.campaignId,
      amountCents: Math.max(1, centsFromDollars(input.amountDollars)),
      acceptableCounterpartBuckets: input.acceptableCounterpartBuckets,
      minimumCounterpartyClearedCents: input.minimumCounterpartyClearedDollars == null
        ? undefined
        : Math.max(100, centsFromDollars(input.minimumCounterpartyClearedDollars)),
      visibilityMode: input.visibilityMode,
      captureMode: input.captureMode,
      isRecurring: input.isRecurring,
      supporterReason: input.supporterReason,
    });
    const state = await loadMpgfParticipantState(viewer);
    revalidateMpgfParticipantRoutes();

    return {
      ok: true,
      message: persisted.subscription
        ? `Saved public-goods pledge ${persisted.pledge.id} and optional sponsor-pool refill. No money moved.`
        : `Saved public-goods pledge ${persisted.pledge.id}. It only counts after threshold, identity, and review gates pass.`,
      data: persisted,
      state: {
        ...state,
        warnings: [...state.warnings, ...persisted.warnings],
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save MPGF public-goods pledge.",
      state: await loadMpgfParticipantState(viewer),
    };
  }
}

export async function createMpgfRealMoneyCheckoutAction(input: {
  amountDollars: number;
  cadence: "one_time" | "monthly";
}): Promise<MpgfRealMoneyCheckoutResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return {
      ok: false,
      message: viewer.message,
      readiness: await loadMpgfRealMoneyReadiness(),
    };
  }

  try {
    return await createMpgfRealMoneyCheckout({
      userId: viewer.userId,
      displayName: viewer.displayName,
      email: viewer.email,
      amountDollars: input.amountDollars,
      cadence: input.cadence,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create MPGF Stripe Checkout session.",
      readiness: await loadMpgfRealMoneyReadiness(),
    };
  }
}

export async function createMpgfBillingPortalAction(): Promise<MpgfRealMoneyCheckoutResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return {
      ok: false,
      message: viewer.message,
      readiness: await loadMpgfRealMoneyReadiness(),
    };
  }

  try {
    return await createMpgfBillingPortal({ userId: viewer.userId });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not open MPGF Stripe Billing portal.",
      readiness: await loadMpgfRealMoneyReadiness(),
    };
  }
}

export async function requestMpgfRefundAction(input: {
  contributionId: string;
  reason: string;
}): Promise<{ ok: boolean; message: string }> {
  const result = await requestMpgfRefund(input);

  revalidateMpgfParticipantRoutes();

  return result;
}

export async function submitMpgfManualExternalPaymentEvidenceAction(input: {
  amountDollars: number;
  provider: MpgfManualEvidenceProvider;
  externalPaymentReference: string;
  evidenceUrl?: string | null;
  evidenceDescription: string;
  paidAt?: string | null;
}): Promise<MpgfManualEvidenceActionResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return {
      ok: false,
      message: viewer.message,
      readiness: await loadMpgfManualEvidenceReadiness(),
    };
  }

  try {
    const result = await submitMpgfManualExternalPaymentEvidence({
      userId: viewer.userId,
      amountDollars: input.amountDollars,
      provider: input.provider,
      externalPaymentReference: input.externalPaymentReference,
      evidenceUrl: input.evidenceUrl,
      evidenceDescription: input.evidenceDescription,
      paidAt: input.paidAt,
    });

    revalidateMpgfParticipantRoutes();

    return result;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not submit MPGF manual external-payment evidence.",
      readiness: await loadMpgfManualEvidenceReadiness(),
    };
  }
}

export async function cancelMpgfPledgeAction(input: {
  pledgeId: string;
  idempotencyKey: string;
}): Promise<MpgfParticipantActionResult<MpgfPledge>> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return viewer as MpgfParticipantActionResult<MpgfPledge>;
  }

  const { data, error } = await persistMpgfPledgeStatus({
    userId: viewer.userId,
    pledgeId: input.pledgeId,
    idempotencyKey: input.idempotencyKey,
    status: "cancelled",
  });
  const state = await loadMpgfParticipantState(viewer);

  if (error) {
    return {
      ok: false,
      message: `Could not cancel pledge: ${error.message}`,
      state,
    };
  }

  revalidateMpgfParticipantRoutes();

  return {
    ok: true,
    message: `Cancelled pledge-only record ${input.pledgeId}. No money moved.`,
    data: mpgfPersistenceMappers.mapPledgeRow(data as Record<string, unknown>),
    state,
  };
}

export async function updateMpgfRecurringCommitmentStatusAction(
  input: {
    commitmentId: string;
    idempotencyKey: string;
    status: Extract<MpgfRecurringContributionCommitment["status"], "active" | "paused" | "cancelled">;
  },
): Promise<MpgfParticipantActionResult<MpgfRecurringContributionCommitment>> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return viewer as MpgfParticipantActionResult<MpgfRecurringContributionCommitment>;
  }

  const { data, error } = await persistMpgfRecurringCommitmentStatus({
    userId: viewer.userId,
    commitmentId: input.commitmentId,
    idempotencyKey: input.idempotencyKey,
    status: input.status,
  });
  const state = await loadMpgfParticipantState(viewer);

  if (error) {
    return {
      ok: false,
      message: `Could not update recurring commitment: ${error.message}`,
      state,
    };
  }

  revalidateMpgfParticipantRoutes();

  return {
    ok: true,
    message: `Updated recurring commitment ${input.commitmentId} to ${input.status}. No money moved.`,
    data: mpgfPersistenceMappers.mapRecurringCommitmentRow(data as Record<string, unknown>),
    state,
  };
}

export async function saveMpgfPoolProposalAction(input: {
  idempotencyKey: string;
  title: string;
  summary: string;
  causeArea: string;
  problem: string;
  intervention: string;
  moralPublicGoodRationale: string;
  requestedMaximumFundingDollars: number;
  minimumViableFundingDollars?: number;
  outcomeUnitLabel: string;
  outcomeUnitDefinition: string;
  referenceAlternative?: string;
  measurementMethod: string;
  uncertaintyDescription?: string;
  expectedEffectVsFunding: string;
  timeline: string;
  milestones: string;
  risks: string;
  misusePathways: string;
  proposedRecipientName?: string;
  implementingTeam: string;
  publicGoodsDestinationType?: MpgfPublicGoodsDestinationType;
  publicGoodsDestinationRef?: string;
  publicGoodsThresholdAmountDollars?: number;
  publicGoodsThresholdSupporters?: number;
  publicGoodsFailureBonusEnabled?: boolean;
  publicGoodsFailureBonusRateBps?: number;
  publicGoodsFailureBonusEligibilityPolicy?: FailureBonusEligibilityPolicy;
  publicGoodsFailureBonusMaxParticipants?: number;
  publicGoodsFailureBonusMaxPerParticipantCents?: number;
  publicGoodsThresholdSchedule?: FailureBonusSuccessPremiumScheduleQuote;
  publicGoodsSuccessPremiumRateBps?: number;
  publicGoodsSuccessPremiumCents?: number;
  publicGoodsSuccessPremiumPayer?: "pool_creator_or_sponsor";
  publicGoodsSuccessPremiumPolicyVersion?: string;
  publicGoodsSuccessPremiumIncludedInNetThreshold?: false;
  publicGoodsSuccessPremiumProvisional?: true;
  publicGoodsGrossSuccessRequirementCents?: number;
  publicGoodsSuccessPremiumPricingAssumptions?: FailureBonusSuccessPremiumPricingAssumptions;
  publicGoodsDeadlineAt?: string;
  publicGoodsVerificationMethod?: string;
  publicGoodsBaselineRule?: string;
  publicGoodsExitRule?: string;
  publicGoodsBaseMatchRatio?: number;
  publicGoodsQfEnabled?: boolean;
  publicGoodsQfCapMultiple?: number;
  publicGoodsPayoutMethod?: MpgfPublicGoodsCaptureMode;
  intent: "draft" | "submitted";
}): Promise<MpgfParticipantActionResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return viewer;
  }

  try {
    const proposal = await persistMpgfPoolProposal({
      userId: viewer.userId,
      displayName: viewer.displayName,
      idempotencyKey: input.idempotencyKey,
      title: input.title,
      summary: input.summary,
      causeArea: input.causeArea,
      problem: input.problem,
      intervention: input.intervention,
      moralPublicGoodRationale: input.moralPublicGoodRationale,
      requestedMaximumFundingCents: Math.max(0, centsFromDollars(input.requestedMaximumFundingDollars)),
      minimumViableFundingCents:
        input.minimumViableFundingDollars == null
          ? undefined
          : Math.max(0, centsFromDollars(input.minimumViableFundingDollars)),
      outcomeUnitLabel: input.outcomeUnitLabel,
      outcomeUnitDefinition: input.outcomeUnitDefinition,
      referenceAlternative: input.referenceAlternative,
      measurementMethod: input.measurementMethod,
      uncertaintyDescription: input.uncertaintyDescription,
      expectedEffectVsFunding: input.expectedEffectVsFunding,
      timeline: input.timeline,
      milestones: input.milestones,
      risks: input.risks,
      misusePathways: input.misusePathways,
      proposedRecipientName: input.proposedRecipientName,
      implementingTeam: input.implementingTeam,
      publicGoodsDestinationType: input.publicGoodsDestinationType,
      publicGoodsDestinationRef: input.publicGoodsDestinationRef,
      publicGoodsThresholdAmountCents:
        input.publicGoodsThresholdAmountDollars == null
          ? undefined
          : Math.max(0, centsFromDollars(input.publicGoodsThresholdAmountDollars)),
      publicGoodsThresholdSupporters: input.publicGoodsThresholdSupporters,
      publicGoodsFailureBonusEnabled: input.publicGoodsFailureBonusEnabled,
      publicGoodsFailureBonusRateBps: input.publicGoodsFailureBonusRateBps,
      publicGoodsFailureBonusEligibilityPolicy: input.publicGoodsFailureBonusEligibilityPolicy,
      publicGoodsFailureBonusMaxParticipants: input.publicGoodsFailureBonusMaxParticipants,
      publicGoodsFailureBonusMaxPerParticipantCents:
        input.publicGoodsFailureBonusMaxPerParticipantCents,
      publicGoodsThresholdSchedule: input.publicGoodsThresholdSchedule,
      publicGoodsSuccessPremiumRateBps: input.publicGoodsSuccessPremiumRateBps,
      publicGoodsSuccessPremiumCents: input.publicGoodsSuccessPremiumCents,
      publicGoodsSuccessPremiumPayer: input.publicGoodsSuccessPremiumPayer,
      publicGoodsSuccessPremiumPolicyVersion: input.publicGoodsSuccessPremiumPolicyVersion,
      publicGoodsSuccessPremiumIncludedInNetThreshold:
        input.publicGoodsSuccessPremiumIncludedInNetThreshold,
      publicGoodsSuccessPremiumProvisional: input.publicGoodsSuccessPremiumProvisional,
      publicGoodsGrossSuccessRequirementCents: input.publicGoodsGrossSuccessRequirementCents,
      publicGoodsSuccessPremiumPricingAssumptions:
        input.publicGoodsSuccessPremiumPricingAssumptions,
      publicGoodsDeadlineAt: input.publicGoodsDeadlineAt,
      publicGoodsVerificationMethod: input.publicGoodsVerificationMethod,
      publicGoodsBaselineRule: input.publicGoodsBaselineRule,
      publicGoodsExitRule: input.publicGoodsExitRule,
      publicGoodsBaseMatchRatio: input.publicGoodsBaseMatchRatio,
      publicGoodsQfEnabled: input.publicGoodsQfEnabled,
      publicGoodsQfCapMultiple: input.publicGoodsQfCapMultiple,
      publicGoodsPayoutMethod: input.publicGoodsPayoutMethod,
      intent: input.intent,
    });
    const state = await loadMpgfParticipantState(viewer);
    revalidateMpgfParticipantRoutes();

    return {
      ok: true,
      message:
        input.intent === "submitted"
          ? `Submitted ${proposal.id} for MPGF review. No allocation or payout was authorized.`
          : `Saved draft ${proposal.id} to your MPGF participant state.`,
      data: proposal,
      state,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save MPGF pool proposal.",
      state: await loadMpgfParticipantState(viewer),
    };
  }
}

export async function saveMpgfBallotAction(input: {
  idempotencyKey: string;
  weightsByAlternativeId: Record<string, number>;
  intent: "draft" | "submitted";
}): Promise<MpgfParticipantActionResult> {
  const viewer = await requireMpgfActionViewer();

  if (!isActionViewer(viewer)) {
    return viewer;
  }

  try {
    const { ballot, warnings } = await persistMpgfBallot({
      userId: viewer.userId,
      displayName: viewer.displayName,
      idempotencyKey: input.idempotencyKey,
      weightsByAlternativeId: input.weightsByAlternativeId,
      intent: input.intent,
    });
    const state = await loadMpgfParticipantState(viewer);
    revalidatePath("/mpgf");
    revalidatePath(`/mpgf/ballot/${ballot.cycleId}`);

    return {
      ok: true,
      message:
        input.intent === "submitted"
          ? `Submitted ${ballot.id} in persisted non-real-money mode. No disbursement was authorized.`
          : `Saved ballot draft ${ballot.id} to your MPGF participant state.`,
      data: ballot,
      state: {
        ...state,
        warnings: [...state.warnings, ...warnings],
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save MPGF ballot.",
      state: await loadMpgfParticipantState(viewer),
    };
  }
}
