#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_QA_REF = "hvmxfjjbdcgjjudmthdz";
const USER_PREFIX = "qa-collective-adversarial-";
const TITLE_PREFIX = "[QA collective adversarial ";
const PROPOSITION_TYPES = [
  { value: "public_letter", label: "Open or closed letter", highRisk: true },
  {
    value: "workplace_organizing",
    label: "Workplace organizing or unionization intention",
    highRisk: true,
  },
  { value: "whistleblowing", label: "Coordinated whistleblowing", highRisk: true },
  {
    value: "political_dissent",
    label: "Political-party dissent or defection",
    highRisk: true,
  },
  {
    value: "funding_pledge",
    label: "High-net-worth or institutional funding pledge",
    highRisk: true,
  },
  {
    value: "other_collective_action",
    label: "Other identity-threshold commitment",
    highRisk: false,
  },
];

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const baseURL = required("BROWSER_QA_BASE_URL").replace(/\/$/, "");
const qaURL = required("QA_SUPABASE_URL").replace(/\/$/, "");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const password = required("QA_TEST_PASSWORD");
const cronSecret = required("CRON_SECRET");
const artifactDir = path.resolve(
  process.env.BROWSER_QA_ARTIFACT_DIR || "collective-commitments-browser-qa-artifacts",
);
const runTag = String(process.env.GITHUB_RUN_ID || Date.now());

const encodedMasterKey = required("COLLECTIVE_COMMITMENT_MASTER_KEY");
const collectiveMasterKey = Buffer.from(encodedMasterKey, "base64");
if (collectiveMasterKey.length !== 32) {
  throw new Error("COLLECTIVE_COMMITMENT_MASTER_KEY must decode to exactly 32 bytes.");
}

const AES_GCM_ALGORITHM = "aes-256-gcm";
const AES_GCM_IV_BYTES = 12;

function hmacSha256Hex(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function decryptBytes(key, payload, aad) {
  const decipher = createDecipheriv(
    AES_GCM_ALGORITHM,
    key,
    Buffer.from(payload.ivBase64, "base64"),
  );
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(payload.tagBase64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertextBase64, "base64")),
    decipher.final(),
  ]);
}

function encryptBytes(key, plaintext, aad) {
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv(AES_GCM_ALGORITHM, key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertextBase64: ciphertext.toString("base64"),
    ivBase64: iv.toString("base64"),
    tagBase64: tag.toString("base64"),
  };
}

function deriveKey(dataKey, purpose) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      dataKey,
      Buffer.from("moral-trade-collective-commitments-v1", "utf8"),
      Buffer.from(purpose, "utf8"),
      32,
    ),
  );
}

function deriveSignatureEncryptionKey(dataKey) {
  return deriveKey(dataKey, "signature-encryption");
}

function deriveAccountTokenKey(dataKey) {
  return deriveKey(dataKey, "account-token");
}

function deriveHumanTokenKey(dataKey) {
  return deriveKey(dataKey, "human-token");
}

function deriveRevealMacKey(dataKey) {
  return deriveKey(dataKey, "reveal-manifest-mac");
}

function unwrapCommitmentDataKey(commitmentId, payload) {
  return decryptBytes(
    collectiveMasterKey,
    payload,
    Buffer.from(`collective-commitment-key:${commitmentId}`, "utf8"),
  );
}

function createAccountToken(dataKey, profileId) {
  return hmacSha256Hex(deriveAccountTokenKey(dataKey), profileId);
}

function createHumanToken(dataKey, humanUniquenessRefHash) {
  return hmacSha256Hex(deriveHumanTokenKey(dataKey), humanUniquenessRefHash);
}

function createRevealNonce() {
  return randomBytes(24).toString("hex");
}

function canonicalRevealString({ verifiedRealName, verifiedAffiliation, revealNonce }) {
  return [verifiedRealName.trim(), verifiedAffiliation?.trim() ?? "", revealNonce].join("\n");
}

function createIdentityCommitment(dataKey, input) {
  return hmacSha256Hex(deriveRevealMacKey(dataKey), canonicalRevealString(input));
}

function encryptSignaturePayload(commitmentId, dataKey, payload) {
  return encryptBytes(
    deriveSignatureEncryptionKey(dataKey),
    Buffer.from(JSON.stringify(payload), "utf8"),
    Buffer.from(`collective-signature:${commitmentId}`, "utf8"),
  );
}

function decryptSignaturePayload(commitmentId, dataKey, payload) {
  const plaintext = decryptBytes(
    deriveSignatureEncryptionKey(dataKey),
    payload,
    Buffer.from(`collective-signature:${commitmentId}`, "utf8"),
  );
  return JSON.parse(plaintext.toString("utf8"));
}

if (new URL(qaURL).hostname !== `${REQUIRED_QA_REF}.supabase.co`) {
  throw new Error(`Refusing non-QA Supabase target: ${qaURL}`);
}
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) {
  throw new Error(`Refusing non-local browser target: ${baseURL}`);
}
if (password.length < 14) throw new Error("QA_TEST_PASSWORD must contain at least 14 characters.");
if (process.env.COLLECTIVE_COMMITMENTS_ENABLED !== "true") {
  throw new Error("COLLECTIVE_COMMITMENTS_ENABLED must be exactly true for isolated QA.");
}

const admin = createClient(qaURL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const audit = {
  startedAt: new Date().toISOString(),
  target: {
    qaProjectRef: REQUIRED_QA_REF,
    baseURL,
    productHead: String(process.env.EXPECTED_PRODUCT_HEAD || "unknown"),
    runTag,
  },
  checks: [],
  sessions: [],
  users: [],
  commitments: [],
  databaseAssertions: [],
  cleanup: null,
  outcome: "running",
  completedAt: null,
};

const createdUsers = [];
const createdCredentialIds = [];
const createdCommitmentIds = [];
const sessions = [];
let browser;

function cleanError(error) {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return raw
    .replaceAll(password, "[REDACTED]")
    .replaceAll(serviceRoleKey, "[REDACTED]")
    .replaceAll(publishableKey, "[REDACTED]")
    .replaceAll(cronSecret, "[REDACTED]");
}

async function recordCheck(name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const detail = (await fn()) ?? "passed";
    audit.checks.push({
      name,
      outcome: "pass",
      detail,
      startedAt,
      completedAt: new Date().toISOString(),
    });
    console.log(`PASS: ${name}`);
    return detail;
  } catch (error) {
    const detail = cleanError(error);
    audit.checks.push({
      name,
      outcome: "fail",
      detail,
      startedAt,
      completedAt: new Date().toISOString(),
    });
    console.error(`FAIL: ${name}: ${detail}`);
    throw error;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isApplicationOrigin(url) {
  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}

async function createSession({ label, viewport, user }) {
  const sessionDir = path.join(artifactDir, label);
  await mkdir(sessionDir, { recursive: true });
  const diagnostics = {
    label,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };
  const context = await browser.newContext({
    baseURL,
    viewport,
    reducedMotion: "reduce",
    recordVideo: { dir: path.join(sessionDir, "video"), size: viewport },
  });
  await context.addCookies([
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(cleanError(error)));
  page.on("requestfailed", (request) => {
    if (!isApplicationOrigin(request.url())) return;
    const failure = request.failure()?.errorText ?? "unknown request failure";
    if (failure === "net::ERR_ABORTED" || request.resourceType() === "ping") return;
    diagnostics.failedRequests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure,
    });
  });
  page.on("response", (response) => {
    const request = response.request();
    if (
      isApplicationOrigin(response.url()) &&
      response.status() >= 400 &&
      ["document", "fetch", "xhr"].includes(request.resourceType())
    ) {
      diagnostics.badResponses.push({
        method: request.method(),
        resourceType: request.resourceType(),
        status: response.status(),
        url: response.url(),
      });
    }
  });
  const session = {
    label,
    user,
    page,
    context,
    sessionDir,
    diagnostics,
    closed: false,
    async screenshot(name, fullPage = true) {
      await page.screenshot({ path: path.join(sessionDir, `${name}.png`), fullPage });
    },
    async close() {
      if (this.closed) return;
      this.closed = true;
      await context.tracing.stop({ path: path.join(sessionDir, "trace.zip") }).catch(() => {});
      await context.close().catch(() => {});
      audit.sessions.push(diagnostics);
    },
  };
  sessions.push(session);
  return session;
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(
    dimensions.documentWidth,
    `${label} has horizontal overflow: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 3);
}

async function login(session, returnTo = "/collective-commitments") {
  const { page, user } = session;
  await page.goto(`/login?method=email&returnTo=${encodeURIComponent(returnTo)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
}

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function createAuthUser(role, displayName) {
  const safeRun = runTag.replace(/[^a-zA-Z0-9]/g, "").slice(-20);
  const email = `${USER_PREFIX}${safeRun}-${role}@example.com`.toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    const exactRunTitle = `${TITLE_PREFIX}${runTag}]%`;
    const { data: priorCommitments, error: priorCommitmentsError } = await admin
      .from("collective_commitments")
      .select("id")
      .eq("creator_id", existing.id)
      .like("title", exactRunTitle);
    if (priorCommitmentsError) throw new Error(priorCommitmentsError.message);
    const priorIds = (priorCommitments ?? []).map((row) => row.id);
    if (priorIds.length) {
      const { error: priorDeleteError } = await admin
        .from("collective_commitments")
        .delete()
        .in("id", priorIds);
      if (priorDeleteError) throw new Error(priorDeleteError.message);
    }
    const { error: credentialDeleteError } = await admin
      .from("collective_identity_credentials")
      .delete()
      .eq("profile_id", existing.id);
    if (credentialDeleteError) throw new Error(credentialDeleteError.message);
    const { error: existingDeleteError } = await admin.auth.admin.deleteUser(existing.id);
    if (existingDeleteError) throw new Error(existingDeleteError.message);
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(error?.message || `Could not create ${role}.`);
  const user = { id: data.user.id, email, displayName, role };
  createdUsers.push(user);
  audit.users.push({ id: user.id, email, role });

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    email,
    display_name: displayName,
    public_location_granularity: "hidden",
  });
  if (profileError) throw new Error(profileError.message);
  return user;
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function insertCredential(user, {
  realName,
  affiliation = "",
  humanRef,
  version = 1,
  status = "verified",
  expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
} = {}) {
  const row = {
    profile_id: user.id,
    credential_version: version,
    status,
    verified_real_name: realName,
    verified_affiliation: affiliation,
    human_uniqueness_ref_hash: humanRef,
    provider: "qa-synthetic-operator",
    verification_method: "isolated authenticated adversarial browser QA",
    assurance_tier: "enhanced-qa",
    duplicate_check_result: "clear",
    manual_review_status: "approved",
    verified_at: new Date().toISOString(),
    expires_at: expiresAt,
  };
  const { data, error } = await admin
    .from("collective_identity_credentials")
    .insert(row)
    .select("id,profile_id,credential_version")
    .single();
  if (error) throw new Error(error.message);
  createdCredentialIds.push(data.id);
  return data;
}

async function createCommitmentThroughBrowser(session, {
  propositionType,
  titleSuffix,
  threshold = 4,
  deadline = new Date(Date.now() + 30 * 60_000),
  screenshot = false,
} = {}) {
  const typeMeta = PROPOSITION_TYPES.find((item) => item.value === propositionType);
  if (!typeMeta) throw new Error(`Unknown proposition type: ${propositionType}`);
  const { page } = session;
  const title = `${TITLE_PREFIX}${runTag}] ${titleSuffix}`;
  await page.goto("/collective-commitments/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Freeze the proposition before anyone signs." })).toBeVisible();
  await page.getByLabel("Proposition type").selectOption(propositionType);
  await page.getByLabel("Verified-signer threshold").fill(String(threshold));
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Exact proposition").fill(
    `Synthetic ${typeMeta.label} proposition for isolated run ${runTag}; no real person, employer, party, institution, or disclosure is involved.`,
  );
  await page.getByLabel("Requirements for signers").fill(
    "Must be one of the synthetic verified QA identities created for this exact workflow run.",
  );
  await page.getByLabel("Eligibility rule").fill(
    `Exact auth-user and operator-reviewed synthetic credential set for run ${runTag}.`,
  );
  await page.getByLabel("Deadline").fill(localDateTimeValue(deadline));
  if (typeMeta.highRisk) {
    await expect(page.getByText("High-risk proposition", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByText("Standard-risk proposition", { exact: true })).toBeVisible();
  }
  await page.getByLabel(/every qualifying signer’s verified real name will be published together/i).check();
  if (typeMeta.highRisk) {
    await page.getByLabel(/threshold and identity controls do not remove retaliation/i).check();
  }
  await Promise.all([
    page.waitForURL(/\/collective-commitments\/[0-9a-f-]+$/i, { timeout: 30_000 }),
    page.getByRole("button", { name: "Create collective commitment" }).click(),
  ]);
  const commitmentId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
  if (!commitmentId) throw new Error("Could not determine created commitment ID.");
  createdCommitmentIds.push(commitmentId);
  audit.commitments.push({ id: commitmentId, propositionType, title, threshold, deadline: deadline.toISOString() });
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(typeMeta.label, { exact: true }).first()).toBeVisible();
  if (screenshot) await session.screenshot(`created-${propositionType}`);
  return { id: commitmentId, title, deadline, propositionType };
}

async function prepareSignForm(session, commitment, { publishAffiliation = false } = {}) {
  const { page } = session;
  await page.goto(`/collective-commitments/${commitment.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: commitment.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign privately" })).toBeVisible();
  if (publishAffiliation) {
    const affiliation = page.getByLabel(/Publish my verified affiliation/);
    if (await affiliation.count()) await affiliation.check();
  }
  await page.getByLabel(/I accept the exact frozen proposition/).check();
  await page.getByLabel(/my verified real name will become public/).check();
  const highRisk = page.getByLabel(/coordinated publication may expose me/);
  if (await highRisk.count()) await highRisk.check();
  return page.getByRole("button", { name: "Sign privately" });
}

async function signThroughBrowser(session, commitment, options = {}) {
  const button = await prepareSignForm(session, commitment, options);
  await button.click();
  const status = session.page.locator('[role="status"]');
  await expect(status).toBeVisible({ timeout: 30_000 });
  return (await status.innerText()).trim();
}

async function loadCommitmentRow(id) {
  const { data, error } = await admin
    .from("collective_commitments")
    .select("id,status,threshold_count,deadline_at,terms_hash,activation_token")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function tableCount(table, column, value) {
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function assertPrivateCount(id, expected) {
  expect(await tableCount("collective_commitment_private_signatures", "commitment_id", id)).toBe(expected);
}

async function assertPublicCount(id, expected) {
  expect(await tableCount("collective_commitment_public_signers", "commitment_id", id)).toBe(expected);
}

async function assertKeyCount(id, expected) {
  expect(await tableCount("collective_commitment_keys", "commitment_id", id)).toBe(expected);
}

async function directAddSignature(commitmentId, user, credential, { publishAffiliation = false } = {}) {
  const { data: keyRow, error: keyError } = await admin
    .from("collective_commitment_keys")
    .select("commitment_id,wrapped_key_ciphertext,wrapped_key_iv,wrapped_key_tag")
    .eq("commitment_id", commitmentId)
    .single();
  if (keyError) throw new Error(keyError.message);
  const dataKey = unwrapCommitmentDataKey(commitmentId, {
    ciphertextBase64: keyRow.wrapped_key_ciphertext,
    ivBase64: keyRow.wrapped_key_iv,
    tagBase64: keyRow.wrapped_key_tag,
  });
  const { data: credentialRow, error: credentialError } = await admin
    .from("collective_identity_credentials")
    .select("*")
    .eq("id", credential.id)
    .single();
  if (credentialError) throw new Error(credentialError.message);
  const revealNonce = createRevealNonce();
  const verifiedAffiliation = publishAffiliation && credentialRow.verified_affiliation.trim()
    ? credentialRow.verified_affiliation.trim()
    : null;
  const identityCommitment = createIdentityCommitment(dataKey, {
    verifiedRealName: credentialRow.verified_real_name,
    verifiedAffiliation,
    revealNonce,
  });
  const signedAt = new Date().toISOString();
  const payload = {
    profileId: user.id,
    credentialId: credentialRow.id,
    credentialVersion: credentialRow.credential_version,
    verifiedRealName: credentialRow.verified_real_name,
    verifiedAffiliation,
    credentialVerifiedAt: credentialRow.verified_at,
    credentialExpiresAt: credentialRow.expires_at,
    revealNonce,
    identityCommitment,
  };
  const encrypted = encryptSignaturePayload(commitmentId, dataKey, payload);
  const { data, error } = await admin.rpc("add_collective_commitment_signature_v1", {
    p_commitment_id: commitmentId,
    p_account_token: createAccountToken(dataKey, user.id),
    p_human_token: createHumanToken(dataKey, credentialRow.human_uniqueness_ref_hash),
    p_identity_commitment: identityCommitment,
    p_reveal_nonce: revealNonce,
    p_encrypted_identity_payload: encrypted.ciphertextBase64,
    p_payload_iv: encrypted.ivBase64,
    p_payload_tag: encrypted.tagBase64,
    p_signed_at: signedAt,
  });
  if (error) throw new Error(error.message);
  return {
    result: data,
    dataKey,
    manifestEntry: {
      signatureId: data.signatureId,
      verifiedRealName: credentialRow.verified_real_name,
      verifiedAffiliation,
      revealNonce,
      identityCommitment,
    },
  };
}

async function readManifestForExistingSignatures(commitmentId) {
  const { data: keyRow, error: keyError } = await admin
    .from("collective_commitment_keys")
    .select("commitment_id,wrapped_key_ciphertext,wrapped_key_iv,wrapped_key_tag")
    .eq("commitment_id", commitmentId)
    .single();
  if (keyError) throw new Error(keyError.message);
  const dataKey = unwrapCommitmentDataKey(commitmentId, {
    ciphertextBase64: keyRow.wrapped_key_ciphertext,
    ivBase64: keyRow.wrapped_key_iv,
    tagBase64: keyRow.wrapped_key_tag,
  });
  const { data: signatures, error } = await admin
    .from("collective_commitment_private_signatures")
    .select("id,identity_commitment,reveal_nonce,encrypted_identity_payload,payload_iv,payload_tag,signed_at")
    .eq("commitment_id", commitmentId)
    .order("signed_at")
    .order("id");
  if (error) throw new Error(error.message);
  const manifest = signatures.map((signature) => {
    const payload = decryptSignaturePayload(commitmentId, dataKey, {
      ciphertextBase64: signature.encrypted_identity_payload,
      ivBase64: signature.payload_iv,
      tagBase64: signature.payload_tag,
    });
    return {
      signatureId: signature.id,
      verifiedRealName: payload.verifiedRealName,
      verifiedAffiliation: payload.verifiedAffiliation,
      revealNonce: payload.revealNonce,
      identityCommitment: payload.identityCommitment,
    };
  });
  return { dataKey, manifest };
}

async function expectRpcError(promise, pattern) {
  const { error } = await promise;
  expect(error?.message ?? "", `Expected RPC error matching ${pattern}`).toMatch(pattern);
}

async function writeAudit() {
  audit.completedAt = new Date().toISOString();
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  const lines = [
    "# Collective commitments authenticated adversarial browser QA",
    "",
    `- Outcome: **${audit.outcome}**`,
    `- Product head: \`${audit.target.productHead}\``,
    `- QA project: \`${audit.target.qaProjectRef}\``,
    `- Browser target: \`${audit.target.baseURL}\``,
    "- Browser path: Playwright Chromium (Browser plugin unavailable in this session)",
    "",
    "## Checks",
    "",
    ...audit.checks.map((check) =>
      `- ${check.outcome === "pass" ? "PASS" : "FAIL"}: ${check.name} — ${check.detail}`,
    ),
    "",
    "## Diagnostics",
    "",
    ...audit.sessions.flatMap((session) => [
      `### ${session.label}`,
      `- Console errors: ${session.consoleErrors.length}`,
      `- Page errors: ${session.pageErrors.length}`,
      `- Failed same-origin requests: ${session.failedRequests.length}`,
      `- Same-origin HTTP errors: ${session.badResponses.length}`,
      "",
    ]),
    "## Cleanup",
    "",
    `- ${JSON.stringify(audit.cleanup ?? {})}`,
  ];
  await writeFile(path.join(artifactDir, "report.md"), `${lines.join("\n")}\n`);
}

async function cleanup() {
  const result = {
    commitmentIds: [...createdCommitmentIds],
    credentialIds: [...createdCredentialIds],
    userIds: createdUsers.map((user) => user.id),
    deleted: {},
    remaining: {},
  };
  if (createdCommitmentIds.length) {
    const { error } = await admin.from("collective_commitments").delete().in("id", createdCommitmentIds);
    if (error) result.deleted.commitmentsError = error.message;
  }
  if (createdCredentialIds.length) {
    const { error } = await admin.from("collective_identity_credentials").delete().in("id", createdCredentialIds);
    if (error) result.deleted.credentialsError = error.message;
  }
  for (const user of [...createdUsers].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) result.deleted[`user:${user.id}`] = error.message;
  }

  const tableChecks = [
    "collective_commitment_keys",
    "collective_commitment_private_signatures",
    "collective_commitment_public_signers",
    "collective_commitment_receipts",
    "collective_commitment_events",
    "collective_commitments",
  ];
  for (const table of tableChecks) {
    if (!createdCommitmentIds.length) {
      result.remaining[table] = 0;
      continue;
    }
    const column = table === "collective_commitments" ? "id" : "commitment_id";
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, createdCommitmentIds);
    result.remaining[table] = error ? `ERROR:${error.message}` : count ?? 0;
  }
  if (createdCredentialIds.length) {
    const { count, error } = await admin
      .from("collective_identity_credentials")
      .select("id", { count: "exact", head: true })
      .in("id", createdCredentialIds);
    result.remaining.collective_identity_credentials = error ? `ERROR:${error.message}` : count ?? 0;
  } else {
    result.remaining.collective_identity_credentials = 0;
  }
  if (createdUsers.length) {
    const { count, error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("id", createdUsers.map((user) => user.id));
    result.remaining.profiles = error ? `ERROR:${error.message}` : count ?? 0;
  } else {
    result.remaining.profiles = 0;
  }
  const remainingAuth = [];
  for (const user of createdUsers) {
    if (await findUserByEmail(user.email)) remainingAuth.push(user.email);
  }
  result.remaining.authUsers = remainingAuth;
  audit.cleanup = result;
  return result;
}

await mkdir(artifactDir, { recursive: true });
await writeAudit();

try {
  await recordCheck("create isolated verified identities", async () => {
    const creator = await createAuthUser("creator", "QA Collective Creator");
    const signerA = await createAuthUser("signer-a", "QA Verified Alice");
    const signerB = await createAuthUser("signer-b", "QA Verified Bob");
    const signerC = await createAuthUser("signer-c", "QA Verified Carol");
    const duplicateA = await createAuthUser("duplicate-a", "QA Duplicate Alice Account");
    const signerD = await createAuthUser("signer-d", "QA Verified Dana");
    const outsider = await createAuthUser("outsider", "QA Authenticated Outsider");
    const humanA = sha256(`human-a:${runTag}`);
    const credentials = {};
    credentials.creator = await insertCredential(creator, {
      realName: "QA Collective Creator",
      affiliation: "MoralTrade QA",
      humanRef: sha256(`creator:${runTag}`),
    });
    credentials.signerA = await insertCredential(signerA, {
      realName: "Alice Verified QA",
      affiliation: "Example Institute",
      humanRef: humanA,
    });
    credentials.signerB = await insertCredential(signerB, {
      realName: "Bob Verified QA",
      affiliation: "Example Union",
      humanRef: sha256(`human-b:${runTag}`),
    });
    credentials.signerC = await insertCredential(signerC, {
      realName: "Carol Verified QA",
      affiliation: "Example Foundation",
      humanRef: sha256(`human-c:${runTag}`),
    });
    credentials.duplicateA = await insertCredential(duplicateA, {
      realName: "Alice Duplicate QA",
      affiliation: "Duplicate Test",
      humanRef: humanA,
    });
    credentials.signerD = await insertCredential(signerD, {
      realName: "Dana Verified QA",
      affiliation: "Example Lab",
      humanRef: sha256(`human-d:${runTag}`),
    });
    globalThis.qaActors = { creator, signerA, signerB, signerC, duplicateA, signerD, outsider, credentials };
    return "created seven exact synthetic auth users; six received operator-approved credentials, with one deliberate duplicate-human pair";
  });

  browser = await chromium.launch({ headless: true });
  const actors = globalThis.qaActors;
  const creatorSession = await createSession({
    label: "desktop-creator-1440x900",
    viewport: { width: 1440, height: 900 },
    user: actors.creator,
  });
  const signerASession = await createSession({
    label: "desktop-signer-a-1440x900",
    viewport: { width: 1440, height: 900 },
    user: actors.signerA,
  });
  const signerBSession = await createSession({
    label: "desktop-signer-b-1440x900",
    viewport: { width: 1440, height: 900 },
    user: actors.signerB,
  });
  const signerCSession = await createSession({
    label: "mobile-signer-c-390x844",
    viewport: { width: 390, height: 844 },
    user: actors.signerC,
  });
  const duplicateSession = await createSession({
    label: "desktop-duplicate-human-1440x900",
    viewport: { width: 1440, height: 900 },
    user: actors.duplicateA,
  });
  const signerDSession = await createSession({
    label: "desktop-signer-d-1440x900",
    viewport: { width: 1440, height: 900 },
    user: actors.signerD,
  });
  const outsiderSession = await createSession({
    label: "desktop-outsider-1440x900",
    viewport: { width: 1440, height: 900 },
    user: actors.outsider,
  });

  await recordCheck("authenticate all browser participants", async () => {
    for (const session of [
      creatorSession,
      signerASession,
      signerBSession,
      signerCSession,
      duplicateSession,
      signerDSession,
      outsiderSession,
    ]) {
      await login(session);
    }
    return "creator, four distinct verified humans, one duplicate-human account, and one outsider authenticated through rendered email/password login";
  });

  await recordCheck("every proposition class and risk acknowledgment", async () => {
    for (const meta of PROPOSITION_TYPES) {
      const commitment = await createCommitmentThroughBrowser(creatorSession, {
        propositionType: meta.value,
        titleSuffix: `class-${meta.value}`,
        threshold: 4,
        screenshot: meta.value === "workplace_organizing" || meta.value === "other_collective_action",
      });
      const { data, error } = await admin
        .from("collective_commitments")
        .select("proposition_type,risk_class,risk_dimensions,status")
        .eq("id", commitment.id)
        .single();
      if (error) throw new Error(error.message);
      expect(data.proposition_type).toBe(meta.value);
      expect(data.risk_class).toBe(meta.highRisk ? "high" : "standard");
      expect(data.status).toBe("open");
    }
    await assertNoHorizontalOverflow(creatorSession.page, "all proposition classes creator flow");
    return "created and persisted public letter, workplace organizing, whistleblowing, political dissent, funding pledge, and other collective-action classes with the expected high/standard risk controls";
  });

  let withdrawalCommitment;
  await recordCheck("withdrawal, re-signing, and duplicate-human rejection", async () => {
    withdrawalCommitment = await createCommitmentThroughBrowser(creatorSession, {
      propositionType: "other_collective_action",
      titleSuffix: "withdraw-resign-duplicate-human",
      threshold: 3,
      screenshot: true,
    });
    const firstMessage = await signThroughBrowser(signerASession, withdrawalCommitment, {
      publishAffiliation: true,
    });
    expect(firstMessage).toMatch(/Signature recorded privately\. 1 verified signer currently counts\./);
    await assertPrivateCount(withdrawalCommitment.id, 1);
    await expect(signerASession.page.getByRole("heading", { name: "Your private signature is counting" })).toBeVisible();
    await signerASession.page.getByRole("button", { name: "Withdraw private signature" }).click();
    await expect(signerASession.page.locator('[role="status"]')).toContainText("Signature withdrawn. 0 verified signers remain.");
    await assertPrivateCount(withdrawalCommitment.id, 0);
    const resignMessage = await signThroughBrowser(signerASession, withdrawalCommitment, {
      publishAffiliation: true,
    });
    expect(resignMessage).toMatch(/1 verified signer currently counts/);
    await assertPrivateCount(withdrawalCommitment.id, 1);

    const duplicateMessage = await signThroughBrowser(duplicateSession, withdrawalCommitment);
    expect(duplicateMessage).toBe(
      "A verified human represented by another account has already signed this commitment.",
    );
    await assertPrivateCount(withdrawalCommitment.id, 1);
    await assertPublicCount(withdrawalCommitment.id, 0);
    await duplicateSession.screenshot("duplicate-human-rejected");
    return "private count moved 1→0→1, and a distinct account with the same verified-human reference was rejected without publishing a name";
  });

  let staleCommitment;
  await recordCheck("stale credential invalidation and recovery", async () => {
    staleCommitment = await createCommitmentThroughBrowser(creatorSession, {
      propositionType: "public_letter",
      titleSuffix: "stale-credential-release",
      threshold: 2,
    });
    await signThroughBrowser(signerASession, staleCommitment, { publishAffiliation: true });
    const { error: staleError } = await admin
      .from("collective_identity_credentials")
      .update({ status: "stale" })
      .eq("id", actors.credentials.signerA.id);
    if (staleError) throw new Error(staleError.message);

    const finalMessage = await signThroughBrowser(signerBSession, staleCommitment, {
      publishAffiliation: false,
    });
    expect(finalMessage).toMatch(/one or more identity credentials became stale\. No identities were published/);
    let row = await loadCommitmentRow(staleCommitment.id);
    expect(row.status).toBe("open");
    await assertPrivateCount(staleCommitment.id, 1);
    await assertPublicCount(staleCommitment.id, 0);
    await assertKeyCount(staleCommitment.id, 1);

    actors.credentials.signerA2 = await insertCredential(actors.signerA, {
      realName: "Alice Verified QA",
      affiliation: "Example Institute",
      humanRef: sha256(`human-a:${runTag}`),
      version: 2,
    });
    const recoveryMessage = await signThroughBrowser(signerASession, staleCommitment, {
      publishAffiliation: true,
    });
    expect(recoveryMessage).toMatch(/Threshold reached\. 2 verified identities were published atomically\./);
    row = await loadCommitmentRow(staleCommitment.id);
    expect(row.status).toBe("active");
    await assertPrivateCount(staleCommitment.id, 0);
    await assertKeyCount(staleCommitment.id, 0);
    await assertPublicCount(staleCommitment.id, 2);
    const { data: publicSigners, error: signerError } = await admin
      .from("collective_commitment_public_signers")
      .select("verified_real_name,verified_affiliation")
      .eq("commitment_id", staleCommitment.id)
      .order("ordinal");
    if (signerError) throw new Error(signerError.message);
    const byName = new Map(publicSigners.map((item) => [item.verified_real_name, item.verified_affiliation]));
    expect(byName.get("Alice Verified QA")).toBe("Example Institute");
    expect(byName.get("Bob Verified QA")).toBeNull();
    await signerASession.page.reload({ waitUntil: "domcontentloaded" });
    await expect(signerASession.page.getByRole("heading", { name: "Threshold reached" })).toBeVisible();
    await signerASession.screenshot("stale-credential-recovered-and-activated");
    return "stale final-set revalidation released activation with zero disclosure; a new current credential re-sign activated the exact set, publishing only the opted-in affiliation";
  });

  let simultaneousCommitment;
  await recordCheck("simultaneous final signatures serialize to one exact activation", async () => {
    simultaneousCommitment = await createCommitmentThroughBrowser(creatorSession, {
      propositionType: "workplace_organizing",
      titleSuffix: "simultaneous-final-signatures",
      threshold: 3,
    });
    await signThroughBrowser(signerASession, simultaneousCommitment);
    const buttonB = await prepareSignForm(signerBSession, simultaneousCommitment);
    const buttonC = await prepareSignForm(signerCSession, simultaneousCommitment, {
      publishAffiliation: true,
    });
    await Promise.all([
      buttonB.click({ noWaitAfter: true }),
      buttonC.click({ noWaitAfter: true }),
    ]);
    await Promise.all([
      expect(signerBSession.page.locator('[role="status"]')).toBeVisible({ timeout: 30_000 }),
      expect(signerCSession.page.locator('[role="status"]')).toBeVisible({ timeout: 30_000 }),
    ]);
    const row = await loadCommitmentRow(simultaneousCommitment.id);
    expect(row.status).toBe("active");
    await assertPublicCount(simultaneousCommitment.id, 3);
    await assertPrivateCount(simultaneousCommitment.id, 0);
    await assertKeyCount(simultaneousCommitment.id, 0);
    expect(await tableCount("collective_commitment_receipts", "commitment_id", simultaneousCommitment.id)).toBe(1);
    const { data: events, error } = await admin
      .from("collective_commitment_events")
      .select("event_type")
      .eq("commitment_id", simultaneousCommitment.id);
    if (error) throw new Error(error.message);
    expect(events.filter((event) => event.event_type === "activation_started")).toHaveLength(1);
    expect(events.filter((event) => event.event_type === "activated")).toHaveLength(1);
    await assertNoHorizontalOverflow(signerCSession.page, "mobile simultaneous final signature");
    await signerCSession.screenshot("simultaneous-final-signature-mobile");
    return "two final rendered submissions raced after one existing signer; PostgreSQL produced exactly three public signers, one receipt, one activation-start event, and one activation event";
  });

  let manifestCommitment;
  await recordCheck("exact reveal-manifest rejection and valid atomic publication", async () => {
    manifestCommitment = await createCommitmentThroughBrowser(creatorSession, {
      propositionType: "other_collective_action",
      titleSuffix: "manifest-exactness",
      threshold: 2,
    });
    await signThroughBrowser(signerASession, manifestCommitment, { publishAffiliation: true });
    const direct = await directAddSignature(
      manifestCommitment.id,
      actors.signerD,
      actors.credentials.signerD,
      { publishAffiliation: false },
    );
    const activationToken = direct.result.activationToken;
    expect(typeof activationToken).toBe("string");
    const existing = await readManifestForExistingSignatures(manifestCommitment.id);
    expect(existing.manifest).toHaveLength(2);

    await expectRpcError(
      admin.rpc("activate_collective_commitment_v1", {
        p_commitment_id: manifestCommitment.id,
        p_activation_token: activationToken,
        p_manifest: existing.manifest.slice(0, 1),
        p_mac_key_hex: deriveRevealMacKey(existing.dataKey).toString("hex"),
      }),
      /collective_commitment_manifest_count_mismatch/,
    );
    await assertPublicCount(manifestCommitment.id, 0);
    expect((await loadCommitmentRow(manifestCommitment.id)).status).toBe("activating");

    const altered = structuredClone(existing.manifest);
    altered[0].verifiedRealName = `${altered[0].verifiedRealName} ALTERED`;
    await expectRpcError(
      admin.rpc("activate_collective_commitment_v1", {
        p_commitment_id: manifestCommitment.id,
        p_activation_token: activationToken,
        p_manifest: altered,
        p_mac_key_hex: deriveRevealMacKey(existing.dataKey).toString("hex"),
      }),
      /collective_commitment_manifest_exactness_or_mac_failed/,
    );
    await assertPublicCount(manifestCommitment.id, 0);
    await assertPrivateCount(manifestCommitment.id, 2);
    await assertKeyCount(manifestCommitment.id, 1);

    await outsiderSession.page.goto(`/collective-commitments/${manifestCommitment.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(outsiderSession.page.getByRole("heading", { name: "Activation in progress" })).toBeVisible();
    await expect(outsiderSession.page.getByText("No signer identity is public before successful activation.")).toBeVisible();
    await outsiderSession.screenshot("bad-manifests-published-zero-identities");

    const { error: activationError } = await admin.rpc("activate_collective_commitment_v1", {
      p_commitment_id: manifestCommitment.id,
      p_activation_token: activationToken,
      p_manifest: existing.manifest,
      p_mac_key_hex: deriveRevealMacKey(existing.dataKey).toString("hex"),
    });
    if (activationError) throw new Error(activationError.message);
    expect((await loadCommitmentRow(manifestCommitment.id)).status).toBe("active");
    await assertPublicCount(manifestCommitment.id, 2);
    await assertPrivateCount(manifestCommitment.id, 0);
    await assertKeyCount(manifestCommitment.id, 0);
    await outsiderSession.page.reload({ waitUntil: "domcontentloaded" });
    await expect(outsiderSession.page.getByRole("heading", { name: "Threshold reached" })).toBeVisible();
    await expect(outsiderSession.page.getByText("Alice Verified QA", { exact: true })).toBeVisible();
    await expect(outsiderSession.page.getByText("Dana Verified QA", { exact: true })).toBeVisible();
    await outsiderSession.screenshot("exact-manifest-valid-atomic-publication");
    return "incomplete and MAC-altered manifests left zero public identities and retained private material; the exact manifest then published both names in one transaction and erased key/ciphertext";
  });

  await recordCheck("authenticated outsider and publishable-client access denial", async () => {
    const openCommitment = withdrawalCommitment;
    await outsiderSession.page.goto(`/collective-commitments/${openCommitment.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(outsiderSession.page.getByRole("heading", { name: openCommitment.title })).toBeVisible();
    await expect(outsiderSession.page.getByRole("heading", { name: "Current identity verification required" })).toBeVisible();
    await expect(outsiderSession.page.getByText("No signer identity is public before successful activation.")).toBeVisible();
    await expect(outsiderSession.page.getByRole("heading", { name: "Your private signature is counting" })).toHaveCount(0);

    const outsiderClient = createClient(qaURL, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginError } = await outsiderClient.auth.signInWithPassword({
      email: actors.outsider.email,
      password,
    });
    if (loginError) throw new Error(loginError.message);
    for (const table of [
      "collective_identity_credentials",
      "collective_commitment_keys",
      "collective_commitment_private_signatures",
      "collective_commitment_events",
      "collective_commitments",
    ]) {
      const { error } = await outsiderClient.from(table).select("*").limit(1);
      expect(error?.message ?? "", `${table} should reject authenticated direct reads`).toMatch(/permission denied|not allowed|42501/i);
    }
    await expectRpcError(
      outsiderClient.rpc("withdraw_collective_commitment_signature_v1", {
        p_commitment_id: openCommitment.id,
        p_account_token: "0".repeat(64),
      }),
      /permission denied|not allowed|42501/i,
    );
    const { data: publicRows, error: publicError } = await outsiderClient
      .from("collective_commitment_public_signers")
      .select("id")
      .eq("commitment_id", openCommitment.id);
    if (publicError) throw new Error(publicError.message);
    expect(publicRows).toEqual([]);
    await outsiderClient.auth.signOut();
    await outsiderSession.screenshot("outsider-sees-count-not-private-identities");
    return "authenticated outsider saw frozen public terms/count only; direct sensitive-table reads and mutation RPC execution were denied while the public signer table returned an empty pre-activation set";
  });

  let expiryCommitment;
  await recordCheck("deadline expiry erases ciphertext and key without disclosure", async () => {
    const expiryDeadline = new Date(Date.now() + 150_000);
    expiryCommitment = await createCommitmentThroughBrowser(creatorSession, {
      propositionType: "funding_pledge",
      titleSuffix: "deadline-expiry-erasure",
      threshold: 2,
      deadline: expiryDeadline,
    });
    await signThroughBrowser(signerASession, expiryCommitment, { publishAffiliation: true });
    await assertPrivateCount(expiryCommitment.id, 1);
    await assertKeyCount(expiryCommitment.id, 1);
    await assertPublicCount(expiryCommitment.id, 0);

    const stored = await loadCommitmentRow(expiryCommitment.id);
    const waitMs = Math.max(0, new Date(stored.deadline_at).getTime() - Date.now() + 2_500);
    if (waitMs > 180_000) throw new Error(`Expiry wait unexpectedly exceeds 180 seconds: ${waitMs}`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    const unauthorized = await fetch(`${baseURL}/api/jobs/collective-commitments-expire`, {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(unauthorized.status).toBe(401);
    const authorized = await fetch(`${baseURL}/api/jobs/collective-commitments-expire`, {
      method: "POST",
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    expect(authorized.status).toBe(200);
    const payload = await authorized.json();
    expect(payload.identitiesPublished).toBe(false);
    expect(payload.expiredCommitmentIds).toContain(expiryCommitment.id);

    expect((await loadCommitmentRow(expiryCommitment.id)).status).toBe("expired");
    await assertPrivateCount(expiryCommitment.id, 0);
    await assertKeyCount(expiryCommitment.id, 0);
    await assertPublicCount(expiryCommitment.id, 0);
    const { data: receipt, error: receiptError } = await admin
      .from("collective_commitment_receipts")
      .select("outcome,signer_count,signer_manifest_hash")
      .eq("commitment_id", expiryCommitment.id)
      .single();
    if (receiptError) throw new Error(receiptError.message);
    expect(receipt).toEqual({ outcome: "expired", signer_count: 0, signer_manifest_hash: null });
    await signerASession.page.goto(`/collective-commitments/${expiryCommitment.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(signerASession.page.getByRole("heading", { name: "Deadline passed" })).toBeVisible();
    await expect(signerASession.page.getByText("No names were published.")).toBeVisible();
    await signerASession.screenshot("expired-no-identities-and-private-material-erased");
    return `incorrect cron authorization was rejected; authorized expiry erased one private signature and its key, published no names, and created a zero-signer expiry receipt after ${Math.ceil(waitMs / 1000)} seconds`;
  });

  await recordCheck("browser diagnostics and responsive layout are clean", async () => {
    for (const session of sessions) await session.close();
    const errors = audit.sessions.flatMap((session) => [
      ...session.consoleErrors.map((value) => `${session.label} console: ${value}`),
      ...session.pageErrors.map((value) => `${session.label} page: ${value}`),
      ...session.failedRequests.map((value) => `${session.label} request: ${JSON.stringify(value)}`),
      ...session.badResponses.map((value) => `${session.label} response: ${JSON.stringify(value)}`),
    ]);
    expect(errors, errors.join("\n")).toEqual([]);
    return "desktop and 390×844 mobile flows produced no relevant console errors, page errors, failed same-origin requests, HTTP error responses, or horizontal overflow";
  });

  audit.outcome = "pass";
} catch (error) {
  audit.outcome = "fail";
  audit.error = cleanError(error);
  process.exitCode = 1;
} finally {
  for (const session of sessions) await session.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  try {
    const cleanupResult = await cleanup();
    const residuals = Object.entries(cleanupResult.remaining).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : value !== 0,
    );
    if (residuals.length) {
      audit.outcome = "fail";
      audit.cleanupError = `Synthetic residue remains: ${JSON.stringify(residuals)}`;
      process.exitCode = 1;
    }
  } catch (error) {
    audit.outcome = "fail";
    audit.cleanupError = cleanError(error);
    process.exitCode = 1;
  }
  try {
    await writeAudit();
  } catch (error) {
    console.error(`Could not write final QA audit: ${cleanError(error)}`);
    process.exitCode = 1;
  }
}

if (audit.outcome !== "pass") {
  throw new Error(audit.error || audit.cleanupError || "Collective commitments adversarial QA failed.");
}
