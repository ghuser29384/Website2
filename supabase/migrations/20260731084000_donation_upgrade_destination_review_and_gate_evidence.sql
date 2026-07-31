-- Reviewed fallback-recipient requests and evidence-bound payment-gate decisions.
--
-- Users may request an Every.org-listed fallback charity, but the request is not a
-- payment destination until an accountable operator approves the frozen identity.
-- Live payment gates cannot be marked passed without named ownership and immutable
-- evidence references. All mutation functions remain service-role-only.

create extension if not exists pgcrypto;

create table if not exists public.conditional_payment_destination_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete restrict,
  environment text not null check (environment in ('test', 'live')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  provider_nonprofit_id text not null,
  nonprofit_slug text not null,
  display_name text not null,
  nonprofit_ein text not null default '',
  country_code text not null default '',
  website_url text not null,
  identity_snapshot jsonb not null,
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text not null default '',
  destination_id uuid references public.conditional_payment_destinations(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (environment, provider, provider_nonprofit_id),
  check (website_url ~ '^https://'),
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and destination_id is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and destination_id is not null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and destination_id is null)
  )
);

create table if not exists public.conditional_payment_destination_review_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.conditional_payment_destination_requests(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('submitted', 'approved', 'rejected')),
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists conditional_destination_requests_requester_idx
  on public.conditional_payment_destination_requests(requester_profile_id, created_at desc);
create index if not exists conditional_destination_requests_review_idx
  on public.conditional_payment_destination_requests(environment, status, created_at);
create index if not exists conditional_destination_review_events_request_idx
  on public.conditional_payment_destination_review_events(request_id, created_at);

create or replace function public.set_conditional_destination_request_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_conditional_destination_request_updated_at_trigger
  on public.conditional_payment_destination_requests;
create trigger set_conditional_destination_request_updated_at_trigger
before update on public.conditional_payment_destination_requests
for each row execute function public.set_conditional_destination_request_updated_at();

create or replace function public.guard_conditional_destination_request_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Destination requests are retained as an audit record.';
  end if;
  if new.requester_profile_id <> old.requester_profile_id
     or new.environment <> old.environment
     or new.provider <> old.provider
     or new.provider_nonprofit_id <> old.provider_nonprofit_id
     or new.nonprofit_slug <> old.nonprofit_slug
     or new.display_name <> old.display_name
     or new.nonprofit_ein <> old.nonprofit_ein
     or new.country_code <> old.country_code
     or new.website_url <> old.website_url
     or new.identity_snapshot <> old.identity_snapshot
     or new.identity_hash <> old.identity_hash
     or new.created_at <> old.created_at then
    raise exception 'Destination request identity is immutable.';
  end if;
  if old.status <> 'pending' and (
    new.status <> old.status
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.review_notes <> old.review_notes
    or new.destination_id is distinct from old.destination_id
  ) then
    raise exception 'A reviewed destination request is immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_conditional_destination_request_identity_trigger
  on public.conditional_payment_destination_requests;
create trigger guard_conditional_destination_request_identity_trigger
before update or delete on public.conditional_payment_destination_requests
for each row execute function public.guard_conditional_destination_request_identity();

create or replace function public.prevent_conditional_destination_review_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Destination review events are immutable.';
end;
$$;

drop trigger if exists prevent_conditional_destination_review_event_mutation_trigger
  on public.conditional_payment_destination_review_events;
create trigger prevent_conditional_destination_review_event_mutation_trigger
before update or delete on public.conditional_payment_destination_review_events
for each row execute function public.prevent_conditional_destination_review_event_mutation();

create or replace function public.submit_conditional_payment_destination_request(
  p_requester_profile_id uuid,
  p_environment text,
  p_provider_nonprofit_id text,
  p_nonprofit_slug text,
  p_display_name text,
  p_nonprofit_ein text,
  p_country_code text,
  p_website_url text,
  p_identity_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_identity jsonb;
  identity_hash_value text;
  request_row public.conditional_payment_destination_requests%rowtype;
begin
  if p_environment not in ('test', 'live') then
    raise exception 'Invalid destination-request environment.';
  end if;
  if not exists (select 1 from public.profiles where id = p_requester_profile_id) then
    raise exception 'The requesting profile does not exist.';
  end if;
  if length(trim(coalesce(p_provider_nonprofit_id, ''))) < 2
     or length(trim(coalesce(p_nonprofit_slug, ''))) < 2
     or length(trim(coalesce(p_display_name, ''))) < 2 then
    raise exception 'Provider ID, nonprofit slug, and display name are required.';
  end if;
  if trim(coalesce(p_website_url, '')) !~ '^https://' then
    raise exception 'An HTTPS nonprofit profile or official website is required.';
  end if;
  if p_identity_snapshot is null or jsonb_typeof(p_identity_snapshot) <> 'object' then
    raise exception 'A structured identity snapshot is required.';
  end if;

  normalized_identity := jsonb_build_object(
    'schemaVersion', 'conditional-payment-destination-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', lower(trim(p_provider_nonprofit_id)),
    'nonprofitSlug', lower(trim(p_nonprofit_slug)),
    'displayName', trim(p_display_name),
    'nonprofitEin', regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g'),
    'countryCode', upper(left(trim(coalesce(p_country_code, '')), 2)),
    'websiteUrl', trim(p_website_url),
    'sourceSnapshot', p_identity_snapshot
  );
  identity_hash_value := encode(
    extensions.digest(convert_to(normalized_identity::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select * into request_row
  from public.conditional_payment_destination_requests
  where environment = p_environment
    and provider = 'every_org'
    and provider_nonprofit_id = lower(trim(p_provider_nonprofit_id))
  for update;

  if found then
    if request_row.identity_hash <> identity_hash_value then
      raise exception 'This provider nonprofit already has a request with different frozen identity data.';
    end if;
    return to_jsonb(request_row);
  end if;

  insert into public.conditional_payment_destination_requests(
    requester_profile_id,
    environment,
    provider,
    provider_nonprofit_id,
    nonprofit_slug,
    display_name,
    nonprofit_ein,
    country_code,
    website_url,
    identity_snapshot,
    identity_hash
  ) values (
    p_requester_profile_id,
    p_environment,
    'every_org',
    lower(trim(p_provider_nonprofit_id)),
    lower(trim(p_nonprofit_slug)),
    trim(p_display_name),
    regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g'),
    upper(left(trim(coalesce(p_country_code, '')), 2)),
    trim(p_website_url),
    normalized_identity,
    identity_hash_value
  ) returning * into request_row;

  insert into public.conditional_payment_destination_review_events(
    request_id, actor_profile_id, decision, identity_hash, notes
  ) values (
    request_row.id,
    p_requester_profile_id,
    'submitted',
    request_row.identity_hash,
    'User requested review of a provider-listed fallback charity.'
  );

  return to_jsonb(request_row);
end;
$$;

create or replace function public.review_conditional_payment_destination_request(
  p_actor_profile_id uuid,
  p_request_id uuid,
  p_decision text,
  p_notes text,
  p_stripe_connected_account_id text,
  p_capabilities_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  request_row public.conditional_payment_destination_requests%rowtype;
  destination_row public.conditional_payment_destinations%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor_profile_id) then
    raise exception 'The reviewing profile does not exist.';
  end if;

  select * into request_row
  from public.conditional_payment_destination_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Destination request not found.';
  end if;
  if request_row.status <> 'pending' then
    return to_jsonb(request_row);
  end if;

  if p_decision = 'approved' then
    if trim(coalesce(p_stripe_connected_account_id, '')) !~ '^acct_[A-Za-z0-9_]+$' then
      raise exception 'Approval requires a verified Stripe connected-account identifier.';
    end if;
    if p_capabilities_snapshot is null or jsonb_typeof(p_capabilities_snapshot) <> 'object' then
      raise exception 'Approval requires a structured capabilities snapshot.';
    end if;
    if request_row.environment = 'live' and not (
      coalesce((p_capabilities_snapshot->>'chargesEnabled')::boolean, false)
      and coalesce((p_capabilities_snapshot->>'payoutsEnabled')::boolean, false)
      and coalesce((p_capabilities_snapshot->>'detailsSubmitted')::boolean, false)
    ) then
      raise exception 'A live destination must have verified charges, payouts, and submitted details.';
    end if;

    insert into public.conditional_payment_destinations(
      registered_charity_id,
      display_name,
      stripe_connected_account_id,
      livemode,
      status,
      capabilities_snapshot,
      test_only,
      reviewed_by,
      reviewed_at
    ) values (
      null,
      request_row.display_name,
      trim(p_stripe_connected_account_id),
      request_row.environment = 'live',
      'active',
      p_capabilities_snapshot || jsonb_build_object(
        'provider', request_row.provider,
        'providerNonprofitId', request_row.provider_nonprofit_id,
        'nonprofitSlug', request_row.nonprofit_slug,
        'nonprofitEin', request_row.nonprofit_ein,
        'countryCode', request_row.country_code,
        'websiteUrl', request_row.website_url,
        'identityHash', request_row.identity_hash,
        'destinationRequestId', request_row.id
      ),
      request_row.environment = 'test',
      p_actor_profile_id,
      timezone('utc', now())
    )
    returning * into destination_row;

    update public.conditional_payment_destination_requests
    set status = 'approved', reviewed_by = p_actor_profile_id,
        reviewed_at = timezone('utc', now()), review_notes = left(coalesce(p_notes, ''), 1000),
        destination_id = destination_row.id
    where id = request_row.id
    returning * into request_row;
  else
    update public.conditional_payment_destination_requests
    set status = 'rejected', reviewed_by = p_actor_profile_id,
        reviewed_at = timezone('utc', now()), review_notes = left(coalesce(p_notes, ''), 1000),
        destination_id = null
    where id = request_row.id
    returning * into request_row;
  end if;

  insert into public.conditional_payment_destination_review_events(
    request_id, actor_profile_id, decision, identity_hash, notes
  ) values (
    request_row.id,
    p_actor_profile_id,
    p_decision,
    request_row.identity_hash,
    left(coalesce(p_notes, ''), 1000)
  );

  return to_jsonb(request_row);
end;
$$;

alter table public.trade_donation_pool_gate_status
  add column if not exists accountable_owner_name text not null default '',
  add column if not exists accountable_owner_role text not null default '',
  add column if not exists accountable_owner_email text not null default '',
  add column if not exists evidence_url text not null default '',
  add column if not exists evidence_sha256 text not null default '',
  add column if not exists evidence_recorded_at timestamptz;

alter table public.trade_donation_pool_gate_status
  drop constraint if exists trade_donation_pool_gate_pass_evidence_check;
alter table public.trade_donation_pool_gate_status
  add constraint trade_donation_pool_gate_pass_evidence_check check (
    status <> 'passed'
    or (
      approved_by is not null
      and approved_at is not null
      and length(trim(accountable_owner_name)) >= 2
      and length(trim(accountable_owner_role)) >= 2
      and accountable_owner_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and evidence_url ~ '^https://'
      and evidence_sha256 ~ '^[0-9a-f]{64}$'
      and evidence_recorded_at is not null
    )
  );

create or replace function public.review_trade_donation_pool_gate(
  p_actor_profile_id uuid,
  p_environment text,
  p_gate_key text,
  p_status text,
  p_notes text,
  p_accountable_owner_name text,
  p_accountable_owner_role text,
  p_accountable_owner_email text,
  p_evidence_url text,
  p_evidence_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  gate_row public.trade_donation_pool_gate_status%rowtype;
begin
  if p_environment not in ('test', 'live') then
    raise exception 'Invalid gate environment.';
  end if;
  if p_status not in ('passed', 'pending', 'blocked') then
    raise exception 'Invalid gate status.';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor_profile_id) then
    raise exception 'The reviewing profile does not exist.';
  end if;
  if p_status = 'passed' and (
    length(trim(coalesce(p_accountable_owner_name, ''))) < 2
    or length(trim(coalesce(p_accountable_owner_role, ''))) < 2
    or trim(coalesce(p_accountable_owner_email, '')) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or trim(coalesce(p_evidence_url, '')) !~ '^https://'
    or trim(coalesce(p_evidence_sha256, '')) !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Passing a gate requires named ownership, role, email, HTTPS evidence, and an exact SHA-256.';
  end if;

  update public.trade_donation_pool_gate_status
  set status = p_status,
      notes = left(coalesce(p_notes, ''), 2000),
      approved_by = case when p_status = 'passed' then p_actor_profile_id else null end,
      approved_at = case when p_status = 'passed' then timezone('utc', now()) else null end,
      accountable_owner_name = case when p_status = 'passed' then trim(p_accountable_owner_name) else '' end,
      accountable_owner_role = case when p_status = 'passed' then trim(p_accountable_owner_role) else '' end,
      accountable_owner_email = case when p_status = 'passed' then lower(trim(p_accountable_owner_email)) else '' end,
      evidence_url = case when p_status = 'passed' then trim(p_evidence_url) else '' end,
      evidence_sha256 = case when p_status = 'passed' then lower(trim(p_evidence_sha256)) else '' end,
      evidence_recorded_at = case when p_status = 'passed' then timezone('utc', now()) else null end,
      updated_at = timezone('utc', now())
  where environment = p_environment and gate_key = p_gate_key
  returning * into gate_row;

  if not found then
    raise exception 'Payment gate not found.';
  end if;

  insert into public.trade_donation_pool_audit_events(
    actor_profile_id, actor_kind, event_type, object_type, object_id, details
  ) values (
    p_actor_profile_id,
    'operator',
    'gate_reviewed',
    'gate',
    null,
    jsonb_build_object(
      'environment', p_environment,
      'gateKey', p_gate_key,
      'status', p_status,
      'evidenceSha256', case when p_status = 'passed' then lower(trim(p_evidence_sha256)) else null end
    )
  );

  return to_jsonb(gate_row);
end;
$$;

alter table public.conditional_payment_destination_requests enable row level security;
alter table public.conditional_payment_destination_review_events enable row level security;

revoke all on public.conditional_payment_destination_requests from anon, authenticated;
revoke all on public.conditional_payment_destination_review_events from anon, authenticated;
revoke all on function public.submit_conditional_payment_destination_request(
  uuid, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.review_conditional_payment_destination_request(
  uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.review_trade_donation_pool_gate(
  uuid, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.submit_conditional_payment_destination_request(
  uuid, text, text, text, text, text, text, text, jsonb
) to service_role;
grant execute on function public.review_conditional_payment_destination_request(
  uuid, uuid, text, text, text, jsonb
) to service_role;
grant execute on function public.review_trade_donation_pool_gate(
  uuid, text, text, text, text, text, text, text, text, text
) to service_role;
