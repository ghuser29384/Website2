\set ON_ERROR_STOP on
\getenv qa_password PR710_QA_PASSWORD

-- Exact, deterministic, isolated-QA fixture for PR #710 rendered acceptance.
-- The workflow validates the TLS-only project target before invoking this file,
-- provides a masked ephemeral password, and always runs the paired cleanup.

begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
select
  actor.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  actor.email,
  extensions.crypt(:'qa_password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'display_name', actor.display_name,
    'qa_fixture', 'pr710_backed_offer_rendered'
  ),
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false,
  now(),
  now()
from (
  values
    (
      '81000000-0000-4000-8000-000000000001'::uuid,
      'evaluator-core-loop-owner@qa.invalid',
      'QA Core Loop Owner'
    ),
    (
      '81000000-0000-4000-8000-000000000002'::uuid,
      'evaluator-core-loop-responder@qa.invalid',
      'QA Core Loop Responder'
    )
) as actor(id, email, display_name);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  actor.id::text,
  actor.id,
  jsonb_build_object(
    'sub', actor.id::text,
    'email', actor.email,
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
from (
  values
    (
      '81000000-0000-4000-8000-000000000001'::uuid,
      'evaluator-core-loop-owner@qa.invalid'
    ),
    (
      '81000000-0000-4000-8000-000000000002'::uuid,
      'evaluator-core-loop-responder@qa.invalid'
    )
) as actor(id, email);

insert into public.profiles (id, email, display_name, bio, affiliation)
values
  (
    '81000000-0000-4000-8000-000000000001',
    'evaluator-core-loop-owner@qa.invalid',
    'QA Core Loop Owner',
    '',
    'Isolated QA'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    'evaluator-core-loop-responder@qa.invalid',
    'QA Core Loop Responder',
    '',
    'Isolated QA'
  );

insert into public.offers (
  id,
  owner_id,
  owner_alias,
  mode,
  offered_cause,
  requested_cause,
  offer_action,
  request_action,
  compromise_cause,
  offer_impact,
  min_counterparty_impact,
  verification,
  duration,
  trust_level,
  notes,
  discount_note,
  status,
  workflow_status,
  submission_key,
  fingerprint,
  no_trade_baseline,
  exit_conditions,
  maximum_burden,
  privacy_scope,
  published_at,
  terms_version
)
values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'QA Core Loop Owner',
  'pledge',
  'Evaluator core-loop verification',
  'Private QA response verification',
  'Exercise one synthetic, QA-only evaluator checkpoint.',
  'Submit one synthetic, QA-only private attestation for review.',
  'Not needed',
  5,
  5,
  'Private QA-only attestation reviewed against frozen terms.',
  'One isolated QA browser session',
  1,
  'Synthetic isolated-QA fixture. Not an offer to transact. No payment, custody, production data, or production deployment.',
  '',
  'open',
  'published',
  'pr710-backed-offer-rendered-v1',
  repeat('7', 64),
  'Without this QA test, no participant action or obligation occurs.',
  'Either participant may end all future synthetic obligations immediately by recorded notice.',
  'One synthetic browser checkpoint; maximum financial amount is $0.',
  'Participants and an assigned neutral QA reviewer only',
  now(),
  1
);

commit;

select json_build_object(
  'fixture', 'pr710_backed_offer_rendered',
  'offerId', '82000000-0000-4000-8000-000000000001',
  'offers', (
    select count(*) from public.offers
    where id = '82000000-0000-4000-8000-000000000001'
  ),
  'profiles', (
    select count(*) from public.profiles
    where id in (
      '81000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000002'
    )
  ),
  'authUsers', (
    select count(*) from auth.users
    where id in (
      '81000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000002'
    )
  ),
  'maximumFinancialAmountUsd', 0,
  'production', false
) as fixture;
