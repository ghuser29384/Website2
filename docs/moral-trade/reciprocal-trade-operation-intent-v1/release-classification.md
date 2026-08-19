# Release classification

- **Classification:** Repository-only design and shadow.
- **Disposition:** Do not merge or deploy; live-activation blockers remain.
- **Runtime effect:** None. No application source, public asset, dependency, build configuration, deployment configuration, or database file is changed.
- **Database effect:** None. No SQL authority candidate or rollback fixture is included, no migration is applied, and no database is contacted.
- **User effect:** None. No Feed, suggestion, invitation, review, private delivery, Co-Act, payment, settlement, or research behavior is wired.

## Why no SQL candidate is included

The owner allowed a SQL authority candidate only if it was safe and inactive. A documentation-only SQL sketch would not prove transaction behavior, while a migration file would make the exact diff runtime-affecting and could be mistaken for deployable authority. The pure evaluator captures the frozen semantics without creating that risk. A future SQL tranche must separately bind:

- complete structured-record projections and backfill policy;
- exact deployed PostgreSQL collation identity and parity tests;
- all mutation RPCs in one transaction;
- Paid Action live destination, provider, custody, identity, labor, tax, dispute, refund, and partial-completion decisions;
- migration, feature-flag, rollback, and production verification authorization.

## Mechanical blockers

Every decision schema fixes `liveEligible` to `false`. Every decision includes:

```text
DESIGN_SHADOW_ONLY
LIVE_ACTIVATION_NOT_AUTHORIZED
PRODUCTION_MIGRATION_NOT_AUTHORIZED
```

Paid Action decisions additionally carry `PAYMENT_DESTINATION_LIVE_ENABLEMENT_DEFERRED`. Research decisions additionally carry `RESEARCH_EXECUTION_NOT_AUTHORIZED`.

## Evidence boundary

- No production or QA row is read, copied, enumerated, or transformed.
- No real graph is constructed.
- No study is registered or executed.
- No assignment entropy, seed, or assignment is generated.
- No user is contacted, invited, or assigned by this work.
- No money, authorization, refund, or settlement is created.
- PR #534 methodology is neither approved nor activated.
- Software contract parity is not causal identification, empirical calibration, privacy approval, ethics approval, legal review, payment-provider readiness, or production safety evidence.
