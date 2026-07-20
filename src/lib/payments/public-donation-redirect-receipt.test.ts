import assert from "node:assert/strict";
import test from "node:test";

import { calculateDonationOffsetImpactSnapshot } from "@/lib/donation-offset-impact";
import {
  combinedEffectiveLifeYears,
  parsePublicDonationRedirectReceipt,
} from "@/lib/payments/public-donation-redirect-receipt";

const ownerId = "11111111-1111-4111-8111-111111111111";
const counterpartyId = "22222222-2222-4222-8222-222222222222";

function makeRow(overrides: Record<string, unknown> = {}) {
  const ownerImpact = calculateDonationOffsetImpactSnapshot({
    amountCents: 25_000,
    destinationId: "against-malaria-foundation",
    partyId: ownerId,
    partyRole: "owner",
  });
  const counterpartyImpact = calculateDonationOffsetImpactSnapshot({
    amountCents: 25_000,
    destinationId: "helen-keller-intl-vitamin-a",
    partyId: counterpartyId,
    partyRole: "counterparty",
  });

  return {
    completed_at: "2026-07-20T20:00:00.000Z",
    condition_snapshot: {
      schemaVersion: "donation-offset-payment-condition-v2",
      baselineOpposedCause: "Private Party A label",
      requestedOpposedCause: "Private Party B label",
      redirects: {
        owner: {
          amountCents: 25_000,
          charityId: "against-malaria-foundation",
          charityName: "Against Malaria Foundation",
          impact: ownerImpact,
          participantRole: "owner",
          profileId: ownerId,
        },
        counterparty: {
          amountCents: 25_000,
          charityId: "helen-keller-intl-vitamin-a",
          charityName: "Helen Keller Intl — Vitamin A Supplementation",
          impact: counterpartyImpact,
          participantRole: "counterparty",
          profileId: counterpartyId,
        },
      },
    },
    currency: "usd",
    status: "transferred",
    total_amount_cents: 50_000,
    ...overrides,
  };
}

test("a live receipt projection preserves party attribution and combines only compatible frozen ELY", () => {
  const receipt = parsePublicDonationRedirectReceipt(makeRow());
  assert.ok(receipt);
  assert.equal(receipt.owner.charityName, "Against Malaria Foundation");
  assert.equal(receipt.counterparty.amountCents, 25_000);
  assert.ok(Math.abs((combinedEffectiveLifeYears(receipt) ?? 0) - 5.759741) < 0.000001);

  const publicProjection = JSON.stringify(receipt);
  assert.equal(publicProjection.includes("Private Party A label"), false);
  assert.equal(publicProjection.includes(ownerId), false);
  assert.equal(publicProjection.includes(counterpartyId), false);
});

test("receipt parsing fails closed for non-final states, old schemas, and mismatched totals", () => {
  assert.equal(parsePublicDonationRedirectReceipt(makeRow({ status: "charging" })), null);
  assert.equal(parsePublicDonationRedirectReceipt(makeRow({ total_amount_cents: 49_999 })), null);

  const oldSnapshotRow = makeRow();
  oldSnapshotRow.condition_snapshot.schemaVersion = "donation-offset-payment-condition-v1";
  assert.equal(parsePublicDonationRedirectReceipt(oldSnapshotRow), null);
});
