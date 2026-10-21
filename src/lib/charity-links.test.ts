import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CHARITY_LINK_MODE,
  getCharityLinkClickMetadata,
  getEligibleCharityLinks,
  isEligibleCharityLink,
  REVIEWED_CHARITY_LINKS,
  type CharityLink,
} from "./charity-links";
import { buildPrivacySafeFunnelEventRecord } from "./growth";

const reviewedAt = new Date("2026-10-02T12:00:00.000Z");
const clone = (): CharityLink => structuredClone(REVIEWED_CHARITY_LINKS.find((charity) => charity.review.status === "approved")!);

test("directory only publishes explicitly reviewed recipient-owned links", () => {
  assert.ok(REVIEWED_CHARITY_LINKS.length > 0);
  assert.equal(getEligibleCharityLinks(reviewedAt).length, 1);
  assert.deepEqual(getEligibleCharityLinks(reviewedAt).map((charity) => charity.id), ["malaria-consortium-uk"]);
  assert.equal(isEligibleCharityLink(REVIEWED_CHARITY_LINKS[0], reviewedAt), false, "AMF stays hidden until actual recipient is verified");
  assert.equal(new Set(REVIEWED_CHARITY_LINKS.map((charity) => charity.id)).size, REVIEWED_CHARITY_LINKS.length);
  for (const charity of getEligibleCharityLinks(reviewedAt)) {
    assert.equal(isEligibleCharityLink(charity, reviewedAt), true);
    assert.equal(new URL(charity.donationUrl).hostname, new URL(charity.websiteUrl).hostname);
    assert.doesNotMatch(charity.donationUrl, /every\.org|stripe\.com|paypal\.com/i);
    assert.ok(charity.registration.sourceUrl.includes("charitycommission.gov.uk"));
  }
});

test("pending, suspended, incomplete, and stale reviews fail closed", () => {
  for (const status of ["pending", "suspended"] as const) {
    const charity = clone();
    charity.review.status = status;
    assert.equal(isEligibleCharityLink(charity, reviewedAt), false);
  }
  for (const field of ["evidence", "recipientNote", "ownershipSourceUrl", "checkedOn", "expiresOn"] as const) {
    const charity = clone();
    charity.review[field] = "";
    assert.equal(isEligibleCharityLink(charity, reviewedAt), false, field);
  }
  for (const date of ["2026-10-01T23:59:59Z", "2027-01-01T00:00:00Z", "invalid"]) {
    assert.equal(isEligibleCharityLink(clone(), new Date(date)), false, date);
  }
  const charity = clone();
  charity.review.expiresOn = "2027-12-31";
  assert.equal(isEligibleCharityLink(charity, reviewedAt), false, "cannot extend review indefinitely");
  charity.review.expiresOn = "2026-11-31";
  assert.equal(isEligibleCharityLink(charity, reviewedAt), false, "invalid calendar date");
  charity.review.expiresOn = "2026-10-02";
  assert.equal(isEligibleCharityLink(charity, reviewedAt), false, "expiry is exclusive at midnight UTC");
  assert.deepEqual(getEligibleCharityLinks(new Date("2027-01-01")), []);
});

test("registration record, HTTPS, exact recipient host, and clean destination are required", () => {
  const original = new URL(clone().donationUrl);
  const invalidUrls = [
    "javascript:alert(1)",
    `http://${original.host}${original.pathname}`,
    "https://www.every.org/againstmalaria",
    `https://${original.host}.evil.example${original.pathname}`,
    `https://evil.example@${original.host}${original.pathname}`,
    `https://${original.host}:444${original.pathname}`,
    `${clone().donationUrl}?redirect=https://evil.example`,
    `${clone().donationUrl}#donation=verified`,
  ];
  for (const donationUrl of invalidUrls) {
    const charity = clone();
    charity.donationUrl = donationUrl;
    assert.equal(isEligibleCharityLink(charity, reviewedAt), false, donationUrl);
  }
  for (const sourceUrl of ["https://example.com/verified", "https://register-of-charities.charitycommission.gov.uk/"]) {
    const charity = clone();
    charity.registration.sourceUrl = sourceUrl;
    assert.equal(isEligibleCharityLink(charity, reviewedAt), false);
  }
  const charity = clone();
  charity.registration.number = "";
  assert.equal(isEligibleCharityLink(charity, reviewedAt), false);
});

test("click telemetry stays unverified and is never a live payment metric", () => {
  const metadata = getCharityLinkClickMetadata();
  const event = buildPrivacySafeFunnelEventRecord({
    eventType: "donation_route_clicked",
    metadata,
    path: "/donate?status=paid&target=arbitrary&amount=100",
    profileId: null,
    referrer: "",
    attribution: null,
  });
  assert.equal(event.event_type, "donation_route_clicked");
  assert.deepEqual(event.metadata, metadata);
  assert.equal(metadata.mode, CHARITY_LINK_MODE);
  assert.equal(metadata.liveMetricEligible, false);
  assert.equal(metadata.resultStatus, "donation_unverified");
  assert.equal(event.path, "/donate");
});

test("public directory and legacy return are isolated from payment and trade state", () => {
  const page = readFileSync("src/app/donate/page.tsx", "utf8");
  const legacyReturn = readFileSync("src/app/donate/confirm/page.tsx", "utf8");
  const tracker = readFileSync("src/components/analytics/funnel-tracker.tsx", "utf8");
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(page, /getEligibleCharityLinks\(\)/);
  assert.match(page, /href=\{charity\.donationUrl\}/);
  assert.match(page, /data-donation-mode=\{CHARITY_LINK_MODE\}/);
  assert.match(page, /No reviewed charity links are available/);
  assert.match(page, /A gift made through these links cannot automatically/);
  assert.match(page, /Opening a link or returning here is not proof of payment/);
  assert.match(page, /referrerPolicy="no-referrer"/);
  assert.doesNotMatch(page, /EveryOrgDonateButton|searchParams|checkout|\.insert\(|\.update\(|<form|donate\/confirm|\/dashboard\/payments/);
  assert.match(legacyReturn, /A return URL is not proof of a donation/);
  assert.match(tracker, /target\.dataset\.donationMode === CHARITY_LINK_MODE/);
  assert.match(tracker, /getCharityLinkClickMetadata\(\)/);
});
