import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_PROJECT,
  OBSOLETE_TEST_PROJECTS,
  buildCanonicalResourcePatch,
  isVercelManagedDomain,
  safeProjectSummary,
  validateDisposableProject,
} from "./vercel-admin-cost-controls.mjs";

test("canonical settings select Standard builds and serialized free concurrency", () => {
  assert.deepEqual(buildCanonicalResourcePatch(), {
    resourceConfig: {
      buildMachineType: "standard",
      elasticConcurrencyEnabled: false,
      buildQueue: {
        configuration: "WAIT_FOR_NAMESPACE_QUEUE",
      },
    },
  });
});

test("only Vercel-managed aliases are safe on disposable projects", () => {
  assert.equal(isVercelManagedDomain("example.vercel.app"), true);
  assert.equal(isVercelManagedDomain("moraltrade.org"), false);

  const expected = OBSOLETE_TEST_PROJECTS[0];
  assert.equal(
    validateDisposableProject(
      { id: expected.id, name: expected.name },
      expected,
      [
        { name: `${expected.name}.vercel.app` },
        { name: `${expected.name}-ellen-s.vercel.app` },
      ],
    ),
    true,
  );
});

test("project deletion fails closed on identity or custom-domain mismatch", () => {
  const expected = OBSOLETE_TEST_PROJECTS[0];
  assert.throws(
    () =>
      validateDisposableProject(
        { id: "wrong", name: expected.name },
        expected,
        [],
      ),
    /Refusing to delete unexpected project/,
  );
  assert.throws(
    () =>
      validateDisposableProject(
        { id: expected.id, name: expected.name },
        expected,
        [{ name: "important.example.org" }],
      ),
    /custom domains/,
  );
});

test("audit summaries redact environment-variable values and other secrets", () => {
  const summary = safeProjectSummary(
    {
      id: CANONICAL_PROJECT.id,
      name: CANONICAL_PROJECT.name,
      live: true,
      framework: "nextjs",
      link: {
        type: "github",
        org: "ghuser29384",
        repo: "Website2",
        repoId: 1204006559,
        productionBranch: "main",
        gitCredentialId: "secret-credential-id",
      },
      env: [{ key: "DATABASE_URL", value: "must-not-leak" }],
      resourceConfig: {
        buildMachineType: "standard",
        elasticConcurrencyEnabled: false,
        buildQueue: { configuration: "WAIT_FOR_NAMESPACE_QUEUE" },
      },
      speedInsights: { enabledAt: 1 },
      webAnalytics: { enabledAt: 1 },
      latestDeployments: [
        { id: "dpl_1", readyState: "READY", target: "production" },
      ],
    },
    [{ name: "moraltrade.org" }],
  );

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /must-not-leak/);
  assert.doesNotMatch(serialized, /secret-credential-id/);
  assert.match(serialized, /moraltrade\.org/);
  assert.equal(summary.resourceConfig.buildMachineType, "standard");
});

test("the deletion allowlist is narrow, immutable, and excludes live projects", () => {
  assert.equal(OBSOLETE_TEST_PROJECTS.length, 6);
  assert.equal(
    OBSOLETE_TEST_PROJECTS.some(
      (project) => project.id === CANONICAL_PROJECT.id,
    ),
    false,
  );
  assert.ok(
    OBSOLETE_TEST_PROJECTS.every(
      (project) =>
        /(?:test|verify|schema|bridge)/.test(project.name) ||
        project.name === "moral-trade-live",
    ),
  );
});
