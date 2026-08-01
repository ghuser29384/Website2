import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ONE_PERSON_ACCOUNT_POLICY_VERSION =
  "one-natural-person-one-canonical-account-v1-2026-07-31";
export const ONE_PERSON_ACCOUNT_HOOK_NAME = "one_person_before_user_created_hook";
export const ONE_PERSON_ACCOUNT_SESSION_COOKIE = "mt_identity_session";
export const ONE_PERSON_ACCOUNT_REGISTRATION_GRANT_COOKIE = "mt_registration_grant";

export const ONE_PERSON_CAPABILITIES = [
  "browse",
  "private_draft",
  "profile_edit",
  "data_export",
  "identity_recovery",
  "safety_exit",
  "credential_management",
  "participate",
  "publish",
  "message",
  "match",
  "agreement",
  "vote",
  "contribute",
  "financial",
  "payout",
  "receive_funds",
  "organization_control",
  "independent_verification",
  "collective_high_risk",
] as const;

export type OnePersonCapability = (typeof ONE_PERSON_CAPABILITIES)[number];

export const ONE_PERSON_AGE_CLASSES = [
  "unknown",
  "adult",
  "minor_13_17",
  "under_13",
] as const;

export type OnePersonAgeClass = (typeof ONE_PERSON_AGE_CLASSES)[number];

export type OnePersonProviderMode =
  | "disabled"
  | "manual_review"
  | "signed_webhook"
  | "qa_mock";

export type OnePersonVerificationPurpose =
  | "registration"
  | "verify_existing"
  | "recovery";

export type OnePersonVerificationStatus =
  | "legacy_unverified"
  | "pending"
  | "verified"
  | "stale"
  | "revoked"
  | "rejected";

export type OnePersonAccountStatus =
  | "active"
  | "limited"
  | "recovery_cooldown"
  | "duplicate_review"
  | "closed"
  | "banned";

export interface OnePersonAccountConfig {
  registrationEnforcementEnabled: boolean;
  participationEnforcementEnabled: boolean;
  manualIdentityLinkingEnabled: boolean;
  providerMode: OnePersonProviderMode;
  providerName: string;
  providerWebhookSecret: string;
  dedupeKey: string;
  dedupeTokenVersion: number;
  verificationUrlTemplate: string;
  sessionTtlMinutes: number;
  registrationGrantTtlMinutes: number;
  webhookToleranceSeconds: number;
  qaSecret: string;
}

export interface OnePersonConfigurationReadiness {
  ready: boolean;
  blockers: string[];
}

export interface OnePersonCapabilityDecision {
  allowed: boolean;
  action: OnePersonCapability;
  reasonCode: string;
  message: string;
  cooldownUntil: string | null;
}

export interface OnePersonAccountSnapshot {
  available: boolean;
  profileId: string;
  accountKind: "human" | "service" | "synthetic";
  accountStatus: OnePersonAccountStatus;
  verificationStatus: OnePersonVerificationStatus;
  ageClass: OnePersonAgeClass;
  guardianConsentStatus: "not_required" | "pending" | "active" | "revoked" | "expired";
  ordinaryCooldownUntil: string | null;
  highRiskCooldownUntil: string | null;
  credentialExpiresAt: string | null;
  providerName: string | null;
  registrationEnforcementEnabled: boolean;
  participationEnforcementEnabled: boolean;
  providerMode: OnePersonProviderMode;
  providerReady: boolean;
}

export interface OnePersonCapabilityInput {
  action: OnePersonCapability;
  account: OnePersonAccountSnapshot | null;
  guardianConsentActive?: boolean;
  enforcementEnabled?: boolean;
}

export interface OnePersonVerificationSessionStatus {
  available: boolean;
  sessionId: string | null;
  purpose: OnePersonVerificationPurpose | null;
  state:
    | "unavailable"
    | "created"
    | "provider_pending"
    | "needs_review"
    | "guardian_required"
    | "verified"
    | "duplicate_recovery"
    | "rejected"
    | "expired"
    | "consumed";
  providerMode: OnePersonProviderMode;
  providerName: string;
  expiresAt: string | null;
  returnTo: string;
  preAccount: boolean;
  guardianConsentRequired: boolean;
  registrationReady: boolean;
  grantId: string | null;
  recoveryRequired: boolean;
}

export interface OnePersonProviderResultPayload {
  eventId: string;
  sessionId: string;
  providerSessionReference: string;
  result: "verified" | "rejected" | "needs_review";
  assuranceTier: "document_liveness" | "manual_equivalent";
  ageClass: OnePersonAgeClass;
  dedupeReferences: Array<{
    namespace:
      | "provider_subject"
      | "government_document"
      | "biometric_duplicate_cluster"
      | "manual_equivalent";
    reference: string;
  }>;
  verifiedAt: string;
  expiresAt?: string | null;
  duplicateCheckResult: "clear" | "potential_duplicate" | "confirmed_duplicate";
  rawDataDeletionDueAt?: string | null;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;
const SIGNATURE_HEADER = /^sha256=([a-f0-9]{64})$/;

function envBoolean(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function envText(name: string) {
  return process.env[name]?.trim() ?? "";
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export function normalizeOnePersonProviderMode(value: string | null | undefined): OnePersonProviderMode {
  if (
    value === "manual_review" ||
    value === "signed_webhook" ||
    value === "qa_mock"
  ) {
    return value;
  }

  return "disabled";
}

export function getOnePersonAccountConfig(): OnePersonAccountConfig {
  const providerMode = normalizeOnePersonProviderMode(
    process.env.ONE_PERSON_ACCOUNT_PROVIDER_MODE,
  );
  const isProduction = process.env.VERCEL_ENV === "production";

  return {
    registrationEnforcementEnabled: envBoolean(
      "ONE_PERSON_ACCOUNT_REGISTRATION_ENFORCEMENT_ENABLED",
    ),
    participationEnforcementEnabled: envBoolean(
      "ONE_PERSON_ACCOUNT_PARTICIPATION_ENFORCEMENT_ENABLED",
    ),
    manualIdentityLinkingEnabled: envBoolean(
      "ONE_PERSON_ACCOUNT_MANUAL_LINKING_ENABLED",
    ),
    providerMode: isProduction && providerMode === "qa_mock" ? "disabled" : providerMode,
    providerName: envText("ONE_PERSON_ACCOUNT_PROVIDER_NAME") || "Identity review provider",
    providerWebhookSecret: envText("ONE_PERSON_ACCOUNT_PROVIDER_WEBHOOK_SECRET"),
    dedupeKey: envText("ONE_PERSON_ACCOUNT_DEDUPE_KEY"),
    dedupeTokenVersion: boundedInteger(
      process.env.ONE_PERSON_ACCOUNT_DEDUPE_TOKEN_VERSION,
      1,
      1,
      1000,
    ),
    verificationUrlTemplate: envText("ONE_PERSON_ACCOUNT_VERIFICATION_URL_TEMPLATE"),
    sessionTtlMinutes: boundedInteger(
      process.env.ONE_PERSON_ACCOUNT_SESSION_TTL_MINUTES,
      45,
      10,
      180,
    ),
    registrationGrantTtlMinutes: boundedInteger(
      process.env.ONE_PERSON_ACCOUNT_REGISTRATION_GRANT_TTL_MINUTES,
      20,
      5,
      60,
    ),
    webhookToleranceSeconds: boundedInteger(
      process.env.ONE_PERSON_ACCOUNT_WEBHOOK_TOLERANCE_SECONDS,
      300,
      30,
      900,
    ),
    qaSecret: envText("ONE_PERSON_ACCOUNT_QA_SECRET"),
  };
}

export function isOnePersonRegistrationEnforced() {
  return getOnePersonAccountConfig().registrationEnforcementEnabled;
}

export function isOnePersonParticipationEnforced() {
  return getOnePersonAccountConfig().participationEnforcementEnabled;
}

export function evaluateOnePersonConfiguration(
  config: OnePersonAccountConfig = getOnePersonAccountConfig(),
): OnePersonConfigurationReadiness {
  const blockers: string[] = [];

  if (config.providerMode === "disabled") {
    blockers.push("Identity verification provider mode is disabled.");
  }

  if (config.providerMode === "signed_webhook") {
    if (config.providerWebhookSecret.length < 32) {
      blockers.push("Identity-provider webhook secret must contain at least 32 characters.");
    }
    if (config.dedupeKey.length < 32) {
      blockers.push("Identity deduplication key must contain at least 32 characters.");
    }
    if (!config.verificationUrlTemplate.includes("{session_id}")) {
      blockers.push("Verification URL template must include {session_id}.");
    }
  }

  if (config.providerMode === "manual_review" && config.dedupeKey.length < 32) {
    blockers.push("Identity deduplication key must contain at least 32 characters.");
  }

  if (config.manualIdentityLinkingEnabled && config.dedupeKey.length < 32) {
    blockers.push("Manual identity linking requires the identity deduplication key.");
  }

  if (config.providerMode === "qa_mock") {
    if (process.env.VERCEL_ENV === "production") {
      blockers.push("QA identity mode is prohibited in production.");
    }
    if (config.qaSecret.length < 32) {
      blockers.push("QA identity secret must contain at least 32 characters.");
    }
    if (config.dedupeKey.length < 32) {
      blockers.push("Identity deduplication key must contain at least 32 characters.");
    }
  }

  if (
    (config.registrationEnforcementEnabled || config.participationEnforcementEnabled) &&
    config.providerMode === "disabled"
  ) {
    blockers.push("Identity enforcement cannot be enabled while provider mode is disabled.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

export function normalizeIdentityEmail(value: string) {
  return value.trim().toLowerCase();
}

export function hashOpaqueValue(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hmacOpaqueValue(value: string, key: string) {
  if (key.length < 32) {
    throw new Error("Identity deduplication key is not configured.");
  }

  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

export function buildRegistrationEmailBinding(email: string, rawGrantToken: string) {
  return hmacOpaqueValue(normalizeIdentityEmail(email), rawGrantToken);
}

function normalizeOpaqueProviderScope(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_ .:-]{0,159}$/.test(normalized)) {
    throw new Error("Identity provider scope is invalid.");
  }
  return normalized;
}

export function buildProviderDedupeTokens(
  payload: Pick<OnePersonProviderResultPayload, "dedupeReferences">,
  key: string,
  providerScope: string,
) {
  const provider = normalizeOpaqueProviderScope(providerScope);
  const tokens = payload.dedupeReferences.map(({ namespace, reference }) => ({
    namespace,
    token: hmacOpaqueValue(
      `${namespace}\u001f${provider}\u001f${reference.trim()}`,
      key,
    ),
  }));

  const unique = new Map(tokens.map((entry) => [`${entry.namespace}:${entry.token}`, entry]));
  return [...unique.values()];
}

export function buildAuthIdentityHmac(
  provider: string,
  identityId: string,
  key: string,
) {
  const normalizedProvider = normalizeOpaqueProviderScope(provider).replaceAll(" ", "_");
  const normalizedIdentityId = identityId.trim();
  if (normalizedIdentityId.length < 6 || normalizedIdentityId.length > 500) {
    throw new Error("Authentication identity identifier is invalid.");
  }
  return hmacOpaqueValue(
    `auth_identity\u001f${normalizedProvider}\u001f${normalizedIdentityId}`,
    key,
  );
}

export function buildIdentityVerificationUrl({
  providerSessionReference,
  returnUrl,
  sessionId,
  template,
}: {
  providerSessionReference?: string;
  returnUrl: string;
  sessionId: string;
  template: string;
}) {
  if (!template.includes("{session_id}")) {
    return null;
  }

  return template
    .replaceAll("{session_id}", encodeURIComponent(sessionId))
    .replaceAll(
      "{provider_session_ref}",
      encodeURIComponent(providerSessionReference ?? sessionId),
    )
    .replaceAll("{return_url}", encodeURIComponent(returnUrl));
}

export function parseOnePersonProviderPayload(value: unknown): OnePersonProviderResultPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid identity-provider payload.");
  }

  const payload = value as Record<string, unknown>;
  const dedupeReferences = Array.isArray(payload.dedupeReferences)
    ? payload.dedupeReferences
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
          const row = entry as Record<string, unknown>;
          const namespace = typeof row.namespace === "string" ? row.namespace : "";
          const reference = typeof row.reference === "string" ? row.reference.trim() : "";
          if (
            ![
              "provider_subject",
              "government_document",
              "biometric_duplicate_cluster",
              "manual_equivalent",
            ].includes(namespace) ||
            reference.length < 6 ||
            reference.length > 500
          ) {
            return null;
          }
          return { namespace, reference } as OnePersonProviderResultPayload["dedupeReferences"][number];
        })
        .filter(
          (entry): entry is OnePersonProviderResultPayload["dedupeReferences"][number] =>
            Boolean(entry),
        )
    : [];

  const result = payload.result;
  const assuranceTier = payload.assuranceTier;
  const ageClass = payload.ageClass;
  const duplicateCheckResult = payload.duplicateCheckResult;
  const eventId = typeof payload.eventId === "string" ? payload.eventId.trim() : "";
  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  const providerSessionReference =
    typeof payload.providerSessionReference === "string"
      ? payload.providerSessionReference.trim()
      : "";
  const verifiedAt = typeof payload.verifiedAt === "string" ? payload.verifiedAt.trim() : "";
  const expiresAt =
    typeof payload.expiresAt === "string" && payload.expiresAt.trim()
      ? payload.expiresAt.trim()
      : null;
  const rawDataDeletionDueAt =
    typeof payload.rawDataDeletionDueAt === "string" && payload.rawDataDeletionDueAt.trim()
      ? payload.rawDataDeletionDueAt.trim()
      : null;

  if (
    eventId.length < 8 ||
    eventId.length > 240 ||
    sessionId.length < 10 ||
    sessionId.length > 80 ||
    providerSessionReference.length < 6 ||
    providerSessionReference.length > 500 ||
    !["verified", "rejected", "needs_review"].includes(String(result)) ||
    !["document_liveness", "manual_equivalent"].includes(String(assuranceTier)) ||
    !ONE_PERSON_AGE_CLASSES.includes(ageClass as OnePersonAgeClass) ||
    !["clear", "potential_duplicate", "confirmed_duplicate"].includes(
      String(duplicateCheckResult),
    ) ||
    Number.isNaN(Date.parse(verifiedAt)) ||
    (expiresAt && Number.isNaN(Date.parse(expiresAt))) ||
    (rawDataDeletionDueAt && Number.isNaN(Date.parse(rawDataDeletionDueAt)))
  ) {
    throw new Error("Invalid identity-provider payload.");
  }

  if (result === "verified") {
    if (dedupeReferences.length === 0) {
      throw new Error("Verified identity payload requires a stable deduplication reference.");
    }

    if (ageClass !== "adult" && ageClass !== "minor_13_17") {
      throw new Error("Verified identity payload requires an eligible age classification.");
    }

    if (!rawDataDeletionDueAt) {
      throw new Error("Verified identity payload requires a raw-data deletion deadline.");
    }

    const verifiedAtMs = Date.parse(verifiedAt);
    const deletionDueAtMs = Date.parse(rawDataDeletionDueAt);
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1_000;

    if (deletionDueAtMs < verifiedAtMs) {
      throw new Error("Identity-provider raw-data deletion deadline cannot precede verification.");
    }

    if (deletionDueAtMs > verifiedAtMs + ninetyDaysMs) {
      throw new Error("Identity-provider raw data must be scheduled for deletion within 90 days.");
    }

    if (expiresAt && Date.parse(expiresAt) <= verifiedAtMs) {
      throw new Error("Identity credential expiry must occur after verification.");
    }
  }

  return {
    eventId,
    sessionId,
    providerSessionReference,
    result: result as OnePersonProviderResultPayload["result"],
    assuranceTier: assuranceTier as OnePersonProviderResultPayload["assuranceTier"],
    ageClass: ageClass as OnePersonAgeClass,
    dedupeReferences,
    verifiedAt,
    expiresAt,
    duplicateCheckResult:
      duplicateCheckResult as OnePersonProviderResultPayload["duplicateCheckResult"],
    rawDataDeletionDueAt,
  };
}

export function verifyOnePersonWebhookSignature({
  body,
  now = Date.now(),
  secret,
  signatureHeader,
  timestampHeader,
  toleranceSeconds = 300,
}: {
  body: string;
  now?: number;
  secret: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  toleranceSeconds?: number;
}) {
  const signatureMatch = signatureHeader?.match(SIGNATURE_HEADER);
  const timestampSeconds = Number.parseInt(timestampHeader ?? "", 10);

  if (
    secret.length < 32 ||
    !signatureMatch ||
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(Math.floor(now / 1000) - timestampSeconds) > toleranceSeconds
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${body}`, "utf8")
    .digest("hex");
  const received = signatureMatch[1];

  if (!SHA256_HEX.test(received)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function onePersonCapabilityMessage(reasonCode: string) {
  switch (reasonCode) {
    case "verified_adult":
    case "verified_minor":
    case "enforcement_disabled":
    case "low_risk_capability":
      return "Allowed.";
    case "identity_verification_required":
      return "Verify your identity before using this Moral Trade capability.";
    case "guardian_consent_required":
      return "A verified guardian must consent before this capability is available.";
    case "minor_restricted_capability":
      return "This capability is unavailable to accounts for people under 18.";
    case "ordinary_recovery_cooldown":
      return "This action is temporarily unavailable during the account-recovery security cooldown.";
    case "high_risk_recovery_cooldown":
      return "This high-risk action is temporarily unavailable during the extended recovery cooldown.";
    case "duplicate_review":
      return "Account access is limited while a private duplicate-person review is pending.";
    case "closed_account":
      return "This canonical account is closed. Use identity recovery to reopen it.";
    case "non_human_account":
      return "Service and synthetic accounts cannot exercise human Moral Trade capabilities.";
    case "account_banned":
      return "This account cannot use Moral Trade capabilities.";
    case "unknown_capability":
      return "This capability is not recognized and was denied.";
    default:
      return "This action is unavailable until account identity checks are complete.";
  }
}

const LOW_RISK_CAPABILITIES = new Set<OnePersonCapability>([
  "browse",
  "private_draft",
  "profile_edit",
  "data_export",
  "identity_recovery",
  "safety_exit",
]);

const HIGH_RISK_CAPABILITIES = new Set<OnePersonCapability>([
  "credential_management",
  "agreement",
  "contribute",
  "financial",
  "payout",
  "receive_funds",
  "organization_control",
  "independent_verification",
  "collective_high_risk",
]);

const MINOR_PROHIBITED_CAPABILITIES = new Set<OnePersonCapability>([
  "agreement",
  "contribute",
  "financial",
  "payout",
  "receive_funds",
  "organization_control",
  "independent_verification",
  "collective_high_risk",
]);

function timestampIsFuture(value: string | null | undefined, now: number) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > now;
}

export function evaluateOnePersonCapability({
  action,
  account,
  guardianConsentActive = account?.guardianConsentStatus === "active",
  enforcementEnabled = account?.participationEnforcementEnabled ?? false,
}: OnePersonCapabilityInput, now = Date.now()): OnePersonCapabilityDecision {
  const lowRisk = LOW_RISK_CAPABILITIES.has(action);
  const highRisk = HIGH_RISK_CAPABILITIES.has(action);
  let allowed = false;
  let reasonCode = "identity_verification_required";
  let cooldownUntil: string | null = null;

  if (!enforcementEnabled) {
    allowed = true;
    reasonCode = "enforcement_disabled";
  } else if (!account) {
    allowed = lowRisk;
    reasonCode = lowRisk ? "low_risk_capability" : "identity_verification_required";
  } else if (account.accountKind !== "human") {
    allowed = lowRisk;
    reasonCode = lowRisk ? "low_risk_capability" : "non_human_account";
  } else if (account.accountStatus === "banned") {
    reasonCode = "account_banned";
  } else if (account.accountStatus === "closed") {
    allowed = ["browse", "data_export", "identity_recovery", "safety_exit"].includes(action);
    reasonCode = allowed ? "low_risk_capability" : "closed_account";
  } else if (account.accountStatus === "duplicate_review") {
    allowed = [
      "browse",
      "private_draft",
      "data_export",
      "identity_recovery",
      "safety_exit",
    ].includes(action);
    reasonCode = allowed ? "low_risk_capability" : "duplicate_review";
  } else if (
    account.verificationStatus !== "verified" ||
    (account.credentialExpiresAt && !timestampIsFuture(account.credentialExpiresAt, now))
  ) {
    allowed = lowRisk;
    reasonCode = lowRisk ? "low_risk_capability" : "identity_verification_required";
  } else if (highRisk && timestampIsFuture(account.highRiskCooldownUntil, now)) {
    reasonCode = "high_risk_recovery_cooldown";
    cooldownUntil = account.highRiskCooldownUntil;
  } else if (!lowRisk && timestampIsFuture(account.ordinaryCooldownUntil, now)) {
    reasonCode = "ordinary_recovery_cooldown";
    cooldownUntil = account.ordinaryCooldownUntil;
  } else if (account.ageClass === "minor_13_17") {
    if (MINOR_PROHIBITED_CAPABILITIES.has(action)) {
      reasonCode = "minor_restricted_capability";
    } else if (!lowRisk && !guardianConsentActive) {
      reasonCode = "guardian_consent_required";
    } else {
      allowed = true;
      reasonCode = lowRisk ? "low_risk_capability" : "verified_minor";
    }
  } else if (account.ageClass === "adult") {
    allowed = true;
    reasonCode = lowRisk ? "low_risk_capability" : "verified_adult";
  } else {
    allowed = lowRisk;
    reasonCode = lowRisk ? "low_risk_capability" : "identity_verification_required";
  }

  return {
    allowed,
    action,
    reasonCode,
    message: onePersonCapabilityMessage(reasonCode),
    cooldownUntil,
  };
}

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? String(record[key]) : "";
}

function readNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value ? value : null;
}

export function parseOnePersonAccountSnapshot(value: unknown): OnePersonAccountSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const accountKind = readString(row, "accountKind");
  const accountStatus = readString(row, "accountStatus");
  const verificationStatus = readString(row, "verificationStatus");
  const ageClass = readString(row, "ageClass");
  const guardianConsentStatus = readString(row, "guardianConsentStatus");
  const providerMode = normalizeOnePersonProviderMode(readString(row, "providerMode"));

  if (
    !["human", "service", "synthetic"].includes(accountKind) ||
    !["active", "limited", "recovery_cooldown", "duplicate_review", "closed", "banned"].includes(
      accountStatus,
    ) ||
    !["legacy_unverified", "pending", "verified", "stale", "revoked", "rejected"].includes(
      verificationStatus,
    ) ||
    !ONE_PERSON_AGE_CLASSES.includes(ageClass as OnePersonAgeClass) ||
    !["not_required", "pending", "active", "revoked", "expired"].includes(
      guardianConsentStatus,
    )
  ) {
    return null;
  }

  return {
    available: row.available === true,
    profileId: readString(row, "profileId"),
    accountKind: accountKind as OnePersonAccountSnapshot["accountKind"],
    accountStatus: accountStatus as OnePersonAccountStatus,
    verificationStatus: verificationStatus as OnePersonVerificationStatus,
    ageClass: ageClass as OnePersonAgeClass,
    guardianConsentStatus:
      guardianConsentStatus as OnePersonAccountSnapshot["guardianConsentStatus"],
    ordinaryCooldownUntil: readNullableString(row, "ordinaryCooldownUntil"),
    highRiskCooldownUntil: readNullableString(row, "highRiskCooldownUntil"),
    credentialExpiresAt: readNullableString(row, "credentialExpiresAt"),
    providerName: readNullableString(row, "providerName"),
    registrationEnforcementEnabled: row.registrationEnforcementEnabled === true,
    participationEnforcementEnabled: row.participationEnforcementEnabled === true,
    providerMode,
    providerReady: row.providerReady === true,
  };
}

export function parseOnePersonVerificationSessionStatus(
  value: unknown,
): OnePersonVerificationSessionStatus {
  const unavailable: OnePersonVerificationSessionStatus = {
    available: false,
    sessionId: null,
    purpose: null,
    state: "unavailable",
    providerMode: "disabled",
    providerName: "Identity review provider",
    expiresAt: null,
    returnTo: "/onboarding",
    preAccount: true,
    guardianConsentRequired: false,
    registrationReady: false,
    grantId: null,
    recoveryRequired: false,
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) return unavailable;
  const row = value as Record<string, unknown>;
  const state = readString(row, "state");
  if (
    ![
      "unavailable",
      "created",
      "provider_pending",
      "needs_review",
      "guardian_required",
      "verified",
      "duplicate_recovery",
      "rejected",
      "expired",
      "consumed",
    ].includes(state)
  ) {
    return unavailable;
  }

  const purpose = readString(row, "purpose");

  return {
    available: row.available === true,
    sessionId: readNullableString(row, "sessionId"),
    purpose: ["registration", "verify_existing", "recovery"].includes(purpose)
      ? (purpose as OnePersonVerificationSessionStatus["purpose"])
      : null,
    state: state as OnePersonVerificationSessionStatus["state"],
    providerMode: normalizeOnePersonProviderMode(readString(row, "providerMode")),
    providerName: readString(row, "providerName") || "Identity review provider",
    expiresAt: readNullableString(row, "expiresAt"),
    returnTo: readString(row, "returnTo") || "/onboarding",
    preAccount: row.preAccount !== false,
    guardianConsentRequired: row.guardianConsentRequired === true || state === "guardian_required",
    registrationReady: row.registrationReady === true,
    grantId: readNullableString(row, "grantId"),
    recoveryRequired: row.recoveryRequired === true,
  };
}
