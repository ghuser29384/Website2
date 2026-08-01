import assert from "node:assert/strict";
import test from "node:test";

import { getMoralTradeFundingReadiness } from "@/lib/funding";

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

test("funding defaults to direct-to-charity routes and pledge-only external handoff", () => {
  const readiness = getMoralTradeFundingReadiness(testEnv());

  assert.equal(readiness.mode, "external_charities_only");
  assert.equal(readiness.sponsorStatus, "not_configured");
  assert.equal(readiness.directToCharityAvailable, true);
  assert.equal(readiness.projectFundingAvailable, false);
  assert.equal(readiness.nativeCheckoutAvailable, false);
  assert.equal(readiness.conditionalFundingMode, "pledge_only_external_handoff");
  assert.equal(readiness.sponsor, null);
});

test("fiscal-sponsor mode fails closed when disclosures are incomplete", () => {
  const readiness = getMoralTradeFundingReadiness(
    testEnv({
      MORAL_TRADE_FUNDING_MODE: "fiscal_sponsor",
      FISCAL_SPONSOR_LEGAL_NAME: "Example Sponsor",
    }),
  );

  assert.equal(readiness.mode, "external_charities_only");
  assert.equal(readiness.sponsorStatus, "configuration_incomplete");
  assert.equal(readiness.projectFundingAvailable, false);
  assert.ok(readiness.blockers.length >= 5);
});

test("fiscal-sponsor mode activates only with complete public disclosures", () => {
  const readiness = getMoralTradeFundingReadiness(
    testEnv({
      MORAL_TRADE_FUNDING_MODE: "fiscal_sponsor",
      FISCAL_SPONSOR_LEGAL_NAME: "Example Sponsor",
      FISCAL_SPONSOR_JURISDICTION: "United States — 501(c)(3)",
      FISCAL_SPONSOR_CONTRIBUTION_URL: "https://www.every.org/example-project#/donate",
      FISCAL_SPONSOR_FEE_DISCLOSURE: "Sponsor fee: 10% of incoming project funds.",
      FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE:
        "US charitable receipts are issued by the sponsor; treatment elsewhere depends on donor jurisdiction.",
      FISCAL_SPONSOR_REFUND_POLICY_URL: "https://example.org/refunds",
    }),
  );

  assert.equal(readiness.mode, "fiscal_sponsor");
  assert.equal(readiness.sponsorStatus, "active");
  assert.equal(readiness.projectFundingAvailable, true);
  assert.equal(readiness.nativeCheckoutAvailable, false);
  assert.equal(readiness.sponsor?.legalName, "Example Sponsor");
  assert.equal(readiness.blockers.length, 0);
});

test("fiscal-sponsor mode rejects non-HTTPS contribution and refund URLs", () => {
  const readiness = getMoralTradeFundingReadiness(
    testEnv({
      MORAL_TRADE_FUNDING_MODE: "fiscal_sponsor",
      FISCAL_SPONSOR_LEGAL_NAME: "Example Sponsor",
      FISCAL_SPONSOR_JURISDICTION: "United States — 501(c)(3)",
      FISCAL_SPONSOR_CONTRIBUTION_URL: "http://example.org/donate",
      FISCAL_SPONSOR_FEE_DISCLOSURE: "Sponsor fee disclosed.",
      FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE: "Receipt status disclosed.",
      FISCAL_SPONSOR_REFUND_POLICY_URL: "not-a-url",
    }),
  );

  assert.equal(readiness.projectFundingAvailable, false);
  assert.equal(readiness.sponsorStatus, "configuration_incomplete");
  assert.match(readiness.blockers.join(" "), /HTTPS|valid URL/);
});
