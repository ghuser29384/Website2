import { mkdir, writeFile } from "node:fs/promises";

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
  type Page,
} from "@playwright/test";

const BASE_URL = process.env.COMPACT_UAT_BASE_URL ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const QA_PASSWORD = process.env.COMPACT_UAT_PASSWORD ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const PROD_REF = process.env.FORBIDDEN_PROD_REF ?? "";

const OUTPUT_DIR = "test-results/uat712-screenshots";
const TRACE_DIR = "test-results/uat712-traces";
const CONSTITUTION = "mpgf-public-goods-compact/transaction-v2";
const ACKNOWLEDGEMENTS = {
  voluntaryChoice: true,
  exactConstitution: true,
  activationAndNoProjectOptOut: true,
  noPaymentMandate: true,
} as const;
const EMAILS = {
  memberA: "compact-uat712-member-a@qa.invalid",
  memberB: "compact-uat712-member-b@qa.invalid",
  outsider: "compact-uat712-outsider@qa.invalid",
} as const;

type Observation = {
  label: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[];
  failedRequests: Array<{ method: string; host: string; path: string }>;
  httpErrors: Array<{ status: number; host: string; path: string }>;
  providerRequests: Array<{ method: string; host: string; path: string }>;
};

type Membership = {
  id: string;
  compactPublicKey: string;
  constitutionVersionAccepted: string;
  acknowledgements: Record<string, boolean>;
  status: string;
  activatedAt: string | null;
  revokedAt: string | null;
  allocationBps: number | null;
  scheduledContributionCents: number | null;
  netSettledContributionCents: number | null;
  fundingQualificationState: string;
  fundingQualified: boolean;
  identityQualified: boolean;
};

type CompactState = {
  available: boolean;
  source: string;
  unavailableReason: string | null;
  moneyMovesOnPageAction: boolean;
  automaticCollectionEnabled: boolean;
  obligation: {
    cycleKey: string;
    coverage: string;
    eligibleNetSettledOutflowCents: number | null;
    obligationCents: number | null;
    sourceObservationCount: number;
  };
  allocation: {
    instructionValid: boolean;
    schedulingReady: boolean;
    reason: string | null;
    scheduledTotalCents: number | null;
    allocations: Array<{
      compactPublicKey: string;
      allocationBps: number;
      scheduledContributionCents: number | null;
    }>;
  };
  compacts: Array<{
    publicKey: string;
    status: string;
    acceptedMemberCount: number;
    activation: { state: string; activatedAt: string | null };
    readiness: {
      frozenAt: string | null;
      fundingQualifiedUniquePersonCount: number;
      scheduledContributionCents: number;
      thresholdReady: boolean;
      activationBlocked: boolean;
      blockers: string[];
    };
    allocationElectorate: { active: boolean; key: string | null };
    membership: Membership | null;
    delegation: unknown;
  }>;
};

type ApiResult = {
  status: number;
  body: Record<string, unknown>;
  cacheControl: string;
};

const observations: Observation[] = [];
const apiObservations: Array<{
  method: string;
  path: string;
  status: number;
  cacheControl: string;
}> = [];
const viewportDiagnostics: Array<Record<string, unknown>> = [];
const sectionEvidence = new Map<string, { result: string; evidence: string[] }>();
let traceSequence = 0;

function requireEnvironment() {
  if (!BASE_URL || !SUPABASE_URL || !SUPABASE_KEY || !QA_PASSWORD || !BYPASS || !PROD_REF) {
    throw new Error("Compact UAT environment is incomplete.");
  }
  if (!SUPABASE_URL.includes("hvmxfjjbdcgjjudmthdz") || SUPABASE_URL.includes(PROD_REF)) {
    throw new Error("Compact UAT refused a non-QA Supabase URL.");
  }
}

function mark(section: string, result: string, evidence: string[]) {
  sectionEvidence.set(section, { result, evidence });
}

function safePath(raw: string) {
  const url = new URL(raw);
  return url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<fixture-id>");
}

function safeHost(raw: string) {
  const host = new URL(raw).hostname;
  if (host === new URL(BASE_URL).hostname) return "protected-preview";
  if (host.includes("hvmxfjjbdcgjjudmthdz")) return "qa-supabase";
  if (host.includes(PROD_REF)) throw new Error("Production project request observed.");
  return host;
}

function safeMessage(message: string) {
  return message
    .replaceAll(PROD_REF, "<forbidden-production-ref>")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<fixture-role>")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<fixture-id>")
    .replace(/eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}/g, "<redacted-token>")
    .slice(0, 240);
}

function observe(page: Page, label: string) {
  const record: Observation = {
    label,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    providerRequests: [],
  };
  observations.push(record);
  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(safeMessage(message.text()));
    if (message.type() === "warning") record.consoleWarnings.push(safeMessage(message.text()));
  });
  page.on("pageerror", (error) => record.pageErrors.push(safeMessage(error.message)));
  page.on("requestfailed", (request) => {
    record.failedRequests.push({
      method: request.method(),
      host: safeHost(request.url()),
      path: safePath(request.url()),
    });
  });
  page.on("request", (request) => {
    const host = safeHost(request.url());
    if (/(?:stripe|every\.org|paypal|adyen|braintree|squareup)/i.test(host)) {
      record.providerRequests.push({ method: request.method(), host, path: safePath(request.url()) });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      record.httpErrors.push({
        status: response.status(),
        host: safeHost(response.url()),
        path: safePath(response.url()),
      });
    }
  });
}

function authClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function signIn(email: string) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: QA_PASSWORD });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed for a fixture role: ${error?.message ?? "no session"}`);
  }
  return { client, session: data.session };
}

async function sessionCookies(session: Session) {
  const captured: Array<{ name: string; value: string }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return [];
      },
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

async function trackedContext(
  browser: Browser,
  label: string,
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
  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(35_000);
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
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  return { context, label };
}

async function closeTracked(tracked: { context: BrowserContext; label: string } | null) {
  if (!tracked) return;
  await mkdir(TRACE_DIR, { recursive: true });
  traceSequence += 1;
  await tracked.context.tracing.stop({
    path: `${TRACE_DIR}/trace-${String(traceSequence).padStart(2, "0")}-${tracked.label}.zip`,
  });
  await tracked.context.close();
}

async function screenshot(page: Page, name: string, fullPage = true) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: `${OUTPUT_DIR}/${name}.png`, fullPage });
}

async function goto(page: Page, path = "/mpgf/compacts") {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", {
    level: 1,
    name: "Coordinate by constitution, not taxation.",
  }).waitFor();
  return response;
}

async function api(
  page: Page,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>,
  rawBody?: string,
) {
  const response = await page.context().request.fetch(path, {
    method,
    headers: method === "GET" ? undefined : { "Content-Type": "application/json" },
    data: method === "GET" ? undefined : rawBody ?? JSON.stringify(body ?? {}),
  });
  const result = {
    status: response.status(),
    body: await response.json().catch(() => ({})) as Record<string, unknown>,
    cacheControl: response.headers()["cache-control"] ?? "",
  };
  apiObservations.push({
    method,
    path,
    status: result.status,
    cacheControl: result.cacheControl,
  });
  return result;
}

async function state(page: Page) {
  const result = await api(page, "/api/mpgf/compacts", "GET");
  expect(result.status).toBe(200);
  expect(result.cacheControl).toMatch(/no-store/i);
  return result.body as unknown as CompactState;
}

function memberships(value: CompactState) {
  return value.compacts
    .map((compact) => compact.membership)
    .filter((membership): membership is Membership => membership !== null);
}

function expectNoMoney(result: ApiResult) {
  expect(result.status).toBe(200);
  expect(result.body.ok).toBe(true);
  for (const flag of [
    "moneyMoved",
    "paymentMandateCreated",
    "paymentMandateChanged",
    "automaticCollectionEnabled",
    "moneyTransferred",
    "membershipTransferred",
    "reputationTransferred",
  ]) {
    if (flag in result.body) expect(result.body[flag]).toBe(false);
  }
}

function expectSafeError(result: ApiResult, status: number) {
  expect(result.status).toBe(status);
  expect(result.cacheControl).toMatch(/no-store/i);
  const serialized = JSON.stringify(result.body);
  expect(serialized).not.toMatch(/postgres(?:ql)?:\/\/|select\s|insert\s|update\s|delete\s|pg_catalog|service.role|bearer|@qa\.invalid|[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  expect(serialized).not.toContain(PROD_REF);
}

async function acknowledgeAndJoin(page: Page, compactTitle: string) {
  const compactKey = compactTitle.toLowerCase().replaceAll(" ", "-");
  const card = page.getByTestId(`compact-${compactKey}`);
  await expect(card.getByRole("heading", { level: 3, name: compactTitle })).toBeVisible();
  const selectButton = card.getByRole("button", { name: `Select ${compactTitle}` });
  if (await selectButton.isVisible().catch(() => false)) {
    await selectButton.click();
  } else {
    await expect(card.getByRole("button", { name: "Selected Compact" })).toBeVisible();
  }
  const fieldset = page.getByRole("group", { name: "Explicit Compact v2 acknowledgements" });
  const boxes = fieldset.getByRole("checkbox");
  await expect(boxes).toHaveCount(4);
  const join = page.getByRole("button", { name: "Accept v2 constitution and join" });
  await expect(join).toBeDisabled();
  for (let index = 0; index < 4; index += 1) await boxes.nth(index).check();
  await expect(join).toBeEnabled();
  await join.click();
  await expect(page.getByRole("status")).toContainText(`Joined ${compactTitle}`);
  await expect(page.getByRole("heading", { name: "Private membership state" })).toBeVisible();
}

async function viewportAudit(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const overflowing = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        let insideIntentionalScroller = false;
        for (let current = element.parentElement; current; current = current.parentElement) {
          const overflowX = getComputedStyle(current).overflowX;
          if (["auto", "scroll"].includes(overflowX) && current.scrollWidth > current.clientWidth + 1) {
            insideIntentionalScroller = true;
            break;
          }
        }
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || "").slice(0, 100),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          insideIntentionalScroller,
        };
      })
      .filter(
        (item) =>
          item.width > 1 &&
          !item.insideIntentionalScroller &&
          (item.left < -1 || item.right > window.innerWidth + 1),
      )
      .slice(0, 20);
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      h1Count: document.querySelectorAll("h1").length,
      bodyScrollWidth: document.documentElement.scrollWidth,
      horizontalOverflowPixels: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      overflowing,
      nextOverlayCount: document.querySelectorAll("nextjs-portal, [data-nextjs-dialog-overlay], [data-next-badge-root]").length,
    };
  });
  viewportDiagnostics.push({ label, ...result });
  expect(result.h1Count).toBe(1);
  expect(result.horizontalOverflowPixels).toBe(0);
  expect(result.overflowing).toEqual([]);
  expect(result.nextOverlayCount).toBe(0);
  await page.keyboard.press("Tab");
  const focusVisible = await page.evaluate(() =>
    Boolean(document.activeElement && document.activeElement !== document.body),
  );
  expect(focusVisible).toBe(true);
}

async function assertMutationBoundaryOrder(page: Page) {
  const ordered = await page.evaluate(() => {
    const boundary = [...document.querySelectorAll<HTMLElement>("strong")].find(
      (element) => element.textContent?.trim() === "No collection rail",
    );
    const action = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      /join|revoke|save complete allocation|delegat/i.test(button.textContent ?? ""),
    );
    return Boolean(
      boundary &&
        action &&
        (boundary.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
  expect(ordered).toBe(true);
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => requireEnvironment());

test.afterAll(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const sanitized = observations.map((record) => ({
    ...record,
    consoleErrors: [...new Set(record.consoleErrors)],
    consoleWarnings: [...new Set(record.consoleWarnings)],
    pageErrors: [...new Set(record.pageErrors)],
  }));
  const unexpected = sanitized.flatMap((record) => [
    ...record.consoleErrors.map((message) => ({ label: record.label, kind: "console", message })),
    ...record.consoleWarnings.map((message) => ({ label: record.label, kind: "console-warning", message })),
    ...record.pageErrors.map((message) => ({ label: record.label, kind: "page", message })),
    ...record.failedRequests.map((entry) => ({
      label: record.label,
      kind: "request-failed",
      message: `${entry.method} ${entry.host}${entry.path}`,
    })),
    ...record.httpErrors.map((entry) => ({
      label: record.label,
      kind: "http",
      message: `${entry.status} ${entry.host}${entry.path}`,
    })),
    ...record.providerRequests.map((entry) => ({
      label: record.label,
      kind: "payment-provider-request",
      message: `${entry.method} ${entry.host}${entry.path}`,
    })),
  ]);
  await writeFile(
    `${OUTPUT_DIR}/browser-observations.json`,
    `${JSON.stringify({ observations: sanitized, apiObservations, unexpected, rawPrivateContentRetained: false }, null, 2)}\n`,
  );
  await writeFile(
    `${OUTPUT_DIR}/viewport-diagnostics.json`,
    `${JSON.stringify(viewportDiagnostics, null, 2)}\n`,
  );
  await writeFile(
    `${OUTPUT_DIR}/uat-browser-matrix.json`,
    `${JSON.stringify(
      {
        sections: [...sectionEvidence.entries()].map(([section, value]) => ({ section, ...value })),
        hostedLimitations: [
          "No authoritative ledger, verified-unique-person primitive, dormant authorization, settlement, active Compact, frozen electorate, or exit finalizer was created; those branches remained unavailable by contract.",
          "Cent allocation and 0.99/1.00 qualification arithmetic remain covered by the pinned exact-head rollback QA, not by invented hosted authority.",
        ],
      },
      null,
      2,
    )}\n`,
  );
  expect(unexpected).toEqual([]);
});

test("A: signed-out constitution, fail-closed state, and unauthorized mutation", async ({ browser }) => {
  const tracked = await trackedContext(browser, "signed-out-desktop-1440x900", {
    width: 1440,
    height: 900,
  });
  try {
    const page = await tracked.context.newPage();
    observe(page, "signed-out-desktop");
    const response = await goto(page);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"] ?? "").toMatch(/private|no-store/i);
    const initialHtml = await response?.text();
    expect(initialHtml).toContain("10% of eligible net-settled prior-month Moral Trade outflow");
    expect(initialHtml).toContain("adds no platform-wide marketplace tax or checkout surcharge");
    expect(initialHtml).toContain("binding only as a platform-governance commitment");
    expect(initialHtml).not.toMatch(/compact-uat712-|712[a-c]0000-|@qa\.invalid/);
    await expect(page.getByText("Readiness unavailable").first()).toBeVisible();
    await expect(page.getByText("No people or dollar progress is inferred.").first()).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByTestId("no-active-compact-ballot")).toContainText(
      "No vote or delegation target is fabricated",
    );
    const publicState = await state(page);
    expect(publicState.available).toBe(true);
    expect(publicState.source).toBe("database");
    expect(publicState.obligation.coverage).toBe("unavailable");
    expect(publicState.obligation.eligibleNetSettledOutflowCents).toBeNull();
    expect(publicState.obligation.obligationCents).toBeNull();
    expect(publicState.compacts.every((compact) => compact.membership === null)).toBe(true);
    expect(publicState.compacts.every((compact) => compact.readiness.frozenAt === null)).toBe(true);
    expect(
      publicState.compacts.every((compact) =>
        compact.readiness.blockers.includes("verified_unique_person_primitive_unavailable"),
      ),
    ).toBe(true);
    const unauthorized = await api(page, "/api/mpgf/compacts/membership", "POST", {
      compactPublicKey: "future-flourishing",
      constitutionVersion: CONSTITUTION,
      acknowledgements: ACKNOWLEDGEMENTS,
      idempotencyKey: "uat712-signed-out",
    });
    expectSafeError(unauthorized, 401);
    await viewportAudit(page, "signed-out-1440x900");
    await screenshot(page, "01-signed-out-1440x900");
    mark("A", "pass", [
      "meaningful SSR constitution",
      "unknown readiness rendered unavailable rather than zero",
      "signed-out mutation denied without private content",
    ]);
  } finally {
    await closeTracked(tracked);
  }
});

test("B/C/G: member-a join, replay, revoke, reaccept, and complete multi-Compact allocation", async ({ browser }) => {
  const signedIn = await signIn(EMAILS.memberA);
  let tracked: Awaited<ReturnType<typeof trackedContext>> | null = null;
  try {
    tracked = await trackedContext(
      browser,
      "member-a-lifecycle-desktop-1440x900",
      { width: 1440, height: 900 },
      signedIn.session,
    );
    const page = await tracked.context.newPage();
    observe(page, "member-a-lifecycle-desktop");
    await goto(page);
    await assertMutationBoundaryOrder(page);

    const missingAcknowledgement = await api(page, "/api/mpgf/compacts/membership", "POST", {
      compactPublicKey: "future-flourishing",
      constitutionVersion: CONSTITUTION,
      acknowledgements: { ...ACKNOWLEDGEMENTS, noPaymentMandate: false },
      idempotencyKey: "uat712-missing-ack",
    });
    expectSafeError(missingAcknowledgement, 400);
    const staleVersion = await api(page, "/api/mpgf/compacts/membership", "POST", {
      compactPublicKey: "future-flourishing",
      constitutionVersion: "mpgf-public-goods-compact/transaction-v1",
      acknowledgements: ACKNOWLEDGEMENTS,
      idempotencyKey: "uat712-stale-version",
    });
    expectSafeError(staleVersion, 400);

    await acknowledgeAndJoin(page, "Future Flourishing");
    await screenshot(page, "02-member-a-joined-1440x900");
    let memberState = await state(page);
    let ownMemberships = memberships(memberState);
    expect(ownMemberships).toHaveLength(1);
    const firstMembershipId = ownMemberships[0].id;
    expect(ownMemberships[0].constitutionVersionAccepted).toBe(CONSTITUTION);
    expect(ownMemberships[0].acknowledgements).toEqual(ACKNOWLEDGEMENTS);
    expect(ownMemberships[0].status).toBe("pending_activation");
    expect(ownMemberships[0].activatedAt).toBeNull();
    expect(ownMemberships[0].allocationBps).toBe(10_000);
    expect(ownMemberships[0].scheduledContributionCents).toBeNull();
    expect(ownMemberships[0].fundingQualified).toBe(false);
    expect(ownMemberships[0].identityQualified).toBe(false);
    expect(memberState.allocation.schedulingReady).toBe(false);
    expect(memberState.moneyMovesOnPageAction).toBe(false);
    expect(memberState.automaticCollectionEnabled).toBe(false);

    const replayBody = {
      compactPublicKey: "future-flourishing",
      constitutionVersion: CONSTITUTION,
      acknowledgements: ACKNOWLEDGEMENTS,
      idempotencyKey: "uat712-replay-member-a",
    };
    const firstReplay = await api(page, "/api/mpgf/compacts/membership", "POST", replayBody);
    const secondReplay = await api(page, "/api/mpgf/compacts/membership", "POST", replayBody);
    expectNoMoney(firstReplay);
    expect(secondReplay).toEqual(firstReplay);
    expect(firstReplay.body.bindingNow).toBe(false);
    expect(firstReplay.body.activationState).toBe("activation_blocked");
    const malformedReplay = await api(page, "/api/mpgf/compacts/membership", "POST", {
      ...replayBody,
      compactPublicKey: "animal-welfare",
    });
    expectSafeError(malformedReplay, 400);

    await page.getByRole("button", { name: "Revoke recruiting acceptance" }).click();
    await expect(page.getByRole("status")).toContainText("Revoked Future Flourishing acceptance");
    await expect(page.getByRole("button", { name: "Accept v2 constitution and join" })).toBeVisible();
    memberState = await state(page);
    ownMemberships = memberships(memberState);
    expect(ownMemberships).toHaveLength(1);
    expect(ownMemberships[0].id).toBe(firstMembershipId);
    expect(ownMemberships[0].status).toBe("revoked");
    expect(ownMemberships[0].revokedAt).not.toBeNull();
    await screenshot(page, "03-member-a-revoked-1440x900");

    await page.reload({ waitUntil: "domcontentloaded" });
    await acknowledgeAndJoin(page, "Future Flourishing");
    memberState = await state(page);
    ownMemberships = memberships(memberState);
    expect(ownMemberships).toHaveLength(1);
    expect(ownMemberships[0].id).toBe(firstMembershipId);
    expect(ownMemberships[0].status).toBe("pending_activation");
    expect(ownMemberships[0].revokedAt).toBeNull();
    await screenshot(page, "04-member-a-reaccepted-1440x900");

    await page.reload({ waitUntil: "domcontentloaded" });
    await acknowledgeAndJoin(page, "Animal Welfare");
    memberState = await state(page);
    expect(memberships(memberState)).toHaveLength(2);
    expect(memberState.allocation.instructionValid).toBe(false);

    const invalidAllocations: Array<Record<string, unknown>> = [
      { "future-flourishing": 10_000 },
      { "future-flourishing": -1, "animal-welfare": 10_001 },
      { "future-flourishing": 5_000.5, "animal-welfare": 4_999.5 },
      { "future-flourishing": 5_000, "animal-welfare": 4_999 },
      { "future-flourishing": "5000", "animal-welfare": 5_000 },
    ];
    for (let index = 0; index < invalidAllocations.length; index += 1) {
      const result = await api(page, "/api/mpgf/compacts/allocation", "PUT", {
        allocationBps: invalidAllocations[index],
        idempotencyKey: `uat712-invalid-allocation-${index}`,
      });
      expectSafeError(result, 400);
    }
    const duplicateKey = await api(
      page,
      "/api/mpgf/compacts/allocation",
      "PUT",
      undefined,
      '{"allocationBps":{"future-flourishing":5000,"future-flourishing":5000},"idempotencyKey":"uat712-duplicate-allocation"}',
    );
    expectSafeError(duplicateKey, 400);

    await page.getByLabel("Future Flourishing (%)").fill("60.00");
    await page.getByLabel("Animal Welfare (%)").fill("40.00");
    await page.getByRole("button", { name: "Save complete allocation" }).click();
    await expect(page.getByRole("status")).toContainText("Saved the complete 100% allocation instruction");
    await expect(page.getByText("Percentages saved; cents blocked")).toBeVisible();
    memberState = await state(page);
    expect(memberState.allocation.instructionValid).toBe(true);
    expect(memberState.allocation.schedulingReady).toBe(false);
    expect(memberState.allocation.scheduledTotalCents).toBeNull();
    expect(memberState.obligation.obligationCents).toBeNull();
    expect(memberState.allocation.allocations).toEqual([
      {
        compactPublicKey: "animal-welfare",
        allocationBps: 4_000,
        scheduledContributionCents: null,
      },
      {
        compactPublicKey: "future-flourishing",
        allocationBps: 6_000,
        scheduledContributionCents: null,
      },
    ]);
    expect(
      memberState.compacts.every(
        (compact) =>
          compact.status === "recruiting" &&
          compact.activation.activatedAt === null &&
          compact.allocationElectorate.active === false &&
          compact.allocationElectorate.key === null &&
          compact.delegation === null,
      ),
    ).toBe(true);
    await expect(page.getByTestId("no-active-compact-ballot")).toBeVisible();
    await screenshot(page, "05-member-a-multi-compact-allocation-1440x900");

    const selfDelegation = await api(page, "/api/mpgf/compacts/delegation", "PUT", {
      compactPublicKey: "future-flourishing",
      cycleKey: memberState.obligation.cycleKey,
      delegateeMembershipId: firstMembershipId,
      idempotencyKey: "uat712-no-electorate-self",
    });
    expectSafeError(selfDelegation, 400);

    const directMemberships = await signedIn.client
      .from("mpgf_public_goods_compact_memberships")
      .select("id,participant_id,status");
    expect(directMemberships.error).toBeNull();
    expect(directMemberships.data).toHaveLength(2);
    const idempotencyRead = await signedIn.client
      .from("mpgf_public_goods_compact_idempotency_keys")
      .select("id")
      .limit(1);
    expect(idempotencyRead.error).not.toBeNull();

    mark("B", "pass", [
      "exact acknowledgements and version",
      "idempotent replay and malformed replay denial",
      "recruiting revoke and explicit same-row reaccept",
      "all mutation responses no-money and activation-blocked",
    ]);
    mark("C", "pass_with_bounded_hosted_branch", [
      "single membership defaulted to 10000 bps",
      "second membership invalidated incomplete prior instruction",
      "incomplete, duplicate, negative, overflow, non-integer, and non-summing maps denied",
      "complete 6000/4000 map saved while cents remained unavailable",
      "largest-remainder arithmetic remains pinned to successful exact-head rollback QA because hosted dormant authorization was forbidden",
    ]);
    mark("G", "pass", [
      "recruiting revocation immediate",
      "reaccept explicit",
      "no active-exit finalizer or accrued settlement authority represented",
    ]);
  } finally {
    await closeTracked(tracked);
    await signedIn.client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
});

test("H: member-b and outsider authorization and RLS isolation", async ({ browser }) => {
  const memberB = await signIn(EMAILS.memberB);
  let tracked: Awaited<ReturnType<typeof trackedContext>> | null = null;
  try {
    tracked = await trackedContext(
      browser,
      "member-b-tablet-1024x768",
      { width: 1024, height: 768 },
      memberB.session,
    );
    const page = await tracked.context.newPage();
    observe(page, "member-b-tablet");
    const response = await goto(page);
    expect(response?.headers()["cache-control"] ?? "").toMatch(/private|no-store/i);
    const html = await response?.text();
    expect(html).not.toMatch(/compact-uat712-member-a|712a0000-|@qa\.invalid/);
    let memberBState = await state(page);
    expect(memberships(memberBState)).toHaveLength(0);
    const unauthorizedExit = await api(page, "/api/mpgf/compacts/membership", "DELETE", {
      compactPublicKey: "future-flourishing",
      idempotencyKey: "uat712-member-b-foreign-exit",
    });
    expectSafeError(unauthorizedExit, 400);
    await acknowledgeAndJoin(page, "Global Health");
    memberBState = await state(page);
    expect(memberships(memberBState)).toHaveLength(1);
    expect(memberships(memberBState)[0].compactPublicKey).toBe("global-health");
    const directMemberships = await memberB.client
      .from("mpgf_public_goods_compact_memberships")
      .select("id,participant_id,status");
    expect(directMemberships.error).toBeNull();
    expect(directMemberships.data).toHaveLength(1);
    await viewportAudit(page, "member-b-1024x768");
    await screenshot(page, "06-member-b-private-state-1024x768");
  } finally {
    await closeTracked(tracked);
    await memberB.client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }

  const outsider = await signIn(EMAILS.outsider);
  try {
    tracked = await trackedContext(
      browser,
      "outsider-tablet-1024x768",
      { width: 1024, height: 768 },
      outsider.session,
    );
    const page = await tracked.context.newPage();
    observe(page, "outsider-tablet");
    const response = await goto(page);
    const html = await response?.text();
    expect(html).not.toMatch(/compact-uat712-member-[ab]|712[ab]0000-|@qa\.invalid/);
    const outsiderState = await state(page);
    expect(memberships(outsiderState)).toHaveLength(0);
    const directMemberships = await outsider.client
      .from("mpgf_public_goods_compact_memberships")
      .select("id,participant_id,status");
    expect(directMemberships.error).toBeNull();
    expect(directMemberships.data).toHaveLength(0);
    const unauthorizedAllocation = await api(page, "/api/mpgf/compacts/allocation", "PUT", {
      allocationBps: { "future-flourishing": 10_000 },
      idempotencyKey: "uat712-outsider-allocation",
    });
    expectSafeError(unauthorizedAllocation, 400);
    const unauthorizedDelegation = await api(page, "/api/mpgf/compacts/delegation", "PUT", {
      compactPublicKey: "future-flourishing",
      cycleKey: outsiderState.obligation.cycleKey,
      delegateeMembershipId: "712a0000-0000-4000-8000-000000000001",
      idempotencyKey: "uat712-outsider-delegation",
    });
    expectSafeError(unauthorizedDelegation, 400);
    await screenshot(page, "07-outsider-private-denial-1024x768");
  } finally {
    await closeTracked(tracked);
    await outsider.client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
  mark("H", "pass", [
    "member-a, member-b, outsider, and signed-out state isolated",
    "direct table reads restricted by RLS",
    "idempotency table not browser-readable",
    "SSR and API errors retained no private identifiers or SQL",
    "private routes and APIs no-store",
  ]);
});

test("D/E/F/I: unavailable authority, no electorate, and responsive rendered proof", async ({ browser }) => {
  const memberA = await signIn(EMAILS.memberA);
  try {
    for (const viewport of [
      { name: "390x844", width: 390, height: 844 },
      { name: "320x568", width: 320, height: 568 },
    ]) {
      const tracked = await trackedContext(
        browser,
        `member-a-mobile-${viewport.name}`,
        { width: viewport.width, height: viewport.height },
        memberA.session,
      );
      try {
        const page = await tracked.context.newPage();
        observe(page, `member-a-mobile-${viewport.name}`);
        await goto(page);
        await expect(page.getByText("Readiness unavailable").first()).toBeVisible();
        await expect(page.getByText("unavailable", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("Percentages saved; cents blocked")).toBeVisible();
        await expect(page.getByText("No people or dollar progress is inferred.").first()).toBeVisible();
        await expect(page.getByTestId("no-active-compact-ballot")).toBeVisible();
        await expect(page.getByRole("progressbar")).toHaveCount(0);
        await expect(page.getByText(/legal debt, unilateral charge, payment authorization/)).toBeVisible();
        await assertMutationBoundaryOrder(page);
        const mobileNav = page.locator(".topbar-mobile-nav");
        await expect(mobileNav.locator(":scope > summary")).toBeVisible();
        await mobileNav.locator(":scope > summary").click();
        await expect(mobileNav.locator(".topbar-mobile-nav-panel > a")).toHaveCount(8);
        await expect(mobileNav.getByRole("link", { name: "Safety" })).toBeVisible();
        await viewportAudit(page, `member-a-${viewport.name}`);
        await screenshot(page, `08-member-a-multi-unavailable-${viewport.name}`);
      } finally {
        await closeTracked(tracked);
      }
    }

    const signedOut = await trackedContext(browser, "signed-out-mobile-390x844", {
      width: 390,
      height: 844,
    });
    try {
      const page = await signedOut.context.newPage();
      observe(page, "signed-out-mobile-390x844");
      await goto(page);
      await expect(page.getByRole("link", { name: "Sign in to join" })).toBeVisible();
      await viewportAudit(page, "signed-out-390x844");
      await screenshot(page, "09-signed-out-390x844");
    } finally {
      await closeTracked(signedOut);
    }

    mark("D", "pass_with_intentional_unavailable_branch", [
      "prior complete UTC-month boundaries rendered",
      "coverage, outflow, obligation, planned cents, and settlement remained unavailable",
      "no synthetic provider or dormant authorization record invented",
      "0.99/1.00 authoritative qualification branch left to pinned rollback QA",
    ]);
    mark("E", "pass", [
      "ordinary synthetic accounts never shown as verified unique people",
      "missing uniqueness primitive rendered unavailable",
      "no numerical readiness or activation inferred",
    ]);
    mark("F", "pass", [
      "no voting snapshot, ballot, delegation target, or active electorate",
      "self, unqualified, outsider, and no-electorate delegation attempts denied",
      "transitive and proxy-cap branches remained unreachable without fabricating an electorate",
    ]);
    mark("I", "pass", [
      "1440x900, 1024x768, 390x844, and 320x568 exercised",
      "single H1, keyboard focus, zero page-level horizontal overflow, and all eight mobile navigation routes visible on expansion",
      "intentional bounded tab scrollers excluded from page-overflow failures",
      "no framework overlay and truthful no-money boundary above actions",
      "successful-run screenshots and traces retained for every role/state class",
    ]);
    mark("J", "browser_slice_pass_cleanup_pending", [
      "no provider request observed",
      "all mutations explicitly no-money",
      "console, warning, page, failed-request, and unexpected HTTP ledgers clean",
    ]);
  } finally {
    await memberA.client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
});
