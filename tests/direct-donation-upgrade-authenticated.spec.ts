import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.DIRECT_UPGRADE_RENDERED_BASE_URL ?? "http://127.0.0.1:3211";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_EMAIL = "direct-upgrade-rendered-creator@qa.invalid";
const QA_PASSWORD = process.env.DIRECT_UPGRADE_RENDERED_QA_PASSWORD ?? "";

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
  viewport: { height: number; width: number },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
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

async function chooseRecipient(page: Page, legend: string, query: string, result: string) {
  const fieldset = page.locator("fieldset").filter({
    has: page.getByText(legend, { exact: true }),
  });
  await expect(fieldset).toHaveCount(1);
  const search = fieldset.getByRole("searchbox", {
    name: "Search by nonprofit name, slug, or EIN",
  });
  await search.fill(query);
  const choice = fieldset.getByRole("option", {
    name: `Select ${result}`,
    exact: true,
  });
  await expect(choice).toBeVisible({ timeout: 20_000 });
  await choice.click();
  await expect(fieldset.getByRole("heading", { name: result, exact: true })).toBeVisible();
}

async function exerciseNoChargeForm(
  context: BrowserContext,
  viewportName: "desktop" | "mobile",
) {
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const sensitiveRequests: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    const url = request.url();
    if (
      /stripe\.com|checkout\.stripe|\/api\/stripe\/|\/api\/connectors\/every-org\//i.test(url)
    ) {
      sensitiveRequests.push(`${request.method()} ${url}`);
    }
  });

  await page.goto("/trades/new?structure=conditional-donation");
  await page.waitForLoadState("networkidle");

  expect(page.url()).toContain("structure=conditional-donation");
  await expect(
    page.getByRole("heading", {
      name: "Turn a planned donation into a larger donation to a more effective recipient.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Commit and publish", { exact: true })).toBeVisible();
  await expect(page.getByText("Authorize and publish", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/No card or bank information is collected now\./)).toBeVisible();

  const creatorAmount = page.locator('input[name="creator_amount"]');
  const matcherAmount = page.locator('input[name="matcher_amount"]');
  await expect(creatorAmount).toHaveValue("10.00");
  await expect(matcherAmount).toHaveValue("10.00");
  await creatorAmount.fill("10.00");
  await matcherAmount.fill("10.00");

  await chooseRecipient(
    page,
    "If nobody matches",
    "Homeward Pet",
    "Homeward Pet Adoption Center",
  );
  await chooseRecipient(
    page,
    "If someone matches",
    "GiveWell Top Charities Fund",
    "GiveWell Top Charities Fund",
  );

  const originalIdentifier = page.locator('input[name="original_recipient_identifier"]');
  const upgradedIdentifier = page.locator('input[name="upgraded_recipient_identifier"]');
  await expect(originalIdentifier).not.toHaveValue("");
  await expect(upgradedIdentifier).not.toHaveValue("");
  expect(await originalIdentifier.inputValue()).not.toBe(await upgradedIdentifier.inputValue());

  await page
    .locator('textarea[name="baseline_details"]')
    .fill(
      "I had budgeted this $10 local-charity donation before opening Moral Trade and planned to complete it this week.",
    );
  await page.locator('input[name="baseline_confirmed"]').check();

  const privacy = page.locator('select[name="privacy_mode"]');
  await expect(privacy).toHaveValue("public");
  await privacy.selectOption("private_until_completed");
  await expect(privacy).toHaveValue("private_until_completed");

  const submit = page.getByRole("button", { name: "Commit and publish", exact: true });
  await expect(submit).toBeEnabled();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(sensitiveRequests).toEqual([]);

  await page.screenshot({
    path: `direct-upgrade-rendered-${viewportName}.png`,
    fullPage: true,
  });

  // Deliberately stop here: no publication, provider checkout, mandate, or payment action.
  await context.close();
}

test.describe("authenticated direct Donation Upgrade no-charge rendered smoke", () => {
  test("fills the exact $10 + $10 local-charity to GiveWell form on desktop and mobile", async ({
    browser,
  }) => {
    test.setTimeout(4 * 60_000);
    test.skip(!QA_PASSWORD, "DIRECT_UPGRADE_RENDERED_QA_PASSWORD is required.");

    const session = await signIn();
    await exerciseNoChargeForm(
      await authenticatedContext(browser, session, { width: 1440, height: 1000 }),
      "desktop",
    );
    await exerciseNoChargeForm(
      await authenticatedContext(browser, session, { width: 390, height: 844 }),
      "mobile",
    );
  });
});
