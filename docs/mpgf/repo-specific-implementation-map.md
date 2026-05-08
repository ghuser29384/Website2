# MPGF Repo-Specific Implementation Map

Status: passed for local direct-working route and mechanism scope.

| Build Instruction Area | Repository Path | Status |
| --- | --- | --- |
| Canonical instruction | `docs/mpgf/codex-build-instruction-final.md` | present |
| Public MPGF pages | `src/app/mpgf` | present |
| MPGF UI | `src/components/mpgf` | present |
| Direct-working mechanism | `src/lib/mpgf/mechanism.ts` | present |
| Validation and gates | `src/lib/mpgf/validators.ts` | present, production runners fail closed |
| MPGF config registry | `config/mpgf` | present |
| MPGF docs/evidence registry | `docs/mpgf` | present |
| MPGF direct-working migration | `supabase/migrations/20260507_mpgf_pilot_v0_3.sql` | present |
| MPGF schema-contract supplement | `supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql` | present |

Exact-pilot solver, production browser verification, real-money payment, payout, and legal/receipt/retention completion paths are intentionally blocked until their gates pass.
