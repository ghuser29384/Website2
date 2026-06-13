create table if not exists public.moral_trade_offer_validity_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'live_offer_publication',
      'match_candidate_generation',
      'matched_trade_lock',
      'payment_capture',
      'reliance',
      'public_completion_count',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  validity_required_bool boolean not null default false,
  reviewed_record_count integer not null default 0 check (reviewed_record_count >= 0),
  active_validity_record_count integer not null default 0 check (active_validity_record_count >= 0),
  stale_or_expired_record_count integer not null default 0 check (stale_or_expired_record_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  draft_preview_allowed_bool boolean not null default false,
  live_offer_publication_allowed_bool boolean not null default false,
  match_candidate_generation_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  reliance_allowed_bool boolean not null default false,
  public_completion_count_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_offer_validity_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (reviewed_record_count <= record_count),
  check (active_validity_record_count <= record_count),
  check (stale_or_expired_record_count <= record_count),
  check (draft_preview_allowed_bool = false),
  check (live_offer_publication_allowed_bool = false),
  check (match_candidate_generation_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (reliance_allowed_bool = false),
  check (public_completion_count_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_offer_validity_enforcement_records is
  'Append-only user-owned offer-validity enforcement records. A record stores normalized offer-validity input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize draft preview, live publication, match-candidate generation, matched-trade lock, payment capture, reliance, public completion count, or release-gate promotion.';

create index if not exists moral_trade_offer_validity_enforcement_records_owner_status_idx
  on public.moral_trade_offer_validity_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_offer_validity_enforcement_records_transition_status_idx
  on public.moral_trade_offer_validity_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists moral_trade_offer_validity_enforcement_records_hash_idx
  on public.moral_trade_offer_validity_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_offer_validity_enforcement_records enable row level security;

drop policy if exists "moral_trade_offer_validity_enforcement_records_select_owner"
  on public.moral_trade_offer_validity_enforcement_records;
create policy "moral_trade_offer_validity_enforcement_records_select_owner"
  on public.moral_trade_offer_validity_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_offer_validity_enforcement_records_insert_owner"
  on public.moral_trade_offer_validity_enforcement_records;
create policy "moral_trade_offer_validity_enforcement_records_insert_owner"
  on public.moral_trade_offer_validity_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and draft_preview_allowed_bool = false
    and live_offer_publication_allowed_bool = false
    and match_candidate_generation_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_capture_allowed_bool = false
    and reliance_allowed_bool = false
    and public_completion_count_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
