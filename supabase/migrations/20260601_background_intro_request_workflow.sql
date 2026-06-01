alter table public.background_intro_packets
  add column if not exists appeal_status text not null default 'none',
  add column if not exists appeal_reason text not null default '',
  add column if not exists appealed_at timestamptz,
  add column if not exists appeal_resolved_at timestamptz,
  add column if not exists appeal_resolution_note text not null default '',
  add column if not exists requester_contact_approved_at timestamptz,
  add column if not exists counterparty_contact_approved_at timestamptz,
  add column if not exists contact_approval_status text not null default 'not_requested',
  add column if not exists contact_approval_requires_fresh_mfa boolean not null default true;

alter table public.background_intro_packets
  drop constraint if exists background_intro_packets_appeal_status_check;
alter table public.background_intro_packets
  add constraint background_intro_packets_appeal_status_check
  check (appeal_status in ('none', 'requested', 'under_review', 'resolved', 'dismissed'));

alter table public.background_intro_packets
  drop constraint if exists background_intro_packets_contact_approval_status_check;
alter table public.background_intro_packets
  add constraint background_intro_packets_contact_approval_status_check
  check (
    contact_approval_status in (
      'not_requested',
      'requester_approved',
      'counterparty_approved',
      'mutual_approved',
      'withdrawn'
    )
  );

create index if not exists background_intro_packets_appeal_idx
on public.background_intro_packets (appeal_status, sla_due_at asc, updated_at desc)
where appeal_status <> 'none';

create index if not exists background_intro_packets_contact_approval_idx
on public.background_intro_packets (contact_approval_status, updated_at desc)
where contact_approval_status <> 'not_requested';
