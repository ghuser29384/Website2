import type { PublicProfileSummary } from "@/lib/app-data";
import type { LiveGroupBuyingRoute } from "@/lib/moral-trade/group-buying-live";
import type { PublicOfferListing } from "@/lib/public-offers";
import {
  getSmartQueryCauseLabel,
  parseSmartQuery,
  smartQueryTokens,
  type SmartQueryFacets,
  type SmartQueryInterpretation,
} from "@/lib/smart-query";

export type DiscoverSearchDomain = "offers" | "pools" | "people";
export type DiscoverSearchOfferKind = "all" | "individual" | "co-fund";
export type DiscoverSearchSort =
  | "best-fit"
  | "newest"
  | "deadline"
  | "lowest-cost"
  | "strongest-evidence";

export interface DiscoverSearchManualFilters {
  causes: string[];
  verifiedOnly: boolean;
  maximumOfferAmountCents: number | null;
  minimumReturnAmountCents: number | null;
  offerTypes: string[];
  returnTypes: string[];
  recipient: string;
  evidence: string;
  flexibilities: string[];
  deadlineBefore: string | null;
}

export interface DiscoverSearchInput {
  query: string;
  normalizedQuery?: string;
  domain?: DiscoverSearchDomain;
  offerKind?: DiscoverSearchOfferKind;
  sort?: DiscoverSearchSort;
  manual?: Partial<DiscoverSearchManualFilters>;
  excludedConstraints?: string[];
  now?: Date | string;
}

export interface DiscoverSearchConstraint {
  key: string;
  label: string;
  source: "query" | "manual";
}

export interface DiscoverSearchPlan {
  query: string;
  normalizedQuery: string;
  domain: DiscoverSearchDomain;
  offerKind: DiscoverSearchOfferKind;
  sort: DiscoverSearchSort;
  interpretation: SmartQueryInterpretation;
  facets: SmartQueryFacets;
  manual: DiscoverSearchManualFilters;
  exchange: DiscoverExchangeIntent;
  constraints: DiscoverSearchConstraint[];
  excludedConstraints: string[];
}

export type DiscoverExchangeType =
  | "action"
  | "skill"
  | "fund"
  | "donation"
  | "payment"
  | "deliverable"
  | "service"
  | "credit"
  | "rights"
  | "pool";

export interface DiscoverExchangeIntent {
  offerTypes: DiscoverExchangeType[];
  returnTypes: DiscoverExchangeType[];
  offerMaximumCents: number | null;
  offerMinimumCents: number | null;
  returnMaximumCents: number | null;
  returnMinimumCents: number | null;
  evidenceTerms: string[];
  flexibilities: Array<"fixed" | "negotiable" | "substitutions">;
  residualTerms: string[];
}

export interface DiscoverOfferSearchItem {
  kind: "offer";
  offerKind: Exclude<DiscoverSearchOfferKind, "all">;
  id: string;
  title: string;
  cause: string;
  status: string;
  youOffer: string[];
  youGet: string[];
  offerFlexibility: string;
  returnFlexibility: string;
  providerName: string;
  providerRole: string;
  evidenceLabel: string;
  completionLabel: string;
  href: string;
  exactMatchLabel: string;
  counteroffersAllowed: boolean;
  createdAt: string;
  score: number;
}

export interface DiscoverPoolSearchItem {
  kind: "pool";
  id: string;
  title: string;
  cause: string;
  status: string;
  youOffer: string[];
  youGet: string[];
  providerName: string;
  evidenceLabel: string;
  completionLabel: string;
  href: string;
  targetFundingCents: number;
  score: number;
}

export interface DiscoverPersonSearchItem {
  kind: "person";
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  causes: string[];
  location: string;
  verified: boolean;
  openOfferCount: number;
  href: string;
  score: number;
}

export type DiscoverSearchItem =
  | DiscoverOfferSearchItem
  | DiscoverPoolSearchItem
  | DiscoverPersonSearchItem;

const EMPTY_MANUAL_FILTERS: DiscoverSearchManualFilters = {
  causes: [],
  verifiedOnly: false,
  maximumOfferAmountCents: null,
  minimumReturnAmountCents: null,
  offerTypes: [],
  returnTypes: [],
  recipient: "",
  evidence: "",
  flexibilities: [],
  deadlineBefore: null,
};

const INTENT_WORDS = new Set([
  "action", "actions", "audit", "audits", "cash", "certificate", "certificates",
  "charity", "charities", "credit", "credits", "deliverable", "deliverables", "design",
  "donate", "donated", "donation", "donations", "engineer", "engineering", "fund", "funding",
  "interview", "interviews", "payment", "payments", "pledge", "pledges", "report", "reports",
  "research", "review", "reviews", "rights", "service", "services", "skill", "skills",
  "software", "stipend", "verification", "verify", "volunteer", "volunteering", "write", "writing",
]);

const DOMAIN_WORDS = new Set([
  "offer",
  "offers",
  "opportunity",
  "opportunities",
  "pool",
  "pools",
  "threshold",
  "people",
  "person",
  "member",
  "members",
  "who",
  "near",
]);

const TYPE_PATTERNS: ReadonlyArray<[DiscoverExchangeType, RegExp]> = [
  ["donation", /\b(donat(?:e|ed|es|ing|ion|ions)|charit(?:y|ies)|public[- ]good|fundraiser)\b/i],
  ["payment", /\b(pay|paid|payment|cash|stipend|reimburse(?:ment|d)?|reward|bonus)\b/i],
  ["fund", /\b(fund|funding|pledge|financial|money|dollars?)\b/i],
  ["skill", /\b(skill|software|engineer(?:ing)?|design|research|review|audit|write|writing|facilitat|interview|verify|verification|analysis|professional work)\b/i],
  ["action", /\b(action|volunteer|meal|trip|read|watch|listen|attend|contact|replace|abstain|complete|work|hour|hours|day|days)\b/i],
  ["deliverable", /\b(deliverable|report|memo|repository|harness|benchmark|documentation|explainer|brief|summary|publication|materials)\b/i],
  ["service", /\b(service|consultation|review of your|support for your|guidance)\b/i],
  ["credit", /\b(credit|recognition|attribution|certificate|badge)\b/i],
  ["rights", /\b(rights|licen[cs]e|reuse|access)\b/i],
  ["pool", /\b(pool|threshold|group[- ]buy|conditional funding)\b/i],
];

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? unique(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))
    : [];
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9$%+.'/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
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

function tokenMatchesText(token: string, text: string) {
  if (text.includes(token)) return true;
  return text.split(/\s+/).some((candidate) => {
    if (candidate.length < 4 || token.length < 4) return false;
    const maximumDistance = Math.max(candidate.length, token.length) >= 8 ? 2 : 1;
    return editDistance(candidate, token) <= maximumDistance;
  });
}

function isCoFundQuery(value: string) {
  const normalized = normalize(value);
  return /\bco[- ]?funds?\b|\bgroup[- ]buy(?:ing)?\b|\bcollective(?:ly)? fund(?:ing)? (?:an? )?(?:offer|trade)\b/.test(
    normalized,
  );
}

function isStandalonePoolQuery(value: string) {
  const normalized = normalize(value);
  return /\b(?:pools?|threshold pools?|standalone threshold|dominant[- ]assurance contracts?|assurance contracts?|near[- ]activation|near[- ]threshold)\b/.test(
    normalized,
  );
}

function residualTerms(query: string, interpretation: SmartQueryInterpretation) {
  const recognized = new Set(
    interpretation.recognizedPhrases.flatMap((phrase) => smartQueryTokens(phrase)),
  );
  const mechanismTerms = new Set<string>();
  if (isCoFundQuery(query)) {
    ["co", "fund", "funds", "group", "buy", "buying", "collective", "collectively", "moral", "trade", "offer"].forEach(
      (term) => mechanismTerms.add(term),
    );
  } else if (isStandalonePoolQuery(query)) {
    ["pool", "pools", "threshold", "standalone", "dominant", "assurance", "contract", "contracts", "near", "activation"].forEach(
      (term) => mechanismTerms.add(term),
    );
  }
  return unique(
    smartQueryTokens(query).filter(
      (token) =>
        !recognized.has(token) &&
        !DOMAIN_WORDS.has(token) &&
        !INTENT_WORDS.has(token) &&
        !mechanismTerms.has(token),
    ),
  );
}

function extractTypes(value: string) {
  return unique(
    TYPE_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([type]) => type),
  );
}

function parseAmountConstraint(value: string) {
  const normalized = normalize(value);
  const match = normalized.match(
    /\b(under|below|less than|no more than|at most|up to|maximum|max|over|more than|at least|minimum|min|exactly|exact)?\s*(?:usd\s*)?\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i,
  );
  if (!match) return null;
  const cents = Math.round(Number(match[2].replace(/,/g, "")) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  const qualifier = match[1] ?? "";
  if (/^(under|below|less than|no more than|at most|up to|maximum|max)$/i.test(qualifier)) {
    return { maximumCents: cents, minimumCents: null };
  }
  if (/^(over|more than|at least|minimum|min)$/i.test(qualifier)) {
    return { maximumCents: null, minimumCents: cents };
  }
  if (/^(exactly|exact)$/i.test(qualifier)) {
    return { maximumCents: cents, minimumCents: cents };
  }
  return { maximumCents: null, minimumCents: null };
}

export function parseDiscoverExchangeIntent(
  query: string,
  interpretation = parseSmartQuery(query, { surface: "global" }),
): DiscoverExchangeIntent {
  const normalized = normalize(query);
  const [offerClause, ...returnParts] = normalized.split(/\s+for\s+/);
  const returnClause = returnParts.length ? returnParts.join(" for ") : "";
  const offerAmount = parseAmountConstraint(offerClause);
  const returnAmount = returnClause ? parseAmountConstraint(returnClause) : null;
  const genericAmount = parseAmountConstraint(normalized);
  const evidenceTerms = [
    "receipt",
    "audit",
    "benchmark",
    "screenshot",
    "photo",
    "photograph",
    "certificate",
    "third-party confirmation",
    "public link",
    "test run",
  ].filter((term) => normalized.includes(term));
  const flexibilities: DiscoverExchangeIntent["flexibilities"] = [];
  if (/\bfixed(?: terms?)?\b/.test(normalized)) flexibilities.push("fixed");
  if (/\bnegotiable\b|\bcounteroffers? allowed\b/.test(normalized)) flexibilities.push("negotiable");
  if (/\bsubstitutions? allowed\b|\balternative (?:action|evidence)\b/.test(normalized)) {
    flexibilities.push("substitutions");
  }

  return {
    offerTypes: extractTypes(offerClause),
    returnTypes: returnClause ? extractTypes(returnClause) : [],
    offerMaximumCents:
      offerAmount?.maximumCents ?? (!returnClause ? genericAmount?.maximumCents ?? null : null),
    offerMinimumCents:
      offerAmount?.minimumCents ?? (!returnClause ? genericAmount?.minimumCents ?? null : null),
    returnMaximumCents: returnAmount?.maximumCents ?? null,
    returnMinimumCents: returnAmount?.minimumCents ?? null,
    evidenceTerms,
    flexibilities: unique(flexibilities),
    residualTerms: residualTerms(normalized, interpretation),
  };
}

function safeDomain(value: unknown): DiscoverSearchDomain | null {
  return value === "offers" || value === "pools" || value === "people" ? value : null;
}

function safeOfferKind(value: unknown): DiscoverSearchOfferKind | null {
  return value === "all" || value === "individual" || value === "co-fund"
    ? value
    : null;
}

function inferDomain(
  query: string,
  requested: DiscoverSearchDomain | undefined,
  interpretation: SmartQueryInterpretation,
  excluded: ReadonlySet<string>,
) {
  if (excluded.has("domain")) return requested ?? "offers";
  if (interpretation.intent === "people") return "people";
  if (interpretation.intent === "pools" || interpretation.intent === "mpgf_pools") return "pools";
  if (interpretation.intent === "offers") return "offers";
  const normalized = normalize(query);
  if (/\b(people|person|members?|who|counterpart(?:y|ies))\b/.test(normalized)) return "people";
  if (isCoFundQuery(normalized)) return "offers";
  if (isStandalonePoolQuery(normalized)) return "pools";
  return requested ?? "offers";
}

function inferOfferKind(
  query: string,
  domain: DiscoverSearchDomain,
  requested: DiscoverSearchOfferKind | undefined,
  excluded: ReadonlySet<string>,
): DiscoverSearchOfferKind {
  if (domain !== "offers" || excluded.has("offer-kind")) return "all";
  if (isCoFundQuery(query)) return "co-fund";
  if (/\b(?:individual|one[- ]to[- ]one) offers?\b/.test(normalize(query))) {
    return "individual";
  }
  return requested ?? "all";
}

function normalizedManualFilters(value: Partial<DiscoverSearchManualFilters> | undefined) {
  const source = value ?? {};
  const asCents = (candidate: unknown) =>
    typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0
      ? candidate
      : null;
  return {
    causes: asStringArray(source.causes),
    verifiedOnly: source.verifiedOnly === true,
    maximumOfferAmountCents: asCents(source.maximumOfferAmountCents),
    minimumReturnAmountCents: asCents(source.minimumReturnAmountCents),
    offerTypes: asStringArray(source.offerTypes),
    returnTypes: asStringArray(source.returnTypes),
    recipient: typeof source.recipient === "string" ? source.recipient.trim().slice(0, 160) : "",
    evidence: typeof source.evidence === "string" ? source.evidence.trim().slice(0, 160) : "",
    flexibilities: asStringArray(source.flexibilities),
    deadlineBefore:
      typeof source.deadlineBefore === "string" && /^20\d{2}-\d{2}-\d{2}$/.test(source.deadlineBefore)
        ? source.deadlineBefore
        : null,
  } satisfies DiscoverSearchManualFilters;
}

function queryConstraints(
  domain: DiscoverSearchDomain,
  offerKind: DiscoverSearchOfferKind,
  facets: SmartQueryFacets,
  exchange: DiscoverExchangeIntent,
  excluded: ReadonlySet<string>,
): DiscoverSearchConstraint[] {
  const result: DiscoverSearchConstraint[] = [];
  if (!excluded.has("domain")) {
    result.push({ key: "domain", label: `Domain: ${domain[0].toUpperCase()}${domain.slice(1)}`, source: "query" });
  }
  if (domain === "offers" && offerKind !== "all" && !excluded.has("offer-kind")) {
    result.push({
      key: "offer-kind",
      label: offerKind === "co-fund" ? "Offer type: Co-Fund" : "Offer type: Individual",
      source: "query",
    });
  }
  for (const cause of facets.causes) {
    const key = `cause:${cause}`;
    if (!excluded.has(key)) result.push({ key, label: `Cause: ${getSmartQueryCauseLabel(cause)}`, source: "query" });
  }
  if (facets.verified === true && !excluded.has("verified")) {
    result.push({ key: "verified", label: "Verified only", source: "query" });
  }
  if (exchange.offerMaximumCents !== null && !excluded.has("offer-max")) {
    result.push({ key: "offer-max", label: `You offer ≤ $${exchange.offerMaximumCents / 100}`, source: "query" });
  }
  if (exchange.offerMinimumCents !== null && !excluded.has("offer-min")) {
    result.push({ key: "offer-min", label: `You offer ≥ $${exchange.offerMinimumCents / 100}`, source: "query" });
  }
  if (exchange.returnMaximumCents !== null && !excluded.has("return-max")) {
    result.push({ key: "return-max", label: `You get ≤ $${exchange.returnMaximumCents / 100}`, source: "query" });
  }
  if (exchange.returnMinimumCents !== null && !excluded.has("return-min")) {
    result.push({ key: "return-min", label: `You get ≥ $${exchange.returnMinimumCents / 100}`, source: "query" });
  }
  for (const type of exchange.offerTypes) {
    const key = `offer-type:${type}`;
    if (!excluded.has(key)) result.push({ key, label: `You offer: ${type}`, source: "query" });
  }
  for (const type of exchange.returnTypes) {
    const key = `return-type:${type}`;
    if (!excluded.has(key)) result.push({ key, label: `You get: ${type}`, source: "query" });
  }
  if (facets.deadlineBefore && !excluded.has("deadline")) {
    result.push({ key: "deadline", label: `Complete by ${facets.deadlineBefore}`, source: "query" });
  }
  return result;
}

function manualConstraints(manual: DiscoverSearchManualFilters) {
  const result: DiscoverSearchConstraint[] = [];
  manual.causes.forEach((cause) => result.push({ key: `manual-cause:${cause}`, label: `Cause filter: ${cause}`, source: "manual" }));
  if (manual.verifiedOnly) result.push({ key: "manual-verified", label: "Verified only", source: "manual" });
  if (manual.maximumOfferAmountCents !== null) result.push({ key: "manual-offer-max", label: `You offer ≤ $${manual.maximumOfferAmountCents / 100}`, source: "manual" });
  if (manual.minimumReturnAmountCents !== null) result.push({ key: "manual-return-min", label: `You get ≥ $${manual.minimumReturnAmountCents / 100}`, source: "manual" });
  manual.offerTypes.forEach((type) => result.push({ key: `manual-offer-type:${type}`, label: `You offer: ${type}`, source: "manual" }));
  manual.returnTypes.forEach((type) => result.push({ key: `manual-return-type:${type}`, label: `You get: ${type}`, source: "manual" }));
  if (manual.recipient) result.push({ key: "manual-recipient", label: `Recipient: ${manual.recipient}`, source: "manual" });
  if (manual.evidence) result.push({ key: "manual-evidence", label: `Evidence: ${manual.evidence}`, source: "manual" });
  manual.flexibilities.forEach((value) => result.push({ key: `manual-flexibility:${value}`, label: value, source: "manual" }));
  if (manual.deadlineBefore) result.push({ key: "manual-deadline", label: `Complete by ${manual.deadlineBefore}`, source: "manual" });
  return result;
}

export function buildDiscoverSearchPlan(input: DiscoverSearchInput): DiscoverSearchPlan {
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 500) : "";
  const normalizedQuery = (input.normalizedQuery?.trim() || query).slice(0, 500);
  const interpretation = parseSmartQuery(normalizedQuery, {
    now: input.now,
    surface: "global",
  });
  const excludedConstraints = unique(asStringArray(input.excludedConstraints));
  const excluded = new Set(excludedConstraints);
  const requestedDomain = safeDomain(input.domain) ?? undefined;
  const domain = inferDomain(normalizedQuery, requestedDomain, interpretation, excluded);
  const requestedOfferKind = safeOfferKind(input.offerKind) ?? undefined;
  const offerKind = inferOfferKind(
    normalizedQuery,
    domain,
    requestedOfferKind,
    excluded,
  );
  const exchange = parseDiscoverExchangeIntent(normalizedQuery, interpretation);
  const facets: SmartQueryFacets = {
    ...interpretation.facets,
    causes: interpretation.facets.causes.filter((cause) => !excluded.has(`cause:${cause}`)),
    verified: excluded.has("verified") ? null : interpretation.facets.verified,
    deadlineBefore: excluded.has("deadline") ? null : interpretation.facets.deadlineBefore,
  };
  if (excluded.has("offer-max")) exchange.offerMaximumCents = null;
  if (excluded.has("offer-min")) exchange.offerMinimumCents = null;
  if (excluded.has("return-max")) exchange.returnMaximumCents = null;
  if (excluded.has("return-min")) exchange.returnMinimumCents = null;
  exchange.offerTypes = exchange.offerTypes.filter((type) => !excluded.has(`offer-type:${type}`));
  exchange.returnTypes = exchange.returnTypes.filter((type) => !excluded.has(`return-type:${type}`));
  const manual = normalizedManualFilters(input.manual);
  const sort: DiscoverSearchSort = ["best-fit", "newest", "deadline", "lowest-cost", "strongest-evidence"].includes(input.sort ?? "")
    ? (input.sort as DiscoverSearchSort)
    : "best-fit";
  return {
    query,
    normalizedQuery,
    domain,
    offerKind,
    sort,
    interpretation,
    facets,
    manual,
    exchange,
    excludedConstraints,
    constraints: [
      ...queryConstraints(domain, offerKind, facets, exchange, excluded),
      ...manualConstraints(manual),
    ],
  };
}

function actionTypes(value: string) {
  return extractTypes(normalize(value));
}

function extractDollarAmounts(value: string) {
  return [...value.matchAll(/\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/g)]
    .map((match) => Math.round(Number(match[1].replace(/,/g, "")) * 100))
    .filter((amount) => Number.isSafeInteger(amount) && amount >= 0);
}

function amountSatisfies(
  amounts: readonly number[],
  minimum: number | null,
  maximum: number | null,
  nonMonetaryCountsAsZero: boolean,
) {
  const candidates = amounts.length ? amounts : nonMonetaryCountsAsZero ? [0] : [];
  if (!candidates.length && (minimum !== null || maximum !== null)) return false;
  return candidates.some((amount) =>
    (minimum === null || amount >= minimum) && (maximum === null || amount <= maximum),
  );
}

function causeIdsForText(value: string) {
  return parseSmartQuery(value, { surface: "global" }).facets.causes;
}

function causeGroupMatches(required: readonly string[], actual: readonly string[], text: string) {
  if (!required.length) return true;
  return required.some((cause) => actual.includes(cause) || tokenMatchesText(normalize(getSmartQueryCauseLabel(cause)), normalize(text)));
}

function textMatchesResidualTerms(terms: readonly string[], text: string) {
  const normalizedText = normalize(text);
  return terms.every((term) => tokenMatchesText(term, normalizedText));
}

function matchesTypeGroup(required: readonly string[], actual: readonly string[]) {
  return !required.length || required.some((type) => actual.includes(type));
}

function stripCatalogPrefix(value: string) {
  return value.replace(/^\s*[A-Z]\d+\s*[—:-]\s*/u, "").trim();
}

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function offerScore(listing: PublicOfferListing, plan: DiscoverSearchPlan, text: string) {
  let score = 0;
  const normalizedText = normalize(text);
  if (plan.facets.causes.length) score += 50;
  score += plan.exchange.residualTerms.filter((term) => tokenMatchesText(term, normalizedText)).length * 8;
  if (listing.reviewState === "reviewed") score += 6;
  if (listing.evidenceGated) score += 4;
  const created = Date.parse(listing.createdAt);
  if (Number.isFinite(created)) score += created / 1e13;
  return score;
}

export function filterAndRankDiscoverOffers(
  listings: readonly PublicOfferListing[],
  plan: DiscoverSearchPlan,
): DiscoverOfferSearchItem[] {
  if (plan.domain !== "offers" || plan.offerKind === "co-fund") return [];
  const queryOfferMaximum = plan.exchange.offerMaximumCents;
  const queryOfferMinimum = plan.exchange.offerMinimumCents;
  const queryReturnMaximum = plan.exchange.returnMaximumCents;
  const queryReturnMinimum = plan.exchange.returnMinimumCents;
  const maximumOffer = [queryOfferMaximum, plan.manual.maximumOfferAmountCents]
    .filter((value): value is number => value !== null)
    .reduce<number | null>((current, value) => current === null ? value : Math.min(current, value), null);
  const minimumReturn = [queryReturnMinimum, plan.manual.minimumReturnAmountCents]
    .filter((value): value is number => value !== null)
    .reduce<number | null>((current, value) => current === null ? value : Math.max(current, value), null);

  const result = listings.flatMap((listing): DiscoverOfferSearchItem[] => {
    if (listing.status !== "live" || listing.source !== "live" || listing.isWorkedExample) return [];
    const offerText = stripCatalogPrefix(listing.requestedAction);
    const returnText = stripCatalogPrefix(listing.offeredAction);
    const text = [
      listing.title,
      listing.summary,
      listing.primaryCause,
      listing.secondaryCause,
      offerText,
      returnText,
      listing.verificationMethod,
      listing.verificationSummary,
      listing.displayName,
    ].filter(Boolean).join(" ");
    const actualCauses = causeIdsForText(`${listing.primaryCause} ${listing.secondaryCause ?? ""} ${listing.title}`);
    if (!causeGroupMatches(plan.facets.causes, actualCauses, text)) return [];
    if (!causeGroupMatches(plan.manual.causes, actualCauses, text)) return [];
    if (!textMatchesResidualTerms(plan.exchange.residualTerms, text)) return [];
    const actualOfferTypes = actionTypes(offerText);
    const actualReturnTypes = actionTypes(returnText);
    if (!matchesTypeGroup(plan.exchange.offerTypes, actualOfferTypes)) return [];
    if (!matchesTypeGroup(plan.exchange.returnTypes, actualReturnTypes)) return [];
    if (!matchesTypeGroup(plan.manual.offerTypes, actualOfferTypes)) return [];
    if (!matchesTypeGroup(plan.manual.returnTypes, actualReturnTypes)) return [];
    const offerAmounts = extractDollarAmounts(offerText);
    const returnAmounts = extractDollarAmounts(returnText);
    if (!amountSatisfies(offerAmounts, queryOfferMinimum, maximumOffer, true)) return [];
    if (!amountSatisfies(returnAmounts, minimumReturn, queryReturnMaximum, false)) return [];
    const verified = listing.reviewState === "reviewed";
    if ((plan.facets.verified === true || plan.manual.verifiedOnly) && !verified) return [];
    if (plan.facets.verified === false && verified) return [];
    const evidenceText = normalize(`${listing.verificationMethod} ${listing.verificationSummary ?? ""}`);
    if (plan.exchange.evidenceTerms.some((term) => !evidenceText.includes(normalize(term)))) return [];
    if (plan.manual.evidence && !evidenceText.includes(normalize(plan.manual.evidence))) return [];
    if (plan.manual.recipient && !normalize(returnText).includes(normalize(plan.manual.recipient))) return [];
    if (plan.facets.deadlineBefore || plan.manual.deadlineBefore) return [];
    const fixedOnly = [...plan.exchange.flexibilities, ...plan.manual.flexibilities];
    if (fixedOnly.length && !fixedOnly.includes("fixed")) return [];
    const score = offerScore(listing, plan, text);
    const youOffer = [offerText];
    if (listing.duration.label) youOffer.push(listing.duration.label);
    if (listing.evidenceGated) youOffer.push(`Submit agreed evidence: ${listing.verificationMethod}`);
    const youGet = [returnText];
    if (listing.manualReviewRequired) youGet.push("Provided after both parties confirm and the published review gate clears");
    return [{
      kind: "offer",
      offerKind: "individual",
      id: listing.id,
      title: listing.title,
      cause: listing.secondaryCause || listing.primaryCause,
      status: listing.reviewState === "reviewed" ? "Reviewed" : "Manual review required",
      youOffer,
      youGet,
      offerFlexibility: "Fixed",
      returnFlexibility: "Fixed",
      providerName: listing.displayName,
      providerRole: "Offer maker",
      evidenceLabel: listing.verificationMethod,
      completionLabel: listing.duration.label,
      href: listing.canonicalUrl,
      exactMatchLabel: "Request exact match",
      counteroffersAllowed: true,
      createdAt: listing.createdAt,
      score,
    }];
  });

  return result.sort((left, right) => {
    if (plan.sort === "newest") return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (plan.sort === "strongest-evidence") return right.evidenceLabel.length - left.evidenceLabel.length || right.score - left.score;
    return right.score - left.score || Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export function filterAndRankDiscoverCoFunds(
  routes: readonly LiveGroupBuyingRoute[],
  plan: DiscoverSearchPlan,
): DiscoverOfferSearchItem[] {
  if (plan.domain !== "offers" || plan.offerKind === "individual") return [];
  const maximumOffer = [
    plan.exchange.offerMaximumCents,
    plan.facets.maxAmountCents,
    plan.manual.maximumOfferAmountCents,
  ]
    .filter((value): value is number => value !== null)
    .reduce<number | null>(
      (current, value) => (current === null ? value : Math.min(current, value)),
      null,
    );
  const minimumOffer = [plan.exchange.offerMinimumCents, plan.facets.minAmountCents]
    .filter((value): value is number => value !== null)
    .reduce<number | null>(
      (current, value) => (current === null ? value : Math.max(current, value)),
      null,
    );
  if (
    plan.exchange.returnMinimumCents !== null ||
    plan.exchange.returnMaximumCents !== null ||
    plan.manual.minimumReturnAmountCents !== null
  ) {
    return [];
  }

  return routes
    .flatMap((route): DiscoverOfferSearchItem[] => {
      const offerText = [
        `Contribute from ${formatMoney(route.minimumFundingCents, route.currency)}`,
        `Published target: ${formatMoney(route.targetFundingCents, route.currency)}`,
        route.failureBehavior,
      ];
      const returnText = [route.intervention, route.expectedEffect, route.statusSentence];
      const text = [
        route.title,
        route.summary,
        route.causeArea,
        route.recipientName,
        ...offerText,
        ...returnText,
        route.verificationSummary,
        route.timeline,
        route.statusLabel,
      ].join(" ");
      const actualCauses = causeIdsForText(`${route.causeArea} ${route.title} ${route.summary}`);
      if (!causeGroupMatches(plan.facets.causes, actualCauses, text)) return [];
      if (!causeGroupMatches(plan.manual.causes, actualCauses, text)) return [];
      if (!textMatchesResidualTerms(plan.exchange.residualTerms, text)) return [];
      const actualOfferTypes: DiscoverExchangeType[] = ["fund", "pool"];
      const actualReturnTypes = actionTypes(returnText.join(" "));
      if (!matchesTypeGroup(plan.exchange.offerTypes, actualOfferTypes)) return [];
      if (!matchesTypeGroup(plan.exchange.returnTypes, actualReturnTypes)) return [];
      if (!matchesTypeGroup(plan.manual.offerTypes, actualOfferTypes)) return [];
      if (!matchesTypeGroup(plan.manual.returnTypes, actualReturnTypes)) return [];
      if (
        !amountSatisfies(
          [route.minimumFundingCents],
          minimumOffer,
          maximumOffer,
          false,
        )
      ) {
        return [];
      }
      const verified = Boolean(
        route.verificationSummary &&
          !/unavailable|not verified/i.test(route.verificationSummary),
      );
      if ((plan.facets.verified === true || plan.manual.verifiedOnly) && !verified) return [];
      if (plan.facets.verified === false && verified) return [];
      const evidenceText = normalize(route.verificationSummary);
      if (plan.exchange.evidenceTerms.some((term) => !evidenceText.includes(normalize(term)))) return [];
      if (plan.manual.evidence && !evidenceText.includes(normalize(plan.manual.evidence))) return [];
      if (plan.manual.recipient && !normalize(route.recipientName).includes(normalize(plan.manual.recipient))) return [];
      const deadline = route.deadlineAt?.slice(0, 10) ?? null;
      if (plan.facets.deadlineBefore && (!deadline || deadline > plan.facets.deadlineBefore)) return [];
      if (plan.manual.deadlineBefore && (!deadline || deadline > plan.manual.deadlineBefore)) return [];
      const flexibility = [...plan.exchange.flexibilities, ...plan.manual.flexibilities];
      if (flexibility.some((value) => value !== "fixed")) return [];
      const score = poolScore(route, plan, text);
      return [{
        kind: "offer",
        offerKind: "co-fund",
        id: route.id,
        title: route.title,
        cause: route.causeArea,
        status: route.statusLabel,
        youOffer: offerText,
        youGet: returnText,
        offerFlexibility: "Threshold terms",
        returnFlexibility: "Fixed",
        providerName: route.recipientName,
        providerRole: "Co-Fund counterparty",
        evidenceLabel: route.verificationSummary,
        completionLabel: route.deadlineAt
          ? `Funding closes ${route.deadlineAt.slice(0, 10)}`
          : route.timeline,
        href: route.href,
        exactMatchLabel: "Join Co-Fund",
        counteroffersAllowed: false,
        createdAt: route.deadlineAt ?? "1970-01-01T00:00:00.000Z",
        score,
      }];
    })
    .sort((left, right) => {
      if (plan.sort === "newest") return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      if (plan.sort === "lowest-cost") {
        return (
          extractDollarAmounts(left.youOffer[0])[0] -
            extractDollarAmounts(right.youOffer[0])[0] ||
          right.score - left.score
        );
      }
      if (plan.sort === "strongest-evidence") {
        return right.evidenceLabel.length - left.evidenceLabel.length || right.score - left.score;
      }
      return right.score - left.score || left.title.localeCompare(right.title);
    });
}

function poolScore(route: LiveGroupBuyingRoute, plan: DiscoverSearchPlan, text: string) {
  let score = plan.facets.causes.length ? 50 : 0;
  const normalizedText = normalize(text);
  score += plan.exchange.residualTerms.filter((term) => tokenMatchesText(term, normalizedText)).length * 8;
  if (/near threshold|almost funded|close to/i.test(route.statusSentence)) score += 12;
  return score;
}

export function filterAndRankDiscoverPools(
  routes: readonly LiveGroupBuyingRoute[],
  plan: DiscoverSearchPlan,
): DiscoverPoolSearchItem[] {
  const result = routes.flatMap((route): DiscoverPoolSearchItem[] => {
    const text = [
      route.title,
      route.summary,
      route.causeArea,
      route.recipientName,
      route.intervention,
      route.verificationSummary,
      route.expectedEffect,
      route.timeline,
      route.statusLabel,
      route.statusSentence,
    ].join(" ");
    const actualCauses = causeIdsForText(`${route.causeArea} ${route.title} ${route.summary}`);
    if (!causeGroupMatches(plan.facets.causes, actualCauses, text)) return [];
    if (!causeGroupMatches(plan.manual.causes, actualCauses, text)) return [];
    if (!textMatchesResidualTerms(plan.exchange.residualTerms, text)) return [];
    if (plan.facets.verified === true || plan.manual.verifiedOnly) {
      if (!route.verificationSummary || /unavailable|not verified/i.test(route.verificationSummary)) return [];
    }
    if (plan.facets.maxAmountCents !== null && route.targetFundingCents > plan.facets.maxAmountCents) return [];
    if (plan.facets.minAmountCents !== null && route.targetFundingCents < plan.facets.minAmountCents) return [];
    if (plan.facets.deadlineBefore) {
      if (!route.deadlineAt || route.deadlineAt.slice(0, 10) > plan.facets.deadlineBefore) return [];
    }
    if (plan.manual.deadlineBefore) {
      if (!route.deadlineAt || route.deadlineAt.slice(0, 10) > plan.manual.deadlineBefore) return [];
    }
    const score = poolScore(route, plan, text);
    return [{
      kind: "pool",
      id: route.id,
      title: route.title,
      cause: route.causeArea,
      status: route.statusLabel,
      youOffer: [
        `Make a conditional pledge from ${formatMoney(route.minimumFundingCents, route.currency)}`,
        `Maximum published target: ${formatMoney(route.targetFundingCents, route.currency)}`,
        route.failureBehavior,
      ],
      youGet: [route.intervention, route.expectedEffect, route.statusSentence],
      providerName: route.recipientName,
      evidenceLabel: route.verificationSummary,
      completionLabel: route.deadlineAt ? `Deadline ${route.deadlineAt.slice(0, 10)}` : route.timeline,
      href: route.href,
      targetFundingCents: route.targetFundingCents,
      score,
    }];
  });

  return result.sort((left, right) => {
    if (plan.sort === "lowest-cost") return left.targetFundingCents - right.targetFundingCents || right.score - left.score;
    if (plan.sort === "strongest-evidence") return right.evidenceLabel.length - left.evidenceLabel.length || right.score - left.score;
    return right.score - left.score || left.title.localeCompare(right.title);
  });
}

function publicProfileLocation(profile: PublicProfileSummary) {
  if (profile.wishLocation) return profile.wishLocation;
  const record = profile as unknown as Record<string, unknown>;
  const parts = [
    record.location_city,
    record.location_region,
    record.location_country,
    record.city,
    record.region,
    record.country,
  ].filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return unique(parts).join(", ") || "Location not public";
}

export function filterAndRankDiscoverPeople(
  profiles: readonly PublicProfileSummary[],
  plan: DiscoverSearchPlan,
): DiscoverPersonSearchItem[] {
  if (
    plan.facets.minAmountCents !== null ||
    plan.facets.maxAmountCents !== null ||
    plan.exchange.offerMaximumCents !== null ||
    plan.exchange.offerMinimumCents !== null ||
    plan.exchange.returnMaximumCents !== null ||
    plan.exchange.returnMinimumCents !== null ||
    plan.facets.deadlineBefore ||
    plan.facets.deadlineAfter
  ) {
    return [];
  }

  return profiles.flatMap((profile): DiscoverPersonSearchItem[] => {
    const causes = unique(profile.wishCauses ?? []);
    const location = publicProfileLocation(profile);
    const text = [
      profile.resolvedName,
      profile.bio,
      profile.wishPreview,
      causes.join(" "),
      location,
      profile.wishCollectiveName,
    ].filter(Boolean).join(" ");
    const actualCauses = causeIdsForText(`${causes.join(" ")} ${profile.bio ?? ""} ${profile.wishPreview ?? ""}`);
    if (!causeGroupMatches(plan.facets.causes, actualCauses, text)) return [];
    if (!causeGroupMatches(plan.manual.causes, actualCauses, text)) return [];
    if (!textMatchesResidualTerms(plan.exchange.residualTerms, text)) return [];
    const verified = profile.verificationBadges.length > 0;
    if ((plan.facets.verified === true || plan.manual.verifiedOnly) && !verified) return [];
    if (plan.facets.verified === false && verified) return [];
    if (plan.facets.location && !normalize(location).includes(normalize(plan.facets.location))) return [];
    if (plan.facets.participantKinds.length) {
      if (!profile.wishParticipantKind || !plan.facets.participantKinds.includes(profile.wishParticipantKind)) return [];
    }
    if (plan.facets.openToPayment !== null && profile.wishOpenToPayment !== plan.facets.openToPayment) return [];
    if (plan.facets.openToPledges !== null && profile.wishOpenToPledges !== plan.facets.openToPledges) return [];
    let score = actualCauses.filter((cause) => plan.facets.causes.includes(cause)).length * 50;
    score += plan.exchange.residualTerms.filter((term) => tokenMatchesText(term, normalize(text))).length * 8;
    if (verified) score += 8;
    score += Math.min(12, profile.offerCount);
    return [{
      kind: "person",
      id: profile.id,
      title: profile.resolvedName,
      subtitle: profile.wishParticipantKind || "Individual",
      summary: profile.bio || profile.wishPreview || "No public biography supplied.",
      causes,
      location,
      verified,
      openOfferCount: profile.offerCount,
      href: `/people/${profile.id}`,
      score,
    }];
  }).sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}
