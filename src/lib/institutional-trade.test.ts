import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionInstitutionalDeal,
  hashInstitutionalTerms,
  interpretInstitutionalCommand,
  parseInstitutionalMoneyToCents,
  stableInstitutionalJson,
  validateSupportedInstitutionalWebhookEvents,
} from "./institutional-trade";

test("stable institutional hashes ignore object insertion order", () => {
  const first = { b: 2, a: { y: true, x: [3, 2, 1] } };
  const second = { a: { x: [3, 2, 1], y: true }, b: 2 };
  assert.equal(stableInstitutionalJson(first), stableInstitutionalJson(second));
  assert.equal(hashInstitutionalTerms(first), hashInstitutionalTerms(second));
  assert.match(hashInstitutionalTerms(first), /^[0-9a-f]{64}$/);
});

test("deal transitions fail closed", () => {
  assert.equal(canTransitionInstitutionalDeal("draft", "exploratory"), true);
  assert.equal(canTransitionInstitutionalDeal("completed", "execution"), false);
  assert.equal(canTransitionInstitutionalDeal("unknown", "signed"), false);
});

test("money parsing remains exact to cents", () => {
  assert.equal(parseInstitutionalMoneyToCents("100"), 10_000);
  assert.equal(parseInstitutionalMoneyToCents("0.01"), 1);
  assert.throws(() => parseInstitutionalMoneyToCents("1.001"), /two decimal places/);
  assert.throws(() => parseInstitutionalMoneyToCents("-1"), /non-negative/);
});

test("Command remains draft-only and never claims binding authority", () => {
  const draft = interpretInstitutionalCommand("Prepare a board approval packet for the secondment");
  assert.equal(draft.intent, "prepare_board_packet");
  assert.equal(draft.binding, false);
  assert.equal(draft.requiresConfirmation, true);
  assert.match(draft.explanation, /cannot approve, sign, reserve funds, activate a pool/i);
});

test("webhook event allowlist rejects wildcards and unknown events", () => {
  assert.deepEqual(validateSupportedInstitutionalWebhookEvents(["deal.signed", "deal.signed", "pool.activated"]), ["deal.signed", "pool.activated"]);
  assert.throws(() => validateSupportedInstitutionalWebhookEvents(["*"]), /unsupported institutional webhook event/i);
  assert.throws(() => validateSupportedInstitutionalWebhookEvents([]), /select at least one/i);
});
