import { expect, test, type Page } from "@playwright/test";

async function completeConnectedSourceReview(page: Page) {
  await page.goto("/complete-verification.html?reset=1");

  await page.getByRole("button", { name: "Connect read-only" }).click();
  await page.locator("#confirm-read-only").check();
  await page.locator("[data-modal-confirm]").click();

  await page.getByRole("button", { name: "Run final sync" }).click();
  await expect(page.locator('[data-metric="exceptions"]')).toHaveText("4");
  await expect(page.getByRole("button", { name: "Review exceptions" })).toBeEnabled();

  await page.getByRole("button", { name: "Review exceptions" }).click();
  await page.getByRole("button", { name: "Apply recommended decisions" }).click();
  await expect(page.getByRole("button", { name: "Record reconciled result" })).toBeEnabled();
  await page.getByRole("button", { name: "Record reconciled result" }).click();

  await expect(page.locator('[data-stage="settlement"]')).toHaveClass(/is-active/);
  await expect(page.locator("[data-final-eligible]")).toHaveText("174");
}

test.describe("complete verification", () => {
  test("uses connected evidence, exception-only review, and a locked settlement gate", async ({ page }) => {
    await completeConnectedSourceReview(page);

    await page.locator("[data-settlement-note]").fill(
      "Final connected-source sync recorded 172 base eligible donors. Two exceptions were included and two excluded under the locked cutoff and duplicate rules.",
    );
    await page.getByRole("button", { name: "Record provisional result" }).click();
    await page.locator("[data-modal-confirm]").click();

    await expect(page.locator("[data-completion]")).toHaveClass(/is-visible/);
    await expect(page.locator("[data-completion-copy]")).toContainText("24-hour challenge window");
    await expect(page.locator("[data-completion-copy]")).toContainText("No funds or rights have moved");
  });

  test("supports the guided-evidence fallback when no live source exists", async ({ page }) => {
    await page.goto("/complete-verification.html?reset=1");
    await page.getByRole("button", { name: "No connected source? Use evidence upload" }).click();
    await page.getByRole("button", { name: "Use available export" }).click();
    await page.locator("[data-fallback-attestation]").check();
    await page.getByRole("button", { name: "Run guided review" }).click();

    await expect(page.locator("[data-evidence-mode]")).toHaveText("Evidence export");
    await expect(page.getByRole("button", { name: "Review exceptions" })).toBeEnabled();
  });

  test("adds optional dual attestation for consequential or disputed trades", async ({ page }) => {
    await completeConnectedSourceReview(page);

    await page.locator("[data-settlement-note]").fill(
      "The sealed source revision and exception decisions support a provisional condition-not-met result.",
    );
    await page.locator("[data-trust-option]").check();
    await page.getByRole("button", { name: "Record provisional result" }).click();

    await page.getByRole("button", { name: "Sign statement" }).click();
    await page.locator("#confirm-verifier-signature").check();
    await page.locator("[data-modal-confirm]").click();

    await page.getByRole("button", { name: "Request signature" }).click();
    await page.getByRole("button", { name: "Record signed response" }).click();
    await page.locator("#confirm-counterparty-signature").check();
    await page.locator("[data-modal-confirm]").click();

    await expect(page.locator('[data-action="open-challenge"]')).toBeEnabled();
    await page.getByRole("button", { name: "Open 72-hour challenge window" }).click();
    await page.locator("[data-modal-confirm]").click();

    await expect(page.locator("[data-completion-copy]")).toContainText("72-hour challenge window");
    await expect(page.locator("[data-completion-copy]")).toContainText("No funds or rights have moved");
  });

  test("routes a dynamically rendered verification action into the verification workflow", async ({
    page,
  }) => {
    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() =>
      Boolean(
        (window as typeof window & { __MT_COMPLETE_VERIFICATION_BRIDGE__?: boolean })
          .__MT_COMPLETE_VERIFICATION_BRIDGE__,
      ),
    );
    await page.evaluate(() => {
      const control = document.createElement("button");
      control.type = "button";
      control.textContent = "Complete verification";
      document.body.appendChild(control);
    });

    const completeVerification = page.getByRole("button", { name: "Complete verification" });
    await expect(completeVerification).toHaveAttribute(
      "data-mt-complete-verification",
      "true",
      { timeout: 20_000 },
    );
    await completeVerification.click();
    await expect(page).toHaveURL(
      /\/complete-verification\.html\?record=wild-animal-research&from=calendar$/,
    );
    await expect(page.getByRole("heading", { name: "Complete verification" })).toBeVisible();
  });
});
