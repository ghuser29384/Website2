import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type Session,
} from "@supabase/supabase-js";
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
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  providerRequests: string[];
  productionRequests: string[];
};

const diagnostics: Diagnostic[] = [];

function requireEnvironment() {
  if (!BASE_URL || !SUPABASE_URL || !SUPABASE_KEY || !QA_PASSWORD || !BYPASS || !PROD_REF) {
    throw new Error("Hosted ledger UAT environment is incomplete.");
  }
  if (!SUPABASE_URL.includes("hvmxfjjbdcgjjudmthdz") || SUPABASE_URL.includes(PROD_REF)) {
    throw new Error("Hosted ledger UAT refused a non-QA Supabase URL.");
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

function observe(page: Page) {
  const record: Diagnostic = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    providerRequests: [],
    productionRequests: [],
  };
  diagnostics.push(record);
  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(message.text().slice(0, 240));
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message.slice(0, 240)));
  page.on("requestfailed", (request) => record.failedRequests.push(request.url()));
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (PROVIDER_HOST.test(host)) record.providerRequests.push(host);
    if (host.includes(PROD_REF)) record.productionRequests.push(host);
  });
}

async function contextFor(browser: Browser, session?: Session) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
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
    ...(session ? await sessionCookies(session) : []),
  ]);
  return context;
}

async function getState(context: BrowserContext) {
  const response = await context.request.get("/api/mpgf/compacts");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"] ?? "").toMatch(/no-store/i);
  const raw = await response.text();
  expect(raw).not.toMatch(PRIVATE_MARKERS);
  expect(raw).not.toContain(PROD_REF);
  return JSON.parse(raw) as CompactState;
}

async function close(context: BrowserContext | null) {
  if (context) await context.close();
}

test.beforeAll(() => requireEnvironment());

test("member A receives only the complete aggregate and exact shadow amount", async ({ browser }) => {
  const { client, session } = await signIn(EMAILS.memberA);
  let context: BrowserContext | null = null;
  try {
    context = await contextFor(browser, session);
    const state = await getState(context);
    expect(state.available).toBe(true);
    expect(state.moneyMovesOnPageAction).toBe(false);
    expect(state.automaticCollectionEnabled).toBe(false);
    expect(state.obligation).toMatchObject({
      cycleKey: "2026-08",
      coverage: "complete",
      eligibleNetSettledOutflowCents: 12345,
      obligationCents: 1234,
      sourceObservationCount: 1,
    });

    const page = await context.newPage();
    observe(page);
    await page.goto("/mpgf/compacts", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Prior-month transaction coverage" })).toBeVisible();
    await expect(page.getByText("Shadow calculated 10% amount")).toBeVisible();
    await expect(page.getByText("$123.45", { exact: true })).toBeVisible();
    await expect(page.getByText("$12.34", { exact: true })).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(PRIVATE_MARKERS);
    expect(text).not.toContain(FIXTURE_MEMBER_A);
  } finally {
    await close(context);
    await client.auth.signOut();
  }
});

test("other authenticated users cannot read member A aggregate or ledger rows", async ({ browser }) => {
  for (const email of [EMAILS.memberB, EMAILS.outsider]) {
    const { client, session } = await signIn(email);
    let context: BrowserContext | null = null;
    try {
      context = await contextFor(browser, session);
      const state = await getState(context);
      expect(state.moneyMovesOnPageAction).toBe(false);
      expect(state.automaticCollectionEnabled).toBe(false);
      expect(state.obligation.eligibleNetSettledOutflowCents).not.toBe(12345);
      expect(state.obligation.obligationCents).not.toBe(1234);

      const direct = await client
        .from("mpgf_public_goods_outflow_observations")
        .select("id,participant_id,cycle_key")
        .eq("participant_id", FIXTURE_MEMBER_A);
      if (direct.error) {
        expect(direct.error.message).not.toContain(PROD_REF);
      } else {
        expect(direct.data).toEqual([]);
      }
    } finally {
      await close(context);
      await client.auth.signOut();
    }
  }
});

test("signed-out access is fail-closed and reveals no aggregate", async ({ browser }) => {
  let context: BrowserContext | null = null;
  try {
    context = await contextFor(browser);
    const response = await context.request.get("/api/mpgf/compacts");
    expect([401, 403]).toContain(response.status());
    const raw = await response.text();
    expect(raw).not.toMatch(PRIVATE_MARKERS);
    expect(raw).not.toContain(FIXTURE_MEMBER_A);
    expect(raw).not.toContain("12345");
    expect(raw).not.toContain("1234");
  } finally {
    await close(context);
  }
});

test.afterAll(async () => {
  const errors = diagnostics.flatMap((record) => [
    ...record.consoleErrors,
    ...record.pageErrors,
    ...record.failedRequests,
    ...record.providerRequests,
    ...record.productionRequests,
  ]);
  expect(errors).toEqual([]);
});
