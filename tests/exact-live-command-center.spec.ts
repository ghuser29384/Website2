import { expect, test } from "@playwright/test";

const command = "$5 donation to animal welfare if you eat 1 vegetarian meal";
const pendingKey = "moral-trade.command.pending.v1";

test.describe("universal live Command", () => {
  test("sends any drawer request into the shared persistent workspace", async ({ page }) => {
    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Command$/ }).click();
    const input = page.getByLabel("Ask Moral Trade Command");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("");
    await expect(input).toHaveAttribute(
      "placeholder",
      "Ask Command to do anything in Moral Trade…",
    );
    await input.fill(command);

    await page.getByRole("button", { name: "Send request to the Command workspace" }).click();

    await expect(page).toHaveURL(/\/command\?source=drawer$/);
    await expect(page.getByRole("heading", { name: "Sign in to use Command." })).toBeVisible();
    await expect(page.getByText("Draft created with editable exact terms.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup?returnTo=%2Fcommand",
    );

    const pending = await page.evaluate((key) => window.sessionStorage.getItem(key), pendingKey);
    expect(pending).toBe(command);
  });

  test("the dedicated workspace explains its authorization boundary when signed out", async ({ page }) => {
    await page.goto("/command", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sign in to use Command." })).toBeVisible();
    await expect(page.getByText(/cannot bypass consent, review, payment, or safety controls/i)).toBeVisible();
  });
});
