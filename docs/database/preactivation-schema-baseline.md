# Authoritative pre-activation Supabase schema baseline

## Decision

Moral Trade adopts a **documented schema-baseline boundary**, not a rewrite of
its historical migration files.

The executable migration path for a genuinely empty Supabase environment is:

1. start a fresh Supabase/PostgreSQL 17 environment;
2. apply `supabase/baseline/pre_activation/schema.sql` once;
3. apply `supabase/migrations/20260814042516_account_activation_stage.sql`;
4. apply later migrations in normal version order.

The legacy files in `supabase/migrations` remain historical evidence. They are
not claimed to form a zero-to-current chain. No legacy file is renamed,
rewritten, deleted, or silently marked as applied by this decision.

## Why this boundary exists

The historical migration directory begins after an earlier application schema
already existed. Its first files refer to objects such as `public.profiles`, so
a clean Supabase branch cannot construct the application by replaying that
directory alone.

A hand-maintained `supabase/schema.sql` also exists, but it is not the database
source of truth for this boundary. The authoritative baseline is generated from
the deployed pre-activation production **application catalog**. Every `psql`
catalog read begins an explicit `READ ONLY` transaction; the separate schema
capture uses `pg_dump --schema-only`, which performs catalog reads and does not
mutate the source. The resulting files are committed with an immutable manifest
and reconstructed in a fresh local Supabase stack before review.

## Scope

The baseline contains only application-owned schema state:

- relations, columns, constraints, indexes, views, sequences, functions, types,
  triggers, RLS policies, and privileges in `public` and
  `moral_trade_private`;
- application-owned trigger functions and triggers attached to `auth.users`;
- required extension declarations;
- role, table, column, function, schema, and default privileges relevant to
  `anon`, `authenticated`, and `service_role`.

It deliberately excludes:

- rows from any application table;
- Supabase Auth users or identities;
- profile, offer, agreement, payment, provider, or evidence records;
- Supabase-managed schema internals;
- comments and security labels;
- environment variables, connection strings, JWTs, API keys, or other secrets;
- `profiles.activation_stage` and the two activation-transition functions.

## Immutable provenance

`supabase/baseline/pre_activation/manifest.json` records:

- the repository and source commit;
- the exact synchronized `main` commit;
- the production project reference used only as provenance;
- explicit read-only catalog transactions and schema-only dump access;
- SHA-256 digests for the baseline SQL, normalized source catalog, source
  extension inventory, and source migration ledger;
- the explicit cutover to
  `20260814042516_account_activation_stage.sql`;
- that no legacy migration is replayed after the baseline and before the
  activation migration.

The generated artifacts are:

```text
supabase/baseline/pre_activation/schema.sql
supabase/baseline/pre_activation/source_catalog.tsv
supabase/baseline/pre_activation/source_migration_history.tsv
supabase/baseline/pre_activation/source_extensions.tsv
supabase/baseline/pre_activation/manifest.json
```

Do not edit those files by hand. Regenerate them through the guarded generation
workflow and review every resulting diff.

## Safety properties

The baseline starts with a transaction-scoped guard. It aborts unless the target
contains zero non-extension application relations, functions, and application-
owned `auth.users` triggers in the declared boundary. It must never be applied
to production, ordinary QA, or another non-empty application database.

Generation is fail-closed:

- the checkout, published branch, and synchronized `main` identities must match;
- the production database URL must match the pinned pooler host and role;
- each `psql` source read begins an explicit `READ ONLY` transaction, and the
  session proof verifies `transaction_read_only=on`;
- the only separate source read is `pg_dump --schema-only`, which does not
  mutate the source;
- generation stops if production already contains `activation_stage` or either
  activation-transition function;
- the source application catalog and source migration ledger must both be
  non-empty;
- the catalog is captured before and after the dump and must not drift;
- only schema is exported;
- data statements and credential-shaped text fail permanent tests;
- generated artifacts are committed only after a clean-room reconstruction
  passes.

## Clean-room acceptance test

`validate-preactivation-baseline.yml` and
`scripts/database/validate-preactivation-baseline.sh` must prove, from an empty
local Supabase/PostgreSQL 17 stack:

1. zero application relations exist before the baseline;
2. the baseline applies successfully exactly once;
3. the normalized target catalog exactly equals the production-derived source
   catalog, including grants, RLS, functions, triggers, and app-owned
   `auth.users` triggers;
4. a second application fails through the non-empty guard;
5. a synthetic Auth user creates a profile through the canonical trigger;
6. `activation_stage` is absent before the activation migration;
7. deleting the synthetic Auth user removes the synthetic profile;
8. no synthetic Auth or profile row remains;
9. the local Supabase stack is stopped and no Docker resource remains;
10. repository tests, ESLint, TypeScript, and production build pass at the exact
    candidate head.

A future schema or migration change that affects the pre-activation state must
not mutate this historical boundary. Create a new named baseline boundary and a
new manifest instead.

## Relationship to PR #698 and Issue #714

This boundary does not merge PR #698, apply the activation migration remotely,
or make a production-release decision. It removes the clean-environment
bootstrap blocker identified in Issue #714. After this baseline PR is reviewed
and merged, PR #698 must be synchronized normally. Issue #714 can then create a
new disposable branch, apply this baseline followed by the exact activation
migration, and run its separately governed database and browser lifecycle gates.

The complete Issue #714 isolation, privacy, spending, cleanup, and production
immutability requirements remain unchanged.
