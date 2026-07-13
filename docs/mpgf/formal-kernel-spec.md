# MPGF Formal Kernel Spec

Status: passed for the implemented exact-pilot proportional allocation profile.

The direct-working kernel implemented in this repository contains:

- non-real-money pledge-only contribution state
- approved demo ordinary-pool alternatives
- bounded integer basis-point ballot weights
- exact integer proportional allocation over approved demo alternatives
- deterministic tie-break by ascending alternative ID
- non-real-money public summaries with zero released, authorized, and externally paid cents
- fail-closed real-money and payout gates

The formal kernel authorizes only the benchmark-supported exact-integer proportional pilot profile. Larger piecewise-linear, branch-and-bound, automated payout, or real-money profiles require separate support-profile evidence before activation.
