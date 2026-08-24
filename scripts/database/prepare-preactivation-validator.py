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
POLICY_EQUIVALENCE_SQL="$ROOT/scripts/database/preactivation-policy-equivalence.sql"
SOURCE_POLICY_PROBES="$BASELINE_DIR/source_policy_probes.sql"
OUTPUT_DIR="${1:-$ROOT/artifacts/preactivation-baseline-clean-room}"
''',
        "policy equivalence source variables",
    )

    source = replace_once_or_verify(
        source,
        '''TARGET_CATALOG="$OUTPUT_DIR/target-catalog.tsv"
TARGET_CATALOG_NORMALIZED="$OUTPUT_DIR/target-catalog.normalized.tsv"
START_LOG="$OUTPUT_DIR/supabase-start.log"
''',
        '''TARGET_CATALOG="$OUTPUT_DIR/target-catalog.tsv"
TARGET_CATALOG_NORMALIZED="$OUTPUT_DIR/target-catalog.normalized.tsv"
POLICY_EQUIVALENCE="$OUTPUT_DIR/policy-equivalence.tsv"
POLICY_PROBE_CLEANUP="$OUTPUT_DIR/policy-probe-cleanup.sql"
START_LOG="$OUTPUT_DIR/supabase-start.log"
''',
        "policy equivalence target variables",
    )

    source = replace_once_or_verify(
        source,
        '''psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \\
  > "$TARGET_CATALOG"
LC_ALL=C sort -u "$TARGET_CATALOG" > "$TARGET_CATALOG_NORMALIZED"
LC_ALL=C diff -u "$SOURCE_CATALOG" "$TARGET_CATALOG_NORMALIZED" \\
  > "$OUTPUT_DIR/catalog.diff"
test ! -s "$OUTPUT_DIR/catalog.diff"

if docker exec -i "$DB_CONTAINER" \\
''',
        '''psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \\
  > "$TARGET_CATALOG"
grep -v $'^POLICY\\t' "$TARGET_CATALOG" | LC_ALL=C sort -u \\
  > "$TARGET_CATALOG_NORMALIZED"
LC_ALL=C diff -u "$SOURCE_CATALOG" "$TARGET_CATALOG_NORMALIZED" \\
  > "$OUTPUT_DIR/catalog.diff"
test ! -s "$OUTPUT_DIR/catalog.diff"

if [[ ! -s "$SOURCE_POLICY_PROBES" ]]; then
  echo "The immutable source-policy probe contract is missing." >&2
  exit 1
fi
docker exec -i "$DB_CONTAINER" \\
  psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f - \\
  < "$SOURCE_POLICY_PROBES" > "$OUTPUT_DIR/policy-probe-apply.log" 2>&1
psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$POLICY_EQUIVALENCE_SQL" \\
  > "$POLICY_EQUIVALENCE"
psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -Atc "
select format('drop policy %I on %I.%I;', policyname, schemaname, tablename)
from pg_policies
where schemaname in ('public', 'moral_trade_private')
  and policyname like '__mt_baseline_probe_%'
order by schemaname, tablename, policyname;
" > "$POLICY_PROBE_CLEANUP"
docker exec -i "$DB_CONTAINER" \\
  psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f - \\
  < "$POLICY_PROBE_CLEANUP" > "$OUTPUT_DIR/policy-probe-cleanup.log" 2>&1
POLICY_PROBE_RESIDUE="$(psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -Atqc "
select count(*)
from pg_policies
where schemaname in ('public', 'moral_trade_private')
  and policyname like '__mt_baseline_probe_%';
")"
printf 'policy_probe_residue=%s\\n' "$POLICY_PROBE_RESIDUE" \\
  > "$OUTPUT_DIR/policy-probe-residue.txt"
test "$POLICY_PROBE_RESIDUE" = "0"
test ! -s "$POLICY_EQUIVALENCE"

if docker exec -i "$DB_CONTAINER" \\
''',
        "policy-independent catalog and same-server policy equivalence gate",
    )

    source = replace_once_or_verify(
        source,
        '''printf 'catalog_match=true\\nauth_profile_trigger=true\\nactivation_stage_absent=true\\nnonempty_guard=true\\nadmin_replay=true\\nzero_synthetic_residue=true\\n' \\
  > "$OUTPUT_DIR/result.txt"
''',
        '''printf 'catalog_match=true\\npolicy_equivalence=true\\npolicy_probe_residue=0\\nauth_profile_trigger=true\\nactivation_stage_absent=true\\nnonempty_guard=true\\nadmin_replay=true\\nzero_synthetic_residue=true\\n' \\
  > "$OUTPUT_DIR/result.txt"
''',
        "clean-room policy equivalence result flags",
    )

    Path(sys.argv[2]).write_text(source)


if __name__ == "__main__":
    main()
