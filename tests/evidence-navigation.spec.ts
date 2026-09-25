import { expect, test } from "@playwright/test";
import { join } from "node:path";

const bridgePath = join(process.cwd(), "public/moral-trade-live-navigation.js");
const menuLabels = ["Feed", "Discover", "Trade", "Commitments", "Tour"];

for (const width of [1440, 390]) {
  for (const tag of ["a", "button"] as const) {
    test(`Evidence stays out of the ${tag} menu, including a rebuilt menu, at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      const controls = ["Feed", "Discover", "Trade", "Commitments", "Evidence", "Tour"]
        .map((label) => `<${tag}${tag === "a" ? ` href="/${label === "Tour" ? "walkthrough" : label === "Trade" ? "trades/new" : label.toLowerCase()}"` : ""}>${label}</${tag}>`)
        .join("");
      await page.route("http://navigation.test/**", (route) => route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><head><title>Navigation regression fixture</title></head><body><header class="topbar"><nav aria-label="Primary">${controls}</nav></header><main id="app"><h2>Trade workspace fixture</h2><a href="/evidence">Evidence outside navigation</a><a href="/evidence/agreement-id">Trade-specific evidence</a></main></body></html>`,
      }));
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://navigation.test/feed");
      await page.addScriptTag({ path: bridgePath });
      const nav = page.getByRole("navigation", { name: "Primary", exact: true });
      await expect(nav.locator("a, button")).toHaveText(menuLabels);
      await expect(page.getByRole("link", { name: "Trade-specific evidence", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Evidence outside navigation", exact: true })).toBeVisible();

      // A client-side render must not bring Evidence back or duplicate Tour.
      await nav.evaluate((element, html) => { element.innerHTML = html; }, controls);
      await expect(nav.locator("a, button")).toHaveText(menuLabels);
      await page.addScriptTag({ path: bridgePath });
      await expect(nav.locator("a, button")).toHaveText(menuLabels);
      expect(errors).toEqual([]);

      await nav.getByText("Discover", { exact: true }).click();
      await expect(page).toHaveURL("http://navigation.test/discover");
    });
  }
}
