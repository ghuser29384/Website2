\set ON_ERROR_STOP on

begin;

delete from public.email_outbox
where profile_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
)
or recipient_email like 'evaluator-core-loop-%@qa.invalid';

-- The exact offer owns the response, thread, agreement, version, milestone,
-- evidence, review, payout, and exit graph through foreign-key cascades.
delete from public.offers
where id = '82000000-0000-4000-8000-000000000001';

delete from public.trade_notifications
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from auth.mfa_factors
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from auth.sessions
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from auth.refresh_tokens
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from auth.identities
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from moral_trade_private.person_accounts
where profile_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from public.profiles
where id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

delete from auth.users
where id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004'
);

commit;

select json_build_object(
  'offers', (
    select count(*) from public.offers
    where id = '82000000-0000-4000-8000-000000000001'
  ),
  'interests', (
    select count(*) from public.interests
    where offer_id = '82000000-0000-4000-8000-000000000001'
  ),
  'agreements', (
    select count(*) from public.agreements
    where offer_id = '82000000-0000-4000-8000-000000000001'
  ),
  'threads', (
    select count(*) from public.trade_threads
    where offer_id = '82000000-0000-4000-8000-000000000001'
  ),
  'notifications', (
    select count(*) from public.trade_notifications
    where user_id::text like '81000000-0000-4000-8000-%'
  ),
  'events', (
    select count(*) from public.core_loop_events
    where profile_id::text like '81000000-0000-4000-8000-%'
  ),
  'reviewRoles', (
    select count(*) from public.trade_review_role_grants
    where profile_id::text like '81000000-0000-4000-8000-%'
  ),
  'profiles', (
    select count(*) from public.profiles
    where id::text like '81000000-0000-4000-8000-%'
  ),
  'authUsers', (
    select count(*) from auth.users
    where id::text like '81000000-0000-4000-8000-%'
  ),
  'authIdentities', (
    select count(*) from auth.identities
    where user_id::text like '81000000-0000-4000-8000-%'
  ),
  'authSessions', (
    select count(*) from auth.sessions
    where user_id::text like '81000000-0000-4000-8000-%'
  ),
  'authRefreshTokens', (
    select count(*) from auth.refresh_tokens
    where user_id::text like '81000000-0000-4000-8000-%'
  ),
  'authMfaFactors', (
    select count(*) from auth.mfa_factors
    where user_id::text like '81000000-0000-4000-8000-%'
  ),
  'privateAccounts', (
    select count(*) from moral_trade_private.person_accounts
    where profile_id::text like '81000000-0000-4000-8000-%'
  ),
  'emailOutbox', (
    select count(*) from public.email_outbox
    where recipient_email like 'evaluator-core-loop-%@qa.invalid'
  )
) as residue;
