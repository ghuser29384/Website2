# MPGF Status Value Registry

Status: config-backed direct-working registry.

The operative machine-readable registry is `config/mpgf/status-value-registry.json`. It covers completion profiles, contribution modes, public summary state, manual external-payment evidence, and automated payout-provider status for the current direct-working implementation.

Before any new status-bearing field is added, the implementation must update the JSON registry, update `docs/mpgf/planned-state-machine-table.md` when the field has transitions, and add conformance coverage.

Conformance rows: AC-STATE-001, AC-STATE-010.
