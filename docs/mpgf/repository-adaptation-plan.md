# MPGF Repository Adaptation Plan

Status: active for direct-working scope.

| Subsystem | Repository adaptation | Full-pilot gate |
| --- | --- | --- |
| Web routes | Use `src/app/mpgf` App Router pages. | Browser-level production verification at `https://www.moraltrade.org`. |
| Auth/session | Use existing Supabase auth routes and return-to behavior. | Production auth/session profile and rendered browser verification. |
| Data persistence | Use Supabase migrations for MPGF tables; local direct-working UI uses fixture-owned non-real-money state. | Server actions must persist pledge/proposal/ballot state before production-domain `demo_complete`. |
| Payments | Keep Stripe unavailable to MPGF direct-working mode. | Legal, payment, privacy, receipt, retention, launch, exact-pilot, and real-money gates. |
| Admin | Map required admin sections under `/mpgf/admin`; mutations stay unavailable in direct-working mode. | RBAC, approval matrix, audit logging, and production admin verification. |
| Deployment | Use existing Vercel project metadata and production target config. | Production deployment prerequisite validation and rollback evidence. |

Any later exact-pilot or real-money implementation must extend this plan rather than introduce a parallel system.
