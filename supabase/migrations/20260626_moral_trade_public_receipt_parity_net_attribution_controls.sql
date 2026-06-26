alter table public.moral_trade_public_receipt_cards
  add column if not exists direct_donation_parity_mode_offered_bool boolean not null default false,
  add column if not exists direct_donation_parity_participant_opt_in_bool boolean not null default false,
  add column if not exists direct_donation_parity_preselected_bool boolean not null default false,
  add column if not exists direct_donation_parity_required_for_publication_bool boolean not null default false,
  add column if not exists direct_donation_parity_moral_upgrade_framing_bool boolean not null default false,
  add column if not exists direct_donation_parity_affects_matching_priority_bool boolean not null default false,
  add column if not exists direct_donation_parity_affects_review_priority_bool boolean not null default false,
  add column if not exists direct_donation_parity_affects_eligibility_bool boolean not null default false,
  add column if not exists direct_donation_parity_affects_public_search_ordering_bool boolean not null default false,
  add column if not exists direct_donation_parity_affects_profile_prominence_bool boolean not null default false,
  add column if not exists direct_donation_parity_affects_future_marketplace_access_bool boolean not null default false,
  add column if not exists gross_personal_transfer_text text not null default '',
  add column if not exists known_reimbursement_or_subsidy_text text not null default '',
  add column if not exists side_benefit_disclosure_text text not null default '',
  add column if not exists net_personal_contribution_text text not null default '',
  add column if not exists net_attribution_state text not null default 'uncertain_qualified',
  add column if not exists trade_conditioned_funds_excluded_bool boolean not null default true,
  add column if not exists trade_unlocked_funds_excluded_bool boolean not null default true,
  add column if not exists sponsor_subsidies_excluded_bool boolean not null default true,
  add column if not exists employer_matches_excluded_bool boolean not null default true,
  add column if not exists donor_advised_fund_credits_excluded_bool boolean not null default true,
  add column if not exists refunds_excluded_bool boolean not null default true,
  add column if not exists counterparty_reimbursements_excluded_bool boolean not null default true;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_direct_donation_parity_opt_in_check
  check (
    not direct_donation_parity_mode_offered_bool
    or direct_donation_parity_participant_opt_in_bool
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_direct_donation_parity_non_preference_check
  check (
    direct_donation_parity_preselected_bool = false
    and direct_donation_parity_required_for_publication_bool = false
    and direct_donation_parity_moral_upgrade_framing_bool = false
    and direct_donation_parity_affects_matching_priority_bool = false
    and direct_donation_parity_affects_review_priority_bool = false
    and direct_donation_parity_affects_eligibility_bool = false
    and direct_donation_parity_affects_public_search_ordering_bool = false
    and direct_donation_parity_affects_profile_prominence_bool = false
    and direct_donation_parity_affects_future_marketplace_access_bool = false
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_net_attribution_state_check
  check (
    net_attribution_state in (
      'verified_net_personal',
      'disclosed_partial_reimbursement',
      'disclosed_subsidy_or_match',
      'uncertain_qualified',
      'disputed_blocked',
      'suppressed'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_net_attribution_publication_check
  check (
    visibility_state <> 'opt_in_public'
    or (
      length(btrim(gross_personal_transfer_text)) > 0
      and length(btrim(known_reimbursement_or_subsidy_text)) > 0
      and length(btrim(side_benefit_disclosure_text)) > 0
      and length(btrim(net_personal_contribution_text)) > 0
      and net_attribution_state <> 'disputed_blocked'
      and trade_conditioned_funds_excluded_bool
      and trade_unlocked_funds_excluded_bool
      and sponsor_subsidies_excluded_bool
      and employer_matches_excluded_bool
      and donor_advised_fund_credits_excluded_bool
      and refunds_excluded_bool
      and counterparty_reimbursements_excluded_bool
    )
  ) not valid;

comment on constraint moral_trade_public_receipt_direct_donation_parity_non_preference_check on public.moral_trade_public_receipt_cards is
  'Direct-donation parity remains opt-in and non-preferential: it cannot be preselected, required for receipt publication, framed as a moral upgrade, or used for matching, review, eligibility, public search ordering, profile prominence, or future marketplace access.';

comment on constraint moral_trade_public_receipt_net_attribution_publication_check on public.moral_trade_public_receipt_cards is
  'Gross transfer, reimbursement or subsidy, side benefit, and net personal contribution fields are required before public publication; trade-conditioned funds, trade-unlocked funds, sponsor subsidies, employer matches, donor-advised-fund credits, refunds, and counterparty reimbursements cannot be counted as the participant personal contribution.';
