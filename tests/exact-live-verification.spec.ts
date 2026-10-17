import { expect, test } from "@playwright/test";

test.describe("retired verification demo", () => {
  test("routes old record URLs to evidence without carrying a fabricated identity", async ({ page }) => {
    await page.goto("/complete-verification.html?record=wild-animal-research&from=calendar");
    await expect(page).toHaveURL(/\/evidence$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect read-only" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Record signed response" })).toHaveCount(0);
  });

  test("does not turn a local simulated signature into a server request", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("moraltrade.verification.wild-animal-research.v1", JSON.stringify({ signatures: { verifier: true, counterparty: true, platform: true }, provisionalRecorded: true })));
    const writes: string[] = [];
    await page.route("**/*", route => {
      const request = route.request();
      if (!["GET", "HEAD"].includes(request.method())) {
        writes.push(new URL(request.url()).pathname);
        return route.abort();
      }
      return route.continue();
    });
    await page.goto("/complete-verification.html?reset=1");
    await expect(page).toHaveURL(/\/evidence$/);
    expect(writes.filter(path => /verif|signature|settle|payment/.test(path))).toEqual([]);
    await expect(page.locator("[data-completion]" )).toHaveCount(0);
  });

  test("keeps explanatory links available without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:3210/complete-verification.html");
      await expect(page.getByRole("heading", { name: "The verification demo has been retired." })).toBeVisible();
      await expect(page.getByRole("link", { name: "Review real evidence" })).toHaveAttribute("href", "/evidence");
      await expect(page.getByRole("link", { name: "open your commitments" })).toHaveAttribute("href", "/commitments");
    } finally { await context.close(); }
  });
});
