import { expect, test } from "@playwright/test";

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "narrow mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`the retired Control route maps users to live safeguard workflows on ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/trade-controls", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        name: "Safeguards now live with the records they govern.",
      }),
    ).toBeVisible();
    await expect(page.getByText(/former Control simulator has been retired/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Where each safeguard belongs" })).toBeVisible();

    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.getByRole("link", { name: "Controls", exact: true })).toHaveCount(0);

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

    await expect(
      page.getByRole("heading", {
        name: "The preview was removed; no live mechanism was implied.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not currently offer durable multi-party Trade Circles/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Run preview" })).toHaveCount(0);
    await expect(page.getByText("A complete circle is available.")).toHaveCount(0);
  });
}
