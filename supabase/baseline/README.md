# Supabase schema baseline

This directory is reserved for a reviewed, schema-only snapshot of the production application database.

The snapshot exists because the historical incremental migration set does not independently reconstruct the complete application schema from an empty Supabase project. It is **not** an automatically applied production migration.

Expected reviewed files:

```text
production-baseline.sql
production-manifest.txt
SHA256SUMS
```

Generate them through `scripts/bootstrap-moraltrade-qa-schema.sh` and follow `docs/moraltrade-qa-environment.md`.

## Safety rules

- Never include production table rows, Auth users, sessions, identities, Storage objects, Vault secrets, passwords, API keys, payment identifiers, messages, or evidence.
- Keep this baseline outside `supabase/migrations/` so normal migration tooling cannot replay the complete live schema against production.
- Review the SQL for hard-coded credentials before committing.
- Treat the baseline as the starting snapshot for a fresh isolated environment. Apply later incremental migrations only after confirming their versions are newer than the baseline snapshot.
- Update the manifest and checksum whenever the baseline changes.
