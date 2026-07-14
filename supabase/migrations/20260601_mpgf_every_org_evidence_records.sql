begin;

alter table public.mpgf_public_goods_payment_proofs
  drop constraint if exists mpgf_public_goods_payment_proofs_reconciliation_source_check,
  add constraint mpgf_public_goods_payment_proofs_reconciliation_source_check check (
    reconciliation_source in (
      'external_receipt',
      'fiscal_host_webhook',
      'sponsor_signed_intent',
      'every_org_partner_webhook'
    )
  );

create unique index if not exists mpgf_public_goods_payment_proofs_source_event_idx
on public.mpgf_public_goods_payment_proofs (reconciliation_source, source_event_ref)
where source_event_ref is not null;

comment on column public.mpgf_public_goods_payment_proofs.reconciliation_source is
  'Evidence source for MPGF contribution verification. Every.org partner webhooks create pending review evidence without exposing raw donor or charge references.';

commit;
