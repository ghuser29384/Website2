# Reciprocal Trade eligible-graph feasibility package v1

**Status:** deterministic synthetic implementation only; repository-only; no real eligible-population snapshot; no assignment; no seed; no launch; no participant-level causal credit

This package implements the next non-executing step after the Reciprocal Trade precision-planning package. It defines a minimal eligible-graph snapshot contract, computes interference clusters as weakly connected components, checks whether a graph is structurally compatible with the frozen precision envelope, and fails closed when the graph cannot support that envelope.

The committed report analyzes a generated synthetic fixture. It does **not** complete the study instance's real `graphDiagnostics` requirement.

## Exact bindings

- Study instance: `sha256:1e31b1db59899fbf07fbf8b6219c8699f0c6b0ddbeb6e8717f989487660aaba2`
- Precision report: `sha256:3ff2613f93d166e5e06a5bf8cfcaf029cd49d4e56690e345f676a51f982f6b4f`
- Master protocol: `sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a`
- Reciprocal Trade template: `sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1`
- Graph-feasibility contract: `sha256:59a287312ee58c594e0dca4ba117ddd6081531ebaad6dd817e585e9da3ecc0fc`
- Synthetic graph spec: `sha256:b75aebdcf7272baa07ba8616693170ec07e05594aced78771c9cb2b40d0d54a8`
- Synthetic graph report: `sha256:edf93361dd35ccff39be361fa295bc991f51f7ff7cd79d6bf0e88236e0c7be7c`
- Synthetic snapshot: `sha256:7fcd3df31e568d84ca7c6537f6efaf9dd23b7570f62022a5a9d60421edd7df38`
- Snapshot schema: `sha256:14371c9be667ad4a9b570e45c3f02fd95e93eb69af07428e258163de4a46deb4`
- Diagnostic core: `sha256:b33fbc6976ea3b70527678bc406cb8a51d7e6f4da948175f6589b839b6701db8`
- Deterministic runner: `sha256:9c89256de78d497ac3ae21b6bbebe2a46a61b9915a9d9dc8af9e326c49834c5f`

## Privacy boundary

The committed schema and implementation accept only `synthetic_only` QA snapshots with `synthetic:`-prefixed identifiers. They reject real-user markers, reversible mappings, raw identifier fields, extra fields such as email or account identifiers, non-synthetic keys, missing endpoints, self-loops, and duplicate directed dyads.

A future real graph requires a separate protected-data authorization. Before diagnostics, internal identifiers would need to be replaced with keyed one-way pseudonyms; the secret and any reversible mapping must remain outside the repository; only the minimum topology and frozen study covariates may be exported; and only aggregate diagnostics may leave the protected environment. This package does not implement or authorize that export.

## Cluster definition

The diagnostic treats every weakly connected component of the eligible directed-dyad graph as one interference cluster. Direction is ignored for connectivity because an invitation, repeated counterparty, or multi-hop path can create interference in either direction.

The implementation deliberately does not split connected components. Splitting a giant component without a separately reviewed exposure mapping would create cross-cluster interference and unsupported assignment probabilities. An oversized component therefore produces `requires_new_precision_or_partition_review`, not an automatic partition.

Each component is assigned a deterministic stratum from:

- eligible-dyad count: `small_1_4`, `medium_5_10`, `large_11_40`, or `oversized_41_plus`;
- the highest baseline-completion risk band among its dyads; and
- its homogeneous opportunity type, or `mixed` if multiple types occur.

Every stratum must contain a multiple of four components before the blocked four-arm assignment design could be considered. The graph diagnostic itself never generates an assignment.

## Frozen structural envelope

The package checks compatibility with the precision assumptions already reviewed for this study candidate:

- at least 3,200 independent graph clusters;
- mean eight eligible directed dyads per cluster;
- cluster-size coefficient of variation no greater than 0.75;
- no cluster larger than 40 eligible dyads; and
- every stratum divisible by four.

A mismatch does not mean a study is impossible. It means the existing precision report no longer supports the design and a new exact precision or partition review is required.

## Synthetic fixture result

The deterministic fixture contains:

- 28,800 synthetic nodes;
- 25,600 synthetic eligible directed dyads;
- 3,200 weakly connected components;
- mean cluster size of 8 dyads;
- cluster-size coefficient of variation `0.395284707521`;
- maximum cluster size of 12 dyads;
- largest-cluster share of all dyads `0.00046875`; and
- four strata with 800 components each.

All synthetic privacy and structural checks pass, so the fixture's structural determination is `compatible_with_frozen_precision_envelope`.

The execution decision remains `no_launch` because no privacy-reviewed real graph exists, real exposure diagnostics are incomplete, ethics and consent determinations are incomplete, and no assignment entropy or execution authorization exists.

## Adversarial checks

The package validator proves that the implementation rejects or fails closed for:

- non-synthetic subject mode;
- a real-user-data marker;
- a raw email field;
- a non-synthetic node identifier;
- a reversible identifier mapping;
- a self-loop;
- a duplicate directed dyad;
- too few independent clusters;
- components larger than the frozen maximum; and
- a stratum count that is not divisible by four.

It also scans the implementation for assignment and entropy surfaces. `assignTradeClusters`, assignment manifests, pseudorandom assignment, `Math.random`, and cryptographic random-byte generation are absent.

## Evidence boundary

This package supports only a claim that the diagnostic implementation behaves as specified on deterministic synthetic graphs. It does not support:

- a claim that Moral Trade currently has 3,200 independent eligible clusters;
- a claim that an invitation policy is feasible on the real user graph;
- causal identification or empirical calibration;
- `expected_additional` or `direct_causal_attribution` for any participant;
- approval or activation of a PR #534 methodology; or
- enrollment, assignment, invitation, deployment, or database changes.

Toby Ord's *Moral Trade* motivates accounting for factual and counterfactual trust, negative externalities, and incentives to manufacture bad baselines. *Convergence and Compromise* motivates treating threats, concentration of power, and poor collective decision procedures as blockers. *Moral public goods are a big deal for whether we get a good future* motivates caution about free-riding and about treating assurance or dominant-assurance mechanisms as automatically successful. These are conceptual design constraints, not empirical evidence about Moral Trade's graph or users.

## Reproduction

```bash
node scripts/commitments-trade-study/validate-graph-feasibility-package.mjs
node scripts/commitments-trade-study/graph-feasibility.mjs --check
```

Changing the schema, contract, synthetic fixture, diagnostic code, report, privacy boundary, cluster definition, planning envelope, or no-launch state requires a new exact review.
