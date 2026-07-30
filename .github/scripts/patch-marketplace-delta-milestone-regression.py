#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("materializer", type=Path)
    args = parser.parse_args()

    source = args.materializer.read_text(encoding="utf-8")
    old = '''  confirmation := public.confirm_agreement_version_v2(owner_profile_id, agreement_id_value, version_id_value);
'''
    new = '''  -- Current core trade versions require at least one independently described
  -- milestone and a finalized manifest before either participant may confirm.
  -- This is transaction-local QA data and is rolled back with the entire regression.
  insert into public.trade_agreement_milestones(
    agreement_id,
    agreement_version_id,
    position,
    performer_id,
    payer_id,
    action_category,
    description,
    unit_label,
    units_total,
    indivisible,
    maximum_amount_cents,
    currency,
    evidence_rule
  )
  select
    agreement_id_value,
    version_id_value,
    1,
    responder_profile_id,
    owner_profile_id,
    'other',
    'Synthetic reciprocal commitment for the marketplace atomic-acceptance regression.',
    'commitment',
    1,
    true,
    0,
    'USD',
    v.evidence_rule
  from public.trade_agreement_versions v
  where v.id=version_id_value;

  perform public.finalize_trade_milestone_manifest_v1(version_id_value);

  confirmation := public.confirm_agreement_version_v2(owner_profile_id, agreement_id_value, version_id_value);
'''
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one first member-confirmation marker; found {count}.")
    args.materializer.write_text(source.replace(old, new, 1), encoding="utf-8")
    print(f"Aligned QA confirmation regression with milestone manifests in {args.materializer}.")


if __name__ == "__main__":
    main()
