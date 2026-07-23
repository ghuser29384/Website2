-- Forward migration for pre-match conditional donation redirects and
-- same-charity matching donations.
-- Version recorded by the production Supabase migration runner: 20260723103227.
-- Provider payment-method identifiers remain in the existing private mandate ledger.

alter table public.conditional_payment_mandates
  drop constraint if exists conditional_payment_mandates_purpose_check;
alter table public.conditional_payment_mandates
  add constraint conditional_payment_mandates_purpose_check
  check (purpose in ('donation_offset', 'public_goods_pool', 'conditional_redirect'));

alter table public.conditional_payment_mandates
  drop constraint if exists conditional_payment_mandates_subject_type_check;
alter table public.conditional_payment_mandates
  add constraint conditional_payment_mandates_subject_type_check
  check (
    subject_type in (
      'donation_offset_match',
      'donation_offset_pool',
      'mpgf_campaign',
      'conditional_redirect_offer'
    )
  );

alter table public.conditional_payment_mandates
  drop constraint if exists conditional_payment_mandates_participant_role_check;
alter table public.conditional_payment_mandates
  add constraint conditional_payment_mandates_participant_role_check
  check (participant_role in ('owner', 'counterparty', 'pledger', 'creator', 'matcher'));

alter table public.conditional_settlement_batches
  drop constraint if exists conditional_settlement_batches_purpose_check;
alter table public.conditional_settlement_batches
  add constraint conditional_settlement_batches_purpose_check
  check (purpose in ('donation_offset', 'public_goods_pool', 'conditional_redirect'));
alter table public.conditional_settlement_batches
  drop constraint if exists conditional_settlement_batches_subject_type_check;
alter table public.conditional_settlement_batches
  add constraint conditional_settlement_batches_subject_type_check
  check (
    subject_type in (
      'donation_offset_match',
      'donation_offset_pool',
      'mpgf_campaign',
      'conditional_redirect_offer'
    )
  );

alter table public.conditional_payment_attempts
  add column if not exists authorization_consented_at timestamptz;

create table public.conditional_redirect_offers (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete restrict,
  creator_amount_cents integer not null check (creator_amount_cents > 0),
  matcher_amount_cents integer not null check (matcher_amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  fallback_destination_id uuid not null
    references public.conditional_payment_destinations(id) on delete restrict,
  matched_destination_id uuid not null
    references public.conditional_payment_destinations(id) on delete restrict,
  offer_kind text generated always as (
    case
      when fallback_destination_id = matched_destination_id then 'matching_donation'
      else 'redirection'
    end
  ) stored,
  deadline_at timestamptz not null,
  arbitration_closes_at timestamptz not null,
  creator_mandate_id uuid references public.conditional_payment_mandates(id) on delete restrict,
  winning_candidate_id uuid,
  status text not null default 'pending_creator_authorization' check (
    status in (
      'pending_creator_authorization',
      'open',
      'arbitrating',
      'matcher_recovery',
      'creator_recovery',
      'matched_settling',
      'fallback_settling',
      'matched_transferred',
      'fallback_transferred',
      'cancelled',
      'operator_review'
    )
  ),
  terms_version text not null,
  condition_hash text not null check (condition_hash ~ '^[0-9a-f]{64}$'),
  livemode boolean not null default false,
  recovery_ends_at timestamptz,
  creator_recovery_attempts integer not null default 0
    check (creator_recovery_attempts between 0 and 1),
  settlement_started_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (deadline_at >= created_at + interval '30 minutes'),
  check (deadline_at <= created_at + interval '30 days'),
  check (arbitration_closes_at = deadline_at + interval '15 minutes'),
  unique (id, creator_profile_id),
  unique (creator_mandate_id),
  unique (id, condition_hash, livemode)
);

create table public.conditional_redirect_candidates (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.conditional_redirect_offers(id) on delete restrict,
  matcher_profile_id uuid not null references public.profiles(id) on delete restrict,
  mandate_id uuid not null references public.conditional_payment_mandates(id) on delete restrict,
  setup_succeeded_at timestamptz,
  stripe_event_created_at timestamptz,
  stripe_event_id text,
  status text not null default 'setup_pending' check (
    status in (
      'setup_pending',
      'eligible',
      'winner',
      'backup',
      'recovery',
      'promoted',
      'charged',
      'declined',
      'requires_action',
      'expired',
      'cancelled'
    )
  ),
  recovery_ends_at timestamptz,
  recovery_attempts integer not null default 0
    check (recovery_attempts between 0 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, matcher_profile_id),
  unique (mandate_id),
  unique (stripe_event_id),
  check (
    (setup_succeeded_at is null and stripe_event_created_at is null and stripe_event_id is null)
    or
    (setup_succeeded_at is not null and stripe_event_created_at is not null and stripe_event_id is not null)
  )
);

alter table public.conditional_redirect_offers
  add constraint conditional_redirect_offers_winning_candidate_fk
  foreign key (winning_candidate_id)
  references public.conditional_redirect_candidates(id)
  on delete restrict;

create table public.conditional_redirect_settlement_legs (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.conditional_redirect_offers(id) on delete restrict,
  participant_role text not null check (participant_role in ('creator', 'matcher')),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  mandate_id uuid not null references public.conditional_payment_mandates(id) on delete restrict,
  destination_id uuid not null references public.conditional_payment_destinations(id) on delete restrict,
  payment_attempt_id uuid references public.conditional_payment_attempts(id) on delete restrict,
  settlement_transfer_id uuid references public.conditional_settlement_transfers(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (
    status in (
      'pending',
      'charging',
      'requires_action',
      'charged',
      'transferring',
      'transferred',
      'refunding',
      'refunded',
      'failed',
      'operator_review'
    )
  ),
  receipt_url text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, participant_role),
  unique (payment_attempt_id),
  unique (settlement_transfer_id)
);

create index conditional_redirect_offers_public_idx
  on public.conditional_redirect_offers (status, deadline_at, created_at desc);
create index conditional_redirect_candidates_arbitration_idx
  on public.conditional_redirect_candidates
    (offer_id, stripe_event_created_at, setup_succeeded_at, stripe_event_id, id)
  where status in ('eligible', 'winner', 'backup', 'recovery', 'promoted');
create index conditional_redirect_candidates_matcher_idx
  on public.conditional_redirect_candidates
    (matcher_profile_id, created_at desc);
create index conditional_redirect_settlement_legs_offer_idx
  on public.conditional_redirect_settlement_legs (offer_id, participant_role);

create trigger conditional_redirect_offers_set_updated_at
  before update on public.conditional_redirect_offers
  for each row execute function public.conditional_payments_set_updated_at();
create trigger conditional_redirect_candidates_set_updated_at
  before update on public.conditional_redirect_candidates
  for each row execute function public.conditional_payments_set_updated_at();
create trigger conditional_redirect_settlement_legs_set_updated_at
  before update on public.conditional_redirect_settlement_legs
  for each row execute function public.conditional_payments_set_updated_at();

alter table public.conditional_redirect_offers enable row level security;
alter table public.conditional_redirect_candidates enable row level security;
alter table public.conditional_redirect_settlement_legs enable row level security;

revoke all on public.conditional_redirect_offers from anon, authenticated;
revoke all on public.conditional_redirect_candidates from anon, authenticated;
revoke all on public.conditional_redirect_settlement_legs from anon, authenticated;
grant all on public.conditional_redirect_offers to service_role;
grant all on public.conditional_redirect_candidates to service_role;
grant all on public.conditional_redirect_settlement_legs to service_role;

create or replace function public.arbitrate_conditional_redirect_offer(p_offer_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offer public.conditional_redirect_offers%rowtype;
  v_winner uuid;
begin
  select * into v_offer
  from public.conditional_redirect_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'conditional redirect offer not found';
  end if;
  if timezone('utc', now()) < v_offer.arbitration_closes_at then
    raise exception 'arbitration window is still open';
  end if;
  if v_offer.status not in ('open', 'arbitrating') then
    return v_offer.winning_candidate_id;
  end if;

  select id into v_winner
  from public.conditional_redirect_candidates
  where offer_id = p_offer_id
    and status = 'eligible'
    and setup_succeeded_at <= v_offer.deadline_at
  order by stripe_event_created_at, setup_succeeded_at, stripe_event_id, id
  limit 1
  for update;

  if v_winner is null then
    update public.conditional_redirect_offers
    set status = 'fallback_settling',
        settlement_started_at = timezone('utc', now())
    where id = p_offer_id;
    return null;
  end if;

  update public.conditional_redirect_candidates
  set status = case when id = v_winner then 'winner' else 'backup' end
  where offer_id = p_offer_id
    and status = 'eligible';

  update public.conditional_redirect_offers
  set status = 'matched_settling',
      winning_candidate_id = v_winner,
      settlement_started_at = timezone('utc', now())
  where id = p_offer_id;
  return v_winner;
end;
$$;

revoke all on function public.arbitrate_conditional_redirect_offer(uuid) from public, anon, authenticated;
grant execute on function public.arbitrate_conditional_redirect_offer(uuid) to service_role;

create or replace function public.promote_conditional_redirect_backup_or_fallback(
  p_offer_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offer public.conditional_redirect_offers%rowtype;
  v_backup uuid;
begin
  select * into v_offer
  from public.conditional_redirect_offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'conditional redirect offer not found';
  end if;
  if v_offer.status <> 'matcher_recovery' then
    raise exception 'conditional redirect offer is not in matcher recovery';
  end if;
  if v_offer.recovery_ends_at is null
     or timezone('utc', now()) < v_offer.recovery_ends_at then
    raise exception 'matcher recovery window is still open';
  end if;

  update public.conditional_redirect_candidates
  set status = 'declined',
      recovery_ends_at = null
  where id = v_offer.winning_candidate_id
    and status = 'recovery';

  select id into v_backup
  from public.conditional_redirect_candidates
  where offer_id = p_offer_id
    and status = 'backup'
    and setup_succeeded_at <= v_offer.deadline_at
  order by stripe_event_created_at, setup_succeeded_at, stripe_event_id, id
  limit 1
  for update;

  if v_backup is null then
    update public.conditional_redirect_offers
    set status = 'fallback_settling',
        winning_candidate_id = null,
        recovery_ends_at = null,
        settlement_started_at = timezone('utc', now())
    where id = p_offer_id;
    return null;
  end if;

  update public.conditional_redirect_candidates
  set status = 'promoted',
      recovery_ends_at = null
  where id = v_backup;

  update public.conditional_redirect_offers
  set status = 'matched_settling',
      winning_candidate_id = v_backup,
      recovery_ends_at = null,
      settlement_started_at = timezone('utc', now())
  where id = p_offer_id;
  return v_backup;
end;
$$;

revoke all on function public.promote_conditional_redirect_backup_or_fallback(uuid)
  from public, anon, authenticated;
grant execute on function public.promote_conditional_redirect_backup_or_fallback(uuid)
  to service_role;

comment on table public.conditional_redirect_offers is
  'Pre-match conditional redirects. Creator authorization precedes publication; settlement chooses exactly one matched or fallback branch after a capped grace window.';
comment on table public.conditional_redirect_candidates is
  'Private matcher authorization ledger. Eligible candidates are ranked by verified Stripe event time with deterministic tie-breakers.';
comment on table public.conditional_redirect_settlement_legs is
  'Separate donor-level charge, receipt, transfer, and refund records, including same-charity matching donations.';
