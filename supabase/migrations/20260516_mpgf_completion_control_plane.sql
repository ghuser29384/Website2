-- MPGF completion control-plane evidence tables.
-- Apply after the MPGF contract, real-money, manual-evidence, pool-reasoning,
-- and mutation-control migrations.
begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_completion_gate_evaluations (
  id uuid primary key default gen_random_uuid(),
  gate_key text not null,
  gate_area text not null check (
    gate_area in (
      'exact_pilot',
      'real_money',
      'payout_compliance',
      'solver',
      'governance',
      'production_verification'
    )
  ),
  status text not null check (status in ('passed', 'blocked', 'pending_review', 'failed')),
  evaluated_environment text not null default 'production',
  evaluated_base_url text not null default 'https://www.moraltrade.org',
  deployed_commit_sha_or_build_id text,
  instruction_artifact_path text not null default 'docs/mpgf/codex-build-instruction-final.md',
  instruction_artifact_hash text,
  evidence_json jsonb not null default '{}'::jsonb,
  blocker_count integer not null default 0 check (blocker_count >= 0),
  evaluated_by uuid,
  evaluated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_completion_gate_evaluations_gate_key_idx
  on public.mpgf_completion_gate_evaluations (gate_key, evaluated_at desc);

create index if not exists mpgf_completion_gate_evaluations_status_idx
  on public.mpgf_completion_gate_evaluations (status, evaluated_at desc);

create table if not exists public.mpgf_solver_certification_runs (
  id uuid primary key default gen_random_uuid(),
  solver_support_profile_version text not null,
  canonical_instance_hash text not null,
  benchmark_report_path text not null default 'docs/mpgf/solver-benchmark-report.md',
  benchmark_supported boolean not null default false,
  active_profile_supported boolean not null default false,
  selected_solver text,
  certificate_hash text,
  certificate_verified boolean not null default false,
  live_ordinary_allocation_allowed boolean not null default false,
  status text not null check (status in ('passed', 'blocked', 'pending_review', 'failed')),
  blockers_json jsonb not null default '[]'::jsonb,
  evaluated_by uuid,
  evaluated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_solver_certification_runs_profile_idx
  on public.mpgf_solver_certification_runs (solver_support_profile_version, evaluated_at desc);

create table if not exists public.mpgf_production_verification_runs (
  id uuid primary key default gen_random_uuid(),
  verification_kind text not null check (
    verification_kind in (
      'production_deployment_prerequisites',
      'www_direct_working',
      'www_auth_session',
      'www_public_experience',
      'www_participant_journey',
      'www_exact_pilot_dry_run',
      'www_production_health_check',
      'www_post_launch_monitor',
      'end_to_end'
    )
  ),
  evaluated_base_url text not null default 'https://www.moraltrade.org',
  deployed_commit_sha_or_build_id text,
  browser_evidence_path text,
  status text not null check (status in ('passed', 'blocked', 'pending_review', 'failed')),
  blockers_json jsonb not null default '[]'::jsonb,
  evaluated_by uuid,
  evaluated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_production_verification_runs_kind_idx
  on public.mpgf_production_verification_runs (verification_kind, evaluated_at desc);

create table if not exists public.mpgf_payout_compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in (
      'recipient_accreditation',
      'recipient_compliance_review',
      'payout_destination',
      'payout_authorization',
      'external_payment_evidence',
      'automated_payout_provider_profile'
    )
  ),
  subject_id text,
  profile_version text,
  status text not null check (status in ('draft', 'pending_review', 'approved', 'rejected', 'voided')),
  requires_independent_auditor boolean not null default true,
  approval_record_ids_json jsonb not null default '[]'::jsonb,
  review_json jsonb not null default '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_payout_compliance_reviews_subject_idx
  on public.mpgf_payout_compliance_reviews (subject_type, subject_id, created_at desc);

alter table public.mpgf_completion_gate_evaluations enable row level security;
alter table public.mpgf_solver_certification_runs enable row level security;
alter table public.mpgf_production_verification_runs enable row level security;
alter table public.mpgf_payout_compliance_reviews enable row level security;

grant select on public.mpgf_completion_gate_evaluations to authenticated;
grant select on public.mpgf_solver_certification_runs to authenticated;
grant select on public.mpgf_production_verification_runs to authenticated;
grant select on public.mpgf_payout_compliance_reviews to authenticated;

grant all on public.mpgf_completion_gate_evaluations to service_role;
grant all on public.mpgf_solver_certification_runs to service_role;
grant all on public.mpgf_production_verification_runs to service_role;
grant all on public.mpgf_payout_compliance_reviews to service_role;

drop policy if exists mpgf_completion_gate_evaluations_authenticated_select
  on public.mpgf_completion_gate_evaluations;
create policy mpgf_completion_gate_evaluations_authenticated_select
  on public.mpgf_completion_gate_evaluations
  for select
  to authenticated
  using (true);

drop policy if exists mpgf_solver_certification_runs_authenticated_select
  on public.mpgf_solver_certification_runs;
create policy mpgf_solver_certification_runs_authenticated_select
  on public.mpgf_solver_certification_runs
  for select
  to authenticated
  using (true);

drop policy if exists mpgf_production_verification_runs_authenticated_select
  on public.mpgf_production_verification_runs;
create policy mpgf_production_verification_runs_authenticated_select
  on public.mpgf_production_verification_runs
  for select
  to authenticated
  using (true);

drop policy if exists mpgf_payout_compliance_reviews_authenticated_select
  on public.mpgf_payout_compliance_reviews;
create policy mpgf_payout_compliance_reviews_authenticated_select
  on public.mpgf_payout_compliance_reviews
  for select
  to authenticated
  using (true);

commit;
