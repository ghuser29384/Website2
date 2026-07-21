import assert from "node:assert/strict";
import test from "node:test";

import {
  getPledgeTemplateInitialValues,
  getTradeTemplateLibraryEntry,
  TRADE_TEMPLATE_LIBRARY,
} from "./trade-template-library";

test("the template library exposes six compositional shapes without pretending they are live offers", () => {
  assert.deepEqual(
    TRADE_TEMPLATE_LIBRARY.map((template) => template.id),
    [
      "pledge-swap",
      "donation-redirect",
      "skill-exchange",
      "threshold-coalition",
      "evidence-backed-favor",
      "blank",
    ],
  );

  for (const template of TRADE_TEMPLATE_LIBRARY) {
    assert.ok(template.clauses.some((clause) => /baseline/i.test(clause)));
    assert.ok(template.clauses.some((clause) => /exit|failure|unresolved/i.test(clause)));
    assert.equal(template.signals.length, 4);
    assert.ok(template.signals.every((signal) => signal.level >= 1 && signal.level <= 4));
    assert.doesNotMatch(template.statusLabel, /live offer|completed|proven/i);
  }
});

test("template handoffs keep pledge drafts, donation offsets, and pools in distinct routes", () => {
  assert.deepEqual(getTradeTemplateLibraryEntry("pledge-swap")?.handoff, {
    kind: "trade_draft",
    href: "/trades/new?template=reciprocal-mixed",
    label: "Use reviewed starter",
    note: "Opens the real private card-stack editor with an editable reviewed micro-pledge example.",
  });
  assert.equal(
    getTradeTemplateLibraryEntry("donation-redirect")?.handoff.href,
    "/donation-offsets",
  );
  assert.match(
    getTradeTemplateLibraryEntry("donation-redirect")?.handoff.note ?? "",
    /no one-click offset draft/i,
  );
  assert.equal(
    getTradeTemplateLibraryEntry("threshold-coalition")?.handoff.href,
    "/create?mode=pool",
  );
  assert.equal(getTradeTemplateLibraryEntry("missing"), null);
});

test("only approved pledge seeds prefill the pledge-only card-stack editor", () => {
  const pledge = getPledgeTemplateInitialValues("reciprocal-mixed");

  assert.ok(pledge);
  assert.equal(pledge.offeredCause, "Animal welfare");
  assert.equal(pledge.requestedCause, "Global poverty");
  assert.match(pledge.proposedAction, /one covered animal-product meal/i);
  assert.match(pledge.noTradeBaseline, /without this trade/i);
  assert.match(pledge.exitConditions, /pause|unresolved/i);
  assert.equal(getPledgeTemplateInitialValues("pure-opposed-cause"), null);
  assert.equal(getPledgeTemplateInitialValues("market-mediated"), null);
  assert.equal(getPledgeTemplateInitialValues("missing"), null);
});

test("the donation redirect anatomy distinguishes cancellation, destinations, and residual funds", () => {
  const redirect = getTradeTemplateLibraryEntry("donation-redirect");

  assert.ok(redirect);
  assert.equal(redirect.family, "Opposition cancellation");
  assert.match(redirect.summary, /neutralize matched opposed spending/i);
  assert.match(redirect.caveat, /destinations may be shared or chosen separately/i);
  assert.match(redirect.unmatchedRule ?? "", /return it|original destination/i);
});
