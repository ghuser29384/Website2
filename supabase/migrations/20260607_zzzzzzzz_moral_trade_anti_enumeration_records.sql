alter table public.moral_trade_policy_snapshots
  drop constraint if exists moral_trade_policy_snapshots_subject_kind_check;

alter table public.moral_trade_policy_snapshots
  add constraint moral_trade_policy_snapshots_subject_kind_check
  check (
    subject_kind in (
      'release_gate',
      'state_interpretation',
      'payment_capture',
      'payout_release',
      'refund_cancellation',
      'provider_source_authentication',
      'time_authority',
      'notification',
      'fx',
      'platform_fee',
      'public_metrics',
      'data_retention',
      'participant_eligibility',
      'recipient_destination_verification',
      'account_security',
      'reviewer_quality',
      'anti_enumeration',
      'backup_recovery',
      'deployment_release',
      'configuration_snapshot',
      'schema_migration',
      'environment_data_isolation',
      'financial_reconciliation',
      'audit_integrity',
      'data_security'
    )
  );

create table if not exists public.moral_trade_anti_enumeration_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-anti-enumeration-policy-v0.1-2026-06',
  surface text not null check (
    surface in (
      'public_search',
      'signed_in_search',
      'public_browse',
      'preview_generation',
      'invite_link_creation',
      'match_candidate_browsing',
      'transparency_report'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  rate_limit_required_bool boolean not null default true,
  query_fingerprint_required_bool boolean not null default true,
  access_event_logging_required_bool boolean not null default true,
  bucketed_counts_required_bool boolean not null default true,
  sparse_suppression_required_bool boolean not null default true,
  timing_equalization_required_bool boolean not null default true,
  incident_escalation_required_bool boolean not null default true,
  max_repeated_fingerprint_count integer not null default 3 check (max_repeated_fingerprint_count >= 0),
  min_public_bucket_size integer not null default 3 check (min_public_bucket_size >= 0),
  max_event_age_days integer not null default 30 check (max_event_age_days >= 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_anti_enumeration_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, surface)
);

comment on table public.moral_trade_anti_enumeration_policies is
  'Frozen anti-enumeration policies for discovery surfaces. Missing rate limits, query fingerprints, access-event logging, bucketed counts, sparse suppression, timing equalization, or repeated-probe audits fail closed.';

create table if not exists public.moral_trade_discovery_access_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (
    surface in (
      'public_search',
      'signed_in_search',
      'public_browse',
      'preview_generation',
      'invite_link_creation',
      'match_candidate_browsing',
      'transparency_report'
    )
  ),
  anti_enumeration_policy_ref uuid not null references public.moral_trade_anti_enumeration_policies (id) on delete restrict,
  actor_id_hash text check (actor_id_hash is null or actor_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  query_fingerprint text check (query_fingerprint is null or query_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  source_route text not null default '',
  result_count_bucket text not null default 'not_returned' check (
    result_count_bucket in ('zero', 'one_or_two_suppressed', 'three_to_nine', 'ten_to_forty_nine', 'fifty_plus', 'not_returned')
  ),
  raw_query_stored_bool boolean not null default false,
  exact_result_count_exposed_bool boolean not null default false,
  sparse_suppression_applied_bool boolean not null default false,
  timing_equalized_bool boolean not null default false,
  rate_limit_applied_bool boolean not null default false,
  delayed_response_applied_bool boolean not null default false,
  redacted_response_applied_bool boolean not null default false,
  event_hash text not null check (event_hash ~ '^sha256:[a-f0-9]{64}$'),
  occurred_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_discovery_access_events (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_discovery_access_events is
  'Hash-backed discovery access events for anti-enumeration accounting. Events record fingerprints, buckets, and suppression flags without raw query text or exact hidden counts.';

create table if not exists public.moral_trade_discovery_probe_audits (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (
    surface in (
      'public_search',
      'signed_in_search',
      'public_browse',
      'preview_generation',
      'invite_link_creation',
      'match_candidate_browsing',
      'transparency_report'
    )
  ),
  anti_enumeration_policy_ref uuid not null references public.moral_trade_anti_enumeration_policies (id) on delete restrict,
  query_fingerprint text not null check (query_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  audit_status text not null default 'under_review' check (
    audit_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  event_count integer not null default 0 check (event_count >= 0),
  unique_actor_hash_count integer not null default 0 check (unique_actor_hash_count >= 0),
  repeated_fingerprint_count integer not null default 0 check (repeated_fingerprint_count >= 0),
  sparse_result_hit_count integer not null default 0 check (sparse_result_hit_count >= 0),
  timing_variance_ms integer not null default 0 check (timing_variance_ms >= 0),
  escalation_incident_ref text,
  audit_hash text not null check (audit_hash ~ '^sha256:[a-f0-9]{64}$'),
  audited_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_discovery_probe_audits (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_discovery_probe_audits is
  'Repeated-probe audit records for discovery surfaces. Budget breaches, sparse-result probing, timing variance, or missing incident escalation block discovery reliance.';

create index if not exists moral_trade_anti_enumeration_policies_surface_idx
  on public.moral_trade_anti_enumeration_policies (surface, status, created_at desc);

create index if not exists moral_trade_discovery_access_events_surface_idx
  on public.moral_trade_discovery_access_events (surface, query_fingerprint, occurred_at desc);

create index if not exists moral_trade_discovery_access_events_actor_idx
  on public.moral_trade_discovery_access_events (actor_id_hash, surface, occurred_at desc)
  where actor_id_hash is not null;

create index if not exists moral_trade_discovery_probe_audits_fingerprint_idx
  on public.moral_trade_discovery_probe_audits (surface, query_fingerprint, audit_status, created_at desc);

alter table public.moral_trade_anti_enumeration_policies enable row level security;
alter table public.moral_trade_discovery_access_events enable row level security;
alter table public.moral_trade_discovery_probe_audits enable row level security;
