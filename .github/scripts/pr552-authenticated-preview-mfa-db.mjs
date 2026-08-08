import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PREVIEW_ORIGIN = process.env.PR552_PREVIEW_ORIGIN;
const PREVIEW_SHARE_URL = process.env.PR552_PREVIEW_SHARE_URL;
const EXPECTED_SHA = process.env.PR552_EXPECTED_SHA;
const EXPECTED_DEPLOYMENT_ID = process.env.PR552_EXPECTED_DEPLOYMENT_ID;
const EXPECTED_SUPABASE_REF = process.env.PR552_EXPECTED_SUPABASE_REF;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const QA_EMAIL = process.env.PR552_QA_EMAIL;
const QA_PASSWORD = process.env.PR552_QA_PASSWORD;
const QA_USER_ID = process.env.PR552_QA_USER_ID;
const FACTOR_NAME = process.env.PR552_QA_FACTOR_NAME;
const OUTPUT_DIR = process.env.PR552_OUTPUT_DIR ?? "pr552-authenticated-preview-mfa-db";
const STATE_PATH = process.env.PR552_STATE_PATH ?? path.join(OUTPUT_DIR, "state.json");

function required(name, value) {
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

required("PR552_PREVIEW_ORIGIN", PREVIEW_ORIGIN);
required("PR552_PREVIEW_SHARE_URL", PREVIEW_SHARE_URL);
required("PR552_EXPECTED_SHA", EXPECTED_SHA);
required("PR552_EXPECTED_DEPLOYMENT_ID", EXPECTED_DEPLOYMENT_ID);
required("PR552_EXPECTED_SUPABASE_REF", EXPECTED_SUPABASE_REF);
required("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", SUPABASE_KEY);
required("PR552_QA_EMAIL", QA_EMAIL);
required("PR552_QA_PASSWORD", QA_PASSWORD);
required("PR552_QA_USER_ID", QA_USER_ID);
required("PR552_QA_FACTOR_NAME", FACTOR_NAME);

if (EXPECTED_SHA !== "0f2164e893b3eee94d2f4033d013f2ebf6430cea") {
  throw new Error(`Refusing unexpected candidate SHA ${EXPECTED_SHA}.`);
}
if (EXPECTED_DEPLOYMENT_ID !== "dpl_E4kcbFVK7QpYvdygM8m9sc841DpC") {
  throw new Error(`Refusing unexpected deployment ${EXPECTED_DEPLOYMENT_ID}.`);
}

const previewUrl = new URL(PREVIEW_ORIGIN);
const supabaseRef = new URL(SUPABASE_URL).hostname.split(".")[0];
if (supabaseRef !== EXPECTED_SUPABASE_REF) {
  throw new Error(
    `Refusing unexpected Supabase project ${supabaseRef}; expected ${EXPECTED_SUPABASE_REF}.`,
  );
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function writeState(state) {
  writeJson(STATE_PATH, state);
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

function normalizeFactors(data) {
  if (Array.isArray(data?.all)) return data.all;
  const factors = [];
  for (const value of [data?.totp, data?.phone, data?.webauthn]) {
    if (Array.isArray(value)) factors.push(...value);
  }
  return factors;
}

async function listFactors(client) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw new Error(`Could not list MFA factors: ${error.message}`);
  return normalizeFactors(data).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? factor.friendlyName ?? null,
    status: factor.status ?? null,
    factorType: factor.factor_type ?? factor.factorType ?? null,
  }));
}

function factorIds(factors) {
  return [...new Set(factors.map((factor) => factor.id))].sort();
}

function sameStringSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, offset = 0) {
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

async function stableTotpCode(secret) {
  const second = Math.floor(Date.now() / 1000) % 30;
  if (second < 3) {
    await new Promise((resolve) => setTimeout(resolve, (3 - second) * 1000));
  } else if (second > 24) {
    await new Promise((resolve) => setTimeout(resolve, (33 - second) * 1000));
  }
  return totpCode(secret);
}

async function sessionCookies(session) {
  const captured = [];
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

  return captured.map(({ name, value, options }) => ({
    name,
    value,
    url: PREVIEW_ORIGIN,
    httpOnly: options?.httpOnly ?? true,
    secure: true,
    sameSite: "Lax",
  }));
}

async function acquirePreviewAccess(context) {
  const page = await context.newPage();
  const response = await page.goto(PREVIEW_SHARE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (!response) throw new Error("Preview-share navigation returned no response.");
  await page.waitForURL((url) => url.origin === previewUrl.origin, { timeout: 60_000 });
  if (page.url().startsWith("https://vercel.com/")) {
    throw new Error("Preview-share flow did not establish deployment access.");
  }
  await page.close();
}

async function authenticatedContext(browser, session, viewport) {
  const context = await browser.newContext({
    baseURL: PREVIEW_ORIGIN,
    viewport,
  });
  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(45_000);
  await acquirePreviewAccess(context);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: PREVIEW_ORIGIN,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  return context;
}

function diagnostics(page, label) {
  const record = {
    label,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== previewUrl.origin) return;
    const errorText = request.failure()?.errorText ?? "unknown";
    const isExpectedPrefetchAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") || request.headers()["next-router-prefetch"] === "1");
    if (!isExpectedPrefetchAbort) {
      record.requestFailures.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url(),
        errorText,
      });
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== previewUrl.origin || response.status() < 400) return;
    if (url.pathname === "/favicon.ico") return;
    record.httpErrors.push({ status: response.status(), url: response.url() });
  });

  return record;
}

function assertDiagnostics(record) {
  const failures = [
    ...record.consoleErrors.map((value) => `console: ${value}`),
    ...record.pageErrors.map((value) => `page: ${value}`),
    ...record.requestFailures.map(
      (value) => `request: ${value.method} ${value.url} ${value.errorText}`,
    ),
    ...record.httpErrors.map((value) => `http: ${value.status} ${value.url}`),
  ];
  if (failures.length) {
    throw new Error(`${record.label} browser diagnostics failed:\n${failures.join("\n")}`);
  }
}

function summaryValue(panel, label) {
  return panel
    .locator("dl.values-summary > div")
    .filter({ hasText: label })
    .locator("dd");
}

async function assertDashboardSurface(page, label) {
  const response = await page.goto("/dashboard#account-security", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!response || response.status() !== 200) {
    throw new Error(`${label} dashboard returned ${response?.status() ?? "no response"}.`);
  }
  if (new URL(page.url()).pathname !== "/dashboard") {
    throw new Error(`${label} did not remain on the authenticated Dashboard: ${page.url()}`);
  }

  const panel = page.locator("#account-security");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText("Authenticator MFA for private wish data", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: "Create MFA setup" })).toBeVisible();

  const legacyWorkspace = page.locator("#background-networking");
  await expect(legacyWorkspace).toBeVisible();
  const unrelatedVisibleChildren = await legacyWorkspace
    .locator(":scope > :not(.data-grid), :scope > .data-grid > :not(#account-security)")
    .evaluateAll((elements) =>
      elements.filter((element) => getComputedStyle(element).display !== "none").length,
    );
  if (unrelatedVisibleChildren !== 0) {
    throw new Error(`${label} exposed ${unrelatedVisibleChildren} unrelated legacy element(s).`);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 1) throw new Error(`${label} has ${overflow}px horizontal overflow.`);

  return { panel, overflow };
}

async function signIn() {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (error || !data.session || data.user?.id !== QA_USER_ID) {
    throw new Error(`Synthetic sign-in failed: ${error?.message ?? "identity mismatch"}`);
  }
  return { client, session: data.session };
}

async function run() {
  const state = {
    schemaVersion: 1,
    candidateSha: EXPECTED_SHA,
    deploymentId: EXPECTED_DEPLOYMENT_ID,
    previewOrigin: PREVIEW_ORIGIN,
    supabaseRef,
    userId: QA_USER_ID,
    factorName: FACTOR_NAME,
    beforeFactorIds: [],
    factorId: null,
    factorRemovedByUi: false,
    startedAt: new Date().toISOString(),
  };
  writeState(state);

  const evidence = {
    schemaVersion: 1,
    candidateSha: EXPECTED_SHA,
    deploymentId: EXPECTED_DEPLOYMENT_ID,
    previewOrigin: PREVIEW_ORIGIN,
    supabaseRef,
    userId: QA_USER_ID,
    desktop: null,
    mobile: null,
    factorLifecycle: null,
    startedAt: state.startedAt,
  };

  let browser;
  let secret;

  try {
    const initialSignIn = await signIn();
    const initialAal = await initialSignIn.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (initialAal.error || initialAal.data.currentLevel !== "aal1") {
      throw new Error(
        `Initial synthetic session was not AAL1: ${initialAal.error?.message ?? initialAal.data.currentLevel}`,
      );
    }

    const beforeFactors = await listFactors(initialSignIn.client);
    state.beforeFactorIds = factorIds(beforeFactors);
    if (state.beforeFactorIds.length !== 0) {
      throw new Error("Fresh synthetic user unexpectedly had pre-existing MFA factors.");
    }
    writeState(state);

    browser = await chromium.launch({ headless: true });

    const desktopContext = await authenticatedContext(
      browser,
      initialSignIn.session,
      { width: 1440, height: 1000 },
    );
    const desktopPage = await desktopContext.newPage();
    const desktopDiagnostics = diagnostics(desktopPage, "desktop");
    const desktopSurface = await assertDashboardSurface(desktopPage, "desktop");
    const desktopPanel = desktopSurface.panel;

    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("0");
    await expect(summaryValue(desktopPanel, "Session level")).toHaveText("aal1");

    const createForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Create MFA setup" }),
    });
    await createForm.locator('input[name="friendly_name"]').fill(FACTOR_NAME);
    await createForm.getByRole("button", { name: "Create MFA setup" }).click();

    const pendingForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Verify MFA setup" }),
    });
    await expect(pendingForm).toBeVisible({ timeout: 30_000 });
    secret = (await pendingForm.locator("code").textContent())?.trim();
    if (!secret || secret.length < 16) {
      throw new Error("Pending setup did not expose a usable TOTP secret.");
    }

    const factorId = await pendingForm.locator('input[name="factor_id"]').inputValue();
    if (!factorId) throw new Error("Pending setup did not expose its factor ID.");
    state.factorId = factorId;
    writeState(state);

    const afterEnrollment = await listFactors(initialSignIn.client);
    const enrollmentIds = factorIds(afterEnrollment);
    const enrollmentDiff = enrollmentIds.filter(
      (id) => !state.beforeFactorIds.includes(id),
    );
    if (enrollmentDiff.length !== 1 || enrollmentDiff[0] !== factorId) {
      throw new Error(
        `Enrollment created an unexpected factor set: ${JSON.stringify(enrollmentDiff)}.`,
      );
    }

    await pendingForm.locator('input[name="code"]').fill(await stableTotpCode(secret));
    await pendingForm.getByRole("button", { name: "Verify MFA setup" }).click();
    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("1", {
      timeout: 30_000,
    });
    await expect(summaryValue(desktopPanel, "Session level")).toHaveText("aal2", {
      timeout: 30_000,
    });
    await expect(
      desktopPanel.getByText(`${FACTOR_NAME} · verified`, { exact: true }),
    ).toBeVisible();

    const afterVerification = await listFactors(initialSignIn.client);
    const verifiedFactor = afterVerification.find((factor) => factor.id === factorId);
    if (!verifiedFactor || verifiedFactor.status !== "verified") {
      throw new Error("The newly created factor was not verified after the desktop flow.");
    }

    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, "desktop-account-security.png"),
      fullPage: true,
    });
    assertDiagnostics(desktopDiagnostics);
    evidence.desktop = {
      viewport: { width: 1440, height: 1000 },
      finalUrl: desktopPage.url(),
      verifiedFactors: 1,
      sessionLevel: "aal2",
      horizontalOverflow: desktopSurface.overflow,
      diagnostics: desktopDiagnostics,
    };
    await desktopContext.close();

    const mobileSignIn = await signIn();
    const mobileInitialAal = await mobileSignIn.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mobileInitialAal.error || mobileInitialAal.data.currentLevel !== "aal1") {
      throw new Error("The fresh mobile session did not begin at AAL1.");
    }

    const mobileContext = await authenticatedContext(
      browser,
      mobileSignIn.session,
      { width: 390, height: 844 },
    );
    const mobilePage = await mobileContext.newPage();
    const mobileDiagnostics = diagnostics(mobilePage, "mobile");
    const mobileSurface = await assertDashboardSurface(mobilePage, "mobile");
    const mobilePanel = mobileSurface.panel;

    await expect(summaryValue(mobilePanel, "Verified factors")).toHaveText("1");
    await expect(summaryValue(mobilePanel, "Session level")).toHaveText("aal1");

    const verifySessionForm = mobilePanel.locator("form").filter({
      has: mobilePanel.getByRole("button", { name: "Verify session" }),
    });
    await expect(verifySessionForm).toBeVisible();
    await expect(verifySessionForm.locator('select[name="factor_id"]')).toHaveValue(factorId);
    await verifySessionForm.locator('input[name="code"]').fill(await stableTotpCode(secret));
    await verifySessionForm.getByRole("button", { name: "Verify session" }).click();
    await expect(summaryValue(mobilePanel, "Session level")).toHaveText("aal2", {
      timeout: 30_000,
    });

    await mobilePage.screenshot({
      path: path.join(OUTPUT_DIR, "mobile-account-security.png"),
      fullPage: true,
    });

    const exactFactorForm = mobilePanel
      .locator("form.mini-list-item")
      .filter({ hasText: `${FACTOR_NAME} · verified` })
      .filter({
        has: mobilePanel.locator(`input[name="factor_id"][value="${factorId}"]`),
      });
    await expect(exactFactorForm).toHaveCount(1);
    await exactFactorForm.getByRole("button", { name: "Remove factor" }).click();
    await expect(summaryValue(mobilePanel, "Verified factors")).toHaveText("0", {
      timeout: 30_000,
    });
    await expect(exactFactorForm).toHaveCount(0);

    const afterUiCleanup = await listFactors(mobileSignIn.client);
    const afterUiCleanupIds = factorIds(afterUiCleanup);
    if (!sameStringSet(afterUiCleanupIds, state.beforeFactorIds)) {
      throw new Error(
        `UI cleanup did not restore the factor baseline: ${JSON.stringify(afterUiCleanupIds)}.`,
      );
    }
    state.factorRemovedByUi = true;
    writeState(state);

    assertDiagnostics(mobileDiagnostics);
    evidence.mobile = {
      viewport: { width: 390, height: 844 },
      finalUrl: mobilePage.url(),
      verifiedFactorsBeforeCleanup: 1,
      sessionLevelBeforeCleanup: "aal2",
      verifiedFactorsAfterCleanup: 0,
      horizontalOverflow: mobileSurface.overflow,
      diagnostics: mobileDiagnostics,
    };
    await mobileContext.close();

    evidence.factorLifecycle = {
      beforeFactorIds: state.beforeFactorIds,
      createdFactorId: factorId,
      afterEnrollmentIds: enrollmentIds,
      afterVerificationIds: factorIds(afterVerification),
      verifiedStatus: verifiedFactor.status,
      afterUiCleanupIds,
      exactSingleNewFactor: true,
      exactFactorRemovedByUi: true,
      baselineRestoredByUi: true,
    };
    evidence.testPassed = true;
  } catch (error) {
    evidence.testPassed = false;
    evidence.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    evidence.completedAt = new Date().toISOString();
    writeJson(path.join(OUTPUT_DIR, "result.json"), evidence);
  }
}

await run();
