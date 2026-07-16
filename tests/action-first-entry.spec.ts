import { expect, test } from "@playwright/test";

test.describe("action-first public entry points", () => {
  test("redirects the retired pilot page to the action surface", async ({ page }) => {
    await page.goto("/pilot");

    await expect(page).toHaveURL(/\/start\/?$/);
    await expect(page.getByRole("heading", { name: "Create an agreement or act on one." })).toBeVisible();
    await expect(page.getByText(/founding-user pilot/i)).toHaveCount(0);
    await expect(page.getByText(/guided first-user journey/i)).toHaveCount(0);
  });

  test("offers direct actions without visitor-routing or example-first copy", async ({ page }) => {
    await page.goto("/start");

    await expect(page.getByRole("link", { name: "Create an agreement" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse active offers" }).first()).toBeVisible();
    await expect(page.locator(".growth-path-card")).toHaveCount(4);
    await expect(page.getByText(/visitor router/i)).toHaveCount(0);
    await expect(page.getByText(/inspect a worked example/i)).toHaveCount(0);
    await expect(page.getByText(/what this page prevents/i)).toHaveCount(0);
    await expect(page.getByText(/acquisition metric/i)).toHaveCount(0);
    await expect(page.getByText(/serious first user/i)).toHaveCount(0);
  });

  test("keeps homepage actions and removes walkthrough meta sections", async ({ page }) => {
    await page.goto("/");

    const main = page.locator("main");
    await expect(page.getByRole("link", { name: "Create an agreement" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse active offers" }).first()).toBeVisible();
    await expect(main.getByText("Agree on the deal, not the values.", { exact: true })).toHaveCount(0);
    await expect(main.getByText(/research supplies the theory/i)).toHaveCount(0);
    await expect(main.getByText("Worked example", { exact: true })).toHaveCount(0);
    await expect(main.getByText(/compliance appendix hidden after the conversion/i)).toHaveCount(0);
  });
});
