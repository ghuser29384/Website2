import { expect, test, type Locator, type Page } from "@playwright/test";

interface Rect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

async function rect(locator: Locator): Promise<Rect> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return {
    bottom: box!.y + box!.height,
    height: box!.height,
    left: box!.x,
    right: box!.x + box!.width,
    top: box!.y,
    width: box!.width,
  };
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.clientWidth).toBe(dimensions.innerWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

test("Start action choices render as distinct non-overlapping rows", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/start", { timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: "Get started" })).toBeVisible();
  const choices = page.getByRole("navigation", { name: "Ways to get started" });
  const links = choices.getByRole("link");
  await expect(links).toHaveCount(4);
  await expect(page.getByRole("complementary", { name: "Current service state" })).toHaveCount(0);
  const bounds = await rect(choices);
  let previousBottom = bounds.top;
  for (const link of await links.all()) {
    await expect(link).toBeVisible();
    const box = await rect(link);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.left).toBeGreaterThanOrEqual(bounds.left);
    expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
    expect(box.top).toBeGreaterThanOrEqual(previousBottom - 1);
    previousBottom = box.bottom;
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("start-choices-1440.png"), fullPage: false });
});

test("Complete Profile header actions remain separated on desktop and mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let response = await page.goto("/complete-profile", {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: "Set up your profile." })).toBeVisible();

  const sources = page.getByRole("button", { name: /^Sources/ });
  const save = page.getByRole("link", { exact: true, name: "Browse trades" });
  await expect(sources).toBeVisible();
  await expect(save).toBeVisible();

  const sourcesDesktop = await rect(sources);
  const saveDesktop = await rect(save);
  expect(sourcesDesktop.bottom + 4 <= saveDesktop.top || sourcesDesktop.right + 4 <= saveDesktop.left).toBe(true);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("complete-profile-header-1440.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  response = await page.reload({ timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(sources).toBeVisible();
  await expect(save).toBeVisible();

  const sourcesMobile = await rect(sources);
  const saveMobile = await rect(save);
  const separatedHorizontally = sourcesMobile.right + 4 <= saveMobile.left;
  const separatedVertically =
    sourcesMobile.bottom + 4 <= saveMobile.top || saveMobile.bottom + 4 <= sourcesMobile.top;
  expect(separatedHorizontally || separatedVertically).toBe(true);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("complete-profile-header-390.png"),
    fullPage: false,
  });
});
