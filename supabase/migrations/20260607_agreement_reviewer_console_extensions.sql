alter table public.agreement_review_cases
  add column if not exists reviewer_conflict_state text not null default 'not_checked',
  add column if not exists neutral_review_assignment text not null default 'unassigned',
  add column if not exists review_panel_notes text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agreement_review_cases_reviewer_conflict_state_check'
  ) then
    alter table public.agreement_review_cases
      add constraint agreement_review_cases_reviewer_conflict_state_check
      check (
        reviewer_conflict_state in (
          'not_checked',
          'no_conflict_declared',
          'possible_conflict',
          'conflict_disclosed',
          'recused'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agreement_review_cases_neutral_review_assignment_check'
  ) then
    alter table public.agreement_review_cases
      add constraint agreement_review_cases_neutral_review_assignment_check
      check (
        neutral_review_assignment in (
          'unassigned',
          'operator_review_only',
          'neutral_reviewer_assigned',
          'neutral_panel_assigned',
          'not_required_for_stage'
        )
      );
  end if;
end $$;

create index if not exists agreement_review_cases_reviewer_console_idx
  on public.agreement_review_cases (
    reviewer_conflict_state,
    neutral_review_assignment,
    status,
    sla_due_at asc
  );
