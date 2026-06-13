create table if not exists public.moral_trade_participant_confirmation_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_type text not null check (
    subject_type in (
      'common_ground_budget',
      'marketplace_round',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'agreement_amendment_record',
      'project_set_change',
      'payment_capture',
      'payout_release',
      'privacy_grant',
      'exposure_increase'
    )
  ),
  subject_id_ref text not null,
  participant_id_ref text not null,
  confirmation_scope text not null check (
    confirmation_scope in (
      'budget_activation',
      'round_lock',
      'final_lock',
      'cleared_agreement',
      'renewed_material_change',
      'project_set_change_approval',
      'payment_capture',
      'payout_release',
      'privacy_disclosure',
      'exposure_increase'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  routing_allowed_bool boolean not null default false,
  clearing_allowed_bool boolean not null default false,
  capture_allowed_bool boolean not null default false,
  payout_release_allowed_bool boolean not null default false,
  privacy_disclosure_allowed_bool boolean not null default false,
  public_metric_release_allowed_bool boolean not null default false,
  material_change_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_participant_confirmation_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (routing_allowed_bool = false),
  check (clearing_allowed_bool = false),
  check (capture_allowed_bool = false),
  check (payout_release_allowed_bool = false),
  check (privacy_disclosure_allowed_bool = false),
  check (public_metric_release_allowed_bool = false),
  check (material_change_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_participant_confirmation_enforcement_records is
  'Append-only user-owned participant-confirmation enforcement records. A record stores normalized private confirmation input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize routing, clearing, capture, payout release, privacy disclosure, public metric publication, material-term changes, or release-gate promotion.';

create index if not exists mt_participant_confirmation_enforce_owner_status_idx
  on public.moral_trade_participant_confirmation_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_participant_confirmation_enforce_subject_idx
  on public.moral_trade_participant_confirmation_enforcement_records (subject_type, subject_id_ref, confirmation_scope, enforcement_status, created_at desc);

create index if not exists mt_participant_confirmation_enforce_hash_idx
  on public.moral_trade_participant_confirmation_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_participant_confirmation_enforcement_records enable row level security;

drop policy if exists "mt_participant_confirmation_enforce_select_owner"
  on public.moral_trade_participant_confirmation_enforcement_records;
create policy "mt_participant_confirmation_enforce_select_owner"
  on public.moral_trade_participant_confirmation_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_participant_confirmation_enforce_insert_owner"
  on public.moral_trade_participant_confirmation_enforcement_records;
create policy "mt_participant_confirmation_enforce_insert_owner"
  on public.moral_trade_participant_confirmation_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and routing_allowed_bool = false
    and clearing_allowed_bool = false
    and capture_allowed_bool = false
    and payout_release_allowed_bool = false
    and privacy_disclosure_allowed_bool = false
    and public_metric_release_allowed_bool = false
    and material_change_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
