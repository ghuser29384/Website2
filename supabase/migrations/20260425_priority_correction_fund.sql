create table if not exists public.impact_contributions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  contribution_kind text not null default 'donation' check (contribution_kind in ('donation', 'money_equivalent')),
  cause_area text not null default '',
  action_label text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  occurred_at timestamptz not null default timezone('utc', now()),
  evidence_url text not null default '',
  evidence_note text not null default '',
  verification_status text not null default 'self_reported' check (verification_status in ('self_reported', 'verified', 'imported')),
  source_label text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.priority_correction_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_month date not null unique,
  source_period_start date not null,
  source_period_end date not null,
  carryover_in_cents integer not null default 0 check (carryover_in_cents >= 0),
  calculated_fund_cents integer not null default 0 check (calculated_fund_cents >= 0),
  published_fund_cents integer not null default 0 check (published_fund_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'specific_action_review', 'cause_area_review', 'reserved', 'finalized')),
  published_at timestamptz,
  specific_actions_due_at timestamptz,
  specific_actions_revision_due_at timestamptz,
  cause_area_due_at timestamptz,
  cause_area_revision_due_at timestamptz,
  reserve_reason text not null default '',
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  carryover_consumed_by_cycle_id uuid references public.priority_correction_cycles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.priority_correction_member_snapshots (
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  donation_cents integer not null default 0 check (donation_cents >= 0),
  peer_payment_cents integer not null default 0 check (peer_payment_cents >= 0),
  qualifying_cents integer not null default 0 check (qualifying_cents >= 0),
  fund_share_cents integer not null default 0 check (fund_share_cents >= 0),
  prioritized_cause_area text,
  prioritized_share_basis_points integer not null default 0 check (prioritized_share_basis_points between 0 and 10000),
  priority_cause_cents integer not null default 0 check (priority_cause_cents >= 0),
  lifetime_contribution_cents integer not null default 0 check (lifetime_contribution_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (cycle_id, profile_id)
);

create table if not exists public.priority_correction_arbiter_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('specific_action_arbiter', 'cause_area_arbiter')),
  cause_area text,
  selection_pool text not null default '',
  selection_score integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'recused', 'replaced')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, profile_id, role, cause_area)
);

create table if not exists public.priority_specific_action_submissions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  cause_area text not null default '',
  version integer not null default 1 check (version > 0),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  combination_summary text not null default '',
  allocation_schedule jsonb not null default '[]'::jsonb,
  effect_schedule jsonb not null default '[]'::jsonb,
  reasoning text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'reconsideration_requested', 'superseded', 'excluded')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, cause_area, version)
);

create table if not exists public.priority_specific_action_positions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.priority_specific_action_submissions (id) on delete cascade,
  arbiter_assignment_id uuid not null references public.priority_correction_arbiter_assignments (id) on delete cascade,
  stance text not null check (stance in ('agree', 'dissent')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, arbiter_assignment_id)
);

create table if not exists public.priority_specific_action_feedback (
  submission_id uuid not null references public.priority_specific_action_submissions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stance text not null check (stance in ('object', 'agree_with_dissent')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (submission_id, profile_id)
);

create table if not exists public.priority_cause_area_allocations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  version integer not null default 1 check (version > 0),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  allocation_schedule jsonb not null default '[]'::jsonb,
  expected_impact text not null default '',
  reasoning text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'reconsideration_requested', 'superseded', 'reserved')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, version)
);

create table if not exists public.priority_cause_area_positions (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.priority_cause_area_allocations (id) on delete cascade,
  arbiter_assignment_id uuid not null references public.priority_correction_arbiter_assignments (id) on delete cascade,
  stance text not null check (stance in ('agree', 'dissent')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (allocation_id, arbiter_assignment_id)
);

create table if not exists public.priority_cause_area_feedback (
  allocation_id uuid not null references public.priority_cause_area_allocations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stance text not null check (stance in ('object', 'agree_with_dissent')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (allocation_id, profile_id)
);

create index if not exists impact_contributions_profile_occurred_idx on public.impact_contributions (profile_id, occurred_at desc);
create index if not exists impact_contributions_cause_idx on public.impact_contributions (cause_area, occurred_at desc);
create index if not exists priority_correction_cycles_status_idx on public.priority_correction_cycles (status, cycle_month desc);
create index if not exists priority_correction_member_snapshots_profile_idx on public.priority_correction_member_snapshots (profile_id, cycle_id);
create index if not exists priority_correction_member_snapshots_cause_idx on public.priority_correction_member_snapshots (cycle_id, prioritized_cause_area);
create index if not exists priority_correction_arbiter_assignments_profile_idx on public.priority_correction_arbiter_assignments (profile_id, created_at desc);
create index if not exists priority_correction_arbiter_assignments_cycle_role_idx on public.priority_correction_arbiter_assignments (cycle_id, role, cause_area);
create index if not exists priority_specific_action_submissions_cycle_idx on public.priority_specific_action_submissions (cycle_id, cause_area, version desc);
create index if not exists priority_specific_action_positions_submission_idx on public.priority_specific_action_positions (submission_id);
create index if not exists priority_specific_action_feedback_submission_idx on public.priority_specific_action_feedback (submission_id);
create index if not exists priority_cause_area_allocations_cycle_idx on public.priority_cause_area_allocations (cycle_id, version desc);
create index if not exists priority_cause_area_positions_allocation_idx on public.priority_cause_area_positions (allocation_id);
create index if not exists priority_cause_area_feedback_allocation_idx on public.priority_cause_area_feedback (allocation_id);

drop trigger if exists impact_contributions_set_updated_at on public.impact_contributions;
create trigger impact_contributions_set_updated_at
before update on public.impact_contributions
for each row execute procedure public.set_updated_at();

drop trigger if exists priority_correction_cycles_set_updated_at on public.priority_correction_cycles;
create trigger priority_correction_cycles_set_updated_at
before update on public.priority_correction_cycles
for each row execute procedure public.set_updated_at();

drop trigger if exists priority_specific_action_submissions_set_updated_at on public.priority_specific_action_submissions;
create trigger priority_specific_action_submissions_set_updated_at
before update on public.priority_specific_action_submissions
for each row execute procedure public.set_updated_at();

drop trigger if exists priority_cause_area_allocations_set_updated_at on public.priority_cause_area_allocations;
create trigger priority_cause_area_allocations_set_updated_at
before update on public.priority_cause_area_allocations
for each row execute procedure public.set_updated_at();

alter table public.impact_contributions enable row level security;
alter table public.priority_correction_cycles enable row level security;
alter table public.priority_correction_member_snapshots enable row level security;
alter table public.priority_correction_arbiter_assignments enable row level security;
alter table public.priority_specific_action_submissions enable row level security;
alter table public.priority_specific_action_positions enable row level security;
alter table public.priority_specific_action_feedback enable row level security;
alter table public.priority_cause_area_allocations enable row level security;
alter table public.priority_cause_area_positions enable row level security;
alter table public.priority_cause_area_feedback enable row level security;

drop policy if exists "impact_contributions_select_own" on public.impact_contributions;
create policy "impact_contributions_select_own"
on public.impact_contributions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "impact_contributions_insert_own" on public.impact_contributions;
create policy "impact_contributions_insert_own"
on public.impact_contributions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "impact_contributions_update_own" on public.impact_contributions;
create policy "impact_contributions_update_own"
on public.impact_contributions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_correction_cycles_select_public" on public.priority_correction_cycles;
create policy "priority_correction_cycles_select_public"
on public.priority_correction_cycles
for select
to anon, authenticated
using (true);

drop policy if exists "priority_correction_member_snapshots_select_own" on public.priority_correction_member_snapshots;
create policy "priority_correction_member_snapshots_select_own"
on public.priority_correction_member_snapshots
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "priority_correction_arbiter_assignments_select_public" on public.priority_correction_arbiter_assignments;
create policy "priority_correction_arbiter_assignments_select_public"
on public.priority_correction_arbiter_assignments
for select
to anon, authenticated
using (true);

drop policy if exists "priority_specific_action_submissions_select_public" on public.priority_specific_action_submissions;
create policy "priority_specific_action_submissions_select_public"
on public.priority_specific_action_submissions
for select
to anon, authenticated
using (true);

drop policy if exists "priority_specific_action_submissions_insert_assigned" on public.priority_specific_action_submissions;
create policy "priority_specific_action_submissions_insert_assigned"
on public.priority_specific_action_submissions
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'specific_action_arbiter'
      and public.priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_specific_action_submissions_update_assigned" on public.priority_specific_action_submissions;
create policy "priority_specific_action_submissions_update_assigned"
on public.priority_specific_action_submissions
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'specific_action_arbiter'
      and public.priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'specific_action_arbiter'
      and public.priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_specific_action_positions_select_own" on public.priority_specific_action_positions;
create policy "priority_specific_action_positions_select_own"
on public.priority_specific_action_positions
for select
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_specific_action_positions_insert_own" on public.priority_specific_action_positions;
create policy "priority_specific_action_positions_insert_own"
on public.priority_specific_action_positions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_specific_action_positions_update_own" on public.priority_specific_action_positions;
create policy "priority_specific_action_positions_update_own"
on public.priority_specific_action_positions
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_specific_action_feedback_select_own" on public.priority_specific_action_feedback;
create policy "priority_specific_action_feedback_select_own"
on public.priority_specific_action_feedback
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "priority_specific_action_feedback_insert_own" on public.priority_specific_action_feedback;
create policy "priority_specific_action_feedback_insert_own"
on public.priority_specific_action_feedback
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_specific_action_feedback_update_own" on public.priority_specific_action_feedback;
create policy "priority_specific_action_feedback_update_own"
on public.priority_specific_action_feedback
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_cause_area_allocations_select_public" on public.priority_cause_area_allocations;
create policy "priority_cause_area_allocations_select_public"
on public.priority_cause_area_allocations
for select
to anon, authenticated
using (true);

drop policy if exists "priority_cause_area_allocations_insert_assigned" on public.priority_cause_area_allocations;
create policy "priority_cause_area_allocations_insert_assigned"
on public.priority_cause_area_allocations
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'cause_area_arbiter'
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_cause_area_allocations_update_assigned" on public.priority_cause_area_allocations;
create policy "priority_cause_area_allocations_update_assigned"
on public.priority_cause_area_allocations
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'cause_area_arbiter'
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'cause_area_arbiter'
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_cause_area_positions_select_own" on public.priority_cause_area_positions;
create policy "priority_cause_area_positions_select_own"
on public.priority_cause_area_positions
for select
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_cause_area_positions_insert_own" on public.priority_cause_area_positions;
create policy "priority_cause_area_positions_insert_own"
on public.priority_cause_area_positions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_cause_area_positions_update_own" on public.priority_cause_area_positions;
create policy "priority_cause_area_positions_update_own"
on public.priority_cause_area_positions
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_cause_area_feedback_select_own" on public.priority_cause_area_feedback;
create policy "priority_cause_area_feedback_select_own"
on public.priority_cause_area_feedback
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "priority_cause_area_feedback_insert_own" on public.priority_cause_area_feedback;
create policy "priority_cause_area_feedback_insert_own"
on public.priority_cause_area_feedback
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_cause_area_feedback_update_own" on public.priority_cause_area_feedback;
create policy "priority_cause_area_feedback_update_own"
on public.priority_cause_area_feedback
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
