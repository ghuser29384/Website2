begin;

-- A shared QA environment can receive the older publication migration after
-- the terminal migration. Reinstall the complete terminal-aware campaign
-- guard so a late additive replay cannot reopen a finalized DAC campaign.
create or replace function public.mpgf_guard_published_pool_campaign()
returns trigger
language plpgsql
security invoker
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

drop trigger if exists mpgf_public_goods_campaigns_published_terms_guard
  on public.mpgf_public_goods_campaigns;
create trigger mpgf_public_goods_campaigns_published_terms_guard
before update or delete on public.mpgf_public_goods_campaigns
for each row execute function public.mpgf_guard_published_pool_campaign();

comment on function public.mpgf_guard_published_pool_campaign() is
  'Preserves published DAC terms, authorized status transitions, and irreversible finalization after additive migration replay.';

commit;
