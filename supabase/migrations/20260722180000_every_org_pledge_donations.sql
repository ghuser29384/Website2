-- Every.org pledge-donation connector.
-- A donation-backed agreement remains inactive after bilateral confirmation and activates only
-- after an exact, privacy-safe partner webhook is recorded by the service role.

alter table public.agreements
  drop constraint if exists agreements_lifecycle_status_check;

alter table public.agreements
  add constraint agreements_lifecycle_status_check
  check (lifecycle_status in (
    'draft',
    'proposed',
    'confirmed',
    'awaiting_donation',
    'active',
    'evidence_due',
    'completed',
    'disputed',
    'cancelled',
    'expired'
  ));

create table if not exists public.trade_donation_terms (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete cascade,
  payer_role text not null check (payer_role in ('proposer', 'responder')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  target_id text not null,
  target_name text not null,
  nonprofit_slug text not null,
  nonprofit_ein text not null default '',
  amount_cents integer not null check (amount_cents between 100 and 50000),
  currency text not null default 'USD' check (currency = 'USD'),
  frequency text not null default 'ONCE' check (frequency = 'ONCE'),
  connector_terms_hash text not null,
  source_label text not null,
  source_url text not null,
  source_checked_at date not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (agreement_version_id),
  unique (agreement_id, connector_terms_hash)
);

create index if not exists trade_donation_terms_agreement_idx
  on public.trade_donation_terms(agreement_id, created_at desc);

create table if not exists public.trade_donation_intents (
  id uuid primary key default gen_random_uuid(),
  donation_term_id uuid not null references public.trade_donation_terms(id) on delete cascade,
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete cascade,
  payer_user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null default 'every_org' check (provider = 'every_org'),
  partner_donation_id text not null,
  status text not null default 'created' check (
    status in ('created', 'checkout_started', 'completed', 'needs_review', 'cancelled')
  ),
  expected_target_id text not null,
  expected_target_name text not null,
  expected_nonprofit_slug text not null,
  expected_nonprofit_ein text not null default '',
  expected_amount_cents integer not null check (expected_amount_cents between 100 and 50000),
  expected_currency text not null default 'USD' check (expected_currency = 'USD'),
  expected_frequency text not null default 'ONCE' check (expected_frequency = 'ONCE'),
  provider_charge_id_hash text not null default '',
  provider_payload_hash text not null default '',
  provider_amount_cents integer,
  provider_currency text not null default '',
  provider_nonprofit_slug text not null default '',
  provider_nonprofit_ein text not null default '',
  provider_donation_date timestamptz,
  provider_payment_method text not null default '',
  failure_code text not null default '',
  failure_message text not null default '',
  checkout_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (donation_term_id),
  unique (provider, partner_donation_id)
);

create unique index if not exists trade_donation_intents_provider_charge_uidx
  on public.trade_donation_intents(provider, provider_charge_id_hash)
  where provider_charge_id_hash <> '';

create index if not exists trade_donation_intents_agreement_idx
  on public.trade_donation_intents(agreement_id, status, updated_at desc);

alter table public.trade_evidence_items
  add column if not exists provider text not null default '',
  add column if not exists provider_reference_hash text not null default '',
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table public.trade_evidence_items
  drop constraint if exists trade_evidence_items_evidence_type_check;

alter table public.trade_evidence_items
  add constraint trade_evidence_items_evidence_type_check
  check (evidence_type in ('file', 'link', 'attestation', 'provider_donation'));

create unique index if not exists trade_evidence_items_provider_reference_uidx
  on public.trade_evidence_items(provider, provider_reference_hash)
  where provider <> '' and provider_reference_hash <> '';

alter table public.trade_donation_terms enable row level security;
alter table public.trade_donation_intents enable row level security;

revoke all on public.trade_donation_terms from anon, authenticated;
revoke all on public.trade_donation_intents from anon, authenticated;

create or replace function public.validate_trade_donation_term_agreement()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  version_agreement_id uuid;
begin
  select v.agreement_id
  into version_agreement_id
  from public.trade_agreement_versions v
  where v.id = new.agreement_version_id;

  if version_agreement_id is null or version_agreement_id <> new.agreement_id then
    raise exception 'Donation terms must reference a version of the same agreement.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_trade_donation_term_agreement on public.trade_donation_terms;
create trigger validate_trade_donation_term_agreement
before insert or update on public.trade_donation_terms
for each row execute function public.validate_trade_donation_term_agreement();

drop trigger if exists set_trade_donation_intents_updated_at on public.trade_donation_intents;
create trigger set_trade_donation_intents_updated_at
before update on public.trade_donation_intents
for each row execute function public.set_updated_at();

create or replace function public.configure_trade_donation_terms(
  p_agreement_id uuid,
  p_actor_id uuid,
  p_payer_role text,
  p_target_id text,
  p_target_name text,
  p_nonprofit_slug text,
  p_nonprofit_ein text,
  p_amount_cents integer,
  p_connector_terms_hash text,
  p_source_label text,
  p_source_url text,
  p_source_checked_at date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_agreement public.agreements%rowtype;
  current_version public.trade_agreement_versions%rowtype;
  existing_term public.trade_donation_terms%rowtype;
  next_version integer;
  new_version_id uuid;
begin
  select a.*
  into current_agreement
  from public.agreements a
  where a.id = p_agreement_id
  for update;

  if not found then
    raise exception 'Agreement not found.';
  end if;
  if p_actor_id not in (current_agreement.proposer_id, current_agreement.responder_id) then
    raise exception 'Only a participant can configure the donation leg.';
  end if;
  if current_agreement.lifecycle_status <> 'proposed' then
    raise exception 'Donation terms can only change before bilateral confirmation.';
  end if;
  if not exists (
    select 1
    from public.offers o
    where o.id = current_agreement.offer_id
      and o.mode = 'pledge'
  ) then
    raise exception 'The Every.org connector is available only for pledge agreements.';
  end if;
  if p_payer_role not in ('proposer', 'responder') then
    raise exception 'Invalid payer role.';
  end if;
  if p_amount_cents < 100 or p_amount_cents > 50000 then
    raise exception 'Donation amount is outside the supported range.';
  end if;
  if length(trim(p_target_id)) = 0 or length(trim(p_target_name)) = 0 or length(trim(p_nonprofit_slug)) = 0 then
    raise exception 'A complete donation destination is required.';
  end if;
  if coalesce(p_connector_terms_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid connector terms hash is required.';
  end if;
  if length(trim(coalesce(p_source_label, ''))) = 0
    or coalesce(p_source_url, '') !~ '^https://'
    or p_source_checked_at is null then
    raise exception 'Complete research-source provenance is required.';
  end if;

  select v.*
  into current_version
  from public.trade_agreement_versions v
  where v.id = current_agreement.current_version_id
    and v.agreement_id = current_agreement.id;

  if not found then
    raise exception 'Current agreement version not found.';
  end if;

  select t.*
  into existing_term
  from public.trade_donation_terms t
  where t.agreement_version_id = current_version.id;

  if found and existing_term.connector_terms_hash = p_connector_terms_hash then
    return current_version.id;
  end if;

  select coalesce(max(v.version), 0) + 1
  into next_version
  from public.trade_agreement_versions v
  where v.agreement_id = current_agreement.id;

  insert into public.trade_agreement_versions (
    agreement_id,
    version,
    proposed_by,
    proposed_action,
    requested_action,
    duration,
    start_date,
    evidence_rule,
    evidence_due_date,
    exit_conditions,
    maximum_burden,
    privacy_scope,
    no_trade_baseline,
    terms_hash
  ) values (
    current_agreement.id,
    next_version,
    p_actor_id,
    current_version.proposed_action,
    current_version.requested_action,
    current_version.duration,
    current_version.start_date,
    current_version.evidence_rule,
    current_version.evidence_due_date,
    current_version.exit_conditions,
    current_version.maximum_burden,
    current_version.privacy_scope,
    current_version.no_trade_baseline,
    p_connector_terms_hash
  )
  returning id into new_version_id;

  insert into public.trade_donation_terms (
    agreement_id,
    agreement_version_id,
    payer_role,
    provider,
    target_id,
    target_name,
    nonprofit_slug,
    nonprofit_ein,
    amount_cents,
    currency,
    frequency,
    connector_terms_hash,
    source_label,
    source_url,
    source_checked_at,
    created_by
  ) values (
    current_agreement.id,
    new_version_id,
    p_payer_role,
    'every_org',
    trim(p_target_id),
    trim(p_target_name),
    lower(trim(p_nonprofit_slug)),
    regexp_replace(coalesce(p_nonprofit_ein, ''), '[^0-9]', '', 'g'),
    p_amount_cents,
    'USD',
    'ONCE',
    p_connector_terms_hash,
    trim(p_source_label),
    trim(p_source_url),
    p_source_checked_at,
    p_actor_id
  );

  update public.agreements
  set
    current_version_id = new_version_id,
    lifecycle_status = 'proposed',
    status = 'proposed',
    activated_at = null,
    updated_at = timezone('utc', now())
  where id = current_agreement.id;

  return new_version_id;
end;
$$;

create or replace function public.start_trade_donation_checkout(
  p_agreement_id uuid,
  p_actor_id uuid,
  p_partner_donation_id text
)
returns public.trade_donation_intents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_agreement public.agreements%rowtype;
  current_term public.trade_donation_terms%rowtype;
  current_intent public.trade_donation_intents%rowtype;
  expected_payer uuid;
  confirmation_count integer;
begin
  select a.*
  into current_agreement
  from public.agreements a
  where a.id = p_agreement_id
  for update;

  if not found then
    raise exception 'Agreement not found.';
  end if;
  if current_agreement.lifecycle_status <> 'awaiting_donation' then
    raise exception 'This agreement is not waiting for a donation.';
  end if;

  select t.*
  into current_term
  from public.trade_donation_terms t
  where t.agreement_version_id = current_agreement.current_version_id;

  if not found then
    raise exception 'Frozen donation terms not found.';
  end if;

  expected_payer := case current_term.payer_role
    when 'proposer' then current_agreement.proposer_id
    else current_agreement.responder_id
  end;
  if p_actor_id <> expected_payer then
    raise exception 'Only the named payer can start donation checkout.';
  end if;

  select count(*)::integer
  into confirmation_count
  from public.trade_agreement_confirmations c
  where c.agreement_version_id = current_term.agreement_version_id;
  if confirmation_count < 2 then
    raise exception 'Both participants must confirm the frozen version first.';
  end if;

  select i.*
  into current_intent
  from public.trade_donation_intents i
  where i.donation_term_id = current_term.id
  for update;

  if found then
    if current_intent.status in ('completed', 'needs_review', 'cancelled') then
      raise exception 'This donation intent cannot be reopened.';
    end if;
  else
    insert into public.trade_donation_intents (
      donation_term_id,
      agreement_id,
      agreement_version_id,
      payer_user_id,
      provider,
      partner_donation_id,
      status,
      expected_target_id,
      expected_target_name,
      expected_nonprofit_slug,
      expected_nonprofit_ein,
      expected_amount_cents,
      expected_currency,
      expected_frequency
    ) values (
      current_term.id,
      current_term.agreement_id,
      current_term.agreement_version_id,
      expected_payer,
      'every_org',
      p_partner_donation_id,
      'created',
      current_term.target_id,
      current_term.target_name,
      current_term.nonprofit_slug,
      current_term.nonprofit_ein,
      current_term.amount_cents,
      current_term.currency,
      current_term.frequency
    )
    returning * into current_intent;
  end if;

  update public.trade_donation_intents
  set
    status = 'checkout_started',
    checkout_started_at = timezone('utc', now()),
    failure_code = '',
    failure_message = ''
  where id = current_intent.id
  returning * into current_intent;

  return current_intent;
end;
$$;

create or replace function public.complete_every_org_trade_donation(
  p_intent_id uuid,
  p_provider_charge_id_hash text,
  p_provider_payload_hash text,
  p_provider_amount_cents integer,
  p_provider_currency text,
  p_provider_nonprofit_slug text,
  p_provider_nonprofit_ein text,
  p_provider_donation_date timestamptz,
  p_provider_payment_method text,
  p_is_valid boolean,
  p_failure_code text default '',
  p_failure_message text default ''
)
returns table (
  outcome text,
  agreement_id uuid,
  payer_user_id uuid,
  proposer_id uuid,
  responder_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_intent public.trade_donation_intents%rowtype;
  current_term public.trade_donation_terms%rowtype;
  current_agreement public.agreements%rowtype;
  effective_failure_code text;
  effective_failure_message text;
begin
  select i.*
  into current_intent
  from public.trade_donation_intents i
  where i.id = p_intent_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select t.*
  into current_term
  from public.trade_donation_terms t
  where t.id = current_intent.donation_term_id;

  select a.*
  into current_agreement
  from public.agreements a
  where a.id = current_intent.agreement_id
  for update;

  if current_term.id is null or current_agreement.id is null then
    return query select
      'orphaned_intent'::text,
      current_intent.agreement_id,
      current_intent.payer_user_id,
      null::uuid,
      null::uuid;
    return;
  end if;

  if current_intent.status = 'completed' then
    return query select
      'duplicate'::text,
      current_intent.agreement_id,
      current_intent.payer_user_id,
      current_agreement.proposer_id,
      current_agreement.responder_id;
    return;
  end if;

  if p_provider_charge_id_hash <> '' and exists (
    select 1
    from public.trade_donation_intents other_intent
    where other_intent.provider = 'every_org'
      and other_intent.provider_charge_id_hash = p_provider_charge_id_hash
      and other_intent.id <> current_intent.id
  ) then
    p_is_valid := false;
    p_failure_code := 'provider_charge_reused';
    p_failure_message := 'The provider charge was already associated with another donation intent.';
    -- Preserve the uniqueness invariant without storing the same charge hash twice.
    p_provider_charge_id_hash := '';
  end if;

  if not p_is_valid then
    effective_failure_code := coalesce(nullif(p_failure_code, ''), 'provider_payload_mismatch');
    effective_failure_message := coalesce(nullif(p_failure_message, ''), 'The provider payload did not match the frozen donation terms.');

    update public.trade_donation_intents
    set
      status = 'needs_review',
      provider_charge_id_hash = coalesce(p_provider_charge_id_hash, ''),
      provider_payload_hash = coalesce(p_provider_payload_hash, ''),
      provider_amount_cents = p_provider_amount_cents,
      provider_currency = coalesce(p_provider_currency, ''),
      provider_nonprofit_slug = coalesce(p_provider_nonprofit_slug, ''),
      provider_nonprofit_ein = coalesce(p_provider_nonprofit_ein, ''),
      provider_donation_date = p_provider_donation_date,
      provider_payment_method = coalesce(p_provider_payment_method, ''),
      failure_code = effective_failure_code,
      failure_message = effective_failure_message
    where id = current_intent.id;

    return query select
      'needs_review'::text,
      current_intent.agreement_id,
      current_intent.payer_user_id,
      current_agreement.proposer_id,
      current_agreement.responder_id;
    return;
  end if;

  if current_intent.status = 'cancelled'
    or current_agreement.lifecycle_status <> 'awaiting_donation'
    or current_agreement.current_version_id <> current_term.agreement_version_id then
    update public.trade_donation_intents
    set
      status = 'needs_review',
      provider_charge_id_hash = coalesce(p_provider_charge_id_hash, ''),
      provider_payload_hash = coalesce(p_provider_payload_hash, ''),
      provider_amount_cents = p_provider_amount_cents,
      provider_currency = coalesce(p_provider_currency, ''),
      provider_nonprofit_slug = coalesce(p_provider_nonprofit_slug, ''),
      provider_nonprofit_ein = coalesce(p_provider_nonprofit_ein, ''),
      provider_donation_date = p_provider_donation_date,
      provider_payment_method = coalesce(p_provider_payment_method, ''),
      failure_code = 'agreement_not_awaiting_donation',
      failure_message = 'A provider donation arrived after the agreement or version stopped awaiting it.'
    where id = current_intent.id;

    return query select
      'needs_review'::text,
      current_intent.agreement_id,
      current_intent.payer_user_id,
      current_agreement.proposer_id,
      current_agreement.responder_id;
    return;
  end if;

  update public.trade_donation_intents
  set
    status = 'completed',
    provider_charge_id_hash = p_provider_charge_id_hash,
    provider_payload_hash = p_provider_payload_hash,
    provider_amount_cents = p_provider_amount_cents,
    provider_currency = p_provider_currency,
    provider_nonprofit_slug = p_provider_nonprofit_slug,
    provider_nonprofit_ein = p_provider_nonprofit_ein,
    provider_donation_date = p_provider_donation_date,
    provider_payment_method = coalesce(p_provider_payment_method, ''),
    failure_code = '',
    failure_message = '',
    completed_at = timezone('utc', now())
  where id = current_intent.id;

  insert into public.trade_evidence_items (
    agreement_id,
    submitted_by,
    evidence_type,
    evidence_url,
    attestation,
    status,
    public_title,
    public_summary,
    public_visibility,
    redaction_status,
    public_redaction_note,
    public_mime_type,
    challenge_window_ends_at,
    reviewed_at,
    provider,
    provider_reference_hash,
    provider_metadata
  ) values (
    current_intent.agreement_id,
    current_intent.payer_user_id,
    'provider_donation',
    '',
    format(
      'Every.org reported a one-time $%s USD donation to %s before the reciprocal action activated.',
      to_char(current_term.amount_cents / 100.0, 'FM999999990.00'),
      current_term.target_name
    ),
    'accepted',
    'Provider-confirmed donation',
    format(
      'Every.org confirmed a one-time $%s USD donation to %s. The provider receipt activates the reciprocal action but does not prove that action was performed.',
      to_char(current_term.amount_cents / 100.0, 'FM999999990.00'),
      current_term.target_name
    ),
    'public',
    'not_required',
    'Every.org supplied the completed-donation event. Moral Trade stores no donor contact information, raw payment payload, or card data in this evidence record.',
    'application/json',
    timezone('utc', now()),
    timezone('utc', now()),
    'every_org',
    p_provider_charge_id_hash,
    jsonb_build_object(
      'schemaVersion', 'moral-trade-provider-donation-evidence-v1',
      'donationIntentId', current_intent.id,
      'donationTermId', current_term.id,
      'providerPayloadHash', p_provider_payload_hash,
      'amountCents', current_term.amount_cents,
      'currency', current_term.currency,
      'recipientSlug', current_term.nonprofit_slug,
      'recipientEin', current_term.nonprofit_ein,
      'donationDate', p_provider_donation_date,
      'paymentMethod', coalesce(p_provider_payment_method, '')
    )
  )
  on conflict (provider, provider_reference_hash)
    where provider <> '' and provider_reference_hash <> ''
  do nothing;

  update public.agreements
  set
    status = 'active',
    lifecycle_status = 'active',
    activated_at = coalesce(activated_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = current_agreement.id
    and current_version_id = current_term.agreement_version_id
    and lifecycle_status = 'awaiting_donation';

  return query select
    'activated'::text,
    current_intent.agreement_id,
    current_intent.payer_user_id,
    current_agreement.proposer_id,
    current_agreement.responder_id;
end;
$$;

create or replace function public.require_reciprocal_evidence_for_donation_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.agreements a
    join public.trade_donation_terms t
      on t.agreement_version_id = a.current_version_id
    where a.id = new.agreement_id
  ) and not exists (
    select 1
    from public.trade_evidence_items e
    where e.agreement_id = new.agreement_id
      and e.status = 'accepted'
      and e.evidence_type <> 'provider_donation'
  ) then
    raise exception 'A provider donation activates the trade but does not prove the reciprocal action.';
  end if;
  return new;
end;
$$;

drop trigger if exists require_reciprocal_evidence_for_donation_completion
  on public.trade_completion_confirmations;
create trigger require_reciprocal_evidence_for_donation_completion
before insert or update on public.trade_completion_confirmations
for each row execute function public.require_reciprocal_evidence_for_donation_completion();

create or replace function public.cancel_trade_donation_waiting(
  p_agreement_id uuid,
  p_actor_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_agreement public.agreements%rowtype;
  current_intent public.trade_donation_intents%rowtype;
begin
  select a.*
  into current_agreement
  from public.agreements a
  where a.id = p_agreement_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if p_actor_id not in (current_agreement.proposer_id, current_agreement.responder_id) then
    return 'forbidden';
  end if;
  if current_agreement.lifecycle_status <> 'awaiting_donation' then
    return 'invalid_state';
  end if;

  select i.*
  into current_intent
  from public.trade_donation_intents i
  where i.agreement_id = current_agreement.id
    and i.agreement_version_id = current_agreement.current_version_id
  for update;

  if found and current_intent.status = 'completed' then
    return 'already_completed';
  end if;
  if found and current_intent.checkout_started_at is not null then
    -- A donation may have completed while its webhook is delayed. Once checkout starts,
    -- self-service cancellation is permanently fail-closed and requires operator review.
    return 'checkout_in_progress';
  end if;

  update public.trade_donation_intents
  set
    status = 'cancelled',
    failure_code = 'agreement_cancelled_before_verification',
    failure_message = 'The agreement was cancelled before a verified provider donation.'
  where agreement_id = current_agreement.id
    and agreement_version_id = current_agreement.current_version_id
    and status in ('created', 'checkout_started');

  update public.agreements
  set
    status = 'cancelled',
    lifecycle_status = 'cancelled',
    cancelled_at = timezone('utc', now()),
    exit_requested_by = p_actor_id,
    exit_reason = 'Cancelled before the required donation was verified.',
    updated_at = timezone('utc', now())
  where id = current_agreement.id;

  return 'cancelled';
end;
$$;

revoke all on function public.configure_trade_donation_terms(
  uuid, uuid, text, text, text, text, text, integer, text, text, text, date
) from public, anon, authenticated;
revoke all on function public.start_trade_donation_checkout(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.complete_every_org_trade_donation(
  uuid, text, text, integer, text, text, text, timestamptz, text, boolean, text, text
) from public, anon, authenticated;
revoke all on function public.cancel_trade_donation_waiting(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.configure_trade_donation_terms(
  uuid, uuid, text, text, text, text, text, integer, text, text, text, date
) to service_role;
grant execute on function public.start_trade_donation_checkout(uuid, uuid, text)
  to service_role;
grant execute on function public.complete_every_org_trade_donation(
  uuid, text, text, integer, text, text, text, timestamptz, text, boolean, text, text
) to service_role;
grant execute on function public.cancel_trade_donation_waiting(uuid, uuid)
  to service_role;
