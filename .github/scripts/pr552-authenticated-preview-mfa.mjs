import { createHmac, randomBytes } from "node:crypto";
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_DIR = process.env.PR552_OUTPUT_DIR ?? "pr552-authenticated-preview-mfa";
const STATE_PATH = process.env.PR552_STATE_PATH ?? path.join(OUTPUT_DIR, "state.json");
const MODE = process.argv.includes("--cleanup-only") ? "cleanup" : "test";

function required(name, value) {
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

required("PR552_PREVIEW_ORIGIN", PREVIEW_ORIGIN);
required("PR552_EXPECTED_SHA", EXPECTED_SHA);
required("PR552_EXPECTED_DEPLOYMENT_ID", EXPECTED_DEPLOYMENT_ID);
required("PR552_EXPECTED_SUPABASE_REF", EXPECTED_SUPABASE_REF);
required("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", SUPABASE_KEY);
required("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
if (MODE === "test") required("PR552_PREVIEW_SHARE_URL", PREVIEW_SHARE_URL);

const previewUrl = new URL(PREVIEW_ORIGIN);
const supabaseUrl = new URL(SUPABASE_URL);
const supabaseRef = supabaseUrl.hostname.split(".")[0];
if (supabaseRef !== EXPECTED_SUPABASE_REF) {
  throw new Error(
    `Refusing unexpected Supabase project ${supabaseRef}; expected ${EXPECTED_SUPABASE_REF}.`,
  );
}
if (EXPECTED_SHA !== "0f2164e893b3eee94d2f4033d013f2ebf6430cea") {
  throw new Error(`Refusing unexpected candidate SHA ${EXPECTED_SHA}.`);
}
if (EXPECTED_DEPLOYMENT_ID !== "dpl_E4kcbFVK7QpYvdygM8m9sc841DpC") {
  throw new Error(`Refusing unexpected deployment ${EXPECTED_DEPLOYMENT_ID}.`);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  writeJson(STATE_PATH, state);
}

function adminClient() {
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
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
  const factors = Array.isArray(data) ? data : data?.factors;
  return Array.isArray(factors) ? factors : [];
}

async function listAdminFactors(admin, userId) {
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error(`Could not list MFA factors: ${error.message}`);
  return normalizeFactors(data).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? factor.friendlyName ?? null,
    status: factor.status ?? null,
    factorType: factor.factor_type ?? factor.factorType ?? null,
    createdAt: factor.created_at ?? factor.createdAt ?? null,
    updatedAt: factor.updated_at ?? factor.updatedAt ?? null,
  }));
}

function factorIds(factors) {
  return [...new Set(factors.map((factor) => factor.id))].sort();
}

function sameStringSet(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
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
  let second = Math.floor(Date.now() / 1000) % 30;
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
  return captured.map(({ name, value }) => ({
    name,
    value,
    url: PREVIEW_ORIGIN,
    httpOnly: true,
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
  await page.waitForURL(
    (url) => url.origin === previewUrl.origin,
    { timeout: 60_000 },
  );
  if (page.url().startsWith("https://vercel.com/")) {
    throw new Error("Preview-share flow did not establish deployment access.");
  }
  await page.close();
}

async function authenticatedContext(browser, session, viewport) {
  const context = await browser.newContext({
    baseURL: PREVIEW_ORIGIN,
    viewport,
    ignoreHTTPSErrors: false,
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
  await expect(panel.getByText("Authenticator MFA for private wish data", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Create MFA setup" })).toBeVisible();
  await expect(page.locator("#background-networking")).toBeVisible();
  await expect(page.locator("#background-networking > *").filter({ hasNot: panel })).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`${label} has ${overflow}px horizontal overflow.`);
  return panel;
}

function summaryValue(panel, label) {
  return panel.locator("dl.values-summary > div").filter({
    has: panel.locator("dt", { hasText: label }),
  }).locator("dd");
}

async function signInWithPassword(email, password) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Password sign-in failed: ${error?.message ?? "missing session"}`);
  }
  return { client, session: data.session };
}

async function cleanup(state, evidence) {
  if (!state?.userId) return { skipped: true, reason: "No test user was created." };
  const admin = adminClient();
  const beforeIds = state.beforeFactorIds ?? [];
  const factorId = state.factorId ?? null;
  const factorName = state.factorName ?? null;
  let factorsBeforeCleanup = [];
  let deletedFactorId = null;

  const userLookup = await admin.auth.admin.getUserById(state.userId);
  if (userLookup.error || !userLookup.data.user) {
    return {
      skipped: true,
      reason: "Test user was already absent.",
      userAbsent: true,
    };
  }

  factorsBeforeCleanup = await listAdminFactors(admin, state.userId);
  const newFactors = factorsBeforeCleanup.filter(
    (factor) => !beforeIds.includes(factor.id),
  );
  const candidates = newFactors.filter(
    (factor) =>
      (factorId && factor.id === factorId) ||
      (!factorId && factorName && factor.friendlyName === factorName),
  );

  if (newFactors.length !== 1 || candidates.length !== 1) {
    throw new Error(
      `Cleanup refused: expected exactly one run-created factor, found ${newFactors.length}; ` +
        `matching candidates=${candidates.length}. No unknown factor was deleted.`,
    );
  }

  deletedFactorId = candidates[0].id;
  const { error: deleteFactorError } = await admin.auth.admin.mfa.deleteFactor({
    id: deletedFactorId,
    userId: state.userId,
  });
  if (deleteFactorError) {
    throw new Error(`Exact-factor cleanup failed: ${deleteFactorError.message}`);
  }

  const factorsAfterFactorCleanup = await listAdminFactors(admin, state.userId);
  if (!sameStringSet(factorIds(factorsAfterFactorCleanup), beforeIds)) {
    throw new Error(
      "Factor cleanup proof failed: the final factor-ID set differs from the pre-test set.",
    );
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(state.userId);
  if (deleteUserError) {
    throw new Error(`Temporary-user cleanup failed: ${deleteUserError.message}`);
  }
  const afterUserLookup = await admin.auth.admin.getUserById(state.userId);
  if (!afterUserLookup.error && afterUserLookup.data.user) {
    throw new Error("Temporary-user cleanup proof failed: the user still exists.");
  }

  const result = {
    skipped: false,
    userId: state.userId,
    deletedFactorId,
    beforeFactorIds: beforeIds,
    factorsBeforeCleanup: factorIds(factorsBeforeCleanup),
    factorsAfterCleanup: factorIds(factorsAfterFactorCleanup),
    exactFactorOnly: true,
    userAbsent: true,
    completedAt: new Date().toISOString(),
  };
  if (evidence) writeJson(path.join(OUTPUT_DIR, "cleanup.json"), result);
  return result;
}

async function runCleanupOnly() {
  const state = readState();
  const result = await cleanup(state, true);
  writeJson(path.join(OUTPUT_DIR, "cleanup-only-result.json"), result);
}

async function runTest() {
  const admin = adminClient();
  const runId = process.env.GITHUB_RUN_ID ?? String(Date.now());
  const factorName = `PR552 exact Preview ${runId}`;
  const email = `pr552-mfa-${runId}-${randomBytes(4).toString("hex")}@qa.moraltrade.invalid`;
  const password = `${randomBytes(24).toString("base64url")}!aA7`;
  const startedAt = new Date().toISOString();
  const state = {
    schemaVersion: 1,
    candidateSha: EXPECTED_SHA,
    deploymentId: EXPECTED_DEPLOYMENT_ID,
    previewOrigin: PREVIEW_ORIGIN,
    supabaseRef,
    runId,
    factorName,
    userId: null,
    beforeFactorIds: [],
    factorId: null,
    startedAt,
  };
  writeState(state);

  const evidence = {
    schemaVersion: 1,
    candidateSha: EXPECTED_SHA,
    deploymentId: EXPECTED_DEPLOYMENT_ID,
    previewOrigin: PREVIEW_ORIGIN,
    supabaseRef,
    startedAt,
    desktop: null,
    mobile: null,
    factorLifecycle: null,
    cleanup: null,
  };

  let browser;
  let secret = null;
  let testError = null;
  let cleanupError = null;

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: "PR552 MFA Preview QA",
        full_name: "PR552 MFA Preview QA",
        qa_scope: "pr552-exact-preview-mfa",
      },
    });
    if (createError || !created.user) {
      throw new Error(`Temporary user creation failed: ${createError?.message ?? "missing user"}`);
    }
    state.userId = created.user.id;
    writeState(state);

    const beforeFactors = await listAdminFactors(admin, state.userId);
    state.beforeFactorIds = factorIds(beforeFactors);
    if (state.beforeFactorIds.length !== 0) {
      throw new Error("Fresh temporary user unexpectedly had pre-existing MFA factors.");
    }
    writeState(state);

    const initialSignIn = await signInWithPassword(email, password);
    const initialAal = await initialSignIn.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (initialAal.error || initialAal.data.currentLevel !== "aal1") {
      throw new Error(
        `Initial session was not AAL1: ${initialAal.error?.message ?? initialAal.data.currentLevel}`,
      );
    }

    browser = await chromium.launch({ headless: true });

    const desktopContext = await authenticatedContext(
      browser,
      initialSignIn.session,
      { width: 1440, height: 1000 },
    );
    const desktopPage = await desktopContext.newPage();
    const desktopDiagnostics = diagnostics(desktopPage, "desktop");
    const desktopPanel = await assertDashboardSurface(desktopPage, "desktop");
    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("0");
    await expect(summaryValue(desktopPanel, "Session level")).toHaveText("aal1");

    const createForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Create MFA setup" }),
    });
    await createForm.locator('input[name="friendly_name"]').fill(factorName);
    await createForm.getByRole("button", { name: "Create MFA setup" }).click();

    const pendingForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Verify MFA setup" }),
    });
    await expect(pendingForm).toBeVisible({ timeout: 30_000 });
    const secretLocator = pendingForm.locator("code");
    await expect(secretLocator).toBeVisible();
    secret = (await secretLocator.textContent())?.trim() ?? null;
    if (!secret || secret.length < 16) throw new Error("Pending setup did not expose a usable TOTP secret.");
    const factorId = await pendingForm.locator('input[name="factor_id"]').inputValue();
    if (!factorId) throw new Error("Pending setup did not expose its factor ID.");
    state.factorId = factorId;
    writeState(state);

    const afterEnrollment = await listAdminFactors(admin, state.userId);
    const enrollmentDiff = factorIds(afterEnrollment).filter(
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
    await expect(desktopPanel.getByText(`${factorName} · verified`, { exact: true })).toBeVisible();
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
      horizontalOverflow: 0,
      diagnostics: desktopDiagnostics,
    };
    await desktopContext.close();

    const afterVerification = await listAdminFactors(admin, state.userId);
    const verifiedFactor = afterVerification.find((factor) => factor.id === factorId);
    if (!verifiedFactor || verifiedFactor.status !== "verified") {
      throw new Error("The newly created factor was not verified after the desktop flow.");
    }

    const mobileSignIn = await signInWithPassword(email, password);
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
    const mobilePanel = await assertDashboardSurface(mobilePage, "mobile");
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
    await expect(mobilePanel.getByRole("button", { name: "Create MFA setup" })).toBeVisible();
    await mobilePage.screenshot({
      path: path.join(OUTPUT_DIR, "mobile-account-security.png"),
      fullPage: true,
    });
    const mobileOverflow = await mobilePage.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (mobileOverflow > 1) throw new Error(`mobile has ${mobileOverflow}px horizontal overflow.`);
    assertDiagnostics(mobileDiagnostics);
    evidence.mobile = {
      viewport: { width: 390, height: 844 },
      finalUrl: mobilePage.url(),
      verifiedFactors: 1,
      sessionLevel: "aal2",
      horizontalOverflow: mobileOverflow,
      diagnostics: mobileDiagnostics,
    };
    await mobileContext.close();

    evidence.factorLifecycle = {
      beforeFactorIds: state.beforeFactorIds,
      createdFactorId: factorId,
      afterEnrollmentIds: factorIds(afterEnrollment),
      afterVerificationIds: factorIds(afterVerification),
      verifiedStatus: verifiedFactor.status,
      exactSingleNewFactor: true,
    };
  } catch (error) {
    testError = error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    try {
      evidence.cleanup = await cleanup(state, true);
    } catch (error) {
      cleanupError = error;
      evidence.cleanup = {
        exactFactorOnly: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    evidence.completedAt = new Date().toISOString();
    evidence.testPassed = !testError;
    evidence.cleanupPassed = !cleanupError;
    writeJson(path.join(OUTPUT_DIR, "result.json"), evidence);
  }

  if (cleanupError) {
    throw new Error(
      `Cleanup proof failed${testError ? ` after test failure (${testError.message})` : ""}: ${cleanupError.message}`,
    );
  }
  if (testError) throw testError;
}

if (MODE === "cleanup") {
  await runCleanupOnly();
} else {
  await runTest();
}
