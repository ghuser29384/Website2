# Reciprocal Trade real-graph readiness gate v1

**Status:** aggregate metadata only; repository-only; no row-level query; no protected export; no real graph diagnostic; no assignment; no launch; no participant-level causal credit

This package records the next fail-closed step after the merged Reciprocal Trade precision-planning and deterministic synthetic graph-feasibility packages.

A read-only Supabase table-metadata inspection at `2026-08-13T15:46:35Z` found:

| Environment | Profiles | Offers | Invitations | Threads | Agreements | Privacy grants | Recommendation graph edges |
|---|---:|---:|---:|---:|---:|---:|---:|
| Production | 5 | 0 | 0 | 0 | 0 | 0 | 1 |
| MoralTrade QA | 14 | 1 | 0 | 0 | 0 | 0 | 0 |

No row, offer term, participant identifier, invitation token, message, evidence item, node list, or edge list was read or copied.

## Current determination

The runtime reciprocal-match query requires another published, open offer owned by another user, in the same mode, with reciprocal offered and requested causes. With zero production offers and one QA offer, neither environment can contain a reciprocal offer pair. The current eligible directed-dyad count is therefore exactly zero without inspecting any row contents.

```text
dataReadiness = insufficient_real_eligible_graph
eligibleDirectedDyadCount = 0
realGraphDiagnosticsStatus = blocked_not_run
protectedDataExportAuthorized = false
privacyReviewStatus = required_not_completed
ethicsDeterminationStatus = required_not_completed
assignmentGenerated = false
assignmentSeedGenerated = false
executionDecision = no_launch
```

Current user count is not study sample size.

## Canonical eligibility blocker

The existing runtime function `listReciprocalMatches` is bound at main commit `ec6f1ecc12df5db74e3e2f8acb87c3f04aedae5b` and Git blob `4d7bcd9c9e89d06c9d478be1c10874861662727e`. It expresses the current reciprocal query, but this package does not treat it as a complete research eligibility source. A research graph must also bind the exact applicable moderation, harmful-offer, legality, consent, block, restriction, and lifecycle gates. No single frozen server function or database view currently establishes that complete contract.

Accordingly:

```text
canonicalEligibilitySourceStatus = required_not_completed
```

This package does not add a runtime matcher or production migration merely to clear that blocker.

## Recommendation graph exclusion

The production `recommendation_graph_edges` table contains one aggregate-counted row. That table is a recommendation-learning surface. It is not the frozen eligible Reciprocal Trade graph and is explicitly prohibited as a canonical source by this contract.

## Future protected-data run

A future real diagnostic requires a new exact authorization record satisfying `protected-data-run-contract.schema.v1.json`. Among other controls, it must require:

- independent privacy and ethics determinations;
- independently approved consent or waiver treatment;
- an exact canonical eligibility source;
- a purpose-limited least-privilege service identity;
- append-only access logging;
- fresh study-specific HMAC-SHA256 pseudonyms using a 256-bit secret held outside GitHub and outside artifacts;
- no unkeyed identifier hashes or reversible mapping;
- raw identifiers and free text retained in the source system;
- encrypted ephemeral processing, no more than 24 hours of working retention, verified deletion, and a deletion-receipt hash;
- an independently approved small-cell policy;
- aggregate-only outputs;
- no node list, edge list, assignment seed, assignment manifest, invitation, study registration, participant causal credit, or PR #534 activation.

The schema is a future-run contract. It is not authorization to execute it.

## Evidence boundary

This package supports only the conclusion that the current aggregate data state cannot support a real Reciprocal Trade graph-feasibility analysis and that a protected export would add privacy risk without producing the required 3,200-cluster evidence.

It does not support causal identification, empirical calibration, transportability, model health, confidence labels, participant `expected_additional`, participant `direct_causal_attribution`, or approval or activation of any PR #534 methodology.

The conceptual source boundary remains unchanged:

- Toby Ord's *Moral Trade* distinguishes factual trust from counterfactual trust and identifies negative externalities and baseline-manufacture incentives.
- *Convergence and Compromise* identifies threats, concentrated power, and poor collective-decision procedures as potential value-destroying blockers.
- *Moral public goods are a big deal for whether we get a good future* emphasizes free-riding and does not provide empirical Moral Trade calibration.

These sources constrain interpretation. They are not evidence that the current graph is feasible.

## Exact bindings

- Study instance: `sha256:1e31b1db59899fbf07fbf8b6219c8699f0c6b0ddbeb6e8717f989487660aaba2`
- Precision report: `sha256:3ff2613f93d166e5e06a5bf8cfcaf029cd49d4e56690e345f676a51f982f6b4f`
- Master protocol: `sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a`
- Reciprocal Trade template: `sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1`
- Synthetic graph-feasibility contract: `sha256:6c6879a80062a6e923714bdf3e7e79105de8049a3347088a6f4b77507b8e6c95`
- Evidence-to-product mapping: `sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8`
- Aggregate evidence: `sha256:400d40a4ca1592d601ed9f3fdc5b228cc6e6d13f64b126d98eecc81d3a2a1197`
- Readiness contract: `sha256:fc1274b0ecb26de8f93a06e4f12e22ff6f1d440c2dd53dbbd69f4a597a0ab14a`

## Reproduction

```bash
node scripts/commitments-trade-study/validate-real-graph-readiness-package.mjs
node scripts/commitments-trade-study/validate-planning-package.mjs
node scripts/commitments-trade-study/validate-graph-feasibility-package.mjs
node scripts/validate-commitments-impact-identification.mjs
```

Changing current evidence, bindings, the canonical-source decision, protected-run requirements, or the no-launch boundary requires a new exact review.
