# Private Evidence-Credibility Shadow Collection v1

## Status

This tranche implements the first collection surface required by the Evidence Decision → Contextual Credibility calibration plan. It remains **private, administrator-only, and shadow-only**.

It does not authorize or cause:

- public credibility changes;
- discovery, ranking, exposure, eligibility, safeguard, or restriction effects;
- model-parameter changes;
- production migration application;
- participant-visible shadow output;
- random-audit sampling or model fitting.

## Scope

The collection surface identifies final milestone and settlement outcomes that do not yet have a matching current shadow decision. An AAL2 administrator can inspect the frozen source record and record a private calibration judgment through the existing append-only shadow-decision RPCs.

The surface captures:

- a separate decision-confidence band;
- relied-on provenance class;
- provider-authentication status and reference when applicable;
- contradiction and integrity findings for milestone evidence;
- responsiveness and dispute-conduct findings;
- finality reason and any required private exclusion reason;
- a private operator rationale stored in an append-only collection audit record.

Adjudication class is derived from the underlying final review or payment decision whenever possible. Supersession is explicit. Replaying the same submission is idempotent.

## Authorization

Queue listing and collection writes require both:

1. an active Moral Trade administrator role; and
2. an AAL2 session.

Anonymous, AAL1, ordinary authenticated, reviewer-only, and direct-table access remain fail-closed. The collection audit table has RLS enabled and no direct grants to ordinary roles.

## Queue semantics

### Milestone evidence

A milestone enters the private queue when it has a final source state and either:

- no current evidence decision exists; or
- the current source review or finality no longer matches the current terminal evidence decision and a superseding decision is required.

Reviewed cases derive adjudication as `neutral_review_final` or `appeal_review_final`. No-review terminal cases derive `platform_established`, except that authenticated-provider sources derive `provider_established` at write time.

### Settlement

A final payout enters the private queue when it has a terminal source state and either:

- no current settlement shadow decision exists; or
- the current payment decision or finality no longer matches the current terminal settlement decision and a superseding decision is required.

Reviewed payment cases derive neutral or appeal adjudication. Directly confirmed or not-due outcomes derive platform adjudication unless authenticated-provider provenance is selected.

## Private audit record

Every collection write creates one immutable `credibility_shadow_collection_audit` record linked to the resulting evidence or settlement decision. It preserves:

- the queue key and source identifiers;
- the explicit supersession link;
- the operator's private rationale;
- a narrow source snapshot;
- the authenticated administrator who recorded it.

The audit record is not a public explanation and is not included in analytical exports without a separate approval.

## Release boundary

This branch is stacked on PR #601 and must remain draft and unmerged. Its migration may be applied only to the isolated MoralTrade QA project for verification. Production remains out of scope until a separate explicit authorization.
