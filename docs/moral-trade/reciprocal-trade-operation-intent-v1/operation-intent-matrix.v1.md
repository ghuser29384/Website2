# Operation-intent matrix v1

This is the human-readable companion to `operation-intent-matrix.v1.json`. The JSON file is normative for machine validation. Both are bound to `main` commit `75fd512e6cf82e2c51df53e211b854c0263109c3` and the final owner-decision freeze in issue #701 comment `5300603136`.

## Common authority order

Every applicable intent evaluates the same common gates in this order:

1. schema and synthetic provenance;
2. mechanism and outer-contract family;
3. actor, offer, owner, and counterparty identity;
4. intent-specific lifecycle;
5. database-authoritative cause or typed-contract compatibility;
6. either-direction blocks and time-scoped restrictions;
7. active interests, invitations, threads, agreements, and duplicate-current pairs;
8. structured moderation, noncompensable harm or threat, validity, baseline, legality, and participant policy;
9. product consent and privacy;
10. nested mechanism authority;
11. intent-specific transaction-snapshot requirements;
12. research-only purpose, consent or waiver, privacy, ethics, and output restrictions.

Missing, unknown, stale, contradictory, or unbound required state fails closed. Terminal history is retained but does not automatically block an ordinary product match. Free text never supplies safety, legality, consent, or restriction clearance.

## Summary matrix

| Intent | Mechanism / outer family | Lifecycle | Consent boundary | Snapshot rule | Shadow result |
| --- | --- | --- | --- | --- | --- |
| `cross_mechanism_feed_ingestion_and_ranking` | All eight independent mechanism families; Reciprocal Trade envelopes name `reciprocal_pledge_swap` or `paid_action` | Mechanism authority attests current eligibility and frozen terms | Applicable product discovery and delivery privacy; no invitation or research inference | One authority snapshot per envelope; ranking is ordering only | Accept or reject an envelope; never create eligibility |
| `reciprocal_trade_match_suggestion_list` | `reciprocal_trade`; both outer families | Both offers published, open, operative, distinct, and current | Product discovery and compatible privacy for both sides | One frozen read snapshot; same gates as start | Show only a pair that would be actionable if state remains unchanged |
| `start_suggested_match` | `reciprocal_trade`; both outer families | Same as suggestion at mutation time | Product discovery plus invitation-delivery permission; acceptance remains a separate transition | Pair lock, revalidation, and mutation in one transaction | Permit only the named mutation; no live wiring in this PR |
| `create_invitation` | `reciprocal_trade`; both outer families | Source published, open, operative, and current; target offer optional | Delivery permission is distinct from pending/accepted invitation state; invitation is never research consent | Revalidate and insert in one transaction; repeat gates on claim/response | Create a revocable invitation only; no obligation |
| `ordinary_publish_or_review` | `reciprocal_trade`; both outer families | Exact reviewed revision is `pending_review` and not public | Product-publication consent and compatible public scope | Revalidate and mutate review state in one transaction | Permit only the named review transition |
| `feed_private_delivery` | `reciprocal_trade`; both outer families in the design ontology | Derived offer pending/private; exact original source published/open/current | Exact source-bound private delivery; never public Feed consent by implication | Pair lock, source revision, decision, insert, and close in one transaction | One idempotent private delivery to the exact counterparty |
| `research_edge_projection` | Product-authority-approved Reciprocal Trade pair | Read-only frozen product decision; current blockers and terminal history remain distinct | Product consent is not research consent; study-specific consent or approved waiver/alteration is separate | Read-only projection of one frozen snapshot | Synthetic edge decision only; no study execution |

## Intent details

### Cross-mechanism Feed ingestion and ranking

- The Feed receives one closed `opportunity-envelope.v1` from each mechanism authority.
- Independent mechanisms remain independent: Donation Redirect, Donation Upgrade, Spending/Consumption Upgrade, Co-Fund, Co-Act, Threshold Funding/Assurance/DAC, and Threshold Sign-On are not legacy Reciprocal Trade modes.
- Ranking can use non-authoritative ordering features only after `authority.eligible=true`.
- A negative or absent mechanism decision cannot be overridden by score, exploration, recommendation learning, or `recommendation_graph_edges`.
- Feed private delivery and research-only projections are rejected at this public ingestion boundary.

### Reciprocal match suggestion

- Both source and target use `mechanismFamily=reciprocal_trade`.
- `reciprocal_pledge_swap` consumes a database-bound reciprocal-cause comparison.
- `paid_action` consumes a database-bound typed action-and-consideration comparison.
- PostgreSQL supplies comparison and collation semantics. The application never guesses Unicode `ILIKE` behavior.
- Every block, active restriction, active engagement, structured gate, product-discovery grant, nested authority, and exact revision must already pass.

### Start suggested match

- It repeats the complete suggestion gate set.
- Pair lock, authority read, and thread/proposal mutation must share the same PostgreSQL transaction.
- A revision change, concurrent mutation, active pair, or blocked thread fails closed.
- A start action may deliver a pending invitation but cannot treat pending delivery as acceptance or agreement.

### Create invitation

- Creation binds the exact source terms, intended recipient channel, expiry, and revocation contract.
- Account-bound recipients are checked before creation; first-claim recipients are checked when claimed and again when responding.
- Delivery permission, terms acceptance, product discovery, and research consent are separate states.
- Paid Action is representable in the schema but no destination is live-enabled.

### Ordinary publish or review

- Approval is a mechanism-authority decision for the exact reviewed revision, not a free-text moderation shortcut.
- Pair compatibility is not decided until a counterparty exists.
- Applicable owner, role, and mechanism restrictions plus all structured gates must pass.
- Approval cannot authorize a payment, nested settlement, invitation, study, or public causal claim.

### Feed private delivery

- This is a source-bound channel, not the public Feed and not public Reciprocal Trade inventory.
- Exact source offer ID, terms version, terms hash, and source revision are all mandatory.
- The original source and both participants are revalidated with blocks, restrictions, structured gates, privacy, and nested authority under the same snapshot.
- Public publication is an explicit failure.

### Research edge projection

- Product matchability is evaluated first and remains separately named.
- Research adds bound purpose, separate consent or approved waiver/alteration, privacy and ethics determinations, and historical-interference capture.
- `recommendation_graph_edges` cannot establish matchability.
- No participant-level `expected_additional`, direct causal attribution, assignment material, contact, or execution output is permitted.

## Money and nested mechanisms

Paid Action supports exactly nine substantive destination classes in `paid-action-destination-matrix.v1.json`. Collateral, authorization, refund, tax, fee, reserve, and bonus legs are separate system money legs. Exact-cent splits use integer minor units, unique allocation identifiers, exact totals, and a type-compatible nested authority for every destination that requires one.

Every nested opportunity binds:

```text
nestedOpportunityType
nestedOpportunityId
nestedTermsVersion
nestedTermsHash
nestedSourceRevision
```

Maximum nesting depth is one. Every nested identifier is unique and its parent is the evaluated root opportunity. Self-reference and cycles across parent or ancestry edges are rejected. The nested authority must pass under the same snapshot before an outer contract lock or relevant payment authorization. Direct Co-Act presentation carries no nested role or promised state; nested Co-Act maps `join`, `accept_role`, `reach_milestone`, and `complete_role` to their exact frozen promised states.

## Release boundary

All decisions from this package have `liveEligible=false` and `executionDecision=no_live_activation`. This PR contains no SQL authority candidate because even an unapplied migration would create an unnecessary runtime-affecting surface before the required backfill, collation, provider, legal, and rollout decisions exist.
