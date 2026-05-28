import assert from "node:assert/strict";
import test from "node:test";

import {
  isFunnelEventType,
  sanitizeFunnelEventMetadata,
  sanitizeFunnelEventPath,
  sanitizeFunnelEventReferrer,
} from "@/lib/growth";

test("funnel event metadata redacts raw private search and contact-like fields", () => {
  const metadata = sanitizeFunnelEventMetadata({
    causeAreas: ["Animal welfare", "Global poverty", "Animal welfare"],
    email: "person@example.com",
    exampleId: "seed-victoria",
    href: "https://www.moraltrade.org/offers?search=private+wish#section",
    label: "Open person@example.com",
    privateWishText: "I privately want a counterparty to do X.",
    query: "exact private wish phrase",
    search: "search=exact+private+wish&mode=offset",
    sourceNote: "private notes from a source",
  });
  const serialized = JSON.stringify(metadata);

  assert.deepEqual(metadata.causeAreas, ["Animal welfare", "Global poverty"]);
  assert.equal(metadata.exampleId, "seed-victoria");
  assert.equal(metadata.hrefPath, "/offers");
  assert.equal(metadata.label, "Open [redacted-email]");
  assert.equal(metadata.queryPresent, true);
  assert.equal(metadata.queryLengthBucket, "20-99");
  assert.deepEqual(metadata.searchParamKeys, ["search", "mode"]);
  assert.equal(serialized.includes("exact private wish"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("counterparty to do X"), false);
  assert.equal(serialized.includes("private notes"), false);
});

test("performance metric metadata keeps only privacy-safe metric buckets", () => {
  const metadata = sanitizeFunnelEventMetadata({
    metricName: "LCP",
    metricRating: "needs-improvement",
    metricValueBucket: "needs_improvement",
    navigationType: "navigate",
    rawPrivateWishText: "exact private wish should not be stored",
    query: "secret private performance context",
  });
  const serialized = JSON.stringify(metadata);

  assert.equal(isFunnelEventType("performance_metric_recorded"), true);
  assert.equal(metadata.metricName, "LCP");
  assert.equal(metadata.metricRating, "needs-improvement");
  assert.equal(metadata.metricValueBucket, "needs_improvement");
  assert.equal(metadata.navigationType, "navigate");
  assert.equal(metadata.queryPresent, true);
  assert.equal(serialized.includes("exact private wish"), false);
  assert.equal(serialized.includes("secret private performance context"), false);
});

test("funnel event path and referrer sanitizers drop query strings and hashes", () => {
  assert.equal(
    sanitizeFunnelEventPath("/wish-registry?search=secret#details"),
    "/wish-registry",
  );
  assert.equal(
    sanitizeFunnelEventPath("https://www.moraltrade.org/offers/new?template=secret"),
    "/offers/new",
  );
  assert.equal(
    sanitizeFunnelEventReferrer("https://example.org/path/to/page?token=secret#frag"),
    "https://example.org/path/to/page",
  );
});
