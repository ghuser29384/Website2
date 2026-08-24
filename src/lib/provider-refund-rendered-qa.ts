export const PROVIDER_REFUND_RENDERED_QA_OFFER_ID =
  "d7000000-0000-4000-8000-000000000007";
export const PROVIDER_REFUND_RENDERED_QA_VERIFIED_OBLIGATION_ID =
  "d7100000-0000-4000-8000-000000000071";
export const PROVIDER_REFUND_RENDERED_QA_REVERSED_OBLIGATION_ID =
  "d7200000-0000-4000-8000-000000000072";

export function providerRefundRenderedQaEnabled(environment: string | null) {
  return (
    process.env.DIRECT_DONATION_UPGRADE_PROVIDER_REFUND_RENDERED_QA ===
      "true" &&
    process.env.DIRECT_DONATION_UPGRADE_QA_FIXTURES === "true" &&
    process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_TARGET_ENV !== "production" &&
    environment === "staging"
  );
}

const originalRecipient = {
  name: "QA Local Community Fund",
  nonprofitId: "qa-local-community-fund",
  slug: "qa-local-community-fund",
  ein: "111111111",
  profileUrl: "https://staging.every.org/qa-local-community-fund",
  identityHash: "1".repeat(64),
};

const upgradedRecipient = {
  name: "QA High-Impact Fund",
  nonprofitId: "qa-high-impact-fund",
  slug: "qa-high-impact-fund",
  ein: "222222222",
  profileUrl: "https://staging.every.org/qa-high-impact-fund",
  identityHash: "2".repeat(64),
};

export function providerRefundRenderedQaAdminSnapshot(
  environment: "staging" | "live" | null,
) {
  if (!providerRefundRenderedQaEnabled(environment)) return null;

  const offer = {
    id: PROVIDER_REFUND_RENDERED_QA_OFFER_ID,
    creator_profile_id: "d7000000-0000-4000-8000-000000000070",
    environment: "staging",
    status: "post_completion_exception",
    selected_branch: "matched",
    privacy_mode: "public",
    creator_amount_cents: 1_000,
    matcher_amount_cents: 1_500,
    currency: "USD",
    match_deadline_at: "2026-08-20T12:00:00.000Z",
    fulfillment_deadline_at: "2026-08-21T12:00:00.000Z",
    webhook_grace_ends_at: "2026-08-22T12:00:00.000Z",
    original_recipient: originalRecipient,
    upgraded_recipient: upgradedRecipient,
    terms_hash: "3".repeat(64),
    completed_at: "2026-08-21T14:00:00.000Z",
    failure_code: "provider_refund_recorded",
    failure_message:
      "A required donation was later refunded by the provider after completion.",
    created_at: "2026-08-19T12:00:00.000Z",
    updated_at: "2026-08-24T12:00:00.000Z",
  };

  const verifiedObligation = {
    id: PROVIDER_REFUND_RENDERED_QA_VERIFIED_OBLIGATION_ID,
    offer_id: offer.id,
    participant_profile_id: "d7000000-0000-4000-8000-000000000070",
    participant_role: "creator",
    branch: "matched",
    obligation_kind: "creator_redirected",
    environment: "staging",
    status: "verified",
    expected_recipient: upgradedRecipient,
    expected_recipient_hash: upgradedRecipient.identityHash,
    expected_amount_cents: 1_000,
    expected_currency: "USD",
    partner_donation_id: "qa-partner-donation-verified",
    provider_charge_id_hash: "4".repeat(64),
    provider_gross_amount_cents: 1_000,
    provider_net_amount_cents: 970,
    provider_currency: "USD",
    provider_donation_date: "2026-08-21T13:00:00.000Z",
    due_at: "2026-08-21T12:00:00.000Z",
    failure_message: "",
  };

  const reversedObligation = {
    id: PROVIDER_REFUND_RENDERED_QA_REVERSED_OBLIGATION_ID,
    offer_id: offer.id,
    participant_profile_id: "d7000000-0000-4000-8000-000000000073",
    participant_role: "matcher",
    branch: "matched",
    obligation_kind: "matcher_incremental",
    environment: "staging",
    status: "provider_reversed",
    expected_recipient: upgradedRecipient,
    expected_recipient_hash: upgradedRecipient.identityHash,
    expected_amount_cents: 1_500,
    expected_currency: "USD",
    partner_donation_id: "qa-partner-donation-reversed",
    provider_charge_id_hash: "5".repeat(64),
    provider_gross_amount_cents: 1_500,
    provider_net_amount_cents: 1_455,
    provider_currency: "USD",
    provider_donation_date: "2026-08-21T13:30:00.000Z",
    provider_reversed_at: "2026-08-24T11:00:00.000Z",
    due_at: "2026-08-21T12:00:00.000Z",
    failure_message:
      "Every.org authoritative evidence records a full provider refund; original confirmation evidence is retained.",
  };

  return {
    offers: [offer],
    obligations: [verifiedObligation, reversedObligation],
    credits: [
      { id: "d7300000-0000-4000-8000-000000000073" },
      { id: "d7400000-0000-4000-8000-000000000074" },
    ],
    reversals: [
      {
        id: "d7500000-0000-4000-8000-000000000075",
        offer_id: offer.id,
        obligation_id: reversedObligation.id,
        environment: "staging",
        amount_cents: 1_500,
        currency: "USD",
        provider_refunded_at: "2026-08-24T11:00:00.000Z",
        evidence_source: "every_org_dashboard",
        recorded_at: "2026-08-24T11:05:00.000Z",
      },
    ],
    auditEvents: [
      {
        id: "d7600000-0000-4000-8000-000000000076",
        offer_id: offer.id,
        event_type: "provider_refund_recorded",
        created_at: "2026-08-24T11:05:00.000Z",
      },
    ],
    errors: [] as string[],
  };
}

export function providerRefundRenderedQaPublicOffer(environment: string | null) {
  if (!providerRefundRenderedQaEnabled(environment)) return null;
  return {
    id: PROVIDER_REFUND_RENDERED_QA_OFFER_ID,
    status: "post_completion_exception",
    verified_gross_amount_cents: 2_500,
    verified_net_amount_cents: 2_425,
    incremental_net_amount_cents: 1_455,
    redirected_net_amount_cents: 970,
    current_unreversed_gross_amount_cents: 1_000,
    current_unreversed_net_amount_cents: 970,
    current_incremental_net_amount_cents: 0,
    current_redirected_net_amount_cents: 970,
    provider_reversed_obligation_count: 1,
  };
}
