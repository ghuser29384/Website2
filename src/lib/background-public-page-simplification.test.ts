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
    "id=\"concierge-intake\"",
  );

  assert.equal((source.match(/number: "0[1-5]"/g) ?? []).length, 5);
  assert.match(source, /Create a broad preview/);
  assert.match(source, /Choose the audience/);
  assert.match(source, /Request a reviewed search/);
  assert.match(source, /Review a possible opportunity/);
  assert.match(source, /Disclose only after consent/);
  assert.match(source, /Compatibility is not consent/);
  assert.match(source, /No autonomous outreach/);
  assert.doesNotMatch(source, /background-technical-details|BACKGROUND_PUBLIC_TECHNICAL_LINKS/);

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

test("bg85 trust pages lead with concise background summaries and preserve technical detail access", () => {
  const pages = [
    ["src/app/privacy/page.tsx", /Private details remain participant-controlled/, /details-panel/],
    ["src/app/safety/page.tsx", /Safety rules for voluntary moral trade/, /operational controls|health/],
    ["src/app/measurement/page.tsx", /Measure useful cooperation, not moral worth/, /details-panel/],
    ["src/app/transparency/page.tsx", /Public counts without public case files/, /BACKGROUND_PUBLIC_TECHNICAL_LINKS/],
    ["src/app/accessibility/page.tsx", /Accessible review is part of trust/, /known limitations|test every review/i],
  ] as const;

  for (const [path, heading, technicalAccess] of pages) {
    const source = pageSource(path);
    assert.match(source, heading, path);
    assert.match(source, /private matching|Background networking|broad preview|consent|privacy-safe|review/i, path);
    assert.match(source, technicalAccess, path);
  }

  for (const summary of Object.values(BACKGROUND_PUBLIC_PAGE_SUMMARIES)) {
    assert.ok(summary.summary.length < 240, summary.heading);
  }
});
