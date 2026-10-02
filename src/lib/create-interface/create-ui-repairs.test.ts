import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";

const source = readFileSync("public/moral-trade-create/index.html", "utf8");
const canonicalCss = readFileSync("public/moral-trade-canonical-static.css", "utf8");
const repairCss = readFileSync("public/moral-trade-create/ui-repairs.css", "utf8");
const repairScript = readFileSync("public/moral-trade-create/ui-repairs.js", "utf8");

test("the embedded Create source loads the UI-repair assets exactly once", () => {
  const integrated = integrateCommonGroundCreateSource(source);

  assert.equal((integrated.match(/ui-repairs\.css/g) ?? []).length, 1);
  assert.equal((integrated.match(/ui-repairs\.js/g) ?? []).length, 1);
  assert.equal(integrateCommonGroundCreateSource(integrated), integrated);
});

test("the canonical primary-action rule no longer paints the request content panel blue", () => {
  assert.doesNotMatch(
    canonicalCss,
    /\.other-cause-submit,\s*\n\.request-primary\s*\{/,
  );
  assert.match(canonicalCss, /\.request-continue:not\(:disabled\)\s*\{/);
  assert.match(canonicalCss, /\.request-continue:hover:not\(:disabled\)\s*\{/);
});

test("the repair stylesheet makes the broken states explicit and viewport-aware", () => {
  assert.match(
    repairCss,
    /\.request-primary\s*\{[\s\S]*?background: #fffdf8 !important;/,
  );
  assert.match(
    repairCss,
    /\.chosen-strip strong\s*\{[\s\S]*?color: #111111 !important;/,
  );
  assert.match(repairCss, /\.suggestion-option[\s\S]*color: #111111 !important;/);
  assert.match(repairCss, /\.suggestions\[data-placement="above"\]/);
  assert.match(repairCss, /content: attr\(data-step-label\)/);
  assert.match(
    repairCss,
    /\.cause-choice\.selected::after\s*\{[\s\S]*?content: "✓";/,
  );
  assert.match(repairCss, /\.other-cause-submit:disabled/);
});

test("the repair script scopes examples and suggestions, preserves every request transition anchor, and bounds the list", () => {
  for (const cause of [
    "Existential risk",
    "Future flourishing",
    "S-risks",
    "Concentration of power",
    "Priorities research",
    "Biological risks",
    "Space governance",
  ]) {
    assert.match(repairScript, new RegExp(`"${cause.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }

  assert.doesNotMatch(
    repairScript.match(/baseSuggestions\.skill = \[[\s\S]*?\n    \];/)?.[0] ?? "",
    /vegetarian|Help grow Moral Trade/i,
  );
  assert.match(repairScript, /function syncRequestCardExamples\(\)/);
  assert.match(repairScript, /\.request-example/);
  assert.doesNotMatch(
    repairScript.match(/function syncRequestCardExamples\(\)[\s\S]*?\n  }/)?.[0] ?? "",
    /vegetarian|Help grow Moral Trade|GiveDirectly/i,
  );
  assert.match(repairScript, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  const transitionRestore = repairScript.match(
    /function restoreRequestTopWhenVisible\(\)[\s\S]*?\n  }/,
  );
  assert.ok(transitionRestore, "request-step visibility must trigger a canonical top restoration");
  assert.doesNotMatch(transitionRestore[0], /innerWidth/);
  assert.match(repairScript, /new MutationObserver\(restoreRequestTopWhenVisible\)/);
  assert.match(repairScript, /attributeFilter: \["class", "hidden"\]/);
  assert.match(repairScript, /window\.requestAnimationFrame\(restoreRequestTop\)/);
  assert.match(repairScript, /window\.setTimeout\(restoreRequestTop, 0\)/);
  assert.match(repairScript, /Math\.min\(276, Math\.floor\(available\)\)/);
  assert.match(repairScript, /submit\.disabled = input\.value\.trim\(\)\.length === 0/);
  assert.match(repairScript, /aria-current/);
});

test("Create reuses the shared Moral Trade wordmark and keeps its page label separate", () => {
  const integrated = integrateCommonGroundCreateSource(source);
  assert.equal((integrated.match(/src="\/moral-trade-brand\.js"/g) ?? []).length, 1);
  assert.match(integrated, /<span class="create-brand-wordmark">Moral Trade<\/span>/);
  assert.match(integrated, /<p class="brand-title">Create<\/p>/);
  assert.doesNotMatch(integrated, /<span class="brand-mark"/);
});

test("Request uses padded form-scale typography and responsive contribution cards", () => {
  assert.match(repairCss, /#screenRequest \.stage\s*\{[\s\S]*?min-height: 0;[\s\S]*?gap: 0;/);
  assert.match(repairCss, /#screenRequest \.intro\s*\{[\s\S]*?padding: clamp\(24px, 2\.5vw, 36px\);/);
  assert.match(repairCss, /#screenRequest #requestHeading\s*\{[\s\S]*?font-size: clamp\(2rem, 2\.75vw, 2\.75rem\);[\s\S]*?line-height: 1\.08 !important;/);
  assert.match(repairCss, /@media \(max-width: 1180px\)\s*\{\s*#screenRequest \.stage\s*\{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(repairCss, /#screenRequest \.request-choice strong\s*\{[\s\S]*?overflow-wrap: anywhere;/);
});

test("the Request heading keeps a friendly tone on entry and after changing the funding structure", () => {
  const integrated = integrateCommonGroundCreateSource(source);
  assert.equal((integrated.match(/What would you like help with\?/g) ?? []).length, 2);
  assert.match(integrated, /<h1 id="requestHeading">What would you like help with\?<\/h1>/);
  assert.match(integrated, /\$\("#requestHeading"\)\.textContent = "What would you like help with\?"/);
  assert.doesNotMatch(integrated, /What do you want other people to do\?/);
});
