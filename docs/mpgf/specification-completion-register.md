# MPGF Specification Completion Register

| Item ID | Requirement | Resolution | Status | Owner | Evidence |
| --- | --- | --- | --- | --- | --- |
| direct-working-mode | Make MPGF directly usable without real money. | Implemented as pledge-only non-real-money public routes and local deterministic mechanism. | resolved | codex | src/app/mpgf |
| real-money-mode | Real money availability. | Explicitly blocked until real_money_complete gates pass. | resolved | codex | config/mpgf/protocol-parameters.json |
| automated-payouts | Automated payout provider. | Disabled by default; manual evidence-only profile recorded. | resolved | codex | config/mpgf/payout-provider-profile.json |
| production-domain-evidence | Browser-level production evidence. | Completion evidence shape is specified and placeholder files exist; production-domain completion remains blocked until the verification artifacts record passed production runs. | specified_completion_blocking | codex | docs/mpgf/www-direct-working-verification.md |
| formal-source-lock | Complete newest formal mechanism source. | Required artifacts and validator are present, but the complete verbatim formal mechanism source is unavailable in this workspace; full Phase A fails closed until populated. | specified_phase_blocking | codex | docs/mpgf/formal-mechanism.raw.md |

Specification unresolved rows: 0

Completion-blocking and phase-blocking rows are specified but do not count as specification gaps.
