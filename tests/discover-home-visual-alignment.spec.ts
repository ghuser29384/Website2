import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

async function openDiscover(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/discover?domain=offers&view=list", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-header")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#command-input")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#mt-discover-home-alignment")).toHaveAttribute(
    "href",
    /moral-trade-discover-home-alignment\.css\?v=20260810/,
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.clientWidth).toBe(dimensions.innerWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

async function relevantConsoleErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  const handler = (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  };
  page.on("console", handler);
  try {
    await run();
  } finally {
    page.off("console", handler);
  }
  return errors.filter((message) => !message.includes("favicon"));
}

test.describe("Discover visual alignment with Home", () => {
  test("uses the canonical masthead, horizontal workspace navigation, and command handoff", async ({ page }, testInfo) => {
    const errors = await relevantConsoleErrors(page, async () => {
      await openDiscover(page, 1487, 1058);

      const nav = page.locator(".app-header .top-nav");
      await expect(nav.locator("a")).toHaveText([
        "Feed",
        "Discover",
        "Controls",
        "Trade",
        "Commitments",
        "Evidence",
      ]);

      const active = nav.getByRole("link", { name: "Discover", exact: true });
      await expect(active).toHaveAttribute("aria-current", "page");
      await expect(active).toHaveCSS("background-color", "rgb(255, 253, 248)");
      await expect(active).toHaveCSS("color", "rgb(17, 17, 17)");
      await expect(page.locator(".app-header")).toHaveCSS("background-color", "rgb(5, 5, 5)");

      const rail = page.locator(".left-rail");
      const main = page.locator(".discover-main");
      const railBox = await rail.boundingBox();
      const mainBox = await main.boundingBox();
      expect(railBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(mainBox!.y + 1);
      await expect(page.locator(".full-rail")).toHaveCSS("display", "flex");
      await expect(rail).toHaveCSS("border-right-width", "0px");

      const command = page.getByRole("button", { name: "Focus Discover command" });
      await command.click();
      await expect(page.locator("#command-input")).toBeFocused();

      await page.getByRole("tab", { name: "Pools", exact: true }).click();
      await expect(page.getByRole("tab", { name: "Pools", exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page).toHaveURL(/domain=pools/);
      await expect(page.locator(".app-header .top-nav a")).toHaveText([
        "Feed",
        "Discover",
        "Controls",
        "Trade",
        "Commitments",
        "Evidence",
      ]);

      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath("discover-home-alignment-desktop.png"),
        fullPage: false,
      });
    });
    expect(errors).toEqual([]);
  });

  test("preserves the visual system and usable controls on mobile", async ({ page }, testInfo) => {
    const errors = await relevantConsoleErrors(page, async () => {
      await openDiscover(page, 390, 844);

      await expect(page.locator(".app-header")).toHaveCSS("background-color", "rgb(5, 5, 5)");
      await expect(page.locator(".app-header .top-nav")).toHaveCSS("display", "none");
      await expect(page.locator(".mobile-tabs")).toBeVisible();
      const offersTab = page.getByRole("tab", { name: "Offers", exact: true });
      await expect(offersTab).toHaveAttribute("aria-selected", "true");
      await expect(offersTab).toHaveCSS("border-bottom-color", "rgb(21, 76, 255)");

      const command = page.getByRole("button", { name: "Focus Discover command" });
      await command.click();
      await expect(page.locator("#command-input")).toBeFocused();

      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath("discover-home-alignment-mobile.png"),
        fullPage: false,
      });
    });
    expect(errors).toEqual([]);
  });
});
