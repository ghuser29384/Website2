export type BaselineConfidence = "Weak" | "Moderate" | "Strong" | "Not assessed";
export type ScoreConfidence = "Low" | "Medium" | "High";

export interface ProposalReviewInput {
  id?: string;
  mode: string;
  verification: string;
  trustLevel?: number | null;
  baselineAmountUsd?: number | null;
  baselineOpposedCause?: string | null;
  requestedMatchingAmountUsd?: number | null;
  requestedOpposedCause?: string | null;
  evidenceUrl?: string | null;
  moderationStatus?: string | null;
  offeredCause?: string | null;
  requestedCause?: string | null;
}

export const WORKED_EXAMPLE_LAUNCH_ORDER = [
  "seed-victoria",
  "seed-paul",
  "seed-nia",
  "seed-omar",
  "seed-lina",
  "seed-marco",
  "seed-rebecca",
  "seed-christopher",
] as const;

const WORKED_EXAMPLE_ORDER_MAP = new Map<string, number>(
  WORKED_EXAMPLE_LAUNCH_ORDER.map((id, index) => [id, index]),
);

const POLITICAL_ADJACENT_CAUSES = ["gun rights", "gun control", "political", "campaign"];

export const THIRD_PARTY_EXTERNALITY_PROMPTS = [
  "Who might object to this trade?",
  "Could this create bad incentives?",
  "Could this harm people or values not represented by the parties?",
  "Does this proposal need external reviewer input?",
] as const;

export const ANTI_THREAT_BASELINE_RULES = [
  "No pay me or I will do X offers.",
  "No compensation for stopping newly escalated harmful behavior.",
  "Every proposal needs a no-trade baseline statement: what would you do absent this trade?",
  "Recent harmful behavior triggers a cooling-off period before compensation can be discussed.",
  "Coercive or suspicious baselines go to reviewer challenge before any matching or reliance.",
] as const;

export const REJECTED_PROPOSAL_EXAMPLES = [
  {
    title: "Newly escalated threat",
    summary:
      "I will start harassing this organization unless someone pays me to stop. Rejected as threat creation.",
  },
  {
    title: "Paid de-escalation after strategic worsening",
    summary:
      "I just increased my opposed donations and now want compensation to stop. Rejected until baseline integrity is reviewed.",
  },
  {
    title: "Pressure on a vulnerable person",
    summary:
      "A proposal that makes private contact or public exposure conditional on compliance. Rejected for coercive pressure.",
  },
] as const;

export function getWorkedExampleLaunchOrder(id: string) {
  return WORKED_EXAMPLE_ORDER_MAP.get(id) ?? WORKED_EXAMPLE_LAUNCH_ORDER.length;
}

export function sortWorkedExamplesByLaunchRisk<T extends { id: string }>(offers: readonly T[]) {
  return [...offers].sort(
    (left, right) => getWorkedExampleLaunchOrder(left.id) - getWorkedExampleLaunchOrder(right.id),
  );
}

export function getScoreConfidence(input: ProposalReviewInput): ScoreConfidence {
  const trustLevel = input.trustLevel ?? 0;

  if (trustLevel >= 4) {
    return "High";
  }

  if (trustLevel >= 3) {
    return "Medium";
  }

  return "Low";
}

export function getActionEvidenceSummary(input: ProposalReviewInput) {
  const verification = input.verification.trim();
  const lowerVerification = verification.toLowerCase();

  if (lowerVerification.includes("annual receipt")) {
    return "Receipts, donation records, and an annual review checkpoint.";
  }

  if (lowerVerification.includes("public pledge")) {
    return "A dated public pledge plus light follow-up evidence.";
  }

  if (lowerVerification.includes("payment")) {
    return "External payment records and completion evidence before any reliance.";
  }

  if (lowerVerification.includes("peer witness")) {
    return "Named witness attestation plus the participant's action log.";
  }

  if (lowerVerification.includes("manual review")) {
    return "Reviewer inspection of the named evidence before reliance.";
  }

  return verification || "Evidence method not yet specified.";
}

export function getBaselineConfidence(input: ProposalReviewInput): BaselineConfidence {
  if (input.mode === "offset" && input.evidenceUrl && input.moderationStatus === "clear") {
    return "Moderate";
  }

  if (input.mode === "offset") {
    return "Weak";
  }

  if (input.verification.toLowerCase().includes("annual receipt")) {
    return "Moderate";
  }

  if (input.verification.toLowerCase().includes("public pledge")) {
    return "Weak";
  }

  if (input.verification.toLowerCase().includes("payment")) {
    return "Weak";
  }

  return "Not assessed";
}

export function getBaselineEvidenceSummary(input: ProposalReviewInput) {
  if (input.mode === "offset" && input.baselineAmountUsd && input.baselineOpposedCause) {
    return `Baseline claim: $${input.baselineAmountUsd.toLocaleString("en-US")} would otherwise have gone to ${input.baselineOpposedCause}. Reviewers should ask for prior giving history, dated intent, and counterparty challenge.`;
  }

  if (input.mode === "payment") {
    return "Baseline should state whether the requested action was already likely; payment alone does not show counterfactual impact.";
  }

  if (input.verification.toLowerCase().includes("annual receipt")) {
    return "Review should compare receipts with prior giving history, declared intention, duration, and counterparty review.";
  }

  return "Review should capture a dated no-trade baseline and any evidence that the agreement changed behavior.";
}

export function getExternalityReviewSummary(input: ProposalReviewInput) {
  const causes = [input.offeredCause, input.requestedCause].filter(Boolean).join(" ").toLowerCase();

  if (POLITICAL_ADJACENT_CAUSES.some((cause) => causes.includes(cause))) {
    return "Political-adjacent case study. Keep below lower-risk examples and require externality review for affected communities and unrepresented values.";
  }

  if (input.mode === "offset") {
    return "Check whether redirection creates perverse incentives or harms people not represented by the two parties.";
  }

  if (input.mode === "payment") {
    return "Check whether payment could reward strategic delay, newly escalated behavior, or pressure on vulnerable people.";
  }

  return "Review whether the trade creates third-party harms, bad incentives, or objections from moral views not present in the match.";
}
