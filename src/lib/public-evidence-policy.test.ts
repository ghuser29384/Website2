import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migrationPaths = [
  "supabase/migrations/20260729165525_evidence_weighted_milestones_additive.sql",
  "supabase/migrations/20260729165526_evidence_weighted_payment_completion.sql",
  "supabase/migrations/20260729165527_evidence_weighted_payment_advisor_indexes.sql",
  "supabase/migrations/20260729165528_credibility_model_seed_invariant.sql",
  "supabase/migrations/20260729165529_evidence_weighted_payment_rls_hardening.sql",
  "supabase/migrations/20260729165531_evidence_weighted_rls_identity_binding.sql",
  "supabase/migrations/20260729165532_evidence_weighted_remaining_fk_indexes.sql",
  "supabase/migrations/20260729165533_evidence_weighted_privacy_authorization_cutover.sql",
];

function migrationSource() {
  return migrationPaths.map(source).join("\n");
}

test("proposal drafting keeps evidence originals private", () => {
  const workbench = source("src/components/core-trade/trade-draft-workbench.tsx");
  const action = source("src/app/core-trade-actions-base.ts");

  assert.doesNotMatch(workbench, /publicEvidenceCertification/);
  assert.doesNotMatch(workbench, /name="public_evidence_certification"/);
  assert.match(workbench, /Original evidence.*stay private/i);
  assert.match(workbench, /Only safe outcome metadata may be published/i);
  assert.doesNotMatch(action, /readCheckbox\(formData, "public_evidence_certification"\)/);
});

test("the canonical agreement uses private milestone evidence and neutral grading", () => {
  const page = source("src/app/trade-agreements/[agreementId]/page.tsx");
  const workflow = source(
    "src/components/core-trade/trade-milestone-workflow.tsx",
  );

  assert.match(page, /<TradeMilestoneWorkflow/);
  assert.match(page, /submitTradeEvidenceBundleAction/);
  assert.match(page, /submitNeutralTradeMilestoneReviewAction/);
  assert.doesNotMatch(page, /name="public_safe_copy"/);
  assert.doesNotMatch(page, /reviewTradeEvidenceAction/);
  assert.match(workflow, /100%, 75%, 50%, 25%, or 0%/);
  assert.match(workflow, /one complete bundle for this attempt/i);
  assert.match(workflow, /Original files,[\s\S]*remain private/i);
});

test("the anonymous outcome page requests only the v2 metadata projection", () => {
  const page = source("src/app/evidence/[[...recordId]]/page.tsx");
  const styles = source("src/app/globals.css");

  assert.match(page, /list_public_moral_trade_outcomes_v2/);
  assert.doesNotMatch(page, /get_public_moral_trade_evidence_v1/);
  assert.doesNotMatch(page, /list_public_moral_trade_evidence_v1/);
  assert.doesNotMatch(page, /trade_evidence_items/);
  assert.doesNotMatch(page, /createServiceClient/);
  for (const field of [
    "actionCategory",
    "lifecycleStatus",
    "confidenceBand",
    "completionFraction",
    "payoutPercentage",
    "date",
  ]) {
    assert.match(page, new RegExp(field));
  }
  assert.match(page, /Individual public dossier links have been retired/i);
  assert.match(page, /marketplace-app-shell evidence-outcomes-shell/);
  assert.match(
    styles,
    /\.evidence-outcomes-shell\.marketplace-app-shell #main-content > \.section\s*{\s*display:\s*block;/,
  );
});

test("the database exposes exactly the approved six public fields", () => {
  const migration = migrationSource();
  const start = migration.indexOf(
    "create or replace function public.list_public_moral_trade_outcomes_v2",
  );
  const end = migration.indexOf(
    "create or replace function public.get_safe_profile_labels_v1",
    start,
  );
  const projection = migration.slice(start, end);
  const recordBuilder = projection.match(
    /jsonb_build_object\(\s*'actionCategory'[\s\S]*?'date', outcome_page\.outcome_date\s*\)/i,
  )?.[0];

  assert.ok(recordBuilder);
  assert.deepEqual(
    [...recordBuilder.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1]),
    [
      "actionCategory",
      "lifecycleStatus",
      "confidenceBand",
      "completionFraction",
      "payoutPercentage",
      "date",
    ],
  );
  assert.doesNotMatch(
    projection,
    /provider_reference|receipt_storage_path|paid_on|public_storage_path/i,
  );
});

test("legacy public evidence functions and anonymous stored files are revoked", () => {
  const migration = migrationSource();

  assert.match(
    migration,
    /revoke execute on function public\.get_public_moral_trade_evidence_v1\(uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /revoke execute on function public\.list_public_moral_trade_evidence_v1\(integer, integer\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /drop policy if exists "public_safe_trade_evidence_read" on storage\.objects/i,
  );
  assert.doesNotMatch(
    migration.slice(
      migration.indexOf("private_trade_evidence_authorized_read"),
      migration.indexOf("-- Phase 1B"),
    ),
    /to anon/,
  );
});

test("assigned reviewers see private evidence only through an authenticated route", () => {
  const reviewPage = source("src/app/trade-review/[milestoneId]/page.tsx");
  const migration = migrationSource();

  assert.match(reviewPage, /requireViewer\(returnTo\)/);
  assert.match(reviewPage, /createSignedUrl/);
  assert.match(reviewPage, /resolveTradeMilestoneAppealAction/);
  assert.match(reviewPage, /\[100, 75, 50, 25, 0\]/);
  assert.match(
    migration,
    /current_actor_has_trade_role\('reviewer'\)/,
  );
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'[\s\S]*= 'aal2'/);
});

test("external-payment evidence stays private and noncustodial", () => {
  const workflow = source(
    "src/components/core-trade/trade-milestone-workflow.tsx",
  );
  const actions = source("src/app/trade-milestone-actions.ts");

  assert.match(workflow, /does not hold, escrow, capture, release, or redistribute/i);
  assert.match(actions, /report_trade_external_payment_v1/);
  assert.match(actions, /respond_trade_external_payment_v1/);
  assert.match(actions, /payment_response/);
  assert.doesNotMatch(
    source("src/app/evidence/[[...recordId]]/page.tsx"),
    /provider_reference|receipt_storage_path|amount_due_cents/,
  );
});
