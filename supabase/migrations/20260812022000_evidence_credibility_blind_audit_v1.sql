-- Private random-audit assignment and blinded reviewer workspace for the
-- shadow-only Evidence Decision -> Contextual Credibility calibration study.
--
-- This migration never changes active public credibility, ranking, exposure,
-- safeguards, eligibility, restrictions, milestone cutover, or additionality.

create table if not exists public.evidence_credibility_calibration_sampling_runs (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null default 'v1-blind-random-audit',
  random_floor numeric(12, 10) not null,
  seed_material text not null,
  seed_commitment text not null,
  source_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint evidence_credibility_calibration_sampling_runs_policy_check
    check (policy_version = 'v1-blind-random-audit'),
  constraint evidence_credibility_calibration_sampling_runs_floor_check
    check (random_floor > 0 and random_floor <= 1),
  constraint evidence_credibility_calibration_sampling_runs_seed_check
    check (seed_material ~ '^[0-9a-f]{64}$'),
  constraint evidence_credibility_calibration_sampling_runs_commitment_check
    check (seed_commitment ~ '^[0-9a-f]{64}$'),
  constraint evidence_credibility_calibration_sampling_runs_source_check
    check (length(btrim(source_key)) between 1 and 500)
);

create table if not exists public.evidence_credibility_calibration_draws (
  id uuid primary key default gen_random_uuid(),
  sampling_run_id uuid not null
    references public.evidence_credibility_calibration_sampling_runs(id)
    on delete restrict,
  target_type text not null,
  evidence_decision_id uuid
    references public.trade_evidence_decisions(id) on delete restrict,
  settlement_decision_id uuid
    references public.trade_settlement_shadow_decisions(id) on delete restrict,
  subject_profile_id uuid not null references public.profiles(id) on delete restrict,
  counterparty_profile_id uuid references public.profiles(id) on delete set null,
  original_reviewer_id uuid references public.profiles(id) on delete set null,
  agreement_id uuid not null references public.agreements(id) on delete restrict,
  milestone_id uuid not null
    references public.trade_agreement_milestones(id) on delete restrict,
  model_version text not null,
  role text not null,
  category text not null,
  dimension text not null,
  original_status text not null,
  original_outcome numeric(12, 10),
  original_confidence_band smallint not null,
  original_provenance_class text not null,
  original_adjudication_class text not null,
  original_finality_reason text not null,
  original_integrity_finding text not null,
  original_responsiveness_finding text not null,
  original_dispute_conduct_finding text not null,
  provenance_weight numeric(8, 6) not null,
  decision_confidence_weight numeric(8, 6) not null,
  context_similarity numeric(8, 6) not null,
  stake_units numeric not null,
  decision_finalized_at timestamptz not null,
  sampling_stratum text not null,
  inclusion_probability numeric(12, 10) not null,
  random_unit numeric(12, 10) not null,
  selected boolean not null,
  selected_reason text not null,
  snapshot_hash text not null,
  created_at timestamptz not null default now(),
  constraint evidence_credibility_calibration_draws_source_check
    check (num_nonnulls(evidence_decision_id, settlement_decision_id) = 1),
  constraint evidence_credibility_calibration_draws_target_check check (
    (target_type = 'evidence_decision' and evidence_decision_id is not null)
    or (target_type = 'settlement_decision' and settlement_decision_id is not null)
  ),
  constraint evidence_credibility_calibration_draws_distinct_parties_check
    check (counterparty_profile_id is null or counterparty_profile_id <> subject_profile_id),
  constraint evidence_credibility_calibration_draws_role_check
    check (role in ('committer', 'funder', 'verifier', 'recipient', 'counterparty')),
  constraint evidence_credibility_calibration_draws_category_check
    check (category in (
      'donation', 'behavioral_pledge', 'paid_action', 'service',
      'group_purchase', 'recurring_commitment', 'other'
    )),
  constraint evidence_credibility_calibration_draws_dimension_check
    check (dimension in ('fulfilment', 'settlement')),
  constraint evidence_credibility_calibration_draws_status_check
    check (original_status in ('eligible', 'excluded', 'review_required')),
  constraint evidence_credibility_calibration_draws_outcome_check check (
    (original_status = 'eligible' and original_outcome between 0 and 1)
    or (original_status <> 'eligible' and original_outcome is null)
  ),
  constraint evidence_credibility_calibration_draws_confidence_check
    check (original_confidence_band in (0, 25, 50, 75, 100)),
  constraint evidence_credibility_calibration_draws_weights_check check (
    provenance_weight between 0 and 1
    and decision_confidence_weight between 0 and 1
    and context_similarity between 0 and 1
    and stake_units >= 0
  ),
  constraint evidence_credibility_calibration_draws_probability_check
    check (inclusion_probability > 0 and inclusion_probability <= 1),
  constraint evidence_credibility_calibration_draws_random_check
    check (random_unit >= 0 and random_unit < 1),
  constraint evidence_credibility_calibration_draws_selection_check
    check (selected = (random_unit < inclusion_probability)),
  constraint evidence_credibility_calibration_draws_reason_check
    check (selected_reason in (
      'mandatory_deliberate_fabrication',
      'mandatory_administrative_correction',
      'mandatory_zero_confidence_or_review_required',
      'random_selected',
      'random_not_selected'
    )),
  constraint evidence_credibility_calibration_draws_snapshot_hash_check
    check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  unique (evidence_decision_id),
  unique (settlement_decision_id)
);

create index if not exists evidence_credibility_calibration_draws_run_idx
  on public.evidence_credibility_calibration_draws(sampling_run_id, created_at, id);
create index if not exists evidence_credibility_calibration_draws_selected_idx
  on public.evidence_credibility_calibration_draws(selected, decision_finalized_at, id)
  where selected;
create index if not exists evidence_credibility_calibration_draws_original_reviewer_idx
  on public.evidence_credibility_calibration_draws(original_reviewer_id)
  where original_reviewer_id is not null;
create index if not exists evidence_credibility_calibration_draws_subject_idx
  on public.evidence_credibility_calibration_draws(subject_profile_id);
create index if not exists evidence_credibility_calibration_draws_counterparty_idx
  on public.evidence_credibility_calibration_draws(counterparty_profile_id)
  where counterparty_profile_id is not null;

create table if not exists public.evidence_credibility_calibration_audit_assignments (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null unique
    references public.evidence_credibility_calibration_draws(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  request_key text not null unique,
  blinding_mode text not null default 'procedural_partial',
  assigned_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint evidence_credibility_calibration_assignments_request_check
    check (length(btrim(request_key)) between 1 and 500),
  constraint evidence_credibility_calibration_assignments_blinding_check
    check (blinding_mode in ('technical_complete', 'procedural_partial')),
  constraint evidence_credibility_calibration_assignments_expiry_check
    check (expires_at > assigned_at)
);

create index if not exists evidence_credibility_calibration_assignments_reviewer_idx
  on public.evidence_credibility_calibration_audit_assignments(
    reviewer_id, expires_at, assigned_at, id
  );

create table if not exists public.evidence_credibility_calibration_assignment_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null
    references public.evidence_credibility_calibration_audit_assignments(id)
    on delete restrict,
  sequence_number integer not null,
  event_type text not null,
  reason text not null default '',
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint evidence_credibility_calibration_assignment_events_sequence_check
    check (sequence_number >= 1),
  constraint evidence_credibility_calibration_assignment_events_type_check
    check (event_type in ('assigned', 'started', 'completed', 'expired', 'excluded')),
  constraint evidence_credibility_calibration_assignment_events_reason_check check (
    event_type not in ('expired', 'excluded')
    or length(btrim(reason)) between 1 and 1000
  ),
  unique (assignment_id, sequence_number)
);

create index if not exists evidence_credibility_calibration_assignment_events_assignment_idx
  on public.evidence_credibility_calibration_assignment_events(
    assignment_id, sequence_number desc
  );

create table if not exists public.evidence_credibility_calibration_labels (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique
    references public.evidence_credibility_calibration_audit_assignments(id)
    on delete restrict,
  request_key text not null unique,
  label_tier text not null default 'blinded_random_rereview',
  final_status text not null,
  final_outcome numeric(12, 10),
  final_finality_reason text not null,
  final_integrity_finding text not null,
  final_responsiveness_finding text not null,
  final_dispute_conduct_finding text not null,
  materially_upheld boolean not null,
  absolute_error numeric(12, 10),
  blinding_complete boolean not null,
  private_rationale text not null,
  label_hash text not null,
  completed_by uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint evidence_credibility_calibration_labels_request_check
    check (length(btrim(request_key)) between 1 and 500),
  constraint evidence_credibility_calibration_labels_tier_check
    check (label_tier = 'blinded_random_rereview'),
  constraint evidence_credibility_calibration_labels_status_check
    check (final_status in ('eligible', 'excluded', 'review_required')),
  constraint evidence_credibility_calibration_labels_outcome_check check (
    (final_status = 'eligible' and final_outcome between 0 and 1)
    or (final_status <> 'eligible' and final_outcome is null)
  ),
  constraint evidence_credibility_calibration_labels_absolute_error_check
    check (absolute_error is null or absolute_error between 0 and 1),
  constraint evidence_credibility_calibration_labels_rationale_check
    check (length(btrim(private_rationale)) between 1 and 4000),
  constraint evidence_credibility_calibration_labels_hash_check
    check (label_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists evidence_credibility_calibration_labels_completed_by_idx
  on public.evidence_credibility_calibration_labels(completed_by, completed_at desc);

drop trigger if exists evidence_credibility_calibration_sampling_runs_append_only
  on public.evidence_credibility_calibration_sampling_runs;
create trigger evidence_credibility_calibration_sampling_runs_append_only
before update or delete on public.evidence_credibility_calibration_sampling_runs
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

drop trigger if exists evidence_credibility_calibration_draws_append_only
  on public.evidence_credibility_calibration_draws;
create trigger evidence_credibility_calibration_draws_append_only
before update or delete on public.evidence_credibility_calibration_draws
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

drop trigger if exists evidence_credibility_calibration_assignments_append_only
  on public.evidence_credibility_calibration_audit_assignments;
create trigger evidence_credibility_calibration_assignments_append_only
before update or delete on public.evidence_credibility_calibration_audit_assignments
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

drop trigger if exists evidence_credibility_calibration_assignment_events_append_only
  on public.evidence_credibility_calibration_assignment_events;
create trigger evidence_credibility_calibration_assignment_events_append_only
before update or delete on public.evidence_credibility_calibration_assignment_events
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

drop trigger if exists evidence_credibility_calibration_labels_append_only
  on public.evidence_credibility_calibration_labels;
create trigger evidence_credibility_calibration_labels_append_only
before update or delete on public.evidence_credibility_calibration_labels
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

alter table public.evidence_credibility_calibration_sampling_runs enable row level security;
alter table public.evidence_credibility_calibration_draws enable row level security;
alter table public.evidence_credibility_calibration_audit_assignments enable row level security;
alter table public.evidence_credibility_calibration_assignment_events enable row level security;
alter table public.evidence_credibility_calibration_labels enable row level security;

revoke all on table public.evidence_credibility_calibration_sampling_runs
  from public, anon, authenticated;
revoke all on table public.evidence_credibility_calibration_draws
  from public, anon, authenticated;
revoke all on table public.evidence_credibility_calibration_audit_assignments
  from public, anon, authenticated;
revoke all on table public.evidence_credibility_calibration_assignment_events
  from public, anon, authenticated;
revoke all on table public.evidence_credibility_calibration_labels
  from public, anon, authenticated;

grant select on table public.evidence_credibility_calibration_sampling_runs to service_role;
grant select on table public.evidence_credibility_calibration_draws to service_role;
grant select on table public.evidence_credibility_calibration_audit_assignments to service_role;
grant select on table public.evidence_credibility_calibration_assignment_events to service_role;
grant select on table public.evidence_credibility_calibration_labels to service_role;

create or replace function moral_trade_private.require_calibration_audit_administrator()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Calibration audit administration requires an AAL2 Moral Trade administrator.';
  end if;

  if not exists (
    select 1
    from public.credibility_shadow_controls control
    where control.control_key = 'evidence_decision_v2'
      and control.mode = 'shadow'
      and not control.milestone_cutover_enabled
      and not control.public_effects_enabled
      and not control.ranking_effects_enabled
      and not control.eligibility_effects_enabled
  ) then
    raise exception 'Calibration auditing is unavailable unless every active-effect switch is fail-closed.';
  end if;
end;
$function$;

create or replace function moral_trade_private.require_calibration_audit_reviewer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not moral_trade_private.current_actor_has_trade_role('reviewer') then
    raise exception 'Calibration review requires an active AAL2 Moral Trade reviewer.';
  end if;
  return auth.uid();
end;
$function$;

create or replace function moral_trade_private.calibration_random_unit_v1(
  p_seed text,
  p_target_type text,
  p_target_id uuid
)
returns numeric
language sql
immutable
set search_path = ''
as $function$
  select (
    ('x' || substr(
      encode(
        extensions.digest(
          convert_to(
            p_seed || chr(31) || p_target_type || chr(31) || p_target_id::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      1,
      15
    ))::bit(60)::bigint
  )::numeric / 1152921504606846976::numeric;
$function$;

revoke execute on function moral_trade_private.require_calibration_audit_administrator()
  from public, anon, authenticated, service_role;
revoke execute on function moral_trade_private.require_calibration_audit_reviewer()
  from public, anon, authenticated, service_role;
revoke execute on function moral_trade_private.calibration_random_unit_v1(text, text, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.materialize_evidence_credibility_calibration_draws_v1(
  p_random_floor numeric,
  p_sampling_seed text,
  p_source_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  run_id_value uuid;
  existing_run public.evidence_credibility_calibration_sampling_runs%rowtype;
  evidence_count integer := 0;
  settlement_count integer := 0;
  selected_count integer := 0;
begin
  perform moral_trade_private.require_calibration_audit_administrator();

  if p_random_floor <= 0 or p_random_floor > 1 then
    raise exception 'Random-audit floor must be greater than zero and at most one.';
  end if;
  if p_sampling_seed !~ '^[0-9a-f]{64}$' then
    raise exception 'Sampling seed must be exactly 64 lowercase hexadecimal characters.';
  end if;
  if length(btrim(coalesce(p_source_key, ''))) not between 1 and 500 then
    raise exception 'Sampling source key is invalid.';
  end if;

  select * into existing_run
  from public.evidence_credibility_calibration_sampling_runs sampling_run
  where sampling_run.source_key = p_source_key;
  if found then
    if existing_run.random_floor is distinct from p_random_floor
       or existing_run.seed_material is distinct from p_sampling_seed then
      raise exception 'The immutable sampling run differs from this request.';
    end if;
    return jsonb_build_object(
      'samplingRunId', existing_run.id,
      'status', 'replayed',
      'drawCount', (
        select count(*) from public.evidence_credibility_calibration_draws draw
        where draw.sampling_run_id = existing_run.id
      ),
      'selectedCount', (
        select count(*) from public.evidence_credibility_calibration_draws draw
        where draw.sampling_run_id = existing_run.id and draw.selected
      ),
      'shadowOnly', true
    );
  end if;

  insert into public.evidence_credibility_calibration_sampling_runs(
    random_floor,
    seed_material,
    seed_commitment,
    source_key,
    created_by
  ) values (
    p_random_floor,
    p_sampling_seed,
    encode(
      extensions.digest(convert_to(p_sampling_seed, 'UTF8'), 'sha256'),
      'hex'
    ),
    btrim(p_source_key),
    actor_id
  ) returning id into run_id_value;

  with candidate as (
    select
      decision_record.*,
      review.reviewer_id as original_reviewer_id_value,
      event_row.model_version,
      event_row.role,
      event_row.category,
      event_row.dimension,
      event_row.provenance_weight,
      event_row.decision_confidence_weight,
      event_row.context_similarity,
      event_row.stake_units,
      case
        when decision_record.integrity_finding = 'deliberate_fabrication'
          then 'mandatory_deliberate_fabrication'
        when decision_record.finality_reason = 'administrative_correction'
          then 'mandatory_administrative_correction'
        when decision_record.decision_confidence_band = 0
          or decision_record.decision_status = 'review_required'
          then 'mandatory_zero_confidence_or_review_required'
        else null
      end as mandatory_reason,
      moral_trade_private.calibration_random_unit_v1(
        p_sampling_seed,
        'evidence_decision',
        decision_record.id
      ) as random_value
    from public.trade_evidence_decisions decision_record
    join public.trade_shadow_capture_records capture
      on capture.evidence_decision_id = decision_record.id
    left join public.trade_milestone_reviews review
      on review.id = decision_record.review_id
    join lateral (
      select shadow_event.*
      from public.credibility_shadow_events shadow_event
      where shadow_event.evidence_decision_id = decision_record.id
        and shadow_event.dimension = 'fulfilment'
      order by shadow_event.created_at desc, shadow_event.id desc
      limit 1
    ) event_row on true
    where not exists (
      select 1 from public.trade_evidence_decisions successor
      where successor.supersedes_decision_id = decision_record.id
    )
      and not exists (
        select 1 from public.evidence_credibility_calibration_draws existing_draw
        where existing_draw.evidence_decision_id = decision_record.id
      )
  ), inserted as (
    insert into public.evidence_credibility_calibration_draws(
      sampling_run_id,
      target_type,
      evidence_decision_id,
      subject_profile_id,
      counterparty_profile_id,
      original_reviewer_id,
      agreement_id,
      milestone_id,
      model_version,
      role,
      category,
      dimension,
      original_status,
      original_outcome,
      original_confidence_band,
      original_provenance_class,
      original_adjudication_class,
      original_finality_reason,
      original_integrity_finding,
      original_responsiveness_finding,
      original_dispute_conduct_finding,
      provenance_weight,
      decision_confidence_weight,
      context_similarity,
      stake_units,
      decision_finalized_at,
      sampling_stratum,
      inclusion_probability,
      random_unit,
      selected,
      selected_reason,
      snapshot_hash
    )
    select
      run_id_value,
      'evidence_decision',
      candidate.id,
      candidate.performer_id,
      candidate.payer_id,
      candidate.original_reviewer_id_value,
      candidate.agreement_id,
      candidate.milestone_id,
      candidate.model_version,
      candidate.role,
      candidate.category,
      'fulfilment',
      candidate.decision_status,
      case when candidate.decision_status = 'eligible'
        then candidate.completion_fraction else null end,
      candidate.decision_confidence_band,
      candidate.primary_provenance_class,
      candidate.adjudication_class,
      candidate.finality_reason,
      candidate.integrity_finding,
      candidate.responsiveness_finding,
      candidate.dispute_conduct_finding,
      candidate.provenance_weight,
      candidate.decision_confidence_weight,
      candidate.context_similarity,
      candidate.stake_units,
      candidate.finalized_at,
      concat_ws('|',
        'evidence', candidate.category, candidate.role,
        candidate.primary_provenance_class,
        candidate.decision_confidence_band::text,
        candidate.finality_reason
      ),
      case when candidate.mandatory_reason is not null
        then 1 else p_random_floor end,
      candidate.random_value,
      candidate.random_value < case when candidate.mandatory_reason is not null
        then 1 else p_random_floor end,
      coalesce(
        candidate.mandatory_reason,
        case when candidate.random_value < p_random_floor
          then 'random_selected' else 'random_not_selected' end
      ),
      encode(
        extensions.digest(
          convert_to(
            jsonb_build_object(
              'targetType', 'evidence_decision',
              'decisionId', candidate.id,
              'modelVersion', candidate.model_version,
              'status', candidate.decision_status,
              'outcome', case when candidate.decision_status = 'eligible'
                then candidate.completion_fraction else null end,
              'confidenceBand', candidate.decision_confidence_band,
              'provenanceClass', candidate.primary_provenance_class,
              'adjudicationClass', candidate.adjudication_class,
              'finalityReason', candidate.finality_reason,
              'integrityFinding', candidate.integrity_finding,
              'responsivenessFinding', candidate.responsiveness_finding,
              'disputeConductFinding', candidate.dispute_conduct_finding,
              'provenanceWeight', candidate.provenance_weight,
              'decisionConfidenceWeight', candidate.decision_confidence_weight,
              'contextSimilarity', candidate.context_similarity,
              'stakeUnits', candidate.stake_units,
              'finalizedAt', candidate.finalized_at
            )::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
    from candidate
    returning selected
  )
  select count(*)::integer,
         count(*) filter (where selected)::integer
  into evidence_count, selected_count
  from inserted;

  with candidate as (
    select
      decision_record.*,
      payment_review.reviewer_id as original_reviewer_id_value,
      event_row.model_version,
      event_row.role,
      event_row.category,
      event_row.dimension,
      event_row.provenance_weight,
      event_row.decision_confidence_weight,
      event_row.context_similarity,
      event_row.stake_units,
      case
        when decision_record.finality_reason = 'administrative_correction'
          then 'mandatory_administrative_correction'
        when decision_record.decision_confidence_band = 0
          or decision_record.decision_status = 'review_required'
          then 'mandatory_zero_confidence_or_review_required'
        else null
      end as mandatory_reason,
      moral_trade_private.calibration_random_unit_v1(
        p_sampling_seed,
        'settlement_decision',
        decision_record.id
      ) as random_value
    from public.trade_settlement_shadow_decisions decision_record
    join public.trade_shadow_capture_records capture
      on capture.settlement_decision_id = decision_record.id
    left join public.trade_payment_review_decisions payment_review
      on payment_review.id = decision_record.payment_review_decision_id
    join lateral (
      select shadow_event.*
      from public.credibility_shadow_events shadow_event
      where shadow_event.settlement_decision_id = decision_record.id
        and shadow_event.dimension = 'settlement'
      order by shadow_event.created_at desc, shadow_event.id desc
      limit 1
    ) event_row on true
    where not exists (
      select 1 from public.trade_settlement_shadow_decisions successor
      where successor.supersedes_decision_id = decision_record.id
    )
      and not exists (
        select 1 from public.evidence_credibility_calibration_draws existing_draw
        where existing_draw.settlement_decision_id = decision_record.id
      )
  ), inserted as (
    insert into public.evidence_credibility_calibration_draws(
      sampling_run_id,
      target_type,
      settlement_decision_id,
      subject_profile_id,
      counterparty_profile_id,
      original_reviewer_id,
      agreement_id,
      milestone_id,
      model_version,
      role,
      category,
      dimension,
      original_status,
      original_outcome,
      original_confidence_band,
      original_provenance_class,
      original_adjudication_class,
      original_finality_reason,
      original_integrity_finding,
      original_responsiveness_finding,
      original_dispute_conduct_finding,
      provenance_weight,
      decision_confidence_weight,
      context_similarity,
      stake_units,
      decision_finalized_at,
      sampling_stratum,
      inclusion_probability,
      random_unit,
      selected,
      selected_reason,
      snapshot_hash
    )
    select
      run_id_value,
      'settlement_decision',
      candidate.id,
      candidate.payer_id,
      candidate.payee_id,
      candidate.original_reviewer_id_value,
      candidate.agreement_id,
      candidate.milestone_id,
      candidate.model_version,
      candidate.role,
      candidate.category,
      'settlement',
      candidate.decision_status,
      case when candidate.decision_status = 'eligible'
        then candidate.outcome else null end,
      candidate.decision_confidence_band,
      candidate.primary_provenance_class,
      candidate.adjudication_class,
      candidate.finality_reason,
      'not_applicable',
      'not_applicable',
      'not_applicable',
      candidate.provenance_weight,
      candidate.decision_confidence_weight,
      candidate.context_similarity,
      candidate.stake_units,
      candidate.finalized_at,
      concat_ws('|',
        'settlement', candidate.category, candidate.role,
        candidate.primary_provenance_class,
        candidate.decision_confidence_band::text,
        candidate.finality_reason
      ),
      case when candidate.mandatory_reason is not null
        then 1 else p_random_floor end,
      candidate.random_value,
      candidate.random_value < case when candidate.mandatory_reason is not null
        then 1 else p_random_floor end,
      coalesce(
        candidate.mandatory_reason,
        case when candidate.random_value < p_random_floor
          then 'random_selected' else 'random_not_selected' end
      ),
      encode(
        extensions.digest(
          convert_to(
            jsonb_build_object(
              'targetType', 'settlement_decision',
              'decisionId', candidate.id,
              'modelVersion', candidate.model_version,
              'status', candidate.decision_status,
              'outcome', case when candidate.decision_status = 'eligible'
                then candidate.outcome else null end,
              'confidenceBand', candidate.decision_confidence_band,
              'provenanceClass', candidate.primary_provenance_class,
              'adjudicationClass', candidate.adjudication_class,
              'finalityReason', candidate.finality_reason,
              'provenanceWeight', candidate.provenance_weight,
              'decisionConfidenceWeight', candidate.decision_confidence_weight,
              'contextSimilarity', candidate.context_similarity,
              'stakeUnits', candidate.stake_units,
              'finalizedAt', candidate.finalized_at
            )::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
    from candidate
    returning selected
  )
  select count(*)::integer,
         count(*) filter (where selected)::integer
  into settlement_count, selected_count
  from inserted;

  return jsonb_build_object(
    'samplingRunId', run_id_value,
    'status', 'materialized',
    'evidenceDrawCount', evidence_count,
    'settlementDrawCount', settlement_count,
    'selectedCount', (
      select count(*) from public.evidence_credibility_calibration_draws draw
      where draw.sampling_run_id = run_id_value and draw.selected
    ),
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.list_evidence_credibility_calibration_assignment_queue_v1(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  draw_id uuid,
  case_code text,
  target_type text,
  sampling_stratum text,
  inclusion_probability numeric,
  selected_reason text,
  action_category text,
  role text,
  decision_finalized_at timestamptz,
  excluded_reviewer_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_calibration_audit_administrator();
  if p_limit < 1 or p_limit > 500 or p_offset < 0 then
    raise exception 'Invalid calibration-assignment queue page.';
  end if;

  return query
  select
    draw.id,
    'AUD-' || upper(substr(replace(draw.id::text, '-', ''), 1, 12)),
    draw.target_type,
    draw.sampling_stratum,
    draw.inclusion_probability,
    draw.selected_reason,
    draw.category,
    draw.role,
    draw.decision_finalized_at,
    array_remove(array[
      draw.subject_profile_id,
      draw.counterparty_profile_id,
      draw.original_reviewer_id
    ]::uuid[], null)
  from public.evidence_credibility_calibration_draws draw
  where draw.selected
    and not exists (
      select 1
      from public.evidence_credibility_calibration_audit_assignments assignment
      where assignment.draw_id = draw.id
    )
  order by draw.decision_finalized_at, draw.id
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.assign_evidence_credibility_calibration_audit_v1(
  p_draw_id uuid,
  p_reviewer_id uuid,
  p_request_key text,
  p_expires_at timestamptz default (now() + interval '14 days')
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  draw_row public.evidence_credibility_calibration_draws%rowtype;
  existing_assignment public.evidence_credibility_calibration_audit_assignments%rowtype;
  assignment_id_value uuid;
begin
  perform moral_trade_private.require_calibration_audit_administrator();
  if length(btrim(coalesce(p_request_key, ''))) not between 1 and 500 then
    raise exception 'Audit-assignment request key is invalid.';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '90 days' then
    raise exception 'Audit-assignment expiry must be within the next 90 days.';
  end if;

  select * into existing_assignment
  from public.evidence_credibility_calibration_audit_assignments assignment
  where assignment.request_key = p_request_key;
  if found then
    if existing_assignment.draw_id is distinct from p_draw_id
       or existing_assignment.reviewer_id is distinct from p_reviewer_id then
      raise exception 'The immutable audit-assignment request differs from this request.';
    end if;
    return jsonb_build_object(
      'assignmentId', existing_assignment.id,
      'status', 'replayed',
      'shadowOnly', true
    );
  end if;

  select * into draw_row
  from public.evidence_credibility_calibration_draws draw
  where draw.id = p_draw_id
  for share;
  if not found or not draw_row.selected then
    raise exception 'Only a selected calibration draw may be assigned.';
  end if;
  if exists (
    select 1 from public.evidence_credibility_calibration_audit_assignments assignment
    where assignment.draw_id = draw_row.id
  ) then
    raise exception 'This selected calibration draw is already assigned.';
  end if;
  if p_reviewer_id in (
    draw_row.subject_profile_id,
    draw_row.counterparty_profile_id,
    draw_row.original_reviewer_id
  ) then
    raise exception 'The calibration reviewer must be independent of the original reviewer and parties.';
  end if;
  if not exists (
    select 1 from public.trade_review_role_grants reviewer_grant
    where reviewer_grant.profile_id = p_reviewer_id
      and reviewer_grant.role = 'reviewer'
      and reviewer_grant.active
      and reviewer_grant.revoked_at is null
  ) then
    raise exception 'The assigned profile is not an active Moral Trade reviewer.';
  end if;

  insert into public.evidence_credibility_calibration_audit_assignments(
    draw_id,
    reviewer_id,
    assigned_by,
    request_key,
    blinding_mode,
    expires_at
  ) values (
    draw_row.id,
    p_reviewer_id,
    actor_id,
    btrim(p_request_key),
    'procedural_partial',
    p_expires_at
  ) returning id into assignment_id_value;

  insert into public.evidence_credibility_calibration_assignment_events(
    assignment_id,
    sequence_number,
    event_type,
    actor_id
  ) values (
    assignment_id_value,
    1,
    'assigned',
    actor_id
  );

  return jsonb_build_object(
    'assignmentId', assignment_id_value,
    'status', 'assigned',
    'caseCode', 'AUD-' || upper(substr(replace(draw_row.id::text, '-', ''), 1, 12)),
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.list_my_evidence_credibility_calibration_audits_v1(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  assignment_id uuid,
  case_code text,
  target_type text,
  assigned_at timestamptz,
  expires_at timestamptz,
  blinding_mode text,
  action_category text,
  obligation_description text,
  unit_label text,
  units_total numeric,
  indivisible boolean,
  evidence_rule text,
  no_trade_baseline text,
  maximum_amount_cents bigint,
  currency text,
  evidence_items jsonb,
  payment_receipt jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  reviewer_id_value uuid := moral_trade_private.require_calibration_audit_reviewer();
begin
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'Invalid blinded-audit page.';
  end if;

  return query
  select
    assignment.id,
    'AUD-' || upper(substr(replace(draw.id::text, '-', ''), 1, 12)),
    draw.target_type,
    assignment.assigned_at,
    assignment.expires_at,
    assignment.blinding_mode,
    milestone.action_category,
    milestone.description,
    milestone.unit_label,
    milestone.units_total,
    milestone.indivisible,
    milestone.evidence_rule,
    version.no_trade_baseline,
    milestone.maximum_amount_cents,
    milestone.currency,
    case when draw.target_type = 'evidence_decision' then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'itemId', item.id,
          'evidenceType', item.evidence_type,
          'attestation', case when item.evidence_type = 'attestation'
            then item.attestation else '' end,
          'evidenceUrl', case when item.evidence_type = 'link'
            then item.evidence_url else '' end,
          'hasPrivateFile', item.evidence_type = 'file'
        ) order by item.created_at, item.id
      )
      from public.trade_evidence_decisions evidence_decision
      join public.trade_milestone_reviews review
        on review.id = evidence_decision.review_id
      join public.trade_evidence_bundle_items item
        on item.bundle_id = review.bundle_id
      where evidence_decision.id = draw.evidence_decision_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    case when draw.target_type = 'settlement_decision' then coalesce((
      select jsonb_build_object(
        'receiptId', receipt.id,
        'provider', receipt.provider,
        'amountCents', receipt.amount_cents,
        'currency', receipt.currency,
        'paidOn', receipt.paid_on,
        'hasPrivateFile', length(btrim(receipt.receipt_storage_path)) > 0
      )
      from public.trade_settlement_shadow_decisions settlement_decision
      left join public.trade_payment_review_decisions payment_decision
        on payment_decision.id = settlement_decision.payment_review_decision_id
      left join lateral (
        select candidate_receipt.*
        from public.trade_external_payment_receipts candidate_receipt
        where candidate_receipt.payout_id = settlement_decision.payout_id
          and (
            payment_decision.receipt_id is null
            or candidate_receipt.id = payment_decision.receipt_id
          )
        order by candidate_receipt.payment_cycle desc,
          candidate_receipt.attempt_number desc,
          candidate_receipt.reported_at desc,
          candidate_receipt.id desc
        limit 1
      ) receipt on true
      where settlement_decision.id = draw.settlement_decision_id
        and receipt.id is not null
    ), '{}'::jsonb) else '{}'::jsonb end
  from public.evidence_credibility_calibration_audit_assignments assignment
  join public.evidence_credibility_calibration_draws draw
    on draw.id = assignment.draw_id
  join public.trade_agreement_milestones milestone
    on milestone.id = draw.milestone_id
  join public.trade_agreement_versions version
    on version.id = milestone.agreement_version_id
   and version.agreement_id = milestone.agreement_id
  where assignment.reviewer_id = reviewer_id_value
    and assignment.expires_at > now()
    and not exists (
      select 1 from public.evidence_credibility_calibration_labels label
      where label.assignment_id = assignment.id
    )
    and not exists (
      select 1
      from public.evidence_credibility_calibration_assignment_events terminal_event
      where terminal_event.assignment_id = assignment.id
        and terminal_event.event_type in ('expired', 'excluded')
    )
  order by assignment.assigned_at, assignment.id
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.record_evidence_credibility_calibration_label_v1(
  p_assignment_id uuid,
  p_request_key text,
  p_final_status text,
  p_final_outcome numeric,
  p_final_finality_reason text,
  p_final_integrity_finding text,
  p_final_responsiveness_finding text,
  p_final_dispute_conduct_finding text,
  p_blinding_complete boolean,
  p_private_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  reviewer_id_value uuid := moral_trade_private.require_calibration_audit_reviewer();
  assignment_row public.evidence_credibility_calibration_audit_assignments%rowtype;
  draw_row public.evidence_credibility_calibration_draws%rowtype;
  existing_label public.evidence_credibility_calibration_labels%rowtype;
  label_id_value uuid;
  material_upheld_value boolean;
  absolute_error_value numeric(12, 10);
  label_hash_value text;
  next_sequence integer;
begin
  if length(btrim(coalesce(p_request_key, ''))) not between 1 and 500 then
    raise exception 'Calibration-label request key is invalid.';
  end if;
  if length(btrim(coalesce(p_private_rationale, ''))) not between 1 and 4000 then
    raise exception 'A private independent-review rationale is required.';
  end if;
  if p_final_status not in ('eligible', 'excluded', 'review_required') then
    raise exception 'Choose a permitted independent final status.';
  end if;
  if (p_final_status = 'eligible' and (p_final_outcome is null or p_final_outcome < 0 or p_final_outcome > 1))
     or (p_final_status <> 'eligible' and p_final_outcome is not null) then
    raise exception 'Independent outcome is inconsistent with the final status.';
  end if;

  select * into existing_label
  from public.evidence_credibility_calibration_labels label
  where label.request_key = p_request_key;
  if found then
    if existing_label.assignment_id is distinct from p_assignment_id then
      raise exception 'The immutable calibration-label request differs from this request.';
    end if;
    return jsonb_build_object(
      'labelId', existing_label.id,
      'status', 'replayed',
      'materiallyUpheld', existing_label.materially_upheld,
      'absoluteError', existing_label.absolute_error,
      'shadowOnly', true
    );
  end if;

  select * into assignment_row
  from public.evidence_credibility_calibration_audit_assignments assignment
  where assignment.id = p_assignment_id
  for update;
  if not found or assignment_row.reviewer_id <> reviewer_id_value then
    raise exception 'This blind calibration assignment is unavailable to the current reviewer.';
  end if;
  if assignment_row.expires_at <= now() then
    raise exception 'This blind calibration assignment has expired.';
  end if;
  if exists (
    select 1 from public.evidence_credibility_calibration_labels label
    where label.assignment_id = assignment_row.id
  ) then
    raise exception 'This blind calibration assignment already has a terminal label.';
  end if;

  select * into draw_row
  from public.evidence_credibility_calibration_draws draw
  where draw.id = assignment_row.draw_id;

  if draw_row.target_type = 'settlement_decision'
     and p_final_status = 'eligible'
     and p_final_outcome not in (0, 1) then
    raise exception 'Independent settlement outcomes must be paid or still due.';
  end if;

  absolute_error_value := case
    when draw_row.original_outcome is not null and p_final_outcome is not null
      then abs(draw_row.original_outcome - p_final_outcome)
    else null
  end;

  material_upheld_value :=
    p_final_status = draw_row.original_status
    and p_final_finality_reason = draw_row.original_finality_reason
    and (
      (draw_row.original_outcome is null and p_final_outcome is null)
      or (
        draw_row.original_outcome is not null
        and p_final_outcome is not null
        and abs(draw_row.original_outcome - p_final_outcome) <= 0.05
      )
    )
    and (
      draw_row.target_type = 'settlement_decision'
      or (
        p_final_integrity_finding = draw_row.original_integrity_finding
        and p_final_responsiveness_finding = draw_row.original_responsiveness_finding
        and p_final_dispute_conduct_finding = draw_row.original_dispute_conduct_finding
      )
    );

  label_hash_value := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'assignmentId', assignment_row.id,
          'snapshotHash', draw_row.snapshot_hash,
          'finalStatus', p_final_status,
          'finalOutcome', p_final_outcome,
          'finalFinalityReason', btrim(p_final_finality_reason),
          'finalIntegrityFinding', btrim(p_final_integrity_finding),
          'finalResponsivenessFinding', btrim(p_final_responsiveness_finding),
          'finalDisputeConductFinding', btrim(p_final_dispute_conduct_finding),
          'materiallyUpheld', material_upheld_value,
          'absoluteError', absolute_error_value,
          'blindingComplete', p_blinding_complete,
          'privateRationale', btrim(p_private_rationale)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.evidence_credibility_calibration_labels(
    assignment_id,
    request_key,
    final_status,
    final_outcome,
    final_finality_reason,
    final_integrity_finding,
    final_responsiveness_finding,
    final_dispute_conduct_finding,
    materially_upheld,
    absolute_error,
    blinding_complete,
    private_rationale,
    label_hash,
    completed_by
  ) values (
    assignment_row.id,
    btrim(p_request_key),
    p_final_status,
    p_final_outcome,
    btrim(p_final_finality_reason),
    btrim(p_final_integrity_finding),
    btrim(p_final_responsiveness_finding),
    btrim(p_final_dispute_conduct_finding),
    material_upheld_value,
    absolute_error_value,
    p_blinding_complete,
    btrim(p_private_rationale),
    label_hash_value,
    reviewer_id_value
  ) returning id into label_id_value;

  select coalesce(max(event.sequence_number), 0) + 1
  into next_sequence
  from public.evidence_credibility_calibration_assignment_events event
  where event.assignment_id = assignment_row.id;

  insert into public.evidence_credibility_calibration_assignment_events(
    assignment_id,
    sequence_number,
    event_type,
    actor_id
  ) values (
    assignment_row.id,
    next_sequence,
    'completed',
    reviewer_id_value
  );

  return jsonb_build_object(
    'labelId', label_id_value,
    'status', 'completed',
    'materiallyUpheld', material_upheld_value,
    'absoluteError', absolute_error_value,
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.can_access_my_evidence_credibility_calibration_file_v1(
  p_assignment_id uuid,
  p_item_kind text,
  p_item_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  reviewer_id_value uuid := moral_trade_private.require_calibration_audit_reviewer();
begin
  if p_item_kind not in ('evidence_item', 'payment_receipt') then
    return false;
  end if;

  return exists (
    select 1
    from public.evidence_credibility_calibration_audit_assignments assignment
    join public.evidence_credibility_calibration_draws draw
      on draw.id = assignment.draw_id
    where assignment.id = p_assignment_id
      and assignment.reviewer_id = reviewer_id_value
      and assignment.expires_at > now()
      and not exists (
        select 1 from public.evidence_credibility_calibration_labels label
        where label.assignment_id = assignment.id
      )
      and (
        (
          p_item_kind = 'evidence_item'
          and draw.target_type = 'evidence_decision'
          and exists (
            select 1
            from public.trade_evidence_decisions evidence_decision
            join public.trade_milestone_reviews review
              on review.id = evidence_decision.review_id
            join public.trade_evidence_bundle_items item
              on item.bundle_id = review.bundle_id
            where evidence_decision.id = draw.evidence_decision_id
              and item.id = p_item_id
              and item.evidence_type = 'file'
              and length(btrim(item.storage_path)) > 0
          )
        )
        or (
          p_item_kind = 'payment_receipt'
          and draw.target_type = 'settlement_decision'
          and exists (
            select 1
            from public.trade_settlement_shadow_decisions settlement_decision
            join public.trade_external_payment_receipts receipt
              on receipt.payout_id = settlement_decision.payout_id
            where settlement_decision.id = draw.settlement_decision_id
              and receipt.id = p_item_id
              and length(btrim(receipt.receipt_storage_path)) > 0
          )
        )
      )
  );
end;
$function$;

revoke all on function public.materialize_evidence_credibility_calibration_draws_v1(numeric, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.list_evidence_credibility_calibration_assignment_queue_v1(integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.assign_evidence_credibility_calibration_audit_v1(uuid, uuid, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.list_my_evidence_credibility_calibration_audits_v1(integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.record_evidence_credibility_calibration_label_v1(
  uuid, text, text, numeric, text, text, text, text, boolean, text
) from public, anon, authenticated, service_role;
revoke all on function public.can_access_my_evidence_credibility_calibration_file_v1(uuid, text, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.materialize_evidence_credibility_calibration_draws_v1(numeric, text, text)
  to authenticated, service_role;
grant execute on function public.list_evidence_credibility_calibration_assignment_queue_v1(integer, integer)
  to authenticated, service_role;
grant execute on function public.assign_evidence_credibility_calibration_audit_v1(uuid, uuid, text, timestamptz)
  to authenticated, service_role;
grant execute on function public.list_my_evidence_credibility_calibration_audits_v1(integer, integer)
  to authenticated;
grant execute on function public.record_evidence_credibility_calibration_label_v1(
  uuid, text, text, numeric, text, text, text, text, boolean, text
) to authenticated;
grant execute on function public.can_access_my_evidence_credibility_calibration_file_v1(uuid, text, uuid)
  to authenticated;

notify pgrst, 'reload schema';
