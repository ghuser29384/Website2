from __future__ import annotations

import os
from pathlib import Path

WORKFLOW_PATH = Path(".github/workflows/compact-authoritative-outflow-ledger-qa.yml")
CONTRACT_PATH = Path("src/lib/mpgf/compact-authoritative-outflow-phase-order-contract.test.ts")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_between(
    text: str,
    start: str,
    end: str,
    replacement: str,
    label: str,
) -> str:
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count != 1 or end_count != 1:
        raise SystemExit(
            f"{label}: expected one start/end marker, found {start_count}/{end_count}"
        )
    start_index = text.index(start)
    end_index = text.index(end, start_index)
    return text[:start_index] + replacement + text[end_index:]


def repair_workflow(text: str) -> str:
    text = replace_once(
        text,
        "      - name: Focused contracts\n        run: |\n",
        "      - name: Focused contracts\n        shell: bash\n        run: |\n          set -euo pipefail\n",
        "focused contracts pipefail",
    )

    for name, command in [
        ("Complete repository tests", "npm test 2>&1 | tee repository-tests.log"),
        ("ESLint", "npm run lint -- --quiet 2>&1 | tee eslint.log"),
        ("Strict TypeScript", "npx tsc --noEmit 2>&1 | tee typescript.log"),
        ("Production build", "npm run build 2>&1 | tee build.log"),
        (
            "Four-viewpoint browser contract",
            "npx playwright test tests/mpgf-public-goods-compacts.spec.ts --workers=1 --reporter=line 2>&1 | tee playwright.log",
        ),
    ]:
        text = replace_once(
            text,
            f"      - name: {name}\n        run: {command}\n",
            (
                f"      - name: {name}\n"
                "        shell: bash\n"
                "        run: |\n"
                "          set -euo pipefail\n"
                f"          {command}\n"
            ),
            f"{name} pipefail",
        )

    text = replace_once(
        text,
        "      - name: Generate and compare public runtime types\n        run: |\n",
        (
            "      - name: Generate and compare public runtime types\n"
            "        shell: bash\n"
            "        run: |\n"
            "          set -euo pipefail\n"
        ),
        "generated types pipefail",
    )

    text = replace_once(
        text,
        "      - name: Apply pre-ledger production-compatible migrations\n",
        "      - name: Apply baseline and every production-compatible pre-ledger migration\n",
        "pre-ledger phase name",
    )
    text = replace_once(
        text,
        "      - name: Validate original Compact lifecycle before ledger hardening\n",
        "      - name: Run legacy Compact regressions before ledger authority hardening\n",
        "legacy phase name",
    )
    text = replace_once(
        text,
        "      - name: Apply authoritative ledger migrations\n",
        "      - name: Apply the four authoritative-ledger migrations in order\n",
        "ledger migration phase name",
    )

    text = replace_between(
        text,
        "      - name: Lint final schema and execute authoritative ledger lifecycle\n",
        "      - name: Concurrent canonical freeze\n",
        """      - name: Lint final public and private schemas
        shell: bash
        run: |
          set -euo pipefail
          supabase db lint --db-url "$DB_URL" --schema public --level warning --fail-on none 2>&1 | tee db-evidence/public-lint.log
          supabase db lint --db-url "$DB_URL" --schema moral_trade_private --level warning --fail-on none 2>&1 | tee db-evidence/private-lint.log
          node scripts/verify-mpgf-public-goods-compacts-db-lint.mjs db-evidence/public-lint.log | tee db-evidence/owned-lint.json
      - name: Run final authoritative-ledger lifecycle and authorization suites
        shell: bash
        run: |
          set -euo pipefail
          psql "$DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 2>&1 <<'SQL' | tee db-evidence/ledger-lifecycle.log
          begin;
          \\i supabase/tests/compact_authoritative_outflow_ledger_core.sql
          \\i supabase/tests/compact_authoritative_outflow_ledger_authorization.sql
          rollback;
          SQL
""",
        "split final lint and lifecycle phases",
    )

    text = replace_between(
        text,
        "      - name: Record baseline\n",
        "      - name: Execute rollback-only staged lifecycle\n",
        """      - name: Record baseline and normalize rollback-only sources
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p compact-outflow-rollback/migrations compact-outflow-rollback/test-bodies
          psql "$QA_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 <<'SQL' | sed '/^$/d' > compact-outflow-rollback/before.txt
          select 'public_relations|' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'mpgf_public_goods_%'
          union all select 'private_relations|' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='moral_trade_private' and c.relname like 'compact_outflow_%'
          union all select 'fixture_users|' || count(*) from auth.users where email like 'ledger-%@example.test'
          union all select 'fixture_profiles|' || count(*) from public.profiles where email like 'ledger-%@example.test'
          order by 1;
          SQL
          python3 - <<'PY_NORMALIZE'
          from pathlib import Path

          output_root = Path("compact-outflow-rollback")

          def significant_indices(lines: list[str]) -> list[int]:
              return [
                  index
                  for index, line in enumerate(lines)
                  if line.strip() and not line.lstrip().startswith("--")
              ]

          def top_level(lines: list[str], command: str) -> list[int]:
              return [
                  index
                  for index, line in enumerate(lines)
                  if line.lower() == command
              ]

          def write_without(lines: list[str], removed: set[int], target: Path) -> None:
              target.write_text(
                  "\\n".join(
                      line for index, line in enumerate(lines) if index not in removed
                  )
                  + "\\n"
              )

          def normalize_migration(source: Path, target: Path) -> None:
              lines = source.read_text().splitlines()
              significant = significant_indices(lines)
              begins = top_level(lines, "begin;")
              commits = top_level(lines, "commit;")
              rollbacks = top_level(lines, "rollback;")
              if len(begins) > 1:
                  raise SystemExit(f"unexpected nested begin in {source}")
              if len(commits) > 1:
                  raise SystemExit(f"unexpected nested commit in {source}")
              if rollbacks:
                  raise SystemExit(f"unexpected nested rollback in migration {source}")
              if begins or commits:
                  if (
                      len(begins) != 1
                      or len(commits) != 1
                      or not significant
                      or begins[0] != significant[0]
                      or commits[0] != significant[-1]
                  ):
                      raise SystemExit(
                          f"migration {source} did not contain exactly one removable outer transaction envelope"
                      )
                  write_without(lines, {begins[0], commits[0]}, target)
              else:
                  write_without(lines, set(), target)

          def normalize_test_body(source: Path, target: Path) -> None:
              body = source.read_text()
              lines = body.splitlines()
              significant = significant_indices(lines)
              begins = top_level(lines, "begin;")
              commits = top_level(lines, "commit;")
              rollbacks = top_level(lines, "rollback;")
              if len(begins) > 1:
                  raise SystemExit(f"unexpected nested begin in {source}")
              if len(rollbacks) > 1:
                  raise SystemExit(f"unexpected nested rollback in {source}")
              if commits:
                  raise SystemExit(f"unexpected commit in rollback-only test {source}")
              if not begins and not rollbacks:
                  marker = body.lower()
                  if (
                      "workflow-owned transaction" not in marker
                      and "rollback-only transaction" not in marker
                  ):
                      raise SystemExit(
                          f"{source}: expected one rollback-only transaction envelope or an explicitly workflow-owned body"
                      )
                  write_without(lines, set(), target)
                  return
              if (
                  len(begins) != 1
                  or len(rollbacks) != 1
                  or not significant
                  or begins[0] != significant[0]
                  or rollbacks[0] != significant[-1]
              ):
                  raise SystemExit(
                      f"{source}: expected one rollback-only transaction envelope"
                  )
              write_without(lines, {begins[0], rollbacks[0]}, target)

          migration_names = [
              "20260607_moral_trade_release_gate_policy_snapshots.sql",
              "20260607_zzzzz_moral_trade_participant_eligibility_records.sql",
              "20260813163052_mpgf_public_goods_compacts.sql",
              "20260814031500_mpgf_public_goods_compacts_state_hardening.sql",
              "20260816141500_compact_authoritative_outflow_ledger_v1.sql",
              "20260816141501_compact_authoritative_outflow_freeze_v1.sql",
              "20260816141502_compact_authoritative_outflow_hardening_v1.sql",
              "20260816141503_compact_authoritative_outflow_replay_fix_v1.sql",
          ]
          for name in migration_names:
              normalize_migration(
                  Path("supabase/migrations") / name,
                  output_root / "migrations" / name,
              )

          test_names = [
              "mpgf_public_goods_compacts_lifecycle.sql",
              "mpgf_public_goods_compacts_historical_freeze.sql",
              "compact_authoritative_outflow_ledger_core.sql",
              "compact_authoritative_outflow_ledger_authorization.sql",
          ]
          for name in test_names:
              normalize_test_body(
                  Path("supabase/tests") / name,
                  output_root / "test-bodies" / name,
              )
          PY_NORMALIZE
""",
        "rollback source normalization",
    )

    text = replace_between(
        text,
        "      - name: Execute rollback-only staged lifecycle\n",
        "      - name: Prove rollback and zero residue\n",
        """      - name: Execute ordered rollback-only legacy and authoritative-ledger lifecycles
        shell: bash
        run: |
          set -euo pipefail
          psql "$QA_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 2>&1 <<'SQL' | tee compact-outflow-rollback/lifecycle.log
          begin;
          \\i compact-outflow-rollback/migrations/20260607_moral_trade_release_gate_policy_snapshots.sql
          \\i compact-outflow-rollback/migrations/20260607_zzzzz_moral_trade_participant_eligibility_records.sql
          \\i compact-outflow-rollback/migrations/20260813163052_mpgf_public_goods_compacts.sql
          \\i compact-outflow-rollback/migrations/20260814031500_mpgf_public_goods_compacts_state_hardening.sql

          savepoint legacy_compact_lifecycle;
          \\i compact-outflow-rollback/test-bodies/mpgf_public_goods_compacts_lifecycle.sql
          \\i compact-outflow-rollback/test-bodies/mpgf_public_goods_compacts_historical_freeze.sql
          rollback to savepoint legacy_compact_lifecycle;
          release savepoint legacy_compact_lifecycle;

          \\i compact-outflow-rollback/migrations/20260816141500_compact_authoritative_outflow_ledger_v1.sql
          \\i compact-outflow-rollback/migrations/20260816141501_compact_authoritative_outflow_freeze_v1.sql
          \\i compact-outflow-rollback/migrations/20260816141502_compact_authoritative_outflow_hardening_v1.sql
          \\i compact-outflow-rollback/migrations/20260816141503_compact_authoritative_outflow_replay_fix_v1.sql

          savepoint authoritative_ledger_core;
          \\i compact-outflow-rollback/test-bodies/compact_authoritative_outflow_ledger_core.sql
          rollback to savepoint authoritative_ledger_core;
          release savepoint authoritative_ledger_core;

          savepoint authoritative_ledger_authorization;
          \\i compact-outflow-rollback/test-bodies/compact_authoritative_outflow_ledger_authorization.sql
          rollback to savepoint authoritative_ledger_authorization;
          release savepoint authoritative_ledger_authorization;
          rollback;
          SQL
""",
        "ordered rollback lifecycle",
    )

    text = replace_between(
        text,
        "      - name: Prove rollback and zero residue\n",
        "      - name: Upload rollback evidence\n",
        """      - name: Prove rollback and zero fixture residue
        if: always()
        shell: bash
        run: |
          set -euo pipefail
          psql "$QA_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 <<'SQL' | sed '/^$/d' > compact-outflow-rollback/after.txt
          select 'public_relations|' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'mpgf_public_goods_%'
          union all select 'private_relations|' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='moral_trade_private' and c.relname like 'compact_outflow_%'
          union all select 'fixture_users|' || count(*) from auth.users where email like 'ledger-%@example.test'
          union all select 'fixture_profiles|' || count(*) from public.profiles where email like 'ledger-%@example.test'
          order by 1;
          SQL
          diff -u compact-outflow-rollback/before.txt compact-outflow-rollback/after.txt
          git rev-parse HEAD > compact-outflow-rollback/head-sha.txt
""",
        "rollback residue proof",
    )

    text = replace_once(
        text,
        "          path: rollback-evidence\n",
        "          path: compact-outflow-rollback\n",
        "rollback artifact path",
    )

    required = [
        "set -euo pipefail\n          node --import tsx --test",
        "Apply baseline and every production-compatible pre-ledger migration",
        "Run legacy Compact regressions before ledger authority hardening",
        "Apply the four authoritative-ledger migrations in order",
        "Run final authoritative-ledger lifecycle and authorization suites",
        "Execute ordered rollback-only legacy and authoritative-ledger lifecycles",
        "savepoint legacy_compact_lifecycle;",
        "savepoint authoritative_ledger_core;",
        "savepoint authoritative_ledger_authorization;",
        "compact-outflow-rollback/test-bodies/compact_authoritative_outflow_ledger_core.sql",
        "expected one rollback-only transaction envelope",
        "unexpected nested begin",
        "unexpected nested rollback",
        "Prove rollback and zero fixture residue",
    ]
    for marker in required:
        if marker not in text:
            raise SystemExit(f"required repaired marker absent: {marker}")

    for stale in [
        "      - name: Execute rollback-only staged lifecycle\n",
        "      - name: Lint final schema and execute authoritative ledger lifecycle\n",
    ]:
        if stale in text:
            raise SystemExit(f"stale validation phase remains: {stale.strip()}")

    return text


def repair_contract(text: str) -> str:
    old_adjacent = (
        '    "Run genuinely concurrent readiness freeze before ledger authority hardening",\n'
    )
    new_adjacent = (
        '    "Run genuinely concurrent readiness freeze test before ledger authority hardening",\n'
    )
    text = replace_once(
        text,
        old_adjacent,
        new_adjacent,
        "adjacent concurrency phase marker",
    )

    start_marker = "  assert.match(\n    workflow,\n    /grep -Ev "
    start_count = text.count(start_marker)
    if start_count != 1:
        raise SystemExit(
            f"obsolete clean-chain assertion: expected one start marker, found {start_count}"
        )
    start = text.index(start_marker)
    end_marker = "});\n\n"
    end = text.index(end_marker, start) + len(end_marker)
    replacement = r'''  assert.match(
    workflow,
    /ledger_skips=20260816141500_compact_authoritative_outflow_ledger_v1\.sql,20260816141501_compact_authoritative_outflow_freeze_v1\.sql,20260816141502_compact_authoritative_outflow_hardening_v1\.sql,20260816141503_compact_authoritative_outflow_replay_fix_v1\.sql/,
  );
  assert.match(
    workflow,
    /SUPABASE_MIGRATION_SKIP_BASENAMES="\$\{qa_skips\},\$\{ledger_skips\}"/,
  );
  assert.match(
    workflow,
    /if grep -q "applying_migration=\$\{version\}_"/,
  );
});

'''
    text = text[:start] + replacement + text[end:]

    required = [
        "Apply baseline and every production-compatible pre-ledger migration",
        "Run legacy Compact regressions before ledger authority hardening",
        "Apply the four authoritative-ledger migrations in order",
        "Run final authoritative-ledger lifecycle and authorization suites",
        "Execute ordered rollback-only legacy and authoritative-ledger lifecycles",
        "Run genuinely concurrent readiness freeze test before ledger authority hardening",
        "compact-outflow-rollback/test-bodies/compact_authoritative_outflow_ledger_core.sql",
        "expected one rollback-only transaction envelope",
    ]
    for marker in required:
        if marker not in text:
            raise SystemExit(f"repaired contract marker absent: {marker}")

    if "compact-outflow-clean/ledger-migrations.txt" in text:
        raise SystemExit("obsolete clean-chain assertion remains")

    return text


def main() -> None:
    expected_head = os.environ.get("EXPECTED_CANDIDATE_HEAD", "")
    if expected_head != "8bbd6dc887f827aa57ea21dd40a338b5ccbb9f91":
        raise SystemExit("unexpected candidate identity")

    workflow = repair_workflow(WORKFLOW_PATH.read_text())
    contract = repair_contract(CONTRACT_PATH.read_text())
    WORKFLOW_PATH.write_text(workflow)
    CONTRACT_PATH.write_text(contract)


if __name__ == "__main__":
    main()
