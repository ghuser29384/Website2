-- One natural person, one canonical Moral Trade account.
--
-- The migration is additive and fail-closed. Existing auth users are classified as
-- legacy_unverified, while both registration and participation enforcement remain off
-- until the provider, authenticated QA, recovery operations, and release gates are ready.
-- Raw documents, selfies, videos, full document numbers, and reusable biometric
-- templates are deliberately absent from this schema.

begin;

-- Cross-relation DDL is split across migrations so this transaction never holds
-- a strong lock on auth.users while waiting for public.profiles, or vice versa.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists moral_trade_private;
revoke all on schema moral_trade_private from public, anon, authenticated;

create table if not exists moral_trade_private.person_account_release_gates (
  gate_key text primary key check (gate_key = 'one_person_account_v1'),
  policy_version text not null default 'one-natural-person-one-canonical-account-v1-2026-07-31',
  provider_mode text not null default 'disabled' check (
    provider_mode in ('disabled', 'manual_review', 'signed_webhook', 'qa_mock')
  ),
  provider_ready boolean not null default false,
  registration_enforcement_enabled boolean not null default false,
  participation_enforcement_enabled boolean not null default false,
  activated_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    not registration_enforcement_enabled
    or (provider_ready and provider_mode <> 'disabled')
  ),
  check (
    not participation_enforcement_enabled
    or (provider_ready and provider_mode <> 'disabled')
  )
);

insert into moral_trade_private.person_account_release_gates (gate_key)
values ('one_person_account_v1')
on conflict (gate_key) do nothing;

create table if not exists moral_trade_private.identity_subjects (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid unique references auth.users(id) on delete restrict,
  state text not null default 'pending' check (
    state in (
      'pending',
      'verified',
      'duplicate_review',
      'recovery',
      'closed',
      'tombstoned',
      'merged',
      'revoked',
      'rejected'
    )
  ),
  verification_status text not null default 'pending' check (
    verification_status in ('pending', 'verified', 'stale', 'revoked', 'rejected')
  ),
  age_class text not null default 'unknown' check (
    age_class in ('unknown', 'adult', 'minor_13_17', 'under_13')
  ),
  assurance_tier text not null default '',
  duplicate_check_result text not null default 'not_run' check (
    duplicate_check_result in ('clear', 'potential_duplicate', 'confirmed_duplicate', 'not_run')
  ),
  latest_provider_name text not null default '',
  verified_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at is null or verified_at is null or expires_at > verified_at),
  check (
    (state in ('closed', 'tombstoned', 'merged') and closed_at is not null)
    or (state not in ('closed', 'tombstoned', 'merged') and closed_at is null)
  )
);

create index if not exists identity_subjects_state_status_idx
  on moral_trade_private.identity_subjects (state, verification_status, updated_at desc);
create index if not exists identity_subjects_expiry_idx
  on moral_trade_private.identity_subjects (expires_at)
  where expires_at is not null and verification_status = 'verified';

create table if not exists moral_trade_private.identity_dedupe_keys (
  id uuid primary key default gen_random_uuid(),
  identity_subject_id uuid not null
    references moral_trade_private.identity_subjects(id) on delete restrict,
  token_namespace text not null check (
    token_namespace in (
      'provider_subject',
      'government_document',
      'biometric_duplicate_cluster',
      'manual_equivalent'
    )
  ),
  token_version integer not null default 1 check (token_version between 1 and 1000),
  token_hmac text not null check (token_hmac ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check (status in ('active', 'retired', 'tombstone')),
  source_provider text not null default '',
  retained_after_closure boolean not null default true,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  unique (token_namespace, token_version, token_hmac)
);

create index if not exists identity_dedupe_keys_subject_idx
  on moral_trade_private.identity_dedupe_keys (identity_subject_id, status);

create table if not exists moral_trade_private.preaccount_verification_sessions (
  id uuid primary key,
  purpose text not null default 'registration' check (
    purpose in ('registration', 'verify_existing', 'recovery')
  ),
  retrieval_token_hash text not null unique check (retrieval_token_hash ~ '^[0-9a-f]{64}$'),
  pending_registration_token_hash text check (
    pending_registration_token_hash is null
    or pending_registration_token_hash ~ '^[0-9a-f]{64}$'
  ),
  requested_profile_id uuid references auth.users(id) on delete restrict,
  identity_subject_id uuid references moral_trade_private.identity_subjects(id) on delete restrict,
  provider_mode text not null check (
    provider_mode in ('manual_review', 'signed_webhook', 'qa_mock')
  ),
  provider_name text not null check (char_length(btrim(provider_name)) between 1 and 160),
  provider_session_reference_hmac text check (
    provider_session_reference_hmac is null
    or provider_session_reference_hmac ~ '^[0-9a-f]{64}$'
  ),
  requested_return_to text not null default '/onboarding' check (
    requested_return_to like '/%' and requested_return_to not like '//%'
  ),
  state text not null default 'created' check (
    state in (
      'created',
      'provider_pending',
      'needs_review',
      'guardian_required',
      'verified',
      'duplicate_recovery',
      'rejected',
      'expired',
      'consumed'
    )
  ),
  age_class text not null default 'unknown' check (
    age_class in ('unknown', 'adult', 'minor_13_17', 'under_13')
  ),
  duplicate_reason_code text not null default '',
  verified_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at > created_at),
  check (
    (purpose = 'registration'
      and requested_profile_id is null
      and pending_registration_token_hash is not null)
    or (purpose = 'verify_existing'
      and requested_profile_id is not null
      and pending_registration_token_hash is null)
    or (purpose = 'recovery'
      and pending_registration_token_hash is null)
  )
);

create index if not exists preaccount_verification_sessions_state_expiry_idx
  on moral_trade_private.preaccount_verification_sessions (state, expires_at);
create index if not exists preaccount_verification_sessions_profile_idx
  on moral_trade_private.preaccount_verification_sessions (requested_profile_id, created_at desc)
  where requested_profile_id is not null;

create table if not exists moral_trade_private.person_registration_grants (
  id uuid primary key default gen_random_uuid(),
  verification_session_id uuid not null unique
    references moral_trade_private.preaccount_verification_sessions(id) on delete restrict,
  identity_subject_id uuid not null
    references moral_trade_private.identity_subjects(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  email_binding_hmac text check (
    email_binding_hmac is null or email_binding_hmac ~ '^[0-9a-f]{64}$'
  ),
  state text not null default 'issued' check (
    state in ('issued', 'reserved', 'consumed', 'revoked', 'expired')
  ),
  proposed_auth_user_id uuid unique,
  issued_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  reserved_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > issued_at),
  check (
    (state = 'issued' and reserved_at is null and consumed_at is null and revoked_at is null)
    or (state = 'reserved' and reserved_at is not null and consumed_at is null and revoked_at is null)
    or (state = 'consumed' and reserved_at is not null and consumed_at is not null and revoked_at is null)
    or (state = 'revoked' and revoked_at is not null and consumed_at is null)
    or (state = 'expired' and consumed_at is null)
  )
);

create unique index if not exists person_registration_grants_one_open_subject_idx
  on moral_trade_private.person_registration_grants (identity_subject_id)
  where state in ('issued', 'reserved');
create index if not exists person_registration_grants_state_expiry_idx
  on moral_trade_private.person_registration_grants (state, expires_at);

create table if not exists moral_trade_private.person_accounts (
  profile_id uuid primary key references auth.users(id) on delete restrict,
  identity_subject_id uuid unique
    references moral_trade_private.identity_subjects(id) on delete restrict,
  account_kind text not null default 'human' check (
    account_kind in ('human', 'service', 'synthetic')
  ),
  account_status text not null default 'active' check (
    account_status in (
      'active',
      'limited',
      'recovery_cooldown',
      'duplicate_review',
      'closed',
      'banned'
    )
  ),
  verification_status text not null default 'legacy_unverified' check (
    verification_status in (
      'legacy_unverified',
      'pending',
      'verified',
      'stale',
      'revoked',
      'rejected'
    )
  ),
  age_class text not null default 'unknown' check (
    age_class in ('unknown', 'adult', 'minor_13_17', 'under_13')
  ),
  guardian_consent_status text not null default 'not_required' check (
    guardian_consent_status in ('not_required', 'pending', 'active', 'revoked', 'expired')
  ),
  ordinary_cooldown_until timestamptz,
  high_risk_cooldown_until timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (account_status = 'closed' and closed_at is not null)
    or (account_status <> 'closed' and closed_at is null)
  ),
  check (
    age_class <> 'minor_13_17'
    or guardian_consent_status <> 'not_required'
  )
);

create index if not exists person_accounts_status_verification_idx
  on moral_trade_private.person_accounts (account_status, verification_status, updated_at desc);
create index if not exists person_accounts_cooldown_idx
  on moral_trade_private.person_accounts (ordinary_cooldown_until, high_risk_cooldown_until)
  where ordinary_cooldown_until is not null or high_risk_cooldown_until is not null;

-- A private, provider-neutral inventory of authentication credentials attached to a
-- canonical account. Provider subject identifiers are HMACed by the application before
-- insertion; provider emails, names, access tokens, and raw identity payloads are absent.
create table if not exists moral_trade_private.person_credential_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete restrict,
  provider text not null check (provider ~ '^[a-z0-9][a-z0-9_:-]{0,79}$'),
  identity_id_hmac text not null check (identity_id_hmac ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check (status in ('active', 'removed')),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  unique (provider, identity_id_hmac),
  check (
    (status = 'active' and removed_at is null)
    or (status = 'removed' and removed_at is not null)
  )
);

create index if not exists person_credential_links_profile_status_idx
  on moral_trade_private.person_credential_links (profile_id, status, last_seen_at desc);

create table if not exists moral_trade_private.preaccount_guardian_consents (
  verification_session_id uuid primary key
    references moral_trade_private.preaccount_verification_sessions(id) on delete restrict,
  guardian_profile_id uuid not null references auth.users(id) on delete restrict,
  authority_reference_hash text not null check (authority_reference_hash ~ '^[0-9a-f]{64}$'),
  consent_scope text[] not null default array['basic_participation']::text[],
  status text not null default 'pending' check (
    status in ('pending', 'active', 'revoked', 'expired', 'rejected')
  ),
  verified_by uuid references auth.users(id) on delete set null,
  effective_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at is null or effective_at is null or expires_at > effective_at),
  check (
    (status = 'active' and effective_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or status in ('pending', 'expired', 'rejected')
  )
);

create index if not exists preaccount_guardian_consents_guardian_status_idx
  on moral_trade_private.preaccount_guardian_consents (guardian_profile_id, status);

create table if not exists moral_trade_private.guardian_relationships (
  id uuid primary key default gen_random_uuid(),
  minor_profile_id uuid not null references auth.users(id) on delete restrict,
  guardian_profile_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (
    status in ('pending', 'active', 'revoked', 'expired', 'rejected')
  ),
  authority_reference_hash text not null check (authority_reference_hash ~ '^[0-9a-f]{64}$'),
  consent_scope text[] not null default '{}',
  verified_by uuid references auth.users(id) on delete set null,
  effective_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (minor_profile_id, guardian_profile_id),
  check (minor_profile_id <> guardian_profile_id),
  check (expires_at is null or effective_at is null or expires_at > effective_at),
  check (
    (status = 'active' and effective_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or status in ('pending', 'expired', 'rejected')
  )
);

create index if not exists guardian_relationships_minor_status_idx
  on moral_trade_private.guardian_relationships (minor_profile_id, status, expires_at);
create index if not exists guardian_relationships_guardian_status_idx
  on moral_trade_private.guardian_relationships (guardian_profile_id, status);

create table if not exists moral_trade_private.identity_verification_events (
  id uuid primary key default gen_random_uuid(),
  identity_subject_id uuid references moral_trade_private.identity_subjects(id) on delete restrict,
  verification_session_id uuid not null
    references moral_trade_private.preaccount_verification_sessions(id) on delete restrict,
  provider_name text not null,
  provider_event_id_hmac text not null check (provider_event_id_hmac ~ '^[0-9a-f]{64}$'),
  provider_session_reference_hmac text not null check (
    provider_session_reference_hmac ~ '^[0-9a-f]{64}$'
  ),
  event_payload_hash text not null check (event_payload_hash ~ '^[0-9a-f]{64}$'),
  outcome text not null check (outcome in ('verified', 'rejected', 'needs_review')),
  assurance_tier text not null,
  age_class text not null check (age_class in ('unknown', 'adult', 'minor_13_17', 'under_13')),
  duplicate_check_result text not null check (
    duplicate_check_result in ('clear', 'potential_duplicate', 'confirmed_duplicate', 'not_run')
  ),
  provider_verified_at timestamptz,
  credential_expires_at timestamptz,
  raw_data_deletion_due_at timestamptz,
  raw_data_deletion_confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider_name, provider_event_id_hmac)
);

create index if not exists identity_verification_events_subject_created_idx
  on moral_trade_private.identity_verification_events (identity_subject_id, created_at desc)
  where identity_subject_id is not null;
create index if not exists identity_verification_events_deletion_due_idx
  on moral_trade_private.identity_verification_events (raw_data_deletion_due_at)
  where raw_data_deletion_due_at is not null
    and raw_data_deletion_confirmed_at is null;

create table if not exists moral_trade_private.identity_duplicate_cases (
  id uuid primary key default gen_random_uuid(),
  verification_session_id uuid
    references moral_trade_private.preaccount_verification_sessions(id) on delete restrict,
  subject_a_id uuid references moral_trade_private.identity_subjects(id) on delete restrict,
  subject_b_id uuid references moral_trade_private.identity_subjects(id) on delete restrict,
  requested_profile_id uuid references auth.users(id) on delete restrict,
  existing_profile_id uuid references auth.users(id) on delete restrict,
  reason_code text not null,
  status text not null default 'open' check (
    status in (
      'open',
      'recovery_required',
      'merge_pending',
      'resolved_no_duplicate',
      'merged',
      'blocked'
    )
  ),
  reviewed_by uuid references auth.users(id) on delete set null,
  private_note text not null default '',
  opened_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  check (subject_a_id is not null or subject_b_id is not null),
  check (subject_a_id is null or subject_b_id is null or subject_a_id <> subject_b_id)
);

create index if not exists identity_duplicate_cases_status_opened_idx
  on moral_trade_private.identity_duplicate_cases (status, opened_at);

create table if not exists moral_trade_private.account_recovery_cases (
  id uuid primary key default gen_random_uuid(),
  verification_session_id uuid not null unique
    references moral_trade_private.preaccount_verification_sessions(id) on delete restrict,
  identity_subject_id uuid not null
    references moral_trade_private.identity_subjects(id) on delete restrict,
  canonical_profile_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'identity_matched' check (
    status in (
      'identity_matched',
      'channel_confirmation_pending',
      'operator_review',
      'approved',
      'rejected',
      'completed'
    )
  ),
  ordinary_cooldown_until timestamptz,
  high_risk_cooldown_until timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create index if not exists account_recovery_cases_status_created_idx
  on moral_trade_private.account_recovery_cases (status, created_at);

create table if not exists moral_trade_private.account_merge_cases (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references auth.users(id) on delete restrict,
  duplicate_profile_id uuid not null references auth.users(id) on delete restrict,
  contested boolean not null default true,
  reason_code text not null default 'suspected_duplicate',
  status text not null default 'draft' check (
    status in ('draft', 'dry_run_complete', 'blocked', 'pending_review', 'approved', 'rejected', 'executed', 'cancelled')
  ),
  dry_run_summary jsonb not null default '{}'::jsonb,
  conflict_summary jsonb not null default '{}'::jsonb,
  credentials_reconciled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  executed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  executed_at timestamptz,
  unique (canonical_profile_id, duplicate_profile_id),
  check (canonical_profile_id <> duplicate_profile_id)
);

create table if not exists moral_trade_private.account_merge_reviews (
  merge_case_id uuid not null
    references moral_trade_private.account_merge_cases(id) on delete restrict,
  reviewer_profile_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approve', 'reject')),
  rationale text not null check (char_length(btrim(rationale)) between 3 and 4000),
  reviewed_at timestamptz not null default timezone('utc', now()),
  primary key (merge_case_id, reviewer_profile_id)
);

create index if not exists account_merge_reviews_case_decision_idx
  on moral_trade_private.account_merge_reviews (merge_case_id, decision, reviewed_at);

create table if not exists moral_trade_private.person_account_aliases (
  alias_profile_id uuid primary key references auth.users(id) on delete restrict,
  canonical_profile_id uuid not null references auth.users(id) on delete restrict,
  merge_case_id uuid references moral_trade_private.account_merge_cases(id) on delete restrict,
  reason_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (alias_profile_id <> canonical_profile_id)
);

create index if not exists person_account_aliases_canonical_idx
  on moral_trade_private.person_account_aliases (canonical_profile_id);

create table if not exists moral_trade_private.identity_tombstones (
  identity_subject_id uuid primary key
    references moral_trade_private.identity_subjects(id) on delete restrict,
  canonical_profile_id uuid references auth.users(id) on delete restrict,
  state text not null default 'retained' check (state in ('retained', 'legal_hold', 'released')),
  reason_code text not null,
  closed_at timestamptz not null,
  retain_until timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists moral_trade_private.account_security_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references auth.users(id) on delete restrict,
  identity_subject_id uuid references moral_trade_private.identity_subjects(id) on delete restrict,
  verification_session_id uuid
    references moral_trade_private.preaccount_verification_sessions(id) on delete restrict,
  event_type text not null check (
    event_type in (
      'legacy_account_classified',
      'verification_session_created',
      'verification_passed',
      'verification_rejected',
      'duplicate_detected',
      'registration_grant_issued',
      'registration_grant_reserved',
      'registration_completed',
      'recovery_opened',
      'recovery_completed',
      'guardian_consent_changed',
      'guardian_consent_recorded',
      'recovery_approved',
      'account_closed',
      'account_reopened',
      'merge_case_created',
      'merge_reviewed',
      'merge_credentials_reconciled',
      'merge_completed',
      'credential_linked',
      'credential_removed',
      'raw_provider_data_deletion_confirmed'
    )
  ),
  public_safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_security_events_profile_created_idx
  on moral_trade_private.account_security_events (profile_id, created_at desc)
  where profile_id is not null;
create index if not exists account_security_events_subject_created_idx
  on moral_trade_private.account_security_events (identity_subject_id, created_at desc)
  where identity_subject_id is not null;

create table if not exists moral_trade_private.account_cooldowns (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete restrict,
  scope text not null check (scope in ('ordinary', 'high_risk')),
  reason_code text not null,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz not null,
  lifted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at),
  check (lifted_at is null or lifted_at >= starts_at)
);

create index if not exists account_cooldowns_profile_active_idx
  on moral_trade_private.account_cooldowns (profile_id, scope, ends_at)
  where lifted_at is null;

-- The identity layer is reachable only through narrowly granted RPCs.
do $lock_private_tables$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'person_account_release_gates',
    'identity_subjects',
    'identity_dedupe_keys',
    'preaccount_verification_sessions',
    'person_registration_grants',
    'person_accounts',
    'person_credential_links',
    'preaccount_guardian_consents',
    'guardian_relationships',
    'identity_verification_events',
    'identity_duplicate_cases',
    'account_recovery_cases',
    'account_merge_cases',
    'account_merge_reviews',
    'person_account_aliases',
    'identity_tombstones',
    'account_security_events',
    'account_cooldowns'
  ]
  loop
    execute format('alter table moral_trade_private.%I enable row level security', relation_name);
    execute format(
      'revoke all on table moral_trade_private.%I from public, anon, authenticated, service_role',
      relation_name
    );
  end loop;
end;
$lock_private_tables$;

create or replace function moral_trade_private.person_identity_touch_updated_at()
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

create or replace function moral_trade_private.person_identity_append_only()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if coalesce(current_setting('moral_trade.person_identity_internal_write', true), '') <> 'on' then
    raise exception using
      errcode = '42501',
      message = 'person_identity_append_only_record';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function moral_trade_private.person_identity_touch_updated_at()
  from public, anon, authenticated, service_role;
revoke all on function moral_trade_private.person_identity_append_only()
  from public, anon, authenticated, service_role;

create trigger person_account_release_gates_touch_updated_at
before update on moral_trade_private.person_account_release_gates
for each row execute function moral_trade_private.person_identity_touch_updated_at();
create trigger identity_subjects_touch_updated_at
before update on moral_trade_private.identity_subjects
for each row execute function moral_trade_private.person_identity_touch_updated_at();
create trigger preaccount_verification_sessions_touch_updated_at
before update on moral_trade_private.preaccount_verification_sessions
for each row execute function moral_trade_private.person_identity_touch_updated_at();
create trigger person_accounts_touch_updated_at
before update on moral_trade_private.person_accounts
for each row execute function moral_trade_private.person_identity_touch_updated_at();
create trigger preaccount_guardian_consents_touch_updated_at
before update on moral_trade_private.preaccount_guardian_consents
for each row execute function moral_trade_private.person_identity_touch_updated_at();
create trigger guardian_relationships_touch_updated_at
before update on moral_trade_private.guardian_relationships
for each row execute function moral_trade_private.person_identity_touch_updated_at();
create trigger account_merge_cases_touch_updated_at
before update on moral_trade_private.account_merge_cases
for each row execute function moral_trade_private.person_identity_touch_updated_at();

create trigger identity_verification_events_append_only
before update or delete on moral_trade_private.identity_verification_events
for each row execute function moral_trade_private.person_identity_append_only();
create trigger account_security_events_append_only
before update or delete on moral_trade_private.account_security_events
for each row execute function moral_trade_private.person_identity_append_only();
create trigger identity_dedupe_keys_no_delete
before delete on moral_trade_private.identity_dedupe_keys
for each row execute function moral_trade_private.person_identity_append_only();

create or replace function moral_trade_private.person_account_kind_for_user(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when coalesce(user_row.raw_app_meta_data ->> 'account_kind', '') = 'service'
      then 'service'
    when coalesce(user_row.raw_app_meta_data ->> 'account_kind', '') = 'synthetic'
      or lower(coalesce(user_row.raw_user_meta_data ->> 'qa_fixture', 'false')) = 'true'
      then 'synthetic'
    else 'human'
  end
  from auth.users user_row
  where user_row.id = p_profile_id;
$function$;

revoke all on function moral_trade_private.person_account_kind_for_user(uuid)
  from public, anon, authenticated, service_role;

create or replace function moral_trade_private.ensure_person_account_row(p_profile_id uuid)
returns moral_trade_private.person_accounts
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_row moral_trade_private.person_accounts%rowtype;
  account_kind_value text;
begin
  select moral_trade_private.person_account_kind_for_user(p_profile_id)
  into account_kind_value;

  if account_kind_value is null then
    raise exception using errcode = '23503', message = 'person_account_auth_user_not_found';
  end if;

  insert into moral_trade_private.person_accounts (
    profile_id,
    account_kind,
    account_status,
    verification_status,
    age_class,
    guardian_consent_status
  ) values (
    p_profile_id,
    account_kind_value,
    'active',
    case when account_kind_value = 'human' then 'legacy_unverified' else 'rejected' end,
    'unknown',
    'not_required'
  )
  on conflict (profile_id) do update
  set account_kind = excluded.account_kind
  returning * into account_row;

  return account_row;
end;
$function$;

revoke all on function moral_trade_private.ensure_person_account_row(uuid)
  from public, anon, authenticated, service_role;

select set_config('moral_trade.person_identity_internal_write', 'on', true);

insert into moral_trade_private.person_accounts (
  profile_id,
  account_kind,
  account_status,
  verification_status,
  age_class,
  guardian_consent_status
)
select
  user_row.id,
  case
    when coalesce(user_row.raw_app_meta_data ->> 'account_kind', '') = 'service'
      then 'service'
    when coalesce(user_row.raw_app_meta_data ->> 'account_kind', '') = 'synthetic'
      or lower(coalesce(user_row.raw_user_meta_data ->> 'qa_fixture', 'false')) = 'true'
      then 'synthetic'
    else 'human'
  end,
  'active',
  case
    when coalesce(user_row.raw_app_meta_data ->> 'account_kind', '') in ('service', 'synthetic')
      or lower(coalesce(user_row.raw_user_meta_data ->> 'qa_fixture', 'false')) = 'true'
      then 'rejected'
    else 'legacy_unverified'
  end,
  'unknown',
  'not_required'
from auth.users user_row
on conflict (profile_id) do nothing;

insert into moral_trade_private.account_security_events (
  profile_id,
  event_type,
  public_safe_metadata
)
select
  account.profile_id,
  'legacy_account_classified',
  jsonb_build_object(
    'verificationStatus', account.verification_status,
    'accountKind', account.account_kind,
    'policyVersion', 'one-natural-person-one-canonical-account-v1-2026-07-31'
  )
from moral_trade_private.person_accounts account
where not exists (
  select 1
  from moral_trade_private.account_security_events event
  where event.profile_id = account.profile_id
    and event.event_type = 'legacy_account_classified'
);

create or replace function moral_trade_private.sync_identity_verified_badge(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if to_regclass('public.profile_verification_badges') is null
     or not exists (select 1 from public.profiles profile where profile.id = p_profile_id) then
    return;
  end if;

  insert into public.profile_verification_badges (
    profile_id,
    badge_type,
    status,
    evidence_summary,
    source,
    reviewed_by,
    reviewed_at,
    expires_at,
    created_at,
    updated_at
  ) values (
    p_profile_id,
    'identity_verified',
    'verified',
    'One-person account verification passed.',
    'one_person_account_v1',
    null,
    timezone('utc', now()),
    null,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (profile_id, badge_type) do update
  set status = 'verified',
      evidence_summary = excluded.evidence_summary,
      source = excluded.source,
      reviewed_by = null,
      reviewed_at = excluded.reviewed_at,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at;
end;
$function$;

revoke all on function moral_trade_private.sync_identity_verified_badge(uuid)
  from public, anon, authenticated, service_role;

-- Make the public badge table a projection, not a second identity authority.
do $identity_badge_index$
begin
  if to_regclass('public.profile_verification_badges') is not null then
    execute 'create unique index if not exists profile_verification_badges_profile_type_uidx on public.profile_verification_badges(profile_id, badge_type)';
  end if;
end;
$identity_badge_index$;

create or replace function moral_trade_private.sync_identity_badge_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from moral_trade_private.person_accounts account
    where account.profile_id = new.id
      and account.account_kind = 'human'
      and account.verification_status = 'verified'
  ) then
    perform moral_trade_private.sync_identity_verified_badge(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function moral_trade_private.sync_identity_badge_from_profile()
  from public, anon, authenticated, service_role;

-- The public.profiles projection trigger is installed by the follow-up
-- profile-only migration so this transaction never needs strong locks on both
-- auth.users and public.profiles.

create or replace function public.create_person_verification_session_v1(
  p_session_id uuid,
  p_purpose text,
  p_retrieval_token_hash text,
  p_pending_registration_token_hash text,
  p_requested_profile_id uuid,
  p_provider_mode text,
  p_provider_name text,
  p_provider_session_reference_hmac text,
  p_requested_return_to text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_row moral_trade_private.person_accounts%rowtype;
begin
  if p_session_id is null
     or p_purpose not in ('registration', 'verify_existing', 'recovery')
     or p_retrieval_token_hash !~ '^[0-9a-f]{64}$'
     or (
       p_pending_registration_token_hash is not null
       and p_pending_registration_token_hash !~ '^[0-9a-f]{64}$'
     )
     or p_provider_mode not in ('manual_review', 'signed_webhook', 'qa_mock')
     or length(btrim(coalesce(p_provider_name, ''))) not between 1 and 160
     or (
       p_provider_session_reference_hmac is not null
       and p_provider_session_reference_hmac !~ '^[0-9a-f]{64}$'
     )
     or p_requested_return_to not like '/%'
     or p_requested_return_to like '//%'
     or p_expires_at <= timezone('utc', now())
     or p_expires_at > timezone('utc', now()) + interval '3 hours'
     or (p_purpose = 'registration' and (p_requested_profile_id is not null or p_pending_registration_token_hash is null))
     or (p_purpose = 'verify_existing' and (p_requested_profile_id is null or p_pending_registration_token_hash is not null))
     or (p_purpose = 'recovery' and p_pending_registration_token_hash is not null) then
    raise exception using errcode = '22023', message = 'person_verification_session_invalid';
  end if;

  if p_purpose = 'verify_existing' and p_requested_profile_id is not null then
    account_row := moral_trade_private.ensure_person_account_row(p_requested_profile_id);
    if account_row.account_kind <> 'human' then
      raise exception using errcode = '42501', message = 'person_verification_human_account_required';
    end if;
  end if;

  insert into moral_trade_private.preaccount_verification_sessions (
    id,
    purpose,
    retrieval_token_hash,
    pending_registration_token_hash,
    requested_profile_id,
    provider_mode,
    provider_name,
    provider_session_reference_hmac,
    requested_return_to,
    state,
    expires_at
  ) values (
    p_session_id,
    p_purpose,
    p_retrieval_token_hash,
    p_pending_registration_token_hash,
    p_requested_profile_id,
    p_provider_mode,
    btrim(p_provider_name),
    p_provider_session_reference_hmac,
    p_requested_return_to,
    case when p_provider_mode = 'manual_review' then 'needs_review' else 'provider_pending' end,
    p_expires_at
  );

  insert into moral_trade_private.account_security_events (
    profile_id,
    verification_session_id,
    event_type,
    public_safe_metadata
  ) values (
    p_requested_profile_id,
    p_session_id,
    'verification_session_created',
    jsonb_build_object(
      'purpose', p_purpose,
      'providerMode', p_provider_mode,
      'providerName', btrim(p_provider_name),
      'preAccount', p_requested_profile_id is null
    )
  );

  return jsonb_build_object(
    'sessionId', p_session_id,
    'purpose', p_purpose,
    'state', case when p_provider_mode = 'manual_review' then 'needs_review' else 'provider_pending' end,
    'expiresAt', p_expires_at,
    'preAccount', p_requested_profile_id is null
  );
end;
$function$;

create or replace function public.get_person_verification_session_status_v1(
  p_session_id uuid,
  p_retrieval_token_hash text,
  p_registration_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  session_row moral_trade_private.preaccount_verification_sessions%rowtype;
  grant_row moral_trade_private.person_registration_grants%rowtype;
begin
  select * into session_row
  from moral_trade_private.preaccount_verification_sessions session
  where session.id = p_session_id
    and session.retrieval_token_hash = p_retrieval_token_hash
  for update;

  if not found then
    return jsonb_build_object('available', false, 'state', 'unavailable');
  end if;

  if session_row.expires_at <= timezone('utc', now())
     and session_row.state not in ('consumed', 'expired') then
    update moral_trade_private.preaccount_verification_sessions
    set state = 'expired'
    where id = session_row.id;
    session_row.state := 'expired';

    update moral_trade_private.person_registration_grants
    set state = 'expired'
    where verification_session_id = session_row.id
      and state in ('issued', 'reserved');
  end if;

  if p_registration_token_hash is not null then
    select * into grant_row
    from moral_trade_private.person_registration_grants registration_grant
    where registration_grant.verification_session_id = session_row.id
      and registration_grant.token_hash = p_registration_token_hash;
  end if;

  return jsonb_build_object(
    'available', true,
    'sessionId', session_row.id,
    'purpose', session_row.purpose,
    'state', session_row.state,
    'providerMode', session_row.provider_mode,
    'providerName', session_row.provider_name,
    'expiresAt', session_row.expires_at,
    'returnTo', session_row.requested_return_to,
    'preAccount', session_row.requested_profile_id is null,
    'registrationReady', grant_row.id is not null and grant_row.state = 'issued'
      and grant_row.expires_at > timezone('utc', now()),
    'grantId', case
      when grant_row.id is not null and grant_row.state = 'issued'
        then grant_row.id
      else null
    end,
    'recoveryRequired', session_row.state = 'duplicate_recovery'
  );
end;
$function$;

create or replace function public.list_pending_person_verification_sessions_v1(
  p_limit integer default 100
)
returns table (
  session_id uuid,
  purpose text,
  requested_profile_id uuid,
  provider_mode text,
  provider_name text,
  state text,
  age_class text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    session.id,
    session.purpose,
    session.requested_profile_id,
    session.provider_mode,
    session.provider_name,
    session.state,
    session.age_class,
    session.created_at,
    session.expires_at
  from moral_trade_private.preaccount_verification_sessions session
  where session.state in ('created', 'provider_pending', 'needs_review', 'guardian_required', 'duplicate_recovery')
  order by session.created_at asc, session.id asc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$function$;

create or replace function public.record_person_verification_result_v1(
  p_session_id uuid,
  p_provider_name text,
  p_provider_event_id_hmac text,
  p_provider_session_reference_hmac text,
  p_event_payload_hash text,
  p_outcome text,
  p_assurance_tier text,
  p_age_class text,
  p_duplicate_check_result text,
  p_dedupe_tokens jsonb,
  p_provider_verified_at timestamptz,
  p_credential_expires_at timestamptz,
  p_raw_data_deletion_due_at timestamptz,
  p_registration_grant_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  session_row moral_trade_private.preaccount_verification_sessions%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  event_row moral_trade_private.identity_verification_events%rowtype;
  dedupe_item jsonb;
  namespace_value text;
  version_value integer;
  token_value text;
  matched_subject_ids uuid[] := '{}';
  matched_subject_count integer := 0;
  existing_open_grant uuid;
  grant_id_value uuid;
  account_row moral_trade_private.person_accounts%rowtype;
  recovery_id_value uuid;
  duplicate_case_id uuid;
  now_value timestamptz := timezone('utc', now());
begin
  if length(btrim(coalesce(p_provider_name, ''))) not between 1 and 160
     or p_provider_event_id_hmac !~ '^[0-9a-f]{64}$'
     or p_provider_session_reference_hmac !~ '^[0-9a-f]{64}$'
     or p_event_payload_hash !~ '^[0-9a-f]{64}$'
     or p_outcome not in ('verified', 'rejected', 'needs_review')
     or length(btrim(coalesce(p_assurance_tier, ''))) not between 1 and 120
     or p_age_class not in ('unknown', 'adult', 'minor_13_17', 'under_13')
     or p_duplicate_check_result not in (
       'clear', 'potential_duplicate', 'confirmed_duplicate', 'not_run'
     )
     or jsonb_typeof(coalesce(p_dedupe_tokens, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_dedupe_tokens, '[]'::jsonb)) > 8
     or (p_outcome = 'verified' and p_provider_verified_at is null)
     or (p_outcome = 'verified' and p_raw_data_deletion_due_at is null)
     or (p_provider_verified_at is not null and p_provider_verified_at > now_value + interval '10 minutes')
     or (p_credential_expires_at is not null and p_credential_expires_at <= p_provider_verified_at)
     or (
       p_raw_data_deletion_due_at is not null
       and (
         p_raw_data_deletion_due_at < now_value
         or p_raw_data_deletion_due_at > now_value + interval '90 days'
       )
     ) then
    raise exception using errcode = '22023', message = 'person_verification_result_invalid';
  end if;

  select * into event_row
  from moral_trade_private.identity_verification_events event
  where event.provider_name = btrim(p_provider_name)
    and event.provider_event_id_hmac = p_provider_event_id_hmac;

  if found then
    if event_row.verification_session_id <> p_session_id
       or event_row.provider_session_reference_hmac <> p_provider_session_reference_hmac
       or event_row.event_payload_hash <> p_event_payload_hash
       or event_row.outcome <> p_outcome
       or event_row.assurance_tier <> btrim(p_assurance_tier)
       or event_row.age_class <> p_age_class
       or event_row.duplicate_check_result <> p_duplicate_check_result
       or event_row.provider_verified_at is distinct from p_provider_verified_at
       or event_row.credential_expires_at is distinct from p_credential_expires_at
       or event_row.raw_data_deletion_due_at is distinct from p_raw_data_deletion_due_at then
      raise exception using
        errcode = '23514',
        message = 'person_verification_provider_event_replay_mismatch';
    end if;

    return jsonb_build_object(
      'idempotent', true,
      'sessionId', event_row.verification_session_id,
      'state', (
        select session.state
        from moral_trade_private.preaccount_verification_sessions session
        where session.id = event_row.verification_session_id
      )
    );
  end if;

  select * into session_row
  from moral_trade_private.preaccount_verification_sessions session
  where session.id = p_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'person_verification_session_not_found';
  end if;
  if btrim(p_provider_name) <> session_row.provider_name
     or (
       session_row.provider_session_reference_hmac is not null
       and session_row.provider_session_reference_hmac <> p_provider_session_reference_hmac
     ) then
    raise exception using errcode = '42501', message = 'person_verification_provider_session_mismatch';
  end if;
  if session_row.expires_at <= now_value then
    update moral_trade_private.preaccount_verification_sessions
    set state = 'expired'
    where id = session_row.id;
    raise exception using errcode = '55000', message = 'person_verification_session_expired';
  end if;
  if session_row.state not in ('created', 'provider_pending', 'needs_review') then
    raise exception using errcode = '55000', message = 'person_verification_session_not_open';
  end if;

  if p_outcome <> 'verified' then
    insert into moral_trade_private.identity_verification_events (
      verification_session_id,
      provider_name,
      provider_event_id_hmac,
      provider_session_reference_hmac,
      event_payload_hash,
      outcome,
      assurance_tier,
      age_class,
      duplicate_check_result,
      provider_verified_at,
      credential_expires_at,
      raw_data_deletion_due_at
    ) values (
      session_row.id,
      btrim(p_provider_name),
      p_provider_event_id_hmac,
      p_provider_session_reference_hmac,
      p_event_payload_hash,
      p_outcome,
      btrim(p_assurance_tier),
      p_age_class,
      p_duplicate_check_result,
      p_provider_verified_at,
      p_credential_expires_at,
      p_raw_data_deletion_due_at
    );

    update moral_trade_private.preaccount_verification_sessions
    set state = case when p_outcome = 'needs_review' then 'needs_review' else 'rejected' end,
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac
    where id = session_row.id;

    insert into moral_trade_private.account_security_events (
      profile_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      session_row.requested_profile_id,
      session_row.id,
      'verification_rejected',
      jsonb_build_object(
        'outcome', p_outcome,
        'duplicateCheckResult', p_duplicate_check_result
      )
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', case when p_outcome = 'needs_review' then 'needs_review' else 'rejected' end,
      'registrationGrantIssued', false,
      'recoveryRequired', false
    );
  end if;

  if jsonb_array_length(p_dedupe_tokens) < 1 then
    raise exception using errcode = '22023', message = 'person_verification_dedupe_token_required';
  end if;

  for dedupe_item in
    select value
    from jsonb_array_elements(p_dedupe_tokens)
    order by value ->> 'namespace', value ->> 'version', value ->> 'token'
  loop
    namespace_value := dedupe_item ->> 'namespace';
    version_value := coalesce((dedupe_item ->> 'version')::integer, 1);
    token_value := dedupe_item ->> 'token';

    if namespace_value not in (
         'provider_subject',
         'government_document',
         'biometric_duplicate_cluster',
         'manual_equivalent'
       )
       or version_value not between 1 and 1000
       or token_value !~ '^[0-9a-f]{64}$' then
      raise exception using errcode = '22023', message = 'person_verification_dedupe_token_invalid';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(namespace_value || ':' || version_value::text || ':' || token_value, 0)
    );
  end loop;

  select coalesce(array_agg(distinct key_row.identity_subject_id), '{}'::uuid[])
  into matched_subject_ids
  from jsonb_array_elements(p_dedupe_tokens) token_row
  join moral_trade_private.identity_dedupe_keys key_row
    on key_row.token_namespace = token_row ->> 'namespace'
   and key_row.token_version = coalesce((token_row ->> 'version')::integer, 1)
   and key_row.token_hmac = token_row ->> 'token'
   and key_row.status in ('active', 'tombstone');

  matched_subject_count := cardinality(matched_subject_ids);

  if matched_subject_count = 0 and session_row.purpose = 'recovery' then
    insert into moral_trade_private.identity_verification_events (
      verification_session_id,
      provider_name,
      provider_event_id_hmac,
      provider_session_reference_hmac,
      event_payload_hash,
      outcome,
      assurance_tier,
      age_class,
      duplicate_check_result,
      provider_verified_at,
      credential_expires_at,
      raw_data_deletion_due_at
    ) values (
      session_row.id,
      btrim(p_provider_name),
      p_provider_event_id_hmac,
      p_provider_session_reference_hmac,
      p_event_payload_hash,
      'needs_review',
      btrim(p_assurance_tier),
      p_age_class,
      'not_run',
      p_provider_verified_at,
      p_credential_expires_at,
      p_raw_data_deletion_due_at
    );

    update moral_trade_private.preaccount_verification_sessions
    set state = 'needs_review',
        duplicate_reason_code = 'recovery_identity_not_found',
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    insert into moral_trade_private.account_security_events (
      profile_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      session_row.requested_profile_id,
      session_row.id,
      'recovery_opened',
      jsonb_build_object('reasonCode', 'recovery_identity_not_found', 'accountDisclosed', false)
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'needs_review',
      'registrationGrantIssued', false,
      'recoveryRequired', true
    );
  end if;

  if matched_subject_count > 1 then
    update moral_trade_private.preaccount_verification_sessions
    set state = 'duplicate_recovery',
        duplicate_reason_code = 'dedupe_tokens_map_to_multiple_subjects',
        age_class = p_age_class
    where id = session_row.id;

    insert into moral_trade_private.identity_duplicate_cases (
      verification_session_id,
      subject_a_id,
      subject_b_id,
      requested_profile_id,
      reason_code,
      status
    ) values (
      session_row.id,
      matched_subject_ids[1],
      matched_subject_ids[2],
      session_row.requested_profile_id,
      'dedupe_tokens_map_to_multiple_subjects',
      'open'
    ) returning id into duplicate_case_id;

    insert into moral_trade_private.identity_verification_events (
      verification_session_id,
      provider_name,
      provider_event_id_hmac,
      provider_session_reference_hmac,
      event_payload_hash,
      outcome,
      assurance_tier,
      age_class,
      duplicate_check_result,
      provider_verified_at,
      credential_expires_at,
      raw_data_deletion_due_at
    ) values (
      session_row.id,
      btrim(p_provider_name),
      p_provider_event_id_hmac,
      p_provider_session_reference_hmac,
      p_event_payload_hash,
      p_outcome,
      btrim(p_assurance_tier),
      p_age_class,
      'confirmed_duplicate',
      p_provider_verified_at,
      p_credential_expires_at,
      p_raw_data_deletion_due_at
    );

    insert into moral_trade_private.account_security_events (
      profile_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      session_row.requested_profile_id,
      session_row.id,
      'duplicate_detected',
      jsonb_build_object('reasonCode', 'dedupe_tokens_map_to_multiple_subjects')
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'duplicate_recovery',
      'duplicateCaseId', duplicate_case_id,
      'registrationGrantIssued', false,
      'recoveryRequired', true
    );
  end if;

  if matched_subject_count = 1 then
    select * into subject_row
    from moral_trade_private.identity_subjects subject
    where subject.id = matched_subject_ids[1]
    for update;
  else
    insert into moral_trade_private.identity_subjects (
      state,
      verification_status,
      age_class,
      assurance_tier,
      duplicate_check_result,
      latest_provider_name,
      verified_at,
      expires_at
    ) values (
      'pending',
      'pending',
      p_age_class,
      btrim(p_assurance_tier),
      p_duplicate_check_result,
      btrim(p_provider_name),
      p_provider_verified_at,
      p_credential_expires_at
    ) returning * into subject_row;
  end if;

  for dedupe_item in
    select value
    from jsonb_array_elements(p_dedupe_tokens)
    order by value ->> 'namespace', value ->> 'version', value ->> 'token'
  loop
    namespace_value := dedupe_item ->> 'namespace';
    version_value := coalesce((dedupe_item ->> 'version')::integer, 1);
    token_value := dedupe_item ->> 'token';

    insert into moral_trade_private.identity_dedupe_keys (
      identity_subject_id,
      token_namespace,
      token_version,
      token_hmac,
      status,
      source_provider,
      last_seen_at
    ) values (
      subject_row.id,
      namespace_value,
      version_value,
      token_value,
      case when subject_row.state in ('closed', 'tombstoned') then 'tombstone' else 'active' end,
      btrim(p_provider_name),
      now_value
    )
    on conflict (token_namespace, token_version, token_hmac) do update
    set last_seen_at = excluded.last_seen_at,
        source_provider = excluded.source_provider
    where moral_trade_private.identity_dedupe_keys.identity_subject_id = excluded.identity_subject_id;

    if not found then
      raise exception using errcode = '23505', message = 'person_verification_dedupe_subject_conflict';
    end if;
  end loop;

  insert into moral_trade_private.identity_verification_events (
    identity_subject_id,
    verification_session_id,
    provider_name,
    provider_event_id_hmac,
    provider_session_reference_hmac,
    event_payload_hash,
    outcome,
    assurance_tier,
    age_class,
    duplicate_check_result,
    provider_verified_at,
    credential_expires_at,
    raw_data_deletion_due_at
  ) values (
    subject_row.id,
    session_row.id,
    btrim(p_provider_name),
    p_provider_event_id_hmac,
    p_provider_session_reference_hmac,
    p_event_payload_hash,
    p_outcome,
    btrim(p_assurance_tier),
    p_age_class,
    p_duplicate_check_result,
    p_provider_verified_at,
    p_credential_expires_at,
    p_raw_data_deletion_due_at
  );

  if p_age_class = 'under_13' then
    update moral_trade_private.identity_subjects
    set state = 'rejected',
        verification_status = 'rejected',
        age_class = p_age_class,
        assurance_tier = btrim(p_assurance_tier),
        duplicate_check_result = p_duplicate_check_result,
        latest_provider_name = btrim(p_provider_name),
        verified_at = p_provider_verified_at,
        expires_at = p_credential_expires_at
    where id = subject_row.id;

    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = 'rejected',
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'rejected',
      'registrationGrantIssued', false,
      'recoveryRequired', false
    );
  end if;

  if p_duplicate_check_result <> 'clear' then
    update moral_trade_private.identity_subjects
    set state = 'duplicate_review',
        verification_status = 'pending',
        age_class = p_age_class,
        assurance_tier = btrim(p_assurance_tier),
        duplicate_check_result = p_duplicate_check_result,
        latest_provider_name = btrim(p_provider_name),
        verified_at = p_provider_verified_at,
        expires_at = p_credential_expires_at
    where id = subject_row.id;

    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = 'duplicate_recovery',
        duplicate_reason_code = p_duplicate_check_result,
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    if session_row.requested_profile_id is not null then
      account_row := moral_trade_private.ensure_person_account_row(session_row.requested_profile_id);
      update moral_trade_private.person_accounts
      set account_status = 'duplicate_review',
          verification_status = 'pending'
      where profile_id = session_row.requested_profile_id;
    end if;

    insert into moral_trade_private.identity_duplicate_cases (
      verification_session_id,
      subject_a_id,
      requested_profile_id,
      existing_profile_id,
      reason_code,
      status
    ) values (
      session_row.id,
      subject_row.id,
      session_row.requested_profile_id,
      subject_row.canonical_profile_id,
      p_duplicate_check_result,
      'open'
    ) returning id into duplicate_case_id;

    insert into moral_trade_private.account_security_events (
      profile_id,
      identity_subject_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      session_row.requested_profile_id,
      subject_row.id,
      session_row.id,
      'duplicate_detected',
      jsonb_build_object('reasonCode', p_duplicate_check_result)
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'duplicate_recovery',
      'duplicateCaseId', duplicate_case_id,
      'registrationGrantIssued', false,
      'recoveryRequired', true
    );
  end if;

  update moral_trade_private.identity_subjects
  set state = case
        when state in ('closed', 'tombstoned') then state
        else 'verified'
      end,
      verification_status = 'verified',
      age_class = p_age_class,
      assurance_tier = btrim(p_assurance_tier),
      duplicate_check_result = 'clear',
      latest_provider_name = btrim(p_provider_name),
      verified_at = p_provider_verified_at,
      expires_at = p_credential_expires_at
  where id = subject_row.id
  returning * into subject_row;

  if session_row.purpose = 'recovery'
     and subject_row.canonical_profile_id is null then
    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = 'needs_review',
        duplicate_reason_code = 'recovery_subject_not_bound_to_account',
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    insert into moral_trade_private.account_security_events (
      identity_subject_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      subject_row.id,
      session_row.id,
      'recovery_opened',
      jsonb_build_object(
        'reasonCode', 'recovery_subject_not_bound_to_account',
        'accountDisclosed', false
      )
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'needs_review',
      'registrationGrantIssued', false,
      'recoveryRequired', true
    );
  end if;

  if session_row.requested_profile_id is not null then
    account_row := moral_trade_private.ensure_person_account_row(session_row.requested_profile_id);

    if subject_row.state in ('closed', 'tombstoned')
       or account_row.account_status = 'closed' then
      update moral_trade_private.preaccount_verification_sessions
      set identity_subject_id = subject_row.id,
          state = 'duplicate_recovery',
          duplicate_reason_code = 'closed_account_recovery_required',
          age_class = p_age_class,
          provider_session_reference_hmac = p_provider_session_reference_hmac,
          verified_at = p_provider_verified_at
      where id = session_row.id;

      insert into moral_trade_private.identity_duplicate_cases (
        verification_session_id,
        subject_a_id,
        requested_profile_id,
        existing_profile_id,
        reason_code,
        status
      ) values (
        session_row.id,
        subject_row.id,
        session_row.requested_profile_id,
        subject_row.canonical_profile_id,
        'closed_account_recovery_required',
        'recovery_required'
      ) returning id into duplicate_case_id;

      if subject_row.canonical_profile_id is not null then
        insert into moral_trade_private.account_recovery_cases (
          verification_session_id,
          identity_subject_id,
          canonical_profile_id,
          status
        ) values (
          session_row.id,
          subject_row.id,
          subject_row.canonical_profile_id,
          'identity_matched'
        ) returning id into recovery_id_value;
      end if;

      insert into moral_trade_private.account_security_events (
        profile_id,
        identity_subject_id,
        verification_session_id,
        event_type,
        public_safe_metadata
      ) values (
        session_row.requested_profile_id,
        subject_row.id,
        session_row.id,
        'recovery_opened',
        jsonb_build_object('reasonCode', 'closed_account_recovery_required')
      );

      return jsonb_build_object(
        'idempotent', false,
        'sessionId', session_row.id,
        'state', 'duplicate_recovery',
        'duplicateCaseId', duplicate_case_id,
        'recoveryCaseId', recovery_id_value,
        'registrationGrantIssued', false,
        'recoveryRequired', true
      );
    end if;

    if account_row.identity_subject_id is not null
       and account_row.identity_subject_id <> subject_row.id then
      update moral_trade_private.person_accounts
      set account_status = 'duplicate_review',
          verification_status = 'pending'
      where profile_id = session_row.requested_profile_id;

      update moral_trade_private.preaccount_verification_sessions
      set identity_subject_id = subject_row.id,
          state = 'duplicate_recovery',
          duplicate_reason_code = 'existing_account_identity_subject_conflict',
          age_class = p_age_class,
          provider_session_reference_hmac = p_provider_session_reference_hmac,
          verified_at = p_provider_verified_at
      where id = session_row.id;

      insert into moral_trade_private.identity_duplicate_cases (
        verification_session_id,
        subject_a_id,
        subject_b_id,
        requested_profile_id,
        existing_profile_id,
        reason_code,
        status
      ) values (
        session_row.id,
        account_row.identity_subject_id,
        subject_row.id,
        session_row.requested_profile_id,
        subject_row.canonical_profile_id,
        'existing_account_identity_subject_conflict',
        'open'
      ) returning id into duplicate_case_id;

      return jsonb_build_object(
        'idempotent', false,
        'sessionId', session_row.id,
        'state', 'duplicate_recovery',
        'duplicateCaseId', duplicate_case_id,
        'registrationGrantIssued', false,
        'recoveryRequired', true
      );
    end if;

    if subject_row.canonical_profile_id is not null
       and subject_row.canonical_profile_id <> session_row.requested_profile_id then
      update moral_trade_private.person_accounts
      set account_status = 'duplicate_review',
          verification_status = 'pending'
      where profile_id = session_row.requested_profile_id;

      update moral_trade_private.preaccount_verification_sessions
      set identity_subject_id = subject_row.id,
          state = 'duplicate_recovery',
          duplicate_reason_code = 'verified_human_already_has_canonical_account',
          age_class = p_age_class,
          provider_session_reference_hmac = p_provider_session_reference_hmac,
          verified_at = p_provider_verified_at
      where id = session_row.id;

      insert into moral_trade_private.identity_duplicate_cases (
        verification_session_id,
        subject_a_id,
        requested_profile_id,
        existing_profile_id,
        reason_code,
        status
      ) values (
        session_row.id,
        subject_row.id,
        session_row.requested_profile_id,
        subject_row.canonical_profile_id,
        'verified_human_already_has_canonical_account',
        'recovery_required'
      ) returning id into duplicate_case_id;

      insert into moral_trade_private.account_recovery_cases (
        verification_session_id,
        identity_subject_id,
        canonical_profile_id,
        status
      ) values (
        session_row.id,
        subject_row.id,
        subject_row.canonical_profile_id,
        'identity_matched'
      ) returning id into recovery_id_value;

      insert into moral_trade_private.account_security_events (
        profile_id,
        identity_subject_id,
        verification_session_id,
        event_type,
        public_safe_metadata
      ) values (
        session_row.requested_profile_id,
        subject_row.id,
        session_row.id,
        'duplicate_detected',
        jsonb_build_object('reasonCode', 'verified_human_already_has_canonical_account')
      );

      return jsonb_build_object(
        'idempotent', false,
        'sessionId', session_row.id,
        'state', 'duplicate_recovery',
        'duplicateCaseId', duplicate_case_id,
        'recoveryCaseId', recovery_id_value,
        'registrationGrantIssued', false,
        'recoveryRequired', true
      );
    end if;

    update moral_trade_private.identity_subjects
    set canonical_profile_id = session_row.requested_profile_id,
        state = 'verified'
    where id = subject_row.id;

    update moral_trade_private.person_accounts
    set identity_subject_id = subject_row.id,
        account_status = case when p_age_class = 'minor_13_17' then 'limited' else 'active' end,
        verification_status = 'verified',
        age_class = p_age_class,
        guardian_consent_status = case
          when p_age_class = 'minor_13_17' then 'pending'
          else 'not_required'
        end
    where profile_id = session_row.requested_profile_id;

    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = case when p_age_class = 'minor_13_17' then 'guardian_required' else 'verified' end,
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    perform moral_trade_private.sync_identity_verified_badge(session_row.requested_profile_id);

    insert into moral_trade_private.account_security_events (
      profile_id,
      identity_subject_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      session_row.requested_profile_id,
      subject_row.id,
      session_row.id,
      'verification_passed',
      jsonb_build_object(
        'ageClass', p_age_class,
        'assuranceTier', btrim(p_assurance_tier),
        'existingAccount', true
      )
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', case when p_age_class = 'minor_13_17' then 'guardian_required' else 'verified' end,
      'registrationGrantIssued', false,
      'existingAccountVerified', true,
      'guardianConsentRequired', p_age_class = 'minor_13_17',
      'recoveryRequired', false
    );
  end if;

  if subject_row.canonical_profile_id is not null
     or subject_row.state in ('closed', 'tombstoned') then
    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = 'duplicate_recovery',
        duplicate_reason_code = case
          when subject_row.state in ('closed', 'tombstoned') then 'closed_account_recovery_required'
          else 'verified_human_already_has_canonical_account'
        end,
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    insert into moral_trade_private.identity_duplicate_cases (
      verification_session_id,
      subject_a_id,
      existing_profile_id,
      reason_code,
      status
    ) values (
      session_row.id,
      subject_row.id,
      subject_row.canonical_profile_id,
      case
        when subject_row.state in ('closed', 'tombstoned') then 'closed_account_recovery_required'
        else 'verified_human_already_has_canonical_account'
      end,
      'recovery_required'
    ) returning id into duplicate_case_id;

    if subject_row.canonical_profile_id is not null then
      insert into moral_trade_private.account_recovery_cases (
        verification_session_id,
        identity_subject_id,
        canonical_profile_id,
        status
      ) values (
        session_row.id,
        subject_row.id,
        subject_row.canonical_profile_id,
        'identity_matched'
      ) returning id into recovery_id_value;
    end if;

    insert into moral_trade_private.account_security_events (
      identity_subject_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      subject_row.id,
      session_row.id,
      'recovery_opened',
      jsonb_build_object('reasonCode', 'canonical_account_exists')
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'duplicate_recovery',
      'duplicateCaseId', duplicate_case_id,
      'recoveryCaseId', recovery_id_value,
      'registrationGrantIssued', false,
      'recoveryRequired', true
    );
  end if;

  if session_row.purpose = 'registration' and p_age_class = 'minor_13_17' then
    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = 'guardian_required',
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    insert into moral_trade_private.account_security_events (
      identity_subject_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      subject_row.id,
      session_row.id,
      'verification_passed',
      jsonb_build_object(
        'ageClass', p_age_class,
        'assuranceTier', btrim(p_assurance_tier),
        'guardianConsentRequired', true
      )
    );

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'guardian_required',
      'registrationGrantIssued', false,
      'guardianConsentRequired', true,
      'recoveryRequired', false
    );
  end if;

  select registration_grant.id into existing_open_grant
  from moral_trade_private.person_registration_grants registration_grant
  where registration_grant.identity_subject_id = subject_row.id
    and registration_grant.state in ('issued', 'reserved')
  for update;

  if existing_open_grant is not null then
    update moral_trade_private.preaccount_verification_sessions
    set identity_subject_id = subject_row.id,
        state = 'duplicate_recovery',
        duplicate_reason_code = 'concurrent_registration_in_progress',
        age_class = p_age_class,
        provider_session_reference_hmac = p_provider_session_reference_hmac,
        verified_at = p_provider_verified_at
    where id = session_row.id;

    insert into moral_trade_private.identity_duplicate_cases (
      verification_session_id,
      subject_a_id,
      reason_code,
      status
    ) values (
      session_row.id,
      subject_row.id,
      'concurrent_registration_in_progress',
      'recovery_required'
    ) returning id into duplicate_case_id;

    return jsonb_build_object(
      'idempotent', false,
      'sessionId', session_row.id,
      'state', 'duplicate_recovery',
      'duplicateCaseId', duplicate_case_id,
      'registrationGrantIssued', false,
      'recoveryRequired', true
    );
  end if;

  if session_row.pending_registration_token_hash is null
     or p_registration_grant_expires_at is null
     or p_registration_grant_expires_at <= now_value
     or p_registration_grant_expires_at > now_value + interval '1 hour' then
    raise exception using errcode = '22023', message = 'person_registration_grant_invalid';
  end if;

  insert into moral_trade_private.person_registration_grants (
    verification_session_id,
    identity_subject_id,
    token_hash,
    state,
    expires_at
  ) values (
    session_row.id,
    subject_row.id,
    session_row.pending_registration_token_hash,
    'issued',
    p_registration_grant_expires_at
  ) returning id into grant_id_value;

  update moral_trade_private.preaccount_verification_sessions
  set identity_subject_id = subject_row.id,
      state = 'verified',
      age_class = p_age_class,
      provider_session_reference_hmac = p_provider_session_reference_hmac,
      verified_at = p_provider_verified_at
  where id = session_row.id;

  insert into moral_trade_private.account_security_events (
    identity_subject_id,
    verification_session_id,
    event_type,
    public_safe_metadata
  ) values
    (
      subject_row.id,
      session_row.id,
      'verification_passed',
      jsonb_build_object(
        'ageClass', p_age_class,
        'assuranceTier', btrim(p_assurance_tier),
        'existingAccount', false
      )
    ),
    (
      subject_row.id,
      session_row.id,
      'registration_grant_issued',
      jsonb_build_object('grantExpiresAt', p_registration_grant_expires_at)
    );

  return jsonb_build_object(
    'idempotent', false,
    'sessionId', session_row.id,
    'state', 'verified',
    'grantId', grant_id_value,
    'registrationGrantIssued', true,
    'recoveryRequired', false
  );
end;
$function$;

create or replace function public.bind_person_registration_grant_email_v1(
  p_grant_id uuid,
  p_token_hash text,
  p_email_binding_hmac text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  grant_row moral_trade_private.person_registration_grants%rowtype;
begin
  select * into grant_row
  from moral_trade_private.person_registration_grants registration_grant
  where registration_grant.id = p_grant_id
  for update;

  if not found
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_email_binding_hmac !~ '^[0-9a-f]{64}$'
     or grant_row.token_hash <> p_token_hash
     or grant_row.state <> 'issued'
     or grant_row.expires_at <= timezone('utc', now()) then
    raise exception using errcode = '42501', message = 'person_registration_grant_unavailable';
  end if;

  if grant_row.email_binding_hmac is not null
     and grant_row.email_binding_hmac <> p_email_binding_hmac then
    raise exception using errcode = '42501', message = 'person_registration_grant_email_mismatch';
  end if;

  update moral_trade_private.person_registration_grants
  set email_binding_hmac = p_email_binding_hmac
  where id = grant_row.id;

  return jsonb_build_object(
    'grantId', grant_row.id,
    'state', 'issued',
    'expiresAt', grant_row.expires_at
  );
end;
$function$;

create or replace function public.one_person_before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, moral_trade_private, extensions
as $function$
declare
  gate_row moral_trade_private.person_account_release_gates%rowtype;
  grant_row moral_trade_private.person_registration_grants%rowtype;
  grant_id_value uuid;
  raw_token text;
  token_hash_value text;
  email_value text;
  email_binding_value text;
  proposed_user_id uuid;
begin
  select * into gate_row
  from moral_trade_private.person_account_release_gates gate
  where gate.gate_key = 'one_person_account_v1';

  if not coalesce(gate_row.registration_enforcement_enabled, false) then
    return '{}'::jsonb;
  end if;

  if coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Complete identity verification before creating a Moral Trade account.'
      )
    );
  end if;

  begin
    grant_id_value := (event -> 'user' -> 'user_metadata' ->> 'one_person_registration_grant_id')::uuid;
    proposed_user_id := (event -> 'user' ->> 'id')::uuid;
  exception when others then
    grant_id_value := null;
    proposed_user_id := null;
  end;

  raw_token := coalesce(
    event -> 'user' -> 'user_metadata' ->> 'one_person_registration_grant_token',
    ''
  );
  email_value := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));

  if grant_id_value is null
     or proposed_user_id is null
     or length(raw_token) < 32
     or email_value = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Complete identity verification before creating a Moral Trade account. If you already have an account, use recovery.'
      )
    );
  end if;

  token_hash_value := encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex');
  email_binding_value := encode(
    extensions.hmac(convert_to(email_value, 'UTF8'), convert_to(raw_token, 'UTF8'), 'sha256'),
    'hex'
  );

  select * into grant_row
  from moral_trade_private.person_registration_grants registration_grant
  where registration_grant.id = grant_id_value
  for update;

  if not found
     or grant_row.token_hash <> token_hash_value
     or grant_row.email_binding_hmac is distinct from email_binding_value
     or grant_row.state <> 'issued'
     or grant_row.expires_at <= timezone('utc', now())
     or grant_row.proposed_auth_user_id is not null
     or exists (
       select 1
       from moral_trade_private.identity_subjects subject
       where subject.id = grant_row.identity_subject_id
         and subject.canonical_profile_id is not null
     ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This identity verification can no longer create an account. Use account recovery or restart verification.'
      )
    );
  end if;

  update moral_trade_private.person_registration_grants
  set state = 'reserved',
      proposed_auth_user_id = proposed_user_id,
      reserved_at = timezone('utc', now())
  where id = grant_row.id;

  insert into moral_trade_private.account_security_events (
    identity_subject_id,
    verification_session_id,
    event_type,
    public_safe_metadata
  ) values (
    grant_row.identity_subject_id,
    grant_row.verification_session_id,
    'registration_grant_reserved',
    jsonb_build_object('provider', event -> 'user' -> 'app_metadata' ->> 'provider')
  );

  return '{}'::jsonb;
end;
$function$;

-- Supabase Auth executes this hook role with only the minimum direct table access.
grant usage on schema moral_trade_private to supabase_auth_admin;
grant select on table moral_trade_private.person_account_release_gates to supabase_auth_admin;
grant select on table moral_trade_private.identity_subjects to supabase_auth_admin;
grant select, update on table moral_trade_private.person_registration_grants to supabase_auth_admin;
grant insert on table moral_trade_private.account_security_events to supabase_auth_admin;

drop policy if exists person_account_release_gates_auth_hook_select
  on moral_trade_private.person_account_release_gates;
create policy person_account_release_gates_auth_hook_select
  on moral_trade_private.person_account_release_gates
  for select
  to supabase_auth_admin
  using (true);

drop policy if exists identity_subjects_auth_hook_select
  on moral_trade_private.identity_subjects;
create policy identity_subjects_auth_hook_select
  on moral_trade_private.identity_subjects
  for select
  to supabase_auth_admin
  using (true);

drop policy if exists person_registration_grants_auth_hook_select
  on moral_trade_private.person_registration_grants;
create policy person_registration_grants_auth_hook_select
  on moral_trade_private.person_registration_grants
  for select
  to supabase_auth_admin
  using (true);

drop policy if exists person_registration_grants_auth_hook_update
  on moral_trade_private.person_registration_grants;
create policy person_registration_grants_auth_hook_update
  on moral_trade_private.person_registration_grants
  for update
  to supabase_auth_admin
  using (true)
  with check (true);

drop policy if exists account_security_events_auth_hook_insert
  on moral_trade_private.account_security_events;
create policy account_security_events_auth_hook_insert
  on moral_trade_private.account_security_events
  for insert
  to supabase_auth_admin
  with check (true);

grant execute on function public.one_person_before_user_created_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.one_person_before_user_created_hook(jsonb)
  from public, anon, authenticated, service_role;

create or replace function moral_trade_private.finalize_person_account_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  gate_row moral_trade_private.person_account_release_gates%rowtype;
  grant_row moral_trade_private.person_registration_grants%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  grant_id_value uuid;
  raw_token text;
  token_hash_value text;
  account_kind_value text;
  guardian_consent_row moral_trade_private.preaccount_guardian_consents%rowtype;
begin
  select * into gate_row
  from moral_trade_private.person_account_release_gates gate
  where gate.gate_key = 'one_person_account_v1';

  begin
    grant_id_value := (new.raw_user_meta_data ->> 'one_person_registration_grant_id')::uuid;
  exception when others then
    grant_id_value := null;
  end;
  raw_token := coalesce(new.raw_user_meta_data ->> 'one_person_registration_grant_token', '');

  if grant_id_value is null or length(raw_token) < 32 then
    if coalesce(gate_row.registration_enforcement_enabled, false) then
      raise exception using
        errcode = '42501',
        message = 'person_registration_identity_verification_required';
    end if;

    account_kind_value := moral_trade_private.person_account_kind_for_user(new.id);
    insert into moral_trade_private.person_accounts (
      profile_id,
      account_kind,
      account_status,
      verification_status,
      age_class,
      guardian_consent_status
    ) values (
      new.id,
      coalesce(account_kind_value, 'human'),
      'active',
      case when coalesce(account_kind_value, 'human') = 'human'
        then 'legacy_unverified'
        else 'rejected'
      end,
      'unknown',
      'not_required'
    )
    on conflict (profile_id) do nothing;

    return new;
  end if;

  token_hash_value := encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex');

  select * into grant_row
  from moral_trade_private.person_registration_grants registration_grant
  where registration_grant.id = grant_id_value
  for update;

  if not found
     or grant_row.token_hash <> token_hash_value
     or grant_row.state not in ('issued', 'reserved')
     or grant_row.expires_at <= timezone('utc', now())
     or (
       grant_row.proposed_auth_user_id is not null
       and grant_row.proposed_auth_user_id <> new.id
     ) then
    raise exception using errcode = '42501', message = 'person_registration_grant_invalid';
  end if;

  select * into subject_row
  from moral_trade_private.identity_subjects subject
  where subject.id = grant_row.identity_subject_id
  for update;

  if not found
     or subject_row.verification_status <> 'verified'
     or subject_row.duplicate_check_result <> 'clear'
     or subject_row.age_class not in ('adult', 'minor_13_17')
     or subject_row.canonical_profile_id is not null then
    raise exception using errcode = '42501', message = 'person_registration_identity_unavailable';
  end if;

  if subject_row.age_class = 'minor_13_17' then
    select * into guardian_consent_row
    from moral_trade_private.preaccount_guardian_consents consent
    where consent.verification_session_id = grant_row.verification_session_id
      and consent.status = 'active'
      and consent.effective_at <= timezone('utc', now())
      and (consent.expires_at is null or consent.expires_at > timezone('utc', now()));

    if not found then
      raise exception using errcode = '42501', message = 'person_registration_guardian_consent_required';
    end if;
  end if;

  update moral_trade_private.identity_subjects
  set canonical_profile_id = new.id,
      state = 'verified'
  where id = subject_row.id;

  insert into moral_trade_private.person_accounts (
    profile_id,
    identity_subject_id,
    account_kind,
    account_status,
    verification_status,
    age_class,
    guardian_consent_status
  ) values (
    new.id,
    subject_row.id,
    'human',
    case when subject_row.age_class = 'minor_13_17' then 'limited' else 'active' end,
    'verified',
    subject_row.age_class,
    case when subject_row.age_class = 'minor_13_17' then 'active' else 'not_required' end
  )
  on conflict (profile_id) do update
  set identity_subject_id = excluded.identity_subject_id,
      account_kind = 'human',
      account_status = excluded.account_status,
      verification_status = 'verified',
      age_class = excluded.age_class,
      guardian_consent_status = excluded.guardian_consent_status;

  if subject_row.age_class = 'minor_13_17' then
    insert into moral_trade_private.guardian_relationships (
      minor_profile_id,
      guardian_profile_id,
      status,
      authority_reference_hash,
      consent_scope,
      verified_by,
      effective_at,
      expires_at
    ) values (
      new.id,
      guardian_consent_row.guardian_profile_id,
      'active',
      guardian_consent_row.authority_reference_hash,
      guardian_consent_row.consent_scope,
      guardian_consent_row.verified_by,
      guardian_consent_row.effective_at,
      guardian_consent_row.expires_at
    )
    on conflict (minor_profile_id, guardian_profile_id) do update
    set status = 'active',
        authority_reference_hash = excluded.authority_reference_hash,
        consent_scope = excluded.consent_scope,
        verified_by = excluded.verified_by,
        effective_at = excluded.effective_at,
        expires_at = excluded.expires_at,
        revoked_at = null;
  end if;

  update moral_trade_private.person_registration_grants
  set state = 'consumed',
      proposed_auth_user_id = new.id,
      reserved_at = coalesce(reserved_at, timezone('utc', now())),
      consumed_at = timezone('utc', now())
  where id = grant_row.id;

  update moral_trade_private.preaccount_verification_sessions
  set state = 'consumed',
      consumed_at = timezone('utc', now())
  where id = grant_row.verification_session_id;

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    verification_session_id,
    event_type,
    public_safe_metadata
  ) values (
    new.id,
    subject_row.id,
    grant_row.verification_session_id,
    'registration_completed',
    jsonb_build_object(
      'ageClass', subject_row.age_class,
      'policyVersion', gate_row.policy_version
    )
  );

  -- The one-use secret must not remain in JWT-visible user metadata.
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    - 'one_person_registration_grant_id'
    - 'one_person_registration_grant_token'
  where id = new.id;

  perform moral_trade_private.sync_identity_verified_badge(new.id);
  return new;
end;
$function$;

revoke all on function moral_trade_private.finalize_person_account_registration()
  from public, anon, authenticated, service_role;

drop trigger if exists finalize_person_account_registration on auth.users;
create trigger finalize_person_account_registration
after insert on auth.users
for each row execute function moral_trade_private.finalize_person_account_registration();

-- Guardian consent is recorded only by a service-role workflow after a verified adult
-- guardian and their authority have been reviewed. The function never exposes the
-- minor's private verification data to the guardian.
create or replace function public.record_preaccount_guardian_consent_v1(
  p_verification_session_id uuid,
  p_guardian_profile_id uuid,
  p_authority_reference_hash text,
  p_consent_scope text[],
  p_verified_by uuid,
  p_expires_at timestamptz,
  p_registration_grant_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  session_row moral_trade_private.preaccount_verification_sessions%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  guardian_account moral_trade_private.person_accounts%rowtype;
  guardian_subject moral_trade_private.identity_subjects%rowtype;
  grant_row moral_trade_private.person_registration_grants%rowtype;
  normalized_scope text[];
  now_value timestamptz := timezone('utc', now());
begin
  select coalesce(array_agg(distinct scope_item order by scope_item), '{}'::text[])
  into normalized_scope
  from unnest(coalesce(p_consent_scope, '{}'::text[])) scope_item
  where scope_item in (
    'basic_participation',
    'security_notifications',
    'consent_revocation'
  );

  if p_verification_session_id is null
     or p_guardian_profile_id is null
     or p_verified_by is null
     or p_authority_reference_hash !~ '^[0-9a-f]{64}$'
     or not ('basic_participation' = any(normalized_scope))
     or cardinality(normalized_scope) <> cardinality(coalesce(p_consent_scope, '{}'::text[]))
     or p_expires_at is null
     or p_expires_at <= now_value
     or p_expires_at > now_value + interval '2 years'
     or p_registration_grant_expires_at is null
     or p_registration_grant_expires_at <= now_value
     or p_registration_grant_expires_at > now_value + interval '1 hour' then
    raise exception using errcode = '22023', message = 'person_guardian_consent_invalid';
  end if;

  select * into session_row
  from moral_trade_private.preaccount_verification_sessions session
  where session.id = p_verification_session_id
  for update;

  if not found
     or session_row.purpose <> 'registration'
     or session_row.state not in ('guardian_required', 'verified')
     or session_row.expires_at <= now_value
     or session_row.identity_subject_id is null
     or session_row.pending_registration_token_hash is null then
    raise exception using errcode = '55000', message = 'person_guardian_consent_session_unavailable';
  end if;

  select * into subject_row
  from moral_trade_private.identity_subjects subject
  where subject.id = session_row.identity_subject_id
  for update;

  if not found
     or subject_row.verification_status <> 'verified'
     or subject_row.duplicate_check_result <> 'clear'
     or subject_row.age_class <> 'minor_13_17'
     or subject_row.canonical_profile_id is not null then
    raise exception using errcode = '42501', message = 'person_guardian_consent_minor_unavailable';
  end if;

  guardian_account := moral_trade_private.ensure_person_account_row(p_guardian_profile_id);
  if guardian_account.account_kind <> 'human'
     or guardian_account.account_status in ('closed', 'banned', 'duplicate_review')
     or guardian_account.verification_status <> 'verified'
     or guardian_account.age_class <> 'adult'
     or guardian_account.identity_subject_id is null then
    raise exception using errcode = '42501', message = 'person_guardian_consent_verified_adult_required';
  end if;

  select * into guardian_subject
  from moral_trade_private.identity_subjects subject
  where subject.id = guardian_account.identity_subject_id;

  if not found
     or guardian_subject.verification_status <> 'verified'
     or guardian_subject.duplicate_check_result <> 'clear'
     or guardian_subject.state <> 'verified'
     or (guardian_subject.expires_at is not null and guardian_subject.expires_at <= now_value) then
    raise exception using errcode = '42501', message = 'person_guardian_consent_verified_adult_required';
  end if;

  insert into moral_trade_private.preaccount_guardian_consents (
    verification_session_id,
    guardian_profile_id,
    authority_reference_hash,
    consent_scope,
    status,
    verified_by,
    effective_at,
    expires_at,
    revoked_at
  ) values (
    session_row.id,
    p_guardian_profile_id,
    p_authority_reference_hash,
    normalized_scope,
    'active',
    p_verified_by,
    now_value,
    p_expires_at,
    null
  )
  on conflict (verification_session_id) do update
  set guardian_profile_id = excluded.guardian_profile_id,
      authority_reference_hash = excluded.authority_reference_hash,
      consent_scope = excluded.consent_scope,
      status = 'active',
      verified_by = excluded.verified_by,
      effective_at = excluded.effective_at,
      expires_at = excluded.expires_at,
      revoked_at = null;

  select * into grant_row
  from moral_trade_private.person_registration_grants registration_grant
  where registration_grant.verification_session_id = session_row.id
  for update;

  if not found then
    insert into moral_trade_private.person_registration_grants (
      verification_session_id,
      identity_subject_id,
      token_hash,
      state,
      expires_at
    ) values (
      session_row.id,
      subject_row.id,
      session_row.pending_registration_token_hash,
      'issued',
      p_registration_grant_expires_at
    ) returning * into grant_row;
  elsif grant_row.state = 'issued' and grant_row.expires_at > now_value then
    null;
  else
    raise exception using errcode = '55000', message = 'person_guardian_consent_registration_grant_unavailable';
  end if;

  update moral_trade_private.preaccount_verification_sessions
  set state = 'verified'
  where id = session_row.id;

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    verification_session_id,
    event_type,
    public_safe_metadata
  ) values
    (
      p_guardian_profile_id,
      subject_row.id,
      session_row.id,
      'guardian_consent_recorded',
      jsonb_build_object('scope', normalized_scope, 'expiresAt', p_expires_at)
    ),
    (
      null,
      subject_row.id,
      session_row.id,
      'registration_grant_issued',
      jsonb_build_object('grantExpiresAt', grant_row.expires_at, 'guardianConsent', true)
    );

  return jsonb_build_object(
    'sessionId', session_row.id,
    'state', 'verified',
    'guardianConsentStatus', 'active',
    'registrationGrantIssued', true,
    'grantId', grant_row.id,
    'grantExpiresAt', grant_row.expires_at
  );
end;
$function$;

create or replace function public.record_person_guardian_relationship_v1(
  p_minor_profile_id uuid,
  p_guardian_profile_id uuid,
  p_authority_reference_hash text,
  p_consent_scope text[],
  p_verified_by uuid,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  minor_account moral_trade_private.person_accounts%rowtype;
  guardian_account moral_trade_private.person_accounts%rowtype;
  guardian_subject moral_trade_private.identity_subjects%rowtype;
  normalized_scope text[];
  now_value timestamptz := timezone('utc', now());
begin
  select coalesce(array_agg(distinct scope_item order by scope_item), '{}'::text[])
  into normalized_scope
  from unnest(coalesce(p_consent_scope, '{}'::text[])) scope_item
  where scope_item in (
    'basic_participation',
    'security_notifications',
    'consent_revocation'
  );

  if p_minor_profile_id is null
     or p_guardian_profile_id is null
     or p_minor_profile_id = p_guardian_profile_id
     or p_verified_by is null
     or p_authority_reference_hash !~ '^[0-9a-f]{64}$'
     or not ('basic_participation' = any(normalized_scope))
     or cardinality(normalized_scope) <> cardinality(coalesce(p_consent_scope, '{}'::text[]))
     or p_expires_at is null
     or p_expires_at <= now_value
     or p_expires_at > now_value + interval '2 years' then
    raise exception using errcode = '22023', message = 'person_guardian_relationship_invalid';
  end if;

  select * into minor_account
  from moral_trade_private.person_accounts account
  where account.profile_id = p_minor_profile_id
  for update;
  select * into guardian_account
  from moral_trade_private.person_accounts account
  where account.profile_id = p_guardian_profile_id
  for update;

  if minor_account.profile_id is null
     or minor_account.account_kind <> 'human'
     or minor_account.verification_status <> 'verified'
     or minor_account.age_class <> 'minor_13_17'
     or minor_account.account_status in ('closed', 'banned', 'duplicate_review') then
    raise exception using errcode = '42501', message = 'person_guardian_relationship_minor_unavailable';
  end if;

  if guardian_account.profile_id is null
     or guardian_account.account_kind <> 'human'
     or guardian_account.verification_status <> 'verified'
     or guardian_account.age_class <> 'adult'
     or guardian_account.account_status in ('closed', 'banned', 'duplicate_review')
     or guardian_account.identity_subject_id is null then
    raise exception using errcode = '42501', message = 'person_guardian_relationship_verified_adult_required';
  end if;

  select * into guardian_subject
  from moral_trade_private.identity_subjects subject
  where subject.id = guardian_account.identity_subject_id;
  if not found
     or guardian_subject.verification_status <> 'verified'
     or guardian_subject.duplicate_check_result <> 'clear'
     or (guardian_subject.expires_at is not null and guardian_subject.expires_at <= now_value) then
    raise exception using errcode = '42501', message = 'person_guardian_relationship_verified_adult_required';
  end if;

  insert into moral_trade_private.guardian_relationships (
    minor_profile_id,
    guardian_profile_id,
    status,
    authority_reference_hash,
    consent_scope,
    verified_by,
    effective_at,
    expires_at,
    revoked_at
  ) values (
    p_minor_profile_id,
    p_guardian_profile_id,
    'active',
    p_authority_reference_hash,
    normalized_scope,
    p_verified_by,
    now_value,
    p_expires_at,
    null
  )
  on conflict (minor_profile_id, guardian_profile_id) do update
  set status = 'active',
      authority_reference_hash = excluded.authority_reference_hash,
      consent_scope = excluded.consent_scope,
      verified_by = excluded.verified_by,
      effective_at = excluded.effective_at,
      expires_at = excluded.expires_at,
      revoked_at = null;

  update moral_trade_private.person_accounts
  set account_status = 'limited',
      guardian_consent_status = 'active'
  where profile_id = p_minor_profile_id;

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    event_type,
    public_safe_metadata
  ) values (
    p_minor_profile_id,
    minor_account.identity_subject_id,
    'guardian_consent_changed',
    jsonb_build_object(
      'status', 'active',
      'guardianProfileId', p_guardian_profile_id,
      'scope', normalized_scope,
      'expiresAt', p_expires_at
    )
  );

  return jsonb_build_object(
    'minorProfileId', p_minor_profile_id,
    'guardianProfileId', p_guardian_profile_id,
    'status', 'active',
    'expiresAt', p_expires_at
  );
end;
$function$;

create or replace function public.revoke_person_guardian_relationship_v1(
  p_minor_profile_id uuid,
  p_guardian_profile_id uuid,
  p_revoked_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  relationship_count integer;
  now_value timestamptz := timezone('utc', now());
begin
  if p_minor_profile_id is null or p_guardian_profile_id is null or p_revoked_by is null then
    raise exception using errcode = '22023', message = 'person_guardian_revocation_invalid';
  end if;

  update moral_trade_private.guardian_relationships
  set status = 'revoked',
      revoked_at = now_value
  where minor_profile_id = p_minor_profile_id
    and guardian_profile_id = p_guardian_profile_id
    and status = 'active';
  get diagnostics relationship_count = row_count;

  if relationship_count = 0 then
    raise exception using errcode = '55000', message = 'person_guardian_relationship_not_active';
  end if;

  update moral_trade_private.person_accounts account
  set guardian_consent_status = case
        when exists (
          select 1
          from moral_trade_private.guardian_relationships relationship
          where relationship.minor_profile_id = account.profile_id
            and relationship.status = 'active'
            and relationship.effective_at <= now_value
            and (relationship.expires_at is null or relationship.expires_at > now_value)
        ) then 'active'
        else 'revoked'
      end
  where account.profile_id = p_minor_profile_id;

  insert into moral_trade_private.account_security_events (
    profile_id,
    event_type,
    public_safe_metadata
  ) values (
    p_minor_profile_id,
    'guardian_consent_changed',
    jsonb_build_object(
      'status', 'revoked',
      'guardianProfileId', p_guardian_profile_id,
      'revokedBy', p_revoked_by
    )
  );

  return jsonb_build_object(
    'minorProfileId', p_minor_profile_id,
    'guardianProfileId', p_guardian_profile_id,
    'status', 'revoked'
  );
end;
$function$;

create or replace function public.confirm_person_provider_data_deletion_v1(
  p_verification_event_id uuid,
  p_confirmed_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  event_row moral_trade_private.identity_verification_events%rowtype;
  confirmed_at_value timestamptz := timezone('utc', now());
begin
  select * into event_row
  from moral_trade_private.identity_verification_events event
  where event.id = p_verification_event_id
  for update;

  if not found
     or p_confirmed_by is null
     or event_row.raw_data_deletion_due_at is null then
    raise exception using errcode = '22023', message = 'person_provider_deletion_confirmation_invalid';
  end if;

  if event_row.raw_data_deletion_confirmed_at is null then
    perform set_config('moral_trade.person_identity_internal_write', 'on', true);
    update moral_trade_private.identity_verification_events
    set raw_data_deletion_confirmed_at = confirmed_at_value
    where id = event_row.id;

    insert into moral_trade_private.account_security_events (
      identity_subject_id,
      verification_session_id,
      event_type,
      public_safe_metadata
    ) values (
      event_row.identity_subject_id,
      event_row.verification_session_id,
      'raw_provider_data_deletion_confirmed',
      jsonb_build_object(
        'providerName', event_row.provider_name,
        'confirmedAt', confirmed_at_value,
        'confirmedBy', p_confirmed_by
      )
    );
  else
    confirmed_at_value := event_row.raw_data_deletion_confirmed_at;
  end if;

  return jsonb_build_object(
    'verificationEventId', event_row.id,
    'confirmedAt', confirmed_at_value,
    'overdue', confirmed_at_value > event_row.raw_data_deletion_due_at
  );
end;
$function$;

create or replace function public.complete_person_recovery_v1(
  p_recovery_case_id uuid,
  p_reviewed_by uuid,
  p_channel_reestablished boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recovery_row moral_trade_private.account_recovery_cases%rowtype;
  account_row moral_trade_private.person_accounts%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  ordinary_until timestamptz := timezone('utc', now()) + interval '72 hours';
  high_risk_until timestamptz := timezone('utc', now()) + interval '7 days';
  now_value timestamptz := timezone('utc', now());
begin
  select * into recovery_row
  from moral_trade_private.account_recovery_cases recovery
  where recovery.id = p_recovery_case_id
  for update;

  if not found
     or p_reviewed_by is null
     or not coalesce(p_channel_reestablished, false)
     or recovery_row.status not in (
       'identity_matched', 'channel_confirmation_pending', 'operator_review', 'approved'
     ) then
    raise exception using errcode = '42501', message = 'person_recovery_completion_unavailable';
  end if;

  select * into account_row
  from moral_trade_private.person_accounts account
  where account.profile_id = recovery_row.canonical_profile_id
  for update;
  select * into subject_row
  from moral_trade_private.identity_subjects subject
  where subject.id = recovery_row.identity_subject_id
  for update;

  if account_row.profile_id is null
     or account_row.identity_subject_id <> subject_row.id
     or account_row.account_kind <> 'human'
     or account_row.account_status = 'banned'
     or subject_row.verification_status <> 'verified'
     or subject_row.duplicate_check_result <> 'clear' then
    raise exception using errcode = '42501', message = 'person_recovery_canonical_account_unavailable';
  end if;

  delete from auth.sessions where user_id = recovery_row.canonical_profile_id;
  delete from auth.refresh_tokens where user_id = recovery_row.canonical_profile_id::text;
  update auth.users
  set banned_until = null,
      updated_at = now_value
  where id = recovery_row.canonical_profile_id;

  update moral_trade_private.person_accounts
  set account_status = 'recovery_cooldown',
      verification_status = 'verified',
      ordinary_cooldown_until = ordinary_until,
      high_risk_cooldown_until = high_risk_until,
      closed_at = null
  where profile_id = recovery_row.canonical_profile_id;

  update moral_trade_private.identity_subjects
  set state = 'verified',
      closed_at = null
  where id = subject_row.id;

  update moral_trade_private.identity_dedupe_keys
  set status = 'active',
      last_seen_at = now_value
  where identity_subject_id = subject_row.id;

  update moral_trade_private.account_recovery_cases
  set status = 'completed',
      ordinary_cooldown_until = ordinary_until,
      high_risk_cooldown_until = high_risk_until,
      reviewed_by = p_reviewed_by,
      resolved_at = now_value
  where id = recovery_row.id;

  insert into moral_trade_private.account_cooldowns (
    profile_id,
    scope,
    reason_code,
    starts_at,
    ends_at,
    created_by
  ) values
    (
      recovery_row.canonical_profile_id,
      'ordinary',
      'identity_recovery',
      now_value,
      ordinary_until,
      p_reviewed_by
    ),
    (
      recovery_row.canonical_profile_id,
      'high_risk',
      'identity_recovery',
      now_value,
      high_risk_until,
      p_reviewed_by
    );

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    verification_session_id,
    event_type,
    public_safe_metadata
  ) values
    (
      recovery_row.canonical_profile_id,
      subject_row.id,
      recovery_row.verification_session_id,
      'recovery_approved',
      jsonb_build_object(
        'ordinaryCooldownUntil', ordinary_until,
        'highRiskCooldownUntil', high_risk_until,
        'sessionsRevoked', true
      )
    ),
    (
      recovery_row.canonical_profile_id,
      subject_row.id,
      recovery_row.verification_session_id,
      'account_reopened',
      jsonb_build_object('reviewedBy', p_reviewed_by)
    ),
    (
      recovery_row.canonical_profile_id,
      subject_row.id,
      recovery_row.verification_session_id,
      'recovery_completed',
      jsonb_build_object('channelReestablished', true)
    );

  perform moral_trade_private.sync_identity_verified_badge(recovery_row.canonical_profile_id);

  return jsonb_build_object(
    'recoveryCaseId', recovery_row.id,
    'status', 'completed',
    'ordinaryCooldownUntil', ordinary_until,
    'highRiskCooldownUntil', high_risk_until,
    'sessionsRevoked', true,
    'accountDisclosed', false
  );
end;
$function$;

create or replace function public.analyze_person_account_merge_v1(
  p_canonical_profile_id uuid,
  p_duplicate_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  reference_row record;
  canonical_created_at timestamptz;
  duplicate_created_at timestamptz;
  canonical_count bigint;
  duplicate_count bigint;
  inventory jsonb := '[]'::jsonb;
  blocking_items jsonb := '[]'::jsonb;
  existing_alias uuid;
begin
  if p_canonical_profile_id is null
     or p_duplicate_profile_id is null
     or p_canonical_profile_id = p_duplicate_profile_id then
    raise exception using errcode = '22023', message = 'person_merge_analysis_invalid';
  end if;

  select created_at into canonical_created_at from auth.users where id = p_canonical_profile_id;
  select created_at into duplicate_created_at from auth.users where id = p_duplicate_profile_id;
  if canonical_created_at is null or duplicate_created_at is null then
    raise exception using errcode = 'P0002', message = 'person_merge_analysis_account_not_found';
  end if;

  select alias.canonical_profile_id into existing_alias
  from moral_trade_private.person_account_aliases alias
  where alias.alias_profile_id = p_duplicate_profile_id;

  for reference_row in
    select
      namespace.nspname as table_schema,
      relation.relname as table_name,
      attribute.attname as column_name,
      constraint_row.confdeltype as delete_rule_code
    from pg_catalog.pg_constraint constraint_row
    join pg_catalog.pg_class relation on relation.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_catalog.pg_attribute attribute
      on attribute.attrelid = constraint_row.conrelid
     and attribute.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.profiles'::regclass
      and cardinality(constraint_row.conkey) = 1
      and namespace.nspname = 'public'
    order by relation.relname, attribute.attname
  loop
    execute format(
      'select count(*) filter (where %1$I = $1), count(*) filter (where %1$I = $2) from %2$I.%3$I',
      reference_row.column_name,
      reference_row.table_schema,
      reference_row.table_name
    ) into canonical_count, duplicate_count
    using p_canonical_profile_id, p_duplicate_profile_id;

    if canonical_count > 0 or duplicate_count > 0 then
      inventory := inventory || jsonb_build_array(jsonb_build_object(
        'table', reference_row.table_name,
        'column', reference_row.column_name,
        'canonicalRows', canonical_count,
        'duplicateRows', duplicate_count,
        'deleteRule', case reference_row.delete_rule_code
          when 'a' then 'NO ACTION'
          when 'r' then 'RESTRICT'
          when 'c' then 'CASCADE'
          when 'n' then 'SET NULL'
          when 'd' then 'SET DEFAULT'
          else 'UNKNOWN'
        end
      ));
    end if;

    if canonical_count > 0 and duplicate_count > 0 and reference_row.table_name in (
      'profile_payment_accounts',
      'conditional_payment_customers',
      'institutional_memberships',
      'institutional_authority_grants',
      'trade_review_role_grants'
    ) then
      blocking_items := blocking_items || jsonb_build_array(jsonb_build_object(
        'code', 'dual_sensitive_ownership',
        'table', reference_row.table_name,
        'column', reference_row.column_name
      ));
    end if;
  end loop;

  if existing_alias is not null and existing_alias <> p_canonical_profile_id then
    blocking_items := blocking_items || jsonb_build_array(jsonb_build_object(
      'code', 'duplicate_already_aliases_another_account'
    ));
  end if;

  return jsonb_build_object(
    'canonicalProfileId', p_canonical_profile_id,
    'duplicateProfileId', p_duplicate_profile_id,
    'canonicalCreatedAt', canonical_created_at,
    'duplicateCreatedAt', duplicate_created_at,
    'oldestCanonical', canonical_created_at <= duplicate_created_at,
    'referenceInventory', inventory,
    'conflicts', blocking_items,
    'blocking', jsonb_array_length(blocking_items) > 0,
    'historyStrategy', 'logical_alias_preserve_original_actor_ids',
    'authUserDeletionPermitted', false
  );
end;
$function$;

create or replace function public.create_person_account_merge_case_v1(
  p_canonical_profile_id uuid,
  p_duplicate_profile_id uuid,
  p_contested boolean,
  p_reason_code text,
  p_dry_run_summary jsonb,
  p_conflict_summary jsonb,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  canonical_account moral_trade_private.person_accounts%rowtype;
  duplicate_account moral_trade_private.person_accounts%rowtype;
  canonical_created_at timestamptz;
  duplicate_created_at timestamptz;
  merge_row moral_trade_private.account_merge_cases%rowtype;
  blocking boolean := false;
begin
  if p_canonical_profile_id is null
     or p_duplicate_profile_id is null
     or p_canonical_profile_id = p_duplicate_profile_id
     or p_created_by is null
     or length(btrim(coalesce(p_reason_code, ''))) not between 3 and 160
     or jsonb_typeof(coalesce(p_dry_run_summary, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_conflict_summary, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'person_merge_case_invalid';
  end if;

  select * into canonical_account
  from moral_trade_private.person_accounts account
  where account.profile_id = p_canonical_profile_id
  for update;
  select * into duplicate_account
  from moral_trade_private.person_accounts account
  where account.profile_id = p_duplicate_profile_id
  for update;
  select created_at into canonical_created_at from auth.users where id = p_canonical_profile_id;
  select created_at into duplicate_created_at from auth.users where id = p_duplicate_profile_id;

  if canonical_account.profile_id is null
     or duplicate_account.profile_id is null
     or canonical_account.account_kind <> 'human'
     or duplicate_account.account_kind <> 'human'
     or canonical_account.account_status in ('closed', 'banned')
     or duplicate_account.account_status = 'banned'
     or canonical_created_at is null
     or duplicate_created_at is null
     or canonical_created_at > duplicate_created_at then
    raise exception using errcode = '42501', message = 'person_merge_oldest_canonical_required';
  end if;

  blocking := lower(coalesce(p_conflict_summary ->> 'blocking', 'false')) = 'true';

  insert into moral_trade_private.account_merge_cases (
    canonical_profile_id,
    duplicate_profile_id,
    contested,
    reason_code,
    status,
    dry_run_summary,
    conflict_summary,
    credentials_reconciled,
    created_by
  ) values (
    p_canonical_profile_id,
    p_duplicate_profile_id,
    coalesce(p_contested, true),
    btrim(p_reason_code),
    case when blocking then 'blocked' else 'pending_review' end,
    coalesce(p_dry_run_summary, '{}'::jsonb),
    coalesce(p_conflict_summary, '{}'::jsonb),
    false,
    p_created_by
  )
  on conflict (canonical_profile_id, duplicate_profile_id) do update
  set contested = excluded.contested,
      reason_code = excluded.reason_code,
      status = case
        when moral_trade_private.account_merge_cases.status = 'executed'
          then 'executed'
        when lower(coalesce(excluded.conflict_summary ->> 'blocking', 'false')) = 'true'
          then 'blocked'
        else 'pending_review'
      end,
      dry_run_summary = excluded.dry_run_summary,
      conflict_summary = excluded.conflict_summary,
      created_by = excluded.created_by
  returning * into merge_row;

  if merge_row.status <> 'executed' then
    update moral_trade_private.person_accounts
    set account_status = 'duplicate_review'
    where profile_id in (p_canonical_profile_id, p_duplicate_profile_id)
      and account_status not in ('closed', 'banned');
  end if;

  insert into moral_trade_private.account_security_events (
    profile_id,
    event_type,
    public_safe_metadata
  ) values
    (
      p_canonical_profile_id,
      'merge_case_created',
      jsonb_build_object('mergeCaseId', merge_row.id, 'role', 'canonical', 'contested', merge_row.contested)
    ),
    (
      p_duplicate_profile_id,
      'merge_case_created',
      jsonb_build_object('mergeCaseId', merge_row.id, 'role', 'duplicate', 'contested', merge_row.contested)
    );

  return jsonb_build_object(
    'mergeCaseId', merge_row.id,
    'status', merge_row.status,
    'canonicalProfileId', p_canonical_profile_id,
    'duplicateProfileId', p_duplicate_profile_id,
    'blocking', blocking,
    'authUserDeleted', false
  );
end;
$function$;

create or replace function moral_trade_private.recompute_person_merge_case_status(
  p_merge_case_id uuid
)
returns moral_trade_private.account_merge_cases
language plpgsql
security definer
set search_path = ''
as $function$
declare
  merge_row moral_trade_private.account_merge_cases%rowtype;
  approve_count integer;
  reject_count integer;
  required_approvals integer;
begin
  select * into merge_row
  from moral_trade_private.account_merge_cases merge_case
  where merge_case.id = p_merge_case_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'person_merge_case_not_found';
  end if;
  if merge_row.status in ('executed', 'cancelled') then
    return merge_row;
  end if;
  if lower(coalesce(merge_row.conflict_summary ->> 'blocking', 'false')) = 'true' then
    update moral_trade_private.account_merge_cases set status = 'blocked' where id = merge_row.id
    returning * into merge_row;
    return merge_row;
  end if;

  select
    count(*) filter (where review.decision = 'approve'),
    count(*) filter (where review.decision = 'reject')
  into approve_count, reject_count
  from moral_trade_private.account_merge_reviews review
  where review.merge_case_id = merge_row.id;

  required_approvals := case when merge_row.contested then 2 else 1 end;
  update moral_trade_private.account_merge_cases
  set status = case
        when reject_count > 0 then 'rejected'
        when approve_count >= required_approvals and credentials_reconciled then 'approved'
        else 'pending_review'
      end,
      approved_at = case
        when reject_count = 0 and approve_count >= required_approvals and credentials_reconciled
          then coalesce(approved_at, timezone('utc', now()))
        else null
      end,
      approved_by = case
        when reject_count = 0 and approve_count >= required_approvals and credentials_reconciled
          then (
            select review.reviewer_profile_id
            from moral_trade_private.account_merge_reviews review
            where review.merge_case_id = merge_row.id and review.decision = 'approve'
            order by review.reviewed_at desc
            limit 1
          )
        else null
      end
  where id = merge_row.id
  returning * into merge_row;

  return merge_row;
end;
$function$;

revoke all on function moral_trade_private.recompute_person_merge_case_status(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.review_person_account_merge_case_v1(
  p_merge_case_id uuid,
  p_reviewer_profile_id uuid,
  p_decision text,
  p_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  merge_row moral_trade_private.account_merge_cases%rowtype;
begin
  select * into merge_row
  from moral_trade_private.account_merge_cases merge_case
  where merge_case.id = p_merge_case_id
  for update;

  if not found
     or p_reviewer_profile_id is null
     or p_reviewer_profile_id in (merge_row.canonical_profile_id, merge_row.duplicate_profile_id)
     or p_decision not in ('approve', 'reject')
     or length(btrim(coalesce(p_rationale, ''))) not between 3 and 4000
     or merge_row.status in ('executed', 'cancelled') then
    raise exception using errcode = '42501', message = 'person_merge_review_unavailable';
  end if;

  insert into moral_trade_private.account_merge_reviews (
    merge_case_id,
    reviewer_profile_id,
    decision,
    rationale,
    reviewed_at
  ) values (
    merge_row.id,
    p_reviewer_profile_id,
    p_decision,
    btrim(p_rationale),
    timezone('utc', now())
  )
  on conflict (merge_case_id, reviewer_profile_id) do update
  set decision = excluded.decision,
      rationale = excluded.rationale,
      reviewed_at = excluded.reviewed_at;

  merge_row := moral_trade_private.recompute_person_merge_case_status(merge_row.id);

  -- A rejected duplicate finding restores each still-open account to the capability
  -- state it would have had without the merge case. Closed and banned accounts remain
  -- closed or banned, and active recovery cooldowns remain in force.
  if merge_row.status = 'rejected' then
    update moral_trade_private.person_accounts account
    set account_status = case
          when account.ordinary_cooldown_until > timezone('utc', now())
            or account.high_risk_cooldown_until > timezone('utc', now())
            then 'recovery_cooldown'
          when account.verification_status = 'verified'
            and account.age_class = 'minor_13_17'
            then 'limited'
          else 'active'
        end
    where account.profile_id in (
      merge_row.canonical_profile_id,
      merge_row.duplicate_profile_id
    )
      and account.account_status = 'duplicate_review';
  end if;

  insert into moral_trade_private.account_security_events (
    profile_id,
    event_type,
    public_safe_metadata
  ) values (
    p_reviewer_profile_id,
    'merge_reviewed',
    jsonb_build_object(
      'mergeCaseId', merge_row.id,
      'decision', p_decision,
      'resultingStatus', merge_row.status
    )
  );

  return jsonb_build_object(
    'mergeCaseId', merge_row.id,
    'status', merge_row.status,
    'decision', p_decision,
    'credentialsReconciled', merge_row.credentials_reconciled
  );
end;
$function$;

create or replace function public.mark_person_merge_credentials_reconciled_v1(
  p_merge_case_id uuid,
  p_recorded_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  merge_row moral_trade_private.account_merge_cases%rowtype;
begin
  if p_recorded_by is null then
    raise exception using errcode = '22023', message = 'person_merge_credentials_invalid';
  end if;

  update moral_trade_private.account_merge_cases
  set credentials_reconciled = true
  where id = p_merge_case_id
    and status not in ('executed', 'cancelled', 'blocked', 'rejected')
  returning * into merge_row;

  if not found then
    raise exception using errcode = '55000', message = 'person_merge_credentials_unavailable';
  end if;

  merge_row := moral_trade_private.recompute_person_merge_case_status(merge_row.id);

  insert into moral_trade_private.account_security_events (
    profile_id,
    event_type,
    public_safe_metadata
  ) values (
    p_recorded_by,
    'merge_credentials_reconciled',
    jsonb_build_object('mergeCaseId', merge_row.id, 'resultingStatus', merge_row.status)
  );

  return jsonb_build_object(
    'mergeCaseId', merge_row.id,
    'status', merge_row.status,
    'credentialsReconciled', true
  );
end;
$function$;

create or replace function public.execute_person_account_merge_v1(
  p_merge_case_id uuid,
  p_executed_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  merge_row moral_trade_private.account_merge_cases%rowtype;
  canonical_account moral_trade_private.person_accounts%rowtype;
  duplicate_account moral_trade_private.person_accounts%rowtype;
  canonical_subject moral_trade_private.identity_subjects%rowtype;
  duplicate_subject moral_trade_private.identity_subjects%rowtype;
  approve_count integer;
  now_value timestamptz := timezone('utc', now());
begin
  select * into merge_row
  from moral_trade_private.account_merge_cases merge_case
  where merge_case.id = p_merge_case_id
  for update;

  select count(*) into approve_count
  from moral_trade_private.account_merge_reviews review
  where review.merge_case_id = p_merge_case_id
    and review.decision = 'approve';

  if merge_row.id is null
     or p_executed_by is null
     or merge_row.status <> 'approved'
     or not merge_row.credentials_reconciled
     or lower(coalesce(merge_row.conflict_summary ->> 'blocking', 'false')) = 'true'
     or approve_count < (case when merge_row.contested then 2 else 1 end)
     or exists (
       select 1 from moral_trade_private.account_merge_reviews review
       where review.merge_case_id = p_merge_case_id and review.decision = 'reject'
     ) then
    raise exception using errcode = '42501', message = 'person_merge_execution_unavailable';
  end if;

  select * into canonical_account
  from moral_trade_private.person_accounts account
  where account.profile_id = merge_row.canonical_profile_id
  for update;
  select * into duplicate_account
  from moral_trade_private.person_accounts account
  where account.profile_id = merge_row.duplicate_profile_id
  for update;

  if canonical_account.profile_id is null
     or duplicate_account.profile_id is null
     or canonical_account.account_kind <> 'human'
     or duplicate_account.account_kind <> 'human'
     or canonical_account.identity_subject_id is null
     or duplicate_account.identity_subject_id is null
     or canonical_account.account_status in ('closed', 'banned')
     or duplicate_account.account_status = 'banned' then
    raise exception using errcode = '42501', message = 'person_merge_accounts_unavailable';
  end if;

  select * into canonical_subject
  from moral_trade_private.identity_subjects subject
  where subject.id = canonical_account.identity_subject_id
  for update;
  select * into duplicate_subject
  from moral_trade_private.identity_subjects subject
  where subject.id = duplicate_account.identity_subject_id
  for update;

  if canonical_subject.id = duplicate_subject.id then
    null;
  else
    update moral_trade_private.identity_dedupe_keys
    set identity_subject_id = canonical_subject.id,
        status = case when canonical_account.account_status = 'closed' then 'tombstone' else 'active' end,
        last_seen_at = now_value
    where identity_subject_id = duplicate_subject.id;

    update moral_trade_private.identity_subjects
    set canonical_profile_id = null,
        state = 'merged',
        verification_status = 'revoked',
        closed_at = now_value
    where id = duplicate_subject.id;
  end if;

  insert into moral_trade_private.person_account_aliases (
    alias_profile_id,
    canonical_profile_id,
    merge_case_id,
    reason_code
  ) values (
    merge_row.duplicate_profile_id,
    merge_row.canonical_profile_id,
    merge_row.id,
    merge_row.reason_code
  )
  on conflict (alias_profile_id) do update
  set canonical_profile_id = excluded.canonical_profile_id,
      merge_case_id = excluded.merge_case_id,
      reason_code = excluded.reason_code;

  update moral_trade_private.person_accounts
  set account_status = 'closed',
      verification_status = 'revoked',
      ordinary_cooldown_until = null,
      high_risk_cooldown_until = null,
      closed_at = now_value
  where profile_id = merge_row.duplicate_profile_id;

  update moral_trade_private.person_accounts
  set account_status = case when age_class = 'minor_13_17' then 'limited' else 'active' end,
      verification_status = 'verified',
      closed_at = null
  where profile_id = merge_row.canonical_profile_id;

  delete from auth.sessions where user_id = merge_row.duplicate_profile_id;
  delete from auth.refresh_tokens where user_id = merge_row.duplicate_profile_id::text;
  update auth.users
  set banned_until = 'infinity'::timestamptz
  where id = merge_row.duplicate_profile_id;

  update moral_trade_private.account_merge_cases
  set status = 'executed',
      executed_by = p_executed_by,
      executed_at = now_value
  where id = merge_row.id;

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    event_type,
    public_safe_metadata
  ) values
    (
      merge_row.canonical_profile_id,
      canonical_subject.id,
      'merge_completed',
      jsonb_build_object(
        'mergeCaseId', merge_row.id,
        'role', 'canonical',
        'aliasProfileId', merge_row.duplicate_profile_id,
        'historyPreserved', true
      )
    ),
    (
      merge_row.duplicate_profile_id,
      duplicate_subject.id,
      'merge_completed',
      jsonb_build_object(
        'mergeCaseId', merge_row.id,
        'role', 'alias',
        'canonicalProfileId', merge_row.canonical_profile_id,
        'authUserDeleted', false
      )
    );

  if to_regclass('public.profile_verification_badges') is not null then
    update public.profile_verification_badges
    set status = 'revoked', updated_at = now_value
    where profile_id = merge_row.duplicate_profile_id and badge_type = 'identity_verified';
  end if;
  perform moral_trade_private.sync_identity_verified_badge(merge_row.canonical_profile_id);

  return jsonb_build_object(
    'mergeCaseId', merge_row.id,
    'status', 'executed',
    'canonicalProfileId', merge_row.canonical_profile_id,
    'aliasProfileId', merge_row.duplicate_profile_id,
    'historyPreserved', true,
    'authUserDeleted', false
  );
end;
$function$;

create or replace function public.resolve_canonical_person_profile_v1(p_profile_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (
      select alias.canonical_profile_id
      from moral_trade_private.person_account_aliases alias
      where alias.alias_profile_id = p_profile_id
    ),
    p_profile_id
  );
$function$;

create or replace function public.get_person_identity_admin_queue_v1(p_limit integer default 100)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'pendingSessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sessionId', session.id,
        'purpose', session.purpose,
        'requestedProfileId', session.requested_profile_id,
        'providerMode', session.provider_mode,
        'providerName', session.provider_name,
        'state', session.state,
        'ageClass', session.age_class,
        'createdAt', session.created_at,
        'expiresAt', session.expires_at
      ) order by session.created_at, session.id)
      from (
        select * from moral_trade_private.preaccount_verification_sessions
        where state in ('created', 'provider_pending', 'needs_review', 'guardian_required', 'duplicate_recovery')
        order by created_at, id
        limit least(greatest(coalesce(p_limit, 100), 1), 500)
      ) session
    ), '[]'::jsonb),
    'recoveryCases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'recoveryCaseId', recovery.id,
        'status', recovery.status,
        'createdAt', recovery.created_at,
        'resolvedAt', recovery.resolved_at
      ) order by recovery.created_at, recovery.id)
      from (
        select * from moral_trade_private.account_recovery_cases
        where status <> 'completed'
        order by created_at, id
        limit least(greatest(coalesce(p_limit, 100), 1), 500)
      ) recovery
    ), '[]'::jsonb),
    'mergeCases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mergeCaseId', merge_case.id,
        'status', merge_case.status,
        'contested', merge_case.contested,
        'credentialsReconciled', merge_case.credentials_reconciled,
        'createdAt', merge_case.created_at
      ) order by merge_case.created_at, merge_case.id)
      from (
        select * from moral_trade_private.account_merge_cases
        where status not in ('executed', 'cancelled')
        order by created_at, id
        limit least(greatest(coalesce(p_limit, 100), 1), 500)
      ) merge_case
    ), '[]'::jsonb),
    'providerDeletionDue', coalesce((
      select jsonb_agg(jsonb_build_object(
        'verificationEventId', event.id,
        'providerName', event.provider_name,
        'deletionDueAt', event.raw_data_deletion_due_at,
        'overdue', event.raw_data_deletion_due_at < timezone('utc', now())
      ) order by event.raw_data_deletion_due_at, event.id)
      from (
        select * from moral_trade_private.identity_verification_events
        where raw_data_deletion_due_at is not null
          and raw_data_deletion_confirmed_at is null
        order by raw_data_deletion_due_at, id
        limit least(greatest(coalesce(p_limit, 100), 1), 500)
      ) event
    ), '[]'::jsonb)
  );
$function$;

create or replace function public.one_person_custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  account_row moral_trade_private.person_accounts%rowtype;
  gate_row moral_trade_private.person_account_release_gates%rowtype;
  user_id_value uuid;
begin
  begin
    user_id_value := (event ->> 'user_id')::uuid;
  exception when others then
    user_id_value := null;
  end;

  select * into gate_row
  from moral_trade_private.person_account_release_gates gate
  where gate.gate_key = 'one_person_account_v1';
  if user_id_value is not null then
    select * into account_row
    from moral_trade_private.person_accounts account
    where account.profile_id = user_id_value;
  end if;

  claims := jsonb_set(
    claims,
    '{one_person_account}',
    jsonb_build_object(
      'policyVersion', coalesce(gate_row.policy_version, 'one-natural-person-one-canonical-account-v1-2026-07-31'),
      'participationEnforced', coalesce(gate_row.participation_enforcement_enabled, false),
      'accountKind', coalesce(account_row.account_kind, 'human'),
      'accountStatus', coalesce(account_row.account_status, 'active'),
      'verificationStatus', coalesce(account_row.verification_status, 'legacy_unverified'),
      'ageClass', coalesce(account_row.age_class, 'unknown'),
      'guardianConsentStatus', coalesce(account_row.guardian_consent_status, 'not_required')
    ),
    true
  );

  return jsonb_set(event, '{claims}', claims, true);
end;
$function$;

create or replace function public.configure_person_account_release_v1(
  p_provider_mode text,
  p_provider_ready boolean,
  p_registration_enforcement_enabled boolean,
  p_participation_enforcement_enabled boolean,
  p_updated_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  gate_row moral_trade_private.person_account_release_gates%rowtype;
begin
  if p_provider_mode not in ('disabled', 'manual_review', 'signed_webhook', 'qa_mock')
     or ((p_registration_enforcement_enabled or p_participation_enforcement_enabled)
       and (not p_provider_ready or p_provider_mode = 'disabled')) then
    raise exception using errcode = '23514', message = 'person_account_release_gate_invalid';
  end if;

  update moral_trade_private.person_account_release_gates
  set provider_mode = p_provider_mode,
      provider_ready = p_provider_ready,
      registration_enforcement_enabled = p_registration_enforcement_enabled,
      participation_enforcement_enabled = p_participation_enforcement_enabled,
      activated_at = case
        when p_registration_enforcement_enabled or p_participation_enforcement_enabled
          then coalesce(activated_at, timezone('utc', now()))
        else null
      end,
      updated_by = p_updated_by
  where gate_key = 'one_person_account_v1'
  returning * into gate_row;

  return jsonb_build_object(
    'providerMode', gate_row.provider_mode,
    'providerReady', gate_row.provider_ready,
    'registrationEnforcementEnabled', gate_row.registration_enforcement_enabled,
    'participationEnforcementEnabled', gate_row.participation_enforcement_enabled,
    'activatedAt', gate_row.activated_at
  );
end;
$function$;

create or replace function public.get_person_account_status_v1(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  account_row moral_trade_private.person_accounts%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  gate_row moral_trade_private.person_account_release_gates%rowtype;
begin
  select * into gate_row
  from moral_trade_private.person_account_release_gates gate
  where gate.gate_key = 'one_person_account_v1';

  select * into account_row
  from moral_trade_private.person_accounts account
  where account.profile_id = p_profile_id;

  if account_row.identity_subject_id is not null then
    select * into subject_row
    from moral_trade_private.identity_subjects subject
    where subject.id = account_row.identity_subject_id;
  end if;

  return jsonb_build_object(
    'available', account_row.profile_id is not null,
    'profileId', p_profile_id,
    'accountKind', coalesce(account_row.account_kind, 'human'),
    'accountStatus', coalesce(account_row.account_status, 'active'),
    'verificationStatus', coalesce(account_row.verification_status, 'legacy_unverified'),
    'ageClass', coalesce(account_row.age_class, 'unknown'),
    'guardianConsentStatus', coalesce(account_row.guardian_consent_status, 'not_required'),
    'ordinaryCooldownUntil', account_row.ordinary_cooldown_until,
    'highRiskCooldownUntil', account_row.high_risk_cooldown_until,
    'credentialExpiresAt', subject_row.expires_at,
    'providerName', nullif(subject_row.latest_provider_name, ''),
    'registrationEnforcementEnabled', coalesce(gate_row.registration_enforcement_enabled, false),
    'participationEnforcementEnabled', coalesce(gate_row.participation_enforcement_enabled, false),
    'providerMode', coalesce(gate_row.provider_mode, 'disabled'),
    'providerReady', coalesce(gate_row.provider_ready, false)
  );
end;
$function$;

create or replace function public.get_my_person_account_status_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'person_account_authentication_required';
  end if;
  return public.get_person_account_status_v1(auth.uid());
end;
$function$;

create or replace function public.person_capability_decision_v1(
  p_profile_id uuid,
  p_action_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  account_row moral_trade_private.person_accounts%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  gate_enabled boolean := false;
  now_value timestamptz := timezone('utc', now());
  guardian_active boolean := false;
  action_value text := btrim(coalesce(p_action_code, ''));
  low_risk boolean;
  minor_prohibited boolean;
  high_risk boolean;
  cooldown_until_value timestamptz;
  allowed_value boolean := false;
  reason_value text := 'identity_verification_required';
begin
  if action_value not in (
    'browse',
    'private_draft',
    'profile_edit',
    'data_export',
    'identity_recovery',
    'safety_exit',
    'credential_management',
    'participate',
    'publish',
    'message',
    'match',
    'agreement',
    'vote',
    'contribute',
    'financial',
    'payout',
    'receive_funds',
    'organization_control',
    'independent_verification',
    'collective_high_risk'
  ) then
    return jsonb_build_object(
      'allowed', false,
      'action', action_value,
      'reasonCode', 'unknown_capability',
      'cooldownUntil', null
    );
  end if;

  select gate.participation_enforcement_enabled into gate_enabled
  from moral_trade_private.person_account_release_gates gate
  where gate.gate_key = 'one_person_account_v1';

  if not coalesce(gate_enabled, false) then
    return jsonb_build_object(
      'allowed', true,
      'action', action_value,
      'reasonCode', 'enforcement_disabled',
      'cooldownUntil', null
    );
  end if;

  select * into account_row
  from moral_trade_private.person_accounts account
  where account.profile_id = p_profile_id;

  low_risk := action_value in (
    'browse', 'private_draft', 'profile_edit', 'data_export', 'identity_recovery', 'safety_exit'
  );
  high_risk := action_value in (
    'credential_management',
    'agreement',
    'contribute',
    'financial',
    'payout',
    'receive_funds',
    'organization_control',
    'independent_verification',
    'collective_high_risk'
  );
  minor_prohibited := action_value in (
    'agreement',
    'contribute',
    'financial',
    'payout',
    'receive_funds',
    'organization_control',
    'independent_verification',
    'collective_high_risk'
  );

  if account_row.profile_id is null then
    allowed_value := low_risk;
    reason_value := case when low_risk then 'low_risk_capability' else 'identity_verification_required' end;
  elsif account_row.account_kind <> 'human' then
    allowed_value := low_risk;
    reason_value := case when low_risk then 'low_risk_capability' else 'non_human_account' end;
  elsif account_row.account_status = 'banned' then
    allowed_value := false;
    reason_value := 'account_banned';
  elsif account_row.account_status = 'closed' then
    allowed_value := action_value in ('browse', 'data_export', 'identity_recovery', 'safety_exit');
    reason_value := case when allowed_value then 'low_risk_capability' else 'closed_account' end;
  elsif account_row.account_status = 'duplicate_review' then
    allowed_value := action_value in ('browse', 'private_draft', 'data_export', 'identity_recovery', 'safety_exit');
    reason_value := case when allowed_value then 'low_risk_capability' else 'duplicate_review' end;
  elsif account_row.verification_status <> 'verified' then
    allowed_value := low_risk;
    reason_value := case when low_risk then 'low_risk_capability' else 'identity_verification_required' end;
  else
    if account_row.identity_subject_id is not null then
      select * into subject_row
      from moral_trade_private.identity_subjects subject
      where subject.id = account_row.identity_subject_id;
    end if;

    if subject_row.expires_at is not null and subject_row.expires_at <= now_value then
      allowed_value := low_risk;
      reason_value := case when low_risk then 'low_risk_capability' else 'identity_verification_required' end;
    elsif high_risk
       and account_row.high_risk_cooldown_until is not null
       and account_row.high_risk_cooldown_until > now_value then
      allowed_value := false;
      reason_value := 'high_risk_recovery_cooldown';
      cooldown_until_value := account_row.high_risk_cooldown_until;
    elsif not low_risk
       and account_row.ordinary_cooldown_until is not null
       and account_row.ordinary_cooldown_until > now_value then
      allowed_value := false;
      reason_value := 'ordinary_recovery_cooldown';
      cooldown_until_value := account_row.ordinary_cooldown_until;
    elsif account_row.age_class = 'minor_13_17' then
      select exists (
        select 1
        from moral_trade_private.guardian_relationships relationship
        join moral_trade_private.person_accounts guardian
          on guardian.profile_id = relationship.guardian_profile_id
        where relationship.minor_profile_id = p_profile_id
          and relationship.status = 'active'
          and relationship.effective_at <= now_value
          and (relationship.expires_at is null or relationship.expires_at > now_value)
          and guardian.account_kind = 'human'
          and guardian.account_status = 'active'
          and guardian.verification_status = 'verified'
          and guardian.age_class = 'adult'
          and (
            'basic_participation' = any(relationship.consent_scope)
            or action_value = any(relationship.consent_scope)
          )
      ) into guardian_active;

      if minor_prohibited then
        allowed_value := false;
        reason_value := 'minor_restricted_capability';
      elsif not guardian_active and not low_risk then
        allowed_value := false;
        reason_value := 'guardian_consent_required';
      else
        allowed_value := true;
        reason_value := case when low_risk then 'low_risk_capability' else 'verified_minor' end;
      end if;
    else
      allowed_value := true;
      reason_value := case when low_risk then 'low_risk_capability' else 'verified_adult' end;
    end if;
  end if;

  return jsonb_build_object(
    'allowed', allowed_value,
    'action', action_value,
    'reasonCode', reason_value,
    'cooldownUntil', cooldown_until_value
  );
end;
$function$;

create or replace function public.person_capability_allows_current_actor_v1(p_action_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (public.person_capability_decision_v1(auth.uid(), p_action_code) ->> 'allowed')::boolean,
    false
  );
$function$;

create or replace function public.require_person_capability_v1(
  p_profile_id uuid,
  p_action_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  decision jsonb;
begin
  decision := public.person_capability_decision_v1(p_profile_id, p_action_code);
  if not coalesce((decision ->> 'allowed')::boolean, false) then
    raise exception using
      errcode = '42501',
      message = 'person_capability_denied:' || coalesce(decision ->> 'reasonCode', 'unknown');
  end if;
  return decision;
end;
$function$;

create or replace function public.sync_person_credential_inventory_v1(
  p_profile_id uuid,
  p_credentials jsonb,
  p_recorded_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_row moral_trade_private.person_accounts%rowtype;
  credential_row jsonb;
  provider_value text;
  identity_hmac_value text;
  input_count integer;
  unique_count integer;
  linked_count integer := 0;
  removed_count integer := 0;
  decision jsonb;
  now_value timestamptz := timezone('utc', now());
begin
  if p_profile_id is null
     or p_recorded_by is distinct from p_profile_id
     or jsonb_typeof(p_credentials) <> 'array'
     or jsonb_array_length(p_credentials) not between 1 and 20 then
    raise exception using errcode = '22023', message = 'person_credential_inventory_invalid';
  end if;

  select * into account_row
  from moral_trade_private.person_accounts account
  where account.profile_id = p_profile_id
  for update;

  if not found
     or account_row.account_kind <> 'human'
     or account_row.verification_status <> 'verified'
     or account_row.account_status not in ('active', 'limited') then
    raise exception using errcode = '42501', message = 'person_credential_inventory_unavailable';
  end if;

  decision := public.person_capability_decision_v1(
    p_profile_id,
    'credential_management'
  );
  if not coalesce((decision ->> 'allowed')::boolean, false) then
    raise exception using
      errcode = '42501',
      message = 'person_credential_inventory_denied:'
        || coalesce(decision ->> 'reasonCode', 'unknown');
  end if;

  select
    count(*),
    count(distinct (
      lower(btrim(value ->> 'provider')),
      lower(btrim(value ->> 'identityIdHmac'))
    ))
  into input_count, unique_count
  from jsonb_array_elements(p_credentials);

  if input_count <> unique_count
     or exists (
       select 1
       from jsonb_array_elements(p_credentials) item(value)
       where jsonb_typeof(item.value) <> 'object'
          or lower(btrim(coalesce(item.value ->> 'provider', '')))
             !~ '^[a-z0-9][a-z0-9_:-]{0,79}$'
          or lower(btrim(coalesce(item.value ->> 'identityIdHmac', '')))
             !~ '^[0-9a-f]{64}$'
     ) then
    raise exception using errcode = '22023', message = 'person_credential_inventory_payload_invalid';
  end if;

  for credential_row in
    select value
    from jsonb_array_elements(p_credentials)
    order by lower(btrim(value ->> 'provider')),
             lower(btrim(value ->> 'identityIdHmac'))
  loop
    provider_value := lower(btrim(credential_row ->> 'provider'));
    identity_hmac_value := lower(btrim(credential_row ->> 'identityIdHmac'));

    perform pg_advisory_xact_lock(hashtextextended(
      'person_credential:' || provider_value || ':' || identity_hmac_value,
      0
    ));

    if exists (
      select 1
      from moral_trade_private.person_credential_links credential
      where credential.provider = provider_value
        and credential.identity_id_hmac = identity_hmac_value
        and credential.profile_id <> p_profile_id
    ) then
      raise exception using errcode = '23505', message = 'person_credential_already_linked_elsewhere';
    end if;

    insert into moral_trade_private.person_credential_links (
      profile_id,
      provider,
      identity_id_hmac,
      status,
      first_seen_at,
      last_seen_at,
      removed_at
    ) values (
      p_profile_id,
      provider_value,
      identity_hmac_value,
      'active',
      now_value,
      now_value,
      null
    )
    on conflict (provider, identity_id_hmac) do update
    set profile_id = excluded.profile_id,
        status = 'active',
        last_seen_at = excluded.last_seen_at,
        removed_at = null
    where moral_trade_private.person_credential_links.profile_id = excluded.profile_id;

    if found then
      linked_count := linked_count + 1;
    end if;
  end loop;

  update moral_trade_private.person_credential_links credential
  set status = 'removed',
      removed_at = now_value,
      last_seen_at = now_value
  where credential.profile_id = p_profile_id
    and credential.status = 'active'
    and not exists (
      select 1
      from jsonb_array_elements(p_credentials) item(value)
      where lower(btrim(item.value ->> 'provider')) = credential.provider
        and lower(btrim(item.value ->> 'identityIdHmac')) = credential.identity_id_hmac
    );
  get diagnostics removed_count = row_count;

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    event_type,
    public_safe_metadata
  ) values (
    p_profile_id,
    account_row.identity_subject_id,
    'credential_linked',
    jsonb_build_object(
      'activeCredentialCount', input_count,
      'synchronizedAt', now_value
    )
  );

  if removed_count > 0 then
    insert into moral_trade_private.account_security_events (
      profile_id,
      identity_subject_id,
      event_type,
      public_safe_metadata
    ) values (
      p_profile_id,
      account_row.identity_subject_id,
      'credential_removed',
      jsonb_build_object(
        'removedCredentialCount', removed_count,
        'synchronizedAt', now_value
      )
    );
  end if;

  return jsonb_build_object(
    'profileId', p_profile_id,
    'activeCredentialCount', input_count,
    'removedCredentialCount', removed_count,
    'rawProviderIdentifiersStored', false
  );
end;
$function$;

create or replace function public.close_canonical_person_account_v1(
  p_profile_id uuid,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_row moral_trade_private.person_accounts%rowtype;
  subject_row moral_trade_private.identity_subjects%rowtype;
  now_value timestamptz := timezone('utc', now());
begin
  select * into account_row
  from moral_trade_private.person_accounts account
  where account.profile_id = p_profile_id
  for update;

  if not found
     or account_row.account_kind <> 'human'
     or account_row.identity_subject_id is null
     or length(btrim(coalesce(p_reason_code, ''))) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'person_account_closure_unavailable';
  end if;

  select * into subject_row
  from moral_trade_private.identity_subjects subject
  where subject.id = account_row.identity_subject_id
  for update;

  delete from auth.sessions where user_id = p_profile_id;
  delete from auth.refresh_tokens where user_id = p_profile_id::text;
  update auth.users
  set banned_until = 'infinity'::timestamptz,
      updated_at = now_value
  where id = p_profile_id;

  update moral_trade_private.person_accounts
  set account_status = 'closed',
      ordinary_cooldown_until = null,
      high_risk_cooldown_until = null,
      closed_at = now_value
  where profile_id = p_profile_id;

  update moral_trade_private.identity_subjects
  set state = 'closed',
      closed_at = now_value
  where id = subject_row.id;

  update moral_trade_private.identity_dedupe_keys
  set status = 'tombstone',
      retained_after_closure = true,
      last_seen_at = now_value
  where identity_subject_id = subject_row.id;

  insert into moral_trade_private.identity_tombstones (
    identity_subject_id,
    canonical_profile_id,
    state,
    reason_code,
    closed_at
  ) values (
    subject_row.id,
    p_profile_id,
    'retained',
    btrim(p_reason_code),
    now_value
  )
  on conflict (identity_subject_id) do update
  set canonical_profile_id = excluded.canonical_profile_id,
      state = 'retained',
      reason_code = excluded.reason_code,
      closed_at = excluded.closed_at;

  insert into moral_trade_private.account_security_events (
    profile_id,
    identity_subject_id,
    event_type,
    public_safe_metadata
  ) values (
    p_profile_id,
    subject_row.id,
    'account_closed',
    jsonb_build_object(
      'reasonCode', btrim(p_reason_code),
      'tombstoneRetained', true,
      'sessionsRevoked', true,
      'loginDisabled', true
    )
  );

  if to_regclass('public.profile_verification_badges') is not null then
    update public.profile_verification_badges
    set status = 'revoked',
        updated_at = now_value
    where profile_id = p_profile_id
      and badge_type = 'identity_verified';
  end if;

  return jsonb_build_object(
    'profileId', p_profile_id,
    'status', 'closed',
    'identityTombstoneRetained', true,
    'sessionsRevoked', true,
    'loginDisabled', true,
    'authUserDeleted', false
  );
end;
$function$;

-- Direct browser writes must satisfy the same central capability decision once the
-- participation gate is enabled. Service-role workflows remain responsible for calling
-- require_person_capability_v1 on behalf of their authenticated actor.
do $person_write_policies$
declare
  policy_row record;
  policy_name text;
begin
  for policy_row in
    select * from (values
      ('offers', 'publish'),
      ('interests', 'match'),
      ('trade_invitations', 'agreement'),
      ('trade_threads', 'agreement'),
      ('trade_messages', 'message'),
      ('trade_counterproposals', 'agreement'),
      ('agreements', 'agreement'),
      ('trade_agreement_versions', 'agreement'),
      ('trade_agreement_confirmations', 'agreement'),
      ('trade_evidence_items', 'agreement'),
      ('trade_completion_confirmations', 'agreement'),
      ('trade_exit_requests', 'agreement'),
      ('trade_agreement_milestones', 'agreement'),
      ('trade_evidence_bundles', 'agreement'),
      ('trade_evidence_bundle_items', 'agreement'),
      ('trade_milestone_reviewer_nominations', 'agreement'),
      ('trade_milestone_reviews', 'independent_verification'),
      ('trade_milestone_appeals', 'agreement'),
      ('trade_appeal_reviewer_nominations', 'agreement'),
      ('trade_milestone_payouts', 'financial'),
      ('trade_external_payment_receipts', 'financial'),
      ('trade_payment_review_cases', 'independent_verification'),
      ('trade_payment_reviewer_nominations', 'agreement'),
      ('trade_payment_review_decisions', 'independent_verification'),
      ('trade_payment_appeals', 'agreement'),
      ('trade_payment_appeal_reviewer_nominations', 'agreement'),
      ('donation_offset_offers', 'publish'),
      ('donation_offset_matches', 'financial'),
      ('mpgf_pledges', 'contribute'),
      ('mpgf_phase_one_pledges', 'contribute'),
      ('mpgf_phase_one_ballots', 'vote'),
      ('collective_decision_responses', 'vote'),
      ('conditional_payment_mandates', 'financial'),
      ('conditional_redirect_offers', 'financial'),
      ('conditional_redirect_candidates', 'financial'),
      ('profile_payment_accounts', 'payout'),
      ('offer_comments', 'message'),
      ('comment_votes', 'vote'),
      ('offer_carts', 'participate'),
      ('user_follows', 'participate')
    ) as configured(table_name, action_code)
  loop
    if to_regclass('public.' || policy_row.table_name) is null then
      continue;
    end if;

    policy_name := 'one_person_' || policy_row.table_name || '_insert';
    execute format('drop policy if exists %I on public.%I', policy_name, policy_row.table_name);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (public.person_capability_allows_current_actor_v1(%L))',
      policy_name,
      policy_row.table_name,
      policy_row.action_code
    );

    policy_name := 'one_person_' || policy_row.table_name || '_update';
    execute format('drop policy if exists %I on public.%I', policy_name, policy_row.table_name);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (public.person_capability_allows_current_actor_v1(%L)) with check (public.person_capability_allows_current_actor_v1(%L))',
      policy_name,
      policy_row.table_name,
      policy_row.action_code,
      policy_row.action_code
    );

    policy_name := 'one_person_' || policy_row.table_name || '_delete';
    execute format('drop policy if exists %I on public.%I', policy_name, policy_row.table_name);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (public.person_capability_allows_current_actor_v1(%L))',
      policy_name,
      policy_row.table_name,
      policy_row.action_code
    );
  end loop;
end;
$person_write_policies$;

-- Public RPC grants. Private identity state is never returned through direct table reads.
revoke all on function public.create_person_verification_session_v1(
  uuid, text, text, text, uuid, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_person_verification_session_v1(
  uuid, text, text, text, uuid, text, text, text, text, timestamptz
) to service_role;

revoke all on function public.get_person_verification_session_status_v1(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.get_person_verification_session_status_v1(uuid, text, text)
  to service_role;

revoke all on function public.list_pending_person_verification_sessions_v1(integer)
  from public, anon, authenticated;
grant execute on function public.list_pending_person_verification_sessions_v1(integer)
  to service_role;

revoke all on function public.record_person_verification_result_v1(
  uuid, text, text, text, text, text, text, text, text, jsonb,
  timestamptz, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_person_verification_result_v1(
  uuid, text, text, text, text, text, text, text, text, jsonb,
  timestamptz, timestamptz, timestamptz, timestamptz
) to service_role;

revoke all on function public.bind_person_registration_grant_email_v1(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.bind_person_registration_grant_email_v1(uuid, text, text)
  to service_role;

revoke all on function public.record_preaccount_guardian_consent_v1(
  uuid, uuid, text, text[], uuid, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_preaccount_guardian_consent_v1(
  uuid, uuid, text, text[], uuid, timestamptz, timestamptz
) to service_role;

revoke all on function public.record_person_guardian_relationship_v1(
  uuid, uuid, text, text[], uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_person_guardian_relationship_v1(
  uuid, uuid, text, text[], uuid, timestamptz
) to service_role;

revoke all on function public.revoke_person_guardian_relationship_v1(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_person_guardian_relationship_v1(uuid, uuid, uuid)
  to service_role;

revoke all on function public.confirm_person_provider_data_deletion_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_person_provider_data_deletion_v1(uuid, uuid)
  to service_role;

revoke all on function public.complete_person_recovery_v1(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.complete_person_recovery_v1(uuid, uuid, boolean)
  to service_role;

revoke all on function public.analyze_person_account_merge_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.analyze_person_account_merge_v1(uuid, uuid)
  to service_role;

revoke all on function public.create_person_account_merge_case_v1(
  uuid, uuid, boolean, text, jsonb, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.create_person_account_merge_case_v1(
  uuid, uuid, boolean, text, jsonb, jsonb, uuid
) to service_role;

revoke all on function public.review_person_account_merge_case_v1(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_person_account_merge_case_v1(uuid, uuid, text, text)
  to service_role;

revoke all on function public.mark_person_merge_credentials_reconciled_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_person_merge_credentials_reconciled_v1(uuid, uuid)
  to service_role;

revoke all on function public.execute_person_account_merge_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.execute_person_account_merge_v1(uuid, uuid)
  to service_role;

revoke all on function public.resolve_canonical_person_profile_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_canonical_person_profile_v1(uuid)
  to service_role;

revoke all on function public.get_person_identity_admin_queue_v1(integer)
  from public, anon, authenticated;
grant execute on function public.get_person_identity_admin_queue_v1(integer)
  to service_role;

revoke all on function public.one_person_custom_access_token_hook(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.one_person_custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke all on function public.configure_person_account_release_v1(text, boolean, boolean, boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.configure_person_account_release_v1(text, boolean, boolean, boolean, uuid)
  to service_role;

revoke all on function public.get_person_account_status_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.get_person_account_status_v1(uuid)
  to service_role;

revoke all on function public.get_my_person_account_status_v1()
  from public, anon;
grant execute on function public.get_my_person_account_status_v1()
  to authenticated;

revoke all on function public.person_capability_decision_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.person_capability_decision_v1(uuid, text)
  to service_role;

revoke all on function public.require_person_capability_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.require_person_capability_v1(uuid, text)
  to service_role;

revoke all on function public.person_capability_allows_current_actor_v1(text)
  from public, anon;
grant execute on function public.person_capability_allows_current_actor_v1(text)
  to authenticated;

revoke all on function public.sync_person_credential_inventory_v1(uuid, jsonb, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_person_credential_inventory_v1(uuid, jsonb, uuid)
  to service_role;

revoke all on function public.close_canonical_person_account_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.close_canonical_person_account_v1(uuid, text)
  to service_role;

comment on table moral_trade_private.identity_subjects is
  'Protected human-identity subjects. Contains no raw documents, selfies, video, full document numbers, reusable biometric templates, or public legal names.';
comment on table moral_trade_private.identity_dedupe_keys is
  'Versioned HMAC tokens enforcing one natural person per canonical account, retained as tombstones after account closure.';
comment on table moral_trade_private.person_accounts is
  'Authoritative account-kind, verification, age-band, guardian-consent, cooldown, and closure state for each Supabase auth user.';
comment on table moral_trade_private.person_registration_grants is
  'Short-lived, single-use grants that permit exactly one verified identity subject to create one canonical Supabase user.';
comment on function public.one_person_before_user_created_hook(jsonb) is
  'Supabase Before User Created hook. Rejects account creation without a current single-use identity registration grant when the database release gate is enabled.';
comment on table moral_trade_private.person_credential_links is
  'Private HMAC-only inventory of authentication credentials attached to one canonical person account. Provider emails, subject identifiers, tokens, and identity documents are not stored.';
comment on function public.sync_person_credential_inventory_v1(uuid, jsonb, uuid) is
  'Service-only synchronization of HMACed Supabase auth identity identifiers for one verified canonical human account.';

comment on function public.person_capability_decision_v1(uuid, text) is
  'Central fail-closed capability decision for verified adults, guardian-consented minors, cooldowns, duplicate review, closed accounts, and non-human accounts.';

-- Isolated-QA cleanup for browser-created fixtures. This cannot operate unless the
-- database is explicitly in qa_mock mode and the auth user carries the matching run ID.
create or replace function public.cleanup_one_person_qa_fixture_v1(
  p_profile_id uuid,
  p_qa_run_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  gate_mode text;
  user_row auth.users%rowtype;
  subject_id_value uuid;
  session_ids uuid[] := '{}';
begin
  select provider_mode into gate_mode
  from moral_trade_private.person_account_release_gates
  where gate_key = 'one_person_account_v1';

  select * into user_row from auth.users where id = p_profile_id for update;
  if not found
     or gate_mode <> 'qa_mock'
     or lower(coalesce(user_row.raw_user_meta_data ->> 'qa_fixture', 'false')) <> 'true'
     or length(btrim(coalesce(p_qa_run_id, ''))) < 8
     or user_row.raw_user_meta_data ->> 'one_person_qa_run_id' is distinct from p_qa_run_id then
    raise exception using errcode = '42501', message = 'one_person_qa_fixture_cleanup_denied';
  end if;

  select identity_subject_id into subject_id_value
  from moral_trade_private.person_accounts
  where profile_id = p_profile_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into session_ids
  from moral_trade_private.preaccount_verification_sessions
  where requested_profile_id = p_profile_id
     or identity_subject_id = subject_id_value;

  perform set_config('moral_trade.person_identity_internal_write', 'on', true);

  delete from moral_trade_private.account_merge_reviews
  where merge_case_id in (
    select id from moral_trade_private.account_merge_cases
    where canonical_profile_id = p_profile_id or duplicate_profile_id = p_profile_id
  ) or reviewer_profile_id = p_profile_id;
  delete from moral_trade_private.person_account_aliases
  where alias_profile_id = p_profile_id or canonical_profile_id = p_profile_id;
  delete from moral_trade_private.account_merge_cases
  where canonical_profile_id = p_profile_id or duplicate_profile_id = p_profile_id;
  delete from moral_trade_private.identity_duplicate_cases
  where verification_session_id = any(session_ids)
     or requested_profile_id = p_profile_id
     or existing_profile_id = p_profile_id
     or subject_a_id = subject_id_value
     or subject_b_id = subject_id_value;
  delete from moral_trade_private.account_recovery_cases
  where verification_session_id = any(session_ids)
     or canonical_profile_id = p_profile_id
     or identity_subject_id = subject_id_value;
  delete from moral_trade_private.guardian_relationships
  where minor_profile_id = p_profile_id or guardian_profile_id = p_profile_id;
  delete from moral_trade_private.preaccount_guardian_consents
  where verification_session_id = any(session_ids) or guardian_profile_id = p_profile_id;
  delete from moral_trade_private.person_credential_links where profile_id = p_profile_id;
  delete from moral_trade_private.account_cooldowns
  where profile_id = p_profile_id or created_by = p_profile_id;
  delete from moral_trade_private.identity_tombstones
  where canonical_profile_id = p_profile_id or identity_subject_id = subject_id_value;
  delete from moral_trade_private.account_security_events
  where profile_id = p_profile_id
     or identity_subject_id = subject_id_value
     or verification_session_id = any(session_ids);
  delete from moral_trade_private.person_registration_grants
  where identity_subject_id = subject_id_value or verification_session_id = any(session_ids);
  delete from moral_trade_private.identity_verification_events
  where identity_subject_id = subject_id_value or verification_session_id = any(session_ids);
  delete from moral_trade_private.identity_dedupe_keys where identity_subject_id = subject_id_value;
  delete from moral_trade_private.person_accounts where profile_id = p_profile_id;
  delete from moral_trade_private.preaccount_verification_sessions where id = any(session_ids);
  delete from moral_trade_private.identity_subjects
  where id = subject_id_value and canonical_profile_id = p_profile_id;

  delete from auth.users where id = p_profile_id;

  return jsonb_build_object('cleaned', true, 'profileId', p_profile_id, 'qaRunId', p_qa_run_id);
end;
$function$;

revoke all on function public.cleanup_one_person_qa_fixture_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cleanup_one_person_qa_fixture_v1(uuid, text)
  to service_role;
comment on function public.cleanup_one_person_qa_fixture_v1(uuid, text) is
  'Deletes only an explicitly tagged isolated-QA fixture while the database provider mode is qa_mock.';

create or replace function public.cleanup_one_person_qa_session_v1(
  p_session_id uuid,
  p_retrieval_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  gate_mode text;
  session_row moral_trade_private.preaccount_verification_sessions%rowtype;
  subject_id_value uuid;
begin
  select provider_mode into gate_mode
  from moral_trade_private.person_account_release_gates
  where gate_key = 'one_person_account_v1';
  select * into session_row
  from moral_trade_private.preaccount_verification_sessions
  where id = p_session_id and retrieval_token_hash = p_retrieval_token_hash
  for update;
  if not found
     or gate_mode <> 'qa_mock'
     or session_row.provider_mode <> 'qa_mock'
     or p_retrieval_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '42501', message = 'one_person_qa_session_cleanup_denied';
  end if;

  select identity_subject_id into subject_id_value
  from moral_trade_private.identity_verification_events
  where verification_session_id = p_session_id and identity_subject_id is not null
  order by created_at desc limit 1;

  if subject_id_value is not null and exists (
    select 1 from moral_trade_private.identity_subjects
    where id = subject_id_value and canonical_profile_id is not null
  ) then
    raise exception using errcode = '42501', message = 'one_person_qa_session_has_canonical_account';
  end if;

  perform set_config('moral_trade.person_identity_internal_write', 'on', true);
  delete from moral_trade_private.identity_duplicate_cases
    where verification_session_id = p_session_id
       or subject_a_id = subject_id_value or subject_b_id = subject_id_value;
  delete from moral_trade_private.account_recovery_cases
    where verification_session_id = p_session_id or identity_subject_id = subject_id_value;
  delete from moral_trade_private.preaccount_guardian_consents
    where verification_session_id = p_session_id;
  delete from moral_trade_private.account_security_events
    where verification_session_id = p_session_id or identity_subject_id = subject_id_value;
  delete from moral_trade_private.person_registration_grants
    where verification_session_id = p_session_id or identity_subject_id = subject_id_value;
  delete from moral_trade_private.identity_verification_events
    where verification_session_id = p_session_id or identity_subject_id = subject_id_value;
  delete from moral_trade_private.identity_tombstones where identity_subject_id = subject_id_value;
  delete from moral_trade_private.identity_dedupe_keys where identity_subject_id = subject_id_value;
  delete from moral_trade_private.preaccount_verification_sessions where id = p_session_id;
  delete from moral_trade_private.identity_subjects
    where id = subject_id_value and canonical_profile_id is null;
  return jsonb_build_object('cleaned', true, 'sessionId', p_session_id);
end;
$function$;

revoke all on function public.cleanup_one_person_qa_session_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cleanup_one_person_qa_session_v1(uuid, text)
  to service_role;
comment on function public.cleanup_one_person_qa_session_v1(uuid, text) is
  'Deletes only an unbound isolated-QA verification session authenticated by its retrieval-token hash.';

notify pgrst, 'reload schema';

commit;
