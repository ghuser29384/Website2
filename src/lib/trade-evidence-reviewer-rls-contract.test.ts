import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const policyMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814050000_trade_evidence_assigned_reviewer_rls.sql",
  ),
  "utf8",
);

const authorizationMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260815010000_trade_evidence_reviewer_role_aal2.sql",
  ),
  "utf8",
);

const roleMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260729165525_evidence_weighted_milestones_additive.sql",
  ),
  "utf8",
);

const evaluatorWorkflow = readFileSync(
  join(process.cwd(), ".github/workflows/evidence-payment-release-qa.yml"),
  "utf8",
);

const evaluatorFixture = readFileSync(
  join(process.cwd(), "supabase/tests/evaluator_core_loop_browser_fixture.sql"),
  "utf8",
);

const evaluatorCleanup = readFileSync(
  join(process.cwd(), "supabase/tests/evaluator_core_loop_browser_cleanup.sql"),
  "utf8",
);

function section(source: string, start: string, end?: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  const endIndex = end
    ? source.indexOf(end, startIndex + start.length)
    : source.length;
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("private evidence keeps participant AAL1 access and gates every reviewer assignment on an active AAL2 role", () => {
  const helper = section(
    authorizationMigration,
    "create or replace function moral_trade_private.can_read_trade_evidence_v1",
    "revoke all on function",
  );
  const roleHelper = section(
    roleMigration,
    "create or replace function moral_trade_private.current_actor_has_trade_role",
    "create or replace function moral_trade_private.guard_frozen_trade_milestone",
  );

  assert.match(helper, /security definer/i);
  assert.match(helper, /p_actor_id is not null[\s\S]*p_actor_id = auth\.uid\(\)/i);
  assert.match(helper, /p_actor_id in \(agreement\.proposer_id, agreement\.responder_id\)/i);
  assert.match(
    helper,
    /current_actor_has_trade_role\('reviewer'\)[\s\S]*and \([\s\S]*milestone\.assigned_reviewer_id = p_actor_id[\s\S]*or exists \([\s\S]*appeal\.assigned_reviewer_id = p_actor_id[\s\S]*\)[\s\S]*\)/i,
  );
  assert.equal(
    helper.match(/milestone\.assigned_reviewer_id = p_actor_id/gi)?.length,
    1,
  );
  assert.equal(
    helper.match(/appeal\.assigned_reviewer_id = p_actor_id/gi)?.length,
    1,
  );
  assert.match(helper, /current_actor_has_trade_role\('administrator'\)/i);
  assert.doesNotMatch(helper, /trade_payment_review_cases|trade_payment_appeals/i);
  assert.match(roleHelper, /coalesce\(auth\.jwt\(\) ->> 'aal', ''\) = 'aal2'/i);
  assert.match(roleHelper, /grant_row\.active/i);
  assert.match(roleHelper, /grant_row\.revoked_at is null/i);
});

test("submitted bundles and items use the evidence-specific authorization helper", () => {
  const bundles = section(
    policyMigration,
    'create policy "trade_evidence_bundles_authorized_select"',
    'drop policy if exists "trade_evidence_bundle_items_authorized_select"',
  );
  const items = section(
    policyMigration,
    'create policy "trade_evidence_bundle_items_authorized_select"',
  );

  assert.match(
    bundles,
    /submitted_by = \(select auth\.uid\(\)\)[\s\S]*status <> 'draft'[\s\S]*can_read_trade_evidence_v1/i,
  );
  assert.match(
    items,
    /bundle\.status = 'draft'[\s\S]*bundle\.submitted_by = \(select auth\.uid\(\)\)[\s\S]*bundle\.status <> 'draft'[\s\S]*can_read_trade_evidence_v1/i,
  );
  assert.doesNotMatch(bundles, /join public\.agreements/i);
  assert.doesNotMatch(items, /join public\.agreements/i);
});

test("the private helper is unavailable to anonymous callers", () => {
  assert.match(
    authorizationMigration,
    /revoke all on function[\s\S]*can_read_trade_evidence_v1\(uuid, uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    authorizationMigration,
    /grant execute on function[\s\S]*can_read_trade_evidence_v1\(uuid, uuid\)[\s\S]*to authenticated/i,
  );
});

test("the evaluator is branch-independent and serializes every isolated-QA writer", () => {
  assert.match(
    evaluatorWorkflow,
    /group: evidence-payment-release-qa-\$\{\{ github\.repository \}\}/,
  );
  assert.match(evaluatorWorkflow, /cancel-in-progress: false/);
  assert.match(
    evaluatorWorkflow,
    /evaluator-core-loop-gate:\s+needs: exact-head-release-gate\s+if: >-\s+always\(\)[\s\S]*needs\.exact-head-release-gate\.result == 'success'/,
  );
  assert.match(
    evaluatorWorkflow,
    /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  assert.match(
    evaluatorWorkflow,
    /inputs\.evaluator_confirm_target == 'hvmxfjjbdcgjjudmthdz'/,
  );
  assert.match(
    evaluatorWorkflow,
    /EXPECTED_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.sha \}\}/,
  );
  assert.match(
    evaluatorWorkflow,
    /evaluator_core_loop_evidence_authorization\.sql/,
  );
  assert.doesNotMatch(
    evaluatorWorkflow,
    /codex\/evaluator-core-loop-authenticated-20260813/,
  );
});

test("the fifth synthetic administrator identity is created and exhaustively cleaned", () => {
  for (const source of [evaluatorFixture, evaluatorCleanup]) {
    assert.match(source, /81000000-0000-4000-8000-000000000005/);
  }
  assert.match(evaluatorFixture, /evaluator-core-loop-admin@qa\.invalid/);
  assert.match(
    evaluatorFixture,
    /81000000-0000-4000-8000-000000000005'[\s\S]*'administrator'[\s\S]*true/,
  );
  assert.match(evaluatorCleanup, /'reviewRoles'[\s\S]*81000000-0000-4000-8000-%/);
  assert.match(evaluatorCleanup, /'authMfaFactors'[\s\S]*81000000-0000-4000-8000-%/);
});
