import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoralTradePolicyBundleContract,
  validateMoralTradePolicyBundleContract,
  type MoralTradePolicyBundleContract,
} from "./policy-bundle";

test("policy bundle contract publishes the strict copilot input sources", () => {
  const contract = getMoralTradePolicyBundleContract();
  const validation = validateMoralTradePolicyBundleContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(contract.strictInputBundle.includes("policy_registry"));
  assert.ok(contract.strictInputBundle.includes("prohibited_pattern_registry"));
  assert.ok(contract.strictInputBundle.includes("factor_code_dictionary"));
  assert.ok(contract.strictInputBundle.includes("verification_method_taxonomy"));
  assert.ok(contract.strictInputBundle.includes("redaction_policy"));
  assert.ok(contract.strictInputBundle.includes("evidence_metadata"));
});

test("policy bundle blocks seeded prohibited fixtures and exposes exact reason codes", () => {
  const contract = getMoralTradePolicyBundleContract();

  assert.ok(
    contract.prohibitedPatternRegistry.some(
      (entry) => entry.code === "anti_threat_baseline" && entry.seededFixtureCount > 0,
    ),
  );
  assert.ok(
    contract.prohibitedPatternRegistry.some(
      (entry) => entry.code === "prohibited_illegal_or_fraud" && entry.patternCount > 0,
    ),
  );
  assert.ok(
    contract.prohibitedPatternRegistry.some(
      (entry) => entry.code === "prohibited_doxxing_or_harassment" && entry.patternCount > 0,
    ),
  );
  assert.ok(
    contract.prohibitedPatternRegistry.some(
      (entry) => entry.code === "prohibited_political_campaign_offset" && entry.patternCount > 0,
    ),
  );
  assert.ok(
    contract.prohibitedPatternRegistry.some(
      (entry) => entry.code === "newly_escalated_harmful_behavior" && entry.patternCount > 0,
    ),
  );
});

test("policy bundle publishes factor, verification, redaction, and verification-loop dictionaries", () => {
  const contract = getMoralTradePolicyBundleContract();
  const factorCodes = contract.factorCodeDictionary.map((entry) => entry.code);
  const verificationMethods = contract.verificationMethodTaxonomy.map((entry) => entry.key);
  const redactions = contract.redactionPolicy.map((entry) => entry.key);

  assert.ok(factorCodes.includes("terms_complete"));
  assert.ok(factorCodes.includes("baseline_credibility"));
  assert.ok(factorCodes.includes("cause_area_overlap"));
  assert.ok(factorCodes.includes("purpose_bound_disclosure"));
  assert.ok(verificationMethods.includes("receipt_or_provider_record"));
  assert.ok(verificationMethods.includes("public_log"));
  assert.ok(verificationMethods.includes("baseline_artifact"));
  assert.ok(verificationMethods.includes("manual_review"));
  assert.ok(redactions.includes("exact_private_wishes"));
  assert.ok(redactions.includes("contact_details"));
  assert.ok(redactions.includes("raw_source_notes"));
  assert.ok(redactions.includes("private_feed_payloads"));
  assert.ok(
    contract.verificationLoop
      .filter((step) => step.blocksMatchable)
      .some((step) => step.key === "anti_threat"),
  );
});

test("policy bundle validation fails if strict bundle or redaction policy weakens", () => {
  const contract = getMoralTradePolicyBundleContract();
  const weakened: MoralTradePolicyBundleContract = {
    ...contract,
    strictInputBundle: contract.strictInputBundle.filter(
      (entry) => entry !== "prohibited_pattern_registry",
    ),
    prohibitedPatternRegistry: contract.prohibitedPatternRegistry.map((entry) =>
      entry.code === "anti_threat_baseline"
        ? { ...entry, patternCount: 0, seededFixtureCount: 0 }
        : entry,
    ),
    factorCodeDictionary: contract.factorCodeDictionary.filter(
      (entry) => entry.code !== "purpose_bound_disclosure",
    ),
    verificationMethodTaxonomy: contract.verificationMethodTaxonomy.filter(
      (entry) => entry.key !== "baseline_artifact",
    ),
    redactionPolicy: contract.redactionPolicy.filter(
      (entry) => entry.key !== "private_feed_payloads",
    ),
    verificationLoop: contract.verificationLoop.map((entry) =>
      entry.key === "anti_threat" ? { ...entry, blocksMatchable: false } : entry,
    ),
    contractTests: contract.contractTests.filter(
      (entry) => entry !== "redaction_policy_contract",
    ),
  };
  const validation = validateMoralTradePolicyBundleContract(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("strict-input-bundle-sources")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("prohibited-pattern-registry")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("factor-code-dictionary")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("verification-method-taxonomy")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("redaction-policy")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("verification-loop")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});
