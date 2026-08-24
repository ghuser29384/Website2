import { mkdir, writeFile } from "node:fs/promises";

import { createServerClient } from "@supabase/ssr";
import { createClient, type Session } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.COMPACT_UAT_BASE_URL ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const QA_PASSWORD = process.env.COMPACT_UAT_PASSWORD ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const PROD_REF = process.env.FORBIDDEN_PROD_REF ?? "";

const EMAILS = {
  memberA: "compact-uat712-member-a@qa.invalid",
  memberB: "compact-uat712-member-b@qa.invalid",
} as const;

const providerRequests: Array<{ method: string; host: string; path: string }> = [];
const browserEvidence: Record<string, unknown> = {};

function requireEnvironment() {
  if (!BASE_URL || !SUPABASE_URL || !SUPABASE_KEY || !QA_PASSWORD || !BYPASS || !PROD_REF) {
    throw new Error("PR 737 protected UAT environment is incomplete.");
  }
  if (!SUPABASE_URL.includes("hvmxfjjbdcgjjudmthdz") || SUPABASE_URL.includes(PROD_REF)) {
    throw new Error("PR 737 protected UAT refused a non-QA Supabase URL.");
  }
}

async function signIn(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: QA_PASSWORD });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed for fixture role: ${error?.message ?? "no session"}`);
  }
  return data.session;
}

async function sessionCookies(session: Session) {
  const captured: Array<{ name: string; value: string }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(values) {
        captured.splice(0, captured.length, ...values.map(({ name, value }) => ({ name, value })));
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
    secure: true,
    sameSite: "Lax" as const,
  }));
}

async function makeContext(
  browser: Browser,
  viewport: { width: number; height: number },
  session?: Session,
) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const cookies = [
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    },
    {
      name: "mt_analytics_opt_out",
      value: "1",
      url: BASE_URL,
      httpOnly: false,
      secure: true,
      sameSite: "Lax" as const,
    },
  ];
  if (session) cookies.push(...(await sessionCookies(session)));
  await context.addCookies(cookies);
  return context;
}

function observe(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 240));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 240)));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    failedRequests.push(`${request.method()} ${url.hostname}${url.pathname}`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname.includes(PROD_REF)) throw new Error("Production Supabase request observed.");
    if (/(?:stripe|every\.org|paypal|adyen|braintree|squareup)/i.test(url.hostname)) {
      providerRequests.push({ method: request.method(), host: url.hostname, path: url.pathname });
    }
  });
  return { consoleErrors, pageErrors, failedRequests };
}

async function load(page: Page) {
  const response = await page.goto("/mpgf/compacts", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);
  await page.getByRole("heading", {
    level: 1,
    name: "Coordinate by constitution, not taxation.",
  }).waitFor();
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Prior-month transaction coverage" }),
  });
}

async function state(page: Page) {
  const response = await page.context().request.get("/api/mpgf/compacts");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"] ?? "").toMatch(/no-store/i);
  return await response.json() as {
    available: boolean;
    source: string;
    moneyMovesOnPageAction: boolean;
    automaticCollectionEnabled: boolean;
    obligation: {
      cycleKey: string;
      coverage: string;
      coverageReason: string;
      eligibleNetSettledOutflowCents: number | null;
      obligationCents: number | null;
      sourceObservationCount: number;
    };
  };
}

async function close(context: BrowserContext) {
  await context.close();
}

test.beforeAll(() => requireEnvironment());

test("exact candidate renders complete and fail-closed authoritative outflow states without provider activity", async ({ browser }) => {
  await mkdir("test-results/pr737-ledger-uat", { recursive: true });

  const signedOut = await makeContext(browser, { width: 1366, height: 900 });
  try {
    const page = await signedOut.newPage();
    const diagnostics = observe(page);
    const section = await load(page);
    await expect(section.getByText("Coverage", { exact: true })).toBeVisible();
    await expect(section.getByText("$160.00", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: "test-results/pr737-ledger-uat/signed-out.png", fullPage: true });
    expect(diagnostics.pageErrors).toEqual([]);
    browserEvidence.signedOut = { privateCompleteAmountVisible: false };
  } finally {
    await close(signedOut);
  }

  const memberASession = await signIn(EMAILS.memberA);
  const memberA = await makeContext(browser, { width: 1366, height: 900 }, memberASession);
  try {
    const page = await memberA.newPage();
    const diagnostics = observe(page);
    const section = await load(page);
    const result = await state(page);
    expect(result.available).toBe(true);
    expect(result.source).toBe("database");
    expect(result.moneyMovesOnPageAction).toBe(false);
    expect(result.automaticCollectionEnabled).toBe(false);
    expect(result.obligation).toMatchObject({
      cycleKey: "2026-08",
      coverage: "complete",
      eligibleNetSettledOutflowCents: 16000,
      obligationCents: 1600,
    });
    expect(result.obligation.sourceObservationCount).toBeGreaterThan(0);
    await expect(section.getByText("complete", { exact: true })).toBeVisible();
    await expect(section.getByText("$160.00", { exact: true })).toBeVisible();
    await expect(section.getByText("$16.00", { exact: true })).toBeVisible();
    await expect(section).toContainText("shadow calculation only");
    await expect(section).toContainText("not a charge, collection, legal debt, mandate, or settlement");
    await page.screenshot({ path: "test-results/pr737-ledger-uat/member-a-complete.png", fullPage: true });
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
    browserEvidence.memberA = result.obligation;
  } finally {
    await close(memberA);
  }

  const memberBSession = await signIn(EMAILS.memberB);
  const memberB = await makeContext(browser, { width: 390, height: 844 }, memberBSession);
  try {
    const page = await memberB.newPage();
    const diagnostics = observe(page);
    const section = await load(page);
    const result = await state(page);
    expect(result.available).toBe(true);
    expect(result.source).toBe("database");
    expect(result.moneyMovesOnPageAction).toBe(false);
    expect(result.automaticCollectionEnabled).toBe(false);
    expect(result.obligation.cycleKey).toBe("2026-08");
    expect(result.obligation.coverage).toBe("partial");
    expect(result.obligation.eligibleNetSettledOutflowCents).toBeNull();
    expect(result.obligation.obligationCents).toBeNull();
    expect(result.obligation.coverageReason).toMatch(/incomplete/i);
    await expect(section.getByText("partial", { exact: true })).toBeVisible();
    await expect(section.getByText("Unavailable", { exact: true })).toHaveCount(2);
    await expect(section.getByText("$160.00", { exact: true })).toHaveCount(0);
    await expect(section.getByText("$16.00", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: "test-results/pr737-ledger-uat/member-b-partial-mobile.png", fullPage: true });
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
    browserEvidence.memberB = result.obligation;
  } finally {
    await close(memberB);
  }

  expect(providerRequests).toEqual([]);
  browserEvidence.providerRequests = providerRequests;
  await writeFile(
    "test-results/pr737-ledger-uat/browser-evidence.json",
    `${JSON.stringify(browserEvidence, null, 2)}\n`,
  );
});
