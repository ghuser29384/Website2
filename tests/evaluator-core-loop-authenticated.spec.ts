import { createHmac, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

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
  type TestInfo,
} from "@playwright/test";

const BASE_URL = process.env.EVALUATOR_CORE_LOOP_BASE_URL ?? "http://127.0.0.1:3210";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_PASSWORD = process.env.EVALUATOR_CORE_LOOP_QA_PASSWORD ?? "";
const QA_DATABASE_URL = process.env.QA_SUPABASE_DB_URL ?? "";
const execFileAsync = promisify(execFile);

const IDS = {
  admin: "81000000-0000-4000-8000-000000000005",
  offer: "82000000-0000-4000-8000-000000000001",
  outsider: "81000000-0000-4000-8000-000000000003",
  owner: "81000000-0000-4000-8000-000000000001",
  responder: "81000000-0000-4000-8000-000000000002",
  reviewer: "81000000-0000-4000-8000-000000000004",
} as const;

const EMAILS = {
  admin: "evaluator-core-loop-admin@qa.invalid",
  outsider: "evaluator-core-loop-outsider@qa.invalid",
  owner: "evaluator-core-loop-owner@qa.invalid",
  responder: "evaluator-core-loop-responder@qa.invalid",
  reviewer: "evaluator-core-loop-reviewer@qa.invalid",
} as const;

const COPY = {
  evidence:
    "QA-only attestation: the single synthetic evaluator checkpoint was completed in the isolated QA project. No external file, production record, or payment is involved.",
  exit:
    "Using the frozen unilateral rule after the QA review so every future synthetic obligation ends while the completed QA record remains.",
  outsiderResponse:
    "QA competing response from the designated outsider; this must be declined atomically and must never expose the selected response.",
  responderResponse:
    "QA selected response: I can complete the synthetic checkpoint under the stated private-evidence and zero-dollar terms.",
  review:
    "The private QA attestation satisfies the frozen one-checkpoint evidence rule at the fixed 100 percent confidence band.",
} as const;

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
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn(email: string) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(
      `Isolated-QA sign-in failed for ${email}: ${error?.message ?? "no session"}`,
    );
  }
  return { client, session: data.session };
}

async function elevateWithTotp(client: SupabaseClient, aal1Session: Session) {
  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `evaluator-core-loop-${Date.now()}`,
  });
  if (enrollmentError || !enrollment?.totp?.secret) {
    throw new Error(
      `TOTP enrollment failed: ${enrollmentError?.message ?? "missing secret"}`,
    );
  }

  let lastError = "";
  for (const offset of [0, -1, 1]) {
    const { data, error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code: totpCode(enrollment.totp.secret, offset),
    });
    if (data && !error) {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (!sessionError && sessionData.session) return sessionData.session;
    }
    lastError = error?.message ?? "missing AAL2 session";
  }

  throw new Error(`TOTP verification failed: ${lastError}`);
}

async function sessionCookies(session: Session) {
  const captured: Array<{
    name: string;
    options: Record<string, unknown>;
    value: string;
  }> = [];
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
    httpOnly: true,
    name,
    sameSite: "Lax" as const,
    secure: BASE_URL.startsWith("https://"),
    url: BASE_URL,
    value,
  }));
}

async function authenticatedContext(
  browser: Browser,
  session: Session,
  viewport: { height: number; width: number },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
  context.setDefaultTimeout(12_000);
  context.setDefaultNavigationTimeout(25_000);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      httpOnly: true,
      name: "mt_walkthrough_seen",
      sameSite: "Lax" as const,
      secure: BASE_URL.startsWith("https://"),
      url: BASE_URL,
      value: "1",
    },
  ]);
  return context;
}

function qaCheckpoint(message: string) {
  console.log(`[evaluator-core-loop-qa] ${message}`);
}

async function gotoReady(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);
}

async function expectSuccess(page: Page, message: string) {
  await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 25_000 });
}

function formWithButton(page: Page, buttonName: string) {
  return page.locator("form").filter({
    has: page.getByRole("button", { exact: true, name: buttonName }),
  });
}

function monitorPage(page: Page, label: string, failures: string[]) {
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`${label}: console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`${label}: pageerror: ${error.message}`));
}

async function expectHealthyPage(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  expect(await page.title()).not.toBe("");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  expect(await page.locator("body").innerText()).not.toMatch(
    /Application error|Unhandled Runtime Error|Internal Server Error/i,
  );
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ fullPage: false, path });
  await testInfo.attach(name, { contentType: "image/png", path });
}

function validatedQaDatabase() {
  if (!QA_DATABASE_URL) {
    throw new Error("QA_SUPABASE_DB_URL is required for isolated-QA database checks.");
  }

  const database = new URL(QA_DATABASE_URL);
  const expectedRef = "hvmxfjjbdcgjjudmthdz";
  const exactTarget =
    ["postgres:", "postgresql:"].includes(database.protocol) &&
    decodeURIComponent(database.username).includes(expectedRef) &&
    database.hostname === "aws-0-us-west-1.pooler.supabase.com" &&
    database.port === "5432" &&
    database.pathname === "/postgres" &&
    (database.searchParams.get("sslmode") ?? "require") === "require" &&
    Boolean(database.password);
  if (!exactTarget) {
    throw new Error(
      "Refusing access outside the exact TLS-only MoralTrade isolated-QA database.",
    );
  }
  return database;
}

function qaDatabaseEnvironment(database: URL) {
  return {
    ...process.env,
    PGPASSWORD: decodeURIComponent(database.password),
    PGSSLMODE: "require",
  };
}

async function setReviewerGrantActive(active: boolean) {
  const database = validatedQaDatabase();
  const assignment = active
    ? "active = true, revoked_at = null"
    : "active = false, revoked_at = now()";
  const { stdout } = await execFileAsync(
    "psql",
    [
      "--host",
      database.hostname,
      "--port",
      database.port,
      "--username",
      decodeURIComponent(database.username),
      "--dbname",
      database.pathname.slice(1),
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      `with changed as (
        update public.trade_review_role_grants
        set ${assignment}
        where profile_id = '${IDS.reviewer}'::uuid
          and role = 'reviewer'
        returning 1
      ) select count(*) from changed;`,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: qaDatabaseEnvironment(database),
      maxBuffer: 1024 * 1024,
    },
  );
  expect(stdout.trim()).toBe("1");
}

async function captureExitDatabaseBoundary(agreementId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(agreementId)) {
    throw new Error("Refusing an invalid agreement id in the isolated-QA boundary query.");
  }

  const database = validatedQaDatabase();
  const sql = `select json_build_object(
    'agreement', (
      select row_to_json(agreement_row)
      from (
        select id, status, lifecycle_status, cancelled_at, exit_requested_by, exit_reason
        from public.agreements
        where id = '${agreementId}'::uuid
      ) agreement_row
    ),
    'exitRequests', (
      select coalesce(json_agg(exit_row order by exit_row.created_at, exit_row.id), '[]'::json)
      from (
        select id, agreement_id, requested_by, request_type, reason, status, created_at, resolved_at
        from public.trade_exit_requests
        where agreement_id = '${agreementId}'::uuid
      ) exit_row
    ),
    'unilateralExitCount', (
      select count(*)
      from public.trade_exit_requests
      where agreement_id = '${agreementId}'::uuid
        and request_type = 'unilateral_exit'
    ),
    'unilateralNotifications', (
      select coalesce(json_agg(notification_row order by notification_row.created_at, notification_row.id), '[]'::json)
      from (
        select id, user_id, notification_type, href, dedupe_key, created_at
        from public.trade_notifications
        where notification_type = 'unilateral_exit'
          and href = '/trade-agreements/${agreementId}'
      ) notification_row
    ),
    'unilateralNotificationCount', (
      select count(*)
      from public.trade_notifications
      where notification_type = 'unilateral_exit'
        and href = '/trade-agreements/${agreementId}'
    ),
    'exitEmailOutbox', (
      select coalesce(json_agg(outbox_row order by outbox_row.created_at, outbox_row.id), '[]'::json)
      from (
        select id, profile_id, recipient_email, subject, status, provider, created_at
        from public.email_outbox
        where profile_id = '${IDS.responder}'::uuid
          and subject = 'Moral Trade: Agreement exited'
      ) outbox_row
    ),
    'exitEmailOutboxCount', (
      select count(*)
      from public.email_outbox
      where profile_id = '${IDS.responder}'::uuid
        and subject = 'Moral Trade: Agreement exited'
    ),
    'performanceBonds', (
      select count(*)
      from public.performance_bonds
      where offer_id = '${IDS.offer}'::uuid
    ),
    'externalPaymentReceipts', (
      select count(*)
      from public.trade_external_payment_receipts receipt
      join public.trade_milestone_payouts payout on payout.id = receipt.payout_id
      join public.trade_agreement_milestones milestone on milestone.id = payout.milestone_id
      where milestone.agreement_id = '${agreementId}'::uuid
    )
  )::text;`;
  const { stdout } = await execFileAsync(
    "psql",
    [
      "--host",
      database.hostname,
      "--port",
      database.port,
      "--username",
      decodeURIComponent(database.username),
      "--dbname",
      database.pathname.slice(1),
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: qaDatabaseEnvironment(database),
      maxBuffer: 1024 * 1024,
    },
  );
  const payload = stdout.trim();
  if (!payload) throw new Error("The isolated-QA exit boundary query returned no JSON.");
  return JSON.parse(payload) as Record<string, unknown>;
}

async function expectAal(client: SupabaseClient, expected: "aal1" | "aal2") {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  expect(error).toBeNull();
  expect(data?.currentLevel).toBe(expected);
}

async function readPrivateEvidence(
  client: SupabaseClient,
  milestoneId: string,
  bundleId: string,
) {
  const { data: bundles, error: bundlesError } = await client
    .from("trade_evidence_bundles")
    .select("id,status")
    .eq("milestone_id", milestoneId);
  const { data: items, error: itemsError } = await client
    .from("trade_evidence_bundle_items")
    .select("attestation,evidence_type")
    .eq("bundle_id", bundleId);
  expect(bundlesError).toBeNull();
  expect(itemsError).toBeNull();
  return { bundles: bundles ?? [], items: items ?? [] };
}

async function cleanupQaFixtures() {
  const database = validatedQaDatabase();

  const { stdout } = await execFileAsync(
    "psql",
    [
      "--host",
      database.hostname,
      "--port",
      database.port,
      "--username",
      decodeURIComponent(database.username),
      "--dbname",
      database.pathname.slice(1),
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      "supabase/tests/evaluator_core_loop_browser_cleanup.sql",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: qaDatabaseEnvironment(database),
      maxBuffer: 1024 * 1024,
    },
  );
  const residueJson = stdout.match(/\{[^\n]+\}/)?.[0];
  if (!residueJson) throw new Error("Cleanup did not return a machine-readable residue count.");
  const residue = JSON.parse(residueJson) as Record<string, number>;
  if (Object.values(residue).some((count) => count !== 0)) {
    throw new Error(`Isolated-QA cleanup left residue: ${JSON.stringify(residue)}`);
  }
  return residue;
}

async function submitResponse(page: Page, message: string) {
  const form = formWithButton(page, "Express interest");
  await expect(form).toHaveCount(1);
  await form.locator('textarea[name="message"]').fill(message);
  await form.getByRole("button", { exact: true, name: "Express interest" }).click();
  await expectSuccess(page, "Interest recorded.");
}

async function confirmVersion(page: Page) {
  const form = formWithButton(page, "Confirm version 1");
  await expect(form).toHaveCount(1);
  await form.locator('input[name="terms_reviewed"]').check();
  await form.getByRole("button", { exact: true, name: "Confirm version 1" }).click();
}

async function nominateReviewer(page: Page) {
  const form = formWithButton(page, "Record reviewer nomination");
  await expect(form).toHaveCount(1);
  await form.locator('select[name="reviewer_id"]').selectOption(IDS.reviewer);
  await form
    .getByRole("button", { exact: true, name: "Record reviewer nomination" })
    .click();
  await expectSuccess(
    page,
    "Reviewer nomination recorded. Assignment occurs only if both participants choose the same eligible reviewer.",
  );
}

test.describe("evaluator-facing authenticated Moral Trade core loop", () => {
  test("proves discovery through exit with private evidence and zero money", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(8 * 60_000);
    test.skip(!QA_PASSWORD, "EVALUATOR_CORE_LOOP_QA_PASSWORD is required.");

    const consoleFailures: string[] = [];
    const contexts: BrowserContext[] = [];
    const summary: Record<string, unknown> = {
      fixture: "evaluator_core_loop_browser",
      offerId: IDS.offer,
      qaProject: "hvmxfjjbdcgjjudmthdz",
      transitions: [],
    };
    const evidenceAuthorization: Record<
      string,
      { aal: "aal1" | "aal2"; bundleRows: number; itemRows: number }
    > = {};
    summary.evidenceAuthorization = evidenceAuthorization;
    let testFailure: unknown = null;

    const anonymous = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { height: 1000, width: 1440 },
    });
    contexts.push(anonymous);
    const anonymousPage = await anonymous.newPage();
    monitorPage(anonymousPage, "anonymous", consoleFailures);

    try {
      await gotoReady(anonymousPage, "/offers?mode=pledge&view=live");
      const evaluatorOfferCard = anonymousPage.getByRole("article", {
        exact: true,
        name: "QA Core Loop Owner",
      });
      const evaluatorHeading = evaluatorOfferCard.getByRole("heading", {
        level: 4,
        name: /Evaluator core-loop verification\s+Private QA response verification/i,
      });
      await expect(evaluatorHeading).toHaveText(
        /Evaluator core-loop verification\s*\/\s*Private QA response verification/,
      );
      await expectHealthyPage(anonymousPage);
      await evaluatorOfferCard.scrollIntoViewIfNeeded();
      await expect(evaluatorOfferCard).toBeInViewport({ ratio: 0.9 });
      await screenshot(anonymousPage, testInfo, "01-anonymous-directory-desktop");

      await evaluatorOfferCard
        .getByText("Exact terms & more actions", { exact: true })
        .click();
      await evaluatorOfferCard
        .getByRole("link", { exact: true, name: "Open full terms" })
        .click();
      const evaluatorOfferUrl = new URL(`/offers/${IDS.offer}`, BASE_URL).toString();
      await anonymousPage.waitForURL(evaluatorOfferUrl);
      await expect(anonymousPage).toHaveURL(evaluatorOfferUrl);
      const evaluatorTerms = anonymousPage.getByRole("article", {
        name: /Evaluator core-loop verification/i,
      });
      await expect(evaluatorTerms).toBeVisible();
      await expect(evaluatorTerms).toHaveCount(1);
      await expect(
        evaluatorTerms.getByText(
          "Synthetic isolated-QA fixture. Not an offer to transact. No payment, custody, production data, or production deployment.",
          { exact: true },
        ),
      ).toBeVisible();
      await expectHealthyPage(anonymousPage);
      await screenshot(anonymousPage, testInfo, "02-anonymous-offer-desktop");

      const signInLink = anonymousPage.getByRole("link", {
        exact: true,
        name: "Sign in to contact",
      });
      await expect(signInLink).toHaveAttribute(
        "href",
        `/login?returnTo=${encodeURIComponent(`/offers/${IDS.offer}#respond`)}`,
      );
      await signInLink.click();
      await expect(anonymousPage).toHaveURL((url) =>
        url.pathname === "/login" &&
        url.searchParams.get("returnTo") === `/offers/${IDS.offer}#respond`,
      );
      const loginUrl = new URL(anonymousPage.url());
      expect(loginUrl.pathname).toBe("/login");
      expect(loginUrl.searchParams.get("returnTo")).toBe(`/offers/${IDS.offer}#respond`);
      qaCheckpoint("proved anonymous discovery and exact sign-in return path");

      const ownerAuth = await signIn(EMAILS.owner);
      const responderAuth = await signIn(EMAILS.responder);
      const outsiderAuth = await signIn(EMAILS.outsider);
      const reviewerAal1Auth = await signIn(EMAILS.reviewer);
      const reviewerAuth = await signIn(EMAILS.reviewer);
      const adminAuth = await signIn(EMAILS.admin);
      const reviewerAal2Session = await elevateWithTotp(
        reviewerAuth.client,
        reviewerAuth.session,
      );
      const adminAal2Session = await elevateWithTotp(
        adminAuth.client,
        adminAuth.session,
      );
      await expectAal(ownerAuth.client, "aal1");
      await expectAal(reviewerAal1Auth.client, "aal1");
      await expectAal(reviewerAuth.client, "aal2");
      await expectAal(adminAuth.client, "aal2");
      expect(adminAal2Session.user.id).toBe(IDS.admin);
      qaCheckpoint(
        "signed in three participant roles plus independent AAL1/AAL2 reviewer sessions and an AAL2 administrator",
      );

      const createContext = async (
        session: Session,
        viewport: { height: number; width: number },
      ) => {
        const created = await authenticatedContext(browser, session, viewport);
        contexts.push(created);
        return created;
      };

      const responderContext = await createContext(responderAuth.session, {
        height: 844,
        width: 390,
      });
      const outsiderContext = await createContext(outsiderAuth.session, {
        height: 844,
        width: 390,
      });
      const ownerContext = await createContext(ownerAuth.session, {
        height: 1000,
        width: 1440,
      });
      const reviewerContext = await createContext(reviewerAal2Session, {
        height: 1000,
        width: 1440,
      });

      const responderPage = await responderContext.newPage();
      const outsiderPage = await outsiderContext.newPage();
      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();
      monitorPage(responderPage, "responder", consoleFailures);
      monitorPage(ownerPage, "owner", consoleFailures);
      monitorPage(reviewerPage, "reviewer", consoleFailures);

      await gotoReady(responderPage, `/offers/${IDS.offer}#respond`);
      await submitResponse(responderPage, COPY.responderResponse);
      const pendingResponseReceipt = responderPage.getByText(
        "Your response is pending",
        { exact: true },
      );
      await expect(pendingResponseReceipt).toBeVisible();
      await expectHealthyPage(responderPage);
      await pendingResponseReceipt.scrollIntoViewIfNeeded();
      await expect(pendingResponseReceipt).toBeInViewport({ ratio: 0.9 });
      await screenshot(responderPage, testInfo, "03-responder-private-response-mobile");

      await gotoReady(outsiderPage, `/offers/${IDS.offer}#respond`);
      await expect(outsiderPage.getByText(COPY.responderResponse, { exact: true })).toHaveCount(0);
      await expect(
        outsiderPage.getByRole("heading", { exact: true, name: "Responses to this offer" }),
      ).toHaveCount(0);
      await submitResponse(outsiderPage, COPY.outsiderResponse);
      await expect(outsiderPage.getByText("Your response is pending", { exact: true })).toBeVisible();
      await expectHealthyPage(outsiderPage);
      qaCheckpoint("proved non-owner response privacy before acceptance");

      await gotoReady(ownerPage, `/offers/${IDS.offer}`);
      await expect(ownerPage.getByText(COPY.responderResponse, { exact: true })).toBeVisible();
      await expect(ownerPage.getByText(COPY.outsiderResponse, { exact: true })).toBeVisible();
      const selectedResponseCard = ownerPage.locator("article").filter({
        hasText: COPY.responderResponse,
      });
      await expect(selectedResponseCard).toHaveCount(1);
      const acceptanceForm = selectedResponseCard.locator("form").filter({
        has: ownerPage.getByRole("button", {
          exact: true,
          name: "Accept and create agreement",
        }),
      });
      await acceptanceForm
        .locator('textarea[name="notes"]')
        .fill("QA-only acceptance; agreement remains proposed until both users confirm.");
      await acceptanceForm
        .getByRole("button", { exact: true, name: "Accept and create agreement" })
        .click();

      // This is the first demonstrated product gate: acceptance must land on the
      // participant-private canonical agreement, not strand the owner on a now-
      // closed offer. The pre-repair branch is expected to fail exactly here.
      await expect(ownerPage).toHaveURL(
        /\/trade-agreements\/[0-9a-f-]{36}(?:\?.*)?$/i,
        { timeout: 25_000 },
      );
      await expectSuccess(ownerPage, "Interest accepted and agreement created.");
      const agreementMatch = new URL(ownerPage.url()).pathname.match(
        /^\/trade-agreements\/([0-9a-f-]{36})$/i,
      );
      expect(agreementMatch).not.toBeNull();
      const agreementId = agreementMatch?.[1] ?? "";
      summary.agreementId = agreementId;
      qaCheckpoint(`accepted selected response into canonical agreement ${agreementId}`);

      const { data: interests, error: interestsError } = await ownerAuth.client
        .from("interests")
        .select("id,user_id,message,status")
        .eq("offer_id", IDS.offer)
        .order("user_id", { ascending: true });
      expect(interestsError).toBeNull();
      expect(interests).toHaveLength(2);
      const selectedInterest = interests?.find((row) => row.user_id === IDS.responder);
      const competingInterest = interests?.find((row) => row.user_id === IDS.outsider);
      expect(selectedInterest?.status).toBe("accepted");
      expect(competingInterest?.status).toBe("declined");

      const { data: agreements, error: agreementsError } = await ownerAuth.client
        .from("agreements")
        .select("*")
        .eq("offer_id", IDS.offer);
      expect(agreementsError).toBeNull();
      expect(agreements).toHaveLength(1);
      expect(agreements?.[0]?.id).toBe(agreementId);
      expect(agreements?.[0]?.lifecycle_status).toBe("proposed");

      const { data: duplicateAcceptance, error: duplicateAcceptanceError } =
        await ownerAuth.client.rpc("accept_marketplace_interest_v1", {
          p_interest_id: selectedInterest?.id,
          p_notes: "QA duplicate acceptance must be idempotent.",
          p_offer_id: IDS.offer,
        });
      expect(duplicateAcceptanceError).toBeNull();
      expect(duplicateAcceptance?.created).toBe(false);
      expect(duplicateAcceptance?.agreement?.id).toBe(agreementId);
      const { data: agreementsAfterDuplicate } = await ownerAuth.client
        .from("agreements")
        .select("id")
        .eq("offer_id", IDS.offer);
      expect(agreementsAfterDuplicate).toHaveLength(1);
      qaCheckpoint("proved atomic competing-response decline and idempotent acceptance");

      const { data: versions, error: versionsError } = await ownerAuth.client
        .from("trade_agreement_versions")
        .select("*")
        .eq("agreement_id", agreementId);
      expect(versionsError).toBeNull();
      expect(versions).toHaveLength(1);
      const version = versions?.[0];
      expect(version?.id).toBe(agreements?.[0]?.current_version_id);
      expect(version?.terms_hash).toMatch(/^[a-f0-9]{64}$/);

      const { error: staleConfirmationError } = await responderAuth.client.rpc(
        "confirm_agreement_version_v2",
        {
          p_actor_id: IDS.responder,
          p_agreement_id: agreementId,
          p_agreement_version_id: randomUUID(),
        },
      );
      expect(staleConfirmationError).not.toBeNull();

      const { data: tamperResult, error: tamperError } = await responderAuth.client
        .from("trade_agreement_versions")
        .update({ privacy_scope: "tampered" })
        .eq("id", version?.id)
        .select("id");
      expect(Boolean(tamperError) || (tamperResult ?? []).length === 0).toBe(true);
      const { data: unchangedVersion } = await ownerAuth.client
        .from("trade_agreement_versions")
        .select("privacy_scope")
        .eq("id", version?.id)
        .single();
      expect(unchangedVersion?.privacy_scope).toBe(version?.privacy_scope);

      const { data: acceptedThreads, error: acceptedThreadsError } = await ownerAuth.client
        .from("trade_threads")
        .select("id")
        .eq("agreement_id", agreementId);
      expect(acceptedThreadsError).toBeNull();
      expect(acceptedThreads).toHaveLength(1);
      const { data: systemMessages, error: systemMessagesError } = await ownerAuth.client
        .from("trade_messages")
        .select("body,message_type")
        .eq("thread_id", acceptedThreads?.[0]?.id)
        .eq("message_type", "system");
      expect(systemMessagesError).toBeNull();
      expect((systemMessages ?? []).length).toBeGreaterThanOrEqual(2);

      await gotoReady(responderPage, `/trade-agreements/${agreementId}`);
      const termsHashPrefix = String(version?.terms_hash).slice(0, 16);
      await expect(ownerPage.getByText(`Terms hash: ${termsHashPrefix}…`, { exact: false })).toBeVisible();
      await expect(
        responderPage.getByText(`Terms hash: ${termsHashPrefix}…`, { exact: false }),
      ).toBeVisible();
      await expectHealthyPage(ownerPage);
      await expectHealthyPage(responderPage);

      await gotoReady(outsiderPage, `/trade-agreements/${agreementId}`);
      await expect(
        outsiderPage.getByRole("heading", { exact: true, name: "Unavailable" }),
      ).toBeVisible();
      const { data: outsiderAgreements, error: outsiderAgreementsError } =
        await outsiderAuth.client.from("agreements").select("id").eq("id", agreementId);
      expect(outsiderAgreementsError).toBeNull();
      expect(outsiderAgreements).toEqual([]);
      const { data: outsiderInterests, error: outsiderInterestsError } =
        await outsiderAuth.client
          .from("interests")
          .select("message,status,user_id")
          .eq("offer_id", IDS.offer);
      expect(outsiderInterestsError).toBeNull();
      expect(outsiderInterests).toEqual([
        {
          message: COPY.outsiderResponse,
          status: "declined",
          user_id: IDS.outsider,
        },
      ]);
      await screenshot(outsiderPage, testInfo, "04-outsider-agreement-denied-mobile");
      qaCheckpoint("proved frozen-version identity, stale-write denial, and outsider RLS denial");

      await gotoReady(ownerPage, `/trade-agreements/${agreementId}`);
      const milestoneForm = formWithButton(ownerPage, "Add milestone to version");
      await ownerPage.getByText("Add a milestone before confirmation", { exact: true }).click();
      await milestoneForm.locator('select[name="action_category"]').selectOption("other");
      await milestoneForm.locator('select[name="completion_kind"]').selectOption("indivisible");
      await milestoneForm
        .locator('textarea[name="private_description"]')
        .fill("Complete the single synthetic evaluator checkpoint in isolated QA.");
      await milestoneForm.locator('select[name="performer_id"]').selectOption(IDS.responder);
      await milestoneForm.locator('select[name="payer_id"]').selectOption(IDS.owner);
      await milestoneForm.locator('input[name="unit_label"]').fill("checkpoint");
      await milestoneForm.locator('input[name="maximum_amount"]').fill("0");
      await milestoneForm.locator('input[name="currency"]').fill("USD");
      await milestoneForm
        .locator('textarea[name="evidence_rule"]')
        .fill("One private QA-only attestation; no file, external link, or production data.");
      await milestoneForm
        .getByRole("button", { exact: true, name: "Add milestone to version" })
        .click();
      await expectSuccess(
        ownerPage,
        "Milestone added to the proposed version. Finalize the manifest before either participant confirms it.",
      );

      const { data: milestones, error: milestonesError } = await ownerAuth.client
        .from("trade_agreement_milestones")
        .select("*")
        .eq("agreement_id", agreementId);
      expect(milestonesError).toBeNull();
      expect(milestones).toHaveLength(1);
      const milestone = milestones?.[0];
      expect(Number(milestone?.maximum_amount_cents)).toBe(0);

      await formWithButton(ownerPage, "Finalize milestone manifest")
        .getByRole("button", { exact: true, name: "Finalize milestone manifest" })
        .click();
      await expectSuccess(
        ownerPage,
        "Milestone terms and payout rules are frozen. Both participants may now review and confirm this exact version.",
      );
      const { data: frozenVersion } = await ownerAuth.client
        .from("trade_agreement_versions")
        .select("milestone_manifest_hash,complete_terms_hash")
        .eq("id", version?.id)
        .single();
      expect(frozenVersion?.milestone_manifest_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(frozenVersion?.complete_terms_hash).toMatch(/^[a-f0-9]{64}$/);
      await screenshot(ownerPage, testInfo, "05-owner-frozen-zero-dollar-milestone-desktop");

      await confirmVersion(ownerPage);
      await expectSuccess(
        ownerPage,
        "Your confirmation was recorded. The agreement remains proposed until the other participant confirms.",
      );
      await gotoReady(responderPage, `/trade-agreements/${agreementId}`);
      await confirmVersion(responderPage);
      await expectSuccess(
        responderPage,
        "Both participants confirmed this exact version. The agreement is active.",
      );
      const { data: activatedAgreement } = await ownerAuth.client
        .from("agreements")
        .select("lifecycle_status,status")
        .eq("id", agreementId)
        .single();
      expect(activatedAgreement?.lifecycle_status).toBe("active");
      expect(activatedAgreement?.status).toBe("active");
      const { data: confirmations, error: confirmationsError } = await ownerAuth.client
        .from("trade_agreement_confirmations")
        .select("user_id")
        .eq("agreement_version_id", version?.id);
      expect(confirmationsError).toBeNull();
      expect(new Set((confirmations ?? []).map((row) => row.user_id))).toEqual(
        new Set([IDS.owner, IDS.responder]),
      );
      qaCheckpoint("proved complete manifest and bilateral activation of one frozen version");

      await gotoReady(responderPage, `/trade-agreements/${agreementId}`);
      const evidenceForm = formWithButton(responderPage, "Submit evidence bundle");
      await evidenceForm.locator('textarea[name="attestation"]').fill(COPY.evidence);
      await evidenceForm.locator('input[name="bundle_complete"]').check();
      await evidenceForm
        .getByRole("button", { exact: true, name: "Submit evidence bundle" })
        .click();
      await expectSuccess(
        responderPage,
        "Private evidence packet submitted for neutral review. No source file was published.",
      );

      await gotoReady(ownerPage, `/trade-agreements/${agreementId}`);
      await nominateReviewer(ownerPage);
      await gotoReady(responderPage, `/trade-agreements/${agreementId}`);
      await nominateReviewer(responderPage);

      if (!milestone?.id) throw new Error("The accepted agreement has no QA milestone.");
      const { data: participantBundles, error: participantBundlesError } =
        await ownerAuth.client
          .from("trade_evidence_bundles")
          .select("id,status")
          .eq("milestone_id", milestone.id);
      expect(participantBundlesError).toBeNull();
      expect(participantBundles).toHaveLength(1);
      expect(participantBundles?.[0]?.status).toBe("submitted");
      const reviewerBundleId = participantBundles?.[0]?.id;
      if (!reviewerBundleId) throw new Error("The submitted QA evidence bundle has no ID.");

      const participantAal1Access = await readPrivateEvidence(
        ownerAuth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(participantAal1Access.bundles).toHaveLength(1);
      expect(participantAal1Access.items).toEqual([
        { attestation: COPY.evidence, evidence_type: "attestation" },
      ]);
      evidenceAuthorization.participantAal1 = {
        aal: "aal1",
        bundleRows: participantAal1Access.bundles.length,
        itemRows: participantAal1Access.items.length,
      };

      const reviewerAal1Access = await readPrivateEvidence(
        reviewerAal1Auth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(reviewerAal1Access).toEqual({ bundles: [], items: [] });
      evidenceAuthorization.assignedReviewerAal1 = {
        aal: "aal1",
        bundleRows: reviewerAal1Access.bundles.length,
        itemRows: reviewerAal1Access.items.length,
      };

      const reviewerAal2BeforeReview = await readPrivateEvidence(
        reviewerAuth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(reviewerAal2BeforeReview.bundles).toHaveLength(1);
      expect(reviewerAal2BeforeReview.items).toEqual([
        { attestation: COPY.evidence, evidence_type: "attestation" },
      ]);
      evidenceAuthorization.activeAssignedReviewerAal2BeforeReview = {
        aal: "aal2",
        bundleRows: reviewerAal2BeforeReview.bundles.length,
        itemRows: reviewerAal2BeforeReview.items.length,
      };

      const outsiderAccess = await readPrivateEvidence(
        outsiderAuth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(outsiderAccess).toEqual({ bundles: [], items: [] });
      evidenceAuthorization.outsider = {
        aal: "aal1",
        bundleRows: outsiderAccess.bundles.length,
        itemRows: outsiderAccess.items.length,
      };

      const administratorAal2Access = await readPrivateEvidence(
        adminAuth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(administratorAal2Access.bundles).toHaveLength(1);
      expect(administratorAal2Access.items).toEqual([
        { attestation: COPY.evidence, evidence_type: "attestation" },
      ]);
      evidenceAuthorization.administratorAal2 = {
        aal: "aal2",
        bundleRows: administratorAal2Access.bundles.length,
        itemRows: administratorAal2Access.items.length,
      };
      qaCheckpoint(
        "proved participant AAL1 access, reviewer AAL1 denial, active assigned reviewer AAL2 access, outsider denial, and administrator AAL2 access",
      );

      await gotoReady(reviewerPage, `/trade-review/${milestone?.id}`);
      await expect(
        reviewerPage.getByRole("heading", {
          exact: true,
          name: "Grade the promised result, not the submission’s polish.",
        }),
      ).toBeVisible();
      await expect(reviewerPage.getByText(COPY.evidence, { exact: true })).toBeVisible();
      const reviewForm = formWithButton(reviewerPage, "Record neutral review");
      await reviewForm.locator('select[name="completed_units"]').selectOption("1");
      await reviewForm.locator('select[name="confidence_band"]').selectOption("100");
      await reviewForm.locator('textarea[name="review_rationale"]').fill(COPY.review);
      await reviewForm
        .getByRole("button", { exact: true, name: "Record neutral review" })
        .click();
      await expectSuccess(
        reviewerPage,
        "Neutral review recorded with the fixed confidence band. The result remains provisional during the appeal window.",
      );
      await expectHealthyPage(reviewerPage);
      await screenshot(reviewerPage, testInfo, "06-reviewer-private-evidence-desktop");

      const reviewerAal2AfterReview = await readPrivateEvidence(
        reviewerAuth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(reviewerAal2AfterReview.bundles).toHaveLength(1);
      expect(reviewerAal2AfterReview.items).toEqual([
        { attestation: COPY.evidence, evidence_type: "attestation" },
      ]);
      evidenceAuthorization.activeAssignedReviewerAal2AfterReview = {
        aal: "aal2",
        bundleRows: reviewerAal2AfterReview.bundles.length,
        itemRows: reviewerAal2AfterReview.items.length,
      };

      await setReviewerGrantActive(false);
      await expectAal(reviewerAuth.client, "aal2");
      const revokedReviewerAal2Access = await readPrivateEvidence(
        reviewerAuth.client,
        milestone.id,
        reviewerBundleId,
      );
      expect(revokedReviewerAal2Access).toEqual({ bundles: [], items: [] });
      evidenceAuthorization.revokedAssignedReviewerAal2 = {
        aal: "aal2",
        bundleRows: revokedReviewerAal2Access.bundles.length,
        itemRows: revokedReviewerAal2Access.items.length,
      };
      qaCheckpoint(
        "proved assigned reviewer AAL2 audit access after decision and immediate denial after role revocation",
      );

      const { data: bundles, error: bundlesError } = await ownerAuth.client
        .from("trade_evidence_bundles")
        .select("*")
        .eq("milestone_id", milestone?.id);
      expect(bundlesError).toBeNull();
      expect(bundles).toHaveLength(1);
      expect(bundles?.[0]?.status).toBe("accepted");
      const { data: bundleItems, error: bundleItemsError } = await ownerAuth.client
        .from("trade_evidence_bundle_items")
        .select("attestation,evidence_type,evidence_url,storage_path")
        .eq("bundle_id", bundles?.[0]?.id);
      expect(bundleItemsError).toBeNull();
      expect(bundleItems).toEqual([
        {
          attestation: COPY.evidence,
          evidence_type: "attestation",
          evidence_url: "",
          storage_path: "",
        },
      ]);
      const { data: reviews, error: reviewsError } = await ownerAuth.client
        .from("trade_milestone_reviews")
        .select("*")
        .eq("milestone_id", milestone?.id);
      expect(reviewsError).toBeNull();
      expect(reviews).toHaveLength(1);
      expect(reviews?.[0]?.confidence_band).toBe(100);
      expect(Number(reviews?.[0]?.amount_due_cents)).toBe(0);
      expect(reviews?.[0]?.is_final).toBe(false);
      const { data: payouts, error: payoutsError } = await ownerAuth.client
        .from("trade_milestone_payouts")
        .select("*")
        .eq("milestone_id", milestone?.id);
      expect(payoutsError).toBeNull();
      expect(payouts).toHaveLength(1);
      expect(Number(payouts?.[0]?.amount_due_cents)).toBe(0);
      qaCheckpoint("proved private attestation, mutual reviewer choice, AAL2 review, and zero amount");

      await gotoReady(ownerPage, `/trade-agreements/${agreementId}`);
      const exitForm = formWithButton(ownerPage, "End future obligations");
      await exitForm.locator('textarea[name="reason"]').fill(COPY.exit);
      const exitButton = exitForm.getByRole("button", {
        exact: true,
        name: "End future obligations",
      });
      const exitPath = `/trade-agreements/${agreementId}`;
      const exitResponsePromise = ownerPage.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === exitPath,
      );
      const clickTime = new Date().toISOString();
      await exitButton.click();
      let pendingObservedTime: string | null = null;
      try {
        await expect(exitButton).toHaveText("Recording exit...", { timeout: 2_000 });
        pendingObservedTime = new Date().toISOString();
      } catch {
        // A completed native navigation can replace the form before its pending label is observed.
      }
      const exitResponse = await exitResponsePromise;
      const responseCompletedTime = new Date().toISOString();
      const [requestHeaders, responseHeaders] = await Promise.all([
        exitResponse.request().allHeaders(),
        exitResponse.allHeaders(),
      ]);
      await ownerPage.waitForTimeout(1_500);
      const browserAfterResponse = await ownerPage.evaluate(() => ({
        activeElement: document.activeElement
          ? `${document.activeElement.tagName}${document.activeElement.id ? `#${document.activeElement.id}` : ""}`
          : null,
        bodyHasCancelledLifecycle: document.body.innerText.includes("Agreement cancelled"),
        bodyHasPendingExit: document.body.innerText.includes("Recording exit..."),
        url: window.location.href,
      }));
      const exitDatabaseBoundary = await captureExitDatabaseBoundary(agreementId);
      summary.exitSettlementTimeline = {
        browserAfterResponse,
        clickTime,
        databaseAfterResponseBeforeCleanup: exitDatabaseBoundary,
        formFields: {
          agreement_id: agreementId,
          reason: COPY.exit,
          request_type: "unilateral_exit",
        },
        pendingObservedTime,
        request: {
          actionId: requestHeaders["next-action"] ?? null,
          method: exitResponse.request().method(),
          url: exitResponse.request().url(),
        },
        response: {
          completedTime: responseCompletedTime,
          status: exitResponse.status(),
          statusText: exitResponse.statusText(),
          xActionRedirect: responseHeaders["x-action-redirect"] ?? null,
          xActionRevalidated: responseHeaders["x-action-revalidated"] ?? null,
        },
      };
      qaCheckpoint(
        `captured unilateral-exit response/database boundary: ${JSON.stringify(summary.exitSettlementTimeline)}`,
      );
      await expectSuccess(
        ownerPage,
        "Unilateral exit recorded. Future obligations ended under the published rule.",
      );
      await expect(ownerPage.getByText("Agreement cancelled", { exact: true })).toBeVisible();
      await expectHealthyPage(ownerPage);
      await screenshot(ownerPage, testInfo, "07-owner-prospective-exit-desktop");

      const { data: cancelledAgreement } = await ownerAuth.client
        .from("agreements")
        .select("lifecycle_status,status,exit_reason")
        .eq("id", agreementId)
        .single();
      expect(cancelledAgreement).toEqual({
        exit_reason: COPY.exit,
        lifecycle_status: "cancelled",
        status: "cancelled",
      });
      const { data: exits, error: exitsError } = await ownerAuth.client
        .from("trade_exit_requests")
        .select("reason,request_type,status")
        .eq("agreement_id", agreementId);
      expect(exitsError).toBeNull();
      expect(exits).toEqual([
        { reason: COPY.exit, request_type: "unilateral_exit", status: "executed" },
      ]);
      const { data: retainedVersions } = await ownerAuth.client
        .from("trade_agreement_versions")
        .select("id")
        .eq("agreement_id", agreementId);
      const { data: retainedBundles } = await ownerAuth.client
        .from("trade_evidence_bundles")
        .select("id")
        .eq("milestone_id", milestone?.id);
      const { data: retainedReviews } = await ownerAuth.client
        .from("trade_milestone_reviews")
        .select("id")
        .eq("milestone_id", milestone?.id);
      expect(retainedVersions).toHaveLength(1);
      expect(retainedBundles).toHaveLength(1);
      expect(retainedReviews).toHaveLength(1);

      const { data: responseEvents, error: responseEventsError } =
        await responderAuth.client
          .from("core_loop_events")
          .select("event_type,entity_type,entity_id")
          .eq("event_type", "response_sent");
      expect(responseEventsError).toBeNull();
      expect(responseEvents).toEqual([
        {
          entity_id: selectedInterest?.id,
          entity_type: "interest",
          event_type: "response_sent",
        },
      ]);
      const { data: ownerNotifications, error: ownerNotificationsError } =
        await ownerAuth.client
          .from("trade_notifications")
          .select("href,notification_type")
          .order("created_at", { ascending: true });
      expect(ownerNotificationsError).toBeNull();
      expect(
        (ownerNotifications ?? []).some(
          (notification) => notification.href === `/trade-agreements/${agreementId}`,
        ),
      ).toBe(true);

      const { data: bonds, error: bondsError } = await ownerAuth.client
        .from("performance_bonds")
        .select("id")
        .eq("offer_id", IDS.offer);
      expect(bondsError).toBeNull();
      expect(bonds).toEqual([]);
      const { data: externalReceipts, error: externalReceiptsError } =
        await ownerAuth.client
          .from("trade_external_payment_receipts")
          .select("id")
          .eq("payout_id", payouts?.[0]?.id);
      expect(externalReceiptsError).toBeNull();
      expect(externalReceipts).toEqual([]);

      summary.transitions = [
        "offer:open/published",
        "responses:pending+pending",
        "selected:accepted",
        "competing:declined",
        "agreement:proposed",
        "manifest:frozen",
        "agreement:active",
        "evidence:submitted",
        "review:graded-provisional",
        "agreement:cancelled-by-unilateral-exit",
      ];
      summary.outsiderDenial = {
        agreementRows: outsiderAgreements?.length ?? -1,
        visibleInterestUsers: (outsiderInterests ?? []).map((row) => row.user_id),
      };
      summary.noMoney = {
        externalReceipts: externalReceipts?.length ?? -1,
        maximumAmountCents: Number(milestone?.maximum_amount_cents),
        performanceBonds: bonds?.length ?? -1,
        payoutAmountDueCents: Number(payouts?.[0]?.amount_due_cents),
      };
      summary.durableRows = {
        bundleItems: bundleItems?.length ?? -1,
        bundles: retainedBundles?.length ?? -1,
        confirmations: confirmations?.length ?? -1,
        exits: exits?.length ?? -1,
        reviews: retainedReviews?.length ?? -1,
        systemMessages: systemMessages?.length ?? -1,
        versions: retainedVersions?.length ?? -1,
      };
      summary.coreLoopEvents = (responseEvents ?? []).map((event) => event.event_type);
      summary.consoleFailures = consoleFailures;

      expect(consoleFailures).toEqual([]);
      qaCheckpoint("proved retained audit records, clean console, and no money-moving path");
    } catch (error) {
      testFailure = error;
      throw error;
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
      let cleanupFailure: unknown = null;
      try {
        summary.cleanup = await cleanupQaFixtures();
      } catch (error) {
        cleanupFailure = error;
        summary.cleanup = {
          error: error instanceof Error ? error.message : "Unknown cleanup failure",
        };
      }

      const summaryPath = testInfo.outputPath("evaluator-core-loop-summary.json");
      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
      await testInfo.attach("evaluator-core-loop-summary", {
        contentType: "application/json",
        path: summaryPath,
      });
      if (cleanupFailure && !testFailure) throw cleanupFailure;
    }
  });
});
