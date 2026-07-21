import assert from "node:assert/strict";
import test from "node:test";

import {
  findTradeTemplateGuideResult,
  getPledgeTemplateInitialValues,
  getTradeDraftTemplateLabel,
  getTradeTemplateLibraryEntry,
  TRADE_TEMPLATE_LIBRARY,
} from "./trade-template-library";

test("the template library exposes direct-use templates without pretending they are live offers", () => {
  assert.deepEqual(
    TRADE_TEMPLATE_LIBRARY.map((template) => template.id),
    [
      "pledge-swap",
      "donation-redirect",
      "skill-exchange",
      "threshold-coalition",
      "evidence-backed-favor",
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

test("template handoffs open the correct real composer without an anatomy interstitial", () => {
  assert.deepEqual(getTradeTemplateLibraryEntry("pledge-swap")?.handoff, {
    kind: "trade_draft",
    href: "/trades/new?template=reciprocal-mixed",
    label: "Use template →",
    note: "Opens the private card-stack editor with editable one-meal pledge terms.",
  });
  assert.equal(
    getTradeTemplateLibraryEntry("donation-redirect")?.handoff.href,
    "/offers/new?entry=draft&template=pure-opposed-cause&mode=offset",
  );
  assert.equal(
    getTradeTemplateLibraryEntry("threshold-coalition")?.handoff.href,
    "/mpgf/pools/new?template=threshold-coalition",
  );
  assert.equal(
    getTradeTemplateLibraryEntry("skill-exchange")?.handoff.href,
    "/trades/new?template=skill-exchange",
  );
  assert.equal(
    getTradeTemplateLibraryEntry("evidence-backed-favor")?.handoff.href,
    "/trades/new?template=evidence-backed-favor",
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

test("skill and favor templates prefill their actual private trade scaffold", () => {
  const skill = getPledgeTemplateInitialValues("skill-exchange");
  const favor = getPledgeTemplateInitialValues("evidence-backed-favor");

  assert.ok(skill);
  assert.match(skill.proposedAction, /defined review|deliverable/i);
  assert.match(skill.proposedAction, /\[Replace:/);
  assert.match(skill.evidenceRule, /acceptance checklist/i);
  assert.equal(getTradeDraftTemplateLabel("skill-exchange"), "Skill exchange");

  assert.ok(favor);
  assert.match(favor.proposedAction, /bounded favor/i);
  assert.match(favor.noTradeBaseline, /\[Replace:/);
  assert.match(favor.exitConditions, /unresolved/i);
  assert.equal(getTradeDraftTemplateLabel("evidence-backed-favor"), "Evidence-backed favor");
});

test("guided matching never contradicts the kind of thing the user wants to move", () => {
  assert.equal(
    findTradeTemplateGuideResult({
      moves: "money",
      coordination: "two_sides",
      trust: "honor",
    }).id,
    "donation-redirect",
  );
  assert.equal(
    findTradeTemplateGuideResult({
      moves: "project",
      coordination: "two_sides",
      trust: "evidence",
    }).id,
    "threshold-coalition",
  );
  assert.equal(
    findTradeTemplateGuideResult({
      moves: "skill",
      coordination: "group",
      trust: "conditional",
    }).id,
    "skill-exchange",
  );
});

test("the donation redirect contract distinguishes cancellation, destinations, and residual funds", () => {
  const redirect = getTradeTemplateLibraryEntry("donation-redirect");

  assert.ok(redirect);
  assert.equal(redirect.family, "Opposition cancellation");
  assert.match(redirect.summary, /neutralize matched opposed spending/i);
  assert.match(redirect.caveat, /destinations may be shared or chosen separately/i);
  assert.match(redirect.unmatchedRule ?? "", /return it|original destination/i);
});
