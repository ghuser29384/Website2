# MPGF WWW Direct-Working Verification

Status: template ready; local direct-working implementation passes. Production-domain evidence must be filled after deployment.

Canonical URL tested: `https://www.moraltrade.org`

Deployment environment: production

Pre-launch deployment environment validation result: `validateMpgfDeploymentEnvironment("pre_launch")`

Required checks:

- `/mpgf` renders a usable non-real-money MPGF entry point.
- `/mpgf/contribute` renders pledge-only one-time and monthly recurring commitments.
- `/mpgf/pools` renders at least one approved demo ordinary-pool alternative.
- `/mpgf/technical-spec` exposes the public technical summary and canonical instruction pointer.
- Real-money contribution creation is unavailable.
- Automated payout creation is unavailable.
- No smoke-test action mutates real-money records.

Blockers: production browser run not recorded in this repository workspace.
