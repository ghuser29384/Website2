import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";

const evidenceDir = process.env.EVIDENCE_DIR;
const deploymentUrl = process.env.DEPLOYMENT_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!evidenceDir || !deploymentUrl || !bypass) {
  throw new Error("EVIDENCE_DIR, DEPLOYMENT_URL, and VERCEL_AUTOMATION_BYPASS_SECRET are required.");
}

const reviewCopy =
  "Recommendations to review — not agreements, commitments, payments, or verified outcomes.";
const readyPayload = {
  authenticated: true,
  generatedAt: "2026-08-13T15:00:00.000Z",
  matchingOpportunityCount: 1,
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  profile: {
    causes: ["Global health"],
    weightedCauses: [],
    learningEnabled: false,
  },
  recentChanges: [],
  recommendations: [
    {
      id: "fixture-opportunity",
      opportunityType: "offer",
      href: "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
      ctaLabel: "Review proposal",
      ownerAlias: "Fixture participant",
      offeredCause: "Global health",
      requestedCause: "Climate action",
      offerAction: "Fund a reviewed health project.",
      requestAction: "Replace one short car trip.",
      verification: "Review the stated receipt terms.",
      duration: "One month",
      reason: "Matches a saved priority",
      reasonDetails: ["Matches Global health"],
    },
  ],
  routePlanner: {
    status: "ready",
    checkedAt: "2026-08-13T15:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 1,
  },
  status: "ready",
};

function monitor(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon") || text.includes("status of 404")) return;
    errors.push(`console: ${text}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    errors.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });
  page.on("response", (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin === new URL(deploymentUrl).origin && response.status() >= 500) {
      errors.push(`http ${response.status()}: ${response.url()}`);
    }
  });
  return errors;
}

async function newPage(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "samesitenone",
    },
  });
  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      domain: new URL(deploymentUrl).hostname,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  return { context, page: await context.newPage() };
}

async function assertBasePage(page) {
  const response = await page.goto(`${deploymentUrl}/`, { waitUntil: "domcontentloaded" });
  expect(response).not.toBeNull();
  expect(response.status()).toBe(200);
  await expect(page.locator("main#app")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible({ timeout: 30_000 });
  expect(new URL(page.url()).pathname).toBe("/");
  expect((await page.title()).trim().length).toBeGreaterThan(0);
  const body = await page.locator("body").innerText();
  expect(body.replace(/\s+/g, " ").trim().length).toBeGreaterThan(160);
  expect(body).not.toMatch(/Application error|Unhandled Runtime Error|Build Error|Failed to compile/i);
  await expect(page.locator("#mt-live-document-heading")).toHaveText(
    "Current opportunities and next actions",
  );
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.clientWidth).toBe(dimensions.innerWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

fs.mkdirSync(evidenceDir, { recursive: true });
const browser = await chromium.launch();
const results = [];

try {
  {
    const { context, page } = await newPage(browser, { width: 1487, height: 1058 });
    const errors = monitor(page);
    await assertBasePage(page);
    await expect(page.locator('[data-mt-live-now-state="signed_out"]')).toBeVisible();
    await expect(page.locator('[data-mt-now-review-boundary="true"]')).toHaveCount(0);
    await expect(page.locator("[data-mt-live-now-recommendation]")).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "hosted-signed-out-desktop.png"),
      fullPage: false,
    });
    expect(errors).toEqual([]);
    results.push({ state: "signed_out", viewport: "1487x1058", errors });
    await context.close();
  }

  for (const viewport of [
    { width: 1487, height: 1058, label: "desktop" },
    { width: 390, height: 844, label: "mobile" },
  ]) {
    const { context, page } = await newPage(browser, viewport);
    const errors = monitor(page);
    await page.route("**/api/live-now", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(readyPayload),
      });
    });
    await assertBasePage(page);
    await expect(page.locator('[data-mt-live-now-state="ready"]')).toBeVisible();
    await expect(page.locator("[data-mt-live-now-recommendation]")).toHaveCount(1);
    await expect(page.getByRole("note", { name: "Recommendation status" })).toHaveText(reviewCopy);
    await expect(page.getByRole("link", { name: /Review proposal/ })).toHaveAttribute(
      "href",
      "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
    );
    const details = page.locator(".mt-feed-details").first();
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.getByText("Matches Global health", { exact: true })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, `hosted-ready-${viewport.label}.png`),
      fullPage: false,
    });
    expect(errors).toEqual([]);
    results.push({
      state: "ready",
      viewport: `${viewport.width}x${viewport.height}`,
      errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(evidenceDir, "hosted-browser-qa.json"),
  `${JSON.stringify({ status: "pass", deploymentUrl, results }, null, 2)}\n`,
);
