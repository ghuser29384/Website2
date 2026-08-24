import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEveryOrgTradeDonationUrl,
  createTradeDonationPartnerMetadata,
  evaluateEveryOrgTradeDonationWebhook,
  getTradeDonationProviderConfig,
  getTradeDonationTarget,
  parseUsdToCents,
  verifyTradeDonationPartnerMetadata,
  type TradeDonationIntentRow,
  type TradeDonationProviderConfig,
  type TradeDonationTermRow,
} from "@/lib/trade-donation";

const secret = "metadata-secret-that-is-at-least-thirty-two-characters";
const donateLinkWebhookToken = "public-pledge-donate-link-token";
const partnerWebhookAuthorizationToken =
  "private-pledge-partner-webhook-authorization-token";
const term: TradeDonationTermRow = {
  id: "11111111-1111-4111-8111-111111111111",
  agreement_id: "22222222-2222-4222-8222-222222222222",
  agreement_version_id: "33333333-3333-4333-8333-333333333333",
  payer_role: "responder",
  provider: "every_org",
  target_id: "against-malaria-foundation",
  target_name: "The Against Malaria Foundation",
  nonprofit_slug: "againstmalaria",
  nonprofit_ein: "203069841",
  amount_cents: 1000,
  currency: "USD",
  frequency: "ONCE",
  connector_terms_hash: "hash",
  source_label: "GiveWell research",
  source_url: "https://www.givewell.org/charities/amf",
  source_checked_at: "2026-07-22",
  created_by: "44444444-4444-4444-8444-444444444444",
  created_at: "2026-07-22T00:00:00.000Z",
 };
const intent: TradeDonationIntentRow = {
  id: "55555555-5555-4555-8555-555555555555",
  donation_term_id: term.id,
  agreement_id: term.agreement_id,
  agreement_version_id: term.agreement_version_id,
  payer_user_id: "66666666-6666-4666-8666-666666666666",
  provider: "every_org",
  partner_donation_id: "77777777-7777-4777-8777-777777777777",
  status: "checkout_started",
  expected_target_id: term.target_id,
  expected_target_name: term.target_name,
  expected_nonprofit_slug: term.nonprofit_slug,
  expected_nonprofit_ein: term.nonprofit_ein,
  expected_amount_cents: term.amount_cents,
  expected_currency: "USD",
  expected_frequency: "ONCE",
  provider_charge_id_hash: "",
  provider_payload_hash: "",
  provider_amount_cents: null,
  provider_currency: "",
  provider_nonprofit_slug: "",
  provider_nonprofit_ein: "",
  provider_donation_date: null,
  provider_payment_method: "",
  failure_code: "",
  failure_message: "",
  checkout_started_at: "2026-07-22T00:00:00.000Z",
  completed_at: null,
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
};

const config: TradeDonationProviderConfig = {
  requestedEnabled: true,
  ready: true,
  environment: "staging",
  donateLinkWebhookToken,
  partnerWebhookAuthorizationTokenConfigured: true,
  partnerWebhookAuthorizationContract: "authorization_bearer_v1",
  webhookRouteId: "webhook-route-id-that-is-long-enough",
  metadataSecret: secret,
  blockers: [],
};

test("USD parsing is exact to cents", () => {
  assert.equal(parseUsdToCents("10"), 1000);
  assert.equal(parseUsdToCents("10.5"), 1050);
  assert.equal(parseUsdToCents("10.05"), 1005);
  assert.equal(parseUsdToCents("10.005"), null);
  assert.equal(parseUsdToCents("1e2"), null);
});

test("partner metadata is signed and tamper evident", () => {
  const metadata = createTradeDonationPartnerMetadata({
    agreementId: term.agreement_id,
    agreementVersionId: term.agreement_version_id,
    donationTermId: term.id,
    donationIntentId: intent.id,
    partnerDonationId: intent.partner_donation_id,
    metadataSecret: secret,
  });
  assert.equal(
    verifyTradeDonationPartnerMetadata(
      metadata,
      {
        agreementId: term.agreement_id,
        agreementVersionId: term.agreement_version_id,
        donationTermId: intent.donation_term_id,
        donationIntentId: intent.id,
        partnerDonationId: intent.partner_donation_id,
      },
      secret,
    ),
    true,
  );
  assert.equal(
    verifyTradeDonationPartnerMetadata(
      { ...metadata, agreementId: "tampered" },
      {
        agreementId: term.agreement_id,
        agreementVersionId: term.agreement_version_id,
        donationTermId: intent.donation_term_id,
        donationIntentId: intent.id,
        partnerDonationId: intent.partner_donation_id,
      },
      secret,
    ),
    false,
  );
});

test("Every.org URL freezes amount, recipient, partner ID, and signed metadata", () => {
  const href = buildEveryOrgTradeDonationUrl({
    term,
    intent,
    config,
    siteUrl: "https://moraltrade.example",
  });
  const url = new URL(href);
  assert.equal(url.origin, "https://staging.every.org");
  assert.equal(url.pathname, "/againstmalaria");
  assert.equal(url.searchParams.get("amount"), "10.00");
  assert.equal(url.searchParams.get("frequency"), "ONCE");
  assert.equal(url.searchParams.get("partner_donation_id"), intent.partner_donation_id);
  assert.equal(url.searchParams.get("webhook_token"), donateLinkWebhookToken);
  assert.equal(url.toString().includes(partnerWebhookAuthorizationToken), false);
  assert.equal(
    Buffer.from(url.searchParams.get("partner_metadata") ?? "", "base64")
      .toString("utf8")
      .includes(partnerWebhookAuthorizationToken),
    false,
  );
  assert.equal(url.hash, "#donate");
  assert.equal(url.searchParams.has("email"), false);
});

test("valid AMF webhook is accepted and recipient or amount drift fails closed", () => {
  const partnerMetadata = createTradeDonationPartnerMetadata({
    agreementId: term.agreement_id,
    agreementVersionId: term.agreement_version_id,
    donationTermId: term.id,
    donationIntentId: intent.id,
    partnerDonationId: intent.partner_donation_id,
    metadataSecret: secret,
  });
  const payload = {
    chargeId: "charge-123",
    partnerDonationId: intent.partner_donation_id,
    partnerMetadata,
    toNonprofit: {
      slug: "againstmalaria",
      ein: "20-3069841",
      name: "The Against Malaria Foundation",
    },
    amount: "10.00",
    currency: "USD",
    frequency: "One-time",
    donationDate: "2026-07-22T12:00:00.000Z",
    paymentMethod: "Card",
  };
  const accepted = evaluateEveryOrgTradeDonationWebhook({
    payload,
    rawBody: JSON.stringify(payload),
    intent,
    term,
    metadataSecret: secret,
  });
  assert.equal(accepted.valid, true);

  const wrongRecipient = evaluateEveryOrgTradeDonationWebhook({
    payload: { ...payload, toNonprofit: { slug: "other", ein: "20-3069841" } },
    rawBody: JSON.stringify(payload),
    intent,
    term,
    metadataSecret: secret,
  });
  assert.equal(wrongRecipient.valid, false);
  assert.equal(wrongRecipient.failureCode, "recipient_mismatch");

  const wrongAmount = evaluateEveryOrgTradeDonationWebhook({
    payload: { ...payload, amount: "9.99" },
    rawBody: JSON.stringify(payload),
    intent,
    term,
    metadataSecret: secret,
  });
  assert.equal(wrongAmount.valid, false);
  assert.equal(wrongAmount.failureCode, "amount_mismatch");
});

test("curated target registry includes direct AMF routing", () => {
  const amf = getTradeDonationTarget("against-malaria-foundation");
  assert.equal(amf?.everyOrgSlug, "againstmalaria");
  assert.equal(amf?.nonprofitEin, "203069841");
});


test("connector environments and exact provider authentication boundaries fail closed", () => {
  const base = {
    EVERY_ORG_PLEDGE_DONATIONS_ENABLED: "true",
    EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN: donateLinkWebhookToken,
    EVERY_ORG_PARTNER_WEBHOOK_AUTHORIZATION_TOKEN:
      partnerWebhookAuthorizationToken,
    EVERY_ORG_WEBHOOK_ROUTE_ID:
      "route-id-that-is-at-least-thirty-two-characters",
    EVERY_ORG_PARTNER_METADATA_SECRET: secret,
  };

  const stagingOnProduction = getTradeDonationProviderConfig({
    ...base,
    EVERY_ORG_ENVIRONMENT: "staging",
    VERCEL_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "https://www.moraltrade.org",
  });
  assert.equal(stagingOnProduction.ready, false);
  assert.match(stagingOnProduction.blockers.join(" "), /cannot activate/);

  const liveOnPreview = getTradeDonationProviderConfig({
    ...base,
    EVERY_ORG_ENVIRONMENT: "live",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SITE_URL: "https://preview.example",
  });
  assert.equal(liveOnPreview.ready, false);
  assert.match(liveOnPreview.blockers.join(" "), /canonical production/);

  const staging = getTradeDonationProviderConfig({
    ...base,
    EVERY_ORG_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SITE_URL: "https://preview.example",
  });
  assert.equal(staging.ready, true);
  assert.equal(staging.blockers.length, 0);
  assert.equal(
    staging.partnerWebhookAuthorizationContract,
    "authorization_bearer_v1",
  );

  const equal = getTradeDonationProviderConfig({
    ...base,
    EVERY_ORG_DONATE_LINK_WEBHOOK_TOKEN:
      partnerWebhookAuthorizationToken,
    EVERY_ORG_ENVIRONMENT: "staging",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SITE_URL: "https://preview.example",
  });
  assert.equal(equal.donateLinkWebhookToken, "");
  assert.match(equal.blockers.join(" "), /must be distinct/);
});
