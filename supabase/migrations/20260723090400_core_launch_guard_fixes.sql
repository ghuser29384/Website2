create or replace function public.guard_core_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  actor uuid := auth.uid();
  is_participant boolean;
  is_counterparty boolean;
begin
  select
    exists (
      select 1 from public.agreements a
      where a.id = coalesce(new.agreement_id, old.agreement_id)
        and actor in (a.proposer_id, a.responder_id)
        and a.lifecycle_status in ('active', 'evidence_due', 'disputed')
    ),
    exists (
      select 1 from public.agreements a
      where a.id = coalesce(new.agreement_id, old.agreement_id)
        and actor in (a.proposer_id, a.responder_id)
        and actor <> coalesce(new.submitted_by, old.submitted_by)
    )
  into is_participant, is_counterparty;

  if actor is not null and not is_participant then
    raise exception 'Evidence may be changed only by an active agreement participant.';
  end if;

  if tg_op = 'INSERT' then
    if actor is not null and new.submitted_by <> actor then
      raise exception 'The evidence submitter must be the signed-in participant.';
    end if;
    if new.replaces_evidence_id is not null and not exists (
      select 1 from public.trade_evidence_items prior
      where prior.id = new.replaces_evidence_id
        and prior.agreement_id = new.agreement_id
        and prior.submitted_by = new.submitted_by
        and prior.status in ('submitted', 'challenged')
    ) then
      raise exception 'Replacement evidence must reference an open item from the same submitter and agreement.';
    end if;
    return new;
  end if;

  if new.agreement_id <> old.agreement_id
     or new.submitted_by <> old.submitted_by
     or new.evidence_type <> old.evidence_type
     or new.storage_path <> old.storage_path
     or new.evidence_url <> old.evidence_url
     or new.attestation <> old.attestation
     or new.replaces_evidence_id is distinct from old.replaces_evidence_id
     or new.created_at <> old.created_at then
    raise exception 'Submitted evidence source data is immutable.';
  end if;

  if actor is not null
     and actor <> old.submitted_by
     and (
       new.public_title is distinct from old.public_title
       or new.public_summary is distinct from old.public_summary
       or new.public_url is distinct from old.public_url
       or new.public_storage_path is distinct from old.public_storage_path
       or new.public_visibility is distinct from old.public_visibility
       or new.redaction_status is distinct from old.redaction_status
       or new.public_redaction_note is distinct from old.public_redaction_note
       or new.public_mime_type is distinct from old.public_mime_type
       or new.public_original_filename is distinct from old.public_original_filename
       or new.public_published_at is distinct from old.public_published_at
       or new.withdrawal_reason is distinct from old.withdrawal_reason
       or new.withdrawn_at is distinct from old.withdrawn_at
       or new.replaced_at is distinct from old.replaced_at
     ) then
    raise exception 'Only the submitter may change evidence publication or withdrawal fields.';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('accepted', 'challenged') then
      if old.status <> 'submitted' or (actor is not null and not is_counterparty) then
        raise exception 'Only the counterparty may accept or challenge submitted evidence.';
      end if;
    elsif new.status in ('withdrawn', 'replaced') then
      if old.status not in ('submitted', 'challenged')
         or (actor is not null and actor <> old.submitted_by) then
        raise exception 'Only the submitter may withdraw or replace open evidence.';
      end if;
      new.public_visibility := 'private';
      new.public_title := '';
      new.public_summary := '';
      new.redaction_status := 'withheld';
      new.public_url := '';
      new.public_storage_path := '';
      new.public_original_filename := '';
      new.public_mime_type := '';
      new.public_redaction_note := '';
      new.public_published_at := null;
    else
      raise exception 'Unsupported evidence status transition.';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_core_evidence_mutation() from public, anon, authenticated;
