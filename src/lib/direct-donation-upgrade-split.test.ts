import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEveryOrgNonprofitIdentity,
  type EveryOrgNonprofitIdentity,
} from "@/lib/direct-donation-upgrade";
import {
  buildDirectDonationUpgradeTermsHashV2,
  DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
} from "@/lib/direct-donation-upgrade-negotiation";
import {
  calculateDirectDonationUpgradeSplit,
  formatDirectDonationUpgradeRedirectPercentage,
  formatDirectDonationUpgradeUsdValue,
  parseDirectDonationUpgradeRedirectPercentage,
  parseDirectDonationUpgradeUsdValue,
} from "@/lib/direct-donation-upgrade-split";

function nonprofit(id: string, name: string, slug: string) {
  return normalizeEveryOrgNonprofitIdentity({
    providerNonprofitId: id,
    name,
    primarySlug: slug,
    ein: "",
    isDisbursable: true,
    profileUrl: `https://www.every.org/${slug}`,
    websiteUrl: "",
    locationAddress: "United States",
    description: `${name} test identity`,
    logoUrl: "",
  });
}

const original = nonprofit("original-id", "Original nonprofit", "original-nonprofit");
const upgraded = nonprofit("upgraded-id", "Upgraded nonprofit", "upgraded-nonprofit");

test("redirect percentages parse to exact integer basis points", () => {
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("0.01"), 1);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("20"), 2_000);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("72.50"), 7_250);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("100"), 10_000);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("100.00"), 10_000);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage(" 20.00 "), 2_000);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("0"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("100.01"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("12.345"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("2.01"), 201);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("99.99"), 9_999);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("01.00"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("1e2"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage(""), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage(".01"), null);

  for (let basisPoints = 1; basisPoints <= 10_000; basisPoints += 1) {
    assert.equal(
      parseDirectDonationUpgradeRedirectPercentage(
        (basisPoints / 100).toFixed(2),
      ),
      basisPoints,
    );
  }
});

test("USD values use one canonical exact-cent lexical parser", () => {
  assert.equal(parseDirectDonationUpgradeUsdValue("10"), 1_000);
  assert.equal(parseDirectDonationUpgradeUsdValue("10.0"), 1_000);
  assert.equal(parseDirectDonationUpgradeUsdValue("10.01"), 1_001);
  assert.equal(parseDirectDonationUpgradeUsdValue(" 50000.00 "), 5_000_000);
  assert.equal(parseDirectDonationUpgradeUsdValue("10."), null);
  assert.equal(parseDirectDonationUpgradeUsdValue("01.00"), null);
  assert.equal(parseDirectDonationUpgradeUsdValue("1e2"), null);
  assert.equal(parseDirectDonationUpgradeUsdValue(""), null);
  assert.equal(formatDirectDonationUpgradeUsdValue(1_001), "$10.01");
});

test("split calculation preserves exact cents and supports a full redirect", () => {
  assert.deepEqual(calculateDirectDonationUpgradeSplit(1_000, 2_000), {
    redirectBasisPoints: 2_000,
    redirectedAmountCents: 200,
    retainedAmountCents: 800,
  });
  assert.deepEqual(calculateDirectDonationUpgradeSplit(1_005, 5_000), {
    redirectBasisPoints: 5_000,
    redirectedAmountCents: 503,
    retainedAmountCents: 502,
  });
  assert.deepEqual(calculateDirectDonationUpgradeSplit(1_001, 5_000), {
    redirectBasisPoints: 5_000,
    redirectedAmountCents: 501,
    retainedAmountCents: 500,
  });
  assert.deepEqual(calculateDirectDonationUpgradeSplit(1_000, 3_333), {
    redirectBasisPoints: 3_333,
    redirectedAmountCents: 333,
    retainedAmountCents: 667,
  });
  assert.deepEqual(calculateDirectDonationUpgradeSplit(200, 5_000), {
    redirectBasisPoints: 5_000,
    redirectedAmountCents: 100,
    retainedAmountCents: 100,
  });
  assert.deepEqual(calculateDirectDonationUpgradeSplit(1_000, 10_000), {
    redirectBasisPoints: 10_000,
    redirectedAmountCents: 1_000,
    retainedAmountCents: 0,
  });
});

test("split calculation rejects provider legs between one cent and ninety-nine cents", () => {
  assert.throws(
    () => calculateDirectDonationUpgradeSplit(100, 5_000),
    /redirected portion must be at least \$1\.00/,
  );
  assert.throws(
    () => calculateDirectDonationUpgradeSplit(99, 10_000),
    /between \$1\.00 and \$50,000\.00/,
  );
  assert.throws(
    () => calculateDirectDonationUpgradeSplit(5_000_001, 10_000),
    /between \$1\.00 and \$50,000\.00/,
  );
  assert.equal(
    calculateDirectDonationUpgradeSplit(5_000_000, 10_000)
      .redirectedAmountCents,
    5_000_000,
  );
  assert.throws(
    () => calculateDirectDonationUpgradeSplit(150, 6_667),
    /remaining with the original recipient must be either \$0\.00 or at least \$1\.00/,
  );
});

test("formatting keeps at most two decimal places", () => {
  assert.equal(formatDirectDonationUpgradeRedirectPercentage(2_000), "20%");
  assert.equal(formatDirectDonationUpgradeRedirectPercentage(7_250), "72.5%");
  assert.equal(formatDirectDonationUpgradeRedirectPercentage(1), "0.01%");
});

test("the v2 terms hash binds the split and matcher counteroffer amount", () => {
  const base = {
    creatorProfileId: "40000000-0000-4000-8000-000000000004",
    creatorAmountCents: 1_000,
    redirectBasisPoints: 2_000,
    matcherAmountCents: 500,
    originalRecipient: original,
    upgradedRecipient: upgraded,
    matchDeadlineAt: "2026-08-20T12:00:00.000Z",
    privacyMode: "public" as const,
    environment: "staging" as const,
    baselineAttestation: "I planned the complete original donation before publishing this offer.",
  };
  const first = buildDirectDonationUpgradeTermsHashV2(base);
  const changedSplit = buildDirectDonationUpgradeTermsHashV2({
    ...base,
    redirectBasisPoints: 5_000,
  });
  const changedMatcherAmount = buildDirectDonationUpgradeTermsHashV2({
    ...base,
    matcherAmountCents: 750,
  });

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, changedSplit);
  assert.notEqual(first, changedMatcherAmount);
  const boundVariants = [
    { ...base, creatorProfileId: "40000000-0000-4000-8000-000000000005" },
    { ...base, creatorAmountCents: 1_100 },
    { ...base, originalRecipient: upgraded, upgradedRecipient: original },
    { ...base, matchDeadlineAt: "2026-08-20T12:00:01.000Z" },
    { ...base, privacyMode: "private_until_completed" as const },
    { ...base, environment: "live" as const },
    { ...base, baselineAttestation: `${base.baselineAttestation} Changed.` },
  ].map(buildDirectDonationUpgradeTermsHashV2);
  assert.equal(new Set([first, changedSplit, changedMatcherAmount, ...boundVariants]).size, 10);
  assert.equal(
    DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
    "direct-donation-upgrade-proposal-v1-2026-08-12",
  );
});

test("the v2 canonical hash matches the database golden vector", () => {
  const fixtureIdentity = (
    seed: EveryOrgNonprofitIdentity,
    identityHash: string,
  ): EveryOrgNonprofitIdentity => ({ ...seed, identityHash });
  assert.equal(
    buildDirectDonationUpgradeTermsHashV2({
      creatorProfileId: "da111111-1111-4111-8111-111111111111",
      creatorAmountCents: 1_000,
      redirectBasisPoints: 2_000,
      matcherAmountCents: 500,
      originalRecipient: fixtureIdentity(original, "1".repeat(64)),
      upgradedRecipient: fixtureIdentity(upgraded, "2".repeat(64)),
      matchDeadlineAt: "2026-08-20T12:34:56.000Z",
      privacyMode: "private_until_completed",
      environment: "staging",
      baselineAttestation: "A frozen baseline attestation for hash parity.",
    }),
    "69bde6bc44dd0d34695fcf35e5513e3862fec820973e3618dc576af750bec04e",
  );
});
