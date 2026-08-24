import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const REQUIRED_ENV = [
  "PR808_BASE_URL",
  "PR808_CANDIDATE_SHA",
  "PR808_OUTPUT_DIR",
  "PR808_QA_EMAIL",
  "PR808_QA_PASSWORD",
  "PR808_QA_USER_ID",
  "PR808_RUN_ID",
  "QA_SUPABASE_DB_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPECTED_QA_REF",
  "EXPECTED_QA_POOLER_HOST",
];

for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment value: ${name}`);
  }
}

const BASE_URL = process.env.PR808_BASE_URL;
const CANDIDATE_SHA = process.env.PR808_CANDIDATE_SHA;
const OUTPUT_DIR = process.env.PR808_OUTPUT_DIR;
const QA_EMAIL = process.env.PR808_QA_EMAIL;
const QA_PASSWORD = process.env.PR808_QA_PASSWORD;
const QA_USER_ID = process.env.PR808_QA_USER_ID;
const RUN_ID = process.env.PR808_RUN_ID;
const DB_URL = process.env.QA_SUPABASE_DB_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const EXPECTED_QA_REF = process.env.EXPECTED_QA_REF;
const EXPECTED_QA_POOLER_HOST = process.env.EXPECTED_QA_POOLER_HOST;
const OFFER_ID = "d7000000-0000-4000-8000-000000000007";
const FACTOR_NAME = `PR808 refund rendered review ${RUN_ID}`;

const baseUrl = new URL(BASE_URL);
const dbUrl = new URL(DB_URL);
const supabaseUrl = new URL(SUPABASE_URL);
const sslMode = dbUrl.searchParams.get("sslmode");
const tlsRequired =
  sslMode === "require" || (!sslMode && process.env.PGSSLMODE === "require");

if (
  dbUrl.protocol.replace(":", "") !== "postgres" &&
  dbUrl.protocol.replace(":", "") !== "postgresql"
) {
  throw new Error("Refusing a non-PostgreSQL QA target.");
}
if (
  dbUrl.username !== `postgres.${EXPECTED_QA_REF}` ||
  dbUrl.hostname !== EXPECTED_QA_POOLER_HOST ||
  dbUrl.port !== "5432" ||
  dbUrl.pathname !== "/postgres" ||
  !dbUrl.password ||
  !tlsRequired
) {
  throw new Error(
    "Refusing a database URL outside the exact TLS-only MoralTrade QA target.",
  );
}
if (supabaseUrl.hostname !== `${EXPECTED_QA_REF}.supabase.co`) {
  throw new Error("Refusing an unexpected public Supabase project.");
}
if (baseUrl.hostname !== "127.0.0.1" || baseUrl.protocol !== "http:") {
  throw new Error("Rendered review must run only against the local exact-head server.");
}
if (!/^[0-9a-f]{40}$/.test(CANDIDATE_SHA)) {
  throw new Error("Candidate SHA is malformed.");
}
if (!/^[0-9a-f-]{36}$/.test(QA_USER_ID)) {
  throw new Error("Temporary QA user ID is malformed.");
}
if (!QA_EMAIL.endsWith("@qa.moraltrade.invalid")) {
  throw new Error("Temporary QA email is outside the reserved invalid domain.");
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeJson(name, value) {
  fs.writeFileSync(
    path.join(OUTPUT_DIR, name),
    `${JSON.stringify(value, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function writeText(name, value) {
  fs.writeFileSync(path.join(OUTPUT_DIR, name), `${value}\n`, { mode: 0o600 });
}

function redactDbText(value) {
  return String(value ?? "")
    .replaceAll(DB_URL, "[REDACTED_QA_DB_URL]")
    .replaceAll(decodeURIComponent(dbUrl.password), "[REDACTED_QA_DB_PASSWORD]")
    .replaceAll(QA_PASSWORD, "[REDACTED_QA_PASSWORD]");
}

function runPsql(sql, variables = {}) {
  const args = [
    DB_URL,
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
      PGAPPNAME: "moraltrade-pr808-refund-rendered-review",
    },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(
      `Could not execute guarded PostgreSQL operation: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    const details = redactDbText(result.stderr).trim();
    throw new Error(
      `Guarded PostgreSQL operation failed${details ? `: ${details}` : "."}`,
    );
  }
  return result.stdout.trim();
}

function createTemporaryUser() {
  const sql = String.raw`
    begin;

    do $guard$
    begin
      if current_database() <> 'postgres' then
        raise exception 'Unexpected database name.';
      end if;
      if current_user <> 'postgres' then
        raise exception 'Unexpected database role.';
      end if;
      if exists (
        select 1 from auth.users
        where id = :'user_id'::uuid or lower(email) = lower(:'email')
      ) then
        raise exception 'Temporary PR808 identity already exists.';
      end if;
      if exists (
        select 1 from public.profiles
        where id = :'user_id'::uuid or lower(email) = lower(:'email')
      ) then
        raise exception 'Temporary PR808 profile already exists.';
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
      extensions.crypt(:'password', extensions.gen_salt('bf')),
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
        'display_name', 'PR808 Refund Review Admin',
        'full_name', 'PR808 Refund Review Admin',
        'qa_scope', 'pr808-refund-rendered-review',
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
        'display_name', 'PR808 Refund Review Admin',
        'qa_scope', 'pr808-refund-rendered-review',
        'qa_run_id', :'run_id'
      ),
      'email',
      now(),
      now(),
      now()
    );

    insert into public.profiles (id, email, display_name, bio, affiliation)
    values (
      :'user_id'::uuid,
      lower(:'email'),
      'PR808 Refund Review Admin',
      '',
      'Isolated QA'
    )
    on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        bio = excluded.bio,
        affiliation = excluded.affiliation;

    do $proof$
    begin
      if (
        select count(*) from auth.users
        where id = :'user_id'::uuid
          and lower(email) = lower(:'email')
          and raw_user_meta_data ->> 'qa_scope' = 'pr808-refund-rendered-review'
          and raw_user_meta_data ->> 'qa_run_id' = :'run_id'
      ) <> 1 then
        raise exception 'Temporary PR808 user creation proof failed.';
      end if;
      if (
        select count(*) from auth.identities
        where user_id = :'user_id'::uuid and provider = 'email'
      ) <> 1 then
        raise exception 'Temporary PR808 identity creation proof failed.';
      end if;
      if (
        select count(*) from public.profiles
        where id = :'user_id'::uuid and lower(email) = lower(:'email')
      ) <> 1 then
        raise exception 'Temporary PR808 profile creation proof failed.';
      end if;
      if exists (select 1 from auth.mfa_factors where user_id = :'user_id'::uuid) then
        raise exception 'Fresh temporary PR808 user unexpectedly has an MFA factor.';
      end if;
    end
    $proof$;

    commit;
  `;
  runPsql(sql, {
    user_id: QA_USER_ID,
    email: QA_EMAIL,
    password: QA_PASSWORD,
    run_id: RUN_ID,
  });
}

function cleanupTemporaryUser(factorId = "") {
  const sql = String.raw`
    begin;

    do $cleanup$
    declare
      matched_users integer;
      factor_count integer;
      observed_factor_id uuid;
      observed_factor_name text;
    begin
      select count(*) into matched_users
      from auth.users
      where id = :'user_id'::uuid
        and lower(email) = lower(:'email')
        and raw_user_meta_data ->> 'qa_scope' = 'pr808-refund-rendered-review'
        and raw_user_meta_data ->> 'qa_run_id' = :'run_id';

      if matched_users = 0 then
        if exists (select 1 from auth.users where id = :'user_id'::uuid) then
          raise exception 'Cleanup refused: user ID exists with different metadata.';
        end if;
        return;
      end if;
      if matched_users <> 1 then
        raise exception 'Cleanup refused: expected exactly one PR808 user.';
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
          raise exception 'Cleanup refused: remaining factor name is not run-owned.';
        end if;
        if nullif(:'factor_id', '') is not null
           and observed_factor_id <> nullif(:'factor_id', '')::uuid then
          raise exception 'Cleanup refused: remaining factor ID is not run-owned.';
        end if;

        delete from auth.mfa_factors
        where id = observed_factor_id and user_id = :'user_id'::uuid;
      end if;

      delete from moral_trade_private.person_account_aliases
      where alias_profile_id = :'user_id'::uuid
         or canonical_profile_id = :'user_id'::uuid;
      delete from moral_trade_private.person_accounts
      where profile_id = :'user_id'::uuid;
      delete from public.profiles
      where id = :'user_id'::uuid and lower(email) = lower(:'email');
      delete from auth.users
      where id = :'user_id'::uuid
        and lower(email) = lower(:'email')
        and raw_user_meta_data ->> 'qa_scope' = 'pr808-refund-rendered-review'
        and raw_user_meta_data ->> 'qa_run_id' = :'run_id';

      if exists (select 1 from auth.users where id = :'user_id'::uuid) then
        raise exception 'Temporary PR808 user remains after cleanup.';
      end if;
      if exists (select 1 from auth.identities where user_id = :'user_id'::uuid) then
        raise exception 'Temporary PR808 identity remains after cleanup.';
      end if;
      if exists (select 1 from auth.mfa_factors where user_id = :'user_id'::uuid) then
        raise exception 'Temporary PR808 factor remains after cleanup.';
      end if;
      if exists (select 1 from auth.sessions where user_id = :'user_id'::uuid) then
        raise exception 'Temporary PR808 session remains after cleanup.';
      end if;
      if exists (select 1 from public.profiles where id = :'user_id'::uuid) then
        raise exception 'Temporary PR808 profile remains after cleanup.';
      end if;
      if exists (
        select 1 from moral_trade_private.person_accounts
        where profile_id = :'user_id'::uuid
      ) then
        raise exception 'Temporary PR808 person account remains after cleanup.';
      end if;
      if exists (
        select 1 from moral_trade_private.person_account_aliases
        where alias_profile_id = :'user_id'::uuid
           or canonical_profile_id = :'user_id'::uuid
      ) then
        raise exception 'Temporary PR808 alias remains after cleanup.';
      end if;
    end
    $cleanup$;

    commit;

    select jsonb_build_object(
      'userAbsent', not exists (
        select 1 from auth.users where id = :'user_id'::uuid
      ),
      'identityAbsent', not exists (
        select 1 from auth.identities where user_id = :'user_id'::uuid
      ),
      'factorAbsent', not exists (
        select 1 from auth.mfa_factors where user_id = :'user_id'::uuid
      ),
      'sessionAbsent', not exists (
        select 1 from auth.sessions where user_id = :'user_id'::uuid
      ),
      'profileAbsent', not exists (
        select 1 from public.profiles where id = :'user_id'::uuid
      )
    );
  `;
  const output = runPsql(sql, {
    user_id: QA_USER_ID,
    email: QA_EMAIL,
    run_id: RUN_ID,
    factor_name: FACTOR_NAME,
    factor_id: factorId,
  });
  const rows = output
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const proof = JSON.parse(rows.at(-1));
  if (!Object.values(proof).every((value) => value === true)) {
    throw new Error(`Temporary QA cleanup proof failed: ${JSON.stringify(proof)}`);
  }
  return proof;
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function freshStableTotpCode(secret) {
  while (true) {
    const now = Date.now();
    const counter = Math.floor(now / 30_000);
    const second = Math.floor(now / 1000) % 30;
    if (second < 3) {
      await sleep((3 - second) * 1000);
      continue;
    }
    if (second > 23) {
      await sleep((33 - second) * 1000);
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
  if (error) {
    throw new Error(`Could not serialize the AAL2 session: ${error.message}`);
  }
  return captured.map(({ name, value }) => ({
    name,
    value,
    url: BASE_URL,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  }));
}

function startDiagnostics(page, label) {
  const record = {
    label,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    everyOrgRequests: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/(^|\.)every\.org$/i.test(url.hostname)) {
      record.everyOrgRequests.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url(),
      });
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const errorText = request.failure()?.errorText ?? "unknown";
    const isExpectedPrefetchAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") ||
        request.headers()["next-router-prefetch"] === "1");
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
    if (response.status() < 400 || url.pathname === "/favicon.ico") return;
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
    ...record.everyOrgRequests.map(
      (value) => `unexpected Every.org request: ${value.method} ${value.url}`,
    ),
  ];
  if (failures.length) {
    throw new Error(`${record.label} diagnostics failed:\n${failures.join("\n")}`);
  }
}

async function inspectDom(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const accessibleName = (element) => {
      const aria = element.getAttribute("aria-label")?.trim();
      if (aria) return aria;
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        if (text) return text;
      }
      if (element instanceof HTMLInputElement && element.type === "hidden") {
        return "hidden";
      }
      if ("labels" in element && element.labels?.length) {
        const text = [...element.labels]
          .map((label) => label.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        if (text) return text;
      }
      const title = element.getAttribute("title")?.trim();
      if (title) return title;
      const placeholder = element.getAttribute("placeholder")?.trim();
      if (placeholder) return placeholder;
      return element.textContent?.trim() ?? "";
    };
    const unnamedControls = [
      ...document.querySelectorAll("a, button, input, select, textarea"),
    ]
      .filter(visible)
      .filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 240));
    const viewportWidth = window.innerWidth;
    const overflowingElements = [...document.querySelectorAll("body *")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: String(element.className ?? "").slice(0, 120),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter(
        (entry) =>
          entry.width > 1 &&
          (entry.left < -1 || entry.right > viewportWidth + 1),
      )
      .slice(0, 20);
    const labelledRegions = [
      ...document.querySelectorAll(
        "main[aria-labelledby], section[aria-labelledby]",
      ),
    ].map((element) => {
      const id = element.getAttribute("aria-labelledby");
      return {
        id,
        targetExists: Boolean(id && document.getElementById(id)),
      };
    });
    return {
      title: document.title,
      h1Count: document.querySelectorAll("h1").length,
      headingCount: document.querySelectorAll("h1, h2, h3, h4, h5, h6")
        .length,
      labelledRegions,
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
      ),
      unnamedControls,
      overflowingElements,
      activeForms: document.querySelectorAll("form").length,
      bodyTextLength: document.body.innerText.length,
    };
  });
}

async function captureSurface({
  browser,
  cookies,
  label,
  route,
  viewport,
  assertions,
}) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
    ignoreHTTPSErrors: false,
  });
  context.setDefaultTimeout(25_000);
  context.setDefaultNavigationTimeout(60_000);
  await context.addCookies([
    ...cookies,
    {
      name: "mt_walkthrough_seen",
      value: "1",
      url: BASE_URL,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  const diagnostics = startDiagnostics(page, label);
  const response = await page.goto(route, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!response || response.status() !== 200) {
    throw new Error(`${label} returned ${response?.status() ?? "no response"}.`);
  }
  for (const assertion of assertions) {
    if (assertion.type === "visibleText") {
      await expect(
        page.getByText(assertion.value, { exact: assertion.exact ?? false }),
      ).toBeVisible();
    } else if (assertion.type === "absentText") {
      await expect(
        page.getByText(assertion.value, { exact: assertion.exact ?? false }),
      ).toHaveCount(0);
    } else if (assertion.type === "locatorVisible") {
      await expect(page.locator(assertion.value)).toBeVisible();
    }
  }

  const dom = await inspectDom(page);
  if (dom.h1Count > 1) {
    throw new Error(`${label} has ${dom.h1Count} h1 elements; expected at most one.`);
  }
  if (dom.headingCount < 1) {
    throw new Error(`${label} has no semantic heading.`);
  }
  if (dom.labelledRegions.some((region) => !region.targetExists)) {
    throw new Error(
      `${label} contains an aria-labelledby region with a missing target.`,
    );
  }
  if (dom.horizontalOverflow > 1) {
    throw new Error(`${label} has ${dom.horizontalOverflow}px horizontal overflow.`);
  }
  if (dom.unnamedControls.length) {
    throw new Error(
      `${label} has unnamed controls: ${JSON.stringify(dom.unnamedControls)}`,
    );
  }
  if (dom.overflowingElements.length) {
    throw new Error(
      `${label} has viewport-overflowing elements: ${JSON.stringify(
        dom.overflowingElements,
      )}`,
    );
  }
  assertDiagnostics(diagnostics);

  const fileName = `${label}.png`;
  await page.screenshot({
    path: path.join(OUTPUT_DIR, fileName),
    fullPage: false,
  });
  writeText(`${label}.txt`, await page.locator("body").innerText());
  const result = {
    label,
    route,
    finalUrl: page.url(),
    viewport,
    screenshot: fileName,
    dom,
    diagnostics,
  };
  await context.close();
  return result;
}

async function run() {
  const state = {
    schemaVersion: 1,
    candidateSha: CANDIDATE_SHA,
    runId: RUN_ID,
    qaRef: EXPECTED_QA_REF,
    userId: QA_USER_ID,
    email: QA_EMAIL,
    factorName: FACTOR_NAME,
    factorId: null,
    createdAt: new Date().toISOString(),
  };
  writeJson("run-identity.json", state);

  let client = null;
  let factorId = "";
  let browser = null;
  let testError = null;
  let cleanupError = null;
  const evidence = {
    schemaVersion: 1,
    candidateSha: CANDIDATE_SHA,
    runId: RUN_ID,
    qaRef: EXPECTED_QA_REF,
    aalBefore: null,
    aalAfter: null,
    factor: null,
    surfaces: [],
    cleanup: null,
  };

  try {
    createTemporaryUser();

    client = authClient();
    const signIn = await client.auth.signInWithPassword({
      email: QA_EMAIL,
      password: QA_PASSWORD,
    });
    if (signIn.error || !signIn.data.session) {
      throw new Error(
        `Temporary QA sign-in failed: ${
          signIn.error?.message ?? "missing session"
        }`,
      );
    }
    const initialAal = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (initialAal.error || initialAal.data.currentLevel !== "aal1") {
      throw new Error(
        `Temporary QA session did not begin at AAL1: ${
          initialAal.error?.message ?? initialAal.data.currentLevel
        }`,
      );
    }
    evidence.aalBefore = initialAal.data;

    const baselineFactors = await client.auth.mfa.listFactors();
    if (baselineFactors.error) {
      throw new Error(
        `Could not list baseline factors: ${baselineFactors.error.message}`,
      );
    }
    const baseline = baselineFactors.data?.all ?? [];
    if (baseline.length !== 0) {
      throw new Error(`Fresh temporary QA user had ${baseline.length} factor(s).`);
    }

    const enrollment = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: FACTOR_NAME,
    });
    if (
      enrollment.error ||
      !enrollment.data?.id ||
      !enrollment.data?.totp?.secret
    ) {
      throw new Error(
        `MFA enrollment failed: ${
          enrollment.error?.message ?? "missing factor or secret"
        }`,
      );
    }
    factorId = enrollment.data.id;
    state.factorId = factorId;
    writeJson("run-identity.json", state);

    const challenge = await client.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data?.id) {
      throw new Error(
        `MFA challenge failed: ${
          challenge.error?.message ?? "missing challenge ID"
        }`,
      );
    }
    const code = await freshStableTotpCode(enrollment.data.totp.secret);
    const verification = await client.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.code,
    });
    if (verification.error) {
      throw new Error(`MFA verification failed: ${verification.error.message}`);
    }

    const finalAal = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (finalAal.error || finalAal.data.currentLevel !== "aal2") {
      throw new Error(
        `Temporary QA session did not reach AAL2: ${
          finalAal.error?.message ?? finalAal.data.currentLevel
        }`,
      );
    }
    evidence.aalAfter = finalAal.data;

    const factors = await client.auth.mfa.listFactors();
    if (factors.error) {
      throw new Error(`Could not list verified factors: ${factors.error.message}`);
    }
    const allFactors = factors.data?.all ?? [];
    const verified = allFactors.filter(
      (factor) => factor.id === factorId && factor.status === "verified",
    );
    if (allFactors.length !== 1 || verified.length !== 1) {
      throw new Error(
        `Expected exactly one verified run-owned factor; observed ${JSON.stringify(
          allFactors.map((factor) => ({
            id: factor.id,
            status: factor.status,
            friendlyName: factor.friendly_name,
          })),
        )}`,
      );
    }
    evidence.factor = {
      id: factorId,
      status: verified[0].status,
      friendlyName: verified[0].friendly_name,
      exactSingleVerifiedFactor: true,
    };

    const currentSession = await client.auth.getSession();
    if (currentSession.error || !currentSession.data.session) {
      throw new Error(
        `Could not read the AAL2 session: ${
          currentSession.error?.message ?? "missing session"
        }`,
      );
    }
    const cookies = await sessionCookies(currentSession.data.session);

    browser = await chromium.launch({ headless: true });
    const targets = [
      {
        key: "admin",
        route: "/admin/donation-upgrades",
        assertions: [
          {
            type: "visibleText",
            value:
              "Inspect confirmations, provider refunds, mismatches, and current credit.",
            exact: true,
          },
          {
            type: "visibleText",
            value:
              "Record an authoritative full Every.org refund without rewriting history.",
            exact: true,
          },
          { type: "visibleText", value: "Record provider refund", exact: true },
          {
            type: "absentText",
            value: "Operator access blocked.",
            exact: false,
          },
          {
            type: "locatorVisible",
            value: 'input[name="provider_refunded_at"]',
          },
          {
            type: "locatorVisible",
            value: 'select[name="evidence_source"]',
          },
          {
            type: "locatorVisible",
            value: 'input[name="evidence_reference"]',
          },
          {
            type: "locatorVisible",
            value: 'input[name="authority_confirmation"]',
          },
        ],
      },
      {
        key: "participant",
        route: `/donation-upgrades/${OFFER_ID}/provider-status`,
        assertions: [
          {
            type: "visibleText",
            value: "A later Every.org refund changed current credited impact.",
            exact: true,
          },
          { type: "visibleText", value: "Provider refund recorded", exact: true },
          {
            type: "visibleText",
            value: "Historical confirmed gross",
            exact: true,
          },
          {
            type: "visibleText",
            value: "Current unreversed net credit",
            exact: true,
          },
          {
            type: "visibleText",
            value:
              "Moral Trade does not receive, hold, process, issue, or refund the payment.",
            exact: false,
          },
        ],
      },
    ];
    const viewports = [
      { key: "desktop", width: 1440, height: 1000 },
      { key: "mobile", width: 390, height: 844 },
    ];
    for (const target of targets) {
      for (const viewport of viewports) {
        evidence.surfaces.push(
          await captureSurface({
            browser,
            cookies,
            label: `${target.key}-${viewport.key}-${viewport.width}x${viewport.height}`,
            route: target.route,
            viewport: { width: viewport.width, height: viewport.height },
            assertions: target.assertions,
          }),
        );
      }
    }

    writeJson("rendered-review.json", evidence);
  } catch (error) {
    testError = error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (client && factorId) {
      try {
        const unenroll = await client.auth.mfa.unenroll({ factorId });
        if (unenroll.error) {
          throw new Error(unenroll.error.message);
        }
      } catch (error) {
        writeJson("factor-api-cleanup-warning.json", {
          warning: error instanceof Error ? error.message : String(error),
          databaseCleanupWillVerifyExactOwnership: true,
        });
      }
      await client.auth.signOut({ scope: "local" }).catch(() => {});
    }
    try {
      evidence.cleanup = cleanupTemporaryUser(factorId);
      cleanupError = null;
    } catch (error) {
      cleanupError = error;
      evidence.cleanup = {
        userAbsent: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    evidence.completedAt = new Date().toISOString();
    evidence.testPassed = !testError;
    evidence.cleanupPassed =
      !cleanupError &&
      Object.values(evidence.cleanup ?? {}).every((value) => value === true);
    evidence.testError =
      testError instanceof Error
        ? testError.message
        : testError
          ? String(testError)
          : null;
    evidence.cleanupError =
      cleanupError instanceof Error
        ? cleanupError.message
        : cleanupError
          ? String(cleanupError)
          : null;
    writeJson("rendered-review-final.json", evidence);
  }

  if (cleanupError) {
    throw new Error(
      `Rendered review cleanup failed${
        testError instanceof Error ? ` after test failure (${testError.message})` : ""
      }: ${cleanupError.message}`,
    );
  }
  if (testError) throw testError;
}

await run();
