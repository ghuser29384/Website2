create table if not exists public.background_delegate_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  receipt_kind text not null check (receipt_kind in ('delegate_run', 'opportunity_brief', 'stale_transition', 'intro_request')),
  purpose_code text not null default 'moral_trade_offer',
  purpose_policy_version text not null default 'background-purpose-policy-v1',
  subject_kind text not null check (subject_kind in ('helper_run', 'background_helper_run', 'opportunity_brief', 'intro_packet')),
  subject_id uuid,
  public_summary text not null default '',
  factor_count_bucket text not null default 'withheld' check (factor_count_bucket in ('withheld', 'none', '1', '2_to_3', '4_plus')),
  blocker_count_bucket text not null default 'withheld' check (blocker_count_bucket in ('withheld', 'none', '1', '2_to_3', '4_plus')),
  redacted_payload jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'expired', 'anonymized', 'held')),
  retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.background_delegate_receipts drop constraint if exists background_delegate_receipts_purpose_code_check;
alter table public.background_delegate_receipts
  add constraint background_delegate_receipts_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_delegate_receipts drop constraint if exists background_delegate_receipts_purpose_policy_version_check;
alter table public.background_delegate_receipts
  add constraint background_delegate_receipts_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.background_opportunity_briefs
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists output_schema_version text not null default 'background-opportunity-brief-card-v2',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  add column if not exists anonymized_at timestamptz,
  add column if not exists generic_dependency_label text not null default 'valid';

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_purpose_code_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_purpose_policy_version_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_output_schema_version_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_output_schema_version_check
  check (output_schema_version = 'background-opportunity-brief-card-v2');

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_generic_dependency_label_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_generic_dependency_label_check
  check (generic_dependency_label in ('valid', 'stale_or_unavailable', 'review_required'));

alter table public.background_intro_packets
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  add column if not exists anonymized_at timestamptz;

alter table public.wish_profiles
  add column if not exists inbound_delegate_discovery text not null default 'off',
  add column if not exists inbound_delegate_purpose_codes text[] not null default '{}',
  add column if not exists inbound_delegate_purpose_bindings jsonb not null default '{}'::jsonb,
  add column if not exists inbound_delegate_surfaces text[] not null default '{}',
  add column if not exists inbound_delegate_surface_budget_per_window jsonb not null default '{}'::jsonb,
  add column if not exists inbound_delegate_pending_intro_limit integer,
  add column if not exists inbound_delegate_cooloff_until timestamptz,
  add column if not exists inbound_delegate_confirmed_at timestamptz,
  add column if not exists inbound_delegate_expires_at timestamptz,
  add column if not exists candidate_inbound_budget_version text not null default 'candidate-budget-v1',
  add column if not exists candidate_exposure_version text not null default 'candidate-exposure-v1',
  add column if not exists allowed_cohort_ids text[] not null default '{}';

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_discovery_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_discovery_check
  check (inbound_delegate_discovery in ('off', 'cohort_only', 'partner_matchmaker', 'public_broad_preview'));

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_purpose_codes_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_purpose_codes_check
  check (inbound_delegate_purpose_codes <@ array['moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro']::text[]);

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_surfaces_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_surfaces_check
  check (inbound_delegate_surfaces <@ array['broad_profile']::text[]);

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_pending_intro_limit_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_pending_intro_limit_check
  check (inbound_delegate_pending_intro_limit is null or inbound_delegate_pending_intro_limit between 0 and 50);

alter table public.personal_delegates
  add column if not exists allowed_purpose_bindings jsonb not null default '{}'::jsonb;

alter table public.helper_strategies
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists audience_scope text not null default 'cohort_only',
  add column if not exists cohort_scope_id text not null default '';

alter table public.helper_strategies drop constraint if exists helper_strategies_purpose_code_check;
alter table public.helper_strategies
  add constraint helper_strategies_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.helper_strategies drop constraint if exists helper_strategies_purpose_policy_version_check;
alter table public.helper_strategies
  add constraint helper_strategies_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.helper_strategies drop constraint if exists helper_strategies_audience_scope_check;
alter table public.helper_strategies
  add constraint helper_strategies_audience_scope_check
  check (audience_scope in ('cohort_only', 'partner_matchmaker', 'public_broad_preview'));

alter table public.match_suggestions
  add column if not exists background_owner_profile_id uuid references public.profiles (id) on delete set null;

update public.match_suggestions as target
set background_owner_profile_id = audit.actor_profile_id
from public.match_audit_events as audit
where audit.match_id = target.id
  and target.background_owner_profile_id is null
  and audit.actor_profile_id in (target.profile_a_id, target.profile_b_id)
  and (
    target.generated_by in ('saved-search-cron', 'delegate-cron', 'profile-save-scan', 'manual-scan')
    or exists (
      select 1
      from unnest(target.match_basis) as basis(value)
      where basis.value like 'Generated by deterministic scan:%'
    )
  );

alter table public.background_intro_packets drop constraint if exists background_intro_packets_purpose_code_check;
alter table public.background_intro_packets
  add constraint background_intro_packets_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_intro_packets drop constraint if exists background_intro_packets_purpose_policy_version_check;
alter table public.background_intro_packets
  add constraint background_intro_packets_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.helper_runs
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days');

alter table public.background_helper_runs
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days');

create table if not exists public.background_candidate_exposure_counters (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  counter_reference_state text not null default 'active' check (counter_reference_state in ('active', 'redacted', 'anonymized')),
  purpose_code text not null default 'moral_trade_offer',
  purpose_policy_version text not null default 'background-purpose-policy-v1',
  audience_scope text not null default 'cohort_only' check (audience_scope in ('cohort_only', 'partner_matchmaker', 'public_broad_preview')),
  cohort_scope_id text not null default '',
  window_start timestamptz not null,
  window_end timestamptz not null,
  surface_count integer not null default 0 check (surface_count >= 0),
  pending_intro_count integer not null default 0 check (pending_intro_count >= 0),
  suppressed_for_budget_count integer not null default 0 check (suppressed_for_budget_count >= 0),
  budget_state text not null default 'clear' check (budget_state in ('clear', 'near_limit', 'exhausted', 'cooloff')),
  candidate_inbound_budget_version_snapshot text not null default 'candidate-budget-v1',
  last_surface_at timestamptz,
  last_intro_request_at timestamptz,
  retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '45 days'),
  anonymized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (counter_reference_state <> 'active' or candidate_profile_id is not null),
  check (window_end > window_start)
);

alter table public.background_candidate_exposure_counters drop constraint if exists background_candidate_exposure_counters_purpose_code_check;
alter table public.background_candidate_exposure_counters
  add constraint background_candidate_exposure_counters_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_candidate_exposure_counters drop constraint if exists background_candidate_exposure_counters_purpose_policy_version_check;
alter table public.background_candidate_exposure_counters
  add constraint background_candidate_exposure_counters_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

create unique index if not exists background_candidate_exposure_counters_window_idx
on public.background_candidate_exposure_counters (
  candidate_profile_id,
  purpose_code,
  purpose_policy_version,
  audience_scope,
  cohort_scope_id,
  window_start
)
where counter_reference_state = 'active';

create index if not exists background_candidate_exposure_counters_retention_idx
on public.background_candidate_exposure_counters (counter_reference_state, retention_expires_at asc);

create or replace function public.reserve_background_candidate_exposure(
  target_candidate_profile_id uuid,
  target_purpose_code text,
  target_purpose_policy_version text,
  target_audience_scope text,
  target_cohort_scope_id text,
  target_surface_limit integer,
  target_window_days integer,
  target_budget_version text
)
returns table (
  allowed boolean,
  budget_state text,
  counter_id uuid,
  remaining integer,
  blocker_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_time_utc timestamptz := timezone('utc', now());
  normalized_cohort text := coalesce(nullif(target_cohort_scope_id, ''), '');
  normalized_window_days integer := greatest(1, least(coalesce(target_window_days, 30), 365));
  normalized_surface_limit integer := greatest(0, least(coalesce(target_surface_limit, 0), 1000));
  window_start_utc timestamptz := date_trunc('day', timezone('utc', now()));
  window_end_utc timestamptz;
  reserved_counter_id uuid;
  reserved_surface_count integer;
  reserved_budget_state text;
begin
  if target_candidate_profile_id is null or normalized_surface_limit <= 0 then
    allowed := false;
    budget_state := 'exhausted';
    counter_id := null;
    remaining := 0;
    blocker_code := 'candidate_budget_missing';
    return next;
    return;
  end if;

  window_end_utc := window_start_utc + make_interval(days => normalized_window_days);

  insert into public.background_candidate_exposure_counters (
    candidate_profile_id,
    purpose_code,
    purpose_policy_version,
    audience_scope,
    cohort_scope_id,
    window_start,
    window_end,
    candidate_inbound_budget_version_snapshot,
    retention_expires_at
  )
  values (
    target_candidate_profile_id,
    target_purpose_code,
    target_purpose_policy_version,
    target_audience_scope,
    normalized_cohort,
    window_start_utc,
    window_end_utc,
    coalesce(nullif(target_budget_version, ''), 'candidate-budget-v1'),
    window_end_utc + interval '45 days'
  )
  on conflict (candidate_profile_id, purpose_code, purpose_policy_version, audience_scope, cohort_scope_id, window_start)
  where counter_reference_state = 'active'
  do nothing;

  update public.background_candidate_exposure_counters
  set
    surface_count = surface_count + 1,
    budget_state = case
      when surface_count + 1 >= normalized_surface_limit then 'exhausted'
      when (surface_count + 1) * 5 >= normalized_surface_limit * 4 then 'near_limit'
      else 'clear'
    end,
    last_surface_at = current_time_utc,
    updated_at = current_time_utc
  where candidate_profile_id = target_candidate_profile_id
    and purpose_code = target_purpose_code
    and purpose_policy_version = target_purpose_policy_version
    and audience_scope = target_audience_scope
    and cohort_scope_id = normalized_cohort
    and window_start = window_start_utc
    and counter_reference_state = 'active'
    and budget_state <> 'cooloff'
    and surface_count < normalized_surface_limit
  returning id, surface_count, budget_state
  into reserved_counter_id, reserved_surface_count, reserved_budget_state;

  if reserved_counter_id is not null then
    allowed := true;
    budget_state := reserved_budget_state;
    counter_id := reserved_counter_id;
    remaining := greatest(0, normalized_surface_limit - reserved_surface_count);
    blocker_code := '';
    return next;
    return;
  end if;

  update public.background_candidate_exposure_counters
  set
    suppressed_for_budget_count = suppressed_for_budget_count + 1,
    budget_state = case when budget_state = 'cooloff' then 'cooloff' else 'exhausted' end,
    updated_at = current_time_utc
  where candidate_profile_id = target_candidate_profile_id
    and purpose_code = target_purpose_code
    and purpose_policy_version = target_purpose_policy_version
    and audience_scope = target_audience_scope
    and cohort_scope_id = normalized_cohort
    and window_start = window_start_utc
    and counter_reference_state = 'active'
  returning id, budget_state
  into reserved_counter_id, reserved_budget_state;

  allowed := false;
  budget_state := coalesce(reserved_budget_state, 'exhausted');
  counter_id := reserved_counter_id;
  remaining := 0;
  blocker_code := case when reserved_budget_state = 'cooloff' then 'candidate_cooloff' else 'candidate_budget_exhausted' end;
  return next;
end;
$$;

alter table public.background_delegate_receipts enable row level security;
alter table public.background_candidate_exposure_counters enable row level security;

drop policy if exists "background_delegate_receipts_select_own" on public.background_delegate_receipts;
create policy "background_delegate_receipts_select_own"
on public.background_delegate_receipts
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_delegate_receipts_insert_own" on public.background_delegate_receipts;
create policy "background_delegate_receipts_insert_own"
on public.background_delegate_receipts
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop trigger if exists background_delegate_receipts_set_updated_at on public.background_delegate_receipts;
create trigger background_delegate_receipts_set_updated_at
before update on public.background_delegate_receipts
for each row execute function public.set_updated_at();

drop trigger if exists background_candidate_exposure_counters_set_updated_at on public.background_candidate_exposure_counters;
create trigger background_candidate_exposure_counters_set_updated_at
before update on public.background_candidate_exposure_counters
for each row execute function public.set_updated_at();

create index if not exists background_delegate_receipts_profile_kind_idx
on public.background_delegate_receipts (profile_id, receipt_kind, created_at desc);

create index if not exists background_delegate_receipts_retention_idx
on public.background_delegate_receipts (status, retention_expires_at asc);

create index if not exists background_opportunity_briefs_purpose_idx
on public.background_opportunity_briefs (profile_id, purpose_code, purpose_policy_version, status);

create index if not exists background_intro_packets_purpose_idx
on public.background_intro_packets (requester_profile_id, purpose_code, purpose_policy_version, review_state);

create index if not exists helper_strategies_purpose_idx
on public.helper_strategies (profile_id, purpose_code, purpose_policy_version, audience_scope, status);

create index if not exists match_suggestions_background_owner_idx
on public.match_suggestions (background_owner_profile_id, generated_by, status, updated_at desc);

grant all on public.background_candidate_exposure_counters to service_role;
revoke all on function public.reserve_background_candidate_exposure(uuid, text, text, text, text, integer, integer, text) from public;
revoke all on function public.reserve_background_candidate_exposure(uuid, text, text, text, text, integer, integer, text) from authenticated;
grant execute on function public.reserve_background_candidate_exposure(uuid, text, text, text, text, integer, integer, text) to service_role;

create or replace view public.match_suggestion_previews as
select
  match_suggestions.id,
  case
    when public.viewer_can_see_match_identity(match_suggestions.id) then
      case
        when match_suggestions.profile_a_id = auth.uid() then match_suggestions.profile_b_id
        else match_suggestions.profile_a_id
      end
    else null
  end as counterparty_profile_id,
  coalesce(counterparty_preview.public_preview, '') as counterparty_public_preview,
  coalesce(counterparty_preview.causes, '{}'::text[]) as counterparty_causes,
  counterparty_preview.location_city as counterparty_location_city,
  counterparty_preview.location_region as counterparty_location_region,
  coalesce(counterparty_preview.openness_to_payment, false) as counterparty_openness_to_payment,
  coalesce(counterparty_preview.openness_to_pledges, false) as counterparty_openness_to_pledges,
  case
    when match_suggestions.profile_a_id = auth.uid() then match_suggestions.reason_for_a
    else match_suggestions.reason_for_b
  end as viewer_reason,
  case
    when public.viewer_can_see_match_identity(match_suggestions.id) then
      case
        when match_suggestions.profile_a_id = auth.uid() then match_suggestions.reason_for_b
        else match_suggestions.reason_for_a
      end
    else ''
  end as counterparty_reason,
  match_suggestions.score,
  match_suggestions.match_basis,
  match_suggestions.shared_causes,
  match_suggestions.suggested_first_step,
  match_suggestions.risk_notes,
  match_suggestions.generated_by,
  match_suggestions.status,
  match_suggestions.identity_revealed,
  exists (
    select 1
    from public.match_consents
    where match_consents.match_id = match_suggestions.id
      and match_consents.profile_id = auth.uid()
  ) as viewer_consented,
  exists (
    select 1
    from public.match_consents
    where match_consents.match_id = match_suggestions.id
      and match_consents.profile_id = case
        when match_suggestions.profile_a_id = auth.uid() then match_suggestions.profile_b_id
        else match_suggestions.profile_a_id
      end
  ) as counterparty_consented,
  public.viewer_can_see_match_identity(match_suggestions.id) as can_reveal_identity,
  match_suggestions.last_scored_at,
  match_suggestions.created_at,
  match_suggestions.updated_at
from public.match_suggestions
left join public.wish_profile_previews as counterparty_preview
  on counterparty_preview.profile_id = case
    when match_suggestions.profile_a_id = auth.uid() then match_suggestions.profile_b_id
    else match_suggestions.profile_a_id
  end
where auth.uid() is not null
  and (
    match_suggestions.profile_a_id = auth.uid()
    or match_suggestions.profile_b_id = auth.uid()
  )
  and (
    match_suggestions.background_owner_profile_id is null
    or match_suggestions.background_owner_profile_id = auth.uid()
    or public.viewer_can_see_match_identity(match_suggestions.id)
  )
  and match_suggestions.status <> 'dismissed';

grant select on public.match_suggestion_previews to authenticated;
