import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTHENTICATED_CONFIRMATION_MIGRATION,
  CLEAN_STACK_HEAD,
  CONFIRMATION_SIGNATURE,
  CONTEXT_READ_REPAIR_HEAD,
  INTEGRATION_PATHS,
  OPERATOR_UI_REPAIR_HEAD,
  PR700_HEAD,
  PRODUCT_REPAIR_HEAD,
  QA_PROJECT_REF,
  REQUIRED_MILESTONE_LIFECYCLE_FUNCTIONS,
  STRIPE_GATE_REPAIR_HEAD,
  buildAuthenticatedHarnessSource,
} from "./pooled-settlement-authenticated-caller-integration-contract.mjs";

const original = readFileSync(".github/scripts/pooled-settlement-qa-e2e.mjs", "utf8");
const workflow = readFileSync(
  ".github/workflows/pooled-settlement-authenticated-caller-integration-20260817.yml",
  "utf8",
);

test("the stacked QA candidate is pinned to the clean stack and all product repairs", () => {
  assert.equal(PR700_HEAD, "813573f64eaa17d2ca240c50f76ead9a3b535f97");
  assert.equal(PRODUCT_REPAIR_HEAD, "495f714b6dd4753ad78cf3d41945cffc84923876");
  assert.equal(CLEAN_STACK_HEAD, "a67878590380f45af704ddd3e643ef1a135015f7");
  assert.equal(CONTEXT_READ_REPAIR_HEAD, "ff2e94db6dffc0a2fe9e665733ad15e3fd26026d");
  assert.equal(OPERATOR_UI_REPAIR_HEAD, "a1f774eef872464528249d9e64a1d7d4466e7f2e");
  assert.equal(STRIPE_GATE_REPAIR_HEAD, "a3e11dab82d4edd235bef69ec5e90e3eb21f7e66");
  assert.equal(QA_PROJECT_REF, "hvmxfjjbdcgjjudmthdz");
  assert.deepEqual(REQUIRED_MILESTONE_LIFECYCLE_FUNCTIONS, [
    "finalize_trade_milestone_manifest_v1",
  ]);
  assert.equal(INTEGRATION_PATHS.length, 14);
  assert.ok(INTEGRATION_PATHS.includes(AUTHENTICATED_CONFIRMATION_MIGRATION));
});

test("the generated harness creates route-complete run-owned profiles and uses the canonical content root", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /function qaUsername\(role\)/);
  assert.match(generated, /return "pq-" \+ sha256\(runId \+ ":" \+ role\)\.slice\(0, 20\)/);
  assert.match(generated, /username:\s*qaUsername\(role\)/);
  assert.match(generated, /const stage = page\.locator\("#main-content"\)/);
  assert.equal((generated.match(/page\.locator\("#main-content"\)/g) ?? []).length, 4);
  assert.doesNotMatch(generated, /page\.locator\("main"\)/);
});

test("content-root generation fails closed if any later participant or operator locator drifts", () => {
  const drifted = original.replace(
    'await expectText(page.locator("main"), /immutable provider bundle|frozen bundle/i);',
    'await expectText(page.locator("section"), /immutable provider bundle|frozen bundle/i);',
  );
  assert.throws(
    () => buildAuthenticatedHarnessSource(drifted),
    /remaining canonical participant and operator content roots: expected 3 source contracts but found 2/,
  );
});

test("the frozen participant check uses current semantic copy and captures evidence first", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /const frozenStage = page\.locator\("#main-content"\)/);
  assert.match(generated, /await expectText\(frozenStage, \/Bundle Frozen\/i\)/);
  assert.match(generated, /await expectText\(frozenStage, \/This allocation is immutable\/i\)/);
  assert.doesNotMatch(generated, /immutable provider bundle\|frozen bundle/);
  const screenshot = generated.indexOf('await screenshot(page, "participant-mobile-frozen.png")');
  const semanticAssertion = generated.indexOf("await expectText(frozenStage, /Bundle Frozen/i)");
  assert.ok(screenshot >= 0, "The frozen participant screenshot is missing.");
  assert.ok(semanticAssertion > screenshot, "The frozen screenshot must precede semantic assertions.");
});

test("frozen participant generation fails closed if the stale source contract drifts", () => {
  const drifted = original.replace(
    "/immutable provider bundle|frozen bundle/i",
    "/drifted frozen copy/i",
  );
  assert.throws(
    () => buildAuthenticatedHarnessSource(drifted),
    /frozen participant semantic assertions and pre-assertion screenshot: expected source contract was not found/,
  );
});

test("browser MFA awaits the server action, captures its state, and proves cookie persistence", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /page\.waitForResponse\(/);
  assert.match(generated, /response\.request\(\)\.headers\(\)\["next-action"\]/);
  assert.match(generated, /operator-mfa-step-up\.png/);
  assert.match(generated, /Browser MFA verification failed closed/);
  assert.doesNotMatch(
    generated,
    /page\.waitForLoadState\("domcontentloaded"\)[\s\S]*?Verify session/,
  );
  const response = generated.indexOf("const verificationResponsePromise = page.waitForResponse(");
  const click = generated.indexOf('form.getByRole("button", { name: "Verify session" }).click()', response);
  const screenshot = generated.indexOf('await screenshot(page, "operator-mfa-step-up.png")', click);
  const error = generated.indexOf("Browser MFA verification failed closed", screenshot);
  const reload = generated.indexOf("await page.reload()", error);
  const aal2 = generated.indexOf("/Session level\\s*aal2|AAL:\\s*aal2/i", reload);
  assert.ok(response >= 0, "The browser MFA server-action response boundary is missing.");
  assert.ok(click >= 0, "The browser MFA submission is missing.");
  assert.ok(screenshot > click, "The browser MFA evidence must follow submission.");
  assert.ok(error > screenshot, "The browser MFA error boundary must follow evidence capture.");
  assert.ok(reload > error, "The browser must reload only after action diagnostics pass.");
  assert.ok(aal2 > reload, "The AAL2 assertion must follow the reloaded session.");
});

test("browser MFA generation fails closed if the old submission contract drifts", () => {
  const drifted = original.replace(
    '    page.waitForLoadState("domcontentloaded"),',
    '    page.waitForLoadState("networkidle"),',
  );
  assert.throws(
    () => buildAuthenticatedHarnessSource(drifted),
    /browser MFA server-action completion boundary: expected source contract was not found/,
  );
});

test("the generated participant UI check requires the pooled funding boundary", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(
    generated,
    /await expectText\(stage, \/The pooled donation is the activation gate\/i\);/,
  );
  assert.match(
    generated,
    /await expectText\(stage, \/presumptive provider-facing donor of record\/i\);/,
  );
  assert.match(generated, /input\[name="pooled_disclosures"\][\s\S]*?waitFor/);
  assert.match(generated, /participant-ui-readiness-\$\{suffix\}\.json/);
  assert.match(generated, /payerDisclosureVisible/);
  assert.match(generated, /failClosedStatusVisible/);
  assert.match(generated, /The configured Stripe platform account could not be verified\./);
  const screenshot = generated.indexOf("await screenshot(page, `participant-${suffix}.png`)");
  const disclosureWait = generated.indexOf('await disclosure.waitFor({ state: "visible", timeout: 30_000 })');
  assert.ok(screenshot >= 0, "The participant screenshot is missing.");
  assert.ok(disclosureWait > screenshot, "Readiness evidence must be captured before the disclosure wait.");
  assert.doesNotMatch(generated, /await expectText\(stage, \/Trade is live/);
});

test("participant UI generation fails closed if the pooled assertion block drifts", () => {
  const drifted = original.replace(
    "The pooled donation is the activation gate",
    "drifted pooled activation copy",
  );
  assert.throws(
    () => buildAuthenticatedHarnessSource(drifted),
    /pooled participant funding controls and sanitized readiness evidence: expected source contract was not found/,
  );
});

test("the generated harness observes participant refunds with a bounded poll and cleans already-refunded intents idempotently", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /for \(let attempt = 0; attempt < 12 && !refund; attempt \+= 1\)/);
  assert.match(generated, /stripe\.refunds\.list\(\{ payment_intent: paymentIntent\.id, limit: 5 \}\)/);
  assert.match(generated, /setTimeout\(resolve, 500\)/);
  assert.match(generated, /paymentIntents\.retrieve\(paymentIntentId, \{ expand: \["latest_charge"\] \}\)/);
  assert.match(generated, /charge\.amount_refunded >= charge\.amount/);
  assert.match(generated, /stripeRefundedPaymentIntentIds\.add\(paymentIntentId\);[\s\S]*?continue;/);
});

test("the generated harness binds signed Stripe evidence to accountable operator review before handoff", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /signed-stripe-webhook-gate\.json/);
  assert.match(generated, /stripe_signed_webhook/);
  assert.match(generated, /trade_donation_pool_stripe_events/);
  assert.match(generated, /review_trade_donation_pool_gate/);
  assert.match(generated, /p_actor_profile_id: operator\.id/);
  assert.match(generated, /p_evidence_sha256: signedWebhookEvidenceSha256/);
  assert.match(generated, /evidencePayloadSha256: signedWebhookEvidenceSha256/);
  assert.match(generated, /Synthetic QA operator review did not persist the signed-webhook provider-checkout gate/);
  const funding = generated.indexOf("const primaryFunding = await Promise.all(");
  const review = generated.indexOf('await admin.rpc("review_trade_donation_pool_gate"', funding);
  const gate = generated.indexOf('const signedWebhookGate = unwrap(', review);
  const handoff = generated.indexOf("await openEveryOrgThroughOperatorUi", gate);
  assert.ok(review > funding, "The evidence-bound operator review must follow valid funding events.");
  assert.ok(gate > review, "The persisted gate proof must follow the operator review.");
  assert.ok(handoff > gate, "The operator handoff must follow the signed-webhook gate proof.");
});

test("the workflow resolves the Stripe platform from the QA test key without recording its identity", () => {
  assert.match(workflow, /Bind the exact QA Stripe test account without exposing its identity/);
  assert.match(workflow, /accounts\.retrieveCurrent\(\)/);
  assert.match(workflow, /::add-mask::\$\{account\.id\}/);
  assert.match(workflow, /STRIPE_PLATFORM_ACCOUNT_ID=\$\{account\.id\}/);
  assert.match(workflow, /stripe-platform-binding\.json/);
  assert.match(workflow, /configuredAccountMatchedAuthenticatedAccount/);
  assert.match(workflow, /accountIdentityRecorded:\s*false/);
  assert.doesNotMatch(workflow, /console\.log\([^\n]*account\.id/);
  const mask = workflow.indexOf("::add-mask::${account.id}");
  const bind = workflow.indexOf("STRIPE_PLATFORM_ACCOUNT_ID=${account.id}");
  assert.ok(mask >= 0, "The Stripe account mask command is missing.");
  assert.ok(bind > mask, "The Stripe account identity must be masked before it enters GITHUB_ENV.");
});

test("the workflow recovers only the exact failed run and sanitizes runtime failure evidence", () => {
  assert.match(workflow, /Recover only the exact orphan from failed QA run 32782892669/);
  assert.match(workflow, /position\('32782892669' in nonprofit_slug\) > 0/);
  assert.match(workflow, /position\('32782892669' in target_id\) > 0/);
  assert.match(workflow, /raw_user_meta_data->>'pooled_qa_run_id' = '32782892669'/);
  assert.match(workflow, /test "\$pooled_counts" = "0\|0\|0\|0\|0\|0\|1"/);
  assert.match(workflow, /exact-run-recovery\.json/);
  assert.match(workflow, /Sanitize isolated runtime diagnostics after scenario failure/);
  assert.match(workflow, /runtime-failure-diagnostic\.json/);
  assert.match(workflow, /\[REDACTED:\$\{name\}\]/);
});

test("the generated harness uses the production milestone lifecycle before bilateral donation confirmation", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /create_trade_agreement_milestone_v1/);
  assert.match(generated, /finalize_trade_milestone_manifest_v1/);
  assert.match(generated, /finalize_trade_milestone_manifest_v1\(uuid\)/);
  assert.match(generated, /Unexpected milestone lifecycle overload inventory/);
  assert.match(generated, /p_agreement_version_id/);
  assert.match(generated, /authenticatedExecute/);
  assert.match(generated, /serviceRoleExecute/);
  assert.match(generated, /p_performer_id:\s*counterparty\.id/);
  assert.match(generated, /p_payer_id:\s*payer\.id/);
  assert.match(generated, /p_maximum_amount_cents:\s*0/);
  assert.match(generated, /expectedMilestoneHashes/);
  assert.match(generated, /finalizedVersion\.milestone_manifest_hash/);
  assert.match(generated, /finalizedVersion\.complete_terms_hash/);
  assert.match(generated, /assertFrozenManifestReviewedByBothParticipants/);
  assert.match(generated, /Both authenticated participants must confirm the exact manifest-bound version/);
  assert.doesNotMatch(generated, /finalize_trade_agreement_milestones_v1/);
  assert.doesNotMatch(generated, /confirm_trade_agreement_milestone_manifest_v1/);
  assert.doesNotMatch(
    generated,
    /admin\.from\("trade_agreement_milestones"\)\.insert/,
  );

  const prepare = generated.indexOf(
    "  await prepareMilestoneManifestForAuthenticatedConfirmation({ counterparty, payer, agreement, version, label });",
  );
  const negativeProbe = generated.indexOf(
    "    await probeConfirmationAuthorizationBoundary({ counterparty, payer, agreement, version });",
  );
  const validConfirmation = generated.indexOf(
    "    await confirmAsAuthenticatedParticipant(actor, agreement.id, version.id, label);",
  );
  assert.ok(prepare >= 0, "The milestone lifecycle preparation call is missing.");
  assert.ok(negativeProbe > prepare, "Negative donation-confirmation probes must follow manifest finalization.");
  assert.ok(validConfirmation > negativeProbe, "Valid bilateral confirmation must follow the negative probes.");
  const bilateralReview = generated.indexOf(
    "  await assertFrozenManifestReviewedByBothParticipants({ agreement, version, label });",
  );
  assert.ok(bilateralReview > validConfirmation, "Bilateral review evidence must follow both valid confirmations.");
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

test("the generated cleanup discovers run-owned bundles even if failure preceded in-memory capture", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /create temporary table pooled_qa_cleanup_bundle_ids/);
  assert.match(generated, /position\(\$\{cleanupRunIdLiteral\} in nonprofit_slug\) > 0/);
  assert.match(generated, /position\(\$\{cleanupRunIdLiteral\} in target_id\) > 0/);
  assert.match(generated, /bundle_id in \(select id from pooled_qa_cleanup_bundle_ids\)/);
  assert.match(generated, /object_id in \(select id from pooled_qa_cleanup_bundle_ids\)/);
  assert.match(generated, /actor_profile_id = any\(\$\{userIds\}\)/);
  assert.match(generated, /delete from public\.trade_donation_pool_bundles where id in \(select id from pooled_qa_cleanup_bundle_ids\)/);
  assert.doesNotMatch(generated, /delete from public\.trade_donation_pool_bundles where id = any\(\$\{bundleIds\}\)/);
});

test("the generated harness confirms through each participant's real authenticated session", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.match(generated, /const participantAuthenticatedClients = new Map\(\)/);
  assert.match(generated, /participantAuthenticatedClients\.get\(user\.id\)/);
  assert.match(generated, /auth\.signInWithPassword/);
  assert.match(generated, /auth\.getUser\(\)/);
  assert.match(generated, /identity\.user\?\.id,\s*user\.id/);
  assert.match(generated, /participantAuthenticatedClients\.set\(user\.id, client\)/);
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

test("the generated harness contains no identity-forging or direct confirmation write path", () => {
  const generated = buildAuthenticatedHarnessSource(original);
  assert.doesNotMatch(generated, /set_config\([^)]*request\.jwt\.claims/i);
  assert.doesNotMatch(generated, /trade_agreement_confirmations[\s\S]{0,120}\.insert\(/i);
  assert.doesNotMatch(generated, /disable trigger/i);
  assert.doesNotMatch(generated, /alter table[\s\S]*disable trigger/i);
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

test("the stacked workflow is QA-only, exact-fourteen-file-scoped, and applies the forward migration", () => {
  assert.match(workflow, new RegExp(PR700_HEAD));
  assert.match(workflow, new RegExp(PRODUCT_REPAIR_HEAD));
  assert.match(workflow, new RegExp(CLEAN_STACK_HEAD));
  assert.match(workflow, new RegExp(CONTEXT_READ_REPAIR_HEAD));
  assert.match(workflow, new RegExp(OPERATOR_UI_REPAIR_HEAD));
  assert.match(workflow, new RegExp(STRIPE_GATE_REPAIR_HEAD));
  assert.match(workflow, new RegExp(QA_PROJECT_REF));
  assert.match(workflow, /qa\/723-authenticated-confirmation-clean-stack-20260818-v1/);
  assert.match(workflow, /qa\/723-participant-context-integration-20260824/);
  for (const path of INTEGRATION_PATHS) {
    assert.match(workflow, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const functionName of REQUIRED_MILESTONE_LIFECYCLE_FUNCTIONS) {
    assert.match(workflow, new RegExp(functionName));
  }
  assert.match(
    workflow,
    /psql "\$QA_SUPABASE_DB_URL"[\s\S]*--file "\$AUTH_MIGRATION_PATH"/,
  );
  assert.match(workflow, /pooled-settlement-authenticated-caller-integration\.mjs/);
  assert.match(workflow, /git merge-base --is-ancestor "\$PR700_HEAD" HEAD/);
  assert.match(workflow, /bootstrap-issue-723/);
  const productionProjectRef = ["jnpoxval", "yjtdghnperyu"].join("");
  assert.doesNotMatch(workflow, new RegExp(productionProjectRef));
  assert.doesNotMatch(workflow, /sk_live_|pk_live_|rk_live_/);
});
