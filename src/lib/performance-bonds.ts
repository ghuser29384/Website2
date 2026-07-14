import type { Json } from "@/lib/supabase/database.types";

export const PERFORMANCE_BOND_COPY =
  "Add a refundable bond to make your pledge more credible. The bond is refunded if your evidence is accepted under the agreed evidence standard. If evidence is missing or rejected after review, the bond is released according to the forfeiture rule chosen before acceptance.";

export const PERFORMANCE_BOND_LIMITATION_COPY =
  "This bond helps with factual trust: whether the pledged act was performed. It does not prove what would have happened without the swap, so the no-trade baseline and additionality explanation remain important.";

export const PERFORMANCE_BOND_COUNTERPARTY_WARNING =
  "Counterparty payout can create an incentive to challenge good evidence. Prefer a neutral cause or compromise fund unless there is a specific reason to compensate the counterparty.";

export const PERFORMANCE_BOND_REVIEWER_POLICY =
  "Counterparty may accept or challenge; platform arbitration if disputed";

export const PERFORMANCE_BOND_REFUND_SUMMARY =
  "Evidence accepted under the evidence schema";

export const PERFORMANCE_BOND_DEFAULT_CURRENCY = "USD";
export const PERFORMANCE_BOND_DEFAULT_MIN_CENTS = 500;
export const PERFORMANCE_BOND_DEFAULT_MAX_CENTS = 50_000;
export const PERFORMANCE_BOND_DEFAULT_STALE_PAYMENT_DAYS = 14;
export const PERFORMANCE_BOND_MANUAL_PROVIDER = "manual_review";
export const PERFORMANCE_BOND_MPGF_DESTINATION_ID = "moral-public-goods-fund";

export const PERFORMANCE_BOND_STATUS_VALUES = [
  "not_enabled",
  "draft",
  "awaiting_funding",
  "funded",
  "active",
  "evidence_due",
  "evidence_submitted",
  "challenge_window_open",
  "accepted_by_counterparty",
  "auto_refund_pending",
  "refunded",
  "challenged",
  "under_review",
  "accepted_after_review",
  "rejected_after_review",
  "forfeited",
  "split_disbursed",
  "cancelled",
  "expired",
] as const;

export type PerformanceBondStatus = (typeof PERFORMANCE_BOND_STATUS_VALUES)[number];

export type BondFundingStatus =
  | "not_required"
  | "awaiting_funding"
  | "payment_pending"
  | "funded"
  | "refund_pending"
  | "refunded"
  | "release_pending"
  | "released"
  | "failed";

export const BOND_FUNDING_STATUS_VALUES = [
  "not_required",
  "awaiting_funding",
  "payment_pending",
  "funded",
  "refund_pending",
  "refunded",
  "release_pending",
  "released",
  "failed",
] as const satisfies readonly BondFundingStatus[];

export type PerformanceBondSide = "offerer" | "taker";
export type PerformanceBondVisibility =
  | "counterparty_only"
  | "platform_reviewer_only"
  | "public_proof"
  | "mixed_redacted";
export type PerformanceBondForfeitureDestination =
  | "compromise_charity"
  | "mpgf"
  | "counterparty"
  | "split";
export type PerformanceBondForfeitureRule = "neutral_release" | "counterparty_release" | "split_release";
export type BondLedgerEntryType = "fund" | "refund" | "release" | "split_release" | "adjustment";
export type BondLedgerDestinationType =
  | "party"
  | "counterparty"
  | "compromise_charity"
  | "mpgf"
  | "platform_manual_review";
export type BondActorRole = "party" | "counterparty" | "reviewer" | "system";
export type BondAdjudicationDecision = "accept" | "reject" | "request_more_evidence";

export interface PerformanceBondSplitConfig {
  counterpartyPercent: number;
  neutralCausePercent: number;
  mpgfPercent: number;
}

export interface PerformanceBondEvidenceSchema {
  templateKey: string;
  actionToProve: string;
  acceptedEvidenceTypes: string;
  minimumDetail: string;
  privateEvidenceAllowed: boolean;
  visibility: PerformanceBondVisibility;
  reviewStandard: string;
}

export interface PerformanceBondTemplate {
  key: string;
  label: string;
  schema: PerformanceBondEvidenceSchema;
}

export interface PerformanceBondTermsInput {
  additionalityStatement: string;
  amountCents: number;
  challengeWindowDays: number;
  counterpartyPayoutConsent: boolean;
  currency: string;
  enabled: boolean;
  evidenceDueAt: string | null;
  evidenceSchema: PerformanceBondEvidenceSchema;
  forfeitureDestination: PerformanceBondForfeitureDestination;
  noTradeBaseline: string;
  splitConfig: PerformanceBondSplitConfig;
  swapStartsAt?: string | null;
}

export interface PerformanceBondValidation {
  errors: string[];
  warnings: string[];
}

export interface PerformanceBondRecord {
  id: string;
  offer_id: string;
  swap_id: string | null;
  interest_id?: string | null;
  party_id: string;
  counterparty_id: string | null;
  side: PerformanceBondSide;
  enabled: boolean;
  amount_cents: number;
  currency: string;
  evidence_due_at: string | null;
  challenge_window_days: number;
  evidence_schema: Json;
  additionality_statement: string;
  no_trade_baseline: string;
  forfeiture_rule: PerformanceBondForfeitureRule;
  forfeiture_destination: PerformanceBondForfeitureDestination;
  forfeiture_destination_id: string | null;
  split_config: Json;
  reviewer_policy: string;
  status: PerformanceBondStatus;
  funding_status: BondFundingStatus;
  payment_provider: string;
  payment_intent_id: string | null;
  counterparty_payout_consent: boolean;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
  resolved_at: string | null;
}

export interface BondEvidenceRecord {
  id: string;
  bond_id: string;
  submitted_by: string;
  submitted_at: string;
  evidence_text: string;
  evidence_urls: string[];
  attachments: Json;
  visibility: PerformanceBondVisibility;
  redaction_notes: string;
  attestation: boolean;
  status: string;
}

export interface ForfeitureDistributionEntry {
  amountCents: number;
  currency: string;
  destinationId: string | null;
  destinationType: BondLedgerDestinationType;
  percent: number;
}

export interface PerformanceBondConfig {
  enabled: boolean;
  livePaymentsEnabled: boolean;
  maxAmountCents: number;
  minAmountCents: number;
  stalePaymentPendingDays: number;
}

export const PERFORMANCE_BOND_EVIDENCE_TEMPLATES = [
  {
    key: "donation_proof",
    label: "Donation proof",
    schema: {
      acceptedEvidenceTypes:
        "Receipt screenshot or PDF, charity confirmation email, or public donation record. Transaction/reference ID may be redacted.",
      actionToProve: "The pledged donation was made to the agreed charity or fund.",
      minimumDetail: "Charity name, amount, date, and enough receipt detail for reviewer confidence.",
      privateEvidenceAllowed: true,
      reviewStandard:
        "Evidence must materially match the agreed charity, amount, and timing. Redactions are acceptable when they do not remove the core proof.",
      templateKey: "donation_proof",
      visibility: "mixed_redacted",
    },
  },
  {
    key: "diet_behavior_pledge",
    label: "Diet or behavior pledge",
    schema: {
      acceptedEvidenceTypes:
        "Periodic self-report, optional photo or log, counterparty check-in notes, and explicit honesty attestation.",
      actionToProve: "The agreed diet or behavior pledge was followed during the review period.",
      minimumDetail: "Dates covered, exceptions, check-in cadence, and a materially complete self-report.",
      privateEvidenceAllowed: true,
      reviewStandard:
        "Evidence should be proportionate and non-invasive. Honest reporting of exceptions is acceptable when the agreed standard allows it.",
      templateKey: "diet_behavior_pledge",
      visibility: "counterparty_only",
    },
  },
  {
    key: "volunteer_work_pledge",
    label: "Volunteer or work pledge",
    schema: {
      acceptedEvidenceTypes:
        "Confirmation email, signed note, public event log, or supervisor/contact confirmation where appropriate.",
      actionToProve: "The agreed volunteer, work, or service pledge was completed.",
      minimumDetail: "Hours, date, location or project, and optional supervisor/contact if safe.",
      privateEvidenceAllowed: true,
      reviewStandard:
        "Evidence must show the pledged work happened on the agreed terms without requiring unsafe personal disclosures.",
      templateKey: "volunteer_work_pledge",
      visibility: "mixed_redacted",
    },
  },
  {
    key: "abstention_pledge",
    label: "Abstention pledge",
    schema: {
      acceptedEvidenceTypes:
        "Self-report plus agreed check-in record and explicit honesty attestation. No invasive surveillance.",
      actionToProve: "The pledged abstention was maintained during the agreed period.",
      minimumDetail: "Dates covered, check-in cadence, exceptions if any, and honesty attestation.",
      privateEvidenceAllowed: true,
      reviewStandard:
        "Evidence must be proportionate, non-invasive, and consistent with the agreed check-in process.",
      templateKey: "abstention_pledge",
      visibility: "counterparty_only",
    },
  },
] as const satisfies readonly PerformanceBondTemplate[];

const finalStatuses = new Set<PerformanceBondStatus>([
  "refunded",
  "forfeited",
  "split_disbursed",
  "cancelled",
  "expired",
]);

const allowedTransitions: Record<PerformanceBondStatus, readonly PerformanceBondStatus[]> = {
  accepted_after_review: ["auto_refund_pending", "refunded"],
  accepted_by_counterparty: ["auto_refund_pending", "refunded"],
  active: ["evidence_due", "evidence_submitted", "challenge_window_open", "cancelled", "expired"],
  awaiting_funding: ["funded", "active", "challenge_window_open", "cancelled", "expired"],
  auto_refund_pending: ["refunded"],
  cancelled: [],
  challenged: ["under_review"],
  challenge_window_open: ["accepted_by_counterparty", "auto_refund_pending", "challenged", "under_review"],
  draft: ["awaiting_funding", "active", "cancelled"],
  evidence_due: ["evidence_submitted", "challenge_window_open", "under_review", "expired"],
  evidence_submitted: ["challenge_window_open", "accepted_by_counterparty", "challenged", "under_review"],
  expired: [],
  forfeited: [],
  funded: ["active", "refunded", "cancelled"],
  not_enabled: ["draft"],
  refunded: [],
  rejected_after_review: ["forfeited", "split_disbursed"],
  split_disbursed: [],
  under_review: ["accepted_after_review", "rejected_after_review", "evidence_due", "evidence_submitted"],
};

export function isPledgePerformanceBondsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.ENABLE_PLEDGE_PERFORMANCE_BONDS === "true";
}

export function isLiveBondPaymentsEnabled(env: Record<string, string | undefined> = process.env) {
  return env.ENABLE_LIVE_BOND_PAYMENTS === "true";
}

function readConfigCents(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function getPerformanceBondConfig(
  env: Record<string, string | undefined> = process.env,
): PerformanceBondConfig {
  const minAmountCents = readConfigCents(
    env.PLEDGE_PERFORMANCE_BOND_MIN_CENTS,
    PERFORMANCE_BOND_DEFAULT_MIN_CENTS,
  );
  const configuredMax = readConfigCents(
    env.PLEDGE_PERFORMANCE_BOND_MAX_CENTS,
    PERFORMANCE_BOND_DEFAULT_MAX_CENTS,
  );
  const stalePaymentPendingDays = Math.max(
    1,
    Math.round(Number(env.PLEDGE_PERFORMANCE_BOND_STALE_PAYMENT_DAYS) || PERFORMANCE_BOND_DEFAULT_STALE_PAYMENT_DAYS),
  );

  return {
    enabled: isPledgePerformanceBondsEnabled(env),
    livePaymentsEnabled: isLiveBondPaymentsEnabled(env),
    maxAmountCents: Math.max(minAmountCents, configuredMax),
    minAmountCents,
    stalePaymentPendingDays,
  };
}

export function normalizePerformanceBondCurrency(value: string | null | undefined) {
  const normalized = String(value ?? PERFORMANCE_BOND_DEFAULT_CURRENCY).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : PERFORMANCE_BOND_DEFAULT_CURRENCY;
}

export function normalizePerformanceBondStatus(value: string | null | undefined): PerformanceBondStatus {
  return PERFORMANCE_BOND_STATUS_VALUES.includes(value as PerformanceBondStatus)
    ? (value as PerformanceBondStatus)
    : "not_enabled";
}

export function normalizeBondFundingStatus(value: string | null | undefined): BondFundingStatus {
  return BOND_FUNDING_STATUS_VALUES.includes(value as BondFundingStatus)
    ? (value as BondFundingStatus)
    : "awaiting_funding";
}

export function normalizePerformanceBondVisibility(value: string | null | undefined): PerformanceBondVisibility {
  if (
    value === "platform_reviewer_only" ||
    value === "public_proof" ||
    value === "mixed_redacted"
  ) {
    return value;
  }

  return "counterparty_only";
}

export function normalizePerformanceBondForfeitureDestination(
  value: string | null | undefined,
): PerformanceBondForfeitureDestination {
  if (value === "mpgf" || value === "counterparty" || value === "split") {
    return value;
  }

  return "compromise_charity";
}

export function getPerformanceBondForfeitureRule(
  destination: PerformanceBondForfeitureDestination,
): PerformanceBondForfeitureRule {
  if (destination === "split") {
    return "split_release";
  }

  if (destination === "counterparty") {
    return "counterparty_release";
  }

  return "neutral_release";
}

export function normalizePerformanceBondChallengeWindowDays(value: string | number | null | undefined) {
  const parsed = Number(value);
  return parsed === 14 || parsed === 30 ? parsed : 7;
}

export function formatPerformanceBondAmount(
  amountCents: number,
  currency = PERFORMANCE_BOND_DEFAULT_CURRENCY,
) {
  return new Intl.NumberFormat("en-US", {
    currency: normalizePerformanceBondCurrency(currency),
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountCents / 100);
}

export function parsePerformanceBondSplitConfig(input: {
  counterpartyPercent?: string | number | null;
  mpgfPercent?: string | number | null;
  neutralCausePercent?: string | number | null;
}): PerformanceBondSplitConfig {
  return {
    counterpartyPercent: normalizePercent(input.counterpartyPercent),
    mpgfPercent: normalizePercent(input.mpgfPercent),
    neutralCausePercent: normalizePercent(input.neutralCausePercent),
  };
}

function normalizePercent(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}

export function getDefaultPerformanceBondSplitConfig(): PerformanceBondSplitConfig {
  return {
    counterpartyPercent: 0,
    mpgfPercent: 50,
    neutralCausePercent: 50,
  };
}

export function normalizePerformanceBondEvidenceSchema(input: {
  acceptedEvidenceTypes?: string | null;
  actionToProve?: string | null;
  minimumDetail?: string | null;
  privateEvidenceAllowed?: boolean;
  reviewStandard?: string | null;
  templateKey?: string | null;
  visibility?: string | null;
}): PerformanceBondEvidenceSchema {
  const template =
    PERFORMANCE_BOND_EVIDENCE_TEMPLATES.find((entry) => entry.key === input.templateKey) ??
    PERFORMANCE_BOND_EVIDENCE_TEMPLATES[0];
  const schemaText = (
    key: "acceptedEvidenceTypes" | "actionToProve" | "minimumDetail" | "reviewStandard",
  ) =>
    Object.prototype.hasOwnProperty.call(input, key) && input[key] !== null
      ? String(input[key]).trim()
      : template.schema[key];

  return {
    acceptedEvidenceTypes: schemaText("acceptedEvidenceTypes"),
    actionToProve: schemaText("actionToProve"),
    minimumDetail: schemaText("minimumDetail"),
    privateEvidenceAllowed:
      input.privateEvidenceAllowed ?? template.schema.privateEvidenceAllowed,
    reviewStandard: schemaText("reviewStandard"),
    templateKey: template.key,
    visibility: normalizePerformanceBondVisibility(input.visibility ?? template.schema.visibility),
  };
}

export function evidenceSchemaToJson(schema: PerformanceBondEvidenceSchema): Json {
  return {
    acceptedEvidenceTypes: schema.acceptedEvidenceTypes,
    actionToProve: schema.actionToProve,
    minimumDetail: schema.minimumDetail,
    privateEvidenceAllowed: schema.privateEvidenceAllowed,
    reviewStandard: schema.reviewStandard,
    templateKey: schema.templateKey,
    visibility: schema.visibility,
  };
}

export function evidenceSchemaFromJson(value: Json | null | undefined): PerformanceBondEvidenceSchema {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return PERFORMANCE_BOND_EVIDENCE_TEMPLATES[0].schema;
  }

  const record = value as Record<string, Json | undefined>;
  return normalizePerformanceBondEvidenceSchema({
    acceptedEvidenceTypes: typeof record.acceptedEvidenceTypes === "string" ? record.acceptedEvidenceTypes : "",
    actionToProve: typeof record.actionToProve === "string" ? record.actionToProve : "",
    minimumDetail: typeof record.minimumDetail === "string" ? record.minimumDetail : "",
    privateEvidenceAllowed: record.privateEvidenceAllowed === true,
    reviewStandard: typeof record.reviewStandard === "string" ? record.reviewStandard : "",
    templateKey: typeof record.templateKey === "string" ? record.templateKey : "",
    visibility: typeof record.visibility === "string" ? record.visibility : "",
  });
}

export function splitConfigToJson(splitConfig: PerformanceBondSplitConfig): Json {
  return {
    counterpartyPercent: splitConfig.counterpartyPercent,
    mpgfPercent: splitConfig.mpgfPercent,
    neutralCausePercent: splitConfig.neutralCausePercent,
  };
}

export function splitConfigFromJson(value: Json | null | undefined): PerformanceBondSplitConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return getDefaultPerformanceBondSplitConfig();
  }

  const record = value as Record<string, Json | undefined>;
  return parsePerformanceBondSplitConfig({
    counterpartyPercent:
      typeof record.counterpartyPercent === "number" ? record.counterpartyPercent : 0,
    mpgfPercent: typeof record.mpgfPercent === "number" ? record.mpgfPercent : 0,
    neutralCausePercent:
      typeof record.neutralCausePercent === "number" ? record.neutralCausePercent : 0,
  });
}

export function isConcretePerformanceBondEvidenceSchema(schema: PerformanceBondEvidenceSchema) {
  const values = [
    schema.actionToProve,
    schema.acceptedEvidenceTypes,
    schema.minimumDetail,
    schema.reviewStandard,
  ].map((value) => value.trim());

  return (
    values.every((value) => value.length >= 12) &&
    /\b(evidence|receipt|report|log|attestation|confirmation|proof|record|check-in|review)\b/i.test(
      values.join(" "),
    )
  );
}

export function validatePerformanceBondTerms(
  input: PerformanceBondTermsInput,
  config: PerformanceBondConfig = getPerformanceBondConfig(),
  now: Date = new Date(),
): PerformanceBondValidation {
  if (!input.enabled) {
    return { errors: [], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const currency = normalizePerformanceBondCurrency(input.currency);

  if (currency !== PERFORMANCE_BOND_DEFAULT_CURRENCY) {
    errors.push("Pledge performance bonds currently support USD only.");
  }

  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    errors.push("Bond amount is required.");
  } else if (input.amountCents < config.minAmountCents) {
    errors.push(`Bond amount must be at least ${formatPerformanceBondAmount(config.minAmountCents)}.`);
  } else if (input.amountCents > config.maxAmountCents) {
    errors.push(`Bond amount must be no more than ${formatPerformanceBondAmount(config.maxAmountCents)}.`);
  }

  if (!input.evidenceDueAt) {
    errors.push("Evidence due date is required.");
  } else {
    const evidenceDueMs = Date.parse(input.evidenceDueAt);

    if (!Number.isFinite(evidenceDueMs)) {
      errors.push("Evidence due date must be valid.");
    } else if (evidenceDueMs <= now.getTime()) {
      errors.push("Evidence due date must be in the future.");
    }

    if (input.swapStartsAt) {
      const swapStartMs = Date.parse(input.swapStartsAt);
      if (Number.isFinite(swapStartMs) && Number.isFinite(evidenceDueMs) && evidenceDueMs < swapStartMs) {
        errors.push("Evidence due date cannot be before the swap starts.");
      }
    }
  }

  if (![7, 14, 30].includes(input.challengeWindowDays)) {
    errors.push("Challenge window must be 7, 14, or 30 days.");
  }

  if (!isConcretePerformanceBondEvidenceSchema(input.evidenceSchema)) {
    errors.push("Evidence schema must specify the action, acceptable evidence, minimum detail, visibility, and review standard.");
  }

  if (!input.noTradeBaseline.trim()) {
    errors.push("No-trade baseline is required for bonded pledge swaps.");
  }

  if (!input.additionalityStatement.trim()) {
    errors.push("Why this is additional is required for bonded pledge swaps.");
  }

  if (!input.forfeitureDestination) {
    errors.push("Forfeiture destination is required.");
  }

  if (input.forfeitureDestination === "split") {
    const total =
      input.splitConfig.counterpartyPercent +
      input.splitConfig.neutralCausePercent +
      input.splitConfig.mpgfPercent;

    if (total !== 100) {
      errors.push("Split percentages must sum to 100.");
    }
  }

  const counterpartyReceives =
    input.forfeitureDestination === "counterparty" ||
    (input.forfeitureDestination === "split" && input.splitConfig.counterpartyPercent > 0);

  if (counterpartyReceives && !input.counterpartyPayoutConsent) {
    errors.push("Counterparty payout requires explicit advanced consent.");
  }

  if (!input.evidenceSchema.privateEvidenceAllowed && input.evidenceSchema.visibility === "platform_reviewer_only") {
    warnings.push("Reviewer-only evidence normally requires private or redacted evidence to be allowed.");
  }

  return { errors, warnings };
}

export function calculateForfeitureDistribution({
  amountCents,
  counterpartyId,
  currency,
  forfeitureDestination,
  forfeitureDestinationId,
  partyId,
  splitConfig,
}: {
  amountCents: number;
  counterpartyId: string | null;
  currency: string;
  forfeitureDestination: PerformanceBondForfeitureDestination;
  forfeitureDestinationId: string | null;
  partyId: string;
  splitConfig: PerformanceBondSplitConfig;
}): ForfeitureDistributionEntry[] {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return [];
  }

  const normalizedCurrency = normalizePerformanceBondCurrency(currency);
  const neutralDestinationId = forfeitureDestinationId || PERFORMANCE_BOND_MPGF_DESTINATION_ID;
  const neutralDestinationType: BondLedgerDestinationType = forfeitureDestinationId
    ? "compromise_charity"
    : "mpgf";

  if (forfeitureDestination === "counterparty") {
    return [
      {
        amountCents,
        currency: normalizedCurrency,
        destinationId: counterpartyId,
        destinationType: "counterparty",
        percent: 100,
      },
    ];
  }

  if (forfeitureDestination === "mpgf") {
    return [
      {
        amountCents,
        currency: normalizedCurrency,
        destinationId: PERFORMANCE_BOND_MPGF_DESTINATION_ID,
        destinationType: "mpgf",
        percent: 100,
      },
    ];
  }

  if (forfeitureDestination !== "split") {
    return [
      {
        amountCents,
        currency: normalizedCurrency,
        destinationId: neutralDestinationId,
        destinationType: neutralDestinationType,
        percent: 100,
      },
    ];
  }

  const candidateEntries: ForfeitureDistributionEntry[] = [
    {
      amountCents: Math.floor((amountCents * splitConfig.counterpartyPercent) / 100),
      currency: normalizedCurrency,
      destinationId: counterpartyId,
      destinationType: "counterparty",
      percent: splitConfig.counterpartyPercent,
    },
    {
      amountCents: Math.floor((amountCents * splitConfig.neutralCausePercent) / 100),
      currency: normalizedCurrency,
      destinationId: neutralDestinationId,
      destinationType: neutralDestinationType,
      percent: splitConfig.neutralCausePercent,
    },
    {
      amountCents: Math.floor((amountCents * splitConfig.mpgfPercent) / 100),
      currency: normalizedCurrency,
      destinationId: PERFORMANCE_BOND_MPGF_DESTINATION_ID,
      destinationType: "mpgf",
      percent: splitConfig.mpgfPercent,
    },
  ];
  const rawEntries = candidateEntries.filter((entry) => entry.percent > 0);

  const assignedCents = rawEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const remainder = amountCents - assignedCents;

  if (rawEntries.length && remainder > 0) {
    rawEntries[rawEntries.length - 1] = {
      ...rawEntries[rawEntries.length - 1],
      amountCents: rawEntries[rawEntries.length - 1].amountCents + remainder,
    };
  }

  return rawEntries.filter((entry) => entry.amountCents > 0 && (entry.destinationId || entry.destinationType !== "counterparty" || partyId));
}

export function canTransitionPerformanceBond(
  from: PerformanceBondStatus,
  to: PerformanceBondStatus,
) {
  return allowedTransitions[from].includes(to);
}

export function assertPerformanceBondTransition(
  from: PerformanceBondStatus,
  to: PerformanceBondStatus,
) {
  if (from === to) {
    return;
  }

  if (!canTransitionPerformanceBond(from, to)) {
    throw new Error(`Invalid pledge performance bond transition: ${from} -> ${to}.`);
  }
}

export function isPerformanceBondFinal(status: PerformanceBondStatus) {
  return finalStatuses.has(status);
}

export function canActOnPerformanceBond({
  action,
  actorId,
  actorRole,
  bond,
}: {
  action:
    | "submit_evidence"
    | "accept_evidence"
    | "challenge_evidence"
    | "adjudicate"
    | "refund"
    | "release"
    | "lock_terms";
  actorId: string;
  actorRole: BondActorRole;
  bond: Pick<PerformanceBondRecord, "counterparty_id" | "party_id" | "status">;
}) {
  if (actorRole === "reviewer" || actorRole === "system") {
    return action !== "submit_evidence" && action !== "accept_evidence";
  }

  if (action === "submit_evidence") {
    return actorId === bond.party_id;
  }

  if (action === "accept_evidence" || action === "challenge_evidence") {
    return actorId === bond.counterparty_id;
  }

  if (action === "lock_terms") {
    return actorId === bond.party_id || actorId === bond.counterparty_id;
  }

  return false;
}

export function getChallengeWindowEndsAt({
  challengeWindowDays,
  submittedAt,
}: {
  challengeWindowDays: number;
  submittedAt: string | Date;
}) {
  const start = typeof submittedAt === "string" ? new Date(submittedAt) : new Date(submittedAt);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  start.setUTCDate(start.getUTCDate() + challengeWindowDays);
  return start.toISOString();
}

async function recordPerformanceBondAuditEvent({
  actorId,
  actorRole,
  bondId,
  eventType,
  fromStatus,
  idempotencyKey,
  metadata = {},
  reason,
  supabase,
  toStatus,
}: {
  actorId: string | null;
  actorRole: BondActorRole;
  bondId: string;
  eventType: string;
  fromStatus: PerformanceBondStatus;
  idempotencyKey: string;
  metadata?: Json;
  reason: string;
  supabase: unknown;
  toStatus: PerformanceBondStatus;
}) {
  const client = supabase as any;
  const { error } = await client.from("performance_bond_audit_events").insert({
    actor_id: actorId,
    actor_role: actorRole,
    bond_id: bondId,
    event_type: eventType,
    from_status: fromStatus,
    idempotency_key: idempotencyKey,
    metadata,
    reason,
    to_status: toStatus,
  });

  if (!error || error.code === "23505") {
    return null;
  }

  return error as Error;
}

async function loadPerformanceBond(
  supabase: unknown,
  bondId: string,
): Promise<PerformanceBondRecord | null> {
  const client = supabase as any;
  const { data, error } = await client
    .from("performance_bonds")
    .select("*")
    .eq("id", bondId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PerformanceBondRecord | null) ?? null;
}

async function updatePerformanceBondStatus({
  actorId,
  actorRole,
  bond,
  eventType,
  idempotencyKey,
  reason,
  status,
  supabase,
  updates = {},
}: {
  actorId: string | null;
  actorRole: BondActorRole;
  bond: PerformanceBondRecord;
  eventType: string;
  idempotencyKey: string;
  reason: string;
  status: PerformanceBondStatus;
  supabase: unknown;
  updates?: Record<string, unknown>;
}) {
  assertPerformanceBondTransition(normalizePerformanceBondStatus(bond.status), status);

  const client = supabase as any;
  const { data, error } = await client
    .from("performance_bonds")
    .update({
      ...updates,
      resolved_at: isPerformanceBondFinal(status) ? new Date().toISOString() : updates.resolved_at,
      status,
    })
    .eq("id", bond.id)
    .eq("status", bond.status)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Pledge performance bond changed while the transition was being recorded.");
  }

  const auditError = await recordPerformanceBondAuditEvent({
    actorId,
    actorRole,
    bondId: bond.id,
    eventType,
    fromStatus: normalizePerformanceBondStatus(bond.status),
    idempotencyKey,
    reason,
    supabase,
    toStatus: status,
  });

  if (auditError) {
    throw auditError;
  }

  return data as PerformanceBondRecord;
}

export async function createPerformanceBond({
  counterpartyId,
  forfeitureDestinationId,
  interestId = null,
  offerId,
  partyId,
  side,
  supabase,
  terms,
}: {
  counterpartyId: string | null;
  forfeitureDestinationId?: string | null;
  interestId?: string | null;
  offerId: string;
  partyId: string;
  side: PerformanceBondSide;
  supabase: unknown;
  terms: PerformanceBondTermsInput;
}) {
  const validation = validatePerformanceBondTerms(terms);

  if (validation.errors.length) {
    throw new Error(validation.errors[0]);
  }

  const client = supabase as any;
  const forfeitureDestination = normalizePerformanceBondForfeitureDestination(
    terms.forfeitureDestination,
  );
  const payload = {
    additionality_statement: terms.additionalityStatement.trim(),
    amount_cents: terms.amountCents,
    challenge_window_days: terms.challengeWindowDays,
    counterparty_id: counterpartyId,
    counterparty_payout_consent: terms.counterpartyPayoutConsent,
    currency: normalizePerformanceBondCurrency(terms.currency),
    enabled: terms.enabled,
    evidence_due_at: terms.evidenceDueAt,
    evidence_schema: evidenceSchemaToJson(terms.evidenceSchema),
    forfeiture_destination: forfeitureDestination,
    forfeiture_destination_id: forfeitureDestinationId ?? null,
    forfeiture_rule: getPerformanceBondForfeitureRule(forfeitureDestination),
    funding_status: "awaiting_funding" satisfies BondFundingStatus,
    interest_id: interestId,
    no_trade_baseline: terms.noTradeBaseline.trim(),
    offer_id: offerId,
    party_id: partyId,
    payment_provider: PERFORMANCE_BOND_MANUAL_PROVIDER,
    reviewer_policy: PERFORMANCE_BOND_REVIEWER_POLICY,
    side,
    split_config: splitConfigToJson(terms.splitConfig),
    status: "draft" satisfies PerformanceBondStatus,
  };
  const { data, error } = await client
    .from("performance_bonds")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordPerformanceBondAuditEvent({
    actorId: partyId,
    actorRole: "party",
    bondId: data.id,
    eventType: "created",
    fromStatus: "not_enabled",
    idempotencyKey: `performance-bond:${data.id}:created`,
    reason: "Pledge performance bond draft terms were created.",
    supabase,
    toStatus: "draft",
  });

  return data as PerformanceBondRecord;
}

export async function fundPerformanceBond({
  actorId,
  bondId,
  fundingStatus,
  paymentIntentId = null,
  paymentProvider,
  supabase,
}: {
  actorId: string;
  bondId: string;
  fundingStatus: BondFundingStatus;
  paymentIntentId?: string | null;
  paymentProvider: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  const nextStatus: PerformanceBondStatus = fundingStatus === "funded" ? "funded" : "awaiting_funding";
  const client = supabase as any;
  await client.from("bond_ledger_entries").upsert({
    amount_cents: bond.amount_cents,
    bond_id: bond.id,
    currency: bond.currency,
    destination_id: bond.party_id,
    destination_type: "platform_manual_review",
    idempotency_key: `performance-bond:${bond.id}:fund:${fundingStatus}:${paymentIntentId ?? "manual"}`,
    status: fundingStatus,
    type: "fund",
  }, {
    ignoreDuplicates: true,
    onConflict: "idempotency_key",
  });

  return updatePerformanceBondStatus({
    actorId,
    actorRole: "party",
    bond,
    eventType: "funding_updated",
    idempotencyKey: `performance-bond:${bond.id}:status:${bond.status}-to-${nextStatus}:fund`,
    reason: `Funding status changed to ${fundingStatus}.`,
    status: nextStatus,
    supabase,
    updates: {
      funding_status: fundingStatus,
      payment_intent_id: paymentIntentId,
      payment_provider: paymentProvider,
    },
  });
}

export async function lockPerformanceBondTerms({
  actorId,
  bondId,
  counterpartyId,
  livePaymentsEnabled = isLiveBondPaymentsEnabled(),
  swapId,
  supabase,
}: {
  actorId: string;
  bondId: string;
  counterpartyId: string;
  livePaymentsEnabled?: boolean;
  swapId: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  if (bond.locked_at) {
    throw new Error("Pledge performance bond terms are already locked.");
  }

  return updatePerformanceBondStatus({
    actorId,
    actorRole: "party",
    bond,
    eventType: "terms_locked",
    idempotencyKey: `performance-bond:${bond.id}:terms-locked:${swapId}`,
    reason: livePaymentsEnabled
      ? "Pledge performance bond terms were locked at acceptance; provider funding is required before funded status."
      : "Pledge performance bond terms were locked at acceptance with manual-payment pending status; no live custody is claimed.",
    status: livePaymentsEnabled ? "awaiting_funding" : "active",
    supabase,
    updates: {
      counterparty_id: counterpartyId,
      funding_status: livePaymentsEnabled
        ? ("awaiting_funding" satisfies BondFundingStatus)
        : ("payment_pending" satisfies BondFundingStatus),
      locked_at: new Date().toISOString(),
      payment_provider: livePaymentsEnabled ? "provider_required" : PERFORMANCE_BOND_MANUAL_PROVIDER,
      swap_id: swapId,
    },
  });
}

export async function cancelPerformanceBondDraft({
  actorId,
  bondId,
  reason = "Draft pledge performance bond terms were disabled before acceptance.",
  supabase,
}: {
  actorId: string;
  bondId: string;
  reason?: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  if (bond.locked_at) {
    throw new Error("Pledge performance bond terms are locked after acceptance.");
  }

  return updatePerformanceBondStatus({
    actorId,
    actorRole: "party",
    bond,
    eventType: "cancelled",
    idempotencyKey: `performance-bond:${bond.id}:cancelled`,
    reason,
    status: "cancelled",
    supabase,
    updates: {
      enabled: false,
    },
  });
}

export async function submitBondEvidence({
  actorId,
  attestation,
  bondId,
  evidenceText,
  evidenceUrls,
  redactionNotes,
  supabase,
  visibility,
}: {
  actorId: string;
  attestation: boolean;
  bondId: string;
  evidenceText: string;
  evidenceUrls: string[];
  redactionNotes: string;
  supabase: unknown;
  visibility: PerformanceBondVisibility;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  if (!canActOnPerformanceBond({ action: "submit_evidence", actorId, actorRole: "party", bond })) {
    throw new Error("Only the pledger can submit evidence for their own bond.");
  }

  if (!attestation) {
    throw new Error("Evidence submission requires the accuracy and completeness attestation.");
  }

  if (!evidenceText.trim() && !evidenceUrls.length) {
    throw new Error("Evidence text or evidence URL is required.");
  }

  if (isPerformanceBondFinal(bond.status)) {
    throw new Error("This pledge performance bond is already resolved.");
  }

  const client = supabase as any;
  const { data: evidence, error: evidenceError } = await client
    .from("bond_evidence")
    .insert({
      attestation,
      bond_id: bond.id,
      evidence_text: evidenceText.trim(),
      evidence_urls: evidenceUrls,
      redaction_notes: redactionNotes.trim(),
      status: "submitted",
      submitted_by: actorId,
      visibility,
    })
    .select("*")
    .single();

  if (evidenceError) {
    throw evidenceError;
  }

  const submittedAt = String(evidence.submitted_at);
  const updatedBond = await updatePerformanceBondStatus({
    actorId,
    actorRole: "party",
    bond,
    eventType: "evidence_submitted",
    idempotencyKey: `performance-bond:${bond.id}:evidence:${evidence.id}`,
    reason: "Pledger submitted evidence and opened the challenge window.",
    status: "challenge_window_open",
    supabase,
    updates: {
      challenge_window_ends_at: getChallengeWindowEndsAt({
        challengeWindowDays: bond.challenge_window_days,
        submittedAt,
      }),
    },
  });

  return { bond: updatedBond, evidence: evidence as BondEvidenceRecord };
}

export async function acceptBondEvidence({
  actorId,
  bondId,
  reason,
  supabase,
}: {
  actorId: string;
  bondId: string;
  reason: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  if (!canActOnPerformanceBond({ action: "accept_evidence", actorId, actorRole: "counterparty", bond })) {
    throw new Error("Only the counterparty can accept evidence for this bond.");
  }

  const client = supabase as any;
  await client
    .from("bond_evidence")
    .update({ status: "accepted_by_counterparty" })
    .eq("bond_id", bond.id)
    .eq("status", "submitted");

  const acceptedBond = await updatePerformanceBondStatus({
    actorId,
    actorRole: "counterparty",
    bond,
    eventType: "evidence_accepted",
    idempotencyKey: `performance-bond:${bond.id}:accepted-by-counterparty`,
    reason: reason || "Counterparty accepted evidence under the agreed evidence standard.",
    status: "accepted_by_counterparty",
    supabase,
  });

  return refundPerformanceBond({
    actorId,
    actorRole: "counterparty",
    bondId: acceptedBond.id,
    reason: "Evidence accepted by counterparty; bond marked for refund processing.",
    supabase,
  });
}

export async function challengeBondEvidence({
  actorId,
  bondId,
  reason,
  requestedOutcome,
  specificObjection,
  supabase,
}: {
  actorId: string;
  bondId: string;
  reason: string;
  requestedOutcome: string;
  specificObjection: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  if (!canActOnPerformanceBond({ action: "challenge_evidence", actorId, actorRole: "counterparty", bond })) {
    throw new Error("Only the counterparty can challenge evidence for this bond.");
  }

  if (!reason.trim() || !specificObjection.trim()) {
    throw new Error("Challenge reason and specific objection are required.");
  }

  const client = supabase as any;
  const { data: challenge, error: challengeError } = await client
    .from("bond_challenges")
    .insert({
      bond_id: bond.id,
      challenged_by: actorId,
      reason: reason.trim(),
      requested_outcome: requestedOutcome.trim() || "platform_review",
      specific_objection: specificObjection.trim(),
      status: "under_review",
    })
    .select("*")
    .single();

  if (challengeError) {
    throw challengeError;
  }

  await client.from("bond_evidence").update({ status: "challenged" }).eq("bond_id", bond.id);

  const challengedBond = await updatePerformanceBondStatus({
    actorId,
    actorRole: "counterparty",
    bond,
    eventType: "evidence_challenged",
    idempotencyKey: `performance-bond:${bond.id}:challenge:${challenge.id}`,
    reason: "Counterparty challenged evidence. Final forfeiture decision is routed to platform review.",
    status: "challenged",
    supabase,
  });

  return updatePerformanceBondStatus({
    actorId,
    actorRole: "counterparty",
    bond: challengedBond,
    eventType: "routed_to_review",
    idempotencyKey: `performance-bond:${bond.id}:challenge:${challenge.id}:under-review`,
    reason: "Challenge routed to platform review because the counterparty is not the final decision-maker.",
    status: "under_review",
    supabase,
  });
}

export async function adjudicateBondChallenge({
  appealAllowed,
  appealDeadline,
  bondId,
  challengeId = null,
  decision,
  decisionReason,
  reviewerId,
  supabase,
}: {
  appealAllowed: boolean;
  appealDeadline: string | null;
  bondId: string;
  challengeId?: string | null;
  decision: BondAdjudicationDecision;
  decisionReason: string;
  reviewerId: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  if (!decisionReason.trim()) {
    throw new Error("Reviewer decision reason is required.");
  }

  const client = supabase as any;
  const { error: adjudicationError } = await client.from("bond_adjudications").insert({
    appeal_allowed: appealAllowed,
    appeal_deadline: appealDeadline,
    bond_id: bond.id,
    challenge_id: challengeId,
    decision,
    decision_reason: decisionReason.trim(),
    reviewer_id: reviewerId,
  });

  if (adjudicationError) {
    throw adjudicationError;
  }

  if (decision === "request_more_evidence") {
    await client
      .from("bond_challenges")
      .update({ status: "more_evidence_requested" })
      .eq("bond_id", bond.id)
      .in("status", ["open", "under_review"]);
    await client.from("bond_evidence").update({ status: "more_evidence_requested" }).eq("bond_id", bond.id);

    return updatePerformanceBondStatus({
      actorId: reviewerId,
      actorRole: "reviewer",
      bond,
      eventType: "review_requested_more_evidence",
      idempotencyKey: `performance-bond:${bond.id}:adjudication:${decision}:more-evidence`,
      reason: decisionReason,
      status: "evidence_due",
      supabase,
    });
  }

  if (decision === "accept") {
    await client
      .from("bond_challenges")
      .update({ status: "rejected" })
      .eq("bond_id", bond.id)
      .in("status", ["open", "under_review"]);
    await client.from("bond_evidence").update({ status: "accepted_after_review" }).eq("bond_id", bond.id);

    const acceptedBond = await updatePerformanceBondStatus({
      actorId: reviewerId,
      actorRole: "reviewer",
      bond,
      eventType: "review_accepted_evidence",
      idempotencyKey: `performance-bond:${bond.id}:adjudication:accept`,
      reason: decisionReason,
      status: "accepted_after_review",
      supabase,
    });

    return refundPerformanceBond({
      actorId: reviewerId,
      actorRole: "reviewer",
      bondId: acceptedBond.id,
      reason: "Reviewer accepted evidence; bond marked for refund processing.",
      supabase,
    });
  }

  await client
    .from("bond_challenges")
    .update({ status: "accepted" })
    .eq("bond_id", bond.id)
    .in("status", ["open", "under_review"]);
  await client.from("bond_evidence").update({ status: "rejected_after_review" }).eq("bond_id", bond.id);

  const rejectedBond = await updatePerformanceBondStatus({
    actorId: reviewerId,
    actorRole: "reviewer",
    bond,
    eventType: "review_rejected_evidence",
    idempotencyKey: `performance-bond:${bond.id}:adjudication:reject`,
    reason: decisionReason,
    status: "rejected_after_review",
    supabase,
  });

  return releasePerformanceBond({
    actorId: reviewerId,
    actorRole: "reviewer",
    bondId: rejectedBond.id,
    reason: "Reviewer rejected evidence; bond marked for release under the forfeiture rule.",
    supabase,
  });
}

export async function refundPerformanceBond({
  actorId,
  actorRole,
  bondId,
  reason,
  supabase,
}: {
  actorId: string;
  actorRole: BondActorRole;
  bondId: string;
  reason: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  const client = supabase as any;
  await client.from("bond_ledger_entries").upsert({
    amount_cents: bond.amount_cents,
    bond_id: bond.id,
    currency: bond.currency,
    destination_id: bond.party_id,
    destination_type: "party",
    idempotency_key: `performance-bond:${bond.id}:refund:${bond.status}`,
    status: "pending",
    type: "refund",
  }, {
    ignoreDuplicates: true,
    onConflict: "idempotency_key",
  });

  const nextFundingStatus: BondFundingStatus =
    bond.funding_status === "funded" ? "refund_pending" : "refund_pending";

  return updatePerformanceBondStatus({
    actorId,
    actorRole,
    bond,
    eventType: "refund_marked",
    idempotencyKey: `performance-bond:${bond.id}:refund-marked:${bond.status}`,
    reason,
    status: bond.status === "auto_refund_pending" ? "refunded" : "auto_refund_pending",
    supabase,
    updates: {
      funding_status: nextFundingStatus,
    },
  });
}

export async function releasePerformanceBond({
  actorId,
  actorRole,
  bondId,
  reason,
  supabase,
}: {
  actorId: string;
  actorRole: BondActorRole;
  bondId: string;
  reason: string;
  supabase: unknown;
}) {
  const bond = await loadPerformanceBond(supabase, bondId);

  if (!bond) {
    throw new Error("Pledge performance bond not found.");
  }

  const distribution = calculateForfeitureDistribution({
    amountCents: bond.amount_cents,
    counterpartyId: bond.counterparty_id,
    currency: bond.currency,
    forfeitureDestination: bond.forfeiture_destination,
    forfeitureDestinationId: bond.forfeiture_destination_id,
    partyId: bond.party_id,
    splitConfig: splitConfigFromJson(bond.split_config),
  });
  const client = supabase as any;

  for (const entry of distribution) {
    await client.from("bond_ledger_entries").upsert({
      amount_cents: entry.amountCents,
      bond_id: bond.id,
      currency: entry.currency,
      destination_id: entry.destinationId,
      destination_type: entry.destinationType,
      idempotency_key: `performance-bond:${bond.id}:release:${entry.destinationType}:${entry.destinationId ?? "none"}`,
      status: "pending",
      type: distribution.length > 1 ? "split_release" : "release",
    }, {
      ignoreDuplicates: true,
      onConflict: "idempotency_key",
    });
  }

  return updatePerformanceBondStatus({
    actorId,
    actorRole,
    bond,
    eventType: "release_marked",
    idempotencyKey: `performance-bond:${bond.id}:release-marked:${bond.status}`,
    reason,
    status: distribution.length > 1 ? "split_disbursed" : "forfeited",
    supabase,
    updates: {
      funding_status: "release_pending" satisfies BondFundingStatus,
    },
  });
}

export async function processPerformanceBondScheduledTransitions({
  now = new Date(),
  supabase,
}: {
  now?: Date;
  supabase: unknown;
}) {
  const client = supabase as any;
  const nowIso = now.toISOString();
  const results = {
    autoRefunded: 0,
    evidenceDue: 0,
    errors: 0,
    missingEvidenceQueuedForReview: 0,
    stalePaymentExpired: 0,
  };

  const { data: dueBonds, error: dueError } = await client
    .from("performance_bonds")
    .select("*")
    .eq("enabled", true)
    .in("status", ["active", "awaiting_funding"])
    .lte("evidence_due_at", nowIso)
    .limit(100);

  if (dueError) {
    throw dueError;
  }

  for (const bond of (dueBonds ?? []) as PerformanceBondRecord[]) {
    try {
      await updatePerformanceBondStatus({
        actorId: null,
        actorRole: "system",
        bond,
        eventType: "evidence_due",
        idempotencyKey: `performance-bond:${bond.id}:evidence-due`,
        reason: "Scheduled job marked evidence due.",
        status: "evidence_due",
        supabase,
      });
      results.evidenceDue += 1;
    } catch {
      results.errors += 1;
    }
  }

  const { data: submittedBonds, error: submittedError } = await client
    .from("performance_bonds")
    .select("*")
    .eq("enabled", true)
    .eq("status", "challenge_window_open")
    .limit(100);

  if (submittedError) {
    throw submittedError;
  }

  for (const bond of (submittedBonds ?? []) as PerformanceBondRecord[]) {
    try {
      const { data: latestEvidence } = await client
        .from("bond_evidence")
        .select("*")
        .eq("bond_id", bond.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const evidence = latestEvidence as BondEvidenceRecord | null;
      const challengeWindowEndsAt = evidence
        ? getChallengeWindowEndsAt({
            challengeWindowDays: bond.challenge_window_days,
            submittedAt: evidence.submitted_at,
          })
        : null;

      if (!challengeWindowEndsAt || Date.parse(challengeWindowEndsAt) > now.getTime()) {
        continue;
      }

      const { data: openChallenge } = await client
        .from("bond_challenges")
        .select("id")
        .eq("bond_id", bond.id)
        .in("status", ["open", "under_review"])
        .limit(1)
        .maybeSingle();

      if (openChallenge) {
        continue;
      }

      const autoRefundBond = await updatePerformanceBondStatus({
        actorId: null,
        actorRole: "system",
        bond,
        eventType: "auto_refund_pending",
        idempotencyKey: `performance-bond:${bond.id}:auto-refund-pending`,
        reason: "Challenge window expired with no challenge.",
        status: "auto_refund_pending",
        supabase,
      });
      await refundPerformanceBond({
        actorId: "system",
        actorRole: "system",
        bondId: autoRefundBond.id,
        reason: "No challenge was filed before the challenge window closed.",
        supabase,
      });
      results.autoRefunded += 1;
    } catch {
      results.errors += 1;
    }
  }

  const config = getPerformanceBondConfig();
  const staleCutoff = new Date(now);
  staleCutoff.setUTCDate(staleCutoff.getUTCDate() - config.stalePaymentPendingDays);
  const { data: staleBonds, error: staleError } = await client
    .from("performance_bonds")
    .select("*")
    .eq("enabled", true)
    .eq("status", "awaiting_funding")
    .eq("funding_status", "payment_pending")
    .lt("locked_at", staleCutoff.toISOString())
    .limit(100);

  if (staleError) {
    throw staleError;
  }

  for (const bond of (staleBonds ?? []) as PerformanceBondRecord[]) {
    try {
      await updatePerformanceBondStatus({
        actorId: null,
        actorRole: "system",
        bond,
        eventType: "stale_payment_pending",
        idempotencyKey: `performance-bond:${bond.id}:stale-payment-pending`,
        reason: "Scheduled job expired a stale payment-pending bond.",
        status: "expired",
        supabase,
      });
      results.stalePaymentExpired += 1;
    } catch {
      results.errors += 1;
    }
  }

  return results;
}
