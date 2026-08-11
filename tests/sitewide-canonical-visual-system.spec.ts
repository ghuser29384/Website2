import { expect, test, type ConsoleMessage, type Page, type TestInfo } from "@playwright/test";

const PAPER = "rgb(245, 242, 233)";
const BLACK = "rgb(5, 5, 5)";
const BLUE = "rgb(36, 80, 255)";

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

const credentialGatedRoutes = ["/offsets"];

const accountAndStandaloneRoutes = [
  "/login",
  "/signup",
  "/complete-profile",
  "/trades/new",
  "/complete-verification.html?record=wild-animal-research&from=calendar",
];

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

function safeName(route: string) {
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}

function routePath(route: string) {
  return new URL(route, "http://127.0.0.1:3210").pathname;
}

function isCreateFrameRoute(pathname: string) {
  return pathname === "/create" || pathname === "/trades/new";
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

async function waitForTextLength(page: Page, minimum: number) {
  await expect
    .poll(
      async () => {
        const text = await page.locator("body").innerText().catch(() => "");
        return text.replace(/\s+/g, " ").trim().length;
      },
      { message: "A rendered page must contain meaningful visible text.", timeout: 45_000 },
    )
    .toBeGreaterThan(minimum);
}

async function waitForMeaningfulSurface(page: Page, route: string) {
  const pathname = routePath(route);

  if (pathname === "/complete-verification.html") {
    await expect(page.locator(".mt-verify-appbar")).toBeVisible({ timeout: 45_000 });
    await waitForTextLength(page, 80);
    return;
  }

  if (isCreateFrameRoute(pathname)) {
    const frame = page.locator("iframe").first();
    await expect(frame).toBeVisible({ timeout: 45_000 });
    const frameBody = frame.contentFrame().locator("body");
    await expect(frameBody).toBeVisible({ timeout: 45_000 });
    await expect
      .poll(
        async () => (await frameBody.innerText().catch(() => "")).replace(/\s+/g, " ").trim().length,
        { message: "The Create iframe must render substantive controls and copy.", timeout: 45_000 },
      )
      .toBeGreaterThan(80);
    return;
  }

  if (pathname === "/dashboard") {
    await expect(page.locator("#account-heading")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("#dashboard-overview")).toBeVisible({ timeout: 45_000 });
    await waitForTextLength(page, 160);
    return;
  }

  if (pathname === "/commitments") {
    await expect(page.locator("#commitments-heading")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('nav[aria-label="Commitments sections"]')).toBeVisible({ timeout: 45_000 });
    await waitForTextLength(page, 120);
    return;
  }

  if (pathname === "/walkthrough") {
    await expect(page.locator(".mtw-shell")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(".mtw-labbar")).toBeVisible({ timeout: 45_000 });
    await waitForTextLength(page, 100);
    return;
  }

  await expect(page.locator("h1, h2, [role='heading']").first()).toBeVisible({ timeout: 45_000 });
  await waitForTextLength(page, 50);
}

async function expectNoFrameworkOverlay(page: Page, route: string) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  expect(bodyText, `${route} must not render the Next.js fatal error page`).not.toContain(
    "Application error: a client-side exception has occurred",
  );
  expect(bodyText, `${route} must not render a failed-compilation page`).not.toMatch(
    /Unhandled Runtime Error|Build Error|Failed to compile/i,
  );

  const portalText = (await page.locator("nextjs-portal").allTextContents().catch(() => []))
    .join(" ")
    .replace(/\s+/g, " ");
  expect(portalText, `${route} must not expose a framework error overlay`).not.toMatch(
    /Unhandled Runtime Error|Build Error|Failed to compile|Application error/i,
  );
}

async function expectCanonicalSurface(page: Page, route: string, testInfo: TestInfo) {
  const response = await page.goto(route, { timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200, route).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible({ timeout: 45_000 });
  await waitForMeaningfulSurface(page, route);
  await expectNoFrameworkOverlay(page, route);

  const finalUrl = page.url();
  expect(finalUrl).not.toContain("/_error");
  expect(new URL(finalUrl).pathname).not.toBe("/_not-found");
  expect((await page.title()).trim().length, `${route} document title`).toBeGreaterThan(0);

  if (route.startsWith("/complete-verification")) {
    await expect(page.locator(".mt-verify-appbar")).toHaveCSS("background-color", BLACK);
  } else if (isCreateFrameRoute(routePath(route))) {
    const frame = page.locator("iframe").first();
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
    await expect(page.locator(`[data-mt-surface="${expectedSurface}"]`)).toBeVisible({ timeout: 45_000 });
  }

  const background = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
  expect([PAPER, BLACK, "rgb(17, 18, 15)"], `${route} body background`).toContain(background);

  const geometry = await page.evaluate(() => {
    const explicit = new Set(
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".panel,.data-card,.section,.concept-card,.mpgf-panel,.v72-shortcut-tile,.mt-v75-side-link,.mt-v75-side-plan",
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
        return rect.width > 120 && rect.height > 40 && getComputedStyle(element).display !== "none";
      })
      .slice(0, 32);
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
  await page.waitForTimeout(150);
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

for (const route of credentialGatedRoutes) {
  test(`aligns credential-gated product route ${route}`, async ({ page }, testInfo) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "This route requires the real service-role environment and is covered by source contracts here.",
    );
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
  await page.goto("/", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-mt-canonical-home="true"]')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("header.topbar")).toHaveCSS("background-color", BLACK, { timeout: 45_000 });
  await page.screenshot({ path: testInfo.outputPath("reference-home.png"), fullPage: false });

  await page.goto("/walkthrough", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await waitForMeaningfulSurface(page, "/walkthrough");
  await expectNoFrameworkOverlay(page, "/walkthrough");
  await page.screenshot({ path: testInfo.outputPath("reference-walkthrough.png"), fullPage: false });
});

test("Commitments uses hard editorial navigation and preserves tab interaction", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectCanonicalSurface(page, "/commitments", testInfo);

  const activeTrack = page.locator('.mt-v75-side-link[aria-current="page"]').first();
  await expect(activeTrack).toBeVisible();
  await expect(activeTrack).toHaveCSS("border-radius", "0px");
  await expect(activeTrack).toHaveCSS("background-color", BLACK);
  await expect(activeTrack).toHaveCSS("border-left-color", BLUE);

  const planner = page.locator(".mt-v75-side-plan").first();
  await expect(planner).toBeVisible();
  await expect(planner).toHaveCSS("border-radius", "0px");
  await expect(planner).toHaveCSS("box-shadow", "none");

  await page.getByRole("link", { exact: true, name: "Ledger" }).click();
  await expect(page).toHaveURL(/\/commitments\?tab=ledger/);
  await waitForMeaningfulSurface(page, "/commitments");
});

test("Dashboard cannot pass as an empty graph-paper capture", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectCanonicalSurface(page, "/dashboard", testInfo);

  await expect(page.locator("#account-heading")).toHaveText("Account");
  await expect(page.locator("#dashboard-overview")).toBeVisible();
  const visibleText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
  expect(visibleText.length).toBeGreaterThan(300);

  await page.getByRole("link", { exact: true, name: "Overview" }).click();
  await expect(page).toHaveURL(/#dashboard-overview$/);
  await expect(page.locator("#dashboard-overview")).toBeInViewport();
});

test("keeps representative routes usable on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/about",
    "/offers?view=live",
    "/commitments",
    "/dashboard",
    "/connectors",
    "/pledge-swaps",
    "/login",
    "/trades/new",
  ]) {
    await expectCanonicalSurface(page, route, testInfo);
  }
});
