import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const repo = process.env.GITHUB_REPOSITORY || "ghuser29384/Website2";
const runId = process.env.GITHUB_RUN_ID || String(Date.now());
const controllerBranch = process.env.GITHUB_REF_NAME || "ops/issue723-converge-clean-20260818";
const originalRepairHead = "ec59737e66aa6135b822446e4cb4a82372e0b39b";
const originalProductBranch = "fix/723-donation-confirmation-authenticated-caller";
const pr700Branch = "qa/pooled-settlement-authenticated-e2e-20260814";
const pr700Head = "813573f64eaa17d2ca240c50f76ead9a3b535f97";
const productBranch = `fix/issue723-authenticated-caller-clean-${runId}`;
const stackBranch = `qa/issue723-authenticated-caller-clean-${runId}`;
const migrationPath = "supabase/migrations/20260817113000_authenticate_trade_donation_confirmation_caller.sql";
const testPath = "src/lib/moral-trade/trade-donation-confirmation-authenticated-caller.test.ts";
const actionPath = "src/app/trade-donation-actions-base.ts";
const integrationContractPath = ".github/scripts/pooled-settlement-authenticated-caller-integration-contract.mjs";
const integrationRunnerPath = ".github/scripts/pooled-settlement-authenticated-caller-integration.mjs";
const integrationTestPath = ".github/scripts/pooled-settlement-authenticated-caller-integration.test.mjs";
const integrationWorkflowPath = ".github/workflows/pooled-settlement-authenticated-caller-integration-20260818.yml";
const productPaths = [actionPath, testPath, migrationPath];
const stackPaths = [
  integrationContractPath,
  integrationRunnerPath,
  integrationTestPath,
  integrationWorkflowPath,
  ...productPaths,
].sort();

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 1024 * 1024 * 64,
  });
  if (result.status !== 0) {
    const detail = options.capture
      ? `\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`
      : "";
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}.${detail}`);
  }
  return options.capture ? String(result.stdout || "").trim() : "";
}

function git(args, cwd, capture = true) {
  return run("git", args, { cwd, capture });
}

function gh(args, capture = true) {
  return run("gh", args, { capture });
}

function ghJson(args) {
  const raw = gh(args, true);
  return raw ? JSON.parse(raw) : null;
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function show(ref, path, cwd) {
  return git(["show", `${ref}:${path}`], cwd, true);
}

function listDiff(base, cwd) {
  const value = git(["diff", "--name-only", base, "HEAD"], cwd, true);
  return value ? value.split("\n").filter(Boolean).sort() : [];
}

function assertExactPaths(actual, expected, label) {
  assert.deepEqual(actual, [...expected].sort(), `${label} changed-file scope drifted.`);
}

function patchAuthenticatedCaller(source) {
  let text = String(source);
  const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']@\/lib\/supabase\/server["'];/;
  const importMatch = text.match(importPattern);
  assert.ok(importMatch, "Supabase server-client import was not found.");
  const names = importMatch[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  assert.ok(names.includes("createServiceClient"), "createServiceClient import disappeared unexpectedly.");
  if (!names.includes("createClient")) names.unshift("createClient");
  const replacementImport = `import { ${[...new Set(names)].join(", ")} } from "@/lib/supabase/server";`;
  text = text.replace(importPattern, replacementImport);

  const start = text.indexOf("export async function confirmDonationAwareAgreementVersionAction");
  const end = text.indexOf("export async function confirmDonationAwareTradeCompletionAction", start);
  assert.ok(start >= 0 && end > start, "Donation-backed confirmation action boundary was not found.");
  const before = text.slice(0, start);
  let action = text.slice(start, end);
  const oldClient = "const supabase = createServiceClient() as any;";
  const newClient = "const supabase = (await createClient()) as any;";
  if (action.includes(oldClient)) {
    assert.equal(action.split(oldClient).length - 1, 1, "Service client use was not unique in confirmation action.");
    action = action.replace(oldClient, newClient);
  } else {
    assert.equal(action.split(newClient).length - 1, 1, "Authenticated client use was not present exactly once.");
  }
  assert.doesNotMatch(action, /createServiceClient\(\)/);
  assert.match(action, /p_actor_id:\s*viewer\.authUser\.id/);
  text = before + action + text.slice(end);
  assert.match(text, /before final completion\./);
  assert.doesNotMatch(text, /befor final completion\./);
  return text;
}

function sanitize(value) {
  return String(value)
    .replace(/(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_]+/g, "[REDACTED_STRIPE_KEY]")
    .replace(/whsec_[A-Za-z0-9_]+/g, "[REDACTED_WEBHOOK_SECRET]")
    .replace(/postgres(?:ql)?:\/\/\S+/g, "[REDACTED_DATABASE_URL]")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "[REDACTED_JWT]");
}

function comment(numbers, body) {
  for (const number of numbers) {
    gh(["api", `repos/${repo}/issues/${number}/comments`, "-f", `body=${body}`], false);
  }
}

function queryLifecycleFunctions(cwd) {
  const databaseUrl = process.env.QA_SUPABASE_DB_URL || "";
  assert.ok(databaseUrl.includes("hvmxfjjbdcgjjudmthdz"), "QA database URL does not target the canonical isolated project.");
  const sql = `select coalesce(json_agg(json_build_object('name', p.proname, 'args', p.proargnames[1:p.pronargs], 'types', oidvectortypes(p.proargtypes)) order by p.proname)::text, '[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('finalize_trade_agreement_milestones_v1','confirm_trade_agreement_milestone_manifest_v1');`;
  const raw = run("psql", [databaseUrl, "-X", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", sql], { cwd, capture: true });
  const rows = JSON.parse(raw);
  assert.equal(rows.length, 2, "Canonical milestone lifecycle functions were not uniquely present.");
  const byName = new Map(rows.map((row) => [row.name, row]));
  const finalize = byName.get("finalize_trade_agreement_milestones_v1");
  const confirm = byName.get("confirm_trade_agreement_milestone_manifest_v1");
  assert.ok(finalize && confirm, "Milestone lifecycle function set was incomplete.");
  const allowed = new Set([
    "p_actor_id",
    "p_agreement_id",
    "p_agreement_version_id",
    "p_version_id",
    "p_expected_agreement_version_id",
    "p_expected_version",
    "p_version",
    "p_idempotency_key",
    "p_manifest_hash",
    "p_expected_manifest_hash",
    "p_milestone_manifest_hash",
    "p_expected_milestone_manifest_hash",
    "p_complete_terms_hash",
    "p_expected_complete_terms_hash",
  ]);
  for (const row of [finalize, confirm]) {
    assert.ok(Array.isArray(row.args) && row.args.length > 0, `${row.name} has no inspectable argument names.`);
    for (const name of row.args) assert.ok(allowed.has(name), `${row.name} has unsupported argument ${name}.`);
  }
  const hashNames = new Set([
    "p_manifest_hash",
    "p_expected_manifest_hash",
    "p_milestone_manifest_hash",
    "p_expected_milestone_manifest_hash",
  ]);
  assert.equal(finalize.args.some((name) => hashNames.has(name)), false, "Finalize RPC unexpectedly requires a precomputed manifest hash.");
  return { finalizeArgs: finalize.args, confirmArgs: confirm.args };
}

function createProductCandidate(repoDir) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    git(["fetch", "--no-tags", "--force", "origin", "main", originalRepairHead], repoDir, false);
    const mainHead = git(["rev-parse", "origin/main"], repoDir, true);
    const dir = mkdtempSync(join(tmpdir(), `issue723-product-${attempt}-`));
    git(["worktree", "add", "--detach", dir, mainHead], repoDir, false);
    try {
      git(["switch", "-c", productBranch], dir, false);
      write(join(dir, actionPath), patchAuthenticatedCaller(readFileSync(join(dir, actionPath), "utf8")));
      write(join(dir, testPath), show(originalRepairHead, testPath, repoDir));
      write(join(dir, migrationPath), show(originalRepairHead, migrationPath, repoDir));
      run("git", ["diff", "--check"], { cwd: dir });
      assertExactPaths(listDiff(mainHead, dir), productPaths, "Product repair");

      git(["config", "user.name", "github-actions[bot]"], dir, false);
      git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], dir, false);
      git(["add", "-A"], dir, false);
      git(["commit", "-m", "Use authenticated caller for donation-backed confirmation"], dir, false);
      const head = git(["rev-parse", "HEAD"], dir, true);
      assert.equal(git(["rev-parse", "HEAD^"], dir, true), mainHead, "Product candidate must have exact current-main sole parent.");

      run("npm", ["ci"], { cwd: dir });
      run("node", ["--import", "tsx", "--test", testPath], { cwd: dir });
      run("npm", ["test"], { cwd: dir });
      run("npx", ["tsc", "--noEmit"], { cwd: dir });
      run("npm", ["run", "lint", "--", "--quiet"], { cwd: dir });
      run("npm", ["run", "build"], {
        cwd: dir,
        env: {
          ...process.env,
          CONDITIONAL_PAYMENTS_MODE: "disabled",
          TRADE_DONATION_POOL_ENABLED: "false",
          TRADE_DONATION_POOL_MODE: "disabled",
          EVERY_ORG_PLEDGE_DONATIONS_ENABLED: "false",
          NEXT_PUBLIC_SITE_URL: "https://www.moraltrade.org",
          VERCEL: "1",
          VERCEL_ENV: "preview",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      });
      assert.equal(git(["status", "--porcelain"], dir, true), "", "Product candidate changed during verification.");

      git(["fetch", "--no-tags", "--force", "origin", "main"], repoDir, false);
      const currentMain = git(["rev-parse", "origin/main"], repoDir, true);
      if (currentMain !== mainHead) {
        rmSync(dir, { recursive: true, force: true });
        continue;
      }
      git(["push", "-u", "origin", `HEAD:${productBranch}`], dir, false);
      const body = [
        "## Scope",
        "",
        "Clean current-main reconstruction of issue #723.",
        "",
        `- exact base / sole parent: \`${mainHead}\``,
        `- exact head: \`${head}\``,
        "- changed files: exactly three",
        "- cookie-bound authenticated confirmation client",
        "- authenticated-only forward migration",
        "- fail-closed source-contract tests",
        "",
        "Focused authorization tests, the complete repository suite, TypeScript, ESLint, and the pooled-settlement-disabled production build passed before publication.",
        "",
        "**Draft and unmerged.** No production migration, deployment, provider action, feature-flag change, Every.org donation, or real-fund movement is authorized.",
      ].join("\n");
      const url = gh(["pr", "create", "--draft", "--base", "main", "--head", productBranch, "--title", "Clean issue 723 authenticated-caller repair", "--body", body], true);
      return { dir, mainHead, head, prNumber: Number(url.split("/").pop()) };
    } catch (error) {
      try { git(["worktree", "remove", "--force", dir], repoDir, false); } catch {}
      if (attempt === 3) throw error;
    }
  }
  throw new Error("Current main moved during every product-candidate attempt.");
}

function integrationContractSource(productHead, productBranchName, finalizeArgs, confirmArgs) {
  const helperSource = `async function participantAuthenticatedClient(user) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  unwrap(
    await client.auth.signInWithPassword({ email: user.email, password }),
    user.role + " participant sign-in",
  );
  const identity = unwrap(await client.auth.getUser(), user.role + " getUser");
  assert.equal(identity.user?.id, user.id, user.role + " authenticated as the wrong user.");
  return client;
}

function expectConfirmationFailure(result, label) {
  assert.ok(result.error, label + " unexpectedly succeeded.");
  assert.match(
    result.error.message,
    /permission denied|authenticated participant|authenticated profile|not authorized/i,
    label + " failed for an unexpected reason: " + result.error.message,
  );
}

async function prepareMilestoneManifestForAuthenticatedConfirmation({ counterparty, payer, agreement, version, label }) {
  const milestone = await insertOne("trade_agreement_milestones", {
    agreement_id: agreement.id,
    agreement_version_id: version.id,
    position: 1,
    performer_id: counterparty.id,
    payer_id: payer.id,
    action_category: "service",
    description: \`Synthetic reciprocal milestone for \${label}.\`,
    unit_label: "completed reciprocal action",
    units_total: 1,
    indivisible: true,
    maximum_amount_cents: 0,
    currency: "USD",
    evidence_rule: "Synthetic QA evidence only.",
    status: "terms",
  });
  assert.equal(milestone.agreement_version_id, version.id);
  const counterpartyClient = await participantAuthenticatedClient(counterparty);
  const payerClient = await participantAuthenticatedClient(payer);
  const values = (actor, functionName, manifestHash = null) => ({
    p_actor_id: actor.id,
    p_agreement_id: agreement.id,
    p_agreement_version_id: version.id,
    p_version_id: version.id,
    p_expected_agreement_version_id: version.id,
    p_expected_version: version.version,
    p_version: version.version,
    p_idempotency_key: \`pooled-qa:\${runId}:\${label}:\${functionName}:\${actor.id}\`,
    p_manifest_hash: manifestHash,
    p_expected_manifest_hash: manifestHash,
    p_milestone_manifest_hash: manifestHash,
    p_expected_milestone_manifest_hash: manifestHash,
    p_complete_terms_hash: version.complete_terms_hash,
    p_expected_complete_terms_hash: version.complete_terms_hash,
  });
  const finalizeNames = ${JSON.stringify(finalizeArgs)};
  const finalizeValues = values(counterparty, "finalize_trade_agreement_milestones_v1");
  unwrap(
    await counterpartyClient.rpc(
      "finalize_trade_agreement_milestones_v1",
      Object.fromEntries(finalizeNames.map((name) => [name, finalizeValues[name]])),
    ),
    \`finalize milestone manifest for \${label}\`,
  );
  const finalizedVersion = await loadOne("trade_agreement_versions", version.id);
  assert.match(String(finalizedVersion.milestone_manifest_hash || ""), /^[0-9a-f]{64}$/);
  const confirmNames = ${JSON.stringify(confirmArgs)};
  for (const [actor, client] of [[counterparty, counterpartyClient], [payer, payerClient]]) {
    const confirmValues = values(
      actor,
      "confirm_trade_agreement_milestone_manifest_v1",
      finalizedVersion.milestone_manifest_hash,
    );
    unwrap(
      await client.rpc(
        "confirm_trade_agreement_milestone_manifest_v1",
        Object.fromEntries(confirmNames.map((name) => [name, confirmValues[name]])),
      ),
      \`review milestone manifest for \${label} as \${actor.role}\`,
    );
  }
  record(
    "Milestone manifest finalized and reviewed by both authenticated participants",
    "passed",
    { agreementId: agreement.id },
  );
}

async function probeConfirmationAuthorizationBoundary({ counterparty, payer, agreement, version }) {
  const anonymous = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const unauthenticated = await anonymous.rpc("confirm_trade_donation_version_v2", {
    p_actor_id: counterparty.id,
    p_agreement_id: agreement.id,
    p_agreement_version_id: version.id,
  });
  expectConfirmationFailure(unauthenticated, "Unauthenticated confirmation");

  const counterpartyClient = await participantAuthenticatedClient(counterparty);
  const mismatched = await counterpartyClient.rpc("confirm_trade_donation_version_v2", {
    p_actor_id: payer.id,
    p_agreement_id: agreement.id,
    p_agreement_version_id: version.id,
  });
  expectConfirmationFailure(mismatched, "Actor-mismatched confirmation");

  const serviceRole = await admin.rpc("confirm_trade_donation_version_v2", {
    p_actor_id: counterparty.id,
    p_agreement_id: agreement.id,
    p_agreement_version_id: version.id,
  });
  expectConfirmationFailure(serviceRole, "Service-role confirmation");
  record("Confirmation boundary rejects unauthenticated, mismatched, and service-role callers", "passed");
}

async function confirmAsAuthenticatedParticipant(actor, agreementId, agreementVersionId, label) {
  const client = await participantAuthenticatedClient(actor);
  return unwrap(
    await client.rpc("confirm_trade_donation_version_v2", {
      p_actor_id: actor.id,
      p_agreement_id: agreementId,
      p_agreement_version_id: agreementVersionId,
    }),
    "confirm " + label + " as " + actor.role,
  );
}

`;
  const serviceRoleLoop = `  for (const actor of [counterparty, payer]) {
    unwrap(
      await admin.rpc("confirm_trade_donation_version_v2", {
        p_actor_id: actor.id,
        p_agreement_id: agreement.id,
        p_agreement_version_id: version.id,
      }),
      \`confirm \${label} as \${actor.role}\`,
    );
  }`;
  const authenticatedLoop = `  await prepareMilestoneManifestForAuthenticatedConfirmation({ counterparty, payer, agreement, version, label });
  if (!confirmationBoundaryProbed) {
    await probeConfirmationAuthorizationBoundary({ counterparty, payer, agreement, version });
    confirmationBoundaryProbed = true;
  }
  for (const actor of [counterparty, payer]) {
    await confirmAsAuthenticatedParticipant(actor, agreement.id, version.id, label);
  }`;
  const privilegeBlock = `  const confirmation = queryPostgres(\`
select p.prosecdef,
       coalesce(array_to_string(p.proconfig, ','), ''),
       has_function_privilege('anon', p.oid, 'EXECUTE'),
       has_function_privilege('authenticated', p.oid, 'EXECUTE'),
       has_function_privilege('service_role', p.oid, 'EXECUTE')
from pg_proc p
where p.oid = to_regprocedure('public.confirm_trade_donation_version_v2(uuid,uuid,uuid)');
\`).split("\\t");
  assert.deepEqual(
    confirmation,
    ["t", "search_path=pg_catalog", "f", "t", "f"],
    "confirm_trade_donation_version_v2(uuid,uuid,uuid)",
  );
  functions.push({
    signature: "confirm_trade_donation_version_v2(uuid,uuid,uuid)",
    securityDefiner: true,
    searchPath: "pg_catalog",
    anonymousExecute: false,
    authenticatedExecute: true,
    serviceRoleExecute: false,
  });
  return { migrations: versions, tables: tables.map(([name]) => name), functions };
}`;
  return `import assert from "node:assert/strict";

export const PR700_HEAD = ${JSON.stringify(pr700Head)};
export const PRODUCT_REPAIR_HEAD = ${JSON.stringify(productHead)};
export const PRODUCT_BRANCH = ${JSON.stringify(productBranchName)};
export const QA_PROJECT_REF = "hvmxfjjbdcgjjudmthdz";
export const AUTHENTICATED_CONFIRMATION_MIGRATION = ${JSON.stringify(migrationPath)};
export const INTEGRATION_PATHS = ${JSON.stringify(stackPaths, null, 2)};

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  assert.ok(first >= 0, label + ": expected source contract was not found.");
  assert.equal(source.indexOf(before, first + before.length), -1, label + ": expected source contract was not unique.");
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function buildAuthenticatedHarnessSource(input) {
  let source = String(input);
  source = replaceExactly(
    source,
    "let databaseContract = null;",
    "let databaseContract = null;\\nlet confirmationBoundaryProbed = false;",
    "authorization probe state",
  );
  const helperMarker = "async function establishAal2(user) {";
  const helpers = ${JSON.stringify(helperSource)};
  source = replaceExactly(source, helperMarker, helpers + helperMarker, "authenticated participant and milestone helpers");
  const serviceRoleLoop = ${JSON.stringify(serviceRoleLoop)};
  const authenticatedLoop = ${JSON.stringify(authenticatedLoop)};
  source = replaceExactly(source, serviceRoleLoop, authenticatedLoop, "bilateral participant confirmations");
  const returnContract = "  return { migrations: versions, tables: tables.map(([name]) => name), functions };\\n}";
  const authenticatedPrivilegeContract = ${JSON.stringify(privilegeBlock)};
  source = replaceExactly(source, returnContract, authenticatedPrivilegeContract, "authenticated-only database privilege contract");
  assert.doesNotMatch(
    source,
    /for \\(const actor of \\[counterparty, payer\\]\\) \\{\\s*unwrap\\(\\s*await admin\\.rpc\\(\"confirm_trade_donation_version_v2\"/s,
  );
  return source;
}
`;
}

function integrationRunnerSource() {
  return `import { readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { buildAuthenticatedHarnessSource } from "./pooled-settlement-authenticated-caller-integration-contract.mjs";

const sourcePath = ".github/scripts/pooled-settlement-qa-e2e.mjs";
const generatedPath = ".github/scripts/.generated-pooled-settlement-authenticated-caller-e2e.mjs";
const source = await readFile(sourcePath, "utf8");
const generated = buildAuthenticatedHarnessSource(source);
await writeFile(generatedPath, generated, "utf8");
try {
  await import(\`${"${pathToFileURL(generatedPath).href}"}?run=${"${encodeURIComponent(process.env.GITHUB_RUN_ID || String(Date.now()))}"}\`);
} finally {
  await rm(generatedPath, { force: true });
}
`;
}

function integrationTestSource(productHead) {
  return `import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PR700_HEAD,
  PRODUCT_REPAIR_HEAD,
  QA_PROJECT_REF,
  INTEGRATION_PATHS,
  buildAuthenticatedHarnessSource,
} from "./pooled-settlement-authenticated-caller-integration-contract.mjs";

test("clean issue-723 integration identity is frozen", () => {
  assert.equal(PR700_HEAD, ${JSON.stringify(pr700Head)});
  assert.equal(PRODUCT_REPAIR_HEAD, ${JSON.stringify(productHead)});
  assert.equal(QA_PROJECT_REF, "hvmxfjjbdcgjjudmthdz");
  assert.equal(INTEGRATION_PATHS.length, 7);
});

test("authenticated transformation preserves negative probes and canonical milestone ordering", async () => {
  const original = await readFile(".github/scripts/pooled-settlement-qa-e2e.mjs", "utf8");
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /participantAuthenticatedClient/);
  assert.match(generated, /finalize_trade_agreement_milestones_v1/);
  assert.match(generated, /confirm_trade_agreement_milestone_manifest_v1/);
  assert.match(generated, /Confirmation boundary rejects unauthenticated, mismatched, and service-role callers/);
  const prepare = generated.indexOf("await prepareMilestoneManifestForAuthenticatedConfirmation");
  const negative = generated.indexOf("await probeConfirmationAuthorizationBoundary");
  const valid = generated.indexOf("await confirmAsAuthenticatedParticipant", negative);
  assert.ok(prepare >= 0 && negative > prepare && valid > negative);
  assert.doesNotMatch(
    generated,
    /for \\(const actor of \\[counterparty, payer\\]\\) \\{\\s*unwrap\\(\\s*await admin\\.rpc\\(\"confirm_trade_donation_version_v2\"/s,
  );
});

test("database contract requires authenticated-only donation confirmation", async () => {
  const original = await readFile(".github/scripts/pooled-settlement-qa-e2e.mjs", "utf8");
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /anonymousExecute: false/);
  assert.match(generated, /authenticatedExecute: true/);
  assert.match(generated, /serviceRoleExecute: false/);
});
`;
}

function integrationWorkflowSource(productHead, productBranchName, stackBranchName) {
  return `name: Pooled settlement authenticated-caller integration clean

on:
  push:
    branches:
      - ${stackBranchName}
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pooled-settlement-authenticated-caller-clean-${"${{ github.ref }}"}-${"${{ github.sha }}"}
  cancel-in-progress: false

env:
  PR700_HEAD: ${pr700Head}
  PRODUCT_REPAIR_HEAD: ${productHead}
  PRODUCT_BRANCH: ${productBranchName}
  AUTH_MIGRATION_PATH: ${migrationPath}
  NEXT_TELEMETRY_DISABLED: "1"

jobs:
  source:
    name: Exact stacked source and fail-closed preflight
    runs-on: ubuntu-24.04
    timeout-minutes: 55
    outputs:
      ready: ${"${{ steps.preflight.outputs.ready }}"}
      unsafe: ${"${{ steps.preflight.outputs.unsafe }}"}
    steps:
      - name: Check out exact clean candidate
        uses: actions/checkout@v4
        with:
          ref: ${"${{ github.sha }}"}
          fetch-depth: 2
      - name: Verify exact sole parent and seven-file scope
        shell: bash
        run: |
          set -euo pipefail
          test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
          test "$(git rev-parse HEAD^)" = "$PR700_HEAD"
          test "$(git rev-list --count HEAD^)" -ge 1
          actual="$(git diff --name-only "$PR700_HEAD" HEAD | LC_ALL=C sort)"
          expected="$(printf '%s\\n' \\
            '${integrationContractPath}' \\
            '${integrationRunnerPath}' \\
            '${integrationTestPath}' \\
            '${integrationWorkflowPath}' \\
            '${actionPath}' \\
            '${testPath}' \\
            '${migrationPath}' | LC_ALL=C sort)"
          test "$actual" = "$expected"
          git fetch --no-tags --force --depth=1 origin "$PRODUCT_BRANCH"
          test "$(git rev-parse FETCH_HEAD)" = "$PRODUCT_REPAIR_HEAD"
          for path in '${actionPath}' '${testPath}' '${migrationPath}'; do
            test "$(git rev-parse HEAD:$path)" = "$(git rev-parse FETCH_HEAD:$path)"
          done
          grep -Fq 'before final completion.' '${actionPath}'
          ! grep -Fq 'befor final completion.' '${actionPath}'
          git diff --check "$PR700_HEAD" HEAD
      - name: Use Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install exact dependencies
        run: npm ci
      - name: Test original and clean authenticated harness contracts
        run: |
          node --test .github/scripts/pooled-settlement-qa-e2e.test.mjs ${integrationTestPath}
      - name: Run authorization and pooled-settlement contracts
        run: |
          node --import tsx --test \\
            ${testPath} \\
            src/lib/trade-donation-pool.test.ts \\
            src/lib/trade-donation-pool-source-contract.test.ts \\
            src/lib/trade-donation-pool-environment-source-contract.test.ts \\
            src/lib/trade-donation-pool-stripe-environment-source-contract.test.ts \\
            src/lib/trade-donation-pool-provider-resume-source-contract.test.ts \\
            src/lib/moral-trade/pooled-settlement-trigger-privilege-migration.test.ts
      - name: Run complete repository tests
        run: npm test
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Lint
        run: npm run lint -- --quiet
      - name: Build with pooled settlement disabled
        env:
          TRADE_DONATION_POOL_ENABLED: "false"
          TRADE_DONATION_POOL_MODE: disabled
          EVERY_ORG_PLEDGE_DONATIONS_ENABLED: "false"
          CONDITIONAL_PAYMENTS_MODE: disabled
          NEXT_PUBLIC_SITE_URL: https://www.moraltrade.org
          VERCEL: "1"
          VERCEL_ENV: preview
        run: npm run build
      - name: Classify isolated-QA configuration without fallbacks
        id: preflight
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://hvmxfjjbdcgjjudmthdz.supabase.co
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${"${{ secrets.QA_SUPABASE_PUBLISHABLE_KEY }}"}
          SUPABASE_SERVICE_ROLE_KEY: ${"${{ secrets.QA_SUPABASE_SERVICE_ROLE_KEY }}"}
          QA_SUPABASE_DB_URL: ${"${{ secrets.QA_SUPABASE_DB_URL }}"}
          QA_TEST_PASSWORD: ${"${{ secrets.QA_TEST_PASSWORD }}"}
          QA_STRIPE_SECRET_KEY: ${"${{ secrets.QA_STRIPE_SECRET_KEY }}"}
          QA_STRIPE_PUBLISHABLE_KEY: ${"${{ secrets.QA_STRIPE_PUBLISHABLE_KEY }}"}
          QA_STRIPE_WEBHOOK_SECRET: ${"${{ secrets.QA_STRIPE_WEBHOOK_SECRET }}"}
          QA_EVERY_ORG_WEBHOOK_TOKEN: ${"${{ secrets.QA_EVERY_ORG_WEBHOOK_TOKEN }}"}
          QA_EVERY_ORG_WEBHOOK_PATH_SECRET: ${"${{ secrets.QA_EVERY_ORG_WEBHOOK_PATH_SECRET }}"}
          QA_EVERY_ORG_PARTNER_METADATA_SECRET: ${"${{ secrets.QA_EVERY_ORG_PARTNER_METADATA_SECRET }}"}
          POOLED_SETTLEMENT_QA_OUTPUT_DIR: issue-723-clean-preflight
        run: node .github/scripts/pooled-settlement-qa-e2e.mjs --preflight-only
      - name: Scan and upload sanitized preflight evidence
        if: always()
        shell: bash
        run: |
          set -euo pipefail
          if test -d issue-723-clean-preflight; then
            for name in QA_SUPABASE_PUBLISHABLE_KEY QA_SUPABASE_SERVICE_ROLE_KEY QA_SUPABASE_DB_URL QA_TEST_PASSWORD QA_STRIPE_SECRET_KEY QA_STRIPE_PUBLISHABLE_KEY QA_STRIPE_WEBHOOK_SECRET QA_EVERY_ORG_WEBHOOK_TOKEN QA_EVERY_ORG_WEBHOOK_PATH_SECRET QA_EVERY_ORG_PARTNER_METADATA_SECRET; do
              value="${!name:-}"
              if test -n "$value" && grep -R -F -q "$value" issue-723-clean-preflight; then
                echo "Secret value appeared in preflight evidence: $name" >&2
                exit 1
              fi
            done
          fi
      - name: Upload preflight artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: issue-723-clean-preflight-${"${{ github.run_id }}"}
          path: issue-723-clean-preflight/
          if-no-files-found: ignore
          retention-days: 14

  authenticated-e2e:
    name: Authenticated 19-case matrix with caller repair
    needs: source
    if: needs.source.outputs.ready == 'true' && needs.source.outputs.unsafe != 'true'
    runs-on: ubuntu-24.04
    timeout-minutes: 95
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://hvmxfjjbdcgjjudmthdz.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${"${{ secrets.QA_SUPABASE_PUBLISHABLE_KEY }}"}
      SUPABASE_SERVICE_ROLE_KEY: ${"${{ secrets.QA_SUPABASE_SERVICE_ROLE_KEY }}"}
      QA_SUPABASE_DB_URL: ${"${{ secrets.QA_SUPABASE_DB_URL }}"}
      QA_TEST_PASSWORD: ${"${{ secrets.QA_TEST_PASSWORD }}"}
      QA_STRIPE_SECRET_KEY: ${"${{ secrets.QA_STRIPE_SECRET_KEY }}"}
      QA_STRIPE_PUBLISHABLE_KEY: ${"${{ secrets.QA_STRIPE_PUBLISHABLE_KEY }}"}
      QA_STRIPE_WEBHOOK_SECRET: ${"${{ secrets.QA_STRIPE_WEBHOOK_SECRET }}"}
      QA_EVERY_ORG_WEBHOOK_TOKEN: ${"${{ secrets.QA_EVERY_ORG_WEBHOOK_TOKEN }}"}
      QA_EVERY_ORG_WEBHOOK_PATH_SECRET: ${"${{ secrets.QA_EVERY_ORG_WEBHOOK_PATH_SECRET }}"}
      QA_EVERY_ORG_PARTNER_METADATA_SECRET: ${"${{ secrets.QA_EVERY_ORG_PARTNER_METADATA_SECRET }}"}
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${"${{ secrets.QA_STRIPE_PUBLISHABLE_KEY }}"}
      STRIPE_SECRET_KEY: ${"${{ secrets.QA_STRIPE_SECRET_KEY }}"}
      STRIPE_WEBHOOK_SECRET: ${"${{ secrets.QA_STRIPE_WEBHOOK_SECRET }}"}
      EVERY_ORG_WEBHOOK_TOKEN: ${"${{ secrets.QA_EVERY_ORG_WEBHOOK_TOKEN }}"}
      EVERY_ORG_WEBHOOK_PATH_SECRET: ${"${{ secrets.QA_EVERY_ORG_WEBHOOK_PATH_SECRET }}"}
      EVERY_ORG_PARTNER_METADATA_SECRET: ${"${{ secrets.QA_EVERY_ORG_PARTNER_METADATA_SECRET }}"}
      NEXT_PUBLIC_SITE_URL: http://127.0.0.1:3215
      POOLED_SETTLEMENT_QA_BASE_URL: http://127.0.0.1:3215
      POOLED_SETTLEMENT_QA_OUTPUT_DIR: issue-723-clean-authenticated-evidence
      TRADE_DONATION_POOL_ENABLED: "true"
      TRADE_DONATION_POOL_MODE: test
      EVERY_ORG_PLEDGE_DONATIONS_ENABLED: "true"
      EVERY_ORG_ENVIRONMENT: staging
      VERCEL_ENV: preview
    steps:
      - name: Check out exact clean candidate
        uses: actions/checkout@v4
        with:
          ref: ${"${{ github.sha }}"}
          fetch-depth: 2
      - name: Verify exact sole parent
        run: |
          test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
          test "$(git rev-parse HEAD^)" = "$PR700_HEAD"
      - name: Use Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies, Chromium, and PostgreSQL client
        run: |
          npm ci
          npx playwright install --with-deps chromium
          sudo apt-get update
          sudo apt-get install --yes postgresql-client
      - name: Verify QA target and apply authenticated-only privilege migration
        run: |
          set -euo pipefail
          node --input-type=module <<'NODE'
          const url = String(process.env.QA_SUPABASE_DB_URL || "");
          if (!url.includes("hvmxfjjbdcgjjudmthdz")) throw new Error("Wrong QA database target.");
          NODE
          psql "$QA_SUPABASE_DB_URL" -X --no-psqlrc --set ON_ERROR_STOP=1 --file "$AUTH_MIGRATION_PATH"
          actual="$(psql "$QA_SUPABASE_DB_URL" -X --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align --field-separator '|' --command "select p.prosecdef, coalesce(array_to_string(p.proconfig, ','), ''), has_function_privilege('anon', p.oid, 'EXECUTE'), has_function_privilege('authenticated', p.oid, 'EXECUTE'), has_function_privilege('service_role', p.oid, 'EXECUTE') from pg_proc p where p.oid=to_regprocedure('public.confirm_trade_donation_version_v2(uuid,uuid,uuid)');")"
          test "$actual" = "t|search_path=pg_catalog|f|t|f"
      - name: Bind synthetic operator allowlist
        run: echo "ADMIN_EMAILS=pooled-qa-${"${GITHUB_RUN_ID}"}-operator@example.test" >> "$GITHUB_ENV"
      - name: Build exact QA runtime
        run: npm run build
      - name: Start exact QA runtime
        run: |
          set -euo pipefail
          npm run start -- -p 3215 > /tmp/issue-723-next.log 2>&1 &
          for attempt in $(seq 1 60); do
            if curl --fail --silent --show-error http://127.0.0.1:3215/ >/dev/null; then exit 0; fi
            sleep 2
          done
          tail -200 /tmp/issue-723-next.log
          exit 1
      - name: Execute all 19 authenticated QA scenarios
        run: node ${integrationRunnerPath}
      - name: Scan retained evidence for configured secret values
        if: always()
        shell: bash
        run: |
          set -euo pipefail
          if test -d issue-723-clean-authenticated-evidence; then
            for name in QA_SUPABASE_PUBLISHABLE_KEY QA_SUPABASE_SERVICE_ROLE_KEY QA_SUPABASE_DB_URL QA_TEST_PASSWORD QA_STRIPE_SECRET_KEY QA_STRIPE_PUBLISHABLE_KEY QA_STRIPE_WEBHOOK_SECRET QA_EVERY_ORG_WEBHOOK_TOKEN QA_EVERY_ORG_WEBHOOK_PATH_SECRET QA_EVERY_ORG_PARTNER_METADATA_SECRET; do
              value="${!name:-}"
              if test -n "$value" && grep -R -F -q "$value" issue-723-clean-authenticated-evidence; then
                echo "Secret value appeared in authenticated evidence: $name" >&2
                exit 1
              fi
            done
          fi
      - name: Upload authenticated evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: issue-723-clean-authenticated-qa-${"${{ github.run_id }}"}
          path: issue-723-clean-authenticated-evidence/
          if-no-files-found: error
          retention-days: 14
`;
}

function createStackCandidate(repoDir, product, lifecycle) {
  git(["fetch", "--no-tags", "--force", "origin", `${pr700Branch}:refs/remotes/origin/${pr700Branch}`], repoDir, false);
  assert.equal(git(["rev-parse", `refs/remotes/origin/${pr700Branch}`], repoDir, true), pr700Head, "PR #700 head moved.");
  const dir = mkdtempSync(join(tmpdir(), "issue723-stack-"));
  git(["worktree", "add", "--detach", dir, pr700Head], repoDir, false);
  git(["switch", "-c", stackBranch], dir, false);

  write(join(dir, actionPath), patchAuthenticatedCaller(readFileSync(join(dir, actionPath), "utf8")));
  write(join(dir, testPath), readFileSync(join(product.dir, testPath), "utf8"));
  write(join(dir, migrationPath), readFileSync(join(product.dir, migrationPath), "utf8"));
  write(join(dir, integrationContractPath), integrationContractSource(product.head, productBranch, lifecycle.finalizeArgs, lifecycle.confirmArgs));
  write(join(dir, integrationRunnerPath), integrationRunnerSource());
  write(join(dir, integrationTestPath), integrationTestSource(product.head));
  write(join(dir, integrationWorkflowPath), integrationWorkflowSource(product.head, productBranch, stackBranch));

  run("git", ["diff", "--check"], { cwd: dir });
  assertExactPaths(listDiff(pr700Head, dir), stackPaths, "Stacked QA candidate");
  git(["config", "user.name", "github-actions[bot]"], dir, false);
  git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], dir, false);
  git(["add", "-A"], dir, false);
  git(["commit", "-m", "Stack authenticated confirmation repair with canonical milestone QA"], dir, false);
  const head = git(["rev-parse", "HEAD"], dir, true);
  assert.equal(git(["rev-parse", "HEAD^"], dir, true), pr700Head, "Stacked candidate must have exact PR #700 sole parent.");

  run("npm", ["ci"], { cwd: dir });
  run("node", ["--test", ".github/scripts/pooled-settlement-qa-e2e.test.mjs", integrationTestPath], { cwd: dir });
  run("node", ["--import", "tsx", "--test", testPath, "src/lib/trade-donation-pool.test.ts", "src/lib/trade-donation-pool-source-contract.test.ts"], { cwd: dir });
  assert.equal(git(["status", "--porcelain"], dir, true), "", "Stacked candidate changed during prepublication verification.");
  git(["push", "-u", "origin", `HEAD:${stackBranch}`], dir, false);
  const body = [
    "## Purpose",
    "",
    "Clean one-commit replacement for historical draft PR #750.",
    "",
    `- exact base / sole parent: \`${pr700Head}\``,
    `- exact head: \`${head}\``,
    `- exact product source: \`${product.head}\``,
    "- changed files: exactly seven",
    "- separately authenticated participant sessions",
    "- unauthenticated, actor-mismatched, and service-role denials",
    "- canonical milestone-manifest finalization and bilateral review before donation confirmation",
    "- complete 19-case isolated-QA matrix and zero-residue cleanup required by the permanent exact-head workflow",
    "",
    "**Draft and unmerged.** No production migration, deployment, alias, feature flag, live provider action, Every.org donation, or real-fund movement is authorized.",
  ].join("\n");
  const url = gh(["pr", "create", "--draft", "--base", pr700Branch, "--head", stackBranch, "--title", "Clean issue 723 authenticated pooled-settlement QA candidate", "--body", body], true);
  return { dir, head, prNumber: Number(url.split("/").pop()) };
}

function waitForExactHeadWorkflow(stack) {
  const started = Date.now();
  let latestRun = null;
  while (Date.now() - started < 95 * 60 * 1000) {
    const response = ghJson([
      "api",
      "-X",
      "GET",
      `repos/${repo}/actions/runs`,
      "-f",
      `branch=${stackBranch}`,
      "-f",
      "per_page=100",
    ]);
    const runs = (response?.workflow_runs || [])
      .filter((runItem) => runItem.head_sha === stack.head && runItem.path === integrationWorkflowPath)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    latestRun = runs.at(-1) || null;
    if (latestRun?.status === "completed") break;
    run("sleep", ["15"], { capture: false });
  }
  assert.ok(latestRun, "Exact-head candidate workflow did not appear.");
  if (latestRun.status !== "completed" || latestRun.conclusion !== "success") {
    let logs = "";
    try { logs = gh(["run", "view", String(latestRun.id), "--log-failed"], true); } catch (error) { logs = String(error); }
    const excerpt = sanitize(logs).split("\n").slice(-180).join("\n");
    const body = [
      "## Clean issue #723 candidate failed exact-head QA",
      "",
      `- clean PR: #${stack.prNumber}`,
      `- exact head: \`${stack.head}\``,
      `- workflow run: ${latestRun.id}`,
      `- conclusion: \`${latestRun.conclusion || latestRun.status}\``,
      "",
      "Sanitized failed-log tail:",
      "",
      "```text",
      excerpt,
      "```",
      "",
      "No production or real-money action occurred.",
    ].join("\n");
    comment([723, 750, stack.prNumber], body);
    throw new Error(`Exact-head QA failed in run ${latestRun.id}.`);
  }

  const jobsResponse = ghJson(["api", "-X", "GET", `repos/${repo}/actions/runs/${latestRun.id}/jobs`, "-f", "per_page=100"]);
  const jobs = jobsResponse?.jobs || [];
  const sourceJob = jobs.find((job) => job.name === "Exact stacked source and fail-closed preflight" && job.conclusion === "success");
  const matrixJob = jobs.find((job) => job.name === "Authenticated 19-case matrix with caller repair" && job.conclusion === "success");
  assert.ok(sourceJob && matrixJob, "Exact-head workflow lacked successful source or matrix job.");
  const artifactResponse = ghJson(["api", "-X", "GET", `repos/${repo}/actions/runs/${latestRun.id}/artifacts`, "-f", "per_page=100"]);
  const artifact = (artifactResponse?.artifacts || []).find((item) => !item.expired && item.name.startsWith("issue-723-clean-authenticated-qa-"));
  assert.ok(artifact, "Authenticated exact-head evidence artifact was not retained.");
  return { run: latestRun, sourceJob, matrixJob, artifact };
}

function main() {
  const repoDir = process.cwd();
  const lifecycle = queryLifecycleFunctions(repoDir);
  const product = createProductCandidate(repoDir);
  const stack = createStackCandidate(repoDir, product, lifecycle);
  const evidence = waitForExactHeadWorkflow(stack);

  const body = [
    "## Issue #723 clean exact-head QA completion",
    "",
    `- clean product PR: #${product.prNumber}`,
    `- product head: \`${product.head}\``,
    `- product sole parent: \`${product.mainHead}\``,
    `- clean stacked QA PR: #${stack.prNumber}`,
    `- stacked head: \`${stack.head}\``,
    `- stacked sole parent: \`${pr700Head}\``,
    `- exact-head workflow run: ${evidence.run.id}`,
    `- source/preflight job: ${evidence.sourceJob.id} — success`,
    `- authenticated 19-case job: ${evidence.matrixJob.id} — success`,
    `- sanitized authenticated evidence artifact: ${evidence.artifact.id}`,
    "",
    "The exact-head run proved the cookie-bound authenticated confirmation boundary, authenticated-only RPC privileges, unauthenticated/actor-mismatched/service-role denials, canonical milestone-manifest finalization and bilateral review, all 19 pooled-settlement scenarios, balanced-ledger and atomic-activation contracts, cleanup, and zero current-run residue.",
    "",
    "Historical PRs #745 and #750 are superseded evidence only. No production database, migration, deployment, alias, feature flag, live Stripe/Every.org rail, Every.org donation, or real funds were touched. All product and QA PRs remain draft and unmerged; this evidence does not authorize merge or production release.",
  ].join("\n");
  comment([723, 745, 750, 700, 208, product.prNumber, stack.prNumber], body);

  writeFileSync("/tmp/issue-723-final.json", JSON.stringify({
    productPr: product.prNumber,
    productHead: product.head,
    productBase: product.mainHead,
    stackPr: stack.prNumber,
    stackHead: stack.head,
    stackBase: pr700Head,
    runId: evidence.run.id,
    sourceJobId: evidence.sourceJob.id,
    matrixJobId: evidence.matrixJob.id,
    artifactId: evidence.artifact.id,
  }, null, 2));
}

try {
  main();
} catch (error) {
  const message = sanitize(error?.stack || error);
  try {
    comment([723], `## Issue #723 convergence controller stopped fail-closed\n\n\`\`\`text\n${message.slice(-12000)}\n\`\`\`\n\nNo production or real-money action was authorized.`);
  } catch {}
  throw error;
}
