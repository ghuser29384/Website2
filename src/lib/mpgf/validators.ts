import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
  createMpgfLedgerTransactionFromTemplate,
  createMpgfPledgeOnlyRecord,
  draftMpgfPoolProposal,
  generatePublicCycleSummary,
  applyMpgfPublicVisibilityFilter,
  isLedgerBalanced,
  submitMpgfDemoBallot,
} from "./mechanism";
import { demoAlternatives, demoCycle, mpgfAdminSections, mpgfPublicRoutes } from "./data";
import type {
  MpgfCheckResult,
  MpgfDirectWorkingResult,
  MpgfValidationIssue,
  MpgfValidationResult,
} from "./types";

const validatorVersion = "mpgf-pilot-v0.3-direct-working-1";

function issue(id: string, message: string, filePath?: string): MpgfValidationIssue {
  return { id, message, path: filePath };
}

function result(
  validatorName: string,
  errors: MpgfValidationIssue[] = [],
  warnings: MpgfValidationIssue[] = [],
): MpgfValidationResult {
  return {
    status: errors.length === 0 ? "passed" : "failed",
    generatedAt: new Date().toISOString(),
    validatorName,
    validatorVersion,
    errors,
    warnings,
    blockers: errors,
  };
}

function rootPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function readTextIfExists(...segments: string[]) {
  const filePath = rootPath(...segments);

  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf8");
}

function readJsonIfExists(filePath: string) {
  const absolutePath = rootPath(filePath);

  if (!existsSync(absolutePath)) {
    return { ok: false as const, value: null, error: `Missing ${filePath}` };
  }

  try {
    return { ok: true as const, value: JSON.parse(readFileSync(absolutePath, "utf8")), error: null };
  } catch (error) {
    return {
      ok: false as const,
      value: null,
      error: error instanceof Error ? error.message : `Invalid JSON in ${filePath}`,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
}

function requireObjectKeys(
  errors: MpgfValidationIssue[],
  value: Record<string, unknown>,
  filePath: string,
  keys: string[],
) {
  for (const key of keys) {
    if (!(key in value)) {
      errors.push(issue("missing-config-key", `${filePath} is missing required key ${key}.`, filePath));
    }
  }
}

function requireIncludes(
  errors: MpgfValidationIssue[],
  filePath: string,
  fieldName: string,
  values: string[],
  requiredValues: string[],
) {
  for (const requiredValue of requiredValues) {
    if (!values.includes(requiredValue)) {
      errors.push(issue("missing-config-value", `${filePath}.${fieldName} must include ${requiredValue}.`, filePath));
    }
  }
}

function validateRequiredJsonObject(filePath: string, requiredKeys: string[]) {
  const parsed = readJsonIfExists(filePath);
  const errors: MpgfValidationIssue[] = [];

  if (!parsed.ok) {
    errors.push(issue("config-json", parsed.error ?? `${filePath} could not be read.`, filePath));
    return { value: null, errors };
  }

  if (!isRecord(parsed.value)) {
    errors.push(issue("config-object", `${filePath} must be a JSON object.`, filePath));
    return { value: null, errors };
  }

  requireObjectKeys(errors, parsed.value, filePath, requiredKeys);
  return { value: parsed.value, errors };
}

function loadRequiredJsonObject(filePath: string): Record<string, unknown> {
  const parsed = readJsonIfExists(filePath);

  if (!parsed.ok) {
    throw new Error(parsed.error ?? `${filePath} could not be read.`);
  }

  if (!isRecord(parsed.value)) {
    throw new Error(`${filePath} must be a JSON object.`);
  }

  return parsed.value;
}

export function loadMpgfProductionDeploymentTarget() {
  return loadRequiredJsonObject("config/mpgf/production-deployment-target.json");
}

export function loadMpgfWwwProductionHealthChecks() {
  return loadRequiredJsonObject("config/mpgf/www-production-health-checks.json");
}

export function loadMpgfParticipantOnboardingProfile() {
  return loadRequiredJsonObject("config/mpgf/participant-onboarding-profile.json");
}

export function loadMpgfProductionAuthSessionProfile() {
  return loadRequiredJsonObject("config/mpgf/production-auth-session-profile.json");
}

export function loadMpgfPublicExperienceProfile() {
  return loadRequiredJsonObject("config/mpgf/public-experience-profile.json");
}

export function loadMpgfWwwSmokeTestProfile() {
  return loadRequiredJsonObject("config/mpgf/www-smoke-test-profile.json");
}

export function loadMpgfDirectWorkingFixtures() {
  return loadRequiredJsonObject("config/mpgf/direct-working-fixtures.json");
}

export function loadMpgfServerConfig() {
  return {
    baseUrl: process.env.MPGF_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    canonicalHost: process.env.MPGF_CANONICAL_HOST ?? "localhost:3000",
    featureEnabled: process.env.FEATURE_MPGF_ENABLED !== "false",
    realMoneyEnabled: process.env.MPGF_REAL_MONEY_ENABLED === "true",
  };
}

export function redactMpgfSecrets(input: unknown): unknown {
  const secretKeyPattern = /secret|token|password|private|encryption|webhook|api[_-]?key|publishable[_-]?key/i;

  if (Array.isArray(input)) {
    return input.map((entry) => redactMpgfSecrets(entry));
  }

  if (!isRecord(input)) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      secretKeyPattern.test(key) ? "[REDACTED_MPGF_SECRET]" : redactMpgfSecrets(value),
    ]),
  );
}

export function rotateMpgfSecret(secretType: string) {
  return {
    status: "manual_rotation_required" as const,
    secretType,
    rotatedAt: null,
    secretValueExposed: false,
    instructions:
      "Rotate the secret in the approved production secret manager; never write the secret value to code, logs, docs, traces, or public environment variables.",
  };
}

export function enforceMpgfRateLimit(ruleKey: string, actorKey: string) {
  const filePath = "config/mpgf/rate-limits.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "defaultDenyWhenMissing", "limits"]);

  if (!value) {
    return {
      status: "blocked" as const,
      allowed: false,
      ruleKey,
      actorKeyHash: canonicalMpgfHash(actorKey),
      errors,
    };
  }

  const limits = Array.isArray(value.limits) ? value.limits.filter(isRecord) : [];
  const limit = limits.find((entry) => entry.surface === ruleKey);

  if (!limit) {
    return {
      status: "blocked" as const,
      allowed: false,
      ruleKey,
      actorKeyHash: canonicalMpgfHash(actorKey),
      reason: "Unknown MPGF rate-limit rule; default-deny applies.",
    };
  }

  const maxRequests = typeof limit.maxRequests === "number" ? limit.maxRequests : 0;
  const windowSeconds = typeof limit.windowSeconds === "number" ? limit.windowSeconds : 0;

  return {
    status: "allowed" as const,
    allowed: true,
    ruleKey,
    actorKeyHash: canonicalMpgfHash(actorKey),
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - 1),
    windowSeconds,
    evidence: "Direct-working in-process preflight only; persistent distributed enforcement must be wired before real-money mode.",
  };
}

function canonicalJson(value: unknown): string {
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return "null";
  }

  if (typeof value === "bigint") {
    return JSON.stringify(value.toString());
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return "null";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => typeof entry !== "undefined" && typeof entry !== "function" && typeof entry !== "symbol")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

export function canonicalMpgfHash(value: unknown) {
  const serialized = typeof value === "string" ? value.replace(/\r\n/g, "\n") : canonicalJson(value);

  return createHash("sha256").update(serialized).digest("hex");
}

export function validateMpgfInstructionMechanicalNormalization() {
  const source = readTextIfExists("mpgf_pilot_v0_3_codex_build_instruction_latest.md");
  const canonical = readTextIfExists("docs", "mpgf", "codex-build-instruction-final.md");
  const errors: MpgfValidationIssue[] = [];

  if (!source) {
    errors.push(issue("missing-source", "Phase 0 source artifact is missing."));
  }

  if (!canonical) {
    errors.push(issue("missing-canonical", "Canonical MPGF instruction artifact is missing."));
  }

  if (canonical && canonical.includes("*** Begin Patch")) {
    errors.push(issue("patch-scaffolding", "Canonical instruction still contains patch scaffolding."));
  }

  if (canonical && (canonical.match(/```/g)?.length ?? 0) % 2 !== 0) {
    errors.push(issue("code-fence-balance", "Canonical instruction has unbalanced Markdown code fences."));
  }

  if (canonical) {
    const ids = [...canonical.matchAll(/^AC-[A-Z0-9-]+/gm)].map((match) => match[0]);
    const seen = new Set<string>();
    const duplicates = ids.filter((id) => {
      if (seen.has(id)) {
        return true;
      }

      seen.add(id);
      return false;
    });

    if (duplicates.length > 0) {
      errors.push(issue("duplicate-acceptance-id", `Duplicate acceptance criteria: ${duplicates.join(", ")}.`));
    }
  }

  return result("validateMpgfInstructionMechanicalNormalization", errors);
}

export function runMpgfPhase0Canonicalization() {
  return validateMpgfInstructionMechanicalNormalization();
}

export function validateCanonicalNonPatchDocument() {
  const canonical = readTextIfExists("docs", "mpgf", "codex-build-instruction-final.md");
  const errors: MpgfValidationIssue[] = [];

  if (!canonical) {
    errors.push(issue("canonical-nonpatch-missing", "Canonical MPGF instruction artifact is missing."));
  } else if (canonical.includes("*** Begin Patch") || canonical.includes("*** End Patch")) {
    errors.push(issue("canonical-nonpatch-marker", "Canonical MPGF instruction artifact contains patch markers."));
  }

  return result("validateCanonicalNonPatchDocument", errors);
}

export function validateNoForbiddenOldOperativeLanguage() {
  const canonical = readTextIfExists("docs", "mpgf", "codex-build-instruction-final.md") ?? "";
  const errors: MpgfValidationIssue[] = [];

  for (const line of canonical.split("\n")) {
    if (
      /ledger event/i.test(line) &&
      !/obsolete|negative-reference|migration|do not use|allowed uses|required replacements|->/i.test(line)
    ) {
      errors.push(issue("forbidden-operative-language", `Canonical document contains operative ledger-event wording: ${line.trim()}`));
    }
  }

  if (/only valid artifact.*latest\.md/i.test(canonical)) {
    errors.push(issue("forbidden-operative-language", "Canonical document still treats the latest.md transport artifact as operative."));
  }

  return result("validateNoForbiddenOldOperativeLanguage", errors);
}

export function validateStableAcceptanceCriteriaIds() {
  const canonical = readTextIfExists("docs", "mpgf", "codex-build-instruction-final.md");
  const errors: MpgfValidationIssue[] = [];

  if (!canonical) {
    errors.push(issue("stable-ac-missing-canonical", "Canonical MPGF instruction artifact is missing."));
    return result("validateStableAcceptanceCriteriaIds", errors);
  }

  const ids = [...canonical.matchAll(/^AC-[A-Z0-9-]+/gm)].map((match) => match[0]);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      errors.push(issue("stable-ac-duplicate", `Duplicate acceptance criterion id ${id}.`));
    }

    seen.add(id);
  }

  if (ids.length === 0) {
    errors.push(issue("stable-ac-empty", "Canonical MPGF instruction artifact has no stable acceptance criteria ids."));
  }

  return result("validateStableAcceptanceCriteriaIds", errors);
}

export function validateRepositoryCapabilityInventory() {
  const requiredPaths = [
    "docs/mpgf/repository-capability-inventory.md",
    "config/mpgf/repository-capability-inventory.json",
    "docs/mpgf/repository-integration-report.md",
    "docs/mpgf/repository-adaptation-plan.md",
    "docs/mpgf/repo-adaptation-map.md",
    "config/mpgf/repo-adaptation-map.json",
    "docs/mpgf/repo-specific-implementation-map.md",
    "config/mpgf/protocol-parameters.json",
    "config/mpgf/ledger-template-registry.json",
    "config/mpgf/ledger-transaction-templates.json",
    "config/mpgf/direct-working-bootstrap.json",
    "config/mpgf/direct-working-fixtures.json",
    "config/mpgf/state-machines.json",
    "config/mpgf/status-value-registry.json",
    "supabase/migrations/20260507_mpgf_pilot_v0_3.sql",
    "supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql",
    "docs/mpgf/solver-implementation-plan.md",
    "docs/mpgf/planned-state-machine-table.md",
    "docs/mpgf/status-bearing-object-discovery-report.md",
    "docs/mpgf/status-value-registry.md",
    "docs/mpgf/rbac-permission-matrix.md",
    "config/mpgf/rbac-permission-matrix.json",
    "docs/mpgf/rbac-coverage-audit.md",
    "docs/mpgf/legal-configuration-manifest.md",
    "docs/mpgf/payment-production-readiness.md",
    "docs/mpgf/privacy-launch-profile.md",
    "docs/mpgf/receipt-template-approval.md",
    "docs/mpgf/data-retention-policy.md",
    "docs/mpgf/launch-readiness-report.md",
    "docs/mpgf/production-claims-and-values-registry.md",
    "config/mpgf/copy-library.json",
    "config/mpgf/copy-policy.schema.json",
    "docs/mpgf/copy-placement-matrix.md",
    "config/mpgf/rate-limits.json",
    "config/mpgf/rate-limits.schema.json",
    "docs/mpgf/deployment-environment.md",
    "docs/mpgf/pre-implementation-gap-report.md",
  ];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("missing-repo-artifact", `Missing required repository artifact ${filePath}.`, filePath));

  return result("validateRepositoryCapabilityInventory", errors);
}

export function validateFormalMechanismSourceLock() {
  const requiredPaths = [
    "docs/mpgf/formal-mechanism.raw.md",
    "docs/mpgf/formal-mechanism.md",
    "docs/mpgf/formal-mechanism.version.json",
    "docs/mpgf/formal-kernel-spec.md",
    "config/mpgf/formal-kernel-spec.json",
    "docs/mpgf/formal-conformance-matrix.md",
    "docs/mpgf/formal-source-locator-extraction-report.md",
    "docs/mpgf/formal-source-locator-manual-supplement.md",
  ];
  const errors: MpgfValidationIssue[] = [];

  for (const filePath of requiredPaths) {
    if (!existsSync(rootPath(filePath))) {
      errors.push(issue("missing-formal-source-lock-artifact", `Missing formal source-lock artifact ${filePath}.`, filePath));
    }
  }

  const raw = readTextIfExists("docs", "mpgf", "formal-mechanism.raw.md");
  if (raw && /BLOCKED|placeholder|pending complete verbatim source lock/i.test(raw)) {
    errors.push(
      issue(
        "formal-source-not-verbatim-complete",
        "formal-mechanism.raw.md is present but does not contain the complete newest MPGF mechanism description verbatim.",
        "docs/mpgf/formal-mechanism.raw.md",
      ),
    );
  }

  const version = readJsonIfExists("docs/mpgf/formal-mechanism.version.json");
  if (!version.ok) {
    errors.push(issue("formal-source-version-json", version.error ?? "formal-mechanism.version.json could not be read."));
  } else if (isRecord(version.value)) {
    if (version.value.source_completeness !== "verbatim_complete") {
      errors.push(
        issue(
          "formal-source-completeness",
          "formal-mechanism.version.json must record source_completeness = verbatim_complete before full Phase A passes.",
          "docs/mpgf/formal-mechanism.version.json",
        ),
      );
    }

    if (typeof version.value.source_hash !== "string" || typeof version.value.annotated_source_hash !== "string") {
      errors.push(
        issue(
          "formal-source-hash-missing",
          "formal-mechanism.version.json must include source_hash and annotated_source_hash strings before full Phase A passes.",
          "docs/mpgf/formal-mechanism.version.json",
        ),
      );
    }
  }

  return result("validateFormalMechanismSourceLock", errors);
}

export function extractFormalSourceLocators() {
  const formal = readTextIfExists("docs", "mpgf", "formal-mechanism.md");
  const errors: MpgfValidationIssue[] = [];

  if (!formal) {
    errors.push(issue("formal-locator-source-missing", "formal-mechanism.md is missing.", "docs/mpgf/formal-mechanism.md"));
  }

  const locators =
    formal
      ?.split("\n")
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /\{#mpgf-src-[A-Za-z0-9_-]+\}/.test(line))
      .map(({ line, lineNumber }) => ({
        locatorId: `embedded:${lineNumber}:${canonicalMpgfHash(line).slice(0, 12)}`,
        lineNumber,
      })) ?? [];

  return {
    ...result("extractFormalSourceLocators", errors),
    locators,
  };
}

export function validateEmbeddedFormalSourceIds() {
  const extracted = extractFormalSourceLocators();
  const errors = [...extracted.errors];

  if (extracted.locators.length === 0) {
    errors.push(
      issue(
        "formal-source-ids-missing",
        "formal-mechanism.md does not include embedded formal source ids.",
        "docs/mpgf/formal-mechanism.md",
      ),
    );
  }

  return result("validateEmbeddedFormalSourceIds", errors);
}

export function validateManualFormalLocatorSupplement() {
  const filePath = "docs/mpgf/formal-source-locator-manual-supplement.md";
  const supplement = readTextIfExists(filePath);
  const errors: MpgfValidationIssue[] = [];

  if (!supplement) {
    errors.push(issue("formal-locator-supplement-missing", "Manual formal locator supplement is missing.", filePath));
  } else if (!/Status:/i.test(supplement)) {
    errors.push(issue("formal-locator-supplement-status", "Manual formal locator supplement must record status.", filePath));
  }

  return result("validateManualFormalLocatorSupplement", errors);
}

export function validateLocatorConformanceCoverage() {
  const requiredPaths = [
    "docs/mpgf/formal-conformance-matrix.md",
    "docs/mpgf/formal-source-locator-extraction-report.md",
    "docs/mpgf/formal-source-locator-manual-supplement.md",
  ];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("formal-locator-coverage-artifact", `Missing formal locator coverage artifact ${filePath}.`, filePath));

  return result("validateLocatorConformanceCoverage", errors);
}

export function validateFormalSourceIdCoverage() {
  const sourceLock = validateFormalMechanismSourceLock();
  const embeddedIds = validateEmbeddedFormalSourceIds();
  const manualSupplement = validateManualFormalLocatorSupplement();
  const locatorCoverage = validateLocatorConformanceCoverage();

  return result("validateFormalSourceIdCoverage", [
    ...sourceLock.errors,
    ...embeddedIds.errors,
    ...manualSupplement.errors,
    ...locatorCoverage.errors,
  ]);
}

export function validateMpgfProtocolParameters(snapshot?: Record<string, unknown>) {
  const parsed = readJsonIfExists("config/mpgf/protocol-parameters.json");
  const errors: MpgfValidationIssue[] = [];

  if (!parsed.ok) {
    errors.push(issue("protocol-json", parsed.error ?? "Protocol parameters could not be read."));
    return result("validateMpgfProtocolParameters", errors);
  }

  const value = (snapshot ?? parsed.value) as {
    version?: string;
    protocolParameterVersion?: string;
    currency?: string;
    realMoneyEnabled?: boolean;
    representativeQuorumBps?: number;
    maxAllocationAlternatives?: number;
  };

  if (!value.version && !value.protocolParameterVersion) {
    errors.push(issue("protocol-version", "Protocol parameter version is required."));
  }

  if (value.currency !== "usd") {
    errors.push(issue("protocol-currency", "Pilot v0.3 supports usd only."));
  }

  if (value.realMoneyEnabled !== false) {
    errors.push(issue("protocol-real-money", "Direct-working pilot protocol must keep real money disabled."));
  }

  const representativeQuorumBps = value.representativeQuorumBps;
  const maxAllocationAlternatives = value.maxAllocationAlternatives;

  if (
    !Number.isInteger(representativeQuorumBps) ||
    representativeQuorumBps === undefined ||
    representativeQuorumBps < 0 ||
    representativeQuorumBps > 10_000
  ) {
    errors.push(issue("protocol-quorum", "Representative quorum basis points must be an integer in [0, 10000]."));
  }

  if (
    !Number.isInteger(maxAllocationAlternatives) ||
    maxAllocationAlternatives === undefined ||
    maxAllocationAlternatives < demoAlternatives.length
  ) {
    errors.push(issue("protocol-allocation-count", "maxAllocationAlternatives must cover all approved demo alternatives."));
  }

  return result("validateMpgfProtocolParameters", errors);
}

export function validateLedgerTemplateRegistry() {
  const parsed = readJsonIfExists("config/mpgf/ledger-template-registry.json");
  const errors: MpgfValidationIssue[] = [];

  if (!parsed.ok) {
    errors.push(issue("ledger-template-json", parsed.error ?? "Ledger template registry could not be read."));
    return result("validateLedgerTemplateRegistry", errors);
  }

  const templates = Array.isArray((parsed.value as { templates?: unknown[] }).templates)
    ? ((parsed.value as { templates: Array<{ id?: string; realMoneyEligible?: boolean; entries?: Array<{ account?: string; direction?: string }> }> }).templates)
    : [];

  if (templates.length === 0) {
    errors.push(issue("ledger-template-empty", "Ledger template registry must contain templates."));
  }

  for (const template of templates) {
    if (!template.id) {
      errors.push(issue("ledger-template-id", "Every ledger template requires an id."));
    }

    if (template.realMoneyEligible) {
      errors.push(issue("ledger-template-real-money", `${template.id} is real-money eligible before gates pass.`));
    }

    const debits = template.entries?.filter((entry) => entry.direction === "debit").length ?? 0;
    const credits = template.entries?.filter((entry) => entry.direction === "credit").length ?? 0;

    if (debits === 0 || credits === 0) {
      errors.push(issue("ledger-template-double-entry", `${template.id} must include debit and credit entries.`));
    }
  }

  return result("validateLedgerTemplateRegistry", errors);
}

const declaredLedgerTransactionTypes = [
  "payment_intent_created",
  "payment_succeeded",
  "contribution_recorded",
  "budget_locked",
  "late_contribution_assigned_next_cycle",
  "refund_requested",
  "refund_succeeded",
  "chargeback_received",
  "chargeback_won",
  "chargeback_lost",
  "allocation_authorized",
  "tranche_released_internal",
  "payout_authorized",
  "external_payment_recorded",
  "void_undisbursed",
  "carryover_created",
  "ledger_correction",
];

export function validateLedgerTransactionTemplates() {
  const filePath = "config/mpgf/ledger-transaction-templates.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "currency", "mode", "templates"]);

  if (!value) {
    return result("validateLedgerTransactionTemplates", errors);
  }

  const templates = Array.isArray(value.templates) ? value.templates.filter(isRecord) : [];
  const transactionTypes = templates
    .map((template) => template.transaction_type)
    .filter((transactionType): transactionType is string => typeof transactionType === "string");

  requireIncludes(errors, filePath, "templates.transaction_type", transactionTypes, declaredLedgerTransactionTypes);

  for (const template of templates) {
    const transactionType = typeof template.transaction_type === "string" ? template.transaction_type : "unknown";

    for (const key of [
      "required_related_type",
      "affects_derived_B_t",
      "allowed_before_budget_lock",
      "allowed_after_budget_lock",
      "real_money_eligible",
      "debit_entries",
      "credit_entries",
      "amount_source",
      "required_idempotency_key_source",
      "required_audit_log",
      "required_approval_or_review_status",
    ]) {
      if (!(key in template)) {
        errors.push(issue("ledger-transaction-template-field", `${transactionType} is missing ${key}.`, filePath));
      }
    }

    if (!Array.isArray(template.debit_entries) || template.debit_entries.length === 0) {
      errors.push(issue("ledger-transaction-template-debit", `${transactionType} requires at least one debit entry.`, filePath));
    }

    if (!Array.isArray(template.credit_entries) || template.credit_entries.length === 0) {
      errors.push(issue("ledger-transaction-template-credit", `${transactionType} requires at least one credit entry.`, filePath));
    }

    if (template.required_audit_log !== true) {
      errors.push(issue("ledger-transaction-template-audit", `${transactionType} must require an audit log.`, filePath));
    }
  }

  return result("validateLedgerTransactionTemplates", errors);
}

export function validateLedgerTemplateForTransactionType(transactionType: string) {
  const templates = readJsonIfExists("config/mpgf/ledger-transaction-templates.json");
  const errors: MpgfValidationIssue[] = [];

  if (!templates.ok) {
    errors.push(issue("ledger-template-type-json", templates.error ?? "Ledger transaction template registry could not be read."));
  } else if (isRecord(templates.value) && Array.isArray(templates.value.templates)) {
    const found = templates.value.templates
      .filter(isRecord)
      .some((template) => template.transaction_type === transactionType);

    if (!found) {
      errors.push(
        issue(
          "ledger-template-type-missing",
          `Missing ledger transaction template for ${transactionType}.`,
          "config/mpgf/ledger-transaction-templates.json",
        ),
      );
    }
  }

  return result("validateLedgerTemplateForTransactionType", errors);
}

export function validateMpgfDirectWorkingFixtures() {
  const parsed = readJsonIfExists("config/mpgf/direct-working-fixtures.json");
  const errors: MpgfValidationIssue[] = [];

  if (!parsed.ok) {
    errors.push(issue("fixtures-json", parsed.error ?? "Direct-working fixtures could not be read."));
    return result("validateMpgfDirectWorkingFixtures", errors);
  }

  const fixture = parsed.value as {
    seedMode?: string;
    workflowStages?: string[];
    createsRealMoneyRecords?: boolean;
  };

  for (const stage of ["proposal_open", "ballot_open_with_locked_budget", "dry_run"]) {
    if (!fixture.workflowStages?.includes(stage)) {
      errors.push(issue("fixture-stage", `Missing deterministic fixture stage ${stage}.`));
    }
  }

  if (fixture.seedMode !== "non_real_money_demo") {
    errors.push(issue("fixture-seed-mode", "Direct-working fixtures must use non_real_money_demo seed mode."));
  }

  if (fixture.createsRealMoneyRecords) {
    errors.push(issue("fixture-real-money", "Direct-working fixtures cannot create real-money records."));
  }

  return result("validateMpgfDirectWorkingFixtures", errors);
}

export function ensureMpgfDirectWorkingFixture(fixtureKey: string) {
  const fixtures = loadMpgfDirectWorkingFixtures();
  const visiblePools = stringArray(fixtures.visibleDemoPoolAlternativeIds);
  const workflowStages = stringArray(fixtures.workflowStages);
  const available = new Set([...visiblePools, ...workflowStages, String(fixtures.demoParticipantRef ?? "")]);

  if (!available.has(fixtureKey)) {
    throw new Error(`Missing MPGF direct-working fixture ${fixtureKey}.`);
  }

  return {
    status: "available" as const,
    fixtureKey,
  };
}

export function validateRepositoryAdapterDecisions() {
  const requiredPaths = [
    "docs/mpgf/repository-integration-report.md",
    "docs/mpgf/repository-adaptation-plan.md",
    "docs/mpgf/repo-specific-implementation-map.md",
  ];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("missing-repository-adapter-decision", `Missing repository adapter decision artifact ${filePath}.`, filePath));

  return result("validateRepositoryAdapterDecisions", errors);
}

export function validateRepoAdaptationMap() {
  const requiredPaths = ["docs/mpgf/repo-adaptation-map.md", "config/mpgf/repo-adaptation-map.json"];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("missing-repo-adaptation-map", `Missing repository adaptation map ${filePath}.`, filePath));

  return result("validateRepoAdaptationMap", errors);
}

const minimumPublicExperienceCopyKeys = [
  "mpgf_plain_language_summary",
  "moral_public_goods_explanation",
  "moral_trade_coordination_explanation",
  "pilot_status",
  "non_real_money_status",
  "pledge_only_explanation",
  "monthly_pledge_only_explanation",
  "pool_proposal_explanation",
  "ballot_demo_explanation",
  "visible_demo_pool_explanation",
  "not_tax_advice",
  "tax_deductibility_disabled_by_default",
  "not_escrow",
  "not_charity_evaluator",
  "not_guaranteed_effectiveness",
  "privacy_visibility",
  "ballot_finality",
  "allocation_not_disbursement",
  "support_or_access",
];

export function validateMpgfPublicExperienceProfile() {
  const filePath = "config/mpgf/public-experience-profile.json";
  const requiredKeys = [
    "profileVersion",
    "enabled",
    "baseUrl",
    "publicEntryRoute",
    "requiredRoutes",
    "requiredCopyKeys",
    "requiredModeLabels",
    "primaryActionRoutes",
    "supportRouteOrEmail",
    "requireVisibleDemoOrdinaryPoolAlternative",
    "allowCarryoverOnlyDemoComplete",
    "requireMobileAndDesktopChecks",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);

  if (!value) {
    return result("validateMpgfPublicExperienceProfile", errors);
  }

  if (value.baseUrl !== "https://www.moraltrade.org") {
    errors.push(issue("public-experience-base-url", "Public experience baseUrl must be https://www.moraltrade.org.", filePath));
  }

  if (value.publicEntryRoute !== "/mpgf") {
    errors.push(issue("public-experience-entry-route", "Public entry route must be /mpgf.", filePath));
  }

  requireIncludes(errors, filePath, "requiredRoutes", stringArray(value.requiredRoutes), [
    "/mpgf",
    "/mpgf/about",
    "/mpgf/contribute",
    "/mpgf/pools",
    "/mpgf/account/contributions",
    "/mpgf/technical-spec",
  ]);
  requireIncludes(errors, filePath, "requiredCopyKeys", stringArray(value.requiredCopyKeys), minimumPublicExperienceCopyKeys);
  requireIncludes(errors, filePath, "requiredModeLabels", stringArray(value.requiredModeLabels), [
    "non-real-money",
    "pledge-only",
    "real-money disabled",
  ]);
  requireIncludes(errors, filePath, "primaryActionRoutes", stringArray(value.primaryActionRoutes), [
    "/mpgf/contribute",
    "/mpgf/pools/new",
  ]);

  if (value.requireVisibleDemoOrdinaryPoolAlternative !== true || value.allowCarryoverOnlyDemoComplete !== false) {
    errors.push(issue("public-experience-demo-pool", "Public experience must require a visible ordinary-pool demo and disallow carryover-only demo_complete.", filePath));
  }

  return result("validateMpgfPublicExperienceProfile", errors);
}

export function validateMpgfParticipantOnboardingProfile() {
  const filePath = "config/mpgf/participant-onboarding-profile.json";
  const requiredKeys = [
    "profileVersion",
    "enabled",
    "onboardingMode",
    "publicEntryRoute",
    "authEntryRoute",
    "accessProvisioningEvidencePath",
    "intendedParticipantAccessProcess",
    "supportRouteOrEmail",
    "returnToMpgfSupported",
    "termsRoute",
    "privacyRoute",
    "requiredTermsVersion",
    "requiredPrivacyVersion",
    "verificationMode",
    "participantTestAccountPolicy",
    "allowedJourneyActions",
    "fixtureKeys",
    "auditLogRequired",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);

  if (!value) {
    return result("validateMpgfParticipantOnboardingProfile", errors);
  }

  if (value.enabled !== true || value.onboardingMode !== "public_signup") {
    errors.push(issue("participant-onboarding-mode", "Direct-working participant onboarding must be enabled in public_signup mode.", filePath));
  }

  if (value.publicEntryRoute !== "/mpgf" || typeof value.authEntryRoute !== "string" || !value.authEntryRoute.includes("returnTo=/mpgf")) {
    errors.push(issue("participant-onboarding-routes", "Participant onboarding must enter through /mpgf and support return-to-MPGF auth.", filePath));
  }

  if (value.supportRouteOrEmail !== "support@moraltrade.org") {
    errors.push(issue("participant-onboarding-support", "Participant onboarding supportRouteOrEmail must match the public experience profile.", filePath));
  }

  requireIncludes(errors, filePath, "allowedJourneyActions", stringArray(value.allowedJourneyActions), [
    "create_non_real_money_pledge",
    "create_monthly_non_real_money_pledge",
    "view_account_contribution_state",
    "draft_pool_proposal",
    "simulate_ballot",
  ]);

  return result("validateMpgfParticipantOnboardingProfile", errors);
}

export function validateMpgfProductionAuthSessionProfile() {
  const filePath = "config/mpgf/production-auth-session-profile.json";
  const requiredKeys = [
    "profileVersion",
    "enabled",
    "baseUrl",
    "authProvider",
    "loginRoute",
    "signupRoute",
    "callbackRoute",
    "signOutRouteOrAction",
    "returnToParam",
    "allowedRedirectOrigins",
    "allowedPostAuthRoutes",
    "requiredProviderRedirectUrls",
    "sessionCookieScope",
    "sessionCookieSameSite",
    "secureCookiesRequired",
    "csrfProtectionRequired",
    "emailConfirmationMode",
    "inviteDeliveryMode",
    "accountProvisioningMode",
    "supportRouteOrEmail",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);

  if (!value) {
    return result("validateMpgfProductionAuthSessionProfile", errors);
  }

  if (value.baseUrl !== "https://www.moraltrade.org" || value.authProvider !== "supabase") {
    errors.push(issue("auth-session-provider", "Production auth/session profile must use Supabase on https://www.moraltrade.org.", filePath));
  }

  requireIncludes(errors, filePath, "allowedRedirectOrigins", stringArray(value.allowedRedirectOrigins), ["https://www.moraltrade.org"]);
  requireIncludes(errors, filePath, "requiredProviderRedirectUrls", stringArray(value.requiredProviderRedirectUrls), [
    "https://www.moraltrade.org/auth/confirm",
  ]);
  requireIncludes(errors, filePath, "allowedPostAuthRoutes", stringArray(value.allowedPostAuthRoutes), [
    "/mpgf",
    "/mpgf/contribute",
    "/mpgf/account/contributions",
    "/mpgf/pools/new",
  ]);

  if (value.secureCookiesRequired !== true || value.csrfProtectionRequired !== true) {
    errors.push(issue("auth-session-cookie-csrf", "Production auth/session profile must require secure cookies and CSRF protection.", filePath));
  }

  if (value.supportRouteOrEmail !== "support@moraltrade.org") {
    errors.push(issue("auth-session-support", "Production auth/session supportRouteOrEmail must match participant onboarding and public experience.", filePath));
  }

  return result("validateMpgfProductionAuthSessionProfile", errors);
}

export function validateMpgfWwwSmokeTestProfile() {
  const filePath = "config/mpgf/www-smoke-test-profile.json";
  const requiredKeys = [
    "profileVersion",
    "enabled",
    "authMode",
    "smokeUserRef",
    "demoParticipantRef",
    "allowedRoutes",
    "allowedActions",
    "termsVersion",
    "privacyVersion",
    "eligibilitySnapshotRef",
    "candidateSetSnapshotRef",
    "credentialSource",
    "credentialRotationPolicy",
    "auditLogRequired",
    "rateLimitPolicy",
    "forbiddenActions",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);
  const forbiddenActions = [
    "real_money_contribution",
    "live_ledger_mutation",
    "production_enablement",
    "admin_approval",
    "recipient_accreditation_mutation",
    "recipient_compliance_mutation",
    "payout_destination_mutation",
    "authorization_approval",
    "payout_authorization",
    "external_payout",
  ];

  if (!value) {
    return result("validateMpgfWwwSmokeTestProfile", errors);
  }

  if (value.enabled !== true || value.authMode !== "repository_test_session") {
    errors.push(issue("www-smoke-auth-mode", "WWW smoke-test profile must be enabled with repository_test_session authMode.", filePath));
  }

  const allowedActions = stringArray(value.allowedActions);
  for (const forbiddenAction of forbiddenActions) {
    if (allowedActions.includes(forbiddenAction)) {
      errors.push(issue("www-smoke-forbidden-action", `WWW smoke-test profile allowedActions must not include ${forbiddenAction}.`, filePath));
    }
  }

  if (value.auditLogRequired !== true || value.createsPublicRealUser !== false || value.grantsAdminPermissions !== false) {
    errors.push(issue("www-smoke-safety-flags", "WWW smoke-test profile must require audit logging and avoid public real-user/admin effects.", filePath));
  }

  return result("validateMpgfWwwSmokeTestProfile", errors);
}

export function validateMpgfProductionDeploymentTarget() {
  const filePath = "config/mpgf/production-deployment-target.json";
  const requiredKeys = [
    "version",
    "provider",
    "projectName",
    "projectId",
    "teamOrOrgId",
    "canonicalBaseUrl",
    "canonicalHost",
    "productionEnvironment",
    "sourceRefPolicy",
    "deploymentWorkflow",
    "deploymentStatusCheck",
    "environmentVariableWorkflow",
    "secretManagementWorkflow",
    "requiredEnvironment",
    "requiredSecretsByCapability",
    "productionMigrationWorkflow",
    "productionDatabaseRef",
    "domainBindingEvidencePath",
    "rollbackWorkflow",
    "productionAccessValidationMethod",
    "deploymentApproverRole",
    "requiredEvidencePaths",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);

  if (!value) {
    return result("validateMpgfProductionDeploymentTarget", errors);
  }

  if (value.canonicalBaseUrl !== "https://www.moraltrade.org" || value.canonicalHost !== "www.moraltrade.org") {
    errors.push(issue("production-target-canonical", "Production target must use https://www.moraltrade.org and www.moraltrade.org.", filePath));
  }

  const vercelProject = readJsonIfExists(".vercel/project.json");
  if (vercelProject.ok && isRecord(vercelProject.value)) {
    if (
      value.projectName !== vercelProject.value.projectName ||
      value.projectId !== vercelProject.value.projectId ||
      value.teamOrOrgId !== vercelProject.value.orgId
    ) {
      errors.push(
        issue(
          "production-target-vercel-mismatch",
          "Production target must match .vercel/project.json or document an approved divergence.",
          filePath,
        ),
      );
    }
  }

  requireIncludes(errors, filePath, "requiredEvidencePaths", stringArray(value.requiredEvidencePaths), [
    "docs/mpgf/production-deployment-prerequisites.md",
    "docs/mpgf/www-direct-working-verification.md",
  ]);

  return result("validateMpgfProductionDeploymentTarget", errors);
}

export function validateMpgfSolverSupportProfile() {
  const filePath = "config/mpgf/solver-support-profile.json";
  const requiredKeys = [
    "solverSupportProfileVersion",
    "status",
    "benchmarkEvidencePath",
    "maxAlternatives",
    "maxBallots",
    "maxBreakpointsPerBallot",
    "maxRegions",
    "maxBranchAndBoundNodes",
    "maxCertificateBytes",
    "maxVerifierRuntimeMs",
    "supportsExactPilotComplete",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);

  if (!value) {
    return result("validateMpgfSolverSupportProfile", errors);
  }

  if (value.supportsExactPilotComplete !== false) {
    errors.push(issue("solver-support-exact-pilot", "Direct-working solver support profile must not support exact_pilot_complete.", filePath));
  }

  return result("validateMpgfSolverSupportProfile", errors);
}

function parseIsoDurationSeconds(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;

  return total > 0 ? total : null;
}

export function validateMpgfWwwProductionHealthChecks() {
  const filePath = "config/mpgf/www-production-health-checks.json";
  const requiredKeys = [
    "version",
    "enabledForProductionDomainEvaluation",
    "monitorWindow",
    "sampleIntervalSeconds",
    "minimumMonitorWindowSeconds",
    "minimumSampleCount",
    "maxUnresolvedCriticalIncidents",
    "checks",
    "rollbackPolicy",
  ];
  const { value, errors } = validateRequiredJsonObject(filePath, requiredKeys);

  if (!value) {
    return result("validateMpgfWwwProductionHealthChecks", errors);
  }

  const monitorWindowSeconds = parseIsoDurationSeconds(value.monitorWindow);
  const sampleIntervalSeconds = typeof value.sampleIntervalSeconds === "number" ? value.sampleIntervalSeconds : 0;
  const minimumMonitorWindowSeconds =
    typeof value.minimumMonitorWindowSeconds === "number" ? value.minimumMonitorWindowSeconds : 0;
  const minimumSampleCount = typeof value.minimumSampleCount === "number" ? value.minimumSampleCount : 0;

  if (value.enabledForProductionDomainEvaluation !== true) {
    errors.push(issue("health-checks-enabled", "WWW production health checks must be enabled for production-domain evaluation.", filePath));
  }

  if (monitorWindowSeconds === null) {
    errors.push(issue("health-checks-monitor-window", "monitorWindow must be a positive ISO 8601 duration.", filePath));
  } else {
    if (monitorWindowSeconds < minimumMonitorWindowSeconds) {
      errors.push(issue("health-checks-window-too-short", "monitorWindow must be at least minimumMonitorWindowSeconds.", filePath));
    }

    if (sampleIntervalSeconds > 0 && Math.floor(monitorWindowSeconds / sampleIntervalSeconds) < minimumSampleCount) {
      errors.push(issue("health-checks-sample-count", "monitorWindow and sampleIntervalSeconds must imply minimumSampleCount samples.", filePath));
    }
  }

  if (sampleIntervalSeconds <= 0 || minimumMonitorWindowSeconds <= 0 || minimumSampleCount < 3) {
    errors.push(issue("health-checks-positive-controls", "sampleIntervalSeconds, minimumMonitorWindowSeconds, and minimumSampleCount are below required bounds.", filePath));
  }

  if (value.maxUnresolvedCriticalIncidents !== 0) {
    errors.push(issue("health-checks-critical-incidents", "maxUnresolvedCriticalIncidents must be 0.", filePath));
  }

  if (typeof value.rollbackPolicy !== "string" || value.rollbackPolicy.trim().length === 0) {
    errors.push(issue("health-checks-rollback", "rollbackPolicy is required.", filePath));
  }

  const checks = Array.isArray(value.checks) ? value.checks.filter(isRecord) : [];
  if (checks.length === 0) {
    errors.push(issue("health-checks-empty", "At least one production health check is required.", filePath));
  }

  for (const healthCheck of checks) {
    const checkId = typeof healthCheck.checkId === "string" ? healthCheck.checkId : "unknown";
    for (const key of ["severity", "implementation", "accessControl", "expected", "conformanceRow"]) {
      if (typeof healthCheck[key] !== "string" || String(healthCheck[key]).trim().length === 0) {
        errors.push(issue("health-checks-check-field", `${checkId} is missing ${key}.`, filePath));
      }
    }

    if (typeof healthCheck.timeoutSeconds !== "number" || healthCheck.timeoutSeconds <= 0) {
      errors.push(issue("health-checks-timeout", `${checkId} must have positive timeoutSeconds.`, filePath));
    }
  }

  return result("validateMpgfWwwProductionHealthChecks", errors);
}

export function validateMpgfProductionDeploymentPrerequisites() {
  const errors = [...validateMpgfProductionDeploymentTarget().errors];
  const filePath = "docs/mpgf/production-deployment-prerequisites.md";
  const evidence = readTextIfExists(filePath);

  if (!evidence) {
    errors.push(issue("production-prerequisites-missing", "Production deployment prerequisite evidence is missing.", filePath));
  } else {
    if (!/^Status:\s*passed\b/im.test(evidence)) {
      errors.push(
        issue(
          "production-prerequisites-not-passed",
          "Production deployment prerequisites have not recorded a passed production-domain run.",
          filePath,
        ),
      );
    }

    if (/pending|blocked until|not yet|template ready|blockers:\s*(?!none\b)/i.test(evidence)) {
      errors.push(
        issue(
          "production-prerequisites-pending",
          "Production deployment prerequisites still contain pending or blocked language.",
          filePath,
        ),
      );
    }
  }

  return result("validateMpgfProductionDeploymentPrerequisites", errors);
}

export function validateMpgfStateMachineCoverage() {
  const requiredPaths = [
    "config/mpgf/state-machines.json",
    "config/mpgf/state-machines.schema.json",
    "docs/mpgf/planned-state-machine-table.md",
    "docs/mpgf/status-bearing-object-discovery-report.md",
  ];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("state-machine-artifact", `Missing state-machine coverage artifact ${filePath}.`, filePath));
  const parsed = readJsonIfExists("config/mpgf/state-machines.json");

  if (parsed.ok && isRecord(parsed.value) && isRecord(parsed.value.machines)) {
    const requiredMachineNames = [
      "genesis",
      "cycle",
      "ledger_transaction",
      "payment_intent",
      "contribution",
      "pledge",
      "recurring_contribution_commitment",
      "eligibility_snapshot",
      "candidate_set_snapshot",
      "sybil_review",
      "safe_fallback",
      "pool_risk_assessment",
      "pool",
      "ballot",
      "allocation_plan",
      "authorization",
      "tranche",
      "payout_authorization",
      "refund",
      "receipt",
      "public_cycle_summary",
      "production_enablement",
      "idempotency_key",
      "admin_approval_record",
      "governance_judgment",
      "appeal",
      "conflict_disclosure",
      "emergency_shutdown",
    ];

    for (const machineName of requiredMachineNames) {
      if (!isRecord(parsed.value.machines[machineName])) {
        errors.push(issue("state-machine-missing", `Missing state machine ${machineName}.`, "config/mpgf/state-machines.json"));
      } else {
        const machine = parsed.value.machines[machineName];

        if (!Array.isArray(machine.statuses) || machine.statuses.length === 0) {
          errors.push(issue("state-machine-statuses", `${machineName} must declare statuses.`, "config/mpgf/state-machines.json"));
        }

        if (!Array.isArray(machine.transitions)) {
          errors.push(issue("state-machine-transitions", `${machineName} must declare transitions.`, "config/mpgf/state-machines.json"));
        }
      }
    }
  }

  return result("validateMpgfStateMachineCoverage", errors);
}

export function validateMpgfStatusValueRegistry() {
  const filePath = "config/mpgf/status-value-registry.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "values"]);

  if (!value) {
    return result("validateMpgfStatusValueRegistry", errors);
  }

  if (!isRecord(value.values)) {
    errors.push(issue("status-registry-values", "status-value registry values must be an object.", filePath));
    return result("validateMpgfStatusValueRegistry", errors);
  }

  for (const key of [
    "completion_profile",
    "contribution_mode",
    "public_summary_state",
    "manual_external_payment_evidence",
    "automated_payout_provider",
  ]) {
    const entry = value.values[key];

    if (Array.isArray(entry)) {
      continue;
    }

    if (!isRecord(entry)) {
      errors.push(issue("status-registry-key", `status-value registry missing ${key}.`, filePath));
      continue;
    }

    for (const requiredKey of ["allowedValues", "owner", "conformanceRows", "acceptanceCriteria"]) {
      if (!(requiredKey in entry)) {
        errors.push(issue("status-registry-metadata", `${key} is missing ${requiredKey}.`, filePath));
      }
    }
  }

  return result("validateMpgfStatusValueRegistry", errors);
}

export function validateMpgfStatusCoverage() {
  const state = validateMpgfStateMachineCoverage();
  const registry = validateMpgfStatusValueRegistry();

  return result("validateMpgfStatusCoverage", [...state.errors, ...registry.errors]);
}

const requiredMpgfSchemaTables = [
  "mpgf_admin_approval_records",
  "mpgf_admin_audit_logs",
  "mpgf_allocation_plans",
  "mpgf_appeals",
  "mpgf_authorizations",
  "mpgf_ballot_curves",
  "mpgf_ballots",
  "mpgf_candidate_alternatives",
  "mpgf_candidate_set_snapshot_items",
  "mpgf_candidate_set_snapshots",
  "mpgf_completion_profiles",
  "mpgf_conformance_reports",
  "mpgf_conflict_disclosures",
  "mpgf_contributions",
  "mpgf_cycle_calendars",
  "mpgf_cycle_eligible_voters",
  "mpgf_cycle_valid_voters",
  "mpgf_cycles",
  "mpgf_deterministic_function_traces",
  "mpgf_dry_run_cycles",
  "mpgf_eligibility_snapshots",
  "mpgf_emergency_shutdowns",
  "mpgf_epochs",
  "mpgf_external_payment_evidence",
  "mpgf_genesis",
  "mpgf_governance_judgments",
  "mpgf_idempotency_keys",
  "mpgf_ledger_entries",
  "mpgf_ledger_transactions",
  "mpgf_notifications",
  "mpgf_operational_events",
  "mpgf_outcome_units",
  "mpgf_participant_partition_memberships",
  "mpgf_participant_verifications",
  "mpgf_partition_dimensions",
  "mpgf_partition_groups",
  "mpgf_payment_intents",
  "mpgf_payment_webhook_events",
  "mpgf_payout_authorizations",
  "mpgf_pledges",
  "mpgf_pool_proposals",
  "mpgf_pool_risk_assessments",
  "mpgf_production_enablement",
  "mpgf_public_cycle_summaries",
  "mpgf_public_summaries",
  "mpgf_quorum_results",
  "mpgf_receipts",
  "mpgf_recipient_accreditations",
  "mpgf_recipient_compliance_reviews",
  "mpgf_recipient_payout_destinations",
  "mpgf_recipients",
  "mpgf_recurring_contribution_commitments",
  "mpgf_refunds",
  "mpgf_sae_effect_assessments",
  "mpgf_sae_effect_curves",
  "mpgf_safe_fallbacks",
  "mpgf_state_transition_logs",
  "mpgf_strong_negative_flags",
  "mpgf_strong_negative_results",
  "mpgf_sybil_reviews",
  "mpgf_terms_acceptances",
  "mpgf_tranches",
];

export function validateMpgfSchemaContractCoverage() {
  const migrationPaths = [
    "supabase/migrations/20260507_mpgf_pilot_v0_3.sql",
    "supabase/migrations/20260508_mpgf_pilot_v0_3_contract_tables.sql",
  ];
  const errors: MpgfValidationIssue[] = [];
  const migrationText = migrationPaths
    .map((filePath) => {
      const text = readTextIfExists(...filePath.split("/"));

      if (!text) {
        errors.push(issue("schema-contract-migration-missing", `Missing MPGF migration ${filePath}.`, filePath));
      }

      return text ?? "";
    })
    .join("\n");

  for (const tableName of requiredMpgfSchemaTables) {
    const createTablePattern = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${tableName}\\b`, "i");
    const alterTablePattern = new RegExp(`alter\\s+table\\s+public\\.${tableName}\\b`, "i");

    if (!createTablePattern.test(migrationText) && !alterTablePattern.test(migrationText)) {
      errors.push(issue("schema-contract-table-missing", `Missing MPGF schema contract table ${tableName}.`));
    }
  }

  return result("validateMpgfSchemaContractCoverage", errors);
}

export function validateMpgfRbacPermissionMatrix() {
  const filePath = "config/mpgf/rbac-permission-matrix.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "defaultDeny", "roles", "permissions"]);

  if (!value) {
    return result("validateMpgfRbacPermissionMatrix", errors);
  }

  if (value.defaultDeny !== true) {
    errors.push(issue("rbac-default-deny", "RBAC permission matrix must default deny.", filePath));
  }

  const permissions = Array.isArray(value.permissions) ? value.permissions.filter(isRecord) : [];
  const permissionNames = permissions
    .map((permission) => permission.permission)
    .filter((permission): permission is string => typeof permission === "string");
  requireIncludes(errors, filePath, "permissions.permission", permissionNames, [
    "mpgf.public.read",
    "mpgf.pledge.create",
    "mpgf.pool_proposal.draft",
    "mpgf.admin.read",
    "mpgf.payout_authorization.approve",
    "mpgf.real_money.enable",
  ]);

  return result("validateMpgfRbacPermissionMatrix", errors);
}

export function validateMpgfCopyLibrary() {
  const filePath = "config/mpgf/copy-library.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "policy", "copy"]);

  if (!value) {
    return result("validateMpgfCopyLibrary", errors);
  }

  if (!isRecord(value.copy)) {
    errors.push(issue("copy-library-copy", "copy-library copy must be an object.", filePath));
    return result("validateMpgfCopyLibrary", errors);
  }

  requireIncludes(errors, filePath, "copy", Object.keys(value.copy), minimumPublicExperienceCopyKeys);

  if (isRecord(value.policy) && value.policy.nonRealMoneyLabelRequired !== true) {
    errors.push(issue("copy-library-policy", "copy-library policy must require non-real-money labeling.", filePath));
  }

  return result("validateMpgfCopyLibrary", errors);
}

export function validateMpgfRateLimits() {
  const filePath = "config/mpgf/rate-limits.json";
  const { value, errors } = validateRequiredJsonObject(filePath, [
    "version",
    "defaultDenyWhenMissing",
    "defaultPolicy",
    "limits",
  ]);

  if (!value) {
    return result("validateMpgfRateLimits", errors);
  }

  if (value.defaultDenyWhenMissing !== true) {
    errors.push(issue("rate-limits-default-deny", "Rate limits must default deny when missing.", filePath));
  }

  const defaultPolicy = isRecord(value.defaultPolicy) ? value.defaultPolicy : {};
  for (const key of [
    "publicReadPerIpPerMinute",
    "contributionAttemptsPerUserPerHour",
    "contributionAttemptsPerIpPerHour",
    "pledgesPerUserPerHour",
    "poolProposalSubmissionsPerUserPerDay",
    "ballotDraftSavesPerUserPerHour",
    "ballotFinalSubmissionsPerUserPerCycle",
    "appealsPerUserPerCycle",
    "adminMutationsPerAdminPerHour",
    "publicSummaryCacheSeconds",
    "webhookIdempotencyWindowDays",
  ]) {
    if (typeof defaultPolicy[key] !== "number" || defaultPolicy[key] <= 0) {
      errors.push(issue("rate-limits-default-policy", `Default rate-limit policy missing positive ${key}.`, filePath));
    }
  }

  const limits = Array.isArray(value.limits) ? value.limits.filter(isRecord) : [];
  if (limits.length === 0) {
    errors.push(issue("rate-limits-empty", "At least one MPGF rate limit is required.", filePath));
  }

  for (const limit of limits) {
    if (typeof limit.windowSeconds !== "number" || limit.windowSeconds <= 0) {
      errors.push(issue("rate-limit-window", "Each rate limit requires positive windowSeconds.", filePath));
    }

    if (typeof limit.maxRequests !== "number" || limit.maxRequests <= 0) {
      errors.push(issue("rate-limit-max", "Each rate limit requires positive maxRequests.", filePath));
    }
  }

  return result("validateMpgfRateLimits", errors);
}

export function validateMpgfLegalReadinessArtifacts() {
  const requiredPaths = [
    "docs/mpgf/legal-configuration-manifest.md",
    "docs/mpgf/payment-production-readiness.md",
    "docs/mpgf/privacy-launch-profile.md",
    "docs/mpgf/receipt-template-approval.md",
    "docs/mpgf/data-retention-policy.md",
    "docs/mpgf/launch-readiness-report.md",
    "docs/mpgf/production-claims-and-values-registry.md",
  ];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("legal-readiness-artifact", `Missing legal/readiness artifact ${filePath}.`, filePath));

  return result("validateMpgfLegalReadinessArtifacts", errors);
}

export function validateMpgfPayoutProviderProfile() {
  const filePath = "config/mpgf/payout-provider-profile.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "mode", "automatedPayouts", "manualExternalPaymentEvidence"]);

  if (!value) {
    return result("validateMpgfPayoutProviderProfile", errors);
  }

  if (!isRecord(value.automatedPayouts) || value.automatedPayouts.enabled !== false) {
    errors.push(issue("payout-provider-automated", "Direct-working payout-provider profile must keep automatedPayouts.enabled=false.", filePath));
  }

  if (!isRecord(value.manualExternalPaymentEvidence) || value.manualExternalPaymentEvidence.enabled !== true) {
    errors.push(issue("payout-provider-manual-evidence", "Manual external payment evidence must be configured.", filePath));
  }

  return result("validateMpgfPayoutProviderProfile", errors);
}

export function validateMpgfDataRetentionPolicy() {
  const filePath = "config/mpgf/data-retention-policy.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "mode", "realMoneyPrivateDataEnabled"]);

  if (value && value.realMoneyPrivateDataEnabled !== false) {
    errors.push(issue("data-retention-real-money", "Direct-working data retention policy must keep real-money private data disabled.", filePath));
  }

  return result("validateMpgfDataRetentionPolicy", errors);
}

export function applyMpgfDataRetentionPolicy(now: Date = new Date()) {
  const validation = validateMpgfDataRetentionPolicy();

  if (validation.status !== "passed") {
    return {
      status: "failed" as const,
      appliedAt: now.toISOString(),
      errors: validation.errors,
    };
  }

  return {
    status: "passed" as const,
    appliedAt: now.toISOString(),
    deletedPrivateRealMoneyData: false,
    preservedAuditability: true,
  };
}

export function validateMpgfReceiptTemplateRegistry() {
  const filePath = "config/mpgf/receipt-templates.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "realMoneyReceiptsEnabled", "templates"]);

  if (value && value.realMoneyReceiptsEnabled !== false) {
    errors.push(issue("receipt-real-money", "Direct-working receipt templates must keep real-money receipts disabled.", filePath));
  }

  return result("validateMpgfReceiptTemplateRegistry", errors);
}

export function validateSafeFallbackRegistry() {
  const filePath = "config/mpgf/safe-fallbacks.json";
  const { value, errors } = validateRequiredJsonObject(filePath, ["version", "carryoverOnlyEmptyRegistry", "fallbacks"]);

  if (value && value.carryoverOnlyEmptyRegistry !== false) {
    errors.push(issue("safe-fallback-empty", "Safe fallback registry must not be carryover-only empty.", filePath));
  }

  return result("validateSafeFallbackRegistry", errors);
}

export function validateMpgfPublicCycleSummary() {
  const summary = buildPublicSummary();
  const canonicalSummary = applyMpgfPublicVisibilityFilter(generatePublicCycleSummary());
  const errors: MpgfValidationIssue[] = [];
  const schema = validateRequiredJsonObject("config/mpgf/public-cycle-summary.schema.json", [
    "$schema",
    "title",
    "type",
    "required",
    "properties",
  ]);
  errors.push(...schema.errors);

  for (const key of ["releasedInternalCents", "payoutAuthorizedCents", "externallyPaidCents"] as const) {
    if (!Number.isInteger(summary[key]) || summary[key] < 0) {
      errors.push(issue("public-summary-financial-state", `Public summary ${key} must be a non-negative integer.`));
    }
  }

  for (const key of [
    "taxStatus",
    "taxAdviceStatus",
    "escrowStatus",
    "refundStatus",
    "privacyStatus",
    "ballotFinalityStatus",
    "allocationDisbursementStatus",
  ]) {
    if (typeof summary.disclaimers[key] !== "string" || summary.disclaimers[key].trim().length === 0) {
      errors.push(issue("public-summary-disclaimer", `Public summary missing disclaimer ${key}.`));
    }
  }

  if (canonicalSummary.summarySchemaVersion !== "mpgf-public-cycle-summary-v0.3") {
    errors.push(issue("public-summary-schema-version", "Canonical public cycle summary must use mpgf-public-cycle-summary-v0.3."));
  }

  for (const key of [
    "cycle",
    "mode",
    "budget",
    "nonRealMoney",
    "participation",
    "allocationOutcome",
    "amountsByState",
    "auditSummary",
    "appeals",
    "privacy",
    "disclaimers",
  ]) {
    if (!isRecord(canonicalSummary[key as keyof typeof canonicalSummary])) {
      errors.push(issue("public-summary-canonical-section", `Canonical public cycle summary missing object section ${key}.`));
    }
  }

  if (canonicalSummary.mode.realMoneyEnabled !== false) {
    errors.push(issue("public-summary-real-money", "Direct-working public cycle summary must report realMoneyEnabled=false."));
  }

  if (canonicalSummary.allocationOutcome.ordinaryAllocationUsed !== false) {
    errors.push(issue("public-summary-ordinary-allocation", "Direct-working public cycle summary must not claim ordinary live allocation."));
  }

  for (const key of ["authorizedCents", "releasedInternalCents", "payoutAuthorizedCents", "externallyPaidCents"] as const) {
    if (canonicalSummary.amountsByState[key] !== "0") {
      errors.push(issue("public-summary-amounts-by-state", `Direct-working public cycle summary ${key} must be 0.`));
    }
  }

  for (const key of [
    "pilotStatus",
    "taxStatus",
    "charityEvaluatorStatus",
    "effectivenessStatus",
    "escrowStatus",
    "refundStatus",
    "privacyStatus",
    "ballotFinalityStatus",
    "allocationDisbursementStatus",
  ] as const) {
    if (typeof canonicalSummary.disclaimers[key] !== "string" || canonicalSummary.disclaimers[key].trim().length === 0) {
      errors.push(issue("public-summary-canonical-disclaimer", `Canonical public cycle summary missing ${key}.`));
    }
  }

  return result("validateMpgfPublicCycleSummary", errors);
}

export function validateMpgfAdminApprovalSet(input?: {
  action: string;
  targetType: string;
  targetId?: string;
  targetVersion?: string;
  requiredAt?: Date;
  approvals?: Array<{
    decision: string;
    status: string;
    approverUserId: string;
    approverRole: string;
    targetVersion?: string;
    conflicted?: boolean;
  }>;
}) {
  const errors: MpgfValidationIssue[] = [];

  if (!input) {
    errors.push(issue("admin-approval-input-missing", "Admin approval validation requires action and target input."));
    return result("validateMpgfAdminApprovalSet", errors);
  }

  if (!input.action || !input.targetType) {
    errors.push(issue("admin-approval-target", "Admin approval validation requires action and targetType."));
  }

  if (input.targetType !== "global" && !input.targetVersion) {
    errors.push(issue("admin-approval-target-version", "Admin approval validation fails closed without targetVersion."));
  }

  const validApprovers = new Set<string>();
  for (const approval of input.approvals ?? []) {
    if (
      approval.decision === "approve" &&
      approval.status === "approved" &&
      approval.conflicted !== true &&
      (!input.targetVersion || approval.targetVersion === input.targetVersion)
    ) {
      validApprovers.add(approval.approverUserId);
    }
  }

  if (validApprovers.size === 0) {
    errors.push(issue("admin-approval-empty", "No independent non-conflicted approved approval records satisfy the action."));
  }

  return result("validateMpgfAdminApprovalSet", errors);
}

export function recordMpgfAdminApproval(input: {
  action: string;
  targetType: string;
  targetId?: string;
  targetVersion?: string;
  approverUserId: string;
  approverRole: string;
  decision: "approve" | "reject" | "abstain";
}) {
  return {
    id: `approval-${canonicalMpgfHash(input).slice(0, 16)}`,
    ...input,
    status: input.decision === "approve" ? ("approved" as const) : ("recorded" as const),
    auditLogRequired: true,
  };
}

export function validateMpgfServerConfig() {
  const serverConfig = loadMpgfServerConfig();
  const errors: MpgfValidationIssue[] = [];

  if (serverConfig.realMoneyEnabled) {
    errors.push(issue("server-config-real-money", "MPGF server config blocks real-money mode until real_money_complete passes."));
  }

  if (process.env.NODE_ENV === "production" && serverConfig.baseUrl !== "https://www.moraltrade.org") {
    errors.push(issue("server-config-base-url", "Production MPGF base URL must be https://www.moraltrade.org."));
  }

  return result("validateMpgfServerConfig", errors);
}

export function validateAllocationFeasibility() {
  const allocation = computeExactMpgfAllocation();
  const errors: MpgfValidationIssue[] = [];

  if (allocation.allocatedCents + allocation.carryoverCents !== allocation.budgetCents) {
    errors.push(issue("allocation-feasibility-budget", "Allocation plus carryover must equal budget."));
  }

  if (allocation.lines.some((line) => line.allocationCents < 0)) {
    errors.push(issue("allocation-feasibility-negative", "Allocation lines must be non-negative."));
  }

  return result("validateAllocationFeasibility", errors);
}

export function runMpgfSolverBenchmarks() {
  return result("runMpgfSolverBenchmarks", [
    issue(
      "solver-benchmarks-not-run",
      "Solver benchmark execution is blocked until the formal source lock is verbatim complete.",
      "docs/mpgf/solver-benchmark-report.md",
    ),
  ]);
}

export function validateSolverSupportProfileAgainstBenchmarks() {
  const supportProfile = validateMpgfSolverSupportProfile();
  const errors = [...supportProfile.errors];
  const benchmarkReport = readTextIfExists("docs", "mpgf", "solver-benchmark-report.md");

  if (!benchmarkReport || !/active limits supported/i.test(benchmarkReport)) {
    errors.push(
      issue(
        "solver-benchmark-support-missing",
        "Solver benchmark report does not support active limits for exact_pilot_complete.",
        "docs/mpgf/solver-benchmark-report.md",
      ),
    );
  }

  return result("validateSolverSupportProfileAgainstBenchmarks", errors);
}

function check(id: string, label: string, passed: boolean, evidence: string): MpgfCheckResult {
  return {
    id,
    label,
    status: passed ? "passed" : "failed",
    evidence,
    routeOrAction: id,
    check: label,
    passed,
  };
}

function mpgfAdminRouteExists(section: string) {
  return mpgfAdminSections.includes(section as (typeof mpgfAdminSections)[number]);
}

function currentMpgfEnvironment(): MpgfDirectWorkingResult["environment"] {
  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.MPGF_ENV === "staging") {
    return "staging";
  }

  return "local";
}

export function runMpgfDirectWorkingSmokeTest(baseUrl = "http://localhost:3000"): MpgfDirectWorkingResult {
  const allocation = computeExactMpgfAllocation();
  const publicSummary = buildPublicSummary({ allocation });
  const ledgerTransactions = buildDemoLedgerTransactions();
  const ledgerTemplateTransaction = createMpgfLedgerTransactionFromTemplate({
    transactionType: "payment_succeeded",
    amountCents: 100,
  });
  const oneTimePledge = createMpgfPledgeOnlyRecord({ amountCents: 2500, cadence: "one_time" });
  const monthlyPledge = createMpgfPledgeOnlyRecord({ amountCents: 1000, cadence: "monthly" });
  const poolProposal = draftMpgfPoolProposal({
    title: "Community public-goods evaluation reserve",
    problem: "Many cause areas need shared evidence that different moral views can inspect together.",
  });
  const submittedBallot = submitMpgfDemoBallot(
    Object.fromEntries(demoAlternatives.map((alternative) => [alternative.id, alternative.demoPriorityBps])),
  );
  const validationResults = [
    validateMpgfInstructionMechanicalNormalization(),
    validateRepositoryCapabilityInventory(),
    validateMpgfProtocolParameters(),
    validateLedgerTemplateRegistry(),
    validateLedgerTransactionTemplates(),
    validateMpgfDirectWorkingFixtures(),
    validateMpgfStateMachineCoverage(),
    validateMpgfStatusValueRegistry(),
    validateMpgfSchemaContractCoverage(),
    validateMpgfRbacPermissionMatrix(),
    validateMpgfCopyLibrary(),
    validateMpgfRateLimits(),
    validateMpgfPayoutProviderProfile(),
    validateMpgfDataRetentionPolicy(),
    validateMpgfReceiptTemplateRegistry(),
    validateSafeFallbackRegistry(),
    validateMpgfPublicCycleSummary(),
  ];
  const checks: MpgfCheckResult[] = [
    check(
      "real-money-disabled",
      "Real-money mode is disabled",
      process.env.MPGF_REAL_MONEY_ENABLED !== "true",
      "MPGF_REAL_MONEY_ENABLED is not true in direct-working mode.",
    ),
    check(
      "allocation-exact",
      "Exact integer allocation balances to budget",
      allocation.allocatedCents + allocation.carryoverCents === allocation.budgetCents,
      `${allocation.allocatedCents} allocated from ${allocation.budgetCents} cents.`,
    ),
    check(
      "ledger-balanced",
      "Demo ledger transactions are double-entry balanced",
      ledgerTransactions.every(isLedgerBalanced) && isLedgerBalanced(ledgerTemplateTransaction),
      `${ledgerTransactions.length} non-real-money demo ledger transaction(s) and one declared template transaction checked.`,
    ),
    check(
      "public-summary-safe",
      "Public summary contains only non-real-money financial state",
      publicSummary.externallyPaidCents === 0 &&
        publicSummary.payoutAuthorizedCents === 0 &&
        publicSummary.releasedInternalCents === 0,
      "releasedInternalCents, payoutAuthorizedCents, and externallyPaidCents are all zero.",
    ),
    check(
      "visible-demo-pool",
      "At least one approved demo ordinary-pool alternative is visible",
      demoAlternatives.some((alternative) => alternative.status === "approved_demo"),
      `${demoAlternatives.length} approved demo alternatives configured.`,
    ),
    check(
      "public-routes-mapped",
      "Public MPGF routes are mapped",
      mpgfPublicRoutes.length >= 10,
      mpgfPublicRoutes.join(", "),
    ),
    check(
      "admin-genesis-mapped",
      "Admin genesis route is mapped for gated direct-working inspection",
      mpgfAdminRouteExists("genesis"),
      "/mpgf/admin/genesis is represented by the dynamic admin section route.",
    ),
    check(
      "pledge-record-created",
      "Pledge-only records can be created without provider objects",
      oneTimePledge.status === "pledged" && monthlyPledge.status === "pledged",
      `${oneTimePledge.id}, ${monthlyPledge.id}`,
    ),
    check(
      "pool-proposal-draft-created",
      "Pool proposal draft can be created in proposal fixture",
      poolProposal.status === "draft" && !poolProposal.createsLiveAllocation && !poolProposal.createsPayoutAuthorization,
      poolProposal.id,
    ),
    check(
      "demo-ballot-submitted",
      "Demo ballot can be submitted in ballot fixture",
      submittedBallot.submitted && !submittedBallot.authorizesDisbursement,
      submittedBallot.id,
    ),
    ...validationResults.map((validation) =>
      check(
        validation.validatorName,
        validation.validatorName,
        validation.status === "passed",
        validation.errors.map((error) => error.message).join("; ") || "passed",
      ),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "failed")
    .map((entry) => issue(entry.id, `${entry.label}: ${entry.evidence}`));

  const status = blockers.length === 0 ? "passed" : "failed";
  const generatedAt = new Date().toISOString();

  return {
    passed: status === "passed",
    baseUrl,
    checkedAt: generatedAt,
    environment: currentMpgfEnvironment(),
    featureMode: "pledge_only",
    checks,
    status,
    blockers,
    generatedAt,
  };
}

export function validateMpgfDeploymentEnvironment(mode: "pre_launch" | "completion_gate" = "pre_launch") {
  const errors: MpgfValidationIssue[] = [];
  const baseUrl = process.env.MPGF_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonicalHost = process.env.MPGF_CANONICAL_HOST ?? new URL(baseUrl).host;
  const completionEvidencePaths = [
    "docs/mpgf/www-direct-working-verification.md",
    "docs/mpgf/www-auth-session-verification.md",
    "docs/mpgf/www-public-experience-verification.md",
    "docs/mpgf/www-participant-journey-verification.md",
    "docs/mpgf/www-production-health-monitor.md",
  ];

  if (process.env.MPGF_REAL_MONEY_ENABLED === "true") {
    errors.push(issue("deployment-real-money", "Deployment validation blocks real-money mode until real_money_complete passes."));
  }

  if (process.env.NODE_ENV === "production" && baseUrl !== "https://www.moraltrade.org") {
    errors.push(issue("deployment-base-url", "Production MPGF_PUBLIC_BASE_URL must be https://www.moraltrade.org."));
  }

  if (process.env.NODE_ENV === "production" && canonicalHost !== "www.moraltrade.org") {
    errors.push(issue("deployment-canonical-host", "Production MPGF_CANONICAL_HOST must be www.moraltrade.org."));
  }

  if (mode === "pre_launch") {
    for (const validation of [
      validateMpgfProductionDeploymentTarget(),
      validateMpgfPublicExperienceProfile(),
      validateMpgfProductionAuthSessionProfile(),
      validateMpgfParticipantOnboardingProfile(),
      validateMpgfWwwSmokeTestProfile(),
      validateMpgfWwwProductionHealthChecks(),
    ]) {
      errors.push(...validation.errors);
    }
  }

  if (mode === "completion_gate") {
    errors.push(...validateMpgfProductionDeploymentPrerequisites().errors);

    for (const filePath of [
      "docs/mpgf/production-direct-working-launch-runbook.md",
      ...completionEvidencePaths,
    ]) {
      if (!existsSync(rootPath(filePath))) {
        errors.push(issue("deployment-completion-evidence", `Missing completion-gate evidence ${filePath}.`, filePath));
      }
    }

    for (const filePath of completionEvidencePaths) {
      const evidence = readTextIfExists(filePath);

      if (!evidence) {
        continue;
      }

      if (!/^Status:\s*passed\b/im.test(evidence)) {
        errors.push(
          issue(
            "deployment-completion-evidence-not-passed",
            `Completion-gate evidence ${filePath} is present but has not recorded a passed production-domain run.`,
            filePath,
          ),
        );
      }

      if (/template ready|production browser run not recorded|blocked until|blockers:\s*(?!none\b)/im.test(evidence)) {
        errors.push(
          issue(
            "deployment-completion-evidence-pending",
            `Completion-gate evidence ${filePath} still records a placeholder, blocker, or pending production-domain verification.`,
            filePath,
          ),
        );
      }
    }
  }

  return result(`validateMpgfDeploymentEnvironment:${mode}`, errors);
}

export function runMpgfProductionDirectWorkingLaunch() {
  return result("runMpgfProductionDirectWorkingLaunch", [
    issue(
      "production-launch-not-run",
      "Production direct-working launch has not been executed against https://www.moraltrade.org in this workspace.",
      "docs/mpgf/production-direct-working-launch-runbook.md",
    ),
  ]);
}

export function runMpgfWwwDirectWorkingVerification(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwDirectWorkingVerification", [
    issue(
      "www-direct-working-not-run",
      `Browser-level direct-working verification has not recorded a passed production-domain run for ${baseUrl}.`,
      "docs/mpgf/www-direct-working-verification.md",
    ),
  ]);
}

export function runMpgfWwwAuthSessionVerification(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwAuthSessionVerification", [
    issue(
      "www-auth-session-not-run",
      `Browser-level auth/session verification has not recorded a passed production-domain run for ${baseUrl}.`,
      "docs/mpgf/www-auth-session-verification.md",
    ),
  ]);
}

export function runMpgfWwwParticipantJourneyVerification(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwParticipantJourneyVerification", [
    issue(
      "www-participant-journey-not-run",
      `Browser-level participant journey verification has not recorded a passed production-domain run for ${baseUrl}.`,
      "docs/mpgf/www-participant-journey-verification.md",
    ),
  ]);
}

export function runMpgfWwwPublicExperienceVerification(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwPublicExperienceVerification", [
    issue(
      "www-public-experience-not-run",
      `Browser-level public experience verification has not recorded a passed production-domain run for ${baseUrl}.`,
      "docs/mpgf/www-public-experience-verification.md",
    ),
  ]);
}

export function runMpgfWwwExactPilotDryRunVerification(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwExactPilotDryRunVerification", [
    issue(
      "www-exact-pilot-dry-run-not-run",
      `Production-domain exact-pilot dry-run verification has not recorded a passed run for ${baseUrl}.`,
      "docs/mpgf/www-exact-pilot-dry-run-verification.md",
    ),
  ]);
}

export function runMpgfWwwProductionHealthCheck(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwProductionHealthCheck", [
    issue(
      "www-production-health-check-not-run",
      `Production health check has not recorded a passed run for ${baseUrl}.`,
      "docs/mpgf/www-production-health-monitor.md",
    ),
  ]);
}

export function runMpgfWwwPostLaunchMonitor(baseUrl: "https://www.moraltrade.org" = "https://www.moraltrade.org") {
  return result("runMpgfWwwPostLaunchMonitor", [
    issue(
      "www-post-launch-monitor-not-run",
      `Post-launch production monitor has not recorded a complete observation window for ${baseUrl}.`,
      "docs/mpgf/www-production-health-monitor.md",
    ),
  ]);
}

export function provisionMpgfWwwSmokeTestIdentity() {
  return result("provisionMpgfWwwSmokeTestIdentity", [
    issue(
      "www-smoke-test-identity-not-provisioned",
      "WWW smoke-test identity has not been provisioned from approved production credentials.",
      "config/mpgf/www-smoke-test-profile.json",
    ),
  ]);
}

export function createMpgfWwwSmokeTestSession() {
  return result("createMpgfWwwSmokeTestSession", [
    issue(
      "www-smoke-test-session-not-created",
      "WWW smoke-test session has not been created from approved production smoke-test credentials.",
      "config/mpgf/www-smoke-test-profile.json",
    ),
  ]);
}

export function validateCompletionProfileEvidence(
  profile?: "demo_complete" | "exact_pilot_complete" | "real_money_complete",
  evidenceJson?: unknown,
) {
  const errors: MpgfValidationIssue[] = [];

  if (!profile || !evidenceJson) {
    errors.push(
      issue(
        "completion-profile-evidence-not-produced",
        "Completion profile evidence has not been produced with matching production-domain artifact hashes.",
        "docs/mpgf/completion-profile-evidence-schema.md",
      ),
    );
    return result("validateCompletionProfileEvidence", errors);
  }

  if (!isRecord(evidenceJson)) {
    errors.push(issue("completion-profile-evidence-object", "Completion profile evidence must be a JSON object."));
    return result("validateCompletionProfileEvidence", errors);
  }

  for (const key of [
    "profile",
    "status",
    "evaluatedEnvironment",
    "evaluatedBaseUrl",
    "evidenceGeneratedAt",
    "validatorName",
    "validatorVersion",
    "instructionArtifactPath",
    "instructionArtifactHash",
    "evidenceArtifacts",
    "gateResults",
    "blockers",
  ]) {
    if (!(key in evidenceJson)) {
      errors.push(issue("completion-profile-evidence-key", `Completion profile evidence is missing ${key}.`));
    }
  }

  if (evidenceJson.profile !== profile) {
    errors.push(issue("completion-profile-mismatch", "Completion evidence profile does not match the requested profile."));
  }

  const evaluatedBaseUrl = typeof evidenceJson.evaluatedBaseUrl === "string" ? evidenceJson.evaluatedBaseUrl : "";
  const deployedCommitShaOrBuildId =
    typeof evidenceJson.deployedCommitShaOrBuildId === "string" ? evidenceJson.deployedCommitShaOrBuildId : "";

  if (evidenceJson.productionDomainEvaluation === true) {
    if (evaluatedBaseUrl !== "https://www.moraltrade.org") {
      errors.push(issue("completion-profile-production-url", "Production-domain completion evidence must evaluate https://www.moraltrade.org."));
    }

    if (!deployedCommitShaOrBuildId) {
      errors.push(issue("completion-profile-deployed-build", "Production-domain completion evidence requires deployed commit SHA or build ID."));
    }
  }

  const instructionArtifactPath =
    typeof evidenceJson.instructionArtifactPath === "string" ? evidenceJson.instructionArtifactPath : "";
  const instructionArtifactHash =
    typeof evidenceJson.instructionArtifactHash === "string" ? evidenceJson.instructionArtifactHash : "";
  if (instructionArtifactPath) {
    const artifactText = readTextIfExists(...instructionArtifactPath.split("/"));
    if (!artifactText) {
      errors.push(issue("completion-profile-instruction-artifact", "Instruction artifact path is missing.", instructionArtifactPath));
    } else if (instructionArtifactHash && canonicalMpgfHash(artifactText) !== instructionArtifactHash) {
      errors.push(issue("completion-profile-instruction-hash", "Instruction artifact hash does not match artifact bytes.", instructionArtifactPath));
    }
  }

  const evidenceArtifacts = Array.isArray(evidenceJson.evidenceArtifacts)
    ? evidenceJson.evidenceArtifacts.filter(isRecord)
    : [];
  for (const artifact of evidenceArtifacts) {
    if (artifact.evaluatedBaseUrl && artifact.evaluatedBaseUrl !== evaluatedBaseUrl) {
      errors.push(issue("completion-profile-artifact-url", "Evidence artifact evaluatedBaseUrl disagrees with envelope."));
    }

    if (
      evidenceJson.productionDomainEvaluation === true &&
      artifact.deployedCommitShaOrBuildId &&
      artifact.deployedCommitShaOrBuildId !== deployedCommitShaOrBuildId
    ) {
      errors.push(issue("completion-profile-artifact-build", "Evidence artifact deployed build ID disagrees with envelope."));
    }

    if (typeof artifact.path === "string" && typeof artifact.artifactHash === "string") {
      const artifactText = readTextIfExists(...artifact.path.split("/"));
      if (!artifactText) {
        errors.push(issue("completion-profile-artifact-missing", `Evidence artifact ${artifact.path} is missing.`, artifact.path));
      } else if (canonicalMpgfHash(artifactText) !== artifact.artifactHash) {
        errors.push(issue("completion-profile-artifact-hash", `Evidence artifact hash mismatches ${artifact.path}.`, artifact.path));
      }
    } else if (typeof artifact.artifactHash !== "string") {
      errors.push(issue("completion-profile-artifact-hash-missing", "Evidence artifact hash is missing."));
    }
  }

  return result("validateCompletionProfileEvidence", errors);
}

export function validateMpgfPhaseA() {
  const validators = [
    validateMpgfInstructionMechanicalNormalization(),
    validateFormalMechanismSourceLock(),
    validateRepositoryCapabilityInventory(),
    validateMpgfProtocolParameters(),
    validateLedgerTemplateRegistry(),
    validateLedgerTransactionTemplates(),
    validateMpgfDirectWorkingFixtures(),
    validateRepositoryAdapterDecisions(),
    validateRepoAdaptationMap(),
    validateMpgfStateMachineCoverage(),
    validateMpgfStatusValueRegistry(),
    validateMpgfSchemaContractCoverage(),
    validateMpgfRbacPermissionMatrix(),
    validateMpgfCopyLibrary(),
    validateMpgfRateLimits(),
    validateMpgfLegalReadinessArtifacts(),
    validateMpgfPayoutProviderProfile(),
    validateMpgfDataRetentionPolicy(),
    validateMpgfReceiptTemplateRegistry(),
    validateSafeFallbackRegistry(),
    validateMpgfPublicCycleSummary(),
    validateMpgfPublicExperienceProfile(),
    validateMpgfParticipantOnboardingProfile(),
    validateMpgfProductionAuthSessionProfile(),
    validateMpgfWwwSmokeTestProfile(),
    validateMpgfWwwProductionHealthChecks(),
    validateMpgfProductionDeploymentTarget(),
    validateMpgfSolverSupportProfile(),
  ];
  const errors = validators.flatMap((validator) => validator.errors);

  return result("validateMpgfPhaseA", errors);
}
