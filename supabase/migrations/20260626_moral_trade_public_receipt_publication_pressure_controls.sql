alter table public.moral_trade_public_receipt_cards
  add column if not exists publication_pressure_reporting_required_bool boolean not null default true,
  add column if not exists publication_pressure_report_refs_jsonb jsonb not null default '[]'::jsonb,
  add column if not exists publication_default_placement_state text not null default 'unlisted',
  add column if not exists publicity_as_trade_term_block_state text not null default 'not_required';

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_publication_pressure_refs_check
  check (
    jsonb_typeof(publication_pressure_report_refs_jsonb) = 'array'
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_publicity_as_trade_term_state_check
  check (
    publicity_as_trade_term_block_state in (
      'not_required',
      'possible',
      'blocked',
      'manual_review'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_default_placement_state_check
  check (
    publication_default_placement_state in (
      'unlisted',
      'profile_opt_in',
      'search_indexed'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_cards
  add constraint moral_trade_public_receipt_publication_pressure_publication_check
  check (
    visibility_state <> 'opt_in_public'
    or (
      publication_pressure_reporting_required_bool
      and publication_default_placement_state in ('unlisted', 'profile_opt_in')
      and publicity_as_trade_term_block_state = 'not_required'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_publication_controls
  add column if not exists publication_default_placement_state text not null default 'unlisted';

alter table public.moral_trade_public_receipt_publication_controls
  add constraint moral_trade_public_receipt_controls_default_placement_state_check
  check (
    publication_default_placement_state in (
      'unlisted',
      'profile_opt_in',
      'search_indexed'
    )
  ) not valid;

alter table public.moral_trade_public_receipt_publication_controls
  add constraint moral_trade_public_receipt_controls_publication_placement_check
  check (
    publication_default_placement_state in ('unlisted', 'profile_opt_in')
  ) not valid;

comment on column public.moral_trade_public_receipt_cards.publication_pressure_reporting_required_bool is
  'Publication-pressure reporting remains available for opt-in public receipt cards so participants can privately report pressure to publish, keep public, add a personal note, reveal identity, or disclose evidence.';

comment on column public.moral_trade_public_receipt_cards.publication_pressure_report_refs_jsonb is
  'Private reviewer/report references for alleged public-receipt publication pressure. References are not public receipt card content.';

comment on column public.moral_trade_public_receipt_cards.publication_default_placement_state is
  'Default public-receipt placement must remain unlisted or profile opt-in; search indexing cannot be the default publication path.';

comment on column public.moral_trade_public_receipt_cards.publicity_as_trade_term_block_state is
  'Fail-closed block state for publicity-as-trade-term pressure. Possible, blocked, or manual-review states cannot be opt-in public receipt publication.';

comment on column public.moral_trade_public_receipt_publication_controls.publication_default_placement_state is
  'Publication-control placement state. Public receipt publication defaults to unlisted or profile opt-in, not search-indexed distribution.';

comment on constraint moral_trade_public_receipt_publication_pressure_publication_check on public.moral_trade_public_receipt_cards is
  'Public receipt publication requires pressure-reporting controls, unlisted or profile-opt-in default placement, and blocks publication when publicity may be required as a matching, payout, compensation, evidence, dispute, or completion condition.';
