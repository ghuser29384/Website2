alter table public.background_profile_signals
  add column if not exists signal_fingerprint text,
  add column if not exists source_summary_version integer,
  add column if not exists confirmation_kind text,
  add column if not exists confirmation_actor_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_policy_version text,
  add column if not exists lineage_status text not null default 'active',
  add column if not exists purpose_code text,
  add column if not exists purpose_policy_version text;

alter table public.background_profile_signals
  drop constraint if exists background_profile_signals_signal_fingerprint_check;

alter table public.background_profile_signals
  add constraint background_profile_signals_signal_fingerprint_check
  check (
    signal_fingerprint is null
    or signal_fingerprint ~ '^sha256:[a-f0-9]{64}$'
  );

alter table public.background_profile_signals
  drop constraint if exists background_profile_signals_confirmation_kind_check;

alter table public.background_profile_signals
  add constraint background_profile_signals_confirmation_kind_check
  check (
    confirmation_kind is null
    or confirmation_kind in (
      'explicit_participant_confirmation',
      'profile_apply',
      'interview_apply',
      'wish_dialogue_apply'
    )
  );

alter table public.background_profile_signals
  drop constraint if exists background_profile_signals_lineage_status_check;

alter table public.background_profile_signals
  add constraint background_profile_signals_lineage_status_check
  check (lineage_status in ('active', 'stale', 'revoked', 'expired'));

create unique index if not exists background_profile_signals_confirmed_source_tag_uidx
on public.background_profile_signals (
  profile_id,
  source_summary_id,
  source_summary_version,
  signal_fingerprint
)
where source = 'approved_source_summary'
  and status = 'active'
  and signal_fingerprint is not null;
