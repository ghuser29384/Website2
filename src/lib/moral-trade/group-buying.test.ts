import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as getGroupBuying } from "@/app/api/moral-trade/group-buying/route";
import { POST as enforceGroupBuying } from "@/app/api/moral-trade/group-buying/enforce/route";

import {
  MORAL_GOODS_FEATURE_CAPABILITIES,
  MORAL_GOODS_SEED_CREDITED_UNITS,
  MORAL_GOODS_SEED_ENVELOPES,
  MORAL_GOODS_SEED_FUNDING_SOURCES,
  MORAL_GOODS_SEED_OBLIGATIONS,
  buildDealCardModel,
  buildMoralGoodsDiscoveryCardModel,
  buildSettlementPlan,
  calculateAdjustedImpactMilliUnits,
  calculateParticipantPayoutMinor,
  evaluateEnvelopeReadiness,
  evaluateFeatureCapabilities,
  flagParticipantProposalForThreats,
  getGuidedStandingBudgetSteps,
  getMoralGoodsDiscoverySurface,
  getMoralGoodsGroupBuyingContract,
  getPrivateProposalIntakeFields,
  lintOrdinaryGroupBuyingCopy,
  validateApprovedSettlementPlan,
  validateMoralGoodsGroupBuyingContract,
} from "./group-buying";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("group-buying contract validates shared primitives, states, templates, and seed cards", () => {
  const contract = getMoralGoodsGroupBuyingContract();
  const validation = validateMoralGoodsGroupBuyingContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_goods_group_buy_rounds"));
  assert.ok(contract.sharedPrimitiveTables.includes("moral_goods_purchase_envelope_registry"));
  assert.ok(contract.sharedPrimitiveTables.includes("moral_goods_participant_action_commitments"));
  assert.ok(contract.envelopeTypes.includes("crowdfunded_pledge_swap_lot"));
  assert.ok(contract.featureModules.includes("standing_microfund_pools"));
  assert.ok(contract.failureMessageTemplates.some((template) => template.key === "donation_failure_after_verification"));
  assert.ok(contract.sampleDealCards.every((card) => card.copyLint.status === "pass"));
  assert.ok(contract.discoverySurface.categories.some((category) => category.key === "lots"));
  assert.ok(contract.discoverySurface.commitmentPreview.noChargeLabel.includes("Due now $0.00"));
});

test("deal cards use action-first copy and keep internal architecture terms out of ordinary rows", () => {
  const lot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  );
  assert.ok(lot);

  const card = buildDealCardModel(lot, "funder");
  assert.equal(card.primaryLabel, "Fund one verified action");
  assert.equal(card.rows.action, "One adult participant avoids meat/fish for 2 days.");
  assert.equal(card.rows.consideration, "$50 donation to a charity the participant chose from the approved list.");
  assert.equal(card.rows.status, "Open for funding");
  assert.equal(card.rows.nextStep, "Fund this");
  assert.equal(card.copyLint.status, "pass");
  assert.match(card.details.methodology, /fixed donation consideration/i);
});

test("discovery surface filters reviewable routes without fabricating commitment state", () => {
  const allSurface = getMoralGoodsDiscoverySurface();
  const lotSurface = getMoralGoodsDiscoverySurface({ category: "lots" });
  const searchSurface = getMoralGoodsDiscoverySurface({ query: "no-meat" });
  const emptySurface = getMoralGoodsDiscoverySurface({ query: "nonexistent private counterparty" });
  const lot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  );
  assert.ok(lot);
  const lotCard = buildMoralGoodsDiscoveryCardModel(lot);

  assert.equal(allSurface.categories.length, 6);
  assert.ok(allSurface.cards.length >= 4);
  assert.ok(allSurface.filterChips.includes("Private until reviewed"));
  assert.ok(lotSurface.cards.length >= 1);
  assert.ok(lotSurface.cards.every((card) => card.categoryKey === "lots"));
  assert.ok(searchSurface.cards.some((card) => /No-Meat/i.test(card.title)));
  assert.equal(emptySurface.cards.length, 0);
  assert.equal(emptySurface.commitmentPreview.noChargeLabel.includes("Due now $0.00"), true);
  assert.equal(lotCard.copyLint.status, "pass");
  assert.equal(lotCard.safeActionNote.includes("No charge"), true);
  assert.doesNotMatch(lotCard.progressLabel, /\d+%|authorized/i);
  assert.ok([1_500, 3_500, 6_000, 8_500].includes(lotCard.progressBps));
  assert.match(lotCard.progressLabel, /review-gated/i);
  assert.equal(lotCard.statusLabel, "Open for funding");
  assert.match(lotCard.limitLabel, /\$0\.50 USD/);
});

test("copy lint rejects internal terms, offset claims, and unsupported guarantee language", () => {
  const result = lintOrdinaryGroupBuyingCopy(
    "This purchase envelope uses a settlement plan to offset your eating with a guaranteed donation.",
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.includes("ordinary_ui_internal_term:purchase envelope"));
  assert.ok(result.blockers.includes("ordinary_ui_internal_term:settlement plan"));
  assert.ok(result.blockers.includes("ordinary_ui_unsupported_guaranteed_claim"));
  assert.ok(result.blockers.includes("ordinary_ui_moral_licensing_or_offset_claim"));
});

test("adjusted impact and payout use integer basis-point arithmetic", () => {
  const adjusted = calculateAdjustedImpactMilliUnits({
    additionalityBps: 7_500,
    moralImpactWeightBps: 10_000,
    persistenceMultiplierBps: 8_000,
    rawUnits: 40,
    verificationConfidenceBps: 9_000,
  });
  const payout = calculateParticipantPayoutMinor({
    adjustedUnitsMilli: adjusted,
    participantPayoutCapMinor: 6_000,
    unitPriceMinor: 125,
  });

  assert.equal(adjusted, 21_600);
  assert.equal(payout, 2_700);
});

test("settlement preview binds funding sources, credited units, obligations, and hashes", () => {
  const lot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  );
  assert.ok(lot);

  const plan = buildSettlementPlan({
    creditedUnits: MORAL_GOODS_SEED_CREDITED_UNITS,
    envelope: lot,
    fundingSources: MORAL_GOODS_SEED_FUNDING_SOURCES,
    obligations: MORAL_GOODS_SEED_OBLIGATIONS,
  });

  assert.equal(plan.planStatus, "computed");
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.fixedConsiderationEarnedMinor, 5_000);
  assert.equal(plan.ordinaryFunderChargeTotalMinor, 5_000);
  assert.equal(plan.lineItems.length, 1);
  assert.match(plan.fundingSourceSetHash, /^sha256:/);
  assert.match(plan.creditedActionUnitSetHash, /^sha256:/);
  assert.match(plan.considerationObligationSetHash, /^sha256:/);
  assert.match(plan.calculationInputHash, /^sha256:/);
  assert.match(plan.calculationOutputHash, /^sha256:/);
});

test("approved settlement plan validation fails closed after funding input drift", () => {
  const lot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  );
  assert.ok(lot);
  const approved = buildSettlementPlan({
    creditedUnits: MORAL_GOODS_SEED_CREDITED_UNITS,
    envelope: lot,
    fundingSources: MORAL_GOODS_SEED_FUNDING_SOURCES,
    obligations: MORAL_GOODS_SEED_OBLIGATIONS,
  });
  const recomputed = buildSettlementPlan({
    creditedUnits: MORAL_GOODS_SEED_CREDITED_UNITS,
    envelope: lot,
    fundingSources: MORAL_GOODS_SEED_FUNDING_SOURCES.map((source) =>
      source.purchaseEnvelopeId === lot.id
        ? { ...source, amountCommittedMinor: source.amountCommittedMinor - 50 }
        : source,
    ),
    obligations: MORAL_GOODS_SEED_OBLIGATIONS,
  });
  const validation = validateApprovedSettlementPlan(approved, recomputed);

  assert.equal(validation.status, "blocked");
  assert.ok(validation.blockers.includes("approved_settlement_plan_fundingSourceSetHash_changed"));
});

test("feature capabilities fail closed when dependencies are disabled", () => {
  const result = evaluateFeatureCapabilities(
    MORAL_GOODS_FEATURE_CAPABILITIES.map((capability) =>
      capability.featureModule === "charitable_donation_execution"
        ? { ...capability, status: "disabled" as const }
        : capability,
    ),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("feature_dependency_blocked:crowdfunded_pledge_swap_lots:charitable_donation_execution"));
});

test("envelope readiness catches snapshot drift and disabled donation execution", () => {
  const lot = MORAL_GOODS_SEED_ENVELOPES.find(
    (envelope) => envelope.envelopeType === "crowdfunded_pledge_swap_lot",
  );
  assert.ok(lot);
  const result = evaluateEnvelopeReadiness({
    capabilities: MORAL_GOODS_FEATURE_CAPABILITIES.map((capability) =>
      capability.featureModule === "charitable_donation_execution"
        ? { ...capability, status: "disabled" as const }
        : capability,
    ),
    envelope: {
      ...lot,
      registry: {
        ...lot.registry,
        canonicalSnapshotHash: "sha256:wrong",
      },
    },
    phase: "launch",
    now: "2026-07-19T00:00:00.000Z",
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("snapshot_hash_registry_mismatch"));
  assert.ok(result.blockers.includes("feature_module_not_enabled:charitable_donation_execution"));
});

test("participant proposal anti-threat review blocks threat-framed proposals", () => {
  const result = flagParticipantProposalForThreats({
    proposedActionText: "Pay me or I will eat more meat and harass people online.",
    proposedConsiderationText: "$50 now",
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.flags.includes("pay_me_or_harm"));
  assert.ok(result.flags.includes("illegal_or_discriminatory"));
  assert.match(result.participantVisibleReason, /cannot be listed/i);
});

test("guided budget and private proposal intake expose ordinary-language flows", () => {
  assert.deepEqual(getGuidedStandingBudgetSteps().slice(0, 3), [
    "Choose a cause/action area.",
    "Choose a monthly cap.",
    "Choose a maximum per action or basket item.",
  ]);
  assert.deepEqual(getPrivateProposalIntakeFields(), [
    "What you would do",
    "How long it would last",
    "What consideration would make it worthwhile",
    "Which approved charity or payout option you would accept",
    "Any safety or access concerns",
  ]);
});

test("group-buying enforcement route fails closed on invalid JSON", async () => {
  const response = await enforceGroupBuying(
    new Request("http://localhost/api/moral-trade/group-buying/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("group-buying enforcement route previews proposal risk without mutating state", async () => {
  const response = await enforceGroupBuying(
    new Request("http://localhost/api/moral-trade/group-buying/enforce", {
      body: JSON.stringify({
        operation: "proposal_safety_review",
        proposal: {
          proposedActionText: "I would complete a 2-day no-meat challenge.",
          proposedConsiderationText: "$50 donation to an approved global health charity.",
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.stateMutation, false);
  assert.equal(body.proposalSafety.status, "clear");
});

test("group-buying collection route exposes discovery surface and safe commitment preview", async () => {
  const response = await getGroupBuying(new Request("http://localhost/api/moral-trade/group-buying"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.publicSurface.discoverySurface.activeCategory, "all");
  assert.ok(body.publicSurface.discoverySurface.cards.length >= 4);
  assert.ok(
    body.publicSurface.discoverySurface.cards.every(
      (card: { progressLabel: string }) => !/\d+%|authorized/i.test(card.progressLabel),
    ),
  );
  assert.ok(
    body.publicSurface.discoverySurface.categories.some(
      (category: { key: string; label: string }) => category.key === "baskets" && category.label === "Baskets",
    ),
  );
  assert.match(body.publicSurface.discoverySurface.commitmentPreview.noChargeLabel, /Due now \$0\.00/);
});

test("group-buying wiring covers API profile, route files, migration, docs, and nav", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const migration = readRepoFile("supabase/migrations/20260624_moral_goods_group_buying.sql");
  const page = readRepoFile("src/app/moral-goods-group-buying/page.tsx");
  const docs = readRepoFile("docs/moral-trade/moral-goods-group-buying.md");
  const site = readRepoFile("src/lib/site.ts");

  assert.match(apiContractSource, /moral_goods_group_buying_contract/);
  assert.match(apiContractSource, /moral_goods_group_buying_enforce/);
  assert.match(apiProfile, /group_buying_collection_response/);
  assert.match(apiProfile, /group_buying_contract_response/);
  assert.match(apiProfile, /group_buying_enforce_request/);
  assert.match(rateLimitSource, /group_buying_enforce/);
  assert.match(migration, /create table if not exists public\.moral_goods_purchase_envelope_registry/);
  assert.match(migration, /create table if not exists public\.moral_goods_credited_action_units/);
  assert.match(migration, /raw_unit_key text not null unique/);
  assert.match(page, /Fund verified actions/);
  assert.match(page, /DiscoverySection/);
  assert.match(page, /Browse reviewed routes/);
  assert.match(page, /CommitmentPreview/);
  assert.match(page, /safeActionNote/);
  assert.match(page, /Search action, proof, or consideration/);
  assert.match(docs, /Privacy And Retention/);
  assert.match(docs, /Public And Private Snapshots/);
  assert.match(docs, /Standing Microfund Pools/);
  assert.match(site, /moral-goods-group-buying/);
});
