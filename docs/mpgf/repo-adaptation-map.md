# MPGF Repository Adaptation Map

Status: passed

The repository uses Next.js App Router, Supabase Auth/Postgres, existing global CSS, and Stripe for non-MPGF payment surfaces. MPGF direct-working mode is implemented as a new MPGF module and route subtree while reusing the existing layout, auth prompts, deployment conventions, and migration structure.

Real-money MPGF payments are intentionally blocked. Existing Stripe helpers are not used by MPGF direct-working routes.

Database adaptation: the repository's first MPGF migration creates the local direct-working subset, and `supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql` adds the remaining Build Instruction schema-contract tables in dependency order. Where the repository had already introduced text cycle IDs for direct-working pages, the supplement preserves that adapter convention and records the logical MPGF object through table names, fields, lifecycle states, and conformance validators.

Machine-readable map: `config/mpgf/repo-adaptation-map.json`
