-- Narrow public read contract for the Moral Trade evidence directory and dossier.
--
-- Base transaction tables remain participant-only under RLS. These versioned
-- SECURITY DEFINER functions return only the public-safe evidence projection;
-- they never return private source paths, raw attestations, participant ids,
-- challenge text, email addresses, or safety-exception reasons.

create or replace function public.get_public_moral_trade_evidence_v1(
  p_record_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', a.id,
    'isExample', false,
    'accessScope', 'public',
    'lifecycle', a.lifecycle_status,
    'offeredCause', coalesce(nullif(o.offered_cause, ''), 'Moral priority'),
    'requestedCause', coalesce(nullif(o.requested_cause, ''), 'Counterparty priority'),
    'proposedAction', coalesce(nullif(v.proposed_action, ''), 'Action recorded in the agreement.'),
    'requestedAction', coalesce(nullif(v.requested_action, ''), 'Reciprocal action recorded in the agreement.'),
    'evidenceRule', coalesce(nullif(v.evidence_rule, ''), 'Evidence is evaluated against the frozen agreement.'),
    'duration', coalesce(nullif(v.duration, ''), 'Duration recorded in the agreement.'),
    'privacyScope', coalesce(nullif(v.privacy_scope, ''), 'Public-safe evidence only.'),
    'proposer', coalesce(nullif(proposer.display_name, ''), 'Proposer'),
    'responder', coalesce(nullif(responder.display_name, ''), 'Responder'),
    'createdAt', a.created_at,
    'activatedAt', a.activated_at,
    'completedAt', a.completed_at,
    'updatedAt', a.public_evidence_updated_at,
    'evidenceTotalCount', evidence.item_count,
    'evidence', evidence.items,
    'completionConfirmations', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'confirmed_at', confirmation.confirmed_at,
            'actor_display_name', case
              when confirmation.user_id = a.proposer_id
                then coalesce(nullif(proposer.display_name, ''), 'Proposer')
              when confirmation.user_id = a.responder_id
                then coalesce(nullif(responder.display_name, ''), 'Responder')
              else 'Participant'
            end
          )
          order by confirmation.confirmed_at
        )
        from public.trade_completion_confirmations confirmation
        where confirmation.agreement_id = a.id
      ),
      '[]'::jsonb
    )
  )
  from public.agreements a
  left join public.offers o on o.id = a.offer_id
  left join public.trade_agreement_versions v on v.id = a.current_version_id
  left join public.profiles proposer on proposer.id = a.proposer_id
  left join public.profiles responder on responder.id = a.responder_id
  join lateral (
    select
      count(*)::bigint as item_count,
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'id', e.id,
            'title', coalesce(nullif(e.public_title, ''), 'Published evidence'),
            'summary', coalesce(nullif(e.public_summary, ''), 'Evidence submitted under the frozen agreement.'),
            'evidenceType', e.evidence_type,
            'mimeType', nullif(e.public_mime_type, ''),
            'state', e.status,
            'submittedBy', coalesce(nullif(submitter.display_name, ''), 'Participant'),
            'submittedAt', e.created_at,
            'reviewedAt', e.reviewed_at,
            'challengeWindowEndsAt', e.challenge_window_ends_at,
            'redactionState', e.redaction_status,
            'redactionNote', coalesce(nullif(e.public_redaction_note, ''), 'Only the public-safe evidence record is available.'),
            'fileName', case
              when e.redaction_status in ('redacted', 'not_required')
                then nullif(e.public_original_filename, '')
              else null
            end,
            'publicUrl', case
              when e.redaction_status in ('redacted', 'not_required')
                and nullif(e.public_url, '') ~* '^https?://'
                then e.public_url
              else null
            end,
            'publicObjectPath', case
              when e.evidence_type = 'file'
                and e.redaction_status in ('redacted', 'not_required')
                then nullif(e.public_storage_path, '')
              else null
            end
          )
        )
        order by e.created_at, e.id
      ) as items
    from public.trade_evidence_items e
    left join public.profiles submitter on submitter.id = e.submitted_by
    where e.agreement_id = a.id
      and e.public_visibility = 'public'
      and e.public_published_at is not null
      and e.redaction_status <> 'withheld'
  ) evidence on evidence.item_count > 0
  where a.id = p_record_id
    and a.public_evidence_enabled is true;
$function$;

comment on function public.get_public_moral_trade_evidence_v1(uuid) is
  'Returns one public-safe Moral Trade evidence dossier, or null when the record is not publishable.';

alter function public.get_public_moral_trade_evidence_v1(uuid) owner to postgres;
revoke all on function public.get_public_moral_trade_evidence_v1(uuid) from public;
grant execute on function public.get_public_moral_trade_evidence_v1(uuid) to anon, authenticated;

create or replace function public.list_public_moral_trade_evidence_v1(
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with eligible as (
    select a.id, a.public_evidence_updated_at
    from public.agreements a
    where a.public_evidence_enabled is true
      and exists (
        select 1
        from public.trade_evidence_items e
        where e.agreement_id = a.id
          and e.public_visibility = 'public'
          and e.public_published_at is not null
          and e.redaction_status <> 'withheld'
      )
  ),
  evidence_page as (
    select eligible.id, eligible.public_evidence_updated_at
    from eligible
    order by eligible.public_evidence_updated_at desc, eligible.id desc
    limit least(greatest(coalesce(p_limit, 24), 1), 50)
    offset least(greatest(coalesce(p_offset, 0), 0), 100000)
  )
  select jsonb_build_object(
    'totalRecords', (select count(*) from eligible),
    'records', coalesce(
      (
        select jsonb_agg(
          public.get_public_moral_trade_evidence_v1(evidence_page.id)
          order by evidence_page.public_evidence_updated_at desc, evidence_page.id desc
        )
        from evidence_page
      ),
      '[]'::jsonb
    )
  );
$function$;

comment on function public.list_public_moral_trade_evidence_v1(integer, integer) is
  'Returns a bounded, stably ordered page of public-safe Moral Trade evidence dossiers and the exact trade count.';

alter function public.list_public_moral_trade_evidence_v1(integer, integer) owner to postgres;
revoke all on function public.list_public_moral_trade_evidence_v1(integer, integer) from public;
grant execute on function public.list_public_moral_trade_evidence_v1(integer, integer) to anon, authenticated;

-- Storage remains private. Anonymous and signed-in visitors may request a short-
-- lived URL only for the exact certified/redacted public copy referenced by a
-- publishable evidence item. Private source uploads never satisfy this predicate.
create or replace function public.can_read_public_trade_evidence_object_v1(
  target_bucket_id text,
  target_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    target_bucket_id = 'trade-evidence'
    and coalesce(target_object_name, '') <> ''
    and exists (
      select 1
      from public.trade_evidence_items e
      join public.agreements a on a.id = e.agreement_id
      where a.public_evidence_enabled is true
        and e.public_visibility = 'public'
        and e.public_published_at is not null
        and e.redaction_status in ('redacted', 'not_required')
        and e.public_storage_path <> ''
        and e.public_storage_path = target_object_name
    );
$function$;

comment on function public.can_read_public_trade_evidence_object_v1(text, text) is
  'Authorizes only a certified/redacted public-safe evidence object; never a private source upload.';

alter function public.can_read_public_trade_evidence_object_v1(text, text) owner to postgres;
revoke all on function public.can_read_public_trade_evidence_object_v1(text, text) from public;
grant execute on function public.can_read_public_trade_evidence_object_v1(text, text) to anon, authenticated;

drop policy if exists "public_safe_trade_evidence_read" on storage.objects;
create policy "public_safe_trade_evidence_read"
on storage.objects
for select
to anon, authenticated
using (public.can_read_public_trade_evidence_object_v1(bucket_id, name));
