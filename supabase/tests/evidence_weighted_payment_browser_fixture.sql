\set ON_ERROR_STOP on
\ir evidence_weighted_payment_browser_preflight.sql
\getenv qa_password EVIDENCE_PAYMENT_QA_PASSWORD

-- Durable isolated-QA fixture for the authenticated Playwright release gate.
-- Every persistent identifier and email is derived from immutable workflow-run
-- metadata. This script never reuses, discovers, or cleans a different run's
-- fixtures. The password is ephemeral and never written to an artifact.

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
    'qa_fixture', 'evidence_payment_browser',
    'qa_namespace', :'qa_namespace_handle',
    'qa_namespace_sha256', :'qa_namespace_hash'
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
      :'qa_payer_id'::uuid,
      :'qa_payer_email',
      'QA Payment Payer'
    ),
    (
      :'qa_payee_id'::uuid,
      :'qa_payee_email',
      'QA Payment Payee'
    ),
    (
      :'qa_reviewer_id'::uuid,
      :'qa_reviewer_email',
      'QA Payment Reviewer'
    ),
    (
      :'qa_appeal_reviewer_id'::uuid,
      :'qa_appeal_reviewer_email',
      'QA Payment Appeal Reviewer'
    ),
    (
      :'qa_outsider_id'::uuid,
      :'qa_outsider_email',
      'QA Payment Outsider'
    ),
    (
      :'qa_admin_id'::uuid,
      :'qa_admin_email',
      'QA Payment Administrator'
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
    (:'qa_payer_id'::uuid, :'qa_payer_email'),
    (:'qa_payee_id'::uuid, :'qa_payee_email'),
    (:'qa_reviewer_id'::uuid, :'qa_reviewer_email'),
    (:'qa_appeal_reviewer_id'::uuid, :'qa_appeal_reviewer_email'),
    (:'qa_outsider_id'::uuid, :'qa_outsider_email'),
    (:'qa_admin_id'::uuid, :'qa_admin_email')
) as actor(id, email);

insert into public.profiles (id, email, display_name, bio, affiliation)
select *
from (
  values
    (
      :'qa_payer_id'::uuid,
      :'qa_payer_email',
      'QA Payment Payer',
      '',
      'Isolated QA'
    ),
    (
      :'qa_payee_id'::uuid,
      :'qa_payee_email',
      'QA Payment Payee',
      '',
      'Isolated QA'
    ),
    (
      :'qa_reviewer_id'::uuid,
      :'qa_reviewer_email',
      'QA Payment Reviewer',
      '',
      'Isolated QA'
    ),
    (
      :'qa_appeal_reviewer_id'::uuid,
      :'qa_appeal_reviewer_email',
      'QA Payment Appeal Reviewer',
      '',
      'Isolated QA'
    ),
    (
      :'qa_outsider_id'::uuid,
      :'qa_outsider_email',
      'QA Payment Outsider',
      '',
      'Isolated QA'
    ),
    (
      :'qa_admin_id'::uuid,
      :'qa_admin_email',
      'QA Payment Administrator',
      '',
      'Isolated QA'
    )
) as actor(id, email, display_name, bio, affiliation);

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
    :'qa_reviewer_id'::uuid,
    'reviewer',
    true,
    null,
    now(),
    null
  ),
  (
    :'qa_appeal_reviewer_id'::uuid,
    'reviewer',
    true,
    null,
    now(),
    null
  ),
  (
    :'qa_admin_id'::uuid,
    'administrator',
    true,
    null,
    now(),
    null
  );

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
    :'qa_agreement_id'::uuid,
    :'qa_payer_id'::uuid,
    :'qa_payee_id'::uuid,
    'active',
    'active',
    'manual',
    'under_review'
  ),
  (
    :'qa_admin_fallback_agreement_id'::uuid,
    :'qa_payer_id'::uuid,
    :'qa_payee_id'::uuid,
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
    :'qa_agreement_version_id'::uuid,
    :'qa_agreement_id'::uuid,
    1,
    :'qa_payer_id'::uuid,
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
    :'qa_admin_fallback_agreement_version_id'::uuid,
    :'qa_admin_fallback_agreement_id'::uuid,
    1,
    :'qa_payer_id'::uuid,
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
    when :'qa_agreement_id'::uuid
      then :'qa_agreement_version_id'::uuid
    when :'qa_admin_fallback_agreement_id'::uuid
      then :'qa_admin_fallback_agreement_version_id'::uuid
  end
where id in (
  :'qa_agreement_id'::uuid,
  :'qa_admin_fallback_agreement_id'::uuid
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
    :'qa_milestone_id'::uuid,
    :'qa_agreement_id'::uuid,
    :'qa_agreement_version_id'::uuid,
    1,
    :'qa_payee_id'::uuid,
    :'qa_payer_id'::uuid,
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
    :'qa_admin_fallback_milestone_id'::uuid,
    :'qa_admin_fallback_agreement_id'::uuid,
    :'qa_admin_fallback_agreement_version_id'::uuid,
    1,
    :'qa_payee_id'::uuid,
    :'qa_payer_id'::uuid,
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
    :'qa_agreement_version_id'::uuid,
    :'qa_admin_fallback_agreement_version_id'::uuid
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
    :'qa_evidence_bundle_id'::uuid,
    :'qa_milestone_id'::uuid,
    :'qa_payee_id'::uuid,
    'initial',
    1,
    'accepted',
    now(),
    now()
  ),
  (
    :'qa_admin_fallback_evidence_bundle_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid,
    :'qa_payee_id'::uuid,
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
    :'qa_milestone_review_id'::uuid,
    :'qa_milestone_id'::uuid,
    :'qa_evidence_bundle_id'::uuid,
    :'qa_reviewer_id'::uuid,
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
    :'qa_admin_fallback_milestone_review_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid,
    :'qa_admin_fallback_evidence_bundle_id'::uuid,
    :'qa_reviewer_id'::uuid,
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
        when :'qa_milestone_id'::uuid
          then :'qa_evidence_bundle_id'::uuid
        when :'qa_admin_fallback_milestone_id'::uuid
          then :'qa_admin_fallback_evidence_bundle_id'::uuid
      end,
    final_review_id =
      case id
        when :'qa_milestone_id'::uuid
          then :'qa_milestone_review_id'::uuid
        when :'qa_admin_fallback_milestone_id'::uuid
          then :'qa_admin_fallback_milestone_review_id'::uuid
      end
where id in (
  :'qa_milestone_id'::uuid,
  :'qa_admin_fallback_milestone_id'::uuid
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
    :'qa_payout_id'::uuid,
    :'qa_milestone_id'::uuid,
    :'qa_milestone_review_id'::uuid,
    :'qa_payer_id'::uuid,
    :'qa_payee_id'::uuid,
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
    :'qa_admin_fallback_payout_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid,
    :'qa_admin_fallback_milestone_review_id'::uuid,
    :'qa_payer_id'::uuid,
    :'qa_payee_id'::uuid,
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
  :'qa_payer_id',
  true
);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', :'qa_payer_id',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
select public.report_trade_external_payment_v1(
  :'qa_admin_fallback_payout_id'::uuid,
  'QA bank',
  'qa-admin-fallback-' || :'qa_namespace_handle',
  250,
  'USD',
  current_date,
  ''
);

select set_config(
  'request.jwt.claim.sub',
  :'qa_payee_id',
  true
);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', :'qa_payee_id',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
select public.respond_trade_external_payment_v1(
  (
    select id
    from public.trade_external_payment_receipts
    where payout_id = :'qa_admin_fallback_payout_id'::uuid
      and provider_reference = 'qa-admin-fallback-' || :'qa_namespace_handle'
  ),
  'dispute',
  'Exercise the expired isolated-QA administrator fallback.'
);

update public.trade_payment_review_cases
set reviewer_selection_deadline_at = now() - interval '1 second'
where payout_id = :'qa_admin_fallback_payout_id'::uuid;

commit;

select json_build_object(
  'status', 'created',
  'namespaceHandle', :'qa_namespace_handle',
  'authUsers', (
    select count(*) from auth.users
    where id in (
      :'qa_payer_id'::uuid,
      :'qa_payee_id'::uuid,
      :'qa_reviewer_id'::uuid,
      :'qa_appeal_reviewer_id'::uuid,
      :'qa_outsider_id'::uuid,
      :'qa_admin_id'::uuid
    )
  ),
  'agreements', (
    select count(*) from public.agreements
    where id in (
      :'qa_agreement_id'::uuid,
      :'qa_admin_fallback_agreement_id'::uuid
    )
  ),
  'payouts', (
    select count(*) from public.trade_milestone_payouts
    where id in (
      :'qa_payout_id'::uuid,
      :'qa_admin_fallback_payout_id'::uuid
    )
  ),
  'fallbackPaymentCases', (
    select count(*) from public.trade_payment_review_cases
    where payout_id = :'qa_admin_fallback_payout_id'::uuid
  )
) as fixture;
