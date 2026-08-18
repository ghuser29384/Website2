import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildHashEvidence,
  EXPECTED_Q_PATHS,
  EXPECTED_R_PATHS,
  loadManifest,
  validateMaterialization,
} from "./validate-pro-sprint-materialization.mjs";

const clone = (value) => structuredClone(value);

test("complete materialization validates", () => {
  assert.deepEqual(validateMaterialization(loadManifest()), []);
});

test("every external authorization is false", () => {
  for (const [key, value] of Object.entries(loadManifest().authorization)) assert.equal(value, false, key);
});

test("materialization base is evidence, not a stale implementation base", () => {
  const manifest = clone(loadManifest());
  manifest.implementation_base_policy.historical_materialization_base_may_be_reused_if_stale = true;
  assert.ok(validateMaterialization(manifest).includes("stale_base_policy"));
});

test("Q and initial R must select one fresh identical implementation base", () => {
  const manifest = clone(loadManifest());
  manifest.implementation_base_policy.Q_and_initial_R_identical_base_required = false;
  assert.ok(validateMaterialization(manifest).includes("identical_Q_R_base"));
});

test("runtime path is rejected from repository-only materialization", () => {
  const manifest = clone(loadManifest());
  manifest.files[0] = "src/runtime.ts";
  assert.ok(validateMaterialization(manifest).includes("forbidden_path:src/runtime.ts"));
});

test("duplicate manifest path is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.files.push(manifest.files[0]);
  assert.ok(validateMaterialization(manifest).includes("duplicate_files"));
});

test("active reliability and learned-ranking effects are rejected", () => {
  const manifest = clone(loadManifest());
  manifest.required_invariants.reliability_has_active_product_effect = true;
  manifest.required_invariants.learned_ranking_active = true;
  const errors = validateMaterialization(manifest);
  assert.ok(errors.includes("invariant:reliability_has_active_product_effect"));
  assert.ok(errors.includes("invariant:learned_ranking_active"));
});

test("self-classified exemption and DAC default are rejected", () => {
  const manifest = clone(loadManifest());
  manifest.required_invariants.self_classified_human_subjects_exemption = true;
  manifest.required_invariants.dac_is_default_free_rider_solution = true;
  const errors = validateMaterialization(manifest);
  assert.ok(errors.includes("invariant:self_classified_human_subjects_exemption"));
  assert.ok(errors.includes("invariant:dac_is_default_free_rider_solution"));
});

test("Q exact allowlist cannot be replaced by a count-only contract", () => {
  const qri = JSON.parse(
    readFileSync(
      new URL("../../docs/commitments/qri-orchestration-contract.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(qri.Q.paths, EXPECTED_Q_PATHS);
  assert.equal(qri.Q.intended_path_count, 10);
});

test("R exact allowlist and Q/R union are frozen", () => {
  const qri = JSON.parse(
    readFileSync(
      new URL("../../docs/commitments/qri-orchestration-contract.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(qri.initial_R.paths, EXPECTED_R_PATHS);
  assert.equal(new Set([...qri.Q.paths, ...qri.initial_R.paths]).size, 23);
  assert.equal(qri.I.exact_union_path_count, 23);
});

test("legacy fulfilment key has an explicit compatibility alias", () => {
  const trust = JSON.parse(
    readFileSync(
      new URL("../../docs/commitments/trust-resolution-v3-contract.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(trust.terminology.legacy_runtime_dimension_key, "fulfilment");
  assert.equal(trust.terminology.alias_required_until_reviewed_migration, true);
});

test("A-to-B decision is distinct from post-B terminal-dyad floor", () => {
  const pilot = JSON.parse(
    readFileSync(
      new URL("../../docs/commitments/zero-dollar-pilot-contract.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(pilot.progression.A_to_B_requires_all_A_dyads_closed_or_explicitly_unresolved, true);
  assert.equal(pilot.progression.A_to_B_is_quantitative_effectiveness_claim, false);
  assert.equal(pilot.progression.post_B_terminal_dyad_floor, 8);
});

test("owner UAT retains exact roles, viewports, stages, and no-money gate", () => {
  const uat = JSON.parse(
    readFileSync(
      new URL("../../docs/commitments/zero-dollar-owner-uat-release-contract.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(uat.roles.length, 7);
  assert.equal(uat.viewports.length, 4);
  assert.equal(uat.stages.length, 13);
  assert.equal(uat.comprehension.questions_per_participant, 7);
  assert.ok(Object.values(uat.no_money_counts).every((value) => value === 0));
  assert.equal(uat.pass_criteria.maximum_result, "uat_pass_not_pilot_authorized");
});

test("M0 comparator is retained and DAC remains non-default", () => {
  const portfolio = JSON.parse(
    readFileSync(
      new URL("../../docs/commitments/free-rider-portfolio-contract.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(portfolio.mechanisms[0].id, "M0");
  assert.equal(portfolio.mechanisms[0].disposition, "plain_donation_comparator_not_primary_solution");
  assert.equal(portfolio.global_decisions.dac_is_default, false);
});

test("unexpected and missing diff paths are rejected", () => {
  const manifest = loadManifest();
  const complete = [...manifest.files, "docs/commitments/pro-sprint-materialization-manifest.v1.json"];
  assert.ok(
    validateMaterialization(manifest, { changedPaths: [...complete, "supabase/migrations/unsafe.sql"] })
      .includes("unexpected_diff:supabase/migrations/unsafe.sql"),
  );
  assert.ok(
    validateMaterialization(manifest, { changedPaths: complete.slice(1) })
      .includes(`missing_diff:${complete[0]}`),
  );
});

test("SHA-256 evidence is complete and deterministic", () => {
  const first = buildHashEvidence(loadManifest());
  const second = buildHashEvidence(loadManifest());
  assert.deepEqual(first, second);
  assert.equal(first.algorithm, "sha256");
  assert.equal(first.files.length, 14);
  assert.match(first.canonical_package_sha256, /^[a-f0-9]{64}$/u);
  for (const row of first.files) {
    assert.match(row.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(row.bytes > 0);
  }
});
