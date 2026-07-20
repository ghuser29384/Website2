import { expect, test } from "@playwright/test";

const oauthProviderLabels = {
  apple: "Apple",
  azure: "Microsoft",
  bitbucket: "Bitbucket",
  discord: "Discord",
  facebook: "Facebook",
  figma: "Figma",
  fly: "Fly.io",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  kakao: "Kakao",
  keycloak: "Keycloak",
  linkedin: "LinkedIn",
  linkedin_oidc: "LinkedIn OIDC",
  notion: "Notion",
  slack: "Slack",
  slack_oidc: "Slack OIDC",
  spotify: "Spotify",
  twitch: "Twitch",
  twitter: "Twitter",
  workos: "WorkOS",
  x: "X",
  zoom: "Zoom",
} as const;

const oauthProviders = [
  "google",
  "apple",
  "facebook",
  "github",
  "discord",
  "x",
  "twitter",
  "linkedin_oidc",
  "linkedin",
  "azure",
  "gitlab",
  "bitbucket",
  "figma",
  "kakao",
  "keycloak",
  "notion",
  "slack_oidc",
  "slack",
  "spotify",
  "twitch",
  "workos",
  "zoom",
  "fly",
] as const;

async function getEnabledOAuthProvidersForTest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return [];
  }

  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const settings = (await response.json()) as {
    external?: Partial<Record<(typeof oauthProviders)[number], boolean>>;
  };

  return oauthProviders.filter((provider) => settings.external?.[provider] === true);
}

const publicRoutes = [
  "/",
  "/offers",
  "/funding-rounds/vegetarian-week-micro-assurance-preview",
  "/what-is-moral-trade",
  "/worked-examples",
  "/cohort",
  "/offers/new",
  "/create",
  "/pledge-swaps",
  "/paid-action-offers",
  "/background-networking",
  "/reasoning-standards",
  "/donate",
  "/donation-offsets",
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
  "/priority-correction-fund",
  "/privacy",
  "/terms",
  "/safety",
  "/anti-threat-rules",
  "/status",
  "/team-and-governance",
  "/pilot-updates",
  "/faq",
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
    await expect(page.locator("body")).not.toContainText("Preparing route");
    await expect(page.locator("body")).not.toContainText("Internal Error");
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

    const footerAfterPageHeadings = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      const headings = [...document.querySelectorAll("main h2, main h3")];
      if (!footer) {
        return "missing-footer";
      }

      return headings.every(
        (heading) => heading.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
      )
        ? "footer-after-headings"
        : "footer-before-page-content";
    });
    expect(footerAfterPageHeadings).toBe("footer-after-headings");

    expect(consoleErrors).toEqual([]);
  });
}

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

test("/login renders unified auth options and preserves returnTo", async ({ page }) => {
  const enabledOAuthProviders = await getEnabledOAuthProvidersForTest();
  await page.goto("/login?returnTo=/offers/new", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toHaveText("Log in to Moral Trade");
  await expect(page.getByRole("link", { name: "Continue with Email" })).toHaveAttribute(
    "href",
    "/login?mode=login&method=email&returnTo=%2Foffers%2Fnew",
  );

  for (const provider of oauthProviders) {
    const buttonName = `Continue with ${oauthProviderLabels[provider]}`;
    const expectedCount = enabledOAuthProviders.includes(provider) ? 1 : 0;
    await expect(page.getByRole("button", { name: buttonName })).toHaveCount(expectedCount);

    if (expectedCount === 1) {
      const providerInput = page.locator(
        `form:has(button:has-text("${buttonName}")) input[name="provider"]`,
      );
      await expect(providerInput).toHaveValue(provider);
    }
  }

  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/signup?mode=signup&returnTo=%2Foffers%2Fnew",
  );
});

test("/signup renders signup mode with legal text and mode switch", async ({ page }) => {
  await page.goto("/signup?next=/wish-registry", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toHaveText("Create your Moral Trade account");
  await expect(page.getByText("Start with one low-risk action. You can add profile details later.")).toBeVisible();
  await expect(page.getByText("By creating an account, you agree to the")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute(
    "href",
    "/login?mode=login&returnTo=%2Fwish-registry",
  );
});

test("auth mode switch changes between login and signup while preserving returnTo", async ({ page }) => {
  await page.goto("/login?returnTo=/offers/new", { waitUntil: "domcontentloaded" });

  await page.getByRole("link", { name: "Create account" }).first().click();
  await expect(page).toHaveURL(/\/signup\?mode=signup&returnTo=%2Foffers%2Fnew$/);
  await expect(page.locator("h1")).toHaveText("Create your Moral Trade account");

  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page).toHaveURL(/\/login\?mode=login&returnTo=%2Foffers%2Fnew$/);
  await expect(page.locator("h1")).toHaveText("Log in to Moral Trade");
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

for (const route of ["/", "/offers", "/donation-offsets", "/mpgf", "/methodology", "/safety", "/people", "/signup"] as const) {
  test(`public route ${route} uses canonical top-level navigation`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });

    const navLabels = await page.evaluate(() =>
      [...document.querySelectorAll(".topbar-links > a, .topbar-links > details > summary")]
        .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").replace("▾", "").trim()),
    );
    const actionLabels = await page.evaluate(() =>
      [...document.querySelectorAll(".topbar-actions a")]
        .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()),
    );

    expect(navLabels).toEqual(["Browse", "Create", "Learn", "Community"]);
    expect(actionLabels).toContain("Sign in");
    expect(navLabels).not.toContain("Marketplace");
    expect(navLabels).not.toContain("Explore");
    expect(navLabels).not.toContain("Advanced");
    expect(navLabels).not.toContain("MPGF");
  });
}

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
