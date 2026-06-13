create table if not exists public.moral_trade_user_safety_content_moderation_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'public_publication',
      'reviewer_actionable',
      'contact_introduction',
      'invite_link_creation',
      'reliance_bearing_preview',
      'payment_capture',
      'public_profile_amplification',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_content_type_count integer not null default 0 check (required_content_type_count >= 0),
  required_user_safety_dimension_count integer not null default 0 check (required_user_safety_dimension_count >= 0),
  passing_moderation_count integer not null default 0 check (passing_moderation_count >= 0),
  passing_user_safety_count integer not null default 0 check (passing_user_safety_count >= 0),
  moderation_record_count integer not null default 0 check (moderation_record_count >= 0),
  user_safety_record_count integer not null default 0 check (user_safety_record_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  draft_preview_allowed_bool boolean not null default false,
  public_publication_allowed_bool boolean not null default false,
  reviewer_actionable_allowed_bool boolean not null default false,
  contact_introduction_allowed_bool boolean not null default false,
  invite_link_creation_allowed_bool boolean not null default false,
  reliance_bearing_preview_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  public_profile_amplification_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_user_safety_content_moderation_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (passing_moderation_count <= required_content_type_count),
  check (passing_user_safety_count <= required_user_safety_dimension_count),
  check (moderation_record_count <= 96),
  check (user_safety_record_count <= 96),
  check (draft_preview_allowed_bool = false),
  check (public_publication_allowed_bool = false),
  check (reviewer_actionable_allowed_bool = false),
  check (contact_introduction_allowed_bool = false),
  check (invite_link_creation_allowed_bool = false),
  check (reliance_bearing_preview_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (public_profile_amplification_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_user_safety_content_moderation_enforcement_records is
  'Append-only user-owned user-safety/content-moderation enforcement records. A record stores normalized safety and moderation input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize public publication, reviewer actionability, contact introduction, invite-link creation, reliance-bearing preview, payment capture, profile amplification, or release-gate promotion.';

create index if not exists mt_user_safety_moderation_enforce_owner_status_idx
  on public.moral_trade_user_safety_content_moderation_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_user_safety_moderation_enforce_transition_idx
  on public.moral_trade_user_safety_content_moderation_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists mt_user_safety_moderation_enforce_hash_idx
  on public.moral_trade_user_safety_content_moderation_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_user_safety_content_moderation_enforcement_records enable row level security;

drop policy if exists "mt_user_safety_moderation_enforce_select_owner"
  on public.moral_trade_user_safety_content_moderation_enforcement_records;
create policy "mt_user_safety_moderation_enforce_select_owner"
  on public.moral_trade_user_safety_content_moderation_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_user_safety_moderation_enforce_insert_owner"
  on public.moral_trade_user_safety_content_moderation_enforcement_records;
create policy "mt_user_safety_moderation_enforce_insert_owner"
  on public.moral_trade_user_safety_content_moderation_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and draft_preview_allowed_bool = false
    and public_publication_allowed_bool = false
    and reviewer_actionable_allowed_bool = false
    and contact_introduction_allowed_bool = false
    and invite_link_creation_allowed_bool = false
    and reliance_bearing_preview_allowed_bool = false
    and payment_capture_allowed_bool = false
    and public_profile_amplification_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
