begin;

create or replace function public.mpgf_public_dac_campaign_terms(
  p_campaign_id_or_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  identifier_value text := btrim(coalesce(p_campaign_id_or_slug, ''));
  campaign_row record;
  proposal_terms_json jsonb;
  proposal_json jsonb;
  create_pool_terms_json jsonb;
  threshold_schedule_json jsonb;
  eligibility_policy_json jsonb;
  success_premium_pricing_json jsonb;
  threshold_amount_value bigint;
  threshold_supporters_value integer;
  deadline_value timestamptz;
  failure_bonus_rate_value integer;
  failure_bonus_max_participants_value integer;
  failure_bonus_max_per_participant_value bigint;
  success_premium_rate_value integer;
  success_premium_amount_value bigint;
  gross_success_requirement_value bigint;
begin
  if identifier_value = '' then
    return null;
  end if;

  select
    campaign.id,
    campaign.slug,
    campaign.pool_proposal_id,
    campaign.published_terms_version,
    campaign.published_terms_sha256,
    campaign.threshold_amount_cents,
    campaign.threshold_supporters,
    campaign.deadline_at,
    campaign.review_status
  into campaign_row
  from public.mpgf_public_goods_campaigns as campaign
  where (campaign.id = identifier_value or campaign.slug = identifier_value)
    and campaign.pool_proposal_id is not null
    and campaign.published_terms_version is not null
    and campaign.published_terms_sha256 is not null
    and campaign.published_at is not null
    and campaign.review_status in ('approved', 'finalized')
  order by (campaign.id = identifier_value) desc
  limit 1;

  if campaign_row.id is null then
    return null;
  end if;

  select
    version.proposal_terms_json,
    version.create_pool_terms_json
  into
    proposal_terms_json,
    create_pool_terms_json
  from public.mpgf_pool_proposal_versions as version
  where version.proposal_id = campaign_row.pool_proposal_id
    and version.terms_version = campaign_row.published_terms_version
    and version.terms_sha256 = campaign_row.published_terms_sha256;

  if proposal_terms_json is null
     or jsonb_typeof(proposal_terms_json) <> 'object' then
    return null;
  end if;

  proposal_json := proposal_terms_json;
  threshold_schedule_json := proposal_json -> 'public_goods_threshold_schedule_json';
  eligibility_policy_json := proposal_json -> 'public_goods_failure_bonus_eligibility_json';
  success_premium_pricing_json := proposal_json -> 'public_goods_success_premium_pricing_json';

  -- Fail closed before casting or publishing any derived approval claim. The
  -- immutable proposal snapshot deliberately omits mutable review-state fields;
  -- an approved/finalized campaign plus a non-provisional frozen schedule is the
  -- public evidence that the exact published schedule completed review.
  if jsonb_typeof(proposal_json -> 'public_goods_threshold_amount_cents') is distinct from 'number'
     or jsonb_typeof(proposal_json -> 'public_goods_threshold_supporters') is distinct from 'number'
     or jsonb_typeof(proposal_json -> 'public_goods_deadline_at') is distinct from 'string'
     or proposal_json ->> 'public_goods_failure_bonus_enabled' is distinct from 'true'
     or jsonb_typeof(proposal_json -> 'public_goods_failure_bonus_rate_bps') is distinct from 'number'
     or jsonb_typeof(eligibility_policy_json) is distinct from 'object'
     or jsonb_typeof(proposal_json -> 'public_goods_failure_bonus_max_participants') is distinct from 'number'
     or jsonb_typeof(proposal_json -> 'public_goods_failure_bonus_max_per_participant_cents') is distinct from 'number'
     or jsonb_typeof(threshold_schedule_json) is distinct from 'object'
     or jsonb_typeof(threshold_schedule_json -> 'thresholds') is distinct from 'array'
     or jsonb_array_length(threshold_schedule_json -> 'thresholds') < 1
     or exists (
       select 1
       from jsonb_array_elements(threshold_schedule_json -> 'thresholds') as threshold_item(value)
       where threshold_item.value ->> 'provisional' is distinct from 'false'
     )
     or jsonb_typeof(proposal_json -> 'public_goods_success_premium_rate_bps') is distinct from 'number'
     or jsonb_typeof(proposal_json -> 'public_goods_success_premium_cents') is distinct from 'number'
     or proposal_json ->> 'public_goods_success_premium_payer' is distinct from 'pool_creator_or_sponsor'
     or proposal_json ->> 'public_goods_success_premium_included_in_net_threshold' is distinct from 'false'
     or proposal_json ->> 'public_goods_success_premium_provisional' is distinct from 'false'
     or jsonb_typeof(proposal_json -> 'public_goods_gross_success_requirement_cents') is distinct from 'number'
     or jsonb_typeof(success_premium_pricing_json) is distinct from 'object'
     or proposal_json ->> 'public_goods_payout_method' is distinct from 'signed_intent'
     or (create_pool_terms_json is not null and jsonb_typeof(create_pool_terms_json) is distinct from 'object') then
    return null;
  end if;

  threshold_amount_value := (proposal_json ->> 'public_goods_threshold_amount_cents')::bigint;
  threshold_supporters_value := (proposal_json ->> 'public_goods_threshold_supporters')::integer;
  deadline_value := (proposal_json ->> 'public_goods_deadline_at')::timestamptz;
  failure_bonus_rate_value := (proposal_json ->> 'public_goods_failure_bonus_rate_bps')::integer;
  failure_bonus_max_participants_value :=
    (proposal_json ->> 'public_goods_failure_bonus_max_participants')::integer;
  failure_bonus_max_per_participant_value :=
    (proposal_json ->> 'public_goods_failure_bonus_max_per_participant_cents')::bigint;
  success_premium_rate_value := (proposal_json ->> 'public_goods_success_premium_rate_bps')::integer;
  success_premium_amount_value := (proposal_json ->> 'public_goods_success_premium_cents')::bigint;
  gross_success_requirement_value :=
    (proposal_json ->> 'public_goods_gross_success_requirement_cents')::bigint;

  if threshold_amount_value <= 0
     or threshold_supporters_value <= 0
     or failure_bonus_rate_value < 1
     or failure_bonus_rate_value > 10000
     or failure_bonus_max_participants_value <= 0
     or failure_bonus_max_per_participant_value <= 0
     or success_premium_rate_value < 1
     or success_premium_amount_value <= 0
     or gross_success_requirement_value is distinct from
        threshold_amount_value + success_premium_amount_value
     or threshold_amount_value is distinct from campaign_row.threshold_amount_cents
     or threshold_supporters_value is distinct from campaign_row.threshold_supporters
     or deadline_value is distinct from campaign_row.deadline_at then
    return null;
  end if;

  return jsonb_build_object(
    'schemaVersion', 'mpgf_dac_public_terms_v1',
    'mechanism', 'dominant_assurance_contract',
    'campaignId', campaign_row.id,
    'campaignSlug', campaign_row.slug,
    'poolProposalId', campaign_row.pool_proposal_id,
    'termsVersion', campaign_row.published_terms_version,
    'termsSha256', campaign_row.published_terms_sha256,
    'threshold', jsonb_build_object(
      'netRecipientAmountCents', threshold_amount_value,
      'minimumSupporters', threshold_supporters_value,
      'deadlineAt', deadline_value
    ),
    'failureBonus', jsonb_build_object(
      'enabled', true,
      'rateBps', failure_bonus_rate_value,
      'eligibilityPolicy', eligibility_policy_json,
      'maxParticipants', failure_bonus_max_participants_value,
      'maxPerParticipantCents', failure_bonus_max_per_participant_value,
      'thresholdSchedule', threshold_schedule_json,
      'scheduleStatus', 'approved'
    ),
    'successPremium', jsonb_build_object(
      'rateBps', success_premium_rate_value,
      'amountCents', success_premium_amount_value,
      'payer', 'pool_creator_or_sponsor',
      'includedInNetThreshold', false,
      'provisional', false,
      'grossSuccessRequirementCents', gross_success_requirement_value,
      'pricing', success_premium_pricing_json
    ),
    'createPoolTerms', case
      when jsonb_typeof(create_pool_terms_json) = 'object' then jsonb_build_object(
        'thresholdAmountsCents', create_pool_terms_json -> 'threshold_amounts_cents_json',
        'failureBonusBaseType', create_pool_terms_json -> 'failure_bonus_base_type',
        'failureBonusBaseTerms', create_pool_terms_json -> 'failure_bonus_base_terms_json',
        'failureBonusTimingMode', create_pool_terms_json -> 'failure_bonus_timing_mode',
        'failureBonusTimingTerms', create_pool_terms_json -> 'failure_bonus_timing_terms_json',
        'formulaSource', create_pool_terms_json -> 'formula_source',
        'formulaAst', create_pool_terms_json -> 'formula_ast_json',
        'formulaLanguageVersion', create_pool_terms_json -> 'formula_language_version',
        'formulaHash', create_pool_terms_json -> 'formula_hash',
        'formulaVariables', create_pool_terms_json -> 'formula_variables_json',
        'continuationMode', create_pool_terms_json -> 'continuation_mode',
        'moralTradeFailureBonusShareBps', create_pool_terms_json -> 'moral_trade_failure_bonus_share_bps',
        'additionalActivationRule', create_pool_terms_json -> 'additional_activation_rule'
      )
      else null
    end,
    'payoutMethod', proposal_json -> 'public_goods_payout_method',
    'payment', jsonb_build_object(
      'pledgeMode', 'pledge_only',
      'paymentMethodCollected', false,
      'authorized', false,
      'mandateCreated', false,
      'charged', false,
      'captured', false,
      'settled', false,
      'failureBonusPaid', false
    )
  );
end;
$function$;

revoke all on function public.mpgf_public_dac_campaign_terms(text)
  from public;
grant execute on function public.mpgf_public_dac_campaign_terms(text)
  to anon, authenticated, service_role;

comment on function public.mpgf_public_dac_campaign_terms(text) is
  'Returns only public, exact-version DAC terms from the immutable approved proposal snapshot for an approved or finalized published campaign. It excludes creator identity, reviewer identity, private pledge evidence, idempotency data, and payment credentials.';

commit;
