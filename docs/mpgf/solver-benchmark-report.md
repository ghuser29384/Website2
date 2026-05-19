# MPGF Solver Benchmark Report

Status: passed

Active support profile: `mpgf-solver-support-exact-pilot-v1`

Active limits supported for `exact_pilot_complete`:

- alternatives: 4
- ballots: 4
- canonical breakpoints per ballot: 2
- region-enumeration regions: 4
- branch-and-bound nodes: 0
- certificate JSON bytes: 32768
- verifier runtime: 1000 ms
- budget cents: exact non-negative integer
- arithmetic: integer cents and exact rationals

Certified solver path:

- selected solver: `complete_region_enumeration`
- allocation algorithm: `exact_integer_proportional_v0`
- objective certificate schema: `mpgf-solver-certificate-v0.3`
- deterministic tie-break: descending remainder, then `alternative_id` ascending
- heuristic live allocation: disallowed
- unsupported, infeasible, oversized, or certificate-limit cases: fail closed

Benchmark fixture results:

| Fixture | Expected behavior | Result |
| --- | --- | --- |
| `small-2-alt-3-ballot` | verified optimal or fail closed | verified optimal |
| `zero-crossing-curves` | verified optimal or fail closed | fail closed outside proportional pilot profile |
| `many-breakpoints-within-limit` | verified optimal or fail closed | verified optimal within active breakpoint limit |
| `too-many-alternatives` | fail closed | fail closed |
| `too-many-breakpoints` | fail closed | fail closed |
| `too-many-regions` | fail closed | fail closed |
| `branch-and-bound-required` | verified optimal or fail closed | fail closed because branch-and-bound is inactive |
| `certificate-size-limit` | fail closed | fail closed |
| `verifier-runtime-limit` | fail closed | fail closed |
| `infeasible-instance` | certified infeasible or fail closed | fail closed |
| `tie-break-instance` | verified optimal or fail closed | verified optimal with deterministic tie-break proof |

Independent verifier result:

- demo certificate verification: passed
- budget equality: passed
- integer cents: passed
- caps satisfied: passed
- risk exposure satisfied: passed
- tail-loss constraint satisfied: passed
- optimality gap: 0

The active support profile is benchmark-supported for the current exact-pilot proportional allocation profile. Larger piecewise-linear, branch-and-bound, automated payout, or real-money allocation profiles are not activated by this report.
