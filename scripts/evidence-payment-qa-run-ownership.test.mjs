import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EVIDENCE_PAYMENT_QA_REF,
  buildEvidencePaymentQaNamespace,
} from "./evidence-payment-qa-namespace.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const PATHS = {
  workflow: ".github/workflows/evidence-payment-release-qa.yml",
  generator: "scripts/evidence-payment-qa-namespace.mjs",
  generatorTest: "scripts/evidence-payment-qa-namespace.test.mjs",
  contractTest: "scripts/evidence-payment-qa-run-ownership.test.mjs",
  twoWriter: "scripts/evidence-payment-qa-two-writer.mjs",
  preflight: "supabase/tests/evidence_weighted_payment_browser_preflight.sql",
  fixture: "supabase/tests/evidence_weighted_payment_browser_fixture.sql",
  cleanup: "supabase/tests/evidence_weighted_payment_browser_cleanup.sql",
  browser: "tests/evidence-weighted-payment-authenticated.spec.ts",
};

const sources = Object.fromEntries(
  Object.entries(PATHS).map(([name, path]) => [name, read(path)]),
);

const OLD_FIXED_EMAILS = [
  "evidence-payment-payer@qa.invalid",
  "evidence-payment-payee@qa.invalid",
  "evidence-payment-reviewer@qa.invalid",
  "evidence-payment-appeal-reviewer@qa.invalid",
  "evidence-payment-outsider@qa.invalid",
  "evidence-payment-admin@qa.invalid",
];

const OLD_FIXED_IDS = Array.from({ length: 7 }, (_, index) =>
  `${71 + index}000000-0000-4000-8000-000000000001`,
);

const input = (runId, runAttempt = "1") => ({
  repository: "ghuser29384/Website2",
  workflowRef:
    "ghuser29384/Website2/.github/workflows/evidence-payment-release-qa.yml@refs/pull/721/merge",
  runId,
  runAttempt,
  qaRef: EVIDENCE_PAYMENT_QA_REF,
});

function allOwnedValues(manifest) {
  return new Set([
    ...Object.values(manifest.roles).flatMap(({ id, email }) => [id, email]),
    ...Object.values(manifest.objects),
  ]);
}

test("current revisions use one repository-global queue while run ownership remains primary", () => {
  const workflow = sources.workflow;
  assert.match(
    workflow,
    /group:\s*evidence-payment-release-qa-\$\{\{ github\.repository \}\}/,
  );
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.doesNotMatch(
    workflow,
    /group:[^\n]*(pull_request\.number|github\.ref|run_id|run_attempt|event_name)/,
  );
  assert.match(workflow, /Stale branches can retain older YAML and opt out/);
  assert.match(workflow, /primary safety[\s\S]*run-owned namespace/);

  const deriveIndex = workflow.indexOf(
    "Derive the run-owned fixture namespace before mutation",
  );
  const fixtureIndex = workflow.indexOf(
    "Preflight and create run-owned authenticated fixtures",
  );
  assert.ok(deriveIndex >= 0 && fixtureIndex > deriveIndex);
  assert.match(
    workflow,
    /Remove only this run's fixtures and prove zero residue[\s\S]*if:\s*always\(\)/,
  );
  assert.match(workflow, /id:\s*namespace/);
  assert.match(workflow, /print\(f"handle=\{manifest\['namespace'\]\['handle'\]\}"\)/);
  assert.match(
    workflow,
    /node scripts\/evidence-payment-qa-namespace\.mjs[\s\S]*--github-env "\$cleanup_env"/,
  );
  assert.match(workflow, /steps\.namespace\.outputs\.handle/);
  assert.match(workflow, /scripts\/evidence-payment-qa-two-writer\.mjs/);
  assert.match(workflow, /Run deterministic two-writer Auth and database isolation proof/);
});

test("every persistent fixture identity is parameterized and legacy fixed identities are absent", () => {
  const protectedSources = [
    sources.workflow,
    sources.preflight,
    sources.fixture,
    sources.cleanup,
    sources.browser,
  ].join("\n");

  for (const legacyEmail of OLD_FIXED_EMAILS) {
    assert.doesNotMatch(protectedSources, new RegExp(legacyEmail.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(
    protectedSources,
    /\b(?:71000000|72000000|73000000|74000000|75000000|76000000|77000000)-/,
  );

  const manifest = buildEvidencePaymentQaNamespace(input("31900000001"));
  const requiredEnvironmentNames = new Set(
    [...sources.preflight.matchAll(/\\getenv\s+\S+\s+(EVIDENCE_PAYMENT_QA_[A-Z0-9_]+)/g)].map(
      (match) => match[1],
    ),
  );
  for (const environmentName of requiredEnvironmentNames) {
    assert.ok(
      Object.hasOwn(manifest.environment, environmentName),
      `namespace generator is missing ${environmentName}`,
    );
  }

  assert.match(sources.browser, /function fixtureEnv\(name: string, pattern: RegExp\)/);
  assert.match(sources.browser, /EVIDENCE_PAYMENT_QA_PAYER_ID/);
  assert.match(sources.browser, /EVIDENCE_PAYMENT_QA_ADMIN_EMAIL/);
  assert.doesNotMatch(sources.browser, /const IDS\s*=\s*\{[^}]*"[0-9a-f]{8}-/s);
  assert.doesNotMatch(sources.browser, /const EMAILS\s*=\s*\{[^}]*@qa\.invalid/s);
});

test("fixture creation fails closed instead of discovering, replacing, or cleaning another run", () => {
  const fixture = sources.fixture;
  const preflight = sources.preflight;

  assert.match(fixture, /^\\set ON_ERROR_STOP on\n\\ir evidence_weighted_payment_browser_preflight\.sql/m);
  assert.match(preflight, /Refusing a non-QA Evidence-payment target/);
  assert.match(preflight, /namespace collision or residue/);
  assert.match(preflight, /where id = any\(manifest\.user_ids\) or email = any\(manifest\.emails\)/);
  assert.match(preflight, /'authMfaChallenges'/);
  assert.match(preflight, /'authMfaAmrClaims'/);
  assert.match(preflight, /'bundleItems'/);
  assert.match(preflight, /'paymentReviewerNominations'/);
  assert.match(preflight, /'paymentReviewDecisions'/);
  assert.match(preflight, /'paymentAppeals'/);
  assert.match(preflight, /'paymentAppealReviewerNominations'/);
  assert.match(preflight, /'events'/);
  assert.match(preflight, /'threads'/);
  assert.match(preflight, /'messages'/);
  assert.doesNotMatch(fixture, /\bon conflict\b/i);
  assert.doesNotMatch(fixture, /\bdelete\s+from\b/i);
  assert.doesNotMatch(fixture, /order\s+by\s+(?:id|created_at|email|display_name)/i);
  assert.doesNotMatch(fixture, /limit\s+[1-9]/i);
  assert.doesNotMatch(fixture, /first[-_ ]?(?:six|payer|reviewer)/i);
  assert.doesNotMatch(fixture, /like\s+'(?:evidence-payment|epqa)-%'/i);
  assert.match(fixture, /'qa_namespace',\s*:'qa_namespace_handle'/);
  assert.match(fixture, /'qa_namespace_sha256',\s*:'qa_namespace_hash'/);
  assert.match(fixture, /provider_reference = 'qa-admin-fallback-' \||| :'qa_namespace_handle'/);
});

test("cleanup is exact-ID scoped, ownership-checked, idempotent, and machine-readable", () => {
  const cleanup = sources.cleanup;

  assert.match(cleanup, /Cleanup ownership check failed for an Auth user/);
  assert.match(cleanup, /raw_user_meta_data->>'qa_namespace'/);
  assert.match(cleanup, /raw_user_meta_data->>'qa_namespace_sha256'/);
  assert.match(cleanup, /qa_evidence_payment_actor_manifest[\s\S]*on commit preserve rows/);
  assert.match(cleanup, /qa_browser_cleanup_payment_cases[\s\S]*on commit preserve rows/);
  assert.match(cleanup, /qa_browser_cleanup_payment_appeals[\s\S]*on commit preserve rows/);
  assert.match(cleanup, /qa_browser_cleanup_mfa_factors[\s\S]*on commit preserve rows/);
  assert.match(cleanup, /qa_browser_cleanup_auth_sessions[\s\S]*on commit preserve rows/);
  assert.match(cleanup, /delete from auth\.users[\s\S]*qa_evidence_payment_actor_manifest/);
  assert.match(cleanup, /delete from auth\.identities[\s\S]*qa_evidence_payment_actor_manifest/);
  assert.match(cleanup, /delete from auth\.sessions[\s\S]*qa_evidence_payment_actor_manifest/);
  assert.match(cleanup, /delete from auth\.refresh_tokens[\s\S]*qa_evidence_payment_actor_manifest/);
  assert.match(cleanup, /delete from auth\.mfa_factors[\s\S]*qa_evidence_payment_actor_manifest/);
  assert.match(cleanup, /delete from auth\.mfa_challenges[\s\S]*qa_browser_cleanup_mfa_factors/);
  assert.match(cleanup, /delete from auth\.mfa_amr_claims[\s\S]*qa_browser_cleanup_auth_sessions/);
  assert.match(cleanup, /delete from public\.trade_payment_reviewer_nominations/);
  assert.match(cleanup, /delete from public\.trade_payment_review_decisions/);
  assert.match(cleanup, /delete from public\.trade_payment_appeal_reviewer_nominations/);
  assert.match(cleanup, /delete from public\.trade_evidence_bundle_items/);
  assert.match(cleanup, /delete from public\.trade_messages/);
  assert.match(cleanup, /delete from public\.trade_threads/);
  assert.doesNotMatch(cleanup, /banned_until\s*=/i);
  assert.doesNotMatch(cleanup, /like\s+'(?:evidence-payment|epqa)-%'/i);
  assert.doesNotMatch(cleanup, /role\s*=\s*'(?:payer|payee|reviewer|administrator)'/i);
  assert.match(cleanup, /'paymentReviewerNominations'/);
  assert.match(cleanup, /'paymentReviewDecisions'/);
  assert.match(cleanup, /'paymentAppeals'/);
  assert.match(cleanup, /'paymentAppealReviewerNominations'/);
  assert.match(cleanup, /'authMfaChallenges'/);
  assert.match(cleanup, /'authMfaAmrClaims'/);
  assert.match(cleanup, /'messages'/);
  assert.match(cleanup, /'threads'/);
  assert.match(cleanup, /'allZero', all_zero/);
  assert.match(cleanup, /where value::integer <> 0/);
  assert.match(cleanup, /\\quit 1/);
});

test("release artifacts retain stderr and the structured two-writer report", () => {
  const workflow = sources.workflow;

  assert.match(workflow, /ruby -e "require 'yaml'/);
  assert.match(
    workflow,
    /evidence_weighted_payment_lifecycle\.sql[\s\S]*2>&1 \| tee evidence-payment-lifecycle\.log/,
  );
  assert.match(
    workflow,
    /evidence-payment-qa-two-writer\.mjs[\s\S]*2>&1 \| tee evidence-payment-two-writer\.log/,
  );
  assert.match(
    workflow,
    /evidence_weighted_payment_browser_fixture\.sql[\s\S]*2>&1 \| tee evidence-payment-fixture\.log/,
  );
  assert.match(
    workflow,
    /evidence_weighted_payment_browser_cleanup\.sql[\s\S]*2>&1 \| tee evidence-payment-cleanup\.log/,
  );
  assert.match(workflow, /evidence-payment-two-writer\.json/);
});

test("two run namespaces and the actual stale fixed-identity cleanup sets are disjoint", () => {
  const namespaceA = buildEvidencePaymentQaNamespace(input("31900000011", "1"));
  const namespaceB = buildEvidencePaymentQaNamespace(input("31900000012", "1"));
  const ownedA = allOwnedValues(namespaceA);
  const ownedB = allOwnedValues(namespaceB);
  const staleFixed = new Set([...OLD_FIXED_EMAILS, ...OLD_FIXED_IDS]);

  for (const value of ownedA) {
    assert.equal(ownedB.has(value), false, `namespace B collides with A on ${value}`);
    assert.equal(staleFixed.has(value), false, `stale fixed cleanup can select A value ${value}`);
  }
  for (const value of ownedB) {
    assert.equal(staleFixed.has(value), false, `stale fixed cleanup can select B value ${value}`);
  }

  const simulatedStore = new Set([...staleFixed, ...ownedA, ...ownedB]);
  for (const value of staleFixed) simulatedStore.delete(value);
  for (const value of ownedA) assert.equal(simulatedStore.has(value), true);
  for (const value of ownedB) assert.equal(simulatedStore.has(value), true);

  for (const value of ownedA) simulatedStore.delete(value);
  for (const value of ownedA) assert.equal(simulatedStore.has(value), false);
  for (const value of ownedB) assert.equal(simulatedStore.has(value), true);
});

test("the live two-writer proof interleaves Auth, database, stale-style, and cleanup boundaries", () => {
  const proof = sources.twoWriter;

  assert.match(proof, /manifestFor\("a"\)/);
  assert.match(proof, /manifestFor\("b"\)/);
  assert.match(proof, /namespace A fixture/);
  assert.match(proof, /namespace B fixture/);
  assert.match(proof, /authenticateNamespace\(namespaceA/);
  assert.match(proof, /authenticateNamespace\(namespaceB/);
  assert.match(proof, /proveAuthorization\(actorsA, actorsB\)/);
  assert.match(proof, /namespace A cleanup/);
  assert.match(proof, /B after A cleanup/);
  assert.match(proof, /namespace A idempotent cleanup/);
  assert.match(proof, /freshPasswordSignIns/);
  assert.match(proof, /namespace B cleanup/);
  assert.match(proof, /final-zero-residue/);
  assert.match(proof, /e0ed0d206687dae17882260313152846b2d2bd22/);
  assert.match(proof, /STALE_USER_IDS/);
  assert.match(proof, /STALE_AGREEMENT_IDS/);
  assert.match(proof, /liveRunOwnedUsersMatchingStaleIds/);
  assert.match(proof, /emergency cleanup/);
  assert.match(proof, /evidence-payment-two-writer\.json/);
  assert.doesNotMatch(proof, /console\.log\([^)]*(password|secret|access_token|refresh_token)/i);
});

test("repository-only sources contain no credential material or unsafe global fixture selectors", () => {
  const combined = [
    sources.workflow,
    sources.generator,
    sources.preflight,
    sources.fixture,
    sources.cleanup,
    sources.browser,
    sources.twoWriter,
  ].join("\n");
  assert.doesNotMatch(combined, /(?:sk_live|sk_test|service_role|postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@)/i);
  assert.doesNotMatch(combined, /select[\s\S]{0,120}from public\.profiles[\s\S]{0,120}order by[\s\S]{0,80}limit\s+6/i);
  assert.doesNotMatch(combined, /count\(\*\)[\s\S]{0,120}from public\.trade_(?:evidence|payment)[^\n;]*;(?![\s\S]*where)/i);
  assert.match(sources.workflow, /QA_SUPABASE_DB_URL:\s*\$\{\{ secrets\.QA_SUPABASE_DB_URL \}\}/);
});
