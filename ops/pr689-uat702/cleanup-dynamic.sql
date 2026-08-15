\set ON_ERROR_STOP on

begin;

create temporary table uat702_proposals on commit drop as
select id
from public.mpgf_pool_proposals
where proposer_id = 'ca111111-1111-4111-8111-111111111111'::uuid
  and title in (
    'UAT702 draft creator flow',
    'UAT702 exact freeze candidate',
    'UAT702 intended rejection candidate'
  );

create temporary table uat702_campaigns on commit drop as
select id
from public.mpgf_public_goods_campaigns
where pool_proposal_id in (select id from uat702_proposals);

alter table public.mpgf_dac_campaign_outcomes disable trigger mpgf_dac_campaign_outcomes_immutable;
alter table public.mpgf_dac_pledge_events disable trigger mpgf_dac_pledge_events_immutable;
alter table public.mpgf_dac_pledge_intents disable trigger mpgf_dac_pledge_intents_immutable;
alter table public.mpgf_public_goods_pledges disable trigger mpgf_guard_dac_public_goods_pledge;
alter table public.mpgf_public_goods_campaigns disable trigger mpgf_public_goods_campaigns_published_terms_guard;
alter table public.mpgf_pool_lifecycle_events disable trigger mpgf_pool_lifecycle_events_append_only;
alter table public.mpgf_pool_proposal_versions disable trigger mpgf_pool_proposal_versions_append_only;
alter table public.moral_trade_create_pool_terms disable trigger moral_trade_create_pool_terms_immutable;
alter table public.mpgf_failure_bonus_premium_quotes disable trigger mpgf_failure_bonus_approved_quote_immutable;

delete from public.mpgf_dac_campaign_outcomes
where campaign_id in (select id from uat702_campaigns);

delete from public.mpgf_dac_pledge_events
where campaign_id in (select id from uat702_campaigns);

delete from public.mpgf_public_goods_pledges
where campaign_id in (select id from uat702_campaigns);

delete from public.mpgf_dac_pledge_intents
where campaign_id in (select id from uat702_campaigns);

delete from public.mpgf_pool_lifecycle_events
where proposal_id in (select id from uat702_proposals);

delete from public.mpgf_public_goods_campaigns
where id in (select id from uat702_campaigns);

delete from public.mpgf_pool_proposal_versions
where proposal_id in (select id from uat702_proposals);

delete from public.moral_trade_create_pool_terms
where pool_proposal_id in (select id from uat702_proposals);

delete from public.moral_trade_create_submissions
where target_type = 'mpgf_pool_proposal'
  and target_id in (select id from uat702_proposals);

delete from public.mpgf_failure_bonus_premium_quotes
where pool_proposal_id in (select id from uat702_proposals);

do $cleanup$
begin
  if to_regclass('public.mpgf_admin_audit_logs') is not null then
    execute $sql$
      delete from public.mpgf_admin_audit_logs
      where actor_user_id = 'cb222222-2222-4222-8222-222222222222'::uuid
    $sql$;
  end if;
end
$cleanup$;

delete from public.mpgf_state_transition_logs
where actor_user_id in (
  'ca111111-1111-4111-8111-111111111111'::uuid,
  'cb222222-2222-4222-8222-222222222222'::uuid,
  'cc333333-3333-4333-8333-333333333333'::uuid,
  'cd444444-4444-4444-8444-444444444444'::uuid
);

delete from public.mpgf_operational_events
where event_json ->> 'actorUserId' in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

delete from public.mpgf_idempotency_keys
where actor_user_id in (
  'ca111111-1111-4111-8111-111111111111'::uuid,
  'cb222222-2222-4222-8222-222222222222'::uuid,
  'cc333333-3333-4333-8333-333333333333'::uuid,
  'cd444444-4444-4444-8444-444444444444'::uuid
);

delete from public.mpgf_pool_proposals
where id in (select id from uat702_proposals);

alter table public.mpgf_failure_bonus_premium_quotes enable trigger mpgf_failure_bonus_approved_quote_immutable;
alter table public.moral_trade_create_pool_terms enable trigger moral_trade_create_pool_terms_immutable;
alter table public.mpgf_pool_proposal_versions enable trigger mpgf_pool_proposal_versions_append_only;
alter table public.mpgf_pool_lifecycle_events enable trigger mpgf_pool_lifecycle_events_append_only;
alter table public.mpgf_public_goods_campaigns enable trigger mpgf_public_goods_campaigns_published_terms_guard;
alter table public.mpgf_public_goods_pledges enable trigger mpgf_guard_dac_public_goods_pledge;
alter table public.mpgf_dac_pledge_intents enable trigger mpgf_dac_pledge_intents_immutable;
alter table public.mpgf_dac_pledge_events enable trigger mpgf_dac_pledge_events_immutable;
alter table public.mpgf_dac_campaign_outcomes enable trigger mpgf_dac_campaign_outcomes_immutable;

commit;
