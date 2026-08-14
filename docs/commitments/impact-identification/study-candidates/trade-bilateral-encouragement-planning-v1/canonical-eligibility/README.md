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
| `eligibility-input.schema.v1.json` | Closed normalized-input contract with no raw account or offer identifiers. |
| `eligibility-decision.schema.v1.json` | Closed aggregate-safe decision contract. |
| `eligibility-gap-register.v1.json` | Every unresolved source, authorization, projection, and readiness blocker. |
| `synthetic-eligibility-fixtures.v1.json` | 89 synthetic/adversarial cases, including the non-executing 3,200-cluster control. |
| `canonical-eligibility-manifest.v1.json` | Exact hashes and release boundary for this package. |
| `scripts/commitments-trade-study/reciprocal-trade-research-eligibility.mjs` | Pure deterministic evaluator; no imports, I/O, clock, random source, logging, or side effects. |
| `scripts/commitments-trade-study/reciprocal-trade-research-eligibility.test.mjs` | Focused fixture and invariant tests. |
| `scripts/commitments-trade-study/validate-reciprocal-trade-research-eligibility.mjs` | Independent artifact, source-binding, purity, and output validator. |

The canonical manifest binds every other package artifact by Git blob SHA-1 and raw SHA-256. It intentionally does not include its own byte hash, which would create a recursive self-hash; the exact candidate manifest hash is recorded after the candidate is frozen.

## Candidate semantics

The evaluator accepts only the versioned input schema and returns the versioned decision schema. Its effective time is the exact UTC timestamp supplied by the input. It reads neither the clock nor environment state. Missing, unknown, stale, contradictory, unbound, review-required, or structurally unexpected input fails closed.

The synthetic candidate uses the safe overlap of active offer-mode enforcement: `pledge` only, with no payment schedule, donation-offset attachment, or active performance bond. That narrowing is not declared canonical because the live suggestion query permits any equal mode while the invitation RPC is narrower. It reproduces the live query's two directed PostgreSQL `ILIKE` predicates for printable ASCII, including `%`, `_`, and backslash pattern behavior. A malformed trailing escape, non-ASCII value, or unbound collation fails closed because the deployed database locale/collation is not frozen in the repository.

Safety, legality, consent, and restriction truth must arrive as structured normalized state bound to the exact policy-source manifest hash. The harmful-offer gate includes the repository's dedicated noncompensable-blocker contract for match-candidate generation, not only content moderation. Free text, empty `moderation_reason`, account creation, recommendation-learning edges, and recommendation exposures are never eligibility evidence.

An `eligible: true` result is possible only for a fully synthetic normalized pair. It means the fixture passed the candidate software contract. Because the overall source status remains `blocked_source_conflict`, it does not authorize real-data use or execution.

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

The focused workflow also runs relevant existing offer lifecycle, moderation, blocking, restriction, privacy, validity, baseline, participant-eligibility, matcher, and agreement contract tests. Browser, database, TypeScript compilation, and production build checks are not applicable to this package: changed files stay under `docs/`, `scripts/`, and `.github/workflows/`; the evaluator is plain JavaScript and is not imported by the application dependency graph. The workflow enforces that exact scope.

## Conceptual boundary

Ord's distinction between factual compliance and counterfactual effects, MacAskill and Moorhouse's warnings about threats and concentrated power, and Davidson, MacAskill, and Taylor's analysis of moral-public-good free-riding constrain the design. They are conceptual sources only. The papers, fixtures, code tests, and GitHub Actions output are not empirical eligibility, calibration, or causal evidence.

## Next blocker

Before any protected evaluation, the project must resolve every active-source conflict in `eligibility-gap-register.v1.json`, establish one transaction-safe matchability authority across all runtime call sites, freeze exact collation/projection semantics, and obtain explicit privacy, ethics, and consent/waiver determinations. A future authorized aggregate re-inspection would still be separate and would need to show that the graph is no longer too small.
