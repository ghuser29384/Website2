create table if not exists public.moral_trade_clearing_preview_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  source_offer_id uuid references public.offers (id) on delete set null,
  track text not null check (track in ('donation_offset', 'pledge_swap')),
  mode text not null check (mode in ('match_candidate', 'final_lock_proposal')),
  release_stage text not null check (
    release_stage in ('donation_offset_preview_no_capture', 'pledge_swap_preview_manual_review_only')
  ),
  preview_status text not null check (preview_status in ('preview_ready', 'blocked_preview_only')),
  matching_clearing_run_ref text not null default '',
  final_lock_proposal_ref text not null default '',
  required_fresh_confirmations integer not null default 0 check (required_fresh_confirmations >= 0),
  fresh_confirmation_count integer not null default 0 check (fresh_confirmation_count >= 0),
  matched_counterparty_volume_cents integer not null default 0 check (matched_counterparty_volume_cents >= 0),
  unmatched_residual_cents integer not null default 0 check (unmatched_residual_cents >= 0),
  clearing_ratio_bps integer not null default 0 check (clearing_ratio_bps >= 0 and clearing_ratio_bps <= 1000000),
  capture_allowed_bool boolean not null default false,
  reliance_bearing_bool boolean not null default false,
  match_candidate_creates_deal_bool boolean not null default false,
  requires_final_lock_proposal_bool boolean not null default true,
  requires_fresh_confirmations_bool boolean not null default true,
  preview_input_json jsonb not null,
  preview_result_json jsonb not null,
  preview_section_statuses jsonb not null default '[]'::jsonb,
  user_facing_blockers text[] not null default '{}',
  blocker_codes text[] not null default '{}',
  policy_snapshot_ref text not null default '',
  state_interpretation_policy_ref text not null default '',
  contract_version text not null,
  validator_version text not null,
  preview_hash text not null check (preview_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  superseded_by uuid references public.moral_trade_clearing_preview_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (capture_allowed_bool = false),
  check (reliance_bearing_bool = false),
  check (match_candidate_creates_deal_bool = false),
  check (requires_final_lock_proposal_bool = true),
  check (requires_fresh_confirmations_bool = true),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_clearing_preview_records is
  'Append-only user-owned clearing-preview execution records. A record stores normalized donation-offset or pledge-swap preview inputs, section statuses, blocker copy, blocker codes, and preview hash while enforcing that preview records never authorize capture, reliance, or deal formation.';

create index if not exists moral_trade_clearing_preview_records_owner_status_idx
  on public.moral_trade_clearing_preview_records (owner_profile_id, preview_status, created_at desc);

create index if not exists moral_trade_clearing_preview_records_track_status_idx
  on public.moral_trade_clearing_preview_records (track, release_stage, preview_status, created_at desc);

create index if not exists moral_trade_clearing_preview_records_hash_idx
  on public.moral_trade_clearing_preview_records (preview_hash, created_at desc);

alter table public.moral_trade_clearing_preview_records enable row level security;

drop policy if exists "moral_trade_clearing_preview_records_select_owner"
  on public.moral_trade_clearing_preview_records;
create policy "moral_trade_clearing_preview_records_select_owner"
  on public.moral_trade_clearing_preview_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_clearing_preview_records_insert_owner"
  on public.moral_trade_clearing_preview_records;
create policy "moral_trade_clearing_preview_records_insert_owner"
  on public.moral_trade_clearing_preview_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and capture_allowed_bool = false
    and reliance_bearing_bool = false
    and match_candidate_creates_deal_bool = false
    and requires_final_lock_proposal_bool = true
    and requires_fresh_confirmations_bool = true
  );
