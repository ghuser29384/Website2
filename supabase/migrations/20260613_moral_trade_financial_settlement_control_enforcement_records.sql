create table if not exists public.moral_trade_financial_settlement_control_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'public_preview',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'challenge_window_default',
      'payout_milestone_release',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_control_count integer not null default 0 check (required_control_count >= 0),
  passing_control_count integer not null default 0 check (passing_control_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
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
  public_preview_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  challenge_window_default_allowed_bool boolean not null default false,
  payout_milestone_release_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_financial_settlement_control_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (passing_control_count <= required_control_count),
  check (record_count <= 64),
  check (draft_preview_allowed_bool = false),
  check (public_preview_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (challenge_window_default_allowed_bool = false),
  check (payout_milestone_release_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_financial_settlement_control_enforcement_records is
  'Append-only user-owned financial-settlement control enforcement records. A record stores normalized settlement control input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize public preview, matched-trade lock, payment authorization, payment capture, challenge-window default, payout milestone release, public metric publication, or release-gate promotion.';

create index if not exists mt_fin_settlement_control_enforce_owner_status_idx
  on public.moral_trade_financial_settlement_control_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_fin_settlement_control_enforce_transition_idx
  on public.moral_trade_financial_settlement_control_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists mt_fin_settlement_control_enforce_hash_idx
  on public.moral_trade_financial_settlement_control_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_financial_settlement_control_enforcement_records enable row level security;

drop policy if exists "mt_fin_settlement_control_enforce_select_owner"
  on public.moral_trade_financial_settlement_control_enforcement_records;
create policy "mt_fin_settlement_control_enforce_select_owner"
  on public.moral_trade_financial_settlement_control_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_fin_settlement_control_enforce_insert_owner"
  on public.moral_trade_financial_settlement_control_enforcement_records;
create policy "mt_fin_settlement_control_enforce_insert_owner"
  on public.moral_trade_financial_settlement_control_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and draft_preview_allowed_bool = false
    and public_preview_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and challenge_window_default_allowed_bool = false
    and payout_milestone_release_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
