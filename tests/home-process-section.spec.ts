import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.HOME_PROCESS_CAPTURE === "1";
const captureDirectory = path.join("test-results", "home-process-visual");

async function prepareForVisualCapture(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    document.querySelectorAll("nextjs-portal").forEach((portal) => portal.remove());
  });

  await page.addStyleTag({
    content: ".skip-link, nextjs-portal { display: none !important; }",
  });
}

test.describe("Homepage process section", () => {
  test("shows the mechanism as an icon-led four-step flow on desktop", async ({ browser, page }) => {
    await page.setViewportSize({ width: 1560, height: 960 });
    await page.goto("/");

    const section = page.locator("section:has(#process-heading)");
    const flow = section.locator(".mt-how-grid");

    await expect(section).toBeVisible();

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);

      const metrics = await section.evaluate((element) => {
        const flowElement = element.querySelector<HTMLElement>(".mt-how-grid");
        const cta = element.querySelector<HTMLAnchorElement>(".mt-process-cta");
        const box = element.getBoundingClientRect();

        return {
          ctaHref: cta?.getAttribute("href") ?? null,
          flowColumns: flowElement
            ? getComputedStyle(flowElement).gridTemplateColumns.split(" ").filter(Boolean).length
            : null,
          iconCount: element.querySelectorAll(".mt-process-icon").length,
          sectionColumns: getComputedStyle(element).gridTemplateColumns
            .split(" ")
            .filter(Boolean).length,
          sectionHeight: box.height,
          stepLabels: Array.from(element.querySelectorAll(".mt-how-step h3"), (heading) =>
            heading.textContent?.trim(),
          ),
        };
      });

      await writeFile(
        path.join(captureDirectory, "desktop-metrics.json"),
        `${JSON.stringify(metrics, null, 2)}\n`,
        "utf8",
      );
      await section.screenshot({
        path: path.join(captureDirectory, "implementation-desktop.png"),
      });
    }

    await expect(
      page.getByRole("heading", { level: 2, name: "Trade actions. Keep your values." }),
    ).toBeVisible();
    await expect(section.locator(".mt-how-step")).toHaveCount(4);
    await expect(section.locator(".mt-process-icon")).toHaveCount(4);
    await expect(section.locator(".mt-process-cta")).toHaveAttribute(
      "href",
      "/signup?returnTo=/create",
    );
    await expect(section.locator('a[href="/how-it-works"]')).toHaveCount(0);

    const stepLabels = await section.locator(".mt-how-step h3").allTextContents();
    expect(stepLabels).toEqual(["No deal", "Clear offer", "Both say yes", "Deal receipt"]);

    const sectionColumnCount = await section.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(sectionColumnCount).toBe(2);

    const flowColumnCount = await flow.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(flowColumnCount).toBe(4);

    const sectionBox = await section.boundingBox();
    expect(sectionBox).not.toBeNull();
    expect(sectionBox!.height).toBeLessThan(700);

    if (captureVisuals) {
      const liveContext = await browser.newContext({ viewport: { width: 1560, height: 960 } });
      const livePage = await liveContext.newPage();
      await livePage.goto("https://moraltrade.org", { waitUntil: "domcontentloaded" });
      await prepareForVisualCapture(livePage);
      await livePage.locator("section:has(#process-heading)").screenshot({
        path: path.join(captureDirectory, "production-reference-desktop.png"),
      });
      await liveContext.close();
    }
  });

  test("stacks the visual flow cleanly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const section = page.locator("section:has(#process-heading)");
    const flow = section.locator(".mt-how-grid");

    await expect(section).toBeVisible();
    await expect(section.locator(".mt-how-step")).toHaveCount(4);
    await expect(section.locator(".mt-process-icon")).toHaveCount(4);

    const sectionColumnCount = await section.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(sectionColumnCount).toBe(1);

    const flowColumnCount = await flow.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(flowColumnCount).toBe(1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await section.screenshot({
        path: path.join(captureDirectory, "implementation-mobile.png"),
      });
    }
  });
});
