import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { parseSmartQuery } from "./smart-query";

test("parser preserves deployed results for deterministic mixed queries", {
  skip: process.env.SEARCH_PARSER_BASELINE ? false : "Requires exact deployed parser source",
}, () => {
  const source = readFileSync(process.env.SEARCH_PARSER_BASELINE!, "utf8");
  const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText;
  const baseline = {} as { parseSmartQuery: typeof parseSmartQuery };
  new Function("exports", compiled)(baseline);
  let seed = 1783;
  const random = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const terms = ["animal", "animel", "welfare", "global", "health", "climate", "education", "volunter", "$20", "verified", "not verified", "by tomorrow", "in 2030", "unmatchedxyz", "collective", "payment", "pledge", "éducation"];
  const options = { surface: "offers" as const, now: "2026-10-24T00:00:00Z" };
  for (let i = 0; i < 1000; i += 1) {
    const query = Array.from({ length: 1 + random(8) }, () => terms[random(terms.length)]).join(" ");
    assert.deepEqual(parseSmartQuery(query, options), baseline.parseSmartQuery(query, options));
  }
});

test("parser preserves typo, substring and unequal-length cause matching", () => {
  const cases: [string, string[]][] = [["animel welfare", ["factory-farming"]], ["abcdefghijklmnop welfare", []], ["animalwelfare", ["factory-farming"]], ["climat change", ["climate-environment"]], ["global healt", ["public-health"]], ["unmatchedxyz", []]];
  for (const [query, causes] of cases) assert.deepEqual(parseSmartQuery(query, { surface: "offers", now: "2026-10-24" }).facets.causes, causes);
});
