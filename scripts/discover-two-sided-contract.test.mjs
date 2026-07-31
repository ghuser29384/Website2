import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const sourceBuffer = await readFile(
  new URL("../src/discover/moral-trade-discover.source.html", import.meta.url),
);
const source = sourceBuffer.toString("utf8");
const loader = await readFile(
  new URL("../public/moral-trade-discover.html", import.meta.url),
  "utf8",
);
const payloadManifest = JSON.parse(
  await readFile(
    new URL("../public/discover/payload/manifest.json", import.meta.url),
    "utf8",
  ),
);

function evaluateOfferContract() {
  const start = source.indexOf("const offers = [");
  const end = source.indexOf("\n\nconst pools = [", start);
  assert.notEqual(start, -1, "canonical Discover source must define offers");
  assert.notEqual(end, -1, "canonical Discover source must define pools after offers");

  const context = vm.createContext({ structuredClone });
  const contractSource = `${source.slice(start, end)}\n\nglobalThis.__contract = {
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

test("the Discover loader content-versions, verifies, and recovers every payload request", () => {
  const expectedVersion = createHash("sha1")
    .update(Buffer.from(`blob ${sourceBuffer.length}\0`))
    .update(sourceBuffer)
    .digest("hex");

  assert.equal(payloadManifest.version, expectedVersion);
  assert.equal(payloadManifest.encoding, "gzip+base64");
  assert.deepEqual(payloadManifest.parts, [
    "0.txt",
    "1.txt",
    "2.txt",
    "3.txt",
    "4.txt",
    "5.txt",
    "6.txt",
  ]);
  assert.equal(payloadManifest.sourceBytes, sourceBuffer.length);
  assert.ok(loader.includes('const MANIFEST_PATH = "/discover/payload/manifest.json";'));
  assert.ok(loader.includes("fetchJson(MANIFEST_PATH, reloadToken)"));
  assert.ok(loader.includes('cache: "no-store"'));
  assert.ok(loader.includes("buildAssetUrl(path, manifest.version, reloadToken)"));
  assert.ok(
    loader.includes(
      "window.__MT_DISCOVER_PAYLOAD_VERSION__ = manifest.version;",
    ),
  );
  assert.ok(loader.includes("await verifyPayload(source, manifest);"));
  assert.ok(loader.includes("for (let attempt = 0; attempt < 2; attempt += 1)"));
  assert.ok(loader.includes('url.searchParams.set("reload", reloadToken)'));
  assert.ok(loader.includes("VERSIONED_BODY_ASSETS"));
  assert.ok(!loader.includes('cache: "force-cache"'));
  assert.ok(!loader.includes("manifest.parts.length !== 7"));
  assert.ok(
    !loader.includes(
      'const paths = [\n          "/discover/payload/0.txt"',
    ),
    "the loader must not fetch unversioned payload parts",
  );
});

test("every published Discover offer has a concrete two-sided exchange", () => {
  assert.equal(contract.offers.length, 14);
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
