import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPublicProfileLocation,
  normalizePublicLocationGranularity,
} from "@/lib/app-data";

const baseProfile = {
  city: "Berkeley",
  region: "California",
  country: "United States",
  public_location_granularity: "hidden",
} as const;

test("public location visibility defaults to hidden", () => {
  assert.equal(normalizePublicLocationGranularity(undefined), "hidden");
  assert.equal(
    formatPublicProfileLocation({
      ...baseProfile,
      public_location_granularity: "hidden",
    }),
    null,
  );
});

test("public location visibility can show country only", () => {
  assert.equal(
    formatPublicProfileLocation({
      ...baseProfile,
      public_location_granularity: "country",
    }),
    "United States",
  );
});

test("public location visibility can show region without city", () => {
  assert.equal(
    formatPublicProfileLocation({
      ...baseProfile,
      public_location_granularity: "region",
    }),
    "California, United States",
  );
});

test("public location visibility can show city when explicitly selected", () => {
  assert.equal(
    formatPublicProfileLocation({
      ...baseProfile,
      public_location_granularity: "city",
    }),
    "Berkeley, California, United States",
  );
});
