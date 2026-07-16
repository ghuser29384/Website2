import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.PLEDGE_SWAPS_CAPTURE === "1";
const captureDirectory = path.join("test-results", "pledge-swaps-visual");

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

test.describe("Pledge swaps explainer", () => {
  test("makes the mechanism and reliance boundary obvious", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/pledge-swaps");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Make a promise. Get a promise you value.",
      }),
    ).toBeVisible();
    await expect(page.getByText("“I’ll do this”", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "One agreement. Four decisions." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A suggested match is not a deal." })).toBeVisible();
    await expect(page.getByText("No match, no obligation.", { exact: false })).toBeVisible();

    await expect(page.getByRole("link", { name: "Browse pledge swaps" }).first()).toHaveAttribute(
      "href",
      "/offers?mode=pledge",
    );
    await expect(page.getByRole("link", { name: "Create a pledge swap" }).first()).toHaveAttribute(
      "href",
      "/signup?returnTo=/offers/new%3Fmode%3Dpledge",
    );

    await expect(page.getByLabel("What meal did this cover?")).toHaveCount(0);
    await expect(page.getByText("Manual-review gates", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Score \d+/)).toHaveCount(0);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "implementation-desktop.png"),
      });
    }
  });

  test("stays readable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pledge-swaps");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Make a promise. Get a promise you value.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse pledge swaps" }).first()).toBeVisible();
    await expect(page.getByText("Not an active deal", { exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "implementation-mobile.png"),
      });
    }
  });
});
