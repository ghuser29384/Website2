import { createHmac } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

const BASE_URL =
  process.env.PROVIDER_REFUND_RENDERED_BASE_URL ?? "http://127.0.0.1:3214";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_EMAIL = process.env.PROVIDER_REFUND_RENDERED_QA_EMAIL ?? "";
const QA_PASSWORD = process.env.PROVIDER_REFUND_RENDERED_QA_PASSWORD ?? "";
const QA_OFFER_ID = "d7000000-0000-4000-8000-000000000007";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret: string, offset = 0) {
  const counter = BigInt(Math.floor(Date.now() / 30_000) + offset);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBytes)
    .digest();
  const position = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[position] & 0x7f) << 24) |
    ((digest[position + 1] & 0xff) << 16) |
    ((digest[position + 2] & 0xff) << 8) |
    (digest[position + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

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
  if (!QA_EMAIL || !QA_PASSWORD) {
    throw new Error(
      "PROVIDER_REFUND_RENDERED_QA_EMAIL and PROVIDER_REFUND_RENDERED_QA_PASSWORD are required.",
    );
  }
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(
      `Isolated provider-refund QA sign-in failed: ${error?.message ?? "no session"}`,
    );
  }
  return { client, session: data.session };
}

async function elevateWithTotp(client: SupabaseClient, aal1Session: Session) {
  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `provider-refund-rendered-${Date.now()}`,
  });
  if (enrollmentError || !enrollment?.totp?.secret) {
    throw new Error(
      `TOTP enrollment failed: ${enrollmentError?.message ?? "missing secret"}`,
    );
  }

  let lastError = "";
  for (const offset of [0, -1, 1]) {
    const { data, error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code: totpCode(enrollment.totp.secret, offset),
    });
    if (data && !error) {
      const { data: sessionData, error: sessionError } =
        await client.auth.getSession();
      if (!sessionError && sessionData.session) {
        return { aal1Session, session: sessionData.session };
      }
    }
    lastError = error?.message ?? "missing AAL2 session";
  }
  throw new Error(`TOTP verification failed: ${lastError}`);
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

function installReadOnlyGuard(page: Page) {
  const prohibitedRequests: string[] = [];
  const suppressedTelemetry: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const provider = /(^|\.)(every\.org|stripe\.com)$/i.test(url.hostname);
    if (
      method === "POST" &&
      url.origin === new URL(BASE_URL).origin &&
      url.pathname === "/api/funnel-events"
    ) {
      suppressedTelemetry.push(`${method} ${url.pathname}`);
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (!SAFE_METHODS.has(method) || provider) {
      prohibitedRequests.push(`${method} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  return {
    assertClean() {
      expect(prohibitedRequests).toEqual([]);
      expect(
        suppressedTelemetry.every(
          (entry) => entry === "POST /api/funnel-events",
        ),
      ).toBe(true);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    },
  };
}

async function screenshotLocator(locator: Locator, path: string) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path });
}

async function exerciseAdmin(
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
) {
  const page = await context.newPage();
  const guard = installReadOnlyGuard(page);
  await page.goto("/admin/donation-upgrades", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: "Inspect confirmations, provider refunds, mismatches, and current credit.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Operator access blocked.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Provider refunds", { exact: true })).toBeVisible();
  await expect(page.getByText("Post-completion exceptions", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Record an authoritative full Every.org refund without rewriting history.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('input[name="provider_refunded_at"]')).toHaveCount(1);
  await expect(page.locator('select[name="evidence_source"]')).toHaveCount(1);
  await expect(page.locator('input[name="evidence_reference"]')).toHaveCount(1);
  await expect(page.locator('input[name="authority_confirmation"]')).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Record provider refund", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Original confirmation remains; current credit excludes the reversal.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Moral Trade did not process or issue the refund.", { exact: false })).toBeVisible();
  await expect(page.getByText("Refund QA", { exact: false })).toHaveCount(0);
  for (const forbidden of [
    'input[name="donor_name"]',
    'input[name="donor_email"]',
    'input[name="card_number"]',
    'input[name="bank_account"]',
    'textarea[name="raw_webhook_body"]',
  ]) {
    await expect(page.locator(forbidden)).toHaveCount(0);
  }
  await expectResponsive(page);
  await page.screenshot({
    fullPage: true,
    path: `output/playwright/provider-refund/${viewport.name}-admin-console-full.png`,
  });
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Record provider refund", exact: true }),
  });
  await expect(form).toHaveCount(1);
  await screenshotLocator(
    form,
    `output/playwright/provider-refund/${viewport.name}-refund-form.png`,
  );
  guard.assertClean();
  await page.close();
}

async function exerciseProviderStatus(
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
) {
  const page = await context.newPage();
  const guard = installReadOnlyGuard(page);
  await page.goto(`/donation-upgrades/${QA_OFFER_ID}/provider-status`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: "A later Every.org refund changed current credited impact.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Historical confirmation and current unreversed value remain separately reconstructible.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Historical confirmed gross", { exact: true })).toBeVisible();
  await expect(page.getByText("Historical confirmed net", { exact: true })).toBeVisible();
  await expect(page.getByText("Current unreversed gross", { exact: true })).toBeVisible();
  await expect(page.getByText("Current unreversed net credit", { exact: true })).toBeVisible();
  await expect(page.getByText("Current incremental net", { exact: true })).toBeVisible();
  await expect(page.getByText("Current redirected net", { exact: true })).toBeVisible();
  await expect(page.getByText("$25.00", { exact: true })).toBeVisible();
  await expect(page.getByText("$24.25", { exact: true })).toBeVisible();
  await expect(page.getByText("$10.00", { exact: true })).toBeVisible();
  await expect(page.getByText("$9.70", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
  await expect(page.getByText("Provider refund recorded", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(
      "A provider refund is not participant default, failed donation, cancellation, or Moral Trade action.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/does not establish what a participant otherwise would have done/),
  ).toBeVisible();
  await expect(page.getByText(/partnered with Every\.org/i)).toHaveCount(0);
  await expect(page.getByText(/endorsed by Every\.org/i)).toHaveCount(0);
  await expectResponsive(page);
  await page.screenshot({
    fullPage: true,
    path: `output/playwright/provider-refund/${viewport.name}-provider-status-full.png`,
  });
  guard.assertClean();
  await page.close();
}

test("AAL2 administrator and participant-safe provider-refund views are read-only, truthful, private, and responsive", async ({
  browser,
}) => {
  test.setTimeout(4 * 60_000);
  const auth = await signIn();
  const elevated = await elevateWithTotp(auth.client, auth.session);

  const aal1Context = await authenticatedContext(browser, elevated.aal1Session, {
    width: 1280,
    height: 900,
  });
  try {
    const aal1Page = await aal1Context.newPage();
    const guard = installReadOnlyGuard(aal1Page);
    await aal1Page.goto("/admin/donation-upgrades", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      aal1Page.getByText("Operator access blocked.", { exact: true }),
    ).toBeVisible();
    await expect(
      aal1Page.getByRole("button", {
        name: "Record provider refund",
        exact: true,
      }),
    ).toHaveCount(0);
    guard.assertClean();
    await aal1Page.close();
  } finally {
    await aal1Context.close();
  }

  for (const viewport of VIEWPORTS) {
    const context = await authenticatedContext(browser, elevated.session, viewport);
    try {
      await exerciseAdmin(context, viewport);
      await exerciseProviderStatus(context, viewport);
    } finally {
      await context.close();
    }
  }
});
