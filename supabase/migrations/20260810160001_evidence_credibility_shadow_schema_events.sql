create table if not exists public.trade_settlement_shadow_decisions (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.trade_milestone_payouts(id) on delete restrict,
  agreement_id uuid not null references public.agreements(id) on delete restrict,
  milestone_id uuid not null references public.trade_agreement_milestones(id) on delete restrict,
  payment_review_decision_id uuid references public.trade_payment_review_decisions(id) on delete restrict,
  supersedes_decision_id uuid references public.trade_settlement_shadow_decisions(id) on delete restrict,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  payee_id uuid not null references public.profiles(id) on delete restrict,
  decision_status text not null,
  outcome numeric(4, 3),
  decision_confidence_band smallint not null,
  primary_provenance_class text not null,
  provider_authentication_status text not null default 'not_applicable',
  provider_authentication_ref text not null default '',
  adjudication_class text not null,
  finality_reason text not null,
  exclusion_reason text not null default '',
  decision_hash text not null,
  source_key text not null unique,
  occurred_at timestamptz not null,
  finalized_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint trade_settlement_shadow_decisions_distinct_roles_check
    check (payer_id <> payee_id),
  constraint trade_settlement_shadow_decisions_status_check
    check (decision_status in ('eligible', 'excluded', 'review_required')),
  constraint trade_settlement_shadow_decisions_outcome_check check (
    (decision_status = 'eligible' and outcome between 0 and 1)
    or (decision_status <> 'eligible' and outcome is null)
  ),
  constraint trade_settlement_shadow_decisions_confidence_check
    check (decision_confidence_band in (0, 25, 50, 75, 100)),
  constraint trade_settlement_shadow_decisions_provenance_check
    check (primary_provenance_class in (
      'platform_observed', 'authenticated_provider', 'independent_third_party',
      'bilateral_confirmation', 'self_report'
    )),
  constraint trade_settlement_shadow_decisions_provider_authentication_check check (
    provider_authentication_status in (
      'not_applicable', 'authenticated', 'unverified', 'failed',
      'manual_review_required'
    )
    and (
      (primary_provenance_class = 'authenticated_provider'
        and provider_authentication_status = 'authenticated'
        and length(btrim(provider_authentication_ref)) between 1 and 500)
      or (primary_provenance_class <> 'authenticated_provider'
        and provider_authentication_status <> 'authenticated')
    )
  ),
  constraint trade_settlement_shadow_decisions_adjudication_check
    check (adjudication_class in (
      'platform_established', 'provider_established', 'neutral_review_final',
      'appeal_review_final', 'bilateral_confirmed', 'unreviewed'
    )),
  constraint trade_settlement_shadow_decisions_finality_check
    check (finality_reason in (
      'confirmed', 'adjudicated_paid', 'adjudicated_unpaid', 'not_due',
      'unresolved_dispute', 'permissible_cancellation', 'late_payment_cure',
      'administrative_correction'
    )),
  constraint trade_settlement_shadow_decisions_exclusion_check check (
    (decision_status = 'eligible')
    or length(btrim(exclusion_reason)) between 1 and 1000
  ),
  constraint trade_settlement_shadow_decisions_hash_check
    check (decision_hash ~ '^[0-9a-f]{64}$'),
  constraint trade_settlement_shadow_decisions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint trade_settlement_shadow_decisions_not_self_superseding_check
    check (supersedes_decision_id is null or supersedes_decision_id <> id)
);

create unique index if not exists trade_settlement_shadow_decisions_one_successor_idx
  on public.trade_settlement_shadow_decisions(supersedes_decision_id)
  where supersedes_decision_id is not null;
create index if not exists trade_settlement_shadow_decisions_payout_time_idx
  on public.trade_settlement_shadow_decisions(payout_id, finalized_at desc);

create table if not exists public.credibility_shadow_events (
  id uuid primary key default gen_random_uuid(),
  evidence_decision_id uuid references public.trade_evidence_decisions(id) on delete restrict,
  settlement_decision_id uuid references public.trade_settlement_shadow_decisions(id) on delete restrict,
  supersedes_event_id uuid references public.credibility_shadow_events(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  agreement_id uuid not null references public.agreements(id) on delete restrict,
  milestone_id uuid not null references public.trade_agreement_milestones(id) on delete restrict,
  counterparty_id uuid references public.profiles(id) on delete set null,
  role text not null,
  category text not null,
  dimension text not null,
  scoring_state text not null,
  outcome numeric(4, 3),
  primary_provenance_class text not null,
  adjudication_class text not null,
  decision_confidence_band smallint not null,
  provenance_weight numeric(8, 6) not null,
  decision_confidence_weight numeric(8, 6) not null,
  context_similarity numeric(8, 6) not null default 1,
  stake_units numeric not null default 0,
  source_type text not null,
  source_id text not null,
  reason_code text not null,
  occurred_at timestamptz not null,
  model_version text not null references public.credibility_shadow_model_versions(version),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint credibility_shadow_events_one_source_check
    check (num_nonnulls(evidence_decision_id, settlement_decision_id) = 1),
  constraint credibility_shadow_events_not_self_superseding_check
    check (supersedes_event_id is null or supersedes_event_id <> id),
  constraint credibility_shadow_events_role_check
    check (role in ('committer', 'funder', 'verifier', 'recipient', 'counterparty')),
  constraint credibility_shadow_events_category_check
    check (category in (
      'donation', 'behavioral_pledge', 'paid_action', 'service',
      'group_purchase', 'recurring_commitment', 'other'
    )),
  constraint credibility_shadow_events_dimension_check
    check (dimension in (
      'fulfilment', 'evidence_integrity', 'settlement',
      'dispute_conduct', 'responsiveness'
    )),
  constraint credibility_shadow_events_state_check
    check (scoring_state in ('eligible', 'excluded', 'review_required')),
  constraint credibility_shadow_events_outcome_check check (
    (scoring_state = 'eligible' and outcome between 0 and 1)
    or (scoring_state <> 'eligible' and outcome is null)
  ),
  constraint credibility_shadow_events_provenance_check
    check (primary_provenance_class in (
      'platform_observed', 'authenticated_provider', 'independent_third_party',
      'bilateral_confirmation', 'self_report'
    )),
  constraint credibility_shadow_events_adjudication_check
    check (adjudication_class in (
      'platform_established', 'provider_established', 'neutral_review_final',
      'appeal_review_final', 'bilateral_confirmed', 'unreviewed'
    )),
  constraint credibility_shadow_events_confidence_check
    check (decision_confidence_band in (0, 25, 50, 75, 100)),
  constraint credibility_shadow_events_weights_check check (
    provenance_weight between 0 and 1
    and decision_confidence_weight between 0 and 1
    and context_similarity between 0 and 1
    and stake_units >= 0
  ),
  constraint credibility_shadow_events_no_self_counterparty_check
    check (counterparty_id is null or counterparty_id <> profile_id),
  constraint credibility_shadow_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  unique (source_type, source_id, profile_id, dimension)
);

create unique index if not exists credibility_shadow_events_one_successor_idx
  on public.credibility_shadow_events(supersedes_event_id)
  where supersedes_event_id is not null;
create index if not exists credibility_shadow_events_profile_time_idx
  on public.credibility_shadow_events(profile_id, occurred_at desc);
create index if not exists credibility_shadow_events_context_idx
  on public.credibility_shadow_events(profile_id, role, category, dimension, occurred_at desc);
create index if not exists credibility_shadow_events_milestone_idx
  on public.credibility_shadow_events(milestone_id, created_at desc);

create table if not exists public.credibility_shadow_restriction_signals (
  id uuid primary key default gen_random_uuid(),
  evidence_decision_id uuid not null unique references public.trade_evidence_decisions(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  signal_type text not null,
  reason_code text not null,
  status text not null default 'review_required',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint credibility_shadow_restriction_signal_type_check
    check (signal_type in ('forged_evidence', 'fraud_review')),
  constraint credibility_shadow_restriction_signal_status_check
    check (status = 'review_required'),
  constraint credibility_shadow_restriction_signal_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.credibility_shadow_aggregates (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  category text not null,
  dimension text not null,
  weighted_success numeric not null default 0,
  weighted_failure numeric not null default 0,
  effective_observations numeric not null default 0,
  event_count integer not null default 0,
  independent_counterparties integer not null default 0,
  last_event_at timestamptz,
  as_of_at timestamptz not null default now(),
  model_version text not null references public.credibility_shadow_model_versions(version),
  primary key (profile_id, role, category, dimension),
  constraint credibility_shadow_aggregates_role_check
    check (role in ('committer', 'funder', 'verifier', 'recipient', 'counterparty')),
  constraint credibility_shadow_aggregates_category_check
    check (category in (
      'donation', 'behavioral_pledge', 'paid_action', 'service',
      'group_purchase', 'recurring_commitment', 'other'
    )),
  constraint credibility_shadow_aggregates_dimension_check
    check (dimension in (
      'fulfilment', 'evidence_integrity', 'settlement',
      'dispute_conduct', 'responsiveness'
    )),
  constraint credibility_shadow_aggregates_nonnegative_check check (
    weighted_success >= 0 and weighted_failure >= 0
    and effective_observations >= 0 and event_count >= 0
    and independent_counterparties >= 0
  )
);

create or replace function moral_trade_private.reject_credibility_shadow_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'Shadow evidence and credibility history is append-only.';
end;
$function$;

create trigger trade_evidence_decisions_append_only
before update or delete on public.trade_evidence_decisions
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

create trigger trade_settlement_shadow_decisions_append_only
before update or delete on public.trade_settlement_shadow_decisions
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

create trigger credibility_shadow_events_append_only
before update or delete on public.credibility_shadow_events
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

create trigger credibility_shadow_restriction_signals_append_only
before update or delete on public.credibility_shadow_restriction_signals
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

create or replace function public.credibility_shadow_category_for_action_category(
  target_category text
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case lower(btrim(coalesce(target_category, '')))
    when 'donation' then 'donation'
    when 'service' then 'service'
    when 'advocacy' then 'behavioral_pledge'
    when 'research' then 'behavioral_pledge'
    when 'lifestyle' then 'behavioral_pledge'
    else 'other'
  end;
$function$;
