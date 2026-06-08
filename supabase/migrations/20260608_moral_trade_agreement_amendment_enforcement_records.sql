create table if not exists public.moral_trade_agreement_amendment_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'donation_offset_material_change',
      'pledge_swap_material_change',
      'post_lock_correction',
      'pause_or_early_termination',
      'evidence_standard_change',
      'destination_change'
    )
  ),
  subject_type text not null check (
    subject_type in (
      'locked_donation_offset',
      'locked_pledge_swap',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  amendment_type text not null check (
    amendment_type in (
      'correction',
      'mutual_modification',
      'pause',
      'early_termination',
      'evidence_standard_change',
      'schedule_change',
      'compensation_change',
      'destination_change',
      'baseline_correction',
      'privacy_change',
      'other'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  requires_amendment_bool boolean not null default true,
  requires_applied_amendment_bool boolean not null default false,
  requires_reliance_bearing_transition_bool boolean not null default false,
  requires_renewed_confirmations_bool boolean not null default true,
  requires_neutral_review_bool boolean not null default false,
  policy_count integer not null default 0 check (policy_count >= 0),
  amendment_count integer not null default 0 check (amendment_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  applies_amendment_bool boolean not null default false,
  material_change_allowed_bool boolean not null default false,
  parent_record_mutation_allowed_bool boolean not null default false,
  payment_transition_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  public_metric_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_agreement_amendment_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (applies_amendment_bool = false),
  check (material_change_allowed_bool = false),
  check (parent_record_mutation_allowed_bool = false),
  check (payment_transition_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (public_metric_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_agreement_amendment_enforcement_records is
  'Append-only user-owned agreement-amendment enforcement records. A record stores normalized agreement-amendment evaluation input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot apply amendments, edit parent records, authorize material changes, authorize payment, authorize reliance, or publish public metrics.';

create index if not exists moral_trade_agreement_amendment_enforcement_records_owner_status_idx
  on public.moral_trade_agreement_amendment_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_agreement_amendment_enforcement_records_transition_status_idx
  on public.moral_trade_agreement_amendment_enforcement_records (transition, subject_type, amendment_type, enforcement_status, created_at desc);

create index if not exists moral_trade_agreement_amendment_enforcement_records_hash_idx
  on public.moral_trade_agreement_amendment_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_agreement_amendment_enforcement_records enable row level security;

drop policy if exists "moral_trade_agreement_amendment_enforcement_records_select_owner"
  on public.moral_trade_agreement_amendment_enforcement_records;
create policy "moral_trade_agreement_amendment_enforcement_records_select_owner"
  on public.moral_trade_agreement_amendment_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_agreement_amendment_enforcement_records_insert_owner"
  on public.moral_trade_agreement_amendment_enforcement_records;
create policy "moral_trade_agreement_amendment_enforcement_records_insert_owner"
  on public.moral_trade_agreement_amendment_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and applies_amendment_bool = false
    and material_change_allowed_bool = false
    and parent_record_mutation_allowed_bool = false
    and payment_transition_allowed_bool = false
    and reliance_bearing_transition_allowed_bool = false
    and public_metric_allowed_bool = false
  );
