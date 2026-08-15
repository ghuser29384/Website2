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
const postCutoverHardening = source(
  "supabase/migrations/20260729165534_evidence_weighted_post_cutover_advisor_hardening.sql",
);
const completionCompatibility = source(
  "supabase/migrations/20260729165535_evidence_weighted_agreement_completion_compatibility.sql",
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
  assert.match(
    postCutoverHardening,
    /revoke all on function public\.register_trade_evidence_v3[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    completionCompatibility,
    /add column if not exists completion_state text[\s\S]*alter column completion_state set default 'pending_evidence'[\s\S]*alter column completion_state set not null/i,
  );
  assert.match(
    completionCompatibility,
    /when lifecycle_status = 'completed' or status::text = 'completed'[\s\S]*then 'reviewed_complete'[\s\S]*when lifecycle_status = 'disputed'[\s\S]*then 'disputed_unresolved'/i,
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
  const paymentResponseForm = source(
    "src/components/core-trade/external-payment-response-form.tsx",
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
  assert.match(paymentResponseForm, /FullNavigationActionForm/);
  assert.match(
    administratorPage,
    /adminAssignTradePaymentReviewerAction/,
  );
  assert.match(
    administratorPage,
    /adminAssignTradePaymentAppealReviewerAction/,
  );
});

test("full-navigation actions keep React form semantics and hard-navigate validated redirects", () => {
  const fullNavigationForm = source(
    "src/components/core-trade/full-navigation-action-form.tsx",
  );

  assert.match(
    fullNavigationForm,
    /async function submitWithFullNavigation\(formData: FormData\)/,
  );
  assert.match(fullNavigationForm, /await action\(formData\)/);
  assert.match(
    fullNavigationForm,
    /if \(!isRedirectError\(error\)\) \{\s*throw error;/,
  );
  assert.match(fullNavigationForm, /getURLFromRedirectError\(error\)/);
  assert.match(fullNavigationForm, /getRedirectTypeFromError\(error\)/);
  assert.match(fullNavigationForm, /window\.location\.replace\(target\)/);
  assert.match(fullNavigationForm, /window\.location\.assign\(target\)/);
  assert.match(
    fullNavigationForm,
    /<form action=\{submitWithFullNavigation\} \{\.\.\.props\}>/,
  );

  for (const forbidden of [
    /FormEvent/,
    /onSubmit=/,
    /preventDefault/,
    /HTMLFormElement\.prototype\.submit/,
    /requestSubmit/,
    /submitter/,
    /document\.createElement/,
    /form\.append/,
  ]) {
    assert.doesNotMatch(fullNavigationForm, forbidden);
  }
});

test("reviewer nomination uses full navigation when matching nominations remove the form", () => {
  const workflow = source(
    "src/components/core-trade/trade-milestone-workflow.tsx",
  );
  const reviewerNominationForm = workflow.match(
    /function ReviewerNominationForm\([\s\S]*?(?=\nfunction NeutralReviewForm\()/,
  )?.[0];

  assert.ok(reviewerNominationForm);
  assert.match(
    reviewerNominationForm,
    /<FullNavigationActionForm action=\{action\} className="panel stack-form">/,
  );
  assert.match(reviewerNominationForm, /<\/FullNavigationActionForm>/);
});

test("private evidence submission uses full navigation after the server action redirects", () => {
  const workflow = source(
    "src/components/core-trade/trade-milestone-workflow.tsx",
  );
  const evidenceBundleForm = workflow.match(
    /function EvidenceBundleForm\([\s\S]*?(?=\nfunction ReviewerNominationForm\()/,
  )?.[0];

  assert.ok(evidenceBundleForm);
  assert.match(
    evidenceBundleForm,
    /<FullNavigationActionForm\s+action=\{action\}\s+className="panel stack-form"\s+encType="multipart\/form-data"/,
  );
  assert.match(evidenceBundleForm, /<\/FullNavigationActionForm>/);
  assert.doesNotMatch(evidenceBundleForm, /<form\s+action=\{action\}/);
});

test("agreement confirmation uses full navigation when activation changes the rendered stage", () => {
  const stage = source(
    "src/components/core-trade/trade-agreement-stage-base.tsx",
  );
  const confirmationForm = stage.match(
    /\{props\.canConfirm \? \([\s\S]*?(?=\) : props\.viewerConfirmed)/,
  )?.[0];

  assert.ok(confirmationForm);
  assert.match(
    confirmationForm,
    /<FullNavigationActionForm\s+action=\{props\.confirmAction\}/,
  );
  assert.match(confirmationForm, /name="terms_reviewed" required type="checkbox"/);
  assert.match(confirmationForm, /pendingLabel="Recording confirmation\.\.\."/);
  assert.match(confirmationForm, /<\/FullNavigationActionForm>/);
});

test("assigned evidence reviewers retain read-only access after recording a review", () => {
  const reviewerPage = source("src/app/trade-review/[milestoneId]/page.tsx");

  assert.match(
    reviewerPage,
    /const isInitialReviewer =\s*!isAppealViewer &&\s*String\(milestone\.assigned_reviewer_id\) === viewer\.authUser\.id;/,
  );
  assert.match(
    reviewerPage,
    /!isAppealViewer &&\s*!isInitialReviewer &&\s*!isPaymentAppealViewer/,
  );
  assert.match(
    reviewerPage,
    /\{isAppealReview \|\| isInitialReview \? \(\s*<form action=\{action\}/,
  );
  assert.match(reviewerPage, /This assigned review is recorded\./);
});

test("authenticated workflow and authorization states remain visibly rendered", () => {
  const agreementPage = source(
    "src/app/trade-agreements/[agreementId]/page.tsx",
  );
  const reviewerPage = source("src/app/trade-review/[milestoneId]/page.tsx");
  const administratorPage = source("src/app/admin/trade-review/page.tsx");
  const styles = source("src/app/globals.css");

  for (const page of [agreementPage, reviewerPage, administratorPage]) {
    assert.match(page, /marketplace-app-shell trade-workflow-shell/);
  }
  assert.match(
    styles,
    /\.trade-workflow-shell\.marketplace-app-shell #main-content > \.section\s*{\s*display:\s*block;/,
  );
  assert.match(reviewerPage, /isPaymentAppealViewer/);
  assert.match(reviewerPage, /Waiting for the payer’s corrected receipt\./);
  assert.match(
    reviewerPage,
    /The provisional payment decision is awaiting finality\./,
  );
  assert.match(reviewerPage, /This payment appeal is final\./);
});
