\set ON_ERROR_STOP on
\getenv qa_password EVIDENCE_PAYMENT_QA_PASSWORD

-- Durable isolated-QA fixture for the authenticated Playwright release gate.
-- Set EVIDENCE_PAYMENT_QA_PASSWORD to an ephemeral random value before invoking
-- this script. The password is never checked in, and cleanup invalidates it.

begin;

create temporary table qa_browser_cleanup_payouts
on commit drop
as
select payout.id
from public.trade_milestone_payouts payout
join public.trade_agreement_milestones milestone
  on milestone.id = payout.milestone_id
where milestone.agreement_id in (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);

create temporary table qa_browser_cleanup_payment_cases
on commit drop
as
select review_case.id
from public.trade_payment_review_cases review_case
where review_case.payout_id in (
  select payout.id from qa_browser_cleanup_payouts payout
);

delete from public.trade_payment_appeals
where case_id in (
  select review_case.id from qa_browser_cleanup_payment_cases review_case
);

delete from public.trade_payment_review_decisions
where decision_kind = 'appeal'
  and case_id in (
    select review_case.id from qa_browser_cleanup_payment_cases review_case
  );

delete from public.trade_payment_review_decisions
where case_id in (
  select review_case.id from qa_browser_cleanup_payment_cases review_case
);

delete from public.trade_payment_review_cases
where id in (
  select review_case.id from qa_browser_cleanup_payment_cases review_case
);

delete from public.trade_external_payment_receipts
where attempt_number = 2
  and payout_id in (
    select payout.id from qa_browser_cleanup_payouts payout
  );

delete from public.trade_external_payment_receipts
where attempt_number = 1
  and payout_id in (
    select payout.id from qa_browser_cleanup_payouts payout
  );

delete from public.agreements
where id in (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);

delete from public.trade_notifications
where user_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);

delete from public.trade_review_role_grants
where profile_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);

delete from auth.mfa_factors
where user_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
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
    'display_name',
    actor.display_name,
    'qa_fixture',
    'evidence_payment_browser'
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
      '71000000-0000-4000-8000-000000000001'::uuid,
      'evidence-payment-payer@qa.invalid',
      'QA Payment Payer'
    ),
    (
      '71000000-0000-4000-8000-000000000002'::uuid,
      'evidence-payment-payee@qa.invalid',
      'QA Payment Payee'
    ),
    (
      '71000000-0000-4000-8000-000000000003'::uuid,
      'evidence-payment-reviewer@qa.invalid',
      'QA Payment Reviewer'
    ),
    (
      '71000000-0000-4000-8000-000000000004'::uuid,
      'evidence-payment-appeal-reviewer@qa.invalid',
      'QA Payment Appeal Reviewer'
    ),
    (
      '71000000-0000-4000-8000-000000000005'::uuid,
      'evidence-payment-outsider@qa.invalid',
      'QA Payment Outsider'
    ),
    (
      '71000000-0000-4000-8000-000000000006'::uuid,
      'evidence-payment-admin@qa.invalid',
      'QA Payment Administrator'
    )
) as actor(id, email, display_name)
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change = excluded.email_change,
    email_change_token_new = excluded.email_change_token_new,
    email_change_token_current = excluded.email_change_token_current,
    reauthentication_token = excluded.reauthentication_token,
    deleted_at = null,
    banned_until = null,
    updated_at = now();

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
    'sub',
    actor.id::text,
    'email',
    actor.email,
    'email_verified',
    true
  ),
  'email',
  now(),
  now(),
  now()
from (
  values
    (
      '71000000-0000-4000-8000-000000000001'::uuid,
      'evidence-payment-payer@qa.invalid'
    ),
    (
      '71000000-0000-4000-8000-000000000002'::uuid,
      'evidence-payment-payee@qa.invalid'
    ),
    (
      '71000000-0000-4000-8000-000000000003'::uuid,
      'evidence-payment-reviewer@qa.invalid'
    ),
    (
      '71000000-0000-4000-8000-000000000004'::uuid,
      'evidence-payment-appeal-reviewer@qa.invalid'
    ),
    (
      '71000000-0000-4000-8000-000000000005'::uuid,
      'evidence-payment-outsider@qa.invalid'
    ),
    (
      '71000000-0000-4000-8000-000000000006'::uuid,
      'evidence-payment-admin@qa.invalid'
    )
) as actor(id, email)
on conflict (provider_id, provider) do update
set user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

insert into public.profiles (id, email, display_name, bio, affiliation)
select *
from (
  values
    (
      '71000000-0000-4000-8000-000000000001'::uuid,
      'evidence-payment-payer@qa.invalid',
      'QA Payment Payer',
      '',
      'Isolated QA'
    ),
    (
      '71000000-0000-4000-8000-000000000002'::uuid,
      'evidence-payment-payee@qa.invalid',
      'QA Payment Payee',
      '',
      'Isolated QA'
    ),
    (
      '71000000-0000-4000-8000-000000000003'::uuid,
      'evidence-payment-reviewer@qa.invalid',
      'QA Payment Reviewer',
      '',
      'Isolated QA'
    ),
    (
      '71000000-0000-4000-8000-000000000004'::uuid,
      'evidence-payment-appeal-reviewer@qa.invalid',
      'QA Payment Appeal Reviewer',
      '',
      'Isolated QA'
    ),
    (
      '71000000-0000-4000-8000-000000000005'::uuid,
      'evidence-payment-outsider@qa.invalid',
      'QA Payment Outsider',
      '',
      'Isolated QA'
    ),
    (
      '71000000-0000-4000-8000-000000000006'::uuid,
      'evidence-payment-admin@qa.invalid',
      'QA Payment Administrator',
      '',
      'Isolated QA'
    )
) as actor(id, email, display_name, bio, affiliation)
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation;

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
    '71000000-0000-4000-8000-000000000003',
    'reviewer',
    true,
    null,
    now(),
    null
  ),
  (
    '71000000-0000-4000-8000-000000000004',
    'reviewer',
    true,
    null,
    now(),
    null
  ),
  (
    '71000000-0000-4000-8000-000000000006',
    'administrator',
    true,
    null,
    now(),
    null
  )
on conflict (profile_id, role) do update
set active = true,
    granted_by = null,
    granted_at = now(),
    revoked_at = null;

insert into public.agreements (
  id,
  proposer_id,
  responder_id,
  status,
  lifecycle_status,
  source,
  completion_state
)
values
  (
    '72000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    'active',
    'active',
    'manual',
    'under_review'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    'active',
    'active',
    'manual',
    'under_review'
  );

insert into public.trade_agreement_versions (
  id,
  agreement_id,
  version,
  proposed_by,
  proposed_action,
  requested_action,
  duration,
  evidence_rule,
  exit_conditions,
  maximum_burden,
  privacy_scope,
  no_trade_baseline,
  terms_hash,
  requires_milestone_manifest,
  milestone_manifest_hash,
  complete_terms_hash
)
values
  (
    '73000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    1,
    '71000000-0000-4000-8000-000000000001',
    'Pay the externally settled QA amount',
    'Complete the evidence-weighted QA milestone',
    'QA browser lifecycle',
    'Private QA evidence',
    'Either participant may exit prospectively',
    '$5 maximum',
    'Participants and assigned reviewers only',
    'No trade',
    repeat('a', 64),
    false,
    null,
    null
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    1,
    '71000000-0000-4000-8000-000000000001',
    'Pay the externally settled QA fallback amount',
    'Complete the fallback QA milestone',
    'QA administrator fallback',
    'Private QA evidence',
    'Either participant may exit prospectively',
    '$5 maximum',
    'Participants and assigned reviewers only',
    'No trade',
    repeat('d', 64),
    false,
    null,
    null
  );

update public.agreements
set current_version_id =
  case id
    when '72000000-0000-4000-8000-000000000001'::uuid
      then '73000000-0000-4000-8000-000000000001'::uuid
    when '72000000-0000-4000-8000-000000000002'::uuid
      then '73000000-0000-4000-8000-000000000002'::uuid
  end
where id in (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);

insert into public.trade_agreement_milestones (
  id,
  agreement_id,
  agreement_version_id,
  position,
  performer_id,
  payer_id,
  action_category,
  description,
  unit_label,
  units_total,
  indivisible,
  maximum_amount_cents,
  currency,
  evidence_rule,
  status
)
values
  (
    '74000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000001',
    1,
    '71000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000001',
    'service',
    'Complete the isolated-QA evidence-weighted payment lifecycle',
    'milestone',
    1,
    true,
    500,
    'USD',
    'Private completion evidence',
    'graded'
  ),
  (
    '74000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000002',
    1,
    '71000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000001',
    'service',
    'Exercise the expired administrator payment-review fallback',
    'milestone',
    1,
    true,
    500,
    'USD',
    'Private completion evidence',
    'graded'
  );

with version_hashes as (
  select
    version_row.id,
    version_row.terms_hash,
    public.trade_milestone_manifest_hash_v1(version_row.id) as manifest_hash
  from public.trade_agreement_versions version_row
  where version_row.id in (
    '73000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000002'
  )
)
update public.trade_agreement_versions version_row
set requires_milestone_manifest = true,
    milestone_manifest_hash = version_hashes.manifest_hash,
    complete_terms_hash = encode(
      extensions.digest(
        convert_to(
          version_hashes.terms_hash || chr(31) || version_hashes.manifest_hash,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
from version_hashes
where version_row.id = version_hashes.id;

insert into public.trade_evidence_bundles (
  id,
  milestone_id,
  submitted_by,
  bundle_kind,
  attempt_number,
  status,
  submitted_at,
  reviewed_at
)
values
  (
    '75000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    'initial',
    1,
    'accepted',
    now(),
    now()
  ),
  (
    '75000000-0000-4000-8000-000000000002',
    '74000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    'initial',
    1,
    'accepted',
    now(),
    now()
  );

insert into public.trade_milestone_reviews (
  id,
  milestone_id,
  bundle_id,
  reviewer_id,
  review_kind,
  outcome,
  completion_units,
  confidence_band,
  payout_basis_points,
  amount_due_cents,
  private_reason,
  appeal_deadline_at,
  is_final,
  finalized_at
)
values
  (
    '76000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000001',
    '75000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000003',
    'initial',
    'graded',
    1,
    50,
    5000,
    250,
    'Full completion at moderate confidence.',
    now(),
    true,
    now()
  ),
  (
    '76000000-0000-4000-8000-000000000002',
    '74000000-0000-4000-8000-000000000002',
    '75000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000003',
    'initial',
    'graded',
    1,
    50,
    5000,
    250,
    'Full completion at moderate confidence.',
    now(),
    true,
    now()
  );

update public.trade_agreement_milestones
set current_bundle_id =
      case id
        when '74000000-0000-4000-8000-000000000001'::uuid
          then '75000000-0000-4000-8000-000000000001'::uuid
        when '74000000-0000-4000-8000-000000000002'::uuid
          then '75000000-0000-4000-8000-000000000002'::uuid
      end,
    final_review_id =
      case id
        when '74000000-0000-4000-8000-000000000001'::uuid
          then '76000000-0000-4000-8000-000000000001'::uuid
        when '74000000-0000-4000-8000-000000000002'::uuid
          then '76000000-0000-4000-8000-000000000002'::uuid
      end
where id in (
  '74000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000002'
);

insert into public.trade_milestone_payouts (
  id,
  milestone_id,
  review_id,
  payer_id,
  payee_id,
  maximum_amount_cents,
  completion_units,
  units_total,
  confidence_band,
  payout_basis_points,
  amount_due_cents,
  currency,
  is_final,
  status,
  finalized_at
)
values
  (
    '77000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000001',
    '76000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    500,
    1,
    1,
    50,
    5000,
    250,
    'USD',
    true,
    'due',
    now()
  ),
  (
    '77000000-0000-4000-8000-000000000002',
    '74000000-0000-4000-8000-000000000002',
    '76000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    500,
    1,
    1,
    50,
    5000,
    250,
    'USD',
    true,
    'due',
    now()
  );

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select public.report_trade_external_payment_v1(
  '77000000-0000-4000-8000-000000000002',
  'QA bank',
  'QA-admin-fallback-initial',
  250,
  'USD',
  current_date,
  ''
);

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
select public.respond_trade_external_payment_v1(
  (
    select id
    from public.trade_external_payment_receipts
    where payout_id = '77000000-0000-4000-8000-000000000002'
    order by payment_cycle desc, attempt_number desc
    limit 1
  ),
  'dispute',
  'Exercise the expired isolated-QA administrator fallback.'
);

update public.trade_payment_review_cases
set reviewer_selection_deadline_at = now() - interval '1 second'
where payout_id = '77000000-0000-4000-8000-000000000002';

commit;
