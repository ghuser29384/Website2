# MPGF Solver Support Profile

Status: certified for the active exact-pilot profile.

Active support profile: `mpgf-solver-support-exact-pilot-v1`

The active profile supports the current exact-integer proportional pilot limits in `config/mpgf/solver-support-profile.json`: at most four alternatives, four ballots, two canonical breakpoints per ballot, four region-enumeration regions, 32768 certificate JSON bytes, and 1000 ms verifier runtime.

`exact_pilot_complete` is supported for this active non-real-money exact-pilot profile by `docs/mpgf/solver-benchmark-report.md` and `docs/mpgf/www-exact-pilot-dry-run-verification.md`. Larger piecewise-linear, branch-and-bound, real-money allocation, payout, or disbursement profiles remain outside the active certified limits.
