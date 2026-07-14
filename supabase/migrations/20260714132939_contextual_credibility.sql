-- Contextual credibility: evidence-weighted reliability without moral-value ranking.
-- The public surface exposes aggregate evidence only. Raw events and safety reasons remain private.

create extension if not exists pgcrypto;

create table if not exists public.credibility_model_versions (
  version text primary key,
  status text not null default 'draft',
  prior_success numeric not null default 4,
  prior_failure numeric not null default 1,
  lower_quantile numeric not null default 0.10,
  minimum_effective_observations numeric not null default 3,
  recency_half_life_days integer not null default 365,
  dimension_weights jsonb not null default '{"fulfilment":0.45,"evidence_integrity":0.25,"settlement":0.15,"dispute_conduct":0.10,"responsiveness":0.05}'::jsonb,
  proof_weights jsonb not null default '{"platform_verified":1.0,"independent":1.0,"adjudicated":1.0,"bilateral":0.6,"self_reported":0.2}'::jsonb,
  context_weights jsonb not null default '{"exact":1.0,"same_role":0.7,"same_category":0.6,"unrelated":0.25}'::jsonb,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  constraint credibility_model_status_check check (status in ('draft', 'active', 'retired')),
  constraint credibility_model_prior_success_check check (prior_success > 0),
  constraint credibility_model_prior_failure_check check (prior_failure > 0),
  constraint credibility_model_lower_quantile_check check (lower_quantile > 0 and lower_quantile < 0.5),
  constraint credibility_model_minimum_observations_check check (minimum_effective_observations >= 0),
  constraint credibility_model_half_life_check check (recency_half_life_days between 30 and 3650),
  constraint credibility_model_dimension_weights_object check (jsonb_typeof(dimension_weights) = 'object'),
  constraint credibility_model_proof_weights_object check (jsonb_typeof(proof_weights) = 'object'),
  constraint credibility_model_context_weights_object check (jsonb_typeof(context_weights) = 'object')
);

create unique index if not exists credibility_model_single_active_idx
  on public.credibility_model_versions ((status))
  where status = 'active';

insert into public.credibility_model_versions (
  version,
  status,
  prior_success,
  prior_failure,
  lower_quantile,
  minimum_effective_observations,
  recency_half_life_days,
  activated_at
)
values ('v1-beta-contextual', 'active', 4, 1, 0.10, 3, 365, now())
on conflict (version) do update set
  status = excluded.status,
  prior_success = excluded.prior_success,
  prior_failure = excluded.prior_failure,
  lower_quantile = excluded.lower_quantile,
  minimum_effective_observations = excluded.minimum_effective_observations,
  recency_half_life_days = excluded.recency_half_life_days,
  activated_at = coalesce(public.credibility_model_versions.activated_at, excluded.activated_at);

create table if not exists public.credibility_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  agreement_id uuid references public.agreements(id) on delete set null,
  counterparty_id uuid references public.profiles(id) on delete set null,
  role text not null,
  category text not null,
  dimension text not null,
  outcome numeric not null,
  evidence_quality text not null default 'platform_verified',
  context_similarity numeric not null default 1,
  stake_units numeric not null default 0,
  source_type text not null,
  source_id text,
  reason_code text not null default '',
  eligible boolean not null default true,
  exclusion_reason text not null default '',
  occurred_at timestamptz not null default now(),
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint credibility_event_role_check check (role in ('committer', 'funder', 'verifier', 'recipient', 'counterparty')),
  constraint credibility_event_category_check check (category in ('donation', 'behavioral_pledge', 'paid_action', 'service', 'group_purchase', 'recurring_commitment', 'other')),
  constraint credibility_event_dimension_check check (dimension in ('fulfilment', 'evidence_integrity', 'settlement', 'dispute_conduct', 'responsiveness')),
  constraint credibility_event_outcome_check check (outcome >= 0 and outcome <= 1),
  constraint credibility_event_evidence_quality_check check (evidence_quality in ('platform_verified', 'independent', 'adjudicated', 'bilateral', 'self_reported')),
  constraint credibility_event_context_similarity_check check (context_similarity >= 0 and context_similarity <= 1),
  constraint credibility_event_stake_units_check check (stake_units >= 0),
  constraint credibility_event_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint credibility_event_no_self_counterparty check (counterparty_id is null or counterparty_id <> profile_id)
);

create index if not exists credibility_events_profile_time_idx
  on public.credibility_events (profile_id, occurred_at desc);
create index if not exists credibility_events_context_idx
  on public.credibility_events (profile_id, role, category, dimension, occurred_at desc)
  where eligible;
create index if not exists credibility_events_agreement_idx
  on public.credibility_events (agreement_id, occurred_at desc)
  where agreement_id is not null;
create unique index if not exists credibility_events_source_unique_idx
  on public.credibility_events (source_type, source_id, profile_id, dimension)
  where source_id is not null;

create table if not exists public.credibility_restrictions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  restriction_type text not null,
  reason_code text not null,
  status text not null default 'reviewing',
  scope_role text,
  scope_category text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id) on delete set null,
  private_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credibility_restriction_type_check check (restriction_type in ('account_compromise', 'identity_duplication', 'fraud', 'forged_evidence', 'coercion', 'threat', 'safety_review', 'other')),
  constraint credibility_restriction_status_check check (status in ('reviewing', 'active', 'resolved', 'overturned')),
  constraint credibility_restriction_role_check check (scope_role is null or scope_role in ('committer', 'funder', 'verifier', 'recipient', 'counterparty')),
  constraint credibility_restriction_category_check check (scope_category is null or scope_category in ('donation', 'behavioral_pledge', 'paid_action', 'service', 'group_purchase', 'recurring_commitment', 'other')),
  constraint credibility_restriction_window_check check (ends_at is null or ends_at > starts_at)
);

create index if not exists credibility_restrictions_profile_status_idx
  on public.credibility_restrictions (profile_id, status, starts_at desc);

create table if not exists public.credibility_public_aggregates (
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
  model_version text not null references public.credibility_model_versions(version),
  primary key (profile_id, role, category, dimension),
  constraint credibility_public_aggregate_role_check check (role in ('committer', 'funder', 'verifier', 'recipient', 'counterparty')),
  constraint credibility_public_aggregate_category_check check (category in ('donation', 'behavioral_pledge', 'paid_action', 'service', 'group_purchase', 'recurring_commitment', 'other')),
  constraint credibility_public_aggregate_dimension_check check (dimension in ('fulfilment', 'evidence_integrity', 'settlement', 'dispute_conduct', 'responsiveness')),
  constraint credibility_public_aggregate_nonnegative_check check (
    weighted_success >= 0 and weighted_failure >= 0 and effective_observations >= 0 and event_count >= 0 and independent_counterparties >= 0
  )
);

create index if not exists credibility_public_aggregates_profile_idx
  on public.credibility_public_aggregates (profile_id, as_of_at desc);

create table if not exists public.credibility_profile_status (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  eligibility_state text not null default 'eligible',
  active_restriction_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint credibility_profile_status_state_check check (eligibility_state in ('eligible', 'review_required', 'restricted')),
  constraint credibility_profile_status_count_check check (active_restriction_count >= 0)
);

create or replace function public.credibility_proof_weight(target_quality text, target_model jsonb)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce((target_model ->> target_quality)::numeric, 0.2);
$$;

create or replace function public.credibility_stake_weight(target_stake numeric)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select least(2::numeric, 1::numeric + ln(1::numeric + least(greatest(coalesce(target_stake, 0), 0), 1000000::numeric)) / ln(101::numeric));
$$;

create or replace function public.refresh_profile_credibility(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_model public.credibility_model_versions%rowtype;
begin
  select *
  into active_model
  from public.credibility_model_versions
  where status = 'active'
  order by activated_at desc nulls last, created_at desc
  limit 1;

  if active_model.version is null then
    raise exception 'No active credibility model version';
  end if;

  delete from public.credibility_public_aggregates
  where profile_id = target_profile_id;

  insert into public.credibility_public_aggregates (
    profile_id,
    role,
    category,
    dimension,
    weighted_success,
    weighted_failure,
    effective_observations,
    event_count,
    independent_counterparties,
    last_event_at,
    as_of_at,
    model_version
  )
  with ranked as (
    select
      event_row.*,
      row_number() over (
        partition by event_row.profile_id,
          coalesce(event_row.counterparty_id::text, event_row.id::text),
          event_row.role,
          event_row.category,
          event_row.dimension
        order by event_row.occurred_at, event_row.id
      ) as counterparty_sequence
    from public.credibility_events event_row
    where event_row.profile_id = target_profile_id
      and event_row.eligible
  ), weighted as (
    select
      ranked.*,
      (
        exp(
          -ln(2::numeric)
          * greatest(0::numeric, extract(epoch from (now() - ranked.occurred_at))::numeric / 86400::numeric)
          / active_model.recency_half_life_days::numeric
        )
        * public.credibility_proof_weight(ranked.evidence_quality, active_model.proof_weights)
        * (1::numeric / sqrt(ranked.counterparty_sequence::numeric))
        * ranked.context_similarity
        * public.credibility_stake_weight(ranked.stake_units)
      ) as event_weight
    from ranked
  )
  select
    target_profile_id,
    weighted.role,
    weighted.category,
    weighted.dimension,
    sum(weighted.event_weight * weighted.outcome),
    sum(weighted.event_weight * (1::numeric - weighted.outcome)),
    sum(weighted.event_weight),
    count(*)::integer,
    count(distinct weighted.counterparty_id)::integer,
    max(weighted.occurred_at),
    now(),
    active_model.version
  from weighted
  group by weighted.role, weighted.category, weighted.dimension;
end;
$$;

create or replace function public.refresh_profile_credibility_status(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_count integer;
  severe_count integer;
begin
  select
    count(*) filter (
      where restriction.status in ('active', 'reviewing')
        and restriction.starts_at <= now()
        and (restriction.ends_at is null or restriction.ends_at > now())
    )::integer,
    count(*) filter (
      where restriction.status = 'active'
        and restriction.restriction_type in ('account_compromise', 'identity_duplication', 'fraud', 'forged_evidence', 'coercion', 'threat')
        and restriction.starts_at <= now()
        and (restriction.ends_at is null or restriction.ends_at > now())
    )::integer
  into active_count, severe_count
  from public.credibility_restrictions restriction
  where restriction.profile_id = target_profile_id;

  insert into public.credibility_profile_status (
    profile_id,
    eligibility_state,
    active_restriction_count,
    updated_at
  )
  values (
    target_profile_id,
    case
      when severe_count > 0 then 'restricted'
      when active_count > 0 then 'review_required'
      else 'eligible'
    end,
    active_count,
    now()
  )
  on conflict (profile_id) do update set
    eligibility_state = excluded.eligibility_state,
    active_restriction_count = excluded.active_restriction_count,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.handle_credibility_event_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_profile_credibility(old.profile_id);
    return old;
  end if;

  perform public.refresh_profile_credibility(new.profile_id);
  if tg_op = 'UPDATE' and old.profile_id <> new.profile_id then
    perform public.refresh_profile_credibility(old.profile_id);
  end if;
  return new;
end;
$$;

create or replace function public.handle_credibility_restriction_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_profile_credibility_status(old.profile_id);
    return old;
  end if;

  perform public.refresh_profile_credibility_status(new.profile_id);
  if tg_op = 'UPDATE' and old.profile_id <> new.profile_id then
    perform public.refresh_profile_credibility_status(old.profile_id);
  end if;
  return new;
end;
$$;

create or replace function public.credibility_category_for_offer_mode(target_mode public.offer_mode)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case target_mode
    when 'pledge'::public.offer_mode then 'behavioral_pledge'
    when 'offset'::public.offer_mode then 'donation'
    when 'payment'::public.offer_mode then 'paid_action'
    else 'other'
  end;
$$;

create or replace function public.handle_completed_agreement_credibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offer_category text;
begin
  if new.status <> 'completed'::public.agreement_status then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select public.credibility_category_for_offer_mode(offer_record.mode)
    into offer_category
    from public.offers offer_record
    where offer_record.id = new.offer_id;

    offer_category := coalesce(offer_category, 'other');

    insert into public.credibility_events (
      profile_id, agreement_id, counterparty_id, role, category, dimension,
      outcome, evidence_quality, source_type, source_id, reason_code, occurred_at
    )
    values
      (
        new.proposer_id, new.id, new.responder_id, 'committer', offer_category, 'fulfilment',
        1, 'platform_verified', 'agreement_transition', new.id::text || ':proposer:completed',
        'agreement_completed', coalesce(new.updated_at, now())
      ),
      (
        new.responder_id, new.id, new.proposer_id, 'counterparty', offer_category, 'fulfilment',
        1, 'bilateral', 'agreement_transition', new.id::text || ':responder:completed',
        'agreement_completed', coalesce(new.updated_at, now())
      )
    on conflict do nothing;

  return new;
end;
$$;

create or replace function public.handle_paid_agreement_payment_credibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offer_category text;
begin
  if new.status <> 'paid' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select public.credibility_category_for_offer_mode(offer_record.mode)
    into offer_category
    from public.agreements agreement_record
    join public.offers offer_record on offer_record.id = agreement_record.offer_id
    where agreement_record.id = new.agreement_id;

    insert into public.credibility_events (
      profile_id, agreement_id, counterparty_id, role, category, dimension,
      outcome, evidence_quality, stake_units, source_type, source_id, reason_code, occurred_at
    )
    values (
      new.payer_id, new.agreement_id, new.payee_id, 'funder', coalesce(offer_category, 'paid_action'), 'settlement',
      1, 'platform_verified', new.amount_cents::numeric / 100::numeric,
      'payment_transition', new.id::text || ':paid', 'payment_settled', coalesce(new.paid_at, new.updated_at, now())
    )
    on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists credibility_events_refresh_public_aggregates on public.credibility_events;
create trigger credibility_events_refresh_public_aggregates
after insert or update or delete on public.credibility_events
for each row execute function public.handle_credibility_event_refresh();

drop trigger if exists credibility_restrictions_refresh_profile_status on public.credibility_restrictions;
create trigger credibility_restrictions_refresh_profile_status
after insert or update or delete on public.credibility_restrictions
for each row execute function public.handle_credibility_restriction_refresh();

drop trigger if exists agreements_record_completed_credibility on public.agreements;
create trigger agreements_record_completed_credibility
after insert or update of status on public.agreements
for each row execute function public.handle_completed_agreement_credibility();

drop trigger if exists agreement_payments_record_paid_credibility on public.agreement_payments;
create trigger agreement_payments_record_paid_credibility
after insert or update of status on public.agreement_payments
for each row execute function public.handle_paid_agreement_payment_credibility();

drop trigger if exists credibility_restrictions_set_updated_at on public.credibility_restrictions;
create trigger credibility_restrictions_set_updated_at
before update on public.credibility_restrictions
for each row execute function public.set_updated_at();

alter table public.credibility_model_versions enable row level security;
alter table public.credibility_events enable row level security;
alter table public.credibility_restrictions enable row level security;
alter table public.credibility_public_aggregates enable row level security;
alter table public.credibility_profile_status enable row level security;

drop policy if exists credibility_models_public_read on public.credibility_model_versions;
create policy credibility_models_public_read
on public.credibility_model_versions
for select
to anon, authenticated
using (status in ('active', 'retired'));

drop policy if exists credibility_events_own_read on public.credibility_events;
create policy credibility_events_own_read
on public.credibility_events
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists credibility_restrictions_own_read on public.credibility_restrictions;
create policy credibility_restrictions_own_read
on public.credibility_restrictions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists credibility_public_aggregates_read on public.credibility_public_aggregates;
create policy credibility_public_aggregates_read
on public.credibility_public_aggregates
for select
to anon, authenticated
using (true);

drop policy if exists credibility_profile_status_read on public.credibility_profile_status;
create policy credibility_profile_status_read
on public.credibility_profile_status
for select
to anon, authenticated
using (true);

grant select on public.credibility_model_versions to anon, authenticated;
grant select on public.credibility_public_aggregates to anon, authenticated;
grant select on public.credibility_profile_status to anon, authenticated;
grant select on public.credibility_events to authenticated;
grant select on public.credibility_restrictions to authenticated;

revoke insert, update, delete on public.credibility_events from anon, authenticated;
revoke insert, update, delete on public.credibility_restrictions from anon, authenticated;
revoke insert, update, delete on public.credibility_public_aggregates from anon, authenticated;
revoke insert, update, delete on public.credibility_profile_status from anon, authenticated;
revoke insert, update, delete on public.credibility_model_versions from anon, authenticated;

revoke execute on function public.refresh_profile_credibility(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_profile_credibility_status(uuid) from public, anon, authenticated;
revoke execute on function public.handle_credibility_event_refresh() from public, anon, authenticated;
revoke execute on function public.handle_credibility_restriction_refresh() from public, anon, authenticated;
revoke execute on function public.handle_completed_agreement_credibility() from public, anon, authenticated;
revoke execute on function public.handle_paid_agreement_payment_credibility() from public, anon, authenticated;

comment on table public.credibility_events is
  'Private, immutable-style evidence ledger for contextual trade reliability. Service/reviewer writes only; participants may inspect their own rows.';
comment on table public.credibility_public_aggregates is
  'Privacy-safe aggregates for public credibility passports. Exponential decay remains current by applying the elapsed-time factor from as_of_at at read time.';
comment on table public.credibility_restrictions is
  'Private safety and eligibility restrictions. Severe integrity events remain non-compensatory and separate from numerical credibility.';
comment on table public.credibility_model_versions is
  'Versioned, auditable scoring parameters. No moral-view, popularity, follower, donation-total, or demographic inputs are permitted.';
