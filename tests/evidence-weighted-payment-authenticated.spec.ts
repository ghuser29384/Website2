import { createHmac } from "node:crypto";

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

const BASE_URL =
  process.env.EVIDENCE_PAYMENT_BASE_URL ?? "http://127.0.0.1:3210";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";
const QA_PASSWORD = process.env.EVIDENCE_PAYMENT_QA_PASSWORD ?? "";
const FIXTURE_ENABLED = QA_PASSWORD.length > 0;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMAIL_PATTERN = /^epqa-[0-9a-f]{20}-[a-z-]+@qa\.invalid$/;
const HANDLE_PATTERN = /^epqa-[0-9a-f]{24}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

function fixtureEnv(name: string, pattern: RegExp) {
  const value = process.env[name] ?? "";
  if (FIXTURE_ENABLED && !pattern.test(value)) {
    throw new Error(`Missing or malformed run-owned Evidence-payment fixture value: ${name}`);
  }
  return value;
}

const QA_NAMESPACE_HANDLE = fixtureEnv(
  "EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE",
  HANDLE_PATTERN,
);
const QA_NAMESPACE_HASH = fixtureEnv(
  "EVIDENCE_PAYMENT_QA_NAMESPACE_HASH",
  HASH_PATTERN,
);

const IDS = {
  admin: fixtureEnv("EVIDENCE_PAYMENT_QA_ADMIN_ID", UUID_PATTERN),
  agreement: fixtureEnv("EVIDENCE_PAYMENT_QA_AGREEMENT_ID", UUID_PATTERN),
  adminFallbackAgreement: fixtureEnv(
    "EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_AGREEMENT_ID",
    UUID_PATTERN,
  ),
  appealReviewer: fixtureEnv(
    "EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID",
    UUID_PATTERN,
  ),
  milestone: fixtureEnv("EVIDENCE_PAYMENT_QA_MILESTONE_ID", UUID_PATTERN),
  outsider: fixtureEnv("EVIDENCE_PAYMENT_QA_OUTSIDER_ID", UUID_PATTERN),
  payee: fixtureEnv("EVIDENCE_PAYMENT_QA_PAYEE_ID", UUID_PATTERN),
  payer: fixtureEnv("EVIDENCE_PAYMENT_QA_PAYER_ID", UUID_PATTERN),
  payout: fixtureEnv("EVIDENCE_PAYMENT_QA_PAYOUT_ID", UUID_PATTERN),
  reviewer: fixtureEnv("EVIDENCE_PAYMENT_QA_REVIEWER_ID", UUID_PATTERN),
} as const;

const EMAILS = {
  admin: fixtureEnv("EVIDENCE_PAYMENT_QA_ADMIN_EMAIL", EMAIL_PATTERN),
  appealReviewer: fixtureEnv(
    "EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_EMAIL",
    EMAIL_PATTERN,
  ),
  outsider: fixtureEnv("EVIDENCE_PAYMENT_QA_OUTSIDER_EMAIL", EMAIL_PATTERN),
  payee: fixtureEnv("EVIDENCE_PAYMENT_QA_PAYEE_EMAIL", EMAIL_PATTERN),
  payer: fixtureEnv("EVIDENCE_PAYMENT_QA_PAYER_EMAIL", EMAIL_PATTERN),
  reviewer: fixtureEnv("EVIDENCE_PAYMENT_QA_REVIEWER_EMAIL", EMAIL_PATTERN),
} as const;

if (FIXTURE_ENABLED) {
  if (SUPABASE_URL !== "https://hvmxfjjbdcgjjudmthdz.supabase.co") {
    throw new Error("Refusing to run Evidence-payment authenticated QA outside isolated QA.");
  }
  const ids = Object.values(IDS);
  const emails = Object.values(EMAILS);
  if (new Set(ids).size !== ids.length || new Set(emails).size !== emails.length) {
    throw new Error("Run-owned Evidence-payment fixture identifiers are not unique.");
  }
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
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBytes)
    .digest();
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
  const { data: enrollment, error: enrollmentError } =
    await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `evidence-payment-${QA_NAMESPACE_HANDLE}-${Date.now()}`,
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
      const { data: sessionData, error: sessionError } =
        await client.auth.getSession();
      if (!sessionError && sessionData.session) {
        return { aal1Session, session: sessionData.session };
      }
    }
    lastError = error?.message ?? "missing AAL2 session";
  }

  throw new Error(`TOTP verification failed: ${lastError}`);
}

async function sessionCookies(session: Session) {
  const captured: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
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
    name,
    value,
    url: BASE_URL,
    httpOnly: true,
    secure: BASE_URL.startsWith("https://"),
    sameSite: "Lax" as const,
  }));
}

async function authenticatedContext(
  browser: Browser,
  session: Session,
  viewport: { height: number; width: number },
) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
  });
  context.setDefaultTimeout(10_000);
  context.setDefaultNavigationTimeout(20_000);
  await context.addCookies(await sessionCookies(session));
  return context;
}

function qaCheckpoint(message: string) {
  console.log(
    `[evidence-payment-qa:${QA_NAMESPACE_HANDLE}:${QA_NAMESPACE_HASH.slice(0, 12)}] ${message}`,
  );
}

async function expectSuccess(page: Page, message: string) {
  await expect(page.getByText(message, { exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

async function waitForInteractivePage(page: Page) {
  await page.waitForLoadState("networkidle");
}

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await waitForInteractivePage(page);
}

function formWithButton(page: Page, buttonName: string) {
  return page.locator("form").filter({
    has: page.getByRole("button", { name: buttonName, exact: true }),
  });
}

async function nominatePaymentReviewer(page: Page, reviewerId: string) {
  await waitForInteractivePage(page);
  const form = page.locator("form").filter({
    has: page.getByRole("heading", {
      name: "Choose a reviewer for the disputed or unanswered receipt",
      exact: true,
    }),
  });
  await expect(form).toHaveCount(1);
  await form.locator('select[name="reviewer_id"]').selectOption(reviewerId);
  await form
    .getByRole("button", {
      name: "Record payment-reviewer nomination",
      exact: true,
    })
    .click();
  await expectSuccess(
    page,
    "Payment-reviewer nomination recorded. Assignment requires both participants to choose the same eligible reviewer.",
  );
}

async function nominatePaymentAppealReviewer(
  page: Page,
  reviewerId: string,
) {
  await waitForInteractivePage(page);
  const form = page.locator("form").filter({
    has: page.getByRole("heading", {
      name: "Choose a different neutral reviewer",
      exact: true,
    }),
  });
  await expect(form).toHaveCount(1);
  await form.locator('select[name="reviewer_id"]').selectOption(reviewerId);
  await form
    .getByRole("button", {
      name: "Record payment-appeal nomination",
      exact: true,
    })
    .click();
  await expectSuccess(
    page,
    "Payment-appeal reviewer nomination recorded. The reviewer must differ from the original payment reviewer.",
  );
}

async function reportExternalPayment(page: Page, reference: string) {
  await waitForInteractivePage(page);
  const form = formWithButton(page, "Report external payment");
  await expect(form).toHaveCount(1);
  await form.locator('input[name="payment_provider"]').fill("QA bank");
  await form
    .locator('input[name="paid_at"]')
    .fill(new Date().toISOString().slice(0, 10));
  await form
    .locator('input[name="external_reference"]')
    .fill(`${QA_NAMESPACE_HANDLE}-${reference}`);
  await form.locator('input[name="payment_attested"]').check();
  await form
    .getByRole("button", { name: "Report external payment", exact: true })
    .click();
  await expectSuccess(
    page,
    "External payment reported privately. The payee has seven days to confirm or dispute the receipt.",
  );
}

async function recordPaymentReviewDecision(
  page: Page,
  outcome: "allow_correction" | "confirm_paid" | "still_due",
  rationale: string,
) {
  await waitForInteractivePage(page);
  const form = formWithButton(page, "Record payment-review decision");
  await expect(form).toHaveCount(1);
  await form
    .locator('select[name="payment_review_outcome"]')
    .selectOption(outcome);
  await form
    .locator('textarea[name="payment_review_rationale"]')
    .fill(rationale);
  await form
    .getByRole("button", {
      name: "Record payment-review decision",
      exact: true,
    })
    .click();
}

async function recordPaymentAppealDecision(
  page: Page,
  outcome: "confirm_paid" | "still_due",
  rationale: string,
) {
  await waitForInteractivePage(page);
  const form = formWithButton(page, "Record final payment-appeal decision");
  await expect(form).toHaveCount(1);
  await form
    .locator('select[name="payment_appeal_outcome"]')
    .selectOption(outcome);
  await form
    .locator('textarea[name="payment_review_rationale"]')
    .fill(rationale);
  await form
    .getByRole("button", {
      name: "Record final payment-appeal decision",
      exact: true,
    })
    .click();
}

test.describe("authenticated evidence-weighted payment release gate", () => {
  test("completes every role, viewport, and negative-authorization path", async ({
    browser,
  }) => {
    test.setTimeout(5 * 60_000);
    test.skip(!QA_PASSWORD, "EVIDENCE_PAYMENT_QA_PASSWORD is required.");

    const anonymousClient = authClient();
    const anonymousLegacyCalls = [
      anonymousClient.rpc("register_trade_evidence_v3", {
        p_actor_id: IDS.payer,
        p_agreement_id: IDS.agreement,
        p_submission_key: `anonymous-${Date.now()}`,
        p_evidence_type: "attestation",
        p_storage_path: "",
        p_evidence_url: "",
        p_attestation: "This call must never reach the legacy function.",
        p_replaces_evidence_id: null,
      }),
      anonymousClient.rpc("publish_trade_evidence_v3", {
        p_actor_id: IDS.payer,
        p_evidence_id: IDS.milestone,
        p_public_title: "",
        p_public_summary: "",
        p_public_url: "",
        p_public_storage_path: "",
        p_public_original_filename: "",
        p_public_mime_type: "",
        p_public_redaction_note: "This call must be denied before execution.",
      }),
      anonymousClient.rpc("review_trade_evidence_v3", {
        p_actor_id: IDS.payee,
        p_evidence_id: IDS.milestone,
        p_decision: "accept",
        p_challenge_reason: "",
      }),
      anonymousClient.rpc("withdraw_trade_evidence_v3", {
        p_actor_id: IDS.payer,
        p_evidence_id: IDS.milestone,
        p_reason: "This call must be denied before execution.",
      }),
    ];
    for (const legacyCall of anonymousLegacyCalls) {
      const { data, error } = await legacyCall;
      expect(data).toBeNull();
      expect(error?.code).toBe("42501");
    }
    qaCheckpoint("blocked anonymous legacy evidence RPC impersonation");

    const payerAuth = await signIn(EMAILS.payer);
    const payeeAuth = await signIn(EMAILS.payee);
    const reviewerAuth = await signIn(EMAILS.reviewer);
    const appealReviewerAuth = await signIn(EMAILS.appealReviewer);
    const outsiderAuth = await signIn(EMAILS.outsider);
    const adminAuth = await signIn(EMAILS.admin);
    qaCheckpoint("signed in all six isolated-QA roles");

    const reviewerAal2 = await elevateWithTotp(
      reviewerAuth.client,
      reviewerAuth.session,
    );
    const appealReviewerAal2 = await elevateWithTotp(
      appealReviewerAuth.client,
      appealReviewerAuth.session,
    );
    const adminAal2 = await elevateWithTotp(
      adminAuth.client,
      adminAuth.session,
    );
    qaCheckpoint(
      "verified reviewer, appeal-reviewer, and administrator AAL2 sessions",
    );

    const contexts: BrowserContext[] = [];
    const context = async (
      session: Session,
      viewport: { height: number; width: number },
    ) => {
      const created = await authenticatedContext(browser, session, viewport);
      contexts.push(created);
      return created;
    };

    try {
      const payer = await context(payerAuth.session, {
        width: 1440,
        height: 1000,
      });
      const payee = await context(payeeAuth.session, {
        width: 390,
        height: 844,
      });
      const reviewerAal1 = await context(reviewerAal2.aal1Session, {
        width: 1280,
        height: 900,
      });
      const reviewer = await context(reviewerAal2.session, {
        width: 1440,
        height: 1000,
      });
      const appealReviewer = await context(appealReviewerAal2.session, {
        width: 412,
        height: 915,
      });
      const outsider = await context(outsiderAuth.session, {
        width: 1280,
        height: 900,
      });
      const adminAal1 = await context(adminAal2.aal1Session, {
        width: 1280,
        height: 900,
      });
      const admin = await context(adminAal2.session, {
        width: 1440,
        height: 1000,
      });

      const outsiderPage = await outsider.newPage();
      await gotoReady(
        outsiderPage,
        `/trade-agreements/${IDS.agreement}`,
      );
      await expect(
        outsiderPage.getByRole("heading", {
          name: "Unavailable",
          exact: true,
        }),
      ).toBeVisible();
      const { data: outsiderCases, error: outsiderReadError } =
        await outsiderAuth.client
          .from("trade_payment_review_cases")
          .select("id")
          .eq("payout_id", IDS.payout);
      expect(outsiderReadError).toBeNull();
      expect(outsiderCases).toEqual([]);
      const { error: outsiderReportError } = await outsiderAuth.client.rpc(
        "report_trade_external_payment_v1",
        {
          p_amount_cents: 250,
          p_currency: "USD",
          p_paid_on: new Date().toISOString().slice(0, 10),
          p_payout_id: IDS.payout,
          p_provider: "QA outsider",
          p_provider_reference: `${QA_NAMESPACE_HANDLE}-outsider-${Date.now()}`,
          p_receipt_storage_path: "",
        },
      );
      expect(outsiderReportError).not.toBeNull();
      qaCheckpoint("passed outsider read/RPC denial");

      const reviewerAal1Page = await reviewerAal1.newPage();
      await gotoReady(
        reviewerAal1Page,
        `/trade-review/${IDS.milestone}`,
      );
      await expect(
        reviewerAal1Page.getByText("Authenticator verification required", {
          exact: true,
        }),
      ).toBeVisible();

      const adminAal1Page = await adminAal1.newPage();
      await gotoReady(adminAal1Page, "/admin/trade-review");
      await expect(
        adminAal1Page.getByText("Operator access blocked", { exact: true }),
      ).toBeVisible();
      qaCheckpoint("passed reviewer and administrator AAL1 denials");

      const adminPage = await admin.newPage();
      await gotoReady(adminPage, "/admin/trade-review");
      await expect(
        adminPage.getByText(
          "Profile-bound administrator grant with active AAL2 MFA.",
          { exact: true },
        ),
      ).toBeVisible();
      const adminFallbackForm = adminPage.locator("form").filter({
        has: adminPage.getByRole("heading", {
          name: "Assign a neutral payment reviewer",
          exact: true,
        }),
      });
      await expect(adminFallbackForm).toHaveCount(1);
      await adminFallbackForm
        .locator('select[name="reviewer_id"]')
        .selectOption(IDS.reviewer);
      await adminFallbackForm
        .getByRole("button", {
          name: "Assign payment reviewer",
          exact: true,
        })
        .click();
      await expectSuccess(
        adminPage,
        "Neutral payment reviewer assigned after the seven-day participant-selection deadline.",
      );
      qaCheckpoint("completed MFA-gated administrator fallback");

      const payerPage = await payer.newPage();
      await gotoReady(payerPage, `/trade-agreements/${IDS.agreement}`);
      await expect(
        payerPage.getByRole("heading", {
          name: "Record payment made outside Moral Trade",
          exact: true,
        }),
      ).toBeVisible();
      await reportExternalPayment(payerPage, `initial-${Date.now()}`);
      qaCheckpoint("reported initial external payment on desktop");

      const payeePage = await payee.newPage();
      await gotoReady(payeePage, `/trade-agreements/${IDS.agreement}`);
      expect(
        await payeePage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      const initialResponseForm = formWithButton(
        payeePage,
        "Dispute payment report",
      );
      await expect(initialResponseForm).toHaveCount(1);
      await initialResponseForm
        .locator('textarea[name="confirmation_note"]')
        .fill("The initial external-payment evidence is not sufficient.");
      await initialResponseForm
        .getByRole("button", {
          name: "Dispute payment report",
          exact: true,
        })
        .click();
      await expectSuccess(
        payeePage,
        "External payment marked disputed. The private receipt and history remain available for resolution.",
      );
      qaCheckpoint("disputed initial receipt on mobile");

      await gotoReady(payerPage, `/trade-agreements/${IDS.agreement}`);
      await nominatePaymentReviewer(payerPage, IDS.reviewer);
      await gotoReady(payeePage, `/trade-agreements/${IDS.agreement}`);
      await nominatePaymentReviewer(payeePage, IDS.reviewer);
      qaCheckpoint("completed mutual payment-reviewer nomination");

      const reviewerPage = await reviewer.newPage();
      await gotoReady(reviewerPage, `/trade-review/${IDS.milestone}`);
      await expect(
        reviewerPage.getByRole("heading", {
          name: "Decide whether the frozen external amount was paid.",
          exact: true,
        }),
      ).toBeVisible();
      await recordPaymentReviewDecision(
        reviewerPage,
        "allow_correction",
        "The payer may provide one corrected receipt.",
      );
      await expectSuccess(
        reviewerPage,
        "External-payment review recorded. A paid/still-due decision remains provisional for seven days; correction permission is not appealable.",
      );
      qaCheckpoint("allowed one corrected receipt");

      await gotoReady(payerPage, `/trade-agreements/${IDS.agreement}`);
      await expect(
        payerPage.getByRole("heading", {
          name: "Submit the one permitted corrected receipt",
          exact: true,
        }),
      ).toBeVisible();
      await reportExternalPayment(payerPage, `correction-${Date.now()}`);
      qaCheckpoint("submitted corrected receipt with a fresh response window");

      await gotoReady(payeePage, `/trade-agreements/${IDS.agreement}`);
      const correctedResponseForm = formWithButton(
        payeePage,
        "Dispute payment report",
      );
      await expect(correctedResponseForm).toHaveCount(1);
      await correctedResponseForm
        .locator('textarea[name="confirmation_note"]')
        .fill("The corrected receipt still does not establish payment.");
      await correctedResponseForm
        .getByRole("button", {
          name: "Dispute payment report",
          exact: true,
        })
        .click();
      await expectSuccess(
        payeePage,
        "External payment marked disputed. The private receipt and history remain available for resolution.",
      );
      qaCheckpoint("disputed corrected receipt on mobile");

      await gotoReady(reviewerPage, `/trade-review/${IDS.milestone}`);
      await recordPaymentReviewDecision(
        reviewerPage,
        "still_due",
        "The corrected receipt remains insufficient; the frozen amount is still due.",
      );
      await expectSuccess(
        reviewerPage,
        "External-payment review recorded. A paid/still-due decision remains provisional for seven days; correction permission is not appealable.",
      );
      qaCheckpoint("recorded provisional still-due decision");

      await gotoReady(payerPage, `/trade-agreements/${IDS.agreement}`);
      const appealRequestForm = formWithButton(
        payerPage,
        "Open the single payment appeal",
      );
      await expect(appealRequestForm).toHaveCount(1);
      await appealRequestForm
        .locator('textarea[name="payment_appeal_reason"]')
        .fill(
          "A different reviewer should reconsider the corrected receipt facts.",
        );
      await appealRequestForm
        .getByRole("button", {
          name: "Open the single payment appeal",
          exact: true,
        })
        .click();
      await expectSuccess(
        payerPage,
        "The single payment appeal is open and requires a different neutral reviewer.",
      );
      qaCheckpoint("opened the single payment appeal");

      const { data: paymentCase } = await payerAuth.client
        .from("trade_payment_review_cases")
        .select("id")
        .eq("payout_id", IDS.payout)
        .eq("payment_cycle", 1)
        .single();
      const { data: paymentAppeal } = await payerAuth.client
        .from("trade_payment_appeals")
        .select("id")
        .eq("case_id", paymentCase?.id)
        .single();
      const { error: originalReviewerAppealError } =
        await reviewerAuth.client.rpc("resolve_trade_payment_appeal_v1", {
          p_appeal_id: paymentAppeal?.id,
          p_outcome: "still_due",
          p_private_reason:
            "The original reviewer must not decide the appeal.",
        });
      expect(originalReviewerAppealError).not.toBeNull();
      qaCheckpoint("blocked original reviewer from deciding the appeal");

      await nominatePaymentAppealReviewer(
        payerPage,
        IDS.appealReviewer,
      );
      await gotoReady(payeePage, `/trade-agreements/${IDS.agreement}`);
      await nominatePaymentAppealReviewer(
        payeePage,
        IDS.appealReviewer,
      );
      qaCheckpoint("completed different-reviewer appeal nomination");

      const appealReviewerPage = await appealReviewer.newPage();
      await gotoReady(
        appealReviewerPage,
        `/trade-review/${IDS.milestone}`,
      );
      expect(
        await appealReviewerPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      await expect(
        appealReviewerPage.getByText("Independent payment appeal", {
          exact: true,
        }),
      ).toBeVisible();
      await recordPaymentAppealDecision(
        appealReviewerPage,
        "still_due",
        "The independent appeal confirms the frozen amount remains due.",
      );
      await expectSuccess(
        appealReviewerPage,
        "The different neutral reviewer recorded the final external-payment decision.",
      );
      qaCheckpoint("recorded final still-due appeal decision on mobile");

      await gotoReady(payerPage, `/trade-agreements/${IDS.agreement}`);
      await expect(
        payerPage.getByRole("heading", {
          name: "Report a later external payment",
          exact: true,
        }),
      ).toBeVisible();
      await reportExternalPayment(payerPage, `cycle-2-${Date.now()}`);
      qaCheckpoint("reported a later external-payment cycle");

      await gotoReady(payeePage, `/trade-agreements/${IDS.agreement}`);
      await payeePage
        .getByRole("button", {
          name: "Confirm payment received",
          exact: true,
        })
        .click();
      await expectSuccess(
        payeePage,
        "External payment confirmed. Moral Trade recorded the receipt without moving funds.",
      );
      qaCheckpoint("confirmed external payment on mobile");

      await gotoReady(payerPage, `/trade-agreements/${IDS.agreement}`);
      await expect(
        payerPage.getByText("Completed", { exact: true }),
      ).toBeVisible();
      await expect(
        payerPage.getByText("2.50 USD", { exact: true }),
      ).toBeVisible();

      const { data: finalAgreement, error: agreementError } =
        await payerAuth.client
          .from("agreements")
          .select("lifecycle_status,completion_state,completed_at")
          .eq("id", IDS.agreement)
          .single();
      expect(agreementError).toBeNull();
      expect(finalAgreement?.lifecycle_status).toBe("completed");
      expect(finalAgreement?.completion_state).toBe("reviewed_complete");
      expect(finalAgreement?.completed_at).not.toBeNull();

      const { data: finalPayout, error: payoutError } =
        await payerAuth.client
          .from("trade_milestone_payouts")
          .select("status,amount_due_cents")
          .eq("id", IDS.payout)
          .single();
      expect(payoutError).toBeNull();
      expect(finalPayout).toMatchObject({
        status: "confirmed",
        amount_due_cents: 250,
      });

      const { error: payeeDirectWriteError } = await payeeAuth.client
        .from("trade_milestone_payouts")
        .update({ status: "still_due" })
        .eq("id", IDS.payout);
      expect(payeeDirectWriteError).not.toBeNull();
      qaCheckpoint("verified completion and blocked a direct payout write");
    } finally {
      await Promise.all(
        contexts.map((openContext) => openContext.close()),
      );
    }
  });
});
