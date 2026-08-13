import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEveryOrgNonprofitIdentity,
} from "@/lib/direct-donation-upgrade";
import {
  buildDirectDonationUpgradeTermsHashV2,
  DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
} from "@/lib/direct-donation-upgrade-negotiation";
import {
  calculateDirectDonationUpgradeSplit,
  formatDirectDonationUpgradeRedirectPercentage,
  parseDirectDonationUpgradeRedirectPercentage,
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
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("0"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("100.01"), null);
  assert.equal(parseDirectDonationUpgradeRedirectPercentage("12.345"), null);
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
  assert.match(
    DIRECT_DONATION_UPGRADE_PROPOSAL_COMMITMENT_VERSION,
    /proposal-v1/,
  );
});
