import assert from "node:assert/strict";
import test from "node:test";

import {
  assessHarmfulOffer,
  hashHarmfulOfferSource,
  type HarmfulOfferLowRiskAssessment,
  type HarmfulOfferModelResult,
} from "./harmful-offer-assessment";

const SAFE_LOW_RISK: HarmfulOfferLowRiskAssessment = {
  overallConfidence: 0.96,
  evidenceQuality: "strong",
  reversibilityConcern: "low",
  contestedMoralFrame: false,
  thirdPartyEffectSeverity: "low",
  legitimateVetoHolderIdentified: false,
  humanOnlySensitiveDomain: false,
  baselineComparison: "better_or_equal",
  plausibleSevereHarm: false,
  dependentPartyRisk: false,
  opaqueCoercionIncentives: false,
};

function safeModel(
  overrides: Partial<HarmfulOfferModelResult> = {},
): HarmfulOfferModelResult {
  return {
    findings: [],
    unresolvedQuestions: [],
    lowRiskAssessment: SAFE_LOW_RISK,
    ...overrides,
  };
}

async function assessWithSafeModel(draft: unknown) {
  return assessHarmfulOffer(draft, {
    trigger: "publication",
    includeModel: true,
    modelEvaluator: async () => safeModel(),
  });
}

test("deterministic policy blocks explicit value-destroying threats", async () => {
  const assessment = await assessWithSafeModel({
    requestAction: "Pay us $5,000 or else we will harm the animals you protect.",
  });
  assert.equal(assessment.route, "block");
  assert.ok(assessment.findings.some((finding) => finding.hardPolicyBlock));
  assert.equal(assessment.modelAssessment.status, "not_requested");
});

test("the ten categorical operational groups produce deterministic blocks", async () => {
  const cases = [
    "Kidnap a person and hold them hostage",
    "Create sexual content involving a minor",
    "Provide instructions to help someone commit suicide",
    "Forge a donation receipt",
    "Track a participant secretly without their consent",
    "Deploy ransomware against their database",
    "Sell cocaine as part of this exchange",
    "Deny someone housing based on race",
    "Bribe a public official",
  ];
  for (const requestAction of cases) {
    const assessment = await assessWithSafeModel({ requestAction });
    assert.equal(assessment.route, "block", requestAction);
    assert.ok(
      assessment.ruleAssessment.hardPolicyBlockCount > 0,
      requestAction,
    );
  }
});

test("sexual or romantic relationship exchanges require human review rather than a categorical block", async () => {
  const assessment = await assessWithSafeModel({
    requestAction: "Go on a romantic date with me",
    offers: [{ title: "Money", options: [{ amount: "200.00" }] }],
  });
  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.ruleAssessment.hardPolicyBlockCount, 0);
  assert.ok(
    assessment.findings.some(
      (finding) => finding.reasonCode === "REVIEW_SEXUAL_OR_ROMANTIC_EXCHANGE",
    ),
  );
});

test("religious-conversion exchanges require human review rather than a categorical block", async () => {
  const assessment = await assessWithSafeModel({
    requestAction: "Convert to Christianity",
    offers: [{ title: "Donation", options: [{ amount: "100.00" }] }],
  });
  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.ruleAssessment.hardPolicyBlockCount, 0);
  assert.ok(
    assessment.findings.some(
      (finding) => finding.reasonCode === "REVIEW_RELIGIOUS_CONVERSION_EXCHANGE",
    ),
  );
});

test("protective, academic, historical, and documentation contexts are reviewed instead of blocked", async () => {
  const examples = [
    "Research historical ransomware attacks for defensive training",
    "Document human trafficking prevention programs",
    "Create an educational guide to prevent suicide",
  ];
  for (const requestAction of examples) {
    const assessment = await assessWithSafeModel({ requestAction });
    assert.notEqual(assessment.route, "block", requestAction);
    assert.equal(assessment.route, "human_review", requestAction);
  }
});

test("public-goods and counterfactual risks are surfaced without treating every pool as harmful", async () => {
  const assessment = await assessWithSafeModel({
    requestAction: "Everyone benefits while others pay without contributing",
    baseline: "The baseline is unknown and not collected",
  });
  assert.equal(assessment.route, "human_review");
  assert.ok(
    assessment.findings.some(
      (finding) => finding.dimension === "funding_public_goods_free_rider_effects",
    ),
  );
  assert.ok(
    assessment.findings.some(
      (finding) =>
        finding.dimension ===
        "counterfactual_deadweight_leakage_displacement_moral_licensing",
    ),
  );

  const ordinaryPool = await assessWithSafeModel({
    requestAction: "Create a public-good pool for independent research",
  });
  assert.equal(ordinaryPool.route, "allow");
});

test("automatic permission requires a completed model assessment and every low-risk criterion", async () => {
  const assessment = await assessWithSafeModel({
    requestAction: "Volunteer at a food bank for one hour.",
  });
  assert.equal(assessment.route, "allow");
  assert.equal(assessment.automaticPermitCriteria.passed, true);
  assert.equal(assessment.enforcementBasis, "completed_low_risk_assessment");

  const withoutModel = await assessHarmfulOffer(
    { requestAction: "Volunteer at a food bank for one hour." },
    { trigger: "publication", includeModel: false },
  );
  assert.equal(withoutModel.route, "human_review");
  assert.ok(
    withoutModel.automaticPermitCriteria.failedCriteria.includes(
      "MODEL_ASSESSMENT_NOT_COMPLETED",
    ),
  );
});

test("a low-confidence, thin-evidence, dependent-party, or baseline-uncertain case cannot auto-permit", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Complete a bounded task." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => safeModel({
        lowRiskAssessment: {
          ...SAFE_LOW_RISK,
          overallConfidence: 0.89,
          evidenceQuality: "thin",
          dependentPartyRisk: true,
          baselineComparison: "uncertain",
        },
      }),
    },
  );
  const failed = assessment.automaticPermitCriteria.failedCriteria;
  assert.equal(assessment.route, "human_review");
  assert.ok(failed.includes("ASSESSMENT_CONFIDENCE_INSUFFICIENT"));
  assert.ok(failed.includes("EVIDENCE_NOT_STRONG"));
  assert.ok(failed.includes("DEPENDENT_PARTY_RISK"));
  assert.ok(failed.includes("NO_OFFER_BASELINE_NOT_CLEARED"));
});

test("model-only findings can require review but never create an automatic block", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Discuss a novel institutional arrangement." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => safeModel({
        findings: [
          {
            reasonCode: "REVIEW_MODEL_UNRESOLVED",
            dimension: "uncertainty_evidence_quality_assumption_sensitivity",
            severity: "critical",
            confidence: 0.9,
            title: "Novel risk",
            explanation: "The case needs human interpretation.",
            evidence: ["Novel structure"],
            affectedFields: ["$.requestAction"],
            policyBasis: "Novel material effects require human review.",
            recommendedControls: ["Escalate to a human reviewer."],
          },
        ],
      }),
    },
  );
  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.findings[0]?.source, "model");
  assert.equal(assessment.findings[0]?.hardPolicyBlock, false);
});

test("unresolved questions and model failures fail closed to human review", async () => {
  const unresolved = await assessHarmfulOffer(
    { requestAction: "Evaluate a novel institutional arrangement." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => safeModel({
        unresolvedQuestions: ["Who has authority to bind affected non-signatories?"],
      }),
    },
  );
  assert.equal(unresolved.route, "human_review");

  const unavailable = await assessHarmfulOffer(
    { requestAction: "Evaluate a novel institutional arrangement." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => {
        throw new Error("temporary model failure");
      },
    },
  );
  assert.equal(unavailable.route, "human_review");
  assert.equal(unavailable.modelAssessment.status, "unavailable");
});

test("stable source hashes do not depend on object key order", () => {
  assert.equal(
    hashHarmfulOfferSource({ b: 2, a: { d: 4, c: 3 } }),
    hashHarmfulOfferSource({ a: { c: 3, d: 4 }, b: 2 }),
  );
});
