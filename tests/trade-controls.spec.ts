import { expect, test } from "@playwright/test";

test("the retired Control route maps users to live safeguard workflows", async ({ page }) => {
  await page.goto("/trade-controls", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      name: "Safeguards now live with the records they govern.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/former Control simulator has been retired/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where each safeguard belongs" })).toBeVisible();

  for (const [name, href] of [
    ["Open Create", "/trades/new"],
    ["Open commitments", "/commitments"],
    ["Review validation rules", "/validation"],
    ["Open pool governance", "/mpgf/governance"],
    ["Open threshold radar", "/pools/radar"],
    ["Edit private profile", "/complete-profile"],
    ["Open safety rules", "/safety"],
    ["Review authority boundary", "/team-and-governance#organizational-authority"],
  ] as const) {
    await expect(page.getByRole("link", { name })).toHaveAttribute("href", href);
  }

  await expect(page.getByRole("heading", { name: "Trade Circles" })).toBeVisible();
  await expect(page.getByText(/does not currently offer durable multi-party Trade Circles/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Run preview" })).toHaveCount(0);
  await expect(page.getByText("A complete circle is available.")).toHaveCount(0);
});
