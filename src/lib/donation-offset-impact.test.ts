import test from "node:test";
import assert from "node:assert/strict";

import {
  DONATION_OFFSET_IMPACT_MODELS,
  MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE,
  calculateDonationOffsetImpactSnapshot,
  combineDonationOffsetImpactSnapshots,
  createDonationOffsetAggregationCompatibility,
  type DonationOffsetImpactAvailableSnapshot,
} from "@/lib/donation-offset-impact";
import { REGISTERED_CHARITIES } from "@/lib/donation-offsets";

function requireAvailable(
  snapshot: ReturnType<typeof calculateDonationOffsetImpactSnapshot>,
): DonationOffsetImpactAvailableSnapshot {
  assert.equal(snapshot.status, "available");
  return snapshot;
}

test("the versioned catalog contains the approved prototype inputs and registered destinations", () => {
  const expectedInputs = [
    ["against-malaria-foundation", 6, 5_500, 45],
    ["malaria-consortium-smc", 7, 4_000, 50],
    ["helen-keller-intl-vitamin-a", 2, 3_500, 52],
    ["new-incentives", 146, 4_500, 50],
  ] as const;

  for (const [destinationId, outputCost, deathCost, effectiveLifeYears] of expectedInputs) {
    const model = DONATION_OFFSET_IMPACT_MODELS[destinationId];
    const registeredCharity = REGISTERED_CHARITIES.find(
      (charity) => charity.id === destinationId,
    );

    assert.equal(model.output.costPerOutputUsd, outputCost);
    assert.equal(model.modeledCostPerDeathAvertedUsd, deathCost);
    assert.equal(
      model.effectiveLifeYearsPerModeledDeathAverted,
      effectiveLifeYears,
    );
    assert.equal(model.sourceAsOf, "2025-11");
    assert.match(model.sourceLabel, /2022.2024 average inputs/i);
    assert.equal(registeredCharity?.isActive, true);
    assert.equal(registeredCharity?.selectable, true);
    assert.equal(registeredCharity?.isPoliticalCampaign, false);
  }

  assert.ok(Object.isFrozen(DONATION_OFFSET_IMPACT_MODELS));
  assert.ok(
    Object.values(DONATION_OFFSET_IMPACT_MODELS).every(
      (model) => Object.isFrozen(model) && Object.isFrozen(model.output),
    ),
  );
});

test("$250 to AMF freezes about 2.05 effective life-years with explicit Moral Trade provenance", () => {
  const snapshot = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-owner",
      partyRole: "owner",
      destinationId: "against-malaria-foundation",
      amountCents: 25_000,
    }),
  );

  assert.equal(snapshot.programOutput.expectedCount, 250 / 6);
  assert.equal(snapshot.effectiveLifeYears.estimateMicroEffectiveLifeYears, 2_045_455);
  assert.equal(Number(snapshot.effectiveLifeYears.estimate.toFixed(2)), 2.05);
  assert.equal(snapshot.effectiveLifeYears.scenarioLabel, "Moral Trade derived scenario");
  assert.equal(
    snapshot.effectiveLifeYears.disclosure,
    MORAL_TRADE_EFFECTIVE_LIFE_YEAR_DISCLOSURE,
  );
  assert.match(snapshot.effectiveLifeYears.disclosure, /not a GiveWell-published DALY/i);
  assert.equal(snapshot.attribution.partyId, "party-owner");
  assert.equal(snapshot.attribution.partyRole, "owner");
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.attribution));
  assert.ok(Object.isFrozen(snapshot.model));
  assert.ok(Object.isFrozen(snapshot.programOutput));
  assert.ok(Object.isFrozen(snapshot.effectiveLifeYears));
  assert.ok(Object.isFrozen(snapshot.aggregationCompatibility));
});

test("$250 to Helen Keller Intl freezes about 3.71 effective life-years", () => {
  const snapshot = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-counterparty",
      partyRole: "counterparty",
      destinationId: "helen-keller-intl-vitamin-a",
      amountCents: 25_000,
    }),
  );

  assert.equal(snapshot.programOutput.expectedCount, 125);
  assert.equal(snapshot.effectiveLifeYears.estimateMicroEffectiveLifeYears, 3_714_286);
  assert.equal(Number(snapshot.effectiveLifeYears.estimate.toFixed(2)), 3.71);
});

test("compatible AMF and Helen Keller snapshots retain separate attribution and combine to about 5.76 ELY", () => {
  const owner = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-owner",
      partyRole: "owner",
      destinationId: "against-malaria-foundation",
      amountCents: 25_000,
    }),
  );
  const counterparty = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-counterparty",
      partyRole: "counterparty",
      destinationId: "helen-keller-intl-vitamin-a",
      amountCents: 25_000,
    }),
  );

  const combined = combineDonationOffsetImpactSnapshots(owner, counterparty);

  assert.equal(combined.status, "compatible");
  assert.equal(combined.perPartyAttribution[0].partyId, "party-owner");
  assert.equal(
    combined.perPartyAttribution[0].destinationId,
    "against-malaria-foundation",
  );
  assert.equal(combined.perPartyAttribution[1].partyId, "party-counterparty");
  assert.equal(
    combined.perPartyAttribution[1].destinationId,
    "helen-keller-intl-vitamin-a",
  );
  assert.equal(
    combined.combinedImpact.estimateMicroEffectiveLifeYears,
    5_759_741,
  );
  assert.equal(Number(combined.combinedImpact.estimate.toFixed(2)), 5.76);
  assert.ok(Object.isFrozen(combined));
  assert.ok(Object.isFrozen(combined.partySnapshots));
  assert.ok(Object.isFrozen(combined.perPartyAttribution));
  assert.ok(Object.isFrozen(combined.combinedImpact));
});

test("unsupported destinations and invalid amounts produce frozen unavailable estimates, never zero impact", () => {
  const unsupported = calculateDonationOffsetImpactSnapshot({
    partyId: "party-owner",
    partyRole: "owner",
    destinationId: "direct-relief",
    amountCents: 25_000,
  });
  const invalidAmount = calculateDonationOffsetImpactSnapshot({
    partyId: "party-owner",
    partyRole: "owner",
    destinationId: "against-malaria-foundation",
    amountCents: Number.NaN,
  });

  assert.equal(unsupported.status, "unavailable");
  assert.equal(unsupported.reason, "model_unavailable");
  assert.equal(unsupported.amountCents, 25_000);
  assert.equal(invalidAmount.status, "unavailable");
  assert.equal(invalidAmount.reason, "invalid_amount");
  assert.equal(invalidAmount.amountCents, null);
  assert.ok(Object.isFrozen(unsupported));
  assert.ok(Object.isFrozen(unsupported.attribution));
});

test("a combined result stays incompatible when either party estimate is unavailable", () => {
  const owner = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-owner",
      partyRole: "owner",
      destinationId: "against-malaria-foundation",
      amountCents: 25_000,
    }),
  );
  const unavailable = calculateDonationOffsetImpactSnapshot({
    partyId: "party-counterparty",
    partyRole: "counterparty",
    destinationId: "direct-relief",
    amountCents: 25_000,
  });

  const combined = combineDonationOffsetImpactSnapshots(owner, unavailable);

  assert.equal(combined.status, "incompatible");
  assert.equal(combined.reason, "unavailable_estimate");
  assert.equal(combined.combinedImpact, null);
  assert.equal(combined.perPartyAttribution[0].estimate !== null, true);
  assert.equal(combined.perPartyAttribution[1].estimate, null);
});

test("unlike units or aggregation models never produce a combined number", () => {
  const owner = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-owner",
      partyRole: "owner",
      destinationId: "against-malaria-foundation",
      amountCents: 25_000,
    }),
  );
  const counterparty = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-counterparty",
      partyRole: "counterparty",
      destinationId: "helen-keller-intl-vitamin-a",
      amountCents: 25_000,
    }),
  );

  const unlikeUnitCompatibility = createDonationOffsetAggregationCompatibility({
    ...counterparty.aggregationCompatibility,
    outcomeMetricId: "modeled-deaths-averted",
    outcomeUnit: "modeled_death_averted",
  });
  const unlikeUnit = Object.freeze({
    ...counterparty,
    effectiveLifeYears: Object.freeze({
      ...counterparty.effectiveLifeYears,
      unit: "modeled_death_averted",
    }),
    aggregationCompatibility: unlikeUnitCompatibility,
  }) as unknown as DonationOffsetImpactAvailableSnapshot;
  const unlikeUnitCombined = combineDonationOffsetImpactSnapshots(owner, unlikeUnit);

  assert.equal(unlikeUnitCombined.status, "incompatible");
  assert.equal(unlikeUnitCombined.reason, "incompatible_aggregation");
  assert.equal(unlikeUnitCombined.combinedImpact, null);

  const unlikeModelCompatibility = createDonationOffsetAggregationCompatibility({
    ...counterparty.aggregationCompatibility,
    aggregationModelId: "an-unrelated-impact-model",
  });
  const unlikeModel = Object.freeze({
    ...counterparty,
    aggregationCompatibility: unlikeModelCompatibility,
  });
  const unlikeModelCombined = combineDonationOffsetImpactSnapshots(owner, unlikeModel);

  assert.equal(unlikeModelCombined.status, "incompatible");
  assert.equal(unlikeModelCombined.reason, "incompatible_aggregation");
  assert.equal(unlikeModelCombined.combinedImpact, null);
});

test("a forged shorthand compatibility key fails closed", () => {
  const owner = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-owner",
      partyRole: "owner",
      destinationId: "against-malaria-foundation",
      amountCents: 25_000,
    }),
  );
  const counterparty = requireAvailable(
    calculateDonationOffsetImpactSnapshot({
      partyId: "party-counterparty",
      partyRole: "counterparty",
      destinationId: "helen-keller-intl-vitamin-a",
      amountCents: 25_000,
    }),
  );
  const forged = Object.freeze({
    ...counterparty,
    aggregationCompatibility: Object.freeze({
      ...counterparty.aggregationCompatibility,
      compatibilityKey: "ely",
    }),
  });

  const combined = combineDonationOffsetImpactSnapshots(owner, forged);

  assert.equal(combined.status, "incompatible");
  assert.equal(combined.reason, "invalid_aggregation_compatibility");
  assert.equal(combined.combinedImpact, null);
});
