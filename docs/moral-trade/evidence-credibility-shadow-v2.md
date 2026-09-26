# Evidence Decision → Contextual Credibility Shadow Integration v2

## Status

This tranche is **shadow-only**. It records milestone-scoped evidence decisions and computes private comparison aggregates, but it does not change public credibility, discovery ranking, exposure, safeguards, eligibility, or active restrictions.

The exact model key is `v2-evidence-decision-shadow`. The fail-closed control row is `evidence_decision_v2` with all effect and cutover flags disabled.

## Purpose

The existing evidence-weighted milestone workflow can establish partial completion, a payout factor, replacement and appeal history, and payment finality. The existing contextual-credibility trigger, however, treats a completed agreement as a full fulfilment success for both participants. That discards role assignment, partial completion, evidential uncertainty, and appeal supersession.

This tranche creates a private bridge from final evidence decisions to milestone- and role-specific shadow observations. It deliberately does not infer causal additionality from factual completion. Completion answers whether a frozen obligation was performed. Additionality remains part of separate causal-impact accounting based on a no-trade baseline and an approved methodology.

## Frozen product decisions

1. **Atomic unit:** one final observation per milestone and obligated role. The performer receives fulfilment observations; the payer receives settlement observations.
2. **Fulfilment outcome:** final completion fraction, from `0` through `1`.
3. **Confidence:** factual decision confidence is distinct from the parties' frozen payout factor.
4. **Evidence strength:** source provenance and adjudication are separate axes.
5. **Finality:** only terminal decisions are scored. Replacements, appeals, cures, and corrections supersede prior events rather than double-counting them.
6. **Integrity:** evidence integrity concerns honesty and evidential conduct, not merely weak proof.
7. **Activation:** private shadow computation only until a later empirical calibration and explicit cutover decision.

## Data model

### `trade_evidence_decisions`

Private, append-only final evidence decisions. Each record binds to the frozen agreement version, milestone, final review where applicable, performer, payer, completion units, total units, completion fraction, payout factor, decision-confidence band, provenance, adjudication class, contradiction and integrity findings, responsiveness, dispute conduct, finality reason, and immutable hashes.

`additionality_status` is constrained to `not_evaluated`. The evidence-decision path cannot certify causal impact.

### `trade_settlement_shadow_decisions`

Private, append-only settlement decisions tied to a final milestone payout and, where applicable, the current final payment-review decision. It distinguishes paid, still due, not due, permissible cancellation, unresolved dispute, late cure, and administrative correction.

### `credibility_shadow_events`

Private atomic observations in the existing five contextual dimensions:

- fulfilment
- evidence integrity
- settlement
- dispute conduct
- responsiveness

Each event stores its factual outcome separately from its provenance weight and decision-confidence weight. A 60% completion finding at 75% decision confidence therefore remains an outcome of `0.60` with a confidence multiplier of `0.75`; it is not converted into a `0.45` outcome.

### `credibility_shadow_restriction_signals`

Private operator-only signals for deliberate fabrication or fraud review. These do not write to active restrictions. Severe misconduct remains non-compensatory and requires a separately governed restriction decision.

### `credibility_shadow_aggregates`

Private terminal-event aggregates using the provisional v2 shadow parameters. Superseded events are excluded. Repeated counterparties receive diminishing weight; recency, context similarity, stake, provenance, and decision confidence remain separate factors.

### `credibility_shadow_controls`

The initial row is fail-closed:

| Control | Initial value |
|---|---|
| Mode | `shadow` |
| Milestone cutover | `false` |
| Public effects | `false` |
| Ranking effects | `false` |
| Eligibility effects | `false` |

The active legacy triggers continue operating unchanged while the control remains in this state. The migration contains a future compatibility boundary: after a later explicit cutover, blanket whole-agreement events are suppressed only for milestone-based agreements, while legacy agreements without milestone manifests remain compatible.

## Provenance and confidence

The initial shadow provenance multipliers are provisional, not calibrated probabilities:

| Relied-on source | Shadow multiplier |
|---|---:|
| Platform-observed event | 1.0 |
| Authenticated-provider event | 1.0 |
| Independent third-party evidence | 1.0 |
| Bilateral confirmation | 0.6 |
| Self-report or uncorroborated attestation | 0.2 |

Adjudication is recorded independently as platform-established, provider-established, neutral-review-final, appeal-review-final, bilateral-confirmed, or unreviewed. Neutral review finalizes a decision but does not upgrade the underlying source provenance.

Decision-confidence bands are `0`, `25`, `50`, `75`, and `100`. A zero-confidence finding produces `review_required` rather than a numerical observation. A highly confident finding of noncompletion remains strong negative evidence.

## Finality rules

- Pending review or appeal: no final decision.
- Final partial completion: fractional fulfilment.
- Terminal rejection, expired replacement opportunity, or unjustified abandonment: fulfilment `0`.
- Permissible exit, force majeure, or mutual cancellation: excluded.
- Unresolved dispute: `review_required`, with no numerical result.
- Successful replacement: supersedes the rejected result.
- Appeal affirmation: preserves and supersedes the base result.
- Appeal overturn: replaces the base result.
- Late cure: records eventual completion while retaining a negative responsiveness observation.
- Corrected provider or administrative decision: append a superseding record; never rewrite history.
- Payment review: only the review case's current final decision may create a settlement decision.

## Integrity rules

Weak or incomplete proof is not misconduct. It receives less weight, fails to establish completion, or remains review-required.

An integrity observation is created only from an explicit finding:

| Finding | Shadow outcome |
|---|---:|
| Supported honest evidential conduct | 1.0 |
| Recklessly misleading evidence | 0.5 |
| Deliberate fabrication, alteration, impersonation, or forgery | 0.0 plus private fraud-review signal |
| Innocent contradiction or merely weak evidence | no integrity event |

## Authorization and privacy

All new tables have RLS enabled. Anonymous and ordinary authenticated roles have no direct table access. Review decision RPCs require service role or an active AAL2 reviewer/administrator, and a non-administrator reviewer must be the final assigned reviewer. The private differential requires an AAL2 administrator. Evidence decisions, settlement decisions, shadow events, and restriction signals are append-only.

Original evidence, private reasons, identities, exact payment details, and provider references remain outside the public outcome ledger. This tranche does not broaden the six-field public Evidence projection.

## QA evidence

The normalized migration sources were applied only to MoralTrade QA project `hvmxfjjbdcgjjudmthdz`. The rollback-only regression suite covers:

- full, partial, and zero completion
- high and low decision confidence
- self-report, independent, bilateral, platform, and provider provenance
- replacement success and replacement expiry
- terminal rejection and unjustified abandonment
- permissible exit and unresolved dispute
- appeal affirmation and overturn
- late fulfilment cure and late payment cure
- payment compliance, still-due adjudication, not-due settlement, and unresolved payment dispute
- innocent contradiction, reckless misleading conduct, and deliberate fabrication
- reciprocal agreements with different performers
- replay idempotency and append-only history
- AAL1 denial, AAL2 reviewer success, AAL2 administrator differential access, and RLS denial
- current shadow-mode compatibility and the rollback-only future cutover boundary
- zero leakage to active credibility events, active public aggregates, active restrictions, public ranking, or eligibility
- zero persistent synthetic residue
- supporting indexes for every introduced foreign key

## Release boundary

This branch must remain draft and unmerged until exact-head repository, SQL, authorization, lint, type, and build gates pass. It must not be deployed and must not be applied to production.

A later activation proposal requires, at minimum:

1. enough independently resolved real outcomes for out-of-time calibration;
2. reviewer calibration and appeal-overturn analysis;
3. documented error and subgroup-performance checks;
4. a frozen model version and exact parameters;
5. explicit approval for any public, ranking, exposure, safeguard, eligibility, or restriction effect;
6. a separate production migration and release authorization.
