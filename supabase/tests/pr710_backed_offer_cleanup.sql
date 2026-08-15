\set ON_ERROR_STOP on

-- Idempotent cleanup for the exact deterministic fixture IDs shared with the
-- isolated evaluator QA lane. Dependency-sensitive rows are removed in the
-- same order as PR #687 before authentication and profile rows are deleted.

begin;

delete from public.email_outbox
where profile_id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000005'
)
or recipient_email like 'evaluator-core-loop-%@qa.invalid';

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
where user_id::text like '81000000-0000-4000-8000-%';

delete from auth.mfa_factors
where user_id::text like '81000000-0000-4000-8000-%';

delete from auth.sessions
where user_id::text like '81000000-0000-4000-8000-%';

delete from auth.refresh_tokens
where user_id::text like '81000000-0000-4000-8000-%';

delete from auth.identities
where user_id::text like '81000000-0000-4000-8000-%';

delete from moral_trade_private.person_accounts
where profile_id::text like '81000000-0000-4000-8000-%';

delete from public.profiles
where id::text like '81000000-0000-4000-8000-%';

delete from auth.users
where id::text like '81000000-0000-4000-8000-%';

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
  'offerCarts', (
    select count(*) from public.offer_carts
    where offer_id = '82000000-0000-4000-8000-000000000001'
  ),
  'offerComments', (
    select count(*) from public.offer_comments
    where offer_id = '82000000-0000-4000-8000-000000000001'
  ),
  'offerRecommendations', (
    select count(*) from public.offer_recommendations
    where source_offer_id = '82000000-0000-4000-8000-000000000001'
       or recommended_offer_id = '82000000-0000-4000-8000-000000000001'
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
