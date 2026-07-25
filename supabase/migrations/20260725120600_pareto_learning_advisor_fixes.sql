-- Advisor and scale fixes for the Pareto-safe recommendation-learning schema.

create index if not exists recommendation_exposures_model_version_idx
  on public.recommendation_exposures (model_version_id)
  where model_version_id is not null;

create index if not exists recommendation_training_runs_model_version_idx
  on public.recommendation_training_runs (model_version_id)
  where model_version_id is not null;

-- Service-only relations use explicit deny policies for browser roles. The
-- service role bypasses RLS and retains the grants established by the base
-- migration.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'recommendation_model_versions',
    'recommendation_experiment_assignments',
    'recommendation_outcomes',
    'recommendation_graph_edges',
    'recommendation_user_factors',
    'recommendation_opportunity_factors',
    'recommendation_counterparty_priors',
    'recommendation_training_runs',
    'recommendation_guardrail_snapshots'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_deny_clients', table_name);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name || '_deny_clients',
      table_name
    );
  end loop;
end $$;

drop policy if exists recommendation_exposures_select_own on public.recommendation_exposures;
create policy recommendation_exposures_select_own
  on public.recommendation_exposures
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

do $$
begin
  if to_regclass('public.agreements') is not null then
    execute 'drop policy if exists recommendation_outcome_feedback_deny_clients on public.recommendation_outcome_feedback';
    execute 'drop policy if exists recommendation_outcome_feedback_select_own on public.recommendation_outcome_feedback';
    execute $policy$
      create policy recommendation_outcome_feedback_select_own
        on public.recommendation_outcome_feedback
        for select
        to authenticated
        using (
          profile_id = (select auth.uid())
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and (select auth.uid()) in (a.proposer_id, a.responder_id)
          )
        )
    $policy$;

    execute 'drop policy if exists recommendation_outcome_feedback_insert_own on public.recommendation_outcome_feedback';
    execute $policy$
      create policy recommendation_outcome_feedback_insert_own
        on public.recommendation_outcome_feedback
        for insert
        to authenticated
        with check (
          profile_id = (select auth.uid())
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and (select auth.uid()) in (a.proposer_id, a.responder_id)
              and coalesce(a.lifecycle_status, a.status::text) = 'completed'
          )
        )
    $policy$;

    execute 'drop policy if exists recommendation_outcome_feedback_update_own on public.recommendation_outcome_feedback';
    execute $policy$
      create policy recommendation_outcome_feedback_update_own
        on public.recommendation_outcome_feedback
        for update
        to authenticated
        using (
          profile_id = (select auth.uid())
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and (select auth.uid()) in (a.proposer_id, a.responder_id)
          )
        )
        with check (
          profile_id = (select auth.uid())
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and (select auth.uid()) in (a.proposer_id, a.responder_id)
              and coalesce(a.lifecycle_status, a.status::text) = 'completed'
          )
        )
    $policy$;
  else
    execute 'drop policy if exists recommendation_outcome_feedback_select_own on public.recommendation_outcome_feedback';
    execute 'drop policy if exists recommendation_outcome_feedback_insert_own on public.recommendation_outcome_feedback';
    execute 'drop policy if exists recommendation_outcome_feedback_update_own on public.recommendation_outcome_feedback';
    execute 'drop policy if exists recommendation_outcome_feedback_deny_clients on public.recommendation_outcome_feedback';
    execute 'create policy recommendation_outcome_feedback_deny_clients on public.recommendation_outcome_feedback for all to anon, authenticated using (false) with check (false)';
  end if;
end $$;
