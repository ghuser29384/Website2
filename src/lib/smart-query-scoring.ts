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
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function tokenSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.86;
  const maximumDistance = Math.max(left.length, right.length) >= 8 ? 2 : 1;
  if (Math.min(left.length, right.length) >= 4 && editDistance(left, right) <= maximumDistance) {
    return 0.72;
  }
  return 0;
}

function scoreTerms(terms: readonly string[], fields: readonly WeightedSemanticField[]) {
  if (!terms.length) return 0.5;
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of fields) {
      const normalized = normalizeSmartQueryText(field.value);
      const weight = clamp(field.weight ?? 1);
      if (!normalized) continue;
      if (normalized.includes(term)) {
        best = Math.max(best, weight);
        continue;
      }
      for (const token of smartQueryTokens(normalized)) {
        best = Math.max(best, tokenSimilarity(term, token) * weight);
      }
    }
    total += best;
  }
  return clamp(total / terms.length);
}

export function directSemanticTextScore(
  query: string,
  fields: readonly WeightedSemanticField[],
) {
  return scoreTerms([...new Set(smartQueryTokens(query))], fields);
}

export function smartInterpretationScore(
  interpretation: SmartQueryInterpretation,
  fields: readonly WeightedSemanticField[],
) {
  const residual = interpretation.residualTerms.length
    ? scoreTerms(interpretation.residualTerms, fields)
    : null;
  const causeScores = interpretation.facets.causes.map((causeId) =>
    Math.max(
      ...getSmartQueryCauseAliases(causeId).map((alias) => directSemanticTextScore(alias, fields)),
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
) {
  if (!causeIds.length) return 1;
  const scores = causeIds.map((causeId) =>
    Math.max(
      ...getSmartQueryCauseAliases(causeId).map((alias) => directSemanticTextScore(alias, fields)),
    ),
  );
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function smartPersonalPriorityScore(
  causeIds: readonly string[],
  personalPriorities: readonly string[],
) {
  if (!causeIds.length || !personalPriorities.length) return 0.5;
  const fields = personalPriorities.map((value) => ({ value, weight: 1 }));
  return Math.max(
    ...causeIds.map((causeId) =>
      Math.max(
        ...getSmartQueryCauseAliases(causeId).map((alias) => directSemanticTextScore(alias, fields)),
      ),
    ),
  );
}
