\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

\getenv qa_namespace_handle EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE
\getenv qa_namespace_hash EVIDENCE_PAYMENT_QA_NAMESPACE_HASH
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

create temporary table qa_evidence_payment_actor_manifest (
  id uuid primary key,
  email text not null unique,
  role_name text not null
) on commit drop;

insert into qa_evidence_payment_actor_manifest values
  (:'qa_payer_id'::uuid, :'qa_payer_email', 'payer'),
  (:'qa_payee_id'::uuid, :'qa_payee_email', 'payee'),
  (:'qa_reviewer_id'::uuid, :'qa_reviewer_email', 'reviewer'),
  (:'qa_appeal_reviewer_id'::uuid, :'qa_appeal_reviewer_email', 'appeal-reviewer'),
  (:'qa_outsider_id'::uuid, :'qa_outsider_email', 'outsider'),
  (:'qa_admin_id'::uuid, :'qa_admin_email', 'administrator');

create temporary table qa_evidence_payment_object_manifest (
  object_kind text not null,
  id uuid primary key,
  parent_id uuid
) on commit drop;

insert into qa_evidence_payment_object_manifest values
  ('agreement', :'qa_agreement_id'::uuid, null),
  ('agreement', :'qa_admin_fallback_agreement_id'::uuid, null),
  ('version', :'qa_agreement_version_id'::uuid, :'qa_agreement_id'::uuid),
  (
    'version',
    :'qa_admin_fallback_agreement_version_id'::uuid,
    :'qa_admin_fallback_agreement_id'::uuid
  ),
  ('milestone', :'qa_milestone_id'::uuid, :'qa_agreement_id'::uuid),
  (
    'milestone',
    :'qa_admin_fallback_milestone_id'::uuid,
    :'qa_admin_fallback_agreement_id'::uuid
  ),
  ('bundle', :'qa_evidence_bundle_id'::uuid, :'qa_milestone_id'::uuid),
  (
    'bundle',
    :'qa_admin_fallback_evidence_bundle_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid
  ),
  ('review', :'qa_milestone_review_id'::uuid, :'qa_milestone_id'::uuid),
  (
    'review',
    :'qa_admin_fallback_milestone_review_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid
  ),
  ('payout', :'qa_payout_id'::uuid, :'qa_milestone_id'::uuid),
  (
    'payout',
    :'qa_admin_fallback_payout_id'::uuid,
    :'qa_admin_fallback_milestone_id'::uuid
  );

-- Copy the validated psql handle into a transaction-local setting so the
-- ownership checks below never interpolate untrusted text inside a DO body.
select set_config('app.qa_namespace_handle', :'qa_namespace_handle', true);
select set_config('app.qa_namespace_hash', :'qa_namespace_hash', true);
select set_config('app.qa_ref', :'qa_expected_ref', true);

do $$
declare
  namespace_handle text := current_setting('app.qa_namespace_handle');
  namespace_hash text := current_setting('app.qa_namespace_hash');
  qa_ref text := current_setting('app.qa_ref');
begin
  if namespace_handle !~ '^epqa-[0-9a-f]{24}$'
     or namespace_hash !~ '^[0-9a-f]{64}$'
     or qa_ref <> 'hvmxfjjbdcgjjudmthdz' then
    raise exception 'Refusing malformed or non-QA Evidence-payment cleanup metadata.';
  end if;

  if exists (
    select 1
    from auth.users user_row
    join qa_evidence_payment_actor_manifest actor on actor.id = user_row.id
    where user_row.email is distinct from actor.email
       or user_row.raw_user_meta_data->>'qa_fixture'
          is distinct from 'evidence_payment_browser'
       or user_row.raw_user_meta_data->>'qa_namespace'
          is distinct from namespace_handle
       or user_row.raw_user_meta_data->>'qa_namespace_sha256'
          is distinct from namespace_hash
  ) then
    raise exception 'Cleanup ownership check failed for an Auth user.';
  end if;

  if exists (
    select 1
    from auth.users user_row
    join qa_evidence_payment_actor_manifest actor on actor.email = user_row.email
    where user_row.id <> actor.id
  ) then
    raise exception 'Cleanup ownership check found an email owned by another Auth user.';
  end if;

  if exists (
    select 1
    from public.profiles profile
    join qa_evidence_payment_actor_manifest actor on actor.id = profile.id
    where profile.email is distinct from actor.email
  ) then
    raise exception 'Cleanup ownership check failed for a profile.';
  end if;

  if exists (
    select 1 from public.agreements agreement
    where agreement.id in (
      select id from qa_evidence_payment_object_manifest
      where object_kind = 'agreement'
    )
      and (
        agreement.proposer_id <> (
          select id from qa_evidence_payment_actor_manifest where role_name = 'payer'
        )
        or agreement.responder_id <> (
          select id from qa_evidence_payment_actor_manifest where role_name = 'payee'
        )
      )
  ) then
    raise exception 'Cleanup ownership check failed for an agreement.';
  end if;

  if exists (
    select 1
    from public.trade_agreement_versions version_row
    join qa_evidence_payment_object_manifest object_row
      on object_row.id = version_row.id
     and object_row.object_kind = 'version'
    where version_row.agreement_id <> object_row.parent_id
  ) then
    raise exception 'Cleanup ownership check failed for an agreement version.';
  end if;

  if exists (
    select 1
    from public.trade_agreement_milestones milestone
    join qa_evidence_payment_object_manifest object_row
      on object_row.id = milestone.id
     and object_row.object_kind = 'milestone'
    where milestone.agreement_id <> object_row.parent_id
  ) then
    raise exception 'Cleanup ownership check failed for a milestone.';
  end if;

  if exists (
    select 1
    from public.trade_evidence_bundles bundle
    join qa_evidence_payment_object_manifest object_row
      on object_row.id = bundle.id
     and object_row.object_kind = 'bundle'
    where bundle.milestone_id <> object_row.parent_id
  ) then
    raise exception 'Cleanup ownership check failed for an evidence bundle.';
  end if;

  if exists (
    select 1
    from public.trade_milestone_reviews review
    join qa_evidence_payment_object_manifest object_row
      on object_row.id = review.id
     and object_row.object_kind = 'review'
    where review.milestone_id <> object_row.parent_id
  ) then
    raise exception 'Cleanup ownership check failed for a milestone review.';
  end if;

  if exists (
    select 1
    from public.trade_milestone_payouts payout
    join qa_evidence_payment_object_manifest object_row
      on object_row.id = payout.id
     and object_row.object_kind = 'payout'
    where payout.milestone_id <> object_row.parent_id
  ) then
    raise exception 'Cleanup ownership check failed for a payout.';
  end if;
end $$;

create temporary table qa_browser_cleanup_payouts
on commit drop
as
select payout.id
from public.trade_milestone_payouts payout
where payout.id in (
  :'qa_payout_id'::uuid,
  :'qa_admin_fallback_payout_id'::uuid
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

delete from public.email_outbox
where profile_id in (
  select id from qa_evidence_payment_actor_manifest
)
or recipient_email in (
  select email from qa_evidence_payment_actor_manifest
);

delete from public.core_loop_events
where profile_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from public.trade_notifications
where user_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from public.trade_review_role_grants
where profile_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from public.agreements
where id in (
  :'qa_agreement_id'::uuid,
  :'qa_admin_fallback_agreement_id'::uuid
);

delete from moral_trade_private.person_accounts
where profile_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from public.profiles
where id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from auth.mfa_factors
where user_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from auth.sessions
where user_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from auth.refresh_tokens
where user_id in (
  select id::text from qa_evidence_payment_actor_manifest
);

delete from auth.identities
where user_id in (
  select id from qa_evidence_payment_actor_manifest
);

delete from auth.users
where id in (
  select id from qa_evidence_payment_actor_manifest
);

commit;

with residue as (
  select json_build_object(
    'agreements', (
      select count(*) from public.agreements
      where id in (
        :'qa_agreement_id'::uuid,
        :'qa_admin_fallback_agreement_id'::uuid
      )
    ),
    'versions', (
      select count(*) from public.trade_agreement_versions
      where id in (
        :'qa_agreement_version_id'::uuid,
        :'qa_admin_fallback_agreement_version_id'::uuid
      )
    ),
    'milestones', (
      select count(*) from public.trade_agreement_milestones
      where id in (
        :'qa_milestone_id'::uuid,
        :'qa_admin_fallback_milestone_id'::uuid
      )
    ),
    'bundles', (
      select count(*) from public.trade_evidence_bundles
      where id in (
        :'qa_evidence_bundle_id'::uuid,
        :'qa_admin_fallback_evidence_bundle_id'::uuid
      )
    ),
    'reviews', (
      select count(*) from public.trade_milestone_reviews
      where id in (
        :'qa_milestone_review_id'::uuid,
        :'qa_admin_fallback_milestone_review_id'::uuid
      )
    ),
    'payouts', (
      select count(*) from public.trade_milestone_payouts
      where id in (
        :'qa_payout_id'::uuid,
        :'qa_admin_fallback_payout_id'::uuid
      )
    ),
    'paymentCases', (
      select count(*) from public.trade_payment_review_cases
      where payout_id in (
        :'qa_payout_id'::uuid,
        :'qa_admin_fallback_payout_id'::uuid
      )
    ),
    'paymentReceipts', (
      select count(*) from public.trade_external_payment_receipts
      where payout_id in (
        :'qa_payout_id'::uuid,
        :'qa_admin_fallback_payout_id'::uuid
      )
    ),
    'notifications', (
      select count(*) from public.trade_notifications
      where user_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
    'events', (
      select count(*) from public.core_loop_events
      where profile_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
    'reviewRoles', (
      select count(*) from public.trade_review_role_grants
      where profile_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
    'profiles', (
      select count(*) from public.profiles
      where id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
      or email in (
        :'qa_payer_email',
        :'qa_payee_email',
        :'qa_reviewer_email',
        :'qa_appeal_reviewer_email',
        :'qa_outsider_email',
        :'qa_admin_email'
      )
    ),
    'privateAccounts', (
      select count(*) from moral_trade_private.person_accounts
      where profile_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
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
      or email in (
        :'qa_payer_email',
        :'qa_payee_email',
        :'qa_reviewer_email',
        :'qa_appeal_reviewer_email',
        :'qa_outsider_email',
        :'qa_admin_email'
      )
    ),
    'authIdentities', (
      select count(*) from auth.identities
      where user_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
    'authSessions', (
      select count(*) from auth.sessions
      where user_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
    'authRefreshTokens', (
      select count(*) from auth.refresh_tokens
      where user_id in (
        :'qa_payer_id',
        :'qa_payee_id',
        :'qa_reviewer_id',
        :'qa_appeal_reviewer_id',
        :'qa_outsider_id',
        :'qa_admin_id'
      )
    ),
    'authMfaFactors', (
      select count(*) from auth.mfa_factors
      where user_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
    ),
    'emailOutbox', (
      select count(*) from public.email_outbox
      where profile_id in (
        :'qa_payer_id'::uuid,
        :'qa_payee_id'::uuid,
        :'qa_reviewer_id'::uuid,
        :'qa_appeal_reviewer_id'::uuid,
        :'qa_outsider_id'::uuid,
        :'qa_admin_id'::uuid
      )
      or recipient_email in (
        :'qa_payer_email',
        :'qa_payee_email',
        :'qa_reviewer_email',
        :'qa_appeal_reviewer_email',
        :'qa_outsider_email',
        :'qa_admin_email'
      )
    )
  ) as body
),
result as (
  select
    body,
    not exists (
      select 1
      from json_each_text(body)
      where value::integer <> 0
    ) as all_zero
  from residue
)
select
  json_build_object(
    'status', case when all_zero then 'clean' else 'residue' end,
    'namespaceHandle', :'qa_namespace_handle',
    'namespaceSha256', :'qa_namespace_hash',
    'allZero', all_zero,
    'residue', body
  )::text as residue_json,
  case when all_zero then 'true' else 'false' end as residue_ok
from result
\gset

\echo :residue_json
\if :residue_ok
\else
  \echo 'Evidence-payment QA cleanup left namespace residue.'
  \quit 1
\endif
