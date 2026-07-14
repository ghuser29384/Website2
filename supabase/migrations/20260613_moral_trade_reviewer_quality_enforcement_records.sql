create table if not exists public.moral_trade_reviewer_quality_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  review_type text not null check (
    review_type in (
      'matching_clearing',
      'release_gate_approval',
      'recipient_destination_verification',
      'privacy_grant_approval',
      'evidence_acceptance',
      'impact_claim_publication',
      'appeal_resolution',
      'incident_closure',
      'payout_release',
      'blocker_override'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_policy_count integer not null default 0 check (required_policy_count >= 0),
  required_decision_count integer not null default 0 check (required_decision_count >= 0),
  policy_count integer not null default 0 check (policy_count >= 0),
  decision_count integer not null default 0 check (decision_count >= 0),
  audit_count integer not null default 0 check (audit_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  matching_clearing_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  recipient_destination_verification_allowed_bool boolean not null default false,
  privacy_disclosure_allowed_bool boolean not null default false,
  evidence_acceptance_allowed_bool boolean not null default false,
  impact_claim_publication_allowed_bool boolean not null default false,
  appeal_resolution_allowed_bool boolean not null default false,
  incident_closure_allowed_bool boolean not null default false,
  payout_release_allowed_bool boolean not null default false,
  blocker_override_allowed_bool boolean not null default false,
  public_metric_release_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_reviewer_quality_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (policy_count <= 32),
  check (decision_count <= 96),
  check (audit_count <= 64),
  check (matching_clearing_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  check (recipient_destination_verification_allowed_bool = false),
  check (privacy_disclosure_allowed_bool = false),
  check (evidence_acceptance_allowed_bool = false),
  check (impact_claim_publication_allowed_bool = false),
  check (appeal_resolution_allowed_bool = false),
  check (incident_closure_allowed_bool = false),
  check (payout_release_allowed_bool = false),
  check (blocker_override_allowed_bool = false),
  check (public_metric_release_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_reviewer_quality_enforcement_records is
  'Append-only user-owned reviewer-quality enforcement records. A record stores normalized private policy, decision, and audit summaries, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize clearing, release gates, recipient verification, privacy disclosure, evidence acceptance, impact publication, appeal resolution, incident closure, payout release, blocker overrides, public metrics, or release-gate promotion.';

create index if not exists mt_reviewer_quality_enforce_owner_status_idx
  on public.moral_trade_reviewer_quality_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_reviewer_quality_enforce_type_status_idx
  on public.moral_trade_reviewer_quality_enforcement_records (review_type, enforcement_status, created_at desc);

create index if not exists mt_reviewer_quality_enforce_hash_idx
  on public.moral_trade_reviewer_quality_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_reviewer_quality_enforcement_records enable row level security;

drop policy if exists "mt_reviewer_quality_enforce_select_owner"
  on public.moral_trade_reviewer_quality_enforcement_records;
create policy "mt_reviewer_quality_enforce_select_owner"
  on public.moral_trade_reviewer_quality_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_reviewer_quality_enforce_insert_owner"
  on public.moral_trade_reviewer_quality_enforcement_records;
create policy "mt_reviewer_quality_enforce_insert_owner"
  on public.moral_trade_reviewer_quality_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and matching_clearing_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
    and recipient_destination_verification_allowed_bool = false
    and privacy_disclosure_allowed_bool = false
    and evidence_acceptance_allowed_bool = false
    and impact_claim_publication_allowed_bool = false
    and appeal_resolution_allowed_bool = false
    and incident_closure_allowed_bool = false
    and payout_release_allowed_bool = false
    and blocker_override_allowed_bool = false
    and public_metric_release_allowed_bool = false
  );
