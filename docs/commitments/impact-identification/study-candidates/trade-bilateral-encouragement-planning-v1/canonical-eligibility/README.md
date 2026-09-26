# Reciprocal Trade canonical research-eligibility candidate v1

This repository-only package defines and tests a **candidate** normalized evaluator for deciding whether two synthetic Reciprocal Trade offers satisfy a directed research-edge contract. It does not authorize a protected-data inspection. Its staged status is:

```text
canonicalEligibilitySourceStatus = blocked_source_conflict
realGraphDiagnosticsStatus = blocked_not_run
protectedDataExportAuthorized = false
executionDecision = no_launch
```

The source status is blocked because active sources do not enforce one contract: `listReciprocalMatches`, the invitation RPCs, `startSuggestedMatchAction`, and Feed-derived private delivery apply different gates. Structured moderation, noncompensable-blocker, validity, baseline, participant-policy, privacy, and restriction sources also are not bound into the live matcher. The evaluator therefore remains disconnected from application code and accepts only an explicit normalized object; all protected inputs fail.

## Evidence boundary

- No production or QA row was read, copied, enumerated, or transformed.
- No real graph, node list, or edge list was constructed.
- No participant was enrolled, contacted, invited, assigned, or shown causal output.
- No study record, assignment seed, entropy, or assignment manifest was generated.
- No database, Supabase, Vercel, migration, runtime matcher, or deployment action is part of this package.
- Privacy review, ethics determination, and consent/waiver determination remain incomplete.
- The immutable PR #659 readiness evidence remains unchanged: the current inspected graph was too small, with zero eligible directed dyads.
- PR #534 remains draft, inactive, and without participant-level causal output.

Passing these software checks is not empirical calibration, causal identification, model health, methodology approval, privacy approval, ethics approval, or legal review.

## Artifacts

| Artifact | Purpose |
| --- | --- |
| `policy-source-manifest.v1.json` | Exact base, source paths/symbols, Git blob hashes, raw SHA-256 hashes, authority classes, gate inputs, time semantics, and conflicts. |
| `policy-source-map.v1.md` | Human-readable authority analysis and source-conflict conclusions. |
| `eligibility-input.schema.v1.json` | Closed normalized-input contract used directly by the evaluator; diagnostic mismatch states are intentionally admitted and then blocked semantically. |
| `eligibility-decision.schema.v1.json` | Closed aggregate-safe decision contract that enforces public ineligibility and separates candidate reasons from global blockers. |
| `eligibility-gap-register.v1.json` | Every unresolved source, authorization, projection, and readiness blocker. |
| `synthetic-eligibility-fixtures.v1.json` | 97 synthetic/adversarial cases, including synthetic-namespace attacks and a metadata-only cluster-count canary. |
| `canonical-eligibility-manifest.v1.json` | Exact hashes and release boundary for this package. |
| `scripts/commitments-trade-study/reciprocal-trade-research-eligibility.mjs` | Deterministic evaluator that imports only the two frozen JSON Schemas; no network, database, clock, random source, logging, or side effects. |
| `scripts/commitments-trade-study/reciprocal-trade-research-eligibility.test.mjs` | Focused fixture and invariant tests. |
| `scripts/commitments-trade-study/validate-reciprocal-trade-research-eligibility.mjs` | Independent artifact, source-binding, purity, and output validator. |

The canonical manifest binds every other package artifact by Git blob SHA-1 and raw SHA-256. It intentionally does not include its own byte hash, which would create a recursive self-hash; the exact candidate manifest hash is recorded after the candidate is frozen.

## Candidate semantics

The evaluator validates every input against the complete frozen input schema before semantic evaluation and validates every emitted decision against the complete frozen decision schema. Its effective time is the exact UTC timestamp supplied by the input. It reads neither the clock nor environment state. Missing, unknown, stale, contradictory, unbound, review-required, or structurally unexpected input fails closed.

The synthetic candidate uses the safe overlap of active offer-mode enforcement: `pledge` only, with no payment schedule, donation-offset attachment, or active performance bond. That narrowing is not declared canonical because the live suggestion query permits any equal mode while the invitation RPC is narrower. It reproduces the live query's two directed PostgreSQL `ILIKE` predicates for printable ASCII, including `%`, `_`, and backslash pattern behavior. A malformed trailing escape, non-ASCII value, or unbound collation fails closed because the deployed database locale/collation is not frozen in the repository.

Safety, legality, consent, and restriction truth must arrive as structured normalized state. `policyManifestHash` identifies the governing candidate package only; it is not an evidence-source hash. Every synthetic gate names its `gateId` while `evidenceProvenanceStatus = unresolved_not_bound` and `evidenceSourceId`, `projectionHash`, and `attestationHash` remain null. That unresolved provenance is a global eligibility blocker. The harmful-offer gate includes the repository's dedicated noncompensable-blocker contract for match-candidate generation, not only content moderation. Free text, empty `moderation_reason`, account creation, recommendation-learning edges, and recommendation exposures are never eligibility evidence.

`candidatePolicySatisfied` reports whether a schema-valid synthetic pair passes the candidate software rules. Public `eligible` remains `false` while the canonical source is conflicted, gate evidence provenance is unresolved, or privacy, ethics, or consent/waiver determinations are not approved. Stable `globalBlockerReasons` make those stop conditions non-ignorable. Synthetic mode also requires every snapshot, offer, and owner key to use the `synthetic:` namespace; `pseudonym:sha256:` keys are rejected in synthetic mode. Protected mode remains globally blocked.

`syntheticClusterCountMetadata` is caller-supplied metadata and is not consumed by candidate evaluation. The 3,200-value fixture is explicitly a metadata-only canary; it does not contain, derive, iterate over, or evaluate a 3,200-cluster graph. The existing deterministic graph-feasibility package remains separate and is revalidated independently.

## Validation

Run from the repository root:

```bash
node --test scripts/commitments-trade-study/reciprocal-trade-research-eligibility.test.mjs
node scripts/commitments-trade-study/validate-reciprocal-trade-research-eligibility.mjs
node scripts/commitments-trade-study/validate-real-graph-readiness-package.mjs
node scripts/commitments-trade-study/validate-real-graph-readiness-integrity.mjs
node scripts/commitments-trade-study/validate-graph-feasibility-package.mjs
node scripts/commitments-trade-study/validate-planning-package.mjs
node scripts/validate-commitments-impact-identification.mjs
```

The focused workflow also runs relevant existing offer lifecycle, moderation, blocking, restriction, privacy, validity, baseline, participant-eligibility, matcher, and agreement contract tests. Its permanent pull-request and `main` triggers conservatively cover every bound source, bound test, and upstream impact-identification artifact; the validator proves this coverage. Browser, database, TypeScript compilation, and production build checks are not applicable to this package: changed files stay under `docs/`, `scripts/`, and `.github/workflows/`; the evaluator is plain JavaScript and is not imported by the application dependency graph. The workflow enforces that exact scope.

## Conceptual boundary

Ord's distinction between factual compliance and counterfactual effects, MacAskill and Moorhouse's warnings about threats and concentrated power, and Davidson, MacAskill, and Taylor's analysis of moral-public-good free-riding constrain the design. They are conceptual sources only. The papers, fixtures, code tests, and GitHub Actions output are not empirical eligibility, calibration, or causal evidence.

## Next blocker

Before any protected evaluation, the project must resolve every active-source conflict in `eligibility-gap-register.v1.json`, establish one transaction-safe matchability authority across all runtime call sites, freeze exact collation/projection semantics, and obtain explicit privacy, ethics, and consent/waiver determinations. A future authorized aggregate re-inspection would still be separate and would need to show that the graph is no longer too small.
