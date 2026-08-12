import {
  clamp,
  getActionDescriptor,
  normalizeRecommendationText,
  opportunityKey,
  type LearnedActionPreference,
  type RecommendationOpportunityType,
} from "./recommendation-learning";

export type LiveNowCauseSignalSource =
  | "explicit_priority"
  | "profile_priority"
  | "saved_search"
  | "browsing";

export interface LiveNowCauseSignal {
  cause: string;
  weight: number;
  source: LiveNowCauseSignalSource;
  rank: number | null;
}

export interface LiveNowPriorityAllocation {
  label?: string | null;
  causeArea?: string | null;
  share?: number | null;
  sparks?: number | null;
  rank?: number | null;
}

export interface LiveNowBrowsingCauseWeight {
  cause: string;
  weight: number;
}

export interface LiveNowProfileSignals {
  causes: string[];
  causeSignals?: LiveNowCauseSignal[];
  openToPayment: boolean | null;
  openToPledges: boolean | null;
  actionPreferences?: ReadonlyMap<string, LearnedActionPreference>;
  hiddenOpportunityKeys?: ReadonlySet<string>;
  savedOpportunityKeys?: ReadonlySet<string>;
  explorationPercent?: number;
}

export interface LiveNowOfferCandidate {
  id: string;
  ownerId: string;
  ownerAlias: string;
  mode: "offset" | "payment" | "pledge";
  offeredCause: string;
  requestedCause: string;
  compromiseCause: string;
  offerAction: string;
  requestAction: string;
  verification: string;
  duration: string;
  trustLevel: number;
  createdAt: string;
  updatedAt: string;
  sourceRevision?: number;
  opportunityType?: RecommendationOpportunityType;
  href?: string;
  ctaLabel?: string;
  sourceLabel?: string;
  summary?: string;
  benefitCauses?: string[];
  actionCauses?: string[];
  actionKey?: string;
  actionLabel?: string;
  defaultDifficulty?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface LiveNowRecommendation extends LiveNowOfferCandidate {
  opportunityType: RecommendationOpportunityType;
  href: string;
  ctaLabel: string;
  sourceLabel: string;
  benefitCauses: string[];
  actionCauses: string[];
  actionKey: string;
  actionLabel: string;
  matchCause: string;
  matchCauseSource: LiveNowCauseSignalSource;
  actionCauseMatch: string;
  reason: string;
  reasonDetails: string[];
  score: number;
  difficulty: number;
  difficultyLabel: "Easy" | "Moderate" | "Hard";
  willingness: number;
  actionFitLabel: "Strong fit" | "Possible fit" | "Stretch";
  learnedActionSignalCount: number;
  saved: boolean;
  scoreBreakdown: {
    benefit: number;
    actionCause: number;
    actionFit: number;
    difficultyPenalty: number;
    recency: number;
    quality: number;
    trust: number;
    saved: number;
  };
}

export interface LiveNowRecentChange {
  cause: string;
  count: number;
  label: string;
}

const DAY_MS = 86_400_000;
const SOURCE_PRIORITY: Record<LiveNowCauseSignalSource, number> = {
  explicit_priority: 4,
  profile_priority: 3,
  saved_search: 2,
  browsing: 1,
};

function normalize(value: string | null | undefined) {
  return normalizeRecommendationText(value);
}

function tokens(value: string) {
  return new Set(normalize(value).split(/\s+/).filter(Boolean));
}

function causeMatchScore(preference: string, candidate: string) {
  const normalizedPreference = normalize(preference);
  const normalizedCandidate = normalize(candidate);

  if (!normalizedPreference || !normalizedCandidate) return 0;
  if (normalizedPreference === normalizedCandidate) return 100;
  if (
    ` ${normalizedCandidate} `.includes(` ${normalizedPreference} `) ||
    ` ${normalizedPreference} `.includes(` ${normalizedCandidate} `)
  ) {
    return 82;
  }

  const preferenceTokens = tokens(preference);
  const candidateTokens = tokens(candidate);
  const overlap = [...preferenceTokens].filter((token) => candidateTokens.has(token)).length;

  if (!overlap) return 0;

  return Math.round((overlap / Math.max(preferenceTokens.size, candidateTokens.size)) * 64);
}

function recencyScore(value: string, now: Date) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;

  const elapsedDays = Math.max(0, (now.getTime() - timestamp) / DAY_MS);
  return Math.max(0, 12 - Math.min(12, elapsedDays / 10));
}

function qualityScore(candidate: LiveNowOfferCandidate) {
  const fields = [
    candidate.offerAction,
    candidate.requestAction,
    candidate.verification,
    candidate.duration,
  ];
  const completeFields = fields.filter((field) => field.trim().length >= 8).length;
  return (completeFields / fields.length) * 8;
}

function cleanCauseList(values: readonly string[] | null | undefined) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values ?? []) {
    const cause = value.trim().slice(0, 120);
    const key = normalize(cause);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(cause);
  }

  return result;
}

function addCauseSignal(
  map: Map<string, LiveNowCauseSignal>,
  cause: string | null | undefined,
  weight: number,
  source: LiveNowCauseSignalSource,
  rank: number | null,
) {
  const label = (cause ?? "").trim().slice(0, 120);
  const key = normalize(label);
  if (!key) return;

  const candidate = {
    cause: label,
    weight: Math.round(clamp(weight, 0, 100) * 100) / 100,
    source,
    rank,
  } satisfies LiveNowCauseSignal;
  const current = map.get(key);
  if (
    !current ||
    candidate.weight > current.weight ||
    (candidate.weight === current.weight && SOURCE_PRIORITY[candidate.source] > SOURCE_PRIORITY[current.source])
  ) {
    map.set(key, candidate);
  }
}

export function buildWeightedCauseSignals({
  priorityAllocations = [],
  declaredPriorities = [],
  profileCauses = [],
  savedSearchCauses = [],
  browsingCauses = [],
}: {
  priorityAllocations?: readonly LiveNowPriorityAllocation[];
  declaredPriorities?: readonly string[];
  profileCauses?: readonly string[];
  savedSearchCauses?: readonly string[];
  browsingCauses?: readonly LiveNowBrowsingCauseWeight[];
}) {
  const map = new Map<string, LiveNowCauseSignal>();
  const areaTotals = new Map<string, { label: string; share: number; rank: number }>();

  priorityAllocations.forEach((allocation, index) => {
    const rank = Number.isFinite(Number(allocation.rank))
      ? Math.max(1, Math.floor(Number(allocation.rank)))
      : index + 1;
    const share = Number.isFinite(Number(allocation.share))
      ? clamp(Number(allocation.share), 0, 100)
      : clamp(Number(allocation.sparks) * 5, 0, 100);
    const weight = clamp(98 - (rank - 1) * 13 + Math.min(5, share * 0.1), 46, 100);
    addCauseSignal(map, allocation.label, weight, "explicit_priority", rank);

    const area = (allocation.causeArea ?? "").trim().slice(0, 120);
    const areaKey = normalize(area);
    if (areaKey) {
      const current = areaTotals.get(areaKey) ?? { label: area, share: 0, rank };
      current.share += share;
      current.rank = Math.min(current.rank, rank);
      areaTotals.set(areaKey, current);
    }
  });

  for (const area of areaTotals.values()) {
    addCauseSignal(
      map,
      area.label,
      clamp(96 - (area.rank - 1) * 11 + Math.min(6, area.share * 0.12), 44, 99),
      "explicit_priority",
      area.rank,
    );
  }

  cleanCauseList(declaredPriorities).forEach((cause, index) => {
    addCauseSignal(map, cause, Math.max(46, 90 - index * 7), "profile_priority", index + 1);
  });

  cleanCauseList(profileCauses).forEach((cause, index) => {
    addCauseSignal(map, cause, Math.max(42, 84 - index * 6), "profile_priority", index + 1);
  });

  cleanCauseList(savedSearchCauses).forEach((cause, index) => {
    addCauseSignal(map, cause, Math.max(30, 48 - index * 2), "saved_search", null);
  });

  browsingCauses.forEach((item) => {
    addCauseSignal(map, item.cause, clamp(item.weight, 10, 38), "browsing", null);
  });

  return [...map.values()]
    .filter((signal) => signal.weight > 0)
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        SOURCE_PRIORITY[right.source] - SOURCE_PRIORITY[left.source] ||
        left.cause.localeCompare(right.cause),
    )
    .slice(0, 24);
}

export function uniqueProfileCauses(...groups: Array<readonly string[] | null | undefined>) {
  return cleanCauseList(groups.flatMap((group) => group ?? [])).slice(0, 24);
}

function effectiveCauseSignals(profile: LiveNowProfileSignals) {
  if (profile.causeSignals?.length) return profile.causeSignals;
  return profile.causes.map((cause, index) => ({
    cause,
    weight: Math.max(42, 86 - index * 8),
    source: "profile_priority" as const,
    rank: index + 1,
  }));
}

function bestCauseMatch(candidateCauses: string[], signals: LiveNowCauseSignal[]) {
  let best:
    | {
        candidateCause: string;
        signal: LiveNowCauseSignal;
        semanticScore: number;
        weightedScore: number;
      }
    | null = null;

  for (const signal of signals) {
    for (const candidateCause of candidateCauses) {
      const semanticScore = causeMatchScore(signal.cause, candidateCause);
      if (!semanticScore) continue;
      const weightedScore = signal.weight * (semanticScore / 100);
      if (
        !best ||
        weightedScore > best.weightedScore ||
        (weightedScore === best.weightedScore && semanticScore > best.semanticScore) ||
        (weightedScore === best.weightedScore &&
          semanticScore === best.semanticScore &&
          SOURCE_PRIORITY[signal.source] > SOURCE_PRIORITY[best.signal.source])
      ) {
        best = { candidateCause, signal, semanticScore, weightedScore };
      }
    }
  }

  return best;
}

function difficultyLabel(value: number): LiveNowRecommendation["difficultyLabel"] {
  if (value <= 2.15) return "Easy";
  if (value <= 3.55) return "Moderate";
  return "Hard";
}

function actionFitLabel(
  difficulty: number,
  willingness: number,
): LiveNowRecommendation["actionFitLabel"] {
  const fit = 70 - difficulty * 8 + (willingness - 50) * 0.4;
  if (fit >= 54) return "Strong fit";
  if (fit >= 39) return "Possible fit";
  return "Stretch";
}

function defaultOpportunityType(candidate: LiveNowOfferCandidate): RecommendationOpportunityType {
  if (candidate.mode === "offset") return "donation_redirect";
  return "offer";
}

function defaultHref(candidate: LiveNowOfferCandidate, type: RecommendationOpportunityType) {
  if (type === "donation_pool") {
    return `/donation-offsets?pool=${encodeURIComponent(candidate.id)}`;
  }
  return `/offers/${encodeURIComponent(candidate.id)}`;
}

function defaultCtaLabel(type: RecommendationOpportunityType) {
  if (type === "donation_redirect") return "Review donation redirect";
  if (type === "donation_pool") return "Review redirect pool";
  return "Review proposal";
}

function sourceLabel(type: RecommendationOpportunityType, mode: LiveNowOfferCandidate["mode"]) {
  if (type === "donation_redirect") return "Donation redirect";
  if (type === "donation_pool") return "Donation redirect pool";
  if (mode === "payment") return "Paid moral trade";
  if (mode === "pledge") return "Pledge swap";
  return "Moral trade";
}

function explainRecommendation({
  benefitMatch,
  actionMatch,
  actionLabel,
  difficulty,
  willingness,
  learnedActionSignalCount,
}: {
  benefitMatch: ReturnType<typeof bestCauseMatch>;
  actionMatch: ReturnType<typeof bestCauseMatch>;
  actionLabel: string;
  difficulty: number;
  willingness: number;
  learnedActionSignalCount: number;
}) {
  const details: string[] = [];
  let reason = "Matches your stated interests";

  if (benefitMatch) {
    reason = `Matches your ${benefitMatch.signal.cause} priority`;
    details.push(
      benefitMatch.signal.source === "browsing"
        ? `The benefit overlaps with ${benefitMatch.signal.cause}, which you explored recently.`
        : `The offered benefit overlaps with your ${benefitMatch.signal.cause} priority.`,
    );
  }

  if (actionMatch) {
    const actionDetail = `The requested ${actionLabel.toLowerCase()} action also advances ${actionMatch.signal.cause}.`;
    details.push(actionDetail);
    if (!benefitMatch) reason = `The requested action matches your ${actionMatch.signal.cause} priority`;
  }

  const label = difficultyLabel(difficulty).toLowerCase();
  if (learnedActionSignalCount > 0) {
    details.push(
      `Your prior feedback currently models this action as ${label}, with ${Math.round(
        willingness,
      )}/100 willingness.`,
    );
  } else {
    details.push(`The initial burden estimate for this action is ${label}; you can correct it.`);
  }

  return { reason, details };
}

function diversify(recommendations: LiveNowRecommendation[], explorationPercent: number) {
  const remaining = [...recommendations];
  const selected: LiveNowRecommendation[] = [];
  const actionCounts = new Map<string, number>();
  const causeCounts = new Map<string, number>();
  const typeCounts = new Map<RecommendationOpportunityType, number>();
  const diversityStrength = clamp(explorationPercent, 0, 30) / 12;

  while (remaining.length) {
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;

    remaining.forEach((recommendation, index) => {
      const actionPenalty = (actionCounts.get(recommendation.actionKey) ?? 0) * 4.5;
      const causePenalty = (causeCounts.get(normalize(recommendation.matchCause)) ?? 0) * 2.25;
      const typePenalty = (typeCounts.get(recommendation.opportunityType) ?? 0) * 1.5;
      const adjusted =
        recommendation.score - (actionPenalty + causePenalty + typePenalty) * diversityStrength;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    });

    const [chosen] = remaining.splice(bestIndex, 1);
    selected.push(chosen);
    actionCounts.set(chosen.actionKey, (actionCounts.get(chosen.actionKey) ?? 0) + 1);
    const causeKey = normalize(chosen.matchCause);
    causeCounts.set(causeKey, (causeCounts.get(causeKey) ?? 0) + 1);
    typeCounts.set(chosen.opportunityType, (typeCounts.get(chosen.opportunityType) ?? 0) + 1);
  }

  return selected;
}

export function rankLiveNowOffers(
  candidates: LiveNowOfferCandidate[],
  profile: LiveNowProfileSignals,
  now = new Date(),
) {
  const causeSignals = effectiveCauseSignals(profile);
  if (!causeSignals.length) return [] as LiveNowRecommendation[];

  const ranked = candidates
    .filter(
      (candidate) =>
        (candidate.mode !== "payment" || profile.openToPayment !== false) &&
        (candidate.mode !== "pledge" || profile.openToPledges !== false),
    )
    .map((candidate) => {
      const opportunityType = candidate.opportunityType ?? defaultOpportunityType(candidate);
      const key = opportunityKey(opportunityType, candidate.id);
      if (profile.hiddenOpportunityKeys?.has(key)) return null;

      const benefitCauses = cleanCauseList(
        candidate.benefitCauses?.length ? candidate.benefitCauses : [candidate.offeredCause],
      );
      const actionCauses = cleanCauseList(
        candidate.actionCauses?.length ? candidate.actionCauses : [candidate.requestedCause],
      );
      const benefitMatch = bestCauseMatch(benefitCauses, causeSignals);
      const actionMatch = bestCauseMatch(actionCauses, causeSignals);
      if (!benefitMatch && !actionMatch) return null;

      const inferredAction = getActionDescriptor({
        actionText: candidate.requestAction || candidate.requestedCause,
        actionCause: actionCauses[0] ?? candidate.requestedCause,
        mode: candidate.mode,
        opportunityType,
      });
      const actionKey = candidate.actionKey || inferredAction.key;
      const actionLabel = candidate.actionLabel || inferredAction.label;
      const learnedAction = profile.actionPreferences?.get(actionKey);
      const difficulty = clamp(
        learnedAction?.difficulty ?? candidate.defaultDifficulty ?? inferredAction.defaultDifficulty,
        1,
        5,
      );
      const willingness = clamp(learnedAction?.willingness ?? 50, 0, 100);
      const learnedActionSignalCount = learnedAction?.observationCount ?? 0;

      const benefitScore = (benefitMatch?.weightedScore ?? 0) * 1.25;
      const actionCauseScore = (actionMatch?.weightedScore ?? 0) * (benefitMatch ? 0.58 : 0.72);
      const actionFitScore = (willingness - 50) * 0.35;
      const difficultyPenalty = (difficulty - 1) * 4;
      const recent = recencyScore(candidate.updatedAt || candidate.createdAt, now);
      const quality = qualityScore(candidate);
      const trust = clamp(candidate.trustLevel, 0, 5) * 1.5;
      const saved = profile.savedOpportunityKeys?.has(key) ?? false;
      const savedScore = saved ? 18 : 0;
      const score =
        benefitScore +
        actionCauseScore +
        actionFitScore -
        difficultyPenalty +
        recent +
        quality +
        trust +
        savedScore;
      const explanation = explainRecommendation({
        benefitMatch,
        actionMatch,
        actionLabel,
        difficulty,
        willingness,
        learnedActionSignalCount,
      });
      const primaryMatch = benefitMatch ?? actionMatch;
      if (!primaryMatch) return null;

      return {
        ...candidate,
        opportunityType,
        href: candidate.href || defaultHref(candidate, opportunityType),
        ctaLabel: candidate.ctaLabel || defaultCtaLabel(opportunityType),
        sourceLabel: candidate.sourceLabel || sourceLabel(opportunityType, candidate.mode),
        benefitCauses,
        actionCauses,
        actionKey,
        actionLabel,
        matchCause: primaryMatch.signal.cause,
        matchCauseSource: primaryMatch.signal.source,
        actionCauseMatch: actionMatch?.signal.cause ?? "",
        reason: explanation.reason,
        reasonDetails: explanation.details,
        score: Math.round(score * 100) / 100,
        difficulty: Math.round(difficulty * 100) / 100,
        difficultyLabel: difficultyLabel(difficulty),
        willingness: Math.round(willingness * 100) / 100,
        actionFitLabel: actionFitLabel(difficulty, willingness),
        learnedActionSignalCount,
        saved,
        scoreBreakdown: {
          benefit: Math.round(benefitScore * 100) / 100,
          actionCause: Math.round(actionCauseScore * 100) / 100,
          actionFit: Math.round(actionFitScore * 100) / 100,
          difficultyPenalty: Math.round(difficultyPenalty * 100) / 100,
          recency: Math.round(recent * 100) / 100,
          quality: Math.round(quality * 100) / 100,
          trust: Math.round(trust * 100) / 100,
          saved: savedScore,
        },
      } satisfies LiveNowRecommendation;
    })
    .filter((candidate): candidate is LiveNowRecommendation => Boolean(candidate))
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (Math.abs(scoreDifference) > 1e-9) return scoreDifference;

      const recencyDifference = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      if (Number.isFinite(recencyDifference) && recencyDifference !== 0) {
        return recencyDifference;
      }

      return `${left.opportunityType}:${left.id}`.localeCompare(
        `${right.opportunityType}:${right.id}`,
      );
    });

  return diversify(ranked, profile.explorationPercent ?? 12);
}

export function buildLiveNowRecentChanges(
  recommendations: LiveNowRecommendation[],
  now = new Date(),
) {
  const cutoff = now.getTime() - DAY_MS;
  const counts = new Map<string, number>();

  recommendations.forEach((recommendation) => {
    const timestamp = Date.parse(recommendation.updatedAt || recommendation.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) return;

    counts.set(recommendation.matchCause, (counts.get(recommendation.matchCause) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([cause, count]) => ({
      cause,
      count,
      label: `${cause} · ${count} ${count === 1 ? "opportunity" : "opportunities"} new or updated`,
    }))
    .sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause))
    .slice(0, 3) satisfies LiveNowRecentChange[];
}
