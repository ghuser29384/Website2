export const PLEDGE_FUNDING_CONTRACT_VERSION =
  "moral-trade-pledge-funding-preview-v0.1-2026-07";

export type PledgeFundingMode = "micro_assurance" | "capped_pivotal_cohort";
export type PledgeFundingState =
  | "draft"
  | "preview"
  | "open"
  | "cleared"
  | "failed"
  | "refunding"
  | "refunded"
  | "cancelled"
  | "unavailable";
export type PledgeFundingChargePolicy =
  | "authorize_then_capture"
  | "charge_then_refund"
  | "wallet_hold"
  | "preview_only";
export type PledgeFundingOverflowPolicy = "close_at_target" | "open_next_tranche" | "reject";

export interface PledgeFundingBacking {
  paymentAuthorization: boolean;
  refundOrRelease: boolean;
  ledgerRows: boolean;
  contributionRows: boolean;
  transactionalFinalSlot: boolean;
  publicProgressCounts: boolean;
  sponsorBonusPool: boolean;
  charityPayout: boolean;
}

export interface PledgeFundingRound {
  id: string;
  pledgeId: string;
  mode: PledgeFundingMode;
  state: PledgeFundingState;
  title: string;
  pledgeSummary: string;
  baselineStatement: string;
  evidenceReviewStatus: string;
  targetAmountCents: number;
  currency: "usd";
  minContributionCents: number;
  defaultContributionCents: number;
  raisedAmountCents: number;
  slotAmountCents: number | null;
  maxSlots: number | null;
  filledSlots: number | null;
  deadlineAt: string | null;
  overflowPolicy: PledgeFundingOverflowPolicy;
  refundPolicy: string;
  chargePolicy: PledgeFundingChargePolicy;
  sponsorBonusPoolId: string | null;
  preferredCharityBonusCents: number | null;
  preferredCharityBonusPolicy: "none" | "on_clear" | "on_fail" | "on_contribution";
  backing: PledgeFundingBacking;
}

export interface PledgeFundingReceiptAtom {
  state: "Live" | "Preview" | "Unavailable";
  exposure: string;
  conditionOrProtection: string;
  protection: string;
  primaryCta: string;
  resultCopy: string;
}

export interface PledgeFundingMechanismState {
  modeLabel: string;
  statusLabel: string;
  progressLabel: string;
  contributionLabel: string;
  remainingLabel: string;
  canAcceptContribution: boolean;
  isFinalSlot: boolean;
  isFull: boolean;
  safeStateReason: string | null;
}

export interface PledgeFundingContributionResult {
  ok: boolean;
  reason: string | null;
  nextRound: PledgeFundingRound;
  resultCopy: string;
}

export const PLEDGE_FUNDING_BACKEND_REQUIREMENTS = [
  "pledge_funding_rounds table with mode, target, slot, deadline, overflow, charge, sponsor, and state fields",
  "pledge_funding_contributions table with contributor ownership, amount, slot index, payment authorization, refund, and ledger refs",
  "RLS: public can read public round state; users can read only their own contribution rows",
  "RLS: users cannot alter other users' contribution rows; admin/reviewer/service role owns settlement",
  "transactional target and final-slot reservation to prevent overfunding and overfill races",
  "idempotency keys for contribution attempts, capture, release, and refund transitions",
  "append-only ledger/payment-event rows before any capture, release, refund, or payout mutation",
  "approved charity-recipient registry plus payout-connected sponsor pool before preferred-charity bonus copy can be live",
] as const;

const PREVIEW_BACKING: PledgeFundingBacking = {
  charityPayout: false,
  contributionRows: false,
  ledgerRows: false,
  paymentAuthorization: false,
  publicProgressCounts: false,
  refundOrRelease: false,
  sponsorBonusPool: false,
  transactionalFinalSlot: false,
};

export const PLEDGE_FUNDING_PREVIEW_ROUNDS: PledgeFundingRound[] = [
  {
    backing: PREVIEW_BACKING,
    baselineStatement: "Pledge states this would be a change from baseline.",
    chargePolicy: "preview_only",
    currency: "usd",
    deadlineAt: null,
    defaultContributionCents: 10,
    evidenceReviewStatus: "Review required. Evidence/review status: Not connected.",
    filledSlots: null,
    id: "vegetarian-week-micro-assurance-preview",
    maxSlots: null,
    minContributionCents: 10,
    mode: "micro_assurance",
    overflowPolicy: "close_at_target",
    pledgeId: "pledge-vegetarian-week-preview",
    pledgeSummary:
      "Preview a small conditional contribution toward a vegetarian pledge without creating a payment or commitment.",
    preferredCharityBonusCents: null,
    preferredCharityBonusPolicy: "none",
    raisedAmountCents: 0,
    refundPolicy: "Preview only. Live refunds require connected payment and ledger infrastructure.",
    slotAmountCents: null,
    sponsorBonusPoolId: null,
    state: "preview",
    targetAmountCents: 2_000,
    title: "Fund a vegetarian pledge with small contributions",
  },
  {
    backing: PREVIEW_BACKING,
    baselineStatement: "Pledge states this would be a change from baseline.",
    chargePolicy: "preview_only",
    currency: "usd",
    deadlineAt: null,
    defaultContributionCents: 500,
    evidenceReviewStatus: "Review required. Evidence/review status: Not connected.",
    filledSlots: null,
    id: "vegetarian-week-capped-cohort-preview",
    maxSlots: 4,
    minContributionCents: 500,
    mode: "capped_pivotal_cohort",
    overflowPolicy: "close_at_target",
    pledgeId: "pledge-vegetarian-week-preview",
    pledgeSummary:
      "Preview a capped 4-slot cohort for funding a vegetarian pledge without reserving a real slot.",
    preferredCharityBonusCents: null,
    preferredCharityBonusPolicy: "none",
    raisedAmountCents: 0,
    refundPolicy: "Preview only. Live release/refund requires connected payment and ledger infrastructure.",
    slotAmountCents: 500,
    sponsorBonusPoolId: null,
    state: "preview",
    targetAmountCents: 2_000,
    title: "Fund a vegetarian pledge with a capped 3缺1-style cohort",
  },
];

function formatCents(cents: number, currency: "usd" = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function isLiveBacked(round: PledgeFundingRound) {
  return (
    round.chargePolicy !== "preview_only" &&
    round.backing.paymentAuthorization &&
    round.backing.refundOrRelease &&
    round.backing.ledgerRows &&
    round.backing.contributionRows
  );
}

function isExpired(round: PledgeFundingRound, now = new Date()) {
  return Boolean(round.deadlineAt && Date.parse(round.deadlineAt) <= now.getTime());
}

function isRoundCleared(round: PledgeFundingRound) {
  if (round.mode === "capped_pivotal_cohort") {
    return (
      typeof round.maxSlots === "number" &&
      typeof round.filledSlots === "number" &&
      round.filledSlots >= round.maxSlots
    );
  }

  return round.raisedAmountCents >= round.targetAmountCents;
}

function chargeCondition(round: PledgeFundingRound) {
  if (round.chargePolicy === "authorize_then_capture") {
    return round.mode === "capped_pivotal_cohort"
      ? "No charge unless this cohort clears"
      : "No charge unless this round clears";
  }

  if (round.chargePolicy === "wallet_hold") {
    return round.mode === "capped_pivotal_cohort"
      ? "Released if this cohort does not fill"
      : "Released if this round does not clear";
  }

  if (round.chargePolicy === "charge_then_refund") {
    return round.mode === "capped_pivotal_cohort"
      ? "Refunded if this cohort does not fill"
      : "Refunded if this round does not clear";
  }

  return "Preview only";
}

export function getPledgeFundingRoundById(roundId: string) {
  return PLEDGE_FUNDING_PREVIEW_ROUNDS.find((round) => round.id === roundId) ?? null;
}

export function getPledgeFundingRounds() {
  return PLEDGE_FUNDING_PREVIEW_ROUNDS;
}

export function getPledgeFundingMechanismState(
  round: PledgeFundingRound,
  now = new Date(),
): PledgeFundingMechanismState {
  const backed = isLiveBacked(round);
  const expired = isExpired(round, now);
  const filledSlots = round.filledSlots ?? 0;
  const maxSlots = round.maxSlots ?? 0;
  const remainingSlots = Math.max(0, maxSlots - filledSlots);
  const isFull = round.mode === "capped_pivotal_cohort" && maxSlots > 0 && remainingSlots === 0;
  const isFinalSlot =
    round.mode === "capped_pivotal_cohort" &&
    round.backing.transactionalFinalSlot &&
    remainingSlots === 1;
  const targetRemainingCents = Math.max(0, round.targetAmountCents - round.raisedAmountCents);
  const targetReached = round.raisedAmountCents >= round.targetAmountCents;
  const liveProgressVisible = backed && round.backing.publicProgressCounts;

  if (round.state === "preview" || round.chargePolicy === "preview_only") {
    return {
      canAcceptContribution: false,
      contributionLabel:
        round.mode === "capped_pivotal_cohort" && round.slotAmountCents
          ? `Slot ${formatCents(round.slotAmountCents, round.currency)}`
          : `Max ${formatCents(round.defaultContributionCents, round.currency)}`,
      isFinalSlot: false,
      isFull: false,
      modeLabel:
        round.mode === "micro_assurance" ? "Open micro-assurance funding" : "Capped pivotal cohort",
      progressLabel:
        round.mode === "capped_pivotal_cohort"
          ? "Slot counts not connected yet"
          : "Raised amount not connected yet",
      remainingLabel:
        round.mode === "capped_pivotal_cohort"
          ? `${round.maxSlots ?? 4} slots configured for preview`
          : `Target ${formatCents(round.targetAmountCents, round.currency)} preview`,
      safeStateReason: "Payment authorization, refund/release, ledger, and contribution rows are not connected yet.",
      statusLabel: "Preview",
    };
  }

  if (!backed) {
    return {
      canAcceptContribution: false,
      contributionLabel:
        round.mode === "capped_pivotal_cohort" && round.slotAmountCents
          ? `Slot ${formatCents(round.slotAmountCents, round.currency)}`
          : `Max ${formatCents(round.defaultContributionCents, round.currency)}`,
      isFinalSlot: false,
      isFull,
      modeLabel:
        round.mode === "micro_assurance" ? "Open micro-assurance funding" : "Capped pivotal cohort",
      progressLabel: "Round status not connected",
      remainingLabel: "Not connected",
      safeStateReason: "Live pledge-funding settlement is unavailable for this round.",
      statusLabel: "Unavailable",
    };
  }

  return {
    canAcceptContribution: !expired && !targetReached && !isFull && round.state === "open",
    contributionLabel:
      round.mode === "capped_pivotal_cohort" && round.slotAmountCents
        ? `Slot ${formatCents(round.slotAmountCents, round.currency)}`
        : `Max ${formatCents(round.defaultContributionCents, round.currency)}`,
    isFinalSlot,
    isFull,
    modeLabel:
      round.mode === "micro_assurance" ? "Open micro-assurance funding" : "Capped pivotal cohort",
    progressLabel:
      round.mode === "capped_pivotal_cohort"
        ? liveProgressVisible
          ? `${filledSlots} of ${maxSlots} slots filled`
          : "Slot counts hidden until privacy-safe"
        : liveProgressVisible
          ? `${formatCents(round.raisedAmountCents, round.currency)} of ${formatCents(
              round.targetAmountCents,
              round.currency,
            )}`
          : "Raised amount hidden until privacy-safe",
    remainingLabel:
      round.mode === "capped_pivotal_cohort"
        ? remainingSlots === 1
          ? "1 slot left"
          : `${remainingSlots} slots left`
        : `${formatCents(targetRemainingCents, round.currency)} left`,
    safeStateReason: expired
      ? "Deadline expired before this funding round cleared."
      : isFull
        ? "This round is full."
        : targetReached
          ? "This round is already at its target."
          : null,
    statusLabel: round.state === "open" ? "Live" : round.state.replaceAll("_", " "),
  };
}

export function getPledgeFundingReceiptAtom(round: PledgeFundingRound): PledgeFundingReceiptAtom {
  const mechanism = getPledgeFundingMechanismState(round);

  if (!isLiveBacked(round)) {
    return {
      conditionOrProtection: "No durable state changed",
      exposure: mechanism.contributionLabel,
      primaryCta: "Preview funding",
      protection: "Payment not connected",
      resultCopy: "No durable state changed.",
      state: round.state === "unavailable" ? "Unavailable" : "Preview",
    };
  }

  const conditionOrProtection = chargeCondition(round);
  const state = mechanism.canAcceptContribution ? "Live" : "Unavailable";
  const primaryCta = !mechanism.canAcceptContribution
    ? mechanism.isFull
      ? "Round full"
      : "Review current terms"
    : round.mode === "capped_pivotal_cohort"
      ? mechanism.isFinalSlot
        ? "Clear this pledge"
        : "Review funding"
      : "Review funding";

  return {
    conditionOrProtection,
    exposure: mechanism.contributionLabel,
    primaryCta,
    protection: conditionOrProtection,
    resultCopy:
      round.chargePolicy === "authorize_then_capture"
        ? "Contribution authorized. No charge unless this round clears."
        : "Funding contribution recorded. Refunded if not cleared.",
    state,
  };
}

export function shouldShowPreferredCharityBonus(round: PledgeFundingRound) {
  return Boolean(
    round.sponsorBonusPoolId &&
      round.preferredCharityBonusCents &&
      round.preferredCharityBonusCents > 0 &&
      round.preferredCharityBonusPolicy !== "none" &&
      round.backing.sponsorBonusPool &&
      round.backing.charityPayout,
  );
}

export function getPreferredCharityBonusCopy(round: PledgeFundingRound) {
  if (shouldShowPreferredCharityBonus(round)) {
    return `Sponsor bonus to your chosen charity: ${formatCents(
      round.preferredCharityBonusCents ?? 0,
      round.currency,
    )}`;
  }

  return "Preferred-charity bonus not connected yet";
}

export function applyPledgeFundingContribution(
  round: PledgeFundingRound,
  amountCents: number,
  now = new Date(),
): PledgeFundingContributionResult {
  const mechanism = getPledgeFundingMechanismState(round, now);

  if (!mechanism.canAcceptContribution) {
    return {
      nextRound: round,
      ok: false,
      reason: mechanism.safeStateReason ?? "This funding round is not accepting contributions.",
      resultCopy: "No durable state changed.",
    };
  }

  if (round.mode === "capped_pivotal_cohort") {
    const filledSlots = round.filledSlots ?? 0;
    const maxSlots = round.maxSlots ?? 0;

    if (!round.backing.transactionalFinalSlot) {
      return {
        nextRound: round,
        ok: false,
        reason: "Final-slot reservation is not transactional.",
        resultCopy: "No durable state changed.",
      };
    }

    if (filledSlots >= maxSlots) {
      return {
        nextRound: round,
        ok: false,
        reason: "This round is full.",
        resultCopy: "No durable state changed.",
      };
    }

    const nextFilledSlots = filledSlots + 1;
    const nextRound = {
      ...round,
      filledSlots: nextFilledSlots,
      raisedAmountCents: round.raisedAmountCents + (round.slotAmountCents ?? amountCents),
      state: nextFilledSlots >= maxSlots ? "cleared" as const : round.state,
    };

    return {
      nextRound,
      ok: true,
      reason: null,
      resultCopy:
        nextRound.state === "cleared"
          ? "Cohort cleared. Pledge funding created."
          : round.chargePolicy === "authorize_then_capture"
            ? "Contribution authorized. No charge unless this cohort clears."
            : "Slot reserved. Refunded if this cohort does not fill.",
    };
  }

  if (amountCents < round.minContributionCents) {
    return {
      nextRound: round,
      ok: false,
      reason: "Contribution is below the configured minimum.",
      resultCopy: "No durable state changed.",
    };
  }

  if (
    round.overflowPolicy !== "open_next_tranche" &&
    round.raisedAmountCents + amountCents > round.targetAmountCents
  ) {
    return {
      nextRound: round,
      ok: false,
      reason: "Contribution would overfund this round.",
      resultCopy: "No durable state changed.",
    };
  }

  const nextRaisedAmountCents = round.raisedAmountCents + amountCents;
  const nextRound = {
    ...round,
    raisedAmountCents: nextRaisedAmountCents,
    state: nextRaisedAmountCents >= round.targetAmountCents ? "cleared" as const : round.state,
  };

  return {
    nextRound,
    ok: true,
    reason: null,
    resultCopy:
      nextRound.state === "cleared"
        ? "Round cleared. Pledge funding created."
        : round.chargePolicy === "authorize_then_capture"
          ? "Contribution authorized. No charge unless this round clears."
          : "Funding contribution recorded. Refunded if not cleared.",
  };
}

export function settleExpiredPledgeFundingRound(
  round: PledgeFundingRound,
  now = new Date(),
): PledgeFundingContributionResult {
  if (!isExpired(round, now) || isRoundCleared(round)) {
    return {
      nextRound: round,
      ok: false,
      reason: "Round is not expired and uncleared.",
      resultCopy: "No durable state changed.",
    };
  }

  const nextRound = {
    ...round,
    state:
      round.chargePolicy === "authorize_then_capture" || round.chargePolicy === "wallet_hold"
        ? "failed" as const
        : "refunding" as const,
  };

  return {
    nextRound,
    ok: true,
    reason: null,
    resultCopy:
      round.chargePolicy === "authorize_then_capture" || round.chargePolicy === "wallet_hold"
        ? round.mode === "capped_pivotal_cohort"
          ? "Authorization released. Cohort did not clear."
          : "Authorization released. Round did not clear."
        : round.mode === "capped_pivotal_cohort"
          ? "Contribution refunded. Cohort did not clear."
          : "Contribution refunded. Round did not clear.",
  };
}
