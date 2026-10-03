# PR #158 delta audit against current main

## Audited refs

- Current-main base for this candidate: `a0400cc79993dc4ad2f5a6dc65d9a3b8f72f65c3`
- Historical PR #158 head: `7df17c6bdd626083f0c68e785237c680dd44e6c3`
- Candidate branch: `agent/marketplace-delta-current-main-20260729`

## Decision

Current `main` already contains the canonical live-offer directory, structured Create flow,
saved offers, signed-in responses, public comments, private message threads, immutable
counterproposals, frozen agreement versions, bilateral confirmation, evidence submission,
completion confirmation, and exit controls. The candidate therefore carries only the missing
or materially better delta. It does not reconstruct PR #158 wholesale.

## Classification

| PR #158 area | Classification | Candidate treatment |
|---|---|---|
| Sequential member and claimed-guest acceptance | Missing integrity boundary | Replace with two PostgreSQL RPCs that atomically accept the response, create the proposed agreement and frozen version through the existing core triggers, decline competing responses, and close the non-repeatable offer. |
| Closed-offer bilateral confirmation compatibility | Missing schema contract | Narrowly extend the existing `confirm_agreement_version_v2` function so an accepted response-backed proposed agreement can be confirmed after its source offer becomes `matched` / `closed`. |
| Participant-level marketplace grouping | Useful presentation delta | Group exact published offers by owner while preserving every offer as a distinct authorized proposal. No Cartesian or generated pairing is shown as if the owner authorized it. |
| Inline marketplace actions | Useful interaction delta | Add exact-offer Respond, Counteroffer, Ask, Save, and Open-details actions to each proposal inside the participant group. All actions retain the exact `offer.id`. |
| Dedicated question route | Duplicative | Do not add a new question page. Improve the existing offer discussion form with pending state, success copy, reset-after-success, and correct empty-state behavior. |
| `/deals/[agreementId]` dealroom | Duplicative | Do not add it. Continue using `/messages/[threadId]` for negotiation and `/trade-agreements/[agreementId]` as the sole frozen agreement, confirmation, evidence, completion, and exit record. |
| `completion_state`, `agreement_evidence_items`, `agreement_review_cases` | Duplicative with current core trade lifecycle and evidence tables | Do not add them. Align atomic acceptance to the existing `lifecycle_status`, `trade_agreement_versions`, `trade_agreement_confirmations`, `trade_evidence_items`, `trade_completion_confirmations`, and `trade_exit_requests` contract. |
| Separate dealroom terms editor/history implementation | Already present in canonical agreement and message routes | Exclude. |
| Weekly clearing-round presentation | Out of scope for this integrity and entry-point delta | Exclude. Continuous exact-offer responses and counteroffers remain available. |
| Worked-example and synthetic-completion presentation | Already handled elsewhere and not live liquidity | Exclude. |
| PR-specific QA bootstrap, runbook, and Vercel configuration files | Operational scaffolding, not product code | Exclude from the product candidate. |

## Why the grouping is a real improvement rather than generated liquidity

The current directory repeats one full card per offer and requires a navigation before the user
can respond, counteroffer, ask, or save. The new grouping removes repeated participant identity
chrome and exposes those actions immediately, but it still renders one bounded row per exact
published offer. A participant with three offers contributes three rows—not nine synthetic
combinations of offered and requested terms.

The candidate must satisfy all of the following:

1. Flattening all participant groups returns the same offer IDs, in the same order, exactly once.
2. Every action URL or form carries the exact published `offer.id`.
3. Counteroffers are explicitly new proposals based on `source_offer`; they are not represented as standing offers.
4. Pagination and hard-constraint filtering remain offer-based, so grouping cannot hide or manufacture inventory.
5. No product route under `/deals` is added.

## Production ordering

The database migration must be applied and verified before application deployment because the
new server actions invoke the two atomic RPCs. No production migration or deployment is part of
this candidate-materialization step.
