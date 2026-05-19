# MPGF Production Direct-Working Launch Runbook

Status: passed

Mode: non-real-money direct-working

Canonical URL tested: `https://www.moraltrade.org`

Launch evidence:

- Production deployment `dpl_8LsZTP72jpZXKtoFyaMWYzUtFX8t` reached `READY`.
- `https://www.moraltrade.org` was aliased to the deployment.
- `FEATURE_MPGF_ENABLED=true` and `MPGF_REAL_MONEY_ENABLED=false` are configured in production.
- `/api/mpgf/health` returned `ok=true`.
- `/api/mpgf/exact-pilot-dry-run` returned `ok=true`.
- Browser evidence and the five-minute monitor are recorded in `/private/tmp/mpgf-production-evidence-20260517-resolved`.

Unresolved issues: none.

Runbook checklist:

1. Confirm `config/mpgf/production-deployment-target.json` matches the production deployment provider.
2. Confirm `FEATURE_MPGF_ENABLED=true` and `MPGF_REAL_MONEY_ENABLED=false`.
3. Apply `supabase/migrations/20260507_mpgf_pilot_v0_3.sql`.
4. Apply `supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql`.
5. Deploy the intended commit to `https://www.moraltrade.org`.
6. Visit `/mpgf`, `/mpgf/about`, `/mpgf/contribute`, `/mpgf/pools`, and `/mpgf/technical-spec`.
7. Confirm pledge-only actions do not call Stripe and do not create payment-provider objects.
8. Run or manually record `runMpgfDirectWorkingSmokeTest`.
9. Record browser-level production-domain verification in `docs/mpgf/www-direct-working-verification.md`.
10. Do not enable real money unless `real_money_complete` later passes.
