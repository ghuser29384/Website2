begin;

alter table public.mpgf_public_goods_disbursements
  add column if not exists approver_id uuid references public.profiles (id) on delete set null,
  add column if not exists dual_control_confirmed boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mpgf_public_goods_disbursements'::regclass
      and conname = 'mpgf_public_goods_disbursements_distinct_reviewer_approver'
  ) then
    alter table public.mpgf_public_goods_disbursements
      add constraint mpgf_public_goods_disbursements_distinct_reviewer_approver
      check (
        reviewer_id is null
        or approver_id is null
        or reviewer_id <> approver_id
      );
  end if;
end;
$$;

create index if not exists mpgf_public_goods_disbursements_dual_control_idx
on public.mpgf_public_goods_disbursements (status, dual_control_confirmed, created_at desc);

comment on column public.mpgf_public_goods_disbursements.dual_control_confirmed
is 'MPGF public-goods payout destinations require dual control before partner release; release audit events remain append-only.';

commit;
