import { createHash } from "node:crypto";

export const BACKGROUND_PROFILE_PACKAGE_SCHEMA_VERSION = "background-profile-package-v1";

export type BackgroundProfilePackageAudienceStage = "registry" | "consent" | "introduced";
export type BackgroundProfilePackageAccessLevel = "hidden" | "broad" | "specific" | "contact";
export type BackgroundProfilePackageSubjectKind = "participant" | "collective";

export interface BackgroundProfilePackageV1 {
  approvedSignals: {
    availabilityContext: string[];
    capabilityTags: string[];
    safetyConstraints: string[];
    verificationPreferences: string[];
  };
  approvedSourceSummaries: Array<{
    allowedFieldKeys: string[];
    retentionExpiresAt: string;
    sourceKind: string;
    summaryHash: string;
  }>;
  broadPreview: {
    causeAreas: string[];
    locationContext?: string[];
    summary: string;
    tradeModes: string[];
  };
  disclosurePolicy: {
    accessLevels: BackgroundProfilePackageAccessLevel[];
    audienceStages: BackgroundProfilePackageAudienceStage[];
  };
  exportedAt: string;
  provenance: {
    exportHash: string;
    sourceSummaryHashes: string[];
  };
  schemaVersion: typeof BACKGROUND_PROFILE_PACKAGE_SCHEMA_VERSION;
  subject: {
    id: string;
    kind: BackgroundProfilePackageSubjectKind;
  };
}

interface GenericRecord {
  [key: string]: unknown;
}

function cleanText(value: unknown, maxLength = 280) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanList(value: unknown, maxLength = 80) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((entry) => cleanText(entry, maxLength))
        .filter(Boolean),
    ),
  ];
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function isActiveApprovedSummary(row: GenericRecord, now: Date) {
  const status = cleanText(row.status);
  const expiresAt = cleanText(row.retention_expires_at);
  const approvedAt = cleanText(row.approved_at);
  const expiresAtTime = Date.parse(expiresAt);

  return (
    (status === "active" || status === "reviewed") &&
    Boolean(approvedAt || status === "active") &&
    Number.isFinite(expiresAtTime) &&
    expiresAtTime > now.getTime()
  );
}

export function buildBackgroundProfilePackage({
  backgroundProfileSignals = [],
  exportedAt = new Date().toISOString(),
  privacyGrants = [],
  sourceSummaries = [],
  subject,
  wishProfile = null,
}: {
  backgroundProfileSignals?: GenericRecord[];
  exportedAt?: string;
  privacyGrants?: GenericRecord[];
  sourceSummaries?: GenericRecord[];
  subject: { id: string; kind: BackgroundProfilePackageSubjectKind };
  wishProfile?: GenericRecord | null;
}): BackgroundProfilePackageV1 {
  const now = new Date(exportedAt);
  const tradeModes = [
    wishProfile?.openness_to_payment ? "payment_open" : "",
    wishProfile?.openness_to_pledges ? "pledge_open" : "",
  ].filter(Boolean);
  const sourceSummaryHashes = sourceSummaries
    .filter((row) => isActiveApprovedSummary(row, now))
    .map((row) =>
      sha256({
        allowedFieldKeys: cleanList(row.allowed_field_keys),
        retentionExpiresAt: cleanText(row.retention_expires_at),
        summaryText: cleanText(row.summary_text, 1_000),
        summaryVersion: row.summary_version ?? 1,
      }),
    );
  const signalsByField = new Map<string, string[]>();

  for (const signal of backgroundProfileSignals) {
    if (cleanText(signal.status) !== "active") {
      continue;
    }

    const field = cleanText(signal.allowed_field_key);
    const values = signalsByField.get(field) ?? [];
    values.push(cleanText(signal.signal_value, 80));
    signalsByField.set(field, values);
  }

  const disclosureStages = new Set<BackgroundProfilePackageAudienceStage>(["registry", "consent"]);
  const accessLevels = new Set<BackgroundProfilePackageAccessLevel>(["hidden", "broad"]);

  for (const grant of privacyGrants) {
    const stage = cleanText(grant.audience_stage);
    const level = cleanText(grant.access_level);

    if (stage === "introduced") {
      disclosureStages.add("introduced");
    }

    if (level === "specific" || level === "contact") {
      accessLevels.add(level);
    }
  }

  const packageWithoutHash: Omit<BackgroundProfilePackageV1, "provenance"> = {
    approvedSignals: {
      availabilityContext: cleanList(signalsByField.get("availability_context") ?? []),
      capabilityTags: cleanList(signalsByField.get("capability_tags") ?? []),
      safetyConstraints: cleanList(signalsByField.get("safety_constraints") ?? []),
      verificationPreferences: cleanList(
        signalsByField.get("verification_preferences") ?? [],
      ),
    },
    approvedSourceSummaries: sourceSummaries
      .filter((row) => isActiveApprovedSummary(row, now))
      .map((row, index) => ({
        allowedFieldKeys: cleanList(row.allowed_field_keys),
        retentionExpiresAt: cleanText(row.retention_expires_at),
        sourceKind: cleanText(row.source_type) || "manual",
        summaryHash: sourceSummaryHashes[index] ?? sha256(row.id ?? index),
      })),
    broadPreview: {
      causeAreas: cleanList(wishProfile?.causes),
      locationContext:
        wishProfile?.share_location === true
          ? cleanList([wishProfile?.location_region, wishProfile?.location_city])
          : [],
      summary: cleanText(wishProfile?.public_preview, 700),
      tradeModes,
    },
    disclosurePolicy: {
      accessLevels: [...accessLevels],
      audienceStages: [...disclosureStages],
    },
    exportedAt,
    schemaVersion: BACKGROUND_PROFILE_PACKAGE_SCHEMA_VERSION,
    subject,
  };

  return {
    ...packageWithoutHash,
    provenance: {
      exportHash: sha256(packageWithoutHash),
      sourceSummaryHashes,
    },
  };
}

export function isBackgroundProfilePackageV1(value: unknown): value is BackgroundProfilePackageV1 {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { schemaVersion?: unknown }).schemaVersion ===
      BACKGROUND_PROFILE_PACKAGE_SCHEMA_VERSION
  );
}

export function buildWishProfileImportFromBackgroundPackage(
  packageV1: BackgroundProfilePackageV1,
) {
  return {
    background_search_enabled: true,
    causes: packageV1.broadPreview.causeAreas,
    is_discoverable: Boolean(packageV1.broadPreview.summary),
    openness_to_payment: packageV1.broadPreview.tradeModes.includes("payment_open"),
    openness_to_pledges: packageV1.broadPreview.tradeModes.includes("pledge_open"),
    participant_kind: packageV1.subject.kind === "collective" ? "collective" : "individual",
    privacy_stage: "broad",
    public_preview: packageV1.broadPreview.summary,
    share_public_preview: Boolean(packageV1.broadPreview.summary),
  };
}
