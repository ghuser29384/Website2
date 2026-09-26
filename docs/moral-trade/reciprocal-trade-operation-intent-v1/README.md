# Moral Trade operation-intent authority v1

This package is the design-and-shadow-only deliverable for issue #701 and final owner-decision freeze comment `5300603136`. It defines one closed operation-intent contract without changing runtime or database behavior.

## Delivered contracts

- human- and machine-readable matrices for seven operation intents;
- the complete frozen mechanism, obligation, consideration, destination, and trigger ontology;
- the nine-option Paid Action destination matrix and separate system money legs;
- a generic nested-opportunity contract with depth-one, self-reference, cycle, source-revision, and same-snapshot rules;
- direct and nested Co-Act state contracts;
- a stable deterministic reason-code registry;
- closed input, decision, and unified opportunity-envelope JSON Schemas;
- a synthetic-only pure evaluator and adversarial fixtures;
- a differential map of every tracked current call site and source;
- a permanent exact-scope workflow and repository-only release classification.

## Layer boundary

```text
mechanism-specific authority
        |
        v
unified opportunity envelope
        |
        v
cross-mechanism Feed ranking
```

Ranking consumes only eligible envelopes. It cannot create eligibility. Feed private delivery remains a separate source-bound channel. Research projection is an additional adapter after product authority, never a product prerequisite and never a source of live eligibility.

The seven closed operation intents are:

- `cross_mechanism_feed_ingestion_and_ranking`;
- `reciprocal_trade_match_suggestion_list`;
- `start_suggested_match`;
- `create_invitation`;
- `ordinary_publish_or_review`;
- `feed_private_delivery`;
- `research_edge_projection`.

## Pure evaluator

`scripts/reciprocal-trade-shadow/operation-intent-evaluator.mjs`:

- accepts only `subjectMode=synthetic_shadow`;
- requires every actor, offer, profile, snapshot, transaction, revision, nested opportunity, allocation, role, and leg identifier to use the `synthetic:` namespace;
- validates every input and emitted decision against the frozen schemas;
- reads no database, API, environment variable, system clock, random source, production row, or QA row;
- never implements PostgreSQL `ILIKE`; it consumes an explicitly bound database result and collation identity;
- produces deterministic hashes and reason ordering;
- fixes `liveEligible=false` and `executionDecision=no_live_activation`.

Run:

```bash
node --test scripts/reciprocal-trade-shadow/operation-intent-evaluator.test.mjs
node scripts/reciprocal-trade-shadow/validate-operation-intent-package.mjs
```

## Frozen product decisions represented

- Reciprocal Trade has `reciprocal_pledge_swap` and `paid_action` outer families.
- Seven other mechanism families remain independent.
- Paid Action preserves all nine substantive destination choices.
- Collateral, authorization, refund, tax, fee, reserve, and bonus legs are never substantive consideration.
- Co-Act can be a direct Feed opportunity or a typed nested obligation.
- Every mutation requires same-transaction revalidation.
- Product discovery, invitation delivery/acceptance, and research consent/waiver remain separate.
- Database comparison and collation are authoritative.
- `recommendation_graph_edges` is never matchability authority.
- Participant-level causal output is prohibited.

## Deliberate omissions

There is no SQL authority candidate, runtime adapter, migration, feature flag, QA fixture, production read, payment provider call, user contact, research execution, or deployment. The future live decisions listed in `ontology.v1.json` remain disabled rather than removed from the model.

## Conceptual boundary

The project papers constrain the design but do not establish software or empirical validity: factual evidence that conduct occurred does not establish counterfactual impact; threats, concentrated power, and defective collective decision procedures can destroy gains from trade; voluntary public-goods mechanisms remain vulnerable to free-riding.
