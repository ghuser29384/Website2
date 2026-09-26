# Commitments QA-only study instrumentation foundation v2

**Status:** review remediation applied and under exact-head review; MoralTrade QA only; synthetic-only; non-executing; not approved for production or real-user research

## Purpose

This tranche implements the non-executing study registry required by the accepted Commitments causal-identification protocol merged in `f93acc33c135f34bc28f006842d9e08120d5b859`. It exists only to prove that exact study designs, assignments, exposures, reviewed outcomes, safety vetoes, and synthetic calibration manifests can be recorded under a fail-closed contract.

It does not authorize a live study, change a user-facing offer, establish additionality, support participant-level causal credit, supply empirical calibration evidence, approve a PR #534 methodology, or activate a model.

## Review remediation

This exact package remediates substantive review `4908098411` on PR #612.

1. Every payload-bearing parent and child record is validated at the database boundary. Child payloads have exact per-table keys and synthetic-only values; outcome evidence references must use `qa-evidence://synthetic/`.
2. Repository and database artifacts use the same constrained canonical-JSON contract: recursively sorted ASCII identifier keys, compact arrays and objects, UTF-8 strings, safe integers, and non-exponential decimals in the supported range. Shared fixtures prove exact JSON and SHA-256 parity.
3. Registration requires both an exact study-instance payload and an exact validator attestation. The database binds the schema, validator, protocol, mechanism template, evidence-to-product mapping, and payload hashes.
4. The immutable study instance normalizes allowed arms and probabilities, exposure cells, outcomes and native units, and evidence schemes. Child records must match those bindings.
5. Every payload/hash pair is structurally rechecked by a trigger, including registry events, assignments, exposures, outcomes, safety events, calibration manifests, and the validator attestation.
6. The environment guard is an independently provisioned sentinel in `moraltrade_qa.environment_identity`, exact to project `hvmxfjjbdcgjjudmthdz`. The repository migrations verify but do not create it.
7. Cancellation and observed or unresolved safety vetoes create a derived blocked state. A blocked study cannot accept later assignments, exposures, outcomes, or calibration manifests; only prespecified diagnostic events remain possible.
8. Every protocol and study instance binds evidence-to-product mapping payload `sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8`.

## Exact accepted design bindings

- Master protocol: `sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a`
- Evidence-to-product mapping: `sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8`
- Study-instance schema raw source: `sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859`
- Study-instance validator raw source: `sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85`
- Validator-binding raw source: `sha256:2ef406b8db8d4fe43750d2abce23cca627b571b8f2164e448776a1cc853241d8`
- Trade template: `sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1`
- Co-Fund template: `sha256:441c6e82335c851e7e5ba80e291473caaf23600af7ca695849f994bc4867195c`
- Threshold Funding / DAC template: `sha256:44f934b72fb31f0fb2c2c01235bafffbe6dadc229062ee19da4c7858e70c344a`
- Donation Upgrade template: `sha256:a0c6ea80a989558070869d87aae41aabe7d34a8e011f41e53427015fc0e95512`
- Threshold Sign-On template: `sha256:dec601d3f34a3015cc7829d7a860a37b7f1be7b41112aec6a700833fc24890e8`
- Donation Redirect template: `sha256:f7486aa6d6532a316b2cc7e075dcb6b6e8a1ffe0c85dea345a1d2c6d4fbd756c`

## Exact QA migration state

The rejected v1 foundation remains in QA migration history and is superseded by the later remediation migrations. All study-instance and child tables were empty before the reset.

| Version | Migration | Normalized source SHA-256 |
|---|---|---|
| `20260811152545` | `commitments_impact_study_instrumentation_qa_only` | `59b52b93ab8ae63fd7d77a80225b55f46ad487c4bc9421baf0b485faf912f95e` |
| `20260811152958` | `commitments_impact_study_instrumentation_child_trigger_fix` | `4be5f1f30c565a45654bf1c807dddc9dacb6c6923734dc41450a5a2fb5fbc573` |
| `20260811161238` | `commitments_impact_study_instrumentation_review_remediation_core` | `f4db85780e42e6d2d8dea52523502e38992af212736b9cffffa9074f303af7ab` |
| `20260811161445` | `commitments_impact_study_instrumentation_review_remediation_instance_validator` | `cb52c75222bdfd62c3a0dc773b8ab7c4ba5bbeccf580b47089f122c8707b9236` |
| `20260811161708` | `commitments_impact_study_instrumentation_review_remediation_child_validators` | `d67d09c43d7948c392daa12f8b02079e55325c83234fc9bfccf1d07a3d60fac8` |
| `20260811161948` | `commitments_impact_study_instrumentation_review_remediation_rpcs` | `da1df98bcb49ac61aa5911d83aada9ded17a8810422cf450c315c4a22646cc6a` |
| `20260811162054` | `commitments_impact_study_instrumentation_review_remediation_privileges` | `8ec8cad342ca8f3c4e263cd2897e125cf49ef7d2a904a4a853bfc38972b5d678` |

The independently provisioned QA sentinel is migration-history state outside this PR. It is intentionally not a production migration and must not be copied into production.

## Security and lifecycle contract

- All instrumentation tables have RLS enabled.
- `anon` and `authenticated` have no table or writer-RPC access.
- `service_role` has read-only table access and narrow security-definer writer RPCs.
- Direct table updates and deletes are rejected by append-only triggers.
- `studyKey`, subjects, clusters, events, fixtures, datasets, and evidence references use synthetic-only namespaces.
- The one-argument registration RPC is permanently fail-closed; registration requires a validator attestation.
- Assignment-policy ITT is the only permitted initial causal estimand type, and its scope is policy-level.
- Outcome records cannot authorize causation, additionality, or participant credit.
- Synthetic calibration manifests are permanently ineligible for empirical calibration and model activation.
- Safety outcomes are blocking vetoes, not ordinary compensable outcomes.

## Verification contract

The dedicated GitHub gate must prove:

- exact QA project and sentinel identity;
- byte-for-byte equality between every repository migration and registered QA source;
- repository/database canonical-hash parity, including Unicode and numeric boundary fixtures;
- validator self-tests and exact schema/validator raw hashes;
- RLS, least privilege, and absence of real-user identifier columns;
- positive synthetic registration, attestation, assignment, exposure, outcome, safety, and calibration paths;
- rejection of invalid variants, participant-credit estimands, fake ethics states, invalid precision states, real identifiers, attestation tampering, unsupported arms, wrong probabilities, unsupported exposure cells, unregistered outcomes, wrong units, external evidence references, and payload-hash tampering;
- cancellation and safety-veto lifecycle blocking;
- append-only mutation rejection; and
- zero persistent synthetic residue after transactional tests.

## Remaining boundaries

- No owner-UAT study instance should be persisted until a second substantive exact-head review accepts this implementation.
- No real-user study can proceed without an independent ethics determination, design-specific precision simulation, frozen assignment and analysis code, exact provenance, and separate execution authorization.
- No synthetic QA record may be reused as empirical calibration evidence.
- No production migration, model activation, PR #534 approval, merge-driven runtime release, or deployment is authorized by this tranche.

The three Moral Trade papers remain conceptual safeguards rather than empirical evidence: Ord distinguishes factual from counterfactual trust and warns about perverse incentives; *Convergence and Compromise* emphasizes threats, power concentration, and defective collective decisions; and the moral-public-goods analysis emphasizes free-riding and the limited incentive effect of dominant-assurance bonuses.
