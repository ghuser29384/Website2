import { PROFILE_SETUP_LIMITS } from "./profile-setup-draft";

export const MATCHING_PREFERENCE_GROUPS = [
  {
    name: "outcomes",
    label: "Outcomes I care about",
    options: ["Global health", "Poverty reduction", "Animal welfare", "Climate & environment",
      "Education", "AI safety", "Governance", "Community wellbeing"],
  },
  {
    name: "capabilities",
    label: "What I can offer",
    options: ["Time & volunteering", "Research & writing", "Design & creative work", "Technology & coding",
      "Teaching & mentoring", "Organizing & outreach", "Introductions", "Financial support"],
  },
  {
    name: "limits",
    label: "Limits or exclusions",
    options: ["Online only", "One-time commitments only", "No money commitments", "No travel",
      "No public recognition", "Ask before introductions"],
  },
] as const;

export type MatchingPreferenceGroup = typeof MATCHING_PREFERENCE_GROUPS[number];
export interface MatchingPreferenceSelection { selected: string[]; other: string }
const PREFIX = "Selected options:\n- ";
const DETAILS = "\n\nAdditional details:\n";

/** Keep the existing plain-text draft and encrypted-note storage contract. */
export function formatMatchingPreference({ selected, other }: MatchingPreferenceSelection): string {
  if (!selected.length) return other;
  return PREFIX + selected.join("\n- ") + (other ? DETAILS + other : "");
}

/** Older free-text drafts stay intact; only our exact choice format is decoded. */
export function parseMatchingPreference(value: string, options: readonly string[]): MatchingPreferenceSelection {
  if (!value.startsWith(PREFIX)) return { selected: [], other: value };
  const boundary = value.indexOf(DETAILS);
  const selected = value.slice(PREFIX.length, boundary < 0 ? undefined : boundary).split("\n- ");
  if (selected.some((choice) => !options.includes(choice)) || new Set(selected).size !== selected.length) {
    return { selected: [], other: value };
  }
  return { selected, other: boundary < 0 ? "" : value.slice(boundary + DETAILS.length) };
}

export function matchingPreferenceDetailsLimit(group: MatchingPreferenceGroup, selected: string[]): number {
  return PROFILE_SETUP_LIMITS[group.name] - (selected.length ? formatMatchingPreference({ selected, other: " " }).length - 1 : 0);
}
