// Exact-head rerun trigger after participant UI truth-boundary alignment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTHENTICATED_CONFIRMATION_MIGRATION,
  CONFIRMATION_SIGNATURE,
  INTEGRATION_PATHS,
  PR700_HEAD,
  PRODUCT_REPAIR_HEAD,
  QA_PROJECT_REF,
  buildAuthenticatedHarnessSource,
} from "./pooled-settlement-authenticated-caller-integration-contract.mjs";
import { alignParticipantUiTruthCopy } from "./pooled-settlement-authenticated-caller-integration.mjs";

const original = readFileSync(".github/scripts/pooled-settlement-qa-e2e.mjs", "utf8");
const workflow = readFileSync(
  ".github/workflows/pooled-settlement-authenticated-caller-integration-20260817.yml",
  "utf8",
);

test("the stacked integration is pinned to exact PR #700 and corrected product-repair identities", () => {
  assert.equal(PR700_HEAD, "813573f64eaa17d2ca240c50f76ead9a3b535f97");
  assert.equal(PRODUCT_REPAIR_HEAD, "495f714b6dd4753ad78cf3d41945cffc84923876");
  assert.equal(QA_PROJECT_REF, "hvmxfjjbdcgjjudmthdz");
  assert.equal(INTEGRATION_PATHS.length, 7);
  assert.ok(INTEGRATION_PATHS.includes(AUTHENTICATED_CONFIRMATION_MIGRATION));
});

test("the generated harness creates route-complete run-owned profiles and uses the canonical content root", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /function qaUsername\(role\)/);
  assert.match(generated, /return "pq-" \+ sha256\(runId \+ ":" \+ role\)\.slice\(0, 20\)/);
  assert.match(generated, /username:\s*qaUsername\(role\)/);
  assert.match(generated, /const stage = page\.locator\("#main-content"\)/);
  assert.doesNotMatch(generated, /const stage = page\.locator\("main"\)/);
});

test("the generated participant UI check follows the current live-trade truth boundary", () => {
  const generated = alignParticipantUiTruthCopy(
    buildAuthenticatedHarnessSource(original),
  );
  assert.match(generated, /await expectText\(stage, \/Trade is live\\\.\/i\);/);
  assert.match(
    generated,
    /await expectText\(stage, \/Both participants confirmed the same immutable version\\\.\/i\);/,
  );
  assert.match(
    generated,
    /await expectText\(stage, \/Moral Trade does not hold funds\\\.\/i\);/,
  );
  assert.doesNotMatch(generated, /The pooled donation is the activation gate/);
  assert.doesNotMatch(generated, /presumptive provider-facing donor of record/);
});

test("participant UI copy alignment fails closed if the obsolete assertion block drifts", () => {
  const generated = buildAuthenticatedHarnessSource(original).replace(
    "The pooled donation is the activation gate",
    "drifted pooled activation copy",
  );
  assert.throws(
    () => alignParticipantUiTruthCopy(generated),
    /participant UI truth-boundary copy: expected source contract was not found/,
  );
});

test("the generated harness finalizes the canonical milestone manifest before valid confirmations", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /create_trade_agreement_milestone_v1/);
  assert.match(generated, /finalize_trade_milestone_manifest_v1/);
  assert.match(generated, /p_performer_id:\s*counterparty\.id/);
  assert.match(generated, /p_payer_id:\s*payer\.id/);
  assert.match(generated, /p_maximum_amount_cents:\s*0/);
  assert.match(generated, /milestone_manifest_hash/);
  assert.doesNotMatch(
    generated,
    /admin\.from\("trade_agreement_milestones"\)\.insert/,
  );
  const finalizeCall = generated.indexOf(
    "  await ensureFinalMilestoneManifest({ counterparty, payer, agreement, version, label });",
  );
  const confirmationCall = generated.indexOf(
    "    await confirmAsAuthenticatedParticipant(actor, agreement.id, version.id, label);",
  );
  assert.ok(finalizeCall >= 0, "The manifest preparation call is missing.");
  assert.ok(
    confirmationCall > finalizeCall,
    "Bilateral confirmation must happen only after the immutable milestone manifest is finalized.",
  );
});

test("the generated harness cleans run-owned milestone rows before versions and auth users", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  const milestoneDelete = generated.indexOf(
    "delete from public.trade_agreement_milestones where agreement_id = any(${agreementIds});",
  );
  const versionDelete = generated.indexOf(
    "delete from public.trade_agreement_versions where agreement_id = any(${agreementIds});",
  );
  const authDelete = generated.indexOf("admin.auth.admin.deleteUser(userId)");
  assert.ok(milestoneDelete >= 0, "Run-owned milestone cleanup is missing.");
  assert.ok(versionDelete > milestoneDelete, "Milestones must be deleted before their agreement versions.");
  assert.ok(authDelete > versionDelete, "Database rows must be removed before synthetic Auth users.");
  assert.doesNotMatch(
    generated,
    /delete from public\.trade_agreement_milestones\s*;/,
  );
});

test("the generated harness confirms through each participant's real authenticated session", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /auth\.signInWithPassword/);
  assert.match(generated, /auth\.getUser\(\)/);
  assert.match(generated, /identity\.user\?\.id,\s*user\.id/);
  assert.match(generated, /confirmAsAuthenticatedParticipant/);
  assert.match(
    generated,
    /await confirmAsAuthenticatedParticipant\(actor, agreement\.id, version\.id, label\)/,
  );
  assert.doesNotMatch(
    generated,
    /for \(const actor of \[counterparty, payer\]\) \{\s*unwrap\(\s*await admin\.rpc\("confirm_trade_donation_version_v2"/s,
  );
});

test("the generated harness proves negative authorization paths before valid confirmations", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /Unauthenticated confirmation/);
  assert.match(generated, /Actor-mismatched confirmation/);
  assert.match(generated, /Service-role confirmation/);
  assert.match(generated, /p_actor_id:\s*payer\.id/);
  assert.match(generated, /await admin\.rpc\("confirm_trade_donation_version_v2"/);
  assert.match(generated, /confirmationBoundaryProbed = true/);
});

test("the generated database audit requires authenticated-only execute privilege", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, new RegExp(CONFIRMATION_SIGNATURE.replace(/[()]/g, "\\$&")));
  assert.match(generated, /\["t", "search_path=pg_catalog", "f", "t", "f"\]/);
  assert.match(generated, /authenticatedExecute:\s*true/);
  assert.match(generated, /serviceRoleExecute:\s*false/);
});

test("source transformation fails closed if the old service-role confirmation block drifts", () => {
  const drifted = original.replace(
    'await admin.rpc("confirm_trade_donation_version_v2"',
    'await admin.rpc("drifted_confirmation_rpc"',
  );
  assert.throws(
    () => buildAuthenticatedHarnessSource(drifted),
    /bilateral participant confirmations: expected source contract was not found/,
  );
});

test("the stacked workflow is QA-only, seven-file-scoped, and applies the forward migration", () => {
  assert.match(workflow, new RegExp(PR700_HEAD));
  assert.match(workflow, new RegExp(PRODUCT_REPAIR_HEAD));
  assert.match(workflow, new RegExp(QA_PROJECT_REF));
  for (const path of INTEGRATION_PATHS) {
    assert.match(workflow, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(
    workflow,
    /psql "\$QA_SUPABASE_DB_URL"[\s\S]*--file "\$AUTH_MIGRATION_PATH"/,
  );
  assert.match(workflow, /pooled-settlement-authenticated-caller-integration\.mjs/);
  assert.match(workflow, /git merge-base --is-ancestor "\$PR700_HEAD" HEAD/);
  assert.doesNotMatch(workflow, /jnpoxvalyjtdghnperyu/);
  assert.doesNotMatch(workflow, /sk_live_|pk_live_|rk_live_/);
});
