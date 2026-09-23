# Co-Funds in Discover

Discover is a live-backed trade directory at `/discover`. Initial browsing, searches,
filters, reset, bookmarked URLs and pagination use `POST /api/discover/search`.
There is no embedded example inventory or simulated pledge/messaging action.

Co-Funds remain under **Trade type**, not under a standalone Pools tab. They are
reciprocal trades whose contribution side is filled collectively. Their published
contribution, counterparty outcome, evidence, timing and status are shown without
inventing funding progress, contributors, trust edges or impact scores. **Review
trade** links to the existing canonical route; its normal commitment, authorization
and payment gates still apply. Browsing never creates a payment or an agreement.

Individual offers come from the same public-offer listing pipeline used by the
marketplace. Only `source=live`, `status=live`, non-worked-example listings qualify.
Co-Funds come from `loadLiveGroupBuyingSnapshot`, only when its source is live.
Unavailable sources are not confused with a successful zero-result search. Partial
coverage is labeled, including when one source returns no results.

Standalone Pools and prototype People/network views are not offered here. Legacy
view URLs open the list with an explicit retirement notice. Searches interpreted
as people or standalone pools ask the visitor to search for an exchange instead;
those records are not relabeled as trades.

Genuine instructional examples stay at `/worked-examples`, clearly separate from
current opportunities. Old source/payload/demo assets and their exclusive graph,
radar, lasso, simulated pledge and synthetic-date tests have been removed. Their
production safety, search, two-sided terms, history, empty/error state and mobile
contracts are covered by the live-only unit, source and browser tests instead.
