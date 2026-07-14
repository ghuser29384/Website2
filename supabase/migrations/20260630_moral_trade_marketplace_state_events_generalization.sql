-- Generalize marketplace state events beyond payment transitions for moraltrade82.

alter table public.moral_trade_marketplace_state_events
  drop constraint if exists moral_trade_marketplace_state_events_subject_type_check;

alter table public.moral_trade_marketplace_state_events
  add constraint moral_trade_marketplace_state_events_subject_type_check
  check (
    subject_type in (
      'cleared_trade_agreement',
      'payment_event',
      'evidence_record',
      'dispute_case',
      'blocker_state',
      'payout_milestone'
    )
  );

alter table public.moral_trade_marketplace_state_events
  drop constraint if exists moral_trade_marketplace_state_events_transition_check;

alter table public.moral_trade_marketplace_state_events
  add constraint moral_trade_marketplace_state_events_transition_check
  check (
    transition in (
      'agreement_state_change',
      'authorization',
      'blocker_state_change',
      'cancellation',
      'capture',
      'dispute_state_change',
      'evidence_state_change',
      'payment_state_change',
      'payout_release',
      'refund',
      'terminal_correction_recorded'
    )
  );

alter table public.moral_trade_marketplace_state_events
  add column if not exists previous_event_hash text
    check (previous_event_hash is null or previous_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  add column if not exists supersedes_state_event_ref text,
  add column if not exists correction_record_ref text,
  add column if not exists neutral_review_decision_ref text,
  add column if not exists parent_direct_mutation_bool boolean not null default false
    check (parent_direct_mutation_bool = false),
  add column if not exists private_payload_stored_bool boolean not null default false
    check (private_payload_stored_bool = false);

comment on table public.moral_trade_marketplace_state_events is
  'Append-only marketplace state events for agreement, payment, evidence, dispute, blocker, and payout state changes. Terminal states cannot be silently reopened; corrections use a new state event with supersession, correction, and neutral-review references. Private payloads, raw evidence, counterparty data, exact caps, private surplus, payment credentials, and reviewer notes stay out of this table.';

comment on column public.moral_trade_marketplace_state_events.parent_direct_mutation_bool is
  'Always false: parent agreement, payment, evidence, dispute, and blocker rows cannot be silently edited to create state.';

comment on column public.moral_trade_marketplace_state_events.private_payload_stored_bool is
  'Always false: marketplace state events store hashes and references, not raw private payloads.';
