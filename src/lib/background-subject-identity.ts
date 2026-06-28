import { createHash } from "node:crypto";

import {
  BACKGROUND_PURPOSE_CODES,
  type BackgroundPurposeCode,
} from "@/lib/background-purpose-registry";
import type { Database } from "@/lib/supabase/database.types";

export const BACKGROUND_SUBJECT_IDENTITY_RESPONSE_SCHEMA_VERSION =
  "background-subject-identity-response-v1";
export const BACKGROUND_SUBJECT_IDENTITY_RECORD_VERSION =
  "background-subject-identity-v1";

export const BACKGROUND_SUBJECT_KINDS = [
  "individual",
  "organisation",
  "collective",
  "automated_agent",
  "service_account",
  "partner_operator",
] as const;

export const BACKGROUND_REPRESENTATIVE_AUTHORITY_STATES = [
  "not_required",
  "pending",
  "confirmed",
  "disputed",
  "expired",
  "revoked",
] as const;

export const BACKGROUND_AUTOMATION_DISCLOSURE_STATES = [
  "not_automated",
  "disclosed_broadly",
  "pending_review",
  "blocked",
] as const;

export const BACKGROUND_SUBJECT_IDENTITY_SCOPE_KEYS = [
  "purposeCodes",
  "surfaces",
  "cohorts",
  "partnerLanes",
  "audienceScopes",
  "exposureSettings",
] as const;

type SubjectIdentityInsert =
  Database["public"]["Tables"]["background_subject_identity_profiles"]["Insert"];
type SubjectIdentityRow =
  Database["public"]["Tables"]["background_subject_identity_profiles"]["Row"];

export type BackgroundSubjectKind = (typeof BACKGROUND_SUBJECT_KINDS)[number];
export type BackgroundRepresentativeAuthorityState =
  (typeof BACKGROUND_REPRESENTATIVE_AUTHORITY_STATES)[number];
export type BackgroundAutomationDisclosureState =
  (typeof BACKGROUND_AUTOMATION_DISCLOSURE_STATES)[number];
export type BackgroundSubjectIdentityScopeKey =
  (typeof BACKGROUND_SUBJECT_IDENTITY_SCOPE_KEYS)[number];

export interface BackgroundSubjectIdentityAuthorityScope extends Record<string, unknown> {
  audienceScopes: string[];
  cohorts: string[];
  exposureSettings: string[];
  partnerLanes: string[];
  purposeCodes: BackgroundPurposeCode[];
  surfaces: string[];
}

export interface BuildBackgroundSubjectIdentityInput {
  authorityExpiresAt?: string | null;
  automationDisclosureState?: string | null;
  humanAccountableOwnerId?: string | null;
  participantId: string;
  representativeAuthorityScope?: unknown;
  representativeAuthorityState?: string | null;
  sanitizedSubjectLabel?: string | null;
  subjectKind?: string | null;
}

export interface BackgroundSubjectIdentityBuildResult {
  errors: string[];
  row: SubjectIdentityInsert | null;
  scope: BackgroundSubjectIdentityAuthorityScope | null;
}

export interface BackgroundSubjectIdentityGateInput {
  now?: Date;
  purposeCode?: string | null;
  row: Pick<
    SubjectIdentityRow,
    | "authority_expires_at"
    | "automation_disclosure_state"
    | "human_accountable_owner_id"
    | "representative_authority_scope"
    | "representative_authority_state"
    | "sanitized_subject_label"
    | "subject_identity_version"
    | "subject_kind"
  >;
  surface?: string | null;
}

export interface BackgroundSubjectIdentityGateResult {
  allowed: boolean;
  blockerCodes: string[];
  sanitizedSubjectLabel: string;
  subjectIdentityVersion: string;
  subjectKind: BackgroundSubjectKind;
}

const SUBJECT_KIND_SET = new Set<string>(BACKGROUND_SUBJECT_KINDS);
const AUTHORITY_STATE_SET = new Set<string>(BACKGROUND_REPRESENTATIVE_AUTHORITY_STATES);
const AUTOMATION_STATE_SET = new Set<string>(BACKGROUND_AUTOMATION_DISCLOSURE_STATES);
const PURPOSE_CODE_SET = new Set<string>(BACKGROUND_PURPOSE_CODES);
const RAW_SCOPE_KEY_SET = new Set<string>([
  ...BACKGROUND_SUBJECT_IDENTITY_SCOPE_KEYS,
  "audience_scopes",
  "exposure_settings",
  "partner_lanes",
  "purpose_codes",
]);

const BROAD_SUBJECT_LABELS: Record<BackgroundSubjectKind, string> = {
  automated_agent: "automated helper",
  collective: "collective",
  individual: "individual",
  organisation: "organisation",
  partner_operator: "partner/operator seat",
  service_account: "service account",
} as const;

const EXACT_IDENTIFIER_PATTERN =
  /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|https?:\/\/|www\.|@[A-Za-z0-9_]{2,}|(?:\+?\d[\d\s().-]{7,}\d)|[A-Z]{2,}-\d{3,})/i;
const SAFE_SCOPE_TOKEN_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeSubjectKind(value: unknown): BackgroundSubjectKind | null {
  const normalized = normalizeString(value);
  return SUBJECT_KIND_SET.has(normalized) ? (normalized as BackgroundSubjectKind) : null;
}

function normalizeAuthorityState(
  value: unknown,
  subjectKind: BackgroundSubjectKind,
): BackgroundRepresentativeAuthorityState | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return subjectKind === "individual" ? "not_required" : "pending";
  }

  return AUTHORITY_STATE_SET.has(normalized)
    ? (normalized as BackgroundRepresentativeAuthorityState)
    : null;
}

function normalizeAutomationState(
  value: unknown,
  subjectKind: BackgroundSubjectKind,
): BackgroundAutomationDisclosureState | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return subjectKind === "automated_agent" || subjectKind === "service_account"
      ? "pending_review"
      : "not_automated";
  }

  return AUTOMATION_STATE_SET.has(normalized)
    ? (normalized as BackgroundAutomationDisclosureState)
    : null;
}

function hasExactIdentifier(value: string) {
  return EXACT_IDENTIFIER_PATTERN.test(value);
}

function normalizeScopeTokenList(value: unknown, errors: string[], key: string) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push(`${key} must be an array of broad tokens.`);
    return [];
  }

  const tokens = [...new Set(
    value
      .map((entry) => normalizeString(entry).toLowerCase())
      .filter(Boolean),
  )].slice(0, 24);

  for (const token of tokens) {
    if (!SAFE_SCOPE_TOKEN_PATTERN.test(token) || hasExactIdentifier(token)) {
      errors.push(`${key} contains a non-broad or exact-looking token.`);
      break;
    }
  }

  return tokens.filter((token) => SAFE_SCOPE_TOKEN_PATTERN.test(token) && !hasExactIdentifier(token));
}

export function getSanitizedBackgroundSubjectLabel(
  subjectKind: BackgroundSubjectKind,
): SubjectIdentityInsert["sanitized_subject_label"] {
  return BROAD_SUBJECT_LABELS[subjectKind] as SubjectIdentityInsert["sanitized_subject_label"];
}

export function isBackgroundNonIndividualSubject(subjectKind: BackgroundSubjectKind) {
  return subjectKind !== "individual";
}

export function normalizeBackgroundSubjectIdentityAuthorityScope(
  value: unknown,
): { errors: string[]; scope: BackgroundSubjectIdentityAuthorityScope } {
  const errors: string[] = [];
  const record = isRecord(value) ? value : {};

  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      if (!RAW_SCOPE_KEY_SET.has(key)) {
        errors.push(`Authority scope key ${key} is not allowed.`);
      }
    }
  } else if (value != null) {
    errors.push("Authority scope must be an object with broad allowlisted keys.");
  }

  const purposeCodes = normalizeScopeTokenList(
    record.purposeCodes ?? record.purpose_codes,
    errors,
    "purposeCodes",
  ).filter((purposeCode): purposeCode is BackgroundPurposeCode =>
    PURPOSE_CODE_SET.has(purposeCode),
  );
  const requestedPurposeCodes = normalizeScopeTokenList(
    record.purposeCodes ?? record.purpose_codes,
    [],
    "purposeCodes",
  );

  if (requestedPurposeCodes.length !== purposeCodes.length) {
    errors.push("Authority scope includes an unsupported purpose code.");
  }

  return {
    errors,
    scope: {
      audienceScopes: normalizeScopeTokenList(
        record.audienceScopes ?? record.audience_scopes,
        errors,
        "audienceScopes",
      ),
      cohorts: normalizeScopeTokenList(record.cohorts, errors, "cohorts"),
      exposureSettings: normalizeScopeTokenList(
        record.exposureSettings ?? record.exposure_settings,
        errors,
        "exposureSettings",
      ),
      partnerLanes: normalizeScopeTokenList(
        record.partnerLanes ?? record.partner_lanes,
        errors,
        "partnerLanes",
      ),
      purposeCodes,
      surfaces: normalizeScopeTokenList(record.surfaces, errors, "surfaces"),
    },
  };
}

function buildSubjectIdentityVersion(input: {
  authorityExpiresAt: string | null;
  automationDisclosureState: BackgroundAutomationDisclosureState;
  humanAccountableOwnerId: string | null;
  representativeAuthorityScope: BackgroundSubjectIdentityAuthorityScope;
  representativeAuthorityState: BackgroundRepresentativeAuthorityState;
  sanitizedSubjectLabel: string;
  subjectKind: BackgroundSubjectKind;
}) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        recordVersion: BACKGROUND_SUBJECT_IDENTITY_RECORD_VERSION,
      }),
    )
    .digest("hex")
    .slice(0, 24);

  return `${BACKGROUND_SUBJECT_IDENTITY_RECORD_VERSION}:${hash}`;
}

export function buildBackgroundSubjectIdentityProfileRow({
  authorityExpiresAt,
  automationDisclosureState: rawAutomationState,
  humanAccountableOwnerId,
  participantId,
  representativeAuthorityScope,
  representativeAuthorityState: rawAuthorityState,
  sanitizedSubjectLabel,
  subjectKind: rawSubjectKind,
}: BuildBackgroundSubjectIdentityInput): BackgroundSubjectIdentityBuildResult {
  const errors: string[] = [];
  const subjectKind = normalizeSubjectKind(rawSubjectKind);

  if (!isUuid(participantId)) {
    errors.push("Authenticated participant id is invalid.");
  }

  if (!subjectKind) {
    errors.push("Choose a supported subject kind.");
    return { errors, row: null, scope: null };
  }

  const derivedLabel = getSanitizedBackgroundSubjectLabel(subjectKind);
  const providedLabel = normalizeString(sanitizedSubjectLabel);

  if (providedLabel && providedLabel !== derivedLabel) {
    errors.push("Subject labels are derived broad labels and cannot name exact identities.");
  }

  if (providedLabel && hasExactIdentifier(providedLabel)) {
    errors.push("Subject label must not contain contact details or account identifiers.");
  }

  const representativeAuthorityState = normalizeAuthorityState(rawAuthorityState, subjectKind);
  const automationDisclosureState = normalizeAutomationState(rawAutomationState, subjectKind);

  if (!representativeAuthorityState) {
    errors.push("Choose a supported representative authority state.");
  }

  if (!automationDisclosureState) {
    errors.push("Choose a supported automation disclosure state.");
  }

  if (
    subjectKind === "individual" &&
    (representativeAuthorityState !== "not_required" ||
      automationDisclosureState !== "not_automated" ||
      humanAccountableOwnerId)
  ) {
    errors.push("Automated, organisational, collective, service, and partner subjects cannot be presented as ordinary individuals.");
  }

  if (
    (subjectKind === "automated_agent" || subjectKind === "service_account") &&
    automationDisclosureState !== "disclosed_broadly"
  ) {
    errors.push("Automated agents and service accounts require broad automation disclosure before surfacing.");
  }

  if (
    subjectKind === "organisation" &&
    automationDisclosureState !== "not_automated" &&
    automationDisclosureState !== "disclosed_broadly"
  ) {
    errors.push("Organisational automation status must be either not automated or broadly disclosed.");
  }

  const normalizedHumanOwnerId = normalizeString(humanAccountableOwnerId) || null;

  if (normalizedHumanOwnerId && !isUuid(normalizedHumanOwnerId)) {
    errors.push("Human accountable owner id must be a UUID.");
  }

  const { errors: scopeErrors, scope } =
    normalizeBackgroundSubjectIdentityAuthorityScope(representativeAuthorityScope);
  errors.push(...scopeErrors);

  const normalizedAuthorityExpiresAt = normalizeString(authorityExpiresAt) || null;
  const authorityExpiryDate = normalizedAuthorityExpiresAt
    ? new Date(normalizedAuthorityExpiresAt)
    : null;

  if (normalizedAuthorityExpiresAt && Number.isNaN(authorityExpiryDate?.getTime())) {
    errors.push("Authority expiry must be a valid timestamp.");
  }

  if (subjectKind !== "individual") {
    if (!normalizedHumanOwnerId) {
      errors.push("Non-individual and automated subjects require a human accountable owner.");
    }

    if (!normalizedAuthorityExpiresAt) {
      errors.push("Non-individual and automated subjects require an authority expiry.");
    }

    if (representativeAuthorityState === "not_required") {
      errors.push("Non-individual and automated subjects require representative authority state.");
    }

    if (scope.purposeCodes.length === 0 || scope.surfaces.length === 0) {
      errors.push("Non-individual and automated subjects require purpose and surface scope.");
    }
  } else if (
    scope.purposeCodes.length > 0 ||
    scope.surfaces.length > 0 ||
    scope.cohorts.length > 0 ||
    scope.partnerLanes.length > 0 ||
    scope.audienceScopes.length > 0 ||
    scope.exposureSettings.length > 0
  ) {
    errors.push("Individual subject identity records cannot carry representative authority scope.");
  }

  if (errors.length || !representativeAuthorityState || !automationDisclosureState) {
    return { errors: [...new Set(errors)], row: null, scope };
  }

  const subjectIdentityVersion = buildSubjectIdentityVersion({
    authorityExpiresAt: normalizedAuthorityExpiresAt,
    automationDisclosureState,
    humanAccountableOwnerId: subjectKind === "individual" ? null : normalizedHumanOwnerId,
    representativeAuthorityScope: scope,
    representativeAuthorityState,
    sanitizedSubjectLabel: derivedLabel,
    subjectKind,
  });

  return {
    errors: [],
    row: {
      authority_expires_at: normalizedAuthorityExpiresAt,
      automation_disclosure_state: automationDisclosureState,
      human_accountable_owner_id:
        subjectKind === "individual" ? null : normalizedHumanOwnerId,
      participant_id: participantId,
      representative_authority_scope: scope,
      representative_authority_state: representativeAuthorityState,
      sanitized_subject_label: derivedLabel,
      subject_identity_version: subjectIdentityVersion,
      subject_kind: subjectKind,
    },
    scope,
  };
}

function hasScopeToken(scope: unknown, key: BackgroundSubjectIdentityScopeKey, value: string) {
  if (!isRecord(scope)) {
    return false;
  }

  const entries = Array.isArray(scope[key]) ? scope[key] : [];
  return entries.includes(value);
}

export function evaluateBackgroundSubjectIdentityGate({
  now = new Date(),
  purposeCode,
  row,
  surface,
}: BackgroundSubjectIdentityGateInput): BackgroundSubjectIdentityGateResult {
  const blockerCodes: string[] = [];
  const subjectKind = normalizeSubjectKind(row.subject_kind) ?? "individual";
  const sanitizedSubjectLabel = getSanitizedBackgroundSubjectLabel(subjectKind);

  if (row.sanitized_subject_label !== sanitizedSubjectLabel) {
    blockerCodes.push("subject_label_not_sanitized");
  }

  if (subjectKind === "individual") {
    if (
      row.representative_authority_state !== "not_required" ||
      row.automation_disclosure_state !== "not_automated" ||
      row.human_accountable_owner_id
    ) {
      blockerCodes.push("individual_masquerade_conflict");
    }
  } else {
    if (!row.human_accountable_owner_id) {
      blockerCodes.push("human_accountable_owner_missing");
    }

    if (row.representative_authority_state !== "confirmed") {
      blockerCodes.push("representative_authority_not_confirmed");
    }

    if (!row.authority_expires_at) {
      blockerCodes.push("representative_authority_expiry_missing");
    } else if (new Date(row.authority_expires_at).getTime() <= now.getTime()) {
      blockerCodes.push("representative_authority_expired");
    }

    if (
      (subjectKind === "automated_agent" || subjectKind === "service_account") &&
      row.automation_disclosure_state !== "disclosed_broadly"
    ) {
      blockerCodes.push("automation_disclosure_not_broad");
    }

    if (purposeCode && !hasScopeToken(row.representative_authority_scope, "purposeCodes", purposeCode)) {
      blockerCodes.push("subject_identity_purpose_out_of_scope");
    }

    if (surface && !hasScopeToken(row.representative_authority_scope, "surfaces", surface)) {
      blockerCodes.push("subject_identity_surface_out_of_scope");
    }
  }

  return {
    allowed: blockerCodes.length === 0,
    blockerCodes,
    sanitizedSubjectLabel,
    subjectIdentityVersion: row.subject_identity_version,
    subjectKind,
  };
}

export function bucketBackgroundSubjectIdentityInvalidationCount(count: number | null) {
  if (count == null || !Number.isFinite(count)) {
    return "unknown";
  }

  if (count <= 0) {
    return "none";
  }

  if (count === 1) {
    return "1";
  }

  if (count <= 3) {
    return "2_to_3";
  }

  return "4_plus";
}
