# Differential source map v1

The machine-readable source is `differential-source-map.v1.json`. This companion summarizes every tracked current Feed, reciprocal suggestion, mutation, invitation, review, private-delivery, downstream agreement, structured-gate, block/restriction, and research source at exact base `75fd512e6cf82e2c51df53e211b854c0263109c3`.

| Current surface | Current behavior | Shadow coverage | Activation disposition |
| --- | --- | --- | --- |
| Base Live Now inventory and hybrid ranker | Mixes public offers, donation redirects/pools, and synthesized candidates without one authority envelope | Unified envelope and ranking non-override contract | Deferred |
| A1 additional mechanisms | Adds Donation Upgrade-like and public-goods candidates to shared ranking | Independent mechanism IDs and cross-mechanism fixtures | Deferred |
| Pareto ordering and learning types | Orders candidates and records exposure state | Ranking is explicitly non-authoritative; graph substitution prohibited | Deferred |
| `listReciprocalMatches` | Equal legacy mode, published/open, distinct owner/offer, two PostgreSQL `ILIKE` predicates | Both frozen outer families, DB-bound compatibility, full common gates | Blocked pending DB authority |
| Manage-proposal suggestion UI | Assumes every result can start a thread | Suggestion/start equivalence | Blocked pending runtime wiring |
| `startSuggestedMatchAction` | Separately loads offers, may reuse non-closed blocked thread, then mutates | TOCTOU, concurrency, active engagement, nested failure | Blocked pending atomic RPC |
| Invitation page/action | Creates email-bound or first-claim invitations through the RPC | Delivery/acceptance separation, duplicate and pair gates | Blocked pending common authority |
| Invitation SQL chain | Pair lock/block checks plus pledge-only `offer_is_invitable` | Complete ontology, all live Paid Action destinations disabled | Blocked pending DB candidate |
| Ordinary review router/action | Publishes by workflow/status update; routes Feed-derived approval separately | Exact revision and all structured source gates | Blocked pending source binding |
| Feed private-delivery action/`moral_trade_feed_create_deliver_service` RPC | Atomically preserves source terms version and private source relationship | Exact ID/version/hash/revision, private channel, no-publication | Blocked pending full gates |
| Invitation response, counterproposal, confirmation | Rechecks selected invitation/block/version/agreement facts | Listed as downstream same-authority consumers | Intentionally deferred |
| Structured evaluator candidates | Detailed fail-closed contracts exist but are not bound to matching | Explicit source/target structured gate inputs | Blocked pending atomic projection |
| Blocks, restrictions, engagements, history | Stored under multiple schemas and time rules | Typed current blockers and terminal-history fields | Blocked pending normalized projection |
| Research and `recommendation_graph_edges` | Research checks inspect matcher source; training writes ranking edges | Separate research consent/purpose and graph/causal prohibitions | Prohibited or deferred |

## Exact active deltas

1. `listReciprocalMatches` accepts any equal supported legacy mode; `offer_is_invitable` accepts only nonfinancial pledge offers.
2. `startSuggestedMatchAction` does not share the listing or invitation authority and can reuse a blocked non-closed thread.
3. Ordinary approval clears a text reason and changes lifecycle state without binding the available structured records.
4. Feed private delivery has a useful same-transaction source-revision contract but remains a separate incomplete gate set.
5. Current Feed code already crosses mechanisms but lacks a closed authority envelope and complete frozen ontology.
6. PostgreSQL `ILIKE` collation is not frozen in the repository.
7. Pair blocks, restrictions, active engagements, and terminal history are not projected by one approved transaction-consistent source.
8. Recommendation-learning edges are ranking inputs, not matchability evidence.

## Coverage status

Every row is either:

- covered by the pure synthetic evaluator and schemas;
- intentionally deferred with a named blocker; or
- explicitly prohibited.

No current call site imports the evaluator. No `src/` or `supabase/` file is changed. The permanent validator scans the tracked symbols and fails if a matching source file is not represented by at least one row.
