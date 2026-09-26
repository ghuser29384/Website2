import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import { CREATE_INTERFACE_VERSION } from "./types";
import { validateCreatePayload } from "./validation";

function futureDeadline() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function pledgePayload() {
  return {
    interfaceVersion: CREATE_INTERFACE_VERSION,
    submissionKey: "create-unit-pledge",
    cause: "Future flourishing",
    requestKind: "commitment",
    fundMode: null,
    dacPath: null,
    requestAction: "Study for five focused hours",
    existingPoolAmount: "",
    existingPoolCurrency: "USD",
    offers: [
      {
        id: "skill",
        title: "Skilled work",
        options: [
          { work: "Research wild animal suffering", scope: "one two-page brief", availability: "this month" },
          { work: "Research existential risk", scope: "one two-page brief", availability: "this month" },
        ],
      },
    ],
    pool: null,
    groupContributionTerms: null,
  };
}


function pledgePayloadWithCoAct() {
  const payload = pledgePayload();
  const draft = defaultGroupContributionDraft(
    "skill:1",
    "nonfinancial",
    "Research wild animal suffering",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.participants = [];
  draft.counterpartyParticipation = "explicitly-excluded";
  draft.duration = "one month";
  draft.frequency = "one brief";
  const terms = buildGroupContributionTerms(draft);
  assert(terms);
  return {
    ...payload,
    groupContributionTerms: {
      schemaVersion: 1,
      execution: "proposal-only",
      options: [{ optionKey: "skill:1", terms }],
    },
  };
}

test("validates a pledge-swap with multiple concrete alternatives", () => {
  const result = validateCreatePayload(pledgePayload());
  assert.equal(result.kind, "pledge_swap");
  assert.equal(result.offeredTerms[0]?.options.length, 2);
  assert.match(result.offeredSummary, /Research wild animal suffering/);
  assert.match(result.payloadHash, /^[0-9a-f]{64}$/);
});

test("validates exact direct-pool visibility and a reviewed custom formula", () => {
  const input = {
    ...pledgePayload(),
    submissionKey: "create-unit-pool",
    requestKind: "fund",
    fundMode: "dac",
    dacPath: "create",
    requestAction: "Independent research on improving AI philosophy",
    offers: [],
    pool: {
      thresholds: [{ amount: "1000" }, { amount: "5000" }],
      deadline: futureDeadline(),
      failureBonusType: "percentage",
      failureBonusAmount: "",
      failureBonusPercent: "10",
      failureBonusFunction: "",
      failureTimingMode: "formula",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [
        { end: "50", multiplier: "100" },
        { end: "100", multiplier: "0" },
      ],
      timingFormula: "0.7 * (1 - t) + 0.3 * (1 - p)",
      timingFormulaAcknowledged: true,
      continuation: "continue",
      thresholdVisibility: "public_exact",
      progressVisibility: "range",
      moralTradeBonusShare: "25",
      activationRule: "Independent verifier confirms implementation readiness",
    },
  };
  const result = validateCreatePayload(input);
  assert.equal(result.kind, "pool_create");
  assert.deepEqual(result.poolTerms?.thresholdAmountsCents, [100000, 500000]);
  assert.equal(result.poolTerms?.progressVisibility, "progress_range");
  assert.equal(result.poolTerms?.failureBonusTerms.rateBps, 1000);
  assert.equal(result.poolTerms?.moralTradeBonusShareBps, 2500);
  assert.match(result.poolTerms?.formula?.hash ?? "", /^[0-9a-f]{64}$/);
});

test("rejects decreasing thresholds and unacknowledged formulas", () => {
  const base = {
    ...pledgePayload(),
    submissionKey: "create-unit-invalid",
    requestKind: "fund",
    fundMode: "dac",
    dacPath: "create",
    requestAction: "Test pool",
    offers: [],
    pool: {
      thresholds: [{ amount: "1000" }, { amount: "900" }],
      deadline: futureDeadline(),
      failureBonusType: "percentage",
      failureBonusAmount: "",
      failureBonusPercent: "5",
      failureBonusFunction: "",
      failureTimingMode: "formula",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "0",
      activationRule: "",
    },
  };
  assert.throws(() => validateCreatePayload(base), /threshold 2 must be greater/i);

  base.pool.thresholds[1].amount = "2000";
  assert.throws(() => validateCreatePayload(base), /confirm the custom-formula disclosure/i);
});

test("rejects a timing cutoff after the pool deadline", () => {
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const input = {
    ...pledgePayload(),
    submissionKey: "create-unit-cutoff-after-deadline",
    requestKind: "fund",
    fundMode: "dac",
    dacPath: "create",
    requestAction: "Test pool",
    offers: [],
    pool: {
      thresholds: [{ amount: "1000" }],
      deadline: deadline.toISOString(),
      failureBonusType: "percentage",
      failureBonusAmount: "",
      failureBonusPercent: "5",
      failureBonusFunction: "",
      failureTimingMode: "cutoff",
      timingCutoffMethod: "date",
      timingCutoffPercent: "50",
      timingCutoffDate: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(),
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "0",
      activationRule: "",
    },
  };

  assert.throws(() => validateCreatePayload(input), /cutoff cannot be later than the pool deadline/i);
});

test("rejects Moral Trade failure-bonus funding when no bonus exists", () => {
  const input = {
    ...pledgePayload(),
    submissionKey: "create-unit-no-bonus-share",
    requestKind: "fund",
    fundMode: "dac",
    dacPath: "create",
    requestAction: "Test pool",
    offers: [],
    pool: {
      thresholds: [{ amount: "1000" }],
      deadline: futureDeadline(),
      failureBonusType: "none",
      failureBonusAmount: "",
      failureBonusPercent: "",
      failureBonusFunction: "",
      failureTimingMode: "all",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "1",
      activationRule: "",
    },
  };

  assert.throws(() => validateCreatePayload(input), /without a failure bonus cannot request/i);
});

test("rejects malformed funding-structure combinations", () => {
  assert.throws(
    () =>
      validateCreatePayload({
        ...pledgePayload(),
        submissionKey: "create-unit-nonfund-structure",
        fundMode: "redirect",
      }),
    /only Fund requests may select/i,
  );

  assert.throws(
    () =>
      validateCreatePayload({
        ...pledgePayload(),
        submissionKey: "create-unit-missing-structure",
        requestKind: "fund",
        fundMode: null,
      }),
    /Fund requests require a funding structure/i,
  );

  assert.throws(
    () =>
      validateCreatePayload({
        ...pledgePayload(),
        submissionKey: "create-unit-nondac-path",
        requestKind: "fund",
        fundMode: "redirect",
        dacPath: "existing",
      }),
    /only dominant assurance contract requests may select a pool path/i,
  );
});

test("rejects reciprocal contribution options on a directly created pool", () => {
  const input = {
    ...pledgePayload(),
    submissionKey: "create-unit-pool-with-offer",
    requestKind: "fund",
    fundMode: "dac",
    dacPath: "create",
    requestAction: "Test pool",
    pool: {
      thresholds: [{ amount: "1000" }],
      deadline: futureDeadline(),
      failureBonusType: "none",
      failureBonusAmount: "",
      failureBonusPercent: "",
      failureBonusFunction: "",
      failureTimingMode: "all",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "0",
      activationRule: "",
    },
  };

  assert.throws(() => validateCreatePayload(input), /cannot include reciprocal contribution options/i);
});


test("canonically validates Co-Act terms against authoritative offer options", () => {
  const result = validateCreatePayload(pledgePayloadWithCoAct());
  assert.equal(result.groupContributionTerms.options.length, 1);
  assert.equal(result.groupContributionTerms.options[0]?.optionKey, "skill:1");
  assert.equal(result.groupContributionTerms.options[0]?.terms.mode, "co-act");
  assert.equal(result.groupContributionReviewRecord?.groupContributionTerms.visibility, "private-review");
  assert.equal(result.groupContributionReviewRecord?.groupContributionTerms.execution, "proposal-only");
  assert.deepEqual(
    JSON.parse(result.groupContributionReviewRecord?.groupContributionTerms.canonicalJson ?? "null"),
    result.groupContributionTerms,
  );
});

test("rejects forged, unknown, and executable group-contribution terms", () => {
  const unknownOption = pledgePayloadWithCoAct();
  unknownOption.groupContributionTerms.options[0].optionKey = "skill:99";
  assert.throws(
    () => validateCreatePayload(unknownOption),
    /unknown-option|not part of this proposal/i,
  );

  const forged = pledgePayloadWithCoAct();
  Object.assign(forged.groupContributionTerms.options[0].terms, { activate: true });
  assert.throws(
    () => validateCreatePayload(forged),
    /unsupported payload field|unknown-field|activate/i,
  );
});
