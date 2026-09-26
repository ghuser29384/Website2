\set ON_ERROR_STOP on
\getenv qa_password FEED_CREATE_QA_PASSWORD

begin;

-- Remove a prior interrupted run by exact fixture identities only.
delete from public.offers
where id in (
  select derived_offer_id
  from public.moral_trade_feed_create_links
  where creator_profile_id in (
  'fa100000-0000-4000-8000-000000000001',
  'fa100000-0000-4000-8000-000000000002',
  'fa100000-0000-4000-8000-000000000003'
  )
);

delete from public.offers
where owner_id in (
  'fa100000-0000-4000-8000-000000000001',
  'fa100000-0000-4000-8000-000000000002',
  'fa100000-0000-4000-8000-000000000003'
)
and submission_key like 'feed-create-browser-%';

delete from public.recommendation_exposures
where profile_id in (
  'fa100000-0000-4000-8000-000000000001',
  'fa100000-0000-4000-8000-000000000002',
  'fa100000-0000-4000-8000-000000000003'
)
and model_key = 'feed-create-browser-v1';

delete from public.offers
where id in (
  'fa300000-0000-4000-8000-000000000001',
  'fa300000-0000-4000-8000-000000000002',
  'fa300000-0000-4000-8000-000000000003',
  'fa300000-0000-4000-8000-000000000004',
  'fa300000-0000-4000-8000-000000000005',
  'fa300000-0000-4000-8000-000000000006'
);

delete from auth.mfa_factors where user_id in (
  'fa100000-0000-4000-8000-000000000001',
  'fa100000-0000-4000-8000-000000000002',
  'fa100000-0000-4000-8000-000000000003',
  'fa200000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000002'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  reauthentication_token, is_sso_user, is_anonymous, created_at, updated_at
)
select
  actor.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated', actor.email,
  extensions.crypt(:'qa_password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', actor.display_name, 'qa_fixture', 'feed_create_phase1_browser'),
  '', '', '', '', '', '', false, false, now(), now()
from (
  values
    ('fa100000-0000-4000-8000-000000000001'::uuid, 'feed-create-viewer-a@qa.invalid', 'QA Feed Viewer A'),
    ('fa100000-0000-4000-8000-000000000002'::uuid, 'feed-create-viewer-b@qa.invalid', 'QA Feed Viewer B'),
    ('fa100000-0000-4000-8000-000000000003'::uuid, 'feed-create-zero@qa.invalid', 'QA Feed Zero'),
    ('fa200000-0000-4000-8000-000000000001'::uuid, 'feed-create-owner-a@qa.invalid', 'QA Feed Owner A'),
    ('fa200000-0000-4000-8000-000000000002'::uuid, 'feed-create-owner-b@qa.invalid', 'QA Feed Owner B')
) as actor(id, email, display_name)
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    confirmation_token = '', recovery_token = '', email_change = '',
    email_change_token_new = '', email_change_token_current = '',
    reauthentication_token = '', deleted_at = null, banned_until = null,
    updated_at = now();

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  actor.id::text,
  actor.id,
  jsonb_build_object('sub', actor.id::text, 'email', actor.email, 'email_verified', true),
  'email', now(), now(), now()
from (
  values
    ('fa100000-0000-4000-8000-000000000001'::uuid, 'feed-create-viewer-a@qa.invalid'),
    ('fa100000-0000-4000-8000-000000000002'::uuid, 'feed-create-viewer-b@qa.invalid'),
    ('fa100000-0000-4000-8000-000000000003'::uuid, 'feed-create-zero@qa.invalid'),
    ('fa200000-0000-4000-8000-000000000001'::uuid, 'feed-create-owner-a@qa.invalid'),
    ('fa200000-0000-4000-8000-000000000002'::uuid, 'feed-create-owner-b@qa.invalid')
) as actor(id, email)
on conflict (provider_id, provider) do update
set user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

insert into public.profiles (id, email, display_name, bio, affiliation)
select actor.id, actor.email, actor.display_name, '', 'Isolated QA'
from (
  values
    ('fa100000-0000-4000-8000-000000000001'::uuid, 'feed-create-viewer-a@qa.invalid', 'QA Feed Viewer A'),
    ('fa100000-0000-4000-8000-000000000002'::uuid, 'feed-create-viewer-b@qa.invalid', 'QA Feed Viewer B'),
    ('fa100000-0000-4000-8000-000000000003'::uuid, 'feed-create-zero@qa.invalid', 'QA Feed Zero'),
    ('fa200000-0000-4000-8000-000000000001'::uuid, 'feed-create-owner-a@qa.invalid', 'QA Feed Owner A'),
    ('fa200000-0000-4000-8000-000000000002'::uuid, 'feed-create-owner-b@qa.invalid', 'QA Feed Owner B')
) as actor(id, email, display_name)
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation;

insert into public.offers (
  id, owner_id, owner_alias, mode, offered_cause, requested_cause,
  offer_action, request_action, compromise_cause, offer_impact,
  min_counterparty_impact, verification, duration, trust_level,
  notes, discount_note, status, workflow_status, submission_key,
  fingerprint, no_trade_baseline, exit_conditions, maximum_burden,
  privacy_scope, published_at, terms_version
) values
  ('fa300000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001',
   'QA Feed Owner A', 'pledge', 'Global poverty reduction', 'Lower-carbon transport',
   'Donate $100 to an agreed evidence-backed charity.',
   'Replace ten car trips with public transit.', 'Not needed', 5, 5,
   'Dated transit receipts or a contemporaneous travel log.', 'Through August 31, 2026',
   3, '', '', 'open', 'published', 'feed-create-browser-source-a', repeat('a', 64),
   'The source owner donates as planned and the viewer continues driving.',
   'Either participant may end future obligations by notice.',
   'The stated donation and ten trips only.', 'Participants and operator only', now(), 3),
  ('fa300000-0000-4000-8000-000000000002', 'fa200000-0000-4000-8000-000000000002',
   'QA Feed Owner B', 'pledge', 'Animal welfare', 'AI safety research',
   'Fund one independently reviewed animal-welfare intervention.',
   'Review an AI-governance draft for two hours.', 'Not needed', 5, 5,
   'A dated review document and donation receipt.', 'Within 30 days', 3, '', '',
   'open', 'published', 'feed-create-browser-source-b', repeat('b', 64),
   'Both parties continue their current plans.',
   'Either participant may end future obligations by notice.',
   'Two review hours and one intervention only.', 'Participants and operator only', now(), 7),
  ('fa300000-0000-4000-8000-000000000003', 'fa100000-0000-4000-8000-000000000001',
   'QA Feed Viewer A', 'pledge', 'Own cause', 'Own request', 'Do my own action.',
   'Request my own action.', 'Not needed', 5, 5, 'Own evidence.', 'One month', 1,
   '', '', 'open', 'published', 'feed-create-browser-own', repeat('c', 64),
   'Own baseline.', 'Own exit.', 'Own limit.', 'Participants and operator only', now(), 1),
  ('fa300000-0000-4000-8000-000000000004', 'fa200000-0000-4000-8000-000000000001',
   'QA Feed Owner A', 'payment', 'Paid benefit', 'Paid request', 'Pay $25.',
   'Complete a task.', 'Not needed', 5, 5, 'Payment evidence.', 'One week', 2,
   '', '', 'open', 'published', 'feed-create-browser-payment', repeat('d', 64),
   'No payment.', 'Either may stop.', '$25 only.', 'Participants and operator only', now(), 1),
  ('fa300000-0000-4000-8000-000000000005', 'fa200000-0000-4000-8000-000000000001',
   'QA Feed Owner A', 'offset', 'Redirect benefit', 'Redirect request', 'Redirect a donation.',
   'Match a donation.', 'Not needed', 5, 5, 'Donation receipt.', 'Seven days', 2,
   '', '', 'open', 'published', 'feed-create-browser-redirect', repeat('e', 64),
   'Original donation.', 'Either may stop.', 'Named donations only.',
   'Participants and operator only', now(), 1),
  ('fa300000-0000-4000-8000-000000000006', 'fa200000-0000-4000-8000-000000000001',
   'QA Feed Owner A', 'pledge', 'Incomplete benefit', 'Incomplete request',
   'Do a complete action.', 'Do another action.', 'Not needed', 5, 5, '', 'One week', 2,
   '', '', 'paused', 'draft', 'feed-create-browser-incomplete', repeat('f', 64),
   'Baseline.', 'Exit.', 'Limit.', 'Participants and operator only', null, 1)
on conflict (id) do update
set owner_id = excluded.owner_id,
    owner_alias = excluded.owner_alias,
    mode = excluded.mode,
    offered_cause = excluded.offered_cause,
    requested_cause = excluded.requested_cause,
    offer_action = excluded.offer_action,
    request_action = excluded.request_action,
    verification = excluded.verification,
    duration = excluded.duration,
    status = excluded.status,
    workflow_status = excluded.workflow_status,
    submission_key = excluded.submission_key,
    fingerprint = excluded.fingerprint,
    published_at = excluded.published_at,
    closed_at = null,
    deleted_at = null,
    terms_version = excluded.terms_version,
    updated_at = now();

insert into public.recommendation_exposures (
  id, profile_id, request_id, opportunity_type, opportunity_id, owner_id,
  rank, match_class, was_shown, model_key, model_mode, prediction,
  feature_snapshot, occurred_at
) values
  ('fa400000-0000-4000-8000-000000000001', 'fa100000-0000-4000-8000-000000000001',
   'fa500000-0000-4000-8000-000000000001', 'offer',
   'fa300000-0000-4000-8000-000000000001', 'fa200000-0000-4000-8000-000000000001',
   1, 'direct', true, 'feed-create-browser-v1', 'heuristic',
   '{"paretoSuccess":0.92}'::jsonb, '{"publicQuality":0.8}'::jsonb, now()),
  ('fa400000-0000-4000-8000-000000000002', 'fa100000-0000-4000-8000-000000000002',
   'fa500000-0000-4000-8000-000000000002', 'offer',
   'fa300000-0000-4000-8000-000000000002', 'fa200000-0000-4000-8000-000000000002',
   1, 'direct', true, 'feed-create-browser-v1', 'heuristic',
   '{"paretoSuccess":0.81}'::jsonb, '{"publicQuality":0.7}'::jsonb, now()),
  ('fa400000-0000-4000-8000-000000000003', 'fa100000-0000-4000-8000-000000000001',
   'fa500000-0000-4000-8000-000000000003', 'offer',
   'fa300000-0000-4000-8000-000000000003', 'fa100000-0000-4000-8000-000000000001',
   2, 'direct', true, 'feed-create-browser-v1', 'heuristic', '{}'::jsonb, '{}'::jsonb, now()),
  ('fa400000-0000-4000-8000-000000000004', 'fa100000-0000-4000-8000-000000000001',
   'fa500000-0000-4000-8000-000000000004', 'offer',
   'fa300000-0000-4000-8000-000000000004', 'fa200000-0000-4000-8000-000000000001',
   3, 'direct', true, 'feed-create-browser-v1', 'heuristic', '{}'::jsonb, '{}'::jsonb, now()),
  ('fa400000-0000-4000-8000-000000000005', 'fa100000-0000-4000-8000-000000000001',
   'fa500000-0000-4000-8000-000000000005', 'offer',
   'fa300000-0000-4000-8000-000000000005', 'fa200000-0000-4000-8000-000000000001',
   4, 'direct', true, 'feed-create-browser-v1', 'heuristic', '{}'::jsonb, '{}'::jsonb, now()),
  ('fa400000-0000-4000-8000-000000000006', 'fa100000-0000-4000-8000-000000000001',
   'fa500000-0000-4000-8000-000000000006', 'offer',
   'fa300000-0000-4000-8000-000000000006', 'fa200000-0000-4000-8000-000000000001',
   5, 'direct', true, 'feed-create-browser-v1', 'heuristic', '{}'::jsonb, '{}'::jsonb, now())
on conflict (profile_id, request_id, opportunity_type, opportunity_id) do update
set owner_id = excluded.owner_id,
    rank = excluded.rank,
    was_shown = true,
    model_key = excluded.model_key,
    prediction = excluded.prediction,
    feature_snapshot = excluded.feature_snapshot,
    occurred_at = now();

commit;
