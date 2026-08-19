import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEveryOrgTradeDonationPoolBundleUrl,
  buildTradeDonationPoolConditionHash,
  bundleCompatibleKey,
  createTradeDonationPoolPartnerMetadata,
  evaluateEveryOrgTradeDonationPoolWebhook,
  getTradeDonationPoolConfig,
  hashPoolValue,
  selectMinimalThresholdBundle,
  verifyTradeDonationPoolPartnerMetadata,
  type TradeDonationPoolBundleRow,
} from "@/lib/trade-donation-pool";
import type { TradeDonationTermRow } from "@/lib/trade-donation";

const metadataSecret = "pool-metadata-secret-that-is-at-least-thirty-two-characters";
const pathSecret = "pool-webhook-path-secret-that-is-at-least-thirty-two-characters";
const payerA = "11111111-1111-4111-8111-111111111111";
const payerB = "22222222-2222-4222-8222-222222222222";
const agreementId = "33333333-3333-4333-8333-333333333333";
const agreementVersionId = "44444444-4444-4444-8444-444444444444";
const donationTermId = "55555555-5555-4555-8555-555555555555";
const bundleId = "66666666-6666-4666-8666-666666666666";
const partnerDonationId = "77777777-7777-4777-8777-777777777777";

const pooledTerm = {
  id: donationTermId,
  agreement_id: agreementId,
  agreement_version_id: agreementVersionId,
  payer_role: "proposer",
  provider: "every_org",
  target_id: "against-malaria-foundation",
  target_name: "The Against Malaria Foundation",
  nonprofit_slug: "againstmalaria",
  nonprofit_ein: "203069841",
  amount_cents: 250,
  currency: "USD",
  frequency: "ONCE",
  connector_terms_hash: "a".repeat(64),
  source_label: "GiveWell research",
  source_url: "https://www.givewell.org/charities/amf",
  source_checked_at: "2026-07-22",
  created_by: payerA,
  created_at: "2026-07-25T00:00:00.000Z",
} satisfies TradeDonationTermRow;

function makeBundle(overrides: Partial<TradeDonationPoolBundleRow> = {}): TradeDonationPoolBundleRow {
  const manifest = {
    schemaVersion: "moral-trade-pooled-settlement-manifest-v1" as const,
    bundleId,
    environment: "test" as const,
    provider: "every_org" as const,
    recipientSlug: "againstmalaria",
    recipientEin: "203069841",
    currency: "USD" as const,
    frequency: "ONCE" as const,
    aggregateAmountCents: 1000,
    items: [
      {
        position: 1,
        obligationId: "88888888-8888-4888-8888-888888888888",
        agreementId,
        agreementVersionId,
        donationTermId,
        payerUserId: payerA,
        allocationCents: 250,
        conditionHash: "b".repeat(64),
      },
      {
        position: 2,
        obligationId: "99999999-9999-4999-8999-999999999999",
        agreementId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        agreementVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        donationTermId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        payerUserId: payerB,
        allocationCents: 750,
        conditionHash: "c".repeat(64),
      },
    ],
  };
  return {
    id: bundleId,
    environment: "test",
    provider: "every_org",
    target_id: "against-malaria-foundation",
    target_name: "The Against Malaria Foundation",
    nonprofit_slug: "againstmalaria",
    nonprofit_ein: "203069841",
    amount_cents: 1000,
    currency: "USD",
    frequency: "ONCE",
    manifest,
    manifest_hash: hashPoolValue(manifest),
    partner_donation_id: partnerDonationId,
    status: "checkout_started",
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
    frozen_at: "2026-07-25T00:00:00.000Z",
    checkout_started_at: "2026-07-25T00:01:00.000Z",
    completed_at: null,
    created_at: "2026-07-25T00:00:00.000Z",
    updated_at: "2026-07-25T00:01:00.000Z",
    ...overrides,
  };
}

test("cross-user compatibility deliberately excludes the participant payer", () => {
  const common = {
    environment: "test" as const,
    nonprofitSlug: "AgainstMalaria",
    nonprofitEin: "20-3069841",
    currency: "usd",
    frequency: "once",
  };
  const a = bundleCompatibleKey({ ...common, payerUserId: payerA } as typeof common & { payerUserId: string });
  const b = bundleCompatibleKey({ ...common, payerUserId: payerB } as typeof common & { payerUserId: string });
  assert.equal(a, b);
  assert.equal(a, "test|againstmalaria|203069841|USD|ONCE");
});

test("recipient, environment, currency, and frequency isolate bundles", () => {
  const base = bundleCompatibleKey({
    environment: "test",
    nonprofitSlug: "againstmalaria",
    nonprofitEin: "203069841",
    currency: "USD",
    frequency: "ONCE",
  });
  assert.notEqual(
    base,
    bundleCompatibleKey({
      environment: "live",
      nonprofitSlug: "againstmalaria",
      nonprofitEin: "203069841",
      currency: "USD",
      frequency: "ONCE",
    }),
  );
  assert.notEqual(
    base,
    bundleCompatibleKey({
      environment: "test",
      nonprofitSlug: "forethought",
      nonprofitEin: "",
      currency: "USD",
      frequency: "ONCE",
    }),
  );
  assert.notEqual(
    base,
    bundleCompatibleKey({
      environment: "test",
      nonprofitSlug: "againstmalaria",
      nonprofitEin: "203069841",
      currency: "EUR",
      frequency: "ONCE",
    }),
  );
});

test("four independent $2.50 obligations freeze the minimal $10 bundle", () => {
  const obligations = [payerA, payerB, "c", "d", "e"].map((payerUserId, index) => ({
    id: `obligation-${index + 1}`,
    payerUserId,
    amountCents: 250,
  }));
  const selected = selectMinimalThresholdBundle(obligations);
  assert.equal(selected.thresholdReached, true);
  assert.equal(selected.totalCents, 1000);
  assert.deepEqual(
    selected.selected.map((entry) => entry.id),
    ["obligation-1", "obligation-2", "obligation-3", "obligation-4"],
  );
});

test("an obligation condition hash binds exact version, payer, amount, and destination", () => {
  const base = {
    agreementId,
    agreementVersionId,
    donationTermId,
    payerUserId: payerA,
    environment: "test" as const,
    term: pooledTerm,
  };
  const hash = buildTradeDonationPoolConditionHash(base);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(
    hash,
    buildTradeDonationPoolConditionHash({
      ...base,
      agreementVersionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    }),
  );
  assert.notEqual(hash, buildTradeDonationPoolConditionHash({ ...base, payerUserId: payerB }));
  assert.notEqual(
    hash,
    buildTradeDonationPoolConditionHash({
      ...base,
      term: { ...pooledTerm, amount_cents: 251 },
    }),
  );
});

test("bundle metadata is signed and tamper evident", () => {
  const bundle = makeBundle();
  const metadata = createTradeDonationPoolPartnerMetadata({
    bundleId: bundle.id,
    manifestHash: bundle.manifest_hash,
    partnerDonationId,
    metadataSecret,
  });
  assert.equal(
    verifyTradeDonationPoolPartnerMetadata(
      metadata,
      { bundleId, manifestHash: bundle.manifest_hash, partnerDonationId },
      metadataSecret,
    ),
    true,
  );
  assert.equal(
    verifyTradeDonationPoolPartnerMetadata(
      { ...metadata, manifestHash: "f".repeat(64) },
      { bundleId, manifestHash: bundle.manifest_hash, partnerDonationId },
      metadataSecret,
    ),
    false,
  );
});

test("aggregate Every.org checkout contains no participant identity or component agreement IDs", () => {
  const bundle = makeBundle();
  const href = buildEveryOrgTradeDonationPoolBundleUrl({
    bundle,
    partnerDonationId,
    metadataSecret,
    webhookToken: "webhook-token",
    everyOrgEnvironment: "staging",
    siteUrl: "https://qa.moraltrade.example",
  });
  const url = new URL(href);
  assert.equal(url.origin, "https://staging.every.org");
  assert.equal(url.pathname, "/againstmalaria");
  assert.equal(url.searchParams.get("amount"), "10.00");
  assert.equal(url.searchParams.get("frequency"), "ONCE");
  assert.equal(url.searchParams.get("partner_donation_id"), partnerDonationId);
  assert.equal(url.searchParams.has("email"), false);
  const metadataText = Buffer.from(
    String(url.searchParams.get("partner_metadata")),
    "base64",
  ).toString("utf8");
  assert.doesNotMatch(metadataText, new RegExp(payerA));
  assert.doesNotMatch(metadataText, new RegExp(payerB));
  assert.doesNotMatch(metadataText, new RegExp(agreementId));
});

test("exact aggregate webhook verifies and every material mismatch fails closed", () => {
  const bundle = makeBundle();
  const metadata = createTradeDonationPoolPartnerMetadata({
    bundleId,
    manifestHash: bundle.manifest_hash,
    partnerDonationId,
    metadataSecret,
  });
  const payload = {
    chargeId: "charge-pool-123",
    partnerDonationId,
    partnerMetadata: Buffer.from(JSON.stringify(metadata), "utf8").toString("base64"),
    toNonprofit: { slug: "againstmalaria", ein: "20-3069841" },
    amount: "10.00",
    currency: "USD",
    frequency: "One-time",
    donationDate: "2026-07-25T12:00:00.000Z",
    paymentMethod: "Card",
  };
  const evaluate = (changes: Record<string, unknown> = {}) =>
    evaluateEveryOrgTradeDonationPoolWebhook({
      payload: { ...payload, ...changes },
      rawBody: JSON.stringify({ ...payload, ...changes }),
      bundle,
      metadataSecret,
    });

  assert.equal(evaluate().valid, true);
  assert.equal(evaluate({ amount: "9.99" }).failureCode, "amount_mismatch");
  assert.equal(
    evaluate({ toNonprofit: { slug: "forethought", ein: "20-3069841" } }).failureCode,
    "recipient_mismatch",
  );
  assert.equal(
    evaluate({ partnerMetadata: { ...metadata, signature: "0".repeat(64) } }).failureCode,
    "metadata_signature_invalid",
  );
  assert.equal(evaluate({ frequency: "Monthly" }).failureCode, "frequency_mismatch");
});

test("pool readiness is fail-closed across deployment and provider environments", () => {
  const names = [
    "TRADE_DONATION_POOL_ENABLED",
    "TRADE_DONATION_POOL_MODE",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "EVERY_ORG_PLEDGE_DONATIONS_ENABLED",
    "EVERY_ORG_ENVIRONMENT",
    "EVERY_ORG_WEBHOOK_TOKEN",
    "EVERY_ORG_WEBHOOK_PATH_SECRET",
    "EVERY_ORG_PARTNER_METADATA_SECRET",
    "VERCEL_ENV",
    "NEXT_PUBLIC_SITE_URL",
  ] as const;
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.TRADE_DONATION_POOL_ENABLED = "true";
    process.env.TRADE_DONATION_POOL_MODE = "test";
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_example";
    process.env.EVERY_ORG_PLEDGE_DONATIONS_ENABLED = "true";
    process.env.EVERY_ORG_ENVIRONMENT = "staging";
    process.env.EVERY_ORG_WEBHOOK_TOKEN = "token";
    process.env.EVERY_ORG_WEBHOOK_PATH_SECRET = pathSecret;
    process.env.EVERY_ORG_PARTNER_METADATA_SECRET = metadataSecret;
    process.env.VERCEL_ENV = "preview";
    assert.equal(getTradeDonationPoolConfig().readyForParticipantFunding, true);

    process.env.VERCEL_ENV = "production";
    assert.equal(getTradeDonationPoolConfig().readyForParticipantFunding, false);

    process.env.TRADE_DONATION_POOL_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    process.env.EVERY_ORG_ENVIRONMENT = "live";
    assert.equal(getTradeDonationPoolConfig().readyForParticipantFunding, true);

    process.env.VERCEL_ENV = "preview";
    assert.equal(getTradeDonationPoolConfig().readyForParticipantFunding, false);
  } finally {
    for (const name of names) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
