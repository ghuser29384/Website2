import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectFullyInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
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

async function waitForWalkthrough(page: Page) {
  await expect(page.locator('[data-walkthrough-ready="true"]')).toBeVisible({
    timeout: 15_000,
  });
}

test("signed-out root opens Discover and Walkthrough has no cookie routing authority", async ({ context, page }) => {
  await context.clearCookies();
  await page.goto("/?utm_source=invite", { waitUntil: "domcontentloaded" });

  await expect.poll(() => new URL(page.url()).pathname).toBe("/discover");
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);
  await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip walkthrough" })).toHaveCount(0);

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "mt_walkthrough_seen")).toBeUndefined();
});

test("Third Option leads to Find the Mix and a real trade draft handoff", async ({ page }) => {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);

  await expect(page.getByRole("button", { name: "Skip walkthrough" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
  await expect(
    page.getByText("Start with your values. Nobody will ask you to rank everyone else's."),
  ).toHaveCount(0);
  await expect(page.locator(".mtw-cause-choice")).toHaveCount(14);
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
    "/trades/new",
  );
  await expect(page.getByRole("button", { name: "Redirect ineffective donations." })).toBeVisible();
});

test("Make the trade stays fully visible on a wide, short screen", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 895 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);

  await page.getByRole("button", { name: "AI safety" }).click();
  await page.getByRole("button", { name: "See what you can trade" }).click();
  await page.getByRole("button", { name: /Your move Eat vegetarian/ }).click();
  await page.getByRole("button", { name: /Sam's move Fund \$25/ }).click();

  const makeTrade = page.getByRole("button", { name: "Make the trade" });
  await expect(makeTrade).toBeEnabled();
  await expectFullyInViewport(page, makeTrade);
  await expectFullyInside(makeTrade, page.locator(".mtw-experience"));
});

test("Crowd and Redirect preserve the requested copy, coalition trade, and routing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);

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
  const democratMarker = page.locator(".mtw-stream-a .mtw-stream-label");
  await expect(democratMarker).toContainText("$10Democrat · environment");
  await expect(democratMarker).toBeVisible();
  await expectFullyInViewport(page, democratMarker);
  await expect(page.getByText("Republican · environment")).toBeVisible();

  await page.getByRole("button", { name: "Redirect the matched $20" }).click();
  await expect(page.getByText("$20to environmental protection")).toBeVisible();
  await page.getByRole("button", { name: "See how one $10 can go further" }).click();

  await expect(page.getByText("100 × 2.1 days")).toBeVisible();
  await expect(page.getByText("210 person-days · 30 person-weeks")).toBeVisible();
  await expect(page.getByText("1 × 10 weeks")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The $10 redirect is already scheduled." }),
  ).toBeVisible();
  await expect(page.getByText(/Moral Trade notifies users now/)).toBeVisible();
  await expect(
    page.getByText(/Without an accepted and completed trade, the donation proceeds automatically/),
  ).toBeVisible();
  const coalitionStart = page.getByRole("button", {
    name: "See a notified user start a coalition",
  });
  await expect(coalitionStart).toBeVisible();
  await page.waitForTimeout(700);
  await expectFullyInViewport(page, coalitionStart);
  await expectFullyInside(coalitionStart, page.locator(".mtw-experience"));
  await coalitionStart.click();

  await expect(
    page.getByRole("heading", { name: "A notified user finds 99 close matches." }),
  ).toBeVisible();
  await expect(page.getByText("Future flourishing")).toBeVisible();
  await expect(page.getByText("60 / 100")).toBeVisible();
  await expect(page.getByText("Existential risk")).toBeVisible();
  await expect(page.getByText("25 / 100")).toBeVisible();
  await page.getByRole("button", { name: "Form the 100-person coalition" }).click();

  await expect(page.getByRole("heading", { name: "The coalition becomes one offer." })).toBeVisible();
  await expect(page.getByText("$10 coalition payment")).toBeVisible();
  await expect(page.getByText("210 person-days without buying single-use plastic bags")).toBeVisible();
  await page.getByRole("button", { name: "Accept the group trade" }).click();

  await expect(page.getByText("100 / 100")).toBeVisible();
  await page.getByRole("button", { name: /Pre-agree the destination/ }).click();
  await page.getByRole("button", { name: "Release $10 to the pre-agreed destination" }).click();
  await expect(
    page.getByRole("heading", { name: "One $10 bought 30 person-weeks of environmental action." }),
  ).toBeVisible();
  await expect(page.getByText(/pre-agreed future-focused destination/)).toBeVisible();
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

test("The Crowd can close a verified salary gap for a higher-impact job", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 895 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);

  await page.getByRole("tab", { name: /The crowd/i }).click();
  await page.getByRole("button", { name: "$10" }).click();
  await page.getByRole("button", { name: "Pledge conditionally" }).click();

  const showCareerGap = page.getByRole("button", {
    name: "See what the crowd can unlock",
  });
  await expect(showCareerGap).toBeVisible({ timeout: 5_000 });
  await showCareerGap.click();

  await expect(page.getByRole("heading", { name: "Maya has two verified offers." })).toBeVisible();
  await expect(page.getByText("Higher-paying job")).toBeVisible();
  await expect(page.getByText("$115,000")).toBeVisible();
  await expect(page.getByText("$30,000")).toBeVisible();

  const impactJob = page.getByRole("button", {
    name: /Higher-impact job.*\$85,000.*Pandemic-prevention lab/i,
  });
  await expect(impactJob).toBeVisible();
  await impactJob.click();

  await expect(page.getByRole("heading", { name: "The crowd is only $10 away." })).toBeVisible();
  await expect(
    page.getByText(
      "In this salary-gap pool, your $10 pledge activates only if the full $30,000 gap is funded and Maya takes the higher-impact job. Otherwise nobody is charged.",
    ),
  ).toBeVisible();
  await expect(page.getByText("$29,990")).toBeVisible();

  const closeGap = page.getByRole("button", { name: "Close the gap with $10" });
  await expect(closeGap).toBeVisible();
  await expectFullyInViewport(page, closeGap);
  await expectFullyInside(closeGap, page.locator(".mtw-experience"));
  await closeGap.click();

  await expect(page.getByRole("heading", { name: "Your $10 closes the last $10." })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Maya can take the higher-impact job." }),
  ).toBeVisible({ timeout: 4_000 });
  await expect(page.getByRole("link", { name: /Start a career backing request/ })).toHaveAttribute(
    "href",
    "/create?source=walkthrough&mode=back",
  );
  await expect(page.getByRole("link", { name: /Explore conditional pools/ })).toHaveAttribute(
    "href",
    "/discover?source=walkthrough&domain=pools&view=threshold",
  );
});

test("walkthrough preserves its guided keyboard flow and has no mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);

  await page.getByRole("tab", { name: /Redirect/i }).click();
  const mobileRedirectMarker = page.locator(".mtw-stream-a .mtw-stream-label");
  await expect(mobileRedirectMarker).toBeVisible();
  await expect(mobileRedirectMarker).toContainText("$10");
  await expectFullyInViewport(page, mobileRedirectMarker);

  await page.getByRole("tab", { name: /The crowd/i }).click();
  await page.getByRole("button", { name: "$5" }).click();
  await page.getByRole("button", { name: "Pledge conditionally" }).click();
  await page.getByRole("button", { name: "See what the crowd can unlock" }).click({ timeout: 5_000 });
  await page.getByRole("button", { name: /Higher-impact job/ }).click();
  const mobileCloseGap = page.getByRole("button", { name: "Close the gap with $5" });
  await expect(mobileCloseGap).toBeVisible();
  await expectFullyInside(mobileCloseGap, page.locator(".mtw-experience"));
  await mobileCloseGap.scrollIntoViewIfNeeded();
  await expectFullyInViewport(page, mobileCloseGap);
  await mobileCloseGap.click();
  await expect(
    page.getByRole("heading", { name: "Maya can take the higher-impact job." }),
  ).toBeVisible({ timeout: 4_000 });

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

  const layout = await page.evaluate(() => ({
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          bounds: { left: bounds.left, right: bounds.right, width: bounds.width },
          selector: `${element.tagName.toLowerCase()}.${element.className}`,
        };
      })
      .filter(({ bounds }) => bounds.left < -1 || bounds.right > window.innerWidth + 1)
      .slice(0, 10),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(layout.overflow, JSON.stringify(layout.offenders)).toBeLessThanOrEqual(1);
});

test("salary-gap actions fit the mid-size walkthrough layout", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await waitForWalkthrough(page);

  await page.getByRole("tab", { name: /The crowd/i }).click();
  await page.getByRole("button", { name: "$25" }).click();
  await page.getByRole("button", { name: "Pledge conditionally" }).click();
  await page.getByRole("button", { name: "See what the crowd can unlock" }).click({
    timeout: 5_000,
  });
  await page.getByRole("button", { name: /Higher-impact job/ }).click();

  const closeGap = page.getByRole("button", { name: "Close the gap with $25" });
  await expect(closeGap).toBeVisible();
  await closeGap.scrollIntoViewIfNeeded();
  await expectFullyInViewport(page, closeGap);
  await expectFullyInside(closeGap, page.locator(".mtw-experience"));
});
