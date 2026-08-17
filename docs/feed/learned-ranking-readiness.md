# Feed learned-ranking readiness

## Status

This is a repository-only, non-activating readiness gate. It answers one narrow question:

> Is the available evidence complete enough to enter an independent calibration review?

It does **not** answer whether a learned ranker should be activated. It changes no runtime route, ranking behavior, database object, model artifact, experiment, user exposure, or deployment state.

The authoritative non-learned baseline remains:

- readiness key: `deterministic_pareto_safe_bootstrap`;
- current implementation key: `pareto-heuristic-v1`.

## Closed decision vocabulary

The evaluator may return only:

- `not_ready`;
- `eligible_for_calibration_review`.

Every result also returns:

```text
learnedRankingMayActivate = false
```

`eligible_for_calibration_review` is therefore not an activation decision, release approval, production cutover, or empirical-validity claim. A separate reviewed calibration result and a separately authorized product/release decision would still be required.

## Evidence provenance

Only `durable_real_observations` can satisfy the provenance gate. The following do not:

- synthetic or QA fixtures;
- demonstrations;
- simulations;
- mixed or unknown provenance;
- unavailable provenance.

Software tests can validate the gate's behavior. They cannot supply product calibration evidence.

## Required observation families

All seven observation families must be explicitly available:

1. exposure;
2. response;
3. terminal outcome;
4. completion;
5. additionality;
6. safety;
7. observation-window duration.

An unavailable observation remains unavailable. It is never converted to zero and never compared with a numerical minimum.

## Reviewed policy requirement

The evaluator has no built-in sample-size, duration, calibration, or safety thresholds. It accepts numerical minima only from an explicit policy object containing:

- a non-empty policy identifier;
- a non-empty policy version;
- a non-empty source hash;
- an explicit approval decision;
- one non-negative finite minimum for every required observation family.

A missing, unapproved, unidentified, incomplete, negative, infinite, or non-numeric policy fails closed. This prevents code defaults from silently becoming empirical activation criteria.

## Independent reviews

All of the following must be approved:

- source binding;
- independent calibration;
- privacy;
- safety.

Missing and unapproved reviews are treated identically for readiness: the result is `not_ready`.

## Stable reason ordering

Reason codes are emitted in this order:

1. policy availability, approval, identity, and minima;
2. observation provenance;
3. observation availability, validity, and reviewed-minimum checks;
4. independent review decisions.

Within observation and review groups, the order is fixed by the source constants. Identical input therefore yields byte-stable reason ordering.

## Runtime isolation and source guard

The readiness evaluator is not imported by runtime code. A repository source guard fails if:

- runtime code imports the readiness module;
- repository code adds a direct `learnedRankingMayActivate: true` or equivalent assignment;
- the readiness source stops fixing results to non-activation;
- the two-status vocabulary or deterministic baseline identity changes without updating the gate.

The guard does not claim that existing Pareto training, shadow estimation, or runtime model infrastructure is empirically validated. It prevents this readiness artifact from becoming an unreviewed activation path.

## Release boundary

This tranche is limited to:

- the pure readiness evaluator;
- focused deterministic tests;
- repository-wide release guards;
- this specification;
- a permanent GitHub Actions workflow.

It intentionally contains no application import, migration, dependency change, public asset, provider call, payment behavior, database read, user-data access, Vercel mutation, or production release.
