import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import {
  parseCalibrationExport,
  type AnalysisPlan,
} from "../src/lib/evidence-credibility-calibration-analysis";

const BASE_URL =
  process.env.EVIDENCE_CREDIBILITY_BASE_URL ?? "http://127.0.0.1:3210";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const QA_PASSWORD = process.env.EVIDENCE_CREDIBILITY_QA_PASSWORD ?? "";
const RUN_KEY = process.env.EVIDENCE_CREDIBILITY_QA_RUN_KEY ?? "missing-run-key";
const SCREENSHOT_DIR =
  process.env.EVIDENCE_CREDIBILITY_SCREENSHOT_DIR ??
  join(process.cwd(), "evidence-credibility-preview-evidence", "screenshots");

const PLAN_VERSION = "evidence-credibility-calibration-analysis-v1.0.0";
const PLAN_HASH =
  "3cecee47d8e60bd9dcf540ccad6e7023fe99ddbf199b359fc56e5d7ecf449302";

const IDS = {
  payer: "71000000-0000-4000-8000-000000000001",
  performer: "71000000-0000-4000-8000-000000000002",
  originalReviewer: "71000000-0000-4000-8000-000000000003",
  independentReviewer: "71000000-0000-4000-8000-000000000004",
  outsider: "71000000-0000-4000-8000-000000000005",
  administrator: "71000000-0000-4000-8000-000000000006",
  agreement: "72000000-0000-4000-8000-000000000001",
  milestone: "74000000-0000-4000-8000-000000000001",
  review: "76000000-0000-4000-8000-000000000001",
  payout: "77000000-0000-4000-8000-000000000001",
} as const;

const EMAILS = {
  originalReviewer: "evidence-payment-reviewer@qa.invalid",
  independentReviewer: "evidence-payment-appeal-reviewer@qa.invalid",
  administrator: "evidence-payment-admin@qa.invalid",
  outsider: "evidence-payment-outsider@qa.invalid",
} as const;

const PRIVATE_CAPTURE_RATIONALE =
  "QA-only capture rationale for the private shadow calibration acceptance gate.";
const PRIVATE_EXCLUSION_REASON =
  "QA-only confidence-zero reason used to force mandatory blind-audit sampling.";
const PRIVATE_AUDIT_RATIONALE =
  "QA-only independent blind-review rationale based solely on the frozen obligation and submitted attestation.";
const EVIDENCE_ATTESTATION =
  "QA-only evidence-credibility attestation for independent blind review.";

function requireEnvironment() {
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", SUPABASE_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY],
    ["EVIDENCE_CREDIBILITY_QA_PASSWORD", QA_PASSWORD],
  ].filter(([, value]) => !value);
  if (missing.length) {
    throw new Error(`Missing required QA environment: ${missing.map(([name]) => name).join(", ")}`);
  }
  if (!SUPABASE_URL.includes("hvmxfjjbdcgjjudmthdz")) {
    throw new Error("Refusing browser acceptance outside the isolated MoralTrade QA project.");
  }
  if (SUPABASE_URL.includes("jnpoxvalyjtdghnperyu")) {
    throw new Error("Production Supabase URL detected; refusing browser acceptance.");
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

function publicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function serviceClient() {
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn(email: string) {
  const client = publicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Isolated-QA sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return { client, session: data.session };
}

async function elevateWithTotp(client: SupabaseClient, aal1Session: Session) {
  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `evidence-credibility-${RUN_KEY}-${Date.now()}`,
  });
  if (enrollmentError || !enrollment?.totp?.secret) {
    throw new Error(`TOTP enrollment failed: ${enrollmentError?.message ?? "missing secret"}`);
  }

  let lastError = "";
  for (const offset of [0, -1, 1]) {
    const { data, error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code: totpCode(enrollment.totp.secret, offset),
    });
    if (data && !error) {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
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
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  await context.addCookies([
    ...(await sessionCookies(session)),
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: BASE_URL.startsWith("https://"),
      sameSite: "Lax" as const,
    },
  ]);
  return context;
}

function attachHealthChecks(
  page: Page,
  errors: string[],
  serverFailures: string[],
  label: string,
) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${label}: console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`${label}: pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverFailures.push(`${label}: ${response.status()} ${response.url()}`);
    }
  });
}

async function gotoReady(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.locator("body")).not.toHaveText(/^\s*$/);
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
}

async function screenshot(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function exactCount(
  client: ReturnType<typeof serviceClient>,
  table: string,
) {
  const { count, error } = await (client as any)
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`Could not count ${table}: ${error.message}`);
  return Number(count ?? 0);
}

async function activeSnapshot(client: ReturnType<typeof serviceClient>) {
  const [events, aggregates, restrictions, controlsResult] = await Promise.all([
    exactCount(client, "credibility_events"),
    exactCount(client, "credibility_public_aggregates"),
    exactCount(client, "credibility_restrictions"),
    (client as any)
      .from("credibility_shadow_controls")
      .select(
        "mode,milestone_cutover_enabled,public_effects_enabled,ranking_effects_enabled,eligibility_effects_enabled",
      )
      .eq("control_key", "evidence_decision_v2")
      .single(),
  ]);
  if (controlsResult.error) {
    throw new Error(`Could not read shadow controls: ${controlsResult.error.message}`);
  }
  return {
    events,
    aggregates,
    restrictions,
    controls: controlsResult.data,
  };
}

function caseCode(drawId: string) {
  return `AUD-${drawId.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

function assertNoSensitiveExportContent(jsonl: string) {
  for (const forbidden of [
    ...Object.values(IDS),
    ...Object.values(EMAILS),
    PRIVATE_CAPTURE_RATIONALE,
    PRIVATE_EXCLUSION_REASON,
    PRIVATE_AUDIT_RATIONALE,
    EVIDENCE_ATTESTATION,
    "Full completion at moderate confidence.",
  ]) {
    expect(jsonl).not.toContain(forbidden);
  }
}

requireEnvironment();

test.describe("private evidence-credibility shadow Preview acceptance", () => {
  test("proves AAL2 capture, independent blinding, immutable export, and zero active effects", async ({
    browser,
  }) => {
    test.setTimeout(8 * 60_000);

    const service = serviceClient();
    const beforeActive = await activeSnapshot(service);
    expect(beforeActive.controls).toEqual({
      mode: "shadow",
      milestone_cutover_enabled: false,
      public_effects_enabled: false,
      ranking_effects_enabled: false,
      eligibility_effects_enabled: false,
    });

    const adminAuth = await signIn(EMAILS.administrator);
    const originalReviewerAuth = await signIn(EMAILS.originalReviewer);
    const independentReviewerAuth = await signIn(EMAILS.independentReviewer);
    const outsiderAuth = await signIn(EMAILS.outsider);

    const [adminAal2, originalReviewerAal2, independentReviewerAal2] =
      await Promise.all([
        elevateWithTotp(adminAuth.client, adminAuth.session),
        elevateWithTotp(originalReviewerAuth.client, originalReviewerAuth.session),
        elevateWithTotp(independentReviewerAuth.client, independentReviewerAuth.session),
      ]);

    const contexts: BrowserContext[] = [];
    const errors: string[] = [];
    const serverFailures: string[] = [];
    const makeContext = async (
      session: Session,
      viewport: { width: number; height: number },
      label: string,
    ) => {
      const context = await authenticatedContext(browser, session, viewport);
      contexts.push(context);
      const page = await context.newPage();
      attachHealthChecks(page, errors, serverFailures, label);
      return { context, page };
    };

    try {
      const adminAal1Browser = await makeContext(
        adminAal2.aal1Session,
        { width: 1280, height: 900 },
        "admin-aal1",
      );
      await gotoReady(adminAal1Browser.page, "/admin/evidence-calibration");
      await expect(
        adminAal1Browser.page.getByText("Private capture access blocked", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        adminAal1Browser.page.getByRole("button", {
          name: "Record private shadow decision",
          exact: true,
        }),
      ).toHaveCount(0);

      const outsiderBrowser = await makeContext(
        outsiderAuth.session,
        { width: 1280, height: 900 },
        "outsider",
      );
      await gotoReady(outsiderBrowser.page, "/admin/evidence-calibration");
      await expect(
        outsiderBrowser.page.getByText("Private capture access blocked", {
          exact: true,
        }),
      ).toBeVisible();

      const adminBrowser = await makeContext(
        adminAal2.session,
        { width: 1440, height: 1000 },
        "admin-aal2",
      );
      const adminPage = adminBrowser.page;
      await gotoReady(adminPage, "/admin/evidence-calibration");
      await expect(adminPage).toHaveTitle(/Evidence calibration capture/i);
      await expect(
        adminPage.getByRole("heading", {
          name: "Capture final evidence and settlement decisions for calibration.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(adminPage.getByText(EVIDENCE_ATTESTATION, { exact: false })).toHaveCount(0);
      await screenshot(adminPage, "01-admin-capture-desktop");

      const captureForm = adminPage.locator("form").filter({
        has: adminPage.locator(
          `input[name="milestone_id"][value="${IDS.milestone}"]`,
        ),
      });
      await expect(captureForm).toHaveCount(1);
      await expect(captureForm.getByText("Attestation: 1", { exact: true })).toBeVisible();
      await captureForm
        .locator('select[name="decision_confidence_band"]')
        .selectOption("0");
      await captureForm
        .locator('select[name="primary_provenance_class"]')
        .selectOption("independent_third_party");
      await captureForm
        .locator('select[name="provider_authentication_status"]')
        .selectOption("not_applicable");
      await captureForm
        .locator('select[name="contradiction_status"]')
        .selectOption("none");
      await captureForm
        .locator('select[name="integrity_finding"]')
        .selectOption("not_assessed");
      await captureForm
        .locator('select[name="responsiveness_finding"]')
        .selectOption("on_time");
      await captureForm
        .locator('select[name="dispute_conduct_finding"]')
        .selectOption("not_assessed");
      await captureForm
        .locator('select[name="finality_reason"]')
        .selectOption("review_final");
      await captureForm
        .locator('textarea[name="exclusion_reason"]')
        .fill(PRIVATE_EXCLUSION_REASON);
      await captureForm
        .locator('textarea[name="private_rationale"]')
        .fill(PRIVATE_CAPTURE_RATIONALE);
      await captureForm
        .getByRole("button", {
          name: "Record private shadow decision",
          exact: true,
        })
        .click();
      await expect(
        adminPage.getByText(
          "Private shadow evidence decision recorded. Public credibility and all activation switches remain unchanged.",
          { exact: true },
        ),
      ).toBeVisible({ timeout: 30_000 });

      const { data: decision, error: decisionError } = await (service as any)
        .from("trade_evidence_decisions")
        .select("*")
        .eq("milestone_id", IDS.milestone)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (decisionError || !decision) {
        throw new Error(
          `Captured evidence decision is unavailable: ${decisionError?.message ?? "missing row"}`,
        );
      }
      const frozenDecisionSnapshot = JSON.stringify(decision);
      expect(decision.decision_confidence_band).toBe(0);

      await gotoReady(adminPage, "/admin/evidence-calibration/audits");
      await expect(adminPage).toHaveTitle(/Evidence calibration audits/i);
      await expect(
        adminPage.getByRole("heading", {
          name: "Assign blinded second reviews.",
          exact: true,
        }),
      ).toBeVisible();
      await adminPage
        .getByRole("button", {
          name: "Materialize new calibration draws",
          exact: true,
        })
        .click();
      await expect(
        adminPage.getByText(
          "Every newly eligible terminal decision received an immutable draw; selected cases are ready for independent assignment.",
          { exact: true },
        ),
      ).toBeVisible({ timeout: 30_000 });

      const { data: draw, error: drawError } = await (service as any)
        .from("evidence_credibility_calibration_draws")
        .select("*")
        .eq("evidence_decision_id", decision.id)
        .single();
      if (drawError || !draw) {
        throw new Error(`Calibration draw is unavailable: ${drawError?.message ?? "missing row"}`);
      }
      expect(draw.selected).toBe(true);
      expect(draw.selected_reason).toBe(
        "mandatory_zero_confidence_or_review_required",
      );

      const conflictExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: conflictData, error: conflictError } = await (
        adminAuth.client as any
      ).rpc("assign_evidence_credibility_calibration_audit_v1", {
        p_draw_id: draw.id,
        p_reviewer_id: IDS.originalReviewer,
        p_request_key: `qa-conflict:${RUN_KEY}`,
        p_expires_at: conflictExpiry,
      });
      expect(conflictData).toBeNull();
      expect(conflictError?.message).toMatch(
        /independent of every reviewer in the decision lineage and both parties/i,
      );

      await gotoReady(adminPage, "/admin/evidence-calibration/audits");
      const assignmentForm = adminPage.locator("form").filter({
        has: adminPage.locator(`input[name="draw_id"][value="${draw.id}"]`),
      });
      await expect(assignmentForm).toHaveCount(1);
      const reviewerSelect = assignmentForm.locator('select[name="reviewer_id"]');
      await expect(
        reviewerSelect.locator(`option[value="${IDS.originalReviewer}"]`),
      ).toHaveCount(0);
      await expect(
        reviewerSelect.locator(`option[value="${IDS.payer}"]`),
      ).toHaveCount(0);
      await expect(
        reviewerSelect.locator(`option[value="${IDS.performer}"]`),
      ).toHaveCount(0);
      await expect(
        reviewerSelect.locator(`option[value="${IDS.independentReviewer}"]`),
      ).toHaveCount(1);
      await reviewerSelect.selectOption(IDS.independentReviewer);
      await screenshot(adminPage, "02-admin-audit-assignment-desktop");
      await assignmentForm
        .getByRole("button", {
          name: "Assign independent audit",
          exact: true,
        })
        .click();
      await expect(
        adminPage.getByText(
          "Blind audit assigned to an independent reviewer. The underlying participant decision was not changed.",
          { exact: true },
        ),
      ).toBeVisible({ timeout: 30_000 });

      const { data: assignment, error: assignmentError } = await (service as any)
        .from("evidence_credibility_calibration_audit_assignments")
        .select("*")
        .eq("draw_id", draw.id)
        .single();
      if (assignmentError || !assignment) {
        throw new Error(
          `Calibration assignment is unavailable: ${assignmentError?.message ?? "missing row"}`,
        );
      }
      expect(assignment.reviewer_id).toBe(IDS.independentReviewer);

      const originalReviewerBrowser = await makeContext(
        originalReviewerAal2.session,
        { width: 1280, height: 900 },
        "original-reviewer-aal2",
      );
      await gotoReady(
        originalReviewerBrowser.page,
        "/review/evidence-calibration",
      );
      await expect(
        originalReviewerBrowser.page.getByText(
          "No blind calibration audit is assigned to you.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        originalReviewerBrowser.page.getByText(caseCode(draw.id), {
          exact: true,
        }),
      ).toHaveCount(0);

      const independentReviewerBrowser = await makeContext(
        independentReviewerAal2.session,
        { width: 390, height: 844 },
        "independent-reviewer-mobile",
      );
      const reviewerPage = independentReviewerBrowser.page;
      await gotoReady(reviewerPage, "/review/evidence-calibration");
      await expect(reviewerPage).toHaveTitle(/Blinded evidence calibration review/i);
      await expect(
        reviewerPage.getByRole("heading", {
          name: "Review the evidence, not the prior judgment.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        reviewerPage.getByText(caseCode(draw.id), { exact: true }),
      ).toBeVisible();
      await expect(
        reviewerPage.getByText(EVIDENCE_ATTESTATION, { exact: true }),
      ).toBeVisible();
      for (const forbiddenText of [
        PRIVATE_CAPTURE_RATIONALE,
        PRIVATE_EXCLUSION_REASON,
        "Full completion at moderate confidence.",
        "Original confidence",
        "Original reviewer",
        "Provenance weight",
        "Independent third party",
      ]) {
        await expect(reviewerPage.getByText(forbiddenText, { exact: false })).toHaveCount(0);
      }
      await screenshot(reviewerPage, "03-independent-reviewer-mobile");

      const labelForm = reviewerPage.locator("form").filter({
        has: reviewerPage.locator(
          `input[name="assignment_id"][value="${assignment.id}"]`,
        ),
      });
      await expect(labelForm).toHaveCount(1);
      await labelForm.locator('select[name="final_status"]').selectOption("eligible");
      await labelForm.locator('input[name="final_outcome"]').fill("1");
      await labelForm
        .locator('select[name="final_finality_reason"]')
        .selectOption("review_final");
      await labelForm
        .locator('select[name="final_integrity_finding"]')
        .selectOption("not_assessed");
      await labelForm
        .locator('select[name="final_responsiveness_finding"]')
        .selectOption("on_time");
      await labelForm
        .locator('select[name="final_dispute_conduct_finding"]')
        .selectOption("not_assessed");
      await labelForm
        .locator('textarea[name="private_rationale"]')
        .fill(PRIVATE_AUDIT_RATIONALE);
      await labelForm.locator('input[name="blinding_complete"]').check();
      await labelForm
        .getByRole("button", {
          name: "Record independent label",
          exact: true,
        })
        .click();
      await expect(
        reviewerPage.getByText(
          "Independent blind-review label recorded. It remains private and has no active credibility effect.",
          { exact: true },
        ),
      ).toBeVisible({ timeout: 30_000 });

      const { data: label, error: labelError } = await (service as any)
        .from("evidence_credibility_calibration_labels")
        .select("*")
        .eq("assignment_id", assignment.id)
        .single();
      if (labelError || !label) {
        throw new Error(
          `Independent calibration label is unavailable: ${labelError?.message ?? "missing row"}`,
        );
      }
      expect(label.completed_by).toBe(IDS.independentReviewer);
      expect(label.final_status).toBe("eligible");
      expect(Number(label.final_outcome)).toBe(1);

      const { data: decisionAfterLabel, error: decisionAfterLabelError } = await (
        service as any
      )
        .from("trade_evidence_decisions")
        .select("*")
        .eq("id", decision.id)
        .single();
      if (decisionAfterLabelError || !decisionAfterLabel) {
        throw new Error(
          `Evidence decision readback failed: ${decisionAfterLabelError?.message ?? "missing row"}`,
        );
      }
      expect(JSON.stringify(decisionAfterLabel)).toBe(frozenDecisionSnapshot);

      const cutoff = new Date().toISOString();
      const { data: exportResult, error: exportError } = await (
        adminAuth.client as any
      ).rpc("create_evidence_credibility_calibration_export_v1", {
        p_source_key: `qa-export:${RUN_KEY}`,
        p_source_cutoff_at: cutoff,
        p_analysis_plan_version: PLAN_VERSION,
        p_analysis_plan_hash: PLAN_HASH,
        p_pseudonymization_secret: randomBytes(32).toString("hex"),
      });
      if (exportError || !exportResult?.exportId) {
        throw new Error(
          `Immutable export creation failed: ${exportError?.message ?? "missing export ID"}`,
        );
      }
      expect(Number(exportResult.rowCount)).toBe(1);
      const exportId = String(exportResult.exportId);

      await gotoReady(adminPage, "/admin/evidence-calibration/exports");
      await expect(adminPage).toHaveTitle(/Evidence calibration exports/i);
      await expect(
        adminPage.getByRole("heading", {
          name: "Freeze a de-identified analysis export.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(adminPage.getByText(PLAN_VERSION, { exact: true })).toBeVisible();
      await expect(
        adminPage.getByRole("link", {
          name: "Download immutable JSONL",
          exact: true,
        }),
      ).toHaveAttribute(
        "href",
        `/api/admin/evidence-calibration/exports/${exportId}`,
      );
      await screenshot(adminPage, "04-admin-export-desktop");

      const download = await adminBrowser.context.request.get(
        `${BASE_URL}/api/admin/evidence-calibration/exports/${exportId}`,
      );
      expect(download.status()).toBe(200);
      const jsonl = await download.text();
      assertNoSensitiveExportContent(jsonl);
      const plan = JSON.parse(
        readFileSync(
          join(
            process.cwd(),
            "analysis/evidence-credibility-calibration-v1/plan.json",
          ),
          "utf8",
        ),
      ) as AnalysisPlan;
      const parsed = parseCalibrationExport(jsonl.trim(), plan);
      expect(parsed.manifest.exportId).toBe(exportId);
      expect(parsed.manifest.analysisPlanVersion).toBe(PLAN_VERSION);
      expect(parsed.manifest.analysisPlanHash).toBe(PLAN_HASH);
      expect(parsed.manifest.rawEvidenceIncluded).toBe(false);
      expect(parsed.manifest.rawIdentityIncluded).toBe(false);
      expect(parsed.manifest.exactPaymentDataIncluded).toBe(false);
      expect(parsed.manifest.shadowOnly).toBe(true);
      expect(parsed.rows).toHaveLength(1);

      const afterActive = await activeSnapshot(service);
      expect(afterActive).toEqual(beforeActive);
      expect(errors).toEqual([]);
      expect(serverFailures).toEqual([]);
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
      await Promise.allSettled([
        adminAuth.client.auth.signOut({ scope: "local" }),
        originalReviewerAuth.client.auth.signOut({ scope: "local" }),
        independentReviewerAuth.client.auth.signOut({ scope: "local" }),
        outsiderAuth.client.auth.signOut({ scope: "local" }),
      ]);
    }
  });
});
