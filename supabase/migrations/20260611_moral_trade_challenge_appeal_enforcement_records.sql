create table if not exists public.moral_trade_challenge_appeal_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (
    subject in (
      'claim',
      'evidence_row',
      'baseline_concern',
      'disclosure_decision',
      'externality_trigger',
      'completion_state',
      'policy_flag'
    )
  ),
  trigger text not null check (
    trigger in (
      'duplicate_proof',
      'coercive_baseline',
      'wrong_scope_evidence',
      'material_factual_error',
      'privacy_disclosure_error',
      'externality_remedy_gap',
      'reviewer_conflict',
      'policy_misapplied'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  requires_appeal_case_bool boolean not null default true,
  requires_neutral_review_bool boolean not null default true,
  policy_count integer not null default 0 check (policy_count >= 0),
  appeal_case_count integer not null default 0 check (appeal_case_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  opens_appeal_bool boolean not null default false,
  corrects_record_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  safety_blocker_waiver_allowed_bool boolean not null default false,
  settled_obligation_reopen_allowed_bool boolean not null default false,
  public_metric_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_challenge_appeal_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (opens_appeal_bool = false),
  check (corrects_record_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (safety_blocker_waiver_allowed_bool = false),
  check (settled_obligation_reopen_allowed_bool = false),
  check (public_metric_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_challenge_appeal_enforcement_records is
  'Append-only user-owned challenge-appeal enforcement records. A record stores normalized appeal-case enforcement input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot open appeals, correct records, authorize reliance, waive safety blockers, reopen settled obligations, or publish public metrics.';

create index if not exists moral_trade_challenge_appeal_enforcement_records_owner_status_idx
  on public.moral_trade_challenge_appeal_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_challenge_appeal_enforcement_records_subject_trigger_idx
  on public.moral_trade_challenge_appeal_enforcement_records (subject, trigger, enforcement_status, created_at desc);

create index if not exists moral_trade_challenge_appeal_enforcement_records_hash_idx
  on public.moral_trade_challenge_appeal_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_challenge_appeal_enforcement_records enable row level security;

drop policy if exists "moral_trade_challenge_appeal_enforcement_records_select_owner"
  on public.moral_trade_challenge_appeal_enforcement_records;
create policy "moral_trade_challenge_appeal_enforcement_records_select_owner"
  on public.moral_trade_challenge_appeal_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_challenge_appeal_enforcement_records_insert_owner"
  on public.moral_trade_challenge_appeal_enforcement_records;
create policy "moral_trade_challenge_appeal_enforcement_records_insert_owner"
  on public.moral_trade_challenge_appeal_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and opens_appeal_bool = false
    and corrects_record_bool = false
    and reliance_bearing_transition_allowed_bool = false
    and safety_blocker_waiver_allowed_bool = false
    and settled_obligation_reopen_allowed_bool = false
    and public_metric_allowed_bool = false
  );
