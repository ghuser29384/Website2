import { expect, test } from "@playwright/test";

test("homepage opens the immersive walkthrough", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: "Try the walkthrough" })).toHaveAttribute(
    "href",
    "/walkthrough",
  );
});

test("Third Option leads to Find the Mix and a real trade draft handoff", async ({ page }) => {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "What do you want more of?" })).toBeVisible();
  await expect(page.locator(".mtw-cause-choice")).toHaveCount(14);
  await expect(page.getByRole("button", { name: "Wild animal suffering" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Factory farming" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Animal welfare" })).toHaveCount(0);

  await page.getByRole("button", { name: "AI safety" }).click();
  await expect(page.getByRole("heading", { name: "You chose ai safety." })).toBeVisible();
  await page.getByRole("button", { name: "See what you can trade" }).click();

  const makeTrade = page.getByRole("button", { name: "Make the trade" });
  await expect(makeTrade).toBeDisabled();
  await page.getByRole("button", { name: /Your move Fund \$25/ }).click();
  await page.getByRole("button", { name: /Sam's move Eat vegetarian/ }).click();
  await expect(makeTrade).toBeEnabled();
  await makeTrade.click();

  await page.getByRole("button", { name: "Continue to Find the Mix" }).click();
  await expect(page.getByRole("heading", { name: "Find the mix where both say yes." })).toBeVisible();
  await page.getByRole("button", { name: /C You give 1% to global health/ }).click();
  await expect(page.getByText("Both say yes.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Lock this deal" })).toHaveAttribute(
    "href",
    "/trades/new",
  );
  await expect(page.getByRole("button", { name: "Redirect ineffective donations." })).toBeVisible();
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
  await expect(page.getByText("Democrats")).toBeVisible();
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
});

test("walkthrough is keyboard-operable and has no mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  const firstTab = page.getByRole("tab", { name: /Third option/i });
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /The crowd/i })).toBeFocused();
  await expect(page.getByRole("tab", { name: /The crowd/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByText(/no payment or commitment is created here/i)).toBeVisible();
});
