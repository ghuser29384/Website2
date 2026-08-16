\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\getenv qa_namespace_handle EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE
\getenv qa_namespace_hash EVIDENCE_PAYMENT_QA_NAMESPACE_HASH
\getenv qa_repository EVIDENCE_PAYMENT_QA_REPOSITORY
\getenv qa_workflow_ref EVIDENCE_PAYMENT_QA_WORKFLOW_REF
\getenv qa_run_id EVIDENCE_PAYMENT_QA_RUN_ID
\getenv qa_run_attempt EVIDENCE_PAYMENT_QA_RUN_ATTEMPT
\getenv qa_expected_ref EVIDENCE_PAYMENT_QA_REF

\getenv qa_payer_id EVIDENCE_PAYMENT_QA_PAYER_ID
\getenv qa_payer_email EVIDENCE_PAYMENT_QA_PAYER_EMAIL
\getenv qa_payee_id EVIDENCE_PAYMENT_QA_PAYEE_ID
\getenv qa_payee_email EVIDENCE_PAYMENT_QA_PAYEE_EMAIL
\getenv qa_reviewer_id EVIDENCE_PAYMENT_QA_REVIEWER_ID
\getenv qa_reviewer_email EVIDENCE_PAYMENT_QA_REVIEWER_EMAIL
\getenv qa_appeal_reviewer_id EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID
\getenv qa_appeal_reviewer_email EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_EMAIL
\getenv qa_outsider_id EVIDENCE_PAYMENT_QA_OUTSIDER_ID
\getenv qa_outsider_email EVIDENCE_PAYMENT_QA_OUTSIDER_EMAIL
\getenv qa_admin_id EVIDENCE_PAYMENT_QA_ADMIN_ID
\getenv qa_admin_email EVIDENCE_PAYMENT_QA_ADMIN_EMAIL

\getenv qa_agreement_id EVIDENCE_PAYMENT_QA_AGREEMENT_ID
\getenv qa_admin_fallback_agreement_id EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_AGREEMENT_ID
\getenv qa_agreement_version_id EVIDENCE_PAYMENT_QA_AGREEMENT_VERSION_ID
\getenv qa_admin_fallback_agreement_version_id EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_AGREEMENT_VERSION_ID
\getenv qa_milestone_id EVIDENCE_PAYMENT_QA_MILESTONE_ID
\getenv qa_admin_fallback_milestone_id EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_MILESTONE_ID
\getenv qa_evidence_bundle_id EVIDENCE_PAYMENT_QA_EVIDENCE_BUNDLE_ID
\getenv qa_admin_fallback_evidence_bundle_id EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_EVIDENCE_BUNDLE_ID
\getenv qa_milestone_review_id EVIDENCE_PAYMENT_QA_MILESTONE_REVIEW_ID
\getenv qa_admin_fallback_milestone_review_id EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_MILESTONE_REVIEW_ID
\getenv qa_payout_id EVIDENCE_PAYMENT_QA_PAYOUT_ID
\getenv qa_admin_fallback_payout_id EVIDENCE_PAYMENT_QA_ADMIN_FALLBACK_PAYOUT_ID

begin;

create temporary table qa_evidence_payment_manifest (
  namespace_handle text not null,
  namespace_hash text not null,
  repository text not null,
  workflow_ref text not null,
  run_id text not null,
  run_attempt text not null,
  qa_ref text not null,
  user_ids uuid[] not null,
  emails text[] not null,
  agreement_ids uuid[] not null,
  version_ids uuid[] not null,
  milestone_ids uuid[] not null,
  bundle_ids uuid[] not null,
  review_ids uuid[] not null,
  payout_ids uuid[] not null
) on commit drop;

insert into qa_evidence_payment_manifest values (
  :'qa_namespace_handle',
  :'qa_namespace_hash',
  :'qa_repository',
  :'qa_workflow_ref',
  :'qa_run_id',
  :'qa_run_attempt',
  :'qa_expected_ref',
  array[
    :'qa_payer_id'::uuid,
    :'qa_payee_id'::uuid,
    :'qa_reviewer_id'::uuid,
    :'qa_appeal_reviewer_id'::uuid,
    :'qa_outsider_id'::uuid,
    :'qa_admin_id'::uuid
  ],
  array[
    :'qa_payer_email',
    :'qa_payee_email',
    :'qa_reviewer_email',
    :'qa_appeal_reviewer_email',
    :'qa_outsider_email',
    :'qa_admin_email'
  ],
  array[
    :'qa_agreement_id'::uuid,
    :'qa_admin_fallback_agreement_id'::uuid
  ],
  array[
    :'qa_agreement_version_id'::uuid,
    :'qa_admin_fallback_agreement_version_id'::uuid
  ],
  array[
    :'qa_milestone_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid
  ],
  array[
    :'qa_evidence_bundle_id'::uuid,
    :'qa_admin_fallback_evidence_bundle_id'::uuid
  ],
  array[
    :'qa_milestone_review_id'::uuid,
    :'qa_admin_fallback_milestone_review_id'::uuid
  ],
  array[
    :'qa_payout_id'::uuid,
    :'qa_admin_fallback_payout_id'::uuid
  ]
);

do $$
declare
  manifest qa_evidence_payment_manifest%rowtype;
  distinct_count integer;
  residue jsonb;
begin
  select * into strict manifest from qa_evidence_payment_manifest;

  if manifest.namespace_handle !~ '^epqa-[0-9a-f]{24}$' then
    raise exception 'Invalid Evidence-payment QA namespace handle.';
  end if;
  if manifest.namespace_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid Evidence-payment QA namespace hash.';
  end if;
  if manifest.repository !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' then
    raise exception 'Invalid Evidence-payment QA repository identity.';
  end if;
  if manifest.workflow_ref !~ '^[A-Za-z0-9_.@/+\-]+$' then
    raise exception 'Invalid Evidence-payment QA workflow identity.';
  end if;
  if manifest.run_id !~ '^[1-9][0-9]{0,19}$'
     or manifest.run_attempt !~ '^[1-9][0-9]{0,19}$' then
    raise exception 'Invalid Evidence-payment QA run identity.';
  end if;
  if manifest.qa_ref <> 'hvmxfjjbdcgjjudmthdz' then
    raise exception 'Refusing a non-QA Evidence-payment target.';
  end if;

  select count(distinct value) into distinct_count
  from unnest(manifest.user_ids) as value;
  if distinct_count <> cardinality(manifest.user_ids) then
    raise exception 'Duplicate Evidence-payment QA user identifiers.';
  end if;

  select count(distinct value) into distinct_count
  from unnest(manifest.emails) as value;
  if distinct_count <> cardinality(manifest.emails) then
    raise exception 'Duplicate Evidence-payment QA emails.';
  end if;

  if exists (
    select 1 from unnest(manifest.user_ids) as value
    where value::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'Malformed Evidence-payment QA user identifier.';
  end if;

  if exists (
    select 1 from unnest(manifest.emails) as value
    where value !~ '^epqa-[0-9a-f]{20}-[a-z-]+@qa\.invalid$'
  ) then
    raise exception 'Malformed Evidence-payment QA email.';
  end if;

  residue := jsonb_build_object(
    'authUsers', (
      select count(*) from auth.users
      where id = any(manifest.user_ids) or email = any(manifest.emails)
    ),
    'authIdentities', (
      select count(*) from auth.identities
      where user_id = any(manifest.user_ids)
    ),
    'authSessions', (
      select count(*) from auth.sessions
      where user_id = any(manifest.user_ids)
    ),
    'authRefreshTokens', (
      select count(*) from auth.refresh_tokens
      where user_id = any(
        select value::text from unnest(manifest.user_ids) as value
      )
    ),
    'authMfaFactors', (
      select count(*) from auth.mfa_factors
      where user_id = any(manifest.user_ids)
    ),
    'profiles', (
      select count(*) from public.profiles
      where id = any(manifest.user_ids) or email = any(manifest.emails)
    ),
    'privateAccounts', (
      select count(*) from moral_trade_private.person_accounts
      where profile_id = any(manifest.user_ids)
    ),
    'reviewRoles', (
      select count(*) from public.trade_review_role_grants
      where profile_id = any(manifest.user_ids)
    ),
    'agreements', (
      select count(*) from public.agreements
      where id = any(manifest.agreement_ids)
    ),
    'versions', (
      select count(*) from public.trade_agreement_versions
      where id = any(manifest.version_ids)
    ),
    'milestones', (
      select count(*) from public.trade_agreement_milestones
      where id = any(manifest.milestone_ids)
    ),
    'bundles', (
      select count(*) from public.trade_evidence_bundles
      where id = any(manifest.bundle_ids)
    ),
    'reviews', (
      select count(*) from public.trade_milestone_reviews
      where id = any(manifest.review_ids)
    ),
    'payouts', (
      select count(*) from public.trade_milestone_payouts
      where id = any(manifest.payout_ids)
    ),
    'paymentCases', (
      select count(*) from public.trade_payment_review_cases
      where payout_id = any(manifest.payout_ids)
    ),
    'paymentReceipts', (
      select count(*) from public.trade_external_payment_receipts
      where payout_id = any(manifest.payout_ids)
    ),
    'notifications', (
      select count(*) from public.trade_notifications
      where user_id = any(manifest.user_ids)
    ),
    'emailOutbox', (
      select count(*) from public.email_outbox
      where profile_id = any(manifest.user_ids)
         or recipient_email = any(manifest.emails)
    )
  );

  if exists (
    select 1 from jsonb_each_text(residue)
    where value::integer <> 0
  ) then
    raise exception 'Evidence-payment QA namespace collision or residue: %', residue;
  end if;
end $$;

select json_build_object(
  'status', 'ok',
  'namespaceHandle', namespace_handle,
  'namespaceSha256', namespace_hash,
  'repository', repository,
  'workflowRef', workflow_ref,
  'runId', run_id,
  'runAttempt', run_attempt,
  'qaRef', qa_ref,
  'roleCount', cardinality(user_ids),
  'agreementCount', cardinality(agreement_ids),
  'residue', json_build_object(
    'authUsers', 0,
    'authIdentities', 0,
    'authSessions', 0,
    'authRefreshTokens', 0,
    'authMfaFactors', 0,
    'profiles', 0,
    'privateAccounts', 0,
    'reviewRoles', 0,
    'agreements', 0,
    'versions', 0,
    'milestones', 0,
    'bundles', 0,
    'reviews', 0,
    'payouts', 0,
    'paymentCases', 0,
    'paymentReceipts', 0,
    'notifications', 0,
    'emailOutbox', 0
  )
)
from qa_evidence_payment_manifest;

rollback;
