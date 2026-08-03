#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const VERCEL_TEAM_ID = "team_ySu6sF3Uho1E1GnJtCQPVEuJ";
export const CANONICAL_PROJECT = Object.freeze({
  id: "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7",
  name: "moraltrade-site",
});
export const DUPLICATE_PROJECT = Object.freeze({
  id: "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK",
  name: "website2",
});
export const OBSOLETE_TEST_PROJECTS = Object.freeze([
  { id: "prj_XuzEnQNY2Xrk6mUoBdzFG6VkILts", name: "moral-trade-schema-test" },
  { id: "prj_7JRowNTrMG4iHeIkTGBGvtxRlwT9", name: "moral-trade-exact-verify" },
  { id: "prj_YehABtMYO1rhOOMSHl8QyH2xgMu0", name: "moral-trade-live" },
  { id: "prj_cwrbl8tDfjk48p9UZCEw1zZF8Wiv", name: "moral-trade-verify" },
  { id: "prj_1oFSOZbCp28axBOdkQKhdI2OoYBM", name: "moral-trade-live-test" },
  { id: "prj_GjsRceONkKiX820msEgBkgIpb6qj", name: "moraltrade-production-bridge-test" },
]);

export const PRODUCTION_ROUTE_CHECKS = Object.freeze([
  Object.freeze({
    name: "root",
    path: "/",
    requiredText: Object.freeze(["Moral Trade"]),
    activeHref: null,
    activeLabel: null,
    requireDeploymentId: false,
  }),
  Object.freeze({
    name: "portfolio",
    path: "/commitments",
    requiredText: Object.freeze([
      "Additional resources you caused.",
      "Sign in to view your commitments.",
      "Portfolio",
      "Ledger",
      "Completed",
      "Calendar",
    ]),
    activeHref: "/commitments",
    activeLabel: "Portfolio",
    requireDeploymentId: true,
  }),
  Object.freeze({
    name: "ledger",
    path: "/commitments?tab=ledger",
    requiredText: Object.freeze([
      "Additional resources you caused.",
      "Sign in to view your commitments.",
    ]),
    activeHref: "/commitments?tab=ledger",
    activeLabel: "Ledger",
    requireDeploymentId: true,
  }),
  Object.freeze({
    name: "completed",
    path: "/commitments?tab=completed",
    requiredText: Object.freeze([
      "Additional resources you caused.",
      "Sign in to view your commitments.",
    ]),
    activeHref: "/commitments?tab=completed",
    activeLabel: "Completed",
    requireDeploymentId: true,
  }),
  Object.freeze({
    name: "calendar",
    path: "/commitments?tab=calendar",
    requiredText: Object.freeze([
      "Additional resources you caused.",
      "Sign in to view your commitments.",
    ]),
    activeHref: "/commitments?tab=calendar",
    activeLabel: "Calendar",
    requireDeploymentId: true,
  }),
]);

export function buildCanonicalResourcePatch() {
  return {
    resourceConfig: {
      buildMachineType: "standard",
      elasticConcurrencyEnabled: false,
      buildQueue: {
        configuration: "WAIT_FOR_NAMESPACE_QUEUE",
      },
    },
  };
}

export function isVercelManagedDomain(value) {
  const domain = String(value ?? "").toLowerCase();
  return domain === "vercel.app" || domain.endsWith(".vercel.app");
}

export function validateDisposableProject(project, expected, domains = []) {
  if (!project || project.id !== expected.id || project.name !== expected.name) {
    throw new Error(
      `Refusing to delete unexpected project for ${expected.name}: ${JSON.stringify({
        id: project?.id,
        name: project?.name,
      })}`,
    );
  }

  const customDomains = domains
    .map((entry) => (typeof entry === "string" ? entry : entry?.name))
    .filter(Boolean)
    .filter((domain) => !isVercelManagedDomain(domain));
  if (customDomains.length > 0) {
    throw new Error(
      `Refusing to delete ${expected.name}; it has custom domains: ${customDomains.join(", ")}`,
    );
  }

  return true;
}

function safeLink(link) {
  if (!link || typeof link !== "object") return null;
  return {
    type: link.type ?? null,
    org: link.org ?? null,
    repo: link.repo ?? null,
    repoId: link.repoId ?? null,
    productionBranch: link.productionBranch ?? null,
  };
}

function safeDeploymentSummary(deployment) {
  if (!deployment || typeof deployment !== "object") return null;
  const id = deployment.id ?? deployment.uid ?? null;
  if (!id) return null;
  return {
    id,
    readyState: deployment.readyState ?? deployment.state ?? null,
    target: deployment.target ?? null,
    createdAt: deployment.createdAt ?? deployment.created ?? null,
  };
}

export function selectReadyProductionDeployment(deployments = []) {
  return (
    deployments
      .map(safeDeploymentSummary)
      .filter(
        (deployment) =>
          deployment?.readyState === "READY" &&
          deployment.target === "production",
      )
      .sort(
        (left, right) =>
          Number(right.createdAt ?? 0) - Number(left.createdAt ?? 0),
      )[0] ?? null
  );
}

export function safeProjectSummary(
  project,
  domains = [],
  productionDeployments = [],
) {
  if (!project) return null;
  const resourceConfig = project.resourceConfig
    ? {
        buildMachineType: project.resourceConfig.buildMachineType ?? null,
        buildQueue:
          project.resourceConfig.buildQueue?.configuration ?? null,
        ...(Object.hasOwn(
          project.resourceConfig,
          "elasticConcurrencyEnabled",
        )
          ? {
              elasticConcurrencyEnabled:
                project.resourceConfig.elasticConcurrencyEnabled,
            }
          : {}),
      }
    : null;

  return {
    id: project.id,
    name: project.name,
    live: project.live ?? null,
    framework: project.framework ?? null,
    link: safeLink(project.link),
    domains: domains
      .map((entry) => (typeof entry === "string" ? entry : entry?.name))
      .filter(Boolean)
      .sort(),
    resourceConfig,
    speedInsightsEnabled: Boolean(project.speedInsights?.enabledAt),
    webAnalyticsEnabled: Boolean(project.webAnalytics?.enabledAt),
    latestDeployment: safeDeploymentSummary(
      project.latestDeployments?.[0],
    ),
    productionDeployment:
      selectReadyProductionDeployment(productionDeployments),
  };
}

function apiUrl(path) {
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId", VERCEL_TEAM_ID);
  return url;
}

async function request(path, { token, method = "GET", body, allow404 = false } = {}) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (allow404 && response.status === 404) return null;
  const text = await response.text();
  const parsed = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed with ${response.status}: ${JSON.stringify(parsed)}`,
    );
  }
  return parsed;
}

async function getProject(token, id, { allow404 = false } = {}) {
  return request(`/v9/projects/${encodeURIComponent(id)}`, {
    token,
    allow404,
  });
}

async function getDomains(token, id, { allow404 = false } = {}) {
  const response = await request(
    `/v9/projects/${encodeURIComponent(id)}/domains?limit=100`,
    { token, allow404 },
  );
  return response?.domains ?? [];
}

async function getProductionDeployments(token, id) {
  const response = await request(
    `/v6/deployments?projectId=${encodeURIComponent(id)}&target=production&limit=20`,
    { token },
  );
  return response?.deployments ?? [];
}

async function inspectProject(
  token,
  expected,
  { allow404 = false, includeProductionDeployments = false } = {},
) {
  const project = await getProject(token, expected.id, { allow404 });
  if (!project) return null;
  if (project.id !== expected.id || project.name !== expected.name) {
    throw new Error(
      `Project identity mismatch for ${expected.name}: ${JSON.stringify({
        id: project.id,
        name: project.name,
      })}`,
    );
  }
  const domains = await getDomains(token, expected.id);
  const productionDeployments = includeProductionDeployments
    ? await getProductionDeployments(token, expected.id)
    : [];
  return {
    project,
    domains,
    summary: safeProjectSummary(
      project,
      domains,
      productionDeployments,
    ),
  };
}

async function audit(token) {
  const canonical = await inspectProject(token, CANONICAL_PROJECT, {
    includeProductionDeployments: true,
  });
  const duplicate = await inspectProject(token, DUPLICATE_PROJECT, {
    allow404: true,
  });
  const obsolete = [];
  for (const expected of OBSOLETE_TEST_PROJECTS) {
    const inspected = await inspectProject(token, expected, { allow404: true });
    obsolete.push({ expected, summary: inspected?.summary ?? null });
  }
  return {
    checkedAt: new Date().toISOString(),
    canonical: canonical.summary,
    duplicate: duplicate?.summary ?? null,
    obsolete,
  };
}

async function applyCanonicalSettings(token) {
  const before = await inspectProject(token, CANONICAL_PROJECT);
  await request(`/v9/projects/${encodeURIComponent(CANONICAL_PROJECT.id)}`, {
    token,
    method: "PATCH",
    body: buildCanonicalResourcePatch(),
  });
  const after = await inspectProject(token, CANONICAL_PROJECT);
  return { before: before.summary, after: after.summary };
}

async function deleteObsoleteProjects(token) {
  const deleted = [];
  for (const expected of OBSOLETE_TEST_PROJECTS) {
    const inspected = await inspectProject(token, expected, { allow404: true });
    if (!inspected) {
      deleted.push({ ...expected, status: "already_absent" });
      continue;
    }
    validateDisposableProject(inspected.project, expected, inspected.domains);
    await request(`/v9/projects/${encodeURIComponent(expected.id)}`, {
      token,
      method: "DELETE",
    });
    deleted.push({ ...expected, status: "deleted" });
  }
  return deleted;
}

async function resumeCanonicalProject(token) {
  await request(`/v1/projects/${encodeURIComponent(CANONICAL_PROJECT.id)}/unpause`, {
    token,
    method: "POST",
  });
  return true;
}

export function verifyCanonicalSettings(summary) {
  if (!summary) throw new Error("Canonical Vercel project is missing.");
  const config = summary.resourceConfig;
  if (config?.buildMachineType !== "standard") {
    throw new Error(
      `Canonical build machine is not standard: ${JSON.stringify(config)}`,
    );
  }
  if (!Object.hasOwn(config, "elasticConcurrencyEnabled")) {
    throw new Error(
      `On-demand build concurrency readback is missing: ${JSON.stringify(config)}`,
    );
  }
  if (
    config.elasticConcurrencyEnabled !== false &&
    config.elasticConcurrencyEnabled !== null
  ) {
    throw new Error(
      `On-demand build concurrency is not disabled: ${JSON.stringify(config)}`,
    );
  }
  if (config.buildQueue !== "WAIT_FOR_NAMESPACE_QUEUE") {
    throw new Error(
      `Canonical build queue is not serialized: ${JSON.stringify(config)}`,
    );
  }
  return true;
}

export function verifyCanonicalLive(summary) {
  if (!summary) throw new Error("Canonical Vercel project is missing.");
  const productionDeployment = summary.productionDeployment;
  const domains = new Set(summary.domains ?? []);
  const canonicalAliasesAssigned =
    domains.has("moraltrade.org") &&
    domains.has("www.moraltrade.org");
  const productionIsReady =
    Boolean(productionDeployment?.id) &&
    productionDeployment.readyState === "READY" &&
    productionDeployment.target === "production";

  if (!productionIsReady || !canonicalAliasesAssigned) {
    throw new Error(
      `Canonical Vercel project is not operational: ${JSON.stringify({
        id: summary.id,
        name: summary.name,
        live: summary.live,
        productionDeployment: productionDeployment ?? null,
        domains: [...domains].sort(),
      })}`,
    );
  }
  return true;
}

async function verify(
  token,
  {
    requireWebsite2Disconnected,
    requireObsoleteAbsent,
    requireCanonicalLive,
  },
) {
  const report = await audit(token);
  verifyCanonicalSettings(report.canonical);

  if (requireCanonicalLive) verifyCanonicalLive(report.canonical);
  if (requireWebsite2Disconnected && report.duplicate?.link) {
    throw new Error(
      `website2 remains connected to Git: ${JSON.stringify(report.duplicate.link)}`,
    );
  }
  if (
    requireObsoleteAbsent &&
    report.obsolete.some((entry) => entry.summary !== null)
  ) {
    throw new Error("At least one obsolete Vercel test project still exists.");
  }
  return report;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasActiveAnchor(html, href, label) {
  const anchors = String(html).match(/<a\b[^>]*>[^<]*<\/a>/g) ?? [];
  const hrefPattern = new RegExp(`\\bhref="${escapeRegex(href)}"`);
  const labelPattern = new RegExp(`>${escapeRegex(label)}<\\/a>$`);
  return anchors.some(
    (anchor) =>
      /\baria-current="page"/.test(anchor) &&
      hrefPattern.test(anchor) &&
      labelPattern.test(anchor),
  );
}

export function evaluateProductionRoute(check, response) {
  const body = String(response.body ?? "");
  const failures = [];
  const status = Number(response.status ?? 0);
  const contentType = String(response.contentType ?? "");
  const deploymentId = body.match(/\bdata-dpl-id="([^"]+)"/)?.[1] ?? null;

  if (status !== 200) failures.push(`expected HTTP 200, received ${status}`);
  if (/DEPLOYMENT_DISABLED|Payment Required/i.test(body)) {
    failures.push("response is deployment-disabled or billing-blocked");
  }
  if (!contentType.toLowerCase().includes("text/html")) {
    failures.push(`expected text/html, received ${contentType || "unknown"}`);
  }
  for (const marker of check.requiredText ?? []) {
    if (!body.includes(marker)) failures.push(`missing marker: ${marker}`);
  }
  if (
    check.activeHref &&
    check.activeLabel &&
    !hasActiveAnchor(body, check.activeHref, check.activeLabel)
  ) {
    failures.push(`active tab mismatch: ${check.activeLabel}`);
  }
  if (check.requireDeploymentId && !deploymentId) {
    failures.push("missing data-dpl-id on Next.js route");
  }

  return {
    name: check.name,
    path: check.path,
    status,
    finalUrl: response.finalUrl ?? null,
    contentType: contentType || null,
    deploymentId,
    passed: failures.length === 0,
    failures,
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchProductionRoute(check, { baseUrl, fetchImpl, timeoutMs }) {
  try {
    const response = await fetchImpl(new URL(check.path, baseUrl), {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Cache-Control": "no-cache",
        "User-Agent": "MoralTrade-production-recovery-smoke/1.0",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    return evaluateProductionRoute(check, {
      status: response.status,
      body,
      contentType: response.headers.get("content-type") ?? "",
      finalUrl: response.url,
    });
  } catch (error) {
    return {
      name: check.name,
      path: check.path,
      status: 0,
      finalUrl: null,
      contentType: null,
      deploymentId: null,
      passed: false,
      failures: [
        `request failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

export async function runProductionSmoke({
  baseUrl = "https://www.moraltrade.org",
  checks = PRODUCTION_ROUTE_CHECKS,
  fetchImpl = fetch,
  attempts = 30,
  intervalMs = 10_000,
  timeoutMs = 15_000,
  sleep = defaultSleep,
} = {}) {
  const normalizedBaseUrl = new URL(baseUrl).toString();
  let routes = [];
  let attempt = 0;

  for (attempt = 1; attempt <= attempts; attempt += 1) {
    routes = await Promise.all(
      checks.map((check) =>
        fetchProductionRoute(check, {
          baseUrl: normalizedBaseUrl,
          fetchImpl,
          timeoutMs,
        }),
      ),
    );

    const deploymentIds = [
      ...new Set(routes.map((route) => route.deploymentId).filter(Boolean)),
    ];
    const allRoutesPassed = routes.every((route) => route.passed);
    const deploymentIsConsistent = deploymentIds.length <= 1;

    if (allRoutesPassed && deploymentIsConsistent) {
      return {
        checkedAt: new Date().toISOString(),
        baseUrl: normalizedBaseUrl,
        attemptsUsed: attempt,
        passed: true,
        deploymentIds,
        routes,
      };
    }

    if (attempt < attempts) await sleep(intervalMs);
  }

  const deploymentIds = [
    ...new Set(routes.map((route) => route.deploymentId).filter(Boolean)),
  ];
  if (deploymentIds.length > 1) {
    routes = routes.map((route) => ({
      ...route,
      passed: false,
      failures: [
        ...route.failures,
        `commitment routes resolved to inconsistent deployments: ${deploymentIds.join(", ")}`,
      ],
    }));
  }

  return {
    checkedAt: new Date().toISOString(),
    baseUrl: normalizedBaseUrl,
    attemptsUsed: attempt - 1,
    passed: false,
    deploymentIds,
    routes,
  };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes)$/i.test(String(value));
}

async function writeReport(report) {
  const output = process.env.VERCEL_COST_CONTROL_REPORT;
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (output) await writeFile(output, text, "utf8");
  else process.stdout.write(text);
}

async function requireToken() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is required.");
  return token;
}

async function main() {
  const mode = process.env.VERCEL_COST_CONTROL_MODE || "audit";

  if (mode === "smoke") {
    const report = await runProductionSmoke({
      baseUrl:
        process.env.VERCEL_PRODUCTION_BASE_URL ||
        "https://www.moraltrade.org",
      attempts: parsePositiveInteger(
        process.env.VERCEL_PRODUCTION_SMOKE_ATTEMPTS,
        30,
      ),
      intervalMs: parsePositiveInteger(
        process.env.VERCEL_PRODUCTION_SMOKE_INTERVAL_MS,
        10_000,
      ),
      timeoutMs: parsePositiveInteger(
        process.env.VERCEL_PRODUCTION_SMOKE_TIMEOUT_MS,
        15_000,
      ),
    });
    await writeReport(report);
    if (!report.passed) {
      throw new Error(
        `Canonical production smoke failed after ${report.attemptsUsed} attempt(s).`,
      );
    }
    return;
  }

  const token = await requireToken();
  if (mode === "audit") {
    await writeReport(await audit(token));
    return;
  }

  if (mode === "apply") {
    const result = {
      appliedAt: new Date().toISOString(),
      canonical: await applyCanonicalSettings(token),
      obsolete: parseBoolean(process.env.DELETE_OBSOLETE_PROJECTS, true)
        ? await deleteObsoleteProjects(token)
        : [],
      resumed: parseBoolean(process.env.RESUME_CANONICAL_PROJECT)
        ? await resumeCanonicalProject(token)
        : false,
    };
    await writeReport(result);
    return;
  }

  if (mode === "verify") {
    await writeReport(
      await verify(token, {
        requireWebsite2Disconnected: parseBoolean(
          process.env.REQUIRE_WEBSITE2_DISCONNECTED,
          true,
        ),
        requireObsoleteAbsent: parseBoolean(
          process.env.REQUIRE_OBSOLETE_ABSENT,
          true,
        ),
        requireCanonicalLive: parseBoolean(
          process.env.REQUIRE_CANONICAL_LIVE,
          false,
        ),
      }),
    );
    return;
  }

  throw new Error(`Unsupported VERCEL_COST_CONTROL_MODE: ${mode}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
