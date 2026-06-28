create table if not exists public.background_claim_assurance_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  claim_kind text not null check (
    claim_kind in (
      'credential',
      'authority',
      'funding_capacity',
      'institutional_affiliation',
      'legal_expertise',
      'medical_expertise',
      'immigration_expertise',
      'fiscal_sponsorship',
      'scarce_resource',
      'safety_relevant_capability',
      'other_high_impact'
    )
  ),
  broad_claim_key text not null check (broad_claim_key ~ '^[a-z0-9][a-z0-9:_-]{0,95}$'),
  assurance_level text not null default 'self_attested' check (
    assurance_level in (
      'self_attested',
      'evidence_submitted',
      'operator_reviewed',
      'externally_verified',
      'expired',
      'revoked',
      'rejected'
    )
  ),
  allowed_purpose_bindings jsonb not null default '[]'::jsonb,
  allowed_surface_keys text[] not null default '{}',
  evidence_state text not null default 'none' check (
    evidence_state in (
      'none',
      'redacted_summary',
      'vault_bound_evidence',
      'external_verification_ref'
    )
  ),
  redacted_evidence_summary text,
  review_state text not null default 'pending'
    check (review_state in ('pending', 'approved', 'rejected', 'stale', 'revoked')),
  assurance_version text not null,
  claim_assurance_taxonomy_version_snapshot text not null,
  claim_assurance_taxonomy_hash_snapshot text not null,
  confirmed_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (
    participant_id,
    claim_kind,
    broad_claim_key,
    assurance_version
  )
);

create index if not exists background_claim_assurance_participant_idx
on public.background_claim_assurance_records (
  participant_id,
  claim_kind,
  review_state,
  assurance_level,
  expires_at
);

drop trigger if exists background_claim_assurance_set_updated_at on public.background_claim_assurance_records;
create trigger background_claim_assurance_set_updated_at
before update on public.background_claim_assurance_records
for each row execute function public.set_updated_at();

alter table public.background_claim_assurance_records enable row level security;

drop policy if exists "background_claim_assurance_select_own" on public.background_claim_assurance_records;
create policy "background_claim_assurance_select_own"
on public.background_claim_assurance_records
for select
to authenticated
using (participant_id = (select auth.uid()));

drop policy if exists "background_claim_assurance_insert_own" on public.background_claim_assurance_records;
create policy "background_claim_assurance_insert_own"
on public.background_claim_assurance_records
for insert
to authenticated
with check (participant_id = (select auth.uid()));

drop policy if exists "background_claim_assurance_update_own" on public.background_claim_assurance_records;
create policy "background_claim_assurance_update_own"
on public.background_claim_assurance_records
for update
to authenticated
using (participant_id = (select auth.uid()))
with check (participant_id = (select auth.uid()));

grant all on public.background_claim_assurance_records to service_role;

create table if not exists public.background_pairwise_safety_preferences (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  preference_kind text not null check (
    preference_kind in ('do_not_match', 'block', 'mute', 'no_reminders', 'no_recontact')
  ),
  scope_kind text not null check (
    scope_kind in (
      'profile',
      'organization',
      'cohort',
      'partner',
      'intro_request',
      'purpose_code',
      'global_background_networking'
    )
  ),
  scope_value_internal text not null check (length(scope_value_internal) between 3 and 160),
  purpose_code text check (
    purpose_code is null
    or purpose_code in (
      'moral_trade_offer',
      'donation_offset',
      'pledge_swap',
      'moral_public_good',
      'research_collaboration',
      'community_intro'
    )
  ),
  purpose_policy_version text check (
    purpose_policy_version is null
    or purpose_policy_version = 'background-purpose-policy-v1'
  ),
  purpose_code_scope text generated always as (coalesce(purpose_code, '')) stored,
  state text not null default 'active' check (state in ('active', 'paused', 'revoked', 'expired')),
  reason_code text check (
    reason_code is null
    or reason_code in (
      'privacy',
      'safety',
      'not_relevant',
      'bad_timing',
      'already_connected',
      'participant_request',
      'operator_safety'
    )
  ),
  created_from_event_kind text check (
    created_from_event_kind is null
    or created_from_event_kind in (
      'manual',
      'dismissal',
      'report',
      'declined_intro',
      'post_consent_interaction',
      'operator_safety_action'
    )
  ),
  safety_preference_version text not null,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create index if not exists background_pairwise_safety_participant_idx
on public.background_pairwise_safety_preferences (
  participant_id,
  preference_kind,
  scope_kind,
  state,
  expires_at
);

alter table public.background_pairwise_safety_preferences
drop constraint if exists background_pairwise_safety_unique_scope;

alter table public.background_pairwise_safety_preferences
add constraint background_pairwise_safety_unique_scope unique (
  participant_id,
  preference_kind,
  scope_kind,
  scope_value_internal,
  purpose_code_scope
);

drop trigger if exists background_pairwise_safety_set_updated_at on public.background_pairwise_safety_preferences;
create trigger background_pairwise_safety_set_updated_at
before update on public.background_pairwise_safety_preferences
for each row execute function public.set_updated_at();

alter table public.background_pairwise_safety_preferences enable row level security;

drop policy if exists "background_pairwise_safety_select_own" on public.background_pairwise_safety_preferences;
create policy "background_pairwise_safety_select_own"
on public.background_pairwise_safety_preferences
for select
to authenticated
using (participant_id = (select auth.uid()));

drop policy if exists "background_pairwise_safety_insert_own" on public.background_pairwise_safety_preferences;
create policy "background_pairwise_safety_insert_own"
on public.background_pairwise_safety_preferences
for insert
to authenticated
with check (participant_id = (select auth.uid()));

drop policy if exists "background_pairwise_safety_update_own" on public.background_pairwise_safety_preferences;
create policy "background_pairwise_safety_update_own"
on public.background_pairwise_safety_preferences
for update
to authenticated
using (participant_id = (select auth.uid()))
with check (participant_id = (select auth.uid()));

grant all on public.background_pairwise_safety_preferences to service_role;
