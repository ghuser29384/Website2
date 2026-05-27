import assert from "node:assert/strict";
import test from "node:test";

import { buildSafeWishNotificationEmailCopy } from "@/lib/background-notifications";

test("safe background notification emails omit notification body details", () => {
  const copy = buildSafeWishNotificationEmailCopy(
    {
      kind: "match",
    },
    "https://moraltrade.test",
  );

  assert.equal(copy.subject, "Moral Trade: possible counterparty update");
  assert.match(copy.body, /dashboard/);
  assert.match(copy.body, /leaves out exact wishes/);
  assert.doesNotMatch(copy.body, /secret@example\.com/i);
  assert.doesNotMatch(copy.body, /private query label/i);
});

test("safe background notification email subjects are generic by channel", () => {
  assert.equal(
    buildSafeWishNotificationEmailCopy({ kind: "consent" }, "https://moraltrade.test").subject,
    "Moral Trade: consent update",
  );
  assert.equal(
    buildSafeWishNotificationEmailCopy({ kind: "safety" }, "https://moraltrade.test").subject,
    "Moral Trade: review update",
  );
  assert.equal(
    buildSafeWishNotificationEmailCopy({ kind: "system" }, "https://moraltrade.test").subject,
    "Moral Trade: background networking update",
  );
});
