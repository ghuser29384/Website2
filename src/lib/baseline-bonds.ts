import type { RegisteredCharity } from "@/lib/donation-offsets";

export const BASELINE_CREDIBILITY_BOND_COPY =
  "Post a refundable bond to signal that this no-trade baseline is serious. If no one accepts your offset by the deadline, you must submit evidence that you carried out the stated baseline. If approved, the bond is refunded. If not, the bond is forfeited to the preselected public-good destination.";

export const BASELINE_BOND_TOOLTIP =
  "This is a costly signal that the proposer expects to carry out the no-trade baseline if unmatched. It does not prove the counterfactual.";

export const BASELINE_BOND_MIN_CENTS = 1_000;
export const BASELINE_BOND_MAX_CENTS = 25_000;
export const BASELINE_BOND_MAX_BASELINE_SHARE = 0.2;
export const BASELINE_BOND_DEFAULT_CURRENCY = "USD";
export const BASELINE_BOND_APPEAL_WINDOW_DAYS = 7;

export const BASELINE_BOND_STATUS_VALUES = [
  "none",
  "pending_payment",
  "posted",
  "refunded_after_match",
  "evidence_due",
  "evidence_submitted",
  "refunded_after_evidence",
  "forfeited",
  "cancelled_by_review",
] as const;

export type BaselineBondStatus = (typeof BASELINE_BOND_STATUS_VALUES)[number];
export type BaselineBondSafetyAction = "clear" | "pause" | "reject";

export const PLATFORM_OPERATING_ACCOUNT_DESTINATION_IDS = new Set([
  "platform-operating-account",
  "moraltrade-operating-account",
  "moral-trade-operating-account",
]);

export interface BaselineBondValidationInput {
  enabled: boolean;
  amountCents: number;
  currency: string;
  forfeitDestinationId: string;
  forfeitDestination: RegisteredCharity | null;
  evidenceDueAt: string | null;
  evidenceStandard: string;
  offerExpiresAt: string | null;
  baselineAmountCents: number;
  baselineStatement: string;
  offeredAction: string;
  requestedAction: string;
  notes: string;
}

export interface BaselineBondValidation {
  errors: string[];
  pauseReasons: string[];
  rejectReasons: string[];
  safetyAction: BaselineBondSafetyAction;
}

const rejectSafetyPatterns: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /\b(campaign contribution|campaign donation|candidate committee|election donation|pac|super pac|super-pac|political contribution)\b/i,
    reason: "Baseline credibility bonds are not available for political contribution offsets.",
  },
  {
    pattern:
      /\b(illegal|bribe|kickback|fraud|fake receipt|falsif(?:y|ied)|tax evasion|money laundering|sanctioned|stolen|weapon|bomb|poison)\b/i,
    reason: "Baseline credibility bonds are not available for illegal actions or falsified evidence.",
  },
  {
    pattern:
      /\b(threat|threaten|blackmail|extort|coerce|hostage|pay me or|unless you pay|unless.+\b(pay|match|redirect)\b|or i will)\b/i,
    reason: "Baseline credibility bonds are not available for coercive or threat-like baselines.",
  },
  {
    pattern:
      /\b(self[-\s]?harm|suicide|kill myself|hurt myself|overdose|cut myself)\b/i,
    reason: "Baseline credibility bonds are not available for self-harm baselines.",
  },
  {
    pattern:
      /\b(harass|harassment|doxx|dox|stalk|bully|intimidate|target their family)\b/i,
    reason: "Baseline credibility bonds are not available for harassment or intimidation baselines.",
  },
];

const pauseSafetyPatterns: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /\b(just increased|newly increased|created this baseline|made up|mainly to get paid|extract payment|compensat(?:e|ion) me to stop|pay me to stop)\b/i,
    reason:
      "This bond should pause for reviewer scrutiny because the baseline may have been created mainly to extract payment.",
  },
];

export function isPaymentBondsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.PAYMENT_BONDS_ENABLED === "true";
}

export function normalizeBaselineBondCurrency(value: string | null | undefined) {
  const normalized = String(value ?? BASELINE_BOND_DEFAULT_CURRENCY).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : BASELINE_BOND_DEFAULT_CURRENCY;
}

export function normalizeBaselineBondStatus(value: string | null | undefined): BaselineBondStatus {
  return BASELINE_BOND_STATUS_VALUES.includes(value as BaselineBondStatus)
    ? (value as BaselineBondStatus)
    : "none";
}

export function calculatePilotBaselineBondCapCents(baselineAmountCents: number) {
  if (!Number.isFinite(baselineAmountCents) || baselineAmountCents <= 0) {
    return 0;
  }

  return Math.min(
    BASELINE_BOND_MAX_CENTS,
    Math.floor(baselineAmountCents * BASELINE_BOND_MAX_BASELINE_SHARE),
  );
}

export function getBaselineBondEvidenceDueAt(offerExpiresAt: string, daysAfterExpiry = 14) {
  const expiresAt = new Date(offerExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  expiresAt.setUTCDate(expiresAt.getUTCDate() + daysAfterExpiry);
  return expiresAt.toISOString();
}

export function getBaselineBondAppealWindowEndsAt(from: string | Date = new Date()) {
  const start = typeof from === "string" ? new Date(from) : new Date(from);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  start.setUTCDate(start.getUTCDate() + BASELINE_BOND_APPEAL_WINDOW_DAYS);
  return start.toISOString();
}

export function formatBaselineBondAmount(amountCents: number, currency = BASELINE_BOND_DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    currency: normalizeBaselineBondCurrency(currency),
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountCents / 100);
}

export function formatPostedBaselineBondBadge(amountCents: number, currency = BASELINE_BOND_DEFAULT_CURRENCY) {
  return `Bonded baseline: ${formatBaselineBondAmount(amountCents, currency)} posted`;
}

export function isConcreteBaselineBondEvidenceStandard(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.length >= 20 &&
    /\b(receipt|dated|record|statement|public log|attestation|donation|payment|audit|screenshot|confirmation|bank|email|link|letter)\b/.test(
      normalized,
    )
  );
}

export function assessBaselineBondSafety(input: {
  baselineStatement: string;
  evidenceStandard: string;
  offeredAction: string;
  requestedAction: string;
  notes: string;
}) {
  const text = [
    input.baselineStatement,
    input.evidenceStandard,
    input.offeredAction,
    input.requestedAction,
    input.notes,
  ].join("\n");
  const rejectReasons = rejectSafetyPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.reason);
  const pauseReasons = rejectReasons.length
    ? []
    : pauseSafetyPatterns.filter((entry) => entry.pattern.test(text)).map((entry) => entry.reason);

  return {
    pauseReasons,
    rejectReasons,
    safetyAction: rejectReasons.length ? "reject" : pauseReasons.length ? "pause" : "clear",
  } satisfies Pick<BaselineBondValidation, "pauseReasons" | "rejectReasons" | "safetyAction">;
}

export function validateBaselineBondInput(input: BaselineBondValidationInput): BaselineBondValidation {
  if (!input.enabled) {
    return {
      errors: [],
      pauseReasons: [],
      rejectReasons: [],
      safetyAction: "clear",
    };
  }

  const errors: string[] = [];

  if (!input.offerExpiresAt) {
    errors.push("Choose an offer expiry date before enabling a baseline credibility bond.");
  }

  if (!input.evidenceDueAt) {
    errors.push("Choose when baseline credibility bond evidence will be due.");
  }

  if (input.offerExpiresAt && input.evidenceDueAt) {
    const offerExpiryMs = Date.parse(input.offerExpiresAt);
    const evidenceDueMs = Date.parse(input.evidenceDueAt);

    if (!Number.isFinite(offerExpiryMs)) {
      errors.push("Offer expiry date must be valid before enabling a baseline credibility bond.");
    }

    if (!Number.isFinite(evidenceDueMs)) {
      errors.push("Baseline credibility bond evidence due date must be valid.");
    } else if (Number.isFinite(offerExpiryMs) && evidenceDueMs <= offerExpiryMs) {
      errors.push("Baseline credibility bond evidence must be due after the offer expiry date.");
    }
  }

  if (!isConcreteBaselineBondEvidenceStandard(input.evidenceStandard)) {
    errors.push("Add a concrete evidence standard for the baseline credibility bond.");
  }

  const pilotCapCents = calculatePilotBaselineBondCapCents(input.baselineAmountCents);

  if (pilotCapCents < BASELINE_BOND_MIN_CENTS) {
    errors.push("The stated baseline amount is too small for the $10 minimum pilot bond.");
  } else if (input.amountCents < BASELINE_BOND_MIN_CENTS) {
    errors.push("Baseline credibility bond amount must be at least $10.");
  } else if (input.amountCents > pilotCapCents) {
    errors.push(
      `Baseline credibility bond amount must be no more than ${formatBaselineBondAmount(
        pilotCapCents,
        input.currency,
      )} for this pilot.`,
    );
  }

  if (normalizeBaselineBondCurrency(input.currency) !== BASELINE_BOND_DEFAULT_CURRENCY) {
    errors.push("The pilot baseline credibility bond currency must be USD.");
  }

  if (!input.forfeitDestinationId) {
    errors.push("Choose a public-good destination for forfeited baseline credibility bonds.");
  }

  if (PLATFORM_OPERATING_ACCOUNT_DESTINATION_IDS.has(input.forfeitDestinationId)) {
    errors.push("The forfeit destination cannot be the platform operating account.");
  }

  if (!input.forfeitDestination || !input.forfeitDestination.isActive) {
    errors.push("Choose an active public-good destination for forfeited baseline credibility bonds.");
  } else {
    if (input.forfeitDestination.isPoliticalCampaign) {
      errors.push("Baseline credibility bond forfeits cannot route to political campaign destinations.");
    }

    if (!input.forfeitDestination.isMoralPublicGood) {
      errors.push("Choose a public-good destination for forfeited baseline credibility bonds.");
    }
  }

  const safety = assessBaselineBondSafety(input);

  return {
    errors: [...errors, ...safety.rejectReasons],
    pauseReasons: safety.pauseReasons,
    rejectReasons: safety.rejectReasons,
    safetyAction: safety.safetyAction,
  };
}

export function canCollectBaselineBondPayment({
  paymentBondsEnabled,
  reviewerApproved,
  status,
}: {
  paymentBondsEnabled: boolean;
  reviewerApproved: boolean;
  status: BaselineBondStatus;
}) {
  return paymentBondsEnabled && reviewerApproved && status === "pending_payment";
}

export function getBaselineBondStatusAfterAccepted({
  offerExpiresAt,
  status,
  now = new Date(),
}: {
  offerExpiresAt: string | null;
  status: BaselineBondStatus;
  now?: Date;
}) {
  if (status !== "posted" || !offerExpiresAt) {
    return status;
  }

  const expiresAtMs = Date.parse(offerExpiresAt);

  if (!Number.isFinite(expiresAtMs) || now.getTime() > expiresAtMs) {
    return status;
  }

  return "refunded_after_match" satisfies BaselineBondStatus;
}

export function shouldOpenBaselineBondEvidence({
  offerStatus,
  offerExpiresAt,
  status,
  now = new Date(),
}: {
  offerStatus: string;
  offerExpiresAt: string | null;
  status: BaselineBondStatus;
  now?: Date;
}) {
  if (status !== "posted" || offerStatus === "matched" || !offerExpiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(offerExpiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs <= now.getTime();
}
