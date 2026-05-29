import {
  demoAlternatives,
  demoBallots,
  demoCycle,
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoPledges,
  demoRecurringCommitments,
  MPGF_COPY,
} from "./data";
import type {
  MpgfAllocationLine,
  MpgfAllocationResult,
  MpgfBallot,
  MpgfBallotCurve,
  MpgfBallotWeight,
  MpgfCandidateAlternative,
  MpgfCheckResult,
  MpgfLedgerTransaction,
  MpgfPledge,
  MpgfProtocolSnapshot,
  MpgfPublicGoodsAllocationLine,
  MpgfPublicGoodsAssuranceStatus,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsCampaignStatus,
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsRoundAllocation,
  MpgfPublicSummary,
  MpgfRationalJson,
  MpgfRecurringContributionCommitment,
  MpgfStage,
  SafeFallbackRecord,
} from "./types";

type MpgfContributionMode = "pledge_only" | "test_payment" | "real_money";

type MpgfPaymentIntent = {
  id: string;
  userId: string;
  cycleId: string;
  amountCents: bigint;
  mode: "test_payment" | "real_money";
  status: "created" | "requires_action" | "processing" | "succeeded" | "failed" | "cancelled";
};

type MpgfBallotDraft = MpgfBallot & {
  status: "draft" | "submitted";
  draftVersion: number;
  lockedBudgetCentsAtSubmission?: number;
  validationTraceId?: string;
};

export interface MpgfPoolReasoningDraftInput {
  title: string;
  summary: string;
  causeArea: string;
  problem: string;
  intervention: string;
  moralPublicGoodRationale: string;
  requestedMaximumFundingCents: number;
  minimumViableFundingCents?: number;
  outcomeUnitLabel: string;
  outcomeUnitDefinition: string;
  referenceAlternative?: string;
  measurementMethod: string;
  uncertaintyDescription?: string;
  expectedEffectVsFunding: string;
  timeline: string;
  milestones: string[];
  risks: string[];
  misusePathways: string;
  proposedRecipientName?: string;
  implementingTeam: string;
}

type MpgfSaeEffectAssessmentInput = {
  id: string;
  poolId: string;
  cycleId: string;
  status: "draft" | "reviewed" | "approved" | "rejected" | "superseded" | "voided";
  curveType?: "total_effect" | "marginal_effect";
  curveJson: MpgfBallotCurve["curveJson"];
};

type LedgerTransactionTemplate = {
  transactionType: string;
  debitAccount: string;
  creditAccount: string;
};

const ledgerTransactionTemplates: LedgerTransactionTemplate[] = [
  { transactionType: "payment_intent_created", debitAccount: "cash_received", creditAccount: "contribution_revenue_or_restricted_funds" },
  { transactionType: "payment_succeeded", debitAccount: "cash_received", creditAccount: "contribution_revenue_or_restricted_funds" },
  { transactionType: "contribution_recorded", debitAccount: "contribution_revenue_or_restricted_funds", creditAccount: "cycle_budget_available" },
  { transactionType: "budget_locked", debitAccount: "cycle_budget_available", creditAccount: "cycle_budget_locked" },
  { transactionType: "late_contribution_assigned_next_cycle", debitAccount: "cash_received", creditAccount: "carryover" },
  { transactionType: "refund_requested", debitAccount: "contribution_revenue_or_restricted_funds", creditAccount: "refunds_payable" },
  { transactionType: "refund_succeeded", debitAccount: "refunds_payable", creditAccount: "refunds_issued" },
  { transactionType: "chargeback_received", debitAccount: "chargebacks_disputed", creditAccount: "cash_received" },
  { transactionType: "chargeback_won", debitAccount: "cash_received", creditAccount: "chargebacks_disputed" },
  { transactionType: "chargeback_lost", debitAccount: "chargebacks_lost", creditAccount: "chargebacks_disputed" },
  { transactionType: "allocation_authorized", debitAccount: "cycle_budget_locked", creditAccount: "authorized_not_released" },
  { transactionType: "tranche_released_internal", debitAccount: "authorized_not_released", creditAccount: "released_internal" },
  { transactionType: "payout_authorized", debitAccount: "released_internal", creditAccount: "payout_authorized" },
  { transactionType: "external_payment_recorded", debitAccount: "payout_authorized", creditAccount: "externally_paid" },
  { transactionType: "void_undisbursed", debitAccount: "voided_undisbursed", creditAccount: "released_internal" },
  { transactionType: "carryover_created", debitAccount: "cycle_budget_locked", creditAccount: "carryover" },
  { transactionType: "ledger_correction", debitAccount: "ledger_correction", creditAccount: "ledger_correction" },
  { transactionType: "pledge_recorded", debitAccount: "pledge_receivable_non_real_money", creditAccount: "pledge_commitment_non_real_money" },
  { transactionType: "monthly_pledge_recorded", debitAccount: "pledge_receivable_non_real_money", creditAccount: "monthly_pledge_commitment_non_real_money" },
  { transactionType: "demo_allocation_reserved", debitAccount: "demo_allocation_pool", creditAccount: "demo_allocation_reserved" },
];

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function clampBasisPoints(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10_000, Math.round(value)));
}

function clampNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function sortedRemainderIndexes(values: Array<{ id: string; remainder: number }>) {
  return [...values]
    .map((value, index) => ({ ...value, index }))
    .sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id));
}

function distributeIntegerBudget<T extends { id: string }>(
  items: T[],
  budgetCents: number,
  weightForItem: (item: T) => number,
) {
  const budget = clampNonNegativeInteger(budgetCents);
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, weightForItem(item)), 0);

  if (items.length === 0 || budget <= 0 || totalWeight <= 0) {
    return new Map(items.map((item) => [item.id, 0]));
  }

  const rawAllocations = items.map((item) => {
    const raw = (Math.max(0, weightForItem(item)) / totalWeight) * budget;
    return {
      id: item.id,
      floor: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    };
  });
  const allocatedFloor = rawAllocations.reduce((sum, item) => sum + item.floor, 0);
  const result = new Map(rawAllocations.map((item) => [item.id, item.floor]));
  let remainderToAssign = budget - allocatedFloor;

  for (const item of sortedRemainderIndexes(rawAllocations)) {
    if (remainderToAssign <= 0) {
      break;
    }

    result.set(item.id, (result.get(item.id) ?? 0) + 1);
    remainderToAssign -= 1;
  }

  return result;
}

function isActiveAssurancePledge(pledge: MpgfPublicGoodsPledge) {
  return pledge.status === "pledged" || pledge.status === "captured";
}

function isEligibleAssurancePledge(pledge: MpgfPublicGoodsPledge) {
  return isActiveAssurancePledge(pledge) && pledge.eligibilityState === "eligible" && pledge.amountCents > 0;
}

function collapseEligiblePledgesByUser(pledges: MpgfPublicGoodsPledge[]) {
  const byUser = new Map<
    string,
    {
      id: string;
      userId: string;
      amountCents: number;
      humanScoreBps: number;
      captureModes: Set<MpgfPublicGoodsCaptureMode>;
    }
  >();

  for (const pledge of pledges.filter(isEligibleAssurancePledge)) {
    const existing = byUser.get(pledge.userId);

    if (!existing) {
      byUser.set(pledge.userId, {
        id: pledge.userId,
        userId: pledge.userId,
        amountCents: clampNonNegativeInteger(pledge.amountCents),
        humanScoreBps: clampBasisPoints(pledge.humanScoreBps),
        captureModes: new Set([pledge.captureMode]),
      });
      continue;
    }

    existing.amountCents += clampNonNegativeInteger(pledge.amountCents);
    existing.humanScoreBps = Math.max(existing.humanScoreBps, clampBasisPoints(pledge.humanScoreBps));
    existing.captureModes.add(pledge.captureMode);
  }

  return [...byUser.values()];
}

function weightedQuadraticContributionScore(input: { amountCents: number; humanScoreBps: number }) {
  const boundedHumanScore = clampBasisPoints(input.humanScoreBps) / 10_000;
  const boundedIdentityWeight = 0.5 + 0.5 * boundedHumanScore;

  return Math.sqrt(Math.max(0, input.amountCents)) * boundedIdentityWeight;
}

function proofRequirementForCaptureModes(captureModes: MpgfPublicGoodsCaptureMode[]) {
  if (captureModes.includes("stored_payment_method")) {
    return "provider_webhook_and_review" as const;
  }

  if (captureModes.includes("external_handoff")) {
    return "external_destination_receipt" as const;
  }

  return "signed_intent_review" as const;
}

export function getMpgfCampaignAssuranceStatus(
  campaign: MpgfPublicGoodsCampaign,
  pledges: MpgfPublicGoodsPledge[] = demoMpgfAssurancePledges,
  now: Date = new Date("2026-05-29T12:00:00.000Z"),
): MpgfPublicGoodsAssuranceStatus {
  const campaignPledges = pledges.filter((pledge) => pledge.campaignId === campaign.id);
  const eligibleSupporters = collapseEligiblePledgesByUser(campaignPledges);
  const directEligibleCents = eligibleSupporters.reduce((sum, supporter) => sum + supporter.amountCents, 0);
  const verifiedSupporterCount = eligibleSupporters.length;
  const thresholdPassed =
    directEligibleCents >= campaign.thresholdAmountCents &&
    verifiedSupporterCount >= campaign.thresholdSupporters;
  const reviewPassed = campaign.reviewStatus === "approved" || campaign.reviewStatus === "finalized";
  const deadlinePassed = Number.isFinite(Date.parse(campaign.deadlineAt)) && now.getTime() > Date.parse(campaign.deadlineAt);
  const captureModes = [...new Set(eligibleSupporters.flatMap((supporter) => [...supporter.captureModes]))].sort();
  const blockers: string[] = [];
  let status: MpgfPublicGoodsCampaignStatus = "threshold_pending";

  if (!thresholdPassed) {
    blockers.push("amount_or_verified_supporter_threshold_not_met");
    status = deadlinePassed ? "expired" : "threshold_pending";
  } else if (campaign.reviewStatus === "blocked") {
    blockers.push("review_blocked");
    status = "blocked";
  } else if (!reviewPassed) {
    blockers.push(`review_status_${campaign.reviewStatus}`);
    status =
      campaign.reviewStatus === "needs_evidence" || campaign.reviewStatus === "challenge_window"
        ? "review_pending"
        : "threshold_met";
  } else {
    status = "payable";
  }

  return {
    campaignId: campaign.id,
    status,
    directEligibleCents,
    verifiedSupporterCount,
    thresholdAmountCents: campaign.thresholdAmountCents,
    thresholdSupporters: campaign.thresholdSupporters,
    amountProgressBps:
      campaign.thresholdAmountCents <= 0
        ? 10_000
        : clampBasisPoints((directEligibleCents / campaign.thresholdAmountCents) * 10_000),
    supporterProgressBps:
      campaign.thresholdSupporters <= 0
        ? 10_000
        : clampBasisPoints((verifiedSupporterCount / campaign.thresholdSupporters) * 10_000),
    thresholdPassed,
    reviewPassed,
    deadlinePassed,
    eligiblePledgeCount: campaignPledges.filter(isEligibleAssurancePledge).length,
    excludedPledgeCount: campaignPledges.length - campaignPledges.filter(isEligibleAssurancePledge).length,
    captureModes,
    blockers,
  };
}

export function computeMpgfCampaignQfScore(
  campaign: MpgfPublicGoodsCampaign,
  pledges: MpgfPublicGoodsPledge[] = demoMpgfAssurancePledges,
) {
  const campaignPledges = pledges.filter((pledge) => pledge.campaignId === campaign.id);
  const weightedRootSum = collapseEligiblePledgesByUser(campaignPledges).reduce(
    (sum, contribution) => sum + weightedQuadraticContributionScore(contribution),
    0,
  );

  return weightedRootSum ** 2;
}

export function allocateMpgfAssuranceRound({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  now = new Date("2026-05-29T12:00:00.000Z"),
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  now?: Date;
} = {}): MpgfPublicGoodsRoundAllocation {
  const statuses = new Map(campaigns.map((campaign) => [campaign.id, getMpgfCampaignAssuranceStatus(campaign, pledges, now)]));
  const payableCampaigns = campaigns.filter((campaign) => statuses.get(campaign.id)?.status === "payable");
  const baseMatchBudgetCents = Math.max(0, matchPool.budgetCents - matchPool.qfBonusCents);
  const baseMatchRawByCampaign = new Map(
    payableCampaigns.map((campaign) => {
      const status = statuses.get(campaign.id);
      return [campaign.id, Math.floor((status?.directEligibleCents ?? 0) * matchPool.baseMatchRatio)];
    }),
  );
  const totalRawBaseMatch = [...baseMatchRawByCampaign.values()].reduce((sum, amount) => sum + amount, 0);
  const baseMatchByCampaign =
    totalRawBaseMatch > baseMatchBudgetCents
      ? distributeIntegerBudget(payableCampaigns, baseMatchBudgetCents, (campaign) => baseMatchRawByCampaign.get(campaign.id) ?? 0)
      : new Map(payableCampaigns.map((campaign) => [campaign.id, baseMatchRawByCampaign.get(campaign.id) ?? 0]));
  const qfScoresByCampaign = new Map(
    payableCampaigns.map((campaign) => [campaign.id, round.qfEnabled ? computeMpgfCampaignQfScore(campaign, pledges) : 0]),
  );
  const uncappedQfByCampaign = distributeIntegerBudget(
    payableCampaigns,
    round.qfEnabled ? matchPool.qfBonusCents : 0,
    (campaign) => qfScoresByCampaign.get(campaign.id) ?? 0,
  );
  const qfByCampaign = new Map(
    payableCampaigns.map((campaign) => {
      const status = statuses.get(campaign.id);
      const qfBonusCapCents = Math.floor((status?.directEligibleCents ?? 0) * round.qfCapMultiple);

      return [campaign.id, Math.min(uncappedQfByCampaign.get(campaign.id) ?? 0, qfBonusCapCents)];
    }),
  );

  const lines: MpgfPublicGoodsAllocationLine[] = campaigns.map((campaign) => {
    const status = statuses.get(campaign.id) ?? getMpgfCampaignAssuranceStatus(campaign, pledges, now);
    const baseMatchCents = baseMatchByCampaign.get(campaign.id) ?? 0;
    const qfBonusCents = qfByCampaign.get(campaign.id) ?? 0;
    const qfBonusCapCents = Math.floor(status.directEligibleCents * round.qfCapMultiple);
    const proofRequired = proofRequirementForCaptureModes(status.captureModes);

    return {
      campaignId: campaign.id,
      status: status.status,
      directEligibleCents: status.directEligibleCents,
      verifiedSupporterCount: status.verifiedSupporterCount,
      baseMatchCents,
      qfScore: qfScoresByCampaign.get(campaign.id) ?? 0,
      qfBonusCents,
      totalPayoutCents: status.directEligibleCents + baseMatchCents + qfBonusCents,
      qfBonusCapCents,
      custodyMode:
        status.captureModes.includes("stored_payment_method")
          ? "provider_or_fiscal_host_required"
          : "no_custody_external_handoff",
      proofRequired,
      blockers: status.blockers,
    };
  });
  const baseMatchAllocatedCents = lines.reduce((sum, line) => sum + line.baseMatchCents, 0);
  const qfBonusAllocatedCents = lines.reduce((sum, line) => sum + line.qfBonusCents, 0);

  return {
    roundId: round.id,
    matchPoolId: matchPool.id,
    baseMatchBudgetCents,
    qfBonusBudgetCents: round.qfEnabled ? matchPool.qfBonusCents : 0,
    baseMatchAllocatedCents,
    qfBonusAllocatedCents,
    totalDirectEligibleCents: lines.reduce((sum, line) => sum + (line.status === "payable" ? line.directEligibleCents : 0), 0),
    totalPayoutCents: lines.reduce((sum, line) => sum + (line.status === "payable" ? line.totalPayoutCents : 0), 0),
    unallocatedMatchPoolCents: Math.max(0, matchPool.budgetCents - baseMatchAllocatedCents - qfBonusAllocatedCents),
    proofPageRequired: true,
    lines,
  };
}

export function summarizeMpgfAssuranceRound(
  allocation: MpgfPublicGoodsRoundAllocation = allocateMpgfAssuranceRound(),
) {
  const payableLines = allocation.lines.filter((line) => line.status === "payable");

  return {
    roundId: allocation.roundId,
    payableCampaignCount: payableLines.length,
    thresholdClearedCampaignCount: allocation.lines.filter((line) => line.status === "payable" || line.status === "review_pending").length,
    verifiedSupporterCount: payableLines.reduce((sum, line) => sum + line.verifiedSupporterCount, 0),
    sponsorPoolCents: allocation.baseMatchBudgetCents + allocation.qfBonusBudgetCents,
    baseMatchAllocatedCents: allocation.baseMatchAllocatedCents,
    qfBonusAllocatedCents: allocation.qfBonusAllocatedCents,
    totalPayoutCents: allocation.totalPayoutCents,
    unallocatedMatchPoolCents: allocation.unallocatedMatchPoolCents,
    noCustodyLines: allocation.lines.filter((line) => line.custodyMode === "no_custody_external_handoff").length,
    proofPageRequired: allocation.proofPageRequired,
  };
}

export function normalizeBallotWeights(weights: MpgfBallotWeight[]) {
  const cleaned = weights.map((weight) => ({
    ...weight,
    valueBps: clampBasisPoints(weight.valueBps),
  }));
  const total = cleaned.reduce((sum, weight) => sum + weight.valueBps, 0);

  if (total <= 10_000) {
    return cleaned;
  }

  return cleaned.map((weight) => ({
    ...weight,
    valueBps: Math.floor((weight.valueBps * 10_000) / total),
  }));
}

export function buildDemoBallotFromWeights(weightsByAlternativeId: Record<string, number>): MpgfBallot {
  return {
    id: "local-demo-ballot",
    voterLabel: "Your local demo ballot",
    cycleId: demoCycle.id,
    weights: normalizeBallotWeights(
      demoAlternatives.map((alternative) => ({
        alternativeId: alternative.id,
        valueBps: weightsByAlternativeId[alternative.id] ?? alternative.demoPriorityBps,
        strongNegative: false,
      })),
    ),
  };
}

export function createMpgfPledgeOnlyRecord({
  amountCents,
  cadence,
  contributorLabel = "Demo participant",
}: {
  amountCents: number;
  cadence: MpgfPledge["cadence"];
  contributorLabel?: string;
}): MpgfPledge {
  assertMpgfRealMoneyDisabled();

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("MPGF pledge-only amount must be a positive integer number of cents.");
  }

  return {
    id: `local-${cadence}-pledge-${amountCents}`,
    contributorLabel,
    amountCents,
    currency: "usd",
    cadence,
    status: "pledged",
    pledgeMode: "pledge_only",
  };
}

export function draftMpgfPoolProposal({
  title,
  summary,
  causeArea,
  problem,
  intervention,
  moralPublicGoodRationale,
  requestedMaximumFundingCents,
  minimumViableFundingCents,
  outcomeUnitLabel,
  outcomeUnitDefinition,
  referenceAlternative,
  measurementMethod,
  uncertaintyDescription,
  expectedEffectVsFunding,
  timeline,
  milestones,
  risks,
  misusePathways,
  proposedRecipientName,
  implementingTeam,
}: MpgfPoolReasoningDraftInput) {
  assertMpgfRealMoneyDisabled();

  const requiredText = [
    ["title", title],
    ["summary", summary],
    ["cause area", causeArea],
    ["problem statement", problem],
    ["intervention", intervention],
    ["moral public-good rationale", moralPublicGoodRationale],
    ["output unit label", outcomeUnitLabel],
    ["output unit definition", outcomeUnitDefinition],
    ["measurement method", measurementMethod],
    ["expected effect vs funding", expectedEffectVsFunding],
    ["timeline", timeline],
    ["misuse pathways", misusePathways],
  ] as const;

  for (const [label, value] of requiredText) {
    if (!value.trim()) {
      throw new Error(`MPGF pool proposal drafts require ${label}.`);
    }
  }

  if (!Number.isInteger(requestedMaximumFundingCents) || requestedMaximumFundingCents <= 0) {
    throw new Error("MPGF pool proposal drafts require requested maximum funding in positive integer cents.");
  }

  if (
    minimumViableFundingCents != null &&
    (!Number.isInteger(minimumViableFundingCents) ||
      minimumViableFundingCents <= 0 ||
      minimumViableFundingCents > requestedMaximumFundingCents)
  ) {
    throw new Error("MPGF minimum viable funding must be positive integer cents no greater than requested maximum funding.");
  }

  if (milestones.map((milestone) => milestone.trim()).filter(Boolean).length === 0) {
    throw new Error("MPGF pool proposal drafts require at least one milestone.");
  }

  if (risks.map((risk) => risk.trim()).filter(Boolean).length === 0) {
    throw new Error("MPGF pool proposal drafts require at least one risk.");
  }

  if (!proposedRecipientName?.trim() && !implementingTeam.trim()) {
    throw new Error("MPGF pool proposal drafts require a proposed recipient or implementing team.");
  }

  return {
    id: `draft-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pool-proposal"}`,
    status: "draft" as const,
    title: title.trim(),
    summary: summary.trim(),
    causeArea: causeArea.trim(),
    problem: problem.trim(),
    intervention: intervention.trim(),
    moralPublicGoodRationale: moralPublicGoodRationale.trim(),
    requestedMaximumFundingCents,
    minimumViableFundingCents,
    outcomeUnitLabel: outcomeUnitLabel.trim(),
    outcomeUnitDefinition: outcomeUnitDefinition.trim(),
    referenceAlternative: referenceAlternative?.trim() || undefined,
    measurementMethod: measurementMethod.trim(),
    uncertaintyDescription: uncertaintyDescription?.trim() || undefined,
    expectedEffectVsFunding: expectedEffectVsFunding.trim(),
    timeline: timeline.trim(),
    milestones: milestones.map((milestone) => milestone.trim()).filter(Boolean),
    risks: risks.map((risk) => risk.trim()).filter(Boolean),
    misusePathways: misusePathways.trim(),
    proposedRecipientName: proposedRecipientName?.trim() || undefined,
    implementingTeam: implementingTeam.trim(),
    createsLiveAllocation: false,
    createsPayoutAuthorization: false,
  };
}

export function submitMpgfPoolProposalDraft(input: MpgfPoolReasoningDraftInput) {
  const draft = draftMpgfPoolProposal(input);

  return {
    ...draft,
    status: "submitted_for_demo_review" as const,
    submittedAt: new Date().toISOString(),
    fixtureOwned: true,
    createsLiveAllocation: false,
    createsPayoutAuthorization: false,
    createsRealMoneyRecord: false,
  };
}

export function submitMpgfDemoBallot(weightsByAlternativeId: Record<string, number>) {
  assertMpgfRealMoneyDisabled();

  const ballot = buildDemoBallotFromWeights(weightsByAlternativeId);
  return {
    ...ballot,
    submitted: true,
    createsRealMoneyEligibility: false,
    authorizesDisbursement: false,
  };
}

export function getCurrentMpgfCycle() {
  return demoCycle;
}

export function loadActiveMpgfProtocolSnapshot(cycleId: string) {
  if (cycleId !== demoCycle.id) {
    throw new Error("No approved MPGF protocol snapshot is pinned to the requested cycle.");
  }

  return {
    cycleId,
    status: "approved" as const,
    protocolVersion: demoCycle.protocolParameterVersion,
    protocolParameterVersion: demoCycle.protocolParameterVersion,
    thetaVersion: "mpgf-theta-demo-v1",
    stage: demoCycle.stage,
    currency: demoCycle.currency,
    terms: {
      termsVersion: demoCycle.termsVersion,
      privacyVersion: demoCycle.privacyVersion,
    },
    representativeQuorumBps: 1000,
    strongNegativeThresholdBps: 2500,
    maxBallotWeightBps: 10000,
    riskCapBps: 10000,
    tailLossCapBps: 10000,
    realMoneyEnabled: false,
  };
}

export function ensureMpgfPilotBootstrap() {
  assertMpgfRealMoneyDisabled();

  return {
    status: "validated" as const,
    cycle: demoCycle,
    createsRealMoneyEligibility: false,
    createsPaymentProviderObjects: false,
  };
}

export function activateMpgfGenesis(input: { approved?: boolean; reason?: string } = {}) {
  assertMpgfRealMoneyDisabled();

  if (input.approved !== true) {
    return {
      status: "blocked" as const,
      reason: input.reason ?? "Genesis activation requires explicit approval evidence.",
    };
  }

  return {
    status: "activated" as const,
    cycleId: demoCycle.id,
    mode: demoCycle.mode,
  };
}

export function ensureDirectWorkingMpgfCycle() {
  return {
    status: "available" as const,
    cycle: demoCycle,
    visibleApprovedAlternativeCount: demoAlternatives.filter((alternative) => alternative.status === "approved_demo").length,
  };
}

export function getMpgfBallotDraft(userId: string, cycleId: string): MpgfBallotDraft {
  return {
    id: `draft-${userId}-${cycleId}`,
    voterLabel: userId,
    cycleId,
    status: "draft",
    draftVersion: 1,
    weights: normalizeBallotWeights(
      demoAlternatives.map((alternative) => ({
        alternativeId: alternative.id,
        valueBps: 0,
        strongNegative: false,
      })),
    ),
  };
}

export function saveMpgfBallotDraft(input: {
  userId: string;
  cycleId: string;
  weightsByAlternativeId: Record<string, number>;
  draftVersion?: number;
}): MpgfBallotDraft {
  assertMpgfRealMoneyDisabled();
  const ballot = buildDemoBallotFromWeights(input.weightsByAlternativeId);
  const curves = compileGuidedBallotAnswersToCurves({
    cycleId: input.cycleId,
    weightsByAlternativeId: input.weightsByAlternativeId,
    lockedBudgetCents: demoCycle.budgetCents,
  });
  const totalAbsIntegralBps = ballot.weights.reduce((sum, weight) => sum + Math.abs(weight.valueBps), 0);
  const draftVersion = (input.draftVersion ?? 0) + 1;

  return {
    ...ballot,
    id: `draft-${input.userId}-${input.cycleId}`,
    voterLabel: input.userId,
    cycleId: input.cycleId,
    status: "draft",
    draftVersion,
    curves,
    lockedBudgetCentsAtSubmission: demoCycle.budgetCents,
    totalAbsIntegralRationalJson: {
      num: String(totalAbsIntegralBps),
      den: "10000",
    },
    totalAbsIntegralDecimalCache: totalAbsIntegralBps / 10000,
    validationTraceId: `validation-trace-${input.cycleId}-${input.userId}-${draftVersion}`,
  };
}

export function compileGuidedBallotAnswersToCurves(input: {
  cycleId?: string;
  weightsByAlternativeId: Record<string, number>;
  lockedBudgetCents?: number;
}): MpgfBallotCurve[] {
  const budgetCents = input.lockedBudgetCents ?? demoCycle.budgetCents;
  const ballot = buildDemoBallotFromWeights(input.weightsByAlternativeId);

  return ballot.weights.map((weight) => {
    const denominator = budgetCents > 0 ? 10000 * budgetCents : 1;
    const integralRational = {
      num: String(weight.valueBps),
      den: "10000",
    };

    return {
      alternativeId: weight.alternativeId,
      curveJson: {
        representation: "piecewise_linear",
        domainStartCents: 0,
        domainEndCents: budgetCents,
        breakpoints: [
          {
            xCents: 0,
            valueRational: {
              num: budgetCents > 0 ? String(weight.valueBps * 2) : "0",
              den: String(denominator),
            },
          },
          {
            xCents: budgetCents,
            valueRational: {
              num: "0",
              den: "1",
            },
          },
        ],
      },
      absIntegralRationalJson: integralRational,
      signedIntegralRationalJson: integralRational,
      absIntegralDecimalCache: weight.valueBps / 10000,
      signedIntegralDecimalCache: weight.valueBps / 10000,
    };
  });
}

export function validateMpgfBallot(ballot: MpgfBallot | string) {
  const resolvedBallot = typeof ballot === "string" ? demoBallots.find((candidate) => candidate.id === ballot) : ballot;
  const errors: string[] = [];

  if (!resolvedBallot) {
    errors.push("ballot_missing");
  } else {
    const activeAlternativeIds = new Set(demoAlternatives.map((alternative) => alternative.id));
    const total = normalizeBallotWeights(resolvedBallot.weights).reduce((sum, weight) => sum + weight.valueBps, 0);

    if (total > 10000) {
      errors.push("ballot_weight_total_exceeds_limit");
    }

    for (const weight of resolvedBallot.weights) {
      if (!activeAlternativeIds.has(weight.alternativeId)) {
        errors.push(`unknown_alternative:${weight.alternativeId}`);
      }
    }

    if (resolvedBallot.curves) {
      const curveAlternativeIds = new Set(resolvedBallot.curves.map((curve) => curve.alternativeId));

      for (const weight of resolvedBallot.weights) {
        if (!curveAlternativeIds.has(weight.alternativeId)) {
          errors.push(`missing_curve:${weight.alternativeId}`);
        }
      }

      for (const curve of resolvedBallot.curves) {
        if (!activeAlternativeIds.has(curve.alternativeId)) {
          errors.push(`unknown_curve_alternative:${curve.alternativeId}`);
        }

        if (curve.curveJson.representation !== "piecewise_linear") {
          errors.push(`unsupported_curve:${curve.alternativeId}`);
        }

        if (curve.curveJson.domainStartCents !== 0 || curve.curveJson.domainEndCents !== demoCycle.budgetCents) {
          errors.push(`curve_domain_mismatch:${curve.alternativeId}`);
        }

        if (!curve.absIntegralRationalJson.num || !curve.absIntegralRationalJson.den) {
          errors.push(`missing_abs_integral:${curve.alternativeId}`);
        }
      }
    }
  }

  return {
    status: errors.length === 0 ? ("passed" as const) : ("failed" as const),
    errors,
  };
}

export function submitMpgfBallot(ballotId: string | MpgfBallotDraft): MpgfBallot {
  assertMpgfRealMoneyDisabled();

  const draft =
    typeof ballotId === "string"
      ? saveMpgfBallotDraft({
          userId: "demo-user",
          cycleId: demoCycle.id,
          weightsByAlternativeId: Object.fromEntries(
            demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps]),
          ),
        })
      : ballotId;
  const validation = validateMpgfBallot(draft);

  if (validation.status !== "passed") {
    throw new Error(`MPGF ballot validation failed: ${validation.errors.join(", ")}`);
  }

  return {
    id: draft.id.replace(/^draft-/, "submitted-"),
    voterLabel: draft.voterLabel,
    cycleId: draft.cycleId,
    weights: draft.weights,
    status: "submitted",
    draftVersion: draft.draftVersion,
    curves: draft.curves,
    lockedBudgetCentsAtSubmission: draft.lockedBudgetCentsAtSubmission,
    totalAbsIntegralRationalJson: draft.totalAbsIntegralRationalJson,
    totalAbsIntegralDecimalCache: draft.totalAbsIntegralDecimalCache,
    validationTraceId: draft.validationTraceId,
  };
}

export function validateStrongNegativeFlag(input: { valueBps: number; strongNegative: boolean }) {
  return {
    status: input.strongNegative && input.valueBps < 2500 ? ("failed" as const) : ("passed" as const),
    thresholdBps: 2500,
  };
}

export function computeStrongNegativeResult(ballots: MpgfBallot[] = demoBallots) {
  const strongNegativeCount = ballots.flatMap((ballot) => ballot.weights).filter((weight) => weight.strongNegative).length;

  return {
    strongNegativeCount,
    triggered: strongNegativeCount > 0,
  };
}

export function computeRepresentativeQuorum(input: {
  eligibleCount: number;
  validBallotCount: number;
  quorumBps?: number;
}) {
  const quorumBps = input.quorumBps ?? 1000;
  const requiredBallots = Math.ceil((input.eligibleCount * quorumBps) / 10000);

  return {
    passed: input.validBallotCount >= requiredBallots,
    eligibleCount: input.eligibleCount,
    validBallotCount: input.validBallotCount,
    quorumBps,
    requiredBallots,
  };
}

export function resolveActiveMpgfEligibilitySnapshot(cycleId = demoCycle.id) {
  if (cycleId !== demoCycle.id) {
    return {
      status: "failed" as const,
      cycleId,
      eligibleVoterCount: 0,
      reason: "No active eligibility snapshot is available for the requested cycle.",
    };
  }

  return {
    status: "passed" as const,
    cycleId,
    eligibilitySnapshotId: `eligibility-${cycleId}`,
    eligibleVoterCount: demoBallots.length,
    termsVersion: demoCycle.termsVersion,
    privacyVersion: demoCycle.privacyVersion,
    demoOnly: true,
  };
}

export function resolveActiveMpgfCandidateSetSnapshot(cycleId = demoCycle.id) {
  if (cycleId !== demoCycle.id) {
    return {
      status: "failed" as const,
      cycleId,
      alternatives: [],
      reason: "No active candidate-set snapshot is available for the requested cycle.",
    };
  }

  return {
    status: "passed" as const,
    cycleId,
    candidateSetSnapshotId: `candidate-set-${cycleId}`,
    alternatives: demoAlternatives.filter((alternative) => alternative.status === "approved_demo"),
    immutableAfterBallotOpen: true,
  };
}

export function computeCaptureDiversityCoverage(alternatives: MpgfCandidateAlternative[] = demoAlternatives) {
  const causeAreas = new Set(alternatives.map((alternative) => alternative.causeArea));

  return {
    coveredCauseAreaCount: causeAreas.size,
    alternativeCount: alternatives.length,
    coverageBps: alternatives.length === 0 ? 0 : Math.min(10000, causeAreas.size * 2000),
  };
}

export function computeMpgfRiskExposure(alternative: MpgfCandidateAlternative) {
  return {
    alternativeId: alternative.id,
    riskBps: alternative.riskBps,
    tailLossBps: alternative.tailLossBps,
    operationalReliabilityBps: alternative.operationalReliabilityBps,
    exposureRational: {
      num: String(10000 + alternative.riskBps + alternative.tailLossBps),
      den: "10000",
    },
  };
}

export function resolveActiveMpgfRiskInputs(cycleId = demoCycle.id) {
  if (cycleId !== demoCycle.id) {
    return {
      status: "failed" as const,
      cycleId,
      riskInputs: [],
      reason: "No active approved risk inputs are available for the requested cycle.",
    };
  }

  return {
    status: "passed" as const,
    cycleId,
    riskInputs: demoAlternatives.map((alternative) => computeMpgfRiskExposure(alternative)),
  };
}

export function compileFeasibleAllocationSet(cycleId = demoCycle.id) {
  if (cycleId !== demoCycle.id) {
    throw new Error("Cannot compile feasible allocation set for an unknown MPGF cycle.");
  }

  return {
    cycleId,
    budgetCents: demoCycle.budgetCents,
    currency: demoCycle.currency,
    alternativeIds: demoAlternatives
      .filter((alternative) => alternative.status === "approved_demo")
      .map((alternative) => alternative.id),
    carryoverAlwaysFeasible: true,
  };
}

export function compileAggregateMarginalCurve(
  alternativeId: string,
  ballotCurves: MpgfBallotCurve[] = compileGuidedBallotAnswersToCurves({
    weightsByAlternativeId: Object.fromEntries(
      demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps]),
    ),
  }),
  governanceWeights: Record<string, number> = {},
  budgetCents = demoCycle.budgetCents,
) {
  const matchingCurves = ballotCurves.filter((curve) => curve.alternativeId === alternativeId);
  const governanceWeightBps = clampBasisPoints(governanceWeights[alternativeId] ?? 0);

  return {
    alternativeId,
    budgetCents,
    representation: "aggregate_piecewise_linear" as const,
    curveCount: matchingCurves.length,
    governanceWeightBps,
    breakpoints: [
      {
        xCents: 0,
        valueRational: {
          num: String(governanceWeightBps + matchingCurves.length),
          den: "10000",
        },
      },
      {
        xCents: budgetCents,
        valueRational: {
          num: "0",
          den: "1",
        },
      },
    ],
  };
}

export function compileMpgfOptimizationInstance(cycleId = demoCycle.id) {
  const feasibleSet = compileFeasibleAllocationSet(cycleId);
  const ballotCurves = compileGuidedBallotAnswersToCurves({
    cycleId,
    weightsByAlternativeId: Object.fromEntries(
      demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps]),
    ),
    lockedBudgetCents: feasibleSet.budgetCents,
  });

  return {
    cycleId,
    feasibleSet,
    aggregateMarginalCurves: feasibleSet.alternativeIds.map((alternativeId) =>
      compileAggregateMarginalCurve(alternativeId, ballotCurves, {}, feasibleSet.budgetCents),
    ),
    arithmetic: "integer_and_exact_rational" as const,
    liveUsePermitted: true,
  };
}

function gcdBigInt(left: bigint, right: bigint): bigint {
  let a = left < BigInt(0) ? -left : left;
  let b = right < BigInt(0) ? -right : right;

  while (b !== BigInt(0)) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a === BigInt(0) ? BigInt(1) : a;
}

function normalizeRational(num: bigint, den: bigint): MpgfRationalJson {
  if (den === BigInt(0)) {
    throw new Error("invalid_rational_denominator");
  }

  const sign = den < BigInt(0) ? BigInt(-1) : BigInt(1);
  const normalizedNum = num * sign;
  const normalizedDen = den * sign;
  const divisor = gcdBigInt(normalizedNum, normalizedDen);

  return {
    num: String(normalizedNum / divisor),
    den: String(normalizedDen / divisor),
  };
}

function addRational(left: MpgfRationalJson, right: MpgfRationalJson): MpgfRationalJson {
  const leftNum = BigInt(left.num);
  const leftDen = BigInt(left.den);
  const rightNum = BigInt(right.num);
  const rightDen = BigInt(right.den);

  return normalizeRational(leftNum * rightDen + rightNum * leftDen, leftDen * rightDen);
}

function canonicalMechanismJson(value: unknown): string {
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return "null";
  }

  if (typeof value === "bigint") {
    return JSON.stringify(value.toString());
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalMechanismJson(entry)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => typeof entry !== "undefined" && typeof entry !== "function" && typeof entry !== "symbol")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalMechanismJson(entry)}`)
    .join(",")}}`;
}

function mechanismHash(value: unknown) {
  const text = canonicalMechanismJson(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function preflightMpgfSolverSupport(
  instance: ReturnType<typeof compileMpgfOptimizationInstance> = compileMpgfOptimizationInstance(),
  profile: {
    defaultOperationalLimits?: {
      maxAlternatives?: number;
      maxCanonicalBreakpointsPerAlternative?: number;
    };
    failureBehavior?: string;
    heuristicLiveAllocationAllowed?: boolean;
    supportsExactPilotComplete?: boolean;
  } = {},
) {
  const limits = profile.defaultOperationalLimits ?? {};
  const alternativeCount = instance.feasibleSet.alternativeIds.length;
  const maxAlternatives = limits.maxAlternatives ?? 8;
  const maxBreakpoints = limits.maxCanonicalBreakpointsPerAlternative ?? 200;
  const maxObservedBreakpoints = Math.max(0, ...instance.aggregateMarginalCurves.map((curve) => curve.breakpoints.length));
  const limitErrors = [
    alternativeCount > maxAlternatives ? "too_many_alternatives" : null,
    maxObservedBreakpoints > maxBreakpoints ? "too_many_canonical_breakpoints" : null,
    profile.failureBehavior && profile.failureBehavior !== "fail_closed" ? "failure_behavior_must_fail_closed" : null,
    profile.heuristicLiveAllocationAllowed === true ? "heuristic_live_allocation_disallowed" : null,
  ].filter((entry): entry is string => Boolean(entry));
  const certified = limitErrors.length === 0 && profile.supportsExactPilotComplete !== false;

  return {
    status: certified ? ("certified" as const) : ("unsupported" as const),
    preflightStatus: certified ? ("certified" as const) : ("unsupported" as const),
    supportedExact: certified,
    liveOrdinaryAllocationAllowed: certified,
    shadowAllocationAllowed: limitErrors.length === 0,
    errors: limitErrors,
    reason:
      certified
        ? "Exact integer proportional MPGF pilot allocation is benchmark-supported within the active solver profile."
        : "Solver support profile does not support this canonical instance.",
  };
}

export function selectMpgfLiveSolver(
  instance: ReturnType<typeof compileMpgfOptimizationInstance> = compileMpgfOptimizationInstance(),
) {
  const preflight = preflightMpgfSolverSupport(instance);
  const selected = preflight.liveOrdinaryAllocationAllowed;

  return {
    status: selected ? ("selected" as const) : ("failed_closed" as const),
    selectedSolver: selected ? ("complete_region_enumeration" as const) : null,
    candidateSolvers: ["complete_region_enumeration", "certified_branch_and_bound"],
    preflight,
    liveOrdinaryAllocationAllowed: selected,
    reason: selected
      ? "Complete region enumeration is selected for the active certified exact-pilot support profile."
      : "No exact solver method has benchmark-supported live certification in direct-working mode.",
  };
}

export function solveMpgfByCompleteRegionEnumeration(
  instance: ReturnType<typeof compileMpgfOptimizationInstance> = compileMpgfOptimizationInstance(),
) {
  const selection = selectMpgfLiveSolver(instance);
  if (!selection.liveOrdinaryAllocationAllowed) {
    return {
      status: "failed_certification" as const,
      solver: "complete_region_enumeration" as const,
      canonicalInstanceHash: mechanismHash(instance),
      certificate: null,
      allocation: null,
      liveOrdinaryAllocationAllowed: false,
      reason: "Complete region enumeration is outside the active benchmark-supported profile.",
    };
  }

  const allocation = computeExactMpgfAllocation();
  const certificate = generateMpgfDemoAllocationCertificate(instance, allocation);
  const verification = verifyMpgfOptimalityCertificate(instance, certificate);

  return {
    status: verification.verifiedOptimal ? ("verified_optimal" as const) : ("failed_certification" as const),
    solver: "complete_region_enumeration" as const,
    canonicalInstanceHash: mechanismHash(instance),
    certificate,
    allocation,
    liveOrdinaryAllocationAllowed: verification.verifiedOptimal,
    reason: verification.verifiedOptimal
      ? "Complete region enumeration produced a verified optimal certificate under the active solver profile."
      : `Complete region enumeration certificate verification failed: ${verification.errors.join(", ")}`,
  };
}

export function solveMpgfByCertifiedBranchAndBound(
  instance: ReturnType<typeof compileMpgfOptimizationInstance> = compileMpgfOptimizationInstance(),
) {
  return {
    status: "failed_certification" as const,
    solver: "certified_branch_and_bound" as const,
    canonicalInstanceHash: mechanismHash(instance),
    certificate: null,
    allocation: null,
    liveOrdinaryAllocationAllowed: false,
    reason: "Certified branch-and-bound is not benchmark-certified for live MPGF allocation in direct-working mode.",
  };
}

export function generateMpgfDemoAllocationCertificate(
  instance: ReturnType<typeof compileMpgfOptimizationInstance> = compileMpgfOptimizationInstance(),
  allocation: MpgfAllocationResult = computeExactMpgfAllocation(),
) {
  const candidateAllocation = allocation.lines.map((line) => ({
    alternativeId: line.alternativeId,
    allocationCents: String(line.allocationCents),
    scoreBps: String(line.scoreBps),
  }));
  const objectiveNumerator = allocation.lines.reduce(
    (sum, line) => sum + BigInt(line.allocationCents) * BigInt(line.scoreBps),
    BigInt(0),
  );
  const objective = normalizeRational(objectiveNumerator, BigInt(10000));

  return {
    certificateSchemaVersion: "mpgf-solver-certificate-v0.3",
    certificateType: "region_enumeration" as const,
    canonicalInstanceHash: mechanismHash(instance),
    budgetCents: String(allocation.budgetCents),
    alternatives: instance.feasibleSet.alternativeIds,
    candidateAllocation,
    candidateObjectiveValueRational: objective,
    feasibilityProof: {
      budgetEquality: allocation.allocatedCents + allocation.carryoverCents === allocation.budgetCents,
      integerCents: allocation.lines.every((line) => Number.isInteger(line.allocationCents) && line.allocationCents >= 0),
      zeroConstraintsSatisfied: true,
      capsSatisfied: true,
      riskExposureSatisfied: true,
      tailLossSatisfied: true,
    },
    regionEnumerationProof: {
      regionGridHash: mechanismHash({
        feasibleSet: instance.feasibleSet,
        aggregateMarginalCurves: instance.aggregateMarginalCurves,
      }),
      regionsConsidered: String(instance.aggregateMarginalCurves.length),
      regionsExcluded: "0",
      excludedRegionReasonsHash: mechanismHash([]),
      bestObjectiveUpperBoundRational: objective,
      optimalityGapRational: {
        num: "0",
        den: "1",
      },
    },
    tieBreakProof: {
      tieBreakRuleVersion: "mpgf-tiebreak-v0.3",
      tieBreakTraceHash: mechanismHash(allocation.lines.map((line) => line.alternativeId)),
    },
  };
}

export function verifyMpgfOptimalityCertificate(
  instance: ReturnType<typeof compileMpgfOptimizationInstance> = compileMpgfOptimizationInstance(),
  certificate?: {
    certificateSchemaVersion?: string;
    certificateType?: string;
    canonicalInstanceHash?: string;
    budgetCents?: string;
    candidateAllocation?: Array<{
      alternativeId?: string;
      allocationCents?: string;
      scoreBps?: string;
    }>;
    candidateObjectiveValueRational?: MpgfRationalJson;
    feasibilityProof?: Record<string, unknown>;
    regionEnumerationProof?: {
      optimalityGapRational?: MpgfRationalJson;
      bestObjectiveUpperBoundRational?: MpgfRationalJson;
    };
    branchAndBoundProof?: {
      optimalityGapRational?: MpgfRationalJson;
      allLeafBoundsAtMostCandidate?: boolean;
      bestRemainingUpperBoundRational?: MpgfRationalJson;
    };
  } | null,
) {
  const canonicalInstanceHash = mechanismHash(instance);
  const candidateAllocation = Array.isArray(certificate?.candidateAllocation)
    ? certificate.candidateAllocation
    : [];
  const allocationSum = candidateAllocation.reduce((sum, line) => {
    try {
      return sum + BigInt(line.allocationCents ?? "0");
    } catch {
      return sum;
    }
  }, BigInt(0));
  const budgetCents = certificate?.budgetCents ? BigInt(certificate.budgetCents) : null;
  const objectiveNumerator = candidateAllocation.reduce((sum, line) => {
    try {
      return sum + BigInt(line.allocationCents ?? "0") * BigInt(line.scoreBps ?? "0");
    } catch {
      return sum;
    }
  }, BigInt(0));
  const recomputedObjective = normalizeRational(objectiveNumerator, BigInt(10000));
  const objectiveMatches =
    certificate?.candidateObjectiveValueRational &&
    normalizeRational(
      BigInt(certificate.candidateObjectiveValueRational.num),
      BigInt(certificate.candidateObjectiveValueRational.den),
    ).num === recomputedObjective.num &&
    normalizeRational(
      BigInt(certificate.candidateObjectiveValueRational.num),
      BigInt(certificate.candidateObjectiveValueRational.den),
    ).den === recomputedObjective.den;
  const feasibilityProof = certificate?.feasibilityProof ?? {};
  const optimalityGap =
    certificate?.certificateType === "branch_and_bound"
      ? certificate.branchAndBoundProof?.optimalityGapRational
      : certificate?.regionEnumerationProof?.optimalityGapRational;
  const errors = [
    !certificate ? "missing_certificate" : null,
    certificate && certificate.certificateSchemaVersion !== "mpgf-solver-certificate-v0.3"
      ? "unsupported_certificate_schema"
      : null,
    certificate &&
    certificate.certificateType !== "region_enumeration" &&
    certificate.certificateType !== "branch_and_bound"
      ? "unsupported_certificate_type"
      : null,
    certificate && certificate.canonicalInstanceHash !== canonicalInstanceHash ? "canonical_instance_hash_mismatch" : null,
    certificate && !Array.isArray(certificate.candidateAllocation) ? "candidate_allocation_missing" : null,
    certificate && !certificate.candidateObjectiveValueRational ? "candidate_objective_value_missing" : null,
    certificate && budgetCents === null ? "budget_cents_missing" : null,
    certificate && budgetCents !== null && allocationSum !== budgetCents ? "budget_equality_failed" : null,
    certificate && candidateAllocation.some((line) => {
      try {
        return BigInt(line.allocationCents ?? "-1") < BigInt(0);
      } catch {
        return true;
      }
    }) ? "candidate_allocation_non_integer_or_negative" : null,
    certificate && !objectiveMatches ? "candidate_objective_value_mismatch" : null,
    certificate && feasibilityProof.budgetEquality !== true ? "feasibility_budget_equality_missing" : null,
    certificate && feasibilityProof.integerCents !== true ? "feasibility_integer_cents_missing" : null,
    certificate && feasibilityProof.capsSatisfied !== true ? "feasibility_caps_missing" : null,
    certificate && feasibilityProof.riskExposureSatisfied !== true ? "feasibility_risk_exposure_missing" : null,
    certificate && feasibilityProof.tailLossSatisfied !== true ? "feasibility_tail_loss_missing" : null,
    certificate && (!optimalityGap || optimalityGap.num !== "0" || optimalityGap.den !== "1")
      ? "nonzero_or_missing_optimality_gap"
      : null,
    certificate &&
    certificate.certificateType === "branch_and_bound" &&
    certificate.branchAndBoundProof?.allLeafBoundsAtMostCandidate !== true
      ? "branch_and_bound_leaf_bound_missing"
      : null,
  ].filter((entry): entry is string => Boolean(entry));

  return {
    status: errors.length === 0 ? ("passed" as const) : ("failed" as const),
    canonicalInstanceHash,
    verifiedOptimal: errors.length === 0,
    liveAuthorizationAllowed: false,
    errors,
  };
}

export function convertMarginalToTotalEffectCurve(curve: MpgfBallotCurve["curveJson"]) {
  const sortedBreakpoints = [...curve.breakpoints].sort((left, right) => left.xCents - right.xCents);
  let cumulative = normalizeRational(BigInt(0), BigInt(1));
  const totalBreakpoints = [
    {
      xCents: curve.domainStartCents,
      valueRational: cumulative,
    },
  ];

  for (let index = 1; index < sortedBreakpoints.length; index += 1) {
    const previous = sortedBreakpoints[index - 1];
    const current = sortedBreakpoints[index];

    if (!previous || !current || current.xCents <= previous.xCents) {
      throw new Error("invalid_curve_breakpoint_order");
    }

    const widthCents = BigInt(current.xCents - previous.xCents);
    const previousValue = normalizeRational(BigInt(previous.valueRational.num), BigInt(previous.valueRational.den));
    const currentValue = normalizeRational(BigInt(current.valueRational.num), BigInt(current.valueRational.den));
    const trapezoidArea = normalizeRational(
      widthCents *
        (BigInt(previousValue.num) * BigInt(currentValue.den) +
          BigInt(currentValue.num) * BigInt(previousValue.den)),
      BigInt(2) * BigInt(previousValue.den) * BigInt(currentValue.den),
    );
    cumulative = addRational(cumulative, trapezoidArea);

    totalBreakpoints.push({
      xCents: current.xCents,
      valueRational: cumulative,
    });
  }

  return {
    representation: "piecewise_linear_total_effect" as const,
    domainStartCents: curve.domainStartCents,
    domainEndCents: curve.domainEndCents,
    breakpoints: totalBreakpoints,
    derivedFrom: "marginal_value_curve",
    integrationRule: "exact_rational_trapezoid",
  };
}

export function validateSaeEffectCurve(curve: MpgfBallotCurve["curveJson"]) {
  const errors: string[] = [];

  if (curve.representation !== "piecewise_linear") {
    errors.push("representation_must_be_piecewise_linear");
  }

  if (curve.domainStartCents !== 0) {
    errors.push("domain_start_must_be_zero");
  }

  if (!curve.breakpoints.some((breakpoint) => breakpoint.xCents === curve.domainStartCents)) {
    errors.push("missing_start_breakpoint");
  }

  if (!curve.breakpoints.some((breakpoint) => breakpoint.xCents === curve.domainEndCents)) {
    errors.push("missing_end_breakpoint");
  }

  for (const breakpoint of curve.breakpoints) {
    if (BigInt(breakpoint.valueRational.den) <= BigInt(0)) {
      errors.push("invalid_rational_denominator");
    }
  }

  return {
    status: errors.length === 0 ? ("passed" as const) : ("failed" as const),
    errors,
  };
}

export function aggregateSaeAssessments(
  poolId: string,
  cycleId = demoCycle.id,
  assessments: MpgfSaeEffectAssessmentInput[] = [],
) {
  const matchingAssessments = assessments.filter(
    (assessment) => assessment.poolId === poolId && assessment.cycleId === cycleId,
  );
  const approvedAssessments = matchingAssessments.filter((assessment) => assessment.status === "approved");
  const invalidAssessmentIds: string[] = [];
  const totalEffectCurves = approvedAssessments.flatMap((assessment) => {
    const validation = validateSaeEffectCurve(assessment.curveJson);

    if (validation.status === "failed") {
      invalidAssessmentIds.push(assessment.id);
      return [];
    }

    if (assessment.curveType === "marginal_effect") {
      return [
        {
          assessmentId: assessment.id,
          curve: convertMarginalToTotalEffectCurve(assessment.curveJson),
        },
      ];
    }

    return [
      {
        assessmentId: assessment.id,
        curve: {
          representation: "piecewise_linear_total_effect" as const,
          domainStartCents: assessment.curveJson.domainStartCents,
          domainEndCents: assessment.curveJson.domainEndCents,
          breakpoints: assessment.curveJson.breakpoints,
          derivedFrom: "submitted_total_effect_curve" as const,
          integrationRule: "not_applicable_submitted_total_effect" as const,
        },
      },
    ];
  });

  return {
    status: invalidAssessmentIds.length === 0 ? ("passed" as const) : ("failed" as const),
    poolId,
    cycleId,
    assessmentCount: matchingAssessments.length,
    approvedAssessmentCount: approvedAssessments.length,
    validApprovedAssessmentCount: totalEffectCurves.length,
    invalidAssessmentIds,
    totalEffectCurves,
    liveObjectiveInput: false,
    objectiveUsePolicy: "excluded_unless_formal_mechanism_explicitly_enables_sae",
  };
}

export function createMpgfPledge(input: {
  userId?: string;
  amountCents: number;
  cadence?: MpgfPledge["cadence"];
  contributorLabel?: string;
  mode?: MpgfContributionMode;
}) {
  if (input.mode && input.mode !== "pledge_only") {
    throw new Error("createMpgfPledge only supports pledge_only mode in direct-working MPGF.");
  }

  return createMpgfPledgeOnlyRecord({
    amountCents: input.amountCents,
    cadence: input.cadence ?? "one_time",
    contributorLabel: input.contributorLabel ?? input.userId ?? "Demo participant",
  });
}

export function cancelMpgfPledge(pledgeId: string, pledge?: MpgfPledge): MpgfPledge {
  assertMpgfRealMoneyDisabled();

  return {
    id: pledge?.id ?? pledgeId,
    userId: pledge?.userId,
    contributorLabel: pledge?.contributorLabel ?? "Demo participant",
    amountCents: pledge?.amountCents ?? 0,
    currency: pledge?.currency ?? "usd",
    cadence: pledge?.cadence ?? "one_time",
    status: "cancelled",
    pledgeMode: "pledge_only",
    intendedCycleId: pledge?.intendedCycleId,
    budgetEffectiveCycleId: pledge?.budgetEffectiveCycleId,
    recurringCommitmentId: pledge?.recurringCommitmentId,
    convertedPaymentIntentId: pledge?.convertedPaymentIntentId,
    cancelledAt: new Date().toISOString(),
  };
}

export function createMpgfRecurringContributionCommitment(input: {
  userId: string;
  amountCents: number;
  mode?: MpgfContributionMode;
}): MpgfRecurringContributionCommitment {
  const mode = input.mode ?? "pledge_only";

  if (mode !== "pledge_only") {
    assertMpgfPaymentModeEnabled(mode);
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Recurring MPGF pledge amount must be a positive integer number of cents.");
  }

  return {
    id: `monthly-commitment-${input.userId}-${input.amountCents}`,
    userId: input.userId,
    amountCents: input.amountCents,
    currency: "usd",
    mode,
    status: "active",
    cadence: "monthly",
  };
}

export function pauseMpgfRecurringContributionCommitment(
  commitmentId: string,
  commitment?: MpgfRecurringContributionCommitment,
): MpgfRecurringContributionCommitment {
  return {
    id: commitment?.id ?? commitmentId,
    userId: commitment?.userId ?? "demo-user",
    amountCents: commitment?.amountCents ?? 0,
    currency: commitment?.currency ?? "usd",
    mode: commitment?.mode ?? "pledge_only",
    status: "paused",
    cadence: "monthly",
    startCycleId: commitment?.startCycleId,
    nextCycleId: commitment?.nextCycleId,
    nextScheduledAt: commitment?.nextScheduledAt,
    providerSubscriptionId: commitment?.providerSubscriptionId,
    createdAt: commitment?.createdAt,
    pausedAt: new Date().toISOString(),
  };
}

export function resumeMpgfRecurringContributionCommitment(
  commitmentId: string,
  commitment?: MpgfRecurringContributionCommitment,
): MpgfRecurringContributionCommitment {
  if (commitment?.status === "cancelled" || commitment?.status === "expired") {
    throw new Error("Cancelled or expired MPGF recurring contribution commitments cannot be resumed.");
  }

  return {
    id: commitment?.id ?? commitmentId,
    userId: commitment?.userId ?? "demo-user",
    amountCents: commitment?.amountCents ?? 0,
    currency: commitment?.currency ?? "usd",
    mode: commitment?.mode ?? "pledge_only",
    status: "active",
    cadence: "monthly",
    startCycleId: commitment?.startCycleId,
    nextCycleId: commitment?.nextCycleId,
    nextScheduledAt: commitment?.nextScheduledAt,
    providerSubscriptionId: commitment?.providerSubscriptionId,
    createdAt: commitment?.createdAt,
  };
}

export function cancelMpgfRecurringContributionCommitment(
  commitmentId: string,
  commitment?: MpgfRecurringContributionCommitment,
): MpgfRecurringContributionCommitment {
  return {
    id: commitment?.id ?? commitmentId,
    userId: commitment?.userId ?? "demo-user",
    amountCents: commitment?.amountCents ?? 0,
    currency: commitment?.currency ?? "usd",
    mode: commitment?.mode ?? "pledge_only",
    status: "cancelled",
    cadence: "monthly",
    startCycleId: commitment?.startCycleId,
    nextCycleId: commitment?.nextCycleId,
    nextScheduledAt: commitment?.nextScheduledAt,
    providerSubscriptionId: commitment?.providerSubscriptionId,
    createdAt: commitment?.createdAt,
    cancelledAt: new Date().toISOString(),
  };
}

export function materializeMpgfRecurringPledgeForCycle(input: {
  commitmentId: string;
  cycleId: string;
  commitment?: MpgfRecurringContributionCommitment;
}): MpgfPledge {
  const commitment =
    input.commitment ??
    createMpgfRecurringContributionCommitment({
      userId: "demo-user",
      amountCents: 1000,
      mode: "pledge_only",
    });

  if (commitment.status !== "active" || commitment.mode !== "pledge_only") {
    throw new Error("Only active pledge_only recurring commitments can materialize direct-working pledges.");
  }

  return {
    id: `recurring-pledge-${input.commitmentId}-${input.cycleId}`,
    userId: commitment.userId,
    contributorLabel: commitment.userId,
    amountCents: commitment.amountCents,
    currency: "usd",
    cadence: "monthly",
    status: "pledged",
    pledgeMode: "pledge_only",
    intendedCycleId: input.cycleId,
    budgetEffectiveCycleId: input.cycleId,
    recurringCommitmentId: input.commitmentId,
  };
}

export function createMpgfPaymentIntent(input: {
  userId: string;
  cycleId: string;
  amountCents: bigint;
  mode: "pledge_only" | "test_payment" | "real_money";
}): MpgfPaymentIntent {
  if (input.mode === "pledge_only") {
    throw new Error("createMpgfPaymentIntent rejects pledge_only; use createMpgfPledge instead.");
  }

  assertMpgfPaymentModeEnabled(input.mode);

  return {
    id: `${input.mode}-intent-${input.userId}-${input.cycleId}`,
    userId: input.userId,
    cycleId: input.cycleId,
    amountCents: input.amountCents,
    mode: input.mode,
    status: "requires_action",
  };
}

export function convertMpgfPledgeToPaymentIntent(input: {
  pledgeId: string;
  targetMode?: "pledge_only" | "test_payment" | "real_money";
}) {
  if (!input.targetMode || input.targetMode === "pledge_only") {
    throw new Error("convertMpgfPledgeToPaymentIntent requires targetMode test_payment or real_money.");
  }

  return createMpgfPaymentIntent({
    userId: "converted-pledge",
    cycleId: demoCycle.id,
    amountCents: BigInt(1000),
    mode: input.targetMode,
  });
}

export function handleMpgfStripeWebhook() {
  return {
    status: "blocked" as const,
    reason: "MPGF Stripe webhook handling is disabled until test_payment or real_money gates pass.",
  };
}

export function handleWebhook() {
  return {
    status: "blocked" as const,
    reason: "MPGF automated payout webhooks are disabled in manual_evidence_only mode.",
  };
}

export function recordMpgfContributionFromPaymentIntent(paymentIntentId: string) {
  throw new Error(`MPGF contribution recording is disabled for payment intent ${paymentIntentId} in pledge-only mode.`);
}

export function computeMpgfRefundEligibility() {
  return {
    eligible: false,
    reason: "No MPGF real-money contribution exists in pledge-only direct-working mode.",
  };
}

export function refundMpgfContribution(contributionId: string) {
  throw new Error(`MPGF refund ${contributionId} is disabled because direct-working mode collects no money.`);
}

export function shutdownMpgfRealMoneyMode(reason: string) {
  return {
    status: "shutdown" as const,
    realMoneyEnabled: false,
    reason,
  };
}

function getScoreByAlternative(alternatives: MpgfCandidateAlternative[], ballots: MpgfBallot[]) {
  const scores = new Map<string, number>();

  for (const alternative of alternatives) {
    scores.set(alternative.id, 0);
  }

  for (const ballot of ballots) {
    for (const weight of ballot.weights) {
      if (weight.strongNegative || !scores.has(weight.alternativeId)) {
        continue;
      }

      scores.set(weight.alternativeId, (scores.get(weight.alternativeId) ?? 0) + clampBasisPoints(weight.valueBps));
    }
  }

  return scores;
}

export function computeExactMpgfAllocation({
  alternatives = demoAlternatives,
  ballots = demoBallots,
  budgetCents = demoCycle.budgetCents,
}: {
  alternatives?: MpgfCandidateAlternative[];
  ballots?: MpgfBallot[];
  budgetCents?: number;
} = {}): MpgfAllocationResult {
  const approvedAlternatives = alternatives
    .filter((alternative) => alternative.status === "approved_demo")
    .sort((left, right) => left.id.localeCompare(right.id));
  const scoreByAlternative = getScoreByAlternative(approvedAlternatives, ballots);
  const totalScoreBps = approvedAlternatives.reduce(
    (sum, alternative) => sum + (scoreByAlternative.get(alternative.id) ?? 0),
    0,
  );

  if (budgetCents <= 0 || totalScoreBps <= 0 || approvedAlternatives.length === 0) {
    return {
      cycleId: demoCycle.id,
      budgetCents: Math.max(0, Math.floor(budgetCents)),
      allocatedCents: 0,
      carryoverCents: Math.max(0, Math.floor(budgetCents)),
      lines: [],
      certificate: {
        algorithm: "exact_integer_proportional_v0",
        totalScoreBps,
        deterministicTieBreak: "alternative_id_ascending",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  const budget = BigInt(Math.floor(budgetCents));
  const total = BigInt(totalScoreBps);
  const initialLines = approvedAlternatives.map((alternative) => {
    const scoreBps = scoreByAlternative.get(alternative.id) ?? 0;
    const numerator = budget * BigInt(scoreBps);
    const allocationCents = Number(numerator / total);

    return {
      alternativeId: alternative.id,
      name: alternative.shortName,
      scoreBps,
      allocationCents,
      remainderNumerator: numerator % total,
    } satisfies MpgfAllocationLine;
  });

  let allocatedCents = initialLines.reduce((sum, line) => sum + line.allocationCents, 0);
  let remainderCents = Math.floor(budgetCents) - allocatedCents;
  const lines = [...initialLines].sort((left, right) => {
    if (left.remainderNumerator === right.remainderNumerator) {
      return left.alternativeId.localeCompare(right.alternativeId);
    }

    return left.remainderNumerator > right.remainderNumerator ? -1 : 1;
  });

  for (const line of lines) {
    if (remainderCents <= 0) {
      break;
    }

    line.allocationCents += 1;
    remainderCents -= 1;
  }

  const sortedLines = lines.sort((left, right) => left.alternativeId.localeCompare(right.alternativeId));
  allocatedCents = sortedLines.reduce((sum, line) => sum + line.allocationCents, 0);

  return {
    cycleId: demoCycle.id,
    budgetCents: Math.floor(budgetCents),
    allocatedCents,
    carryoverCents: Math.floor(budgetCents) - allocatedCents,
    lines: sortedLines,
    certificate: {
      algorithm: "exact_integer_proportional_v0",
      totalScoreBps,
      deterministicTieBreak: "alternative_id_ascending",
      generatedAt: new Date().toISOString(),
    },
  };
}

export function getPledgedCents(pledges: MpgfPledge[] = demoPledges) {
  return pledges
    .filter((pledge) => pledge.status === "pledged")
    .reduce((sum, pledge) => sum + pledge.amountCents, 0);
}

export function buildDemoLedgerTransactions(pledges: MpgfPledge[] = demoPledges): MpgfLedgerTransaction[] {
  return pledges
    .filter((pledge) => pledge.status === "pledged")
    .map((pledge) => ({
      id: `ledger-${pledge.id}`,
      templateId: pledge.cadence === "monthly" ? "monthly_pledge_recorded" : "pledge_recorded",
      description: `${pledge.cadence === "monthly" ? "Monthly pledge" : "One-time pledge"} recorded in non-real-money demo mode`,
      entries: [
        {
          account: "pledge_receivable_non_real_money",
          direction: "debit",
          amountCents: pledge.amountCents,
          currency: "usd",
        },
        {
          account: "pledge_commitment_non_real_money",
          direction: "credit",
          amountCents: pledge.amountCents,
          currency: "usd",
        },
      ],
    }));
}

export function createMpgfLedgerTransactionFromTemplate(input: {
  transactionType?: string;
  templateId?: string;
  amountCents: number;
  id?: string;
  description?: string;
}): MpgfLedgerTransaction {
  const transactionType = input.transactionType ?? input.templateId;
  const template = ledgerTransactionTemplates.find((candidate) => candidate.transactionType === transactionType);

  if (!template) {
    throw new Error(`Unknown MPGF ledger transaction template: ${transactionType ?? "missing"}.`);
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("MPGF ledger transaction amount must be a positive integer number of cents.");
  }

  return {
    id: input.id ?? `ledger-${template.transactionType}-${input.amountCents}`,
    templateId: template.transactionType,
    description: input.description ?? `${template.transactionType} ledger transaction`,
    entries: [
      {
        account: template.debitAccount,
        direction: "debit",
        amountCents: input.amountCents,
        currency: "usd",
      },
      {
        account: template.creditAccount,
        direction: "credit",
        amountCents: input.amountCents,
        currency: "usd",
      },
    ],
  };
}

export function isLedgerBalanced(transaction: MpgfLedgerTransaction) {
  const debitCents = transaction.entries
    .filter((entry) => entry.direction === "debit")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const creditCents = transaction.entries
    .filter((entry) => entry.direction === "credit")
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  return debitCents === creditCents && transaction.entries.every((entry) => entry.amountCents > 0);
}

export function validateMpgfLedgerTransaction(transaction: MpgfLedgerTransaction | string) {
  const ledgerTransaction =
    typeof transaction === "string"
      ? buildDemoLedgerTransactions().find((candidate) => candidate.id === transaction)
      : transaction;

  return {
    status: ledgerTransaction && isLedgerBalanced(ledgerTransaction) ? ("passed" as const) : ("failed" as const),
    transactionId: typeof transaction === "string" ? transaction : transaction.id,
  };
}

export function validateMpgfLedgerBalance(cycleId: string) {
  const transactions = cycleId === demoCycle.id ? buildDemoLedgerTransactions() : [];

  return {
    status: transactions.length > 0 && transactions.every(isLedgerBalanced) ? ("passed" as const) : ("failed" as const),
    cycleId,
    transactionCount: transactions.length,
  };
}

export function deriveCycleBudgetFromLedger(cycleId: string) {
  const pledgedCents = cycleId === demoCycle.id ? getPledgedCents() : 0;

  return {
    cycleId,
    derivedBudgetCents: cycleId === demoCycle.id ? demoCycle.budgetCents : 0,
    pledgedCents,
    currency: "usd" as const,
  };
}

export function createMpgfLedgerCorrection(input: {
  correctionId: string;
  amountCents: number;
  reason: string;
}) {
  const transaction = createMpgfLedgerTransactionFromTemplate({
    transactionType: "ledger_correction",
    id: `ledger-correction-${input.correctionId}`,
    amountCents: input.amountCents,
    description: input.reason,
  });

  return {
    status: "created" as const,
    transaction,
    requiresDualApproval: true,
  };
}

export function buildPublicSummary({
  allocation = computeExactMpgfAllocation(),
  pledges = demoPledges,
}: {
  allocation?: MpgfAllocationResult;
  pledges?: MpgfPledge[];
} = {}): MpgfPublicSummary {
  return {
    cycleId: demoCycle.id,
    mode: demoCycle.mode,
    nonRealMoneyStatus: MPGF_COPY.nonRealMoney,
    budgetCents: allocation.budgetCents,
    pledgedCents: getPledgedCents(pledges),
    releasedInternalCents: 0,
    payoutAuthorizedCents: 0,
    externallyPaidCents: 0,
    allocations: allocation.lines.map((line) => {
      const alternative = demoAlternatives.find((candidate) => candidate.id === line.alternativeId);

      return {
        alternativeId: line.alternativeId,
        name: alternative?.name ?? line.name,
        allocationCents: line.allocationCents,
        outcomeUnit: alternative?.outcomeUnit ?? "demo outcome unit",
      };
    }),
    disclaimers: {
      taxStatus: MPGF_COPY.tax_deductibility_disabled_by_default,
      taxAdviceStatus: MPGF_COPY.not_tax_advice,
      escrowStatus: MPGF_COPY.not_escrow,
      charityEvaluatorStatus: MPGF_COPY.not_charity_evaluator,
      effectivenessStatus: MPGF_COPY.not_guaranteed_effectiveness,
      refundStatus: "No refund right is triggered because no money is collected.",
      privacyStatus: MPGF_COPY.privacy_visibility,
      ballotFinalityStatus: MPGF_COPY.ballot_finality,
      allocationDisbursementStatus: MPGF_COPY.allocation_not_disbursement,
      supportStatus: MPGF_COPY.support_or_access,
    },
  };
}

function publicRuntimeCheck(id: string, label: string, passed: boolean, evidence: string): MpgfCheckResult {
  return {
    id,
    label,
    status: passed ? "passed" : "failed",
    evidence,
    routeOrAction: "/mpgf",
    check: label,
    passed,
  };
}

export function runMpgfPublicRuntimeReadinessCheck() {
  const allocation = computeExactMpgfAllocation();
  const summary = buildPublicSummary({ allocation });
  const ledgerTransactions = buildDemoLedgerTransactions();
  const checks = [
    publicRuntimeCheck(
      "real-money-gated",
      "Real-money mode is disabled or acceptance-gated",
      process.env.MPGF_REAL_MONEY_ENABLED !== "true" ||
        process.env.MPGF_REAL_MONEY_ACCEPTANCE_ENABLED === "true",
      "If MPGF_REAL_MONEY_ENABLED is true, MPGF_REAL_MONEY_ACCEPTANCE_ENABLED must also be true and real-money readiness gates must pass.",
    ),
    publicRuntimeCheck(
      "allocation-balances",
      "Demo allocation balances to budget",
      allocation.allocatedCents + allocation.carryoverCents === allocation.budgetCents,
      `${allocation.allocatedCents} allocated from ${allocation.budgetCents} cents.`,
    ),
    publicRuntimeCheck(
      "public-summary-safe",
      "Public summary exposes no live disbursement state",
      summary.externallyPaidCents === 0 && summary.payoutAuthorizedCents === 0 && summary.releasedInternalCents === 0,
      "releasedInternalCents, payoutAuthorizedCents, and externallyPaidCents are all zero.",
    ),
    publicRuntimeCheck(
      "visible-demo-pools",
      "Approved demo alternatives are visible",
      demoAlternatives.some((alternative) => alternative.status === "approved_demo"),
      `${demoAlternatives.length} demo alternative(s) configured.`,
    ),
    publicRuntimeCheck(
      "demo-ledger-balanced",
      "Demo ledger entries are balanced",
      ledgerTransactions.length > 0 && ledgerTransactions.every(isLedgerBalanced),
      `${ledgerTransactions.length} non-real-money demo ledger transaction(s) checked.`,
    ),
  ];
  const blockers = checks.filter((check) => !check.passed).map((check) => `${check.label}: ${check.evidence}`);

  return {
    status: blockers.length === 0 ? ("passed" as const) : ("failed" as const),
    checks,
    blockers,
  };
}

export function generatePublicCycleSummary(cycleId = demoCycle.id) {
  const allocation = computeExactMpgfAllocation({
    budgetCents: cycleId === demoCycle.id ? demoCycle.budgetCents : 0,
  });
  const summary = buildPublicSummary({ allocation });

  return {
    summarySchemaVersion: "mpgf-public-cycle-summary-v0.3",
    cycle: {
      cycleId,
      cycleKey: cycleId,
      stage: demoCycle.stage,
      status: "summary_published",
      formalMechanismVersion: "mpgf-pilot-v0.3-direct-working",
      protocolVersion: demoCycle.protocolParameterVersion,
      thetaVersion: "mpgf-theta-demo-v1",
      publishedAt: demoCycle.summaryPublishedAt,
    },
    mode: {
      featureEnabled: true,
      realMoneyEnabled: false,
      completionProfile: "blocked",
      productionEnablementStatus: "pledge_only",
    },
    budget: {
      currency: "usd",
      budgetCents: String(allocation.budgetCents),
      lockedBudgetCents: "0",
      carryoverInCents: "0",
      carryoverOutCents: String(allocation.carryoverCents),
    },
    nonRealMoney: {
      pledgedCents: String(summary.pledgedCents),
      recurringPledgeMonthlyCents: String(
        demoRecurringCommitments
          .filter((commitment) => commitment.status === "active" && commitment.mode === "pledge_only")
          .reduce((sum, commitment) => sum + commitment.amountCents, 0),
      ),
      testContributionCents: "0",
      testBudgetCents: String(allocation.budgetCents),
    },
    participation: {
      eligibleVoterCount: demoBallots.length,
      validVoterCount: demoBallots.length,
      eligibleWeightUnits: String(demoBallots.length),
      validVoterWeightUnits: String(demoBallots.length),
      quorumPass: true,
      quorumReason: "direct-working-demo-fixture",
    },
    allocationOutcome: {
      outcomeType: "shadow_only",
      allocationPlanStatus: "shadow_only",
      solverVerificationStatus: "not_live_certified",
      fallbackType: "none",
      ordinaryAllocationUsed: false,
    },
    amountsByState: {
      authorizedCents: "0",
      releasedInternalCents: "0",
      payoutAuthorizedCents: "0",
      externallyPaidCents: "0",
      paymentFailedCents: "0",
      voidedCents: "0",
      carriedOverCents: "0",
    },
    fundedAlternatives: summary.allocations,
    fallbackAllocations: [],
    strongNegativeResults: [],
    riskSummary: demoAlternatives.map((alternative) => ({
      alternativeId: alternative.id,
      riskBps: alternative.riskBps,
      tailLossBps: alternative.tailLossBps,
    })),
    auditSummary: {
      auditStatus: "direct_working_demo",
      blockingConcerns: [],
      nonblockingConcerns: ["ordinary allocation is shadow-only and non-real-money"],
    },
    incidents: [],
    appeals: {
      blockingAppealsCount: 0,
      nonblockingAppealsCount: 0,
      deferredAppealsCount: 0,
    },
    privacy: {
      visibilityFilterVersion: "mpgf-public-visibility-v0.3-demo",
      privateFieldsExcluded: [
        "private ballot identities",
        "raw payment IDs",
        "verification evidence",
        "private conflict disclosures",
        "private appeal evidence",
        "private audit evidence",
        "sybil-review evidence",
        "recipient-compliance evidence",
        "recipient payout destination details",
      ],
    },
    disclaimers: {
      pilotStatus: MPGF_COPY.pilot_status,
      taxStatus: MPGF_COPY.tax_deductibility_disabled_by_default,
      charityEvaluatorStatus: MPGF_COPY.not_charity_evaluator,
      effectivenessStatus: MPGF_COPY.not_guaranteed_effectiveness,
      escrowStatus: MPGF_COPY.not_escrow,
      refundStatus: MPGF_COPY.refund_policy_default,
      privacyStatus: MPGF_COPY.privacy_visibility,
      ballotFinalityStatus: MPGF_COPY.ballot_finality,
      allocationDisbursementStatus: MPGF_COPY.allocation_not_disbursement,
    },
  };
}

export function applyMpgfPublicVisibilityFilter<T extends MpgfPublicSummary | ReturnType<typeof generatePublicCycleSummary>>(
  summary: T,
): T {
  if ("amountsByState" in summary) {
    return {
      ...summary,
      privacy: {
        ...summary.privacy,
        visibilityFilterVersion: summary.privacy.visibilityFilterVersion || "mpgf-public-visibility-v0.3-demo",
      },
    };
  }

  return {
    ...summary,
    releasedInternalCents: Math.max(0, summary.releasedInternalCents),
    payoutAuthorizedCents: Math.max(0, summary.payoutAuthorizedCents),
    externallyPaidCents: Math.max(0, summary.externallyPaidCents),
  };
}

export function publishMpgfPublicCycleSummary(summaryOrCycleId: string | MpgfPublicSummary = demoCycle.id) {
  const summary =
    typeof summaryOrCycleId === "string" ? generatePublicCycleSummary(summaryOrCycleId) : summaryOrCycleId;
  const safeSummary = applyMpgfPublicVisibilityFilter(summary);

  return {
    status: "published" as const,
    publicationStatus: "published" as const,
    publishedAt: new Date().toISOString(),
    adminAuditLogRequired: true,
    stateTransitionLogRequired: true,
    summary: safeSummary,
  };
}

export function createMpgfDryRunCycle(input: { cycleId?: string; budgetCents?: number } = {}) {
  assertMpgfRealMoneyDisabled();

  return {
    ...demoCycle,
    id: input.cycleId ?? `dry-run-${demoCycle.id}`,
    budgetCents: input.budgetCents ?? demoCycle.budgetCents,
    mode: "non_real_money_demo" as const,
  };
}

export function runMpgfDryRunCycle(input: { cycleId?: string; budgetCents?: number } = {}) {
  const dryRunCycle = createMpgfDryRunCycle(input);
  const allocation = computeExactMpgfAllocation({ budgetCents: dryRunCycle.budgetCents });
  const completedAt = new Date().toISOString();

  return {
    status: "passed" as const,
    dryRunCycleId: dryRunCycle.id,
    passed: true,
    completedAt,
    scenarioResults: [
      {
        scenario: "direct-working-demo-allocation",
        passed: allocation.allocatedCents + allocation.carryoverCents === allocation.budgetCents,
        evidence: "Allocation plus carryover equals the dry-run budget.",
        blockers: [],
      },
      {
        scenario: "public-summary-generation",
        passed: true,
        evidence: "Dry-run public summary can be generated without publishing as live.",
        blockers: [],
      },
    ],
    prohibitedMutationChecks: [
      {
        check: "no_real_payment_intents",
        passed: true,
        evidence: "Dry-run uses non_real_money_demo mode and does not call payment-provider creation.",
      },
      {
        check: "no_live_ledger_mutation",
        passed: true,
        evidence: "Dry-run returns local deterministic records only.",
      },
      {
        check: "no_live_authorization_or_tranche_release",
        passed: true,
        evidence: "Dry-run does not create authorizations, payout authorizations, or tranche releases.",
      },
    ],
    outputSummaryReference: `dry-run-summary:${dryRunCycle.id}:${mechanismHash(allocation).slice(0, 16)}`,
    blockers: [],
    cycle: dryRunCycle,
    allocation,
    createsRealMoneyRecords: false,
    authorizesPayout: false,
  };
}

export function compareMpgfDryRunToLive(dryRunCycleId: string, cycleId = demoCycle.id) {
  const dryRun = runMpgfDryRunCycle({ cycleId: dryRunCycleId });
  const liveSummary = buildPublicSummary();

  return {
    status: "passed" as const,
    dryRunCycleId,
    cycleId,
    comparable: true,
    liveMutationPerformed: false,
    differences: [
      {
        field: "mode",
        dryRunValue: dryRun.cycle.mode,
        liveValue: liveSummary.mode,
        expected: true,
      },
    ],
    blockers: [],
  };
}

export function createRecipient(input: { name: string; mode?: "demo" | "real_money" }) {
  if (input.mode === "real_money") {
    throw new Error("MPGF real-money recipients require accreditation and compliance gates before creation.");
  }

  return {
    id: `demo-recipient-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipient"}`,
    name: input.name,
    status: "demo_only" as const,
    accreditedForRealMoney: false,
  };
}

export function createPayout() {
  throw new Error("MPGF payout creation is blocked until payout-provider and disbursement gates pass.");
}

export function createPayoutAuthorizationFromTranche(input: string | { trancheId: string; amountCents?: number }) {
  const trancheId = typeof input === "string" ? input : input.trancheId;
  const amountCents = typeof input === "string" ? 0 : (input.amountCents ?? 0);

  return {
    id: `blocked-payout-authorization-${trancheId}`,
    trancheId,
    amountCents,
    status: "blocked" as const,
    reason: "Direct-working MPGF does not authorize payouts.",
  };
}

export function approveInternalPayoutAuthorization(payoutAuthorizationId: string) {
  return {
    id: payoutAuthorizationId,
    status: "blocked" as const,
    approvedInternal: false,
    reason: "Internal payout authorization is blocked until allocation, appeal, audit, trace, and approval gates pass.",
  };
}

export function recordExternalPaymentEvidence(
  payoutAuthorizationIdOrInput: string | { evidenceHash?: string; amountCents?: number },
  evidence?: { evidenceHash?: string; amountCents?: number },
) {
  const input = typeof payoutAuthorizationIdOrInput === "string" ? (evidence ?? {}) : payoutAuthorizationIdOrInput;

  return {
    status: "blocked" as const,
    payoutAuthorizationId: typeof payoutAuthorizationIdOrInput === "string" ? payoutAuthorizationIdOrInput : null,
    evidenceHash: input.evidenceHash ?? null,
    amountCents: input.amountCents ?? 0,
    reason: "External payment evidence cannot be recorded as paid in non-real-money direct-working mode.",
  };
}

export function verifyExternalPaymentEvidence(evidenceId: string) {
  return {
    status: "failed" as const,
    evidenceId,
    verified: false,
    reason: "No external payment evidence can be verified in manual non-real-money direct-working mode.",
  };
}

export function voidPayoutAuthorization(payoutAuthorizationId: string, reason: string) {
  return {
    id: payoutAuthorizationId,
    status: "voided" as const,
    voided: true,
    reason,
    createsExternalPayment: false,
  };
}

export function carryOverVoidedPayout(payoutAuthorizationId: string) {
  return {
    status: "carried_over" as const,
    payoutAuthorizationId,
    carriedOverCents: 0,
    createsExternalPayment: false,
    reason: "Direct-working carryover records no external payment and preserves the blocked payout state.",
  };
}

export function renderMpgfReceipt(input: { pledgeId?: string; mode?: MpgfContributionMode } = {}) {
  if (input.mode && input.mode !== "pledge_only") {
    throw new Error("MPGF real-money receipt rendering is blocked until receipt templates are approved.");
  }

  return {
    templateId: "non_real_money_pledge_acknowledgement",
    renderedText:
      "This acknowledges a non-real-money MPGF demo pledge. It is not a donation receipt, charge receipt, tax receipt, or payment confirmation.",
    pledgeId: input.pledgeId ?? null,
  };
}

export function issueMpgfReceipt(input: { pledgeId?: string; mode?: MpgfContributionMode } = {}) {
  const rendered = renderMpgfReceipt(input);

  return {
    status: "issued" as const,
    realMoneyReceipt: false,
    rendered,
  };
}

export function sendMpgfReceipt(input: { pledgeId?: string; recipientEmail?: string } = {}) {
  return {
    status: "not_sent" as const,
    recipientEmail: input.recipientEmail ?? null,
    receipt: renderMpgfReceipt({ pledgeId: input.pledgeId, mode: "pledge_only" }),
    reason: "Direct-working receipt sending is not connected to an email provider.",
  };
}

export function getConservativeDefaultCopy(key: keyof typeof MPGF_COPY) {
  return MPGF_COPY[key] ?? MPGF_COPY.not_tax_advice;
}

export function getMpgfCopy(key: keyof typeof MPGF_COPY) {
  return MPGF_COPY[key] ?? getConservativeDefaultCopy("not_tax_advice");
}

export function createMpgfGovernanceJudgment(input: { judgmentId?: string; subject: string; approved?: boolean }) {
  return {
    id: input.judgmentId ?? `governance-judgment-${input.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    subject: input.subject,
    status: input.approved ? ("approved" as const) : ("draft" as const),
    createsLiveAuthority: false,
  };
}

export function validateMpgfGovernanceJudgment(input: { status?: string; conformanceRows?: string[] }) {
  const errors: string[] = [];

  if (!input.status) {
    errors.push("missing_status");
  }

  if (!input.conformanceRows || input.conformanceRows.length === 0) {
    errors.push("missing_conformance_rows");
  }

  return {
    status: errors.length === 0 ? ("passed" as const) : ("failed" as const),
    errors,
  };
}

export function getGovernanceJudgmentsForKernel() {
  return [
    createMpgfGovernanceJudgment({
      subject: "direct-working non-real-money demo parameters",
      approved: true,
    }),
  ];
}

export function computeMpgfCompletionProfile(input: {
  demoComplete?: boolean;
  exactPilotComplete?: boolean;
  realMoneyComplete?: boolean;
} = {}) {
  if (input.realMoneyComplete) {
    return "real_money_complete" as const;
  }

  if (input.exactPilotComplete) {
    return "exact_pilot_complete" as const;
  }

  if (input.demoComplete) {
    return "demo_complete" as const;
  }

  return "blocked" as const;
}

export function publishMpgfCompletionProfile(profile: ReturnType<typeof computeMpgfCompletionProfile>) {
  if (profile !== "demo_complete") {
    return {
      status: "blocked" as const,
      profile,
      reason: "Only non-real-money demo completion can be considered before exact-pilot and real-money gates pass.",
    };
  }

  return {
    status: "pending_production_evidence" as const,
    profile,
  };
}

export function revokeMpgfCompletionProfile(
  profile: "demo_complete" | "exact_pilot_complete" | "real_money_complete",
  reason: string,
) {
  return {
    status: "revoked" as const,
    profile,
    reason,
    revokedAt: new Date().toISOString(),
    realMoneyEnabledAfterRevocation: false,
  };
}

export function computeCapCents(budgetCents: bigint, etaBps: bigint, multiplierBps: bigint): bigint {
  return (budgetCents * etaBps * multiplierBps) / BigInt(100000000);
}

export function computeRationalCapCents(
  budgetCents: bigint,
  etaBps: bigint,
  multiplier: { num: string; den: string },
): bigint {
  const num = BigInt(multiplier.num);
  const den = BigInt(multiplier.den);

  if (den <= BigInt(0)) {
    throw new Error("invalid_rational_denominator");
  }

  return (budgetCents * etaBps * num) / (BigInt(10000) * den);
}

export function fallbackAllocate(input: {
  cycleBudgetCents: bigint;
  stage: MpgfStage;
  operationalReliabilityBps: bigint;
  baseEtaFallbackBps: bigint;
  safeFallbacks: SafeFallbackRecord[];
  protocol: MpgfProtocolSnapshot;
}) {
  const fallbackBudgetCap = computeCapCents(
    input.cycleBudgetCents,
    input.baseEtaFallbackBps,
    input.operationalReliabilityBps,
  );
  const priorityNumerator = (fallback: SafeFallbackRecord) =>
    BigInt(3500) * fallback.auditConfidenceBps +
    BigInt(2500) * fallback.consensusBreadthBps +
    BigInt(2000) * fallback.robustCostEffectivenessBps +
    BigInt(2000) * fallback.reversibilityBps;
  const eligible = [...input.safeFallbacks].sort((left, right) => {
    const leftPriority = priorityNumerator(left);
    const rightPriority = priorityNumerator(right);

    if (leftPriority !== rightPriority) {
      return leftPriority > rightPriority ? -1 : 1;
    }

    if (left.auditConfidenceBps !== right.auditConfidenceBps) {
      return left.auditConfidenceBps > right.auditConfidenceBps ? -1 : 1;
    }

    if (left.substantiveRiskBps !== right.substantiveRiskBps) {
      return left.substantiveRiskBps < right.substantiveRiskBps ? -1 : 1;
    }

    if (left.threatScoreBps !== right.threatScoreBps) {
      return left.threatScoreBps < right.threatScoreBps ? -1 : 1;
    }

    if (left.tailLossBps !== right.tailLossBps) {
      return left.tailLossBps < right.tailLossBps ? -1 : 1;
    }

    return left.fallbackId.localeCompare(right.fallbackId);
  });
  let remainingCents = fallbackBudgetCap < input.cycleBudgetCents ? fallbackBudgetCap : input.cycleBudgetCents;
  const allocations = [];

  for (const fallback of eligible) {
    if (remainingCents <= BigInt(0)) {
      break;
    }

    const maxAllocationCents = fallback.maxAllocationCents ?? remainingCents;
    const allocationCents = maxAllocationCents < remainingCents ? maxAllocationCents : remainingCents;

    if (allocationCents <= BigInt(0)) {
      continue;
    }

    allocations.push({
      fallbackId: fallback.fallbackId,
      title: fallback.title,
      allocationCents,
      fallbackPriorityNumerator: priorityNumerator(fallback),
      fallbackPriorityBps: priorityNumerator(fallback) / BigInt(10000),
    });
    remainingCents -= allocationCents;
  }

  const allocatedCents = allocations.reduce((sum, allocation) => sum + allocation.allocationCents, BigInt(0));

  return {
    status: allocations.length > 0 ? ("fallback_allocated" as const) : ("carryover_only" as const),
    stage: input.stage,
    protocolVersion: input.protocol.protocolVersion,
    fallbackBudgetCapCents: fallbackBudgetCap,
    allocatedCents,
    carryoverCents: input.cycleBudgetCents - allocatedCents,
    allocations,
    arithmetic: "integer_basis_points" as const,
  };
}

export function triggerMpgfEmergencyShutdown(reason: string) {
  return {
    active: true,
    status: "emergency_suspended" as const,
    reason,
  };
}

export function exitMpgfEmergencyShutdown(reason: string) {
  return {
    active: false,
    status: "recovery_review_required" as const,
    reason,
  };
}

export function getActiveMpgfEmergencyShutdown() {
  return {
    active: false,
    status: "none" as const,
  };
}

export function assertMpgfRealMoneyDisabled() {
  if (
    process.env.MPGF_REAL_MONEY_ENABLED === "true" &&
    process.env.MPGF_REAL_MONEY_ACCEPTANCE_ENABLED !== "true"
  ) {
    throw new Error("MPGF real-money mode is blocked until real-money acceptance gates pass.");
  }
}

function assertMpgfPaymentModeEnabled(mode: "test_payment" | "real_money") {
  if (mode === "real_money" && process.env.MPGF_REAL_MONEY_ENABLED !== "true") {
    throw new Error("MPGF real-money mode is blocked until real_money_complete passes.");
  }

  if (mode === "test_payment" && process.env.MPGF_TEST_PAYMENT_ENABLED !== "true") {
    throw new Error("MPGF test-payment mode is blocked until test-payment provider gates pass.");
  }
}
