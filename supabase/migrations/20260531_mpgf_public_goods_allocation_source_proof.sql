begin;

alter table public.mpgf_public_goods_allocation_results
  add column if not exists source_contribution_digest text not null default 'sha256:pending-source-proof',
  add column if not exists eligible_contribution_record_count integer not null default 0
    check (eligible_contribution_record_count >= 0),
  add column if not exists raw_payment_object_count integer not null default 0
    check (raw_payment_object_count >= 0),
  add column if not exists unique_counted_identity_count integer not null default 0
    check (unique_counted_identity_count >= 0),
  add column if not exists regenerated_from_contribution_records boolean not null default false;

alter table public.mpgf_public_goods_allocation_results
  add constraint mpgf_public_goods_allocation_source_digest_hash
    check (source_contribution_digest ~ '^sha256:[0-9a-f]{64}$' or source_contribution_digest = 'sha256:pending-source-proof'),
  add constraint mpgf_public_goods_allocation_unique_counted_identity_rows
    check (unique_counted_identity_count <= eligible_contribution_record_count),
  add constraint mpgf_public_goods_allocation_eligible_rows_within_raw_rows
    check (eligible_contribution_record_count <= raw_payment_object_count);

create index if not exists mpgf_public_goods_allocation_source_digest_idx
  on public.mpgf_public_goods_allocation_results (round_id, source_contribution_digest);

comment on column public.mpgf_public_goods_allocation_results.source_contribution_digest is
  'Hash of the normalized underlying public-goods contribution records used to regenerate this allocation row; no donor ids or raw payment refs are exposed.';

comment on column public.mpgf_public_goods_allocation_results.unique_counted_identity_count is
  'Published donor count after collapsing eligible contribution records by counted identity; this must not count raw payment objects.';

commit;
