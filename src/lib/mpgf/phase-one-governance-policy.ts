export const MPGF_PHASE_ONE_BALLOT_POLICY = "equal_credit_approval_split_v1" as const;
export const MPGF_PHASE_ONE_RESULT_EFFECT =
  "advisory_external_checkout_confirmation_required" as const;
export const MPGF_PHASE_ONE_QUORUM_BPS = 5_000 as const;

export interface MpgfPhaseOnePolicyBallot {
  voterId: string;
  selectedProjectIds: readonly string[];
}

export interface MpgfPhaseOnePolicyResult {
  eligiblePledgerCount: number;
  submittedBallotCount: number;
  quorumRequiredCount: number;
  quorumMet: boolean;
  projectShares: Array<{
    projectId: string;
    creditNumerator: string;
    creditDenominator: string;
    advisoryShareBps: number;
  }>;
}

interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TEN_THOUSAND = BigInt(10_000);

function greatestCommonDivisor(left: bigint, right: bigint) {
  let a = left < BIGINT_ZERO ? -left : left;
  let b = right < BIGINT_ZERO ? -right : right;

  while (b !== BIGINT_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function reduceFraction(value: Fraction): Fraction {
  if (value.numerator === BIGINT_ZERO) {
    return { numerator: BIGINT_ZERO, denominator: BIGINT_ONE };
  }

  const divisor = greatestCommonDivisor(value.numerator, value.denominator);

  return {
    numerator: value.numerator / divisor,
    denominator: value.denominator / divisor,
  };
}

function addFractions(left: Fraction, right: Fraction): Fraction {
  return reduceFraction({
    numerator:
      left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}

function assertWholeNonNegative(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

export function getMpgfPhaseOneQuorumRequiredCount(eligiblePledgerCount: number) {
  assertWholeNonNegative(eligiblePledgerCount, "Eligible pledger count");
  return Math.ceil(eligiblePledgerCount / 2);
}

export function getMpgfPhaseOneCreditPerSelectionLabel(selectionCount: number) {
  if (!Number.isSafeInteger(selectionCount) || selectionCount <= 0) {
    return "Select at least one project";
  }

  const percent = 100 / selectionCount;

  return `${percent.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}% of one voting credit per selected project`;
}

export function computeMpgfPhaseOneAdvisoryResults({
  ballots,
  eligiblePledgerCount,
  projectIds,
}: {
  ballots: readonly MpgfPhaseOnePolicyBallot[];
  eligiblePledgerCount: number;
  projectIds: readonly string[];
}): MpgfPhaseOnePolicyResult {
  assertWholeNonNegative(eligiblePledgerCount, "Eligible pledger count");

  const normalizedProjects = [...projectIds].map((projectId) => projectId.trim());
  const projectSet = new Set(normalizedProjects);

  if (
    normalizedProjects.length === 0 ||
    normalizedProjects.some((projectId) => !projectId) ||
    projectSet.size !== normalizedProjects.length
  ) {
    throw new Error("MPGF advisory results require a unique non-empty project set.");
  }

  const seenVoters = new Set<string>();
  const scores = new Map<string, Fraction>(
    normalizedProjects.map((projectId) => [
      projectId,
      { numerator: BIGINT_ZERO, denominator: BIGINT_ONE },
    ]),
  );

  for (const ballot of ballots) {
    const voterId = ballot.voterId.trim();
    const selections = ballot.selectedProjectIds.map((projectId) => projectId.trim());
    const uniqueSelections = new Set(selections);

    if (!voterId || seenVoters.has(voterId)) {
      throw new Error("Each confirmed pledger may contribute at most one ballot.");
    }

    if (
      selections.length === 0 ||
      selections.length > 50 ||
      uniqueSelections.size !== selections.length ||
      selections.some((projectId) => !projectSet.has(projectId))
    ) {
      throw new Error(
        "Each ballot must contain between 1 and 50 unique projects from the frozen candidate set.",
      );
    }

    seenVoters.add(voterId);
    const splitCredit = reduceFraction({
      numerator: BIGINT_ONE,
      denominator: BigInt(selections.length),
    });

    for (const projectId of selections) {
      scores.set(projectId, addFractions(scores.get(projectId)!, splitCredit));
    }
  }

  if (ballots.length > eligiblePledgerCount) {
    throw new Error("Submitted ballots cannot exceed the frozen eligible electorate.");
  }

  const quorumRequiredCount =
    getMpgfPhaseOneQuorumRequiredCount(eligiblePledgerCount);
  const quorumMet =
    eligiblePledgerCount > 0 && ballots.length >= quorumRequiredCount;

  if (!quorumMet) {
    return {
      eligiblePledgerCount,
      submittedBallotCount: ballots.length,
      quorumRequiredCount,
      quorumMet: false,
      projectShares: [],
    };
  }

  const ballotCount = BigInt(ballots.length);
  const shares = normalizedProjects.map((projectId) => {
    const score = scores.get(projectId)!;
    const shareNumerator = score.numerator * BIGINT_TEN_THOUSAND;
    const shareDenominator = score.denominator * ballotCount;

    return {
      projectId,
      score,
      floorBps: shareNumerator / shareDenominator,
      remainderNumerator: shareNumerator % shareDenominator,
      remainderDenominator: shareDenominator,
    };
  });
  const distributedBps = shares.reduce(
    (total, share) => total + share.floorBps,
    BIGINT_ZERO,
  );
  const remainderSlots = Number(BIGINT_TEN_THOUSAND - distributedBps);
  const remainderOrder = [...shares].sort((left, right) => {
    const leftScaled =
      left.remainderNumerator * right.remainderDenominator;
    const rightScaled =
      right.remainderNumerator * left.remainderDenominator;

    if (leftScaled !== rightScaled) {
      return leftScaled > rightScaled ? -1 : 1;
    }

    return left.projectId.localeCompare(right.projectId);
  });
  const remainderWinners = new Set(
    remainderOrder.slice(0, remainderSlots).map((share) => share.projectId),
  );

  return {
    eligiblePledgerCount,
    submittedBallotCount: ballots.length,
    quorumRequiredCount,
    quorumMet: true,
    projectShares: shares
      .map((share) => ({
        projectId: share.projectId,
        creditNumerator: share.score.numerator.toString(),
        creditDenominator: share.score.denominator.toString(),
        advisoryShareBps:
          Number(share.floorBps) +
          (remainderWinners.has(share.projectId) ? 1 : 0),
      }))
      .sort(
        (left, right) =>
          right.advisoryShareBps - left.advisoryShareBps ||
          left.projectId.localeCompare(right.projectId),
      ),
  };
}
