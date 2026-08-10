import { createHash, randomUUID } from "node:crypto";

import {
  CREATE_FORMULA_LANGUAGE_VERSION,
  validateTimingFormula,
} from "./formula";
import { readGroupContributionProposalFlags } from "./group-contribution-flags";
import {
  validateParticipantOwnedFundingTerms,
  validateParticipantTargets,
  type CreatorParticipation,
} from "./participant-target";
import type { GroupContributionProposalPayload } from "./group-contribution-payload";
import {
  GROUP_CONTRIBUTION_REVIEW_RECORD_KEY,
  type GroupContributionReviewRecordFragment,
} from "./group-contribution-review-record";
import {
  validateGroupContributionProposalForPersistence,
  type AuthoritativeProposalOption,
} from "./group-contribution-server";
import {
  CREATE_INTERFACE_VERSION,
  CREATE_SUBMISSION_KINDS,
  type CreateOfferContribution,
  type CreateOfferOption,
  type CreateOfferType,
  type CreateProgressVisibility,
  type CreateSubmissionKind,
  type MoralTradeCreatePayload,
  type ValidatedCreatePayload,
  type ValidatedCreatePoolTerms,
} from "./types";

const MAX_PAYLOAD_BYTES = 180_000;
const MAX_TEXT = 2_000;
const OFFER_IDS = new Set<CreateOfferType>(["money", "time", "behavior", "skill", "intro", "cause"]);
const PROGRESS_VISIBILITY = {
  exact: "exact_amount",
  range: "progress_range",
  threshold: "threshold_status_only",
  sealed: "sealed_progress",
} as const satisfies Record<CreateProgressVisibility, ValidatedCreatePoolTerms["progressVisibility"]>;

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function textValue(value: unknown, label: string, minimum = 1, maximum = MAX_TEXT) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const text = value.trim();
  if (text.length < minimum) throw new Error(`${label} is required.`);
  if (text.length > maximum) throw new Error(`${label} must be ${maximum} characters or fewer.`);
  return text;
}

function optionalText(value: unknown, maximum = MAX_TEXT) {
  if (value == null || value === "") return "";
  return textValue(value, "Optional text", 0, maximum);
}

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as T;
}

function decimalToInteger(value: unknown, decimalPlaces: number, label: string, options?: {
  minimum?: number;
  maximum?: number;
}) {
  const text = textValue(String(value ?? ""), label, 1, 80).replace(/[$,\s]/g, "");
  const match = text.match(new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimalPlaces}}))?$`));
  if (!match) throw new Error(`${label} must be a non-negative decimal with at most ${decimalPlaces} decimal places.`);
  const scale = 10 ** decimalPlaces;
  const integer = Number(match[1]) * scale + Number((match[2] ?? "").padEnd(decimalPlaces, "0"));
  if (!Number.isSafeInteger(integer)) throw new Error(`${label} exceeds exact integer limits.`);
  if (options?.minimum != null && integer < options.minimum) throw new Error(`${label} is below the permitted minimum.`);
  if (options?.maximum != null && integer > options.maximum) throw new Error(`${label} exceeds the permitted maximum.`);
  return integer;
}

function exactIntegerValue(value: unknown, label: string, options?: {
  minimum?: number;
  maximum?: number;
}) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be an exact integer.`);
  }
  if (options?.minimum != null && value < options.minimum) {
    throw new Error(`${label} is below the permitted minimum.`);
  }
  if (options?.maximum != null && value > options.maximum) {
    throw new Error(`${label} exceeds the permitted maximum.`);
  }
  return value;
}

function validateOfferOption(id: CreateOfferType, raw: unknown): CreateOfferOption {
  const input = objectValue(raw, `${id} option`);
  const output: CreateOfferOption = {};

  const read = (key: string, required = false, maximum = 240) => {
    const value = input[key];
    if (typeof value === "boolean") {
      output[key] = value;
      return value;
    }
    const text = required
      ? textValue(value, `${id} ${key}`, 1, maximum)
      : optionalText(value, maximum);
    output[key] = text;
    return text;
  };

  if (id === "money") {
    const amount = decimalToInteger(input.amount, 2, "Money amount", { minimum: 1 });
    output.amount = (amount / 100).toFixed(2);
    output.currency = textValue(input.currency, "Money currency", 1, 12).toUpperCase();
    output.schedule = enumValue(input.schedule, ["one-time", "weekly", "monthly"] as const, "Money frequency");
    output.destination = enumValue(input.destination, ["organization", "collaborator"] as const, "Money destination");
    output.organization = optionalText(input.organization, 160);
    output.allowAlternatives = input.allowAlternatives === true;
    output.donationMode = enumValue(input.donationMode ?? "direct", ["direct", "matched"] as const, "Donation structure");
    output.matchRatio = optionalText(input.matchRatio, 24);
    output.matchTarget = optionalText(input.matchTarget, 160);
    if (output.destination === "organization" && !output.organization && output.allowAlternatives !== true) {
      throw new Error("Each donation option must name an organization or permit the collaborator to propose one.");
    }
    if (output.destination === "organization" && output.donationMode === "matched" && (!output.matchRatio || !output.matchTarget)) {
      throw new Error("A matched contribution requires both a match ratio and a contribution to match.");
    }
    return output;
  }

  if (id === "time") {
    const amount = decimalToInteger(input.amount, 2, "Time amount", { minimum: 1 });
    output.amount = String(amount / 100);
    read("unit", true, 40);
    read("availability", true, 100);
    return output;
  }

  if (id === "behavior") {
    read("action", true, 180);
    read("duration", true, 120);
    return output;
  }

  if (id === "skill") {
    read("work", true, 180);
    read("scope", true, 120);
    read("availability", false, 100);
    return output;
  }

  if (id === "intro") {
    read("person", true, 160);
    read("context", false, 160);
    return output;
  }

  read("cause", true, 140);
  read("support", true, 180);
  return output;
}

function validateOffers(value: unknown, required: boolean) {
  if (!Array.isArray(value)) throw new Error("Contribution options must be an array.");
  if (required && value.length < 1) throw new Error("Select at least one contribution type.");
  if (value.length > 6) throw new Error("No more than six contribution types may be submitted.");

  const seen = new Set<string>();
  return value.map((raw, index): CreateOfferContribution => {
    const input = objectValue(raw, `Contribution ${index + 1}`);
    const id = enumValue(input.id, [...OFFER_IDS] as CreateOfferType[], "Contribution type");
    if (seen.has(id)) throw new Error(`Contribution type ${id} is duplicated.`);
    seen.add(id);
    const title = textValue(input.title, "Contribution title", 1, 80);
    if (!Array.isArray(input.options) || input.options.length < 1 || input.options.length > 12) {
      throw new Error(`${title} requires between one and twelve concrete options.`);
    }
    return {
      id,
      title,
      options: input.options.map((option) => validateOfferOption(id, option)),
    };
  });
}

function summarizeOption(option: CreateOfferOption) {
  return Object.entries(option)
    .filter(([, value]) => value !== "" && value !== false && value != null)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function summarizeOffers(offers: CreateOfferContribution[]) {
  return offers
    .map((offer) => `${offer.title}: ${offer.options.map(summarizeOption).join(" OR ")}`)
    .join("; ")
    .slice(0, 2_000);
}

function inferKind(payload: MoralTradeCreatePayload): CreateSubmissionKind {
  if (payload.requestKind !== "fund") return "pledge_swap";
  if (payload.fundMode === "redirect") return "donation_redirect";
  if (payload.fundMode === "dac" && payload.dacPath === "create") return "pool_create";
  if (payload.fundMode === "dac" && payload.dacPath === "existing") return "existing_pool_contribution";
  return "pledge_swap";
}

function parseDeadline(value: unknown) {
  const deadline = textValue(value, "Pledge deadline", 1, 120);
  const timestamp = Date.parse(deadline);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Pledge deadline must include an unambiguous date, time, and timezone.");
  }
  const now = Date.now();
  if (timestamp <= now + 30 * 60 * 1000) throw new Error("Pledge deadline must be at least 30 minutes in the future.");
  if (timestamp > now + 3 * 365 * 24 * 60 * 60 * 1000) throw new Error("Pledge deadline must be within three years.");
  return new Date(timestamp).toISOString();
}

function validateCommonGround(raw: unknown): NonNullable<ValidatedCreatePoolTerms["commonGround"]> {
  const input = objectValue(raw, "Co-Fund terms");
  const allowedTopLevel = new Set([
    "targetAmountCents",
    "allocationStatus",
    "creatorParticipation",
    "privateValueEstimatesStored",
    "participants",
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevel.has(key)) {
      throw new Error("Co-Fund terms contain an unsupported or private field.");
    }
  }

  const targetAmountCents = exactIntegerValue(
    input.targetAmountCents,
    "Co-Fund target",
    { minimum: 1 },
  );
  if (input.allocationStatus !== "open") {
    throw new Error("A proposal-stage Co-Fund allocation must remain open.");
  }
  const creatorParticipation = enumValue(
    input.creatorParticipation,
    ["participating", "organizer-only"] as const,
    "Creator participation",
  );
  if (input.privateValueEstimatesStored !== false) {
    throw new Error("Private Co-Fund value estimates must not be submitted.");
  }
  if (!Array.isArray(input.participants)) {
    throw new Error("Co-Fund participants must be an array.");
  }

  const rawTargets = input.participants.map((value, index) => {
    const participant = objectValue(value, `Co-Fund participant ${index + 1}`);
    const allowedParticipantFields = new Set(["target", "participantTerms"]);
    for (const key of Object.keys(participant)) {
      if (!allowedParticipantFields.has(key)) {
        throw new Error("Co-Fund participant terms contain an unsupported or private field.");
      }
    }
    return participant.target;
  });
  const targets = validateParticipantTargets(rawTargets, {
    minimum: 2,
    maximum: 100,
    creatorParticipation: creatorParticipation as CreatorParticipation,
  });

  const participants = input.participants.map((value, index) => {
    const participant = objectValue(value, `Co-Fund participant ${index + 1}`);
    const target = targets[index]!;
    if (target.isCreator) {
      if (participant.participantTerms == null) {
        throw new Error("A participating creator must enter their own private Co-Fund terms.");
      }
      return {
        target,
        participantTerms: validateParticipantOwnedFundingTerms(
          participant.participantTerms,
          "Creator Co-Fund terms",
        ),
      };
    }
    if (participant.participantTerms != null) {
      throw new Error("A creator cannot enter another participant's private or financial terms.");
    }
    return { target, participantTerms: null };
  });

  return {
    targetAmountCents,
    allocationStatus: "open",
    creatorParticipation,
    privateValueEstimatesStored: false,
    participants,
  };
}
function validatePool(raw: unknown): ValidatedCreatePoolTerms {
  const input = objectValue(raw, "Pool terms");
  const commonGround = input.commonGround == null ? null : validateCommonGround(input.commonGround);
  if (!Array.isArray(input.thresholds) || input.thresholds.length < 1 || input.thresholds.length > 10) {
    throw new Error("A pool requires between one and ten thresholds.");
  }
  const thresholdAmountsCents = input.thresholds.map((rawThreshold, index) => {
    const threshold = objectValue(rawThreshold, `Threshold ${index + 1}`);
    return decimalToInteger(threshold.amount, 2, `Threshold ${index + 1}`, { minimum: 1 });
  });
  for (let index = 1; index < thresholdAmountsCents.length; index += 1) {
    if (thresholdAmountsCents[index]! <= thresholdAmountsCents[index - 1]!) {
      throw new Error(`Threshold ${index + 1} must be greater than threshold ${index}.`);
    }
  }

  const deadlineAt = parseDeadline(input.deadline);

  const failureBonusType = enumValue(
    input.failureBonusType,
    ["none", "fixed", "percentage", "function"] as const,
    "Failure-bonus type",
  );
  let failureBonusTerms: Record<string, unknown> = { type: failureBonusType };
  if (failureBonusType === "fixed") {
    failureBonusTerms = {
      type: failureBonusType,
      amountCents: decimalToInteger(input.failureBonusAmount, 2, "Fixed failure bonus", { minimum: 0 }),
    };
  } else if (failureBonusType === "percentage") {
    failureBonusTerms = {
      type: failureBonusType,
      rateBps: decimalToInteger(input.failureBonusPercent, 2, "Failure-bonus percentage", {
        minimum: 0,
        maximum: 10_000,
      }),
    };
  } else if (failureBonusType === "function") {
    failureBonusTerms = {
      type: failureBonusType,
      description: textValue(input.failureBonusFunction, "Failure-bonus contribution function", 1, 500),
    };
  }

  const failureTimingMode = enumValue(
    input.failureTimingMode,
    ["all", "cutoff", "firstPercent", "preset", "piecewise", "formula"] as const,
    "Failure-bonus timing mode",
  );
  let failureTimingTerms: Record<string, unknown> = { mode: failureTimingMode };
  let formula: ValidatedCreatePoolTerms["formula"] = null;

  if (failureBonusType === "none" && failureTimingMode !== "all") {
    throw new Error("A pool without a failure bonus cannot apply an early-contributor multiplier.");
  }
  if (failureTimingMode === "cutoff") {
    const method = enumValue(input.timingCutoffMethod, ["period", "date"] as const, "Timing cutoff method");
    if (method === "date") {
      const cutoffAt = parseDeadline(input.timingCutoffDate);
      if (Date.parse(cutoffAt) > Date.parse(deadlineAt)) {
        throw new Error("The failure-bonus cutoff cannot be later than the pool deadline.");
      }
      failureTimingTerms = { mode: failureTimingMode, method, cutoffAt };
    } else {
      failureTimingTerms = {
        mode: failureTimingMode,
        method,
        cutoffPeriodBps: decimalToInteger(input.timingCutoffPercent, 2, "Timing cutoff percentage", {
          minimum: 1,
          maximum: 10_000,
        }),
      };
    }
  } else if (failureTimingMode === "firstPercent") {
    failureTimingTerms = {
      mode: failureTimingMode,
      eligibleContributorShareBps: decimalToInteger(
        input.timingContributorPercent,
        2,
        "Eligible contributor share",
        { minimum: 1, maximum: 10_000 },
      ),
      rounding: "ceil_final_eligible_contributors_times_share",
      ranking: "first_accepted_contribution_per_verified_identity",
    };
  } else if (failureTimingMode === "preset") {
    failureTimingTerms = {
      mode: failureTimingMode,
      preset: enumValue(input.timingPreset, ["linear", "frontLoaded", "gentle"] as const, "Timing preset"),
    };
  } else if (failureTimingMode === "piecewise") {
    if (!Array.isArray(input.timingPiecewiseBands) || input.timingPiecewiseBands.length < 1 || input.timingPiecewiseBands.length > 6) {
      throw new Error("A piecewise timing schedule requires between one and six bands.");
    }
    let previousEndBps = 0;
    const bands = input.timingPiecewiseBands.map((rawBand, index) => {
      const band = objectValue(rawBand, `Timing band ${index + 1}`);
      const endBps = decimalToInteger(band.end, 2, `Timing band ${index + 1} end`, { minimum: 1, maximum: 10_000 });
      const multiplierBps = decimalToInteger(band.multiplier, 2, `Timing band ${index + 1} multiplier`, { minimum: 0, maximum: 10_000 });
      if (endBps <= previousEndBps) throw new Error(`Timing band ${index + 1} must end after the previous band.`);
      previousEndBps = endBps;
      return { endBps, multiplierBps };
    });
    if (previousEndBps !== 10_000) throw new Error("The final timing band must end at 100% of the funding period.");
    failureTimingTerms = { mode: failureTimingMode, bands };
  } else if (failureTimingMode === "formula") {
    if (input.timingFormulaAcknowledged !== true) {
      throw new Error("Confirm the custom-formula disclosure before submission.");
    }
    const source = textValue(input.timingFormula, "Timing formula", 1, 240);
    const validation = validateTimingFormula(source);
    if (!validation.valid || !validation.parsed) {
      throw new Error(validation.errors.join(" ") || "The timing formula is invalid.");
    }
    const hash = createHash("sha256").update(`${CREATE_FORMULA_LANGUAGE_VERSION}\n${source}`).digest("hex");
    formula = {
      source,
      languageVersion: CREATE_FORMULA_LANGUAGE_VERSION,
      hash,
      ast: validation.parsed.ast,
      variables: validation.parsed.variables,
    };
    failureTimingTerms = {
      mode: failureTimingMode,
      formulaHash: hash,
      formulaVersion: CREATE_FORMULA_LANGUAGE_VERSION,
      provisionalUntilFinalContributorCount: validation.parsed.variables.some((name) => ["n", "N", "p"].includes(name)),
    };
  }

  const progressVisibility = enumValue(
    input.progressVisibility,
    ["exact", "range", "threshold", "sealed"] as const,
    "Funding-progress visibility",
  );
  const continuation = enumValue(
    input.continuation,
    ["stop", "continue"] as const,
    "Post-threshold behavior",
  );
  const thresholdVisibility = enumValue(
    input.thresholdVisibility,
    ["public_exact"] as const,
    "Threshold visibility",
  );

  const moralTradeBonusShareBps = decimalToInteger(
    input.moralTradeBonusShare,
    2,
    "Moral Trade failure-bonus share",
    { minimum: 0, maximum: 10_000 },
  );
  if (failureBonusType === "none" && moralTradeBonusShareBps !== 0) {
    throw new Error("A pool without a failure bonus cannot request Moral Trade failure-bonus funding.");
  }

  if (commonGround) {
    if (thresholdAmountsCents.length !== 1 || thresholdAmountsCents[0] !== commonGround.targetAmountCents) {
      throw new Error("A Co-Fund requires one threshold equal to its shared target.");
    }
    if (failureBonusType !== "none" || failureTimingMode !== "all") {
      throw new Error("A Co-Fund cannot include a failure bonus or timing multiplier.");
    }
    if (continuation !== "stop") {
      throw new Error("A Co-Fund must stop at its shared target.");
    }
    if (thresholdVisibility !== "public_exact" || progressVisibility !== "exact") {
      throw new Error("A Co-Fund requires exact target and progress disclosure after approval.");
    }
    if (moralTradeBonusShareBps !== 0) {
      throw new Error("A Co-Fund cannot request Moral Trade failure-bonus funding.");
    }
  }

  return {
    commonGround,
    thresholdAmountsCents,
    deadlineAt,
    failureBonusType,
    failureBonusTerms,
    failureTimingMode,
    failureTimingTerms,
    formula,
    continuation,
    thresholdVisibility,
    progressVisibility: PROGRESS_VISIBILITY[progressVisibility],
    moralTradeBonusShareBps,
    activationRule: optionalText(input.activationRule, 240),
  };
}

function parsePayload(raw: unknown): MoralTradeCreatePayload {
  const input = objectValue(raw, "Create submission");
  if (input.interfaceVersion !== CREATE_INTERFACE_VERSION) {
    throw new Error("The Create interface version is missing or unsupported. Reload the page and try again.");
  }
  const submissionKey = textValue(input.submissionKey, "Submission key", 8, 120);
  if (!/^[A-Za-z0-9:_-]+$/.test(submissionKey)) throw new Error("Submission key contains unsupported characters.");

  return {
    interfaceVersion: CREATE_INTERFACE_VERSION,
    submissionKey,
    cause: textValue(input.cause, "Cause", 1, 140),
    requestKind: enumValue(input.requestKind, ["commitment", "skill", "fund"] as const, "Request kind"),
    fundMode: input.fundMode == null ? null : enumValue(input.fundMode, ["pledgeSwap", "redirect", "dac"] as const, "Funding structure"),
    dacPath: input.dacPath == null ? null : enumValue(input.dacPath, ["create", "existing"] as const, "Pool path"),
    requestAction: textValue(input.requestAction, "Requested action", 1, 240),
    existingPoolAmount: optionalText(input.existingPoolAmount, 80),
    existingPoolCurrency: optionalText(input.existingPoolCurrency, 16),
    offers: input.offers as CreateOfferContribution[],
    pool: input.pool == null ? null : input.pool as MoralTradeCreatePayload["pool"],
    groupContributionTerms: input.groupContributionTerms ?? null,
  };
}

function authoritativeGroupContributionOptions(
  offers: CreateOfferContribution[],
): AuthoritativeProposalOption[] {
  return offers.flatMap((offer) =>
    offer.options.map((_, index) => ({
      optionKey: `${offer.id}:${index + 1}`,
      contributionKind: offer.id === "money" ? "financial" : "nonfinancial",
    })),
  );
}

function validateGroupContributionReviewTerms(
  raw: unknown,
  offers: CreateOfferContribution[],
): {
  terms: GroupContributionProposalPayload;
  reviewRecord: GroupContributionReviewRecordFragment | null;
} {
  const rawField = raw == null ? null : JSON.stringify(raw);
  const validated = validateGroupContributionProposalForPersistence({
    rawField,
    authoritativeOptions: authoritativeGroupContributionOptions(offers),
    flags: readGroupContributionProposalFlags(),
  });
  if (!validated.ok) {
    const details = validated.issues
      .slice(0, 6)
      .map((issue) => `${issue.path || "groupContributionTerms"}: ${issue.message}`)
      .join(" ");
    throw new Error(`Group-contribution terms are invalid. ${details}`.trim());
  }

  const reviewRecord = validated.value.options.length > 0
    ? {
        [GROUP_CONTRIBUTION_REVIEW_RECORD_KEY]: {
          visibility: "private-review" as const,
          execution: "proposal-only" as const,
          canonicalJson: validated.canonicalJson,
        },
      }
    : null;

  return { terms: validated.value, reviewRecord };
}

export function validateCreatePayload(raw: unknown): ValidatedCreatePayload {
  const serialized = JSON.stringify(raw);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) {
    throw new Error("The Create submission is too large.");
  }
  const source = parsePayload(raw);
  const kind = inferKind(source);
  if (!CREATE_SUBMISSION_KINDS.includes(kind)) throw new Error("Unsupported Create submission kind.");

  if (source.requestKind !== "fund") {
    if (source.fundMode !== null || source.dacPath !== null) {
      throw new Error("Only Fund requests may select a funding structure or pool path.");
    }
  } else {
    if (!source.fundMode) throw new Error("Fund requests require a funding structure.");
    if (source.fundMode === "dac" && !source.dacPath) {
      throw new Error("Dominant assurance contract requests require a new-pool or existing-pool path.");
    }
    if (source.fundMode !== "dac" && source.dacPath !== null) {
      throw new Error("Only dominant assurance contract requests may select a pool path.");
    }
  }

  const directPool = kind === "pool_create";
  const offeredTerms = validateOffers(source.offers, !directPool);
  if (directPool && offeredTerms.length > 0) {
    throw new Error("A directly created pool cannot include reciprocal contribution options.");
  }
  const offeredSummary = directPool ? "No reciprocal contribution required." : summarizeOffers(offeredTerms);
  const groupContribution = validateGroupContributionReviewTerms(
    source.groupContributionTerms,
    offeredTerms,
  );
  const canonicalSource: MoralTradeCreatePayload = {
    ...source,
    groupContributionTerms: groupContribution.terms,
  };
  const poolTerms = directPool ? validatePool(source.pool) : null;
  if (directPool && !source.pool) throw new Error("Direct pool terms are required.");
  if (!directPool && source.pool) throw new Error("Pool terms may only be supplied for direct pool creation.");

  let existingPoolReference: string | null = null;
  let existingPoolAmountCents: number | null = null;
  let existingPoolCurrency: string | null = null;
  if (kind === "existing_pool_contribution") {
    existingPoolReference = textValue(source.requestAction, "Existing pool reference", 1, 240);
    existingPoolAmountCents = decimalToInteger(source.existingPoolAmount, 2, "Requested existing-pool contribution", { minimum: 1 });
    existingPoolCurrency = textValue(source.existingPoolCurrency, "Existing-pool currency", 1, 12).toUpperCase();
  } else if (source.existingPoolAmount) {
    throw new Error("An existing-pool contribution amount may only be used with the existing-pool path.");
  }

  const payloadHash = createHash("sha256").update(serialized).digest("hex");
  return {
    source: canonicalSource,
    kind,
    cause: source.cause,
    requestedAction: source.requestAction,
    offeredTerms,
    offeredSummary,
    existingPoolReference,
    existingPoolAmountCents,
    existingPoolCurrency,
    poolTerms,
    groupContributionTerms: groupContribution.terms,
    groupContributionReviewRecord: groupContribution.reviewRecord,
    payloadHash,
  };
}

export function createSubmissionKey() {
  return `create-${randomUUID()}`;
}
