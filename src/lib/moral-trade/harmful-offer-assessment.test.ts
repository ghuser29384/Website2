import assert from "node:assert/strict";
import test from "node:test";

import {
  assessHarmfulOffer,
  hashHarmfulOfferSource,
} from "./harmful-offer-assessment";

test("deterministic policy blocks explicit value-destroying threats", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Pay us $5,000 or else we will harm the animals you protect." },
    { trigger: "publication" },
  );

  assert.equal(assessment.route, "block");
  assert.ok(assessment.findings.some((finding) => finding.hardPolicyBlock));
});

test("deterministic policy blocks operational assistance for dangerous illegal conduct", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Provide a phishing kit for credential theft." },
    { trigger: "publication" },
  );

  assert.equal(assessment.route, "block");
  assert.equal(
    assessment.findings[0]?.dimension,
    "dangerous_illegal_or_abuse_enabling_conduct",
  );
});

test("deterministic policy blocks sexual or romantic relationship exchanges", async () => {
  const assessment = await assessHarmfulOffer(
    {
      requestAction: "Go on a romantic date with me",
      offers: [{ title: "Money", options: [{ amount: "200.00" }] }],
    },
    { trigger: "publication" },
  );

  assert.equal(assessment.route, "block");
  assert.ok(
    assessment.findings.some(
      (finding) => finding.dimension === "sexual_or_romantic_relationship_exchange",
    ),
  );
});

test("deterministic policy blocks religious conversion exchanges", async () => {
  const assessment = await assessHarmfulOffer(
    {
      requestAction: "Convert to Christianity",
      offers: [{ title: "Donation", options: [{ amount: "100.00" }] }],
    },
    { trigger: "publication" },
  );

  assert.equal(assessment.route, "block");
  assert.ok(
    assessment.findings.some(
      (finding) => finding.dimension === "religious_conversion_exchange",
    ),
  );
});

test("deception routes to human review without an automatic block", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Create a fake receipt and conceal it from donors." },
    { trigger: "live_draft" },
  );

  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.ruleAssessment.hardPolicyBlockCount, 0);
});

test("public-goods and counterfactual risks are surfaced without treating every pool as harmful", async () => {
  const assessment = await assessHarmfulOffer(
    {
      cause: "Everyone benefits while others pay without contributing",
      baseline: "The baseline is unknown and not collected",
    },
    { trigger: "live_draft" },
  );

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

  const ordinaryPool = await assessHarmfulOffer(
    { requestAction: "Create a public-good pool for independent research" },
    { trigger: "live_draft" },
  );
  assert.equal(ordinaryPool.route, "allow");
});

test("an ordinary voluntary and reversible proposal is permitted without model review", async () => {
  const assessment = await assessHarmfulOffer(
    {
      requestAction: "Volunteer for two hours at the community garden after both participants confirm.",
      offers: [{ title: "Donation", options: [{ amount: 50 }] }],
    },
    { trigger: "live_draft" },
  );

  assert.equal(assessment.route, "allow");
  assert.equal(assessment.findings.length, 0);
});

test("model-only findings can require review but never create an automatic block", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Discuss a novel proposal." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => ({
        findings: [
          {
            dimension: "uncertainty_evidence_quality_assumption_sensitivity",
            severity: "critical",
            confidence: 0.9,
            title: "Novel risk",
            explanation: "The case needs human interpretation.",
            evidence: ["Novel structure"],
            recommendedControls: ["Escalate to a human reviewer."],
          },
        ],
        unresolvedQuestions: ["Who bears the downside?"],
      }),
    },
  );

  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.findings[0]?.source, "model");
  assert.equal(assessment.findings[0]?.hardPolicyBlock, false);
});

test("a completed model can automatically permit a permissible proposal", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Volunteer at a food bank for one hour." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => ({ findings: [], unresolvedQuestions: [] }),
    },
  );

  assert.equal(assessment.route, "allow");
  assert.equal(assessment.modelAssessment.status, "completed");
});

test("unresolved model questions route to human review", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Evaluate a novel institutional arrangement." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => ({
        findings: [],
        unresolvedQuestions: ["Who has authority to bind affected non-signatories?"],
      }),
    },
  );

  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.unresolvedQuestions.length, 1);
});

test("a requested model failure fails closed to human review", async () => {
  const assessment = await assessHarmfulOffer(
    { requestAction: "Evaluate a novel institutional arrangement." },
    {
      trigger: "publication",
      includeModel: true,
      modelEvaluator: async () => {
        throw new Error("temporary model failure");
      },
    },
  );

  assert.equal(assessment.route, "human_review");
  assert.equal(assessment.modelAssessment.status, "unavailable");
});

test("stable source hashes do not depend on object key order", () => {
  assert.equal(
    hashHarmfulOfferSource({ b: 2, a: { d: 4, c: 3 } }),
    hashHarmfulOfferSource({ a: { c: 3, d: 4 }, b: 2 }),
  );
});
