import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationNames = [
  "20260810160000_evidence_credibility_shadow_schema_core.sql",
  "20260810160001_evidence_credibility_shadow_schema_events.sql",
  "20260810160002_evidence_credibility_shadow_event_plan_refresh.sql",
  "20260810160003_evidence_credibility_shadow_evidence_materialize.sql",
  "20260810160004_evidence_credibility_shadow_evidence_rpc.sql",
  "20260810160005_evidence_credibility_shadow_settlement_materialize.sql",
  "20260810160006_evidence_credibility_shadow_settlement_rpc.sql",
  "20260810160007_evidence_credibility_shadow_differential_active.sql",
  "20260810160008_evidence_credibility_shadow_rls_grants.sql",
  "20260810160009_evidence_credibility_shadow_evidence_hardening.sql",
  "20260810160010_evidence_credibility_shadow_settlement_hardening.sql",
  "20260810160011_evidence_credibility_shadow_advisor_indexes.sql",
];

const migrations = migrationNames
  .map((filename) =>
    readFileSync(join(process.cwd(), "supabase/migrations", filename), "utf8"),
  )
  .join("\n");

function section(start, end) {
  const startIndex = migrations.lastIndexOf(start);
  const endIndex = migrations.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return migrations.slice(startIndex, endIndex);
}

test("the integration is private, versioned, and fail-closed in shadow mode", () => {
  assert.match(migrations, /'v2-evidence-decision-shadow'/i);
  assert.match(
    migrations,
    /values \(\s*'evidence_decision_v2',[\s\S]*?'shadow',[\s\S]*?false,[\s\S]*?false,[\s\S]*?false,[\s\S]*?false/i,
  );
  assert.match(
    migrations,
    /mode <> 'shadow'[\s\S]*not milestone_cutover_enabled[\s\S]*not public_effects_enabled[\s\S]*not ranking_effects_enabled[\s\S]*not eligibility_effects_enabled/i,
  );
  assert.match(
    migrations,
    /activePublicCredibilityUnaffected'[\s\S]*true/i,
  );
});

test("factual completion is stored separately from payout factor and decision confidence", () => {
  assert.match(
    migrations,
    /completion_fraction numeric\(12, 10\) not null/i,
  );
  assert.match(migrations, /payout_factor_band smallint/i);
  assert.match(migrations, /decision_confidence_band smallint not null/i);
  assert.match(
    migrations,
    /abs\(completion_fraction - \(completion_units \/ units_total\)\) < 0\.0000000001/i,
  );

  const plan = section(
    "create or replace function public.credibility_shadow_event_plan_v1",
    "create or replace function public.refresh_profile_credibility_shadow",
  );
  assert.match(
    plan,
    /'outcome', case when p_decision_status = 'eligible' then p_completion_fraction else null end/i,
  );
  assert.doesNotMatch(
    plan,
    /p_completion_fraction\s*\*\s*(?:p_)?decision_confidence/i,
  );

  const materializer = section(
    "create or replace function public.materialize_trade_evidence_decision_shadow_v1",
    "create or replace function public.record_trade_evidence_decision_v1",
  );
  assert.match(
    materializer,
    /decision_confidence_weights\s*->>\s*decision_row\.decision_confidence_band::text/i,
  );
  assert.match(materializer, /outcome_value/i);
});

test("additionality is excluded from credibility rather than inferred from occurrence evidence", () => {
  assert.match(
    migrations,
    /additionality_status text not null default 'not_evaluated'/i,
  );
  assert.match(
    migrations,
    /check \(additionality_status = 'not_evaluated'\)/i,
  );
  assert.match(
    migrations,
    /'additionalityExcluded', true/i,
  );
  assert.doesNotMatch(
    migrations,
    /additionality_status\s*=\s*'(?:verified|additional|causal)'/i,
  );
});

test("source provenance and adjudication are independent axes", () => {
  assert.match(
    migrations,
    /primary_provenance_class text not null/i,
  );
  assert.match(migrations, /adjudication_class text not null/i);
  assert.match(
    migrations,
    /\"platform_observed\":1\.0[\s\S]*\"authenticated_provider\":1\.0[\s\S]*\"independent_third_party\":1\.0[\s\S]*\"bilateral_confirmation\":0\.6[\s\S]*\"self_report\":0\.2/i,
  );
  assert.match(
    migrations,
    /'platform_established', 'provider_established', 'neutral_review_final',[\s\S]*'appeal_review_final', 'bilateral_confirmed', 'unreviewed'/i,
  );
  assert.match(
    migrations,
    /neutral-review adjudication/i,
  );
  assert.doesNotMatch(
    migrations,
    /primary_provenance_class\s*:=\s*'independent_third_party'[\s\S]*neutral_review/i,
  );
});

test("weak proof is not misconduct and deliberate fabrication remains non-compensatory", () => {
  const plan = section(
    "create or replace function public.credibility_shadow_event_plan_v1",
    "create or replace function public.refresh_profile_credibility_shadow",
  );
  assert.match(plan, /p_integrity_finding = 'supported_honest'[\s\S]*'outcome', 1/i);
  assert.match(plan, /p_integrity_finding = 'reckless_misleading'[\s\S]*'outcome', 0\.5/i);
  assert.match(plan, /p_integrity_finding = 'deliberate_fabrication'[\s\S]*'outcome', 0/i);
  assert.match(
    plan,
    /'signalType', 'forged_evidence'[\s\S]*'reasonCode', 'deliberate_evidence_fabrication'/i,
  );
  assert.match(
    migrations,
    /create table if not exists public\.credibility_shadow_restriction_signals/i,
  );
  assert.doesNotMatch(
    migrations,
    /insert into public\.credibility_restrictions[\s\S]*deliberate_evidence_fabrication/i,
  );
});

test("finality, appeal, replacement, and late-cure decisions supersede rather than double count", () => {
  assert.match(
    migrations,
    /create unique index if not exists trade_evidence_decisions_one_successor_idx[\s\S]*supersedes_decision_id/i,
  );
  assert.match(
    migrations,
    /create unique index if not exists credibility_shadow_events_one_successor_idx[\s\S]*supersedes_event_id/i,
  );
  assert.match(
    migrations,
    /The appeal must supersede the base-review decision\./i,
  );
  assert.match(
    migrations,
    /Late cure requires a final graded review\./i,
  );
  assert.match(
    migrations,
    /'replacement_expired', 'permissible_exit', 'force_majeure',[\s\S]*'mutual_cancellation', 'unjustified_abandonment', 'unresolved_dispute'/i,
  );
  assert.match(
    migrations,
    /not exists \([\s\S]*successor\.supersedes_event_id = event_row\.id/i,
  );
});

test("settlement scoring binds to the current final payment decision", () => {
  const settlement = migrations.slice(
    migrations.lastIndexOf(
      "create or replace function public.record_trade_settlement_shadow_decision_v1",
    ),
  );
  assert.match(
    settlement,
    /payment_case\.final_decision_id is distinct from payment_decision\.id/i,
  );
  assert.match(
    settlement,
    /Only the current final payment review may create a settlement decision\./i,
  );
  assert.match(
    settlement,
    /payment_decision\.decision_kind = 'appeal'[\s\S]*p_adjudication_class <> 'appeal_review_final'/i,
  );
  assert.match(
    settlement,
    /p_decision_confidence_band = 0[\s\S]*then 'review_required'/i,
  );
  assert.match(
    settlement,
    /if decision_status_value <> 'eligible' then[\s\S]*outcome_value := null/i,
  );
});

test("the active credibility pipeline changes only after an explicit future cutover", () => {
  const agreementTrigger = section(
    "create or replace function public.handle_completed_agreement_credibility",
    "create or replace function public.handle_paid_agreement_payment_credibility",
  );
  assert.match(
    agreementTrigger,
    /select coalesce\(control\.milestone_cutover_enabled, false\)/i,
  );
  assert.match(
    agreementTrigger,
    /if cutover_enabled and exists \([\s\S]*trade_agreement_milestones[\s\S]*return new/i,
  );

  const paymentTrigger = migrations.slice(
    migrations.indexOf(
      "create or replace function public.handle_paid_agreement_payment_credibility",
    ),
  );
  assert.match(
    paymentTrigger,
    /if cutover_enabled and exists \([\s\S]*trade_agreement_milestones[\s\S]*return new/i,
  );
});

test("ordinary users cannot read or directly mutate shadow records", () => {
  for (const table of [
    "credibility_shadow_model_versions",
    "credibility_shadow_controls",
    "trade_evidence_decisions",
    "trade_settlement_shadow_decisions",
    "credibility_shadow_events",
    "credibility_shadow_restriction_signals",
    "credibility_shadow_aggregates",
  ]) {
    assert.match(
      migrations,
      new RegExp(
        String.raw`alter table public\.${table} enable row level security`,
        "i",
      ),
    );
    assert.match(
      migrations,
      new RegExp(
        String.raw`revoke all on table public\.${table} from public, anon, authenticated`,
        "i",
      ),
    );
  }
  assert.match(
    migrations,
    /Evidence decisions require an active AAL2 reviewer or administrator\./i,
  );
  assert.match(
    migrations,
    /Shadow differential access requires an AAL2 administrator\./i,
  );
});

test("every new foreign key has a leading supporting index", () => {
  const requiredIndexes = [
    "credibility_shadow_aggregates_model_version_idx",
    "credibility_shadow_controls_model_version_idx",
    "credibility_shadow_controls_updated_by_idx",
    "credibility_shadow_events_agreement_id_idx",
    "credibility_shadow_events_counterparty_id_idx",
    "credibility_shadow_events_evidence_decision_id_idx",
    "credibility_shadow_events_model_version_idx",
    "credibility_shadow_events_settlement_decision_id_idx",
    "credibility_shadow_restriction_signals_profile_id_idx",
    "trade_evidence_decisions_agreement_id_idx",
    "trade_evidence_decisions_agreement_version_id_idx",
    "trade_evidence_decisions_base_review_id_idx",
    "trade_evidence_decisions_created_by_idx",
    "trade_evidence_decisions_payer_id_idx",
    "trade_settlement_shadow_decisions_payment_review_decision_id_idx",
    "trade_settlement_shadow_decisions_agreement_id_idx",
    "trade_settlement_shadow_decisions_created_by_idx",
    "trade_settlement_shadow_decisions_milestone_id_idx",
    "trade_settlement_shadow_decisions_payee_id_idx",
    "trade_settlement_shadow_decisions_payer_id_idx",
  ];

  for (const index of requiredIndexes) {
    assert.match(
      migrations,
      new RegExp(String.raw`create index if not exists ${index}`, "i"),
    );
  }
});
