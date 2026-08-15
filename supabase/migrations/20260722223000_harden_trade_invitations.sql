-- Harden the direct-invitation growth loop.
--
-- Security contract:
--   * bearer secrets are hashed for lookup and encrypted for sender recovery;
--   * old plaintext links are invalidated instead of being guessed or migrated;
--   * email-bound links can be claimed only by the confirmed addressed account;
--   * share links bind to their first claimant;
--   * offer terms, financial eligibility, blocking, and agreement confirmation are
--     checked inside the same transaction that changes state;
--   * email delivery uses leases and stable provider idempotency keys.

create schema if not exists moral_trade_private;
revoke all on schema moral_trade_private from public, anon, authenticated;

alter table public.trade_invitations
  add column if not exists token_hash text,
  add column if not exists token_ciphertext text not null default '',
  add column if not exists delivery_kind text not null default 'share_link',
  add column if not exists terms_version integer not null default 1,
  add column if not exists terms_hash text not null default '',
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days'),
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by uuid,
  add column if not exists revoked_at timestamptz,
  add column if not exists revocation_reason text not null default '';

alter table public.trade_invitations
  drop constraint if exists trade_invitations_claimed_by_fkey;
alter table public.trade_invitations
  add constraint trade_invitations_claimed_by_fkey
  foreign key (claimed_by) references public.profiles(id) on delete set null;

-- No legacy link is term-bound, recipient-safe, or expiry-bound. Revoke all of
-- them before removing their plaintext bearer values.
alter table public.trade_invitations
  drop constraint if exists trade_invitations_token_key;
alter table public.trade_invitations
  alter column token drop not null;

update public.trade_invitations
set
  status = case
    when status in ('responded', 'declined', 'revoked') then status
    else 'revoked'
  end,
  revoked_at = case
    when status in ('responded', 'declined') then revoked_at
    else coalesce(revoked_at, now())
  end,
  revocation_reason = case
    when status in ('responded', 'declined') then revocation_reason
    else 'Legacy invitation invalidated during secure-link migration.'
  end,
  token = null,
  token_hash = null,
  token_ciphertext = '',
  updated_at = now()
where token is not null
   or token_hash is null;

alter table public.trade_invitations
  drop constraint if exists trade_invitations_token_must_be_null;
alter table public.trade_invitations
  add constraint trade_invitations_token_must_be_null check (token is null);

alter table public.trade_invitations
  drop constraint if exists trade_invitations_status_check;
alter table public.trade_invitations
  add constraint trade_invitations_status_check check (
    status in (
      'drafted',
      'sent',
      'opened',
      'responded',
      'accepted',
      'countered',
      'declined',
      'revoked',
      'expired'
    )
  );
alter table public.trade_invitations
  drop constraint if exists trade_invitations_delivery_kind_check;
alter table public.trade_invitations
  add constraint trade_invitations_delivery_kind_check
  check (delivery_kind in ('email', 'share_link'));
alter table public.trade_invitations
  drop constraint if exists trade_invitations_secure_active_check;
alter table public.trade_invitations
  add constraint trade_invitations_secure_active_check check (
    status not in ('drafted', 'sent', 'opened')
    or (
      token_hash ~ '^[0-9a-f]{64}$'
      and length(token_ciphertext) >= 40
      and terms_version > 0
      and terms_hash ~ '^[0-9a-f]{64}$'
      and expires_at > created_at
    )
  );

create unique index if not exists trade_invitations_token_hash_uidx
  on public.trade_invitations(token_hash)
  where token_hash is not null;
create index if not exists trade_invitations_expiry_idx
  on public.trade_invitations(expires_at)
  where status in ('drafted', 'sent', 'opened');

-- Identical terms may be proposed again in a later, auditable negotiation
-- round after an earlier rejection. Version remains the unique round key.
alter table public.trade_counterproposals
  drop constraint if exists trade_counterproposals_thread_id_terms_hash_key;

create unique index if not exists trade_threads_one_open_pair_uidx
  on public.trade_threads (
    offer_id,
    least(participant_a, participant_b),
    greatest(participant_a, participant_b)
  )
  where status <> 'closed';

alter table public.email_outbox
  add column if not exists dedupe_key text,
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists lock_token uuid,
  add column if not exists idempotency_key text,
  add column if not exists provider_message_id text,
  add column if not exists suppressed_at timestamptz;

update public.email_outbox
set idempotency_key = coalesce(
  nullif(idempotency_key, ''),
  nullif(dedupe_key, ''),
  'email-outbox:' || id::text
)
where idempotency_key is null
   or idempotency_key = '';

alter table public.email_outbox
  drop constraint if exists email_outbox_status_check;
alter table public.email_outbox
  add constraint email_outbox_status_check check (
    status in ('queued', 'processing', 'retry', 'sent', 'failed', 'suppressed')
  );
create unique index if not exists email_outbox_idempotency_uidx
  on public.email_outbox(idempotency_key)
  where idempotency_key is not null;
create index if not exists email_outbox_delivery_claim_idx
  on public.email_outbox(status, available_at, created_at)
  where status in ('queued', 'retry', 'processing');

create or replace function public.ensure_email_outbox_idempotency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  new.idempotency_key := coalesce(
    nullif(btrim(new.idempotency_key), ''),
    nullif(btrim(new.dedupe_key), ''),
    'email-outbox:' || new.id::text
  );
  new.available_at := coalesce(new.available_at, now());
  return new;
end;
$$;

drop trigger if exists ensure_email_outbox_idempotency_trigger on public.email_outbox;
create trigger ensure_email_outbox_idempotency_trigger
before insert or update of dedupe_key, idempotency_key, available_at
on public.email_outbox
for each row execute function public.ensure_email_outbox_idempotency();

create or replace function moral_trade_private.lock_pair(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(p_a::text, p_b::text) || ':' || greatest(p_a::text, p_b::text),
      90210
    )
  );
end;
$$;

create or replace function moral_trade_private.lock_invitation_delivery(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'trade_invitation:' || p_invitation_id::text,
      90211
    )
  );
end;
$$;

create or replace function moral_trade_private.pair_is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.trade_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

create or replace function moral_trade_private.offer_is_invitable(p_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.offers o
    where o.id = p_offer_id
      and o.workflow_status = 'published'
      and o.status::text = 'open'
      and o.mode::text = 'pledge'
      and o.payment_interval_value is null
      and o.payment_interval_unit is null
      and not exists (
        select 1
        from public.donation_offset_offers d
        where d.offer_id = o.id
      )
      and not exists (
        select 1
        from public.performance_bonds b
        where b.offer_id = o.id
          and b.enabled is true
          and b.status not in ('not_enabled', 'cancelled', 'expired', 'refunded')
      )
  );
$$;

create or replace function moral_trade_private.invitation_status_is_usable(p_status text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p_status in ('drafted', 'sent', 'opened');
$$;

create or replace function moral_trade_private.suppress_invitation_email(
  p_invitation_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.email_outbox
  set
    status = 'suppressed',
    body = '[private invitation link removed]',
    last_error = left(coalesce(p_reason, 'Invitation is no longer deliverable.'), 500),
    suppressed_at = now(),
    locked_at = null,
    lock_token = null
  where source_kind = 'trade_invitation'
    and source_id = p_invitation_id::text
    and (
      status in ('queued', 'retry')
      or (status = 'processing' and locked_at < now() - interval '10 minutes')
    );
end;
$$;

create or replace function moral_trade_private.revoke_offer_invitations(
  p_offer_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  invitation_id_value uuid;
  invitation_row public.trade_invitations%rowtype;
begin
  for invitation_id_value in
    select i.id
    from public.trade_invitations i
    where i.offer_id = p_offer_id
      and moral_trade_private.invitation_status_is_usable(i.status)
    order by i.id
  loop
    perform moral_trade_private.lock_invitation_delivery(invitation_id_value);

    select * into invitation_row
    from public.trade_invitations i
    where i.id = invitation_id_value
    for update;

    if not found
       or not moral_trade_private.invitation_status_is_usable(invitation_row.status) then
      continue;
    end if;
    if exists (
      select 1
      from public.email_outbox e
      where e.source_kind = 'trade_invitation'
        and e.source_id = invitation_id_value::text
        and e.status = 'processing'
        and e.locked_at >= now() - interval '10 minutes'
    ) then
      raise exception 'An invitation email is currently being delivered. Retry this change shortly.';
    end if;

    update public.trade_invitations
    set
      status = 'revoked',
      revoked_at = now(),
      revocation_reason = left(coalesce(p_reason, 'Offer is no longer eligible.'), 500),
      updated_at = now()
    where id = invitation_id_value;

    perform moral_trade_private.suppress_invitation_email(
      invitation_id_value,
      left(coalesce(p_reason, 'Offer is no longer eligible.'), 500)
    );
  end loop;
end;
$$;

create or replace function public.create_trade_invitation_v2(
  p_actor_id uuid,
  p_offer_id uuid,
  p_invitation_id uuid,
  p_token_hash text,
  p_token_ciphertext text,
  p_recipient_email text,
  p_message text,
  p_email_subject text,
  p_email_body text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.offers%rowtype;
  normalized_email text := lower(btrim(coalesce(p_recipient_email, '')));
  normalized_message text := btrim(coalesce(p_message, ''));
  recipient_id uuid;
  actor_email text;
  invitation_status text;
  invitation_terms_hash text;
  expires_value timestamptz := now() + interval '14 days';
begin
  if p_actor_id is null or p_invitation_id is null or p_offer_id is null then
    raise exception 'Invitation identity is required.';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or length(coalesce(p_token_ciphertext, '')) < 40 then
    raise exception 'A secure invitation token is required.';
  end if;
  if length(normalized_email) > 320
     or (normalized_email <> '' and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Enter a valid recipient email address.';
  end if;
  if length(normalized_message) > 4000 then
    raise exception 'Invitation notes must be 4,000 characters or fewer.';
  end if;

  if (
    select count(*)
    from public.trade_invitations i
    where i.sender_id = p_actor_id
      and i.created_at >= now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Daily invitation limit reached. Try again after the oldest invitation is 24 hours old.';
  end if;

  select lower(email) into actor_email
  from auth.users
  where id = p_actor_id;

  if normalized_email <> '' and normalized_email = actor_email then
    raise exception 'You cannot invite your own account.';
  end if;

  if normalized_email <> '' then
    select u.id into recipient_id
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = normalized_email
      and u.email_confirmed_at is not null
    order by u.created_at
    limit 1;
  end if;
  if recipient_id is not null then
    perform moral_trade_private.lock_pair(p_actor_id, recipient_id);
    if moral_trade_private.pair_is_blocked(p_actor_id, recipient_id) then
      raise exception 'This interaction is blocked.';
    end if;
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found or offer_row.owner_id <> p_actor_id then
    raise exception 'Offer not found or access denied.';
  end if;
  if not moral_trade_private.offer_is_invitable(p_offer_id) then
    raise exception 'Only published, bounded, non-financial pledge proposals can be invited.';
  end if;

  invitation_status := case when normalized_email = '' then 'drafted' else 'sent' end;
  invitation_terms_hash := public.core_trade_terms_hash(
    offer_row.offer_action,
    offer_row.request_action,
    offer_row.duration,
    offer_row.start_date,
    offer_row.verification,
    offer_row.evidence_due_date,
    offer_row.exit_conditions,
    offer_row.maximum_burden,
    offer_row.privacy_scope,
    offer_row.no_trade_baseline
  );

  insert into public.trade_invitations(
    id,
    offer_id,
    sender_id,
    recipient_user_id,
    recipient_email,
    token,
    token_hash,
    token_ciphertext,
    delivery_kind,
    message,
    status,
    terms_version,
    terms_hash,
    expires_at,
    created_at,
    updated_at
  ) values (
    p_invitation_id,
    p_offer_id,
    p_actor_id,
    recipient_id,
    normalized_email,
    null,
    p_token_hash,
    p_token_ciphertext,
    case when normalized_email = '' then 'share_link' else 'email' end,
    normalized_message,
    invitation_status,
    offer_row.terms_version,
    invitation_terms_hash,
    expires_value,
    now(),
    now()
  );

  if normalized_email <> '' then
    if btrim(coalesce(p_email_subject, '')) = ''
       or btrim(coalesce(p_email_body, '')) = '' then
      raise exception 'Invitation email delivery could not be prepared.';
    end if;

    insert into public.email_outbox(
      profile_id,
      recipient_email,
      subject,
      body,
      status,
      provider,
      attempt_count,
      dedupe_key,
      idempotency_key,
      source_kind,
      source_id,
      available_at,
      created_at
    ) values (
      recipient_id,
      normalized_email,
      left(p_email_subject, 160),
      p_email_body,
      'queued',
      'core_trade_invitation',
      0,
      'trade-invitation:' || p_invitation_id::text,
      'trade-invitation:' || p_invitation_id::text,
      'trade_invitation',
      p_invitation_id::text,
      now(),
      now()
    );
  end if;

  insert into public.core_loop_events(
    profile_id,
    event_type,
    entity_type,
    entity_id,
    idempotency_key,
    metadata,
    created_at
  ) values (
    p_actor_id,
    'invitation_sent',
    'invitation',
    p_invitation_id,
    'invitation_sent:' || p_actor_id::text || ':invitation:' || p_invitation_id::text,
    jsonb_build_object(
      'delivery', case when normalized_email = '' then 'share_link' else 'email' end,
      'termsVersion', offer_row.terms_version
    ),
    now()
  )
  on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'invitationId', p_invitation_id,
    'status', invitation_status,
    'expiresAt', expires_value
  );
end;
$$;

create or replace function public.preview_trade_invitation_v2(
  p_token_hash text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  invitation_row public.trade_invitations%rowtype;
  offer_row public.offers%rowtype;
  sender_name text;
  current_terms_hash text;
  response_thread_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select * into invitation_row
  from public.trade_invitations
  where token_hash = p_token_hash;

  if not found or invitation_row.status in ('revoked', 'expired') then
    return null;
  end if;

  select * into offer_row
  from public.offers
  where id = invitation_row.offer_id
  for update;

  if not found then
    return null;
  end if;

  perform moral_trade_private.lock_invitation_delivery(invitation_row.id);
  select * into invitation_row
  from public.trade_invitations
  where id = invitation_row.id
    and token_hash = p_token_hash
  for update;

  if not found or invitation_row.status in ('revoked', 'expired') then
    return null;
  end if;

  if invitation_row.expires_at <= now()
     and moral_trade_private.invitation_status_is_usable(invitation_row.status) then
    update public.trade_invitations
    set
      status = 'expired',
      revoked_at = now(),
      revocation_reason = 'Invitation expired after 14 days.',
      updated_at = now()
    where id = invitation_row.id;
    perform moral_trade_private.suppress_invitation_email(
      invitation_row.id,
      'Invitation expired before delivery.'
    );
    return null;
  end if;

  current_terms_hash := public.core_trade_terms_hash(
    offer_row.offer_action,
    offer_row.request_action,
    offer_row.duration,
    offer_row.start_date,
    offer_row.verification,
    offer_row.evidence_due_date,
    offer_row.exit_conditions,
    offer_row.maximum_burden,
    offer_row.privacy_scope,
    offer_row.no_trade_baseline
  );

  if moral_trade_private.invitation_status_is_usable(invitation_row.status)
     and (
       not moral_trade_private.offer_is_invitable(offer_row.id)
       or invitation_row.terms_version <> offer_row.terms_version
       or invitation_row.terms_hash <> current_terms_hash
     ) then
    update public.trade_invitations
    set
      status = 'revoked',
      revoked_at = now(),
      revocation_reason = 'The reviewed offer terms or eligibility changed.',
      updated_at = now()
    where id = invitation_row.id;
    perform moral_trade_private.suppress_invitation_email(
      invitation_row.id,
      'Invitation terms changed before response.'
    );
    return null;
  end if;

  if invitation_row.status in ('drafted', 'sent') then
    update public.trade_invitations
    set
      status = 'opened',
      opened_at = coalesce(opened_at, now()),
      updated_at = now()
    where id = invitation_row.id;
    invitation_row.status := 'opened';
    invitation_row.opened_at := coalesce(invitation_row.opened_at, now());
  end if;

  select p.display_name into sender_name
  from public.profiles p
  where p.id = invitation_row.sender_id;

  if p_actor_id is not null
     and p_actor_id in (invitation_row.sender_id, invitation_row.recipient_user_id) then
    select t.id into response_thread_id
    from public.trade_threads t
    where t.offer_id = invitation_row.offer_id
      and (
        (t.participant_a = invitation_row.sender_id and t.participant_b = p_actor_id)
        or
        (t.participant_b = invitation_row.sender_id and t.participant_a = p_actor_id)
      )
    order by t.created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'invitationId', invitation_row.id,
    'status', invitation_row.status,
    'deliveryKind', invitation_row.delivery_kind,
    'message', invitation_row.message,
    'expiresAt', invitation_row.expires_at,
    'openedAt', invitation_row.opened_at,
    'senderDisplayName', coalesce(nullif(sender_name, ''), 'A Moral Trade participant'),
    'threadId', response_thread_id,
    'offer', jsonb_build_object(
      'id', offer_row.id,
      'offeredCause', offer_row.offered_cause,
      'requestedCause', offer_row.requested_cause,
      'offerAction', offer_row.offer_action,
      'requestAction', offer_row.request_action,
      'verification', offer_row.verification,
      'duration', offer_row.duration,
      'noTradeBaseline', offer_row.no_trade_baseline,
      'startDate', offer_row.start_date,
      'exitConditions', offer_row.exit_conditions,
      'maximumBurden', offer_row.maximum_burden,
      'privacyScope', offer_row.privacy_scope,
      'evidenceDueDate', offer_row.evidence_due_date,
      'termsVersion', offer_row.terms_version
    )
  );
end;
$$;

create or replace function public.revoke_trade_invitation_v2(
  p_actor_id uuid,
  p_invitation_id uuid,
  p_offer_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  invitation_row public.trade_invitations%rowtype;
  offer_row public.offers%rowtype;
begin
  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found or offer_row.owner_id <> p_actor_id then
    raise exception 'Offer not found or access denied.';
  end if;

  perform moral_trade_private.lock_invitation_delivery(p_invitation_id);
  select * into invitation_row
  from public.trade_invitations
  where id = p_invitation_id
    and offer_id = p_offer_id
    and sender_id = p_actor_id
  for update;

  if not found then
    raise exception 'Invitation not found or access denied.';
  end if;
  if not moral_trade_private.invitation_status_is_usable(invitation_row.status) then
    raise exception 'Only an open invitation can be revoked.';
  end if;
  if exists (
    select 1
    from public.email_outbox e
    where e.source_kind = 'trade_invitation'
      and e.source_id = p_invitation_id::text
      and e.status = 'processing'
      and e.locked_at >= now() - interval '10 minutes'
  ) then
    raise exception 'Invitation email delivery is in progress. Retry shortly.';
  end if;

  update public.trade_invitations
  set
    status = 'revoked',
    revoked_at = now(),
    revocation_reason = 'Revoked by sender.',
    updated_at = now()
  where id = p_invitation_id;
  perform moral_trade_private.suppress_invitation_email(
    p_invitation_id,
    'Invitation revoked by sender before delivery.'
  );
  return true;
end;
$$;

create or replace function public.respond_trade_invitation_v2(
  p_actor_id uuid,
  p_token_hash text,
  p_decision text,
  p_message text,
  p_proposed_action text,
  p_requested_action text,
  p_duration text,
  p_start_date date,
  p_evidence_rule text,
  p_evidence_due_date date,
  p_exit_conditions text,
  p_maximum_burden text,
  p_privacy_scope text,
  p_no_trade_baseline text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  invitation_row public.trade_invitations%rowtype;
  offer_row public.offers%rowtype;
  actor_email text;
  actor_email_confirmed timestamptz;
  thread_row public.trade_threads%rowtype;
  proposal_id_value uuid;
  proposal_version integer;
  proposal_terms_hash text;
  agreement_id_value uuid;
  agreement_version_id uuid;
  actor_name text;
begin
  if p_actor_id is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'A signed-in recipient and secure invitation are required.';
  end if;
  if p_decision not in ('accept', 'counter', 'decline') then
    raise exception 'Choose accept, counter, or decline.';
  end if;
  if length(btrim(coalesce(p_message, ''))) > 4000 then
    raise exception 'Response notes must be 4,000 characters or fewer.';
  end if;

  select * into invitation_row
  from public.trade_invitations
  where token_hash = p_token_hash;

  if not found
     or not moral_trade_private.invitation_status_is_usable(invitation_row.status) then
    raise exception 'Invitation is unavailable or was already answered.';
  end if;
  if invitation_row.sender_id = p_actor_id then
    raise exception 'The sender cannot answer their own invitation.';
  end if;

  select lower(u.email), u.email_confirmed_at
  into actor_email, actor_email_confirmed
  from auth.users u
  where u.id = p_actor_id;

  if actor_email_confirmed is null then
    raise exception 'Confirm your email address before answering an invitation.';
  end if;

  perform moral_trade_private.lock_pair(invitation_row.sender_id, p_actor_id);

  select * into offer_row
  from public.offers
  where id = invitation_row.offer_id
  for update;

  if not found then
    raise exception 'The reviewed proposal is no longer available.';
  end if;

  perform moral_trade_private.lock_invitation_delivery(invitation_row.id);
  select * into invitation_row
  from public.trade_invitations
  where id = invitation_row.id
    and token_hash = p_token_hash
  for update;

  if not found
     or not moral_trade_private.invitation_status_is_usable(invitation_row.status) then
    raise exception 'Invitation is unavailable or was already answered.';
  end if;
  if invitation_row.expires_at <= now() then
    update public.trade_invitations
    set status = 'expired', revoked_at = now(),
        revocation_reason = 'Invitation expired after 14 days.', updated_at = now()
    where id = invitation_row.id;
    perform moral_trade_private.suppress_invitation_email(
      invitation_row.id,
      'Invitation expired before response.'
    );
    raise exception 'Invitation expired.';
  end if;
  if invitation_row.sender_id = p_actor_id then
    raise exception 'The sender cannot answer their own invitation.';
  end if;

  if invitation_row.recipient_user_id is not null
     and invitation_row.recipient_user_id <> p_actor_id then
    raise exception 'This invitation is bound to a different account.';
  end if;
  if invitation_row.delivery_kind = 'email'
     and invitation_row.recipient_user_id is null
     and lower(invitation_row.recipient_email) <> actor_email then
    raise exception 'Sign in with the confirmed email address that received this invitation.';
  end if;

  if offer_row.id <> invitation_row.offer_id
     or offer_row.owner_id <> invitation_row.sender_id
     or not moral_trade_private.offer_is_invitable(offer_row.id)
     or invitation_row.terms_version <> offer_row.terms_version
     or invitation_row.terms_hash <> public.core_trade_terms_hash(
       offer_row.offer_action,
       offer_row.request_action,
       offer_row.duration,
       offer_row.start_date,
       offer_row.verification,
       offer_row.evidence_due_date,
       offer_row.exit_conditions,
       offer_row.maximum_burden,
       offer_row.privacy_scope,
       offer_row.no_trade_baseline
     ) then
    raise exception 'The reviewed proposal changed or is no longer eligible.';
  end if;

  if moral_trade_private.pair_is_blocked(invitation_row.sender_id, p_actor_id) then
    raise exception 'This interaction is blocked.';
  end if;

  update public.trade_invitations
  set
    recipient_user_id = p_actor_id,
    claimed_by = p_actor_id,
    claimed_at = coalesce(claimed_at, now()),
    updated_at = now()
  where id = invitation_row.id;

  if p_decision = 'decline' then
    update public.trade_invitations
    set status = 'declined', responded_at = now(), updated_at = now()
    where id = invitation_row.id;
    perform moral_trade_private.suppress_invitation_email(
      invitation_row.id,
      'Invitation was declined.'
    );
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      invitation_row.sender_id,
      'invitation_declined',
      'Invitation declined',
      'The invited participant declined. No agreement was created.',
      '/trades/' || invitation_row.offer_id::text || '/invite',
      'invitation_declined:' || invitation_row.id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
    return jsonb_build_object('status', 'declined');
  end if;

  select * into thread_row
  from public.trade_threads t
  where t.offer_id = offer_row.id
    and t.status <> 'closed'
    and (
      (t.participant_a = invitation_row.sender_id and t.participant_b = p_actor_id)
      or
      (t.participant_b = invitation_row.sender_id and t.participant_a = p_actor_id)
    )
  for update;

  if not found then
    insert into public.trade_threads(
      offer_id,
      invitation_id,
      participant_a,
      participant_b,
      status,
      last_message_at,
      created_at,
      updated_at
    ) values (
      offer_row.id,
      invitation_row.id,
      invitation_row.sender_id,
      p_actor_id,
      'active',
      now(),
      now(),
      now()
    )
    returning * into thread_row;
  end if;

  if thread_row.status <> 'active' then
    raise exception 'The private thread is not active.';
  end if;
  if thread_row.agreement_id is not null
     or exists (
       select 1
       from public.agreements a
       where a.offer_id = offer_row.id
         and (
           (a.proposer_id = invitation_row.sender_id and a.responder_id = p_actor_id)
           or
           (a.proposer_id = p_actor_id and a.responder_id = invitation_row.sender_id)
         )
         and a.lifecycle_status not in ('cancelled', 'expired')
     ) then
    raise exception 'An agreement already exists for this proposal and participant pair.';
  end if;

  select coalesce(max(cp.version), 0) + 1
  into proposal_version
  from public.trade_counterproposals cp
  where cp.thread_id = thread_row.id;

  update public.trade_counterproposals
  set status = 'superseded', responded_at = now()
  where thread_id = thread_row.id
    and status = 'proposed';

  if p_decision = 'accept' then
    proposal_terms_hash := public.core_trade_terms_hash(
      offer_row.offer_action,
      offer_row.request_action,
      offer_row.duration,
      offer_row.start_date,
      offer_row.verification,
      offer_row.evidence_due_date,
      offer_row.exit_conditions,
      offer_row.maximum_burden,
      offer_row.privacy_scope,
      offer_row.no_trade_baseline
    );

    insert into public.trade_counterproposals(
      thread_id, offer_id, proposer_id, version, status,
      proposed_action, requested_action, duration, start_date,
      evidence_rule, evidence_due_date, exit_conditions, maximum_burden,
      privacy_scope, no_trade_baseline, terms_hash, created_at, responded_at
    ) values (
      thread_row.id, offer_row.id, invitation_row.sender_id, proposal_version, 'proposed',
      offer_row.offer_action, offer_row.request_action, offer_row.duration, offer_row.start_date,
      offer_row.verification, offer_row.evidence_due_date, offer_row.exit_conditions,
      offer_row.maximum_burden, offer_row.privacy_scope, offer_row.no_trade_baseline,
      proposal_terms_hash, now(), null
    )
    returning id into proposal_id_value;

    perform set_config('app.core_trade_accepting', '1', true);
    update public.trade_counterproposals
    set status = 'accepted', responded_at = now()
    where id = proposal_id_value;

    insert into public.agreements(
      offer_id,
      interest_id,
      proposer_id,
      responder_id,
      status,
      lifecycle_status,
      notes,
      evidence_due_at,
      created_at,
      updated_at
    ) values (
      offer_row.id,
      null,
      invitation_row.sender_id,
      p_actor_id,
      'proposed',
      'proposed',
      'Created from an accepted structured counterproposal. Both parties must confirm the same immutable version.',
      offer_row.evidence_due_date,
      now(),
      now()
    )
    returning id into agreement_id_value;

    perform set_config('app.core_trade_linking_agreement', '1', true);
    insert into public.trade_agreement_versions(
      agreement_id, version, proposed_by, proposed_action, requested_action,
      duration, start_date, evidence_rule, evidence_due_date, exit_conditions,
      maximum_burden, privacy_scope, no_trade_baseline, terms_hash, created_at
    ) values (
      agreement_id_value, 1, invitation_row.sender_id,
      offer_row.offer_action, offer_row.request_action, offer_row.duration,
      offer_row.start_date, offer_row.verification, offer_row.evidence_due_date,
      offer_row.exit_conditions, offer_row.maximum_burden, offer_row.privacy_scope,
      offer_row.no_trade_baseline, proposal_terms_hash, now()
    )
    returning id into agreement_version_id;

    perform set_config('app.core_trade_internal', '1', true);
    update public.agreements
    set
      current_version_id = agreement_version_id,
      evidence_due_at = offer_row.evidence_due_date,
      status = 'proposed',
      lifecycle_status = 'proposed',
      updated_at = now()
    where id = agreement_id_value;

    update public.trade_threads
    set agreement_id = agreement_id_value, updated_at = now(), last_message_at = now()
    where id = thread_row.id;

    update public.trade_invitations
    set status = 'accepted', responded_at = now(), updated_at = now()
    where id = invitation_row.id;

    insert into public.trade_messages(
      thread_id, sender_id, message_type, body, metadata, created_at
    ) values (
      thread_row.id,
      null,
      'system',
      'The recipient accepted the reviewed terms. The agreement remains proposed until both participants confirm the same frozen version.',
      jsonb_build_object(
        'invitationId', invitation_row.id,
        'agreementId', agreement_id_value,
        'agreementVersionId', agreement_version_id
      ),
      now()
    );

    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values
      (
        invitation_row.sender_id,
        'final_confirmation_required',
        'Invitation accepted — confirm terms',
        'Review the frozen agreement version. It is not active until both participants confirm it.',
        '/trade-agreements/' || agreement_id_value::text,
        'invite_confirmation:' || agreement_id_value::text || ':' || invitation_row.sender_id::text,
        now()
      ),
      (
        p_actor_id,
        'final_confirmation_required',
        'Confirm the accepted terms',
        'Review the frozen agreement version. It is not active until both participants confirm it.',
        '/trade-agreements/' || agreement_id_value::text,
        'invite_confirmation:' || agreement_id_value::text || ':' || p_actor_id::text,
        now()
      )
    on conflict (dedupe_key) do nothing;

    perform moral_trade_private.suppress_invitation_email(
      invitation_row.id,
      'Invitation was accepted.'
    );
    return jsonb_build_object(
      'status', 'accepted',
      'threadId', thread_row.id,
      'agreementId', agreement_id_value,
      'agreementVersionId', agreement_version_id
    );
  end if;

  if greatest(
    length(btrim(coalesce(p_proposed_action, ''))),
    length(btrim(coalesce(p_requested_action, ''))),
    length(btrim(coalesce(p_duration, ''))),
    length(btrim(coalesce(p_evidence_rule, ''))),
    length(btrim(coalesce(p_exit_conditions, ''))),
    length(btrim(coalesce(p_maximum_burden, ''))),
    length(btrim(coalesce(p_privacy_scope, ''))),
    length(btrim(coalesce(p_no_trade_baseline, '')))
  ) > 5000 then
    raise exception 'Counterproposal terms must be 5,000 characters or fewer per field.';
  end if;
  if btrim(coalesce(p_proposed_action, '')) = ''
     or btrim(coalesce(p_requested_action, '')) = ''
     or btrim(coalesce(p_duration, '')) = ''
     or btrim(coalesce(p_evidence_rule, '')) = ''
     or btrim(coalesce(p_exit_conditions, '')) = ''
     or btrim(coalesce(p_maximum_burden, '')) = ''
     or btrim(coalesce(p_privacy_scope, '')) = ''
     or btrim(coalesce(p_no_trade_baseline, '')) = '' then
    raise exception 'Complete every bounded counterproposal term.';
  end if;

  proposal_terms_hash := public.core_trade_terms_hash(
    btrim(p_proposed_action),
    btrim(p_requested_action),
    btrim(p_duration),
    p_start_date,
    btrim(p_evidence_rule),
    p_evidence_due_date,
    btrim(p_exit_conditions),
    btrim(p_maximum_burden),
    btrim(p_privacy_scope),
    btrim(p_no_trade_baseline)
  );

  insert into public.trade_counterproposals(
    thread_id, offer_id, proposer_id, version, status,
    proposed_action, requested_action, duration, start_date,
    evidence_rule, evidence_due_date, exit_conditions, maximum_burden,
    privacy_scope, no_trade_baseline, terms_hash, created_at
  ) values (
    thread_row.id, offer_row.id, p_actor_id, proposal_version, 'proposed',
    btrim(p_proposed_action), btrim(p_requested_action), btrim(p_duration), p_start_date,
    btrim(p_evidence_rule), p_evidence_due_date, btrim(p_exit_conditions),
    btrim(p_maximum_burden), btrim(p_privacy_scope), btrim(p_no_trade_baseline),
    proposal_terms_hash, now()
  )
  returning id into proposal_id_value;

  select coalesce(nullif(p.display_name, ''), 'The invited participant')
  into actor_name
  from public.profiles p
  where p.id = p_actor_id;

  update public.trade_invitations
  set status = 'countered', responded_at = now(), updated_at = now()
  where id = invitation_row.id;

  insert into public.trade_messages(
    thread_id, sender_id, message_type, body, metadata, created_at
  ) values (
    thread_row.id,
    null,
    'system',
    coalesce(actor_name, 'The invited participant') || ' sent a counterproposal.',
    jsonb_build_object(
      'invitationId', invitation_row.id,
      'counterproposalId', proposal_id_value,
      'version', proposal_version
    ),
    now()
  );

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values (
    invitation_row.sender_id,
    'counterproposal_sent',
    'Invitation counterproposal received',
    'The invited participant proposed a new immutable version of the terms.',
    '/messages/' || thread_row.id::text,
    'invite_counter:' || proposal_id_value::text || ':' || invitation_row.sender_id::text,
    now()
  )
  on conflict (dedupe_key) do nothing;

  perform moral_trade_private.suppress_invitation_email(
    invitation_row.id,
    'Invitation received a counterproposal.'
  );
  return jsonb_build_object(
    'status', 'countered',
    'threadId', thread_row.id,
    'counterproposalId', proposal_id_value
  );
end;
$$;

create or replace function public.decide_counterproposal_v2(
  p_actor_id uuid,
  p_thread_id uuid,
  p_proposal_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  thread_row public.trade_threads%rowtype;
  proposal_row public.trade_counterproposals%rowtype;
  offer_row public.offers%rowtype;
  agreement_id_value uuid;
  agreement_version_id uuid;
begin
  if p_decision not in ('accept', 'reject') then
    raise exception 'Choose accept or reject.';
  end if;

  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b);
  if not found or thread_row.status <> 'active' then
    raise exception 'Thread not found or unavailable.';
  end if;

  perform moral_trade_private.lock_pair(thread_row.participant_a, thread_row.participant_b);

  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b)
  for update;
  if not found or thread_row.status <> 'active' then
    raise exception 'Thread not found or unavailable.';
  end if;

  select * into offer_row
  from public.offers
  where id = thread_row.offer_id
  for update;
  if not found then
    raise exception 'Offer not found.';
  end if;

  if moral_trade_private.pair_is_blocked(thread_row.participant_a, thread_row.participant_b) then
    raise exception 'This interaction is blocked.';
  end if;

  select * into proposal_row
  from public.trade_counterproposals
  where id = p_proposal_id
    and thread_id = p_thread_id
    and status = 'proposed'
  for update;
  if not found then
    raise exception 'The proposal is no longer awaiting a decision.';
  end if;
  if proposal_row.proposer_id = p_actor_id then
    raise exception 'The proposer cannot decide their own proposal.';
  end if;

  if p_decision = 'reject' then
    update public.trade_counterproposals
    set status = 'rejected', responded_at = now()
    where id = proposal_row.id;
    insert into public.trade_messages(
      thread_id, sender_id, message_type, body, metadata, created_at
    ) values (
      thread_row.id, null, 'system',
      'Counterproposal v' || proposal_row.version::text || ' was rejected.',
      jsonb_build_object('counterproposalId', proposal_row.id),
      now()
    );
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      proposal_row.proposer_id,
      'proposal_rejected',
      'Proposal rejected',
      'The current counterproposal was rejected. The private thread remains available.',
      '/messages/' || thread_row.id::text,
      'proposal_rejected:' || proposal_row.id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
    return jsonb_build_object('status', 'rejected', 'threadId', thread_row.id);
  end if;

  if thread_row.agreement_id is not null
     or exists (
       select 1
       from public.agreements a
       where a.offer_id = thread_row.offer_id
         and (
           (a.proposer_id = thread_row.participant_a and a.responder_id = thread_row.participant_b)
           or
           (a.proposer_id = thread_row.participant_b and a.responder_id = thread_row.participant_a)
         )
         and a.lifecycle_status not in ('cancelled', 'expired')
     ) then
    raise exception 'An agreement already exists for this participant pair.';
  end if;
  if not moral_trade_private.offer_is_invitable(offer_row.id) then
    raise exception 'This proposal is no longer eligible for a non-financial agreement.';
  end if;

  perform set_config('app.core_trade_accepting', '1', true);
  update public.trade_counterproposals
  set status = 'accepted', responded_at = now()
  where id = proposal_row.id;

  insert into public.agreements(
    offer_id, interest_id, proposer_id, responder_id, status,
    lifecycle_status, notes, evidence_due_at, created_at, updated_at
  ) values (
    offer_row.id,
    null,
    offer_row.owner_id,
    case
      when offer_row.owner_id = thread_row.participant_a then thread_row.participant_b
      else thread_row.participant_a
    end,
    'proposed',
    'proposed',
    'Created from an accepted structured counterproposal. Both parties must confirm the same immutable version.',
    proposal_row.evidence_due_date,
    now(),
    now()
  )
  returning id into agreement_id_value;

  perform set_config('app.core_trade_linking_agreement', '1', true);
  insert into public.trade_agreement_versions(
    agreement_id, version, proposed_by, proposed_action, requested_action,
    duration, start_date, evidence_rule, evidence_due_date, exit_conditions,
    maximum_burden, privacy_scope, no_trade_baseline, terms_hash, created_at
  ) values (
    agreement_id_value, 1, proposal_row.proposer_id,
    proposal_row.proposed_action, proposal_row.requested_action,
    proposal_row.duration, proposal_row.start_date, proposal_row.evidence_rule,
    proposal_row.evidence_due_date, proposal_row.exit_conditions,
    proposal_row.maximum_burden, proposal_row.privacy_scope,
    proposal_row.no_trade_baseline, proposal_row.terms_hash, now()
  )
  returning id into agreement_version_id;

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set current_version_id = agreement_version_id,
      evidence_due_at = proposal_row.evidence_due_date,
      status = 'proposed',
      lifecycle_status = 'proposed',
      updated_at = now()
  where id = agreement_id_value;
  update public.trade_threads
  set agreement_id = agreement_id_value, updated_at = now(), last_message_at = now()
  where id = thread_row.id;

  insert into public.trade_messages(
    thread_id, sender_id, message_type, body, metadata, created_at
  ) values (
    thread_row.id,
    null,
    'system',
    'The counterproposal was accepted. Both participants must confirm the same frozen agreement version before activation.',
    jsonb_build_object(
      'counterproposalId', proposal_row.id,
      'agreementId', agreement_id_value,
      'agreementVersionId', agreement_version_id
    ),
    now()
  );

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values
    (
      thread_row.participant_a,
      'final_confirmation_required',
      'Final confirmation required',
      'Review the frozen agreement version. It is not active until both participants confirm it.',
      '/trade-agreements/' || agreement_id_value::text,
      'counter_confirmation:' || agreement_id_value::text || ':' || thread_row.participant_a::text,
      now()
    ),
    (
      thread_row.participant_b,
      'final_confirmation_required',
      'Final confirmation required',
      'Review the frozen agreement version. It is not active until both participants confirm it.',
      '/trade-agreements/' || agreement_id_value::text,
      'counter_confirmation:' || agreement_id_value::text || ':' || thread_row.participant_b::text,
      now()
    )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'status', 'accepted',
    'threadId', thread_row.id,
    'agreementId', agreement_id_value,
    'agreementVersionId', agreement_version_id
  );
end;
$$;

create or replace function public.confirm_agreement_version_v2(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_agreement_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  agreement_row public.agreements%rowtype;
  version_row public.trade_agreement_versions%rowtype;
  offer_row public.offers%rowtype;
  confirmation_count integer;
  counterpart_id uuid;
  loser record;
begin
  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id);

  if not found
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Agreement is unavailable or can no longer be confirmed.';
  end if;

  perform moral_trade_private.lock_pair(
    agreement_row.proposer_id,
    agreement_row.responder_id
  );

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;

  if not found
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Agreement is unavailable or can no longer be confirmed.';
  end if;
  if agreement_row.current_version_id <> p_agreement_version_id then
    raise exception 'The agreement changed after you reviewed it. Review the current frozen version.';
  end if;

  select * into version_row
  from public.trade_agreement_versions
  where id = p_agreement_version_id
    and agreement_id = p_agreement_id;
  if not found then
    raise exception 'Frozen agreement version not found.';
  end if;

  select * into offer_row
  from public.offers
  where id = agreement_row.offer_id
  for update;
  if not found or not moral_trade_private.offer_is_invitable(offer_row.id) then
    raise exception 'The offer is no longer eligible for this non-financial agreement.';
  end if;

  if moral_trade_private.pair_is_blocked(
    agreement_row.proposer_id,
    agreement_row.responder_id
  ) then
    raise exception 'This interaction is blocked.';
  end if;

  insert into public.trade_agreement_confirmations(
    agreement_version_id, user_id, confirmed_at
  ) values (
    p_agreement_version_id, p_actor_id, now()
  )
  on conflict (agreement_version_id, user_id) do nothing;

  select count(distinct c.user_id) into confirmation_count
  from public.trade_agreement_confirmations c
  where c.agreement_version_id = p_agreement_version_id
    and c.user_id in (agreement_row.proposer_id, agreement_row.responder_id);

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;

  if confirmation_count < 2 then
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'final_confirmation_required',
      'Your confirmation is required',
      'The other participant confirmed the frozen agreement version.',
      '/trade-agreements/' || p_agreement_id::text,
      'confirmation_waiting:' || p_agreement_version_id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
    return jsonb_build_object(
      'status', 'proposed',
      'confirmationCount', confirmation_count,
      'active', false
    );
  end if;

  if exists (
    select 1
    from public.agreements a
    where a.offer_id = agreement_row.offer_id
      and a.id <> agreement_row.id
      and a.lifecycle_status in ('active', 'evidence_due', 'disputed', 'completed')
  ) then
    raise exception 'Another agreement already activated for this offer.';
  end if;

  perform set_config('app.core_trade_internal', '1', true);
  for loser in
    update public.agreements
    set
      status = 'cancelled',
      lifecycle_status = 'cancelled',
      cancelled_at = now(),
      exit_reason = 'Superseded when another agreement activated for the same offer.',
      updated_at = now()
    where offer_id = agreement_row.offer_id
      and id <> agreement_row.id
      and lifecycle_status = 'proposed'
    returning id
  loop
    update public.trade_threads
    set status = 'closed', updated_at = now()
    where agreement_id = loser.id;
  end loop;

  update public.agreements
  set
    status = 'active',
    lifecycle_status = 'active',
    activated_at = now(),
    evidence_due_at = version_row.evidence_due_date,
    updated_at = now()
  where id = agreement_row.id;

  update public.offers
  set
    status = 'matched',
    workflow_status = 'closed',
    closed_at = now(),
    updated_at = now()
  where id = agreement_row.offer_id;

  perform moral_trade_private.revoke_offer_invitations(
    agreement_row.offer_id,
    'Another invitation for this offer reached bilateral confirmation.'
  );

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values
    (
      agreement_row.proposer_id,
      'agreement_active',
      'Agreement active',
      'Both participants confirmed the frozen terms. Evidence and exit rules are now active.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_active:' || p_agreement_id::text || ':' || agreement_row.proposer_id::text,
      now()
    ),
    (
      agreement_row.responder_id,
      'agreement_active',
      'Agreement active',
      'Both participants confirmed the frozen terms. Evidence and exit rules are now active.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_active:' || p_agreement_id::text || ':' || agreement_row.responder_id::text,
      now()
    )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'status', 'active',
    'confirmationCount', confirmation_count,
    'active', true
  );
end;
$$;

create or replace function public.block_trade_pair_v2(
  p_actor_id uuid,
  p_thread_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  thread_row public.trade_threads%rowtype;
  counterpart_id uuid;
  invitation_id_value uuid;
  invitation_row public.trade_invitations%rowtype;
begin
  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b);
  if not found then
    raise exception 'Thread not found or access denied.';
  end if;

  counterpart_id := case
    when thread_row.participant_a = p_actor_id then thread_row.participant_b
    else thread_row.participant_a
  end;
  perform moral_trade_private.lock_pair(p_actor_id, counterpart_id);

  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and (
      (participant_a = p_actor_id and participant_b = counterpart_id)
      or
      (participant_a = counterpart_id and participant_b = p_actor_id)
    )
  for update;
  if not found then
    raise exception 'Thread not found or access denied.';
  end if;

  insert into public.trade_blocks(
    thread_id, blocker_id, blocked_id, reason, created_at
  ) values (
    p_thread_id,
    p_actor_id,
    counterpart_id,
    left(btrim(coalesce(p_reason, '')), 1000),
    now()
  )
  on conflict (thread_id, blocker_id, blocked_id)
  do update set reason = excluded.reason;

  update public.trade_threads
  set status = 'blocked', updated_at = now()
  where (
    (participant_a = p_actor_id and participant_b = counterpart_id)
    or
    (participant_a = counterpart_id and participant_b = p_actor_id)
  )
    and status <> 'closed';

  for invitation_id_value in
    select i.id
    from public.trade_invitations i
    where (
      (i.sender_id = p_actor_id and i.recipient_user_id = counterpart_id)
      or
      (i.sender_id = counterpart_id and i.recipient_user_id = p_actor_id)
    )
      and moral_trade_private.invitation_status_is_usable(i.status)
    order by i.id
  loop
    perform moral_trade_private.lock_invitation_delivery(invitation_id_value);
    select * into invitation_row
    from public.trade_invitations i
    where i.id = invitation_id_value
    for update;

    if found
       and moral_trade_private.invitation_status_is_usable(invitation_row.status) then
      update public.trade_invitations
      set
        status = 'revoked',
        revoked_at = now(),
        revocation_reason = 'Invitation revoked because this participant pair is blocked.',
        updated_at = now()
      where id = invitation_id_value;
      perform moral_trade_private.suppress_invitation_email(
        invitation_id_value,
        'Participant pair is blocked.'
      );
    end if;
  end loop;
  return true;
end;
$$;

create or replace function public.claim_email_outbox_v2(
  p_worker_token uuid,
  p_limit integer default 25
)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  candidate public.email_outbox%rowtype;
  locked_email public.email_outbox%rowtype;
  invitation_id_value uuid;
  invitation_row public.trade_invitations%rowtype;
  invitation_usable boolean;
  claimed public.email_outbox%rowtype;
begin
  if p_worker_token is null then
    raise exception 'Worker token is required.';
  end if;

  for candidate in
    select e.*
    from public.email_outbox e
    where (
      (e.status in ('queued', 'retry') and e.available_at <= now())
      or
      (e.status = 'processing' and e.locked_at < now() - interval '10 minutes')
    )
      and e.attempt_count < 5
      and btrim(e.recipient_email) <> ''
    order by e.created_at
    limit greatest(1, least(coalesce(p_limit, 25), 50))
  loop
    invitation_usable := true;

    if candidate.source_kind = 'trade_invitation' then
      invitation_usable := false;
      if candidate.source_id is null
         or candidate.source_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select * into locked_email
        from public.email_outbox e
        where e.id = candidate.id
          and (
            (e.status in ('queued', 'retry') and e.available_at <= now())
            or
            (e.status = 'processing' and e.locked_at < now() - interval '10 minutes')
          )
          and e.attempt_count < 5
        for update skip locked;
        if not found then
          continue;
        end if;
        update public.email_outbox
        set
          status = 'suppressed',
          body = '[private invitation link removed]',
          last_error = 'Invitation source identifier is invalid.',
          suppressed_at = now(),
          locked_at = null,
          lock_token = null
        where id = locked_email.id;
        continue;
      end if;

      invitation_id_value := candidate.source_id::uuid;
      if not pg_catalog.pg_try_advisory_xact_lock(
        pg_catalog.hashtextextended(
          'trade_invitation:' || invitation_id_value::text,
          90211
        )
      ) then
        continue;
      end if;

      select * into invitation_row
      from public.trade_invitations i
      where i.id = invitation_id_value
      for update;

      invitation_usable := found
        and moral_trade_private.invitation_status_is_usable(invitation_row.status)
        and invitation_row.expires_at > now();
    end if;

    select * into locked_email
    from public.email_outbox e
    where e.id = candidate.id
      and (
        (e.status in ('queued', 'retry') and e.available_at <= now())
        or
        (e.status = 'processing' and e.locked_at < now() - interval '10 minutes')
      )
      and e.attempt_count < 5
      and btrim(e.recipient_email) <> ''
    for update skip locked;
    if not found then
      continue;
    end if;

    if not invitation_usable then
      update public.email_outbox
      set
        status = 'suppressed',
        body = '[private invitation link removed]',
        last_error = 'Invitation is no longer deliverable.',
        suppressed_at = now(),
        locked_at = null,
        lock_token = null
      where id = locked_email.id;
      continue;
    end if;

    update public.email_outbox
    set
      status = 'processing',
      locked_at = now(),
      lock_token = p_worker_token,
      attempt_count = attempt_count + 1,
      last_error = ''
    where id = locked_email.id
    returning * into claimed;
    return next claimed;
  end loop;
  return;
end;
$$;

create or replace function public.complete_email_outbox_v2(
  p_email_id uuid,
  p_worker_token uuid,
  p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.email_outbox
  set
    status = 'sent',
    provider = 'resend',
    provider_message_id = left(coalesce(p_provider_message_id, ''), 500),
    sent_at = now(),
    last_error = '',
    body = case
      when source_kind = 'trade_invitation' then '[private invitation link removed after delivery]'
      else body
    end,
    locked_at = null,
    lock_token = null
  where id = p_email_id
    and status = 'processing'
    and lock_token = p_worker_token;
  return found;
end;
$$;

create or replace function public.retry_email_outbox_v2(
  p_email_id uuid,
  p_worker_token uuid,
  p_error text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  next_status text;
begin
  update public.email_outbox
  set
    status = case when attempt_count >= 5 then 'failed' else 'retry' end,
    available_at = case
      when attempt_count >= 5 then available_at
      else now() + make_interval(mins => power(2, least(attempt_count, 6))::integer)
    end,
    last_error = left(coalesce(p_error, 'Unknown email delivery failure.'), 500),
    locked_at = null,
    lock_token = null
  where id = p_email_id
    and status = 'processing'
    and lock_token = p_worker_token
  returning status into next_status;
  return next_status;
end;
$$;

create or replace function public.suppress_email_outbox_v2(
  p_email_id uuid,
  p_worker_token uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.email_outbox
  set
    status = 'suppressed',
    provider = 'resend_safety_gate',
    body = case
      when source_kind = 'trade_invitation' then '[private invitation link removed]'
      else body
    end,
    last_error = left(coalesce(p_reason, 'Suppressed by email safety gate.'), 500),
    suppressed_at = now(),
    locked_at = null,
    lock_token = null
  where id = p_email_id
    and status = 'processing'
    and lock_token = p_worker_token;
  return found;
end;
$$;

create or replace function public.enforce_global_pair_block_on_thread()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'active'
     and moral_trade_private.pair_is_blocked(new.participant_a, new.participant_b) then
    raise exception 'This participant pair is blocked.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_global_pair_block_on_thread_trigger on public.trade_threads;
create trigger enforce_global_pair_block_on_thread_trigger
before insert or update of participant_a, participant_b, status
on public.trade_threads
for each row execute function public.enforce_global_pair_block_on_thread();

create or replace function public.enforce_global_pair_block_on_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  thread_row public.trade_threads%rowtype;
begin
  if new.sender_id is null then
    return new;
  end if;
  select * into thread_row
  from public.trade_threads
  where id = new.thread_id;
  if not found
     or new.sender_id not in (thread_row.participant_a, thread_row.participant_b) then
    raise exception 'Only thread participants may send private messages.';
  end if;
  if thread_row.status <> 'active'
     or moral_trade_private.pair_is_blocked(
       thread_row.participant_a,
       thread_row.participant_b
     ) then
    raise exception 'This private interaction is blocked.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_global_pair_block_on_message_trigger on public.trade_messages;
create trigger enforce_global_pair_block_on_message_trigger
before insert on public.trade_messages
for each row execute function public.enforce_global_pair_block_on_message();

create or replace function public.revoke_trade_invitations_after_offer_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  terms_changed boolean;
begin
  terms_changed :=
    new.offered_cause is distinct from old.offered_cause
    or new.requested_cause is distinct from old.requested_cause
    or new.offer_action is distinct from old.offer_action
    or new.request_action is distinct from old.request_action
    or new.verification is distinct from old.verification
    or new.duration is distinct from old.duration
    or new.no_trade_baseline is distinct from old.no_trade_baseline
    or new.start_date is distinct from old.start_date
    or new.exit_conditions is distinct from old.exit_conditions
    or new.maximum_burden is distinct from old.maximum_burden
    or new.privacy_scope is distinct from old.privacy_scope
    or new.evidence_due_date is distinct from old.evidence_due_date
    or new.terms_version is distinct from old.terms_version;

  if terms_changed
     or new.workflow_status <> 'published'
     or new.status::text <> 'open' then
    perform moral_trade_private.revoke_offer_invitations(
      new.id,
      case
        when terms_changed then 'The offer terms changed.'
        else 'The offer is no longer published and open.'
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_trade_invitations_after_offer_change_trigger on public.offers;
create trigger revoke_trade_invitations_after_offer_change_trigger
after update on public.offers
for each row execute function public.revoke_trade_invitations_after_offer_change();

create or replace function public.guard_financial_attachment_against_trade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_offer_id uuid := new.offer_id;
  attachment_is_active boolean := true;
begin
  if tg_table_name = 'performance_bonds' then
    attachment_is_active := new.enabled is true
      and new.status not in ('not_enabled', 'cancelled', 'expired', 'refunded');
  end if;
  if not attachment_is_active then
    return new;
  end if;

  perform 1
  from public.offers
  where id = target_offer_id
  for update;

  if exists (
    select 1
    from public.trade_threads t
    where t.offer_id = target_offer_id
      and t.status <> 'closed'
  ) or exists (
    select 1
    from public.agreements a
    where a.offer_id = target_offer_id
      and a.lifecycle_status not in ('cancelled', 'expired')
  ) or exists (
    select 1
    from public.trade_invitations i
    where i.offer_id = target_offer_id
      and i.status in ('accepted', 'countered', 'responded')
  ) then
    raise exception 'Financial attachments cannot be added after a trade negotiation begins.';
  end if;

  perform moral_trade_private.revoke_offer_invitations(
    target_offer_id,
    'A financial attachment was added to the offer.'
  );
  return new;
end;
$$;

drop trigger if exists guard_financial_attachment_against_trade_trigger
  on public.donation_offset_offers;
create trigger guard_financial_attachment_against_trade_trigger
before insert or update on public.donation_offset_offers
for each row execute function public.guard_financial_attachment_against_trade();

drop trigger if exists guard_financial_attachment_against_trade_trigger
  on public.performance_bonds;
create trigger guard_financial_attachment_against_trade_trigger
before insert or update on public.performance_bonds
for each row execute function public.guard_financial_attachment_against_trade();

-- These tables are server-owned. RLS remains enabled, but direct API writes
-- cannot stage arbitrary outbound mail or inspect encrypted bearer material.
revoke all on public.trade_invitations from anon, authenticated;
revoke all on public.email_outbox from anon, authenticated;

revoke all on function public.create_trade_invitation_v2(
  uuid, uuid, uuid, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.preview_trade_invitation_v2(text, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_trade_invitation_v2(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.respond_trade_invitation_v2(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.decide_counterproposal_v2(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.block_trade_pair_v2(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.claim_email_outbox_v2(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.complete_email_outbox_v2(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.retry_email_outbox_v2(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.suppress_email_outbox_v2(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_trade_invitation_v2(
  uuid, uuid, uuid, text, text, text, text, text, text
) to service_role;
grant execute on function public.preview_trade_invitation_v2(text, uuid)
  to service_role;
grant execute on function public.revoke_trade_invitation_v2(uuid, uuid, uuid)
  to service_role;
grant execute on function public.respond_trade_invitation_v2(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) to service_role;
grant execute on function public.decide_counterproposal_v2(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  to service_role;
grant execute on function public.block_trade_pair_v2(uuid, uuid, text)
  to service_role;
grant execute on function public.claim_email_outbox_v2(uuid, integer)
  to service_role;
grant execute on function public.complete_email_outbox_v2(uuid, uuid, text)
  to service_role;
grant execute on function public.retry_email_outbox_v2(uuid, uuid, text)
  to service_role;
grant execute on function public.suppress_email_outbox_v2(uuid, uuid, text)
  to service_role;

revoke all on function public.ensure_email_outbox_idempotency()
  from public, anon, authenticated;
revoke all on function public.enforce_global_pair_block_on_thread()
  from public, anon, authenticated;
revoke all on function public.enforce_global_pair_block_on_message()
  from public, anon, authenticated;
revoke all on function public.revoke_trade_invitations_after_offer_change()
  from public, anon, authenticated;
revoke all on function public.guard_financial_attachment_against_trade()
  from public, anon, authenticated;

comment on table public.trade_invitations is
  'Private, expiring, term-bound trade invitations. Bearer tokens are never stored as plaintext.';
comment on function public.respond_trade_invitation_v2(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) is
  'Atomically claims an invitation and records accept, counter, or decline after recipient, term, eligibility, and block checks.';
