from pathlib import Path
import re

path = Path(".github/workflows/mpgf-dac-product-lifecycle-gates.yml")
source = path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    source = source.replace(old, new, 1)


replace_once(
    "  push:\n    branches:\n      - fix/mpgf-dac-product-lifecycle-20260807\n",
    "  push:\n    branches:\n      - main\n",
    "push branch contract",
)
replace_once(
    "  pull_request:\n    branches:\n      - fix/mpgf-dac-success-lapse-20260807\n",
    "  pull_request:\n    branches:\n      - main\n",
    "pull-request branch contract",
)

migration_path_line = (
    '      - "supabase/migrations/20260807100000_mpgf_dac_public_terms_api.sql"\n'
)
migration_path_block = (
    migration_path_line
    + '      - "supabase/migrations/20260812073000_mpgf_dac_terminal_event_constraint_reconciliation.sql"\n'
    + '      - "supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql"\n'
)
if source.count(migration_path_line) != 2:
    raise SystemExit(
        "Expected the public-terms migration path in push and pull-request filters."
    )
source = source.replace(migration_path_line, migration_path_block)

concurrency_pattern = re.compile(
    r"concurrency:\n"
    r"  group: mpgf-dac-product-lifecycle-[^\n]+\n"
    r"  cancel-in-progress: true\n"
)
concurrency_replacement = (
    "concurrency:\n"
    "  # Every isolated-QA execution mutates the same deterministic synthetic IDs.\n"
    "  # Serialize all branches and events so another run cannot drift the shared QA\n"
    "  # schema or delete fixtures while an exact-head proof is in progress.\n"
    "  group: mpgf-dac-product-lifecycle-shared-qa\n"
    "  cancel-in-progress: false\n"
)
source, concurrency_count = concurrency_pattern.subn(
    concurrency_replacement, source, count=1
)
if concurrency_count != 1:
    raise SystemExit(
        f"shared-QA concurrency contract: expected one match, found {concurrency_count}"
    )

replace_once(
    "            sha256sum \\\n"
    "              supabase/migrations/20260807100000_mpgf_dac_public_terms_api.sql \\\n"
    "              supabase/tests/mpgf_dac_public_terms_api.sql \\\n",
    "            sha256sum \\\n"
    "              supabase/migrations/20260807100000_mpgf_dac_public_terms_api.sql \\\n"
    "              supabase/migrations/20260812073000_mpgf_dac_terminal_event_constraint_reconciliation.sql \\\n"
    "              supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql \\\n"
    "              supabase/tests/mpgf_dac_public_terms_api.sql \\\n",
    "exact-head migration hashes",
)

replace_once(
    "            src/lib/mpgf/dac-lifecycle-model.test.ts \\\n"
    "            src/lib/mpgf/dac-public-terms-migration.test.ts \\\n"
    "            src/lib/mpgf/dac-product-lifecycle.test.ts \\\n",
    "            src/lib/mpgf/dac-lifecycle-model.test.ts \\\n"
    "            src/lib/mpgf/dac-public-terms-migration.test.ts \\\n"
    "            src/lib/mpgf/dac-terminal-event-reconciliation-migration.test.ts \\\n"
    "            src/lib/mpgf/dac-terminal-schema-reconciliation-migration.test.ts \\\n"
    "            src/lib/mpgf/dac-product-lifecycle.test.ts \\\n",
    "focused migration contracts",
)

reconciliation_compile = """      - name: Compile terminal-schema reconciliation migrations in rollback-only transactions
        shell: bash
        run: |
          set -euo pipefail
          python3 - <<'PYCODE'
          from pathlib import Path

          migrations = [
              Path("supabase/migrations/20260812073000_mpgf_dac_terminal_event_constraint_reconciliation.sql"),
              Path("supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql"),
          ]
          for migration in migrations:
              source = migration.read_text()
              if not source.lstrip().startswith("begin;"):
                  raise SystemExit(f"{migration} does not begin with begin;")
              if not source.rstrip().endswith("commit;"):
                  raise SystemExit(f"{migration} does not end with commit;")
              target = Path(f"mpgf-dac-{migration.stem}-rollback.sql")
              target.write_text(source.rstrip()[:-len("commit;")] + "rollback;\\n")
          PYCODE
          for migration in \
            mpgf-dac-20260812073000_mpgf_dac_terminal_event_constraint_reconciliation-rollback.sql \
            mpgf-dac-20260812074500_mpgf_dac_terminal_schema_reconciliation-rollback.sql; do
            psql "$QA_SUPABASE_DB_URL" \
              --no-psqlrc \
              --set ON_ERROR_STOP=1 \
              --file "$migration"
          done 2>&1 | tee mpgf-dac-terminal-reconciliation-compile.log

"""
marker = (
    "      - name: Compile the additive public-terms migration in a rollback-only transaction\n"
)
if source.count(marker) != 1:
    raise SystemExit("Expected exactly one public-terms compile step marker.")
source = source.replace(marker, reconciliation_compile + marker, 1)

reconciliation_apply = """      - name: Reconcile exact terminal DAC schema immediately before fixtures
        shell: bash
        run: |
          set -euo pipefail
          sha256sum \
            supabase/migrations/20260812073000_mpgf_dac_terminal_event_constraint_reconciliation.sql \
            supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql \
            | tee mpgf-dac-terminal-reconciliation.sha256
          psql "$QA_SUPABASE_DB_URL" \
            --no-psqlrc \
            --set ON_ERROR_STOP=1 \
            --file supabase/migrations/20260812073000_mpgf_dac_terminal_event_constraint_reconciliation.sql \
            2>&1 | tee mpgf-dac-terminal-event-reconciliation-apply.log
          psql "$QA_SUPABASE_DB_URL" \
            --no-psqlrc \
            --set ON_ERROR_STOP=1 \
            --file supabase/migrations/20260812074500_mpgf_dac_terminal_schema_reconciliation.sql \
            2>&1 | tee mpgf-dac-terminal-schema-reconciliation-apply.log

      - name: Verify exact terminal constraint vocabulary after cleanup
        shell: bash
        run: |
          set -euo pipefail
          psql "$QA_SUPABASE_DB_URL" \
            --no-psqlrc \
            --set ON_ERROR_STOP=1 \
            --tuples-only \
            --no-align <<'SQL' | tee mpgf-dac-terminal-constraint-proof.txt
          select 'proposal_status=' || coalesce((
            select pg_get_constraintdef(oid, true) like '%succeeded%'
              and pg_get_constraintdef(oid, true) like '%lapsed%'
            from pg_constraint
            where conrelid = 'public.mpgf_pool_proposals'::regclass
              and conname = 'mpgf_pool_proposals_status_check'
          ), false);
          select 'proposal_lock=' || coalesce((
            select pg_get_constraintdef(oid, true) like '%approved_as_candidate%'
              and pg_get_constraintdef(oid, true) like '%succeeded%'
              and pg_get_constraintdef(oid, true) like '%lapsed%'
              and pg_get_constraintdef(oid, true) like '%operative_terms_sha256%'
            from pg_constraint
            where conrelid = 'public.mpgf_pool_proposals'::regclass
              and conname = 'mpgf_pool_proposals_lock_complete'
          ), false);
          select 'lifecycle_events=' || coalesce((
            select pg_get_constraintdef(oid, true) like '%pool_succeeded%'
              and pg_get_constraintdef(oid, true) like '%pool_lapsed%'
            from pg_constraint
            where conrelid = 'public.mpgf_pool_lifecycle_events'::regclass
              and conname = 'mpgf_pool_lifecycle_events_event_type_check'
          ), false);
          select 'pledge_events=' || coalesce((
            select pg_get_constraintdef(oid, true) like '%pledge_created%'
              and pg_get_constraintdef(oid, true) like '%eligibility_reviewed%'
              and pg_get_constraintdef(oid, true) like '%pledge_expired%'
            from pg_constraint
            where conrelid = 'public.mpgf_dac_pledge_events'::regclass
              and conname = 'mpgf_dac_pledge_events_type_valid'
          ), false);
          SQL
          grep -Fxq 'proposal_status=true' mpgf-dac-terminal-constraint-proof.txt
          grep -Fxq 'proposal_lock=true' mpgf-dac-terminal-constraint-proof.txt
          grep -Fxq 'lifecycle_events=true' mpgf-dac-terminal-constraint-proof.txt
          grep -Fxq 'pledge_events=true' mpgf-dac-terminal-constraint-proof.txt

"""
fixture_marker = (
    "      - name: Create deterministic open, succeeded, and lapsed browser fixtures\n"
)
if source.count(fixture_marker) != 1:
    raise SystemExit("Expected exactly one deterministic fixture marker.")
source = source.replace(fixture_marker, reconciliation_apply + fixture_marker, 1)

required = [
    "mpgf-dac-product-lifecycle-shared-qa",
    "20260812074500_mpgf_dac_terminal_schema_reconciliation.sql",
    "dac-terminal-schema-reconciliation-migration.test.ts",
    "Reconcile exact terminal DAC schema immediately before fixtures",
    "proposal_lock=true",
]
for fragment in required:
    if fragment not in source:
        raise SystemExit(f"Missing patched workflow fragment: {fragment}")

path.write_text(source)
