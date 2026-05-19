# MPGF Specification Completion Register

| Item ID | Requirement | Resolution | Status | Owner | Evidence |
| --- | --- | --- | --- | --- | --- |
| direct-working-mode | Make MPGF directly usable without real money. | Implemented as pledge-only non-real-money public routes and local deterministic mechanism. | resolved | codex | src/app/mpgf |
| real-money-mode | Real money availability. | Explicitly blocked until real_money_complete gates pass. | resolved | codex | config/mpgf/protocol-parameters.json |
| automated-payouts | Automated payout provider. | Disabled by default; manual evidence-only profile recorded. | resolved | codex | config/mpgf/payout-provider-profile.json |
| production-domain-evidence | Browser-level production evidence. | Public, health, direct-working, and exact-pilot dry-run evidence are recorded; auth/session and ordinary participant journey evidence remain completion-blocking until authenticated browser runs pass. | specified_completion_blocking | codex | docs/mpgf/www-auth-session-verification.md |
| formal-source-lock | Complete newest formal mechanism source. | Required artifacts validate for the active exact-pilot profile. | resolved | codex | docs/mpgf/formal-mechanism.raw.md |

Specification unresolved rows: 0

Completion-blocking and phase-blocking rows are specified but do not count as specification gaps.
