\set ON_ERROR_STOP on

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
select 'payment_refs_before_cleanup=' || (
  (select count(*) from public.mpgf_public_goods_pledges, fixed
    where (campaign_id = any(fixed.campaigns) or profile_id = any(fixed.users))
      and (payment_intent_ref is not null or status = 'captured'))
  + (select count(*) from public.mpgf_pledges, fixed
    where user_id = any(fixed.users)
      and (payment_provider_object_id is not null or real_money))
) from fixed;
