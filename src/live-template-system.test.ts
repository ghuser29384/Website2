import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("public/moral-trade-live.html", "utf8");
const navigation = readFileSync("public/moral-trade-live-templates.js", "utf8");
const offersPage = readFileSync("src/app/offers/page.tsx", "utf8");
const component = readFileSync(
  "src/components/trade-templates/trade-template-library.tsx",
  "utf8",
);
const styles = readFileSync(
  "src/components/trade-templates/trade-template-library.css",
  "utf8",
);

test("the live Trade Templates control opens the canonical template library", () => {
  assert.match(shell, /moral-trade-live-templates\.js/);
  assert.match(navigation, /\/offers\?view=templates/);
  assert.match(navigation, /Open trade template library/);
  assert.match(offersPage, /view === "templates"/);
  assert.match(offersPage, /<TradeTemplateLibrary \/>/);
});

test("the production library integrates visual browse, anatomy, and a complete three-question guide", () => {
  assert.match(component, /Start from a clear shape/);
  assert.match(component, /Understand before you insert/);
  assert.match(component, /GUIDE_QUESTIONS/);
  assert.match(component, /Question \{guideStep \+ 1\} of \{GUIDE_QUESTIONS\.length\}/);
  assert.match(component, /What should move/);
  assert.match(component, /Who needs to coordinate/);
  assert.match(component, /How should it be trusted/);
  assert.match(component, /Structure signals/);
  assert.match(component, /Not outcome data/);
  assert.match(component, /alignedGuideQuestions\.length/);
  assert.match(component, /disabled=\{!currentGuideAnswer\}/);
  assert.match(component, /role="group"/);
  assert.doesNotMatch(component, /94%|based on similar completed trades|proven shape/i);
});

test("the template visual system is responsive and keyboard-focus visible", () => {
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
