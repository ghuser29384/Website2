import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { getSafeInternalPath } from "@/lib/paths";
import { createServiceClient } from "@/lib/supabase/server";

import {
  ONE_PERSON_ACCOUNT_REGISTRATION_GRANT_COOKIE,
  ONE_PERSON_ACCOUNT_SESSION_COOKIE,
  buildAuthIdentityHmac,
  buildIdentityVerificationUrl,
  buildProviderDedupeTokens,
  buildRegistrationEmailBinding,
  evaluateOnePersonConfiguration,
  getOnePersonAccountConfig,
  hashOpaqueValue,
  hmacOpaqueValue,
  normalizeIdentityEmail,
  parseOnePersonAccountSnapshot,
  parseOnePersonProviderPayload,
  parseOnePersonVerificationSessionStatus,
  type OnePersonAccountSnapshot,
  type OnePersonCapability,
  type OnePersonCapabilityDecision,
  type OnePersonProviderResultPayload,
  type OnePersonVerificationPurpose,
  type OnePersonVerificationSessionStatus,
} from "./one-person-account";

const COOKIE_VERSION = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,160}$/;

interface IdentitySessionCookie {
  v: 1;
  sessionId: string;
  retrievalToken: string;
  registrationToken: string | null;
  providerSessionReference: string;
}

interface RegistrationGrantCookie {
  v: 1;
  grantId: string;
  rawToken: string;
  sessionId: string;
}

interface StartVerificationInput {
  origin: string;
  purpose: OnePersonVerificationPurpose;
  requestedProfileId?: string | null;
  returnTo?: string | null;
}

interface ProviderResultRecordOptions {
  exactBody: string;
  payload: OnePersonProviderResultPayload;
}

function encodeCookie(value: IdentitySessionCookie | RegistrationGrantCookie) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCookie<T>(value: string | undefined): T | null {
  if (!value || value.length > 2048) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function parseIdentitySessionCookie(value: string | undefined): IdentitySessionCookie | null {
  const parsed = decodeCookie<Partial<IdentitySessionCookie>>(value);
  if (
    parsed?.v !== COOKIE_VERSION ||
    typeof parsed.sessionId !== "string" ||
    !UUID_PATTERN.test(parsed.sessionId) ||
    typeof parsed.retrievalToken !== "string" ||
    !TOKEN_PATTERN.test(parsed.retrievalToken) ||
    (parsed.registrationToken !== null &&
      (typeof parsed.registrationToken !== "string" || !TOKEN_PATTERN.test(parsed.registrationToken))) ||
    typeof parsed.providerSessionReference !== "string" ||
    parsed.providerSessionReference.length < 6 ||
    parsed.providerSessionReference.length > 500
  ) {
    return null;
  }
  return parsed as IdentitySessionCookie;
}

function parseRegistrationGrantCookie(value: string | undefined): RegistrationGrantCookie | null {
  const parsed = decodeCookie<Partial<RegistrationGrantCookie>>(value);
  if (
    parsed?.v !== COOKIE_VERSION ||
    typeof parsed.grantId !== "string" ||
    !UUID_PATTERN.test(parsed.grantId) ||
    typeof parsed.sessionId !== "string" ||
    !UUID_PATTERN.test(parsed.sessionId) ||
    typeof parsed.rawToken !== "string" ||
    !TOKEN_PATTERN.test(parsed.rawToken)
  ) {
    return null;
  }
  return parsed as RegistrationGrantCookie;
}

function randomOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

function expiresAt(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function deletionDueAt(days = 30) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

function credentialExpiryAt(days = 365) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

function throwRpcError(error: unknown, fallback: string): never {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || fallback)
      : fallback;
  throw new Error(message);
}

export async function setOnePersonIdentitySessionCookie(value: IdentitySessionCookie) {
  const store = await cookies();
  store.set(ONE_PERSON_ACCOUNT_SESSION_COOKIE, encodeCookie(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 3 * 60 * 60,
  });
}

export async function clearOnePersonIdentityCookies() {
  const store = await cookies();
  store.set(ONE_PERSON_ACCOUNT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  store.set(ONE_PERSON_ACCOUNT_REGISTRATION_GRANT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function startOnePersonVerification({
  origin,
  purpose,
  requestedProfileId = null,
  returnTo,
}: StartVerificationInput) {
  const config = getOnePersonAccountConfig();
  const readiness = evaluateOnePersonConfiguration(config);
  if (!readiness.ready) {
    throw new Error(readiness.blockers[0] ?? "Identity verification is not configured.");
  }

  if (purpose === "verify_existing" && !requestedProfileId) {
    throw new Error("Sign in before verifying an existing account.");
  }
  if (purpose === "registration" && requestedProfileId) {
    throw new Error("A signed-in account cannot start a new-person registration.");
  }

  const sessionId = randomUUID();
  const retrievalToken = randomOpaqueToken();
  const registrationToken = purpose === "registration" ? randomOpaqueToken() : null;
  const providerSessionReference = sessionId;
  const normalizedReturnTo = getSafeInternalPath(returnTo, purpose === "registration" ? "/onboarding" : "/account/identity");
  const sessionExpiresAt = expiresAt(config.sessionTtlMinutes);
  const service = createServiceClient() as any;
  const { error } = await service.rpc("create_person_verification_session_v1", {
    p_session_id: sessionId,
    p_purpose: purpose,
    p_retrieval_token_hash: hashOpaqueValue(retrievalToken),
    p_pending_registration_token_hash: registrationToken ? hashOpaqueValue(registrationToken) : null,
    p_requested_profile_id: requestedProfileId,
    p_provider_mode: config.providerMode,
    p_provider_name: config.providerName,
    p_provider_session_reference_hmac: hmacOpaqueValue(providerSessionReference, config.dedupeKey),
    p_requested_return_to: normalizedReturnTo,
    p_expires_at: sessionExpiresAt,
  });
  if (error) throwRpcError(error, "Unable to start identity verification.");

  await setOnePersonIdentitySessionCookie({
    v: COOKIE_VERSION,
    sessionId,
    retrievalToken,
    registrationToken,
    providerSessionReference,
  });

  const returnUrl = new URL("/identity/status", origin).toString();
  const externalUrl = buildIdentityVerificationUrl({
    providerSessionReference,
    returnUrl,
    sessionId,
    template: config.verificationUrlTemplate,
  });

  return {
    externalUrl,
    sessionId,
    state: config.providerMode === "manual_review" ? "needs_review" : "provider_pending",
    statusPath: "/identity/status",
  } as const;
}

export async function getOnePersonVerificationSession(): Promise<{
  cookie: IdentitySessionCookie | null;
  status: OnePersonVerificationSessionStatus;
}> {
  const store = await cookies();
  const sessionCookie = parseIdentitySessionCookie(store.get(ONE_PERSON_ACCOUNT_SESSION_COOKIE)?.value);
  if (!sessionCookie) {
    return { cookie: null, status: parseOnePersonVerificationSessionStatus(null) };
  }

  const service = createServiceClient() as any;
  const { data, error } = await service.rpc("get_person_verification_session_status_v1", {
    p_session_id: sessionCookie.sessionId,
    p_retrieval_token_hash: hashOpaqueValue(sessionCookie.retrievalToken),
    p_registration_token_hash: sessionCookie.registrationToken
      ? hashOpaqueValue(sessionCookie.registrationToken)
      : null,
  });
  if (error) throwRpcError(error, "Unable to read identity-verification status.");
  return {
    cookie: sessionCookie,
    status: parseOnePersonVerificationSessionStatus(data),
  };
}

export async function prepareOnePersonRegistration(email: string) {
  const config = getOnePersonAccountConfig();
  if (!config.registrationEnforcementEnabled) return null;

  const { cookie, status } = await getOnePersonVerificationSession();
  if (
    !cookie?.registrationToken ||
    !status.available ||
    !status.registrationReady ||
    !status.grantId ||
    status.purpose !== "registration"
  ) {
    throw new Error("Complete identity verification before creating an account.");
  }

  const normalizedEmail = normalizeIdentityEmail(email);
  const service = createServiceClient() as any;
  const { error } = await service.rpc("bind_person_registration_grant_email_v1", {
    p_grant_id: status.grantId,
    p_token_hash: hashOpaqueValue(cookie.registrationToken),
    p_email_binding_hmac: buildRegistrationEmailBinding(normalizedEmail, cookie.registrationToken),
  });
  if (error) throwRpcError(error, "This identity verification cannot create an account.");

  const grant: RegistrationGrantCookie = {
    v: COOKIE_VERSION,
    grantId: status.grantId,
    rawToken: cookie.registrationToken,
    sessionId: cookie.sessionId,
  };
  const store = await cookies();
  store.set(ONE_PERSON_ACCOUNT_REGISTRATION_GRANT_COOKIE, encodeCookie(grant), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: config.registrationGrantTtlMinutes * 60,
  });
  return grant;
}

export async function readPreparedOnePersonRegistration() {
  const store = await cookies();
  return parseRegistrationGrantCookie(
    store.get(ONE_PERSON_ACCOUNT_REGISTRATION_GRANT_COOKIE)?.value,
  );
}

export async function hasReadyOnePersonRegistration() {
  const config = getOnePersonAccountConfig();
  if (!config.registrationEnforcementEnabled) return true;
  const { status } = await getOnePersonVerificationSession();
  return status.registrationReady && status.purpose === "registration";
}

export async function loadOnePersonAccountStatus(profileId: string): Promise<OnePersonAccountSnapshot | null> {
  const service = createServiceClient() as any;
  const { data, error } = await service.rpc("get_person_account_status_v1", {
    p_profile_id: profileId,
  });
  if (error) throwRpcError(error, "Unable to load account identity status.");
  return parseOnePersonAccountSnapshot(data);
}

export async function requireOnePersonCapability(
  profileId: string,
  action: OnePersonCapability,
): Promise<OnePersonCapabilityDecision> {
  const service = createServiceClient() as any;
  const { data, error } = await service.rpc("require_person_capability_v1", {
    p_profile_id: profileId,
    p_action_code: action,
  });
  if (error) throwRpcError(error, "This account cannot perform that action.");
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    allowed: row.allowed === true,
    action,
    reasonCode: typeof row.reasonCode === "string" ? row.reasonCode : "unknown",
    message: row.allowed === true ? "Allowed." : "This action is unavailable.",
    cooldownUntil: typeof row.cooldownUntil === "string" ? row.cooldownUntil : null,
  };
}

export async function recordOnePersonProviderResult({
  exactBody,
  payload: rawPayload,
}: ProviderResultRecordOptions) {
  const config = getOnePersonAccountConfig();
  const payload = parseOnePersonProviderPayload(rawPayload);
  const dedupeTokens = buildProviderDedupeTokens(payload, config.dedupeKey, config.providerName).map(
    (entry) => ({ ...entry, version: config.dedupeTokenVersion }),
  );
  const service = createServiceClient() as any;
  const { data, error } = await service.rpc("record_person_verification_result_v1", {
    p_session_id: payload.sessionId,
    p_provider_name: config.providerName,
    p_provider_event_id_hmac: hmacOpaqueValue(
      `provider_event\u001f${config.providerName}\u001f${payload.eventId}`,
      config.dedupeKey,
    ),
    p_provider_session_reference_hmac: hmacOpaqueValue(
      payload.providerSessionReference,
      config.dedupeKey,
    ),
    p_event_payload_hash: hashOpaqueValue(exactBody),
    p_outcome: payload.result,
    p_assurance_tier: payload.assuranceTier,
    p_age_class: payload.ageClass,
    p_duplicate_check_result: payload.duplicateCheckResult,
    p_dedupe_tokens: dedupeTokens,
    p_provider_verified_at: payload.verifiedAt,
    p_credential_expires_at: payload.expiresAt,
    p_raw_data_deletion_due_at: payload.rawDataDeletionDueAt,
    p_registration_grant_expires_at: expiresAt(config.registrationGrantTtlMinutes),
  });
  if (error) throwRpcError(error, "Unable to record identity-verification result.");
  return data;
}

export function buildQaProviderPayload({
  ageClass = "adult",
  duplicateCheckResult = "clear",
  result = "verified",
  sessionId,
  subjectReference,
}: {
  ageClass?: OnePersonProviderResultPayload["ageClass"];
  duplicateCheckResult?: OnePersonProviderResultPayload["duplicateCheckResult"];
  result?: OnePersonProviderResultPayload["result"];
  sessionId: string;
  subjectReference: string;
}): OnePersonProviderResultPayload {
  const now = new Date().toISOString();
  return parseOnePersonProviderPayload({
    eventId: `qa-${randomUUID()}`,
    sessionId,
    providerSessionReference: sessionId,
    result,
    assuranceTier: "manual_equivalent",
    ageClass,
    dedupeReferences:
      result === "verified"
        ? [{ namespace: "manual_equivalent", reference: subjectReference }]
        : [],
    verifiedAt: now,
    expiresAt: result === "verified" ? credentialExpiryAt() : null,
    duplicateCheckResult,
    rawDataDeletionDueAt: result === "verified" ? deletionDueAt() : null,
  });
}

export async function synchronizeOnePersonCredentialInventory(profileId: string, recordedBy = profileId) {
  const config = getOnePersonAccountConfig();
  if (config.dedupeKey.length < 32) return { synchronized: false, reason: "dedupe_key_unavailable" };

  const service = createServiceClient() as any;
  const { data: userData, error: userError } = await service.auth.admin.getUserById(profileId);
  if (userError || !userData?.user) throwRpcError(userError, "Unable to load account credentials.");
  const credentials = (userData.user.identities ?? []).map((identity: any) => ({
    provider: String(identity.provider || "unknown"),
    identityHmac: buildAuthIdentityHmac(
      String(identity.provider || "unknown"),
      String(identity.identity_id || identity.id || ""),
      config.dedupeKey,
    ),
  }));
  const { data, error } = await service.rpc("sync_person_credential_inventory_v1", {
    p_profile_id: profileId,
    p_credentials: credentials,
    p_recorded_by: recordedBy,
  });
  if (error) throwRpcError(error, "Unable to synchronize account credentials.");
  return data;
}
