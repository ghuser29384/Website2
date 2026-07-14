import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_PUBLIC_BACKGROUND_HERO,
  BACKGROUND_PUBLIC_FORBIDDEN_DEFAULT_TERMS,
  BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS,
  BACKGROUND_PUBLIC_NOT_THIS,
  BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
  BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
  BACKGROUND_PUBLIC_PAGE_SUMMARIES,
  BACKGROUND_PUBLIC_PILOT_STATUS,
  BACKGROUND_PUBLIC_PROMISE,
  BACKGROUND_PUBLIC_REGISTRY_HERO,
  BACKGROUND_PUBLIC_SAFETY_CARDS,
  BACKGROUND_PUBLIC_TECHNICAL_LINKS,
  validateBackgroundPublicPageSimplificationSpec,
} from "@/lib/background-public-pages";

function pageSource(path: string) {
  return readFileSync(path, "utf8");
}

function visibleDefaultSource(source: string, startMarker: string, stopMarker: string) {
  const start = source.indexOf(startMarker);
  const stop = source.indexOf(stopMarker);

  assert.notEqual(start, -1, startMarker);
  assert.notEqual(stop, -1, stopMarker);
  assert.ok(stop > start, `${stopMarker} should follow ${startMarker}`);

  return source.slice(start, stop);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("bg85 public-page simplification spec is active and content-addressed", () => {
  const validation = validateBackgroundPublicPageSimplificationSpec();

  assert.equal(validation.status, "pass");
  assert.equal(validation.version, BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION);
  assert.equal(validation.hash, BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH);
  assert.equal(BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS.length, 5);
  assert.equal(BACKGROUND_PUBLIC_SAFETY_CARDS.length, 3);
  assert.equal(BACKGROUND_PUBLIC_PILOT_STATUS.length, 4);
  assert.ok(
    BACKGROUND_PUBLIC_TECHNICAL_LINKS.some((link) =>
      link.href.includes("private-overlap"),
    ),
  );
});

test("bg85 default public copy avoids governed internal jargon", () => {
  const defaultCopy = [
    BACKGROUND_PUBLIC_BACKGROUND_HERO,
    BACKGROUND_PUBLIC_REGISTRY_HERO,
    BACKGROUND_PUBLIC_PROMISE,
    ...BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS,
    ...BACKGROUND_PUBLIC_NOT_THIS,
    ...BACKGROUND_PUBLIC_SAFETY_CARDS.flatMap((card) => [card.title, card.body]),
    ...Object.values(BACKGROUND_PUBLIC_PAGE_SUMMARIES).flatMap((summary) => [
      summary.eyebrow,
      summary.heading,
      summary.summary,
      ...summary.cards,
    ]),
  ].join("\n");

  for (const term of BACKGROUND_PUBLIC_FORBIDDEN_DEFAULT_TERMS) {
    assert.doesNotMatch(defaultCopy, new RegExp(escapeRegExp(term), "i"), term);
  }
});

test("bg85 background explainer defaults to the five-step model and hides technical inventory", () => {
  const source = pageSource("src/app/background-networking/page.tsx");
  const defaultSource = visibleDefaultSource(
    source,
    "<header className=\"hero\">",
    "id=\"background-technical-details\"",
  );

  assert.match(source, /BACKGROUND_PUBLIC_BACKGROUND_HERO/);
  assert.match(source, /BACKGROUND_PUBLIC_PROMISE/);
  assert.match(source, /BACKGROUND_PUBLIC_SAFETY_CARDS/);
  assert.match(source, /BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS/);
  assert.match(source, /BACKGROUND_PUBLIC_PILOT_STATUS/);
  assert.match(source, /Technical details/);
  assert.match(source, /BACKGROUND_PUBLIC_TECHNICAL_LINKS/);

  for (const term of BACKGROUND_PUBLIC_FORBIDDEN_DEFAULT_TERMS) {
    assert.doesNotMatch(defaultSource, new RegExp(escapeRegExp(term), "i"), term);
  }
  assert.doesNotMatch(defaultSource, /factorCodes|currentBlockers|tableRequirements|JSON.stringify/);
});

test("bg85 wish registry is broad-preview browsing without implied contact or ranking", () => {
  const source = pageSource("src/app/wish-registry/page.tsx");
  const defaultSource = visibleDefaultSource(
    source,
    "<header className=\"hero\">",
    "id=\"registry-technical-details\"",
  );

  assert.match(source, /BACKGROUND_PUBLIC_REGISTRY_HERO/);
  assert.match(source, /More filters/);
  assert.match(source, /Broad preview only/);
  assert.match(source, /View broad profile/);
  assert.match(source, /Ask to explore/);
  assert.match(source, /No broad previews are available for that view/);
  assert.doesNotMatch(defaultSource, /\b(endorsement|exact match|contact available|ranked|ranking)\b/i);
  assert.doesNotMatch(defaultSource, /getWishRegistryCompatibilityBand/);
});

test("bg85 trust pages lead with concise background summaries and technical detail links", () => {
  const pages = [
    ["src/app/privacy/page.tsx", "privacy"],
    ["src/app/safety/page.tsx", "safety"],
    ["src/app/measurement/page.tsx", "measurement"],
    ["src/app/transparency/page.tsx", "transparency"],
    ["src/app/accessibility/page.tsx", "accessibility"],
  ] as const;

  for (const [path, key] of pages) {
    const source = pageSource(path);
    const summary = BACKGROUND_PUBLIC_PAGE_SUMMARIES[key];

    assert.match(source, new RegExp(`BACKGROUND_PUBLIC_PAGE_SUMMARIES\\.${key}`), path);
    assert.match(source, /BACKGROUND_PUBLIC_TECHNICAL_LINKS/, path);
    assert.match(source, /details-panel/, path);
    assert.ok(summary.summary.length < 240, key);
  }
});
