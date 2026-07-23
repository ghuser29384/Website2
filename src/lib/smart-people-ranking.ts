import type { CredibilitySummary } from "@/lib/credibility";
import {
  creditRankingSignal,
  profileMatchesFilters,
  rankProfiles,
  type PeopleDiscoveryFilters,
  type PeopleDiscoverySort,
  type ProfileDiscoveryLike,
} from "@/lib/discovery-ranking";
import { smartDiscoveryScore } from "@/lib/smart-discovery-ranking";
import {
  normalizeSmartQueryText,
  parseSmartQuery,
  type SmartQueryInterpretation,
} from "@/lib/smart-query";
import {
  smartCauseMatchScore,
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "@/lib/smart-query-scoring";

interface SmartProfileSignals {
  credit: number;
  profile: ProfileDiscoveryLike;
  score: number;
  semanticRelevance: number;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function profileTextFields(profile: ProfileDiscoveryLike) {
  return [
    { value: `${profile.resolvedName} ${profile.display_name ?? ""}`, weight: 1 },
    { value: profile.wishCauses.join(" "), weight: 0.96 },
    { value: profile.wishCollectiveName, weight: 0.88 },
    { value: profile.wishPreview, weight: 0.8 },
    { value: profile.bio, weight: 0.76 },
    { value: profile.publicLocation, weight: 0.68 },
  ] as const;
}

function profileCauseIds(profile: ProfileDiscoveryLike) {
  return parseSmartQuery(
    `${profile.wishCauses.join(" ")} ${profile.wishPreview ?? ""} ${profile.bio ?? ""}`,
    { surface: "people" },
  ).facets.causes;
}

function profileHasReviewedEvidence(
  profile: ProfileDiscoveryLike,
  credibility: CredibilitySummary | undefined,
) {
  return Boolean(
    profile.verificationBadges.length ||
      profile.ratingCount ||
      (credibility?.eventCount ?? 0) > 0,
  );
}

function profileEvidenceQuality(
  profile: ProfileDiscoveryLike,
  credibility: CredibilitySummary | undefined,
) {
  const badgeSignal = clamp(profile.verificationBadges.length / 3);
  const ratingSignal = clamp(Math.log1p(profile.ratingCount) / Math.log1p(12));
  const observationSignal = clamp(
    Math.log1p(Math.max(0, credibility?.effectiveObservations ?? 0)) / Math.log1p(30),
  );
  const confidenceSignal =
    credibility?.confidence === "high"
      ? 1
      : credibility?.confidence === "medium"
        ? 0.72
        : credibility?.confidence === "low"
          ? 0.42
          : 0.12;
  return clamp(
    0.34 * badgeSignal +
      0.2 * ratingSignal +
      0.28 * observationSignal +
      0.18 * confidenceSignal,
  );
}

function matchesLocation(profile: ProfileDiscoveryLike, location: string) {
  const target = normalizeSmartQueryText(location);
  const visibleLocation = normalizeSmartQueryText(profile.publicLocation);
  return Boolean(target && visibleLocation && visibleLocation.includes(target));
}

function matchesSmartProfileConstraints(
  profile: ProfileDiscoveryLike,
  credibility: CredibilitySummary | undefined,
  interpretation: SmartQueryInterpretation,
  causeIds: readonly string[],
) {
  const facets = interpretation.facets;
  const fields = profileTextFields(profile);

  if (facets.causes.length) {
    const directCauseMatch = facets.causes.some((cause) => causeIds.includes(cause));
    if (!directCauseMatch && smartCauseMatchScore(facets.causes, fields) < 0.42) return false;
  }
  if (
    facets.participantKinds.length &&
    (!profile.wishParticipantKind || !facets.participantKinds.includes(profile.wishParticipantKind))
  ) {
    return false;
  }
  if (facets.openToPayment !== null && profile.wishOpenToPayment !== facets.openToPayment) {
    return false;
  }
  if (facets.openToPledges !== null && profile.wishOpenToPledges !== facets.openToPledges) {
    return false;
  }
  const reviewed = profileHasReviewedEvidence(profile, credibility);
  if (facets.verified !== null && reviewed !== facets.verified) return false;
  if (
    facets.minCredit !== null &&
    (!credibility || credibility.score === null || credibility.score < facets.minCredit)
  ) {
    return false;
  }
  if (facets.location && !matchesLocation(profile, facets.location)) return false;

  // A people record cannot truthfully satisfy offer-specific hard constraints. Fail closed instead
  // of silently discarding them; the inline interpreter can then ask the user to retarget the query.
  if (
    facets.minAmountCents !== null ||
    facets.maxAmountCents !== null ||
    facets.deadlineBefore ||
    facets.deadlineAfter ||
    facets.actionTypes.length ||
    facets.evidenceStates.length ||
    facets.poolKinds.length
  ) {
    return false;
  }

  const hasSemanticRequirement = Boolean(
    interpretation.residualTerms.length || facets.causes.length,
  );
  return !hasSemanticRequirement || smartInterpretationScore(interpretation, fields) >= 0.16;
}

function explicitFiltersWithoutLexicalQuery(filters: PeopleDiscoveryFilters): PeopleDiscoveryFilters {
  return {
    ...filters,
    search: "",
  };
}

function rankSmartProfiles<T extends ProfileDiscoveryLike>(
  profiles: T[],
  credibilityByProfile: Map<string, CredibilitySummary>,
  interpretation: SmartQueryInterpretation,
  personalPriorities: readonly string[],
  sort: PeopleDiscoverySort,
) {
  const maximumOffers = Math.max(1, ...profiles.map((profile) => profile.offerCount));
  const signals = profiles.map((profile): SmartProfileSignals => {
    const credibility = credibilityByProfile.get(profile.id);
    const fields = profileTextFields(profile);
    const causeIds = profileCauseIds(profile);
    const semanticRelevance = smartInterpretationScore(interpretation, fields);
    const credit = creditRankingSignal(credibility);
    const evidenceQuality = profileEvidenceQuality(profile, credibility);
    const score = smartDiscoveryScore({
      semanticRelevance,
      evidenceQuality,
      personalMoralFit: smartPersonalPriorityScore(causeIds, personalPriorities),
      deadlineUrgency: 0,
      credit,
    });
    return { credit, profile, score, semanticRelevance };
  });

  return signals
    .sort((left, right) => {
      if (sort === "credit") {
        return right.credit - left.credit || right.score - left.score ||
          left.profile.id.localeCompare(right.profile.id);
      }
      if (sort === "offers") {
        const leftOffers = Math.log1p(left.profile.offerCount) / Math.log1p(maximumOffers);
        const rightOffers = Math.log1p(right.profile.offerCount) / Math.log1p(maximumOffers);
        return rightOffers - leftOffers || right.score - left.score ||
          left.profile.id.localeCompare(right.profile.id);
      }
      if (sort === "newest") {
        return Date.parse(right.profile.created_at) - Date.parse(left.profile.created_at) ||
          right.score - left.score || left.profile.id.localeCompare(right.profile.id);
      }
      return right.score - left.score ||
        right.semanticRelevance - left.semanticRelevance ||
        Date.parse(right.profile.created_at) - Date.parse(left.profile.created_at) ||
        left.profile.id.localeCompare(right.profile.id);
    })
    .map((entry) => entry.profile as T);
}

export function filterAndRankSmartProfiles<T extends ProfileDiscoveryLike>({
  credibilityByProfile,
  explicitFilters,
  interpretation,
  personalPriorities,
  profiles,
  sort,
}: {
  credibilityByProfile: Map<string, CredibilitySummary>;
  explicitFilters: PeopleDiscoveryFilters;
  interpretation: SmartQueryInterpretation;
  personalPriorities: readonly string[];
  profiles: T[];
  sort: PeopleDiscoverySort;
}) {
  const filtered = profiles.filter((profile) => {
    const credibility = credibilityByProfile.get(profile.id);
    if (
      !profileMatchesFilters(
        profile,
        credibility,
        explicitFiltersWithoutLexicalQuery(explicitFilters),
      )
    ) {
      return false;
    }
    return matchesSmartProfileConstraints(
      profile,
      credibility,
      interpretation,
      profileCauseIds(profile),
    );
  });

  const hasSmartQuery = Boolean(
    interpretation.normalizedQuery ||
      interpretation.parsedConstraintCount ||
      interpretation.facets.location,
  );
  if (!hasSmartQuery) {
    return rankProfiles(filtered, credibilityByProfile, "", sort);
  }

  return rankSmartProfiles(
    filtered,
    credibilityByProfile,
    interpretation,
    personalPriorities,
    sort,
  );
}
