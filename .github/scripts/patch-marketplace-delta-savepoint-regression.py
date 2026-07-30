#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label}; found {count}.")
    return source.replace(old, new, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("materializer", type=Path)
    args = parser.parse_args()

    source = args.materializer.read_text(encoding="utf-8")

    initial_baseline = '''update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;

insert into public.interests(id, offer_id, user_id, interested_alias, message, status)
'''
    initial_with_savepoint = '''update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;

-- Everything after this point in the member case, including finalized milestone
-- terms and confirmations, can be undone without firing delete guards.
savepoint marketplace_member_case;

insert into public.interests(id, offer_id, user_id, interested_alias, message, status)
'''
    source = replace_once(
        source,
        initial_baseline,
        initial_with_savepoint,
        "initial member-case savepoint",
    )

    guarded_reset = '''-- Reset inside the same outer transaction and exercise claimed-guest acceptance.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;

-- The preceding responder confirmation deliberately binds auth.uid() to the responder.
-- Clear that synthetic request identity before restoring the transaction-local fixture;
-- guard_core_offer_mutation correctly forbids an authenticated user from reopening a
-- closed offer, while this postgres-admin test reset is rolled back at the end.
select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'service_role')::text,
  true
);

update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;
'''
    savepoint_reset = '''-- Restore the exact transaction-local clean fixture without deleting frozen
-- milestone terms. PostgreSQL undoes the member response, agreement, version,
-- milestone manifest, confirmations, thread linkage, and offer closure atomically.
rollback to savepoint marketplace_member_case;

select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'service_role')::text,
  true
);
'''
    source = replace_once(
        source,
        guarded_reset,
        savepoint_reset,
        "member-to-guest savepoint rollback",
    )

    args.materializer.write_text(source, encoding="utf-8")
    print(f"Isolated member and guest QA cases with a savepoint in {args.materializer}.")


if __name__ == "__main__":
    main()
