import type { OfferRecord } from "@/lib/app-data";
import type { Offer, OfferMode } from "@/lib/offers";

export type OfferPlaneSource = "live" | "worked_example";

export interface OfferPlaneScoreExplanation {
  challenge: string[];
  credit: string[];
  return: string[];
}

export interface OfferPlaneItem {
  actionRequested: string;
  actionReturned: string;
  causeAreas: string[];
  challengeScore: number;
  creditScore: number | null;
  duration: string;
  href: string;
  id: string;
  maxExposureCents: number | null;
  mode: OfferMode;
  offererName: string;
  returnScore: number;
  scoreExplanation: OfferPlaneScoreExplanation;
  source: OfferPlaneSource;
  title: string;
  verification: string;
}

interface ChallengeInput {
  action: string;
  duration: string;
  maxExposureCents?: number | null;
  verification?: string | null;
}

interface ReturnInput {
  action: string;
  impactScore?: number | null;
  statedValueCents?: number | null;
  verification?: string | null;
}

const CAUSE_PATTERNS = [
  { label: "Vegetarianism", pattern: /vegetarian|vegan|meat[- ]?free|not eat(?:ing)? meat|animal[- ]?free diet/i },
  { label: "Animal welfare", pattern: /animal welfare|factory farm|farm animal|animal suffering/i },
  { label: "Global health", pattern: /global health|malaria|vaccin|clinic|disease|medical/i },
  { label: "Global poverty", pattern: /global poverty|poverty|basic needs|cash transfer/i },
  { label: "Climate", pattern: /climate|carbon|environment|transit|car trip|plastic/i },
  { label: "Existential risk", pattern: /existential|x-risk|extinction|catastrophic risk/i },
  { label: "Future flourishing", pattern: /future flourishing|long-run future|future generations/i },
  { label: "AI safety", pattern: /ai safety|alignment|artificial intelligence/i },
  { label: "Public health", pattern: /public health|vaccin|clinic|health campaign/i },
  { label: "Community service", pattern: /community service|volunteer|local community/i },
  { label: "Gun policy", pattern: /gun rights|gun control|firearm/i },
  { label: "Financial support", pattern: /financial support|pay \$|payment|stipend/i },
] as const;

const DURATION_SCORES: ReadonlyArray<readonly [RegExp, number, string]> = [
  [/one meal|single meal|for a meal/i, 8, "one meal"],
  [/a few meals|few meals|several meals/i, 15, "a few meals"],
  [/one day|24 hours/i, 20, "one day"],
  [/a few days|several days|three days|four days/i, 28, "a few days"],
  [/one week|7 days|two weeks|14 days/i, 34, "one to two weeks"],
  [/30 days|one month|monthly for one month/i, 45, "about one month"],
  [/3 months|three months|quarter/i, 60, "three months"],
  [/6 months|six months|half[- ]?year/i, 75, "six months"],
  [/12 months|twelve months|one year|for a year|yearly/i, 90, "twelve months"],
  [/open[- ]?ended|ongoing|indefinite|permanent/i, 96, "open-ended"],
] as const;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function compactText(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim())).join(" ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function cleanCause(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!normalized || /not needed/i.test(normalized)) return "";
  if (normalized.length > 48 || /[.!?]/.test(normalized)) return "";
  return normalized;
}

export function deriveOfferPlaneCauseAreas(values: Array<string | null | undefined>) {
  const text = compactText(values);
  const canonical = CAUSE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
  const named = values.map(cleanCause).filter(Boolean);

  return uniqueStrings([...canonical, ...named]).slice(0, 8);
}

export function scoreDurationChallenge(duration: string, action = "") {
  const text = compactText([duration, action]);
  const matches = DURATION_SCORES.filter(([pattern]) => pattern.test(text));
  const match = matches.sort((left, right) => right[1] - left[1])[0];
  return match ? { score: match[1], reason: match[2] } : { score: 36, reason: "unspecified or medium duration" };
}

function scoreActionIntensity(action: string) {
  const reasons: string[] = [];
  let score = 0;

  if (/vegan/i.test(action)) {
    score += 10;
    reasons.push("vegan commitment");
  } else if (/vegetarian|not eat(?:ing)? meat|meat[- ]?free/i.test(action)) {
    score += 6;
    reasons.push("dietary behavior change");
  }

  if (/daily|every day/i.test(action)) {
    score += 6;
    reasons.push("daily repetition");
  }
  if (/weekly|each week|two weekly/i.test(action)) {
    score += 4;
    reasons.push("weekly repetition");
  }
  if (/volunteer|hours? (?:each|per) month|hours? monthly/i.test(action)) {
    score += 7;
    reasons.push("recurring time commitment");
  }
  if (/public log|meal log|tracker|check[- ]?in|public pledge/i.test(action)) {
    score += 4;
    reasons.push("ongoing evidence burden");
  }
  if (/travel|flight|car trips?|commute|transit/i.test(action)) {
    score += 5;
    reasons.push("routine or travel change");
  }
  if (/donate\s+\d+(?:\.\d+)?%\s+of\s+(?:my|your)?\s*income/i.test(action)) {
    score += 8;
    reasons.push("income-linked commitment");
  }

  return { score, reasons };
}

function scoreVerificationBurden(verification: string | null | undefined) {
  const normalized = verification?.toLowerCase() ?? "";
  if (!normalized) return { score: 0, reason: null };
  if (normalized.includes("manual review")) return { score: 8, reason: "manual review" };
  if (normalized.includes("evidence-gated")) return { score: 7, reason: "evidence-gated" };
  if (normalized.includes("payment pending")) return { score: 6, reason: "payment and evidence checks" };
  if (normalized.includes("peer witness")) return { score: 5, reason: "peer witness" };
  if (normalized.includes("receipt")) return { score: 4, reason: "receipt evidence" };
  if (normalized.includes("public pledge")) return { score: 2, reason: "public pledge" };
  return { score: 3, reason: "named evidence requirement" };
}

function scoreMoneyChallenge(maxExposureCents: number | null | undefined) {
  if (typeof maxExposureCents !== "number" || maxExposureCents <= 0) {
    return { score: 0, reason: null };
  }

  const dollars = maxExposureCents / 100;
  const score = Math.min(34, 8 + Math.log10(dollars + 1) * 8);
  return {
    score,
    reason: `${new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(dollars)} maximum exposure`,
  };
}

export function scoreOfferChallenge(input: ChallengeInput) {
  const duration = scoreDurationChallenge(input.duration, input.action);
  const action = scoreActionIntensity(input.action);
  const verification = scoreVerificationBurden(input.verification);
  const money = scoreMoneyChallenge(input.maxExposureCents);
  const behavioralScore = duration.score + action.score + Math.min(verification.score, 4);
  const financialScore = money.score ? 18 + money.score + Math.min(verification.score, 4) : 0;
  const score = clampScore(Math.max(behavioralScore, financialScore));
  const reasons = [`Duration: ${duration.reason}`];

  reasons.push(...action.reasons);
  if (money.reason) reasons.push(money.reason);
  if (verification.reason) reasons.push(`Evidence: ${verification.reason}`);

  return { reasons: uniqueStrings(reasons), score };
}

function extractLargestDollarAmountCents(text: string) {
  const matches = [...text.matchAll(/\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/g)];
  const values = matches
    .map((match) => Number.parseFloat((match[1] ?? "").replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return values.length ? Math.round(Math.max(...values) * 100) : null;
}

function scoreMoneyReturn(cents: number | null | undefined) {
  if (typeof cents !== "number" || cents <= 0) return { score: 0, reason: null };
  const dollars = cents / 100;
  return {
    score: Math.min(38, 10 + Math.log10(dollars + 1) * 9),
    reason: `${new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(dollars)} stated value`,
  };
}

export function scoreOfferReturn(input: ReturnInput) {
  const impact = typeof input.impactScore === "number" ? Math.min(10, Math.max(0, input.impactScore)) : 5;
  const parsedMoney = extractLargestDollarAmountCents(input.action);
  const money = scoreMoneyReturn(Math.max(parsedMoney ?? 0, input.statedValueCents ?? 0));
  const verification = scoreVerificationBurden(input.verification);
  const base = impact * 6.5;
  const confidenceAdjustment = Math.min(5, verification.score * 0.5);
  const score = clampScore(base + money.score + confidenceAdjustment);
  const reasons = [`Participant-stated return: ${impact.toFixed(1)}/10`];

  if (money.reason) reasons.push(money.reason);
  if (verification.reason) reasons.push(`Evidence: ${verification.reason}`);

  return { reasons: uniqueStrings(reasons), score };
}

interface CreditProfileInput {
  karma?: number | null;
  rating?: number | null;
  ratingCount?: number | null;
  verificationBadgeCount?: number | null;
}

export function scoreOffererCredit(profile: CreditProfileInput | null | undefined) {
  if (!profile) return { reasons: ["No public offerer history"], score: null };

  const ratingCount = Math.max(0, profile.ratingCount ?? 0);
  const karma = Math.max(0, profile.karma ?? 0);
  const badgeCount = Math.max(0, profile.verificationBadgeCount ?? 0);
  const hasSignal = typeof profile.rating === "number" || ratingCount > 0 || karma > 0 || badgeCount > 0;
  if (!hasSignal) return { reasons: ["No public offerer history"], score: null };

  const rating = Math.min(5, Math.max(0, profile.rating ?? 3.5));
  const confidence = 1 - Math.exp(-ratingCount / 5);
  const bayesianRating = 3.5 * (1 - confidence) + rating * confidence;
  const ratingPoints = ratingCount > 0 ? (bayesianRating / 5) * 55 : 0;
  const historyPoints = Math.min(20, Math.log10(karma + 1) * 7);
  const badgePoints = Math.min(15, badgeCount * 4);
  const score = clampScore(10 + ratingPoints + historyPoints + badgePoints);
  const reasons = [
    ratingCount > 0
      ? `${rating.toFixed(1)}/5 rating across ${ratingCount} ${ratingCount === 1 ? "review" : "reviews"}`
      : "No completed-rating history",
  ];

  if (karma > 0) reasons.push(`${karma} public reputation points`);
  if (badgeCount > 0) reasons.push(`${badgeCount} verification ${badgeCount === 1 ? "badge" : "badges"}`);

  return { reasons, score };
}

function formatModeLabel(mode: OfferMode) {
  if (mode === "offset") return "Donation offset";
  if (mode === "payment") return "Paid action offer";
  return "Pledge swap";
}

function buildTitle(actionRequested: string, actionReturned: string, fallback: string) {
  const requested = actionRequested.trim();
  const returned = actionReturned.trim();
  if (requested && returned) {
    const compactRequested = requested.length > 72 ? `${requested.slice(0, 69).trimEnd()}…` : requested;
    const compactReturned = returned.length > 72 ? `${returned.slice(0, 69).trimEnd()}…` : returned;
    return `${compactRequested} ↔ ${compactReturned}`;
  }
  return fallback;
}

function inferExposureFromText(...values: Array<string | null | undefined>) {
  return extractLargestDollarAmountCents(compactText(values));
}

export function offerPlaneItemFromWorkedOffer(offer: Offer): OfferPlaneItem {
  const maxExposureCents =
    typeof offer.requestedMatchingAmountUsd === "number"
      ? Math.round(offer.requestedMatchingAmountUsd * 100)
      : inferExposureFromText(offer.requestAction);
  const statedValueCents =
    typeof offer.baselineAmountUsd === "number"
      ? Math.round(offer.baselineAmountUsd * 100)
      : inferExposureFromText(offer.offerAction);
  const challenge = scoreOfferChallenge({
    action: offer.requestAction,
    duration: offer.duration,
    maxExposureCents,
    verification: offer.verification,
  });
  const returned = scoreOfferReturn({
    action: offer.offerAction,
    impactScore: offer.offerImpact,
    statedValueCents,
    verification: offer.verification,
  });
  const credit = scoreOffererCredit(null);
  const causeAreas = deriveOfferPlaneCauseAreas([
    offer.offeredCause,
    offer.requestedCause,
    offer.compromiseCause,
    offer.offerAction,
    offer.requestAction,
  ]);

  return {
    actionRequested: offer.requestAction,
    actionReturned: offer.offerAction,
    causeAreas,
    challengeScore: challenge.score,
    creditScore: credit.score,
    duration: offer.duration,
    href: `/offers/examples/${offer.id}`,
    id: `worked:${offer.id}`,
    maxExposureCents,
    mode: offer.mode,
    offererName: "Worked example",
    returnScore: returned.score,
    scoreExplanation: {
      challenge: challenge.reasons,
      credit: credit.reasons,
      return: returned.reasons,
    },
    source: "worked_example",
    title: buildTitle(offer.requestAction, offer.offerAction, `${formatModeLabel(offer.mode)} example`),
    verification: offer.verification,
  };
}

export function offerPlaneItemFromOfferRecord(offer: OfferRecord): OfferPlaneItem {
  const maxExposureCents =
    offer.mode === "offset" && offer.donationOffset
      ? offer.donationOffset.requested_matching_amount_cents
      : inferExposureFromText(offer.request_action);
  const statedValueCents =
    offer.mode === "offset" && offer.donationOffset
      ? offer.donationOffset.baseline_amount_cents
      : inferExposureFromText(offer.offer_action);
  const challenge = scoreOfferChallenge({
    action: offer.request_action,
    duration: offer.duration,
    maxExposureCents,
    verification: offer.verification,
  });
  const returned = scoreOfferReturn({
    action: offer.offer_action,
    impactScore: offer.offer_impact,
    statedValueCents,
    verification: offer.verification,
  });
  const profile = offer.ownerProfile;
  const credit = scoreOffererCredit(
    profile
      ? {
          karma: profile.karma,
          rating: profile.rating,
          ratingCount: profile.ratingCount,
          verificationBadgeCount: profile.verificationBadges.length,
        }
      : null,
  );
  const causeAreas = deriveOfferPlaneCauseAreas([
    offer.offered_cause,
    offer.requested_cause,
    offer.compromise_cause,
    offer.offer_action,
    offer.request_action,
  ]);

  return {
    actionRequested: offer.request_action,
    actionReturned: offer.offer_action,
    causeAreas,
    challengeScore: challenge.score,
    creditScore: credit.score,
    duration: offer.duration,
    href: `/offers/${offer.id}`,
    id: `live:${offer.id}`,
    maxExposureCents,
    mode: offer.mode,
    offererName: profile?.resolvedName ?? offer.owner_alias ?? "Anonymous participant",
    returnScore: returned.score,
    scoreExplanation: {
      challenge: challenge.reasons,
      credit: credit.reasons,
      return: returned.reasons,
    },
    source: "live",
    title: buildTitle(offer.request_action, offer.offer_action, `${formatModeLabel(offer.mode)} offer`),
    verification: offer.verification,
  };
}
