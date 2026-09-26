import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const routeCss = readFileSync("src/app/dashboard/dashboard-account-security.css", "utf8");
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`The controls-only stylesheet keeps Account security usable on ${viewport.name}`, async ({ page }) => {
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
    // This is a CSS fixture, not authenticated application or MFA-provider UAT.
    // Full Dashboard routing and account isolation use dashboard-sparks.spec.ts.
    await page.setContent(`
      <!doctype html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
        <body>
          <div class="page-shell dashboard-page marketplace-app-shell">
            <main id="main-content">
              <section class="v72-private-surface v72-account-surface"><h1>Account</h1></section>
              <section class="section section-white" id="background-networking">
                <header>Background networking</header>
                <div class="data-grid">
                  <article class="panel data-card" id="privacy-controls">Privacy controls</article>
                  <article class="panel data-card" id="account-security">
                    <p class="detail-kicker">Account security</p>
                    <h3>Authenticator MFA for private wish data</h3>
                    <form>
                      <label><span>Factor name</span><input name="friendly_name" placeholder="Authenticator app" /></label>
                      <button type="button">Create MFA setup</button>
                    </form>
                    <form>
                      <label><span>Code</span><input autocomplete="one-time-code" inputmode="numeric" name="code" /></label>
                      <button type="button">Verify MFA setup</button>
                    </form>
                  </article>
                </div>
              </section>
              <section class="section section-white" id="payment-setup">Payment setup</section>
              <section class="section section-white" id="notifications">Notifications</section>
            </main>
          </div>
        </body>
      </html>
    `);
    await page.addStyleTag({ content: `
      :root { --content-width: 1180px; }
      * { box-sizing: border-box; }
      body { margin: 0; }
      .marketplace-app-shell #main-content > .section { display: none; }
    ` });
    await page.addStyleTag({ content: routeCss });

    const accountSecurity = page.locator("#account-security");
    await expect(accountSecurity).toBeVisible();
    await expect(accountSecurity.getByText("Account security", { exact: true })).toBeVisible();
    await expect(accountSecurity.getByRole("heading", { name: "Authenticator MFA for private wish data" })).toBeVisible();
    await expect(accountSecurity.getByRole("button", { name: "Create MFA setup" })).toBeVisible();
    await expect(accountSecurity.getByRole("button", { name: "Verify MFA setup" })).toBeVisible();
    const code = accountSecurity.locator('input[autocomplete="one-time-code"]');
    await expect(code).toBeVisible();
    await code.fill("123456");
    await expect(code).toHaveValue("123456");

    // Privacy, payments and notifications are now deliberately reachable on the
    // secondary controls screen. The former "only MFA may be visible" assertion
    // conflicts with the owner's explicit new priorities/controls split.
    await expect(page.locator("#background-networking")).toBeVisible();
    await expect(page.locator("#background-networking > .data-grid")).toBeVisible();
    for (const id of ["privacy-controls", "payment-setup", "notifications"]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    // The repair must remain scoped to the controls-only page class.
    await page.locator(".page-shell").evaluate((element) => element.classList.remove("dashboard-page"));
    await expect(accountSecurity).toBeHidden();
    await expect(page.locator("#payment-setup")).toBeHidden();
    await expect(page.locator("#notifications")).toBeHidden();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
