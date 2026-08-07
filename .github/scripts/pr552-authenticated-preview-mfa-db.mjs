import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
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
const PROD_DB_URL = process.env.PROD_SUPABASE_DB_URL;
const OUTPUT_DIR = process.env.PR552_OUTPUT_DIR ?? "pr552-authenticated-preview-mfa-db";
const PRIVATE_STATE_PATH =
  process.env.PR552_PRIVATE_STATE_PATH ?? ".qa-private/pr552-authenticated-preview-mfa-db.json";
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
required("PROD_SUPABASE_DB_URL", PROD_DB_URL);
if (MODE === "test") required("PR552_PREVIEW_SHARE_URL", PREVIEW_SHARE_URL);

const previewUrl = new URL(PREVIEW_ORIGIN);
const supabaseUrl = new URL(SUPABASE_URL);
const supabaseRef = supabaseUrl.hostname.split(".")[0];
const dbUrl = new URL(PROD_DB_URL);

if (supabaseRef !== EXPECTED_SUPABASE_REF) {
  throw new Error(
    `Refusing unexpected Supabase project ${supabaseRef}; expected ${EXPECTED_SUPABASE_REF}.`,
  );
}
if (dbUrl.username !== `postgres.${EXPECTED_SUPABASE_REF}`) {
  throw new Error("Refusing a production database URL for the wrong database user.");
}
if (!dbUrl.hostname.endsWith(".pooler.supabase.com")) {
  throw new Error("Refusing a production database URL outside Supabase's pooler domain.");
}
if (EXPECTED_SHA !== "0f2164e893b3eee94d2f4033d013f2ebf6430cea") {
  throw new Error(`Refusing unexpected candidate SHA ${EXPECTED_SHA}.`);
}
if (EXPECTED_DEPLOYMENT_ID !== "dpl_E4kcbFVK7QpYvdygM8m9sc841DpC") {
  throw new Error(`Refusing unexpected deployment ${EXPECTED_DEPLOYMENT_ID}.`);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(PRIVATE_STATE_PATH), { recursive: true });

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function publicState(state) {
  if (!state) return null;
  return {
    schemaVersion: state.schemaVersion,
    candidateSha: state.candidateSha,
    deploymentId: state.deploymentId,
    previewOrigin: state.previewOrigin,
    supabaseRef: state.supabaseRef,
    runId: state.runId,
    userId: state.userId,
    factorName: state.factorName,
    factorId: state.factorId,
    beforeFactorIds: state.beforeFactorIds,
    userCreated: state.userCreated,
    startedAt: state.startedAt,
  };
}

function writeState(state) {
  writeJson(PRIVATE_STATE_PATH, state);
  writeJson(path.join(OUTPUT_DIR, "state.json"), publicState(state));
}

function redactDbText(value) {
  return String(value ?? "")
    .replaceAll(PROD_DB_URL, "[REDACTED_DB_URL]")
    .replaceAll(decodeURIComponent(dbUrl.password), "[REDACTED_DB_PASSWORD]");
}

function runPsql(sql, variables = {}) {
  const args = [
    PROD_DB_URL,
    "--no-psqlrc",
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
  ];
  for (const [name, value] of Object.entries(variables)) {
    args.push("--set", `${name}=${String(value ?? "")}`);
  }
  const result = spawnSync("psql", args, {
    input: sql,
    encoding: "utf8",
    env: {
      ...process.env,
      PGCONNECT_TIMEOUT: "10",
      PGAPPNAME: "moraltrade-pr552-exact-preview-mfa-qa",
    },
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`Could not execute guarded PostgreSQL operation: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = redactDbText(result.stderr).trim();
    throw new Error(`Guarded PostgreSQL operation failed${details ? `: ${details}` : "."}`);
  }
  return result.stdout.trim();
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

function normalizeUserFactors(data) {
  const values = [];
  if (Array.isArray(data)) values.push(...data);
  for (const key of ["all", "totp", "phone", "webauthn"]) {
    if (Array.isArray(data?.[key])) values.push(...data[key]);
  }
  const byId = new Map();
  for (const factor of values) {
    if (!factor?.id) continue;
    byId.set(factor.id, {
      id: factor.id,
      friendlyName: factor.friendly_name ?? factor.friendlyName ?? null,
      status: factor.status ?? null,
      factorType: factor.factor_type ?? factor.factorType ?? factor.type ?? null,
      createdAt: factor.created_at ?? factor.createdAt ?? null,
      updatedAt: factor.updated_at ?? factor.updatedAt ?? null,
    });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function listUserFactors(client) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw new Error(`Could not list the temporary user's factors: ${error.message}`);
  return normalizeUserFactors(data);
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

function totpCodeAtCounter(secret, counter) {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
  const position = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[position] & 0x7f) << 24) |
    ((digest[position + 1] & 0xff) << 16) |
    ((digest[position + 2] & 0xff) << 8) |
    (digest[position + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function freshStableTotpCode(secret, afterCounter = null) {
  while (true) {
    const now = Date.now();
    const counter = Math.floor(now / 30_000);
    const second = Math.floor(now / 1000) % 30;

    if (afterCounter !== null && counter <= afterCounter) {
      await sleep((31 - second + 3) * 1000);
      continue;
    }
    if (second < 3) {
      await sleep((3 - second) * 1000);
      continue;
    }
    if (second > 23) {
      await sleep((31 - second + 3) * 1000);
      continue;
    }
    return { counter, code: totpCodeAtCounter(secret, counter) };
  }
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
    throw new Error(
      `${label} exposed ${unrelatedVisibleChildren} unrelated legacy element(s).`,
    );
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow > 1) throw new Error(`${label} has ${overflow}px horizontal overflow.`);
  return panel;
}

function summaryValue(panel, label) {
  return panel
    .locator("dl.values-summary > div")
    .filter({ hasText: label })
    .locator("dd");
}

async function signInWithPassword(email, password) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Password sign-in failed: ${error?.message ?? "missing session"}`);
  }
  return { client, session: data.session };
}

function createTemporaryUser(state) {
  const sql = String.raw`
    begin;

    do $guard$
    begin
      if current_database() <> 'postgres' then
        raise exception 'Unexpected database name.';
      end if;
      if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
        raise exception 'pgcrypto is required.';
      end if;
      if exists (
        select 1 from auth.users
        where id = :'user_id'::uuid or lower(email) = lower(:'email')
      ) then
        raise exception 'Temporary user identity already exists.';
      end if;
    end
    $guard$;

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      phone,
      phone_change,
      phone_change_token,
      email_change_token_current,
      email_change_confirm_status,
      reauthentication_token,
      is_sso_user,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      :'user_id'::uuid,
      'authenticated',
      'authenticated',
      lower(:'email'),
      crypt(:'password', gen_salt('bf', 10)),
      now(),
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'sub', :'user_id',
        'email', lower(:'email'),
        'email_verified', true,
        'phone_verified', false,
        'display_name', 'PR552 MFA Preview QA',
        'full_name', 'PR552 MFA Preview QA',
        'qa_scope', 'pr552-exact-preview-mfa',
        'qa_run_id', :'run_id'
      ),
      now(),
      now(),
      null,
      '',
      '',
      '',
      0,
      '',
      false,
      false
    );

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      :'user_id',
      :'user_id'::uuid,
      jsonb_build_object(
        'sub', :'user_id',
        'email', lower(:'email'),
        'email_verified', true,
        'phone_verified', false,
        'display_name', 'PR552 MFA Preview QA',
        'qa_scope', 'pr552-exact-preview-mfa',
        'qa_run_id', :'run_id'
      ),
      'email',
      now(),
      now(),
      now()
    );

    do $proof$
    begin
      if (select count(*) from auth.users where id = :'user_id'::uuid and lower(email) = lower(:'email')) <> 1 then
        raise exception 'Temporary user creation proof failed.';
      end if;
      if (select count(*) from auth.identities where user_id = :'user_id'::uuid and provider = 'email') <> 1 then
        raise exception 'Temporary identity creation proof failed.';
      end if;
      if (select count(*) from public.profiles where id = :'user_id'::uuid and lower(email) = lower(:'email')) <> 1 then
        raise exception 'Temporary profile creation proof failed.';
      end if;
      if exists (select 1 from auth.mfa_factors where user_id = :'user_id'::uuid) then
        raise exception 'Fresh temporary user unexpectedly has an MFA factor.';
      end if;
    end
    $proof$;

    commit;
  `;

  runPsql(sql, {
    user_id: state.userId,
    email: state.email,
    password: state.password,
    run_id: state.runId,
  });
}

async function cleanupFactorViaUser(state) {
  if (!state.userCreated) {
    return { skipped: true, reason: "The temporary user was never created." };
  }
  const signedIn = await signInWithPassword(state.email, state.password);
  const factorsBefore = await listUserFactors(signedIn.client);
  const beforeIds = state.beforeFactorIds ?? [];
  const newFactors = factorsBefore.filter((factor) => !beforeIds.includes(factor.id));

  if (newFactors.length === 0) {
    return {
      skipped: true,
      reason: "No run-created factor remained for API cleanup.",
      beforeFactorIds: beforeIds,
      factorsBeforeCleanup: factorIds(factorsBefore),
      factorsAfterCleanup: factorIds(factorsBefore),
      exactFactorOnly: true,
    };
  }

  if (newFactors.length !== 1) {
    throw new Error(
      `User-level cleanup refused: expected one run-created factor, found ${newFactors.length}.`,
    );
  }
  const factor = newFactors[0];
  if (factor.friendlyName !== state.factorName) {
    throw new Error("User-level cleanup refused a factor with an unexpected friendly name.");
  }
  if (state.factorId && factor.id !== state.factorId) {
    throw new Error("User-level cleanup refused a factor with an unexpected ID.");
  }

  if (factor.status === "verified") {
    if (!state.totpSecret) {
      throw new Error("Verified-factor cleanup requires the run-created TOTP secret.");
    }
    const { data: challenge, error: challengeError } = await signedIn.client.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError || !challenge?.id) {
      throw new Error(
        `Cleanup challenge failed: ${challengeError?.message ?? "missing challenge ID"}`,
      );
    }
    const next = await freshStableTotpCode(state.totpSecret, state.lastTotpCounter ?? null);
    const { error: verifyError } = await signedIn.client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: next.code,
    });
    if (verifyError) throw new Error(`Cleanup AAL2 verification failed: ${verifyError.message}`);
    state.lastTotpCounter = next.counter;
    writeState(state);
  }

  const { error: unenrollError } = await signedIn.client.auth.mfa.unenroll({
    factorId: factor.id,
  });
  if (unenrollError) throw new Error(`Exact factor unenrollment failed: ${unenrollError.message}`);

  const factorsAfter = await listUserFactors(signedIn.client);
  if (!sameStringSet(factorIds(factorsAfter), beforeIds)) {
    throw new Error("User-level factor cleanup did not restore the pre-test factor-ID set.");
  }

  return {
    skipped: false,
    deletedFactorId: factor.id,
    beforeFactorIds: beforeIds,
    factorsBeforeCleanup: factorIds(factorsBefore),
    factorsAfterCleanup: factorIds(factorsAfter),
    exactFactorOnly: true,
  };
}

function cleanupTemporaryUserWithDb(state) {
  if (!state?.userId) {
    return { skipped: true, reason: "No temporary-user ID was recorded.", userAbsent: true };
  }

  const sql = String.raw`
    begin;

    do $cleanup$
    declare
      matched_users integer;
      factor_count integer;
      observed_factor_id uuid;
      observed_factor_name text;
      deleted_users integer;
    begin
      select count(*) into matched_users
      from auth.users
      where id = :'user_id'::uuid
        and lower(email) = lower(:'email')
        and raw_user_meta_data ->> 'qa_scope' = 'pr552-exact-preview-mfa'
        and raw_user_meta_data ->> 'qa_run_id' = :'run_id';

      if matched_users = 0 then
        if exists (select 1 from auth.users where id = :'user_id'::uuid) then
          raise exception 'Cleanup refused: user ID exists but does not match the exact QA identity.';
        end if;
        return;
      end if;
      if matched_users <> 1 then
        raise exception 'Cleanup refused: expected exactly one matching temporary user.';
      end if;

      select count(*) into factor_count
      from auth.mfa_factors
      where user_id = :'user_id'::uuid;

      if factor_count > 1 then
        raise exception 'Cleanup refused: more than one factor exists for the temporary user.';
      end if;

      if factor_count = 1 then
        select id, friendly_name into observed_factor_id, observed_factor_name
        from auth.mfa_factors
        where user_id = :'user_id'::uuid;

        if observed_factor_name is distinct from :'factor_name' then
          raise exception 'Cleanup refused: remaining factor friendly name does not match the run.';
        end if;
        if nullif(:'factor_id', '') is not null
           and observed_factor_id <> nullif(:'factor_id', '')::uuid then
          raise exception 'Cleanup refused: remaining factor ID does not match the run.';
        end if;

        delete from auth.mfa_factors
        where id = observed_factor_id and user_id = :'user_id'::uuid;
        if not found then
          raise exception 'Cleanup failed to delete the exact remaining factor.';
        end if;
      end if;

      delete from auth.users
      where id = :'user_id'::uuid
        and lower(email) = lower(:'email')
        and raw_user_meta_data ->> 'qa_scope' = 'pr552-exact-preview-mfa'
        and raw_user_meta_data ->> 'qa_run_id' = :'run_id';
      get diagnostics deleted_users = row_count;
      if deleted_users <> 1 then
        raise exception 'Cleanup failed to delete exactly one temporary user.';
      end if;

      if exists (select 1 from auth.users where id = :'user_id'::uuid) then
        raise exception 'Temporary user still exists after cleanup.';
      end if;
      if exists (select 1 from auth.identities where user_id = :'user_id'::uuid) then
        raise exception 'Temporary identity still exists after cleanup.';
      end if;
      if exists (select 1 from auth.mfa_factors where user_id = :'user_id'::uuid) then
        raise exception 'Temporary factor still exists after cleanup.';
      end if;
      if exists (select 1 from auth.sessions where user_id = :'user_id'::uuid) then
        raise exception 'Temporary session still exists after cleanup.';
      end if;
      if exists (select 1 from public.profiles where id = :'user_id'::uuid) then
        raise exception 'Temporary profile still exists after cleanup.';
      end if;
    end
    $cleanup$;

    commit;

    select case
      when exists (select 1 from auth.users where id = :'user_id'::uuid) then 'present'
      else 'absent'
    end;
  `;

  const output = runPsql(sql, {
    user_id: state.userId,
    email: state.email,
    run_id: state.runId,
    factor_name: state.factorName,
    factor_id: state.factorId ?? "",
  });
  if (output.split(/\s+/).filter(Boolean).at(-1) !== "absent") {
    throw new Error("Database cleanup did not prove temporary-user absence.");
  }
  return {
    skipped: false,
    userId: state.userId,
    factorId: state.factorId ?? null,
    exactFactorOnly: true,
    userAbsent: true,
    completedAt: new Date().toISOString(),
  };
}

async function cleanup(state, writeEvidence) {
  if (!state?.userId) {
    const result = { skipped: true, reason: "No temporary state exists.", userAbsent: true };
    if (writeEvidence) writeJson(path.join(OUTPUT_DIR, "cleanup.json"), result);
    return result;
  }

  let apiFactorCleanup = null;
  let apiFactorCleanupError = null;
  try {
    apiFactorCleanup = await cleanupFactorViaUser(state);
  } catch (error) {
    apiFactorCleanupError = error instanceof Error ? error.message : String(error);
  }

  const databaseCleanup = cleanupTemporaryUserWithDb(state);
  const result = {
    skipped: false,
    exactFactorOnly: true,
    apiFactorCleanup,
    apiFactorCleanupError,
    databaseCleanup,
    userAbsent: databaseCleanup.userAbsent,
    completedAt: new Date().toISOString(),
  };
  if (writeEvidence) writeJson(path.join(OUTPUT_DIR, "cleanup.json"), result);
  return result;
}

async function runCleanupOnly() {
  const state = readJson(PRIVATE_STATE_PATH);
  const result = await cleanup(state, false);
  writeJson(path.join(OUTPUT_DIR, "cleanup-only-result.json"), result);
}

async function runTest() {
  const runId = process.env.GITHUB_RUN_ID ?? String(Date.now());
  const state = {
    schemaVersion: 1,
    candidateSha: EXPECTED_SHA,
    deploymentId: EXPECTED_DEPLOYMENT_ID,
    previewOrigin: PREVIEW_ORIGIN,
    supabaseRef,
    runId,
    factorName: `PR552 exact Preview ${runId}`,
    userId: randomUUID(),
    email: `pr552-mfa-${runId}-${randomBytes(4).toString("hex")}@qa.moraltrade.invalid`,
    password: `${randomBytes(24).toString("base64url")}!aA7`,
    beforeFactorIds: [],
    factorId: null,
    totpSecret: null,
    lastTotpCounter: null,
    userCreated: false,
    startedAt: new Date().toISOString(),
  };
  writeState(state);

  const evidence = {
    schemaVersion: 1,
    candidateSha: EXPECTED_SHA,
    deploymentId: EXPECTED_DEPLOYMENT_ID,
    previewOrigin: PREVIEW_ORIGIN,
    supabaseRef,
    startedAt: state.startedAt,
    desktop: null,
    mobile: null,
    factorLifecycle: null,
    cleanup: null,
  };

  let browser;
  let testError = null;
  let cleanupError = null;

  try {
    createTemporaryUser(state);
    state.userCreated = true;
    writeState(state);

    const initialSignIn = await signInWithPassword(state.email, state.password);
    const initialAal = await initialSignIn.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (initialAal.error || initialAal.data.currentLevel !== "aal1") {
      throw new Error(
        `Initial session was not AAL1: ${initialAal.error?.message ?? initialAal.data.currentLevel}`,
      );
    }
    const baselineFactors = await listUserFactors(initialSignIn.client);
    state.beforeFactorIds = factorIds(baselineFactors);
    if (state.beforeFactorIds.length !== 0) {
      throw new Error("Fresh temporary user unexpectedly had pre-existing MFA factors.");
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
    const desktopPanel = await assertDashboardSurface(desktopPage, "desktop");
    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("0");
    await expect(summaryValue(desktopPanel, "Session level")).toHaveText("aal1");

    const createForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Create MFA setup" }),
    });
    await createForm.locator('input[name="friendly_name"]').fill(state.factorName);
    await createForm.getByRole("button", { name: "Create MFA setup" }).click();

    const pendingForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Verify MFA setup" }),
    });
    await expect(pendingForm).toBeVisible({ timeout: 30_000 });
    const secretLocator = pendingForm.locator("code");
    await expect(secretLocator).toBeVisible();
    state.totpSecret = (await secretLocator.textContent())?.trim() ?? null;
    if (!state.totpSecret || state.totpSecret.length < 16) {
      throw new Error("Pending setup did not expose a usable TOTP secret.");
    }
    state.factorId = await pendingForm.locator('input[name="factor_id"]').inputValue();
    if (!state.factorId) throw new Error("Pending setup did not expose its factor ID.");
    writeState(state);

    const afterEnrollmentSignIn = await signInWithPassword(state.email, state.password);
    const afterEnrollment = await listUserFactors(afterEnrollmentSignIn.client);
    const enrollmentDiff = factorIds(afterEnrollment).filter(
      (id) => !state.beforeFactorIds.includes(id),
    );
    if (enrollmentDiff.length !== 1 || enrollmentDiff[0] !== state.factorId) {
      throw new Error(
        `Enrollment created an unexpected factor set: ${JSON.stringify(enrollmentDiff)}.`,
      );
    }

    const desktopCode = await freshStableTotpCode(state.totpSecret);
    state.lastTotpCounter = desktopCode.counter;
    writeState(state);
    await pendingForm.locator('input[name="code"]').fill(desktopCode.code);
    await pendingForm.getByRole("button", { name: "Verify MFA setup" }).click();
    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("1", {
      timeout: 30_000,
    });
    await expect(summaryValue(desktopPanel, "Session level")).toHaveText("aal2", {
      timeout: 30_000,
    });
    await expect(
      desktopPanel.getByText(`${state.factorName} · verified`, { exact: true }),
    ).toBeVisible();
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

    const afterVerificationSignIn = await signInWithPassword(state.email, state.password);
    const afterVerification = await listUserFactors(afterVerificationSignIn.client);
    const verifiedFactor = afterVerification.find((factor) => factor.id === state.factorId);
    if (!verifiedFactor || verifiedFactor.status !== "verified") {
      throw new Error("The newly created factor was not verified after the desktop flow.");
    }

    const mobileSignIn = await signInWithPassword(state.email, state.password);
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
    await expect(verifySessionForm.locator('select[name="factor_id"]')).toHaveValue(
      state.factorId,
    );
    const mobileCode = await freshStableTotpCode(
      state.totpSecret,
      state.lastTotpCounter,
    );
    state.lastTotpCounter = mobileCode.counter;
    writeState(state);
    await verifySessionForm.locator('input[name="code"]').fill(mobileCode.code);
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
    if (mobileOverflow > 1) {
      throw new Error(`mobile has ${mobileOverflow}px horizontal overflow.`);
    }
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
      createdFactorId: state.factorId,
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
        userAbsent: false,
        error: error instanceof Error ? error.message : String(error),
      };
      writeJson(path.join(OUTPUT_DIR, "cleanup.json"), evidence.cleanup);
    }
    evidence.completedAt = new Date().toISOString();
    evidence.testPassed = !testError;
    evidence.cleanupPassed = !cleanupError && evidence.cleanup?.userAbsent === true;
    evidence.testError = testError instanceof Error ? testError.message : testError ? String(testError) : null;
    evidence.cleanupError =
      cleanupError instanceof Error ? cleanupError.message : cleanupError ? String(cleanupError) : null;
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
