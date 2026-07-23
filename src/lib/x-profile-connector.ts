import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
  decryptBackgroundSensitiveText,
  encryptBackgroundSensitiveText,
  hasBackgroundFieldEncryptionKey,
  normalizeEncryptedFieldMap,
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const X_PROFILE_CONNECTOR_PROVIDER = "social";
export const X_PROFILE_CONNECTOR_LABEL = "X";
export const X_PROFILE_CONNECTOR_CALLBACK_PATH = "/api/profile-sources/x/callback";
export const X_PROFILE_CONNECTOR_START_PATH = "/api/profile-sources/x/start";
export const X_PROFILE_CONNECTOR_DISCONNECT_PATH = "/api/profile-sources/x/disconnect";
export const X_PROFILE_CONNECTOR_RETENTION_DAYS = 90;
export const X_PROFILE_CONNECTOR_ALLOWED_FIELD_KEYS = ["cause_priorities"] as const;
export const X_PROFILE_CONNECTOR_SCOPES = [
  "tweet.read",
  "users.read",
  "follows.read",
  "like.read",
  "bookmark.read",
  "offline.access",
] as const;

export const X_OAUTH_COOKIE_STATE = "mt_x_profile_state";
export const X_OAUTH_COOKIE_VERIFIER = "mt_x_profile_verifier";
export const X_OAUTH_COOKIE_RETURN_TO = "mt_x_profile_return_to";
export const X_OAUTH_COOKIE_PROFILE_ID = "mt_x_profile_owner";
export const X_OAUTH_COOKIE_CONSENT = "mt_x_profile_consent";
export const X_OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export const X_CONNECTION_SECRET_KEYS = {
  accessToken: "source_connections.x.oauth_access_token",
  refreshToken: "source_connections.x.oauth_refresh_token",
  accessTokenExpiresAt: "source_connections.x.oauth_access_token_expires_at",
  externalUserId: "source_connections.x.external_user_id",
  grantedScope: "source_connections.x.granted_scope",
} as const;

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_REVOKE_URL = "https://api.x.com/2/oauth2/revoke";
const X_CURRENT_USER_URL = "https://api.x.com/2/users/me?user.fields=name,username";
const X_API_TIMEOUT_MS = 10_000;

export type XProfileConnectorAvailabilityReason =
  | "ready"
  | "disabled"
  | "missing_credentials"
  | "secure_storage_unavailable"
  | "supabase_unavailable"
  | "invalid_redirect_uri";

export interface XProfileConnectorAvailability {
  enabled: boolean;
  reason: XProfileConnectorAvailabilityReason;
  redirectUri: string;
}

export interface XProfileConnectorConfig extends XProfileConnectorAvailability {
  clientId: string;
  clientSecret: string;
  enabled: true;
  reason: "ready";
}

export interface XOAuthAttempt {
  challenge: string;
  state: string;
  verifier: string;
}

export interface XOAuthTokenSet {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  scope: string;
  tokenType: string;
}

export interface XAuthenticatedUser {
  id: string;
  name: string;
  username: string;
}

export type XProfileConnectorAccessStatus =
  | "not_connected"
  | "connected"
  | "expired"
  | "revoked"
  | "needs_review";

export interface XProfileConnectorStatus {
  accessStatus: XProfileConnectorAccessStatus;
  availability: XProfileConnectorAvailability;
  connectedAt: string | null;
  retentionExpiresAt: string | null;
  username: string;
}

export class XProfileConnectorError extends Error {
  constructor(
    public readonly code:
      | "token_exchange_failed"
      | "invalid_token_response"
      | "missing_required_scope"
      | "account_lookup_failed"
      | "invalid_account_response"
      | "connection_write_failed",
    message: string,
  ) {
    super(message);
    this.name = "XProfileConnectorError";
  }
}

interface XOAuthTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
  token_type?: unknown;
}

interface XCurrentUserResponse {
  data?: {
    id?: unknown;
    name?: unknown;
    username?: unknown;
  };
}

type SourceConnectionInsert = Database["public"]["Tables"]["source_connections"]["Insert"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function base64UrlEncode(value: Buffer) {
  return value
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getConfidentialClientAuthorization(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
}

function resolveRedirectUri({ env, siteUrl }: { env: NodeJS.ProcessEnv; siteUrl: string }) {
  const explicit = env.X_OAUTH_REDIRECT_URI?.trim();

  try {
    return explicit || new URL(X_PROFILE_CONNECTOR_CALLBACK_PATH, siteUrl).toString();
  } catch {
    return "";
  }
}

function isSupportedRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    return (
      (url.protocol === "https:" || localHttp) &&
      url.pathname === X_PROFILE_CONNECTOR_CALLBACK_PATH &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function getSafeXProfileConnectorReturnPath(
  value: string | null | undefined,
  fallback = "/complete-profile",
) {
  const candidate = (value ?? "").trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://moraltrade.invalid");
    const resolved = new URL(candidate, base);

    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function getXProfileConnectorAvailability({
  env = process.env,
  secureStorageReady = hasBackgroundFieldEncryptionKey(),
  siteUrl = getSiteUrl(),
  supabaseReady = hasSupabaseEnv(),
}: {
  env?: NodeJS.ProcessEnv;
  secureStorageReady?: boolean;
  siteUrl?: string;
  supabaseReady?: boolean;
} = {}): XProfileConnectorAvailability {
  const enabled = env.X_PROFILE_CONNECTOR_ENABLED?.trim().toLowerCase() === "true";
  const clientId = env.X_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.X_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = resolveRedirectUri({ env, siteUrl });

  if (!enabled) {
    return { enabled: false, reason: "disabled", redirectUri };
  }

  if (!clientId || !clientSecret) {
    return { enabled: false, reason: "missing_credentials", redirectUri };
  }

  if (!supabaseReady) {
    return { enabled: false, reason: "supabase_unavailable", redirectUri };
  }

  if (!secureStorageReady) {
    return { enabled: false, reason: "secure_storage_unavailable", redirectUri };
  }

  if (!isSupportedRedirectUri(redirectUri)) {
    return { enabled: false, reason: "invalid_redirect_uri", redirectUri };
  }

  return { enabled: true, reason: "ready", redirectUri };
}

export function getXProfileConnectorConfig(): XProfileConnectorConfig {
  const availability = getXProfileConnectorAvailability();
  const clientId = process.env.X_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET?.trim() ?? "";

  if (!availability.enabled || !clientId || !clientSecret) {
    throw new Error(`X profile connector is unavailable: ${availability.reason}.`);
  }

  return {
    clientId,
    clientSecret,
    enabled: true,
    reason: "ready",
    redirectUri: availability.redirectUri,
  };
}

export function getXProfileConnectorRevocationConfig({
  env = process.env,
  siteUrl = getSiteUrl(),
}: {
  env?: NodeJS.ProcessEnv;
  siteUrl?: string;
} = {}): XProfileConnectorConfig | null {
  const clientId = env.X_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.X_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = resolveRedirectUri({ env, siteUrl });

  if (!clientId || !clientSecret || !isSupportedRedirectUri(redirectUri)) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    enabled: true,
    reason: "ready",
    redirectUri,
  };
}

export function createXOAuthAttempt(): XOAuthAttempt {
  const state = base64UrlEncode(randomBytes(32));
  const verifier = base64UrlEncode(randomBytes(64));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier, "utf8").digest());

  return { challenge, state, verifier };
}

export function isMatchingXOAuthState(expected: string, received: string) {
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function buildXAuthorizationUrl({
  attempt,
  config,
}: {
  attempt: XOAuthAttempt;
  config: XProfileConnectorConfig;
}) {
  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", X_PROFILE_CONNECTOR_SCOPES.join(" "));
  url.searchParams.set("state", attempt.state);
  url.searchParams.set("code_challenge", attempt.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

function readXApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;
  const description =
    typeof record.error_description === "string"
      ? record.error_description
      : typeof record.detail === "string"
        ? record.detail
        : typeof record.title === "string"
          ? record.title
          : "";

  return description ? `${fallback}: ${description.slice(0, 180)}` : fallback;
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function buildXFetchSignal() {
  return AbortSignal.timeout(X_API_TIMEOUT_MS);
}

export async function exchangeXAuthorizationCode({
  code,
  codeVerifier,
  config,
  fetchImpl = fetch,
}: {
  code: string;
  codeVerifier: string;
  config: XProfileConnectorConfig;
  fetchImpl?: typeof fetch;
}): Promise<XOAuthTokenSet> {
  const response = await fetchImpl(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getConfidentialClientAuthorization(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    cache: "no-store",
    signal: buildXFetchSignal(),
  });
  const payload = (await readJsonSafely(response)) as XOAuthTokenResponse | null;

  if (!response.ok) {
    throw new XProfileConnectorError(
      "token_exchange_failed",
      readXApiError(payload, `X token exchange failed with status ${response.status}`),
    );
  }

  const accessToken = typeof payload?.access_token === "string" ? payload.access_token.trim() : "";
  const refreshToken = typeof payload?.refresh_token === "string" ? payload.refresh_token.trim() : "";
  const scope = typeof payload?.scope === "string" ? payload.scope.trim() : "";
  const tokenType = typeof payload?.token_type === "string" ? payload.token_type.trim() : "";
  const expiresInSeconds = Number(payload?.expires_in);

  if (!accessToken || !refreshToken || tokenType.toLowerCase() !== "bearer") {
    throw new XProfileConnectorError(
      "invalid_token_response",
      "X did not return the persistent read-only authorization required for this connector.",
    );
  }

  const grantedScopes = new Set(scope.split(/\s+/).filter(Boolean));
  const missingScopes = X_PROFILE_CONNECTOR_SCOPES.filter((required) => !grantedScopes.has(required));

  if (missingScopes.length) {
    throw new XProfileConnectorError(
      "missing_required_scope",
      `X did not grant the required read-only scopes: ${missingScopes.join(", ")}.`,
    );
  }

  return {
    accessToken,
    expiresInSeconds:
      Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 7_200,
    refreshToken,
    scope,
    tokenType,
  };
}

export async function fetchXAuthenticatedUser({
  accessToken,
  fetchImpl = fetch,
}: {
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<XAuthenticatedUser> {
  const response = await fetchImpl(X_CURRENT_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: buildXFetchSignal(),
  });
  const payload = (await readJsonSafely(response)) as XCurrentUserResponse | null;

  if (!response.ok) {
    throw new XProfileConnectorError(
      "account_lookup_failed",
      readXApiError(payload, `X account lookup failed with status ${response.status}`),
    );
  }

  const id = typeof payload?.data?.id === "string" ? payload.data.id.trim() : "";
  const username = typeof payload?.data?.username === "string" ? payload.data.username.trim() : "";
  const name = typeof payload?.data?.name === "string" ? payload.data.name.trim() : "";

  if (!id || !username) {
    throw new XProfileConnectorError(
      "invalid_account_response",
      "X did not return a usable account identity.",
    );
  }

  return { id, name, username };
}

export async function revokeXOAuthToken({
  config,
  fetchImpl = fetch,
  token,
}: {
  config: XProfileConnectorConfig;
  fetchImpl?: typeof fetch;
  token: string;
}) {
  if (!token) return true;

  try {
    const response = await fetchImpl(X_REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: getConfidentialClientAuthorization(config.clientId, config.clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ client_id: config.clientId, token }),
      cache: "no-store",
      signal: buildXFetchSignal(),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function getXAccessTokenExpiresAt({
  expiresInSeconds,
  now = new Date(),
}: {
  expiresInSeconds: number;
  now?: Date;
}) {
  return new Date(now.getTime() + expiresInSeconds * 1_000).toISOString();
}

export function getXConnectionRetentionExpiresAt({
  now = new Date(),
  retentionDays = X_PROFILE_CONNECTOR_RETENTION_DAYS,
}: {
  now?: Date;
  retentionDays?: number;
} = {}) {
  const expiresAt = new Date(now.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + retentionDays);
  return expiresAt.toISOString();
}

export function getXProfileUrl(username: string) {
  const normalized = username.trim().replace(/^@/, "");
  return normalized ? `https://x.com/${encodeURIComponent(normalized)}` : "";
}

export function getXUsernameFromProfileUrl(value: string | null | undefined) {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.hostname !== "x.com" && url.hostname !== "www.x.com") return "";
    return decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "").replace(/^@/, "");
  } catch {
    return "";
  }
}

export function buildXSourceConnectionInsert({
  identity,
  now = new Date(),
  profileId,
  tokens,
}: {
  identity: XAuthenticatedUser;
  now?: Date;
  profileId: string;
  tokens: XOAuthTokenSet;
}): SourceConnectionInsert {
  const prepared = prepareRecordSensitiveTextFields({
    access_scope: X_PROFILE_CONNECTOR_SCOPES.join(" "),
    consent_notes:
      "The participant authorized read-only access to their X account, follows, likes, and bookmarks for private, reviewable profile suggestions. X data may not directly modify the participant's 100-spark allocation.",
    last_sync_summary:
      "Connection established. Only X account identity was checked; no follows, likes, bookmarks, or Posts were imported.",
  });
  const nowIso = now.toISOString();

  return {
    profile_id: profileId,
    provider: X_PROFILE_CONNECTOR_PROVIDER,
    label: X_PROFILE_CONNECTOR_LABEL,
    url: getXProfileUrl(identity.username),
    access_status: "connected",
    access_scope: prepared.plaintextFields.access_scope ?? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
    consent_notes: prepared.plaintextFields.consent_notes ?? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
    import_mode: "manual_review",
    sync_frequency: "manual",
    last_sync_summary:
      prepared.plaintextFields.last_sync_summary ?? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
    last_import_item_count: 0,
    last_imported_at: null,
    allowed_field_keys: [...X_PROFILE_CONNECTOR_ALLOWED_FIELD_KEYS],
    retention_expires_at: getXConnectionRetentionExpiresAt({ now }),
    ai_shadow_mode_allowed: false,
    raw_ingestion_allowed: false,
    sensitive_ciphertexts: {
      ...prepared.ciphertexts,
      [X_CONNECTION_SECRET_KEYS.accessToken]: encryptBackgroundSensitiveText(
        tokens.accessToken,
        X_CONNECTION_SECRET_KEYS.accessToken,
      ),
      [X_CONNECTION_SECRET_KEYS.refreshToken]: encryptBackgroundSensitiveText(
        tokens.refreshToken,
        X_CONNECTION_SECRET_KEYS.refreshToken,
      ),
      [X_CONNECTION_SECRET_KEYS.accessTokenExpiresAt]: encryptBackgroundSensitiveText(
        getXAccessTokenExpiresAt({ expiresInSeconds: tokens.expiresInSeconds, now }),
        X_CONNECTION_SECRET_KEYS.accessTokenExpiresAt,
      ),
      [X_CONNECTION_SECRET_KEYS.externalUserId]: encryptBackgroundSensitiveText(
        identity.id,
        X_CONNECTION_SECRET_KEYS.externalUserId,
      ),
      [X_CONNECTION_SECRET_KEYS.grantedScope]: encryptBackgroundSensitiveText(
        tokens.scope,
        X_CONNECTION_SECRET_KEYS.grantedScope,
      ),
    },
    sensitive_encryption_version: BACKGROUND_FIELD_ENCRYPTION_VERSION,
    updated_at: nowIso,
  };
}

export async function persistXProfileConnection({
  identity,
  profileId,
  supabase,
  tokens,
}: {
  identity: XAuthenticatedUser;
  profileId: string;
  supabase: SupabaseClient;
  tokens: XOAuthTokenSet;
}) {
  const payload = buildXSourceConnectionInsert({ identity, profileId, tokens });
  const { error: writeError } = await supabase
    .from("source_connections")
    .upsert(payload, { onConflict: "profile_id,provider,label" });

  if (writeError) {
    throw new XProfileConnectorError(
      "connection_write_failed",
      "Moral Trade could not save the encrypted X connection.",
    );
  }
}

export function readStoredXTokens(row: Pick<SourceConnectionRow, "sensitive_ciphertexts">) {
  const ciphertexts = normalizeEncryptedFieldMap(row.sensitive_ciphertexts);
  const accessToken = decryptBackgroundSensitiveText(
    ciphertexts[X_CONNECTION_SECRET_KEYS.accessToken],
    X_CONNECTION_SECRET_KEYS.accessToken,
  );
  const refreshToken = decryptBackgroundSensitiveText(
    ciphertexts[X_CONNECTION_SECRET_KEYS.refreshToken],
    X_CONNECTION_SECRET_KEYS.refreshToken,
  );

  const decryptionFailed =
    (Boolean(ciphertexts[X_CONNECTION_SECRET_KEYS.accessToken]) &&
      accessToken === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE) ||
    (Boolean(ciphertexts[X_CONNECTION_SECRET_KEYS.refreshToken]) &&
      refreshToken === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE);

  return {
    accessToken: accessToken === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE ? "" : accessToken,
    decryptionFailed,
    refreshToken: refreshToken === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE ? "" : refreshToken,
  };
}

function normalizeXProfileConnectorAccessStatus(value: string): XProfileConnectorAccessStatus {
  if (value === "connected" || value === "expired" || value === "revoked" || value === "needs_review") {
    return value;
  }

  return "not_connected";
}

export function getDisconnectedXProfileConnectorStatus(): XProfileConnectorStatus {
  return {
    accessStatus: "not_connected",
    availability: getXProfileConnectorAvailability(),
    connectedAt: null,
    retentionExpiresAt: null,
    username: "",
  };
}

export async function getXProfileConnectorStatus(
  profileId: string,
): Promise<XProfileConnectorStatus> {
  const availability = getXProfileConnectorAvailability();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_connections")
    .select("access_status,created_at,retention_expires_at,sensitive_ciphertexts,updated_at,url")
    .eq("profile_id", profileId)
    .eq("provider", X_PROFILE_CONNECTOR_PROVIDER)
    .eq("label", X_PROFILE_CONNECTOR_LABEL)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      accessStatus: "needs_review",
      availability,
      connectedAt: null,
      retentionExpiresAt: null,
      username: "",
    };
  }

  if (!data) {
    return {
      accessStatus: "not_connected",
      availability,
      connectedAt: null,
      retentionExpiresAt: null,
      username: "",
    };
  }

  const ciphertexts = normalizeEncryptedFieldMap(data.sensitive_ciphertexts);
  const credentialsPresent = Boolean(
    ciphertexts[X_CONNECTION_SECRET_KEYS.accessToken] &&
      ciphertexts[X_CONNECTION_SECRET_KEYS.refreshToken],
  );
  const retentionExpiresAt = data.retention_expires_at ?? null;
  const retentionTimestamp = retentionExpiresAt ? Date.parse(retentionExpiresAt) : Number.NaN;
  const storedAccessStatus = normalizeXProfileConnectorAccessStatus(data.access_status);
  const accessStatus: XProfileConnectorAccessStatus =
    storedAccessStatus === "connected" && !credentialsPresent
      ? "needs_review"
      : storedAccessStatus === "connected" &&
          (!Number.isFinite(retentionTimestamp) || retentionTimestamp <= Date.now())
        ? "expired"
        : storedAccessStatus;

  return {
    accessStatus,
    availability,
    connectedAt: data.updated_at || data.created_at,
    retentionExpiresAt,
    username: getXUsernameFromProfileUrl(data.url),
  };
}
