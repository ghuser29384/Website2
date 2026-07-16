import { expect, test } from "@playwright/test";

test.describe("Homepage worked examples", () => {
  test("lists the examples without an intro block", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    const section = page.getByRole("region", { name: "Worked examples" });

    await expect(section).toBeVisible();
    await expect(section.locator(".mt-market-card")).toHaveCount(3);
    await expect(
      section.getByRole("heading", {
        level: 2,
        name: "Understand one complete deal in under a minute.",
      }),
    ).toHaveCount(0);
    await expect(section.getByText("Explore", { exact: true })).toHaveCount(0);
    await expect(
      section.getByText(
        "Live participant proposals remain separate from worked examples. These examples show the shape of the terms without pretending that a counterparty or liquidity exists.",
        { exact: true },
      ),
    ).toHaveCount(0);
  });
});
