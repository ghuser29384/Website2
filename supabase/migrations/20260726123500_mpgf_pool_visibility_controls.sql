-- Add explicit pool-visibility contracts and make post-pledge transparency monotonic.
-- Safe to re-run: enum definitions are validated, columns are additive, and triggers
-- are replaced deterministically.
begin;

create extension if not exists pgcrypto;

do $migration$
declare
  threshold_labels text[];
  progress_labels text[];
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'mpgf_threshold_visibility'
  ) then
    create type public.mpgf_threshold_visibility as enum ('public_exact');
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'mpgf_progress_visibility'
  ) then
    create type public.mpgf_progress_visibility as enum (
      'exact_amount',
      'progress_range',
      'threshold_status_only',
      'sealed_progress'
    );
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into threshold_labels
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'mpgf_threshold_visibility';

  if threshold_labels is distinct from array['public_exact']::text[] then
    raise exception using
      errcode = '23514',
      message = 'mpgf_threshold_visibility must contain exactly public_exact';
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into progress_labels
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'mpgf_progress_visibility';

  if progress_labels is distinct from array[
    'exact_amount',
    'progress_range',
    'threshold_status_only',
    'sealed_progress'
  ]::text[] then
    raise exception using
      errcode = '23514',
      message = 'mpgf_progress_visibility must contain exactly exact_amount, progress_range, threshold_status_only, and sealed_progress';
  end if;
end;
$migration$;

create or replace function public.mpgf_progress_visibility_rank(
  visibility public.mpgf_progress_visibility
)
returns smallint
language sql
immutable
strict
parallel safe
set search_path = pg_catalog, public
as $function$
  select case visibility::text
    when 'sealed_progress' then 1::smallint
    when 'threshold_status_only' then 2::smallint
    when 'progress_range' then 3::smallint
    when 'exact_amount' then 4::smallint
  end;
$function$;

comment on function public.mpgf_progress_visibility_rank(public.mpgf_progress_visibility) is
  'Ranks progress visibility from least transparent (1) to most transparent (4).';

alter table public.mpgf_pool_proposals
  add column if not exists threshold_visibility public.mpgf_threshold_visibility
    not null default 'public_exact'::public.mpgf_threshold_visibility,
  add column if not exists progress_visibility public.mpgf_progress_visibility
    not null default 'exact_amount'::public.mpgf_progress_visibility,
  add column if not exists first_accepted_pledge_at timestamptz;

comment on column public.mpgf_pool_proposals.threshold_visibility is
  'Exact threshold amounts are public to every prospective contributor. The only supported value is public_exact.';
comment on column public.mpgf_pool_proposals.progress_visibility is
  'Funding-progress disclosure: exact_amount, progress_range, threshold_status_only, or sealed_progress.';
comment on column public.mpgf_pool_proposals.first_accepted_pledge_at is
  'Immutable latch set when the pool first receives an accepted pledge; after this timestamp progress visibility may only stay the same or become more transparent.';

alter table public.mpgf_pledges
  add column if not exists pool_proposal_id uuid
    references public.mpgf_pool_proposals (id) on delete set null;

create index if not exists mpgf_pledges_pool_proposal_status_created_idx
  on public.mpgf_pledges (pool_proposal_id, status, created_at)
  where pool_proposal_id is not null;

create or replace function public.mpgf_enforce_pool_visibility_monotonic()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
begin
  if new.threshold_visibility::text <> 'public_exact' then
    raise exception using
      errcode = '23514',
      message = 'Pool thresholds must remain public and exact.',
      detail = format('Attempted threshold_visibility: %s', new.threshold_visibility::text),
      hint = 'Use threshold_visibility = public_exact.';
  end if;

  if old.first_accepted_pledge_at is not null
     and new.first_accepted_pledge_at is distinct from old.first_accepted_pledge_at then
    raise exception using
      errcode = '23514',
      message = 'first_accepted_pledge_at is immutable once set.';
  end if;

  if old.first_accepted_pledge_at is not null
     and public.mpgf_progress_visibility_rank(new.progress_visibility)
       < public.mpgf_progress_visibility_rank(old.progress_visibility) then
    raise exception using
      errcode = '23514',
      message = 'Progress visibility cannot become less transparent after the first accepted pledge.',
      detail = format(
        'Attempted change from %s to %s after first accepted pledge at %s.',
        old.progress_visibility::text,
        new.progress_visibility::text,
        old.first_accepted_pledge_at
      ),
      hint = 'Keep the current setting or choose a more transparent progress-visibility mode.';
  end if;

  return new;
end;
$function$;

comment on function public.mpgf_enforce_pool_visibility_monotonic() is
  'Prevents threshold concealment and post-acceptance progress-visibility downgrades.';

drop trigger if exists mpgf_pool_proposals_visibility_monotonic on public.mpgf_pool_proposals;
create trigger mpgf_pool_proposals_visibility_monotonic
before update of threshold_visibility, progress_visibility, first_accepted_pledge_at
on public.mpgf_pool_proposals
for each row
execute function public.mpgf_enforce_pool_visibility_monotonic();

create or replace function public.mpgf_latch_pool_proposal_accepted_pledge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.pool_proposal_id is not null
     and new.status in ('pledged', 'converted_to_payment_intent') then
    update public.mpgf_pool_proposals
    set first_accepted_pledge_at = coalesce(
      first_accepted_pledge_at,
      new.created_at,
      timezone('utc', now())
    )
    where id = new.pool_proposal_id
      and first_accepted_pledge_at is null;
  end if;

  return new;
end;
$function$;

comment on function public.mpgf_latch_pool_proposal_accepted_pledge() is
  'Permanently records the first accepted pool pledge on the linked pool proposal.';

revoke all on function public.mpgf_latch_pool_proposal_accepted_pledge() from public, anon, authenticated;

drop trigger if exists mpgf_pledges_latch_pool_acceptance on public.mpgf_pledges;
create trigger mpgf_pledges_latch_pool_acceptance
after insert or update of pool_proposal_id, status
on public.mpgf_pledges
for each row
execute function public.mpgf_latch_pool_proposal_accepted_pledge();

update public.mpgf_pool_proposals proposal
set first_accepted_pledge_at = accepted.first_accepted_pledge_at
from (
  select
    pool_proposal_id,
    min(created_at) as first_accepted_pledge_at
  from public.mpgf_pledges
  where pool_proposal_id is not null
    and status in ('pledged', 'converted_to_payment_intent')
  group by pool_proposal_id
) accepted
where proposal.id = accepted.pool_proposal_id
  and proposal.first_accepted_pledge_at is null;

-- The currently deployed production schema stores pool proposals directly.
-- Environments that already have the verified public-goods campaign schema receive
-- the same columns and the same monotonicity rule on active campaigns.
do $campaign_schema$
begin
  if to_regclass('public.mpgf_public_goods_campaigns') is not null then
    execute $ddl$
      alter table public.mpgf_public_goods_campaigns
        add column if not exists pool_proposal_id uuid
          references public.mpgf_pool_proposals (id) on delete set null,
        add column if not exists threshold_visibility public.mpgf_threshold_visibility
          not null default 'public_exact'::public.mpgf_threshold_visibility,
        add column if not exists progress_visibility public.mpgf_progress_visibility
          not null default 'exact_amount'::public.mpgf_progress_visibility,
        add column if not exists first_accepted_pledge_at timestamptz
    $ddl$;

    execute $ddl$
      comment on column public.mpgf_public_goods_campaigns.threshold_visibility is
        'Exact threshold amounts are public to every prospective contributor.'
    $ddl$;
    execute $ddl$
      comment on column public.mpgf_public_goods_campaigns.progress_visibility is
        'Funding-progress disclosure: exact_amount, progress_range, threshold_status_only, or sealed_progress.'
    $ddl$;
    execute $ddl$
      comment on column public.mpgf_public_goods_campaigns.first_accepted_pledge_at is
        'Immutable latch set by the first eligible, active pledge.'
    $ddl$;

    execute 'drop trigger if exists mpgf_public_goods_campaigns_visibility_monotonic on public.mpgf_public_goods_campaigns';
    execute $ddl$
      create trigger mpgf_public_goods_campaigns_visibility_monotonic
      before update of threshold_visibility, progress_visibility, first_accepted_pledge_at
      on public.mpgf_public_goods_campaigns
      for each row
      execute function public.mpgf_enforce_pool_visibility_monotonic()
    $ddl$;

    execute 'create index if not exists mpgf_public_goods_campaigns_pool_proposal_idx on public.mpgf_public_goods_campaigns (pool_proposal_id) where pool_proposal_id is not null';
  end if;
end;
$campaign_schema$;

create or replace function public.mpgf_latch_public_goods_campaign_accepted_pledge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  accepted_at timestamptz;
begin
  if new.eligibility_state::text <> 'eligible'
     or new.status::text not in ('pledged', 'captured') then
    return new;
  end if;

  if to_regclass('public.mpgf_public_goods_campaigns') is null then
    return new;
  end if;

  accepted_at := coalesce(new.created_at, timezone('utc', now()));

  execute $sql$
    update public.mpgf_public_goods_campaigns
    set first_accepted_pledge_at = coalesce(first_accepted_pledge_at, $2)
    where id = $1
      and first_accepted_pledge_at is null
  $sql$
  using new.campaign_id, accepted_at;

  execute $sql$
    update public.mpgf_pool_proposals proposal
    set first_accepted_pledge_at = coalesce(proposal.first_accepted_pledge_at, $2)
    from public.mpgf_public_goods_campaigns campaign
    where campaign.id = $1
      and proposal.first_accepted_pledge_at is null
      and (
        campaign.pool_proposal_id = proposal.id
        or (
          campaign.pool_proposal_id is null
          and campaign.pool_alternative_id is not null
          and proposal.candidate_alternative_id = campaign.pool_alternative_id
        )
      )
  $sql$
  using new.campaign_id, accepted_at;

  return new;
end;
$function$;

comment on function public.mpgf_latch_public_goods_campaign_accepted_pledge() is
  'Latches campaign and linked proposal visibility when an eligible active public-goods pledge is first accepted.';

revoke all on function public.mpgf_latch_public_goods_campaign_accepted_pledge() from public, anon, authenticated;

do $public_goods_pledge_trigger$
begin
  if to_regclass('public.mpgf_public_goods_pledges') is not null
     and to_regclass('public.mpgf_public_goods_campaigns') is not null then
    execute 'drop trigger if exists mpgf_public_goods_pledges_latch_campaign_acceptance on public.mpgf_public_goods_pledges';
    execute $ddl$
      create trigger mpgf_public_goods_pledges_latch_campaign_acceptance
      after insert or update of campaign_id, eligibility_state, status
      on public.mpgf_public_goods_pledges
      for each row
      execute function public.mpgf_latch_public_goods_campaign_accepted_pledge()
    $ddl$;

    execute $sql$
      update public.mpgf_public_goods_campaigns campaign
      set first_accepted_pledge_at = accepted.first_accepted_pledge_at
      from (
        select campaign_id, min(created_at) as first_accepted_pledge_at
        from public.mpgf_public_goods_pledges
        where eligibility_state = 'eligible'
          and status in ('pledged', 'captured')
        group by campaign_id
      ) accepted
      where campaign.id = accepted.campaign_id
        and campaign.first_accepted_pledge_at is null
    $sql$;

    execute $sql$
      update public.mpgf_pool_proposals proposal
      set first_accepted_pledge_at = accepted.first_accepted_pledge_at
      from (
        select
          campaign.pool_proposal_id,
          campaign.pool_alternative_id,
          min(pledge.created_at) as first_accepted_pledge_at
        from public.mpgf_public_goods_campaigns campaign
        join public.mpgf_public_goods_pledges pledge
          on pledge.campaign_id = campaign.id
        where pledge.eligibility_state = 'eligible'
          and pledge.status in ('pledged', 'captured')
        group by campaign.pool_proposal_id, campaign.pool_alternative_id
      ) accepted
      where proposal.first_accepted_pledge_at is null
        and (
          accepted.pool_proposal_id = proposal.id
          or (
            accepted.pool_proposal_id is null
            and accepted.pool_alternative_id is not null
            and proposal.candidate_alternative_id = accepted.pool_alternative_id
          )
        )
    $sql$;
  end if;
end;
$public_goods_pledge_trigger$;

commit;
