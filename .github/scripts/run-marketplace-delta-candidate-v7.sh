#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

path = Path('.github/scripts/materialize-marketplace-delta.py')
source = path.read_text(encoding='utf-8')

old_second_confirmation = '''  confirmation := public.confirm_agreement_version_v2(responder_profile_id, agreement_id_value, version_id_value);
  if not coalesce((confirmation->>'active')::boolean, false) then
'''
new_second_confirmation = '''  perform set_config('request.jwt.claim.sub', responder_profile_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', responder_profile_id::text, 'role', 'authenticated')::text,
    true
  );
  confirmation := public.confirm_agreement_version_v2(responder_profile_id, agreement_id_value, version_id_value);
  if not coalesce((confirmation->>'active')::boolean, false) then
'''
if source.count(old_second_confirmation) != 1:
    raise SystemExit(
        f'Expected one responder confirmation marker; found {source.count(old_second_confirmation)}.'
    )
source = source.replace(old_second_confirmation, new_second_confirmation, 1)

old_guest_declare = '''DO $guest_success$
declare
  result jsonb;
'''
new_guest_declare = '''DO $guest_success$
declare
  owner_profile_id uuid := (select id from public.profiles where email='qa-market-owner@example.com');
  result jsonb;
'''
if source.count(old_guest_declare) != 1:
    raise SystemExit(f'Expected one guest declaration marker; found {source.count(old_guest_declare)}.')
source = source.replace(old_guest_declare, new_guest_declare, 1)

old_guest_begin = '''begin
  result := public.accept_marketplace_guest_interest_v1(
'''
new_guest_begin = '''begin
  perform set_config('request.jwt.claim.sub', owner_profile_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_profile_id::text, 'role', 'authenticated')::text,
    true
  );
  result := public.accept_marketplace_guest_interest_v1(
'''
if source.count(old_guest_begin) != 1:
    raise SystemExit(f'Expected one guest execution marker; found {source.count(old_guest_begin)}.')
source = source.replace(old_guest_begin, new_guest_begin, 1)

path.write_text(source, encoding='utf-8')
PY

bash .github/scripts/run-marketplace-delta-candidate-v6.sh
