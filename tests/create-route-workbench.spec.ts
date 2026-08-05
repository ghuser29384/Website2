import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.CREATE_ROUTE_CAPTURE === "1";
const captureDirectory = path.join("test-results", "create-route-visual");

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

async function captureFrame(frame: FrameLocator, filename: string) {
  await mkdir(captureDirectory, { recursive: true });
  await frame.locator("body").screenshot({
    animations: "disabled",
    path: path.join(captureDirectory, filename),
  });
}

async function captureCommonGroundPanel(frame: FrameLocator, filename: string) {
  await mkdir(captureDirectory, { recursive: true });
  await frame.locator("#commonGroundFields").screenshot({
    animations: "disabled",
    path: path.join(captureDirectory, filename),
  });
}

test.describe("Create route workbench", () => {
  test("routes /create into the unified, no-capture Create interface", async ({ browser, page }) => {
    let publishRequestCount = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/create/publish") publishRequestCount += 1;
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/create");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await expect(
      create.getByRole("heading", { level: 1, name: "What do you want to improve?" }),
    ).toBeVisible();
    await expect(
      create.getByText(
        "Create a trade, Donation Upgrade, or public-goods pool.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(create.locator("#screenCause")).toBeVisible();
    expect(publishRequestCount).toBe(0);

    if (captureVisuals) {
      await prepareForVisualCapture(page);
      await captureFrame(create, "implementation-default-desktop.png");
    }

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();

    await expect(create.locator("#fundModeGrid .fund-mode-choice")).toHaveCount(5);
    await expect(create.locator('[data-fund-mode="conditional"]')).toContainText(
      "Donation Upgrade",
    );
    await expect(create.locator('[data-fund-mode="commonGround"]')).toContainText(
      "Co-Fund",
    );
    await expect(create.locator('[data-fund-mode="dac"]')).toContainText("Threshold pool");

    await create.locator('[data-fund-mode="conditional"]').click();
    await expect(create.locator("#conditionalDonationEntry")).toBeVisible();
    await expect(create.getByRole("button", { name: "Set up donation →" })).toBeVisible();
    expect(publishRequestCount).toBe(0);

    if (captureVisuals) {
      await captureFrame(create, "implementation-conditional-donation-desktop.png");
    }

    await create.locator('[data-fund-mode="commonGround"]').click();
    await expect(create.locator("#commonGroundFields")).toBeVisible();
    await expect(create.locator("#dacCreateFields")).toBeHidden();
    await expect(
      create.getByRole("heading", { name: "Who should fund one project together?" }),
    ).toBeVisible();
    await expect(
      create.getByText("Are you participating in this Co-Fund?", { exact: true }),
    ).toBeVisible();
    await expect(
      create.getByText(
        "Typed text is not a participant until you explicitly select an account.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(create.getByRole("button", { name: /Review Co-Fund/ })).toBeDisabled();
    expect(publishRequestCount).toBe(0);

    const commonGroundWords = await create.locator("#commonGroundFields").evaluate((element) =>
      (element.textContent || "").trim().split(/\s+/).filter(Boolean).length,
    );
    expect(commonGroundWords).toBeLessThanOrEqual(180);

    if (captureVisuals) {
      await captureFrame(create, "implementation-common-ground-desktop.png");
      await captureCommonGroundPanel(create, "implementation-common-ground-panel-desktop.png");

      const liveContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const livePage = await liveContext.newPage();
      await livePage.goto("https://moraltrade.org/create", { waitUntil: "domcontentloaded" });
      await prepareForVisualCapture(livePage);
      await livePage.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "production-reference-desktop.png"),
      });
      await liveContext.close();
    }
  });

  test("keeps the unified Common Ground editor usable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/create");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();
    await create.locator('[data-fund-mode="commonGround"]').click();
    await expect(create.locator("#commonGroundFields")).toBeVisible();

    const frameHasHorizontalOverflow = await create.locator("html").evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    const parentHasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(frameHasHorizontalOverflow).toBe(false);
    expect(parentHasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await captureFrame(create, "implementation-common-ground-mobile.png");
      await page.setViewportSize({ width: 390, height: 2200 });
      await captureCommonGroundPanel(create, "implementation-common-ground-panel-mobile.png");
    }
  });

  test("keeps the Donation Upgrade entry usable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.locator('[data-request-kind="fund"]').click();
    await create.locator('[data-fund-mode="conditional"]').click();
    await expect(create.locator("#conditionalDonationEntry")).toBeVisible();
    await expect(create.getByRole("button", { name: "Set up donation →" })).toBeVisible();

    const frameHasHorizontalOverflow = await create.locator("html").evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    const parentHasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(frameHasHorizontalOverflow).toBe(false);
    expect(parentHasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await captureFrame(create, "implementation-conditional-donation-mobile.png");
    }
  });

  test("opens a bounded Back intake without publishing or authorizing it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/create?mode=back");

    await expect(
      page.getByRole("heading", { level: 1, name: "Close a verified compensation gap." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Back preview" })).toBeVisible();
    await expect(page.getByLabel("No-deal baseline")).toBeVisible();
    await expect(page.getByLabel("Maximum backing requested")).toBeVisible();
    await expect(page.getByLabel("Exit and fallback rule")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account before drafting" })).toHaveAttribute(
      "href",
      "/signup?returnTo=%2Fcreate%3Fmode%3Dback",
    );
    await expect(page.getByRole("button", { name: "Request operator review" })).toHaveCount(0);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "back-draft-mobile.png"),
      });
    }
  });
});
