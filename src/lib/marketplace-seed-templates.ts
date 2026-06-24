import type { OfferMode, PaymentIntervalUnit } from "@/lib/offers";

type SeedTemplateFormat = "donation_offset" | "pledge_swap";

export interface MarketplaceMicroPledgeDefaults {
  defaultDurations: readonly string[];
  coveredFoodPrompt: string;
  adequateSubstitutePrompt: string;
  healthSafetyBoundary: string;
  selfAttestationLadder: readonly string[];
  perUnitAmountBand: string;
  cumulativeSequenceCap: string;
  prePerformanceLockRequired: true;
  noAutoRollover: true;
  longerDurationHandling: string;
  publicReceiptDefault: "private_by_default_opt_in_card";
}

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
  microPledgeDefaults?: MarketplaceMicroPledgeDefaults;
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
  microPledgeDefaults?: MarketplaceMicroPledgeDefaults;
}

export const FOOD_ABSTENTION_MICRO_PLEDGE_DEFAULTS = {
  defaultDurations: ["One meal", "A few meals", "One day", "A few days"],
  coveredFoodPrompt:
    "State the covered food or meal context before lock; broad diet categories require manual review.",
  adequateSubstitutePrompt:
    "Name an adequate substitute or opt-out before the pledge starts so the action is not hunger, medical risk, or pressure.",
  healthSafetyBoundary:
    "Block or escalate pledges involving medical risk, eating-disorder risk, underage participants, coercion, or unavailable substitutes.",
  selfAttestationLadder: [
    "Private self-attestation",
    "Timestamped private note",
    "Optional receipt or meal photo",
    "Optional witness attestation",
  ],
  perUnitAmountBand: "$1-$25 per meal or $5-$75 per day unless a reviewer approves a higher cap.",
  cumulativeSequenceCap:
    "Cap repeated micro-pledges before a new manual review; no sequence can silently become a 30-day pledge.",
  prePerformanceLockRequired: true,
  noAutoRollover: true,
  longerDurationHandling:
    "Thirty-day or longer abstention pledges are manual exceptions, not marketplace defaults.",
  publicReceiptDefault: "private_by_default_opt_in_card",
} as const satisfies MarketplaceMicroPledgeDefaults;

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
      "Trade one short food-abstention micro-pledge for a bounded counterparty action with matched evidence duties.",
    microPledgeDefaults: FOOD_ABSTENTION_MICRO_PLEDGE_DEFAULTS,
    prefill: {
      title: "One-meal food-abstention pledge swap",
      description:
        "A short, reviewable food-abstention commitment in exchange for a reciprocal action.",
      mode: "pledge",
      offeredCause: "Animal welfare",
      requestedCause: "Global poverty",
      compromiseCause: "Not needed",
      offerAction:
        "I will skip one covered animal-product meal after naming the meal context and an adequate substitute before lock.",
      requestAction:
        "The counterparty will make the bounded donation or pledge stated in the final preview after both sides lock terms.",
      baselineStatement:
        "Without this trade, I would eat the covered meal normally and would not make this specific micro-pledge on this date.",
      exitCondition:
        "Either side can pause before the pre-performance lock. After lock, missed self-attestation creates an unresolved record rather than a completed one.",
      notes:
        "Default to one meal, a few meals, one day, or a few days. Name covered food, adequate substitutes, health boundaries, self-attestation level, per-unit cap, and no auto rollover before relying on the pledge. Public receipt cards are private by default and opt-in only.",
      offerImpact: "7",
      minCounterpartyImpact: "6",
      verification: "Public pledge",
      duration: "One meal",
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
      "Use a few-day micro-pledge sequence when a one-shot pledge would not clear.",
    microPledgeDefaults: FOOD_ABSTENTION_MICRO_PLEDGE_DEFAULTS,
    prefill: {
      title: "Few-day reciprocal micro-pledge sequence",
      description:
        "A capped few-day sequence with pre-performance locks, explicit substitutes, and no automatic rollover.",
      mode: "pledge",
      offeredCause: "Animal welfare",
      requestedCause: "Public health",
      compromiseCause: "Not needed",
      offerAction:
        "I will complete a few-day covered-food abstention sequence only after each day has a named substitute and lock confirmation.",
      requestAction:
        "The counterparty will complete the paired bounded action only for locked days that clear the self-attestation and safety checks.",
      baselineStatement:
        "Without this trade, I would not make this specific few-day abstention sequence and would not publicly claim the action.",
      exitCondition:
        "If either party misses attestation, hits a safety boundary, or rejects a day-specific lock, remaining days pause until both reconfirm.",
      notes:
        "Use this for short food-abstention sequences only. Record unit baseline, covered food, substitute, self-attestation ladder, per-unit amount band, sequence cap, and public receipt opt-in status. Thirty-day or longer pledges require manual exception review.",
      offerImpact: "7",
      minCounterpartyImpact: "6",
      verification: "Peer witness",
      duration: "A few days",
      paymentIntervalUnit: "day",
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
    microPledgeDefaults:
      "microPledgeDefaults" in template ? template.microPledgeDefaults : undefined,
  }));
}
