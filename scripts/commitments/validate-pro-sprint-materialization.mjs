import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const manifestPath = resolve(root, "docs/commitments/pro-sprint-materialization-manifest.v1.json");

const MATERIALIZATION_BASE = "7e993158363710e5fe2c3eaa1cbccdb5cd56c235";
const MATERIALIZATION_TREE = "e5283317d448e35106ca0179a267b20087ce0492";
export const EXPECTED_Q_PATHS = [
  ".github/workflows/evidence-payment-release-qa.yml",
  "scripts/evidence-payment-qa-namespace.mjs",
  "scripts/evidence-payment-qa-namespace.test.mjs",
  "scripts/evaluator-core-loop-qa-run-ownership.test.mjs",
  "supabase/tests/evaluator_core_loop_browser_preflight.sql",
  "supabase/tests/evaluator_core_loop_browser_fixture.sql",
  "supabase/tests/evaluator_core_loop_browser_cleanup.sql",
  "supabase/tests/evaluator_core_loop_evidence_authorization.sql",
  "tests/evaluator-core-loop-authenticated.spec.ts",
  "docs/evaluator-core-loop-audit.md"
];
export const EXPECTED_R_PATHS = [
  "src/app/actions.ts",
  "src/app/api/live-now/feedback/route.ts",
  "src/app/api/live-now/feedback/route.test.ts",
  "src/app/trade-review/[milestoneId]/page.tsx",
  "src/components/core-trade/full-navigation-action-form.tsx",
  "src/components/core-trade/trade-agreement-stage-base.tsx",
  "src/components/core-trade/trade-milestone-workflow.tsx",
  "src/components/marketplace/participant-offer-group.tsx",
  "src/lib/evidence-weighted-payment-lifecycle.test.ts",
  "src/lib/marketplace-delta-contract.test.ts",
  "src/lib/trade-evidence-reviewer-rls-contract.test.ts",
  "supabase/migrations/20260814050000_trade_evidence_assigned_reviewer_rls.sql",
  "supabase/migrations/20260815010000_trade_evidence_reviewer_role_aal2.sql"
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

export function loadManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function changedPaths(base) {
  return execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean);
}

export function buildHashEvidence(manifest) {
  const files = [...manifest.files, "docs/commitments/pro-sprint-materialization-manifest.v1.json"]
    .sort()
    .map((path) => {
      const bytes = readFileSync(resolve(root, path));
      return { path, bytes: bytes.length, sha256: sha256(bytes) };
    });
  const canonical = files
    .map((row) => `${row.sha256}  ${row.bytes}  ${row.path}`)
    .join("\n") + "\n";
  return {
    schema_version: "moral-trade-commitments-pro-sprint-hash-evidence-v1",
    algorithm: "sha256",
    files,
    canonical_package_sha256: sha256(Buffer.from(canonical, "utf8")),
  };
}

function exactArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

export function validateMaterialization(manifest, options = {}) {
  const errors = [];
  if (manifest.schema_version !== "moral-trade-commitments-pro-sprint-materialization-v1.1") errors.push("schema_version");
  if (manifest.status !== "repository_only_candidate_not_merged") errors.push("status");
  if (manifest.issue !== 755) errors.push("issue");
  if (manifest.materialization_source_base_sha !== MATERIALIZATION_BASE) errors.push("materialization_source_base_sha");
  if (manifest.materialization_source_base_tree !== MATERIALIZATION_TREE) errors.push("materialization_source_base_tree");
  if (manifest.implementation_base_policy?.fresh_live_main_selected_at_implementation_start !== true) errors.push("fresh_implementation_base");
  if (manifest.implementation_base_policy?.Q_and_initial_R_identical_base_required !== true) errors.push("identical_Q_R_base");
  if (manifest.implementation_base_policy?.historical_materialization_base_may_be_reused_if_stale !== false) errors.push("stale_base_policy");
  if (manifest.hash_policy?.algorithm !== "sha256") errors.push("hash_algorithm");

  const files = manifest.files ?? [];
  if (files.length !== 13) errors.push("file_count");
  if (new Set(files).size !== files.length) errors.push("duplicate_files");
  const allowed = [
    ".github/workflows/commitments-pro-sprint-specification-gates.yml",
    "docs/commitments/",
    "scripts/commitments/",
  ];
  for (const path of files) {
    if (!allowed.some((prefix) => path === prefix || path.startsWith(prefix))) errors.push(`forbidden_path:${path}`);
    if (!existsSync(resolve(root, path))) errors.push(`missing_file:${path}`);
    if (/codex-handoff|local-validation|verification-report|global-critical-path-audit|current-state-reconciliation/u.test(path)) {
      errors.push(`superseded_file:${path}`);
    }
  }

  for (const [key, value] of Object.entries(manifest.authorization ?? {})) {
    if (value !== false) errors.push(`authorization:${key}`);
  }

  const required = manifest.required_invariants ?? {};
  for (const key of [
    "factual_fulfillment_is_additionality",
    "reliability_has_active_product_effect",
    "safety_is_compensatory",
    "raw_evidence_public",
    "learned_ranking_active",
    "participant_specific_causal_credit_active",
    "self_classified_human_subjects_exemption",
    "recruitment_before_written_determination",
    "dac_is_default_free_rider_solution",
    "stale_Q_R_implementation_base_allowed",
  ]) {
    if (required[key] !== false) errors.push(`invariant:${key}`);
  }

  const trust = readJson("docs/commitments/trust-resolution-v3-contract.v1.json");
  if (trust.terminology?.legacy_runtime_dimension_key !== "fulfilment") errors.push("trust_legacy_dimension");
  if (trust.terminology?.alias_required_until_reviewed_migration !== true) errors.push("trust_alias");
  if (!trust.objects?.contextual_reliability?.dimensions?.includes("fulfilment")) errors.push("trust_dimension");
  if (trust.objects?.factual_outcome?.required_separations?.length < 5) errors.push("trust_separation");
  if (trust.objects?.contextual_reliability?.default_ranking_effect !== false) errors.push("trust_ranking_effect");
  if (trust.objects?.additionality?.participant_specific_effect_enabled !== false) errors.push("trust_participant_causal");
  if (trust.objects?.safety_eligibility?.noncompensatory !== true) errors.push("trust_noncompensatory");
  for (const [key, value] of Object.entries(trust.authorization ?? {})) if (value !== false) errors.push(`trust_authorization:${key}`);

  const pilot = readJson("docs/commitments/zero-dollar-pilot-contract.v1.json");
  if (pilot.scope?.money_enabled !== false || pilot.scope?.provider_enabled !== false) errors.push("pilot_money_provider");
  if (pilot.scope?.adult_only !== true || pilot.scope?.public_recruitment !== false) errors.push("pilot_recruitment_scope");
  if (pilot.comprehension_questions !== 7) errors.push("pilot_comprehension");
  if ((pilot.obligation_templates ?? []).length !== 9) errors.push("pilot_obligations");
  if (pilot.progression?.A_to_B_requires_all_A_dyads_closed_or_explicitly_unresolved !== true) errors.push("pilot_A_to_B_closeout");
  if (pilot.progression?.A_to_B_is_quantitative_effectiveness_claim !== false) errors.push("pilot_A_to_B_claim");
  if (pilot.progression?.post_B_terminal_dyad_floor !== 8) errors.push("pilot_post_B_floor");
  if (pilot.authorization?.human_subjects_self_exemption !== false) errors.push("pilot_self_exemption");
  if (pilot.authorization?.recruitment_before_written_determination !== false) errors.push("pilot_early_recruitment");

  const qri = readJson("docs/commitments/qri-orchestration-contract.v1.json");
  if (qri.materialization_source_base !== MATERIALIZATION_BASE) errors.push("qri_materialization_source_base");
  if (qri.implementation_base?.selected_at_implementation_start !== true) errors.push("qri_fresh_base");
  if (qri.implementation_base?.Q_and_initial_R_same_base_required !== true) errors.push("qri_same_base");
  if (qri.implementation_base?.reuse_materialization_source_base_if_stale !== false) errors.push("qri_stale_base");
  if (qri.implementation_base?.exact_sha !== null) errors.push("qri_premature_base");
  if (!exactArray(qri.Q?.paths, EXPECTED_Q_PATHS)) errors.push("qri_Q_paths");
  if (!exactArray(qri.initial_R?.paths, EXPECTED_R_PATHS)) errors.push("qri_R_paths");
  if (qri.Q?.intended_path_count !== EXPECTED_Q_PATHS.length || qri.initial_R?.intended_path_count !== EXPECTED_R_PATHS.length) errors.push("qri_scope_count");
  if (new Set([...EXPECTED_Q_PATHS, ...EXPECTED_R_PATHS]).size !== 23) errors.push("qri_static_union");
  if (qri.I?.Q_R_path_overlap_allowed !== false || qri.I?.exact_union_path_count !== 23) errors.push("qri_union");
  if (qri.I?.must_never_be_merged !== true) errors.push("qri_I_merge");
  if ((qri.sequence ?? []).length < 11) errors.push("qri_sequence");
  for (const [key, value] of Object.entries(qri.authorization ?? {})) if (value !== false) errors.push(`qri_authorization:${key}`);

  const uat = readJson("docs/commitments/zero-dollar-owner-uat-release-contract.v1.json");
  if ((uat.roles ?? []).length !== 7) errors.push("uat_roles");
  if ((uat.distinct_auth_identities ?? []).length !== 6) errors.push("uat_auth_identities");
  const viewports = new Set((uat.viewports ?? []).map((v) => `${v.width}x${v.height}`));
  for (const v of ["1440x1000", "1024x768", "390x844", "320x568"]) if (!viewports.has(v)) errors.push(`uat_viewport:${v}`);
  if ((uat.stages ?? []).length !== 13) errors.push("uat_stages");
  if (uat.comprehension?.questions_per_participant !== 7 || uat.comprehension?.participant_a_required_correct !== 7 || uat.comprehension?.participant_b_required_correct !== 7) errors.push("uat_comprehension");
  if (uat.critical_counts?.canonical_agreements !== 1 || uat.critical_counts?.duplicate_agreements !== 0 || uat.critical_counts?.exit_posts !== 1 || uat.critical_counts?.exit_http_status !== 303) errors.push("uat_counts");
  for (const [key, value] of Object.entries(uat.no_money_counts ?? {})) if (value !== 0) errors.push(`uat_no_money:${key}`);
  if ((uat.cleanup_categories ?? []).length < 24) errors.push("uat_cleanup");
  if (uat.pass_criteria?.P0_findings !== 0 || uat.pass_criteria?.P1_findings !== 0 || uat.pass_criteria?.cleanup_zero_second_run !== true || uat.pass_criteria?.maximum_result !== "uat_pass_not_pilot_authorized") errors.push("uat_pass");
  if ((uat.release_states ?? []).length !== 15) errors.push("uat_release_states");
  for (const [key, value] of Object.entries(uat.authorization_flags ?? {})) if (value !== false) errors.push(`uat_authorization:${key}`);

  const operations = readJson("docs/commitments/pilot-operations-contract.v1.json");
  if (operations.oversight?.qualified_written_determination_required !== true) errors.push("operations_determination");
  if (operations.oversight?.self_classify_exempt !== false) errors.push("operations_self_exemption");
  if (operations.separation?.founder_cannot_override_hard_stop !== true) errors.push("operations_founder_override");
  if (operations.compensation?.may_depend_on_completion !== false) errors.push("operations_contingent_compensation");
  if (operations.consent?.combined_checkbox_allowed !== false) errors.push("operations_consent_bundle");
  if (operations.privacy?.raw_evidence_public !== false) errors.push("operations_raw_evidence");
  if (operations.progression?.hard_failure_can_be_overridden !== false || operations.progression?.A_to_B_and_post_B_distinct !== true) errors.push("operations_progression");
  for (const [key, value] of Object.entries(operations.authorization ?? {})) if (value !== false) errors.push(`operations_authorization:${key}`);

  const freeRider = readJson("docs/commitments/free-rider-portfolio-contract.v1.json");
  const ids = (freeRider.mechanisms ?? []).map((m) => m.id);
  if (!exactArray(ids, Array.from({ length: 13 }, (_, i) => `M${i}`))) errors.push("free_rider_mechanisms");
  if (freeRider.mechanisms?.[0]?.disposition !== "plain_donation_comparator_not_primary_solution") errors.push("free_rider_M0");
  if (freeRider.global_decisions?.dac_is_default !== false) errors.push("free_rider_dac_default");
  if (freeRider.global_decisions?.peer_punishment_enabled !== false) errors.push("free_rider_punishment");
  if (freeRider.global_decisions?.quadratic_funding_requires_prefunded_pool !== true) errors.push("free_rider_qf_pool");
  if (freeRider.global_decisions?.base_experimental_contract !== "provision_point_full_refund") errors.push("free_rider_base");
  for (const [key, value] of Object.entries(freeRider.authorization ?? {})) if (value !== false) errors.push(`free_rider_authorization:${key}`);

  if (options.changedPaths) {
    const expected = new Set([...files, "docs/commitments/pro-sprint-materialization-manifest.v1.json"]);
    const actual = new Set(options.changedPaths);
    for (const path of actual) if (!expected.has(path)) errors.push(`unexpected_diff:${path}`);
    for (const path of expected) if (!actual.has(path)) errors.push(`missing_diff:${path}`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = loadManifest();
  const diffIndex = process.argv.indexOf("--check-diff");
  const evidenceIndex = process.argv.indexOf("--write-evidence");
  const options = {};
  if (diffIndex >= 0) {
    const base = process.argv[diffIndex + 1];
    if (!base) throw new Error("--check-diff requires a base SHA");
    options.changedPaths = changedPaths(base);
  }
  const errors = validateMaterialization(manifest, options);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  const evidence = buildHashEvidence(manifest);
  if (evidenceIndex >= 0) {
    const destination = process.argv[evidenceIndex + 1];
    if (!destination) throw new Error("--write-evidence requires a path");
    writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  }
  console.log(`Commitments materialization valid: ${evidence.files.length} files, package sha256:${evidence.canonical_package_sha256}`);
}
