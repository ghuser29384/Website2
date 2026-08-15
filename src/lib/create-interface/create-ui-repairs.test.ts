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
  assert.match(repairCss, /\.request-primary\s*\{[^}]*background: #fffdf8 !important;/s);
  assert.match(repairCss, /\.chosen-strip strong\s*\{[^}]*color: #111111 !important;/s);
  assert.match(repairCss, /\.suggestion-option[\s\S]*color: #111111 !important;/);
  assert.match(repairCss, /\.suggestions\[data-placement="above"\]/);
  assert.match(repairCss, /content: attr\(data-step-label\)/);
  assert.match(repairCss, /\.cause-choice\.selected::after\s*\{[^}]*content: "✓";/s);
  assert.match(repairCss, /\.other-cause-submit:disabled/);
});

test("the repair script scopes suggestions, preserves the step anchor, and bounds the list", () => {
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
  assert.match(repairScript, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(repairScript, /Math\.min\(276, Math\.floor\(available\)\)/);
  assert.match(repairScript, /submit\.disabled = input\.value\.trim\(\)\.length === 0/);
  assert.match(repairScript, /aria-current/);
});
