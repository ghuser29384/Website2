import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PERFORMANCE_BOND_COPY,
  PERFORMANCE_BOND_EVIDENCE_TEMPLATES,
  PERFORMANCE_BOND_LIMITATION_COPY,
  PERFORMANCE_BOND_REVIEWER_POLICY,
  assertPerformanceBondTransition,
  calculateForfeitureDistribution,
  canActOnPerformanceBond,
  canTransitionPerformanceBond,
  evidenceSchemaFromJson,
  getPerformanceBondConfig,
  isLiveBondPaymentsEnabled,
  isPledgePerformanceBondsEnabled,
  normalizePerformanceBondEvidenceSchema,
  parsePerformanceBondSplitConfig,
  validatePerformanceBondTerms,
  type PerformanceBondRecord,
} from "@/lib/performance-bonds";

const baseSchema = normalizePerformanceBondEvidenceSchema({
  acceptedEvidenceTypes: "Periodic self-report, check-in notes, public log, or receipt evidence.",
  actionToProve: "The pledged personal action was completed by the agreed deadline.",
  minimumDetail: "Dates covered, exceptions, and enough detail to compare against the pledge.",
  privateEvidenceAllowed: true,
  reviewStandard: "Evidence materially satisfies the agreed schema without invasive surveillance.",
  templateKey: "diet_behavior_pledge",
  visibility: "mixed_redacted",
});

const baseTerms = {
  additionalityStatement:
    "The reciprocal swap changes my plan because I would not otherwise take this action this month.",
  amountCents: 5_000,
  challengeWindowDays: 14,
  counterpartyPayoutConsent: false,
  currency: "USD",
  enabled: true,
  evidenceDueAt: "2026-08-01T00:00:00.000Z",
  evidenceSchema: baseSchema,
  forfeitureDestination: "compromise_charity" as const,
  noTradeBaseline:
    "Without this swap, I would not make the specific pledge on this timeline.",
  splitConfig: parsePerformanceBondSplitConfig({
    counterpartyPercent: 0,
    mpgfPercent: 50,
    neutralCausePercent: 50,
  }),
};

const baseBond = {
  counterparty_id: "counterparty-1",
  party_id: "party-1",
  status: "challenge_window_open",
} as PerformanceBondRecord;

test("feature flags keep pledge performance bonds separate from live bond payments", () => {
  assert.equal(
    isPledgePerformanceBondsEnabled({ ENABLE_PLEDGE_PERFORMANCE_BONDS: "true" }),
    true,
  );
  assert.equal(
    isPledgePerformanceBondsEnabled({ ENABLE_PLEDGE_PERFORMANCE_BONDS: "false" }),
    false,
  );
  assert.equal(isLiveBondPaymentsEnabled({ ENABLE_LIVE_BOND_PAYMENTS: "true" }), true);
  assert.equal(isLiveBondPaymentsEnabled({ ENABLE_LIVE_BOND_PAYMENTS: "false" }), false);
  assert.deepEqual(
    getPerformanceBondConfig({
      ENABLE_LIVE_BOND_PAYMENTS: "false",
      ENABLE_PLEDGE_PERFORMANCE_BONDS: "true",
      PLEDGE_PERFORMANCE_BOND_MAX_CENTS: "25000",
      PLEDGE_PERFORMANCE_BOND_MIN_CENTS: "1000",
    }),
    {
      enabled: true,
      livePaymentsEnabled: false,
      maxAmountCents: 25_000,
      minAmountCents: 1_000,
      stalePaymentPendingDays: 14,
    },
  );
});

test("creating a personal pledge swap without a bond has no bond validation errors", () => {
  const validation = validatePerformanceBondTerms({
    ...baseTerms,
    enabled: false,
    evidenceSchema: normalizePerformanceBondEvidenceSchema({}),
  });

  assert.deepEqual(validation.errors, []);
});

test("creating one offer-maker bond requires concrete amount, evidence schema, baseline, and additionality", () => {
  const validation = validatePerformanceBondTerms(
    {
      ...baseTerms,
      additionalityStatement: "",
      amountCents: 100,
      evidenceSchema: normalizePerformanceBondEvidenceSchema({
        acceptedEvidenceTypes: "maybe",
        actionToProve: "something",
        minimumDetail: "none",
        reviewStandard: "loose",
      }),
      noTradeBaseline: "",
    },
    getPerformanceBondConfig({
      ENABLE_PLEDGE_PERFORMANCE_BONDS: "true",
      PLEDGE_PERFORMANCE_BOND_MIN_CENTS: "1_000",
    }),
    new Date("2026-05-31T00:00:00.000Z"),
  );

  assert.ok(validation.errors.some((error) => /at least/i.test(error)));
  assert.ok(validation.errors.some((error) => /Evidence schema/i.test(error)));
  assert.ok(validation.errors.some((error) => /No-trade baseline/i.test(error)));
  assert.ok(validation.errors.some((error) => /additional/i.test(error)));
});

test("creating symmetric offer-maker and taker bonds uses independent sides and reviewer policy", () => {
  const offererValidation = validatePerformanceBondTerms(baseTerms, undefined, new Date("2026-05-31T00:00:00.000Z"));
  const takerValidation = validatePerformanceBondTerms(
    {
      ...baseTerms,
      amountCents: 2_500,
      challengeWindowDays: 7,
    },
    undefined,
    new Date("2026-05-31T00:00:00.000Z"),
  );

  assert.deepEqual(offererValidation.errors, []);
  assert.deepEqual(takerValidation.errors, []);
  assert.equal(
    PERFORMANCE_BOND_REVIEWER_POLICY,
    "Counterparty may accept or challenge; platform arbitration if disputed",
  );
});

test("bond terms lock through state machine after acceptance", () => {
  assert.equal(canTransitionPerformanceBond("draft", "awaiting_funding"), true);
  assert.equal(canTransitionPerformanceBond("draft", "active"), true);
  assert.equal(canTransitionPerformanceBond("awaiting_funding", "challenge_window_open"), true);
  assert.equal(canTransitionPerformanceBond("awaiting_funding", "draft"), false);
  assert.throws(
    () => assertPerformanceBondTransition("awaiting_funding", "draft"),
    /Invalid pledge performance bond transition/,
  );
});

test("evidence schema is required before acceptance", () => {
  const validation = validatePerformanceBondTerms(
    {
      ...baseTerms,
      evidenceSchema: normalizePerformanceBondEvidenceSchema({
        acceptedEvidenceTypes: "",
        actionToProve: "",
        minimumDetail: "",
        reviewStandard: "",
      }),
    },
    undefined,
    new Date("2026-05-31T00:00:00.000Z"),
  );

  assert.ok(validation.errors.some((error) => /Evidence schema/i.test(error)));
});

test("counterparty cannot unilaterally forfeit a bond", () => {
  assert.equal(
    canActOnPerformanceBond({
      action: "challenge_evidence",
      actorId: "counterparty-1",
      actorRole: "counterparty",
      bond: baseBond,
    }),
    true,
  );
  assert.equal(
    canActOnPerformanceBond({
      action: "release",
      actorId: "counterparty-1",
      actorRole: "counterparty",
      bond: baseBond,
    }),
    false,
  );
});

test("no challenge within challenge window leads to auto-refund path, while challenges route to review", () => {
  assert.equal(canTransitionPerformanceBond("challenge_window_open", "auto_refund_pending"), true);
  assert.equal(canTransitionPerformanceBond("auto_refund_pending", "refunded"), true);
  assert.equal(canTransitionPerformanceBond("challenge_window_open", "challenged"), true);
  assert.equal(canTransitionPerformanceBond("challenged", "under_review"), true);
});

test("accepted review outcome refunds and rejected review outcome releases according to forfeiture rule", () => {
  assert.equal(canTransitionPerformanceBond("under_review", "accepted_after_review"), true);
  assert.equal(canTransitionPerformanceBond("accepted_after_review", "auto_refund_pending"), true);
  assert.equal(canTransitionPerformanceBond("under_review", "rejected_after_review"), true);
  assert.equal(canTransitionPerformanceBond("rejected_after_review", "forfeited"), true);
  assert.equal(canTransitionPerformanceBond("rejected_after_review", "split_disbursed"), true);
});

test("split forfeiture distribution calculates exact cents and totals to bond amount", () => {
  const distribution = calculateForfeitureDistribution({
    amountCents: 10_001,
    counterpartyId: "counterparty-1",
    currency: "USD",
    forfeitureDestination: "split",
    forfeitureDestinationId: "neutral-charity",
    partyId: "party-1",
    splitConfig: parsePerformanceBondSplitConfig({
      counterpartyPercent: 25,
      mpgfPercent: 25,
      neutralCausePercent: 50,
    }),
  });

  assert.equal(distribution.length, 3);
  assert.equal(
    distribution.reduce((total, entry) => total + entry.amountCents, 0),
    10_001,
  );
  assert.deepEqual(
    distribution.map((entry) => entry.destinationType),
    ["counterparty", "compromise_charity", "mpgf"],
  );
});

test("counterparty payout requires advanced explicit consent", () => {
  const direct = validatePerformanceBondTerms(
    { ...baseTerms, forfeitureDestination: "counterparty", counterpartyPayoutConsent: false },
    undefined,
    new Date("2026-05-31T00:00:00.000Z"),
  );
  const split = validatePerformanceBondTerms(
    {
      ...baseTerms,
      forfeitureDestination: "split",
      splitConfig: parsePerformanceBondSplitConfig({
        counterpartyPercent: 10,
        mpgfPercent: 40,
        neutralCausePercent: 50,
      }),
      counterpartyPayoutConsent: false,
    },
    undefined,
    new Date("2026-05-31T00:00:00.000Z"),
  );

  assert.ok(direct.errors.some((error) => /Counterparty payout/i.test(error)));
  assert.ok(split.errors.some((error) => /Counterparty payout/i.test(error)));
});

test("copy does not display escrow-backed claims unless a real provider exists", () => {
  const copy = [
    PERFORMANCE_BOND_COPY,
    PERFORMANCE_BOND_LIMITATION_COPY,
    PERFORMANCE_BOND_REVIEWER_POLICY,
  ].join("\n");

  assert.equal(/escrow-backed/i.test(copy), false);
  assert.equal(/guaranteed compliance/i.test(copy), false);
  assert.ok(/factual trust/i.test(copy));
});

test("UI and job route wire production v1 surfaces without escrow-backed copy", () => {
  const source = [
    "src/app/offers/[offerId]/page.tsx",
    "src/app/agreements/[agreementId]/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/api/jobs/performance-bonds/route.ts",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  assert.match(source, /Optional reciprocal performance bond/);
  assert.match(source, /submitPerformanceBondEvidenceAction/);
  assert.match(source, /adjudicatePerformanceBondChallengeAction/);
  assert.match(source, /processPerformanceBondScheduledTransitions/);
  assert.equal(/escrow-backed/i.test(source), false);
  assert.equal(/guaranteed compliance/i.test(source), false);
});

test("audit-relevant state transitions include evidence, challenge, review, refund, and release states", () => {
  for (const [from, to] of [
    ["active", "challenge_window_open"],
    ["challenge_window_open", "challenged"],
    ["challenged", "under_review"],
    ["under_review", "accepted_after_review"],
    ["accepted_after_review", "auto_refund_pending"],
    ["auto_refund_pending", "refunded"],
    ["under_review", "rejected_after_review"],
    ["rejected_after_review", "split_disbursed"],
  ] as const) {
    assert.equal(canTransitionPerformanceBond(from, to), true, `${from} -> ${to}`);
  }
});

test("starter evidence templates are editable structured schemas", () => {
  assert.equal(PERFORMANCE_BOND_EVIDENCE_TEMPLATES.length, 4);
  const parsed = evidenceSchemaFromJson({
    ...PERFORMANCE_BOND_EVIDENCE_TEMPLATES[0].schema,
    minimumDetail: "Edited charity name, amount, date, and redaction note.",
  });

  assert.equal(parsed.templateKey, "donation_proof");
  assert.match(parsed.minimumDetail, /Edited charity/);
});
