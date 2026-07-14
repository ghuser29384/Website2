create table if not exists public.background_candidate_reference_handles (
  id uuid primary key default gen_random_uuid(),
  delegate_run_id uuid not null references public.background_helper_runs (id) on delete cascade,
  handle_token text not null unique check (handle_token ~ '^bgch_[0-9a-f]{32}$'),
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  purpose_code text not null check (
    purpose_code in (
      'moral_trade_offer',
      'donation_offset',
      'pledge_swap',
      'moral_public_good',
      'research_collaboration',
      'community_intro'
    )
  ),
  purpose_policy_version text not null default 'background-purpose-policy-v1'
    check (purpose_policy_version = 'background-purpose-policy-v1'),
  cohort_scope_id text,
  handle_state text not null default 'active'
    check (handle_state in ('active', 'redacted', 'anonymized', 'expired')),
  allowed_resolution_reasons text[] not null default '{}'
    check (
      allowed_resolution_reasons <@ array[
        'operator_review',
        'mutual_consent',
        'safety_hold',
        'legal_hold'
      ]::text[]
    ),
  policy_decision_id text,
  retention_expires_at timestamptz not null,
  resolved_at timestamptz,
  redacted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (delegate_run_id, candidate_profile_id, purpose_code)
);

create index if not exists background_candidate_handles_run_idx
on public.background_candidate_reference_handles (delegate_run_id, purpose_code, handle_state);

create index if not exists background_candidate_handles_retention_idx
on public.background_candidate_reference_handles (handle_state, retention_expires_at asc);

alter table public.background_candidate_reference_handles enable row level security;
grant all on public.background_candidate_reference_handles to service_role;

create table if not exists public.background_entity_resolution_claims (
  id uuid primary key default gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles (id) on delete cascade,
  entity_kind text not null check (
    entity_kind in ('person', 'organization', 'collective', 'partner_seat')
  ),
  resolution_kind text not null check (
    resolution_kind in (
      'self_claimed',
      'verified_domain',
      'verified_document',
      'operator_confirmed',
      'partner_attested',
      'imported_alias',
      'model_suggested_duplicate'
    )
  ),
  resolution_state text not null default 'pending_review'
    check (
      resolution_state in (
        'confirmed',
        'pending_review',
        'disputed',
        'rejected',
        'stale',
        'expired'
      )
    ),
  canonical_entity_ref text,
  evidence_redacted_summary text not null default '',
  allowed_purpose_bindings jsonb not null default '[]'::jsonb,
  allowed_surface_keys text[] not null default '{}',
  reviewed_by text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists background_entity_resolution_subject_idx
on public.background_entity_resolution_claims (
  subject_profile_id,
  resolution_state,
  resolution_kind,
  expires_at
);

drop trigger if exists background_entity_resolution_set_updated_at on public.background_entity_resolution_claims;
create trigger background_entity_resolution_set_updated_at
before update on public.background_entity_resolution_claims
for each row execute function public.set_updated_at();

alter table public.background_entity_resolution_claims enable row level security;
grant all on public.background_entity_resolution_claims to service_role;

create table if not exists public.background_power_asymmetry_reviews (
  id uuid primary key default gen_random_uuid(),
  requester_handle_id uuid references public.background_candidate_reference_handles (id) on delete set null,
  candidate_handle_id uuid references public.background_candidate_reference_handles (id) on delete set null,
  relationship_context text not null check (
    relationship_context in (
      'none',
      'funder_grantee',
      'employer_applicant',
      'landlord_tenant',
      'clinician_client',
      'legal_or_immigration_adviser_client',
      'mentor_mentee',
      'platform_admin_user',
      'regulator_regulated_party'
    )
  ),
  purpose_code text not null check (
    purpose_code in (
      'moral_trade_offer',
      'donation_offset',
      'pledge_swap',
      'moral_public_good',
      'research_collaboration',
      'community_intro'
    )
  ),
  purpose_policy_version text not null default 'background-purpose-policy-v1'
    check (purpose_policy_version = 'background-purpose-policy-v1'),
  review_state text not null default 'pending_review'
    check (review_state in ('pending_review', 'approved', 'blocked', 'expired', 'revoked')),
  allowed_surface_keys text[] not null default '{}',
  safeguard_label text not null default 'review/consent safeguard',
  boost_policy text not null default 'boosts_prohibited'
    check (boost_policy = 'boosts_prohibited'),
  redacted_summary text not null default '',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists background_power_asymmetry_review_idx
on public.background_power_asymmetry_reviews (
  relationship_context,
  purpose_code,
  review_state,
  expires_at
);

drop trigger if exists background_power_asymmetry_reviews_set_updated_at on public.background_power_asymmetry_reviews;
create trigger background_power_asymmetry_reviews_set_updated_at
before update on public.background_power_asymmetry_reviews
for each row execute function public.set_updated_at();

alter table public.background_power_asymmetry_reviews enable row level security;
grant all on public.background_power_asymmetry_reviews to service_role;
