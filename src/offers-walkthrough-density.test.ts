import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const densityStyles = readFileSync("src/app/offers/offers-density.module.css", "utf8");
const visualCardStyles = readFileSync("src/app/offers/offer-visual-card.module.css", "utf8");
const disclosureStyles = readFileSync("src/app/offers/offer-plane-disclosure.module.css", "utf8");
const planeMount = readFileSync("src/app/offers/offer-plane-inline-mount.tsx", "utf8");
const offersLayout = readFileSync("src/app/offers/layout.tsx", "utf8");
const topbarStyles = readFileSync("src/app/offers/offers-topbar.module.css", "utf8");

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
    "the server-rendered proposal directory must remain a one-column register",
  );
  assert.match(
    densityStyles,
    /div:nth-of-type\(3\) > p\) \{[\s\S]*?display:\s*none !important;/,
    "the ranking formula must not dominate the default scan view",
  );
  assert.match(
    visualCardStyles,
    /\.grid \{[\s\S]*?grid-template-columns:\s*1fr;/,
    "enhanced offer cards must remain a one-column editorial register",
  );
  assert.equal(
    visualCardStyles.includes("grid-template-columns: repeat(3, minmax(0, 1fr));"),
    false,
    "the enhanced directory must not regress to a three-column card wall",
  );
});

test("the advanced challenge-return plane is optional and lazy-loaded", () => {
  assert.match(planeMount, /if \(!queryState\.shouldShow \|\| !explorerOpen\) return;/);
  assert.match(planeMount, /<details/);
  assert.match(planeMount, /Optional visual explorer/);
  assert.match(planeMount, /onToggle=\{\(event\) => \{/);
  assert.match(planeMount, /const isOpen = event\.currentTarget\.open;/);
  assert.match(planeMount, /setExplorerOpen\(isOpen\);/);
  assert.match(disclosureStyles, /\.disclosure\[open\] \.summaryIcon/);
});

test("removing duplicate global search does not leave an empty topbar column", () => {
  assert.match(offersLayout, /topbarStyles\.scope/);
  assert.match(topbarStyles, /grid-template-areas:\s*"brand nav actions";/);
  assert.match(topbarStyles, /"brand actions"\s*"nav nav";/);
});
