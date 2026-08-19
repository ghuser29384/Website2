\set ON_ERROR_STOP on

do $proof$
declare
  optional_admin_audit_count bigint := 0;
begin
  if to_regclass('public.mpgf_admin_audit_logs') is not null then
    execute $sql$
      select count(*)
      from public.mpgf_admin_audit_logs
      where actor_user_id = 'cb222222-2222-4222-8222-222222222222'::uuid
    $sql$
    into optional_admin_audit_count;
  end if;

  if optional_admin_audit_count <> 0 then
    raise exception 'UAT702 optional admin-audit fixture residue remains: %',
      optional_admin_audit_count;
  end if;
end
$proof$;

with fixed as (
  select
    array[
      'ca111111-1111-4111-8111-111111111111'::uuid,
      'cb222222-2222-4222-8222-222222222222'::uuid,
      'cc333333-3333-4333-8333-333333333333'::uuid,
      'cd444444-4444-4444-8444-444444444444'::uuid
    ] as users,
    array[
      'ce555555-5555-4555-8555-555555555555'::uuid,
      'cf666666-6666-4666-8666-666666666666'::uuid,
      'c0777777-7777-4777-8777-777777777777'::uuid
    ] as proposals,
    array[
      'campaign-ce555555555545558555555555555555',
      'campaign-cf666666666646668666666666666666',
      'campaign-c0777777777747778777777777777777'
    ] as campaigns
)
select 'fixture_residue=' || (
  (select count(*) from auth.users, fixed where auth.users.id = any(fixed.users))
  + (select count(*) from auth.identities, fixed where auth.identities.user_id = any(fixed.users))
  + (select count(*) from auth.sessions, fixed where auth.sessions.user_id = any(fixed.users))
  + (select count(*) from auth.refresh_tokens, fixed where auth.refresh_tokens.user_id = any(array(select user_id::text from unnest(fixed.users) as user_id)))
  + (select count(*) from auth.mfa_factors, fixed where auth.mfa_factors.user_id = any(fixed.users))
  + (select count(*) from moral_trade_private.person_accounts, fixed where profile_id = any(fixed.users))
  + (select count(*) from public.profiles, fixed where public.profiles.id = any(fixed.users))
  + (select count(*) from public.mpgf_pool_reviewers, fixed where reviewer_id = any(fixed.users))
  + (select count(*) from public.mpgf_pool_proposals, fixed where id = any(fixed.proposals))
  + (select count(*) from public.mpgf_pool_proposals where proposer_id = 'ca111111-1111-4111-8111-111111111111'::uuid and title like 'UAT702 %')
  + (select count(*) from public.mpgf_pool_proposal_versions, fixed where proposal_id = any(fixed.proposals))
  + (select count(*) from public.mpgf_pool_lifecycle_events, fixed where proposal_id = any(fixed.proposals))
  + (select count(*) from public.moral_trade_create_pool_terms, fixed where pool_proposal_id = any(fixed.proposals))
  + (select count(*) from public.mpgf_failure_bonus_premium_quotes, fixed where pool_proposal_id = any(fixed.proposals))
  + (select count(*) from public.mpgf_public_goods_campaigns, fixed where id = any(fixed.campaigns))
  + (select count(*) from public.mpgf_public_goods_pledges, fixed where campaign_id = any(fixed.campaigns))
  + (select count(*) from public.mpgf_dac_pledge_intents, fixed where campaign_id = any(fixed.campaigns))
  + (select count(*) from public.mpgf_dac_pledge_events, fixed where campaign_id = any(fixed.campaigns))
  + (select count(*) from public.mpgf_dac_campaign_outcomes, fixed where campaign_id = any(fixed.campaigns))
  + (select count(*) from public.moral_trade_create_submissions where id in (
      'd1111111-1111-4111-8111-111111111111',
      'd2222222-2222-4222-8222-222222222222',
      'd3333333-3333-4333-8333-333333333333'
    ))
  + (select count(*) from public.mpgf_public_goods_rounds where id = 'qa-dac-product-round-20260807')
  + (select count(*) from public.mpgf_public_goods_match_pools where id = 'qa-dac-product-match-20260807')
  + (select count(*) from public.mpgf_idempotency_keys, fixed where actor_user_id = any(fixed.users))
  + (select count(*) from public.mpgf_state_transition_logs, fixed where actor_user_id = any(fixed.users))
  + (select count(*) from public.mpgf_operational_events where event_json ->> 'actorUserId' in (
      'ca111111-1111-4111-8111-111111111111',
      'cb222222-2222-4222-8222-222222222222',
      'cc333333-3333-4333-8333-333333333333',
      'cd444444-4444-4444-8444-444444444444'
    ))
) from fixed;

with fixed as (
  select
    array[
      'ca111111-1111-4111-8111-111111111111'::uuid,
      'cb222222-2222-4222-8222-222222222222'::uuid,
      'cc333333-3333-4333-8333-333333333333'::uuid,
      'cd444444-4444-4444-8444-444444444444'::uuid
    ] as users,
    array[
      'campaign-ce555555555545558555555555555555',
      'campaign-cf666666666646668666666666666666',
      'campaign-c0777777777747778777777777777777'
    ] as campaigns
)
select 'payment_refs=' || (
  (select count(*) from public.mpgf_public_goods_pledges, fixed
    where (campaign_id = any(fixed.campaigns) or profile_id = any(fixed.users))
      and (payment_intent_ref is not null or status = 'captured'))
  + (select count(*) from public.mpgf_pledges, fixed
    where user_id = any(fixed.users)
      and (payment_provider_object_id is not null or real_money))
) from fixed;
