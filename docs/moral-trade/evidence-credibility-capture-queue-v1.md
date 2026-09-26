# Evidence-Credibility Private Capture Queue v1

## Status

This tranche implements **Tranche A** from the Evidence Decision → Contextual Credibility calibration plan.

It is private, administrator-only, and shadow-only. It does not authorize merging or deploying PR #601, applying any migration to production, changing provisional numerical weights, or enabling any participant-facing effect.

## Purpose

The shadow evidence-decision model cannot be calibrated from synthetic fixtures. It needs a consistent stream of terminal, role-specific observations that preserve:

- factual completion or settlement outcome;
- decision confidence;
- source provenance;
- provider-authentication status;
- adjudication;
- explicit evidence-integrity, responsiveness, and dispute-conduct findings;
- finality and supersession history;
- a private operator rationale.

The capture queue gives an AAL2 Moral Trade administrator a bounded surface for recording those fields after the participant-facing evidence or settlement process reaches finality.

## Route

`/admin/evidence-calibration`

The route is dynamic, excluded from indexing, and not linked from any public or participant-facing navigation. Access requires:

1. an authenticated profile;
2. an active `administrator` grant in `trade_review_role_grants`;
3. at least one verified authenticator factor; and
4. an AAL2 session.

The database independently repeats the AAL2-administrator check. Hiding the route is not an authorization control.

## Queue contracts

### Final evidence outcomes

`list_trade_evidence_shadow_capture_queue_v1` returns only:

- a current final milestone review and final payout without a matching current shadow decision;
- a later final review, such as an appeal, that must explicitly supersede the current shadow decision;
- an expired replacement opportunity;
- a cancelled, disputed, or expired lifecycle state that supports one of the existing no-review finality paths; or
- an overdue evidence state with no submitted bundle, for an administrator-confirmed abandonment decision.

The projection includes frozen terms, evidence-rule text, no-trade baseline, aggregate evidence-item counts and types, final review facts, and current supersession lineage. It does not expose raw files, links, attestations, private review reasons, provider references, or participant identities.

### Final settlement outcomes

`list_trade_settlement_shadow_capture_queue_v1` returns only final payout states:

- `not_due`;
- `confirmed`;
- `adjudicated_paid`; or
- `still_due`.

A later current payment-review decision or changed terminal payout outcome requires explicit supersession. Due, disputed, correction-pending, review-pending, and appeal-pending payments are excluded.

Moral Trade remains noncustodial. Capturing a settlement decision never moves, holds, releases, refunds, or transfers funds.

## Recording contracts

The route calls two administrator wrappers:

- `record_trade_evidence_shadow_capture_v1`
- `record_trade_settlement_shadow_capture_v1`

The wrappers:

1. require service role or an AAL2 administrator;
2. refuse service unless `evidence_decision_v2` remains in `shadow` mode and every effect switch is false;
3. derive adjudication from the current final review or payout state;
4. validate that no-review finality is supported by the canonical lifecycle state;
5. call the existing append-only shadow RPC;
6. store one immutable private rationale and SHA-256 hash for the resulting decision;
7. make identical replay idempotent;
8. reject a later attempt to attach a different rationale to the same decision; and
9. preserve explicit supersession instead of overwriting history.

`trade_shadow_capture_records` has RLS enabled. Anonymous and ordinary authenticated roles have no direct table privileges. Its rows are append-only.

## Preserved boundaries

- Factual completion remains separate from payout factor and decision confidence.
- Provenance remains separate from adjudication.
- Weak proof is not automatically misconduct.
- Deliberate fabrication creates only the already-governed private shadow signal; it does not directly activate a restriction.
- Completion evidence does not establish causal additionality.
- Public evidence remains limited to the existing six-field privacy projection.
- No public, ranking, exposure, safeguard, eligibility, restriction, payment-custody, or additionality effect is introduced.
- All `credibility_shadow_controls` effect switches remain unchanged and false.

## QA contract

The dedicated capture workflow must prove, on the isolated Moral Trade QA project only:

- exact migration and source scope;
- AAL2 administrator success;
- anonymous, AAL1, non-administrator, and direct-table denial;
- queue discovery for current final outcomes;
- immutable rationale and idempotent replay;
- explicit supersession without double-counting;
- unchanged active credibility and restrictions;
- unchanged fail-closed controls;
- rollback of every synthetic fixture;
- focused contracts, complete repository tests, ESLint, strict TypeScript, and production build.

Production project `jnpoxvalyjtdghnperyu` is out of scope. No production migration or deployment is authorized by this tranche.

## Next tranche

After this queue is accepted and separately authorized for shadow-only collection, the next tranche is private random blind-audit assignment. It must remain separate from this implementation, model fitting, public display, and activation.
