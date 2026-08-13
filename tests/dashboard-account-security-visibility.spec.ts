import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const routeCss = readFileSync(
  "src/app/dashboard/dashboard-account-security.css",
  "utf8",
);

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
    await page.setContent(`
      <!doctype html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
        <body>
          <div class="page-shell dashboard-page marketplace-app-shell">
            <main id="main-content">
              <section class="v72-private-surface v72-account-surface">
                <h1>Account</h1>
              </section>
              <section class="section section-white" id="background-networking">
                <header data-unrelated="section-heading">Background networking</header>
                <div class="data-grid">
                  <article class="panel data-card" data-unrelated="legacy-card">
                    Legacy networking controls
                  </article>
                  <article class="panel data-card" id="account-security">
                    <p class="detail-kicker">Account security</p>
                    <h3>Authenticator MFA for private wish data</h3>
                    <form>
                      <label>
                        <span>Factor name</span>
                        <input name="friendly_name" placeholder="Authenticator app" />
                      </label>
                      <button type="button">Create MFA setup</button>
                    </form>
                    <form>
                      <label>
                        <span>Code</span>
                        <input autocomplete="one-time-code" inputmode="numeric" name="code" />
                      </label>
                      <button type="button">Verify MFA setup</button>
                    </form>
                  </article>
                </div>
              </section>
            </main>
          </div>
        </body>
      </html>
    `);
    await page.addStyleTag({
      content: `
        :root { --content-width: 1180px; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .marketplace-app-shell #main-content > .section { display: none; }
      `,
    });
    await page.addStyleTag({ content: routeCss });

    const accountSecurity = page.locator("#account-security");
    await expect(accountSecurity).toBeVisible();
    await expect(accountSecurity.getByText("Account security", { exact: true })).toBeVisible();
    await expect(
      accountSecurity.getByRole("heading", {
        name: "Authenticator MFA for private wish data",
      }),
    ).toBeVisible();
    await expect(accountSecurity.getByRole("button", { name: "Create MFA setup" })).toBeVisible();
    await expect(accountSecurity.getByRole("button", { name: "Verify MFA setup" })).toBeVisible();
    await expect(accountSecurity.locator('input[autocomplete="one-time-code"]')).toBeVisible();

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
