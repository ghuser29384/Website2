\set ON_ERROR_STOP on
\getenv namespace_handle EVIDENCE_PAYMENT_QA_NAMESPACE_HANDLE
\getenv owner_id EVIDENCE_PAYMENT_QA_PAYER_ID
\getenv responder_id EVIDENCE_PAYMENT_QA_PAYEE_ID
\getenv reviewer_id EVIDENCE_PAYMENT_QA_REVIEWER_ID
\getenv appeal_reviewer_id EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID
\getenv outsider_id EVIDENCE_PAYMENT_QA_OUTSIDER_ID
\getenv admin_id EVIDENCE_PAYMENT_QA_ADMIN_ID
\getenv offer_id EVIDENCE_PAYMENT_QA_OFFER_ID

-- Read-only preflight. It must never repair, thaw, update, or delete state.
-- A nonzero result means a prior run failed to clean its exact namespace and
-- this run must stop before creating any fixture.
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
  )
) as residue;
