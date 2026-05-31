alter table public.match_concierge_requests
  add column if not exists appeal_status text not null default 'none',
  add column if not exists appeal_reason text not null default '',
  add column if not exists appealed_at timestamptz,
  add column if not exists appeal_resolved_at timestamptz,
  add column if not exists appeal_resolved_by uuid references public.profiles (id) on delete set null,
  add column if not exists appeal_resolution_note text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_concierge_requests_appeal_status_check'
  ) then
    alter table public.match_concierge_requests
      add constraint match_concierge_requests_appeal_status_check
      check (appeal_status in ('none', 'requested', 'under_review', 'resolved', 'dismissed'));
  end if;
end
$$;

create index if not exists match_concierge_requests_appeal_status_idx
on public.match_concierge_requests (appeal_status, sla_due_at asc, updated_at desc)
where appeal_status <> 'none';
