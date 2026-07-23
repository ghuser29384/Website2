import { writeFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

interface RouteEvidence {
  bodyText: string;
  consoleErrors: string[];
  failedResponses: Array<{ status: number; url: string }>;
  pageErrors: string[];
  route: string;
  status: number | null;
  title: string;
  url: string;
}

async function captureRouteEvidence(
  page: Page,
  route: string,
  label: string,
): Promise<RouteEvidence> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: Array<{ status: number; url: string }> = [];

  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onResponse = (response: { status(): number; url(): string }) => {
    if (response.status() >= 500) {
      failedResponses.push({ status: response.status(), url: response.url() });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  const response = await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("body")).toBeVisible();
  const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
  const evidence: RouteEvidence = {
    bodyText: bodyText.slice(0, 8_000),
    consoleErrors,
    failedResponses,
    pageErrors,
    route,
    status: response?.status() ?? null,
    title: await page.title(),
    url: page.url(),
  };

  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: test.info().outputPath(`${label}.png`),
  });
  await writeFile(
    test.info().outputPath(`${label}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  expect(evidence.status ?? 500).toBeLessThan(500);
  expect(bodyText.length).toBeGreaterThan(80);
  expect(bodyText).not.toContain("NO FILE");
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);

  return evidence;
}

async function exercisePublicRoutes(page: Page, prefix: string) {
  await captureRouteEvidence(page, "/", `${prefix}-home`);
  await captureRouteEvidence(page, "/offers", `${prefix}-offers`);

  const search = page.locator('input[type="search"]').first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill("animal welfare");
    await search.press("Enter");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Application error");
  }

  const offerHref = await page
    .locator('a[href^="/offers/"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href") ?? "")
        .find((href) => /^\/offers\/[0-9a-f-]{36}$/i.test(href)),
    );
  await captureRouteEvidence(
    page,
    offerHref || "/offers/00000000-0000-4000-8000-000000000000",
    `${prefix}-offer-detail`,
  );

  await captureRouteEvidence(page, "/trades/new", `${prefix}-create`);
  await captureRouteEvidence(page, "/evidence", `${prefix}-evidence`);
  await captureRouteEvidence(page, "/login", `${prefix}-login`);
  await captureRouteEvidence(page, "/signup", `${prefix}-signup`);
}

test("health endpoint exposes a non-secret release contract", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  const payload = (await response.json()) as Record<string, any>;

  expect(["ok", "degraded", "unavailable"]).toContain(payload.status);
  expect(payload.deployment).toEqual(
    expect.objectContaining({ environment: expect.any(String), version: expect.any(String) }),
  );
  expect(payload.checks).toEqual(
    expect.objectContaining({
      authAvailable: expect.any(Boolean),
      databaseAvailable: expect.any(Boolean),
      encryptionConfigured: expect.any(Boolean),
      privilegedClientConfigured: expect.any(Boolean),
      requiredDatabaseContractReady: expect.any(Boolean),
      storageAvailable: expect.any(Boolean),
      supabasePublicConfigAvailable: expect.any(Boolean),
    }),
  );
  expect(payload.features).toEqual(
    expect.objectContaining({
      nativeMoneyMovement: "disabled",
      settlementAndPayouts: "disabled",
    }),
  );
  expect(JSON.stringify(payload)).not.toMatch(/service[_-]?role[_-]?key|encryption[_-]?key/i);
});

test("desktop public routes render meaningful, inspectable states", async ({ page }) => {
  await page.setViewportSize({ height: 960, width: 1440 });
  await exercisePublicRoutes(page, "desktop");
});

test("mobile public routes render without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await exercisePublicRoutes(page, "mobile");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
