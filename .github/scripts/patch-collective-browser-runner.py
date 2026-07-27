#!/usr/bin/env python3
from pathlib import Path

SCRIPT = Path('.github/scripts/collective-commitments-adversarial-browser-qa.mjs')


def replace_exact(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one {label}; found {count}.')
    return text.replace(old, new)

script = SCRIPT.read_text()
script = replace_exact(
    script,
    'import { createHash, randomUUID } from "node:crypto";\n',
    '''import {\n  createCipheriv,\n  createDecipheriv,\n  createHash,\n  createHmac,\n  hkdfSync,\n  randomBytes,\n  randomUUID,\n} from "node:crypto";\n''',
    'node crypto import',
)
script = replace_exact(
    script,
    '''import {\n  createAccountToken,\n  createHumanToken,\n  createIdentityCommitment,\n  createRevealNonce,\n  deriveRevealMacKey,\n  encryptSignaturePayload,\n  unwrapCommitmentDataKey,\n} from "../../src/lib/collective-commitments/crypto.ts";\n\n''',
    '',
    'application crypto import',
)
helpers = r'''const encodedMasterKey = required("COLLECTIVE_COMMITMENT_MASTER_KEY");
const collectiveMasterKey = Buffer.from(encodedMasterKey, "base64");
if (collectiveMasterKey.length !== 32) {
  throw new Error("COLLECTIVE_COMMITMENT_MASTER_KEY must decode to exactly 32 bytes.");
}

const AES_GCM_ALGORITHM = "aes-256-gcm";
const AES_GCM_IV_BYTES = 12;

function hmacSha256Hex(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function decryptBytes(key, payload, aad) {
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

function encryptBytes(key, plaintext, aad) {
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

function deriveKey(dataKey, purpose) {
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

function deriveSignatureEncryptionKey(dataKey) {
  return deriveKey(dataKey, "signature-encryption");
}

function deriveAccountTokenKey(dataKey) {
  return deriveKey(dataKey, "account-token");
}

function deriveHumanTokenKey(dataKey) {
  return deriveKey(dataKey, "human-token");
}

function deriveRevealMacKey(dataKey) {
  return deriveKey(dataKey, "reveal-manifest-mac");
}

function unwrapCommitmentDataKey(commitmentId, payload) {
  return decryptBytes(
    collectiveMasterKey,
    payload,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

function createAccountToken(dataKey, profileId) {
  return hmacSha256Hex(deriveAccountTokenKey(dataKey), profileId);
}

function createHumanToken(dataKey, humanUniquenessRefHash) {
  return hmacSha256Hex(deriveHumanTokenKey(dataKey), humanUniquenessRefHash);
}

function createRevealNonce() {
  return randomBytes(24).toString("hex");
}

function canonicalRevealString({ verifiedRealName, verifiedAffiliation, revealNonce }) {
  return [verifiedRealName.trim(), verifiedAffiliation?.trim() ?? "", revealNonce].join("\n");
}

function createIdentityCommitment(dataKey, input) {
  return hmacSha256Hex(deriveRevealMacKey(dataKey), canonicalRevealString(input));
}

function encryptSignaturePayload(commitmentId, dataKey, payload) {
  return encryptBytes(
    deriveSignatureEncryptionKey(dataKey),
    Buffer.from(JSON.stringify(payload), "utf8"),
    Buffer.from(`collective-signature:${commitmentId}`, "utf8"),
  );
}

function decryptSignaturePayload(commitmentId, dataKey, payload) {
  const plaintext = decryptBytes(
    deriveSignatureEncryptionKey(dataKey),
    payload,
    Buffer.from(`collective-signature:${commitmentId}`, "utf8"),
  );
  return JSON.parse(plaintext.toString("utf8"));
}

'''
script = replace_exact(
    script,
    'const runTag = String(process.env.GITHUB_RUN_ID || Date.now());\n\n',
    'const runTag = String(process.env.GITHUB_RUN_ID || Date.now());\n\n' + helpers,
    'crypto helper insertion point',
)
script = replace_exact(
    script,
    '  const { decryptSignaturePayload } = await import("../../src/lib/collective-commitments/crypto.ts");\n',
    '',
    'dynamic application crypto import',
)
script = replace_exact(
    script,
    'await mkdir(artifactDir, { recursive: true });\n\ntry {',
    'await mkdir(artifactDir, { recursive: true });\nawait writeAudit();\n\ntry {',
    'initial audit write',
)
script = replace_exact(
    script,
    '  await writeAudit();\n}\n\nif (audit.outcome !== "pass") {',
    '''  try {
    await writeAudit();
  } catch (error) {
    console.error(`Could not write final QA audit: ${cleanError(error)}`);
    process.exitCode = 1;
  }
}

if (audit.outcome !== "pass") {''',
    'guarded final audit write',
)
SCRIPT.write_text(script)
