import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../src/discover/moral-trade-discover.source.html", import.meta.url),
  "utf8",
);

function evaluateOfferContract() {
  const start = source.indexOf("const offers = [");
  const end = source.indexOf("\n\nconst pools = [", start);
  assert.notEqual(start, -1, "canonical Discover source must define offers");
  assert.notEqual(end, -1, "canonical Discover source must define pools after offers");

  const context = vm.createContext({ structuredClone });
  const contractSource = `${source.slice(start, end)}\n
globalThis.__contract = {
  offers,
  exchangeProfiles,
  exchangeFlexibilityLabels,
  offerTypeLabels,
  returnTypeLabels,
  validateOfferExchange,
  exchangeGroupsAreConcrete,
};`;
  vm.runInContext(contractSource, context, { timeout: 1_000 });
  return context.__contract;
}

const contract = evaluateOfferContract();

function functionBody(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `source must define ${name}`);
  const next = source.indexOf("\nfunction ", start + 10);
  return source.slice(start, next === -1 ? source.length : next);
}

test("every published Discover offer has a concrete two-sided exchange", () => {
  assert.equal(contract.offers.length, 12);
  const blockers = Array.from(contract.offers, (offer) =>
    Array.from(offer.publicationBlockers, (blocker) => `${offer.id}: ${blocker}`),
  ).flat();
  assert.equal(blockers.length, 0, blockers.join("\n"));

  for (const offer of contract.offers) {
    assert.ok(offer.exchange, `${offer.id} must have an exchange profile`);
    assert.ok(
      contract.exchangeGroupsAreConcrete(offer.exchange.offer.alternatives),
      `${offer.id} must have concrete You offer obligations`,
    );
    assert.ok(
      contract.exchangeGroupsAreConcrete(offer.exchange.return.alternatives),
      `${offer.id} must have concrete You get outcomes`,
    );
    assert.ok(
      contract.exchangeFlexibilityLabels[offer.exchange.offer.flexibility],
      `${offer.id} must expose You offer negotiability`,
    );
    assert.ok(
      contract.exchangeFlexibilityLabels[offer.exchange.return.flexibility],
      `${offer.id} must expose You get negotiability`,
    );
    assert.ok(offer.exchange.return.recipient, `${offer.id} must name a return recipient`);
    assert.ok(offer.proof && offer.evidenceLevel, `${offer.id} must expose proof conditions`);

    if (offer.exchange.return.amount > 0) {
      const returnTerms = offer.exchange.return.alternatives.flat().join(" ");
      assert.match(
        returnTerms,
        new RegExp(`\\$${offer.exchange.return.amount}\\b`),
        `${offer.id} must state the exact monetary return`,
      );
    }
  }
});

test("publication validation blocks missing or vague exchange sides", () => {
  const missing = contract.validateOfferExchange({
    id: "missing-two-sided-profile",
    deadline: "2026-08-01",
    proof: "Receipt",
    evidenceLevel: "Receipt review",
  });
  assert.ok(missing.includes("missing structured exchange profile"));
  assert.ok(missing.includes("missing concrete You offer obligations"));
  assert.ok(missing.includes("missing concrete You get outcomes"));

  contract.exchangeProfiles["vague-two-sided-profile"] = {
    offer: { flexibility: "fixed", types: ["action"], alternatives: [["Mutual benefit"]] },
    return: { flexibility: "fixed", types: ["payment"], alternatives: [["Details to be agreed"]] },
    acceptanceMode: "approval",
    counteroffersAllowed: true,
  };
  const vague = contract.validateOfferExchange({
    id: "vague-two-sided-profile",
    deadline: "2026-08-01",
    proof: "Receipt",
    evidenceLevel: "Receipt review",
  });
  assert.ok(vague.includes("missing concrete You offer obligations"));
  assert.ok(vague.includes("missing concrete You get outcomes"));
});

test("the list contract renders both sides, all obligations, and distinct response paths", () => {
  const row = functionBody("renderOfferRow");
  const alternatives = functionBody("renderExchangeAlternatives");
  assert.match(row, /renderExchangeSide\(item, 'offer'\)/);
  assert.match(row, /renderExchangeSide\(item, 'return'\)/);
  assert.match(row, /Request exact match|exactMatchLabel/);
  assert.match(row, /Counteroffer/);
  assert.match(row, /Full terms/);
  assert.doesNotMatch(row, /requester-cell|mechanism-cell|deadline-cell/);
  assert.match(alternatives, /groups\.map/);
  assert.match(alternatives, /exchange-or/);
  assert.doesNotMatch(alternatives, /\+\$\{.*more/);
});

test("structured search and filters cover both exchange sides", () => {
  for (const token of [
    'data-filter="offer-type"',
    'data-filter="return-type"',
    'data-filter="min-return"',
    'data-filter="recipient"',
    'data-filter="evidence"',
    'data-filter="deadline"',
    'data-filter="flexibility"',
  ]) {
    assert.ok(source.includes(token), `source must include ${token}`);
  }

  const match = functionBody("offerMatch");
  assert.match(match, /exchangeTypesMatch\(constraints\.offerTypes/);
  assert.match(match, /exchangeTypesMatch\(constraints\.returnTypes/);
  assert.match(match, /minimumReturnAmount/);
  assert.match(match, /recipientText/);
  assert.match(match, /evidenceText/);
  assert.match(match, /flexibilities/);
});

test("desktop and mobile layout contracts keep both sides visible", () => {
  assert.match(source, /\.exchange-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 38px minmax\(0, 1fr\)/);
  assert.match(source, /@media[\s\S]*\.exchange-grid\s*\{\s*display:\s*block/);
  assert.match(source, /\.exchange-side\[data-exchange-side="return"\][\s\S]*border-top/);
  assert.match(source, /\.offer-context-title[\s\S]*font:\s*13px/);
  assert.match(source, /\.exchange-obligations li:first-child[\s\S]*font:\s*19px/);
});
