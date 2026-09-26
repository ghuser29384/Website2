import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL) throw new Error("The Start page tests need the configured app origin.");
  await context.addCookies([{ name: "mt_analytics_opt_out", value: "1", url: baseURL, sameSite: "Lax" }]);
});

for (const width of [1440, 390, 320]) {
  test(`the short walkthrough works end to end at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    const response = await page.goto("/start");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Get started | Moral Trade");
    const intro = page.getByTestId("quick-walkthrough");
    const heading = intro.getByRole("heading", { level: 1 });
    const checkWidth = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const capture = async (state: string) => {
      await page.evaluate(() => document.fonts.ready);
      await checkWidth();
      await page.screenshot({ path: testInfo.outputPath(`start-${state}-${width}.png`), fullPage: true });
    };
    await expect(heading).toHaveText("Different priorities. A better trade.");
    await expect(intro).toContainText("Illustrative example. No payment or commitment is created.");
    await expect(intro.getByRole("region", { name: "Example exchange" }).locator("article")).toHaveCount(2);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    await capture("exchange");
    await intro.getByRole("button", { name: "Without a trade", exact: true }).click();
    await expect(intro).toContainText("No additional donation");
    await expect(intro).toContainText("No additional dietary change");
    await expect(intro.getByRole("status")).toContainText("Neither additional contribution happens.");
    await intro.getByRole("button", { name: "With a trade", exact: true }).click();
    await expect(intro).toContainText("Donate $20 to poverty relief");
    await expect(intro).toContainText("Eat vegetarian for 30 days");
    await intro.getByRole("button", { name: "Try different terms" }).focus();
    await page.keyboard.press("Enter");
    await expect(heading).toHaveText("Find terms that work for both.");
    await expect(heading).toBeFocused();
    await expect(intro.getByRole("status")).toContainText("Select a proposal");
    const a = intro.getByRole("button", { name: /^Proposal A/ });
    await a.click();
    await expect(a).toHaveAttribute("aria-pressed", "true");
    await expect(intro.getByRole("status")).toContainText("Rae would decline");
    await intro.getByRole("button", { name: /^Proposal B/ }).click();
    await expect(a).toHaveAttribute("aria-pressed", "false");
    await expect(intro.getByRole("status")).toContainText("You would decline");
    const c = intro.getByRole("button", { name: /^Proposal C/ });
    await c.focus();
    await page.keyboard.press("Space");
    await expect(c).toHaveAttribute("aria-pressed", "true");
    await expect(intro.getByRole("status")).toContainText("A trade both would choose.");
    await capture("terms");
    await intro.getByRole("button", { name: "See your next steps" }).click();
    await expect(heading).toHaveText("Start with your own trade.");
    const create = intro.getByRole("link", { name: "Create a trade", exact: true });
    await expect(create).toHaveAttribute("href", "/signup?returnTo=/create");
    const browse = intro.getByRole("link", { name: "Browse trades", exact: true });
    await expect(browse).toHaveAttribute("href", "/discover");
    await expect(intro.getByRole("link", { name: "Explore the full walkthrough" })).toHaveAttribute("href", "/walkthrough");
    await expect(intro).toContainText("The example is not copied into your proposal");
    await capture("next");
    const other = intro.locator("details");
    await other.locator("summary").click();
    await expect(other.getByRole("link", { name: "Make a donation" })).toHaveAttribute("href", "/donate");
    await expect(other.getByRole("link", { name: "Explore funding pools" })).toHaveAttribute("href", "/pools");
    await other.locator("summary").click();
    const safeguards = page.locator("main > details");
    await safeguards.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(safeguards.getByRole("link", { name: "Review service boundaries" })).toBeVisible();
    await expect(safeguards).toContainText("does not hold funds");
    await page.keyboard.press("Enter");
    await expect(safeguards.getByRole("link", { name: "Review service boundaries" })).toBeHidden();
    await intro.getByRole("button", { name: "Replay the example" }).click();
    await expect(heading).toHaveText("Different priorities. A better trade.");
    await intro.getByRole("button", { name: "Try different terms" }).click();
    await expect(intro.getByRole("status")).toContainText("Select a proposal");
    await intro.getByRole("button", { name: "Skip the example" }).click();
    await browse.click();
    // The directory may append its canonical view parameters after navigation.
    await expect(page).toHaveURL(url => url.pathname === "/discover");
    await expect(page.getByRole("heading", { level: 1, name: "Browse trades" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the example can be skipped without choosing terms and does not save trial choices", async ({ page, context }) => {
  await page.goto("/start");
  const startingCookies = await context.cookies();
  const writes: string[] = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.method() !== "HEAD") writes.push(request.url());
  });
  const intro = page.getByTestId("quick-walkthrough");
  await intro.getByRole("button", { name: "Skip the example" }).click();
  await expect(intro.getByRole("link", { name: "Create a trade" })).toBeVisible();
  await intro.getByRole("button", { name: "Replay the example" }).click();
  await intro.getByRole("button", { name: "Try different terms" }).click();
  await intro.getByRole("button", { name: /^Proposal C/ }).click();
  await page.reload();
  await expect(intro).toHaveAttribute("data-step", "0");
  await intro.getByRole("button", { name: "Try different terms" }).click();
  await expect(intro.getByRole("status")).toContainText("Select a proposal");
  expect(writes).toEqual([]);
  expect((await context.cookies()).map(x => [x.name, x.value]).sort()).toEqual(startingCookies.map(x => [x.name, x.value]).sort());
});

test("read-only content and direct entry links work without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/start");
    await expect(page.getByRole("heading", { level: 1, name: "Different priorities. A better trade." })).toBeVisible();
    const fallback = page.getByRole("region", { name: "Continue without the interactive example" });
    await expect(fallback).toBeVisible();
    await expect(page.getByTestId("quick-walkthrough").getByRole("button")).toHaveCount(0);
    await page.getByText("Before you commit", { exact: true }).click();
    await expect(page.getByRole("link", { name: "Review service boundaries" })).toBeVisible();
    await fallback.getByRole("link", { name: "Create a trade", exact: true }).click();
    await expect(page).toHaveURL(/\/signup\?returnTo=\/create$/);
  } finally { await context.close(); }
});
