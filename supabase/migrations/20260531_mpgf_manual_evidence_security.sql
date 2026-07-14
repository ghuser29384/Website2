begin;

alter table public.mpgf_manual_external_payment_evidence
  add column if not exists evidence_access_scope text not null default 'owner_and_reviewer_only',
  add column if not exists evidence_signed_url_expires_at timestamptz,
  add column if not exists evidence_malware_scan_status text not null default 'manual_review_required',
  add column if not exists evidence_normalized_json jsonb not null default '{}'::jsonb;

alter table public.mpgf_manual_external_payment_evidence
  drop constraint if exists mpgf_manual_external_payment_evidence_access_scope_check,
  add constraint mpgf_manual_external_payment_evidence_access_scope_check
    check (evidence_access_scope in ('owner_and_reviewer_only')),
  drop constraint if exists mpgf_manual_external_payment_evidence_malware_scan_check,
  add constraint mpgf_manual_external_payment_evidence_malware_scan_check
    check (
      evidence_malware_scan_status in (
        'metadata_scan_passed',
        'manual_review_required',
        'blocked_suspicious_file_type'
      )
    );

create index if not exists mpgf_manual_evidence_access_expiry_idx
on public.mpgf_manual_external_payment_evidence (user_id, evidence_signed_url_expires_at desc);

comment on column public.mpgf_manual_external_payment_evidence.evidence_url
is 'Stores MPGF access-scoped signed evidence URL, not raw receipt URL; signed links must be short lived.';

comment on column public.mpgf_manual_external_payment_evidence.evidence_normalized_json
is 'Structured MPGF manual evidence metadata: raw receipt URLs are hashed, malware scan state is explicit, and public ledgers must not expose this JSON.';

commit;
