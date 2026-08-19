from __future__ import annotations

import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit("usage: pr737_phase_order_repair.py TARGET_ROOT")

root = Path(sys.argv[1]).resolve()

compact_path = root / ".github/workflows/mpgf-public-goods-compacts-qa.yml"
compact = compact_path.read_text(encoding="utf-8")
start_marker = (
    "      - name: Apply the historical baseline and every "
    "production-compatible migration in order\n"
)
end_marker = "      - name: Stop and erase the ephemeral Supabase runtime\n"
if compact.count(start_marker) != 1 or compact.count(end_marker) != 1:
    raise SystemExit("Could not identify the unique adjacent Compact database phase block.")
start = compact.index(start_marker)
end = compact.index(end_marker, start)
replacement = '''      - name: Apply historical baseline and production-compatible pre-ledger migrations in order
        shell: bash
        run: |
          set -euo pipefail
          qa_skips=20260811152545_commitments_impact_study_instrumentation_qa_only.sql,20260811152958_commitments_impact_study_instrumentation_child_trigger_fix.sql,20260811161238_commitments_impact_study_instrumentation_review_remediation_core.sql,20260811161445_commitments_impact_study_instrumentation_review_remediation_instance_validator.sql,20260811161708_commitments_impact_study_instrumentation_review_remediation_child_validators.sql,20260811161948_commitments_impact_study_instrumentation_review_remediation_rpcs.sql,20260811162054_commitments_impact_study_instrumentation_review_remediation_privileges.sql,20260811171544_commitments_impact_study_blocked_probe_service_role.sql
          ledger_skips=20260816141500_compact_authoritative_outflow_ledger_v1.sql,20260816141501_compact_authoritative_outflow_freeze_v1.sql,20260816141502_compact_authoritative_outflow_hardening_v1.sql,20260816141503_compact_authoritative_outflow_replay_fix_v1.sql
          SUPABASE_MIGRATION_TEST_DB_URL="$LOCAL_SUPABASE_DB_URL" \
          SUPABASE_MIGRATION_BASELINE_SQL=mpgf-compacts-clean-qa/historical-baseline.sql \
          SUPABASE_MIGRATION_SKIP_BASENAMES="${qa_skips},${ledger_skips}" \
            bash scripts/apply-supabase-migrations-in-order.sh \
              mpgf-compacts-clean-qa/post-baseline-migrations \
            2>&1 | tee mpgf-compacts-clean-qa/pre-ledger-migration-chain.log
          test "$(grep -c '^skipping_environment_bound_migration=' mpgf-compacts-clean-qa/pre-ledger-migration-chain.log)" -eq 12
          grep --fixed-strings --quiet 'applying_migration=20260813163052_mpgf_public_goods_compacts.sql' mpgf-compacts-clean-qa/pre-ledger-migration-chain.log
          grep --fixed-strings --quiet 'applying_migration=20260814031500_mpgf_public_goods_compacts_state_hardening.sql' mpgf-compacts-clean-qa/pre-ledger-migration-chain.log
          grep --fixed-strings --quiet 'skipped_environment_bound_migration_count=12' mpgf-compacts-clean-qa/pre-ledger-migration-chain.log
          for version in 20260816141500 20260816141501 20260816141502 20260816141503; do
            if grep -q "applying_migration=${version}_" mpgf-compacts-clean-qa/pre-ledger-migration-chain.log; then
              echo "Authoritative-ledger migration ${version} ran before legacy Compact validation." >&2
              exit 1
            fi
          done

      - name: Run legacy role, lifecycle, privacy, and no-money tests before ledger authority hardening
        shell: bash
        run: |
          set -euo pipefail
          psql "$LOCAL_SUPABASE_DB_URL" \
            --no-psqlrc \
            --set ON_ERROR_STOP=1 <<'SQL' \
            | tee mpgf-compacts-clean-qa/pre-ledger-database-lifecycle.log
          begin;
          \i supabase/tests/mpgf_public_goods_compacts_lifecycle.sql
          \i supabase/tests/mpgf_public_goods_compacts_historical_freeze.sql
          rollback;
          SQL

      - name: Run genuinely concurrent readiness freeze before ledger authority hardening
        shell: bash
        run: |
          set -euo pipefail
          MPGF_COMPACT_TEST_DB_URL="$LOCAL_SUPABASE_DB_URL" \
            bash scripts/test-mpgf-public-goods-compacts-concurrency.sh \
            2>&1 | tee mpgf-compacts-clean-qa/pre-ledger-database-concurrency.log

      - name: Apply the four authoritative-ledger migrations after legacy Compact validation
        shell: bash
        run: |
          set -euo pipefail
          : > mpgf-compacts-clean-qa/authoritative-ledger-migrations.log
          for migration in \
            supabase/migrations/20260816141500_compact_authoritative_outflow_ledger_v1.sql \
            supabase/migrations/20260816141501_compact_authoritative_outflow_freeze_v1.sql \
            supabase/migrations/20260816141502_compact_authoritative_outflow_hardening_v1.sql \
            supabase/migrations/20260816141503_compact_authoritative_outflow_replay_fix_v1.sql
          do
            echo "applying_authoritative_ledger_migration=$(basename "$migration")" \
              | tee -a mpgf-compacts-clean-qa/authoritative-ledger-migrations.log
            psql "$LOCAL_SUPABASE_DB_URL" \
              --no-psqlrc \
              --set ON_ERROR_STOP=1 \
              --file "$migration" \
              2>&1 | tee -a mpgf-compacts-clean-qa/authoritative-ledger-migrations.log
          done
          for version in 20260816141500 20260816141501 20260816141502 20260816141503; do
            grep -q "applying_authoritative_ledger_migration=${version}_" \
              mpgf-compacts-clean-qa/authoritative-ledger-migrations.log
          done

      - name: Generate and compare exact final runtime database types
        shell: bash
        run: |
          set -euo pipefail
          supabase gen types typescript \
            --db-url "$LOCAL_SUPABASE_DB_URL" \
            --schema public \
            > mpgf-compacts-clean-qa/generated-database.types.ts
          test -s mpgf-compacts-clean-qa/generated-database.types.ts
          node scripts/verify-mpgf-public-goods-compacts-generated-types.mjs \
            mpgf-compacts-clean-qa/generated-database.types.ts \
            src/lib/supabase/database.types.ts \
            | tee mpgf-compacts-clean-qa/generated-type-comparison.json

      - name: Run final-schema Supabase database lint with Compact-owned error gate
        shell: bash
        run: |
          set -euo pipefail
          supabase db lint \
            --db-url "$LOCAL_SUPABASE_DB_URL" \
            --schema public \
            --level warning \
            --fail-on none \
            2>&1 | tee mpgf-compacts-clean-qa/supabase-db-lint.log
          node scripts/verify-mpgf-public-goods-compacts-db-lint.mjs \
            mpgf-compacts-clean-qa/supabase-db-lint.log \
            | tee mpgf-compacts-clean-qa/supabase-db-lint-compact-gate.json

      - name: Prove final schema preserved no-activation and no-money boundaries
        shell: bash
        run: |
          set -euo pipefail
          psql "$LOCAL_SUPABASE_DB_URL" \
            --no-psqlrc \
            --tuples-only \
            --no-align \
            --set ON_ERROR_STOP=1 <<'SQL' \
            | sed '/^$/d' \
            | tee mpgf-compacts-clean-qa/final-no-money.txt
          select 'active_compacts|' || count(*) from public.mpgf_public_goods_compacts where status = 'active'
          union all select 'settled_contributions|' || count(*) from public.mpgf_public_goods_settled_contribution_snapshots
          union all select 'voting_snapshots|' || count(*) from public.mpgf_public_goods_voting_snapshots
          order by 1;
          SQL
          test "$(wc -l < mpgf-compacts-clean-qa/final-no-money.txt)" -eq 3
          grep -qx 'active_compacts|0' mpgf-compacts-clean-qa/final-no-money.txt
          grep -qx 'settled_contributions|0' mpgf-compacts-clean-qa/final-no-money.txt
          grep -qx 'voting_snapshots|0' mpgf-compacts-clean-qa/final-no-money.txt

'''
compact = compact[:start] + replacement + compact[end:]
for marker in (
    "Apply historical baseline and production-compatible pre-ledger migrations in order",
    "Run legacy role, lifecycle, privacy, and no-money tests before ledger authority hardening",
    "Run genuinely concurrent readiness freeze before ledger authority hardening",
    "Apply the four authoritative-ledger migrations after legacy Compact validation",
    "Generate and compare exact final runtime database types",
    "Run final-schema Supabase database lint with Compact-owned error gate",
    "Prove final schema preserved no-activation and no-money boundaries",
):
    if compact.count(marker) != 1:
        raise SystemExit(f"Adjacent Compact phase marker is not unique: {marker}")
compact_path.write_text(compact, encoding="utf-8")

ledger_path = root / ".github/workflows/compact-authoritative-outflow-ledger-qa.yml"
ledger = ledger_path.read_text(encoding="utf-8")
trigger_anchor = "      - .github/workflows/compact-authoritative-outflow-ledger-qa.yml\n"
scope_anchor = "          .github/workflows/compact-authoritative-outflow-ledger-qa.yml\n"
if ledger.count(trigger_anchor) != 1 or ledger.count(scope_anchor) != 1:
    raise SystemExit("Could not identify authoritative-ledger workflow anchors.")
ledger = ledger.replace(
    trigger_anchor,
    trigger_anchor + "      - .github/workflows/mpgf-public-goods-compacts-qa.yml\n",
    1,
)
ledger = ledger.replace(
    scope_anchor,
    scope_anchor + "          .github/workflows/mpgf-public-goods-compacts-qa.yml\n",
    1,
)
old_scope_assertion = 'test "$(wc -l < /tmp/actual.txt)" -eq 15'
if ledger.count(old_scope_assertion) != 1:
    raise SystemExit("Could not identify 15-file scope assertion.")
ledger = ledger.replace(
    old_scope_assertion,
    'test "$(wc -l < /tmp/actual.txt)" -eq 16',
    1,
)
ledger_path.write_text(ledger, encoding="utf-8")

test_path = root / "src/lib/mpgf/compact-authoritative-outflow-phase-order-contract.test.ts"
test_source = test_path.read_text(encoding="utf-8")
declaration_anchor = '''const workflow = readFileSync(
  join(
    process.cwd(),
    ".github/workflows/compact-authoritative-outflow-ledger-qa.yml",
  ),
  "utf8",
);
'''
adjacent_declaration = '''
const adjacentCompactWorkflow = readFileSync(
  join(process.cwd(), ".github/workflows/mpgf-public-goods-compacts-qa.yml"),
  "utf8",
);

function adjacentPosition(marker: string): number {
  const index = adjacentCompactWorkflow.indexOf(marker);
  assert.notEqual(index, -1, `Missing adjacent Compact workflow phase: ${marker}`);
  return index;
}
'''
if test_source.count(declaration_anchor) != 1:
    raise SystemExit("Could not identify phase-order test declaration.")
test_source = test_source.replace(
    declaration_anchor,
    declaration_anchor + adjacent_declaration,
    1,
)
if "adjacent Compact QA runs legacy regressions before ledger authority hardening" in test_source:
    raise SystemExit("Adjacent Compact phase-order test already exists unexpectedly.")
test_source += '''

test("adjacent Compact QA runs legacy regressions before ledger authority hardening", () => {
  const preLedgerApply = adjacentPosition(
    "Apply historical baseline and production-compatible pre-ledger migrations in order",
  );
  const legacyRegression = adjacentPosition(
    "Run legacy role, lifecycle, privacy, and no-money tests before ledger authority hardening",
  );
  const legacyConcurrency = adjacentPosition(
    "Run genuinely concurrent readiness freeze before ledger authority hardening",
  );
  const ledgerApply = adjacentPosition(
    "Apply the four authoritative-ledger migrations after legacy Compact validation",
  );
  const finalTypes = adjacentPosition(
    "Generate and compare exact final runtime database types",
  );
  const finalNoMoney = adjacentPosition(
    "Prove final schema preserved no-activation and no-money boundaries",
  );

  assert.ok(preLedgerApply < legacyRegression);
  assert.ok(legacyRegression < legacyConcurrency);
  assert.ok(legacyConcurrency < ledgerApply);
  assert.ok(ledgerApply < finalTypes);
  assert.ok(finalTypes < finalNoMoney);
  assert.match(
    adjacentCompactWorkflow,
    /ledger_skips=20260816141500_compact_authoritative_outflow_ledger_v1\.sql,20260816141501_compact_authoritative_outflow_freeze_v1\.sql,20260816141502_compact_authoritative_outflow_hardening_v1\.sql,20260816141503_compact_authoritative_outflow_replay_fix_v1\.sql/,
  );
  assert.match(adjacentCompactWorkflow, /skipped_environment_bound_migration_count=12/);
  assert.match(adjacentCompactWorkflow, /test "\$\(wc -l < mpgf-compacts-clean-qa\/final-no-money\.txt\)" -eq 3/);
});
'''
test_path.write_text(test_source, encoding="utf-8")
