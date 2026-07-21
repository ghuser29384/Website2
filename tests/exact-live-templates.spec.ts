import { expect, test } from "@playwright/test";

test.describe("live Trade template system", () => {
  test("opens from the Trade control and uses a template in one click", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".compose-grid")).toBeVisible();

    await page.getByRole("button", { name: "Open trade template library" }).click();
    await expect(page).toHaveURL(/\/offers\?view=templates$/);
    await expect(page.getByRole("heading", { name: "Choose a template." })).toBeVisible();
    await expect(page.locator(".mt-template-card")).toHaveCount(5);

    await page.getByRole("button", { name: "Money", exact: true }).click();
    await expect(page.locator(".mt-template-card")).toHaveCount(2);
    await page.getByPlaceholder("Search by outcome, action, or mechanism…").fill("donation");
    await expect(page.locator(".mt-template-card")).toHaveCount(1);

    const offsetTemplate = page.getByRole("link", { name: "Use Direct donation offset template" });
    await expect(offsetTemplate).toHaveAttribute(
      "href",
      "/offers/new?entry=draft&template=pure-opposed-cause&mode=offset",
    );
    await offsetTemplate.click();
    await expect(page).toHaveURL(
      /\/offers\/new\?entry=draft&template=pure-opposed-cause&mode=offset$/,
    );
    await expect(page.getByRole("heading", { name: "Sign in to build a trade." })).toBeVisible();
    await expect(page.getByText("Understand before you insert.")).toHaveCount(0);
  });

  test("completes all three guided questions and hands pledge templates to the safe editor", async ({ page }) => {
    await page.goto("/offers?view=templates");
    await page.getByRole("button", { name: "Help me choose" }).click();

    await expect(page.getByText("Question 1 of 3", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /An action/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Question 2 of 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Two sides/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Question 3 of 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Direct evidence/ }).click();
    await expect(page.getByText("3 of 3", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "One-meal pledge swap" })).toBeVisible();

    const handoff = page.getByRole("link", {
      name: "Use One-meal pledge swap template",
    });
    await expect(handoff).toHaveAttribute("href", "/trades/new?template=reciprocal-mixed");
    await handoff.click();

    await expect(page).toHaveURL(/\/trades\/new\?template=reciprocal-mixed$/);
    await expect(page.getByRole("heading", { name: "Sign in to build a trade." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup?returnTo=%2Ftrades%2Fnew%3Ftemplate%3Dreciprocal-mixed",
    );
  });

  test("keeps the library and guide usable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/offers?view=templates");
    await expect(page.getByRole("heading", { name: "Choose a template." })).toBeVisible();

    const libraryOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(libraryOverflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Help me choose" }).click();
    await expect(page.getByText("Question 1 of 3", { exact: true })).toBeVisible();
    const guideOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(guideOverflow).toBeLessThanOrEqual(1);
  });
});
