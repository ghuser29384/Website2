# Pareto-safe causal recommendation learning

This document describes the second-generation Moral Trade Feed model. It extends the public-only semantic reciprocal ranker with outcome learning while preserving the distinction between relevance and an executable moral trade.

## Objective

The system does **not** aggregate different moral views into one platform-defined cardinal utility. It estimates a vector:

- probability that the viewer regards the completed outcome as better than no trade;
- probability that the counterparty regards it as better by their own lights;
- probability of verified completion;
- counterfactual additionality;
- externality safety;
- substantive compatibility with the viewer's stated priorities.

A candidate may be presented as **Direct** only when every required component clears its threshold. The learned objective is therefore Pareto-safe additionality rather than engagement, acceptance alone, or a platform moral-value score.

## Learned components

1. **Collaborative filtering.** An implicit-feedback factor model learns from typed in-product interactions and verified outcomes. The viewer–opportunity dot product captures patterns among people with similar behavior without using demographic attributes.
2. **User–opportunity graph.** `recommendation_graph_edges` aggregates positive and negative interaction weights, proposals, acceptances, completions, satisfaction, and additionality.
3. **Counterparty acceptance.** Owner-specific proposal, acceptance, completion, satisfaction, additionality, cancellation, and report rates are Bayesian-shrunk toward the platform baseline.
4. **Completion calibration.** Logistic heads are calibrated on a deterministic validation split. Models remain in shadow mode until minimum sample, positive-outcome, and Brier-score gates pass.
5. **End-to-end outcome learning.** The training target requires verified completion, gains reported separately by both participants, additionality, and externality safety.
6. **Automated weights and thresholds.** Training fits feature weights and searches thresholds subject to a minimum precision constraint. A new model is activated only after data and calibration gates pass; otherwise it is stored as a shadow model.

## Cold start

The production marketplace initially has too few completed trades to justify an active learned model. The new system therefore runs learned predictions in **shadow** while the transparent semantic/reciprocal estimates remain operational. A shadow model may downgrade an unsafe apparent Direct match, but it cannot promote a lower class into an executable Direct claim.

Current default activation gates require at least:

- 1,000 logged exposures;
- 50 distinct profiles;
- 100 distinct opportunities;
- 30 completed positive outcomes;
- 40 post-completion outcome reports;
- enabled viewer, counterparty, completion, and end-to-end heads;
- core validation Brier scores no worse than 0.24.

These values are code defaults, are audited in each training run, and can be revised through a reviewed model version rather than an unlogged runtime edit.

## Five-percent causal holdout

The selected experiment is `pareto-nondirect-holdout-v1`.

- Direct matches are never withheld or randomized.
- At most one non-Direct candidate is assigned to the holdout in a Feed request.
- Five percent of eligible user-days enter the experiment.
- The assignment is stable for the UTC day.
- A selected Near, Adjacent, or Discovery candidate is paired with a comparable candidate just outside the displayed batch.
- A deterministic 50/50 coin decides which member of the pair is shown.
- The request assignment probability, conditional display probability, total pair probability, shown arm, and held-out arm are written to `recommendation_exposures`.
- No sensitive demographic attribute is used in assignment or ranking.

The daily training job stops the experiment automatically when mature samples show a material deterioration in reports/externality safety, completion, or satisfaction. The experiment can also be disabled immediately with `RECOMMENDATION_CAUSAL_EXPERIMENT_ENABLED=false`.

## Outcome collection

After both participants confirm completion, each sees a private outcome form on the agreement page. Each person separately reports:

- gain by their own lights;
- satisfaction;
- estimated probability that the outcome would have happened without the trade;
- observed externality concern;
- an optional private note.

The record is private, does not alter the frozen agreement, and is not published with evidence. Additionality is computed as one minus the reported no-trade probability.

## Privacy boundary

The learning pipeline uses IDs, typed in-product events, public opportunity terms, route-feasibility outputs, and completed-trade outcomes. It does not ingest raw private profile prose or sensitive demographic attributes. The existing external embedding provider continues to receive only public opportunity text and fixed public concept descriptions.

Model artifacts, graph edges, factors, owner statistics, exposure propensities, and training runs are service-role-only tables protected by row-level security. Participants may read and edit only their own outcome-feedback row for an agreement in which they participated.

## Training schedule and failure behavior

`/api/jobs/recommendation-training` runs daily through Vercel Cron. It writes a new immutable model version and audit run. If extraction or training fails, the current model remains unchanged. Provider, cache, model-store, or exposure-write failures do not fabricate recommendations; the Feed falls back to the existing transparent ranker.
