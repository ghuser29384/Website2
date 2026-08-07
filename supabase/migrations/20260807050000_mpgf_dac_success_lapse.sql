begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_status_check;
alter table public.mpgf_pool_proposals
  add constraint mpgf_pool_proposals_status_check
  check (
    status in (
      'draft',
      'submitted',
      'under_review',
      'changes_requested',
      'approved_as_candidate',
      'rejected',
      'withdrawn',
      'succeeded',
      'lapsed'
    )
  );

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_lock_complete;
alter table public.mpgf_pool_proposals
  add constraint mpgf_pool_proposals_lock_complete
  check (
    (
      status in ('approved_as_candidate', 'succeeded', 'lapsed')
    ) = (
      approved_terms_version is not null
      and operative_terms_sha256 is not null
      and terms_locked_at is not null
      and reviewed_by is not null
      and reviewed_at is not null
    )
  ) not valid;

alter table public.mpgf_pool_lifecycle_events
  drop constraint if exists mpgf_pool_lifecycle_events_event_type_check;
alter table public.mpgf_pool_lifecycle_events
  add constraint mpgf_pool_lifecycle_events_event_type_check
  check (
    event_type in (
      'review_started',
      'changes_requested',
      'revision_submitted',
      'proposal_rejected',
      'terms_approved_and_frozen',
      'pool_published',
      'pool_succeeded',
      'pool_lapsed'
    )
  );

alter table public.mpgf_dac_pledge_events
  drop constraint if exists mpgf_dac_pledge_events_type_valid;
alter table public.mpgf_dac_pledge_events
  add constraint mpgf_dac_pledge_events_type_valid
  check (
    event_type in (
      'pledge_created',
      'eligibility_reviewed',
      'pledge_expired'
    )
  );

create table if not exists public.mpgf_dac_campaign_outcomes (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null
    references public.mpgf_public_goods_campaigns (id) on delete restrict,
  pool_proposal_id uuid not null
    references public.mpgf_pool_proposals (id) on delete restrict,
  terms_version integer not null,
  terms_sha256 text not null,
  outcome_status text not null,
  eligible_amount_cents bigint not null,
  eligible_supporter_count integer not null,
  threshold_amount_cents bigint not null,
  threshold_supporters integer not null,
  deadline_at timestamptz not null,
  evaluated_at timestamptz not null,
  finalized_by uuid not null
    references public.profiles (id) on delete restrict,
  reason text not null,
  outcome_json jsonb not null,
  outcome_sha256 text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_dac_campaign_outcomes_campaign_unique
    unique (campaign_id),
  constraint mpgf_dac_campaign_outcomes_proposal_unique
    unique (pool_proposal_id),
  constraint mpgf_dac_campaign_outcomes_proposal_version_fkey
    foreign key (pool_proposal_id, terms_version)
    references public.mpgf_pool_proposal_versions (proposal_id, terms_version)
    on delete restrict,
  constraint mpgf_dac_campaign_outcomes_terms_version_positive
    check (terms_version > 0),
  constraint mpgf_dac_campaign_outcomes_terms_hash_format
    check (terms_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_dac_campaign_outcomes_status_valid
    check (outcome_status in ('succeeded', 'lapsed')),
  constraint mpgf_dac_campaign_outcomes_eligible_amount_nonnegative
    check (eligible_amount_cents >= 0),
  constraint mpgf_dac_campaign_outcomes_eligible_supporters_nonnegative
    check (eligible_supporter_count >= 0),
  constraint mpgf_dac_campaign_outcomes_threshold_amount_positive
    check (threshold_amount_cents > 0),
  constraint mpgf_dac_campaign_outcomes_threshold_supporters_positive
    check (threshold_supporters > 0),
  constraint mpgf_dac_campaign_outcomes_reason_required
    check (btrim(reason) <> ''),
  constraint mpgf_dac_campaign_outcomes_object
    check (jsonb_typeof(outcome_json) = 'object'),
  constraint mpgf_dac_campaign_outcomes_hash_format
    check (outcome_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_dac_campaign_outcomes_threshold_result_valid
    check (
      (
        outcome_status = 'succeeded'
        and eligible_amount_cents >= threshold_amount_cents
        and eligible_supporter_count >= threshold_supporters
      )
      or
      (
        outcome_status = 'lapsed'
        and evaluated_at >= deadline_at
        and (
          eligible_amount_cents < threshold_amount_cents
          or eligible_supporter_count < threshold_supporters
        )
      )
    )
);

create index if not exists mpgf_dac_campaign_outcomes_status_created_idx
  on public.mpgf_dac_campaign_outcomes (outcome_status, created_at desc);
create index if not exists mpgf_dac_campaign_outcomes_proposal_version_idx
  on public.mpgf_dac_campaign_outcomes (pool_proposal_id, terms_version);

drop trigger if exists mpgf_dac_campaign_outcomes_immutable
  on public.mpgf_dac_campaign_outcomes;
create trigger mpgf_dac_campaign_outcomes_immutable
before update or delete on public.mpgf_dac_campaign_outcomes
for each row execute function public.mpgf_dac_immutable_row();

create or replace function public.mpgf_guard_published_pool_campaign()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  finalization_token text :=
    current_setting('app.mpgf_dac_campaign_finalization', true);
  status_writer boolean := current_user not in ('anon', 'authenticated');
begin
  if tg_op = 'DELETE' then
    if old.pool_proposal_id is not null then
      raise exception using
        errcode = '23514',
        message = 'A published MPGF pool campaign cannot be deleted; use an audited lifecycle status transition.';
    end if;
    return old;
  end if;

  if old.pool_proposal_id is not null and (
    new.id is distinct from old.id
    or new.round_id is distinct from old.round_id
    or new.slug is distinct from old.slug
    or new.pool_alternative_id is distinct from old.pool_alternative_id
    or new.title is distinct from old.title
    or new.destination_type is distinct from old.destination_type
    or new.destination_ref is distinct from old.destination_ref
    or new.cause_tags is distinct from old.cause_tags
    or new.public_summary is distinct from old.public_summary
    or new.threshold_amount_cents is distinct from old.threshold_amount_cents
    or new.threshold_supporters is distinct from old.threshold_supporters
    or new.deadline_at is distinct from old.deadline_at
    or new.verification_method is distinct from old.verification_method
    or new.baseline_rule is distinct from old.baseline_rule
    or new.exit_rule is distinct from old.exit_rule
    or new.pool_proposal_id is distinct from old.pool_proposal_id
    or new.threshold_visibility is distinct from old.threshold_visibility
    or new.published_terms_version is distinct from old.published_terms_version
    or new.published_terms_sha256 is distinct from old.published_terms_sha256
    or new.published_by is distinct from old.published_by
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'Published MPGF campaign identity and operative terms are immutable.';
  end if;

  if old.pool_proposal_id is not null
     and new.review_status is distinct from old.review_status
     and not status_writer then
    raise exception using
      errcode = '42501',
      message = 'Published pool campaign status may change only through an authorized service lifecycle.';
  end if;

  if old.pool_proposal_id is not null
     and old.review_status = 'finalized'
     and new.review_status is distinct from 'finalized' then
    raise exception using
      errcode = '23514',
      message = 'A finalized DAC campaign cannot return to a nonterminal state.';
  end if;

  if old.pool_proposal_id is not null
     and old.review_status is distinct from 'finalized'
     and new.review_status = 'finalized'
     and finalization_token is distinct from old.id then
    raise exception using
      errcode = '42501',
      message = 'A DAC campaign can be finalized only through the audited terminal-outcome function.';
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_guard_published_pool_campaign()
  from public, anon, authenticated;

create or replace function public.mpgf_review_dac_pledge_eligibility(
  p_pledge_id uuid,
  p_reviewer_id uuid,
  p_eligibility_state text,
  p_human_score_bps integer,
  p_reason text
)
returns table (
  reviewed_pledge_id uuid,
  reviewed_pledge_intent_id uuid,
  reviewed_campaign_id text,
  reviewed_profile_id uuid,
  eligibility_state text,
  human_score_bps integer,
  eligibility_event_id uuid,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  pledge_row public.mpgf_public_goods_pledges%rowtype;
  intent_row public.mpgf_dac_pledge_intents%rowtype;
  campaign_row public.mpgf_public_goods_campaigns%rowtype;
  existing_event public.mpgf_dac_pledge_events%rowtype;
  event_id_value uuid := gen_random_uuid();
  reviewed_at_value timestamptz := clock_timestamp();
  reason_value text := btrim(coalesce(p_reason, ''));
  event_value jsonb;
begin
  if p_pledge_id is null then
    raise exception using errcode = '22023', message = 'A DAC pledge is required.';
  end if;
  if p_eligibility_state is null
     or p_eligibility_state not in (
       'eligible',
       'duplicate_identity',
       'below_minimum',
       'blocked'
     ) then
    raise exception using
      errcode = '22023',
      message = 'A final DAC eligibility state is required.';
  end if;
  if reason_value = '' then
    raise exception using
      errcode = '22023',
      message = 'An eligibility-review rationale is required.';
  end if;
  if p_eligibility_state = 'eligible' and (
    p_human_score_bps is null
    or p_human_score_bps < 1
    or p_human_score_bps > 10000
  ) then
    raise exception using
      errcode = '22023',
      message = 'An eligible pledge requires a human score from 1 to 10000 basis points.';
  end if;
  if p_eligibility_state <> 'eligible'
     and coalesce(p_human_score_bps, 0) <> 0 then
    raise exception using
      errcode = '22023',
      message = 'An ineligible pledge must have a zero human score.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_pledge_id::text || ':dac-eligibility', 0)
  );

  select * into pledge_row
  from public.mpgf_public_goods_pledges as pledge
  where pledge.id = p_pledge_id;

  if pledge_row.id is null
     or pledge_row.pledge_intent_id is null
     or pledge_row.pool_proposal_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'A proposal-bound DAC pledge was not found.';
  end if;

  select * into intent_row
  from public.mpgf_dac_pledge_intents as intent
  where intent.id = pledge_row.pledge_intent_id;

  if intent_row.id is null
     or intent_row.campaign_id is distinct from pledge_row.campaign_id
     or intent_row.pool_proposal_id is distinct from pledge_row.pool_proposal_id
     or intent_row.terms_version is distinct from pledge_row.terms_version
     or intent_row.terms_sha256 is distinct from pledge_row.terms_sha256
     or intent_row.profile_id is distinct from pledge_row.profile_id
     or intent_row.amount_cents is distinct from pledge_row.amount_cents
     or intent_row.currency is distinct from pledge_row.currency
     or intent_row.visibility_mode is distinct from pledge_row.visibility_mode
     or intent_row.supporter_reason is distinct from pledge_row.supporter_reason
     or intent_row.accepted_at is distinct from pledge_row.accepted_at then
    raise exception using
      errcode = '23514',
      message = 'The canonical DAC pledge differs from its immutable consent intent.';
  end if;

  perform public.mpgf_assert_authorized_pool_reviewer(
    p_reviewer_id,
    pledge_row.pool_proposal_id
  );

  if pledge_row.profile_id = p_reviewer_id then
    raise exception using
      errcode = '42501',
      message = 'A reviewer cannot decide their own DAC pledge eligibility.';
  end if;

  select * into campaign_row
  from public.mpgf_public_goods_campaigns as campaign
  where campaign.id = pledge_row.campaign_id
  for share;

  if campaign_row.id is null
     or campaign_row.review_status <> 'approved'
     or campaign_row.pool_proposal_id is distinct from pledge_row.pool_proposal_id
     or campaign_row.published_terms_version is distinct from pledge_row.terms_version
     or campaign_row.published_terms_sha256 is distinct from pledge_row.terms_sha256
     or exists (
       select 1
       from public.mpgf_dac_campaign_outcomes as outcome
       where outcome.campaign_id = campaign_row.id
     ) then
    raise exception using
      errcode = '23514',
      message = 'Eligibility can be decided only for a live, exact-version DAC campaign.';
  end if;

  select * into pledge_row
  from public.mpgf_public_goods_pledges as pledge
  where pledge.id = p_pledge_id
  for update;

  if pledge_row.campaign_id is distinct from campaign_row.id
     or pledge_row.pool_proposal_id is distinct from campaign_row.pool_proposal_id
     or pledge_row.terms_version is distinct from campaign_row.published_terms_version
     or pledge_row.terms_sha256 is distinct from campaign_row.published_terms_sha256 then
    raise exception using
      errcode = '23514',
      message = 'The DAC pledge changed while eligibility review was starting.';
  end if;

  select * into existing_event
  from public.mpgf_dac_pledge_events as event
  where event.pledge_id = pledge_row.id
    and event.event_type = 'eligibility_reviewed';

  if pledge_row.eligibility_state <> 'pending_review' then
    if pledge_row.eligibility_state = p_eligibility_state
       and pledge_row.human_score_bps = coalesce(p_human_score_bps, 0)
       and existing_event.id is not null then
      return query select
        pledge_row.id,
        pledge_row.pledge_intent_id,
        pledge_row.campaign_id,
        pledge_row.profile_id,
        pledge_row.eligibility_state,
        pledge_row.human_score_bps,
        existing_event.id,
        existing_event.created_at;
      return;
    end if;

    raise exception using
      errcode = '23514',
      message = 'DAC pledge eligibility was already decided and cannot be changed.';
  end if;

  if existing_event.id is not null then
    raise exception using
      errcode = '23514',
      message = 'A pending DAC pledge already has a final eligibility event.';
  end if;

  perform set_config(
    'app.mpgf_dac_internal_write',
    pledge_row.pledge_intent_id::text,
    true
  );

  update public.mpgf_public_goods_pledges
  set eligibility_state = p_eligibility_state,
      human_score_bps = coalesce(p_human_score_bps, 0)
  where id = pledge_row.id;

  event_value := jsonb_build_object(
    'schemaVersion', 'mpgf_dac_pledge_event_v1',
    'eventType', 'eligibility_reviewed',
    'pledgeIntentId', pledge_row.pledge_intent_id,
    'pledgeId', pledge_row.id,
    'campaignId', pledge_row.campaign_id,
    'poolProposalId', pledge_row.pool_proposal_id,
    'profileId', pledge_row.profile_id,
    'reviewerId', p_reviewer_id,
    'termsVersion', pledge_row.terms_version,
    'termsSha256', pledge_row.terms_sha256,
    'amountCents', pledge_row.amount_cents,
    'currency', pledge_row.currency,
    'fromEligibilityState', pledge_row.eligibility_state,
    'toEligibilityState', p_eligibility_state,
    'humanScoreBps', coalesce(p_human_score_bps, 0),
    'reason', reason_value,
    'paymentAuthorized', false,
    'reviewedAt', reviewed_at_value
  );

  insert into public.mpgf_dac_pledge_events (
    id,
    pledge_intent_id,
    pledge_id,
    campaign_id,
    pool_proposal_id,
    profile_id,
    event_type,
    terms_version,
    terms_sha256,
    amount_cents,
    currency,
    event_json,
    event_sha256,
    created_at
  ) values (
    event_id_value,
    pledge_row.pledge_intent_id,
    pledge_row.id,
    pledge_row.campaign_id,
    pledge_row.pool_proposal_id,
    pledge_row.profile_id,
    'eligibility_reviewed',
    pledge_row.terms_version,
    pledge_row.terms_sha256,
    pledge_row.amount_cents,
    pledge_row.currency,
    event_value,
    public.mpgf_dac_json_sha256(event_value),
    reviewed_at_value
  );

  perform set_config('app.mpgf_dac_internal_write', '', true);

  return query select
    pledge_row.id,
    pledge_row.pledge_intent_id,
    pledge_row.campaign_id,
    pledge_row.profile_id,
    p_eligibility_state,
    coalesce(p_human_score_bps, 0),
    event_id_value,
    reviewed_at_value;
end;
$function$;

revoke all on function public.mpgf_review_dac_pledge_eligibility(
  uuid,
  uuid,
  text,
  integer,
  text
) from public, anon, authenticated;
grant execute on function public.mpgf_review_dac_pledge_eligibility(
  uuid,
  uuid,
  text,
  integer,
  text
) to service_role;

create or replace function public.mpgf_finalize_dac_campaign(
  p_campaign_id text,
  p_reviewer_id uuid,
  p_reason text
)
returns table (
  outcome_id uuid,
  finalized_campaign_id text,
  finalized_pool_proposal_id uuid,
  finalized_terms_version integer,
  finalized_terms_sha256 text,
  outcome_status text,
  eligible_amount_cents bigint,
  eligible_supporter_count integer,
  threshold_amount_cents bigint,
  threshold_supporters integer,
  deadline_at timestamptz,
  evaluated_at timestamptz,
  expired_pledge_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  campaign_id_value text := btrim(coalesce(p_campaign_id, ''));
  reason_value text := btrim(coalesce(p_reason, ''));
  evaluated_at_value timestamptz := clock_timestamp();
  campaign_row public.mpgf_public_goods_campaigns%rowtype;
  proposal_row public.mpgf_pool_proposals%rowtype;
  existing_outcome public.mpgf_dac_campaign_outcomes%rowtype;
  pledge_row public.mpgf_public_goods_pledges%rowtype;
  outcome_id_value uuid := gen_random_uuid();
  outcome_status_value text;
  eligible_amount_value bigint := 0;
  eligible_supporter_value integer := 0;
  expired_pledge_count_value integer := 0;
  outcome_value jsonb;
  expiry_event_value jsonb;
begin
  if campaign_id_value = '' then
    raise exception using errcode = '22023', message = 'A DAC campaign is required.';
  end if;
  if reason_value = '' then
    raise exception using
      errcode = '22023',
      message = 'A terminal-outcome rationale is required.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(campaign_id_value || ':dac-terminal-outcome', 0)
  );

  select * into campaign_row
  from public.mpgf_public_goods_campaigns as campaign
  where campaign.id = campaign_id_value
  for update;

  if campaign_row.id is null
     or campaign_row.pool_proposal_id is null
     or campaign_row.published_terms_version is null
     or campaign_row.published_terms_sha256 is null
     or campaign_row.published_at is null then
    raise exception using
      errcode = 'P0002',
      message = 'A published proposal-bound DAC campaign was not found.';
  end if;

  select * into proposal_row
  from public.mpgf_pool_proposals as proposal
  where proposal.id = campaign_row.pool_proposal_id
  for update;

  if proposal_row.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The published DAC proposal was not found.';
  end if;

  perform public.mpgf_assert_authorized_pool_reviewer(
    p_reviewer_id,
    proposal_row.id
  );

  select * into existing_outcome
  from public.mpgf_dac_campaign_outcomes as outcome
  where outcome.campaign_id = campaign_row.id;

  if existing_outcome.id is not null then
    if campaign_row.review_status <> 'finalized'
       or proposal_row.status is distinct from existing_outcome.outcome_status
       or existing_outcome.pool_proposal_id is distinct from proposal_row.id
       or existing_outcome.terms_version is distinct from campaign_row.published_terms_version
       or existing_outcome.terms_sha256 is distinct from campaign_row.published_terms_sha256 then
      raise exception using
        errcode = '23514',
        message = 'The existing DAC outcome disagrees with current terminal campaign state.';
    end if;

    select count(*)::integer into expired_pledge_count_value
    from public.mpgf_public_goods_pledges as pledge
    where pledge.campaign_id = campaign_row.id
      and pledge.pledge_intent_id is not null
      and pledge.status = 'expired';

    return query select
      existing_outcome.id,
      existing_outcome.campaign_id,
      existing_outcome.pool_proposal_id,
      existing_outcome.terms_version,
      existing_outcome.terms_sha256,
      existing_outcome.outcome_status,
      existing_outcome.eligible_amount_cents,
      existing_outcome.eligible_supporter_count,
      existing_outcome.threshold_amount_cents,
      existing_outcome.threshold_supporters,
      existing_outcome.deadline_at,
      existing_outcome.evaluated_at,
      expired_pledge_count_value;
    return;
  end if;

  if campaign_row.review_status <> 'approved'
     or proposal_row.status <> 'approved_as_candidate'
     or proposal_row.public_goods_failure_bonus_enabled is distinct from true
     or proposal_row.public_goods_failure_bonus_schedule_status <> 'approved'
     or proposal_row.public_goods_success_premium_provisional is distinct from false
     or proposal_row.approved_terms_version is distinct from campaign_row.published_terms_version
     or proposal_row.operative_terms_sha256 is distinct from campaign_row.published_terms_sha256
     or proposal_row.terms_locked_at is null
     or proposal_row.public_goods_deadline_at is distinct from campaign_row.deadline_at
     or proposal_row.public_goods_threshold_amount_cents is distinct from campaign_row.threshold_amount_cents
     or proposal_row.public_goods_threshold_supporters is distinct from campaign_row.threshold_supporters then
    raise exception using
      errcode = '23514',
      message = 'Only a live DAC campaign matching its approved frozen proposal can be finalized.';
  end if;

  if not exists (
    select 1
    from public.mpgf_pool_proposal_versions as proposal_version
    where proposal_version.proposal_id = proposal_row.id
      and proposal_version.terms_version = campaign_row.published_terms_version
      and proposal_version.terms_sha256 = campaign_row.published_terms_sha256
  ) then
    raise exception using
      errcode = '23514',
      message = 'The DAC campaign is missing its immutable approved proposal version.';
  end if;

  if exists (
    select 1
    from public.mpgf_public_goods_pledges as pledge
    where pledge.campaign_id = campaign_row.id
      and pledge.pledge_intent_id is not null
      and (
        pledge.pool_proposal_id is distinct from proposal_row.id
        or pledge.terms_version is distinct from campaign_row.published_terms_version
        or pledge.terms_sha256 is distinct from campaign_row.published_terms_sha256
        or pledge.accepted_at is null
        or pledge.accepted_at > campaign_row.deadline_at
        or pledge.expires_at is distinct from campaign_row.deadline_at
        or pledge.capture_mode <> 'signed_intent'
        or pledge.is_recurring
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'A DAC pledge differs from the exact published campaign terms.';
  end if;

  if exists (
    select 1
    from public.mpgf_public_goods_pledges as pledge
    where pledge.campaign_id = campaign_row.id
      and pledge.pledge_intent_id is not null
      and (
        pledge.payment_intent_ref is not null
        or pledge.status = 'captured'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'This no-payment finalization tranche cannot process a charged or captured DAC pledge.';
  end if;

  if exists (
    select 1
    from public.mpgf_public_goods_pledges as pledge
    left join public.mpgf_dac_pledge_intents as intent
      on intent.id = pledge.pledge_intent_id
    where pledge.campaign_id = campaign_row.id
      and pledge.pledge_intent_id is not null
      and (
        intent.id is null
        or intent.campaign_id is distinct from pledge.campaign_id
        or intent.pool_proposal_id is distinct from pledge.pool_proposal_id
        or intent.terms_version is distinct from pledge.terms_version
        or intent.terms_sha256 is distinct from pledge.terms_sha256
        or intent.profile_id is distinct from pledge.profile_id
        or intent.amount_cents is distinct from pledge.amount_cents
        or intent.currency is distinct from pledge.currency
        or intent.visibility_mode is distinct from pledge.visibility_mode
        or intent.supporter_reason is distinct from pledge.supporter_reason
        or intent.accepted_at is distinct from pledge.accepted_at
        or pledge.eligibility_state = 'pending_review'
        or not exists (
          select 1
          from public.mpgf_dac_pledge_events as eligibility_event
          where eligibility_event.pledge_id = pledge.id
            and eligibility_event.pledge_intent_id = pledge.pledge_intent_id
            and eligibility_event.campaign_id = pledge.campaign_id
            and eligibility_event.pool_proposal_id = pledge.pool_proposal_id
            and eligibility_event.profile_id = pledge.profile_id
            and eligibility_event.event_type = 'eligibility_reviewed'
            and eligibility_event.terms_version = pledge.terms_version
            and eligibility_event.terms_sha256 = pledge.terms_sha256
            and eligibility_event.amount_cents = pledge.amount_cents
            and eligibility_event.currency = pledge.currency
            and eligibility_event.event_sha256 =
              public.mpgf_dac_json_sha256(eligibility_event.event_json)
            and eligibility_event.event_json ->> 'toEligibilityState' =
              pledge.eligibility_state
            and (eligibility_event.event_json ->> 'humanScoreBps')::integer =
              pledge.human_score_bps
        )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Every DAC pledge must have a final audited eligibility decision bound to its immutable consent intent before finalization.';
  end if;

  select
    coalesce(sum(pledge.amount_cents), 0)::bigint,
    count(distinct pledge.profile_id)::integer
  into eligible_amount_value, eligible_supporter_value
  from public.mpgf_public_goods_pledges as pledge
  where pledge.campaign_id = campaign_row.id
    and pledge.pledge_intent_id is not null
    and pledge.pool_proposal_id = proposal_row.id
    and pledge.terms_version = campaign_row.published_terms_version
    and pledge.terms_sha256 = campaign_row.published_terms_sha256
    and pledge.eligibility_state = 'eligible'
    and pledge.status = 'pledged'
    and pledge.accepted_at <= campaign_row.deadline_at
    and pledge.expires_at = campaign_row.deadline_at;

  if eligible_amount_value >= campaign_row.threshold_amount_cents
     and eligible_supporter_value >= campaign_row.threshold_supporters then
    outcome_status_value := 'succeeded';
  elsif evaluated_at_value >= campaign_row.deadline_at then
    outcome_status_value := 'lapsed';
  else
    raise exception using
      errcode = '23514',
      message = 'The DAC threshold is unmet and its deadline has not arrived.';
  end if;

  outcome_value := jsonb_build_object(
    'schemaVersion', 'mpgf_dac_campaign_outcome_v1',
    'mechanism', 'dominant_assurance_contract',
    'outcomeStatus', outcome_status_value,
    'campaignId', campaign_row.id,
    'poolProposalId', proposal_row.id,
    'termsVersion', campaign_row.published_terms_version,
    'termsSha256', campaign_row.published_terms_sha256,
    'eligibleAmountCents', eligible_amount_value,
    'eligibleSupporterCount', eligible_supporter_value,
    'thresholdAmountCents', campaign_row.threshold_amount_cents,
    'thresholdSupporters', campaign_row.threshold_supporters,
    'deadlineAt', campaign_row.deadline_at,
    'evaluatedAt', evaluated_at_value,
    'finalizedBy', p_reviewer_id,
    'reason', reason_value,
    'pledgeDisposition',
      case
        when outcome_status_value = 'lapsed'
          then 'expired_without_payment'
        else 'active_signed_intents_preserved_no_payment'
      end,
    'payment', jsonb_build_object(
      'authorized', false,
      'mandateCreated', false,
      'charged', false,
      'captured', false,
      'settled', false,
      'failureBonusPaid', false
    )
  );

  insert into public.mpgf_dac_campaign_outcomes (
    id,
    campaign_id,
    pool_proposal_id,
    terms_version,
    terms_sha256,
    outcome_status,
    eligible_amount_cents,
    eligible_supporter_count,
    threshold_amount_cents,
    threshold_supporters,
    deadline_at,
    evaluated_at,
    finalized_by,
    reason,
    outcome_json,
    outcome_sha256,
    created_at
  ) values (
    outcome_id_value,
    campaign_row.id,
    proposal_row.id,
    campaign_row.published_terms_version,
    campaign_row.published_terms_sha256,
    outcome_status_value,
    eligible_amount_value,
    eligible_supporter_value,
    campaign_row.threshold_amount_cents,
    campaign_row.threshold_supporters,
    campaign_row.deadline_at,
    evaluated_at_value,
    p_reviewer_id,
    reason_value,
    outcome_value,
    public.mpgf_dac_json_sha256(outcome_value),
    evaluated_at_value
  );

  if outcome_status_value = 'lapsed' then
    for pledge_row in
      select *
      from public.mpgf_public_goods_pledges as pledge
      where pledge.campaign_id = campaign_row.id
        and pledge.pledge_intent_id is not null
        and pledge.status = 'pledged'
      order by pledge.id
      for update
    loop
      perform set_config(
        'app.mpgf_dac_internal_write',
        pledge_row.pledge_intent_id::text,
        true
      );

      update public.mpgf_public_goods_pledges
      set status = 'expired'
      where id = pledge_row.id;

      expiry_event_value := jsonb_build_object(
        'schemaVersion', 'mpgf_dac_pledge_event_v1',
        'eventType', 'pledge_expired',
        'pledgeIntentId', pledge_row.pledge_intent_id,
        'pledgeId', pledge_row.id,
        'campaignId', pledge_row.campaign_id,
        'poolProposalId', pledge_row.pool_proposal_id,
        'profileId', pledge_row.profile_id,
        'termsVersion', pledge_row.terms_version,
        'termsSha256', pledge_row.terms_sha256,
        'amountCents', pledge_row.amount_cents,
        'currency', pledge_row.currency,
        'fromPledgeStatus', pledge_row.status,
        'toPledgeStatus', 'expired',
        'outcomeId', outcome_id_value,
        'outcomeStatus', outcome_status_value,
        'reason', reason_value,
        'paymentAuthorized', false,
        'expiredAt', evaluated_at_value
      );

      insert into public.mpgf_dac_pledge_events (
        pledge_intent_id,
        pledge_id,
        campaign_id,
        pool_proposal_id,
        profile_id,
        event_type,
        terms_version,
        terms_sha256,
        amount_cents,
        currency,
        event_json,
        event_sha256,
        created_at
      ) values (
        pledge_row.pledge_intent_id,
        pledge_row.id,
        pledge_row.campaign_id,
        pledge_row.pool_proposal_id,
        pledge_row.profile_id,
        'pledge_expired',
        pledge_row.terms_version,
        pledge_row.terms_sha256,
        pledge_row.amount_cents,
        pledge_row.currency,
        expiry_event_value,
        public.mpgf_dac_json_sha256(expiry_event_value),
        evaluated_at_value
      );

      expired_pledge_count_value := expired_pledge_count_value + 1;
    end loop;

    perform set_config('app.mpgf_dac_internal_write', '', true);
  end if;

  perform set_config(
    'app.mpgf_pool_review_transition',
    proposal_row.id::text,
    true
  );

  update public.mpgf_pool_proposals
  set status = outcome_status_value
  where id = proposal_row.id;

  perform set_config('app.mpgf_pool_review_transition', '', true);

  perform set_config(
    'app.mpgf_dac_campaign_finalization',
    campaign_row.id,
    true
  );

  update public.mpgf_public_goods_campaigns
  set review_status = 'finalized'
  where id = campaign_row.id;

  perform set_config('app.mpgf_dac_campaign_finalization', '', true);

  insert into public.mpgf_pool_lifecycle_events (
    proposal_id,
    terms_version,
    event_type,
    actor_user_id,
    from_status,
    to_status,
    terms_sha256,
    reason,
    metadata_json
  ) values (
    proposal_row.id,
    campaign_row.published_terms_version,
    case
      when outcome_status_value = 'succeeded' then 'pool_succeeded'
      else 'pool_lapsed'
    end,
    p_reviewer_id,
    proposal_row.status,
    outcome_status_value,
    campaign_row.published_terms_sha256,
    reason_value,
    jsonb_build_object(
      'outcomeId', outcome_id_value,
      'campaignId', campaign_row.id,
      'eligibleAmountCents', eligible_amount_value,
      'eligibleSupporterCount', eligible_supporter_value,
      'thresholdAmountCents', campaign_row.threshold_amount_cents,
      'thresholdSupporters', campaign_row.threshold_supporters,
      'deadlineAt', campaign_row.deadline_at,
      'evaluatedAt', evaluated_at_value,
      'expiredPledgeCount', expired_pledge_count_value,
      'paymentAuthorized', false
    )
  );

  return query select
    outcome_id_value,
    campaign_row.id,
    proposal_row.id,
    campaign_row.published_terms_version,
    campaign_row.published_terms_sha256,
    outcome_status_value,
    eligible_amount_value,
    eligible_supporter_value,
    campaign_row.threshold_amount_cents,
    campaign_row.threshold_supporters,
    campaign_row.deadline_at,
    evaluated_at_value,
    expired_pledge_count_value;
end;
$function$;

revoke all on function public.mpgf_finalize_dac_campaign(
  text,
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.mpgf_finalize_dac_campaign(
  text,
  uuid,
  text
) to service_role;

alter table public.mpgf_dac_campaign_outcomes enable row level security;

drop policy if exists mpgf_dac_campaign_outcomes_public_select
  on public.mpgf_dac_campaign_outcomes;
create policy mpgf_dac_campaign_outcomes_public_select
on public.mpgf_dac_campaign_outcomes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.mpgf_public_goods_campaigns as campaign
    where campaign.id = mpgf_dac_campaign_outcomes.campaign_id
      and campaign.pool_proposal_id = mpgf_dac_campaign_outcomes.pool_proposal_id
      and campaign.review_status = 'finalized'
  )
);

revoke all on table public.mpgf_dac_campaign_outcomes
  from public, anon, authenticated;
grant select on table public.mpgf_dac_campaign_outcomes
  to anon, authenticated;
grant all on table public.mpgf_dac_campaign_outcomes
  to service_role;

comment on table public.mpgf_dac_campaign_outcomes is
  'Immutable aggregate terminal outcomes for exact-version self-service DAC campaigns. Contains no private pledge evidence and authorizes no payment.';
comment on function public.mpgf_review_dac_pledge_eligibility(
  uuid,
  uuid,
  text,
  integer,
  text
) is
  'Service-role-only reviewer decision for a pending proposal-bound DAC pledge. It records one immutable eligibility event and creates no payment object.';
comment on function public.mpgf_finalize_dac_campaign(
  text,
  uuid,
  text
) is
  'Service-role-only exactly-once DAC terminal transition. Success preserves signed pledge intents; lapse expires them. Neither path authorizes, charges, captures, settles, refunds, or pays a failure bonus.';

commit;
