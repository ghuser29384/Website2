import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMoralTradeSafeEmailCopy,
  evaluateMoralTradeEmailOutboxSafety,
  type MoralTradeSafeEmailKind,
} from "@/lib/moral-trade/email-copy";

const EMAIL_KINDS: MoralTradeSafeEmailKind[] = [
  "offer_response_received",
  "response_accepted",
  "payment_reminder",
  "payment_schedule_update",
  "payment_confirmed",
  "payment_failed",
];

test("core Moral Trade email copy is generic and dashboard-directed", () => {
  for (const kind of EMAIL_KINDS) {
    const copy = buildMoralTradeSafeEmailCopy(kind);
    const rendered = `${copy.subject}\n${copy.body}`;

    assert.match(copy.subject, /^Moral Trade:/);
    assert.match(copy.body, /dashboard/i);
    assert.match(copy.body, /For privacy/i);
    assert.doesNotMatch(rendered, /\$\d|agreement [0-9a-f-]{8,}|secret@example\.com/i);
  }
});

test("core Moral Trade email copy names withheld sensitive surfaces", () => {
  const combined = EMAIL_KINDS.map((kind) => buildMoralTradeSafeEmailCopy(kind).body).join("\n");

  assert.match(combined, /participant aliases/);
  assert.match(combined, /offer terms/);
  assert.match(combined, /exact wishes/);
  assert.match(combined, /contact details/);
  assert.match(combined, /payment amounts/);
  assert.match(combined, /agreement IDs/);
  assert.match(combined, /evidence/);
  assert.match(combined, /source notes/);
});

test("Moral Trade email sender suppresses sensitive outbox rows before provider send", () => {
  const safeCopy = buildMoralTradeSafeEmailCopy("response_accepted");
  const safe = evaluateMoralTradeEmailOutboxSafety({
    body: safeCopy.body,
    provider: "manual",
    subject: safeCopy.subject,
  });
  const unsafe = evaluateMoralTradeEmailOutboxSafety({
    body:
      "Alice responded to animal welfare for global poverty. Contact secret@example.com and pay $42 for agreement 12345678-abcd.",
    provider: "manual",
    subject: "New response to your Moral Trade offer",
  });

  assert.equal(safe.status, "pass");
  assert.deepEqual(safe.blockers, []);
  assert.equal(unsafe.status, "suppress");
  assert.ok(unsafe.blockers.includes("contact_email_in_body"));
  assert.ok(unsafe.blockers.includes("payment_amount_in_body"));
  assert.ok(unsafe.blockers.includes("agreement_or_payment_identifier_in_body"));
  assert.ok(unsafe.blockers.includes("offer_terms_in_body"));
});

test("non-Moral Trade reminder providers can keep their separate email policy", () => {
  const result = evaluateMoralTradeEmailOutboxSafety({
    body: "A public-goods reminder is ready for campaign 12345678.",
    provider: "mpgf_public_goods_reminder_worker",
    subject: "MPGF reminder",
  });

  assert.equal(result.applies, false);
  assert.equal(result.status, "pass");
});
