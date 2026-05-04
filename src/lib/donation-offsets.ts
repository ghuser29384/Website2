export type DonationOffsetTimeHorizon = "one_off" | "recurring";
export type DonationOffsetVerificationMethod =
  | "receipts_uploaded"
  | "funds_in_escrow"
  | "third_party_audit";
export type DonationOffsetUnmatchedSurplusRule =
  | "return_to_donors"
  | "donate_to_compromise_destination"
  | "split_evenly";
export type DonationOffsetModerationStatus = "clear" | "flagged" | "blocked";

export interface RegisteredCharity {
  id: string;
  name: string;
  causeArea: string;
  websiteUrl: string;
  summary: string;
  isActive: boolean;
  isPoliticalCampaign: boolean;
  selectable: boolean;
}

export interface DonationOffsetFields {
  baselineAmountUsd: number | null;
  baselineOpposedCause: string;
  requestedMatchingAmountUsd: number | null;
  requestedOpposedCause: string;
  compromiseDestinationId: string;
  offsetRatio: number | null;
  timeHorizon: DonationOffsetTimeHorizon;
  verificationMethod: DonationOffsetVerificationMethod;
  unmatchedSurplusRule: DonationOffsetUnmatchedSurplusRule;
  description: string;
  evidenceUrl: string;
}

export interface DonationOffsetPreview {
  matchedBaselineUsd: number;
  matchedCounterpartyUsd: number;
  compromiseTotalUsd: number;
  unmatchedBaselineUsd: number;
  unmatchedCounterpartyUsd: number;
  unmatchedRuleLabel: string;
}

export interface DonationOffsetModerationAssessment {
  status: DonationOffsetModerationStatus;
  reasons: string[];
}

const blockedOffsetPatterns: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /\b(threat|threaten|blackmail|extort|coerce|hostage|unless[\s\S]{0,40}\b(pay|agree|match)\b|i will donate to)\b/i,
    label: "The description reads like a threat or extortion attempt.",
  },
  {
    pattern: /\b(campaign contribution|super pac|super-pac|pac|candidate committee)\b/i,
    label: "Political campaign offsets are not allowed on Moral Trade.",
  },
  {
    pattern: /\b(kill|murder|assault|terror|bomb|poison|weaponize)\b/i,
    label: "Offers involving violence or harm are not allowed.",
  },
];

export const REGISTERED_CHARITIES: readonly RegisteredCharity[] = [
  {
    id: "givewell-top-charities-fund",
    name: "GiveWell Top Charities Fund",
    causeArea: "Global poverty",
    websiteUrl: "https://www.every.org/givewell-top-charities-fund",
    summary: "A broad compromise destination for donors who want a GiveWell-routed global poverty fund.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
  },
  {
    id: "animal-charity-evaluators-fund",
    name: "ACE Recommended Charity Fund",
    causeArea: "Animal welfare",
    websiteUrl: "https://www.every.org/animalcharityevaluators/f/recommended-charity-c87e",
    summary: "A compromise destination routed through Animal Charity Evaluators' recommended fund.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
  },
  {
    id: "founders-pledge-climate-fund",
    name: "Founders Pledge: Climate Fund",
    causeArea: "Climate",
    websiteUrl: "https://www.every.org/climate.fund",
    summary: "A broad climate compromise destination for cases where both sides prefer redirected giving to cancelled-out advocacy.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
  },
  {
    id: "ea-long-term-future-fund",
    name: "EA Long-Term Future Fund",
    causeArea: "Future flourishing",
    websiteUrl: "https://www.every.org/ea-long-term-future-fund",
    summary: "A longtermist compromise destination covering existential risk and long-run future concerns.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
  },
  {
    id: "direct-relief",
    name: "Direct Relief",
    causeArea: "Public health",
    websiteUrl: "https://www.directrelief.org/",
    summary: "A registered public-health charity for donors who want a simpler, legible compromise destination.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
  },
  {
    id: "campaign-example-prohibited",
    name: "Illustrative political campaign committee",
    causeArea: "Political campaign",
    websiteUrl: "https://example.invalid/campaign",
    summary: "A prohibited example used to ensure the platform rejects campaign-offset attempts.",
    isActive: false,
    isPoliticalCampaign: true,
    selectable: false,
  },
] as const;

export const DONATION_OFFSET_TIME_HORIZON_OPTIONS: Array<{
  value: DonationOffsetTimeHorizon;
  label: string;
}> = [
  { value: "one_off", label: "One-off" },
  { value: "recurring", label: "Recurring" },
];

export const DONATION_OFFSET_VERIFICATION_OPTIONS: Array<{
  value: DonationOffsetVerificationMethod;
  label: string;
}> = [
  { value: "receipts_uploaded", label: "Receipts uploaded" },
  { value: "funds_in_escrow", label: "Funds in escrow" },
  { value: "third_party_audit", label: "Third-party audit" },
];

export const DONATION_OFFSET_UNMATCHED_RULE_OPTIONS: Array<{
  value: DonationOffsetUnmatchedSurplusRule;
  label: string;
}> = [
  { value: "return_to_donors", label: "Return to donors" },
  { value: "donate_to_compromise_destination", label: "Donate to compromise destination" },
  { value: "split_evenly", label: "Split evenly" },
];

export function createDefaultDonationOffsetFields(): DonationOffsetFields {
  return {
    baselineAmountUsd: 1000,
    baselineOpposedCause: "Gun rights",
    requestedMatchingAmountUsd: 1000,
    requestedOpposedCause: "Gun control",
    compromiseDestinationId: "givewell-top-charities-fund",
    offsetRatio: 1,
    timeHorizon: "one_off",
    verificationMethod: "receipts_uploaded",
    unmatchedSurplusRule: "donate_to_compromise_destination",
    description: "",
    evidenceUrl: "",
  };
}

export function normalizeUsdAmount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return null;
  }

  const numeric = Number(value);
  return numeric > 0 ? Number(numeric.toFixed(2)) : null;
}

export function findRegisteredCharityById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return REGISTERED_CHARITIES.find((charity) => charity.id === id) ?? null;
}

export function getSelectableRegisteredCharities() {
  return REGISTERED_CHARITIES.filter((charity) => charity.selectable && charity.isActive);
}

export function formatDonationOffsetRatio(value: number | null | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return "1:1";
  }

  return `1:${Number(value.toFixed(2)).toString()}`;
}

export function formatDonationOffsetTimeHorizon(value: DonationOffsetTimeHorizon) {
  return value === "recurring" ? "Recurring" : "One-off";
}

export function formatDonationOffsetVerificationMethod(value: DonationOffsetVerificationMethod) {
  switch (value) {
    case "funds_in_escrow":
      return "Funds in escrow";
    case "third_party_audit":
      return "Third-party audit";
    default:
      return "Receipts uploaded";
  }
}

export function formatDonationOffsetUnmatchedRule(value: DonationOffsetUnmatchedSurplusRule) {
  switch (value) {
    case "donate_to_compromise_destination":
      return "Unmatched money goes to the compromise destination.";
    case "split_evenly":
      return "Any unmatched remainder is split evenly between the donors.";
    default:
      return "Any unmatched remainder returns to the original donors.";
  }
}

export function calculateDonationOffsetPreview(
  fields: Pick<
    DonationOffsetFields,
    "baselineAmountUsd" | "requestedMatchingAmountUsd" | "offsetRatio" | "unmatchedSurplusRule"
  >,
): DonationOffsetPreview {
  const baselineAmountUsd = normalizeUsdAmount(fields.baselineAmountUsd) ?? 0;
  const requestedMatchingAmountUsd = normalizeUsdAmount(fields.requestedMatchingAmountUsd) ?? 0;
  const offsetRatio =
    fields.offsetRatio && Number.isFinite(fields.offsetRatio) && fields.offsetRatio > 0
      ? Number(fields.offsetRatio)
      : 1;

  const matchedBaselineUsd = Number(
    Math.min(baselineAmountUsd, requestedMatchingAmountUsd / offsetRatio).toFixed(2),
  );
  const matchedCounterpartyUsd = Number((matchedBaselineUsd * offsetRatio).toFixed(2));
  const compromiseTotalUsd = Number((matchedBaselineUsd + matchedCounterpartyUsd).toFixed(2));
  const unmatchedBaselineUsd = Number(Math.max(0, baselineAmountUsd - matchedBaselineUsd).toFixed(2));
  const unmatchedCounterpartyUsd = Number(
    Math.max(0, requestedMatchingAmountUsd - matchedCounterpartyUsd).toFixed(2),
  );

  return {
    matchedBaselineUsd,
    matchedCounterpartyUsd,
    compromiseTotalUsd,
    unmatchedBaselineUsd,
    unmatchedCounterpartyUsd,
    unmatchedRuleLabel: formatDonationOffsetUnmatchedRule(fields.unmatchedSurplusRule),
  };
}

export function validateDonationOffsetFields(fields: DonationOffsetFields) {
  const errors: string[] = [];

  if (!(normalizeUsdAmount(fields.baselineAmountUsd) && (fields.baselineAmountUsd ?? 0) > 0)) {
    errors.push("Baseline donation amount must be a positive number.");
  }

  if (!fields.baselineOpposedCause.trim()) {
    errors.push("Baseline opposed cause is required.");
  }

  if (
    !(normalizeUsdAmount(fields.requestedMatchingAmountUsd) && (fields.requestedMatchingAmountUsd ?? 0) > 0)
  ) {
    errors.push("Requested matching donation must be a positive number.");
  }

  if (!fields.requestedOpposedCause.trim()) {
    errors.push("Requested opposing cause is required.");
  }

  if (!findRegisteredCharityById(fields.compromiseDestinationId)) {
    errors.push("Choose a valid compromise destination.");
  }

  if (!fields.offsetRatio || !Number.isFinite(fields.offsetRatio) || fields.offsetRatio <= 0) {
    errors.push("Offset ratio must be a positive number.");
  }

  if (!fields.description.trim()) {
    errors.push("Add a short description of the offset.");
  }

  return errors;
}

export function assessDonationOffsetModeration(
  fields: DonationOffsetFields,
  charity = findRegisteredCharityById(fields.compromiseDestinationId),
): DonationOffsetModerationAssessment {
  const reasons: string[] = [];

  if (charity?.isPoliticalCampaign) {
    return {
      status: "blocked",
      reasons: ["Offsets involving political campaign contributions are prohibited."],
    };
  }

  if (!charity || !charity.isActive) {
    return {
      status: "blocked",
      reasons: ["The compromise destination is not an approved registered charity on this platform."],
    };
  }

  for (const blockedPattern of blockedOffsetPatterns) {
    if (
      blockedPattern.pattern.test(
        [
          fields.baselineOpposedCause,
          fields.requestedOpposedCause,
          fields.description,
        ].join("\n"),
      )
    ) {
      return {
        status: "blocked",
        reasons: [blockedPattern.label],
      };
    }
  }

  if (!fields.evidenceUrl.trim()) {
    reasons.push(
      "No receipt, escrow confirmation, or third-party audit link was provided, so the baseline intent is currently unverifiable.",
    );
  }

  return {
    status: reasons.length ? "flagged" : "clear",
    reasons,
  };
}
