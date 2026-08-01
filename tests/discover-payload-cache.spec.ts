import { expect, test } from "@playwright/test";

test("Discover bypasses stale payload caches with content-versioned part URLs", async ({
  page,
}) => {
  const payloadRequests = new Set<string>();
  let manifestRequests = 0;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/discover/payload/manifest.json") manifestRequests += 1;
    if (/^\/discover\/payload\/\d+\.txt$/.test(url.pathname)) {
      payloadRequests.add(request.url());
    }
  });

  await page.goto("/discover?domain=offers&view=list", {
    waitUntil: "networkidle",
  });
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect(page.locator(".offer-transaction-row").first()).toBeVisible();
  await expect(
    page.locator('[data-exchange-side="offer"]').first(),
  ).toContainText("You offer");
  await expect(
    page.locator('[data-exchange-side="return"]').first(),
  ).toContainText("You get");

  const version = await page.evaluate(
    () =>
      (window as Window & { __MT_DISCOVER_PAYLOAD_VERSION__?: string })
        .__MT_DISCOVER_PAYLOAD_VERSION__ ?? "",
  );
  expect(version).toMatch(/^[a-f0-9]{40}$/);
  expect(manifestRequests).toBe(1);
  expect(payloadRequests.size).toBe(7);

  for (const requestUrl of payloadRequests) {
    const url = new URL(requestUrl);
    expect(url.searchParams.get("v")).toBe(version);
  }
});

test("Discover automatically recovers from one corrupted cached payload part", async ({
  page,
}) => {
  let corruptedFirstAttempt = false;
  const retriedParts = new Set<string>();
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/discover/payload/*.txt*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("reload")) retriedParts.add(url.pathname);

    if (
      url.pathname.endsWith("/0.txt") &&
      !url.searchParams.has("reload") &&
      !corruptedFirstAttempt
    ) {
      corruptedFirstAttempt = true;
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: "corrupted-first-attempt",
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/discover?domain=offers&view=list", {
    waitUntil: "networkidle",
  });

  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect(page.locator("body")).not.toContainText("Discover could not be loaded");
  await expect(page.locator(".offer-transaction-row").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Search$/i })).toBeVisible();

  expect(corruptedFirstAttempt).toBe(true);
  expect(retriedParts.size).toBe(7);
  expect(pageErrors).toEqual([]);

  await page.screenshot({
    path: "test-results/discover-loader-self-heal.png",
    fullPage: true,
  });
});
