import { mkdir } from "node:fs/promises";

import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

const BASE_URL = process.env.COMPACT_UAT_BASE_URL ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const QA_PASSWORD = process.env.COMPACT_UAT_PASSWORD ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const PROD_REF = process.env.FORBIDDEN_PROD_REF ?? "";
const PHASE = process.env.LEDGER_PHASE ?? "unknown";
const EXPECTED_COVERAGE = process.env.EXPECTED_COVERAGE ?? "";
const EXPECTED_SOURCE_COUNT = Number(process.env.EXPECTED_SOURCE_COUNT ?? "NaN");
const EXPECTED_ELIGIBLE = nullableInteger(process.env.EXPECTED_ELIGIBLE_CENTS);
const EXPECTED_OBLIGATION = nullableInteger(process.env.EXPECTED_OBLIGATION_CENTS);

const EMAILS = {
  memberA: "compact-uat712-member-a@qa.invalid",
  memberB: "compact-uat712-member-b@qa.invalid",
  outsider: "compact-uat712-outsider@qa.invalid",
} as const;

const FIXTURE_MEMBER_A = "712a0000-0000-4000-8000-000000000001";
const PRIVATE_MARKERS =
  /source_record_key|canonical_event_hash|source_watermark|provider_reference|adapter_key|ingest_batch|hosted-ledger-payment-a/i;
const PROVIDER_HOST = /(?:stripe|every\.org|paypal|adyen|braintree|squareup)/i;

type CompactState = {
  available: boolean;
  obligation: {
    cycleKey: string;
    coverage: string;
    eligibleNetSettledOutflowCents: number | null;
    obligationCents: number | null;
    sourceObservationCount: number;
  };
  moneyMovesOnPageAction: boolean;
  automaticCollectionEnabled: boolean;
};

type Diagnostic = {
  label: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[];
  failedRequests: string[];
  providerRequests: string[];
  productionRequests: string[];
};

const diagnostics: Diagnostic[] = [];

function nullableInteger(raw: string | undefined): number | null {
  if (raw === undefined || raw === "null") return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid expected integer: ${raw}`);
  }
  return parsed;
}

function requireEnvironment() {
  if (
    !BASE_URL ||
    !SUPABASE_URL ||
    !SUPABASE_KEY ||
    !QA_PASSWORD ||
    !BYPASS ||
    !PROD_REF ||
    !PHASE ||
    !EXPECTED_COVERAGE ||
    !Number.isSafeInteger(EXPECTED_SOURCE_COUNT)
  ) {
    throw new Error("Hosted ledger phase environment is incomplete.");
  }
  if (!SUPABASE_URL.includes("hvmxfjjbdcgjjudmthdz") || SUPABASE_URL.includes(PROD_REF)) {
    throw new Error("Hosted ledger phase refused a non-QA Supabase URL.");
  }
}

function authClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function signIn(email: string) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Fixture sign-in failed: ${error?.message ?? "no session"}`);
  }
  return { client, session: data.session };
}

async function sessionCookies(session: Session) {
  const captured: Array<{ name: string; value: string }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => [],
      setAll(values) {
        captured.splice(
          0,
          captured.length,
          ...values.map(({ name, value }) => ({ name, value })),
        );
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

function viewportFor(testInfo: TestInfo) {
  const viewport = testInfo.project.use.viewport;
  if (!viewport || typeof viewport.width !== "number" || typeof viewport.height !== "number") {
    throw new Error("A concrete viewport is required for hosted ledger evidence.");
  }
  return { width: viewport.width, height: viewport.height };
}

async function contextFor(
  browser: Browser,
  testInfo: TestInfo,
  session?: Session,
) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: viewportFor(testInfo),
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "mt_analytics_opt_out",
      value: "1",
      url: BASE_URL,
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
    ...(session ? await sessionCookies(session) : []),
  ]);
  return context;
}

function observe(page: Page, label: string) {
  const record: Diagnostic = {
    label,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    providerRequests: [],
    productionRequests: [],
  };
  diagnostics.push(record);
  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(message.text().slice(0, 240));
    if (message.type() === "warning") record.consoleWarnings.push(message.text().slice(0, 240));
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message.slice(0, 240)));
  page.on("requestfailed", (request) => record.failedRequests.push(request.url()));
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (PROVIDER_HOST.test(host)) record.providerRequests.push(host);
    if (host.includes(PROD_REF)) record.productionRequests.push(host);
  });
}

async function getState(context: BrowserContext) {
  const response = await context.request.get("/api/mpgf/compacts");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"] ?? "").toMatch(/no-store/i);
  const raw = await response.text();
  expect(raw).not.toMatch(PRIVATE_MARKERS);
  expect(raw).not.toContain(PROD_REF);
  expect(raw).not.toContain(FIXTURE_MEMBER_A);
  return JSON.parse(raw) as CompactState;
}

async function close(context: BrowserContext | null) {
  if (context) await context.close();
}

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

async function assertRenderedContract(page: Page, testInfo: TestInfo) {
  const response = await page.goto("/mpgf/compacts", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"] ?? "").toMatch(/private|no-store/i);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Prior-month transaction coverage" })).toBeVisible();
  await expect(page.getByText("Shadow calculated 10% amount")).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(PRIVATE_MARKERS);
  expect(text).not.toContain(FIXTURE_MEMBER_A);
  expect(text).not.toContain(PROD_REF);

  if (EXPECTED_ELIGIBLE === null || EXPECTED_OBLIGATION === null) {
    await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();
  } else {
    await expect(page.getByText(usd(EXPECTED_ELIGIBLE), { exact: true })).toBeVisible();
    await expect(page.getByText(usd(EXPECTED_OBLIGATION), { exact: true })).toBeVisible();
  }

  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    h1Count: document.querySelectorAll("h1").length,
    overlayCount: document.querySelectorAll(
      "nextjs-portal, [data-nextjs-dialog-overlay], [data-next-badge-root]",
    ).length,
  }));
  expect(layout.h1Count).toBe(1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.overlayCount).toBe(0);

  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => Boolean(document.activeElement && document.activeElement !== document.body)),
  ).toBe(true);

  const output = `test-results/pr737-ledger-phase-screenshots/${PHASE}`;
  await mkdir(output, { recursive: true });
  await page.screenshot({
    path: `${output}/${testInfo.project.name}.png`,
    fullPage: true,
  });
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => requireEnvironment());

test("member A receives only the expected aggregate and shadow state", async ({ browser }, testInfo) => {
  const { client, session } = await signIn(EMAILS.memberA);
  let context: BrowserContext | null = null;
  try {
    context = await contextFor(browser, testInfo, session);
    const state = await getState(context);
    expect(state.available).toBe(true);
    expect(state.moneyMovesOnPageAction).toBe(false);
    expect(state.automaticCollectionEnabled).toBe(false);
    expect(state.obligation).toMatchObject({
      cycleKey: "2026-08",
      coverage: EXPECTED_COVERAGE,
      eligibleNetSettledOutflowCents: EXPECTED_ELIGIBLE,
      obligationCents: EXPECTED_OBLIGATION,
      sourceObservationCount: EXPECTED_SOURCE_COUNT,
    });

    const page = await context.newPage();
    observe(page, `${PHASE}-${testInfo.project.name}-member-a`);
    await assertRenderedContract(page, testInfo);
  } finally {
    await close(context);
    await client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
});

test("other authenticated users cannot read member A ledger state", async ({ browser }, testInfo) => {
  for (const email of [EMAILS.memberB, EMAILS.outsider]) {
    const { client, session } = await signIn(email);
    let context: BrowserContext | null = null;
    try {
      context = await contextFor(browser, testInfo, session);
      const state = await getState(context);
      expect(state.moneyMovesOnPageAction).toBe(false);
      expect(state.automaticCollectionEnabled).toBe(false);
      expect(state.obligation.sourceObservationCount).toBe(0);
      if (EXPECTED_ELIGIBLE !== null) {
        expect(state.obligation.eligibleNetSettledOutflowCents).not.toBe(EXPECTED_ELIGIBLE);
      }
      if (EXPECTED_OBLIGATION !== null) {
        expect(state.obligation.obligationCents).not.toBe(EXPECTED_OBLIGATION);
      }

      const direct = await client
        .from("mpgf_public_goods_outflow_observations")
        .select("id,participant_id,cycle_key")
        .eq("participant_id", FIXTURE_MEMBER_A);
      if (direct.error) {
        expect(direct.error.message).not.toContain(PROD_REF);
        expect(direct.error.message).not.toMatch(PRIVATE_MARKERS);
      } else {
        expect(direct.data).toEqual([]);
      }
    } finally {
      await close(context);
      await client.auth.signOut({ scope: "global" }).catch(() => undefined);
    }
  }
});

test("signed-out access is fail-closed and reveals no aggregate", async ({ browser }, testInfo) => {
  let context: BrowserContext | null = null;
  try {
    context = await contextFor(browser, testInfo);
    const response = await context.request.get("/api/mpgf/compacts");
    expect([401, 403]).toContain(response.status());
    const raw = await response.text();
    expect(raw).not.toMatch(PRIVATE_MARKERS);
    expect(raw).not.toContain(FIXTURE_MEMBER_A);
    expect(raw).not.toContain(PROD_REF);
    if (EXPECTED_ELIGIBLE !== null) expect(raw).not.toContain(String(EXPECTED_ELIGIBLE));
    if (EXPECTED_OBLIGATION !== null) expect(raw).not.toContain(String(EXPECTED_OBLIGATION));
  } finally {
    await close(context);
  }
});

test.afterAll(() => {
  const errors = diagnostics.flatMap((record) => [
    ...record.consoleErrors.map((value) => `${record.label}:console:${value}`),
    ...record.consoleWarnings.map((value) => `${record.label}:warning:${value}`),
    ...record.pageErrors.map((value) => `${record.label}:page:${value}`),
    ...record.failedRequests.map((value) => `${record.label}:request:${value}`),
    ...record.providerRequests.map((value) => `${record.label}:provider:${value}`),
    ...record.productionRequests.map((value) => `${record.label}:production:${value}`),
  ]);
  expect(errors).toEqual([]);
});
