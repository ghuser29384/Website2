import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`Account security is visible and isolated on ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "unknown request failure";
      failedRequests.push(`${request.method()} ${request.url()} — ${failure}`);
    });

    await page.setViewportSize(viewport);
    await page.goto("/dashboard#account-security", { waitUntil: "domcontentloaded" });

    const accountSecurity = page.locator("#account-security");
    await expect(accountSecurity).toBeVisible();
    await expect(accountSecurity.getByText("Account security", { exact: true })).toBeVisible();
    await expect(
      accountSecurity.getByRole("heading", {
        name: "Authenticator MFA for private wish data",
      }),
    ).toBeVisible();
    await expect(accountSecurity.getByRole("button", { name: "Create MFA setup" })).toBeVisible();

    const legacyWorkspace = page.locator("#background-networking");
    await expect(legacyWorkspace).toBeVisible();
    await expect(legacyWorkspace.locator(":scope > .data-grid")).toBeVisible();

    const unrelatedVisibleChildren = await legacyWorkspace
      .locator(":scope > :not(.data-grid), :scope > .data-grid > :not(#account-security)")
      .evaluateAll((elements) =>
        elements.filter((element) => getComputedStyle(element).display !== "none").length,
      );
    expect(unrelatedVisibleChildren).toBe(0);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
