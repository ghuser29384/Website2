import { expect, test, type Page } from "@playwright/test";

const standardPublicRoutes = [
  "/offers",
  "/funding-rounds/vegetarian-week-micro-assurance-preview",
  "/what-is-moral-trade",
  "/worked-examples",
  "/cohort",
  "/create",
  "/pledge-swaps",
  "/paid-action-offers",
  "/background-networking",
  "/reasoning-standards",
  "/donate",
  "/methodology",
  "/reasoning-center",
  "/moral-trade/technical-spec",
  "/wish-registry",
  "/people",
  "/mpgf",
  "/public-goods-fund",
  "/mpgf/contribute",
  "/mpgf/account/contributions",
  "/mpgf/pools",
  "/mpgf/technical-spec",
  "/privacy",
  "/terms",
  "/safety",
  "/anti-threat-rules",
  "/status",
  "/team-and-governance",
  "/pilot-updates",
  "/faq",
] as const;

const dataDependentPublicRoutes = [
  {
    route: "/donation-offsets",
    heading: /Redirect opposed donations into shared good|Live offset data is temporarily unavailable/i,
  },
  {
    route: "/priority-correction-fund",
    heading:
      /Redirect a fixed share of recent money|Live priority-fund data is temporarily unavailable/i,
  },
] as const;

const protectedRoutes = ["/dashboard", "/cart"] as const;
const standardNavLabels = [
  "Feed",
  "Discover",
  "Create",
  "Invite",
  "Messages",
  "Commitments",
  "Evidence",
  "Safety",
] as const;

function isIgnorableConsoleError(message: string) {
  return (
    message.includes("favicon.ico") ||
    message.includes("Failed to load resource: the server responded with a status of 404")
  );
}

function recordUnexpectedErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !isIgnorableConsoleError(message.text())) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.stack || error.message);
  });

  return errors;
}

async function visibleCount(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) =>
    elements.filter((element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      const hiddenAncestor = element.closest("[hidden], [aria-hidden='true'], [inert]");

      return (
        !hiddenAncestor &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }).length,
  );
}

async function expectVisibleCount(page: Page, selector: string, expected: number) {
  await expect
    .poll(() => visibleCount(page, selector), {
      message: `visible ${selector} count`,
      timeout: 15_000,
    })
    .toBe(expected);
}

async function waitForResolvedPage(page: Page) {
  await page.waitForLoadState("load").catch(() => undefined);
  await expect(page.locator("body")).not.toHaveText(
    /Loading Moral Trade\.\s*Opening the requested workflow\./,
    { timeout: 15_000 },
  );
  await expect(page.locator("body")).not.toContainText("Preparing route", { timeout: 15_000 });
  await expect(page.locator("body")).not.toContainText("This page did not finish rendering", {
    timeout: 15_000,
  });
  await expect(page.locator("body")).not.toContainText("Internal Server Error", {
    timeout: 15_000,
  });
}

async function expectStandardShell(page: Page) {
  await expectVisibleCount(page, "h1", 1);
  await expectVisibleCount(page, 'nav[aria-label="Primary"]', 1);
  await expectVisibleCount(page, "main", 1);
  await expectVisibleCount(page, ".mt-site-footer", 1);

  const order = await page.evaluate(() => {
    const isVisible = (element: Element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      return (
        !element.closest("[hidden], [aria-hidden='true'], [inert]") &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const main = [...document.querySelectorAll("main")].find(isVisible);
    const footer = [...document.querySelectorAll(".mt-site-footer")].find(isVisible);

    if (!main || !footer) return "missing";
    return main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
      ? "main-before-footer"
      : "footer-before-main";
  });

  expect(order).toBe("main-before-footer");
}

for (const route of standardPublicRoutes) {
  test(`standard public route ${route} resolves with one visible page shell`, async ({ page }) => {
    const errors = recordUnexpectedErrors(page);
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });

    expect(response?.status() ?? 200).toBeLessThan(400);
    await waitForResolvedPage(page);
    await expectStandardShell(page);
    expect(errors).toEqual([]);
  });
}

for (const { route, heading } of dataDependentPublicRoutes) {
  test(`${route} renders live data or a truthful recovery shell`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForResolvedPage(page);
    await expectStandardShell(page);

    const pageHeading = page.getByRole("heading", { level: 1 });
    await expect(pageHeading).toHaveText(heading);
    const isRecovery = /temporarily unavailable/i.test((await pageHeading.textContent()) ?? "");
    await expect(page.getByText("No action taken", { exact: true })).toHaveCount(
      isRecovery ? 1 : 0,
    );
  });
}

test("the current home workspace has one semantic page heading and its dedicated navigation", async ({
  page,
}) => {
  const errors = recordUnexpectedErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForResolvedPage(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Your best match right now" }),
  ).toHaveCount(1);
  await expectVisibleCount(page, 'nav[aria-label="Primary"]', 1);
  await expectVisibleCount(page, "main", 1);
  await expectVisibleCount(page, ".mt-site-footer", 0);

  const navLabels = await page.locator('nav[aria-label="Primary"] a').allTextContents();
  expect(navLabels.map((label) => label.trim())).toEqual([
    "Feed",
    "Now",
    "Discover",
    "Activity",
    "Evidence",
    "Account",
  ]);
  expect(errors).toEqual([]);
});

test("/offers/new transfers to the embedded Create interface with a document heading", async ({
  page,
}) => {
  const errors = recordUnexpectedErrors(page);
  await page.goto("/offers/new", { waitUntil: "domcontentloaded" });
  await waitForResolvedPage(page);

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/trades/new");
  await expect(
    page.getByRole("heading", { level: 1, name: "Create a Moral Trade" }),
  ).toHaveCount(1);
  await expectVisibleCount(page, "main", 1);
  await expect(page.locator('iframe[title="Moral Trade Create"]')).toBeVisible();
  await expectVisibleCount(page, 'nav[aria-label="Primary"]', 0);
  await expectVisibleCount(page, ".mt-site-footer", 0);
  expect(errors).toEqual([]);
});

test("auth routes use the compact auth shell rather than the marketplace topbar", async ({ page }) => {
  for (const [route, heading] of [
    ["/login", "Welcome back"],
    ["/signup", "Create your account"],
  ] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForResolvedPage(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expectVisibleCount(page, 'nav[aria-label="Primary"]', 0);
    await expectVisibleCount(page, "main", 1);
    await expectVisibleCount(page, "footer", 1);
  }
});

test("representative marketplace pages expose the current top-level navigation", async ({ page }) => {
  for (const route of ["/offers", "/methodology", "/mpgf", "/people", "/safety"] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForResolvedPage(page);

    const navLabels = await page
      .locator(".topbar-links > a, .topbar-links > details > summary")
      .allTextContents();
    expect(navLabels.map((label) => label.replace("▾", "").trim())).toEqual(standardNavLabels);
    await expect(page.locator(".topbar-actions")).toContainText("Sign in");
  }
});

test("/offers/new offset creation layout stays broad without mobile overflow", async ({ page }) => {
  const route = "/offers/new?mode=offset#offer-boundaries";
  const viewports = [375, 768, 1024, 1280, 1440] as const;

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route, { waitUntil: "domcontentloaded" });

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    const wizard = page.locator('section[aria-labelledby="offer-wizard-heading"]');
    const wizardVisible = (await wizard.count()) > 0 && (await wizard.first().isVisible());

    if (width === 1280 && wizardVisible) {
      const wizardBox = await wizard.first().boundingBox();
      expect(wizardBox?.width ?? 0).toBeGreaterThan(900);

      const templateSection = page.locator('section[aria-labelledby="offer-template-heading"]');
      await expect(templateSection).toBeVisible();

      const templateBox = await templateSection.boundingBox();
      expect(templateBox?.width ?? 0).toBeGreaterThan(900);
      expect((templateBox?.x ?? 0) + (templateBox?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      await expect(page.locator(".offer-template-button")).toHaveCount(4);
    }
  }
});

test("/login preserves returnTo, keeps email, and never exposes Apple", async ({ page }) => {
  await page.goto("/login?returnTo=/offers/new", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toHaveText("Welcome back");
  await expect(page.getByRole("link", { name: "Continue with Email" })).toHaveAttribute(
    "href",
    "/login?mode=login&method=email&returnTo=%2Foffers%2Fnew",
  );
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toHaveCount(0);
  await expect(page.locator('input[name="provider"][value="apple"]')).toHaveCount(0);

  const renderedProviders = await page.locator('input[name="provider"]').evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value),
  );
  expect(new Set(renderedProviders).size).toBe(renderedProviders.length);
  expect(renderedProviders).not.toContain("apple");

  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/signup?mode=signup&returnTo=%2Foffers%2Fnew",
  );
});

test("/signup renders signup mode with legal text and mode switch", async ({ page }) => {
  await page.goto("/signup?next=/wish-registry", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toHaveText("Create your account");
  await expect(
    page.getByText("Start with one low-risk action. You can add profile details later."),
  ).toBeVisible();
  await expect(page.getByText("By creating an account, you agree to the")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute(
    "href",
    "/login?mode=login&returnTo=%2Fwish-registry",
  );
});

test("auth mode switch preserves returnTo", async ({ page }) => {
  await page.goto("/login?returnTo=/offers/new", { waitUntil: "domcontentloaded" });

  await page.getByRole("link", { name: "Create account" }).first().click();
  await expect(page).toHaveURL(/\/signup\?mode=signup&returnTo=%2Foffers%2Fnew$/);
  await expect(page.locator("h1")).toHaveText("Create your account");

  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page).toHaveURL(/\/login\?mode=login&returnTo=%2Foffers%2Fnew$/);
  await expect(page.locator("h1")).toHaveText("Welcome back");
});

test("auth email flow exposes compact required email/password form", async ({ page }) => {
  await page.goto("/login?method=email&returnTo=/dashboard", { waitUntil: "domcontentloaded" });

  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password");
  await expect(email).toHaveAttribute("required", "");
  await expect(password).toHaveAttribute("required", "");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    "/password-reset",
  );
  await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
});

test("signup email flow asks only email and password before onboarding details", async ({ page }) => {
  await page.goto("/signup?method=email&returnTo=/onboarding", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveCount(0);
  await expect(page.getByText("Optional location")).toHaveCount(0);
  await expect(page.locator('#email-auth input[name="return_to"]')).toHaveValue("/onboarding");
});

test("/mpgf assurance funding receipt recalculates expected other funding", async ({ page }) => {
  await page.goto("/mpgf#assurance-funding", { waitUntil: "networkidle" });

  const pledge = page.getByLabel("Your possible net pledge");
  const probability = page.getByLabel("Your estimated chance this pledge would be decisive (%)");

  await expect(page.getByText("Expected other funding per $1 pledged")).toBeVisible();
  await expect(page.getByText("$1.80", { exact: true })).toBeVisible();
  await expect(page.getByText("$180 expected from other valid pledges.")).toBeVisible();

  await pledge.fill("250");
  await probability.fill("40");

  await expect(page.getByText("$1.20", { exact: true })).toBeVisible();
  await expect(page.getByText("$300 expected from other valid pledges.")).toBeVisible();
  await expect(
    page.getByText("You supplied the decisive-chance estimate", { exact: false }),
  ).toBeVisible();
});

for (const route of protectedRoutes) {
  test(`signed-out ${route} resolves away from the loading shell`, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(route, { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).not.toHaveText(
      /Loading Moral Trade\.\s*Opening the requested workflow\./,
      { timeout: 5_000 },
    );

    if (page.url().includes("/login")) {
      expect(page.url()).toContain(`returnTo=${encodeURIComponent(route)}`);
      await expect(page.locator("h1")).toContainText("Welcome back");
    } else {
      await expect(page.locator("h1")).toBeVisible();
    }
  });
}
