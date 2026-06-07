import type { OfferMode, PaymentIntervalUnit } from "@/lib/offers";

type SeedTemplateFormat = "donation_offset" | "pledge_swap";

export interface ReviewedMarketplaceSeedTemplatePrefill {
  title: string;
  description: string;
  mode: OfferMode;
  offeredCause: string;
  requestedCause: string;
  compromiseCause: string;
  offerAction: string;
  requestAction: string;
  baselineStatement: string;
  exitCondition: string;
  notes: string;
  offerImpact: string;
  minCounterpartyImpact: string;
  verification: string;
  duration: string;
  paymentIntervalUnit: PaymentIntervalUnit;
  paymentIntervalValue: string;
  trustLevel: string;
  offset?: {
    baselineAmountUsd: string;
    requestedMatchingAmountUsd: string;
    baselineOpposedCause: string;
    requestedOpposedCause: string;
    participationMode: "direct" | "pool";
    compromiseDestinationId?: string;
    offsetRatio: string;
    timeHorizon?: "one_off" | "recurring";
    verificationMethod?:
      | "proof_of_past_donations"
      | "receipts_uploaded"
      | "funds_in_escrow"
      | "third_party_audit";
    unmatchedSurplusRule?:
      | "return_to_donors"
      | "donate_to_compromise_destination"
      | "donate_to_original_cause"
      | "split_evenly";
  };
}

export interface ReviewedMarketplaceSeedTemplate {
  id: string;
  format: SeedTemplateFormat;
  formatLabel: string;
  reviewDecisionId: string;
  reviewStatus: "admin_reviewed";
  reviewStatusLabel: string;
  reviewSummary: string;
  environment: "seed_template";
  environmentLabel: string;
  liveMetricEligible: false;
  promotionBehavior: "reviewed_template_only";
  promotionControlLabel: string;
  templateHref: string;
  publicSummary: string;
  prefill: ReviewedMarketplaceSeedTemplatePrefill;
}

export interface PublicReviewedSeedTemplateSummary {
  id: string;
  title: string;
  format: SeedTemplateFormat;
  formatLabel: string;
  reviewStatus: "admin_reviewed";
  environment: "seed_template";
  liveMetricEligible: false;
  promotionBehavior: "reviewed_template_only";
  href: string;
  summary: string;
}

export const REVIEWED_MARKETPLACE_SEED_TEMPLATES = [
  {
    id: "pure-opposed-cause",
    format: "donation_offset",
    formatLabel: "Donation offset",
    reviewDecisionId: "seed-template-review:offset-direct-2026-06",
    reviewStatus: "admin_reviewed",
    reviewStatusLabel: "Admin-reviewed seed template",
    reviewSummary:
      "Approved only as a preview template for genuine baseline opposed donations, receipts, and manual review.",
    environment: "seed_template",
    environmentLabel: "Seed template, not live liquidity",
    liveMetricEligible: false,
    promotionBehavior: "reviewed_template_only",
    promotionControlLabel: "Promote only after reviewed live-template approval",
    templateHref: "/offers/new?template=pure-opposed-cause",
    publicSummary:
      "Redirect two opposed baseline donations into one reviewed compromise destination.",
    prefill: {
      title: "Direct donation-offset redirect",
      description:
        "A direct opposed-cause offset with baseline evidence, receipt review, and a shared destination.",
      mode: "offset",
      offeredCause: "Democracy",
      requestedCause: "Gun rights",
      compromiseCause: "Global poverty",
      offerAction:
        "I will redirect my planned opposed-cause donation into the named compromise destination if the match clears review.",
      requestAction:
        "The counterparty will redirect their planned opposed-cause donation into the same compromise destination.",
      baselineStatement:
        "Both parties should state a credible no-trade baseline for the opposed donation they would otherwise make.",
      exitCondition:
        "If the match does not clear by the deadline, the unmatched surplus rule controls and the offer remains unresolved until reviewed.",
      notes:
        "Use this for pure opposed-cause trades where two canceling efforts become one shared good. Campaign contribution offsets remain prohibited.",
      offerImpact: "7",
      minCounterpartyImpact: "7",
      verification: "Manual review required",
      duration: "3 months",
      paymentIntervalUnit: "none",
      paymentIntervalValue: "1",
      trustLevel: "4",
      offset: {
        baselineAmountUsd: "1000",
        requestedMatchingAmountUsd: "1000",
        baselineOpposedCause: "Democracy",
        requestedOpposedCause: "Gun rights",
        participationMode: "direct",
        compromiseDestinationId: "givewell-top-charities-fund",
        offsetRatio: "1",
        timeHorizon: "one_off",
        verificationMethod: "receipts_uploaded",
        unmatchedSurplusRule: "donate_to_compromise_destination",
      },
    },
  },
  {
    id: "market-mediated",
    format: "donation_offset",
    formatLabel: "Donation offset",
    reviewDecisionId: "seed-template-review:offset-pool-2026-06",
    reviewStatus: "admin_reviewed",
    reviewStatusLabel: "Admin-reviewed seed template",
    reviewSummary:
      "Approved only as a pooled offset template with threshold, ratio, receipt, and unmatched-surplus review.",
    environment: "seed_template",
    environmentLabel: "Seed template, not live liquidity",
    liveMetricEligible: false,
    promotionBehavior: "reviewed_template_only",
    promotionControlLabel: "Promote only after reviewed live-template approval",
    templateHref: "/offers/new?template=market-mediated",
    publicSummary:
      "Pool opposed donation commitments at a published ratio with an assurance threshold.",
    prefill: {
      title: "Threshold offset pool",
      description:
        "A pooled donation offset with a named threshold, ratio, unmatched-surplus rule, and review gate.",
      mode: "offset",
      offeredCause: "Democracy",
      requestedCause: "Gun rights",
      compromiseCause: "Global poverty",
      offerAction:
        "I will join the clearing pool on my side and redirect the matched amount if the pool reaches its review threshold.",
      requestAction:
        "Counterparties on the other side will join the same clearing layer and redirect matched amounts under the published ratio.",
      baselineStatement:
        "The pool only counts commitments tied to genuine baseline intentions and reviewable external evidence.",
      exitCondition:
        "If the clearing threshold is not reached by the deadline, the pool closes or follows its published unmatched-surplus rule.",
      notes:
        "Use this for market-mediated moral barter: offers, ratios, receipts, and residual unmatched flows should be auditable.",
      offerImpact: "7",
      minCounterpartyImpact: "7",
      verification: "Manual review required",
      duration: "3 months",
      paymentIntervalUnit: "none",
      paymentIntervalValue: "1",
      trustLevel: "4",
      offset: {
        baselineAmountUsd: "500",
        requestedMatchingAmountUsd: "500",
        baselineOpposedCause: "Democracy",
        requestedOpposedCause: "Gun rights",
        participationMode: "pool",
        compromiseDestinationId: "givewell-top-charities-fund",
        offsetRatio: "1",
        timeHorizon: "one_off",
        verificationMethod: "receipts_uploaded",
        unmatchedSurplusRule: "donate_to_compromise_destination",
      },
    },
  },
  {
    id: "reciprocal-mixed",
    format: "pledge_swap",
    formatLabel: "Pledge swap",
    reviewDecisionId: "seed-template-review:pledge-reciprocal-2026-06",
    reviewStatus: "admin_reviewed",
    reviewStatusLabel: "Admin-reviewed seed template",
    reviewSummary:
      "Approved only as a bounded reciprocal pledge template with baseline, evidence, and withdrawal-before-lock fields.",
    environment: "seed_template",
    environmentLabel: "Seed template, not live liquidity",
    liveMetricEligible: false,
    promotionBehavior: "reviewed_template_only",
    promotionControlLabel: "Promote only after reviewed live-template approval",
    templateHref: "/offers/new?template=reciprocal-mixed",
    publicSummary:
      "Trade one bounded action for a counterparty action with matched evidence duties.",
    prefill: {
      title: "30-day reciprocal pledge swap",
      description:
        "A short, reviewable commitment in exchange for a reciprocal action.",
      mode: "pledge",
      offeredCause: "Animal welfare",
      requestedCause: "Global poverty",
      compromiseCause: "Not needed",
      offerAction:
        "I will follow a vegetarian diet for the review period and keep a simple public log of exceptions.",
      requestAction:
        "The counterparty will donate to an evidence-focused global health or poverty charity during the same period.",
      baselineStatement:
        "Without this trade, I would not make this short diet commitment during the next 30 days.",
      exitCondition:
        "Either side can pause before the review period starts; after it starts, missed evidence creates an unresolved record rather than a completed one.",
      notes:
        "This is a voluntary pledge swap. Each side should be free to decline, pause, or renegotiate if the burden becomes materially different from what was stated.",
      offerImpact: "7",
      minCounterpartyImpact: "6",
      verification: "Public pledge",
      duration: "30 days",
      paymentIntervalUnit: "none",
      paymentIntervalValue: "1",
      trustLevel: "3",
    },
  },
  {
    id: "bargained-coordination",
    format: "pledge_swap",
    formatLabel: "Pledge swap",
    reviewDecisionId: "seed-template-review:pledge-coordination-2026-06",
    reviewStatus: "admin_reviewed",
    reviewStatusLabel: "Admin-reviewed seed template",
    reviewSummary:
      "Approved only as a repeated coordination template with schedule, breach, and reconfirmation fields.",
    environment: "seed_template",
    environmentLabel: "Seed template, not live liquidity",
    liveMetricEligible: false,
    promotionBehavior: "reviewed_template_only",
    promotionControlLabel: "Promote only after reviewed live-template approval",
    templateHref: "/offers/new?template=bargained-coordination",
    publicSummary:
      "Use repeated rounds or alternation when a one-shot trade would not clear.",
    prefill: {
      title: "Bargained coordination",
      description:
        "Repeated structure, alternation, or batching makes a blocked deal acceptable.",
      mode: "pledge",
      offeredCause: "Community service",
      requestedCause: "Public health",
      compromiseCause: "Not needed",
      offerAction:
        "I will support project A in the specified rounds if the counterparty supports project B in the paired rounds.",
      requestAction:
        "The counterparty will accept the alternation schedule or repeated-round rule before either side relies on the deal.",
      baselineStatement:
        "A one-shot version is not acceptable to one side; the repeated structure is what makes cooperation feasible.",
      exitCondition:
        "If either party misses a scheduled round or rejects the alternation rule, the remaining rounds pause until both reconfirm.",
      notes:
        "Use this for bargaining, turn-taking, and repeated coordination trades where the average package is better than the default.",
      offerImpact: "7",
      minCounterpartyImpact: "6",
      verification: "Peer witness",
      duration: "3 months",
      paymentIntervalUnit: "month",
      paymentIntervalValue: "1",
      trustLevel: "3",
    },
  },
] as const satisfies readonly ReviewedMarketplaceSeedTemplate[];

export const REVIEWED_MARKETPLACE_SEED_TEMPLATE_COUNT =
  REVIEWED_MARKETPLACE_SEED_TEMPLATES.length;
export const REVIEWED_DONATION_OFFSET_SEED_TEMPLATE_COUNT =
  REVIEWED_MARKETPLACE_SEED_TEMPLATES.filter((template) => template.format === "donation_offset")
    .length;
export const REVIEWED_PLEDGE_SWAP_SEED_TEMPLATE_COUNT =
  REVIEWED_MARKETPLACE_SEED_TEMPLATES.filter((template) => template.format === "pledge_swap").length;

export function getReviewedMarketplaceSeedTemplate(templateId: string | undefined) {
  if (!templateId) {
    return null;
  }

  return REVIEWED_MARKETPLACE_SEED_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function getPublicReviewedSeedTemplateSummaries(): PublicReviewedSeedTemplateSummary[] {
  return REVIEWED_MARKETPLACE_SEED_TEMPLATES.map((template) => ({
    id: template.id,
    title: template.prefill.title,
    format: template.format,
    formatLabel: template.formatLabel,
    reviewStatus: template.reviewStatus,
    environment: template.environment,
    liveMetricEligible: template.liveMetricEligible,
    promotionBehavior: template.promotionBehavior,
    href: template.templateHref,
    summary: template.publicSummary,
  }));
}
