import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

const qaSecret = process.env.ONE_PERSON_ACCOUNT_QA_SECRET ?? "";
const qaRunId = process.env.ONE_PERSON_ACCOUNT_QA_RUN_ID ?? `qa-${Date.now()}`;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const expectAuthHook = process.env.ONE_PERSON_ACCOUNT_EXPECT_AUTH_HOOK === "true";

function requireQaEnvironment() {
  test.skip(
    !qaSecret || !supabaseUrl || !publishableKey || !serviceRoleKey,
    "QA identity secrets and Supabase credentials are required.",
  );
}

function decodeIdentityCookie(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
    sessionId: string;
    retrievalToken: string;
  };
}

async function readIdentitySession(context: BrowserContext) {
  const cookies = await context.cookies();
  const cookie = cookies.find((candidate) => candidate.name === "mt_identity_session");
  if (!cookie) throw new Error("Identity session cookie was not set.");
  return decodeIdentityCookie(cookie.value);
}

function serviceClient() {
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

async function completeQaVerification(
  request: APIRequestContext,
  sessionId: string,
  subjectReference: string,
) {
  const response = await request.post("/api/identity/qa/complete", {
    data: { sessionId, subjectReference, ageClass: "adult" },
    headers: { authorization: `Bearer ${qaSecret}` },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function cleanupSession(sessionId: string, retrievalToken: string) {
  const { error } = await serviceClient().rpc("cleanup_one_person_qa_session_v1", {
    p_session_id: sessionId,
    p_retrieval_token_hash: createHash("sha256").update(retrievalToken).digest("hex"),
  });
  if (error && !error.message.includes("has_canonical_account")) throw error;
}

async function cleanupAccount(profileId: string) {
  const { error } = await serviceClient().rpc("cleanup_one_person_qa_fixture_v1", {
    p_profile_id: profileId,
    p_qa_run_id: qaRunId,
  });
  if (error) throw error;
}

test.describe.configure({ mode: "serial" });

test("verified adult creates one canonical account and signs in", async ({ page, context, request }) => {
  requireQaEnvironment();
  const subjectReference = `qa-adult-${qaRunId}-${randomUUID()}`;
  const email = `one-person-${randomUUID()}@example.test`;
  const password = `Qa!${randomUUID()}aA9`;
  let profileId = "";
  let session: Awaited<ReturnType<typeof readIdentitySession>> | null = null;
  let duplicateSession: Awaited<ReturnType<typeof readIdentitySession>> | null = null;

  try {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/identity?returnTo=/account/identity");
    await expect(page.getByRole("heading", { name: "One person. One account." })).toBeVisible();
    await expect(page.getByText(/Raw identity documents, selfies/)).toBeVisible();
    await page.getByRole("button", { name: "Start private verification" }).click();
    await expect(page).toHaveURL(/\/identity\/status/);
    session = await readIdentitySession(context);

    await completeQaVerification(request, session.sessionId, subjectReference);
    await page.reload();
    await expect(page.getByText("The uniqueness verification succeeded.")).toBeVisible();
    await page.getByRole("button", { name: "Continue to account creation" }).click();
    await expect(page).toHaveURL(/\/signup/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/(login|onboarding|account\/identity)/);

    const admin = serviceClient();
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = users.data.users.find((candidate) => candidate.email === email);
    expect(user, users.error?.message).toBeTruthy();
    profileId = user!.id;
    await admin.auth.admin.updateUserById(profileId, { email_confirm: true });

    const status = await admin.rpc("get_person_account_status_v1", { p_profile_id: profileId });
    expect(status.error).toBeNull();
    expect((status.data as { verificationStatus?: string }).verificationStatus).toBe("verified");

    await page.goto("/login?returnTo=/account/identity");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.goto("/account/identity");
    await expect(page.getByRole("heading", { name: "Identity and sign-in methods" })).toBeVisible();
    await expect(page.getByText("Identity verified. Your legal identity remains private.")).toBeVisible();

    const second = await context.browser()!.newContext({ baseURL: "http://127.0.0.1:3210" });
    const duplicatePage = await second.newPage();
    await duplicatePage.goto("/identity");
    await duplicatePage.getByRole("button", { name: "Start private verification" }).click();
    duplicateSession = await readIdentitySession(second);
    await completeQaVerification(request, duplicateSession.sessionId, subjectReference);
    await duplicatePage.reload();
    await expect(duplicatePage.getByText(/matches an existing or disputed account/)).toBeVisible();
    await second.close();
  } finally {
    if (profileId) await cleanupAccount(profileId);
    else if (session) await cleanupSession(session.sessionId, session.retrievalToken);
    if (!profileId && duplicateSession) {
      await cleanupSession(duplicateSession.sessionId, duplicateSession.retrievalToken);
    }
  }
});

test("mobile verification surface is usable and leaves zero session residue", async ({ page, context, request }) => {
  requireQaEnvironment();
  const subjectReference = `qa-mobile-${qaRunId}-${randomUUID()}`;
  let session: Awaited<ReturnType<typeof readIdentitySession>> | null = null;
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/identity");
    await expect(page.getByRole("heading", { name: "One person. One account." })).toBeVisible();
    await page.getByRole("button", { name: "Start private verification" }).click();
    session = await readIdentitySession(context);
    await completeQaVerification(request, session.sessionId, subjectReference);
    await page.reload();
    await expect(page.getByRole("button", { name: "Continue to account creation" })).toBeVisible();
    await page.screenshot({ path: "test-results/one-person-account-mobile.png", fullPage: true });
  } finally {
    if (session) await cleanupSession(session.sessionId, session.retrievalToken);
  }
});

test("Before User Created hook rejects a direct unverified signup", async () => {
  requireQaEnvironment();
  test.skip(!expectAuthHook, "Auth hook verification is run only after QA hook configuration.");
  const client = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
  const result = await client.auth.signUp({
    email: `unverified-${randomUUID()}@example.test`,
    password: `Qa!${randomUUID()}aA9`,
  });
  expect(result.data.user).toBeNull();
  expect(result.error?.message).toMatch(/identity verification|canonical account/i);
});
