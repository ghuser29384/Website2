import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string) {
  return readFileSync(path, "utf8");
}

test("project funding fails closed until a fully disclosed fiscal sponsor is active", () => {
  const fundingSource = readRepoFile("src/lib/funding.ts");
  const readinessRoute = readRepoFile("src/app/api/funding/readiness/route.ts");
  const envExample = readRepoFile(".env.example");

  assert.match(fundingSource, /external_charities_only/);
  assert.match(fundingSource, /configuration_incomplete/);
  assert.match(fundingSource, /projectFundingAvailable: false/);
  assert.match(fundingSource, /nativeCheckoutAvailable: false/);
  assert.match(fundingSource, /pledge_only_external_handoff/);
  assert.match(fundingSource, /Fiscal sponsor legal name is missing/);
  assert.match(fundingSource, /Fiscal sponsor contribution URL must use HTTPS/);
  assert.match(readinessRoute, /getMoralTradeFundingReadiness/);
  assert.match(readinessRoute, /cache-control/);
  assert.match(envExample, /MORAL_TRADE_FUNDING_MODE=external_charities_only/);
  assert.match(envExample, /FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE=/);
  assert.match(envExample, /FISCAL_SPONSOR_REFUND_POLICY_URL=/);
});

test("public pages separate direct charity gifts from Moral Trade project support", () => {
  const supportPage = readRepoFile("src/app/support/page.tsx");
  const donatePage = readRepoFile("src/app/donate/page.tsx");
  const statusPage = readRepoFile("src/app/status/page.tsx");
  const siteSource = readRepoFile("src/lib/site.ts");
  const sitemapSource = readRepoFile("src/app/sitemap.ts");

  assert.match(supportPage, /Fund public goods now\. Fund Moral Trade only through an approved sponsor/);
  assert.match(supportPage, /No fiscal sponsor relationship is currently represented as active/);
  assert.match(supportPage, /Do not send money to Moral Trade, its operators, or a personal payment account/);
  assert.match(supportPage, /Contribute through the fiscal sponsor/);
  assert.match(supportPage, /sponsor\.feeDisclosure/);
  assert.match(supportPage, /sponsor\.taxReceiptDisclosure/);
  assert.match(supportPage, /sponsor\.refundPolicyUrl/);
  assert.match(donatePage, /These donations do not fund Moral Trade itself/);
  assert.match(donatePage, /Existing charity is the recipient/);
  assert.match(donatePage, /href="\/support"/);
  assert.match(statusPage, /Project funding remains sponsor-gated/);
  assert.match(statusPage, /fundingReadiness\.projectFundingAvailable/);
  assert.match(siteSource, /href: "\/support", label: "Support"/);
  assert.match(sitemapSource, /getAbsoluteUrl\("\/support"\)/);
});

test("MPGF production surfaces stay non-custodial and pledge-first", () => {
  const consoleSource = readRepoFile("src/components/mpgf/mpgf-console.tsx");
  const frameSource = readRepoFile("src/components/mpgf/mpgf-page-frame.tsx");
  const termsSource = readRepoFile("src/app/mpgf/real-money-terms/page.tsx");
  const mpgfCopy = readRepoFile("src/lib/mpgf/data.ts");
  const everyOrgSource = readRepoFile("src/lib/mpgf/public-goods-every-org.ts");

  assert.match(consoleSource, /storedPaymentCommitmentsEnabled = Boolean\(realMoneyReadiness\?\.ready\)/);
  assert.match(consoleSource, /Production participation is pledge-only and uses external handoff/);
  assert.match(consoleSource, /Native checkout is disabled/);
  assert.match(consoleSource, /Save pledge intent/);
  assert.equal(consoleSource.includes("Save Stripe commitment"), false);
  assert.match(frameSource, /Direct-to-charity or pledge-only/);
  assert.match(frameSource, /Every\.org, a sponsor-backed route when active, or a non-custodial pledge intent/);
  assert.match(termsSource, /No sponsor-backed project route is active/);
  assert.match(termsSource, /The provider or sponsor controls the refund process/);
  assert.match(termsSource, /Monthly project support is disabled until a sponsor approves the route/);
  assert.match(mpgfCopy, /Project funding must use an approved fiscal sponsor/);
  assert.match(everyOrgSource, /External charity donation selected through Moral Trade MPGF/);
});
