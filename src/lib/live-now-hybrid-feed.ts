import {
  rankLiveNowOffers,
  type LiveNowCauseSignal,
  type LiveNowOfferCandidate,
  type LiveNowProfileSignals,
  type LiveNowRecommendation,
} from "./live-now-recommendations";
import {
  cosineSimilarity,
  defaultPublicEmbeddingProvider,
  type PublicEmbeddingBatch,
  type PublicEmbeddingProvider,
} from "./public-semantic-embeddings";
import {
  buildPublicEmbeddingInputs,
  candidateEmbeddingKey,
  candidateKey,
  effectiveCauseSignals,
  normalizeHybridText,
  phraseSimilarity,
  publicOpportunityText,
  type MappedSignal,
} from "./live-now-hybrid-concepts";

export {
  buildPublicEmbeddingInputs,
  LIVE_NOW_CANONICAL_CONCEPTS,
} from "./live-now-hybrid-concepts";

export type LiveNowMatchClass = "direct" | "near" | "adjacent" | "discovery";

export interface ReciprocalAcceptanceEstimates {
  user: number;
  counterparty: number;
  completion: number;
  substantiveCompatibility: number;
}

export interface HybridLiveNowRecommendation extends LiveNowRecommendation {
  matchClass: LiveNowMatchClass;
  matchConfidence: number;
  semanticScore: number;
  lexicalScore: number;
  reciprocalScore: number;
  acceptanceEstimates: ReciprocalAcceptanceEstimates;
  semanticBasis: "public_embedding" | "deterministic_fallback" | "lexical_only";
}

export type LiveNowFeedExclusionReason =
  | "payment_disabled"
  | "pledge_disabled"
  | "hidden_by_user"
  | "incomplete_public_terms"
  | "outside_retrieval_pool";

export type LiveNowFeedSoftBlocker =
  | "low_substantive_compatibility"
  | "low_user_acceptance"
  | "low_counterparty_acceptance"
  | "low_completion_confidence";

export interface LiveNowFeedDiagnostics {
  version: "hybrid-reciprocal-v1";
  checkedAt: string;
  checkedInventoryCount: number;
  eligibleCount: number;
  retrievalPoolCount: number;
  semanticCandidateCount: number;
  directCount: number;
  nearMatchCount: number;
  adjacentCount: number;
  discoveryCount: number;
  selectedCount: number;
  mappedPriorityCount: number;
  unmappedPriorityCount: number;
  embeddingCoveragePercent: number;
  retrievalMode: PublicEmbeddingBatch["mode"] | "lexical_only";
  embeddingModel: string;
  privateTextSentToProvider: false;
  excludedByReason: Partial<Record<LiveNowFeedExclusionReason, number>>;
  softBlockers: Partial<Record<LiveNowFeedSoftBlocker, number>>;
  knownConstraintBlockers: Partial<Record<string, number>>;
}

export interface HybridLiveNowFeedResult {
  recommendations: HybridLiveNowRecommendation[];
  directRecommendations: HybridLiveNowRecommendation[];
  diagnostics: LiveNowFeedDiagnostics;
}

interface ScoredCandidate {
  recommendation: HybridLiveNowRecommendation;
  publicQuality: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_RETRIEVAL_POOL_SIZE = 360;
const FEED_LIMIT = 12;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function weightedProfileVector(
  mapped: readonly MappedSignal[],
  vectors: ReadonlyMap<string, number[]>,
) {
  const usable = mapped.flatMap((item) => {
    const vector = vectors.get(`concept:${item.concept.id}`);
    return vector ? [{ ...item, vector }] : [];
  });
  if (!usable.length) return null;
  const dimensions = usable[0].vector.length;
  if (usable.some((item) => item.vector.length !== dimensions)) return null;
  const result = Array.from({ length: dimensions }, () => 0);
  let totalWeight = 0;
  for (const item of usable) {
    const weight = Math.max(0, item.effectiveWeight);
    totalWeight += weight;
    for (let index = 0; index < dimensions; index += 1) {
      result[index] += item.vector[index] * weight;
    }
  }
  if (totalWeight <= 0) return null;
  for (let index = 0; index < dimensions; index += 1) result[index] /= totalWeight;
  const norm = Math.sqrt(result.reduce((sum, item) => sum + item * item, 0));
  return norm > 0 ? result.map((item) => item / norm) : null;
}

function bestProfileSignalForCandidate(
  profile: LiveNowProfileSignals,
  candidate: LiveNowOfferCandidate,
) {
  const publicText = publicOpportunityText(candidate);
  let best: { signal: LiveNowCauseSignal; score: number } | null = null;
  for (const signal of effectiveCauseSignals(profile)) {
    const score = Math.max(
      phraseSimilarity(signal.cause, publicText),
      ...[...(candidate.benefitCauses ?? []), candidate.offeredCause, candidate.compromiseCause]
        .filter(Boolean)
        .map((cause) => phraseSimilarity(signal.cause, cause)),
    );
    const weighted = score * (signal.weight / 100);
    if (!best || weighted > best.score) best = { signal, score: weighted };
  }
  return best;
}

function lexicalCompatibility(profile: LiveNowProfileSignals, candidate: LiveNowOfferCandidate) {
  const publicText = publicOpportunityText(candidate);
  let best = 0;
  for (const signal of effectiveCauseSignals(profile)) {
    const semantic = Math.max(
      phraseSimilarity(signal.cause, publicText),
      ...[
        ...(candidate.benefitCauses ?? []),
        ...(candidate.actionCauses ?? []),
        candidate.offeredCause,
        candidate.requestedCause,
      ].filter(Boolean)
        .map((cause) => phraseSimilarity(signal.cause, cause)),
    );
    best = Math.max(best, semantic * (signal.weight / 100));
  }
  return clamp(best);
}

function publicQuality(candidate: LiveNowOfferCandidate) {
  const fields = [candidate.offerAction, candidate.requestAction, candidate.verification, candidate.duration];
  const complete = fields.filter((field) => (field ?? "").trim().length >= 8).length / fields.length;
  const trust = clamp(Number(candidate.trustLevel) / 5);
  return clamp(complete * 0.68 + trust * 0.32);
}

function recency(candidate: LiveNowOfferCandidate, now: Date) {
  const timestamp = Date.parse(candidate.updatedAt || candidate.createdAt);
  if (!Number.isFinite(timestamp)) return 0;
  const days = Math.max(0, (now.getTime() - timestamp) / DAY_MS);
  return clamp(1 - days / 180);
}

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function retrievalPoolSize() {
  const configured = Number(process.env.LIVE_FEED_RETRIEVAL_POOL_SIZE);
  return Number.isInteger(configured)
    ? Math.round(clamp(configured, 60, 800))
    : DEFAULT_RETRIEVAL_POOL_SIZE;
}

function eligibleCandidates(
  candidates: readonly LiveNowOfferCandidate[],
  profile: LiveNowProfileSignals,
) {
  const excludedByReason: Partial<Record<LiveNowFeedExclusionReason, number>> = {};
  const exclude = (reason: LiveNowFeedExclusionReason) => {
    excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
  };
  const eligible: LiveNowOfferCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidateKey(candidate);
    if (!candidate.id.trim() || !candidate.offeredCause.trim() || !candidate.requestedCause.trim()) {
      exclude("incomplete_public_terms");
      continue;
    }
    if (candidate.mode === "payment" && profile.openToPayment === false) {
      exclude("payment_disabled");
      continue;
    }
    if (candidate.mode === "pledge" && profile.openToPledges === false) {
      exclude("pledge_disabled");
      continue;
    }
    if (profile.hiddenOpportunityKeys?.has(key)) {
      exclude("hidden_by_user");
      continue;
    }
    eligible.push(candidate);
  }

  return { eligible, excludedByReason };
}

function buildRetrievalPool(
  eligible: readonly LiveNowOfferCandidate[],
  profile: LiveNowProfileSignals,
  now: Date,
) {
  const maximum = retrievalPoolSize();
  if (eligible.length <= maximum) return [...eligible];
  const ranked = eligible.map((candidate) => ({
    candidate,
    lexical: lexicalCompatibility(profile, candidate),
    quality: publicQuality(candidate),
    recency: recency(candidate, now),
    saved: profile.savedOpportunityKeys?.has(candidateKey(candidate)) ?? false,
    hash: stableHash(candidateKey(candidate)) / 0xffffffff,
  }));
  const exploitationCount = Math.max(1, Math.floor(maximum * 0.78));
  const selected = new Map<string, LiveNowOfferCandidate>();
  ranked
    .filter((item) => item.saved)
    .sort((left, right) =>
      right.lexical - left.lexical ||
      right.quality - left.quality ||
      right.recency - left.recency ||
      candidateKey(left.candidate).localeCompare(candidateKey(right.candidate)),
    )
    .forEach(({ candidate }) => {
      if (selected.size < maximum) selected.set(candidateKey(candidate), candidate);
    });
  ranked
    .sort((left, right) =>
      (right.lexical * 0.62 + right.quality * 0.24 + right.recency * 0.14) -
        (left.lexical * 0.62 + left.quality * 0.24 + left.recency * 0.14) ||
      candidateKey(left.candidate).localeCompare(candidateKey(right.candidate)),
    )
    .slice(0, exploitationCount)
    .forEach(({ candidate }) => {
      if (selected.size < maximum) selected.set(candidateKey(candidate), candidate);
    });
  ranked
    .sort((left, right) =>
      left.hash - right.hash || candidateKey(left.candidate).localeCompare(candidateKey(right.candidate)),
    )
    .forEach(({ candidate }) => {
      if (selected.size < maximum) selected.set(candidateKey(candidate), candidate);
    });
  return [...selected.values()];
}

function forcedDecoration(
  candidate: LiveNowOfferCandidate,
  profile: LiveNowProfileSignals,
  now: Date,
) {
  const forcedCause =
    candidate.benefitCauses?.find(Boolean) ||
    candidate.offeredCause ||
    candidate.actionCauses?.find(Boolean) ||
    candidate.requestedCause;
  const forcedProfile: LiveNowProfileSignals = {
    ...profile,
    causes: [forcedCause],
    causeSignals: [{
      cause: forcedCause,
      weight: 100,
      source: "profile_priority",
      rank: 1,
    }],
  };
  return rankLiveNowOffers([candidate], forcedProfile, now)[0] ?? null;
}

function userAcceptance(recommendation: LiveNowRecommendation) {
  const willingness = clamp(recommendation.willingness / 100);
  const effortFit = clamp(1 - (recommendation.difficulty - 1) / 4);
  return clamp(0.16 + willingness * 0.56 + effortFit * 0.22 + (recommendation.saved ? 0.08 : 0));
}

function counterpartyAcceptance(
  recommendation: LiveNowRecommendation,
  quality: number,
  userEstimate: number,
) {
  const trust = clamp(recommendation.trustLevel / 5);
  const termsAreSpecific = recommendation.requestAction.trim().length >= 12 ? 1 : 0.45;
  return clamp(0.22 + quality * 0.25 + userEstimate * 0.28 + trust * 0.17 + termsAreSpecific * 0.08);
}

function completionProbability(
  recommendation: LiveNowRecommendation,
  quality: number,
) {
  const trust = clamp(recommendation.trustLevel / 5);
  const effortFit = clamp(1 - (recommendation.difficulty - 1) / 4);
  const evidence = recommendation.verification.trim().length >= 12 ? 1 : 0.35;
  return clamp(0.18 + trust * 0.28 + quality * 0.18 + effortFit * 0.22 + evidence * 0.14);
}

function matchClass(
  lexicalDirect: boolean,
  substantive: number,
  reciprocal: number,
  estimates: ReciprocalAcceptanceEstimates,
): LiveNowMatchClass {
  const allAcceptanceClear =
    estimates.user >= 0.44 &&
    estimates.counterparty >= 0.48 &&
    estimates.completion >= 0.45;
  if (
    allAcceptanceClear &&
    substantive >= 0.56 &&
    reciprocal >= 0.58 &&
    (lexicalDirect || substantive >= 0.68)
  ) {
    return "direct";
  }
  if (substantive >= 0.42 && reciprocal >= 0.49) return "near";
  if (substantive >= 0.27) return "adjacent";
  return "discovery";
}

function matchReason(match: LiveNowMatchClass, cause: string) {
  if (match === "direct") return `Direct reciprocal match for your ${cause} priority`;
  if (match === "near") return `Promising near-match for your ${cause} priority`;
  if (match === "adjacent") return `Adjacent to your ${cause} priority`;
  return "Exploration candidate outside your strongest current matches";
}

function explainClass(
  match: LiveNowMatchClass,
  semanticBasis: HybridLiveNowRecommendation["semanticBasis"],
  estimates: ReciprocalAcceptanceEstimates,
) {
  const details = [
    semanticBasis === "public_embedding"
      ? "Semantic retrieval used only public opportunity text and fixed public cause concepts; private profile prose was not sent to the provider."
      : semanticBasis === "deterministic_fallback"
        ? "The provider was unavailable or disabled, so this result used the deterministic local semantic fallback."
        : "No canonical profile concept was available, so this result relies on local lexical and behavioral signals.",
    [
      `Estimated fit: ${Math.round(estimates.substantiveCompatibility * 100)}/100 substantive compatibility,`,
      `${Math.round(estimates.user * 100)}/100 likelihood that the requested action is workable for you,`,
      `${Math.round(estimates.counterparty * 100)}/100 counterparty acceptance, and`,
      `${Math.round(estimates.completion * 100)}/100 completion confidence.`,
    ].join(" "),
  ];
  if (match === "direct") {
    details.push("This clears the current direct-match thresholds; it is still a prediction, not a guarantee of acceptance or impact.");
  } else if (match === "near") {
    details.push("One or more estimates remain below the direct-match threshold; review the terms before treating it as a feasible trade.");
  } else if (match === "adjacent") {
    details.push("This is relevant to a stated priority, but reciprocal feasibility is not yet established.");
  } else {
    details.push("This is deliberately exploratory and is not presented as a match.");
  }
  return details;
}

function selectedFeed(scored: readonly ScoredCandidate[], explorationPercent: number) {
  const byClass = new Map<LiveNowMatchClass, ScoredCandidate[]>([
    ["direct", []],
    ["near", []],
    ["adjacent", []],
    ["discovery", []],
  ]);
  scored.forEach((item) => byClass.get(item.recommendation.matchClass)!.push(item));
  for (const items of byClass.values()) {
    items.sort((left, right) =>
      right.recommendation.reciprocalScore - left.recommendation.reciprocalScore ||
      right.publicQuality - left.publicQuality ||
      right.recommendation.score - left.recommendation.score ||
      left.recommendation.id.localeCompare(right.recommendation.id),
    );
  }

  const discoverySlots = Math.max(0, Math.min(3, Math.round(FEED_LIMIT * clamp(explorationPercent, 0, 30) / 100)));
  const reservations: Array<[LiveNowMatchClass, number]> = [
    ["direct", 6],
    ["near", 3],
    ["adjacent", 2],
    ["discovery", discoverySlots],
  ];
  const selected = new Map<string, ScoredCandidate>();
  for (const [classification, count] of reservations) {
    byClass
      .get(classification)!
      .slice(0, count)
      .forEach((item) => selected.set(candidateKey(item.recommendation), item));
  }
  const fill = [...scored].sort((left, right) =>
    ({ direct: 4, near: 3, adjacent: 2, discovery: 1 }[right.recommendation.matchClass] -
      { direct: 4, near: 3, adjacent: 2, discovery: 1 }[left.recommendation.matchClass]) ||
    right.recommendation.reciprocalScore - left.recommendation.reciprocalScore ||
    left.recommendation.id.localeCompare(right.recommendation.id),
  );
  for (const item of fill) {
    if (selected.size >= FEED_LIMIT) break;
    selected.set(candidateKey(item.recommendation), item);
  }
  return [...selected.values()]
    .sort((left, right) =>
      ({ direct: 4, near: 3, adjacent: 2, discovery: 1 }[right.recommendation.matchClass] -
        { direct: 4, near: 3, adjacent: 2, discovery: 1 }[left.recommendation.matchClass]) ||
      right.recommendation.reciprocalScore - left.recommendation.reciprocalScore ||
      left.recommendation.id.localeCompare(right.recommendation.id),
    )
    .map((item) => item.recommendation);
}

export function emptyHybridLiveNowFeedDiagnostics(
  checkedAt: Date,
  checkedInventoryCount: number,
  excludedByReason: LiveNowFeedDiagnostics["excludedByReason"] = {},
): LiveNowFeedDiagnostics {
  return {
    version: "hybrid-reciprocal-v1",
    checkedAt: checkedAt.toISOString(),
    checkedInventoryCount,
    eligibleCount: 0,
    retrievalPoolCount: 0,
    semanticCandidateCount: 0,
    directCount: 0,
    nearMatchCount: 0,
    adjacentCount: 0,
    discoveryCount: 0,
    selectedCount: 0,
    mappedPriorityCount: 0,
    unmappedPriorityCount: 0,
    embeddingCoveragePercent: 0,
    retrievalMode: "lexical_only",
    embeddingModel: "none",
    privateTextSentToProvider: false,
    excludedByReason,
    softBlockers: {},
    knownConstraintBlockers: {},
  };
}

export function applyKnownFeasibilityToHybridFeed(
  result: HybridLiveNowFeedResult,
  blockedSources: readonly { sourceId: string; reasons: readonly string[] }[],
): HybridLiveNowFeedResult {
  const blocked = new Map(
    blockedSources
      .filter((source) => source.sourceId && source.reasons.length)
      .map((source) => [source.sourceId, [...new Set(source.reasons)]]),
  );
  if (!blocked.size) return result;

  const knownConstraintBlockers: Partial<Record<string, number>> = {
    ...result.diagnostics.knownConstraintBlockers,
  };
  const blockedDirectIds = new Set<string>();
  for (const recommendation of result.directRecommendations) {
    const reasons = blocked.get(recommendation.id);
    if (!reasons) continue;
    blockedDirectIds.add(recommendation.id);
    reasons.forEach((reason) => {
      knownConstraintBlockers[reason] = (knownConstraintBlockers[reason] ?? 0) + 1;
    });
  }
  if (!blockedDirectIds.size) return result;

  const downgrade = (
    recommendation: HybridLiveNowRecommendation,
  ): HybridLiveNowRecommendation => {
    const reasons = blocked.get(recommendation.id);
    if (recommendation.matchClass !== "direct" || !reasons) return recommendation;
    const readable = reasons.map((reason) => reason.replaceAll("_", " ")).join(", ");
    return {
      ...recommendation,
      matchClass: "near",
      reason: `Near-match blocked by known profile constraints: ${readable}`,
      reasonDetails: [
        ...recommendation.reasonDetails,
        `This does not count as a direct match because the current route profile blocks it on: ${readable}.`,
      ],
    };
  };
  const recommendations = result.recommendations
    .map(downgrade)
    .sort((left, right) =>
      ({ direct: 4, near: 3, adjacent: 2, discovery: 1 }[right.matchClass] -
        { direct: 4, near: 3, adjacent: 2, discovery: 1 }[left.matchClass]) ||
      right.reciprocalScore - left.reciprocalScore ||
      candidateKey(left).localeCompare(candidateKey(right)),
    );
  const blockedDirectCount = blockedDirectIds.size;

  return {
    recommendations,
    directRecommendations: result.directRecommendations.filter(
      (recommendation) => !blockedDirectIds.has(recommendation.id),
    ),
    diagnostics: {
      ...result.diagnostics,
      directCount: Math.max(0, result.diagnostics.directCount - blockedDirectCount),
      nearMatchCount: result.diagnostics.nearMatchCount + blockedDirectCount,
      knownConstraintBlockers,
    },
  };
}

export async function buildHybridLiveNowFeed({
  candidates,
  profile,
  now = new Date(),
  embeddingProvider = defaultPublicEmbeddingProvider,
}: {
  candidates: readonly LiveNowOfferCandidate[];
  profile: LiveNowProfileSignals;
  now?: Date;
  embeddingProvider?: PublicEmbeddingProvider;
}): Promise<HybridLiveNowFeedResult> {
  if (!effectiveCauseSignals(profile).length) {
    return {
      recommendations: [],
      directRecommendations: [],
      diagnostics: emptyHybridLiveNowFeedDiagnostics(now, candidates.length),
    };
  }

  const { eligible, excludedByReason } = eligibleCandidates(candidates, profile);
  if (!eligible.length) {
    return {
      recommendations: [],
      directRecommendations: [],
      diagnostics: emptyHybridLiveNowFeedDiagnostics(now, candidates.length, excludedByReason),
    };
  }

  const pool = buildRetrievalPool(eligible, profile, now);
  if (pool.length < eligible.length) {
    excludedByReason.outside_retrieval_pool = eligible.length - pool.length;
  }
  const lexicalDirect = new Map(
    rankLiveNowOffers([...pool], profile, now).map((recommendation) => [candidateKey(recommendation), recommendation]),
  );
  const { inputs, mapped } = buildPublicEmbeddingInputs(pool, profile);
  // Do not transmit public inventory to an external provider when no private
  // priority can be mapped locally to a fixed public concept. In that case an
  // embedding cannot contribute to the profile comparison.
  const embeddingBatch: PublicEmbeddingBatch = mapped.length
    ? await embeddingProvider.embed(inputs)
    : {
        vectors: new Map(),
        mode: "deterministic_fallback",
        model: "none",
        dimensions: 0,
        cacheHitCount: 0,
        providerInputCount: 0,
        privateTextSentToProvider: false,
      };
  const profileVector = weightedProfileVector(mapped, embeddingBatch.vectors);
  const signalCount = effectiveCauseSignals(profile).length;
  const mappedSignalNames = new Set(mapped.map((item) => normalizeHybridText(item.signal.cause)));
  const softBlockers: Partial<Record<LiveNowFeedSoftBlocker, number>> = {};
  const addSoftBlocker = (reason: LiveNowFeedSoftBlocker) => {
    softBlockers[reason] = (softBlockers[reason] ?? 0) + 1;
  };
  const scored: ScoredCandidate[] = [];

  for (const candidate of pool) {
    const direct = lexicalDirect.get(candidateKey(candidate)) ?? null;
    const recommendation = direct ?? forcedDecoration(candidate, profile, now);
    if (!recommendation) continue;
    const candidateVector = embeddingBatch.vectors.get(candidateEmbeddingKey(candidate));
    const rawCosine = profileVector && candidateVector
      ? cosineSimilarity(profileVector, candidateVector)
      : 0;
    const semanticScore = profileVector && candidateVector
      ? clamp((rawCosine - 0.08) / 0.72)
      : 0;
    const lexicalScore = lexicalCompatibility(profile, candidate);
    const substantiveCompatibility = clamp(Math.max(semanticScore, lexicalScore * 0.94));
    const quality = publicQuality(candidate);
    const user = userAcceptance(recommendation);
    const counterparty = counterpartyAcceptance(recommendation, quality, user);
    const completion = completionProbability(recommendation, quality);
    const estimates = {
      user,
      counterparty,
      completion,
      substantiveCompatibility,
    } satisfies ReciprocalAcceptanceEstimates;
    const reciprocalScore = Math.pow(
      Math.max(0.0001, user * counterparty * completion * Math.max(0.05, substantiveCompatibility)),
      0.25,
    );
    const classification = matchClass(Boolean(direct), substantiveCompatibility, reciprocalScore, estimates);
    if (substantiveCompatibility < 0.27) addSoftBlocker("low_substantive_compatibility");
    if (user < 0.44) addSoftBlocker("low_user_acceptance");
    if (counterparty < 0.48) addSoftBlocker("low_counterparty_acceptance");
    if (completion < 0.45) addSoftBlocker("low_completion_confidence");
    const bestSignal = bestProfileSignalForCandidate(profile, candidate)?.signal ?? effectiveCauseSignals(profile)[0];
    const semanticBasis: HybridLiveNowRecommendation["semanticBasis"] = profileVector && candidateVector
      ? embeddingBatch.mode === "deterministic_fallback"
        ? "deterministic_fallback"
        : "public_embedding"
      : "lexical_only";
    const reason = matchReason(classification, bestSignal.cause);
    const reasonDetails = explainClass(classification, semanticBasis, estimates);
    const score =
      reciprocalScore * 100 +
      substantiveCompatibility * 25 +
      (recommendation.saved ? 8 : 0) +
      recency(candidate, now) * 3;
    const hybrid = {
      ...recommendation,
      matchCause: bestSignal.cause,
      matchCauseSource: bestSignal.source,
      reason,
      reasonDetails,
      score: round(score, 2),
      scoreBreakdown: {
        benefit: round(substantiveCompatibility * 100, 2),
        actionCause: round(lexicalScore * 40, 2),
        actionFit: round((user - 0.5) * 40, 2),
        difficultyPenalty: round((recommendation.difficulty - 1) * 4, 2),
        recency: round(recency(candidate, now) * 12, 2),
        quality: round(quality * 8, 2),
        trust: round(clamp(recommendation.trustLevel / 5) * 7.5, 2),
        saved: recommendation.saved ? 18 : 0,
      },
      matchClass: classification,
      matchConfidence: Math.round(reciprocalScore * 100),
      semanticScore: round(semanticScore),
      lexicalScore: round(lexicalScore),
      reciprocalScore: round(reciprocalScore),
      acceptanceEstimates: {
        user: round(user),
        counterparty: round(counterparty),
        completion: round(completion),
        substantiveCompatibility: round(substantiveCompatibility),
      },
      semanticBasis,
    } satisfies HybridLiveNowRecommendation;
    scored.push({ recommendation: hybrid, publicQuality: quality });
  }

  const counts = { direct: 0, near: 0, adjacent: 0, discovery: 0 };
  scored.forEach(({ recommendation }) => {
    counts[recommendation.matchClass] += 1;
  });
  const recommendations = selectedFeed(scored, profile.explorationPercent ?? 12);
  const directRecommendations = scored
    .filter((item) => item.recommendation.matchClass === "direct")
    .sort((left, right) =>
      right.recommendation.reciprocalScore - left.recommendation.reciprocalScore ||
      left.recommendation.id.localeCompare(right.recommendation.id),
    )
    .map((item) => item.recommendation);
  const embeddedCandidates = pool.filter((candidate) =>
    embeddingBatch.vectors.has(candidateEmbeddingKey(candidate)),
  ).length;

  return {
    recommendations,
    directRecommendations,
    diagnostics: {
      version: "hybrid-reciprocal-v1",
      checkedAt: now.toISOString(),
      checkedInventoryCount: candidates.length,
      eligibleCount: eligible.length,
      retrievalPoolCount: pool.length,
      semanticCandidateCount: scored.filter((item) => item.recommendation.semanticScore >= 0.27).length,
      directCount: counts.direct,
      nearMatchCount: counts.near,
      adjacentCount: counts.adjacent,
      discoveryCount: counts.discovery,
      selectedCount: recommendations.length,
      mappedPriorityCount: mappedSignalNames.size,
      unmappedPriorityCount: Math.max(0, signalCount - mappedSignalNames.size),
      embeddingCoveragePercent: pool.length ? Math.round((embeddedCandidates / pool.length) * 100) : 0,
      retrievalMode: profileVector ? embeddingBatch.mode : "lexical_only",
      embeddingModel: profileVector ? embeddingBatch.model : "none",
      privateTextSentToProvider: false,
      excludedByReason,
      softBlockers,
      knownConstraintBlockers: {},
    },
  };
}
