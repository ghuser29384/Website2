import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const manifestPath = "docs/commitments/impact-methodologies-v1/manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expected = new Map([
  ["trade", ["commitments-reciprocal-trade-v1", "trade.json", "sha256:bff759b15853ebb0d8870a24cba0665870d2e2ba285f1eb7f8551573559bfa3f"]],
  ["co_fund", ["commitments-co-fund-v1", "co_fund.json", "sha256:c1f759e224712a07b30bc28a3be6fd714a0a21c32ee8c0a822779f9f706946ef"]],
  ["threshold_funding", ["commitments-threshold-funding-v1", "threshold_funding.json", "sha256:8c915821978c45138467e13e05c96f58d1a695b1206d8a2f95849972899df15c"]],
  ["donation_upgrade", ["commitments-donation-upgrade-v1", "donation_upgrade.json", "sha256:e917387ce26a21e98af936388fd88436782f0c199b986e0a408f46dace600463"]],
  ["threshold_sign_on", ["commitments-threshold-sign-on-v1", "threshold_sign_on.json", "sha256:f292553856e5d6f21aa2673b21158a91f7dc4cbf6464d0e35a3dfeafaebb9eff"]],
  ["donation_redirect", ["commitments-donation-redirect-v1", "donation_redirect.json", "sha256:2e3ee0e9de06e8a254a87cddf33834d557cdb9e5e6f674f639774dca0f8cfe5a"]],
]);

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

assert(
  manifest.bundleSchemaVersion === "moral-trade-impact-methodology-bundle-v1",
  "Unexpected manifest schema.",
);
assert(Array.isArray(manifest.methodologies), "Methodology manifest must contain an array.");
assert(manifest.methodologies.length === expected.size, "Manifest must bind exactly six methodologies.");
assert(
  Array.isArray(manifest.globalApprovalBlockers) && manifest.globalApprovalBlockers.length > 0,
  "Global approval blockers must remain present.",
);
assert(manifest.qaRlsHardening?.environment === "qa_only", "RLS hardening must remain QA-only.");
assert(manifest.qaRlsHardening?.productionApplied === false, "Manifest must not claim production migration.");

const manifestDir = path.dirname(manifestPath);
const seen = new Set();
for (const entry of manifest.methodologies) {
  const mechanism = entry.mechanismFamily;
  const expectedEntry = expected.get(mechanism);
  assert(expectedEntry, `Unexpected mechanism family: ${mechanism}`);
  assert(!seen.has(mechanism), `Duplicate mechanism family: ${mechanism}`);
  seen.add(mechanism);

  const [expectedModelKey, expectedFile, expectedHash] = expectedEntry;
  assert(entry.modelKey === expectedModelKey, `Unexpected manifest model key for ${mechanism}.`);
  assert(entry.methodologyFile === expectedFile, `Unexpected methodology filename for ${mechanism}.`);
  assert(entry.version === 1, `Unexpected manifest version for ${mechanism}.`);
  assert(entry.lifecycleStatus === "under_review", `${mechanism} manifest entry must remain under_review.`);
  assert(
    Array.isArray(entry.approvalBlockers) && entry.approvalBlockers.length > 0,
    `${mechanism} manifest blockers must remain present.`,
  );
  assert(entry.methodologyHash === expectedHash, `${mechanism} manifest hash mismatch.`);

  const wrapper = JSON.parse(fs.readFileSync(path.join(manifestDir, expectedFile), "utf8"));
  assert(wrapper.mechanismFamily === mechanism, `${mechanism} file/wrapper family mismatch.`);
  assert(wrapper.modelKey === expectedModelKey, `${mechanism} file/wrapper model key mismatch.`);
  assert(wrapper.version === 1, `Unexpected file version for ${mechanism}.`);
  assert(wrapper.lifecycleStatus === "under_review", `${mechanism} must remain under_review.`);
  assert(wrapper.approvedAt == null, `${mechanism} must not have approvedAt.`);
  assert(wrapper.activatedAt == null, `${mechanism} must not have activatedAt.`);
  assert(
    Array.isArray(wrapper.approvalBlockers) && wrapper.approvalBlockers.length > 0,
    `${mechanism} file blockers must remain present.`,
  );
  assert(
    JSON.stringify(wrapper.approvalBlockers) === JSON.stringify(entry.approvalBlockers),
    `${mechanism} manifest/file blockers differ.`,
  );
  assert(wrapper.methodology?.mechanismFamily === mechanism, `${mechanism} methodology family mismatch.`);
  assert(wrapper.methodology?.modelKey === expectedModelKey, `${mechanism} methodology model key mismatch.`);

  const actualHash = hashMethodology(wrapper.methodology);
  assert(actualHash === expectedHash, `${mechanism} canonical hash mismatch: ${actualHash}`);
  assert(wrapper.methodologyHash === expectedHash, `${mechanism} declared hash mismatch.`);
  console.log(`${mechanism}|${expectedModelKey}|${expectedFile}|${expectedHash}|under_review`);
}
assert(seen.size === expected.size, "One or more mechanisms are missing.");
console.log("methodology_manifest_valid=true");
