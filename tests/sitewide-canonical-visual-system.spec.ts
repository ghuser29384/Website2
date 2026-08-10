import { expect, test, type ConsoleMessage, type Page, type TestInfo } from "@playwright/test";

const PAPER = "rgb(245, 242, 233)";
const BLACK = "rgb(5, 5, 5)";

const publicEditorialRoutes = [
  "/about",
  "/accessibility",
  "/contact",
  "/faq",
  "/methodology",
  "/moral-trade",
  "/moral-trade/technical-spec",
  "/privacy",
  "/safety",
  "/status",
  "/support",
  "/team",
  "/terms",
  "/transparency",
  "/what-is-moral-trade",
  "/worked-examples",
];

const productRoutes = [
  "/start",
  "/donate",
  "/offers?view=live",
  "/discover?domain=offers&view=list",
  "/create",
  "/offsets",
  "/pools",
  "/commitments",
  "/evidence",
  "/dashboard",
  "/mpgf",
  "/reasoning-center",
  "/trade-controls",
  "/background-networking",
  "/connectors",
  "/pledge-swaps",
  "/labs/moral-public-goods/global-biosecurity-coordination",
];

const accountAndStandaloneRoutes = [
  "/login",
  "/signup",
  "/complete-profile",
  "/trades/new",
  "/complete-verification.html?record=wild-animal-research&from=calendar",
];

function safeName(route: string) {
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}

async function noRelevantConsoleErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  const handler = (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  };
  page.on("console", handler);
  try {
    await run();
  } finally {
    page.off("console", handler);
  }
  return errors.filter(
    (message) =>
      !message.includes("favicon") &&
      !message.includes("Failed to load resource: the server responded with a status of 404") &&
      !message.includes("Supabase") &&
      !message.includes("auth session"),
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.clientWidth).toBe(dimensions.innerWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

async function expectCanonicalSurface(page: Page, route: string, testInfo: TestInfo) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200, route).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("nextjs-portal")).toHaveCount(0);

  const finalUrl = page.url();
  expect(finalUrl).not.toContain("/_error");

  if (route.startsWith("/complete-verification")) {
    await expect(page.locator(".mt-verify-appbar")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".mt-verify-appbar")).toHaveCSS("background-color", BLACK);
  } else if (route === "/trades/new") {
    const frame = page.locator("iframe").first();
    await expect(frame).toBeVisible({ timeout: 30_000 });
    const body = frame.contentFrame().locator("body");
    await expect(body).toBeVisible({ timeout: 30_000 });
    await expect(frame.contentFrame().locator(".topbar")).toHaveCSS("background-color", BLACK);
  } else {
    const topbar = page.locator(".mt-site-topbar").first();
    if (await topbar.isVisible().catch(() => false)) {
      await expect(topbar).toHaveCSS("background-color", BLACK);
      await expect(topbar).toHaveCSS("border-radius", "0px");
    }
  }

  const expectedSurface = route.startsWith("/login") || route.startsWith("/signup")
    ? "auth"
    : route.startsWith("/connectors")
      ? "connectors"
      : route.startsWith("/pledge-swaps")
        ? "pledge-swaps"
        : route.startsWith("/complete-profile")
          ? "complete-profile"
          : route.startsWith("/labs/moral-public-goods")
            ? "mpgf-labs"
            : null;
  if (expectedSurface && !finalUrl.includes("/walkthrough")) {
    await expect(page.locator(`[data-mt-surface="${expectedSurface}"]`)).toBeVisible({ timeout: 30_000 });
  }

  const background = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
  expect([PAPER, BLACK, "rgb(17, 18, 15)"], `${route} body background`).toContain(background);

  const geometry = await page.evaluate(() => {
    const explicit = new Set(
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".panel,.data-card,.section,.concept-card,.mpgf-panel,.v72-shortcut-tile",
        ),
      ),
    );
    const semanticSurface = /(?:card|panel|tile|drawer|modal|sheet|banner|receipt)$/i;
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("[class]"))) {
      if (Array.from(element.classList).some((token) => semanticSurface.test(token))) {
        explicit.add(element);
      }
    }
    const elements = Array.from(explicit)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 120 && rect.height > 48 && getComputedStyle(element).display !== "none";
      })
      .slice(0, 24);
    return elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        className: element.className,
        radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
        shadow: style.boxShadow,
      };
    });
  });

  for (const item of geometry) {
    expect(item.radius, `${route}: ${String(item.className)} radius`).toBeLessThanOrEqual(3);
    expect(item.shadow, `${route}: ${String(item.className)} shadow`).toBe("none");
  }

  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath(`${safeName(route)}-${page.viewportSize()?.width ?? "viewport"}.png`),
    fullPage: false,
  });
}

for (const route of publicEditorialRoutes) {
  test(`aligns public editorial route ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors = await noRelevantConsoleErrors(page, () => expectCanonicalSurface(page, route, testInfo));
    expect(errors).toEqual([]);
  });
}

for (const route of productRoutes) {
  test(`aligns product route ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors = await noRelevantConsoleErrors(page, () => expectCanonicalSurface(page, route, testInfo));
    expect(errors).toEqual([]);
  });
}

for (const route of accountAndStandaloneRoutes) {
  test(`aligns account or standalone route ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors = await noRelevantConsoleErrors(page, () => expectCanonicalSurface(page, route, testInfo));
    expect(errors).toEqual([]);
  });
}

test("preserves the canonical Home and Walkthrough references", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header.topbar")).toHaveCSS("background-color", BLACK, { timeout: 30_000 });
  await page.screenshot({ path: testInfo.outputPath("reference-home.png"), fullPage: false });

  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".mtw-shell")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: testInfo.outputPath("reference-walkthrough.png"), fullPage: false });
});

test("keeps representative routes usable on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/about",
    "/offers?view=live",
    "/commitments",
    "/connectors",
    "/pledge-swaps",
    "/login",
    "/trades/new",
  ]) {
    await expectCanonicalSurface(page, route, testInfo);
  }
});
