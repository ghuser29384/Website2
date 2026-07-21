import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("public/moral-trade-live.html", "utf8");
const navigation = readFileSync("public/moral-trade-live-templates.js", "utf8");
const offersPage = readFileSync("src/app/offers/page.tsx", "utf8");
const offsetComposerPage = readFileSync("src/app/offers/new/page.tsx", "utf8");
const poolComposerPage = readFileSync("src/app/mpgf/pools/new/page.tsx", "utf8");
const tradeComposerPage = readFileSync("src/app/trades/new/page.tsx", "utf8");
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

test("the production library opens real drafts directly and keeps the three-question guide", () => {
  assert.match(component, /Choose a template/);
  assert.match(component, /href=\{template\.handoff\.href\}/);
  assert.match(component, /Use \$\{template\.name\} template/);
  assert.match(component, /GUIDE_QUESTIONS/);
  assert.match(component, /Question \{guideStep \+ 1\} of \{GUIDE_QUESTIONS\.length\}/);
  assert.match(component, /What should move/);
  assert.match(component, /Who needs to coordinate/);
  assert.match(component, /How should it be trusted/);
  assert.match(component, /alignedGuideQuestions\.length/);
  assert.match(component, /disabled=\{!currentGuideAnswer\}/);
  assert.match(component, /role="group"/);
  assert.doesNotMatch(component, /openAnatomy|Understand before you insert|>Preview</);
  assert.doesNotMatch(component, /94%|based on similar completed trades|proven shape/i);
});

test("each handoff reaches an editable mechanism rather than another preview or chooser", () => {
  assert.match(tradeComposerPage, /getPledgeTemplateInitialValues\(templateId\)/);
  assert.match(tradeComposerPage, /getTradeDraftTemplateLabel\(templateId\)/);
  assert.match(offsetComposerPage, /<OfferCreateForm/);
  assert.match(offsetComposerPage, /directTemplateEntry/);
  assert.match(offsetComposerPage, /initialMode="offset"/);
  assert.match(offsetComposerPage, /initialTemplate=\{template\.prefill\}/);
  assert.match(poolComposerPage, /templateApplied/);
  assert.match(poolComposerPage, /initialPoolProposalDeadline=\{buildFutureDeadline\(90\)\}/);
  assert.doesNotMatch(offsetComposerPage, /redirect\("\/donation-offsets/);
  assert.doesNotMatch(poolComposerPage, /redirect\("\/create/);
});

test("the template visual system is responsive and keyboard-focus visible", () => {
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /\.mt-template-card-link:focus-visible/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(styles, /\.mt-template-anatomy/);
});
