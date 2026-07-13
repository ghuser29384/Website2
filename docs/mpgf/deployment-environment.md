# MPGF Deployment Environment

Status: target specified; production evidence pending.

The operative production target is `config/mpgf/production-deployment-target.json`.

| Field | Required value |
| --- | --- |
| Canonical base URL | `https://www.moraltrade.org` |
| Canonical host | `www.moraltrade.org` |
| Provider | Vercel |
| Project name | `website2` |
| MPGF real money | disabled |
| MPGF feature flag | enabled only when production-domain direct-working checks pass |

Production-domain `demo_complete` requires `validateMpgfProductionDeploymentPrerequisites()` and `validateMpgfWwwProductionHealthChecks()` to pass, followed by browser-level verification and monitor evidence.

Conformance rows: AC-DEPLOY-009, AC-DEPLOY-014.
