import type { SmartQueryFacets } from "./smart-query";

export function mergeSmartQueryFacets(
  parsed: SmartQueryFacets,
  explicit: SmartQueryFacets,
): SmartQueryFacets {
  return {
    causes: explicit.causes.length ? explicit.causes : parsed.causes,
    verified: explicit.verified ?? parsed.verified,
    minAmountCents: explicit.minAmountCents ?? parsed.minAmountCents,
    minAmountInclusive:
      explicit.minAmountCents !== null ? explicit.minAmountInclusive : parsed.minAmountInclusive,
    maxAmountCents: explicit.maxAmountCents ?? parsed.maxAmountCents,
    maxAmountInclusive:
      explicit.maxAmountCents !== null ? explicit.maxAmountInclusive : parsed.maxAmountInclusive,
    deadlineBefore: explicit.deadlineBefore ?? parsed.deadlineBefore,
    deadlineBeforeInclusive:
      explicit.deadlineBefore !== null
        ? explicit.deadlineBeforeInclusive
        : parsed.deadlineBeforeInclusive,
    deadlineAfter: explicit.deadlineAfter ?? parsed.deadlineAfter,
    deadlineAfterInclusive:
      explicit.deadlineAfter !== null
        ? explicit.deadlineAfterInclusive
        : parsed.deadlineAfterInclusive,
    actionTypes: explicit.actionTypes.length ? explicit.actionTypes : parsed.actionTypes,
    participantKinds: explicit.participantKinds.length
      ? explicit.participantKinds
      : parsed.participantKinds,
    openToPayment: explicit.openToPayment ?? parsed.openToPayment,
    openToPledges: explicit.openToPledges ?? parsed.openToPledges,
    minCredit: explicit.minCredit ?? parsed.minCredit,
    evidenceStates: explicit.evidenceStates.length
      ? explicit.evidenceStates
      : parsed.evidenceStates,
    poolKinds: explicit.poolKinds.length ? explicit.poolKinds : parsed.poolKinds,
    location: explicit.location ?? parsed.location,
    sort: explicit.sort ?? parsed.sort,
  };
}

export function hasSmartQueryConstraints(facets: SmartQueryFacets) {
  return Boolean(
    facets.causes.length ||
      facets.verified !== null ||
      facets.minAmountCents !== null ||
      facets.maxAmountCents !== null ||
      facets.deadlineBefore ||
      facets.deadlineAfter ||
      facets.actionTypes.length ||
      facets.participantKinds.length ||
      facets.openToPayment !== null ||
      facets.openToPledges !== null ||
      facets.minCredit !== null ||
      facets.evidenceStates.length ||
      facets.poolKinds.length ||
      facets.location ||
      facets.sort,
  );
}
