import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import test from "node:test";

import {
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
  BACKGROUND_LEGACY_FIELD_ENCRYPTION_VERSION,
  decryptBackgroundSensitiveText,
  encryptBackgroundSensitiveText,
  getBackgroundFieldEncryptionKeyStatus,
  overlayBackgroundRecordSensitiveText,
  overlayEncryptedWishEntryBody,
  prepareEncryptedWishEntryBody,
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";

const FIELD_ENCRYPTION_ENV_NAMES = [
  "BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID",
  "BACKGROUND_FIELD_ENCRYPTION_KEY",
  "BACKGROUND_FIELD_ENCRYPTION_KEYS",
  "BACKGROUND_FIELD_ENCRYPTION_LEGACY_KEY",
  "MORAL_TRADE_FIELD_ENCRYPTION_KEY",
] as const;

function withFieldEncryptionEnv(
  values: Partial<Record<(typeof FIELD_ENCRYPTION_ENV_NAMES)[number], string>>,
  callback: () => void,
) {
  const previousValues = Object.fromEntries(
    FIELD_ENCRYPTION_ENV_NAMES.map((envName) => [envName, process.env[envName]] as const),
  );

  for (const envName of FIELD_ENCRYPTION_ENV_NAMES) {
    delete process.env[envName];
  }

  for (const [envName, value] of Object.entries(values)) {
    if (value !== undefined) {
      process.env[envName] = value;
    }
  }

  try {
    callback();
  } finally {
    for (const envName of FIELD_ENCRYPTION_ENV_NAMES) {
      const previousValue = previousValues[envName];

      if (previousValue === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = previousValue;
      }
    }
  }
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function createLegacyCiphertext(value: string, fieldKey: string, rawKey: string) {
  const key = createHash("sha256").update(rawKey, "utf8").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`moral-trade:bg-field-v1:${fieldKey}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "bgenc",
    "v1",
    base64UrlEncode(iv),
    base64UrlEncode(tag),
    base64UrlEncode(ciphertext),
  ].join(":");
}

test("background field encryption round-trips without storing plaintext", () => {
  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_KEY: "test-only-background-field-encryption-key",
    },
    () => {
    const ciphertext = encryptBackgroundSensitiveText(
      "Find an animal welfare counterparty",
      "exact_wish",
    );

    assert.ok(ciphertext.startsWith("bgenc:v2:default:"));
    assert.equal(ciphertext.includes("animal welfare"), false);
    assert.equal(
      decryptBackgroundSensitiveText(ciphertext, "exact_wish"),
      "Find an animal welfare counterparty",
    );
    },
  );
});

test("sensitive record preparation stores placeholders and decryptable ciphertexts", () => {
  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_KEY: "test-only-background-field-encryption-key",
    },
    () => {
    const prepared = prepareRecordSensitiveTextFields({
      capabilities: "I can fund a pilot",
      constraints: "No public contact before consent",
    });

    assert.equal(prepared.version, BACKGROUND_FIELD_ENCRYPTION_VERSION);
    assert.equal(prepared.plaintextFields.capabilities, BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER);
    assert.equal(prepared.ciphertexts.capabilities.includes("fund a pilot"), false);

    const row = overlayBackgroundRecordSensitiveText(
      {
        capabilities: BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
        constraints: BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
        sensitive_ciphertexts: prepared.ciphertexts,
      },
      ["capabilities", "constraints"],
    );

    assert.equal(row.capabilities, "I can fund a pilot");
    assert.equal(row.constraints, "No public contact before consent");
    },
  );
});

test("wish entry body encryption uses a private placeholder", () => {
  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_KEY: "test-only-background-field-encryption-key",
    },
    () => {
    const prepared = prepareEncryptedWishEntryBody("Exact ask for a private intro");

    assert.equal(prepared.body, BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER);
    assert.equal(prepared.body_encryption_version, BACKGROUND_FIELD_ENCRYPTION_VERSION);
    assert.equal(prepared.body_ciphertext.includes("private intro"), false);

    const row = overlayEncryptedWishEntryBody({
      body: prepared.body,
      body_ciphertext: prepared.body_ciphertext,
    });

    assert.equal(row.body, "Exact ask for a private intro");
    },
  );
});

test("saving non-empty private text fails closed when no field key is configured", () => {
  withFieldEncryptionEnv({}, () => {
    assert.throws(
      () => prepareRecordSensitiveTextFields({ constraints: "Needs private review" }),
      /BACKGROUND_FIELD_ENCRYPTION_KEYS or BACKGROUND_FIELD_ENCRYPTION_KEY/,
    );
  });
});

test("background field encryption uses a versioned active key id for rotation", () => {
  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID: "current-2026-05",
      BACKGROUND_FIELD_ENCRYPTION_KEYS:
        "old-2026-04=old-background-key,current-2026-05=current-background-key",
    },
    () => {
      const status = getBackgroundFieldEncryptionKeyStatus();
      const ciphertext = encryptBackgroundSensitiveText("Rotate this exact wish", "exact_wish");

      assert.equal(status.activeKeyId, "current-2026-05");
      assert.equal(status.activeVersion, BACKGROUND_FIELD_ENCRYPTION_VERSION);
      assert.deepEqual(status.configuredKeyIds, ["current-2026-05", "old-2026-04"]);
      assert.equal(status.rotationReady, true);
      assert.ok(ciphertext.startsWith("bgenc:v2:current-2026-05:"));
      assert.equal(decryptBackgroundSensitiveText(ciphertext, "exact_wish"), "Rotate this exact wish");
    },
  );
});

test("background field encryption can read older key ids while encrypting with the active key", () => {
  let oldCiphertext = "";

  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID: "old-2026-04",
      BACKGROUND_FIELD_ENCRYPTION_KEYS:
        "old-2026-04=old-background-key,current-2026-05=current-background-key",
    },
    () => {
      oldCiphertext = encryptBackgroundSensitiveText("Previously encrypted wish", "exact_wish");
      assert.ok(oldCiphertext.startsWith("bgenc:v2:old-2026-04:"));
    },
  );

  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID: "current-2026-05",
      BACKGROUND_FIELD_ENCRYPTION_KEYS:
        "old-2026-04=old-background-key,current-2026-05=current-background-key",
    },
    () => {
      const newCiphertext = encryptBackgroundSensitiveText("New wish after rotation", "exact_wish");

      assert.equal(
        decryptBackgroundSensitiveText(oldCiphertext, "exact_wish"),
        "Previously encrypted wish",
      );
      assert.ok(newCiphertext.startsWith("bgenc:v2:current-2026-05:"));
      assert.equal(
        decryptBackgroundSensitiveText(newCiphertext, "exact_wish"),
        "New wish after rotation",
      );
    },
  );
});

test("background field encryption fails closed after an old key is removed", () => {
  let oldCiphertext = "";

  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID: "old-2026-04",
      BACKGROUND_FIELD_ENCRYPTION_KEYS: JSON.stringify({
        activeKeyId: "old-2026-04",
        keys: {
          "old-2026-04": "old-background-key",
          "current-2026-05": "current-background-key",
        },
      }),
    },
    () => {
      oldCiphertext = encryptBackgroundSensitiveText("Needs old key", "exact_wish");
    },
  );

  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_ACTIVE_KEY_ID: "current-2026-05",
      BACKGROUND_FIELD_ENCRYPTION_KEYS: JSON.stringify({
        activeKeyId: "current-2026-05",
        keys: {
          "current-2026-05": "current-background-key",
        },
      }),
    },
    () => {
      assert.equal(
        decryptBackgroundSensitiveText(oldCiphertext, "exact_wish"),
        BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
      );
    },
  );
});

test("background field encryption keeps legacy v1 decrypt support", () => {
  const legacyCiphertext = createLegacyCiphertext(
    "Legacy private wish",
    "exact_wish",
    "legacy-background-key",
  );

  withFieldEncryptionEnv(
    {
      BACKGROUND_FIELD_ENCRYPTION_LEGACY_KEY: "legacy-background-key",
    },
    () => {
      assert.equal(
        decryptBackgroundSensitiveText(legacyCiphertext, "exact_wish"),
        "Legacy private wish",
      );
      assert.equal(BACKGROUND_LEGACY_FIELD_ENCRYPTION_VERSION, "bg-field-v1");
    },
  );
});
