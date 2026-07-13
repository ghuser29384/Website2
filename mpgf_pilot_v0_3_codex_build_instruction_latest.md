# MPGF Pilot v0.3 Codex Build Instruction

This file is the Phase 0 source artifact for MPGF Pilot v0.3 canonicalization.

Phase 0 must produce `docs/mpgf/codex-build-instruction-final.md`. Once that file exists and passes Phase 0 validation, it is the only valid MPGF implementation instruction artifact.

Codex must implement MPGF as a feature-flagged, audit-first, admin-controlled, exact pilot implementation on `moraltrade.org`.

The implementation must prevent real pooled disbursement until legal, payment, privacy, receipt, retention, launch, final dry-run, conformance, deployment, and emergency-shutdown gates pass.

---

## 0. Canonical non-patch document requirement

Before Phase A begins, Codex must produce one canonical, mechanically normalized, non-patch version of:

```txt
docs/mpgf/codex-build-instruction-final.md
```

The canonical document must directly contain all operative rules. It must not merely reference, append, or defer to patches.

The canonical document must not contain forbidden operative instances of:

```txt
patch labels
“add this” language
“replace this” language
“append this” language
“merge this” language
“latest patch” language
“previous patch” language
“recent changes” language
old sequential-only acceptance criteria
obsolete MPGF v0.2 or MVP operative language
old single-row debit_account / credit_account ledger model
old two-step fallback cap rounding rule
old floating-point risk or fallback-priority formulas
old weaker ballot privacy wording saying only “before ballot close”
old production-enable schema missing privacy/conformance/deployment/emergency statuses
old dry-run order where final dry-run happens before generated RBAC/state-machine coverage
old solver-limit wording treating seed values as exact formal constants
old route, file-path, schema, or formula formatting that violates mechanical normalization
```

Allowed negative-reference contexts are limited to:

```txt
obsolete-term audit lists
canonical merge-diff report
explicit prohibition language
migration notes clearly labeled obsolete
```

No forbidden old language may remain as an operative instruction.

---

## 1. Phase structure

MPGF gates are split into four phases.

```txt
Phase 0: Instruction materialization, normalization, and validation.
Phase A: Pre-implementation planning gates.
Phase B: Implementation gates.
Phase C: Pre-completion / pre-launch gates.
```

Phase order:

```txt
Phase 0 -> Phase A -> Phase B -> Phase C
```

Before Phase 0 passes, Codex may inspect only the Phase 0 source artifact, existing Phase 0/canonicalization files, and repository files strictly necessary to place or run Phase 0 materialization, validation, report, test, and fixture work. Codex may not inspect MPGF feature/repository implementation surfaces, implement schemas, create routes, create UI, create migrations, or implement MPGF features until Phase 0 passes.

Codex may not begin MPGF feature implementation until Phase 0 and Phase A both pass.

### Phase 0 bootstrap exception

During Phase 0, Codex may read the Phase 0 source artifact and may create or update only the canonical output, required Phase 0 reports, Phase 0 materialization validators, document-normalization validators, canonicalization validators, stable-acceptance-ID validators, obsolete-language validators, Phase 0 tests, and Phase 0 fixtures.

Allowed Phase 0 materialization, report, test, and fixture work:

```txt
docs/mpgf/codex-build-instruction-final.md
docs/mpgf/mechanical-normalization-report.md
docs/mpgf/canonical-merge-diff-report.md
docs/mpgf/acceptance-criteria-migration-map.md
tests/fixtures/mpgf/phase0/*
tests for runMpgfPhase0Canonicalization()
tests for validateMpgfInstructionMechanicalNormalization()
tests for validateCanonicalNonPatchDocument()
tests for validateNoForbiddenOldOperativeLanguage()
tests for validateStableAcceptanceCriteriaIds()
```

Forbidden before Phase 0 passes:

```txt
MPGF feature tests
repository implementation tests
schema/migration tests
route/API tests
payment tests
solver tests
UI tests
any test requiring repository feature implementation
```

Phase A may begin only after Phase 0 canonical materialization, required reports, validators, and Phase 0-only tests pass.

---

## 2. Phase 0: canonicalization and mechanical normalization

Phase 0 is a deterministic document-materialization and validation pipeline.

Required files:

```txt
docs/mpgf/codex-build-instruction-final.md
docs/mpgf/mechanical-normalization-report.md
docs/mpgf/canonical-merge-diff-report.md
docs/mpgf/acceptance-criteria-migration-map.md
```

Required functions:

```ts
type Phase0Result = {
  passed: boolean;
  blockers: string[];
  reports: {
    mechanicalNormalizationReportPath: string;
    canonicalMergeDiffReportPath: string;
    acceptanceCriteriaMigrationMapPath: string;
  };
};

runMpgfPhase0Canonicalization(): Phase0Result;

validateMpgfInstructionMechanicalNormalization(
  documentText: string
): MechanicalNormalizationResult;

validateCanonicalNonPatchDocument(
  documentText: string
): CanonicalDocumentValidationResult;

validateNoForbiddenOldOperativeLanguage(
  documentText: string
): ObsoleteLanguageValidationResult;

validateStableAcceptanceCriteriaIds(
  documentText: string
): StableAcceptanceCriteriaValidationResult;
```

Standard validation result envelope:

```ts
type MpgfValidationIssue = {
  code: string;
  message: string;
  locator?: string;
  conformanceRowId?: string;
  acceptanceCriterionId?: string;
};

type MpgfValidationResultBase = {
  passed: boolean;
  generatedAt: string;
  validatorName: string;
  validatorVersion: string;
  errors: MpgfValidationIssue[];
  warnings: MpgfValidationIssue[];
  blockers: string[];
};
```

Unless a section defines a stricter shape, every required `*ValidationResult`, `*CoverageResult`, and `*VerificationResult` used for Phase gates, completion profiles, production-domain verification, or conformance reporting must include or map to the standard validation result envelope.

For the standard validation result envelope, `passed = true` is allowed only when `errors.length = 0` and `blockers.length = 0`. `passed = false` requires at least one error or blocker. Warnings are non-blocking and must never be used as hidden blockers.

The validators must check:

```txt
no patch scaffolding
no operative “add this” language
no operative “replace this” language
no operative “append this” language
no operative “merge this” language
no collapsed route lists
no collapsed file-path lists
no collapsed schema lists
no collapsed service lists
no duplicated rendered/plaintext/LaTeX formulas
no old single-row debit_account / credit_account ledger model
no old floating-point formulas
no old weak ballot-privacy wording
all acceptance criteria use stable IDs
```

The validators must use deterministic string, regex, Markdown, JSON, SQL-like, and TypeScript-signature parsing. They must not depend on LLM judgment.

Required fixtures:

```txt
tests/fixtures/mpgf/phase0/valid-canonical.md
tests/fixtures/mpgf/phase0/contains-patch-scaffolding.md
tests/fixtures/mpgf/phase0/collapsed-routes.md
tests/fixtures/mpgf/phase0/duplicated-math.md
tests/fixtures/mpgf/phase0/old-ledger-model.md
tests/fixtures/mpgf/phase0/weak-ballot-privacy.md
```

Phase 0 passes only if canonical materialization succeeds, all required Phase 0 reports exist, all Phase 0 validators pass, and all Phase 0-only tests pass.

---

## 3. Canonical merge-diff report

During Phase 0, Codex must create:

```txt
docs/mpgf/canonical-merge-diff-report.md
```

The report must include:

```txt
all source patches / replacement instructions consumed
all old sections removed
all replacement sections inserted
all obsolete phrases found
classification of each obsolete phrase as allowed negative-reference or forbidden operative usage
remaining blockers
```

Phase 0 fails if any forbidden operative old language remains.

---

## 4. Mechanical normalization report

During Phase 0, Codex must create:

```txt
docs/mpgf/mechanical-normalization-report.md
```

The report must include:

```txt
normalization_passed: true/false
collapsed_file_paths_found
collapsed_routes_found
collapsed_lists_found
collapsed_schema_blocks_found
collapsed_tables_found
duplicated_or_corrupted_math_found
privacy_wording_conflicts_found
patch_scaffolding_found
forbidden_old_operative_language_found
fixes_applied
remaining_blockers
```

The final instruction must use:

```txt
one file path per line
one route per line
one enum/checklist/fixture/service/field per line
clean SQL-like schema blocks
one TypeScript signature per line
valid formatted JSON blocks
valid Markdown tables
one clean LaTeX representation per formula
stable acceptance-criteria IDs
```

---

## 5. Stable acceptance criteria

The final canonical document must replace all sequential patch-era acceptance criteria with stable IDs.

No acceptance criterion may be identified only by a sequential number such as `160` or `179`.

Allowed stable ID families:

```txt
AC-NORMALIZATION-###
AC-PHASE-###
AC-FORMAL-###
AC-CONFORMANCE-###
AC-SCHEMA-###
AC-REPO-###
AC-GATE-###
AC-BALLOT-###
AC-SOLVER-###
AC-PAYMENT-###
AC-PRIVACY-###
AC-RBAC-###
AC-DEPLOY-###
AC-DISBURSEMENT-###
AC-SECURITY-###
AC-UI-###
AC-LEDGER-###
AC-LEGAL-###
AC-DRYRUN-###
AC-GOVERNANCE-###
AC-STATE-###
AC-COPY-###
AC-COMPLETION-###
```

Required validation function:

```ts
validateStableAcceptanceCriteriaIds(
  document: string
): StableAcceptanceCriteriaValidationResult;
```

It fails if:

```txt
any acceptance criterion lacks stable ID
any stable ID is duplicated
any old sequential patch-era criterion remains as the only identifier
any conformance matrix row references a nonexistent acceptance criterion
any stable ID family is used for the wrong requirement category
```

Codex must create:

```txt
docs/mpgf/acceptance-criteria-migration-map.md
```

Required table:

```md
| Old criterion locator | Old text | Disposition | Stable ID | Reason | Conformance row updated |
|---|---|---|---|---|---|
```

Allowed dispositions:

```txt
mapped_to_stable_id
merged_into_stable_id
superseded_by_stable_id
retired_as_duplicate
retired_as_obsolete
not_applicable_with_justification
```

---

## 6. Source-of-truth files

Create and maintain:

```txt
docs/mpgf/formal-mechanism.raw.md
docs/mpgf/formal-mechanism.md
docs/mpgf/formal-mechanism.version.json
docs/mpgf/formal-kernel-spec.md
config/mpgf/formal-kernel-spec.json
docs/mpgf/formal-conformance-matrix.md
docs/mpgf/formal-source-locator-extraction-report.md
docs/mpgf/formal-source-locator-manual-supplement.md
docs/mpgf/specification-completion-register.md
```

`docs/mpgf/formal-mechanism.raw.md` must contain the complete newest MPGF mechanism description verbatim.

`docs/mpgf/formal-mechanism.md` must contain the same mechanism content with non-substantive embedded stable source IDs where possible.

`source_hash` must be computed from normalized `docs/mpgf/formal-mechanism.raw.md`.

`annotated_source_hash` must be computed from normalized `docs/mpgf/formal-mechanism.md`.

Canonical MPGF hash rule:

```txt
all MPGF document, source, trace, evidence, registry, and row hashes use lowercase hex SHA-256 unless a named external provider requires a different raw provider hash
text hash inputs normalize line endings to LF, remove a UTF-8 BOM if present, and otherwise preserve exact UTF-8 bytes
Markdown hash inputs use the text hash rule after Phase 0 mechanical normalization when the hash is for a normalized artifact
JSON hash inputs use canonical JSON: UTF-8, sorted object keys, no insignificant whitespace, arrays in declared order, exact rational and integer decimal strings preserved as strings, and no floating-point reserialization
SQL-like/schema hash inputs use the text hash rule after mechanical normalization of whitespace specified by Phase 0
record-set hashes must declare the deterministic row ordering, included fields, excluded volatile fields, and per-row hash rule
manual source-locator text hashes use the same text hash rule over the cited excerpt after trimming only locator-boundary whitespace
```

`formal-mechanism.version.json` must include:

```json
{
  "mechanism_version": "mpgf-formal-v0.3",
  "date_adopted": "<ISO date>",
  "source_hash": "<hash of complete verbatim newest MPGF mechanism description>",
  "annotated_source_hash": "<hash of annotated formal-mechanism.md>",
  "source_file": "docs/mpgf/formal-mechanism.raw.md",
  "annotated_source_file": "docs/mpgf/formal-mechanism.md",
  "source_completeness": "verbatim_complete",
  "annotation_policy": "embedded_source_ids_only_no_substantive_change",
  "protocol_version": "mpgf-pilot-v0.3",
  "theta_version": "theta-pilot-v0.3",
  "constitution_version": "<active constitution version>",
  "schema_version": "<active schema version>"
}
```

Required validation function:

```ts
validateFormalMechanismSourceLock(): FormalMechanismSourceLockResult;
```

It must fail if:

```txt
formal-mechanism.raw.md is missing
formal-mechanism.raw.md is a summary or placeholder
formal-mechanism.raw.md contains TODO/TBD/FIXME/placeholder text
formal-mechanism.md is missing
formal-mechanism.md changes substantive mechanism content relative to raw source
formal-mechanism.version.json is missing
source_hash mismatches normalized formal-mechanism.raw.md contents
annotated_source_hash mismatches normalized formal-mechanism.md contents
formal-conformance-matrix.md does not map every source locator
latest conformance report unresolved_count > 0
```

If Codex does not have the newest mechanism text, it must stop and write:

```txt
BLOCKED: docs/mpgf/formal-mechanism.raw.md must be populated with the complete newest MPGF mechanism description verbatim before implementation.
```

---

## 7. Embedded formal source IDs

`docs/mpgf/formal-mechanism.md` must embed stable source IDs wherever possible.

Every formal mechanism item should have a stable source ID if it is one of:

```txt
numbered paragraph
equation
definition
table
governance object
transition rule
eligibility rule
allocation rule
fallback rule
disbursement rule
carryover rule
audit rule
reauthorization rule
ballot rule
constraint
```

Preferred source-ID format:

```txt
[MPGF-SRC-<TYPE>-<NNNN>]
```

Allowed `<TYPE>` values:

```txt
PARA
EQ
DEF
TABLE
GOV
TRANSITION
ELIGIBILITY
ALLOCATION
FALLBACK
DISBURSEMENT
CARRYOVER
AUDIT
REAUTH
BALLOT
CONSTRAINT
```

Examples:

```md
[MPGF-SRC-DEF-0001] Definition: Eligible voter set \(E_t\).
```

```md
[MPGF-SRC-EQ-0001]
\[
W(E_t)=\sum_{i\in E_t}w_{i,t}.
\]
```

Rules:

```txt
source IDs must be unique within formal-mechanism.md
source IDs must not be reused for different formal mechanism items
if wording changes but the formal item remains the same, keep the same source ID
if a formal item is split, keep the original ID for the closest successor and assign new IDs to distinct new items
if items are merged, preserve all source IDs unless ambiguity results
retired or superseded IDs must not be reused
```

---

## 8. Formal source-locator extraction and conformance coverage

Required type:

```ts
type FormalSourceLocator = {
  sourceId?: string;
  provisionalLocatorId?: string;
  locatorId: string;
  type:
    | "numbered_paragraph"
    | "equation"
    | "definition"
    | "table"
    | "rule"
    | "governance_object"
    | "transition_rule"
    | "eligibility_rule"
    | "allocation_rule"
    | "fallback_rule"
    | "disbursement_rule"
    | "carryover_rule"
    | "audit_rule"
    | "reauthorization_rule"
    | "ballot_rule"
    | "constraint";
  headingPath: string[];
  lineStart: number;
  lineEnd: number;
  textHash: string;
  excerpt: string;
  extractionStatus:
    | "extracted_from_embedded_id"
    | "extracted_without_embedded_id"
    | "manual_supplement_required"
    | "ambiguous_overlap"
    | "resolved_duplicate";
};
```

Required functions:

```ts
extractFormalSourceLocators(
  markdown: string
): FormalSourceLocator[];

validateEmbeddedFormalSourceIds(
  locators: FormalSourceLocator[]
): FormalSourceIdValidationResult;

validateManualFormalLocatorSupplement(): ManualLocatorSupplementValidationResult;

validateLocatorConformanceCoverage(): LocatorConformanceCoverageResult;

validateFormalSourceIdCoverage(): FormalSourceIdCoverageResult;
```

The extractor must prioritize embedded `MPGF-SRC` IDs.

For embedded source IDs:

```ts
locatorId = sourceId;
```

For provisional locators:

```ts
locatorId = `${type}:${headingSlug}:${lineStart}-${lineEnd}:${shortHash(text)}`;
```

Extraction rules:

```txt
numbered paragraphs: lines beginning with 1., 1.1, (1), [1], or explicit paragraph IDs
equations: display math blocks \[...\], $$...$$, or fenced math
definitions: headings or bold terms containing “Definition”, “Let”, “Define”
tables: Markdown tables
rules: lines containing must / may not / iff / required / prohibited / allowed
governance objects: named governance terms like Reauthorize, SuperReauthorize, Audit, Measure
transition rules: arrows, status transitions, or “may move from X to Y”
fallback/disbursement/carryover rules: keyword classifiers
```

Manual supplement file:

```txt
docs/mpgf/formal-source-locator-manual-supplement.md
```

Manual supplement table:

```md
| Manual locator ID | Embedded source ID if any | Source heading | Source excerpt | Locator type | Reason extractor missed/ambiguous | Line range if available | Text hash | Conformance row | Reviewer |
|---|---|---|---|---|---|---|---|---|---|
```

Manual locator rules:

```txt
manual supplements may add or clarify locators
manual supplements may not delete deterministic locators
every manual locator must include excerpt, type, reason, text hash, conformance row, and reviewer
unresolved locator overlaps increase unresolved_count
```

Phase A fails if:

```txt
any embedded source ID is duplicated
any embedded source ID is malformed
any embedded source ID lacks a conformance-matrix row
any numbered paragraph is unmapped
any equation is unmapped
any definition is unmapped
any mandatory/prohibitory rule is unmapped
any unresolved locator overlap remains
any manual locator lacks a conformance row
```

---

## 9. Formal conformance matrix

Required columns:

```md
| Source ID / locator | Mechanism source locator | Mechanism item | Type | Implementation mapping | Test coverage | Status | Acceptance criteria | Notes |
|---|---|---|---|---|---|---|---|---|
```

Allowed `Type` values:

```txt
equation
definition
constraint
governance_object
transition_rule
eligibility_rule
allocation_rule
ballot_rule
audit_rule
reauthorization_rule
fallback_rule
disbursement_rule
carryover_rule
UI_requirement
legal_or_operational_requirement
not_applicable
```

Allowed `Status` values:

```txt
exact
instantiated
governance-dependent
not-applicable
unresolved
```

Rules:

```txt
if embedded MPGF-SRC ID exists, use it as primary locator
if no embedded source ID exists, use provisional hash-based locator
every conformance row must reference at least one stable acceptance-criteria ID
every exact formal item must have implementation mapping and test coverage
every governance-dependent formal item must have workflow mapping
every not-applicable item must include justification
latest conformance report must have unresolved_count = 0 before completion
```

Create:

```sql
mpgf_conformance_reports (
  id uuid primary key,
  generated_for_version text not null,
  mechanism_version text not null,
  protocol_version text not null,
  theta_version text not null,
  conformance_json jsonb not null,
  unresolved_count integer not null,
  generated_by uuid,
  generated_at timestamptz not null default now()
);
```

### Contradiction-resolution table

Before Phase A gate evaluation, Codex must create:

```txt
docs/mpgf/contradiction-resolution-table.md
```

Required columns:

```md
| Conflict ID | Source locators | Requirement A | Requirement B | Resolution | Status | Reviewer | Conformance rows | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|
```

Allowed statuses:

```txt
resolved
not_a_conflict
superseded
unresolved
```

Phase A may pass only if the contradiction-resolution table exists and has zero rows with `Status = unresolved`.

### Specification-completion register

Before Phase A gate evaluation, Codex must create:

```txt
docs/mpgf/specification-completion-register.md
```

Required columns:

```md
| Item ID | Source locators | Gap or underspecification | Resolution | Mapping | Status | Reviewer | Conformance rows | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|
```

Allowed statuses:

```txt
specified
mapped
not_applicable_with_justification
unresolved
```

Phase A may pass only if every residual specification-completion item is represented in this register and zero rows have `Status = unresolved`.

---

## 10. Repository capability inventory and adapter contract

Before Phase B, Codex must create:

```txt
docs/mpgf/repository-capability-inventory.md
config/mpgf/repository-capability-inventory.json
docs/mpgf/repository-integration-report.md
docs/mpgf/repository-adaptation-plan.md
docs/mpgf/repo-adaptation-map.md
config/mpgf/repo-adaptation-map.json
docs/mpgf/repo-specific-implementation-map.md
```

The inventory must identify:

```txt
framework
routing
API handlers
server actions, if any
database / ORM / migrations
auth / session
RBAC / admin roles
payments
webhooks / raw body handling
environment config
secrets
logging
tests
lint / typecheck / build
deployment
styling / components
legal / terms / privacy pages
public page structure
```

Machine-readable inventory schema:

```json
{
  "framework": {
    "name": "",
    "version": "",
    "evidencePath": ""
  },
  "routing": {
    "system": "",
    "routeRoot": "",
    "evidencePaths": []
  },
  "apiHandlers": {
    "system": "",
    "handlerRoots": [],
    "evidencePaths": []
  },
  "serverActions": {
    "available": false,
    "convention": "",
    "evidencePaths": []
  },
  "database": {
    "ormOrMigrationSystem": "",
    "schemaPaths": [],
    "migrationPaths": [],
    "canRunMigrations": false,
    "evidencePaths": []
  },
  "auth": {
    "provider": "",
    "sessionMechanism": "",
    "roleSystem": "",
    "evidencePaths": []
  },
  "rbac": {
    "existingAdminRoles": [],
    "permissionSystem": "",
    "evidencePaths": []
  },
  "payments": {
    "existingProvider": "",
    "paymentIntentPath": "",
    "webhookHandlingPath": "",
    "rawBodySupported": false,
    "evidencePaths": []
  },
  "environment": {
    "envConvention": "",
    "secretConvention": "",
    "evidencePaths": []
  },
  "logging": {
    "system": "",
    "evidencePaths": []
  },
  "tests": {
    "framework": "",
    "testCommand": "",
    "fixtureConvention": "",
    "evidencePaths": []
  },
  "qualityCommands": {
    "lintCommand": "",
    "typecheckCommand": "",
    "buildCommand": ""
  },
  "deployment": {
    "target": "",
    "envConvention": "",
    "secretConvention": "",
    "evidencePaths": []
  },
  "styling": {
    "componentSystem": "",
    "styleSystem": "",
    "evidencePaths": []
  },
  "legalPages": {
    "termsPath": "",
    "privacyPath": "",
    "otherPolicyPaths": []
  },
  "publicPageStructure": {
    "routeRoot": "",
    "layoutConvention": "",
    "evidencePaths": []
  },
  "integrationBlockers": []
}
```

For each MPGF subsystem, Codex must choose one adapter path:

```txt
direct_repo_convention
thin_adapter
new_mpgf_module
blocked
```

Subsystems requiring an adapter decision:

```txt
routes
API / server actions
database models
migrations
auth / session
RBAC
payments
webhooks
environment config
tests
public UI components
admin UI components
logging / observability
legal / terms / privacy pages
deployment
```

Required adapter-decision row shape:

```txt
abstract requirement
actual repository implementation
repository capability referenced
adapter path
deviation type
whether formal behavior is preserved
tests proving behavior preservation
conformance matrix row
unresolved risk, if any
phase blocker: true / false
```

Allowed deviation types:

```txt
path_only
framework_adapter
schema_adapter
auth_adapter
payment_adapter
behavior_risk
```

Codex must not introduce a parallel framework, ORM, migration system, auth/session system, payment system, styling system, admin system, or deployment system unless `repository-adaptation-plan.md` explicitly justifies it.

Required functions:

```ts
validateRepositoryCapabilityInventory(): RepositoryCapabilityInventoryValidationResult;

validateRepositoryAdapterDecisions(): RepositoryAdapterDecisionValidationResult;

validateRepoAdaptationMap(
  map: RepoAdaptationMap
): RepoAdaptationValidationResult;
```

Validation fails if:

```txt
repository-capability-inventory.json is missing
repo-adaptation-map.md or repo-adaptation-map.json is missing
required capability is missing and not marked blocked
subsystem lacks adapter decision
blocked subsystem has dependent implementation work
parallel system is introduced without adaptation-plan justification
behavior_risk deviation lacks conformance mapping or unresolved-risk resolution
```

---

### Protocol parameter registry

Create:

```txt
config/mpgf/protocol-parameters.json
config/mpgf/protocol-parameters.schema.json
docs/mpgf/protocol-parameter-registry.md
```

Required protocol snapshot shape:

```ts
type MpgfProtocolSnapshot = {
  protocolVersion: string;
  protocolParameterVersion: string;
  thetaVersion: string;
  stage: "pilot" | "public_beta" | "mature";
  effectiveFrom: string;
  sourceHash: string;
  approvalStatus: "draft" | "approved" | "retired";
  conformanceRows: string[];
  representativeQuorum: {
    minParticipationBps: string;
    coveragePolicy: string;
    diversityPolicy: string;
    capturePolicy: string;
  };
  strongNegative: {
    flagShareThresholdBps: string;
    severityThresholdBps: string;
    reviewRequired: boolean;
  };
  riskExposure: {
    riskType: "hybrid_max_plus_mean";
    rhoMinRational: { num: string; den: string };
    rhoMaxRational: { num: string; den: string };
    etaBps: string;
    tailLossLimitBps?: string;
  };
  fallback: {
    baseEtaFallbackBps: string;
    operationalReliabilityBps: string;
  };
  ballot: {
    backendAbsIntegralLimitRational: { num: string; den: string };
    userAbsIntegralLimitUnits: string;
  };
  terms: {
    termsVersion: string;
    privacyVersion: string;
  };
};
```

Protocol parameter rules:

```txt
every live threshold, cap, quorum value, risk value, fallback weight, ballot normalization limit, stage value, and terms/privacy version must come from the active protocol snapshot or formal mechanism source
values that are defined by formal-mechanism.md must match the mapped formal source locator
values not defined by formal-mechanism.md but required for a live workflow require approved governance judgment and conformance mapping before live use
all basis-point fields must be integer strings in [0, 10000] unless a stricter bound is specified
all rational fields must use exact rational JSON with positive denominator
no live kernel may use hard-coded protocol constants outside the active protocol snapshot or formal mechanism source
non-real-money demo fixtures may use seed protocol parameters only when the fixture cannot create live authorizations, external payouts, or real-money accounting effects
cycle.protocol_parameter_version, cycle.terms_version, and cycle.privacy_version must match the active protocol snapshot used for eligibility, ballot validation, quorum, allocation, fallback, and public summary generation
```

Active protocol snapshot selection rules:

```txt
loadActiveMpgfProtocolSnapshot(cycleId) loads the cycle first and selects by cycle.protocol_parameter_version
it must retrieve exactly one approved protocol snapshot whose protocolParameterVersion matches cycle.protocol_parameter_version
the selected snapshot's protocolVersion, thetaVersion, stage, terms.termsVersion, and terms.privacyVersion must match the cycle fields
active selection must not use latest, current time, effectiveFrom, or environment defaults as a substitute for the cycle-pinned protocol_parameter_version
if zero, multiple, retired, draft, or mismatched snapshots qualify, every dependent live workflow fails closed
new draft cycles may default to the newest approved protocol snapshot only before the cycle is opened, and the selected version must then be written onto the cycle
```

Required functions:

```ts
loadActiveMpgfProtocolSnapshot(
  cycleId
): MpgfProtocolSnapshot;

validateMpgfProtocolParameters(
  snapshot: MpgfProtocolSnapshot
): ProtocolParameterValidationResult;
```

If a required protocol parameter is missing, malformed, unapproved, out of bounds, or unmapped:

```txt
live allocation fails closed
fallback allocation fails closed unless carryover-only fallback remains formally valid
real-money mode cannot be enabled
exact_pilot_complete cannot pass
```

---

## 11. Core MPGF base schemas

If the repository already contains equivalent tables/models, Codex may adapt names and relations to existing repository conventions, but must preserve fields, lifecycle states, auditability, and conformance mappings.

Every referenced MPGF core object must be defined, mapped to an existing repository model, or marked not-applicable with justification.

Schema declaration order rule:

```txt
SQL-like blocks in this instruction are logical schema contracts, not migration-order instructions
repository migrations must create tables and foreign-key constraints in dependency order, or add foreign-key constraints after referenced tables exist
forward references in this document do not authorize broken migrations, omitted relationships, or missing conformance mappings
repo-adaptation-map must document any split table/constraint implementation that differs from these logical blocks
```

```sql
mpgf_epochs (
  id uuid primary key,
  epoch_key text unique not null,
  stage text not null,
  constitution_version text not null,
  metric_protocol_version text not null,
  theta_version text not null,
  status text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

mpgf_cycles (
  id uuid primary key,
  epoch_id uuid references mpgf_epochs(id),
  cycle_key text unique not null,
  stage text not null,
  status text not null,
  budget_cents bigint not null default 0,
  locked_budget_cents bigint,
  currency text not null default 'usd',
  budget_locked_at timestamptz,
  formal_mechanism_version text not null,
  protocol_version text not null,
  protocol_parameter_version text not null,
  theta_version text not null,
  terms_version text not null,
  privacy_version text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz
);

mpgf_contributions (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  budget_effective_cycle_id uuid references mpgf_cycles(id),
  user_id uuid,
  payment_intent_id uuid references mpgf_payment_intents(id),
  amount_cents bigint not null,
  currency text not null default 'usd',
  contribution_mode text not null,
  status text not null,
  received_at timestamptz,
  budget_effective_at timestamptz,
  created_at timestamptz not null default now()
);

mpgf_candidate_alternatives (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  alternative_type text not null,
  fallback_id uuid references mpgf_safe_fallbacks(id),
  title text not null,
  status text not null,
  eligibility_status text not null,
  threat_status text,
  downside_status text,
  strong_negative_status text,
  recipient_accreditation_status text,
  created_at timestamptz not null default now()
);

mpgf_allocation_plans (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  quorum_result_id uuid references mpgf_quorum_results(id),
  eligibility_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  candidate_set_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  formal_correction_trace_id uuid,
  allocation_type text not null,
  status text not null,
  canonical_instance_hash text,
  objective_value_rational_json jsonb,
  solver_certificate_id uuid,
  allocation_json jsonb not null,
  created_at timestamptz not null default now(),
  certified_at timestamptz
);

mpgf_authorizations (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  allocation_plan_id uuid references mpgf_allocation_plans(id),
  alternative_id uuid references mpgf_candidate_alternatives(id),
  recipient_id uuid references mpgf_recipients(id),
  authorized_amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null,
  use_restrictions_json jsonb,
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz
);

mpgf_tranches (
  id uuid primary key,
  authorization_id uuid references mpgf_authorizations(id),
  tranche_index integer not null,
  amount_cents bigint not null,
  currency text not null default 'usd',
  milestone_json jsonb,
  status text not null,
  released_at timestamptz,
  released_by uuid,
  voided_at timestamptz,
  voided_by uuid,
  carried_over_at timestamptz,
  carried_over_by uuid,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_epochs.status` values:

```txt
draft
active
closed
retired
```

Allowed `MpgfStage`, `mpgf_epochs.stage`, and `mpgf_cycles.stage` values:

```txt
pilot
public_beta
mature
```

Direct-working non-real-money demo, pledge-only, and test-mode cycles use `stage = pilot` unless governance lifecycle reauthorization has moved MPGF to a later stage.

Stage transitions require the governance lifecycle reauthorization or super-reauthorization workflow and must update the active protocol parameter version.

Allowed `mpgf_cycles.status` values:

```txt
draft
scheduled
open
emergency_suspended
closed
```

Allowed `mpgf_candidate_alternatives.alternative_type` values:

```txt
ordinary_pool
safe_fallback
carryover
```

Allowed `mpgf_allocation_plans.status` values:

```txt
draft
compiled
solver_running
certified_optimal
certified_infeasible
failed_certification
shadow_only
audit_approved
audit_rejected
```

Certified or audit-approved allocation plans must record quorum_result_id, eligibility_snapshot_id, and candidate_set_snapshot_id. The recorded quorum result must be passing, and the recorded snapshots must match the active eligibility and candidate-set snapshots used for ballot validation, quorum, feasible allocation compilation, strong-negative filtering, risk exposure, and public summaries unless a formal correction rule explicitly authorizes a corrected candidate-set snapshot. If a corrected candidate-set snapshot is used, formal_correction_trace_id is required and the trace must record the original and corrected snapshot IDs, the correction authority, and the affected conformance rows. Missing or inconsistent provenance blocks authorization and leaves the plan non-live.

Allowed `mpgf_authorizations.status` values:

```txt
proposed
approved
paused
voided
carried_over
closed
```

Allowed `mpgf_tranches.status` values:

```txt
draft
ready_for_review
released_internal
payout_authorized
externally_paid
paused
voided
carried_over
```

`mpgf_candidate_alternatives.alternative_type = ordinary_pool` is used for approved ordinary pool alternatives. `safe_fallback` is used only for approved safe-fallback alternatives linked through `fallback_id`. `carryover` is used only for the cycle carryover alternative and must not have a recipient, payout destination, or fallback ID unless the formal mechanism explicitly defines a stricter mapping.

### Direct-working pilot bootstrap

Codex must make MPGF directly usable in a non-real-money mode before any real-money gate is approved.

Create:

```txt
config/mpgf/direct-working-bootstrap.json
config/mpgf/direct-working-bootstrap.schema.json
config/mpgf/direct-working-fixtures.json
config/mpgf/direct-working-fixtures.schema.json
config/mpgf/www-smoke-test-profile.json
config/mpgf/www-smoke-test-profile.schema.json
config/mpgf/production-auth-session-profile.json
config/mpgf/production-auth-session-profile.schema.json
config/mpgf/participant-onboarding-profile.json
config/mpgf/participant-onboarding-profile.schema.json
config/mpgf/public-experience-profile.json
config/mpgf/public-experience-profile.schema.json
config/mpgf/www-production-health-checks.json
config/mpgf/www-production-health-checks.schema.json
config/mpgf/production-deployment-target.json
config/mpgf/production-deployment-target.schema.json
docs/mpgf/direct-working-smoke-test.md
docs/mpgf/www-direct-working-verification.md
docs/mpgf/www-auth-session-verification.md
docs/mpgf/www-exact-pilot-dry-run-verification.md
docs/mpgf/www-participant-journey-verification.md
docs/mpgf/www-public-experience-verification.md
docs/mpgf/www-production-health-monitor.md
docs/mpgf/production-deployment-prerequisites.md
docs/mpgf/production-direct-working-launch-runbook.md
```

```sql
mpgf_genesis (
  id uuid primary key,
  genesis_key text unique not null,
  status text not null,
  feature_mode text not null,
  config_hash text not null,
  seed_manifest_json jsonb not null,
  activated_by uuid,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_genesis.status` values:

```txt
not_started
activated_non_real_money
ready_for_real_money_review
real_money_enabled
emergency_disabled
```

Allowed `mpgf_genesis.feature_mode` values:

```txt
demo
pledge_only
test_mode
real_money
```

Default direct-working bootstrap config:

```json
{
  "featureEnabled": true,
  "realMoneyEnabled": false,
  "publicBaseUrl": "https://www.moraltrade.org",
  "seedMode": "non_real_money_demo",
  "createDemoEpoch": true,
  "createDemoCycle": true,
  "demoCycleKey": "mpgf-pilot-demo",
  "formalMechanismVersion": "mpgf-formal-v0.3",
  "protocolVersion": "mpgf-pilot-v0.3",
  "protocolParameterVersion": "mpgf-protocol-params-pilot-v0.3-demo",
  "thetaVersion": "theta-pilot-v0.3",
  "termsVersion": "mpgf-terms-pilot-v0.3-demo",
  "privacyVersion": "mpgf-privacy-pilot-v0.3-demo",
  "allowPoolProposals": true,
  "allowBallotDrafting": true,
  "allowPledgeMode": true,
  "allowStripeTestMode": true,
  "safeFallbackRegistry": {
    "carryover_only_empty_registry": true
  }
}
```

Required services:

```ts
ensureMpgfPilotBootstrap(): MpgfBootstrapResult;

activateMpgfGenesis(input): MpgfGenesisActivationResult;

runMpgfProductionDirectWorkingLaunch(
  input
): ProductionDirectWorkingLaunchResult;

loadMpgfProductionDeploymentTarget(): ProductionDeploymentTarget;

validateMpgfProductionDeploymentTarget(
  target: ProductionDeploymentTarget
): ProductionDeploymentTargetValidationResult;

validateMpgfProductionDeploymentPrerequisites(
  target: ProductionDeploymentTarget
): ProductionDeploymentPrerequisiteValidationResult;

runMpgfDirectWorkingSmokeTest(
  baseUrl: string
): DirectWorkingSmokeTestResult;

runMpgfWwwDirectWorkingVerification(
  baseUrl: "https://www.moraltrade.org"
): WwwDirectWorkingVerificationResult;

runMpgfWwwAuthSessionVerification(
  baseUrl: "https://www.moraltrade.org"
): WwwAuthSessionVerificationResult;

runMpgfWwwParticipantJourneyVerification(
  baseUrl: "https://www.moraltrade.org"
): WwwParticipantJourneyVerificationResult;

runMpgfWwwPublicExperienceVerification(
  baseUrl: "https://www.moraltrade.org"
): WwwPublicExperienceVerificationResult;

runMpgfWwwExactPilotDryRunVerification(
  baseUrl: "https://www.moraltrade.org"
): WwwExactPilotDryRunVerificationResult;

runMpgfWwwProductionHealthCheck(
  baseUrl: "https://www.moraltrade.org"
): WwwProductionHealthCheckResult;

runMpgfWwwPostLaunchMonitor(
  baseUrl: "https://www.moraltrade.org"
): WwwPostLaunchMonitorResult;

loadMpgfWwwProductionHealthChecks(): WwwProductionHealthCheckProfile;

validateMpgfWwwProductionHealthChecks(
  profile: WwwProductionHealthCheckProfile
): WwwProductionHealthCheckProfileValidationResult;

loadMpgfParticipantOnboardingProfile(): ParticipantOnboardingProfile;

validateMpgfParticipantOnboardingProfile(
  profile: ParticipantOnboardingProfile
): ParticipantOnboardingProfileValidationResult;

loadMpgfProductionAuthSessionProfile(): ProductionAuthSessionProfile;

validateMpgfProductionAuthSessionProfile(
  profile: ProductionAuthSessionProfile
): ProductionAuthSessionProfileValidationResult;

loadMpgfPublicExperienceProfile(): PublicExperienceProfile;

validateMpgfPublicExperienceProfile(
  profile: PublicExperienceProfile
): PublicExperienceProfileValidationResult;

loadMpgfWwwSmokeTestProfile(): WwwSmokeTestProfile;

validateMpgfWwwSmokeTestProfile(
  profile: WwwSmokeTestProfile
): WwwSmokeTestProfileValidationResult;

provisionMpgfWwwSmokeTestIdentity(
  profile: WwwSmokeTestProfile
): WwwSmokeTestIdentityResult;

createMpgfWwwSmokeTestSession(
  profile: WwwSmokeTestProfile
): WwwSmokeTestSessionResult;
```

Required direct-working smoke-test result shape:

```ts
type DirectWorkingSmokeTestResult = {
  passed: boolean;
  baseUrl: string;
  checkedAt: string;
  environment: "local" | "test" | "staging" | "production";
  featureMode: "demo" | "pledge_only" | "test_mode";
  deployedCommitShaOrBuildId?: string;
  checks: {
    routeOrAction: string;
    check: string;
    passed: boolean;
    evidence: string;
  }[];
  blockers: string[];
};
```

Production direct-working launch result shape:

```ts
type ProductionDeploymentTarget = {
  targetVersion: string;
  provider: "vercel" | "other_repository_approved_provider";
  projectIdOrName: string;
  teamOrAccountId?: string;
  canonicalBaseUrl: "https://www.moraltrade.org";
  canonicalHost: "www.moraltrade.org";
  productionEnvironmentName: "production";
  sourceBranchOrRef: string;
  deploymentCommandOrWorkflow: string;
  deploymentStatusCheck: string;
  environmentVariableManagementWorkflow: string;
  secretManagementWorkflow: string;
  requiredEnvironmentVariables: string[];
  requiredSecretsByCapability: {
    capability: string;
    secretNames: string[];
    requiredWhenEnabled: boolean;
  }[];
  migrationCommandOrWorkflow: string;
  productionDatabaseRef: string;
  domainBindingEvidencePath: string;
  rollbackCommandOrWorkflow: string;
  productionAccessValidationMethod: string;
  approverRole: "super_admin" | "deployment_admin";
  evidencePaths: string[];
};

type ProductionDeploymentTargetValidationResult = MpgfValidationResultBase & {
  target: ProductionDeploymentTarget;
  matchedLocalVercelProject?: boolean;
  approvedDivergenceFromLocalProject?: boolean;
};

type ProductionDeploymentPrerequisiteValidationResult =
  MpgfValidationResultBase & {
    target: ProductionDeploymentTarget;
    deploymentProviderReachable: boolean;
    productionProjectResolved: boolean;
    canonicalDomainBound: boolean;
    productionEnvironmentConfigurable: boolean;
    requiredEnvironmentVariablesPresent: boolean;
    requiredSecretsPresentForEnabledCapabilities: boolean;
    productionMigrationsExecutable: boolean;
    rollbackExecutable: boolean;
    canDeployIntendedCommit: boolean;
  };

type ProductionDirectWorkingLaunchResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  deploymentTargetValidationResult: ProductionDeploymentTargetValidationResult;
  deploymentPrerequisiteValidationResult: ProductionDeploymentPrerequisiteValidationResult;
  preLaunchEnvironmentValidationResult: DeploymentValidationResult;
  genesisActivationResult: MpgfGenesisActivationResult;
  bootstrapResult: MpgfBootstrapResult;
  wwwSmokeTestProfileValidationResult: WwwSmokeTestProfileValidationResult;
  smokeTestIdentityResult: WwwSmokeTestIdentityResult;
  productionAuthSessionProfileValidationResult: ProductionAuthSessionProfileValidationResult;
  authSessionVerificationResult: WwwAuthSessionVerificationResult;
  participantOnboardingProfileValidationResult: ParticipantOnboardingProfileValidationResult;
  publicExperienceProfileValidationResult: PublicExperienceProfileValidationResult;
  publicExperienceVerificationResult: WwwPublicExperienceVerificationResult;
  participantJourneyVerificationResult: WwwParticipantJourneyVerificationResult;
  productionHealthCheckResult: WwwProductionHealthCheckResult;
  wwwVerificationResult: WwwDirectWorkingVerificationResult;
  blockers: string[];
};
```

Production www smoke-test profile shape:

```ts
type WwwSmokeTestProfile = {
  profileVersion: string;
  enabled: boolean;
  authMode:
    | "repository_test_session"
    | "preexisting_user_session"
    | "server_side_test_harness";
  smokeUserRef: string;
  demoParticipantRef: string;
  allowedRoutes: string[];
  allowedActions: string[];
  termsVersion: string;
  privacyVersion: string;
  eligibilitySnapshotRef: string;
  candidateSetSnapshotRef: string;
  credentialSource: "server_env" | "deployment_secret" | "repo_test_session";
  credentialRotationPolicy: string;
  auditLogRequired: true;
  rateLimitPolicy: "normal" | "smoke_test_scoped";
};

type WwwSmokeTestIdentityResult = {
  passed: boolean;
  smokeUserRef: string;
  demoParticipantRef: string;
  repositoryAuthMapped: boolean;
  nonRealMoneyOnly: boolean;
  demoEligible: boolean;
  blockers: string[];
};

type WwwSmokeTestSessionResult = {
  passed: boolean;
  smokeUserRef: string;
  authMode: WwwSmokeTestProfile["authMode"];
  sessionEstablished: boolean;
  expiresAt?: string;
  blockers: string[];
};

type ParticipantOnboardingProfile = {
  profileVersion: string;
  enabled: boolean;
  onboardingMode:
    | "public_signup"
    | "private_beta_invite"
    | "preexisting_participant_access";
  publicEntryRoute: string;
  authEntryRoute: string;
  inviteRequestRoute?: string;
  inviteRedemptionRoute?: string;
  accessProvisioningEvidencePath: string;
  intendedParticipantAccessProcess: string;
  supportRouteOrEmail: string;
  returnToMpgfSupported: boolean;
  termsRoute: string;
  privacyRoute: string;
  requiredTermsVersion: string;
  requiredPrivacyVersion: string;
  verificationMode:
    | "demo_self_attestation"
    | "repository_existing_verification"
    | "admin_seeded_demo_verification";
  participantTestAccountPolicy: "fixture_owned" | "preexisting_test_account";
  allowedJourneyActions: string[];
  fixtureKeys: string[];
  auditLogRequired: true;
};

type ProductionAuthSessionProfile = {
  profileVersion: string;
  enabled: boolean;
  baseUrl: "https://www.moraltrade.org";
  authProvider: string;
  loginRoute: string;
  signupRoute: string;
  callbackRoute: string;
  signOutRouteOrAction: string;
  returnToParam: string;
  allowedRedirectOrigins: string[];
  allowedPostAuthRoutes: string[];
  requiredProviderRedirectUrls: string[];
  sessionCookieScope: "host_only" | "www.moraltrade.org" | ".moraltrade.org";
  sessionCookieSameSite: "lax" | "strict" | "none";
  secureCookiesRequired: true;
  csrfProtectionRequired: true;
  emailConfirmationMode: "disabled" | "optional" | "required";
  inviteDeliveryMode: "disabled" | "provider_invite" | "repository_email" | "manual_preexisting_access";
  accountProvisioningMode: "on_signup" | "on_login" | "on_auth_callback" | "mapped_repository_profile";
  supportRouteOrEmail: string;
};

type PublicExperienceProfile = {
  profileVersion: string;
  enabled: boolean;
  baseUrl: "https://www.moraltrade.org";
  publicEntryRoute: "/mpgf";
  requiredRoutes: string[];
  requiredCopyKeys: string[];
  requiredModeLabels: string[];
  primaryActionRoutes: string[];
  supportRouteOrEmail: string;
  requireVisibleDemoOrdinaryPoolAlternative: true;
  allowCarryoverOnlyDemoComplete: false;
  requireMobileAndDesktopChecks: true;
};

type WwwProductionHealthCheckProfile = {
  profileVersion: string;
  enabled: boolean;
  baseUrl: "https://www.moraltrade.org";
  monitorWindow: string;
  sampleIntervalSeconds: number;
  minimumMonitorWindowSeconds: number;
  minimumSampleCount: number;
  maxUnresolvedCriticalIncidents: 0;
  checks: {
    id: string;
    severity: "critical" | "warning";
    implementation:
      | "repository_route"
      | "deployment_provider_monitor"
      | "server_action"
      | "admin_diagnostics_endpoint";
    accessControl: string;
    expected: string;
    timeoutSeconds: number;
    conformanceRowId: string;
  }[];
  rollbackPolicy: {
    emergencyDisablementAllowed: boolean;
    rollbackRequiredOnCriticalIncident: boolean;
    decisionOwnerRole: "super_admin" | "deployment_admin" | "incident_commander";
  };
};

type WwwParticipantJourneyVerificationResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  onboardingMode: ParticipantOnboardingProfile["onboardingMode"];
  publicEntryRoute: string;
  authEntryRoute: string;
  inviteRouteTested?: string;
  accessProvisioningEvidencePath: string;
  supportRouteOrEmail: string;
  participantRef: string;
  checks: {
    routeOrAction: string;
    check: string;
    passed: boolean;
    evidence: string;
  }[];
  blockers: string[];
};

type WwwAuthSessionVerificationResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  profileVersion: string;
  authProvider: string;
  checks: {
    routeOrAction: string;
    check: string;
    passed: boolean;
    evidence: string;
  }[];
  blockers: string[];
};

type WwwPublicExperienceVerificationResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  profileVersion: string;
  routesChecked: string[];
  visibleDemoOrdinaryPoolAlternativeId: string;
  checks: {
    routeOrAction: string;
    check: string;
    passed: boolean;
    evidence: string;
  }[];
  blockers: string[];
};

type WwwDirectWorkingVerificationResult = DirectWorkingSmokeTestResult & {
  baseUrl: "https://www.moraltrade.org";
  environment: "production";
  deployedCommitShaOrBuildId: string;
  authSessionVerificationResult: WwwAuthSessionVerificationResult;
  publicExperienceVerificationResult: WwwPublicExperienceVerificationResult;
  participantJourneyVerificationResult: WwwParticipantJourneyVerificationResult;
  productionHealthCheckResult: WwwProductionHealthCheckResult;
};

type WwwExactPilotDryRunVerificationResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  dryRunCycleId: string;
  exactSolverResult: SolverResult;
  certificateVerificationResult: CertificateVerificationResult;
  productionEquivalentDryRunResult: DryRunResult;
  prohibitedMutationChecks: {
    check: string;
    passed: boolean;
    evidence: string;
  }[];
  blockers: string[];
};

type WwwProductionHealthCheckResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  checkedAt: string;
  checks: {
    id: string;
    check: string;
    severity: "critical" | "warning";
    passed: boolean;
    evidence: string;
  }[];
  blockers: string[];
};

type WwwPostLaunchMonitorResult = {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  monitorWindow: string;
  samples: WwwProductionHealthCheckResult[];
  incidentCount: number;
  criticalIncidentCount: number;
  unresolvedCriticalIncidentCount: number;
  incidents: {
    checkId: string;
    severity: "critical" | "warning";
    firstSeenAt: string;
    lastSeenAt: string;
    sampleCount: number;
    resolved: boolean;
    resolvedAt?: string;
    resolutionSampleCheckedAt?: string;
    resolutionEvidence?: string;
    resolutionApprovalRecordIds?: string[];
    remediationOwner: string;
    evidence: string;
  }[];
  rollbackOrEmergencyDisablementDecision:
    | "not_required"
    | "rollback"
    | "emergency_disablement"
    | "manual_review";
  remediationOwners: string[];
  blockers: string[];
};
```

Required direct-working smoke-test checks:

```txt
/mpgf renders
/mpgf/about renders
/mpgf/pools renders
/mpgf/contribute renders
/mpgf/admin/genesis denies unauthenticated users
/mpgf/admin/genesis is reachable for authorized admins
create pledge-only pledge record without payment-provider object
draft pool proposal in proposal_open fixture
submit pool proposal in proposal_open fixture
draft ballot in ballot_open_with_locked_budget fixture
submit ballot in ballot_open_with_locked_budget fixture
run dry-run happy path
generate public summary
verify real-money mode disabled
verify automated payouts disabled
verify live payment-provider secrets are not required
```

`config/mpgf/www-smoke-test-profile.json` must define how production-domain smoke tests authenticate without creating public real users or real-money eligible voters. Required profile fields:

```txt
profileVersion
enabled
authMode
smokeUserRef
demoParticipantRef
allowedRoutes
allowedActions
termsVersion
privacyVersion
eligibilitySnapshotRef
candidateSetSnapshotRef
credentialSource
credentialRotationPolicy
auditLogRequired
rateLimitPolicy
```

Allowed `authMode` values:

```txt
repository_test_session
preexisting_user_session
server_side_test_harness
```

Production smoke-test identity rules:

```txt
the smoke-test identity must be fixture-owned or pre-existing and explicitly marked non-real-money
the smoke-test identity must map to the repository's actual auth/session system
the smoke-test identity must have demo-only terms acceptance, privacy acceptance, participant verification, eligible-voter snapshot membership, and ballot eligibility for the demo cycle
the smoke-test identity must not be represented as a public real user created by the production verification run
the smoke-test identity must not satisfy real-money eligibility, exact_pilot_complete, real_money_complete, recipient payout, or admin approval gates
smoke-test credentials and verifier tokens are server-only, scoped to MPGF production verification, expiring or rotated, redacted from logs and generated docs, and never exposed in client bundles
the smoke-test session may bypass only interactive login friction; it must not bypass public route handlers, server-side validation, idempotency, rate limits except a documented smoke-test-specific limit, state-machine validation, ballot validation, or audit logging
every smoke-test mutation must be labeled fixture-owned and idempotent
```

`validateMpgfWwwSmokeTestProfile()` must fail if `allowedRoutes` or `allowedActions` include real-money contribution creation, live ledger mutation, production enablement, admin approval, recipient accreditation/compliance mutation, payout-destination mutation, authorization approval, payout authorization, external payout, or any non-fixture mutation. Admin routes may appear only for unauthenticated-denial checks unless the repo-adaptation map defines a separate approved admin verification identity and action scope.

`config/mpgf/production-auth-session-profile.json` must define the production auth/session configuration that ordinary MPGF participants and production-domain verifiers use on `https://www.moraltrade.org`.

Required production auth/session profile fields:

```txt
profileVersion
enabled
baseUrl
authProvider
loginRoute
signupRoute
callbackRoute
signOutRouteOrAction
returnToParam
allowedRedirectOrigins
allowedPostAuthRoutes
requiredProviderRedirectUrls
sessionCookieScope
sessionCookieSameSite
secureCookiesRequired
csrfProtectionRequired
emailConfirmationMode
inviteDeliveryMode
accountProvisioningMode
supportRouteOrEmail
```

`validateMpgfProductionAuthSessionProfile()` must fail unless:

```txt
baseUrl = https://www.moraltrade.org
allowedRedirectOrigins includes https://www.moraltrade.org and excludes preview, localhost, and non-HTTPS origins for production-domain demo_complete
requiredProviderRedirectUrls includes the canonical production auth callback route
loginRoute, signupRoute, and callbackRoute are public or mapped repository auth routes on the canonical host
signOutRouteOrAction is a mapped repository auth route or server action that browser-level verification can exercise
returnToParam is a single named parameter and is validated with a safe internal-path allowlist
allowedPostAuthRoutes include /mpgf and every authenticated MPGF public action route used by participant journey verification
sessionCookieScope is host_only for www.moraltrade.org, www.moraltrade.org, or an approved parent-domain cookie scope documented in the repo-adaptation map
secureCookiesRequired = true
csrfProtectionRequired = true
sessionCookieSameSite is compatible with the selected auth provider and callback flow
emailConfirmationMode and inviteDeliveryMode match the participant onboarding profile
email or invite delivery is configured when the selected onboarding mode requires email or provider invites
accountProvisioningMode creates or maps required user/profile/participant rows before the participant can perform MPGF actions
supportRouteOrEmail matches the participant onboarding profile and public experience profile
```

`runMpgfWwwAuthSessionVerification("https://www.moraltrade.org")` must use browser-level verification or an equivalent rendered-form end-to-end client and must fail unless:

```txt
unauthenticated MPGF actions redirect to login, signup, invite, or access gate with a safe internal return-to-MPGF path
login preserves the attempted MPGF return path and lands back on the intended MPGF route
signup or invite redemption preserves the attempted MPGF return path when the selected onboarding mode allows signup or invite redemption
the production auth callback route accepts only the configured provider callback shape and rejects unsafe external next/redirect values
the provider redirect allowlist includes the canonical production callback and does not rely on preview or localhost callbacks for production-domain demo_complete
session cookies are set for the canonical production host with secure production settings
the authenticated session persists across refreshes and navigation among /mpgf, /mpgf/contribute, /mpgf/pools, /mpgf/account/contributions, and the visible ballot route where applicable
required account, profile, participant, terms-acceptance, and demo-eligibility rows are created or mapped before MPGF participant actions run
sign-out revokes the browser session and subsequent authenticated MPGF actions require authentication again
production smoke-test session establishment cannot grant admin permissions, real-money eligibility, production enablement, recipient payout capability, or real payment-provider access
```

`config/mpgf/participant-onboarding-profile.json` must define how an ordinary non-real-money participant can enter MPGF on `https://www.moraltrade.org`. Production-domain `demo_complete` cannot be satisfied by the smoke-test identity alone.

Required participant onboarding profile fields:

```txt
profileVersion
enabled
onboardingMode
publicEntryRoute
authEntryRoute
inviteRequestRoute when onboardingMode = private_beta_invite and inviteRedemptionRoute is absent
inviteRedemptionRoute when onboardingMode = private_beta_invite and inviteRequestRoute is absent
accessProvisioningEvidencePath
intendedParticipantAccessProcess
supportRouteOrEmail
returnToMpgfSupported
termsRoute
privacyRoute
requiredTermsVersion
requiredPrivacyVersion
verificationMode
participantTestAccountPolicy
allowedJourneyActions
fixtureKeys
auditLogRequired
```

Allowed `onboardingMode` values:

```txt
public_signup
private_beta_invite
preexisting_participant_access
```

`validateMpgfParticipantOnboardingProfile()` must fail unless the profile exposes a participant entry path that intended non-real-money pilot participants can use through normal production routes. `public_signup` requires a public signup or sign-in route with return-to-MPGF behavior. `private_beta_invite` requires an invite-request route, invite-redemption route, or both, plus `accessProvisioningEvidencePath` describing how intended participants receive invites without developer-only database writes. `preexisting_participant_access` requires `accessProvisioningEvidencePath` describing the non-developer provisioning or eligibility process for intended pilot participants. Every onboarding mode requires `supportRouteOrEmail`, terms and privacy routes, and browser-verifiable return-to-MPGF behavior.

Production-domain `demo_complete` may use `preexisting_participant_access` only if `docs/mpgf/production-direct-working-launch-runbook.md` names the invitation or account-provisioning process that gives real intended pilot participants access without developer intervention. A profile that permits only hidden fixture users, admin-created smoke users, or direct database seeding cannot satisfy production-domain `demo_complete`.

`admin_seeded_demo_verification` may satisfy only the participant-verification status after the participant enters through `public_signup`, `private_beta_invite`, or documented `preexisting_participant_access`. It must not be the account-access path, must not create hidden fixture-only users, and cannot by itself satisfy production-domain `demo_complete`.

`runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org")` must use browser-level verification or an equivalent rendered-form end-to-end client and must fail unless the ordinary participant path below works on the deployed production build:

Production-domain browser-level verification means a JavaScript-capable browser session or rendered-form end-to-end client that loads the deployed `https://www.moraltrade.org` route, exercises the repository auth/session and CSRF mechanisms, interacts through rendered links, forms, and buttons rather than direct database writes or privileged service calls, observes client console errors and network failures, verifies hydrated or server-rendered DOM state, and records route/action evidence. HTTP-only probes may supplement but cannot satisfy browser-level verification unless the route is documented as server-rendered with no required client JavaScript and the rendered-form client still exercises the public route handler and form/action contract.

```txt
unauthenticated visitor reaches /mpgf from the public entrypoint or approved private-beta entrypoint
unauthenticated visitor attempting an MPGF action reaches the repository auth entrypoint or invite gate with return-to-MPGF behavior
participant onboarding profile validates
participant can authenticate or redeem an invite through the repository auth/session system
participant sees and accepts the active MPGF terms and privacy versions through the UI or mapped repository terms flow
terms acceptance persists as mpgf_terms_acceptances or a mapped equivalent with the active cycle terms_version and privacy_version
participant receives non-real-money demo verification or mapped repository verification according to the onboarding profile
participant appears in the demo eligibility snapshot or sees a clear not-yet-eligible state with the next required step
participant can create a pledge-only pledge from /mpgf/contribute without payment-provider objects
participant can create a monthly pledge-only recurring commitment from /mpgf/contribute without payment-provider objects
participant can view the pledge on /mpgf/account/contributions
participant can view, pause, resume, or cancel the monthly pledge-only recurring commitment from /mpgf/account/contributions
participant can submit a pool proposal in the proposal_open fixture when pool proposals are enabled
participant can save and submit a ballot in the ballot_open_with_locked_budget fixture when demo ballot eligibility is granted
participant can sign out and sign back in without losing visible contribution, proposal, or ballot state
participant journey uses normal public route handlers, server-side validation, idempotency, state-machine validation, ballot validation, and audit logging
participant journey does not grant admin permissions, create real-money eligibility, create real payment-provider objects, mutate live real-money records, or count fixture/test accounts in public real-user participation metrics
```

If MPGF is intentionally private beta, the public MPGF entrypoint must clearly expose the invite/request-access state and the production launch runbook must define how intended pilot participants receive access. Private-beta mode may satisfy production-domain `demo_complete` only if `runMpgfWwwParticipantJourneyVerification()` passes through the invite or preexisting participant path.

`config/mpgf/public-experience-profile.json` must define the minimum visitor-facing production MPGF experience. A route that technically renders but does not explain MPGF, does not make the current non-real-money mode clear, or does not provide an actionable next step cannot satisfy production-domain `demo_complete`.

Required public experience profile fields:

```txt
profileVersion
enabled
baseUrl
publicEntryRoute
requiredRoutes
requiredCopyKeys
requiredModeLabels
primaryActionRoutes
supportRouteOrEmail
requireVisibleDemoOrdinaryPoolAlternative
allowCarryoverOnlyDemoComplete
requireMobileAndDesktopChecks
```

Minimum required production public-experience copy keys:

```txt
mpgf_plain_language_summary
moral_public_goods_explanation
moral_trade_coordination_explanation
pilot_status
non_real_money_status
pledge_only_explanation
monthly_pledge_only_explanation
pool_proposal_explanation
ballot_demo_explanation
visible_demo_pool_explanation
not_tax_advice
tax_deductibility_disabled_by_default
not_escrow
not_charity_evaluator
not_guaranteed_effectiveness
privacy_visibility
ballot_finality
allocation_not_disbursement
support_or_access
```

`validateMpgfPublicExperienceProfile()` must fail unless:

```txt
baseUrl = https://www.moraltrade.org
publicEntryRoute = /mpgf
requiredRoutes include /mpgf, /mpgf/about, /mpgf/contribute, /mpgf/pools, /mpgf/account/contributions, and /mpgf/technical-spec
requiredCopyKeys include every minimum required production public-experience copy key
requiredModeLabels include non-real-money, pledge-only, test-mode if enabled, and real-money disabled
primaryActionRoutes include /mpgf/contribute and either /mpgf/pools/new or the approved private-beta pool-proposal gate
supportRouteOrEmail matches the participant onboarding profile
requireVisibleDemoOrdinaryPoolAlternative = true
allowCarryoverOnlyDemoComplete = false
requireMobileAndDesktopChecks = true
```

`runMpgfWwwPublicExperienceVerification("https://www.moraltrade.org")` must use browser-level verification or an equivalent rendered-form end-to-end client and must fail unless:

```txt
/mpgf explains in plain language that MPGF is a pilot mechanism for coordinating funding of moral public goods
/mpgf and /mpgf/about explain that the production demo is non-real-money unless real_money_complete later passes
/mpgf/contribute makes one-time pledge-only and monthly pledge-only actions understandable and actionable
/mpgf/pools shows at least one approved demo ordinary-pool alternative with non-real-money labeling
/mpgf/pools/new or the approved private-beta gate explains how intended participants can propose a pool
/mpgf/ballot or the visible ballot gate explains when and how ballot drafting/submission works
/mpgf/account/contributions or its auth gate explains how participants can view, pause, resume, and cancel pledge-only recurring commitments
/mpgf/technical-spec renders or links the public technical specification
required legal, tax, privacy, allocation/disbursement, and non-real-money copy keys render on the routes where the copy placement matrix requires them
primary calls to action do not point to disabled, admin-only, missing, or real-money-only routes
mobile and desktop browser checks show no overlapping critical controls, unreadable mode labels, or hidden primary actions
```

A carryover-only fallback state may satisfy route-readiness and setup/unavailable rendering, but it cannot satisfy production-domain `demo_complete`, `runMpgfProductionDirectWorkingLaunch()`, or `runMpgfWwwDirectWorkingVerification()` for the production-domain evaluation. Production-domain `demo_complete` requires at least one visible approved demo ordinary-pool alternative with no real-money accounting, authorization, payout, or public real-user metric effects.

`config/mpgf/production-deployment-target.json` must identify the actual production deployment target for `https://www.moraltrade.org`. It is not enough for the runbook to say "deploy to production" without a provider/project/account, environment, migration, domain-binding, rollback, and access-validation mapping.

`validateMpgfProductionDeploymentTarget()` must fail unless the target:

```txt
uses canonicalBaseUrl = https://www.moraltrade.org
uses canonicalHost = www.moraltrade.org
names the deployment provider
names the production project or project ID
names the team, account, or owner when the provider has one
names the production environment
names the source branch, tag, or commit-ref policy
names the repository-approved deployment command or provider workflow
names the deployment status check
names the environment-variable management workflow
names every required environment variable for production direct-working and enabled MPGF capabilities
names the secret management workflow
names every required secret by enabled capability without including secret values
names the production migration command or migration workflow
names the production database reference
names the domain-binding evidence path
names the rollback command or rollback workflow
names the production access validation method
names the deployment approver role
names every required evidence path
```

For this repository, if `.vercel/project.json` exists, `config/mpgf/production-deployment-target.json` must either match its Vercel project ID, org/team ID, and project name or record an explicit approved divergence in `docs/mpgf/production-deployment-prerequisites.md`. The locally discovered Vercel project identifiers are not secrets; deployment tokens, environment values, and service-role keys are secrets and must never be copied into generated docs.

`validateMpgfProductionDeploymentPrerequisites()` must fail before production-domain `demo_complete` unless the actual production deployment target can be used to deploy or verify the intended commit at `https://www.moraltrade.org`, configure required non-real-money environment variables, provide required secrets for enabled MPGF capabilities, run main-app and enabled MPGF migrations against the production database, prove the canonical domain is bound to the target, and execute the documented rollback or emergency-disablement workflow. If any of these are unavailable, production-domain `demo_complete`, `exact_pilot_complete`, and `real_money_complete` remain blocked.

`config/mpgf/www-production-health-checks.json` must conform to `WwwProductionHealthCheckProfile` and define production health checks for the public MPGF deployment. Health checks may use a repository route, deployment-provider monitor, server action, or admin-only diagnostics endpoint, but the repo-adaptation map must identify the implementation and access controls.

`validateMpgfWwwProductionHealthChecks()` must fail unless the profile is enabled for production-domain evaluation, `monitorWindow` parses as a positive ISO 8601 duration, `sampleIntervalSeconds > 0`, `minimumMonitorWindowSeconds > 0`, `minimumSampleCount >= 3`, the parsed monitor window is at least `minimumMonitorWindowSeconds`, the monitor window and sample interval imply at least `minimumSampleCount` samples, every check has a declared severity, implementation, access control, expected result, positive `timeoutSeconds`, and conformance row, `maxUnresolvedCriticalIncidents = 0`, and rollback policy is defined.

Each `WwwProductionHealthCheckResult.checks[]` row must include the health-check profile `id` and `severity` so post-launch monitoring can compute incident, critical-incident, and unresolved-critical-incident counts from concrete samples rather than free-text check labels.

`runMpgfWwwProductionHealthCheck("https://www.moraltrade.org")` must fail unless all checks below pass on the deployed production build:

```txt
canonical URL and HTTPS check passes
deployed commit SHA or build ID is reported
database connectivity for enabled MPGF read paths works
main-app and enabled MPGF migrations are applied
FEATURE_MPGF_ENABLED is true
MPGF_REAL_MONEY_ENABLED is false until real_money_complete passes
current non-real-money cycle resolution succeeds or approved private-beta/setup state is returned
public MPGF read routes return non-5xx responses
public summary read path returns published, unavailable, or setup state without server error
auth/session health for MPGF participant routes is available
rate-limit configuration loads
idempotency store is reachable for enabled mutation routes
no MPGF server secret appears in the health response, public routes, logs, or client bundle evidence
active emergency shutdown state is surfaced if present
```

Each health-check sample row fails with timeout evidence if the check does not return an expected result within its configured `timeoutSeconds`.

`runMpgfWwwPostLaunchMonitor("https://www.moraltrade.org")` must run after production-domain launch for the window specified in `config/mpgf/www-production-health-checks.json`. It must record repeated health-check samples, incidents, remediation owners, and whether rollback or emergency-disablement was required.

Post-launch monitor sampling rule:

```txt
monitorStartAt is recorded in UTC before the first sample starts
the first sample starts immediately after monitorStartAt
subsequent samples start no more than sampleIntervalSeconds after the prior sample completes
monitorEndAt must be at least monitorStartAt + parsed monitorWindow duration
passing monitor evidence requires samples.length >= minimumSampleCount
passing monitor evidence requires at least one sample whose checkedAt is at or after monitorEndAt
failed or timed-out samples count as failed sample rows for incident computation
```

`WwwPostLaunchMonitorResult.incidents[]` must be derived from failed health-check sample rows by `checkId` and severity, must preserve first-seen and last-seen timestamps, and must mark an incident unresolved unless a later passing sample or approved remediation evidence resolves the same check.

For production-domain `real_money_complete`, a critical incident may be marked resolved only if a later sample for the same `checkId` on the same `deployedCommitShaOrBuildId` passes after `firstSeenAt`. Approved remediation evidence may be attached to the incident but cannot by itself resolve a critical incident for `real_money_complete`. If no later passing sample exists, the incident remains unresolved and counts toward `unresolvedCriticalIncidentCount`.

For `real_money_complete`, the post-launch monitor must run after production-domain non-real-money direct-working launch and before `MPGF_REAL_MONEY_ENABLED=true`. A monitor that begins only after real-money enablement cannot justify enabling real-money mode, though separate ongoing real-money operational monitoring may continue after enablement.

Production-domain `demo_complete` may pass only if the first `runMpgfWwwProductionHealthCheck()` passes. Production-domain `real_money_complete` may pass only if the post-launch monitor has no unresolved critical production-domain MPGF incident for the configured observation window.

`runMpgfWwwDirectWorkingVerification()` is the production-domain direct-working verification. It must run against `https://www.moraltrade.org` after deployment whenever the evaluated environment is production or `MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org`. It must return `WwwDirectWorkingVerificationResult`, including the base direct-working smoke-test fields plus production commit/build evidence, participant journey verification evidence, and production health-check evidence, and must fail unless every check below passes on the canonical host:

```txt
valid HTTPS certificate is served for www.moraltrade.org
no mixed-content browser error occurs on MPGF public routes
https://www.moraltrade.org redirects or serves only as canonical www host
MPGF_PUBLIC_BASE_URL equals https://www.moraltrade.org
MPGF_CANONICAL_HOST equals www.moraltrade.org
FEATURE_MPGF_ENABLED is true
MPGF_REAL_MONEY_ENABLED is false
deployed commit SHA or build ID is reported and matches the verification evidence
/mpgf renders a usable non-real-money MPGF entry point
/mpgf/about renders public informational copy
/mpgf/pools renders the public pool list with at least one approved demo ordinary-pool alternative for production-domain demo_complete
/mpgf/contribute renders pledge-only or test-mode contribution options
/mpgf/technical-spec renders or links the public technical-spec route
homepage, primary public navigation, or footer links to /mpgf unless repo-adaptation-map documents an approved private-beta entrypoint
current non-real-money cycle or approved direct-working demo cycle is visible
public cycle summary for the visible non-real-money cycle renders or can be generated
config/mpgf/www-smoke-test-profile.json exists and validates
config/mpgf/production-auth-session-profile.json exists and validates
runMpgfWwwAuthSessionVerification("https://www.moraltrade.org") passes
config/mpgf/participant-onboarding-profile.json exists and validates
config/mpgf/public-experience-profile.json exists and validates
runMpgfWwwPublicExperienceVerification("https://www.moraltrade.org") passes
production smoke-test identity can establish an authenticated session through the repository auth/session adapter
ordinary non-real-money participant journey passes through runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org")
pledge-only pledge creation succeeds without creating payment-provider objects
monthly pledge-only recurring commitment creation succeeds without creating payment-provider objects
pool proposal draft and submit checks pass through an authenticated smoke-test user or isolated demo participant
ballot draft and submit checks pass through an authenticated smoke-test user or isolated demo participant
admin routes deny unauthenticated users
real-money contribution creation is unavailable
automated payout creation is unavailable
live payment-provider secrets are not required
browser-level verification or an equivalent end-to-end rendered-form client detects no MPGF route 5xx, hydration failure, uncaught client runtime error, broken form action, CSRF/session failure, or failed client bundle load
no smoke-test action creates a public real user account, real-money eligible voter, live ledger entry, live authorization, live payout authorization, external payout, or published real-money summary
```

Production deployed-build identity rule:

```txt
deployedCommitShaOrBuildId must be a nonempty immutable production deployment identifier
preferred evidence is deployment-provider build metadata, CI build metadata, or a repository build manifest emitted during deployment
a self-reported application route may be used only if it is generated from the same build artifact and matches deployment-provider or CI evidence
if the repository cannot expose a commit SHA, the deployment-provider immutable deployment ID plus the build artifact hash may satisfy deployedCommitShaOrBuildId
all production-domain evidence artifacts for the same completion profile must reference the same deployedCommitShaOrBuildId
if the deployed identity cannot be established independently of mutable application state, production-domain demo_complete, exact_pilot_complete, and real_money_complete remain blocked
```

`docs/mpgf/www-direct-working-verification.md` must record:

```txt
canonical URL tested
deployment environment
deployed commit SHA or build ID
production deployment provider/project identifier
production deployment target config hash
production deployment prerequisite validation result
database migration status for the main app and enabled MPGF capabilities
pre-launch deployment environment validation result from validateMpgfDeploymentEnvironment("pre_launch")
runMpgfWwwDirectWorkingVerification() result
runMpgfWwwAuthSessionVerification() result
runMpgfWwwPublicExperienceVerification() result
runMpgfWwwParticipantJourneyVerification() result
runMpgfWwwProductionHealthCheck() result
blockers and remediation owner for every failed check
timestamp and verifier
```

A local run, unit test, staging deployment, preview deployment, or screenshot cannot satisfy production-domain direct-working verification. If Codex cannot deploy or verify the production build at `https://www.moraltrade.org`, production-domain `demo_complete`, `exact_pilot_complete`, and `real_money_complete` remain blocked even if all local or preview checks pass.

`docs/mpgf/www-participant-journey-verification.md` must record:

```txt
canonical URL tested
deployment environment
deployed commit SHA or build ID
participant onboarding profile version
onboarding mode
public entry route
auth entrypoint or invite flow tested
invite request or redemption route when applicable
access provisioning evidence path
support route or email
terms version accepted
privacy version accepted
participant reference
pledge evidence
monthly recurring-commitment evidence
pool proposal evidence or gated-state evidence
ballot evidence or gated-state evidence
account-state persistence evidence
blocked or failed steps
timestamp and verifier
```

`docs/mpgf/www-auth-session-verification.md` must record:

```txt
canonical URL tested
deployment environment
deployed commit SHA or build ID
production auth/session profile version
auth provider
login route
signup route
callback route
sign-out route or action
return-to parameter
provider redirect allowlist evidence
session cookie evidence
CSRF/session protection evidence
account/profile/participant provisioning evidence
unsafe redirect rejection evidence
blocked or failed checks
timestamp and verifier
```

`docs/mpgf/www-public-experience-verification.md` must record:

```txt
canonical URL tested
deployment environment
deployed commit SHA or build ID
public experience profile version
routes checked
copy keys observed
mode labels observed
visible demo ordinary-pool alternative ID
primary action routes checked
support route or email checked
mobile viewport result
desktop viewport result
blocked or failed checks
timestamp and verifier
```

`docs/mpgf/www-production-health-monitor.md` must record:

```txt
canonical URL monitored
deployment environment
deployed commit SHA or build ID
health-check profile version
first health-check result
post-launch monitor window
configured minimum monitor window seconds
configured minimum sample count
health-check sample count
incident count
critical incident count
unresolved critical incident count
incident records with check ID, severity, first-seen timestamp, last-seen timestamp, sample count, resolution status, resolution timestamp, resolution sample timestamp, resolution evidence, resolution approval record IDs if any, remediation owner, and evidence
rollback or emergency-disablement decision
remediation owner for each failed sample
timestamp and verifier
```

`docs/mpgf/www-exact-pilot-dry-run-verification.md` must record production-domain exact-pilot dry-run evidence. `runMpgfWwwExactPilotDryRunVerification("https://www.moraltrade.org")` must run after `runMpgfProductionDirectWorkingLaunch()` and must fail unless every check below passes through the deployed production build or a repository-approved server-side production verification action tied to the deployed production build:

```txt
deployed commit SHA or build ID matches docs/mpgf/www-direct-working-verification.md
MPGF_REAL_MONEY_ENABLED is false
dry_run fixture exists and validates
active solver support profile validates and is benchmark-supported or stricter
canonical optimization instance compiles from the dry_run fixture
exact solver returns verified optimal certificate within active support limits
independent certificate verifier passes
final production-equivalent dry-run passes
fallback path is available and deterministic but not used for the verified-optimal happy path
generated public summary draft validates after visibility filtering but is not published as a live real-money summary
no live ledger, live eligibility snapshot, live authorization, live payout authorization, external payout, or real-money public summary is created or mutated
```

Production-domain `exact_pilot_complete` and `real_money_complete` remain blocked unless `runMpgfWwwExactPilotDryRunVerification("https://www.moraltrade.org")` passes with evidence tied to the deployed production commit SHA or build ID.

`docs/mpgf/production-direct-working-launch-runbook.md` must define the exact repository command, admin action, or deployment-provider workflow for making MPGF directly working at `https://www.moraltrade.org` in non-real-money mode. The runbook must include:

```txt
preconditions
config/mpgf/production-deployment-target.json path and hash
production deployment provider, project ID or name, and team/account ID
required environment variables
required secrets by enabled capability, with values redacted
required production deployment target
deployment access validation step
canonical domain binding verification step
required migration command or deployment-provider migration step
required super_admin approval or MPGF_ADMIN_BOOTSTRAP_SECRET step
non-real-money genesis activation step
direct-working fixture seed or repair step
production smoke-test identity provisioning step
production auth/session profile configuration step
runMpgfWwwAuthSessionVerification("https://www.moraltrade.org") step
participant onboarding profile configuration step
public experience profile configuration step
ordinary participant access, signup, invite, or preexisting-account provisioning step
public summary generation/publication step for the visible non-real-money cycle where publication is safe
runMpgfWwwPublicExperienceVerification("https://www.moraltrade.org") step
runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org") step
runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org") step
runMpgfWwwProductionHealthCheck("https://www.moraltrade.org") step
post-launch monitor schedule
rollback or disablement step
expected evidence paths
known blockers
```

`runMpgfProductionDirectWorkingLaunch()` must execute or verify the runbook steps using repository-approved deployment, migration, auth, and seed mechanisms. It must be idempotent and may repair only fixture-owned or non-real-money demo records. It must fail closed unless it can prove:

```txt
production deployment target validates
production deployment prerequisites validate
the deployed build is the intended production commit SHA or build ID
canonical domain binding points to the intended production deployment target
main-app and enabled MPGF migrations are applied
non-real-money genesis is activated
real_money mode is disabled
direct-working bootstrap config validates
direct-working fixtures validate
www smoke-test profile validates
production smoke-test identity is provisioned and non-real-money-only
production auth/session profile validates
runMpgfWwwAuthSessionVerification("https://www.moraltrade.org") passes
participant onboarding profile validates
public experience profile validates
runMpgfWwwPublicExperienceVerification("https://www.moraltrade.org") passes
ordinary participant journey passes or private-beta invite/preexisting participant path passes
visible non-real-money cycle with at least one approved demo ordinary-pool alternative exists
public MPGF entrypoint is discoverable from the homepage, primary navigation, footer, or an approved private-beta entrypoint
runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org") passes
runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org") passes
runMpgfWwwProductionHealthCheck("https://www.moraltrade.org") passes
```

If `runMpgfProductionDirectWorkingLaunch()` cannot run because production credentials, deployment permissions, production database access, domain binding, or rollback access are unavailable, it must write the blocker to `docs/mpgf/production-deployment-prerequisites.md`, `docs/mpgf/www-direct-working-verification.md`, `docs/mpgf/production-direct-working-launch-runbook.md`, and the completion evidence; production-domain `demo_complete`, `exact_pilot_complete`, and `real_money_complete` remain blocked.

Direct-working smoke tests must use deterministic fixture cycles per workflow stage unless the repository maps them to an equivalent isolated test fixture system:

```txt
proposal_open fixture
ballot_open_with_locked_budget fixture
dry_run fixture
```

The direct-working smoke test must not require one live cycle to have mutually incompatible proposal, budget-lock, ballot, allocation, and publication windows open at once.

Direct-working fixture registry requirements:

```txt
config/mpgf/direct-working-fixtures.json defines fixture keys for proposal_open, ballot_open_with_locked_budget, and dry_run
every fixture declares featureMode, realMoneyEnabled, cycleKey, calendarWindow, protocolParameterVersion, termsVersion, privacyVersion, demoParticipantRef, seedAlternatives, seedEligibilitySnapshot, and expectedAllowedActions
fixture cycles must be isolated from real-money cycles and must use non-real-money demo, pledge-only, or test-mode records only
fixture calendars must be deterministic relative to a fixed fixture clock, not the wall clock, unless the smoke-test harness explicitly injects now
fixture setup must be idempotent and may repair only fixture-owned records
fixture teardown or reset must not delete or mutate real-money records, production cycles, live ledgers, live eligibility snapshots, live ballots, live authorizations, or live public summaries
```

Required direct-working fixture services:

```ts
loadMpgfDirectWorkingFixtures(): DirectWorkingFixtureRegistry;

validateMpgfDirectWorkingFixtures(
  registry: DirectWorkingFixtureRegistry
): DirectWorkingFixtureValidationResult;

ensureMpgfDirectWorkingFixture(
  fixtureKey: string
): DirectWorkingFixtureResult;
```

`runMpgfDirectWorkingSmokeTest()` must call `validateMpgfDirectWorkingFixtures()` before fixture setup and must fail if any required fixture is missing, non-isolated, wall-clock-dependent without injected `now`, or capable of mutating live records.

Direct-working bootstrap must create or map a non-real-money demo participant for local/test smoke tests, or use the authenticated smoke-test user. That participant must have demo-only eligibility, terms-acceptance, and voter-snapshot evidence sufficient to exercise ballot drafting and submission in the demo cycle. Production must not automatically create a public real user account or real-money eligible voter through this demo participant path.

Direct-working bootstrap schema must require formalMechanismVersion, protocolVersion, protocolParameterVersion, thetaVersion, termsVersion, and privacyVersion whenever createDemoCycle is true. Demo protocol, terms, and privacy versions may satisfy only non-real-money demo, pledge-only, test-mode, and direct-working smoke-test workflows. They must not satisfy real-money eligibility, exact_pilot_complete, or real_money_complete unless separately approved as production values through the protocol, legal, privacy, and conformance gates.

Direct-working baseline:

```txt
FEATURE_MPGF_ENABLED = true
MPGF_REAL_MONEY_ENABLED = false
/mpgf renders without server error
/mpgf/about renders without server error
/mpgf/pools renders without server error
/mpgf/contribute renders pledge-only or test-mode contribution options
current non-real-money cycle exists or admin genesis setup route is available
pool proposal draft and submit flow works in non-real-money mode
ballot draft and submit flow works against the current non-real-money cycle
dry-run happy path can complete without real payment intents
public summary can be generated for the demo/current cycle
all real-money, automated payout, and external disbursement actions remain disabled
```

Production public demo baseline for `https://www.moraltrade.org` after approved non-real-money genesis activation:

```txt
/mpgf must show a usable non-real-money MPGF experience, not only setup or unavailable copy
/mpgf must explain in plain language that MPGF coordinates funding for moral public goods
/mpgf must clearly label the current production demo as non-real-money and pledge-only/test-only where applicable
homepage, primary public navigation, footer, or an approved private-beta entrypoint must make /mpgf discoverable
ordinary intended pilot participants must have a public signup, private-beta invite, or documented preexisting-account path into MPGF
ordinary participant onboarding must include active MPGF terms and privacy acceptance
the visible non-real-money cycle is seeded or mapped as seedMode = non_real_money_demo, pledge_only, or test_mode
the visible cycle is explicitly labeled non-real-money wherever contributions, ballots, budgets, allocations, or summaries are displayed
at least one approved demo ordinary-pool alternative is visible
carryover-only fallback states may keep public routes non-error but cannot satisfy production-domain demo_complete
pledge-only contribution creation is actionable from the public contribution route
monthly pledge-only recurring commitment creation is actionable from the public contribution route
public experience verification passes on mobile and desktop viewports
pool proposal and ballot smoke tests use the validated www smoke-test profile, authenticated smoke-test users, or isolated demo participants, not anonymous public real-user creation
fixture-owned demo records may be idempotently created or repaired only when MPGF_DIRECT_WORKING_BOOTSTRAP_ENABLED = true
fixture-owned demo records must remain isolated from real-money cycles, live ledgers, live eligibility snapshots, live ballots, live authorizations, live payout authorizations, external payouts, and live public summaries
runMpgfProductionDirectWorkingLaunch() must pass before production-domain demo_complete can pass
runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org") must pass before production-domain demo_complete can pass
demo_complete cannot pass for the production-domain evaluation until runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org") passes
```

Production bootstrap rule:

```txt
production may create non-real-money config, schemas, and routes automatically
production must not activate real_money mode automatically
production genesis activation requires super_admin approval or a one-time MPGF_ADMIN_BOOTSTRAP_SECRET flow
missing production genesis must show a usable non-real-money setup or unavailable state, not a server error
missing production genesis cannot satisfy demo_complete for the production-domain evaluation
```

`MPGF_ADMIN_BOOTSTRAP_SECRET` constraints:

```txt
server-only
single-use
expires after first successful use or configured TTL
hashed at rest if persisted
writes admin audit log and operational event on use
may activate only non-real-money genesis or create the first super_admin bootstrap invitation
must not enable real_money mode
must not create payment-provider secrets
must not create automated payout-provider approval
```

---

## 12. Double-entry ledger model

Ledger must use transaction headers plus entry lines.

```sql
mpgf_ledger_transactions (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  transaction_type text not null,
  related_type text,
  related_id uuid,
  idempotency_key text unique,
  source_event_id text,
  status text not null,
  transaction_hash text not null,
  created_at timestamptz not null default now()
);

mpgf_ledger_entries (
  id uuid primary key,
  transaction_id uuid references mpgf_ledger_transactions(id),
  account text not null,
  direction text not null,
  amount_cents bigint not null,
  currency text not null default 'usd',
  entry_hash text not null,
  created_at timestamptz not null default now()
);
```

Ledger invariants:

```txt
for every financial ledger transaction, sum(debit entries) = sum(credit entries)
every amount_cents is positive
every account is in the approved MPGF chart of accounts
currency must match related object unless the approved future formal FX policy applies
historical transactions and entries are append-only
corrections use reversing/correcting transactions
B_t is derived only from eligible ledger transactions, not directly from payment-provider state
locked_budget_cents is never mutated except through audit-governed correction transaction
```

Pilot v0.3 currency policy:

```txt
default and only enabled currency is usd
payment intent, contribution, refund, authorization, tranche, payout authorization, external payment evidence, and ledger currencies must match
if any related money object uses a different currency, the dependent workflow fails closed
foreign exchange is disabled unless a future formal FX policy, accounting review, legal review, ledger template update, and conformance mapping are approved
```

Allowed `mpgf_ledger_transactions.status` values:

```txt
posted
```

`mpgf_ledger_transactions` rows are created only for posted accounting records. Draft ledger attempts, validation failures, and posting failures must be represented as idempotency records, deterministic traces, or operational events, not as MPGF ledger transactions. Reversals and corrections create new posted ledger transactions and do not mutate the original ledger transaction status.

Minimum MPGF chart of accounts:

```txt
cash_pending
cash_received
contribution_revenue_or_restricted_funds
cycle_budget_available
cycle_budget_locked
carryover
authorized_not_released
released_internal
payout_authorized
externally_paid
refunds_payable
refunds_issued
chargebacks_disputed
chargebacks_lost
voided_undisbursed
fees_expense
ledger_correction
```

Ledger transaction types:

```txt
payment_intent_created
payment_succeeded
contribution_recorded
budget_locked
late_contribution_assigned_next_cycle
refund_requested
refund_succeeded
chargeback_received
chargeback_won
chargeback_lost
allocation_authorized
tranche_released_internal
payout_authorized
external_payment_recorded
void_undisbursed
carryover_created
ledger_correction
```

Non-financial informational records must be stored as operational events in `mpgf_operational_events`, not as ledger accounts or ledger transaction types.

Required services:

```ts
createMpgfLedgerTransactionFromTemplate(input): LedgerTransaction;

validateMpgfLedgerTransaction(
  transactionId: string
): LedgerValidationResult;

validateMpgfLedgerBalance(
  cycleId: string
): LedgerBalanceValidationResult;

deriveCycleBudgetFromLedger(
  cycleId: string
): DerivedCycleBudget;

createMpgfLedgerCorrection(input): LedgerCorrectionResult;
```

### Ledger terminology rule

Use “ledger transaction” for persisted accounting records stored in:

```txt
mpgf_ledger_transactions
mpgf_ledger_entries
```

Use “operational event” only for records stored in:

```txt
mpgf_operational_events
```

Do not use “ledger event” as operative terminology.

Allowed uses of “ledger event”:

```txt
obsolete-term audit lists
explicit negative-reference language
migration notes clearly labeled obsolete
```

Required replacements:

```txt
“payment succeeded but ledger event missing” -> “payment succeeded but ledger transaction missing”
“ledger event” in acceptance criteria -> “ledger transaction”
“ledger events” in workflow descriptions -> “ledger transactions”
```

---

## 13. Complete ledger template registry

Create:

```txt
config/mpgf/ledger-transaction-templates.json
```

It must define a valid balanced template for every declared `transaction_type`.

Every template must specify:

```txt
transaction_type
required_related_type
affects_derived_B_t
allowed_before_budget_lock
allowed_after_budget_lock
real_money_eligible
debit entries
credit entries
amount source
required idempotency key source
required audit log
required approval or review status where applicable
```

Every financial template must satisfy:

```txt
sum(debits) = sum(credits)
every account is in approved MPGF chart of accounts
every amount source is deterministic
no negative amount allowed
corrections use reversing/correcting templates, not mutation
```

Before `MPGF_REAL_MONEY_ENABLED=true`, every real-money-eligible template must have:

```txt
accounting_review_status = approved
legal_review_status = approved
```

If a transaction type lacks a valid template:

```txt
transaction cannot be created
dependent workflow fails closed
real-money mode cannot use that transaction type
```

Required functions:

```ts
validateLedgerTemplateRegistry(): LedgerTemplateRegistryValidationResult;

validateLedgerTemplateForTransactionType(
  transactionType: string
): LedgerTemplateValidationResult;
```

All ledger templates shown in this instruction are illustrative seed templates, not production accounting advice.

Production real-money ledger templates must be reviewed and approved through accounting/legal review before:

```txt
MPGF_REAL_MONEY_ENABLED=true
```

If multiple transaction types apply to the same funds, their templates must avoid double-counting cash, budget, contribution, authorization, release, payout, refund, chargeback, void, or carryover amounts.

Use this safer illustrative pattern for the payment/contribution examples:

```json
{
  "payment_succeeded": {
    "transaction_type": "payment_succeeded",
    "required_related_type": "payment_intent",
    "affects_derived_B_t": false,
    "allowed_before_budget_lock": true,
    "allowed_after_budget_lock": true,
    "real_money_eligible": true,
    "entries": [
      {
        "direction": "debit",
        "account": "cash_received",
        "amount_source": "amount_cents"
      },
      {
        "direction": "credit",
        "account": "cash_pending",
        "amount_source": "amount_cents"
      }
    ],
    "required_idempotency_key_source": "stripe_event_id",
    "required_audit_log": true,
    "required_reviews": {
      "accounting_review_status": "approved",
      "legal_review_status": "approved"
    }
  },
  "contribution_recorded": {
    "transaction_type": "contribution_recorded",
    "required_related_type": "contribution",
    "affects_derived_B_t": true,
    "allowed_before_budget_lock": true,
    "allowed_after_budget_lock": false,
    "real_money_eligible": true,
    "entries": [
      {
        "direction": "debit",
        "account": "cash_pending",
        "amount_source": "amount_cents"
      },
      {
        "direction": "credit",
        "account": "contribution_revenue_or_restricted_funds",
        "amount_source": "amount_cents"
      }
    ],
    "required_idempotency_key_source": "contribution_id",
    "required_audit_log": true,
    "required_reviews": {
      "accounting_review_status": "approved",
      "legal_review_status": "approved"
    }
  }
}
```

---

## 14. Payment intents, contributions, refunds, and budget timing

Feature flags:

```ts
FEATURE_MPGF_ENABLED;
MPGF_REAL_MONEY_ENABLED;
```

Default:

```ts
MPGF_REAL_MONEY_ENABLED = false;
```

Allowed contribution modes:

```txt
pledge_only
test_payment
real_money
```

`pledge_only` records non-binding or governance-defined pledge intent and must not create a real payment-provider object.

`test_payment` may use payment-provider test mode only and must never settle real funds.

`real_money` may be available only when `MPGF_REAL_MONEY_ENABLED=true` and production enablement gates pass.

`mpgf_contributions` records settled test or real payment contributions. Pledge-only records live in `mpgf_pledges` and must not create `mpgf_contributions`, MPGF ledger transactions, or live \(B_t\) effects unless converted to a test or real payment intent under the relevant mode.

Pledge-only amounts may appear in public or account UI only as pledged or non-real-money amounts, never as locked budget, received cash, authorized funds, or externally paid funds.

Money amount invariant:

```txt
payment intent amounts must be positive integer cents
contribution amounts must be positive integer cents
pledge amounts must be positive integer cents
recurring contribution commitment amounts must be positive integer cents
refund amounts must be positive integer cents and cannot exceed the refundable outstanding amount
authorization amounts must be positive integer cents unless the formal mechanism explicitly allows a zero-amount administrative record
tranche amounts must be positive integer cents
payout authorization amounts must be positive integer cents
external payment evidence amounts must be positive integer cents
zero budget is allowed only for cycle budget/carryover states and no-money demo fixtures, not for payment, pledge, recurring contribution commitment, refund, authorization, tranche, payout, or external-payment records
```

Create:

```txt
config/mpgf/refund-policy.json
config/mpgf/refund-policy.schema.json
docs/mpgf/refund-policy.md
```

Refund policy requirements:

```txt
refund policy is versioned
refund policy is mode-specific for pledge_only, test_payment, and real_money
pledge_only cancellation uses cancelMpgfPledge(), not mpgf_refunds
test_payment refunds may use payment-provider test mode only
real_money refunds require payment/legal approval before provider submission
refund eligibility is computed deterministically before approval
refund eligibility result is stored in evidence_json or a deterministic trace
refund amount cannot exceed contribution amount minus prior succeeded or submitted refunds, chargebacks, and externally unrecoverable amounts
refunds are blocked after funds have been externally paid unless an approved recovery/void policy applies
```

Create:

```sql
mpgf_payment_intents (
  id uuid primary key,
  intended_cycle_id uuid references mpgf_cycles(id),
  budget_effective_cycle_id uuid references mpgf_cycles(id),
  user_id uuid,
  stripe_payment_intent_id text,
  amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null,
  mode text not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

mpgf_payment_webhook_events (
  id uuid primary key,
  stripe_event_id text unique not null,
  event_type text not null,
  raw_body_hash text not null,
  payload_json jsonb not null,
  signature_verified boolean not null default false,
  signature_verified_at timestamptz,
  processed boolean default false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

mpgf_refunds (
  id uuid primary key,
  contribution_id uuid references mpgf_contributions(id),
  payment_intent_id uuid references mpgf_payment_intents(id),
  amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null,
  reason text,
  provider_refund_id text,
  requested_by uuid,
  requested_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  provider_submitted_at timestamptz,
  processed_at timestamptz,
  evidence_json jsonb,
  created_at timestamptz not null default now()
);

mpgf_pledges (
  id uuid primary key,
  intended_cycle_id uuid references mpgf_cycles(id),
  budget_effective_cycle_id uuid references mpgf_cycles(id),
  recurring_commitment_id uuid,
  user_id uuid,
  amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null,
  pledge_mode text not null,
  converted_payment_intent_id uuid references mpgf_payment_intents(id),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  expires_at timestamptz
);

mpgf_recurring_contribution_commitments (
  id uuid primary key,
  user_id uuid not null,
  amount_cents bigint not null,
  currency text not null default 'usd',
  cadence text not null,
  mode text not null,
  status text not null,
  start_cycle_id uuid references mpgf_cycles(id),
  next_cycle_id uuid references mpgf_cycles(id),
  next_scheduled_at timestamptz,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  paused_at timestamptz,
  cancelled_at timestamptz
);
```

Allowed `mpgf_refunds.status` values:

```txt
requested
approved
submitted_to_provider
succeeded
failed
cancelled
```

Allowed `mpgf_pledges.status` values:

```txt
pledged
cancelled
converted_to_payment_intent
expired
```

Allowed `mpgf_recurring_contribution_commitments.cadence` values:

```txt
monthly
```

Allowed `mpgf_recurring_contribution_commitments.mode` values:

```txt
pledge_only
test_payment
real_money
```

Allowed `mpgf_recurring_contribution_commitments.status` values:

```txt
active
paused
cancelled
expired
provider_action_required
provider_failed
```

Allowed `mpgf_payment_intents.status` values:

```txt
created
requires_action
processing
succeeded
failed
cancelled
```

Allowed `mpgf_contributions.status` values:

```txt
pending
recorded
late_assigned_next_cycle
refunded
chargeback_disputed
chargeback_lost
voided
```

High-level contribution flow modes:

```txt
pledge_only
test_payment
real_money
```

Object-specific mode fields:

```txt
mpgf_payment_intents.mode: test_payment, real_money
mpgf_contributions.contribution_mode: test_payment, real_money
mpgf_pledges.pledge_mode: pledge_only
mpgf_recurring_contribution_commitments.mode: pledge_only, test_payment, real_money
```

`pledge_only` is represented by `mpgf_pledges`, not by `mpgf_payment_intents` or `mpgf_contributions`. `convertMpgfPledgeToPaymentIntent()` creates a new `test_payment` or `real_money` payment intent under the relevant enabled mode, preserves `intended_cycle_id` and `budget_effective_cycle_id`, links it through `converted_payment_intent_id`, and leaves the pledge row's `pledge_mode = pledge_only`.

Recurring contribution commitments represent the participant's standing monthly MPGF contribution instruction. In direct-working mode, recurring commitments use `mode = pledge_only`, create no payment-provider object, and may materialize one pledge-only pledge per eligible cycle for display, reminders, and non-real-money public-summary pledge totals. They do not create `mpgf_contributions`, MPGF ledger transactions, or live \(B_t\) effects unless later converted under an approved `test_payment` or `real_money` flow.

Required services:

```ts
createMpgfPaymentIntent(
  input: {
    userId: string;
    cycleId: string;
    amountCents: bigint;
    mode: "test_payment" | "real_money";
  }
): MpgfPaymentIntent;

handleMpgfStripeWebhook(event): MpgfWebhookResult;

recordMpgfContributionFromPaymentIntent(
  paymentIntentId
): MpgfContribution;

computeMpgfRefundEligibility(
  contributionId,
  amountCents
): RefundEligibilityResult;

refundMpgfContribution(contributionId): RefundResult;

createMpgfPledge(input): MpgfPledge;

cancelMpgfPledge(pledgeId): MpgfPledge;

createMpgfRecurringContributionCommitment(input): MpgfRecurringContributionCommitment;

pauseMpgfRecurringContributionCommitment(
  commitmentId
): MpgfRecurringContributionCommitment;

resumeMpgfRecurringContributionCommitment(
  commitmentId
): MpgfRecurringContributionCommitment;

cancelMpgfRecurringContributionCommitment(
  commitmentId
): MpgfRecurringContributionCommitment;

materializeMpgfRecurringPledgeForCycle(
  input: {
    commitmentId: string;
    cycleId: string;
  }
): MpgfPledge;

convertMpgfPledgeToPaymentIntent(
  input: {
    pledgeId: string;
    targetMode: "test_payment" | "real_money";
  }
): MpgfPaymentIntent;

shutdownMpgfRealMoneyMode(reason): ShutdownResult;
```

`createMpgfPaymentIntent()` must reject `pledge_only`. `mode = real_money` requires `MPGF_REAL_MONEY_ENABLED=true` and production enablement gates; `mode = test_payment` requires test-payment mode to be enabled and must use only payment-provider test mode.

`convertMpgfPledgeToPaymentIntent()` must reject missing, disabled, or unapproved `targetMode`.

`createMpgfRecurringContributionCommitment()` must reject `mode = real_money` unless `MPGF_REAL_MONEY_ENABLED=true`, production enablement gates pass, a real-money recurring payment provider path is approved, and receipt/legal/payment/privacy/retention gates cover recurring billing. It must reject `mode = test_payment` unless test-payment mode and provider test-mode recurring support are configured. It must allow `mode = pledge_only` in direct-working mode without payment-provider secrets.

`materializeMpgfRecurringPledgeForCycle()` must be idempotent for `(commitmentId, cycleId)`, must create only `mpgf_pledges` with `pledge_mode = pledge_only` while the commitment is `mode = pledge_only`, and must not materialize pledges for cancelled, expired, or paused commitments.

When `MPGF_REAL_MONEY_ENABLED=false`, `/mpgf/contribute` must still work through `pledge_only` mode, `test_payment` mode if Stripe test keys are configured, or both.

`pledge_only` mode must not require `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `STRIPE_PUBLISHABLE_KEY`.

Direct-working `/mpgf/contribute` must support both one-time pledge-only pledges and monthly pledge-only recurring commitments. The UI must label monthly pledge-only commitments as non-real-money recurring pledges, not subscriptions, charges, donations, or payments.

`test_payment` mode may create test-mode payment intents and test-mode contributions, but all UI, ledger, summaries, and receipts must label them as test/non-real-money and exclude them from real-money accounting.

At payment-intent creation, assign:

```txt
intended_cycle_id
budget_effective_cycle_id
```

If payment succeeds before `budget_locked_at` for `budget_effective_cycle_id`:

```txt
record contribution for that cycle
include it in B_t
```

If payment succeeds after `budget_locked_at` for the originally assigned `budget_effective_cycle_id`:

```txt
record payment_succeeded ledger transaction
set or confirm budget_effective_cycle_id as the next open cycle under late_contribution_policy
record late_contribution_assigned_next_cycle for that next open cycle
do not create contribution_recorded for the locked cycle
do not mutate locked B_t
```

Late payment success must not mutate locked \(B_t\).

`contribution_recorded` may affect derived \(B_t\) only before the applicable `budget_effective_cycle_id` budget lock. Late successful payments use `late_contribution_assigned_next_cycle` for budget assignment after a cycle is locked.

Webhook invariants:

```txt
webhooks are idempotent
duplicate Stripe event IDs do not duplicate contributions
failed payments do not enter MPGF ledger transactions
refunded payments create reversing ledger transactions
chargebacks create dispute ledger transactions
webhook signature verification uses raw request body and endpoint secret
signature failure rejects event and creates critical operational event
raw_body_hash is recorded before payload processing
processed=true requires signature_verified=true
payload_json and raw payment-provider payloads are private, encrypted when encryption is required, and excluded from public summaries and generated docs
```

---

## 15. Cycle calendar and budget lock

Create:

```sql
mpgf_cycle_calendars (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  timezone text not null default 'America/Los_Angeles',
  contribution_opens_at timestamptz not null,
  contribution_closes_at timestamptz not null,
  pool_proposal_opens_at timestamptz not null,
  pool_proposal_closes_at timestamptz not null,
  sae_review_opens_at timestamptz not null,
  sae_review_closes_at timestamptz not null,
  risk_review_opens_at timestamptz not null,
  risk_review_closes_at timestamptz not null,
  budget_locked_at timestamptz not null,
  ballot_opens_at timestamptz not null,
  ballot_closes_at timestamptz not null,
  quorum_computation_at timestamptz not null,
  allocation_computation_at timestamptz not null,
  allocation_audit_opens_at timestamptz not null,
  allocation_audit_closes_at timestamptz not null,
  publication_at timestamptz not null,
  cycle_close_at timestamptz not null,
  late_contribution_policy text not null default 'assign_to_next_cycle',
  created_at timestamptz not null default now()
);
```

Rules:

```txt
contribution_closes_at <= budget_locked_at
budget_locked_at <= ballot_opens_at
candidate alternatives finalized before ballot_opens_at
ballots cannot open before B_t is locked
allocation cannot compute before ballot_closes_at
quorum computes before allocation
allocation audit occurs before publication
cycle cannot close before ledger validation
late contributions default to next open cycle
late contributions must not change B_t after budget lock
```

Required cycle services:

```ts
getCurrentMpgfCycle(
  now: Date
): MpgfCycleResolution;

ensureDirectWorkingMpgfCycle(): MpgfCycle;
```

Current-cycle resolution:

```txt
prefer the open cycle whose calendar contains now and whose status permits public participation
if multiple cycles match, choose the earliest contribution_opens_at and then lexicographic cycle_key
if no open cycle matches, return the next scheduled cycle if one exists
if no open or scheduled cycle exists and direct-working bootstrap is enabled, create or repair the demo cycle
if no cycle can be resolved, public routes show a non-error setup/unavailable state and admin routes show the blocker
```

---

## 16. Participant eligibility and voter sets

Create:

```sql
mpgf_eligibility_snapshots (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  snapshot_version integer not null,
  status text not null,
  terms_version text not null,
  privacy_version text not null,
  verification_rule_version text not null,
  anti_sybil_rule_version text not null,
  snapshot_hash text not null,
  supersedes_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  created_by uuid,
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  unique(cycle_id, snapshot_version)
);

mpgf_participant_verifications (
  id uuid primary key,
  user_id uuid not null,
  verification_status text not null,
  verification_method text,
  verification_rule_version text not null,
  verified_at timestamptz,
  expires_at timestamptz,
  evidence_json jsonb,
  created_at timestamptz not null default now()
);

mpgf_cycle_eligible_voters (
  id uuid primary key,
  eligibility_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  cycle_id uuid references mpgf_cycles(id),
  user_id uuid not null,
  verification_rule_version text not null,
  anti_sybil_rule_version text not null,
  governance_weight_units bigint not null,
  eligibility_status text not null,
  reason text,
  snapshot_hash text not null,
  created_at timestamptz not null default now()
);

mpgf_cycle_valid_voters (
  id uuid primary key,
  eligibility_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  cycle_id uuid references mpgf_cycles(id),
  user_id uuid not null,
  ballot_id uuid references mpgf_ballots(id),
  governance_weight_units bigint not null,
  validity_status text not null,
  reason text,
  created_at timestamptz not null default now()
);

mpgf_terms_acceptances (
  id uuid primary key,
  user_id uuid not null,
  terms_version text not null,
  privacy_version text not null,
  acceptance_context text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence_json jsonb
);

mpgf_sybil_reviews (
  id uuid primary key,
  user_id uuid not null,
  cycle_id uuid references mpgf_cycles(id),
  suspected_duplicate_user_ids_json jsonb,
  status text not null,
  decision text,
  evidence_json jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_eligibility_snapshots.status` values:

```txt
draft
approved
superseded
voided
```

Allowed `mpgf_sybil_reviews.status` values:

```txt
open
cleared
confirmed_duplicate
inconclusive
voided
```

Rules:

```txt
E_t is snapshotted before ballot opening
I_t is derived deterministically from E_t and valid submitted ballots
E_t and governance weights are immutable once ballot window opens
contribution amount must not increase governance weight in Pilot v0.3
corrections require audit-logged correction snapshot
```

Eligibility snapshot uniqueness and correction rules:

```txt
exactly one approved eligibility snapshot may be active for a cycle when ballot_opens_at arrives
the active eligibility snapshot is the approved, non-superseded, non-voided snapshot with the greatest snapshot_version for the cycle whose approved_at is not null and approved_at <= ballot_opens_at
the active eligibility snapshot's terms_version and privacy_version must match the cycle's terms_version and privacy_version
active eligibility snapshot selection must not use latest created_at, wall-clock time after ballot_opens_at, or an unapproved correction snapshot
if no snapshot qualifies, or if multiple snapshots qualify because of repository mapping ambiguity, ballots cannot open and quorum/allocation fail closed
every eligible-voter row must reference the active eligibility_snapshot_id
within one eligibility snapshot, there may be at most one eligible-voter row per user_id
snapshot_hash covers the ordered eligible-voter rows, governance weights, verification rule version, anti-sybil rule version, terms version, privacy version, and cycle_id
after ballot_opens_at, the active eligibility snapshot is immutable
eligibility corrections create a new snapshot_version that supersedes the prior snapshot only if the formal correction rule permits it
valid-voter rows must reference the eligibility snapshot from which they were derived
within one cycle, at most one valid-voter row may count for a user_id
duplicate eligible-voter or valid-voter rows fail quorum computation closed
```

A participant may be in \(E_t\) only if:

```txt
account is active
participant passes current verification rule
participant is not suspended from MPGF governance
participant has accepted current MPGF terms
participant has no open or confirmed_duplicate sybil review for the cycle
if the latest applicable sybil review is inconclusive, the participant is excluded unless the active anti_sybil_rule_version explicitly permits inconclusive reviews to pass
```

Terms acceptance rules:

```txt
accepted terms_version must match the cycle's active MPGF terms version
accepted privacy_version must match the cycle's active MPGF privacy version
revoked terms acceptance does not satisfy eligibility
demo-only terms acceptance may satisfy non-real-money smoke tests but must not confer real-money eligibility
production eligibility may use an existing repository terms model only if repo-adaptation-map maps it to mpgf_terms_acceptances semantics
```

Use `governance_weight_units` consistently unless the implementation explicitly defines all governance weights as basis-point-normalized and uses `governance_weight_bps` everywhere.

Required eligibility snapshot service:

```ts
resolveActiveMpgfEligibilitySnapshot(
  cycleId
): MpgfEligibilitySnapshotResolution;
```

---

## 17. Representative quorum \(Q_t\)

Let:

\[
E_t=\text{eligible voter set snapshotted before ballot opening}.
\]

\[
I_t=\text{valid voter set derived from }E_t\text{ and valid submitted ballots}.
\]

Let:

\[
W(E_t)=\sum_{i\in E_t}w_{i,t}.
\]

\[
W(I_t)=\sum_{i\in I_t}w_{i,t}.
\]

If \(W(E_t)=0\), then:

\[
Q_t=0.
\]

Reason:

```txt
no_eligible_voters
```

If \(W(E_t)>0\), define:

\[
q_t^{part}=\frac{W(I_t)}{W(E_t)}.
\]

Then \(Q_t=1\) iff all hold:

\[
q_t^{part}\ge q_{\min,t}^{part}.
\]

\[
CoveragePass_t=1.
\]

\[
DiversityPass_t=1.
\]

\[
CapturePass_t=1.
\]

\[
BallotValidityPass_t=1.
\]

Otherwise:

\[
Q_t=0.
\]

Create:

```sql
mpgf_quorum_results (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  eligibility_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  candidate_set_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  eligible_weight_units bigint not null,
  valid_voter_weight_units bigint not null,
  participation_bps bigint not null,
  participation_pass boolean not null,
  coverage_pass boolean not null,
  diversity_pass boolean not null,
  capture_pass boolean not null,
  ballot_validity_pass boolean not null,
  quorum_pass boolean not null,
  details_json jsonb not null,
  created_at timestamptz not null default now()
);
```

Required service:

```ts
computeRepresentativeQuorum(cycleId): QuorumResult;
```

`computeRepresentativeQuorum()` must persist the active eligibility_snapshot_id and candidate_set_snapshot_id used for the computation. `ballot_validity_pass` is false if any counted ballot lacks those snapshot references, references different snapshots, or has curves outside the recorded candidate-set snapshot; `details_json` must include the invalid-ballot counts and reasons without exposing private ballot identities.

---

## 18. Capture, diversity, and coverage partitions

Create:

```sql
mpgf_partition_dimensions (
  id uuid primary key,
  dimension_key text not null,
  dimension_label text not null,
  status text not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);

mpgf_partition_groups (
  id uuid primary key,
  dimension_id uuid references mpgf_partition_dimensions(id),
  group_key text not null,
  group_label text not null,
  status text not null,
  created_at timestamptz not null default now()
);

mpgf_participant_partition_memberships (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  user_id uuid not null,
  dimension_id uuid references mpgf_partition_dimensions(id),
  group_id uuid references mpgf_partition_groups(id),
  membership_source text not null,
  confidence_bps integer,
  status text not null,
  created_at timestamptz not null default now()
);
```

Partition dimensions, groups, membership sources, and thresholds are governance-configured protocol objects.

For each group \(g\):

\[
s_{g,t}
=
\frac{\sum_{i\in I_t\cap g}w_{i,t}}
{\sum_{i\in I_t}w_{i,t}}.
\]

If \(W(I_t)=0\):

```txt
coverage_pass = false
diversity_pass = false
capture_pass = false unless active protocol marks capture as not-applicable
details_json.reason includes no_valid_voters
Q_t = 0
```

Partition share calculations must not divide by zero.

Required service:

```ts
computeCaptureDiversityCoverage(
  cycleId
): PartitionQuorumDiagnostics;
```

---

## 19. Ballots

Live ballots must use finite piecewise-linear marginal-value curves.

\[
r_{i,a,t}: [0,B_t]\to \mathbb R.
\]

Backend normalization:

\[
\sum_a\int_0^{B_t}|r_{i,a,t}(x)|dx\le1.
\]

User-facing 100-unit scale:

\[
R_{i,a,t}(x)=100r_{i,a,t}(x).
\]

\[
\sum_a\int_0^{B_t}|R_{i,a,t}(x)|dx\le100.
\]

Create:

```sql
mpgf_ballots (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  user_id uuid,
  eligibility_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  candidate_set_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  status text not null,
  draft_version integer not null default 1,
  total_abs_integral_rational_json jsonb,
  total_abs_integral_decimal_cache numeric,
  locked_budget_cents_at_submission bigint,
  validation_trace_id uuid,
  submitted_at timestamptz
);

mpgf_ballot_curves (
  id uuid primary key,
  ballot_id uuid references mpgf_ballots(id),
  alternative_id uuid references mpgf_candidate_alternatives(id),
  curve_json jsonb not null,
  abs_integral_rational_json jsonb not null,
  signed_integral_rational_json jsonb not null,
  abs_integral_decimal_cache numeric,
  signed_integral_decimal_cache numeric,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_ballots.status` values:

```txt
draft
submitted
invalidated
voided
```

Ballot uniqueness and immutability rules:

```txt
there may be at most one non-voided draft ballot per cycle_id and user_id
there may be at most one submitted ballot per cycle_id and user_id
saveMpgfBallotDraft() upserts the user's draft and increments draft_version
submitMpgfBallot() moves the validated draft to submitted or returns the already submitted ballot for the same idempotent request
submitted ballots and submitted ballot curves are immutable
invalidated ballots require formal correction authority, audit log, deterministic trace, and privacy review if public summaries were already generated
only submitted ballots can create mpgf_cycle_valid_voters rows
duplicate submitted ballots for the same cycle_id and user_id fail ballot validity and quorum computation closed
```

The rational integral JSON fields are authoritative. Decimal cache fields are optional display/performance caches and must not be used by live allocation, validation, or certificate verification.

Curve JSON shape:

```json
{
  "representation": "piecewise_linear",
  "domainStartCents": 0,
  "domainEndCents": 1000000,
  "breakpoints": [
    {
      "xCents": 0,
      "valueRational": {
        "num": 1,
        "den": 1000000
      }
    },
    {
      "xCents": 500000,
      "valueRational": {
        "num": 1,
        "den": 2000000
      }
    },
    {
      "xCents": 1000000,
      "valueRational": {
        "num": 0,
        "den": 1
      }
    }
  ]
}
```

Rules:

```txt
curve_json domainStartCents must equal 0
curve_json domainEndCents must equal the cycle locked_budget_cents used for ballot validation
curve breakpoints must include xCents = 0 and xCents = locked_budget_cents
curve breakpoints must be sorted by xCents and have no duplicate xCents values after canonicalization
curve valueRational values must have integer numerator and positive integer denominator
curve alternative_id must be in the active candidate-set snapshot for the ballot cycle
ballot validation must reject curves for superseded, voided, ineligible, or non-snapshot alternatives
zero-crossing segments must be split before absolute-integral computation
point-only backend ballots cannot affect live allocation
guided UI answers are never the backend ballot object
backend ballot object is always compiled exact piecewise-linear curve
server-side validation required before final submission
```

Submitted ballot provenance rules:

```txt
submitted ballot must record the active eligibility_snapshot_id, active candidate_set_snapshot_id, locked_budget_cents_at_submission, and validation_trace_id
locked_budget_cents_at_submission must equal the locked cycle budget used as every curve domainEndCents
submitted ballot curves must reference only alternatives in the recorded candidate_set_snapshot_id
submitted ballot validation fails closed if the recorded snapshots are missing, non-active for the cycle, superseded for ballot-opening purposes, or inconsistent with E_t or the curve alternatives
```

Ballot UI must support:

```txt
simple mode
advanced mode
numeric-only mode
guided ballot builder mode
normalization meter
signed area preview
absolute area preview
remaining marginal-value budget
save draft
review screen
final confirmation
finality warning
privacy explanation
strong-negative flag option where applicable
```

Before final submission, show:

```txt
Your ballot is final for this cycle after submission.
Your ballot is stored as marginal-value curves, not simple point votes.
Your total absolute marginal-value area cannot exceed 100 units.
The allocation engine uses the integral of your submitted curves.
```

Private ballot identities are not publicly exposed before or after ballot close by default.

After ballot close, ballot identity access remains restricted to authorized system/admin/audit roles under RBAC and privacy/legal visibility rules.

Public summaries may expose only aggregate or privacy-filtered ballot information unless `formal-mechanism.md` and privacy/legal review explicitly permit more.

Required ballot services:

```ts
getMpgfBallotDraft(
  userId,
  cycleId
): MpgfBallotDraft;

saveMpgfBallotDraft(input): MpgfBallotDraft;

compileGuidedBallotAnswersToCurves(
  input
): MpgfBallotCurve[];

validateMpgfBallot(
  ballotId
): BallotValidationResult;

submitMpgfBallot(
  ballotId
): MpgfBallot;
```

Ballot submission rules:

```txt
cannot submit before ballot_opens_at
cannot submit after ballot_closes_at
cannot submit if cycle budget is not locked
cannot submit if participant is not in E_t
cannot submit if exact absolute-integral validation fails
cannot submit if active eligibility_snapshot_id is missing or inconsistent with E_t
cannot submit if active candidate_set_snapshot_id is missing or inconsistent with submitted curve alternatives
cannot submit unless locked_budget_cents_at_submission equals the locked cycle budget used as every curve domainEndCents
cannot submit unless validation_trace_id records the exact ballot validation inputs and result
final submit is idempotent for an already submitted ballot and otherwise immutable
```

---

## 20. Feasible allocation set

Create:

```sql
mpgf_candidate_set_snapshots (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  snapshot_version integer not null,
  status text not null,
  candidate_set_hash text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  supersedes_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  unique(cycle_id, snapshot_version)
);

mpgf_candidate_set_snapshot_items (
  id uuid primary key,
  candidate_set_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  alternative_id uuid references mpgf_candidate_alternatives(id),
  alternative_type text not null,
  eligibility_status text not null,
  threat_status text,
  downside_status text,
  strong_negative_pre_status text,
  recipient_accreditation_status text,
  ordering_key text not null,
  item_hash text not null,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_candidate_set_snapshots.status` values:

```txt
draft
approved
superseded
voided
```

Candidate-set snapshot rules:

```txt
candidate alternatives must be finalized into an approved candidate-set snapshot before ballot_opens_at
the active candidate-set snapshot is the approved, non-superseded, non-voided snapshot with the greatest snapshot_version for the cycle whose approved_at is not null and approved_at <= ballot_opens_at
if no unique candidate-set snapshot qualifies, ballots cannot open and quorum/allocation fail closed
candidate_set_hash covers ordered snapshot items, alternative IDs, alternative types, eligibility/threat/downside/strong-negative-pre/recipient-accreditation statuses, ordering keys, cycle_id, and snapshot_version
after ballot_opens_at, the active candidate-set snapshot is immutable
candidate-set corrections after ballot_opens_at require formal correction authority, deterministic trace, privacy review if ballots or public summaries exist, and must not mutate the original snapshot
post-ballot strong-negative results are stored in mpgf_strong_negative_results and must not mutate the candidate-set snapshot
ballots, feasible allocation compilation, strong-negative results, risk exposure, and public summaries must reference the same active candidate-set snapshot unless a formal correction rule requires a newer snapshot
```

Required candidate-set service:

```ts
resolveActiveMpgfCandidateSetSnapshot(
  cycleId
): CandidateSetSnapshotResolution;
```

Let:

\[
\mathcal A_t
=
\mathcal P_t^{cand}
\cup
\mathcal S_t
\cup
\{c_t\}.
\]

Where:

```txt
P_cand = candidate ordinary pools
S_t = safe fallback alternatives
c_t = carryover alternative
```

`P_cand`, `S_t`, and `c_t` are read from the active candidate-set snapshot for cycle \(t\).

A feasible allocation is:

\[
\mathbf F_t=(F_{a,t})_{a\in\mathcal A_t}.
\]

Subject to:

\[
F_{a,t}\in\mathbb Z_{\ge0}.
\]

\[
\sum_{a\in\mathcal A_t}F_{a,t}=B_t.
\]

For any ordinary pool \(p\):

\[
F_{p,t}=0
\]

if any hold:

```txt
p is not in P_cand
p is ineligible
p is threat-prohibited
p is downside-prohibited
p is strong-negative-filtered
p lacks required recipient accreditation
p lacks required use restrictions
p has unresolved blocking appeal
p has unresolved disqualifying conflict
```

Carryover is always feasible:

\[
F_{c,t}\ge0.
\]

Required functions:

```ts
compileFeasibleAllocationSet(cycleId): FeasibleAllocationSet;

validateAllocationFeasibility(
  instance,
  allocation
): FeasibilityResult;
```

---

## 21. Risk, exposure, and caps

All live thresholds, caps, weights, quorum values, risk values, exposure values, and funding amounts must use integer basis points or rational values. Live mechanism code must not consume floating-point constants.

Create:

```sql
mpgf_pool_risk_assessments (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  alternative_id uuid references mpgf_candidate_alternatives(id),
  candidate_set_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  assessment_version integer not null default 1,
  risk_bps integer not null,
  tail_loss_bps integer not null,
  threat_status text not null,
  downside_status text not null,
  assessment_method text not null,
  evidence_json jsonb,
  status text not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  supersedes_assessment_id uuid references mpgf_pool_risk_assessments(id),
  created_at timestamptz not null default now(),
  unique(cycle_id, alternative_id, assessment_version)
);
```

Allowed `mpgf_pool_risk_assessments.status` values:

```txt
draft
approved
superseded
voided
```

Risk input rules:

```txt
ordinary pool alternatives require one active approved pool risk assessment before they can receive positive allocation
ordinary pool alternatives without an active approved risk assessment are treated as ineligible for positive allocation
the active pool risk assessment is the approved, non-superseded, non-voided assessment with the greatest assessment_version for the same cycle and alternative, approved_at is not null, and approved_at <= ballot_opens_at
approved risk assessments must record approved_by, approved_at, candidate_set_snapshot_id, assessment_version, and the approval-matrix action
if no unique active pool risk assessment qualifies, or if multiple repository-mapped assessments tie on active version, the alternative is ineligible for positive allocation
risk_bps and tail_loss_bps must be integers in [0, 10000]
safe fallback alternatives use the active safe-fallback record's substantiveRiskBps and tailLossBps unless formal-mechanism.md specifies a stricter mapped risk source
carryover risk_bps and tail_loss_bps are 0 unless formal-mechanism.md specifies otherwise
threat_status and downside_status consumed by allocation must match the assessment's candidate_set_snapshot_id and the active candidate-set snapshot or the workflow fails closed
```

Risk type:

```txt
hybrid_max_plus_mean
```

Let `riskBps(a)` be the active approved basis-point risk value for alternative \(a\).

If \(B_t=0\) or no alternative receives positive allocation:

```txt
maxRiskBps(F) = 0
weightedAverageRiskBps(F) = 0
maxTailLossBps(F) = 0
```

If \(B_t>0\):

\[
maxRiskBps(F)=\max_{a:F_{a,t}>0}riskBps(a).
\]

\[
weightedAverageRiskBps(F)
=
\frac{\sum_a F_{a,t}\cdot riskBps(a)}{B_t}.
\]

`weightedAverageRiskBps(F)` is an exact rational value in basis-point units.

\[
r_{bps}(F)
=
\frac{
5000\cdot maxRiskBps(F)
+
5000\cdot weightedAverageRiskBps(F)
}{10000}.
\]

Exposure formula:

\[
\rho_{exposure}(F)
=
\rho_{min}
+
(\rho_{max}-\rho_{min})
\left(\frac{r_{bps}(F)}{10000}\right)^2.
\]

Where:

\[
\rho_{min}=\frac14.
\]

\[
\rho_{max}=4.
\]

Canonical cap function:

```ts
function computeCapCents(
  budgetCents: bigint,
  etaBps: bigint,
  multiplierBps: bigint
): bigint {
  return (budgetCents * etaBps * multiplierBps) / 100000000n;
}

function computeRationalCapCents(
  budgetCents: bigint,
  etaBps: bigint,
  multiplier: { num: string; den: string }
): bigint {
  const num = BigInt(multiplier.num);
  const den = BigInt(multiplier.den);
  if (den <= 0n) {
    throw new Error("invalid_rational_denominator");
  }
  return (budgetCents * etaBps * num) / (10000n * den);
}
```

`computeCapCents()` performs exactly one floor after multiplying `budgetCents`, `etaBps`, and `multiplierBps`; it must not divide by 10000 twice with an intermediate floor.

Fallback caps use `computeCapCents()` with `multiplierBps = operationalReliabilityBps`.

Risk exposure caps that use \(\rho_{exposure}(F)\) use `computeRationalCapCents()` with the exact rational \(\rho_{exposure}(F)\). They must not round \(\rho_{exposure}(F)\) to an integer basis-point value before cap calculation unless `formal-mechanism.md` explicitly specifies that stricter rounding.

All live, fallback, and risk caps must use the canonical cap functions above unless `formal-mechanism.md` explicitly specifies stricter rounding.

No cap calculation may use floating-point arithmetic.

Tail-loss rule:

```txt
if active protocol defines tailLossLimitBps, then maxTailLossBps(F) must be <= tailLossLimitBps
maxTailLossBps(F) is the maximum active approved tail_loss_bps among alternatives with positive allocation, or 0 when B_t=0
tail-loss checks use exact integer comparisons
```

Required risk services:

```ts
resolveActiveMpgfRiskInputs(
  cycleId
): RiskInputResolution;

computeMpgfRiskExposure(
  allocation
): RiskExposureResult;
```

---

## 22. Strong-negative filter

Create:

```sql
mpgf_strong_negative_flags (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  pool_id uuid references mpgf_candidate_alternatives(id),
  user_id uuid not null,
  severity_bps integer not null,
  reason text not null,
  evidence_json jsonb,
  status text not null,
  created_at timestamptz not null default now()
);

mpgf_strong_negative_results (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  pool_id uuid references mpgf_candidate_alternatives(id),
  eligibility_snapshot_id uuid references mpgf_eligibility_snapshots(id),
  candidate_set_snapshot_id uuid references mpgf_candidate_set_snapshots(id),
  weighted_flag_share_bps integer not null,
  weighted_severity_bps integer not null,
  threshold_triggered boolean not null,
  filter_effective boolean not null,
  review_required boolean not null,
  result_status text not null,
  details_json jsonb not null,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_strong_negative_flags.status` values:

```txt
submitted
validated
rejected
voided
```

Allowed `mpgf_strong_negative_results.result_status` values:

```txt
draft
computed
review_required
review_confirmed
review_rejected
voided
```

Only validated flags from \(i\in E_t\) count.

`mpgf_strong_negative_results` must record the eligibility_snapshot_id and candidate_set_snapshot_id used for the computation.

If \(W(E_t)=0\):

```txt
no strong-negative flags count for allocation purposes
weighted_flag_share_bps = 0
weighted_severity_bps = 0
cycle follows no_eligible_voters / failed-quorum path
```

Strong-negative computations must not divide by zero.

`threshold_triggered` is true iff weighted flag share and weighted severity meet active thresholds.

`filter_effective` is true iff `threshold_triggered = true`, the result uses the required active snapshots, and either the active protocol does not require manual review or `result_status = review_confirmed`.

A pool is strong-negative-filtered iff `filter_effective = true`.

`review_required` records that manual review was required for that result; it does not by itself keep blocking after terminal review.

If active protocol requires review and thresholds trigger, the result must use `result_status = review_required` until review completes. While `result_status` is `draft`, `computed`, or `review_required`, the pool is not eligible for positive allocation and `filter_effective = false`. `review_confirmed` makes the strong-negative filter effective. `review_rejected` means the pool is not strong-negative-filtered by that result unless a later formal correction creates a new confirmed result.

Strong-negative results whose recorded snapshots do not match the cycle's active eligibility and candidate-set snapshots for allocation fail closed unless a formal correction rule explicitly authorizes a corrected candidate-set snapshot and the deterministic trace records the original and corrected snapshot IDs.

Required functions:

```ts
computeStrongNegativeResult(
  cycleId,
  poolId
): StrongNegativeResult;

validateStrongNegativeFlag(flag): ValidationResult;
```

---

## 23. Certified exact allocation solver

Live objective:

\[
\mathbf F_t^\star
\in
\arg\max_{\mathbf F_t\in\mathcal F_t}
\sum_{i\in I_t}
w_{i,t}
\sum_{a\in\mathcal A_t}
\int_0^{F_{a,t}}r_{i,a,t}(x)\,dx.
\]

No greedy, heuristic, random, local-search, approval-vote, floating-point-only, or uncertified live allocation.

Create:

```txt
docs/mpgf/solver-implementation-plan.md
docs/mpgf/solver-support-profile.md
docs/mpgf/solver-benchmark-report.md
docs/mpgf/www-exact-pilot-dry-run-verification.md
config/mpgf/solver-support-profile.json
tests/fixtures/mpgf/solver-benchmarks/
```

Required services:

```ts
compileMpgfOptimizationInstance(
  cycleId
): CanonicalMpgfOptimizationInstance;

compileAggregateMarginalCurve(
  alternativeId,
  ballotCurves,
  governanceWeights,
  budgetCents
): AggregateMarginalCurve;

solveMpgfByCompleteRegionEnumeration(
  instance
): SolverResult;

solveMpgfByCertifiedBranchAndBound(
  instance
): SolverResult;

selectMpgfLiveSolver(
  instance
): LiveSolverSelection;

verifyMpgfOptimalityCertificate(
  instance,
  certificate
): CertificateVerificationResult;

preflightMpgfSolverSupport(
  instance,
  profile
): SolverSupportPreflightResult;

computeExactMpgfAllocation(
  cycleId
): CertifiedAllocationResult;
```

`computeExactMpgfAllocation(cycleId)` is the only live certified allocation entrypoint.

It must:

```txt
compile canonical instance
run solver preflight
select exact solver
solve using complete region enumeration or certified branch-and-bound
verify solver certificate independently
return certified result or fail-closed status
```

Live ordinary allocation remains disabled until at least one exact solver method has:

```txt
canonical instance compiler
exact arithmetic implementation
method-specific certificate schema
certificate generator
independent verifier
passing demo fixture with verified_optimal certificate
conformance tests proving uncertified outputs cannot authorize funds
```

If no exact solver method passes demo certificate test, MPGF may support:

```txt
public informational pages
pledge-only contributions
test-mode dry runs
pool proposals
ballot drafting in nonbinding demo mode
shadow allocation
```

But MPGF must not:

```txt
certify ordinary live allocation
create pool authorizations from allocation
release tranches from ordinary allocation
claim allocation is live
```

---

## 24. Solver certificate schemas

Live allocation cannot rely on solver-native status strings or opaque logs.

Region-enumeration certificate minimum schema:

```json
{
  "certificateSchemaVersion": "mpgf-solver-certificate-v0.3",
  "certificateType": "region_enumeration",
  "canonicalInstanceHash": "<hash>",
  "budgetCents": "0",
  "alternatives": [],
  "candidateAllocation": [],
  "candidateObjectiveValueRational": {
    "num": "0",
    "den": "1"
  },
  "feasibilityProof": {
    "budgetEquality": true,
    "integerCents": true,
    "zeroConstraintsSatisfied": true,
    "capsSatisfied": true,
    "riskExposureSatisfied": true,
    "tailLossSatisfied": true
  },
  "regionEnumerationProof": {
    "regionGridHash": "<hash>",
    "regionsConsidered": "0",
    "regionsExcluded": "0",
    "excludedRegionReasonsHash": "<hash>",
    "bestObjectiveUpperBoundRational": {
      "num": "0",
      "den": "1"
    },
    "optimalityGapRational": {
      "num": "0",
      "den": "1"
    }
  },
  "tieBreakProof": {
    "tieBreakRuleVersion": "mpgf-tiebreak-v0.3",
    "tieBreakTraceHash": "<hash>"
  }
}
```

Branch-and-bound certificate minimum schema:

```json
{
  "certificateSchemaVersion": "mpgf-solver-certificate-v0.3",
  "certificateType": "branch_and_bound",
  "canonicalInstanceHash": "<hash>",
  "budgetCents": "0",
  "alternatives": [],
  "candidateAllocation": [],
  "candidateObjectiveValueRational": {
    "num": "0",
    "den": "1"
  },
  "feasibilityProof": {
    "budgetEquality": true,
    "integerCents": true,
    "zeroConstraintsSatisfied": true,
    "capsSatisfied": true,
    "riskExposureSatisfied": true,
    "tailLossSatisfied": true
  },
  "branchAndBoundProof": {
    "rootUpperBoundRational": {
      "num": "0",
      "den": "1"
    },
    "nodesExplored": "0",
    "nodesPruned": "0",
    "nodeTraceMerkleRoot": "<hash>",
    "allLeafBoundsAtMostCandidate": true,
    "bestRemainingUpperBoundRational": {
      "num": "0",
      "den": "1"
    },
    "optimalityGapRational": {
      "num": "0",
      "den": "1"
    }
  },
  "tieBreakProof": {
    "tieBreakRuleVersion": "mpgf-tiebreak-v0.3",
    "tieBreakTraceHash": "<hash>"
  }
}
```

The verifier must check:

```txt
supported certificate schema
supported certificate type
canonicalInstanceHash matches instance
candidate allocation is feasible in exact integer cents
candidate objective value recomputed exactly
zero constraints satisfied
caps satisfied using computeCapCents()
risk exposure and tail-loss constraints satisfied
global upper bound valid for certificate method
optimality gap exactly zero
deterministic tie-break trace valid where multiple optima exist
verifier does not depend on solver-native logs or status strings
```

---

## 25. Solver benchmark harness and seed support profile

Solver support limits are configurable Pilot v0.3 operational defaults, not formal mechanism constants.

Seed profile:

```json
{
  "solverSupportProfileVersion": "mpgf-solver-support-v0.3",
  "defaultOperationalLimits": {
    "maxAlternatives": 8,
    "maxBallots": 100,
    "maxBreakpointsPerCurve": 8,
    "maxCanonicalBreakpointsPerAlternative": 200,
    "maxRegionEnumerationRegions": 200000,
    "maxBranchAndBoundNodes": 100000,
    "maxCertificateJsonBytes": 5000000,
    "maxVerifierRuntimeSeconds": 60
  },
  "failureBehavior": "fail_closed",
  "heuristicLiveAllocationAllowed": false,
  "shadowHeuristicAllowed": true
}
```

Required functions:

```ts
runMpgfSolverBenchmarks(): SolverBenchmarkReport;

validateSolverSupportProfileAgainstBenchmarks(
  profile: SolverSupportProfile,
  report: SolverBenchmarkReport
): ValidationResult;
```

Required benchmark fixtures:

```txt
small-2-alt-3-ballot
zero-crossing-curves
many-breakpoints-within-limit
too-many-alternatives
too-many-breakpoints
too-many-regions
branch-and-bound-required
certificate-size-limit
verifier-runtime-limit
infeasible-instance
tie-break-instance
```

If active support profile is looser than benchmark-supported profile, `exact_pilot_complete` fails. Admin and auditor approval may record a proposed future-cycle support profile, but it is not active and cannot support `exact_pilot_complete` until benchmark evidence supports it.

A looser solver support profile must not apply to any cycle whose ballot window has opened.

If preflight is not `supported_exact`:

```txt
no live ordinary allocation
status = failed_certification or admin_review_required
shadow allocation may run
pool authorization is blocked
```

---

## 26. Deterministic fallback allocation

Create:

```txt
config/mpgf/safe-fallbacks.json
config/mpgf/safe-fallbacks.schema.json
```

```sql
mpgf_safe_fallbacks (
  id uuid primary key,
  fallback_key text unique not null,
  title text not null,
  recipient_id uuid references mpgf_recipients(id),
  status text not null,
  audit_confidence_bps integer not null,
  consensus_breadth_bps integer not null,
  robust_cost_effectiveness_bps integer not null,
  reversibility_bps integer not null,
  substantive_risk_bps integer not null,
  threat_score_bps integer not null,
  tail_loss_bps integer not null,
  max_allocation_cents bigint,
  evidence_json jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_safe_fallbacks.status` values:

```txt
draft
active
suspended
retired
```

`SafeFallbackRecord` values must be drawn from active, approved `mpgf_safe_fallbacks` rows, active approved entries in `config/mpgf/safe-fallbacks.json`, or active approved records in an equivalent repository-mapped safe-fallback registry.

`mpgf_safe_fallbacks.status = active` requires approved_by, approved_at, the safe-fallback approval-matrix action, and all basis-point fields in the closed interval `[0, 10000]`.

An empty safe-fallback registry is valid only if it explicitly records `carryover_only_empty_registry = true`.

`mpgf_candidate_alternatives.fallback_id` is required only when `alternative_type = safe_fallback`; ordinary pool alternatives and the carryover alternative must not use a fallback ID unless `formal-mechanism.md` explicitly maps them to a safe-fallback record.

Safe fallback registry approval and fallback allocation approval require RBAC approval, conflict checks, audit log, and deterministic trace.

```ts
type SafeFallbackRecord = {
  fallbackId: string;
  title: string;
  recipientId?: string;
  auditConfidenceBps: bigint;
  consensusBreadthBps: bigint;
  robustCostEffectivenessBps: bigint;
  reversibilityBps: bigint;
  substantiveRiskBps: bigint;
  threatScoreBps: bigint;
  tailLossBps: bigint;
  maxAllocationCents?: bigint;
};
```

Required function:

```ts
validateSafeFallbackRegistry(): SafeFallbackRegistryValidationResult;
```

Fallback allocator signature:

```ts
fallbackAllocate(input: {
  cycleBudgetCents: bigint;
  stage: MpgfStage;
  operationalReliabilityBps: bigint;
  baseEtaFallbackBps: bigint;
  safeFallbacks: SafeFallbackRecord[];
  protocol: MpgfProtocolSnapshot;
}): FallbackAllocationPlan;
```

Fallback cap must use:

```ts
const fallbackBudgetCap = computeCapCents(
  cycleBudgetCents,
  baseEtaFallbackBps,
  operationalReliabilityBps
);
```

Fallback priority numerator:

\[
FallbackPriorityNumerator
=
3500\cdot auditConfidenceBps
+
2500\cdot consensusBreadthBps
+
2000\cdot robustCostEffectivenessBps
+
2000\cdot reversibilityBps.
\]

\[
FallbackPriorityBps
=
\frac{FallbackPriorityNumerator}{10000}.
\]

Compute `FallbackPriorityBps` using exact rational/integer arithmetic.

Tie-break order:

```txt
higher FallbackPriority
higher auditConfidence
lower substantiveRisk
lower threatScore
lower tailLoss
lexicographic fallback_id
```

If no eligible fallback exists:

```txt
carryover = B_t
```

---

## 27. Recipients, accreditation, compliance, and payout destinations

Create:

```sql
mpgf_recipients (
  id uuid primary key,
  display_name text not null,
  legal_name text,
  recipient_type text not null,
  jurisdiction text,
  website_url text,
  contact_email text,
  status text not null,
  public_profile_json jsonb,
  private_profile_json jsonb,
  created_at timestamptz not null default now()
);

mpgf_recipient_accreditations (
  id uuid primary key,
  recipient_id uuid references mpgf_recipients(id),
  accreditation_status text not null,
  accreditation_type text not null,
  evidence_json jsonb,
  reviewed_by uuid,
  review_rationale text,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

mpgf_recipient_compliance_reviews (
  id uuid primary key,
  recipient_id uuid references mpgf_recipients(id),
  review_type text not null,
  status text not null,
  jurisdiction text,
  evidence_json jsonb,
  decision text,
  decision_rationale text,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

mpgf_recipient_payout_destinations (
  id uuid primary key,
  recipient_id uuid references mpgf_recipients(id),
  provider text not null,
  destination_reference text,
  status text not null,
  verification_status text not null,
  evidence_json jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
```

Recipient types:

```txt
individual
nonprofit
for_profit
fiscal_sponsor
research_group
community_group
government_entity
other
```

Allowed `mpgf_recipients.status` values:

```txt
draft
active
suspended
retired
```

Allowed `mpgf_recipient_accreditations.accreditation_status` values:

```txt
pending
approved
rejected
expired
revoked
```

Allowed `mpgf_recipient_compliance_reviews.status` values:

```txt
pending
in_review
approved
rejected
expired
revoked
```

Allowed `mpgf_recipient_compliance_reviews.decision` values:

```txt
approved
rejected
not_applicable
```

Allowed `mpgf_recipient_payout_destinations.status` values:

```txt
draft
active
suspended
retired
```

Allowed `mpgf_recipient_payout_destinations.verification_status` values:

```txt
unverified
pending
verified
failed
expired
revoked
```

A recipient may receive external payout only if:

```txt
recipient.status permits payout
required accreditation is approved
required compliance review is approved
recipient is not suspended
payout/legal/payment profile permits recipient type and jurisdiction
required active verified payout destination exists, if required by profile
```

Recipient accreditation and compliance approvals must be supported by the approval-matrix action, reviewer identity, review timestamp, rationale, and audit evidence. Missing accreditation or compliance approval authority fails authorization and external payout closed.

Recipient private profiles, compliance evidence, and payout destination details are private by default.

---

## 28. Authorizations, tranches, payouts, pause, and void

Allocation does not automatically disburse funds.

No external payout occurs automatically unless an approved automated payout-provider profile exists and has `automatedPayouts.enabled=true`.

Create:

```sql
mpgf_payout_authorizations (
  id uuid primary key,
  tranche_id uuid references mpgf_tranches(id),
  authorization_id uuid references mpgf_authorizations(id),
  recipient_id uuid references mpgf_recipients(id),
  amount_cents bigint not null,
  currency text not null default 'usd',
  payout_mode text not null,
  status text not null,
  approved_by uuid,
  approved_at timestamptz,
  external_payment_required boolean not null default true,
  external_payment_evidence_id uuid,
  payment_failed_at timestamptz,
  failure_reason text,
  failure_evidence_json jsonb,
  voided_by uuid,
  voided_at timestamptz,
  carried_over_by uuid,
  carried_over_at timestamptz,
  created_at timestamptz not null default now()
);

mpgf_external_payment_evidence (
  id uuid primary key,
  payout_authorization_id uuid references mpgf_payout_authorizations(id),
  payment_provider text,
  external_reference text,
  amount_cents bigint not null,
  currency text not null default 'usd',
  evidence_json jsonb,
  recorded_by uuid,
  recorded_at timestamptz not null default now(),
  verification_status text not null,
  verified_by uuid,
  verified_at timestamptz
);
```

Allowed `mpgf_payout_authorizations.status` values:

```txt
draft
approved_internal
awaiting_external_payment
externally_paid
payment_failed
voided
carried_over
```

A certified optimal allocation may create `authorization.proposed` records.

`authorization.proposed` does not permit:

```txt
tranche release
payout authorization
external payment
public representation as finally approved
```

`authorization.approved` may occur only after:

```txt
allocation certificate verification passed
allocation audit checks passed
no blocking appeal applies
no blocking audit concern applies
required admin approval authority is satisfied
required deterministic trace exists
```

No tranche may move to `ready_for_review` until:

```txt
authorization.status = approved
```

No payout authorization may be created until its tranche has reached:

```txt
released_internal
```

Canonical mapping:

```txt
allocation_plan.certified_optimal
  -> authorization.proposed

allocation_plan.audit_approved + authorization.proposed + admin approval
  -> authorization.approved

authorization.approved
  -> tranche.ready_for_review

tranche.ready_for_review
  -> tranche.released_internal

tranche.released_internal
  -> payout_authorization.draft

payout_authorization.draft
  -> payout_authorization.approved_internal

payout_authorization.approved_internal
  -> tranche.payout_authorized

tranche.payout_authorized + payout_authorization.approved_internal
  -> payout_authorization.awaiting_external_payment

payout_authorization.awaiting_external_payment
  -> payout_authorization.externally_paid

payout_authorization.externally_paid
  -> tranche.externally_paid
```

Definitions:

```txt
released_internal means internal tranche release only, not external payment
approved_internal means internal payout authorization only, not external payment
externally_paid requires verified external payment evidence or approved automated payout-provider confirmation
```

No public UI may describe a tranche as externally paid merely because it is authorized, approved, released_internal, payout_authorized, or approved_internal.

### Payout terminology rule

The following terms are distinct.

`payout_authorized` is an MPGF chart-of-accounts bucket or public-summary amount state. It means funds have moved into the payout-authorized accounting/state category. It is not the payout authorization object.

`mpgf_payout_authorizations` is the database object/table representing an internal payout authorization workflow.

`approved_internal` is a status value on `mpgf_payout_authorizations`. It means internal approval has occurred. It does not mean external payment has occurred.

`externally_paid` is a payout authorization or tranche status indicating verified external payment evidence or approved automated payout-provider confirmation.

Public UI must use user-facing labels:

```txt
authorized
internally released
payout authorized
externally paid
voided
carried over
```

Public UI must not expose raw internal status names without explanatory labels.

Required services:

```ts
createPayoutAuthorizationFromTranche(
  trancheId
): PayoutAuthorization;

approveInternalPayoutAuthorization(
  payoutAuthorizationId
): PayoutAuthorization;

recordExternalPaymentEvidence(
  payoutAuthorizationId,
  evidence
): ExternalPaymentEvidence;

verifyExternalPaymentEvidence(
  evidenceId
): VerificationResult;

voidPayoutAuthorization(
  payoutAuthorizationId,
  reason
): PayoutAuthorization;

carryOverVoidedPayout(
  payoutAuthorizationId
): CarryoverResult;
```

---

## 29. Payout provider interface

Create:

```txt
config/mpgf/payout-provider-profile.json
config/mpgf/payout-provider-profile.schema.json
```

Default profile:

```json
{
  "mode": "manual_evidence_only",
  "automatedPayouts": {
    "enabled": false,
    "provider": null,
    "payoutDestinationVerification": {
      "requiredWhenAutomated": true,
      "method": null
    },
    "sanctionsScreeningProvider": null
  },
  "manualExternalPaymentEvidence": {
    "enabled": true,
    "requiresRecipientAccreditation": true,
    "requiresRecipientComplianceReview": true,
    "requiresVerifiedExternalPaymentEvidence": true
  }
}
```

Required interface:

```ts
interface MpgfPayoutProviderAdapter {
  createRecipient(
    input: CreatePayoutRecipientInput
  ): Promise<PayoutRecipientResult>;

  verifyDestination(
    input: VerifyPayoutDestinationInput
  ): Promise<PayoutDestinationVerificationResult>;

  createPayout(
    input: CreatePayoutInput
  ): Promise<PayoutResult>;

  handleWebhook(
    event: unknown
  ): Promise<PayoutWebhookResult>;

  reverseOrRecallPayout(
    input: PayoutReversalInput
  ): Promise<PayoutReversalResult>;
}
```

Default disabled adapter must throw for all automated payout actions with `manual_evidence_only`.

Required validation function:

```ts
validateMpgfPayoutProviderProfile(
  profile
): PayoutProviderProfileValidationResult;
```

Payout provider profile validation must fail if:

```txt
profile does not conform to config/mpgf/payout-provider-profile.schema.json
mode is manual_evidence_only and automatedPayouts.enabled is true
automatedPayouts.enabled is true without an approved provider
automatedPayouts.enabled is true without an approved payoutDestinationVerification.method
automatedPayouts.enabled is true without approved sanctions/compliance screening where required by payment/legal profile
manualExternalPaymentEvidence.enabled is false while automatedPayouts.enabled is false
```

If no approved automated payout-provider profile with `automatedPayouts.enabled=true` exists:

```txt
no automated payout adapter can be loaded
payout mode = manual_evidence_only
externally_paid requires verified external payment evidence
```

Automated payouts remain disabled unless `config/mpgf/payout-provider-profile.json` exists, is approved as an automated payout-provider profile, and has `automatedPayouts.enabled=true`.

---

## 30. Pool proposals, outcome units, and SAE assessments

Public routes must support:

```txt
/mpgf/pools
/mpgf/pools/[poolId]
/mpgf/pools/new
```

Pool proposal required fields:

```txt
title
summary
cause area
requested maximum funding
minimum viable funding, if any
outcome units
expected effect vs funding
timeline
milestones
risks
misuse pathways
recipient / implementing team
```

Create:

```sql
mpgf_pool_proposals (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  author_user_id uuid not null,
  candidate_alternative_id uuid references mpgf_candidate_alternatives(id),
  title text not null,
  summary text not null,
  cause_area text not null,
  requested_maximum_funding_cents bigint not null,
  minimum_viable_funding_cents bigint,
  outcome_units_summary text not null,
  expected_effect_vs_funding text not null,
  timeline text not null,
  milestones_json jsonb not null,
  risks_json jsonb not null,
  misuse_pathways text not null,
  proposed_recipient_id uuid references mpgf_recipients(id),
  implementing_team_json jsonb,
  status text not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_rationale text
);

mpgf_outcome_units (
  id uuid primary key,
  pool_id uuid references mpgf_candidate_alternatives(id),
  unit_label text not null,
  unit_definition text not null,
  reference_alternative text,
  measurement_method text not null,
  uncertainty_description text,
  created_by uuid,
  created_at timestamptz not null default now()
);

mpgf_sae_effect_assessments (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  pool_id uuid references mpgf_candidate_alternatives(id),
  sae_user_id uuid not null,
  outcome_unit_id uuid references mpgf_outcome_units(id),
  curve_json jsonb not null,
  uncertainty_json jsonb,
  reasoning text not null,
  dissent_json jsonb,
  conflict_disclosure_id uuid,
  status text not null,
  created_at timestamptz not null default now()
);

mpgf_sae_effect_curves (
  id uuid primary key,
  assessment_id uuid references mpgf_sae_effect_assessments(id),
  curve_type text not null,
  domain_start_cents bigint not null,
  domain_end_cents bigint not null,
  breakpoints_json jsonb not null,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_pool_proposals.status` values:

```txt
draft
submitted
under_review
approved_as_candidate
rejected
withdrawn
```

Pool proposal submission and approval rules:

```txt
submitted requires every non-optional pool proposal required field and any conditional field whose condition applies
submitted requires at least one of proposed_recipient_id or implementing_team_json
approved_as_candidate requires sufficient recipient or implementing-team information for the recipient accreditation and compliance workflow, or an explicit not-applicable justification
approved_as_candidate requires reviewed_by, reviewed_at, review_rationale, and the approval-matrix action
candidate_alternative_id may be assigned only after approved_as_candidate or through an approved repository-mapping workflow
```

No separate core `pool` table is required. For approved pool alternatives, the `mpgf_candidate_alternatives.id` value is the pool identifier used by outcome units, SAE assessments, ballots, authorizations, and downstream pool references. The originating proposal links to that candidate alternative through `mpgf_pool_proposals.candidate_alternative_id`.

SAE effect curves are total-effect curves by default.

If marginal-effect curves are submitted, they must be explicitly labeled and converted to total-effect curves by exact integration before use.

SAE curves do not enter the live ballot objective unless `formal-mechanism.md` explicitly says so.

Required functions:

```ts
validateSaeEffectCurve(curve): ValidationResult;

convertMarginalToTotalEffectCurve(
  curve
): TotalEffectCurve;

aggregateSaeAssessments(
  poolId,
  cycleId
): SaeAssessmentSummary;
```

---

## 31. Governance-dependent judgments

Create:

```sql
mpgf_governance_judgments (
  id uuid primary key,
  cycle_id uuid,
  epoch_id uuid,
  judgment_type text not null,
  target_type text not null,
  target_id uuid,
  actor_user_id uuid,
  actor_role text not null,
  value_json jsonb not null,
  evidence_json jsonb,
  rationale text not null,
  conflict_disclosure_json jsonb,
  status text not null,
  appeal_status text,
  supersedes_judgment_id uuid references mpgf_governance_judgments(id),
  version integer not null default 1,
  created_at timestamptz not null default now()
);
```

Judgment types include:

```txt
audit_component_status
special_review_decision
threat_review_decision
downside_review_decision
strong_negative_review_decision
conflict_review_decision
recipient_accreditation_decision
appeal_decision
red_team_review_decision
legal_review_decision
payment_review_decision
privacy_review_decision
emergency_classification
```

Rules:

```txt
no governance function may depend on an unlogged judgment
every judgment includes actor, role, target, value, evidence, rationale, timestamp, conflict disclosure, and status
judgments are versioned
corrections create new rows referencing supersedes_judgment_id
deterministic kernel input hashes include consumed judgment IDs and versions
```

Allowed `mpgf_governance_judgments.status` values:

```txt
draft
approved
rejected
superseded
voided
```

Allowed `mpgf_governance_judgments.appeal_status` values:

```txt
none
appealable
appealed
appeal_upheld
appeal_rejected
appeal_expired
```

Deterministic kernels may consume only approved, non-superseded, non-voided governance judgments. Draft, rejected, superseded, voided, missing, or appeal-upheld judgments fail closed when a judgment is required.

Required functions:

```ts
createMpgfGovernanceJudgment(input): GovernanceJudgment;

validateMpgfGovernanceJudgment(
  judgment
): ValidationResult;

getGovernanceJudgmentsForKernel(
  inputRefs
): GovernanceJudgment[];
```

---

## 32. Deterministic traces

All deterministic kernels must use:

```txt
canonical serialization
stable JSON key ordering
deterministic array ordering by explicit keys
no wall-clock reads inside kernel
no random numbers
no hidden database reads beyond explicit input references
integer/rational arithmetic for money, thresholds, caps, weights, funding amounts
```

Create:

```sql
mpgf_deterministic_function_traces (
  id uuid primary key,
  function_name text not null,
  input_hash text not null,
  output_hash text not null,
  input_reference_json jsonb not null,
  output_reference_json jsonb not null,
  rule_version text not null,
  protocol_version text,
  theta_version text,
  constitution_version text,
  schema_version text,
  trace_json jsonb not null,
  created_at timestamptz not null default now()
);
```

Trace must include:

```txt
function name
rule version
protocol version
theta version where relevant
constitution version
schema version
input snapshot IDs
every rule fired
every failed condition
all deterministic tie-breaks used
canonical input hash
canonical output hash
```

A deterministic function trace must be written before output can be used for admin approval, stage transition, allocation approval, fallback allocation approval, mechanism candidate adoption, or constitutional adoption.

---

## 33. Governance lifecycle

Implement:

```txt
Measure_Pi_e
Audit_Pi_e
T_C
Reauthorize
SuperReauthorize
SelectMechanism_C_Pi
```

`Measure_Pi_e(epochId)` returns immutable \(D_e\) snapshot:

```txt
ledger
participation
ballot
quorum
risk
allocation
fallback
disbursement
capture
appeal
incident
shadow
```

Measurement is deterministic snapshotting only. It must not create judgments.

Audit statuses:

```txt
pass
nonblocking_concern
blocking_concern
fail
unresolved
```

`pass_with_concerns` is invalid.

\[
AuditPass=1
\]

iff every component is `pass` or `nonblocking_concern`.

\[
StrictAuditPass=1
\]

iff every critical component is `pass`.

Critical components:

```txt
ledger
ballot
quorum
risk
allocation
disbursement
constitution
```

Emergency triggers include:

```txt
CriticalLedgerFailure
PaymentOrLegalStop
SecurityIncidentSevere
ThreatCaptureDetected
UnresolvedVoidFailure
ProhibitedPoolFunded
```

Emergency exits only if:

\[
EmergencyResolved=1.
\]

\[
StrictAuditPass=1.
\]

Pilot -> public_beta requires:

```txt
CompletedEpochs_pilot >= 1
SuccessfulEndToEndCycles_pilot >= 3
R_ops >= 8000 bps
StrictAuditPass = 1
CriticalIncidentCount = 0
CertifiedOptimalAllocationRate = 1
LedgerConsistencyRate = 1
QuorumComputationValid = 1
audited post-pilot review after first completed pilot epoch
```

Public_beta -> mature requires:

```txt
CompletedEpochs_public_beta >= 2
R_ops >= 9000 bps
StrictAuditPass = 1
CriticalIncidentCount = 0
StageReauthorize = 1
ShadowMechanismReviewComplete = 1
```

Protected invariants:

```txt
bounded ballots
no unbounded utility aggregation
threat prohibit rule
downside prohibit rule
audit log requirement
certified live allocation
non-retroactivity
emergency shutdown
authorization-disbursement separation
```

During pilot and public_beta, protected invariants may only be strengthened, not weakened, removed, or replaced.

### Emergency shutdown controls

Create:

```sql
mpgf_emergency_shutdowns (
  id uuid primary key,
  status text not null,
  severity text not null,
  trigger_type text not null,
  reason text not null,
  triggered_by uuid,
  triggered_at timestamptz not null default now(),
  resolved_by uuid,
  resolved_at timestamptz,
  exit_approval_trace_id uuid,
  effects_json jsonb not null
);
```

Allowed `mpgf_emergency_shutdowns.status` values:

```txt
active
resolved
cancelled
```

Emergency shutdown active effects:

```txt
MPGF_REAL_MONEY_ENABLED is treated as false even if an environment variable is misconfigured
real_money payment intent creation is blocked
automated payout adapter loading is blocked
external payout creation is blocked
authorization approval is blocked
tranche release is blocked
payout authorization approval is blocked
certified allocation can run only in dry-run or shadow mode
public routes render emergency-disabled or unavailable states without server error
admin incident, audit, and recovery routes remain available to authorized admins
```

Required emergency services:

```ts
triggerMpgfEmergencyShutdown(input): EmergencyShutdownResult;

exitMpgfEmergencyShutdown(input): EmergencyShutdownExitResult;

getActiveMpgfEmergencyShutdown(): ActiveEmergencyShutdown | null;
```

Exiting emergency shutdown requires Exit emergency shutdown approval, `EmergencyResolved=1`, `StrictAuditPass=1`, and an audit log.

---

## 34. State-machine registry and discovery validator

Create:

```txt
config/mpgf/state-machines.json
config/mpgf/status-value-registry.json
config/mpgf/status-value-registry.schema.json
docs/mpgf/planned-state-machine-table.md
docs/mpgf/status-bearing-object-discovery-report.md
docs/mpgf/status-value-registry.md
```

Create:

```sql
mpgf_state_transition_logs (
  id uuid primary key,
  object_type text not null,
  object_id uuid not null,
  from_status text not null,
  to_status text not null,
  actor_user_id uuid,
  reason text not null,
  transition_trace_id uuid,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);
```

Planned state-machine table required columns:

```md
| Object type | Repository object/table | Statuses | Required transitions | Emergency transitions | Terminal statuses | Coverage status | Conformance rows |
|---|---|---|---|---|---|---|---|
```

Status-value registry row shape:

```json
{
  "field": "mpgf_participant_verifications.verification_status",
  "statusKind": "value_enum",
  "allowedValues": [
    "pending",
    "approved",
    "rejected",
    "expired"
  ],
  "owner": "verification",
  "stateMachineObjectType": null,
  "conformanceRows": [],
  "acceptanceCriteria": []
}
```

Status field rules:

```txt
every database column named status or ending in _status must appear in config/mpgf/state-machines.json or config/mpgf/status-value-registry.json before Phase B implementation
lifecycle statuses with transitions use config/mpgf/state-machines.json
non-lifecycle status/value fields use config/mpgf/status-value-registry.json
status fields explicitly enumerated in this instruction must appear with the same allowed values unless a stricter repository mapping is justified
status fields not explicitly enumerated in this instruction must have allowed values, owner, conformance rows, and acceptance criteria in the status-value registry
services must reject status values absent from the relevant state machine or status-value registry
```

Minimum state machines must exist for:

```txt
genesis
cycle
ledger_transaction
payment_intent
contribution
pledge
recurring_contribution_commitment
eligibility_snapshot
candidate_set_snapshot
sybil_review
safe_fallback
pool_risk_assessment
pool
ballot
allocation_plan
authorization
tranche
payout_authorization
refund
receipt
public_cycle_summary
production_enablement
idempotency_key
admin_approval_record
governance_judgment
appeal
conflict_disclosure
emergency_shutdown
```

`genesis` means `mpgf_genesis` records and any repository-equivalent bootstrap records.

`ledger_transaction` means posted `mpgf_ledger_transactions` records and any repository-equivalent posted accounting transaction records.

`payment_intent` means `mpgf_payment_intents` records and any repository-equivalent payment-intent workflow records.

`contribution` means `mpgf_contributions` records and any repository-equivalent settled contribution records.

`pledge` means `mpgf_pledges` records and any repository-equivalent pledge-only contribution records.

`recurring_contribution_commitment` means `mpgf_recurring_contribution_commitments` records and any repository-equivalent standing monthly contribution-commitment records.

`eligibility_snapshot` means `mpgf_eligibility_snapshots` records and any repository-equivalent eligible-voter snapshot records.

`candidate_set_snapshot` means `mpgf_candidate_set_snapshots` records and any repository-equivalent candidate-set snapshot records.

`sybil_review` means `mpgf_sybil_reviews` records and any repository-equivalent duplicate/sybil review records.

`pool` means pool-proposal and candidate-alternative pool records, including `mpgf_candidate_alternatives` records with pool alternative type where applicable.

`pool_risk_assessment` means `mpgf_pool_risk_assessments` records and any repository-equivalent pool risk assessment records.

`safe_fallback` means `mpgf_safe_fallbacks` records, `config/mpgf/safe-fallbacks.json` entries, and any repository-equivalent safe-fallback registry records.

`refund` means `mpgf_refunds` records and any repository-equivalent refund workflow records.

`receipt` means `mpgf_receipts` records and any repository-equivalent receipt issuance records.

`public_cycle_summary` means `mpgf_public_cycle_summaries` records and any repository-equivalent public summary publication records.

`idempotency_key` means `mpgf_idempotency_keys` records and any repository-equivalent idempotency records for public financial/governance mutations and admin approval actions.

`admin_approval_record` means `mpgf_admin_approval_records` records and any repository-equivalent independent approval records used by the approval matrix.

`governance_judgment` means `mpgf_governance_judgments` records and any repository-equivalent governance judgment records.

`appeal` means `mpgf_appeals` records and any repository-equivalent appeal workflow records.

`conflict_disclosure` means `mpgf_conflict_disclosures` records and any repository-equivalent conflict disclosure records.

`emergency_shutdown` means `mpgf_emergency_shutdowns` records and any repository-equivalent emergency shutdown control records.

Codex may add stricter intermediate statuses but may not remove or bypass required transitions.

Required registry shape:

```json
{
  "objectType": "cycle",
  "statuses": [
    "draft",
    "scheduled",
    "open",
    "emergency_suspended",
    "closed"
  ],
  "transitions": [
    [
      "draft",
      "scheduled"
    ],
    [
      "scheduled",
      "open"
    ],
    [
      "open",
      "closed"
    ]
  ],
  "terminalStatuses": [
    "closed"
  ],
  "emergencyTransitions": [
    [
      "open",
      "emergency_suspended"
    ]
  ]
}
```

Transitions out of `emergency_suspended` must be defined only through the emergency recovery workflow and require Exit emergency shutdown approval.

Required transition function:

```ts
function transitionMpgfState(input: {
  objectType: string;
  objectId: string;
  fromStatus: string;
  toStatus: string;
  actorUserId?: string;
  reason: string;
}): StateTransitionResult;
```

`transitionMpgfState()` must write `mpgf_state_transition_logs` atomically with the status transition or fail the transition. Emergency transitions must also write an operational event and the required admin audit log.

Required discovery functions:

```ts
discoverStatusBearingMpgfObjects(): StatusBearingObject[];

discoverMpgfStatusFields(): StatusField[];

validateMpgfStateMachineCoverage(): StateMachineCoverageResult;

validateMpgfStatusValueRegistry(): StatusValueRegistryValidationResult;

validateMpgfStatusCoverage(): StatusCoverageResult;
```

`validateMpgfStatusCoverage()` must run state-machine coverage and status-value registry coverage together. It fails if any lifecycle status-bearing object lacks a state machine, any non-lifecycle status or status-like value field lacks a registry row, or any status field is mapped to both without a documented lifecycle/value split.

Discovery heuristics:

```txt
database column named status
database column ending in _status
TypeScript enum containing Status
function named transition*
object with workflowStatus
public/admin display of status
```

Tests must cover:

```txt
every lifecycle status-bearing object has machine
every non-lifecycle status or status-like value field has registry row
unknown lifecycle status rejected
unknown status-value enum rejected
unlisted transition rejected
direct status mutation blocked by database constraint, row-level policy, trigger, repository write guard, or service-layer write contract
if database-level blocking is unavailable, validator documents the chosen enforcement layer and tests every MPGF status write path
state transition log written
emergency transition writes audit log
```

---

## 35. RBAC and admin approval authority

Create:

```txt
docs/mpgf/rbac-permission-matrix.md
config/mpgf/rbac-permission-matrix.json
docs/mpgf/rbac-coverage-audit.md
```

Create:

```sql
mpgf_admin_audit_logs (
  id uuid primary key,
  action text not null,
  actor_user_id uuid,
  target_type text not null,
  target_id uuid,
  required_role text,
  approval_record_ids_json jsonb,
  conflict_check_json jsonb,
  trace_id uuid,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

mpgf_admin_approval_records (
  id uuid primary key,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_version text,
  approver_user_id uuid not null,
  approver_role text not null,
  decision text not null,
  status text not null,
  conflict_check_json jsonb not null,
  trace_id uuid,
  rationale text not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
```

Allowed `mpgf_admin_approval_records.decision` values:

```txt
approve
reject
abstain
```

Allowed `mpgf_admin_approval_records.status` values:

```txt
pending
approved
rejected
revoked
expired
```

Every action marked "Audit log = required" in the approval matrix must write `mpgf_admin_audit_logs` or a repository-mapped equivalent before or atomically with the sensitive state change. Missing audit-log persistence fails the action closed.

Independent approval counting rules:

```txt
approval_record_ids_json must reference mpgf_admin_approval_records rows or repository-mapped equivalent approval records
only records with decision = approve and status = approved count toward required approvals
approval records count only for the same action, target_type, target_id, and current target_version where target_version applies
each independent approval must come from a distinct approver_user_id
the approver_role must satisfy the approval matrix role expression or an approved role-alias mapping
conflicted approval records do not count
expired, revoked, rejected, abstain, malformed, wrong-target, wrong-version, or duplicate-user approval records do not count
the sensitive action must fail closed unless the validated approval set satisfies the approval matrix at the moment of mutation
```

Required approval services:

```ts
recordMpgfAdminApproval(
  input
): MpgfAdminApprovalRecord;

validateMpgfAdminApprovalSet(
  input: {
    action: string;
    targetType: string;
    targetId?: string;
    targetVersion?: string;
    requiredAt?: Date;
  }
): AdminApprovalSetValidationResult;
```

If approval counting for a target depends on `target_version`, `validateMpgfAdminApprovalSet()` must receive `targetVersion` or derive it deterministically from the target record at `requiredAt`. If neither is possible, validation fails closed.

Roles:

```txt
public_user
verified_participant
pool_author
SAE
auditor
red_team_reviewer
admin
super_admin
```

Required approval-role aliases:

```txt
payout_admin
legal_reviewer
privacy_reviewer
system_verifier
```

Each approval-role alias must map to:

```txt
existing repository role
new MPGF role
governance judgment authorizer
```

Mapping must appear in:

```txt
docs/mpgf/repo-specific-implementation-map.md
config/mpgf/rbac-permission-matrix.json
```

If a required approval role is unmapped, the corresponding sensitive action is denied by default.

Required approval matrix minimum:

```md
| Action | Required approver role | Independent approvals | Conflict check | Audit log | Trace | Notes |
|---|---|---:|---|---|---|---|
| Activate genesis | super_admin | 1 | required | required | required | Cannot enable real money. |
| Open first cycle | admin | 1 | required | required | required | Requires activated genesis. |
| Approve pool proposal as candidate | admin or auditor | 1 | required | required | optional | Cannot approve own pool. |
| Approve safe fallback alternative | admin + auditor | 2 | required | required | required | Required before fallback can be active. |
| Approve fallback allocation | admin + auditor | 2 | required | required | required | Requires deterministic fallback trace and cap validation. |
| Approve pool risk assessment | auditor or red_team_reviewer | 1 | required | required | required | Required before pool_risk_assessment.status = approved. |
| Approve threat/downside review | auditor or red_team_reviewer | 1 | required | required | required | Disqualifying conflicts block. |
| Approve strong-negative review | auditor or red_team_reviewer | 1 | required | required | required | Required before strong-negative result_status = review_confirmed or review_rejected. |
| Approve recipient accreditation | admin + auditor | 2 | required | required | optional | Required before authorization/payout. |
| Approve recipient compliance review | admin + auditor | 2 | required | required | optional | Required before compliance review can satisfy authorization or payout gates. |
| Review conflict disclosure | auditor | 1 | required | required | required | Reviewer cannot be conflicted; required before reviewed severity or decision affects eligibility, allocation, or approval. |
| Decide appeal | admin + auditor | 2 | required | required | required | Required before appeal decision can change blocking status or trigger correction. |
| Certify allocation | system_verifier + auditor | 1 verifier + 1 auditor | required | required | required | Requires verified certificate. |
| Approve authorization | admin | 1 | required | required | required | Cannot bypass allocation. |
| Release tranche internally | admin + auditor | 2 | required | required | required | Requires milestone review. |
| Approve internal payout authorization | (payout_admin or super_admin) + auditor | 2 | required | required | required | Does not imply external payment. |
| Approve refund | admin + auditor | 2 | required | required | required | Requires refund-policy eligibility and deterministic refund trace before provider submission. |
| Approve automated payout-provider profile | (payout_admin or super_admin) + auditor + legal_reviewer | 3 | required | required | required | Required before automatedPayouts.enabled=true can be active. |
| Record external payment evidence | admin | 1 | required | required | optional | Must be verifiable. |
| Verify external payment evidence | auditor | 1 | required | required | optional | Must be independent from recorder. |
| Enable real-money mode | super_admin | 1 plus all gates | required | required | required | Requires production gates. |
| Emergency shutdown | admin or super_admin | 1 | conflict check not required to trigger | required | required | Must fail closed. |
| Exit emergency shutdown | super_admin + auditor | 2 | required | required | required | Requires emergency resolved. |
| Approve legal claim wording | legal_reviewer | 1 | required | required | optional | Links legal_review_record. |
| Approve privacy profile | privacy_reviewer | 1 | required | required | optional | Required for production. |
| Approve solver support limit change | admin + auditor | 2 | required | required | required | Must not weaken current cycle. |
```

Recorder and verifier must be different users where independent verification is required.

A conflicted user cannot count toward required approvals for relevant action.

Missing approval authority denies action by default.

---

## 36. Appeals and conflicts

Create:

```sql
mpgf_appeals (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  target_type text not null,
  target_id uuid not null,
  appellant_user_id uuid not null,
  appeal_type text not null,
  claim text not null,
  evidence_json jsonb,
  status text not null,
  allocation_effect_classification text,
  decision text,
  decision_rationale text,
  decided_by uuid,
  filing_deadline timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

mpgf_conflict_disclosures (
  id uuid primary key,
  user_id uuid not null,
  cycle_id uuid references mpgf_cycles(id),
  target_type text not null,
  target_id uuid not null,
  role_context text not null,
  conflict_type text not null,
  proposed_severity text not null,
  reviewed_severity text,
  disclosure_text text not null,
  evidence_json jsonb,
  status text not null,
  reviewed_by uuid,
  review_decision text,
  review_rationale text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
```

Allowed `mpgf_appeals.status` values:

```txt
filed
under_review
decided
withdrawn
expired
voided
```

Allowed `mpgf_appeals.decision` values:

```txt
upheld
rejected
partially_upheld
deferred
```

Allowed `mpgf_appeals.allocation_effect_classification` values:

```txt
none
nonblocking
blocking
deferred
```

Allowed `mpgf_conflict_disclosures.status` values:

```txt
submitted
under_review
cleared
conflict_confirmed
mitigated
voided
```

Allowed `mpgf_conflict_disclosures.review_decision` values:

```txt
no_conflict
non_disqualifying_conflict
disqualifying_conflict
mitigation_required
mitigation_accepted
```

Allowed `mpgf_conflict_disclosures.proposed_severity` and `mpgf_conflict_disclosures.reviewed_severity` values:

```txt
none
low
moderate
high
disqualifying
```

For public-summary appeal counts, use only non-withdrawn, non-expired, non-voided appeal records. `blocking` maps to blockingAppealsCount, `nonblocking` and `none` map to nonblockingAppealsCount, and `deferred` maps to deferredAppealsCount.

For allocation and authorization blocking, an appeal is unresolved if `status` is `filed` or `under_review`. An unresolved appeal with `allocation_effect_classification = blocking` blocks the relevant allocation, authorization, tranche, or payout path. A decided appeal blocks only if `decision` is `upheld` or `partially_upheld` and `allocation_effect_classification = blocking`; rejected, withdrawn, expired, voided, and nonblocking appeals do not block except through a separately recorded audit concern or correction rule.

Actions requiring conflict checks fail closed while a relevant conflict disclosure is submitted or under_review, or when reviewed_severity = disqualifying or review_decision = disqualifying_conflict. Cleared, mitigated, or non-disqualifying conflicts may proceed only according to the approval matrix and recorded mitigation evidence.

Appeals cannot directly:

```txt
change certified allocation
change live ballot
release funds
alter E_t or I_t after ballot opening
reverse already released disbursement unless valid void/recovery rule applies
```

Appeals may trigger:

```txt
correction before ballot opening
special review
audit concern
pause of future tranche release
void of undisbursed funds
next-cycle correction
eligibility correction snapshot where constitutionally allowed
```

Conflict severity proposed by discloser is not final. Reviewed severity determines final eligibility.

---

## 37. Legal, privacy, receipt, retention, and production gates

Create:

```sql
mpgf_production_enablement (
  id uuid primary key,
  status text not null,
  environment text not null,
  legal_review_status text not null,
  payment_review_status text not null,
  privacy_review_status text not null,
  retention_policy_status text not null,
  receipt_template_status text not null,
  launch_checklist_status text not null,
  dry_run_status text not null,
  conformance_status text not null,
  deployment_validation_status text not null,
  emergency_shutdown_test_status text not null,
  stripe_mode text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_production_enablement.status` values:

```txt
disabled
test_mode_only
pledge_only
ready_for_real_money_review
real_money_enabled
emergency_disabled
```

Allowed legal, payment, privacy, retention, and receipt review status values:

```txt
not_started
in_review
approved
rejected
expired
```

Allowed launch checklist status values:

```txt
not_started
in_progress
complete
failed
expired
```

Allowed dry-run, conformance, deployment-validation, and emergency-shutdown-test status values:

```txt
not_started
running
passed
failed
expired
```

`MPGF_REAL_MONEY_ENABLED` may be true only when:

```txt
production_enablement.status = real_money_enabled
legal_review_status = approved
payment_review_status = approved
privacy_review_status = approved
retention_policy_status = approved
receipt_template_status = approved
launch_checklist_status = complete
dry_run_status = passed
conformance_status = passed
deployment_validation_status = passed
emergency_shutdown_test_status = passed
```

Create:

```txt
docs/mpgf/legal-configuration-manifest.md
docs/mpgf/payment-production-readiness.md
docs/mpgf/privacy-launch-profile.md
docs/mpgf/receipt-template-approval.md
docs/mpgf/data-retention-policy.md
config/mpgf/data-retention-policy.json
config/mpgf/data-retention-policy.schema.json
docs/mpgf/launch-readiness-report.md
docs/mpgf/production-claims-and-values-registry.md
```

Production value registry must record for every legal/privacy/receipt/refund/retention/jurisdiction/tax/escrow/charitable-status/public-copy value:

```txt
value key
default value
production value
approval status
required approver roles
approval record IDs
affected route/email/receipt/public summary
fallback if unapproved
```

If approval status is not approved, production value is disabled and conservative default applies.

No unknown, unset, or unapproved value may enable real-money mode.

Data retention policy must define:

```txt
policy version
retention category
covered tables and fields
retention duration
redaction behavior
deletion behavior
legal hold behavior
audit-preservation behavior
approval record IDs
conformance rows
```

Retention policy enforcement rules:

```txt
private evidence, payment-provider payloads, verification records, conflict evidence, appeal evidence, sybil-review evidence, recipient-compliance evidence, and payout-destination evidence must have explicit retention categories
financial ledger records, deterministic traces, conformance reports, admin audit logs, and state-transition logs must not be deleted or redacted in a way that destroys required auditability
redaction may remove sensitive private fields only if a non-sensitive audit stub, hash, timestamp, actor where permitted, and reason remain
real-money mode cannot be enabled if config/mpgf/data-retention-policy.json is missing, invalid, unapproved, or inconsistent with privacy/legal review
expired idempotency records may be purged or retained only according to the approved retention policy
```

Required retention services:

```ts
validateMpgfDataRetentionPolicy(): DataRetentionPolicyValidationResult;

applyMpgfDataRetentionPolicy(
  now: Date
): DataRetentionPolicyRunResult;
```

---

## 38. Production-readiness pass order

After Phase A passes, Phase B implementation work may proceed in parallel where safe, but production enablement must follow this gate order:

```txt
1. Conformance source lock
2. Repository adaptation plan
3. Legal/privacy/retention/copy defaults
4. Payment test-mode implementation
5. Solver support profile
6. Planned RBAC/state-machine matrices
7. Preliminary dry-run
8. Generated RBAC/state-machine coverage
9. Final production-equivalent dry-run
10. Payment live-mode readiness
11. Receipt approval
12. Launch readiness report
13. Super-admin production enablement
```

The preliminary dry-run may run before generated RBAC/state-machine coverage is complete.

The final production-equivalent dry-run must run after generated RBAC/state-machine coverage passes.

Real-money mode requires the final production-equivalent dry-run, not merely preliminary dry-run.

---

## 39. Copy and receipt registry

Create:

```txt
config/mpgf/copy-library.json
config/mpgf/copy-policy.schema.json
config/mpgf/receipt-templates.json
config/mpgf/receipt-templates.schema.json
docs/mpgf/copy-placement-matrix.md
docs/mpgf/receipt-template-approval.md
docs/mpgf/production-claims-and-values-registry.md
```

Create:

```sql
mpgf_receipts (
  id uuid primary key,
  contribution_id uuid references mpgf_contributions(id),
  refund_id uuid references mpgf_refunds(id),
  user_id uuid,
  receipt_type text not null,
  status text not null,
  template_version text not null,
  delivery_channel text not null,
  rendered_body_hash text not null,
  metadata_json jsonb,
  issued_at timestamptz,
  sent_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_receipts.status` values:

```txt
draft
issued
sent
failed
voided
```

Allowed `mpgf_receipts.receipt_type` values:

```txt
pledge_acknowledgment
test_payment_receipt
real_money_contribution_receipt
refund_receipt
correction_notice
```

Receipt template rules:

```txt
real-money contribution receipts cannot be issued unless receipt_template_status = approved
receipt templates must be versioned and mapped to contribution mode, receipt_type, jurisdiction/default claim profile, copy policy version, and approval record IDs
pledge acknowledgments and test-payment receipts must clearly state non-real-money status
receipt templates must include approved or conservative-default wording for tax, escrow, charitable status, refund policy, privacy, and allocation/disbursement distinction
receipt templates must not state or imply tax deductibility, escrow, charitable status, or external disbursement unless the production claims-and-values registry has approved that exact claim
rendered receipt bodies are private by default; public summaries may include only aggregate receipt status counts
```

Required receipt services:

```ts
validateMpgfReceiptTemplateRegistry(): ReceiptTemplateRegistryValidationResult;

renderMpgfReceipt(
  input
): RenderedMpgfReceipt;

issueMpgfReceipt(
  input
): MpgfReceipt;

sendMpgfReceipt(
  receiptId
): MpgfReceiptDeliveryResult;
```

Required copy lookup behavior:

```ts
function getMpgfCopy(copyKey: string, context: CopyContext): string {
  const override = findProductionCopyOverride(copyKey, context);

  if (!override) {
    return getConservativeDefaultCopy(copyKey);
  }

  if (!requiredApprovalsPassed(override)) {
    return getConservativeDefaultCopy(copyKey);
  }

  return override.text;
}
```

Approval-sensitive copy categories:

```txt
tax
escrow
charitable status
refund
privacy
receipt
payout
effectiveness
charity-evaluator
legal status
```

Minimum default copy:

```json
{
  "mpgf_plain_language_summary": "The Moral Public Goods Fund is a pilot mechanism for coordinating support for goods that many moral views value.",
  "moral_public_goods_explanation": "A moral public good is something many people value for moral reasons, such as reducing severe poverty, reducing existential risk, or improving animal welfare.",
  "moral_trade_coordination_explanation": "MPGF is intended to help people with different moral views coordinate on shared moral public goods instead of each person acting alone.",
  "pilot_status": "MPGF is currently a pilot mechanism. Some features may operate in pledge-only, test, dry-run, or non-real-money mode until production gates are approved.",
  "non_real_money_status": "This production demo is non-real-money unless the page explicitly says real-money mode has passed all production gates.",
  "pledge_only_explanation": "A pledge-only contribution records your non-real-money intent to support MPGF. It does not charge a payment method.",
  "monthly_pledge_only_explanation": "A monthly pledge-only commitment records a recurring non-real-money pledge. It is not a subscription, charge, donation, or payment.",
  "pool_proposal_explanation": "Pool proposals suggest moral public goods that could be considered by the MPGF mechanism.",
  "ballot_demo_explanation": "Demo ballots let eligible participants test how the mechanism records preferences. They do not authorize real disbursements.",
  "visible_demo_pool_explanation": "Visible demo pools are non-real-money alternatives used to show how the MPGF pilot mechanism works.",
  "not_tax_advice": "This page does not provide tax, legal, financial, or investment advice.",
  "tax_deductibility_disabled_by_default": "Unless this page explicitly says otherwise using legally approved wording, MPGF contributions are not represented as tax-deductible donations.",
  "not_escrow": "Unless this page explicitly says otherwise using legally approved wording, MPGF is not representing that funds are held in legal escrow.",
  "not_charity_evaluator": "MPGF is not a charity evaluator and does not guarantee that any pool is the most effective use of funds.",
  "not_guaranteed_effectiveness": "MPGF does not guarantee outcomes or effectiveness. Public summaries describe the mechanism’s records and assessments, not guaranteed impact.",
  "refund_policy_default": "Refund availability depends on the current contribution mode, payment status, cycle timing, and published refund policy.",
  "privacy_visibility": "Some MPGF records may appear in public summaries after privacy filtering. Private payment identifiers, verification evidence, private ballot identities, private appeal evidence, and private audit evidence are not public by default.",
  "ballot_finality": "After final submission, your ballot is final for this cycle unless a formal correction rule applies.",
  "allocation_not_disbursement": "An allocation or authorization is not the same as an external payment. External payment status is tracked separately.",
  "support_or_access": "For MPGF access or support, use the support route or contact listed on this page."
}
```

Production copy item changing a default legal/tax/refund/privacy/escrow/charity/effectiveness/payout/receipt claim must include:

```txt
copy_policy_version
approved_by_legal_review_id where legally sensitive
approved_by_privacy_review_id where privacy-sensitive
affected route or template
rollback copy key
```

If approvals are missing, conservative default copy is used.

Receipt templates cannot be used in real-money mode unless approved.

---

## 40. Public summaries

Create:

```txt
config/mpgf/public-cycle-summary.schema.json
docs/mpgf/public-cycle-summary-schema.md
```

Create:

```sql
mpgf_public_cycle_summaries (
  id uuid primary key,
  cycle_id uuid references mpgf_cycles(id),
  summary_json jsonb not null,
  publication_status text not null,
  visibility_filter_version text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
```

Allowed `mpgf_public_cycle_summaries.publication_status` values:

```txt
draft
generated
visibility_filtered
validated
published
withdrawn
failed
```

Public summary publication rules:

```txt
generatePublicCycleSummary() creates or updates a draft or generated summary record only for the target cycle and never publishes it
applyMpgfPublicVisibilityFilter() moves a generated summary to visibility_filtered or failed
validateMpgfPublicCycleSummary() moves a visibility_filtered summary to validated or failed
publishMpgfPublicCycleSummary() may publish only a validated summary
published_at is set only when publication_status = published
withdrawn summaries remain audit-visible and must not be deleted
public routes may display only publication_status = published summaries unless an admin/auditor route explicitly requests another status
publication or withdrawal writes an admin audit log and state-transition log
```

Required services:

```ts
generatePublicCycleSummary(
  cycleId
): PublicCycleSummary;

applyMpgfPublicVisibilityFilter(
  summaryDraft
): PublicCycleSummary;

validateMpgfPublicCycleSummary(
  summary
): PublicCycleSummaryValidationResult;

publishMpgfPublicCycleSummary(
  cycleId
): PublicCycleSummary;
```

`validateMpgfPublicCycleSummary()` must validate against `config/mpgf/public-cycle-summary.schema.json` after the visibility filter is applied and before publication.

Canonical public summary schema:

```json
{
  "summarySchemaVersion": "mpgf-public-cycle-summary-v0.3",
  "cycle": {
    "cycleId": "",
    "cycleKey": "",
    "stage": "",
    "status": "",
    "formalMechanismVersion": "",
    "protocolVersion": "",
    "thetaVersion": "",
    "publishedAt": ""
  },
  "mode": {
    "featureEnabled": false,
    "realMoneyEnabled": false,
    "completionProfile": "",
    "productionEnablementStatus": ""
  },
  "budget": {
    "currency": "usd",
    "budgetCents": "0",
    "lockedBudgetCents": "0",
    "carryoverInCents": "0",
    "carryoverOutCents": "0"
  },
  "nonRealMoney": {
    "pledgedCents": "0",
    "recurringPledgeMonthlyCents": "0",
    "testContributionCents": "0",
    "testBudgetCents": "0"
  },
  "participation": {
    "eligibleVoterCount": 0,
    "validVoterCount": 0,
    "eligibleWeightUnits": "0",
    "validVoterWeightUnits": "0",
    "quorumPass": false,
    "quorumReason": ""
  },
  "allocationOutcome": {
    "outcomeType": "",
    "allocationPlanStatus": "",
    "solverVerificationStatus": "",
    "fallbackType": "",
    "ordinaryAllocationUsed": false
  },
  "amountsByState": {
    "authorizedCents": "0",
    "releasedInternalCents": "0",
    "payoutAuthorizedCents": "0",
    "externallyPaidCents": "0",
    "paymentFailedCents": "0",
    "voidedCents": "0",
    "carriedOverCents": "0"
  },
  "fundedAlternatives": [],
  "fallbackAllocations": [],
  "strongNegativeResults": [],
  "riskSummary": [],
  "auditSummary": {
    "auditStatus": "",
    "blockingConcerns": [],
    "nonblockingConcerns": []
  },
  "incidents": [],
  "appeals": {
    "blockingAppealsCount": 0,
    "nonblockingAppealsCount": 0,
    "deferredAppealsCount": 0
  },
  "privacy": {
    "visibilityFilterVersion": "",
    "privateFieldsExcluded": []
  },
  "disclaimers": {
    "pilotStatus": "",
    "taxStatus": "",
    "charityEvaluatorStatus": "",
    "effectivenessStatus": "",
    "escrowStatus": "",
    "refundStatus": "",
    "privacyStatus": "",
    "ballotFinalityStatus": "",
    "allocationDisbursementStatus": ""
  }
}
```

Allowed `allocationOutcome.outcomeType` values:

```txt
ordinary_allocation
failed_quorum_fallback
emergency_suspension_fallback
constitutional_infeasibility_fallback
carryover_only
shadow_only
failed_certification
```

Public summaries must exclude:

```txt
private ballot identities
raw payment IDs
verification evidence
private conflict disclosures
private appeal evidence
private audit evidence
sybil-review evidence
recipient-compliance evidence
private recipient profile fields
recipient payout destination details
```

Public summaries must separate pledge-only, monthly recurring pledge-only, and test-mode amounts from real-money budget and disbursement states. `nonRealMoney.pledgedCents`, `nonRealMoney.recurringPledgeMonthlyCents`, `nonRealMoney.testContributionCents`, and `nonRealMoney.testBudgetCents` must never be added to `budget.budgetCents`, `budget.lockedBudgetCents`, or any `amountsByState` field for real-money accounting.

---

## 41. Security, secrets, validation, and rate limits

Required config type:

```ts
type MpgfServerConfig = {
  FEATURE_MPGF_ENABLED: boolean;
  MPGF_REAL_MONEY_ENABLED: boolean;
  MPGF_ENV: "local" | "test" | "staging" | "production";
  MPGF_PUBLIC_BASE_URL: string;
  MPGF_CANONICAL_HOST: string;
  MPGF_DIRECT_WORKING_BOOTSTRAP_ENABLED: boolean;
  MPGF_WWW_SMOKE_TEST_ENABLED?: boolean;
  MPGF_PARTICIPANT_ONBOARDING_ENABLED?: boolean;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  MPGF_ADMIN_BOOTSTRAP_SECRET?: string;
  MPGF_WWW_SMOKE_TEST_AUTH_SECRET?: string;
  MPGF_ENCRYPTION_KEY_ID?: string;
  MPGF_EMAIL_PROVIDER_SECRET?: string;
  MPGF_DEFAULT_TIMEZONE: string;
};
```

Production domain defaults for moraltrade.org:

```txt
MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
MPGF_CANONICAL_HOST = www.moraltrade.org
```

Production direct-working defaults for moraltrade.org:

```txt
MPGF_ENV = production
FEATURE_MPGF_ENABLED = true
MPGF_REAL_MONEY_ENABLED = false
MPGF_DIRECT_WORKING_BOOTSTRAP_ENABLED = true until demo_complete passes for the production-domain evaluation; after demo_complete it may be false only if direct-working fixtures and the visible non-real-money cycle remain verifiable without bootstrap repair
MPGF_WWW_SMOKE_TEST_ENABLED = true during production-domain demo_complete, exact_pilot_complete, real_money_complete, or any production-domain verification run that requires a smoke-test session; it may be false only when no such verification run is active
MPGF_PARTICIPANT_ONBOARDING_ENABLED = true whenever ordinary participant onboarding is the approved production-domain access path or a production-domain participant journey verification is running; it may be false only if repo-adaptation-map documents an approved private-beta or preexisting-participant access gate and runMpgfWwwParticipantJourneyVerification() still passes
```

Create:

```txt
config/mpgf/rate-limits.json
config/mpgf/rate-limits.schema.json
```

Create:

```sql
mpgf_idempotency_keys (
  id uuid primary key,
  scope text not null,
  idempotency_key text not null,
  actor_user_id uuid,
  action text not null,
  cycle_id uuid references mpgf_cycles(id),
  request_hash text not null,
  response_reference_json jsonb,
  status text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(scope, idempotency_key)
);
```

Allowed `mpgf_idempotency_keys.status` values:

```txt
received
completed
failed
conflict
expired
```

Default rate-limit policy:

```json
{
  "publicReadPerIpPerMinute": 120,
  "contributionAttemptsPerUserPerHour": 30,
  "contributionAttemptsPerIpPerHour": 100,
  "pledgesPerUserPerHour": 30,
  "poolProposalSubmissionsPerUserPerDay": 10,
  "ballotDraftSavesPerUserPerHour": 120,
  "ballotFinalSubmissionsPerUserPerCycle": 1,
  "appealsPerUserPerCycle": 10,
  "adminMutationsPerAdminPerHour": 120,
  "publicSummaryCacheSeconds": 60,
  "webhookIdempotencyWindowDays": 30
}
```

Required services:

```ts
loadMpgfServerConfig(): MpgfServerConfig;

validateMpgfServerConfig(
  config
): ConfigValidationResult;

redactMpgfSecrets(input): RedactedOutput;

rotateMpgfSecret(secretType): SecretRotationRecord;

enforceMpgfRateLimit(
  ruleKey: string,
  actorKey: string
): RateLimitResult;
```

Secrets must never appear in:

```txt
client-side bundles
public environment variables
logs
deterministic traces
conformance reports
public cycle summaries
error messages
generated docs
```

Encryption and sensitive-field rules:

```txt
MPGF_ENCRYPTION_KEY_ID is optional only for local/test/direct-working modes that persist no real payment-provider identifiers and no private evidence beyond demo fixtures
MPGF_ENCRYPTION_KEY_ID is required when MPGF_REAL_MONEY_ENABLED=true
MPGF_ENCRYPTION_KEY_ID is required before persisting real payment-provider identifiers, raw webhook payloads, refund provider IDs, external payment references, recipient private profiles, recipient payout destination details, verification evidence, terms evidence, sybil-review evidence, conflict evidence, appeal evidence, private audit evidence, compliance evidence, or private payout evidence
if encryption configuration is missing for an enabled sensitive workflow, that workflow fails closed while pledge-only and non-sensitive public routes may continue
encrypted fields must be redacted from logs, deterministic traces, conformance reports, public summaries, and generated docs
```

`MPGF_WWW_SMOKE_TEST_AUTH_SECRET` constraints:

```txt
server-only
required only when MPGF_WWW_SMOKE_TEST_ENABLED = true and the selected www smoke-test profile authMode requires a verifier token
scoped only to establishing the production MPGF smoke-test session
cannot create public real users
cannot create real-money eligibility
cannot grant admin permissions
cannot bypass MPGF route/action validation
expires or rotates according to config/mpgf/www-smoke-test-profile.json
hashed at rest if persisted
redacted from logs, traces, conformance reports, public summaries, and generated docs
```

Server-side validation required for every public/admin submission.

Reject:

```txt
NaN
Infinity
negative money amounts where not explicitly allowed
unknown enum values
invalid status transitions
unapproved legal claims
unapproved payment/payout actions
```

Rate-limit rules:

```txt
rate limits must fail closed for public and admin mutations
webhooks are protected by signature verification and idempotency before rate limiting
ballot final submission remains immutable even if a duplicate request is allowed through idempotency
public read routes may serve cached summaries when rate limited
rate-limit events with security relevance create operational events
```

Mutation idempotency rules:

```txt
create payment intent requires idempotency key
create pledge requires idempotency key
create recurring contribution commitment requires idempotency key
pause, resume, and cancel recurring contribution commitment require idempotency key
materialize recurring pledge for cycle requires idempotency key scoped to commitment and cycle
convert pledge to payment intent requires idempotency key
submit pool proposal requires idempotency key
save ballot draft may reuse stable draft identity but final submission requires idempotency key
submit ballot final requires idempotency key scoped to user and cycle
create dry-run requires idempotency key
admin approval actions require idempotency key
idempotency scope includes actor, action, and cycle where applicable
request hash is stored separately inside the scoped idempotency record
same key and same request hash returns the same result or response reference
same key and different request hash fails as conflict
expired idempotency keys cannot be reused for a different request without explicit retention policy
```

---

## 42. Notifications and operational events

Create:

```sql
mpgf_notifications (
  id uuid primary key,
  user_id uuid not null,
  cycle_id uuid references mpgf_cycles(id),
  notification_type text not null,
  channel text not null,
  subject text not null,
  body text not null,
  status text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now()
);

mpgf_operational_events (
  id uuid primary key,
  event_type text not null,
  severity text not null,
  cycle_id uuid references mpgf_cycles(id),
  related_type text,
  related_id uuid,
  message text not null,
  metadata_json jsonb,
  status text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
```

Allowed `mpgf_notifications.status` values:

```txt
queued
sent
failed
cancelled
```

Severity values:

```txt
info
warning
critical
emergency
```

Allowed `mpgf_operational_events.status` values:

```txt
open
acknowledged
resolved
dismissed
```

Required critical alerts include:

```txt
Stripe webhook signature verification failure
duplicate webhook event anomaly
payment succeeded but ledger transaction missing
ledger imbalance
refund failed
chargeback/dispute received
solver certification failure
certificate verifier failure
allocation attempted without verified certificate
failed quorum triggered
fallback cap violation attempted
threat-prohibited pool authorization attempted
downside-prohibited pool authorization attempted
strong-negative-filtered pool authorization attempted
launch checklist bypass attempted
MPGF_REAL_MONEY_ENABLED changed
emergency shutdown triggered
RBAC violation attempt
public visibility filter failure
conformance report unresolved_count > 0
state-machine invalid transition attempted
```

---

## 43. Dry-run mode

Create:

```sql
mpgf_dry_run_cycles (
  id uuid primary key,
  source_cycle_id uuid references mpgf_cycles(id),
  label text not null,
  status text not null,
  dry_run_config_json jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
```

Allowed `mpgf_dry_run_cycles.status` values:

```txt
draft
running
passed
failed
cancelled
```

Required dry-run result shape:

```ts
type DryRunResult = {
  dryRunCycleId: string;
  passed: boolean;
  completedAt: string;
  scenarioResults: {
    scenario: string;
    passed: boolean;
    evidence: string;
    blockers: string[];
  }[];
  prohibitedMutationChecks: {
    check: string;
    passed: boolean;
    evidence: string;
  }[];
  outputSummaryReference: string;
  blockers: string[];
};
```

Required services:

```ts
createMpgfDryRunCycle(input): DryRunCycle;

runMpgfDryRunCycle(
  dryRunCycleId
): DryRunResult;

compareMpgfDryRunToLive(
  dryRunCycleId,
  cycleId
): DryRunComparison;
```

Dry-run cannot:

```txt
create real payment intents
create real contributions
mutate live ledger
mutate live eligibility snapshots
publish public summaries as live
create live authorizations
release tranches
```

Real-money mode requires at least one final production-equivalent dry-run to pass with real-money disabled.

Final production-equivalent dry-run definition:

```txt
uses production-equivalent code paths
uses production-equivalent RBAC/state-machine/config validation
uses approved production copy defaults or approved overrides
uses payment-provider test mode or simulated provider fixtures only
uses automated payout adapter disabled unless approved automated profile exists in the dry_run fixture
uses real-money disabled
does not write live ledger, live eligibility snapshots, live authorizations, live payout authorizations, or live public summaries
records scenario results and prohibited-mutation checks in DryRunResult
```

Required scenarios:

```txt
happy path
failed quorum
solver failure
certified infeasibility
threat-prohibited pool
strong-negative-filtered pool
payment/refund test event
blocking appeal
conflict disqualification
public visibility filtering
emergency shutdown
neutral ballot
constant-support ballot
declining-support ballot
negative ballot
invalid over-budget ballot
custom breakpoint ballot
```

---

## 44. Deployment environment

Create:

```txt
docs/mpgf/deployment-environment.md
docs/mpgf/production-deployment-prerequisites.md
config/mpgf/production-deployment-target.json
config/mpgf/production-deployment-target.schema.json
```

Environments:

```txt
local
test
staging
production
```

Required validation function:

```ts
validateMpgfDeploymentEnvironment(
  mode?: "pre_launch" | "completion_gate"
): DeploymentValidationResult;
```

Production-domain deployment validation consumes `config/mpgf/production-deployment-target.json`, `docs/mpgf/production-deployment-prerequisites.md`, the active server configuration, deployment-provider or CI metadata, and canonical-domain evidence. It must not infer a production deployment target solely from the current URL or from mutable application state.

For production moraltrade.org pre-launch deployment validation, `validateMpgfDeploymentEnvironment("pre_launch")` must verify:

```txt
MPGF_ENV = production
MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
MPGF_CANONICAL_HOST = www.moraltrade.org
FEATURE_MPGF_ENABLED = true for production-domain direct-working evaluation
MPGF_REAL_MONEY_ENABLED = false until real_money_complete passes
MPGF_WWW_SMOKE_TEST_ENABLED = true during production-domain demo_complete, exact_pilot_complete, real_money_complete, or any production-domain verification run that requires a smoke-test session
MPGF_PARTICIPANT_ONBOARDING_ENABLED = true whenever ordinary participant onboarding is the approved production-domain access path or a production-domain participant journey verification is running, unless repo-adaptation-map documents an approved private-beta or preexisting-participant access gate and runMpgfWwwParticipantJourneyVerification() still passes
production deployment target config validates
production deployment prerequisites validate before production-domain demo_complete
deployment provider/project evidence matches the target config
canonical domain binding points to the target production project
deployed commit SHA or build ID is known
valid HTTPS certificate is served for www.moraltrade.org
canonical-host redirects do not break /mpgf routes
public MPGF routes are served from the canonical www host
config/mpgf/www-smoke-test-profile.json validates
config/mpgf/production-auth-session-profile.json validates
config/mpgf/participant-onboarding-profile.json validates
config/mpgf/public-experience-profile.json validates
production smoke-test auth/session path validates
ordinary participant onboarding path validates
real-money, automated payout, external payout, and live authorization actions remain disabled in production direct-working mode
```

`runMpgfProductionDirectWorkingLaunch()` must use `validateMpgfDeploymentEnvironment("pre_launch")` for `preLaunchEnvironmentValidationResult`. Pre-launch deployment validation must not call or require `runMpgfProductionDirectWorkingLaunch()`, `runMpgfWwwDirectWorkingVerification()`, `runMpgfWwwAuthSessionVerification()`, `runMpgfWwwPublicExperienceVerification()`, `runMpgfWwwParticipantJourneyVerification()`, or completion-profile publication to have already passed.

For production-domain `demo_complete`, `validateMpgfDeploymentEnvironment("completion_gate")` must require already-produced evidence that:

```txt
runMpgfProductionDirectWorkingLaunch() passed
runMpgfWwwAuthSessionVerification("https://www.moraltrade.org") passed
runMpgfWwwPublicExperienceVerification("https://www.moraltrade.org") passed
runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org") passed
runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org") passed
```

The completion-gate deployment validation result must be recorded only in completion evidence after the production-domain launch, auth/session, public-experience, participant-journey, and www direct-working verification artifacts have been produced. It must not be used as an input to `docs/mpgf/www-direct-working-verification.md`.

Startup fails closed if:

```txt
required secret for an enabled MPGF capability is missing
secret appears in public namespace
production uses test key while real-money enabled
real-money enabled without launch checklist
real-money enabled without legal/payment/privacy/retention/receipt approval
real-money enabled without conformance_status = passed
real-money enabled without deployment_validation_status = passed
real-money enabled without emergency_shutdown_test_status = passed
required migrations for the main app or an enabled MPGF capability are unapplied
MPGF_REAL_MONEY_ENABLED = true and genesis not activated
```

MPGF-disabled startup must not require MPGF-specific secrets.

MPGF-disabled startup must not require MPGF-specific migrations.

If `FEATURE_MPGF_ENABLED=true` and `MPGF_REAL_MONEY_ENABLED=false`, startup must allow pledge-only/direct-working mode without live payment-provider secrets.

If `FEATURE_MPGF_ENABLED=false`, the main site may start even if genesis is not activated.

If `FEATURE_MPGF_ENABLED=true` and genesis is not activated:

```txt
public MPGF live-cycle routes are disabled
admin genesis setup route may remain available
real-money mode is disabled
```

---

## 45. Completion profiles

Create:

```sql
mpgf_completion_profiles (
  id uuid primary key,
  profile text not null,
  status text not null,
  evidence_json jsonb not null,
  conformance_report_id uuid references mpgf_conformance_reports(id),
  normalization_report_path text,
  dry_run_report_path text,
  launch_readiness_report_path text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
```

Create:

```txt
docs/mpgf/completion-profile-evidence-schema.md
config/mpgf/completion-profile-evidence.schema.json
docs/mpgf/phase-c-gate-report.md
docs/mpgf/production-direct-working-launch-runbook.md
docs/mpgf/production-deployment-prerequisites.md
docs/mpgf/www-auth-session-verification.md
docs/mpgf/www-exact-pilot-dry-run-verification.md
docs/mpgf/www-participant-journey-verification.md
docs/mpgf/www-public-experience-verification.md
docs/mpgf/www-production-health-monitor.md
```

Allowed `mpgf_completion_profiles.profile` values:

```txt
demo_complete
exact_pilot_complete
real_money_complete
```

Allowed `mpgf_completion_profiles.status` values:

```txt
not_started
in_progress
blocked
passed
revoked
```

Required services:

```ts
computeMpgfCompletionProfile(): CompletionProfileResult;

publishMpgfCompletionProfile(
  profile
): CompletionProfilePublication;

revokeMpgfCompletionProfile(
  profile,
  reason
): CompletionProfileRevocation;

validateCompletionProfileEvidence(
  profile: "demo_complete" | "exact_pilot_complete" | "real_money_complete",
  evidenceJson
): CompletionEvidenceValidationResult;
```

Completion evidence schemas must use a shared evidence envelope:

```txt
profile
status
evaluatedEnvironment
evaluatedBaseUrl
productionDomainEvaluation
deployedCommitShaOrBuildId when productionDomainEvaluation = true
evidenceGeneratedAt
validatorName
validatorVersion
instructionArtifactPath
instructionArtifactHash
evidenceArtifacts with artifact ID, path or record ID, artifact type, artifactHash, producedAt, and deployedCommitShaOrBuildId when productionDomainEvaluation = true
gateResults with gate ID or acceptance ID, status, evidence artifact ID, blocker if failed, and reviewer if manual
blockers
```

`instructionArtifactHash` and `evidenceArtifacts[].artifactHash` must use the canonical MPGF hash rule. `validateCompletionProfileEvidence()` must fail if production-domain evidence artifacts disagree about `evaluatedBaseUrl`, deployed commit SHA or build ID, target completion profile, or generated timestamp ordering, if any required production-domain artifact is missing from `evidenceArtifacts`, or if any referenced artifact hash is missing or mismatches the artifact bytes/record serialization available to the validator.

For production-domain `demo_complete`, completion evidence must include the completion-gate deployment environment validation result from `validateMpgfDeploymentEnvironment("completion_gate")`, produced after production direct-working launch, www auth/session verification, www public-experience verification, www participant-journey verification, and www direct-working verification have produced evidence.

Completion evidence schemas must require:

```txt
demo_complete: direct-working smoke test result, production deployment target validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, production deployment prerequisite validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, production direct-working launch result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, production auth/session profile validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, www auth/session verification result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, participant onboarding profile validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, public experience profile validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, www public experience verification result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, www participant journey verification result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, www production health-check result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, www smoke-test profile validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, www direct-working verification result with deployed commit SHA or build ID when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, completion-gate deployment environment validation result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, public informational page result, pool proposal result, ballot drafting result, pledge/test flow result, dry-run mode result, no-live-allocation-claim check, no-real-money-enabled check, and mechanical-normalization report.
exact_pilot_complete: demo_complete profile reference, exact solver demo certificate result, solver benchmark report, active solver support profile, benchmark-support validation result, active protocol parameter validation result, status-value registry coverage result, certified allocation path result, fallback path result, generated RBAC/state-machine coverage reports, conformance report with unresolved_count = 0, final production-equivalent dry-run report, www exact-pilot dry-run verification result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, and passed Phase C gate report.
real_money_complete: exact_pilot_complete profile reference, production_enablement record, legal gate result, payment gate result, privacy gate result, receipt gate result, retention gate result, launch gate result, deployment gate result, final production-equivalent dry-run report, www post-launch monitor result when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org, emergency shutdown test result, and super_admin production-enablement approval.
```

`demo_complete` may pass only if:

```txt
direct-working smoke test passed
production deployment target validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production deployment prerequisite validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production direct-working launch passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production auth/session profile validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www auth/session verification passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
participant onboarding profile validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
public experience profile validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www public experience verification passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www participant journey verification passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www production health check passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www smoke-test profile validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www direct-working verification passed with deployed commit SHA or build ID when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
completion-gate deployment environment validation passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
public informational pages work
pool proposals work
ballot drafting works
pledge/test flows work
dry-run mode works
no live ordinary allocation is claimed
no real-money mode is enabled
mechanical normalization passed
```

`exact_pilot_complete` may pass only if:

```txt
demo_complete passed
exact solver demo certificate passed
solver benchmark report exists and supports active limits
active solver support profile is benchmark-supported or stricter
certified allocation path exists
fallback path exists
generated RBAC/state-machine coverage passed
active protocol parameter validation passed
status-value registry coverage passed
conformance unresolved_count = 0
final production-equivalent dry-run passed
www exact-pilot dry-run verification passed when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
all current Phase C gates passed
```

`real_money_complete` may pass only if:

```txt
exact_pilot_complete passed
legal gate passed
payment gate passed
privacy gate passed
receipt gate passed
retention gate passed
launch gate passed
deployment gate passed
final production-equivalent dry-run passed
www post-launch monitor has no unresolved critical production-domain MPGF incident for the configured observation window when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
emergency shutdown tested
super_admin approved production enablement
```

Completion profile can be revoked if later conformance, legal, payment, privacy, deployment, or security gates fail.

---

## 46. Public routes

Public routes:

```txt
/mpgf
/mpgf/about
/mpgf/contribute
/mpgf/contribute/success
/mpgf/contribute/cancel
/mpgf/account/contributions
/mpgf/pools
/mpgf/pools/[poolId]
/mpgf/pools/new
/mpgf/ballot/[cycleId]
/mpgf/cycles/[cycleId]
/mpgf/technical-spec
```

Admin routes:

```txt
/mpgf/admin
/mpgf/admin/genesis
/mpgf/admin/cycles
/mpgf/admin/pools
/mpgf/admin/recipients
/mpgf/admin/payments
/mpgf/admin/refunds
/mpgf/admin/payouts
/mpgf/admin/allocations
/mpgf/admin/audits
/mpgf/admin/launch
/mpgf/admin/legal
/mpgf/admin/incidents
/mpgf/admin/conformance
/mpgf/admin/rbac
/mpgf/admin/state-machines
/mpgf/admin/settings
```

A logged-in user must be able to:

```txt
view current active MPGF cycle
see pilot/test/real-money/pledge-only status
contribute in allowed mode
create monthly pledge-only recurring commitment in direct-working mode
view contribution status
view, pause, resume, and cancel own recurring contribution commitments
submit pool proposal
submit bounded marginal-value ballot
view public cycle summaries
view own contribution/carryover/allocation/authorization/refund status
```

Route readiness rules:

```txt
every public route renders a loading, empty, unavailable, or working state without server error when FEATURE_MPGF_ENABLED=true and MPGF_REAL_MONEY_ENABLED=false
every listed route has a repository-mapped page, route handler, server action, or API contract
public MPGF action routes that require authentication expose the repository's existing sign-in/sign-up entrypoint or equivalent auth prompt with return-to-MPGF behavior
every mutation route/action performs server-side validation, RBAC where applicable, rate limiting, idempotency where applicable, audit logging, and state-machine validation
admin routes require authenticated admin access and never expose secrets
missing optional provider integrations show disabled/gated states rather than breaking public routes
```

---

## 47. Accessibility, timezone, and i18n

Target WCAG 2.2 AA for public MPGF pages and key admin workflows.

Requirements:

```txt
contribution flow usable at 375px width
ballot flow supports keyboard navigation
visible focus states
screen-reader labels
non-color-only indicators
accessible error messages
save draft
review screen before final submission
confirmation before final submission
numeric-only ballot completion possible
advanced graphical curve editor optional only
```

Timezone rules:

```txt
all stored timestamps UTC
all evidence, validation, report, and result timestamps are RFC 3339 strings with explicit UTC `Z` offset unless stored in a database timestamptz column
date-only fields such as date_adopted use ISO 8601 YYYY-MM-DD
every cycle calendar has explicit IANA timezone
default America/Los_Angeles
deadline comparisons use UTC
browser-local time never determines formal deadlines
user-facing times show date, time, and timezone
DST ambiguous/nonexistent local times handled deterministically
locale formatting never changes formal values
currency storage uses integer minor units
```

---

## 48. Advance-coding order

Codex must implement advance scaffolding in this order unless repository architecture requires documented deviation:

```txt
1. Phase 0 canonicalization validators
2. stable acceptance/conformance validators
3. formal source-locator extractor
4. repo-adaptation map validator
5. state-machine registry and discovery validator
6. status-value registry validator
7. protocol-parameter registry schema and seed non-real-money protocol parameters
8. ledger template registry schema and seed templates
9. safe-fallback registry schema and seed safe-fallback records, or explicit carryover-only empty registry
10. direct-working bootstrap schema, deterministic fixture registry, www smoke-test profile, public experience profile, production deployment target schema, production direct-working launch runbook, and smoke-test plan
11. copy registry and receipt-template registry
12. payout-provider profile schema and disabled-by-default interface contract
13. solver benchmark harness plan, support profile schema, and benchmark fixtures
```

After Phase 0 passes and before Phase A passes, Codex may create only validators, schemas, config stubs, seed profiles, planning documents, and non-live interfaces needed to validate Phase A gates. Codex may not create live routes, migrations, payment flows, allocation services, payout services, UI, or repository feature implementation until Phase A passes.

Ledger persistence/services, payout adapter implementation, and solver benchmark execution are Phase B implementation work after Phase A passes.

Reason:

```txt
first validate instruction artifact
then validate formal coverage
then validate repo mapping
then validate lifecycle/state coverage
then implement domain subsystems
```

---

## 49. Phase A gates

Before Phase B, Codex must verify:

```txt
Phase 0 passed
formal mechanism source lock passed
formal-mechanism.raw.md contains complete newest mechanism verbatim
formal-mechanism.md embeds stable MPGF-SRC IDs wherever possible
source-locator extraction report exists
manual locator supplement exists
formal conformance matrix includes Source ID / locator column
every embedded source ID maps to conformance row
every provisional/manual locator maps or increases unresolved_count
contradiction-resolution table has zero unresolved conflicts
specification-completion register has zero unresolved items
repository capability inventory exists
every MPGF subsystem has adapter decision
repo-adaptation map passes
config/mpgf/protocol-parameters.schema.json exists
config/mpgf/protocol-parameters.json exists
docs/mpgf/protocol-parameter-registry.md exists
validateMpgfProtocolParameters() passes for the active non-real-money pilot snapshot
config/mpgf/status-value-registry.schema.json exists
config/mpgf/status-value-registry.json exists
validateMpgfStatusValueRegistry() passes
ledger transaction templates exist and validate
config/mpgf/safe-fallbacks.schema.json exists and validateSafeFallbackRegistry() passes
config/mpgf/direct-working-bootstrap.json exists
config/mpgf/direct-working-bootstrap.schema.json exists
config/mpgf/direct-working-fixtures.json exists
config/mpgf/direct-working-fixtures.schema.json exists
validateMpgfDirectWorkingFixtures() passes
config/mpgf/www-smoke-test-profile.json exists
config/mpgf/www-smoke-test-profile.schema.json exists
validateMpgfWwwSmokeTestProfile() passes
config/mpgf/production-auth-session-profile.json exists
config/mpgf/production-auth-session-profile.schema.json exists
validateMpgfProductionAuthSessionProfile() passes
config/mpgf/participant-onboarding-profile.json exists
config/mpgf/participant-onboarding-profile.schema.json exists
validateMpgfParticipantOnboardingProfile() passes
config/mpgf/public-experience-profile.json exists
config/mpgf/public-experience-profile.schema.json exists
validateMpgfPublicExperienceProfile() passes
config/mpgf/www-production-health-checks.json exists
config/mpgf/www-production-health-checks.schema.json exists
validateMpgfWwwProductionHealthChecks() passes
config/mpgf/production-deployment-target.json exists
config/mpgf/production-deployment-target.schema.json exists
validateMpgfProductionDeploymentTarget() passes
docs/mpgf/direct-working-smoke-test.md exists
docs/mpgf/www-direct-working-verification.md exists
docs/mpgf/www-auth-session-verification.md exists
docs/mpgf/www-exact-pilot-dry-run-verification.md exists
docs/mpgf/www-participant-journey-verification.md exists
docs/mpgf/www-public-experience-verification.md exists
docs/mpgf/www-production-health-monitor.md exists
docs/mpgf/production-deployment-prerequisites.md exists
docs/mpgf/production-direct-working-launch-runbook.md exists
config/mpgf/refund-policy.schema.json exists
config/mpgf/refund-policy.json exists
docs/mpgf/refund-policy.md exists
config/mpgf/receipt-templates.json exists
config/mpgf/receipt-templates.schema.json exists
config/mpgf/payout-provider-profile.json exists
config/mpgf/payout-provider-profile.schema.json exists
config/mpgf/public-cycle-summary.schema.json exists
docs/mpgf/public-cycle-summary-schema.md exists
config/mpgf/data-retention-policy.json exists
config/mpgf/data-retention-policy.schema.json exists
solver support profile exists
legal/privacy launch profile exists
planned RBAC matrix exists
planned state-machine table exists
```

If any item fails:

```txt
Phase A fails
Codex writes blocker to docs/mpgf/pre-implementation-gap-report.md
Codex writes blocker to latest mpgf_conformance_reports row
Codex must not begin dependent Phase B implementation
```

---

## 50. Phase C gates

Before Codex marks MPGF `exact_pilot_complete` or `real_money_complete`, verify:

```txt
generated RBAC coverage tests inspect actual artifacts and pass
generated state-machine coverage tests inspect actual artifacts and pass
generated status-value registry coverage tests inspect actual status fields and pass
active protocol parameters validate and match active cycle versions
direct-working smoke test passes in non-real-money mode
www smoke-test profile validates when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production auth/session profile validates when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www auth/session verification passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
participant onboarding profile validates when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
public experience profile validates when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www public experience verification passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production deployment target validates when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production deployment prerequisites validate when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production direct-working launch passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www participant journey verification passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www production health check passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www direct-working verification passes with deployed commit SHA or build ID when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
status-bearing object discovery report exists
every discovered lifecycle status-bearing object maps to state-machines.json
every discovered non-lifecycle status or status-like value field maps to status-value-registry.json
repo-specific implementation map covers every actual MPGF artifact
formal conformance unresolved_count = 0
exact solver demo certificate passes
solver benchmark report exists and supports active limits
final production-equivalent dry-run passes
www exact-pilot dry-run verification passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
www post-launch monitor has no unresolved critical production-domain MPGF incident when target completion profile is real_money_complete and (evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org)
completion-gate deployment environment validation passes when evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org
production enablement deployment gate passes when target completion profile is real_money_complete
obsolete-text global search passes
public summaries pass privacy filter
public summaries validate against config/mpgf/public-cycle-summary.schema.json
public summary publication state machine coverage passes
production-sensitive copy overrides have approval IDs or fall back to defaults
validateMpgfReceiptTemplateRegistry() passes for every enabled contribution mode
automated payouts disabled unless approved automated payout-provider profile has `automatedPayouts.enabled=true`
validateMpgfPayoutProviderProfile() passes for the active payout-provider profile
active solver support profile is benchmark-supported or stricter
validateMpgfDataRetentionPolicy() passes for every enabled mode
MPGF encryption configuration validates for every enabled sensitive workflow
```

Codex must write:

```txt
docs/mpgf/phase-c-gate-report.md
```

The Phase C gate report must record target completion profile, evaluated environment, gate result for every Phase C item, evidence path or record ID for every passed item, blocker for every failed item, reviewer, and generated timestamp.

---

## 51. Final acceptance criteria

The final stable acceptance-criteria section must include at least the following.

```txt
AC-NORMALIZATION-001. Phase 0 must pass before Phase A begins.
AC-NORMALIZATION-002. docs/mpgf/codex-build-instruction-final.md contains only operative final instructions and no patch scaffolding.
AC-NORMALIZATION-003. Every file path appears on its own line.
AC-NORMALIZATION-004. Every route appears on its own line.
AC-NORMALIZATION-005. Every enum, checklist item, fixture, service, field, and acceptance criterion appears on its own line.
AC-NORMALIZATION-006. Every SQL-like schema declaration is cleanly formatted.
AC-NORMALIZATION-007. Every TypeScript signature appears on its own line.
AC-NORMALIZATION-008. Every JSON block is valid formatted JSON.
AC-NORMALIZATION-009. Every Markdown table is valid and has one row per mechanism item.
AC-NORMALIZATION-010. Every formula appears exactly once in clean LaTeX.
AC-NORMALIZATION-011. No duplicated rendered/plaintext/math variants of the same formula remain.
AC-NORMALIZATION-012. validateMpgfInstructionMechanicalNormalization() passes.
AC-NORMALIZATION-013. docs/mpgf/mechanical-normalization-report.md exists and reports no remaining blockers.
AC-NORMALIZATION-014. docs/mpgf/codex-build-instruction-final.md is a single canonical operative instruction document and contains no patch scaffolding.
AC-NORMALIZATION-015. docs/mpgf/canonical-merge-diff-report.md exists and shows no forbidden operative old language remains.
AC-NORMALIZATION-016. docs/mpgf/codex-build-instruction-final.md is the only valid MPGF implementation instruction artifact.
AC-NORMALIZATION-017. The canonical instruction contains all operative source-artifact requirements directly and does not rely on appended patches.
AC-NORMALIZATION-018. The canonical instruction contains no patch scaffolding, “add/replace/append/merge this” language, or old operative replaced text.
AC-NORMALIZATION-019. If both an older and newer version of a section remain, Phase 0 fails.
AC-NORMALIZATION-020. Codex may not begin Phase A until canonical merge-diff and mechanical normalization reports both pass.
AC-NORMALIZATION-021. Phase 0 is implemented as a deterministic instruction-document materialization, normalization, and validation pipeline with required reports, validators, and Phase 0 fixtures.
AC-NORMALIZATION-022. Phase 0 validators use deterministic parsing, not LLM judgment.
AC-NORMALIZATION-023. Phase 0 fixtures cover valid canonical text, patch scaffolding, collapsed routes, duplicated math, old ledger model, and weak ballot privacy.
AC-NORMALIZATION-024. Phase 0 may create and run only Phase 0 canonical materialization, required reports, validators, tests, and fixtures before Phase 0 passes; all MPGF feature/repository tests and implementation work remain forbidden until Phase 0 passes.

AC-PHASE-001. Codex may perform only instruction-document materialization, normalization, validation, required reporting, validator work, and Phase 0 fixture/test work during Phase 0.
AC-PHASE-002. Codex may not begin MPGF feature implementation until Phase 0 passes.
AC-PHASE-003. Codex may not begin MPGF feature implementation until Phase A passes.
AC-PHASE-004. Phase order is Phase 0 -> Phase A -> Phase B -> Phase C.
AC-PHASE-005. Phase B cannot begin until docs/mpgf/specification-completion-register.md exists, has zero unresolved rows, and every residual specification-completion item is specified, mapped, or explicitly marked not-applicable with justification.
AC-PHASE-006. Advance scaffolding follows the required coding order unless a repo-specific deviation is documented and approved in the repo-adaptation map.
AC-PHASE-007. Phase B cannot begin until ledger-template coverage, repository capability inventory, adapter decisions, and formal locator coverage pass.

AC-CONFORMANCE-001. Every acceptance criterion has a stable ID.
AC-CONFORMANCE-002. No acceptance criterion relies only on sequential patch-era numbering.
AC-CONFORMANCE-003. Conformance matrix acceptance-criteria references validate against the final stable acceptance-criteria registry and fail on nonexistent IDs.
AC-CONFORMANCE-004. docs/mpgf/acceptance-criteria-migration-map.md exists.
AC-CONFORMANCE-005. Every old sequential or patch-era acceptance criterion is mapped, merged, superseded, retired, or justified not-applicable.
AC-CONFORMANCE-006. No old sequential criterion remains operative without a stable ID.
AC-CONFORMANCE-007. Generated conformance reports reference stable acceptance IDs only and contain no old sequential or patch-era acceptance references.
AC-CONFORMANCE-008. Every extracted formal source locator is mapped to a conformance-matrix row.
AC-CONFORMANCE-009. Repo-adaptation map and conformance matrix cross-reference each other but remain separate artifacts.
AC-CONFORMANCE-010. Formal source-locator extractor exists.
AC-CONFORMANCE-011. Conformance coverage validator exists.
AC-CONFORMANCE-012. Provisional locator IDs use type, heading slug, line range, and text hash.
AC-CONFORMANCE-013. Missing or ambiguous locators increase unresolved_count.
AC-CONFORMANCE-014. Manual locator supplementing is allowed but must be represented in the locator extraction report.
AC-CONFORMANCE-015. docs/mpgf/formal-mechanism.md embeds stable MPGF-SRC source IDs wherever possible.
AC-CONFORMANCE-016. Every embedded MPGF-SRC source ID is unique and well-formed.
AC-CONFORMANCE-017. The formal source-locator extractor prioritizes embedded MPGF-SRC source IDs.
AC-CONFORMANCE-018. The conformance matrix includes a Source ID / locator column.
AC-CONFORMANCE-019. If an embedded source ID exists, the conformance matrix uses it as the primary locator.
AC-CONFORMANCE-020. Provisional hash-based locators are allowed only when an embedded source ID is missing.
AC-CONFORMANCE-021. formal-source-locator-manual-supplement.md may add or clarify locators but may not delete deterministic locators.
AC-CONFORMANCE-022. Every manual locator has excerpt, type, reason, text hash, conformance row, and reviewer.
AC-CONFORMANCE-023. Unresolved locator overlaps increase unresolved_count.
AC-CONFORMANCE-024. Phase A fails if any embedded source ID is duplicated, malformed, or unmapped.
AC-CONFORMANCE-025. Phase A fails if any numbered paragraph, equation, definition, or mandatory/prohibitory rule lacks conformance mapping.
AC-CONFORMANCE-026. All MPGF document, source, trace, evidence, registry, record-set, row, and locator hashes use the canonical MPGF hash rule, including lowercase SHA-256, LF-normalized UTF-8 text inputs, canonical JSON inputs, declared record ordering, and declared volatile-field exclusions unless a named external provider requires a different raw provider hash.
AC-CONFORMANCE-027. Every required validation, coverage, and verification result used for Phase gates, completion profiles, production-domain verification, or conformance reporting includes or maps to the standard validation result envelope with pass/fail status, generated timestamp, validator name/version, errors, warnings, and blockers.
AC-CONFORMANCE-028. A standard validation, coverage, or verification result may pass only when errors and blockers are empty; a failed result must include at least one error or blocker, and warnings remain non-blocking.

AC-REPO-001. repository-capability-inventory.md and repository-capability-inventory.json exist before Phase B.
AC-REPO-002. Every MPGF subsystem has an adapter decision: direct_repo_convention, thin_adapter, new_mpgf_module, or blocked.
AC-REPO-003. Codex does not introduce a parallel framework, ORM, auth, payment, styling, admin, migration, or deployment system unless repository-adaptation-plan.md explicitly justifies it.
AC-REPO-004. Any blocked repository capability prevents dependent implementation work.
AC-REPO-005. validateRepositoryCapabilityInventory() passes before Phase B.
AC-REPO-006. validateRepositoryAdapterDecisions() passes before Phase B.
AC-REPO-007. docs/mpgf/repo-adaptation-map.md and config/mpgf/repo-adaptation-map.json exist and pass validateRepoAdaptationMap() before Phase B.

AC-SCHEMA-001. Every referenced MPGF core object has a schema or repository-model mapping.
AC-SCHEMA-002. Core objects include every schema-defined or repository-mapped MPGF object needed for genesis, epochs, cycles, cycle calendars, payment intents, payment webhooks, pledges, recurring contribution commitments, contributions, refunds, ledger transactions and entries, eligibility snapshots, participant verifications, eligible and valid voters, terms acceptances, sybil reviews, quorum results, partitions, ballots and ballot curves, candidate alternatives, candidate-set snapshots and items, safe fallbacks, pool proposals, outcome units, SAE assessments and curves, pool risk assessments, strong-negative flags and results, allocation plans, authorizations, tranches, recipients, recipient accreditation, compliance, payout destinations, payout authorizations, external payment evidence, governance judgments, traces, emergency shutdowns, state transitions, admin audit logs, admin approvals, appeals, conflict disclosures, production enablement, receipts, public summaries, idempotency keys, notifications, operational events, dry runs, and completion profiles.
AC-SCHEMA-003. No MPGF service may reference an undeclared core object.
AC-SCHEMA-004. mpgf_recipients exists or is mapped to an equivalent repository model.
AC-SCHEMA-005. Recipient accreditation and compliance review records exist or are mapped, and their approval/decision fields use declared values before they can satisfy authorization or payout gates.
AC-SCHEMA-006. mpgf_recipient_payout_destinations exists or is mapped when automated payout or verified payout-destination handling is implemented, and destination status plus verification_status use declared values before external payout can proceed.
AC-SCHEMA-007. Every repo-specific deviation is classified, tested for behavior preservation, and mapped in the conformance matrix.
AC-SCHEMA-008. Repo-adaptation map exists as machine-readable JSON plus Markdown report.
AC-SCHEMA-009. Repo-adaptation validator fails on unmapped requirements, behavior risks, missing tests, missing conformance rows, and missing repo paths.
AC-SCHEMA-010. Pool proposal required fields are represented in mpgf_pool_proposals or mapped to an equivalent repository model.
AC-SCHEMA-011. Pool proposal submission requires all non-optional required fields, every conditionally required field whose condition applies, and at least one of proposed_recipient_id or implementing_team_json.
AC-SCHEMA-012. Approved pool alternatives use mpgf_candidate_alternatives.id as the pool identifier; originating proposals link through mpgf_pool_proposals.candidate_alternative_id.
AC-SCHEMA-013. Safe fallback alternatives are defined by mpgf_safe_fallbacks plus config/mpgf/safe-fallbacks.json, or by a mapped equivalent before fallback allocation can run.
AC-SCHEMA-014. Authorization and payout-authorization recipient_id fields reference mpgf_recipients or a mapped recipient model whenever recipient_id is present.
AC-SCHEMA-015. Pool proposal approved_as_candidate requires reviewed_by, reviewed_at, review_rationale, and the approval-matrix action.
AC-SCHEMA-016. Safe fallback active status requires approved_by, approved_at, the approval-matrix action, and basis-point fields in [0, 10000].
AC-SCHEMA-017. Empty safe-fallback registries validate only when carryover_only_empty_registry = true is explicit.
AC-SCHEMA-018. mpgf_genesis exists or is mapped to an equivalent repository bootstrap record before FEATURE_MPGF_ENABLED=true is deployed.
AC-SCHEMA-019. mpgf_pledges exists or is mapped before pledge-only contribution mode is exposed.
AC-SCHEMA-020. Direct-working smoke tests have a demo participant path with demo-only eligibility, terms-acceptance, and voter-snapshot evidence, without automatically creating a public real user account or real-money eligible voter in production.
AC-SCHEMA-021. Core lifecycle state machines and non-lifecycle status/value enums are declared for every MPGF status-bearing object or status-like field before implementation, using state-machines.json for lifecycle transitions and status-value-registry.json for value enums.
AC-SCHEMA-022. mpgf_terms_acceptances exists or is mapped to an equivalent repository terms-acceptance model before voter eligibility can require accepted MPGF terms.
AC-SCHEMA-023. mpgf_eligibility_snapshots exists or is mapped before eligibility snapshots can be used for quorum or ballot validation.
AC-SCHEMA-024. mpgf_sybil_reviews exists or is mapped before anti-sybil eligibility exclusion can be applied, and open, confirmed_duplicate, and non-permitted inconclusive reviews exclude eligibility.
AC-SCHEMA-025. Cycle records include protocol_parameter_version, terms_version, and privacy_version, and those values match the active protocol snapshot used for eligibility, ballot validation, quorum, allocation, fallback, and public summaries.
AC-SCHEMA-026. Within one eligibility snapshot there is at most one eligible-voter row per user, within one cycle at most one valid-voter row can count for a user, and duplicates fail quorum computation closed.
AC-SCHEMA-027. Direct-working bootstrap config includes formalMechanismVersion, protocolVersion, protocolParameterVersion, thetaVersion, termsVersion, and privacyVersion whenever it creates a demo cycle, and demo versions cannot satisfy real-money or exact-completion gates without separate production approval.
AC-SCHEMA-028. Active eligibility snapshot selection is deterministic, uses the greatest approved non-superseded snapshot_version approved no later than ballot_opens_at, requires terms/privacy version match, and fails ballots, quorum, and allocation closed if no unique qualifying snapshot exists.
AC-SCHEMA-029. Active candidate-set snapshot selection is deterministic, approved no later than ballot_opens_at, immutable after ballot opening, and used consistently by ballots, feasible allocation compilation, strong-negative results, risk exposure, and public summaries.
AC-SCHEMA-030. Ordinary pool alternatives require active approved risk assessments with risk_bps and tail_loss_bps in [0, 10000] before they can receive positive allocation.
AC-SCHEMA-031. Ballots, quorum results, allocation plans, strong-negative results, and pool risk assessments persist the eligibility and/or candidate-set snapshot IDs needed to prove that validation, quorum, allocation, risk, and filtering used the same active snapshots.
AC-SCHEMA-032. Active pool risk assessment selection is deterministic, uses the greatest approved non-superseded assessment_version approved no later than ballot_opens_at, requires approved_by, approved_at, candidate_set_snapshot_id, and the approval-matrix action, and fails the alternative closed if no unique qualifying assessment exists.
AC-SCHEMA-033. SQL-like schema blocks are logical contracts; repository migrations create tables and foreign-key constraints in dependency order or add constraints after referenced tables exist, and repo-adaptation-map documents any split table/constraint implementation.
AC-SCHEMA-034. config/mpgf/www-smoke-test-profile.json and config/mpgf/www-smoke-test-profile.schema.json exist before production-domain demo_complete, validateMpgfWwwSmokeTestProfile() passes, and the smoke-test identity is fixture-owned or pre-existing, non-real-money-only, repository-auth mapped, demo-eligible for the visible demo cycle, and unable to satisfy real-money, admin, recipient payout, exact_pilot_complete, or real_money_complete gates.
AC-SCHEMA-035. config/mpgf/participant-onboarding-profile.json and config/mpgf/participant-onboarding-profile.schema.json exist before production-domain demo_complete, validateMpgfParticipantOnboardingProfile() passes, and the profile defines public_signup, private_beta_invite, or documented preexisting_participant_access for intended non-real-money pilot participants rather than hidden fixture-only or admin-only access, including publicEntryRoute, authEntryRoute, accessProvisioningEvidencePath, intendedParticipantAccessProcess, supportRouteOrEmail, and invite-request or invite-redemption routes when private_beta_invite is used.
AC-SCHEMA-036. mpgf_recurring_contribution_commitments exists or is mapped before monthly pledge-only recurring commitment mode is exposed.
AC-SCHEMA-037. config/mpgf/production-auth-session-profile.json and config/mpgf/production-auth-session-profile.schema.json exist before production-domain demo_complete, validateMpgfProductionAuthSessionProfile() passes, and the profile defines canonical production auth provider, login, signup, callback, sign-out, return-to, redirect allowlist, cookie/session, CSRF, email/invite delivery, account provisioning, and support/access configuration.

AC-LEDGER-001. Every financial ledger transaction is double-entry balanced.
AC-LEDGER-002. Cycle budget B_t is derived from eligible ledger transactions, not directly from payment-provider state.
AC-LEDGER-003. Locked B_t cannot be mutated except through audit-governed correction transactions.
AC-LEDGER-004. Historical ledger transactions and entries are append-only; corrections use reversing/correcting transactions.
AC-LEDGER-005. Ledger account names come from the approved MPGF chart of accounts.
AC-LEDGER-006. mpgf_ledger_transactions and mpgf_ledger_entries replace any single-row debit_account/credit_account ledger model unless the repository maps them to an equivalent double-entry model.
AC-LEDGER-007. Ledger uses transaction headers plus ledger-entry lines.
AC-LEDGER-008. Ledger transaction templates are configurable and balanced.
AC-LEDGER-009. Ledger tests cover payment, contribution, late contribution, refund, chargeback, void, negative amount, unknown account, unbalanced transaction, and historical mutation cases.
AC-LEDGER-010. Real-money ledger templates require accounting/legal review approval.
AC-LEDGER-011. Every declared ledger transaction_type has a template in config/mpgf/ledger-transaction-templates.json.
AC-LEDGER-012. Every financial ledger template is balanced and uses only approved chart-of-accounts entries.
AC-LEDGER-013. Every real-money-eligible ledger template requires accounting/legal approval before real-money mode.
AC-LEDGER-014. A ledger transaction cannot be created if its transaction_type lacks a valid template.
AC-LEDGER-015. Ledger corrections use reversing/correcting templates and never mutate historical ledger transactions or entries.
AC-LEDGER-016. validateLedgerTemplateRegistry() passes before exact_pilot_complete and before real_money_complete.
AC-LEDGER-017. Operative MPGF text uses “ledger transaction” for accounting records and “operational event” for mpgf_operational_events; “ledger event” appears only in obsolete/audit/negative-reference contexts.
AC-LEDGER-018. Ledger template examples must not double-count the same funds across payment, contribution, budget, authorization, release, payout, refund, chargeback, void, or carryover flows.
AC-LEDGER-019. mpgf_ledger_transactions rows represent posted accounting records only; draft attempts, validation failures, and posting failures are not ledger transactions, and reversals or corrections create new posted transactions without mutating original ledger transaction status.
AC-LEDGER-020. Pilot v0.3 money workflows use usd only unless a future formal FX policy, accounting review, legal review, ledger template update, and conformance mapping are approved.

AC-PAYMENT-001. Payment intents distinguish intended_cycle_id and budget_effective_cycle_id.
AC-PAYMENT-002. Late payment success cannot mutate locked B_t.
AC-PAYMENT-003. Stripe webhooks are idempotent and verify signatures using raw request body.
AC-PAYMENT-004. mpgf_refunds exists or is mapped to an equivalent repository refund workflow model before refund status is exposed.
AC-PAYMENT-005. Refund approval requires refund-policy eligibility, admin + auditor approval, approved_by, approved_at, audit log, and deterministic refund trace before provider submission.
AC-PAYMENT-006. Refund status submitted_to_provider requires approved refund evidence and provider_submitted_at.
AC-PAYMENT-007. High-level contribution flow modes are explicitly limited to pledge_only, test_payment, and real_money.
AC-PAYMENT-008. pledge_only contribution flow works without Stripe secrets and creates no payment-provider object.
AC-PAYMENT-009. test_payment mode uses payment-provider test mode only and cannot settle real funds.
AC-PAYMENT-010. pledge_only records do not create mpgf_contributions, ledger transactions, or live B_t effects unless converted to test or real payment intent under the relevant mode.
AC-PAYMENT-011. test_payment records are labeled test/non-real-money in UI, ledger, public summaries, and receipts and are excluded from real-money accounting.
AC-PAYMENT-012. Payment intent statuses, contribution statuses, and pledge statuses use only the declared enums unless a repository mapping declares an equivalent enum with conformance coverage.
AC-PAYMENT-013. Object-specific mode fields are constrained as follows: payment intents and contributions use only test_payment or real_money, pledges use only pledge_only, and pledge conversion creates a linked test_payment or real_money payment intent without mutating pledge_mode.
AC-PAYMENT-014. Converting a pledge to a payment intent preserves intended_cycle_id and budget_effective_cycle_id and requires the target mode to be enabled and allowed.
AC-PAYMENT-015. Payment, contribution, pledge, recurring contribution commitment, refund, authorization, tranche, payout authorization, and external-payment evidence amounts are positive integer cents except explicit zero-budget cycle/carryover or no-money demo fixtures.
AC-PAYMENT-016. config/mpgf/refund-policy.json, config/mpgf/refund-policy.schema.json, and docs/mpgf/refund-policy.md exist before refund status is exposed.
AC-PAYMENT-017. Refund approval requires deterministic refund eligibility evidence showing mode-specific policy, remaining refundable amount, provider-submission eligibility, and no conflict with external-payment or recovery rules.
AC-PAYMENT-018. Payment webhook events record raw_body_hash and signature_verified evidence before processing, processed=true requires signature_verified=true, and payload_json/raw provider payloads remain private and excluded from public summaries.
AC-PAYMENT-019. createMpgfPaymentIntent() requires mode = test_payment or real_money and rejects pledge_only; convertMpgfPledgeToPaymentIntent() requires targetMode = test_payment or real_money and rejects missing, disabled, or unapproved target modes.
AC-PAYMENT-020. Direct-working /mpgf/contribute supports one-time pledge-only pledges and monthly pledge-only recurring commitments without payment-provider secrets or payment-provider objects, and labels monthly pledge-only commitments as non-real-money recurring pledges rather than subscriptions, charges, donations, or payments.
AC-PAYMENT-021. createMpgfRecurringContributionCommitment(), pauseMpgfRecurringContributionCommitment(), resumeMpgfRecurringContributionCommitment(), cancelMpgfRecurringContributionCommitment(), and materializeMpgfRecurringPledgeForCycle() exist or are mapped, enforce idempotency, and cannot create real-money recurring payment-provider objects unless real-money recurring payment gates pass.
AC-PAYMENT-022. materializeMpgfRecurringPledgeForCycle() is idempotent by commitment and cycle, creates only pledge_only pledge records for pledge_only commitments, and does not materialize pledges for cancelled, expired, or paused commitments.

AC-PRIVACY-001. Private ballot identities are not publicly exposed before or after ballot close by default.
AC-PRIVACY-002. Recipient private profile and compliance evidence are not public by default.
AC-PRIVACY-003. Public summary JSON conforms to mpgf-public-cycle-summary-v0.3 schema.
AC-PRIVACY-004. Public summaries exclude private ballot identities and private evidence by default.
AC-PRIVACY-005. Recipient payout destination details are private by default.
AC-PRIVACY-006. Public summaries expose pledge-only, monthly recurring pledge-only, and test-mode amounts only in nonRealMoney fields and never add them to real-money budget or disbursement state fields.
AC-PRIVACY-007. config/mpgf/public-cycle-summary.schema.json and docs/mpgf/public-cycle-summary-schema.md exist, and validateMpgfPublicCycleSummary() passes after visibility filtering and before public summary publication.

AC-BALLOT-001. Ballots are finite piecewise-linear marginal-value curves.
AC-BALLOT-002. No point-only backend path affects live allocation.
AC-BALLOT-003. Ballot normalization uses exact absolute-integral normalization.
AC-BALLOT-004. Ballot can be completed without graphical drag interactions.
AC-BALLOT-005. Guided ballot builder compiles only to exact piecewise-linear curves.
AC-BALLOT-006. Ballot draft, guided compilation, validation, and final submission services exist.
AC-BALLOT-007. Ballot final submission enforces cycle window, locked budget, voter eligibility, exact integral validation, idempotency, and immutability.
AC-BALLOT-008. Each cycle and user has at most one submitted ballot, submitted ballots and submitted ballot curves are immutable, and duplicate submitted ballots fail ballot validity and quorum computation closed.
AC-BALLOT-009. saveMpgfBallotDraft() upserts one non-voided draft per cycle and user, and submitMpgfBallot() either submits the validated draft or returns the already submitted ballot for an idempotent duplicate request.
AC-BALLOT-010. Ballot curve validation requires domainStartCents = 0, domainEndCents = locked_budget_cents, endpoint breakpoints, sorted unique breakpoints, exact rational values, and alternatives from the active candidate-set snapshot.
AC-BALLOT-011. Submitted ballots record active eligibility_snapshot_id, active candidate_set_snapshot_id, locked_budget_cents_at_submission, and validation_trace_id, and ballot validation fails closed if any recorded provenance is missing or inconsistent with E_t, locked budget, or curve alternatives.

AC-SOLVER-001. Region-enumeration certificates use the required minimum schema.
AC-SOLVER-002. Branch-and-bound certificates use the required minimum schema.
AC-SOLVER-003. Certificate verifier recomputes feasibility and objective value exactly.
AC-SOLVER-004. Live allocation cannot rely on solver-native status strings or opaque logs.
AC-SOLVER-005. Live allocation requires verified zero optimality gap.
AC-SOLVER-006. Solver support profile defines max alternatives, ballots, breakpoints, regions, branch-and-bound nodes, certificate size, and verifier runtime.
AC-SOLVER-007. Solver limit exceedance fails closed and blocks Pool authorization.
AC-SOLVER-008. Solver limits cannot be loosened retroactively after ballots open.
AC-SOLVER-009. Heuristic allocation may be shadow_only but never live.
AC-SOLVER-010. docs/mpgf/solver-benchmark-report.md exists and supports active limits before exact_pilot_complete.
AC-SOLVER-011. If solver benchmark evidence shows a seed limit is unsafe, too slow, or uncertifiable, Codex tightens the limit or keeps live ordinary allocation disabled.
AC-SOLVER-012. Active solver support profile is benchmark-supported or stricter, and looser limits never apply to cycles whose ballot window has opened.
AC-SOLVER-013. Solver benchmark harness exists.
AC-SOLVER-014. Solver benchmark fixtures cover small, zero-crossing, many-breakpoint, too-many-alternative, too-many-breakpoint, too-many-region, branch-and-bound, certificate-size, verifier-runtime, infeasible, and tie-break cases.
AC-SOLVER-015. Solver preflight fails closed when active limits are exceeded.
AC-SOLVER-016. Shadow allocation may run when live allocation fails closed, but Pool authorization is blocked.
AC-SOLVER-017. Production-domain exact_pilot_complete requires runMpgfWwwExactPilotDryRunVerification("https://www.moraltrade.org") to pass through the deployed production build or a repository-approved server-side production verification action tied to that deployed build, with verified optimal certificate, independent certificate verification, active support-profile validation, final production-equivalent dry-run result, and prohibited-mutation checks.

AC-DRYRUN-001. mpgf_dry_run_cycles.status uses only draft, running, passed, failed, and cancelled unless a repository mapping declares an equivalent enum with conformance coverage.
AC-DRYRUN-002. DryRunResult includes scenario results, prohibited-mutation checks, output summary reference, blockers, completion timestamp, and pass/fail status.
AC-DRYRUN-003. Final production-equivalent dry-run uses production-equivalent code paths, RBAC/state-machine/config validation, approved production copy defaults or overrides, real-money disabled, no live mutations, and recorded prohibited-mutation checks.

AC-DISBURSEMENT-001. Pilot v0.3 does not automatically send external payouts unless an approved automated payout-provider profile exists and has automatedPayouts.enabled=true.
AC-DISBURSEMENT-002. If no approved automated payout-provider profile with automatedPayouts.enabled=true exists, tranche release creates only an internal payout authorization record.
AC-DISBURSEMENT-003. Public summary JSON exposes distinct amount fields for authorizedCents, releasedInternalCents, payoutAuthorizedCents, externallyPaidCents, paymentFailedCents, voidedCents, and carriedOverCents.
AC-DISBURSEMENT-004. Automated payout integration requires payout provider, recipient onboarding, recipient compliance, payout failure handling, reversals, sanctions/compliance checks, and audit logs in the payment/legal launch profile.
AC-DISBURSEMENT-005. mpgf_payout_authorizations exists or is mapped to an equivalent repository model.
AC-DISBURSEMENT-006. mpgf_external_payment_evidence exists or is mapped to an equivalent repository model.
AC-DISBURSEMENT-007. Tranche release cannot be confused with external payment completion.
AC-DISBURSEMENT-008. External payment completion requires external payment evidence or approved automated payout-provider confirmation.
AC-DISBURSEMENT-009. released_internal means internal tranche release only, not external payment.
AC-DISBURSEMENT-010. approved_internal means internal payout authorization approval only, not external payment.
AC-DISBURSEMENT-011. externally_paid requires verified external payment evidence or approved automated payout-provider confirmation.
AC-DISBURSEMENT-012. Public summaries do not conflate authorized, released_internal, payout_authorized, approved_internal, and externally_paid.
AC-DISBURSEMENT-013. External payout cannot occur unless recipient accreditation and compliance requirements pass.
AC-DISBURSEMENT-014. Public summaries distinguish authorized, releasedInternal, payoutAuthorized, externallyPaid, paymentFailed, voided, and carriedOver amounts.
AC-DISBURSEMENT-015. Automated payout cannot occur unless recipient payout destination verification passes using an approved automated payout-provider profile method.
AC-DISBURSEMENT-016. Automated payouts are disabled unless an approved automated payout-provider profile exists and has automatedPayouts.enabled=true.
AC-DISBURSEMENT-017. Payout provider interface exists and is provider-agnostic.
AC-DISBURSEMENT-018. Default payout adapter disables automated payouts.
AC-DISBURSEMENT-019. Manual external-payment evidence path is implemented.
AC-DISBURSEMENT-020. externally_paid cannot occur without verified manual evidence or approved automated payout-provider confirmation.
AC-DISBURSEMENT-021. Certified allocation may create only proposed authorizations before allocation audit approval.
AC-DISBURSEMENT-022. Authorization approval requires verified allocation certificate, allocation audit approval, no blocking appeal, no blocking audit concern, required admin approval, and deterministic trace.
AC-DISBURSEMENT-023. Tranche release cannot begin until authorization.status = approved.
AC-DISBURSEMENT-024. MPGF distinguishes payout_authorized as an accounting/public-summary state, mpgf_payout_authorizations as a workflow object, approved_internal as an internal status, and externally_paid as verified payment completion.
AC-DISBURSEMENT-025. Automated payout-provider profile approval requires the approval-matrix action before automatedPayouts.enabled=true can be active.
AC-DISBURSEMENT-026. Authorization approval records approved_by and approved_at before tranche release can begin.
AC-DISBURSEMENT-027. Tranche release, void, and carryover record the responsible actor and timestamp.
AC-DISBURSEMENT-028. Payout authorization void and carryover record the responsible actor and timestamp.
AC-DISBURSEMENT-029. Payout authorization status payment_failed records payment_failed_at, failure_reason, and failure_evidence_json.
AC-DISBURSEMENT-030. config/mpgf/payout-provider-profile.schema.json exists, validateMpgfPayoutProviderProfile() passes, and automated payouts cannot be active unless the profile is approved with automatedPayouts.enabled=true and an approved destination-verification method.
AC-DISBURSEMENT-031. Internal payout authorization approval moves the corresponding tranche to payout_authorized before awaiting external payment, and payout_authorized remains distinct from externally_paid.

AC-SECURITY-001. config/mpgf/rate-limits.json and config/mpgf/rate-limits.schema.json exist.
AC-SECURITY-002. Public and admin mutation routes enforce rate limits, server-side validation, audit logging, and fail-closed behavior.
AC-SECURITY-003. pledge_only/direct-working mode does not require live payment-provider secrets.
AC-SECURITY-004. MPGF_ADMIN_BOOTSTRAP_SECRET is server-only, single-use, expiring, audited, non-real-money-only, and cannot enable real_money mode, payment-provider secrets, or automated payout-provider approval.
AC-SECURITY-005. mpgf_idempotency_keys exists or is mapped, and public financial/governance mutations plus admin approval actions enforce scoped idempotency with request-hash conflict detection.
AC-SECURITY-006. MPGF_ENCRYPTION_KEY_ID is required for real-money mode and for any enabled workflow that persists real payment-provider identifiers, private evidence, recipient payout details, compliance evidence, or private payout evidence.
AC-SECURITY-007. Encrypted sensitive fields are redacted from logs, deterministic traces, conformance reports, public summaries, generated docs, and client-visible output.
AC-SECURITY-008. MPGF_WWW_SMOKE_TEST_AUTH_SECRET, when required by the active www smoke-test profile, is server-only, scoped only to establishing the production MPGF smoke-test session, expiring or rotated, redacted, and cannot create public real users, grant admin permissions, create real-money eligibility, or bypass MPGF route/action validation.
AC-SECURITY-009. validateMpgfWwwSmokeTestProfile() fails if allowedRoutes or allowedActions include real-money contribution creation, live ledger mutation, production enablement, admin approval, recipient compliance/accreditation mutation, payout-destination mutation, authorization approval, payout authorization, external payout, or any non-fixture mutation; admin routes may appear only for unauthenticated-denial checks unless a separate approved admin verification identity and action scope is mapped.
AC-SECURITY-010. runMpgfWwwAuthSessionVerification("https://www.moraltrade.org") passes before production-domain demo_complete and verifies safe internal return-to handling, production provider callback allowlist, secure canonical-host session cookies, CSRF/session protection, unsafe redirect rejection, account/profile/participant provisioning, sign-out revocation, and no auth/session path granting admin permissions, real-money eligibility, production enablement, recipient payout capability, or real payment-provider access.

AC-RBAC-001. Admin approval authority matrix exists.
AC-RBAC-002. Every sensitive action has required role, approver count, conflict rule, audit-log rule, and trace rule.
AC-RBAC-003. Recorder and verifier are distinct where independent verification is required.
AC-RBAC-004. Missing approval authority denies the action by default.
AC-RBAC-005. payout_admin, legal_reviewer, privacy_reviewer, and system_verifier are declared as approval-role aliases.
AC-RBAC-006. Every approval-role alias is mapped to an existing repository role, new MPGF role, or governance judgment authorizer.
AC-RBAC-007. If a required approval-role alias is unmapped, the corresponding sensitive action is denied by default.
AC-RBAC-008. system_verifier cannot substitute for human governance judgment where the mechanism requires human/governance review.
AC-RBAC-009. Refund approval and automated payout-provider profile approval have explicit approval-matrix rows before real-money mode.
AC-RBAC-010. Safe fallback alternative approval and fallback allocation approval have explicit approval-matrix rows before fallback allocation can move funds.
AC-RBAC-011. Every approval-matrix action marked audit-log required writes mpgf_admin_audit_logs or a repository-mapped equivalent before or atomically with the sensitive state change.
AC-RBAC-012. mpgf_admin_approval_records exists or is mapped, and independent approvals count only approved, unexpired, unrevoked, unconflicted, distinct-user approval records for the same action, target, and current target version.
AC-RBAC-013. validateMpgfAdminApprovalSet() fails closed unless the approval set satisfies the approval matrix at the moment of mutation.
AC-RBAC-014. validateMpgfAdminApprovalSet() receives or deterministically derives targetVersion whenever target_version applies, and fails closed when the current target version cannot be established at the moment of mutation.
AC-RBAC-015. Approval-matrix rows exist for pool risk assessment approval, strong-negative review, recipient compliance review, conflict disclosure review, and appeal decision before those records can affect allocation, authorization, payout, or public-summary blocking status.

AC-STATE-001. config/mpgf/state-machines.json contains minimum state machines for genesis, cycle, ledger_transaction, payment_intent, contribution, pledge, recurring_contribution_commitment, eligibility_snapshot, candidate_set_snapshot, sybil_review, safe_fallback, pool_risk_assessment, pool, ballot, allocation_plan, authorization, tranche, payout_authorization, refund, receipt, public_cycle_summary, production_enablement, idempotency_key, admin_approval_record, governance_judgment, appeal, conflict_disclosure, and emergency_shutdown, with genesis mapped to bootstrap records, ledger_transaction mapped to posted accounting transaction records, payment_intent mapped to payment intent workflow records, contribution mapped to settled contribution records, pledge mapped to pledge-only contribution records, recurring_contribution_commitment mapped to standing monthly contribution-commitment records, eligibility_snapshot mapped to eligible-voter snapshot records, candidate_set_snapshot mapped to candidate-set snapshot records, sybil_review mapped to duplicate/sybil review records, safe_fallback mapped to the safe-fallback registry, pool_risk_assessment mapped to pool risk assessment records, pool mapped to pool-proposal and candidate-alternative pool records, receipt mapped to receipt issuance records, public_cycle_summary mapped to public summary publication records, idempotency_key mapped to mutation-idempotency records, admin_approval_record mapped to independent approval records, governance_judgment mapped to governance judgment records, appeal mapped to appeal workflow records, conflict_disclosure mapped to conflict disclosure records, and emergency_shutdown mapped to emergency shutdown control records.
AC-STATE-002. Every lifecycle status-bearing MPGF object has a state machine before implementation, and every non-lifecycle status/value field has a status-value registry entry before implementation.
AC-STATE-003. No service may persist a status value absent from the relevant state machine or status-value registry.
AC-STATE-004. No transition function may perform an unlisted transition.
AC-STATE-005. Every discovered lifecycle status-bearing MPGF object is mapped to config/mpgf/state-machines.json, and every discovered non-lifecycle status or status-like value field is mapped to config/mpgf/status-value-registry.json.
AC-STATE-006. State-machine registry exists.
AC-STATE-007. transitionMpgfState rejects missing machines and unlisted transitions.
AC-STATE-008. Status-bearing object discovery validator exists.
AC-STATE-009. Tests cover missing machine, unknown status, unlisted transition, direct mutation prevention, state-transition logging, and emergency audit logging.
AC-STATE-010. docs/mpgf/planned-state-machine-table.md exists before Phase A passes and maps object types, repository objects, statuses, transitions, emergency transitions, terminal statuses, coverage status, and conformance rows.
AC-STATE-011. transitionMpgfState writes mpgf_state_transition_logs atomically with each transition, and emergency transitions also write operational events and required admin audit logs.
AC-STATE-012. Direct status mutation prevention is enforced through the strongest repository-available database or write-path guard, and any non-database enforcement layer is documented and covered by tests for every MPGF status write path.
AC-STATE-013. mpgf_notifications.status and mpgf_operational_events.status use only declared enums unless a repository mapping declares equivalent enums with conformance coverage.
AC-STATE-014. Every database column named status or ending in _status appears in either config/mpgf/state-machines.json or config/mpgf/status-value-registry.json before Phase B implementation.
AC-STATE-015. validateMpgfStatusValueRegistry() fails if any status field lacks allowed values, owner, conformance rows, or acceptance criteria.
AC-STATE-016. mpgf_public_cycle_summaries.publication_status uses only draft, generated, visibility_filtered, validated, published, withdrawn, and failed; publication can occur only from validated, and public routes display only published summaries by default.

AC-COPY-001. config/mpgf/copy-library.json exists.
AC-COPY-002. Safe default copy exists for plain-language MPGF summary, moral public goods explanation, moral trade coordination explanation, pilot status, non-real-money status, pledge-only explanation, monthly pledge-only explanation, pool proposal explanation, ballot demo explanation, visible demo pool explanation, tax, escrow, charity-evaluator, effectiveness, refund, privacy, ballot finality, allocation/disbursement distinction, and support/access.
AC-COPY-003. Production UI cannot use legally sensitive claim wording without approved legal review record.
AC-COPY-004. Copy policy is versioned and mapped to affected routes.
AC-COPY-005. Public summaries include required disclaimers.
AC-COPY-006. Production-sensitive copy overrides require approval IDs or fall back to conservative default copy.
AC-COPY-007. Copy lookup falls back to conservative defaults unless required approvals pass.
AC-COPY-008. Receipt templates are blocked in real-money mode unless approved.
AC-COPY-009. Approval-sensitive copy categories require appropriate approval IDs.
AC-COPY-010. Copy placement matrix covers all MPGF routes.
AC-COPY-011. config/mpgf/receipt-templates.json and config/mpgf/receipt-templates.schema.json exist, validateMpgfReceiptTemplateRegistry() passes, and real-money contribution receipts cannot be issued unless receipt_template_status = approved.
AC-COPY-012. Receipt templates use approved or conservative-default wording for tax, escrow, charitable status, refund, privacy, and allocation/disbursement claims, and pledge/test receipts clearly state non-real-money status.
AC-COPY-013. config/mpgf/public-experience-profile.json and config/mpgf/public-experience-profile.schema.json exist, validateMpgfPublicExperienceProfile() passes before Phase B, and the profile requires /mpgf, /mpgf/about, /mpgf/contribute, /mpgf/pools, /mpgf/account/contributions, and /mpgf/technical-spec to render the minimum public-experience copy keys and non-real-money mode labels before production-domain demo_complete.

AC-LEGAL-001. Every production legal/privacy/receipt/retention value is approved or disabled; no unknown value enables real-money mode.
AC-LEGAL-002. Production enablement review fields use only declared review, checklist, dry-run, conformance, deployment-validation, and emergency-shutdown-test status enums.
AC-LEGAL-003. config/mpgf/data-retention-policy.json, config/mpgf/data-retention-policy.schema.json, validateMpgfDataRetentionPolicy(), and applyMpgfDataRetentionPolicy() exist; real-money mode is disabled if the approved retention policy is missing, invalid, or inconsistent with privacy/legal review.

AC-GOVERNANCE-001. mpgf_emergency_shutdowns exists or is mapped, and an active emergency shutdown blocks real_money payment creation, automated payout loading, external payout creation, authorization approval, tranche release, payout authorization approval, and live certified allocation while preserving admin incident/audit/recovery access.
AC-GOVERNANCE-002. Exiting emergency shutdown requires Exit emergency shutdown approval, EmergencyResolved=1, StrictAuditPass=1, and an audit log.
AC-GOVERNANCE-003. MpgfStage values are limited to pilot, public_beta, and mature, and stage transitions require governance lifecycle reauthorization or super-reauthorization.
AC-GOVERNANCE-004. config/mpgf/protocol-parameters.json, config/mpgf/protocol-parameters.schema.json, and docs/mpgf/protocol-parameter-registry.md exist before Phase B.
AC-GOVERNANCE-005. validateMpgfProtocolParameters() fails if any required live threshold, cap, quorum value, risk value, fallback weight, ballot normalization limit, stage value, or terms/privacy version is missing, malformed, unapproved, out of bounds, hard-coded outside the protocol snapshot/formal mechanism, or unmapped to conformance.
AC-GOVERNANCE-006. Non-real-money protocol seed parameters cannot create live authorizations, external payouts, real-money accounting effects, exact_pilot_complete, or real_money_complete.
AC-GOVERNANCE-007. loadActiveMpgfProtocolSnapshot(cycleId) selects exactly one approved snapshot by the cycle-pinned protocol_parameter_version, requires matching cycle protocol/theta/stage/terms/privacy fields, and never uses latest/current-time/environment defaults for an opened cycle.
AC-GOVERNANCE-008. Risk exposure and tail-loss checks use active approved risk inputs, exact rational/integer arithmetic, no floating-point arithmetic, and fail closed when required risk inputs are missing or unmapped.
AC-GOVERNANCE-009. Deterministic kernels consume only approved, non-superseded, non-voided governance judgments, and required draft, rejected, superseded, voided, missing, or appeal-upheld judgments fail closed.
AC-GOVERNANCE-010. Strong-negative flags and results use declared status values, strong-negative results record eligibility and candidate-set snapshot IDs, threshold_triggered records threshold passage, filter_effective records final strong-negative filtering, pending required review blocks positive allocation, review_confirmed makes the filter effective, and review_rejected makes that result non-filtering unless later corrected.
AC-GOVERNANCE-011. Appeals and conflict disclosures use declared lifecycle and decision values, and blocking unresolved appeals or disqualifying conflicts fail allocation, authorization, and approval paths closed.
AC-GOVERNANCE-012. Appeal allocation-effect classifications and conflict severities use declared values; public summary appeal counts derive only from non-withdrawn, non-expired, non-voided appeals, and unresolved or disqualifying conflict records block relevant conflict-checked actions until cleared or mitigated with evidence.
AC-GOVERNANCE-013. Canonical cap calculations use a single floor after multiplying all integer factors; fallback caps use computeCapCents() with operationalReliabilityBps, risk exposure caps use computeRationalCapCents() with exact rho_exposure(F), no cap calculation uses floating-point arithmetic, and rho_exposure(F) is not rounded to integer basis points before cap calculation unless formal-mechanism.md explicitly specifies stricter rounding.

AC-DEPLOY-001. Missing genesis does not break the main site when FEATURE_MPGF_ENABLED=false, but missing genesis blocks MPGF real-money mode.
AC-DEPLOY-002. FEATURE_MPGF_ENABLED=true and MPGF_REAL_MONEY_ENABLED=false starts pledge-only/direct-working mode without live payment-provider secrets.
AC-DEPLOY-003. Production bootstrap cannot activate real_money mode automatically.
AC-DEPLOY-004. moraltrade.org production uses MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org and MPGF_CANONICAL_HOST = www.moraltrade.org.
AC-DEPLOY-005. validateMpgfDeploymentEnvironment("pre_launch") verifies the production moraltrade.org canonical host, base URL, MPGF feature flags, non-real-money mode, canonical-route serving, production deployment target validation, production deployment prerequisite validation, production auth/session profile validation, public experience profile validation, and disabled real-money, automated payout, external payout, and live authorization actions without requiring production direct-working launch, www direct-working verification, auth/session verification, public experience verification, participant journey verification, or completion-profile publication to have already passed; validateMpgfDeploymentEnvironment("completion_gate") requires already-produced production-domain direct-working launch, auth/session verification, public-experience verification, participant-journey verification, and www direct-working verification evidence before demo_complete.
AC-DEPLOY-006. docs/mpgf/www-direct-working-verification.md records canonical URL, deployment environment, deployed commit SHA or build ID, production deployment provider/project identifier, production deployment target config hash, production deployment prerequisite validation result, migration status, pre-launch deployment environment validation result from validateMpgfDeploymentEnvironment("pre_launch"), www direct-working verification result, auth/session verification result, participant journey verification result, production health-check result, blockers, timestamp, and verifier; local, staging, preview, unit-test, or screenshot evidence cannot satisfy production-domain direct-working verification.
AC-DEPLOY-007. docs/mpgf/production-direct-working-launch-runbook.md exists, and runMpgfProductionDirectWorkingLaunch() passes before production-domain demo_complete by verifying the production deployment target, deployment prerequisites, deployed commit/build, canonical domain binding, migrations, non-real-money genesis activation, direct-working fixtures, www smoke-test profile validation, www smoke-test identity, production auth/session profile validation, auth/session verification, participant onboarding profile validation, public experience profile validation, public experience verification, ordinary participant journey or approved private-beta/preexisting participant path, visible non-real-money cycle with at least one approved demo ordinary-pool alternative, public MPGF discoverability, runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org"), and runMpgfWwwProductionHealthCheck("https://www.moraltrade.org").
AC-DEPLOY-008. Production-domain completion-gate deployment validation requires config/mpgf/participant-onboarding-profile.json to validate and runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org") to pass before demo_complete is marked passed; pre-launch deployment validation must not require participant-journey verification to have already passed.
AC-DEPLOY-009. config/mpgf/www-production-health-checks.json and config/mpgf/www-production-health-checks.schema.json exist before production-domain demo_complete, validateMpgfWwwProductionHealthChecks() passes, runMpgfWwwProductionHealthCheck("https://www.moraltrade.org") passes before production-domain demo_complete, health-check result rows include profile check IDs and severity, and docs/mpgf/www-production-health-monitor.md records the first health-check result, monitor window, samples, incidents, critical incidents, unresolved critical incidents, incident records, and rollback or emergency-disablement decision.
AC-DEPLOY-010. validateMpgfWwwProductionHealthChecks() fails unless monitorWindow is a positive ISO 8601 duration, sampleIntervalSeconds and minimumMonitorWindowSeconds are positive, minimumSampleCount is at least 3, each health check has positive timeoutSeconds, the configured window is long enough to produce the required sample count, and the real_money_complete post-launch monitor runs after production-domain non-real-money direct-working launch but before MPGF_REAL_MONEY_ENABLED=true.
AC-DEPLOY-011. Passing post-launch monitor evidence records monitorStartAt and monitorEndAt in UTC, starts the first sample immediately after monitorStartAt, starts subsequent samples no more than sampleIntervalSeconds after the prior sample completes, includes at least minimumSampleCount samples, includes at least one sample checked at or after monitorEndAt, and treats failed or timed-out samples as failed sample rows for incident computation.
AC-DEPLOY-012. Production-domain deployedCommitShaOrBuildId is a nonempty immutable deployment identifier supported by deployment-provider metadata, CI metadata, or a build manifest; self-reported application routes count only when they match independent deployment or CI evidence, and production-domain completion remains blocked if deployed identity cannot be established independently of mutable application state.
AC-DEPLOY-013. For production-domain real_money_complete, a critical post-launch monitor incident is resolved only by a later passing sample for the same checkId on the same deployedCommitShaOrBuildId after firstSeenAt; approved remediation evidence may be attached but cannot by itself reduce unresolvedCriticalIncidentCount.
AC-DEPLOY-014. config/mpgf/production-deployment-target.json, config/mpgf/production-deployment-target.schema.json, and docs/mpgf/production-deployment-prerequisites.md exist before production-domain demo_complete; validateMpgfProductionDeploymentTarget() passes before Phase B; validateMpgfProductionDeploymentPrerequisites() passes before production-domain demo_complete; if .vercel/project.json exists, the target config matches its Vercel project identifiers or docs/mpgf/production-deployment-prerequisites.md records an explicit approved divergence.

AC-UI-001. Every public MPGF route renders a loading, empty, unavailable, or working state without server error in non-real-money mode.
AC-UI-002. Every listed route has a repository-mapped page, route handler, server action, or API contract.
AC-UI-003. Admin genesis, cycles, pools, recipients, payments, refunds, payouts, allocations, audits, launch, legal, incidents, conformance, RBAC, state-machine, and settings routes exist or are mapped.
AC-UI-004. runMpgfDirectWorkingSmokeTest() passes before demo_complete.
AC-UI-005. Direct-working smoke-test results include base URL, environment, feature mode, route/action checks, evidence strings, blockers, and pass/fail status.
AC-UI-006. Direct-working smoke tests use deterministic workflow-stage fixtures where needed and do not require one live cycle to have mutually incompatible proposal, budget-lock, ballot, allocation, and publication windows open at once.
AC-UI-007. config/mpgf/direct-working-fixtures.json and config/mpgf/direct-working-fixtures.schema.json define isolated deterministic proposal_open, ballot_open_with_locked_budget, and dry_run fixtures for the direct-working smoke test.
AC-UI-008. validateMpgfDirectWorkingFixtures() passes before fixture setup, and direct-working smoke tests fail if fixtures are missing, non-isolated, wall-clock-dependent without injected now, or capable of mutating live records.
AC-UI-009. runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org") passes before demo_complete in production-domain evaluation and verifies canonical host/base URL, public MPGF routes, public experience verification, visible non-real-money cycle with at least one approved demo ordinary-pool alternative, pledge-only pledge creation, monthly pledge-only recurring commitment creation, pool proposal and ballot smoke checks, public summary generation or rendering, unauthenticated admin denial, disabled real-money contribution creation, disabled automated payout creation, no required live payment-provider secrets, and no mutation of real-money records.
AC-UI-010. runMpgfWwwDirectWorkingVerification("https://www.moraltrade.org") verifies valid HTTPS, no mixed-content browser errors, deployed commit/build evidence, MPGF discoverability from homepage, primary navigation, footer, or approved private-beta entrypoint, and browser-level or equivalent rendered-form checks for no 5xx, hydration failure, uncaught client runtime error, broken form action, CSRF/session failure, or failed client bundle load.
AC-UI-011. Production-domain pool proposal and ballot smoke checks authenticate through the validated www smoke-test profile and exercise normal public route handlers, server-side validation, idempotency, state-machine validation, ballot validation, and audit logging rather than direct database writes or privileged admin bypasses.
AC-UI-012. Public MPGF action routes that require authentication expose the repository's existing sign-in/sign-up entrypoint or equivalent auth prompt with return-to-MPGF behavior.
AC-UI-013. runMpgfWwwParticipantJourneyVerification("https://www.moraltrade.org") passes before production-domain demo_complete and verifies ordinary participant entry through publicEntryRoute, auth or invite flow including invite request or invite redemption when private_beta_invite is used, return-to-MPGF behavior, active terms/privacy acceptance, non-real-money participant verification or clear next-step gating, one-time pledge-only contribution, monthly pledge-only recurring commitment creation and account-state controls, account-state visibility, proposal and ballot fixture flows where enabled, sign-out/sign-in persistence, supportRouteOrEmail visibility, normal public handlers, idempotency, state-machine validation, ballot validation, and audit logging.
AC-UI-014. Production-domain browser-level verification uses a JavaScript-capable browser session or rendered-form end-to-end client against deployed https://www.moraltrade.org routes, exercises repository auth/session and CSRF mechanisms through rendered UI or form/action contracts, observes console and network failures, verifies DOM state, and cannot be satisfied by HTTP-only probes, direct database writes, or privileged service calls.
AC-UI-015. WwwParticipantJourneyVerificationResult records publicEntryRoute, authEntryRoute, inviteRouteTested when applicable, accessProvisioningEvidencePath, supportRouteOrEmail, participantRef, deployedCommitShaOrBuildId, and route/action evidence for every ordinary participant journey check before production-domain demo_complete can pass.
AC-UI-016. runMpgfWwwPublicExperienceVerification("https://www.moraltrade.org") passes before production-domain demo_complete and verifies plain-language MPGF explanation, moral public goods explanation, moral trade coordination explanation, non-real-money status, pledge-only and monthly pledge-only actions, support/access route, public technical-spec access, mobile and desktop usability, and no primary call to action pointing to disabled, admin-only, missing, or real-money-only routes.
AC-UI-017. Production-domain demo_complete cannot be satisfied by a carryover-only fallback state; it requires at least one visible approved demo ordinary-pool alternative with non-real-money labeling and no real-money accounting, authorization, payout, or public real-user metric effects.
AC-UI-018. Production-domain participant auth through login, signup, invite redemption, callback, return-to-MPGF, refresh/navigation persistence, and sign-out is verified by browser-level or equivalent rendered-form checks before production-domain demo_complete.

AC-COMPLETION-001. mpgf_completion_profiles exists or is mapped to an equivalent repository model.
AC-COMPLETION-002. Completion status is recorded separately for demo_complete, exact_pilot_complete, and real_money_complete.
AC-COMPLETION-003. Completion profile cannot be marked passed unless its required evidence exists.
AC-COMPLETION-004. Completion profile can be revoked if later conformance, legal, payment, privacy, deployment, or security gates fail.
AC-COMPLETION-005. Each completion profile has a required evidence schema in docs/mpgf/completion-profile-evidence-schema.md and config/mpgf/completion-profile-evidence.schema.json.
AC-COMPLETION-006. Completion profile evidence validation fails if any required key is missing.
AC-COMPLETION-007. real_money_complete evidence must reference production_enablement and super_admin approval.
AC-COMPLETION-008. exact_pilot_complete evidence must reference docs/mpgf/solver-benchmark-report.md, the active solver support profile, evidence that the active profile is benchmark-supported or stricter, active protocol parameter validation, status-value registry coverage, and a passed docs/mpgf/phase-c-gate-report.md result.
AC-COMPLETION-009. docs/mpgf/phase-c-gate-report.md exists before exact_pilot_complete or real_money_complete is marked passed.
AC-COMPLETION-010. demo_complete evidence must include a passed direct-working smoke test result.
AC-COMPLETION-011. demo_complete evidence must include a passed www direct-working verification result when the evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org.
AC-COMPLETION-012. Production-domain demo_complete, exact_pilot_complete, and real_money_complete remain blocked unless the www direct-working verification evidence is tied to the deployed production commit SHA or build ID at https://www.moraltrade.org.
AC-COMPLETION-013. Production-domain demo_complete evidence must include passed production deployment target validation, production deployment prerequisite validation, production direct-working launch, www smoke-test profile validation, and completion-gate deployment environment validation results when the evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org.
AC-COMPLETION-014. Production-domain exact_pilot_complete and real_money_complete evidence must include a passed www exact-pilot dry-run verification result tied to the deployed production commit SHA or build ID at https://www.moraltrade.org.
AC-COMPLETION-015. Production-domain demo_complete evidence must include passed participant onboarding profile validation, public experience profile validation, www public experience verification, and www participant journey verification results when the evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org.
AC-COMPLETION-016. Production-domain demo_complete evidence must include a passed www production health-check result, and production-domain real_money_complete evidence plus the Phase C gate report must include a www post-launch monitor result with no unresolved critical production-domain MPGF incident for the configured observation window.
AC-COMPLETION-017. Completion profile evidence uses the shared evidence envelope, and validateCompletionProfileEvidence() fails if production-domain evidence artifacts disagree about evaluated base URL, deployed commit SHA or build ID, target profile, generated timestamp ordering, or required artifact coverage.
AC-COMPLETION-018. Completion profile instructionArtifactHash and evidenceArtifacts[].artifactHash use the canonical MPGF hash rule, and validateCompletionProfileEvidence() fails if any referenced artifact hash is missing or mismatches the artifact bytes or record serialization available to the validator.
AC-COMPLETION-019. Production-domain demo_complete evidence must include passed production auth/session profile validation and www auth/session verification results when the evaluated environment is production or MPGF_PUBLIC_BASE_URL = https://www.moraltrade.org.
```

---

## 52. Final one-sentence Codex task

Build MPGF as a feature-flagged, audit-first, admin-controlled exact pilot implementation using MPGF Pilot v0.3 defaults: implement canonical source locking, embedded formal source IDs, formal conformance coverage, Phase 0 canonicalization, repository capability inventory, repo-adaptation mapping, cycles, candidate-set snapshots, ledger accounting with double-entry transactions and complete ledger-template registry, budget locking, payments, refunds, recipient accreditation, payout authorization, external payment evidence, manual payout mode by default, optional approved automated payout-provider profiles, pool proposals, SAE assessments, bounded piecewise-linear marginal-value ballots, representative quorum, strong-negative filtering, approved risk inputs, risk/exposure/cap constraints with exact rational/basis-point arithmetic, certified exact allocation through `computeExactMpgfAllocation(cycleId)`, deterministic fallback, authorizations, tranches, pause/void/carryover, governance judgments, deterministic traces, Measure/Audit/Reauthorize/SuperReauthorize workflows, RBAC, state-machine registry and discovery validation, public-summary JSON schema, safe copy and receipt-template registry, legal/payment/privacy/receipt/retention/launch gates, dry-run modes, solver benchmark harness, completion profiles, production deployment target and prerequisite validation, production direct-working launch, www smoke-test profile, production auth/session profile, participant onboarding profile, public experience profile, browser-level production-domain auth/session verification at `https://www.moraltrade.org`, browser-level production-domain public experience verification at `https://www.moraltrade.org`, browser-level production-domain participant journey verification at `https://www.moraltrade.org`, browser-level production-domain verification at `https://www.moraltrade.org`, production health checks and post-launch monitoring, production readiness controls, deployment validation, emergency shutdown, and tests proving live MPGF cannot bypass the formal mechanism path or enable real-money operation before all required gates pass.
