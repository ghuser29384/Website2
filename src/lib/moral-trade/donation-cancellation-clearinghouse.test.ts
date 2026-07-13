import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DONATION_CANCELLATION_ADMIN_BLOCKERS,
  DONATION_CANCELLATION_BACKEND_REQUIREMENTS,
  DONATION_CANCELLATION_FEATURE_FLAG,
  DONATION_CANCELLATION_FEATURE_CLASSIFICATION,
  DONATION_CANCELLATION_LABS_PERMISSION,
  DONATION_CANCELLATION_LIVE_MONEY_FEATURE_FLAG,
  DONATION_CANCELLATION_NON_MVP_BANNER,
  DONATION_CANCELLATION_NON_MVP_WARNING,
  DONATION_CANCELLATION_PROMOTION_RECORDS,
  DONATION_CANCELLATION_SEED_MARKETS,
  DONATION_CANCELLATION_SEED_RECIPIENTS,
  DONATION_CANCELLATION_SEED_ROUNDS,
  assertDonationCancellationCapability,
  assertDonationCancellationJobCapability,
  buildDonationCancellationAuditReport,
  buildDonationCancellationSettlementPlan,
  computeDonationCancellationMatchGroups,
  createDonationCancellationDemoSettlement,
  evaluateDonationCancellationCapabilities,
  getDonationCancellationProductionPublicDecision,
  getDonationCancellationPublicRound,
  getDonationCancellationReceiptCopy,
  getDonationCancellationSeedData,
  runDonationCancellationCopyPreflight,
  serializeDonationCancellationPublicReport,
  simulateDonationCancellationRegistration,
  validateDonationCancellationSettlementFreshness,
  type FeaturePromotionRecord,
  type IntendedDonationRegistration,
  type MoralPrioritySnapshot,
} from "./donation-cancellation-clearinghouse";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const round = DONATION_CANCELLATION_SEED_ROUNDS[0];
const market = DONATION_CANCELLATION_SEED_MARKETS[0];
const recipients = DONATION_CANCELLATION_SEED_RECIPIENTS;
const markets = [market];
const approvedPromotionRecord: FeaturePromotionRecord = {
  approvalState: "approved" as const,
  approvedAt: "2026-07-06T12:00:00.000Z",
  approvedByGovernance: "governance-reviewer",
  approvedByLegal: "legal-reviewer",
  approvedByPayments: "payments-reviewer",
  approvedByProduct: "product-reviewer",
  approvedByTrustSafety: "trust-safety-reviewer",
  createdAt: "2026-07-06T12:00:00.000Z",
  featureKey: DONATION_CANCELLATION_FEATURE_FLAG,
  fromClassification: "non_mvp" as const,
  id: "promotion-approved-fixture",
  notes: "Fixture only.",
  promotionHash: "sha256:approved-fixture",
  requestedBy: "product",
  toClassification: "public_real_money" as const,
  updatedAt: "2026-07-06T12:00:00.000Z",
};

function register(input: {
  userId: string;
  recipientId: string;
  amountMinor: number;
  weights: Record<string, number>;
  accepts: string[];
  rejects?: string[];
  consentMode?: "preconsented_allowed_list" | "require_review_before_routing";
}) {
  const result = simulateDonationCancellationRegistration({
    acceptableRedirectRecipientIds: input.accepts,
    currency: "usd",
    environment: "development",
    featureEnabled: true,
    grossAmountMinor: input.amountMinor,
    intendedRecipientId: input.recipientId,
    markets,
    paymentMode: "dev_simulated_capture",
    priorityWeights: input.weights,
    recipients,
    redirectConsentMode: input.consentMode ?? "preconsented_allowed_list",
    round,
    unacceptableRedirectRecipientIds: input.rejects ?? [],
    userId: input.userId,
  });
  assert.equal(result.ok, true, result.blockers.join(", "));
  assert.ok(result.registration);
  assert.ok(result.prioritySnapshot);
  return {
    priority: result.prioritySnapshot,
    registration: result.registration,
  };
}

function planFor(rows: Array<{ registration: IntendedDonationRegistration; priority: MoralPrioritySnapshot }>) {
  return buildDonationCancellationSettlementPlan({
    markets,
    prioritySnapshots: rows.map((row) => row.priority),
    recipients,
    registrations: rows.map((row) => row.registration),
    round,
  });
}

test("repository implementation notes document reused patterns and production gaps", () => {
  const notes = readRepoFile("docs/donation-cancellation-clearinghouse.md");

  assert.match(notes, /Next\.js App Router/i);
  assert.match(notes, /Supabase migrations/i);
  assert.match(notes, /production fail-closed/i);
  assert.match(notes, /dev_simulated_capture/i);
  assert.match(notes, /provider_authorization_then_capture/i);
  assert.match(notes, /provider_capture_to_compliant_clearing_account/i);
  assert.match(notes, /No political campaign contributions/i);
});

test("feature classification marks donation cancellation as non-MVP and disabled by default", () => {
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.featureKey, DONATION_CANCELLATION_FEATURE_FLAG);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.featureClassification, "non_mvp");
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.deploymentStage, "labs_research_non_mvp");
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.defaultEnabled, false);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.productionPublicEnabled, false);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.productionRealMoneyEnabled, false);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.primaryNavEnabled, false);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.mvpSurfaceEnabled, false);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.cgppSurfaceEnabled, false);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.requiresAdminOrLabsAccess, true);
  assert.equal(DONATION_CANCELLATION_FEATURE_CLASSIFICATION.requiresExplicitPromotionRecord, true);
  assert.equal(DONATION_CANCELLATION_LIVE_MONEY_FEATURE_FLAG, "donation_cancellation_live_money_enabled");
  assert.deepEqual(DONATION_CANCELLATION_PROMOTION_RECORDS, []);
});

test("production public and real-money capabilities fail closed while admin labs view is explicit", () => {
  const publicDecision = getDonationCancellationProductionPublicDecision();
  const adminLabs = assertDonationCancellationCapability(
    "view_labs_landing",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "dev_simulated_capture",
    },
  );
  const publicRound = assertDonationCancellationCapability(
    "open_round",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "dev_simulated_capture",
    },
  );

  assert.equal(publicDecision.ok, false);
  assert.ok(publicDecision.reasons.includes("feature_disabled"));
  assert.ok(publicDecision.reasons.includes("public_surface_disabled"));
  assert.equal(adminLabs.ok, true);
  assert.match(adminLabs.userFacingSummary, /Non-MVP mechanism/);
  assert.equal(publicRound.ok, false);
  assert.ok(publicRound.reasons.includes("public_surface_disabled"));
});

test("main feature flag alone never enables production real-money actions", () => {
  const authorize = assertDonationCancellationCapability(
    "authorize_payment",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "provider_authorization_then_capture",
      providerAuthorizationSupported: true,
    },
  );
  const fullyPreparedButStillNonMvp = assertDonationCancellationCapability(
    "capture_payment",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      capsConfigured: true,
      compliantCaptureSupported: true,
      copyPreflightPassed: true,
      featureEnabled: true,
      labsEnabled: true,
      legalComplianceReady: true,
      liveMoneyEnabled: true,
      paymentMode: "provider_capture_to_compliant_clearing_account",
      promotionRecord: approvedPromotionRecord,
      trustSafetyReady: true,
    },
  );

  assert.equal(authorize.ok, false);
  assert.ok(authorize.reasons.includes("feature_non_mvp"));
  assert.ok(authorize.reasons.includes("production_real_money_disabled"));
  assert.ok(authorize.reasons.includes("missing_promotion_record"));
  assert.ok(authorize.reasons.includes("payment_mode_not_allowed_for_non_mvp"));
  assert.equal(fullyPreparedButStillNonMvp.ok, false);
  assert.ok(fullyPreparedButStillNonMvp.reasons.includes("feature_non_mvp"));
  assert.ok(fullyPreparedButStillNonMvp.reasons.includes("production_real_money_disabled"));
});

test("dev simulated registration requires explicit feature enablement", () => {
  const disabled = simulateDonationCancellationRegistration({
    acceptableRedirectRecipientIds: ["global-poverty-charity"],
    currency: "usd",
    environment: "development",
    grossAmountMinor: 10_000,
    intendedRecipientId: "fictional-watershed-restoration-a",
    markets,
    paymentMode: "dev_simulated_capture",
    priorityWeights: { global_health: 100 },
    recipients,
    redirectConsentMode: "preconsented_allowed_list",
    round,
    userId: "disabled-dev-user",
  });
  const production = simulateDonationCancellationRegistration({
    acceptableRedirectRecipientIds: ["global-poverty-charity"],
    currency: "usd",
    environment: "production",
    featureEnabled: true,
    grossAmountMinor: 10_000,
    intendedRecipientId: "fictional-watershed-restoration-a",
    markets,
    paymentMode: "dev_simulated_capture",
    priorityWeights: { global_health: 100 },
    recipients,
    redirectConsentMode: "preconsented_allowed_list",
    round,
    userId: "production-user",
  });

  assert.equal(disabled.ok, false);
  assert.ok(disabled.blockers.includes("feature_disabled"));
  assert.equal(production.ok, false);
  assert.ok(production.blockers.includes("public_surface_disabled"));
  assert.ok(production.blockers.includes("production_real_money_disabled"));
  assert.equal(production.registration, null);
});

test("public routes are guarded and admin route carries persistent non-MVP banner", () => {
  const publicPage = readRepoFile("src/app/donation-cancellation/page.tsx");
  const roundPage = readRepoFile("src/app/donation-cancellation/[roundSlug]/page.tsx");
  const registerPage = readRepoFile("src/app/donation-cancellation/[roundSlug]/register/page.tsx");
  const accountPage = readRepoFile("src/app/account/donation-cancellations/page.tsx");
  const adminPage = readRepoFile("src/app/admin/donation-cancellation/page.tsx");
  const routeBaseline = readRepoFile("config/measurement/public-route-baseline.json");
  const crawlability = readRepoFile("scripts/verify-crawlability.mjs");

  for (const source of [publicPage, roundPage, registerPage, accountPage]) {
    assert.match(source, /DonationCancellationNonMvpNotice/);
    assert.match(source, /featureEnabled:\s*false/);
    assert.match(source, /labsEnabled:\s*false/);
  }
  assert.match(adminPage, /DONATION_CANCELLATION_NON_MVP_BANNER/);
  assert.doesNotMatch(routeBaseline, /\/donation-cancellation/);
  assert.doesNotMatch(crawlability, /\/donation-cancellation/);
});

test("migration scaffold encodes non-MVP status, promotion guard, and no public read policy", () => {
  const migration = readRepoFile("supabase/migrations/20260706_donation_cancellation_clearinghouse.sql");
  const auditNote = readRepoFile("docs/donation-cancellation-clearinghouse-non-mvp-audit.md");

  assert.match(migration, /feature_classification text not null default 'non_mvp'/);
  assert.match(migration, /donation_cancellation_feature_promotion_records/);
  assert.match(migration, /donation_cancellation_marked_non_mvp_disabled/);
  assert.match(migration, /provider_operation_ref is null/);
  assert.match(migration, /No public read policy is created while the feature remains non-MVP/);
  assert.doesNotMatch(migration, /Public can read active donation cancellation rounds/);
  assert.match(auditNote, /Exposure Points Found/);
  assert.match(auditNote, /Payment Paths Blocked/);
  assert.match(auditNote, /Remaining Risks/);
});

test("development feature flag enables simulated registration while production simulation fails closed", () => {
  const dev = evaluateDonationCancellationCapabilities({
    compliantCaptureSupported: false,
    environment: "development",
    featureFlagEnabled: true,
    paymentMode: "dev_simulated_capture",
    providerAuthorizationSupported: false,
  });
  const production = evaluateDonationCancellationCapabilities({
    compliantCaptureSupported: false,
    environment: "production",
    featureFlagEnabled: true,
    paymentMode: "dev_simulated_capture",
    providerAuthorizationSupported: false,
  });

  assert.equal(dev.status, "dev_simulated");
  assert.deepEqual(dev.blockers, []);
  assert.equal(production.status, "blocked");
  assert.ok(production.blockers.includes("payment_mode_not_allowed_for_non_mvp"));
  assert.ok(production.blockers.includes("production_real_money_disabled"));
});

test("registration uses integer minor units, explicit currency, approved recipients, and final review", () => {
  const result = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "minor-units-user",
    weights: { global_health: 100 },
  });

  assert.equal(result.registration.grossAmountMinor, 10_000);
  assert.equal(result.registration.currency, "usd");
  assert.equal(result.registration.paymentState, "captured_pending_routing");
  assert.equal(result.registration.registrationState, "paid_registered");
  assert.equal(result.registration.finalReviewConfirmedAt, "2026-07-06T12:00:00.000Z");
  assert.equal(result.registration.userAttestationChecked, true);
  assert.equal(result.priority.visibility, "aggregate_only");
});

test("unsupported recipient, blocked route, payment failure, and currency mismatch do not become eligible", () => {
  const blockedRecipient = simulateDonationCancellationRegistration({
    acceptableRedirectRecipientIds: ["global-poverty-charity"],
    currency: "usd",
    environment: "development",
    featureEnabled: true,
    grossAmountMinor: 10_000,
    intendedRecipientId: "route-blocked-health-charity",
    markets,
    paymentMode: "dev_simulated_capture",
    priorityWeights: { global_health: 100 },
    recipients,
    redirectConsentMode: "preconsented_allowed_list",
    round,
    userId: "blocked-route-user",
  });
  const wrongCurrency = simulateDonationCancellationRegistration({
    acceptableRedirectRecipientIds: ["global-poverty-charity"],
    currency: "eur",
    environment: "development",
    featureEnabled: true,
    grossAmountMinor: 10_000,
    intendedRecipientId: "fictional-watershed-restoration-a",
    markets,
    paymentMode: "dev_simulated_capture",
    priorityWeights: { global_health: 100 },
    recipients,
    redirectConsentMode: "preconsented_allowed_list",
    round,
    userId: "wrong-currency-user",
  });
  const eligible = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "eligible-user",
    weights: { global_health: 100 },
  });
  const failed = {
    ...eligible.registration,
    id: "payment-failed-registration",
    paymentState: "payment_failed" as const,
    registrationState: "excluded_payment" as const,
  };
  const groups = computeDonationCancellationMatchGroups({
    markets,
    recipients,
    registrations: [failed],
    round,
  });

  assert.equal(blockedRecipient.ok, false);
  assert.ok(blockedRecipient.blockers.includes("recipient_not_approved_or_route_not_verified"));
  assert.equal(wrongCurrency.ok, false);
  assert.ok(wrongCurrency.blockers.includes("round_currency_mismatch"));
  assert.equal(groups[0].sideATotalEligibleMinor, 0);
});

test("equal opposed donations match fully and redirect to a mutually accepted recipient", () => {
  const sideA = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "equal-side-a",
    weights: { global_health: 100 },
  });
  const sideB = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "equal-side-b",
    weights: { global_health: 100 },
  });
  const plan = planFor([sideA, sideB]);

  assert.equal(plan.status, "computed");
  assert.equal(plan.ledgerBalanceStatus, "balanced");
  assert.equal(plan.matchGroups[0].sideAMatchedMinor, 10_000);
  assert.equal(plan.matchGroups[0].sideBMatchedMinor, 10_000);
  assert.equal(plan.redirectSuggestions[0].redirectRecipientId, "global-poverty-charity");
  assert.equal(plan.allocationRows.every((row) => row.finalRedirectRouteMinor === 10_000), true);
  assert.equal(new Set(plan.routingOperations.map((operation) => operation.idempotencyKey)).size, plan.routingOperations.length);
});

test("unequal opposed donations partially match and surplus routes to original intended destination", () => {
  const sideA = register({
    accepts: ["animal-welfare-charity"],
    amountMinor: 15_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "surplus-side-a",
    weights: { animal_welfare: 100 },
  });
  const sideB = register({
    accepts: ["animal-welfare-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "surplus-side-b",
    weights: { animal_welfare: 100 },
  });
  const plan = planFor([sideA, sideB]);
  const surplusRow = plan.allocationRows.find((row) => row.registrationId === sideA.registration.id);

  assert.ok(surplusRow);
  assert.equal(surplusRow.allocatedMatchedMinor, 10_000);
  assert.equal(surplusRow.allocatedUnmatchedMinor, 5_000);
  assert.equal(surplusRow.finalRedirectRouteMinor, 10_000);
  assert.equal(surplusRow.finalIntendedRouteMinor, 5_000);
  assert.equal(surplusRow.allocationState, "accepted");
});

test("no opposition routes all eligible funds to intended destination", () => {
  const sideA = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 8_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "unmatched-side-a",
    weights: { global_health: 100 },
  });
  const plan = planFor([sideA]);

  assert.equal(plan.matchGroups[0].sideAMatchedMinor, 0);
  assert.equal(plan.allocationRows[0].finalRedirectRouteMinor, 0);
  assert.equal(plan.allocationRows[0].finalIntendedRouteMinor, 8_000);
  assert.match(
    getDonationCancellationReceiptCopy({
      allocation: plan.allocationRows[0],
      recipients,
      registration: sideA.registration,
    }),
    /No compatible opposed donation was found/,
  );
});

test("opposition with no common redirect routes matched funds to intended destinations", () => {
  const sideA = register({
    accepts: ["animal-welfare-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "no-common-side-a",
    weights: { animal_welfare: 100 },
  });
  const sideB = register({
    accepts: ["public-knowledge-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "no-common-side-b",
    weights: { public_knowledge: 100 },
  });
  const plan = planFor([sideA, sideB]);

  assert.equal(plan.redirectSuggestions.length, 0);
  assert.equal(plan.allocationRows.every((row) => row.finalRedirectRouteMinor === 0), true);
  assert.equal(plan.allocationRows.every((row) => row.finalIntendedRouteMinor === 10_000), true);
  assert.match(
    getDonationCancellationReceiptCopy({
      allocation: plan.allocationRows[0],
      recipients,
      registration: sideA.registration,
    }),
    /no redirect recipient satisfied/,
  );
});

test("deterministic pro-rata cents allocation uses largest remainder by stable registration id", () => {
  const a1 = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_001,
    recipientId: "fictional-watershed-restoration-a",
    userId: "rounding-a1",
    weights: { global_health: 100 },
  });
  const a2 = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_001,
    recipientId: "fictional-watershed-restoration-a",
    userId: "rounding-a2",
    weights: { global_health: 100 },
  });
  const b = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_001,
    recipientId: "fictional-watershed-restoration-b",
    userId: "rounding-b",
    weights: { global_health: 100 },
  });
  const plan = planFor([a1, a2, b]);
  const sideARows = plan.allocationRows
    .filter((row) => [a1.registration.id, a2.registration.id].includes(row.registrationId))
    .sort((left, right) => left.registrationId.localeCompare(right.registrationId));

  assert.deepEqual(sideARows.map((row) => row.allocatedMatchedMinor), [5_001, 5_000]);
  assert.equal(plan.settlementOutputHash, planFor([a1, a2, b]).settlementOutputHash);
});

test("suggestion scoring maximizes minimum priority fit, then hides private scores", () => {
  const sideA = register({
    accepts: ["global-poverty-charity", "animal-welfare-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "score-side-a",
    weights: { animal_welfare: 10, global_health: 90 },
  });
  const sideB = register({
    accepts: ["global-poverty-charity", "animal-welfare-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "score-side-b",
    weights: { animal_welfare: 10, global_health: 90 },
  });
  const plan = planFor([sideA, sideB]);

  assert.equal(plan.redirectSuggestions[0].redirectRecipientId, "global-poverty-charity");
  assert.equal(plan.redirectSuggestions[0].privateScoreJsonRef, null);
  assert.doesNotMatch(plan.redirectSuggestions[0].publicExplanation, /0\.\d/);
  assert.doesNotMatch(plan.redirectSuggestions[0].publicExplanation, /private score/i);
});

test("unacceptable recipient and review-required unapproved suggestions never redirect", () => {
  const unacceptable = register({
    accepts: ["global-poverty-charity", "animal-welfare-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    rejects: ["global-poverty-charity"],
    userId: "reject-side-a",
    weights: { animal_welfare: 100, global_health: 100 },
  });
  const reviewRequired = register({
    accepts: ["animal-welfare-charity"],
    amountMinor: 10_000,
    consentMode: "require_review_before_routing",
    recipientId: "fictional-watershed-restoration-b",
    userId: "review-side-b",
    weights: { animal_welfare: 100 },
  });
  const plan = planFor([unacceptable, reviewRequired]);

  assert.equal(plan.redirectSuggestions[0].redirectRecipientId, "animal-welfare-charity");
  assert.equal(plan.redirectSuggestions[0].status, "requires_user_review");
  assert.equal(plan.allocationRows.every((row) => row.finalRedirectRouteMinor === 0), true);
  assert.equal(plan.allocationRows.every((row) => row.finalIntendedRouteMinor === 10_000), true);
});

test("recipient route failure before redirect falls back to intended destination", () => {
  const sideA = register({
    accepts: ["route-blocked-health-charity"],
    amountMinor: 9_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "blocked-redirect-a",
    weights: { global_health: 100 },
  });
  const sideB = register({
    accepts: ["route-blocked-health-charity"],
    amountMinor: 9_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "blocked-redirect-b",
    weights: { global_health: 100 },
  });
  const plan = planFor([sideA, sideB]);

  assert.equal(plan.redirectSuggestions.length, 0);
  assert.equal(plan.allocationRows.every((row) => row.finalRedirectRouteMinor === 0), true);
  assert.equal(plan.allocationRows.every((row) => row.finalIntendedRouteMinor === 9_000), true);
});

test("settlement plan binds hashes and stale plans cannot execute", () => {
  const sideA = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "fresh-side-a",
    weights: { global_health: 100 },
  });
  const sideB = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "fresh-side-b",
    weights: { global_health: 100 },
  });
  const approved = planFor([sideA, sideB]);
  const changed = planFor([
    { ...sideA, registration: { ...sideA.registration, grossAmountMinor: 10_001 } },
    sideB,
  ]);
  const validation = validateDonationCancellationSettlementFreshness(approved, changed);

  assert.match(approved.settlementInputHash, /^sha256:/);
  assert.match(approved.settlementOutputHash, /^sha256:/);
  assert.equal(validation.status, "blocked");
  assert.ok(validation.blockers.includes("settlement_input_hash_changed"));
});

test("audit report reconciles gross, fees, routed-to-intended, redirected, and public report copy", () => {
  const sideA = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 15_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "audit-side-a",
    weights: { global_health: 100 },
  });
  const sideB = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-b",
    userId: "audit-side-b",
    weights: { global_health: 100 },
  });
  const plan = planFor([sideA, sideB]);
  const report = buildDonationCancellationAuditReport({
    plan,
    recipients,
    registrations: [sideA.registration, sideB.registration],
    round,
  });
  const publicReport = serializeDonationCancellationPublicReport(report);

  assert.equal(report.grossRegisteredMinor, 25_000);
  assert.equal(report.grossMatchedMinor, 20_000);
  assert.equal(report.grossRedirectedMinor, 20_000);
  assert.equal(report.grossRoutedToIntendedMinor, 5_000);
  assert.equal(report.feeMinor, 0);
  assert.equal(publicReport.label, "opposed donation volume redirected");
  assert.doesNotMatch(JSON.stringify(publicReport), /objective impact/i);
  assert.doesNotMatch(JSON.stringify(publicReport), /userId|payment-|priorityWeights|commonGroundScore/i);
});

test("copy preflight blocks prohibited words and payment overclaims", () => {
  const failed = runDonationCancellationCopyPreflight(
    "Guaranteed redirect with escrow, custody, objective impact, moral score, permission, register now, pay now, real-money available, production-ready, active product, public launch, and no charge now but captured now.",
  );
  const passed = runDonationCancellationCopyPreflight(
    "Register a donation you already intend to make. If no compatible opposed donation is found, your money goes to your original intended recipient.",
  );

  assert.equal(failed.status, "failed");
  assert.ok(failed.blockers.includes("copy_prohibited_escrow"));
  assert.ok(failed.blockers.includes("copy_prohibited_guaranteed_redirect"));
  assert.ok(failed.blockers.includes("copy_prohibited_register_now"));
  assert.ok(failed.blockers.includes("copy_prohibited_pay_now"));
  assert.ok(failed.blockers.includes("copy_prohibited_real_money_available"));
  assert.ok(failed.blockers.includes("copy_prohibited_production_ready"));
  assert.ok(failed.blockers.includes("copy_prohibited_active_product"));
  assert.ok(failed.blockers.includes("copy_prohibited_public_launch"));
  assert.ok(failed.blockers.includes("copy_payment_overclaim_mixed_charge_language"));
  assert.equal(passed.status, "passed");
  assert.match(DONATION_CANCELLATION_NON_MVP_WARNING, /non-MVP moral-trade mechanism under review/);
  assert.match(DONATION_CANCELLATION_NON_MVP_BANNER, /Not part of the current CGPP MVP/);
});

test("emergency pause blocks new side effects while receipts remain describeable", () => {
  const paused = evaluateDonationCancellationCapabilities({
    compliantCaptureSupported: false,
    environment: "development",
    featureFlagEnabled: true,
    pausedLanes: ["all_feature_activity"],
    paymentMode: "dev_simulated_capture",
    providerAuthorizationSupported: false,
  });
  const failedRegistration = register({
    accepts: ["global-poverty-charity"],
    amountMinor: 10_000,
    recipientId: "fictional-watershed-restoration-a",
    userId: "receipt-user",
    weights: { global_health: 100 },
  }).registration;
  const failed = { ...failedRegistration, paymentState: "payment_failed" as const };

  assert.equal(paused.status, "paused");
  assert.match(paused.userFacingSummary, /receipts and support access remain visible/);
  assert.match(
    getDonationCancellationReceiptCopy({ allocation: undefined, recipients, registration: failed }),
    /payment confirmation failed/,
  );
});

test("seed data includes blocked political placeholders and required admin blockers", () => {
  const blockedRecipients = DONATION_CANCELLATION_SEED_RECIPIENTS.filter((recipient) => recipient.productionBlockedReason);

  assert.ok(blockedRecipients.some((recipient) => recipient.name === "Gun rights advocacy placeholder"));
  assert.ok(blockedRecipients.some((recipient) => recipient.name === "Gun control advocacy placeholder"));
  assert.ok(blockedRecipients.every((recipient) => recipient.reviewState === "blocked"));
  assert.ok(DONATION_CANCELLATION_ADMIN_BLOCKERS.includes("feature_non_mvp"));
  assert.ok(DONATION_CANCELLATION_ADMIN_BLOCKERS.includes("production_real_money_disabled"));
  assert.ok(DONATION_CANCELLATION_ADMIN_BLOCKERS.includes("missing_promotion_record"));
  assert.ok(DONATION_CANCELLATION_BACKEND_REQUIREMENTS.some((requirement) => /RLS/.test(requirement)));
});

test("production seed data is blocked and dev fixtures are explicit", () => {
  const productionSeed = getDonationCancellationSeedData({ environment: "production" });
  const noFixtureDevSeed = getDonationCancellationSeedData({ environment: "development" });
  const fixtureDevSeed = getDonationCancellationSeedData({ environment: "development", includeDevFixtures: true });

  assert.equal(productionSeed.rounds.every((seedRound) => seedRound.status !== "open"), true);
  assert.equal(productionSeed.markets.every((seedMarket) => seedMarket.status !== "active"), true);
  assert.equal(productionSeed.registrations.length, 0);
  assert.equal(productionSeed.recipients.every((recipient) => recipient.paymentRouteState === "blocked"), true);
  assert.equal(noFixtureDevSeed.rounds.length, 0);
  assert.ok(fixtureDevSeed.rounds.some((seedRound) => seedRound.slug === "dev-donation-clearinghouse"));
});

test("background jobs use service gates before side effects", () => {
  const paymentRetry = assertDonationCancellationJobCapability(
    "payment_retry_job",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "provider_authorization_then_capture",
      providerAuthorizationSupported: true,
    },
  );
  const report = assertDonationCancellationJobCapability(
    "public_report_job",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "dev_simulated_capture",
    },
  );
  const matchingSimulation = assertDonationCancellationJobCapability(
    "matching_job",
    { role: "admin", permissions: [DONATION_CANCELLATION_LABS_PERMISSION] },
    "production",
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "dev_simulated_capture",
    },
  );

  assert.equal(paymentRetry.ok, false);
  assert.ok(paymentRetry.reasons.includes("production_real_money_disabled"));
  assert.equal(report.ok, false);
  assert.ok(report.reasons.includes("public_surface_disabled"));
  assert.equal(matchingSimulation.ok, true);
});

test("public round serialization exposes feature flag and qualitative pre-close progress only", () => {
  const publicRound = getDonationCancellationPublicRound(round);

  assert.equal(publicRound.featureFlag, DONATION_CANCELLATION_FEATURE_FLAG);
  assert.match(publicRound.progressCopy, /qualitative before close/);
  assert.doesNotMatch(JSON.stringify(publicRound), /sideATotal|sideBTotal|paymentOperationId|priorityWeights/);
});

test("demo settlement remains deterministic and balanced", () => {
  const first = createDonationCancellationDemoSettlement();
  const second = createDonationCancellationDemoSettlement();

  assert.equal(first.plan.ledgerBalanceStatus, "balanced");
  assert.equal(first.plan.settlementOutputHash, second.plan.settlementOutputHash);
  assert.ok(first.auditReport.registrationCount >= 6);
});
