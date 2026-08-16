import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL =
  process.env.DIRECT_SPENDING_UPGRADE_RENDERED_BASE_URL ??
  "http://127.0.0.1:3212";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_EMAIL = "direct-upgrade-rendered-creator@qa.invalid";
const QA_PASSWORD = process.env.DIRECT_UPGRADE_RENDERED_QA_PASSWORD ?? "";
const CREATOR_DETAIL_FIXTURE_ID = "e7000000-0000-4000-8000-000000000007";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function authClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn() {
  if (!QA_PASSWORD) throw new Error("DIRECT_UPGRADE_RENDERED_QA_PASSWORD is required.");
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed: ${error?.message ?? "no session"}`);
  }
  return data.session;
}

async function sessionCookies(session: Session) {
  const captured: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(values) {
        captured.splice(0, captured.length, ...values);
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  return captured.map(({ name, value }) => ({
    name,
    value,
    url: BASE_URL,
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "Lax" as const,
  }));
}

async function authenticatedContext(
  browser: Browser,
  session: Session,
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
  });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: BASE_URL.startsWith("https://"),
      sameSite: "Lax",
    },
  ]);
  return context;
}

async function expectResponsive(page: Page) {
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  const measurements = await page.evaluate(() => {
    function isInsideHorizontalScrollRegion(element: Element) {
      for (
        let ancestor = element.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (
          (overflowX === "auto" || overflowX === "scroll") &&
          ancestor.scrollWidth > ancestor.clientWidth + 1
        ) {
          return true;
        }
      }
      return false;
    }

    return {
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      clipped: [...document.querySelectorAll("input, select, textarea, button, a")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < -1 || rect.right > window.innerWidth + 1) &&
            !isInsideHorizontalScrollRegion(element)
          );
        })
        .map((element) => element.outerHTML.slice(0, 180)),
    };
  });
  expect(measurements.page).toBeLessThanOrEqual(measurements.viewport + 1);
  expect(measurements.clipped).toEqual([]);
}

async function exerciseViewport(
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
) {
  const page = await context.newPage();
  const prohibitedRequests: string[] = [];
  const suppressedTelemetry: string[] = [];
  const pageErrors: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const provider = /(^|\.)(every\.org|stripe\.com)$/i.test(url.hostname);
    if (
      request.method().toUpperCase() === "POST" &&
      url.origin === new URL(BASE_URL).origin &&
      url.pathname === "/api/funnel-events"
    ) {
      suppressedTelemetry.push(`${request.method()} ${url.pathname}`);
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (!SAFE_METHODS.has(request.method().toUpperCase()) || provider) {
      prohibitedRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/trades/new?structure=conditional-donation&rail=direct", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: "What was this money otherwise going to be used for?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue with a planned donation" }),
  ).toHaveAttribute("href", /baseline=planned-donation/);
  await expect(
    page.getByRole("link", { name: "Continue with optional spending" }),
  ).toHaveAttribute("href", /baseline=nonessential-spending/);
  await expectResponsive(page);
  await page.screenshot({
    fullPage: true,
    path: `output/playwright/spending-upgrade/${viewport.name}-baseline-choice.png`,
  });

  await page.getByRole("link", { name: "Continue with optional spending" }).click();
  await expect(page).toHaveURL(/baseline=nonessential-spending/);
  await expect(
    page.getByRole("heading", {
      name: "Turn verified optional spending into two direct donations.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Freeze private baseline for review", { exact: true })).toBeVisible();
  await expect(page.getByText(/No match means no donation obligation/)).toBeVisible();
  await expect(
    page.getByText(
      /currently available funds, not BNPL,\s*cash advances,\s*payday lending/i,
    ),
  ).toBeVisible();
  await expect(page.getByText(/skip a meal/i)).toHaveCount(0);
  await expect(page.getByText(/sacrifice leaderboard/i)).toHaveCount(0);

  const planned = page.locator('input[name="planned_spend_amount"]');
  const creator = page.locator('input[name="creator_diversion_amount"]');
  await planned.fill("10.00");
  await creator.fill("9.99");
  const amountFieldset = page.getByRole("group", {
    name: "How much planned nonessential spending becomes a donation?",
    exact: true,
  });
  await expect(
    amountFieldset.locator("dt", { hasText: "Spending remainder" })
      .locator("xpath=following-sibling::dd"),
  ).toHaveText("$0.01");
  await expect(
    amountFieldset.locator("dt", { hasText: "Creator donates if matched" })
      .locator("xpath=following-sibling::dd"),
  ).toHaveText("$9.99");
  await expectResponsive(page);
  await page.screenshot({
    fullPage: true,
    path: `output/playwright/spending-upgrade/${viewport.name}-create-form.png`,
  });

  await page.goto("/donation-upgrades", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Optional spending can open only after private baseline review.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Private QA merchant", { exact: false })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "View exact Spending Upgrade terms" }).first(),
  ).toBeVisible();
  await expectResponsive(page);

  await page.goto(`/donation-upgrades/spending/${CREATOR_DETAIL_FIXTURE_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: "Two donation records and one separate evidence decision.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Matcher incremental credit", { exact: true })).toBeVisible();
  await expect(page.getByText("Creator converted-spending credit", { exact: true })).toBeVisible();
  await expect(page.getByText("None", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit private evidence for scoped review" }),
  ).toBeVisible();
  await expect(page.getByText("Owner-private QA merchant", { exact: false })).toHaveCount(0);
  await expectResponsive(page);
  await page.screenshot({
    fullPage: true,
    path: `output/playwright/spending-upgrade/${viewport.name}-participant-detail.png`,
  });

  expect(prohibitedRequests).toEqual([]);
  expect(suppressedTelemetry.every((entry) => entry === "POST /api/funnel-events")).toBe(true);
  expect(pageErrors).toEqual([]);
  await page.close();
}

test("authenticated Spending Upgrade subtype is read-only, private, and responsive at three viewports", async ({
  browser,
}) => {
  const session = await signIn();
  for (const viewport of VIEWPORTS) {
    const context = await authenticatedContext(browser, session, viewport);
    try {
      await exerciseViewport(context, viewport);
    } finally {
      await context.close();
    }
  }
});
