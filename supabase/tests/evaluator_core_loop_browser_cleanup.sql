\set ON_ERROR_STOP on
\getenv namespace_handle EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE
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

-- Remove only this run's exact namespace. This is intentionally idempotent.
begin;

delete from public.email_outbox
where profile_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
)
or recipient_email in (
  :'owner_email',
  :'responder_email',
  :'reviewer_email',
  :'appeal_reviewer_email',
  :'outsider_email',
  :'admin_email'
);

-- Preserve production immutability triggers. Thaw only the exact run-owned
-- graph immediately before dependency-ordered deletion.
delete from public.trade_agreement_confirmations confirmation
using public.trade_agreement_versions version, public.agreements agreement
where confirmation.agreement_version_id = version.id
  and version.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid;

update public.trade_agreement_versions version
set milestone_manifest_hash = null
from public.agreements agreement
where version.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid
  and version.milestone_manifest_hash is not null;

update public.trade_evidence_bundles bundle
set status = 'draft'
from public.trade_agreement_milestones milestone, public.agreements agreement
where bundle.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid
  and bundle.status <> 'draft';

delete from public.trade_milestone_payouts payout
using public.trade_agreement_milestones milestone, public.agreements agreement
where payout.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid;

delete from public.trade_milestone_appeals appeal
using public.trade_agreement_milestones milestone, public.agreements agreement
where appeal.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid;

delete from public.trade_milestone_reviews review
using public.trade_agreement_milestones milestone, public.agreements agreement
where review.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid;

delete from public.trade_evidence_bundle_items item
using public.trade_evidence_bundles bundle,
      public.trade_agreement_milestones milestone,
      public.agreements agreement
where item.bundle_id = bundle.id
  and bundle.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid;

delete from public.trade_evidence_bundles bundle
using public.trade_agreement_milestones milestone, public.agreements agreement
where bundle.milestone_id = milestone.id
  and milestone.agreement_id = agreement.id
  and agreement.offer_id = :'offer_id'::uuid;

-- The exact offer owns its response, thread, agreement, version, milestone,
-- evidence, review, payout, and exit graph through foreign-key cascades.
delete from public.offers where id = :'offer_id'::uuid;

delete from public.trade_notifications
where user_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from public.core_loop_events
where profile_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from public.trade_review_role_grants
where profile_id in (
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'admin_id'::uuid
);

delete from auth.mfa_factors
where user_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from auth.sessions
where user_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from auth.refresh_tokens
where user_id::uuid in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from auth.identities
where user_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from moral_trade_private.person_accounts
where profile_id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from public.profiles
where id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

delete from auth.users
where id in (
  :'owner_id'::uuid,
  :'responder_id'::uuid,
  :'reviewer_id'::uuid,
  :'appeal_reviewer_id'::uuid,
  :'outsider_id'::uuid,
  :'admin_id'::uuid
);

commit;

select json_build_object(
  'namespaceHandle', :'namespace_handle',
  'offers', (
    select count(*) from public.offers where id = :'offer_id'::uuid
  ),
  'interests', (
    select count(*) from public.interests where offer_id = :'offer_id'::uuid
  ),
  'agreements', (
    select count(*) from public.agreements where offer_id = :'offer_id'::uuid
  ),
  'threads', (
    select count(*) from public.trade_threads where offer_id = :'offer_id'::uuid
  ),
  'notifications', (
    select count(*) from public.trade_notifications
    where user_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'events', (
    select count(*) from public.core_loop_events
    where profile_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'reviewRoles', (
    select count(*) from public.trade_review_role_grants
    where profile_id in (
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'profiles', (
    select count(*) from public.profiles
    where id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'authUsers', (
    select count(*) from auth.users
    where id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'authIdentities', (
    select count(*) from auth.identities
    where user_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'authSessions', (
    select count(*) from auth.sessions
    where user_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'authRefreshTokens', (
    select count(*) from auth.refresh_tokens
    where user_id::uuid in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'authMfaFactors', (
    select count(*) from auth.mfa_factors
    where user_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'privateAccounts', (
    select count(*) from moral_trade_private.person_accounts
    where profile_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'emailOutbox', (
    select count(*) from public.email_outbox
    where profile_id in (
      :'owner_id'::uuid,
      :'responder_id'::uuid,
      :'reviewer_id'::uuid,
      :'appeal_reviewer_id'::uuid,
      :'outsider_id'::uuid,
      :'admin_id'::uuid
    )
  ),
  'performanceBonds', (
    select count(*) from public.performance_bonds where offer_id = :'offer_id'::uuid
  ),
  'externalPaymentReceipts', (
    select count(*)
    from public.trade_external_payment_receipts receipt
    join public.trade_milestone_payouts payout on payout.id = receipt.payout_id
    join public.trade_agreement_milestones milestone on milestone.id = payout.milestone_id
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where agreement.offer_id = :'offer_id'::uuid
  )
) as residue;
