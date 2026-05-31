import assert from "node:assert/strict";
import test from "node:test";

import {
  getBackgroundCapabilityGateContract,
  validateBackgroundCapabilityGateContract,
} from "@/lib/background-capability-gates";

test("background capability gate contract covers source, AI, and PET expansion", () => {
  const contract = getBackgroundCapabilityGateContract();
  const validation = validateBackgroundCapabilityGateContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.expansionReady, false);
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.gates.some((gate) => gate.key === "source_connector_imports"));
  assert.ok(contract.gates.some((gate) => gate.key === "ai_shadow_summarization"));
  assert.ok(contract.gates.some((gate) => gate.key === "privacy_preserving_overlap"));
});

test("background capability gates require DPIA, consent, and raw-content boundaries", () => {
  const contract = getBackgroundCapabilityGateContract();

  for (const gate of contract.gates) {
    const gateText = [
      gate.lawfulBasis,
      gate.retentionRule,
      ...gate.currentBlockers,
      ...gate.prohibitedEffects,
      ...gate.requiredBeforeExpansion,
    ].join(" ");

    assert.match(gateText, /DPIA|privacy-design review/i);
    assert.match(gate.lawfulBasis, /consent/i);
    assert.ok(gate.currentBlockers.length > 0);
    assert.ok(gate.requiredBeforeExpansion.length >= 5);
  }

  assert.ok(
    contract.gates.some((gate) =>
      gate.prohibitedEffects.includes("analytics_copy_of_raw_content"),
    ),
  );
  assert.ok(
    contract.gates.some((gate) => gate.prohibitedEffects.includes("raw_private_feed_training")),
  );
});

test("background capability gate validation fails when source connectors skip DPIA", () => {
  const contract = getBackgroundCapabilityGateContract();
  const weakened = {
    ...contract,
    gates: contract.gates.map((gate) =>
      gate.key === "source_connector_imports"
        ? {
            ...gate,
            requiredBeforeExpansion: gate.requiredBeforeExpansion.filter(
              (requirement) => !/DPIA|privacy-design review/i.test(requirement),
            ),
          }
        : gate,
    ),
  };
  const validation = validateBackgroundCapabilityGateContract(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("dpia-required")));
});
