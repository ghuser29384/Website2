-- Add a database-enforced one-to-ten cumulative-threshold contract for failure-bonus pools.
-- The proposal stores one pool-wide bonus formula and eligibility policy; each cumulative
-- threshold stores its own conservative risk assumptions and prices only its incremental tranche.
begin;

create extension if not exists pgcrypto;

do $preflight$
begin
  if exists (
    select 1
    from public.mpgf_pool_proposals
    where public_goods_failure_bonus_enabled = true
  ) then
    raise exception using
      errcode = '55000',
      message = 'Existing enabled failure-bonus proposals require an explicit schedule backfill before this migration.';
  end if;

  if exists (select 1 from public.mpgf_failure_bonus_premium_quotes) then
    raise exception using
      errcode = '55000',
      message = 'Existing failure-bonus premium quotes require an explicit schedule backfill before this migration.';
  end if;
end;
$preflight$;

alter table public.mpgf_pool_proposals
  add column if not exists public_goods_threshold_schedule_json jsonb,
  add column if not exists public_goods_failure_bonus_eligibility_json jsonb,
  add column if not exists public_goods_failure_bonus_max_participants integer,
  add column if not exists public_goods_failure_bonus_max_per_participant_cents bigint,
  add column if not exists public_goods_failure_bonus_schedule_status text;

comment on column public.mpgf_pool_proposals.public_goods_threshold_schedule_json is
  'One-to-ten cumulative threshold schedule. Every threshold prices only its incremental net-recipient tranche; cumulative premiums and gross requirements are reproduced exactly.';
comment on column public.mpgf_pool_proposals.public_goods_failure_bonus_eligibility_json is
  'Immutable pool-wide eligibility policy for a failure-bonus promise. Thresholds cannot define different eligibility rules.';
comment on column public.mpgf_pool_proposals.public_goods_failure_bonus_max_participants is
  'Pool-wide maximum number of verified unique people eligible for a failure bonus.';
comment on column public.mpgf_pool_proposals.public_goods_failure_bonus_max_per_participant_cents is
  'Pool-wide maximum failure bonus payable to one eligible participant, in exact integer cents.';
comment on column public.mpgf_pool_proposals.public_goods_failure_bonus_schedule_status is
  'Atomic operator-review state for the complete schedule: pending_review or approved.';

create or replace function public.mpgf_failure_bonus_provisional_pricing_valid(
  pricing_json jsonb,
  failure_bonus_rate_bps integer,
  success_premium_rate_bps integer
)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $function$
declare
  success_probability_bps integer;
  pricing_failure_bonus_rate_bps integer;
  expected_eligible_failure_fill_bps integer;
  expense_load_bps integer;
  reserve_risk_margin_bps integer;
  expected_claims_rate_bps bigint;
  denominator bigint;
begin
  if jsonb_typeof(pricing_json) <> 'object'
     or jsonb_typeof(pricing_json -> 'successProbabilityBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'failureBonusRateBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'expectedEligibleFailureFillBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'expenseLoadBps') <> 'number'
     or jsonb_typeof(pricing_json -> 'reserveRiskMarginBps') <> 'number' then
    return false;
  end if;

  success_probability_bps := (pricing_json ->> 'successProbabilityBps')::integer;
  pricing_failure_bonus_rate_bps := (pricing_json ->> 'failureBonusRateBps')::integer;
  expected_eligible_failure_fill_bps :=
    (pricing_json ->> 'expectedEligibleFailureFillBps')::integer;
  expense_load_bps := (pricing_json ->> 'expenseLoadBps')::integer;
  reserve_risk_margin_bps := (pricing_json ->> 'reserveRiskMarginBps')::integer;

  -- Creator estimates may be more conservative than the platform baseline, never more optimistic.
  if success_probability_bps < 1
     or success_probability_bps > 7500
     or pricing_failure_bonus_rate_bps <> failure_bonus_rate_bps
     or expected_eligible_failure_fill_bps < 4000
     or expected_eligible_failure_fill_bps > 10000
     or expense_load_bps <> 25
     or reserve_risk_margin_bps <> 42 then
    return false;
  end if;

  denominator := success_probability_bps::bigint * 10000;
  expected_claims_rate_bps := (
    ((10000 - success_probability_bps)::bigint
      * pricing_failure_bonus_rate_bps::bigint
      * expected_eligible_failure_fill_bps::bigint)
    + denominator - 1
  ) / denominator;

  return success_premium_rate_bps =
    expected_claims_rate_bps + expense_load_bps + reserve_risk_margin_bps;
exception
  when others then
    return false;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_provisional_pricing_valid(jsonb, integer, integer)
  from public, anon, authenticated;
grant execute on function public.mpgf_failure_bonus_provisional_pricing_valid(jsonb, integer, integer)
  to authenticated, service_role;

create or replace function public.mpgf_failure_bonus_eligibility_policy_valid(
  eligibility_json jsonb,
  max_participants integer,
  max_bonus_per_participant_cents bigint
)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $function$
declare
  json_max_participants integer;
  json_max_bonus_per_participant_cents bigint;
  aggregate_cap numeric;
begin
  if jsonb_typeof(eligibility_json) <> 'object'
     or eligibility_json ->> 'policyVersion' <> 'mpgf_failure_bonus_eligibility_v0_1'
     or eligibility_json ->> 'contributorIdentityRule' <> 'verified_unique_person'
     or eligibility_json ->> 'contributionTimingRule' <> 'captured_before_deadline'
     or eligibility_json ->> 'relatedPartyRule' <> 'exclude_creator_and_related_parties'
     or eligibility_json ->> 'paymentIntegrityRule' <> 'exclude_duplicate_reversed_disputed_or_fraudulent'
     or eligibility_json ->> 'bonusBasis' <> 'eligible_contribution'
     or jsonb_typeof(eligibility_json -> 'maxParticipants') <> 'number'
     or jsonb_typeof(eligibility_json -> 'maxBonusPerParticipantCents') <> 'number' then
    return false;
  end if;

  json_max_participants := (eligibility_json ->> 'maxParticipants')::integer;
  json_max_bonus_per_participant_cents :=
    (eligibility_json ->> 'maxBonusPerParticipantCents')::bigint;

  if json_max_participants <> max_participants
     or json_max_bonus_per_participant_cents <> max_bonus_per_participant_cents
     or max_participants < 1
     or max_bonus_per_participant_cents < 1 then
    return false;
  end if;

  aggregate_cap := max_participants::numeric * max_bonus_per_participant_cents::numeric;
  return aggregate_cap <= 9007199254740991::numeric;
exception
  when others then
    return false;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_eligibility_policy_valid(jsonb, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.mpgf_failure_bonus_eligibility_policy_valid(jsonb, integer, bigint)
  to authenticated, service_role;

create or replace function public.mpgf_failure_bonus_threshold_schedule_valid(
  schedule_json jsonb,
  eligibility_json jsonb,
  schedule_status text,
  failure_bonus_rate_bps integer,
  threshold_one_cents bigint,
  threshold_one_premium_rate_bps integer,
  threshold_one_premium_cents bigint,
  threshold_one_gross_cents bigint,
  threshold_one_pricing_json jsonb,
  requested_maximum_funding_cents bigint,
  verified_supporter_minimum integer,
  max_participants integer,
  max_bonus_per_participant_cents bigint
)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $function$
declare
  thresholds_json jsonb;
  threshold_item jsonb;
  assumptions_json jsonb;
  threshold_ids text[] := array[]::text[];
  threshold_count integer;
  current_index integer := 0;
  threshold_id text;
  cumulative_net_cents bigint;
  previous_cumulative_net_cents bigint := 0;
  incremental_net_cents bigint;
  premium_rate_bps integer;
  success_premium_cents bigint;
  cumulative_success_premium_cents bigint;
  previous_cumulative_success_premium_cents bigint := 0;
  gross_success_requirement_cents bigint;
  incremental_exposure_cents bigint;
  cumulative_exposure_cents bigint;
  previous_cumulative_exposure_cents bigint := 0;
  uncapped_cumulative_exposure numeric;
  aggregate_cap numeric;
  expected_rationale text;
begin
  if schedule_status not in ('pending_review', 'approved')
     or jsonb_typeof(schedule_json) <> 'object'
     or schedule_json ->> 'policyVersion' <> 'mpgf_failure_bonus_success_premium_v0_1'
     or schedule_json ->> 'premiumPayer' <> 'pool_creator_or_sponsor'
     or jsonb_typeof(schedule_json -> 'premiumIncludedInNetRecipientThreshold') <> 'boolean'
     or (schedule_json ->> 'premiumIncludedInNetRecipientThreshold')::boolean <> false
     or schedule_json -> 'eligibilityPolicy' is distinct from eligibility_json
     or not public.mpgf_failure_bonus_eligibility_policy_valid(
       eligibility_json,
       max_participants,
       max_bonus_per_participant_cents
     )
     or verified_supporter_minimum < 1
     or verified_supporter_minimum > max_participants then
    return false;
  end if;

  thresholds_json := schedule_json -> 'thresholds';
  if jsonb_typeof(thresholds_json) <> 'array' then
    return false;
  end if;

  threshold_count := jsonb_array_length(thresholds_json);
  if threshold_count < 1 or threshold_count > 10 then
    return false;
  end if;

  aggregate_cap := max_participants::numeric * max_bonus_per_participant_cents::numeric;

  for threshold_item in
    select value
    from jsonb_array_elements(thresholds_json)
  loop
    current_index := current_index + 1;

    if jsonb_typeof(threshold_item) <> 'object'
       or jsonb_typeof(threshold_item -> 'thresholdIndex') <> 'number'
       or jsonb_typeof(threshold_item -> 'cumulativeNetRecipientThresholdCents') <> 'number'
       or jsonb_typeof(threshold_item -> 'incrementalNetRecipientCents') <> 'number'
       or jsonb_typeof(threshold_item -> 'premiumRateBps') <> 'number'
       or jsonb_typeof(threshold_item -> 'successPremiumCents') <> 'number'
       or jsonb_typeof(threshold_item -> 'cumulativeSuccessPremiumCents') <> 'number'
       or jsonb_typeof(threshold_item -> 'grossSuccessRequirementCents') <> 'number'
       or jsonb_typeof(threshold_item -> 'provisional') <> 'boolean'
       or jsonb_typeof(threshold_item -> 'incrementalFailureBonusExposureCents') <> 'number'
       or jsonb_typeof(threshold_item -> 'maximumFailureBonusExposureCents') <> 'number' then
      return false;
    end if;

    threshold_id := threshold_item ->> 'thresholdId';
    if threshold_id is null
       or threshold_id = ''
       or threshold_id <> btrim(threshold_id)
       or threshold_id = any(threshold_ids) then
      return false;
    end if;
    threshold_ids := array_append(threshold_ids, threshold_id);

    if (threshold_item ->> 'thresholdIndex')::integer <> current_index
       or threshold_item ->> 'premiumPayer' <> 'pool_creator_or_sponsor'
       or jsonb_typeof(threshold_item -> 'premiumIncludedInNetRecipientThreshold') <> 'boolean'
       or (threshold_item ->> 'premiumIncludedInNetRecipientThreshold')::boolean <> false
       or threshold_item ->> 'pricingMode' <> 'experience_rated' then
      return false;
    end if;

    if schedule_status = 'pending_review' then
      expected_rationale := format(
        'Provisional threshold %s experience-rated quote; operator approval remains required.',
        current_index
      );
      if (threshold_item ->> 'provisional')::boolean <> true
         or threshold_item ->> 'rationale' <> expected_rationale then
        return false;
      end if;
    else
      if (threshold_item ->> 'provisional')::boolean <> false
         or btrim(coalesce(threshold_item ->> 'rationale', '')) = '' then
        return false;
      end if;
    end if;

    cumulative_net_cents :=
      (threshold_item ->> 'cumulativeNetRecipientThresholdCents')::bigint;
    incremental_net_cents :=
      (threshold_item ->> 'incrementalNetRecipientCents')::bigint;
    premium_rate_bps := (threshold_item ->> 'premiumRateBps')::integer;
    success_premium_cents := (threshold_item ->> 'successPremiumCents')::bigint;
    cumulative_success_premium_cents :=
      (threshold_item ->> 'cumulativeSuccessPremiumCents')::bigint;
    gross_success_requirement_cents :=
      (threshold_item ->> 'grossSuccessRequirementCents')::bigint;
    incremental_exposure_cents :=
      (threshold_item ->> 'incrementalFailureBonusExposureCents')::bigint;
    cumulative_exposure_cents :=
      (threshold_item ->> 'maximumFailureBonusExposureCents')::bigint;
    assumptions_json := threshold_item -> 'assumptions';

    if cumulative_net_cents <= previous_cumulative_net_cents
       or cumulative_net_cents > requested_maximum_funding_cents
       or incremental_net_cents <> cumulative_net_cents - previous_cumulative_net_cents
       or not public.mpgf_failure_bonus_provisional_pricing_valid(
         assumptions_json,
         failure_bonus_rate_bps,
         premium_rate_bps
       )
       or (assumptions_json ->> 'failureBonusRateBps')::integer <> failure_bonus_rate_bps
       or success_premium_cents < 1
       or success_premium_cents <>
         ((incremental_net_cents * premium_rate_bps::bigint) + 9999) / 10000
       or cumulative_success_premium_cents <>
         previous_cumulative_success_premium_cents + success_premium_cents
       or gross_success_requirement_cents <>
         cumulative_net_cents + cumulative_success_premium_cents then
      return false;
    end if;

    uncapped_cumulative_exposure :=
      ((cumulative_net_cents::numeric * failure_bonus_rate_bps::numeric) + 9999) / 10000;
    uncapped_cumulative_exposure := trunc(uncapped_cumulative_exposure);

    if cumulative_exposure_cents::numeric <>
         least(uncapped_cumulative_exposure, aggregate_cap)
       or incremental_exposure_cents <>
         cumulative_exposure_cents - previous_cumulative_exposure_cents
       or incremental_exposure_cents < 0 then
      return false;
    end if;

    if current_index = 1 and (
      cumulative_net_cents <> threshold_one_cents
      or premium_rate_bps <> threshold_one_premium_rate_bps
      or success_premium_cents <> threshold_one_premium_cents
      or gross_success_requirement_cents <> threshold_one_gross_cents
      or assumptions_json is distinct from threshold_one_pricing_json
    ) then
      return false;
    end if;

    previous_cumulative_net_cents := cumulative_net_cents;
    previous_cumulative_success_premium_cents := cumulative_success_premium_cents;
    previous_cumulative_exposure_cents := cumulative_exposure_cents;
  end loop;

  return current_index = threshold_count;
exception
  when others then
    return false;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_threshold_schedule_valid(
  jsonb, jsonb, text, integer, bigint, integer, bigint, bigint, jsonb, bigint, integer, integer, bigint
) from public, anon, authenticated;
grant execute on function public.mpgf_failure_bonus_threshold_schedule_valid(
  jsonb, jsonb, text, integer, bigint, integer, bigint, bigint, jsonb, bigint, integer, integer, bigint
) to authenticated, service_role;

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_success_premium_complete,
  add constraint mpgf_pool_proposals_success_premium_complete check (
    (
      public_goods_failure_bonus_enabled = false
      and public_goods_failure_bonus_rate_bps is null
      and public_goods_threshold_schedule_json is null
      and public_goods_failure_bonus_eligibility_json is null
      and public_goods_failure_bonus_max_participants is null
      and public_goods_failure_bonus_max_per_participant_cents is null
      and public_goods_failure_bonus_schedule_status is null
      and public_goods_success_premium_rate_bps is null
      and public_goods_success_premium_cents is null
      and public_goods_success_premium_payer is null
      and public_goods_success_premium_policy_version is null
      and public_goods_success_premium_provisional is null
      and public_goods_gross_success_requirement_cents is null
      and public_goods_success_premium_pricing_json is null
    )
    or
    (
      public_goods_failure_bonus_enabled = true
      and public_goods_threshold_amount_cents is not null
      and public_goods_threshold_amount_cents > 0
      and public_goods_threshold_supporters is not null
      and public_goods_threshold_supporters > 0
      and public_goods_failure_bonus_rate_bps between 1 and 10000
      and public_goods_threshold_schedule_json is not null
      and public_goods_failure_bonus_eligibility_json is not null
      and public_goods_failure_bonus_max_participants is not null
      and public_goods_failure_bonus_max_per_participant_cents is not null
      and public_goods_failure_bonus_schedule_status in ('pending_review', 'approved')
      and public_goods_success_premium_rate_bps is not null
      and public_goods_success_premium_cents is not null
      and public_goods_success_premium_cents > 0
      and public_goods_success_premium_payer = 'pool_creator_or_sponsor'
      and public_goods_success_premium_policy_version =
        'mpgf_failure_bonus_success_premium_v0_1'
      and public_goods_success_premium_provisional =
        (public_goods_failure_bonus_schedule_status = 'pending_review')
      and public_goods_gross_success_requirement_cents is not null
      and public_goods_success_premium_pricing_json is not null
      and public.mpgf_failure_bonus_threshold_schedule_valid(
        public_goods_threshold_schedule_json,
        public_goods_failure_bonus_eligibility_json,
        public_goods_failure_bonus_schedule_status,
        public_goods_failure_bonus_rate_bps,
        public_goods_threshold_amount_cents,
        public_goods_success_premium_rate_bps,
        public_goods_success_premium_cents,
        public_goods_gross_success_requirement_cents,
        public_goods_success_premium_pricing_json,
        requested_maximum_funding_cents,
        public_goods_threshold_supporters,
        public_goods_failure_bonus_max_participants,
        public_goods_failure_bonus_max_per_participant_cents
      )
    )
  ),
  drop constraint if exists mpgf_pool_proposals_failure_bonus_schedule_status_valid,
  add constraint mpgf_pool_proposals_failure_bonus_schedule_status_valid check (
    public_goods_failure_bonus_schedule_status is null
    or public_goods_failure_bonus_schedule_status in ('pending_review', 'approved')
  );

alter table public.mpgf_failure_bonus_premium_quotes
  add column if not exists failure_bonus_rate_bps integer,
  add column if not exists incremental_failure_bonus_exposure_cents bigint,
  add column if not exists maximum_failure_bonus_exposure_cents bigint,
  add column if not exists eligibility_json jsonb,
  add column if not exists max_participants integer,
  add column if not exists max_bonus_per_participant_cents bigint;

alter table public.mpgf_failure_bonus_premium_quotes
  alter column failure_bonus_rate_bps set not null,
  alter column incremental_failure_bonus_exposure_cents set not null,
  alter column maximum_failure_bonus_exposure_cents set not null,
  alter column eligibility_json set not null,
  alter column max_participants set not null,
  alter column max_bonus_per_participant_cents set not null,
  drop constraint if exists mpgf_failure_bonus_premium_quotes_failure_bonus_rate_valid,
  add constraint mpgf_failure_bonus_premium_quotes_failure_bonus_rate_valid check (
    failure_bonus_rate_bps between 1 and 10000
  ),
  drop constraint if exists mpgf_failure_bonus_premium_quotes_exposure_valid,
  add constraint mpgf_failure_bonus_premium_quotes_exposure_valid check (
    incremental_failure_bonus_exposure_cents >= 0
    and maximum_failure_bonus_exposure_cents >= incremental_failure_bonus_exposure_cents
    and maximum_failure_bonus_exposure_cents = least(
      ((cumulative_net_recipient_threshold_cents * failure_bonus_rate_bps::bigint) + 9999) / 10000,
      max_participants::bigint * max_bonus_per_participant_cents
    )
  ),
  drop constraint if exists mpgf_failure_bonus_premium_quotes_eligibility_valid,
  add constraint mpgf_failure_bonus_premium_quotes_eligibility_valid check (
    public.mpgf_failure_bonus_eligibility_policy_valid(
      eligibility_json,
      max_participants,
      max_bonus_per_participant_cents
    )
  ),
  drop constraint if exists mpgf_failure_bonus_premium_quotes_pricing_valid,
  add constraint mpgf_failure_bonus_premium_quotes_pricing_valid check (
    public.mpgf_failure_bonus_provisional_pricing_valid(
      pricing_json,
      failure_bonus_rate_bps,
      premium_rate_bps
    )
  );

create or replace function public.mpgf_failure_bonus_schedule_approval_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if old.public_goods_failure_bonus_schedule_status = 'approved'
     and new.public_goods_failure_bonus_schedule_status is distinct from 'approved' then
    raise exception using
      errcode = '23514',
      message = 'An approved failure-bonus schedule cannot return to a provisional state.';
  end if;

  if new.public_goods_failure_bonus_schedule_status = 'approved'
     and old.public_goods_failure_bonus_schedule_status is distinct from 'approved'
     and current_setting('app.mpgf_failure_bonus_schedule_approval', true) is distinct from new.id::text then
    raise exception using
      errcode = '42501',
      message = 'Only the atomic operator schedule-approval function can approve a failure-bonus schedule.';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_schedule_approval_guard()
  from public, anon, authenticated;

drop trigger if exists mpgf_pool_proposals_failure_bonus_schedule_approval_guard
  on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_failure_bonus_schedule_approval_guard
before update on public.mpgf_pool_proposals
for each row
execute function public.mpgf_failure_bonus_schedule_approval_guard();

create or replace function public.mpgf_freeze_failure_bonus_terms_after_acceptance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if old.first_accepted_pledge_at is not null and (
    new.public_goods_threshold_amount_cents is distinct from old.public_goods_threshold_amount_cents
    or new.public_goods_failure_bonus_enabled is distinct from old.public_goods_failure_bonus_enabled
    or new.public_goods_failure_bonus_rate_bps is distinct from old.public_goods_failure_bonus_rate_bps
    or new.public_goods_threshold_schedule_json is distinct from old.public_goods_threshold_schedule_json
    or new.public_goods_failure_bonus_eligibility_json is distinct from old.public_goods_failure_bonus_eligibility_json
    or new.public_goods_failure_bonus_max_participants is distinct from old.public_goods_failure_bonus_max_participants
    or new.public_goods_failure_bonus_max_per_participant_cents is distinct from old.public_goods_failure_bonus_max_per_participant_cents
    or new.public_goods_failure_bonus_schedule_status is distinct from old.public_goods_failure_bonus_schedule_status
    or new.public_goods_success_premium_rate_bps is distinct from old.public_goods_success_premium_rate_bps
    or new.public_goods_success_premium_cents is distinct from old.public_goods_success_premium_cents
    or new.public_goods_success_premium_payer is distinct from old.public_goods_success_premium_payer
    or new.public_goods_success_premium_policy_version is distinct from old.public_goods_success_premium_policy_version
    or new.public_goods_success_premium_included_in_net_threshold is distinct from old.public_goods_success_premium_included_in_net_threshold
    or new.public_goods_success_premium_provisional is distinct from old.public_goods_success_premium_provisional
    or new.public_goods_gross_success_requirement_cents is distinct from old.public_goods_gross_success_requirement_cents
    or new.public_goods_success_premium_pricing_json is distinct from old.public_goods_success_premium_pricing_json
  ) then
    raise exception using
      errcode = '23514',
      message = 'Failure-bonus formula, eligibility, caps, and thresholds cannot change after the first accepted pledge.';
  end if;
  return new;
end;
$function$;

revoke all on function public.mpgf_freeze_failure_bonus_terms_after_acceptance()
  from public, anon, authenticated;

drop trigger if exists mpgf_pool_proposals_freeze_failure_bonus_terms_after_acceptance
  on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_freeze_failure_bonus_terms_after_acceptance
before update on public.mpgf_pool_proposals
for each row
execute function public.mpgf_freeze_failure_bonus_terms_after_acceptance();

-- Extend the existing approved-quote freeze trigger to every multi-threshold economic term.
drop trigger if exists mpgf_pool_proposals_freeze_approved_premium_terms
  on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_freeze_approved_premium_terms
before update of
  public_goods_threshold_amount_cents,
  public_goods_failure_bonus_enabled,
  public_goods_failure_bonus_rate_bps,
  public_goods_threshold_schedule_json,
  public_goods_failure_bonus_eligibility_json,
  public_goods_failure_bonus_max_participants,
  public_goods_failure_bonus_max_per_participant_cents,
  public_goods_failure_bonus_schedule_status,
  public_goods_success_premium_rate_bps,
  public_goods_success_premium_cents,
  public_goods_success_premium_payer,
  public_goods_success_premium_policy_version,
  public_goods_success_premium_included_in_net_threshold,
  public_goods_success_premium_provisional,
  public_goods_gross_success_requirement_cents,
  public_goods_success_premium_pricing_json
on public.mpgf_pool_proposals
for each row
execute function public.mpgf_freeze_proposal_with_approved_premium_quote();

create or replace function public.mpgf_sync_failure_bonus_premium_quote()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  reserve_row public.mpgf_failure_bonus_reserves%rowtype;
  threshold_item jsonb;
  quote_hash_value text;
  current_hashes text[] := array[]::text[];
  threshold_count integer;
begin
  select *
  into reserve_row
  from public.mpgf_failure_bonus_reserves
  where reserve_key = 'moral-trade-common-failure-bonus-usd';

  if reserve_row.id is null then
    raise exception 'Common failure-bonus reserve metadata is missing.';
  end if;

  if new.public_goods_failure_bonus_enabled = false then
    update public.mpgf_failure_bonus_premium_quotes
    set status = 'superseded'
    where pool_proposal_id = new.id
      and status = 'pending_review';
    return new;
  end if;

  -- Approval changes only review state and operator rationale. Existing pending rows are
  -- atomically converted by the approval RPC; no new pending quote may be created here.
  if new.public_goods_failure_bonus_schedule_status = 'approved' then
    return new;
  end if;

  threshold_count := jsonb_array_length(new.public_goods_threshold_schedule_json -> 'thresholds');

  for threshold_item in
    select value
    from jsonb_array_elements(new.public_goods_threshold_schedule_json -> 'thresholds')
  loop
    quote_hash_value := 'sha256:' || pg_catalog.encode(
      extensions.digest(
        concat_ws(
          '|',
          new.id::text,
          threshold_item::text,
          new.public_goods_failure_bonus_eligibility_json::text,
          new.public_goods_success_premium_policy_version
        ),
        'sha256'
      ),
      'hex'
    );
    current_hashes := array_append(current_hashes, quote_hash_value);

    insert into public.mpgf_failure_bonus_premium_quotes (
      reserve_id,
      pool_proposal_id,
      threshold_id,
      threshold_index,
      cumulative_net_recipient_threshold_cents,
      incremental_net_recipient_cents,
      premium_rate_bps,
      success_premium_cents,
      cumulative_success_premium_cents,
      gross_success_requirement_cents,
      premium_payer,
      premium_included_in_net_recipient_threshold,
      pricing_mode,
      pricing_json,
      policy_version,
      provisional,
      rationale,
      status,
      quote_hash,
      failure_bonus_rate_bps,
      incremental_failure_bonus_exposure_cents,
      maximum_failure_bonus_exposure_cents,
      eligibility_json,
      max_participants,
      max_bonus_per_participant_cents
    ) values (
      reserve_row.id,
      new.id,
      threshold_item ->> 'thresholdId',
      (threshold_item ->> 'thresholdIndex')::integer,
      (threshold_item ->> 'cumulativeNetRecipientThresholdCents')::bigint,
      (threshold_item ->> 'incrementalNetRecipientCents')::bigint,
      (threshold_item ->> 'premiumRateBps')::integer,
      (threshold_item ->> 'successPremiumCents')::bigint,
      (threshold_item ->> 'cumulativeSuccessPremiumCents')::bigint,
      (threshold_item ->> 'grossSuccessRequirementCents')::bigint,
      'pool_creator_or_sponsor',
      false,
      'experience_rated',
      threshold_item -> 'assumptions',
      new.public_goods_success_premium_policy_version,
      true,
      threshold_item ->> 'rationale',
      'pending_review',
      quote_hash_value,
      new.public_goods_failure_bonus_rate_bps,
      (threshold_item ->> 'incrementalFailureBonusExposureCents')::bigint,
      (threshold_item ->> 'maximumFailureBonusExposureCents')::bigint,
      new.public_goods_failure_bonus_eligibility_json,
      new.public_goods_failure_bonus_max_participants,
      new.public_goods_failure_bonus_max_per_participant_cents
    )
    on conflict (quote_hash) do update set
      status = case
        when public.mpgf_failure_bonus_premium_quotes.status = 'approved'
          then public.mpgf_failure_bonus_premium_quotes.status
        else 'pending_review'
      end;
  end loop;

  update public.mpgf_failure_bonus_premium_quotes
  set status = 'superseded'
  where pool_proposal_id = new.id
    and status = 'pending_review'
    and not (quote_hash = any(current_hashes));

  if cardinality(current_hashes) <> threshold_count then
    raise exception 'Premium quote synchronization did not cover every threshold.';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_sync_failure_bonus_premium_quote()
  from public, anon, authenticated;

drop trigger if exists mpgf_pool_proposals_sync_failure_bonus_premium_quote
  on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_sync_failure_bonus_premium_quote
after insert or update of
  public_goods_failure_bonus_enabled,
  public_goods_failure_bonus_rate_bps,
  public_goods_threshold_schedule_json,
  public_goods_failure_bonus_eligibility_json,
  public_goods_failure_bonus_max_participants,
  public_goods_failure_bonus_max_per_participant_cents,
  public_goods_failure_bonus_schedule_status,
  public_goods_success_premium_rate_bps,
  public_goods_success_premium_cents,
  public_goods_success_premium_payer,
  public_goods_success_premium_policy_version,
  public_goods_success_premium_provisional,
  public_goods_gross_success_requirement_cents,
  public_goods_success_premium_pricing_json
on public.mpgf_pool_proposals
for each row
execute function public.mpgf_sync_failure_bonus_premium_quote();

create or replace function public.mpgf_failure_bonus_quote_approval_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and current_setting('app.mpgf_failure_bonus_schedule_approval', true)
       is distinct from new.pool_proposal_id::text then
    raise exception using
      errcode = '42501',
      message = 'Failure-bonus threshold quotes must be approved as one atomic schedule.';
  end if;
  return new;
end;
$function$;

revoke all on function public.mpgf_failure_bonus_quote_approval_guard()
  from public, anon, authenticated;

drop trigger if exists mpgf_failure_bonus_quote_approval_guard
  on public.mpgf_failure_bonus_premium_quotes;
create trigger mpgf_failure_bonus_quote_approval_guard
before update on public.mpgf_failure_bonus_premium_quotes
for each row
execute function public.mpgf_failure_bonus_quote_approval_guard();

create or replace function public.mpgf_approve_failure_bonus_premium_schedule(
  proposal_id_input uuid,
  reviewer_id_input uuid,
  rationale_input text
)
returns table (
  pool_proposal_id uuid,
  approved_threshold_count integer,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  threshold_item jsonb;
  quote_row public.mpgf_failure_bonus_premium_quotes%rowtype;
  approved_schedule jsonb;
  approved_thresholds jsonb;
  threshold_count integer;
  approved_timestamp timestamptz := timezone('utc', now());
  operator_rationale text := btrim(rationale_input);
begin
  if reviewer_id_input is null
     or not exists (select 1 from public.profiles where id = reviewer_id_input) then
    raise exception using errcode = '23503', message = 'A valid operator profile is required.';
  end if;
  if operator_rationale = '' then
    raise exception using errcode = '22023', message = 'Operator approval requires a rationale.';
  end if;

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = proposal_id_input
  for update;

  if proposal_row.id is null then
    raise exception using errcode = 'P0002', message = 'Failure-bonus proposal was not found.';
  end if;
  if proposal_row.status <> 'submitted'
     or proposal_row.public_goods_failure_bonus_enabled <> true
     or proposal_row.public_goods_failure_bonus_schedule_status <> 'pending_review'
     or proposal_row.public_goods_success_premium_provisional <> true then
    raise exception using errcode = '23514', message = 'Only a submitted proposal with a complete pending failure-bonus schedule can be approved.';
  end if;
  if proposal_row.first_accepted_pledge_at is not null then
    raise exception using errcode = '23514', message = 'A failure-bonus schedule must be approved before the first accepted pledge.';
  end if;

  threshold_count := jsonb_array_length(
    proposal_row.public_goods_threshold_schedule_json -> 'thresholds'
  );

  if (
    select count(*)
    from public.mpgf_failure_bonus_premium_quotes
    where pool_proposal_id = proposal_row.id
      and status = 'pending_review'
  ) <> threshold_count then
    raise exception using errcode = '23514', message = 'The pending quote set does not match the complete threshold schedule.';
  end if;

  for threshold_item in
    select value
    from jsonb_array_elements(
      proposal_row.public_goods_threshold_schedule_json -> 'thresholds'
    )
  loop
    select * into quote_row
    from public.mpgf_failure_bonus_premium_quotes
    where pool_proposal_id = proposal_row.id
      and threshold_index = (threshold_item ->> 'thresholdIndex')::integer
      and status = 'pending_review'
    for update;

    if quote_row.id is null
       or quote_row.threshold_id <> threshold_item ->> 'thresholdId'
       or quote_row.cumulative_net_recipient_threshold_cents <>
          (threshold_item ->> 'cumulativeNetRecipientThresholdCents')::bigint
       or quote_row.incremental_net_recipient_cents <>
          (threshold_item ->> 'incrementalNetRecipientCents')::bigint
       or quote_row.premium_rate_bps <> (threshold_item ->> 'premiumRateBps')::integer
       or quote_row.success_premium_cents <> (threshold_item ->> 'successPremiumCents')::bigint
       or quote_row.cumulative_success_premium_cents <>
          (threshold_item ->> 'cumulativeSuccessPremiumCents')::bigint
       or quote_row.gross_success_requirement_cents <>
          (threshold_item ->> 'grossSuccessRequirementCents')::bigint
       or quote_row.incremental_failure_bonus_exposure_cents <>
          (threshold_item ->> 'incrementalFailureBonusExposureCents')::bigint
       or quote_row.maximum_failure_bonus_exposure_cents <>
          (threshold_item ->> 'maximumFailureBonusExposureCents')::bigint
       or quote_row.pricing_json is distinct from threshold_item -> 'assumptions'
       or quote_row.eligibility_json is distinct from
          proposal_row.public_goods_failure_bonus_eligibility_json then
      raise exception using errcode = '23514', message = 'A pending threshold quote differs from the current proposal schedule.';
    end if;
  end loop;

  select jsonb_agg(
    (value - 'provisional' - 'rationale') || jsonb_build_object(
      'provisional', false,
      'rationale', operator_rationale
    )
    order by (value ->> 'thresholdIndex')::integer
  ) into approved_thresholds
  from jsonb_array_elements(
    proposal_row.public_goods_threshold_schedule_json -> 'thresholds'
  );

  approved_schedule := jsonb_set(
    proposal_row.public_goods_threshold_schedule_json,
    '{thresholds}',
    approved_thresholds,
    false
  );

  perform set_config(
    'app.mpgf_failure_bonus_schedule_approval',
    proposal_row.id::text,
    true
  );

  update public.mpgf_pool_proposals
  set public_goods_threshold_schedule_json = approved_schedule,
      public_goods_failure_bonus_schedule_status = 'approved',
      public_goods_success_premium_provisional = false
  where id = proposal_row.id;

  update public.mpgf_failure_bonus_premium_quotes
  set status = 'approved',
      provisional = false,
      rationale = operator_rationale,
      approved_by = reviewer_id_input,
      approved_at = approved_timestamp
  where pool_proposal_id = proposal_row.id
    and status = 'pending_review';

  if not found then
    raise exception using errcode = '23514', message = 'No pending threshold quotes were approved.';
  end if;

  return query select proposal_row.id, threshold_count, approved_timestamp;
end;
$function$;

comment on function public.mpgf_approve_failure_bonus_premium_schedule(uuid, uuid, text) is
  'Atomically approves every current threshold quote and finalizes the matching proposal schedule. Partial approval and post-pledge approval are prohibited.';

revoke all on function public.mpgf_approve_failure_bonus_premium_schedule(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mpgf_approve_failure_bonus_premium_schedule(uuid, uuid, text)
  to service_role;

create or replace function public.mpgf_require_approved_failure_bonus_before_pledge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
begin
  if new.pool_proposal_id is null
     or new.status not in ('pledged', 'converted_to_payment_intent') then
    return new;
  end if;

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = new.pool_proposal_id;

  if proposal_row.public_goods_failure_bonus_enabled = true
     and proposal_row.public_goods_failure_bonus_schedule_status <> 'approved' then
    raise exception using
      errcode = '23514',
      message = 'Failure-bonus pledges cannot be accepted until an operator approves the complete threshold schedule.';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_require_approved_failure_bonus_before_pledge()
  from public, anon, authenticated;

drop trigger if exists mpgf_pledges_require_approved_failure_bonus_schedule
  on public.mpgf_pledges;
create trigger mpgf_pledges_require_approved_failure_bonus_schedule
before insert or update of pool_proposal_id, status
on public.mpgf_pledges
for each row
execute function public.mpgf_require_approved_failure_bonus_before_pledge();

commit;
