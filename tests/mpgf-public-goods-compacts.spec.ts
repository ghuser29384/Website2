import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name} Compact v2 is truthful, signed out, and overflow-free`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    const response = await page.goto("/mpgf/compacts", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Voluntary Public-Goods Compacts/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Coordinate by constitution, not taxation.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Moral Trade has no government taxing authority").first(),
    ).toBeVisible();
    await expect(page.getByText("one aggregate monthly obligation")).toBeVisible();
    await expect(page.getByText("Actual settlement governs")).toBeVisible();
    await expect(
      page.getByText("No action on this page moves money, creates a payment mandate, or records a payment receipt."),
    ).toBeVisible();

    await expect(page.getByTestId("compact-future-flourishing")).toBeVisible();
    await expect(page.getByTestId("compact-animal-welfare")).toBeVisible();
    await expect(page.getByTestId("compact-global-health")).toBeVisible();
    await expect(page.getByTestId("compact-unavailable")).toContainText(
      "Published constitution examples",
    );
    await expect(page.getByText("No amount is inferred from self-reporting")).toBeVisible();
    await expect(page.getByText("70% equal + 30% square-root").first()).toBeVisible();
    await expect(page.getByText("100 verified unique people and $500 planned").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to join" })).toHaveAttribute(
      "href",
      "/login?returnTo=/mpgf/compacts",
    );
    await expect(page.getByTestId("no-active-compact-ballot")).toContainText(
      "No vote or delegation target is fabricated",
    );

    await expect(page.getByLabel(/Self-declared eligible monthly spending/i)).toHaveCount(0);
    await expect(page.getByText(/\$10 cap|5,000 accepted|one member, one voting credit/i)).toHaveCount(0);

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(errors).toEqual([]);

    await testInfo.attach(`compact-v2-${viewport.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
}
