# Evidence-Credibility Calibration Export v1

## Status

This tranche implements a **private, append-only, de-identified analysis export** for the Evidence Decision → Contextual Credibility calibration study.

It is stacked on the validated blind-audit candidate in PR #621 and the private capture queue in PR #617. It does not authorize or perform:

- public credibility changes;
- ranking, exposure, safeguard, eligibility, or restriction effects;
- milestone cutover;
- production migration or deployment;
- calibration fitting or parameter selection;
- inspection of a held-out set before an analysis plan is frozen;
- causal-additionality estimation;
- payment movement, custody, capture, release, or refund;
- publication of participant-level research data.

The active-effect controls must remain fail-closed throughout export creation and download.

## Purpose

Issue #616 requires calibration to be reproduced from an immutable export and frozen analysis version. Aggregate credibility tables are insufficient: the multiplicative components are not identifiable after aggregation, continuous completion error would be lost, and agreement/reviewer grouping is required for out-of-time evaluation.

The export therefore preserves one row per completed blind-audit observation while removing raw evidence and direct identity fields. It is intended for a separate offline analysis tranche, not for direct use by the product.

## Preregistration boundary

An administrator must supply, before export:

- a human-readable analysis-plan version;
- the SHA-256 digest of the exact frozen plan;
- a UTC source cutoff.

The server derives an idempotency key from the plan hash and cutoff. A repeated request reuses the immutable snapshot. The same key cannot be used with a different plan version, plan hash, or cutoff.

Creating an export is an irreversible research event because it exposes the held-out labels to authorized administrators. The product copy states this explicitly. The export mechanism does not itself verify that the submitted hash corresponds to a publicly timestamped document; that procedural proof remains part of the later analysis-review workflow.

## Eligible observations

An export row is included only when:

- the draw was selected for blind audit;
- an independent terminal label exists;
- the label and original decision were complete by the source cutoff;
- the sampled decision was still the latest valid decision at that cutoff;
- the matching atomic fulfilment or settlement shadow event exists.

Nonselected draws remain in the private sampling tables but are not exported as labelled observations. Inclusion probabilities and selection pathways are retained so random-audit estimates can use inverse-probability or stratified analysis where appropriate.

## Frozen prediction fields

Each observation preserves the pre-audit prediction state needed by issue #616:

- model version;
- target type, dimension, category, and role;
- original numerical status and outcome;
- decision-confidence band;
- provenance and adjudication classes;
- finality and applicable conduct findings;
- provisional provenance, confidence, context, recency, repeated-counterparty, and stake factors;
- the resulting provisional event weight when the original observation was numerical;
- sampling policy, stratum, exact inclusion probability, deterministic random unit, and selection basis;
- source pathway: ordinary terminal review, appeal, administrative correction, or provider reconciliation;
- frozen prediction-snapshot hash;
- decision date at UTC-day granularity.

The repeated-counterparty sequence is reconstructed as of the original shadow event. The recency factor is reconstructed at the original decision time, not at export time. Review-required and excluded observations receive no provisional numerical event weight.

These values remain **provisional shadow features**, not calibrated probabilities or accuracy claims.

## Independent resolution fields

Each row also preserves:

- final independent status and numerical outcome where applicable;
- final finality reason;
- final integrity, responsiveness, and dispute-conduct findings where applicable;
- material-uphold indicator using the preregistered 0.05 completion tolerance;
- continuous absolute error;
- blinding mode and whether the reviewer reported complete blinding;
- independent-label hash;
- audit completion date at UTC-day granularity.

Private reviewer rationales are never included.

## Identity handling

Raw identifiers are used only inside the security-definer export transaction. The stored observation substitutes domain-separated HMAC-SHA-256 grouping tokens for:

- observation;
- agreement;
- agreement/milestone decision chain;
- subject;
- counterparty;
- participant pair;
- original reviewer;
- audit reviewer;
- sampling run.

The 256-bit HMAC key is generated server-side for the export request, is never written to the export tables, and is not returned to the browser. Only its SHA-256 commitment is retained in the manifest. This makes the tokens stable within one export while preventing ordinary database readers from reversing them or linking them across exports.

This is **pseudonymization, not public anonymization**. Dates, categories, roles, strata, and rare combinations can remain identifying in context. The export must stay inside the private calibration workspace and must not be published row-level.

## Excluded data

The observation and manifest contain no:

- raw profile, reviewer, agreement, milestone, decision, assignment, or sampling-run UUID;
- names, emails, affiliations, or public-profile fields;
- raw evidence, attestations, evidence links, or storage paths;
- provider authentication references;
- private capture or review rationales;
- exact payment amounts, currencies, receipt identifiers, or provider names;
- raw stake units;
- causal-additionality claim.

A bounded stake **weight** is included because it is a frozen model feature; the underlying amount is not.

## Immutability and integrity

Every export has:

- an append-only manifest row;
- append-only ordered observation rows;
- SHA-256 for each canonical JSONB observation;
- a digest over the ordered row hashes;
- a manifest hash binding the schema version, plan version and hash, cutoff, pseudonymization-key commitment, row count, rows digest, and privacy flags.

RLS is enabled. Anonymous and ordinary authenticated roles have no direct table privileges. All export creation, registry, manifest, and row RPCs require an active AAL2 Moral Trade administrator through the existing fail-closed calibration-administrator guard.

## Download format

The authenticated download route returns `application/x-ndjson` with private no-store headers.

- Line 1 has `recordType = "manifest"` and includes `manifestCanonical`, the exact PostgreSQL JSONB text whose SHA-256 is `manifestHash`.
- Each subsequent line has `recordType = "observation"`, its row number, row hash, parsed observation, and `observationCanonical`, the exact PostgreSQL JSONB text whose SHA-256 is the row hash.
- The ordered SHA-256 row hashes, joined with `|`, reproduce `rowsDigest`.
- The route pages through the immutable rows, checks the emitted count against the manifest, and never uses a service-role client.

The canonical strings are intentionally retained alongside parsed JSON because ordinary JSON parsing can discard numeric scale and object serialization details. An offline package can therefore verify every row, the ordered dataset digest, and the manifest byte-for-byte without production credentials. Offline consumers must fail closed before analysis if any row, ordered-dataset, manifest, plan-version, or plan-hash check fails. The route performs identity-bound RPC authorization before creating the stream.

## Isolation boundary

Export creation and download do not write to:

- active credibility events or public aggregates;
- shadow decisions or shadow events;
- participant agreements or payouts;
- public or private restrictions;
- effect controls;
- model-version parameters.

Additionality remains `not_evaluated` and outside contextual credibility.

## Acceptance criteria

The exact-head candidate is acceptable only after source and isolated-database gates prove:

1. the exact durable file manifest and stacked base;
2. AAL1, non-admin, anonymous, and direct-table access fail closed;
3. only current completed blind-audit labels enter an export;
4. same plan hash and cutoff replay the same immutable export;
5. changed immutable request fields fail;
6. raw UUIDs and every forbidden evidence, identity, rationale, provider, payment, and stake field are absent from stored observations;
7. grouping tokens are valid domain-separated HMAC outputs;
8. row hashes, rows digest, and manifest hash are reproducible from the downloaded canonical payload strings;
9. append-only triggers reject modification and deletion;
10. download authorization precedes row access and no service role is used;
11. full repository tests, ESLint, TypeScript, and production build pass;
12. SQL fixtures roll back with zero durable residue and active-effect controls remain fail-closed.

## Next tranche

This export enables, but does not implement, the offline analysis required by issue #616: deterministic split construction, calibration metrics, candidate-model comparison, uncertainty intervals, subgroup checks, and a frozen private report. Model fitting and any activation proposal must occur in later, separate reviews and pull requests.
