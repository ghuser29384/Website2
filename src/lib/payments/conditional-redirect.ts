export const CONDITIONAL_REDIRECT_TERMS_VERSION =
  "conditional-redirect-v1-2026-07-23";

export const CONDITIONAL_REDIRECT_MIN_DEADLINE_MS = 30 * 60 * 1000;
export const CONDITIONAL_REDIRECT_MAX_DEADLINE_MS = 30 * 24 * 60 * 60 * 1000;
export const CONDITIONAL_REDIRECT_DEFAULT_DEADLINE_MS = 7 * 24 * 60 * 60 * 1000;
export const CONDITIONAL_REDIRECT_GRACE_MS = 15 * 60 * 1000;
export const CONDITIONAL_REDIRECT_RECOVERY_MS = 15 * 60 * 1000;
export const CONDITIONAL_REDIRECT_MIN_AMOUNT_CENTS = 50;

export type ConditionalRedirectKind = "redirection" | "matching_donation";

export interface ConditionalRedirectTerms {
  creatorAmountCents: number;
  matcherAmountCents: number;
  fallbackDestinationId: string;
  matchedDestinationId: string;
  deadlineAt: string;
  currency: "usd";
}

export interface ConditionalRedirectCandidate {
  id: string;
  setupSucceededAt: string;
  stripeEventCreatedAt: string;
  stripeEventId: string;
}

function timestamp(value: string, label: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid timestamp.`);
  return parsed;
}

export function conditionalRedirectKind(
  fallbackDestinationId: string,
  matchedDestinationId: string,
): ConditionalRedirectKind {
  return fallbackDestinationId === matchedDestinationId
    ? "matching_donation"
    : "redirection";
}

export function validateConditionalRedirectTerms(
  terms: ConditionalRedirectTerms,
  now = Date.now(),
) {
  const errors: string[] = [];
  if (
    !Number.isInteger(terms.creatorAmountCents) ||
    terms.creatorAmountCents < CONDITIONAL_REDIRECT_MIN_AMOUNT_CENTS
  ) {
    errors.push("Creator amount must be at least $0.50 in whole cents.");
  }
  if (
    !Number.isInteger(terms.matcherAmountCents) ||
    terms.matcherAmountCents < CONDITIONAL_REDIRECT_MIN_AMOUNT_CENTS
  ) {
    errors.push("Matcher amount must be at least $0.50 in whole cents.");
  }
  if (!terms.fallbackDestinationId) errors.push("Choose a fallback charity.");
  if (!terms.matchedDestinationId) errors.push("Choose a matched charity.");
  if (terms.currency !== "usd") errors.push("The initial conditional-redirect rail supports USD only.");

  const deadline = timestamp(terms.deadlineAt, "Deadline");
  const delay = deadline - now;
  if (delay < CONDITIONAL_REDIRECT_MIN_DEADLINE_MS) {
    errors.push("Deadline must be at least 30 minutes away.");
  }
  if (delay > CONDITIONAL_REDIRECT_MAX_DEADLINE_MS) {
    errors.push("Deadline cannot be more than 30 days away.");
  }
  return errors;
}

export function arbitrationClosesAt(deadlineAt: string) {
  return new Date(timestamp(deadlineAt, "Deadline") + CONDITIONAL_REDIRECT_GRACE_MS).toISOString();
}

export function candidateWasEligible(
  candidate: ConditionalRedirectCandidate,
  deadlineAt: string,
) {
  return timestamp(candidate.setupSucceededAt, "Setup completion") <=
    timestamp(deadlineAt, "Deadline");
}

export function rankConditionalRedirectCandidates(
  candidates: ConditionalRedirectCandidate[],
  deadlineAt: string,
) {
  return candidates
    .filter((candidate) => candidateWasEligible(candidate, deadlineAt))
    .sort((left, right) => {
      const providerTime =
        timestamp(left.stripeEventCreatedAt, "Stripe event time") -
        timestamp(right.stripeEventCreatedAt, "Stripe event time");
      if (providerTime !== 0) return providerTime;
      const setupTime =
        timestamp(left.setupSucceededAt, "Setup completion") -
        timestamp(right.setupSucceededAt, "Setup completion");
      if (setupTime !== 0) return setupTime;
      const eventOrder = left.stripeEventId.localeCompare(right.stripeEventId);
      return eventOrder !== 0 ? eventOrder : left.id.localeCompare(right.id);
    });
}

export function creatorRecoveryEndsAt(failedAt: string) {
  return new Date(timestamp(failedAt, "Failure time") + CONDITIONAL_REDIRECT_RECOVERY_MS).toISOString();
}

export function conditionalRedirectOutcomeCopy(terms: ConditionalRedirectTerms) {
  const kind = conditionalRedirectKind(
    terms.fallbackDestinationId,
    terms.matchedDestinationId,
  );
  return kind === "matching_donation"
    ? {
        kind,
        headline: `Unlock an additional $${(terms.matcherAmountCents / 100).toFixed(2)}`,
        matchedSummary: `Two linked donations totaling $${(
          (terms.creatorAmountCents + terms.matcherAmountCents) /
          100
        ).toFixed(2)} go to the same charity.`,
      }
    : {
        kind,
        headline: `Redirect $${(terms.creatorAmountCents / 100).toFixed(2)} by adding $${(
          terms.matcherAmountCents / 100
        ).toFixed(2)}`,
        matchedSummary: `$${(
          (terms.creatorAmountCents + terms.matcherAmountCents) /
          100
        ).toFixed(2)} goes to the matched charity instead of the creator's fallback charity.`,
      };
}
