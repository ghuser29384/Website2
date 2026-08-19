import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../src/discover/moral-trade-discover.source.html", import.meta.url),
  "utf8",
);

function evaluateDiscoverContract() {
  const start = source.indexOf("const offers = [");
  const peopleStart = source.indexOf("\n\nconst people = [", start);
  const legacyStart = source.indexOf("const legacyDiscoverItemMap = {");
  const legacyEnd = source.indexOf("\n\nconst today", legacyStart);
  assert.notEqual(start, -1, "canonical Discover source must define offers");
  assert.notEqual(peopleStart, -1, "canonical Discover source must define people after pools");
  assert.notEqual(legacyStart, -1, "canonical Discover source must define legacy item migration");
  assert.notEqual(legacyEnd, -1, "legacy item migration must end before today");

  const context = vm.createContext({ structuredClone });
  const contractSource = `${source.slice(start, peopleStart)}\n${source.slice(legacyStart, legacyEnd)}\n
globalThis.__contract = {
  offers,
  pools,
  exchangeProfiles,
  legacyDiscoverItemMap,
  validateOfferExchange,
};`;
  vm.runInContext(contractSource, context, { timeout: 1_000 });
  return context.__contract;
}

const contract = evaluateDiscoverContract();
const coFunds = Array.from(contract.offers).filter(
  (offer) => offer.listingKind === "co-fund",
);

function functionBody(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `source must define ${name}`);
  const next = source.indexOf("\nfunction ", start + 10);
  return source.slice(start, next === -1 ? source.length : next);
}

test("reciprocal group-funded trades are canonical Offers, not standalone Pools", () => {
  assert.deepEqual(
    coFunds.map((offer) => offer.id).sort(),
    ["cofund-bio-salary", "cofund-factory-transition"],
  );
  assert.equal(contract.pools.length, 3);
  assert.ok(!contract.pools.some((pool) => pool.id === "pool-bio-salary"));
  assert.ok(!contract.pools.some((pool) => pool.id === "pool-factory-transition"));

  assert.equal(contract.legacyDiscoverItemMap["pool-bio-salary"].type, "offer");
  assert.equal(contract.legacyDiscoverItemMap["pool-bio-salary"].id, "cofund-bio-salary");
  assert.equal(contract.legacyDiscoverItemMap["pool-factory-transition"].type, "offer");
  assert.equal(
    contract.legacyDiscoverItemMap["pool-factory-transition"].id,
    "cofund-factory-transition",
  );
});

test("every public Co-Fund exposes the full reciprocal and threshold contract", () => {
  for (const offer of coFunds) {
    assert.equal(offer.publicationBlockers.length, 0, offer.publicationBlockers.join("\n"));
    assert.ok(offer.counterparty, `${offer.id} must name the counterparty`);
    assert.ok(offer.exchange, `${offer.id} must have a reciprocal exchange profile`);
    assert.ok(offer.exchange.offer.alternatives.flat().length >= 3);
    assert.ok(offer.exchange.return.alternatives.flat().length >= 3);
    assert.equal(offer.exchange.counteroffersAllowed, false);

    const funding = offer.coFund;
    assert.ok(funding.threshold > 0);
    assert.ok(funding.funded >= 0 && funding.funded <= funding.threshold);
    assert.ok(funding.contributors > 0);
    assert.ok(funding.minimumContribution > 0);
    assert.ok(funding.maximumContribution >= funding.minimumContribution);
    assert.ok(funding.authorizationExpires);
    assert.ok(funding.failure);
    assert.ok(funding.activation);
  }
});


test("Co-Fund publication validation rejects incomplete funding terms", () => {
  const invalidMaximum = structuredClone(coFunds[0]);
  invalidMaximum.coFund.maximumContribution = 0;
  assert.ok(
    Array.from(contract.validateOfferExchange(invalidMaximum)).includes(
      "missing valid Co-Fund maximum contribution",
    ),
  );

  const unverified = structuredClone(coFunds[0]);
  unverified.verified = false;
  assert.ok(
    Array.from(contract.validateOfferExchange(unverified)).includes(
      "Co-Fund must pass verification before public discovery",
    ),
  );
});

test("Discover exposes a prominent Co-Fund subtype and a dedicated join path", () => {
  const switcher = functionBody("renderOfferKindSwitcher");
  const row = functionBody("renderOfferRow");
  const progress = functionBody("renderCoFundProgress");
  const inspector = functionBody("renderCoFundInspector");
  const parser = functionBody("parseCommand");

  assert.match(switcher, /All offers/);
  assert.match(switcher, /Individual offers/);
  assert.match(switcher, /Co-Funds/);
  assert.match(switcher, /data-offer-kind/);

  assert.match(row, /Join Co-Fund/);
  assert.match(row, /renderCoFundProgress\(item\)/);
  assert.match(progress, /data-cofund-progress/);
  assert.match(row, /data-offer-kind="\$\{item\.listingKind\}"/);
  assert.match(inspector, /The reciprocal trade/);
  assert.match(inspector, /Threshold and release conditions/);
  assert.match(inspector, /does not charge or create a payment authorization/);

  assert.match(parser, /asksForCoFund/);
  assert.match(parser, /constraints\.offerKind = 'co-fund'/);
  assert.match(parser, /collective fulfillment of one side of a reciprocal moral trade/);
});

test("Pools remain explicitly standalone threshold-funded moral public goods", () => {
  assert.match(source, /Standalone threshold pools/);
  assert.match(source, /without a reciprocal trade counterparty/);
  assert.match(source, /Standalone moral-public-good campaigns with no reciprocal counterparty obligation/);
});
