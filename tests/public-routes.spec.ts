import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/offers",
  "/background-networking",
  "/reasoning-standards",
  "/donate",
  "/donation-offsets",
  "/wish-registry",
  "/people",
  "/mpgf",
  "/mpgf/contribute",
  "/mpgf/account/contributions",
  "/mpgf/pools",
  "/mpgf/technical-spec",
  "/priority-correction-fund",
  "/privacy",
  "/terms",
  "/safety",
  "/login",
  "/signup",
] as const;

const protectedRoutes = ["/dashboard", "/cart"] as const;

function isIgnorableConsoleError(message: string) {
  return (
    message.includes("favicon.ico") ||
    message.includes("Failed to load resource: the server responded with a status of 404")
  );
}

for (const route of publicRoutes) {
  test(`public route ${route} renders meaningful content without landmark regressions`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !isIgnorableConsoleError(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).not.toHaveText(
      /Loading Moral Trade\.\s*Opening the requested workflow\./,
    );
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);

    const landmarkOrder = await page.evaluate(() => {
      const main = document.querySelector("main");
      const footer = document.querySelector("footer");
      if (!main || !footer) {
        return "missing";
      }

      return main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
        ? "main-before-footer"
        : "footer-before-main";
    });
    expect(landmarkOrder).toBe("main-before-footer");

    expect(consoleErrors).toEqual([]);
  });
}

test("/offers keeps offer and cause-area cards before the footer", async ({ page }) => {
  await page.goto("/offers", { waitUntil: "domcontentloaded" });

  const contentAfterFooter = await page.evaluate(() => {
    const footer = document.querySelector("footer");
    if (!footer) {
      return ["missing footer"];
    }

    const cards = [...document.querySelectorAll("article")].filter((card) => {
      const text = card.textContent ?? "";
      return (
        text.includes("worked examples") ||
        text.includes("No published offer yet") ||
        text.includes("Published proposals") ||
        card.classList.contains("data-card")
      );
    });

    return cards
      .filter(
        (card) =>
          footer.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
      )
      .map((card) => card.textContent?.trim().slice(0, 80) ?? "untitled card");
  });

  expect(contentAfterFooter).toEqual([]);
});

for (const route of protectedRoutes) {
  test(`signed-out ${route} resolves away from the loading shell`, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(route, { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).not.toHaveText(
      /Loading Moral Trade\.\s*Opening the requested workflow\./,
      { timeout: 2_000 },
    );

    if (page.url().includes("/login")) {
      expect(page.url()).toContain(`returnTo=${encodeURIComponent(route)}`);
      await expect(page.locator("h1")).toContainText("Log in");
    } else {
      await expect(page.locator("h1")).toBeVisible();
    }
  });
}
