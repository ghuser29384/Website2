create table if not exists public.moral_trade_baseline_integrity_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'donation_offset_lock',
      'pledge_swap_lock',
      'broad_match_candidate',
      'public_goods_round',
      'post_lock_amendment'
    )
  ),
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  launch_classification text not null check (
    launch_classification in (
      'clearable_moral_trade',
      'preview_only',
      'rejected_threat_externality',
      'manual_review_required',
      'unclassified'
    )
  ),
  requires_clearable_transition_bool boolean not null default false,
  requires_reliance_bearing_transition_bool boolean not null default false,
  requires_assessment_bool boolean not null default true,
  policy_count integer not null default 0 check (policy_count >= 0),
  assessment_count integer not null default 0 check (assessment_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  creates_clearable_transition_bool boolean not null default false,
  payable_transition_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  public_metric_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_baseline_integrity_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (creates_clearable_transition_bool = false),
  check (payable_transition_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (public_metric_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_baseline_integrity_enforcement_records is
  'Append-only user-owned baseline-integrity enforcement records. A record stores normalized baseline-integrity evaluation input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot create clearable transitions, authorize payment, authorize reliance, or publish public metrics.';

create index if not exists moral_trade_baseline_integrity_enforcement_records_owner_status_idx
  on public.moral_trade_baseline_integrity_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_baseline_integrity_enforcement_records_transition_status_idx
  on public.moral_trade_baseline_integrity_enforcement_records (transition, subject_type, enforcement_status, created_at desc);

create index if not exists moral_trade_baseline_integrity_enforcement_records_hash_idx
  on public.moral_trade_baseline_integrity_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_baseline_integrity_enforcement_records enable row level security;

drop policy if exists "moral_trade_baseline_integrity_enforcement_records_select_owner"
  on public.moral_trade_baseline_integrity_enforcement_records;
create policy "moral_trade_baseline_integrity_enforcement_records_select_owner"
  on public.moral_trade_baseline_integrity_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_baseline_integrity_enforcement_records_insert_owner"
  on public.moral_trade_baseline_integrity_enforcement_records;
create policy "moral_trade_baseline_integrity_enforcement_records_insert_owner"
  on public.moral_trade_baseline_integrity_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and creates_clearable_transition_bool = false
    and payable_transition_allowed_bool = false
    and reliance_bearing_transition_allowed_bool = false
    and public_metric_allowed_bool = false
  );
