import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_PROFILE_PACKAGE_SCHEMA_VERSION,
  buildBackgroundProfilePackage,
  buildWishProfileImportFromBackgroundPackage,
  isBackgroundProfilePackageV1,
} from "@/lib/background-profile-package";

test("background profile package exports broad preview and metadata without raw private text", () => {
  const packageV1 = buildBackgroundProfilePackage({
    backgroundProfileSignals: [
      {
        allowed_field_key: "capability_tags",
        signal_value: "grantmaking",
        status: "active",
      },
    ],
    exportedAt: "2026-06-01T12:00:00.000Z",
    sourceSummaries: [
      {
        allowed_field_keys: ["cause_priorities"],
        approved_at: "2026-06-01T11:00:00.000Z",
        retention_expires_at: "2026-07-01T00:00:00.000Z",
        source_type: "manual",
        status: "active",
        summary_text: "Call alex@example.org about exact private wish details.",
      },
    ],
    subject: { id: "profile-1", kind: "participant" },
    wishProfile: {
      causes: ["Animal welfare"],
      openness_to_payment: true,
      public_preview: "Open to reviewed donation-offset conversations.",
      share_location: false,
    },
  });
  const serialized = JSON.stringify(packageV1);

  assert.equal(packageV1.schemaVersion, BACKGROUND_PROFILE_PACKAGE_SCHEMA_VERSION);
  assert.deepEqual(packageV1.broadPreview.causeAreas, ["Animal welfare"]);
  assert.deepEqual(packageV1.approvedSignals.capabilityTags, ["grantmaking"]);
  assert.match(packageV1.provenance.exportHash, /^sha256:/);
  assert.match(packageV1.approvedSourceSummaries[0]?.summaryHash ?? "", /^sha256:/);
  assert.equal(serialized.includes("alex@example.org"), false);
  assert.equal(serialized.includes("exact private wish"), false);
  assert.equal(serialized.includes("summary_text"), false);
});

test("background profile package import reconstructs broad preview only", () => {
  const packageV1 = buildBackgroundProfilePackage({
    exportedAt: "2026-06-01T12:00:00.000Z",
    subject: { id: "collective-1", kind: "collective" },
    wishProfile: {
      causes: ["Climate"],
      openness_to_pledges: true,
      public_preview: "A reading group looking for reviewed pledge swaps.",
    },
  });
  const wishProfile = buildWishProfileImportFromBackgroundPackage(packageV1);

  assert.equal(isBackgroundProfilePackageV1(packageV1), true);
  assert.equal(wishProfile.participant_kind, "collective");
  assert.equal(wishProfile.public_preview, "A reading group looking for reviewed pledge swaps.");
  assert.equal("exact_wish" in wishProfile, false);
  assert.equal("contact_email" in wishProfile, false);
});
