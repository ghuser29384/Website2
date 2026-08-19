-- Phase 3C: make the evidence-weighted completion contract portable to
-- production databases that predate the legacy evidence-review migration.

begin;

alter table public.agreements
  add column if not exists completion_state text;

update public.agreements
set completion_state = case
  when lifecycle_status = 'completed' or status::text = 'completed'
    then 'reviewed_complete'
  when lifecycle_status = 'disputed'
    then 'disputed_unresolved'
  else 'pending_evidence'
end
where completion_state is null;

alter table public.agreements
  alter column completion_state set default 'pending_evidence',
  alter column completion_state set not null;

alter table public.agreements
  drop constraint if exists agreements_completion_state_check;

alter table public.agreements
  add constraint agreements_completion_state_check
  check (
    completion_state in (
      'pending_evidence',
      'under_review',
      'challenge_window_open',
      'reviewed_complete',
      'disputed_unresolved'
    )
  );

create index if not exists agreements_completion_state_idx
  on public.agreements (completion_state, updated_at desc);

commit;
