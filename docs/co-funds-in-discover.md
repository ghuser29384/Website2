# Co-Funds in Discover

## Product invariant

A **Co-Fund** is a reciprocal moral-trade offer whose contribution side is fulfilled by multiple contributors. A **Pool** is a standalone threshold-funded moral public good with no separate reciprocal counterparty obligation.

Discover therefore uses this taxonomy:

- `Offers` contains ordinary reciprocal offers and Co-Funds.
- `Pools` contains standalone threshold campaigns, including assurance-contract and dominant-assurance-contract mechanisms.
- `People` contains potential counterparties and participant profiles.

A threshold is not sufficient to classify an opportunity as a Pool. The decisive question is whether a contributor group is collectively satisfying one side of a reciprocal trade.

## Discover behavior

Co-Funds are public, searchable Offer records after the normal publication checks pass. They:

- appear in ordinary Offer results by default;
- can be isolated with `offerKind=co-fund`;
- use one canonical Offer listing rather than a duplicate Offer and Pool listing;
- display the contributor-group obligation and the counterparty obligation at a glance;
- display threshold, committed funding, contributor count, minimum contribution, deadline, failure terms, authorization expiry, and verification conditions;
- use `Join Co-Fund` as the primary action;
- do not expose a counteroffer action in the current fixed-term model.

The current static Discover prototype stages the join interaction for review only. It does not create a charge or payment authorization.

## URL and migration contract

Canonical Co-Fund URLs use:

```text
/discover?domain=offers&view=list&offerKind=co-fund
```

Legacy links for `pool-bio-salary` and `pool-factory-transition` are migrated to the corresponding canonical Offer records. The old records no longer appear in the standalone Pools inventory.

## Search interpretation

Natural-language searches containing `Co-Fund`, `cofund`, or `group-buying` route to `Offers` with `offerKind=co-fund`. Searches for `threshold pool`, `conditional funding`, or `dominant assurance contract` continue to route to standalone `Pools` unless the query explicitly asks for a Co-Fund.
