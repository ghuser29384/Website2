alter table public.mpgf_support_stances
  add column if not exists review_signal_visibility text not null default 'aggregate_only' check (
    review_signal_visibility in ('aggregate_only', 'pseudonymous', 'public')
  );

comment on column public.mpgf_support_stances.review_signal_visibility is
  'Participant-selected review-signal visibility for dissent/review stances. Defaults to aggregate-only and does not create allocation power.';

comment on table public.mpgf_support_stances is
  'Private-by-default strong, weak, dissent, or abstain stances over projects or buckets. Stances include caps, rank order, redacted-note hashes, review-signal visibility, feed coalition feasibility, and never create global moral rankings.';
