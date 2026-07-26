#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path
from textwrap import dedent

BASE_MIGRATION = Path(
    "supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql"
)
LINKING_MIGRATION = Path(
    "supabase/migrations/20260726163500_fix_atomic_acceptance_core_version_linking.sql"
)
INTERNAL_MIGRATION = Path(
    "supabase/migrations/20260726164500_fix_atomic_acceptance_core_internal_write.sql"
)
SQL_REGRESSION = Path("supabase/tests/marketplace_interest_acceptance_atomicity.sql")
SOURCE_TEST = Path("src/app/offers/marketplace-interest-acceptance.test.ts")
EXPECTED_LINKING_SHA = "5b18274904b4acf413cdfbca310aace5d46ef5ba4be77bfa235287f8ffcd0165"


def build_rpc_block() -> str:
    base = BASE_MIGRATION.read_text(encoding="utf-8")
    start = base.index("create or replace function public.accept_marketplace_interest_v1")
    end = base.index("notify pgrst, 'reload schema';", start)
    return base[start:end]


def build_linking_migration(rpc_block: str) -> str:
    agreement_insert = "  insert into public.agreements (\n"
    if rpc_block.count(agreement_insert) != 2:
        raise RuntimeError(
            f"Expected two marketplace agreement inserts; found {rpc_block.count(agreement_insert)}."
        )

    linked = rpc_block.replace(
        agreement_insert,
        "  perform set_config('app.core_trade_linking_agreement', '1', true);\n\n"
        + agreement_insert,
    )
    migration = (
        "-- The legacy agreement bridge creates the initial frozen core-trade version in an\n"
        "-- AFTER INSERT trigger. The version guard deliberately requires the transaction-local\n"
        "-- linking flag for system-created versions whose proposed_by participant may differ\n"
        "-- from the authenticated actor accepting the response. Keep the entire acceptance,\n"
        "-- agreement insert, version bridge, competing-response updates, and offer close in one\n"
        "-- transaction.\n\n"
        + linked
        + "notify pgrst, 'reload schema';\n"
    )
    digest = hashlib.sha256(migration.encode("utf-8")).hexdigest()
    if digest != EXPECTED_LINKING_SHA:
        raise RuntimeError(
            f"Generated linking migration changed: expected {EXPECTED_LINKING_SHA}, found {digest}."
        )
    return migration


def build_internal_migration(linking_migration: str) -> str:
    start = linking_migration.index(
        "create or replace function public.accept_marketplace_interest_v1"
    )
    end = linking_migration.index("notify pgrst, 'reload schema';", start)
    rpc_block = linking_migration[start:end]
    agreement_insert = "  insert into public.agreements (\n"
    linking_marker = (
        "  perform set_config('app.core_trade_linking_agreement', '1', true);\n\n"
        + agreement_insert
    )
    internal_marker = (
        "  perform set_config('app.core_trade_linking_agreement', '1', true);\n"
        "  perform set_config('app.core_trade_internal', '1', true);\n\n"
        + agreement_insert
    )
    if rpc_block.count(linking_marker) != 2:
        raise RuntimeError("Expected one linking marker in each acceptance RPC.")
    rpc_block = rpc_block.replace(linking_marker, internal_marker)

    returning_marker = "  returning id into agreement_id_value;"
    returning_with_reset = (
        "  returning id into agreement_id_value;\n\n"
        "  perform set_config('app.core_trade_linking_agreement', '', true);\n"
        "  perform set_config('app.core_trade_internal', '', true);"
    )
    if rpc_block.count(returning_marker) != 2:
        raise RuntimeError("Expected two agreement insert return markers.")
    rpc_block = rpc_block.replace(returning_marker, returning_with_reset)

    migration = (
        "-- The legacy agreement bridge also updates agreements.current_version_id after creating\n"
        "-- the initial frozen version. That update is an internal system transition, not a participant\n"
        "-- selecting a version. Set both transaction-local bridge guards only around the agreement\n"
        "-- insert and its synchronous triggers, then clear them before the remaining acceptance writes.\n\n"
        + rpc_block
        + "notify pgrst, 'reload schema';\n"
    )
    expected_counts = {
        "set_config('app.core_trade_linking_agreement', '1', true)": 2,
        "set_config('app.core_trade_internal', '1', true)": 2,
        "set_config('app.core_trade_linking_agreement', '', true)": 2,
        "set_config('app.core_trade_internal', '', true)": 2,
    }
    for token, expected in expected_counts.items():
        actual = migration.count(token)
        if actual != expected:
            raise RuntimeError(f"Expected {expected} occurrences of {token}; found {actual}.")
    return migration


def extend_sql_regression() -> None:
    source = SQL_REGRESSION.read_text(encoding="utf-8")
    old_tail = dedent(
        """\
        select 'PASS: failed agreement creation leaves the selected response pending and the offer open' as result;

        rollback;
        """
    )
    new_tail = dedent(
        """\
        select 'PASS: failed agreement creation leaves the selected response pending and the offer open' as result;

        select set_config('app.core_trade_linking_agreement', '', true);
        select set_config('app.core_trade_internal', '', true);
        drop trigger qa_force_marketplace_agreement_insert_failure_trigger on public.agreements;

        DO $success_exercise$
        declare
          acceptance_result jsonb;
        begin
          acceptance_result := public.accept_marketplace_interest_v1(
            '10000000-0000-4000-8000-000000000159'::uuid,
            '10000000-0000-4000-8000-000000000158'::uuid,
            'qa-atomicity-success',
            '',
            ''
          );

          if coalesce((acceptance_result->>'created')::boolean, false) is not true then
            raise exception 'Success regression: acceptance RPC did not report a newly created agreement: %.', acceptance_result;
          end if;
        end;
        $success_exercise$;

        DO $success_assertions$
        declare
          response_status text;
          offer_status text;
          agreement_row public.agreements%rowtype;
          agreement_count integer;
          version_count integer;
          linked_thread_count integer;
        begin
          select status::text into response_status
          from public.interests
          where id = '10000000-0000-4000-8000-000000000159'::uuid;

          select status::text into offer_status
          from public.offers
          where id = '10000000-0000-4000-8000-000000000158'::uuid;

          select count(*) into agreement_count
          from public.agreements
          where interest_id = '10000000-0000-4000-8000-000000000159'::uuid;

          select * into agreement_row
          from public.agreements
          where interest_id = '10000000-0000-4000-8000-000000000159'::uuid;

          select count(*) into version_count
          from public.trade_agreement_versions
          where agreement_id = agreement_row.id
            and id = agreement_row.current_version_id
            and version = 1;

          select count(*) into linked_thread_count
          from public.trade_threads
          where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
            and agreement_id = agreement_row.id
            and status = 'active';

          if response_status <> 'accepted' then
            raise exception 'Success regression: response status is %, expected accepted.', response_status;
          end if;
          if offer_status <> 'matched' then
            raise exception 'Success regression: offer status is %, expected matched.', offer_status;
          end if;
          if agreement_count <> 1 or agreement_row.id is null then
            raise exception 'Success regression: expected one agreement, found %.', agreement_count;
          end if;
          if agreement_row.status::text <> 'proposed'
             or agreement_row.lifecycle_status <> 'proposed'
             or agreement_row.current_version_id is null then
            raise exception 'Success regression: agreement was not bridged to one frozen proposed version: %.', to_jsonb(agreement_row);
          end if;
          if version_count <> 1 then
            raise exception 'Success regression: expected one current frozen version, found %.', version_count;
          end if;
          if linked_thread_count <> 1 then
            raise exception 'Success regression: expected one linked private thread, found %.', linked_thread_count;
          end if;
        end;
        $success_assertions$;

        select 'PASS: successful acceptance creates one proposed agreement, frozen version, and linked private thread' as result;

        rollback;
        """
    )
    if source.count(old_tail) != 1:
        raise RuntimeError("Expected one rollback-regression tail.")
    SQL_REGRESSION.write_text(source.replace(old_tail, new_tail, 1), encoding="utf-8")


def write_source_test() -> None:
    SOURCE_TEST.write_text(
        dedent(
            r'''\
            import assert from "node:assert/strict";
            import { readFileSync } from "node:fs";
            import path from "node:path";
            import test from "node:test";

            const repoRoot = process.cwd();
            const actions = readFileSync(path.join(repoRoot, "src/app/actions.ts"), "utf8");
            const completionMigration = readFileSync(
              path.join(
                repoRoot,
                "supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql",
              ),
              "utf8",
            );
            const linkingMigration = readFileSync(
              path.join(
                repoRoot,
                "supabase/migrations/20260726163500_fix_atomic_acceptance_core_version_linking.sql",
              ),
              "utf8",
            );
            const internalMigration = readFileSync(
              path.join(
                repoRoot,
                "supabase/migrations/20260726164500_fix_atomic_acceptance_core_internal_write.sql",
              ),
              "utf8",
            );
            const sqlRegression = readFileSync(
              path.join(repoRoot, "supabase/tests/marketplace_interest_acceptance_atomicity.sql"),
              "utf8",
            );

            function between(source: string, start: string, end: string) {
              const startIndex = source.indexOf(start);
              assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
              const endIndex = source.indexOf(end, startIndex + start.length);
              assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
              return source.slice(startIndex, endIndex);
            }

            test("member and guest acceptance use database transaction boundaries", () => {
              const member = between(
                actions,
                "export async function acceptInterestAction",
                "export async function acceptGuestInterestAction",
              );
              const guest = between(
                actions,
                "export async function acceptGuestInterestAction",
                "export async function rateAgreementAction",
              );

              assert.match(member, /accept_marketplace_interest_v1/);
              assert.doesNotMatch(
                member,
                /\.from\("interests"\)[\s\S]{0,160}\.update\(\{[\s\S]{0,80}status:\s*"accepted"/,
              );
              assert.match(guest, /accept_marketplace_guest_interest_v1/);
              assert.doesNotMatch(
                guest,
                /\.from\("guest_interests"\)[\s\S]{0,160}\.update\(\{[\s\S]{0,80}status:\s*"accepted"/,
              );
            });

            test("completion review remains separate from the bilateral lifecycle", () => {
              assert.match(
                completionMigration,
                /add column if not exists completion_state text not null default 'pending_evidence'/,
              );
              assert.match(completionMigration, /comment on column public\.agreements\.lifecycle_status/);
              assert.match(completionMigration, /create table if not exists public\.agreement_evidence_items/);
              assert.match(completionMigration, /create table if not exists public\.agreement_review_cases/);
            });

            test("atomic acceptance authorizes only the synchronous legacy bridge", () => {
              assert.equal(
                (linkingMigration.match(/set_config\('app\.core_trade_linking_agreement', '1', true\)/g) ?? []).length,
                2,
              );
              assert.equal(
                (internalMigration.match(/set_config\('app\.core_trade_linking_agreement', '1', true\)/g) ?? []).length,
                2,
              );
              assert.equal(
                (internalMigration.match(/set_config\('app\.core_trade_internal', '1', true\)/g) ?? []).length,
                2,
              );
              assert.equal(
                (internalMigration.match(/set_config\('app\.core_trade_linking_agreement', '', true\)/g) ?? []).length,
                2,
              );
              assert.equal(
                (internalMigration.match(/set_config\('app\.core_trade_internal', '', true\)/g) ?? []).length,
                2,
              );
            });

            test("SQL regression proves rollback and successful frozen-version creation", () => {
              assert.match(sqlRegression, /qa_forced_agreement_insert_failure/);
              assert.match(sqlRegression, /response_status <> 'pending'/);
              assert.match(sqlRegression, /offer_status <> 'open'/);
              assert.match(sqlRegression, /agreement_count <> 0/);
              assert.match(sqlRegression, /acceptance_result->>'created'/);
              assert.match(sqlRegression, /agreement_row\.current_version_id is null/);
              assert.match(sqlRegression, /linked_thread_count <> 1/);
              assert.match(
                sqlRegression,
                /successful acceptance creates one proposed agreement, frozen version, and linked private thread/,
              );
              assert.match(sqlRegression, /rollback;/);
            });
            '''
        ),
        encoding="utf-8",
    )


def main() -> None:
    rpc_block = build_rpc_block()
    linking = build_linking_migration(rpc_block)
    internal = build_internal_migration(linking)
    LINKING_MIGRATION.write_text(linking, encoding="utf-8")
    INTERNAL_MIGRATION.write_text(internal, encoding="utf-8")
    extend_sql_regression()
    write_source_test()
    print("Generated PR #158 core-version linking and internal-write repair files.")


if __name__ == "__main__":
    main()
