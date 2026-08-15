import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = process.env.MPGF_DAC_PRODUCT_BASE_URL ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const QA_PASSWORD = process.env.MPGF_DAC_PRODUCT_QA_PASSWORD ?? "";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const PROD_REF = process.env.FORBIDDEN_PROD_REF ?? "";

const OUTPUT_DIR = "test-results/uat702-owner";
const TRACE_DIR = "test-results/uat702-traces";
const PUBLISHED_SLUG = "uat702-owner-exact-freeze";
const TITLES = {
  draft: "UAT702 draft creator flow",
  freeze: "UAT702 exact freeze candidate",
  reject: "UAT702 intended rejection candidate",
} as const;
const EMAILS = {
  creator: "dac-product-creator@qa.invalid",
  pledger: "dac-product-pledger@qa.invalid",
  reviewer: "dac-product-reviewer@qa.invalid",
  outsider: "dac-product-outsider@qa.invalid",
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

const observations: Observation[] = [];
const viewportDiagnostics: Array<Record<string, unknown>> = [];
let traceSequence = 20;

function requireEnvironment() {
  if (!BASE_URL || !SUPABASE_URL || !SUPABASE_KEY || !QA_PASSWORD || !BYPASS || !PROD_REF) {
    throw new Error("Owner UAT environment is incomplete.");
  }
  if (!SUPABASE_URL.includes("hvmxfjjbdcgjjudmthdz") || SUPABASE_URL.includes(PROD_REF)) {
    throw new Error("Owner UAT refused a non-QA Supabase URL.");
  }
}

function safePath(raw: string) {
  const url = new URL(raw);
  return url.pathname
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<fixture-id>")
    .replace(/campaign-[0-9a-f]{32}/gi, "campaign-<fixture-id>");
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
    record.failedRequests.push({ method: request.method(), host: safeHost(request.url()), path: safePath(request.url()) });
  });
  page.on("request", (request) => {
    const host = safeHost(request.url());
    if (/(?:stripe|every\.org|paypal|adyen|braintree|squareup)/i.test(host)) {
      record.providerRequests.push({ method: request.method(), host, path: safePath(request.url()) });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      record.httpErrors.push({ status: response.status(), host: safeHost(response.url()), path: safePath(response.url()) });
    }
  });
  return record;
}

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
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
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
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function signIn(email: string) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: QA_PASSWORD });
  if (error || !data.session) throw new Error(`Isolated-QA sign-in failed for fixture role: ${error?.message ?? "no session"}`);
  return { client, session: data.session };
}

async function elevateWithTotp(client: SupabaseClient) {
  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `uat702-${Date.now()}`,
  });
  if (enrollmentError || !enrollment?.totp?.secret) throw new Error("TOTP enrollment failed.");
  for (const offset of [0, -1, 1]) {
    const { data, error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code: totpCode(enrollment.totp.secret, offset),
    });
    if (data && !error) {
      const sessionResult = await client.auth.getSession();
      if (sessionResult.data.session) return sessionResult.data.session;
    }
  }
  throw new Error("TOTP verification failed.");
}

async function sessionCookies(session: Session) {
  const captured: Array<{ name: string; value: string }> = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() { return []; },
      setAll(values) { captured.splice(0, captured.length, ...values.map(({ name, value }) => ({ name, value }))); },
    },
  });
  const { error } = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
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
  const cookies = [{
    name: "mt_walkthrough_seen",
    value: "1",
    url: BASE_URL,
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
  }];
  if (session) cookies.push(...(await sessionCookies(session)));
  await context.addCookies(cookies);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  return { context, label };
}

async function closeTracked(tracked: { context: BrowserContext; label: string } | null) {
  if (!tracked) return;
  await mkdir(TRACE_DIR, { recursive: true });
  traceSequence += 1;
  await tracked.context.tracing.stop({ path: `${TRACE_DIR}/trace-${String(traceSequence).padStart(2, "0")}-${tracked.label}.zip` });
  await tracked.context.close();
}

async function screenshot(page: Page, name: string, fullPage = true) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: `${OUTPUT_DIR}/${name}.png`, fullPage });
}

async function goto(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator("body").waitFor();
  return response;
}

function proposalPanel(page: Page) {
  return page.locator(".mpgf-panel").filter({
    has: page.locator("h2", { hasText: /^Draft a candidate pool reasoning$/ }),
  });
}

function proposalControl(panel: ReturnType<Page["locator"]>, label: string) {
  if (label === "Maximum failure bonus per participant dollars") {
    return panel.locator('input[aria-label="Maximum failure bonus per participant dollars"]');
  }

  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return panel
    .locator("label")
    .filter({ hasText: new RegExp(`^${escaped}`) })
    .locator("input, textarea, select")
    .first();
}

async function fillCompleteProposal(page: Page, title: string) {
  const panel = proposalPanel(page);
  const values: Array<[string, string]> = [
    ["Proposal title", title],
    ["Cause area", "Synthetic isolated QA"],
    ["Summary", "Synthetic owner UAT for an exact non-payment dominant assurance contract."],
    ["Problem statement", "A deterministic synthetic coordination problem exists only inside isolated QA."],
    ["Proposed intervention", "Exercise the exact reviewed lifecycle without real money or real beneficiaries."],
    ["Moral public-good rationale", "The synthetic fixture tests a shared non-excludable coordination mechanism."],
    ["Output unit label", "verified synthetic unit"],
    ["Output unit definition", "One deterministic unit recorded only for isolated QA."],
    ["Measurement method", "Inspect exact synthetic database and rendered lifecycle receipts."],
    ["Expected effect vs funding", "Mechanical test arithmetic only; no probability or causal impact claim."],
    ["Timeline", "Complete within the bounded owner UAT window."],
    ["Milestones", "Create exact fixture\nReview frozen terms\nClean all residue"],
    ["Risks", "Accidental environment drift\nUnauthorized state transition"],
    ["Misuse pathways", "No production, provider, payment, or beneficiary use is permitted."],
    ["Proposed recipient", "Synthetic QA recipient"],
    ["Destination reference", "qa-synthetic-recipient-uat702"],
    ["Verification method", "Exact isolated-QA row and rendered receipt inspection."],
    ["Anti-threat baseline rule", "Only additive synthetic support before the frozen deadline counts."],
    ["Exit rule", "Signed pledge intents expire without payment when the synthetic campaign lapses."],
    ["Maximum eligible participants", "100"],
    ["Maximum failure bonus per participant dollars", "25.00"],
  ];
  for (const [label, value] of values) {
    const control = proposalControl(panel, label);
    await expect(control).toBeVisible();
    await control.fill(value);
    await page.keyboard.press("Escape");
  }
  await expect(panel.getByRole("button", { name: "Save draft" })).toBeEnabled();
  await expect(panel.getByRole("button", { name: "Submit proposal" })).toBeEnabled();
  return panel;
}

async function saveAndGetStatusHref(panel: ReturnType<Page["locator"]>, buttonName: "Save draft" | "Submit proposal") {
  const link = panel.getByRole("link", { name: "View proposal status" });
  const previousHref = (await link.count()) > 0 ? await link.getAttribute("href") : null;
  await panel.getByRole("button", { name: buttonName }).click();
  await expect(link).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => link.getAttribute("href"), { timeout: 30_000 })
    .not.toBe(previousHref);
  const href = await link.getAttribute("href");
  if (!href || !/^\/mpgf\/pools\/proposals\/[0-9a-f-]{36}$/i.test(href)) {
    throw new Error("Proposal status link was missing or malformed.");
  }
  return href;
}

function rowFor(page: Page, title: string) {
  return page.locator(".mpgf-dac-review-row").filter({ has: page.getByRole("heading", { name: title }) });
}

async function assertNoPrivateFlash(response: Awaited<ReturnType<typeof goto>>, forbidden: string[]) {
  if (!response) throw new Error("Missing navigation response.");
  const initial = await response.text();
  for (const value of forbidden) expect(initial).not.toContain(value);
}

function assertPrivateCacheBoundary(response: Awaited<ReturnType<typeof goto>>) {
  if (!response) throw new Error("Missing navigation response.");
  expect(response.headers()["cache-control"] ?? "").toMatch(/private|no-store/i);
}

async function viewportAudit(page: Page, route: string, viewport: string) {
  const result = await page.evaluate(() => {
    const overflowing = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || "").slice(0, 100),
          ariaLabel: element.getAttribute("aria-label") ?? "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.width > 1 && (item.left < -1 || item.right > window.innerWidth + 1))
      .slice(0, 20);
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    const nav = document.querySelector('nav[aria-label="Primary"]')?.getBoundingClientRect();
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      h1Count: document.querySelectorAll("h1").length,
      bodyScrollWidth: document.documentElement.scrollWidth,
      horizontalOverflowPixels: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      overflowing,
      footer: footer ? { left: Math.round(footer.left), right: Math.round(footer.right), width: Math.round(footer.width) } : null,
      primaryNav: nav ? { left: Math.round(nav.left), right: Math.round(nav.right), width: Math.round(nav.width) } : null,
    };
  });
  viewportDiagnostics.push({ route, viewport, ...result });
  expect(result.h1Count).toBe(1);
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName ?? "",
    visible: Boolean(document.activeElement && document.activeElement !== document.body),
  }));
  expect(focus.visible, `focus must be reachable on ${route} at ${viewport}`).toBe(true);
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
  await writeFile(`${OUTPUT_DIR}/browser-observations.json`, `${JSON.stringify(sanitized, null, 2)}\n`);
  await writeFile(`${OUTPUT_DIR}/viewport-diagnostics.json`, `${JSON.stringify(viewportDiagnostics, null, 2)}\n`);
});

test("creator, negative authorization, intended reviewer freeze/reject, and frozen receipt", async ({ browser }) => {
  const desktop = { width: 1440, height: 1000 };
  let tracked: Awaited<ReturnType<typeof trackedContext>> | null = null;
  let draftHref = "";
  let freezeHref = "";
  let rejectHref = "";

  const signedOut = await trackedContext(browser, "signed-out-negative", desktop);
  tracked = signedOut;
  let page = await signedOut.context.newPage();
  observe(page, "signed-out-reviewer");
  let response = await goto(page, "/mpgf/admin/dac-lifecycle");
  assertPrivateCacheBoundary(response);
  await expect(page.getByRole("heading", { name: "Admin access required" })).toBeVisible();
  await assertNoPrivateFlash(response, [TITLES.freeze, TITLES.reject, "Reviewer ID"]);
  await screenshot(page, "01-signed-out-reviewer-denial-desktop");
  await closeTracked(tracked);
  tracked = null;

  const creator = await signIn(EMAILS.creator);
  try {
    tracked = await trackedContext(browser, "creator", desktop, creator.session);
    page = await tracked.context.newPage();
    observe(page, "creator-form");
    response = await goto(page, "/mpgf/pools/new?template=threshold-coalition");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Propose a moral public good." })).toBeVisible();
    const panel = proposalPanel(page);
    await expect(panel.getByRole("button", { name: "Save draft" })).toBeDisabled();
    await expect(panel.getByRole("button", { name: "Submit proposal" })).toBeDisabled();
    await fillCompleteProposal(page, TITLES.draft);
    await screenshot(page, "02-creator-complete-editable-draft-desktop");
    draftHref = await saveAndGetStatusHref(panel, "Save draft");
    await expect(panel.getByText(/Saved draft/)).toBeVisible();

    await proposalControl(panel, "Proposal title").fill(TITLES.freeze);
    freezeHref = await saveAndGetStatusHref(panel, "Submit proposal");
    await expect(panel.getByText(/Submitted .* for MPGF review/)).toBeVisible();

    await proposalControl(panel, "Proposal title").fill(TITLES.reject);
    rejectHref = await saveAndGetStatusHref(panel, "Submit proposal");
    await screenshot(page, "03-creator-submitted-status-navigation-desktop");

    await goto(page, draftHref);
    await expect(page.getByRole("heading", { level: 1, name: TITLES.draft })).toBeVisible();
    await expect(page.getByText("draft", { exact: true }).first()).toBeVisible();
    await goto(page, freezeHref);
    await expect(page.getByRole("heading", { level: 1, name: TITLES.freeze })).toBeVisible();
    await expect(page.getByText("submitted", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /approve|freeze|publish/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /not money movement/i })).toBeVisible();
    await expect(page.getByText(/does not create a payment method.*payout/i)).toBeVisible();

    await goto(page, "/mpgf/admin/dac-lifecycle");
    await expect(page.getByRole("heading", { name: "Admin access required" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Begin review|Approve and freeze|Publish frozen terms/ })).toHaveCount(0);
    await screenshot(page, "04-creator-cannot-self-review-desktop");
  } finally {
    await closeTracked(tracked);
    tracked = null;
    await creator.client.auth.signOut({ scope: "local" });
  }

  const outsider = await signIn(EMAILS.outsider);
  try {
    tracked = await trackedContext(browser, "outsider", desktop, outsider.session);
    page = await tracked.context.newPage();
    observe(page, "outsider-private-route");
    response = await goto(page, freezeHref);
    expect([200, 404]).toContain(response?.status());
    assertPrivateCacheBoundary(response);
    await assertNoPrivateFlash(response, [TITLES.freeze, "Creator lifecycle receipt"]);
    await expect(page.getByRole("heading", { level: 1, name: TITLES.freeze })).toHaveCount(0);
    await goto(page, "/mpgf/admin/dac-lifecycle");
    await expect(page.getByRole("heading", { name: "Admin access required" })).toBeVisible();
    await screenshot(page, "05-outsider-negative-authorization-desktop");
  } finally {
    await closeTracked(tracked);
    tracked = null;
    await outsider.client.auth.signOut({ scope: "local" });
  }

  const reviewer = await signIn(EMAILS.reviewer);
  try {
    const aal2 = await elevateWithTotp(reviewer.client);
    tracked = await trackedContext(browser, "reviewer", desktop, aal2);
    page = await tracked.context.newPage();
    observe(page, "reviewer-lifecycle");

    await goto(page, "/mpgf/admin/failure-bonus");
    const scheduleRow = page.locator(".mpgf-gate-row").filter({ has: page.getByRole("heading", { name: TITLES.freeze }) });
    await expect(scheduleRow).toBeVisible();
    await scheduleRow.getByLabel("Operator rationale for the complete schedule").fill(
      "Approve the complete synthetic isolated-QA schedule for exact owner UAT.",
    );
    await scheduleRow.getByRole("button", { name: /^Approve all/ }).click();
    await expect(page.locator(".mpgf-gate-row").filter({ has: page.getByRole("heading", { name: TITLES.freeze }) })).toHaveCount(0, { timeout: 30_000 });

    await goto(page, "/mpgf/admin/dac-lifecycle");
    await expect(page.getByRole("heading", { name: "This operator can invoke lifecycle decisions" })).toBeVisible();
    let freezeRow = rowFor(page, TITLES.freeze);
    await freezeRow.getByRole("button", { name: "Begin review" }).click();
    freezeRow = rowFor(page, TITLES.freeze);
    await expect(freezeRow.getByRole("button", { name: "Approve and freeze" })).toBeVisible({ timeout: 30_000 });
    const versionBefore = await freezeRow.locator("dl > div").filter({ hasText: "Terms" }).first().locator("dd").innerText();
    await freezeRow.getByRole("button", { name: "Approve and freeze" }).click();
    freezeRow = rowFor(page, TITLES.freeze);
    await expect(freezeRow.getByText("approved as candidate", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    const hashLocator = freezeRow.locator("dl > div").filter({ hasText: "Terms SHA-256" }).locator("dd");
    const hashAfter = (await hashLocator.innerText()).trim();
    expect(hashAfter).toMatch(/^[0-9a-f]{64}$/);
    const versionAfter = await freezeRow.locator("dl > div").filter({ hasText: "Terms" }).first().locator("dd").innerText();
    expect(versionAfter).toBe(versionBefore);
    await page.reload({ waitUntil: "domcontentloaded" });
    freezeRow = rowFor(page, TITLES.freeze);
    await expect(freezeRow.locator("dl > div").filter({ hasText: "Terms SHA-256" }).locator("dd")).toHaveText(hashAfter);
    await expect(freezeRow.getByRole("button", { name: "Approve and freeze" })).toHaveCount(0);
    await freezeRow.getByLabel("Public slug").fill(PUBLISHED_SLUG);
    await freezeRow.getByRole("button", { name: "Publish frozen terms" }).click();
    freezeRow = rowFor(page, TITLES.freeze);
    await expect(freezeRow.getByRole("link", { name: "View public campaign" })).toBeVisible({ timeout: 30_000 });
    await expect(freezeRow.getByRole("button", { name: "Publish frozen terms" })).toHaveCount(0);

    const rejectRow = rowFor(page, TITLES.reject);
    await rejectRow.getByLabel("Rejection rationale").fill(
      "Reject this separate synthetic proposal to exercise the intended boundary.",
    );
    await rejectRow.getByRole("button", { name: "Reject proposal" }).click();
    await expect(rowFor(page, TITLES.reject).getByText("rejected", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await screenshot(page, "06-reviewer-freeze-and-reject-desktop");
  } finally {
    await closeTracked(tracked);
    tracked = null;
    await reviewer.client.auth.signOut({ scope: "local" });
  }

  const creatorAfter = await signIn(EMAILS.creator);
  try {
    tracked = await trackedContext(browser, "creator-frozen", desktop, creatorAfter.session);
    page = await tracked.context.newPage();
    observe(page, "creator-frozen-receipt");
    response = await goto(page, freezeHref);
    expect(response?.status()).toBe(200);
    assertPrivateCacheBoundary(response);
    await expect(page.getByRole("heading", { level: 1, name: TITLES.freeze })).toBeVisible();
    await expect(page.getByText("Exact terms are locked", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View public campaign" })).toHaveAttribute(
      "href",
      "/mpgf/campaigns/" + PUBLISHED_SLUG,
    );
    await expect(page.getByRole("textbox", { name: "Proposal title" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Save|Submit|Approve|Freeze|Publish/ })).toHaveCount(0);
    await screenshot(page, "07-creator-frozen-immutable-receipt-desktop");
    await goto(page, rejectHref);
    await expect(page.getByRole("heading", { level: 1, name: TITLES.reject })).toBeVisible();
    await expect(page.getByText("rejected", { exact: true }).first()).toBeVisible();
    const clientQaRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.hostname.includes("hvmxfjjbdcgjjudmthdz") && url.pathname.includes("/auth/v1/logout");
    });
    await page.getByRole("button", { name: "Log out" }).click();
    const logoutRequest = await clientQaRequest;
    expect(new URL(logoutRequest.url()).hostname).toContain("hvmxfjjbdcgjjudmthdz");
    expect(logoutRequest.url()).not.toContain(PROD_REF);
  } finally {
    await closeTracked(tracked);
    await creatorAfter.client.auth.signOut({ scope: "local" });
  }
});

test("pledger consent and malformed amount controls fail closed without creating a receipt", async ({ browser }) => {
  const pledger = await signIn(EMAILS.pledger);
  let tracked: Awaited<ReturnType<typeof trackedContext>> | null = null;
  try {
    tracked = await trackedContext(browser, "pledger-negative-validation", { width: 1440, height: 1000 }, pledger.session);
    const page = await tracked.context.newPage();
    observe(page, "pledger-negative-validation");
    const response = await goto(page, "/mpgf/campaigns/qa-dac-product-open");
    expect(response?.status()).toBe(200);
    const submit = page.getByRole("button", { name: "Record conditional pledge" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Pledge amount (USD)").fill("0");
    await page.getByLabel(/I accept this exact published version and hash/).check();
    await submit.click();
    await expect(page.getByText("Enter a positive pledge amount.")).toBeVisible();
    await expect(page.locator('[aria-label="Immutable DAC pledge receipt"]')).toHaveCount(0);

    await page.getByLabel("Pledge amount (USD)").fill("1.001");
    await submit.click();
    await expect(page.getByText("Enter a positive pledge amount with at most two decimal places.")).toBeVisible();
    await expect(page.locator('[aria-label="Immutable DAC pledge receipt"]')).toHaveCount(0);

    await page.getByLabel("Pledge amount (USD)").fill("5.00");
    await page.getByLabel("Visibility").selectOption("public_reason");
    await submit.click();
    await expect(page.getByText("Add a supporter reason before making it public.")).toBeVisible();
    await expect(page.locator('[aria-label="Immutable DAC pledge receipt"]')).toHaveCount(0);
    await screenshot(page, "08-pledger-malformed-input-denials-desktop");
  } finally {
    await closeTracked(tracked);
    await pledger.client.auth.signOut({ scope: "local" });
  }
});

test("390 and 320 mobile reachability, focus, overflow ledger, and inherited discover 404", async ({ browser }) => {
  const viewports = [
    { name: "390x844", width: 390, height: 844 },
    { name: "320x568", width: 320, height: 568 },
  ];
  const routes = [
    { path: "/mpgf/campaigns/qa-dac-product-open", name: "open" },
    { path: "/mpgf/campaigns/qa-dac-product-succeeded", name: "succeeded" },
    { path: "/mpgf/campaigns/qa-dac-product-lapsed", name: "lapsed" },
  ];

  for (const viewport of viewports) {
    const tracked = await trackedContext(browser, `mobile-${viewport.name}`, viewport);
    try {
      const page = await tracked.context.newPage();
      observe(page, `mobile-${viewport.name}`);
      for (const route of routes) {
        const response = await goto(page, route.path);
        expect(response?.status()).toBe(200);
        await viewportAudit(page, route.path, viewport.name);
        await screenshot(page, `08-${viewport.name}-${route.name}-viewport`, false);
      }
      await goto(page, routes[0].path);
      const discover = page.getByRole("link", { name: /Discover/ }).first();
      await expect(discover).toBeVisible();
      const prefetched = page.waitForResponse(
        (candidate) => new URL(candidate.url()).pathname === "/discover",
        { timeout: 5_000 },
      ).catch(() => null);
      await discover.hover();
      const discoverResponse = await prefetched;
      if (discoverResponse) expect(discoverResponse.status()).toBe(404);
      else expect((await tracked.context.request.get("/discover")).status()).toBe(404);
    } finally {
      await closeTracked(tracked);
    }
  }

  const serious = observations.flatMap((item) => [
    ...item.pageErrors.map((message) => ({ label: item.label, kind: "page", message })),
    ...item.consoleErrors
      .filter((message) => !message.includes("404"))
      .map((message) => ({ label: item.label, kind: "console", message })),
    ...item.httpErrors
      .filter((entry) => entry.status >= 500)
      .map((entry) => ({ label: item.label, kind: "http", message: `${entry.status} ${entry.path}` })),
    ...item.providerRequests.map((entry) => ({
      label: item.label,
      kind: "payment-provider-request",
      message: entry.method + " " + entry.host + entry.path,
    })),
  ]);
  expect(serious).toEqual([]);
});
