import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_OPT_OUT_COOKIE_NAME,
  ATTRIBUTION_COOKIE_NAME,
  buildPrivacySafeSearchMetadata,
  buildPrivacySafeFunnelEventRecord,
  isAnalyticsOptedOut,
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
    private_wish: "should not keep sensitive parameter names",
    privateWishText: "I privately want a counterparty to do X.",
    query: "exact private wish phrase",
    search: "search=exact+private+wish&mode=offset&private_wish=secret",
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
  assert.equal(serialized.includes("private_wish"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("counterparty to do X"), false);
  assert.equal(serialized.includes("private notes"), false);
});

test("privacy-safe search metadata exposes only parameter keys and query buckets", () => {
  const metadata = buildPrivacySafeSearchMetadata(
    "search=exact+private+wish+about+a+counterparty&mode=offset&private_wish=secret",
  );
  const sanitized = sanitizeFunnelEventMetadata(metadata);
  const serialized = JSON.stringify(sanitized);

  assert.deepEqual(metadata, {
    queryLengthBucket: "20-99",
    queryPresent: true,
    searchParamKeys: ["search", "mode"],
  });
  assert.deepEqual(sanitized, metadata);
  assert.equal(serialized.includes("exact private wish"), false);
  assert.equal(serialized.includes("counterparty"), false);
  assert.equal(serialized.includes("private_wish"), false);
  assert.equal(serialized.includes("secret"), false);
});

test("server funnel event records sanitize metadata, paths, and attribution referrers", () => {
  const record = buildPrivacySafeFunnelEventRecord({
    attribution: {
      anonymousId: "anon-person@example.com",
      partnerSlug: "EA NYC",
      referralCode: "REF-private@example.com",
      referrer: "https://source.example/path?private_wish=secret#frag",
      utmCampaign: "launch",
      utmContent: "button",
      utmMedium: "email",
      utmSource: "newsletter",
      utmTerm: "exact private wish",
    },
    eventType: "detail_request_submitted",
    metadata: {
      contactEmail: "person@example.com",
      query: "exact private wish about a counterparty",
      sourceNote: "raw note from private feed",
      step: "request",
    },
    path: "/background-networking?search=exact+wish#private",
    profileId: "profile-1",
  });
  const serialized = JSON.stringify(record);

  assert.equal(record.event_type, "detail_request_submitted");
  assert.deepEqual(record.metadata, {
    queryPresent: true,
    queryLengthBucket: "20-99",
    step: "request",
  });
  assert.equal(record.path, "/background-networking");
  assert.equal(record.referrer, "https://source.example/path");
  assert.equal(record.utm_term, "");
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("raw note"), false);
  assert.equal(serialized.includes("exact private wish about"), false);
  assert.equal(serialized.includes("?search="), false);
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

test("marketplace measurement metadata keeps template ids and filter buckets without raw search text", () => {
  const metadata = sanitizeFunnelEventMetadata({
    contactEmail: "person@example.com",
    filterKeys: ["mode", "cause", "private_wish"],
    liveMetricEligible: false,
    marketplaceTab: "worked_examples",
    query: "exact private wish about a counterparty",
    routeFamily: "marketplace",
    search: "q=secret&mode=offset&source_note=raw",
    sourceNote: "raw note from private feed",
    template: "pure-opposed-cause",
    templateKind: "donation_offset",
  });
  const serialized = JSON.stringify(metadata);

  assert.equal(isFunnelEventType("marketplace_tab_viewed"), true);
  assert.equal(isFunnelEventType("marketplace_filter_applied"), true);
  assert.equal(isFunnelEventType("marketplace_seed_template_selected"), true);
  assert.equal(isFunnelEventType("marketplace_create_from_template_started"), true);
  assert.equal(isFunnelEventType("marketplace_intake_triage_routed"), true);
  assert.equal(isFunnelEventType("marketplace_public_receipt_previewed"), true);
  assert.equal(isFunnelEventType("marketplace_claim_correction_requested"), true);
  assert.deepEqual(metadata.filterKeys, ["mode", "cause"]);
  assert.equal(metadata.liveMetricEligible, false);
  assert.equal(metadata.marketplaceTab, "worked_examples");
  assert.equal(metadata.queryPresent, true);
  assert.equal(metadata.queryLengthBucket, "20-99");
  assert.deepEqual(metadata.searchParamKeys, ["q", "mode"]);
  assert.equal(metadata.template, "pure-opposed-cause");
  assert.equal(metadata.templateKind, "donation_offset");
  assert.equal(serialized.includes("exact private wish"), false);
  assert.equal(serialized.includes("source_note"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("raw note"), false);
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

test("analytics opt-out cookie is separate from attribution and accepts only explicit values", () => {
  assert.equal(ANALYTICS_OPT_OUT_COOKIE_NAME, "mt_analytics_opt_out");
  assert.equal(ATTRIBUTION_COOKIE_NAME, "mt_attribution");
  assert.notEqual(ANALYTICS_OPT_OUT_COOKIE_NAME, ATTRIBUTION_COOKIE_NAME);
  assert.equal(isAnalyticsOptedOut("1"), true);
  assert.equal(isAnalyticsOptedOut("true"), true);
  assert.equal(isAnalyticsOptedOut("0"), false);
  assert.equal(isAnalyticsOptedOut(undefined), false);
});
