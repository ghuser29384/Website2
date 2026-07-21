import { COHORT_CAUSES } from "@/lib/growth";

export const NOW_PROFILE_PRIORITY_SEARCH_LABEL = "Now profile priorities";

const allowedCauseAreas = new Set<string>(COHORT_CAUSES);

export function normalizeNowProfilePriorityCauses(values: readonly unknown[]) {
  const seen = new Set<string>();
  const causes: string[] = [];

  for (const value of values) {
    const cause = String(value ?? "").trim();
    if (!allowedCauseAreas.has(cause) || seen.has(cause)) {
      continue;
    }

    seen.add(cause);
    causes.push(cause);
  }

  return causes;
}
