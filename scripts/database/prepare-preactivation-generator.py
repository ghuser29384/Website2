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
        raise SystemExit("usage: prepare-preactivation-generator.py INPUT OUTPUT")

    source = Path(sys.argv[1]).read_text()

    source = replace_once_or_verify(
        source,
        r"  E'\\n'," + "\n",
        r"  E'\n'," + "\n",
        "auth-trigger newline serialization",
    )

    source = replace_once_or_verify(
        source,
        '''CATALOG_SQL="$ROOT/scripts/database/preactivation-catalog.sql"
EVIDENCE_ROOT="${RUNNER_TEMP:-/tmp}/preactivation-baseline-${GITHUB_RUN_ID:-local}"
''',
        '''CATALOG_SQL="$ROOT/scripts/database/preactivation-catalog.sql"
POLICY_CATALOG_SQL="$ROOT/scripts/database/preactivation-policy-catalog.sql"
POLICY_DEFINITIONS_SQL="$ROOT/scripts/database/preactivation-policy-definitions.sql"
PRIVILEGE_SQL="$ROOT/scripts/database/preactivation-privilege-reconciliation.sql"
SEQUENCE_PRIVILEGE_SQL="$ROOT/scripts/database/preactivation-sequence-privilege-reconciliation.sql"
EVIDENCE_ROOT="${RUNNER_TEMP:-/tmp}/preactivation-baseline-${GITHUB_RUN_ID:-local}"
''',
        "source query variables",
    )

    source = replace_once_or_verify(
        source,
        '''SOURCE_CATALOG_AFTER="$WORK_DIR/source-catalog-after.tsv"
MIGRATION_HISTORY="$WORK_DIR/migration-history.tsv"
EXTENSIONS_SQL="$WORK_DIR/extensions.sql"
EXTENSIONS_TSV="$WORK_DIR/extensions.tsv"
AUTH_TRIGGERS="$WORK_DIR/auth-user-triggers.sql"
BASELINE_TMP="$WORK_DIR/schema.sql"
''',
        '''SOURCE_CATALOG_AFTER="$WORK_DIR/source-catalog-after.tsv"
SOURCE_POLICY_CATALOG_BEFORE="$WORK_DIR/source-policy-catalog-before.tsv"
SOURCE_POLICY_CATALOG_AFTER="$WORK_DIR/source-policy-catalog-after.tsv"
SOURCE_POLICY_DEFINITIONS="$EVIDENCE_ROOT/manifests/source-policy-definitions.tsv"
MIGRATION_HISTORY="$WORK_DIR/migration-history.tsv"
EXTENSIONS_SQL="$WORK_DIR/extensions.sql"
EXTENSIONS_TSV="$WORK_DIR/extensions.tsv"
AUTH_TRIGGERS="$WORK_DIR/auth-user-triggers.sql"
PRIVILEGE_RECONCILIATION="$WORK_DIR/privilege-reconciliation.sql"
SEQUENCE_PRIVILEGE_RECONCILIATION="$WORK_DIR/sequence-privilege-reconciliation.sql"
BASELINE_TMP="$WORK_DIR/schema.sql"
''',
        "generated artifact variables",
    )

    source = replace_once_or_verify(
        source,
        '''readonly_file() {
  local input="$1"
  local output="$2"
  local wrapper
  wrapper="$(mktemp "$WORK_DIR/read-only.XXXXXX.sql")"
  {
    printf 'begin read only;\\n'
    cat "$input"
  } > "$wrapper"
  psql "$PROD_SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$wrapper" \\
    > "$output"
  rm -f "$wrapper"
}

readonly_query \\
''',
        '''readonly_file() {
  local input="$1"
  local output="$2"
  local wrapper
  wrapper="$(mktemp "$WORK_DIR/read-only.XXXXXX.sql")"
  {
    printf 'begin read only;\\n'
    cat "$input"
  } > "$wrapper"
  psql "$PROD_SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$wrapper" \\
    > "$output"
  rm -f "$wrapper"
}

normalize_catalog() {
  local catalog_input="$1"
  local policy_input="$2"
  local output="$3"
  local without_policies
  without_policies="$(mktemp "$WORK_DIR/catalog-without-policies.XXXXXX.tsv")"
  grep -v $'^POLICY\\t' "$catalog_input" > "$without_policies" || true
  cat "$policy_input" >> "$without_policies"
  LC_ALL=C sort -u "$without_policies" > "$output"
  rm -f "$without_policies"
}

readonly_query \\
''',
        "catalog normalization helper",
    )

    source = replace_once_or_verify(
        source,
        '''readonly_file "$CATALOG_SQL" "$SOURCE_CATALOG_BEFORE"
LC_ALL=C sort -u "$SOURCE_CATALOG_BEFORE" > "$SOURCE_CATALOG"
if [[ ! -s "$SOURCE_CATALOG" ]]; then
''',
        '''readonly_file "$CATALOG_SQL" "$SOURCE_CATALOG_BEFORE"
readonly_file "$POLICY_CATALOG_SQL" "$SOURCE_POLICY_CATALOG_BEFORE"
readonly_file "$POLICY_DEFINITIONS_SQL" "$SOURCE_POLICY_DEFINITIONS"
normalize_catalog "$SOURCE_CATALOG_BEFORE" "$SOURCE_POLICY_CATALOG_BEFORE" "$SOURCE_CATALOG"
if [[ ! -s "$SOURCE_CATALOG" ]]; then
''',
        "initial policy-normalized catalog capture",
    )

    source = replace_once_or_verify(
        source,
        '''if [[ ! -s "$AUTH_TRIGGERS" ]]; then
  fail "The production auth-to-profile trigger boundary is empty."
fi

# This is the only source read outside an explicit SQL READ ONLY transaction.
''',
        '''if [[ ! -s "$AUTH_TRIGGERS" ]]; then
  fail "The production auth-to-profile trigger boundary is empty."
fi

readonly_query "$PRIVILEGE_RECONCILIATION" "$(cat "$PRIVILEGE_SQL")" -At
if [[ ! -s "$PRIVILEGE_RECONCILIATION" ]]; then
  fail "The production privilege reconciliation boundary is empty."
fi
readonly_query "$SEQUENCE_PRIVILEGE_RECONCILIATION" "$(cat "$SEQUENCE_PRIVILEGE_SQL")" -At
if [[ ! -s "$SEQUENCE_PRIVILEGE_RECONCILIATION" ]]; then
  fail "The production sequence privilege reconciliation boundary is empty."
fi

# This is the only source read outside an explicit SQL READ ONLY transaction.
''',
        "privilege reconciliation capture",
    )

    source = replace_once_or_verify(
        source,
        '''readonly_file "$CATALOG_SQL" "$SOURCE_CATALOG_AFTER"
LC_ALL=C sort -u "$SOURCE_CATALOG_AFTER" > "$WORK_DIR/source-catalog-after.sorted.tsv"
if ! cmp "$SOURCE_CATALOG" "$WORK_DIR/source-catalog-after.sorted.tsv"; then
''',
        '''readonly_file "$CATALOG_SQL" "$SOURCE_CATALOG_AFTER"
readonly_file "$POLICY_CATALOG_SQL" "$SOURCE_POLICY_CATALOG_AFTER"
normalize_catalog \\
  "$SOURCE_CATALOG_AFTER" \\
  "$SOURCE_POLICY_CATALOG_AFTER" \\
  "$WORK_DIR/source-catalog-after.sorted.tsv"
if ! cmp "$SOURCE_CATALOG" "$WORK_DIR/source-catalog-after.sorted.tsv"; then
''',
        "post-capture policy-normalized catalog check",
    )

    source = replace_once_or_verify(
        source,
        '''cat "$DUMP_NORMALIZED" >> "$BASELINE_TMP"
printf '\\n-- Application-owned trigger(s) on Supabase-managed auth.users.\\n' >> "$BASELINE_TMP"
cat "$AUTH_TRIGGERS" >> "$BASELINE_TMP"
''',
        '''cat "$DUMP_NORMALIZED" >> "$BASELINE_TMP"
printf '\\n-- Reconcile application privileges after portable no-owner replay.\\n' >> "$BASELINE_TMP"
cat "$PRIVILEGE_RECONCILIATION" >> "$BASELINE_TMP"
cat "$SEQUENCE_PRIVILEGE_RECONCILIATION" >> "$BASELINE_TMP"
printf '\\n-- Application-owned trigger(s) on Supabase-managed auth.users.\\n' >> "$BASELINE_TMP"
cat "$AUTH_TRIGGERS" >> "$BASELINE_TMP"
''',
        "baseline privilege reconciliation assembly",
    )

    Path(sys.argv[2]).write_text(source)


if __name__ == "__main__":
    main()
