import { expect, test } from "@playwright/test";

const externalBase = (process.env.MORALTRADE_BASE_URL ?? "").replace(/\/$/, "");
const route = (path: string) => `${externalBase}${path}`;

test.describe("public evidence desk", () => {
  test("serves the public directory and the clearly labeled example", async ({ page }) => {
    await page.goto(route("/evidence"));
    await expect(page.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
    await expect(page.getByTestId("evidence-product-shell")).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Evidence sections" })).toBeVisible();
    await expect(page.getByRole("link", { name: /All evidence/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: "Open illustrated viewer →" })).toBeVisible();
    await expect(page.getByText("Interface guide · no live data")).toBeVisible();
    const recordCards = page.getByTestId("evidence-record");
    const emptyState = page.getByTestId("evidence-empty-state");
    const unavailableState = page.getByTestId("evidence-unavailable-state");
    await expect
      .poll(async () =>
        (await recordCards.count()) > 0
          || (await emptyState.count()) > 0
          || (await unavailableState.count()) > 0,
      )
      .toBe(true);
    if (externalBase) {
      await expect(unavailableState).toHaveCount(0);
    }
    if (await emptyState.count()) {
      await expect(emptyState.getByRole("status")).toContainText(
        "No evidence has been submitted yet.",
      );
    }
  });

  test("switches evidence tabs and files, then explains the public copy", async ({ page }) => {
    await page.goto(route("/evidence/example"));
    const evidencePage = page.locator("[data-stage-evidence-viewer]");
    await expect(evidencePage).toBeVisible();

    const evidenceTab = evidencePage.getByRole("tab", { exact: true, name: "Evidence" });
    const termsTab = evidencePage.getByRole("tab", { exact: true, name: "Trade terms" });
    const verificationTab = evidencePage.getByRole("tab", { exact: true, name: "Verification" });

    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    await termsTab.click();
    await expect(termsTab).toHaveAttribute("aria-selected", "true");
    await expect(evidencePage.getByRole("tabpanel").getByText(/before-meal photo and itemized receipt/i)).toBeVisible();

    await verificationTab.click();
    await expect(verificationTab).toHaveAttribute("aria-selected", "true");
    await expect(evidencePage.getByRole("tabpanel").getByText("Trade record created")).toBeVisible();

    await evidenceTab.click();
    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");

    const receiptFile = evidencePage.locator('[data-stage-artifact="receipt"]');
    await receiptFile.click();
    await expect(receiptFile).toHaveAttribute("aria-pressed", "true");
    await expect(evidencePage.getByRole("heading", { name: "THE GREEN TABLE" })).toBeVisible();

    await evidencePage.getByRole("button", { exact: true, name: "Privacy details" }).click();
    const privacyDialog = page.locator("dialog").filter({ hasText: "Evidence-copy privacy" });
    await expect(privacyDialog).toBeVisible();
    await expect(privacyDialog.getByText("Order and payment identifiers are masked in the shared copy.")).toBeVisible();
    await privacyDialog.getByRole("button", { name: "Done" }).click();
  });

  test("keeps the directory readable on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route("/evidence"));

    await expect(page.getByTestId("evidence-product-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Published evidence" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open illustrated viewer →" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
  });

  test("keeps the evidence tabs and files usable on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route("/evidence/example"));

    const evidencePage = page.locator("[data-stage-evidence-viewer]");
    const afterFile = evidencePage.locator('[data-stage-artifact="after"]');
    await afterFile.click();
    await expect(afterFile).toHaveAttribute("aria-pressed", "true");

    const termsTab = evidencePage.getByRole("tab", { exact: true, name: "Trade terms" });
    await termsTab.click();
    await expect(termsTab).toHaveAttribute("aria-selected", "true");
    await evidencePage.getByRole("tab", { exact: true, name: "Evidence" }).click();
    await expect(evidencePage.getByRole("button", { exact: true, name: "Privacy details" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
  });
});
