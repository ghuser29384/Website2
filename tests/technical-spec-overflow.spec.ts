import { expect, test } from "@playwright/test";

// Contract identifiers must remain readable even before downloaded fonts arrive.
// These failure-mode checks supplement (rather than replace) the normal visual suite.
for (const width of [1440, 390]) {
  for (const fonts of ["normal", "unavailable"] as const) {
    test(`technical specification preserves readable content at ${width}px with ${fonts} fonts`, async ({ page, baseURL }, testInfo) => {
      test.setTimeout(90_000);
      if (!baseURL) throw new Error("The specification check requires the configured app origin.");
      await page.setViewportSize({ width, height: 1000 });
      await page.context().addCookies([
        { name: "mt_analytics_opt_out", value: "1", url: baseURL, sameSite: "Lax" },
      ]);
      if (fonts === "unavailable") {
        await page.route(/\.(woff2?|ttf|otf)(\?|$)/, (route) => route.abort("failed"));
      }
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto("/moral-trade/technical-spec", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.locator(".protocol-contract-card").first()).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        cards: Array.from(document.querySelectorAll<HTMLElement>(".protocol-contract-card"))
          .filter((card) => card.scrollWidth > card.clientWidth + 1)
          .map((card) => ({
            heading: card.querySelector("h3")?.textContent,
            width: card.clientWidth,
            scrollWidth: card.scrollWidth,
          })),
      }));
      expect(dimensions.document, "The document must not overflow horizontally.").toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.cards, "Contract identifiers must wrap inside their cards, not be clipped.").toEqual([]);

      // Dense matrices retain their own scrolling; fitting the page must not hide columns.
      const matrix = page.locator(".protocol-check-table").first();
      await expect(matrix).toBeVisible();
      if (width === 390) {
        const scroll = await matrix.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
          return {
            position: element.scrollLeft,
            overflow: getComputedStyle(element).overflowX,
          };
        });
        expect(scroll.overflow).toBe("auto");
        expect(scroll.position).toBeGreaterThan(0);
      }
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`technical-spec-${width}-${fonts}.png`) });
    });
  }
}
