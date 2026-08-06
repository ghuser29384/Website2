begin;

alter table public.mpgf_pool_lifecycle_events
  drop constraint if exists mpgf_pool_lifecycle_events_event_type_check;
alter table public.mpgf_pool_lifecycle_events
  add constraint mpgf_pool_lifecycle_events_event_type_check check (
    event_type in (
      'review_started',
      'changes_requested',
      'revision_submitted',
      'proposal_rejected',
      'terms_approved_and_frozen',
      'pool_published'
    )
  );

alter table public.mpgf_public_goods_campaigns
  drop constraint if exists mpgf_public_goods_campaigns_published_version_valid,
  drop constraint if exists mpgf_public_goods_campaigns_published_hash_valid,
  drop constraint if exists mpgf_public_goods_campaigns_publication_metadata_complete;

alter table public.mpgf_public_goods_campaigns
  add column if not exists published_terms_version integer,
  add column if not exists published_terms_sha256 text,
  add column if not exists published_by uuid references public.profiles(id) on delete restrict,
  add column if not exists published_at timestamptz,
  add constraint mpgf_public_goods_campaigns_published_version_valid check (
    published_terms_version is null or published_terms_version > 0
  ),
  add constraint mpgf_public_goods_campaigns_published_hash_valid check (
    published_terms_sha256 is null
    or published_terms_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ),
  add constraint mpgf_public_goods_campaigns_publication_metadata_complete check (
    pool_proposal_id is null
    or (
      published_terms_version is not null
      and published_terms_sha256 is not null
      and published_by is not null
      and published_at is not null
      and review_status in ('approved', 'finalized')
    )
  ) not valid;

create unique index if not exists mpgf_public_goods_campaigns_one_per_pool_proposal_idx
  on public.mpgf_public_goods_campaigns(pool_proposal_id)
  where pool_proposal_id is not null;

create or replace function public.mpgf_guard_published_pool_campaign()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
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

  return new;
end;
$function$;

revoke all on function public.mpgf_guard_published_pool_campaign()
  from public, anon, authenticated;

drop trigger if exists mpgf_public_goods_campaigns_published_terms_guard
  on public.mpgf_public_goods_campaigns;
create trigger mpgf_public_goods_campaigns_published_terms_guard
before update or delete on public.mpgf_public_goods_campaigns
for each row execute function public.mpgf_guard_published_pool_campaign();

create or replace function public.mpgf_publish_pool_proposal(
  p_proposal_id uuid,
  p_round_id text,
  p_slug text,
  p_publisher_id uuid,
  p_reason text
)
returns table (
  published_proposal_id uuid,
  public_campaign_id text,
  public_round_id text,
  public_slug text,
  public_terms_version integer,
  public_terms_sha256 text,
  public_published_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  round_row public.mpgf_public_goods_rounds%rowtype;
  campaign_row public.mpgf_public_goods_campaigns%rowtype;
  campaign_id_value text;
  slug_value text := lower(btrim(coalesce(p_slug, '')));
  current_hash text;
  recorded_hash text;
  create_review_status text;
  create_terms_locked_at timestamptz;
  has_create_terms boolean := false;
  published_timestamp timestamptz := timezone('utc', now());
begin
  if btrim(coalesce(p_round_id, '')) = '' then
    raise exception using errcode = '22023', message = 'A public-goods round is required for publication.';
  end if;
  if length(slug_value) < 3
     or length(slug_value) > 96
     or slug_value !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'The public campaign slug is invalid.';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'A publication rationale is required.';
  end if;

  perform public.mpgf_assert_authorized_pool_reviewer(p_publisher_id, p_proposal_id);
  perform pg_advisory_xact_lock(hashtextextended(p_proposal_id::text || ':pool-publication', 0));
  perform pg_advisory_xact_lock(hashtextextended(p_round_id || ':' || slug_value, 0));

  select * into proposal_row
  from public.mpgf_pool_proposals as proposal
  where proposal.id = p_proposal_id
  for update;

  if proposal_row.id is null then
    raise exception using errcode = 'P0002', message = 'Pool proposal was not found.';
  end if;
  if proposal_row.status <> 'approved_as_candidate'
     or proposal_row.approved_terms_version is null
     or proposal_row.approved_terms_version <> proposal_row.terms_version
     or proposal_row.operative_terms_sha256 is null
     or proposal_row.terms_locked_at is null
     or proposal_row.reviewed_by is null
     or proposal_row.reviewed_at is null then
    raise exception using
      errcode = '23514',
      message = 'Only an approved proposal with complete frozen terms can be published.';
  end if;
  if proposal_row.first_accepted_pledge_at is not null
     or exists (
       select 1
       from public.mpgf_pledges as pledge
       where pledge.pool_proposal_id = proposal_row.id
         and pledge.status in ('pledged', 'converted_to_payment_intent')
     ) then
    raise exception using
      errcode = '23514',
      message = 'A pool proposal must be published before it accepts any pledge.';
  end if;

  current_hash := public.mpgf_pool_proposal_terms_sha256(proposal_row.id);
  if current_hash <> proposal_row.operative_terms_sha256 then
    raise exception using
      errcode = '23514',
      message = 'Current pool terms differ from the approved frozen version.';
  end if;

  select proposal_version.terms_sha256 into recorded_hash
  from public.mpgf_pool_proposal_versions as proposal_version
  where proposal_version.proposal_id = proposal_row.id
    and proposal_version.terms_version = proposal_row.approved_terms_version;
  if recorded_hash is null or recorded_hash <> current_hash then
    raise exception using
      errcode = '23514',
      message = 'The approved proposal version is missing or differs from current frozen terms.';
  end if;

  select pool_terms.review_status, pool_terms.terms_locked_at
  into create_review_status, create_terms_locked_at
  from public.moral_trade_create_pool_terms as pool_terms
  where pool_terms.pool_proposal_id = proposal_row.id;
  has_create_terms := found;
  if has_create_terms and (
    create_review_status <> 'approved'
    or create_terms_locked_at is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'Linked Create pool terms must be approved and locked before publication.';
  end if;

  if btrim(coalesce(proposal_row.title, '')) = ''
     or btrim(coalesce(proposal_row.summary, '')) = ''
     or btrim(coalesce(proposal_row.cause_area, '')) = ''
     or proposal_row.public_goods_destination_type is null
     or btrim(coalesce(proposal_row.public_goods_destination_ref, '')) = ''
     or proposal_row.public_goods_threshold_amount_cents is null
     or proposal_row.public_goods_threshold_amount_cents <= 0
     or proposal_row.public_goods_threshold_supporters is null
     or proposal_row.public_goods_threshold_supporters <= 0
     or proposal_row.public_goods_deadline_at is null
     or btrim(coalesce(proposal_row.public_goods_verification_method, '')) = ''
     or btrim(coalesce(proposal_row.public_goods_baseline_rule, '')) = ''
     or btrim(coalesce(proposal_row.public_goods_exit_rule, '')) = ''
     or proposal_row.public_goods_payout_method is null then
    raise exception using
      errcode = '23514',
      message = 'Approved pool terms are incomplete for public campaign materialization.';
  end if;
  if proposal_row.threshold_visibility::text <> 'public_exact' then
    raise exception using errcode = '23514', message = 'Published pool thresholds must remain public and exact.';
  end if;
  if proposal_row.public_goods_payout_method not in ('external_handoff', 'signed_intent') then
    raise exception using
      errcode = '23514',
      message = 'This publication tranche supports only non-custodial external-handoff or signed-intent payout terms.';
  end if;
  if proposal_row.public_goods_failure_bonus_enabled = true and (
    proposal_row.public_goods_failure_bonus_schedule_status <> 'approved'
    or proposal_row.public_goods_success_premium_provisional is distinct from false
  ) then
    raise exception using
      errcode = '23514',
      message = 'A failure-bonus pool requires an approved, non-provisional complete schedule before publication.';
  end if;

  select * into round_row
  from public.mpgf_public_goods_rounds as public_round
  where public_round.id = p_round_id
  for update;

  if round_row.id is null then
    raise exception using errcode = 'P0002', message = 'Public-goods round was not found.';
  end if;
  if round_row.status not in ('scheduled', 'open')
     or round_row.ends_at <= published_timestamp
     or not exists (
       select 1
       from public.mpgf_public_goods_match_pools as match_pool
       where match_pool.id = round_row.match_pool_id
         and match_pool.status = 'active'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pools can be published only into a scheduled or open round with an active match pool that has not ended.';
  end if;
  if proposal_row.public_goods_deadline_at <= published_timestamp
     or proposal_row.public_goods_deadline_at <= round_row.starts_at
     or proposal_row.public_goods_deadline_at > round_row.ends_at then
    raise exception using
      errcode = '23514',
      message = 'The frozen pool deadline must be future-dated and fall inside the selected round.';
  end if;
  if round_row.supporter_gate <> 'demo_self_attestation'
     and proposal_row.public_goods_destination_ref ilike '%demo%' then
    raise exception using
      errcode = '23514',
      message = 'Non-demo rounds cannot publish a demo destination.';
  end if;

  select * into campaign_row
  from public.mpgf_public_goods_campaigns as campaign
  where campaign.pool_proposal_id = proposal_row.id
  for update;

  if campaign_row.id is not null then
    if campaign_row.round_id is distinct from p_round_id
       or campaign_row.slug is distinct from slug_value
       or campaign_row.published_terms_version is distinct from proposal_row.approved_terms_version
       or campaign_row.published_terms_sha256 is distinct from current_hash
       or campaign_row.review_status not in ('approved', 'finalized') then
      raise exception using
        errcode = '23514',
        message = 'This proposal was already materialized with different publication terms.';
    end if;

    return query select
      proposal_row.id,
      campaign_row.id,
      campaign_row.round_id,
      campaign_row.slug,
      campaign_row.published_terms_version,
      campaign_row.published_terms_sha256,
      campaign_row.published_at;
    return;
  end if;

  if exists (
    select 1
    from public.mpgf_public_goods_campaigns as campaign
    where campaign.slug = slug_value
  ) then
    raise exception using errcode = '23505', message = 'The public campaign slug is already in use.';
  end if;

  campaign_id_value := 'campaign-' || replace(proposal_row.id::text, '-', '');
  if exists (
    select 1
    from public.mpgf_public_goods_campaigns as campaign
    where campaign.id = campaign_id_value
  ) then
    raise exception using errcode = '23505', message = 'The deterministic public campaign ID is already in use.';
  end if;

  insert into public.mpgf_public_goods_campaigns (
    id,
    round_id,
    slug,
    pool_alternative_id,
    title,
    destination_type,
    destination_ref,
    cause_tags,
    public_summary,
    threshold_amount_cents,
    threshold_supporters,
    deadline_at,
    verification_method,
    baseline_rule,
    exit_rule,
    review_status,
    challenge_window_ends_at,
    pool_proposal_id,
    threshold_visibility,
    progress_visibility,
    first_accepted_pledge_at,
    published_terms_version,
    published_terms_sha256,
    published_by,
    published_at
  ) values (
    campaign_id_value,
    round_row.id,
    slug_value,
    proposal_row.candidate_alternative_id,
    proposal_row.title,
    proposal_row.public_goods_destination_type,
    proposal_row.public_goods_destination_ref,
    array[proposal_row.cause_area],
    proposal_row.summary,
    proposal_row.public_goods_threshold_amount_cents,
    proposal_row.public_goods_threshold_supporters,
    proposal_row.public_goods_deadline_at,
    proposal_row.public_goods_verification_method,
    proposal_row.public_goods_baseline_rule,
    proposal_row.public_goods_exit_rule,
    'approved',
    null,
    proposal_row.id,
    'public_exact',
    proposal_row.progress_visibility,
    null,
    proposal_row.approved_terms_version,
    current_hash,
    p_publisher_id,
    published_timestamp
  );

  update public.moral_trade_create_submissions as submission
  set status = 'published'
  where submission.target_type = 'mpgf_pool_proposal'
    and submission.target_id = proposal_row.id
    and submission.status = 'pending_review';

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
    proposal_row.approved_terms_version,
    'pool_published',
    p_publisher_id,
    proposal_row.status,
    'published',
    current_hash,
    btrim(p_reason),
    jsonb_build_object(
      'campaignId', campaign_id_value,
      'roundId', round_row.id,
      'slug', slug_value,
      'publicationMode', 'non_custodial_no_payment_execution'
    )
  );

  return query select
    proposal_row.id,
    campaign_id_value,
    round_row.id,
    slug_value,
    proposal_row.approved_terms_version,
    current_hash,
    published_timestamp;
end;
$function$;

revoke all on function public.mpgf_publish_pool_proposal(uuid, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mpgf_publish_pool_proposal(uuid, text, text, uuid, text)
  to service_role;

comment on function public.mpgf_publish_pool_proposal(uuid, text, text, uuid, text) is
  'Idempotently materializes one approved, frozen, future-dated MPGF pool proposal into the canonical public campaign table. It records publication evidence and never creates a pledge, payment authorization, mandate, charge, capture, or settlement.';

comment on trigger mpgf_public_goods_campaigns_published_terms_guard
  on public.mpgf_public_goods_campaigns is
  'Keeps the identity and operative terms of proposal-backed public campaigns immutable while allowing audited status, incident, progress-visibility, and first-pledge transitions.';

commit;
