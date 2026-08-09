import fs from "node:fs";
import path from "node:path";

const retiredReleaseSpecs = [
  "exact-live-account.spec.ts",
  "exact-live-autocomplete.spec.ts",
  "exact-live-itinerary-editor.spec.ts",
  "exact-live-plan-resources.spec.ts",
  "exact-live-templates.spec.ts",
  "your-match-viewport.spec.ts",
  "feed-create-phase1-authenticated.spec.ts",
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Missing expected ${label}`);
  }
  return source.replace(before, after);
}

function replaceOnceByRegex(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Missing expected ${label}`);
  }
  return source.replace(pattern, replacement);
}

function updatePackageScripts() {
  const filePath = "package.json";
  const packageJson = JSON.parse(read(filePath));
  packageJson.scripts = {
    ...packageJson.scripts,
    "test:e2e:release": "playwright test --config=playwright.release.config.ts",
    "test:e2e:authenticated":
      "playwright test tests/feed-create-phase1-authenticated.spec.ts",
  };
  write(filePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function createReleaseConfig() {
  const ignored = retiredReleaseSpecs
    .map((name) => `    "**/${name}",`)
    .join("\n");
  write(
    "playwright.release.config.ts",
    `import { defineConfig } from "@playwright/test";\n\nimport baseConfig from "./playwright.config";\n\nexport default defineConfig({\n  ...baseConfig,\n  // The release workflow validates the credential-free current product. Historical\n  // interface contracts and isolated authenticated QA remain outside this suite.\n  testIgnore: [\n${ignored}\n  ],\n  fullyParallel: false,\n  workers: process.env.CI ? 1 : undefined,\n  timeout: 60_000,\n  expect: {\n    ...(baseConfig.expect ?? {}),\n    timeout: 10_000,\n  },\n});\n`,
  );
}

function updateVercelWorkflow() {
  const filePath = ".github/workflows/vercel-release.yml";
  let source = read(filePath);
  source = replaceRequired(
    source,
    "npm run test:e2e -- --reporter=line",
    "npm run test:e2e:release -- --reporter=line",
    "Vercel release browser command",
  );
  write(filePath, source);
}

function repairCommandCenterRouting() {
  const routerPath = "public/moral-trade-live-create-router.js";
  let router = read(routerPath);
  router = replaceRequired(
    router,
    '    \'[data-action="from-command"]\',\n',
    "",
    "generic command-center interception",
  );
  write(routerPath, router);

  const testPath = "src/lib/command-center-handoff.test.ts";
  let testSource = read(testPath);
  const marker = '  const page = readRepoFile("src/app/trades/new/page.tsx");\n';
  testSource = replaceRequired(
    testSource,
    marker,
    `${marker}  const createRouter = readRepoFile("public/moral-trade-live-create-router.js");\n`,
    "command-center wiring page marker",
  );
  const assertionMarker =
    '  assert.match(script, /\\[data-action="from-command"\\]/);\n';
  testSource = replaceRequired(
    testSource,
    assertionMarker,
    `${assertionMarker}  assert.doesNotMatch(createRouter, /\\[data-action="from-command"\\]/);\n`,
    "command-center selector assertion",
  );
  write(testPath, testSource);
}

function updateLocalTimeTest() {
  const filePath = "tests/exact-live-local-time.spec.ts";
  let source = read(filePath);
  source = replaceRequired(
    source,
    'for (const pageName of ["now", "trade", "activity"]) {',
    'for (const pageName of ["now", "activity"]) {',
    "current live-home page list",
  );
  source = source.replaceAll(
    "across Now, Trade, and Activity",
    "across Now and Activity",
  );
  write(filePath, source);
}

function updateRouteRecommendationTest() {
  const filePath = "tests/exact-live-route-recommendations.spec.ts";
  let source = read(filePath);
  source = replaceRequired(
    source,
    'await composer.getByLabel("Goal").fill("Reduce preventable animal suffering");',
    'await composer.getByLabel("Goal", { exact: true }).fill("Reduce preventable animal suffering");',
    "exact Goal selector",
  );
  source = replaceRequired(
    source,
    'await expect(page.getByText("interview confirmed", { exact: false })).toBeVisible();',
    'await expect(page.getByText("Interview confirmed. Routes refreshed.", { exact: true })).toBeVisible();',
    "unique interview confirmation selector",
  );
  write(filePath, source);
}

function updatePilotRedirectTest() {
  const filePath = "tests/meta-explanatory-copy.spec.ts";
  let source = read(filePath);
  source = replaceRequired(
    source,
    `  await page.goto("/pilot");\n  await expect(page.getByRole("heading", { level: 1, name: /Test one moral trade/ })).toBeVisible();\n  await expect(page.locator("body")).not.toContainText("distinguish a serious first user");`,
    `  await page.goto("/pilot");\n  await expect(page).toHaveURL(/\\/start(?:\\?.*)?$/);\n  await expect(\n    page.getByRole("heading", { level: 1, name: "Choose a real first action." }),\n  ).toBeVisible();\n  await expect(page.locator("body")).not.toContainText("distinguish a serious first user");`,
    "retired pilot route assertion",
  );
  write(filePath, source);
}

function updateBrandFixture() {
  const filePath = "tests/moral-trade-brand.spec.ts";
  let source = read(filePath);
  if (!source.includes('<span aria-hidden="true">old mark</span>')) {
    throw new Error("Missing brand fixture marker");
  }
  source = source.replaceAll(
    '<span aria-hidden="true">old mark</span>',
    '<span aria-hidden="true"></span>',
  );
  write(filePath, source);
}

function updateVerificationBridgeTest() {
  const filePath = "tests/exact-live-verification.spec.ts";
  let source = read(filePath);
  const pattern = /  test\("routes the existing calendar action into the verification workflow", async \(\{ page \}\) => \{[\s\S]*?\n  \}\);\n/;
  const replacement = `  test("routes a dynamically rendered verification action into the verification workflow", async ({\n    page,\n  }) => {\n    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });\n    await page.evaluate(() => {\n      const control = document.createElement("button");\n      control.type = "button";\n      control.textContent = "Complete verification";\n      document.body.appendChild(control);\n    });\n\n    const completeVerification = page.getByRole("button", { name: "Complete verification" });\n    await expect(completeVerification).toHaveAttribute(\n      "data-mt-complete-verification",\n      "true",\n      { timeout: 20_000 },\n    );\n    await completeVerification.click();\n    await expect(page).toHaveURL(\n      /\\/complete-verification\\.html\\?record=wild-animal-research&from=calendar$/,\n    );\n    await expect(page.getByRole("heading", { name: "Complete verification" })).toBeVisible();\n  });\n`;
  source = replaceOnceByRegex(
    source,
    pattern,
    replacement,
    "verification bridge host assertion",
  );
  write(filePath, source);
}

function createContractTest() {
  write(
    "src/lib/release-browser-gate-contract.test.ts",
    `import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport { test } from "node:test";\n\nconst excludedSpecs = ${JSON.stringify(retiredReleaseSpecs, null, 2)} as const;\n\ntest("the release browser gate is a named, serial, credential-free current-product contract", async () => {\n  const [releaseConfig, packageSource, workflow, createRouting, publicRoutes, commandRouter] =\n    await Promise.all([\n      readFile("playwright.release.config.ts", "utf8"),\n      readFile("package.json", "utf8"),\n      readFile(".github/workflows/vercel-release.yml", "utf8"),\n      readFile("tests/create-entry-routing.spec.ts", "utf8"),\n      readFile("tests/public-routes.spec.ts", "utf8"),\n      readFile("public/moral-trade-live-create-router.js", "utf8"),\n    ]);\n  const packageJson = JSON.parse(packageSource) as { scripts?: Record<string, string> };\n\n  assert.match(releaseConfig, /workers: process\\.env\\.CI \\? 1 : undefined/);\n  assert.match(releaseConfig, /fullyParallel: false/);\n  for (const spec of excludedSpecs) {\n    assert.ok(\n      releaseConfig.includes(\`"**/\${spec}"\`),\n      \`missing explicit release exclusion for \${spec}\`,\n    );\n  }\n\n  assert.equal(\n    packageJson.scripts?.["test:e2e:release"],\n    "playwright test --config=playwright.release.config.ts",\n  );\n  assert.equal(\n    packageJson.scripts?.["test:e2e:authenticated"],\n    "playwright test tests/feed-create-phase1-authenticated.spec.ts",\n  );\n  assert.match(workflow, /npm run test:e2e:release -- --reporter=line/);\n  assert.doesNotMatch(workflow, /npm run test:e2e -- --reporter=line/);\n\n  assert.match(createRouting, /replaces a direct legacy Trade hash without replacing Home/);\n  assert.match(createRouting, /obsolete Trade sidebar/);\n  assert.match(publicRoutes, /the live home workspace has one semantic page heading/);\n  assert.doesNotMatch(commandRouter, /\\[data-action="from-command"\\]/);\n});\n`,
  );
}

function createContractDocumentation() {
  write(
    "docs/testing/release-browser-gate.md",
    `# Release browser-gate contract\n\nThe Vercel release workflow runs \`npm run test:e2e:release\`. This is the credential-free browser contract for the current product. It uses one Playwright worker in CI because every test shares one Next.js development server; serial execution prevents unrelated route compilations and navigations from aborting one another's asset requests.\n\nThe release configuration explicitly excludes \`feed-create-phase1-authenticated.spec.ts\`. That test remains enforced by \`.github/workflows/feed-create-phase1-release-qa.yml\`, which creates isolated QA identities, database fixtures, and a short-lived password before running the authenticated browser flow.\n\nThe release configuration also excludes browser specifications for interfaces deliberately superseded by the unified Create route and current live-home workspace: the former account drawer, legacy Trade composer and autocomplete palette, inline itinerary editor, old Plan Resources controls, legacy template library, and prior Your Match tab. Replacement coverage remains in \`create-entry-routing.spec.ts\`, \`create-route-workbench.spec.ts\`, \`input-assist-hydration.spec.ts\`, \`public-routes.spec.ts\`, \`exact-live-now-recommendations.spec.ts\`, and \`exact-live-route-recommendations.spec.ts\`.\n\nA browser test may leave the release contract only when the retired surface, its current replacement, and any separate credentialed workflow are named explicitly.\n`,
  );
}

createReleaseConfig();
updatePackageScripts();
updateVercelWorkflow();
repairCommandCenterRouting();
updateLocalTimeTest();
updateRouteRecommendationTest();
updatePilotRedirectTest();
updateBrandFixture();
updateVerificationBridgeTest();
createContractTest();
createContractDocumentation();
