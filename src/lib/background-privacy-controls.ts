export type BackgroundNotificationEventKind =
  | "match_suggestions"
  | "consent_decisions"
  | "introduction_updates"
  | "grant_activity"
  | "operator_review"
  | "safety_review";

export type BackgroundNotificationChannel = "in_app" | "email_digest" | "web_push";
export type BackgroundNotificationDigestCadence = "immediate" | "daily" | "weekly" | "none";

export type ProfileDataRightRequestType = "export" | "correction" | "deletion" | "restriction";
export type ProfileDataRightScope = "background_networking" | "profile" | "full_account";

export interface BackgroundNotificationPreferenceDraft {
  channel: BackgroundNotificationChannel;
  digestCadence: BackgroundNotificationDigestCadence;
  enabled: boolean;
  eventKind: BackgroundNotificationEventKind;
  profileId: string;
}

export interface ProfileDataRightValidationInput {
  requestDetails?: string;
  requestType?: string;
  scope?: string;
}

export interface ProfileDataRightValidationResult {
  errors: string[];
  requestDetails: string;
  requestType: ProfileDataRightRequestType;
  scope: ProfileDataRightScope;
}

export interface BackgroundSelfServeDeletionValidationInput {
  confirmation?: string;
}

export interface BackgroundSelfServeDeletionValidationResult {
  confirmation: string;
  errors: string[];
}

export const BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS: Array<{
  description: string;
  label: string;
  value: BackgroundNotificationEventKind;
}> = [
  {
    description: "New broad-preview suggestions and saved-search results.",
    label: "Match suggestions",
    value: "match_suggestions",
  },
  {
    description: "Opt-ins, denials, withdrawals, and disclosure decisions.",
    label: "Consent decisions",
    value: "consent_decisions",
  },
  {
    description: "Operator-reviewed intro plans and agreement-room handoff.",
    label: "Introduction updates",
    value: "introduction_updates",
  },
  {
    description: "Privacy grants, expiries, and revocations.",
    label: "Grant activity",
    value: "grant_activity",
  },
  {
    description: "Concierge requests, SLA movement, and operator asks.",
    label: "Operator review",
    value: "operator_review",
  },
  {
    description: "Reports, sparse-query protections, and risk-signal outcomes.",
    label: "Safety review",
    value: "safety_review",
  },
];

export const BACKGROUND_NOTIFICATION_CHANNEL_OPTIONS: Array<{
  label: string;
  value: BackgroundNotificationChannel;
}> = [
  { label: "In-app", value: "in_app" },
  { label: "Digest email", value: "email_digest" },
  { label: "Web push", value: "web_push" },
];

export const BACKGROUND_NOTIFICATION_DIGEST_CADENCE_OPTIONS: Array<{
  label: string;
  value: BackgroundNotificationDigestCadence;
}> = [
  { label: "Immediate", value: "immediate" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Off", value: "none" },
];

export const PROFILE_DATA_RIGHT_REQUEST_TYPE_OPTIONS: Array<{
  label: string;
  value: ProfileDataRightRequestType;
}> = [
  { label: "Export", value: "export" },
  { label: "Correction", value: "correction" },
  { label: "Deletion", value: "deletion" },
  { label: "Restriction", value: "restriction" },
];

export const PROFILE_DATA_RIGHT_SCOPE_OPTIONS: Array<{
  label: string;
  value: ProfileDataRightScope;
}> = [
  { label: "Background networking", value: "background_networking" },
  { label: "Profile", value: "profile" },
  { label: "Full account", value: "full_account" },
];

export const BACKGROUND_SENSITIVE_FIELD_KEYS = [
  "exact_wish",
  "exact_ask",
  "constraints",
  "contact_email",
  "source_summary",
  "verification_preferences",
] as const;

export const BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION = "DELETE BACKGROUND NETWORKING";

export const BACKGROUND_SELF_SERVE_DELETION_SURFACES = [
  "Private wish profile and wish entries",
  "Broad preview and discoverability surface",
  "Manual source summaries and connector permissions",
  "Saved searches, delegate strategy records, and helper runs",
  "Match suggestions, consent records, notifications, privacy grants, and access requests",
  "Introduction planning records, network invites, bounties, and collectives",
  "Queued background-networking emails",
  "Safety, budget, and operator audit rows retained only as redacted or anonymized records",
] as const;

export const BACKGROUND_DATA_INVENTORY = [
  {
    classification: "public-preview",
    control: "Disable discoverability or public preview sharing from the wish profile; remove through self-serve background deletion.",
    label: "Broad previews",
    processor: "Supabase Postgres",
    retention: "Until the profile is hidden, corrected, or deleted.",
    surface: "wish_profile_previews",
    use: "Searchable registry surface and broad match candidate scan.",
  },
  {
    classification: "private-profile",
    control: "Visible to the owner; exact detail moves only through grants; owner-confirmed self-serve deletion is available.",
    label: "Private wishes, asks, constraints, and capabilities",
    processor: "Supabase Postgres with RLS and app-level field encryption for new sensitive text.",
    retention: "Until correction, deletion, or account removal, subject to safety/legal holds.",
    surface: "wish_profiles and wish_entries",
    use: "Deterministic synthesis and owner-reviewed matching.",
  },
  {
    classification: "consent-ledger",
    control: "Purpose, audience stage, expiry, and revocation are recorded per grant; participant-facing grants are removed during self-serve deletion.",
    label: "Disclosure grants and access requests",
    processor: "Supabase Postgres",
    retention: "For the active introduction plus audit retention after expiry or revocation.",
    surface: "privacy_grants and privacy_access_requests",
    use: "Staged disclosure and mutual-consent review.",
  },
  {
    classification: "manual-source-summary",
    control: "Manual summaries only; source connectors require field permissions, retention expiry, and no raw ingestion; source rows are removed during self-serve deletion.",
    label: "Source notes and connection permissions",
    processor: "Supabase Postgres with app-level field encryption for notes and approved summaries.",
    retention: "Until source removal, deletion request, or safety/legal hold.",
    surface: "profile_sources and source_connections",
    use: "Optional deterministic context for owner-reviewed matching.",
  },
  {
    classification: "operations",
    control: "Buckets, counts, status labels, hashed fingerprints, SLA state, and appeal status only; safety audit rows are retained without an active profile link when deletion completes.",
    label: "Budgets, snapshots, reports, appeals, and operator queues",
    processor: "Supabase Postgres and configured email provider for safe digests.",
    retention: "Operational window plus abuse-prevention audit retention.",
    surface: "background_query_events, match_explanation_snapshots, risk_signals, match_concierge_requests",
    use: "Anti-enumeration, explanation provenance, safety review, SLA tracking, and concierge appeal review.",
  },
] as const;

export const PRIVATE_NO_STORE_ROUTE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/api/profile",
  "/api/jobs",
] as const;

const EVENT_KIND_VALUES = new Set(
  BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS.map((option) => option.value),
);
const CHANNEL_VALUES = new Set(BACKGROUND_NOTIFICATION_CHANNEL_OPTIONS.map((option) => option.value));
const CADENCE_VALUES = new Set(
  BACKGROUND_NOTIFICATION_DIGEST_CADENCE_OPTIONS.map((option) => option.value),
);
const REQUEST_TYPE_VALUES = new Set(PROFILE_DATA_RIGHT_REQUEST_TYPE_OPTIONS.map((option) => option.value));
const REQUEST_SCOPE_VALUES = new Set(PROFILE_DATA_RIGHT_SCOPE_OPTIONS.map((option) => option.value));

export function formatBackgroundNotificationEventKind(value: string) {
  return (
    BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function formatBackgroundNotificationChannel(value: string) {
  return (
    BACKGROUND_NOTIFICATION_CHANNEL_OPTIONS.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function isBackgroundSensitiveFieldKey(value: string) {
  return BACKGROUND_SENSITIVE_FIELD_KEYS.includes(
    value as (typeof BACKGROUND_SENSITIVE_FIELD_KEYS)[number],
  );
}

export function createDefaultBackgroundNotificationPreferences(profileId: string) {
  const rows: BackgroundNotificationPreferenceDraft[] = [];

  for (const eventKind of BACKGROUND_NOTIFICATION_EVENT_KIND_OPTIONS.map((option) => option.value)) {
    rows.push({
      channel: "in_app",
      digestCadence: "immediate",
      enabled: true,
      eventKind,
      profileId,
    });
    rows.push({
      channel: "email_digest",
      digestCadence: "daily",
      enabled: true,
      eventKind,
      profileId,
    });
    rows.push({
      channel: "web_push",
      digestCadence: "none",
      enabled: false,
      eventKind,
      profileId,
    });
  }

  return rows;
}

export function normalizeBackgroundNotificationPreferenceDraft({
  channel,
  digestCadence,
  enabled,
  eventKind,
  profileId,
}: BackgroundNotificationPreferenceDraft): BackgroundNotificationPreferenceDraft | null {
  if (!EVENT_KIND_VALUES.has(eventKind) || !CHANNEL_VALUES.has(channel)) {
    return null;
  }

  const normalizedCadence = CADENCE_VALUES.has(digestCadence) ? digestCadence : "daily";

  return {
    channel,
    digestCadence: channel === "web_push" && !enabled ? "none" : normalizedCadence,
    enabled,
    eventKind,
    profileId,
  };
}

export function buildBackgroundNotificationPreferenceRows({
  enabledKeys,
  profileId,
}: {
  enabledKeys: Set<string>;
  profileId: string;
}) {
  return createDefaultBackgroundNotificationPreferences(profileId).map((preference) => {
    const preferenceKey = getBackgroundNotificationPreferenceKey(
      preference.eventKind,
      preference.channel,
    );
    const enabled = enabledKeys.has(preferenceKey);

    return {
      ...preference,
      digestCadence:
        preference.channel === "web_push" && !enabled ? "none" : preference.digestCadence,
      enabled,
    };
  });
}

export function getBackgroundNotificationPreferenceKey(
  eventKind: BackgroundNotificationEventKind,
  channel: BackgroundNotificationChannel,
) {
  return `${eventKind}:${channel}`;
}

export function getBackgroundNotificationEventKindForWishNotification(
  kind: "match" | "consent" | "safety" | "system",
): BackgroundNotificationEventKind {
  if (kind === "match") {
    return "match_suggestions";
  }

  if (kind === "consent") {
    return "consent_decisions";
  }

  if (kind === "safety") {
    return "safety_review";
  }

  return "operator_review";
}

export function validateProfileDataRightRequest({
  requestDetails = "",
  requestType = "export",
  scope = "background_networking",
}: ProfileDataRightValidationInput): ProfileDataRightValidationResult {
  const normalizedType = REQUEST_TYPE_VALUES.has(requestType as ProfileDataRightRequestType)
    ? (requestType as ProfileDataRightRequestType)
    : "export";
  const normalizedScope = REQUEST_SCOPE_VALUES.has(scope as ProfileDataRightScope)
    ? (scope as ProfileDataRightScope)
    : "background_networking";
  const normalizedDetails = requestDetails.trim().slice(0, 2000);
  const errors: string[] = [];

  if (!REQUEST_TYPE_VALUES.has(requestType as ProfileDataRightRequestType)) {
    errors.push("Choose a supported data-right request type.");
  }

  if (!REQUEST_SCOPE_VALUES.has(scope as ProfileDataRightScope)) {
    errors.push("Choose a supported request scope.");
  }

  if (["correction", "deletion", "restriction"].includes(normalizedType) && normalizedDetails.length < 12) {
    errors.push("Add enough detail for an operator to identify the records or constraint.");
  }

  return {
    errors,
    requestDetails: normalizedDetails,
    requestType: normalizedType,
    scope: normalizedScope,
  };
}

export function validateBackgroundSelfServeDeletion({
  confirmation = "",
}: BackgroundSelfServeDeletionValidationInput): BackgroundSelfServeDeletionValidationResult {
  const normalizedConfirmation = confirmation.trim();
  const errors: string[] = [];

  if (normalizedConfirmation !== BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION) {
    errors.push(
      `Type ${BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION} to confirm background-networking deletion.`,
    );
  }

  return {
    confirmation: normalizedConfirmation,
    errors,
  };
}

export function getDataRightRequestDueAt(now = new Date()) {
  const dueAt = new Date(now.getTime());
  dueAt.setUTCDate(dueAt.getUTCDate() + 30);
  return dueAt.toISOString();
}

export function getPrivateNoStoreHeaders(pathname: string) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const isPrivateRoute = PRIVATE_NO_STORE_ROUTE_PREFIXES.some(
    (prefix) =>
      normalizedPathname === prefix ||
      normalizedPathname.startsWith(`${prefix}/`),
  );

  if (!isPrivateRoute) {
    return null;
  }

  return {
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  } as const;
}
