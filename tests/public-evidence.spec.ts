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

  test("switches dossier tabs and artifacts, then explains the public-safe copy", async ({ page }) => {
    await page.goto(route("/evidence/example"));
    const dossier = page.locator("[data-stage-evidence-viewer]");
    await expect(dossier).toBeVisible();

    const evidenceTab = dossier.getByRole("tab", { exact: true, name: "Evidence" });
    const termsTab = dossier.getByRole("tab", { exact: true, name: "Trade terms" });
    const verificationTab = dossier.getByRole("tab", { exact: true, name: "Verification" });

    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    await termsTab.click();
    await expect(termsTab).toHaveAttribute("aria-selected", "true");
    await expect(dossier.getByRole("tabpanel").getByText(/before-meal photo and itemized receipt/i)).toBeVisible();

    await verificationTab.click();
    await expect(verificationTab).toHaveAttribute("aria-selected", "true");
    await expect(dossier.getByRole("tabpanel").getByText("Trade record created")).toBeVisible();

    await evidenceTab.click();
    await expect(evidenceTab).toHaveAttribute("aria-selected", "true");

    const receiptArtifact = dossier.locator('[data-stage-artifact="receipt"]');
    await receiptArtifact.click();
    await expect(receiptArtifact).toHaveAttribute("aria-pressed", "true");
    await expect(dossier.getByRole("heading", { name: "THE GREEN TABLE" })).toBeVisible();

    await dossier.getByRole("button", { exact: true, name: "Privacy details" }).click();
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

  test("keeps the dossier tabs and artifacts usable on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route("/evidence/example"));

    const dossier = page.locator("[data-stage-evidence-viewer]");
    const afterArtifact = dossier.locator('[data-stage-artifact="after"]');
    await afterArtifact.click();
    await expect(afterArtifact).toHaveAttribute("aria-pressed", "true");

    const termsTab = dossier.getByRole("tab", { exact: true, name: "Trade terms" });
    await termsTab.click();
    await expect(termsTab).toHaveAttribute("aria-selected", "true");
    await dossier.getByRole("tab", { exact: true, name: "Evidence" }).click();
    await expect(dossier.getByRole("button", { exact: true, name: "Privacy details" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
  });
});
