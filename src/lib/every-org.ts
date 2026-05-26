export interface EveryOrgDonationTarget {
  id: string;
  title: string;
  causeAreas: readonly string[];
  aliases: readonly string[];
  nonprofitSlug: string;
  fundraiserSlug?: string;
  summary: string;
  note?: string;
  defaultDonationAmount?: number;
  suggestedAmounts?: readonly number[];
}

function normalizeCause(value: string) {
  return value.trim().toLowerCase();
}

export const EVERY_ORG_CURATED_TARGETS: readonly EveryOrgDonationTarget[] = [
  {
    id: "animal-welfare",
    title: "ACE Recommended Charity Fund",
    causeAreas: ["Animal welfare"],
    aliases: ["animal welfare", "animals", "farmed animals", "wild animal welfare"],
    nonprofitSlug: "animalcharityevaluators",
    fundraiserSlug: "recommended-charity-c87e",
    summary:
      "A single fund supporting Animal Charity Evaluators' recommended charities for neglected animals.",
    note:
      "This route fits donors who want a single Every.org path for evidence-led animal advocacy giving.",
    defaultDonationAmount: 50,
    suggestedAmounts: [25, 50, 150],
  },
  {
    id: "global-poverty",
    title: "GiveWell Top Charities Fund",
    causeAreas: ["Global poverty", "Public health"],
    aliases: ["global poverty", "poverty", "public health", "global health", "health"],
    nonprofitSlug: "givewell-top-charities-fund",
    summary:
      "Supports the highest-priority funding needs among GiveWell's top charities.",
    note:
      "This is the clearest configured route on the site for global poverty and public-health-focused donors.",
    defaultDonationAmount: 100,
    suggestedAmounts: [25, 100, 250],
  },
  {
    id: "climate",
    title: "Founders Pledge: Climate Fund",
    causeAreas: ["Climate"],
    aliases: ["climate", "climate change", "climate resilience", "clean energy"],
    nonprofitSlug: "climate.fund",
    summary:
      "Supports evidence-based climate, air-pollution, and energy-poverty solutions through Founders Pledge's fund.",
    note:
      "This is a broad climate route rather than a claim about one uniquely best intervention.",
    defaultDonationAmount: 75,
    suggestedAmounts: [25, 75, 200],
  },
  {
    id: "long-term-future",
    title: "EA Long-Term Future Fund",
    causeAreas: ["Existential risk", "Future flourishing"],
    aliases: [
      "existential risk",
      "future flourishing",
      "long-term future",
      "longtermism",
      "x-risk",
      "xrisk",
      "ai risk",
      "global catastrophic risk",
    ],
    nonprofitSlug: "ea-long-term-future-fund",
    summary:
      "Funds projects that aim to improve the long-term future, including work on AI and engineered pandemics.",
    note:
      "On Moral Trade, this is the closest verified Every.org route for longtermist and existential-risk giving.",
    defaultDonationAmount: 75,
    suggestedAmounts: [25, 75, 200],
  },
] as const;

export const EVERY_ORG_UNCURATED_CAUSES = [
  "Moral status of digital minds",
  "Extreme power concentration",
  "S-risks",
  "Democracy",
  "Civil liberties",
  "Scientific progress",
] as const;

function addMoralTradeAttribution(href: string, target: EveryOrgDonationTarget) {
  const [base, hash] = href.split("#");
  const url = new URL(base);
  url.searchParams.set("utm_source", "moraltrade");
  url.searchParams.set("utm_medium", "donation_route");
  url.searchParams.set("utm_campaign", "curated_donation");
  url.searchParams.set("mt_target", target.id);

  return hash ? `${url.toString()}#${hash}` : url.toString();
}

export function getEveryOrgDonationHref(target: EveryOrgDonationTarget) {
  if (target.fundraiserSlug) {
    return addMoralTradeAttribution(
      `https://www.every.org/${target.nonprofitSlug}/f/${target.fundraiserSlug}#/donate`,
      target,
    );
  }

  return addMoralTradeAttribution(`https://www.every.org/${target.nonprofitSlug}#/donate`, target);
}

export function getEveryOrgLearnMoreHref(target: EveryOrgDonationTarget) {
  if (target.fundraiserSlug) {
    return addMoralTradeAttribution(
      `https://www.every.org/${target.nonprofitSlug}/f/${target.fundraiserSlug}`,
      target,
    );
  }

  return addMoralTradeAttribution(`https://www.every.org/${target.nonprofitSlug}`, target);
}

export function findEveryOrgTargetForCauseArea(causeArea: string | null | undefined) {
  if (!causeArea) {
    return null;
  }

  const normalizedCause = normalizeCause(causeArea);

  return (
    EVERY_ORG_CURATED_TARGETS.find((target) =>
      target.aliases.some((alias) => normalizedCause.includes(normalizeCause(alias))),
    ) ?? null
  );
}
