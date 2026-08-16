import assert from "node:assert/strict";
import test from "node:test";

import { qaFixtureIdentities } from "@/lib/direct-donation-upgrade";
import { DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID } from "@/lib/direct-donation-upgrade-data";
import {
  buildDirectSpendingUpgradeBaselineHashes,
  buildDirectSpendingUpgradeEvidenceHash,
  buildDirectSpendingUpgradeTermsHash,
  calculateDirectSpendingUpgradeSplit,
  directSpendingUpgradeCanMintCreatorCredit,
  directSpendingUpgradeIsComplete,
  DIRECT_SPENDING_UPGRADE_BLOCKED_CATEGORIES,
  getDirectSpendingUpgradeConfig,
  rejectBlockedDirectSpendingUpgradeCategory,
  validateDirectSpendingUpgradeBaseline,
} from "@/lib/direct-spending-upgrade";
import { directSpendingUpgradeRenderedQaViewerFixture } from "@/lib/direct-spending-upgrade-data";

const NOW = "2026-08-14T12:00:00.000Z";
const CREATOR = "10000000-0000-4000-8000-000000000001";

function baseline() {
  return validateDirectSpendingUpgradeBaseline({
    creatorProfileId: CREATOR,
    category: "recurring_subscription",
    privateMerchantLabel: "Private streaming service",
    privateDescription:
      "An upcoming optional annual streaming renewal that was planned before this offer.",
    plannedSpendAmountCents: 1_000,
    creatorDiversionAmountCents: 999,
    plannedAction: "cancel",
    evidencePayload: { kind: "renewal_notice", privateLocator: "owner-only" },
    evidenceCapturedAt: NOW,
    safetyAttestations: {
      nonessential: true,
      noMaterialHarm: true,
      planExistedBeforeOffer: true,
      notAlreadyCancelledOrAbandoned: true,
      currentlyAvailableFunds: true,
      notOtherwiseCommittedToDonate: true,
    },
  });
}

test("Spending Upgrade is separately disabled even when Donation Upgrade is ready", () => {
  const shared = {
    DIRECT_DONATION_UPGRADES_ENABLED: "true",
    DIRECT_DONATION_UPGRADE_MODE: "staging",
    DIRECT_DONATION_UPGRADE_QA_FIXTURES: "true",
    EVERY_ORG_WEBHOOK_TOKEN: "token",
    EVERY_ORG_WEBHOOK_PATH_SECRET: "p".repeat(32),
    EVERY_ORG_PARTNER_METADATA_SECRET: "m".repeat(32),
    DIRECT_SPENDING_UPGRADE_FINGERPRINT_SECRET: "f".repeat(32),
  };
  const disabled = getDirectSpendingUpgradeConfig(shared);
  assert.equal(disabled.donationUpgrade.readyForCommitments, true);
  assert.equal(disabled.readyForCommitments, false);
  const enabled = getDirectSpendingUpgradeConfig({
    ...shared,
    DIRECT_SPENDING_UPGRADES_ENABLED: "true",
  });
  assert.equal(enabled.readyForCommitments, true);
});

test("exact-cent spending splits allow a retained spending remainder below one dollar", () => {
  assert.deepEqual(calculateDirectSpendingUpgradeSplit(1_000, 999), {
    plannedSpendAmountCents: 1_000,
    creatorDiversionAmountCents: 999,
    retainedSpendingAmountCents: 1,
    diversionBasisPoints: 9_990,
  });
  assert.deepEqual(calculateDirectSpendingUpgradeSplit(6_000, 4_000), {
    plannedSpendAmountCents: 6_000,
    creatorDiversionAmountCents: 4_000,
    retainedSpendingAmountCents: 2_000,
    diversionBasisPoints: 6_667,
  });
  assert.deepEqual(calculateDirectSpendingUpgradeSplit(6_000, 6_000), {
    plannedSpendAmountCents: 6_000,
    creatorDiversionAmountCents: 6_000,
    retainedSpendingAmountCents: 0,
    diversionBasisPoints: 10_000,
  });
  assert.throws(() => calculateDirectSpendingUpgradeSplit(99, 99));
  assert.throws(() => calculateDirectSpendingUpgradeSplit(1_000, 99));
  assert.throws(() => calculateDirectSpendingUpgradeSplit(1_000, 1_001));
});

test("every essential, harm, and debt category fails closed at the server boundary", () => {
  for (const category of DIRECT_SPENDING_UPGRADE_BLOCKED_CATEGORIES) {
    assert.throws(
      () => rejectBlockedDirectSpendingUpgradeCategory(category),
      /excluded/,
      category,
    );
  }
  assert.equal(
    rejectBlockedDirectSpendingUpgradeCategory("pending_order_or_upgrade"),
    "pending_order_or_upgrade",
  );
});

test("prospective baseline validation requires every safety attestation", () => {
  const valid = baseline();
  assert.equal(valid.split.retainedSpendingAmountCents, 1);
  assert.throws(() =>
    validateDirectSpendingUpgradeBaseline({
      ...valid,
      safetyAttestations: {
        ...valid.safetyAttestations,
        currentlyAvailableFunds: false,
      },
    }),
  );
  assert.throws(() =>
    validateDirectSpendingUpgradeBaseline({
      ...valid,
      evidenceCapturedAt: "invalid",
    }),
  );
  assert.throws(() =>
    validateDirectSpendingUpgradeBaseline({
      ...valid,
      plannedAction: "return" as never,
    }),
  );
});

test("Spending Upgrade terms have a subtype-bound schema and cannot collide with planned-donation terms", () => {
  const validated = baseline();
  const hashes = buildDirectSpendingUpgradeBaselineHashes({
    baseline: validated,
    fingerprintSecret: "f".repeat(32),
  });
  assert.equal(
    hashes.evidenceHash,
    "0b41141890abbf38131a51d6fe4314139b291459785fcc35f4e3de79bb55b3af",
  );
  const spendingHash = buildDirectSpendingUpgradeTermsHash({
    creatorProfileId: CREATOR,
    category: validated.category,
    plannedAction: validated.plannedAction,
    plannedSpendAmountCents: validated.plannedSpendAmountCents,
    creatorDiversionAmountCents: validated.creatorDiversionAmountCents,
    matcherAmountCents: 2_000,
    upgradedRecipient: qaFixtureIdentities()[1],
    matchDeadlineAt: "2026-08-21T12:00:00.000Z",
    privacyMode: "public",
    environment: "staging",
    evidenceHash: hashes.evidenceHash,
    evidenceCapturedAt: validated.evidenceCapturedAt,
    baselineFingerprint: hashes.baselineFingerprint,
  });
  assert.match(spendingHash, /^[0-9a-f]{64}$/);
  assert.notEqual(
    spendingHash,
    "ec09a783e84cae1cd9e7bc0a00482a90ee09069dd139451d03b6b700c471055b",
  );
  const databaseGoldenVector = buildDirectSpendingUpgradeTermsHash({
    creatorProfileId: CREATOR,
    category: "recurring_subscription",
    plannedAction: "cancel",
    plannedSpendAmountCents: 1_000,
    creatorDiversionAmountCents: 999,
    matcherAmountCents: 2_000,
    upgradedRecipient: {
      ...qaFixtureIdentities()[1],
      identityHash: "c".repeat(64),
    },
    matchDeadlineAt: "2026-08-21T12:00:00.000Z",
    privacyMode: "public",
    environment: "staging",
    evidenceHash: "a".repeat(64),
    evidenceCapturedAt: NOW,
    baselineFingerprint: "b".repeat(64),
  });
  assert.equal(
    databaseGoldenVector,
    "5dbd2ba69c8fbc877629cda2e441ad2ec1657e31996008702a3631ca8b5ef579",
  );
  assert.equal(
    buildDirectSpendingUpgradeEvidenceHash({
      offerId: CREATOR,
      evidencePayload: {
        changeKind: "subscription_cancelled",
        privateReference: "owner-only",
      },
      capturedAt: "2026-08-14T13:00:00.000Z",
    }),
    "71cd3eea218e6c1b59d8d6ec47660ffc89fd7221acb0ae3905b3dc378df1296a",
  );
});

test("creator causal credit waits for provider verification and accepted spending evidence", () => {
  for (const status of [
    null,
    "submitted",
    "review_required",
    "rejected",
    "disputed",
    "unavailable",
  ] as const) {
    assert.equal(
      directSpendingUpgradeCanMintCreatorCredit({
        creatorDonationStatus: "verified",
        spendingChangeReviewStatus: status,
        existingCreditCount: 0,
      }),
      false,
    );
  }
  assert.equal(
    directSpendingUpgradeCanMintCreatorCredit({
      creatorDonationStatus: "verified",
      spendingChangeReviewStatus: "accepted",
      existingCreditCount: 0,
    }),
    true,
  );
  assert.equal(
    directSpendingUpgradeCanMintCreatorCredit({
      creatorDonationStatus: "verified",
      spendingChangeReviewStatus: "accepted",
      existingCreditCount: 1,
    }),
    false,
  );
});

test("the offer is complete only when both donations and spending evidence pass", () => {
  assert.equal(
    directSpendingUpgradeIsComplete({
      creatorDonationStatus: "verified",
      matcherDonationStatus: "verified",
      spendingChangeReviewStatus: "accepted",
    }),
    true,
  );
  assert.equal(
    directSpendingUpgradeIsComplete({
      creatorDonationStatus: "defaulted",
      matcherDonationStatus: "verified",
      spendingChangeReviewStatus: "accepted",
    }),
    false,
  );
  assert.equal(
    directSpendingUpgradeIsComplete({
      creatorDonationStatus: "verified",
      matcherDonationStatus: "verified",
      spendingChangeReviewStatus: "review_required",
    }),
    false,
  );
});

test("rendered QA fixtures bind to the authenticated viewer and stay out of production", () => {
  const keys = [
    "DIRECT_DONATION_UPGRADE_RENDERED_QA_BOUND_VIEWER_ID",
    "DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE",
    "DIRECT_DONATION_UPGRADE_QA_FIXTURES",
    "DIRECT_SPENDING_UPGRADE_RENDERED_QA_VIEWER_ID",
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_TARGET_ENV",
  ] as const;
  const original = new Map(keys.map((key) => [key, process.env[key]]));
  const authenticatedViewerId = "a1000000-0000-4000-8000-000000000001";

  try {
    process.env.DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE = "true";
    process.env.DIRECT_DONATION_UPGRADE_QA_FIXTURES = "true";
    process.env.DIRECT_DONATION_UPGRADE_RENDERED_QA_BOUND_VIEWER_ID =
      authenticatedViewerId.toUpperCase();
    process.env.DIRECT_SPENDING_UPGRADE_RENDERED_QA_VIEWER_ID =
      authenticatedViewerId.toUpperCase();
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    delete process.env.VERCEL_TARGET_ENV;

    assert.equal(
      directSpendingUpgradeRenderedQaViewerFixture({
        viewerId: DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID,
        environment: "staging",
      }),
      null,
    );

    const fixture = directSpendingUpgradeRenderedQaViewerFixture({
      viewerId: authenticatedViewerId,
      environment: "staging",
    });
    assert.ok(fixture);
    assert.equal(
      fixture.creatorOffers[0]?.creator_profile_id,
      authenticatedViewerId,
    );
    assert.equal(
      fixture.viewerObligations[0]?.participant_profile_id,
      authenticatedViewerId,
    );

    process.env.VERCEL_TARGET_ENV = "production";
    assert.equal(
      directSpendingUpgradeRenderedQaViewerFixture({
        viewerId: authenticatedViewerId,
        environment: "staging",
      }),
      null,
    );
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
