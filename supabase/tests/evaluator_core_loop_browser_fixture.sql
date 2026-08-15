\set ON_ERROR_STOP on
\getenv qa_password EVALUATOR_CORE_LOOP_QA_PASSWORD

-- Deterministic isolated-QA fixture for the evaluator-facing Moral Trade loop.
-- The workflow supplies an ephemeral password and removes every fixture-owned
-- business/authentication row after the browser run. No production project is
-- accepted by the workflow target guard.

begin;

-- Recover safely from an interrupted prior run using exact fixture markers.
delete from public.email_outbox
where profile_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
)
or recipient_email like 'evaluator-core-loop-%@qa.invalid';

-- A prior interrupted browser run may have finalized its milestone manifest.
-- Thaw only that exact synthetic agreement graph inside this replacement
-- transaction so the production immutability trigger remains enabled.
delete from public.trade_agreement_confirmations confirmation
using public.trade_agreement_versions version, public.agreements agreement
where confirmation.agreement_version_id = version.id
  and version.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001';

update public.trade_agreement_versions version
set milestone_manifest_hash = null
from public.agreements agreement
where version.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001'
  and version.milestone_manifest_hash is not null;

update public.trade_evidence_bundles bundle
set status = 'draft'
from public.trade_agreement_milestones milestone, public.agreements agreement
where bundle.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001'
  and bundle.status <> 'draft';

delete from public.trade_milestone_payouts payout
using public.trade_agreement_milestones milestone, public.agreements agreement
where payout.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001';

delete from public.trade_milestone_appeals appeal
using public.trade_agreement_milestones milestone, public.agreements agreement
where appeal.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001';

delete from public.trade_milestone_reviews review
using public.trade_agreement_milestones milestone, public.agreements agreement
where review.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001';

delete from public.trade_evidence_bundle_items item
using public.trade_evidence_bundles bundle,
      public.trade_agreement_milestones milestone,
      public.agreements agreement
where item.bundle_id = bundle.id
  and bundle.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001';

delete from public.trade_evidence_bundles bundle
using public.trade_agreement_milestones milestone, public.agreements agreement
where bundle.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = '82000000-0000-4000-8000-000000000001';

delete from public.offers
where id = '82000000-0000-4000-8000-000000000001';

delete from public.trade_notifications
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from auth.mfa_factors
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from auth.sessions
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from auth.refresh_tokens
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from auth.identities
where user_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from moral_trade_private.person_accounts
where profile_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from public.profiles
where id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

delete from auth.users
where id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
);

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
    'qa_fixture', 'evaluator_core_loop_browser'
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
    ),
    (
      '81000000-0000-4000-8000-000000000003'::uuid,
      'evaluator-core-loop-outsider@qa.invalid',
      'QA Core Loop Outsider'
    ),
    (
      '81000000-0000-4000-8000-000000000004'::uuid,
      'evaluator-core-loop-reviewer@qa.invalid',
      'QA Core Loop Reviewer'
    ),
    (
      '81000000-0000-4000-8000-000000000005'::uuid,
      'evaluator-core-loop-admin@qa.invalid',
      'QA Core Loop Administrator'
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
    ),
    (
      '81000000-0000-4000-8000-000000000003'::uuid,
      'evaluator-core-loop-outsider@qa.invalid'
    ),
    (
      '81000000-0000-4000-8000-000000000004'::uuid,
      'evaluator-core-loop-reviewer@qa.invalid'
    ),
    (
      '81000000-0000-4000-8000-000000000005'::uuid,
      'evaluator-core-loop-admin@qa.invalid'
    )
) as actor(id, email);

insert into public.profiles (id, email, display_name, bio, affiliation)
select actor.id, actor.email, actor.display_name, '', 'Isolated QA'
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
    ),
    (
      '81000000-0000-4000-8000-000000000003'::uuid,
      'evaluator-core-loop-outsider@qa.invalid',
      'QA Core Loop Outsider'
    ),
    (
      '81000000-0000-4000-8000-000000000004'::uuid,
      'evaluator-core-loop-reviewer@qa.invalid',
      'QA Core Loop Reviewer'
    ),
    (
      '81000000-0000-4000-8000-000000000005'::uuid,
      'evaluator-core-loop-admin@qa.invalid',
      'QA Core Loop Administrator'
    )
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
  (
    '81000000-0000-4000-8000-000000000004',
    'reviewer',
    true,
    null,
    now(),
    null
  ),
  (
    '81000000-0000-4000-8000-000000000005',
    'administrator',
    true,
    null,
    now(),
    null
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
  'evaluator-core-loop-browser-v1',
  repeat('8', 64),
  'Without this QA test, no participant action or obligation occurs.',
  'Either participant may end all future synthetic obligations immediately by recorded notice.',
  'One synthetic browser checkpoint; maximum financial amount is $0.',
  'Participants and an assigned neutral QA reviewer only',
  now(),
  1
);

commit;
