import { mkdir } from "node:fs/promises";

import { expect, test, type Page, type Request } from "@playwright/test";

const LOCAL_ORIGIN = "http://127.0.0.1:3210";

function isExpectedBrowserAbort(request: Request) {
  const failure = request.failure();
  if (failure?.errorText !== "net::ERR_ABORTED" || request.isNavigationRequest()) return false;

  const url = new URL(request.url());
  if (url.origin !== LOCAL_ORIGIN) return false;

  const headers = request.headers();
  const isNextRoutePrefetch =
    request.method() === "GET" &&
    request.resourceType() === "fetch" &&
    (url.searchParams.has("_rsc") ||
      headers["next-router-prefetch"] === "1" ||
      headers.rsc === "1" ||
      Object.hasOwn(headers, "next-url"));
  const isDiscoverLinkPrefetch =
    request.method() === "GET" &&
    url.pathname === "/discover" &&
    url.searchParams.get("domain") === "offers" &&
    url.searchParams.get("view") === "list";
  const isBestEffortFunnelEvent =
    request.method() === "POST" && url.pathname === "/api/funnel-events";
  const isSupersededInputAssistLoad =
    request.method() === "GET" &&
    [
      "/moral-trade-input-assist.js",
      "/moral-trade-input-standards.json",
    ].includes(url.pathname);

  return (
    isNextRoutePrefetch ||
    isDiscoverLinkPrefetch ||
    isBestEffortFunnelEvent ||
    isSupersededInputAssistLoad
  );
}

function monitorBrowserFailures(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (isExpectedBrowserAbort(request)) return;
    failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`,
    );
  });

  return { consoleErrors, pageErrors, failedRequests };
}

async function openCommitments(page: Page, path = "/commitments") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Additional resources you caused." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Commitments sections" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

test("Commitments exposes truthful live-data sections and no visual-fixture values", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const failures = monitorBrowserFailures(page);
  await openCommitments(page);

  const tabs = page.getByRole("navigation", { name: "Commitments sections" });
  for (const label of ["Portfolio", "Ledger", "Completed", "Calendar"]) {
    await expect(tabs.getByRole("link", { name: label })).toBeVisible();
  }

  await expect(page.getByRole("heading", { name: "Sign in to view your commitments." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toHaveAttribute(
    "href",
    "/login?returnTo=/commitments",
  );

  for (const synthetic of [
    "$540",
    "$18,760",
    "Counteroffer received",
    "Salary-gap pool at 81%",
    "Factory-farming redirect",
  ]) {
    await expect(page.locator("body")).not.toContainText(synthetic);
  }

  for (const [label, path] of [
    ["Ledger", "/commitments?tab=ledger"],
    ["Completed", "/commitments?tab=completed"],
    ["Calendar", "/commitments?tab=calendar"],
  ] as const) {
    await openCommitments(page, path);
    await expect(
      page.getByRole("navigation", { name: "Commitments sections" }).getByRole("link", { name: label }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Sign in to view your commitments." })).toBeVisible();
  }

  await expectNoHorizontalOverflow(page);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/commitments-desktop.png", fullPage: true });

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.failedRequests).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`Commitments remains readable without horizontal overflow at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const failures = monitorBrowserFailures(page);
    await openCommitments(page);

    await expect(page.getByRole("heading", { name: "Sign in to view your commitments." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to continue" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await mkdir("test-results", { recursive: true });
    await page.screenshot({
      path: `test-results/commitments-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });

    expect(failures.consoleErrors).toEqual([]);
    expect(failures.pageErrors).toEqual([]);
    expect(failures.failedRequests).toEqual([]);
  });
}
