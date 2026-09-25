import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1649, height: 928 },
  { width: 1440, height: 1000 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

for (const viewport of viewports) {
  test(`contact layout at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto("/contact");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Contact | Moral Trade");
    await expect(page.locator('[data-mt-surface="contact"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const heading = page.getByRole("heading", { level: 1, name: "Reach the Moral Trade team." });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)))
      .toBeLessThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewport.width + 1);

    const nav = page.getByRole("navigation", { name: "Primary", exact: true });
    const links = nav.locator(".topbar-links");
    const linkBounds = await links.locator(":scope > a").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
    );
    expect(linkBounds).toHaveLength(8);
    const navBounds = await nav.boundingBox();
    expect(navBounds).not.toBeNull();
    for (const bounds of linkBounds) {
      expect(Math.abs(bounds.top - linkBounds[0].top)).toBeLessThanOrEqual(1);
      expect(bounds.bottom).toBeLessThanOrEqual(navBounds!.y + navBounds!.height);
    }

    // Focus must reveal the last link in the horizontally scrolling mobile row.
    const safety = links.getByRole("link", { name: "Safety", exact: true });
    await safety.focus();
    await expect(safety).toBeFocused();
    const safetyBounds = await safety.boundingBox();
    const rowBounds = await links.boundingBox();
    expect(safetyBounds!.x).toBeGreaterThanOrEqual(rowBounds!.x - 1);
    expect(safetyBounds!.x + safetyBounds!.width)
      .toBeLessThanOrEqual(rowBounds!.x + rowBounds!.width + 1);

    await page.getByRole("link", { name: "Skip to main content", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page.locator("#main-content h1")).toHaveCount(1);

    const main = page.locator("#main-content");
    await expect(main.getByRole("link", { name: "Email support@moraltrade.org", exact: true }))
      .toHaveAttribute("href", "mailto:support@moraltrade.org");
    for (const [name, subject] of [
      ["Email a safety concern", "Safety or baseline concern"],
      ["Email a review question", "Reviewer or evidence question"],
      ["Email a partner inquiry", "Network or partner inquiry"],
    ]) {
      await expect(main.getByRole("link", { name, exact: true }))
        .toHaveAttribute("href", `mailto:support@moraltrade.org?subject=${encodeURIComponent(subject)}`);
    }
    await expect(main.getByRole("complementary", { name: "Recourse" }).locator("ol > li"))
      .toHaveCount(3);

    await page.evaluate(() => window.scrollTo(0, 0));
    if (viewport.width >= 1024) {
      await expect(main.getByRole("link", { name: "Email a safety concern", exact: true }))
        .toBeInViewport();
    }
    await page.screenshot({ path: testInfo.outputPath("contact.png"), fullPage: true });
    await testInfo.attach("contact-layout", {
      path: testInfo.outputPath("contact.png"),
      contentType: "image/png",
    });
    expect(pageErrors).toEqual([]);
  });
}

test("service status remains a working route, not a decorative control", async ({ page }) => {
  await page.goto("/contact");
  const status = page.getByRole("link", { name: "Check service status", exact: true });
  await expect(status).toHaveAttribute("href", "/status");
  await status.click();
  await expect(page).toHaveURL(/\/status(?:\?|$)/);
  await expect(page.locator("#main-content")).toBeVisible();
});
