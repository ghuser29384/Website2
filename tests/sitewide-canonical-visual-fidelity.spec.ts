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

test("Start service snapshot renders as distinct non-overlapping rows", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/start", { timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: "Choose a real first action." })).toBeVisible();

  // The resolved Suspense segment can briefly coexist in hidden transport DOM with the visible
  // fallback. Target the accessible card so hidden streaming internals do not create a false
  // strict-mode failure, while two genuinely visible cards still fail this assertion.
  const card = page.getByRole("complementary", { name: "Current service state" });
  const stats = card.locator(".growth-progress-stat");
  const followup = card.locator(".hero-followup");
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(stats).toHaveCount(3);
  await expect(followup).toBeVisible();

  // React can replace the visible fallback with the resolved segment between separate
  // boundingBox calls. Capture the card and all descendant geometry synchronously in one browser
  // task so the assertions describe one user-visible DOM state.
  const layout = await card.evaluate((element) => {
    const toRect = (target: Element) => {
      const box = target.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };
    const renderedStats = Array.from(element.querySelectorAll(".growth-progress-stat"));
    const renderedFollowup = element.querySelector(".hero-followup");

    if (renderedStats.length !== 3 || !renderedFollowup) {
      return null;
    }

    return {
      card: toRect(element),
      stats: renderedStats.map((stat) => toRect(stat)),
      followup: toRect(renderedFollowup),
    };
  });
  expect(layout).not.toBeNull();

  const cardRect = layout!.card;
  const statRects = layout!.stats;
  const followupRect = layout!.followup;

  for (const item of statRects) {
    expect(item.left).toBeGreaterThanOrEqual(cardRect.left - 1);
    expect(item.right).toBeLessThanOrEqual(cardRect.right + 1);
    expect(item.height).toBeGreaterThan(44);
  }
  expect(statRects[0].bottom).toBeLessThanOrEqual(statRects[1].top + 1);
  expect(statRects[1].bottom).toBeLessThanOrEqual(statRects[2].top + 1);
  expect(statRects[2].bottom).toBeLessThanOrEqual(followupRect.top + 1);

  for (const label of ["Financial contribution", "Open proposals", "Public profiles"]) {
    await expect(card.getByText(label, { exact: true })).toBeVisible();
  }

  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("start-service-snapshot-1440.png"),
    fullPage: false,
  });
});

test("Complete Profile remains private behind the canonical Walkthrough on desktop and mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let response = await page.goto("/complete-profile", {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByRole("heading", { level: 1, name: "What do you value?" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Save profile" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("complete-profile-gate-1440.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  response = await page.goto("/complete-profile?next=/feed", {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByRole("heading", { level: 1, name: "What do you value?" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("complete-profile-gate-390.png"),
    fullPage: false,
  });
});
