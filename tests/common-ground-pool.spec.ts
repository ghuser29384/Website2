import { expect, test } from "@playwright/test";

test.describe("Common Ground Pool", () => {
  test("reproduces the worked example and fails closed when combined value is insufficient", async ({ page }) => {
    await page.goto("/mpgf/common-ground-pool");

    await expect(page.getByRole("heading", { level: 1, name: "Common Ground Pool" })).toBeVisible();
    await expect(page.getByText("Positive-sum draft", { exact: true })).toBeVisible();
    await expect(page.getByText("120%", { exact: true })).toBeVisible();
    await expect(page.getByText("+20% of target", { exact: true })).toBeVisible();

    const result = page.getByRole("complementary", { name: "Common Ground Pool result" });
    const animalResult = result.locator("article").filter({ hasText: "Animal-welfare funder" });
    const futureResult = result.locator("article").filter({ hasText: "Long-term-future funder" });

    await expect(animalResult.getByText("$5,000", { exact: true })).toHaveCount(2);
    await expect(animalResult.getByText("$6,000", { exact: true })).toBeVisible();
    await expect(animalResult.getByText("$11,000", { exact: true })).toBeVisible();
    await expect(animalResult.getByText("+$1,000", { exact: true })).toBeVisible();
    await expect(futureResult.getByText("+$1,000", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy proposal terms" })).toBeEnabled();

    const privateValueInputs = page.getByLabel("Private value of $1 to the shared project");
    await privateValueInputs.first().fill("40");

    await expect(page.getByText("Needs changes", { exact: true })).toBeVisible();
    await expect(page.getByText(
      "The participants' combined private value for the shared project must exceed 100% of its cost.",
      { exact: true },
    )).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy proposal terms" })).toBeDisabled();

    await privateValueInputs.first().fill("65");
    await expect(page.getByText("Positive-sum draft", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy proposal terms" })).toBeEnabled();
  });

  test("supports participant editing and a narrow mobile viewport without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/mpgf/common-ground-pool");

    await page.getByRole("button", { name: "Add participant" }).click();
    await expect(page.getByRole("group", { name: "Participant 3" })).toBeVisible();

    await page.getByRole("button", { name: "Manual split" }).click();
    await expect(page.getByText(
      "Enter an exact contribution for each participant. The checker rejects splits that miss the target, exceed a budget, or leave anyone no better off.",
      { exact: true },
    )).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
