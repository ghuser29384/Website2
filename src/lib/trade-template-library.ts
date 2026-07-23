import { getReviewedMarketplaceSeedTemplate } from "@/lib/marketplace-seed-templates";

export type TradeTemplateFilter = "all" | "money" | "actions" | "groups";
export type TradeTemplateHandoff = "trade_draft" | "offset_route" | "pool_route";
export type TradeTemplateGuideQuestionKey = "moves" | "coordination" | "trust";
export type TradeTemplateGuideAnswers = Partial<
  Record<TradeTemplateGuideQuestionKey, string>
>;

export interface TradeTemplateSignal {
  label: string;
  level: 1 | 2 | 3 | 4;
  value: string;
  note: string;
}

export interface TradeTemplateLibraryEntry {
  id: string;
  symbol: string;
  name: string;
  family: string;
  summary: string;
  exchangeType: string;
  filters: readonly Exclude<TradeTemplateFilter, "all">[];
  statusLabel: string;
  sourceBasis: string;
  youOffer: string;
  theyOffer: string;
  baseline: string;
  activation: string;
  evidence: string;
  duration: string;
  exitRule: string;
  unmatchedRule: string | null;
  caveat: string;
  clauses: readonly string[];
  signals: readonly TradeTemplateSignal[];
  guide: {
    moves: readonly string[];
    coordination: readonly string[];
    trust: readonly string[];
  };
  handoff: {
    kind: TradeTemplateHandoff;
    href: string;
    label: string;
    note: string;
  };
}

export interface TradeTemplateInitialValues {
  offeredCause: string;
  requestedCause: string;
  proposedAction: string;
  requestedAction: string;
  noTradeBaseline: string;
  duration: string;
  evidenceRule: string;
  exitConditions: string;
  notes: string;
}

const STANDARD_SIGNALS = {
  bounded: {
    label: "Setup effort",
    level: 2,
    value: "Bounded",
    note: "Both legs, the default, duration, and exit rule must be stated.",
  },
  evidence: {
    label: "Evidence burden",
    level: 2,
    value: "Proportional",
    note: "Proof should fit the consequence and preserve private material.",
  },
  twoSides: {
    label: "Coordination",
    level: 2,
    value: "Two sides",
    note: "Both participants inspect and accept the same frozen terms.",
  },
  review: {
    label: "Review need",
    level: 2,
    value: "Standard",
    note: "A draft still passes baseline, safety, evidence, and authority review.",
  },
} as const satisfies Record<string, TradeTemplateSignal>;

export const TRADE_TEMPLATE_LIBRARY = [
  {
    id: "pledge-swap",
    symbol: "↔",
    name: "One-meal pledge swap",
    family: "Reciprocal pledge",
    summary: "Trade one bounded food-abstention pledge for a concrete reciprocal action.",
    exchangeType: "ACTION × ACTION",
    filters: ["actions"],
    statusLabel: "Reviewed starter",
    sourceBasis: "Moral barter",
    youOffer: "One short, concrete commitment that advances their priority",
    theyOffer: "One bounded reciprocal action that advances your priority",
    baseline: "What each side would actually do without this agreement",
    activation: "Both sides accept the same terms before either action begins",
    evidence: "Proportional proof for each leg; private material stays private",
    duration: "One meal, one day, a few days, or another explicitly bounded term",
    exitRule: "Either side may withdraw before lock; future obligations can end under the stated rule",
    unmatchedRule: null,
    caveat:
      "A trade must not reward a newly manufactured harmful baseline. Food-related pledges require substitutes, health boundaries, and extra review for longer terms.",
    clauses: [
      "No-trade baseline",
      "Your commitment",
      "Counterparty commitment",
      "Activation and duration",
      "Evidence for both legs",
      "Exit and unresolved outcome",
      "Affected-party and safety review",
    ],
    signals: [
      STANDARD_SIGNALS.bounded,
      STANDARD_SIGNALS.evidence,
      STANDARD_SIGNALS.twoSides,
      STANDARD_SIGNALS.review,
    ],
    guide: {
      moves: ["action", "habit"],
      coordination: ["two_sides"],
      trust: ["evidence", "verifier", "honor"],
    },
    handoff: {
      kind: "trade_draft",
      href: "/trades/new?template=reciprocal-mixed",
      label: "Use template →",
      note: "Opens the private card-stack editor with editable one-meal pledge terms.",
    },
  },
  {
    id: "donation-redirect",
    symbol: "$",
    name: "Direct donation offset",
    family: "Opposition cancellation",
    summary: "Neutralize matched opposed spending, then redirect the matched amounts.",
    exchangeType: "MONEY × MONEY",
    filters: ["money"],
    statusLabel: "Reviewed starter",
    sourceBasis: "Opposition cancellation + settlement",
    youOffer: "Redirect a matched amount you credibly planned to give to one side",
    theyOffer: "Redirect a matched amount they credibly planned to give to the opposed side",
    baseline: "Each side records the donation it would otherwise make and the evidence for that intention",
    activation: "Only the matched, reviewed amount is neutralized and redirected",
    evidence: "Baseline evidence, final receipts, destination checks, and donor-of-record review",
    duration: "One-off or explicitly recurring matched period",
    exitRule: "The match expires or follows its published cancellation rule before settlement",
    unmatchedRule: "Return it, keep it at the original destination, or follow another explicit reviewed rule",
    caveat:
      "A unilateral donation change is not automatically a moral trade. Election, campaign, tax, solicitation, and jurisdiction rules require separate review; destinations may be shared or chosen separately.",
    clauses: [
      "Both no-trade donation baselines",
      "Matched amounts and ratio",
      "Redirect destinations",
      "Activation deadline",
      "Exit, cancellation, and unmatched-funds rule",
      "Receipt and destination evidence",
      "Jurisdiction and externality review",
    ],
    signals: [
      {
        label: "Setup effort",
        level: 3,
        value: "Detailed",
        note: "Amounts, destinations, match ratio, baseline, deadline, and residual flows matter.",
      },
      {
        label: "Evidence burden",
        level: 4,
        value: "High",
        note: "Both baseline intention and completed redirects need reviewable records.",
      },
      STANDARD_SIGNALS.twoSides,
      {
        label: "Review need",
        level: 4,
        value: "Specialist",
        note: "Financial, recipient, donor-of-record, and jurisdiction checks remain separate.",
      },
    ],
    guide: {
      moves: ["money"],
      coordination: ["two_sides", "market"],
      trust: ["evidence", "verifier", "conditional"],
    },
    handoff: {
      kind: "offset_route",
      href: "/offers/new?entry=draft&template=pure-opposed-cause&mode=offset",
      label: "Use template →",
      note: "Opens the donation-offset editor with editable reviewed defaults.",
    },
  },
  {
    id: "skill-exchange",
    symbol: "◎",
    name: "Skill exchange",
    family: "Work or time exchange",
    summary: "Give bounded expertise; receive a concrete action or service.",
    exchangeType: "SKILL × ACTION",
    filters: ["actions"],
    statusLabel: "Editable starter",
    sourceBasis: "Work/time as a trade leg",
    youOffer: "A scoped review, analysis, introduction, or other defined contribution",
    theyOffer: "A concrete action, service, or allocation with a clear endpoint",
    baseline: "Whether either contribution was already planned without the exchange",
    activation: "Both sides accept scope, sequence, deadline, and the commitment limit",
    evidence: "Deliverable link, acceptance checklist, or proportionate attestation",
    duration: "One deliverable or a fixed number of hours",
    exitRule: "Unstarted work may end; completed work and accepted deliverables remain recorded",
    unmatchedRule: null,
    caveat:
      "Name authority, ownership, confidentiality, conflicts, and third-party duties. Ordinary commercial services should not be presented as moral impact without a genuine moral leg.",
    clauses: [
      "No-trade baseline",
      "Scope you provide",
      "Counterparty action",
      "Commitment limit",
      "Acceptance evidence",
      "Confidentiality and ownership",
      "Exit and partial completion",
    ],
    signals: [
      STANDARD_SIGNALS.bounded,
      {
        label: "Evidence burden",
        level: 2,
        value: "Deliverable",
        note: "A shared acceptance checklist usually fits better than invasive monitoring.",
      },
      STANDARD_SIGNALS.twoSides,
      {
        label: "Review need",
        level: 3,
        value: "Contextual",
        note: "Authority, ownership, confidentiality, and ordinary-service boundaries may need review.",
      },
    ],
    guide: {
      moves: ["skill", "time"],
      coordination: ["two_sides", "team"],
      trust: ["evidence", "verifier"],
    },
    handoff: {
      kind: "trade_draft",
      href: "/trades/new?template=skill-exchange",
      label: "Use template →",
      note: "Opens the private card-stack editor with an editable skill-exchange scaffold.",
    },
  },
  {
    id: "threshold-coalition",
    symbol: "↗",
    name: "Threshold coalition",
    family: "Moral public-good pool",
    summary: "Activate a shared project only when its published threshold is met.",
    exchangeType: "GROUP × THRESHOLD",
    filters: ["money", "groups"],
    statusLabel: "Editable starter",
    sourceBasis: "Assurance contract",
    youOffer: "A capped conditional contribution",
    theyOffer: "Enough compatible contributions to reach the activation condition",
    baseline: "What contributors and the project would do if this pool did not exist",
    activation: "A published minimum is met before the deadline under the stated counting rule",
    evidence: "Contribution records, threshold snapshot, recipient eligibility, and outcome reporting",
    duration: "One funding round with a fixed close and reporting period",
    exitRule: "No activation means the published failure and release rule applies",
    unmatchedRule: "State the cap and what happens above the minimum: continue funding, tier, stop, or return",
    caveat:
      "A threshold does not eliminate free-riding. Separate the minimum viable threshold, cap, marginal value above threshold, and any failure-bonus terms; do not imply a contributor was pivotal without evidence.",
    clauses: [
      "No-pool baseline",
      "Shared moral public good",
      "Minimum threshold and cap",
      "Counting and deadline rules",
      "Above-threshold policy",
      "Failure and release rule",
      "Recipient and outcome evidence",
    ],
    signals: [
      {
        label: "Setup effort",
        level: 4,
        value: "High",
        note: "Threshold, cap, counting, recipient, release, and reporting rules must align.",
      },
      {
        label: "Evidence burden",
        level: 4,
        value: "Ledgered",
        note: "Activation and contribution status need an auditable snapshot.",
      },
      {
        label: "Coordination",
        level: 4,
        value: "Group",
        note: "Many contributors coordinate around one non-excludable moral good.",
      },
      {
        label: "Review need",
        level: 4,
        value: "Specialist",
        note: "Funding, governance, release, and recipient claims remain separate gates.",
      },
    ],
    guide: {
      moves: ["money", "project"],
      coordination: ["group", "market"],
      trust: ["conditional", "evidence", "verifier"],
    },
    handoff: {
      kind: "pool_route",
      href: "/mpgf/pools/new?template=threshold-coalition",
      label: "Use template →",
      note: "Opens the candidate-pool editor with editable threshold terms.",
    },
  },
  {
    id: "evidence-backed-favor",
    symbol: "◇",
    name: "Evidence-backed favor",
    family: "Sponsored or reciprocal action",
    summary: "Make one clear favor reviewable with proof proportional to its stakes.",
    exchangeType: "TIME × PROOF",
    filters: ["actions"],
    statusLabel: "Editable starter",
    sourceBasis: "Mixed or pure moral trade",
    youOffer: "A bounded favor, action, or allocation",
    theyOffer: "A concrete reciprocal or sponsored moral action",
    baseline: "Whether the favored action was already planned and why the exchange changes it",
    activation: "The requested action, commitment limit, and evidence requirements are accepted",
    evidence: "A timestamped artifact, attestation, or independent check chosen for the consequence",
    duration: "One favor or a short fixed sequence",
    exitRule: "Future action can end before performance; unresolved proof is not marked complete",
    unmatchedRule: null,
    caveat:
      "Evidence can show what happened but cannot by itself prove additionality. Avoid coercive favors, dependency pressure, invasive proof, and any promise outside a participant's authority.",
    clauses: [
      "No-trade baseline",
      "Favor or sponsored action",
      "Reciprocal moral leg",
      "Commitment limit",
      "Proportional evidence",
      "Privacy and affected parties",
      "Exit and unresolved state",
    ],
    signals: [
      STANDARD_SIGNALS.bounded,
      {
        label: "Evidence burden",
        level: 3,
        value: "Proportional",
        note: "The proof ladder should stop before privacy cost exceeds its value.",
      },
      STANDARD_SIGNALS.twoSides,
      {
        label: "Review need",
        level: 3,
        value: "Safety-aware",
        note: "Authority, dependency, coercion, and third-party effects need explicit checks.",
      },
    ],
    guide: {
      moves: ["action", "time", "habit"],
      coordination: ["two_sides"],
      trust: ["evidence", "verifier"],
    },
    handoff: {
      kind: "trade_draft",
      href: "/trades/new?template=evidence-backed-favor",
      label: "Use template →",
      note: "Opens the private card-stack editor with an editable favor-and-evidence scaffold.",
    },
  },
] as const satisfies readonly TradeTemplateLibraryEntry[];

const STRUCTURAL_TRADE_TEMPLATE_INITIAL_VALUES: Readonly<
  Record<string, TradeTemplateInitialValues>
> = {
  "skill-exchange": {
    offeredCause: "[Replace: priority advanced by your contribution]",
    requestedCause: "[Replace: priority advanced by the counterparty]",
    proposedAction:
      "Provide [Replace: a defined review, deliverable, introduction, or up to X hours of work] by [Replace: date].",
    requestedAction:
      "Complete [Replace: a concrete reciprocal action or service] by [Replace: date].",
    noTradeBaseline:
      "[Replace: what each side would do without the exchange and whether either contribution was already planned.]",
    duration: "One deliverable or a fixed number of hours",
    evidenceRule:
      "Use a deliverable link, shared acceptance checklist, or proportionate attestation; keep confidential material private.",
    exitConditions:
      "Either side may withdraw before terms are locked. Record accepted partial work, and end unstarted future work under the agreed cancellation rule.",
    notes:
      "Define scope, deadline, maximum time, ownership, confidentiality, authority, and the acceptance standard before submitting for review.",
  },
  "evidence-backed-favor": {
    offeredCause: "[Replace: priority advanced by your favor]",
    requestedCause: "[Replace: priority advanced by the reciprocal action]",
    proposedAction:
      "Complete [Replace: one bounded favor or action] by [Replace: date], within a commitment limit of [Replace: limit].",
    requestedAction:
      "Complete [Replace: one concrete reciprocal or sponsored moral action] by [Replace: date].",
    noTradeBaseline:
      "[Replace: whether either action was already planned and what each side would otherwise do.]",
    duration: "One favor or a short fixed sequence",
    evidenceRule:
      "Use the least intrusive sufficient proof: a timestamped artifact, bounded attestation, or independent check.",
    exitConditions:
      "Either side may withdraw before terms are locked. Missing or disputed proof remains unresolved rather than completed.",
    notes:
      "Confirm voluntariness, authority, affected-party safety, privacy, the commitment limit, and the exact claim the evidence can support.",
  },
};

export function findTradeTemplateGuideResult(answers: TradeTemplateGuideAnswers) {
  const completed = Object.entries(answers).filter(([, value]) => Boolean(value));
  const requestedMove = answers.moves;
  const compatibleTemplates =
    requestedMove && requestedMove !== "unsure"
      ? TRADE_TEMPLATE_LIBRARY.filter((template) =>
          (template.guide.moves as readonly string[]).includes(requestedMove),
        )
      : TRADE_TEMPLATE_LIBRARY;
  const ranked = compatibleTemplates
    .map((template, index) => {
      const score = completed.reduce((total, [key, value]) => {
        const guideValues = template.guide[key as TradeTemplateGuideQuestionKey] as readonly string[];
        return total + (guideValues.includes(value) ? 3 : 0);
      }, 0);
      return { template, score, index };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return ranked[0]?.template ?? TRADE_TEMPLATE_LIBRARY[0];
}

export function getTradeTemplateLibraryEntry(templateId: string | undefined) {
  if (!templateId) return null;
  return TRADE_TEMPLATE_LIBRARY.find((template) => template.id === templateId) ?? null;
}

export function getPledgeTemplateInitialValues(
  templateId: string | undefined,
): TradeTemplateInitialValues | null {
  const template = getReviewedMarketplaceSeedTemplate(templateId);
  if (!template || template.format !== "pledge_swap") {
    return templateId ? STRUCTURAL_TRADE_TEMPLATE_INITIAL_VALUES[templateId] ?? null : null;
  }

  return {
    offeredCause: template.prefill.offeredCause,
    requestedCause: template.prefill.requestedCause,
    proposedAction: template.prefill.offerAction,
    requestedAction: template.prefill.requestAction,
    noTradeBaseline: template.prefill.baselineStatement,
    duration: template.prefill.duration,
    evidenceRule: template.prefill.verification,
    exitConditions: template.prefill.exitCondition,
    notes: template.prefill.notes,
  };
}

export function getTradeDraftTemplateLabel(templateId: string | undefined) {
  if (!templateId) return null;

  const reviewedTemplate = getReviewedMarketplaceSeedTemplate(templateId);
  if (reviewedTemplate?.format === "pledge_swap") {
    return reviewedTemplate.prefill.title;
  }

  return getTradeTemplateLibraryEntry(templateId)?.name ?? null;
}
