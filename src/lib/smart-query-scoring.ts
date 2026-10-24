import {
  getSmartQueryCauseAliases,
  normalizeSmartQueryText,
  smartQueryTokens,
  type SmartQueryInterpretation,
  type WeightedSemanticField,
} from "./smart-query";

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let current = new Array<number>(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous[right.length];
}

function tokenSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.86;
  const maximumDistance = Math.max(left.length, right.length) >= 8 ? 2 : 1;
  if (
    Math.min(left.length, right.length) >= 4 &&
    Math.abs(left.length - right.length) <= maximumDistance &&
    editDistance(left, right) <= maximumDistance
  ) {
    return 0.72;
  }
  return 0;
}

export type SemanticSimilarity = (left: string, right: string) => number;

// Create once per search request; never retain participant input across requests.
export function createSemanticSimilarity(): SemanticSimilarity {
  const pairs = new Map<string, Map<string, number>>();
  let size = 0;
  return (left, right) => {
    const known = pairs.get(left)?.get(right);
    if (known !== undefined) return known;
    const score = tokenSimilarity(left, right);
    if (size < 4096) {
      let row = pairs.get(left);
      if (!row) { row = new Map(); pairs.set(left, row); }
      row.set(right, score);
      size += 1;
    }
    return score;
  };
}

function createScorer(fields: readonly WeightedSemanticField[], similarity: SemanticSimilarity = tokenSimilarity) {
  let prepared: Array<{ normalized: string; weight: number; tokens: string[] | null }> | undefined;
  return (terms: readonly string[]) => {
    if (!terms.length) return 0.5;
    prepared ??= fields.map((field) => ({
      normalized: normalizeSmartQueryText(field.value),
      weight: clamp(field.weight ?? 1),
      tokens: null as string[] | null,
    }));
    let total = 0;
    for (const term of terms) {
      let best = 0;
      for (const field of prepared) {
        const { normalized, weight } = field;
        if (!normalized || best >= weight) continue;
        if (normalized.includes(term)) {
          best = Math.max(best, weight);
          continue;
        }
        for (const token of (field.tokens ??= smartQueryTokens(normalized))) {
          best = Math.max(best, similarity(term, token) * weight);
          if (best >= weight) break;
        }
      }
      total += best;
    }
    return clamp(total / terms.length);
  };
}

export function directSemanticTextScore(
  query: string,
  fields: readonly WeightedSemanticField[],
  similarity?: SemanticSimilarity,
) {
  return createScorer(fields, similarity)([...new Set(smartQueryTokens(query))]);
}

export function smartInterpretationScore(
  interpretation: SmartQueryInterpretation,
  fields: readonly WeightedSemanticField[],
  similarity?: SemanticSimilarity,
) {
  const scoreTerms = createScorer(fields, similarity);
  const residual = interpretation.residualTerms.length
    ? scoreTerms(interpretation.residualTerms)
    : null;
  const causeScores = interpretation.facets.causes.map((causeId) =>
    Math.max(
      ...getSmartQueryCauseAliases(causeId).map((alias) => scoreTerms([...new Set(smartQueryTokens(alias))])),
    ),
  );
  const cause = causeScores.length
    ? causeScores.reduce((sum, score) => sum + score, 0) / causeScores.length
    : null;

  if (residual !== null && cause !== null) return clamp(0.58 * residual + 0.42 * cause);
  if (residual !== null) return residual;
  if (cause !== null) return cause;
  return 0.5;
}

export function smartCauseMatchScore(
  causeIds: readonly string[],
  fields: readonly WeightedSemanticField[],
  similarity?: SemanticSimilarity,
) {
  if (!causeIds.length) return 1;
  const scoreTerms = createScorer(fields, similarity);
  const scores = causeIds.map((causeId) =>
    Math.max(
      ...getSmartQueryCauseAliases(causeId).map((alias) => scoreTerms([...new Set(smartQueryTokens(alias))])),
    ),
  );
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function smartPersonalPriorityScore(
  causeIds: readonly string[],
  personalPriorities: readonly string[],
  similarity?: SemanticSimilarity,
) {
  if (!causeIds.length || !personalPriorities.length) return 0.5;
  const fields = personalPriorities.map((value) => ({ value, weight: 1 }));
  const scoreTerms = createScorer(fields, similarity);
  return Math.max(
    ...causeIds.map((causeId) =>
      Math.max(
        ...getSmartQueryCauseAliases(causeId).map((alias) => scoreTerms([...new Set(smartQueryTokens(alias))])),
      ),
    ),
  );
}
