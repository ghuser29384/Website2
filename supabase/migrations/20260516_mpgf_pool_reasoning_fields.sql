begin;

alter table public.mpgf_pool_proposals
  add column if not exists summary text,
  add column if not exists cause_area text,
  add column if not exists requested_maximum_funding_cents bigint,
  add column if not exists minimum_viable_funding_cents bigint,
  add column if not exists outcome_units_summary text,
  add column if not exists expected_effect_vs_funding text,
  add column if not exists timeline text,
  add column if not exists milestones_json jsonb not null default '[]'::jsonb,
  add column if not exists risks_json jsonb not null default '[]'::jsonb,
  add column if not exists misuse_pathways text,
  add column if not exists implementing_team_json jsonb,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_rationale text;

update public.mpgf_pool_proposals
set
  summary = coalesce(summary, problem),
  cause_area = coalesce(cause_area, 'unspecified'),
  requested_maximum_funding_cents = coalesce(requested_maximum_funding_cents, 1),
  outcome_units_summary = coalesce(outcome_units_summary, 'Unit: unspecified'),
  expected_effect_vs_funding = coalesce(expected_effect_vs_funding, intervention),
  timeline = coalesce(timeline, 'unspecified'),
  misuse_pathways = coalesce(misuse_pathways, moral_public_good_rationale),
  implementing_team_json = coalesce(
    implementing_team_json,
    case
      when nullif(trim(coalesce(proposed_recipient_name, '')), '') is null
      then jsonb_build_object('summary', 'unspecified')
      else null
    end
  )
where
  summary is null
  or cause_area is null
  or requested_maximum_funding_cents is null
  or outcome_units_summary is null
  or expected_effect_vs_funding is null
  or timeline is null
  or misuse_pathways is null
  or (
    nullif(trim(coalesce(proposed_recipient_name, '')), '') is null
    and implementing_team_json is null
  );

alter table public.mpgf_pool_proposals
  alter column summary set not null,
  alter column cause_area set not null,
  alter column requested_maximum_funding_cents set not null,
  alter column outcome_units_summary set not null,
  alter column expected_effect_vs_funding set not null,
  alter column timeline set not null,
  alter column misuse_pathways set not null;

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_requested_maximum_funding_positive,
  add constraint mpgf_pool_proposals_requested_maximum_funding_positive
    check (requested_maximum_funding_cents > 0),
  drop constraint if exists mpgf_pool_proposals_minimum_viable_funding_valid,
  add constraint mpgf_pool_proposals_minimum_viable_funding_valid
    check (
      minimum_viable_funding_cents is null
      or (
        minimum_viable_funding_cents > 0
        and minimum_viable_funding_cents <= requested_maximum_funding_cents
      )
    ),
  drop constraint if exists mpgf_pool_proposals_recipient_or_team_required,
  add constraint mpgf_pool_proposals_recipient_or_team_required
    check (
      nullif(trim(coalesce(proposed_recipient_name, '')), '') is not null
      or coalesce(jsonb_typeof(implementing_team_json) = 'object', false)
    );

commit;
