export type TradeSafeguardStatus =
  | "recorded"
  | "pending"
  | "action_required"
  | "human_review"
  | "blocked"
  | "not_recorded"
  | "not_applicable";

export interface TradeSafeguardItem {
  actionLabel: string;
  href: string;
  id:
    | "baseline"
    | "consent"
    | "evidence"
    | "review"
    | "affected_parties"
    | "authority"
    | "custody"
    | "settlement";
  label: string;
  status: TradeSafeguardStatus;
  summary: string;
}

export interface TradeSafeguardSnapshot {
  acceptedEvidenceCount: number;
  confirmationCount: number;
  evidenceCount: number;
  lifecycleStatus: string;
  participantCount?: number;
  version: {
    evidenceRule: string;
    exitConditions: string;
    maximumBurden: string;
    noTradeBaseline: string;
    privacyScope: string;
  };
}

export const GENERIC_CREATE_NO_TRADE_BASELINE =
  "If no proposal is accepted, neither party incurs an obligation.";

const GENERIC_EVIDENCE_RULE =
  "Evidence terms must be agreed before any binding trade.";

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isConcrete(value: string, genericValue?: string) {
  const normalized = normalize(value);
  if (!normalized) return false;
  return genericValue ? normalized !== normalize(genericValue) : true;
}

function settlementItem(lifecycleStatus: string): TradeSafeguardItem {
  const normalizedStatus = normalize(lifecycleStatus).replaceAll(" ", "_");

  if (normalizedStatus === "completed") {
    return {
      actionLabel: "Inspect completion record",
      href: "#milestones",
      id: "settlement",
      label: "Settlement, completion, and exit",
      status: "recorded",
      summary:
        "The agreement is complete. Frozen terms, evidence history, review decisions, and any external-payment records remain in the audit trail.",
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "expired") {
    return {
      actionLabel: "Inspect exit record",
      href: "#exit",
      id: "settlement",
      label: "Settlement, completion, and exit",
      status: "recorded",
      summary:
        "Future obligations ended under the recorded exit state. Completed periods and prior evidence remain part of the agreement record.",
    };
  }

  if (normalizedStatus === "disputed") {
    return {
      actionLabel: "Open review workflow",
      href: "#milestones",
      id: "settlement",
      label: "Settlement, completion, and exit",
      status: "blocked",
      summary:
        "A dispute is unresolved. Completion and any dependent external-payment conclusion must remain blocked until the recorded review path resolves it.",
    };
  }

  return {
    actionLabel: normalizedStatus === "proposed" ? "Review frozen terms" : "Open milestones",
    href: normalizedStatus === "proposed" ? "#terms" : "#milestones",
    id: "settlement",
    label: "Settlement, completion, and exit",
    status: "pending",
    summary:
      normalizedStatus === "proposed"
        ? "The agreement has not activated. Settlement depends on both participants confirming the same frozen version."
        : "The agreement is still in progress. Completion, review, and exit states are determined from the persisted milestone record.",
  };
}

export function buildTradeSafeguardItems(
  input: TradeSafeguardSnapshot,
): TradeSafeguardItem[] {
  const participantCount = Math.max(1, Math.floor(input.participantCount ?? 2));
  const lifecycleStatus = normalize(input.lifecycleStatus).replaceAll(" ", "_");
  const endedBeforeActivation =
    (lifecycleStatus === "cancelled" || lifecycleStatus === "expired") &&
    input.confirmationCount < participantCount;
  const baselineIsConcrete = isConcrete(
    input.version.noTradeBaseline,
    GENERIC_CREATE_NO_TRADE_BASELINE,
  );
  const evidenceRuleIsConcrete = isConcrete(
    input.version.evidenceRule,
    GENERIC_EVIDENCE_RULE,
  );
  const evidenceBoundaryIsRecorded =
    evidenceRuleIsConcrete &&
    isConcrete(input.version.privacyScope) &&
    isConcrete(input.version.maximumBurden) &&
    isConcrete(input.version.exitConditions);

  const reviewStatus: TradeSafeguardStatus =
    lifecycleStatus === "disputed"
      ? "blocked"
      : input.acceptedEvidenceCount > 0
        ? "recorded"
        : input.evidenceCount > 0
          ? "human_review"
          : "pending";

  return [
    {
      actionLabel: "Inspect frozen baseline",
      href: "#terms",
      id: "baseline",
      label: "Counterfactual baseline",
      status: baselineIsConcrete ? "recorded" : "action_required",
      summary: baselineIsConcrete
        ? "The frozen version states a specific no-trade baseline. This records the claim; it does not by itself prove additionality."
        : "This version has no specific counterfactual baseline beyond a generic no-agreement default. Do not treat additionality as established.",
    },
    {
      actionLabel: "Review confirmations",
      href: "#terms",
      id: "consent",
      label: "Same-version participant consent",
      status: endedBeforeActivation
        ? "not_applicable"
        : input.confirmationCount >= participantCount
          ? "recorded"
          : "pending",
      summary: endedBeforeActivation
        ? "The agreement ended before every participant confirmed the same version."
        : input.confirmationCount >= participantCount
          ? `${input.confirmationCount} of ${participantCount} participants confirmed the same immutable version.`
          : `${input.confirmationCount} of ${participantCount} participants have confirmed this immutable version. Activation remains unavailable until all required confirmations exist.`,
    },
    {
      actionLabel: "Inspect evidence terms",
      href: "#terms",
      id: "evidence",
      label: "Evidence, burden, privacy, and exit scope",
      status: evidenceBoundaryIsRecorded ? "recorded" : "action_required",
      summary: evidenceBoundaryIsRecorded
        ? "The frozen version records the evidence rule, maximum burden, privacy boundary, and exit terms used by the live workflow."
        : "One or more evidence, burden, privacy, or exit boundaries are missing or generic. Reliance should remain blocked until a specific version is agreed.",
    },
    {
      actionLabel: "Open evidence and review",
      href: "#milestones",
      id: "review",
      label: "Evidence review and challenge path",
      status: reviewStatus,
      summary:
        reviewStatus === "recorded"
          ? `${input.acceptedEvidenceCount} evidence decision${input.acceptedEvidenceCount === 1 ? "" : "s"} reached an accepted graded state. Appeal and payment-review records remain separate.`
          : reviewStatus === "human_review"
            ? `${input.evidenceCount} evidence submission${input.evidenceCount === 1 ? " is" : "s are"} recorded and still require the applicable human review state.`
            : reviewStatus === "blocked"
              ? "The agreement is disputed. The challenge, reviewer, and appeal workflow controls any further reliance."
              : "No completed evidence decision is recorded yet. Reviewer assignment, evidence submission, and appeal controls live in the milestone workflow.",
    },
    {
      actionLabel: "Review safety rules",
      href: "/safety",
      id: "affected_parties",
      label: "Affected-party safeguards",
      status: "not_recorded",
      summary:
        "The current bilateral agreement record has no persisted affected-party sign-off. If a nonparticipant may bear a cost, use the safety route before relying on the trade.",
    },
    {
      actionLabel: "Review authority boundary",
      href: "/team-and-governance#organizational-authority",
      id: "authority",
      label: "Organizational authority",
      status: "not_applicable",
      summary:
        "This core agreement authenticates individual profiles only. It does not grant authority to bind an organization, program, employer, or fund.",
    },
    {
      actionLabel: "Inspect payment records",
      href: "#milestones",
      id: "custody",
      label: "Financial custody and reservation",
      status: "not_applicable",
      summary:
        "Moral Trade does not hold funds or create a financial reservation through this agreement. Any external payment uses its own receipt, response, review, and appeal state.",
    },
    settlementItem(input.lifecycleStatus),
  ];
}
