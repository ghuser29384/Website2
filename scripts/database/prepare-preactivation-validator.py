#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


def replace_once_or_verify(source: str, old: str, new: str, label: str) -> str:
    old_count = source.count(old)
    new_count = source.count(new)
    if old_count == 1:
        return source.replace(old, new)
    if old_count == 0 and new_count == 1:
        return source
    raise SystemExit(
        f"{label}: expected exactly one old form or exactly one new form; "
        f"found old={old_count}, new={new_count}."
    )


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: prepare-preactivation-validator.py INPUT OUTPUT")

    source = Path(sys.argv[1]).read_text()

    source = replace_once_or_verify(
        source,
        '''CATALOG_SQL="$ROOT/scripts/database/preactivation-catalog.sql"
OUTPUT_DIR="${1:-$ROOT/artifacts/preactivation-baseline-clean-room}"
''',
        '''CATALOG_SQL="$ROOT/scripts/database/preactivation-catalog.sql"
POLICY_CATALOG_SQL="$ROOT/scripts/database/preactivation-policy-catalog.sql"
POLICY_DEFINITIONS_SQL="$ROOT/scripts/database/preactivation-policy-definitions.sql"
OUTPUT_DIR="${1:-$ROOT/artifacts/preactivation-baseline-clean-room}"
''',
        "policy catalog source variable",
    )

    source = replace_once_or_verify(
        source,
        '''TARGET_CATALOG="$OUTPUT_DIR/target-catalog.tsv"
TARGET_CATALOG_NORMALIZED="$OUTPUT_DIR/target-catalog.normalized.tsv"
START_LOG="$OUTPUT_DIR/supabase-start.log"
''',
        '''TARGET_CATALOG="$OUTPUT_DIR/target-catalog.tsv"
TARGET_POLICY_CATALOG="$OUTPUT_DIR/target-policy-catalog.tsv"
TARGET_POLICY_DEFINITIONS="$OUTPUT_DIR/target-policy-definitions.tsv"
TARGET_CATALOG_BASE="$OUTPUT_DIR/target-catalog-without-policies.tsv"
TARGET_CATALOG_NORMALIZED="$OUTPUT_DIR/target-catalog.normalized.tsv"
START_LOG="$OUTPUT_DIR/supabase-start.log"
''',
        "policy catalog target variables",
    )

    source = replace_once_or_verify(
        source,
        '''psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \\
  > "$TARGET_CATALOG"
LC_ALL=C sort -u "$TARGET_CATALOG" > "$TARGET_CATALOG_NORMALIZED"
LC_ALL=C diff -u "$SOURCE_CATALOG" "$TARGET_CATALOG_NORMALIZED" \\
''',
        '''psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \\
  > "$TARGET_CATALOG"
psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$POLICY_CATALOG_SQL" \\
  > "$TARGET_POLICY_CATALOG"
psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$POLICY_DEFINITIONS_SQL" \\
  > "$TARGET_POLICY_DEFINITIONS"
grep -v $'^POLICY\\t' "$TARGET_CATALOG" > "$TARGET_CATALOG_BASE" || true
cat "$TARGET_POLICY_CATALOG" >> "$TARGET_CATALOG_BASE"
LC_ALL=C sort -u "$TARGET_CATALOG_BASE" > "$TARGET_CATALOG_NORMALIZED"
LC_ALL=C diff -u "$SOURCE_CATALOG" "$TARGET_CATALOG_NORMALIZED" \\
''',
        "policy-normalized target catalog capture",
    )

    Path(sys.argv[2]).write_text(source)


if __name__ == "__main__":
    main()
