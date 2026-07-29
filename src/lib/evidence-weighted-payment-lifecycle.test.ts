import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const additive = source(
  "supabase/migrations/20260729165525_evidence_weighted_milestones_additive.sql",
);
const paymentLifecycle = source(
  "supabase/migrations/20260729165526_evidence_weighted_payment_completion.sql",
);
const rlsHardening = source(
  "supabase/migrations/20260729165529_evidence_weighted_payment_rls_hardening.sql",
) + source(
  "supabase/migrations/20260729165531_evidence_weighted_rls_identity_binding.sql",
);
const privacyCutover = source(
  "supabase/migrations/20260729165533_evidence_weighted_privacy_authorization_cutover.sql",
);

test("the rollout keeps additive compatibility separate from the restrictive cutover", () => {
  assert.match(additive, /Phase 1A: additive/i);
  assert.match(paymentLifecycle, /Phase 1B: additive/i);
  assert.doesNotMatch(
    additive + paymentLifecycle,
    /drop policy if exists "profiles_public_read"/i,
  );
  assert.doesNotMatch(
    additive + paymentLifecycle,
    /revoke select on table public\.profiles from anon/i,
  );

  assert.match(privacyCutover, /Phase 3: restrictive/i);
  assert.match(
    privacyCutover,
    /drop policy if exists "profiles_public_read"/i,
  );
  assert.match(
    privacyCutover,
    /revoke select on table public\.profiles from anon/i,
  );
  assert.match(
    privacyCutover,
    /drop policy if exists "agreements_update_participants"/i,
  );
});

test("payment review supports one correction, fresh response time, and one different-reviewer appeal", () => {
  assert.match(
    paymentLifecycle,
    /payment_cycle integer not null default 1/i,
  );
  assert.match(
    paymentLifecycle,
    /attempt_number smallint not null default 1/i,
  );
  assert.match(
    paymentLifecycle,
    /attempt_number = 2[\s\S]*receipt_kind = 'correction'[\s\S]*supersedes_receipt_id is not null/i,
  );
  assert.match(
    paymentLifecycle,
    /now\(\) \+ interval '7 days'[\s\S]*returning id into receipt_id_value/i,
  );
  assert.match(
    paymentLifecycle,
    /create table if not exists public\.trade_payment_appeals[\s\S]*case_id uuid not null unique/i,
  );
  assert.match(
    paymentLifecycle,
    /p_reviewer_id = base_decision\.reviewer_id/i,
  );
  assert.match(
    paymentLifecycle,
    /decision_kind = 'appeal'[\s\S]*base_decision_id is not null/i,
  );
});

test("a final still-due decision preserves history and permits a new payment cycle", () => {
  const reportStart = paymentLifecycle.indexOf(
    "create or replace function public.report_trade_external_payment_v1",
  );
  const reportEnd = paymentLifecycle.indexOf(
    "create or replace function public.respond_trade_external_payment_v1",
    reportStart,
  );
  const reportFunction = paymentLifecycle.slice(reportStart, reportEnd);

  assert.match(
    reportFunction,
    /payout_row\.status in \('due', 'still_due'\)/i,
  );
  assert.match(
    reportFunction,
    /coalesce\(max\(receipt\.payment_cycle\), 0\) \+ 1/i,
  );
  assert.match(
    reportFunction,
    /insert into public\.trade_external_payment_receipts[\s\S]*payment_cycle,[\s\S]*attempt_number/i,
  );
  assert.match(
    paymentLifecycle,
    /payout_status_value := case[\s\S]*else 'still_due'/i,
  );
});

test("agreement completion requires every live milestone grade and final payment", () => {
  const completionStart = paymentLifecycle.indexOf(
    "create or replace function moral_trade_private.is_trade_agreement_milestone_complete",
  );
  const completionEnd = paymentLifecycle.indexOf(
    "create or replace function moral_trade_private.recompute_trade_agreement_completion",
    completionStart,
  );
  const completionPredicate = paymentLifecycle.slice(
    completionStart,
    completionEnd,
  );

  assert.match(completionPredicate, /milestone\.status <> 'cancelled'/i);
  assert.match(completionPredicate, /milestone\.final_review_id is null/i);
  assert.match(
    completionPredicate,
    /payout\.status in \(\s*'not_due', 'confirmed', 'adjudicated_paid'\s*\)/i,
  );
  assert.match(
    paymentLifecycle,
    /set lifecycle_status = 'completed',[\s\S]*status = 'completed',[\s\S]*completion_state = 'reviewed_complete'/i,
  );
});

test("private payment rows use identity-bound RLS helpers and authenticated RPCs", () => {
  for (const helper of [
    "can_read_trade_milestone_v1",
    "can_read_trade_payout_v1",
    "can_read_trade_receipt_v1",
    "can_read_trade_payment_case_v1",
    "can_read_trade_payment_decision_v1",
    "can_read_trade_payment_appeal_v1",
  ]) {
    assert.match(rlsHardening, new RegExp(helper));
  }
  assert.match(
    rlsHardening,
    /p_actor_id = auth\.uid\(\)/i,
  );
  assert.match(
    paymentLifecycle,
    /revoke all on table[\s\S]*trade_payment_review_cases[\s\S]*from anon, authenticated/i,
  );
  assert.match(
    paymentLifecycle,
    /grant select on table[\s\S]*trade_payment_review_cases[\s\S]*to authenticated/i,
  );
  for (const rpc of [
    "report_trade_external_payment_v1",
    "respond_trade_external_payment_v1",
    "nominate_trade_payment_reviewer_v1",
    "resolve_trade_payment_review_v1",
    "open_trade_payment_appeal_v1",
    "nominate_trade_payment_appeal_reviewer_v1",
    "resolve_trade_payment_appeal_v1",
  ]) {
    assert.match(
      paymentLifecycle,
      new RegExp(`grant execute on function\\s+public\\.${rpc}`, "i"),
    );
  }
});

test("participant, reviewer, and administrator surfaces expose every payment transition", () => {
  const actions = source("src/app/trade-milestone-actions.ts");
  const agreementPage = source(
    "src/app/trade-agreements/[agreementId]/page.tsx",
  );
  const workflow = source(
    "src/components/core-trade/trade-milestone-workflow.tsx",
  );
  const reviewerPage = source("src/app/trade-review/[milestoneId]/page.tsx");
  const administratorPage = source("src/app/admin/trade-review/page.tsx");

  for (const action of [
    "nominateTradePaymentReviewerAction",
    "finalizeTradePaymentReviewAction",
    "requestTradePaymentAppealAction",
    "nominateTradePaymentAppealReviewerAction",
    "resolveTradePaymentReviewAction",
    "resolveTradePaymentAppealAction",
  ]) {
    assert.match(actions, new RegExp(`export async function ${action}`));
    assert.match(agreementPage + reviewerPage, new RegExp(action));
  }
  assert.match(reviewerPage, /fresh seven-day response window/i);
  assert.match(workflow, /name="payment_appeal_reason"/i);
  assert.match(reviewerPage, /allow_correction/i);
  assert.match(reviewerPage, /confirm_paid/i);
  assert.match(reviewerPage, /still_due/i);
  assert.match(
    administratorPage,
    /adminAssignTradePaymentReviewerAction/,
  );
  assert.match(
    administratorPage,
    /adminAssignTradePaymentAppealReviewerAction/,
  );
});
