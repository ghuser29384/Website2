-- Forward repair for the JSONB reveal-manifest row alias used by the
-- collective identity-threshold activation RPC. The original migration has
-- already been applied in isolated QA, so this repair is additive.

begin;

create or replace function public.activate_collective_commitment_v1(
  p_commitment_id uuid,
  p_activation_token uuid,
  p_manifest jsonb,
  p_mac_key_hex text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  commitment_row public.collective_commitments%rowtype;
  signature_count integer;
  manifest_count integer;
  manifest_unique_count integer;
  invalid_count integer;
  revealed_at_value timestamptz := clock_timestamp();
  signer_manifest jsonb;
  signer_manifest_hash text;
  receipt_hash_value text;
begin
  select * into commitment_row
  from public.collective_commitments
  where id = p_commitment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'collective_commitment_not_found';
  end if;
  if commitment_row.status <> 'activating'
     or commitment_row.activation_token is distinct from p_activation_token then
    raise exception using errcode = '55000', message = 'collective_commitment_activation_token_invalid';
  end if;
  if p_manifest is null or jsonb_typeof(p_manifest) <> 'array' then
    raise exception using errcode = '22023', message = 'collective_commitment_manifest_must_be_array';
  end if;

  select count(*)::integer into signature_count
  from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;
  manifest_count := jsonb_array_length(p_manifest);

  if signature_count <> commitment_row.threshold_count or manifest_count <> signature_count then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_count_mismatch';
  end if;

  select count(distinct (entry->>'signatureId'))::integer
  into manifest_unique_count
  from jsonb_array_elements(p_manifest) as manifest(entry);
  if manifest_unique_count <> manifest_count then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_duplicate_signature';
  end if;

  select count(*)::integer into invalid_count
  from public.collective_commitment_private_signatures signature
  full join jsonb_array_elements(p_manifest) as manifest(entry)
    on (entry->>'signatureId')::uuid = signature.id
   and signature.commitment_id = p_commitment_id
  where signature.id is null
     or entry is null
     or entry->>'revealNonce' is distinct from signature.reveal_nonce
     or entry->>'identityCommitment' is distinct from signature.identity_commitment
     or char_length(btrim(coalesce(entry->>'verifiedRealName', ''))) = 0
     or (entry ? 'verifiedAffiliation' and entry->'verifiedAffiliation' <> 'null'::jsonb
         and char_length(btrim(coalesce(entry->>'verifiedAffiliation', ''))) = 0)
     or encode(
          extensions.hmac(
            convert_to(
              btrim(entry->>'verifiedRealName') || E'\n' ||
              btrim(coalesce(entry->>'verifiedAffiliation', '')) || E'\n' ||
              entry->>'revealNonce',
              'UTF8'
            ),
            decode(p_mac_key_hex, 'hex'),
            'sha256'
          ),
          'hex'
        ) is distinct from signature.identity_commitment;

  if invalid_count <> 0 then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_exactness_or_mac_failed';
  end if;

  insert into public.collective_commitment_public_signers (
    commitment_id, ordinal, verified_real_name, verified_affiliation,
    signed_at, revealed_at, identity_commitment
  )
  select
    p_commitment_id,
    row_number() over (order by signature.signed_at, signature.id)::integer,
    btrim(entry->>'verifiedRealName'),
    nullif(btrim(coalesce(entry->>'verifiedAffiliation', '')), ''),
    signature.signed_at,
    revealed_at_value,
    signature.identity_commitment
  from public.collective_commitment_private_signatures signature
  join jsonb_array_elements(p_manifest) as manifest(entry)
    on (entry->>'signatureId')::uuid = signature.id
  where signature.commitment_id = p_commitment_id
  order by signature.signed_at, signature.id;

  select jsonb_agg(
    jsonb_build_object(
      'identityCommitment', identity_commitment,
      'ordinal', ordinal,
      'signedAt', signed_at,
      'verifiedAffiliation', verified_affiliation,
      'verifiedRealName', verified_real_name
    ) order by ordinal
  ) into signer_manifest
  from public.collective_commitment_public_signers
  where commitment_id = p_commitment_id;

  signer_manifest_hash := encode(extensions.digest(convert_to(signer_manifest::text, 'UTF8'), 'sha256'), 'hex');
  receipt_hash_value := encode(
    extensions.digest(
      convert_to(
        commitment_row.terms_hash || E'\nactive\n' || signer_manifest_hash || E'\n' ||
        signature_count::text || E'\n' || revealed_at_value::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.collective_commitment_receipts (
    commitment_id, outcome, terms_hash, signer_manifest_hash, signer_count,
    receipt_hash, created_at
  ) values (
    p_commitment_id, 'active', commitment_row.terms_hash, signer_manifest_hash,
    signature_count, receipt_hash_value, revealed_at_value
  );

  perform set_config('moral_trade.collective_internal_write', 'on', true);
  update public.collective_commitments
  set status = 'active', activation_token = null, activation_started_at = null,
      activated_at = revealed_at_value, expired_at = null
  where id = p_commitment_id;

  delete from public.collective_commitment_private_signatures
  where commitment_id = p_commitment_id;
  delete from public.collective_commitment_keys
  where commitment_id = p_commitment_id;

  insert into public.collective_commitment_events (
    commitment_id, event_type, public_payload
  ) values (
    p_commitment_id, 'activated',
    jsonb_build_object(
      'signerCount', signature_count,
      'signerManifestHash', signer_manifest_hash,
      'receiptHash', receipt_hash_value
    )
  );

  return jsonb_build_object(
    'activated', true,
    'signerCount', signature_count,
    'signerManifestHash', signer_manifest_hash,
    'receiptHash', receipt_hash_value
  );
exception
  when invalid_text_representation then
    raise exception using errcode = '23514', message = 'collective_commitment_manifest_signature_id_invalid';
end;
$function$;

revoke all on function public.activate_collective_commitment_v1(uuid, uuid, jsonb, text)
from public, anon, authenticated;

grant execute on function public.activate_collective_commitment_v1(uuid, uuid, jsonb, text)
to service_role;

commit;
