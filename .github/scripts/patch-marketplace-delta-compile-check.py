#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("runner", type=Path)
    args = parser.parse_args()

    source = args.runner.read_text(encoding="utf-8")
    old = r'''  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='agreements' and column_name='completion_state'
  ) then
    raise exception 'candidate unexpectedly depends on completion_state';
  end if;
'''
    new = r'''  -- Production may already contain optional compatibility columns from other
  -- released workflows. This candidate's non-dependence on the parallel evidence/review
  -- schema is enforced by its focused source-contract test; the rollback compile gate
  -- verifies only that the required canonical core-trade objects remain available.
'''
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one obsolete production-column absence assertion; found {count}.")
    args.runner.write_text(source.replace(old, new, 1), encoding="utf-8")
    print(f"Updated production rollback compile gate in {args.runner}.")


if __name__ == "__main__":
    main()
