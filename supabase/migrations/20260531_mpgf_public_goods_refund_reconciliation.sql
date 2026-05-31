begin;

create index if not exists mpgf_public_goods_pledges_payment_intent_ref_idx
on public.mpgf_public_goods_pledges (payment_intent_ref)
where payment_intent_ref is not null;

create unique index if not exists mpgf_public_goods_payment_proofs_source_event_ref_idx
on public.mpgf_public_goods_payment_proofs (reconciliation_source, source_event_ref)
where source_event_ref is not null;

commit;
