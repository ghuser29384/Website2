export const COMMON_GROUND_POOL_ROUTE = "/mpgf/common-ground-pool" as const;
export const COMMON_GROUND_POOL_POLICY =
  "common_ground_pool_balanced_surplus_no_capture_v1" as const;
export const COMMON_GROUND_POOL_MIN_PARTICIPANTS = 2;
export const COMMON_GROUND_POOL_MAX_PARTICIPANTS = 8;
export const COMMON_GROUND_POOL_BASIS_POINTS = 10_000;

export interface CommonGroundPoolParticipantInput {
  id: string;
  name: string;
  defaultProject: string;
  budgetCents: number;
  sharedValueBps: number;
}

export interface CommonGroundPoolDraftInput {
  sharedProject: string;
  targetCents: number;
  participants: CommonGroundPoolParticipantInput[];
  contributionCentsByParticipantId: Record<string, number>;
}

export interface CommonGroundPoolParticipantResult
  extends CommonGroundPoolParticipantInput {
  contributionCents: number;
  costShareBps: number;
  retainedDefaultCents: number;
  sharedProjectValueCents: number;
  equivalentValueCents: number;
  gainCents: number;
  withinBudget: boolean;
  gainsRelativeToDefault: boolean;
}

export interface CommonGroundPoolDraft {
  ok: boolean;
  policy: typeof COMMON_GROUND_POOL_POLICY;
  sharedProject: string;
  targetCents: number;
  totalContributionCents: number;
  combinedSharedValueBps: number;
  coordinationMarginBps: number;
  participantCount: number;
  participants: CommonGroundPoolParticipantResult[];
  blockers: string[];
  paymentCaptureAllowed: false;
  stateMutation: "none_preview_only";
  privateValueEstimatesStored: false;
}

export interface BalancedCommonGroundPoolDraft extends CommonGroundPoolDraft {
  balancedSuggestionAvailable: boolean;
}

function safeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function parseUsdInputToCents(value: string) {
  const trimmed = value.trim().replaceAll(",", "");
  if (!/^\d{0,9}(\.\d{0,2})?$/.test(trimmed) || trimmed === "" || trimmed === ".") {
    return 0;
  }

  const [whole = "0", fraction = ""] = trimmed.split(".");
  return Number.parseInt(whole || "0", 10) * 100 +
    Number.parseInt(fraction.padEnd(2, "0").slice(0, 2) || "0", 10);
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: safeInteger(cents) % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(safeInteger(cents) / 100);
}

export function roundHalfUpBasisPoints(cents: number, basisPoints: number) {
  const safeCents = safeInteger(cents);
  const safeBps = safeInteger(basisPoints);
  return Math.floor((safeCents * safeBps + COMMON_GROUND_POOL_BASIS_POINTS / 2) /
    COMMON_GROUND_POOL_BASIS_POINTS);
}

function allocateExactCents(targetCents: number, shares: number[]) {
  const safeTargetCents = safeInteger(targetCents);
  const raw = shares.map((share) => safeTargetCents * Math.max(0, share));
  const allocations = raw.map(Math.floor);
  let remainder = safeTargetCents - allocations.reduce((sum, value) => sum + value, 0);

  const rankedRemainders = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < rankedRemainders.length && remainder > 0; index += 1) {
    allocations[rankedRemainders[index]!.index] += 1;
    remainder -= 1;
  }

  return allocations;
}

/**
 * Suggests cost shares that equalize the surplus margin among participants
 * who pay a positive amount. This solves sum(max(0, valueShare - lambda)) = 1.
 * A suggestion exists only when combined private value exceeds the full cost.
 */
export function getBalancedCommonGroundCostShares(sharedValueBps: number[]) {
  const values = sharedValueBps.map((value) => safeInteger(value) / COMMON_GROUND_POOL_BASIS_POINTS);
  if (values.length < COMMON_GROUND_POOL_MIN_PARTICIPANTS || values.reduce((sum, value) => sum + value, 0) <= 1) {
    return null;
  }

  const active = new Set(values.map((_, index) => index));
  let lambda = 0;

  while (active.size > 0) {
    const activeTotal = [...active].reduce((sum, index) => sum + values[index]!, 0);
    lambda = (activeTotal - 1) / active.size;
    const nonPositive = [...active].filter((index) => values[index]! <= lambda);

    if (nonPositive.length === 0) break;
    for (const index of nonPositive) active.delete(index);
  }

  if (active.size === 0) return null;

  const shares = values.map((value, index) => active.has(index) ? Math.max(0, value - lambda) : 0);
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (total <= 0) return null;

  return shares.map((share) => share / total);
}

export function evaluateCommonGroundPoolDraft({
  contributionCentsByParticipantId,
  participants,
  sharedProject,
  targetCents,
}: CommonGroundPoolDraftInput): CommonGroundPoolDraft {
  const blockers: string[] = [];
  const safeTargetCents = safeInteger(targetCents);
  const trimmedSharedProject = sharedProject.trim();
  const participantIds = participants.map((participant) => participant.id);

  if (!trimmedSharedProject) blockers.push("shared_project_required");
  if (safeTargetCents <= 0) blockers.push("target_required");
  if (
    participants.length < COMMON_GROUND_POOL_MIN_PARTICIPANTS ||
    participants.length > COMMON_GROUND_POOL_MAX_PARTICIPANTS
  ) {
    blockers.push("participant_count_out_of_range");
  }
  if (new Set(participantIds).size !== participantIds.length) blockers.push("duplicate_participant_id");

  const results = participants.map((participant) => {
    const budgetCents = safeInteger(participant.budgetCents);
    const sharedValueBps = safeInteger(participant.sharedValueBps);
    const contributionCents = safeInteger(contributionCentsByParticipantId[participant.id] ?? 0);
    const sharedProjectValueCents = roundHalfUpBasisPoints(safeTargetCents, sharedValueBps);
    const retainedDefaultCents = Math.max(0, budgetCents - contributionCents);
    const equivalentValueCents = retainedDefaultCents + sharedProjectValueCents;
    const gainCents = equivalentValueCents - budgetCents;
    const withinBudget = contributionCents <= budgetCents;
    const gainsRelativeToDefault = gainCents > 0;

    if (!participant.name.trim()) blockers.push(`participant_name_required:${participant.id}`);
    if (!participant.defaultProject.trim()) blockers.push(`default_project_required:${participant.id}`);
    if (sharedValueBps <= 0) blockers.push(`invalid_value_estimate:${participant.id}`);
    if (!withinBudget) blockers.push(`participant_budget_exceeded:${participant.id}`);
    if (!gainsRelativeToDefault) blockers.push(`participant_does_not_gain:${participant.id}`);

    return {
      ...participant,
      name: participant.name.trim(),
      defaultProject: participant.defaultProject.trim(),
      budgetCents,
      sharedValueBps,
      contributionCents,
      costShareBps: safeTargetCents > 0
        ? Math.round((contributionCents * COMMON_GROUND_POOL_BASIS_POINTS) / safeTargetCents)
        : 0,
      retainedDefaultCents,
      sharedProjectValueCents,
      equivalentValueCents,
      gainCents,
      withinBudget,
      gainsRelativeToDefault,
    };
  });

  const totalContributionCents = results.reduce((sum, participant) => sum + participant.contributionCents, 0);
  const combinedSharedValueBps = results.reduce((sum, participant) => sum + participant.sharedValueBps, 0);
  const coordinationMarginBps = combinedSharedValueBps - COMMON_GROUND_POOL_BASIS_POINTS;

  if (totalContributionCents !== safeTargetCents) blockers.push("contributions_must_equal_target");
  if (combinedSharedValueBps <= COMMON_GROUND_POOL_BASIS_POINTS) {
    blockers.push("combined_value_does_not_exceed_cost");
  }

  return {
    ok: blockers.length === 0,
    policy: COMMON_GROUND_POOL_POLICY,
    sharedProject: trimmedSharedProject,
    targetCents: safeTargetCents,
    totalContributionCents,
    combinedSharedValueBps,
    coordinationMarginBps,
    participantCount: participants.length,
    participants: results,
    blockers: [...new Set(blockers)],
    paymentCaptureAllowed: false,
    stateMutation: "none_preview_only",
    privateValueEstimatesStored: false,
  };
}

export function buildBalancedCommonGroundPoolDraft({
  participants,
  sharedProject,
  targetCents,
}: Omit<CommonGroundPoolDraftInput, "contributionCentsByParticipantId">): BalancedCommonGroundPoolDraft {
  const shares = getBalancedCommonGroundCostShares(participants.map((participant) => participant.sharedValueBps));
  const contributions = shares
    ? allocateExactCents(targetCents, shares)
    : participants.map(() => 0);
  const contributionCentsByParticipantId = Object.fromEntries(
    participants.map((participant, index) => [participant.id, contributions[index] ?? 0]),
  );

  return {
    ...evaluateCommonGroundPoolDraft({
      contributionCentsByParticipantId,
      participants,
      sharedProject,
      targetCents,
    }),
    balancedSuggestionAvailable: Boolean(shares),
  };
}

export function blockerLabel(blocker: string) {
  const [code] = blocker.split(":");
  switch (code) {
    case "shared_project_required":
      return "Name the shared project.";
    case "target_required":
      return "Enter a positive funding target.";
    case "participant_count_out_of_range":
      return `Use ${COMMON_GROUND_POOL_MIN_PARTICIPANTS}-${COMMON_GROUND_POOL_MAX_PARTICIPANTS} participants.`;
    case "duplicate_participant_id":
      return "Each participant must have a distinct record.";
    case "participant_name_required":
      return "Give every participant a name.";
    case "default_project_required":
      return "Record every participant's no-pool default project.";
    case "invalid_value_estimate":
      return "Every participant must privately value the shared project above zero.";
    case "participant_budget_exceeded":
      return "A proposed contribution exceeds that participant's controlled budget.";
    case "participant_does_not_gain":
      return "At least one participant does not prefer this split to their recorded default.";
    case "contributions_must_equal_target":
      return "Proposed contributions must add up exactly to the shared funding target.";
    case "combined_value_does_not_exceed_cost":
      return "The participants' combined private value for the shared project must exceed 100% of its cost.";
    default:
      return "Resolve the remaining proposal constraint.";
  }
}

export function formatCommonGroundPoolProposalTerms(draft: CommonGroundPoolDraft) {
  const lines = [
    "Common Ground Pool proposal",
    `Shared project: ${draft.sharedProject || "Not named"}`,
    `Target funding: ${formatUsd(draft.targetCents)}`,
    "",
    "Participant terms:",
    ...draft.participants.map(
      (participant) =>
        `- ${participant.name || "Unnamed participant"}: contribute ${formatUsd(participant.contributionCents)}; retain ${formatUsd(participant.retainedDefaultCents)} for ${participant.defaultProject || "their recorded default"}.`,
    ),
    "",
    "Activation condition: every participant must accept the same frozen terms, remain within their stated budget, and prefer the proposal to their recorded no-pool default.",
    "No payment, authorization, hold, escrow, custody event, donation, or binding agreement is created by this draft.",
    "Private value estimates are not included in these copied terms.",
  ];

  return lines.join("\n");
}
