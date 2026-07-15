import {
  calculateCredibility,
  type CredibilityAggregateRow,
  type CredibilityContext,
  type CredibilitySummary,
} from "@/lib/credibility";
import {
  getActiveCredibilityModel,
  listPublicCredibilityRows,
  listPublicCredibilityStatuses,
} from "@/lib/credibility-data";

export interface PublicCredibilityLookup {
  key: string;
  profileId: string;
  context?: CredibilityContext;
}

export async function listPublicCredibilityForLookups(
  lookups: PublicCredibilityLookup[],
): Promise<Map<string, CredibilitySummary>> {
  const normalizedLookups = lookups.filter(
    (lookup) => lookup.key.trim() && lookup.profileId.trim(),
  );

  if (!normalizedLookups.length) {
    return new Map();
  }

  const profileIds = [...new Set(normalizedLookups.map((lookup) => lookup.profileId))];
  const [model, rows, statuses] = await Promise.all([
    getActiveCredibilityModel(),
    listPublicCredibilityRows(profileIds),
    listPublicCredibilityStatuses(profileIds),
  ]);
  const rowsByProfile = new Map<string, CredibilityAggregateRow[]>();

  rows.forEach((row) => {
    const profileRows = rowsByProfile.get(row.profileId) ?? [];
    profileRows.push(row);
    rowsByProfile.set(row.profileId, profileRows);
  });

  return new Map(
    normalizedLookups.map((lookup) => [
      lookup.key,
      calculateCredibility(
        rowsByProfile.get(lookup.profileId) ?? [],
        model,
        statuses.get(lookup.profileId) ?? "eligible",
        lookup.context ?? {},
      ),
    ]),
  );
}
