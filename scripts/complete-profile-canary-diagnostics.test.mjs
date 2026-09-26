import assert from "node:assert/strict";
import test from "node:test";
import { isExpectedFirstTimeStandardsAbort } from "../.github/scripts/complete-profile-canary-diagnostics.mjs";

const expectedRecord = Object.freeze({
  url: "https://www.moraltrade.org/moral-trade-input-standards.json",
  method: "GET",
  resourceType: "fetch",
  isNavigationRequest: false,
  errorText: "net::ERR_ABORTED",
  headers: {
    referer: "https://www.moraltrade.org/complete-profile",
  },
});

test("accepts only the standards fetch cancelled by the successful first-time redirect", () => {
  assert.equal(
    isExpectedFirstTimeStandardsAbort(expectedRecord, "first-time-desktop"),
    true,
  );
});

test("does not excuse the same abort in returning-user scenarios", () => {
  for (const flow of ["returning-desktop", "returning-mobile", undefined]) {
    assert.equal(isExpectedFirstTimeStandardsAbort(expectedRecord, flow), false);
  }
});

test("does not excuse other paths, methods, resource types, errors, or navigation requests", () => {
  const variants = [
    { url: "https://www.moraltrade.org/api/profile" },
    { url: "https://www.moraltrade.org/moral-trade-input-standards.json?cache=1" },
    { method: "POST" },
    { resourceType: "document" },
    { errorText: "net::ERR_FAILED" },
    { isNavigationRequest: true },
  ];

  for (const variant of variants) {
    assert.equal(
      isExpectedFirstTimeStandardsAbort(
        { ...expectedRecord, ...variant },
        "first-time-desktop",
      ),
      false,
      JSON.stringify(variant),
    );
  }
});

test("requires a same-origin Moral Trade complete-profile referer", () => {
  const referers = [
    "https://moraltrade.org/complete-profile",
    "https://www.moraltrade.org/walkthrough",
    "https://example.com/complete-profile",
    undefined,
    "not a url",
  ];

  for (const referer of referers) {
    assert.equal(
      isExpectedFirstTimeStandardsAbort(
        {
          ...expectedRecord,
          headers: { referer },
        },
        "first-time-desktop",
      ),
      false,
      String(referer),
    );
  }
});

test("supports the canonical request on either Moral Trade host when origin and referer match", () => {
  const apexRecord = {
    ...expectedRecord,
    url: "https://moraltrade.org/moral-trade-input-standards.json",
    headers: {
      referer: "https://moraltrade.org/complete-profile",
    },
  };

  assert.equal(
    isExpectedFirstTimeStandardsAbort(apexRecord, "first-time-desktop"),
    true,
  );
});
