-- Conditional identity-threshold commitments.
-- Identities remain encrypted and service-only before the exact threshold is met.
-- When the threshold is reached, one guarded transaction publishes the exact verified
-- signer manifest and cryptographically erases the per-commitment key and ciphertext.
begin;

create extension if not exists pgcrypto;

create table if not exists public.collective_identity_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  credential_version integer not null check (credential_version >= 1),
  status text not null check (status in ('pending', 'verified', 'stale', 'revoked', 'rejected')),
  verified_real_name text not null check (char_length(btrim(verified_real_name)) between 1 and 200),
  verified_affiliation text not null default '' check (char_length(verified_affiliation) <= 240),
  human_uniqueness_ref_hash text not null check (human_uniqueness_ref_hash ~ '^[0-9a-f]{64}$'),
  provider text not null check (char_length(btrim(provider)) between 1 and 120),
  verification_method text not null check (char_length(btrim(verification_method)) between 1 and 160),
  assurance_tier text not null check (char_length(btrim(assurance_tier)) between 1 and 80),
  duplicate_check_result text not null check (
    duplicate_check_result in ('clear', 'potential_duplicate', 'confirmed_duplicate', 'not_run')
  ),
  manual_review_status text not null check (manual_review_status in ('approved', 'pending', 'rejected')),
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, credential_version),
  check (expires_at is null or verified_at is null or expires_at > verified_at)
);

create index if not exists collective_identity_credentials_profile_current_idx
  on public.collective_identity_credentials (profile_id, credential_version desc);
create index if not exists collective_identity_credentials_human_ref_idx
  on public.collective_identity_credentials (human_uniqueness_ref_hash);

create table if not exists public.collective_commitments (
  id uuid primary key,
  creator_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  proposition_type text not null check (proposition_type in (
    'public_letter',
    'workplace_organizing',
    'whistleblowing',
    'political_dissent',
    'funding_pledge',
    'other_collective_action'
  )),
  proposition_text text not null check (char_length(btrim(proposition_text)) between 10 and 12000),
  requirements_text text not null check (char_length(btrim(requirements_text)) between 3 and 6000),
  eligibility_rule text not null check (char_length(btrim(eligibility_rule)) between 3 and 4000),
  threshold_count integer not null check (threshold_count between 2 and 1000000),
  deadline_at timestamptz not null,
  risk_class text not null check (risk_class in ('standard', 'high')),
  risk_dimensions text[] not null default '{}'::text[],
  status text not null default 'open' check (status in ('open', 'activating', 'active', 'expired')),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  activation_token uuid,
  activation_started_at timestamptz,
  activated_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (risk_dimensions <@ array['financial', 'reputational', 'employment', 'political', 'legal']::text[]),
  check (risk_class = 'high' or cardinality(risk_dimensions) = 0),
  check (
    (status = 'open' and activation_token is null and activation_started_at is null and activated_at is null and expired_at is null)
    or (status = 'activating' and activation_token is not null and activation_started_at is not null and activated_at is null and expired_at is null)
    or (status = 'active' and activation_token is null and activation_started_at is null and activated_at is not null and expired_at is null)
    or (status = 'expired' and activation_token is null and activation_started_at is null and activated_at is null and expired_at is not null)
  )
);

create index if not exists collective_commitments_status_deadline_idx
  on public.collective_commitments (status, deadline_at);
create index if not exists collective_commitments_creator_created_idx
  on public.collective_commitments (creator_id, created_at desc);

create table if not exists public.collective_commitment_keys (
  commitment_id uuid primary key references public.collective_commitments (id) on delete cascade,
  wrapped_key_ciphertext text not null,
  wrapped_key_iv text not null,
  wrapped_key_tag text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collective_commitment_private_signatures (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.collective_commitments (id) on delete cascade,
  account_token text not null check (account_token ~ '^[0-9a-f]{64}$'),
  human_token text not null check (human_token ~ '^[0-9a-f]{64}$'),
  identity_commitment text not null check (identity_commitment ~ '^[0-9a-f]{64}$'),
  reveal_nonce text not null check (reveal_nonce ~ '^[0-9a-f]{48}$'),
  encrypted_identity_payload text not null,
  payload_iv text not null,
  payload_tag text not null,
  signed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint collective_commitment_signature_account_unique unique (commitment_id, account_token),
  constraint collective_commitment_signature_human_unique unique (commitment_id, human_token)
);

create index if not exists collective_commitment_private_signatures_order_idx
  on public.collective_commitment_private_signatures (commitment_id, signed_at, id);

create table if not exists public.collective_commitment_public_signers (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.collective_commitments (id) on delete cascade,
  ordinal integer not null check (ordinal >= 1),
  verified_real_name text not null check (char_length(btrim(verified_real_name)) between 1 and 200),
  verified_affiliation text check (verified_affiliation is null or char_length(btrim(verified_affiliation)) between 1 and 240),
  signed_at timestamptz not null,
  revealed_at timestamptz not null,
  identity_commitment text not null check (identity_commitment ~ '^[0-9a-f]{64}$'),
  unique (commitment_id, ordinal),
  unique (commitment_id, identity_commitment)
);

create table if not exists public.collective_commitment_receipts (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null unique references public.collective_commitments (id) on delete cascade,
  outcome text not null check (outcome in ('active', 'expired')),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  signer_manifest_hash text check (signer_manifest_hash is null or signer_manifest_hash ~ '^[0-9a-f]{64}$'),
  signer_count integer not null check (signer_count >= 0),
  receipt_hash text not null unique check (receipt_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (outcome = 'active' and signer_manifest_hash is not null and signer_count >= 2)
    or (outcome = 'expired' and signer_manifest_hash is null and signer_count = 0)
  )
);

create table if not exists public.collective_commitment_events (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.collective_commitments (id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'signature_added', 'signature_withdrawn', 'activation_started',
    'activation_released', 'activated', 'expired'
  )),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  public_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists collective_commitment_events_commitment_created_idx
  on public.collective_commitment_events (commitment_id, created_at, id);

comment on table public.collective_identity_credentials is
  'Operator-reviewed real-name, uniqueness, and optional-affiliation credentials. Raw identity documents are not stored here.';
comment on table public.collective_commitment_private_signatures is
  'Pre-threshold signer records. Account IDs, names, affiliations, and credential IDs exist only inside encrypted payloads.';
comment on table public.collective_commitment_keys is
  'Per-commitment data keys wrapped by an environment-specific application master key. Deleted on activation or expiry.';
comment on table public.collective_commitment_public_signers is
  'Verified real names, and only explicitly opted-in verified affiliations, revealed atomically after threshold activation.';

create or replace function public.collective_commitment_guard_frozen_terms()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  internal_write boolean := coalesce(current_setting('moral_trade.collective_internal_write', true), '') = 'on';
begin
  if new.creator_id is distinct from old.creator_id
     or new.title is distinct from old.title
     or new.proposition_type is distinct from old.proposition_type
     or new.proposition_text is distinct from old.proposition_text
     or new.requirements_text is distinct from old.requirements_text
     or new.eligibility_rule is distinct from old.eligibility_rule
     or new.threshold_count is distinct from old.threshold_count
     or new.deadline_at is distinct from old.deadline_at
     or new.risk_class is distinct from old.risk_class
     or new.risk_dimensions is distinct from old.risk_dimensions
     or new.terms_hash is distinct from old.terms_hash
     or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'collective_commitment_frozen_terms_immutable';
  end if;

  if not internal_write and (
    new.status is distinct from old.status
    or new.activation_token is distinct from old.activation_token
    or new.activation_started_at is distinct from old.activation_started_at
    or new.activated_at is distinct from old.activated_at
    or new.expired_at is distinct from old.expired_at
  ) then
    raise exception using
      errcode = '42501',
      message = 'collective_commitment_internal_state_only';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'open' and new.status in ('activating', 'expired'))
    or (old.status = 'activating' and new.status in ('open', 'active', 'expired'))
  ) then
    raise exception using
      errcode = '23514',
      message = 'collective_commitment_invalid_state_transition';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$function$;

revoke all on function public.collective_commitment_guard_frozen_terms() from public, anon, authenticated;

drop trigger if exists collective_commitment_guard_frozen_terms on public.collective_commitments;
create trigger collective_commitment_guard_frozen_terms
before update on public.collective_commitments
for each row
execute function public.collective_commitment_guard_frozen_terms();

create or replace function public.collective_identity_credentials_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$function$;

revoke all on function public.collective_identity_credentials_touch_updated_at() from public, anon, authenticated;

drop trigger if exists collective_identity_credentials_touch_updated_at on public.collective_identity_credentials;
create trigger collective_identity_credentials_touch_updated_at
before update on public.collective_identity_credentials
for each row
execute function public.collective_identity_credentials_touch_updated_at();

create or replace function public.create_collective_commitment_v1(
  p_id uuid,
  p_creator_id uuid,
  p_title text,
  p_proposition_type text,
  p_proposition_text text,
  p_requirements_text text,
  p_eligibility_rule text,
  p_threshold_count integer,
  p_deadline_at timestamptz,
  p_risk_class text,
  p_risk_dimensions text[],
  p_terms_hash text,
  p_wrapped_key_ciphertext text,
  p_wrapped_key_iv text,
  p_wrapped_key_tag text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_deadline_at <= clock_timestamp() then
    raise exception using errcode = '23514', message = 'collective_commitment_deadline_must_be_future';
  end if;

  insert into public.collective_commitments (
    id, creator_id, title, proposition_type, proposition_text, requirements_text,
    eligibility_rule, threshold_count, deadline_at, risk_class, risk_dimensions, terms_hash
  ) values (
    p_id, p_creator_id, btrim(p_title), p_proposition_type, btrim(p_proposition_text),
    btrim(p_requirements_text), btrim(p_eligibility_rule), p_threshold_count, p_deadline_at,
    p_risk_class, coalesce(p_risk_dimensions, '{}'::text[]), p_terms_hash
  );

  insert into public.collective_commitment_keys (
    commitment_id, wrapped_key_ciphertext, wrapped_key_iv, wrapped_key_tag
  ) values (
    p_id, p_wrapped_key_ciphertext, p_wrapped_key_iv, p_wrapped_key_tag
  );

  insert into public.collective_commitment_events (
    commitment_id, event_type, actor_profile_id,
    public_payload
  ) values (
    p_id, 'created', p_creator_id,
    jsonb_build_object('termsHash', p_terms_hash, 'thresholdCount', p_threshold_count)
  );

  return jsonb_build_object('id', p_id, 'status', 'open', 'termsHash', p_terms_hash);
end;
$function$;

create or replace function public.add_collective_commitment_signature_v1(
  p_commitment_id uuid,
  p_account_token text,
  p_human_token text,
  p_identity_commitment text,
  p_reveal_nonce text,
  p_encrypted_identity_payload text,
  p_payload_iv text,
  p_payload_tag text,
  p_signed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  commitment_row public.collective_commitments%rowtype;
  inserted_id uuid;
  signer_count integer;
  new_activation_token uuid;
begin
  select * into commitment_row
  from public.collective_commitments
  where id = p_commitment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'collective_commitment_not_found';
  end if;
  if commitment_row.status <> 'open' then
    raise exception using errcode = '55000', message = 'collective_commitment_not_open';
  end if;
  if commitment_row.deadline_at <= clock_timestamp() then
    raise exception using errcode = '55000', message = 'collective_commitment_deadline_passed';
  end if;

  begin
    insert into public.collective_commitment_private_signatures (
      commitment_id, account_token, human_token, identity_commitment, reveal_nonce,
      encrypted_identity_payload, payload_iv, payload_tag, signed_at
    ) values (
      p_commitment_id, p_account_token, p_human_token, p_identity_commitment, p_reveal_nonce,
      p_encrypted_identity_payload, p_payload_iv, p_payload_tag, p_signed_at
    ) returning id into inserted_id;
  exception
    when unique_violation then
      if exists (
        select 1 from public.collective_commitment_private_signatures
        where commitment_id = p_commitment_id and human_token = p_human_token
      ) then
        raise exception using errcode = '23505', message = 'collective_commitment_duplicate_human';
      end if;
      raise exception using errcode = '23505', message = 'collective_commitment_duplicate_account';
  end;

  select count(*)::integer into signer_count
  from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;

  insert into public.collective_commitment_events (
    commitment_id, event_type, public_payload
  ) values (
    p_commitment_id, 'signature_added',
    jsonb_build_object('qualifyingSignerCount', signer_count)
  );

  if signer_count = commitment_row.threshold_count then
    new_activation_token := gen_random_uuid();
    perform set_config('moral_trade.collective_internal_write', 'on', true);
    update public.collective_commitments
    set status = 'activating',
        activation_token = new_activation_token,
        activation_started_at = clock_timestamp(),
        activated_at = null,
        expired_at = null
    where id = p_commitment_id;

    insert into public.collective_commitment_events (
      commitment_id, event_type, public_payload
    ) values (
      p_commitment_id, 'activation_started',
      jsonb_build_object('qualifyingSignerCount', signer_count)
    );
  end if;

  return jsonb_build_object(
    'signatureId', inserted_id,
    'status', case when new_activation_token is null then 'open' else 'activating' end,
    'qualifyingSignerCount', signer_count,
    'activationToken', new_activation_token
  );
end;
$function$;

create or replace function public.withdraw_collective_commitment_signature_v1(
  p_commitment_id uuid,
  p_account_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  commitment_status text;
  removed_count integer := 0;
  signer_count integer := 0;
begin
  select status into commitment_status
  from public.collective_commitments
  where id = p_commitment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'collective_commitment_not_found';
  end if;
  if commitment_status <> 'open' then
    raise exception using errcode = '55000', message = 'collective_commitment_not_withdrawable';
  end if;

  delete from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id and account_token = p_account_token;
  get diagnostics removed_count = row_count;

  select count(*)::integer into signer_count
  from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;

  if removed_count > 0 then
    insert into public.collective_commitment_events (
      commitment_id, event_type, public_payload
    ) values (
      p_commitment_id, 'signature_withdrawn',
      jsonb_build_object('qualifyingSignerCount', signer_count)
    );
  end if;

  return jsonb_build_object(
    'withdrawn', removed_count = 1,
    'qualifyingSignerCount', signer_count
  );
end;
$function$;

create or replace function public.activate_collective_commitment_v1(
  p_commitment_id uuid,
  p_activation_token uuid,
  p_manifest jsonb,
  p_mac_key_hex text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  commitment_row public.collective_commitments%rowtype;
  signature_count integer;
  manifest_count integer;
  manifest_unique_count integer;
  invalid_count integer;
  revealed_at_value timestamptz := clock_timestamp();
  signer_manifest jsonb;
  signer_manifest_hash text;
  receipt_hash_value text;
begin
  select * into commitment_row
  from public.collective_commitments
  where id = p_commitment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'collective_commitment_not_found';
  end if;
  if commitment_row.status <> 'activating'
     or commitment_row.activation_token is distinct from p_activation_token then
    raise exception using errcode = '55000', message = 'collective_commitment_activation_token_invalid';
  end if;
  if p_manifest is null or jsonb_typeof(p_manifest) <> 'array' then
    raise exception using errcode = '22023', message = 'collective_commitment_manifest_must_be_array';
  end if;

  select count(*)::integer into signature_count
  from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;
  manifest_count := jsonb_array_length(p_manifest);

  if signature_count <> commitment_row.threshold_count or manifest_count <> signature_count then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_count_mismatch';
  end if;

  select count(distinct (entry->>'signatureId'))::integer
  into manifest_unique_count
  from jsonb_array_elements(p_manifest) entry;
  if manifest_unique_count <> manifest_count then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_duplicate_signature';
  end if;

  select count(*)::integer into invalid_count
  from public.collective_commitment_private_signatures signature
  full join jsonb_array_elements(p_manifest) entry
    on (entry->>'signatureId')::uuid = signature.id
   and signature.commitment_id = p_commitment_id
  where signature.id is null
     or entry is null
     or entry->>'revealNonce' is distinct from signature.reveal_nonce
     or entry->>'identityCommitment' is distinct from signature.identity_commitment
     or char_length(btrim(coalesce(entry->>'verifiedRealName', ''))) = 0
     or (entry ? 'verifiedAffiliation' and entry->'verifiedAffiliation' <> 'null'::jsonb
         and char_length(btrim(coalesce(entry->>'verifiedAffiliation', ''))) = 0)
     or encode(
          extensions.hmac(
            convert_to(
              btrim(entry->>'verifiedRealName') || E'\n' ||
              btrim(coalesce(entry->>'verifiedAffiliation', '')) || E'\n' ||
              entry->>'revealNonce',
              'UTF8'
            ),
            decode(p_mac_key_hex, 'hex'),
            'sha256'
          ),
          'hex'
        ) is distinct from signature.identity_commitment;

  if invalid_count <> 0 then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_exactness_or_mac_failed';
  end if;

  insert into public.collective_commitment_public_signers (
    commitment_id, ordinal, verified_real_name, verified_affiliation,
    signed_at, revealed_at, identity_commitment
  )
  select
    p_commitment_id,
    row_number() over (order by signature.signed_at, signature.id)::integer,
    btrim(entry->>'verifiedRealName'),
    nullif(btrim(coalesce(entry->>'verifiedAffiliation', '')), ''),
    signature.signed_at,
    revealed_at_value,
    signature.identity_commitment
  from public.collective_commitment_private_signatures signature
  join jsonb_array_elements(p_manifest) entry
    on (entry->>'signatureId')::uuid = signature.id
  where signature.commitment_id = p_commitment_id
  order by signature.signed_at, signature.id;

  select jsonb_agg(
    jsonb_build_object(
      'identityCommitment', identity_commitment,
      'ordinal', ordinal,
      'signedAt', signed_at,
      'verifiedAffiliation', verified_affiliation,
      'verifiedRealName', verified_real_name
    ) order by ordinal
  ) into signer_manifest
  from public.collective_commitment_public_signers
  where commitment_id = p_commitment_id;

  signer_manifest_hash := encode(extensions.digest(convert_to(signer_manifest::text, 'UTF8'), 'sha256'), 'hex');
  receipt_hash_value := encode(
    extensions.digest(
      convert_to(
        commitment_row.terms_hash || E'\nactive\n' || signer_manifest_hash || E'\n' ||
        signature_count::text || E'\n' || revealed_at_value::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.collective_commitment_receipts (
    commitment_id, outcome, terms_hash, signer_manifest_hash, signer_count,
    receipt_hash, created_at
  ) values (
    p_commitment_id, 'active', commitment_row.terms_hash, signer_manifest_hash,
    signature_count, receipt_hash_value, revealed_at_value
  );

  perform set_config('moral_trade.collective_internal_write', 'on', true);
  update public.collective_commitments
  set status = 'active', activation_token = null, activation_started_at = null,
      activated_at = revealed_at_value, expired_at = null
  where id = p_commitment_id;

  delete from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;
  delete from public.collective_commitment_keys
  where commitment_id = p_commitment_id;

  insert into public.collective_commitment_events (
    commitment_id, event_type, public_payload
  ) values (
    p_commitment_id, 'activated',
    jsonb_build_object(
      'signerCount', signature_count,
      'signerManifestHash', signer_manifest_hash,
      'receiptHash', receipt_hash_value
    )
  );

  return jsonb_build_object(
    'activated', true,
    'signerCount', signature_count,
    'signerManifestHash', signer_manifest_hash,
    'receiptHash', receipt_hash_value
  );
exception
  when invalid_text_representation then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_signature_id_invalid';
end;
$function$;

create or replace function public.release_collective_commitment_activation_v1(
  p_commitment_id uuid,
  p_activation_token uuid,
  p_invalid_signature_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  commitment_row public.collective_commitments%rowtype;
  invalid_count integer;
  signer_count integer;
begin
  select * into commitment_row
  from public.collective_commitments
  where id = p_commitment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'collective_commitment_not_found';
  end if;
  if commitment_row.status <> 'activating'
     or commitment_row.activation_token is distinct from p_activation_token then
    raise exception using errcode = '55000', message = 'collective_commitment_activation_token_invalid';
  end if;
  if p_invalid_signature_ids is null or cardinality(p_invalid_signature_ids) = 0 then
    raise exception using errcode = '22023', message = 'collective_commitment_invalid_signature_ids_required';
  end if;

  select count(*)::integer into invalid_count
  from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id and id = any(p_invalid_signature_ids);
  if invalid_count <> cardinality(p_invalid_signature_ids) then
    raise exception using errcode = '23514', message = 'collective_commitment_invalid_signature_set_mismatch';
  end if;

  delete from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id and id = any(p_invalid_signature_ids);

  select count(*)::integer into signer_count
  from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;

  perform set_config('moral_trade.collective_internal_write', 'on', true);
  update public.collective_commitments
  set status = 'open', activation_token = null, activation_started_at = null,
      activated_at = null, expired_at = null
  where id = p_commitment_id;

  insert into public.collective_commitment_events (
    commitment_id, event_type, public_payload
  ) values (
    p_commitment_id, 'activation_released',
    jsonb_build_object('removedSignatureCount', invalid_count, 'qualifyingSignerCount', signer_count)
  );

  return jsonb_build_object(
    'released', true,
    'removedSignatureCount', invalid_count,
    'qualifyingSignerCount', signer_count
  );
end;
$function$;

create or replace function public.expire_collective_commitments_v1()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  commitment_row public.collective_commitments%rowtype;
  expired_ids uuid[] := '{}'::uuid[];
  expired_at_value timestamptz;
  receipt_hash_value text;
begin
  for commitment_row in
    select *
    from public.collective_commitments
    where status in ('open', 'activating')
      and deadline_at <= clock_timestamp()
    order by deadline_at, id
    for update skip locked
  loop
    expired_at_value := clock_timestamp();
    receipt_hash_value := encode(
      extensions.digest(
        convert_to(
          commitment_row.terms_hash || E'\nexpired\n0\n' || expired_at_value::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    delete from public.collective_commitment_private_signatures
    where commitment_id = commitment_row.id;
    delete from public.collective_commitment_keys
    where commitment_id = commitment_row.id;

    perform set_config('moral_trade.collective_internal_write', 'on', true);
    update public.collective_commitments
    set status = 'expired', activation_token = null, activation_started_at = null,
        activated_at = null, expired_at = expired_at_value
    where id = commitment_row.id;

    insert into public.collective_commitment_receipts (
      commitment_id, outcome, terms_hash, signer_manifest_hash, signer_count,
      receipt_hash, created_at
    ) values (
      commitment_row.id, 'expired', commitment_row.terms_hash, null, 0,
      receipt_hash_value, expired_at_value
    ) on conflict (commitment_id) do nothing;

    insert into public.collective_commitment_events (
      commitment_id, event_type, public_payload
    ) values (
      commitment_row.id, 'expired',
      jsonb_build_object('receiptHash', receipt_hash_value)
    );

    expired_ids := array_append(expired_ids, commitment_row.id);
  end loop;

  return jsonb_build_object(
    'expiredCommitmentIds', to_jsonb(expired_ids),
    'expiredCount', cardinality(expired_ids)
  );
end;
$function$;

alter table public.collective_identity_credentials enable row level security;
alter table public.collective_commitments enable row level security;
alter table public.collective_commitment_keys enable row level security;
alter table public.collective_commitment_private_signatures enable row level security;
alter table public.collective_commitment_public_signers enable row level security;
alter table public.collective_commitment_receipts enable row level security;
alter table public.collective_commitment_events enable row level security;

revoke all on table public.collective_identity_credentials from public, anon, authenticated;
revoke all on table public.collective_commitments from public, anon, authenticated;
revoke all on table public.collective_commitment_keys from public, anon, authenticated;
revoke all on table public.collective_commitment_private_signatures from public, anon, authenticated;
revoke all on table public.collective_commitment_events from public, anon, authenticated;

revoke all on table public.collective_commitment_public_signers from public, anon, authenticated;
revoke all on table public.collective_commitment_receipts from public, anon, authenticated;
grant select on table public.collective_commitment_public_signers to anon, authenticated;
grant select on table public.collective_commitment_receipts to anon, authenticated;

drop policy if exists collective_commitment_public_signers_are_revealed on public.collective_commitment_public_signers;
create policy collective_commitment_public_signers_are_revealed
on public.collective_commitment_public_signers
for select
to anon, authenticated
using (true);

drop policy if exists collective_commitment_receipts_are_public on public.collective_commitment_receipts;
create policy collective_commitment_receipts_are_public
on public.collective_commitment_receipts
for select
to anon, authenticated
using (true);

revoke all on function public.create_collective_commitment_v1(
  uuid, uuid, text, text, text, text, text, integer, timestamptz, text, text[], text, text, text, text
) from public, anon, authenticated;
revoke all on function public.add_collective_commitment_signature_v1(
  uuid, text, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.withdraw_collective_commitment_signature_v1(uuid, text)
  from public, anon, authenticated;
revoke all on function public.activate_collective_commitment_v1(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.release_collective_commitment_activation_v1(uuid, uuid, uuid[])
  from public, anon, authenticated;
revoke all on function public.expire_collective_commitments_v1()
  from public, anon, authenticated;

grant execute on function public.create_collective_commitment_v1(
  uuid, uuid, text, text, text, text, text, integer, timestamptz, text, text[], text, text, text, text
) to service_role;
grant execute on function public.add_collective_commitment_signature_v1(
  uuid, text, text, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.withdraw_collective_commitment_signature_v1(uuid, text)
  to service_role;
grant execute on function public.activate_collective_commitment_v1(uuid, uuid, jsonb, text)
  to service_role;
grant execute on function public.release_collective_commitment_activation_v1(uuid, uuid, uuid[])
  to service_role;
grant execute on function public.expire_collective_commitments_v1()
  to service_role;

commit;
