import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
  decryptBackgroundSensitiveText,
  encryptBackgroundSensitiveText,
  overlayBackgroundRecordSensitiveText,
  overlayEncryptedWishEntryBody,
  prepareEncryptedWishEntryBody,
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";

test("background field encryption round-trips without storing plaintext", () => {
  const previousKey = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = "test-only-background-field-encryption-key";

  try {
    const ciphertext = encryptBackgroundSensitiveText(
      "Find an animal welfare counterparty",
      "exact_wish",
    );

    assert.ok(ciphertext.startsWith("bgenc:v1:"));
    assert.equal(ciphertext.includes("animal welfare"), false);
    assert.equal(
      decryptBackgroundSensitiveText(ciphertext, "exact_wish"),
      "Find an animal welfare counterparty",
    );
  } finally {
    if (previousKey === undefined) {
      delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
    } else {
      process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previousKey;
    }
  }
});

test("sensitive record preparation stores placeholders and decryptable ciphertexts", () => {
  const previousKey = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = "test-only-background-field-encryption-key";

  try {
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
  } finally {
    if (previousKey === undefined) {
      delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
    } else {
      process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previousKey;
    }
  }
});

test("wish entry body encryption uses a private placeholder", () => {
  const previousKey = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = "test-only-background-field-encryption-key";

  try {
    const prepared = prepareEncryptedWishEntryBody("Exact ask for a private intro");

    assert.equal(prepared.body, BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER);
    assert.equal(prepared.body_encryption_version, BACKGROUND_FIELD_ENCRYPTION_VERSION);
    assert.equal(prepared.body_ciphertext.includes("private intro"), false);

    const row = overlayEncryptedWishEntryBody({
      body: prepared.body,
      body_ciphertext: prepared.body_ciphertext,
    });

    assert.equal(row.body, "Exact ask for a private intro");
  } finally {
    if (previousKey === undefined) {
      delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
    } else {
      process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previousKey;
    }
  }
});

test("saving non-empty private text fails closed when no field key is configured", () => {
  const previousKey = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  const previousFallbackKey = process.env.MORAL_TRADE_FIELD_ENCRYPTION_KEY;
  delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  delete process.env.MORAL_TRADE_FIELD_ENCRYPTION_KEY;

  try {
    assert.throws(
      () => prepareRecordSensitiveTextFields({ constraints: "Needs private review" }),
      /BACKGROUND_FIELD_ENCRYPTION_KEY/,
    );
  } finally {
    if (previousKey !== undefined) {
      process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previousKey;
    }
    if (previousFallbackKey !== undefined) {
      process.env.MORAL_TRADE_FIELD_ENCRYPTION_KEY = previousFallbackKey;
    }
  }
});
