export const ATTRIBUTION_COOKIE_NAME = "mt_attribution";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 45;
export const ANALYTICS_OPT_OUT_COOKIE_NAME = "mt_analytics_opt_out";
export const ANALYTICS_OPT_OUT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

export const FUNNEL_EVENT_TYPES = [
  "page_view",
  "hero_primary_cta_clicked",
  "landing_cta_click",
  "signup_start",
  "sign_in_started",
  "sign_in_completed",
  "signup_complete",
  "email_confirm_complete",
  "role_selected",
  "cause_selected",
  "onboarding_complete",
  "first_action_selected",
  "worked_example_opened",
  "worked_example_view",
  "create_trade_started",
  "clone_example_action",
  "wish_profile_started",
  "wish_profile_completion",
  "referral_invite_drafted",
  "invite_sent",
  "invite_accepted",
  "pair_completed",
  "cohort_interest_started",
  "intro_requested",
  "registry_search_executed",
  "donation_route_clicked",
  "donation_logged",
  "evidence_submission_started",
  "public_good_action_logged",
  "privacy_grant_changed",
  "background_scan_run",
  "match_consent_recorded",
  "detail_request_submitted",
  "detail_request_resolved",
  "safety_report_submitted",
  "webinar_rsvp",
  "partner_page_view",
  "email_nurture_subscribed",
  "day_one_return",
  "day_seven_return",
  "performance_metric_recorded",
] as const;

export type FunnelEventType = (typeof FUNNEL_EVENT_TYPES)[number];

export interface AttributionPayload {
  anonymousId: string;
  firstPath: string;
  lastPath: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  referralCode: string;
  partnerSlug: string;
  firstSeenAt: string;
}

export const ONBOARDING_GOALS = [
  {
    value: "find_counterparty",
    label: "Find a counterparty",
    description: "Create a broad preview or request a consent-gated introduction.",
  },
  {
    value: "support_public_good",
    label: "Support a public good",
    description: "Log or join a shared public-good commitment with evidence rules.",
  },
  {
    value: "browse_examples",
    label: "Browse and clone examples",
    description: "Start by adapting a seeded pledge swap or donation offset.",
  },
] as const;

export const PARTICIPANT_KINDS = [
  { value: "individual", label: "Individual" },
  { value: "collective", label: "Collective" },
  { value: "institution", label: "Institution" },
  { value: "organizer", label: "Community organizer" },
] as const;

export const FIRST_ACTIONS = [
  {
    value: "clone_example",
    label: "Clone a worked example",
    href: "/worked-examples",
    actionLabel: "Open worked examples",
  },
  {
    value: "create_broad_preview",
    label: "Create a broad wish preview",
    href: "/dashboard#wish-profile",
    actionLabel: "Create broad preview",
  },
  {
    value: "log_public_good_action",
    label: "Log a public-good action",
    href: "/mpgf",
    actionLabel: "Open public-good flow",
  },
  {
    value: "invite_counterparty",
    label: "Invite one serious counterparty",
    href: "/cohort#invite",
    actionLabel: "Draft one invite",
  },
] as const;

export const COHORT_CAUSES = [
  "Animal welfare",
  "Climate",
  "Existential risk",
  "Future flourishing",
  "Global poverty",
  "Public health",
  "Cause prioritization",
  "Community service",
] as const;

export const PARTNER_COHORTS = [
  {
    slug: "effective-giving",
    name: "Effective Giving Cohort",
    audience: "donors and pledge-curious members",
    useCase: "clone a pledge swap or log a small public-good action",
    primaryCause: "Global poverty",
  },
  {
    slug: "animal-welfare",
    name: "Animal Welfare Bridge Cohort",
    audience: "animal advocates and welfare-curious donors",
    useCase: "test diet-pledge swaps with evidence-light check-ins",
    primaryCause: "Animal welfare",
  },
  {
    slug: "climate-resilience",
    name: "Climate Resilience Cohort",
    audience: "climate donors and local resilience organizers",
    useCase: "pair climate actions with public-health or poverty commitments",
    primaryCause: "Climate",
  },
  {
    slug: "ai-and-longtermism",
    name: "AI and Longtermism Cohort",
    audience: "longtermist donors, researchers, and builders",
    useCase: "surface private wish previews without public identity disclosure",
    primaryCause: "Existential risk",
  },
  {
    slug: "public-health",
    name: "Public Health Cohort",
    audience: "public-health volunteers and evidence-led donors",
    useCase: "trade public-health volunteer actions for reciprocal commitments",
    primaryCause: "Public health",
  },
  {
    slug: "founder-philanthropy",
    name: "Founder Philanthropy Cohort",
    audience: "mission-driven founders and major-gift-minded donors",
    useCase: "request concierge intros and seed reviewed examples",
    primaryCause: "Future flourishing",
  },
  {
    slug: "cause-prioritization",
    name: "Cause Prioritization Cohort",
    audience: "people comparing serious moral priorities",
    useCase: "turn disagreement into explicit, reviewable cooperation",
    primaryCause: "Cause prioritization",
  },
  {
    slug: "community-organizers",
    name: "Community Organizer Cohort",
    audience: "hosts, moderators, and group leads",
    useCase: "invite serious counterparties and track cohort activation",
    primaryCause: "Community service",
  },
  {
    slug: "global-health",
    name: "Global Health Cohort",
    audience: "global-health donors and volunteers",
    useCase: "route offset examples to widely valued compromise destinations",
    primaryCause: "Global poverty",
  },
  {
    slug: "moral-uncertainty",
    name: "Moral Uncertainty Cohort",
    audience: "philosophically engaged researchers and writers",
    useCase: "publish and critique bounded worked examples",
    primaryCause: "Future flourishing",
  },
] as const;

export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number]["value"];
export type ParticipantKind = (typeof PARTICIPANT_KINDS)[number]["value"];
export type FirstAction = (typeof FIRST_ACTIONS)[number]["value"];

export function isFunnelEventType(value: string): value is FunnelEventType {
  return FUNNEL_EVENT_TYPES.includes(value as FunnelEventType);
}

export function isAnalyticsOptedOut(value: string | null | undefined) {
  return value === "1" || value === "true";
}

const FUNNEL_METADATA_ALLOWED_KEYS = new Set([
  "accessLevel",
  "audienceStage",
  "bothConsented",
  "candidateBucket",
  "causeAreaCount",
  "causeAreas",
  "decision",
  "exampleId",
  "fieldCount",
  "firstAction",
  "generatedBy",
  "hasMatch",
  "hasNote",
  "hasSession",
  "hasTargetUrl",
  "matchesCreated",
  "metricName",
  "metricRating",
  "metricValueBucket",
  "mode",
  "navigationType",
  "participantKind",
  "partnerSlug",
  "primaryGoal",
  "stage",
  "step",
  "targetKind",
  "taskCount",
  "template",
]);

const SENSITIVE_FUNNEL_METADATA_KEY_PATTERN =
  /(wish|ask|constraint|contact|email|phone|address|private|raw|message|note|source|evidence|receipt|counterparty|prompt|text)/i;
const SENSITIVE_FUNNEL_VALUE_PATTERN =
  /\b(exact\s+private\s+wish|private\s+wish|source\s+note|raw\s+note|contact\s+details|sensitive\s+constraint|private\s+feed|counterparty)\b/i;

function normalizeFunnelMetadataKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 48);
}

function cleanFunnelScalarText(value: unknown, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .slice(0, maxLength);
}

function cleanFunnelAttributionText(value: unknown, maxLength = 160) {
  const clean = cleanFunnelScalarText(value, maxLength);
  return SENSITIVE_FUNNEL_VALUE_PATTERN.test(clean) ? "" : clean;
}

function getTextLengthBucket(value: unknown) {
  const length = cleanFunnelScalarText(value, 10_000).length;

  if (length === 0) return "0";
  if (length < 20) return "1-19";
  if (length < 100) return "20-99";
  return "100+";
}

function safeMetadataValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return cleanFunnelScalarText(value);
  if (value === null) return null;

  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => cleanFunnelScalarText(entry, 80))
      .filter(Boolean)
      .slice(0, 8);

    return entries.length ? Array.from(new Set(entries)) : undefined;
  }

  return undefined;
}

function getSearchParamKeys(value: unknown) {
  const raw = cleanFunnelScalarText(value, 1_000).replace(/^\?/, "");

  if (!raw) {
    return [];
  }

  try {
    return Array.from(new Set(Array.from(new URLSearchParams(raw).keys()).map(normalizeFunnelMetadataKey)))
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function sanitizeFunnelEventPath(value: unknown, maxLength = 1_000) {
  const raw = cleanFunnelScalarText(value, maxLength);

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, "https://www.moraltrade.org");
    return url.pathname.slice(0, maxLength) || "/";
  } catch {
    const [path = ""] = raw.split(/[?#]/);
    return path.startsWith("/") ? path.slice(0, maxLength) : "";
  }
}

export function sanitizeFunnelEventReferrer(value: unknown, maxLength = 1_000) {
  const raw = cleanFunnelScalarText(value, maxLength);

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return `${url.origin}${url.pathname}`.slice(0, maxLength);
  } catch {
    return sanitizeFunnelEventPath(raw, maxLength);
  }
}

export function sanitizeFunnelEventMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const safeMetadata: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 24);

  for (const [rawKey, rawValue] of entries) {
    const key = normalizeFunnelMetadataKey(rawKey);

    if (!key) {
      continue;
    }

    if (key === "query") {
      safeMetadata.queryPresent = cleanFunnelScalarText(rawValue, 10_000).length > 0;
      safeMetadata.queryLengthBucket = getTextLengthBucket(rawValue);
      continue;
    }

    if (key === "search") {
      const searchParamKeys = getSearchParamKeys(rawValue);
      if (searchParamKeys.length) {
        safeMetadata.searchParamKeys = searchParamKeys;
      }
      continue;
    }

    if (key === "href" || key === "targetUrl" || key === "target_url") {
      const hrefPath = sanitizeFunnelEventPath(rawValue);
      if (hrefPath) {
        safeMetadata.hrefPath = hrefPath;
      }
      continue;
    }

    if (key === "label") {
      const label = cleanFunnelScalarText(rawValue, 120);
      if (label) {
        safeMetadata.label = label;
      }
      continue;
    }

    if (
      !FUNNEL_METADATA_ALLOWED_KEYS.has(key) ||
      SENSITIVE_FUNNEL_METADATA_KEY_PATTERN.test(key)
    ) {
      continue;
    }

    const safeValue = safeMetadataValue(rawValue);
    if (safeValue !== undefined) {
      safeMetadata[key] = safeValue;
    }
  }

  return safeMetadata;
}

export function buildPrivacySafeFunnelEventRecord({
  attribution,
  eventType,
  metadata = {},
  path,
  profileId,
  referrer,
}: {
  attribution?: Partial<AttributionPayload> | null;
  eventType: FunnelEventType;
  metadata?: unknown;
  path?: unknown;
  profileId?: string | null;
  referrer?: unknown;
}) {
  const requestReferrer = sanitizeFunnelEventReferrer(referrer);
  const attributionReferrer = sanitizeFunnelEventReferrer(attribution?.referrer);

  return {
    anonymous_id: cleanFunnelScalarText(attribution?.anonymousId, 160),
    event_type: eventType,
    metadata: sanitizeFunnelEventMetadata(metadata),
    partner_slug: cleanFunnelAttributionText(attribution?.partnerSlug, 160),
    path: sanitizeFunnelEventPath(path) || "/",
    profile_id: profileId ?? null,
    referral_code: cleanFunnelAttributionText(attribution?.referralCode, 160),
    referrer: requestReferrer || attributionReferrer,
    utm_campaign: cleanFunnelAttributionText(attribution?.utmCampaign, 160),
    utm_content: cleanFunnelAttributionText(attribution?.utmContent, 160),
    utm_medium: cleanFunnelAttributionText(attribution?.utmMedium, 160),
    utm_source: cleanFunnelAttributionText(attribution?.utmSource, 160),
    utm_term: cleanFunnelAttributionText(attribution?.utmTerm, 160),
  };
}

export function createAnonymousId() {
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function encodeAttribution(payload: AttributionPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseAttributionCookie(value: string | undefined): AttributionPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AttributionPayload>;
    const anonymousId = String(parsed.anonymousId ?? "").trim();

    if (!anonymousId) {
      return null;
    }

    return {
      anonymousId,
      firstPath: String(parsed.firstPath ?? ""),
      lastPath: String(parsed.lastPath ?? ""),
      referrer: String(parsed.referrer ?? ""),
      utmSource: String(parsed.utmSource ?? ""),
      utmMedium: String(parsed.utmMedium ?? ""),
      utmCampaign: String(parsed.utmCampaign ?? ""),
      utmContent: String(parsed.utmContent ?? ""),
      utmTerm: String(parsed.utmTerm ?? ""),
      referralCode: String(parsed.referralCode ?? ""),
      partnerSlug: String(parsed.partnerSlug ?? ""),
      firstSeenAt: String(parsed.firstSeenAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function getPartnerCohort(slug: string) {
  return PARTNER_COHORTS.find((partner) => partner.slug === slug) ?? null;
}

export function getFirstActionHref(action: FirstAction) {
  return FIRST_ACTIONS.find((entry) => entry.value === action)?.href ?? "/dashboard";
}

export function normalizeOnboardingGoal(value: string): OnboardingGoal {
  return ONBOARDING_GOALS.some((goal) => goal.value === value)
    ? (value as OnboardingGoal)
    : "find_counterparty";
}

export function normalizeParticipantKind(value: string): ParticipantKind {
  return PARTICIPANT_KINDS.some((kind) => kind.value === value)
    ? (value as ParticipantKind)
    : "individual";
}

export function normalizeFirstAction(value: string): FirstAction {
  return FIRST_ACTIONS.some((action) => action.value === value)
    ? (value as FirstAction)
    : "clone_example";
}
