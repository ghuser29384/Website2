import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const excludedSpecs = [
  "exact-live-account.spec.ts",
  "exact-live-autocomplete.spec.ts",
  "exact-live-itinerary-editor.spec.ts",
  "exact-live-plan-resources.spec.ts",
  "exact-live-templates.spec.ts",
  "your-match-viewport.spec.ts",
  "feed-create-phase1-authenticated.spec.ts"
] as const;

test("the release browser gate is a named, serial, credential-free current-product contract", async () => {
  const [releaseConfig, packageSource, workflow, createRouting, publicRoutes, commandRouter] =
    await Promise.all([
      readFile("playwright.release.config.ts", "utf8"),
      readFile("package.json", "utf8"),
      readFile(".github/workflows/vercel-release.yml", "utf8"),
      readFile("tests/create-entry-routing.spec.ts", "utf8"),
      readFile("tests/public-routes.spec.ts", "utf8"),
      readFile("public/moral-trade-live-create-router.js", "utf8"),
    ]);
  const packageJson = JSON.parse(packageSource) as { scripts?: Record<string, string> };

  assert.match(releaseConfig, /workers: process\.env\.CI \? 1 : undefined/);
  assert.match(releaseConfig, /fullyParallel: false/);
  for (const spec of excludedSpecs) {
    assert.ok(
      releaseConfig.includes(`"**/${spec}"`),
      `missing explicit release exclusion for ${spec}`,
    );
  }

  assert.equal(
    packageJson.scripts?.["test:e2e:release"],
    "playwright test --config=playwright.release.config.ts",
  );
  assert.equal(
    packageJson.scripts?.["test:e2e:authenticated"],
    "playwright test tests/feed-create-phase1-authenticated.spec.ts",
  );
  assert.match(workflow, /npm run test:e2e:release -- --reporter=line/);
  assert.doesNotMatch(workflow, /npm run test:e2e -- --reporter=line/);

  assert.match(createRouting, /replaces a direct legacy Trade hash without replacing Home/);
  assert.match(createRouting, /obsolete Trade sidebar/);
  assert.match(publicRoutes, /the live home workspace has one semantic page heading/);
  assert.doesNotMatch(commandRouter, /\[data-action="from-command"\]/);
});
