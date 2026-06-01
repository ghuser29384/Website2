alter table public.background_opportunity_briefs
  add column if not exists delivery_state text not null default 'pending';

alter table public.background_opportunity_briefs
  add column if not exists review_status text not null default 'human_review_required';

alter table public.background_opportunity_briefs
  add column if not exists human_review_required boolean not null default true;

alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_delivery_state_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_delivery_state_check
  check (delivery_state in ('pending', 'delivered', 'opened', 'interested', 'maybe_later', 'dismissed', 'expired'));

alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_review_status_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_review_status_check
  check (review_status in ('human_review_required', 'review_cleared', 'blocked'));

alter table public.collective_members
  add column if not exists permissions text[] not null default '{}';

alter table public.collective_members
  drop constraint if exists collective_members_role_check;

alter table public.collective_members
  add constraint collective_members_role_check
  check (role in ('owner', 'admin', 'delegate', 'reviewer', 'member', 'viewer'));

alter table public.collective_members
  drop constraint if exists collective_members_permissions_check;

alter table public.collective_members
  add constraint collective_members_permissions_check
  check (
    permissions <@ array[
      'edit_broad_preview',
      'approve_source_summary',
      'request_intro',
      'approve_contact_disclosure',
      'revoke_grants',
      'change_discoverability'
    ]::text[]
  );

alter table public.background_collective_policies
  add column if not exists contact_disclosure_requires_owner_step_up boolean not null default true;

create index if not exists background_opportunity_briefs_delivery_state_idx
on public.background_opportunity_briefs (profile_id, delivery_state, updated_at desc);
