import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const bridge = readFileSync(path.join(process.cwd(), "public/moral-trade-live-navigation.js"), "utf8");
const shell = `<!doctype html><html lang="en"><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px system-ui; }
  .topbar { padding: 14px; background: #050505; color: white; }
  .topbar nav { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .topbar nav button { padding: 11px 19px; border: 0; background: transparent; color: inherit; }
</style></head><body><header class="topbar"><nav aria-label="Primary navigation">
<button data-page="now">Now</button><button data-page="trade">Trade</button>
<button data-page="activity">Commitments</button>
</nav></header><main id="app"><div data-mt-live-now="adaptive"><main>Fixture</main></div></main>
</body></html>`;

// Isolated DOM regression tests, not a running Next.js app or live-account test.
// Only window.location is inert; the bridge and DOM event handlers are real.
const instrumentedBridge = `(function(window) { ${bridge} })(globalThis.__fixtureWindow);`;

test.beforeEach(async ({ page }) => {
  await page.setContent(shell);
  await page.evaluate(() => {
    Object.assign(globalThis, {
      __destinations: [],
      __fixtureWindow: { location: { assign: (to: string) => {
        (globalThis as unknown as { __destinations: string[] }).__destinations.push(to);
      } } },
    });
  });
});

test("legacy More retains controls, keyboard behavior, routes, and landmarks", async ({ page }) => {
  const originalTrade = await page.locator('[data-page="trade"]').elementHandle();
  await page.addScriptTag({ content: instrumentedBridge });
  await page.addScriptTag({ content: instrumentedBridge });
  const menu = page.locator("[data-mt-secondary-navigation]");
  await expect(menu).toHaveCount(1);
  await expect(page.locator("#mt-secondary-navigation-styles")).toHaveCount(1);
  await expect(page.locator("[data-mt-secondary-links] > *")).toHaveCount(2);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("#mt-live-document-heading")).toHaveCount(1);
  expect(await originalTrade!.evaluate((node) => node === document.querySelector('[data-page="trade"]'))).toBe(true);

  const summary = menu.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("open", "");
  await menu.locator("[data-mt-evidence-link]").focus();
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
  await expect(summary).toBeFocused();

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await summary.click();
    const box = await menu.locator("[data-mt-secondary-links]").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect((await menu.locator("[data-mt-evidence-link]").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.mouse.click(4, 700);
    await expect(menu).not.toHaveAttribute("open");
  }

  await summary.click();
  await menu.locator("[data-mt-evidence-link]").click();
  expect(await page.evaluate(() => (globalThis as unknown as { __destinations: string[] }).__destinations))
    .toEqual(["/evidence"]);
  await expect(menu).not.toHaveAttribute("open");
  await expect(menu.locator("[data-mt-optional-tour]")).toHaveAttribute("href", "/walkthrough");
});

test("navigation inserted after bootstrap still gains one secondary menu", async ({ page }) => {
  await page.locator("header").evaluate((node) => node.remove());
  await page.addScriptTag({ content: instrumentedBridge });
  await page.evaluate(() => {
    document.body.insertAdjacentHTML("afterbegin",
      '<header class="topbar"><nav><button data-page="now">Now</button></nav></header>');
  });
  await expect(page.locator("[data-mt-secondary-navigation]")).toHaveCount(1);
  await expect(page.locator("[data-mt-secondary-links] > *")).toHaveCount(2);
});
