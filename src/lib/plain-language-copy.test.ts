import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { gunzipSync } from "node:zlib";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function filesUnder(path: string): string[] {
  const absolute = resolve(process.cwd(), path);
  return readdirSync(absolute).flatMap((name) => {
    const child = resolve(absolute, name);
    if (statSync(child).isDirectory()) return filesUnder(child);
    return /\.(?:tsx|jsx|html|js)$/.test(name) ? [child] : [];
  });
}

function compressedSource(paths: string[]) {
  const encoded = paths.map(source).join("");
  return gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
}

const discoverChunkPaths = Array.from(
  { length: 7 },
  (_, index) => `public/discover/payload/${index}.txt`,
);

const feedChunkPaths = [
  "0a",
  "0b",
  "0c",
  "0d",
  "1",
  "2",
  "3",
  "4a",
  "4b",
  "4c",
  "4d",
  "5a",
  "5b",
  "5c",
  "5d",
].map((part) => `public/mt-live-0d0e0f03-${part}.txt`);

test("user-facing source does not use the word the product owner rejected", () => {
  const rejectedWord = ["dos", "sier"].join("");
  const readableSources = [
    ...filesUnder("src/app"),
    ...filesUnder("src/components"),
    ...filesUnder("public").filter((path) => !path.includes("/payload/")),
  ];

  for (const path of readableSources) {
    const content = readFileSync(path, "utf8");
    assert.doesNotMatch(content, new RegExp(`\\b${rejectedWord}s?\\b`, "i"), path);
  }

  assert.doesNotMatch(
    compressedSource(discoverChunkPaths),
    new RegExp(`\\b${rejectedWord}s?\\b`, "i"),
  );
  assert.doesNotMatch(
    compressedSource(feedChunkPaths),
    new RegExp(`\\b${rejectedWord}s?\\b`, "i"),
  );
});

test("core product pages use the approved plain-language terms", () => {
  const coreCopy = [
    source("src/app/evidence/[[...recordId]]/page.tsx"),
    source("src/components/evidence/evidence-stage.tsx"),
    source("src/app/offers/[offerId]/page.tsx"),
    source("src/app/agreements/[agreementId]/page.tsx"),
    source("src/app/trade-agreements/[agreementId]/page.tsx"),
    source("src/app/commitments/page.tsx"),
    source("src/components/core-trade/trade-draft-workbench.tsx"),
    source("src/components/core-trade/trade-agreement-stage.tsx"),
    source("src/components/trade-controls/trade-controls-workspace.tsx"),
    source("src/components/backing/backing-create-form.tsx"),
    source("src/app/trades/new/page.tsx"),
    source("src/app/trades/[offerId]/manage/page.tsx"),
    source("src/app/offers/page.tsx"),
    source("src/app/offers/offer-plane-inline-client.tsx"),
    source("src/components/layout/site-footer.tsx"),
    source("src/lib/site-search.ts"),
    source("public/moral-trade-live-now.js"),
    source("public/moral-trade-live-custom-route.js"),
    compressedSource(discoverChunkPaths),
    compressedSource(feedChunkPaths),
  ].join("\n");

  for (const phrase of [
    "Global evidence ledger",
    "public-safe artifacts",
    "Counterfactual declaration",
    "Manual attestation",
    "Maximum burden or exposure",
    "Point shape · mechanism",
    "Value field",
    "Counterfactual Integrity Check",
    "Threshold Settlement and Revalidation",
    "Protocol surface",
    "Participant attestation",
    "Evidence burden",
    "Maximum exposure",
  ]) {
    assert.doesNotMatch(coreCopy, new RegExp(phrase, "i"), phrase);
  }

  for (const phrase of [
    "Evidence from all trades",
    "Why this trade changes what happens",
    "Most this could cost you",
    "Point shape · offer type",
    "Find a trade that works for you",
    "Your priorities choose the causes",
    "Did the trade cause the action?",
    "Check before money moves",
    "This page does not move or hold money",
    "Request review",
  ]) {
    assert.match(coreCopy, new RegExp(phrase, "i"), phrase);
  }
});
