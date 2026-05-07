import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
  isLedgerBalanced,
} from "./mechanism";
import { demoAlternatives, demoCycle, mpgfPublicRoutes } from "./data";
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

export function validateRepositoryCapabilityInventory() {
  const requiredPaths = [
    "docs/mpgf/repository-capability-inventory.md",
    "docs/mpgf/repository-capability-inventory.json",
    "docs/mpgf/repo-adaptation-map.md",
    "config/mpgf/repo-adaptation-map.json",
    "config/mpgf/protocol-parameters.json",
    "config/mpgf/ledger-template-registry.json",
    "config/mpgf/direct-working-bootstrap.json",
    "config/mpgf/direct-working-fixtures.json",
    "config/mpgf/state-machines.json",
    "config/mpgf/status-value-registry.json",
  ];
  const errors = requiredPaths
    .filter((filePath) => !existsSync(rootPath(filePath)))
    .map((filePath) => issue("missing-repo-artifact", `Missing required repository artifact ${filePath}.`, filePath));

  return result("validateRepositoryCapabilityInventory", errors);
}

export function validateMpgfProtocolParameters() {
  const parsed = readJsonIfExists("config/mpgf/protocol-parameters.json");
  const errors: MpgfValidationIssue[] = [];

  if (!parsed.ok) {
    errors.push(issue("protocol-json", parsed.error ?? "Protocol parameters could not be read."));
    return result("validateMpgfProtocolParameters", errors);
  }

  const value = parsed.value as {
    version?: string;
    currency?: string;
    realMoneyEnabled?: boolean;
    representativeQuorumBps?: number;
    maxAllocationAlternatives?: number;
  };

  if (!value.version) {
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

function check(id: string, label: string, passed: boolean, evidence: string): MpgfCheckResult {
  return {
    id,
    label,
    status: passed ? "passed" : "failed",
    evidence,
  };
}

export function runMpgfDirectWorkingSmokeTest(baseUrl = "http://localhost:3000"): MpgfDirectWorkingResult {
  const allocation = computeExactMpgfAllocation();
  const publicSummary = buildPublicSummary({ allocation });
  const ledgerTransactions = buildDemoLedgerTransactions();
  const validationResults = [
    validateMpgfInstructionMechanicalNormalization(),
    validateRepositoryCapabilityInventory(),
    validateMpgfProtocolParameters(),
    validateLedgerTemplateRegistry(),
    validateMpgfDirectWorkingFixtures(),
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
      ledgerTransactions.every(isLedgerBalanced),
      `${ledgerTransactions.length} non-real-money demo ledger transaction(s) checked.`,
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

  return {
    baseUrl,
    environment: process.env.NODE_ENV ?? "development",
    featureMode: "non_real_money",
    checks,
    status: blockers.length === 0 ? "passed" : "failed",
    blockers,
    generatedAt: new Date().toISOString(),
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

  if (mode === "completion_gate") {
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

export function validateMpgfPhaseA() {
  const validators = [
    validateMpgfInstructionMechanicalNormalization(),
    validateRepositoryCapabilityInventory(),
    validateMpgfProtocolParameters(),
    validateLedgerTemplateRegistry(),
    validateMpgfDirectWorkingFixtures(),
  ];
  const errors = validators.flatMap((validator) => validator.errors);

  return result("validateMpgfPhaseA", errors);
}
