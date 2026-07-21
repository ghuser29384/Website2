import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const BACKGROUND_FIELD_ENCRYPTION_VERSION = "bg-field-v2";
export const BACKGROUND_LEGACY_FIELD_ENCRYPTION_VERSION = "bg-field-v1";
export const BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER = "[encrypted private field]";
export const BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE = "[encrypted private field unavailable]";

const CIPHER_ALGORITHM = "aes-256-gcm";
const ENCRYPTED_PREFIX_V1 = "bgenc:v1";
const ENCRYPTED_PREFIX_V2 = "bgenc:v2";
const DEFAULT_KEY_ID = "default";
const KEYRING_ENV_NAME = "BACKGROUND_FIELD_ENCRYPTION_KEYS";
const ACTIVE_KEY_ID_ENV_NAME = "BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID";
const KEY_ENV_NAMES = ["BACKGROUND_FIELD_ENCRYPTION_KEY", "MORAL_TRADE_FIELD_ENCRYPTION_KEY"];
const LEGACY_KEY_ENV_NAMES = [
  "BACKGROUND_FIELD_ENCRYPTION_LEGACY_KEY",
  "BACKGROUND_FIELD_ENCRYPTION_KEY",
  "MORAL_TRADE_FIELD_ENCRYPTION_KEY",
];
const SUPABASE_SERVICE_ROLE_ENV_NAME = "SUPABASE_SERVICE_ROLE_KEY";
const SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID = "supabase-service-role-v1";
const SUPABASE_SERVICE_ROLE_FALLBACK_DOMAIN =
  "moral-trade:background-field-encryption:supabase-service-role:v1";

export type SensitiveTextFieldMap = Record<string, string>;

export const WISH_PROFILE_SENSITIVE_TEXT_FIELDS = [
  "capabilities",
  "constraints",
  "verification_preferences",
  "uncertainty_notes",
  "brokerage_preference",
] as const;

export const PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS = ["notes", "snapshot_excerpt"] as const;

export const SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS = [
  "access_scope",
  "consent_notes",
  "last_sync_summary",
] as const;

export const PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS = [
  "hopes",
  "intent",
  "capabilities",
  "constraints",
  "uncertainty",
] as const;

export const BACKGROUND_SOURCE_SUMMARY_SENSITIVE_TEXT_FIELDS = [
  "summary_text",
  "purpose",
] as const;

export const BACKGROUND_PROFILE_INTERVIEW_SENSITIVE_TEXT_FIELDS = [
  "answer",
  "private_intent_update",
] as const;

export interface PreparedEncryptedFields {
  ciphertexts: SensitiveTextFieldMap;
  plaintextFields: SensitiveTextFieldMap;
  version: string;
}

export interface BackgroundFieldEncryptionKeyStatus {
  activeKeyId: string | null;
  activeVersion: typeof BACKGROUND_FIELD_ENCRYPTION_VERSION;
  configuredKeyIds: string[];
  legacyDecryptCandidateCount: number;
  rotationReady: boolean;
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return Buffer.from(padded, "base64");
}

function getFirstConfiguredEnvKey(envNames: readonly string[]) {
  for (const envName of envNames) {
    const value = process.env[envName]?.trim();

    if (value) {
      return { envName, value };
    }
  }

  return null;
}

function normalizeKeyId(value: string) {
  const normalized = value.trim().toLowerCase();

  if (/^[a-z0-9][a-z0-9._-]{0,63}$/.test(normalized)) {
    return normalized;
  }

  return "";
}

function deriveBackgroundFieldEncryptionKey(rawKey: string) {
  if (!rawKey) {
    return null;
  }

  if (rawKey.startsWith("base64:")) {
    const decoded = Buffer.from(rawKey.slice("base64:".length), "base64");

    if (decoded.length === 32) {
      return decoded;
    }
  }

  if (rawKey.startsWith("hex:")) {
    const decoded = Buffer.from(rawKey.slice("hex:".length), "hex");

    if (decoded.length === 32) {
      return decoded;
    }
  }

  return createHash("sha256").update(rawKey, "utf8").digest();
}

function deriveSupabaseServiceRoleFallbackKey() {
  const rawKey = process.env[SUPABASE_SERVICE_ROLE_ENV_NAME]?.trim();

  if (!rawKey) {
    return null;
  }

  return createHash("sha256")
    .update(SUPABASE_SERVICE_ROLE_FALLBACK_DOMAIN, "utf8")
    .update("\0", "utf8")
    .update(rawKey, "utf8")
    .digest();
}

function parseJsonKeyring(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const rawKeys = record.keys;

    if (!rawKeys || typeof rawKeys !== "object" || Array.isArray(rawKeys)) {
      return null;
    }

    return {
      activeKeyId:
        typeof record.activeKeyId === "string"
          ? record.activeKeyId
          : typeof record.active === "string"
            ? record.active
            : typeof record.primary === "string"
              ? record.primary
              : "",
      entries: Object.entries(rawKeys as Record<string, unknown>)
        .map(([keyId, keyValue]) => [keyId, typeof keyValue === "string" ? keyValue : ""] as const)
        .filter(([, keyValue]) => keyValue.trim()),
    };
  } catch {
    return null;
  }
}

function parseDelimitedKeyring(rawValue: string) {
  return rawValue
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return ["", ""] as const;
      }

      return [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)] as const;
    })
    .filter(([, keyValue]) => keyValue.trim());
}

function loadBackgroundFieldEncryptionKeyring() {
  const keys = new Map<string, Buffer>();
  const keyringValue = process.env[KEYRING_ENV_NAME]?.trim();
  const configuredActiveKeyId = normalizeKeyId(process.env[ACTIVE_KEY_ID_ENV_NAME] ?? "");
  const serviceRoleFallbackKey = deriveSupabaseServiceRoleFallbackKey();

  if (keyringValue) {
    const parsedKeyring = parseJsonKeyring(keyringValue);
    const entries = parsedKeyring?.entries ?? parseDelimitedKeyring(keyringValue);

    for (const [rawKeyId, rawKeyValue] of entries) {
      const keyId = normalizeKeyId(rawKeyId);
      const key = deriveBackgroundFieldEncryptionKey(rawKeyValue.trim());

      if (keyId && key) {
        keys.set(keyId, key);
      }
    }

    const explicitKeyIds = Array.from(keys.keys());
    if (serviceRoleFallbackKey && !keys.has(SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID)) {
      keys.set(SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID, serviceRoleFallbackKey);
    }

    const parsedActiveKeyId = normalizeKeyId(parsedKeyring?.activeKeyId ?? "");
    const activeKeyId =
      configuredActiveKeyId && keys.has(configuredActiveKeyId)
        ? configuredActiveKeyId
        : parsedActiveKeyId && keys.has(parsedActiveKeyId)
          ? parsedActiveKeyId
          : explicitKeyIds[0] ??
            (serviceRoleFallbackKey ? SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID : null);

    return { activeKeyId, keys };
  }

  const fallback = getFirstConfiguredEnvKey(KEY_ENV_NAMES);
  const fallbackKey = fallback ? deriveBackgroundFieldEncryptionKey(fallback.value) : null;

  if (fallbackKey) {
    keys.set(DEFAULT_KEY_ID, fallbackKey);
  }
  if (serviceRoleFallbackKey && !keys.has(SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID)) {
    keys.set(SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID, serviceRoleFallbackKey);
  }

  return {
    activeKeyId: fallbackKey
      ? DEFAULT_KEY_ID
      : serviceRoleFallbackKey
        ? SUPABASE_SERVICE_ROLE_FALLBACK_KEY_ID
        : null,
    keys,
  };
}

function getLegacyDecryptKeys(keyring = loadBackgroundFieldEncryptionKeyring()) {
  const candidates: Buffer[] = [];

  for (const envName of LEGACY_KEY_ENV_NAMES) {
    const rawKey = process.env[envName]?.trim();
    const derived = rawKey ? deriveBackgroundFieldEncryptionKey(rawKey) : null;

    if (derived && !candidates.some((candidate) => candidate.equals(derived))) {
      candidates.push(derived);
    }
  }

  for (const key of keyring.keys.values()) {
    if (!candidates.some((candidate) => candidate.equals(key))) {
      candidates.push(key);
    }
  }

  return candidates;
}

export function hasBackgroundFieldEncryptionKey() {
  return Boolean(loadBackgroundFieldEncryptionKeyring().activeKeyId);
}

export function getBackgroundFieldEncryptionKeyStatus(): BackgroundFieldEncryptionKeyStatus {
  const keyring = loadBackgroundFieldEncryptionKeyring();
  const configuredKeyIds = Array.from(keyring.keys.keys()).sort();

  return {
    activeKeyId: keyring.activeKeyId,
    activeVersion: BACKGROUND_FIELD_ENCRYPTION_VERSION,
    configuredKeyIds,
    legacyDecryptCandidateCount: getLegacyDecryptKeys(keyring).length,
    rotationReady: configuredKeyIds.length > 1,
  };
}

function getAad(version: string, fieldKey: string) {
  return Buffer.from(`moral-trade:${version}:${fieldKey}`, "utf8");
}

export function isEncryptedBackgroundText(value: string | null | undefined) {
  return (
    typeof value === "string" &&
    (value.startsWith(`${ENCRYPTED_PREFIX_V1}:`) ||
      value.startsWith(`${ENCRYPTED_PREFIX_V2}:`))
  );
}

export function encryptBackgroundSensitiveText(value: string, fieldKey: string) {
  const keyring = loadBackgroundFieldEncryptionKeyring();
  const key = keyring.activeKeyId ? keyring.keys.get(keyring.activeKeyId) : null;
  const plaintext = value.trim();

  if (!plaintext) {
    return "";
  }

  if (!key) {
    throw new Error(
      "BACKGROUND_FIELD_ENCRYPTION_KEYS, BACKGROUND_FIELD_ENCRYPTION_KEY, or SUPABASE_SERVICE_ROLE_KEY is required before saving private background-networking text.",
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  cipher.setAAD(getAad(BACKGROUND_FIELD_ENCRYPTION_VERSION, fieldKey));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX_V2,
    keyring.activeKeyId,
    base64UrlEncode(iv),
    base64UrlEncode(tag),
    base64UrlEncode(ciphertext),
  ].join(":");
}

function decryptWithKey({
  ciphertextValue,
  fieldKey,
  ivValue,
  key,
  tagValue,
  version,
}: {
  ciphertextValue: string;
  fieldKey: string;
  ivValue: string;
  key: Buffer;
  tagValue: string;
  version: string;
}) {
  const decipher = createDecipheriv(CIPHER_ALGORITHM, key, base64UrlDecode(ivValue));
  decipher.setAAD(getAad(version, fieldKey));
  decipher.setAuthTag(base64UrlDecode(tagValue));

  return Buffer.concat([
    decipher.update(base64UrlDecode(ciphertextValue)),
    decipher.final(),
  ]).toString("utf8");
}

export function decryptBackgroundSensitiveText(
  value: string | null | undefined,
  fieldKey: string,
) {
  if (!value) {
    return "";
  }

  if (!isEncryptedBackgroundText(value)) {
    return value;
  }

  const parts = value.split(":");

  if (parts[0] === "bgenc" && parts[1] === "v2") {
    const [, , keyId, ivValue, tagValue, ciphertextValue] = parts;
    const normalizedKeyId = normalizeKeyId(keyId ?? "");
    const keyring = loadBackgroundFieldEncryptionKeyring();
    const key = normalizedKeyId ? keyring.keys.get(normalizedKeyId) : null;

    if (!key || !ivValue || !tagValue || !ciphertextValue) {
      return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
    }

    try {
      return decryptWithKey({
        ciphertextValue,
        fieldKey,
        ivValue,
        key,
        tagValue,
        version: BACKGROUND_FIELD_ENCRYPTION_VERSION,
      });
    } catch {
      return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
    }
  }

  const [, , ivValue, tagValue, ciphertextValue] = parts;

  if (!ivValue || !tagValue || !ciphertextValue) {
    return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
  }

  for (const key of getLegacyDecryptKeys()) {
    try {
      return decryptWithKey({
        ciphertextValue,
        fieldKey,
        ivValue,
        key,
        tagValue,
        version: BACKGROUND_LEGACY_FIELD_ENCRYPTION_VERSION,
      });
    } catch {
      // Try the next legacy candidate.
    }
  }

  return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
}

export function normalizeEncryptedFieldMap(value: unknown): SensitiveTextFieldMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, typeof entry === "string" ? entry : ""] as const)
      .filter(([, entry]) => entry),
  );
}

export function prepareEncryptedFields(fields: SensitiveTextFieldMap): PreparedEncryptedFields {
  const ciphertexts: SensitiveTextFieldMap = {};
  const plaintextFields: SensitiveTextFieldMap = {};

  for (const [fieldKey, value] of Object.entries(fields)) {
    const plaintext = value.trim();

    if (!plaintext) {
      plaintextFields[fieldKey] = "";
      continue;
    }

    ciphertexts[fieldKey] = encryptBackgroundSensitiveText(plaintext, fieldKey);
    plaintextFields[fieldKey] = BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER;
  }

  return {
    ciphertexts,
    plaintextFields,
    version: Object.keys(ciphertexts).length ? BACKGROUND_FIELD_ENCRYPTION_VERSION : "",
  };
}

export function overlayEncryptedFields<T extends Record<string, unknown>>({
  encryptedFields,
  fieldKeys,
  row,
}: {
  encryptedFields: unknown;
  fieldKeys: string[];
  row: T;
}): T {
  const ciphertexts = normalizeEncryptedFieldMap(encryptedFields);

  if (!Object.keys(ciphertexts).length) {
    return row;
  }

  const nextRow: Record<string, unknown> = { ...row };

  for (const fieldKey of fieldKeys) {
    const ciphertext = ciphertexts[fieldKey];

    if (ciphertext) {
      nextRow[fieldKey] = decryptBackgroundSensitiveText(ciphertext, fieldKey);
    }
  }

  return nextRow as T;
}

export function redactEncryptedFieldExport<T extends Record<string, unknown>>({
  encryptedFields,
  fieldKeys,
  row,
}: {
  encryptedFields: unknown;
  fieldKeys: string[];
  row: T;
}) {
  const decrypted = overlayEncryptedFields({ encryptedFields, fieldKeys, row });

  return decrypted;
}

export function prepareRecordSensitiveTextFields<T extends SensitiveTextFieldMap>(
  fields: T,
) {
  return prepareEncryptedFields(fields);
}

export function prepareEncryptedWishEntryBody(value: string) {
  const ciphertext = encryptBackgroundSensitiveText(value, "wish_entries.body");

  return {
    body: value.trim() ? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER : "",
    body_ciphertext: ciphertext,
    body_encryption_version: ciphertext ? BACKGROUND_FIELD_ENCRYPTION_VERSION : "",
  };
}

export function overlayEncryptedWishEntryBody<T extends Record<string, unknown>>(row: T): T {
  const ciphertext = typeof row.body_ciphertext === "string" ? row.body_ciphertext : "";

  if (!ciphertext) {
    return row;
  }

  return {
    ...row,
    body: decryptBackgroundSensitiveText(ciphertext, "wish_entries.body"),
  };
}

export function overlayBackgroundRecordSensitiveText<T extends Record<string, unknown>>(
  row: T,
  fieldKeys: readonly string[],
): T {
  return overlayEncryptedFields({
    encryptedFields: row.sensitive_ciphertexts,
    fieldKeys: [...fieldKeys],
    row,
  });
}
