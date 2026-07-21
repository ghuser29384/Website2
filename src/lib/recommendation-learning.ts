export const RECOMMENDATION_EVENT_TYPES = [
  "impression",
  "open",
  "dwell",
  "cause_view",
  "save",
  "unsave",
  "hide",
  "not_for_me",
  "easy",
  "hard",
  "propose",
  "accept",
  "complete",
] as const;

export type RecommendationEventType = (typeof RECOMMENDATION_EVENT_TYPES)[number];

export const RECOMMENDATION_OPPORTUNITY_TYPES = [
  "offer",
  "donation_redirect",
  "donation_pool",
  "cause_topic",
] as const;

export type RecommendationOpportunityType =
  (typeof RECOMMENDATION_OPPORTUNITY_TYPES)[number];

export interface RecommendationInteractionSignal {
  opportunityType: RecommendationOpportunityType;
  opportunityId: string;
  eventType: RecommendationEventType;
  benefitCauses: string[];
  actionCauses: string[];
  actionKey: string;
  actionLabel: string;
  inferredDifficulty: number | null;
  dwellMs: number;
  occurredAt: string;
}

export interface LearnedActionPreference {
  actionKey: string;
  actionLabel: string;
  difficulty: number;
  willingness: number;
  observationCount: number;
  explicitDifficultyCount: number;
}

export interface OpportunityFeedbackState {
  hiddenOpportunityKeys: Set<string>;
  savedOpportunityKeys: Set<string>;
}

export interface ActionDescriptorInput {
  actionText: string;
  actionCause: string;
  mode?: string;
  opportunityType?: RecommendationOpportunityType;
}

export interface ActionDescriptor {
  key: string;
  label: string;
  cause: string;
  defaultDifficulty: number;
}

const MAX_DWELL_MS = 30 * 60 * 1_000;
const DAY_MS = 86_400_000;

export function normalizeRecommendationText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function slug(value: string) {
  return normalizeRecommendationText(value).replace(/\s+/g, "-").slice(0, 72);
}

function inferDurationAdjustment(text: string) {
  const normalized = normalizeRecommendationText(text);
  let adjustment = 0;

  if (/\b(one time|once|single|brief|quick|five minutes|5 minutes|ten minutes|10 minutes)\b/.test(normalized)) {
    adjustment -= 0.45;
  }
  if (/\b(weekly|every week|month|months|recurring|ongoing|daily|every day)\b/.test(normalized)) {
    adjustment += 0.4;
  }
  if (/\b(30|45|60|90) minute\b/.test(normalized)) adjustment += 0.2;
  if (/\b(two|2|three|3|four|4) hour\b/.test(normalized)) adjustment += 0.55;

  return adjustment;
}

export function getActionDescriptor(input: ActionDescriptorInput): ActionDescriptor {
  const combined = normalizeRecommendationText(`${input.actionText} ${input.actionCause}`);
  const cause = input.actionCause.trim().slice(0, 120);
  const durationAdjustment = inferDurationAdjustment(input.actionText);

  if (
    input.opportunityType === "donation_redirect" ||
    input.opportunityType === "donation_pool" ||
    input.mode === "offset" ||
    /\b(donat|redirect|charity|matching gift|offset)\b/.test(combined)
  ) {
    return {
      key: "donation:redirect",
      label: "Redirect or match a donation",
      cause,
      defaultDifficulty: clamp(2.25 + durationAdjustment, 1, 5),
    };
  }

  if (/\b(meat|vegetarian|vegan|beef|chicken|pork|fish|plant based|animal product)\b/.test(combined)) {
    return {
      key: "diet:reduce-meat",
      label: "Reduce or avoid meat",
      cause: cause || "Animal welfare",
      defaultDifficulty: clamp(3.05 + durationAdjustment, 1, 5),
    };
  }

  if (/\b(plastic|single use|shopping bag|reusable bag|packaging|waste)\b/.test(combined)) {
    return {
      key: "consumption:avoid-single-use-plastic",
      label: "Avoid single-use plastic",
      cause: cause || "Climate & environment",
      defaultDifficulty: clamp(1.75 + durationAdjustment, 1, 5),
    };
  }

  if (/\b(review|audit|evaluate|feedback|assess|proofread|moderate)\b/.test(combined)) {
    return {
      key: "time:review",
      label: "Review or evaluate",
      cause,
      defaultDifficulty: clamp(2.3 + durationAdjustment, 1, 5),
    };
  }

  if (/\b(research|write|brief|analysis|tooling|code|design|translate|draft)\b/.test(combined)) {
    return {
      key: "work:knowledge",
      label: "Produce research or skilled work",
      cause,
      defaultDifficulty: clamp(3 + durationAdjustment, 1, 5),
    };
  }

  if (/\b(volunteer|session|meeting|workshop|call|mentor|organize|facilitate)\b/.test(combined)) {
    return {
      key: "time:volunteer",
      label: "Volunteer time",
      cause,
      defaultDifficulty: clamp(2.85 + durationAdjustment, 1, 5),
    };
  }

  const causeSlug = slug(cause) || "general";
  return {
    key: `action:${causeSlug}`,
    label: cause || "Complete the requested action",
    cause,
    defaultDifficulty: clamp(2.75 + durationAdjustment, 1, 5),
  };
}

export function opportunityKey(type: RecommendationOpportunityType, id: string) {
  return `${type}:${id}`;
}

function eventWillingnessDelta(signal: RecommendationInteractionSignal) {
  switch (signal.eventType) {
    case "open":
      return 2;
    case "dwell":
      return Math.min(8, Math.log2(1 + clamp(signal.dwellMs, 0, MAX_DWELL_MS) / 5_000));
    case "save":
      return 12;
    case "unsave":
      return -5;
    case "hide":
      return -18;
    case "not_for_me":
      return -24;
    case "easy":
      return 8;
    case "hard":
      return -2;
    case "propose":
      return 18;
    case "accept":
      return 24;
    case "complete":
      return 28;
    default:
      return 0;
  }
}

function recencyFactor(occurredAt: string, now: Date) {
  const timestamp = Date.parse(occurredAt);
  if (!Number.isFinite(timestamp)) return 0.5;
  const ageDays = Math.max(0, (now.getTime() - timestamp) / DAY_MS);
  return Math.pow(0.5, ageDays / 90);
}

export function buildLearnedActionPreferences(
  signals: RecommendationInteractionSignal[],
  now = new Date(),
) {
  const groups = new Map<
    string,
    {
      actionLabel: string;
      defaultDifficultySum: number;
      defaultDifficultyCount: number;
      explicitDifficultySum: number;
      explicitDifficultyWeight: number;
      observationCount: number;
      willingnessDelta: number;
    }
  >();

  for (const signal of signals) {
    if (!signal.actionKey) continue;
    const current = groups.get(signal.actionKey) ?? {
      actionLabel: signal.actionLabel || signal.actionKey,
      defaultDifficultySum: 0,
      defaultDifficultyCount: 0,
      explicitDifficultySum: 0,
      explicitDifficultyWeight: 0,
      observationCount: 0,
      willingnessDelta: 0,
    };
    const factor = recencyFactor(signal.occurredAt, now);

    if (signal.inferredDifficulty !== null && Number.isFinite(signal.inferredDifficulty)) {
      current.defaultDifficultySum += clamp(signal.inferredDifficulty, 1, 5);
      current.defaultDifficultyCount += 1;
    }

    if (signal.eventType === "easy" || signal.eventType === "hard") {
      const observedDifficulty = signal.eventType === "easy" ? 1.5 : 4.5;
      current.explicitDifficultySum += observedDifficulty * factor;
      current.explicitDifficultyWeight += factor;
    }

    const willingnessDelta = eventWillingnessDelta(signal);
    if (willingnessDelta !== 0) {
      current.willingnessDelta += willingnessDelta * factor;
      current.observationCount += 1;
    }

    if (signal.actionLabel) current.actionLabel = signal.actionLabel;
    groups.set(signal.actionKey, current);
  }

  const preferences = new Map<string, LearnedActionPreference>();
  for (const [actionKey, group] of groups) {
    const baseline = group.defaultDifficultyCount
      ? group.defaultDifficultySum / group.defaultDifficultyCount
      : 2.75;
    const explicit = group.explicitDifficultyWeight
      ? group.explicitDifficultySum / group.explicitDifficultyWeight
      : null;
    const difficulty = explicit === null ? baseline : baseline * 0.35 + explicit * 0.65;
    const dampenedDelta = group.willingnessDelta / Math.sqrt(Math.max(1, group.observationCount / 3));

    preferences.set(actionKey, {
      actionKey,
      actionLabel: group.actionLabel,
      difficulty: Math.round(clamp(difficulty, 1, 5) * 100) / 100,
      willingness: Math.round(clamp(50 + dampenedDelta, 0, 100) * 100) / 100,
      observationCount: group.observationCount,
      explicitDifficultyCount: Math.round(group.explicitDifficultyWeight * 100) / 100,
    });
  }

  return preferences;
}

export function buildOpportunityFeedbackState(signals: RecommendationInteractionSignal[]) {
  const latest = new Map<
    string,
    { eventType: RecommendationEventType; timestamp: number; order: number }
  >();

  signals.forEach((signal, order) => {
    if (!signal.opportunityId || signal.opportunityType === "cause_topic") return;
    if (!["save", "unsave", "hide", "not_for_me"].includes(signal.eventType)) return;
    const key = opportunityKey(signal.opportunityType, signal.opportunityId);
    const timestamp = Date.parse(signal.occurredAt);
    const prior = latest.get(key);
    const comparableTimestamp = Number.isFinite(timestamp) ? timestamp : order;
    if (!prior || comparableTimestamp > prior.timestamp || (comparableTimestamp === prior.timestamp && order > prior.order)) {
      latest.set(key, { eventType: signal.eventType, timestamp: comparableTimestamp, order });
    }
  });

  const hiddenOpportunityKeys = new Set<string>();
  const savedOpportunityKeys = new Set<string>();
  for (const [key, value] of latest) {
    if (value.eventType === "save") savedOpportunityKeys.add(key);
    if (value.eventType === "hide" || value.eventType === "not_for_me") {
      hiddenOpportunityKeys.add(key);
    }
  }

  return { hiddenOpportunityKeys, savedOpportunityKeys } satisfies OpportunityFeedbackState;
}

function browseEventStrength(signal: RecommendationInteractionSignal) {
  switch (signal.eventType) {
    case "cause_view":
      return 2.5;
    case "open":
      return 1.5;
    case "dwell":
      return Math.min(4, Math.log2(1 + clamp(signal.dwellMs, 0, MAX_DWELL_MS) / 8_000));
    case "save":
      return 5;
    case "unsave":
      return -3;
    case "hide":
      return -4;
    case "not_for_me":
      return -6;
    case "propose":
      return 7;
    case "accept":
      return 9;
    case "complete":
      return 12;
    default:
      return 0;
  }
}

export function buildBrowsingCauseWeights(
  signals: RecommendationInteractionSignal[],
  now = new Date(),
) {
  const scores = new Map<string, { label: string; score: number }>();

  const add = (cause: string, amount: number) => {
    const label = cause.trim().slice(0, 120);
    const key = normalizeRecommendationText(label);
    if (!key || !Number.isFinite(amount)) return;
    const current = scores.get(key) ?? { label, score: 0 };
    current.score += amount;
    scores.set(key, current);
  };

  for (const signal of signals) {
    const strength = browseEventStrength(signal) * recencyFactor(signal.occurredAt, now);
    if (strength === 0) continue;
    signal.benefitCauses.forEach((cause) => add(cause, strength));
    signal.actionCauses.forEach((cause) => add(cause, strength * 0.45));
  }

  return [...scores.values()]
    .filter((item) => item.score > 0.5)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 12)
    .map((item) => ({
      cause: item.label,
      weight: Math.round(clamp(10 + item.score * 2.5, 10, 38) * 100) / 100,
    }));
}

export function isRecommendationEventType(value: unknown): value is RecommendationEventType {
  return typeof value === "string" && (RECOMMENDATION_EVENT_TYPES as readonly string[]).includes(value);
}

export function isRecommendationOpportunityType(
  value: unknown,
): value is RecommendationOpportunityType {
  return (
    typeof value === "string" &&
    (RECOMMENDATION_OPPORTUNITY_TYPES as readonly string[]).includes(value)
  );
}
