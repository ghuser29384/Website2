import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMoralTradeEmailOutboxSafety } from "@/lib/moral-trade/email-copy";

test("configured commitment reminder copy passes the email privacy gate", () => {
  const result = evaluateMoralTradeEmailOutboxSafety({
    provider: "configured_trade_reminder",
    subject: "Moral Trade: Verification due is approaching",
    body:
      "A private Moral Trade reminder is ready. Sign in at https://www.moraltrade.org/trade-agreements/11111111-2222-4333-8444-555555555555/reminders?view=timeline. This email does not include participant names, private terms, payment information, or evidence.",
  });

  assert.equal(result.applies, true);
  assert.equal(result.status, "pass");
  assert.deepEqual(result.blockers, []);
});
