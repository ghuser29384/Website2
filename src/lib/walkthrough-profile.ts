import {
  COHORT_CAUSES,
  FIRST_ACTIONS,
  ONBOARDING_GOALS,
  PARTICIPANT_KINDS,
} from "@/lib/growth";

export const WALKTHROUGH_PROFILE_COOKIE_NAME = "mt_walkthrough_profile_draft";
export const WALKTHROUGH_PROFILE_STORAGE_KEY = "mt_walkthrough_profile_draft";
export const WALKTHROUGH_PROFILE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const WALKTHROUGH_OFFER_TYPES = ["Money", "Time", "A pledge"] as const;
const causeAreaSet = new Set<string>(COHORT_CAUSES);
const offerTypeSet = new Set<string>(WALKTHROUGH_OFFER_TYPES);
const participantKindSet = new Set<string>(PARTICIPANT_KINDS.map((item) => item.value));
const goalSet = new Set<string>(ONBOARDING_GOALS.map((item) => item.value));
const firstActionSet = new Set<string>(FIRST_ACTIONS.map((item) => item.value));

const WALKTHROUGH_CAUSE_AREA_MAP: Record<string, (typeof COHORT_CAUSES)[number]> = {
  "Wild animal suffering": "Animal welfare",
  "Factory farming": "Animal welfare",
  "Global health": "Public health",
  Climate: "Climate",
  "Existential risk": "Existential risk",
  "Future flourishing": "Future flourishing",
  "S-risks": "Future flourishing",
  "Global poverty": "Global poverty",
  "Concentration of power": "Cause prioritization",
  "Priorities research": "Cause prioritization",
  "Biological risks": "Existential risk",
  "AI safety": "Existential risk",
  "Space governance": "Future flourishing",
  "Building altruism": "Community service",
};

type SearchParams = Record<string, string | string[] | undefined>;

export type WalkthroughOfferType = (typeof WALKTHROUGH_OFFER_TYPES)[number];
export type WalkthroughCauseArea = (typeof COHORT_CAUSES)[number];
export type CompleteProfileDraftSource = "walkthrough" | "direct";

export interface WalkthroughProfileDraft {
  version: 1;
  source: CompleteProfileDraftSource;
  originalCause: string;
  causeArea: WalkthroughCauseArea;
  offerType: WalkthroughOfferType;
  matchName: string;
  matchGet: string;
  matchGive: string;
  participantKind: (typeof PARTICIPANT_KINDS)[number]["value"];
  primaryGoal: (typeof ONBOARDING_GOALS)[number]["value"];
  firstAction: (typeof FIRST_ACTIONS)[number]["value"];
  createdAt: string;
}

function clean(value: unknown, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export const WALKTHROUGH_PRIVATE_QUERY_KEYS = [
  "source",
  "cause_area",
  "walkthrough_cause",
  "offer_type",
  "match_name",
  "match_get",
  "match_give",
  "participant_kind",
  "primary_goal",
  "first_action",
] as const;

export function hasWalkthroughPrivateQuery(searchParams: SearchParams | undefined) {
  if (!searchParams) return false;

  return WALKTHROUGH_PRIVATE_QUERY_KEYS.some((key) => {
    const value = searchParams[key];
    return Array.isArray(value)
      ? value.some((item) => clean(item).length > 0)
      : clean(value).length > 0;
  });
}

export function mapWalkthroughCauseToCauseArea(cause: string): WalkthroughCauseArea {
  return WALKTHROUGH_CAUSE_AREA_MAP[clean(cause)] ?? "Cause prioritization";
}

export function createWalkthroughProfileDraft(input: {
  originalCause?: unknown;
  causeArea?: unknown;
  offerType?: unknown;
  matchName?: unknown;
  matchGet?: unknown;
  matchGive?: unknown;
  participantKind?: unknown;
  primaryGoal?: unknown;
  firstAction?: unknown;
  createdAt?: unknown;
}): WalkthroughProfileDraft | null {
  const originalCause = clean(input.originalCause) || "Cause prioritization";
  const explicitCauseArea = clean(input.causeArea);
  const causeArea = (causeAreaSet.has(explicitCauseArea)
    ? explicitCauseArea
    : mapWalkthroughCauseToCauseArea(originalCause)) as WalkthroughCauseArea;
  const offerType = clean(input.offerType);
  const matchName = clean(input.matchName);

  if (!offerTypeSet.has(offerType) || !matchName) {
    return null;
  }

  const participantKind = clean(input.participantKind);
  const primaryGoal = clean(input.primaryGoal);
  const firstAction = clean(input.firstAction);
  const createdAt = clean(input.createdAt, 64);

  return {
    version: 1,
    source: "walkthrough",
    originalCause,
    causeArea,
    offerType: offerType as WalkthroughOfferType,
    matchName,
    matchGet: clean(input.matchGet),
    matchGive: clean(input.matchGive),
    participantKind: (participantKindSet.has(participantKind)
      ? participantKind
      : "individual") as WalkthroughProfileDraft["participantKind"],
    primaryGoal: (goalSet.has(primaryGoal)
      ? primaryGoal
      : "find_counterparty") as WalkthroughProfileDraft["primaryGoal"],
    firstAction: (firstActionSet.has(firstAction)
      ? firstAction
      : "create_broad_preview") as WalkthroughProfileDraft["firstAction"],
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function encodeWalkthroughProfileDraft(draft: WalkthroughProfileDraft) {
  return encodeURIComponent(JSON.stringify(draft));
}

export function parseWalkthroughProfileDraft(value: string | null | undefined) {
  if (!value) return null;

  const candidates = [value];
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) candidates.push(decoded);
  } catch {
    // The cookie may already be decoded and can contain literal percent signs.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const draft = createWalkthroughProfileDraft(parsed);
      if (draft) return draft;
    } catch {
      // Try the next representation.
    }
  }

  return null;
}

export function getWalkthroughProfileDraft({
  cookieValue,
}: {
  cookieValue?: string | null;
  searchParams?: SearchParams;
}) {
  return parseWalkthroughProfileDraft(cookieValue);
}

export function createDirectCompleteProfileDraft(
  createdAt = new Date().toISOString(),
): WalkthroughProfileDraft {
  return {
    version: 1,
    source: "direct",
    originalCause: "Profile priorities",
    causeArea: "Cause prioritization",
    offerType: "Time",
    matchName: "Direct profile setup",
    matchGet: "",
    matchGive: "",
    participantKind: "individual",
    primaryGoal: "find_counterparty",
    firstAction: "create_broad_preview",
    createdAt,
  };
}

export function getCompleteProfileDraft({
  cookieValue,
  searchParams,
  allowDirect = false,
}: {
  cookieValue?: string | null;
  searchParams?: SearchParams;
  allowDirect?: boolean;
}) {
  const walkthroughDraft = getWalkthroughProfileDraft({ cookieValue, searchParams });
  if (walkthroughDraft) return walkthroughDraft;

  return allowDirect ? createDirectCompleteProfileDraft() : null;
}

export function buildWalkthroughOnboardingPath(draft: WalkthroughProfileDraft) {
  void draft;
  return "/onboarding";
}

export function buildWalkthroughCompleteProfilePath(draft: WalkthroughProfileDraft) {
  void draft;
  return "/complete-profile";
}
