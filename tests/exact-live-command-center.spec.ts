import { expect, test } from "@playwright/test";

const command = "$5 donation to animal welfare if you eat 1 vegetarian meal";
const handoffKey = "moral-trade.command-center.handoff.v1";

test.describe("live Command Center", () => {
  test("hands the command to the real private draft editor without a false success", async ({
    page,
  }) => {
    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Command$/ }).click();
    const input = page.getByLabel("Describe the proposed exchange");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("");
    await input.fill(command);

    await page.getByRole("button", { name: "Build this offer" }).click();

    await expect(page).toHaveURL(/\/trades\/new\?handoff=command-center$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to build a trade." }),
    ).toBeVisible();
    await expect(page.getByText("Draft created with editable exact terms.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup?returnTo=%2Ftrades%2Fnew%3Fhandoff%3Dcommand-center",
    );

    const handoff = await page.evaluate((key) => {
      const raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, handoffKey);

    expect(handoff).toMatchObject({
      version: 1,
      source: "command-center",
      values: {
        offeredCause: "Animal welfare",
        requestedCause: "Animal welfare",
        proposedAction: "Donate $5 to an agreed animal welfare organization.",
        requestedAction: "Eat 1 vegetarian meal.",
        duration: "One meal",
        evidenceRule: "",
      },
    });
    expect(handoff).not.toHaveProperty("command");
    expect(handoff).not.toHaveProperty("rawCommand");
  });
});
