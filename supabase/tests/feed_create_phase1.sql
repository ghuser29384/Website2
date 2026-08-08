begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('f1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'feed-create-viewer-a@example.test', '', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Feed Create Viewer A","qa_fixture":true}'::jsonb,
   '', '', '', '', '', '', false, false, now(), now()),
  ('f1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'feed-create-viewer-b@example.test', '', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Feed Create Viewer B","qa_fixture":true}'::jsonb,
   '', '', '', '', '', '', false, false, now(), now()),
  ('f1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'feed-create-zero@example.test', '', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Feed Create Zero","qa_fixture":true}'::jsonb,
   '', '', '', '', '', '', false, false, now(), now()),
  ('f2000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'feed-create-owner-a@example.test', '', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Feed Create Owner A","qa_fixture":true}'::jsonb,
   '', '', '', '', '', '', false, false, now(), now()),
  ('f2000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'feed-create-owner-b@example.test', '', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Feed Create Owner B","qa_fixture":true}'::jsonb,
   '', '', '', '', '', '', false, false, now(), now());

insert into public.profiles (id, email, display_name, bio)
values
  ('f1000000-0000-4000-8000-000000000001', 'feed-create-viewer-a@example.test', 'Feed Create Viewer A', ''),
  ('f1000000-0000-4000-8000-000000000002', 'feed-create-viewer-b@example.test', 'Feed Create Viewer B', ''),
  ('f1000000-0000-4000-8000-000000000003', 'feed-create-zero@example.test', 'Feed Create Zero', ''),
  ('f2000000-0000-4000-8000-000000000001', 'feed-create-owner-a@example.test', 'Feed Create Owner A', ''),
  ('f2000000-0000-4000-8000-000000000002', 'feed-create-owner-b@example.test', 'Feed Create Owner B', '');

insert into public.offers (
  id, owner_id, owner_alias, mode, offered_cause, requested_cause,
  offer_action, request_action, compromise_cause, offer_impact,
  min_counterparty_impact, verification, duration, trust_level,
  notes, discount_note, status, workflow_status, submission_key,
  fingerprint, no_trade_baseline, exit_conditions, maximum_burden,
  privacy_scope, published_at, terms_version
) values
  (
    'f3000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001',
    'Feed Create Owner A', 'pledge', 'Global poverty reduction',
    'Lower-carbon transport', 'Donate $100 to an agreed charity.',
    'Replace ten car trips with public transit.', 'Not needed', 5, 5,
    'Dated transit receipts or a contemporaneous travel log.',
    'Through August 31, 2026', 3, '', '', 'open', 'published',
    'feed-create-source-a', repeat('1', 64),
    'The owner would otherwise make the planned donation and the responder would drive.',
    'Either participant may end future obligations by notice.',
    'Only the stated donation and ten trips.', 'Participants and operator only', now(), 3
  ),
  (
    'f3000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    'Feed Create Owner B', 'pledge', 'Animal welfare',
    'AI safety research', 'Fund one animal-welfare intervention.',
    'Review an AI-governance draft for two hours.', 'Not needed', 5, 5,
    'A dated review document and receipt.', 'Within 30 days', 3, '', '',
    'open', 'published', 'feed-create-source-b', repeat('2', 64),
    'Both parties continue their current plans.',
    'Either participant may end future obligations by notice.',
    'Two review hours and the named intervention only.',
    'Participants and operator only', now(), 7
  ),
  (
    'f3000000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000001',
    'Feed Create Viewer A', 'pledge', 'Own cause', 'Own request',
    'Do my own action.', 'Request my own action.', 'Not needed', 5, 5,
    'Own evidence.', 'One month', 1, '', '', 'open', 'published',
    'feed-create-own', repeat('3', 64), 'Own baseline.', 'Own exit.',
    'Own limit.', 'Participants and operator only', now(), 1
  ),
  (
    'f3000000-0000-4000-8000-000000000004',
    'f2000000-0000-4000-8000-000000000001',
    'Feed Create Owner A', 'payment', 'Paid benefit', 'Paid request',
    'Pay $25.', 'Complete a task.', 'Not needed', 5, 5,
    'Payment evidence.', 'One week', 2, '', '', 'open', 'published',
    'feed-create-payment', repeat('4', 64), 'No payment.', 'Either may stop.',
    '$25 only.', 'Participants and operator only', now(), 1
  ),
  (
    'f3000000-0000-4000-8000-000000000005',
    'f2000000-0000-4000-8000-000000000001',
    'Feed Create Owner A', 'offset', 'Redirect benefit', 'Redirect request',
    'Redirect a donation.', 'Match a donation.', 'Not needed', 5, 5,
    'Donation receipt.', 'Seven days', 2, '', '', 'open', 'published',
    'feed-create-redirect', repeat('5', 64), 'Original donation.',
    'Either may stop.', 'Named donations only.',
    'Participants and operator only', now(), 1
  ),
  (
    'f3000000-0000-4000-8000-000000000006',
    'f2000000-0000-4000-8000-000000000001',
    'Feed Create Owner A', 'pledge', 'Incomplete benefit', 'Incomplete request',
    'Do a complete action.', 'Do another action.', 'Not needed', 5, 5,
    '', 'One week', 2, '', '', 'paused', 'draft',
    'feed-create-incomplete', repeat('6', 64), 'Baseline.', 'Exit.', 'Limit.',
    'Participants and operator only', null, 1
  );

insert into public.recommendation_exposures (
  id, profile_id, request_id, opportunity_type, opportunity_id, owner_id,
  rank, match_class, was_shown, model_key, model_mode, prediction,
  feature_snapshot, occurred_at
) values
  ('f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001',
   'f5000000-0000-4000-8000-000000000001', 'offer',
   'f3000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001',
   1, 'direct', true, 'feed-create-test', 'heuristic',
   '{"paretoSuccess":0.92}'::jsonb,
   '{"publicQuality":0.8}'::jsonb, now()),
  ('f4000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002',
   'f5000000-0000-4000-8000-000000000002', 'offer',
   'f3000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002',
   2, 'direct', true, 'feed-create-test', 'heuristic',
   '{"paretoSuccess":0.81}'::jsonb,
   '{"publicQuality":0.7}'::jsonb, now()),
  ('f4000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001',
   'f5000000-0000-4000-8000-000000000003', 'offer',
   'f3000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001',
   3, 'direct', true, 'feed-create-test', 'heuristic', '{}'::jsonb, '{}'::jsonb, now()),
  ('f4000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001',
   'f5000000-0000-4000-8000-000000000004', 'offer',
   'f3000000-0000-4000-8000-000000000004', 'f2000000-0000-4000-8000-000000000001',
   4, 'direct', true, 'feed-create-test', 'heuristic', '{}'::jsonb, '{}'::jsonb, now()),
  ('f4000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001',
   'f5000000-0000-4000-8000-000000000005', 'donation_redirect',
   'f3000000-0000-4000-8000-000000000005', 'f2000000-0000-4000-8000-000000000001',
   5, 'direct', true, 'feed-create-test', 'heuristic', '{}'::jsonb, '{}'::jsonb, now()),
  ('f4000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001',
   'f5000000-0000-4000-8000-000000000006', 'offer',
   'f3000000-0000-4000-8000-000000000006', 'f2000000-0000-4000-8000-000000000001',
   6, 'direct', true, 'feed-create-test', 'heuristic', '{}'::jsonb, '{}'::jsonb, now());

do $test$
declare
  review_receipts jsonb := '{
    "counterparty":true,
    "offered_cause":true,
    "requested_cause":true,
    "proposed_action":true,
    "requested_action":true,
    "duration":true,
    "evidence_rule":true
  }'::jsonb;
  result_a record;
  replay_a record;
  result_b record;
  duplicate_a record;
  shown_a uuid;
  opened_a uuid;
  failure_observed boolean;
begin
  shown_a := public.moral_trade_feed_create_record_event_service(
    'f1000000-0000-4000-8000-000000000001', 'action_shown', 'offer',
    'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001', 3, null, null
  );
  opened_a := public.moral_trade_feed_create_record_event_service(
    'f1000000-0000-4000-8000-000000000001', 'create_opened', 'offer',
    'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001', 3, null, null
  );
  if shown_a is null or opened_a is null or shown_a = opened_a then
    raise exception 'Privacy-minimal shown/opened events were not written separately.';
  end if;

  select * into result_a
  from public.moral_trade_feed_create_save_service(
    'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-draft-a',
    'offer', 'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001', 3,
    review_receipts, false,
    'Lower-carbon transport', 'Global poverty reduction',
    'Replace ten car trips with public transit.',
    'Donate $80 to an agreed evidence-backed charity.',
    'Without this trade I would drive and the owner would make the original planned donation.',
    'Through August 31, 2026', current_date + 1, current_date + 35,
    'Dated transit receipts and a donation receipt.',
    'Ten trips and an $80 donation only.', 'Participants and operator only.',
    'Either participant may end future obligations by notice.', 'A private counteroffer.'
  );

  if result_a.derived_offer_id is null or result_a.workflow_status <> 'draft' then
    raise exception 'Viewer A did not receive a durable private source-bound draft: %', result_a;
  end if;

  select * into replay_a
  from public.moral_trade_feed_create_save_service(
    'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-draft-a',
    'offer', 'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001', 3,
    review_receipts, false,
    'Lower-carbon transport', 'Global poverty reduction',
    'Replace ten car trips with public transit.',
    'Donate $80 to an agreed evidence-backed charity.',
    'Without this trade I would drive and the owner would make the original planned donation.',
    'Through August 31, 2026', current_date + 1, current_date + 35,
    'Dated transit receipts and a donation receipt.',
    'Ten trips and an $80 donation only.', 'Participants and operator only.',
    'Either participant may end future obligations by notice.', 'A private counteroffer.'
  );
  if replay_a.derived_offer_id <> result_a.derived_offer_id or replay_a.link_id <> result_a.link_id then
    raise exception 'Idempotent replay returned a different source-bound record.';
  end if;

  select * into result_b
  from public.moral_trade_feed_create_save_service(
    'f1000000-0000-4000-8000-000000000002', 'submit', 'feed-create-draft-b',
    'offer', 'f3000000-0000-4000-8000-000000000002',
    'f5000000-0000-4000-8000-000000000002', 7,
    review_receipts, false,
    'AI safety research', 'Animal welfare',
    'Review an AI-governance draft for two hours.',
    'Fund one independently reviewed animal-welfare intervention.',
    'Without a trade each party continues its current plan.',
    'Within 30 days', current_date + 2, current_date + 32,
    'A dated review document and receipt.',
    'Two review hours and the named intervention only.',
    'Participants and operator only.',
    'Either participant may end future obligations by notice.', 'Viewer B counteroffer.'
  );

  if result_b.derived_offer_id is null or result_b.workflow_status <> 'pending_review' then
    raise exception 'Viewer B did not receive a distinct pending-review source-bound draft: %', result_b;
  end if;
  if result_b.derived_offer_id = result_a.derived_offer_id then
    raise exception 'The two authenticated viewers received the same derived offer.';
  end if;

  if not exists (
    select 1 from public.moral_trade_feed_create_links
    where derived_offer_id = result_a.derived_offer_id
      and creator_profile_id = 'f1000000-0000-4000-8000-000000000001'
      and source_offer_id = 'f3000000-0000-4000-8000-000000000001'
      and counterparty_profile_id = 'f2000000-0000-4000-8000-000000000001'
      and exposure_request_id = 'f5000000-0000-4000-8000-000000000001'
      and source_terms_version = 3
      and source_snapshot_json ->> 'ownerAlias' = 'Feed Create Owner A'
      and not (source_snapshot_json ?| array[
        'matchScore', 'matchPercent', 'matchReason', 'reasonDetails',
        'privatePreferenceVector', 'paymentMethod'
      ])
  ) then
    raise exception 'Viewer A provenance, counterparty, receipt, revision, or privacy boundary was not persisted.';
  end if;

  if not exists (
    select 1 from public.moral_trade_feed_create_events
    where profile_id = 'f1000000-0000-4000-8000-000000000001'
      and event_type = 'draft_saved'
      and derived_offer_id = result_a.derived_offer_id
      and exposure_request_id = 'f5000000-0000-4000-8000-000000000001'
  ) or not exists (
    select 1 from public.moral_trade_feed_create_events
    where profile_id = 'f1000000-0000-4000-8000-000000000002'
      and event_type = 'proposal_submitted'
      and derived_offer_id = result_b.derived_offer_id
      and exposure_request_id = 'f5000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Receipt-bound draft/submission funnel events were not recorded.';
  end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_save_service(
      'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-duplicate-no-ack',
      'offer', 'f3000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001', 3,
      review_receipts, false,
      'Lower-carbon transport', 'Global poverty reduction',
      'Use transit for eight trips.', 'Donate $70.', 'No-trade baseline.', 'One month',
      null, null, 'Receipts.', 'Eight trips and $70.', 'Private.', 'Either may stop.', ''
    );
  exception when check_violation then
    failure_observed := true;
  end;
  if not failure_observed then
    raise exception 'A duplicate source-bound draft was created without acknowledgement.';
  end if;

  select * into duplicate_a
  from public.moral_trade_feed_create_save_service(
    'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-duplicate-ack',
    'offer', 'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001', 3,
    review_receipts, true,
    'Lower-carbon transport', 'Global poverty reduction',
    'Use transit for eight trips.', 'Donate $70.', 'No-trade baseline.', 'One month',
    null, null, 'Receipts.', 'Eight trips and $70.', 'Private.', 'Either may stop.', ''
  );
  if duplicate_a.derived_offer_id is null or not exists (
    select 1 from public.moral_trade_feed_create_links
    where derived_offer_id = duplicate_a.derived_offer_id and duplicate_acknowledged = true
  ) then
    raise exception 'Acknowledged duplicate was not recorded explicitly.';
  end if;

  -- Zero-data, spoofed-receipt, own-item, payment, redirect, pool, incomplete,
  -- and stale-source calls all fail closed at the database boundary.
  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_save_service(
      'f1000000-0000-4000-8000-000000000003', 'draft', 'feed-create-zero',
      'offer', 'f3000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001', 3, review_receipts, false,
      'A', 'B', 'C', 'D', 'E', 'F', null, null, 'G', 'H', 'I', 'J', ''
    );
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Zero-data user bypassed the exposure receipt guard.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_record_event_service(
      'f1000000-0000-4000-8000-000000000001', 'action_clicked', 'offer',
      'f3000000-0000-4000-8000-000000000002',
      'f5000000-0000-4000-8000-000000000002', 7, null, null
    );
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Viewer A reused Viewer B''s exposure receipt.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_save_service(
      'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-own',
      'offer', 'f3000000-0000-4000-8000-000000000003',
      'f5000000-0000-4000-8000-000000000003', 1, review_receipts, false,
      'A', 'B', 'C', 'D', 'E', 'F', null, null, 'G', 'H', 'I', 'J', ''
    );
  exception when check_violation then failure_observed := true;
  end;
  if not failure_observed then raise exception 'A viewer created a counteroffer from their own item.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_save_service(
      'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-payment',
      'offer', 'f3000000-0000-4000-8000-000000000004',
      'f5000000-0000-4000-8000-000000000004', 1, review_receipts, false,
      'A', 'B', 'C', 'D', 'E', 'F', null, null, 'G', 'H', 'I', 'J', ''
    );
  exception when check_violation then failure_observed := true;
  end;
  if not failure_observed then raise exception 'A payment opportunity entered the nonfinancial Phase-1 path.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_record_event_service(
      'f1000000-0000-4000-8000-000000000001', 'action_shown', 'donation_redirect',
      'f3000000-0000-4000-8000-000000000005',
      'f5000000-0000-4000-8000-000000000005', 1, null, null
    );
  exception when invalid_parameter_value then failure_observed := true;
  end;
  if not failure_observed then raise exception 'A donation redirect entered Feed-to-Create Phase 1.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_record_event_service(
      'f1000000-0000-4000-8000-000000000001', 'action_shown', 'donation_pool',
      'f3000000-0000-4000-8000-000000000005',
      'f5000000-0000-4000-8000-000000000005', 1, null, null
    );
  exception when invalid_parameter_value then failure_observed := true;
  end;
  if not failure_observed then raise exception 'A donation pool entered Feed-to-Create Phase 1.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_save_service(
      'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-incomplete',
      'offer', 'f3000000-0000-4000-8000-000000000006',
      'f5000000-0000-4000-8000-000000000006', 1, review_receipts, false,
      'A', 'B', 'C', 'D', 'E', 'F', null, null, 'G', 'H', 'I', 'J', ''
    );
  exception when check_violation then failure_observed := true;
  end;
  if not failure_observed then raise exception 'An incomplete unpublished source entered Feed-to-Create Phase 1.'; end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_save_service(
      'f1000000-0000-4000-8000-000000000001', 'draft', 'feed-create-stale',
      'offer', 'f3000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001', 2, review_receipts, true,
      'A', 'B', 'C', 'D', 'E', 'F', null, null, 'G', 'H', 'I', 'J', ''
    );
  exception when check_violation then failure_observed := true;
  end;
  if not failure_observed then raise exception 'A stale source revision was accepted.'; end if;

  -- Every delivery and agreement surface is denied before its row exists.
  failure_observed := false;
  begin
    update public.offers
    set workflow_status = 'published', status = 'open', published_at = now()
    where id = result_a.derived_offer_id;
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Source-bound offer publication was not denied.'; end if;

  failure_observed := false;
  begin
    insert into public.trade_invitations (offer_id, sender_id, recipient_user_id, token)
    values (result_a.derived_offer_id, 'f1000000-0000-4000-8000-000000000001',
            'f2000000-0000-4000-8000-000000000001', 'feed-create-invite-denied');
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Source-bound invitation was not denied.'; end if;

  failure_observed := false;
  begin
    insert into public.trade_threads (offer_id, participant_a, participant_b)
    values (result_a.derived_offer_id, 'f1000000-0000-4000-8000-000000000001',
            'f2000000-0000-4000-8000-000000000001');
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Source-bound thread was not denied.'; end if;

  failure_observed := false;
  begin
    insert into public.interests (offer_id, user_id, interested_alias)
    values (result_a.derived_offer_id, 'f2000000-0000-4000-8000-000000000001', 'Owner A');
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Source-bound authenticated response was not denied.'; end if;

  failure_observed := false;
  begin
    insert into public.guest_interests (offer_id, contact_email, display_name)
    values (result_a.derived_offer_id, 'feed-create-guest@example.test', 'Guest');
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Source-bound guest response was not denied.'; end if;

  failure_observed := false;
  begin
    insert into public.agreements (offer_id, proposer_id, responder_id)
    values (result_a.derived_offer_id, 'f1000000-0000-4000-8000-000000000001',
            'f2000000-0000-4000-8000-000000000001');
  exception when insufficient_privilege then failure_observed := true;
  end;
  if not failure_observed then raise exception 'Source-bound agreement was not denied.'; end if;

  if exists (select 1 from public.trade_invitations where offer_id = result_a.derived_offer_id)
     or exists (select 1 from public.trade_threads where offer_id = result_a.derived_offer_id)
     or exists (select 1 from public.interests where offer_id = result_a.derived_offer_id)
     or exists (select 1 from public.guest_interests where offer_id = result_a.derived_offer_id)
     or exists (select 1 from public.agreements where offer_id = result_a.derived_offer_id) then
    raise exception 'A forbidden Phase-1 delivery or agreement row remained after denial.';
  end if;

  update public.offers set terms_version = 4 where id = 'f3000000-0000-4000-8000-000000000001';
  failure_observed := false;
  begin
    update public.offers
    set workflow_status = 'pending_review', updated_at = now()
    where id = result_a.derived_offer_id;
  exception when check_violation then failure_observed := true;
  end;
  if not failure_observed then raise exception 'A stale source-bound draft was resubmitted.'; end if;
end;
$test$;

-- Authenticated reads are owner-scoped and direct client writes remain denied.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $rls$
declare
  failure_observed boolean := false;
  authenticated_event uuid;
  authenticated_result record;
  review_receipts jsonb := '{
    "counterparty":true,
    "offered_cause":true,
    "requested_cause":true,
    "proposed_action":true,
    "requested_action":true,
    "duration":true,
    "evidence_rule":true
  }'::jsonb;
begin
  if (select count(*) from public.moral_trade_feed_create_links) <> 2 then
    raise exception 'Viewer A did not see exactly their two source-bound links through RLS.';
  end if;
  if exists (
    select 1 from public.moral_trade_feed_create_links
    where creator_profile_id <> 'f1000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Viewer A could read another user''s source-bound link.';
  end if;
  if not exists (select 1 from public.moral_trade_feed_create_events)
     or exists (
       select 1 from public.moral_trade_feed_create_events
       where profile_id <> 'f1000000-0000-4000-8000-000000000001'
     ) then
    raise exception 'Viewer A event visibility crossed the owner-scoped RLS boundary.';
  end if;

  begin
    insert into public.moral_trade_feed_create_events (
      profile_id, source_exposure_id, source_opportunity_type,
      source_opportunity_id, exposure_request_id, event_type,
      idempotency_key
    ) values (
      'f1000000-0000-4000-8000-000000000001',
      'f4000000-0000-4000-8000-000000000001',
      'offer', 'f3000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001',
      'action_clicked', 'client-write-must-fail'
    );
  exception when insufficient_privilege then
    failure_observed := true;
  end;
  if not failure_observed then
    raise exception 'An authenticated client wrote a Feed-to-Create event directly.';
  end if;

  authenticated_event := public.moral_trade_feed_create_record_event_authenticated(
    'f1000000-0000-4000-8000-000000000001',
    'action_clicked',
    'offer',
    'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001',
    4,
    null,
    null
  );
  if authenticated_event is null then
    raise exception 'The authenticated event wrapper did not record the viewer-owned receipt.';
  end if;

  failure_observed := false;
  begin
    perform public.moral_trade_feed_create_record_event_authenticated(
      'f1000000-0000-4000-8000-000000000002',
      'action_clicked',
      'offer',
      'f3000000-0000-4000-8000-000000000002',
      'f5000000-0000-4000-8000-000000000002',
      7,
      null,
      null
    );
  exception when insufficient_privilege then
    failure_observed := true;
  end;
  if not failure_observed then
    raise exception 'The authenticated wrapper accepted a spoofed expected actor.';
  end if;

  select * into authenticated_result
  from public.moral_trade_feed_create_save_authenticated(
    'f1000000-0000-4000-8000-000000000001',
    'draft',
    'feed-create-authenticated-runtime',
    'offer',
    'f3000000-0000-4000-8000-000000000001',
    'f5000000-0000-4000-8000-000000000001',
    4,
    review_receipts,
    true,
    'Lower-carbon transport',
    'Global poverty reduction',
    'Replace six car trips with public transit.',
    'Donate $60 to an agreed evidence-backed charity.',
    'Without this trade, both participants continue their recorded plans.',
    'Within 30 days',
    current_date + 1,
    current_date + 35,
    'Dated transit receipts and a donation receipt.',
    'Six trips and a $60 donation only.',
    'Participants and operator only.',
    'Either participant may end future obligations by notice.',
    'Authenticated runtime wrapper regression.'
  );
  if authenticated_result.derived_offer_id is null or not exists (
    select 1
    from public.moral_trade_feed_create_links
    where derived_offer_id = authenticated_result.derived_offer_id
      and creator_profile_id = 'f1000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'The authenticated save wrapper did not create an owner-bound private draft.';
  end if;
end;
$rls$;

reset role;

set local role anon;
do $anon$
declare
  denied boolean := false;
begin
  begin
    perform public.moral_trade_feed_create_record_event_authenticated(
      'f1000000-0000-4000-8000-000000000001',
      'action_clicked',
      'offer',
      'f3000000-0000-4000-8000-000000000001',
      'f5000000-0000-4000-8000-000000000001',
      4,
      null,
      null
    );
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'The anonymous role could execute the authenticated Feed-to-Create wrapper.';
  end if;
end;
$anon$;
reset role;

rollback;
