-- Make the operator's Every.org handoff safely resumable.
--
-- The frozen bundle owns one immutable partner donation ID. Reopening the operator action after
-- navigation or a closed browser must return that same ID rather than requiring the caller to
-- reproduce it or attempting to assign a new provider identity.

create or replace function public.start_trade_donation_pool_bundle_checkout(
  p_actor_id uuid,
  p_bundle_id uuid,
  p_partner_donation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  bundle_row public.trade_donation_pool_bundles%rowtype;
  invalid_component_count integer;
begin
  select * into bundle_row
  from public.trade_donation_pool_bundles
  where id = p_bundle_id
  for update;
  if not found then
    raise exception 'Pooled-settlement bundle not found.';
  end if;

  if bundle_row.status = 'checkout_started' then
    if length(trim(coalesce(bundle_row.partner_donation_id, ''))) = 0 then
      update public.trade_donation_pool_bundles
      set
        status = 'needs_review',
        failure_code = 'provider_checkout_identity_missing',
        failure_message = 'The started provider checkout is missing its immutable partner donation ID.'
      where id = bundle_row.id;
      raise exception 'The started provider checkout is missing its immutable partner donation ID.';
    end if;
    return to_jsonb(bundle_row);
  end if;

  if bundle_row.status <> 'frozen' then
    raise exception 'Only a frozen or already-started bundle can open provider checkout.';
  end if;
  if length(trim(coalesce(p_partner_donation_id, ''))) = 0 then
    raise exception 'A unique partner donation ID is required.';
  end if;

  select count(*) into invalid_component_count
  from public.trade_donation_pool_bundle_items i
  join public.trade_donation_pool_obligations o on o.id = i.obligation_id
  join public.agreements a on a.id = i.agreement_id
  join public.trade_donation_terms t on t.id = i.donation_term_id
  where i.bundle_id = bundle_row.id
    and (
      o.status <> 'bundled'
      or o.bundle_id <> bundle_row.id
      or a.lifecycle_status <> 'awaiting_donation'
      or a.current_version_id <> i.agreement_version_id
      or t.agreement_version_id <> i.agreement_version_id
      or t.amount_cents <> i.allocation_cents
      or t.nonprofit_slug <> bundle_row.nonprofit_slug
      or t.currency <> bundle_row.currency
      or t.frequency <> bundle_row.frequency
    );
  if invalid_component_count > 0 then
    update public.trade_donation_pool_bundles
    set status = 'needs_review', failure_code = 'component_invalid_before_checkout',
        failure_message = 'One or more component obligations changed before provider checkout.'
    where id = bundle_row.id;
    raise exception 'The bundle contains a stale or invalid component.';
  end if;

  update public.trade_donation_pool_bundles
  set
    status = 'checkout_started',
    partner_donation_id = p_partner_donation_id,
    checkout_started_at = timezone('utc', now()),
    failure_code = '',
    failure_message = ''
  where id = bundle_row.id
  returning * into bundle_row;

  insert into public.trade_donation_pool_audit_events(
    actor_profile_id, actor_kind, event_type, object_type, object_id, details
  ) values (
    p_actor_id,
    'operator',
    'every_org_bundle_checkout_started',
    'bundle',
    bundle_row.id,
    jsonb_build_object('manifestHash', bundle_row.manifest_hash)
  );

  return to_jsonb(bundle_row);
end;
$$;

revoke all on function public.start_trade_donation_pool_bundle_checkout(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.start_trade_donation_pool_bundle_checkout(uuid, uuid, text)
  to service_role;
