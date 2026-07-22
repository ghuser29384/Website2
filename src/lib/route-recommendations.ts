import type { LiveNowRecommendation } from "./live-now-recommendations";
import { clamp, normalizeRecommendationText } from "./recommendation-learning";

export const ROUTE_FORMATS = [
  "direct",
  "threshold",
  "redirect",
  "personal",
  "coalition",
] as const;

export type RouteFormat = (typeof ROUTE_FORMATS)[number];
export type RouteHorizon = "day" | "week" | "month" | "quarter" | "year";
export type RouteEvidencePreference = "standard" | "high" | "connected";
export type RouteUncertaintyPreference = "conservative" | "balanced" | "exploratory";
type RouteSourceUncertainty = RouteUncertaintyPreference | "unknown";
export type RouteInteractionPreference = "solo" | "open" | "invite";
type RouteSourcePrivacy = RouteRecommendationProfile["privacyPreference"] | "unknown";
export type RouteComparisonChoice = "left" | "right" | "equal" | "neither" | "unsure";
export type RoutePlannerStatus =
  | "needing_profile"
  | "needs_baseline"
  | "ready"
  | "no_live_routes";

export interface RoutePairwiseAnswer {
  comparisonId: string;
  leftFormat: RouteFormat;
  rightFormat: RouteFormat;
  choice: RouteComparisonChoice;
}

/** The persisted, private route_recommendation_profiles shape used by production. */
export interface RouteRecommendationProfileRow {
  goal?: unknown;
  cause_priorities?: unknown;
  money_budget_cents?: unknown;
  time_budget_minutes?: unknown;
  action_budget_count?: unknown;
  horizon?: unknown;
  route_formats?: unknown;
  evidence_preference?: unknown;
  uncertainty_preference?: unknown;
  interaction_preference?: unknown;
  privacy_preference?: unknown;
  planned_donation_baseline?: unknown;
  planned_donation_cents?: unknown;
  otherwise_baseline?: unknown;
  pairwise_answers?: unknown;
  interview_answers?: unknown;
  [key: string]: unknown;
}

export interface RouteRecommendationProfile {
  goal: string;
  causePriorities: string[];
  moneyBudgetCents: number | null;
  timeBudgetMinutes: number | null;
  actionBudgetCount: number | null;
  horizon: RouteHorizon | null;
  routeFormats: RouteFormat[];
  evidencePreference: RouteEvidencePreference;
  uncertaintyPreference: RouteUncertaintyPreference;
  interactionPreference: RouteInteractionPreference;
  privacyPreference: "private" | "public-safe" | "public";
  plannedDonationBaseline: boolean | null;
  plannedDonationCents: number | null;
  otherwiseBaseline: string;
  pairwiseAnswers: Record<string, RoutePairwiseAnswer>;
  interviewAnswers: Record<string, unknown>;
}

export interface RouteBurden {
  moneyCents: number;
  timeMinutes: number;
  actionCount: number;
  moneyCertainty: "stated" | "parsed" | "not_applicable" | "unknown";
  timeCertainty: "stated" | "parsed" | "conservative_default" | "unknown";
  actionCertainty: "stated" | "parsed" | "conservative_default" | "unknown";
  basis: string[];
}

export interface RouteComponentMetric {
  value: number;
  label: string;
  basis: string;
}

export interface RouteComponents {
  fit: RouteComponentMetric;
  friction: RouteComponentMetric;
  evidence: RouteComponentMetric;
  coordination: RouteComponentMetric;
}

export interface FeasibleLiveRouteStep {
  sourceId: string;
  sourceKey: string;
  sourceType: LiveNowRecommendation["opportunityType"];
  sourceLabel: string;
  href: string;
  ctaLabel: string;
  title: string;
  summary: string;
  routeFormat: RouteFormat;
  burden: RouteBurden;
  evidenceLevel: RouteEvidencePreference;
  requiresInteraction: boolean;
  requiresPlannedDonationBaseline: boolean;
  components: RouteComponents;
  live: true;
}

export type RouteLabel = "Best fit" | "Lowest friction" | "Live coordination";

export interface ComposedLiveRoute {
  id: string;
  label: RouteLabel;
  steps: FeasibleLiveRouteStep[];
  totals: Pick<RouteBurden, "moneyCents" | "timeMinutes" | "actionCount">;
  components: RouteComponents;
  rationale: string;
}

export interface RouteActiveComparisonSide {
  sourceId: string;
  routeFormat: RouteFormat;
  title: string;
  burden: Pick<RouteBurden, "moneyCents" | "timeMinutes" | "actionCount">;
}

export interface RouteActiveComparison {
  id: string;
  prompt: string;
  left: RouteActiveComparisonSide;
  right: RouteActiveComparisonSide;
  choices: readonly RouteComparisonChoice[];
}

export type RouteBlockReason =
  | "not_executable"
  | "route_format"
  | "money_budget"
  | "time_budget"
  | "action_budget"
  | "horizon"
  | "evidence"
  | "interaction"
  | "uncertainty"
  | "privacy"
  | "already_planned"
  | "planned_donation_baseline"
  | "planned_donation_amount";

export interface BlockedLiveRouteSource {
  sourceId: string;
  reasons: RouteBlockReason[];
}

export interface RoutePlannerResult {
  status: RoutePlannerStatus;
  checkedAt: string;
  profile: RouteRecommendationProfile;
  missingProfileFields: string[];
  steps: FeasibleLiveRouteStep[];
  routes: ComposedLiveRoute[];
  activeComparison: RouteActiveComparison | null;
  blockedSources: BlockedLiveRouteSource[];
  liveSourceIds: string[];
  requiresBaselineForSourceIds: string[];
}

const EVIDENCE_RANK: Record<RouteEvidencePreference, number> = {
  standard: 1,
  high: 2,
  connected: 3,
};
const HORIZONS = new Set<RouteHorizon>(["day", "week", "month", "quarter", "year"]);
const EVIDENCE_PREFERENCES = new Set<RouteEvidencePreference>([
  "standard",
  "high",
  "connected",
]);
const UNCERTAINTY_PREFERENCES = new Set<RouteUncertaintyPreference>([
  "conservative",
  "balanced",
  "exploratory",
]);
const INTERACTION_PREFERENCES = new Set<RouteInteractionPreference>([
  "solo",
  "open",
  "invite",
]);
const PRIVACY_PREFERENCES = new Set<RouteRecommendationProfile["privacyPreference"]>([
  "private",
  "public-safe",
  "public",
]);
const COMPARISON_CHOICES = ["left", "right", "equal", "neither", "unsure"] as const;
const COMPARISON_CHOICE_SET = new Set<RouteComparisonChoice>(COMPARISON_CHOICES);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstDefined(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function cleanPrivateText(value: unknown, maximum: number) {
  const cleaned = cleanText(value, maximum);
  if (
    cleaned === "[encrypted private field]" ||
    cleaned === "[encrypted private field unavailable]" ||
    cleaned.startsWith("bgenc:v1:") ||
    cleaned.startsWith("bgenc:v2:")
  ) {
    return "";
  }
  return cleaned;
}

function cleanStringArray(value: unknown, maximumItems = 24) {
  if (!Array.isArray(value)) return [] as string[];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const label = cleanPrivateText(item, 120);
    const key = normalizeRecommendationText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= maximumItems) break;
  }

  return result;
}

function nonNegativeInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(number));
}

function nullableBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeRouteFormats(value: unknown) {
  if (!Array.isArray(value)) return [] as RouteFormat[];
  return [...new Set(value.filter((item): item is RouteFormat => ROUTE_FORMATS.includes(item as RouteFormat)))];
}

function routeFormatFromComparisonKey(value: string) {
  return value
    .split(/[:|/]/)
    .filter((part): part is RouteFormat => ROUTE_FORMATS.includes(part as RouteFormat));
}

function normalizePairwiseAnswers(value: unknown) {
  const answers: Record<string, RoutePairwiseAnswer> = {};
  const seenPairs = new Set<string>();
  for (const [comparisonId, rawAnswer] of Object.entries(asRecord(value))) {
    if (Object.keys(answers).length >= 10) break;
    const answer = asRecord(rawAnswer);
    const formatsFromKey = routeFormatFromComparisonKey(comparisonId);
    const leftFormat = firstDefined(answer, "leftFormat", "left_format") ?? formatsFromKey[0];
    const rightFormat = firstDefined(answer, "rightFormat", "right_format") ?? formatsFromKey[1];
    const rawChoice = typeof rawAnswer === "string"
      ? rawAnswer
      : firstDefined(answer, "choice", "answer");

    if (
      !ROUTE_FORMATS.includes(leftFormat as RouteFormat) ||
      !ROUTE_FORMATS.includes(rightFormat as RouteFormat) ||
      leftFormat === rightFormat ||
      !COMPARISON_CHOICE_SET.has(rawChoice as RouteComparisonChoice)
    ) {
      continue;
    }

    const pairKey = [leftFormat, rightFormat].sort().join(":");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    answers[comparisonId.slice(0, 180)] = {
      comparisonId: comparisonId.slice(0, 180),
      leftFormat: leftFormat as RouteFormat,
      rightFormat: rightFormat as RouteFormat,
      choice: rawChoice as RouteComparisonChoice,
    };
  }
  return answers;
}

function uniqueFallbackCauses(values: readonly string[]) {
  return cleanStringArray([...values]);
}

/**
 * Converts database rows (and the camel-case result itself) into one bounded,
 * privacy-safe shape. Missing values stay visible instead of silently becoming
 * permissive budgets or a claimed donation baseline.
 */
export function normalizeRouteRecommendationProfile(
  row: RouteRecommendationProfileRow | RouteRecommendationProfile | null | undefined,
  fallbackCauses: readonly string[] = [],
): RouteRecommendationProfile {
  const record = asRecord(row);
  const causePriorities = cleanStringArray(
    firstDefined(record, "cause_priorities", "causePriorities"),
  );
  const routeFormats = normalizeRouteFormats(firstDefined(record, "route_formats", "routeFormats"));
  const horizon = firstDefined(record, "horizon");
  const evidencePreference = firstDefined(record, "evidence_preference", "evidencePreference");
  const uncertaintyPreference = firstDefined(
    record,
    "uncertainty_preference",
    "uncertaintyPreference",
  );
  const interactionPreference = firstDefined(
    record,
    "interaction_preference",
    "interactionPreference",
  );
  const privacyPreference = firstDefined(record, "privacy_preference", "privacyPreference");

  return {
    goal: cleanPrivateText(firstDefined(record, "goal"), 500),
    causePriorities: causePriorities.length
      ? causePriorities
      : uniqueFallbackCauses(fallbackCauses),
    moneyBudgetCents: nonNegativeInteger(
      firstDefined(record, "money_budget_cents", "moneyBudgetCents"),
    ),
    timeBudgetMinutes: nonNegativeInteger(
      firstDefined(record, "time_budget_minutes", "timeBudgetMinutes"),
    ),
    actionBudgetCount: nonNegativeInteger(
      firstDefined(record, "action_budget_count", "actionBudgetCount"),
    ),
    horizon: HORIZONS.has(horizon as RouteHorizon) ? (horizon as RouteHorizon) : null,
    routeFormats,
    evidencePreference: EVIDENCE_PREFERENCES.has(evidencePreference as RouteEvidencePreference)
      ? (evidencePreference as RouteEvidencePreference)
      : "standard",
    uncertaintyPreference: UNCERTAINTY_PREFERENCES.has(
      uncertaintyPreference as RouteUncertaintyPreference,
    )
      ? (uncertaintyPreference as RouteUncertaintyPreference)
      : "conservative",
    interactionPreference: INTERACTION_PREFERENCES.has(
      interactionPreference as RouteInteractionPreference,
    )
      ? (interactionPreference as RouteInteractionPreference)
      : "solo",
    privacyPreference: PRIVACY_PREFERENCES.has(
      privacyPreference as RouteRecommendationProfile["privacyPreference"],
    )
      ? (privacyPreference as RouteRecommendationProfile["privacyPreference"])
      : "private",
    plannedDonationBaseline: nullableBoolean(
      firstDefined(record, "planned_donation_baseline", "plannedDonationBaseline"),
    ),
    plannedDonationCents: nonNegativeInteger(
      firstDefined(record, "planned_donation_cents", "plannedDonationCents"),
    ),
    otherwiseBaseline: cleanPrivateText(
      firstDefined(record, "otherwise_baseline", "otherwiseBaseline"),
      1_000,
    ),
    pairwiseAnswers: normalizePairwiseAnswers(
      firstDefined(record, "pairwise_answers", "pairwiseAnswers"),
    ),
    interviewAnswers: asRecord(
      firstDefined(record, "interview_answers", "interviewAnswers"),
    ),
  };
}

function metadataNumber(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = nonNegativeInteger(metadata[key]);
    if (value !== null) return value;
  }
  return null;
}

function maximumNumber(matches: Iterable<number>) {
  let maximum: number | null = null;
  for (const match of matches) {
    if (!Number.isFinite(match) || match < 0) continue;
    maximum = maximum === null ? match : Math.max(maximum, match);
  }
  return maximum;
}

function parsedCurrencyCents(text: string) {
  const values: number[] = [];
  for (const match of text.matchAll(
    /\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:-|–|—|to)\s*\$?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
  )) {
    const upperAmount = Number((match[2] ?? "").replaceAll(",", ""));
    if (Number.isFinite(upperAmount)) values.push(Math.round(upperAmount * 100));
  }
  const patterns = [
    /\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
    /\b(?:usd)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
    /\b([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:dollars?|usd)\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const amount = Number((match[1] ?? "").replaceAll(",", ""));
      if (Number.isFinite(amount)) values.push(Math.round(amount * 100));
    }
  }
  return maximumNumber(values);
}

function parsedAdditiveCurrencyCents(text: string) {
  const values: number[] = [];
  const amounts = [...text.matchAll(/\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/g)]
    .map((match) => Number((match[1] ?? "").replaceAll(",", "")))
    .filter(Number.isFinite);
  if (amounts.length > 1 && /(?:\b(?:and|plus)\b|\+|,)/i.test(text)) {
    values.push(Math.round(amounts.reduce((sum, amount) => sum + amount, 0) * 100));
  }
  return maximumNumber(values);
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const RECURRENCE_UNIT_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 31,
  year: 372,
};

function parsedNumberToken(value: string | undefined) {
  const token = (value ?? "").toLowerCase();
  return NUMBER_WORDS[token] ?? Number(token);
}

function recurringUnit(value: string | undefined) {
  const token = (value ?? "").toLowerCase();
  if (token === "daily") return "day";
  if (token === "weekly") return "week";
  if (token === "monthly") return "month";
  if (token === "yearly" || token === "annually") return "year";
  return token.replace(/s$/, "");
}

function recurrenceOccurrences(
  frequencyValue: string | undefined,
  durationCountValue: string | undefined,
  durationValue: string | undefined,
) {
  const frequency = recurringUnit(frequencyValue);
  const durationUnit = recurringUnit(durationValue);
  const durationCount = parsedNumberToken(durationCountValue);
  const frequencyDays = RECURRENCE_UNIT_DAYS[frequency];
  const durationDays = RECURRENCE_UNIT_DAYS[durationUnit] * durationCount;
  if (
    !Number.isFinite(durationCount) ||
    !Number.isFinite(durationDays) ||
    !Number.isFinite(frequencyDays) ||
    frequencyDays <= 0
  ) {
    return null;
  }
  return Math.max(1, Math.ceil(durationDays / frequencyDays));
}

function boundedRecurrenceOccurrences(text: string) {
  const values: number[] = [];
  for (const match of text.matchAll(
    /(?:\/\s*|\bper\s+|\beach\s+)(day|week|month|year)\b\s+for\s+([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/gi,
  )) {
    const occurrences = recurrenceOccurrences(match[1], match[2], match[3]);
    if (occurrences !== null) values.push(occurrences);
  }
  for (const match of text.matchAll(
    /\b(daily|weekly|monthly|yearly|annually)\b\s+for\s+([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/gi,
  )) {
    const occurrences = recurrenceOccurrences(match[1], match[2], match[3]);
    if (occurrences !== null) values.push(occurrences);
  }
  return maximumNumber(values);
}

function hasRecurringCurrencyPhrase(text: string) {
  return /\$\s*[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?\s*(?:(?:\/\s*|per\s+|each\s+)(?:day|week|month|year)\b|(?:daily|weekly|monthly|yearly|annually)\b)/i.test(
    text,
  );
}

function hasRecurringTimePhrase(text: string) {
  return /\b[0-9]+(?:\.[0-9]+)?\s*(?:minutes?|mins?|hours?|hrs?)\s*(?:(?:\/\s*|per\s+|each\s+)(?:day|week|month|year)\b|(?:daily|weekly|monthly|yearly|annually)\b)/i.test(
    text,
  );
}

function parsedRecurringCurrencyCents(text: string) {
  const values: number[] = [];
  for (const match of text.matchAll(
    /\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:\/\s*|per\s+|each\s+)(day|week|month|year)\b\s+for\s+([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/gi,
  )) {
    const amount = Number((match[1] ?? "").replaceAll(",", ""));
    const occurrences = recurrenceOccurrences(match[2], match[3], match[4]);
    if (Number.isFinite(amount) && occurrences !== null) {
      values.push(Math.round(amount * occurrences * 100));
    }
  }
  for (const match of text.matchAll(
    /\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s+(daily|weekly|monthly|yearly|annually)\b\s+for\s+([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/gi,
  )) {
    const amount = Number((match[1] ?? "").replaceAll(",", ""));
    const occurrences = recurrenceOccurrences(match[2], match[3], match[4]);
    if (Number.isFinite(amount) && occurrences !== null) {
      values.push(Math.round(amount * occurrences * 100));
    }
  }
  return maximumNumber(values);
}

function parsedRecurringTimeMinutes(text: string) {
  const values: number[] = [];
  for (const match of text.matchAll(
    /\b([0-9]+(?:\.[0-9]+)?)\s*(minutes?|mins?|hours?|hrs?)\s*(?:\/\s*|per\s+|each\s+)(day|week|month|year)\b\s+for\s+([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/gi,
  )) {
    const amount = Number(match[1]);
    const occurrences = recurrenceOccurrences(match[3], match[4], match[5]);
    if (Number.isFinite(amount) && occurrences !== null) {
      values.push((normalizeRecommendationText(match[2]).startsWith("h") ? amount * 60 : amount) * occurrences);
    }
  }
  for (const match of text.matchAll(
    /\b([0-9]+(?:\.[0-9]+)?)\s*(minutes?|mins?|hours?|hrs?)\s+(daily|weekly|monthly|yearly|annually)\b\s+for\s+([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/gi,
  )) {
    const amount = Number(match[1]);
    const occurrences = recurrenceOccurrences(match[3], match[4], match[5]);
    if (Number.isFinite(amount) && occurrences !== null) {
      values.push((normalizeRecommendationText(match[2]).startsWith("h") ? amount * 60 : amount) * occurrences);
    }
  }
  return maximumNumber(values);
}

function parsedTimeMinutes(text: string) {
  const recurring = parsedRecurringTimeMinutes(text);
  const values: number[] = recurring === null ? [] : [recurring];
  for (const match of text.matchAll(
    /\b([0-9]+(?:\.[0-9]+)?)\s*(minutes?|mins?|hours?|hrs?)\b[^.;]{0,50}?\b(?:and|plus)\b[^.;]{0,30}?\b([0-9]+(?:\.[0-9]+)?)\s*(minutes?|mins?|hours?|hrs?)\b/gi,
  )) {
    const left = Number(match[1]);
    const right = Number(match[3]);
    const leftUnit = normalizeRecommendationText(match[2]);
    const rightUnit = normalizeRecommendationText(match[4]);
    if (Number.isFinite(left) && Number.isFinite(right)) {
      values.push(
        (leftUnit.startsWith("h") ? left * 60 : left) +
          (rightUnit.startsWith("h") ? right * 60 : right),
      );
    }
  }
  for (const match of text.matchAll(
    /\b([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|to)\s*([0-9]+(?:\.[0-9]+)?)\s*(minutes?|mins?|hours?|hrs?)\b/gi,
  )) {
    const amount = Number(match[2]);
    const unit = normalizeRecommendationText(match[3]);
    values.push(unit.startsWith("h") ? amount * 60 : amount);
  }
  for (const match of text.matchAll(
    /\b([0-9]+(?:\.[0-9]+)?)\s*(minutes?|mins?|hours?|hrs?)\b/gi,
  )) {
    const amount = Number(match[1]);
    const unit = normalizeRecommendationText(match[2]);
    values.push(unit.startsWith("h") ? amount * 60 : amount);
  }
  const maximum = maximumNumber(values);
  return maximum === null ? null : Math.ceil(maximum);
}

function hasUnsupportedCurrency(text: string) {
  return /[£€¥₹₽₩₦₱฿₫]|\b(?:eur|gbp|jpy|cad|aud|nzd|chf|cny|inr)\b/i.test(text);
}

function parsedActionCount(text: string) {
  const values: number[] = [];
  for (const match of text.matchAll(
    /\b([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:-|–|—|to)\s*([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(actions?|meals?|days?|weeks?|months?|sessions?|reviews?|calls?|shifts?|tasks?|invitations?)\b/gi,
  )) {
    const token = (match[2] ?? "").toLowerCase();
    values.push(NUMBER_WORDS[token] ?? Number(token));
  }
  const namedActions = [...text.matchAll(
    /\b([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(actions?|meals?|days?|weeks?|months?|sessions?|reviews?|calls?|shifts?|tasks?|invitations?)\b/gi,
  )]
    .map((match) => {
      const token = (match[1] ?? "").toLowerCase();
      return NUMBER_WORDS[token] ?? Number(token);
    })
    .filter(Number.isFinite);
  if (namedActions.length > 1 && /(?:\b(?:and|plus)\b|\+|,)/i.test(text)) {
    values.push(namedActions.reduce((sum, count) => sum + count, 0));
  }
  for (const match of text.matchAll(
    /\b([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(actions?|meals?|days?|weeks?|months?|sessions?|reviews?|calls?|shifts?|tasks?|invitations?)\b/gi,
  )) {
    const token = (match[1] ?? "").toLowerCase();
    values.push(NUMBER_WORDS[token] ?? Number(token));
  }
  const maximum = maximumNumber(values);
  return maximum === null ? null : Math.max(1, Math.ceil(maximum));
}

function recommendationRouteFormat(recommendation: LiveNowRecommendation): RouteFormat | null {
  const metadata = asRecord(recommendation.metadata);
  const explicit = firstDefined(metadata, "routeFormat", "route_format");
  if (ROUTE_FORMATS.includes(explicit as RouteFormat)) return explicit as RouteFormat;
  if (metadata.coalition === true) return "coalition";
  if (recommendation.opportunityType === "donation_pool") return "threshold";
  if (recommendation.opportunityType === "donation_redirect" || recommendation.mode === "offset") {
    return "redirect";
  }
  if (recommendation.opportunityType !== "offer") return null;
  return recommendation.mode === "pledge" ? "personal" : "direct";
}

function isPlannedDonationRoute(recommendation: LiveNowRecommendation) {
  return (
    recommendation.opportunityType === "donation_redirect" ||
    recommendation.opportunityType === "donation_pool" ||
    recommendation.mode === "offset"
  );
}

function isMoneyBearingRequest(recommendation: LiveNowRecommendation, format: RouteFormat) {
  if (format === "redirect" || format === "threshold") return true;
  return /\b(donat(?:e|ion)|fund|pay|payment|contribut(?:e|ion)|spend|commit money)\b/i.test(
    recommendation.requestAction,
  );
}

/**
 * Parses only the user's requested side of a live opportunity. Offered benefits,
 * pool-wide thresholds, and elapsed deadlines are deliberately not counted as
 * the user's burden. Ranges use their upper endpoint.
 */
export function parseConservativeRouteBurden(
  recommendation: LiveNowRecommendation,
  profile?: RouteRecommendationProfile,
): RouteBurden {
  const metadata = asRecord(recommendation.metadata);
  const statedBurden = cleanText(
    firstDefined(metadata, "maximumBurden", "maximum_burden", "userBurden", "user_burden"),
    240,
  );
  const burdenTexts = [statedBurden, recommendation.requestAction]
    .map((value) => value.trim())
    .filter(Boolean);
  const duration = recommendation.duration.trim();
  const recurrenceTexts = [
    ...burdenTexts,
    ...burdenTexts.map((value) => (duration ? `${value} for ${duration}` : value)),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const format = recommendationRouteFormat(recommendation) ?? "direct";
  const statedMoney = metadataNumber(metadata, [
    "userMoneyCents",
    "user_money_cents",
    "maximumMoneyCents",
    "maximum_money_cents",
    "requiredAmountCents",
    "required_amount_cents",
  ]);
  const statedTime = metadataNumber(metadata, [
    "userTimeMinutes",
    "user_time_minutes",
    "maximumTimeMinutes",
    "maximum_time_minutes",
  ]);
  const statedActions = metadataNumber(metadata, [
    "userActionCount",
    "user_action_count",
    "maximumActionCount",
    "maximum_action_count",
  ]);
  const parsedRecurringMoney = maximumNumber(
    recurrenceTexts
      .map(parsedRecurringCurrencyCents)
      .filter((value): value is number => value !== null),
  );
  const parsedMoney = maximumNumber(
    burdenTexts
      .flatMap((value) => [
        parsedCurrencyCents(value),
        parsedAdditiveCurrencyCents(value),
      ])
      .concat(parsedRecurringMoney)
      .filter((value): value is number => value !== null),
  );
  const parsedRecurringTime = maximumNumber(
    recurrenceTexts
      .map(parsedRecurringTimeMinutes)
      .filter((value): value is number => value !== null),
  );
  const parsedTime = maximumNumber(
    burdenTexts
      .map(parsedTimeMinutes)
      .concat(parsedRecurringTime)
      .filter((value): value is number => value !== null),
  );
  const parsedRecurringActions = maximumNumber(
    recurrenceTexts
      .map(boundedRecurrenceOccurrences)
      .filter((value): value is number => value !== null),
  );
  const parsedActions = maximumNumber(
    burdenTexts
      .map(parsedActionCount)
      .concat(parsedRecurringActions)
      .filter((value): value is number => value !== null),
  );
  const moneyBearing = isMoneyBearingRequest(recommendation, format);
  const unsupportedCurrency = burdenTexts.some(hasUnsupportedCurrency);
  const recurringMoneyPresent = burdenTexts.some(hasRecurringCurrencyPhrase);
  const recurringTimePresent = burdenTexts.some(hasRecurringTimePhrase);
  const plannedDonationFallback = isPlannedDonationRoute(recommendation)
    ? profile?.plannedDonationCents ?? null
    : null;
  const knownMoney = [statedMoney, parsedMoney, plannedDonationFallback].filter(
    (value): value is number => value !== null,
  );
  const moneyCents = maximumNumber(knownMoney) ?? 0;
  const unboundedMoneyRecurrence =
    recurringMoneyPresent &&
    parsedRecurringMoney === null &&
    statedMoney === null &&
    plannedDonationFallback === null;
  const unboundedTimeRecurrence =
    recurringTimePresent && parsedRecurringTime === null && statedTime === null;
  const unboundedActionRecurrence =
    (recurringMoneyPresent || recurringTimePresent) &&
    parsedRecurringActions === null &&
    statedActions === null;
  const difficultyDefault = Math.ceil(clamp(recommendation.difficulty, 1, 5) * 30);
  const timeMinutes = maximumNumber(
    [statedTime, parsedTime].filter((value): value is number => value !== null),
  ) ?? (moneyBearing ? Math.max(15, difficultyDefault) : difficultyDefault);
  const actionCount = Math.max(
    1,
    maximumNumber(
      [statedActions, parsedActions].filter((value): value is number => value !== null),
    ) ?? 1,
  );
  const moneyCertainty: RouteBurden["moneyCertainty"] = unsupportedCurrency || unboundedMoneyRecurrence
    ? "unknown"
    : statedMoney !== null && (parsedMoney === null || statedMoney >= parsedMoney)
    ? "stated"
    : parsedMoney !== null
      ? "parsed"
      : moneyBearing && plannedDonationFallback === null
        ? "unknown"
        : moneyBearing
          ? "stated"
          : "not_applicable";
  const basis = [
    statedBurden
      ? "Each burden dimension uses the larger stated value found in the maximum-burden field or requested action."
      : "Only the requested action was parsed; offered benefits and deadlines were excluded.",
  ];
  if (unsupportedCurrency) {
    basis.push("A non-USD amount could not be converted safely, so the monetary burden is unknown.");
  }
  if (unboundedMoneyRecurrence || unboundedTimeRecurrence || unboundedActionRecurrence) {
    basis.push("A recurring obligation had no usable maximum duration, so the affected cap is unknown.");
  }
  if (plannedDonationFallback !== null && statedMoney === null && parsedMoney === null) {
    basis.push("The full confirmed planned-donation amount was used as a conservative ceiling.");
  }
  if (statedTime === null && parsedTime === null) {
    basis.push(
      moneyBearing
        ? "Fifteen minutes was reserved for the transaction because no handling time was stated."
        : "A conservative time allowance was derived from the listing's 1–5 difficulty estimate.",
    );
  }

  return {
    moneyCents,
    timeMinutes,
    actionCount,
    moneyCertainty,
    timeCertainty: unboundedTimeRecurrence
      ? "unknown"
      : statedTime !== null && (parsedTime === null || statedTime >= parsedTime)
        ? "stated"
        : parsedTime !== null
          ? "parsed"
          : "conservative_default",
    actionCertainty: unboundedActionRecurrence
      ? "unknown"
      : statedActions !== null && (parsedActions === null || statedActions >= parsedActions)
        ? "stated"
        : parsedActions !== null
          ? "parsed"
          : "conservative_default",
    basis,
  };
}

function evidenceLevel(recommendation: LiveNowRecommendation): RouteEvidencePreference {
  const metadata = asRecord(recommendation.metadata);
  const explicit = firstDefined(metadata, "evidenceLevel", "evidence_level");
  if (explicit === "standard" || explicit === "high") {
    return explicit as RouteEvidencePreference;
  }
  if (
    /\b(verified|third[- ]party|receipt|witness|livestream|time[- ]?stamp|photo|video|audit|counterparty confirmation)\b/i.test(
      recommendation.verification,
    )
  ) {
    return "high";
  }
  return "standard";
}

function uncertaintyLevel(recommendation: LiveNowRecommendation): RouteSourceUncertainty {
  const metadata = asRecord(recommendation.metadata);
  const explicit = firstDefined(metadata, "uncertaintyLevel", "uncertainty_level");
  return UNCERTAINTY_PREFERENCES.has(explicit as RouteUncertaintyPreference)
    ? (explicit as RouteUncertaintyPreference)
    : "unknown";
}

const HORIZON_DAYS: Record<RouteHorizon, number> = {
  day: 1,
  week: 7,
  month: 31,
  quarter: 93,
  year: 372,
};

function recommendationDurationDays(
  recommendation: LiveNowRecommendation,
  checkedAt: Date,
) {
  const metadata = asRecord(recommendation.metadata);
  const stated = metadataNumber(metadata, [
    "durationDays",
    "duration_days",
    "maximumDurationDays",
    "maximum_duration_days",
  ]);
  if (stated !== null) return stated;

  const isoDeadline = recommendation.duration.match(/\b(20\d{2}-\d{2}-\d{2})(?:[T\s][^\s]+)?\b/);
  if (isoDeadline) {
    const deadline = Date.parse(`${isoDeadline[1]}T23:59:59.999Z`);
    if (Number.isFinite(deadline)) {
      return Math.max(0, Math.ceil((deadline - checkedAt.getTime()) / 86_400_000));
    }
  }
  if (/\b(one[- ]time|once|single session|today)\b/i.test(recommendation.duration)) return 1;

  const values: number[] = [];
  for (const match of recommendation.duration.matchAll(
    /\b([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|quarters?|years?)\b/gi,
  )) {
    const rawAmount = (match[1] ?? "").toLowerCase();
    const amount = NUMBER_WORDS[rawAmount] ?? Number(rawAmount);
    const unit = (match[2] ?? "").toLowerCase();
    const multiplier = unit.startsWith("week")
      ? 7
      : unit.startsWith("month")
        ? 31
        : unit.startsWith("quarter")
          ? 92
          : unit.startsWith("year")
            ? 366
            : 1;
    if (Number.isFinite(amount)) values.push(amount * multiplier);
  }
  return maximumNumber(values);
}

function sourcePrivacy(recommendation: LiveNowRecommendation): RouteSourcePrivacy {
  const metadata = asRecord(recommendation.metadata);
  const explicit = firstDefined(metadata, "privacyLevel", "privacy_level");
  return PRIVACY_PREFERENCES.has(explicit as RouteRecommendationProfile["privacyPreference"])
    ? (explicit as RouteRecommendationProfile["privacyPreference"])
    : "unknown";
}

export function classifyRoutePrivacyScope(value: unknown): RouteSourcePrivacy {
  const normalized = cleanText(value, 1_000).toLowerCase();
  if (/not public|private only|participants? only|operator only/.test(normalized)) return "private";
  if (/public[- ]safe|redact|anonym|narrow safety/.test(normalized)) return "public-safe";
  if (/public|publish/.test(normalized)) return "public";
  if (/participants?|operator|private/.test(normalized)) return "private";
  return "unknown";
}

function privacyAllowed(
  preference: RouteRecommendationProfile["privacyPreference"],
  source: RouteSourcePrivacy,
) {
  if (source === "unknown") return preference === "public";
  const rank: Record<RouteRecommendationProfile["privacyPreference"], number> = {
    private: 1,
    "public-safe": 2,
    public: 3,
  };
  return rank[source] <= rank[preference];
}

const BASELINE_STOP_WORDS = new Set([
  "a", "an", "and", "at", "be", "for", "i", "in", "it", "my", "of", "on", "or",
  "the", "this", "to", "will", "would",
]);

function counterfactualAlreadyIncludes(
  recommendation: LiveNowRecommendation,
  baseline: string,
) {
  const negation = /\b(?:not|never|won|wont|wouldn|wouldnt|don|dont|didn|didnt|cannot|cant|instead)\b/;
  const baselineClauses = baseline
    .split(
      /[.!?;]+|,\s*(?=(?:and|but|however|whereas|while)\b)|\b(?:but|however|whereas|while)\b|\band\b(?=\s+(?:i|we|not|never|won't|wouldn't|don't|didn't|cannot|can't)\b)/gi,
    )
    .map((clause) => normalizeRecommendationText(clause))
    .filter((clause) => clause && !negation.test(clause));
  for (const rawAction of [recommendation.requestAction]) {
    const action = normalizeRecommendationText(rawAction);
    if (!action) continue;
    const actionTokens = [...new Set(
      action.split(" ").filter((token) => token.length > 1 && !BASELINE_STOP_WORDS.has(token)),
    )];
    for (const clause of baselineClauses) {
      if (
        action.length >= 12 &&
        (clause === action || clause.includes(action) || action.includes(clause))
      ) {
        return true;
      }
      if (actionTokens.length >= 3) {
        const clauseTokens = new Set(
          clause
            .split(" ")
            .filter((token) => token.length > 1 && !BASELINE_STOP_WORDS.has(token)),
        );
        const overlap = actionTokens.filter((token) => clauseTokens.has(token)).length;
        if (overlap / actionTokens.length >= 0.8) return true;
      }
    }
  }
  return false;
}

function requiresInteraction(recommendation: LiveNowRecommendation) {
  const metadata = asRecord(recommendation.metadata);
  const explicit = firstDefined(metadata, "requiresInteraction", "requires_interaction");
  if (typeof explicit === "boolean") return explicit;
  return (
    recommendation.opportunityType === "offer" ||
    recommendation.opportunityType === "donation_redirect"
  );
}

export function buildPairwiseFormatAdjustments(
  answers: Readonly<Record<string, RoutePairwiseAnswer>>,
) {
  const adjustments = Object.fromEntries(ROUTE_FORMATS.map((format) => [format, 0])) as Record<
    RouteFormat,
    number
  >;
  for (const answer of Object.values(answers)) {
    if (answer.choice === "left") {
      adjustments[answer.leftFormat] += 8;
      adjustments[answer.rightFormat] -= 8;
    } else if (answer.choice === "right") {
      adjustments[answer.leftFormat] -= 8;
      adjustments[answer.rightFormat] += 8;
    } else if (answer.choice === "neither") {
      // Equal penalties preserve no relative claim between the compared formats.
      adjustments[answer.leftFormat] -= 6;
      adjustments[answer.rightFormat] -= 6;
    }
    // equal and unsure intentionally contain no directional signal.
  }
  return adjustments;
}

function metric(value: number, labels: [string, string, string], basis: string): RouteComponentMetric {
  const bounded = Math.round(clamp(value, 0, 100));
  return {
    value: bounded,
    label: bounded >= 75 ? labels[2] : bounded >= 50 ? labels[1] : labels[0],
    basis,
  };
}

function fitMetric(
  recommendation: LiveNowRecommendation,
  formatAdjustment: number,
): RouteComponentMetric {
  const benefitFit = clamp(recommendation.scoreBreakdown.benefit / 1.25, 0, 100);
  const actionFit = clamp(recommendation.scoreBreakdown.actionCause / 0.58, 0, 100);
  const causeFit = benefitFit > 0 ? benefitFit * 0.78 + actionFit * 0.22 : actionFit;
  const value = causeFit * 0.88 + clamp(recommendation.willingness, 0, 100) * 0.12 + formatAdjustment;
  const adjustmentBasis = formatAdjustment
    ? ` Pairwise format answers adjusted this by ${formatAdjustment > 0 ? "+" : ""}${formatAdjustment} points.`
    : "";
  return metric(
    value,
    ["Lower fit", "Possible fit", "Strong fit"],
    `Uses the live feed's match to ${recommendation.matchCause}; it is not a moral-value score.${adjustmentBasis}`,
  );
}

function frictionMetric(
  recommendation: LiveNowRecommendation,
  burden: RouteBurden,
  profile: RouteRecommendationProfile,
): RouteComponentMetric {
  const difficultyValue = 100 - (clamp(recommendation.difficulty, 1, 5) - 1) * 15;
  const budgetRatios = [
    profile.moneyBudgetCents && burden.moneyCents
      ? burden.moneyCents / profile.moneyBudgetCents
      : 0,
    profile.timeBudgetMinutes && burden.timeMinutes
      ? burden.timeMinutes / profile.timeBudgetMinutes
      : 0,
    profile.actionBudgetCount && burden.actionCount
      ? burden.actionCount / profile.actionBudgetCount
      : 0,
  ];
  const largestShare = Math.min(1, Math.max(...budgetRatios));
  return metric(
    difficultyValue - largestShare * 34,
    ["High friction", "Some friction", "Low friction"],
    `Uses the stated or conservative burden (${burden.moneyCents}¢, ${burden.timeMinutes} min, ${burden.actionCount} action units) and its largest share of your caps.`,
  );
}

function evidenceMetric(
  recommendation: LiveNowRecommendation,
  level: RouteEvidencePreference,
): RouteComponentMetric {
  const value = level === "connected" ? 100 : level === "high" ? 76 : 45;
  return metric(
    value,
    ["Standard evidence", "High evidence", "Connected evidence"],
    level === "connected"
      ? "A structured verification record or provider connection is attached to the live source."
      : recommendation.verification
      ? `Classified from the listing's stated evidence method: ${recommendation.verification.slice(0, 180)}`
      : "The listing does not state an enhanced evidence method.",
  );
}

function coordinationMetric(recommendation: LiveNowRecommendation): RouteComponentMetric {
  if (recommendation.opportunityType === "donation_pool") {
    return metric(
      82,
      ["Live listing", "Live listing", "Live pool"],
      "A real, currently supplied pool is available. This does not claim that one contribution is pivotal.",
    );
  }
  if (recommendation.opportunityType === "donation_redirect") {
    return metric(
      72,
      ["Live listing", "Live listing", "Live pool"],
      "A real redirect listing is open; reciprocal acceptance, uptake, and impact are not assumed.",
    );
  }
  return metric(
    64,
    ["Live listing", "Live listing", "Live pool"],
    "A real listing is open; reciprocal acceptance and completion are not assumed.",
  );
}

function titleForRecommendation(recommendation: LiveNowRecommendation) {
  return (
    recommendation.requestAction.trim() ||
    recommendation.offerAction.trim() ||
    recommendation.sourceLabel
  ).slice(0, 220);
}

function sourceKey(recommendation: LiveNowRecommendation) {
  return `${recommendation.opportunityType}:${recommendation.id}`;
}

function profileMissingFields(profile: RouteRecommendationProfile) {
  const fields: string[] = [];
  if (!profile.goal && !profile.causePriorities.length) fields.push("goal_or_cause_priorities");
  if (!profile.otherwiseBaseline) fields.push("otherwise_baseline");
  if (!profile.routeFormats.length) fields.push("route_formats");
  if (profile.horizon === null) fields.push("horizon");
  if (profile.moneyBudgetCents === null) fields.push("money_budget_cents");
  if (profile.timeBudgetMinutes === null) fields.push("time_budget_minutes");
  if (profile.actionBudgetCount === null) fields.push("action_budget_count");
  return fields;
}

function reasonForPerStepBudget(
  burden: RouteBurden,
  profile: RouteRecommendationProfile,
): RouteBlockReason[] {
  const reasons: RouteBlockReason[] = [];
  if (
    burden.moneyCertainty === "unknown" ||
    (profile.moneyBudgetCents !== null && burden.moneyCents > profile.moneyBudgetCents)
  ) {
    reasons.push("money_budget");
  }
  if (
    burden.timeCertainty === "unknown" ||
    (profile.timeBudgetMinutes !== null && burden.timeMinutes > profile.timeBudgetMinutes)
  ) {
    reasons.push("time_budget");
  }
  if (
    burden.actionCertainty === "unknown" ||
    (profile.actionBudgetCount !== null && burden.actionCount > profile.actionBudgetCount)
  ) {
    reasons.push("action_budget");
  }
  return reasons;
}

function uncertaintyAllowed(
  preference: RouteUncertaintyPreference,
  source: RouteSourceUncertainty,
) {
  if (source === "unknown") return preference !== "conservative";
  if (preference === "exploratory") return true;
  if (preference === "balanced") return source !== "exploratory";
  return source === "conservative";
}

function mapLiveRouteSteps(
  recommendations: readonly LiveNowRecommendation[],
  profile: RouteRecommendationProfile,
  checkedAt: Date,
) {
  const adjustments = buildPairwiseFormatAdjustments(profile.pairwiseAnswers);
  const steps: FeasibleLiveRouteStep[] = [];
  const blockedSources: BlockedLiveRouteSource[] = [];
  const seenSourceIds = new Set<string>();

  for (const recommendation of recommendations) {
    const sourceId = recommendation.id.trim();
    const format = recommendationRouteFormat(recommendation);
    const reasons: RouteBlockReason[] = [];
    if (
      !sourceId ||
      seenSourceIds.has(sourceId) ||
      !format ||
      !recommendation.href ||
      recommendation.opportunityType === "cause_topic"
    ) {
      reasons.push("not_executable");
    }
    if (sourceId) seenSourceIds.add(sourceId);
    if (format && !profile.routeFormats.includes(format)) reasons.push("route_format");

    const needsDonationBaseline = isPlannedDonationRoute(recommendation);
    if (needsDonationBaseline && profile.plannedDonationBaseline !== true) {
      reasons.push("planned_donation_baseline");
    }
    if (
      needsDonationBaseline &&
      profile.plannedDonationBaseline === true &&
      (!profile.plannedDonationCents || profile.plannedDonationCents < 1)
    ) {
      reasons.push("planned_donation_amount");
    }

    const burden = parseConservativeRouteBurden(recommendation, profile);
    reasons.push(...reasonForPerStepBudget(burden, profile));
    if (
      needsDonationBaseline &&
      profile.plannedDonationCents !== null &&
      burden.moneyCents > profile.plannedDonationCents
    ) {
      reasons.push("planned_donation_amount");
    }

    const sourceEvidenceLevel = evidenceLevel(recommendation);
    if (EVIDENCE_RANK[sourceEvidenceLevel] < EVIDENCE_RANK[profile.evidencePreference]) {
      reasons.push("evidence");
    }
    const sourceRequiresInteraction = requiresInteraction(recommendation);
    if (sourceRequiresInteraction && profile.interactionPreference === "solo") {
      reasons.push("interaction");
    }
    const metadata = asRecord(recommendation.metadata);
    const invitationBacked = firstDefined(metadata, "invitationBacked", "invitation_backed") === true;
    if (profile.interactionPreference === "invite" && !invitationBacked) {
      reasons.push("interaction");
    }
    if (!privacyAllowed(profile.privacyPreference, sourcePrivacy(recommendation))) {
      reasons.push("privacy");
    }
    if (counterfactualAlreadyIncludes(recommendation, profile.otherwiseBaseline)) {
      reasons.push("already_planned");
    }
    if (!uncertaintyAllowed(profile.uncertaintyPreference, uncertaintyLevel(recommendation))) {
      reasons.push("uncertainty");
    }
    const durationDays = recommendationDurationDays(recommendation, checkedAt);
    if (
      profile.horizon &&
      (durationDays === null || durationDays > HORIZON_DAYS[profile.horizon])
    ) {
      reasons.push("horizon");
    }

    const uniqueReasons = [...new Set(reasons)];
    if (uniqueReasons.length || !format) {
      blockedSources.push({ sourceId, reasons: uniqueReasons });
      continue;
    }

    steps.push({
      sourceId,
      sourceKey: sourceKey(recommendation),
      sourceType: recommendation.opportunityType,
      sourceLabel: recommendation.sourceLabel,
      href: recommendation.href,
      ctaLabel: recommendation.ctaLabel,
      title: titleForRecommendation(recommendation),
      summary: recommendation.reason,
      routeFormat: format,
      burden,
      evidenceLevel: sourceEvidenceLevel,
      requiresInteraction: sourceRequiresInteraction,
      requiresPlannedDonationBaseline: needsDonationBaseline,
      components: {
        fit: fitMetric(recommendation, adjustments[format]),
        friction: frictionMetric(recommendation, burden, profile),
        evidence: evidenceMetric(recommendation, sourceEvidenceLevel),
        coordination: coordinationMetric(recommendation),
      },
      live: true,
    });
  }

  return { steps, blockedSources };
}

/** Maps live recommendations to executable steps and returns filter reasons for every rejection. */
export function mapRecommendationsToFeasibleRouteSteps(
  recommendations: readonly LiveNowRecommendation[],
  profileInput: RouteRecommendationProfileRow | RouteRecommendationProfile,
) {
  return mapLiveRouteSteps(
    recommendations,
    normalizeRouteRecommendationProfile(profileInput),
    new Date(),
  );
}

function emptyTotals() {
  return { moneyCents: 0, timeMinutes: 0, actionCount: 0 };
}

function addToTotals(
  totals: ReturnType<typeof emptyTotals>,
  burden: RouteBurden,
): ReturnType<typeof emptyTotals> {
  return {
    moneyCents: totals.moneyCents + burden.moneyCents,
    timeMinutes: totals.timeMinutes + burden.timeMinutes,
    actionCount: totals.actionCount + burden.actionCount,
  };
}

function totalsFitProfile(
  totals: ReturnType<typeof emptyTotals>,
  profile: RouteRecommendationProfile,
) {
  return (
    (profile.moneyBudgetCents === null || totals.moneyCents <= profile.moneyBudgetCents) &&
    (profile.timeBudgetMinutes === null || totals.timeMinutes <= profile.timeBudgetMinutes) &&
    (profile.actionBudgetCount === null || totals.actionCount <= profile.actionBudgetCount)
  );
}

function buildRouteFromSteps(
  label: RouteLabel,
  selected: readonly FeasibleLiveRouteStep[],
  profile: RouteRecommendationProfile,
) {
  let totals = emptyTotals();
  for (const step of selected) totals = addToTotals(totals, step.burden);
  if (!selected.length || !totalsFitProfile(totals, profile)) return null;

  const average = (component: keyof RouteComponents) =>
    selected.reduce((sum, step) => sum + step.components[component].value, 0) / selected.length;
  const components: RouteComponents = {
    fit: metric(
      average("fit"),
      ["Lower fit", "Possible fit", "Strong fit"],
      "Average of the route steps' separately explained fit components.",
    ),
    friction: metric(
      average("friction"),
      ["High friction", "Some friction", "Low friction"],
      "Average of the route steps' friction components; aggregate caps are enforced separately.",
    ),
    evidence: metric(
      average("evidence"),
      ["Standard evidence", "High evidence", "Connected evidence"],
      "Average evidence strength across the live source steps.",
    ),
    coordination: metric(
      average("coordination"),
      ["Live listing", "Live listing", "Live pool"],
      "Average coordination readiness of real live sources, without a pivotality or impact claim.",
    ),
  };

  return {
    id: `${label.toLowerCase().replaceAll(" ", "-")}:${selected
      .map((step) => step.sourceKey)
      .join("+")}`,
    label,
    steps: [...selected],
    totals,
    components,
    rationale:
      label === "Best fit"
        ? "Prioritizes stated cause and pairwise format fit after screening for clear action overlap with the stated no-trade baseline."
        : label === "Lowest friction"
          ? "Prioritizes lower burden and difficulty within every aggregate cap."
          : "Prioritizes published listing or pool availability without assuming reciprocal acceptance, uptake, or pivotality.",
  } satisfies ComposedLiveRoute;
}

function routeSignature(route: ComposedLiveRoute) {
  return [...route.steps.map((step) => step.sourceId)].sort().join("|");
}

function dominates(left: ComposedLiveRoute, right: ComposedLiveRoute) {
  const components = ["fit", "friction", "evidence", "coordination"] as const;
  const componentsNeverWorse = components.every(
    (component) => left.components[component].value >= right.components[component].value,
  );
  const burdensNeverWorse =
    left.totals.moneyCents <= right.totals.moneyCents &&
    left.totals.timeMinutes <= right.totals.timeMinutes &&
    left.totals.actionCount <= right.totals.actionCount;
  const betterComponent = components.some(
    (component) => left.components[component].value > right.components[component].value,
  );
  const lowerBurden =
    left.totals.moneyCents < right.totals.moneyCents ||
    left.totals.timeMinutes < right.totals.timeMinutes ||
    left.totals.actionCount < right.totals.actionCount;
  return componentsNeverWorse && burdensNeverWorse && (betterComponent || lowerBurden);
}

function boundedCompositionPool(steps: readonly FeasibleLiveRouteStep[]) {
  const selected = new Map<string, FeasibleLiveRouteStep>();
  const addTop = (
    compare: (left: FeasibleLiveRouteStep, right: FeasibleLiveRouteStep) => number,
  ) => {
    [...steps]
      .sort(compare)
      .slice(0, 4)
      .forEach((step) => selected.set(step.sourceKey, step));
  };
  for (const component of ["fit", "friction", "evidence", "coordination"] as const) {
    addTop(
      (left, right) =>
        right.components[component].value - left.components[component].value ||
        left.sourceKey.localeCompare(right.sourceKey),
    );
  }
  addTop((left, right) => left.burden.moneyCents - right.burden.moneyCents);
  addTop((left, right) => left.burden.timeMinutes - right.burden.timeMinutes);
  addTop((left, right) => left.burden.actionCount - right.burden.actionCount);
  return [...selected.values()];
}

/** Composes at most three distinct routes from live steps and removes dominated candidates. */
export function composeNonDominatedRoutes(
  steps: readonly FeasibleLiveRouteStep[],
  profileInput: RouteRecommendationProfileRow | RouteRecommendationProfile,
) {
  const profile = normalizeRouteRecommendationProfile(profileInput);
  const allCandidates: ComposedLiveRoute[] = [];
  for (const step of steps) {
    const one = buildRouteFromSteps("Best fit", [step], profile);
    if (one) allCandidates.push(one);
  }
  const boundedSteps = boundedCompositionPool(steps);
  for (let first = 0; first < boundedSteps.length; first += 1) {
    for (let second = first + 1; second < boundedSteps.length; second += 1) {
      const two = buildRouteFromSteps(
        "Best fit",
        [boundedSteps[first], boundedSteps[second]],
        profile,
      );
      if (two) allCandidates.push(two);
      for (let third = second + 1; third < boundedSteps.length; third += 1) {
        const three = buildRouteFromSteps(
          "Best fit",
          [boundedSteps[first], boundedSteps[second], boundedSteps[third]],
          profile,
        );
        if (three) allCandidates.push(three);
      }
    }
  }
  const frontier: ComposedLiveRoute[] = [];
  for (const candidate of allCandidates) {
    if (frontier.some((other) => dominates(other, candidate))) continue;
    for (let index = frontier.length - 1; index >= 0; index -= 1) {
      if (dominates(candidate, frontier[index])) frontier.splice(index, 1);
    }
    frontier.push(candidate);
  }
  const objectives: Array<[RouteLabel, keyof RouteComponents]> = [
    ["Best fit", "fit"],
    ["Lowest friction", "friction"],
    ["Live coordination", "coordination"],
  ];
  const selected: ComposedLiveRoute[] = [];
  const usedSignatures = new Set<string>();
  for (const [label, objective] of objectives) {
    const route = [...frontier]
      .sort(
        (left, right) =>
          right.components[objective].value - left.components[objective].value ||
          right.components.fit.value - left.components.fit.value ||
          right.components.friction.value - left.components.friction.value ||
          left.totals.moneyCents - right.totals.moneyCents ||
          left.totals.timeMinutes - right.totals.timeMinutes ||
          left.totals.actionCount - right.totals.actionCount ||
          routeSignature(left).localeCompare(routeSignature(right)),
      )
      .find((candidate) => !usedSignatures.has(routeSignature(candidate)));
    if (!route) continue;
    usedSignatures.add(routeSignature(route));
    const relabeled = buildRouteFromSteps(label, route.steps, profile);
    if (relabeled) selected.push(relabeled);
  }
  return selected;
}

function comparisonPairKey(leftFormat: RouteFormat, rightFormat: RouteFormat) {
  return [leftFormat, rightFormat].sort().join(":");
}

/** Returns one unanswered comparison between concrete live steps of different formats. */
export function buildActiveRouteComparison(
  steps: readonly FeasibleLiveRouteStep[],
  answers: Readonly<Record<string, RoutePairwiseAnswer>> = {},
): RouteActiveComparison | null {
  if (Object.keys(answers).length >= 5) return null;
  const answeredPairs = new Set(
    Object.values(answers).map((answer) =>
      comparisonPairKey(answer.leftFormat, answer.rightFormat),
    ),
  );
  const ranked = [...steps].sort(
    (left, right) =>
      right.components.fit.value - left.components.fit.value ||
      right.components.friction.value - left.components.friction.value ||
      left.sourceKey.localeCompare(right.sourceKey),
  );

  for (let leftIndex = 0; leftIndex < ranked.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ranked.length; rightIndex += 1) {
      const left = ranked[leftIndex];
      const right = ranked[rightIndex];
      if (left.routeFormat === right.routeFormat) continue;
      const pairKey = comparisonPairKey(left.routeFormat, right.routeFormat);
      if (answeredPairs.has(pairKey)) continue;
      return {
        id: `route-format:${left.routeFormat}:${right.routeFormat}`,
        prompt: "Which live route would you genuinely prefer, given these burdens?",
        left: {
          sourceId: left.sourceId,
          routeFormat: left.routeFormat,
          title: left.title,
          burden: {
            moneyCents: left.burden.moneyCents,
            timeMinutes: left.burden.timeMinutes,
            actionCount: left.burden.actionCount,
          },
        },
        right: {
          sourceId: right.sourceId,
          routeFormat: right.routeFormat,
          title: right.title,
          burden: {
            moneyCents: right.burden.moneyCents,
            timeMinutes: right.burden.timeMinutes,
            actionCount: right.burden.actionCount,
          },
        },
        choices: COMPARISON_CHOICES,
      };
    }
  }
  return null;
}

export function applyRouteComparisonChoice(
  profileInput: RouteRecommendationProfileRow | RouteRecommendationProfile,
  comparison: RouteActiveComparison,
  choice: RouteComparisonChoice,
) {
  const profile = normalizeRouteRecommendationProfile(profileInput);
  if (!COMPARISON_CHOICE_SET.has(choice)) return profile;
  return {
    ...profile,
    pairwiseAnswers: {
      ...profile.pairwiseAnswers,
      [comparison.id]: {
        comparisonId: comparison.id,
        leftFormat: comparison.left.routeFormat,
        rightFormat: comparison.right.routeFormat,
        choice,
      },
    },
  } satisfies RouteRecommendationProfile;
}

function checkedAtIso(value: Date | string | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
}

/**
 * Truthfulness-first route planner. It never creates filler actions: every step
 * retains the identifier and URL of a supplied live recommendation.
 */
export function buildRoutePlanner({
  profile: profileInput,
  recommendations,
  checkedAt,
  fallbackCauses = [],
}: {
  profile: RouteRecommendationProfileRow | RouteRecommendationProfile | null | undefined;
  recommendations: readonly LiveNowRecommendation[];
  checkedAt?: Date | string;
  fallbackCauses?: readonly string[];
}): RoutePlannerResult {
  const checkedAtValue = checkedAt instanceof Date
    ? checkedAt
    : checkedAt
      ? new Date(checkedAt)
      : new Date();
  const validCheckedAt = Number.isFinite(checkedAtValue.getTime())
    ? checkedAtValue
    : new Date(0);
  const profile = normalizeRouteRecommendationProfile(profileInput, fallbackCauses);
  const missingProfileFields = profileMissingFields(profile);
  const { steps, blockedSources } = mapLiveRouteSteps(
    recommendations,
    profile,
    validCheckedAt,
  );
  const routes = missingProfileFields.length
    ? []
    : composeNonDominatedRoutes(steps, profile);
  const baselineReasons = new Set<RouteBlockReason>([
    "planned_donation_baseline",
    "planned_donation_amount",
    "money_budget",
  ]);
  const baselineBlockers = blockedSources.filter(
    (source) =>
      source.reasons.some(
        (reason) =>
          reason === "planned_donation_baseline" || reason === "planned_donation_amount",
      ) && source.reasons.every((reason) => baselineReasons.has(reason)),
  );
  const baselineInputIsMissing =
    profile.plannedDonationBaseline === null ||
    (profile.plannedDonationBaseline === true && !profile.plannedDonationCents);
  const baselineInputBlockers = baselineInputIsMissing ? baselineBlockers : [];
  const status: RoutePlannerStatus = missingProfileFields.length
    ? "needing_profile"
    : routes.length
      ? "ready"
      : baselineInputBlockers.length
        ? "needs_baseline"
        : "no_live_routes";

  return {
    status,
    checkedAt: checkedAtIso(validCheckedAt),
    profile,
    missingProfileFields,
    steps: missingProfileFields.length ? [] : steps,
    routes,
    activeComparison: missingProfileFields.length
      ? null
      : buildActiveRouteComparison(steps, profile.pairwiseAnswers),
    blockedSources,
    liveSourceIds: steps.map((step) => step.sourceId),
    requiresBaselineForSourceIds: baselineInputBlockers.map((source) => source.sourceId),
  };
}
