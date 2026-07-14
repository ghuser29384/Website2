alter table public.moral_trade_public_receipt_cards
  add column if not exists sensitive_action_display_mode text not null default 'generic_action_label',
  add column if not exists separate_public_action_disclosure_consent_bool boolean not null default false,
  add column if not exists sensitive_action_privacy_review_state text not null default 'not_required_for_stage',
  add column if not exists sensitive_action_autonomy_review_state text not null default 'not_required_for_stage',
  add column if not exists sensitive_action_content_moderation_review_state text not null default 'not_required_for_stage';

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_sensitive_action_display_mode_check
  check (
    sensitive_action_display_mode in (
      'generic_action_label',
      'transfer_only',
      'exact_action_details'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_sensitive_action_review_state_check
  check (
    sensitive_action_privacy_review_state in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and sensitive_action_autonomy_review_state in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and sensitive_action_content_moderation_review_state in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_exact_sensitive_action_publication_check
  check (
    claim_kind <> 'pledge_swap'
    or visibility_state <> 'opt_in_public'
    or sensitive_action_display_mode <> 'exact_action_details'
    or (
      separate_public_action_disclosure_consent_bool
      and sensitive_action_privacy_review_state in ('passed', 'not_required_for_stage')
      and sensitive_action_autonomy_review_state in ('passed', 'not_required_for_stage')
      and sensitive_action_content_moderation_review_state in ('passed', 'not_required_for_stage')
    )
  ) not valid;

comment on column public.moral_trade_public_receipt_cards.sensitive_action_display_mode is
  'Controls pledge-swap public receipt detail level. Personal-behavior receipts default to generic action labels or transfer-only display; exact sensitive action details require separate consent and non-blocking review.';

comment on column public.moral_trade_public_receipt_cards.separate_public_action_disclosure_consent_bool is
  'Separate participant consent for publishing exact personal-behavior action details on a public receipt card.';

comment on constraint moral_trade_public_receipt_exact_sensitive_action_publication_check on public.moral_trade_public_receipt_cards is
  'Exact food, diet, health, family, religious, political, lifestyle, or comparable personal-behavior details on pledge-swap receipts require separate public-action disclosure consent and non-blocking privacy, autonomy, and content-moderation review.';
