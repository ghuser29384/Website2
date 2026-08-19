import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_PROJECT,
  OBSOLETE_TEST_PROJECTS,
  PRODUCTION_ROUTE_CHECKS,
  buildCanonicalResourcePatch,
  evaluateProductionRoute,
  hasActiveAnchor,
  isVercelManagedDomain,
  runProductionSmoke,
  safeProjectSummary,
  selectReadyProductionDeployment,
  validateDisposableProject,
  verifyCanonicalLive,
  verifyCanonicalSettings,
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

test("canonical verification accepts normalized disabled readback and a READY production deployment", () => {
  const canonical = {
    id: CANONICAL_PROJECT.id,
    name: CANONICAL_PROJECT.name,
    live: false,
    domains: ["moraltrade.org", "www.moraltrade.org"],
    latestDeployment: {
      id: "dpl_newer_preview",
      readyState: "READY",
      target: null,
      createdAt: 300,
    },
    productionDeployment: {
      id: "dpl_current_production",
      readyState: "READY",
      target: "production",
      createdAt: 200,
    },
    resourceConfig: {
      buildMachineType: "standard",
      elasticConcurrencyEnabled: false,
      buildQueue: "WAIT_FOR_NAMESPACE_QUEUE",
    },
  };

  assert.equal(verifyCanonicalSettings(canonical), true);
  assert.equal(verifyCanonicalLive(canonical), true);
  assert.equal(
    verifyCanonicalSettings({
      ...canonical,
      resourceConfig: {
        ...canonical.resourceConfig,
        elasticConcurrencyEnabled: null,
      },
    }),
    true,
  );
  assert.throws(
    () =>
      verifyCanonicalSettings({
        ...canonical,
        resourceConfig: {
          buildMachineType: "standard",
          buildQueue: "WAIT_FOR_NAMESPACE_QUEUE",
        },
      }),
    /readback is missing/,
  );
  assert.throws(
    () =>
      verifyCanonicalSettings({
        ...canonical,
        resourceConfig: {
          ...canonical.resourceConfig,
          elasticConcurrencyEnabled: true,
        },
      }),
    /concurrency is not disabled/,
  );
  assert.throws(
    () =>
      verifyCanonicalLive({
        ...canonical,
        productionDeployment: {
          ...canonical.productionDeployment,
          readyState: "BUILDING",
        },
      }),
    /not operational/,
  );
  assert.throws(
    () =>
      verifyCanonicalLive({
        ...canonical,
        domains: ["moraltrade.org"],
      }),
    /not operational/,
  );
});

test("production deployment selection ignores newer previews and non-ready production deployments", () => {
  assert.deepEqual(
    selectReadyProductionDeployment([
      {
        id: "dpl_newer_preview",
        readyState: "READY",
        target: null,
        createdAt: 400,
      },
      {
        id: "dpl_building_production",
        readyState: "BUILDING",
        target: "production",
        createdAt: 350,
      },
      {
        uid: "dpl_older_production",
        state: "READY",
        target: "production",
        created: 100,
      },
      {
        id: "dpl_current_production",
        readyState: "READY",
        target: "production",
        createdAt: 200,
      },
    ]),
    {
      id: "dpl_current_production",
      readyState: "READY",
      target: "production",
      createdAt: 200,
    },
  );
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

test("audit summaries redact secrets and keep preview and production deployment identities separate", () => {
  const summary = safeProjectSummary(
    {
      id: CANONICAL_PROJECT.id,
      name: CANONICAL_PROJECT.name,
      live: false,
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
        elasticConcurrencyEnabled: null,
        buildQueue: { configuration: "WAIT_FOR_NAMESPACE_QUEUE" },
      },
      speedInsights: { enabledAt: 1 },
      webAnalytics: { enabledAt: 1 },
      latestDeployments: [
        {
          id: "dpl_newer_preview",
          readyState: "READY",
          target: null,
          createdAt: 300,
        },
      ],
    },
    [
      { name: "moraltrade.org" },
      { name: "www.moraltrade.org" },
    ],
    [
      {
        id: "dpl_building_production",
        readyState: "BUILDING",
        target: "production",
        createdAt: 250,
      },
      {
        id: "dpl_current_production",
        readyState: "READY",
        target: "production",
        createdAt: 200,
      },
    ],
  );

  const serialized = JSON.stringify(summary);
  assert.doesNotMatch(serialized, /must-not-leak/);
  assert.doesNotMatch(serialized, /secret-credential-id/);
  assert.match(serialized, /moraltrade\.org/);
  assert.equal(summary.resourceConfig.buildMachineType, "standard");
  assert.equal(summary.resourceConfig.elasticConcurrencyEnabled, null);
  assert.equal(summary.latestDeployment.id, "dpl_newer_preview");
  assert.equal(
    summary.productionDeployment.id,
    "dpl_current_production",
  );
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

test("production route evaluation verifies exact tab state without retaining HTML", () => {
  const check = PRODUCTION_ROUTE_CHECKS.find((entry) => entry.name === "ledger");
  const html = `<!doctype html><html data-dpl-id="dpl_exact"><body>
    <h1>Additional resources you caused.</h1>
    <h2>Sign in to view your commitments.</h2>
    <a href="/commitments">Portfolio</a>
    <a aria-current="page" href="/commitments?tab=ledger">Ledger</a>
  </body></html>`;

  assert.equal(
    hasActiveAnchor(html, "/commitments?tab=ledger", "Ledger"),
    true,
  );
  const result = evaluateProductionRoute(check, {
    status: 200,
    body: html,
    contentType: "text/html; charset=utf-8",
    finalUrl: "https://www.moraltrade.org/commitments?tab=ledger",
  });
  assert.equal(result.passed, true);
  assert.equal(result.deploymentId, "dpl_exact");
  assert.doesNotMatch(JSON.stringify(result), /<!doctype html>/);
});

test("production route evaluation rejects billing-disabled and wrong-tab responses", () => {
  const check = PRODUCTION_ROUTE_CHECKS.find((entry) => entry.name === "calendar");
  const result = evaluateProductionRoute(check, {
    status: 402,
    body: `Payment Required\nDEPLOYMENT_DISABLED\n<a aria-current="page" href="/commitments?tab=ledger">Ledger</a>`,
    contentType: "text/plain; charset=utf-8",
    finalUrl: "https://www.moraltrade.org/commitments?tab=calendar",
  });

  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => /HTTP 200/.test(failure)));
  assert.ok(
    result.failures.some((failure) => /billing-blocked/.test(failure)),
  );
  assert.ok(result.failures.some((failure) => /active tab mismatch/.test(failure)));
});

test("production smoke retries all canonical routes and requires one deployment", async () => {
  let round = 0;
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/") {
      return new Response("<title>Moral Trade</title>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    const tab = parsed.searchParams.get("tab") ?? "portfolio";
    const label =
      tab === "portfolio"
        ? "Portfolio"
        : tab.charAt(0).toUpperCase() + tab.slice(1);
    const href =
      tab === "portfolio" ? "/commitments" : `/commitments?tab=${tab}`;
    const status = round === 0 && tab === "calendar" ? 402 : 200;
    const body =
      status === 402
        ? "Payment Required\nDEPLOYMENT_DISABLED"
        : `<!doctype html><html data-dpl-id="dpl_same"><body>
            <h1>Additional resources you caused.</h1>
            <h2>Sign in to view your commitments.</h2>
            <a aria-current="page" href="${href}">${label}</a>
            <span>Portfolio Ledger Completed Calendar</span>
          </body></html>`;
    return new Response(body, {
      status,
      headers: { "content-type": status === 200 ? "text/html" : "text/plain" },
    });
  };

  const report = await runProductionSmoke({
    fetchImpl,
    attempts: 2,
    intervalMs: 1,
    timeoutMs: 1_000,
    sleep: async () => {
      round += 1;
    },
  });

  assert.equal(report.passed, true);
  assert.equal(report.attemptsUsed, 2);
  assert.deepEqual(report.deploymentIds, ["dpl_same"]);
  assert.ok(report.routes.every((route) => route.passed));
});
