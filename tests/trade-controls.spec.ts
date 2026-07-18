import { expect, test } from "@playwright/test";

test("trade controls previews integrity and a complete multi-party circle", async ({ page }) => {
  await page.goto("/trade-controls", { waitUntil: "domcontentloaded" });

  const controlsNavigation = page.getByRole("navigation", { name: "Trade controls" });
  await expect(controlsNavigation.getByRole("button")).toHaveCount(10);
  await expect(
    page.getByRole("heading", { name: "Counterfactual Integrity Check" }),
  ).toBeVisible();

  for (const label of [
    /The intention predates the offer/,
    /There is an independent reason/,
    /Supporting evidence can be reviewed/,
    /The baseline was not escalated/,
  ]) {
    await page.getByRole("checkbox", { name: label }).check();
  }

  await expect(page.getByRole("heading", { name: "Ready for human review." })).toBeVisible();

  await controlsNavigation.getByRole("button", { name: /Trade circles/ }).click();
  await expect(page.getByRole("heading", { name: "Multi-party Trade Circles" })).toBeVisible();
  await expect(page.getByText("1 of 3 confirmed")).toBeVisible();

  const remainingConfirmations = page.getByRole("button", { name: "Confirm terms" });
  await expect(remainingConfirmations).toHaveCount(2);
  await remainingConfirmations.first().click();
  await remainingConfirmations.first().click();

  await expect(page.getByText("3 of 3 confirmed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmed" })).toHaveCount(3);
  await page.getByRole("button", { name: "Run preview" }).click();
  await expect(page.getByText("A complete circle is available.")).toBeVisible();

  await expect(page.getByRole("link", { name: /Start from Create/ })).toHaveAttribute(
    "href",
    "/create",
  );
});
