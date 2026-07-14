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

create table if not exists public.moral_trade_account_security_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  step_up_required_actions text[] not null default '{}',
  cooldown_required_actions text[] not null default '{}',
  high_risk_event_window_hours integer not null default 72 check (high_risk_event_window_hours >= 0),
  notice_required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_account_security_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (
    event_type in (
      'password_change',
      'email_change',
      'mfa_change',
      'new_device',
      'session_anomaly',
      'payment_method_change',
      'participant_identity_change',
      'account_recovery',
      'manual_review'
    )
  ),
  risk_status text not null default 'under_review' check (
    risk_status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'high_risk_event_open')
  ),
  policy_snapshot_id uuid references public.moral_trade_policy_snapshots (id) on delete restrict,
  notice_record_status text not null default 'missing' check (
    notice_record_status in ('delivered', 'not_required_for_stage', 'missing', 'failed', 'stale')
  ),
  step_up_status text not null default 'missing' check (
    step_up_status in ('passed', 'not_required_for_stage', 'missing', 'failed', 'stale')
  ),
  cooldown_until timestamptz,
  event_hash text not null check (event_hash ~ '^sha256:[a-f0-9]{64}$'),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_backup_recovery_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  restore_test_required boolean not null default true,
  preserves_hash_chains boolean not null default true,
  preserves_key_versions boolean not null default true,
  preserves_legal_holds boolean not null default true,
  preserves_deletion_redaction_decisions boolean not null default true,
  max_checkpoint_age_hours integer not null default 24 check (max_checkpoint_age_hours > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_backup_recovery_checkpoints (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.moral_trade_backup_recovery_policies (id) on delete restrict,
  checkpoint_kind text not null check (checkpoint_kind in ('backup_created', 'restore_test', 'integrity_verify')),
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'restore_failed', 'unverified')
  ),
  backup_ref_hash text not null check (backup_ref_hash ~ '^sha256:[a-f0-9]{64}$'),
  audit_chain_root_hash text not null check (audit_chain_root_hash ~ '^sha256:[a-f0-9]{64}$'),
  key_version_bundle_hash text not null check (key_version_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  legal_hold_manifest_hash text not null check (legal_hold_manifest_hash ~ '^sha256:[a-f0-9]{64}$'),
  redaction_manifest_hash text not null check (redaction_manifest_hash ~ '^sha256:[a-f0-9]{64}$'),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_deployment_release_records (
  id uuid primary key default gen_random_uuid(),
  release_stage text not null,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'drift_detected', 'unverified')
  ),
  code_artifact_hash text not null check (code_artifact_hash ~ '^sha256:[a-f0-9]{64}$'),
  dependency_lockfile_hash text not null check (dependency_lockfile_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_bundle_hash text not null check (policy_snapshot_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  provider_account_binding_hash text not null check (provider_account_binding_hash ~ '^sha256:[a-f0-9]{64}$'),
  payment_mode text not null check (payment_mode in ('none', 'sandbox', 'test', 'live')),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_configuration_snapshots (
  id uuid primary key default gen_random_uuid(),
  deployment_release_id uuid not null references public.moral_trade_deployment_release_records (id) on delete cascade,
  environment text not null check (environment in ('demo', 'sandbox', 'test', 'staging', 'production')),
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'drift_detected', 'unverified')
  ),
  configuration_hash text not null check (configuration_hash ~ '^sha256:[a-f0-9]{64}$'),
  feature_flag_hash text not null check (feature_flag_hash ~ '^sha256:[a-f0-9]{64}$'),
  provider_binding_hash text not null check (provider_binding_hash ~ '^sha256:[a-f0-9]{64}$'),
  secret_presence_hash text not null check (secret_presence_hash ~ '^sha256:[a-f0-9]{64}$'),
  captured_at timestamptz not null default timezone('utc', now()),
  unique (deployment_release_id, environment, configuration_hash)
);

create table if not exists public.moral_trade_configuration_change_records (
  id uuid primary key default gen_random_uuid(),
  configuration_snapshot_id uuid not null references public.moral_trade_configuration_snapshots (id) on delete cascade,
  change_kind text not null check (
    change_kind in ('feature_flag', 'environment_variable', 'provider_binding', 'payment_mode', 'policy_bundle')
  ),
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'drift_detected', 'unverified')
  ),
  previous_hash text not null check (previous_hash ~ '^sha256:[a-f0-9]{64}$'),
  next_hash text not null check (next_hash ~ '^sha256:[a-f0-9]{64}$'),
  privileged_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_schema_migration_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  dry_run_required boolean not null default true,
  rollback_or_forward_fix_required boolean not null default true,
  record_count_check_required boolean not null default true,
  audit_integrity_check_required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_schema_migration_runs (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.moral_trade_schema_migration_policies (id) on delete restrict,
  migration_key text not null,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'unverified')
  ),
  source_schema_hash text not null check (source_schema_hash ~ '^sha256:[a-f0-9]{64}$'),
  target_schema_hash text not null check (target_schema_hash ~ '^sha256:[a-f0-9]{64}$'),
  dry_run_output_hash text not null check (dry_run_output_hash ~ '^sha256:[a-f0-9]{64}$'),
  record_count_hash text not null check (record_count_hash ~ '^sha256:[a-f0-9]{64}$'),
  rollback_plan_hash text not null check (rollback_plan_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_decision_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (migration_key, target_schema_hash)
);

create table if not exists public.moral_trade_environment_data_isolation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  demo_counts_as_live boolean not null default false,
  sandbox_provider_counts_as_live boolean not null default false,
  synthetic_identity_counts_as_supporter boolean not null default false,
  cross_environment_promotion_requires_review boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_environment_data_isolation_records (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.moral_trade_environment_data_isolation_policies (id) on delete restrict,
  source_environment text not null check (source_environment in ('demo', 'sandbox', 'test', 'staging', 'production')),
  target_environment text not null check (target_environment in ('demo', 'sandbox', 'test', 'staging', 'production')),
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'drift_detected', 'unverified')
  ),
  provenance_hash text not null check (provenance_hash ~ '^sha256:[a-f0-9]{64}$'),
  redaction_manifest_hash text not null check (redaction_manifest_hash ~ '^sha256:[a-f0-9]{64}$'),
  live_metric_exclusion_hash text not null check (live_metric_exclusion_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_decision_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  check (source_environment <> 'production' or target_environment = 'production')
);

create table if not exists public.moral_trade_financial_reconciliation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  provider_settlement_required boolean not null default true,
  internal_ledger_match_required boolean not null default true,
  fee_variance_requires_review boolean not null default true,
  unmatched_event_blocks_release boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_financial_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.moral_trade_financial_reconciliation_policies (id) on delete restrict,
  subject_kind text not null check (subject_kind in ('round', 'payout_milestone', 'sponsor_pool', 'provider_settlement')),
  subject_id text not null,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'variance_unresolved', 'unverified')
  ),
  provider_settlement_hash text not null check (provider_settlement_hash ~ '^sha256:[a-f0-9]{64}$'),
  internal_ledger_hash text not null check (internal_ledger_hash ~ '^sha256:[a-f0-9]{64}$'),
  unmatched_provider_event_count integer not null default 0 check (unmatched_provider_event_count >= 0),
  fee_variance_cents integer not null default 0,
  blocker_summary text not null default '',
  reconciled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_audit_integrity_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  hash_link_required boolean not null default true,
  immutable_storage_required boolean not null default false,
  max_checkpoint_age_hours integer not null default 24 check (max_checkpoint_age_hours > 0),
  covered_record_families text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_audit_integrity_checkpoints (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.moral_trade_audit_integrity_policies (id) on delete restrict,
  checkpoint_scope text not null,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'unverified')
  ),
  previous_checkpoint_hash text check (
    previous_checkpoint_hash is null or previous_checkpoint_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  checkpoint_hash text not null check (checkpoint_hash ~ '^sha256:[a-f0-9]{64}$'),
  covered_record_count integer not null default 0 check (covered_record_count >= 0),
  broken_link_count integer not null default 0 check (broken_link_count >= 0),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_data_security_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'unverified')
  ),
  sensitive_data_classes text[] not null default '{}',
  encryption_or_tokenization_required boolean not null default true,
  key_version_required boolean not null default true,
  private_access_log_required boolean not null default true,
  secret_logging_prohibited boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_key_version_records (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.moral_trade_data_security_policies (id) on delete restrict,
  data_class text not null,
  key_version_ref_hash text not null check (key_version_ref_hash ~ '^sha256:[a-f0-9]{64}$'),
  status text not null default 'under_review' check (
    status in ('ready', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review', 'unverified')
  ),
  rotation_due_at timestamptz,
  decryption_audit_hash text not null check (decryption_audit_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists moral_trade_account_security_events_profile_idx
  on public.moral_trade_account_security_events (profile_id, risk_status, created_at desc);
create index if not exists moral_trade_backup_recovery_checkpoints_status_idx
  on public.moral_trade_backup_recovery_checkpoints (status, created_at desc);
create index if not exists moral_trade_deployment_release_records_stage_idx
  on public.moral_trade_deployment_release_records (release_stage, status, created_at desc);
create index if not exists moral_trade_configuration_snapshots_environment_idx
  on public.moral_trade_configuration_snapshots (environment, status, captured_at desc);
create index if not exists moral_trade_schema_migration_runs_key_idx
  on public.moral_trade_schema_migration_runs (migration_key, status, created_at desc);
create index if not exists moral_trade_environment_data_isolation_records_status_idx
  on public.moral_trade_environment_data_isolation_records (source_environment, target_environment, status);
create index if not exists moral_trade_financial_reconciliation_runs_subject_idx
  on public.moral_trade_financial_reconciliation_runs (subject_kind, subject_id, status);
create index if not exists moral_trade_audit_integrity_checkpoints_scope_idx
  on public.moral_trade_audit_integrity_checkpoints (checkpoint_scope, status, created_at desc);
create index if not exists moral_trade_key_version_records_data_class_idx
  on public.moral_trade_key_version_records (data_class, status, created_at desc);

alter table public.moral_trade_account_security_policies enable row level security;
alter table public.moral_trade_account_security_events enable row level security;
alter table public.moral_trade_backup_recovery_policies enable row level security;
alter table public.moral_trade_backup_recovery_checkpoints enable row level security;
alter table public.moral_trade_deployment_release_records enable row level security;
alter table public.moral_trade_configuration_snapshots enable row level security;
alter table public.moral_trade_configuration_change_records enable row level security;
alter table public.moral_trade_schema_migration_policies enable row level security;
alter table public.moral_trade_schema_migration_runs enable row level security;
alter table public.moral_trade_environment_data_isolation_policies enable row level security;
alter table public.moral_trade_environment_data_isolation_records enable row level security;
alter table public.moral_trade_financial_reconciliation_policies enable row level security;
alter table public.moral_trade_financial_reconciliation_runs enable row level security;
alter table public.moral_trade_audit_integrity_policies enable row level security;
alter table public.moral_trade_audit_integrity_checkpoints enable row level security;
alter table public.moral_trade_data_security_policies enable row level security;
alter table public.moral_trade_key_version_records enable row level security;
