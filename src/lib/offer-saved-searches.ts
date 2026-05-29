export const OFFER_SAVED_SEARCH_CONTRACT_VERSION =
  "offer-saved-search-v0.1-2026-05";
export const OFFER_SAVED_SEARCH_VALIDATOR_VERSION =
  "offer-saved-search-validator-v0.1";

export type OfferSavedSearchCadence = "manual" | "daily" | "weekly" | "monthly";
export type OfferSavedSearchMode = "validated" | "auth_required" | "created";

export interface OfferSavedSearchFilters {
  tab: "live" | "examples" | "all";
  formats: string[];
  reviewStates: string[];
  sort: "newest" | "reviewed" | "highest-offered-impact" | "best-fit";
  sourceRoute: "/offers";
}

export interface OfferSavedSearchDraft {
  label: string;
  query: string;
  causes: string[];
  cadence: OfferSavedSearchCadence;
  minScore: number;
  notifyOnLiveMatch: boolean;
  filters: OfferSavedSearchFilters;
  sourceRoute: string;
}

export interface OfferSavedSearchPayload {
  contractVersion: string;
  mode: OfferSavedSearchMode;
  savedSearch: OfferSavedSearchDraft & { id: string | null };
  signInUrl: string | null;
  publicContract: {
    version: string;
    sourceRoute: "/offers";
    publicApiRoute: "/api/saved-searches";
    nonClaims: string[];
  };
}

export interface OfferSavedSearchValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface OfferSavedSearchValidation {
  status: "pass" | "fail";
  validatorName: "offer-saved-search-api";
  validatorVersion: string;
  contractVersion: string;
  checks: OfferSavedSearchValidationCheck[];
  blockers: string[];
}

const VALID_TABS = new Set(["live", "examples", "all"]);
const VALID_FORMATS = new Set([
  "pledge-swap",
  "donation-offset",
  "public-good",
  "paid-action",
]);
const VALID_REVIEW_STATES = new Set([
  "unreviewed",
  "manual-review-required",
  "reviewed",
  "disputed",
]);
const VALID_SORTS = new Set([
  "newest",
  "reviewed",
  "highest-offered-impact",
  "best-fit",
]);
const VALID_CADENCES = new Set(["manual", "daily", "weekly", "monthly"]);
const PRIVATE_FIELD_PATTERN =
  /contactEmail|email|phone|owner_id|authUser|privateWish|rawSourceNotes|cartState|password|token/i;
const NON_CLAIMS = [
  "Saved offer searches are viewer-owned browse preferences, not public wishes or contact grants.",
  "Logged-out requests return a sign-in draft and must not store private search state.",
  "Cause following is represented as a saved search with public filters and optional live-offer notification.",
  "Saved searches do not create escrow, custody, agreement formation, autonomous outreach, or platform moral ranking.",
] as const;

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeStringArray(...values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .flatMap((value) => String(value ?? "").split(","))
    .map((value) => normalizeText(value, 80))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeFormat(value: unknown) {
  const token = normalizeToken(value);

  if (token === "pledge" || token === "pledge-swap") return "pledge-swap";
  if (token === "offset" || token === "donation-offset") return "donation-offset";
  if (token === "payment" || token === "paid-action") return "paid-action";
  if (token === "public-good" || token === "public-good-contribution") return "public-good";
  return VALID_FORMATS.has(token) ? token : "";
}

function normalizeReviewState(value: unknown) {
  const token = normalizeToken(value);

  if (token === "manual-review") return "manual-review-required";
  return VALID_REVIEW_STATES.has(token) ? token : "";
}

function normalizeTab(value: unknown): OfferSavedSearchFilters["tab"] {
  const normalized = normalizeToken(value);

  return VALID_TABS.has(normalized)
    ? (normalized as OfferSavedSearchFilters["tab"])
    : "live";
}

function normalizeSort(value: unknown): OfferSavedSearchFilters["sort"] {
  const normalized = normalizeToken(value);

  if (normalized === "impact") return "highest-offered-impact";
  if (normalized === "efficient") return "best-fit";
  return VALID_SORTS.has(normalized)
    ? (normalized as OfferSavedSearchFilters["sort"])
    : "newest";
}

function normalizeCadence(value: unknown, notifyOnLiveMatch: boolean): OfferSavedSearchCadence {
  const normalized = normalizeToken(value);

  if (!notifyOnLiveMatch) return "manual";
  return VALID_CADENCES.has(normalized)
    ? (normalized as OfferSavedSearchCadence)
    : "weekly";
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeToken(value);

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function normalizeMinScore(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "50"), 10);

  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(0, parsed));
}

function buildSourceRoute(draft: Omit<OfferSavedSearchDraft, "sourceRoute">) {
  const params = new URLSearchParams();

  if (draft.query) params.set("q", draft.query);
  if (draft.filters.tab !== "live") params.set("view", draft.filters.tab);
  draft.causes.forEach((cause) => params.append("cause", cause));
  draft.filters.formats.forEach((format) => params.append("format", format));
  draft.filters.reviewStates.forEach((reviewState) =>
    params.append("reviewState", reviewState),
  );
  if (draft.filters.sort !== "newest") params.set("sort", draft.filters.sort);

  const queryString = params.toString();
  return queryString ? `/offers?${queryString}` : "/offers";
}

function buildLabel({
  causes,
  formats,
  label,
  query,
}: {
  causes: string[];
  formats: string[];
  label: string;
  query: string;
}) {
  if (label) return label;
  if (query) return `Offers: ${query}`.slice(0, 80);
  if (causes.length) return `Offers in ${causes.slice(0, 2).join(", ")}`.slice(0, 80);
  if (formats.length) return `Offers: ${formats[0]}`.slice(0, 80);
  return "Saved offer search";
}

export function normalizeOfferSavedSearchDraft(input: Record<string, unknown>) {
  const query = normalizeText(input.query ?? input.q ?? input.search, 120);
  const causes = Array.from(
    new Set(
      normalizeStringArray(input.cause, input.causes).map((cause) => normalizeText(cause, 80)),
    ),
  );
  const formats = Array.from(
    new Set(
      normalizeStringArray(input.format, input.formats, input.mode)
        .map(normalizeFormat)
        .filter(Boolean),
    ),
  );
  const reviewStates = Array.from(
    new Set(
      normalizeStringArray(input.reviewState, input.reviewStates, input.review)
        .map(normalizeReviewState)
        .filter(Boolean),
    ),
  );
  const notifyOnLiveMatch = normalizeBoolean(
    input.notifyOnLiveMatch ?? input.notify_on_live_match,
    true,
  );
  const filters = {
    tab: normalizeTab(input.tab ?? input.view),
    formats,
    reviewStates,
    sort: normalizeSort(input.sort),
    sourceRoute: "/offers",
  } satisfies OfferSavedSearchFilters;
  const draftWithoutRoute = {
    label: buildLabel({
      causes,
      formats,
      label: normalizeText(input.label ?? input.name, 80),
      query,
    }),
    query,
    causes,
    cadence: normalizeCadence(input.cadence, notifyOnLiveMatch),
    minScore: normalizeMinScore(input.minScore ?? input.min_score),
    notifyOnLiveMatch,
    filters,
  };

  return {
    ...draftWithoutRoute,
    sourceRoute: buildSourceRoute(draftWithoutRoute),
  } satisfies OfferSavedSearchDraft;
}

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): OfferSavedSearchValidationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function buildOfferSavedSearchPayload({
  draft,
  id = null,
  mode,
}: {
  draft: OfferSavedSearchDraft;
  id?: string | null;
  mode: OfferSavedSearchMode;
}): OfferSavedSearchPayload {
  return {
    contractVersion: OFFER_SAVED_SEARCH_CONTRACT_VERSION,
    mode,
    savedSearch: {
      ...draft,
      id,
    },
    signInUrl:
      mode === "auth_required"
        ? `/login?returnTo=${encodeURIComponent(draft.sourceRoute)}`
        : null,
    publicContract: {
      version: OFFER_SAVED_SEARCH_CONTRACT_VERSION,
      sourceRoute: "/offers",
      publicApiRoute: "/api/saved-searches",
      nonClaims: [...NON_CLAIMS],
    },
  };
}

export function validateOfferSavedSearchPayload(
  payload: OfferSavedSearchPayload,
): OfferSavedSearchValidation {
  const draft = payload.savedSearch;
  const hasBrowseScope = Boolean(
    draft.query ||
      draft.causes.length ||
      draft.filters.formats.length ||
      draft.filters.reviewStates.length ||
      draft.filters.tab !== "live",
  );
  const serialized = JSON.stringify(payload);
  const checks = [
    validationCheck(
      "contract-shape",
      "Saved-search contract route and version are published",
      payload.contractVersion === OFFER_SAVED_SEARCH_CONTRACT_VERSION &&
        payload.publicContract.publicApiRoute === "/api/saved-searches" &&
        payload.publicContract.sourceRoute === "/offers",
      `${payload.publicContract.publicApiRoute}; ${payload.contractVersion}`,
    ),
    validationCheck(
      "browse-scope",
      "Saved search has at least one public browse scope",
      hasBrowseScope,
      draft.sourceRoute,
    ),
    validationCheck(
      "safe-filter-shape",
      "Saved search uses bounded public filters",
      draft.label.length > 0 &&
        draft.label.length <= 80 &&
        draft.query.length <= 120 &&
        draft.causes.length <= 8 &&
        draft.filters.formats.every((format) => VALID_FORMATS.has(format)) &&
        draft.filters.reviewStates.every((state) => VALID_REVIEW_STATES.has(state)) &&
        VALID_CADENCES.has(draft.cadence),
      `${draft.label}; ${draft.causes.length} cause(s).`,
    ),
    validationCheck(
      "logged-out-boundary",
      "Logged-out mode returns a sign-in draft instead of storing state",
      payload.mode !== "auth_required" ||
        (payload.savedSearch.id === null && Boolean(payload.signInUrl)),
      payload.signInUrl ?? "authenticated",
    ),
    validationCheck(
      "privacy-and-nonclaims",
      "Payload omits private fields and preserves non-claims",
      !PRIVATE_FIELD_PATTERN.test(serialized) &&
        payload.publicContract.nonClaims.some((claim) => /viewer-owned browse preferences/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /not store private search state/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /autonomous outreach|platform moral ranking/i.test(claim)),
      payload.publicContract.nonClaims.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "offer-saved-search-api",
    validatorVersion: OFFER_SAVED_SEARCH_VALIDATOR_VERSION,
    contractVersion: payload.contractVersion,
    checks,
    blockers,
  };
}
