import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const BACKGROUND_FIELD_ENCRYPTION_VERSION = "bg-field-v1";
export const BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER = "[encrypted private field]";
export const BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE = "[encrypted private field unavailable]";

const CIPHER_ALGORITHM = "aes-256-gcm";
const ENCRYPTED_PREFIX = "bgenc:v1";
const KEY_ENV_NAMES = ["BACKGROUND_FIELD_ENCRYPTION_KEY", "MORAL_TRADE_FIELD_ENCRYPTION_KEY"];

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

export interface PreparedEncryptedFields {
  ciphertexts: SensitiveTextFieldMap;
  plaintextFields: SensitiveTextFieldMap;
  version: string;
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

function getRawEncryptionKey() {
  for (const envName of KEY_ENV_NAMES) {
    const value = process.env[envName]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function hasBackgroundFieldEncryptionKey() {
  return Boolean(getRawEncryptionKey());
}

function deriveBackgroundFieldEncryptionKey() {
  const rawKey = getRawEncryptionKey();

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

function getAad(fieldKey: string) {
  return Buffer.from(`moral-trade:${BACKGROUND_FIELD_ENCRYPTION_VERSION}:${fieldKey}`, "utf8");
}

export function isEncryptedBackgroundText(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptBackgroundSensitiveText(value: string, fieldKey: string) {
  const key = deriveBackgroundFieldEncryptionKey();
  const plaintext = value.trim();

  if (!plaintext) {
    return "";
  }

  if (!key) {
    throw new Error(
      "BACKGROUND_FIELD_ENCRYPTION_KEY is required before saving private background-networking text.",
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  cipher.setAAD(getAad(fieldKey));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    base64UrlEncode(iv),
    base64UrlEncode(tag),
    base64UrlEncode(ciphertext),
  ].join(":");
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

  const key = deriveBackgroundFieldEncryptionKey();

  if (!key) {
    return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
  }

  const [, , ivValue, tagValue, ciphertextValue] = value.split(":");

  if (!ivValue || !tagValue || !ciphertextValue) {
    return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
  }

  try {
    const decipher = createDecipheriv(CIPHER_ALGORITHM, key, base64UrlDecode(ivValue));
    decipher.setAAD(getAad(fieldKey));
    decipher.setAuthTag(base64UrlDecode(tagValue));

    return Buffer.concat([
      decipher.update(base64UrlDecode(ciphertextValue)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE;
  }
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
