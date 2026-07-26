\set ON_ERROR_STOP on
begin;

set local client_min_messages = notice;

do $test$
declare
  creator_profile_id uuid;
  commitment_id uuid := gen_random_uuid();
  expiring_commitment_id uuid := gen_random_uuid();
  mac_key_hex text := encode(extensions.gen_random_bytes(32), 'hex');
  account_token_a text := encode(extensions.digest(convert_to('collective-account-a', 'UTF8'), 'sha256'), 'hex');
  account_token_b text := encode(extensions.digest(convert_to('collective-account-b', 'UTF8'), 'sha256'), 'hex');
  account_token_c text := encode(extensions.digest(convert_to('collective-account-c', 'UTF8'), 'sha256'), 'hex');
  human_token_a text := encode(extensions.digest(convert_to('collective-human-a', 'UTF8'), 'sha256'), 'hex');
  human_token_b text := encode(extensions.digest(convert_to('collective-human-b', 'UTF8'), 'sha256'), 'hex');
  human_token_c text := encode(extensions.digest(convert_to('collective-human-c', 'UTF8'), 'sha256'), 'hex');
  nonce_a text := repeat('a', 48);
  nonce_b text := repeat('b', 48);
  nonce_c text := repeat('c', 48);
  identity_commitment_a text;
  identity_commitment_b text;
  identity_commitment_c text;
  result_a jsonb;
  result_b jsonb;
  activation_token uuid;
  signature_a uuid;
  signature_b uuid;
  signature_c uuid;
  valid_manifest jsonb;
  row_count_value integer;
begin
  select id into creator_profile_id
  from public.profiles
  order by created_at, id
  limit 1;

  if creator_profile_id is null then
    raise exception 'collective commitment regression requires at least one profile row';
  end if;

  identity_commitment_a := encode(
    extensions.hmac(
      convert_to('Alice Verified' || E'\n' || 'Example Institute' || E'\n' || nonce_a, 'UTF8'),
      decode(mac_key_hex, 'hex'),
      'sha256'
    ),
    'hex'
  );
  identity_commitment_b := encode(
    extensions.hmac(
      convert_to('Bob Verified' || E'\n' || '' || E'\n' || nonce_b, 'UTF8'),
      decode(mac_key_hex, 'hex'),
      'sha256'
    ),
    'hex'
  );
  identity_commitment_c := encode(
    extensions.hmac(
      convert_to('Carol Expiring' || E'\n' || '' || E'\n' || nonce_c, 'UTF8'),
      decode(mac_key_hex, 'hex'),
      'sha256'
    ),
    'hex'
  );

  perform public.create_collective_commitment_v1(
    commitment_id,
    creator_profile_id,
    'Collective identity regression',
    'workplace_organizing',
    'We intend to vote together on the exact workplace proposition recorded here.',
    'Current workers in the reviewed bargaining unit.',
    'Operator-confirmed current worker eligibility.',
    2,
    clock_timestamp() + interval '30 minutes',
    'high',
    array['employment', 'legal', 'reputational']::text[],
    encode(extensions.digest(convert_to('frozen-terms-main', 'UTF8'), 'sha256'), 'hex'),
    'wrapped-key-ciphertext',
    'wrapped-key-iv',
    'wrapped-key-tag'
  );

  result_a := public.add_collective_commitment_signature_v1(
    commitment_id, account_token_a, human_token_a, identity_commitment_a, nonce_a,
    'ciphertext-a', 'iv-a', 'tag-a', clock_timestamp()
  );
  signature_a := (result_a->>'signatureId')::uuid;

  if result_a->>'status' <> 'open' or (result_a->>'qualifyingSignerCount')::integer <> 1 then
    raise exception 'first signature did not leave the commitment open with count 1: %', result_a;
  end if;

  begin
    perform public.add_collective_commitment_signature_v1(
      commitment_id, account_token_a, human_token_c, identity_commitment_c, nonce_c,
      'ciphertext-duplicate-account', 'iv', 'tag', clock_timestamp()
    );
    raise exception 'duplicate account unexpectedly counted';
  exception
    when unique_violation then
      if sqlerrm not like '%collective_commitment_duplicate_account%' then
        raise;
      end if;
  end;

  begin
    perform public.add_collective_commitment_signature_v1(
      commitment_id, account_token_c, human_token_a, identity_commitment_c, nonce_c,
      'ciphertext-duplicate-human', 'iv', 'tag', clock_timestamp()
    );
    raise exception 'duplicate human unexpectedly counted';
  exception
    when unique_violation then
      if sqlerrm not like '%collective_commitment_duplicate_human%' then
        raise;
      end if;
  end;

  result_a := public.withdraw_collective_commitment_signature_v1(commitment_id, account_token_a);
  if not (result_a->>'withdrawn')::boolean or (result_a->>'qualifyingSignerCount')::integer <> 0 then
    raise exception 'withdrawal did not remove the signature: %', result_a;
  end if;

  result_a := public.add_collective_commitment_signature_v1(
    commitment_id, account_token_a, human_token_a, identity_commitment_a, nonce_a,
    'ciphertext-a-resigned', 'iv-a-resigned', 'tag-a-resigned', clock_timestamp()
  );
  signature_a := (result_a->>'signatureId')::uuid;

  result_b := public.add_collective_commitment_signature_v1(
    commitment_id, account_token_b, human_token_b, identity_commitment_b, nonce_b,
    'ciphertext-b', 'iv-b', 'tag-b', clock_timestamp()
  );
  signature_b := (result_b->>'signatureId')::uuid;
  activation_token := (result_b->>'activationToken')::uuid;

  if result_b->>'status' <> 'activating'
     or (result_b->>'qualifyingSignerCount')::integer <> 2
     or activation_token is null then
    raise exception 'threshold did not enter activating state exactly: %', result_b;
  end if;

  begin
    perform public.activate_collective_commitment_v1(
      commitment_id,
      activation_token,
      jsonb_build_array(
        jsonb_build_object(
          'signatureId', signature_a,
          'verifiedRealName', 'Alice Verified',
          'verifiedAffiliation', 'Example Institute',
          'revealNonce', nonce_a,
          'identityCommitment', identity_commitment_a
        )
      ),
      mac_key_hex
    );
    raise exception 'incomplete reveal manifest unexpectedly activated';
  exception
    when check_violation then
      if sqlerrm not like '%collective_commitment_manifest_count_mismatch%' then
        raise;
      end if;
  end;

  begin
    perform public.activate_collective_commitment_v1(
      commitment_id,
      activation_token,
      jsonb_build_array(
        jsonb_build_object(
          'signatureId', signature_a,
          'verifiedRealName', 'Alice Altered',
          'verifiedAffiliation', 'Example Institute',
          'revealNonce', nonce_a,
          'identityCommitment', identity_commitment_a
        ),
        jsonb_build_object(
          'signatureId', signature_b,
          'verifiedRealName', 'Bob Verified',
          'verifiedAffiliation', null,
          'revealNonce', nonce_b,
          'identityCommitment', identity_commitment_b
        )
      ),
      mac_key_hex
    );
    raise exception 'altered reveal manifest unexpectedly activated';
  exception
    when check_violation then
      if sqlerrm not like '%collective_commitment_manifest_exactness_or_mac_failed%' then
        raise;
      end if;
  end;

  select count(*)::integer into row_count_value
  from public.collective_commitment_public_signers signer
  where signer.commitment_id = commitment_id;
  if row_count_value <> 0 then
    raise exception 'a failed manifest published identities';
  end if;

  valid_manifest := jsonb_build_array(
    jsonb_build_object(
      'signatureId', signature_a,
      'verifiedRealName', 'Alice Verified',
      'verifiedAffiliation', 'Example Institute',
      'revealNonce', nonce_a,
      'identityCommitment', identity_commitment_a
    ),
    jsonb_build_object(
      'signatureId', signature_b,
      'verifiedRealName', 'Bob Verified',
      'verifiedAffiliation', null,
      'revealNonce', nonce_b,
      'identityCommitment', identity_commitment_b
    )
  );

  perform public.activate_collective_commitment_v1(
    commitment_id, activation_token, valid_manifest, mac_key_hex
  );

  if not exists (
    select 1 from public.collective_commitments
    where id = commitment_id and status = 'active' and activated_at is not null
  ) then
    raise exception 'valid manifest did not activate the commitment';
  end if;

  select count(*)::integer into row_count_value
  from public.collective_commitment_public_signers
  where collective_commitment_public_signers.commitment_id = commitment_id;
  if row_count_value <> 2 then
    raise exception 'valid activation did not reveal exactly two signers';
  end if;

  if exists (
    select 1 from public.collective_commitment_public_signers
    where collective_commitment_public_signers.commitment_id = commitment_id
      and verified_real_name = 'Bob Verified'
      and verified_affiliation is not null
  ) then
    raise exception 'opted-out affiliation became public';
  end if;

  if exists (
    select 1 from public.collective_commitment_private_signatures
    where collective_commitment_private_signatures.commitment_id = commitment_id
  ) or exists (
    select 1 from public.collective_commitment_keys
    where collective_commitment_keys.commitment_id = commitment_id
  ) then
    raise exception 'private ciphertext or the per-commitment key survived activation';
  end if;

  if not exists (
    select 1 from public.collective_commitment_receipts
    where collective_commitment_receipts.commitment_id = commitment_id
      and outcome = 'active' and signer_count = 2
      and signer_manifest_hash is not null
  ) then
    raise exception 'active receipt missing or incomplete';
  end if;

  begin
    update public.collective_commitments
    set title = 'Mutated frozen title'
    where id = commitment_id;
    raise exception 'frozen terms were mutable';
  exception
    when check_violation then
      if sqlerrm not like '%collective_commitment_frozen_terms_immutable%' then
        raise;
      end if;
  end;

  perform public.create_collective_commitment_v1(
    expiring_commitment_id,
    creator_profile_id,
    'Expiring collective identity regression',
    'public_letter',
    'We will sign this exact public letter only if the threshold is reached.',
    'Current reviewed participants.',
    'Operator-confirmed eligibility.',
    2,
    clock_timestamp() + interval '1 second',
    'high',
    array['reputational', 'political']::text[],
    encode(extensions.digest(convert_to('frozen-terms-expiry', 'UTF8'), 'sha256'), 'hex'),
    'wrapped-expiry-key',
    'wrapped-expiry-iv',
    'wrapped-expiry-tag'
  );

  result_a := public.add_collective_commitment_signature_v1(
    expiring_commitment_id, account_token_c, human_token_c, identity_commitment_c, nonce_c,
    'ciphertext-expiring', 'iv-expiring', 'tag-expiring', clock_timestamp()
  );
  signature_c := (result_a->>'signatureId')::uuid;
  if signature_c is null then
    raise exception 'expiring signature was not recorded';
  end if;

  perform pg_sleep(1.15);
  perform public.expire_collective_commitments_v1();

  if not exists (
    select 1 from public.collective_commitments
    where id = expiring_commitment_id and status = 'expired' and expired_at is not null
  ) then
    raise exception 'due commitment did not expire';
  end if;
  if exists (
    select 1 from public.collective_commitment_private_signatures
    where collective_commitment_private_signatures.commitment_id = expiring_commitment_id
  ) or exists (
    select 1 from public.collective_commitment_keys
    where collective_commitment_keys.commitment_id = expiring_commitment_id
  ) then
    raise exception 'private ciphertext or key survived expiry';
  end if;
  if exists (
    select 1 from public.collective_commitment_public_signers
    where collective_commitment_public_signers.commitment_id = expiring_commitment_id
  ) then
    raise exception 'expiry published a signer';
  end if;
  if not exists (
    select 1 from public.collective_commitment_receipts
    where collective_commitment_receipts.commitment_id = expiring_commitment_id
      and outcome = 'expired' and signer_count = 0 and signer_manifest_hash is null
  ) then
    raise exception 'expired receipt missing or disclosed a manifest';
  end if;

  if has_table_privilege('authenticated', 'public.collective_commitment_private_signatures', 'select')
     or has_table_privilege('authenticated', 'public.collective_commitment_keys', 'select')
     or has_table_privilege('authenticated', 'public.collective_identity_credentials', 'select')
     or has_table_privilege('authenticated', 'public.collective_commitments', 'select') then
    raise exception 'authenticated role retained direct access to sensitive collective tables';
  end if;
  if not has_table_privilege('anon', 'public.collective_commitment_public_signers', 'select')
     or not has_table_privilege('authenticated', 'public.collective_commitment_receipts', 'select') then
    raise exception 'public reveal tables are not readable after activation';
  end if;

  raise notice 'PASS: duplicate-human and duplicate-account signatures are rejected';
  raise notice 'PASS: withdrawal and re-signing preserve exact private counts';
  raise notice 'PASS: incomplete or altered reveal manifests publish zero identities';
  raise notice 'PASS: exact manifest activation publishes all names atomically and only opted-in affiliations';
  raise notice 'PASS: activation and expiry erase private ciphertext and per-commitment keys';
  raise notice 'PASS: frozen terms and direct sensitive-table access are denied';
end;
$test$;

rollback;
