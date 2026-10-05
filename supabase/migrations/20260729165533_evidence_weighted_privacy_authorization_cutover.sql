-- Phase 3: restrictive privacy and participant-authorization cutover.
--
-- Apply only after:
--   1. 20260729165525_evidence_weighted_milestones_additive.sql;
--   2. 20260729165526_evidence_weighted_payment_completion.sql; and
--   3. all remaining Phase 1 migrations through 20260729165532; and
--   4. the compatible application artifact has passed authenticated QA.
-- Re-run the lifecycle and negative-authorization suites after this cutover
-- before promoting the exact application artifact that passed both phases.

alter table public.trade_agreement_versions
  alter column requires_milestone_manifest set default true;

update public.trade_agreement_versions version
set requires_milestone_manifest = true
from public.agreements agreement
where agreement.id = version.agreement_id
  and agreement.lifecycle_status = 'proposed'
  and not exists (
    select 1
    from public.trade_agreement_confirmations confirmation
    where confirmation.agreement_version_id = version.id
  );

-- The additive phase temporarily accepts existing service-role calls so the
-- old application remains usable. The compatible application uses the
-- authenticated caller, so the final helper can now fail closed.
create or replace function moral_trade_private.require_bound_trade_actor(
  p_actor_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or p_actor_id is distinct from auth.uid() then
    raise exception 'The actor must match the authenticated profile.';
  end if;
end;
$function$;

create or replace function moral_trade_private.bind_trade_confirmation_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'A confirmation must belong to the authenticated participant.';
  end if;
  return new;
end;
$function$;

-- Full profile rows are self-only. Public and counterpart labels use the
-- sanitized projection installed during the additive phase.
drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

revoke select on table public.profiles from anon;
grant select on table public.profiles to authenticated;

-- Retire the prior public dossier and every anonymous storage path. Originals
-- remain private even when a participant previously opted into public evidence.
drop trigger if exists initialize_public_trade_evidence_trigger
  on public.trade_evidence_items;
drop policy if exists "public_safe_trade_evidence_read" on storage.objects;

revoke execute on function public.get_public_moral_trade_evidence_v1(uuid)
  from public, anon, authenticated;
revoke execute on function public.list_public_moral_trade_evidence_v1(integer, integer)
  from public, anon, authenticated;
revoke execute on function public.can_read_public_trade_evidence_object_v1(text, text)
  from public, anon, authenticated;

alter table public.agreements
  alter column public_evidence_enabled set default false;

update public.agreements
set public_evidence_enabled = false,
    public_evidence_exception_reason = '',
    public_evidence_updated_at = now()
where public_evidence_enabled
   or public_evidence_exception_reason <> '';

update public.trade_evidence_items
set public_title = '',
    public_summary = '',
    public_url = '',
    public_storage_path = '',
    public_visibility = 'withheld_safety',
    redaction_status = 'withheld',
    public_redaction_note = '',
    public_mime_type = '',
    public_original_filename = '',
    public_published_at = null
where public_title <> ''
   or public_summary <> ''
   or public_url <> ''
   or public_storage_path <> ''
   or public_visibility <> 'withheld_safety'
   or redaction_status <> 'withheld'
   or public_redaction_note <> ''
   or public_mime_type <> ''
   or public_original_filename <> ''
   or public_published_at is not null;

-- Participant lifecycle, review, and payment writes now go only through
-- identity-bound RPCs.
drop policy if exists "agreements_update_participants" on public.agreements;
drop policy if exists "agreements_insert_participants" on public.agreements;
drop policy if exists "agreement_payments_insert_participants"
  on public.agreement_payments;
drop policy if exists "agreement_payments_update_participants"
  on public.agreement_payments;

revoke insert, update on table public.agreements from authenticated;
revoke insert, update on table public.agreement_payments from authenticated;

-- These two legacy workflow tables predate the evidence-weighted schema and
-- are not installed in every production lineage. Harden them when present
-- without making their absence block the new private workflow cutover.
do $legacy_evidence_cutover$
begin
  if to_regclass('public.agreement_evidence_items') is not null then
    execute 'drop policy if exists "agreement_evidence_items_insert_participants" on public.agreement_evidence_items';
    execute 'drop policy if exists "agreement_evidence_items_update_participants" on public.agreement_evidence_items';
    execute 'revoke insert, update on table public.agreement_evidence_items from authenticated';
  end if;

  if to_regclass('public.agreement_review_cases') is not null then
    execute 'drop policy if exists "agreement_review_cases_insert_participants" on public.agreement_review_cases';
    execute 'drop policy if exists "agreement_review_cases_update_participants" on public.agreement_review_cases';
    execute 'revoke insert, update on table public.agreement_review_cases from authenticated';
  end if;
end;
$legacy_evidence_cutover$;

notify pgrst, 'reload schema';
