import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectFullyInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function expectFullyInside(locator: Locator, container: Locator) {
  const box = await locator.boundingBox();
  const containerBox = await container.boundingBox();

  expect(box).not.toBeNull();
  expect(containerBox).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(containerBox!.x);
  expect(box!.y).toBeGreaterThanOrEqual(containerBox!.y);
  expect(box!.x + box!.width).toBeLessThanOrEqual(containerBox!.x + containerBox!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(containerBox!.y + containerBox!.height);
}

test("a first homepage visit opens the walkthrough once", async ({ context, page }) => {
  await context.clearCookies();
  await page.goto("/?utm_source=invite", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/walkthrough\?utm_source=invite$/);
  await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "mt_walkthrough_seen")).toMatchObject({
    httpOnly: true,
    value: "1",
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("link", { name: "Try the walkthrough" })).toHaveAttribute(
    "href",
    "/walkthrough",
  );
});

test("Third Option leads to Find the Mix and a real trade draft handoff", async ({ page }) => {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
  await expect(
    page.getByText("Start with your values. Nobody will ask you to rank everyone else's."),
  ).toHaveCount(0);
  await expect(page.locator(".cause-choice")).toHaveCount(14);
  await expect(page.getByRole("button", { name: "Wild animal suffering" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Factory farming" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Animal welfare" })).toHaveCount(0);

  await page.getByRole("button", { name: "AI safety" }).click();
  await expect(page.getByRole("heading", { name: "You chose ai safety." })).toBeVisible();
  await page.getByRole("button", { name: "See what you can trade" }).click();

  const makeTrade = page.getByRole("button", { name: "Make the trade" });
  await expect(makeTrade).toBeDisabled();
  await page.getByRole("button", { name: /Your move Eat vegetarian/ }).click();
  await page.getByRole("button", { name: /Sam's move Fund \$25/ }).click();
  await expect(makeTrade).toBeEnabled();
  await makeTrade.click();

  await page.getByRole("button", { name: "Continue to Find the Mix" }).click();
  await expect(page.getByText("Find the mix where both say yes.")).toHaveCount(0);
  await page.getByRole("button", { name: /C You give 1% to global health/ }).click();
  await expect(page.getByText("Both say yes.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Lock this deal" })).toHaveAttribute(
    "href",
    "https://moraltrade.org/create",
  );
  await expect(page.getByRole("button", { name: "Redirect ineffective donations." })).toBeVisible();
});

test("Make the trade stays fully visible on a wide, short screen", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 895 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "AI safety" }).click();
  await page.getByRole("button", { name: "See what you can trade" }).click();
  await page.getByRole("button", { name: /Your move Eat vegetarian/ }).click();
  await page.getByRole("button", { name: /Sam's move Fund \$25/ }).click();

  const makeTrade = page.getByRole("button", { name: "Make the trade" });
  await expect(makeTrade).toBeEnabled();
  await expectFullyInViewport(page, makeTrade);
  await expectFullyInside(makeTrade, page.locator(".experience"));
});

test("Crowd and Redirect preserve the requested copy and routing", async ({ page }) => {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  await page.getByRole("tab", { name: /The crowd/i }).click();
  await expect(page.getByText("You donate if and only if 200 other people donate enough.")).toBeVisible();
  await expect(
    page.getByText("If the threshold isn't reached, no one's donation gets donated."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your donation might be decisive for everyone's donation being donated.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer trade" })).toBeVisible();
  await page.getByRole("button", { name: "$10" }).click();
  await expect(page.getByRole("button", { name: "Offer trade" })).toHaveCount(0);

  await page.getByRole("tab", { name: /Redirect/i }).click();
  const democratsMarker = page.locator(".stream-a .stream-label");
  await expect(democratsMarker).toContainText("$100Democrats");
  await expect(democratsMarker).toBeVisible();
  await expectFullyInViewport(page, democratsMarker);
  expect(
    await democratsMarker.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const topElement = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
      return topElement === element || element.contains(topElement);
    }),
  ).toBe(true);
  await expect(page.getByText("Republicans")).toBeVisible();
  await page.getByRole("button", { name: "Pause the tug-of-war" }).click();
  await page.getByRole("button", { name: /Malaria prevention/ }).click();
  await page.getByRole("button", { name: "See the result" }).click();
  await expect(page.getByRole("link", { name: /Offer Create a moral trade/ })).toBeVisible();

  const leverage = page.getByRole("button", {
    name: /Leverage \$1 Others may donate if and only if you donate\./,
  });
  await expect(leverage).toBeVisible();
  await leverage.click();
  await expect(page.getByRole("tab", { name: /The crowd/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: /Your match/i }).click();
  await expect(
    page.getByRole("heading", { name: "Offer value to gain more value." }),
  ).toBeVisible();
  await expect(page.getByText("What could you happily put on the table?")).toHaveCount(0);
});

test("walkthrough preserves its guided keyboard flow and has no mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  await page.getByRole("tab", { name: /Redirect/i }).click();
  const mobileDemocratsMarker = page.locator(".stream-a .stream-label");
  await expect(mobileDemocratsMarker).toBeVisible();
  await expectFullyInViewport(page, mobileDemocratsMarker);

  await page.getByRole("tab", { name: /Third option/i }).click();
  const firstTab = page.getByRole("tab", { name: /Third option/i });
  await firstTab.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(page.getByRole("tab", { name: /Find the mix/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Find the mix where both say yes.")).toHaveCount(0);

  await page.getByRole("button", { name: /C You give 1% to global health/ }).click();
  const lockDeal = page.getByRole("link", { name: "Lock this deal" });
  const redirectDonations = page.getByRole("button", {
    name: "Redirect ineffective donations.",
  });
  await expect(lockDeal).toBeVisible();
  await expect(redirectDonations).toBeVisible();
  await expectFullyInViewport(page, lockDeal);
  await expectFullyInViewport(page, redirectDonations);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
