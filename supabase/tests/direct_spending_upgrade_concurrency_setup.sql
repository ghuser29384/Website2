insert into public.profiles (id, email, display_name)
values
  ('f0100000-0000-4000-8000-000000000001', 'concurrency-creator@example.test', 'Concurrency Creator'),
  ('f0200000-0000-4000-8000-000000000002', 'concurrency-matcher-a@example.test', 'Concurrency Matcher A'),
  ('f0300000-0000-4000-8000-000000000003', 'concurrency-matcher-b@example.test', 'Concurrency Matcher B')
on conflict (id) do nothing;

do $setup$
declare
  recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'qa-givewell-top-charities-fund',
    'name', 'GiveWell Top Charities Fund',
    'primarySlug', 'givewell-top-charities-fund',
    'ein', '',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/givewell-top-charities-fund',
    'websiteUrl', 'https://www.givewell.org/top-charities-fund',
    'locationAddress', 'United States',
    'description', 'Disposable concurrency fixture.',
    'logoUrl', '',
    'identityHash', repeat('2', 64)
  );
  captured_at timestamptz := timezone('utc', now());
  deadline_at timestamptz := timezone('utc', now()) + interval '7 days';
  evidence_payload jsonb := jsonb_build_object(
    'recordKind', 'prospective_nonessential_expense',
    'privateReference', 'disposable-concurrency-fixture'
  );
  evidence_hash text;
  terms_hash text;
begin
  evidence_hash := public.direct_spending_upgrade_evidence_hash_v1(
    evidence_payload,
    captured_at
  );

  insert into public.direct_spending_upgrade_baselines(
    id, creator_profile_id, schema_version, category,
    private_merchant_label, private_description,
    planned_spend_amount_cents, planned_action,
    evidence_schema_version, evidence_payload, evidence_hash,
    evidence_captured_at, baseline_fingerprint,
    safety_attestation_version, consent_version,
    nonessential_attested, no_material_harm_attested,
    preexisting_plan_attested, not_already_cancelled_attested,
    available_funds_attested, not_otherwise_donating_attested,
    review_status
  ) values
  (
    'f1100000-0000-4000-8000-000000000011',
    'f0100000-0000-4000-8000-000000000001',
    'direct-spending-upgrade-baseline-v1-2026-08-14',
    'pending_order_or_upgrade', 'Private fixture',
    'Disposable exact-match concurrency fixture for an optional pending order.',
    2000, 'cancel',
    'direct-spending-upgrade-private-evidence-v1-2026-08-14',
    evidence_payload, evidence_hash, captured_at, repeat('d', 64),
    'direct-spending-upgrade-safety-v1-2026-08-14',
    'direct-spending-upgrade-consent-v1-2026-08-14',
    true, true, true, true, true, true, 'accepted'
  ),
  (
    'f2100000-0000-4000-8000-000000000021',
    'f0100000-0000-4000-8000-000000000001',
    'direct-spending-upgrade-baseline-v1-2026-08-14',
    'pending_order_or_upgrade', 'Private fixture',
    'Disposable proposal concurrency fixture for an optional pending upgrade.',
    3000, 'cancel',
    'direct-spending-upgrade-private-evidence-v1-2026-08-14',
    evidence_payload, evidence_hash, captured_at, repeat('e', 64),
    'direct-spending-upgrade-safety-v1-2026-08-14',
    'direct-spending-upgrade-consent-v1-2026-08-14',
    true, true, true, true, true, true, 'accepted'
  );

  terms_hash := public.direct_spending_upgrade_terms_hash_v1(
    'f0100000-0000-4000-8000-000000000001',
    'pending_order_or_upgrade', 'cancel', 2000, 1500, 1000,
    repeat('2', 64), deadline_at, 'public', 'staging', evidence_hash,
    captured_at, repeat('d', 64)
  );
  insert into public.direct_spending_upgrade_offers(
    id, baseline_id, creator_profile_id, environment, status,
    privacy_mode, creator_diversion_amount_cents,
    retained_spending_amount_cents, diversion_basis_points,
    matcher_amount_cents, match_deadline_at, upgraded_recipient,
    upgraded_recipient_hash, terms_hash
  ) values (
    'f1200000-0000-4000-8000-000000000012',
    'f1100000-0000-4000-8000-000000000011',
    'f0100000-0000-4000-8000-000000000001',
    'staging', 'open', 'public', 1500, 500,
    public.direct_spending_upgrade_diversion_basis_points(2000, 1500),
    1000, deadline_at, recipient, repeat('2', 64), terms_hash
  );

  terms_hash := public.direct_spending_upgrade_terms_hash_v1(
    'f0100000-0000-4000-8000-000000000001',
    'pending_order_or_upgrade', 'cancel', 3000, 2000, 1200,
    repeat('2', 64), deadline_at, 'public', 'staging', evidence_hash,
    captured_at, repeat('e', 64)
  );
  insert into public.direct_spending_upgrade_offers(
    id, baseline_id, creator_profile_id, environment, status,
    privacy_mode, creator_diversion_amount_cents,
    retained_spending_amount_cents, diversion_basis_points,
    matcher_amount_cents, match_deadline_at, upgraded_recipient,
    upgraded_recipient_hash, terms_hash
  ) values (
    'f2200000-0000-4000-8000-000000000022',
    'f2100000-0000-4000-8000-000000000021',
    'f0100000-0000-4000-8000-000000000001',
    'staging', 'open', 'public', 2000, 1000,
    public.direct_spending_upgrade_diversion_basis_points(3000, 2000),
    1200, deadline_at, recipient, repeat('2', 64), terms_hash
  );

  insert into public.direct_spending_upgrade_proposals(
    id, offer_id, proposer_profile_id, base_terms_hash,
    proposed_creator_diversion_amount_cents,
    proposed_diversion_basis_points, proposed_matcher_amount_cents,
    message, commitment_version
  ) values
  (
    'f2300000-0000-4000-8000-000000000023',
    'f2200000-0000-4000-8000-000000000022',
    'f0200000-0000-4000-8000-000000000002', terms_hash,
    2400, public.direct_spending_upgrade_diversion_basis_points(3000, 2400),
    1400, 'Disposable proposal A',
    'direct-spending-upgrade-proposal-v1-2026-08-14'
  ),
  (
    'f2400000-0000-4000-8000-000000000024',
    'f2200000-0000-4000-8000-000000000022',
    'f0300000-0000-4000-8000-000000000003', terms_hash,
    2500, public.direct_spending_upgrade_diversion_basis_points(3000, 2500),
    1500, 'Disposable proposal B',
    'direct-spending-upgrade-proposal-v1-2026-08-14'
  );
end;
$setup$;

create or replace function public.direct_spending_upgrade_accept_fixture_proposal(
  p_proposal_id uuid
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $fixture$
declare
  proposal_row public.direct_spending_upgrade_proposals%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  terms_hash text;
begin
  select * into proposal_row
  from public.direct_spending_upgrade_proposals
  where id = p_proposal_id;
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = proposal_row.offer_id;
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = offer_row.baseline_id;
  terms_hash := public.direct_spending_upgrade_terms_hash_v1(
    offer_row.creator_profile_id,
    baseline_row.category,
    baseline_row.planned_action,
    baseline_row.planned_spend_amount_cents,
    proposal_row.proposed_creator_diversion_amount_cents,
    proposal_row.proposed_matcher_amount_cents,
    offer_row.upgraded_recipient_hash,
    offer_row.match_deadline_at,
    offer_row.privacy_mode,
    offer_row.environment,
    baseline_row.evidence_hash,
    baseline_row.evidence_captured_at,
    baseline_row.baseline_fingerprint
  );
  return public.accept_direct_spending_upgrade_proposal(
    offer_row.creator_profile_id,
    proposal_row.id,
    terms_hash,
    offer_row.environment
  );
end;
$fixture$;
