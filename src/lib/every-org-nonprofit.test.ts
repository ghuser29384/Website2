import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEveryOrgDetailsUrl,
  buildEveryOrgIdentitySnapshot,
  buildEveryOrgSearchUrl,
  mapEveryOrgNonprofitDetails,
  mapEveryOrgSearchResults,
  normalizeEveryOrgIdentifier,
  slugFromEveryOrgProfileUrl,
} from "@/lib/every-org-nonprofit";

test("Every.org identifiers normalize from slug, EIN, UUID, and profile URL", () => {
  assert.equal(normalizeEveryOrgIdentifier("givewell-top-charities-fund"), "givewell-top-charities-fund");
  assert.equal(normalizeEveryOrgIdentifier("20-8625442"), "208625442");
  assert.equal(
    normalizeEveryOrgIdentifier("75924760-cd27-4ecc-a9d4-c0660c08961a"),
    "75924760-cd27-4ecc-a9d4-c0660c08961a",
  );
  assert.equal(
    normalizeEveryOrgIdentifier("https://www.every.org/givewell-top-charities-fund/learn"),
    "givewell-top-charities-fund",
  );
  assert.equal(normalizeEveryOrgIdentifier("javascript:alert(1)"), "");
  assert.equal(slugFromEveryOrgProfileUrl("https://example.org/not-every-org"), "");
});

test("Every.org API URLs bind the public key and bounded search size", () => {
  const search = new URL(buildEveryOrgSearchUrl("local health", "public-key", 500));
  assert.equal(search.origin, "https://partners.every.org");
  assert.equal(search.pathname, "/v0.2/search/local%20health");
  assert.equal(search.searchParams.get("apiKey"), "public-key");
  assert.equal(search.searchParams.get("take"), "50");

  const details = new URL(buildEveryOrgDetailsUrl("20-8625442", "public-key"));
  assert.equal(details.pathname, "/v0.2/nonprofit/208625442");
  assert.equal(details.searchParams.get("apiKey"), "public-key");
});

test("search mapping exposes only usable Every.org profile identities", () => {
  const results = mapEveryOrgSearchResults({
    nonprofits: [
      {
        name: "Top Charities Fund",
        profileUrl: "https://www.every.org/givewell-top-charities-fund",
        description: "Highest-priority funding needs among GiveWell top charities.",
        ein: "20-8625442",
        websiteUrl: "https://www.givewell.org/top-charities-fund",
      },
      {
        name: "Wrong host",
        profileUrl: "https://example.org/not-allowed",
        ein: "12-3456789",
      },
      {
        name: "Missing identifier",
        profileUrl: "https://www.every.org/",
      },
    ],
  });

  assert.deepEqual(results, [
    {
      identifier: "208625442",
      name: "Top Charities Fund",
      description: "Highest-priority funding needs among GiveWell top charities.",
      ein: "208625442",
      slug: "givewell-top-charities-fund",
      profileUrl: "https://www.every.org/givewell-top-charities-fund",
      websiteUrl: "https://www.givewell.org/top-charities-fund",
    },
  ]);
});

test("details mapping and frozen snapshots preserve exact provider identity", () => {
  const identity = mapEveryOrgNonprofitDetails({
    data: {
      nonprofit: {
        id: "75924760-cd27-4ecc-a9d4-c0660c08961a",
        name: "Homeward Pet Adoption Center",
        primarySlug: "homewardpet",
        ein: "91-1526803",
        isDisbursable: true,
        description: "Animal protection and welfare.",
        locationAddress: "WOODINVILLE, WA",
        nteeCode: "D20",
        profileUrl: "https://www.every.org/homewardpet",
        websiteUrl: "http://www.homewardpet.org",
      },
    },
  });

  assert.ok(identity);
  assert.equal(identity.ein, "911526803");
  assert.equal(identity.primarySlug, "homewardpet");
  assert.equal(identity.isDisbursable, true);
  assert.deepEqual(buildEveryOrgIdentitySnapshot(identity), {
    schemaVersion: "every-org-nonprofit-identity-v1",
    provider: "every_org",
    providerNonprofitId: "75924760-cd27-4ecc-a9d4-c0660c08961a",
    nonprofitSlug: "homewardpet",
    displayName: "Homeward Pet Adoption Center",
    nonprofitEin: "911526803",
    isDisbursable: true,
    profileUrl: "https://www.every.org/homewardpet",
    websiteUrl: "http://www.homewardpet.org/",
    description: "Animal protection and welfare.",
    locationAddress: "WOODINVILLE, WA",
    nteeCode: "D20",
  });
});

test("details mapping rejects incomplete or non-Every.org identities", () => {
  assert.equal(
    mapEveryOrgNonprofitDetails({
      data: {
        nonprofit: {
          id: "not-a-uuid",
          name: "Incomplete",
          primarySlug: "incomplete",
          profileUrl: "https://www.every.org/incomplete",
        },
      },
    }),
    null,
  );
  assert.equal(
    mapEveryOrgNonprofitDetails({
      data: {
        nonprofit: {
          id: "75924760-cd27-4ecc-a9d4-c0660c08961a",
          name: "Wrong host",
          primarySlug: "wrong-host",
          profileUrl: "https://example.org/wrong-host",
        },
      },
    }),
    null,
  );
});
