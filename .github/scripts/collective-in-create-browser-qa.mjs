import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.BROWSER_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactDir =
  process.env.BROWSER_QA_ARTIFACT_DIR ?? "collective-in-create-browser-artifacts";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString();
const titlePrefix = `[QA COLLECTIVE CREATE ${runId}]`;
const email = `qa-collective-create-${runId}-${randomBytes(5).toString("hex")}@example.com`;
const password = `Collective-${randomBytes(18).toString("base64url")}!`;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase QA configuration.");
}

await mkdir(artifactDir, { recursive: true });

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const audit = {
  outcome: "running",
  baseUrl,
  generatedAt: new Date().toISOString(),
  browserPluginAvailable: false,
  browserFallback: "Browser plugin not available; regular Playwright used.",
  synthetic: { email, profileId: null, commitmentId: null },
  checks: [],
  diagnostics: {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    errorResponses: [],
    ignoredDiagnostics: [],
  },
  screenshots: [],
  cleanup: { completed: false, remaining: {} },
};

function pass(name, detail = "") {
  audit.checks.push({ name, outcome: "pass", detail });
}

function isIgnoredFailure(url, status, failureText = "") {
  if (url.includes("/api/funnel-events") && status === 429) return true;
  if (
    /ERR_ABORTED|NS_BINDING_ABORTED|net::ERR_FAILED/i.test(failureText) &&
    (url.includes("?_rsc=") || url.includes("/collective-commitments"))
  ) {
    return true;
  }
  return false;
}

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      audit.diagnostics.consoleErrors.push({ label, text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    audit.diagnostics.pageErrors.push({ label, text: error.message });
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failureText = request.failure()?.errorText ?? "failed";
    if (isIgnoredFailure(url, 0, failureText)) {
      audit.diagnostics.ignoredDiagnostics.push({ label, kind: "request", url, failureText });
      return;
    }
    if (url.startsWith(baseUrl)) {
      audit.diagnostics.failedRequests.push({
        label,
        method: request.method(),
        url,
        failureText,
      });
    }
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith(baseUrl) || response.status() < 400) return;
    if (isIgnoredFailure(url, response.status())) {
      audit.diagnostics.ignoredDiagnostics.push({
        label,
        kind: "response",
        url,
        status: response.status(),
      });
      return;
    }
    audit.diagnostics.errorResponses.push({ label, status: response.status(), url });
  });
}

async function screenshot(page, name, fullPage = false) {
  const fileName = `${name}.png`;
  await page.screenshot({ path: path.join(artifactDir, fileName), fullPage });
  audit.screenshots.push(fileName);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function createSyntheticAccount() {
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Collective Create Reviewer" },
  });
  if (authError || !authData.user) {
    throw authError ?? new Error("Synthetic Auth user was not created.");
  }
  const profileId = authData.user.id;
  audit.synthetic.profileId = profileId;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: profileId,
      email,
      display_name: "Collective Create Reviewer",
      public_location_granularity: "hidden",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const now = new Date();
  const { error: credentialError } = await admin
    .from("collective_identity_credentials")
    .insert({
      profile_id: profileId,
      credential_version: 1,
      status: "verified",
      verified_real_name: "Collective Create Reviewer",
      verified_affiliation: "Moral Trade QA",
      human_uniqueness_ref_hash: sha256(`collective-create-human:${profileId}`),
      provider: "MoralTrade authenticated Create integration QA",
      verification_method: "isolated synthetic operator fixture",
      assurance_tier: "enhanced-review",
      duplicate_check_result: "clear",
      manual_review_status: "approved",
      verified_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 48 * 60 * 60_000).toISOString(),
    });
  if (credentialError) throw credentialError;

  pass("synthetic_verified_user", profileId);
}

async function assertNoFrameworkOverlay(page, label) {
  const overlayText = await page
    .locator("nextjs-portal, [data-nextjs-dialog-overlay], [data-vite-dev-id]")
    .allTextContents()
    .catch(() => []);
  assert.deepEqual(overlayText, [], `${label}: framework error overlay detected.`);
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentClient: document.documentElement.clientWidth,
    documentScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  assert.ok(
    metrics.documentScroll <= metrics.viewport + 1,
    `${label}: document horizontal overflow ${metrics.documentScroll}px > ${metrics.viewport}px.`,
  );
  assert.ok(
    metrics.bodyScroll <= metrics.viewport + 1,
    `${label}: body horizontal overflow ${metrics.bodyScroll}px > ${metrics.viewport}px.`,
  );
  return metrics;
}

async function cleanupSyntheticState() {
  const commitmentId = audit.synthetic.commitmentId;
  const profileId = audit.synthetic.profileId;

  if (commitmentId) {
    const { error } = await admin
      .from("collective_commitments")
      .delete()
      .eq("id", commitmentId);
    if (error) throw error;
  }

  if (profileId) {
    const { error: credentialError } = await admin
      .from("collective_identity_credentials")
      .delete()
      .eq("profile_id", profileId);
    if (credentialError) throw credentialError;

    const { error: profileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", profileId);
    if (profileError) throw profileError;

    const { error: authError } = await admin.auth.admin.deleteUser(profileId);
    if (authError) throw authError;
  }

  const remaining = {};
  if (commitmentId) {
    for (const table of [
      "collective_commitments",
      "collective_commitment_keys",
      "collective_commitment_private_signatures",
      "collective_commitment_public_signers",
      "collective_commitment_receipts",
      "collective_commitment_events",
    ]) {
      const key = table === "collective_commitments" ? "id" : "commitment_id";
      const select = table === "collective_commitment_keys" ? "commitment_id" : "id";
      const { count, error } = await admin
        .from(table)
        .select(select, { count: "exact", head: true })
        .eq(key, commitmentId);
      if (error) throw error;
      remaining[table] = count ?? 0;
    }
  }
  if (profileId) {
    const { count: credentialCount, error: credentialCountError } = await admin
      .from("collective_identity_credentials")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId);
    if (credentialCountError) throw credentialCountError;
    remaining.collective_identity_credentials = credentialCount ?? 0;

    const { count: profileCount, error: profileCountError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", profileId);
    if (profileCountError) throw profileCountError;
    remaining.profiles = profileCount ?? 0;

    const { data: userData } = await admin.auth.admin.getUserById(profileId);
    remaining.auth_user = userData.user ? 1 : 0;
  }

  for (const [key, value] of Object.entries(remaining)) {
    assert.equal(value, 0, `Synthetic residue remained in ${key}.`);
  }
  audit.cleanup = { completed: true, remaining };
}

let browser;
let desktopContext;
try {
  await createSyntheticAccount();
  browser = await chromium.launch({ headless: true });
  desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await desktopContext.newPage();
  attachDiagnostics(page, "desktop");

  const defaultResponse = await page.goto(`${baseUrl}/trades/new`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  assert.equal(defaultResponse?.status(), 200, "Default Create route did not return HTTP 200.");
  assert.match(await page.title(), /Create/i);
  const frameLocator = page.frameLocator('iframe[data-create-interface-frame="true"]');
  await expect(frameLocator.getByText("Choose a cause to improve.")).toBeVisible();
  await frameLocator.getByRole("button", { name: /Global poverty/i }).click();
  await expect(
    frameLocator.getByRole("heading", { name: "What do you want other people to do?" }),
  ).toBeVisible();
  const requestKinds = frameLocator.locator("[data-request-kind]");
  assert.equal(await requestKinds.count(), 4, "Create did not render four request modes.");
  await expect(
    frameLocator.getByRole("button", { name: /Collective commitment/i }),
  ).toBeVisible();
  await screenshot(page, "01-create-four-modes");
  pass("create_entry_has_four_modes");

  await frameLocator.getByRole("button", { name: /Collective commitment/i }).click();
  await page.waitForURL(/\/trades\/new\?mode=collective(?:&cause=Global\+poverty|&cause=Global%20poverty)?/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Sign in to create a collective commitment." }),
  ).toBeVisible();
  assert.equal(
    await page.getByRole("navigation", { name: "Create modes" }).count(),
    1,
    "Collective sign-in gate is not part of the Create surface.",
  );
  await screenshot(page, "02-integrated-sign-in-gate");
  pass("collective_mode_routes_inside_create", page.url());

  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/trades\/new\?mode=collective/, { timeout: 45_000 });
  await expect(
    page.getByRole("heading", { name: "Commit privately. Reveal together." }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Collective Create Reviewer", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create a collective commitment" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Open and completed commitments" }),
  ).toBeVisible();
  await assertNoFrameworkOverlay(page, "desktop integrated workspace");
  await screenshot(page, "03-authenticated-collective-workspace");
  pass("authenticated_workspace_integrated");

  await page.getByLabel("Proposition type").selectOption("other_collective_action");
  await page.getByLabel("Verified-signer threshold").fill("2");
  await page.getByLabel("Title").fill(`${titlePrefix} placement smoke`);
  await page
    .getByLabel("Exact proposition")
    .fill("This synthetic proposition verifies that Collective Commitments are created inside the canonical Create route.");
  await page
    .getByLabel("Requirements for signers")
    .fill("Current synthetic QA credential for this exact integration run.");
  await page
    .getByLabel("Eligibility rule")
    .fill("Operator-approved synthetic reviewer account created by this run only.");
  await page.getByLabel(/I understand that every qualifying signer/).check();
  await page.getByRole("button", { name: "Create collective commitment" }).click();
  await page.waitForURL(/\/collective-commitments\/[0-9a-f-]{36}/i, { timeout: 45_000 });
  const match = new URL(page.url()).pathname.match(/\/collective-commitments\/([0-9a-f-]{36})/i);
  assert.ok(match, "Created commitment ID was not present in the exact-terms route.");
  audit.synthetic.commitmentId = match[1];
  await expect(page.getByText(`${titlePrefix} placement smoke`, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Collective commitment record" }),
  ).toBeVisible();
  await screenshot(page, "04-created-exact-terms-record");
  pass("created_from_integrated_form", audit.synthetic.commitmentId);

  await page.goto(`${baseUrl}/trades/new?mode=collective#collective-commitments-list`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByText(`${titlePrefix} placement smoke`, { exact: true })).toBeVisible();
  pass("created_record_listed_inside_create");

  const legacyRoutes = [
    ["/collective-commitments", "collective-commitments-list"],
    ["/collective-commitments/new", "collective-commitment-form"],
    ["/collective-commitments/identity", "collective-identity"],
  ];
  for (const [route, anchor] of legacyRoutes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForURL((url) =>
      url.pathname === "/trades/new" &&
      url.searchParams.get("mode") === "collective" &&
      url.hash === `#${anchor}`,
    );
  }
  pass("legacy_entries_redirect_into_create");

  const storageState = await desktopContext.storageState();
  for (const viewport of [
    { name: "mobile-390x844", width: 390, height: 844 },
    { name: "mobile-320x568", width: 320, height: 568 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      storageState,
    });
    const mobilePage = await context.newPage();
    attachDiagnostics(mobilePage, viewport.name);
    const response = await mobilePage.goto(`${baseUrl}/trades/new?mode=collective`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    assert.equal(response?.status(), 200, `${viewport.name}: integrated route was not HTTP 200.`);
    await expect(
      mobilePage.getByRole("heading", { name: "Commit privately. Reveal together." }),
    ).toBeVisible();
    await expect(
      mobilePage.getByRole("heading", { name: "Create a collective commitment" }),
    ).toBeVisible();
    const metrics = await assertNoHorizontalOverflow(mobilePage, viewport.name);
    await assertNoFrameworkOverlay(mobilePage, viewport.name);
    await screenshot(mobilePage, viewport.name, true);
    pass(`${viewport.name}_render`, JSON.stringify(metrics));
    await context.close();
  }

  assert.deepEqual(audit.diagnostics.consoleErrors, [], "Relevant console errors were detected.");
  assert.deepEqual(audit.diagnostics.pageErrors, [], "Page errors were detected.");
  assert.deepEqual(audit.diagnostics.failedRequests, [], "Unexpected same-origin request failures were detected.");
  assert.deepEqual(audit.diagnostics.errorResponses, [], "Unexpected same-origin HTTP errors were detected.");
  pass("runtime_diagnostics_clean");

  audit.outcome = "pass";
} catch (error) {
  audit.outcome = "fail";
  audit.error = error instanceof Error ? error.stack ?? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (desktopContext) await desktopContext.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupSyntheticState();
  } catch (cleanupError) {
    audit.cleanup.error =
      cleanupError instanceof Error ? cleanupError.stack ?? cleanupError.message : String(cleanupError);
    audit.outcome = "fail";
    process.exitCode = 1;
  }
  audit.completedAt = new Date().toISOString();
  await writeFile(
    path.join(artifactDir, "audit.json"),
    `${JSON.stringify(audit, null, 2)}\n`,
  );
}
