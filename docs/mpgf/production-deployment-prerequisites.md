# MPGF Production Deployment Prerequisites

Status: ready for non-real-money deployment validation; live production verification still requires deployed environment access.

Required production environment:

- `MPGF_ENV=production`
- `MPGF_PUBLIC_BASE_URL=https://www.moraltrade.org`
- `MPGF_CANONICAL_HOST=www.moraltrade.org`
- `FEATURE_MPGF_ENABLED=true`
- `MPGF_REAL_MONEY_ENABLED=false`

Required operations:

- Deploy the intended commit to the production project bound to `www.moraltrade.org`.
- Apply main app and enabled MPGF migrations.
- Verify public MPGF routes render without server error.
- Keep real-money, automated payout, external payout, and live authorization actions disabled.
- Record production-domain verification artifacts before marking production-domain `demo_complete`.
