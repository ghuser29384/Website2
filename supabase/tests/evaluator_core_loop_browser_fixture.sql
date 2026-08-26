\set ON_ERROR_STOP on
\getenv qa_password EVALUATOR_CORE_LOOP_QA_PASSWORD
\getenv namespace_handle EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE
\getenv namespace_hash EVIDENCE_PAYMENT_QA_NAMESPACE_HASH
\getenv owner_id EVIDENCE_PAYMENT_QA_PAYER_ID
\getenv owner_email EVIDENCE_PAYMENT_QA_PAYER_EMAIL
\getenv responder_id EVIDENCE_PAYMENT_QA_PAYEE_ID
\getenv responder_email EVIDENCE_PAYMENT_QA_PAYEE_EMAIL
\getenv reviewer_id EVIDENCE_PAYMENT_QA_REVIEWER_ID
\getenv reviewer_email EVIDENCE_PAYMENT_QA_REVIEWER_EMAIL
\getenv appeal_reviewer_id EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID
\getenv appeal_reviewer_email EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_EMAIL
\getenv outsider_id EVIDENCE_PAYMENT_QA_OUTSIDER_ID
\getenv outsider_email EVIDENCE_PAYMENT_QA_OUTSIDER_EMAIL
\getenv admin_id EVIDENCE_PAYMENT_QA_ADMIN_ID
\getenv admin_email EVIDENCE_PAYMENT_QA_ADMIN_EMAIL
\getenv offer_id EVIDENCE_PAYMENT_QA_OFFER_ID

-- Exact run-owned isolated-QA fixture. The read-only preflight must have
-- returned zero before this file is executed. This file never repairs or
-- deletes earlier state and accepts no production target.
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
    'qa_fixture', 'evaluator_core_loop_run_owned',
    'qa_namespace', :'namespace_handle'
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
    (:'owner_id'::uuid, :'owner_email', 'QA Core Loop Owner'),
    (:'responder_id'::uuid, :'responder_email', 'QA Core Loop Responder'),
    (:'reviewer_id'::uuid, :'reviewer_email', 'QA Initial Reviewer'),
    (:'appeal_reviewer_id'::uuid, :'appeal_reviewer_email', 'QA Appeal Reviewer'),
    (:'outsider_id'::uuid, :'outsider_email', 'QA Core Loop Outsider'),
    (:'admin_id'::uuid, :'admin_email', 'QA Core Loop Administrator')
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
    'email_verified', true,
    'qa_namespace', :'namespace_handle'
  ),
  'email',
  now(),
  now(),
  now()
from (
  values
    (:'owner_id'::uuid, :'owner_email'),
    (:'responder_id'::uuid, :'responder_email'),
    (:'reviewer_id'::uuid, :'reviewer_email'),
    (:'appeal_reviewer_id'::uuid, :'appeal_reviewer_email'),
    (:'outsider_id'::uuid, :'outsider_email'),
    (:'admin_id'::uuid, :'admin_email')
) as actor(id, email);

insert into public.profiles (id, email, display_name, bio, affiliation)
select actor.id, actor.email, actor.display_name, '', 'Isolated QA'
from (
  values
    (:'owner_id'::uuid, :'owner_email', 'QA Core Loop Owner'),
    (:'responder_id'::uuid, :'responder_email', 'QA Core Loop Responder'),
    (:'reviewer_id'::uuid, :'reviewer_email', 'QA Initial Reviewer'),
    (:'appeal_reviewer_id'::uuid, :'appeal_reviewer_email', 'QA Appeal Reviewer'),
    (:'outsider_id'::uuid, :'outsider_email', 'QA Core Loop Outsider'),
    (:'admin_id'::uuid, :'admin_email', 'QA Core Loop Administrator')
) as actor(id, email, display_name);

insert into public.trade_review_role_grants (
  profile_id,
  role,
  active,
  granted_by,
  granted_at,
  revoked_at
)
values
  (:'reviewer_id'::uuid, 'reviewer', true, null, now(), null),
  (:'appeal_reviewer_id'::uuid, 'reviewer', true, null, now(), null),
  (:'admin_id'::uuid, 'administrator', true, null, now(), null);

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
  :'offer_id'::uuid,
  :'owner_id'::uuid,
  'QA Core Loop Owner',
  'pledge',
  'Evaluator core-loop verification',
  'Private QA response verification',
  'Exercise one synthetic, isolated-QA evaluator checkpoint.',
  'Submit one synthetic, isolated-QA private attestation for review.',
  'Not needed',
  5,
  5,
  'Private QA-only attestation reviewed against exact frozen terms.',
  'One isolated-QA browser session',
  1,
  'Synthetic isolated-QA fixture. Not an offer to transact. No payment, custody, production data, or production deployment.',
  '',
  'open',
  'published',
  format('evaluator-core-loop-%s', :'namespace_handle'),
  :'namespace_hash',
  'Without this QA test, no participant action or obligation occurs.',
  'Either participant may end all future synthetic obligations immediately by recorded notice.',
  'One synthetic browser checkpoint; maximum financial amount is $0.',
  'Participants and assigned QA reviewers only',
  now(),
  1
);

commit;

select json_build_object(
  'namespaceHandle', :'namespace_handle',
  'roleCount', 6,
  'offerId', :'offer_id',
  'status', 'created'
) as fixture;
