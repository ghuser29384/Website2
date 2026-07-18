-- Public-by-default evidence records for Moral Trade.
-- Base transaction tables remain RLS-protected. The public Next.js routes select a
-- deliberately narrow field set through the service role and mint short-lived URLs
-- only for copies whose redaction state is public-ready.

alter table public.agreements
  add column if not exists public_evidence_enabled boolean not null default true,
  add column if not exists public_evidence_exception_reason text not null default '',
  add column if not exists public_evidence_updated_at timestamptz not null default now();

comment on column public.agreements.public_evidence_enabled is
  'Public evidence is enabled by default. Disable only for a documented, narrowly tailored safety exception.';
comment on column public.agreements.public_evidence_exception_reason is
  'Operator-visible reason for a safety exception. Do not put sensitive facts in this field.';

alter table public.trade_evidence_items
  add column if not exists public_title text not null default '',
  add column if not exists public_summary text not null default '',
  add column if not exists public_url text not null default '',
  add column if not exists public_storage_path text not null default '',
  add column if not exists public_visibility text not null default 'public',
  add column if not exists redaction_status text not null default 'pending_review',
  add column if not exists public_redaction_note text not null default '',
  add column if not exists public_mime_type text not null default '',
  add column if not exists public_original_filename text not null default '',
  add column if not exists public_published_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_evidence_items_public_visibility_check'
      and conrelid = 'public.trade_evidence_items'::regclass
  ) then
    alter table public.trade_evidence_items
      add constraint trade_evidence_items_public_visibility_check
      check (public_visibility in ('public', 'withheld_safety'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_evidence_items_redaction_status_check'
      and conrelid = 'public.trade_evidence_items'::regclass
  ) then
    alter table public.trade_evidence_items
      add constraint trade_evidence_items_redaction_status_check
      check (redaction_status in ('pending_review', 'not_required', 'redacted', 'withheld'));
  end if;
end $$;

create index if not exists agreements_public_evidence_idx
  on public.agreements(public_evidence_enabled, public_evidence_updated_at desc)
  where public_evidence_enabled;

create index if not exists trade_evidence_items_public_agreement_idx
  on public.trade_evidence_items(agreement_id, created_at asc)
  where public_visibility = 'public';

create or replace function public.initialize_public_trade_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  evidence_is_public boolean := true;
  exception_reason text := '';
  inferred_filename text := '';
begin
  select
    coalesce(a.public_evidence_enabled, true),
    coalesce(a.public_evidence_exception_reason, '')
  into evidence_is_public, exception_reason
  from public.agreements a
  where a.id = new.agreement_id;

  inferred_filename := regexp_replace(coalesce(new.storage_path, ''), '^.*/', '');

  new.public_title := coalesce(nullif(btrim(new.public_title), ''),
    case new.evidence_type
      when 'attestation' then 'Participant attestation'
      when 'link' then 'External evidence link'
      else 'Submitted evidence file'
    end
  );

  new.public_summary := coalesce(
    nullif(btrim(new.public_summary), ''),
    nullif(btrim(new.attestation), ''),
    'Evidence submitted under the parties'' frozen agreement. The public record preserves its review and redaction state.'
  );
  new.public_original_filename := coalesce(
    nullif(btrim(new.public_original_filename), ''),
    inferred_filename
  );

  if not evidence_is_public then
    new.public_visibility := 'withheld_safety';
    new.redaction_status := 'withheld';
    new.public_title := 'Evidence withheld for safety';
    new.public_summary := 'Specific proof is withheld under a documented safety exception.';
    new.public_url := '';
    new.public_storage_path := '';
    new.public_original_filename := '';
    new.public_mime_type := '';
    new.public_redaction_note := 'Specific proof withheld under a documented safety exception.';
    new.public_published_at := null;
    return new;
  end if;

  new.public_visibility := 'public';
  new.public_published_at := coalesce(new.public_published_at, now());

  if new.evidence_type = 'file' then
    -- The evidence item and metadata are public immediately, but the private source
    -- upload is not exposed until a reviewer marks a public-safe copy as redacted or
    -- not_required. This prevents account numbers, exact addresses, or unrelated
    -- personal information from becoming public merely because a file was uploaded.
    new.redaction_status := coalesce(nullif(new.redaction_status, ''), 'pending_review');
    if new.redaction_status not in ('redacted', 'not_required') then
      new.redaction_status := 'pending_review';
      new.public_url := '';
      new.public_storage_path := '';
    end if;
    new.public_redaction_note := coalesce(
      nullif(btrim(new.public_redaction_note), ''),
      'The evidence record is public. The uploaded file remains unavailable until a public-safe copy passes redaction review.'
    );
  elsif new.evidence_type = 'link' then
    new.redaction_status := 'not_required';
    new.public_storage_path := '';
    new.public_url := coalesce(nullif(btrim(new.public_url), ''), new.evidence_url, '');
    new.public_redaction_note := coalesce(
      nullif(btrim(new.public_redaction_note), ''),
      'The participant supplied this link for public inspection.'
    );
  else
    new.redaction_status := 'not_required';
    new.public_storage_path := '';
    new.public_url := '';
    new.public_redaction_note := coalesce(
      nullif(btrim(new.public_redaction_note), ''),
      'This attestation is the public evidence. Private contact information is not shown.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_public_trade_evidence_trigger
  on public.trade_evidence_items;
create trigger initialize_public_trade_evidence_trigger
before insert on public.trade_evidence_items
for each row execute function public.initialize_public_trade_evidence();

create or replace function public.touch_public_evidence_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_agreement_id uuid;
begin
  if tg_op = 'DELETE' then
    target_agreement_id := old.agreement_id;
  else
    target_agreement_id := new.agreement_id;
  end if;

  update public.agreements
  set public_evidence_updated_at = now()
  where id = target_agreement_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists touch_public_evidence_record_trigger
  on public.trade_evidence_items;
create trigger touch_public_evidence_record_trigger
after insert or update or delete on public.trade_evidence_items
for each row execute function public.touch_public_evidence_record();

-- Fail closed for any evidence rows that predate this migration. Production had no
-- rows at rollout time, but this protects branches and restored databases.
update public.trade_evidence_items e
set
  public_visibility = case
    when coalesce(a.public_evidence_enabled, true) then 'public'
    else 'withheld_safety'
  end,
  redaction_status = case
    when not coalesce(a.public_evidence_enabled, true) then 'withheld'
    when e.evidence_type = 'file' then 'pending_review'
    else 'not_required'
  end,
  public_title = case
    when not coalesce(a.public_evidence_enabled, true) then 'Evidence withheld for safety'
    when btrim(e.public_title) <> '' then e.public_title
    when e.evidence_type = 'attestation' then 'Participant attestation'
    when e.evidence_type = 'link' then 'External evidence link'
    else 'Submitted evidence file'
  end,
  public_summary = case
    when not coalesce(a.public_evidence_enabled, true) then 'Specific proof is withheld under a documented safety exception.'
    when btrim(e.public_summary) <> '' then e.public_summary
    when btrim(e.attestation) <> '' then e.attestation
    else 'Evidence submitted under the parties'' frozen agreement. The public record preserves its review and redaction state.'
  end,
  public_url = case
    when not coalesce(a.public_evidence_enabled, true) then ''
    when e.evidence_type = 'link' then e.evidence_url
    else ''
  end,
  public_storage_path = '',
  public_original_filename = case
    when not coalesce(a.public_evidence_enabled, true) then ''
    when btrim(e.public_original_filename) <> '' then e.public_original_filename
    else regexp_replace(coalesce(e.storage_path, ''), '^.*/', '')
  end,
  public_redaction_note = case
    when btrim(e.public_redaction_note) <> '' then e.public_redaction_note
    when not coalesce(a.public_evidence_enabled, true) then 'Specific proof withheld under a documented safety exception.'
    when e.evidence_type = 'file' then 'The evidence record is public. The uploaded file remains unavailable until a public-safe copy passes redaction review.'
    when e.evidence_type = 'link' then 'The participant supplied this link for public inspection.'
    else 'This attestation is the public evidence. Private contact information is not shown.'
  end,
  public_published_at = case
    when coalesce(a.public_evidence_enabled, true) then coalesce(e.public_published_at, e.created_at)
    else null
  end
from public.agreements a
where a.id = e.agreement_id;

comment on column public.trade_evidence_items.public_visibility is
  'Public by default. withheld_safety is reserved for a documented safety exception.';
comment on column public.trade_evidence_items.public_storage_path is
  'Storage path for the certified or redacted public-safe copy. Never populate this with an unreviewed private source.';
comment on column public.trade_evidence_items.redaction_status is
  'Controls whether a stored source can be opened publicly. Public metadata remains visible while a file is pending review.';
comment on table public.trade_evidence_items is
  'Participant evidence. Base rows remain RLS-protected; public routes expose only a safe field projection and short-lived public-ready file URLs.';
