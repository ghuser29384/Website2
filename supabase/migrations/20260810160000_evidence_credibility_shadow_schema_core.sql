-- Evidence Decision -> Contextual Credibility shadow integration.
--
-- This migration implements the approved milestone-scoped evidence/credibility
-- bridge without changing public credibility, ranking, exposure, eligibility,
-- or evidence privacy. Completion and causal additionality remain separate.

create extension if not exists pgcrypto;

create table if not exists public.credibility_shadow_model_versions (
  version text primary key,
  status text not null default 'shadow',
  recency_half_life_days integer not null default 365,
  provenance_weights jsonb not null,
  decision_confidence_weights jsonb not null,
  dispute_conduct_outcomes jsonb not null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint credibility_shadow_model_status_check
    check (status in ('shadow', 'retired')),
  constraint credibility_shadow_model_half_life_check
    check (recency_half_life_days between 30 and 3650),
  constraint credibility_shadow_model_provenance_object_check
    check (jsonb_typeof(provenance_weights) = 'object'),
  constraint credibility_shadow_model_confidence_object_check
    check (jsonb_typeof(decision_confidence_weights) = 'object'),
  constraint credibility_shadow_model_dispute_object_check
    check (jsonb_typeof(dispute_conduct_outcomes) = 'object'),
  constraint credibility_shadow_model_retired_state_check
    check ((status = 'retired') = (retired_at is not null))
);

insert into public.credibility_shadow_model_versions (
  version,
  status,
  recency_half_life_days,
  provenance_weights,
  decision_confidence_weights,
  dispute_conduct_outcomes
)
values (
  'v2-evidence-decision-shadow',
  'shadow',
  365,
  '{"platform_observed":1.0,"authenticated_provider":1.0,"independent_third_party":1.0,"bilateral_confirmation":0.6,"self_report":0.2}'::jsonb,
  '{"100":1.0,"75":0.75,"50":0.5,"25":0.25,"0":0.0}'::jsonb,
  '{"cooperative":1.0,"obstructive":0.5,"retaliatory":0.0,"evidence_destruction":0.0,"abusive_appeal":0.0}'::jsonb
)
on conflict (version) do nothing;

create table if not exists public.credibility_shadow_controls (
  control_key text primary key,
  mode text not null default 'shadow',
  model_version text not null references public.credibility_shadow_model_versions(version),
  milestone_cutover_enabled boolean not null default false,
  public_effects_enabled boolean not null default false,
  ranking_effects_enabled boolean not null default false,
  eligibility_effects_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint credibility_shadow_controls_mode_check
    check (mode in ('shadow', 'active')),
  constraint credibility_shadow_controls_shadow_fail_closed_check check (
    mode <> 'shadow'
    or (
      not milestone_cutover_enabled
      and not public_effects_enabled
      and not ranking_effects_enabled
      and not eligibility_effects_enabled
    )
  )
);

insert into public.credibility_shadow_controls (
  control_key,
  mode,
  model_version,
  milestone_cutover_enabled,
  public_effects_enabled,
  ranking_effects_enabled,
  eligibility_effects_enabled
)
values (
  'evidence_decision_v2',
  'shadow',
  'v2-evidence-decision-shadow',
  false,
  false,
  false,
  false
)
on conflict (control_key) do nothing;

create table if not exists public.trade_evidence_decisions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.trade_agreement_milestones(id) on delete restrict,
  agreement_id uuid not null references public.agreements(id) on delete restrict,
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete restrict,
  review_id uuid references public.trade_milestone_reviews(id) on delete restrict,
  base_review_id uuid references public.trade_milestone_reviews(id) on delete restrict,
  supersedes_decision_id uuid references public.trade_evidence_decisions(id) on delete restrict,
  performer_id uuid not null references public.profiles(id) on delete restrict,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  decision_status text not null,
  completion_units numeric(20, 6) not null,
  units_total numeric(20, 6) not null,
  completion_fraction numeric(12, 10) not null,
  payout_factor_band smallint,
  decision_confidence_band smallint not null,
  primary_provenance_class text not null,
  provider_authentication_status text not null default 'not_applicable',
  provider_authentication_ref text not null default '',
  adjudication_class text not null,
  contradiction_status text not null default 'not_assessed',
  integrity_finding text not null default 'not_assessed',
  additionality_status text not null default 'not_evaluated',
  responsiveness_finding text not null default 'not_assessed',
  dispute_conduct_finding text not null default 'not_assessed',
  finality_reason text not null,
  exclusion_reason text not null default '',
  terms_hash text not null,
  decision_hash text not null,
  source_key text not null unique,
  occurred_at timestamptz not null,
  finalized_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint trade_evidence_decisions_distinct_roles_check
    check (performer_id <> payer_id),
  constraint trade_evidence_decisions_status_check
    check (decision_status in ('eligible', 'excluded', 'review_required')),
  constraint trade_evidence_decisions_units_check
    check (
      units_total > 0
      and completion_units between 0 and units_total
      and completion_fraction between 0 and 1
    ),
  constraint trade_evidence_decisions_fraction_consistency_check
    check (
      abs(completion_fraction - (completion_units / units_total)) < 0.0000000001
    ),
  constraint trade_evidence_decisions_payout_factor_check
    check (payout_factor_band is null or payout_factor_band in (0, 25, 50, 75, 100)),
  constraint trade_evidence_decisions_confidence_check
    check (decision_confidence_band in (0, 25, 50, 75, 100)),
  constraint trade_evidence_decisions_provenance_check
    check (primary_provenance_class in (
      'platform_observed', 'authenticated_provider', 'independent_third_party',
      'bilateral_confirmation', 'self_report'
    )),
  constraint trade_evidence_decisions_provider_authentication_check check (
    provider_authentication_status in (
      'not_applicable', 'authenticated', 'unverified', 'failed',
      'manual_review_required'
    )
    and (
      (primary_provenance_class = 'authenticated_provider'
        and provider_authentication_status = 'authenticated'
        and length(btrim(provider_authentication_ref)) between 1 and 500)
      or (primary_provenance_class <> 'authenticated_provider'
        and provider_authentication_status <> 'authenticated')
    )
  ),
  constraint trade_evidence_decisions_adjudication_check
    check (adjudication_class in (
      'platform_established', 'provider_established', 'neutral_review_final',
      'appeal_review_final', 'bilateral_confirmed', 'unreviewed'
    )),
  constraint trade_evidence_decisions_contradiction_check
    check (contradiction_status in (
      'not_assessed', 'none', 'innocent', 'materially_reckless', 'deliberate'
    )),
  constraint trade_evidence_decisions_integrity_check
    check (integrity_finding in (
      'not_assessed', 'supported_honest', 'reckless_misleading',
      'deliberate_fabrication'
    )),
  constraint trade_evidence_decisions_additionality_check
    check (additionality_status = 'not_evaluated'),
  constraint trade_evidence_decisions_responsiveness_check
    check (responsiveness_finding in (
      'not_assessed', 'on_time', 'late_cure', 'missed_deadline', 'excused'
    )),
  constraint trade_evidence_decisions_dispute_check
    check (dispute_conduct_finding in (
      'not_assessed', 'cooperative', 'obstructive', 'retaliatory',
      'evidence_destruction', 'abusive_appeal'
    )),
  constraint trade_evidence_decisions_contradiction_integrity_consistency_check check (
    (contradiction_status not in ('materially_reckless', 'deliberate'))
    or (contradiction_status = 'materially_reckless'
      and integrity_finding = 'reckless_misleading')
    or (contradiction_status = 'deliberate'
      and integrity_finding = 'deliberate_fabrication')
  ),
  constraint trade_evidence_decisions_finality_reason_check
    check (finality_reason in (
      'review_final', 'replacement_success', 'terminal_rejection',
      'replacement_expired', 'appeal_affirmed', 'appeal_overturned',
      'permissible_exit', 'force_majeure', 'mutual_cancellation',
      'unjustified_abandonment', 'unresolved_dispute', 'late_cure',
      'administrative_correction'
    )),
  constraint trade_evidence_decisions_exclusion_reason_check check (
    (decision_status = 'eligible')
    or length(btrim(exclusion_reason)) between 1 and 1000
  ),
  constraint trade_evidence_decisions_hash_check check (
    terms_hash ~ '^[0-9a-f]{64}$'
    and decision_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint trade_evidence_decisions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint trade_evidence_decisions_review_link_check check (
    (review_id is null and base_review_id is null)
    or review_id is not null
  ),
  constraint trade_evidence_decisions_not_self_superseding_check
    check (supersedes_decision_id is null or supersedes_decision_id <> id)
);

create unique index if not exists trade_evidence_decisions_one_successor_idx
  on public.trade_evidence_decisions(supersedes_decision_id)
  where supersedes_decision_id is not null;
create index if not exists trade_evidence_decisions_milestone_time_idx
  on public.trade_evidence_decisions(milestone_id, finalized_at desc);
create index if not exists trade_evidence_decisions_profile_time_idx
  on public.trade_evidence_decisions(performer_id, finalized_at desc);
create unique index if not exists trade_evidence_decisions_review_hash_uidx
  on public.trade_evidence_decisions(review_id, decision_hash)
  where review_id is not null;
