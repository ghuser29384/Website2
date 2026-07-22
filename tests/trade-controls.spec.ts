import { expect, test } from "@playwright/test";

test("trade controls previews integrity and a complete multi-party circle", async ({ page }) => {
  await page.goto("/trade-controls", { waitUntil: "domcontentloaded" });

  const controlsNavigation = page.getByRole("navigation", { name: "Trade controls" });
  await expect(controlsNavigation.getByRole("button")).toHaveCount(10);
  await expect(
    page.getByRole("heading", { name: "Did the trade cause the action?" }),
  ).toBeVisible();

  for (const label of [
    /The plan came first/,
    /There is another reason to act/,
    /The plan can be checked/,
    /The action did not get worse/,
  ]) {
    await page.getByRole("checkbox", { name: label }).check();
  }

  await expect(page.getByRole("heading", { name: "Ready for a person to review." })).toBeVisible();

  await controlsNavigation.getByRole("button", { name: /Group trades/ }).click();
  await expect(page.getByRole("heading", { name: "Trades with three or more people" })).toBeVisible();
  await expect(page.getByText("1 of 3 confirmed")).toBeVisible();

  const remainingConfirmations = page.getByRole("button", { name: "Confirm terms" });
  await expect(remainingConfirmations).toHaveCount(2);
  await remainingConfirmations.first().click();
  await remainingConfirmations.first().click();

  await expect(page.getByText("3 of 3 confirmed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmed" })).toHaveCount(3);
  await page.getByRole("button", { name: "Run preview" }).click();
  await expect(page.getByText("The group trade can go ahead.")).toBeVisible();

  await expect(page.getByRole("link", { name: /Start from Create/ })).toHaveAttribute(
    "href",
    "/create",
  );
});
