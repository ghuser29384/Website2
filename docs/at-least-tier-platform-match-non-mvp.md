# At-Least-Tier Platform Match Non-MVP

Status: NON-MVP. This mechanism is not part of the Direct Capped CGPP MVP. Production public commitments, real-money authorization, capture, platform-match contribution, project routing, and settlement are disabled unless explicitly promoted through a later approval process.

## User Promise

A labs participant chooses a reviewed public-good pool, selects an at-least tier, and states an intended contribution amount. If other eligible users' effective support reaches at least that selected tier, Moral Trade contributes the displayed platform-match amount to reviewed projects from a backed reserve and the participant is charged $0. If other eligible users' effective support does not reach that tier, the participant contributes the stated amount to the reviewed projects.

There is no direct user payout. A winning participant does not receive money, cashback, a prize, a return, or any investment-like benefit. The platform contribution goes only to reviewed moral-public-good projects.

## Forecast Shape

Only cumulative at-least-tier forecasts are in scope:

- at least Tier 1;
- at least Tier 2;
- at least Tier 3;
- higher at-least tiers configured before the round opens.

Exact-tier forecasts, below-tier forecasts, under-tier forecasts, shorting failure, tradable tier claims, and direct user payouts are out of scope.

## Damped Odds Schedule Formula

Reward rates are based on frozen pre-round estimates of how hard each tier is to reach.

Definitions:

- `T_k`: net-recipient threshold for Tier `k`;
- `q_k`: frozen forecast probability that other eligible effective support reaches Tier `k`;
- `o_k = (1 - q_k) / q_k`: odds against reaching Tier `k`;
- `r_k`: platform-match reward rate for Tier `k`;
- `r_min`: minimum reward rate;
- `r_max`: maximum reward rate;
- `gamma`: damping exponent.

Default parameters:

- `r_min_bps = 500`;
- `r_max_bps = 3500`;
- `gamma = 0.5`;
- `q_min_bps = 100`;
- `q_max_bps = 9900`;
- `min_reward_increment_bps = 1`;
- `fallback_mode = fail_closed`.

With tiers sorted by increasing threshold:

```text
q_k = frozen_forecast_probability_bps / 10000
o_k = (1 - q_k) / q_k

r_k =
  r_min
  + (r_max - r_min)
    * ((o_k ^ gamma - o_1 ^ gamma) / (o_K ^ gamma - o_1 ^ gamma))
```

The current implementation supports `gamma` values from `0.5` through `0.7` inclusive, with the default square-root schedule at `gamma = 0.5`. Schedule outputs use deterministic rational integer arithmetic. Invalid thresholds, non-decreasing probabilities, invalid `q`, denominator zero, invalid reward bounds, unsupported gamma precision, out-of-range gamma values, and monotonicity-breaking rounding fail closed.

## Effective-Support Resolution

Tier outcomes are resolved from eligible effective support, not raw stated contribution. For each at-least-tier commitment:

```text
user_loss_net = stated_net_recipient_cents
platform_win_net = platform_match_net_cents
guaranteed_effective_support = min(user_loss_net, platform_win_net)
```

For ordinary direct hard pledges included in a labs round, `guaranteed_effective_support` is the pledge's net-recipient amount.

For each participant, resolution uses leave-one-cluster-out support:

```text
other_eligible_effective_support_i =
  sum guaranteed_effective_support_j
  where j is not participant i
  and j is not in participant i's same-control cluster
```

Own commitments, same-control commitments, duplicate payment clusters treated as same-control, sponsor match, platform-match payments, refund-bonus reserves, fees, soft intents, drafts, payment-failed rows, Sybil-failed rows, blocked/review-failed rows, stale authorizations, and final project disbursement after settlement do not count toward forecast resolution.

## Payment And Settlement Sequence

Default production behavior is disabled:

- no real payment authorization;
- no real capture;
- no real platform-match contribution;
- no real project disbursement;
- no provider operation references.

Dev/test behavior may simulate settlement. In simulation:

- winners are marked as `won_platform_pays`;
- winner user authorizations are release-only simulations;
- platform contribution operations route to reviewed projects, not users;
- losers are marked as `lost_user_pays`;
- loser user contribution rows route net recipient amounts to reviewed projects;
- excluded rows are released with no platform contribution and no user charge.

If this branch is later promoted, live settlement must re-check feature gates, promotion record, legal/compliance approval, payment-provider readiness, reserve backing, identity/Sybil controls, frozen schedule, copy preflight, and emergency pause before provider calls.

Admin, commitment-open, and scheduled-job gates are server-side checks. Labs admins may configure draft rounds, compute and freeze schedules, configure reserves, run copy preflight, simulate commitments, simulate authorization/resolution/settlement, view audit reports, and pause the mechanism. A labs hard commitment can open only when the round is `labs_open`, the feature is explicitly enabled for labs, the reward schedule is valid and frozen, the platform-match reserve is backed, the requested exposure fits within the backed cap, copy preflight passes, the payment method is provider-confirmed, and the final review acknowledgements are present. While the branch is non-MVP, real public round opening, public real-money commitments, real payment authorization/capture, live platform-match contributions, and public reports implying live product availability remain blocked.

## Reserve Requirements

A platform-match reserve must be fully backed before commitments open:

```text
sum(platform_match_exposure_reserved_cents for hard_saved eligible commitments)
  <= PlatformMatchReserve.max_exposure_cents
  <= PlatformMatchReserve.backed_cents
```

If a new commitment would exceed the reserve exposure cap, it must not become hard-saved. If reserve backing becomes blocked before settlement, the round blocks, user authorizations release, user loss payments are not captured, and platform-match payments are not executed.

## Accounting Channels

Reports must keep these channels separate:

- forecast commitment gross;
- forecast commitment net recipient;
- selected at-least tier;
- resolved at-least tier;
- user-paid loss funds;
- platform-paid win funds;
- platform-match reserve backed;
- platform-match exposure reserved;
- platform-match paid;
- platform-match released unused;
- ordinary direct pledges;
- fees;
- final project disbursement.

Do not merge user-paid loss funds and platform-paid winning contributions into a single unlabeled impact number.

## Copy Rules

Ordinary user-facing copy must say:

- non-MVP labs mechanism;
- no direct user payout;
- if the user wins, the platform contributes to reviewed projects;
- if the user loses, the user contributes to reviewed projects;
- outcome is computed from other eligible users' effective support;
- the user's own commitment and same-control accounts do not count;
- platform-match payments do not count toward forecast results;
- production real money is disabled unless explicitly promoted.

Ordinary user-facing copy must not use betting, wagering, gambling, profit, prize, lottery, investment, return, cashback, free-money, paid-if-right, payout-to-you, objective-impact, or production-ready language.

## Tests

The current implementation includes tests for:

- non-MVP feature metadata and production-disabled capability gates;
- default and non-default v137 gamma damped-odds schedule computation and fail-closed invalid schedules;
- leave-one-cluster-out effective-support resolution;
- the circularity guard where raw stated commitments do not clear a tier;
- simulated settlement separation of user-paid, platform-paid, reserve, fee, and final disbursement channels;
- idempotency keys for platform-match operations;
- ordinary-copy preflight;
- commitment-open gate enforcement for reserve backing, caps, provider-confirmed payment, and final acknowledgements;
- admin workflow and scheduled-job gates before live provider calls;
- documentation presence and absence from primary public/MVP routes.

## Production Gaps

This document does not authorize production launch. Remaining production work includes persistent database tables, admin CRUD, labs-only routes, signed payment setup, provider-specific authorization/capture/release adapters, platform-match project-routing adapters, live audit publication, promotion governance, legal/compliance approval, and rendered browser QA for any future labs UI.
