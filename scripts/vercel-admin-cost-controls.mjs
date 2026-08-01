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

export function safeProjectSummary(project, domains = []) {
  if (!project) return null;
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
    resourceConfig: project.resourceConfig
      ? {
          buildMachineType: project.resourceConfig.buildMachineType ?? null,
          elasticConcurrencyEnabled:
            project.resourceConfig.elasticConcurrencyEnabled ?? null,
          buildQueue:
            project.resourceConfig.buildQueue?.configuration ?? null,
        }
      : null,
    speedInsightsEnabled: Boolean(project.speedInsights?.enabledAt),
    webAnalyticsEnabled: Boolean(project.webAnalytics?.enabledAt),
    latestDeployment: project.latestDeployments?.[0]
      ? {
          id: project.latestDeployments[0].id,
          readyState: project.latestDeployments[0].readyState,
          target: project.latestDeployments[0].target ?? null,
          createdAt: project.latestDeployments[0].createdAt ?? null,
        }
      : null,
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

async function inspectProject(token, expected, { allow404 = false } = {}) {
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
  return { project, domains, summary: safeProjectSummary(project, domains) };
}

async function audit(token) {
  const canonical = await inspectProject(token, CANONICAL_PROJECT);
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

function verifyCanonicalSettings(summary) {
  if (!summary) throw new Error("Canonical Vercel project is missing.");
  const config = summary.resourceConfig;
  if (config?.buildMachineType !== "standard") {
    throw new Error(
      `Canonical build machine is not standard: ${JSON.stringify(config)}`,
    );
  }
  if (config.elasticConcurrencyEnabled !== false) {
    throw new Error(
      `On-demand build concurrency remains enabled: ${JSON.stringify(config)}`,
    );
  }
  if (config.buildQueue !== "WAIT_FOR_NAMESPACE_QUEUE") {
    throw new Error(
      `Canonical build queue is not serialized: ${JSON.stringify(config)}`,
    );
  }
}

async function verify(token, { requireWebsite2Disconnected, requireObsoleteAbsent }) {
  const report = await audit(token);
  verifyCanonicalSettings(report.canonical);

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

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is required.");

  const mode = process.env.VERCEL_COST_CONTROL_MODE || "audit";
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
