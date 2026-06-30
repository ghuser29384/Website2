import {
  demoMpgfAssurancePledges,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsPaymentProofs,
  demoMpgfPublicGoodsReviewCases,
} from "./data";
import { allocateMpgfAssuranceRound, getMpgfCampaignAssuranceStatus } from "./mechanism";
import type { MpgfParticipantState } from "./participant-types";
import { MPGF_CRECM_PLAIN_LANGUAGE_LABELS } from "./public-goods-crecm-labels";
import { buildMpgfPublicGoodsMilestoneSchedule } from "./public-goods-milestones";
import type { MpgfRealMoneyAccountState } from "./real-money-types";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsRoundAllocation,
} from "./types";

export const MPGF_CONTRIBUTION_PROOF_LEDGER_SCHEMA_VERSION = "mpgf-contribution-proof-ledger-v3";

export const MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER = [
  "charged",
  "sent_to_projects",
  "counted_for_matching",
  "sponsor_added",
  "rewards_credits_certificates",
  "failed_carry_forward",
] as const;

export type MpgfContributionSettlementSummaryGroupKey =
  (typeof MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER)[number];

export type MpgfContributionProofLedgerTone = "passed" | "pending" | "paused" | "blocked" | "not_started";

export interface MpgfContributionProofLedgerStatus {
  code: string;
  tone: MpgfContributionProofLedgerTone;
  label: string;
  detail: string;
  nextAction: string;
  moneyAffected: string;
  correctionPath: string;
}

export interface MpgfContributionProofLedgerMilestone {
  id: string;
  label: string;
  releasePct: number;
  amountCents: number;
  status: MpgfContributionProofLedgerTone;
  evidenceRequirements: string[];
}

export interface MpgfContributionProofLedgerAccounting {
  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualContributionCents: number;
  countedContributionCents: number;
  matchEligibleContributionCents: number;
  sponsorBaseMatchCents: number;
  sponsorBonusMatchCents: number;
  successRewardCents: number;
  failureBonusOrCarryForwardCreditCents: number;
  coordinationCreditCount: number;
  impactCertificateCount: number;
  proofState:
    | "verified_payment_proof"
    | "pending_payment_proof"
    | "rejected_payment_proof"
    | "no_payment_proof";
  proofDetail: string;
}

export interface MpgfContributionSettlementSummaryLine {
  label: string;
  technicalField: string;
  cents: number | null;
  count: number | null;
  includedInSentToProjects: boolean;
  includedInMatchEligibleDollars: boolean;
}

export interface MpgfContributionSettlementSummaryGroup {
  key: MpgfContributionSettlementSummaryGroupKey;
  label: string;
  lines: MpgfContributionSettlementSummaryLine[];
}

export interface MpgfContributionSettlementSummary {
  groupOrder: typeof MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER;
  groups: Record<MpgfContributionSettlementSummaryGroupKey, MpgfContributionSettlementSummaryGroup>;
  detailsDrawerRequired: true;
  finalReceiptRequired: true;
  summaryNumbersMustNotCombineChannels: true;
  sentToProjectsExcludesFeesRewardsCreditsCertificatesAndSponsorMatch: true;
  countedForMatchingUsesCountedAndMatchEligibleOnly: true;
  rewardsCreditsCertificatesExcludedFromPublicGoodDollars: true;
  technicalAccounting: MpgfContributionProofLedgerAccounting & {
    failedAllocationsCents: number;
    carryForwardCreditCents: number;
  };
}

export interface MpgfContributionProofLedgerRow {
  pledgeId: string;
  campaignId: string;
  campaignTitle: string;
  maximumBudgetCents: number;
  currentlyRoutedAllocationsCents: number;
  pendingThresholdAllocationsCents: number;
  failedAllocationsCents: number;
  failureBonusOrCarryForwardCreditCents: number;
  identityStatus: MpgfContributionProofLedgerStatus;
  thresholdStatus: MpgfContributionProofLedgerStatus;
  destinationProofStatus: MpgfContributionProofLedgerStatus;
  challengeWindowStatus: MpgfContributionProofLedgerStatus;
  payoutMilestoneStatus: MpgfContributionProofLedgerStatus;
  payoutMilestones: MpgfContributionProofLedgerMilestone[];
  accounting: MpgfContributionProofLedgerAccounting;
  settlementSummary: MpgfContributionSettlementSummary;
}

export interface MpgfContributionProofLedger {
  schemaVersion: typeof MPGF_CONTRIBUTION_PROOF_LEDGER_SCHEMA_VERSION;
  participantLabel: string;
  maximumBudgetCents: number;
  currentlyRoutedAllocationsCents: number;
  pendingThresholdAllocationsCents: number;
  failedAllocationsCents: number;
  failureBonusOrCarryForwardCreditCents: number;
  carryForwardCreditCents: number;
  identityStatus: MpgfContributionProofLedgerStatus;
  thresholdStatus: MpgfContributionProofLedgerStatus;
  destinationProofStatus: MpgfContributionProofLedgerStatus;
  challengeWindowStatus: MpgfContributionProofLedgerStatus;
  payoutMilestones: MpgfContributionProofLedgerMilestone[];
  accounting: MpgfContributionProofLedgerAccounting;
  settlementSummary: MpgfContributionSettlementSummary;
  rows: MpgfContributionProofLedgerRow[];
  warnings: string[];
}

const defaultCorrectionPath =
  "Use the account correction or appeal path if this status does not match your evidence.";

function status(
  code: string,
  tone: MpgfContributionProofLedgerTone,
  label: string,
  detail: string,
  nextAction: string,
  moneyAffected: string,
  correctionPath = defaultCorrectionPath,
): MpgfContributionProofLedgerStatus {
  return {
    code,
    tone,
    label,
    detail,
    nextAction,
    moneyAffected,
    correctionPath,
  };
}

function isActivePledge(pledge: MpgfPublicGoodsPledge) {
  return pledge.status === "pledged" || pledge.status === "captured";
}

function isFailedPledge(pledge: MpgfPublicGoodsPledge) {
  return (
    pledge.status === "voided" ||
    pledge.status === "expired" ||
    pledge.eligibilityState === "duplicate_identity" ||
    pledge.eligibilityState === "blocked"
  );
}

function activeRealMoneyBudgetCents(accountState?: MpgfRealMoneyAccountState) {
  return (accountState?.contributions ?? []).reduce((sum, contribution) => {
    if (
      contribution.status === "pending" ||
      contribution.status === "recorded" ||
      contribution.status === "late_assigned_next_cycle"
    ) {
      return sum + contribution.amountCents;
    }

    return sum;
  }, 0);
}

function lateCarryForwardCreditCents(accountState?: MpgfRealMoneyAccountState) {
  return (accountState?.contributions ?? []).reduce((sum, contribution) => {
    return contribution.status === "late_assigned_next_cycle" ? sum + contribution.amountCents : sum;
  }, 0);
}

function activeSubscriptionBudgetCents(participantState?: MpgfParticipantState) {
  return (participantState?.publicGoodsSubscriptions ?? []).reduce((sum, subscription) => {
    return subscription.status === "active" ? sum + subscription.amountCents : sum;
  }, 0);
}

function mergeRoundPledges(participantPledges: MpgfPublicGoodsPledge[], fixturePledges: MpgfPublicGoodsPledge[]) {
  const byId = new Map(fixturePledges.map((pledge) => [pledge.id, pledge]));

  for (const pledge of participantPledges) {
    byId.set(pledge.id, pledge);
  }

  return [...byId.values()];
}

function paymentProofForPledge(
  pledge: MpgfPublicGoodsPledge,
  paymentProofs: MpgfPublicGoodsPaymentProof[],
) {
  const pledgeSpecific = paymentProofs.find((proof) => proof.pledgeId === pledge.id);

  if (pledgeSpecific) {
    return pledgeSpecific;
  }

  return paymentProofs.find((proof) => proof.campaignId === pledge.campaignId);
}

function identityStatusForPledge(
  participantState: MpgfParticipantState | undefined,
  pledge: MpgfPublicGoodsPledge,
) {
  if (participantState?.status === "sign_in_required") {
    return status(
      "sign_in_required",
      "not_started",
      "Sign in required",
      "The ledger can only attach identity review to a signed-in participant.",
      "Sign in with the account that created the contribution intent.",
      "No payment or allocation is affected.",
      "Sign in first, then request correction if the loaded account is wrong.",
    );
  }

  if (pledge.eligibilityState === "duplicate_identity") {
    return status(
      "duplicate_identity",
      "blocked",
      "Duplicate identity blocked",
      "This intent is excluded from threshold and allocation counts.",
      "Use the correction path if this duplicate finding is wrong.",
      "The pledge is not routed or captured.",
    );
  }

  if (pledge.eligibilityState === "blocked") {
    return status(
      "identity_blocked",
      "blocked",
      "Identity blocked",
      "Identity or eligibility review is blocking this contribution intent.",
      "Submit corrected identity evidence or wait for review.",
      "The pledge is not routed or captured.",
    );
  }

  if (pledge.eligibilityState === "pending_review") {
    return status(
      "identity_pending_review",
      "pending",
      "Identity pending review",
      "The participant can save the intent, but it does not count until review clears.",
      "Wait for reviewer action or submit missing evidence.",
      "The pledge is not counted toward release.",
    );
  }

  if (pledge.eligibilityState === "below_minimum") {
    return status(
      "below_minimum",
      "blocked",
      "Below minimum",
      "The intent is below the minimum counted amount for this route.",
      "Increase the maximum budget or choose another route.",
      "The pledge is not counted toward release.",
    );
  }

  return status(
    "eligible_identity",
    "passed",
    "Eligible identity",
    "The identity gate is non-blocking for this saved intent.",
    "No identity action is needed.",
    "The pledge can count if the other gates pass.",
  );
}

function thresholdStatusForPledge({
  campaign,
  pledge,
  roundPledges,
  now,
}: {
  campaign?: MpgfPublicGoodsCampaign;
  pledge: MpgfPublicGoodsPledge;
  roundPledges: MpgfPublicGoodsPledge[];
  now: Date;
}) {
  if (!campaign) {
    return status(
      "campaign_missing",
      "blocked",
      "Campaign unavailable",
      "The pledge points to a campaign that is not available in the current round.",
      "Choose a current campaign or request support correction.",
      "The pledge is not routed.",
    );
  }

  if (isFailedPledge(pledge)) {
    return status(
      "pledge_not_counted",
      "blocked",
      "Not counted",
      "This intent failed eligibility or was voided before threshold review.",
      "Review the row-level blocker before creating a new intent.",
      "The pledge is not routed.",
    );
  }

  const assurance = getMpgfCampaignAssuranceStatus(campaign, roundPledges, now);

  if (assurance.thresholdPassed) {
    return status(
      "threshold_met",
      "passed",
      "Threshold met",
      "Amount and verified-supporter thresholds are non-blocking.",
      "Wait for proof, review, challenge, and release gates if any remain.",
      "The pledge may be routed after the remaining gates pass.",
    );
  }

  if (assurance.deadlinePassed) {
    return status(
      "threshold_missed",
      "blocked",
      "Threshold missed",
      "The round deadline passed before this route met its threshold.",
      "Use carry-forward or create a new intent in a later round.",
      "The pledge is not captured for this route.",
    );
  }

  return status(
    "threshold_pending",
    "pending",
    "Threshold pending",
    "This route still needs more counted amount or verified supporters.",
    "Wait for more support or invite someone through a user-initiated link.",
    "The pledge remains conditional.",
  );
}

function destinationProofStatusForPledge({
  pledge,
  thresholdStatus,
  paymentProofs,
}: {
  pledge: MpgfPublicGoodsPledge;
  thresholdStatus: MpgfContributionProofLedgerStatus;
  paymentProofs: MpgfPublicGoodsPaymentProof[];
}) {
  if (thresholdStatus.tone === "blocked") {
    return status(
      "proof_not_started",
      "not_started",
      "Proof not started",
      "Destination proof is not requested while the route is blocked.",
      "Resolve the blocking threshold or eligibility state first.",
      "No payout release can occur.",
    );
  }

  const proof = paymentProofForPledge(pledge, paymentProofs);

  if (proof?.status === "verified") {
    return status(
      "destination_proof_verified",
      "passed",
      "Destination proof verified",
      "A reviewed provider, receipt, or external handoff proof is non-blocking.",
      "No proof action is needed for this proof record.",
      "The proof can support release after challenge and milestone gates pass.",
    );
  }

  if (proof?.status === "rejected") {
    return status(
      "destination_proof_rejected",
      "blocked",
      "Destination proof rejected",
      "The available proof did not satisfy the destination or provider evidence claim.",
      "Submit corrected proof or use the appeal path.",
      "The affected amount cannot be released.",
    );
  }

  if (proof?.status === "pending_review") {
    return status(
      "destination_proof_pending_review",
      "pending",
      "Proof pending review",
      "Destination proof has been submitted but not accepted yet.",
      "Wait for review or submit the missing claim-typed evidence.",
      "The affected amount is not released.",
    );
  }

  if (thresholdStatus.tone !== "passed") {
    return status(
      "proof_after_threshold",
      "not_started",
      "Proof after threshold",
      "Destination proof is requested only after threshold and eligibility gates are non-blocking.",
      "Wait for threshold clearance before submitting release evidence.",
      "The pledge remains conditional.",
    );
  }

  return status(
    "destination_proof_required",
    "pending",
    "Proof required",
    "Provider, receipt, fiscal-host, or signed-intent proof is still required.",
    "Submit claim-typed destination proof or wait for provider import.",
    "The affected amount is not released.",
  );
}

function challengeWindowStatusForCampaign({
  campaign,
  reviewCases,
  now,
}: {
  campaign?: MpgfPublicGoodsCampaign;
  reviewCases: MpgfPublicGoodsReviewCase[];
  now: Date;
}) {
  if (!campaign) {
    return status(
      "challenge_unavailable",
      "blocked",
      "Challenge status unavailable",
      "The campaign record is unavailable, so challenge status fails closed.",
      "Request correction for the campaign reference.",
      "No payout release can occur.",
    );
  }

  const relevantReviews = reviewCases.filter((reviewCase) => reviewCase.campaignId === campaign.id);
  const challengeEnd = relevantReviews.find((reviewCase) => reviewCase.challengeWindowEndsAt)?.challengeWindowEndsAt ??
    campaign.challengeWindowEndsAt;
  const challengeEndMs = challengeEnd ? Date.parse(challengeEnd) : Number.NaN;
  const openChallenge = relevantReviews.some((reviewCase) => {
    if (reviewCase.action !== "challenge" || reviewCase.closedAt) {
      return false;
    }

    const reviewEnd = reviewCase.challengeWindowEndsAt ?? campaign.challengeWindowEndsAt;
    const reviewEndMs = reviewEnd ? Date.parse(reviewEnd) : Number.NaN;

    return !Number.isFinite(reviewEndMs) || now.getTime() <= reviewEndMs;
  });

  if (openChallenge || (Number.isFinite(challengeEndMs) && now.getTime() <= challengeEndMs)) {
    return status(
      "challenge_window_open",
      "paused",
      "Challenge window open",
      challengeEnd ? `The public challenge window remains open until ${new Date(challengeEnd).toLocaleDateString("en-US")}.` : "A challenge window is open.",
      "Wait for the window to close or respond through the challenge path.",
      "Release remains paused during the challenge window.",
    );
  }

  if (challengeEnd || relevantReviews.some((reviewCase) => reviewCase.action === "challenge")) {
    return status(
      "challenge_window_closed",
      "passed",
      "Challenge window closed",
      "No open challenge window is blocking this route.",
      "No challenge action is needed.",
      "Challenge status is not blocking release.",
    );
  }

  return status(
    "challenge_not_opened",
    "not_started",
    "No challenge window opened",
    "No active challenge window exists for this route.",
    "Wait for reviewer status if the route has not finalized.",
    "Challenge status is not currently affecting money.",
  );
}

function payoutMilestoneStatusForRow({
  routedAllocationCents,
  destinationProofStatus,
  challengeWindowStatus,
}: {
  routedAllocationCents: number;
  destinationProofStatus: MpgfContributionProofLedgerStatus;
  challengeWindowStatus: MpgfContributionProofLedgerStatus;
}) {
  if (routedAllocationCents <= 0) {
    return status(
      "milestones_not_started",
      "not_started",
      "Milestones not started",
      "No allocation is currently routed to a staged payout schedule.",
      "Clear threshold, proof, review, and challenge gates first.",
      "No payout release is scheduled.",
    );
  }

  if (destinationProofStatus.tone === "blocked") {
    return status(
      "milestones_blocked_by_proof",
      "blocked",
      "Milestones blocked by proof",
      "Destination proof is blocking the staged payout schedule.",
      "Submit corrected claim-typed proof or use the appeal path.",
      "No payout release can occur.",
    );
  }

  if (destinationProofStatus.tone !== "passed") {
    return status(
      "milestones_waiting_for_proof",
      "pending",
      "Milestones waiting for proof",
      "A milestone schedule exists, but destination proof has not cleared.",
      "Submit or wait for provider proof review.",
      "No payout release can occur.",
    );
  }

  if (challengeWindowStatus.tone === "paused") {
    return status(
      "milestones_paused_for_challenge",
      "paused",
      "Milestones paused for challenge",
      "A milestone schedule exists, but release waits for the challenge window.",
      "Wait for challenge resolution or window close.",
      "Payout release is paused.",
    );
  }

  return status(
    "milestones_ready_for_review",
    "pending",
    "Milestones ready for review",
    "Staged milestones can move only through reviewer and partner-release records.",
    "Wait for reviewer release authorization and partner execution.",
    "No automatic payout release has occurred.",
  );
}

function buildMilestones(
  campaignId: string,
  amountCents: number,
  milestoneStatus: MpgfContributionProofLedgerStatus,
) {
  return buildMpgfPublicGoodsMilestoneSchedule({ campaignId }).map((milestone) => ({
    id: milestone.id,
    label: `M${milestone.ordinal} ${milestone.releasePct}%`,
    releasePct: milestone.releasePct,
    amountCents: Math.floor((amountCents * milestone.releasePct) / 100),
    status: milestoneStatus.tone,
    evidenceRequirements: milestone.evidenceRequirements,
  }));
}

function emptyAccounting(): MpgfContributionProofLedgerAccounting {
  return {
    grossCapturedCents: 0,
    feeCents: 0,
    netRecipientDisbursedCents: 0,
    actualContributionCents: 0,
    countedContributionCents: 0,
    matchEligibleContributionCents: 0,
    sponsorBaseMatchCents: 0,
    sponsorBonusMatchCents: 0,
    successRewardCents: 0,
    failureBonusOrCarryForwardCreditCents: 0,
    coordinationCreditCount: 0,
    impactCertificateCount: 0,
    proofState: "no_payment_proof",
    proofDetail: "No participant-specific payment proof has been verified for this route.",
  };
}

function nonNegativeSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function centsLine(
  label: string,
  technicalField: string,
  cents: number,
  {
    includedInMatchEligibleDollars = false,
    includedInSentToProjects = false,
  }: {
    includedInMatchEligibleDollars?: boolean;
    includedInSentToProjects?: boolean;
  } = {},
): MpgfContributionSettlementSummaryLine {
  return {
    label,
    technicalField,
    cents: nonNegativeSafeInteger(cents),
    count: null,
    includedInSentToProjects,
    includedInMatchEligibleDollars,
  };
}

function countLine(
  label: string,
  technicalField: string,
  count: number,
): MpgfContributionSettlementSummaryLine {
  return {
    label,
    technicalField,
    cents: null,
    count: nonNegativeSafeInteger(count),
    includedInSentToProjects: false,
    includedInMatchEligibleDollars: false,
  };
}

export function buildMpgfContributionSettlementSummary({
  accounting,
  carryForwardCreditCents,
  failedAllocationsCents,
}: {
  accounting: MpgfContributionProofLedgerAccounting;
  carryForwardCreditCents: number;
  failedAllocationsCents: number;
}): MpgfContributionSettlementSummary {
  const technicalAccounting = {
    ...accounting,
    failedAllocationsCents: nonNegativeSafeInteger(failedAllocationsCents),
    carryForwardCreditCents: nonNegativeSafeInteger(carryForwardCreditCents),
  };
  const groups: MpgfContributionSettlementSummary["groups"] = {
    charged: {
      key: "charged",
      label: "Charged from you",
      lines: [centsLine("Gross captured", "grossCapturedCents", accounting.grossCapturedCents)],
    },
    sent_to_projects: {
      key: "sent_to_projects",
      label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.sentToProject,
      lines: [
        centsLine("Net recipient-disbursed", "netRecipientDisbursedCents", accounting.netRecipientDisbursedCents, {
          includedInSentToProjects: true,
        }),
      ],
    },
    counted_for_matching: {
      key: "counted_for_matching",
      label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.countsForMatching,
      lines: [
        centsLine("Counted contribution", "countedContributionCents", accounting.countedContributionCents),
        centsLine(
          "Match-eligible contribution",
          "matchEligibleContributionCents",
          accounting.matchEligibleContributionCents,
          { includedInMatchEligibleDollars: true },
        ),
      ],
    },
    sponsor_added: {
      key: "sponsor_added",
      label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.sponsorAdded,
      lines: [
        centsLine("Sponsor base match", "sponsorBaseMatchCents", accounting.sponsorBaseMatchCents),
        centsLine("Sponsor bonus match", "sponsorBonusMatchCents", accounting.sponsorBonusMatchCents),
      ],
    },
    rewards_credits_certificates: {
      key: "rewards_credits_certificates",
      label: MPGF_CRECM_PLAIN_LANGUAGE_LABELS.contributorBenefit,
      lines: [
        centsLine("Success rewards", "successRewardCents", accounting.successRewardCents),
        countLine("Coordination credits", "coordinationCreditCount", accounting.coordinationCreditCount),
        countLine("Impact certificates", "impactCertificateCount", accounting.impactCertificateCount),
      ],
    },
    failed_carry_forward: {
      key: "failed_carry_forward",
      label: "Failed or carried forward",
      lines: [
        centsLine("Failed allocations", "failedAllocationsCents", failedAllocationsCents),
        centsLine("Carry-forward credit", "carryForwardCreditCents", carryForwardCreditCents),
        centsLine(
          "Failure bonus or carry-forward credit",
          "failureBonusOrCarryForwardCreditCents",
          accounting.failureBonusOrCarryForwardCreditCents,
        ),
      ],
    },
  };

  return {
    groupOrder: MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER,
    groups,
    detailsDrawerRequired: true,
    finalReceiptRequired: true,
    summaryNumbersMustNotCombineChannels: true,
    sentToProjectsExcludesFeesRewardsCreditsCertificatesAndSponsorMatch: true,
    countedForMatchingUsesCountedAndMatchEligibleOnly: true,
    rewardsCreditsCertificatesExcludedFromPublicGoodDollars: true,
    technicalAccounting,
  };
}

function accountingForPledge({
  allocationLine,
  countedContributionCents,
  failureBonusOrCarryForwardCreditCents,
  paymentProof,
}: {
  allocationLine?: MpgfPublicGoodsRoundAllocation["lines"][number];
  countedContributionCents: number;
  failureBonusOrCarryForwardCreditCents: number;
  paymentProof?: MpgfPublicGoodsPaymentProof;
}): MpgfContributionProofLedgerAccounting {
  const verifiedPaymentCents = paymentProof?.status === "verified" ? paymentProof.amountVerifiedCents : 0;
  const proofState = paymentProof
    ? paymentProof.status === "verified"
      ? "verified_payment_proof"
      : paymentProof.status === "rejected"
        ? "rejected_payment_proof"
        : "pending_payment_proof"
    : "no_payment_proof";
  const proofDetail = paymentProof
    ? `${paymentProof.reconciliationSource.replaceAll("_", " ")} ${paymentProof.status.replaceAll("_", " ")}`
    : "No participant-specific payment proof has been verified for this route.";

  return {
    grossCapturedCents: verifiedPaymentCents,
    // FeeQuote records are a separate CRECM input. The legacy proof ledger does not infer fees.
    feeCents: 0,
    netRecipientDisbursedCents: verifiedPaymentCents,
    actualContributionCents: verifiedPaymentCents,
    countedContributionCents,
    matchEligibleContributionCents: countedContributionCents,
    sponsorBaseMatchCents: countedContributionCents > 0 ? allocationLine?.baseMatchCents ?? 0 : 0,
    sponsorBonusMatchCents: countedContributionCents > 0 ? allocationLine?.qfBonusCents ?? 0 : 0,
    successRewardCents: 0,
    failureBonusOrCarryForwardCreditCents,
    coordinationCreditCount: 0,
    impactCertificateCount: 0,
    proofState,
    proofDetail,
  };
}

function sumAccounting(
  rows: MpgfContributionProofLedgerRow[],
  carryForwardCreditCents: number,
): MpgfContributionProofLedgerAccounting {
  const initial = emptyAccounting();
  const totals = rows.reduce(
    (sum, row) => ({
      grossCapturedCents: sum.grossCapturedCents + row.accounting.grossCapturedCents,
      feeCents: sum.feeCents + row.accounting.feeCents,
      netRecipientDisbursedCents:
        sum.netRecipientDisbursedCents + row.accounting.netRecipientDisbursedCents,
      actualContributionCents: sum.actualContributionCents + row.accounting.actualContributionCents,
      countedContributionCents: sum.countedContributionCents + row.accounting.countedContributionCents,
      matchEligibleContributionCents:
        sum.matchEligibleContributionCents + row.accounting.matchEligibleContributionCents,
      sponsorBaseMatchCents: sum.sponsorBaseMatchCents + row.accounting.sponsorBaseMatchCents,
      sponsorBonusMatchCents: sum.sponsorBonusMatchCents + row.accounting.sponsorBonusMatchCents,
      successRewardCents: sum.successRewardCents + row.accounting.successRewardCents,
      failureBonusOrCarryForwardCreditCents:
        sum.failureBonusOrCarryForwardCreditCents +
        row.accounting.failureBonusOrCarryForwardCreditCents,
      coordinationCreditCount: sum.coordinationCreditCount + row.accounting.coordinationCreditCount,
      impactCertificateCount: sum.impactCertificateCount + row.accounting.impactCertificateCount,
      proofState: sum.proofState,
      proofDetail: sum.proofDetail,
    }),
    initial,
  );

  return {
    ...totals,
    failureBonusOrCarryForwardCreditCents:
      totals.failureBonusOrCarryForwardCreditCents + carryForwardCreditCents,
    proofState: rows.some((row) => row.accounting.proofState === "verified_payment_proof")
      ? "verified_payment_proof"
      : rows.some((row) => row.accounting.proofState === "pending_payment_proof")
        ? "pending_payment_proof"
        : rows.some((row) => row.accounting.proofState === "rejected_payment_proof")
          ? "rejected_payment_proof"
          : "no_payment_proof",
    proofDetail:
      "Separated gross, fee, net-recipient, actual, counted, match-eligible, sponsor, reward, credit, and certificate channels.",
  };
}

function summarizeStatusGroup(
  emptyStatus: MpgfContributionProofLedgerStatus,
  statuses: MpgfContributionProofLedgerStatus[],
  label: string,
) {
  if (!statuses.length) {
    return emptyStatus;
  }

  const blocked = statuses.filter((candidate) => candidate.tone === "blocked").length;
  const paused = statuses.filter((candidate) => candidate.tone === "paused").length;
  const pending = statuses.filter((candidate) => candidate.tone === "pending" || candidate.tone === "not_started").length;

  if (blocked > 0) {
    return status(
      `${label.toLowerCase().replaceAll(" ", "_")}_blocked`,
      "blocked",
      `${label} blocked`,
      `${blocked} route${blocked === 1 ? "" : "s"} fail closed.`,
      "Open the blocked route row and use the listed correction path.",
      "Blocked rows are not released.",
    );
  }

  if (paused > 0) {
    return status(
      `${label.toLowerCase().replaceAll(" ", "_")}_paused`,
      "paused",
      `${label} paused`,
      `${paused} route${paused === 1 ? "" : "s"} are paused by a review or challenge window.`,
      "Wait for the pause to resolve or use the listed challenge path.",
      "Paused rows are not released.",
    );
  }

  if (pending > 0) {
    return status(
      `${label.toLowerCase().replaceAll(" ", "_")}_pending`,
      "pending",
      `${label} pending`,
      `${pending} route${pending === 1 ? "" : "s"} still need a non-blocking gate result.`,
      "Follow the route-level next action.",
      "Pending rows remain conditional.",
    );
  }

  return status(
    `${label.toLowerCase().replaceAll(" ", "_")}_passed`,
    "passed",
    `${label} non-blocking`,
    "All saved route rows have non-blocking status for this gate.",
    "No account-level action is needed.",
    "This gate is not blocking release.",
  );
}

export function buildMpgfContributionProofLedger({
  participantState,
  realMoneyAccountState,
  campaigns = demoMpgfPublicGoodsCampaigns,
  allocation,
  paymentProofs = demoMpgfPublicGoodsPaymentProofs,
  reviewCases = demoMpgfPublicGoodsReviewCases,
  now = new Date(),
}: {
  participantState?: MpgfParticipantState;
  realMoneyAccountState?: MpgfRealMoneyAccountState;
  campaigns?: MpgfPublicGoodsCampaign[];
  allocation?: MpgfPublicGoodsRoundAllocation;
  paymentProofs?: MpgfPublicGoodsPaymentProof[];
  reviewCases?: MpgfPublicGoodsReviewCase[];
  now?: Date;
} = {}): MpgfContributionProofLedger {
  const participantPledges = participantState?.publicGoodsPledges ?? [];
  const roundPledges = mergeRoundPledges(participantPledges, demoMpgfAssurancePledges);
  const roundAllocation = allocation ?? allocateMpgfAssuranceRound({ campaigns, pledges: roundPledges, now });
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const allocationLineByCampaignId = new Map(roundAllocation.lines.map((line) => [line.campaignId, line]));

  const rows: MpgfContributionProofLedgerRow[] = participantPledges.map((pledge) => {
    const campaign = campaignById.get(pledge.campaignId);
    const allocationLine = allocationLineByCampaignId.get(pledge.campaignId);
    const pledgeActive = isActivePledge(pledge);
    const pledgeFailed = isFailedPledge(pledge) || allocationLine?.status === "blocked" || allocationLine?.status === "expired";
    const thresholdStatus = thresholdStatusForPledge({ campaign, pledge, roundPledges, now });
    const identityStatus = identityStatusForPledge(participantState, pledge);
    const destinationProofStatus = destinationProofStatusForPledge({
      pledge,
      thresholdStatus,
      paymentProofs,
    });
    const challengeWindowStatus = challengeWindowStatusForCampaign({ campaign, reviewCases, now });
    const currentlyRoutedAllocationsCents =
      pledgeActive &&
      !pledgeFailed &&
      pledge.eligibilityState === "eligible" &&
      allocationLine?.status === "payable"
        ? pledge.amountCents
        : 0;
    const pendingThresholdAllocationsCents =
      pledgeActive &&
      !pledgeFailed &&
      pledge.eligibilityState === "eligible" &&
      thresholdStatus.code === "threshold_pending"
        ? pledge.amountCents
        : 0;
    const failedAllocationsCents = pledgeFailed ? pledge.amountCents : 0;
    const failureBonusOrCarryForwardCreditCents =
      failedAllocationsCents > 0 && pledge.eligibilityState !== "duplicate_identity" ? failedAllocationsCents : 0;
    const payoutMilestoneStatus = payoutMilestoneStatusForRow({
      routedAllocationCents: currentlyRoutedAllocationsCents,
      destinationProofStatus,
      challengeWindowStatus,
    });
    const countedContributionCents =
      currentlyRoutedAllocationsCents > 0 &&
      identityStatus.tone === "passed" &&
      thresholdStatus.tone === "passed" &&
      destinationProofStatus.tone === "passed" &&
      challengeWindowStatus.tone === "passed"
        ? currentlyRoutedAllocationsCents
        : 0;
    const accounting = accountingForPledge({
      allocationLine,
      countedContributionCents,
      failureBonusOrCarryForwardCreditCents,
      paymentProof: paymentProofForPledge(pledge, paymentProofs),
    });
    const settlementSummary = buildMpgfContributionSettlementSummary({
      accounting,
      carryForwardCreditCents: failureBonusOrCarryForwardCreditCents,
      failedAllocationsCents,
    });

    return {
      pledgeId: pledge.id,
      campaignId: pledge.campaignId,
      campaignTitle: campaign?.title ?? pledge.campaignId.replaceAll("-", " "),
      maximumBudgetCents: pledgeActive ? pledge.amountCents : 0,
      currentlyRoutedAllocationsCents,
      pendingThresholdAllocationsCents,
      failedAllocationsCents,
      failureBonusOrCarryForwardCreditCents,
      identityStatus,
      thresholdStatus,
      destinationProofStatus,
      challengeWindowStatus,
      payoutMilestoneStatus,
      payoutMilestones: buildMilestones(pledge.campaignId, currentlyRoutedAllocationsCents, payoutMilestoneStatus),
      accounting,
      settlementSummary,
    };
  });

  const maximumBudgetCents =
    rows.reduce((sum, row) => sum + row.maximumBudgetCents, 0) +
    activeSubscriptionBudgetCents(participantState) +
    activeRealMoneyBudgetCents(realMoneyAccountState);
  const currentlyRoutedAllocationsCents = rows.reduce(
    (sum, row) => sum + row.currentlyRoutedAllocationsCents,
    0,
  );
  const pendingThresholdAllocationsCents = rows.reduce(
    (sum, row) => sum + row.pendingThresholdAllocationsCents,
    0,
  );
  const failedAllocationsCents = rows.reduce((sum, row) => sum + row.failedAllocationsCents, 0);
  const carryForwardCreditCents =
    rows.reduce((sum, row) => sum + row.failureBonusOrCarryForwardCreditCents, 0) +
    lateCarryForwardCreditCents(realMoneyAccountState);
  const accounting = sumAccounting(rows, lateCarryForwardCreditCents(realMoneyAccountState));
  const settlementSummary = buildMpgfContributionSettlementSummary({
    accounting,
    carryForwardCreditCents,
    failedAllocationsCents,
  });
  const noRouteStatus = status(
    "no_saved_route",
    participantState?.status === "sign_in_required" ? "not_started" : "pending",
    participantState?.status === "sign_in_required" ? "Sign in required" : "No saved route yet",
    participantState?.status === "sign_in_required"
      ? "Sign in to load participant-specific contribution state."
      : "No public-goods route rows are attached to this account yet.",
    participantState?.status === "sign_in_required" ? "Sign in to load records." : "Create a conditional campaign pledge.",
    "No participant-specific allocation is affected.",
    participantState?.status === "sign_in_required"
      ? "Sign in first, then request correction if records are missing."
      : defaultCorrectionPath,
  );

  return {
    schemaVersion: MPGF_CONTRIBUTION_PROOF_LEDGER_SCHEMA_VERSION,
    participantLabel: participantState?.displayName ?? (participantState?.userId ? "Signed-in participant" : "Visitor"),
    maximumBudgetCents,
    currentlyRoutedAllocationsCents,
    pendingThresholdAllocationsCents,
    failedAllocationsCents,
    failureBonusOrCarryForwardCreditCents: carryForwardCreditCents,
    carryForwardCreditCents,
    identityStatus: summarizeStatusGroup(noRouteStatus, rows.map((row) => row.identityStatus), "Identity status"),
    thresholdStatus: summarizeStatusGroup(noRouteStatus, rows.map((row) => row.thresholdStatus), "Threshold status"),
    destinationProofStatus: summarizeStatusGroup(
      noRouteStatus,
      rows.map((row) => row.destinationProofStatus),
      "Destination-proof status",
    ),
    challengeWindowStatus: summarizeStatusGroup(
      noRouteStatus,
      rows.map((row) => row.challengeWindowStatus),
      "Challenge-window status",
    ),
    payoutMilestones: rows.flatMap((row) => row.payoutMilestones),
    accounting,
    settlementSummary,
    rows,
    warnings: [...(participantState?.warnings ?? []), ...(realMoneyAccountState?.warnings ?? [])],
  };
}
