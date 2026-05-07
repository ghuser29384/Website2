# MPGF Repository Capability Inventory

Status: passed

| Capability | Existing repository capability | Adapter decision | Implementation path |
| --- | --- | --- | --- |
| Web framework | Next.js App Router | direct_repo_convention | src/app |
| Auth/session | Supabase Auth | direct_repo_convention | src/lib/supabase |
| Database | Supabase Postgres migrations | thin_adapter | supabase/migrations |
| Payments | Stripe exists for other site features | blocked for MPGF direct-working | src/lib/stripe.ts |
| Styling | Global CSS and existing layout components | direct_repo_convention | src/app/globals.css |
| Public MPGF routes | No existing MPGF routes | new_mpgf_module | src/app/mpgf |
| Domain mechanism | No existing MPGF mechanism | new_mpgf_module | src/lib/mpgf |
| Configuration | No existing MPGF config | new_mpgf_module | config/mpgf |
| Deployment | Vercel config exists | thin_adapter | vercel.json and config/mpgf/production-deployment-target.json |

Blocked dependent work: none for non-real-money direct-working mode.
