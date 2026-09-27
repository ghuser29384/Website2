import { matchesSmartAmountConstraint, type SmartQueryFacets } from "./smart-query";

export interface RecordedRespondentContribution {
  amountCents: number;
  currency: "USD";
}

export interface OffsetContributionRecord {
  requested_matching_amount_cents: number;
  time_horizon: "one_off" | "recurring";
  participation_mode: "direct" | "pool";
}

/** This legacy field is denominated in USD by the offset contract. It is the
 * requested contribution, NOT the all-in exposure, collateral, pool target,
 * or an amount mentioned in prose. Recurring/pool records have no bounded
 * respondent total here, so their contribution remains unknown for filtering.
 */
export function recordedRespondentContribution(
  mode: string,
  offset: OffsetContributionRecord | null | undefined,
): RecordedRespondentContribution | null {
  if (mode !== "offset" || !offset || offset.time_horizon !== "one_off" || offset.participation_mode !== "direct") return null;
  const amountCents = offset.requested_matching_amount_cents;
  return Number.isSafeInteger(amountCents) && amountCents >= 0
    ? { amountCents, currency: "USD" }
    : null;
}

export function matchesRecordedContribution(
  facets: SmartQueryFacets,
  contribution: RecordedRespondentContribution | null,
) {
  if (facets.minAmountCents === null && facets.maxAmountCents === null) return true;
  return contribution !== null && contribution.currency === "USD" &&
    matchesSmartAmountConstraint(facets, [contribution.amountCents]);
}

export const OFFER_CONTRIBUTION_BOUNDARY =
  "Budget filters use recorded, one-time respondent contributions in USD. They do not use amounts in descriptions, the offer maker's funding, or shared pool caps. Proposals without a recorded contribution cannot match a budget filter. This is not an all-in exposure limit; review the full terms.";

export const OUTCOME_VERIFICATION_BOUNDARY =
  "These records describe proposed evidence requirements, not verified outcomes. Outcome verification filters cannot be satisfied here. Remove that filter to browse proposals, or review published evidence.";
