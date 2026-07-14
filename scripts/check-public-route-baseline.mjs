#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(scriptDir, "../config/measurement/public-route-baseline.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const baseUrl = (process.env[config.baseUrlEnv] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outputPath = process.env[config.outputPathEnv] ?? config.defaultOutputPath;

function buildUrl(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function buildBlockers({ metrics, responseStatus }) {
  const blockers = [];

  if (!responseStatus || responseStatus < 200 || responseStatus >= 400) {
    blockers.push(`http_status_ok:${responseStatus ?? "missing"}`);
  }

  if (!metrics.hasMain) {
    blockers.push("main_content_present:false");
  }

  if (metrics.bodyTextCharacters < config.budgets.minBodyTextCharacters) {
    blockers.push(`nonblank_body:${metrics.bodyTextCharacters}`);
  }

  if (metrics.hasFrameworkOverlay) {
    blockers.push("no_framework_overlay:false");
  }

  if (metrics.domContentLoadedMs > config.budgets.maxDomContentLoadedMs) {
    blockers.push(`dom_content_loaded_budget:${metrics.domContentLoadedMs}`);
  }

  if (metrics.loadMs > config.budgets.maxLoadMs) {
    blockers.push(`load_budget:${metrics.loadMs}`);
  }

  if (metrics.scriptTags > config.budgets.maxScriptTags) {
    blockers.push(`script_count_budget:${metrics.scriptTags}`);
  }

  return blockers;
}

async function collectRoute(page, route) {
  const response = await page.goto(buildUrl(route.path), {
    timeout: 30000,
    waitUntil: "load",
  });

  await page.waitForSelector("main", { timeout: 5000 }).catch(() => {});
  await page
    .waitForFunction(
      (minBodyTextCharacters) =>
        (document.body?.innerText ?? "").trim().length >= minBodyTextCharacters,
      config.budgets.minBodyTextCharacters,
      { timeout: 5000 },
    )
    .catch(() => {});

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const bodyText = document.body?.innerText ?? "";

    return {
      bodyTextCharacters: bodyText.trim().length,
      domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
      hasFrameworkOverlay:
        /Application error|Hydration failed|Unhandled Runtime Error|Next\.js/i.test(bodyText),
      hasMain: Boolean(document.querySelector("main")),
      loadMs: Math.round(navigation?.loadEventEnd ?? 0),
      resourceCount: performance.getEntriesByType("resource").length,
      scriptTags: document.scripts.length,
      title: document.title,
    };
  });
  const responseStatus = response?.status() ?? null;
  const blockers = buildBlockers({ metrics, responseStatus });

  return {
    ...route,
    responseStatus,
    url: buildUrl(route.path),
    metrics,
    status: blockers.length ? "fail" : "pass",
    blockers,
  };
}

const browser = await chromium.launch();
const startedAt = new Date().toISOString();
const results = [];

try {
  for (const device of config.devices) {
    const context = await browser.newContext({
      userAgent: device.userAgent,
      viewport: device.viewport,
    });
    const page = await context.newPage();

    for (const route of config.routes) {
      results.push({
        device: device.key,
        deviceLabel: device.label,
        ...(await collectRoute(page, route)),
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((result) => result.status === "fail");
const report = {
  baseUrl,
  budgets: config.budgets,
  configVersion: config.version,
  failedCount: failed.length,
  generatedAt: new Date().toISOString(),
  publicNonClaims: config.publicNonClaims,
  resultCount: results.length,
  results,
  startedAt,
  status: failed.length ? "fail" : "pass",
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Moral Trade public-route baseline ${report.status}: ${results.length} checks`);
console.log(`Wrote ${outputPath}`);

if (failed.length) {
  for (const result of failed) {
    console.error(`${result.device} ${result.path}: ${result.blockers.join(", ")}`);
  }

  process.exitCode = 1;
}
