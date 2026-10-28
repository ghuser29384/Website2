import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const manifestPath = "docs/commitments/impact-methodologies-v1/manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expected = new Map([
  [
    "trade",
    [
      "commitments-reciprocal-trade-v2",
      "trade.json",
      "sha256:f1d496d5d4c03197711fd683837ea4b2958e0ac8af2e7e0b2d97c54233c0cef9",
      "sha256:bff759b15853ebb0d8870a24cba0665870d2e2ba285f1eb7f8551573559bfa3f"
    ]
  ],
  [
    "co_fund",
    [
      "commitments-co-fund-v2",
      "co_fund.json",
      "sha256:785eb7a87e2dce2b3009f1fb063d1cf65aa2f47ba39dc690a36ab953b6b75108",
      "sha256:c1f759e224712a07b30bc28a3be6fd714a0a21c32ee8c0a822779f9f706946ef"
    ]
  ],
  [
    "threshold_funding",
    [
      "commitments-threshold-funding-v2",
      "threshold_funding.json",
      "sha256:e21419076cc2beca7b1e6cfb31bec2376098da117d5cffea0fb1bd4d71c7c066",
      "sha256:8c915821978c45138467e13e05c96f58d1a695b1206d8a2f95849972899df15c"
    ]
  ],
  [
    "donation_upgrade",
    [
      "commitments-donation-upgrade-v2",
      "donation_upgrade.json",
      "sha256:0666a06be19229e86bf776ab1b43ef8083d577acbbbed090804cbeab02067eac",
      "sha256:e917387ce26a21e98af936388fd88436782f0c199b986e0a408f46dace600463"
    ]
  ],
  [
    "threshold_sign_on",
    [
      "commitments-threshold-sign-on-v2",
      "threshold_sign_on.json",
      "sha256:d23f1c812d62ad5c6437c90a8cccb40d3d1516fa7b977d89502df874fbc77555",
      "sha256:f292553856e5d6f21aa2673b21158a91f7dc4cbf6464d0e35a3dfeafaebb9eff"
    ]
  ],
  [
    "donation_redirect",
    [
      "commitments-donation-redirect-v2",
      "donation_redirect.json",
      "sha256:af2366a1c6292cb27043cdfe68037be2f8f1e234ac5d8e85bb672be8c0a74c24",
      "sha256:2e3ee0e9de06e8a254a87cddf33834d557cdb9e5e6f674f639774dca0f8cfe5a"
    ]
  ]
]);
const requiredBlockers = [
  "founder_exact_hash_approval_not_recorded",
  "founder_approver_account_not_yet_configured",
  "causal_identification_design_not_validated",
  "empirical_calibration_evidence_not_registered",
  "provisional_confidence_thresholds_not_validated",
  "model_health_not_passing",
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function hashMethodology(methodology) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(methodology)))
    .digest("hex")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
}

function stringArray(value) {
  return Array.isArray(value) && value.every(nonEmptyString);
}

assert(
  manifest.bundleSchemaVersion === "moral-trade-impact-methodology-bundle-v2",
  "Unexpected methodology-bundle schema.",
);
assert(
  manifest.founderReview?.reviewId === 4897881155 &&
    manifest.founderReview?.decision === "changes_required" &&
    manifest.founderReview?.priorHashesApproved === false,
  "The substantive founder-review decision is not bound.",
);
assert(
  manifest.currentMainAtPreparation ===
    "72729d80bec2e4ffa147d6dc56ae703fb3e79293",
  "The exact current-main preparation head is not bound.",
);
assert(
  manifest.currentMainMergeCommit ===
    "e06333b26170a34c56d3d5101ad61acb464f37a3",
  "The exact current-main synchronization commit is not bound.",
);
assert(
  manifest.currentStageApprovalSecurity?.mfaRequired === false &&
    manifest.currentStageApprovalSecurity?.mfaDeferredUntil ===
      "site_high_leverage" &&
    manifest.currentStageApprovalSecurity?.approverRequirement ===
      "authenticated_active_allowlisted_account",
  "Present-stage approval security is not bound.",
);
assert(
  manifest.qualityGatePolicy?.requiredBeforeMerge === true &&
    manifest.qualityGatePolicy?.statusSource ===
      "GitHub Actions on the exact pull-request head" &&
    manifest.qualityGatePolicy?.methodologyApprovalBlocker === false &&
    nonEmptyString(manifest.qualityGatePolicy?.reason),
  "Exact-head CI must remain release evidence rather than a methodology blocker.",
);
assert(
  manifest.methodologyReviewRemediation?.projectRef ===
    "hvmxfjjbdcgjjudmthdz" &&
    manifest.methodologyReviewRemediation?.environment === "qa_only" &&
    manifest.methodologyReviewRemediation?.migrationVersion ===
      "20260810150350" &&
    manifest.methodologyReviewRemediation?.migrationName ===
      "commitments_impact_methodology_review_remediation" &&
    manifest.methodologyReviewRemediation?.normalizedSourceSha256 ===
      "1117861781bb1e3a22a619e5c3f17af5bcd4bf3d352227c41bf513f5850cd34b" &&
    manifest.methodologyReviewRemediation?.status ===
      "applied_and_verified" &&
    manifest.methodologyReviewRemediation?.productionApplied === false,
  "The exact QA methodology-remediation migration is not bound.",
);
assert(
  manifest.methodologyReviewRemediationPrivileges?.projectRef ===
    "hvmxfjjbdcgjjudmthdz" &&
    manifest.methodologyReviewRemediationPrivileges?.environment ===
      "qa_only" &&
    manifest.methodologyReviewRemediationPrivileges?.migrationVersion ===
      "20260810151733" &&
    manifest.methodologyReviewRemediationPrivileges?.migrationName ===
      "commitments_impact_methodology_remediation_privileges" &&
    manifest.methodologyReviewRemediationPrivileges
      ?.normalizedSourceSha256 ===
      "eb69557921cb0c774417cdf5b7cfd83a1f1d75705965af141691438db0a3d9cb" &&
    manifest.methodologyReviewRemediationPrivileges?.status ===
      "applied_and_verified" &&
    manifest.methodologyReviewRemediationPrivileges?.productionApplied ===
      false,
  "The exact QA methodology-remediation privilege migration is not bound.",
);
assert(
  manifest.snapshotOverlapAliasFix?.projectRef ===
    "hvmxfjjbdcgjjudmthdz" &&
    manifest.snapshotOverlapAliasFix?.environment === "qa_only" &&
    manifest.snapshotOverlapAliasFix?.migrationVersion ===
      "20260810152035" &&
    manifest.snapshotOverlapAliasFix?.migrationName ===
      "commitments_impact_snapshot_overlap_alias_fix" &&
    manifest.snapshotOverlapAliasFix?.normalizedSourceSha256 ===
      "8e228fef725277da803d29b491b1f7de2cbc87b6fb59805a58e43942d6a92e5c" &&
    manifest.snapshotOverlapAliasFix?.status === "applied_and_verified" &&
    manifest.snapshotOverlapAliasFix?.productionApplied === false,
  "The exact QA snapshot-overlap alias fix is not bound.",
);
assert(
  Array.isArray(manifest.globalApprovalBlockers) &&
    manifest.globalApprovalBlockers.length > 0,
  "Global approval blockers must remain present.",
);
assert(
  Array.isArray(manifest.methodologies) &&
    manifest.methodologies.length === expected.size,
  "The manifest must bind exactly six methodologies.",
);

const manifestDir = path.dirname(manifestPath);
const seen = new Set();
for (const entry of manifest.methodologies) {
  const mechanism = entry.mechanismFamily;
  const expectedEntry = expected.get(mechanism);
  assert(expectedEntry, `Unexpected mechanism family: ${mechanism}`);
  assert(!seen.has(mechanism), `Duplicate mechanism family: ${mechanism}`);
  seen.add(mechanism);

  const [expectedModelKey, expectedFile, expectedHash, priorHash] = expectedEntry;
  assert(entry.modelKey === expectedModelKey, `${mechanism} model key mismatch.`);
  assert(entry.methodologyFile === expectedFile, `${mechanism} filename mismatch.`);
  assert(entry.version === 2, `${mechanism} must be version 2.`);
  assert(
    entry.lifecycleStatus === "under_review",
    `${mechanism} must remain under_review.`,
  );
  assert(
    entry.methodologyHash === expectedHash,
    `${mechanism} manifest hash mismatch.`,
  );
  assert(
    entry.materialChangeFromMethodologyHash === priorHash,
    `${mechanism} prior methodology hash is not bound.`,
  );
  assert(
    JSON.stringify(entry.approvalBlockers) === JSON.stringify(requiredBlockers),
    `${mechanism} manifest blockers differ from the required fail-closed set.`,
  );

  const wrapperPath = path.join(manifestDir, expectedFile);
  const wrapper = JSON.parse(fs.readFileSync(wrapperPath, "utf8"));
  assert(wrapper.mechanismFamily === mechanism, `${mechanism} wrapper family mismatch.`);
  assert(wrapper.modelKey === expectedModelKey, `${mechanism} wrapper model key mismatch.`);
  assert(wrapper.version === 2, `${mechanism} wrapper version mismatch.`);
  assert(
    wrapper.lifecycleStatus === "under_review",
    `${mechanism} wrapper must remain under_review.`,
  );
  assert(wrapper.approvedAt == null, `${mechanism} must not have approvedAt.`);
  assert(wrapper.activatedAt == null, `${mechanism} must not have activatedAt.`);
  assert(
    wrapper.materialChangeFromMethodologyHash === priorHash,
    `${mechanism} wrapper prior hash mismatch.`,
  );
  assert(
    JSON.stringify(wrapper.approvalBlockers) ===
      JSON.stringify(requiredBlockers),
    `${mechanism} wrapper blockers differ from the required set.`,
  );

  const methodology = wrapper.methodology;
  assert(
    methodology?.schemaVersion ===
      "moral-trade-impact-model-methodology-v1",
    `${mechanism} methodology schema mismatch.`,
  );
  assert(
    methodology?.mechanismFamily === mechanism &&
      methodology?.modelKey === expectedModelKey,
    `${mechanism} methodology identity mismatch.`,
  );
  assert(
    Array.isArray(methodology.estimands) &&
      methodology.estimands.includes("verified_outcome") &&
      !methodology.estimands.includes("verified_additional"),
    `${mechanism} does not separate verified outcome from additionality.`,
  );
  assert(
    methodology.evidenceSemanticsPolicy?.outcomeEvidenceLabel ===
      "verified_outcome" &&
      methodology.evidenceSemanticsPolicy?.additionalityLabel ===
        "assessed_additionality" &&
      methodology.evidenceSemanticsPolicy
        ?.receiptAloneEstablishesAdditionality === false &&
      nonEmptyString(methodology.evidenceSemanticsPolicy?.publicCopyRule),
    `${mechanism} evidence semantics are incomplete.`,
  );
  assert(
    methodology.causalIdentificationPolicy?.designStatus ===
      "specified_not_validated" &&
      nonEmptyString(methodology.causalIdentificationPolicy?.estimand) &&
      nonEmptyStringArray(
        methodology.causalIdentificationPolicy?.admissibleDesigns,
      ) &&
      nonEmptyString(
        methodology.causalIdentificationPolicy?.interferencePolicy,
      ) &&
      nonEmptyString(
        methodology.causalIdentificationPolicy?.overlapAndPositivityPolicy,
      ) &&
      nonEmptyString(
        methodology.causalIdentificationPolicy?.sensitivityAnalysisPolicy,
      ) &&
      methodology.causalIdentificationPolicy?.noDefensibleDesignAction ===
        "withhold_causal_components",
    `${mechanism} causal-identification policy is incomplete or not fail-closed.`,
  );
  assert(
    nonEmptyString(
      methodology.strategicBehaviorPolicy?.baselineAntecedenceRule,
    ) &&
      nonEmptyString(
        methodology.strategicBehaviorPolicy?.strategicTimingRule,
      ) &&
      nonEmptyString(methodology.strategicBehaviorPolicy?.interferenceRule) &&
      nonEmptyString(
        methodology.strategicBehaviorPolicy?.perverseIncentiveRule,
      ) &&
      nonEmptyStringArray(
        methodology.strategicBehaviorPolicy?.manipulationChecks,
      ),
    `${mechanism} strategic-behavior policy is incomplete.`,
  );
  assert(
    methodology.validationPolicy?.thresholdStatus === "provisional" &&
      methodology.validationPolicy?.highConfidenceAllowed === false &&
      nonEmptyStringArray(
        methodology.validationPolicy?.requiredBeforeHighConfidence,
      ),
    `${mechanism} provisional confidence governance is missing.`,
  );
  assert(
    nonEmptyStringArray(methodology.conceptualBasisRefs),
    `${mechanism} conceptual basis must be explicit.`,
  );
  assert(
    stringArray(methodology.calibrationEvidenceRefs) &&
      methodology.calibrationEvidenceRefs.length === 0,
    `${mechanism} must not claim empirical calibration evidence that does not exist.`,
  );
  assert(
    !methodology.conceptualBasisRefs.some((entry) =>
      /^moraltrade:.*calibration-registry/i.test(entry),
    ),
    `${mechanism} conceptual basis contains a purported calibration registry.`,
  );
  assert(
    methodology.aggregationPolicy?.directAndCooperativeNeverSummed ===
      true &&
      methodology.aggregationPolicy
        ?.heterogeneousNativeUnitsRemainSeparate === true &&
      methodology.aggregationPolicy
        ?.directMarginalEffectsDefaultNonAdditive === true &&
      nonEmptyString(
        methodology.aggregationPolicy?.additiveClaimRequirement,
      ) &&
      nonEmptyString(methodology.aggregationPolicy?.overlapHandling),
    `${mechanism} aggregation and overlap policy is incomplete.`,
  );

  const actualHash = hashMethodology(methodology);
  assert(
    actualHash === expectedHash,
    `${mechanism} canonical hash mismatch: ${actualHash}`,
  );
  assert(
    wrapper.methodologyHash === expectedHash,
    `${mechanism} declared hash mismatch.`,
  );
  console.log(
    `${mechanism}|${expectedModelKey}|${expectedFile}|${expectedHash}|under_review|changes_required_remediated`,
  );
}

assert(seen.size === expected.size, "One or more mechanisms are missing.");
console.log("methodology_manifest_valid=true");
