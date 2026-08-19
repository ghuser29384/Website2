begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.mpgf_phase_one_rounds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  status text not null default 'draft' check (
    status in (
      'draft',
      'pledge_open',
      'ballot_open',
      'results_published',
      'quorum_failed',
      'closed',
      'cancelled'
    )
  ),
  pledge_opens_at timestamptz,
  pledge_closes_at timestamptz,
  ballot_opens_at timestamptz,
  ballot_closes_at timestamptz,
  quorum_bps integer not null default 5000 check (quorum_bps = 5000),
  ballot_policy text not null default 'equal_credit_approval_split_v1' check (
    ballot_policy = 'equal_credit_approval_split_v1'
  ),
  result_effect text not null default 'advisory_external_checkout_confirmation_required' check (
    result_effect = 'advisory_external_checkout_confirmation_required'
  ),
  terms_version text not null default 'mpgf-phase-one-terms-v1',
  result_hash text,
  quorum_met boolean not null default false,
  results_published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_phase_one_round_windows_ordered check (
    (pledge_opens_at is null or pledge_closes_at is null or pledge_opens_at < pledge_closes_at)
    and
    (ballot_opens_at is null or ballot_closes_at is null or ballot_opens_at < ballot_closes_at)
    and
    (pledge_closes_at is null or ballot_opens_at is null or pledge_closes_at <= ballot_opens_at)
  )
);

comment on table public.mpgf_phase_one_rounds is
  'Noncustodial MPGF phase-one rounds. Results are advisory and cannot authorize a payment or transfer.';

create table if not exists public.mpgf_phase_one_projects (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.mpgf_phase_one_rounds (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 200),
  summary text not null check (char_length(summary) between 20 and 2000),
  recipient_name text not null check (char_length(recipient_name) between 2 and 200),
  action_category text not null check (action_category ~ '^[a-z0-9_]{2,80}$'),
  external_checkout_url text not null check (
    external_checkout_url ~ '^https://'
    and char_length(external_checkout_url) <= 2000
  ),
  status text not null default 'submitted' check (
    status in (
      'submitted',
      'under_review',
      'approved',
      'paused',
      'rejected',
      'retired'
    )
  ),
  public_review_summary text not null default '' check (
    char_length(public_review_summary) <= 2000
  ),
  approved_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, slug),
  unique (id, round_id),
  constraint mpgf_phase_one_project_approval_timestamp check (
    status <> 'approved' or approved_at is not null
  )
);

comment on table public.mpgf_phase_one_projects is
  'Operator-reviewed project records. The external checkout URL is never exposed by the public state function.';

create table if not exists public.mpgf_phase_one_pledges (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.mpgf_phase_one_rounds (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents bigint not null check (
    amount_cents > 0
    and amount_cents <= 9007199254740991
  ),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'confirmed' check (
    status in ('confirmed', 'cancelled', 'expired')
  ),
  terms_version text not null,
  confirmed_at timestamptz not null default timezone('utc', now()),
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, profile_id),
  unique (id, round_id, profile_id),
  constraint mpgf_phase_one_pledge_cancel_timestamp check (
    status <> 'cancelled' or cancelled_at is not null
  )
);

comment on table public.mpgf_phase_one_pledges is
  'Private noncustodial pledge intents. Amount never changes governance weight.';

create table if not exists public.mpgf_phase_one_eligible_voters (
  round_id uuid not null references public.mpgf_phase_one_rounds (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  pledge_id uuid not null,
  snapshotted_at timestamptz not null default timezone('utc', now()),
  primary key (round_id, profile_id),
  unique (round_id, pledge_id),
  constraint mpgf_phase_one_voter_pledge_same_round_profile foreign key (
    pledge_id,
    round_id,
    profile_id
  ) references public.mpgf_phase_one_pledges (
    id,
    round_id,
    profile_id
  ) on delete restrict
);

comment on table public.mpgf_phase_one_eligible_voters is
  'Frozen one-person-one-credit electorate captured from confirmed pledgers when voting opens.';

create table if not exists public.mpgf_phase_one_candidate_snapshots (
  round_id uuid not null references public.mpgf_phase_one_rounds (id) on delete cascade,
  project_id uuid not null,
  title text not null,
  summary text not null,
  recipient_name text not null,
  action_category text not null,
  external_checkout_url_snapshot text not null,
  snapshotted_at timestamptz not null default timezone('utc', now()),
  primary key (round_id, project_id),
  constraint mpgf_phase_one_candidate_project_same_round foreign key (
    project_id,
    round_id
  ) references public.mpgf_phase_one_projects (
    id,
    round_id
  ) on delete restrict
);

comment on table public.mpgf_phase_one_candidate_snapshots is
  'Frozen approved-project candidate set. Checkout URLs stay private until a donor confirms a handoff.';

create table if not exists public.mpgf_phase_one_ballots (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.mpgf_phase_one_rounds (id) on delete restrict,
  voter_profile_id uuid not null references public.profiles (id) on delete restrict,
  selection_count integer not null check (selection_count between 1 and 50),
  status text not null default 'submitted' check (
    status in ('submitted', 'invalidated')
  ),
  revision integer not null default 1 check (revision > 0),
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, voter_profile_id),
  unique (id, round_id)
);

comment on table public.mpgf_phase_one_ballots is
  'Private approval ballots. Every submitted ballot contributes exactly one credit split equally across its selections.';

create table if not exists public.mpgf_phase_one_ballot_approvals (
  round_id uuid not null,
  ballot_id uuid not null,
  project_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (round_id, ballot_id, project_id),
  constraint mpgf_phase_one_approval_ballot_same_round foreign key (
    ballot_id,
    round_id
  ) references public.mpgf_phase_one_ballots (
    id,
    round_id
  ) on delete cascade,
  constraint mpgf_phase_one_approval_candidate_same_round foreign key (
    round_id,
    project_id
  ) references public.mpgf_phase_one_candidate_snapshots (
    round_id,
    project_id
  ) on delete restrict
);

create table if not exists public.mpgf_phase_one_checkout_handoffs (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.mpgf_phase_one_rounds (id) on delete restrict,
  project_id uuid not null,
  pledge_id uuid not null,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents bigint not null check (
    amount_cents > 0
    and amount_cents <= 9007199254740991
  ),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'confirmed_external_handoff' check (
    status in ('confirmed_external_handoff', 'cancelled')
  ),
  result_hash text not null,
  confirmed_at timestamptz not null default timezone('utc', now()),
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, project_id, profile_id),
  constraint mpgf_phase_one_handoff_candidate_same_round foreign key (
    round_id,
    project_id
  ) references public.mpgf_phase_one_candidate_snapshots (
    round_id,
    project_id
  ) on delete restrict,
  constraint mpgf_phase_one_handoff_pledge_same_round_profile foreign key (
    pledge_id,
    round_id,
    profile_id
  ) references public.mpgf_phase_one_pledges (
    id,
    round_id,
    profile_id
  ) on delete restrict,
  constraint mpgf_phase_one_checkout_cancel_timestamp check (
    status <> 'cancelled' or cancelled_at is not null
  )
);

comment on table public.mpgf_phase_one_checkout_handoffs is
  'Private donor confirmations to leave Moral Trade for an external checkout. These rows are not payment receipts.';

create table if not exists public.mpgf_phase_one_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles (id) on delete restrict,
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  status text not null default 'received' check (
    status in ('received', 'completed')
  ),
  response_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (actor_profile_id, scope, idempotency_key)
);

create index if not exists mpgf_phase_one_projects_round_status_idx
  on public.mpgf_phase_one_projects (round_id, status, id);

create index if not exists mpgf_phase_one_pledges_round_status_idx
  on public.mpgf_phase_one_pledges (round_id, status, profile_id);

create index if not exists mpgf_phase_one_ballots_round_status_idx
  on public.mpgf_phase_one_ballots (round_id, status, voter_profile_id);

create index if not exists mpgf_phase_one_ballots_voter_fk_idx
  on public.mpgf_phase_one_ballots (voter_profile_id, round_id);

create index if not exists mpgf_phase_one_ballot_approvals_project_idx
  on public.mpgf_phase_one_ballot_approvals (round_id, project_id, ballot_id);

create index if not exists mpgf_phase_one_ballot_approvals_ballot_fk_idx
  on public.mpgf_phase_one_ballot_approvals (ballot_id, round_id);

create index if not exists mpgf_phase_one_candidate_project_fk_idx
  on public.mpgf_phase_one_candidate_snapshots (project_id, round_id);

create index if not exists mpgf_phase_one_eligible_voters_profile_fk_idx
  on public.mpgf_phase_one_eligible_voters (profile_id, round_id);

create index if not exists mpgf_phase_one_eligible_voters_pledge_fk_idx
  on public.mpgf_phase_one_eligible_voters (
    pledge_id,
    round_id,
    profile_id
  );

create index if not exists mpgf_phase_one_pledges_profile_fk_idx
  on public.mpgf_phase_one_pledges (profile_id, round_id);

create index if not exists mpgf_phase_one_checkout_handoffs_pledge_idx
  on public.mpgf_phase_one_checkout_handoffs (pledge_id, status);

create index if not exists mpgf_phase_one_checkout_handoffs_pledge_fk_idx
  on public.mpgf_phase_one_checkout_handoffs (
    pledge_id,
    round_id,
    profile_id
  );

create index if not exists mpgf_phase_one_checkout_handoffs_profile_fk_idx
  on public.mpgf_phase_one_checkout_handoffs (profile_id, round_id);

alter table public.mpgf_phase_one_rounds enable row level security;
alter table public.mpgf_phase_one_projects enable row level security;
alter table public.mpgf_phase_one_pledges enable row level security;
alter table public.mpgf_phase_one_eligible_voters enable row level security;
alter table public.mpgf_phase_one_candidate_snapshots enable row level security;
alter table public.mpgf_phase_one_ballots enable row level security;
alter table public.mpgf_phase_one_ballot_approvals enable row level security;
alter table public.mpgf_phase_one_checkout_handoffs enable row level security;
alter table public.mpgf_phase_one_idempotency_keys enable row level security;

create policy mpgf_phase_one_rounds_deny_direct_client_access
  on public.mpgf_phase_one_rounds
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_projects_deny_direct_client_access
  on public.mpgf_phase_one_projects
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_pledges_deny_direct_client_access
  on public.mpgf_phase_one_pledges
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_eligible_voters_deny_direct_client_access
  on public.mpgf_phase_one_eligible_voters
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_candidate_snapshots_deny_direct_client_access
  on public.mpgf_phase_one_candidate_snapshots
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_ballots_deny_direct_client_access
  on public.mpgf_phase_one_ballots
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_ballot_approvals_deny_direct_client_access
  on public.mpgf_phase_one_ballot_approvals
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_checkout_handoffs_deny_direct_client_access
  on public.mpgf_phase_one_checkout_handoffs
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy mpgf_phase_one_idempotency_keys_deny_direct_client_access
  on public.mpgf_phase_one_idempotency_keys
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table
  public.mpgf_phase_one_rounds,
  public.mpgf_phase_one_projects,
  public.mpgf_phase_one_pledges,
  public.mpgf_phase_one_eligible_voters,
  public.mpgf_phase_one_candidate_snapshots,
  public.mpgf_phase_one_ballots,
  public.mpgf_phase_one_ballot_approvals,
  public.mpgf_phase_one_checkout_handoffs,
  public.mpgf_phase_one_idempotency_keys
from anon, authenticated;

grant all on table
  public.mpgf_phase_one_rounds,
  public.mpgf_phase_one_projects,
  public.mpgf_phase_one_pledges,
  public.mpgf_phase_one_eligible_voters,
  public.mpgf_phase_one_candidate_snapshots,
  public.mpgf_phase_one_ballots,
  public.mpgf_phase_one_ballot_approvals,
  public.mpgf_phase_one_checkout_handoffs,
  public.mpgf_phase_one_idempotency_keys
to service_role;

create or replace function private.confirm_mpgf_phase_one_pledge(
  p_round_id uuid,
  p_amount_cents bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_pledge public.mpgf_phase_one_pledges%rowtype;
  v_scope text;
  v_request_hash text;
  v_existing_key public.mpgf_phase_one_idempotency_keys%rowtype;
  v_response jsonb;
begin
  if v_actor is null then
    raise exception 'Sign in to confirm an MPGF phase-one pledge.';
  end if;

  if not exists (select 1 from public.profiles where id = v_actor) then
    raise exception 'Complete your profile before confirming an MPGF pledge.';
  end if;

  if p_amount_cents is null
     or p_amount_cents <= 0
     or p_amount_cents > 9007199254740991 then
    raise exception 'MPGF pledge amount must be a positive safe integer number of cents.';
  end if;

  if p_idempotency_key is null
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]{12,160}$' then
    raise exception 'MPGF pledge confirmation requires a scoped idempotency key.';
  end if;

  select *
  into v_round
  from public.mpgf_phase_one_rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'MPGF phase-one round not found.';
  end if;

  if v_round.status <> 'pledge_open' then
    raise exception 'MPGF pledges are not open for this round.';
  end if;

  if v_round.pledge_opens_at is not null
     and timezone('utc', now()) < v_round.pledge_opens_at then
    raise exception 'MPGF pledge window has not opened.';
  end if;

  if v_round.pledge_closes_at is not null
     and timezone('utc', now()) >= v_round.pledge_closes_at then
    raise exception 'MPGF pledge window has closed.';
  end if;

  v_scope := 'mpgf.phase_one.pledge.confirm:' || p_round_id::text;
  v_request_hash := pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        p_round_id::text || '|' || p_amount_cents::text || '|confirmed',
        'UTF8'
      )
    ),
    'hex'
  );

  insert into public.mpgf_phase_one_idempotency_keys (
    actor_profile_id,
    scope,
    idempotency_key,
    request_hash
  ) values (
    v_actor,
    v_scope,
    p_idempotency_key,
    v_request_hash
  )
  on conflict (actor_profile_id, scope, idempotency_key) do nothing;

  if not found then
    select *
    into v_existing_key
    from public.mpgf_phase_one_idempotency_keys
    where actor_profile_id = v_actor
      and scope = v_scope
      and idempotency_key = p_idempotency_key;

    if v_existing_key.request_hash <> v_request_hash then
      raise exception 'MPGF idempotency key was reused for a different pledge request.';
    end if;

    if v_existing_key.status = 'completed'
       and v_existing_key.response_json is not null then
      return v_existing_key.response_json;
    end if;

    raise exception 'MPGF pledge confirmation is already in progress.';
  end if;

  insert into public.mpgf_phase_one_pledges (
    round_id,
    profile_id,
    amount_cents,
    status,
    terms_version,
    confirmed_at,
    cancelled_at,
    updated_at
  ) values (
    p_round_id,
    v_actor,
    p_amount_cents,
    'confirmed',
    v_round.terms_version,
    timezone('utc', now()),
    null,
    timezone('utc', now())
  )
  on conflict (round_id, profile_id) do update set
    amount_cents = excluded.amount_cents,
    status = 'confirmed',
    terms_version = excluded.terms_version,
    confirmed_at = timezone('utc', now()),
    cancelled_at = null,
    updated_at = timezone('utc', now())
  returning *
  into v_pledge;

  v_response := jsonb_build_object(
    'ok', true,
    'roundId', v_pledge.round_id,
    'pledgeId', v_pledge.id,
    'amountCents', v_pledge.amount_cents,
    'currency', v_pledge.currency,
    'status', v_pledge.status,
    'confirmedAt', v_pledge.confirmed_at,
    'governanceWeightCredits', 1,
    'amountAffectsGovernanceWeight', false,
    'moneyMoved', false
  );

  update public.mpgf_phase_one_idempotency_keys
  set
    status = 'completed',
    response_json = v_response
  where actor_profile_id = v_actor
    and scope = v_scope
    and idempotency_key = p_idempotency_key;

  return v_response;
end;
$$;

create or replace function private.cancel_mpgf_phase_one_pledge(
  p_round_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_pledge public.mpgf_phase_one_pledges%rowtype;
  v_scope text;
  v_request_hash text;
  v_existing_key public.mpgf_phase_one_idempotency_keys%rowtype;
  v_response jsonb;
begin
  if v_actor is null then
    raise exception 'Sign in to cancel an MPGF phase-one pledge.';
  end if;

  if p_idempotency_key is null
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]{12,160}$' then
    raise exception 'MPGF pledge cancellation requires a scoped idempotency key.';
  end if;

  select *
  into v_round
  from public.mpgf_phase_one_rounds
  where id = p_round_id
  for update;

  if not found or v_round.status <> 'pledge_open' then
    raise exception 'MPGF pledge cancellation is unavailable after voting opens.';
  end if;

  v_scope := 'mpgf.phase_one.pledge.cancel:' || p_round_id::text;
  v_request_hash := pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(p_round_id::text || '|cancelled', 'UTF8')
    ),
    'hex'
  );

  insert into public.mpgf_phase_one_idempotency_keys (
    actor_profile_id,
    scope,
    idempotency_key,
    request_hash
  ) values (
    v_actor,
    v_scope,
    p_idempotency_key,
    v_request_hash
  )
  on conflict (actor_profile_id, scope, idempotency_key) do nothing;

  if not found then
    select *
    into v_existing_key
    from public.mpgf_phase_one_idempotency_keys
    where actor_profile_id = v_actor
      and scope = v_scope
      and idempotency_key = p_idempotency_key;

    if v_existing_key.request_hash <> v_request_hash then
      raise exception 'MPGF idempotency key was reused for a different cancellation request.';
    end if;

    if v_existing_key.status = 'completed'
       and v_existing_key.response_json is not null then
      return v_existing_key.response_json;
    end if;

    raise exception 'MPGF pledge cancellation is already in progress.';
  end if;

  update public.mpgf_phase_one_pledges
  set
    status = 'cancelled',
    cancelled_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where round_id = p_round_id
    and profile_id = v_actor
    and status = 'confirmed'
  returning *
  into v_pledge;

  if not found then
    raise exception 'No confirmed MPGF phase-one pledge is available to cancel.';
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'roundId', v_pledge.round_id,
    'pledgeId', v_pledge.id,
    'status', v_pledge.status,
    'cancelledAt', v_pledge.cancelled_at,
    'moneyMoved', false
  );

  update public.mpgf_phase_one_idempotency_keys
  set
    status = 'completed',
    response_json = v_response
  where actor_profile_id = v_actor
    and scope = v_scope
    and idempotency_key = p_idempotency_key;

  return v_response;
end;
$$;

create or replace function public.open_mpgf_phase_one_ballot(
  p_round_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_eligible_count integer;
  v_candidate_count integer;
begin
  select *
  into v_round
  from public.mpgf_phase_one_rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'MPGF phase-one round not found.';
  end if;

  if v_round.status = 'ballot_open' then
    select count(*)
    into v_eligible_count
    from public.mpgf_phase_one_eligible_voters
    where round_id = p_round_id;

    select count(*)
    into v_candidate_count
    from public.mpgf_phase_one_candidate_snapshots
    where round_id = p_round_id;

    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'roundId', p_round_id,
      'status', 'ballot_open',
      'eligiblePledgerCount', v_eligible_count,
      'approvedProjectCount', v_candidate_count,
      'quorumBps', 5000,
      'ballotPolicy', 'equal_credit_approval_split_v1',
      'resultEffect', 'advisory_external_checkout_confirmation_required'
    );
  end if;

  if v_round.status <> 'pledge_open' then
    raise exception 'MPGF phase-one ballot can open only from pledge_open.';
  end if;

  if v_round.pledge_closes_at is not null
     and timezone('utc', now()) < v_round.pledge_closes_at then
    raise exception 'MPGF pledge window has not closed.';
  end if;

  if v_round.ballot_closes_at is null
     or v_round.ballot_closes_at <= timezone('utc', now()) then
    raise exception 'MPGF ballot close time must be in the future.';
  end if;

  insert into public.mpgf_phase_one_eligible_voters (
    round_id,
    profile_id,
    pledge_id,
    snapshotted_at
  )
  select
    p_round_id,
    pledge.profile_id,
    pledge.id,
    timezone('utc', now())
  from public.mpgf_phase_one_pledges pledge
  where pledge.round_id = p_round_id
    and pledge.status = 'confirmed'
  on conflict (round_id, profile_id) do nothing;

  select count(*)
  into v_eligible_count
  from public.mpgf_phase_one_eligible_voters
  where round_id = p_round_id;

  if v_eligible_count <= 0 then
    raise exception 'MPGF ballot requires at least one confirmed pledger.';
  end if;

  insert into public.mpgf_phase_one_candidate_snapshots (
    round_id,
    project_id,
    title,
    summary,
    recipient_name,
    action_category,
    external_checkout_url_snapshot,
    snapshotted_at
  )
  select
    p_round_id,
    project.id,
    project.title,
    project.summary,
    project.recipient_name,
    project.action_category,
    project.external_checkout_url,
    timezone('utc', now())
  from public.mpgf_phase_one_projects project
  where project.round_id = p_round_id
    and project.status = 'approved'
  on conflict (round_id, project_id) do nothing;

  select count(*)
  into v_candidate_count
  from public.mpgf_phase_one_candidate_snapshots
  where round_id = p_round_id;

  if v_candidate_count <= 0 then
    raise exception 'MPGF ballot requires at least one reviewed approved project.';
  end if;

  update public.mpgf_phase_one_rounds
  set
    status = 'ballot_open',
    ballot_opens_at = coalesce(ballot_opens_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_round_id;

  return jsonb_build_object(
    'ok', true,
    'roundId', p_round_id,
    'status', 'ballot_open',
    'eligiblePledgerCount', v_eligible_count,
    'approvedProjectCount', v_candidate_count,
    'quorumBps', 5000,
    'ballotPolicy', 'equal_credit_approval_split_v1',
    'resultEffect', 'advisory_external_checkout_confirmation_required'
  );
end;
$$;

create or replace function private.submit_mpgf_phase_one_ballot(
  p_round_id uuid,
  p_project_ids uuid[],
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_ballot public.mpgf_phase_one_ballots%rowtype;
  v_project_ids uuid[];
  v_selection_count integer;
  v_valid_project_count integer;
  v_scope text;
  v_request_hash text;
  v_existing_key public.mpgf_phase_one_idempotency_keys%rowtype;
  v_response jsonb;
begin
  if v_actor is null then
    raise exception 'Sign in to submit an MPGF phase-one ballot.';
  end if;

  if p_idempotency_key is null
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]{12,160}$' then
    raise exception 'MPGF ballot submission requires a scoped idempotency key.';
  end if;

  select coalesce(array_agg(project_id order by project_id), '{}'::uuid[])
  into v_project_ids
  from (
    select distinct project_id
    from unnest(coalesce(p_project_ids, '{}'::uuid[])) as selected(project_id)
    where project_id is not null
  ) normalized;

  v_selection_count := coalesce(cardinality(v_project_ids), 0);

  if v_selection_count <= 0 or v_selection_count > 50 then
    raise exception 'Select between 1 and 50 approved MPGF projects.';
  end if;

  if cardinality(coalesce(p_project_ids, '{}'::uuid[])) <> v_selection_count then
    raise exception 'MPGF ballot selections must be non-null and unique.';
  end if;

  select *
  into v_round
  from public.mpgf_phase_one_rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'MPGF phase-one round not found.';
  end if;

  if v_round.status <> 'ballot_open' then
    raise exception 'MPGF ballot is not open for this round.';
  end if;

  if v_round.ballot_opens_at is not null
     and timezone('utc', now()) < v_round.ballot_opens_at then
    raise exception 'MPGF ballot window has not opened.';
  end if;

  if v_round.ballot_closes_at is not null
     and timezone('utc', now()) >= v_round.ballot_closes_at then
    raise exception 'MPGF ballot window has closed.';
  end if;

  if not exists (
    select 1
    from public.mpgf_phase_one_eligible_voters voter
    where voter.round_id = p_round_id
      and voter.profile_id = v_actor
  ) then
    raise exception 'Only a confirmed pledger in the frozen electorate may submit this ballot.';
  end if;

  select count(*)
  into v_valid_project_count
  from public.mpgf_phase_one_candidate_snapshots candidate
  where candidate.round_id = p_round_id
    and candidate.project_id = any(v_project_ids);

  if v_valid_project_count <> v_selection_count then
    raise exception 'MPGF ballot contains a project outside the frozen approved candidate set.';
  end if;

  v_scope := 'mpgf.phase_one.ballot.submit:' || p_round_id::text;
  v_request_hash := pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        p_round_id::text || '|' || array_to_string(v_project_ids, ','),
        'UTF8'
      )
    ),
    'hex'
  );

  insert into public.mpgf_phase_one_idempotency_keys (
    actor_profile_id,
    scope,
    idempotency_key,
    request_hash
  ) values (
    v_actor,
    v_scope,
    p_idempotency_key,
    v_request_hash
  )
  on conflict (actor_profile_id, scope, idempotency_key) do nothing;

  if not found then
    select *
    into v_existing_key
    from public.mpgf_phase_one_idempotency_keys
    where actor_profile_id = v_actor
      and scope = v_scope
      and idempotency_key = p_idempotency_key;

    if v_existing_key.request_hash <> v_request_hash then
      raise exception 'MPGF idempotency key was reused for a different ballot.';
    end if;

    if v_existing_key.status = 'completed'
       and v_existing_key.response_json is not null then
      return v_existing_key.response_json;
    end if;

    raise exception 'MPGF ballot submission is already in progress.';
  end if;

  insert into public.mpgf_phase_one_ballots (
    round_id,
    voter_profile_id,
    selection_count,
    status,
    revision,
    submitted_at,
    updated_at
  ) values (
    p_round_id,
    v_actor,
    v_selection_count,
    'submitted',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (round_id, voter_profile_id) do update set
    selection_count = excluded.selection_count,
    status = 'submitted',
    revision = public.mpgf_phase_one_ballots.revision + 1,
    submitted_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning *
  into v_ballot;

  delete from public.mpgf_phase_one_ballot_approvals
  where round_id = p_round_id
    and ballot_id = v_ballot.id;

  insert into public.mpgf_phase_one_ballot_approvals (
    round_id,
    ballot_id,
    project_id
  )
  select
    p_round_id,
    v_ballot.id,
    project_id
  from unnest(v_project_ids) as selected(project_id);

  v_response := jsonb_build_object(
    'ok', true,
    'roundId', v_ballot.round_id,
    'ballotId', v_ballot.id,
    'status', v_ballot.status,
    'revision', v_ballot.revision,
    'selectedProjectIds', to_jsonb(v_project_ids),
    'selectionCount', v_ballot.selection_count,
    'totalVotingCredits', 1,
    'creditPerSelectedProject',
      (1::numeric / v_ballot.selection_count::numeric)::text,
    'pledgeAmountAffectsWeight', false,
    'resultEffect', 'advisory_external_checkout_confirmation_required',
    'submittedAt', v_ballot.submitted_at
  );

  update public.mpgf_phase_one_idempotency_keys
  set
    status = 'completed',
    response_json = v_response
  where actor_profile_id = v_actor
    and scope = v_scope
    and idempotency_key = p_idempotency_key;

  return v_response;
end;
$$;

create or replace function public.publish_mpgf_phase_one_results(
  p_round_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_eligible_count integer;
  v_ballot_count integer;
  v_quorum_required integer;
  v_quorum_met boolean;
  v_result_hash text;
  v_status text;
begin
  select *
  into v_round
  from public.mpgf_phase_one_rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'MPGF phase-one round not found.';
  end if;

  if v_round.status in ('results_published', 'quorum_failed', 'closed') then
    select count(*)
    into v_eligible_count
    from public.mpgf_phase_one_eligible_voters
    where round_id = p_round_id;

    select count(*)
    into v_ballot_count
    from public.mpgf_phase_one_ballots
    where round_id = p_round_id
      and status = 'submitted';

    v_quorum_required := (v_eligible_count + 1) / 2;

    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'roundId', p_round_id,
      'status', v_round.status,
      'eligiblePledgerCount', v_eligible_count,
      'submittedBallotCount', v_ballot_count,
      'quorumRequiredCount', v_quorum_required,
      'quorumMet', v_round.quorum_met,
      'quorumBps', 5000,
      'resultHash', v_round.result_hash,
      'binding', false,
      'externalCheckoutConfirmationRequired', true
    );
  end if;

  if v_round.status <> 'ballot_open' then
    raise exception 'MPGF phase-one results can publish only from ballot_open.';
  end if;

  if v_round.ballot_closes_at is not null
     and timezone('utc', now()) < v_round.ballot_closes_at then
    raise exception 'MPGF ballot window has not closed.';
  end if;

  select count(*)
  into v_eligible_count
  from public.mpgf_phase_one_eligible_voters
  where round_id = p_round_id;

  select count(*)
  into v_ballot_count
  from public.mpgf_phase_one_ballots
  where round_id = p_round_id
    and status = 'submitted';

  v_quorum_required := (v_eligible_count + 1) / 2;
  v_quorum_met := v_eligible_count > 0
    and v_ballot_count >= v_quorum_required;
  v_status := case when v_quorum_met then 'results_published' else 'quorum_failed' end;

  select pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        p_round_id::text
        || '|' || v_eligible_count::text
        || '|' || v_ballot_count::text
        || '|' || v_quorum_required::text
        || '|' || coalesce(
          string_agg(
            score.project_id::text || ':' || score.credit_score::text,
            ',' order by score.project_id
          ),
          ''
        ),
        'UTF8'
      )
    ),
    'hex'
  )
  into v_result_hash
  from (
    select
      candidate.project_id,
      coalesce(
        sum(1::numeric / nullif(ballot.selection_count, 0)::numeric)
          filter (where ballot.status = 'submitted'),
        0::numeric
      ) as credit_score
    from public.mpgf_phase_one_candidate_snapshots candidate
    left join public.mpgf_phase_one_ballot_approvals approval
      on approval.round_id = candidate.round_id
      and approval.project_id = candidate.project_id
    left join public.mpgf_phase_one_ballots ballot
      on ballot.id = approval.ballot_id
      and ballot.round_id = candidate.round_id
    where candidate.round_id = p_round_id
    group by candidate.project_id
  ) score;

  update public.mpgf_phase_one_rounds
  set
    status = v_status,
    result_hash = v_result_hash,
    quorum_met = v_quorum_met,
    results_published_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_round_id;

  return jsonb_build_object(
    'ok', true,
    'roundId', p_round_id,
    'status', v_status,
    'eligiblePledgerCount', v_eligible_count,
    'submittedBallotCount', v_ballot_count,
    'quorumRequiredCount', v_quorum_required,
    'quorumMet', v_quorum_met,
    'quorumBps', 5000,
    'resultHash', v_result_hash,
    'binding', false,
    'externalCheckoutConfirmationRequired', true
  );
end;
$$;

create or replace function private.get_mpgf_phase_one_governance_state(
  p_round_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_projects jsonb := '[]'::jsonb;
  v_results jsonb := null;
  v_eligible_count integer := 0;
  v_ballot_count integer := 0;
  v_quorum_required integer := 0;
  v_quorum_met boolean := false;
begin
  if p_round_id is null then
    select *
    into v_round
    from public.mpgf_phase_one_rounds
    where status not in ('draft', 'cancelled')
    order by created_at desc, id desc
    limit 1;
  else
    select *
    into v_round
    from public.mpgf_phase_one_rounds
    where id = p_round_id
      and status not in ('draft', 'cancelled');
  end if;

  if not found then
    return jsonb_build_object(
      'available', true,
      'round', null,
      'projects', jsonb_build_array(),
      'results', null,
      'policy', jsonb_build_object(
        'ballotPolicy', 'equal_credit_approval_split_v1',
        'governanceWeightPerConfirmedPledger', 1,
        'pledgeAmountAffectsWeight', false,
        'quorumBps', 5000,
        'binding', false,
        'externalCheckoutConfirmationRequired', true
      )
    );
  end if;

  if v_round.status in ('ballot_open', 'results_published', 'quorum_failed', 'closed') then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', candidate.project_id,
          'title', candidate.title,
          'summary', candidate.summary,
          'recipientName', candidate.recipient_name,
          'actionCategory', candidate.action_category,
          'status', project.status,
          'checkoutAvailable', project.status = 'approved'
        )
        order by candidate.title, candidate.project_id
      ),
      '[]'::jsonb
    )
    into v_projects
    from public.mpgf_phase_one_candidate_snapshots candidate
    join public.mpgf_phase_one_projects project
      on project.id = candidate.project_id
    where candidate.round_id = v_round.id;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', project.id,
          'title', project.title,
          'summary', project.summary,
          'recipientName', project.recipient_name,
          'actionCategory', project.action_category,
          'status', project.status,
          'checkoutAvailable', false
        )
        order by project.title, project.id
      ),
      '[]'::jsonb
    )
    into v_projects
    from public.mpgf_phase_one_projects project
    where project.round_id = v_round.id
      and project.status = 'approved';
  end if;

  if v_round.status in ('results_published', 'quorum_failed', 'closed') then
    select count(*)
    into v_eligible_count
    from public.mpgf_phase_one_eligible_voters
    where round_id = v_round.id;

    select count(*)
    into v_ballot_count
    from public.mpgf_phase_one_ballots
    where round_id = v_round.id
      and status = 'submitted';

    v_quorum_required := (v_eligible_count + 1) / 2;
    v_quorum_met := v_round.quorum_met
      and v_eligible_count > 0
      and v_ballot_count >= v_quorum_required
      and v_round.status in ('results_published', 'closed');

    if v_quorum_met then
      with scores as (
        select
          candidate.project_id,
          candidate.title,
          coalesce(
            sum(1::numeric / nullif(ballot.selection_count, 0)::numeric)
              filter (where ballot.status = 'submitted'),
            0::numeric
          ) as credit_score
        from public.mpgf_phase_one_candidate_snapshots candidate
        left join public.mpgf_phase_one_ballot_approvals approval
          on approval.round_id = candidate.round_id
          and approval.project_id = candidate.project_id
        left join public.mpgf_phase_one_ballots ballot
          on ballot.id = approval.ballot_id
          and ballot.round_id = candidate.round_id
        where candidate.round_id = v_round.id
        group by candidate.project_id, candidate.title
      ),
      raw_shares as (
        select
          scores.*,
          (scores.credit_score * 10000::numeric / v_ballot_count::numeric) as raw_bps
        from scores
      ),
      floors as (
        select
          raw_shares.*,
          floor(raw_shares.raw_bps)::integer as floor_bps,
          raw_shares.raw_bps - floor(raw_shares.raw_bps) as remainder
        from raw_shares
      ),
      remainder_budget as (
        select 10000 - coalesce(sum(floor_bps), 0) as slots
        from floors
      ),
      ranked as (
        select
          floors.*,
          row_number() over (
            order by floors.remainder desc, floors.project_id asc
          ) as remainder_rank
        from floors
      )
      select jsonb_build_object(
        'eligiblePledgerCount', v_eligible_count,
        'submittedBallotCount', v_ballot_count,
        'quorumRequiredCount', v_quorum_required,
        'quorumMet', true,
        'quorumBps', 5000,
        'resultHash', v_round.result_hash,
        'binding', false,
        'externalCheckoutConfirmationRequired', true,
        'projectShares', coalesce(
          jsonb_agg(
            jsonb_build_object(
              'projectId', ranked.project_id,
              'title', ranked.title,
              'creditScore', ranked.credit_score::text,
              'advisoryShareBps',
                ranked.floor_bps
                + case
                    when ranked.remainder_rank <= remainder_budget.slots then 1
                    else 0
                  end
            )
            order by
              (
                ranked.floor_bps
                + case
                    when ranked.remainder_rank <= remainder_budget.slots then 1
                    else 0
                  end
              ) desc,
              ranked.project_id asc
          ),
          '[]'::jsonb
        )
      )
      into v_results
      from ranked
      cross join remainder_budget;
    else
      v_results := jsonb_build_object(
        'eligiblePledgerCount', v_eligible_count,
        'submittedBallotCount', v_ballot_count,
        'quorumRequiredCount', v_quorum_required,
        'quorumMet', false,
        'quorumBps', 5000,
        'resultHash', v_round.result_hash,
        'binding', false,
        'externalCheckoutConfirmationRequired', true,
        'projectShares', jsonb_build_array()
      );
    end if;
  end if;

  return jsonb_build_object(
    'available', true,
    'round', jsonb_build_object(
      'id', v_round.id,
      'slug', v_round.slug,
      'title', v_round.title,
      'status', v_round.status,
      'pledgeOpensAt', v_round.pledge_opens_at,
      'pledgeClosesAt', v_round.pledge_closes_at,
      'ballotOpensAt', v_round.ballot_opens_at,
      'ballotClosesAt', v_round.ballot_closes_at,
      'termsVersion', v_round.terms_version
    ),
    'projects', v_projects,
    'results', v_results,
    'policy', jsonb_build_object(
      'ballotPolicy', v_round.ballot_policy,
      'governanceWeightPerConfirmedPledger', 1,
      'pledgeAmountAffectsWeight', false,
      'quorumBps', 5000,
      'binding', false,
      'externalCheckoutConfirmationRequired', true
    )
  );
end;
$$;

create or replace function private.get_mpgf_phase_one_participant_state(
  p_round_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_pledge jsonb := null;
  v_ballot jsonb := null;
  v_handoffs jsonb := '[]'::jsonb;
  v_eligible boolean := false;
begin
  if v_actor is null then
    raise exception 'Sign in to load MPGF phase-one participant state.';
  end if;

  select jsonb_build_object(
    'id', pledge.id,
    'amountCents', pledge.amount_cents,
    'currency', pledge.currency,
    'status', pledge.status,
    'confirmedAt', pledge.confirmed_at,
    'cancelledAt', pledge.cancelled_at,
    'termsVersion', pledge.terms_version
  )
  into v_pledge
  from public.mpgf_phase_one_pledges pledge
  where pledge.round_id = p_round_id
    and pledge.profile_id = v_actor;

  select exists (
    select 1
    from public.mpgf_phase_one_eligible_voters voter
    where voter.round_id = p_round_id
      and voter.profile_id = v_actor
  )
  into v_eligible;

  select jsonb_build_object(
    'id', ballot.id,
    'status', ballot.status,
    'revision', ballot.revision,
    'selectionCount', ballot.selection_count,
    'selectedProjectIds', coalesce(
      (
        select jsonb_agg(approval.project_id order by approval.project_id)
        from public.mpgf_phase_one_ballot_approvals approval
        where approval.ballot_id = ballot.id
      ),
      '[]'::jsonb
    ),
    'submittedAt', ballot.submitted_at
  )
  into v_ballot
  from public.mpgf_phase_one_ballots ballot
  where ballot.round_id = p_round_id
    and ballot.voter_profile_id = v_actor;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', handoff.id,
        'projectId', handoff.project_id,
        'amountCents', handoff.amount_cents,
        'currency', handoff.currency,
        'status', handoff.status,
        'resultHash', handoff.result_hash,
        'confirmedAt', handoff.confirmed_at,
        'cancelledAt', handoff.cancelled_at
      )
      order by handoff.confirmed_at desc, handoff.id
    ),
    '[]'::jsonb
  )
  into v_handoffs
  from public.mpgf_phase_one_checkout_handoffs handoff
  where handoff.round_id = p_round_id
    and handoff.profile_id = v_actor;

  return jsonb_build_object(
    'roundId', p_round_id,
    'pledge', v_pledge,
    'eligibleToVote', v_eligible,
    'ballot', v_ballot,
    'checkoutHandoffs', v_handoffs
  );
end;
$$;

create or replace function private.confirm_mpgf_phase_one_external_checkout(
  p_round_id uuid,
  p_project_id uuid,
  p_amount_cents bigint,
  p_result_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_round public.mpgf_phase_one_rounds%rowtype;
  v_project public.mpgf_phase_one_projects%rowtype;
  v_candidate public.mpgf_phase_one_candidate_snapshots%rowtype;
  v_pledge public.mpgf_phase_one_pledges%rowtype;
  v_handoff public.mpgf_phase_one_checkout_handoffs%rowtype;
  v_existing_total bigint;
  v_scope text;
  v_request_hash text;
  v_existing_key public.mpgf_phase_one_idempotency_keys%rowtype;
  v_response jsonb;
begin
  if v_actor is null then
    raise exception 'Sign in before confirming an external MPGF checkout handoff.';
  end if;

  if p_amount_cents is null
     or p_amount_cents <= 0
     or p_amount_cents > 9007199254740991 then
    raise exception 'External checkout handoff amount must be a positive safe integer number of cents.';
  end if;

  if p_result_hash is null or p_result_hash = '' then
    raise exception 'External checkout confirmation requires the published result hash.';
  end if;

  if p_idempotency_key is null
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]{12,160}$' then
    raise exception 'External checkout confirmation requires a scoped idempotency key.';
  end if;

  select *
  into v_round
  from public.mpgf_phase_one_rounds
  where id = p_round_id
  for update;

  if not found
     or v_round.status not in ('results_published', 'closed')
     or not v_round.quorum_met
     or v_round.result_hash is distinct from p_result_hash then
    raise exception 'External checkout requires the current quorum-passing published result.';
  end if;

  select *
  into v_pledge
  from public.mpgf_phase_one_pledges
  where round_id = p_round_id
    and profile_id = v_actor
    and status = 'confirmed'
  for update;

  if not found then
    raise exception 'Only a confirmed pledger may confirm this external checkout handoff.';
  end if;

  if not exists (
    select 1
    from public.mpgf_phase_one_eligible_voters voter
    where voter.round_id = p_round_id
      and voter.profile_id = v_actor
      and voter.pledge_id = v_pledge.id
  ) then
    raise exception 'External checkout requires membership in the frozen confirmed-pledger electorate.';
  end if;

  select *
  into v_candidate
  from public.mpgf_phase_one_candidate_snapshots
  where round_id = p_round_id
    and project_id = p_project_id;

  if not found then
    raise exception 'External checkout project is outside the frozen candidate set.';
  end if;

  select *
  into v_project
  from public.mpgf_phase_one_projects
  where id = p_project_id
    and round_id = p_round_id
  for update;

  if not found or v_project.status <> 'approved' then
    raise exception 'External checkout is paused unless the reviewed project remains approved.';
  end if;

  select coalesce(sum(handoff.amount_cents), 0)
  into v_existing_total
  from public.mpgf_phase_one_checkout_handoffs handoff
  where handoff.pledge_id = v_pledge.id
    and handoff.status = 'confirmed_external_handoff'
    and handoff.project_id <> p_project_id;

  if v_existing_total + p_amount_cents > v_pledge.amount_cents then
    raise exception 'External checkout confirmations cannot exceed the confirmed pledge amount.';
  end if;

  v_scope := 'mpgf.phase_one.checkout.confirm:'
    || p_round_id::text
    || ':'
    || p_project_id::text;
  v_request_hash := pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        p_round_id::text
        || '|' || p_project_id::text
        || '|' || p_amount_cents::text
        || '|' || p_result_hash,
        'UTF8'
      )
    ),
    'hex'
  );

  insert into public.mpgf_phase_one_idempotency_keys (
    actor_profile_id,
    scope,
    idempotency_key,
    request_hash
  ) values (
    v_actor,
    v_scope,
    p_idempotency_key,
    v_request_hash
  )
  on conflict (actor_profile_id, scope, idempotency_key) do nothing;

  if not found then
    select *
    into v_existing_key
    from public.mpgf_phase_one_idempotency_keys
    where actor_profile_id = v_actor
      and scope = v_scope
      and idempotency_key = p_idempotency_key;

    if v_existing_key.request_hash <> v_request_hash then
      raise exception 'MPGF idempotency key was reused for a different checkout confirmation.';
    end if;

    if v_existing_key.status = 'completed'
       and v_existing_key.response_json is not null then
      return v_existing_key.response_json;
    end if;

    raise exception 'External checkout confirmation is already in progress.';
  end if;

  insert into public.mpgf_phase_one_checkout_handoffs (
    round_id,
    project_id,
    pledge_id,
    profile_id,
    amount_cents,
    status,
    result_hash,
    confirmed_at,
    cancelled_at,
    updated_at
  ) values (
    p_round_id,
    p_project_id,
    v_pledge.id,
    v_actor,
    p_amount_cents,
    'confirmed_external_handoff',
    p_result_hash,
    timezone('utc', now()),
    null,
    timezone('utc', now())
  )
  on conflict (round_id, project_id, profile_id) do update set
    pledge_id = excluded.pledge_id,
    amount_cents = excluded.amount_cents,
    status = 'confirmed_external_handoff',
    result_hash = excluded.result_hash,
    confirmed_at = timezone('utc', now()),
    cancelled_at = null,
    updated_at = timezone('utc', now())
  returning *
  into v_handoff;

  v_response := jsonb_build_object(
    'ok', true,
    'roundId', p_round_id,
    'projectId', p_project_id,
    'handoffId', v_handoff.id,
    'amountCents', v_handoff.amount_cents,
    'currency', v_handoff.currency,
    'status', v_handoff.status,
    'externalCheckoutUrl', v_candidate.external_checkout_url_snapshot,
    'moneyMoved', false,
    'paymentConfirmed', false,
    'receiptRecorded', false,
    'nextAction', 'complete_external_checkout'
  );

  update public.mpgf_phase_one_idempotency_keys
  set
    status = 'completed',
    response_json = v_response
  where actor_profile_id = v_actor
    and scope = v_scope
    and idempotency_key = p_idempotency_key;

  return v_response;
end;
$$;

grant usage on schema private to anon, authenticated, service_role;

revoke all on function private.confirm_mpgf_phase_one_pledge(uuid, bigint, text)
  from public;
revoke all on function private.cancel_mpgf_phase_one_pledge(uuid, text)
  from public;
revoke all on function private.submit_mpgf_phase_one_ballot(uuid, uuid[], text)
  from public;
revoke all on function private.get_mpgf_phase_one_participant_state(uuid)
  from public;
revoke all on function private.confirm_mpgf_phase_one_external_checkout(uuid, uuid, bigint, text, text)
  from public;
revoke all on function private.get_mpgf_phase_one_governance_state(uuid)
  from public;

grant execute on function private.confirm_mpgf_phase_one_pledge(uuid, bigint, text)
  to authenticated, service_role;
grant execute on function private.cancel_mpgf_phase_one_pledge(uuid, text)
  to authenticated, service_role;
grant execute on function private.submit_mpgf_phase_one_ballot(uuid, uuid[], text)
  to authenticated, service_role;
grant execute on function private.get_mpgf_phase_one_participant_state(uuid)
  to authenticated, service_role;
grant execute on function private.confirm_mpgf_phase_one_external_checkout(uuid, uuid, bigint, text, text)
  to authenticated, service_role;
grant execute on function private.get_mpgf_phase_one_governance_state(uuid)
  to anon, authenticated, service_role;

create or replace function public.confirm_mpgf_phase_one_pledge(
  p_round_id uuid,
  p_amount_cents bigint,
  p_idempotency_key text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select private.confirm_mpgf_phase_one_pledge($1, $2, $3);
$$;

create or replace function public.cancel_mpgf_phase_one_pledge(
  p_round_id uuid,
  p_idempotency_key text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select private.cancel_mpgf_phase_one_pledge($1, $2);
$$;

create or replace function public.submit_mpgf_phase_one_ballot(
  p_round_id uuid,
  p_project_ids uuid[],
  p_idempotency_key text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select private.submit_mpgf_phase_one_ballot($1, $2, $3);
$$;

create or replace function public.get_mpgf_phase_one_participant_state(
  p_round_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select private.get_mpgf_phase_one_participant_state($1);
$$;

create or replace function public.confirm_mpgf_phase_one_external_checkout(
  p_round_id uuid,
  p_project_id uuid,
  p_amount_cents bigint,
  p_result_hash text,
  p_idempotency_key text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select private.confirm_mpgf_phase_one_external_checkout($1, $2, $3, $4, $5);
$$;

create or replace function public.get_mpgf_phase_one_governance_state(
  p_round_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select private.get_mpgf_phase_one_governance_state($1);
$$;

revoke all on function public.confirm_mpgf_phase_one_pledge(uuid, bigint, text)
  from public, anon;
revoke all on function public.cancel_mpgf_phase_one_pledge(uuid, text)
  from public, anon;
revoke all on function public.submit_mpgf_phase_one_ballot(uuid, uuid[], text)
  from public, anon;
revoke all on function public.get_mpgf_phase_one_participant_state(uuid)
  from public, anon;
revoke all on function public.confirm_mpgf_phase_one_external_checkout(uuid, uuid, bigint, text, text)
  from public, anon;

grant execute on function public.confirm_mpgf_phase_one_pledge(uuid, bigint, text)
  to authenticated;
grant execute on function public.cancel_mpgf_phase_one_pledge(uuid, text)
  to authenticated;
grant execute on function public.submit_mpgf_phase_one_ballot(uuid, uuid[], text)
  to authenticated;
grant execute on function public.get_mpgf_phase_one_participant_state(uuid)
  to authenticated;
grant execute on function public.confirm_mpgf_phase_one_external_checkout(uuid, uuid, bigint, text, text)
  to authenticated;

revoke all on function public.open_mpgf_phase_one_ballot(uuid)
  from public, anon, authenticated;
revoke all on function public.publish_mpgf_phase_one_results(uuid)
  from public, anon, authenticated;
grant execute on function public.open_mpgf_phase_one_ballot(uuid)
  to service_role;
grant execute on function public.publish_mpgf_phase_one_results(uuid)
  to service_role;

revoke all on function public.get_mpgf_phase_one_governance_state(uuid)
  from public;
grant execute on function public.get_mpgf_phase_one_governance_state(uuid)
  to anon, authenticated, service_role;

commit;
