# MPGF Repository Adaptation Map

Status: passed

The repository uses Next.js App Router, Supabase Auth/Postgres, existing global CSS, and Stripe for non-MPGF payment surfaces. MPGF direct-working mode is implemented as a new MPGF module and route subtree while reusing the existing layout, auth prompts, deployment conventions, and migration structure.

Real-money MPGF payments are intentionally blocked. Existing Stripe helpers are not used by MPGF direct-working routes.

Machine-readable map: `config/mpgf/repo-adaptation-map.json`
