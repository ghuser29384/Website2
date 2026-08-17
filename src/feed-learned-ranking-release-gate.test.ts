import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  DETERMINISTIC_PARETO_SAFE_BOOTSTRAP,
  LEARNED_RANKING_READINESS_STATUSES,
} from "./lib/feed/learned-ranking-readiness";
import { PARETO_HEURISTIC_MODEL_KEY } from "./lib/pareto-recommendation-model";

const ROOT = process.cwd();
const READINESS_MODULE = "src/lib/feed/learned-ranking-readiness.ts";
const ALLOWED_READINESS_REFERENCES = new Set([
  READINESS_MODULE,
  "src/lib/feed/learned-ranking-readiness.test.ts",
  "src/feed-learned-ranking-release-gate.test.ts",
]);
const CODE_EXTENSIONS = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);

function repositoryCodeFiles() {
  const files: string[] = [];
  const visit = (relativePath: string) => {
    const absolutePath = path.join(ROOT, relativePath);
    if (!statSync(absolutePath).isDirectory()) {
      if (CODE_EXTENSIONS.has(path.extname(relativePath))) {
        files.push(relativePath.split(path.sep).join("/"));
      }
      return;
    }
    for (const entry of readdirSync(absolutePath)) {
      if (entry === "node_modules" || entry === ".next") continue;
      visit(path.join(relativePath, entry));
    }
  };

  for (const root of ["public", "scripts", "src"]) visit(root);
  return files.sort();
}

function source(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("the deterministic Pareto-safe bootstrap remains the readiness authority", () => {
  assert.equal(
    DETERMINISTIC_PARETO_SAFE_BOOTSTRAP,
    "deterministic_pareto_safe_bootstrap",
  );
  assert.equal(PARETO_HEURISTIC_MODEL_KEY, "pareto-heuristic-v1");
  assert.deepEqual(LEARNED_RANKING_READINESS_STATUSES, [
    "not_ready",
    "eligible_for_calibration_review",
  ]);
});

test("repository code contains no direct learned-ranking activation escape hatch", () => {
  const activationProperty = ["learned", "Ranking", "May", "Activate"].join("");
  const affirmativeActivation = new RegExp(
    `${activationProperty}\\s*[:=]\\s*true`,
  );
  const violations = repositoryCodeFiles().filter((relativePath) => {
    if (relativePath === "src/feed-learned-ranking-release-gate.test.ts") {
      return false;
    }
    return affirmativeActivation.test(source(relativePath));
  });

  assert.deepEqual(violations, []);
});

test("the readiness evaluator is not imported by runtime code", () => {
  const references = repositoryCodeFiles().filter((relativePath) =>
    source(relativePath).includes("learned-ranking-readiness"),
  );

  assert.deepEqual(references, [...ALLOWED_READINESS_REFERENCES].sort());
});

test("the readiness source fixes every result to non-activation", () => {
  const readinessSource = source(READINESS_MODULE);
  const activationProperty = ["learned", "Ranking", "May", "Activate"].join("");
  const falseLiteral = new RegExp(`${activationProperty}:\\s*false`);
  const trueLiteral = new RegExp(`${activationProperty}:\\s*true`);

  assert.match(readinessSource, falseLiteral);
  assert.doesNotMatch(readinessSource, trueLiteral);
  assert.match(
    readinessSource,
    /authoritativeRanker:\s*DETERMINISTIC_PARETO_SAFE_BOOTSTRAP/,
  );
});
