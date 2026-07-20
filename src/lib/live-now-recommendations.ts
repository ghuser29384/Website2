export interface LiveNowProfileSignals {
  causes: string[];
  openToPayment: boolean | null;
  openToPledges: boolean | null;
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
}

export interface LiveNowRecommendation extends LiveNowOfferCandidate {
  matchCause: string;
  reason: string;
  score: number;
}

export interface LiveNowRecentChange {
  cause: string;
  count: number;
  label: string;
}

const DAY_MS = 86_400_000;

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function bestCauseMatch(candidate: LiveNowOfferCandidate, causes: string[]) {
  const candidateCauses = [
    candidate.offeredCause,
    candidate.requestedCause,
    candidate.compromiseCause === "Not needed" ? "" : candidate.compromiseCause,
  ].filter(Boolean);
  let best: { cause: string; preferenceIndex: number; score: number } | null = null;

  for (const [preferenceIndex, cause] of causes.entries()) {
    for (const candidateCause of candidateCauses) {
      const score = causeMatchScore(cause, candidateCause);
      if (
        score > 0 &&
        (!best || score > best.score || (score === best.score && preferenceIndex < best.preferenceIndex))
      ) {
        best = { cause, preferenceIndex, score };
      }
    }
  }

  return best;
}

export function uniqueProfileCauses(...groups: Array<readonly string[] | null | undefined>) {
  const seen = new Set<string>();
  const causes: string[] = [];

  groups.flatMap((group) => group ?? []).forEach((cause) => {
    const trimmed = cause.trim().slice(0, 120);
    const key = normalize(trimmed);
    if (!key || seen.has(key)) return;

    seen.add(key);
    causes.push(trimmed);
  });

  return causes.slice(0, 12);
}

export function rankLiveNowOffers(
  candidates: LiveNowOfferCandidate[],
  profile: LiveNowProfileSignals,
  now = new Date(),
) {
  if (!profile.causes.length) return [] as LiveNowRecommendation[];

  return candidates
    .filter(
      (candidate) =>
        (candidate.mode !== "payment" || profile.openToPayment !== false) &&
        (candidate.mode !== "pledge" || profile.openToPledges !== false),
    )
    .map((candidate) => {
      const match = bestCauseMatch(candidate, profile.causes);
      if (!match) return null;

      const priorityWeight = Math.max(0, 14 - match.preferenceIndex * 2);
      const score =
        match.score +
        priorityWeight +
        recencyScore(candidate.updatedAt || candidate.createdAt, now) +
        qualityScore(candidate);

      return {
        ...candidate,
        matchCause: match.cause,
        reason: `Matches your ${match.cause} priority`,
        score: Math.round(score * 100) / 100,
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

      return left.id.localeCompare(right.id);
    });
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
      label: `${cause} · ${count} ${count === 1 ? "proposal" : "proposals"} new or updated`,
    }))
    .sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause))
    .slice(0, 3) satisfies LiveNowRecentChange[];
}
