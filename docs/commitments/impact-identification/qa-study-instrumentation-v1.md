# Commitments QA-only study instrumentation foundation v1

**Status:** applied and transactionally verified in MoralTrade QA; repository change under review; non-executing; synthetic-only; not approved for production or real-user research

## Exact state

- Accepted internal protocol merge: `f93acc33c135f34bc28f006842d9e08120d5b859`
- Accepted protocol review: `4905985869`
- Master protocol payload: `sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a`
- QA project ref: `hvmxfjjbdcgjjudmthdz`
- QA instrumentation migration: `20260811152545_commitments_impact_study_instrumentation_qa_only`
- Exact registered source SHA-256: `59b52b93ab8ae63fd7d77a80225b55f46ad487c4bc9421baf0b485faf912f95e`
- Child-trigger repair: `20260811152958_commitments_impact_study_instrumentation_child_trigger_fix`
- Exact registered repair-source SHA-256: `4be5f1f30c565a45654bf1c807dddc9dacb6c6923734dc41450a5a2fb5fbc573`
- Production database: unchanged
- Real-user assignment: impossible under the current schema and RPC contracts

This tranche implements the first non-executing data plane beneath the accepted v2 causal-identification protocol. It can prove that immutable study specifications, synthetic assignments, exposure records, reviewed synthetic outcomes, safety-veto events, and synthetic calibration manifests fit together. It cannot run or simulate delivery of a treatment to a real user.

## Source-derived design constraints

Toby Ord distinguishes factual trust from counterfactual trust: evidence that an action occurred does not establish that it would not have happened without the trade. He also warns about moral externalities and incentives to manufacture a bad baseline. The instrumentation therefore records reviewed outcome quantity separately from causal or additionality claims, rejects real-person identifiers, and treats safety and baseline-manipulation indicators as vetoes.

*Convergence and Compromise* emphasizes that threats, concentrated power, and defective collective-decision procedures can eliminate gains from trade. The safety stream therefore preserves threat, coercion, identity-exposure, retaliation, concentration, exclusion, substitution, and duplicate-claim outcomes as blocking records rather than tradeable secondary endpoints.

*Moral public goods are a big deal for whether we get a good future* treats free-riding as difficult to solve and argues that dominant-assurance failure payments only mildly change incentives in the authors' model. The QA foundation therefore does not infer pledge pivotality or additionality from participation, and synthetic observations cannot become empirical calibration evidence or activate a model.

These sources motivate the safeguards. They are not Moral Trade outcome datasets or calibration evidence.

## Bound protocol and templates

The QA registry binds the exact accepted master protocol and the six exact non-executing templates:

| Mechanism | Template payload hash |
|---|---|
| Reciprocal Trade | `sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1` |
| Co-Fund | `sha256:441c6e82335c851e7e5ba80e291473caaf23600af7ca695849f994bc4867195c` |
| Threshold Funding / DAC | `sha256:44f934b72fb31f0fb2c2c01235bafffbe6dadc229062ee19da4c7858e70c344a` |
| Donation Upgrade | `sha256:a0c6ea80a989558070869d87aae41aabe7d34a8e011f41e53427015fc0e95512` |
| Threshold Sign-On | `sha256:dec601d3f34a3015cc7829d7a860a37b7f1be7b41112aec6a700833fc24890e8` |
| Donation Redirect | `sha256:f7486aa6d6532a316b2cc7e075dcb6b6e8a1ffe0c85dea345a1d2c6d4fbd756c` |

Every study-instance payload must include every field required by the accepted protocol, including the units, assignment design, exposure mapping, estimand, estimator, variance method, missingness estimand, graph diagnostics, precision simulation, ethics determination, consent or waiver status, concealment, safety outcomes, code hashes, seed commitment, and append-only provenance references.

## Tables

The migration creates:

- `impact_study_protocol_bindings`
- `impact_study_template_bindings`
- `impact_study_instances`
- `impact_study_registry_events`
- `impact_study_synthetic_assignments`
- `impact_study_synthetic_exposures`
- `impact_study_synthetic_outcomes`
- `impact_study_safety_events`
- `impact_study_calibration_manifests`

All tables have RLS enabled. `anon` and `authenticated` have no table access. `service_role` has read access but no direct insert, update, or delete access. Writes are possible only through the narrow service-role RPCs below. Update and delete triggers make every registry and instrumentation row append-only.

## Service-role RPCs

- `register_qa_impact_study_instance(jsonb)`
- `append_qa_impact_study_event(uuid,text,jsonb)`
- `record_qa_synthetic_assignment(...)`
- `record_qa_synthetic_exposure(...)`
- `record_qa_synthetic_outcome(...)`
- `record_qa_impact_safety_event(...)`
- `register_qa_synthetic_calibration_manifest(...)`

`anon` and `authenticated` cannot execute these RPCs.

## Structural fail-closed rules

1. Instrumentation environment is exactly `qa`.
2. Subject mode is exactly `synthetic_only`.
3. `execution_authorized` is always false.
4. `real_user_assignment_allowed` is always false.
5. Assignment subjects and clusters must use stable `synthetic:` keys.
6. Study payloads containing fields such as `userId`, `authUserId`, `profileId`, `email`, `phone`, `fullName`, or `legalName` are rejected.
7. Every study instance must match an exact protocol and exact mechanism-template payload hash.
8. Every study-instance payload must match its database columns and its canonical database payload hash.
9. A synthetic outcome requires a prior synthetic assignment for the same synthetic subject.
10. Reviewed outcomes require a native-unit quantity and at least one evidence reference.
11. Outcome rows cannot authorize a causal, additionality, or participant-credit claim.
12. Safety-event rows are always blocking veto records.
13. Calibration manifests are always `synthetic_qa_only`, have no applicable holdout, and are ineligible both for empirical calibration and model activation.

## Verification performed

A transaction-scoped regression proved:

- successful registration of a fully bound synthetic Reciprocal Trade study instance;
- successful append-only synthetic assignment, exposure, reviewed-outcome, safety, and calibration records;
- creation of the corresponding registry events;
- rejection of a UUID-shaped non-synthetic subject key;
- rejection of `executionAuthorized=true`;
- rejection of a payload containing an `email` field;
- rejection of update and delete attempts;
- correct RLS and table/RPC privileges;
- absence of real-user identifier columns; and
- ineligibility of the synthetic calibration manifest.

The regression rolled back. A separate readback confirmed zero synthetic study, assignment, exposure, outcome, safety, and calibration residue.

## Known repair

The initial migration's generic child-row trigger used a record field that does not exist on every child table. PostgreSQL attempted to resolve that field while inserting the initial registry event. Migration `20260811152958` replaces the trigger function with table-specific branches before accessing table-specific fields. The full transactional regression passed after this repair.

## Prohibited next steps

This foundation does not authorize:

- a real-user study;
- a production or QA treatment assignment;
- changes to invitations, matching terms, bonuses, payments, reveal rules, or offer ranking for research;
- collection of real-user research identifiers;
- classification of synthetic records as empirical evidence;
- approval or activation of a PR #534 impact methodology;
- publication of participant `expected_additional` or `direct_causal_attribution`;
- a production database migration; or
- a Vercel deployment.

A later executable study requires an immutable exact study instance, independent ethics determination, design-specific precision simulation, frozen assignment and analysis code, provenance registration, and separate explicit execution authorization.
