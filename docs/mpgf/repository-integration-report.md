# MPGF Repository Integration Report

Status: passed for the active exact-pilot non-real-money profile; real-money operation remains gated.

The repository integration path uses the existing Next.js App Router, Supabase auth/session conventions, Supabase migration directory, global CSS styling system, and Vercel deployment metadata. MPGF adds a scoped `src/lib/mpgf` domain module, `src/app/mpgf` route tree, `src/components/mpgf` UI components, `config/mpgf` configuration registry, and `docs/mpgf` evidence registry.

No parallel framework, ORM, auth/session system, payment system, styling system, admin system, migration system, or deployment system is introduced for the direct-working implementation.

Exact-pilot, public-experience, health-check, deployment, and www direct-working evidence are recorded for the active profile. Production-domain demo completion remains blocked until auth/session and ordinary participant-journey evidence record passed authenticated browser runs.
