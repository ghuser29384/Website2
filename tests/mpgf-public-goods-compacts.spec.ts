import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name} compact route is readable, truthful, signed out, and overflow-free`, async ({
    page,
  }) => {
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
    await expect(page.getByText("Moral Trade has no government taxing authority").first()).toBeVisible();
    await expect(page.getByText("The ordinary Moral Trade marketplace is outside")).toBeVisible();
    await expect(
      page.getByText("No action on this page moves money or creates a payment mandate."),
    ).toBeVisible();
    await expect(page.getByTestId("compact-future-flourishing")).toBeVisible();
    await expect(page.getByTestId("compact-animal-welfare")).toBeVisible();
    await expect(page.getByTestId("compact-global-health")).toBeVisible();
    await expect(page.getByTestId("compact-unavailable")).toContainText(
      "Published charter examples",
    );
    await expect(page.getByRole("link", { name: "Sign in to accept" })).toHaveAttribute(
      "href",
      "/login?returnTo=/mpgf/compacts",
    );
    await expect(page.getByLabel("Self-declared eligible monthly spending (USD)"))
      .toBeDisabled();
    await expect(page.getByTestId("no-active-compact-ballot")).toContainText(
      "No ballot or delegation target is being fabricated",
    );

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(errors).toEqual([]);
  });
}
