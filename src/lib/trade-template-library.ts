import { getReviewedMarketplaceSeedTemplate } from "@/lib/marketplace-seed-templates";

export type TradeTemplateFilter = "all" | "money" | "actions" | "groups" | "custom";
export type TradeTemplateHandoff = "trade_draft" | "offset_route" | "pool_route" | "custom_draft";

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
    name: "Pledge swap",
    family: "Reciprocal commitments",
    summary: "Trade one bounded behavior or allocation for another.",
    exchangeType: "ACTION × ACTION",
    filters: ["actions"],
    statusLabel: "Admin-reviewed seed available",
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
      label: "Use reviewed starter",
      note: "Opens the real private card-stack editor with an editable reviewed micro-pledge example.",
    },
  },
  {
    id: "donation-redirect",
    symbol: "$",
    name: "Donation cancellation + redirect",
    family: "Opposition cancellation",
    summary: "Neutralize matched opposed spending, then redirect the matched amounts.",
    exchangeType: "MONEY × MONEY",
    filters: ["money"],
    statusLabel: "Admin-reviewed offset seed",
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
      href: "/donation-offsets",
      label: "Review offset mechanism",
      note: "Opens the specialist offset mechanism and its review gates. No one-click offset draft is currently available.",
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
    statusLabel: "Structure starter · review required",
    sourceBasis: "Work/time as a trade leg",
    youOffer: "A scoped review, analysis, introduction, or other defined contribution",
    theyOffer: "A concrete action, service, or allocation with a clear endpoint",
    baseline: "Whether either contribution was already planned without the exchange",
    activation: "Both sides accept scope, sequence, deadline, and maximum burden",
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
      "Maximum time or burden",
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
      kind: "custom_draft",
      href: "/trades/new?structure=skill-exchange",
      label: "Start a custom draft",
      note: "Opens a blank private trade draft; this structure has no approved one-click prefill yet.",
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
    statusLabel: "Pool route · terms set per pool",
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
      href: "/create?mode=pool",
      label: "Open pool route",
      note: "Opens the conditional-pool route without pretending a generic template is a live pool.",
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
    statusLabel: "Structure starter · review required",
    sourceBasis: "Mixed or pure moral trade",
    youOffer: "A bounded favor, action, or allocation",
    theyOffer: "A concrete reciprocal or sponsored moral action",
    baseline: "Whether the favored action was already planned and why the exchange changes it",
    activation: "The requested action, maximum burden, and evidence rule are accepted",
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
      "Maximum burden",
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
      kind: "custom_draft",
      href: "/trades/new?structure=evidence-backed-favor",
      label: "Start a custom draft",
      note: "Opens a blank private trade draft; the anatomy remains a checklist, not an approved instance.",
    },
  },
  {
    id: "blank",
    symbol: "+",
    name: "Build from blank",
    family: "Custom structure",
    summary: "Choose only the clauses your exchange actually needs.",
    exchangeType: "CUSTOM STRUCTURE",
    filters: ["custom"],
    statusLabel: "Custom draft · operator review",
    sourceBasis: "Compositional trade dimensions",
    youOffer: "A bounded leg you define",
    theyOffer: "A reciprocal, sponsored, collective, or shared-outcome leg",
    baseline: "The real no-trade default remains mandatory even in a custom structure",
    activation: "You define an immediate, paired-match, threshold, recurring, or other reviewed trigger",
    evidence: "You select a proportionate proof ladder and privacy scope",
    duration: "Explicitly bounded by quantity, time, rounds, or a one-off decision",
    exitRule: "State what can end, what remains recorded, and what becomes unresolved",
    unmatchedRule: "Required whenever money, matching, residual claims, or threshold overage exists",
    caveat:
      "Custom does not bypass baseline integrity, voluntariness, affected-party review, authority, evidence, privacy, legal review, or separate authorization before reliance.",
    clauses: [
      "No-trade baseline",
      "Each exchange leg",
      "Activation condition",
      "Maximum burden",
      "Evidence and privacy",
      "Exit, fallback, or residual rule",
      "Affected-party and authority review",
    ],
    signals: [
      {
        label: "Setup effort",
        level: 4,
        value: "Custom",
        note: "The user owns every structural choice and its completeness.",
      },
      {
        label: "Evidence burden",
        level: 3,
        value: "Variable",
        note: "Evidence should scale with consequence and privacy cost.",
      },
      {
        label: "Coordination",
        level: 3,
        value: "Variable",
        note: "Topology may be bilateral, matched, collective, or another reviewed structure.",
      },
      {
        label: "Review need",
        level: 4,
        value: "Full",
        note: "No approved starter narrows the review surface.",
      },
    ],
    guide: {
      moves: ["unsure"],
      coordination: ["custom", "team"],
      trust: ["honor", "evidence", "verifier", "conditional"],
    },
    handoff: {
      kind: "custom_draft",
      href: "/trades/new",
      label: "Start from blank",
      note: "Opens the real private card-stack editor with no canned terms.",
    },
  },
] as const satisfies readonly TradeTemplateLibraryEntry[];

export function getTradeTemplateLibraryEntry(templateId: string | undefined) {
  if (!templateId) return null;
  return TRADE_TEMPLATE_LIBRARY.find((template) => template.id === templateId) ?? null;
}

export function getPledgeTemplateInitialValues(
  templateId: string | undefined,
): TradeTemplateInitialValues | null {
  const template = getReviewedMarketplaceSeedTemplate(templateId);
  if (!template || template.format !== "pledge_swap") return null;

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
