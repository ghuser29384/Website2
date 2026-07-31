export const SMART_QUERY_CONFIDENCE_THRESHOLD = 0.9;
export const SMART_QUERY_VERSION = 1 as const;

export const SMART_QUERY_SURFACES = [
  "global",
  "discover",
  "offers",
  "people",
  "wishes",
  "evidence",
  "pools",
  "mpgf_pools",
] as const;

export type SmartQuerySurface = (typeof SMART_QUERY_SURFACES)[number];
export type SmartQueryIntent = Exclude<SmartQuerySurface, "global">;
export type SmartQueryStage = "deterministic" | "semantic" | "llm";
export type SmartQueryActionType = "pledge" | "payment" | "offset" | "pool";
export type SmartQueryParticipantKind = "individual" | "collective" | "institution";
export type SmartQueryEvidenceState = "submitted" | "accepted" | "challenged";
export type SmartQueryPoolKind = "consensus" | "hybrid";
export type SmartQuerySort =
  | "best_match"
  | "highest_credit"
  | "newest"
  | "soonest_deadline"
  | "lowest_cost"
  | "most_verified"
  | "common_ground";

export interface SmartQueryFacets {
  causes: string[];
  verified: boolean | null;
  minAmountCents: number | null;
  minAmountInclusive: boolean;
  maxAmountCents: number | null;
  maxAmountInclusive: boolean;
  deadlineBefore: string | null;
  deadlineBeforeInclusive: boolean;
  deadlineAfter: string | null;
  deadlineAfterInclusive: boolean;
  actionTypes: SmartQueryActionType[];
  participantKinds: SmartQueryParticipantKind[];
  openToPayment: boolean | null;
  openToPledges: boolean | null;
  minCredit: number | null;
  evidenceStates: SmartQueryEvidenceState[];
  poolKinds: SmartQueryPoolKind[];
  location: string | null;
  sort: SmartQuerySort | null;
}

export interface SmartQueryClarification {
  field: string;
  question: string;
  options?: string[];
}

export interface SmartQueryInterpretation {
  version: typeof SMART_QUERY_VERSION;
  originalQuery: string;
  normalizedQuery: string;
  surface: SmartQuerySurface;
  intent: SmartQueryIntent;
  route: string;
  stage: SmartQueryStage;
  confidence: number;
  facets: SmartQueryFacets;
  semanticTerms: string[];
  residualTerms: string[];
  recognizedPhrases: string[];
  parsedConstraintCount: number;
  needsClarification: boolean;
  clarification: SmartQueryClarification | null;
  reasonCodes: string[];
}

export interface ParseSmartQueryOptions {
  now?: Date | string;
  surface?: SmartQuerySurface;
}

export interface WeightedSemanticField {
  value: string | null | undefined;
  weight?: number;
}

interface CauseDefinition {
  id: string;
  label: string;
  aliases: readonly string[];
}

const CAUSES: readonly CauseDefinition[] = [
  {
    id: "civic-infrastructure",
    label: "Civic infrastructure",
    aliases: [
      "civic infrastructure",
      "civic",
      "democracy",
      "democratic institutions",
      "elections",
      "election integrity",
      "voting",
      "open governance",
      "governance",
      "government transparency",
      "local government",
      "public institutions",
      "institution building",
      "institution-building",
      "anti corruption",
      "anti-corruption",
    ],
  },
  {
    id: "ai-safety",
    label: "AI safety",
    aliases: [
      "ai safety",
      "artificial intelligence safety",
      "ai alignment",
      "alignment",
      "safe ai",
      "responsible ai",
      "advanced ai risk",
    ],
  },
  {
    id: "priorities-research",
    label: "Priorities research",
    aliases: [
      "priorities research",
      "global priorities",
      "cause prioritization",
      "cause prioritisation",
      "moral uncertainty research",
      "public interest research",
      "open knowledge",
      "scientific inquiry",
    ],
  },
  {
    id: "biosecurity",
    label: "Biosecurity",
    aliases: [
      "biosecurity",
      "pandemic prevention",
      "pandemic preparedness",
      "biological risk",
      "biorisk",
      "public health security",
    ],
  },
  {
    id: "factory-farming",
    label: "Factory farming",
    aliases: [
      "factory farming",
      "farm animal welfare",
      "farmed animal welfare",
      "animal welfare",
      "vegetarian",
      "vegan",
      "meat reduction",
      "animal suffering",
    ],
  },
  {
    id: "wild-animal-suffering",
    label: "Wild animal suffering",
    aliases: ["wild animal suffering", "wild animal welfare", "wildlife welfare"],
  },
  {
    id: "future-flourishing",
    label: "Future flourishing",
    aliases: [
      "future flourishing",
      "long term future",
      "long-term future",
      "future generations",
      "existential risk",
      "x risk",
      "x-risk",
      "s risk",
      "s-risk",
      "digital minds",
      "longtermism",
    ],
  },
  {
    id: "concentration-of-power",
    label: "Concentration of power",
    aliases: [
      "concentration of power",
      "power concentration",
      "distributed power",
      "pluralism",
      "multipolar",
      "institutional checks",
    ],
  },
  {
    id: "global-poverty",
    label: "Global poverty",
    aliases: [
      "global poverty",
      "poverty reduction",
      "international development",
      "global development",
      "economic equity",
      "cash transfers",
    ],
  },
  {
    id: "public-health",
    label: "Public health",
    aliases: ["public health", "global health", "health equity", "disease prevention"],
  },
  {
    id: "climate-environment",
    label: "Climate and environment",
    aliases: [
      "climate",
      "climate action",
      "environment",
      "environmental protection",
      "conservation",
      "carbon",
      "decarbonization",
      "decarbonisation",
    ],
  },
  {
    id: "community-service",
    label: "Community service",
    aliases: [
      "community service",
      "mutual aid",
      "housing",
      "housing access",
      "transit",
      "transit access",
      "local volunteering",
      "local volunteer",
    ],
  },
];

const ROUTES: Record<SmartQueryIntent, string> = {
  discover: "/discover",
  offers: "/offers",
  people: "/people",
  wishes: "/wish-registry",
  evidence: "/evidence",
  pools: "/pools",
  mpgf_pools: "/mpgf/pools",
};

const STOP_WORDS = new Set([
  "a",
  "all",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "before",
  "browse",
  "by",
  "find",
  "for",
  "from",
  "get",
  "in",
  "is",
  "me",
  "of",
  "on",
  "opportunities",
  "opportunity",
  "or",
  "search",
  "show",
  "that",
  "the",
  "to",
  "under",
  "with",
]);

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_PATTERN = Object.keys(MONTH_INDEX).join("|");

function emptyFacets(): SmartQueryFacets {
  return {
    causes: [],
    verified: null,
    minAmountCents: null,
    minAmountInclusive: true,
    maxAmountCents: null,
    maxAmountInclusive: true,
    deadlineBefore: null,
    deadlineBeforeInclusive: true,
    deadlineAfter: null,
    deadlineAfterInclusive: true,
    actionTypes: [],
    participantKinds: [],
    openToPayment: null,
    openToPledges: null,
    minCredit: null,
    evidenceStates: [],
    poolKinds: [],
    location: null,
    sort: null,
  };
}

export function normalizeSmartQueryText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9$%+.'/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function smartQueryTokens(value: string | null | undefined) {
  return normalizeSmartQueryText(value)
    .split(/\s+/)
    .map((token) => token.replace(/^['./-]+|['./-]+$/g, ""))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function pushUnique<T>(target: T[], value: T) {
  if (!target.includes(value)) target.push(value);
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function asDate(value: Date | string | undefined) {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

function formatIsoDate(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return candidate.toISOString().slice(0, 10);
}

function parseNaturalDate(value: string, now: Date) {
  const normalized = normalizeSmartQueryText(value).replace(/,/g, "");
  const iso = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return formatIsoDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const monthFirst = normalized.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(20\\d{2}))?\\b`, "i"),
  );
  const dayFirst = normalized.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?\\b`, "i"),
  );
  const match = monthFirst ?? dayFirst;
  if (!match) return null;

  const monthName = (monthFirst ? match[1] : match[2]).toLowerCase();
  const month = MONTH_INDEX[monthName];
  const day = Number(monthFirst ? match[2] : match[1]);
  const explicitYear = Number(match[3]);
  if (month === undefined || !Number.isInteger(day)) return null;

  let year = Number.isInteger(explicitYear) && explicitYear >= 2000
    ? explicitYear
    : now.getUTCFullYear();
  let result = formatIsoDate(year, month, day);
  if (!result) return null;
  if (!explicitYear && result < now.toISOString().slice(0, 10)) {
    year += 1;
    result = formatIsoDate(year, month, day);
  }
  return result;
}

function parseScaledNumber(rawValue: string, rawScale = "") {
  const numeric = Number(rawValue.replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const scale = rawScale.toLowerCase() === "m"
    ? 1_000_000
    : rawScale.toLowerCase() === "k"
      ? 1_000
      : 1;
  return Math.round(numeric * scale * 100);
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function fuzzyTokenMatch(left: string, right: string) {
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const maximumDistance = Math.max(left.length, right.length) >= 8 ? 2 : 1;
  return Math.min(left.length, right.length) >= 4 &&
    editDistance(left, right) <= maximumDistance;
}

function aliasMatches(normalizedQuery: string, alias: string) {
  const normalizedAlias = normalizeSmartQueryText(alias);
  const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(normalizedQuery)) return true;

  const aliasTokens = smartQueryTokens(normalizedAlias);
  const queryTokens = smartQueryTokens(normalizedQuery);
  if (!aliasTokens.length || aliasTokens.length > 3) return false;
  return aliasTokens.every((aliasToken) =>
    queryTokens.some((queryToken) => fuzzyTokenMatch(aliasToken, queryToken)),
  );
}

function causeForId(id: string) {
  return CAUSES.find((cause) => cause.id === id);
}

export function getSmartQueryCauseLabel(id: string) {
  return causeForId(id)?.label ?? id;
}

export function getSmartQueryCauseAliases(id: string) {
  const cause = causeForId(id);
  return cause ? [cause.label, ...cause.aliases] : [id];
}

function isCoFundQuery(query: string) {
  const normalized = normalizeSmartQueryText(query);
  return /\bco[- ]?funds?\b|\bgroup[- ]buy(?:ing)?\b|\bcollective(?:ly)? fund(?:ing)? (?:an? )?(?:offer|trade)\b/.test(normalized);
}

function isStandalonePoolQuery(query: string) {
  const normalized = normalizeSmartQueryText(query);
  return /\b(pool|pools|threshold|conditional funding)\b|\b(?:dominant[- ]assurance(?: contracts?)?|assurance contracts?)\b/.test(normalized);
}

function inferIntent(query: string, surface: SmartQuerySurface): SmartQueryIntent {
  if (surface !== "global") return surface;
  if (isCoFundQuery(query)) return "offers";
  if (/\b(member|members|person|people|participant|participants|counterparties|counterparty|who)\b/.test(query)) {
    return "people";
  }
  if (/\b(wish|wishes|wish registry|private match|introduction)\b/.test(query)) return "wishes";
  if (/\b(evidence|proof|receipt|receipts|attestation|verification record|ledger)\b/.test(query)) {
    return "evidence";
  }
  if (/\b(mpgf|moral public goods fund|consensus good|hybrid good)\b/.test(query)) {
    return "mpgf_pools";
  }
  if (isStandalonePoolQuery(query)) {
    return "pools";
  }
  return "offers";
}

function countConstraints(facets: SmartQueryFacets) {
  return [
    facets.causes.length > 0,
    facets.verified !== null,
    facets.minAmountCents !== null,
    facets.maxAmountCents !== null,
    facets.deadlineBefore !== null,
    facets.deadlineAfter !== null,
    facets.actionTypes.length > 0,
    facets.participantKinds.length > 0,
    facets.openToPayment !== null,
    facets.openToPledges !== null,
    facets.minCredit !== null,
    facets.evidenceStates.length > 0,
    facets.poolKinds.length > 0,
    Boolean(facets.location),
    Boolean(facets.sort),
  ].filter(Boolean).length;
}

function firstMaterialClarification(
  reasonCodes: readonly string[],
  facets: SmartQueryFacets,
): SmartQueryClarification | null {
  if (reasonCodes.includes("ambiguous_amount")) {
    return {
      field: "amount",
      question: "Should the stated amount be a maximum, a minimum, or an exact amount?",
      options: ["Maximum", "Minimum", "Exact amount"],
    };
  }
  if (reasonCodes.includes("conflicting_amount_bounds")) {
    return {
      field: "amount",
      question: "The minimum is above the maximum. Which spending limit should apply?",
    };
  }
  if (reasonCodes.includes("ambiguous_date")) {
    return {
      field: "deadline",
      question: "Should that date be treated as a deadline, a start date, or an exact date?",
      options: ["Deadline", "Start date", "Exact date"],
    };
  }
  if (reasonCodes.includes("near_me_without_location")) {
    return { field: "location", question: "Which city or region should “near me” use?" };
  }
  if (reasonCodes.includes("conflicting_verification")) {
    return {
      field: "verified",
      question: "Should results require verification or exclude verified records?",
      options: ["Require verification", "Exclude verified records"],
    };
  }
  if (facets.causes.length > 3) {
    return {
      field: "cause",
      question: "Which of these cause areas is essential rather than merely relevant?",
      options: facets.causes.slice(0, 4).map(getSmartQueryCauseLabel),
    };
  }
  return null;
}

function consumeMatch(
  working: string,
  match: RegExpMatchArray,
  recognizedPhrases: string[],
) {
  const phrase = match[0].trim();
  if (phrase) recognizedPhrases.push(phrase);
  return working.replace(match[0], " ").replace(/\s+/g, " ").trim();
}

function extractDateConstraints(
  working: string,
  now: Date,
  facets: SmartQueryFacets,
  recognizedPhrases: string[],
  ambiguityCodes: string[],
) {
  const dateBody = `(?:${MONTH_PATTERN})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+20\\d{2})?|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_PATTERN})(?:,?\\s+20\\d{2})?|20\\d{2}-\\d{1,2}-\\d{1,2}`;
  const beforePattern = new RegExp(
    `\\b(before|by|until|through|no later than|deadline(?: is| of|:)?)\\s+(${dateBody})`,
    "i",
  );
  const afterPattern = new RegExp(
    `\\b(after|since|from|no earlier than|starting)\\s+(${dateBody})`,
    "i",
  );

  const before = working.match(beforePattern);
  if (before) {
    const parsed = parseNaturalDate(before[2], now);
    if (parsed) {
      facets.deadlineBefore = parsed;
      facets.deadlineBeforeInclusive = !/^before$/i.test(before[1]);
      working = consumeMatch(working, before, recognizedPhrases);
    }
  }

  const after = working.match(afterPattern);
  if (after) {
    const parsed = parseNaturalDate(after[2], now);
    if (parsed) {
      facets.deadlineAfter = parsed;
      facets.deadlineAfterInclusive = !/^after$/i.test(after[1]);
      working = consumeMatch(working, after, recognizedPhrases);
    }
  }

  const standalone = working.match(new RegExp(`\\b(${dateBody})\\b`, "i"));
  if (standalone && parseNaturalDate(standalone[1], now)) {
    ambiguityCodes.push("ambiguous_date");
  }
  return working;
}

function extractMoneyConstraints(
  working: string,
  facets: SmartQueryFacets,
  recognizedPhrases: string[],
  ambiguityCodes: string[],
) {
  const number = "([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?)\\s*([km]?)";
  const range = working.match(
    new RegExp(`(?:\\$|usd\\s*)${number}\\s*(?:-|to|through)\\s*(?:\\$|usd\\s*)?${number}`, "i"),
  );
  if (range) {
    const first = parseScaledNumber(range[1], range[2]);
    const second = parseScaledNumber(range[3], range[4]);
    if (first !== null && second !== null) {
      facets.minAmountCents = Math.min(first, second);
      facets.maxAmountCents = Math.max(first, second);
      facets.minAmountInclusive = true;
      facets.maxAmountInclusive = true;
      working = consumeMatch(working, range, recognizedPhrases);
    }
  }

  const maximum = working.match(
    new RegExp(
      `\\b(under|below|less than|no more than|at most|up to|maximum(?: of)?|max(?:imum)?(?: of)?)\\s*(?:usd\\s*)?\\$?\\s*${number}`,
      "i",
    ),
  );
  if (maximum) {
    const cents = parseScaledNumber(maximum[2], maximum[3]);
    if (cents !== null) {
      facets.maxAmountCents = cents;
      facets.maxAmountInclusive = !/^(under|below|less than)$/i.test(maximum[1]);
      working = consumeMatch(working, maximum, recognizedPhrases);
    }
  }

  const trailingMaximum = working.match(
    new RegExp(`(?:usd\\s*)?\\$\\s*${number}\\s*(or less|maximum|max)\\b`, "i"),
  );
  if (trailingMaximum) {
    const cents = parseScaledNumber(trailingMaximum[1], trailingMaximum[2]);
    if (cents !== null) {
      facets.maxAmountCents = cents;
      facets.maxAmountInclusive = true;
      working = consumeMatch(working, trailingMaximum, recognizedPhrases);
    }
  }

  const minimum = working.match(
    new RegExp(
      `\\b(over|above|more than|at least|minimum(?: of)?|min(?:imum)?(?: of)?)\\s*(?:usd\\s*)?\\$?\\s*${number}`,
      "i",
    ),
  );
  if (minimum) {
    const cents = parseScaledNumber(minimum[2], minimum[3]);
    if (cents !== null) {
      facets.minAmountCents = cents;
      facets.minAmountInclusive = !/^(over|above|more than)$/i.test(minimum[1]);
      working = consumeMatch(working, minimum, recognizedPhrases);
    }
  }

  const free = working.match(/\b(free|no cost|zero cost|costs? nothing)\b/i);
  if (free) {
    facets.maxAmountCents = 0;
    facets.maxAmountInclusive = true;
    working = consumeMatch(working, free, recognizedPhrases);
  }

  if (working.match(new RegExp(`(?:usd\\s*)?\\$\\s*${number}`, "i"))) {
    ambiguityCodes.push("ambiguous_amount");
  }
  return working;
}

export function parseSmartQuery(
  rawQuery: string,
  options: ParseSmartQueryOptions = {},
): SmartQueryInterpretation {
  const surface = SMART_QUERY_SURFACES.includes(options.surface as SmartQuerySurface)
    ? (options.surface as SmartQuerySurface)
    : "global";
  const originalQuery = rawQuery.trim().slice(0, 500);
  const normalizedQuery = normalizeSmartQueryText(originalQuery);
  const now = asDate(options.now);
  const facets = emptyFacets();
  const recognizedPhrases: string[] = [];
  const ambiguityCodes: string[] = [];
  const reasonCodes: string[] = [];
  let working = normalizedQuery;

  for (const cause of CAUSES) {
    const matchingAlias = [cause.label, ...cause.aliases]
      .sort((left, right) => right.length - left.length)
      .find((alias) => aliasMatches(normalizedQuery, alias));
    if (!matchingAlias) continue;
    pushUnique(facets.causes, cause.id);
    recognizedPhrases.push(matchingAlias);
    const escaped = normalizeSmartQueryText(matchingAlias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    working = working.replace(new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, "g"), " ");
  }

  const positiveVerification = /\b(verified|verification required|reviewed|evidence[- ]backed|proof[- ]backed|with proof|independently checked)\b/i.test(normalizedQuery);
  const negativeVerification = /\b(unverified|not verified|without verification|no proof required|exclude verified)\b/i.test(normalizedQuery);
  if (positiveVerification && negativeVerification) {
    ambiguityCodes.push("conflicting_verification");
  } else if (positiveVerification || negativeVerification) {
    facets.verified = positiveVerification;
    const pattern = positiveVerification
      ? /\b(verified|verification required|reviewed|evidence[- ]backed|proof[- ]backed|with proof|independently checked)\b/i
      : /\b(unverified|not verified|without verification|no proof required|exclude verified)\b/i;
    const match = working.match(pattern);
    if (match) working = consumeMatch(working, match, recognizedPhrases);
  }

  working = extractMoneyConstraints(working, facets, recognizedPhrases, ambiguityCodes);
  working = extractDateConstraints(working, now, facets, recognizedPhrases, ambiguityCodes);

  const actionPatterns: ReadonlyArray<[SmartQueryActionType, RegExp]> = [
    ["pledge", /\b(pledge|pledges|pledge swap|reciprocal action|commitment swap)\b/i],
    ["payment", /\b(paid action|payment|payments|pay someone|payment-supported)\b/i],
    ["offset", /\b(offset|offsets|donation offset|redirected donation|opposed donation)\b/i],
    [
      "pool",
      /\b(pool|pools|threshold pool|conditional funding|(?:dominant[- ]assurance(?: contracts?)?|assurance contracts?))\b/i,
    ],
  ];
  for (const [type, pattern] of actionPatterns) {
    const match = working.match(pattern);
    if (!match) continue;
    pushUnique(facets.actionTypes, type);
    working = consumeMatch(working, match, recognizedPhrases);
  }

  const participantPatterns: ReadonlyArray<[SmartQueryParticipantKind, RegExp]> = [
    ["individual", /\b(individual|person|people)\b/i],
    ["collective", /\b(collective|working group|community group)\b/i],
    ["institution", /\b(institution|organization|organisation|nonprofit|charity)\b/i],
  ];
  for (const [kind, pattern] of participantPatterns) {
    const match = working.match(pattern);
    if (!match) continue;
    pushUnique(facets.participantKinds, kind);
    working = consumeMatch(working, match, recognizedPhrases);
  }

  const paymentOpen = working.match(/\b(open to payment|accepts? payment|payment open)\b/i);
  if (paymentOpen) {
    facets.openToPayment = true;
    working = consumeMatch(working, paymentOpen, recognizedPhrases);
  }
  const pledgeOpen = working.match(/\b(open to pledges?|accepts? pledges?|pledge open)\b/i);
  if (pledgeOpen) {
    facets.openToPledges = true;
    working = consumeMatch(working, pledgeOpen, recognizedPhrases);
  }

  const credit = working.match(/\b(?:credit(?: score)?|score)\s*(?:of\s*)?(?:at least|over|above|>=|minimum)?\s*(\d{1,3})\+?\b/i);
  if (credit) {
    facets.minCredit = Math.min(100, Number(credit[1]));
    working = consumeMatch(working, credit, recognizedPhrases);
  }

  const evidencePatterns: ReadonlyArray<[SmartQueryEvidenceState, RegExp]> = [
    ["accepted", /\b(accepted evidence|participant accepted|approved evidence)\b/i],
    ["challenged", /\b(challenged evidence|evidence challenge|disputed evidence)\b/i],
    ["submitted", /\b(submitted evidence|awaiting review|evidence submitted)\b/i],
  ];
  for (const [state, pattern] of evidencePatterns) {
    const match = working.match(pattern);
    if (!match) continue;
    pushUnique(facets.evidenceStates, state);
    working = consumeMatch(working, match, recognizedPhrases);
  }

  const consensus = working.match(/\b(consensus good|consensus goods|moral public good|moral public goods)\b/i);
  if (consensus) {
    pushUnique(facets.poolKinds, "consensus");
    working = consumeMatch(working, consensus, recognizedPhrases);
  }
  const hybrid = working.match(/\b(hybrid good|hybrid goods)\b/i);
  if (hybrid) {
    pushUnique(facets.poolKinds, "hybrid");
    working = consumeMatch(working, hybrid, recognizedPhrases);
  }

  const sortPatterns: ReadonlyArray<[SmartQuerySort, RegExp]> = [
    ["lowest_cost", /\b(cheapest|lowest cost|least expensive|low cost)\b/i],
    ["soonest_deadline", /\b(soonest deadline|ending soon|most urgent|deadline first)\b/i],
    ["most_verified", /\b(strongest evidence|most verified|best verified)\b/i],
    ["highest_credit", /\b(highest credit|best credit|most reliable participant)\b/i],
    ["newest", /\b(newest|most recent|latest)\b/i],
    ["common_ground", /\b(common ground|most coordinatable|coordinatability)\b/i],
  ];
  for (const [sort, pattern] of sortPatterns) {
    const match = working.match(pattern);
    if (!match) continue;
    facets.sort = sort;
    working = consumeMatch(working, match, recognizedPhrases);
    break;
  }

  const location = working.match(/\b(?:in|near|around)\s+([a-z][a-z .'-]{2,50})$/i);
  if (location && !/^me$/i.test(location[1].trim())) {
    facets.location = location[1].trim();
    working = consumeMatch(working, location, recognizedPhrases);
  } else if (/\bnear me\b/i.test(normalizedQuery)) {
    ambiguityCodes.push("near_me_without_location");
  }

  if (
    facets.minAmountCents !== null &&
    facets.maxAmountCents !== null &&
    facets.minAmountCents > facets.maxAmountCents
  ) {
    ambiguityCodes.push("conflicting_amount_bounds");
  }

  const intent = inferIntent(normalizedQuery, surface);
  const residualTerms = unique(smartQueryTokens(working));
  const semanticTerms = unique([
    ...residualTerms,
    ...facets.causes.flatMap((id) => getSmartQueryCauseAliases(id).flatMap(smartQueryTokens)),
  ]);
  const parsedConstraintCount = countConstraints(facets);
  const uniqueAmbiguities = unique(ambiguityCodes);
  const clarification = firstMaterialClarification(uniqueAmbiguities, facets);
  const needsClarification = Boolean(clarification);

  if (parsedConstraintCount) reasonCodes.push("deterministic_constraints");
  if (facets.causes.length) reasonCodes.push("semantic_cause_resolution");
  if (residualTerms.length) reasonCodes.push("residual_semantic_search");
  if (surface === "global") reasonCodes.push(`routed_to_${intent}`);
  reasonCodes.push(...uniqueAmbiguities);

  let confidence = surface === "global" ? 0.92 : 0.95;
  if (!normalizedQuery) confidence = 1;
  if (facets.causes.length || parsedConstraintCount >= 2) confidence += 0.03;
  if (needsClarification) confidence = Math.min(confidence, 0.78);

  return {
    version: SMART_QUERY_VERSION,
    originalQuery,
    normalizedQuery,
    surface,
    intent,
    route: ROUTES[intent],
    stage: facets.causes.length || residualTerms.length ? "semantic" : "deterministic",
    confidence: clamp(confidence),
    facets,
    semanticTerms,
    residualTerms,
    recognizedPhrases: unique(recognizedPhrases.map((value) => value.trim()).filter(Boolean)),
    parsedConstraintCount,
    needsClarification,
    clarification,
    reasonCodes: unique(reasonCodes),
  };
}

export function serializeSmartQueryFacets(
  params: URLSearchParams,
  facets: SmartQueryFacets,
) {
  if (facets.causes.length) params.set("smart_causes", facets.causes.join(","));
  if (facets.verified !== null) params.set("verified", facets.verified ? "1" : "0");
  if (facets.minAmountCents !== null) {
    params.set("min_amount_cents", String(facets.minAmountCents));
    params.set("min_amount_inclusive", facets.minAmountInclusive ? "1" : "0");
  }
  if (facets.maxAmountCents !== null) {
    params.set("max_amount_cents", String(facets.maxAmountCents));
    params.set("max_amount_inclusive", facets.maxAmountInclusive ? "1" : "0");
  }
  if (facets.deadlineBefore) {
    params.set("deadline_before", facets.deadlineBefore);
    params.set("deadline_before_inclusive", facets.deadlineBeforeInclusive ? "1" : "0");
  }
  if (facets.deadlineAfter) {
    params.set("deadline_after", facets.deadlineAfter);
    params.set("deadline_after_inclusive", facets.deadlineAfterInclusive ? "1" : "0");
  }
  if (facets.actionTypes.length) params.set("action_types", facets.actionTypes.join(","));
  if (facets.participantKinds.length) {
    params.set("participant_kinds", facets.participantKinds.join(","));
  }
  if (facets.openToPayment !== null) {
    params.set("open_to_payment", facets.openToPayment ? "1" : "0");
  }
  if (facets.openToPledges !== null) {
    params.set("open_to_pledges", facets.openToPledges ? "1" : "0");
  }
  if (facets.minCredit !== null) params.set("min_credit", String(facets.minCredit));
  if (facets.evidenceStates.length) {
    params.set("evidence_states", facets.evidenceStates.join(","));
  }
  if (facets.poolKinds.length) params.set("pool_kinds", facets.poolKinds.join(","));
  if (facets.location) params.set("location", facets.location);
  if (facets.sort) params.set("smart_sort", facets.sort);
  return params;
}

export function buildSmartQueryTarget(interpretation: SmartQueryInterpretation) {
  const params = new URLSearchParams();
  params.set("smart", "1");
  const queryName = interpretation.intent === "offers" || interpretation.intent === "people"
    ? "search"
    : "q";
  if (interpretation.originalQuery) params.set(queryName, interpretation.originalQuery);
  serializeSmartQueryFacets(params, interpretation.facets);
  if (interpretation.intent === "offers") params.set("view", "live");
  if (interpretation.intent === "discover") {
    const coFund = isCoFundQuery(interpretation.normalizedQuery);
    params.set("domain", coFund ? "offers" : interpretation.facets.actionTypes.includes("pool") ? "pools" : "offers");
    if (coFund) params.set("offerKind", "co-fund");
  }
  return `${interpretation.route}?${params.toString()}`;
}

export function parseSerializedSmartQueryFacets(
  values: Record<string, string | string[] | undefined>,
): SmartQueryFacets {
  const read = (key: string) => {
    const value = values[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };
  const list = <T extends string>(key: string, allowed: readonly T[]) =>
    unique(
      read(key)
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is T => allowed.includes(value as T)),
    );
  const integer = (key: string, maximum = Number.MAX_SAFE_INTEGER) => {
    const parsed = Number.parseInt(read(key), 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? Math.min(maximum, parsed) : null;
  };
  const boolean = (key: string) => read(key) === "1" ? true : read(key) === "0" ? false : null;
  const date = (key: string) => /^20\d{2}-\d{2}-\d{2}$/.test(read(key)) ? read(key) : null;
  const causeIds = CAUSES.map((cause) => cause.id);

  return {
    causes: list("smart_causes", causeIds),
    verified: boolean("verified"),
    minAmountCents: integer("min_amount_cents"),
    minAmountInclusive: boolean("min_amount_inclusive") ?? true,
    maxAmountCents: integer("max_amount_cents"),
    maxAmountInclusive: boolean("max_amount_inclusive") ?? true,
    deadlineBefore: date("deadline_before"),
    deadlineBeforeInclusive: boolean("deadline_before_inclusive") ?? true,
    deadlineAfter: date("deadline_after"),
    deadlineAfterInclusive: boolean("deadline_after_inclusive") ?? true,
    actionTypes: list("action_types", ["pledge", "payment", "offset", "pool"] as const),
    participantKinds: list(
      "participant_kinds",
      ["individual", "collective", "institution"] as const,
    ),
    openToPayment: boolean("open_to_payment"),
    openToPledges: boolean("open_to_pledges"),
    minCredit: integer("min_credit", 100),
    evidenceStates: list(
      "evidence_states",
      ["submitted", "accepted", "challenged"] as const,
    ),
    poolKinds: list("pool_kinds", ["consensus", "hybrid"] as const),
    location: read("location").trim().slice(0, 80) || null,
    sort: list(
      "smart_sort",
      [
        "best_match",
        "highest_credit",
        "newest",
        "soonest_deadline",
        "lowest_cost",
        "most_verified",
        "common_ground",
      ] as const,
    )[0] ?? null,
  };
}

function termScore(term: string, fieldTokens: readonly string[], normalizedField: string) {
  if (normalizedField.includes(term)) return 1;
  if (fieldTokens.some((token) => fuzzyTokenMatch(term, token))) return 0.72;
  return 0;
}

export function semanticTextScore(
  query: string | SmartQueryInterpretation,
  fields: readonly WeightedSemanticField[],
) {
  const interpretation = typeof query === "string" ? parseSmartQuery(query) : query;
  const terms = interpretation.semanticTerms;
  if (!terms.length) return 0.5;

  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of fields) {
      const normalizedField = normalizeSmartQueryText(field.value);
      if (!normalizedField) continue;
      best = Math.max(
        best,
        termScore(term, smartQueryTokens(normalizedField), normalizedField) * clamp(field.weight ?? 1),
      );
    }
    total += best;
  }

  const phraseBonus = fields.some((field) => {
    const normalizedField = normalizeSmartQueryText(field.value);
    return interpretation.normalizedQuery.length >= 4 &&
      normalizedField.includes(interpretation.normalizedQuery);
  })
    ? 0.1
    : 0;
  return clamp(total / terms.length + phraseBonus);
}

export function smartQueryCauseScore(
  causeIds: readonly string[],
  fields: readonly WeightedSemanticField[],
) {
  if (!causeIds.length) return 0.5;
  const scores = causeIds.map((id) =>
    Math.max(...getSmartQueryCauseAliases(id).map((alias) => semanticTextScore(alias, fields))),
  );
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function extractMoneyAmountsCents(...values: Array<string | null | undefined>) {
  const amounts: number[] = [];
  for (const value of values) {
    const normalized = normalizeSmartQueryText(value);
    const pattern = /(?:usd\s*)?\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*([km]?)/gi;
    for (const match of normalized.matchAll(pattern)) {
      const cents = parseScaledNumber(match[1], match[2]);
      if (cents !== null) amounts.push(cents);
    }
  }
  return unique(amounts);
}

export function matchesSmartAmountConstraint(
  facets: SmartQueryFacets,
  amountsCents: readonly number[],
  options: { unknownMatches?: boolean } = {},
) {
  if (facets.minAmountCents === null && facets.maxAmountCents === null) return true;
  if (!amountsCents.length) return options.unknownMatches ?? false;
  return amountsCents.some((amount) => {
    if (facets.minAmountCents !== null) {
      if (facets.minAmountInclusive ? amount < facets.minAmountCents : amount <= facets.minAmountCents) {
        return false;
      }
    }
    if (facets.maxAmountCents !== null) {
      if (facets.maxAmountInclusive ? amount > facets.maxAmountCents : amount >= facets.maxAmountCents) {
        return false;
      }
    }
    return true;
  });
}

export function matchesSmartDeadlineConstraint(
  facets: SmartQueryFacets,
  deadline: string | Date | null | undefined,
  options: { unknownMatches?: boolean } = {},
) {
  if (!facets.deadlineBefore && !facets.deadlineAfter) return true;
  if (!deadline) return options.unknownMatches ?? false;
  const parsed = deadline instanceof Date ? deadline : new Date(deadline);
  if (!Number.isFinite(parsed.getTime())) return options.unknownMatches ?? false;
  const value = parsed.toISOString().slice(0, 10);
  if (
    facets.deadlineBefore &&
    (facets.deadlineBeforeInclusive
      ? value > facets.deadlineBefore
      : value >= facets.deadlineBefore)
  ) {
    return false;
  }
  if (
    facets.deadlineAfter &&
    (facets.deadlineAfterInclusive
      ? value < facets.deadlineAfter
      : value <= facets.deadlineAfter)
  ) {
    return false;
  }
  return true;
}

export function matchesSmartVerificationConstraint(
  facets: SmartQueryFacets,
  verified: boolean | null | undefined,
) {
  return facets.verified === null || verified === facets.verified;
}

export function getSmartDeadlineUrgency(
  deadline: string | Date | null | undefined,
  now: Date | string = new Date(),
) {
  if (!deadline) return 0;
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const current = asDate(now);
  if (!Number.isFinite(deadlineDate.getTime())) return 0;
  const days = (deadlineDate.getTime() - current.getTime()) / 86_400_000;
  if (days < 0) return 0;
  return clamp(Math.pow(0.5, days / 30));
}

export function getSmartPersonalFit(
  causeIds: readonly string[],
  personalPriorities: readonly string[],
) {
  if (!causeIds.length || !personalPriorities.length) return 0.5;
  const fields = personalPriorities.map((value) => ({ value, weight: 1 }));
  return Math.max(
    ...causeIds.map((id) =>
      Math.max(...getSmartQueryCauseAliases(id).map((alias) => semanticTextScore(alias, fields))),
    ),
  );
}
