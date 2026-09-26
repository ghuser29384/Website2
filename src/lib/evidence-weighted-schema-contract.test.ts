import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = [
  "20260729165525_evidence_weighted_milestones_additive.sql",
  "20260729165526_evidence_weighted_payment_completion.sql",
  "20260729165527_evidence_weighted_payment_advisor_indexes.sql",
  "20260729165528_credibility_model_seed_invariant.sql",
  "20260729165529_evidence_weighted_payment_rls_hardening.sql",
  "20260729165531_evidence_weighted_rls_identity_binding.sql",
  "20260729165532_evidence_weighted_remaining_fk_indexes.sql",
  "20260729165533_evidence_weighted_privacy_authorization_cutover.sql",
  "20260729165534_evidence_weighted_post_cutover_advisor_hardening.sql",
  "20260729165535_evidence_weighted_agreement_completion_compatibility.sql",
]
  .map((filename) =>
    readFileSync(join(process.cwd(), "supabase/migrations", filename), "utf8"),
  )
  .join("\n");
const aggregateSchema = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");

function section(start: string, end: string) {
  const startIndex = migration.indexOf(start);
  const endIndex = migration.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return migration.slice(startIndex, endIndex);
}

test("new core versions fail closed until a frozen milestone manifest exists", () => {
  assert.match(
    migration,
    /alter column requires_milestone_manifest set default true/i,
  );
  assert.match(
    migration,
    /milestone_manifest_hash is null[\s\S]*complete_terms_hash is null[\s\S]*Finalize and review the milestone manifest/i,
  );
  assert.match(
    migration,
    /activate_confirmed_trade_milestones[\s\S]*participant_confirmation_count = 2[\s\S]*agreement_version_id = new\.agreement_version_id[\s\S]*status = 'terms'/i,
  );
});

test("milestone terms are version-bound, immutable, and ordered under the version lock", () => {
  const createMilestone = section(
    "create or replace function public.create_trade_agreement_milestone_v1",
    "create or replace function public.finalize_trade_milestone_manifest_v1",
  );
  assert.match(createMilestone, /from public\.trade_agreement_versions[\s\S]*for update/i);
  assert.match(
    createMilestone,
    /position_value := coalesce\([\s\S]*max\(m\.position\)[\s\S]*agreement_version_id = version_row\.id/i,
  );
  assert.match(migration, /not indivisible or units_total = 1/i);
  assert.match(
    migration,
    /Milestone terms are frozen\. Create a new agreement version to amend them\./i,
  );
  assert.match(
    migration,
    /complete_hash := encode\([\s\S]*version_row\.terms_hash \|\| chr\(31\) \|\| manifest_hash/i,
  );
  const amendment = section(
    "create or replace function public.start_trade_milestone_amendment_v1",
    "create or replace function public.open_trade_evidence_bundle_v1",
  );
  assert.match(amendment, /agreement_row\.lifecycle_status <> 'proposed'/i);
  assert.match(amendment, /coalesce\(max\(version\.version\), 0\) \+ 1/i);
  assert.match(amendment, /current_version_id = next_version_id/i);
  assert.match(amendment, /Earlier confirmations do not apply/i);
});

test("database grading accepts only the approved bands and floors cents", () => {
  assert.match(
    migration,
    /confidence_band smallint not null check \(confidence_band in \(0, 25, 50, 75, 100\)\)/i,
  );
  const payout = section(
    "create or replace function public.trade_milestone_payout_v1",
    "create or replace function moral_trade_private.current_actor_has_trade_role",
  );
  assert.match(payout, /floor\([\s\S]*p_maximum_amount_cents::numeric/i);
  assert.match(payout, /p_confidence_band in \(0, 25, 50, 75, 100\)/i);
});

test("one replacement and one appeal are enforced at the database boundary", () => {
  assert.match(
    migration,
    /create unique index if not exists trade_evidence_bundles_one_replacement_idx[\s\S]*where bundle_kind = 'replacement'/i,
  );
  assert.match(
    migration,
    /milestone_id uuid not null unique references public\.trade_agreement_milestones/i,
  );
  assert.match(
    migration,
    /base_review_row\.reviewer_id = actor_id/i,
  );
  assert.match(
    migration,
    /replacement_deadline_at = null[\s\S]*replacement_seconds_remaining = remaining_seconds/i,
  );
  assert.match(
    migration,
    /now\(\) \+ make_interval\(secs => resume_seconds\)/i,
  );
});

test("opening a draft evidence packet is retry-safe while submission is immutable", () => {
  const openBundle = section(
    "create or replace function public.open_trade_evidence_bundle_v1",
    "create or replace function public.add_trade_evidence_bundle_item_v1",
  );
  assert.match(
    openBundle,
    /bundle_kind = p_bundle_kind[\s\S]*status = 'draft'[\s\S]*return bundle_id/i,
  );
  assert.match(migration, /Submitted evidence packets are immutable/i);
});

test("reviewer and administrator authority is profile-bound and AAL2-gated", () => {
  assert.match(
    migration,
    /role text not null check \(role in \('reviewer', 'administrator'\)\)/i,
  );
  assert.match(migration, /auth\.jwt\(\) ->> 'aal'[\s\S]*= 'aal2'/i);
  assert.match(
    migration,
    /9e51db47-92d1-4d75-80ce-cf10de1121f1/i,
  );
  assert.match(
    migration,
    /reviewer_selection_opened_at \+ interval '7 days' > now\(\)/i,
  );
  assert.match(
    migration,
    /reviewer_selection_deadline_at > now\(\)/i,
  );
});

test("the public outcome record has exactly the six approved 4A fields", () => {
  const publicProjection = section(
    "create or replace function public.list_public_moral_trade_outcomes_v2",
    "create or replace function public.get_safe_profile_labels_v1",
  );
  const recordBuilder = publicProjection.match(
    /jsonb_build_object\(\s*'actionCategory'[\s\S]*?'date', outcome_page\.outcome_date\s*\)/i,
  )?.[0];
  assert.ok(recordBuilder, "Missing public outcome record builder.");

  const keys = [...recordBuilder.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1]);
  assert.deepEqual(keys, [
    "actionCategory",
    "lifecycleStatus",
    "confidenceBand",
    "completionFraction",
    "payoutPercentage",
    "date",
  ]);
  assert.doesNotMatch(
    recordBuilder,
    /amount|currency|provider|receipt|identity|profile|file|url|timestamp/i,
  );
});

test("legacy public evidence and participant state rewrites are revoked", () => {
  assert.match(
    migration,
    /drop policy if exists "public_safe_trade_evidence_read" on storage\.objects/i,
  );
  assert.match(
    migration,
    /revoke execute on function public\.get_public_moral_trade_evidence_v1\(uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  for (const signature of [
    String.raw`initialize_public_trade_evidence\(\)`,
    String.raw`register_trade_evidence_v3\([\s\S]*?uuid, uuid, text, text, text, text, text, uuid[\s\S]*?\)`,
    String.raw`publish_trade_evidence_v3\([\s\S]*?uuid, uuid, text, text, text, text, text, text, text[\s\S]*?\)`,
    String.raw`review_trade_evidence_v3\([\s\S]*?uuid, uuid, text, text[\s\S]*?\)`,
    String.raw`withdraw_trade_evidence_v3\([\s\S]*?uuid, uuid, text[\s\S]*?\)`,
  ]) {
    assert.match(
      migration,
      new RegExp(
        String.raw`revoke all on function public\.${signature}[\s\S]*?from public, anon, authenticated, service_role`,
        "i",
      ),
    );
  }
  assert.match(
    migration,
    /drop policy if exists "agreements_update_participants"/i,
  );
  assert.match(
    migration,
    /drop policy if exists "agreement_review_cases_update_participants"/i,
  );
  assert.match(
    migration,
    /drop policy if exists "agreement_payments_update_participants"/i,
  );
  assert.match(
    migration,
    /to_regclass\('public\.agreement_evidence_items'\)[\s\S]*drop policy if exists "agreement_evidence_items_update_participants"/i,
  );
  assert.match(
    migration,
    /to_regclass\('public\.agreement_review_cases'\)[\s\S]*drop policy if exists "agreement_review_cases_update_participants"/i,
  );
});

test("post-cutover advisor hardening covers every release-owned foreign key", () => {
  assert.match(
    migration,
    /to_regclass\('public\.agreement_review_cases'\)[\s\S]*agreement_review_cases_appeal_requester_idx/i,
  );
  for (const definition of [
    "agreement_review_cases\\(appeal_requested_by\\)",
    "agreement_review_cases\\(assigned_reviewer_id\\)",
    "agreement_review_cases\\(evidence_item_id\\)",
    "agreement_review_cases\\(opened_by\\)",
    "agreement_review_cases\\(reviewed_by\\)",
    "trade_milestone_reviewer_nominations\\(nominated_by\\)",
    "trade_milestone_reviewer_nominations\\(reviewer_id\\)",
    "trade_review_role_grants\\(granted_by\\)",
  ]) {
    assert.match(
      migration,
      new RegExp(
        String.raw`create index if not exists [a-z0-9_]+[\s\S]*?on public\.${definition}`,
        "i",
      ),
    );
  }
});

test("full profiles are self-only and the safe label projection excludes email", () => {
  assert.match(migration, /drop policy if exists "profiles_public_read"/i);
  assert.match(
    migration,
    /create policy "profiles_self_select"[\s\S]*using \(id = \(select auth\.uid\(\)\)\)/i,
  );
  const safeLabels = section(
    "create or replace function public.get_safe_profile_labels_v1",
    "-- Full profile rows are self-only",
  );
  assert.match(safeLabels, /returns table \(\s*id uuid,\s*display_name text\s*\)/i);
  assert.doesNotMatch(
    safeLabels,
    /(?:select|,)\s*(?:profile\.)?email(?:\s|,|from)/i,
  );
  assert.match(migration, /revoke select on table public\.profiles from anon/i);
  assert.doesNotMatch(
    aggregateSchema,
    /create policy "profiles_public_read"[\s\S]*?using \(true\)/i,
  );
  assert.match(
    aggregateSchema,
    /create policy "profiles_self_select"[\s\S]*?to authenticated[\s\S]*?auth\.uid/i,
  );
});

test("external payments are private, exact, final, and noncustodial", () => {
  const reportPayment = section(
    "create or replace function public.report_trade_external_payment_v1",
    "create or replace function public.respond_trade_external_payment_v1",
  );
  assert.match(reportPayment, /not payout_row\.is_final/i);
  assert.match(reportPayment, /p_amount_cents <> payout_row\.amount_due_cents/i);
  assert.match(reportPayment, /p_paid_on < payout_row\.finalized_at::date/i);
  assert.match(
    migration,
    /trade_external_payment_receipts_participant_select/i,
  );
  assert.doesNotMatch(
    section(
      "create or replace function public.list_public_moral_trade_outcomes_v2",
      "create or replace function public.get_safe_profile_labels_v1",
    ),
    /provider_reference|receipt_storage_path|paid_on/i,
  );
});
