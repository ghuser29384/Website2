begin;

create extension if not exists pgcrypto;

alter table public.mpgf_public_goods_match_pools
  add column if not exists unmatched_funds_rule text not null default 'roll_forward_to_next_round_or_default_pool_by_published_rule' check (
    unmatched_funds_rule in (
      'roll_forward_to_next_round_or_default_pool_by_published_rule',
      'return_to_sponsor_by_written_terms',
      'hold_pending_public_admin_resolution'
    )
  ),
  add column if not exists default_rollover_pool_id text;

alter table public.mpgf_public_goods_campaigns
  add column if not exists eligibility_status text not null default 'submitted' check (
    eligibility_status in ('draft', 'submitted', 'needs_evidence', 'approved', 'blocked', 'finalized')
  ),
  add column if not exists incident_status text not null default 'clear' check (
    incident_status in ('clear', 'frozen', 'resolved')
  );

update public.mpgf_public_goods_campaigns
set eligibility_status = case
  when review_status in ('approved', 'finalized') then 'approved'
  when review_status = 'blocked' then 'blocked'
  when review_status = 'needs_evidence' then 'needs_evidence'
  when review_status = 'draft' then 'draft'
  else 'submitted'
end
where eligibility_status = 'submitted';

create table if not exists public.mpgf_public_goods_sponsor_commitments (
  id uuid primary key default gen_random_uuid(),
  commitment_ref text not null unique,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  match_pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  sponsor_profile_id uuid references public.profiles (id) on delete set null,
  sponsor_ref text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  commitment_kind text not null check (
    commitment_kind in ('anchor_pool', 'recurring_sustainer', 'institutional_match', 'signed_intent')
  ),
  cadence text not null default 'one_time' check (cadence in ('one_time', 'monthly', 'annual')),
  status text not null default 'committed' check (
    status in ('pledged', 'committed', 'captured_by_partner', 'rolled_forward', 'returned', 'voided')
  ),
  restrictions_json jsonb not null default '{}'::jsonb,
  unmatched_funds_rule text not null default 'roll_forward_to_next_round_or_default_pool_by_published_rule' check (
    unmatched_funds_rule in (
      'roll_forward_to_next_round_or_default_pool_by_published_rule',
      'return_to_sponsor_by_written_terms',
      'hold_pending_public_admin_resolution'
    )
  ),
  rollover_target_round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  provider_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_sponsor_commitment_no_private_receipt check (
    provider_ref is null or provider_ref !~* '(@|secret|token|password|private)'
  )
);

create table if not exists public.mpgf_public_goods_appeals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in ('campaign', 'review_case', 'payment_proof', 'milestone', 'disbursement')
  ),
  subject_id text not null,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete cascade,
  appellant_profile_id uuid references public.profiles (id) on delete set null,
  appellant_ref_hash text,
  issue_code text not null check (
    issue_code in (
      'eligibility_dispute',
      'destination_evidence_dispute',
      'identity_or_duplicate_dispute',
      'milestone_release_dispute',
      'incident_freeze_dispute',
      'refund_or_rollover_dispute'
    )
  ),
  status text not null default 'appeal_requested' check (
    status in ('appeal_requested', 'under_review', 'appeal_upheld', 'appeal_denied', 'withdrawn')
  ),
  public_summary text not null default '',
  private_evidence_ref text,
  opened_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_public_summary text not null default '',
  constraint mpgf_public_goods_appeals_no_raw_private_evidence check (
    private_evidence_ref is null or private_evidence_ref !~* '(@|https?://|secret|token|password|private)'
  )
);

create table if not exists public.mpgf_public_goods_reviewer_recusals (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reason_code text not null check (
    reason_code in ('sponsor_conflict', 'beneficiary_conflict', 'campaign_team_conflict', 'private_relationship', 'operator_discretion')
  ),
  status text not null default 'active' check (status in ('active', 'expired', 'overridden_by_admin_record')),
  public_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, reviewer_id, status)
);

create table if not exists public.mpgf_public_goods_audit_events (
  id uuid primary key default gen_random_uuid(),
  object_type text not null check (
    object_type in (
      'round',
      'campaign',
      'review_case',
      'identity_attestation',
      'contribution',
      'sponsor_commitment',
      'matching_allocation',
      'milestone',
      'disbursement',
      'appeal',
      'audit_event'
    )
  ),
  object_id text not null,
  actor_type text not null check (
    actor_type in ('participant', 'reviewer', 'sponsor', 'system', 'payment_provider', 'fiscal_partner', 'admin')
  ),
  actor_ref_hash text,
  event_type text not null,
  event_hash text not null,
  event_json jsonb not null default '{}'::jsonb,
  public_visibility text not null default 'public_aggregate' check (
    public_visibility in ('public_aggregate', 'reviewer_only', 'participant_private')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_audit_no_private_payload_keys check (
    not (event_json ? 'email') and
    not (event_json ? 'phone') and
    not (event_json ? 'private_wish') and
    not (event_json ? 'raw_evidence_text') and
    not (event_json ? 'receipt_url')
  )
);

create unique index if not exists mpgf_public_goods_audit_events_hash_idx
on public.mpgf_public_goods_audit_events (event_hash);

create or replace function public.prevent_mpgf_public_goods_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'MPGF public-goods audit events are append-only';
end;
$$;

drop trigger if exists mpgf_public_goods_audit_events_append_only on public.mpgf_public_goods_audit_events;
create trigger mpgf_public_goods_audit_events_append_only
before update or delete on public.mpgf_public_goods_audit_events
for each row execute function public.prevent_mpgf_public_goods_audit_event_mutation();

create or replace function public.enforce_mpgf_public_goods_round_parameter_lock()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('open', 'allocation_pending', 'published', 'closed') and (
    new.name is distinct from old.name or
    new.starts_at is distinct from old.starts_at or
    new.ends_at is distinct from old.ends_at or
    new.match_pool_id is distinct from old.match_pool_id or
    new.qf_enabled is distinct from old.qf_enabled or
    new.qf_cap_multiple is distinct from old.qf_cap_multiple or
    new.supporter_gate is distinct from old.supporter_gate
  ) then
    raise exception 'MPGF public-goods round parameters are immutable after status = open';
  end if;

  return new;
end;
$$;

drop trigger if exists mpgf_public_goods_round_parameter_lock on public.mpgf_public_goods_rounds;
create trigger mpgf_public_goods_round_parameter_lock
before update on public.mpgf_public_goods_rounds
for each row execute function public.enforce_mpgf_public_goods_round_parameter_lock();

create or replace function public.sync_mpgf_public_goods_campaign_eligibility()
returns trigger
language plpgsql
as $$
begin
  new.eligibility_status := case
    when new.review_status in ('approved', 'finalized') then 'approved'
    when new.review_status = 'blocked' then 'blocked'
    when new.review_status = 'needs_evidence' then 'needs_evidence'
    when new.review_status = 'draft' then 'draft'
    else 'submitted'
  end;

  return new;
end;
$$;

drop trigger if exists mpgf_public_goods_campaign_eligibility_sync on public.mpgf_public_goods_campaigns;
create trigger mpgf_public_goods_campaign_eligibility_sync
before insert or update of review_status on public.mpgf_public_goods_campaigns
for each row execute function public.sync_mpgf_public_goods_campaign_eligibility();

create or replace function public.enforce_mpgf_public_goods_reviewer_recusal()
returns trigger
language plpgsql
as $$
begin
  if new.reviewer_id is not null and exists (
    select 1
    from public.mpgf_public_goods_reviewer_recusals recusals
    where recusals.campaign_id = new.campaign_id
      and recusals.reviewer_id = new.reviewer_id
      and recusals.status = 'active'
  ) then
    raise exception 'MPGF public-goods reviewer recusal blocks this review case';
  end if;

  return new;
end;
$$;

drop trigger if exists mpgf_public_goods_reviewer_recusal_guard on public.mpgf_public_goods_review_cases;
create trigger mpgf_public_goods_reviewer_recusal_guard
before insert or update of reviewer_id, campaign_id on public.mpgf_public_goods_review_cases
for each row execute function public.enforce_mpgf_public_goods_reviewer_recusal();

create or replace function public.enforce_mpgf_public_goods_disbursement_eligibility()
returns trigger
language plpgsql
as $$
declare
  campaign_record record;
begin
  select review_status, eligibility_status, incident_status
  into campaign_record
  from public.mpgf_public_goods_campaigns
  where id = new.campaign_id;

  if not found then
    raise exception 'MPGF public-goods disbursement requires an existing campaign';
  end if;

  if campaign_record.eligibility_status <> 'approved' then
    raise exception 'MPGF public-goods sponsor disbursement requires eligibility_status = approved';
  end if;

  if campaign_record.incident_status = 'frozen' then
    raise exception 'MPGF public-goods sponsor disbursement is blocked while incident_status = frozen';
  end if;

  if exists (
    select 1
    from public.mpgf_public_goods_appeals appeals
    where appeals.campaign_id = new.campaign_id
      and appeals.status in ('appeal_requested', 'under_review')
  ) then
    raise exception 'MPGF public-goods sponsor disbursement is blocked by an open appeal';
  end if;

  if new.status in ('partner_release_pending', 'released') and new.review_state_confirmed is not true then
    raise exception 'MPGF public-goods sponsor disbursement requires review_state_confirmed = true';
  end if;

  return new;
end;
$$;

drop trigger if exists mpgf_public_goods_disbursement_eligibility_guard on public.mpgf_public_goods_disbursements;
create trigger mpgf_public_goods_disbursement_eligibility_guard
before insert or update of campaign_id, status, review_state_confirmed on public.mpgf_public_goods_disbursements
for each row execute function public.enforce_mpgf_public_goods_disbursement_eligibility();

insert into public.mpgf_public_goods_sponsor_commitments (
  commitment_ref,
  round_id,
  match_pool_id,
  sponsor_ref,
  amount_cents,
  commitment_kind,
  cadence,
  status,
  restrictions_json,
  unmatched_funds_rule
) values (
  'demo-common-ground-sponsor-2026-05',
  'mpgf-assurance-round-demo-2026-05',
  'mpgf-common-ground-sponsor-pool-2026-05',
  'demo-common-ground-sponsor-redacted',
  150000,
  'anchor_pool',
  'one_time',
  'committed',
  '{"noTokenVoting": true, "identityWeightingOnly": true, "noCustodyByMoralTrade": true}'::jsonb,
  'roll_forward_to_next_round_or_default_pool_by_published_rule'
) on conflict (commitment_ref) do update set
  round_id = excluded.round_id,
  match_pool_id = excluded.match_pool_id,
  amount_cents = excluded.amount_cents,
  status = excluded.status,
  restrictions_json = excluded.restrictions_json,
  unmatched_funds_rule = excluded.unmatched_funds_rule,
  updated_at = timezone('utc', now());

grant select on
  public.mpgf_public_goods_sponsor_commitments,
  public.mpgf_public_goods_appeals,
  public.mpgf_public_goods_audit_events,
  public.mpgf_public_goods_reviewer_recusals
to authenticated;

grant select on
  public.mpgf_public_goods_sponsor_commitments,
  public.mpgf_public_goods_appeals,
  public.mpgf_public_goods_audit_events
to anon;

grant all on
  public.mpgf_public_goods_sponsor_commitments,
  public.mpgf_public_goods_appeals,
  public.mpgf_public_goods_audit_events,
  public.mpgf_public_goods_reviewer_recusals
to service_role;

alter table public.mpgf_public_goods_sponsor_commitments enable row level security;
alter table public.mpgf_public_goods_appeals enable row level security;
alter table public.mpgf_public_goods_audit_events enable row level security;
alter table public.mpgf_public_goods_reviewer_recusals enable row level security;

drop policy if exists "mpgf_public_goods_sponsor_commitments_public_select"
on public.mpgf_public_goods_sponsor_commitments;
create policy "mpgf_public_goods_sponsor_commitments_public_select"
on public.mpgf_public_goods_sponsor_commitments
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_public_goods_appeals_public_select"
on public.mpgf_public_goods_appeals;
create policy "mpgf_public_goods_appeals_public_select"
on public.mpgf_public_goods_appeals
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_public_goods_audit_events_public_select"
on public.mpgf_public_goods_audit_events;
create policy "mpgf_public_goods_audit_events_public_select"
on public.mpgf_public_goods_audit_events
for select
to anon, authenticated
using (public_visibility = 'public_aggregate');

drop policy if exists "mpgf_public_goods_reviewer_recusals_service_select"
on public.mpgf_public_goods_reviewer_recusals;
create policy "mpgf_public_goods_reviewer_recusals_service_select"
on public.mpgf_public_goods_reviewer_recusals
for select
to authenticated
using (false);

commit;
