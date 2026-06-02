export const BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS = [
  {
    description: "Use only broad cause priorities and tags derived from the approved summary.",
    label: "Cause priorities",
    value: "cause_priorities",
  },
  {
    description: "Use broad capability tags such as skills, institutional access, or resources.",
    label: "Capability tags",
    value: "capability_tags",
  },
  {
    description: "Use broad offer or ask terms without copying exact private requests.",
    label: "Offer and ask terms",
    value: "offer_ask_terms",
  },
  {
    description: "Use coarse verification preferences and evidence expectations.",
    label: "Verification preferences",
    value: "verification_preferences",
  },
  {
    description: "Use coarse availability, location, or collaboration-context hints.",
    label: "Availability context",
    value: "availability_context",
  },
  {
    description: "Use coarse safety constraints and uncertainty flags for review only.",
    label: "Safety constraints",
    value: "safety_constraints",
  },
] as const;

export const BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS = [30, 90, 180, 365] as const;

export type BackgroundSourcePermissionField =
  (typeof BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS)[number]["value"];

export interface BackgroundSourcePermissionValidationInput {
  accessScope?: string;
  accessStatus?: string;
  aiShadowModeAllowed?: boolean;
  allowedFieldKeys?: string[];
  consentNotes?: string;
  now?: Date;
  provider?: string;
  rawIngestionAllowed?: boolean;
  retentionDays?: number | string;
}

export interface BackgroundSourcePermissionValidationResult {
  aiShadowModeAllowed: boolean;
  allowedFieldKeys: BackgroundSourcePermissionField[];
  errors: string[];
  rawIngestionAllowed: false;
  retentionDays: (typeof BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS)[number];
  retentionExpiresAt: string;
}

export interface BackgroundSourceSummaryFieldScopeConnection {
  access_status?: string | null;
  allowed_field_keys?: readonly string[] | null;
  retention_expires_at?: string | null;
}

export interface BackgroundSourceSummaryFieldScope {
  allowedFieldKeys: BackgroundSourcePermissionField[];
  errors: string[];
}

const SOURCE_PERMISSION_FIELD_VALUES = new Set(
  BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS.map((option) => option.value),
);
const SOURCE_RETENTION_DAY_VALUES = new Set<number>(BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS);

export function formatBackgroundSourcePermissionFieldLabel(value: string) {
  return (
    BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function normalizeBackgroundSourcePermissionFields(values: string[] = []) {
  return values
    .map((value) => value.trim())
    .filter((value): value is BackgroundSourcePermissionField =>
      SOURCE_PERMISSION_FIELD_VALUES.has(value as BackgroundSourcePermissionField),
    )
    .filter((value, index, entries) => entries.indexOf(value) === index);
}

export function getBackgroundSourcePermissionExpiry({
  now = new Date(),
  retentionDays,
}: {
  now?: Date;
  retentionDays: number;
}) {
  const expiresAt = new Date(now.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + retentionDays);
  return expiresAt.toISOString();
}

export function hasActiveBackgroundSourcePermission(
  connection: {
    access_status?: string | null;
    allowed_field_keys?: readonly string[] | null;
    retention_expires_at?: string | null;
  },
  now = new Date(),
) {
  if (connection.access_status !== "connected" && connection.access_status !== "needs_review") {
    return false;
  }

  if (!normalizeBackgroundSourcePermissionFields([...(connection.allowed_field_keys ?? [])]).length) {
    return false;
  }

  if (!connection.retention_expires_at) {
    return false;
  }

  const expiresAt = new Date(connection.retention_expires_at);

  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

export function resolveBackgroundSourceSummaryFieldScope({
  now = new Date(),
  requestedFieldKeys = [],
  sourceConnection = null,
}: {
  now?: Date;
  requestedFieldKeys?: string[];
  sourceConnection?: BackgroundSourceSummaryFieldScopeConnection | null;
}): BackgroundSourceSummaryFieldScope {
  const requestedFields = normalizeBackgroundSourcePermissionFields(requestedFieldKeys);

  if (!sourceConnection) {
    return {
      allowedFieldKeys: requestedFields,
      errors: [],
    };
  }

  const connectionFields = normalizeBackgroundSourcePermissionFields([
    ...(sourceConnection.allowed_field_keys ?? []),
  ]);
  const connectionFieldSet = new Set(connectionFields);
  const allowedFieldKeys = requestedFields.filter((fieldKey) => connectionFieldSet.has(fieldKey));
  const disallowedFields = requestedFields.filter((fieldKey) => !connectionFieldSet.has(fieldKey));
  const errors: string[] = [];

  if (!hasActiveBackgroundSourcePermission(sourceConnection, now)) {
    errors.push("Selected source connection is inactive, expired, revoked, or missing approved fields.");
  }

  if (disallowedFields.length) {
    errors.push(
      `Requested summary fields exceed the selected source connection permission: ${disallowedFields
        .map(formatBackgroundSourcePermissionFieldLabel)
        .join(", ")}.`,
    );
  }

  return {
    allowedFieldKeys,
    errors,
  };
}

export function validateBackgroundSourceSummaryRetentionScope({
  sourceConnection = null,
  summaryRetentionExpiresAt,
}: {
  sourceConnection?: BackgroundSourceSummaryFieldScopeConnection | null;
  summaryRetentionExpiresAt?: string | null;
}) {
  if (!sourceConnection?.retention_expires_at || !summaryRetentionExpiresAt) {
    return [];
  }

  const connectionExpiresAt = new Date(sourceConnection.retention_expires_at);
  const summaryExpiresAt = new Date(summaryRetentionExpiresAt);

  if (
    !Number.isFinite(connectionExpiresAt.getTime()) ||
    !Number.isFinite(summaryExpiresAt.getTime())
  ) {
    return ["Source-summary retention could not be validated against the selected source permission."];
  }

  if (summaryExpiresAt.getTime() > connectionExpiresAt.getTime()) {
    return [
      "Source-summary retention cannot outlive the selected source connection permission.",
    ];
  }

  return [];
}

export function validateBackgroundSourcePermission({
  accessScope = "",
  accessStatus = "not_connected",
  aiShadowModeAllowed = false,
  allowedFieldKeys = [],
  consentNotes = "",
  now = new Date(),
  provider = "manual",
  rawIngestionAllowed = false,
  retentionDays = 90,
}: BackgroundSourcePermissionValidationInput): BackgroundSourcePermissionValidationResult {
  const normalizedFields = normalizeBackgroundSourcePermissionFields(allowedFieldKeys);
  const parsedRetentionDays = retentionDays === "" ? 90 : Number(retentionDays);
  const normalizedRetentionDays = SOURCE_RETENTION_DAY_VALUES.has(parsedRetentionDays)
    ? (parsedRetentionDays as (typeof BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS)[number])
    : 90;
  const isActiveConnector = accessStatus === "connected" || accessStatus === "needs_review";
  const isExternalConnector = provider !== "manual";
  const errors: string[] = [];

  if (rawIngestionAllowed) {
    errors.push("Raw connector ingestion remains disabled for this background-networking pass.");
  }

  if (!SOURCE_RETENTION_DAY_VALUES.has(parsedRetentionDays)) {
    errors.push("Choose a supported connector retention window.");
  }

  if (isActiveConnector || aiShadowModeAllowed) {
    if (!normalizedFields.length) {
      errors.push("Choose at least one broad field this source may influence.");
    }
  }

  if (isActiveConnector && isExternalConnector) {
    if (accessScope.trim().length < 8) {
      errors.push("Describe the connector access scope before marking an external source active.");
    }

    if (consentNotes.trim().length < 12) {
      errors.push("Add consent notes for active external source connections.");
    }
  }

  if (aiShadowModeAllowed && (accessStatus === "revoked" || accessStatus === "expired")) {
    errors.push("AI shadow-mode evaluation cannot stay enabled for a revoked or expired source.");
  }

  return {
    aiShadowModeAllowed,
    allowedFieldKeys: normalizedFields,
    errors,
    rawIngestionAllowed: false,
    retentionDays: normalizedRetentionDays,
    retentionExpiresAt: getBackgroundSourcePermissionExpiry({
      now,
      retentionDays: normalizedRetentionDays,
    }),
  };
}
