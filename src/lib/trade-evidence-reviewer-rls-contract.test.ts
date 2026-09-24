import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

const evaluatorFixturePath = join(
  process.cwd(),
  "supabase/tests/evaluator_core_loop_browser_fixture.sql",
);
const evaluatorCleanupPath = join(
  process.cwd(),
  "supabase/tests/evaluator_core_loop_browser_cleanup.sql",
);
const evaluatorHarnessPresent =
  existsSync(evaluatorFixturePath) &&
  existsSync(evaluatorCleanupPath) &&
  evaluatorWorkflow.includes("evaluator-core-loop-gate:");
const evaluatorFixture = evaluatorHarnessPresent
  ? readFileSync(evaluatorFixturePath, "utf8")
  : "";
const evaluatorCleanup = evaluatorHarnessPresent
  ? readFileSync(evaluatorCleanupPath, "utf8")
  : "";

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
  assert.match(
    helper,
    /p_actor_id is not null[\s\S]*p_actor_id = auth\.uid\(\)/i,
  );
  assert.match(
    helper,
    /p_actor_id in \(agreement\.proposer_id, agreement\.responder_id\)/i,
  );
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
  assert.doesNotMatch(
    helper,
    /trade_payment_review_cases|trade_payment_appeals/i,
  );
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

test(
  "the evaluator is branch-independent, run-owned, and serializes every isolated-QA writer",
  { skip: !evaluatorHarnessPresent },
  () => {
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
    assert.match(evaluatorWorkflow, /EXPECTED_QA_REF: hvmxfjjbdcgjjudmthdz/);
    assert.match(
      evaluatorWorkflow,
      /evaluator_core_loop_evidence_authorization\.sql/,
    );
    assert.match(
      evaluatorWorkflow,
      /scripts\/evaluator-core-loop-qa-run-ownership\.test\.mjs/,
    );
    assert.doesNotMatch(
      evaluatorWorkflow,
      /codex\/evaluator-core-loop-authenticated-20260813/,
    );
  },
);

test(
  "the evaluator uses six exact run-owned roles and exact cleanup",
  { skip: !evaluatorHarnessPresent },
  () => {
    for (const source of [evaluatorFixture, evaluatorCleanup]) {
      for (const binding of [
        "EVIDENCE_PAYMENT_QA_PAYER_ID",
        "EVIDENCE_PAYMENT_QA_PAYEE_ID",
        "EVIDENCE_PAYMENT_QA_REVIEWER_ID",
        "EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID",
        "EVIDENCE_PAYMENT_QA_OUTSIDER_ID",
        "EVIDENCE_PAYMENT_QA_ADMIN_ID",
        "EVIDENCE_PAYMENT_QA_OFFER_ID",
      ]) {
        assert.match(source, new RegExp(binding));
      }
      assert.doesNotMatch(
        source,
        /81000000-|82000000-|83000000-|evaluator-core-loop-[a-z-]+@qa\.invalid/i,
      );
    }
    assert.match(evaluatorFixture, /EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_EMAIL/);
    assert.match(evaluatorFixture, /qa_namespace/);
    assert.doesNotMatch(
      evaluatorCleanup,
      /\blike\b|\bilike\b|\border\s+by\b|\blimit\b/i,
    );
    assert.match(evaluatorCleanup, /'reviewRoles'/);
    assert.match(evaluatorCleanup, /'authMfaFactors'/);
    assert.match(evaluatorCleanup, /'performanceBonds'/);
    assert.match(evaluatorCleanup, /'externalPaymentReceipts'/);
  },
);
