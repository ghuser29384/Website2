from __future__ import annotations

from pathlib import Path

WORKFLOW = Path(".github/workflows/institutional-trade-qa.yml")


def main() -> None:
    text = WORKFLOW.read_text()
    slash = chr(92)

    regression = f"            src/institutional-pool-record-trigger.test.ts {slash}\n"
    if regression not in text:
        anchor = f"            src/institutional-product-completeness.test.ts {slash}\n"
        if text.count(anchor) != 1:
            raise SystemExit("Could not locate the source-contract test insertion point.")
        text = text.replace(anchor, anchor + regression, 1)

    old_title = "      - name: Compile and apply institutional migration atomically to isolated QA\n"
    new_title = "      - name: Compile and apply institutional migrations atomically to isolated QA\n"
    if old_title in text:
        text = text.replace(old_title, new_title, 1)
    elif new_title not in text:
        raise SystemExit("Could not locate the institutional migration step title.")

    start_marker = "          migration=supabase/migrations/20260726123000_institutional_trade_system.sql\n"
    inventory_marker = (
        "          psql \"$QA_SUPABASE_DB_URL\" -v ON_ERROR_STOP=1 -P pager=off "
        "<<'SQL' | tee institutional-qa-artifacts/institutional-schema-inventory.txt\n"
    )
    start = text.find(start_marker)
    end = text.find(inventory_marker, start)
    if start < 0 or end < 0:
        raise SystemExit("Could not locate the institutional migration replay block.")

    block = [
        "          base_migration=supabase/migrations/20260726123000_institutional_trade_system.sql",
        "          additive_migration=supabase/migrations/20260731173000_fix_institutional_pool_record_status_access.sql",
        "          sha256sum \"$base_migration\" \"$additive_migration\" | tee institutional-qa-artifacts/institutional-migrations.sha256",
        "          present=\"$(psql \"$QA_SUPABASE_DB_URL\" -Atqc \"select to_regclass('public.institutional_organizations') is not null\")\"",
        "          if [[ \"$present\" == \"t\" ]]; then",
        "            echo \"Compiling the idempotent additive institutional migration inside a rollback-only transaction.\"",
        "            psql \"$QA_SUPABASE_DB_URL\" -v ON_ERROR_STOP=1 <<SQL",
        "          begin;",
        "          " + slash + "i $additive_migration",
        "          rollback;",
        "          SQL",
        "            echo \"Applying the additive institutional migration atomically to isolated QA.\"",
        "            psql \"$QA_SUPABASE_DB_URL\" -v ON_ERROR_STOP=1 --single-transaction --file \"$additive_migration\"",
        "          else",
        "            echo \"Compiling the complete ordered institutional migration chain inside a rollback-only transaction.\"",
        "            psql \"$QA_SUPABASE_DB_URL\" -v ON_ERROR_STOP=1 <<SQL",
        "          begin;",
        "          " + slash + "i $base_migration",
        "          " + slash + "i $additive_migration",
        "          rollback;",
        "          SQL",
        "            echo \"Applying the complete ordered institutional migration chain atomically to isolated QA only.\"",
        "            psql \"$QA_SUPABASE_DB_URL\" -v ON_ERROR_STOP=1 <<SQL",
        "          begin;",
        "          " + slash + "i $base_migration",
        "          " + slash + "i $additive_migration",
        "          commit;",
        "          SQL",
        "          fi",
        "          psql \"$QA_SUPABASE_DB_URL\" -Atqc \"select pg_get_functiondef('public.institutional_validate_pool_record()'::regprocedure)\" " + slash,
        "            | tee institutional-qa-artifacts/institutional-pool-trigger-definition.sql " + slash,
        "            | grep -F \"to_jsonb(new)->>'status'\" >/dev/null",
        "          if grep -Eiq '(^|[^[:alnum:]_])new\\.status([^[:alnum:]_]|$)' institutional-qa-artifacts/institutional-pool-trigger-definition.sql; then",
        "            echo \"The isolated-QA trigger definition directly dereferences NEW.status.\" >&2",
        "            exit 1",
        "          fi",
    ]
    replacement = "\n".join(block) + "\n"
    text = text[:start] + replacement + text[end:]

    required_markers = [
        "src/institutional-pool-record-trigger.test.ts",
        "20260726123000_institutional_trade_system.sql",
        "20260731173000_fix_institutional_pool_record_status_access.sql",
        "institutional-pool-trigger-definition.sql",
    ]
    missing = [item for item in required_markers if item not in text]
    if missing:
        raise SystemExit(f"Durable QA workflow is missing markers: {missing}")

    WORKFLOW.write_text(text)


if __name__ == "__main__":
    main()
