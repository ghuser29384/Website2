import {
  demoAlternatives,
  demoBallots,
  demoCycle,
  demoPledges,
  MPGF_COPY,
} from "./data";
import type {
  MpgfAllocationLine,
  MpgfAllocationResult,
  MpgfBallot,
  MpgfBallotWeight,
  MpgfCandidateAlternative,
  MpgfLedgerTransaction,
  MpgfPledge,
  MpgfPublicSummary,
} from "./types";

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

export function isLedgerBalanced(transaction: MpgfLedgerTransaction) {
  const debitCents = transaction.entries
    .filter((entry) => entry.direction === "debit")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const creditCents = transaction.entries
    .filter((entry) => entry.direction === "credit")
    .reduce((sum, entry) => sum + entry.amountCents, 0);

  return debitCents === creditCents && transaction.entries.every((entry) => entry.amountCents > 0);
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
      taxStatus: "No tax receipt or charitable deduction claim is made for non-real-money pledges.",
      escrowStatus: "No escrow is created in direct-working demo mode.",
      refundStatus: "No refund right is triggered because no money is collected.",
      privacyStatus: "Public summaries use demo labels and do not publish real-user financial totals.",
      ballotFinalityStatus: "Demo ballots are local test inputs unless later submitted through approved production gates.",
      allocationDisbursementStatus: MPGF_COPY.allocationDisbursement,
    },
  };
}

export function assertMpgfRealMoneyDisabled() {
  if (process.env.MPGF_REAL_MONEY_ENABLED === "true") {
    throw new Error("MPGF real-money mode is blocked until real_money_complete passes.");
  }
}
