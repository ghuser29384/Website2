import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHashEvidence,
  loadManifest,
  validateMaterialization,
} from "./validate-pro-sprint-materialization.mjs";

const clone = (value) => structuredClone(value);

test("complete materialization validates", () => {
  assert.deepEqual(validateMaterialization(loadManifest()), []);
});

test("every external authorization is false", () => {
  for (const [key, value] of Object.entries(loadManifest().authorization)) {
    assert.equal(value, false, key);
  }
});

test("exact base is frozen", () => {
  const manifest = clone(loadManifest());
  manifest.bound_base_sha = "0000000000000000000000000000000000000000";
  assert.ok(validateMaterialization(manifest).includes("bound_base_sha"));
});

test("runtime path is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.files[0] = "src/runtime.ts";
  assert.ok(
    validateMaterialization(manifest).includes("forbidden_path:src/runtime.ts"),
  );
});

test("duplicate manifest path is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.files.push(manifest.files[0]);
  assert.ok(validateMaterialization(manifest).includes("duplicate_files"));
});

test("active reliability effect is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.required_invariants.reliability_has_active_product_effect = true;
  assert.ok(
    validateMaterialization(manifest).includes(
      "invariant:reliability_has_active_product_effect",
    ),
  );
});

test("learned ranking activation is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.required_invariants.learned_ranking_active = true;
  assert.ok(
    validateMaterialization(manifest).includes("invariant:learned_ranking_active"),
  );
});

test("self-classified exemption is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.required_invariants.self_classified_human_subjects_exemption = true;
  assert.ok(
    validateMaterialization(manifest).includes(
      "invariant:self_classified_human_subjects_exemption",
    ),
  );
});

test("DAC default is rejected", () => {
  const manifest = clone(loadManifest());
  manifest.required_invariants.dac_is_default_free_rider_solution = true;
  assert.ok(
    validateMaterialization(manifest).includes(
      "invariant:dac_is_default_free_rider_solution",
    ),
  );
});

test("unexpected diff path is rejected", () => {
  const manifest = loadManifest();
  const changed = [
    ...manifest.files,
    "docs/commitments/pro-sprint-materialization-manifest.v1.json",
    "supabase/migrations/unsafe.sql",
  ];
  assert.ok(
    validateMaterialization(manifest, { changedPaths: changed }).includes(
      "unexpected_diff:supabase/migrations/unsafe.sql",
    ),
  );
});

test("missing expected diff path is rejected", () => {
  const manifest = loadManifest();
  const changed = [
    ...manifest.files.slice(1),
    "docs/commitments/pro-sprint-materialization-manifest.v1.json",
  ];
  assert.ok(
    validateMaterialization(manifest, { changedPaths: changed }).includes(
      `missing_diff:${manifest.files[0]}`,
    ),
  );
});

test("SHA-256 evidence is complete and deterministic", () => {
  const first = buildHashEvidence(loadManifest());
  const second = buildHashEvidence(loadManifest());
  assert.deepEqual(first, second);
  assert.equal(first.algorithm, "sha256");
  assert.equal(first.files.length, 13);
  assert.match(first.canonical_package_sha256, /^[a-f0-9]{64}$/u);
  for (const row of first.files) {
    assert.match(row.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(row.bytes > 0);
  }
});
