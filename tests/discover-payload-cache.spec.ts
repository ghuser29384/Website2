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
