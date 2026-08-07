\set ON_ERROR_STOP on

begin;

alter table public.mpgf_dac_campaign_outcomes disable trigger mpgf_dac_campaign_outcomes_immutable;
alter table public.mpgf_dac_pledge_events disable trigger mpgf_dac_pledge_events_immutable;
alter table public.mpgf_dac_pledge_intents disable trigger mpgf_dac_pledge_intents_immutable;
alter table public.mpgf_public_goods_pledges disable trigger mpgf_guard_dac_public_goods_pledge;
alter table public.mpgf_public_goods_campaigns disable trigger mpgf_public_goods_campaigns_published_terms_guard;
alter table public.mpgf_pool_lifecycle_events disable trigger mpgf_pool_lifecycle_events_append_only;
alter table public.mpgf_pool_proposal_versions disable trigger mpgf_pool_proposal_versions_append_only;

delete from public.mpgf_dac_campaign_outcomes
where campaign_id in (
  'campaign-ce555555555545558555555555555555',
  'campaign-cf666666666646668666666666666666',
  'campaign-c077777777774777877777777777777'
);

delete from public.mpgf_dac_pledge_events
where campaign_id in (
  'campaign-ce555555555545558555555555555555',
  'campaign-cf666666666646668666666666666666',
  'campaign-c077777777774777877777777777777'
);

delete from public.mpgf_public_goods_pledges
where campaign_id in (
  'campaign-ce555555555545558555555555555555',
  'campaign-cf666666666646668666666666666666',
  'campaign-c077777777774777877777777777777'
);

delete from public.mpgf_dac_pledge_intents
where campaign_id in (
  'campaign-ce555555555545558555555555555555',
  'campaign-cf666666666646668666666666666666',
  'campaign-c077777777774777877777777777777'
);

delete from public.mpgf_pool_lifecycle_events
where proposal_id in (
  'ce555555-5555-4555-8555-555555555555',
  'cf666666-6666-4666-8666-666666666666',
  'c0777777-7777-4777-8777-777777777777'
);

delete from public.mpgf_public_goods_campaigns
where id in (
  'campaign-ce555555555545558555555555555555',
  'campaign-cf666666666646668666666666666666',
  'campaign-c077777777774777877777777777777'
);

delete from public.mpgf_pool_proposal_versions
where proposal_id in (
  'ce555555-5555-4555-8555-555555555555',
  'cf666666-6666-4666-8666-666666666666',
  'c0777777-7777-4777-8777-777777777777'
);

delete from public.moral_trade_create_pool_terms
where pool_proposal_id in (
  'ce555555-5555-4555-8555-555555555555',
  'cf666666-6666-4666-8666-666666666666',
  'c0777777-7777-4777-8777-777777777777'
);

delete from public.moral_trade_create_submissions
where id in (
  'd1111111-1111-4111-8111-111111111111',
  'd2222222-2222-4222-8222-222222222222',
  'd3333333-3333-4333-8333-333333333333'
);

delete from public.mpgf_failure_bonus_premium_quotes
where pool_proposal_id in (
  'ce555555-5555-4555-8555-555555555555',
  'cf666666-6666-4666-8666-666666666666',
  'c0777777-7777-4777-8777-777777777777'
);

delete from public.mpgf_pool_proposals
where id in (
  'ce555555-5555-4555-8555-555555555555',
  'cf666666-6666-4666-8666-666666666666',
  'c0777777-7777-4777-8777-777777777777'
);

delete from public.mpgf_public_goods_rounds
where id = 'qa-dac-product-round-20260807';

delete from public.mpgf_public_goods_match_pools
where id = 'qa-dac-product-match-20260807';

delete from public.mpgf_pool_reviewers
where reviewer_id = 'cb222222-2222-4222-8222-222222222222';

alter table public.mpgf_pool_proposal_versions enable trigger mpgf_pool_proposal_versions_append_only;
alter table public.mpgf_pool_lifecycle_events enable trigger mpgf_pool_lifecycle_events_append_only;
alter table public.mpgf_public_goods_campaigns enable trigger mpgf_public_goods_campaigns_published_terms_guard;
alter table public.mpgf_public_goods_pledges enable trigger mpgf_guard_dac_public_goods_pledge;
alter table public.mpgf_dac_pledge_intents enable trigger mpgf_dac_pledge_intents_immutable;
alter table public.mpgf_dac_pledge_events enable trigger mpgf_dac_pledge_events_immutable;
alter table public.mpgf_dac_campaign_outcomes enable trigger mpgf_dac_campaign_outcomes_immutable;

delete from auth.mfa_factors
where user_id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

delete from auth.sessions
where user_id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

delete from auth.refresh_tokens
where user_id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

delete from auth.identities
where user_id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

-- Auth insertion creates these rows through the one-person-account trigger.
-- Their FK is ON DELETE RESTRICT, so remove them before synthetic Auth users.
delete from moral_trade_private.person_accounts
where profile_id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

delete from public.profiles
where id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

delete from auth.users
where id in (
  'ca111111-1111-4111-8111-111111111111',
  'cb222222-2222-4222-8222-222222222222',
  'cc333333-3333-4333-8333-333333333333',
  'cd444444-4444-4444-8444-444444444444'
);

commit;
