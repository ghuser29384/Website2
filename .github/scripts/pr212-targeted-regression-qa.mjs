import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.INSTITUTIONAL_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.INSTITUTIONAL_E2E_OUTPUT_DIR
  ? path.join(process.env.INSTITUTIONAL_E2E_OUTPUT_DIR, "targeted-regression")
  : "institutional-e2e-evidence/targeted-regression";

const routes = [
  { name: "offers", path: "/offers" },
  { name: "complete-profile", path: "/complete-profile" },
  { name: "create", path: "/trades/new" },
  { name: "feed", path: "/feed" },
  { name: "walkthrough", path: "/walkthrough" },
  { name: "evidence", path: "/evidence" },
  { name: "admin", path: "/admin" },
  { name: "login", path: "/login" },
  { name: "individual-institutional", path: "/institutions/individual" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const report = { baseUrl, startedAt: new Date().toISOString(), desktop: [], mobile: [] };

async function runViewport(label, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack ?? error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const results = [];
  for (const route of routes) {
    pageErrors.length = 0;
    consoleErrors.length = 0;
    const response = await page.goto(new URL(route.path, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(250);
    const status = response?.status() ?? null;
    const finalUrl = page.url();
    const bodyText = (await page.locator("body").innerText()).trim();
    const record = {
      ...route,
      status,
      finalUrl,
      bodyLength: bodyText.length,
      pageErrors: [...pageErrors],
      consoleErrors: [...consoleErrors],
    };
    results.push(record);
    await page.screenshot({
      path: path.join(outputDir, `${label}-${route.name}.png`),
      fullPage: true,
    });

    if (status !== null && status >= 500) {
      throw new Error(`${label} ${route.path} returned ${status}`);
    }
    if (bodyText.length === 0) {
      throw new Error(`${label} ${route.path} rendered an empty body`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`${label} ${route.path} page errors: ${pageErrors.join(" | ")}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`${label} ${route.path} console errors: ${consoleErrors.join(" | ")}`);
    }
  }

  // Fail closed on capacity leakage: an unauthenticated visitor must never receive an
  // organization-administration surface merely by navigating to a personal route.
  await page.goto(new URL("/institutions/individual", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const individualText = await page.locator("body").innerText();
  for (const forbidden of [
    "Delegated authority",
    "Institutional budgets",
    "Approval committees",
    "Enterprise integrations",
  ]) {
    if (individualText.includes(forbidden)) {
      throw new Error(`Unauthenticated personal-capacity route leaked: ${forbidden}`);
    }
  }

  await context.close();
  return results;
}

try {
  report.desktop = await runViewport("desktop", { width: 1440, height: 1000 });
  report.mobile = await runViewport("mobile", { width: 390, height: 844 });
  report.completedAt = new Date().toISOString();
  report.passed = true;
} catch (error) {
  report.completedAt = new Date().toISOString();
  report.passed = false;
  report.error = String(error?.stack ?? error);
  throw error;
} finally {
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
