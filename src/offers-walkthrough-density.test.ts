import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const densityStyles = readFileSync("src/app/offers/offers-density.module.css", "utf8");
const disclosureStyles = readFileSync("src/app/offers/offer-plane-disclosure.module.css", "utf8");
const planeMount = readFileSync("src/app/offers/offer-plane-inline-mount.tsx", "utf8");
const offersLayout = readFileSync("src/app/offers/layout.tsx", "utf8");
const topbarStyles = readFileSync("src/app/offers/offers-topbar.module.css", "utf8");
const participantComponent = readFileSync("src/components/marketplace/participant-offer-group.tsx", "utf8");
const participantStyles = readFileSync("src/components/marketplace/participant-offer-group.module.css", "utf8");

test("offers defaults to an open editorial directory instead of stacked dense panels", () => {
  for (const required of [
    "--offers-paper: #f7f3eb",
    ".mt-beta-strip",
    ".mt-explore-side",
    "form[data-smart-query-surface=\"offers\"]",
    ".mt-market-grid",
    ".mt-pool-link-grid",
  ]) {
    assert.ok(densityStyles.includes(required), `missing offers-density contract: ${required}`);
  }

  assert.match(
    densityStyles,
    /\.mt-market-grid\) \{[\s\S]*?grid-template-columns:\s*1fr;/,
    "the participant directory must remain a one-column register",
  );
  assert.match(
    densityStyles,
    /div:nth-of-type\(3\) > p\) \{[\s\S]*?display:\s*none !important;/,
    "the ranking formula must not dominate the default scan view",
  );
  assert.match(
    participantStyles,
    /\.group \{[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent;/,
    "participant groups must use open ruled layout rather than rounded nested cards",
  );
  assert.match(
    participantStyles,
    /\.offer \{[\s\S]*?grid-template-areas:/,
    "each exact proposal must use the compact editorial row layout",
  );
  assert.match(participantStyles, /\.actions :global\(\.button\)/);
  assert.match(participantComponent, /data-participant-offer-group/);
  assert.match(participantComponent, /data-participant-offer/);
  assert.match(participantComponent, /data-participant-exact-terms-note/);

  const noteIndex = participantComponent.indexOf("These are the owner&apos;s exact published terms");
  const offersMapIndex = participantComponent.indexOf("offers.map");
  assert.ok(noteIndex >= 0 && noteIndex < offersMapIndex, "the repeated truth note must appear once at group level");
});

test("the advanced challenge-return plane is optional, lazy-loaded, and request-deduplicated", () => {
  assert.match(planeMount, /if \(!queryState\.shouldShow \|\| !explorerOpen \|\| response\) return;/);
  assert.match(planeMount, /const requestRef = useRef/);
  assert.match(planeMount, /request\.attempt !== attempt/);
  assert.match(planeMount, /promise: loadOfferPlane\(\)/);
  assert.match(planeMount, /<details/);
  assert.match(planeMount, /Optional visual explorer/);
  assert.match(planeMount, /onToggle=\{\(event\) => \{/);
  assert.match(planeMount, /const isOpen = event\.currentTarget\.open;/);
  assert.match(planeMount, /setExplorerOpen\(isOpen\);/);
  assert.match(disclosureStyles, /\.disclosure\[open\] \.summaryIcon/);
  assert.equal(
    offersLayout.includes("OfferVisualDirectoryMount"),
    false,
    "the obsolete eager offer-plane enhancer must not fetch before the disclosure opens",
  );
});

test("the offers topbar stays compact after removing duplicate global search", () => {
  assert.match(offersLayout, /topbarStyles\.scope/);
  assert.doesNotMatch(
    densityStyles,
    /\.scope :global\(\.mt-site-topbar\)\s*\{[^}]*\bwidth:/,
    "the Offers route must retain the canonical full-bleed masthead width",
  );
  assert.match(topbarStyles, /grid-template-areas:\s*"brand nav actions";/);
  assert.match(topbarStyles, /"brand actions"\s*"nav nav";/);
  assert.match(topbarStyles, /grid-template-rows:\s*auto auto;/);
  assert.match(topbarStyles, /justify-content:\s*flex-start;/);
  assert.match(topbarStyles, /overflow-x:\s*auto;/);
  assert.match(topbarStyles, /\.brand \.mt-wordmark\)[\s\S]*?font-size:\s*clamp\(1\.05rem, 5\.2vw, 1\.3rem\);/);
  assert.match(
    topbarStyles,
    /@media \(max-width: 760px\)[\s\S]*?\.mt-site-topbar\.topbar-with-search\)[\s\S]*?display:\s*grid;/,
  );
  assert.match(
    topbarStyles,
    /@media \(max-width: 360px\)[\s\S]*?grid-template-areas:\s*"brand"\s*"actions"\s*"nav";/,
  );
});
