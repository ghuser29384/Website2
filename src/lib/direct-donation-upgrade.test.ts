import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectDonationUpgradeCheckoutUrl,
  buildDirectDonationUpgradeTermsHash,
  createDirectDonationUpgradePartnerMetadata,
  DIRECT_DONATION_UPGRADE_BASELINE_VERSION,
  DIRECT_DONATION_UPGRADE_CANONICAL_ORIGIN,
  DIRECT_DONATION_UPGRADE_CANONICAL_VERCEL_PROJECT_ID,
  DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION,
  evaluateDirectDonationUpgradeWebhook,
  getDirectDonationUpgradeConfig,
  normalizeEveryOrgNonprofitIdentity,
  sameEveryOrgNonprofit,
  searchEveryOrgNonprofits,
  verifyDirectDonationUpgradePartnerMetadata,
  type DirectDonationUpgradeConfig,
  type DirectDonationUpgradeObligationRow,
  type DirectDonationUpgradeRuntimeEnvironment,
} from "@/lib/direct-donation-upgrade";

const metadataSecret = "m".repeat(48);
const webhookToken = "w".repeat(48);
const webhookPathSecret = "p".repeat(48);

function configuredRuntime(
  overrides: DirectDonationUpgradeRuntimeEnvironment = {},
): DirectDonationUpgradeRuntimeEnvironment {
  return {
    DIRECT_DONATION_UPGRADES_ENABLED: "true",
    DIRECT_DONATION_UPGRADE_MODE: "live",
    DIRECT_DONATION_UPGRADE_QA_FIXTURES: "false",
    EVERY_ORG_PUBLIC_API_KEY: "public-api-key",
    EVERY_ORG_WEBHOOK_TOKEN: webhookToken,
    EVERY_ORG_WEBHOOK_PATH_SECRET: webhookPathSecret,
    EVERY_ORG_PARTNER_METADATA_SECRET: metadataSecret,
    VERCEL: "1",
    VERCEL_PROJECT_ID: DIRECT_DONATION_UPGRADE_CANONICAL_VERCEL_PROJECT_ID,
    VERCEL_ENV: "production",
    VERCEL_TARGET_ENV: "production",
    NEXT_PUBLIC_SITE_URL: DIRECT_DONATION_UPGRADE_CANONICAL_ORIGIN,
    ...overrides,
  };
}

function nonprofit(input: {
  id: string;
  name: string;
  slug: string;
  ein?: string;
}) {
  return normalizeEveryOrgNonprofitIdentity({
    providerNonprofitId: input.id,
    name: input.name,
    primarySlug: input.slug,
    ein: input.ein ?? "",
    isDisbursable: true,
    profileUrl: `https://www.every.org/${input.slug}`,
    websiteUrl: `https://example.org/${input.slug}`,
    locationAddress: "United States",
    description: `${input.name} description`,
    logoUrl: "",
  });
}

const original = nonprofit({
  id: "75924760-cd27-4ecc-a9d4-c0660c08961a",
  name: "Homeward Pet Adoption Center",
  slug: "homewardpet",
  ein: "911526803",
});
const upgraded = nonprofit({
  id: "qa-givewell-top-charities-fund",
  name: "GiveWell Top Charities Fund",
  slug: "givewell-top-charities-fund",
});

const config: DirectDonationUpgradeConfig = {
  requestedEnabled: true,
  mode: "staging",
  environment: "staging",
  publicApiKey: "",
  webhookToken,
  webhookPathSecret,
  metadataSecret,
  qaFixturesEnabled: true,
  readyForSearch: true,
  readyForCommitments: true,
  readyForCheckout: true,
  blockers: [],
};

test("live mode is ready only on the exact canonical Vercel production deployment", () => {
  const live = getDirectDonationUpgradeConfig(configuredRuntime());

  assert.equal(live.mode, "live");
  assert.equal(live.environment, "live");
  assert.equal(live.readyForSearch, true);
  assert.equal(live.readyForCommitments, true);
  assert.equal(live.readyForCheckout, true);
  assert.deepEqual(live.blockers, []);
});

test("live mode fails closed for duplicate, unknown, Preview, conflicting, or noncanonical production metadata", () => {
  const invalidRuntimes: Array<
    [string, DirectDonationUpgradeRuntimeEnvironment]
  > = [
    [
      "duplicate project",
      configuredRuntime({
        VERCEL_PROJECT_ID: "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK",
      }),
    ],
    ["unknown project", configuredRuntime({ VERCEL_PROJECT_ID: "prj_unknown" })],
    ["missing project", configuredRuntime({ VERCEL_PROJECT_ID: "" })],
    ["missing Vercel marker", configuredRuntime({ VERCEL: "" })],
    ["missing Vercel environment", configuredRuntime({ VERCEL_ENV: "" })],
    ["missing target environment", configuredRuntime({ VERCEL_TARGET_ENV: "" })],
    [
      "Preview environment",
      configuredRuntime({ VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview" }),
    ],
    [
      "conflicting production signals",
      configuredRuntime({ VERCEL_ENV: "production", VERCEL_TARGET_ENV: "preview" }),
    ],
    [
      "apex hostname",
      configuredRuntime({ NEXT_PUBLIC_SITE_URL: "https://moraltrade.org" }),
    ],
    [
      "subdomain hostname",
      configuredRuntime({ NEXT_PUBLIC_SITE_URL: "https://preview.moraltrade.org" }),
    ],
    [
      "insecure canonical hostname",
      configuredRuntime({ NEXT_PUBLIC_SITE_URL: "http://www.moraltrade.org" }),
    ],
    [
      "non-root canonical URL",
      configuredRuntime({ NEXT_PUBLIC_SITE_URL: "https://www.moraltrade.org/preview" }),
    ],
    [
      "canonical URL with userinfo",
      configuredRuntime({
        NEXT_PUBLIC_SITE_URL: "https://operator:secret@www.moraltrade.org/",
      }),
    ],
  ];

  for (const [label, runtime] of invalidRuntimes) {
    const result = getDirectDonationUpgradeConfig(runtime);
    assert.equal(result.readyForSearch, false, label);
    assert.equal(result.readyForCommitments, false, label);
    assert.equal(result.readyForCheckout, false, label);
    assert.ok(result.blockers.length > 0, label);
  }
});

test("staging remains available for local and Preview QA but is blocked by any Vercel production signal", () => {
  const stagingBase = {
    DIRECT_DONATION_UPGRADE_MODE: "staging",
    DIRECT_DONATION_UPGRADE_QA_FIXTURES: "true",
    EVERY_ORG_PUBLIC_API_KEY: "",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3211",
  };
  const local = getDirectDonationUpgradeConfig(
    configuredRuntime({
      ...stagingBase,
      VERCEL_PROJECT_ID: "",
      VERCEL_ENV: "",
      VERCEL_TARGET_ENV: "",
    }),
  );
  const preview = getDirectDonationUpgradeConfig(
    configuredRuntime({
      ...stagingBase,
      VERCEL_PROJECT_ID: "prj_unknown_preview",
      VERCEL_ENV: "preview",
      VERCEL_TARGET_ENV: "preview",
    }),
  );

  assert.equal(local.readyForCommitments, true);
  assert.equal(preview.readyForCommitments, true);

  for (const runtime of [
    configuredRuntime({
      ...stagingBase,
      VERCEL_ENV: "production",
      VERCEL_TARGET_ENV: "",
    }),
    configuredRuntime({
      ...stagingBase,
      VERCEL_ENV: "preview",
      VERCEL_TARGET_ENV: "production",
    }),
  ]) {
    const production = getDirectDonationUpgradeConfig(runtime);
    assert.equal(production.readyForSearch, false);
    assert.equal(production.readyForCommitments, false);
    assert.match(production.blockers.join(" "), /blocked on Vercel production/);
  }
});

function obligation(overrides: Partial<DirectDonationUpgradeObligationRow> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    offer_id: "20000000-0000-4000-8000-000000000002",
    candidate_id: "30000000-0000-4000-8000-000000000003",
    participant_profile_id: "40000000-0000-4000-8000-000000000004",
    participant_role: "matcher",
    branch: "matched",
    environment: "staging",
    provider: "every_org",
    expected_recipient: upgraded,
    expected_recipient_hash: upgraded.identityHash,
    expected_amount_cents: 1_000,
    expected_currency: "USD",
    expected_frequency: "ONCE",
    terms_hash: "a".repeat(64),
    partner_donation_id: "50000000-0000-4000-8000-000000000005",
    status: "pending",
    due_at: "2026-08-08T12:00:00.000Z",
    webhook_grace_ends_at: "2026-08-09T12:00:00.000Z",
    checkout_started_at: null,
    provider_charge_id_hash: "",
    provider_payload_hash: "",
    provider_gross_amount_cents: null,
    provider_net_amount_cents: null,
    provider_currency: "",
    provider_nonprofit_slug: "",
    provider_nonprofit_ein: "",
    provider_donation_date: null,
    provider_payment_method: "",
    failure_code: "",
    failure_message: "",
    verified_at: null,
    created_at: "2026-08-01T12:00:00.000Z",
    updated_at: "2026-08-01T12:00:00.000Z",
    ...overrides,
  } satisfies DirectDonationUpgradeObligationRow;
}

function exactPayload(row: DirectDonationUpgradeObligationRow) {
  return {
    chargeId: "charge-direct-upgrade-001",
    partnerDonationId: row.partner_donation_id,
    partnerMetadata: createDirectDonationUpgradePartnerMetadata({
      obligationId: row.id,
      offerId: row.offer_id,
      participantProfileId: row.participant_profile_id,
      participantRole: row.participant_role,
      branch: row.branch,
      termsHash: row.terms_hash,
      partnerDonationId: row.partner_donation_id,
      metadataSecret,
    }),
    toNonprofit: {
      slug: row.expected_recipient.primarySlug,
      ein: row.expected_recipient.ein || undefined,
      name: row.expected_recipient.name,
    },
    amount: "10.00",
    netAmount: "9.70",
    currency: "USD",
    frequency: "One-time",
    donationDate: "2026-08-08T11:00:00.000Z",
    paymentMethod: "card",
  };
}

test("recipient identity is canonical and aliases of one nonprofit cannot form two branches", () => {
  assert.match(original.identityHash, /^[0-9a-f]{64}$/);
  assert.equal(original.ein, "911526803");
  assert.equal(
    sameEveryOrgNonprofit(
      original,
      nonprofit({ id: "another-id", name: "Homeward Pet", slug: "homeward-pet-alias", ein: "91-1526803" }),
    ),
    true,
  );
  assert.equal(
    sameEveryOrgNonprofit(
      original,
      nonprofit({
        id: original.providerNonprofitId.toUpperCase(),
        name: "Homeward Pet",
        slug: "HOMEWARDPET",
      }),
    ),
    true,
  );
  assert.equal(sameEveryOrgNonprofit(original, upgraded), false);
});

test("the frozen terms hash binds the creator baseline as well as both recipient identities", () => {
  const base = {
    creatorProfileId: "40000000-0000-4000-8000-000000000004",
    creatorAmountCents: 1_000,
    matcherAmountCents: 1_000,
    originalRecipient: original,
    upgradedRecipient: upgraded,
    matchDeadlineAt: "2026-08-08T12:00:00.000Z",
    privacyMode: "public" as const,
    environment: "staging" as const,
    baselineAttestation: "I already planned this donation before publishing the offer.",
  };
  const first = buildDirectDonationUpgradeTermsHash(base);
  const second = buildDirectDonationUpgradeTermsHash({
    ...base,
    baselineAttestation: "I formed the donation plan only after publishing the offer.",
  });
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, second);
  assert.equal(DIRECT_DONATION_UPGRADE_BASELINE_VERSION.includes("baseline-v1"), true);
  assert.equal(DIRECT_DONATION_UPGRADE_MATCHER_COMMITMENT_VERSION.includes("matcher-v1"), true);
});

test("QA nonprofit search exposes only the deterministic eligible fixtures", async () => {
  const petResults = await searchEveryOrgNonprofits("Homeward", config);
  const giveWellResults = await searchEveryOrgNonprofits("GiveWell", config);
  assert.equal(petResults.length, 1);
  assert.equal(petResults[0]?.primarySlug, "homewardpet");
  assert.equal(giveWellResults.length, 1);
  assert.equal(giveWellResults[0]?.primarySlug, "givewell-top-charities-fund");
});

test("partner metadata binds the exact obligation, participant, branch, terms, and donation ID", () => {
  const row = obligation();
  const metadata = createDirectDonationUpgradePartnerMetadata({
    obligationId: row.id,
    offerId: row.offer_id,
    participantProfileId: row.participant_profile_id,
    participantRole: row.participant_role,
    branch: row.branch,
    termsHash: row.terms_hash,
    partnerDonationId: row.partner_donation_id,
    metadataSecret,
  });
  assert.equal(verifyDirectDonationUpgradePartnerMetadata(metadata, row, metadataSecret), true);
  assert.equal(
    verifyDirectDonationUpgradePartnerMetadata({ ...metadata, branch: "fallback" }, row, metadataSecret),
    false,
  );
});

test("the checkout is direct to the frozen Every.org recipient with exact amount and webhook metadata", () => {
  const url = new URL(buildDirectDonationUpgradeCheckoutUrl({ obligation: obligation(), config }));
  assert.equal(url.origin, "https://staging.every.org");
  assert.equal(url.pathname, "/givewell-top-charities-fund");
  assert.equal(url.searchParams.get("amount"), "10.00");
  assert.equal(url.searchParams.get("min_value"), "10.00");
  assert.equal(url.searchParams.get("frequency"), "ONCE");
  assert.equal(url.searchParams.get("partner_donation_id"), obligation().partner_donation_id);
  assert.ok(url.searchParams.get("partner_metadata"));
  assert.equal(url.hash, "#donate");
});

test("an exact Every.org webhook is valid and separates gross from net", () => {
  const row = obligation();
  const payload = exactPayload(row);
  const rawBody = JSON.stringify(payload);
  const result = evaluateDirectDonationUpgradeWebhook({
    payload,
    rawBody,
    obligation: row,
    metadataSecret,
    expectedEnvironment: "staging",
  });
  assert.equal(result.valid, true);
  assert.equal(result.grossAmountCents, 1_000);
  assert.equal(result.netAmountCents, 970);
  assert.match(result.chargeIdHash, /^[0-9a-f]{64}$/);
  assert.match(result.payloadHash, /^[0-9a-f]{64}$/);
});

test("wrong recipient, altered metadata, invalid net amount, and late initiation all fail closed", () => {
  const row = obligation();
  const exact = exactPayload(row);
  const variants = [
    { ...exact, toNonprofit: { ...exact.toNonprofit, slug: "another-charity" } },
    { ...exact, partnerMetadata: { ...(exact.partnerMetadata as object), termsHash: "b".repeat(64) } },
    { ...exact, netAmount: "11.00" },
    { ...exact, donationDate: "2026-08-08T13:00:00.000Z" },
  ];
  const expectedCodes = [
    "recipient_mismatch",
    "metadata_signature_invalid",
    "net_amount_invalid",
    "donation_late",
  ];
  variants.forEach((payload, index) => {
    const result = evaluateDirectDonationUpgradeWebhook({
      payload,
      rawBody: JSON.stringify(payload),
      obligation: row,
      metadataSecret,
      expectedEnvironment: "staging",
    });
    assert.equal(result.valid, false);
    assert.equal(result.failureCode, expectedCodes[index]);
  });
});

test("a live obligation cannot be completed by a staging webhook path", () => {
  const row = obligation({ environment: "live" });
  const payload = exactPayload(row);
  const result = evaluateDirectDonationUpgradeWebhook({
    payload,
    rawBody: JSON.stringify(payload),
    obligation: row,
    metadataSecret,
    expectedEnvironment: "staging",
  });
  assert.equal(result.valid, false);
  assert.equal(result.failureCode, "environment_mismatch");
});
