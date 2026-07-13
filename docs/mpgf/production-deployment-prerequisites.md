# MPGF Production Deployment Prerequisites

Status: passed

Canonical URL tested: `https://www.moraltrade.org`

Production deployment:

- Deployment ID: `dpl_8LsZTP72jpZXKtoFyaMWYzUtFX8t`
- Deployment URL: `https://website2-1qm3lmsxw-ellen-s.vercel.app`
- Alias: `https://www.moraltrade.org`
- Ready state: `READY`
- Target: `production`
- Inspector URL: `https://vercel.com/ellen-s/website2/8LsZTP72jpZXKtoFyaMWYzUtFX8t`

Required production environment verified by `/api/mpgf/health`:

- `MPGF_ENV=production`
- `MPGF_PUBLIC_BASE_URL=https://www.moraltrade.org`
- `MPGF_CANONICAL_HOST=www.moraltrade.org`
- `FEATURE_MPGF_ENABLED=true`
- `MPGF_REAL_MONEY_ENABLED=false`

Observed production health:

- `/api/mpgf/health` returned HTTP 200 and `ok=true`.
- `validateMpgfDeploymentEnvironment("pre_launch")` returned `passed`.
- Public MPGF routes rendered without fatal server or hydration markers.
- Real-money mode remained disabled.
- Released, payout-authorized, and externally-paid public summary cents remained zero.

Unresolved issues: none.
