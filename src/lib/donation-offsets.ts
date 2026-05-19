export type DonationOffsetTimeHorizon = "one_off" | "recurring";
export type DonationOffsetParticipationMode = "direct" | "pool";
export type DonationOffsetPoolSide = "side_a" | "side_b";
export type DonationOffsetVerificationMethod =
  | "proof_of_past_donations"
  | "receipts_uploaded"
  | "funds_in_escrow"
  | "third_party_audit";
export type DonationOffsetUnmatchedSurplusRule =
  | "return_to_donors"
  | "donate_to_compromise_destination"
  | "donate_to_original_cause"
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
  isMoralPublicGood: boolean;
  consensusLabel: string;
  sortOrder: number;
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
  participationMode: DonationOffsetParticipationMode;
  poolId: string;
  poolName: string;
  poolSide: DonationOffsetPoolSide | "";
  assuranceMinimumUsd: number | null;
  poolMaximumCapUsd: number | null;
  assuranceDeadline: string;
  description: string;
  evidenceUrl: string;
}

export interface DonationOffsetSubmissionGuards {
  participationMode: DonationOffsetParticipationMode;
  antiThreatCertification: boolean;
  verificationMetadataAcknowledged: boolean;
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

export interface DonationOffsetPoolProgress {
  sideATotalUsd: number;
  sideBTotalUsd: number;
  matchedSideAUsd: number;
  matchedSideBUsd: number;
  matchedCompromiseUsd: number;
  unmatchedSideAUsd: number;
  unmatchedSideBUsd: number;
  assuranceMinimumUsd: number;
  assuranceProgressPct: number;
  assuranceReached: boolean;
  status: "open" | "assurance_pending" | "assurance_met" | "closed";
}

export interface DonationOffsetModerationAssessment {
  status: DonationOffsetModerationStatus;
  reasons: string[];
}

const blockedOffsetPatterns: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /\b(threat|threaten|blackmail|extort|coerce|hostage|unless[\s\S]{0,40}\b(pay|agree|match|redirect)\b|i will donate to|or i will donate to)\b/i,
    label: "The offer reads like a threat or extortion attempt rather than a moral trade.",
  },
  {
    pattern:
      /\b(campaign contribution|super pac|super-pac|pac|candidate committee|election donation|campaign donation)\b/i,
    label: "Political campaign offsets are not allowed on Moral Trade.",
  },
  {
    pattern: /\b(kill|murder|assault|terror|bomb|poison|weaponize)\b/i,
    label: "Offers involving violence or deliberate harm are not allowed.",
  },
];

export const REGISTERED_CHARITIES: readonly RegisteredCharity[] = [
  {
    id: "givewell-top-charities-fund",
    name: "GiveWell Top Charities Fund",
    causeArea: "Global poverty",
    websiteUrl: "https://www.every.org/givewell-top-charities-fund",
    summary:
      "A broadly legible anti-poverty and global-health destination for donors who want a compromise charity many moral views can endorse.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Global health and anti-poverty",
    sortOrder: 10,
  },
  {
    id: "direct-relief",
    name: "Direct Relief",
    causeArea: "Public health",
    websiteUrl: "https://www.directrelief.org/",
    summary:
      "A widely recognisable public-health charity for offsets that need a simple, high-trust compromise destination.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Emergency public health",
    sortOrder: 20,
  },
  {
    id: "founders-pledge-climate-fund",
    name: "Founders Pledge Climate Fund",
    causeArea: "Climate",
    websiteUrl: "https://www.every.org/climate.fund",
    summary:
      "A climate compromise destination suitable when both sides value broad reductions in climate risk or pollution harms.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Climate and air quality",
    sortOrder: 30,
  },
  {
    id: "animal-charity-evaluators-fund",
    name: "ACE Recommended Charity Fund",
    causeArea: "Animal welfare",
    websiteUrl: "https://www.every.org/animalcharityevaluators/f/recommended-charity-c87e",
    summary:
      "A fund for neglected-animal interventions when both sides can agree that avoiding zero-sum advocacy is better than opposed spending.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Animal welfare",
    sortOrder: 40,
  },
  {
    id: "ea-long-term-future-fund",
    name: "EA Long-Term Future Fund",
    causeArea: "Future flourishing",
    websiteUrl: "https://www.every.org/ea-long-term-future-fund",
    summary:
      "A long-run future destination covering existential risk and broadly shared future-flourishing concerns.",
    isActive: true,
    isPoliticalCampaign: false,
    selectable: true,
    isMoralPublicGood: true,
    consensusLabel: "Future flourishing",
    sortOrder: 50,
  },
  {
    id: "campaign-example-prohibited",
    name: "Illustrative political campaign committee",
    causeArea: "Political campaign",
    websiteUrl: "https://example.invalid/campaign",
    summary:
      "A prohibited example used to ensure the platform rejects campaign-offset attempts.",
    isActive: false,
    isPoliticalCampaign: true,
    selectable: false,
    isMoralPublicGood: false,
    consensusLabel: "Prohibited",
    sortOrder: 999,
  },
] as const;

export const DONATION_OFFSET_TIME_HORIZON_OPTIONS: Array<{
  value: DonationOffsetTimeHorizon;
  label: string;
}> = [
  { value: "one_off", label: "One-off" },
  { value: "recurring", label: "Recurring" },
];

export const DONATION_OFFSET_PARTICIPATION_MODE_OPTIONS: Array<{
  value: DonationOffsetParticipationMode;
  label: string;
  description: string;
}> = [
  {
    value: "direct",
    label: "Direct match",
    description: "Use this for one-to-one offsets where a single counterparty matches the offer.",
  },
  {
    value: "pool",
    label: "Offset pool",
    description:
      "Use this when multiple donors on each side should aggregate into one larger offset with assurance thresholds.",
  },
];

export const DONATION_OFFSET_POOL_SIDE_OPTIONS: Array<{
  value: DonationOffsetPoolSide;
  label: string;
}> = [
  { value: "side_a", label: "Side A" },
  { value: "side_b", label: "Side B" },
];

export const DONATION_OFFSET_VERIFICATION_OPTIONS: Array<{
  value: DonationOffsetVerificationMethod;
  label: string;
}> = [
  { value: "proof_of_past_donations", label: "Proof of past donations" },
  { value: "funds_in_escrow", label: "Third-party payment; not legal escrow" },
  { value: "third_party_audit", label: "Third-party audit" },
];

export const DONATION_OFFSET_UNMATCHED_RULE_OPTIONS: Array<{
  value: DonationOffsetUnmatchedSurplusRule;
  label: string;
}> = [
  { value: "return_to_donors", label: "Return to donor" },
  {
    value: "donate_to_compromise_destination",
    label: "Donate to compromise destination",
  },
  { value: "donate_to_original_cause", label: "Donate to original cause" },
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
    verificationMethod: "proof_of_past_donations",
    unmatchedSurplusRule: "donate_to_compromise_destination",
    participationMode: "direct",
    poolId: "",
    poolName: "",
    poolSide: "",
    assuranceMinimumUsd: null,
    poolMaximumCapUsd: 10_000,
    assuranceDeadline: "",
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

export function normalizeUsdThreshold(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return null;
  }

  const numeric = Number(value);
  return numeric >= 0 ? Number(numeric.toFixed(2)) : null;
}

export function findRegisteredCharityById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return REGISTERED_CHARITIES.find((charity) => charity.id === id) ?? null;
}

export function getSelectableRegisteredCharities() {
  return [...REGISTERED_CHARITIES]
    .filter((charity) => charity.selectable && charity.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function getConsensusCharities() {
  return getSelectableRegisteredCharities().filter((charity) => charity.isMoralPublicGood);
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

export function formatDonationOffsetParticipationMode(value: DonationOffsetParticipationMode) {
  return value === "pool" ? "Offset pool" : "Direct match";
}

export function formatDonationOffsetPoolSide(
  value: DonationOffsetPoolSide | "",
  labels?: { sideALabel?: string | null; sideBLabel?: string | null },
) {
  if (value === "side_a") {
    return labels?.sideALabel || "Side A";
  }

  if (value === "side_b") {
    return labels?.sideBLabel || "Side B";
  }

  return "Not assigned";
}

export function formatDonationOffsetVerificationMethod(value: DonationOffsetVerificationMethod) {
  switch (value) {
    case "funds_in_escrow":
      return "Third-party payment; not legal escrow";
    case "third_party_audit":
      return "Third-party audit";
    case "proof_of_past_donations":
    case "receipts_uploaded":
    default:
      return "Proof of past donations";
  }
}

export function formatDonationOffsetUnmatchedRule(value: DonationOffsetUnmatchedSurplusRule) {
  switch (value) {
    case "donate_to_compromise_destination":
      return "Any unmatched remainder goes to the compromise destination.";
    case "donate_to_original_cause":
      return "Any unmatched remainder returns to its original cause rather than the compromise fund.";
    case "split_evenly":
      return "Any unmatched remainder is split evenly between the donors.";
    default:
      return "Any unmatched remainder returns to the original donors.";
  }
}

export function getDonationOffsetComplexityWarnings(fields: DonationOffsetFields) {
  const warnings: string[] = [];

  if (fields.offsetRatio && Math.abs(fields.offsetRatio - 1) > 0.001) {
    warnings.push("Non-1:1 ratios are valid, but they are harder to explain and harder to match.");
  }

  if (fields.participationMode === "pool") {
    warnings.push(
      "Pool offsets need especially clear side labels, surplus rules, and verification because multiple donors rely on the same structure.",
    );
  }

  if (fields.timeHorizon === "recurring") {
    warnings.push(
      "Recurring offsets need a stable check-in rhythm and a clear stop rule so donors know how long the arrangement lasts.",
    );
  }

  return warnings;
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
  const unmatchedBaselineUsd = Number(
    Math.max(0, baselineAmountUsd - matchedBaselineUsd).toFixed(2),
  );
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

export function calculateDonationOffsetPoolProgress({
  sideATotalUsd,
  sideBTotalUsd,
  offsetRatio,
  assuranceMinimumUsd,
  deadlineAt,
  now = new Date(),
}: {
  sideATotalUsd: number;
  sideBTotalUsd: number;
  offsetRatio: number | null | undefined;
  assuranceMinimumUsd: number | null | undefined;
  deadlineAt?: string | null;
  now?: Date;
}): DonationOffsetPoolProgress {
  const preview = calculateDonationOffsetPreview({
    baselineAmountUsd: normalizeUsdThreshold(sideATotalUsd) ?? 0,
    requestedMatchingAmountUsd: normalizeUsdThreshold(sideBTotalUsd) ?? 0,
    offsetRatio: offsetRatio ?? 1,
    unmatchedSurplusRule: "donate_to_compromise_destination",
  });
  const assuranceTarget = normalizeUsdThreshold(assuranceMinimumUsd) ?? 0;
  const assuranceProgressPct =
    assuranceTarget > 0
      ? Math.min(100, Math.round((preview.compromiseTotalUsd / assuranceTarget) * 100))
      : preview.compromiseTotalUsd > 0
        ? 100
        : 0;
  const deadlinePassed = Boolean(deadlineAt && new Date(deadlineAt).getTime() < now.getTime());
  const assuranceReached = assuranceTarget <= 0 || preview.compromiseTotalUsd >= assuranceTarget;
  const status = deadlinePassed
    ? "closed"
    : assuranceReached
      ? "assurance_met"
      : preview.compromiseTotalUsd > 0
        ? "assurance_pending"
        : "open";

  return {
    sideATotalUsd: normalizeUsdThreshold(sideATotalUsd) ?? 0,
    sideBTotalUsd: normalizeUsdThreshold(sideBTotalUsd) ?? 0,
    matchedSideAUsd: preview.matchedBaselineUsd,
    matchedSideBUsd: preview.matchedCounterpartyUsd,
    matchedCompromiseUsd: preview.compromiseTotalUsd,
    unmatchedSideAUsd: preview.unmatchedBaselineUsd,
    unmatchedSideBUsd: preview.unmatchedCounterpartyUsd,
    assuranceMinimumUsd: assuranceTarget,
    assuranceProgressPct,
    assuranceReached,
    status,
  };
}

export function formatDonationOffsetPoolStatus(value: DonationOffsetPoolProgress["status"]) {
  switch (value) {
    case "assurance_met":
      return "Assurance threshold reached";
    case "assurance_pending":
      return "Gathering matching commitments";
    case "closed":
      return "Deadline closed";
    default:
      return "Open";
  }
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
    !(normalizeUsdAmount(fields.requestedMatchingAmountUsd) &&
      (fields.requestedMatchingAmountUsd ?? 0) > 0)
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

  if (fields.offsetRatio && fields.offsetRatio > 100) {
    errors.push("Offset ratio must be within a rational range.");
  }

  if (fields.participationMode === "pool") {
    if (!fields.poolSide) {
      errors.push("Choose which side of the offset pool you are joining.");
    }

    if (!fields.poolId.trim() && !fields.poolName.trim()) {
      errors.push("Choose an existing pool or name a new offset pool.");
    }

    if (!fields.assuranceDeadline.trim()) {
      errors.push("Pool offsets should include an assurance deadline.");
    } else if (Number.isNaN(Date.parse(fields.assuranceDeadline))) {
      errors.push("Assurance deadline must be a valid date.");
    }

    const assuranceMinimumUsd = normalizeUsdThreshold(fields.assuranceMinimumUsd);
    if (fields.assuranceMinimumUsd === null || assuranceMinimumUsd === null) {
      errors.push("Assurance minimum threshold is required for pooled offsets.");
    }

    const poolMaximumCapUsd = normalizeUsdAmount(fields.poolMaximumCapUsd);
    if (!poolMaximumCapUsd) {
      errors.push("Pool maximum cap must be a positive number.");
    } else if (assuranceMinimumUsd !== null && assuranceMinimumUsd > poolMaximumCapUsd) {
      errors.push("Pool maximum cap must be at least as large as the assurance minimum.");
    }
  }

  if (!fields.description.trim()) {
    errors.push("Add a short description of the offset.");
  }

  return errors;
}

export function validateDonationOffsetSubmissionGuards(
  fields: DonationOffsetSubmissionGuards,
) {
  const errors: string[] = [];

  if (fields.participationMode !== "pool") {
    return errors;
  }

  if (!fields.antiThreatCertification) {
    errors.push(
      "Pooled offsets require anti-threat certification before submission.",
    );
  }

  if (!fields.verificationMetadataAcknowledged || !fields.evidenceUrl.trim()) {
    errors.push(
      "Pooled offsets require verification metadata and a reviewable evidence link before submission.",
    );
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
          fields.poolName,
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
      "No proof of past donation, third-party payment confirmation, or third-party audit link was provided, so the baseline intent is not yet credible enough for public publication.",
    );
  }

  if (fields.participationMode === "pool" && !fields.poolSide) {
    reasons.push("Pool participation must name a side before the offset can be reviewed.");
  }

  if (fields.participationMode === "pool" && !fields.poolId.trim() && !fields.poolName.trim()) {
    reasons.push("Pool participation must either choose an existing pool or create a named pool.");
  }

  if (fields.participationMode === "pool" && !fields.assuranceDeadline.trim()) {
    reasons.push("Pool participation should include an assurance deadline.");
  }

  return {
    status: reasons.length ? "flagged" : "clear",
    reasons,
  };
}
