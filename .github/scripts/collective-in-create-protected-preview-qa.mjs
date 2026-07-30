import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.PREVIEW_BASE_URL ?? "").replace(/\/$/, "");
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = process.env.BROWSER_QA_ARTIFACT_DIR ?? "protected-preview-rendered-qa";
const expectedDeploymentId = process.env.EXPECTED_DEPLOYMENT_ID ?? "";
const expectedProductHead = process.env.EXPECTED_PRODUCT_HEAD ?? "";
const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString();
const titlePrefix = `[PROTECTED PREVIEW QA ${runId}]`;

for (const [name, value] of Object.entries({
  PREVIEW_BASE_URL: baseUrl,
  VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
})) {
  if (!value) throw new Error(`Missing required configuration: ${name}`);
}

await mkdir(artifactDir, { recursive: true });
await mkdir(path.join(artifactDir, "screenshots"), { recursive: true });
await mkdir(path.join(artifactDir, "videos"), { recursive: true });
await mkdir(path.join(artifactDir, "traces"), { recursive: true });

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const audit = {
  outcome: "running",
  flowUnderTest:
    "protected canonical Preview /trades/new -> Collective commitment mode -> authenticated creation -> two verified private signatures -> exact-threshold atomic reveal",
  environment: {
    baseUrl,
    deploymentId: expectedDeploymentId,
    exactProductHead: expectedProductHead,
    browserAvailability: "Browser plugin not available; regular Playwright used.",
    supabaseProject: new URL(supabaseUrl).hostname.split(".")[0],
  },
  generatedAt: new Date().toISOString(),
  synthetic: {
    creatorId: null,
    signerId: null,
    commitmentId: null,
    titlePrefix,
  },
  checks: [],
  screenshots: [],
  diagnostics: {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    errorResponses: [],
    ignored: [],
  },
  cleanup: { completed: false, remaining: {} },
};

function pass(name, detail = "") {
  audit.checks.push({ name, outcome: "pass", detail });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isExpectedNavigationAbort(url, failureText = "") {
  if (!/ERR_ABORTED|NS_BINDING_ABORTED|net::ERR_FAILED/i.test(failureText)) return false;
  const parsed = new URL(url, baseUrl);
  return (
    parsed.searchParams.has("_rsc") ||
    parsed.pathname.startsWith("/trades/new") ||
    parsed.pathname.startsWith("/collective-commitments") ||
    parsed.pathname === "/api/funnel-events"
  );
}

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    audit.diagnostics.consoleErrors.push({ label, text: message.text() });
  });
  page.on("pageerror", (error) => {
    audit.diagnostics.pageErrors.push({ label, text: error.message });
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failureText = request.failure()?.errorText ?? "failed";
    if (isExpectedNavigationAbort(url, failureText)) {
      audit.diagnostics.ignored.push({ label, kind: "request", url, failureText });
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
    if (url.includes("/api/funnel-events") && response.status() === 429) {
      audit.diagnostics.ignored.push({
        label,
        kind: "response",
        url,
        status: response.status(),
      });
      return;
    }
    audit.diagnostics.errorResponses.push({ label, url, status: response.status() });
  });
}

async function takeScreenshot(page, name, fullPage = false) {
  const fileName = `${name}.png`;
  await page.screenshot({
    path: path.join(artifactDir, "screenshots", fileName),
    fullPage,
  });
  audit.screenshots.push(fileName);
}

async function assertNoFrameworkOverlay(page, label) {
  const overlay = page.locator(
    "nextjs-portal, [data-nextjs-dialog-overlay], [data-vite-dev-id], [data-nextjs-toast]",
  );
  assert.equal(await overlay.count(), 0, `${label}: framework error overlay was rendered.`);
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
    `${label}: document overflow ${metrics.documentScroll}px > ${metrics.viewport}px.`,
  );
  assert.ok(
    metrics.bodyScroll <= metrics.viewport + 1,
    `${label}: body overflow ${metrics.bodyScroll}px > ${metrics.viewport}px.`,
  );
  return metrics;
}

async function createSyntheticParticipant(role, displayName, verifiedAffiliation) {
  const email = `qa-collective-protected-${runId}-${role}-${randomBytes(5).toString("hex")}@example.com`;
  const password = `Protected-${randomBytes(18).toString("base64url")}!`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (authError || !authData.user) {
    throw authError ?? new Error(`Could not create ${role} Auth user.`);
  }
  const id = authData.user.id;
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id,
      email,
      display_name: displayName,
      public_location_granularity: "hidden",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const verifiedAt = new Date();
  const { error: credentialError } = await admin
    .from("collective_identity_credentials")
    .insert({
      profile_id: id,
      credential_version: 1,
      status: "verified",
      verified_real_name: displayName,
      verified_affiliation: verifiedAffiliation,
      human_uniqueness_ref_hash: sha256(`protected-preview:${runId}:${role}:${id}`),
      provider: "MoralTrade protected Preview rendered QA",
      verification_method: "isolated synthetic operator fixture",
      assurance_tier: "enhanced-review",
      duplicate_check_result: "clear",
      manual_review_status: "approved",
      verified_at: verifiedAt.toISOString(),
      expires_at: new Date(verifiedAt.getTime() + 24 * 60 * 60_000).toISOString(),
    });
  if (credentialError) throw credentialError;

  return { id, email, password, displayName, verifiedAffiliation };
}

async function primeDeploymentProtection(context) {
  const response = await context.request.get(`${baseUrl}/`, {
    headers: {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    },
    maxRedirects: 0,
  });
  assert.ok(
    response.status() >= 200 && response.status() < 400,
    `Protection bypass bootstrap returned HTTP ${response.status()}.`,
  );
  const cookies = await context.cookies(baseUrl);
  assert.ok(
    cookies.some((cookie) => cookie.domain.includes(new URL(baseUrl).hostname)),
    "Protection bypass did not establish a deployment cookie.",
  );
}

async function newContext(browser, label, viewport, storageState) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
    storageState,
    recordVideo: {
      dir: path.join(artifactDir, "videos", label),
      size: viewport,
    },
  });
  await primeDeploymentProtection(context);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  return context;
}

async function closeContext(context, label) {
  await context.tracing.stop({ path: path.join(artifactDir, "traces", `${label}.zip`) });
  await context.close();
}

async function login(browser, account, label, viewport = { width: 1440, height: 900 }) {
  const context = await newContext(browser, label, viewport);
  const page = await context.newPage();
  attachDiagnostics(page, label);
  const returnTo = encodeURIComponent("/trades/new?mode=collective");
  const response = await page.goto(`${baseUrl}/login?returnTo=${returnTo}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  assert.equal(response?.status(), 200, `${label}: login page was not HTTP 200.`);
  assert.equal(new URL(page.url()).hostname, new URL(baseUrl).hostname, `${label}: protection challenge remained.`);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(
    (url) => url.pathname === "/trades/new" && url.searchParams.get("mode") === "collective",
    { timeout: 60_000 },
  );
  await expect(page.getByRole("heading", { name: "Commit privately. Reveal together." })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(account.displayName, { exact: true }).first()).toBeVisible();
  await assertNoFrameworkOverlay(page, `${label} login`);
  return { context, page };
}

async function cleanupSyntheticState(participants) {
  const creatorId = audit.synthetic.creatorId;
  const knownCommitmentIds = new Set();
  if (audit.synthetic.commitmentId) knownCommitmentIds.add(audit.synthetic.commitmentId);

  if (creatorId) {
    const { data: rows, error } = await admin
      .from("collective_commitments")
      .select("id,title")
      .eq("creator_id", creatorId)
      .like("title", `${titlePrefix}%`);
    if (error) throw error;
    for (const row of rows ?? []) knownCommitmentIds.add(row.id);
  }

  for (const commitmentId of knownCommitmentIds) {
    const { error } = await admin.from("collective_commitments").delete().eq("id", commitmentId);
    if (error) throw error;
  }

  for (const participant of participants) {
    if (!participant?.id) continue;
    const { error: credentialError } = await admin
      .from("collective_identity_credentials")
      .delete()
      .eq("profile_id", participant.id);
    if (credentialError) throw credentialError;

    const { error: profileError } = await admin.from("profiles").delete().eq("id", participant.id);
    if (profileError) throw profileError;

    const { error: authError } = await admin.auth.admin.deleteUser(participant.id);
    if (authError) throw authError;
  }

  const remaining = {};
  for (const commitmentId of knownCommitmentIds) {
    for (const table of [
      "collective_commitments",
      "collective_commitment_keys",
      "collective_commitment_private_signatures",
      "collective_commitment_public_signers",
      "collective_commitment_receipts",
      "collective_commitment_events",
    ]) {
      const filterColumn = table === "collective_commitments" ? "id" : "commitment_id";
      const selectColumn = table === "collective_commitment_keys" ? "commitment_id" : "id";
      const { count, error } = await admin
        .from(table)
        .select(selectColumn, { count: "exact", head: true })
        .eq(filterColumn, commitmentId);
      if (error) throw error;
      remaining[`${table}:${commitmentId}`] = count ?? 0;
    }
  }

  for (const participant of participants) {
    if (!participant?.id) continue;
    const { count: credentialCount, error: credentialError } = await admin
      .from("collective_identity_credentials")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", participant.id);
    if (credentialError) throw credentialError;
    remaining[`credential:${participant.id}`] = credentialCount ?? 0;

    const { count: profileCount, error: profileError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", participant.id);
    if (profileError) throw profileError;
    remaining[`profile:${participant.id}`] = profileCount ?? 0;

    const { data: authData, error: authLookupError } = await admin.auth.admin.getUserById(participant.id);
    remaining[`auth:${participant.id}`] = authLookupError || !authData.user ? 0 : 1;
  }

  for (const [key, value] of Object.entries(remaining)) {
    assert.equal(value, 0, `Synthetic residue remained in ${key}.`);
  }
  audit.cleanup = { completed: true, remaining };
}

let browser;
let anonymousContext;
let creatorSession;
let signerSession;
let creator;
let signer;

try {
  assert.equal(
    new URL(baseUrl).hostname,
    "moraltrade-site-bjpwnp35w-ellen-s.vercel.app",
    "Refusing to test an unexpected Preview hostname.",
  );
  creator = await createSyntheticParticipant(
    "creator",
    "Protected Preview Creator",
    "Moral Trade QA Organization",
  );
  signer = await createSyntheticParticipant(
    "signer",
    "Protected Preview Signer",
    "Private Signer Affiliation",
  );
  audit.synthetic.creatorId = creator.id;
  audit.synthetic.signerId = signer.id;
  pass("synthetic_verified_accounts", "2 isolated QA users with current credentials");

  browser = await chromium.launch({ headless: true });

  anonymousContext = await newContext(
    browser,
    "anonymous-desktop",
    { width: 1440, height: 900 },
  );
  const anonymousPage = await anonymousContext.newPage();
  attachDiagnostics(anonymousPage, "anonymous-desktop");
  const createResponse = await anonymousPage.goto(`${baseUrl}/trades/new`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  assert.equal(createResponse?.status(), 200, "Protected Create page was not HTTP 200.");
  assert.equal(new URL(anonymousPage.url()).hostname, new URL(baseUrl).hostname);
  assert.match(await anonymousPage.title(), /Create/i);
  const frame = anonymousPage.frameLocator('iframe[data-create-interface-frame="true"]');
  await expect(frame.getByText("Choose a cause to improve.")).toBeVisible();
  await frame.getByRole("button", { name: /Global poverty/i }).click();
  await expect(frame.getByRole("heading", { name: "What do you want other people to do?" })).toBeVisible();
  assert.equal(await frame.locator("[data-request-kind]").count(), 4);
  await expect(frame.getByRole("button", { name: /Collective commitment/i })).toBeVisible();
  await takeScreenshot(anonymousPage, "01-protected-create-four-modes");
  pass("protected_preview_page_identity", anonymousPage.url());
  pass("create_entry_has_four_modes");

  await frame.getByRole("button", { name: /Collective commitment/i }).click();
  await anonymousPage.waitForURL(
    (url) => url.pathname === "/trades/new" && url.searchParams.get("mode") === "collective",
    { timeout: 30_000 },
  );
  await expect(
    anonymousPage.getByRole("heading", { name: "Sign in to create a collective commitment." }),
  ).toBeVisible();
  assert.equal(await anonymousPage.getByRole("navigation", { name: "Create modes" }).count(), 1);
  await assertNoFrameworkOverlay(anonymousPage, "anonymous integrated sign-in gate");
  await takeScreenshot(anonymousPage, "02-protected-integrated-sign-in-gate");
  pass("anonymous_collective_mode_stays_inside_create");
  await closeContext(anonymousContext, "anonymous-desktop");
  anonymousContext = null;

  creatorSession = await login(browser, creator, "creator-desktop");
  const creatorPage = creatorSession.page;
  await expect(creatorPage.getByRole("heading", { name: "Create a collective commitment" })).toBeVisible();
  await expect(creatorPage.getByRole("heading", { name: "Open and completed commitments" })).toBeVisible();
  await takeScreenshot(creatorPage, "03-authenticated-integrated-workspace");
  pass("authenticated_workspace_rendered");

  await creatorPage.getByLabel("Proposition type").selectOption("workplace_organizing");
  await creatorPage.getByLabel("Verified-signer threshold").fill("2");
  await creatorPage.getByLabel("Title").fill(`${titlePrefix} workplace exact-threshold review`);
  await creatorPage
    .getByLabel("Exact proposition")
    .fill(
      "Two synthetic verified QA participants commit to publish this test proposition together when the exact threshold is reached.",
    );
  await creatorPage
    .getByLabel("Requirements for signers")
    .fill("Current isolated QA identity credential created for this protected Preview run.");
  await creatorPage
    .getByLabel("Eligibility rule")
    .fill("Only the two exact synthetic QA identities created by this workflow qualify.");
  await expect(creatorPage.getByText("High-risk proposition", { exact: true })).toBeVisible();
  await creatorPage
    .getByLabel(/I understand that every qualifying signer’s verified real name/)
    .check();
  await creatorPage
    .getByLabel(/I understand that the threshold and identity controls do not remove retaliation/)
    .check();
  await takeScreenshot(creatorPage, "04-high-risk-create-form-ready", true);
  await creatorPage.getByRole("button", { name: "Create collective commitment" }).click();
  await creatorPage.waitForURL(/\/collective-commitments\/[0-9a-f-]{36}/i, { timeout: 60_000 });
  const idMatch = new URL(creatorPage.url()).pathname.match(/\/collective-commitments\/([0-9a-f-]{36})/i);
  assert.ok(idMatch, "Created commitment ID was absent from the exact-terms URL.");
  const commitmentId = idMatch[1];
  audit.synthetic.commitmentId = commitmentId;
  await expect(creatorPage.getByText(`${titlePrefix} workplace exact-threshold review`, { exact: true })).toBeVisible();
  await expect(creatorPage.getByText("High-risk participation warning", { exact: true })).toBeVisible();
  await expect(creatorPage.getByText("0 / 2", { exact: true })).toBeVisible();
  await expect(creatorPage.getByRole("navigation", { name: "Collective commitment record" })).toBeVisible();
  await expect(creatorPage.getByText("Frozen-terms hash", { exact: true })).toBeVisible();
  pass("created_through_integrated_create", commitmentId);

  await creatorPage.getByLabel(/Publish my verified affiliation/).check();
  await creatorPage.getByLabel(/I accept the exact frozen proposition/).check();
  await creatorPage.getByLabel(/I understand that my verified real name will become public/).check();
  await creatorPage.getByLabel(/I understand that coordinated publication may expose me/).check();
  await creatorPage.getByRole("button", { name: "Sign privately" }).click({ noWaitAfter: true });
  await expect(creatorPage.getByRole("heading", { name: "Your private signature is counting" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(creatorPage.getByText("1 / 2", { exact: true })).toBeVisible();
  const creatorSignerSection = creatorPage.locator('section[aria-labelledby="revealed-signers-heading"]');
  await expect(creatorSignerSection).toContainText("No signer identity is public before successful activation.");
  await expect(creatorSignerSection).not.toContainText(creator.displayName);
  await expect(creatorSignerSection).not.toContainText(signer.displayName);
  await takeScreenshot(creatorPage, "05-open-one-of-two-identities-private", true);
  pass("first_private_signature_hidden");

  signerSession = await login(browser, signer, "signer-desktop");
  const signerPage = signerSession.page;
  await signerPage.goto(`${baseUrl}/collective-commitments/${commitmentId}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(signerPage.getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(signerPage.getByText("High-risk participation warning", { exact: true })).toBeVisible();
  const signerSectionBefore = signerPage.locator('section[aria-labelledby="revealed-signers-heading"]');
  await expect(signerSectionBefore).toContainText("No signer identity is public before successful activation.");
  await signerPage.getByLabel(/I accept the exact frozen proposition/).check();
  await signerPage.getByLabel(/I understand that my verified real name will become public/).check();
  await signerPage.getByLabel(/I understand that coordinated publication may expose me/).check();
  await expect(signerPage.getByLabel(/Publish my verified affiliation/)).not.toBeChecked();
  await signerPage.getByRole("button", { name: "Sign privately" }).click({ noWaitAfter: true });
  await expect(signerPage.getByRole("heading", { name: "Threshold reached" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(signerPage.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(signerPage.getByText("revealed", { exact: true })).toBeVisible();
  const revealedSection = signerPage.locator('section[aria-labelledby="revealed-signers-heading"]');
  await expect(revealedSection).toContainText(creator.displayName);
  await expect(revealedSection).toContainText(signer.displayName);
  await expect(revealedSection).toContainText(creator.verifiedAffiliation);
  await expect(revealedSection).toContainText("Affiliation not published");
  await expect(revealedSection).not.toContainText(signer.verifiedAffiliation);
  await expect(signerPage.getByRole("heading", { name: "Cryptographic outcome receipt" })).toBeVisible();
  await expect(signerPage.getByText("active", { exact: true }).first()).toBeVisible();
  assert.equal(await signerPage.getByRole("button", { name: "Withdraw private signature" }).count(), 0);
  await takeScreenshot(signerPage, "06-exact-threshold-atomic-reveal", true);
  pass("second_signature_activates_atomically");
  pass("affiliation_opt_in_respected");

  await creatorPage.reload({ waitUntil: "networkidle", timeout: 60_000 });
  await expect(creatorPage.getByRole("heading", { name: "Threshold reached" })).toBeVisible();
  await expect(creatorPage.getByText(signer.displayName, { exact: true })).toBeVisible();
  pass("active_state_consistent_across_authenticated_sessions");

  const legacyRoutes = [
    ["/collective-commitments", "collective-commitments-list"],
    ["/collective-commitments/new", "collective-commitment-form"],
    ["/collective-commitments/identity", "collective-identity"],
  ];
  for (const [route, anchor] of legacyRoutes) {
    await creatorPage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await creatorPage.waitForURL(
      (url) =>
        url.pathname === "/trades/new" &&
        url.searchParams.get("mode") === "collective" &&
        url.hash === `#${anchor}`,
      { timeout: 30_000 },
    );
  }
  pass("legacy_routes_redirect_into_create");

  const creatorStorage = await creatorSession.context.storageState();
  const mobile390 = await newContext(
    browser,
    "creator-mobile-390",
    { width: 390, height: 844 },
    creatorStorage,
  );
  const mobile390Page = await mobile390.newPage();
  attachDiagnostics(mobile390Page, "creator-mobile-390");
  const mobileCreateResponse = await mobile390Page.goto(`${baseUrl}/trades/new?mode=collective`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  assert.equal(mobileCreateResponse?.status(), 200);
  await expect(mobile390Page.getByRole("heading", { name: "Commit privately. Reveal together." })).toBeVisible();
  await expect(mobile390Page.getByRole("heading", { name: "Create a collective commitment" })).toBeVisible();
  const mobile390Metrics = await assertNoHorizontalOverflow(mobile390Page, "390x844 Create workspace");
  await assertNoFrameworkOverlay(mobile390Page, "390x844 Create workspace");
  await takeScreenshot(mobile390Page, "07-mobile-390-integrated-create", true);
  pass("mobile_390_render", JSON.stringify(mobile390Metrics));
  await closeContext(mobile390, "creator-mobile-390");

  const signerStorage = await signerSession.context.storageState();
  const mobile320 = await newContext(
    browser,
    "signer-mobile-320",
    { width: 320, height: 568 },
    signerStorage,
  );
  const mobile320Page = await mobile320.newPage();
  attachDiagnostics(mobile320Page, "signer-mobile-320");
  const mobileActiveResponse = await mobile320Page.goto(
    `${baseUrl}/collective-commitments/${commitmentId}`,
    { waitUntil: "networkidle", timeout: 60_000 },
  );
  assert.equal(mobileActiveResponse?.status(), 200);
  await expect(mobile320Page.getByRole("heading", { name: "Threshold reached" })).toBeVisible();
  await expect(mobile320Page.getByText(creator.displayName, { exact: true })).toBeVisible();
  await expect(mobile320Page.getByText(signer.displayName, { exact: true })).toBeVisible();
  const mobile320Metrics = await assertNoHorizontalOverflow(mobile320Page, "320x568 active record");
  await assertNoFrameworkOverlay(mobile320Page, "320x568 active record");
  await takeScreenshot(mobile320Page, "08-mobile-320-active-record", true);
  pass("mobile_320_render", JSON.stringify(mobile320Metrics));
  await closeContext(mobile320, "signer-mobile-320");

  assert.deepEqual(audit.diagnostics.consoleErrors, [], "Relevant console errors were detected.");
  assert.deepEqual(audit.diagnostics.pageErrors, [], "Page errors were detected.");
  assert.deepEqual(audit.diagnostics.failedRequests, [], "Unexpected same-origin request failures were detected.");
  assert.deepEqual(audit.diagnostics.errorResponses, [], "Unexpected same-origin HTTP errors were detected.");
  pass("console_and_runtime_health");
  audit.outcome = "pass";
} catch (error) {
  audit.outcome = "fail";
  audit.error = error instanceof Error ? error.stack ?? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (anonymousContext) await closeContext(anonymousContext, "anonymous-desktop").catch(() => {});
  if (creatorSession?.context) await closeContext(creatorSession.context, "creator-desktop").catch(() => {});
  if (signerSession?.context) await closeContext(signerSession.context, "signer-desktop").catch(() => {});
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupSyntheticState([creator, signer]);
  } catch (cleanupError) {
    audit.cleanup.error =
      cleanupError instanceof Error ? cleanupError.stack ?? cleanupError.message : String(cleanupError);
    audit.outcome = "fail";
    process.exitCode = 1;
  }
  audit.completedAt = new Date().toISOString();
  await writeFile(path.join(artifactDir, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
}
