import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import { getCollectiveCommitmentMasterKey } from "@/lib/collective-commitments/config";

const AES_GCM_ALGORITHM = "aes-256-gcm";
const AES_GCM_IV_BYTES = 12;

export interface EncryptedPayload {
  ciphertextBase64: string;
  ivBase64: string;
  tagBase64: string;
}

function encryptBytes(key: Buffer, plaintext: Buffer, aad: Buffer): EncryptedPayload {
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv(AES_GCM_ALGORITHM, key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextBase64: ciphertext.toString("base64"),
    ivBase64: iv.toString("base64"),
    tagBase64: tag.toString("base64"),
  };
}

function decryptBytes(key: Buffer, payload: EncryptedPayload, aad: Buffer): Buffer {
  const decipher = createDecipheriv(
    AES_GCM_ALGORITHM,
    key,
    Buffer.from(payload.ivBase64, "base64"),
  );
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(payload.tagBase64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertextBase64, "base64")),
    decipher.final(),
  ]);
}

export function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256Hex(key: Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

export function generateCommitmentDataKey() {
  return randomBytes(32);
}

export function wrapCommitmentDataKey(commitmentId: string, dataKey: Buffer): EncryptedPayload {
  return encryptBytes(
    getCollectiveCommitmentMasterKey(),
    dataKey,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

export function unwrapCommitmentDataKey(
  commitmentId: string,
  payload: EncryptedPayload,
): Buffer {
  return decryptBytes(
    getCollectiveCommitmentMasterKey(),
    payload,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

function deriveKey(dataKey: Buffer, purpose: string) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      dataKey,
      Buffer.from("moral-trade-collective-commitments-v1", "utf8"),
      Buffer.from(purpose, "utf8"),
      32,
    ),
  );
}

export function deriveSignatureEncryptionKey(dataKey: Buffer) {
  return deriveKey(dataKey, "signature-encryption");
}

export function deriveAccountTokenKey(dataKey: Buffer) {
  return deriveKey(dataKey, "account-token");
}

export function deriveHumanTokenKey(dataKey: Buffer) {
  return deriveKey(dataKey, "human-token");
}

export function deriveRevealMacKey(dataKey: Buffer) {
  return deriveKey(dataKey, "reveal-manifest-mac");
}

export function encryptSignaturePayload(
  commitmentId: string,
  dataKey: Buffer,
  payload: object,
): EncryptedPayload {
  return encryptBytes(
    deriveSignatureEncryptionKey(dataKey),
    Buffer.from(JSON.stringify(payload), "utf8"),
    Buffer.from(`collective-signature:${commitmentId}`, "utf8"),
  );
}

export function decryptSignaturePayload<T>(
  commitmentId: string,
  dataKey: Buffer,
  payload: EncryptedPayload,
): T {
  const plaintext = decryptBytes(
    deriveSignatureEncryptionKey(dataKey),
    payload,
    Buffer.from(`collective-signature:${commitmentId}`, "utf8"),
  );
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export function createAccountToken(dataKey: Buffer, profileId: string) {
  return hmacSha256Hex(deriveAccountTokenKey(dataKey), profileId);
}

export function createHumanToken(dataKey: Buffer, humanUniquenessRefHash: string) {
  return hmacSha256Hex(deriveHumanTokenKey(dataKey), humanUniquenessRefHash);
}

export function createRevealNonce() {
  return randomBytes(24).toString("hex");
}

export function canonicalRevealString(input: {
  verifiedRealName: string;
  verifiedAffiliation: string | null;
  revealNonce: string;
}) {
  return [
    input.verifiedRealName.trim(),
    input.verifiedAffiliation?.trim() ?? "",
    input.revealNonce,
  ].join("\n");
}

export function createIdentityCommitment(
  dataKey: Buffer,
  input: {
    verifiedRealName: string;
    verifiedAffiliation: string | null;
    revealNonce: string;
  },
) {
  return hmacSha256Hex(deriveRevealMacKey(dataKey), canonicalRevealString(input));
}
