#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  EVIDENCE_PAYMENT_QA_REF,
  buildEvidencePaymentQaNamespace,
} from "./evidence-payment-qa-namespace.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const DATABASE_URL = process.env.QA_SUPABASE_DB_URL;
const REPOSITORY = process.env.GITHUB_REPOSITORY;
const WORKFLOW_REF = process.env.GITHUB_WORKFLOW_REF;
const RUN_ID = process.env.GITHUB_RUN_ID;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT;
const EXPECTED_QA_REF = process.env.EXPECTED_QA_REF;

const REQUIRED = {
  DATABASE_URL,
  EXPECTED_QA_REF,
  REPOSITORY,
  RUN_ATTEMPT,
  RUN_ID,
  SUPABASE_KEY,
  SUPABASE_URL,
  WORKFLOW_REF,
};
for (const [key, value] of Object.entries(REQUIRED)) {
  if (!value) {
    throw new Error(`Missing required two-writer environment value ${key}.`);
  }
}
if (EXPECTED_QA_REF !== EVIDENCE_PAYMENT_QA_REF) {
  throw new Error("Refusing two-writer QA outside the exact isolated-QA project.");
}
if (SUPABASE_URL !== `https://${EVIDENCE_PAYMENT_QA_REF}.supabase.co`) {
  throw new Error("Refusing two-writer Auth QA outside the exact isolated-QA origin.");
}

const ROOT = process.cwd();
const PREFLIGHT_SQL = resolve(
  ROOT,
  "supabase/tests/evidence_weighted_payment_browser_preflight.sql",
);
const FIXTURE_SQL = resolve(
  ROOT,
  "supabase/tests/evidence_weighted_payment_browser_fixture.sql",
);
const CLEANUP_SQL = resolve(
  ROOT,
  "supabase/tests/evidence_weighted_payment_browser_cleanup.sql",
);
const OUTPUT_PATH = resolve(ROOT, "evidence-payment-two-writer.json");
const ROLE_KEYS = [
  "payer",
  "payee",
  "reviewer",
  "appeal-reviewer",
  "outsider",
  "administrator",
];

// Actual fixed identities selected by the stale cleanup at
// e0ed0d206687dae17882260313152846b2d2bd22.
const STALE_USER_IDS = Array.from(
  { length: 6 },
  (_, index) =>
    `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const STALE_AGREEMENT_IDS = [
  "72000000-0000-4000-8000-000000000001",
  "72000000-0000-4000-8000-000000000002",
];
const STALE_EMAILS = [
  "evidence-payment-payer@qa.invalid",
  "evidence-payment-payee@qa.invalid",
  "evidence-payment-reviewer@qa.invalid",
  "evidence-payment-appeal-reviewer@qa.invalid",
  "evidence-payment-outsider@qa.invalid",
  "evidence-payment-admin@qa.invalid",
];

function manifestFor(lane) {
  return buildEvidencePaymentQaNamespace({
    repository: REPOSITORY,
    workflowRef: `${WORKFLOW_REF}/two-writer-${lane}`,
    runId: RUN_ID,
    runAttempt: RUN_ATTEMPT,
    qaRef: EXPECTED_QA_REF,
  });
}

const namespaceA = manifestFor("a");
const namespaceB = manifestFor("b");
const passwordA = randomBytes(48).toString("base64url");
const passwordB = randomBytes(48).toString("base64url");
const summaries = [];

function safeError(value) {
  let text = value instanceof Error ? value.message : String(value);
  for (const secret of [DATABASE_URL, passwordA, passwordB]) {
    if (secret) text = text.replaceAll(secret, "[REDACTED]");
  }
  return text
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[REDACTED_JWT]",
    )
    .slice(0, 4000);
}

function emit(stage, payload) {
  const record = { stage, ...payload };
  summaries.push(record);
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

function psqlEnvironment(manifest, password = "") {
  return {
    ...process.env,
    ...manifest.environment,
    ...(password ? { EVIDENCE_PAYMENT_QA_PASSWORD: password } : {}),
  };
}

function parseJsonLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"))
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function runPsqlFile(stage, file, manifest, password = "") {
  const result = spawnSync(
    "psql",
    [
      DATABASE_URL,
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      file,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: psqlEnvironment(manifest, password),
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `${stage} failed: ${safeError(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)}`,
    );
  }
  const records = parseJsonLines(result.stdout ?? "");
  if (records.length === 0) {
    throw new Error(`${stage} emitted no machine-readable result.`);
  }
  return records.at(-1);
}

function runInlineSql(stage, sql) {
  const result = spawnSync(
    "psql",
    [
      DATABASE_URL,
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
      input: sql,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `${stage} failed: ${safeError(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)}`,
    );
  }
  const records = parseJsonLines(result.stdout ?? "");
  if (records.length !== 1) {
    throw new Error(
      `${stage} expected one machine-readable row and received ${records.length}.`,
    );
  }
  return records[0];
}

function authClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function authenticateNamespace(manifest, password) {
  const actors = {};
  for (const role of ROLE_KEYS) {
    const client = authClient();
    const expected = manifest.roles[role];
    const { data, error } = await client.auth.signInWithPassword({
      email: expected.email,
      password,
    });
    if (error || !data.session || !data.user) {
      throw new Error(
        `Synthetic two-writer Auth sign-in failed for ${role}: ${error?.message ?? "no session"}`,
      );
    }
    assert.equal(data.user.id, expected.id);
    assert.equal(
      data.user.user_metadata?.qa_namespace,
      manifest.namespace.handle,
    );
    actors[role] = { client, session: data.session };
  }
  return actors;
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

async function elevate(client, label) {
  const { data: enrollment, error: enrollmentError } =
    await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `two-writer-${label}`,
    });
  if (enrollmentError || !enrollment?.totp?.secret) {
    throw new Error(
      `Two-writer TOTP enrollment failed for ${label}: ${enrollmentError?.message ?? "missing secret"}`,
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
      if (!sessionError && sessionData.session) return sessionData.session;
    }
    lastError = error?.message ?? "missing AAL2 session";
  }
  throw new Error(
    `Two-writer TOTP verification failed for ${label}: ${lastError}`,
  );
}

async function exactIds(client, table, ids) {
  const { data, error } = await client.from(table).select("id").in("id", ids);
  if (error) throw new Error(`Read from ${table} failed: ${error.message}`);
  return (data ?? []).map((row) => row.id).sort();
}

async function proveAuthorization(actorsA, actorsB) {
  const aAgreement = namespaceA.objects.agreement;
  const bAgreement = namespaceB.objects.agreement;
  const aBundle = namespaceA.objects["evidence-bundle"];
  const bBundle = namespaceB.objects["evidence-bundle"];
  const aPayout = namespaceA.objects.payout;
  const bPayout = namespaceB.objects.payout;

  assert.deepEqual(
    await exactIds(
      actorsA.payer.client,
      "agreements",
      [aAgreement, bAgreement],
    ),
    [aAgreement],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.payer.client,
      "agreements",
      [aAgreement, bAgreement],
    ),
    [bAgreement],
  );

  // Participants intentionally cannot query raw private evidence bundles
  // directly. The product exposes their authorized evidence through the
  // agreement workflow rather than table-wide PostgREST reads.
  assert.deepEqual(
    await exactIds(
      actorsA.payee.client,
      "trade_evidence_bundles",
      [aBundle, bBundle],
    ),
    [],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.payee.client,
      "trade_evidence_bundles",
      [aBundle, bBundle],
    ),
    [],
  );

  assert.deepEqual(
    await exactIds(
      actorsA.payer.client,
      "trade_milestone_payouts",
      [aPayout, bPayout],
    ),
    [aPayout],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.payer.client,
      "trade_milestone_payouts",
      [aPayout, bPayout],
    ),
    [bPayout],
  );
  assert.deepEqual(
    await exactIds(
      actorsA.outsider.client,
      "trade_evidence_bundles",
      [aBundle, bBundle],
    ),
    [],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.outsider.client,
      "trade_milestone_payouts",
      [aPayout, bPayout],
    ),
    [],
  );

  // Existing product RLS deliberately gives the AAL2 administrator global
  // access. The cross-namespace boundary is therefore proved with exact
  // participants, assigned reviewers, and outsiders—not by weakening that
  // administrator contract.
  assert.deepEqual(
    await exactIds(
      actorsA.reviewer.client,
      "trade_evidence_bundles",
      [aBundle, bBundle],
    ),
    [aBundle],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.reviewer.client,
      "trade_evidence_bundles",
      [aBundle, bBundle],
    ),
    [bBundle],
  );
}

function sqlUuidArray(values) {
  return `array[${values.map((value) => `'${value}'::uuid`).join(",")}]`;
}

function sqlTextArray(values) {
  return `array[${values
    .map((value) => `'${value.replaceAll("'", "''")}'`)
    .join(",")}]`;
}

function staleStyleProofSql() {
  const aUsers = Object.values(namespaceA.roles).map((role) => role.id);
  const bUsers = Object.values(namespaceB.roles).map((role) => role.id);
  const aEmails = Object.values(namespaceA.roles).map((role) => role.email);
  const bEmails = Object.values(namespaceB.roles).map((role) => role.email);
  const aAgreements = [
    namespaceA.objects.agreement,
    namespaceA.objects["admin-fallback-agreement"],
  ];
  const bAgreements = [
    namespaceB.objects.agreement,
    namespaceB.objects["admin-fallback-agreement"],
  ];

  return `
\\set ON_ERROR_STOP on
begin;
create temporary table stale_auth_fixture(
  id uuid primary key,
  email text not null,
  owner text not null
) on commit drop;
create temporary table stale_agreement_fixture(
  id uuid primary key,
  owner text not null
) on commit drop;
insert into stale_auth_fixture
select id, email, owner
from unnest(
  ${sqlUuidArray([...STALE_USER_IDS, ...aUsers, ...bUsers])},
  ${sqlTextArray([...STALE_EMAILS, ...aEmails, ...bEmails])},
  ${sqlTextArray([
    ...STALE_USER_IDS.map(() => "stale-fixed"),
    ...aUsers.map(() => "A"),
    ...bUsers.map(() => "B"),
  ])}
) as fixture(id, email, owner);
insert into stale_agreement_fixture
select id, owner
from unnest(
  ${sqlUuidArray([...STALE_AGREEMENT_IDS, ...aAgreements, ...bAgreements])},
  ${sqlTextArray([
    ...STALE_AGREEMENT_IDS.map(() => "stale-fixed"),
    ...aAgreements.map(() => "A"),
    ...bAgreements.map(() => "B"),
  ])}
) as fixture(id, owner);

-- Exact predicates copied from the actual fixed-identity cleanup at
-- e0ed0d206687dae17882260313152846b2d2bd22.
delete from stale_agreement_fixture
where id in (${STALE_AGREEMENT_IDS.map((id) => `'${id}'`).join(",")});
delete from stale_auth_fixture
where id in (${STALE_USER_IDS.map((id) => `'${id}'`).join(",")});

select json_build_object(
  'status', 'ok',
  'staleAuthRemaining', (
    select count(*) from stale_auth_fixture where owner = 'stale-fixed'
  ),
  'staleAgreementsRemaining', (
    select count(*) from stale_agreement_fixture where owner = 'stale-fixed'
  ),
  'aAuthRemaining', (
    select count(*) from stale_auth_fixture where owner = 'A'
  ),
  'bAuthRemaining', (
    select count(*) from stale_auth_fixture where owner = 'B'
  ),
  'aAgreementsRemaining', (
    select count(*) from stale_agreement_fixture where owner = 'A'
  ),
  'bAgreementsRemaining', (
    select count(*) from stale_agreement_fixture where owner = 'B'
  ),
  'liveAUsers', (
    select count(*) from auth.users where id = any(${sqlUuidArray(aUsers)})
  ),
  'liveBUsers', (
    select count(*) from auth.users where id = any(${sqlUuidArray(bUsers)})
  ),
  'liveAAgreements', (
    select count(*) from public.agreements
    where id = any(${sqlUuidArray(aAgreements)})
  ),
  'liveBAgreements', (
    select count(*) from public.agreements
    where id = any(${sqlUuidArray(bAgreements)})
  ),
  'liveRunOwnedUsersMatchingStaleIds', (
    select count(*) from auth.users
    where id = any(${sqlUuidArray([...aUsers, ...bUsers])})
      and id = any(${sqlUuidArray(STALE_USER_IDS)})
  ),
  'liveRunOwnedUsersMatchingStaleEmails', (
    select count(*) from auth.users
    where id = any(${sqlUuidArray([...aUsers, ...bUsers])})
      and email = any(${sqlTextArray(STALE_EMAILS)})
  )
);
rollback;
`;
}

async function requireLiveActors(actors, manifest, label) {
  for (const role of ROLE_KEYS) {
    const { data, error } = await actors[role].client.auth.getUser();
    if (error || data.user?.id !== manifest.roles[role].id) {
      throw new Error(`${label} ${role} session is no longer usable.`);
    }
  }
}

async function requireDeletedActors(actors, label) {
  for (const role of ROLE_KEYS) {
    const { data, error } = await actors[role].client.auth.getUser();
    if (!error && data.user) {
      throw new Error(
        `${label} ${role} remained remotely authenticated after exact cleanup.`,
      );
    }
  }
}

async function verifyMfaState(actor, label) {
  const { data: factors, error: factorError } =
    await actor.client.auth.mfa.listFactors();
  if (factorError || (factors?.totp?.length ?? 0) < 1) {
    throw new Error(`${label} lost its run-owned MFA factor.`);
  }
  const { data: aal, error: aalError } =
    await actor.client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || aal?.currentLevel !== "aal2") {
    throw new Error(`${label} lost its AAL2 session.`);
  }
}

let actorsA;
let actorsB;
let cleanupACompleted = false;
let cleanupBCompleted = false;

try {
  const preflightA = runPsqlFile(
    "namespace A preflight",
    PREFLIGHT_SQL,
    namespaceA,
  );
  const preflightB = runPsqlFile(
    "namespace B preflight",
    PREFLIGHT_SQL,
    namespaceB,
  );
  emit("preflight", {
    namespaceA: namespaceA.namespace.handle,
    namespaceB: namespaceB.namespace.handle,
    preflightA,
    preflightB,
  });

  const createdA = runPsqlFile(
    "namespace A fixture",
    FIXTURE_SQL,
    namespaceA,
    passwordA,
  );
  const createdB = runPsqlFile(
    "namespace B fixture",
    FIXTURE_SQL,
    namespaceB,
    passwordB,
  );
  emit("created", { createdA, createdB });

  actorsA = await authenticateNamespace(namespaceA, passwordA);
  actorsB = await authenticateNamespace(namespaceB, passwordB);
  actorsA.reviewer.session = await elevate(
    actorsA.reviewer.client,
    "a-reviewer",
  );
  actorsA["appeal-reviewer"].session = await elevate(
    actorsA["appeal-reviewer"].client,
    "a-appeal-reviewer",
  );
  actorsA.administrator.session = await elevate(
    actorsA.administrator.client,
    "a-administrator",
  );
  actorsB.reviewer.session = await elevate(
    actorsB.reviewer.client,
    "b-reviewer",
  );
  actorsB["appeal-reviewer"].session = await elevate(
    actorsB["appeal-reviewer"].client,
    "b-appeal-reviewer",
  );
  actorsB.administrator.session = await elevate(
    actorsB.administrator.client,
    "b-administrator",
  );
  await requireLiveActors(actorsA, namespaceA, "A");
  await requireLiveActors(actorsB, namespaceB, "B");
  emit("authenticated", {
    aRoles: ROLE_KEYS.length,
    bRoles: ROLE_KEYS.length,
    aAal2Roles: 3,
    bAal2Roles: 3,
  });

  await proveAuthorization(actorsA, actorsB);
  emit("authorization", {
    status: "ok",
    participantAndAssignedReviewerCrossNamespacePrivateRows: 0,
    outsiderPrivateRows: 0,
    directParticipantEvidenceRows: 0,
    administratorBoundary: "existing global AAL2 privilege preserved",
  });

  const staleStyle = runInlineSql(
    "stale-style fixed cleanup proof",
    staleStyleProofSql(),
  );
  assert.deepEqual(staleStyle, {
    status: "ok",
    staleAuthRemaining: 0,
    staleAgreementsRemaining: 0,
    aAuthRemaining: 6,
    bAuthRemaining: 6,
    aAgreementsRemaining: 2,
    bAgreementsRemaining: 2,
    liveAUsers: 6,
    liveBUsers: 6,
    liveAAgreements: 2,
    liveBAgreements: 2,
    liveRunOwnedUsersMatchingStaleIds: 0,
    liveRunOwnedUsersMatchingStaleEmails: 0,
  });
  emit("stale-style", staleStyle);

  const cleanupA = runPsqlFile(
    "namespace A cleanup",
    CLEANUP_SQL,
    namespaceA,
  );
  cleanupACompleted = true;
  assert.equal(cleanupA.allZero, true);
  await requireDeletedActors(actorsA, "A");
  await requireLiveActors(actorsB, namespaceB, "B after A cleanup");
  await verifyMfaState(
    actorsB.reviewer,
    "B reviewer after A cleanup",
  );
  await verifyMfaState(
    actorsB.administrator,
    "B administrator after A cleanup",
  );
  assert.deepEqual(
    await exactIds(
      actorsB.payer.client,
      "agreements",
      [namespaceB.objects.agreement],
    ),
    [namespaceB.objects.agreement],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.reviewer.client,
      "trade_evidence_bundles",
      [namespaceB.objects["evidence-bundle"]],
    ),
    [namespaceB.objects["evidence-bundle"]],
  );
  assert.deepEqual(
    await exactIds(
      actorsB.payer.client,
      "trade_milestone_payouts",
      [namespaceB.objects.payout],
    ),
    [namespaceB.objects.payout],
  );
  emit("after-cleanup-a", {
    cleanupA,
    bRolesStillAuthenticated: 6,
    bReviewerMfaIntact: true,
    bAdministratorMfaIntact: true,
    bAgreementRows: 1,
    bEvidenceRows: 1,
    bPayoutRows: 1,
  });

  const cleanupASecond = runPsqlFile(
    "namespace A idempotent cleanup",
    CLEANUP_SQL,
    namespaceA,
  );
  assert.equal(cleanupASecond.allZero, true);
  emit("failure-path-cleanup-a", { cleanupASecond });

  const freshB = await authenticateNamespace(namespaceB, passwordB);
  await requireLiveActors(
    freshB,
    namespaceB,
    "B fresh sign-in after A cleanup",
  );
  emit("continued-b", { status: "ok", freshPasswordSignIns: 6 });

  const cleanupB = runPsqlFile(
    "namespace B cleanup",
    CLEANUP_SQL,
    namespaceB,
  );
  cleanupBCompleted = true;
  assert.equal(cleanupB.allZero, true);
  await requireDeletedActors(actorsB, "B");
  await requireDeletedActors(freshB, "B fresh");
  emit("after-cleanup-b", { cleanupB });

  const finalA = runPsqlFile(
    "namespace A final preflight",
    PREFLIGHT_SQL,
    namespaceA,
  );
  const finalB = runPsqlFile(
    "namespace B final preflight",
    PREFLIGHT_SQL,
    namespaceB,
  );
  emit("final-zero-residue", { finalA, finalB });

  const report = {
    schemaVersion: 1,
    status: "passed",
    runId: RUN_ID,
    runAttempt: RUN_ATTEMPT,
    namespaceA: {
      handle: namespaceA.namespace.handle,
      sha256: namespaceA.namespace.sha256,
    },
    namespaceB: {
      handle: namespaceB.namespace.handle,
      sha256: namespaceB.namespace.sha256,
    },
    stages: summaries,
    secretsIncluded: false,
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  emit("complete", {
    status: "passed",
    output: "evidence-payment-two-writer.json",
  });
} catch (error) {
  emit("failure", { error: safeError(error) });
  throw error;
} finally {
  for (const [label, manifest, completed] of [
    ["A", namespaceA, cleanupACompleted],
    ["B", namespaceB, cleanupBCompleted],
  ]) {
    if (completed) continue;
    try {
      const cleanup = runPsqlFile(
        `emergency cleanup ${label}`,
        CLEANUP_SQL,
        manifest,
      );
      emit("emergency-cleanup", { namespace: label, cleanup });
    } catch (cleanupError) {
      emit("emergency-cleanup-failed", {
        namespace: label,
        error: safeError(cleanupError),
      });
    }
  }
}
